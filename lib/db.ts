import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import type { Attempt, ChoiceKey, Exam, PublicUser, Question } from "./types";
import { CHOICE_KEYS } from "./validate";
import { seedExams } from "@/data/seed";
import { scoreOf, type ResultDetailItem, type ResultMode, type ResultRecord } from "./report";

/**
 * Lapisan data. Semua halaman & action hanya memakai fungsi di file ini,
 * dan di bawahnya memakai Prisma (default SQLite: prisma/dev.db).
 * Skema tabel: prisma/schema.prisma
 */

// Satu instance Prisma saja selama dev (hot reload membuat modul dimuat ulang).
const g = globalThis as unknown as { prisma?: PrismaClient; dbReady?: Promise<void> };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

// ---------- Inisialisasi: isi data awal saat database masih kosong ----------

const LEGACY_JSON = path.join(process.cwd(), "storage", "db.json");

function ready(): Promise<void> {
  g.dbReady ??= (async () => {
    const [exams, users] = await Promise.all([prisma.exam.count(), prisma.user.count()]);
    if (exams > 0 || users > 0) return;
    if (await importLegacyJson()) return;
    for (const exam of seedExams) await insertExam(exam, true);
    await prisma.user.create({
      data: { username: "peserta1", name: "Peserta Contoh", passwordHash: hashPassword("peserta123") },
    });
  })().catch((e) => {
    g.dbReady = undefined;
    throw e;
  });
  return g.dbReady;
}

async function insertExam(exam: Exam, newIds = false) {
  await prisma.exam.create({
    data: {
      id: exam.id,
      title: exam.title,
      level: exam.level,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      passingScore: exam.passingScore,
      shuffleQuestions: exam.shuffleQuestions ?? true,
      questions: { create: exam.questions.map((q, i) => questionCreate(q, i, newIds ? undefined : q.id)) },
    },
  });
}

/** Pindahkan data dari versi sebelumnya (storage/db.json) ke database, sekali saja. */
async function importLegacyJson(): Promise<boolean> {
  let raw: string;
  try {
    raw = await fs.readFile(LEGACY_JSON, "utf8");
  } catch {
    return false;
  }
  type LegacyUser = { id: string; username: string; name: string; passwordHash: string; active: boolean; createdAt: number };
  const old = JSON.parse(raw) as { exams?: Exam[]; users?: LegacyUser[]; attempts?: Attempt[] };
  for (const exam of old.exams ?? []) await insertExam(exam);
  for (const u of old.users ?? []) {
    await prisma.user.create({ data: { ...u, createdAt: new Date(u.createdAt) } });
  }
  for (const a of old.attempts ?? []) {
    const qids = new Set([...Object.keys(a.answers), ...Object.keys(a.flags)]);
    await prisma.attempt.create({
      data: {
        id: a.id,
        userId: a.userId,
        examId: a.examId,
        startedAt: new Date(a.startedAt),
        deadline: new Date(a.deadline),
        current: a.current,
        submittedAt: a.submittedAt ? new Date(a.submittedAt) : null,
        submitReason: a.submitReason ?? null,
        correct: a.correct ?? null,
        total: a.total ?? null,
        score: a.score ?? null,
        answers: {
          create: [...qids].map((qid) => ({ questionId: qid, choice: a.answers[qid] ?? null, flagged: !!a.flags[qid] })),
        },
      },
    });
  }
  await fs.rename(LEGACY_JSON, LEGACY_JSON + ".imported");
  console.log("[db] Data dari storage/db.json dipindahkan ke database.");
  return true;
}

// ---------- Konversi baris database → tipe aplikasi ----------

const examInclude = {
  questions: { orderBy: { position: "asc" }, include: { choices: { orderBy: { position: "asc" } } } },
} satisfies Prisma.ExamInclude;

type ExamRow = Prisma.ExamGetPayload<{ include: typeof examInclude }>;

function toExam(e: ExamRow): Exam {
  return {
    id: e.id,
    title: e.title,
    level: e.level,
    description: e.description,
    durationMinutes: e.durationMinutes,
    passingScore: e.passingScore,
    shuffleQuestions: e.shuffleQuestions,
    questions: e.questions.map((q) => ({
      id: q.id,
      section: q.section,
      text: q.text,
      answer: q.answer as ChoiceKey,
      explanation: q.explanation ?? undefined,
      choices: q.choices.map((c) => ({ key: c.key as ChoiceKey, text: c.text })),
    })),
  };
}

function questionCreate(q: QuestionInput, position: number, id?: string) {
  return {
    id,
    position,
    section: q.section,
    text: q.text,
    answer: q.answer,
    explanation: q.explanation ?? null,
    choices: {
      create: CHOICE_KEYS.map((key, i) => ({ key, position: i, text: q.choices.find((c) => c.key === key)?.text ?? "" })),
    },
  };
}

type AttemptRow = Prisma.AttemptGetPayload<{ include: { answers: true } }>;

function toAttempt(a: AttemptRow): Attempt {
  const answers: Record<string, ChoiceKey> = {};
  const flags: Record<string, boolean> = {};
  for (const r of a.answers) {
    if (r.choice) answers[r.questionId] = r.choice as ChoiceKey;
    if (r.flagged) flags[r.questionId] = true;
  }
  return {
    id: a.id,
    userId: a.userId,
    examId: a.examId,
    startedAt: a.startedAt.getTime(),
    deadline: a.deadline.getTime(),
    current: a.current,
    questionOrder: parseOrder(a.questionOrder),
    answers,
    flags,
    submittedAt: a.submittedAt?.getTime(),
    submitReason: (a.submitReason as Attempt["submitReason"]) ?? undefined,
    correct: a.correct ?? undefined,
    total: a.total ?? undefined,
    score: a.score ?? undefined,
  };
}

function parseOrder(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Fisher–Yates dengan crypto.randomInt. */
function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Ujian ----------

export async function listExams(): Promise<Exam[]> {
  await ready();
  const rows = await prisma.exam.findMany({ include: examInclude, orderBy: { createdAt: "asc" } });
  return rows.map(toExam);
}

export async function getExam(id: string): Promise<Exam | undefined> {
  await ready();
  const row = await prisma.exam.findUnique({ where: { id }, include: examInclude });
  return row ? toExam(row) : undefined;
}

export type ExamMeta = Omit<Exam, "id" | "questions">;

export async function createExam(meta: ExamMeta): Promise<Exam> {
  await ready();
  return toExam(await prisma.exam.create({ data: meta, include: examInclude }));
}

export async function updateExam(id: string, meta: ExamMeta): Promise<void> {
  await prisma.exam.update({ where: { id }, data: meta });
}

export async function deleteExam(id: string): Promise<void> {
  await prisma.exam.delete({ where: { id } }); // soal, pilihan, percobaan ikut terhapus (cascade)
}

// ---------- Soal ----------

export type QuestionInput = Omit<Question, "id">;

export async function addQuestion(examId: string, q: QuestionInput): Promise<void> {
  const last = await prisma.question.findFirst({ where: { examId }, orderBy: { position: "desc" } });
  await prisma.question.create({ data: { examId, ...questionCreate(q, (last?.position ?? -1) + 1) } });
}

export async function updateQuestion(examId: string, qid: string, q: QuestionInput): Promise<void> {
  await prisma.$transaction([
    prisma.question.update({
      where: { id: qid, examId },
      data: { section: q.section, text: q.text, answer: q.answer, explanation: q.explanation ?? null },
    }),
    ...CHOICE_KEYS.map((key, i) =>
      prisma.choice.upsert({
        where: { questionId_key: { questionId: qid, key } },
        create: { questionId: qid, key, position: i, text: q.choices.find((c) => c.key === key)?.text ?? "" },
        update: { text: q.choices.find((c) => c.key === key)?.text ?? "" },
      }),
    ),
  ]);
}

export async function deleteQuestion(examId: string, qid: string): Promise<void> {
  await prisma.question.delete({ where: { id: qid, examId } });
}

export async function moveQuestion(examId: string, qid: string, dir: -1 | 1): Promise<void> {
  const qs = await prisma.question.findMany({ where: { examId }, orderBy: { position: "asc" }, select: { id: true } });
  const i = qs.findIndex((x) => x.id === qid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= qs.length) return;
  [qs[i], qs[j]] = [qs[j], qs[i]];
  await prisma.$transaction(qs.map((q, pos) => prisma.question.update({ where: { id: q.id }, data: { position: pos } })));
}

export async function importQuestions(examId: string, qs: QuestionInput[], mode: "append" | "replace"): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      let start = 0;
      if (mode === "replace") await tx.question.deleteMany({ where: { examId } });
      else {
        const last = await tx.question.findFirst({ where: { examId }, orderBy: { position: "desc" } });
        start = (last?.position ?? -1) + 1;
      }
      for (const [i, q] of qs.entries()) {
        await tx.question.create({ data: { examId, ...questionCreate(q, start + i) } });
      }
      return qs.length;
    },
    { timeout: 60_000 },
  );
}

// ---------- Peserta ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const publicUserSelect = { id: true, username: true, name: true, active: true, createdAt: true } as const;
type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
const toPublicUser = (u: PublicUserRow): PublicUser => ({ ...u, createdAt: u.createdAt.getTime() });

export async function listUsers(): Promise<PublicUser[]> {
  await ready();
  return (await prisma.user.findMany({ select: publicUserSelect, orderBy: { username: "asc" } })).map(toPublicUser);
}

export async function getUser(id: string): Promise<PublicUser | undefined> {
  const u = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  return u ? toPublicUser(u) : undefined;
}

export async function createUser(input: { username: string; name: string; password: string }): Promise<PublicUser> {
  await ready();
  const username = input.username.trim().toLowerCase();
  try {
    const u = await prisma.user.create({
      data: { username, name: input.name.trim(), passwordHash: hashPassword(input.password) },
      select: publicUserSelect,
    });
    return toPublicUser(u);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new Error(`Username "${username}" sudah dipakai`);
    throw e;
  }
}

export async function updateUser(id: string, patch: { name?: string; password?: string; active?: boolean }): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: {
      name: patch.name?.trim(),
      passwordHash: patch.password ? hashPassword(patch.password) : undefined,
      active: patch.active,
    },
  });
  if (patch.active === false) await prisma.session.deleteMany({ where: { userId: id } }); // paksa logout
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } }); // sesi & percobaan ikut terhapus (cascade)
}

// ---------- Sesi login peserta ----------

const SESSION_TTL = 1000 * 60 * 60 * 12; // 12 jam

export async function loginUser(username: string, password: string): Promise<string | null> {
  await ready();
  const u = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (!u || !u.active || !verifyPassword(password, u.passwordHash)) return null;
  const token = randomBytes(32).toString("hex");
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { token, userId: u.id, expiresAt: new Date(Date.now() + SESSION_TTL) } });
  return token;
}

export async function userFromSession(token: string | undefined): Promise<PublicUser | null> {
  await ready();
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { token }, include: { user: { select: publicUserSelect } } });
  if (!s || s.expiresAt.getTime() <= Date.now() || !s.user.active) return null;
  return toPublicUser(s.user);
}

export async function logoutSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

// ---------- Percobaan ujian ----------

/** Toleransi jaringan: jawaban yang datang sedikit setelah deadline masih diterima. */
const GRACE_MS = 3000;

type Tx = Prisma.TransactionClient;

async function grade(tx: Tx, attemptId: string, examId: string) {
  const [questions, answers] = await Promise.all([
    tx.question.findMany({ where: { examId }, select: { id: true, answer: true } }),
    tx.attemptAnswer.findMany({ where: { attemptId }, select: { questionId: true, choice: true } }),
  ]);
  const chosen = new Map(answers.map((a) => [a.questionId, a.choice]));
  const correct = questions.filter((q) => chosen.get(q.id) === q.answer).length;
  const total = questions.length;
  return { correct, total, score: total ? Math.round((correct / total) * 100) : 0 };
}

/** Tandai selesai jika waktu sudah habis. */
async function finalizeIfExpired(tx: Tx, a: { id: string; examId: string; deadline: Date; submittedAt: Date | null }) {
  if (a.submittedAt || Date.now() < a.deadline.getTime() + GRACE_MS) return;
  const done = await tx.attempt.update({
    where: { id: a.id },
    data: { submittedAt: a.deadline, submitReason: "timeout", ...(await grade(tx, a.id, a.examId)) },
  });
  await logSimulasi(tx, done.id);
}

// ---------- Riwayat hasil (laporan trainer & perkembangan) ----------

async function buildDetail(tx: Tx, examId: string, chosen: Map<string, string | null>) {
  const questions = await tx.question.findMany({
    where: { examId },
    orderBy: { position: "asc" },
    select: { id: true, answer: true, section: true },
  });
  const detail: ResultDetailItem[] = questions.map((q) => ({
    questionId: q.id,
    section: q.section,
    answer: q.answer as ChoiceKey,
    choice: (chosen.get(q.id) as ChoiceKey | null | undefined) ?? null,
  }));
  const correct = detail.filter((d) => d.choice === d.answer).length;
  return { detail, correct, total: detail.length };
}

/** Simpan hasil simulasi yang sudah selesai ke riwayat (sekali per percobaan). */
async function logSimulasi(tx: Tx, attemptId: string) {
  const a = await tx.attempt.findUnique({
    where: { id: attemptId },
    include: { answers: true, exam: { select: { passingScore: true } } },
  });
  if (!a?.submittedAt) return;
  const { detail, correct, total } = await buildDetail(
    tx,
    a.examId,
    new Map(a.answers.map((r) => [r.questionId, r.choice])),
  );
  const score = scoreOf(correct, total);
  const data = {
    userId: a.userId,
    examId: a.examId,
    mode: "simulasi",
    correct,
    total,
    score,
    passed: score >= a.exam.passingScore,
    detail: JSON.stringify(detail),
    durationSec: Math.max(0, Math.round((a.submittedAt.getTime() - a.startedAt.getTime()) / 1000)),
    createdAt: a.submittedAt,
  };
  await tx.resultLog.upsert({ where: { attemptId: a.id }, create: { ...data, attemptId: a.id }, update: data });
}

/** Simpan hasil latihan. Jawaban dinilai di server. */
export async function savePracticeResult(
  userId: string,
  examId: string,
  answers: Record<string, string | null>,
  durationSec: number,
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const exam = await tx.exam.findUnique({ where: { id: examId }, select: { passingScore: true } });
    if (!exam) throw new Error("Ujian tidak ditemukan");
    const keys = new Set<string>(CHOICE_KEYS);
    const chosen = new Map(
      Object.entries(answers).map(([k, v]) => [k, v && keys.has(v) ? v : null] as [string, string | null]),
    );
    const { detail, correct, total } = await buildDetail(tx, examId, chosen);
    const score = scoreOf(correct, total);
    const row = await tx.resultLog.create({
      data: {
        userId,
        examId,
        mode: "latihan",
        correct,
        total,
        score,
        passed: score >= exam.passingScore,
        detail: JSON.stringify(detail),
        durationSec: Math.max(0, Math.min(Math.round(durationSec), 60 * 60 * 24)),
      },
    });
    return row.id;
  });
}

type ResultRow = Prisma.ResultLogGetPayload<object>;

function toResult(r: ResultRow): ResultRecord {
  let detail: ResultDetailItem[] = [];
  try {
    const v = JSON.parse(r.detail);
    if (Array.isArray(v)) detail = v;
  } catch {
    /* abaikan */
  }
  return {
    id: r.id,
    userId: r.userId,
    examId: r.examId,
    mode: r.mode === "latihan" ? "latihan" : "simulasi",
    correct: r.correct,
    total: r.total,
    score: r.score,
    passed: r.passed,
    durationSec: r.durationSec,
    createdAt: r.createdAt.getTime(),
    detail,
  };
}

export async function getResult(id: string): Promise<ResultRecord | undefined> {
  const r = await prisma.resultLog.findUnique({ where: { id } });
  return r ? toResult(r) : undefined;
}

/** Hasil simulasi untuk satu percobaan (dibuat jika belum ada, mis. percobaan lama). */
export async function getResultForAttempt(attemptId: string): Promise<ResultRecord | undefined> {
  let r = await prisma.resultLog.findUnique({ where: { attemptId } });
  if (!r) {
    await prisma.$transaction((tx) => logSimulasi(tx, attemptId));
    r = await prisma.resultLog.findUnique({ where: { attemptId } });
  }
  return r ? toResult(r) : undefined;
}

export async function listResults(filter: { userId?: string; examId?: string; mode?: ResultMode } = {}) {
  await ready();
  if (filter.userId) await finalizeExpired({ userId: filter.userId });
  const rows = await prisma.resultLog.findMany({
    where: { userId: filter.userId, examId: filter.examId, mode: filter.mode },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toResult);
}

async function findAttempt(tx: Tx, userId: string, examId: string) {
  return tx.attempt.findUnique({ where: { userId_examId: { userId, examId } }, include: { answers: true } });
}

/** Ambil percobaan peserta; waktu habis otomatis dikunci & dinilai. */
export async function getAttempt(userId: string, examId: string): Promise<Attempt | undefined> {
  return prisma.$transaction(async (tx) => {
    const a = await findAttempt(tx, userId, examId);
    if (!a) return undefined;
    await finalizeIfExpired(tx, a);
    return toAttempt((await findAttempt(tx, userId, examId))!);
  });
}

export async function startAttempt(userId: string, exam: Exam): Promise<Attempt> {
  return prisma.$transaction(async (tx) => {
    const existing = await findAttempt(tx, userId, exam.id);
    if (existing) {
      await finalizeIfExpired(tx, existing);
      return toAttempt((await findAttempt(tx, userId, exam.id))!);
    }
    const ids = exam.questions.map((q) => q.id);
    const order = exam.shuffleQuestions ? shuffled(ids) : ids;
    const created = await tx.attempt.create({
      data: {
        userId,
        examId: exam.id,
        deadline: new Date(Date.now() + exam.durationMinutes * 60_000),
        questionOrder: JSON.stringify(order),
      },
      include: { answers: true },
    });
    return toAttempt(created);
  });
}

export type AttemptPatch = {
  answers?: Record<string, ChoiceKey | null>;
  flags?: Record<string, boolean>;
  current?: number;
};

/** Simpan jawaban. Ditolak jika sudah submit atau waktu habis. */
export async function saveAttempt(
  userId: string,
  examId: string,
  patch: AttemptPatch,
): Promise<{ ok: true } | { ok: false; reason: "locked" | "not_found" }> {
  return prisma.$transaction(async (tx) => {
    const a = await tx.attempt.findUnique({ where: { userId_examId: { userId, examId } } });
    if (!a) return { ok: false, reason: "not_found" } as const;
    await finalizeIfExpired(tx, a);
    if (a.submittedAt || Date.now() >= a.deadline.getTime() + GRACE_MS) return { ok: false, reason: "locked" } as const;

    const questions = await tx.question.findMany({ where: { examId }, select: { id: true } });
    const valid = new Set(questions.map((q) => q.id));
    const keys = new Set<string>(CHOICE_KEYS);

    for (const [qid, key] of Object.entries(patch.answers ?? {})) {
      if (!valid.has(qid)) continue;
      const choice = key && keys.has(key) ? key : null;
      await tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: a.id, questionId: qid } },
        create: { attemptId: a.id, questionId: qid, choice },
        update: { choice },
      });
    }
    for (const [qid, on] of Object.entries(patch.flags ?? {})) {
      if (!valid.has(qid)) continue;
      await tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: a.id, questionId: qid } },
        create: { attemptId: a.id, questionId: qid, flagged: !!on },
        update: { flagged: !!on },
      });
    }
    if (typeof patch.current === "number") {
      const current = Math.max(0, Math.min(questions.length - 1, Math.floor(patch.current)));
      await tx.attempt.update({ where: { id: a.id }, data: { current } });
    }
    return { ok: true } as const;
  });
}

export async function submitAttempt(userId: string, examId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const a = await tx.attempt.findUnique({ where: { userId_examId: { userId, examId } } });
    if (!a || a.submittedAt) return;
    const now = Date.now();
    if (now >= a.deadline.getTime() + GRACE_MS) return finalizeIfExpired(tx, a);
    await tx.attempt.update({
      where: { id: a.id },
      data: {
        submittedAt: new Date(Math.min(now, a.deadline.getTime())),
        submitReason: now >= a.deadline.getTime() ? "timeout" : "manual",
        ...(await grade(tx, a.id, examId)),
      },
    });
    await logSimulasi(tx, a.id);
  });
}

/** Tutup semua percobaan yang waktunya sudah habis (dipanggil sebelum menampilkan daftar). */
async function finalizeExpired(where: Prisma.AttemptWhereInput) {
  const expired = await prisma.attempt.findMany({
    where: { ...where, submittedAt: null, deadline: { lt: new Date(Date.now() - GRACE_MS) } },
  });
  for (const a of expired) await prisma.$transaction((tx) => finalizeIfExpired(tx, a));
}

/** Semua percobaan untuk satu ujian (untuk admin). */
export async function listAttemptsForExam(examId: string): Promise<(Attempt & { user?: PublicUser })[]> {
  await finalizeExpired({ examId });
  const rows = await prisma.attempt.findMany({
    where: { examId },
    include: { answers: true, user: { select: publicUserSelect } },
  });
  return rows.map((r) => ({ ...toAttempt(r), user: toPublicUser(r.user) }));
}

export async function listAttemptsForUser(userId: string): Promise<Attempt[]> {
  await finalizeExpired({ userId });
  const rows = await prisma.attempt.findMany({ where: { userId }, include: { answers: true } });
  return rows.map(toAttempt);
}

/** Hapus percobaan agar peserta bisa mengulang ujian. */
export async function resetAttempt(attemptId: string): Promise<void> {
  await prisma.attempt.deleteMany({ where: { id: attemptId } });
}

// ---------- Rekap hasil (admin) ----------

export type AttemptSummary = Attempt & { user: PublicUser; examTitle: string; passingScore: number };

export async function listAllAttempts(filter: { examId?: string; q?: string } = {}): Promise<AttemptSummary[]> {
  await ready();
  await finalizeExpired(filter.examId ? { examId: filter.examId } : {});
  const q = filter.q?.trim();
  const rows = await prisma.attempt.findMany({
    where: {
      examId: filter.examId || undefined,
      user: q ? { OR: [{ name: { contains: q } }, { username: { contains: q.toLowerCase() } }] } : undefined,
    },
    include: {
      answers: true,
      user: { select: publicUserSelect },
      exam: { select: { title: true, passingScore: true } },
    },
    orderBy: { startedAt: "desc" },
  });
  return rows.map((r) => ({
    ...toAttempt(r),
    user: toPublicUser(r.user),
    examTitle: r.exam.title,
    passingScore: r.exam.passingScore,
  }));
}

export async function getAttemptById(id: string): Promise<(Attempt & { user: PublicUser }) | undefined> {
  const a = await prisma.attempt.findUnique({ where: { id } });
  if (!a) return undefined;
  await prisma.$transaction((tx) => finalizeIfExpired(tx, a));
  const r = await prisma.attempt.findUnique({ where: { id }, include: { answers: true, user: { select: publicUserSelect } } });
  return r ? { ...toAttempt(r), user: toPublicUser(r.user) } : undefined;
}
