import { NextFunction, Request, Response } from 'express';
import { BlockList, isIP } from 'net';

/** Cloudflare e'lon qilgan manzillar: https://www.cloudflare.com/ips/ (2026-10-13 holatiga) */
export const CLOUDFLARE_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

export function buildCloudflareList(extraRanges: string[] = []) {
  const list = new BlockList();
  for (const range of [...CLOUDFLARE_RANGES, ...extraRanges]) {
    const [address, prefix] = range.trim().split('/');
    const family = isIP(address);
    if (!family || !prefix) throw new Error(`Noto'g'ri IP diapazoni: "${range}"`);
    list.addSubnet(address, Number(prefix), family === 6 ? 'ipv6' : 'ipv4');
  }
  return list;
}

/**
 * Railway edge'iga ulangan manzil — X-Forwarded-For dagi birinchi qiymat.
 * Railway bu headerni o'zi qayta yozadi (klient yuborgani o'chiriladi): Cloudflare orqali
 * kelganda "Cloudflare IP, edge", to'g'ridan-to'g'ri kelganda "klient IP, edge" bo'ladi.
 */
export function connectingPeer(req: Request): string | null {
  const raw = req.headers['x-forwarded-for'];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();
  return first && isIP(first) ? first : null;
}

export function isFromCloudflare(req: Request, list: BlockList): boolean {
  const peer = connectingPeer(req);
  if (!peer) return false;
  return list.check(peer, isIP(peer) === 6 ? 'ipv6' : 'ipv4');
}

/**
 * Cloudflare'ni chetlab, to'g'ridan-to'g'ri origin'ga kelgan so'rovlarni rad etadi (403).
 * `exemptPaths` — platformaning ichki healthcheck'i kabi Cloudflare'siz kelishi shart bo'lgan yo'llar.
 */
export function cloudflareOnly(list: BlockList, exemptPaths: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (exemptPaths.includes(req.path) || isFromCloudflare(req, list)) return next();
    res.status(403).json({ statusCode: 403, message: 'Forbidden' });
  };
}
