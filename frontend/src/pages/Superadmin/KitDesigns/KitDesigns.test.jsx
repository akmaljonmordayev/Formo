import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SuperadminKitDesigns from './index';
import { kitDesignsApi } from '../../../features/kits/kitsApi';

// jsdom'da WebGL yo'q — viewer sahna API'sini soxta beradi (snapshot → data URL)
vi.mock('@formo/kit-3d/react', async () => {
  const { useEffect } = await import('react');
  return {
    default: function FakeViewer({ onReady }) {
      useEffect(() => {
        onReady?.({ update: vi.fn(), setView: vi.fn(), snapshot: () => 'data:image/png;base64,AAAA' });
      }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return <div data-testid="viewer" />;
    },
  };
});
vi.mock('../../../features/kits/kitsApi', () => ({
  kitDesignsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
    setThumbnail: vi.fn(),
  },
}));
// jsdom'da canvas yo'q — kichik rasm yasash soxta
vi.mock('./thumbnail', () => ({ makeThumbnail: vi.fn(async () => new Blob(['png'], { type: 'image/png' })) }));

const row = (over = {}) => ({
  id: 1,
  isActive: false,
  sortOrder: 1,
  thumbnailUrl: '/api/uploads/kits/thumb/a.png',
  design: { designVersion: 1, name: 'Oqim', primaryColor: '#1f6f8b', secondaryColor: '#0b1d2a', textColor: '#e3c27a', pattern: 'fade', neck: 'round', sponsorText: 'KARVON', backTopText: '' },
  ...over,
});

describe('3D formalar sahifasi', () => {
  beforeEach(() => {
    Object.values(kitDesignsApi).forEach((fn) => fn.mockReset());
  });

  it("bo'sh holat", async () => {
    kitDesignsApi.list.mockResolvedValue([]);
    render(<SuperadminKitDesigns />);
    expect(await screen.findByText(/Hali dizayn yo'q/)).toBeInTheDocument();
  });

  it('xato holati va qayta urinish', async () => {
    kitDesignsApi.list.mockRejectedValueOnce(new Error('Server ishlamayapti')).mockResolvedValueOnce([row()]);
    render(<SuperadminKitDesigns />);
    expect(await screen.findByText('Server ishlamayapti')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }));
    expect(await screen.findByText('Oqim')).toBeInTheDocument();
  });

  it("ro'yxat: kichik rasm, nashr tugmasi dizaynni nashr qiladi", async () => {
    kitDesignsApi.list.mockResolvedValue([row()]);
    kitDesignsApi.update.mockResolvedValue(row({ isActive: true }));
    render(<SuperadminKitDesigns />);
    const img = await screen.findByAltText('Oqim');
    expect(img.getAttribute('src')).toContain('/api/uploads/kits/thumb/a.png');
    fireEvent.click(screen.getByRole('button', { name: 'Nashr qilish' }));
    await waitFor(() => expect(kitDesignsApi.update).toHaveBeenCalledWith(1, { isActive: true }));
  });

  it("o'chirish faqat tasdiqlangandan keyin", async () => {
    kitDesignsApi.list.mockResolvedValue([row()]);
    kitDesignsApi.remove.mockResolvedValue({});
    render(<SuperadminKitDesigns />);
    fireEvent.click(await screen.findByRole('button', { name: "O'chirish" }));
    expect(kitDesignsApi.remove).not.toHaveBeenCalled();
    expect(screen.getByText(/ilovadan yo'qoladi/)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: "O'chirish" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(kitDesignsApi.remove).toHaveBeenCalledWith(1));
  });

  it("yangi dizayn: yaratiladi, kichik rasm yuklanadi, ro'yxatga qaytadi", async () => {
    kitDesignsApi.list.mockResolvedValue([]);
    kitDesignsApi.create.mockResolvedValue(row({ id: 7 }));
    kitDesignsApi.setThumbnail.mockResolvedValue(row({ id: 7 }));
    render(<SuperadminKitDesigns />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Yangi dizayn' }));
    fireEvent.change(screen.getByPlaceholderText('Oqim 2026'), { target: { value: 'Yangi forma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nashr qilish' }));
    await waitFor(() => expect(kitDesignsApi.create).toHaveBeenCalled());
    expect(kitDesignsApi.create.mock.calls[0][0]).toMatchObject({ isActive: true, design: { name: 'Yangi forma', designVersion: 1 } });
    await waitFor(() => expect(kitDesignsApi.setThumbnail).toHaveBeenCalledWith(7, expect.any(Blob)));
    expect(await screen.findByRole('button', { name: '+ Yangi dizayn' })).toBeInTheDocument();
  });

  it("saqlash xatosi tahrirlovchida ko'rinadi, ma'lumot yo'qolmaydi", async () => {
    kitDesignsApi.list.mockResolvedValue([row()]);
    kitDesignsApi.update.mockRejectedValue(new Error("Asosiy rang #rrggbb ko'rinishida bo'lishi kerak"));
    render(<SuperadminKitDesigns />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tahrirlash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));
    expect(await screen.findByText(/#rrggbb/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Oqim')).toBeInTheDocument();
  });
});
