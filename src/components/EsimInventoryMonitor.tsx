import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  PackagePlus,
  Sliders,
  Mail,
  CheckCircle2,
  RefreshCw,
  Bell,
  Zap,
  Globe2,
  ChevronRight,
  X,
  Save,
  Check
} from 'lucide-react';
import { WholesalerPlan, SystemConfig } from '../types/index.ts';

interface EsimInventoryMonitorProps {
  plans: WholesalerPlan[];
  config: SystemConfig | null;
  onRestock: (planId: string, count: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSaveConfig: (updated: Partial<SystemConfig>) => Promise<void>;
}

export const EsimInventoryMonitor: React.FC<EsimInventoryMonitorProps> = ({
  plans,
  config,
  onRestock,
  onRefresh,
  onSaveConfig,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<number>(config?.stockAlertThreshold || 50);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(config?.stockCriticalThreshold || 20);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(config?.stockAlertEmailEnabled ?? true);
  const [alertEmail, setAlertEmail] = useState<string>(config?.alertEmail || 'm.shirakawa1204@gmail.com');
  const [isSimulating, setIsSimulating] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 在庫状況判定
  const totalStock = plans.reduce((acc, p) => acc + p.stockAvailable, 0);
  const criticalPlans = plans.filter(p => p.stockAvailable <= criticalThreshold);
  const warningPlans = plans.filter(p => p.stockAvailable > criticalThreshold && p.stockAvailable <= alertThreshold);
  const healthyPlans = plans.filter(p => p.stockAvailable > alertThreshold);

  const hasAlerts = criticalPlans.length > 0 || warningPlans.length > 0;

  // しきい値の保存
  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig({
      stockAlertThreshold: alertThreshold,
      stockCriticalThreshold: criticalThreshold,
      stockAlertEmailEnabled: emailEnabled,
      alertEmail,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsConfigOpen(false);
    }, 1200);
    if (onRefresh) onRefresh();
  };

  // 在庫枯渇テストシミュレーション (アラート動作確認用)
  const handleSimulateDepletion = async () => {
    setIsSimulating(true);
    try {
      // 最初のプランまたは在庫のあるプランを対象に15枚に低下
      const targetPlan = plans.find(p => p.id === 'plan_us_10gb_15d') || plans[0];
      if (targetPlan) {
        await fetch('/api/inventory/simulate-depletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: targetPlan.id,
            targetStock: 12,
          }),
        });
        await onRefresh();
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
      {/* ウィジェット ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            criticalPlans.length > 0
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              : warningPlans.length > 0
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                eSIM 在庫監視モニター (Inventory Monitor)
              </h3>
              {hasAlerts ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                  {criticalPlans.length > 0 ? `${criticalPlans.length}件 危険` : `${warningPlans.length}件 警告`}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>全プラン正常</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              各回線プランの在庫残数を常時監視し、しきい値（警告: {alertThreshold}枚 / 危険: {criticalThreshold}枚）低下時に自動アラート・メール通知を発火
            </p>
          </div>
        </div>

        {/* コントロールボタン群 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSimulateDepletion}
            disabled={isSimulating}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="在庫を故意にしきい値以下に減らしてアラート動作を検証"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{isSimulating ? '検証中...' : '在庫アラート検証'}</span>
          </button>

          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>しきい値設定</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="最新在庫を照会"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* しきい値設定フォーム (アコーディオン展開) */}
      {isConfigOpen && (
        <form
          onSubmit={handleSaveThresholds}
          className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span>在庫アラート・通知トリガーのしきい値設定</span>
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                警告しきい値 (Warning)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={alertThreshold}
                  onChange={e => setAlertThreshold(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                />
                <span className="text-slate-400 font-mono">枚以下</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                危険しきい値 (Critical)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={criticalThreshold}
                  onChange={e => setCriticalThreshold(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                />
                <span className="text-slate-400 font-mono">枚以下</span>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                アラート通知先メールアドレス
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={alertEmail}
                  onChange={e => setAlertEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={e => setEmailEnabled(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>しきい値到達時に管理者宛てへメール通知を自動送信する</span>
            </label>

            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  設定更新済
                </span>
              )}
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold flex items-center gap-1 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>設定を保存</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* アクティブな在庫アラートバナー (しきい値未満のプランがある場合) */}
      {hasAlerts && (
        <div className="space-y-2">
          {criticalPlans.map(cp => (
            <div
              key={cp.id}
              className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-900 dark:text-rose-200">
                    【緊急在庫枯渇アラート】{cp.countryName} ({cp.planCode}) の残数が {cp.stockAvailable} 枚になりました
                  </div>
                  <div className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5">
                    危険しきい値 ({criticalThreshold}枚) を下回っています。Shopifyで注文が入った際に発行エラーとなるリスクがあります。
                    {emailEnabled && (
                      <span className="ml-1 text-rose-600 font-mono">
                        (通知送信済 ➔ {alertEmail})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    setRestockingId(cp.id);
                    await onRestock(cp.id, 100);
                    setRestockingId(null);
                  }}
                  disabled={restockingId === cp.id}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>{restockingId === cp.id ? '補充中...' : '+100枚 即時補充'}</span>
                </button>
              </div>
            </div>
          ))}

          {warningPlans.map(wp => (
            <div
              key={wp.id}
              className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    【在庫注意】{wp.countryName} ({wp.planCode}) の残数が {wp.stockAvailable} 枚です
                  </div>
                  <div className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                    警告しきい値 ({alertThreshold}枚) 以下です。追加発注の準備を推奨します。
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    setRestockingId(wp.id);
                    await onRestock(wp.id, 50);
                    setRestockingId(null);
                  }}
                  disabled={restockingId === wp.id}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>{restockingId === wp.id ? '補充中...' : '+50枚 補充'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* プラン別在庫状況 グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map(plan => {
          const isCritical = plan.stockAvailable <= criticalThreshold;
          const isWarning = !isCritical && plan.stockAvailable <= alertThreshold;

          return (
            <div
              key={plan.id}
              className={`p-3.5 rounded-xl border transition-colors ${
                isCritical
                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                  : isWarning
                  ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono text-slate-500 text-[11px]">{plan.provider} · {plan.planCode}</span>
                <span className={`text-[11px] font-bold ${
                  isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {isCritical ? '枯渇寸前 (Critical)' : isWarning ? '残少 (Warning)' : '正常 (Healthy)'}
                </span>
              </div>

              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>{plan.countryName}</span>
                <span className="font-mono tabular-nums text-base">
                  {plan.stockAvailable} <span className="text-xs font-normal text-slate-500">枚</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-500 mt-0.5">
                {plan.dataAllowance} ({plan.validityDays}日) · APN: {plan.apn}
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (plan.stockAvailable / 500) * 100)}%` }}
                />
              </div>

              {/* クイック補充ボタン */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">仕入: ¥{plan.wholesaleCostJpy}</span>
                <button
                  onClick={async () => {
                    setRestockingId(plan.id);
                    await onRestock(plan.id, isCritical ? 100 : 50);
                    setRestockingId(null);
                  }}
                  disabled={restockingId === plan.id}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <PackagePlus className="w-3 h-3" />
                  <span>+{isCritical ? 100 : 50}枚補充</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
