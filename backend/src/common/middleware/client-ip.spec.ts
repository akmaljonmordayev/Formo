import { Request, Response } from 'express';
import { clientIpFromHeader } from './client-ip';

describe('clientIpFromHeader', () => {
  const run = (headers: Record<string, string | string[]>) => {
    const req = { headers, ip: '172.64.200.81', ips: ['172.64.200.81', '152.233.43.34'] } as unknown as Request;
    const next = jest.fn();
    clientIpFromHeader('X-Real-IP')(req, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    return req;
  };

  it('headerdagi IP klient manzili bo‘ladi (req.ip va req.ips)', () => {
    const req = run({ 'x-real-ip': '195.158.30.13' });
    expect(req.ip).toBe('195.158.30.13');
    expect(req.ips).toEqual(['195.158.30.13']);
  });

  it('IPv6 ham qabul qilinadi, bo‘shliqlar qirqiladi', () => {
    expect(run({ 'x-real-ip': ' 2a02:6b8::1 ' }).ip).toBe('2a02:6b8::1');
  });

  it('header takrorlangan bo‘lsa — birinchisi', () => {
    expect(run({ 'x-real-ip': ['195.158.30.13', '1.2.3.4'] }).ip).toBe('195.158.30.13');
  });

  it.each([
    ['header yo‘q', {}],
    ['bo‘sh', { 'x-real-ip': '' }],
    ['IP emas', { 'x-real-ip': 'not-an-ip' }],
    ['ro‘yxat (XFF ko‘rinishi)', { 'x-real-ip': '1.2.3.4, 5.6.7.8' }],
    ['boshqa header', { 'cf-connecting-ip': '1.2.3.4' }],
  ])('%s — express aniqlagan manzilga tegilmaydi', (_, headers) => {
    const req = run(headers as Record<string, string>);
    expect(req.ip).toBe('172.64.200.81');
    expect(req.ips).toEqual(['172.64.200.81', '152.233.43.34']);
  });
});
