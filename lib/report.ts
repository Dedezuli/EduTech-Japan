import type { ChoiceKey } from "./types";
import { stripRuby } from "./ruby";

/** Satu baris detail hasil: jawaban peserta untuk satu soal. */
export interface ResultDetailItem {
  questionId: string;
  section: string;
  choice: ChoiceKey | null;
  answer: ChoiceKey;
}

export type ResultMode = "latihan" | "simulasi";

/** Hasil (latihan / simulasi) yang tersimpan di riwayat. */
export interface ResultRecord {
  id: string;
  userId: string;
  examId: string;
  mode: ResultMode;
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  durationSec: number;
  createdAt: number;
  detail: ResultDetailItem[];
}

export interface TopicStat {
  /** Nama materi dengan furigana ({漢字|かな}) */
  topic: string;
  correct: number;
  total: number;
  pct: number;
}

export const MODE_LABEL: Record<ResultMode, string> = {
  latihan: "Latihan",
  simulasi: "Simulasi Ujian",
};

export function scoreOf(correct: number, total: number) {
  return total ? Math.round((correct / total) * 100) : 0;
}

/** Persentase penguasaan per materi (berdasarkan seksi soal). Urutan = urutan muncul. */
export function topicStats(items: ResultDetailItem[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const it of items) {
    const key = stripRuby(it.section) || "（その他）";
    const s = map.get(key) ?? { topic: it.section || "（その他）", correct: 0, total: 0, pct: 0 };
    s.total += 1;
    if (it.choice === it.answer) s.correct += 1;
    map.set(key, s);
  }
  return [...map.values()].map((s) => ({ ...s, pct: scoreOf(s.correct, s.total) }));
}

/** Label tingkat pemahaman untuk persentase. */
export function masteryLabel(pct: number): { ja: string; id: string; tone: "good" | "mid" | "low" } {
  if (pct >= 80) return { ja: "よく理解している", id: "Sudah paham", tone: "good" };
  if (pct >= 60) return { ja: "おおむね理解", id: "Cukup paham", tone: "mid" };
  return { ja: "要復習", id: "Perlu belajar lagi", tone: "low" };
}
