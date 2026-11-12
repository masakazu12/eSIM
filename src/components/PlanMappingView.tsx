import React, { useState } from 'react';
import {
  Layers,
  Database,
  ExternalLink,
  Edit2,
  Check,
  Globe2,
  Wifi,
  SignalHigh,
  Plus,
  Trash2,
  RotateCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Play,
  Save,
  X,
  Sliders,
  DollarSign,
  PackagePlus,
  ShieldCheck
} from 'lucide-react';
import { PlanMapping, WholesalerPlan } from '../types/index.ts';

interface PlanMappingViewProps {
  mappings: PlanMapping[];
  plans: WholesalerPlan[];
  onRefresh?: () => Promise<void>;
}

export const PlanMappingView: React.FC<PlanMappingViewProps> = ({
  mappings: initialMappings,
  plans: initialPlans,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'mappings' | 'plans' | 'dryrun'>('mappings');

  // ローカル状態（即時反映用）
  const [mappings, setMappings] = useState<PlanMapping[]>(initialMappings);
  const [plans, setPlans] = useState<WholesalerPlan[]>(initialPlans);

  // モーダル管理
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PlanMapping | null>(null);
  const [editingPlan, setEditingPlan] = useState<WholesalerPlan | null>(null);

  // ドライラン検証状態
  const [selectedDryRunPlanId, setSelectedDryRunPlanId] = useState<string>(plans[0]?.id || '');
  const [dryRunRunning, setDryRunRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  // マッピングフォーム用データ
  const [mappingForm, setMappingForm] = useState<Partial<PlanMapping>>({
    shopifyVariantId: '',
    shopifyProductId: '',
    productTitle: '',
    variantTitle: '',
    wholesalerPlanId: plans[0]?.id || '',
    isActive: true,
    metafields: {
      planCode: '',
      country: '',
      capacity: '',
      duration: '',
      provider: 'eSIM_GO',
    },
  });

  // プランフォーム用データ
  const [planForm, setPlanForm] = useState<Partial<WholesalerPlan>>({
    id: '',
    planCode: '',
    provider: 'eSIM_GO',
    countryCode: 'SG',
    countryName: 'シンガポール (Singapore)',
    dataAllowance: '10GB 高速通信',
    validityDays: 7,
    wholesaleCostJpy: 1100,
    retailPriceJpy: 2480,
    apn: 'globaldata',
    roamingEnabled: true,
    supportedNetworks: ['Singtel', 'StarHub'],
    stockAvailable: 200,
  });

  // 外部からの更新同期
  React.useEffect(() => {
    setMappings(initialMappings);
  }, [initialMappings]);

  React.useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  // マッピングの保存 (新規または更新)
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingForm.shopifyVariantId || !mappingForm.wholesalerPlanId) return;

    const selectedPlan = plans.find(p => p.id === mappingForm.wholesalerPlanId);
    const fullMapping: PlanMapping = {
      shopifyVariantId: mappingForm.shopifyVariantId.startsWith('gid://')
        ? mappingForm.shopifyVariantId
        : `gid://shopify/ProductVariant/${mappingForm.shopifyVariantId}`,
      shopifyProductId: mappingForm.shopifyProductId || `gid://shopify/Product/${Date.now()}`,
      productTitle: mappingForm.productTitle || selectedPlan?.countryName + ' eSIM' || '海外eSIM',
      variantTitle: mappingForm.variantTitle || selectedPlan?.dataAllowance || '通常プラン',
      wholesalerPlanId: mappingForm.wholesalerPlanId,
      isActive: mappingForm.isActive ?? true,
      metafields: {
        planCode: selectedPlan?.planCode || mappingForm.metafields?.planCode || '',
        country: selectedPlan?.countryCode || mappingForm.metafields?.country || '',
        capacity: selectedPlan?.dataAllowance || mappingForm.metafields?.capacity || '',
        duration: `${selectedPlan?.validityDays || 7}days`,
        provider: selectedPlan?.provider || 'eSIM_GO',
      },
    };

    const isEditing = Boolean(editingMapping);
    const endpoint = isEditing
      ? `/api/mappings/${encodeURIComponent(editingMapping!.shopifyVariantId)}`
      : '/api/mappings';

    await fetch(endpoint, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullMapping),
    });

    if (isEditing) {
      setMappings(mappings.map(m => (m.shopifyVariantId === fullMapping.shopifyVariantId ? fullMapping : m)));
    } else {
      setMappings([...mappings, fullMapping]);
    }

    setIsMappingModalOpen(false);
    setEditingMapping(null);
    if (onRefresh) onRefresh();
  };

  // マッピング有効/無効切り替え
  const handleToggleMappingActive = async (mapping: PlanMapping) => {
    const updated = { ...mapping, isActive: !mapping.isActive };
    await fetch(`/api/mappings/${encodeURIComponent(mapping.shopifyVariantId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setMappings(mappings.map(m => (m.shopifyVariantId === mapping.shopifyVariantId ? updated : m)));
    if (onRefresh) onRefresh();
  };

  // マッピング削除
  const handleDeleteMapping = async (variantId: string) => {
    if (!window.confirm('このバリアントマッピングを削除してもよろしいですか？')) return;
    await fetch(`/api/mappings/${encodeURIComponent(variantId)}`, { method: 'DELETE' });
    setMappings(mappings.filter(m => m.shopifyVariantId !== variantId));
    if (onRefresh) onRefresh();
  };

  // 卸元プランの保存 (新規または更新)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.planCode || !planForm.countryName) return;

    const planId = planForm.id || `plan_${planForm.countryCode?.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const fullPlan: WholesalerPlan = {
      id: planId,
      planCode: planForm.planCode,
      provider: planForm.provider as any,
      countryCode: planForm.countryCode || 'US',
      countryName: planForm.countryName,
      dataAllowance: planForm.dataAllowance || '10GB',
      validityDays: Number(planForm.validityDays || 7),
      wholesaleCostJpy: Number(planForm.wholesaleCostJpy || 1000),
      retailPriceJpy: Number(planForm.retailPriceJpy || 2000),
      apn: planForm.apn || 'internet',
      roamingEnabled: Boolean(planForm.roamingEnabled),
      supportedNetworks: typeof planForm.supportedNetworks === 'string'
        ? (planForm.supportedNetworks as string).split(',').map(s => s.trim())
        : planForm.supportedNetworks || ['Default Network'],
      stockAvailable: Number(planForm.stockAvailable || 100),
    };

    const isEditing = Boolean(editingPlan);
    const endpoint = isEditing ? `/api/plans/${planId}` : '/api/plans';

    await fetch(endpoint, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPlan),
    });

    if (isEditing) {
      setPlans(plans.map(p => (p.id === planId ? fullPlan : p)));
    } else {
      setPlans([...plans, fullPlan]);
    }

    setIsPlanModalOpen(false);
    setEditingPlan(null);
    if (onRefresh) onRefresh();
  };

  // 在庫補充 (Restock)
  const handleRestock = async (planId: string, count: number) => {
    await fetch(`/api/plans/${planId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    setPlans(
      plans.map(p => (p.id === planId ? { ...p, stockAvailable: p.stockAvailable + count } : p))
    );
    if (onRefresh) onRefresh();
  };

  // ドライラン検証実行
  const handleExecuteDryRun = async () => {
    setDryRunRunning(true);
    setDryRunResult(null);
    try {
      const res = await fetch('/api/plans/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedDryRunPlanId }),
      });
      const data = await res.json();
      setDryRunResult(data);
    } finally {
      setDryRunRunning(false);
    }
  };

  // Shopify Metafield JSONエクスポート
  const handleExportMetafieldsJson = () => {
    const exportData = mappings.map(m => ({
      variant_id: m.shopifyVariantId,
      product_title: m.productTitle,
      variant_title: m.variantTitle,
      metafields: [
        { namespace: 'esim', key: 'plan_code', value: m.metafields.planCode, type: 'single_line_text_field' },
        { namespace: 'esim', key: 'country', value: m.metafields.country, type: 'single_line_text_field' },
        { namespace: 'esim', key: 'capacity', value: m.metafields.capacity, type: 'single_line_text_field' },
        { namespace: 'esim', key: 'duration', value: m.metafields.duration, type: 'single_line_text_field' },
        { namespace: 'esim', key: 'provider', value: m.metafields.provider, type: 'single_line_text_field' },
      ],
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify-esim-metafields-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 画面トップバー */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>仕様書 第4項 準拠</span>
              <span aria-hidden="true">·</span>
              <span>Shopify Metafields連携 & 卸元プロバイダー設定</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              卸元eSIM プラン対応管理設定画面
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shopifyバリアントへの卸元プランID・国・容量・日数の紐付け、在庫残数管理、原価利益率、API疎通検証
            </p>
          </div>

          {/* サブタブ切替コントロール */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => setActiveSubTab('mappings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeSubTab === 'mappings'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              バリアント対応マッピング ({mappings.length})
            </button>
            <button
              onClick={() => setActiveSubTab('plans')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeSubTab === 'plans'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              卸元プランマスタ・在庫 ({plans.length})
            </button>
            <button
              onClick={() => setActiveSubTab('dryrun')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeSubTab === 'dryrun'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sandbox疎通テスト
            </button>
          </div>
        </div>
      </div>

      {/* サブタブ 1: バリアント対応マッピング */}
      {activeSubTab === 'mappings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              決済完了時にShopify WebhookのバリアントIDから該当の卸元プランIDを特定し自動発行します。
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportMetafieldsJson}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Shopify一括登録用JSONをダウンロード"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Metafields JSON出力</span>
              </button>
              <button
                onClick={() => {
                  setEditingMapping(null);
                  setMappingForm({
                    shopifyVariantId: '4490182390' + (mappings.length + 5),
                    shopifyProductId: '88219382' + (mappings.length + 5),
                    productTitle: '',
                    variantTitle: '',
                    wholesalerPlanId: plans[0]?.id || '',
                    isActive: true,
                    metafields: {
                      planCode: plans[0]?.planCode || '',
                      country: plans[0]?.countryCode || '',
                      capacity: plans[0]?.dataAllowance || '',
                      duration: `${plans[0]?.validityDays || 7}days`,
                      provider: plans[0]?.provider || 'eSIM_GO',
                    },
                  });
                  setIsMappingModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新規マッピング追加</span>
              </button>
            </div>
          </div>

          {/* マッピングテーブル */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-medium">
                    <th className="py-3 px-4">Shopify商品 / バリアント</th>
                    <th className="py-3 px-4">Variant ID (Shopify)</th>
                    <th className="py-3 px-4">紐付け卸元プラン</th>
                    <th className="py-3 px-4">Metafield 発行パラメータ</th>
                    <th className="py-3 px-4 font-mono text-right">販売価格 / 粗利</th>
                    <th className="py-3 px-4 text-center">自動発行</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {mappings.map(mapping => {
                    const plan = plans.find(p => p.id === mapping.wholesalerPlanId);
                    const margin = plan ? plan.retailPriceJpy - plan.wholesaleCostJpy : 0;
                    const marginRate = plan ? ((margin / plan.retailPriceJpy) * 100).toFixed(0) : '0';

                    return (
                      <tr
                        key={mapping.shopifyVariantId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {mapping.productTitle}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {mapping.variantTitle}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {mapping.shopifyVariantId.replace('gid://shopify/ProductVariant/', '')}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Globe2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{plan?.countryName || mapping.metafields.country}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            卸元: {plan?.provider} · ID: {plan?.id}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {mapping.metafields.planCode}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {mapping.metafields.capacity} / {mapping.metafields.duration} (APN: {plan?.apn || 'auto'})
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-right tabular-nums">
                          <div className="text-slate-900 dark:text-white font-bold">
                            ¥{plan?.retailPriceJpy.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            粗利 ¥{margin.toLocaleString()} ({marginRate}%)
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleMappingActive(mapping)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                              mapping.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {mapping.isActive ? '有効 (ACTIVE)' : '停止中'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingMapping(mapping);
                                setMappingForm(mapping);
                                setIsMappingModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="マッピング編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMapping(mapping.shopifyVariantId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="マッピング削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* サブタブ 2: 卸元プランマスタ & 在庫管理 */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                卸元プロバイダー別 eSIM プランマスタ & 在庫残数
              </h3>
              <p className="text-xs text-slate-500">
                eSIM Go, Gigs, 1GLOBAL, Telna への発注パラメータ、仕入原価、安全在庫しきい値を設定
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  id: `plan_new_${Date.now().toString().slice(-4)}`,
                  planCode: 'NEW-PLAN-01',
                  provider: 'eSIM_GO',
                  countryCode: 'US',
                  countryName: 'アメリカ本土 (USA)',
                  dataAllowance: '10GB 高速通信',
                  validityDays: 15,
                  wholesaleCostJpy: 1500,
                  retailPriceJpy: 3200,
                  apn: 'globaldata',
                  roamingEnabled: false,
                  supportedNetworks: ['T-Mobile'],
                  stockAvailable: 200,
                });
                setIsPlanModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規卸元プランを登録</span>
            </button>
          </div>

          {/* プランカードグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(p => {
              const isLowStock = p.stockAvailable <= 30;

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* カードヘッダー */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {p.provider}
                      </span>
                      <span className="font-mono text-slate-400">{p.planCode}</span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {p.countryName}
                    </h4>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {p.dataAllowance} · 有効期間 {p.validityDays}日間
                    </div>

                    {/* 在庫バー */}
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">現在庫残数:</span>
                        <span className={`font-mono font-bold tabular-nums text-sm ${isLowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {p.stockAvailable} 枚
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isLowStock ? 'bg-rose-500' : p.stockAvailable < 100 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (p.stockAvailable / 500) * 100)}%` }}
                        />
                      </div>
                      {isLowStock && (
                        <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>安全在庫を下回っています (要発注)</span>
                        </div>
                      )}
                    </div>

                    {/* 接続仕様 */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>推奨APN:</span>
                        <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{p.apn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ローミング:</span>
                        <span>{p.roamingEnabled ? '必要 (ON)' : '不要'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>回線キャリア:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                          {p.supportedNetworks.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* カードフッター & 操作ボタン */}
                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-3 font-mono tabular-nums">
                      <div>
                        <span className="text-slate-400 text-[10px] block">仕入原価</span>
                        <span className="font-bold text-slate-900 dark:text-white">¥{p.wholesaleCostJpy.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">販売設定価格</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">¥{p.retailPriceJpy.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestock(p.id, 50)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="在庫を50枚補充"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span>+50枚補充</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlan(p);
                          setPlanForm({
                            ...p,
                            supportedNetworks: p.supportedNetworks.join(', ') as any,
                          });
                          setIsPlanModalOpen(true);
                        }}
                        className="py-1.5 px-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* サブタブ 3: Sandbox 疎通・ドライラン検証 */}
      {activeSubTab === 'dryrun' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              卸元プロバイダー別 Sandbox 疎通・発行パラメータ検証 (Dry-Run)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              在庫を実際に消費することなく、選択したプランのパラメータ構成（APN、SM-DP+サーバー、LPA構文、応答遅延ms）をリアルタイムにテスト検証できます。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
            <select
              value={selectedDryRunPlanId}
              onChange={e => setSelectedDryRunPlanId(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.provider}] {p.countryName} - {p.planCode} ({p.dataAllowance})
                </option>
              ))}
            </select>

            <button
              onClick={handleExecuteDryRun}
              disabled={dryRunRunning}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 shrink-0"
            >
              {dryRunRunning ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>疎通テスト実行</span>
            </button>
          </div>

          {/* テスト結果表示 */}
          {dryRunResult && (
            <div className="border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{dryRunResult.message}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">プロバイダー</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{dryRunResult.verification.provider}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">SM-DP+ ドメイン</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px] truncate block">{dryRunResult.verification.smdpAddress}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">API応答レイテンシ</span>
                  <span className="font-mono font-bold text-emerald-600">{dryRunResult.verification.responseTimeMs} ms</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">在庫引当テスト</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">OK (残り{dryRunResult.verification.stockAvailable}枚)</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                生成LPA構文: LPA:1${dryRunResult.verification.smdpAddress}${dryRunResult.verification.matchingId}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 新規・編集マッピング モーダル */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingMapping ? 'バリアントマッピングの編集' : '新規バリアントマッピングの登録'}
              </h3>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Shopify Variant ID</label>
                <input
                  type="text"
                  value={mappingForm.shopifyVariantId || ''}
                  onChange={e => setMappingForm({ ...mappingForm, shopifyVariantId: e.target.value })}
                  placeholder="44901823901 または gid://shopify/ProductVariant/..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">商品タイトル (Shopify)</label>
                  <input
                    type="text"
                    value={mappingForm.productTitle || ''}
                    onChange={e => setMappingForm({ ...mappingForm, productTitle: e.target.value })}
                    placeholder="韓国旅行 eSIM 10GB 7日間"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">バリアント名</label>
                  <input
                    type="text"
                    value={mappingForm.variantTitle || ''}
                    onChange={e => setMappingForm({ ...mappingForm, variantTitle: e.target.value })}
                    placeholder="7日間 / 10GB"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">紐付ける卸元eSIMプラン</label>
                <select
                  value={mappingForm.wholesalerPlanId}
                  onChange={e => {
                    const selPlan = plans.find(p => p.id === e.target.value);
                    setMappingForm({
                      ...mappingForm,
                      wholesalerPlanId: e.target.value,
                      metafields: {
                        planCode: selPlan?.planCode || '',
                        country: selPlan?.countryCode || '',
                        capacity: selPlan?.dataAllowance || '',
                        duration: `${selPlan?.validityDays || 7}days`,
                        provider: selPlan?.provider || 'eSIM_GO',
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.provider}] {p.countryName} - {p.planCode} ({p.dataAllowance} / {p.validityDays}日) [卸: ¥{p.wholesaleCostJpy}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="mappingActive"
                  checked={mappingForm.isActive ?? true}
                  onChange={e => setMappingForm({ ...mappingForm, isActive: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="mappingActive" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  このバリアントを自動発行対象として有効にする (Active)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存する</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新規・編集 卸元プラン モーダル */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingPlan ? '卸元eSIMプランの編集' : '新規卸元eSIMプランの登録'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">卸元プロバイダー</label>
                  <select
                    value={planForm.provider}
                    onChange={e => setPlanForm({ ...planForm, provider: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                  >
                    <option value="eSIM_GO">eSIM Go</option>
                    <option value="GIGS">Gigs</option>
                    <option value="GLOBAL_1">1GLOBAL</option>
                    <option value="TELNA">Telna</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">プランコード</label>
                  <input
                    type="text"
                    value={planForm.planCode || ''}
                    onChange={e => setPlanForm({ ...planForm, planCode: e.target.value })}
                    placeholder="KR-SKT-10GB-07D"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">国コード (2文字)</label>
                  <input
                    type="text"
                    value={planForm.countryCode || ''}
                    onChange={e => setPlanForm({ ...planForm, countryCode: e.target.value.toUpperCase() })}
                    placeholder="KR"
                    maxLength={2}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono text-center"
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">国名・地域名</label>
                  <input
                    type="text"
                    value={planForm.countryName || ''}
                    onChange={e => setPlanForm({ ...planForm, countryName: e.target.value })}
                    placeholder="韓国 (Korea)"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">通信データ容量</label>
                  <input
                    type="text"
                    value={planForm.dataAllowance || ''}
                    onChange={e => setPlanForm({ ...planForm, dataAllowance: e.target.value })}
                    placeholder="10GB 高速通信"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">利用日数</label>
                  <input
                    type="number"
                    value={planForm.validityDays || 7}
                    onChange={e => setPlanForm({ ...planForm, validityDays: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">仕入原価 (円)</label>
                  <input
                    type="number"
                    value={planForm.wholesaleCostJpy || 0}
                    onChange={e => setPlanForm({ ...planForm, wholesaleCostJpy: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">販売価格 (円)</label>
                  <input
                    type="number"
                    value={planForm.retailPriceJpy || 0}
                    onChange={e => setPlanForm({ ...planForm, retailPriceJpy: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">初期在庫数</label>
                  <input
                    type="number"
                    value={planForm.stockAvailable || 0}
                    onChange={e => setPlanForm({ ...planForm, stockAvailable: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">推奨APN設定</label>
                  <input
                    type="text"
                    value={planForm.apn || ''}
                    onChange={e => setPlanForm({ ...planForm, apn: e.target.value })}
                    placeholder="globaldata"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">対応回線キャリア (カンマ区切り)</label>
                  <input
                    type="text"
                    value={Array.isArray(planForm.supportedNetworks) ? planForm.supportedNetworks.join(', ') : planForm.supportedNetworks || ''}
                    onChange={e => setPlanForm({ ...planForm, supportedNetworks: e.target.value as any })}
                    placeholder="SK Telecom, KT"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="roamingEnabled"
                  checked={planForm.roamingEnabled ?? true}
                  onChange={e => setPlanForm({ ...planForm, roamingEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="roamingEnabled" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  利用時にデータローミング設定をONにする必要がある
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存する</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
