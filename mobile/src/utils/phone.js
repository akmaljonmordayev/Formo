// ─── Uzbek phone helpers (+998 XX XXX XX XX) ─────────────────────────────────

/** Extracts digits only; strips a leading 998 country code if the user typed it. */
function extractSubscriberDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, 9);
}

/**
 * Formats any input into the display mask "+998 XX XXX XX XX".
 * The +998 prefix is always present and cannot be removed by backspace.
 */
export function formatUzPhone(raw) {
  const digits = extractSubscriberDigits(raw);
  let out = '+998';
  if (digits.length > 0) out += ` ${digits.slice(0, 2)}`;
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`;
  if (digits.length > 5) out += ` ${digits.slice(5, 7)}`;
  if (digits.length > 7) out += ` ${digits.slice(7, 9)}`;
  return out;
}

/** Canonical API format: "+998XXXXXXXXX". */
export function normalizePhone(raw) {
  return `+998${extractSubscriberDigits(raw)}`;
}

/** True when the input holds a complete Uzbek subscriber number. */
export function isValidUzPhone(raw) {
  return /^\+998\d{9}$/.test(normalizePhone(raw));
}

/**
 * Computes the next subscriber digits for a masked input.
 * Keeps the +998 prefix intact and treats a backspace over a separator
 * as a real digit deletion so the mask feels natural.
 *
 * @param {string} text   raw TextInput value (already formatted or not)
 * @param {string} prevDigits  previous subscriber digits (without +998)
 */
export function pickPhoneDigits(text, prevDigits) {
  const raw = String(text || '');
  const digitsOnly = raw.replace(/\D/g, '');

  // The +998 prefix is sticky: ignore edits that delete part of it ("+99", "")
  if (!raw.startsWith('+998') && digitsOnly.length < 9 && '998'.startsWith(digitsOnly)) {
    return prevDigits;
  }

  let digits = digitsOnly;
  if (digits.startsWith('998')) digits = digits.slice(3);

  if (digits.length === prevDigits.length && prevDigits.length < 9) {
    // No new digits appeared — a separator/plus was deleted; drop one digit
    digits = digits.slice(0, -1);
  }
  return digits.slice(0, 9);
}
