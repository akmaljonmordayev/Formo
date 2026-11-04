import { OrderStatus as S } from '@prisma/client';
import { customerStageChanged, customerStageOf, STATUS_LABEL } from './order-status';

describe('mijoz bosqichlari (yuborildi → qabul qilindi → jarayonda → yetkazilmoqda)', () => {
  it('sex ichki holatlari mijozga bitta "jarayonda" bosqichi', () => {
    for (const s of [S.ACCEPTED, S.PRINTING, S.QUALITY_CHECK, S.READY]) {
      expect(customerStageOf(s)).toBe(2);
      expect(STATUS_LABEL[s]).toBe('Buyurtma jarayonda');
    }
    expect(STATUS_LABEL.NEW).toBe('Buyurtma yuborildi');
    expect(STATUS_LABEL.SENT_TO_WORKSHOP).toBe('Buyurtma qabul qilindi');
    expect(STATUS_LABEL.DELIVERING).toBe('Yetkazilmoqda');
    expect(customerStageOf(S.CANCELLED)).toBe(-1);
  });

  it('xabar faqat bosqich oldinga siljisa yoki bekor/qaytarilsa', () => {
    expect(customerStageChanged(S.PENDING_PAYMENT, S.NEW)).toBe(true);
    expect(customerStageChanged(S.NEW, S.SENT_TO_WORKSHOP)).toBe(true);
    expect(customerStageChanged(S.SENT_TO_WORKSHOP, S.ACCEPTED)).toBe(true);
    expect(customerStageChanged(S.ACCEPTED, S.READY)).toBe(false);
    expect(customerStageChanged(S.READY, S.DELIVERING)).toBe(true);
    // sex rad etdi — buyurtma operatorga qaytadi, mijozga ortga ketgan xabar yuborilmaydi
    expect(customerStageChanged(S.SENT_TO_WORKSHOP, S.NEW)).toBe(false);
    expect(customerStageChanged(S.ACCEPTED, S.CANCELLED)).toBe(true);
    expect(customerStageChanged(null, S.NEW)).toBe(true);
  });
});
