import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';

/** Lokal rejimda fayllar shu yo'lda beriladi (global "api" prefiksi ostida — Vite proxy va mobil BASE_URL bilan ishlaydi) */
export const LOCAL_UPLOADS_ROUTE = '/api/uploads';

export const uploadDir = () => resolve(process.env.UPLOAD_DIR || 'uploads');

/**
 * Yuklangan fayllar:
 *  - S3_BUCKET berilgan bo'lsa — S3-mos xotira (AWS S3, Cloudflare R2, MinIO). URL: S3_PUBLIC_URL/<kalit>
 *  - aks holda — lokal disk (UPLOAD_DIR, standart ./uploads). URL: /api/uploads/<kalit>
 * Productionda lokal disk faqat UPLOAD_DIR aniq berilganda (doimiy volume) — aks holda Railway qayta
 * deploy qilganda fayllar yo'qolardi, shuning uchun yuklash 503 qaytaradi.
 * Fayl nomlari tasodifiy (UUID); foydalanuvchi bergan nom hech qayerda ishlatilmaydi.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket = process.env.S3_BUCKET || '';
  private readonly publicBase = (process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '');

  constructor() {
    this.s3 = this.bucket
      ? new S3Client({
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
          credentials:
            process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
              ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
              : undefined,
        })
      : null;
  }

  get driver(): 's3' | 'local' {
    return this.s3 ? 's3' : 'local';
  }

  private assertConfigured() {
    if (this.s3 || process.env.NODE_ENV !== 'production' || process.env.UPLOAD_DIR) return;
    throw new ServiceUnavailableException('Fayl saqlash sozlanmagan (S3_BUCKET yoki UPLOAD_DIR)');
  }

  /** Faylni saqlaydi va ochiq URL qaytaradi. prefix — papka ("kits/crest") */
  async put(prefix: string, ext: string, body: Buffer, contentType: string): Promise<string> {
    this.assertConfigured();
    const key = `${prefix}/${randomUUID()}.${ext}`;
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return `${this.publicBase}/${key}`;
    }
    const file = join(uploadDir(), ...key.split('/'));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, body);
    return `${LOCAL_UPLOADS_ROUTE}/${key}`;
  }

  /** URL shu xotira bergan faylmi (boshqa saytdagi rasm dizaynga qo'yilmasin) */
  isOwnUrl(url: string, prefix = ''): boolean {
    const base = this.s3 ? this.publicBase : LOCAL_UPLOADS_ROUTE;
    const rest = url.startsWith(`${base}/`) ? url.slice(base.length + 1) : null;
    return Boolean(rest && rest.startsWith(prefix) && /^[a-z0-9/-]+\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(rest));
  }

  /** O'chirish — xato bo'lsa faqat log (asosiy amal to'xtamasin) */
  async remove(url: string | null | undefined) {
    if (!url || !this.isOwnUrl(url)) return;
    const base = this.s3 ? this.publicBase : LOCAL_UPLOADS_ROUTE;
    const key = url.slice(base.length + 1);
    try {
      if (this.s3) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } else {
        const root = uploadDir();
        const file = resolve(root, ...key.split('/'));
        if (file.startsWith(root + sep)) await unlink(file);
      }
    } catch (err) {
      this.logger.warn(`Faylni o'chirib bo'lmadi: ${key} (${(err as Error).message})`);
    }
  }
}
