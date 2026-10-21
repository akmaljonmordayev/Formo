// ─── DEV-ONLY: global TextInput focus tracing (v3) ──────────────────────────
//
// Answers "WHO stole / moved focus?" for a real device session:
//
//   1. MOUNT / UNMOUNT of every TextInput host view, with its stable #tag,
//      its React component path, its native view tag and the caller stack of
//      the unmount. A NEW #tag for the same component path == REMOUNT; the
//      same #tag == the same native view being reused.
//   2. Every JS-initiated focus()/blur() request WITH caller stack, classified
//      as `moved` (it really changed the focused input) or `noop` (early
//      return: already focused / not editable). Only `moved` lines can steal
//      focus — this removes the false "repeated FOCUS(req)" noise from taps
//      on an already focused input.
//   3. Native focus/blur events arriving from the platform (a `FOCUS` with no
//      `FOCUS(req)` right before it was moved by the OS, not by JS).
//
// A transition therefore reads like:
//   [FocusTrace] MOUNT #3 PhoneScreen > View > AndroidTextInput native=812
//   [FocusTrace] [js] FOCUS(req) (moved) → #3 …  at PhoneScreen.js:139
//   [FocusTrace] FOCUS → #3 …                       (native grant)
//   [FocusTrace] BLUR → #3 …                        (native blur)
//   [FocusTrace] UNMOUNT #4 … (was focused)  at commitHookEffectListUnmount…
//
// Nothing here changes focus behaviour: every wrapped call invokes the
// original React Native implementation, always AFTER the log payload is
// captured. `__DEV__`-guarded, so release builds are untouched. To remove
// entirely, delete the two lines in index.js and this file.
//
// NOTE: React Native exposes no supported public API for focus tracing
// (`TextInput.State` covers programmatic requests only, not native events or
// input registration). The deep imports below are therefore load-guarded: if
// RN renames them, tracing silently degrades to a no-op instead of crashing.
// `TextInputState` is the single JS funnel: ReactNativeElement.focus()/blur()
// route through focusTextInput/blurTextInput, and TextInput's own native
// focus/blur handlers route through focusInput/blurInput.

/* global __DEV__ */

const tags = new WeakMap();
const labels = new WeakMap();
const announced = new WeakSet();
let tagCounter = 0;
let privateApi = null;
let coreAvailable = false;

const isDevBuild = () => typeof __DEV__ === 'undefined' || __DEV__ === true;

/** First ~6 frames after the wrapper — the caller of focus()/blur(). */
const callerStack = () => {
  try {
    return (new Error().stack || '')
      .split('\n')
      .slice(2)
      .slice(0, 6)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' | ');
  } catch {
    return '';
  }
};

/** Stable per-input tag, e.g. "#3" — stable across re-renders, new per mount. */
const tagOf = (el) => {
  if (el == null) return 'none';
  let tag = tags.get(el);
  if (tag == null) {
    tagCounter += 1;
    tag = `#${tagCounter}`;
    tags.set(el, tag);
  }
  return tag;
};

/** Native view tag — same value == same native EditText (no remount). */
const nativeTagOf = (el) => {
  try {
    const tag = el?.__nativeTag ?? el?.canonical?.nativeTag;
    return typeof tag === 'number' ? tag : null;
  } catch {
    return null;
  }
};

/** The input's host fiber, resolved from its public instance. */
const fiberOf = (el) => {
  try {
    const resolve = privateApi?.getInternalInstanceHandleFromPublicInstance;
    if (typeof resolve !== 'function') return null;
    return resolve(el) || null;
  } catch {
    return null;
  }
};

/** Component chain for the input's fiber, e.g. "PhoneScreen > View > TextInput". */
const componentPath = (el) => {
  try {
    let fiber = fiberOf(el);
    const names = [];
    let hops = 0;
    while (fiber != null && hops < 16) {
      const type = fiber.type;
      if (typeof type === 'string') {
        names.push(type);
      } else if (type != null && (typeof type === 'function' || typeof type === 'object')) {
        const name = type.displayName || type.name || type.render?.name;
        if (name) names.push(name);
      }
      fiber = fiber.return;
      hops += 1;
    }
    return names.reverse().slice(-4).join(' > ');
  } catch {
    return '';
  }
};

/** React `key` of the TextInput element — a changing key == forced remount. */
const keyOf = (el) => {
  try {
    const key = fiberOf(el)?.key;
    return key == null ? '' : String(key);
  } catch {
    return '';
  }
};

const describe = (el) => {
  if (el == null) return 'none';
  const bits = [tagOf(el)];
  try {
    const path = componentPath(el);
    if (path) bits.push(path);
    const nativeTag = nativeTagOf(el);
    if (nativeTag != null) bits.push(`native=${nativeTag}`);
    const key = keyOf(el);
    if (key) bits.push(`key=${key}`);
    const props = el.currentProps || {};
    if (typeof props.placeholder === 'string' && props.placeholder) {
      bits.push(`ph="${props.placeholder}"`);
    }
    if (typeof props.value === 'string' && props.value) {
      bits.push(`val="${props.value.slice(0, 10)}"`);
    }
    if (props.secureTextEntry) bits.push('secure');
    if (props.multiline) bits.push('multiline');
  } catch {
    /* a torn-down instance can throw while being described */
  }
  return bits.join(' ');
};

const log = (message) => {
  try {
    console.log(`[FocusTrace] ${message}`);
  } catch {
    /* console unavailable — tracing must never throw */
  }
};

export function install() {
  if (!isDevBuild()) return; // release bundle: leave react-native untouched.
  if (coreAvailable) return;

  // RN internals, loaded lazily so a release bundle never evaluates them.
  let TextInputState = null;
  try {
    const mod = require('react-native/Libraries/Components/TextInput/TextInputState.js');
    TextInputState = mod?.default ?? mod;
  } catch {
    TextInputState = null;
  }
  try {
    const mod = require('react-native/Libraries/ReactPrivate/ReactNativePrivateInterface.js');
    privateApi = mod?.default ?? mod;
  } catch {
    privateApi = null;
  }

  if (TextInputState == null) {
    log('unavailable (TextInputState import failed) — tracing disabled');
    return;
  }

  const original = {
    focusInput: TextInputState.focusInput,
    blurInput: TextInputState.blurInput,
    focusTextInput: TextInputState.focusTextInput,
    blurTextInput: TextInputState.blurTextInput,
    registerInput: TextInputState.registerInput,
    unregisterInput: TextInputState.unregisterInput,
  };

  const currentlyFocused = () => {
    try {
      return TextInputState.currentlyFocusedInput();
    } catch {
      return undefined;
    }
  };

  // Stack captured by the prototype wrapper (outermost, app-side caller). The
  // nested TextInputState wrapper reuses it so one focus() call logs one line
  // whose stack starts at the real caller.
  let pendingStack = null;
  let depth = 0;

  const traceRequest = (kind, el, stack, run) => {
    const before = currentlyFocused();
    const stackToUse = stack || pendingStack || callerStack();
    const result = run();
    const after = currentlyFocused();
    log(
      `[js] ${kind} (${after !== before ? 'moved' : 'noop'}) → ${describe(el)}  at ${stackToUse}`,
    );
    return result;
  };

  // 1. Native events arriving from the platform — these mean the OS really
  //    changed focus (JS was not asked to do it).
  TextInputState.focusInput = function focusInput(el) {
    log(`FOCUS → ${describe(el)}`);
    return original.focusInput.call(TextInputState, el);
  };
  TextInputState.blurInput = function blurInput(el) {
    log(`BLUR → ${describe(el)}`);
    return original.blurInput.call(TextInputState, el);
  };

  // 2. Programmatic requests made anywhere (framework or app), with caller.
  TextInputState.focusTextInput = function focusTextInput(el) {
    return traceRequest('FOCUS(req)', el, pendingStack, () =>
      original.focusTextInput.call(TextInputState, el),
    );
  };
  TextInputState.blurTextInput = function blurTextInput(el) {
    return traceRequest('BLUR(req)', el, pendingStack, () =>
      original.blurTextInput.call(TextInputState, el),
    );
  };

  // 3. Direct instance calls (`ref.current.focus()` / `.blur()`). In RN 0.86
  //    these are ReactNativeElement.prototype methods that route through
  //    focusTextInput/blurTextInput, but only while the instance is registered
  //    (`isTextInput()` == `inputs.has(instance)`); otherwise they fall back to
  //    a raw native command. Wrapping the prototype captures THAT fallback too
  //    and gives us the app-side caller frame for the nested funnel call.
  let prototypeWrapped = false;
  const wrapPrototype = (el) => {
    if (prototypeWrapped || el == null) return;
    const proto = Object.getPrototypeOf(el);
    if (!proto || typeof proto.focus !== 'function' || proto.__formoFocusTrace) return;
    proto.__formoFocusTrace = true;
    for (const name of ['focus', 'blur']) {
      const impl = proto[name];
      if (typeof impl !== 'function') continue;
      proto[name] = function wrapped(...args) {
        const outer = depth === 0;
        if (outer) pendingStack = callerStack();
        depth += 1;
        try {
          return impl.apply(this, args);
        } finally {
          depth -= 1;
          if (outer) pendingStack = null;
        }
      };
    }
    prototypeWrapped = true;
  };

  // 4. Registration == the TextInput host view exists (mount / ref attach);
  //    unregistration happens ONLY from TextInput's mount-effect cleanup, i.e.
  //    a real unmount. That is the signal that tells remount from reuse.
  TextInputState.registerInput = function registerInput(el) {
    wrapPrototype(el);
    if (el != null && !announced.has(el)) {
      announced.add(el);
      const info = describe(el);
      labels.set(el, info);
      log(`MOUNT ${info}`);
    }
    return original.registerInput.call(TextInputState, el);
  };

  TextInputState.unregisterInput = function unregisterInput(el) {
    const info = labels.get(el) || describe(el);
    const wasFocused = currentlyFocused() === el;
    announced.delete(el);
    log(`UNMOUNT ${info}${wasFocused ? ' (was focused)' : ''}  at ${callerStack()}`);
    return original.unregisterInput.call(TextInputState, el);
  };

  coreAvailable = true;
  log('v3 installed — mount/unmount + effective focus/blur + caller stacks');
}

export default { install };
