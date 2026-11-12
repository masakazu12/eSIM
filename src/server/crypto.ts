import crypto from 'node:crypto';

/**
 * Shopify WebhookのHMAC-SHA256署名を検証
 * X-Shopify-Hmac-Sha256ヘッダーの値 (Base64) と比較
 */
export function verifyShopifyWebhook(rawBody: string | Buffer, hmacHeader: string, secret: string): boolean {
  if (!rawBody || !hmacHeader || !secret) {
    return false;
  }
  try {
    const generatedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const generatedBuf = Buffer.from(generatedHash);
    const headerBuf = Buffer.from(hmacHeader);

    if (generatedBuf.length !== headerBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(generatedBuf, headerBuf);
  } catch (err) {
    console.error('HMAC verification error:', err);
    return false;
  }
}

/**
 * 安全で推測困難なワンタイム連携トークンを生成
 */
export function generateClaimToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * 注文明細単位の冪等性キー (Idempotency Key) を生成
 */
export function generateIdempotencyKey(orderId: string, lineItemId: string): string {
  return crypto
    .createHash('sha256')
    .update(`esim-issuance:${orderId}:${lineItemId}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * GSMA規格準拠のLPA QRコードペイロードを生成
 * フォーマット: LPA:1${smdpAddress}${matchingId}
 */
export function generateLpaPayload(smdpAddress: string, matchingId: string): string {
  return `LPA:1$${smdpAddress}$${matchingId}`;
}

/**
 * 秘密情報のマスキング (ログ出力・UI表示用)
 */
export function maskSecret(val: string): string {
  if (!val || val.length <= 8) return '••••••••';
  return val.substring(0, 4) + '••••' + val.substring(val.length - 4);
}
