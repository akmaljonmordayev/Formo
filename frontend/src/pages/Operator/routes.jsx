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

// label va group — i18n.js kalitlari; group bo'yicha sidebar bo'limlarga ajratiladi (group yo'q bo'lsa — eng tepada)
export const operatorMenu = [
  { to: BASE, label: 'menu.dashboard', end: true, icon: LayoutDashboard },
  { to: `${BASE}/orders`, label: 'menu.orders', icon: ShoppingBag, group: 'group.ops' },
  { to: `${BASE}/factories`, label: 'menu.factories', icon: Factory, group: 'group.ops' },
  { to: `${BASE}/notifications`, label: 'menu.notifications', icon: Bell, group: 'group.comm' },
  { to: `${BASE}/profile`, label: 'menu.profile', icon: UserRound, group: 'group.account' },
  { to: `${BASE}/settings`, label: 'menu.settings', icon: Settings, group: 'group.account' },
];
