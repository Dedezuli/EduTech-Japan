"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, checkPassword, requireAdmin, sessionToken } from "@/lib/auth";
import * as db from "@/lib/db";
import { validateQuestion, type QuestionDraft } from "@/lib/validate";

export type FormState = { errors: string[] };

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

// ---------- Auth ----------

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!checkPassword(str(form, "password"))) return { errors: ["Password salah"] };
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------- Ujian ----------

function parseExamMeta(form: FormData): { meta?: db.ExamMeta; errors: string[] } {
  const errors: string[] = [];
  const title = str(form, "title").trim();
  const level = str(form, "level").trim();
  const description = str(form, "description").trim();
  const durationMinutes = Number(str(form, "durationMinutes"));
  const passingScore = Number(str(form, "passingScore"));
  if (!title) errors.push("Judul ujian wajib diisi");
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600)
    errors.push("Durasi harus 1–600 menit");
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100)
    errors.push("Nilai lulus harus 0–100");
  if (errors.length) return { errors };
  return {
    errors,
    meta: { title, level, description, durationMinutes, passingScore, shuffleQuestions: form.get("shuffleQuestions") === "on" },
  };
}

export async function saveExam(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { meta, errors } = parseExamMeta(form);
  if (!meta) return { errors };
  const id = str(form, "id");
  if (id) {
    await db.updateExam(id, meta);
    revalidatePath("/", "layout");
    return { errors: [] };
  }
  const exam = await db.createExam(meta);
  revalidatePath("/", "layout");
  redirect(`/admin/exams/${exam.id}`);
}

export async function removeExam(form: FormData) {
  await requireAdmin();
  await db.deleteExam(str(form, "id"));
  revalidatePath("/", "layout");
  redirect("/admin");
}

// ---------- Soal ----------

function parseQuestion(form: FormData) {
  return validateQuestion({
    section: str(form, "section"),
    text: str(form, "text"),
    choices: [str(form, "choice_0"), str(form, "choice_1"), str(form, "choice_2"), str(form, "choice_3")],
    answer: str(form, "answer"),
    explanation: str(form, "explanation"),
  });
}

export async function saveQuestion(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const examId = str(form, "examId");
  const qid = str(form, "qid");
  const { value, errors } = parseQuestion(form);
  if (!value) return { errors };
  if (qid) await db.updateQuestion(examId, qid, value);
  else await db.addQuestion(examId, value);
  revalidatePath("/", "layout");
  redirect(form.get("next") === "new" ? `/admin/exams/${examId}/questions/new?saved=1` : `/admin/exams/${examId}`);
}

export async function removeQuestion(form: FormData) {
  await requireAdmin();
  const examId = str(form, "examId");
  await db.deleteQuestion(examId, str(form, "qid"));
  revalidatePath("/", "layout");
}

export async function moveQuestion(form: FormData) {
  await requireAdmin();
  await db.moveQuestion(str(form, "examId"), str(form, "qid"), str(form, "dir") === "up" ? -1 : 1);
  revalidatePath("/", "layout");
}

/** Dipanggil dari halaman import CSV. Data divalidasi ulang di server. */
export async function importCsvQuestions(
  examId: string,
  drafts: QuestionDraft[],
  mode: "append" | "replace",
): Promise<{ ok: boolean; count?: number; errors: string[] }> {
  await requireAdmin();
  const clean: QuestionDraft[] = [];
  const errors: string[] = [];
  drafts.forEach((d, i) => {
    const res = validateQuestion({
      section: d.section,
      text: d.text,
      choices: [0, 1, 2, 3].map((k) => d.choices[k]?.text ?? "") as [string, string, string, string],
      answer: d.answer,
      explanation: d.explanation,
    });
    if (res.value) clean.push(res.value);
    else errors.push(`Soal #${i + 1}: ${res.errors.join("; ")}`);
  });
  if (errors.length) return { ok: false, errors };
  if (clean.length === 0) return { ok: false, errors: ["Tidak ada soal untuk diimport"] };
  const count = await db.importQuestions(examId, clean, mode === "replace" ? "replace" : "append");
  revalidatePath("/", "layout");
  return { ok: true, count, errors: [] };
}

// ---------- Peserta ----------

export async function addUser(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const username = str(form, "username").trim().toLowerCase();
  const name = str(form, "name").trim();
  const password = str(form, "password");
  const errors: string[] = [];
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) errors.push("Username 3–32 karakter: huruf kecil, angka, titik, _ atau -");
  if (!name) errors.push("Nama wajib diisi");
  if (password.length < 6) errors.push("Password minimal 6 karakter");
  if (errors.length) return { errors };
  try {
    await db.createUser({ username, name, password });
  } catch (e) {
    return { errors: [(e as Error).message] };
  }
  revalidatePath("/admin/users");
  return { errors: [] };
}

export async function setUserPassword(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const password = str(form, "password");
  if (password.length < 6) return { errors: ["Password minimal 6 karakter"] };
  await db.updateUser(str(form, "id"), { password });
  revalidatePath("/admin/users");
  return { errors: [] };
}

export async function toggleUserActive(form: FormData) {
  await requireAdmin();
  await db.updateUser(str(form, "id"), { active: str(form, "active") === "1" });
  revalidatePath("/admin/users");
}

export async function removeUser(form: FormData) {
  await requireAdmin();
  await db.deleteUser(str(form, "id"));
  revalidatePath("/admin/users");
}

/** Hapus percobaan peserta supaya bisa mengulang ujian. */
export async function resetAttemptAction(form: FormData) {
  await requireAdmin();
  await db.resetAttempt(str(form, "attemptId"));
  revalidatePath("/", "layout");
}
