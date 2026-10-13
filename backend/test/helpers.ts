import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

export const SUPERADMIN = { phone: '+998901111111', password: 'admin123' };

export async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);

  // Har fayl toza bazadan boshlaydi; superadmin app.init() da seed qilinadi
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe('TRUNCATE "Session", "User" RESTART IDENTITY CASCADE');
  await app.init();
  return { app, prisma };
}

export const api = (app: INestApplication) => request(app.getHttpServer());

export async function login(app: INestApplication, phone: string, password: string) {
  const res = await api(app).post('/api/auth/login').send({ phone, password }).expect(200);
  return res.body as { accessToken: string; refreshToken: string; user: Record<string, unknown> };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let seq = 0;
/** Har chaqiriqda yangi, unikal o'zbek raqami */
export function nextPhone() {
  seq += 1;
  return `+99893${String(Date.now() % 10000).padStart(4, '0')}${String(seq).padStart(3, '0')}`;
}

export const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg/onload=alert(1)>',
  '"><script>alert(document.cookie)</script>',
  "javascript:alert('xss')",
  'JaVaScRiPt:alert(1)',
  'Aziz onmouseover=alert(1)',
  '<iframe src="javascript:alert(1)"></iframe>',
  '</textarea><script>alert(1)</script>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  '&lt;script&gt;'.replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
  '<a href="x" style="x:expression(alert(1))">',
];

export const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1 --",
  "admin'--",
  "'; DROP TABLE \"User\"; --",
  '" OR ""="',
  "1' UNION SELECT * FROM \"User\" --",
];
