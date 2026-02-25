import { faker } from "@faker-js/faker";
import { randomBytes } from "crypto";

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

export function durationMins(distanceKm: number): number {
  return Math.round((distanceKm / 850) * 60 + 35);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

export function uniqueCode(prefix: string, used: Set<string>, length = 5): string {
  for (let i = 0; i < 1000; i++) {
    const code = `${prefix}${faker.string.numeric(length)}`;
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
  }
  throw new Error(`Could not generate unique code with prefix ${prefix}`);
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function createCuid(): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(16)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16);
  return `c${time}${rand}`;
}

export function makeBookingRef(): string {
  const id = createCuid().replace(/^c/, "").toUpperCase();
  return `YK${id.slice(0, 16)}`;
}
