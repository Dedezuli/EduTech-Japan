"use server";

import * as db from "@/lib/db";
import { currentUser } from "@/lib/userAuth";

/** Simpan hasil latihan, kembalikan id laporan. */
export async function finishPractice(
  examId: string,
  answers: Record<string, string | null>,
  durationSec: number,
): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error("Belum login");
  return db.savePracticeResult(user.id, examId, answers ?? {}, Number(durationSec) || 0);
}
