// AVTOMATIK YARATILGAN — tahrirlamang (Kit360/viewer/build.mjs).
// Jamoa kadrlari kerak bo'lganda yuklanadi: framesOf('ar') -> { f: [8 ta data: URL], l?: [...] } | null
/* eslint-disable global-require */
const LOADERS = {
  "ar": () => require('./ar').default,
  "ars": () => require('./ars').default,
  "atm": () => require('./atm').default,
  "che": () => require('./che').default,
  "de": () => require('./de').default,
  "en": () => require('./en').default,
  "es": () => require('./es').default,
  "fcb": () => require('./fcb').default,
  "fr": () => require('./fr').default,
  "juv": () => require('./juv').default,
  "lfc": () => require('./lfc').default,
  "mci": () => require('./mci').default,
  "mu": () => require('./mu').default,
  "psg": () => require('./psg').default,
  "pt": () => require('./pt').default,
  "rm": () => require('./rm').default,
  "rom": () => require('./rom').default,
  "uz": () => require('./uz').default,
};
const cache = {};
export function framesOf(team) {
  if (!LOADERS[team]) return null;
  if (!cache[team]) cache[team] = LOADERS[team]();
  return cache[team];
}
export const FRAME_TEAMS = Object.keys(LOADERS);
