import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ClubType, Continent, KitBottom, KitSleeve } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KIT360_CATALOG, KIT360_LONG_IDS, pickKit360Owners } from './kit360';

const SEASON = '2026/27';
/** Yashirin jamoalarni ochish bir marta bajariladi: keyin admin yashirgan klub qayta ochilmaydi */
const REVEAL_KEY = 'kit360.catalog.revealed.v1';
/** Uzun yengli formalar har jamoaga bir marta qo'shiladi ({ done: [id] }): admin o'chirsa qayta yaratilmaydi */
const LONG_KEY = 'kit360.catalog.long.v1';

/**
 * Forma 360° jamoalari mobil ilovada sotuvda bo'lishi uchun katalogda bog'langan klub va faol forma kerak.
 * Ilova ishga tushganda (idempotent):
 *   1) kit360Id bo'sh klublar nom/kod bo'yicha bog'lanadi (scripts/backfill-kit360.ts bilan bir xil);
 *   2) hech bir klubga bog'lanmagan jamoa uchun klub + "Uy" formasi yaratiladi;
 *   3) bog'langan klubda faol forma bo'lmasa — "Uy" formasi qo'shiladi;
 *   4) bir martalik: nofaol klub yoki nofaol kategoriyadagi bog'langan jamoa faollashtiriladi (mijozga ko'rinmasdi).
 * Admin o'zgartirgan narx, nom va bog'lanishlarga tegilmaydi. O'chirish: KIT360_AUTOSEED=false.
 */
@Injectable()
export class Kit360CatalogSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(Kit360CatalogSeed.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.KIT360_AUTOSEED === 'false') return;
    try {
      await this.run();
    } catch (err) {
      // Katalog to'ldirilmasa ham API ishlashda davom etadi
      this.logger.error(`Forma 360° katalogi to'ldirilmadi: ${err instanceof Error ? err.message : err}`);
    }
  }

  async run() {
    const rows = await this.prisma.club.findMany({
      select: { id: true, name: true, code: true, season: true, isActive: true, kit360Id: true },
    });
    for (const [id, club] of pickKit360Owners(rows)) {
      await this.prisma.club.update({ where: { id: club.id }, data: { kit360Id: id } });
      this.logger.log(`Forma 360° bog'landi: ${id} → #${club.id} ${club.name}`);
    }

    const reveal = !(await this.prisma.setting.findUnique({ where: { key: REVEAL_KEY } }));
    let failed = 0;
    // Bitta jamoadagi xato qolganlarini to'xtatmasin
    for (const team of KIT360_CATALOG) {
      try {
        await this.ensureTeam(team, reveal);
      } catch (err) {
        failed += 1;
        this.logger.error(`Forma 360° ${team.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (reveal && !failed) {
      const value = { at: new Date().toISOString() };
      await this.prisma.setting.upsert({ where: { key: REVEAL_KEY }, create: { key: REVEAL_KEY, value }, update: { value } });
    }
    await this.ensureLongKits();
  }

  /**
   * Har jamoa uchun bir martalik: uzun yeng + shalvar suratlari bor jamoaga "Uzun yeng" formasi (asosiy formaning
   * narxi va ranglari bilan). Bajarilgan jamoalar LONG_KEY sozlamasida saqlanadi: admin keyin o'chirsa yoki yashirsa —
   * qayta yaratilmaydi; klubi hali yo'q yoki xato bergan jamoa keyingi ishga tushishda qayta uriniladi.
   */
  async ensureLongKits() {
    const saved = await this.prisma.setting.findUnique({ where: { key: LONG_KEY } });
    const prev = (saved?.value ?? {}) as { done?: unknown };
    const done = new Set<string>(Array.isArray(prev.done) ? (prev.done as string[]) : []);
    const before = done.size;
    for (const id of KIT360_LONG_IDS) {
      if (done.has(id)) continue;
      try {
        const club = await this.prisma.club.findUnique({
          where: { kit360Id: id },
          // Nofaol formalar ham: admin yashirgan uzun yengli forma qayta yaratilmasin
          select: { id: true, kits: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        });
        if (!club) continue;
        if (club.kits.some((k) => k.sleeve === KitSleeve.LONG)) {
          done.add(id);
          continue;
        }
        const base = club.kits.find((k) => k.isActive) ?? club.kits[0];
        const team = KIT360_CATALOG.find((tm) => tm.id === id);
        await this.prisma.kit.create({
          data: {
            clubId: club.id,
            label: base?.label ?? 'Uy',
            bgColor: base?.bgColor ?? team?.bgColor ?? '#ffffff',
            textColor: base?.textColor ?? team?.textColor ?? '#111318',
            colorsLabel: base?.colorsLabel ?? team?.colorsLabel ?? null,
            description: base?.description ?? 'Dry-fit polyester · DTF bosma',
            ...(base && { shirtPrice: base.shirtPrice, printPrice: base.printPrice, sizes: base.sizes }),
            sleeve: KitSleeve.LONG,
            bottom: KitBottom.PANTS,
            sortOrder: (base?.sortOrder ?? 0) + 1,
          },
        });
        done.add(id);
        this.logger.log(`Forma 360° ${id}: #${club.id} klubiga uzun yengli forma qo'shildi`);
      } catch (err) {
        this.logger.error(`Forma 360° ${id} (uzun yeng): ${err instanceof Error ? err.message : err}`);
      }
    }
    if (saved && done.size === before) return;
    const value = { at: new Date().toISOString(), done: [...done] };
    await this.prisma.setting.upsert({ where: { key: LONG_KEY }, create: { key: LONG_KEY, value }, update: { value } });
  }

  private async ensureTeam(team: (typeof KIT360_CATALOG)[number], reveal: boolean) {
    const linked = await this.prisma.club.findUnique({
      where: { kit360Id: team.id },
      select: {
        id: true,
        name: true,
        isActive: true,
        category: { select: { id: true, isActive: true } },
        kits: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
    });
    if (linked) {
      if (!linked.kits.length) {
        await this.prisma.kit.create({ data: { clubId: linked.id, ...this.kitData(team) } });
        this.logger.log(`Forma 360° ${team.id}: #${linked.id} ${linked.name} klubiga "Uy" formasi qo'shildi`);
      }
      if (reveal) {
        if (!linked.isActive) {
          await this.prisma.club.update({ where: { id: linked.id }, data: { isActive: true } });
          this.logger.log(`Forma 360° ${team.id}: #${linked.id} ${linked.name} klubi faollashtirildi`);
        }
        if (linked.category && !linked.category.isActive) await this.activateCategory(linked.category.id);
      }
      return;
    }
    const sameName = await this.prisma.club.findUnique({ where: { name_season: { name: team.name, season: SEASON } } });
    if (sameName) {
      this.logger.warn(`Forma 360° ${team.id}: "${team.name}" (${SEASON}) boshqa id bilan bog'langan — o'tkazib yuborildi`);
      return;
    }
    // Kategoriya nomi ham unikal: slug boshqacha bo'lsa ham bor kategoriya ishlatiladi
    const found = await this.prisma.category.findFirst({ where: { OR: [{ slug: team.category.slug }, { name: team.category.name }] } });
    const category = found ?? (await this.prisma.category.create({ data: { ...team.category, sortOrder: 50 } }));
    // Yangi klub nofaol kategoriyada mijozga ko'rinmay qolmasin
    if (!category.isActive) await this.activateCategory(category.id);
    const club = await this.prisma.club.create({
      data: {
        name: team.name,
        league: category.name,
        categoryId: category.id,
        season: SEASON,
        code: team.code,
        markColor: team.markColor,
        type: team.national ? ClubType.NATIONAL : ClubType.CLUB,
        continent: team.national && team.continent ? Continent[team.continent] : null,
        kit360Id: team.id,
        kits: { create: this.kitData(team) },
      },
    });
    this.logger.log(`Forma 360° ${team.id}: katalogga "${team.name}" klubi qo'shildi (#${club.id})`);
  }

  private async activateCategory(id: number) {
    await this.prisma.category.update({ where: { id }, data: { isActive: true } });
    this.logger.log(`Forma 360°: #${id} kategoriya faollashtirildi`);
  }

  private kitData(team: (typeof KIT360_CATALOG)[number]) {
    return {
      label: 'Uy',
      bgColor: team.bgColor,
      textColor: team.textColor,
      colorsLabel: team.colorsLabel,
      description: 'Dry-fit polyester · DTF bosma',
      sortOrder: 0,
    };
  }
}
