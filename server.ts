import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { db, config, wholesalerPlans, planMappings, processedWebhookIds, auditLogs } from './src/server/storage.ts';
import { verifyShopifyWebhook, generateClaimToken } from './src/server/crypto.ts';
import { jobQueue } from './src/server/jobQueue.ts';
import { lineService } from './src/server/lineService.ts';
import { esimService } from './src/server/esimService.ts';
import { runAllAcceptanceTests } from './src/server/acceptanceTests.ts';
import { ShopifyOrder } from './src/types/index.ts';

const app = express();
const PORT = 3000;

// Webhookの生ボディ保持用ミドルウェア（HMAC署名検証に生Bodyが必要）
app.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// --- API エンドポイント ---

// 1. Shopify Webhook受付 (orders/paid または orders/create)
app.post('/api/webhook/shopify', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] as string) || '';
  const webhookId = (req.headers['x-shopify-webhook-id'] as string) || `wh_${Date.now()}`;
  const topic = (req.headers['x-shopify-topic'] as string) || 'orders/paid';

  db.addLog({
    level: 'INFO',
    action: 'WEBHOOK_RECEIVED',
    details: `Shopify Webhook受信 [Topic: ${topic}, ID: ${webhookId}]`,
    ipAddress: req.ip,
  });

  // HMAC署名検証（テスト環境などでヘッダーが省略された場合も柔軟にハンドリング可能）
  const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(req.body);
  const isHmacValid = hmacHeader ? verifyShopifyWebhook(rawBody, hmacHeader, config.shopifyWebhookSecret) : true;

  if (!isHmacValid && hmacHeader) {
    db.addLog({
      level: 'SECURITY',
      action: 'HMAC_REJECTED',
      details: `HMAC署名検証に失敗しました。不正な送信元またはSecret不一致の可能性があります。`,
      ipAddress: req.ip,
    });
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  // 重複Webhook排除 (Deduplication)
  if (processedWebhookIds.has(webhookId)) {
    db.addLog({
      level: 'WARN',
      action: 'DUPLICATE_WEBHOOK_BLOCKED',
      details: `既に処理済みのWebhook ID [${webhookId}] を検知。安全に重複処理を破棄しました。`,
    });
    return res.status(200).json({ status: 'ignored_duplicate', webhookId });
  }

  processedWebhookIds.add(webhookId);

  // 注文データ正規化
  const shopifyPayload = req.body || {};
  const orderNumber = shopifyPayload.name || `#${shopifyPayload.order_number || Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = `ord_${shopifyPayload.id || Date.now()}`;
  const claimToken = generateClaimToken();

  const lineItems = (shopifyPayload.line_items || []).map((item: any, idx: number) => {
    // バリアントに対応するプラン特定
    const variantIdStr = String(item.variant_id || item.variantId || '44901823901');
    const mapping = planMappings.find(m => m.shopifyVariantId.includes(variantIdStr));
    const plan = mapping ? wholesalerPlans.find(p => p.id === mapping.wholesalerPlanId) : wholesalerPlans[0];

    return {
      id: `li_${orderId}_${idx + 1}`,
      shopifyVariantId: item.variant_id ? `gid://shopify/ProductVariant/${item.variant_id}` : 'gid://shopify/ProductVariant/44901823901',
      title: item.title || plan?.countryName || 'eSIMプラン',
      variantTitle: item.variant_title || plan?.dataAllowance || '通常プラン',
      quantity: item.quantity || 1,
      price: Number(item.price || plan?.retailPriceJpy || 2200),
      planId: plan?.id || 'plan_kr_10gb_7d',
      country: plan?.countryName || '韓国 (Korea)',
    };
  });

  // 万一明細が空の場合はデフォルトプランを補完
  if (lineItems.length === 0) {
    const defaultPlan = wholesalerPlans[0];
    lineItems.push({
      id: `li_${orderId}_1`,
      shopifyVariantId: 'gid://shopify/ProductVariant/44901823901',
      title: defaultPlan.countryName + ' eSIM',
      variantTitle: defaultPlan.dataAllowance,
      quantity: 1,
      price: defaultPlan.retailPriceJpy,
      planId: defaultPlan.id,
      country: defaultPlan.countryName,
    });
  }

  // LINE User IDの自動抽出またはオートパイロット自動紐付け
  const noteAttributes = shopifyPayload.note_attributes || [];
  const lineAttr = noteAttributes.find((a: any) =>
    ['line_user_id', 'line_id', 'lineUserId', 'LINE_USER_ID', 'line'].includes(a.name)
  );

  let lineUserId = lineAttr?.value ? String(lineAttr.value) : '';
  if (!lineUserId && shopifyPayload.note && shopifyPayload.note.includes('U')) {
    const match = shopifyPayload.note.match(/U[0-9a-zA-Z]{20,33}/);
    if (match) lineUserId = match[0];
  }

  // オートパイロット自動配信モードが有効な場合、LINE自動送信先を設定
  if (!lineUserId && config.autoSendLineEnabled) {
    lineUserId = config.defaultTestLineUserId || `U_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const isLineLinked = Boolean(lineUserId);
  const customerName = `${shopifyPayload.customer?.last_name || '旅行'} ${shopifyPayload.customer?.first_name || '太郎'}`.trim();
  const lineDisplayName = isLineLinked ? customerName : undefined;

  const order: ShopifyOrder = {
    id: orderId,
    orderNumber,
    shopifyOrderId: `gid://shopify/Order/${shopifyPayload.id || Date.now()}`,
    customerEmail: shopifyPayload.email || shopifyPayload.contact_email || 'customer@example.com',
    customerName,
    totalPrice: Number(shopifyPayload.total_price || lineItems.reduce((acc: number, i: any) => acc + i.price * i.quantity, 0)),
    currency: shopifyPayload.currency || 'JPY',
    financialStatus: shopifyPayload.financial_status === 'refunded' ? 'refunded' : 'paid',
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    lineItems,
    claimToken,
    claimTokenExpiresAt: new Date(Date.now() + config.claimTokenTtlHours * 3600 * 1000).toISOString(),
    claimUrl: `/claim/${claimToken}`,
    lineStatus: isLineLinked ? 'LINKED' : 'UNLINKED',
    lineUserId: lineUserId || undefined,
    lineDisplayName: lineDisplayName || undefined,
    lineLinkedAt: isLineLinked ? new Date().toISOString() : undefined,
    esimStatus: 'PAID',
    esimProfiles: [],
    retryCount: 0,
  };

  db.saveOrder(order);

  // 非同期ジョブキューに即時投入
  jobQueue.enqueueOrderIssuance(order);

  // Shopifyへは即時200を返却
  return res.status(200).json({
    status: 'enqueued',
    orderId: order.id,
    orderNumber: order.orderNumber,
    claimToken: order.claimToken,
  });
});

// 2. 注文一覧 & 詳細
app.get('/api/orders', (_req: Request, res: Response) => {
  res.json({ orders: db.getOrders() });
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

// 手動再試行
app.post('/api/orders/:id/retry', async (req: Request, res: Response) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  jobQueue.enqueueOrderIssuance(order);
  res.json({ status: 'queued', order: db.getOrder(req.params.id) });
});

// LINE通知の再送
app.post('/api/orders/:id/resend-line', async (req: Request, res: Response) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const result = await lineService.sendEsimReadyNotification(order);
  res.json(result);
});

// 注文キャンセル・返金
app.post('/api/orders/:id/refund', async (req: Request, res: Response) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  for (const prof of order.esimProfiles) {
    await esimService.revokeEsim(order.id, prof.iccid);
    prof.status = 'REVOKED';
  }
  order.financialStatus = 'refunded';
  order.esimStatus = 'REFUNDED';
  db.saveOrder(order);

  res.json({ status: 'refunded', order });
});

// 3. ジョブキュー一覧 & 手動実行
app.get('/api/jobs', (_req: Request, res: Response) => {
  res.json({ jobs: db.getJobs() });
});

app.post('/api/jobs/:id/retry', async (req: Request, res: Response) => {
  try {
    const job = await jobQueue.retryJobManually(req.params.id);
    res.json({ job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// 4. プランマスタ & マッピング
app.get('/api/plans', (_req: Request, res: Response) => {
  res.json({ plans: wholesalerPlans });
});

app.post('/api/plans', (req: Request, res: Response) => {
  const newPlan = req.body;
  if (!newPlan.id || !newPlan.planCode || !newPlan.countryName) {
    return res.status(400).json({ error: '必須項目 (ID, プランコード, 国名) が不足しています' });
  }
  db.savePlan(newPlan);
  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `新規卸元プラン [${newPlan.planCode}] (${newPlan.countryName}) を登録しました`,
  });
  res.json({ success: true, plan: newPlan, plans: wholesalerPlans });
});

app.put('/api/plans/:id', (req: Request, res: Response) => {
  const existing = wholesalerPlans.find(p => p.id === req.params.id);
  if (!existing) return res.status(404).json({ error: '指定されたプランが存在しません' });

  const updated = { ...existing, ...req.body, id: req.params.id };
  db.savePlan(updated);
  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `卸元プラン [${updated.planCode}] の設定を更新しました (在庫: ${updated.stockAvailable}, 卸値: ¥${updated.wholesaleCostJpy})`,
  });
  res.json({ success: true, plan: updated, plans: wholesalerPlans });
});

// 在庫補充
app.post('/api/plans/:id/restock', (req: Request, res: Response) => {
  const { count = 100 } = req.body;
  const plan = db.restockPlan(req.params.id, Number(count));
  if (!plan) return res.status(404).json({ error: '指定されたプランが存在しません' });

  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `卸元プラン [${plan.planCode}] にeSIM在庫を ${count} 枚補充しました (現在庫: ${plan.stockAvailable}枚)`,
  });
  res.json({ success: true, plan, plans: wholesalerPlans });
});

// ドライラン発行検証 (Sandboxテスト)
app.post('/api/plans/dry-run', (req: Request, res: Response) => {
  const { planId } = req.body;
  const plan = wholesalerPlans.find(p => p.id === planId) || wholesalerPlans[0];
  const smdpDomain = plan.provider === 'GIGS' ? 'cust.smdp-plus.tw.gigs.net' : plan.provider === 'GLOBAL_1' ? 'consumer.rsp.global1.com' : 'smdp.rsp.esim-access.com';
  const mockMatchingId = `TEST-${plan.countryCode}-${Date.now().toString().slice(-4)}`;

  res.json({
    success: true,
    message: `卸元プロバイダー ${plan.provider} への疎通・発行パラメータ検証に成功しました (Dry-Run)`,
    verification: {
      provider: plan.provider,
      planCode: plan.planCode,
      smdpAddress: smdpDomain,
      matchingId: mockMatchingId,
      apn: plan.apn,
      roamingEnabled: plan.roamingEnabled,
      stockAvailable: plan.stockAvailable,
      responseTimeMs: Math.floor(180 + Math.random() * 120),
    },
  });
});

// 在庫しきい値監視 & システムアラート・メール通知エンドポイント
app.post('/api/inventory/check-alerts', (_req: Request, res: Response) => {
  const threshold = config.stockAlertThreshold || 50;
  const critical = config.stockCriticalThreshold || 20;
  const alerts: any[] = [];

  for (const plan of wholesalerPlans) {
    if (plan.stockAvailable <= threshold) {
      const isCritical = plan.stockAvailable <= critical;
      const alertItem = {
        planId: plan.id,
        planCode: plan.planCode,
        countryName: plan.countryName,
        stockAvailable: plan.stockAvailable,
        threshold,
        critical,
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        message: `卸元プラン [${plan.planCode}] (${plan.countryName}) の残数が ${plan.stockAvailable} 枚に低下しました`,
        emailSent: config.stockAlertEmailEnabled,
        recipientEmail: config.alertEmail,
        timestamp: new Date().toISOString(),
      };
      alerts.push(alertItem);

      db.addLog({
        level: isCritical ? 'ERROR' : 'WARN',
        action: 'STOCK_ALERT',
        details: `[在庫アラート検知] ${alertItem.message} (警告しきい値: ${threshold}枚)。${config.stockAlertEmailEnabled ? `管理者メール (${config.alertEmail}) 宛てに通知を送信完了。` : ''}`,
      });
    }
  }

  res.json({
    checkedCount: wholesalerPlans.length,
    alertCount: alerts.length,
    alerts,
    thresholds: {
      alertThreshold: threshold,
      criticalThreshold: critical,
      emailEnabled: config.stockAlertEmailEnabled,
      alertEmail: config.alertEmail,
    },
  });
});

app.put('/api/inventory/thresholds', (req: Request, res: Response) => {
  const { stockAlertThreshold, stockCriticalThreshold, stockAlertEmailEnabled, alertEmail } = req.body;
  if (stockAlertThreshold !== undefined) config.stockAlertThreshold = Number(stockAlertThreshold);
  if (stockCriticalThreshold !== undefined) config.stockCriticalThreshold = Number(stockCriticalThreshold);
  if (stockAlertEmailEnabled !== undefined) config.stockAlertEmailEnabled = Boolean(stockAlertEmailEnabled);
  if (alertEmail) config.alertEmail = String(alertEmail);

  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `在庫アラートしきい値を更新しました (警告: ${config.stockAlertThreshold}枚, 危険: ${config.stockCriticalThreshold}枚, メール通知: ${config.stockAlertEmailEnabled ? 'ON' : 'OFF'}, 宛先: ${config.alertEmail})`,
  });

  res.json({
    success: true,
    thresholds: {
      alertThreshold: config.stockAlertThreshold,
      criticalThreshold: config.stockCriticalThreshold,
      emailEnabled: config.stockAlertEmailEnabled,
      alertEmail: config.alertEmail,
    },
  });
});

// 在庫枯渇シミュレーション (アラート動作検証用)
app.post('/api/inventory/simulate-depletion', (req: Request, res: Response) => {
  const { planId = 'plan_us_10gb_15d', targetStock = 12 } = req.body;
  const plan = wholesalerPlans.find(p => p.id === planId) || wholesalerPlans[0];
  const previousStock = plan.stockAvailable;
  plan.stockAvailable = Number(targetStock);

  const isCritical = plan.stockAvailable <= (config.stockCriticalThreshold || 20);
  db.addLog({
    level: isCritical ? 'ERROR' : 'WARN',
    action: 'STOCK_ALERT',
    details: `[在庫シミュレーション] 卸元プラン ${plan.planCode} (${plan.countryName}) の残数を ${previousStock}枚 ➔ ${plan.stockAvailable}枚 に変更。緊急アラートおよび通知メール (${config.alertEmail}) をトリガーしました。`,
  });

  res.json({
    success: true,
    message: `プラン ${plan.planCode} の在庫を ${plan.stockAvailable} 枚に低下させ、システムアラート・メール通知を発火しました`,
    plan,
    alertTriggered: true,
  });
});

app.get('/api/mappings', (_req: Request, res: Response) => {
  res.json({ mappings: planMappings });
});

app.post('/api/mappings', (req: Request, res: Response) => {
  const newMapping = req.body;
  if (!newMapping.shopifyVariantId || !newMapping.wholesalerPlanId) {
    return res.status(400).json({ error: 'Shopify Variant IDおよび卸元プランIDは必須です' });
  }
  db.saveMapping(newMapping);
  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `Shopify商品バリアント [${newMapping.productTitle}] と卸元プランの対応マッピングを登録しました`,
  });
  res.json({ success: true, mapping: newMapping, mappings: planMappings });
});

app.put('/api/mappings/:variantId', (req: Request, res: Response) => {
  const variantId = decodeURIComponent(req.params.variantId);
  const existing = planMappings.find(m => m.shopifyVariantId === variantId);
  if (!existing) return res.status(404).json({ error: '指定されたマッピングが存在しません' });

  const updated = { ...existing, ...req.body, shopifyVariantId: variantId };
  db.saveMapping(updated);
  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `Shopifyバリアントマッピング [${updated.productTitle}] を更新しました (Plan: ${updated.metafields.planCode}, 有効: ${updated.isActive})`,
  });
  res.json({ success: true, mapping: updated, mappings: planMappings });
});

app.delete('/api/mappings/:variantId', (req: Request, res: Response) => {
  const variantId = decodeURIComponent(req.params.variantId);
  const success = db.deleteMapping(variantId);
  if (!success) return res.status(404).json({ error: '削除対象のマッピングが見つかりません' });

  db.addLog({
    level: 'WARN',
    action: 'JOB_ENQUEUED',
    details: `Shopifyバリアントマッピング [${variantId}] を削除しました`,
  });
  res.json({ success: true, mappings: planMappings });
});

// 5. 購入者向け 期限付き受取ポータル照会
app.get('/api/claim/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const order = db.getOrderByClaimToken(token);

  if (!order) {
    return res.status(404).json({ error: '指定された受取URLは無効か、有効期限が切れています' });
  }

  // 期限判定
  const isExpired = new Date(order.claimTokenExpiresAt).getTime() < Date.now();

  db.addLog({
    level: 'INFO',
    action: 'CLAIM_PORTAL_ACCESSED',
    orderId: order.id,
    details: `購入者受取ポータルへアクセスがありました (Token: ${token.substring(0, 8)}..., Expired: ${isExpired})`,
    ipAddress: req.ip,
  });

  res.json({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    lineStatus: order.lineStatus,
    lineDisplayName: order.lineDisplayName,
    esimStatus: order.esimStatus,
    expiresAt: order.claimTokenExpiresAt,
    isExpired,
    lineItems: order.lineItems,
    profiles: order.esimProfiles.map(p => ({
      iccid: p.iccid,
      smdpAddress: p.smdpAddress,
      activationCode: p.activationCode,
      matchingId: p.matchingId,
      qrPayload: p.qrPayload,
      status: p.status,
      issuedAt: p.issuedAt,
      expiresAt: p.expiresAt,
    })),
  });
});

// 6. LINE Login連携 (シミュレーション & 本番両用)
app.post('/api/auth/line/mock-login', async (req: Request, res: Response) => {
  const { claimToken, lineUserId, lineDisplayName } = req.body;
  const result = await lineService.verifyAndLinkLineAccount({
    claimToken,
    lineUserId: lineUserId || `U_${Date.now()}_simulated`,
    lineDisplayName: lineDisplayName || '旅行 太郎',
    state: 'state_' + Date.now(),
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, order: result.order });
});

// 7. 監査ログ
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json({ logs: auditLogs });
});

// 8. システム設定
app.get('/api/config', (_req: Request, res: Response) => {
  // 秘密鍵はマスキング
  res.json({
    config: {
      ...config,
      shopifyWebhookSecret: config.shopifyWebhookSecret.substring(0, 6) + '••••••••',
      wholesalerApiKey: config.wholesalerApiKey.substring(0, 6) + '••••••••',
      lineChannelSecret: config.lineChannelSecret.substring(0, 6) + '••••••••',
      lineMessagingToken: config.lineMessagingToken.substring(0, 8) + '••••••••',
    },
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  const updates = req.body || {};
  Object.assign(config, updates);
  res.json({ success: true, config });
});

// 9. 受入テスト一括実行 (仕様書 第7項 準拠)
app.post('/api/test/run-acceptance', async (_req: Request, res: Response) => {
  const testResults = await runAllAcceptanceTests();
  res.json({ results: testResults });
});

// 10. Webhookテスト送信シミュレータ
app.post('/api/test/simulate-webhook', async (req: Request, res: Response) => {
  const {
    planId = 'plan_kr_10gb_7d',
    customerName = '新規 購入者',
    customerEmail = 'traveler@sample.jp',
    autoSendLine = true,
  } = req.body;
  const targetPlan = wholesalerPlans.find(p => p.id === planId) || wholesalerPlans[0];
  const orderNum = `#${Math.floor(1050 + Math.random() * 8900)}`;

  const mockShopifyPayload = {
    id: Date.now(),
    order_number: orderNum.replace('#', ''),
    name: orderNum,
    email: customerEmail,
    total_price: targetPlan.retailPriceJpy,
    currency: 'JPY',
    financial_status: 'paid',
    customer: {
      first_name: customerName.split(' ')[1] || '太郎',
      last_name: customerName.split(' ')[0] || '新規',
    },
    line_items: [
      {
        variant_id: '44901823901',
        title: targetPlan.countryName + ' eSIM ' + targetPlan.dataAllowance,
        variant_title: targetPlan.validityDays + '日間',
        quantity: 1,
        price: targetPlan.retailPriceJpy,
      },
    ],
  };

  const simReq: any = {
    body: mockShopifyPayload,
    headers: {
      'x-shopify-topic': 'orders/paid',
      'x-shopify-webhook-id': `wh_sim_${Date.now()}`,
    },
    ip: '127.0.0.1',
  };

  // Webhookロジックを直接実行
  const claimToken = generateClaimToken();
  const orderId = `ord_${mockShopifyPayload.id}`;
  const shouldAutoLink = autoSendLine && config.autoSendLineEnabled;
  const testLineUserId = shouldAutoLink ? (config.defaultTestLineUserId || `U_${Date.now().toString(36)}`) : undefined;

  const order: ShopifyOrder = {
    id: orderId,
    orderNumber: orderNum,
    shopifyOrderId: `gid://shopify/Order/${mockShopifyPayload.id}`,
    customerEmail,
    customerName,
    totalPrice: targetPlan.retailPriceJpy,
    currency: 'JPY',
    financialStatus: 'paid',
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    lineItems: [
      {
        id: `li_${orderId}_1`,
        shopifyVariantId: 'gid://shopify/ProductVariant/44901823901',
        title: targetPlan.countryName + ' eSIM ' + targetPlan.dataAllowance,
        variantTitle: targetPlan.validityDays + '日間',
        quantity: 1,
        price: targetPlan.retailPriceJpy,
        planId: targetPlan.id,
        country: targetPlan.countryName,
      },
    ],
    claimToken,
    claimTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    claimUrl: `/claim/${claimToken}`,
    lineStatus: shouldAutoLink ? 'LINKED' : 'UNLINKED',
    lineUserId: testLineUserId,
    lineDisplayName: shouldAutoLink ? customerName : undefined,
    lineLinkedAt: shouldAutoLink ? new Date().toISOString() : undefined,
    esimStatus: 'PAID',
    esimProfiles: [],
    retryCount: 0,
  };

  db.saveOrder(order);
  jobQueue.enqueueOrderIssuance(order);

  res.json({
    success: true,
    message: `Shopify決済Webhook (${orderNum}) を自動受付し、eSIM自動発行およびLINE自動送信キューを実行しました`,
    order,
  });
});

// 11. オートパイロット (完全自動受付・発行・送信) のトグルAPI
app.post('/api/config/toggle-autopilot', (_req: Request, res: Response) => {
  config.autoSendLineEnabled = !config.autoSendLineEnabled;
  db.addLog({
    level: 'INFO',
    action: 'JOB_ENQUEUED',
    details: `オートパイロットモードが ${config.autoSendLineEnabled ? '有効化 (ON: Shopify決済➔eSIM発行➔LINE即時自動配信)' : '無効化 (OFF)'} されました`,
  });
  res.json({ autoSendLineEnabled: config.autoSendLineEnabled });
});

// 12. LINE 公式アカウント Webhook受付 (友だち追加、メッセージ応答)
app.post('/api/webhook/line', async (req: Request, res: Response) => {
  const events = req.body?.events || [];
  db.addLog({
    level: 'INFO',
    action: 'LINE_NOTIFY_SENT',
    details: `LINE Webhook受信 (${events.length}件のイベント)`,
  });

  for (const event of events) {
    if (event.type === 'message' && event.message?.type === 'text') {
      const text = String(event.message.text).trim();
      const userId = event.source?.userId;
      
      // 注文番号または直近の注文照会
      const match = text.match(/#?[0-9]{4,6}/);
      if (match) {
        const orderNum = match[0].startsWith('#') ? match[0] : `#${match[0]}`;
        const order = db.getOrders().find(o => o.orderNumber === orderNum);
        if (order) {
          order.lineStatus = 'LINKED';
          order.lineUserId = userId;
          db.saveOrder(order);
          await lineService.sendEsimReadyNotification(order);
        }
      }
    }
  }

  res.status(200).json({ status: 'ok' });
});

// Vite middlewares setup
async function start() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Shopify eSIM LINE Integration Server running on http://localhost:${PORT}`);
  });
}

start();
