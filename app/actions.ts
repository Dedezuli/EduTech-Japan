"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginUser, logoutSession } from "@/lib/db";
import { USER_COOKIE } from "@/lib/userAuth";

export type LoginState = { error?: string; username?: string };

export async function userLogin(_: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const token = await loginUser(username, password);
  if (!token) return { error: "Username atau password salah, atau akun dinonaktifkan.", username };
  (await cookies()).set(USER_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function userLogout() {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (token) await logoutSession(token);
  jar.delete(USER_COOKIE);
  redirect("/login");
}
