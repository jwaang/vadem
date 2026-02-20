/** Strip non-digits, remove leading country code `1` if 11 digits → 10-digit canonical form */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw).length === 10;
}
