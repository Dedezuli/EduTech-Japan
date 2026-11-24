import { isAdmin } from "@/lib/auth";
import { listAllAttempts } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { fmtDateTime, resultStatus } from "@/lib/resultStatus";

const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? "";
  const all = await listAllAttempts({ examId: sp.get("exam") ?? "", q: sp.get("q") ?? "" });
  const rows = status ? all.filter((a) => resultStatus(a, a.passingScore) === status) : all;
  const label = { progress: "Sedang mengerjakan", passed: "Lulus", failed: "Tidak lulus" } as const;
  const lines = [
    ["nama", "username", "ujian", "mulai", "selesai", "status", "alasan_selesai", "benar", "total", "skor"].join(","),
    ...rows.map((a) =>
      [
        a.user.name,
        a.user.username,
        stripRuby(a.examTitle),
        fmtDateTime(a.startedAt),
        a.submittedAt ? fmtDateTime(a.submittedAt) : "",
        label[resultStatus(a, a.passingScore)],
        a.submitReason === "timeout" ? "waktu habis" : a.submitReason === "manual" ? "dikumpulkan" : "",
        a.correct ?? "",
        a.total ?? "",
        a.score ?? "",
      ]
        .map(esc)
        .join(","),
    ),
  ];
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hasil-ujian.csv"',
    },
  });
}
