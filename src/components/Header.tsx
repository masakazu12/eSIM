import React from 'react';
import { Sun, Moon, Play, Sparkles, RefreshCw, Settings } from 'lucide-react';

export type ActiveTab = 'overview' | 'orders' | 'jobs' | 'plans' | 'acceptance' | 'audit';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenSimulateModal: () => void;
  onOpenSettings: () => void;
  onRunAcceptanceTests: () => void;
  isTestRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  onOpenSimulateModal,
  onOpenSettings,
  onRunAcceptanceTests,
  isTestRunning,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element, no adjacent descriptor pills) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
            e
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap hover:opacity-80 transition-opacity text-left"
          >
            Shopify eSIM AutoFlow
          </button>
        </div>

        {/* Zone 2: 4-5 Concise Single-line Nav Links with subtle hover underlines */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'overview'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ダッシュボード
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'orders'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            注文・発行台帳
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'jobs'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ジョブキュー
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'plans'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            プラン対応管理
          </button>
          <button
            onClick={() => setActiveTab('acceptance')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'acceptance'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            受入テスト検証
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'audit'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            監査ログ
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Utility Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenSettings}
            aria-label="API Settings"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="API設定 & Webhook URL"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle theme"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSimulateModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Webhookテスト</span>
          </button>

          <button
            onClick={onRunAcceptanceTests}
            disabled={isTestRunning}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
          >
            {isTestRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>受入テスト検証</span>
          </button>
        </div>
      </div>
    </header>
  );
};
