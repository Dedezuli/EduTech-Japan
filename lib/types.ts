/**
 * Teks dengan furigana memakai format {漢字|かんじ}.
 * Contoh: "{設備|せつび}の{目的|もくてき}" → 設備(せつび)の目的(もくてき)
 */
export type RubyText = string;

export type ChoiceKey = "ア" | "イ" | "ウ" | "エ";

export interface Choice {
  key: ChoiceKey;
  text: RubyText;
}

export interface Question {
  id: string;
  /** Nama seksi / kategori soal, ditampilkan di header. */
  section: string;
  text: RubyText;
  choices: Choice[];
  answer: ChoiceKey;
  explanation?: RubyText;
}

export interface Exam {
  id: string;
  title: string;
  level: string;
  description: string;
  durationMinutes: number;
  passingScore: number; // persen
  /** Acak urutan soal untuk setiap peserta (default: ya). */
  shuffleQuestions: boolean;
  questions: Question[];
}

/** Akun peserta ujian (dikelola admin). */
export interface User {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  active: boolean;
  createdAt: number;
}

export type PublicUser = Omit<User, "passwordHash">;

/** Satu percobaan ujian oleh satu peserta. Disimpan di server, sumber kebenaran waktu & jawaban. */
export interface Attempt {
  id: string;
  userId: string;
  examId: string;
  startedAt: number;
  deadline: number;
  current: number;
  /** Urutan id soal yang dilihat peserta ini. */
  questionOrder: string[];
  answers: Record<string, ChoiceKey>;
  flags: Record<string, boolean>;
  submittedAt?: number;
  submitReason?: "manual" | "timeout";
  correct?: number;
  total?: number;
  score?: number;
}

/** Soal yang dikirim ke browser peserta saat ujian (tanpa kunci jawaban & pembahasan). */
export type PublicQuestion = Omit<Question, "answer" | "explanation">;
export type PublicExam = Omit<Exam, "questions"> & { questions: PublicQuestion[] };

export interface ExamSettings {
  fontScale: "normal" | "large" | "xlarge";
  showFurigana: boolean;
}
