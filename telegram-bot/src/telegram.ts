/** Bot ishlatadigan Telegram Bot API turlarining minimal qismi */
export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name?: string;
  language_code?: string;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TgContact {
  phone_number: string;
  user_id?: number;
}

export interface TgPhotoSize {
  file_id: string;
  file_unique_id?: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TgDocument {
  file_id: string;
  file_unique_id?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  contact?: TgContact;
  photo?: TgPhotoSize[];
  document?: TgDocument;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: { chat: TgChat };
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export type ReplyMarkup =
  | {
      keyboard: { text: string; request_contact?: boolean }[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
      is_persistent?: boolean;
    }
  | { inline_keyboard: { text: string; callback_data: string }[][] }
  | { remove_keyboard: true };

export interface SendOptions {
  parse_mode?: 'HTML';
  reply_markup?: ReplyMarkup;
}

export const ALLOWED_UPDATES = ['message', 'callback_query'];

export class TelegramError extends Error {
  constructor(
    readonly method: string,
    /** Telegram error_code; 0 — tarmoq xatosi yoki javob kelmadi */
    readonly code: number,
    readonly description: string,
    readonly retryAfter?: number,
  ) {
    super(`Telegram ${method}: ${code || 'network'} ${description}`);
  }

  /** Foydalanuvchi botni bloklagan yoki akkaunti o'chirilgan */
  get blocked() {
    return this.code === 403;
  }
}

type Fetch = typeof fetch;
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const MAX_RETRY_AFTER_SEC = 30;

interface CallOptions {
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Bot API mijozi. 429 (retry_after bo'yicha), 5xx va tarmoq xatolarida qayta urinadi;
 * 400/403 kabi doimiy xatolarda — yo'q. Token URL'da bo'lgani uchun URL hech qachon xatoga yozilmaydi.
 */
export class TelegramApi {
  constructor(
    private readonly token: string,
    private readonly base = 'https://api.telegram.org',
    private readonly fetchImpl: Fetch = fetch,
    private readonly sleep = defaultSleep,
  ) {}

  async call<T>(method: string, params: Record<string, unknown>, opts: CallOptions = {}): Promise<T> {
    const { retries = 3, timeoutMs = 15_000, signal } = opts;
    for (let attempt = 0; ; attempt++) {
      let error: TelegramError;
      try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const res = await this.fetchImpl(`${this.base}/bot${this.token}/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
        const body = (await res.json().catch(() => null)) as
          | { ok: boolean; result?: T; error_code?: number; description?: string; parameters?: { retry_after?: number } }
          | null;
        if (res.ok && body?.ok) return body.result as T;
        error = new TelegramError(method, body?.error_code ?? res.status, body?.description ?? 'javob yo‘q', body?.parameters?.retry_after);
      } catch (err) {
        if (signal?.aborted) throw err;
        error = new TelegramError(method, 0, (err as Error).name === 'TimeoutError' ? 'timeout' : 'tarmoq xatosi');
      }

      const transient = error.code === 0 || error.code === 429 || error.code >= 500;
      if (!transient || attempt >= retries) throw error;
      const wait = error.retryAfter ? Math.min(error.retryAfter, MAX_RETRY_AFTER_SEC) * 1000 : 500 * 2 ** attempt;
      await this.sleep(wait);
    }
  }

  getUpdates(offset: number, timeoutSec: number, signal?: AbortSignal) {
    return this.call<TgUpdate[]>(
      'getUpdates',
      { offset, timeout: timeoutSec, allowed_updates: ALLOWED_UPDATES },
      { retries: 0, timeoutMs: (timeoutSec + 10) * 1000, signal },
    );
  }

  sendMessage(chatId: number | string, text: string, options: SendOptions = {}, retries?: number) {
    return this.call<unknown>('sendMessage', { chat_id: chatId, text, ...options }, { retries });
  }

  answerCallbackQuery(id: string, text?: string) {
    return this.call<boolean>('answerCallbackQuery', { callback_query_id: id, ...(text && { text }) }, { retries: 1 });
  }

  setWebhook(url: string, secretToken: string) {
    return this.call<boolean>('setWebhook', { url, secret_token: secretToken, allowed_updates: ALLOWED_UPDATES });
  }

  deleteWebhook() {
    return this.call<boolean>('deleteWebhook', { drop_pending_updates: false });
  }
}
