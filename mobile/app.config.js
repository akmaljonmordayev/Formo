// app.json ustiga muhitga bog'liq sozlamalar.
// Android'da react-native-maps Google Maps ishlatadi: kalitsiz release build
// xarita ekranini ochganda crash qiladi. Kalit EAS secret sifatida beriladi:
//   eas secret:create --name GOOGLE_MAPS_API_KEY --value <key>
module.exports = ({ config }) => {
  // Expo Go faqat o'z SDK runtime'ini ("exposdk:58.0.0") ocha oladi. app.json'dagi `runtimeVersion`
  // (policy: appVersion -> "1.0.0") faqat EAS build (APK/AAB) uchun kerak — lokal `expo start`da olib tashlanadi,
  // aks holda Expo Go loyihani ochmay "Something went wrong" ko'rsatadi.
  if (!process.env.EAS_BUILD) {
    const { runtimeVersion: _appRuntime, ...dev } = config;
    config = dev;
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return config;
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...(config.android?.config || {}), googleMaps: { apiKey: key } },
    },
  };
};
