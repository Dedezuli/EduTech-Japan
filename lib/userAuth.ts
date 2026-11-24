import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userFromSession } from "./db";

/** Cookie sesi login peserta ujian (terpisah dari login admin). */
export const USER_COOKIE = "edutech_user";

export async function currentUser() {
  return userFromSession((await cookies()).get(USER_COOKIE)?.value);
}

export async function requireUser(next?: string) {
  const user = await currentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}
