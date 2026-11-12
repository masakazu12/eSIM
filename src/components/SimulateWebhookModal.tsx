import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Send,
  X
} from 'lucide-react';
import { WholesalerPlan } from '../types/index.ts';

interface SimulateWebhookModalProps {
  plans: WholesalerPlan[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    planId: string;
    customerName: string;
    customerEmail: string;
    simulateDuplicate?: boolean;
    simulateTimeout?: boolean;
  }) => Promise<void>;
}

export const SimulateWebhookModal: React.FC<SimulateWebhookModalProps> = ({
  plans,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || 'plan_kr_10gb_7d');
  const [customerName, setCustomerName] = useState('白川 雅史');
  const [customerEmail, setCustomerEmail] = useState('m.shirakawa1204@gmail.com');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        planId: selectedPlanId,
        customerName,
        customerEmail,
        simulateDuplicate: isDuplicate,
        simulateTimeout: isTimeout,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Shopify決済 Webhook発火シミュレータ
              </h3>
              <p className="text-[11px] text-slate-500">注文完了イベントを擬似送信してパイプラインを検証</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* 商品プラン選択 */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              購入商品・eSIMプラン
            </label>
            <select
              value={selectedPlanId}
              onChange={e => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.countryName} - {p.dataAllowance} ({p.validityDays}日間) [¥{p.retailPriceJpy.toLocaleString()}]
                </option>
              ))}
            </select>
          </div>

          {/* 購入者名 & メール */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                購入者 氏名
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                メールアドレス
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* シミュレーション条件 (障害・安全対策テスト) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              例外・安全対策のテストシナリオ
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isDuplicate}
                onChange={e => setIsDuplicate(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>重複Webhook送信（同一Webhook IDで二重発行防止をテスト）</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isTimeout}
                onChange={e => setIsTimeout(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>卸元APIタイムアウト（指数バックオフ再試行キューへの退避をテスト）</span>
            </label>
          </div>

          {/* 実行ボタン */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Webhookを送信</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
