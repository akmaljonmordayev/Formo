/** Node'da DOM canvas yo'q — chaqiruvlarni yozib boradigan soxta 2D kontekst */
export function fakeCanvasFactory() {
  const canvases = [];
  const create = (width, height) => {
    const calls = [];
    const state = {};
    const ctx = new Proxy(state, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (prop === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
        return (...args) => {
          calls.push({ fn: prop, args, font: target.font, fillStyle: target.fillStyle });
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    });
    const canvas = { width, height, calls, getContext: () => ctx };
    canvases.push(canvas);
    return canvas;
  };
  return { create, canvases };
}

export const textsOf = (canvas, fn = 'fillText') => canvas.calls.filter((c) => c.fn === fn).map((c) => c.args[0]);
