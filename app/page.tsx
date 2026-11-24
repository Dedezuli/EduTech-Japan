import Link from "next/link";
import { listAttemptsForUser, listExams } from "@/lib/db";
import { requireUser } from "@/lib/userAuth";
import { Ruby } from "@/components/Ruby";
import { userLogout } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const exams = (await listExams()).filter((e) => e.questions.length > 0);
  const attempts = await listAttemptsForUser(user.id);
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center bg-black px-4 py-3 text-white">
        <span className="text-xl font-bold">eduTech CBT</span>
        <span className="ml-auto mr-4 text-sm text-gray-300">{user.name}</span>
        <form action={userLogout}>
          <button className="rounded border border-gray-500 px-3 py-1 text-sm text-gray-200 hover:bg-white/10">
            ログアウト
          </button>
        </form>
      </header>
      <div className="h-1.5 bg-brand-600" />
      <main className="mx-auto max-w-3xl p-4 sm:p-8">
        <h1 className="mb-1 text-2xl font-bold">Daftar Ujian</h1>
        <p className="mb-6 text-gray-600">Pilih ujian untuk mulai. Setiap ujian hanya bisa dikerjakan satu kali.</p>
        <ul className="space-y-4">
          {exams.map((e) => {
            const a = attempts.find((x) => x.examId === e.id);
            return (
            <li key={e.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-bold leading-[2.2]">
                <Ruby text={e.title} />
              </div>
              <div className="leading-[2.2] text-brand-700">
                <Ruby text={e.level} />
              </div>
              <p className="mt-1 text-sm text-gray-600">{e.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <span>問題数：{e.questions.length}</span>
                <span>試験時間：{e.durationMinutes}分</span>
                <span>合格ライン：{e.passingScore}点</span>
                {a?.submittedAt ? (
                  <Link
                    href={`/exam/${e.id}/result`}
                    className="ml-auto rounded border border-brand-600 px-5 py-2 font-bold text-brand-700 hover:bg-brand-50"
                  >
                    結果を見る（{a.score}点）
                  </Link>
                ) : a ? (
                  <Link
                    href={`/exam/${e.id}`}
                    className="ml-auto rounded bg-accent-400 px-5 py-2 font-bold text-black hover:brightness-95"
                  >
                    受験を続ける
                  </Link>
                ) : (
                  <Link
                    href={`/exam/${e.id}`}
                    className="ml-auto rounded bg-brand-600 px-5 py-2 font-bold text-white hover:bg-brand-700"
                  >
                    受験開始
                  </Link>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
