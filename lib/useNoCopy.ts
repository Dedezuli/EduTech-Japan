"use client";

import { useEffect } from "react";

/**
 * Pencegahan copy-paste di layar ujian (lapisan pencegah, bukan keamanan mutlak:
 * screenshot / kamera tetap tidak bisa dicegah dari browser).
 * - blok copy / cut / paste / klik kanan / drag
 * - blok Ctrl/Cmd + C, X, V, A, S, P, U
 * - kosongkan seleksi jika ada
 */
export function useNoCopy() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "a", "s", "p", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onSelect = () => {
      const sel = window.getSelection();
      if (sel && sel.toString()) sel.removeAllRanges();
    };
    const events = ["copy", "cut", "paste", "contextmenu", "dragstart", "selectstart"] as const;
    events.forEach((ev) => document.addEventListener(ev, block));
    document.addEventListener("keydown", onKey);
    document.addEventListener("selectionchange", onSelect);
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, block));
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("selectionchange", onSelect);
    };
  }, []);
}
