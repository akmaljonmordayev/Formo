import Brak from './Brak';
import Chat from './Chat';
import OrderList from './OrderList';
import Profil from './Profil';
import Statistika from './Statistika';
import TailorShell from './TailorShell';

const BASE = '/tailor';

const shell = (title, subtitle, element) => (
  <TailorShell title={title} subtitle={subtitle}>
    {element}
  </TailorShell>
);

export const tailorRoutes = [
  {
    path: '',
    element: shell('orders.title', 'orders.sub', <OrderList view="active" />),
  },
  {
    path: 'kechikkan',
    element: shell('q.late', 'q.lateHint', <OrderList view="late" />),
  },
  {
    path: 'tayyor',
    element: shell('prod.ready', 'prod.readyHint', <OrderList view="ready" />),
  },
  {
    path: 'statistika',
    element: shell('route.stats.title', 'route.stats.sub', <Statistika />),
  },
  {
    path: 'chat',
    element: shell('route.chat.title', 'route.chat.sub', <Chat />),
  },
  {
    path: 'brak',
    element: shell('route.brak.title', 'route.brak.sub', <Brak />),
  },
  {
    path: 'profil',
    element: shell('route.profile.title', 'route.profile.sub', <Profil />),
  },
];

export const tailorMenu = [
  { to: BASE, label: 'Umumiy buyurtmalar', end: true },
  { to: `${BASE}/kechikkan`, label: 'Kechikkan buyurtmalar' },
  { to: `${BASE}/tayyor`, label: 'Tayyor buyurtmalar' },
  { to: `${BASE}/statistika`, label: 'Statistika' },
  { to: `${BASE}/chat`, label: 'Chat' },
  { to: `${BASE}/profil`, label: 'Profil va sozlamalar' },
];
