import type { ChoiceKey, Question } from "./types";

export const CHOICE_KEYS: ChoiceKey[] = ["ア", "イ", "ウ", "エ"];

export type QuestionDraft = Omit<Question, "id">;

/** Terima ア/イ/ウ/エ, A–D, atau 1–4 sebagai kunci jawaban. */
export function normalizeAnswer(raw: string): ChoiceKey | null {
  const v = raw.trim().toUpperCase();
  const map: Record<string, ChoiceKey> = {
    ア: "ア", イ: "イ", ウ: "ウ", エ: "エ",
    A: "ア", B: "イ", C: "ウ", D: "エ",
    "1": "ア", "2": "イ", "3": "ウ", "4": "エ",
  };
  return map[v] ?? null;
}

function checkBraces(label: string, s: string, errors: string[]) {
  const open = (s.match(/\{/g) ?? []).length;
  const close = (s.match(/\}/g) ?? []).length;
  const ok = (s.match(/\{[^|{}]+\|[^{}]+\}/g) ?? []).length;
  if (open !== close || open !== ok) errors.push(`${label}: format furigana salah, gunakan {漢字|かんじ}`);
}

export interface RawQuestion {
  section: string;
  text: string;
  choices: [string, string, string, string];
  answer: string;
  explanation?: string;
}

export function validateQuestion(raw: RawQuestion): { value?: QuestionDraft; errors: string[] } {
  const errors: string[] = [];
  const section = raw.section.trim();
  const text = raw.text.trim();
  const choices = raw.choices.map((c) => c.trim());
  const explanation = raw.explanation?.trim() || undefined;

  if (!section) errors.push("Seksi wajib diisi");
  if (!text) errors.push("Teks soal wajib diisi");
  choices.forEach((c, i) => !c && errors.push(`Pilihan ${CHOICE_KEYS[i]} wajib diisi`));
  const answer = normalizeAnswer(raw.answer);
  if (!raw.answer.trim()) errors.push("Jawaban benar belum dipilih");
  else if (!answer) errors.push(`Jawaban "${raw.answer}" tidak valid (pakai ア/イ/ウ/エ, A–D, atau 1–4)`);

  checkBraces("Seksi", section, errors);
  checkBraces("Soal", text, errors);
  choices.forEach((c, i) => checkBraces(`Pilihan ${CHOICE_KEYS[i]}`, c, errors));
  if (explanation) checkBraces("Pembahasan", explanation, errors);

  if (errors.length) return { errors };
  return {
    errors,
    value: {
      section,
      text,
      choices: CHOICE_KEYS.map((key, i) => ({ key, text: choices[i] })),
      answer: answer!,
      explanation,
    },
  };
}
