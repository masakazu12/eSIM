import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  MessageCircle,
  RotateCw,
  Ban,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  QrCode,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { ShopifyOrder } from '../types/index.ts';

interface OrderListProps {
  orders: ShopifyOrder[];
  onSelectOrder: (order: ShopifyOrder) => void;
  onPreviewLine: (order: ShopifyOrder) => void;
  onRetryOrder: (orderId: string) => Promise<void>;
  onResendLine: (orderId: string) => Promise<void>;
  onRefundOrder: (orderId: string) => Promise<void>;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onSelectOrder,
  onPreviewLine,
  onRetryOrder,
  onResendLine,
  onRefundOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'CLAIMED' | 'PROCESSING' | 'REFUNDED' | 'FAILED'>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.esimProfiles[0]?.iccid || '').includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ISSUED') return order.esimStatus === 'ISSUED';
    if (statusFilter === 'CLAIMED') return order.esimStatus === 'CLAIMED';
    if (statusFilter === 'PROCESSING') return order.esimStatus === 'PROCESSING';
    if (statusFilter === 'REFUNDED') return order.esimStatus === 'REFUNDED';
    if (statusFilter === 'FAILED') return order.esimStatus === 'FAILED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 画面ヘッダー & 検索・フィルタ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">注文・eSIM発行台帳</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shopify注文、明細単位の二重発行防止キー、ICCID、LINE連携状態の一括管理
            </p>
          </div>

          {/* 検索入力 */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="注文番号、名前、メール、ICCIDで検索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 状態フィルタボタン (インタラクティブなセグメントコントロール) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-xs font-medium mr-2">絞り込み:</span>
          {[
            { id: 'ALL', label: 'すべて' },
            { id: 'CLAIMED', label: '受取完了' },
            { id: 'ISSUED', label: '発行完了(未受取)' },
            { id: 'PROCESSING', label: '再試行待機中' },
            { id: 'FAILED', label: '発行失敗' },
            { id: 'REFUNDED', label: '返金・失効' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 注文リスト テーブル */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-4">Shopify 注文</th>
                <th className="py-3 px-4">購入者情報</th>
                <th className="py-3 px-4">商品・プラン明細</th>
                <th className="py-3 px-4">ICCID / 卸元照会</th>
                <th className="py-3 px-4">LINE連携</th>
                <th className="py-3 px-4">発行ステータス</th>
                <th className="py-3 px-4 text-right">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    一致する注文データが見つかりませんでした
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const lineItem = order.lineItems[0];
                  const profile = order.esimProfiles[0];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 注文番号 & 決済時刻 */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {order.orderNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(order.paidAt).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          ¥{order.totalPrice.toLocaleString()}
                        </div>
                      </td>

                      {/* 購入者 */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {order.customerEmail}
                        </div>
                      </td>

                      {/* 商品明細 */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                          {lineItem?.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {lineItem?.country} · {lineItem?.variantTitle}
                        </div>
                      </td>

                      {/* ICCID */}
                      <td className="py-3 px-4">
                        {profile ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                {profile.iccid}
                              </span>
                              <button
                                onClick={() => handleCopy(profile.iccid, `iccid_${order.id}`)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                                title="ICCIDをコピー"
                              >
                                {copiedKey === `iccid_${order.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                              {profile.wholesalerReference}
                            </div>
                          </div>
                        ) : order.lastError ? (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 line-clamp-2 max-w-[180px]">
                            {order.lastError}
                          </div>
                        ) : (
                          <span className="text-slate-400">未発行</span>
                        )}
                      </td>

                      {/* LINE連携 */}
                      <td className="py-3 px-4">
                        {order.lineStatus === 'LINKED' ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{order.lineDisplayName || '連携済'}</span>
                          </div>
                        ) : order.lineStatus === 'BLOCKED' ? (
                          <div className="flex items-center gap-1 text-rose-500 font-medium">
                            <Ban className="w-3.5 h-3.5" />
                            <span>ブロック中</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">未連携 (メール代替)</span>
                        )}
                      </td>

                      {/* 発行ステータス */}
                      <td className="py-3 px-4">
                        <div className="font-semibold">
                          {order.esimStatus === 'CLAIMED' && (
                            <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>受取済 (稼働中)</span>
                            </span>
                          )}
                          {order.esimStatus === 'ISSUED' && (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>発行済 (受取待機)</span>
                            </span>
                          )}
                          {order.esimStatus === 'PROCESSING' && (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>再試行待機中 (#{order.retryCount})</span>
                            </span>
                          )}
                          {order.esimStatus === 'REFUNDED' && (
                            <span className="text-slate-400 line-through">
                              返金・無効化
                            </span>
                          )}
                          {order.esimStatus === 'FAILED' && (
                            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>発行エラー</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 受取ポータル表示 */}
                          <button
                            onClick={() => onSelectOrder(order)}
                            className="px-2.5 py-1 text-[11px] font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                            title="購入者向け受取ページを表示"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>受取画面</span>
                          </button>

                          {/* LINE Flex Preview */}
                          <button
                            onClick={() => onPreviewLine(order)}
                            className="p-1 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                            title="LINEトーク通知プレビュー"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#06C755]" />
                          </button>

                          {/* 手動再発行 */}
                          {(order.esimStatus === 'FAILED' || order.esimStatus === 'PROCESSING') && (
                            <button
                              onClick={async () => {
                                setIsProcessingId(order.id);
                                await onRetryOrder(order.id);
                                setIsProcessingId(null);
                              }}
                              disabled={isProcessingId === order.id}
                              className="p-1 border border-indigo-200 dark:border-indigo-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                              title="手動で発行ジョブを再実行"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${isProcessingId === order.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          {/* 返金 */}
                          {order.esimStatus !== 'REFUNDED' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`注文 ${order.orderNumber} を返金し、eSIMを無効化しますか？`)) {
                                  onRefundOrder(order.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="返金・eSIM失効処理"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
