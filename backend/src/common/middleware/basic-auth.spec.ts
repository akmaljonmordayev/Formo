import { Request, Response } from 'express';
import { basicAuth } from './basic-auth';

const header = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

describe('basicAuth', () => {
  const middleware = basicAuth('docs', 'p@ss:word-123');
  const run = (authorization?: string) => {
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware({ headers: { authorization } } as Request, res as unknown as Response, next);
    return { res, next };
  };

  it('to‘g‘ri login va parol — o‘tkazadi (parolda ":" bo‘lsa ham)', () => {
    const { res, next } = run(header('docs', 'p@ss:word-123'));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sxema nomi katta-kichik harfga bog‘liq emas', () => {
    expect(run(header('docs', 'p@ss:word-123').replace('Basic', 'basic')).next).toHaveBeenCalled();
  });

  it.each([
    ['header yo‘q', undefined],
    ['noto‘g‘ri parol', header('docs', 'wrong')],
    ['noto‘g‘ri login', header('admin', 'p@ss:word-123')],
    ['parol qismi (prefiks)', header('docs', 'p@ss')],
    ['bo‘sh parol', header('docs', '')],
    ['Bearer token', 'Bearer abc.def.ghi'],
    ['":" siz qiymat', `Basic ${Buffer.from('docs').toString('base64')}`],
    ['base64 emas', 'Basic !!!'],
    ['faqat sxema', 'Basic'],
  ])('%s — 401 va brauzerga login oynasi', (_, authorization) => {
    const { res, next } = run(authorization);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.setHeader).toHaveBeenCalledWith('WWW-Authenticate', expect.stringMatching(/^Basic realm=/));
  });
});
