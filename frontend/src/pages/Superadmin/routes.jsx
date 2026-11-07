import { Suspense, lazy } from 'react';
import {
  AlertTriangle,
  CreditCard,
  Factory,
  History,
  LayoutDashboard,
  MessagesSquare,
  Rotate3d,
  Settings,
  Shirt,
  ShoppingBag,
  Tag,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard';
import CustomersUsers from './Users';
import Factories_ from './Factories';
import Orders from './Orders';
import Production from './Production';
import Defects from './Defects';
import Kit360 from './Kit360';
import Forms from './Forms';
import Messages from './Messages';
import Pricing from './Pricing';
import Promocodes from './Promocodes';
import Campaigns from './Campaigns';
import Finance from './Finance';
import TopUps from './TopUps';
import Reports from './Reports';
import SettingsPage from './Settings';
import AuditLog from './AuditLog';

const BASE = '/superadmin';

// Dizayn studiyasi / 3D formalar menyudan olib tashlandi (Forma 360° ularning o'rnini bosadi),
// lekin eski sahifalar/havolalar hali ishlaydi — kerak bo'lsa qaytarish uchun saqlanmoqda.
const DesignStudio = lazy(() => import('./Dashboard/DesignStudio'));
const KitDesigns = lazy(() => import('./KitDesigns'));
const lazyPage = (El) => (
  <Suspense fallback={<div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>}>
    <El />
  </Suspense>
);

// Til (uz / ўз / ru) konteksti va tarjima qilingan menyu shu wrapper ichida
export const superadminLayout = AdminLayout;

// Umumiy ui.css komponentlarida qurilgan (real backend chaqiradigan) sahifalar —
// .sa-legacy ichida ui.css ranglari panelning dark uslubiga moslanadi (SuperadminLayout.css)
function legacy(El) {
  return (
    <div className="sa-legacy">
      <El />
    </div>
  );
}

export const superadminRoutes = [
  { path: '', element: <Dashboard /> },
  { path: 'orders', element: <Orders /> },
  { path: 'production', element: <Production /> },
  { path: 'defects', element: <Defects /> },
  { path: 'kit-360', element: <Kit360 /> },
  { path: 'forms', element: <Forms /> },
  { path: 'messages', element: <Messages /> },
  // Eski katalog (har klubda 3 forma) olib tashlandi — eski havolalar Forma 360° ga olib boradi
  { path: 'clubs', element: <Navigate to={`${BASE}/kit-360`} replace /> },
  { path: 'categories', element: <Navigate to={`${BASE}/kit-360`} replace /> },
  // Zaxira Formalar sahifasiga birlashtirildi — eski havolalar shu yerga boradi
  { path: 'inventory', element: <Navigate to={`${BASE}/forms`} replace /> },
  { path: 'design-studio', element: lazyPage(DesignStudio) },
  { path: 'kit-designs', element: lazyPage(KitDesigns) },
  { path: 'pricing', element: <Pricing /> },
  { path: 'users', element: legacy(CustomersUsers) },
  { path: 'promocodes', element: <Promocodes /> },
  { path: 'campaigns', element: <Campaigns /> },
  { path: 'factories', element: legacy(Factories_) },
  { path: 'finance', element: <Finance /> },
  { path: 'topups', element: <TopUps /> },
  { path: 'reports', element: <Reports /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'audit-log', element: <AuditLog /> },
];

// group bo'yicha sidebarda bo'limlarga ajratiladi (SuperadminLayout shuni o'qiydi)
export const superadminMenu = [
  { to: BASE, label: 'Dashboard', end: true, icon: LayoutDashboard, group: 'Asosiy' },
  { to: `${BASE}/orders`, label: 'Buyurtmalar', icon: ShoppingBag, group: 'Asosiy', badge: 2 },
  { to: `${BASE}/messages`, label: 'Xabarlar', icon: MessagesSquare, group: 'Asosiy' },
  { to: `${BASE}/topups`, label: "Balans to'ldirish", icon: CreditCard, group: 'Asosiy' },
  { to: `${BASE}/production`, label: 'Ishlab chiqarish', icon: Factory, group: 'Asosiy' },

  { to: `${BASE}/kit-360`, label: 'Forma 360°', icon: Rotate3d, group: 'Formalar' },
  { to: `${BASE}/forms`, label: 'Formalar', icon: Shirt, group: 'Formalar' },
  { to: `${BASE}/pricing`, label: 'Narxlar', icon: Tag, group: 'Formalar' },

  { to: `${BASE}/factories`, label: 'Sexlar', icon: Factory, group: 'Sex va Sifat' },
  { to: `${BASE}/defects`, label: 'Nuqsonlar (brak)', icon: AlertTriangle, group: 'Sex va Sifat' },

  { to: `${BASE}/finance`, label: 'Moliya', icon: Wallet, group: 'Moliya va Mijozlar' },
  { to: `${BASE}/promocodes`, label: 'Promokodlar', icon: Ticket, group: 'Moliya va Mijozlar' },
  { to: `${BASE}/users`, label: 'Mijozlar', icon: Users, group: 'Moliya va Mijozlar' },

  // Kampaniyalar va Hisobotlar menyudan yashirildi — marshrutlari superadminRoutes da qoladi
  // Operator akkaunti sahifasi olib tashlandi
  { to: `${BASE}/settings`, label: 'Sozlamalar', icon: Settings, group: 'Tizim' },
  { to: `${BASE}/audit-log`, label: 'Audit jurnali', icon: History, group: 'Tizim' },
];
