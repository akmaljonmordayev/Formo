import { describe, expect, it } from 'vitest';
import { Navigate } from 'react-router-dom';
import { superadminMenu, superadminRoutes } from './routes';
import { TEAMS } from './Kit360';

describe('Formalar — eski katalog o‘rniga Forma 360°', () => {
  it("menyuda 'Katalog', klublar va kategoriyalar yo'q; Formalar guruhi Forma 360° dan boshlanadi", () => {
    expect(superadminMenu.some((m) => m.group === 'Katalog')).toBe(false);
    expect(superadminMenu.some((m) => /\/(clubs|categories)$/.test(m.to))).toBe(false);
    const forms = superadminMenu.filter((m) => m.group === 'Formalar');
    expect(forms[0]).toMatchObject({ to: '/superadmin/kit-360', label: 'Forma 360°' });
  });

  it('eski havolalar (clubs, categories) Forma 360° ga yo‘naltiriladi', () => {
    for (const path of ['clubs', 'categories']) {
      const route = superadminRoutes.find((r) => r.path === path);
      expect(route.element.type).toBe(Navigate);
      expect(route.element.props).toMatchObject({ to: '/superadmin/kit-360', replace: true });
    }
  });

  it('har klub/terma jamoaga bitta forma: 5 terma jamoa va 5 klub', () => {
    expect(TEAMS).toHaveLength(10);
    expect(new Set(TEAMS.map((t) => t.id)).size).toBe(10);
    expect(TEAMS.filter((t) => t.kind === 'national').map((t) => t.id)).toEqual(['es', 'ar', 'fr', 'en', 'pt']);
    expect(TEAMS.filter((t) => t.kind === 'club').map((t) => t.id)).toEqual(['rm', 'fcb', 'mu', 'psg', 'mci']);
  });
});
