import Link from "next/link";
import { listResults, listUsers } from "@/lib/db";
import { scoreOf, topicStats } from "@/lib/report";
import { stripRuby } from "@/lib/ruby";
import { Card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/** Ringkasan perkembangan semua peserta untuk trainer. */
export default async function ProgressOverviewPage() {
  const [users, results] = await Promise.all([listUsers(), listResults()]);
  const rows = users.map((u) => {
    const rs = results.filter((r) => r.userId === u.id);
    const items = rs.flatMap((r) => r.detail);
    const topics = topicStats(items).sort((a, b) => a.pct - b.pct);
    const sims = rs.filter((r) => r.mode === "simulasi");
    return {
      u,
      count: rs.length,
      overall: items.length ? scoreOf(items.filter((d) => d.choice === d.answer).length, items.length) : null,
      lastSim: sims.at(-1),
      weakest: topics[0],
      last: rs.at(-1)?.createdAt,
    };
  });
  return (
    <>
      <h1 className="text-2xl font-bold">Perkembangan peserta</h1>
      <Card title={`Peserta (${users.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Peserta</th>
                <th className="py-2 pr-3 text-center font-medium">Hasil</th>
                <th className="py-2 pr-3 text-center font-medium">Pemahaman total</th>
                <th className="py-2 pr-3 text-center font-medium">Simulasi terakhir</th>
                <th className="py-2 pr-3 font-medium">Materi terlemah</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ u, count, overall, lastSim, weakest }) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="font-mono text-xs text-gray-500">{u.username}</div>
                  </td>
                  <td className="py-2 pr-3 text-center tabular-nums">{count}</td>
                  <td className="py-2 pr-3 text-center">
                    {overall === null ? (
                      <span className="text-gray-300">–</span>
                    ) : (
                      <b className={overall >= 60 ? "text-brand-700" : "text-red-600"}>{overall}%</b>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {lastSim ? (
                      <span className={lastSim.passed ? "font-bold text-brand-700" : "font-bold text-red-600"}>
                        {lastSim.score} {lastSim.passed ? "合格" : "不合格"}
                      </span>
                    ) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {weakest ? `${stripRuby(weakest.topic)} (${weakest.pct}%)` : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="py-2 text-right">
                    <Link href={`/admin/users/${u.id}/progress`} className="text-brand-700 underline">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
