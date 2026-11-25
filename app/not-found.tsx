import Link from "next/link";

export const metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-gray-50 p-6 text-center">
      <div>
        <p className="text-5xl font-bold text-brand-700">404</p>
        <h1 className="mt-3 text-xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-gray-600">ページが見つかりません。Alamat salah atau halaman sudah dihapus.</p>
        <Link href="/" className="mt-5 inline-block rounded bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
