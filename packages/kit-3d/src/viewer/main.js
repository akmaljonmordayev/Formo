import { createKitScene } from '../scene.js';
import { VIEWER_SOURCE } from './protocol.js';

/**
 * Mobil ilova ichidagi mustaqil 3D ko'rinish (dist/viewer.html): admin bilan aynan bir xil sahna kodi.
 * Ilova bilan postMessage orqali gaplashadi (protocol.js):
 *   ilova → sahifa: { source, type: 'update', props: { design, backName, number, glow, patch, view, autoRotate } }
 *   sahifa → ilova: { source, type: 'ready' | 'face' | 'error', ... }
 * React Native WebView'da window.ReactNativeWebView, web'da (iframe) window.parent ishlatiladi.
 */

const root = document.getElementById('kit');
let scene = null;
let view = 'front';

function send(type, extra = {}) {
  const msg = JSON.stringify({ source: VIEWER_SOURCE, type, ...extra });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
  else if (window.parent !== window) window.parent.postMessage(msg, '*');
}

function apply(props = {}) {
  if (!scene) {
    view = props.view === 'back' ? 'back' : 'front';
    scene = createKitScene(root, {
      ...props,
      view,
      autoRotate: props.autoRotate === true,
      // Ilova o'zi ~80 ms debounce qiladi — sahifada qo'shimcha kechikish kerak emas
      textureSize: props.textureSize || 1024,
      debounceMs: 0,
      // Barmoq bilan aylantirilganda ilova "view"ni shu tomonga o'zgartiradi — qaytib kelgan update
      // kamerani qayta burmasligi uchun joriy tomon shu yerda yangilanadi
      onViewChange: (face) => {
        view = face;
        send('face', { view: face });
      },
    });
    return;
  }
  scene.update(props);
  if (props.view && props.view !== view) {
    view = props.view;
    scene.setView(view);
  }
  if ('autoRotate' in props) scene.setAutoRotate(props.autoRotate === true);
}

function onMessage(event) {
  // web: faqat ota oynadan; RN: event.source yo'q
  if (event.source && event.source !== window.parent) return;
  let msg = event.data;
  if (typeof msg === 'string') {
    try {
      msg = JSON.parse(msg);
    } catch {
      return;
    }
  }
  if (!msg || msg.source !== VIEWER_SOURCE || msg.type !== 'update') return;
  try {
    apply(msg.props);
  } catch (err) {
    send('error', { message: String(err?.message || err) });
  }
}

window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage); // Android WebView
window.addEventListener('error', (e) => send('error', { message: String(e.message || 'error') }));
send('ready');
