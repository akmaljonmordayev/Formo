/**
 * Formats a numeric value as a localized currency string.
 * @param {number} value - The amount to format.
 * @param {string} [currency="so'm"] - The currency label appended after the number.
 * @returns {string} e.g. "289 000 so'm"
 */
export function formatMoney(value, currency = "so'm") {
  if (value == null || isNaN(value)) return `0 ${currency}`;
  const formatted = Number(value).toLocaleString('uz-UZ');
  return `${formatted} ${currency}`;
}

/**
 * Parses an ISO 8601 or DD.MM.YYYY date string and returns a DD.MM.YYYY string.
 * @param {string} dateString
 * @returns {string} e.g. "24.08.2024"
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  // Already in DD.MM.YYYY format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return dateString;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Normalizes a phone number string to "+998 XX XXX XX XX" display format.
 * Accepts +998XXXXXXXXX, 998XXXXXXXXX, or 0XXXXXXXXX input.
 * @param {string} phone
 * @returns {string} e.g. "+998 90 123 45 67"
 */
export function formatPhone(phone) {
  if (!phone) return '';

  // Strip everything except digits
  const digits = phone.replace(/\D/g, '');

  // Normalize to 12-digit string starting with 998
  let normalized = digits;
  if (normalized.startsWith('998') && normalized.length === 12) {
    // already correct
  } else if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '998' + normalized.slice(1);
  } else if (normalized.length === 9) {
    normalized = '998' + normalized;
  } else {
    return phone; // return as-is if we can't parse it
  }

  // Format: +998 XX XXX XX XX
  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8, 10)} ${normalized.slice(10, 12)}`;
}
