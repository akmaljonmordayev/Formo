export type Level = 'info' | 'warn' | 'error';

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/**
 * JSON qatorli log. Hech qachon xabar matni, kod, telefon yoki tokenlar yozilmaydi —
 * chaqiruvchi faqat ID va natija kodlarini beradi; bunga qo'shimcha sir qiymatlar har ehtimolga qarshi yashiriladi.
 */
export function createLogger(secrets: string[], write: (line: string) => void = (l) => process.stdout.write(`${l}\n`)): Logger {
  const hidden = secrets.filter((s) => s.length >= 8);
  const redact = (s: string) => hidden.reduce((acc, secret) => acc.split(secret).join('<redacted>'), s);
  const emit = (level: Level, msg: string, meta?: Record<string, unknown>) =>
    write(redact(JSON.stringify({ time: new Date().toISOString(), level, msg, ...meta })));
  return {
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
  };
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
