// app.json ustiga muhitga bog'liq sozlamalar.
// Android'da react-native-maps Google Maps ishlatadi: kalitsiz release build
// xarita ekranini ochganda crash qiladi. Kalit EAS secret sifatida beriladi:
//   eas secret:create --name GOOGLE_MAPS_API_KEY --value <key>
module.exports = ({ config }) => {
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
