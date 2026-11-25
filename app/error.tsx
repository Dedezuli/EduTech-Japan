"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-gray-50 p-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Terjadi kesalahan</h1>
        <p className="mt-1 text-sm text-gray-600">
          エラーが発生しました。Jawaban Anda yang sudah tersimpan tidak hilang. Silakan coba lagi.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={reset} className="rounded bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700">
            Coba lagi
          </button>
          <Link href="/" className="rounded border border-gray-300 bg-white px-5 py-2 text-sm font-bold hover:bg-gray-100">
            Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
