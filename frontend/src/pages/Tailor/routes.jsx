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
    element: shell('Bugungi navbat', 'Bugungi buyurtmalar va bosma navbati', <Navbat />),
  },
  {
    path: 'partiyalar',
    element: shell('Partiyalar', "Model bo'yicha bosma partiyalari", <Partiyalar />),
  },
  {
    path: 'zaxira',
    element: shell('Zaxira', "Mato va material qoldig'i", <Zaxira />),
  },
  {
    path: 'statistika',
    element: shell('Statistika', 'Sex samaradorligi va bosma hisoboti', <Statistika />),
  },
  {
    path: 'chat',
    element: shell('Operator bilan chat', "Operator va smena boshlig'i muloqoti", <Chat />),
  },
  {
    path: 'brak',
    element: shell('Brakni qayd etish', 'Nosozlik va jarima qayd etish', <Brak />),
  },
  {
    path: 'profil',
    element: shell('Profil va sozlamalar', 'Xodimlar va shaxsiy sozlamalar', <Profil />),
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
