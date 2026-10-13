import { useState, useEffect } from 'react';
import { User, Clock, Globe, Edit3, ShieldCheck, Phone, Check } from 'lucide-react';
import Card from './ui/Card';
import Toggle from './ui/Toggle';
import EmployeeModal from './EmployeeModal';
import { useAuth } from '../../hooks/useAuth';
import { initialsOf, prettyPhone } from './utils';

// Ism, telefon va sex nomi bazadagi akkauntdan olinadi (buildProfile).
// Smena, til va bildirishnomalar uchun backend hali yo'q — lokal qiymatlar.
const INITIAL_PROFILE = {
  id: 1,
  name: '',
  initials: '',
  role: "Mas'ul shaxs",
  factory: '',
  phone: '',
  shiftStart: '09:00',
  shiftEnd: '18:00',
  language: "O'zbekcha",
  active: true,
  notifications: { push: true, sms: true, email: true },
};

const buildProfile = (user) => ({
  ...INITIAL_PROFILE,
  id: user?.id ?? INITIAL_PROFILE.id,
  name: user?.fullName ?? '',
  initials: initialsOf(user?.fullName),
  factory: user?.workshopName ?? '',
  phone: prettyPhone(user?.phone),
});

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => buildProfile(user));

  // /auth/me dan yangilangan ma'lumot kelsa — profilni yangilaymiz
  useEffect(() => {
    if (!user) return;
    setProfile((prev) => ({
      ...prev,
      name: user.fullName,
      initials: initialsOf(user.fullName),
      factory: user.workshopName ?? '',
      phone: prettyPhone(user.phone),
    }));
  }, [user]);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Dynamically update document theme background tint on language change
  useEffect(() => {
    if (profile.language === 'Русский') {
      document.body.style.backgroundColor = '#081226';
    } else {
      document.body.style.backgroundColor = '#0b0f19';
    }
    // Sahifadan chiqqanda fonni qaytaramiz (aks holda boshqa sahifalarga ham o'tib qoladi)
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [profile.language]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSaveModal = (updatedForm) => {
    setProfile(updatedForm);
    setModalOpen(false);
    showToast(
      profile.language === 'Русский'
        ? 'Профиль успешно сохранен!'
        : "Profil ma'lumotlari muvaffaqiyatli saqlandi!"
    );
  };

  const toggleNotification = (key) => {
    setProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
    showToast(
      profile.language === 'Русский'
        ? 'Настройки уведомлений обновлены!'
        : "Bildirishnoma sozlamasi yangilandi!"
    );
  };

  const isRu = profile.language === 'Русский';

  return (
    <div className="relative space-y-5 max-w-4xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 rounded-2xl bg-teal-400 px-5 py-3 text-xs font-black text-slate-950 shadow-2xl animate-fade-in flex items-center gap-2">
          <Check className="h-4 w-4 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Personal Profile Settings Card */}
      <Card className="flex flex-col gap-6 bg-[#121829] p-6 border border-white/10 shadow-2xl">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20 text-lg font-black text-teal-400 ring-2 ring-teal-500/40">
              {profile.initials}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">{profile.name}</h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  {isRu ? 'АКТИВНЫЙ' : 'FAOL'}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                {isRu ? 'Ответственное лицо' : profile.role}{profile.factory && ` · ${profile.factory}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:bg-teal-300 active:scale-95 cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
            <span>{isRu ? 'Редактировать' : 'Tahrirlash'}</span>
          </button>
        </div>

        {/* Section 1: Profil Ma'lumotlari */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
            {isRu ? 'ДАННЫЕ ПРОФИЛЯ' : 'PROFIL MA\'LUMOTLARI'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isRu ? 'Имя и фамилия' : 'Ism va familiya'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  readOnly
                  value={profile.name}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isRu ? 'Телефон' : 'Telefon'}</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  readOnly
                  value={profile.phone}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isRu ? 'Рабочее время' : 'Ish vaqti'}
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  readOnly
                  value={`${profile.shiftStart} — ${profile.shiftEnd}`}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isRu ? 'Язык интерфейса' : 'Interfeys tili'}
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={profile.language}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setProfile({ ...profile, language: newLang });
                    showToast(newLang === 'Русский' ? 'Язык интерфейса изменен на Русский!' : 'Interfeys tili O\'zbekchaga o\'zgardi!');
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none"
                >
                  <option value="O'zbekcha" className="bg-[#121829]">O'zbekcha</option>
                  <option value="Русский" className="bg-[#121829]">Русский</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Bildirishnomalar */}
        <div className="border-t border-white/10 pt-5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
            {isRu ? 'УВЕДОМЛЕНИЯ' : 'BILDIRISHNOMALAR'}
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl bg-[#0e1424] p-3.5">
              <div>
                <h4 className="text-xs font-extrabold text-white">{isRu ? 'Новые заказы' : 'Yangi buyurtmalar'}</h4>
                <p className="text-[10px] text-slate-400">
                  {isRu ? 'Уведомлять при появлении нового заказа в очереди' : 'Navbatga yangi vazifa tushganda bildirishnoma yuborish'}
                </p>
              </div>
              <Toggle
                checked={profile.notifications.push}
                onChange={() => toggleNotification('push')}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#0e1424] p-3.5">
              <div>
                <h4 className="text-xs font-extrabold text-white">{isRu ? 'Напоминания о сроках' : 'Muddat eslatmalari'}</h4>
                <p className="text-[10px] text-slate-400">
                  {isRu ? 'Предупреждение за 30 минут до окончания срока' : 'Muddatga 30 daqiqa qolganda ogohlantirish'}
                </p>
              </div>
              <Toggle
                checked={profile.notifications.sms}
                onChange={() => toggleNotification('sms')}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#0e1424] p-3.5">
              <div>
                <h4 className="text-xs font-extrabold text-white">{isRu ? 'Итоги смены' : 'Smena xulosasi'}</h4>
                <p className="text-[10px] text-slate-400">
                  {isRu ? 'Формирование отчета в конце рабочей смены' : 'Kun yakunidagi ishlab chiqarish hisobotini tayyorlash'}
                </p>
              </div>
              <Toggle
                checked={profile.notifications.email}
                onChange={() => toggleNotification('email')}
              />
            </div>
          </div>
        </div>

        {/* Permission Info Footer */}
        <div className="flex items-center gap-3 rounded-2xl border border-teal-500/30 bg-[#0e1d24] p-4 text-teal-200">
          <ShieldCheck className="h-5 w-5 shrink-0 text-teal-400" />
          <p className="text-xs leading-relaxed font-medium">
            {isRu
              ? 'Начальник смены просматривает все задачи печати, управляет запасами, подтверждает брак и формирует отчеты.'
              : "Smena boshlig'i barcha bosma vazifalarini ko'radi, zaxirani boshqaradi, brakni tasdiqlaydi va hisobotlarni shakllantiradi."}
          </p>
        </div>
      </Card>

      {/* Edit Profile Modal Drawer */}
      <EmployeeModal
        open={modalOpen}
        employee={profile}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
      />
    </div>
  );
}
