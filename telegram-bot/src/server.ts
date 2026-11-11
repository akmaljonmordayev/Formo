import { createHash, timingSafeEqual } from 'crypto';
import { createServer, IncomingMessage, Server } from 'http';
import { KeyedQueue } from './keyed-queue';
import { errorMessage, Logger } from './log';
import { chatKey } from './polling';
import { TgUpdate } from './telegram';

const MAX_BODY_BYTES = 1024 * 1024;
const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

export interface ServerOptions {
  /** Berilmasa webhook yo'li ochilmaydi (polling rejimi) — faqat /health */
  webhook?: { path: string; secret: string };
  process: (u: TgUpdate) => Promise<void>;
  log: Logger;
  /** true — bot ishlamayapti (polling osilgan): /health 503 qaytaradi */
  unhealthy?: () => boolean;
}

const digest = (v: string) => createHash('sha256').update(v).digest();

/** setWebhook(secret_token) bilan berilgan sir — har so'rovda Telegram shu headerni yuboradi */
export function secretMatches(header: string | string[] | undefined, secret: string) {
  return typeof header === 'string' && header.length > 0 && timingSafeEqual(digest(header), digest(secret));
}

class TooLarge extends Error {}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new TooLarge());
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** GET /health va (webhook rejimida) POST <path> */
export function createBotServer({ webhook, process, log, unhealthy }: ServerOptions): Server {
  // Polling'dagi kabi — bitta foydalanuvchining updatelari webhook so'rovlari parallel kelsa ham ketma-ket ishlanadi
  const queue = new KeyedQueue();
  const processInOrder = (update: TgUpdate): Promise<void> =>
    queue.run(chatKey(update), () => process(update), (err) => log.error('webhook update xatosi', { error: errorMessage(err) }));
  return createServer(async (req, res) => {
    const reply = (status: number, body: unknown = { ok: status < 400 }) => {
      if (res.headersSent) return;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const path = (req.url ?? '').split('?')[0];

    if (req.method === 'GET' && path === '/health') return unhealthy?.() ? reply(503, { ok: false }) : reply(200, { ok: true });
    if (!webhook || path !== webhook.path) return reply(404);
    if (req.method !== 'POST') return reply(405);
    if (!secretMatches(req.headers[SECRET_HEADER], webhook.secret)) {
      log.warn('webhook: noto‘g‘ri secret_token');
      return reply(401);
    }

    let update: TgUpdate;
    try {
      update = JSON.parse(await readBody(req)) as TgUpdate;
    } catch (err) {
      return reply(err instanceof TooLarge ? 413 : 400);
    }
    if (!update || typeof update.update_id !== 'number') return reply(400);

    // Darhol 200: navbatda shu chat uchun oldingi update'lar tugashini kutib o'tirsak, javob Telegram'ning
    // webhook kutish vaqtidan oshib ketishi mumkin — u esa hali navbatda turgan eski update'ni qayta yuboradi
    // (chain'ga ikkinchi marta qo'shiladi). handleUpdate xato tashlamaydi — qayta ishlash navbat tartibida fonda davom etadi.
    reply(200);
    void processInOrder(update);
  });
}
