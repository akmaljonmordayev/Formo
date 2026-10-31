// API manzili: Wi-Fi almashib .env dagi IP eskirsa, dev'da Metro xosti olinadi
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { resolveApiUrl } = require(path.join(__dirname, '..', 'src', 'utils', 'apiUrl.js'));

test('eski lokal IP Metro xostiga almashtiriladi, port va yo‘l saqlanadi', () => {
  assert.equal(resolveApiUrl('http://192.168.50.77:3001/api', 'http://192.168.1.42:8081/'), 'http://192.168.1.42:3001/api');
  assert.equal(resolveApiUrl('http://localhost:3001', 'http://192.168.1.42:8081/'), 'http://192.168.1.42:3001/api');
});

test('production, emulyator va dev bo‘lmagan holat o‘zgarmaydi', () => {
  assert.equal(resolveApiUrl('https://api.formo.uz/api', 'http://192.168.1.42:8081/'), 'https://api.formo.uz/api');
  assert.equal(resolveApiUrl('http://10.0.2.2:3001/api', 'http://localhost:8081/'), 'http://10.0.2.2:3001/api');
  assert.equal(resolveApiUrl('http://192.168.50.77:3001/api', null), 'http://192.168.50.77:3001/api');
  assert.equal(resolveApiUrl(undefined, null), 'https://api.formo.uz/api');
});
