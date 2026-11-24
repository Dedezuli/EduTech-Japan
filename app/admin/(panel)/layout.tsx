import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const metadata = { title: "Admin · eduTech CBT" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-gray-100" lang="id">
      <header className="flex items-center gap-4 bg-black px-4 py-3 text-white sm:px-6">
        <Link href="/admin" className="font-bold">
          eduTech CBT · Admin
        </Link>
        <nav className="flex gap-4 text-sm text-gray-300">
          <Link href="/admin" className="hover:text-white">
            Ujian
          </Link>
          <Link href="/admin/users" className="hover:text-white">
            Peserta
          </Link>
          <Link href="/admin/results" className="hover:text-white">
            Hasil
          </Link>
          <Link href="/" className="hover:text-white" target="_blank">
            Lihat situs ↗
          </Link>
        </nav>
        <form action={logout} className="ml-auto">
          <button className="text-sm text-gray-300 hover:text-white">Keluar</button>
        </form>
      </header>
      <div className="h-1.5 bg-brand-600" />
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">{children}</main>
    </div>
  );
}
