import Link from "next/link";
import type { Attempt, Exam } from "@/lib/types";
import { formatHMS } from "@/lib/time";
import { stripQuestionNumber, stripRuby } from "@/lib/ruby";
import { orderQuestions } from "@/lib/order";
import { Ruby } from "./Ruby";
import { NoCopy } from "./NoCopy";

export function ResultView({
  exam,
  attempt,
  userName,
  backHref = "/",
  backLabel = "トップへ戻る",
}: {
  exam: Exam;
  attempt: Attempt;
  userName: string;
  backHref?: string;
  backLabel?: string;
}) {
  const answers = attempt.answers;
  const questions = orderQuestions(exam.questions, attempt.questionOrder);
  const total = exam.questions.length;
  const correct = exam.questions.filter((q) => answers[q.id] === q.answer).length;
  const unanswered = exam.questions.filter((q) => !answers[q.id]).length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const passed = score >= exam.passingScore;
  const used = Math.min(attempt.submittedAt ?? attempt.deadline, attempt.deadline) - attempt.startedAt;

  return (
    <NoCopy className="min-h-dvh bg-gray-50">
      <header className="bg-black px-4 py-3 text-lg font-bold text-white">試験結果</header>
      <div className="bg-brand-600 px-4 py-1.5 text-[15px] font-bold text-white">
        試験：{stripRuby(exam.title)}　{stripRuby(exam.level)}
      </div>

      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className={`text-3xl font-bold ${passed ? "text-brand-700" : "text-red-600"}`}>
            {passed ? "合格" : "不合格"}
          </div>
          <div className="mt-2 text-5xl font-bold tabular-nums">{score}点</div>
          <div className="mt-1 text-sm text-gray-500">合格ライン {exam.passingScore}点</div>
          <div className="mt-2 text-sm text-gray-600">
            受験者：{userName}
            {attempt.submitReason === "timeout" && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-amber-800">時間切れのため自動提出</span>
            )}
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded bg-gray-50 p-3">
              <dt className="text-gray-500">正解</dt>
              <dd className="text-xl font-bold">
                {correct} / {total}
              </dd>
            </div>
            <div className="rounded bg-gray-50 p-3">
              <dt className="text-gray-500">未回答</dt>
              <dd className="text-xl font-bold">{unanswered}</dd>
            </div>
            <div className="rounded bg-gray-50 p-3">
              <dt className="text-gray-500">所要時間</dt>
              <dd className="text-xl font-bold tabular-nums">{formatHMS(used)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={backHref} className="rounded bg-brand-600 px-5 py-2 font-bold text-white hover:bg-brand-700">
              {backLabel}
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">解答一覧</h2>
          <ol className="space-y-3">
            {questions.map((q, i) => {
              const mine = answers[q.id];
              const ok = mine === q.answer;
              return (
                <li key={q.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                        ok ? "bg-brand-600" : "bg-red-500"
                      }`}
                      aria-label={ok ? "正解" : "不正解"}
                    >
                      {ok ? "○" : "×"}
                    </span>
                    <div className="min-w-0 flex-1 leading-[2.2]">
                      <div className="font-medium">
                        {`問題${i + 1}：`}
                        <Ruby text={stripQuestionNumber(q.text)} />
                      </div>
                      <div className="text-sm text-gray-700">
                        あなたの回答：
                        {mine ? (
                          <>
                            {mine}．<Ruby text={q.choices.find((c) => c.key === mine)?.text ?? ""} />
                          </>
                        ) : (
                          "未回答"
                        )}
                      </div>
                      {!ok && (
                        <div className="text-sm text-brand-700">
                          正解：{q.answer}．<Ruby text={q.choices.find((c) => c.key === q.answer)?.text ?? ""} />
                        </div>
                      )}
                      {q.explanation && (
                        <div className="mt-1 rounded bg-brand-50 px-3 py-1 text-sm">
                          解説：<Ruby text={q.explanation} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">問{i + 1}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </NoCopy>
  );
}
