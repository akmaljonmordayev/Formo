import {
  AlertTriangle,
  BarChart3,
  Factory,
  History,
  LayoutDashboard,
  Layers,
  MessagesSquare,
  Megaphone,
  Package,
  Palette,
  Settings,
  Shirt,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard';
import CustomersUsers from './Users';
import Factories_ from './Factories';
import Operator from './Operator';
import Orders from './Orders';
import DesignStudio from './Dashboard/DesignStudio';
import Production from './Production';
import Defects from './Defects';
import Messages from './Messages';
import Clubs from './Clubs';
import Categories from './Categories';
import Inventory from './Inventory';
import Pricing from './Pricing';
import Promocodes from './Promocodes';
import Campaigns from './Campaigns';
import Finance from './Finance';
import Reports from './Reports';
import SettingsPage from './Settings';
import AuditLog from './AuditLog';

const BASE = '/superadmin';

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
  { path: 'messages', element: <Messages /> },
  { path: 'clubs', element: <Clubs /> },
  { path: 'categories', element: <Categories /> },
  { path: 'design-studio', element: <DesignStudio /> },
  { path: 'inventory', element: <Inventory /> },
  { path: 'pricing', element: <Pricing /> },
  { path: 'users', element: legacy(CustomersUsers) },
  { path: 'promocodes', element: <Promocodes /> },
  { path: 'campaigns', element: <Campaigns /> },
  { path: 'factories', element: legacy(Factories_) },
  { path: 'finance', element: <Finance /> },
  { path: 'reports', element: <Reports /> },
  { path: 'operator', element: legacy(Operator) },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'audit-log', element: <AuditLog /> },
];

// group bo'yicha sidebarda bo'limlarga ajratiladi (SuperadminLayout shuni o'qiydi)
export const superadminMenu = [
  { to: BASE, label: 'Dashboard', end: true, icon: LayoutDashboard, group: 'Asosiy' },
  { to: `${BASE}/orders`, label: 'Buyurtmalar', icon: ShoppingBag, group: 'Asosiy', badge: 2 },
  { to: `${BASE}/production`, label: 'Ishlab chiqarish', icon: Factory, group: 'Asosiy', badge: 2 },
  { to: `${BASE}/defects`, label: 'Nuqsonlar (brak)', icon: AlertTriangle, group: 'Asosiy' },

  { to: `${BASE}/clubs`, label: 'Klublar va formalar', icon: Shirt, group: 'Katalog' },
  { to: `${BASE}/categories`, label: 'Kategoriyalar', icon: Layers, group: 'Katalog' },
  { to: `${BASE}/design-studio`, label: 'Dizayn studiyasi', icon: Palette, group: 'Katalog' },
  { to: `${BASE}/inventory`, label: 'Zaxira', icon: Package, group: 'Katalog' },
  { to: `${BASE}/pricing`, label: 'Narxlar', icon: Tag, group: 'Katalog' },

  { to: `${BASE}/users`, label: 'Mijozlar', icon: Users, group: 'Mijozlar' },
  { to: `${BASE}/promocodes`, label: 'Promokodlar', icon: Ticket, group: 'Mijozlar' },
  { to: `${BASE}/campaigns`, label: 'Kampaniyalar', icon: Megaphone, group: 'Mijozlar' },

  { to: `${BASE}/factories`, label: 'Sexlar', icon: Factory, group: 'Operatsiya' },
  { to: `${BASE}/finance`, label: 'Moliya', icon: Wallet, group: 'Operatsiya' },
  { to: `${BASE}/reports`, label: 'Hisobotlar', icon: BarChart3, group: 'Operatsiya' },
  { to: `${BASE}/messages`, label: 'Xabarlar', icon: MessagesSquare, group: 'Operatsiya' },

  { to: `${BASE}/operator`, label: 'Foydalanuvchilar va rollar', icon: ShieldCheck, group: 'Tizim' },
  { to: `${BASE}/settings`, label: 'Sozlamalar', icon: Settings, group: 'Tizim' },
  { to: `${BASE}/audit-log`, label: 'Audit jurnali', icon: History, group: 'Tizim' },
];
