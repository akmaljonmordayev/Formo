import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';
import { PrismaService } from '../prisma/prisma.service';

/** Lokal rejimda fayllar shu yo'lda beriladi (global "api" prefiksi ostida — Vite proxy va mobil BASE_URL bilan ishlaydi) */
export const LOCAL_UPLOADS_ROUTE = '/api/uploads';

export const uploadDir = () => resolve(process.env.UPLOAD_DIR || 'uploads');

/** Fayl kaliti: papka/UUID.kengaytma — yo'l aylanib o'tishga (../) yo'l qo'ymaydi */
const FILE_KEY = /^[a-z0-9/-]+\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

/**
 * Yuklangan fayllar:
 *  - S3_BUCKET berilgan bo'lsa — S3-mos xotira (AWS S3, Cloudflare R2, MinIO). URL: S3_PUBLIC_URL/<kalit>
 *  - aks holda — lokal disk (UPLOAD_DIR, standart ./uploads). URL: /api/uploads/<kalit>
 * Productionda lokal disk faqat UPLOAD_DIR aniq berilganda (doimiy volume) — aks holda Railway qayta
 * deploy qilganda fayllar yo'qolardi, shuning uchun fayl bazada (StoredFile) saqlanadi; URL o'sha
 * /api/uploads/<kalit>, uni UploadsController beradi.
 * Fayl nomlari tasodifiy (UUID); foydalanuvchi bergan nom hech qayerda ishlatilmaydi.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket = process.env.S3_BUCKET || '';
  private readonly publicBase = (process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '');

  constructor(@Optional() private readonly prisma?: PrismaService) {
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

  /** S3 ham, doimiy disk ham yo'q production — fayllar bazada */
  private get inDb(): boolean {
    return !this.s3 && process.env.NODE_ENV === 'production' && !process.env.UPLOAD_DIR;
  }

  get driver(): 's3' | 'local' | 'db' {
    return this.s3 ? 's3' : this.inDb ? 'db' : 'local';
  }

  private assertConfigured() {
    if (!this.inDb || this.prisma) return;
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
    if (this.prisma && this.inDb) {
      await this.prisma.storedFile.create({ data: { key, contentType, data: body } });
      return `${LOCAL_UPLOADS_ROUTE}/${key}`;
    }
    const file = join(uploadDir(), ...key.split('/'));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, body);
    return `${LOCAL_UPLOADS_ROUTE}/${key}`;
  }

  /** Bazada saqlangan fayl (UploadsController uchun); kalit noto'g'ri yoki fayl yo'q bo'lsa — null */
  // Joriy drayverdan qat'iy nazar: S3 yoki UPLOAD_DIR keyinroq yoqilsa ham bazadagi eski fayllar ochilaversin
  async read(key: string): Promise<{ contentType: string; data: Buffer } | null> {
    if (!this.prisma || !FILE_KEY.test(key)) return null;
    const row = await this.prisma.storedFile.findUnique({ where: { key } });
    return row ? { contentType: row.contentType, data: Buffer.from(row.data) } : null;
  }

  /** URL shu xotira bergan faylmi (boshqa saytdagi rasm dizaynga qo'yilmasin) */
  isOwnUrl(url: string, prefix = ''): boolean {
    const base = this.s3 ? this.publicBase : LOCAL_UPLOADS_ROUTE;
    const rest = url.startsWith(`${base}/`) ? url.slice(base.length + 1) : null;
    return Boolean(rest && rest.startsWith(prefix) && FILE_KEY.test(rest));
  }

  /** O'chirish — xato bo'lsa faqat log (asosiy amal to'xtamasin) */
  async remove(url: string | null | undefined) {
    if (!url) return;
    const localKey = url.startsWith(`${LOCAL_UPLOADS_ROUTE}/`) ? url.slice(LOCAL_UPLOADS_ROUTE.length + 1) : null;
    // Drayver almashgandan keyin ham bazada qolgan eski fayl o'chiriladi (yetim qator qolmasin)
    if (this.s3 && localKey && FILE_KEY.test(localKey)) {
      await this.prisma?.storedFile.deleteMany({ where: { key: localKey } }).catch(() => undefined);
      return;
    }
    if (!this.isOwnUrl(url)) return;
    const base = this.s3 ? this.publicBase : LOCAL_UPLOADS_ROUTE;
    const key = url.slice(base.length + 1);
    try {
      if (this.s3) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } else if (this.prisma) {
        // db rejimi yoki UPLOAD_DIR keyin yoqilgan — bazadagi nusxa ham (bo'lsa) o'chadi
        await this.prisma.storedFile.deleteMany({ where: { key } });
        if (!this.inDb) await this.unlinkLocal(key);
      } else {
        await this.unlinkLocal(key);
      }
    } catch (err) {
      this.logger.warn(`Faylni o'chirib bo'lmadi: ${key} (${(err as Error).message})`);
    }
  }

  private async unlinkLocal(key: string) {
    const root = uploadDir();
    const file = resolve(root, ...key.split('/'));
    if (file.startsWith(root + sep)) await unlink(file).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }
}
