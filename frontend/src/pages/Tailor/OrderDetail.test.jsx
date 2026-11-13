import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import OrderCard from './OrderCard';
import OrderDetail from './OrderDetail';
import { orderToQueueItem } from './tailorApi';

// Klub nomi Forma 360° jamoalariga mos kelmaydi — surat (canvas) o'rniga oddiy maket chiziladi
const line = (extra) => ({
  id: 1, clubName: 'Mahalla FK', kitLabel: 'Uy', printName: 'ALI', printNumber: '7', shirtSize: 'L', shortsSize: 'M',
  quantity: 1, withShorts: true, numberOnShorts: false, shortsNumber: null, sleeve: 'SHORT', bottom: 'SHORTS', ...extra,
});
const order = orderToQueueItem({
  id: 5, code: 'F-005', status: 'ACCEPTED', customerName: 'Ali Valiyev', deliveryAddress: 'Toshkent, Chilonzor', comment: 'Tezroq',
  items: [line(), line({ id: 2, printName: 'VALI', printNumber: '10', sleeve: 'LONG', bottom: 'PANTS', numberOnShorts: true, shortsNumber: '10', quantity: 2 })],
});

describe('Tailor buyurtma ko‘rinishi', () => {
  it("kartada har forma o'z pastki qism holati bilan ko'rinadi", () => {
    render(<OrderCard order={order} index={1} bucket="today" onOpen={() => {}} />);
    expect(screen.getByText('Shortik · raqamsiz')).toBeInTheDocument();
    expect(screen.getByText('Shalvar · raqam 10')).toBeInTheDocument();
    expect(screen.getByText('2 xil forma')).toBeInTheDocument();
  });

  it("tafsilotda shalvarli formaga o'tilganda shalvar ma'lumotlari chiqadi; manzil qo'shimcha so'rovsiz", () => {
    render(<OrderDetail order={order} />);
    expect(screen.getByText('Shortikda raqam')).toBeInTheDocument();
    expect(screen.queryByText('Shalvarda raqam')).toBeNull();
    expect(screen.getByText('Toshkent, Chilonzor')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(screen.getByText('Shalvarda raqam')).toBeInTheDocument();
    expect(screen.getByText('Bor · 10')).toBeInTheDocument();
    expect(screen.getByText('Uzun yeng')).toBeInTheDocument();
    expect(screen.getByText("SHALVAR O'LCHAMI")).toBeInTheDocument();
  });
});
