import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Terminal,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AcceptanceTestResult } from '../types/index.ts';

interface AcceptanceTestingProps {
  testResults: AcceptanceTestResult[];
  isRunning: boolean;
  onRunTests: () => Promise<void>;
}

export const AcceptanceTesting: React.FC<AcceptanceTestingProps> = ({
  testResults,
  isRunning,
  onRunTests,
}) => {
  const [expandedTestId, setExpandedTestId] = useState<string | null>(
    testResults[0]?.testId || null
  );

  const passedCount = testResults.filter(t => t.status === 'PASSED').length;
  const totalCount = testResults.length;

  return (
    <div className="space-y-6">
      {/* 受入テストヘッダー */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>仕様提案書 第7項</span>
              <span aria-hidden="true">·</span>
              <span>受入テスト項目 検証自動化スイート</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              自動受入テスト & 障害耐性シミュレータ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              二重発行防止、Webhook再送耐性、タイムアウト再試行、LINE認証フォールバック、返金時失効の全要件をリアルタイム検証
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onRunTests}
              disabled={isRunning}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRunning ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>全受入テストを実行</span>
            </button>
          </div>
        </div>

        {/* テスト結果サマリー */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">検証結果ステータス:</span>
            {passedCount === totalCount && totalCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                全{totalCount}項目 合格 (100% Passed)
              </span>
            ) : isRunning ? (
              <span className="text-blue-600 dark:text-blue-400 font-medium">テスト実行中...</span>
            ) : (
              <span className="text-slate-500">{passedCount} / {totalCount} 項目 合格</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            最終実行: {testResults[0]?.executedAt ? new Date(testResults[0].executedAt).toLocaleTimeString('ja-JP') : '未実行'}
          </div>
        </div>
      </div>

      {/* テスト項目リスト */}
      <div className="space-y-4">
        {testResults.map((test, index) => {
          const isExpanded = expandedTestId === test.testId;

          return (
            <div
              key={test.testId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors"
            >
              {/* テストカード ヘッダー */}
              <div
                onClick={() => setExpandedTestId(isExpanded ? null : test.testId)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {test.status === 'PASSED' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                  {test.status === 'FAILED' && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                  {test.status === 'RUNNING' && (
                    <RotateCw className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                  )}
                  {test.status === 'PENDING' && (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {test.name}
                      </h3>
                      <span className="text-[11px] text-slate-500">[{test.category}]</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {test.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {test.durationMs !== undefined && (
                    <span className="font-mono tabular-nums text-xs text-slate-400">
                      {test.durationMs}ms
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold ${
                      test.status === 'PASSED'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : test.status === 'FAILED'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {test.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* 展開時: アサーション検証詳細 & 実行ログ */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                  {/* アサーション一覧 */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      アサーション検証項目 (仕様安全要件)
                    </h4>
                    <div className="space-y-1.5">
                      {test.assertions.map((assertion, aIdx) => (
                        <div
                          key={aIdx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {assertion.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {assertion.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                            <span>期待値: <strong className="text-slate-700 dark:text-slate-300">{assertion.expected}</strong></span>
                            <span>実測値: <strong className={assertion.passed ? 'text-emerald-600' : 'text-rose-600'}>{assertion.actual}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 実行ログ */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>実行トレースログ</span>
                    </div>
                    <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] space-y-1 overflow-x-auto">
                      {test.logs.map((log, lIdx) => (
                        <div key={lIdx} className="leading-relaxed">
                          <span className="text-slate-500 mr-2">&gt;</span>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
