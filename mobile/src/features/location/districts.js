/**
 * O'zbekiston viloyatlari va ularning tuman/shaharlari (React/Expo'ga bog'liq emas — Node'da test qilinadi).
 * Manzil qo'shishda: viloyat -> tuman -> xarita. Tuman nomi serverga to'liq ko'rinishda yoziladi
 * ("Chilonzor tumani", "Nurafshon shahri") — admin panel manzilni aynan shunday ko'radi.
 *
 * Yozuv: 'Nom' — tuman, 'sh:Nom' — shahar. Tartib: avval shaharlar, keyin tumanlar (alifbo bo'yicha).
 */
const RAW = {
  TOSHKENT_SHAHRI: [
    'Bektemir', 'Chilonzor', 'Mirobod', "Mirzo Ulug'bek", 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa',
    'Yakkasaroy', 'Yangihayot', 'Yashnobod', 'Yunusobod',
  ],
  TOSHKENT_VILOYATI: [
    'sh:Nurafshon', 'sh:Angren', 'sh:Bekobod', 'sh:Chirchiq', 'sh:Ohangaron', 'sh:Olmaliq', "sh:Yangiyo'l",
    'Bekobod', "Bo'ka", "Bo'stonliq", 'Chinoz', 'Ohangaron', "Oqqo'rg'on", "O'rta Chirchiq", 'Parkent', 'Piskent',
    'Qibray', 'Quyi Chirchiq', 'Toshkent', "Yangiyo'l", 'Yuqori Chirchiq', 'Zangiota',
  ],
  ANDIJON: [
    'sh:Andijon', 'sh:Xonobod', 'Andijon', 'Asaka', 'Baliqchi', "Bo'ston", 'Buloqboshi', 'Izboskan', 'Jalaquduq',
    'Marhamat', "Oltinko'l", 'Paxtaobod', "Qo'rg'ontepa", 'Shahrixon', "Ulug'nor", "Xo'jaobod",
  ],
  BUXORO: [
    'sh:Buxoro', 'sh:Kogon', 'Buxoro', "G'ijduvon", 'Jondor', 'Kogon', 'Olot', 'Peshku', "Qorako'l",
    'Qorovulbozor', 'Romitan', 'Shofirkon', 'Vobkent',
  ],
  FARGONA: [
    "sh:Farg'ona", "sh:Marg'ilon", "sh:Qo'qon", 'sh:Quvasoy', "Bag'dod", 'Beshariq', 'Buvayda', "Dang'ara",
    "Farg'ona", 'Furqat', 'Oltiariq', "O'zbekiston", "Qo'shtepa", 'Quva', 'Rishton', "So'x", 'Toshloq',
    "Uchko'prik", 'Yozyovon',
  ],
  JIZZAX: [
    'sh:Jizzax', 'Arnasoy', 'Baxmal', "Do'stlik", 'Forish', "G'allaorol", "Mirzacho'l", 'Paxtakor',
    'Sharof Rashidov', 'Yangiobod', 'Zafarobod', 'Zarbdor', 'Zomin',
  ],
  XORAZM: [
    'sh:Urganch', 'sh:Xiva', "Bog'ot", 'Gurlan', 'Hazorasp', "Qo'shko'pir", 'Shovot', "Tuproqqal'a", 'Urganch',
    'Xiva', 'Xonqa', 'Yangiariq', 'Yangibozor',
  ],
  NAMANGAN: [
    'sh:Namangan', 'Chortoq', 'Chust', 'Davlatobod', 'Kosonsoy', 'Mingbuloq', 'Namangan', 'Norin', 'Pop',
    "To'raqo'rg'on", "Uchqo'rg'on", 'Uychi', 'Yangi Namangan', "Yangiqo'rg'on",
  ],
  NAVOIY: [
    'sh:Navoiy', "sh:G'ozg'on", 'sh:Zarafshon', 'Karmana', 'Konimex', 'Navbahor', 'Nurota', 'Qiziltepa', 'Tomdi',
    'Uchquduq', 'Xatirchi',
  ],
  QASHQADARYO: [
    'sh:Qarshi', 'sh:Shahrisabz', 'Chiroqchi', 'Dehqonobod', "G'uzor", 'Kasbi', 'Kitob', 'Koson', "Ko'kdala",
    'Mirishkor', 'Muborak', 'Nishon', 'Qamashi', 'Qarshi', 'Shahrisabz', "Yakkabog'",
  ],
  SAMARQAND: [
    'sh:Samarqand', "sh:Kattaqo'rg'on", "Bulung'ur", 'Ishtixon', 'Jomboy', "Kattaqo'rg'on", 'Narpay', 'Nurobod',
    'Oqdaryo', "Pastdarg'om", 'Paxtachi', 'Payariq', "Qo'shrabot", 'Samarqand', 'Toyloq', 'Urgut',
  ],
  SIRDARYO: [
    'sh:Guliston', 'sh:Shirin', 'sh:Yangiyer', 'Boyovut', 'Guliston', 'Mirzaobod', 'Oqoltin', 'Sardoba',
    'Sayxunobod', 'Sirdaryo', 'Xovos',
  ],
  SURXONDARYO: [
    'sh:Termiz', 'Angor', 'Bandixon', 'Boysun', 'Denov', "Jarqo'rg'on", 'Muzrabot', 'Oltinsoy', 'Qiziriq',
    "Qumqo'rg'on", 'Sariosiyo', 'Sherobod', "Sho'rchi", 'Termiz', 'Uzun',
  ],
  QORAQALPOGISTON: [
    'sh:Nukus', 'Amudaryo', 'Beruniy', "Bo'zatov", 'Chimboy', "Ellikqal'a", 'Kegeyli', "Mo'ynoq", 'Nukus',
    "Qanliko'l", "Qo'ng'irot", "Qorao'zak", 'Shumanay', 'Taxiatosh', "Taxtako'pir", "To'rtko'l", "Xo'jayli",
  ],
};

const toDistrict = (entry) => {
  const city = entry.startsWith('sh:');
  const base = city ? entry.slice(3) : entry;
  return { name: `${base} ${city ? 'shahri' : 'tumani'}`, base, city };
};

/** { [viloyat kodi]: [{ name: 'Chilonzor tumani', base: 'Chilonzor', city: false }] } */
export const DISTRICTS = Object.fromEntries(Object.entries(RAW).map(([code, list]) => [code, list.map(toDistrict)]));

export const districtsOf = (region) => DISTRICTS[region] || [];
export const isDistrictOf = (region, name) => districtsOf(region).some((d) => d.name === name);

/**
 * Xarita birinchi ochilganda ko'rsatiladigan hudud: viloyat markazi va taxminiy kengligi (gradus).
 * Tumanning aniq chegarasi tarmoqdan (geocode.lookupArea) olinadi — bu faqat darhol ko'rsatish uchun.
 */
export const REGION_AREAS = {
  TOSHKENT_SHAHRI: { latitude: 41.3111, longitude: 69.2797, delta: 0.28 },
  TOSHKENT_VILOYATI: { latitude: 41.1, longitude: 69.7, delta: 1.9 },
  ANDIJON: { latitude: 40.7833, longitude: 72.3442, delta: 1.1 },
  BUXORO: { latitude: 39.7747, longitude: 64.4286, delta: 2.6 },
  FARGONA: { latitude: 40.3864, longitude: 71.7864, delta: 1.5 },
  JIZZAX: { latitude: 40.1158, longitude: 67.8422, delta: 2.1 },
  XORAZM: { latitude: 41.55, longitude: 60.6333, delta: 1.5 },
  NAMANGAN: { latitude: 40.9983, longitude: 71.6726, delta: 1.3 },
  NAVOIY: { latitude: 40.0844, longitude: 65.3792, delta: 3.2 },
  QASHQADARYO: { latitude: 38.8606, longitude: 65.7891, delta: 2.3 },
  SAMARQAND: { latitude: 39.6542, longitude: 66.9597, delta: 1.9 },
  SIRDARYO: { latitude: 40.4897, longitude: 68.7842, delta: 1.3 },
  SURXONDARYO: { latitude: 37.9, longitude: 67.5, delta: 2.3 },
  QORAQALPOGISTON: { latitude: 42.46, longitude: 59.6166, delta: 4.5 },
};

// Toshkent shahri tumanlari markazi — tarmoqsiz ham xarita darhol tumanga boradi
const TASHKENT_DISTRICT_CENTERS = {
  Bektemir: [41.2092, 69.3347],
  Chilonzor: [41.2756, 69.2034],
  Mirobod: [41.2869, 69.2856],
  "Mirzo Ulug'bek": [41.3367, 69.3346],
  Olmazor: [41.3525, 69.228],
  Sergeli: [41.2234, 69.2219],
  Shayxontohur: [41.3264, 69.229],
  Uchtepa: [41.2986, 69.1733],
  Yakkasaroy: [41.2836, 69.253],
  Yangihayot: [41.19, 69.218],
  Yashnobod: [41.289, 69.339],
  Yunusobod: [41.3644, 69.2869],
};

/** Viloyat (va ma'lum bo'lsa tuman) uchun xarita hududi: { latitude, longitude, latitudeDelta, longitudeDelta } */
export function areaOf(region, districtName) {
  const district = districtsOf(region).find((d) => d.name === districtName);
  const center = region === 'TOSHKENT_SHAHRI' && district ? TASHKENT_DISTRICT_CENTERS[district.base] : null;
  if (center) return { latitude: center[0], longitude: center[1], latitudeDelta: 0.07, longitudeDelta: 0.07 };
  const area = REGION_AREAS[region] || REGION_AREAS.TOSHKENT_SHAHRI;
  return { latitude: area.latitude, longitude: area.longitude, latitudeDelta: area.delta, longitudeDelta: area.delta };
}
