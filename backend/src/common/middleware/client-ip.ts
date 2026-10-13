import { NextFunction, Request, Response } from 'express';
import { isIP } from 'net';

/**
 * Klient IP sini ishonchli proxy headeridan oladi (masalan Railway'ning `X-Real-IP`).
 *
 * Nega kerak: Cloudflare → Railway zanjirida Railway `X-Forwarded-For` ni qayta yozadi va unda
 * faqat Cloudflare manzili qoladi, shuning uchun "trust proxy" hop soni bilan haqiqiy klientni
 * topib bo'lmaydi. Railway esa `X-Real-IP` ni har doim o'zi yozadi (klient yuborgan qiymat
 * o'chiriladi) — to'g'ridan-to'g'ri ham, Cloudflare orqali ham haqiqiy klient manzili bo'ladi.
 *
 * DIQQAT: faqat shu headerni o'zi yozadigan proxy ortida yoqing. Aks holda klient uni
 * soxtalashtirib rate-limitni aylanib o'tadi.
 */
export function clientIpFromHeader(headerName: string) {
  const name = headerName.toLowerCase();
  return (req: Request, _res: Response, next: NextFunction) => {
    const raw = req.headers[name];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value && isIP(value)) {
      // req.ip / req.ips — express prototipidagi getterlar; so'rov obyektida ustidan yozamiz.
      // Rate-limit (throttler), sessiya yozuvi va diagnostika shu qiymatlarni o'qiydi.
      Object.defineProperty(req, 'ip', { value, configurable: true });
      Object.defineProperty(req, 'ips', { value: [value], configurable: true });
    }
    next();
  };
}
