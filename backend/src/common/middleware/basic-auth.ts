import { createHash, timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

// Uzunlik farqi ham vaqt orqali oshkor bo'lmasligi uchun xeshlar solishtiriladi
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

/** HTTP Basic auth: brauzer login/parol oynasini o'zi chiqaradi (Swagger sahifasini yopish uchun) */
export function basicAuth(username: string, password: string, realm = 'Formo API docs') {
  return (req: Request, res: Response, next: NextFunction) => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() === 'basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator !== -1) {
        // Ikkalasi ham har doim tekshiriladi — login to'g'riligini vaqtdan bilib bo'lmasin
        const userOk = safeEqual(decoded.slice(0, separator), username);
        const passwordOk = safeEqual(decoded.slice(separator + 1), password);
        if (userOk && passwordOk) return next();
      }
    }
    res.setHeader('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
    res.status(401).json({ statusCode: 401, message: 'Login va parol kerak' });
  };
}
