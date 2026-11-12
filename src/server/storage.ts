import {
  ShopifyOrder,
  WholesalerPlan,
  PlanMapping,
  IssuanceJob,
  AuditLog,
  SystemConfig,
  EsimProfile,
} from '../types/index.ts';
import { generateClaimToken, generateIdempotencyKey, generateLpaPayload } from './crypto.ts';

// システム設定
export const config: SystemConfig = {
  shopifyStoreUrl: 'https://shop-esim-travel.myshopify.com',
  shopifyWebhookSecret: 'shpss_sec_99a8b7c6d5e4f3a2b1c0987654321fed',
  wholesalerApiEndpoint: 'https://api.esim-wholesaler.net/v2',
  wholesalerApiKey: 'wh_live_key_99f8d1c7e2b34a5',
  lineChannelId: '2006789123',
  lineChannelSecret: 'c819a77ef092143892ab1847120fe81a',
  lineMessagingToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  claimTokenTtlHours: 720, // 30 days
  maxJobRetries: 3,
  alertEmail: 'm.shirakawa1204@gmail.com',
  autoIssueEnabled: true,
  autoSendLineEnabled: true,
  defaultTestLineUserId: 'U91a82fbc7819230182741abce9201',
  stockAlertThreshold: 50,
  stockCriticalThreshold: 20,
  stockAlertEmailEnabled: true,
};

// 卸元プランマスタ
export const wholesalerPlans: WholesalerPlan[] = [
  {
    id: 'plan_kr_10gb_7d',
    planCode: 'KR-SKT-10GB-07D',
    provider: 'eSIM_GO',
    countryCode: 'KR',
    countryName: '韓国 (Korea)',
    dataAllowance: '10GB 高速通信',
    validityDays: 7,
    wholesaleCostJpy: 980,
    retailPriceJpy: 2200,
    apn: 'globaldata',
    roamingEnabled: true,
    supportedNetworks: ['SK Telecom', 'KT'],
    stockAvailable: 450,
  },
  {
    id: 'plan_tw_unlim_5d',
    planCode: 'TW-CHT-UNLIM-05D',
    provider: 'GIGS',
    countryCode: 'TW',
    countryName: '台湾 (Taiwan)',
    dataAllowance: '完全無制限 (Unlimited)',
    validityDays: 5,
    wholesaleCostJpy: 1200,
    retailPriceJpy: 2680,
    apn: 'internet',
    roamingEnabled: false,
    supportedNetworks: ['Chunghwa Telecom', 'Taiwan Mobile'],
    stockAvailable: 230,
  },
  {
    id: 'plan_eu_5gb_30d',
    planCode: 'EU33-MULTI-05GB-30D',
    provider: 'GLOBAL_1',
    countryCode: 'EU',
    countryName: 'ヨーロッパ周遊 (33カ国)',
    dataAllowance: '5GB (周遊対応)',
    validityDays: 30,
    wholesaleCostJpy: 1450,
    retailPriceJpy: 3400,
    apn: 'mobile.three.co.uk',
    roamingEnabled: true,
    supportedNetworks: ['Vodafone', 'Orange', 'Telefonica'],
    stockAvailable: 180,
  },
  {
    id: 'plan_us_10gb_15d',
    planCode: 'US-TMO-10GB-15D',
    provider: 'TELNA',
    countryCode: 'US',
    countryName: 'アメリカ本土・ハワイ (USA)',
    dataAllowance: '10GB (5G対応)',
    validityDays: 15,
    wholesaleCostJpy: 1600,
    retailPriceJpy: 3800,
    apn: 'fast.t-mobile.com',
    roamingEnabled: false,
    supportedNetworks: ['T-Mobile', 'AT&T'],
    stockAvailable: 85,
  },
  {
    id: 'plan_jp_20gb_30d',
    planCode: 'JP-DOC-20GB-30D',
    provider: 'eSIM_GO',
    countryCode: 'JP',
    countryName: '日本国内 (Japan)',
    dataAllowance: '20GB (4G/5G)',
    validityDays: 30,
    wholesaleCostJpy: 1900,
    retailPriceJpy: 4200,
    apn: 'vsim.jp',
    roamingEnabled: false,
    supportedNetworks: ['NTT Docomo', 'SoftBank'],
    stockAvailable: 500,
  },
];

// Shopify商品バリアントマッピング
export const planMappings: PlanMapping[] = [
  {
    shopifyVariantId: 'gid://shopify/ProductVariant/44901823901',
    shopifyProductId: 'gid://shopify/Product/8821938210',
    productTitle: '韓国旅行 eSIM 10GB 7日間 (SK Telecom回線)',
    variantTitle: '7日間 / 10GB',
    wholesalerPlanId: 'plan_kr_10gb_7d',
    isActive: true,
    metafields: {
      planCode: 'KR-SKT-10GB-07D',
      country: 'KR',
      capacity: '10GB',
      duration: '7days',
      provider: 'eSIM_GO',
    },
  },
  {
    shopifyVariantId: 'gid://shopify/ProductVariant/44901823902',
    shopifyProductId: 'gid://shopify/Product/8821938211',
    productTitle: '台湾 データ無制限 eSIM 5日間 (中華電信)',
    variantTitle: '5日間 / データ使い放題',
    wholesalerPlanId: 'plan_tw_unlim_5d',
    isActive: true,
    metafields: {
      planCode: 'TW-CHT-UNLIM-05D',
      country: 'TW',
      capacity: 'Unlimited',
      duration: '5days',
      provider: 'GIGS',
    },
  },
  {
    shopifyVariantId: 'gid://shopify/ProductVariant/44901823903',
    shopifyProductId: 'gid://shopify/Product/8821938212',
    productTitle: 'ヨーロッパ周遊 33カ国 eSIM 5GB 30日間',
    variantTitle: '30日間 / 5GB',
    wholesalerPlanId: 'plan_eu_5gb_30d',
    isActive: true,
    metafields: {
      planCode: 'EU33-MULTI-05GB-30D',
      country: 'EU',
      capacity: '5GB',
      duration: '30days',
      provider: 'GLOBAL_1',
    },
  },
  {
    shopifyVariantId: 'gid://shopify/ProductVariant/44901823904',
    shopifyProductId: 'gid://shopify/Product/8821938213',
    productTitle: 'アメリカ・ハワイ eSIM 10GB 15日間',
    variantTitle: '15日間 / 10GB (5G)',
    wholesalerPlanId: 'plan_us_10gb_15d',
    isActive: true,
    metafields: {
      planCode: 'US-TMO-10GB-15D',
      country: 'US',
      capacity: '10GB',
      duration: '15days',
      provider: 'TELNA',
    },
  },
];

// 初期注文データ
const initialOrders: ShopifyOrder[] = [
  {
    id: 'ord_1042',
    orderNumber: '#1042',
    shopifyOrderId: 'gid://shopify/Order/552918239101',
    customerEmail: 'yamada.taro@example.com',
    customerName: '山田 太郎',
    totalPrice: 2200,
    currency: 'JPY',
    financialStatus: 'paid',
    createdAt: '2026-11-12T09:15:20+09:00',
    paidAt: '2026-11-12T09:15:22+09:00',
    lineItems: [
      {
        id: 'li_1042_1',
        shopifyVariantId: 'gid://shopify/ProductVariant/44901823901',
        title: '韓国旅行 eSIM 10GB 7日間 (SK Telecom回線)',
        variantTitle: '7日間 / 10GB',
        quantity: 1,
        price: 2200,
        planId: 'plan_kr_10gb_7d',
        country: '韓国 (Korea)',
      },
    ],
    claimToken: 'clm_kr_taro_998124_abc',
    claimTokenExpiresAt: '2026-12-12T09:15:20+09:00',
    claimUrl: '/claim/clm_kr_taro_998124_abc',
    lineStatus: 'LINKED',
    lineUserId: 'U91a82fbc7819230182741abce9201',
    lineDisplayName: 'Taro Y.',
    lineLinkedAt: '2026-11-12T09:16:04+09:00',
    esimStatus: 'CLAIMED',
    esimProfiles: [
      {
        id: 'esim_prof_1042_1',
        orderId: 'ord_1042',
        lineItemId: 'li_1042_1',
        idempotencyKey: generateIdempotencyKey('ord_1042', 'li_1042_1'),
        iccid: '89820400291823910421',
        smdpAddress: 'smdp.rsp.esim-access.com',
        activationCode: 'B4-991A-KR-0042',
        matchingId: 'MATCH-KR-1042-99812',
        qrPayload: generateLpaPayload('smdp.rsp.esim-access.com', 'MATCH-KR-1042-99812'),
        status: 'ACTIVE',
        issuedAt: '2026-11-12T09:15:24+09:00',
        activatedAt: '2026-11-12T09:17:10+09:00',
        expiresAt: '2026-11-19T23:59:59+09:00',
        wholesalerReference: 'WH-REQ-KR-9981204',
      },
    ],
    retryCount: 0,
  },
  {
    id: 'ord_1043',
    orderNumber: '#1043',
    shopifyOrderId: 'gid://shopify/Order/552918239102',
    customerEmail: 'sato.hanako@example.com',
    customerName: '佐藤 花子',
    totalPrice: 2680,
    currency: 'JPY',
    financialStatus: 'paid',
    createdAt: '2026-11-12T10:02:11+09:00',
    paidAt: '2026-11-12T10:02:14+09:00',
    lineItems: [
      {
        id: 'li_1043_1',
        shopifyVariantId: 'gid://shopify/ProductVariant/44901823902',
        title: '台湾 データ無制限 eSIM 5日間 (中華電信)',
        variantTitle: '5日間 / データ使い放題',
        quantity: 1,
        price: 2680,
        planId: 'plan_tw_unlim_5d',
        country: '台湾 (Taiwan)',
      },
    ],
    claimToken: 'clm_tw_hanako_551920_def',
    claimTokenExpiresAt: '2026-12-12T10:02:11+09:00',
    claimUrl: '/claim/clm_tw_hanako_551920_def',
    lineStatus: 'LINKED',
    lineUserId: 'U44b19cba882910398471bcee8192',
    lineDisplayName: 'hanako_travel',
    lineLinkedAt: '2026-11-12T10:03:02+09:00',
    esimStatus: 'ISSUED',
    esimProfiles: [
      {
        id: 'esim_prof_1043_1',
        orderId: 'ord_1043',
        lineItemId: 'li_1043_1',
        idempotencyKey: generateIdempotencyKey('ord_1043', 'li_1043_1'),
        iccid: '89886000192837190432',
        smdpAddress: 'cust.smdp-plus.tw.gigs.net',
        activationCode: 'GIGS-TW-8821-043',
        matchingId: 'MATCH-TW-1043-44109',
        qrPayload: generateLpaPayload('cust.smdp-plus.tw.gigs.net', 'MATCH-TW-1043-44109'),
        status: 'PENDING',
        issuedAt: '2026-11-12T10:02:16+09:00',
        expiresAt: '2026-11-17T23:59:59+09:00',
        wholesalerReference: 'WH-GIGS-TW-441091',
      },
    ],
    retryCount: 0,
  },
  {
    id: 'ord_1044',
    orderNumber: '#1044',
    shopifyOrderId: 'gid://shopify/Order/552918239103',
    customerEmail: 'suzuki.kenji@example.com',
    customerName: '鈴木 健二',
    totalPrice: 3400,
    currency: 'JPY',
    financialStatus: 'paid',
    createdAt: '2026-11-12T11:20:00+09:00',
    paidAt: '2026-11-12T11:20:03+09:00',
    lineItems: [
      {
        id: 'li_1044_1',
        shopifyVariantId: 'gid://shopify/ProductVariant/44901823903',
        title: 'ヨーロッパ周遊 33カ国 eSIM 5GB 30日間',
        variantTitle: '30日間 / 5GB',
        quantity: 1,
        price: 3400,
        planId: 'plan_eu_5gb_30d',
        country: 'ヨーロッパ周遊 (33カ国)',
      },
    ],
    claimToken: 'clm_eu_kenji_771829_ghi',
    claimTokenExpiresAt: '2026-12-12T11:20:00+09:00',
    claimUrl: '/claim/clm_eu_kenji_771829_ghi',
    lineStatus: 'UNLINKED', // 未連携 (メール配信案内フォールバック)
    esimStatus: 'ISSUED',
    esimProfiles: [
      {
        id: 'esim_prof_1044_1',
        orderId: 'ord_1044',
        lineItemId: 'li_1044_1',
        idempotencyKey: generateIdempotencyKey('ord_1044', 'li_1044_1'),
        iccid: '89441100392817290443',
        smdpAddress: 'consumer.rsp.global1.com',
        activationCode: 'GL1-EU33-044-88',
        matchingId: 'MATCH-EU-1044-33011',
        qrPayload: generateLpaPayload('consumer.rsp.global1.com', 'MATCH-EU-1044-33011'),
        status: 'PENDING',
        issuedAt: '2026-11-12T11:20:06+09:00',
        expiresAt: '2026-12-12T23:59:59+09:00',
        wholesalerReference: 'WH-GL1-EU-330119',
      },
    ],
    retryCount: 0,
  },
  {
    id: 'ord_1045',
    orderNumber: '#1045',
    shopifyOrderId: 'gid://shopify/Order/552918239104',
    customerEmail: 'nakamura.daisuke@example.com',
    customerName: '中村 大介',
    totalPrice: 3800,
    currency: 'JPY',
    financialStatus: 'paid',
    createdAt: '2026-11-12T12:10:45+09:00',
    paidAt: '2026-11-12T12:10:47+09:00',
    lineItems: [
      {
        id: 'li_1045_1',
        shopifyVariantId: 'gid://shopify/ProductVariant/44901823904',
        title: 'アメリカ・ハワイ eSIM 10GB 15日間',
        variantTitle: '15日間 / 10GB (5G)',
        quantity: 1,
        price: 3800,
        planId: 'plan_us_10gb_15d',
        country: 'アメリカ本土・ハワイ (USA)',
      },
    ],
    claimToken: 'clm_us_daisuke_110948_jkl',
    claimTokenExpiresAt: '2026-12-12T12:10:45+09:00',
    claimUrl: '/claim/clm_us_daisuke_110948_jkl',
    lineStatus: 'LINKED',
    lineUserId: 'U99cc8877665544332211aabbccddee',
    lineDisplayName: 'Daisuke N.',
    esimStatus: 'PROCESSING', // 卸元API再試行待機中 (指数バックオフ中)
    esimProfiles: [],
    retryCount: 1,
    lastError: 'Wholesaler TELNA upstream response timeout (504 Gateway Timeout). Retry #1 scheduled.',
  },
];

// 初期ジョブキュー
const initialJobs: IssuanceJob[] = [
  {
    id: 'job_001045_retry',
    jobType: 'ESIM_ISSUE',
    orderId: 'ord_1045',
    lineItemId: 'li_1045_1',
    idempotencyKey: generateIdempotencyKey('ord_1045', 'li_1045_1'),
    status: 'RETRYING',
    attempts: 1,
    maxAttempts: 3,
    nextAttemptAt: '2026-11-12T12:13:47+09:00',
    createdAt: '2026-11-12T12:10:48+09:00',
    updatedAt: '2026-11-12T12:11:02+09:00',
    errorLog: 'Wholesaler TELNA connection timeout (10000ms exceeded). Exponential backoff scheduled.',
    payload: {
      planId: 'plan_us_10gb_15d',
      planCode: 'US-TMO-10GB-15D',
      customerEmail: 'nakamura.daisuke@example.com',
    },
  },
];

// 処理済みWebhook ID（重複排除用）
export const processedWebhookIds = new Set<string>([
  'wh_ev_shopify_1042_initial',
  'wh_ev_shopify_1043_initial',
  'wh_ev_shopify_1044_initial',
  'wh_ev_shopify_1045_initial',
]);

// 処理済みIdempotency Keys（二重発行防止用）
export const issuedIdempotencyKeys = new Map<string, EsimProfile>();
initialOrders.forEach(o => {
  o.esimProfiles.forEach(p => {
    issuedIdempotencyKeys.set(p.idempotencyKey, p);
  });
});

// 初期監査ログ
export const auditLogs: AuditLog[] = [
  {
    id: 'log_001',
    timestamp: '2026-11-12T09:15:21+09:00',
    level: 'INFO',
    action: 'WEBHOOK_RECEIVED',
    orderId: 'ord_1042',
    details: 'Shopify order/paid Webhook受信 (ID: wh_ev_shopify_1042_initial, Order: #1042)',
    ipAddress: '23.227.38.64',
  },
  {
    id: 'log_002',
    timestamp: '2026-11-12T09:15:22+09:00',
    level: 'INFO',
    action: 'HMAC_VERIFIED',
    orderId: 'ord_1042',
    details: 'HMAC-SHA256署名検証に成功。キューへ発行ジョブを非同期投入',
  },
  {
    id: 'log_003',
    timestamp: '2026-11-12T09:15:23+09:00',
    level: 'INFO',
    action: 'ESIM_API_REQUEST',
    orderId: 'ord_1042',
    details: '卸元eSIM Goへ発行要求送信 (Idempotency: 7a8f...9104, Plan: KR-SKT-10GB-07D)',
  },
  {
    id: 'log_004',
    timestamp: '2026-11-12T09:15:24+09:00',
    level: 'INFO',
    action: 'ESIM_API_SUCCESS',
    orderId: 'ord_1042',
    details: 'eSIM即時発行完了 (ICCID: 89820400291823910421, Ref: WH-REQ-KR-9981204)',
  },
  {
    id: 'log_005',
    timestamp: '2026-11-12T09:16:04+09:00',
    level: 'INFO',
    action: 'LINE_AUTH_COMPLETED',
    orderId: 'ord_1042',
    details: '購入完了画面よりLINE Login連携完了 (state/nonce/PKCE検証成功, userId: U91a82...)',
  },
  {
    id: 'log_006',
    timestamp: '2026-11-12T09:16:05+09:00',
    level: 'INFO',
    action: 'LINE_NOTIFY_SENT',
    orderId: 'ord_1042',
    details: 'LINE Messaging APIでFlex Message受取通知を送信 (受取トークン付与済みURL)',
  },
  {
    id: 'log_007',
    timestamp: '2026-11-12T12:10:48+09:00',
    level: 'WARN',
    action: 'ESIM_API_RETRY',
    orderId: 'ord_1045',
    details: '卸元TELNA APIタイムアウト (10000ms)。指数バックオフで再試行ジョブをキュー登録 (#1/3)',
  },
];

// メモリストア管理クラス
export class SystemDatabase {
  private orders: Map<string, ShopifyOrder> = new Map();
  private jobs: Map<string, IssuanceJob> = new Map();

  constructor() {
    initialOrders.forEach(o => this.orders.set(o.id, { ...o }));
    initialJobs.forEach(j => this.jobs.set(j.id, { ...j }));
  }

  // 注文関連
  getOrders(): ShopifyOrder[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getOrder(id: string): ShopifyOrder | undefined {
    return this.orders.get(id);
  }

  getOrderByClaimToken(token: string): ShopifyOrder | undefined {
    return Array.from(this.orders.values()).find(o => o.claimToken === token);
  }

  saveOrder(order: ShopifyOrder): void {
    this.orders.set(order.id, { ...order });
  }

  // ジョブ関連
  getJobs(): IssuanceJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getJob(id: string): IssuanceJob | undefined {
    return this.jobs.get(id);
  }

  saveJob(job: IssuanceJob): void {
    this.jobs.set(job.id, { ...job });
  }

  // プラン管理
  getPlans(): WholesalerPlan[] {
    return wholesalerPlans;
  }

  savePlan(plan: WholesalerPlan): WholesalerPlan {
    const idx = wholesalerPlans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      wholesalerPlans[idx] = { ...plan };
    } else {
      wholesalerPlans.push({ ...plan });
    }
    return plan;
  }

  restockPlan(planId: string, count: number): WholesalerPlan | undefined {
    const plan = wholesalerPlans.find(p => p.id === planId);
    if (plan) {
      plan.stockAvailable += count;
    }
    return plan;
  }

  // マッピング管理
  getMappings(): PlanMapping[] {
    return planMappings;
  }

  saveMapping(mapping: PlanMapping): PlanMapping {
    const idx = planMappings.findIndex(m => m.shopifyVariantId === mapping.shopifyVariantId);
    if (idx >= 0) {
      planMappings[idx] = { ...mapping };
    } else {
      planMappings.push({ ...mapping });
    }
    return mapping;
  }

  deleteMapping(variantId: string): boolean {
    const idx = planMappings.findIndex(m => m.shopifyVariantId === variantId);
    if (idx >= 0) {
      planMappings.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ログ記録
  addLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    auditLogs.unshift(entry);
    if (auditLogs.length > 500) {
      auditLogs.pop();
    }
    return entry;
  }
}

export const db = new SystemDatabase();
