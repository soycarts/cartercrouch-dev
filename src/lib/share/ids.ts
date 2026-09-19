import { randomInt } from "node:crypto";

// Opaque public IDs. A 58-character alphabet (Bitcoin base58: no 0/O/I/l
// look-alikes) at 22 characters gives log2(58^22) ≈ 129 bits of entropy,
// clearing the spec's ~128-bit floor. Each character is drawn with
// crypto.randomInt so there is no modulo bias.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const SHARE_ID_LENGTH = 22;
export const SHARE_ID_PATTERN = new RegExp(
  `^[${ALPHABET}]{${SHARE_ID_LENGTH}}$`,
);

export function generateShareId(): string {
  let id = "";
  for (let i = 0; i < SHARE_ID_LENGTH; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
}

export function isShareId(value: string): boolean {
  return SHARE_ID_PATTERN.test(value);
}
