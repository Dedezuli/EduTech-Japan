import { CHOICE_KEYS, validateQuestion, type QuestionDraft } from "./validate";
import type { Question } from "./types";

/**
 * Format CSV soal (baris pertama = header, urutan kolom bebas):
 * section,question,choice_a,choice_b,choice_c,choice_d,answer,explanation
 *
 * choice_a..d = ア..エ. answer boleh ア/イ/ウ/エ, A–D, atau 1–4.
 * Furigana tetap memakai format {漢字|かんじ}.
 */
export const CSV_COLUMNS = [
  "section",
  "question",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "answer",
  "explanation",
] as const;

const REQUIRED = CSV_COLUMNS.filter((c) => c !== "explanation");

/** Parser CSV (RFC 4180): mendukung koma, tanda kutip, dan baris baru di dalam kutip. */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Deteksi pemisah: Excel versi lokal tertentu memakai titik koma.
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface CsvRowResult {
  line: number;
  value?: QuestionDraft;
  errors: string[];
}

export function csvToQuestions(input: string): { rows: CsvRowResult[]; headerErrors: string[] } {
  const table = parseCSV(input);
  if (table.length === 0) return { rows: [], headerErrors: ["File CSV kosong"] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) {
    return { rows: [], headerErrors: [`Kolom wajib tidak ada: ${missing.join(", ")}`] };
  }
  const col = (name: string, r: string[]) => r[header.indexOf(name)] ?? "";

  const rows = table.slice(1).map((r, i) => {
    const res = validateQuestion({
      section: col("section", r),
      text: col("question", r),
      choices: [col("choice_a", r), col("choice_b", r), col("choice_c", r), col("choice_d", r)],
      answer: col("answer", r),
      explanation: header.includes("explanation") ? col("explanation", r) : undefined,
    });
    return { line: i + 2, ...res };
  });
  return { rows, headerErrors: [] };
}

function esc(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function questionsToCSV(qs: Pick<Question, "section" | "text" | "choices" | "answer" | "explanation">[]) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const q of qs) {
    const choice = (k: (typeof CHOICE_KEYS)[number]) => q.choices.find((c) => c.key === k)?.text ?? "";
    lines.push(
      [q.section, q.text, ...CHOICE_KEYS.map(choice), q.answer, q.explanation ?? ""].map(esc).join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
