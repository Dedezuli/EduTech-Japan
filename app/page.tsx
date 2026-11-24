import Link from "next/link";
import { listAttemptsForUser, listExams, listResults } from "@/lib/db";
import { requireUser } from "@/lib/userAuth";
import { stripRuby } from "@/lib/ruby";
import { Ruby } from "@/components/Ruby";
import type { Exam } from "@/lib/types";
import { userLogout } from "./actions";

export const dynamic = "force-dynamic";

/** Kelompokkan paket per level (satu "folder" per level, mis. 生産管理オペレーション３級). */
function groupByLevel(exams: Exam[]) {
  const groups = new Map<string, { level: string; exams: Exam[] }>();
  for (const e of exams) {
    const key = stripRuby(e.level) || "（その他）";
    const g = groups.get(key) ?? { level: e.level, exams: [] };
    g.exams.push(e);
    groups.set(key, g);
  }
  return [...groups.values()];
}

export default async function Home() {
  const user = await requireUser();
  const exams = (await listExams()).filter((e) => e.questions.length > 0);
  const [attempts, results] = await Promise.all([listAttemptsForUser(user.id), listResults({ userId: user.id })]);
  const groups = groupByLevel(exams);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center bg-black px-4 py-3 text-white">
        <span className="shrink-0 text-xl font-bold whitespace-nowrap">eduTech CBT</span>
        <span className="ml-auto mr-3 min-w-0 truncate text-sm text-gray-300">{user.name}</span>
        <form action={userLogout}>
          <button className="shrink-0 rounded border border-gray-500 px-3 py-1 text-sm whitespace-nowrap text-gray-200 hover:bg-white/10">
            ログアウト
          </button>
        </form>
      </header>
      <div className="h-1.5 bg-brand-600" />
      <main className="mx-auto max-w-3xl p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-bold">Paket Ujian</h1>
            <p className="text-sm text-gray-600">
              <b>Latihan</b>: tanpa batas waktu, kunci & pembahasan langsung muncul, bisa diulang.{" "}
              <b>Simulasi Ujian</b>: seperti ujian asli (ada waktu), hanya 1 kali.
            </p>
          </div>
          <Link
            href="/progress"
            className="rounded border border-brand-600 bg-white px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            Perkembangan saya
          </Link>
        </div>

        <div className="space-y-8">
          {groups.map((g) => (
            <section key={stripRuby(g.level)}>
              <h2 className="mb-3 flex items-center gap-2 border-b-2 border-brand-600 pb-1 text-lg font-bold leading-[2.2]">
                <span aria-hidden>📁</span>
                <Ruby text={g.level} />
                <span className="ml-auto text-sm font-normal text-gray-500">{g.exams.length} paket</span>
              </h2>
              <ul className="space-y-4">
                {g.exams.map((e) => {
                  const a = attempts.find((x) => x.examId === e.id);
                  const lat = results.filter((r) => r.examId === e.id && r.mode === "latihan");
                  const best = lat.length ? Math.max(...lat.map((r) => r.score)) : null;
                  const sim = results.filter((r) => r.examId === e.id && r.mode === "simulasi").at(-1);
                  return (
                    <li key={e.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="text-lg font-bold leading-[2.2]">
                        <Ruby text={e.title} />
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{e.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                        <span>問題数：{e.questions.length}</span>
                        <span>試験時間：{e.durationMinutes}分</span>
                        <span>合格ライン：{e.passingScore}点</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>Latihan: {best === null ? "belum" : <b>{best} poin terbaik ({lat.length}×)</b>}</span>
                        <span>
                          Simulasi:{" "}
                          {sim ? (
                            <b className={sim.passed ? "text-brand-700" : "text-red-600"}>
                              {sim.score} poin {sim.passed ? "合格" : "不合格"}
                            </b>
                          ) : a ? (
                            "sedang dikerjakan"
                          ) : (
                            "belum"
                          )}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          href={`/practice/${e.id}`}
                          className="rounded border-2 border-brand-600 px-3 py-2 text-center font-bold text-brand-700 hover:bg-brand-50"
                        >
                          <ruby>
                            練習<rt>れんしゅう</rt>
                          </ruby>
                          <span className="block text-xs font-medium">Latihan</span>
                        </Link>
                        {a?.submittedAt ? (
                          <Link
                            href={`/exam/${e.id}/result`}
                            className="rounded border-2 border-gray-400 px-3 py-2 text-center font-bold text-gray-700 hover:bg-gray-50"
                          >
                            結果を見る
                            <span className="block text-xs font-medium">Hasil simulasi ({a.score} poin)</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/exam/${e.id}`}
                            className={`rounded px-3 py-2 text-center font-bold ${
                              a ? "bg-accent-400 text-black hover:brightness-95" : "bg-brand-600 text-white hover:bg-brand-700"
                            }`}
                          >
                            {a ? (
                              "受験を続ける"
                            ) : (
                              <ruby>
                                模擬試験<rt>もぎしけん</rt>
                              </ruby>
                            )}
                            <span className="block text-xs font-medium">{a ? "Lanjutkan simulasi" : "Simulasi Ujian"}</span>
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
