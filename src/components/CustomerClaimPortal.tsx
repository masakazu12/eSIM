import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Download,
  Share2
} from 'lucide-react';
import { ShopifyOrder, EsimProfile } from '../types/index.ts';

interface CustomerClaimPortalProps {
  order: ShopifyOrder;
  profile?: EsimProfile;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const CustomerClaimPortal: React.FC<CustomerClaimPortalProps> = ({
  order,
  profile: propProfile,
  onClose,
  isStandalone = false,
}) => {
  const profile = propProfile || order.esimProfiles[0];
  const lineItem = order.lineItems[0];
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deviceTab, setDeviceTab] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (profile?.qrPayload) {
      QRCode.toDataURL(profile.qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 280,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [profile?.qrPayload]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isExpired = new Date(order.claimTokenExpiresAt).getTime() < Date.now();
  const expiresDateFormatted = new Date(order.claimTokenExpiresAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-w-2xl w-full mx-auto`}>
      {/* 受取ポータル ヘッダー */}
      <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Shopify 注文完了</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{order.orderNumber}</span>
            <span aria-hidden="true">·</span>
            <span>LINE認証済み</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">eSIM 受取・設定ポータル</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors text-sm"
          >
            閉じる
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* 本人確認 & セキュリティ状態バナー */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-semibold text-sm">LINE Loginによる本人認証が完了しています</div>
            <p className="text-emerald-700 dark:text-emerald-300">
              連携アカウント: <span className="font-medium">{order.lineDisplayName || 'LINEユーザー'}</span> 
              {order.lineUserId && <span className="font-mono ml-1 text-emerald-600 dark:text-emerald-400">({order.lineUserId.substring(0, 10)}...)</span>}
            </p>
            <div className="flex items-center gap-2 pt-1 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>受取期限: {expiresDateFormatted} まで有効（推測困難なワンタイムトークンで保護中）</span>
            </div>
          </div>
        </div>

        {/* 商品情報 */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">購入プラン</span>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {lineItem?.title || 'eSIM パック'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                <span>{lineItem?.country || '対象国'}</span>
                <span aria-hidden="true">·</span>
                <span>{lineItem?.variantTitle || '標準'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">¥{order.totalPrice.toLocaleString()} (税込)</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">ステータス</span>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {profile?.status === 'ACTIVE' ? '設定可能 (発行完了)' : '発行完了'}
              </div>
            </div>
          </div>
        </div>

        {/* QRコードとアクティベーション情報 */}
        {profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* QRコード表示 */}
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                スマホのカメラまたはeSIM設定からスキャン
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm inline-block">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="eSIM GSMA QR Code"
                    className="w-48 h-48 mx-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400 font-mono">
                    QRコード生成中...
                  </div>
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                LPA:1${profile.smdpAddress}$...
              </div>
            </div>

            {/* 手動入力用コード */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                カメラで読み取れない場合の手動入力コード:
              </div>

              {/* SM-DP+ アドレス */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  SM-DP+ アドレス
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-xs font-mono text-slate-900 dark:text-slate-100 truncate border border-slate-200 dark:border-slate-700">
                    {profile.smdpAddress}
                  </div>
                  <button
                    onClick={() => handleCopy(profile.smdpAddress, 'smdp')}
                    className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0"
                    title="SM-DP+アドレスをコピー"
                  >
                    {copiedField === 'smdp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'smdp' ? 'コピー済' : 'コピー'}</span>
                  </button>
                </div>
              </div>

              {/* アクティベーションコード */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  アクティベーションコード (Activation Code)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-xs font-mono text-slate-900 dark:text-slate-100 truncate border border-slate-200 dark:border-slate-700">
                    {profile.matchingId || profile.activationCode}
                  </div>
                  <button
                    onClick={() => handleCopy(profile.matchingId || profile.activationCode, 'code')}
                    className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0"
                    title="アクティベーションコードをコピー"
                  >
                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'code' ? 'コピー済' : 'コピー'}</span>
                  </button>
                </div>
              </div>

              {/* ICCID (識別番号) */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  ICCID (回線識別番号)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-xs font-mono text-slate-900 dark:text-slate-100 truncate border border-slate-200 dark:border-slate-700">
                    {profile.iccid}
                  </div>
                  <button
                    onClick={() => handleCopy(profile.iccid, 'iccid')}
                    className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0"
                  >
                    {copiedField === 'iccid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'iccid' ? 'コピー済' : 'コピー'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              現在eSIMの発行処理を実行中です
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              通常1〜2分以内に完了します。画面を更新するか、LINE通知をお待ちください。
            </div>
          </div>
        )}

        {/* 端末別 インストール手順ガイド */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              設定ガイド（出発前またはWi-Fi環境で行ってください）
            </h4>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setDeviceTab('ios')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  deviceTab === 'ios'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                iPhone (iOS)
              </button>
              <button
                onClick={() => setDeviceTab('android')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  deviceTab === 'android'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Android
              </button>
            </div>
          </div>

          {deviceTab === 'ios' ? (
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside">
              <li>「設定」＞「モバイル通信」を開きます。</li>
              <li>「eSIMを追加」をタップし、「QRコードを使用」を選択します。</li>
              <li>上のQRコードをスキャンするか、「詳細を手動で入力」を選びSM-DP+とコードを貼り付けます。</li>
              <li>現地到着後、モバイル通信回線を本eSIMに切り替え、「データローミング」をONにします。</li>
            </ol>
          ) : (
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside">
              <li>「設定」＞「ネットワークとインターネット」＞「SIM」を開きます。</li>
              <li>「SIMを追加」または「＋」をタップし、「eSIMをダウンロードしますか？」を選択します。</li>
              <li>QRコードを読み取り、アクティベーションを完了します。</li>
              <li>現地到着後、モバイルデータを本eSIMに設定し、「データローミング」をONにします。</li>
            </ol>
          )}
        </div>

        {/* 端末適合確認ガイド */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 border border-slate-200 dark:border-slate-800">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-200">ご利用にあたっての確認事項:</span>
            <span className="ml-1">SIMロック解除済みのeSIM対応端末が必要です。一度インストールしたeSIMプロファイルは別端末への移行・再発行ができませんのでご注意ください。</span>
          </div>
        </div>
      </div>
    </div>
  );
};
