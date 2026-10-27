// Order tracking codes.
// 10 random symbols from a 31-char alphabet (no 0/O/1/I/L) ≈ 49.5 bits of entropy
// (~8.2e14 combinations). Combined with attempt rate-limiting this makes guessing
// another customer's code impractical. Codes are NOT sequential.

export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 10;

function randomIndex(max: number): number {
  // Rejection sampling to avoid modulo bias.
  const buf = new Uint8Array(1);
  const limit = 256 - (256 % max);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** Returns a normalized code (no prefix / separators), e.g. "7K3QX9MPRA". */
export function generateCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randomIndex(CODE_ALPHABET.length)];
  return s;
}

/** Human display: SS-7K3QX-9MPRA */
export function displayCode(code: string): string {
  return `SS-${code.slice(0, 5)}-${code.slice(5)}`;
}

/** Accepts "ss-7k3qx-9mpra", "SS 7K3QX 9MPRA", "7K3QX9MPRA" ... and returns the normalized code or null. */
export function normalizeCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.length === CODE_LENGTH + 2 && s.startsWith('SS')) s = s.slice(2);
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}
