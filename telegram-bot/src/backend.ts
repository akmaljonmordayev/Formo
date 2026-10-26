/**
 * Formo backend ichki API mijozi (`/api/internal/telegram/*`, Bearer TELEGRAM_INTERNAL_TOKEN).
 * Bot hech qanday ma'lumotni o'zi saqlamaydi va balans/to'lov/buyurtmani o'zgartira olmaydi.
 */

export type ClaimResult = { result: 'INVALID' } | { result: 'CONTACT_REQUIRED'; maskedPhone: string };

export type CodeResult =
  | { result: 'CODE'; code: string; expiresInSec: number; maskedPhone: string }
  | { result: 'COOLDOWN'; retryAfterSec: number }
  | { result: 'LIMIT' | 'NO_CHALLENGE' | 'CONTACT_REQUIRED' | 'PHONE_MISMATCH' };

export interface OutboxMessage {
  id: number;
  chatId: string;
  text: string;
  attempts: number;
}

export type OutboxResult = 'SENT' | 'RETRY' | 'BLOCKED' | 'FAILED';

type NotLinked = { linked: false };
export type TopUpStatus = 'PENDING' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface TopUpView {
  id: number;
  code: string;
  amount: number;
  method: 'MANUAL_CARD' | 'CLICK' | 'PAYME';
  status: TopUpStatus;
  hasReceipt: boolean;
  rejectReason: string | null;
  createdAt: string;
}

export interface ManualTopUp extends TopUpView {
  instructions: { type: 'MANUAL'; cardNumber: string; cardHolder: string; bankName: string | null; note: string | null; comment: string };
}

export type MeResult = NotLinked | { linked: true; firstName: string | null; balance: number; activeOrders: number; language: string | null };
export type BalanceResult = NotLinked | { linked: true; balance: number; topUps: TopUpView[] };
export type OrdersResult =
  | NotLinked
  | { linked: true; orders: { id: number; code: string; statusLabel: string; totalSum: number; createdAt: string }[] };
export interface TopUpMethods {
  limits: { min: number; max: number };
  methods: { method: string; enabled: boolean }[];
}
export type CreateTopUpResult =
  | { result: 'OK'; topUp: ManualTopUp }
  | { result: 'NOT_LINKED' | 'TOO_MANY_OPEN' | 'INVALID_AMOUNT' | 'METHOD_UNAVAILABLE' };
export type ReceiptResult =
  | { result: 'OK'; topUp: TopUpView }
  | { result: 'NOT_LINKED' }
  | { result: 'NO_OPEN_TOPUP' }
  | { result: 'DUPLICATE_RECEIPT' };
export type CancelTopUpResult = { result: 'OK'; topUp: TopUpView } | { result: 'NOT_LINKED' } | { result: 'NOT_CANCELLABLE' };

export interface Backend {
  claim(startToken: string, telegramUserId: string, chatId: string): Promise<ClaimResult>;
  contact(telegramUserId: string, chatId: string, phone: string): Promise<CodeResult>;
  resend(telegramUserId: string): Promise<CodeResult>;
  hello(telegramUserId: string, chatId: string): Promise<{ linked: boolean }>;
  stop(telegramUserId: string): Promise<{ linked: boolean }>;
  leaseOutbox(limit: number): Promise<OutboxMessage[]>;
  reportOutbox(id: number, result: OutboxResult, error?: string): Promise<void>;
  me(telegramUserId: string): Promise<MeResult>;
  setLanguage(telegramUserId: string, language: string): Promise<{ linked: boolean }>;
  balance(telegramUserId: string): Promise<BalanceResult>;
  orders(telegramUserId: string): Promise<OrdersResult>;
  topUpMethods(): Promise<TopUpMethods>;
  createTopUp(telegramUserId: string, amount: number): Promise<CreateTopUpResult>;
  attachReceipt(telegramUserId: string, fileId: string, fileUniqueId?: string): Promise<ReceiptResult>;
  cancelTopUp(telegramUserId: string, topUpId: number): Promise<CancelTopUpResult>;
}

export class BackendError extends Error {
  constructor(
    readonly path: string,
    /** HTTP status; 0 — javob kelmadi */
    readonly status: number,
  ) {
    super(`Backend ${path}: ${status || 'javob yo‘q'}`);
  }
}

type Fetch = typeof fetch;
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const RETRIES = 2;

/** So'rov serverga umuman yetib bormagan — har qanday so'rovni qayta yuborish xavfsiz */
const notDelivered = (err: unknown) => {
  const code = (err as { cause?: { code?: string } })?.cause?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN';
};

export class BackendClient implements Backend {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: Fetch = fetch,
    private readonly sleep = defaultSleep,
  ) {}

  /**
   * idempotent=false (kod chiqarish) bo'lsa faqat so'rov yetib bormagan holatda qayta urinadi:
   * aks holda server kod chiqargan, lekin javob yo'qolgan bo'lsa — ikkinchi kod va cooldown chiqadi.
   */
  private async request<T>(method: 'GET' | 'POST', path: string, body: unknown, idempotent: boolean): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let retry: boolean;
      let error: BackendError;
      try {
        const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: { Authorization: `Bearer ${this.token}`, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) return (await res.json()) as T;
        error = new BackendError(path, res.status);
        retry = idempotent && (res.status >= 500 || res.status === 429);
      } catch (err) {
        error = new BackendError(path, 0);
        retry = idempotent || notDelivered(err);
      }
      if (!retry || attempt >= RETRIES) throw error;
      await this.sleep(300 * 2 ** attempt);
    }
  }

  claim(startToken: string, telegramUserId: string, chatId: string) {
    return this.request<ClaimResult>('POST', '/internal/telegram/claim', { startToken, telegramUserId, chatId }, true);
  }

  contact(telegramUserId: string, chatId: string, phone: string) {
    return this.request<CodeResult>('POST', '/internal/telegram/contact', { telegramUserId, chatId, phone }, false);
  }

  resend(telegramUserId: string) {
    return this.request<CodeResult>('POST', '/internal/telegram/resend', { telegramUserId }, false);
  }

  hello(telegramUserId: string, chatId: string) {
    return this.request<{ linked: boolean }>('POST', '/internal/telegram/hello', { telegramUserId, chatId }, true);
  }

  stop(telegramUserId: string) {
    return this.request<{ linked: boolean }>('POST', '/internal/telegram/stop', { telegramUserId }, true);
  }

  // Ijara (lease) muddati tugagach xabar qayta beriladi — takroriy so'rov zararsiz
  leaseOutbox(limit: number) {
    return this.request<OutboxMessage[]>('GET', `/internal/telegram/outbox?limit=${limit}`, undefined, true);
  }

  async reportOutbox(id: number, result: OutboxResult, error?: string) {
    await this.request('POST', `/internal/telegram/outbox/${id}/result`, { result, ...(error && { error }) }, true);
  }

  me(telegramUserId: string) {
    return this.request<MeResult>('POST', '/internal/telegram/me', { telegramUserId }, true);
  }

  setLanguage(telegramUserId: string, language: string) {
    return this.request<{ linked: boolean }>('POST', '/internal/telegram/language', { telegramUserId, language }, true);
  }

  balance(telegramUserId: string) {
    return this.request<BalanceResult>('POST', '/internal/telegram/balance', { telegramUserId }, true);
  }

  orders(telegramUserId: string) {
    return this.request<OrdersResult>('POST', '/internal/telegram/orders', { telegramUserId }, true);
  }

  topUpMethods() {
    return this.request<TopUpMethods>('GET', '/internal/telegram/topup-methods', undefined, true);
  }

  // Backend bir daqiqa ichidagi bir xil summali so'rovni qayta qaytaradi — takror yuborish ikkinchi so'rov ochmaydi
  createTopUp(telegramUserId: string, amount: number) {
    return this.request<CreateTopUpResult>('POST', '/internal/telegram/topups', { telegramUserId, amount, method: 'MANUAL_CARD' }, true);
  }

  // Chek oxirgi ochiq so'rovga yoziladi (qayta yuborilsa almashtiriladi) — pul qo'shilmaydi
  attachReceipt(telegramUserId: string, fileId: string, fileUniqueId?: string) {
    return this.request<ReceiptResult>('POST', '/internal/telegram/topups/receipt', { telegramUserId, fileId, fileUniqueId }, true);
  }

  cancelTopUp(telegramUserId: string, topUpId: number) {
    return this.request<CancelTopUpResult>('POST', '/internal/telegram/topups/cancel', { telegramUserId, topUpId }, true);
  }
}
