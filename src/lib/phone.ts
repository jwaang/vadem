/** Strip non-digits, remove leading country code `1` if 11 digits → 10-digit canonical form */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw).length === 10;
}

/** Format a stored phone string as `555-555-5555`. Returns raw value if not a valid 10-digit number. */
export function formatPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length !== 10) return raw;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Progressive phone formatter for inputs. Strips non-digits, clamps at 10, inserts dashes as the user types.
 * e.g. "5551" → "555-1", "5551234567" → "555-123-4567"
 */
export function formatPhoneInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Returns an error string or empty string.
 * @param required If false, empty phone is allowed (returns "").
 */
export function validatePhone(raw: string, required = true): string {
  if (!raw.trim()) return required ? "Phone number is required." : "";
  if (!isValidPhone(raw)) return "Enter a valid 10-digit US phone number.";
  return "";
}
