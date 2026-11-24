import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAttempt, getExam } from "@/lib/db";
import { requireUser } from "@/lib/userAuth";
import { stripRuby } from "@/lib/ruby";
import type { PublicExam } from "@/lib/types";
import { ExamRunner } from "@/components/ExamRunner";
import { Ruby } from "@/components/Ruby";
import { startExam } from "./actions";
import { orderQuestions } from "@/lib/order";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/exam/${id}`);
  const exam = await getExam(id);
  if (!exam) notFound();
  if (exam.questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <p className="mb-4">Ujian ini belum memiliki soal.</p>
        <Link href="/" className="text-brand-700 underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const attempt = await getAttempt(user.id, exam.id);
  if (attempt?.submittedAt) redirect(`/exam/${exam.id}/result`);

  // Belum mulai → layar konfirmasi. Timer baru berjalan setelah peserta menekan 開始.
  if (!attempt) {
    return (
      <div className="min-h-dvh bg-gray-50">
        <header className="bg-black px-4 py-3 text-lg font-bold text-white">試験開始前の確認</header>
        <div className="truncate bg-brand-600 px-4 py-1.5 text-[15px] font-bold text-white">
          試験：{stripRuby(exam.title)}　{stripRuby(exam.level)}
        </div>
        <main className="mx-auto max-w-xl p-4 sm:p-8">
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-xl font-bold leading-[2.2]">
              <Ruby text={exam.title} />　<Ruby text={exam.level} />
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded bg-gray-50 p-3">
                <dt className="text-gray-500">問題数</dt>
                <dd className="text-xl font-bold">{exam.questions.length}</dd>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <dt className="text-gray-500">試験時間</dt>
                <dd className="text-xl font-bold">{exam.durationMinutes}分</dd>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <dt className="text-gray-500">合格ライン</dt>
                <dd className="text-xl font-bold">{exam.passingScore}点</dd>
              </div>
            </dl>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
              <li>開始ボタンを押すと、時間の計測が始まります。</li>
              <li>ページを再読み込みしても、時間は止まりません。</li>
              <li>時間が終了すると、回答は自動的に提出され、変更できなくなります。</li>
              <li>受験は1回のみです。</li>
            </ul>
            <p className="text-sm text-gray-500">受験者：{user.name}（{user.username}）</p>
            <form action={startExam} className="flex gap-3">
              <input type="hidden" name="examId" value={exam.id} />
              <button className="flex-1 rounded bg-brand-600 py-3 text-lg font-bold text-white hover:bg-brand-700">
                開始する
              </button>
              <Link href="/" className="rounded border border-gray-300 px-5 py-3 hover:bg-gray-100">
                戻る
              </Link>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Kirim soal tanpa kunci jawaban & pembahasan ke browser.
  const publicExam: PublicExam = {
    ...exam,
    questions: orderQuestions(exam.questions, attempt.questionOrder).map(({ answer: _a, explanation: _e, ...q }) => q),
  };

  return (
    <ExamRunner
      exam={publicExam}
      attempt={{ deadline: attempt.deadline, current: attempt.current, answers: attempt.answers, flags: attempt.flags }}
      serverNow={Date.now()}
      userName={user.name}
    />
  );
}
