import { IssuanceJob, ShopifyOrder } from '../types/index.ts';
import { db, planMappings } from './storage.ts';
import { esimService, IssueEsimOptions } from './esimService.ts';
import { lineService } from './lineService.ts';
import { generateIdempotencyKey } from './crypto.ts';

export class AsyncJobQueue {
  private isProcessing = false;

  /**
   * 注文決済完了に伴うeSIM発行ジョブの投入
   */
  enqueueOrderIssuance(order: ShopifyOrder): IssuanceJob[] {
    const jobs: IssuanceJob[] = [];

    for (const item of order.lineItems) {
      const idempotencyKey = generateIdempotencyKey(order.id, item.id);
      const job: IssuanceJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        jobType: 'ESIM_ISSUE',
        orderId: order.id,
        lineItemId: item.id,
        idempotencyKey,
        status: 'QUEUED',
        attempts: 0,
        maxAttempts: 3,
        nextAttemptAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payload: {
          variantId: item.shopifyVariantId,
          planId: item.planId,
          orderNumber: order.orderNumber,
        },
      };

      db.saveJob(job);
      jobs.push(job);

      db.addLog({
        level: 'INFO',
        action: 'JOB_ENQUEUED',
        orderId: order.id,
        details: `非同期発行ジョブ [${job.id}] をキューに登録しました (IdempotencyKey: ${idempotencyKey.substring(0, 10)}...)`,
      });
    }

    // バックグラウンド実行トリガー
    setTimeout(() => this.processNextJobs(), 50);
    return jobs;
  }

  /**
   * ジョブワーカー処理
   */
  async processNextJobs(options: IssueEsimOptions = {}): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const allJobs = db.getJobs();
      const pendingJobs = allJobs.filter(
        j => (j.status === 'QUEUED' || j.status === 'RETRYING') && new Date(j.nextAttemptAt).getTime() <= Date.now()
      );

      for (const job of pendingJobs) {
        await this.executeJob(job, options);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 単一ジョブの実行とリトライ・エラー制御
   */
  async executeJob(job: IssuanceJob, options: IssueEsimOptions = {}): Promise<void> {
    job.status = 'PROCESSING';
    job.attempts += 1;
    job.updatedAt = new Date().toISOString();
    db.saveJob(job);

    const order = db.getOrder(job.orderId);
    if (!order) {
      job.status = 'FAILED';
      job.errorLog = `対象の注文 ${job.orderId} が見つかりません`;
      db.saveJob(job);
      return;
    }

    try {
      if (job.jobType === 'ESIM_ISSUE') {
        const lineItem = order.lineItems.find(i => i.id === job.lineItemId) || order.lineItems[0];
        
        // プラン特定
        let targetPlanId = lineItem.planId;
        if (!targetPlanId) {
          const mapping = planMappings.find(m => m.shopifyVariantId === lineItem.shopifyVariantId);
          if (mapping) targetPlanId = mapping.wholesalerPlanId;
        }

        // 卸元API呼び出し
        const { profile } = await esimService.issueEsim(order, lineItem.id, targetPlanId, options);

        // 注文状態更新
        const existingIdx = order.esimProfiles.findIndex(p => p.id === profile.id);
        if (existingIdx >= 0) {
          order.esimProfiles[existingIdx] = profile;
        } else {
          order.esimProfiles.push(profile);
        }
        order.esimStatus = 'ISSUED';
        order.lastError = undefined;
        db.saveOrder(order);

        job.status = 'SUCCESS';
        job.updatedAt = new Date().toISOString();
        db.saveJob(job);

        // LINE通知ジョブの追加または即時実行
        await lineService.sendEsimReadyNotification(order);

      } else if (job.jobType === 'LINE_NOTIFY') {
        const res = await lineService.sendEsimReadyNotification(order);
        if (res.success) {
          job.status = 'SUCCESS';
        } else {
          job.status = 'FAILED';
          job.errorLog = res.error;
        }
        job.updatedAt = new Date().toISOString();
        db.saveJob(job);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      job.errorLog = errorMessage;
      job.updatedAt = new Date().toISOString();

      if (job.attempts < job.maxAttempts && !errorMessage.includes('OUT_OF_STOCK')) {
        // 指数バックオフ再試行 (1回目: 5秒, 2回目: 15秒, 3回目: 45秒)
        const delaySeconds = Math.pow(3, job.attempts) * 2;
        job.status = 'RETRYING';
        job.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        db.saveJob(job);

        order.esimStatus = 'PROCESSING';
        order.retryCount = job.attempts;
        order.lastError = `再試行待機中 (#${job.attempts}/${job.maxAttempts}): ${errorMessage}`;
        db.saveOrder(order);
      } else {
        // 上限超過または致命的エラー -> DEAD_LETTER / FAILED
        job.status = 'DEAD_LETTER';
        db.saveJob(job);

        order.esimStatus = 'FAILED';
        order.lastError = `発行失敗 (上限試行済み): ${errorMessage}`;
        db.saveOrder(order);

        db.addLog({
          level: 'ERROR',
          action: 'ESIM_API_FAILED',
          orderId: order.id,
          details: `発行ジョブ [${job.id}] が最大試行回数(${job.maxAttempts})に達しデッドレターキューに移動しました。管理者の介入が必要です。`,
        });
      }
    }
  }

  /**
   * 手動でのジョブ再試行
   */
  async retryJobManually(jobId: string): Promise<IssuanceJob> {
    const job = db.getJob(jobId);
    if (!job) throw new Error('指定されたジョブが存在しません');

    job.status = 'QUEUED';
    job.attempts = 0;
    job.nextAttemptAt = new Date().toISOString();
    job.errorLog = undefined;
    db.saveJob(job);

    db.addLog({
      level: 'INFO',
      action: 'MANUAL_REISSUE',
      orderId: job.orderId,
      details: `管理者によるジョブ [${job.id}] の手動再試行がキューイングされました`,
    });

    await this.processNextJobs();
    return job;
  }
}

export const jobQueue = new AsyncJobQueue();
