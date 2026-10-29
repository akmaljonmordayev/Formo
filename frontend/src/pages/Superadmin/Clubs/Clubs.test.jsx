import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SuperadminClubs from '.';
import { LangProvider } from '../i18n';

const json = (status, body) => ({ ok: status < 300, status, json: async () => body });

const kit = (id, label) => ({ id, label, bgColor: '#fff', textColor: '#000', shirtPrice: 99000, shortsPrice: 60000, printPrice: 30000, sizes: ['M'], isActive: true });
const CLUBS = [
  { id: 1, name: 'Real Madrid', code: 'RM', markColor: '#000', season: '2026/27', type: 'CLUB', categoryId: 1, league: 'LaLiga', isActive: true, sold: 4, kits: [kit(11, 'Uy'), kit(12, 'Mehmon'), kit(13, 'Uchinchi')] },
  { id: 2, name: "O'zbekiston", code: 'UZ', markColor: '#00f', season: '2026', type: 'NATIONAL', continent: 'ASIA', league: 'Osiyo terma jamoalari', isActive: true, sold: 1, kits: [kit(21, 'Uy')] },
];

function mockBackend({ rejectTypeFilter = false } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      // frontend/.env'dagi VITE_API_URL tufayli api() to'liq URL yasaydi (http://localhost:3001/api/...) —
      // host qismini olib tashlab, faqat yo'l bilan solishtiramiz
      const [rawPath, query = ''] = url.replace(/^https?:\/\/[^/]+/, '').split('?');
      const path = rawPath;
      const params = new URLSearchParams(query);
      if (path === '/api/admin/categories') return json(200, [{ id: 1, name: 'LaLiga', clubsCount: 1 }]);
      if (path === '/api/admin/pricing')
        return json(200, [
          { key: 'club.tshirt', price: 120000 },
          { key: 'club.shorts', price: 50000 },
          { key: 'club.print', price: 25000 },
        ]);
      if (path === '/api/admin/clubs') {
        if (rejectTypeFilter && params.has('type')) return json(400, { message: 'property type should not exist' });
        // Eski backend kabi: filtrni e'tiborsiz qoldirib hammasini qaytaradi
        return json(200, { items: CLUBS, total: CLUBS.length, page: 1, limit: 100 });
      }
      return json(200, {});
    }),
  );
}

const renderPage = () =>
  render(
    <LangProvider>
      <SuperadminClubs />
    </LangProvider>,
  );

describe('Superadmin · Klublar va formalar', () => {
  it("klub ligalarida terma jamoa ko'rinmaydi, terma jamoalar bo'limida — aksincha", async () => {
    mockBackend();
    renderPage();
    expect(await screen.findByText('Real Madrid')).toBeInTheDocument();
    expect(screen.queryByText("O'zbekiston")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Milliy terma jamoalar' }));
    expect(await screen.findByText("O'zbekiston")).toBeInTheDocument();
    expect(screen.queryByText('Real Madrid')).not.toBeInTheDocument();
  });

  it("eski backend type filtrini rad etsa (400) — xato ko'rsatilmaydi, filtrsiz yuklanadi", async () => {
    mockBackend({ rejectTypeFilter: true });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Milliy terma jamoalar' }));
    expect(await screen.findByText("O'zbekiston")).toBeInTheDocument();
    expect(screen.queryByText(/should not exist/)).not.toBeInTheDocument();
  });

  it("yangi klub: 3 ta standart forma, narxlar API'dagi narx jadvalidan", async () => {
    mockBackend();
    renderPage();
    await screen.findByText('Real Madrid');
    await waitFor(() => expect(screen.getByText(/Standart/)).toHaveTextContent(/195/));

    fireEvent.click(screen.getByRole('button', { name: "+ Klub qo'shish" }));
    const dialog = await screen.findByRole('dialog');
    ['Uy', 'Mehmon', 'Uchinchi'].forEach((l) => expect(within(dialog).getByRole('button', { name: l })).toBeInTheDocument());
    expect(within(dialog).queryByRole('button', { name: '+ Forma' })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Futbolka (so'm)")).toHaveValue(120000);
    expect(screen.getByLabelText("Shortik (so'm)")).toHaveValue(50000);
    expect(screen.getByLabelText("Ism + raqam (so'm)")).toHaveValue(25000);
  });

  it("til almashtirilganda (ru) matnlar tarjima qilinadi", async () => {
    localStorage.setItem('formo_admin_lang', 'ru');
    mockBackend();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Клубы и формы' })).toBeInTheDocument();
    localStorage.removeItem('formo_admin_lang');
  });
});
