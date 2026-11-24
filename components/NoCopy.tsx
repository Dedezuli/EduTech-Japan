"use client";

import { useNoCopy } from "@/lib/useNoCopy";

/** Bungkus konten soal agar tidak bisa diseleksi / di-copy. */
export function NoCopy({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  useNoCopy();
  return <div className={`no-copy ${className}`}>{children}</div>;
}
