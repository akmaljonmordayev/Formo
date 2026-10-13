import Dashboard from './Dashboard';
import Users from './Users';
import Factories from './Factories';
import Operator from './Operator';
import Orders from './Orders';

const BASE = '/superadmin';

export const superadminRoutes = [
  { path: '', element: <Dashboard /> },
  { path: 'operator', element: <Operator /> },
  { path: 'factories', element: <Factories /> },
  { path: 'users', element: <Users /> },
  { path: 'orders', element: <Orders /> },
];

export const superadminMenu = [
  { to: BASE, label: 'Dashboard', end: true },
  { to: `${BASE}/operator`, label: 'Operator' },
  { to: `${BASE}/factories`, label: 'Tikuv sexlari' },
  { to: `${BASE}/users`, label: 'Foydalanuvchilar' },
  { to: `${BASE}/orders`, label: 'Buyurtmalar' },
];
