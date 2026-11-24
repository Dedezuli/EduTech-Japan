import type { Attempt } from "./types";

export type ResultStatus = "progress" | "passed" | "failed";

export function resultStatus(a: Attempt, passingScore: number): ResultStatus {
  if (!a.submittedAt) return "progress";
  return (a.score ?? 0) >= passingScore ? "passed" : "failed";
}

export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" });
