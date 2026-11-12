import React, { useState } from 'react';
import {
  Settings,
  X,
  Copy,
  Check,
  ShieldCheck,
  Save,
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';
import { SystemConfig } from '../types/index.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSaveConfig: (updated: Partial<SystemConfig>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState({
    shopifyStoreUrl: config.shopifyStoreUrl || '',
    shopifyWebhookSecret: config.shopifyWebhookSecret || '',
    lineChannelId: config.lineChannelId || '',
    lineChannelSecret: config.lineChannelSecret || '',
    lineMessagingToken: config.lineMessagingToken || '',
    wholesalerApiEndpoint: config.wholesalerApiEndpoint || '',
    wholesalerApiKey: config.wholesalerApiKey || '',
    autoIssueEnabled: config.autoIssueEnabled ?? true,
    autoSendLineEnabled: config.autoSendLineEnabled ?? true,
    defaultTestLineUserId: config.defaultTestLineUserId || '',
    alertEmail: config.alertEmail || '',
    stockAlertThreshold: config.stockAlertThreshold || 50,
    stockCriticalThreshold: config.stockCriticalThreshold || 20,
    stockAlertEmailEnabled: config.stockAlertEmailEnabled ?? true,
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';
  const shopifyWebhookUrl = `${currentHost}/api/webhook/shopify`;
  const lineWebhookUrl = `${currentHost}/api/webhook/line`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveConfig(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                API連携 & 自動配信パラメータ設定
              </h3>
              <p className="text-xs text-slate-500">Shopify Webhook、LINE Messaging API、eSIM卸元キーの設定</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Shopify Webhook 設定セクション */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Shopify Webhook 受信設定</span>
            </h4>

            {/* Webhook URL コピー用 */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Shopify 管理画面に登録する Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shopifyWebhookUrl}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(shopifyWebhookUrl, 'webhookUrl')}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded font-medium flex items-center gap-1 shrink-0"
                >
                  {copiedField === 'webhookUrl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'webhookUrl' ? 'コピー済' : 'コピー'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                ※ Shopify管理画面 ＞ 設定 ＞ 通知 ＞ Webhookを作成（イベント: 注文の支払い / orders/paid、形式: JSON）
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Shopify ストアURL</label>
                <input
                  type="text"
                  value={formData.shopifyStoreUrl}
                  onChange={e => setFormData({ ...formData, shopifyStoreUrl: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  placeholder="https://your-shop.myshopify.com"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Shopify Webhook 署名シークレット</label>
                <input
                  type="password"
                  value={formData.shopifyWebhookSecret}
                  onChange={e => setFormData({ ...formData, shopifyWebhookSecret: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  placeholder="shpss_..."
                />
              </div>
            </div>
          </div>

          {/* 自動配信オートパイロット設定 */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>完全自動化 (オートパイロット) 制御</span>
            </h4>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.autoIssueEnabled}
                  onChange={e => setFormData({ ...formData, autoIssueEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Shopify決済受信時にeSIMを即時自動発行 (Auto-Issuance)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.autoSendLineEnabled}
                  onChange={e => setFormData({ ...formData, autoSendLineEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>eSIM発行完了後、LINEへFlex Messageを即座に自動送信 (Auto-Delivery to LINE)</span>
              </label>
            </div>

            <div className="pt-1">
              <label className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">
                テスト用 / デフォルトLINE User ID
              </label>
              <input
                type="text"
                value={formData.defaultTestLineUserId}
                onChange={e => setFormData({ ...formData, defaultTestLineUserId: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded font-mono text-slate-900 dark:text-white text-xs mt-1"
                placeholder="U91a82fbc7819230182741abce9201"
              />
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-0.5 block">
                ※ Shopify注文のnote_attributesにLINE IDが含まれない場合に自動適用される宛先です
              </span>
            </div>
          </div>

          {/* eSIM 在庫しきい値 & アラート通知設定 */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>eSIM 在庫しきい値 & システムアラート通知設定</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  警告しきい値 (Warning Threshold)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={formData.stockAlertThreshold}
                    onChange={e => setFormData({ ...formData, stockAlertThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded font-mono text-slate-900 dark:text-white"
                    min={1}
                  />
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">枚以下</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  危険しきい値 (Critical Threshold)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={formData.stockCriticalThreshold}
                    onChange={e => setFormData({ ...formData, stockCriticalThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded font-mono text-slate-900 dark:text-white"
                    min={1}
                  />
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">枚以下</span>
                </div>
              </div>
            </div>

            <div className="pt-1 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200 font-medium">
                <input
                  type="checkbox"
                  checked={formData.stockAlertEmailEnabled}
                  onChange={e => setFormData({ ...formData, stockAlertEmailEnabled: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>しきい値低下時に管理者宛てへ緊急通知メールを自動送信する</span>
              </label>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  アラート通知先メールアドレス
                </label>
                <input
                  type="email"
                  value={formData.alertEmail}
                  onChange={e => setFormData({ ...formData, alertEmail: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded text-slate-900 dark:text-white font-mono"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
          </div>

          {/* LINE Messaging API 設定 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              LINE Messaging API 接続情報
            </h4>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Channel Access Token (長期チャネルアクセストークン)
                </label>
                <textarea
                  rows={2}
                  value={formData.lineMessagingToken}
                  onChange={e => setFormData({ ...formData, lineMessagingToken: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white text-[11px]"
                  placeholder="LINE Developersコンソールより発行したアクセストークンを入力..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">LINE Channel ID</label>
                  <input
                    type="text"
                    value={formData.lineChannelId}
                    onChange={e => setFormData({ ...formData, lineChannelId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">LINE Channel Secret</label>
                  <input
                    type="password"
                    value={formData.lineChannelSecret}
                    onChange={e => setFormData({ ...formData, lineChannelSecret: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 卸元eSIM API 設定 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              卸元eSIMプロバイダー接続情報
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">API Endpoint</label>
                <input
                  type="text"
                  value={formData.wholesalerApiEndpoint}
                  onChange={e => setFormData({ ...formData, wholesalerApiEndpoint: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">API Key / Bearer Token</label>
                <input
                  type="password"
                  value={formData.wholesalerApiKey}
                  onChange={e => setFormData({ ...formData, wholesalerApiKey: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            {savedSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                設定を保存しました
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">変更は即時システムに反映されます</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium"
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? '保存中...' : '設定を保存'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
