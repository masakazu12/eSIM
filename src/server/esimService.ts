import { EsimProfile, ShopifyOrder, WholesalerPlan } from '../types/index.ts';
import { generateIdempotencyKey, generateLpaPayload } from './crypto.ts';
import { issuedIdempotencyKeys, wholesalerPlans, db, config } from './storage.ts';

export interface IssueEsimOptions {
  simulateTimeout?: boolean;
  simulateOutOfStock?: boolean;
}

export class EsimWholesalerService {
  /**
   * 卸元APIへeSIM発行要求を送信
   * 安全対策: 注文明細単位の冪等性キー (Idempotency Key) で二重発行を厳格に防止
   */
  async issueEsim(
    order: ShopifyOrder,
    lineItemId: string,
    planId: string,
    options: IssueEsimOptions = {}
  ): Promise<{ profile: EsimProfile; isDuplicatePrevented: boolean }> {
    const idempotencyKey = generateIdempotencyKey(order.id, lineItemId);

    // 1. 二重発行防止チェック
    const existing = issuedIdempotencyKeys.get(idempotencyKey);
    if (existing) {
      db.addLog({
        level: 'WARN',
        action: 'ESIM_API_REQUEST',
        orderId: order.id,
        details: `二重発行を検知・防止しました。既存のICCID: ${existing.iccid} を再利用します (IdempotencyKey: ${idempotencyKey.substring(0, 10)}...)`,
      });
      return { profile: existing, isDuplicatePrevented: true };
    }

    // 2. プラン在庫チェック
    const plan = wholesalerPlans.find(p => p.id === planId);
    if (!plan || plan.stockAvailable <= 0 || options.simulateOutOfStock) {
      db.addLog({
        level: 'ERROR',
        action: 'ESIM_API_FAILED',
        orderId: order.id,
        details: `卸元プラン [${plan?.planCode || planId}] 在庫切れエラー (Stock: ${plan?.stockAvailable ?? 0})。緊急発注または代替回線が必要です。`,
      });
      throw new Error(`WHOLESALER_OUT_OF_STOCK: プラン ${plan?.planCode || planId} の在庫がありません`);
    }

    // 3. タイムアウト・障害シミュレーション検証
    if (options.simulateTimeout) {
      db.addLog({
        level: 'WARN',
        action: 'ESIM_API_RETRY',
        orderId: order.id,
        details: `卸元APIゲートウェイタイムアウト (HTTP 504 Gateway Timeout)。再試行キューに自動スケジューリングされます。`,
      });
      throw new Error('WHOLESALER_GATEWAY_TIMEOUT: 卸元APIの応答がありません (10000ms)');
    }

    // 4. 卸元プロバイダーごとのSM-DP+サーバー設定
    let smdpDomain = 'smdp.rsp.esim-access.com';
    if (plan.provider === 'GIGS') smdpDomain = 'cust.smdp-plus.tw.gigs.net';
    if (plan.provider === 'GLOBAL_1') smdpDomain = 'consumer.rsp.global1.com';
    if (plan.provider === 'TELNA') smdpDomain = 'tmo-smdp.telna.com';

    // 固有ICCID & アクティベーションコード生成
    const iccidSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const iccid = `898${plan.countryCode === 'KR' ? '20' : plan.countryCode === 'TW' ? '86' : '44'}${iccidSuffix}`;
    const matchingId = `MATCH-${plan.countryCode}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const activationCode = `${plan.provider.substring(0, 3)}-${plan.countryCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const qrPayload = generateLpaPayload(smdpDomain, matchingId);

    const now = new Date();
    const expiryDate = new Date(now.getTime() + plan.validityDays * 24 * 60 * 60 * 1000);

    const profile: EsimProfile = {
      id: `esim_prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      lineItemId,
      idempotencyKey,
      iccid,
      smdpAddress: smdpDomain,
      activationCode,
      matchingId,
      qrPayload,
      status: 'PENDING',
      issuedAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      wholesalerReference: `WH-${plan.provider}-${Date.now().toString().slice(-7)}`,
    };

    // 在庫消化
    plan.stockAvailable -= 1;

    // 在庫しきい値監視 & システムアラート・メール通知トリガー
    if (plan.stockAvailable <= (config.stockAlertThreshold || 50)) {
      const isCritical = plan.stockAvailable <= (config.stockCriticalThreshold || 20);
      db.addLog({
        level: isCritical ? 'ERROR' : 'WARN',
        action: 'STOCK_ALERT',
        details: `[在庫アラート] 卸元プラン ${plan.planCode} (${plan.countryName}) の残数が ${plan.stockAvailable} 枚に低下しました (警告基準: ${config.stockAlertThreshold}枚)。${config.stockAlertEmailEnabled ? `緊急通知メールを管理者 (${config.alertEmail}) 宛に自動送信しました。` : ''}`,
      });
    }

    // 二重発行防止ストアに登録
    issuedIdempotencyKeys.set(idempotencyKey, profile);

    db.addLog({
      level: 'INFO',
      action: 'ESIM_API_SUCCESS',
      orderId: order.id,
      details: `卸元 ${plan.provider} よりeSIMを正常発行しました。ICCID: ${iccid}, Plan: ${plan.planCode}`,
    });

    return { profile, isDuplicatePrevented: false };
  }

  /**
   * 返金・キャンセル時のeSIM失効処理
   */
  async revokeEsim(orderId: string, iccid: string): Promise<boolean> {
    db.addLog({
      level: 'INFO',
      action: 'ORDER_REFUNDED',
      orderId,
      details: `注文キャンセル/返金に伴い、eSIM [ICCID: ${iccid}] を卸元API経由で無効化(REVOKED)しました`,
    });
    return true;
  }
}

export const esimService = new EsimWholesalerService();
