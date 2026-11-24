import type { Exam, PublicUser } from "@/lib/types";
import { MODE_LABEL, topicStats, type ResultRecord } from "@/lib/report";
import { stripQuestionNumber, stripRuby } from "@/lib/ruby";
import { formatHMS } from "@/lib/time";
import { Ruby } from "./Ruby";
import { Explanation } from "./Explanation";
import { TopicBars } from "./TopicBars";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Laporan hasil lengkap untuk trainer: identitas, nilai, 合格/不合格,
 * persentase per materi, lalu setiap soal dengan jawaban peserta, kunci, dan pembahasan JP + ID.
 * Dirancang untuk dicetak / disimpan sebagai PDF.
 */
export function ResultReport({
  exam,
  result,
  user,
  actions,
}: {
  exam: Exam;
  result: ResultRecord;
  user: PublicUser;
  actions?: React.ReactNode;
}) {
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const items = result.detail
    .map((d) => ({ d, q: byId.get(d.questionId) }))
    .filter((x): x is { d: (typeof result.detail)[number]; q: Exam["questions"][number] } => !!x.q);
  const stats = topicStats(result.detail);
  const wrong = items.filter((x) => x.d.choice !== x.d.answer);
  const unanswered = items.filter((x) => !x.d.choice).length;

  return (
    <div className="min-h-dvh bg-gray-50 print:bg-white">
      <header className="flex items-center gap-3 bg-black px-4 py-3 text-white print:hidden">
        <span className="text-lg font-bold">
          <ruby>
            成績報告書<rt>せいせきほうこくしょ</rt>
          </ruby>{" "}
          · Laporan Hasil
        </span>
      </header>
      <div className="bg-brand-600 px-4 py-1.5 text-[15px] font-bold text-white print:hidden">
        試験：{stripRuby(exam.title)}　{stripRuby(exam.level)}
      </div>

      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6 print:max-w-none print:p-0">
        {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}

        {/* Ringkasan */}
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
          <h1 className="text-xl font-bold leading-[2.2]">
            <Ruby text={exam.title} />
          </h1>
          <div className="leading-[2.2] text-brand-700">
            <Ruby text={exam.level} />
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Peserta</dt>
            <dd className="font-bold">
              {user.name} <span className="font-normal text-gray-500">({user.username})</span>
            </dd>
            <dt className="text-gray-500">Mode</dt>
            <dd>{MODE_LABEL[result.mode]}</dd>
            <dt className="text-gray-500">Tanggal</dt>
            <dd>{fmtDate(result.createdAt)} WIB</dd>
            <dt className="text-gray-500">Waktu kerja</dt>
            <dd className="tabular-nums">{formatHMS(result.durationSec * 1000)}</dd>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-md bg-gray-50 p-4 print:bg-white">
            <div className={`text-3xl font-bold ${result.passed ? "text-brand-700" : "text-red-600"}`}>
              {result.passed ? "合格" : "不合格"}
              <span className="ml-2 text-base font-medium">{result.passed ? "Lulus" : "Tidak lulus"}</span>
            </div>
            <div className="ml-auto text-right">
              <div className="text-4xl font-bold tabular-nums">{result.score}点</div>
              <div className="text-xs text-gray-500">Batas lulus {exam.passingScore} poin</div>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded bg-gray-50 p-2 print:border print:border-gray-300 print:bg-white">
              <dt className="text-gray-500">正解 · Benar</dt>
              <dd className="text-lg font-bold">
                {result.correct} / {result.total}
              </dd>
            </div>
            <div className="rounded bg-gray-50 p-2 print:border print:border-gray-300 print:bg-white">
              <dt className="text-gray-500">不正解 · Salah</dt>
              <dd className="text-lg font-bold">{wrong.length - unanswered}</dd>
            </div>
            <div className="rounded bg-gray-50 p-2 print:border print:border-gray-300 print:bg-white">
              <dt className="text-gray-500">未回答 · Kosong</dt>
              <dd className="text-lg font-bold">{unanswered}</dd>
            </div>
          </dl>
        </section>

        {/* Per materi */}
        <section className="break-inside-avoid rounded-lg border border-gray-200 bg-white p-5 shadow-sm print:border-gray-400 print:shadow-none">
          <h2 className="mb-3 font-bold">
            <ruby>
              分野別<rt>ぶんやべつ</rt>
            </ruby>
            の
            <ruby>
              理解度<rt>りかいど</rt>
            </ruby>{" "}
            · Pemahaman per materi
          </h2>
          <TopicBars stats={stats} />
          {wrong.length > 0 && (
            <p className="mt-4 text-sm text-gray-600">
              Soal salah / kosong: {wrong.map((x) => result.detail.indexOf(x.d) + 1).join(", ")}
            </p>
          )}
        </section>

        {/* Detail soal */}
        <section>
          <h2 className="mb-3 text-lg font-bold">
            <ruby>
              解答<rt>かいとう</rt>
            </ruby>
            と
            <ruby>
              解説<rt>かいせつ</rt>
            </ruby>{" "}
            · Jawaban & pembahasan
          </h2>
          <ol className="space-y-3">
            {items.map(({ d, q }, i) => {
              const ok = d.choice === d.answer;
              return (
                <li
                  key={q.id}
                  className={`break-inside-avoid rounded-lg border bg-white p-4 shadow-sm print:shadow-none ${
                    ok ? "border-gray-200 print:border-gray-300" : "border-red-300 print:border-red-400"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-white ${
                        ok ? "bg-brand-600" : "bg-red-500"
                      }`}
                    >
                      {ok ? "○" : "×"}
                    </span>
                    <span className="font-bold">問題{i + 1}</span>
                    <span className="leading-[2] text-gray-500">
                      <Ruby text={q.section} />
                    </span>
                  </div>
                  <div className="mt-1 whitespace-pre-line leading-[2.2]">
                    <Ruby text={stripQuestionNumber(q.text)} />
                  </div>
                  <ul className="mt-2 space-y-1 text-[15px]">
                    {q.choices.map((c) => {
                      const isAns = c.key === d.answer;
                      const isMine = c.key === d.choice;
                      return (
                        <li
                          key={c.key}
                          className={`rounded border px-3 py-0.5 leading-[2.2] ${
                            isAns
                              ? "border-brand-600 bg-brand-50"
                              : isMine
                                ? "border-red-400 bg-red-50"
                                : "border-gray-200"
                          }`}
                        >
                          {c.key}．<Ruby text={c.text} />
                          {isAns && <span className="ml-2 text-xs font-bold text-brand-700">正解 · Kunci</span>}
                          {isMine && (
                            <span className={`ml-2 text-xs font-bold ${ok ? "text-brand-700" : "text-red-600"}`}>
                              ← Jawaban peserta
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!d.choice && <p className="mt-1 text-sm text-red-600">未回答 · Tidak dijawab</p>}
                  <Explanation text={q.explanation} className="mt-2" />
                </li>
              );
            })}
          </ol>
        </section>
        <p className="pb-6 text-center text-xs text-gray-400">eduTech CBT · {fmtDate(Date.now())} WIB</p>
      </div>
    </div>
  );
}
