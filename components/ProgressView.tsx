import Link from "next/link";
import type { Exam, PublicUser } from "@/lib/types";
import { MODE_LABEL, scoreOf, topicStats, type ResultRecord } from "@/lib/report";
import { stripRuby } from "@/lib/ruby";
import { Ruby } from "./Ruby";
import { TopicBars } from "./TopicBars";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" });
}

function cellTone(pct: number) {
  if (pct >= 80) return "bg-brand-100 text-brand-800";
  if (pct >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

/**
 * Perkembangan satu peserta: ringkasan, % pemahaman per materi (semua hasil),
 * tren per materi dari hasil ke hasil, status tiap paket, dan riwayat lengkap.
 */
export function ProgressView({
  user,
  exams,
  results,
}: {
  user: PublicUser;
  exams: Exam[];
  results: ResultRecord[];
}) {
  const examById = new Map(exams.map((e) => [e.id, e]));
  const passing = (examId: string) => examById.get(examId)?.passingScore ?? 60;
  const sim = results.filter((r) => r.mode === "simulasi");
  const lat = results.filter((r) => r.mode === "latihan");
  const allItems = results.flatMap((r) => r.detail);
  const overall = scoreOf(
    allItems.filter((d) => d.choice === d.answer).length,
    allItems.length,
  );
  const stats = topicStats(allItems);
  const recent = results.slice(-8);
  const topics = stats.map((s) => s.topic);

  const avg = (rs: ResultRecord[]) => (rs.length ? Math.round(rs.reduce((n, r) => n + r.score, 0) / rs.length) : null);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
        <h2 className="text-lg font-bold">
          {user.name} <span className="text-sm font-normal text-gray-500">({user.username})</span>
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
          <div className="rounded bg-gray-50 p-3">
            <dt className="text-gray-500">Pemahaman total</dt>
            <dd className={`text-2xl font-bold ${overall >= 60 ? "text-brand-700" : "text-red-600"}`}>{overall}%</dd>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <dt className="text-gray-500">Latihan</dt>
            <dd className="text-2xl font-bold">{lat.length}×</dd>
            <dd className="text-xs text-gray-500">rata-rata {avg(lat) ?? "–"} poin</dd>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <dt className="text-gray-500">Simulasi</dt>
            <dd className="text-2xl font-bold">{sim.length}×</dd>
            <dd className="text-xs text-gray-500">rata-rata {avg(sim) ?? "–"} poin</dd>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <dt className="text-gray-500">Simulasi lulus (≥60)</dt>
            <dd className="text-2xl font-bold">
              {sim.filter((r) => r.passed).length}/{sim.length}
            </dd>
          </div>
        </dl>
        {results.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">Belum ada hasil latihan atau simulasi.</p>
        )}
      </section>

      {stats.length > 0 && (
        <section className="break-inside-avoid rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
          <h2 className="mb-1 font-bold">
            <ruby>
              分野別<rt>ぶんやべつ</rt>
            </ruby>
            の
            <ruby>
              理解度<rt>りかいど</rt>
            </ruby>{" "}
            · Materi yang dipahami
          </h2>
          <p className="mb-3 text-xs text-gray-500">Gabungan semua latihan & simulasi ({allItems.length} jawaban).</p>
          <TopicBars stats={stats} />
        </section>
      )}

      {recent.length > 1 && (
        <section className="break-inside-avoid rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
          <h2 className="mb-1 font-bold">Perkembangan per materi (%)</h2>
          <p className="mb-3 text-xs text-gray-500">{recent.length} hasil terakhir, dari kiri (lama) ke kanan (baru).</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="sticky left-0 bg-white p-1 text-left font-medium">Materi</th>
                  {recent.map((r) => (
                    <th key={r.id} className="p-1 text-center font-medium whitespace-nowrap">
                      {fmtDate(r.createdAt).split(" ")[0]}
                      <br />
                      {r.mode === "latihan" ? "L" : "S"}·
                      {stripRuby(examById.get(r.examId)?.title ?? "").replace(/^.*Paket\s*/, "P")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t} className="border-t border-gray-100">
                    <td className="sticky left-0 bg-white p-1 leading-[2] whitespace-nowrap">
                      <Ruby text={t} />
                    </td>
                    {recent.map((r) => {
                      const s = topicStats(r.detail).find((x) => stripRuby(x.topic) === stripRuby(t));
                      return (
                        <td key={r.id} className="p-1 text-center">
                          {s ? (
                            <span className={`inline-block min-w-11 rounded px-1 py-0.5 tabular-nums ${cellTone(s.pct)}`}>
                              {s.pct}
                            </span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="sticky left-0 bg-white p-1">Nilai</td>
                  {recent.map((r) => (
                    <td key={r.id} className="p-1 text-center">
                      <span className={`inline-block min-w-11 rounded px-1 py-0.5 tabular-nums ${cellTone(r.score)}`}>
                        {r.score}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">L = Latihan, S = Simulasi, P1 = Paket 1. Hijau ≥80, kuning 60–79, merah &lt;60.</p>
        </section>
      )}

      <section className="break-inside-avoid rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
        <h2 className="mb-3 font-bold">Status per paket</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-1 pr-2 font-medium">Paket</th>
                <th className="py-1 pr-2 text-center font-medium">Latihan (terbaik)</th>
                <th className="py-1 pr-2 text-center font-medium">Simulasi</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => {
                const l = lat.filter((r) => r.examId === e.id);
                const s = sim.filter((r) => r.examId === e.id).at(-1);
                const best = l.length ? Math.max(...l.map((r) => r.score)) : null;
                return (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">{stripRuby(e.title)}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">
                      {best === null ? <span className="text-gray-300">–</span> : `${best} (${l.length}×)`}
                    </td>
                    <td className="py-1.5 pr-2 text-center">
                      {s ? (
                        <span className={s.score >= passing(e.id) ? "font-bold text-brand-700" : "font-bold text-red-600"}>
                          {s.score} {s.passed ? "合格" : "不合格"}
                        </span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {results.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
          <h2 className="mb-3 font-bold">Riwayat & laporan</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {[...results].reverse().map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-28 shrink-0 text-gray-500 tabular-nums">{fmtDate(r.createdAt)}</span>
                <span className="min-w-0 flex-1">
                  {stripRuby(examById.get(r.examId)?.title ?? r.examId)} ·{" "}
                  <span className={r.mode === "simulasi" ? "font-bold" : ""}>{MODE_LABEL[r.mode]}</span>
                </span>
                <span className={`tabular-nums font-bold ${r.passed ? "text-brand-700" : "text-red-600"}`}>
                  {r.score} {r.passed ? "合格" : "不合格"}
                </span>
                <Link href={`/report/${r.id}`} className="text-brand-700 underline print:hidden">
                  Laporan
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
