import {
  Bell,
  ChartColumn,
  Factory,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  ShoppingBag,
  UserRound,
  Wallet,
} from 'lucide-react';
import OperatorShell from './OperatorShell';
import Dashboard from './Dashboard';
import Factories from './Factories';
import Messages from './Messages';
import Notifications from './Notifications';
import Orders from './Orders';
import Payments from './Payments';
import Profile from './Profile';
import Reports from './Reports';
import OperatorSettings from './Settings';

const BASE = '/operator';

export const operatorLayout = OperatorShell;

export const operatorRoutes = [
  { path: '', element: <Dashboard /> },
  { path: 'orders', element: <Orders /> },
  { path: 'factories', element: <Factories /> },
  { path: 'messages', element: <Messages /> },
  { path: 'notifications', element: <Notifications /> },
  { path: 'payments', element: <Payments /> },
  { path: 'reports', element: <Reports /> },
  { path: 'profile', element: <Profile /> },
  { path: 'settings', element: <OperatorSettings /> },
];

// label va group — i18n.js kalitlari; group bo'yicha sidebar bo'limlarga ajratiladi (group yo'q bo'lsa — eng tepada)
export const operatorMenu = [
  { to: BASE, label: 'menu.dashboard', end: true, icon: LayoutDashboard },
  { to: `${BASE}/orders`, label: 'menu.orders', icon: ShoppingBag, group: 'group.ops' },
  { to: `${BASE}/factories`, label: 'menu.factories', icon: Factory, group: 'group.ops' },
  { to: `${BASE}/messages`, label: 'menu.messages', icon: MessagesSquare, group: 'group.comm' },
  { to: `${BASE}/notifications`, label: 'menu.notifications', icon: Bell, group: 'group.comm' },
  { to: `${BASE}/payments`, label: 'menu.payments', icon: Wallet, group: 'group.control' },
  { to: `${BASE}/reports`, label: 'menu.reports', icon: ChartColumn, group: 'group.control' },
  { to: `${BASE}/profile`, label: 'menu.profile', icon: UserRound, group: 'group.account' },
  { to: `${BASE}/settings`, label: 'menu.settings', icon: Settings, group: 'group.account' },
];
