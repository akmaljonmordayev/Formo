import {
  Backend,
  BalanceResult,
  CancelTopUpResult,
  ClaimResult,
  CodeResult,
  CreateTopUpResult,
  MeResult,
  OrdersResult,
  OutboxMessage,
  OutboxResult,
  ReceiptResult,
} from '../src/backend';
import { RecentIds } from '../src/dedupe';
import { Deps } from '../src/handlers';
import { Logger } from '../src/log';
import { UserSessions } from '../src/session';
import { SendOptions, TgUpdate } from '../src/telegram';

export const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ';
export const INTERNAL = 'i'.repeat(40);

export interface Sent {
  chatId: string;
  text: string;
  options?: SendOptions;
}

/** Chaqiruvlarni yozib boradigan soxta backend; javoblar test ichida almashtiriladi */
export class FakeBackend implements Backend {
  calls: { name: string; args: unknown[] }[] = [];
  claimResult: ClaimResult = { result: 'CONTACT_REQUIRED', maskedPhone: '+998 90 *** ** 67' };
  codeResult: CodeResult = { result: 'CODE', code: '48213', expiresInSec: 300, maskedPhone: '+998 90 *** ** 67' };
  linked = false;
  fail = false;
  outbox: OutboxMessage[] = [];
  reports: { id: number; result: OutboxResult; error?: string }[] = [];

  private async rec<T>(name: string, args: unknown[], value: T): Promise<T> {
    this.calls.push({ name, args });
    if (this.fail) throw new Error('backend down');
    return value;
  }
  claim(...args: [string, string, string]) {
    return this.rec('claim', args, this.claimResult);
  }
  contact(...args: [string, string, string]) {
    return this.rec('contact', args, this.codeResult);
  }
  resend(...args: [string]) {
    return this.rec('resend', args, this.codeResult);
  }
  hello(...args: [string, string]) {
    return this.rec('hello', args, { linked: this.linked });
  }
  stop(...args: [string]) {
    return this.rec('stop', args, { linked: this.linked });
  }
  leaseOutbox(limit: number) {
    return this.rec('leaseOutbox', [limit], this.outbox.splice(0, limit));
  }
  async reportOutbox(id: number, result: OutboxResult, error?: string) {
    this.reports.push({ id, result, error });
  }

  meResult: MeResult = { linked: true, firstName: 'Aziz', balance: 0, activeOrders: 0, language: null };
  balanceResult: BalanceResult = { linked: true, balance: 0, topUps: [] };
  ordersResult: OrdersResult = { linked: true, orders: [] };
  createResult: CreateTopUpResult = {
    result: 'OK',
    topUp: {
      id: 7,
      code: 'TOP-000007',
      amount: 50000,
      method: 'MANUAL_CARD',
      status: 'PENDING',
      hasReceipt: false,
      rejectReason: null,
      createdAt: '2026-10-25T10:00:00.000Z',
      instructions: { type: 'MANUAL', cardNumber: '9860 0112 0207 4545', cardHolder: 'Abdulla Yakubov', bankName: null, note: null, comment: 'TOP-000007' },
    },
  };
  receiptResult: ReceiptResult = { result: 'NO_OPEN_TOPUP' };
  cancelResult: CancelTopUpResult = { result: 'NOT_CANCELLABLE' };

  me(...args: [string]) {
    return this.rec('me', args, this.meResult);
  }
  setLanguage(...args: [string, string]) {
    return this.rec('setLanguage', args, { linked: this.meResult.linked });
  }
  balance(...args: [string]) {
    return this.rec('balance', args, this.balanceResult);
  }
  orders(...args: [string]) {
    return this.rec('orders', args, this.ordersResult);
  }
  topUpMethods() {
    return this.rec('topUpMethods', [], { limits: { min: 10000, max: 10000000 }, methods: [{ method: 'MANUAL_CARD', enabled: true }] });
  }
  createTopUp(...args: [string, number]) {
    return this.rec('createTopUp', args, this.createResult);
  }
  attachReceipt(...args: [string, string, string?]) {
    return this.rec('attachReceipt', args, this.receiptResult);
  }
  cancelTopUp(...args: [string, number]) {
    return this.rec('cancelTopUp', args, this.cancelResult);
  }
}

export function fakeDeps() {
  const sent: Sent[] = [];
  const answered: string[] = [];
  const lines: string[] = [];
  const log: Logger = {
    info: (msg, meta) => lines.push(JSON.stringify({ msg, ...meta })),
    warn: (msg, meta) => lines.push(JSON.stringify({ msg, ...meta })),
    error: (msg, meta) => lines.push(JSON.stringify({ msg, ...meta })),
  };
  const backend = new FakeBackend();
  const deps: Deps = {
    tg: {
      sendMessage: async (chatId, text, options) => {
        sent.push({ chatId: String(chatId), text, options });
      },
      answerCallbackQuery: async (id) => {
        answered.push(id);
      },
    },
    backend,
    log,
    dedupe: new RecentIds(),
    sessions: new UserSessions(),
  };
  return { deps, backend, sent, answered, lines };
}

let seq = 1;
const USER = { id: 555000111, is_bot: false, first_name: 'Aziz' };

export function textUpdate(text: string, over: { chatType?: 'private' | 'group'; fromId?: number; lang?: string } = {}): TgUpdate {
  const from = { ...USER, id: over.fromId ?? USER.id, language_code: over.lang };
  return {
    update_id: seq++,
    message: { message_id: seq, from, chat: { id: from.id, type: over.chatType ?? 'private' }, text },
  };
}

export function contactUpdate(phone: string, contactUserId?: number): TgUpdate {
  return {
    update_id: seq++,
    message: { message_id: seq, from: USER, chat: { id: USER.id, type: 'private' }, contact: { phone_number: phone, user_id: contactUserId } },
  };
}

export function callbackUpdate(data: string, lang?: string): TgUpdate {
  return {
    update_id: seq++,
    callback_query: { id: `cb${seq}`, from: { ...USER, language_code: lang }, data, message: { chat: { id: USER.id, type: 'private' } } },
  };
}

export function photoUpdate(fileIds: string[], lang?: string): TgUpdate {
  return {
    update_id: seq++,
    message: {
      message_id: seq,
      from: { ...USER, language_code: lang },
      chat: { id: USER.id, type: 'private' },
      photo: fileIds.map((file_id, i) => ({ file_id, file_unique_id: `u_${file_id}`, width: 90 * (i + 1), height: 160 * (i + 1) })),
    },
  };
}

export const USER_ID = USER.id;

/** Ketma-ket javoblar beradigan soxta fetch; har chaqiruv yoziladi */
export function scriptedFetch(responses: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('kutilmagan so‘rov');
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { impl, calls };
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const noSleep = async () => {};
