import { OrderStatus } from '@prisma/client';

/** Mobil ilova tillari: o'zbekcha (lotin), yangi alifbo, kirill, ruscha, inglizcha */
export const PUSH_LANGS = ['uz', 'uzn', 'uzc', 'ru', 'en'] as const;
export type PushLang = (typeof PUSH_LANGS)[number];
export const asPushLang = (value?: string | null): PushLang =>
  (PUSH_LANGS as readonly string[]).includes(value ?? '') ? (value as PushLang) : 'uz';

type Text = { title: string; body: string };
type StatusTexts = Partial<Record<OrderStatus, (code: string) => Text>>;

/** Mijozga push yuboriladigan holatlar (yangi buyurtmani mijozning o'zi beradi — NEW xabarsiz) */
export const PUSH_TEXTS: Record<PushLang, StatusTexts> = {
  uz: {
    SENT_TO_WORKSHOP: (c) => ({ title: 'Buyurtmangiz qabul qilindi ✅', body: `${c} buyurtmangiz tasdiqlandi va tayyorlashga berildi.` }),
    ACCEPTED: (c) => ({ title: 'Buyurtmangiz tayyorlanmoqda', body: `${c} buyurtmangiz ustida ish boshlandi.` }),
    DELIVERING: (c) => ({ title: 'Buyurtmangiz yo‘lda 🚚', body: `${c} yetkazilmoqda. Qo‘lingizga tekkach «Buyurtmani qabul qildim» tugmasini bosing.` }),
    DELIVERED: (c) => ({ title: 'Buyurtmangizni qabul qildingizmi?', body: `${c} yetkazib berildi. Ilovada «Ha, buyurtmamni qabul qildim» tugmasini bosing.` }),
    CANCELLED: (c) => ({ title: 'Buyurtma bekor qilindi', body: `${c} buyurtmangiz bekor qilindi.` }),
    RETURNED: (c) => ({ title: 'Buyurtma bekor qilindi', body: `${c} buyurtmangiz qaytarildi.` }),
  },
  uzn: {
    SENT_TO_WORKSHOP: (c) => ({ title: 'Buyurtmangiz qabul qilindi ✅', body: `${c} buyurtmangiz tasdiqlandi va tayyorlaşga berildi.` }),
    ACCEPTED: (c) => ({ title: 'Buyurtmangiz tayyorlanmoqda', body: `${c} buyurtmangiz ustida iş boşlandi.` }),
    DELIVERING: (c) => ({ title: 'Buyurtmangiz yōlda 🚚', body: `${c} yetkazilmoqda. Qōlingizga tekkaç «Buyurtmani qabul qildim» tugmasini bosing.` }),
    DELIVERED: (c) => ({ title: 'Buyurtmangizni qabul qildingizmi?', body: `${c} yetkazib berildi. Ilovada «Ha, buyurtmamni qabul qildim» tugmasini bosing.` }),
    CANCELLED: (c) => ({ title: 'Buyurtma bekor qilindi', body: `${c} buyurtmangiz bekor qilindi.` }),
    RETURNED: (c) => ({ title: 'Buyurtma bekor qilindi', body: `${c} buyurtmangiz qaytarildi.` }),
  },
  uzc: {
    SENT_TO_WORKSHOP: (c) => ({ title: 'Буюртмангиз қабул қилинди ✅', body: `${c} буюртмангиз тасдиқланди ва тайёрлашга берилди.` }),
    ACCEPTED: (c) => ({ title: 'Буюртмангиз тайёрланмоқда', body: `${c} буюртмангиз устида иш бошланди.` }),
    DELIVERING: (c) => ({ title: 'Буюртмангиз йўлда 🚚', body: `${c} етказилмоқда. Қўлингизга теккач «Буюртмани қабул қилдим» тугмасини босинг.` }),
    DELIVERED: (c) => ({ title: 'Буюртмангизни қабул қилдингизми?', body: `${c} етказиб берилди. Иловада «Ҳа, буюртмамни қабул қилдим» тугмасини босинг.` }),
    CANCELLED: (c) => ({ title: 'Буюртма бекор қилинди', body: `${c} буюртмангиз бекор қилинди.` }),
    RETURNED: (c) => ({ title: 'Буюртма бекор қилинди', body: `${c} буюртмангиз қайтарилди.` }),
  },
  ru: {
    SENT_TO_WORKSHOP: (c) => ({ title: 'Ваш заказ принят ✅', body: `Заказ ${c} подтверждён и передан в работу.` }),
    ACCEPTED: (c) => ({ title: 'Ваш заказ готовится', body: `Работа над заказом ${c} началась.` }),
    DELIVERING: (c) => ({ title: 'Ваш заказ в пути 🚚', body: `Заказ ${c} доставляется. Получив его, нажмите «Я получил заказ».` }),
    DELIVERED: (c) => ({ title: 'Вы получили заказ?', body: `Заказ ${c} доставлен. Нажмите в приложении «Да, я получил заказ».` }),
    CANCELLED: (c) => ({ title: 'Заказ отменён', body: `Ваш заказ ${c} отменён.` }),
    RETURNED: (c) => ({ title: 'Заказ отменён', body: `Ваш заказ ${c} возвращён.` }),
  },
  en: {
    SENT_TO_WORKSHOP: (c) => ({ title: 'Your order is confirmed ✅', body: `Order ${c} has been confirmed and sent to production.` }),
    ACCEPTED: (c) => ({ title: 'Your order is being made', body: `Work on order ${c} has started.` }),
    DELIVERING: (c) => ({ title: 'Your order is on its way 🚚', body: `Order ${c} is out for delivery. Tap “I received my order” once you have it.` }),
    DELIVERED: (c) => ({ title: 'Did you receive your order?', body: `Order ${c} was delivered. Tap “Yes, I received my order” in the app.` }),
    CANCELLED: (c) => ({ title: 'Order cancelled', body: `Your order ${c} was cancelled.` }),
    RETURNED: (c) => ({ title: 'Order cancelled', body: `Your order ${c} was returned.` }),
  },
};

export const pushText = (lang: string | null | undefined, status: OrderStatus, code: string): Text | null =>
  PUSH_TEXTS[asPushLang(lang)][status]?.(code) ?? null;
