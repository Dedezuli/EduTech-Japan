import "server-only";
import { headers } from "next/headers";

/**
 * Pembatas percobaan login sederhana (in-memory, per proses).
 * Cukup untuk satu instance server; untuk multi-instance pindahkan ke Redis/DB.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const hits = new Map<string, { count: number; resetAt: number }>();

async function clientKey(scope: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

/** Mengembalikan true bila klien masih boleh mencoba; mencatat satu percobaan. */
export async function allowAttempt(scope: string): Promise<boolean> {
  const key = await clientKey(scope);
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

/** Hapus catatan setelah login berhasil. */
export async function clearAttempts(scope: string) {
  hits.delete(await clientKey(scope));
}

export const TOO_MANY = "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
