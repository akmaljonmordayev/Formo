/**
 * Mavjud klublarga Forma 360° id'sini qo'yadi (src/kits/kit360.ts → kit360IdFor): nom yoki kod bo'yicha.
 *
 *   pnpm --filter @formo/backend kit360:backfill
 *
 * Idempotent: kit360Id allaqachon qo'yilgan klublar va band id'lar o'zgartirilmaydi. Bitta id'ga bir nechta
 * klub mos kelsa (turli mavsumlar) — faol va eng yangi mavsumli bittasi oladi, qolganlari null qoladi.
 * Kim nima olgani logga chiqadi.
 */
import { PrismaClient } from '@prisma/client';
import { KIT360_IDS, pickKit360Owners } from '../src/kits/kit360';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.club.findMany({
      select: { id: true, name: true, code: true, season: true, isActive: true, kit360Id: true },
    });
    for (const r of rows.filter((x) => x.kit360Id)) console.log(`= ${r.kit360Id}: #${r.id} ${r.name} (${r.season}) — allaqachon`);
    const owners = pickKit360Owners(rows);
    for (const [id, club] of owners) {
      await prisma.club.update({ where: { id: club.id }, data: { kit360Id: id } });
      console.log(`+ ${id}: #${club.id} ${club.name} (${club.season}, ${club.code})`);
    }
    const linked = new Set([...rows.map((r) => r.kit360Id), ...owners.keys()].filter(Boolean));
    const missing = KIT360_IDS.filter((id) => !linked.has(id));
    console.log(`Qo'yildi: ${owners.size}. Bog'lanmagan id'lar: ${missing.length ? missing.join(', ') : "yo'q"}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
