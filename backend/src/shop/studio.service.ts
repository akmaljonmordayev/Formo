import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_STUDIO_PRICES,
  Design,
  FONT_IDS,
  GRADIENT_IDS,
  PACKAGE_IDS,
  PATCH_IDS,
  SOLID_COLOR_IDS,
  STUDIO_PRICE_KEYS,
  StudioPrices,
  TEXT_COLOR_IDS,
  TEXT_EFFECTS,
  TextEffect,
} from './studio';

type Db = PrismaService | Prisma.TransactionClient;
type Toggles = Record<string, boolean>;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Superadmin "Dizayn studiyasi" (`studio.config`) va "Narxlar" (`studio.*`) ni savatga ulaydi */
@Injectable()
export class StudioService {
  constructor(private readonly prisma: PrismaService) {}

  async prices(db: Db = this.prisma): Promise<StudioPrices> {
    const rows = await db.pricingItem.findMany({ where: { key: { in: Object.values(STUDIO_PRICE_KEYS) } } });
    const byKey = new Map(rows.map((r) => [r.key, r.price]));
    return {
      custom: byKey.get(STUDIO_PRICE_KEYS.custom) ?? DEFAULT_STUDIO_PRICES.custom,
      gradient: byKey.get(STUDIO_PRICE_KEYS.gradient) ?? DEFAULT_STUDIO_PRICES.gradient,
      patch: byKey.get(STUDIO_PRICE_KEYS.patch) ?? DEFAULT_STUDIO_PRICES.patch,
      gift: byKey.get(STUDIO_PRICE_KEYS.gift) ?? DEFAULT_STUDIO_PRICES.gift,
      shorts: byKey.get(STUDIO_PRICE_KEYS.shorts) ?? DEFAULT_STUDIO_PRICES.shorts,
    };
  }

  private async toggles(db: Db) {
    const row = await db.setting.findUnique({ where: { key: 'studio.config' } });
    const cfg = row?.value && typeof row.value === 'object' && !Array.isArray(row.value) ? (row.value as Record<string, unknown>) : {};
    const map = (v: unknown): Toggles => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Toggles) : {});
    return {
      solid: map(cfg.solidToggles),
      gradient: map(cfg.gradientToggles),
      font: map(cfg.fontToggles),
      patch: map(cfg.patchToggles),
      pkg: map(cfg.packageToggles),
      custom: cfg.customColorToggle !== false,
    };
  }

  /** Saqlanmagan id yoqilgan hisoblanadi (Superadmin faqat o'chirganlarini belgilaydi) */
  private enabled<T extends string>(ids: readonly T[], toggles: Toggles) {
    return ids.filter((id) => toggles[id] !== false);
  }

  /** Mobil ilova uchun: yoqilgan tanlovlar va narxlar (`GET /app/config` → `studio`) */
  async publicConfig(db: Db = this.prisma) {
    const [t, prices] = await Promise.all([this.toggles(db), this.prices(db)]);
    return {
      prices,
      colors: {
        solid: this.enabled(SOLID_COLOR_IDS, t.solid),
        gradient: this.enabled(GRADIENT_IDS, t.gradient),
        custom: t.custom,
      },
      fonts: this.enabled(FONT_IDS, t.font),
      patches: this.enabled(PATCH_IDS, t.patch),
      packages: this.enabled(PACKAGE_IDS, t.pkg),
      textColors: [...TEXT_COLOR_IDS],
      textEffects: [...TEXT_EFFECTS],
    };
  }

  /** Mijoz yuborgan tanlovni tekshiradi va faqat ma'lum maydonlar bilan qaytaradi (400 — yoqilmagan/noma'lum tanlov) */
  async validate(input: unknown, db: Db = this.prisma): Promise<Design> {
    if (!input || typeof input !== 'object') throw new BadRequestException('Dizayn tanlovi noto‘g‘ri');
    const raw = input as {
      color?: { type?: string; id?: string; hex?: string };
      font?: string;
      patch?: string | null;
      package?: string;
      textColor?: string | null;
      textEffect?: string;
    };
    const cfg = await this.publicConfig(db);

    const type = raw.color?.type;
    let color: Design['color'];
    if (type === 'solid' && cfg.colors.solid.includes(raw.color?.id as never)) {
      color = { type, id: raw.color!.id };
    } else if (type === 'gradient' && cfg.colors.gradient.includes(raw.color?.id as never)) {
      color = { type, id: raw.color!.id };
    } else if (type === 'custom' && cfg.colors.custom && HEX.test(raw.color?.hex ?? '')) {
      color = { type, hex: raw.color!.hex!.toLowerCase() };
    } else {
      throw new BadRequestException('Bu rangni tanlab bo‘lmaydi');
    }

    const font = raw.font ?? cfg.fonts[0];
    if (!cfg.fonts.includes(font as never)) throw new BadRequestException('Bu shriftni tanlab bo‘lmaydi');

    const patch = raw.patch ?? null;
    if (patch && !cfg.patches.includes(patch as never)) throw new BadRequestException('Bu yamoqni tanlab bo‘lmaydi');

    const pkg = raw.package ?? cfg.packages[0];
    if (!cfg.packages.includes(pkg as never)) throw new BadRequestException('Bu paketni tanlab bo‘lmaydi');

    const textColor = raw.textColor ?? null;
    if (textColor !== null && !TEXT_COLOR_IDS.includes(textColor as never)) throw new BadRequestException('Bu yozuv rangini tanlab bo‘lmaydi');

    const textEffect = (raw.textEffect ?? 'none') as TextEffect;
    if (!TEXT_EFFECTS.includes(textEffect)) throw new BadRequestException('Bu yozuv effektini tanlab bo‘lmaydi');

    // Eski savat qatorlari bilan bir xil JSON bo'lsin: standart qiymatlar saqlanmaydi
    return { color, font, patch, package: pkg, ...(textColor && { textColor }), ...(textEffect !== 'none' && { textEffect }) };
  }
}
