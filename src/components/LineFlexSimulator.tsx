import React from 'react';
import {
  ExternalLink,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { ShopifyOrder } from '../types/index.ts';

interface LineFlexSimulatorProps {
  order: ShopifyOrder;
  onOpenClaim: (order: ShopifyOrder) => void;
  onLinkLineAccount?: (order: ShopifyOrder) => void;
  onClose?: () => void;
}

export const LineFlexSimulator: React.FC<LineFlexSimulatorProps> = ({
  order,
  onOpenClaim,
  onLinkLineAccount,
  onClose,
}) => {
  const lineItem = order.lineItems[0];
  const profile = order.esimProfiles[0];

  return (
    <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 max-w-sm w-full mx-auto border border-slate-300 dark:border-slate-800 shadow-2xl flex flex-col h-[640px]">
      {/* スマホ風ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white font-bold text-xs">
            LINE
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white">eSIM トラベル公式</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#06C755]" />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">公式アカウント</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* チャットタイムライン */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#70889B]/10 dark:bg-slate-950/60 rounded-b-xl">
        <div className="text-center">
          <span className="text-[10px] bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
            今日 {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {order.lineStatus === 'UNLINKED' ? (
          /* 未連携時の案内 */
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Shopify注文とLINEが未連携です</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              注文番号 <strong className="font-mono">{order.orderNumber}</strong> のeSIM発行が完了しています。下のボタンから安全にLINE認証してeSIMを受け取ってください。
            </p>
            {onLinkLineAccount && (
              <button
                onClick={() => onLinkLineAccount(order)}
                className="w-full py-2 bg-[#06C755] hover:bg-[#05a847] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>LINEでログインして受け取る</span>
              </button>
            )}
          </div>
        ) : (
          /* LINE Flex Message カード (仕様書準拠) */
          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            {/* Flex Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-3.5 text-white">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>発行完了通知</span>
                <span className="font-mono tabular-nums">{order.orderNumber}</span>
              </div>
              <div className="font-bold text-sm mt-0.5 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#06C755]" />
                <span>eSIMの準備が整いました</span>
              </div>
            </div>

            {/* Flex Body */}
            <div className="p-3.5 space-y-3 text-xs">
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">商品プラン</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {lineItem?.title || '海外eSIMプラン'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">通信容量:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {lineItem?.variantTitle || '高速通信'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">有効期間:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    到着後即利用可能
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-100 dark:border-amber-900/50">
                セキュリティのため、QRコードは認証済みの期限付き受取ページでのみ表示されます。
              </div>

              {/* Flex Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => onOpenClaim(order)}
                  className="w-full py-2.5 bg-[#06C755] hover:bg-[#05a847] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>期限付き受取ページを開く</span>
                </button>

                <button
                  onClick={() => onOpenClaim(order)}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>初期設定マニュアル (iOS / Android)</span>
                </button>
              </div>
            </div>

            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-center">
              受取有効期限: {new Date(order.claimTokenExpiresAt).toLocaleDateString('ja-JP')}
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl flex items-center justify-between text-[11px] text-slate-500">
        <span>LINE Messaging API 連動プレビュー</span>
        <span className="font-mono">Flex Message v2</span>
      </div>
    </div>
  );
};
