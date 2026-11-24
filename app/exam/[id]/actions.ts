"use server";

import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { currentUser } from "@/lib/userAuth";

async function userOrThrow() {
  const user = await currentUser();
  if (!user) throw new Error("Belum login");
  return user;
}

export async function startExam(form: FormData) {
  const examId = String(form.get("examId") ?? "");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/exam/${examId}`);
  const exam = await db.getExam(examId);
  if (!exam || exam.questions.length === 0) redirect("/");
  await db.startAttempt(user.id, exam);
  redirect(`/exam/${examId}`);
}

export async function saveProgress(examId: string, patch: db.AttemptPatch) {
  const user = await userOrThrow();
  return db.saveAttempt(user.id, examId, patch);
}

export async function submitExam(examId: string) {
  const user = await userOrThrow();
  await db.submitAttempt(user.id, examId);
  return { ok: true };
}
