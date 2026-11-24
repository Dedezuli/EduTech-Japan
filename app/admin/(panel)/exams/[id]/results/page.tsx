import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam, listAttemptsForExam } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { formatHMS } from "@/lib/time";
import { Card } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { resetAttemptAction } from "../../../../actions";

export const dynamic = "force-dynamic";

const fmt = (t: number) =>
  new Date(t).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" });

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await getExam(id);
  if (!exam) notFound();
  const attempts = (await listAttemptsForExam(exam.id)).sort((a, b) => b.startedAt - a.startedAt);
  const now = Date.now();
  const done = attempts.filter((a) => a.submittedAt);
  const avg = done.length ? Math.round(done.reduce((s, a) => s + (a.score ?? 0), 0) / done.length) : null;
  const passed = done.filter((a) => (a.score ?? 0) >= exam.passingScore).length;

  return (
    <>
      <div>
        <Link href={`/admin/exams/${exam.id}`} className="text-sm text-gray-500 hover:underline">
          ← {stripRuby(exam.title)}
        </Link>
        <h1 className="text-2xl font-bold">Hasil ujian</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Peserta", attempts.length],
          ["Selesai", done.length],
          ["Lulus", passed],
          ["Rata-rata", avg ?? "–"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="text-2xl font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Daftar percobaan">
        {attempts.length === 0 ? (
          <p className="text-gray-500">Belum ada peserta yang mengerjakan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Peserta</th>
                  <th className="py-2 pr-4 font-medium">Mulai</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 text-right font-medium">Benar</th>
                  <th className="py-2 pr-4 text-right font-medium">Skor</th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{a.user?.name ?? "(dihapus)"}</div>
                      <div className="font-mono text-xs text-gray-500">{a.user?.username}</div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{fmt(a.startedAt)}</td>
                    <td className="py-3 pr-4">
                      {a.submittedAt ? (
                        a.submitReason === "timeout" ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Waktu habis</span>
                        ) : (
                          <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-800">Selesai</span>
                        )
                      ) : (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800">
                          Mengerjakan · sisa {formatHMS(a.deadline - now)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {a.submittedAt ? `${a.correct}/${a.total}` : `${Object.keys(a.answers).length} dijawab`}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums">
                      {a.submittedAt ? (
                        <span className={(a.score ?? 0) >= exam.passingScore ? "text-brand-700" : "text-red-600"}>
                          {a.score}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <form action={resetAttemptAction}>
                        <input type="hidden" name="attemptId" value={a.id} />
                        <ConfirmButton
                          message={`Reset percobaan ${a.user?.username ?? ""}? Jawabannya dihapus dan peserta bisa mengulang dari awal.`}
                          className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          Reset
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
