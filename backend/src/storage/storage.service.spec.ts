import { ServiceUnavailableException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectImage } from './file-type';
import { StorageService } from './storage.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);

describe('detectImage (magic bytes)', () => {
  it('PNG, JPEG, WEBP taniladi', () => {
    expect(detectImage(PNG)?.ext).toBe('png');
    expect(detectImage(JPG)?.ext).toBe('jpg');
    expect(detectImage(WEBP)?.ext).toBe('webp');
  });

  it.each([
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
    ['GIF', Buffer.from('GIF89a')],
    ['bo\'sh', Buffer.alloc(0)],
    ['RIFF lekin WAVE', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')])],
  ])('rad etiladi: %s', (_, buf) => {
    expect(detectImage(buf)).toBeNull();
  });
});

describe('StorageService (lokal disk)', () => {
  const env = { ...process.env };
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'formo-storage-'));
    process.env.UPLOAD_DIR = dir;
    delete process.env.S3_BUCKET;
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
    process.env = { ...env };
    await rm(dir, { recursive: true, force: true });
  });

  it("tasodifiy nom bilan yozadi, o'z URL'ini taniydi va o'chiradi", async () => {
    const s = new StorageService();
    const url = await s.put('kits/crest', 'png', PNG, 'image/png');
    expect(url).toMatch(/^\/api\/uploads\/kits\/crest\/[0-9a-f-]{36}\.png$/);
    const file = join(dir, ...url.replace('/api/uploads/', '').split('/'));
    expect(readFileSync(file)).toEqual(PNG);
    expect(s.isOwnUrl(url, 'kits/')).toBe(true);
    await s.remove(url);
    expect(existsSync(file)).toBe(false);
  });

  it.each([
    'https://evil.example/kits/crest/00000000-0000-0000-0000-000000000000.png',
    '/api/uploads/../../etc/passwd',
    '/api/uploads/kits/crest/logo.png',
    '/api/uploads/kits/crest/00000000-0000-0000-0000-000000000000.svg',
    '/api/uploads/other/00000000-0000-0000-0000-000000000000.png',
  ])('begona yoki noto\'g\'ri URL: %s', (url) => {
    expect(new StorageService().isOwnUrl(url, 'kits/')).toBe(false);
  });

  it("productionda S3 ham, UPLOAD_DIR ham bo'lmasa — 503 (Railway diski vaqtinchalik)", async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPLOAD_DIR;
    await expect(new StorageService().put('kits/crest', 'png', PNG, 'image/png')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("productionda S3 ham, UPLOAD_DIR ham bo'lmasa — fayl bazada saqlanadi, o'qiladi va o'chiriladi", async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPLOAD_DIR;
    const rows = new Map<string, { key: string; contentType: string; data: Buffer }>();
    const prisma = {
      storedFile: {
        create: async ({ data }: { data: { key: string; contentType: string; data: Buffer } }) => rows.set(data.key, data),
        findUnique: async ({ where }: { where: { key: string } }) => rows.get(where.key) ?? null,
        deleteMany: async ({ where }: { where: { key: string } }) => rows.delete(where.key),
      },
    };
    const s = new StorageService(prisma as never);
    expect(s.driver).toBe('db');

    const url = await s.put('avatars', 'png', PNG, 'image/png');
    expect(url).toMatch(/^\/api\/uploads\/avatars\/[0-9a-f-]{36}\.png$/);
    const key = url.replace('/api/uploads/', '');
    expect(await s.read(key)).toEqual({ contentType: 'image/png', data: PNG });
    expect(await s.read('../etc/passwd')).toBeNull();

    await s.remove(url);
    expect(await s.read(key)).toBeNull();
  });

  it("keyin UPLOAD_DIR yoqilsa ham bazadagi eski fayl o'qiladi va o'chiriladi", async () => {
    const key = 'avatars/00000000-0000-0000-0000-000000000000.png';
    const rows = new Map([[key, { key, contentType: 'image/png', data: PNG }]]);
    const prisma = {
      storedFile: {
        findUnique: async ({ where }: { where: { key: string } }) => rows.get(where.key) ?? null,
        deleteMany: async ({ where }: { where: { key: string } }) => rows.delete(where.key),
      },
    };
    const s = new StorageService(prisma as never);
    expect(s.driver).toBe('local');
    expect(await s.read(key)).toEqual({ contentType: 'image/png', data: PNG });
    await s.remove(`/api/uploads/${key}`);
    expect(rows.has(key)).toBe(false);
  });
});
