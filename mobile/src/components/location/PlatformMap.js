import { Platform } from 'react-native';
import NativeMapView from 'react-native-maps';
import LeafletMap from '../ui/LeafletMap';

// Android'da react-native-maps Google Maps kalitisiz release build'da crash qiladi (ilova yopilib qoladi) —
// u yerda kalit talab qilmaydigan Leaflet/OpenStreetMap xaritasi; iOS'da Apple Maps (kalit kerak emas).
// Veb (faqat ishlab chiqishda ko'rish uchun): PlatformMap.web.js
export default Platform.OS === 'android' ? LeafletMap : NativeMapView;
