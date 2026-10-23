/**
 * Google Maps (Android) uchun to'q rangli uslub — Formo palitrasi:
 * fon #080C24/#0E1A3F, yo'llar #1B2560, suv #050818, yozuvlar #A9B0D0.
 * iOS (Apple Maps) uchun MapView `userInterfaceStyle="dark"` ishlatiladi.
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0E1A3F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A9B0D0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080C24' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2A3572' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#11284A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1B2560' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#121A42' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A3572' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#CDD2E8' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050818' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6F77A0' }] },
];
