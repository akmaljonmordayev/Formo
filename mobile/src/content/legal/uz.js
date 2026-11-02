// Ommaviy oferta va maxfiylik siyosati (o'zbekcha). Raqamlar Superadmin sozlamalaridan
// (GET /app/config → rules) olinadi — ilova qoidalari bilan doim bir xil bo'ladi.

export default function uz({ rules, general }) {
  const company = general.companyName || 'Formo';
  const days = `${rules.productionDaysMin}–${rules.productionDaysMax}`;
  const payment = rules.allowCash
    ? 'Formo balansidan yoki buyurtmani qabul qilishda kuryerga naqd pul bilan'
    : 'Formo balansidan';

  return {
    offer: {
      title: 'Ommaviy oferta',
      intro: `Ushbu hujjat ${company} xizmati (keyingi o‘rinlarda — Sotuvchi) tomonidan futbol formalarini individual bosma bilan tayyorlash va yetkazib berish bo‘yicha jismoniy shaxslarga (keyingi o‘rinlarda — Xaridor) qilingan ommaviy taklifdir.`,
      sections: [
        {
          title: '1. Umumiy qoidalar',
          items: [
            'Ilovada ro‘yxatdan o‘tish va “Ommaviy oferta va maxfiylik siyosati shartlariga roziman” belgisini qo‘yish ushbu oferta shartlarini to‘liq va so‘zsiz qabul qilish (aksept) hisoblanadi.',
            'Oferta O‘zbekiston Respublikasi Fuqarolik kodeksi va “Iste’molchilarning huquqlarini himoya qilish to‘g‘risida”gi Qonunga muvofiq tuzilgan.',
            'Sotuvchi oferta shartlarini o‘zgartirish huquqiga ega. Yangi tahrir ilovada e’lon qilingan paytdan kuchga kiradi va undan keyin berilgan buyurtmalarga tatbiq etiladi.',
          ],
        },
        {
          title: '2. Shartnoma predmeti',
          items: [
            'Sotuvchi Xaridor tanlagan klub formasini (futbolka, ixtiyoriy ravishda shortik) tanlangan o‘lchamda tayyorlaydi, Xaridor xohishiga ko‘ra ism va raqam bosmasini tushiradi hamda ko‘rsatilgan manzilga yetkazib beradi.',
            'Ilovadagi 360° ko‘rinish va suratlar namuna sifatida berilgan. Rang tuslari ekran sozlamalariga qarab biroz farq qilishi mumkin.',
          ],
        },
        {
          title: '3. Buyurtma berish',
          items: [
            'Xaridor ilovada forma, o‘lcham, bosma (ism/raqam) va shortikni tanlab, savat orqali buyurtma beradi.',
            'Bosma uchun ism, raqam va o‘lchamning to‘g‘riligiga Xaridor javobgar. Buyurtma tasdiqlangach, bu ma’lumotlar Xaridor kiritgan ko‘rinishda tayyorlanadi.',
            `Ismdagi belgilar soni — ${rules.printNameMaxLength} tagacha, raqam — ${rules.printNumberMin} dan ${rules.printNumberMax} gacha.`,
            'Haqoratli, siyosiy yoki uchinchi shaxslarning huquqlarini buzuvchi yozuvlar bosilmaydi — bunday buyurtma Sotuvchi tomonidan bekor qilinishi mumkin.',
          ],
        },
        {
          title: '4. Narx va to‘lov',
          items: [
            'Tovar narxi buyurtma berilgan paytda ilovada ko‘rsatilgan narx bo‘yicha belgilanadi. Narx forma, shortik va bosma narxlaridan, yetkazib berish narxidan va promokod chegirmasidan tashkil topadi.',
            `To‘lov ${payment} amalga oshiriladi.`,
            'Balans Formo Telegram boti orqali to‘ldiriladi: Xaridor ko‘rsatilgan kartaga pul o‘tkazadi va chekni yuboradi, administrator tekshirgach summa balansga qo‘shiladi.',
          ],
        },
        {
          title: '5. Tayyorlash va yetkazib berish',
          items: [
            `Buyurtma tikuv sexi tomonidan qabul qilingandan keyin odatda ${days} ish kunida tayyorlanadi. Muddat buyurtmalar soniga qarab o‘zgarishi mumkin — joriy holat “Buyurtmalarim” bo‘limida ko‘rinadi.`,
            'Buyurtma holatlari: Qabul qilindi → Tayyorlanmoqda → Yetkazilmoqda → Yetkazildi.',
            'Yetkazib berish Xaridor ilovada ko‘rsatgan manzil va vaqt oralig‘ida amalga oshiriladi. Manzil noto‘g‘ri ko‘rsatilsa yoki Xaridor bilan bog‘lanib bo‘lmasa, yetkazish kechikishi mumkin.',
          ],
        },
        {
          title: '6. Buyurtmani bekor qilish',
          items: [
            'Xaridor buyurtmani tikuv sexi uni qabul qilguniga qadar (holat: “Qabul qilindi” yoki “Sexga yuborildi”) ilovada o‘zi bekor qilishi mumkin.',
            'Tikuv sexi buyurtmani qabul qilgach, forma Xaridor uchun individual tayyorlana boshlaydi — shu paytdan buyurtmani bekor qilib bo‘lmaydi. Bu ham naqd, ham balansdan to‘langan buyurtmalarga tegishli.',
            'Bekor qilingan buyurtma uchun balansdan to‘langan summa to‘liq Formo balansiga qaytariladi.',
            'Naqd to‘lovli buyurtmani tayyorlangandan keyin qabul qilishdan asossiz bosh tortish takrorlansa, Sotuvchi bunday Xaridorga naqd to‘lov imkoniyatini cheklash huquqiga ega.',
          ],
        },
        {
          title: '7. Qaytarish va almashtirish',
          items: [
            'Ism/raqam bosmasi tushirilgan forma individual xususiyatlarga ega tovar hisoblanadi va sifati yaxshi bo‘lsa, fikr o‘zgargani sababli qaytarilmaydi va almashtirilmaydi.',
            `Nuqson aniqlansa (bosma xatosi, buyurtmaga mos kelmaydigan o‘lcham yoki forma, shikast), Xaridor tovarni olgan kundan boshlab ${rules.returnDays} kun ichida pastdagi aloqa ma’lumotlari orqali surat bilan murojaat qiladi.`,
            'Nuqson tasdiqlansa, Sotuvchi o‘z hisobidan formani qayta tayyorlaydi yoki to‘langan summani qaytaradi.',
          ],
        },
        {
          title: '8. Tomonlarning javobgarligi',
          items: [
            'Sotuvchi buyurtmani o‘z vaqtida va sifatli bajarish uchun javob beradi.',
            'Sotuvchi Xaridor kiritgan noto‘g‘ri ma’lumot (ism, raqam, o‘lcham, manzil, telefon) oqibatlari uchun javob bermaydi.',
            'Fors-major holatlarida (tabiiy ofat, aloqa uzilishi, davlat organlari qarorlari) majburiyatlarni bajarish muddati shu holatlar davomiyligiga uzayadi.',
          ],
        },
        {
          title: '9. Nizolarni hal qilish',
          items: [
            'Nizolar avvalo muzokara yo‘li bilan hal qilinadi. Xaridor murojaatiga 10 ish kuni ichida javob beriladi.',
            'Kelishuvga erishilmasa, nizo O‘zbekiston Respublikasi qonunchiligiga muvofiq sudda ko‘riladi.',
          ],
        },
      ],
    },

    privacy: {
      title: 'Maxfiylik siyosati',
      intro: `${company} Xaridorning shaxsiy ma’lumotlarini “Shaxsga doir ma’lumotlar to‘g‘risida”gi Qonunga muvofiq himoya qiladi. Ushbu siyosat qaysi ma’lumotlar nima uchun yig‘ilishini tushuntiradi.`,
      sections: [
        {
          title: '1. Qanday ma’lumotlar yig‘iladi',
          items: [
            'Telefon raqami va Telegram akkaunt identifikatori — ilovaga kirish (kirish kodi Telegram bot orqali yuboriladi) va buyurtma xabarlari uchun.',
            'Ism, jins, yosh, bo‘y va vazn — sizga to‘g‘ri o‘lcham tavsiya qilish va buyurtmani rasmiylashtirish uchun.',
            'Yetkazib berish manzillari va xaritadagi nuqta. Joylashuvga ruxsat faqat manzilni xaritada tanlayotganingizda ishlatiladi, fonda kuzatilmaydi.',
            'Buyurtmalar tarixi, balans harakatlari va to‘lov cheki suratlari.',
          ],
        },
        {
          title: '2. Ma’lumotlardan foydalanish',
          items: [
            'Buyurtmani tayyorlash, yetkazish va holati haqida xabar berish.',
            'Balansni to‘ldirish so‘rovlarini tekshirish va hisob xavfsizligini ta’minlash.',
            'Xizmat sifatini yaxshilash. Ma’lumotlar sotilmaydi va reklama uchun uchinchi shaxslarga berilmaydi.',
          ],
        },
        {
          title: '3. Kimga beriladi',
          items: [
            'Tikuv sexiga — faqat buyurtma tarkibi (forma, o‘lcham, bosma matni).',
            'Kuryerga — ism, telefon raqami va yetkazish manzili.',
            'Davlat organlariga — faqat qonunda belgilangan hollarda.',
          ],
        },
        {
          title: '4. Saqlash va himoya',
          items: [
            'Ma’lumotlar himoyalangan serverlarda saqlanadi, ularga faqat vakolatli xodimlar kira oladi.',
            'Kirish faqat Telegram bot orqali bir martalik kod bilan amalga oshiriladi — parol saqlanmaydi.',
            'Ma’lumotlar akkaunt faol bo‘lgan davrda va qonunda belgilangan muddatlarda saqlanadi.',
          ],
        },
        {
          title: '5. Sizning huquqlaringiz',
          items: [
            'Profil ma’lumotlarini ilovada istalgan vaqtda ko‘rish va o‘zgartirish.',
            'Akkaunt va shaxsiy ma’lumotlarni o‘chirishni so‘rash — pastdagi aloqa ma’lumotlari orqali murojaat qiling. Qonun bo‘yicha saqlanishi shart bo‘lgan ma’lumotlar (masalan, to‘lov yozuvlari) belgilangan muddatgacha saqlanadi.',
            'Telegram bot xabarlarini botni to‘xtatish orqali o‘chirish.',
          ],
        },
      ],
    },

    extraTitle: 'Qo‘shimcha shartlar',
    contactsTitle: 'Aloqa',
  };
}
