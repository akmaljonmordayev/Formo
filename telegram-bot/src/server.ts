import { createHash, timingSafeEqual } from 'crypto';
import { createServer, IncomingMessage, Server } from 'http';
import { errorMessage, Logger } from './log';
import { TgUpdate } from './telegram';

const MAX_BODY_BYTES = 1024 * 1024;
const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

export interface ServerOptions {
  /** Berilmasa webhook yo'li ochilmaydi (polling rejimi) — faqat /health */
  webhook?: { path: string; secret: string };
  process: (u: TgUpdate) => Promise<void>;
  log: Logger;
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
export function createBotServer({ webhook, process, log }: ServerOptions): Server {
  return createServer(async (req, res) => {
    const reply = (status: number, body: unknown = { ok: status < 400 }) => {
      if (res.headersSent) return;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const path = (req.url ?? '').split('?')[0];

    if (req.method === 'GET' && path === '/health') return reply(200, { ok: true });
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

    // handleUpdate xato tashlamaydi; har ehtimolga qarshi — Telegram'ga baribir 200, aks holda u qayta-qayta yuboradi
    await process(update).catch((err) => log.error('webhook update xatosi', { error: errorMessage(err) }));
    reply(200);
  });
}
