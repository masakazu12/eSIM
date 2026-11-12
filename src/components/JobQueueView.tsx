import React from 'react';
import {
  Clock,
  RotateCw,
  AlertOctagon,
  CheckCircle2,
  Zap,
  Activity,
  Layers,
  HelpCircle
} from 'lucide-react';
import { IssuanceJob } from '../types/index.ts';

interface JobQueueViewProps {
  jobs: IssuanceJob[];
  onRetryJob: (jobId: string) => Promise<void>;
}

export const JobQueueView: React.FC<JobQueueViewProps> = ({ jobs, onRetryJob }) => {
  const queuedCount = jobs.filter(j => j.status === 'QUEUED').length;
  const processingCount = jobs.filter(j => j.status === 'PROCESSING').length;
  const retryingCount = jobs.filter(j => j.status === 'RETRYING').length;
  const successCount = jobs.filter(j => j.status === 'SUCCESS').length;
  const deadLetterCount = jobs.filter(j => j.status === 'DEAD_LETTER' || j.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* キューサマリー */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              非同期ジョブキュー・ワーカー監視
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shopify Webhook受信後のeSIM発行およびLINE配信タスクの非同期実行・指数バックオフ再試行管理
            </p>
          </div>
        </div>

        {/* キュー状態ステータスグリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500">待機中 (Queued)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {queuedCount}
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/60">
            <span className="text-[11px] text-blue-700 dark:text-blue-300">実行中 (Processing)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-700 dark:text-blue-300 mt-0.5">
              {processingCount}
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60">
            <span className="text-[11px] text-amber-700 dark:text-amber-300">再試行中 (Backoff)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300 mt-0.5">
              {retryingCount}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">成功完了 (Success)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5">
              {successCount}
            </div>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800/60 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-rose-700 dark:text-rose-300">要介入 (Dead Letter)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-300 mt-0.5">
              {deadLetterCount}
            </div>
          </div>
        </div>
      </div>

      {/* ジョブ一覧 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-medium">
                <th className="py-3 px-4">ジョブID / 種類</th>
                <th className="py-3 px-4">対象注文</th>
                <th className="py-3 px-4">冪等性キー (Idempotency)</th>
                <th className="py-3 px-4">試行回数</th>
                <th className="py-3 px-4">次回試行 / 完了時刻</th>
                <th className="py-3 px-4">ステータス / エラーログ</th>
                <th className="py-3 px-4 text-right">手動再実行</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {job.id}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {job.jobType === 'ESIM_ISSUE' ? '卸元eSIM発行' : job.jobType === 'LINE_NOTIFY' ? 'LINE通知' : '返金取消'}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                      {job.orderId}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {job.idempotencyKey.substring(0, 14)}...
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono tabular-nums">
                    <span className="font-medium text-slate-900 dark:text-white">{job.attempts}</span>
                    <span className="text-slate-400"> / {job.maxAttempts}</span>
                  </td>

                  <td className="py-3 px-4 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    {job.status === 'RETRYING' ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {new Date(job.nextAttemptAt).toLocaleTimeString('ja-JP')} 予定
                      </span>
                    ) : (
                      new Date(job.updatedAt).toLocaleTimeString('ja-JP')
                    )}
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <div>
                      {job.status === 'SUCCESS' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>正常完了</span>
                        </span>
                      )}
                      {job.status === 'RETRYING' && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>指数バックオフ中</span>
                        </span>
                      )}
                      {job.status === 'PROCESSING' && (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>処理実行中</span>
                        </span>
                      )}
                      {job.status === 'DEAD_LETTER' && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>デッドレター (要手動対応)</span>
                        </span>
                      )}
                    </div>
                    {job.errorLog && (
                      <div className="text-[10px] text-rose-500 font-mono mt-1 line-clamp-2">
                        {job.errorLog}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onRetryJob(job.id)}
                      className="px-2.5 py-1 text-[11px] font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 ml-auto"
                      title="ジョブをキューへ再投入"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>再実行</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
