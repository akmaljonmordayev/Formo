// Catalog/studio demo data. User-specific data (profile, orders) is NEVER
// mocked — it always comes from the live API.
export const products = [
  { id: 'home', name: 'FORMO HOME', category: 'football', price: 289000, color: '#5A66DE', accent: '#BFD5FF', badge: 'hit' },
  { id: 'away', name: 'FORMO AWAY', category: 'football', price: 289000, color: '#EBEDF6', accent: '#7681CF', badge: 'new' },
  { id: 'street', name: 'FORMO STREET', category: 'street', price: 249000, color: '#F29C59', accent: '#201944', badge: 'limited' },
  { id: 'junior', name: 'FORMO JUNIOR', category: 'kids', price: 199000, color: '#62B6AE', accent: '#102B48', badge: 'kids' },
];

export const clubs = [
  { id: 'real', name: 'Real Madrid', league: 'LaLiga', forms: 3, season: '2026/27', code: 'RM', color: '#EBEDF6', accent: '#7681CF', product: 'away' },
  { id: 'barca', name: 'FC Barcelona', league: 'LaLiga', forms: 3, season: '2026/27', code: 'FCB', color: '#2B2E7A', accent: '#F5C542', product: 'home' },
  { id: 'united', name: 'Manchester United', league: 'Premier Liga', forms: 3, season: '2026/27', code: 'MU', color: '#C4272E', accent: '#FFFFFF', product: 'street' },
  { id: 'bayern', name: 'Bayern München', league: 'Bundesliga', forms: 3, season: '2026/27', code: 'BM', color: '#D62839', accent: '#FFFFFF', product: 'junior' },
  { id: 'juventus', name: 'Juventus', league: 'Serie A', forms: 3, season: '2026/27', code: 'JU', color: '#1B1F45', accent: '#FFFFFF', product: 'away' },
  { id: 'liverpool', name: 'Liverpool', league: 'Premier League', forms: 3, season: '2026/27', code: 'LI', color: '#B01E32', accent: '#F6D67B', product: 'street' },
  { id: 'psg', name: 'PSG', league: 'Ligue 1', forms: 3, season: '2026/27', code: 'PS', color: '#123B6B', accent: '#E8543F', product: 'home' },
];

export const colorOptions = ['#FFFFFF', '#242749', '#5A66DE', '#62B6AE', '#F5C542', '#E8543F', '#3A3F7A', '#3FD9B7', '#EBEDF6'];
