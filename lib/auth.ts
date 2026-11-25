import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Login admin sederhana dengan satu password dari env ADMIN_PASSWORD (.env.local).
 * Default "admin123" hanya untuk lokal. Ganti sebelum dipakai di server sungguhan,
 * dan nanti ganti ke sistem akun (NextAuth/Auth.js, Supabase Auth, dll).
 */
export const ADMIN_COOKIE = "edutech_admin";

const isProd = process.env.NODE_ENV === "production";

/** Di produksi ADMIN_PASSWORD wajib diisi; password default hanya berlaku saat pengembangan lokal. */
function adminPassword() {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  if (isProd) throw new Error("ADMIN_PASSWORD belum diatur. Isi di environment sebelum menjalankan di produksi.");
  return "admin123";
}

/** Opsi cookie sesi yang aman (Secure otomatis aktif di produksi). */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd,
  path: "/",
  maxAge: 60 * 60 * 12,
};

function tokenFor(password: string) {
  return createHash("sha256").update(`edutech-admin:${password}`).digest("hex");
}

export function checkPassword(input: string) {
  const a = Buffer.from(tokenFor(input));
  const b = Buffer.from(tokenFor(adminPassword()));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionToken() {
  return tokenFor(adminPassword());
}

export async function isAdmin() {
  const c = (await cookies()).get(ADMIN_COOKIE)?.value;
  return c === sessionToken();
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
