import { Request, Response } from 'express';
import { buildCloudflareList, cloudflareOnly, connectingPeer, isFromCloudflare } from './cloudflare-only';

const request = (forwardedFor?: string | string[], path = '/api/auth/login') =>
  ({ headers: forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor }, path }) as unknown as Request;

describe('Cloudflare manzillari', () => {
  const list = buildCloudflareList();

  // Productionda o'lchangan zanjirlar (GET /api/admin/diagnostics/request)
  it.each([
    ['172.64.200.81, 152.233.43.34', true],
    ['162.158.103.40, 152.233.43.34', true],
    ['2606:4700:10::6816:1a2b, 152.233.43.34', true],
    ['195.158.30.13, 79.127.178.82', false], // to'g'ridan-to'g'ri Railway'ga
    ['87.192.224.196', false],
    ['172.72.0.1, 152.233.43.34', false], // diapazondan bitta tashqarida
    ['2606:4701::1', false],
  ])('%s -> %p', (forwardedFor, expected) => {
    expect(isFromCloudflare(request(forwardedFor), list)).toBe(expected);
  });

  it('header yo‘q yoki buzuq bo‘lsa — Cloudflare emas', () => {
    expect(isFromCloudflare(request(), list)).toBe(false);
    expect(isFromCloudflare(request(''), list)).toBe(false);
    expect(isFromCloudflare(request('not-an-ip, 172.64.200.81'), list)).toBe(false);
  });

  it('faqat birinchi manzil hisobga olinadi (keyingisi Cloudflare bo‘lsa ham)', () => {
    expect(connectingPeer(request('195.158.30.13, 172.64.200.81'))).toBe('195.158.30.13');
    expect(isFromCloudflare(request('195.158.30.13, 172.64.200.81'), list)).toBe(false);
  });

  it('qo‘shimcha diapazon berish mumkin; noto‘g‘ri diapazon — aniq xato', () => {
    const extended = buildCloudflareList(['203.0.113.0/24']);
    expect(isFromCloudflare(request('203.0.113.7'), extended)).toBe(true);
    expect(() => buildCloudflareList(['not-a-range'])).toThrow(/Noto'g'ri IP diapazoni/);
    expect(() => buildCloudflareList(['10.0.0.1'])).toThrow(/Noto'g'ri IP diapazoni/);
  });
});

describe('cloudflareOnly', () => {
  const middleware = cloudflareOnly(buildCloudflareList(), ['/api/health']);
  const run = (req: Request) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res as unknown as Response, next);
    return { res, next };
  };

  it('Cloudflare orqali kelgan so‘rov o‘tadi', () => {
    const { res, next } = run(request('172.64.200.81, 152.233.43.34'));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('to‘g‘ridan-to‘g‘ri kelgan so‘rov — 403', () => {
    const { res, next } = run(request('195.158.30.13, 79.127.178.82'));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('healthcheck yo‘li har doim ochiq (Railway ichkaridan tekshiradi)', () => {
    expect(run(request(undefined, '/api/health')).next).toHaveBeenCalled();
    expect(run(request('195.158.30.13', '/api/health')).next).toHaveBeenCalled();
  });

  it('ozod yo‘lga o‘xshash boshqa yo‘l ochilmaydi', () => {
    expect(run(request('195.158.30.13', '/api/health/../auth/login')).next).not.toHaveBeenCalled();
    expect(run(request('195.158.30.13', '/api/healthz')).next).not.toHaveBeenCalled();
  });
});
