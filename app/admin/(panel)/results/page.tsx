import Link from "next/link";
import { listAllAttempts, listExams } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { formatHMS } from "@/lib/time";
import { fmtDateTime, resultStatus, type ResultStatus } from "@/lib/resultStatus";
import { Card, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { resetAttemptAction } from "../../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ResultStatus, string> = { progress: "Sedang mengerjakan", passed: "Lulus", failed: "Tidak lulus" };

export default async function AllResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; q?: string; status?: string }>;
}) {
  const { exam = "", q = "", status = "" } = await searchParams;
  const [exams, all] = await Promise.all([listExams(), listAllAttempts({ examId: exam, q })]);
  const rows = status ? all.filter((a) => resultStatus(a, a.passingScore) === status) : all;
  const now = Date.now();

  const done = all.filter((a) => a.submittedAt);
  const passed = done.filter((a) => (a.score ?? 0) >= a.passingScore).length;
  const avg = done.length ? Math.round(done.reduce((s, a) => s + (a.score ?? 0), 0) / done.length) : null;
  const exportQs = new URLSearchParams({ exam, q, status }).toString();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Hasil semua peserta</h1>
        <a href={`/admin/results/export?${exportQs}`} className={btnGhost}>
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Percobaan", all.length],
          ["Selesai", done.length],
          ["Lulus", done.length ? `${passed} (${Math.round((passed / done.length) * 100)}%)` : "–"],
          ["Rata-rata skor", avg ?? "–"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="text-2xl font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <Card>
        <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select name="exam" defaultValue={exam} className={inputCls} aria-label="Ujian">
            <option value="">Semua ujian</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {stripRuby(e.title)} {stripRuby(e.level)}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} className={inputCls} aria-label="Status">
            <option value="">Semua status</option>
            <option value="passed">Lulus</option>
            <option value="failed">Tidak lulus</option>
            <option value="progress">Sedang mengerjakan</option>
          </select>
          <input name="q" defaultValue={q} placeholder="Cari nama / username" className={inputCls} />
          <div className="flex gap-2">
            <button className={btnPrimary}>Filter</button>
            {(exam || q || status) && (
              <Link href="/admin/results" className={btnGhost}>
                Reset
              </Link>
            )}
          </div>
        </form>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-gray-500">Tidak ada hasil.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Peserta</th>
                  <th className="py-2 pr-4 font-medium">Ujian</th>
                  <th className="py-2 pr-4 font-medium">Mulai</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 text-right font-medium">Benar</th>
                  <th className="py-2 pr-4 text-right font-medium">Skor</th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const st = resultStatus(a, a.passingScore);
                  return (
                    <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{a.user.name}</div>
                        <div className="font-mono text-xs text-gray-500">{a.user.username}</div>
                      </td>
                      <td className="py-3 pr-4">{stripRuby(a.examTitle)}</td>
                      <td className="whitespace-nowrap py-3 pr-4">{fmtDateTime(a.startedAt)}</td>
                      <td className="py-3 pr-4">
                        {st === "progress" ? (
                          <span className="whitespace-nowrap rounded bg-blue-50 px-2 py-0.5 text-blue-800">
                            Mengerjakan · sisa {formatHMS(a.deadline - now)}
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            <span
                              className={`rounded px-2 py-0.5 ${
                                st === "passed" ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-700"
                              }`}
                            >
                              {STATUS_LABEL[st]}
                            </span>
                            {a.submitReason === "timeout" && (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Waktu habis</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {a.submittedAt ? `${a.correct}/${a.total}` : `${Object.keys(a.answers).length} dijawab`}
                      </td>
                      <td className="py-3 pr-4 text-right font-bold tabular-nums">{a.submittedAt ? a.score : "–"}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          {a.submittedAt && (
                            <Link
                              href={`/admin/results/${a.id}`}
                              className="rounded px-2 py-1 text-sm text-brand-700 hover:bg-brand-50"
                            >
                              Detail
                            </Link>
                          )}
                          <form action={resetAttemptAction}>
                            <input type="hidden" name="attemptId" value={a.id} />
                            <ConfirmButton
                              message={`Reset percobaan ${a.user.username}? Jawabannya dihapus dan peserta bisa mengulang dari awal.`}
                              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                            >
                              Reset
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
