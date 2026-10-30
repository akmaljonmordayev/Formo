import { KIT360_IDS, kit360IdFor, pickKit360Owners } from './kit360';

describe('kit360IdFor — klub nomi/kodi → Forma 360° id', () => {
  it.each([
    ['es', ['Ispaniya', 'Испания', 'Spain']],
    ['ar', ['Argentina', 'Аргентина']],
    ['fr', ['Fransiya', 'Франция', 'France']],
    ['en', ['Angliya', 'Англия', 'England']],
    ['pt', ['Portugaliya', 'Португалия', 'Portugal']],
    ['rm', ['Real Madrid', 'Реал Мадрид', '  real   MADRID ']],
    ['fcb', ['Barselona', 'Барселона', 'FC Barcelona']],
    ['mu', ['Manchester Yunayted', 'Манчестер Юнайтед', 'Manchester United']],
    ['psg', ['PSJ', 'ПСЖ', 'Paris Saint-Germain']],
    ['mci', ['Manchester Siti', 'Манчестер Сити', 'Manchester City']],
  ])('%s: lotin, kirill, inglizcha', (id, names) => {
    for (const name of names) expect(kit360IdFor(name)).toBe(id);
  });

  it("kod bo'yicha (nom notanish bo'lsa)", () => {
    expect(kit360IdFor('Los Blancos', 'RM')).toBe('rm');
    expect(kit360IdFor('', 'FCB')).toBe('fcb');
    expect(kit360IdFor(null, 'MCI')).toBe('mci');
  });

  it("notanish klub — null", () => {
    expect(kit360IdFor('Paxtakor', 'PAK')).toBeNull();
    expect(kit360IdFor('Braziliya', 'BR')).toBeNull();
    expect(kit360IdFor(undefined)).toBeNull();
  });

  it('10 ta id', () => {
    expect(KIT360_IDS).toEqual(['es', 'ar', 'fr', 'en', 'pt', 'rm', 'fcb', 'mu', 'psg', 'mci']);
  });
});

describe("pickKit360Owners — backfill: bitta id'ga bitta klub", () => {
  const club = (id: number, name: string, season: string, isActive = true, kit360Id: string | null = null) => ({
    id,
    name,
    code: '',
    season,
    isActive,
    kit360Id,
  });

  it('faol va eng yangi mavsumli klub oladi, qolganlari null qoladi', () => {
    const owners = pickKit360Owners([
      club(1, 'Real Madrid', '2025/26'),
      club(2, 'Real Madrid', '2026/27'),
      club(3, 'Реал Мадрид', '2027/28', false),
      club(4, 'Barselona', '2026/27'),
    ]);
    expect(owners.get('rm')?.id).toBe(2);
    expect(owners.get('fcb')?.id).toBe(4);
    expect(owners.size).toBe(2);
  });

  it("band id va allaqachon bog'langan klubga tegilmaydi (idempotent)", () => {
    const owners = pickKit360Owners([club(1, 'Real Madrid', '2026/27', true, 'rm'), club(2, 'Real Madrid', '2027/28')]);
    expect(owners.has('rm')).toBe(false);
  });
});
