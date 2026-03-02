import { randomBytes } from "crypto";

/**
 * Generates a CUID-compatible string ID.
 * Format: c<timestamp-base36><16-char-random-alphanum>
 * Consistent with the Prisma schema's @default(cuid()) and seed helpers.
 */
export function createCuid(): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(16)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16);
  return `c${time}${rand}`;
}
