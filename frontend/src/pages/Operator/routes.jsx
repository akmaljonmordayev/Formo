import { Bell, Factory, LayoutDashboard, Settings, ShoppingBag, UserRound } from 'lucide-react';
import OperatorShell from './OperatorShell';
import Dashboard from './Dashboard';
import Factories from './Factories';
import Notifications from './Notifications';
import Orders from './Orders';
import Profile from './Profile';
import OperatorSettings from './Settings';

const BASE = '/operator';

export const operatorLayout = OperatorShell;

export const operatorRoutes = [
  { path: '', element: <Dashboard /> },
  { path: 'orders', element: <Orders /> },
  { path: 'factories', element: <Factories /> },
  { path: 'notifications', element: <Notifications /> },
  { path: 'profile', element: <Profile /> },
  { path: 'settings', element: <OperatorSettings /> },
];

// group bo'yicha sidebar bo'limlarga ajratiladi (group yo'q bo'lsa — eng tepada)
export const operatorMenu = [
  { to: BASE, label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: `${BASE}/orders`, label: 'Buyurtmalar', icon: ShoppingBag, group: 'Operatsiyalar' },
  { to: `${BASE}/factories`, label: 'Tikuv sexlari', icon: Factory, group: 'Operatsiyalar' },
  { to: `${BASE}/notifications`, label: 'Bildirishnomalar', icon: Bell, group: 'Aloqa' },
  { to: `${BASE}/profile`, label: 'Profil', icon: UserRound, group: 'Hisob' },
  { to: `${BASE}/settings`, label: 'Sozlamalar', icon: Settings, group: 'Hisob' },
];
