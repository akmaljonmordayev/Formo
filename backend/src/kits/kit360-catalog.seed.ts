import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ClubType, Continent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KIT360_CATALOG, pickKit360Owners } from './kit360';

const SEASON = '2026/27';

/**
 * Forma 360° jamoalari mobil ilovada sotuvda bo'lishi uchun katalogda bog'langan klub va faol forma kerak.
 * Ilova ishga tushganda (idempotent):
 *   1) kit360Id bo'sh klublar nom/kod bo'yicha bog'lanadi (scripts/backfill-kit360.ts bilan bir xil);
 *   2) hech bir klubga bog'lanmagan jamoa uchun klub + "Uy" formasi yaratiladi;
 *   3) bog'langan klubda faol forma bo'lmasa — "Uy" formasi qo'shiladi.
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

    for (const team of KIT360_CATALOG) {
      const linked = await this.prisma.club.findUnique({
        where: { kit360Id: team.id },
        select: { id: true, name: true, kits: { where: { isActive: true }, select: { id: true }, take: 1 } },
      });
      if (linked) {
        if (!linked.kits.length) {
          await this.prisma.kit.create({ data: { clubId: linked.id, ...this.kitData(team) } });
          this.logger.log(`Forma 360° ${team.id}: #${linked.id} ${linked.name} klubiga "Uy" formasi qo'shildi`);
        }
        continue;
      }
      const sameName = await this.prisma.club.findUnique({ where: { name_season: { name: team.name, season: SEASON } } });
      if (sameName) {
        this.logger.warn(`Forma 360° ${team.id}: "${team.name}" (${SEASON}) boshqa id bilan bog'langan — o'tkazib yuborildi`);
        continue;
      }
      const category =
        (await this.prisma.category.findFirst({ where: { slug: team.category.slug } })) ??
        (await this.prisma.category.create({ data: { ...team.category, sortOrder: 50 } }));
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
