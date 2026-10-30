/**
 * node:test uchun yuklovchi: mobile/src fayllarini Babel bilan CommonJS'ga
 * o'giradi va native modullarni (AsyncStorage, expo-location, react-native-svg,
 * react-native) oddiy test dublyorlari bilan almashtiradi. Qurilma kerak emas.
 *
 * Ishlatish: node --test --require ./tests/setup/register.js tests/
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const babel = require(require.resolve('@babel/core', { paths: [ROOT] }));
// babel-preset-expo o'z bog'liqligi sifatida olib keladi — alohida o'rnatish shart emas
const cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs', {
  paths: [path.dirname(require.resolve('babel-preset-expo', { paths: [ROOT] }))],
});
const jsxPlugin = require.resolve('@babel/plugin-transform-react-jsx', {
  paths: [path.dirname(require.resolve('babel-preset-expo', { paths: [ROOT] }))],
});

// ─── Native stubs ────────────────────────────────────────────────────────────
const memory = {};
const svgTag = (name) => {
  const C = () => null;
  C.displayName = name;
  return C;
};
const SVG_TAGS = ['Svg', 'Path', 'Rect', 'Circle', 'G', 'Defs', 'LinearGradient', 'Stop', 'ClipPath', 'Pattern', 'Text'];
const svg = Object.fromEntries(SVG_TAGS.map((n) => [n, svgTag(n)]));

const location = {
  calls: [],
  permission: { status: 'granted', canAskAgain: true },
  requestResult: { status: 'granted', canAskAgain: true },
  servicesEnabled: true,
  position: { coords: { latitude: 41.3, longitude: 69.28 } },
  reverse: [],
  forward: [],
  Accuracy: { Balanced: 3 },
};
location.getForegroundPermissionsAsync = async () => { location.calls.push('getPermission'); return location.permission; };
location.requestForegroundPermissionsAsync = async () => { location.calls.push('requestPermission'); return location.requestResult; };
location.hasServicesEnabledAsync = async () => location.servicesEnabled;
location.getCurrentPositionAsync = async () => { location.calls.push('getCurrentPosition'); return location.position; };
location.reverseGeocodeAsync = async () => location.reverse;
location.geocodeAsync = async () => location.forward;

const view = svgTag('View');
const stubs = {
  '@react-native-async-storage/async-storage': {
    __esModule: true,
    default: {
      getItem: async (k) => (k in memory ? memory[k] : null),
      setItem: async (k, v) => { memory[k] = v; },
      removeItem: async (k) => { delete memory[k]; },
    },
  },
  'expo-location': { __esModule: true, ...location, default: location },
  'react-native-svg': { __esModule: true, default: svg.Svg, ...svg },
  'react-native': {
    __esModule: true,
    View: view,
    Text: svgTag('RNText'),
    StyleSheet: { create: (s) => s, absoluteFill: {} },
    Linking: {
      opened: [],
      openSettings: async () => {},
      // tg:// — test boshqaradi (Telegram o'rnatilgan / yo'q)
      canOpenURL: async (url) => !url.startsWith('tg://') || global.__stubs.telegramInstalled === true,
      openURL: async (url) => {
        stubs['react-native'].Linking.opened.push(url);
      },
    },
    AppState: { addEventListener: () => ({ remove() {} }) },
    Platform: { OS: 'android', select: (o) => o.android ?? o.default },
  },
};
global.__stubs = { location, memory };
global.__DEV__ = true;

const origResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, ...rest) {
  if (stubs[request]) return `stub:${request}`;
  return origResolve.call(this, request, parent, ...rest);
};
for (const [name, exports] of Object.entries(stubs)) {
  const m = new Module(`stub:${name}`);
  m.exports = exports;
  m.loaded = true;
  require.cache[`stub:${name}`] = m;
}

const SRC = path.join(ROOT, 'src') + path.sep;
const defaultJs = Module._extensions['.js'];
Module._extensions['.js'] = function load(module, filename) {
  if (!filename.startsWith(SRC)) return defaultJs(module, filename);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [cjsPlugin, [jsxPlugin, { runtime: 'automatic' }]],
  });
  return module._compile(code, filename);
};
