"use client";

/** Tombol cetak / simpan sebagai PDF (lewat dialog cetak browser). */
export function PrintButton({ label = "Cetak / Simpan PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700 print:hidden"
    >
      {label}
    </button>
  );
}
