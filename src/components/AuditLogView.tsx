import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Info,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Calendar,
  Lock
} from 'lucide-react';
import { AuditLog } from '../types/index.ts';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (levelFilter === 'ALL') return true;
    return log.level === levelFilter;
  });

  return (
    <div className="space-y-6">
      {/* 監査ログヘッダー */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>運用記録 & 監査証跡</span>
              <span aria-hidden="true">·</span>
              <span>HMAC検証 / 重複排除 / 発行 / LINE配信</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              セキュリティ・システム監査ログ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              全APIリクエスト、署名検証成否、二重発行ブロック、LINE通知、障害リトライの完全証跡（秘密情報マスキング済み）
            </p>
          </div>

          {/* 検索入力 */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="アクション、注文ID、詳細で検索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* レベルフィルタ */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium mr-2">ログ重要度:</span>
          {[
            { id: 'ALL', label: 'すべて' },
            { id: 'INFO', label: '通常 (INFO)' },
            { id: 'WARN', label: '警告・再試行 (WARN)' },
            { id: 'ERROR', label: '障害エラー (ERROR)' },
            { id: 'SECURITY', label: 'セキュリティ (SECURITY)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLevelFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                levelFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ログ一覧テーブル */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-medium">
                <th className="py-3 px-4">発生時刻</th>
                <th className="py-3 px-4">レベル</th>
                <th className="py-3 px-4">アクション識別子</th>
                <th className="py-3 px-4">対象注文</th>
                <th className="py-3 px-4">詳細ログ内容</th>
                <th className="py-3 px-4 text-right">送信元IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    条件に合致する監査ログはありません
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 時刻 */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap tabular-nums text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      {/* レベル */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.level === 'INFO' && (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                            INFO
                          </span>
                        )}
                        {log.level === 'WARN' && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            WARN
                          </span>
                        )}
                        {log.level === 'ERROR' && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            ERROR
                          </span>
                        )}
                        {log.level === 'SECURITY' && (
                          <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                            SECURITY
                          </span>
                        )}
                      </td>

                      {/* アクション */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                        {log.action}
                      </td>

                      {/* 注文ID */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {log.orderId || '-'}
                      </td>

                      {/* 詳細 */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-sans text-xs max-w-xl">
                        {log.details}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                        {log.ipAddress || 'Internal'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
