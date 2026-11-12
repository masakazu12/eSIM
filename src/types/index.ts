/**
 * Shopify eSIM 自動発行 LINE配信連携システム - 型定義
 */

export type OrderStatus = 'PAID' | 'PROCESSING' | 'ISSUED' | 'CLAIMED' | 'FAILED' | 'REFUNDED';
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'RETRYING' | 'FAILED' | 'DEAD_LETTER';
export type LineLinkStatus = 'UNLINKED' | 'LINKED' | 'BLOCKED' | 'FAILED';

export interface WholesalerPlan {
  id: string;
  planCode: string;
  provider: 'eSIM_GO' | 'GIGS' | 'GLOBAL_1' | 'TELNA';
  countryCode: string;
  countryName: string;
  dataAllowance: string; // e.g. "10GB", "Unlimited"
  validityDays: number;
  wholesaleCostJpy: number;
  retailPriceJpy: number;
  apn: string;
  roamingEnabled: boolean;
  supportedNetworks: string[];
  stockAvailable: number;
}

export interface PlanMapping {
  shopifyVariantId: string;
  shopifyProductId: string;
  productTitle: string;
  variantTitle: string;
  wholesalerPlanId: string;
  isActive: boolean;
  metafields: {
    planCode: string;
    country: string;
    capacity: string;
    duration: string;
    provider: string;
  };
}

export interface EsimProfile {
  id: string;
  orderId: string;
  lineItemId: string;
  idempotencyKey: string;
  iccid: string;
  smdpAddress: string;
  activationCode: string;
  matchingId: string;
  qrPayload: string; // LPA:1$smdp.example.com$...
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  issuedAt: string;
  activatedAt?: string;
  expiresAt: string;
  wholesalerReference: string;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: string;
  shopifyOrderId: string;
  customerEmail: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  financialStatus: 'paid' | 'refunded' | 'partially_refunded';
  createdAt: string;
  paidAt: string;
  lineItems: {
    id: string;
    shopifyVariantId: string;
    title: string;
    variantTitle: string;
    quantity: number;
    price: number;
    planId: string;
    country: string;
  }[];
  // 連携状態
  claimToken: string;
  claimTokenExpiresAt: string;
  claimUrl: string;
  lineStatus: LineLinkStatus;
  lineUserId?: string;
  lineDisplayName?: string;
  lineLinkedAt?: string;
  esimStatus: OrderStatus;
  esimProfiles: EsimProfile[];
  retryCount: number;
  lastError?: string;
}

export interface IssuanceJob {
  id: string;
  jobType: 'ESIM_ISSUE' | 'LINE_NOTIFY' | 'REFUND_REVOKE';
  orderId: string;
  lineItemId?: string;
  idempotencyKey: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  createdAt: string;
  updatedAt: string;
  errorLog?: string;
  payload: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  action:
    | 'WEBHOOK_RECEIVED'
    | 'HMAC_VERIFIED'
    | 'HMAC_REJECTED'
    | 'DUPLICATE_WEBHOOK_BLOCKED'
    | 'JOB_ENQUEUED'
    | 'ESIM_API_REQUEST'
    | 'ESIM_API_SUCCESS'
    | 'ESIM_API_RETRY'
    | 'ESIM_API_FAILED'
    | 'LINE_AUTH_COMPLETED'
    | 'LINE_NOTIFY_SENT'
    | 'LINE_NOTIFY_BLOCKED'
    | 'CLAIM_PORTAL_ACCESSED'
    | 'ORDER_REFUNDED'
    | 'MANUAL_REISSUE'
    | 'STOCK_ALERT'
    | 'STOCK_RESTOCKED';
  orderId?: string;
  details: string;
  ipAddress?: string;
  rawPayloadSnippet?: string;
}

export interface SystemConfig {
  shopifyStoreUrl: string;
  shopifyWebhookSecret: string;
  wholesalerApiEndpoint: string;
  wholesalerApiKey: string;
  lineChannelId: string;
  lineChannelSecret: string;
  lineMessagingToken: string;
  claimTokenTtlHours: number;
  maxJobRetries: number;
  alertEmail: string;
  autoIssueEnabled: boolean;
  autoSendLineEnabled: boolean;
  defaultTestLineUserId: string;
  stockAlertThreshold: number;
  stockCriticalThreshold: number;
  stockAlertEmailEnabled: boolean;
}

export interface AcceptanceTestResult {
  testId: string;
  name: string;
  category: string;
  description: string;
  status: 'PASSED' | 'FAILED' | 'RUNNING' | 'PENDING';
  executedAt?: string;
  durationMs?: number;
  logs: string[];
  assertions: {
    title: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
}
