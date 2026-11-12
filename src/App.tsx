import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { OrderList } from './components/OrderList.tsx';
import { JobQueueView } from './components/JobQueueView.tsx';
import { PlanMappingView } from './components/PlanMappingView.tsx';
import { AcceptanceTesting } from './components/AcceptanceTesting.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { CustomerClaimPortal } from './components/CustomerClaimPortal.tsx';
import { LineFlexSimulator } from './components/LineFlexSimulator.tsx';
import { SimulateWebhookModal } from './components/SimulateWebhookModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import {
  ShopifyOrder,
  IssuanceJob,
  WholesalerPlan,
  PlanMapping,
  AuditLog,
  AcceptanceTestResult,
  SystemConfig,
} from './types/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isDark, setIsDark] = useState(false);

  // 状態
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [jobs, setJobs] = useState<IssuanceJob[]>([]);
  const [plans, setPlans] = useState<WholesalerPlan[]>([]);
  const [mappings, setMappings] = useState<PlanMapping[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [testResults, setTestResults] = useState<AcceptanceTestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // モーダル管理
  const [selectedClaimOrder, setSelectedClaimOrder] = useState<ShopifyOrder | null>(null);
  const [selectedLinePreviewOrder, setSelectedLinePreviewOrder] = useState<ShopifyOrder | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // テーマ切り替え
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // データ取得
  const fetchData = async () => {
    try {
      const [ordersRes, jobsRes, plansRes, mappingsRes, logsRes, configRes] = await Promise.all([
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/jobs').then(r => r.json()),
        fetch('/api/plans').then(r => r.json()),
        fetch('/api/mappings').then(r => r.json()),
        fetch('/api/audit-logs').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
      ]);

      if (ordersRes.orders) setOrders(ordersRes.orders);
      if (jobsRes.jobs) setJobs(jobsRes.jobs);
      if (plansRes.plans) setPlans(plansRes.plans);
      if (mappingsRes.mappings) setMappings(mappingsRes.mappings);
      if (logsRes.logs) setAuditLogs(logsRes.logs);
      if (configRes.config) setSystemConfig(configRes.config);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // 自動更新ポーリング (2.5秒間隔)
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, []);

  // 受入テスト実行
  const handleRunAcceptanceTests = async () => {
    setIsTestRunning(true);
    try {
      const res = await fetch('/api/test/run-acceptance', { method: 'POST' });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
      }
      await fetchData();
    } catch (err) {
      console.error('Acceptance test failed:', err);
    } finally {
      setIsTestRunning(false);
    }
  };

  // 初回ロード時に受入テストの初期状態を生成
  useEffect(() => {
    handleRunAcceptanceTests();
  }, []);

  // 注文の手動再試行
  const handleRetryOrder = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}/retry`, { method: 'POST' });
    await fetchData();
  };

  // LINE通知再送
  const handleResendLine = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}/resend-line`, { method: 'POST' });
    await fetchData();
  };

  // 返金・失効
  const handleRefundOrder = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}/refund`, { method: 'POST' });
    await fetchData();
  };

  // ジョブ手動再試行
  const handleRetryJob = async (jobId: string) => {
    await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
    await fetchData();
  };

  // Webhookシミュレーション実行
  const handleSimulateWebhook = async (data: {
    planId: string;
    customerName: string;
    customerEmail: string;
    simulateDuplicate?: boolean;
    simulateTimeout?: boolean;
    autoSendLine?: boolean;
  }) => {
    await fetch('/api/test/simulate-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchData();
  };

  // 完全自動パイプラインの即時実演実行 (Shopify ➔ eSIM ➔ LINE自動配信)
  const handleRunInstantFullPipeline = async (planId: string = 'plan_kr_10gb_7d'): Promise<ShopifyOrder | null> => {
    try {
      const res = await fetch('/api/test/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          customerName: '白川 雅史',
          customerEmail: 'm.shirakawa1204@gmail.com',
          autoSendLine: true,
        }),
      });
      const data = await res.json();
      await fetchData();
      return data.order || null;
    } catch (err) {
      console.error('Failed to run full pipeline:', err);
      return null;
    }
  };

  // オートパイロットトグル
  const handleToggleAutopilot = async () => {
    try {
      const res = await fetch('/api/config/toggle-autopilot', { method: 'POST' });
      const data = await res.json();
      if (systemConfig) {
        setSystemConfig({ ...systemConfig, autoSendLineEnabled: data.autoSendLineEnabled });
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle autopilot:', err);
    }
  };

  // 設定保存
  const handleSaveConfig = async (updated: Partial<SystemConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.config) {
        setSystemConfig(data.config);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  // LINE Login連携シミュレーション
  const handleLinkLineAccount = async (order: ShopifyOrder) => {
    await fetch('/api/auth/line/mock-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimToken: order.claimToken,
        lineUserId: 'U' + Math.random().toString(36).substring(2, 12),
        lineDisplayName: order.customerName,
      }),
    });
    await fetchData();
    if (selectedLinePreviewOrder?.id === order.id) {
      const updated = orders.find(o => o.id === order.id);
      if (updated) setSelectedLinePreviewOrder(updated);
    }
  };

  // 在庫補充
  const handleRestockPlan = async (planId: string, count: number) => {
    await fetch(`/api/plans/${planId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* トップバー (Top Bar Contract 準拠) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRunAcceptanceTests={() => {
          setActiveTab('acceptance');
          handleRunAcceptanceTests();
        }}
        isTestRunning={isTestRunning}
      />

      {/* メインビューポート */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <DashboardOverview
            orders={orders}
            jobs={jobs}
            plans={plans}
            systemConfig={systemConfig}
            autoSendLineEnabled={systemConfig?.autoSendLineEnabled ?? true}
            onToggleAutopilot={handleToggleAutopilot}
            onSelectOrder={order => setSelectedClaimOrder(order)}
            onPreviewLine={order => setSelectedLinePreviewOrder(order)}
            onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onRunAcceptanceTests={() => {
              setActiveTab('acceptance');
              handleRunAcceptanceTests();
            }}
            onNavigateToTab={tab => setActiveTab(tab)}
            onRunInstantFullPipeline={handleRunInstantFullPipeline}
            onRestockPlan={handleRestockPlan}
            onRefreshData={fetchData}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            onSelectOrder={order => setSelectedClaimOrder(order)}
            onPreviewLine={order => setSelectedLinePreviewOrder(order)}
            onRetryOrder={handleRetryOrder}
            onResendLine={handleResendLine}
            onRefundOrder={handleRefundOrder}
          />
        )}

        {activeTab === 'jobs' && (
          <JobQueueView jobs={jobs} onRetryJob={handleRetryJob} />
        )}

        {activeTab === 'plans' && (
          <PlanMappingView mappings={mappings} plans={plans} onRefresh={fetchData} />
        )}

        {activeTab === 'acceptance' && (
          <AcceptanceTesting
            testResults={testResults}
            isRunning={isTestRunning}
            onRunTests={handleRunAcceptanceTests}
          />
        )}

        {activeTab === 'audit' && <AuditLogView logs={auditLogs} />}
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Shopify eSIM 自動発行 LINE配信連携システム</span>
            <span aria-hidden="true">·</span>
            <span>Shopify ➔ eSIM ➔ LINE 完全自動化</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>HMAC-SHA256 署名検証</span>
            <span>GSMA SGP.22 LPA 準拠</span>
            <span>LINE Messaging API 自動配信</span>
          </div>
        </div>
      </footer>

      {/* 購入者向け eSIM受取ポータル モーダル */}
      {selectedClaimOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-2xl">
            <CustomerClaimPortal
              order={selectedClaimOrder}
              onClose={() => setSelectedClaimOrder(null)}
            />
          </div>
        </div>
      )}

      {/* LINE トーク画面シミュレータ モーダル */}
      {selectedLinePreviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative my-8">
            <LineFlexSimulator
              order={selectedLinePreviewOrder}
              onOpenClaim={order => {
                setSelectedLinePreviewOrder(null);
                setSelectedClaimOrder(order);
              }}
              onLinkLineAccount={handleLinkLineAccount}
              onClose={() => setSelectedLinePreviewOrder(null)}
            />
          </div>
        </div>
      )}

      {/* Webhook テスト発火モーダル */}
      <SimulateWebhookModal
        plans={plans}
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSubmit={handleSimulateWebhook}
      />

      {/* API・Webhook設定モーダル */}
      {systemConfig && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={systemConfig}
          onSaveConfig={handleSaveConfig}
        />
      )}
    </div>
  );
}
