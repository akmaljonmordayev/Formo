import Brak from './Brak';
import Chat from './Chat';
import Navbat from './Navbat';
import Partiyalar from './Partiyalar';
import Profil from './Profil';
import Statistika from './Statistika';
import Zaxira from './Zaxira';
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
    element: shell('route.queue.title', 'route.queue.sub', <Navbat />),
  },
  {
    path: 'partiyalar',
    element: shell('route.batches.title', 'route.batches.sub', <Partiyalar />),
  },
  {
    path: 'zaxira',
    element: shell('route.stock.title', 'route.stock.sub', <Zaxira />),
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
  { to: BASE, label: 'Bugungi navbat', end: true },
  { to: `${BASE}/partiyalar`, label: 'Partiyalar' },
  { to: `${BASE}/zaxira`, label: 'Zaxira' },
  { to: `${BASE}/statistika`, label: 'Statistika' },
  { to: `${BASE}/chat`, label: 'Chat' },
  { to: `${BASE}/profil`, label: 'Profil va sozlamalar' },
];
