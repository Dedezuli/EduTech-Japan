import type { ExamSettings } from "./types";

/** Hanya pengaturan tampilan (ukuran huruf, furigana) yang disimpan di browser. Jawaban & waktu ada di server. */
const SETTINGS_KEY = "edutech:settings";

export const defaultSettings: ExamSettings = { fontScale: "normal", showFurigana: true };

export function loadSettings(): ExamSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return { ...defaultSettings, ...(raw ? (JSON.parse(raw) as Partial<ExamSettings>) : {}) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: ExamSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* abaikan */
  }
}
