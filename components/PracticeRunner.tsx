"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChoiceKey, Exam } from "@/lib/types";
import { formatHMS } from "@/lib/time";
import { stripQuestionNumber, stripRuby } from "@/lib/ruby";
import { finishPractice } from "@/app/practice/[id]/actions";
import { Ruby } from "./Ruby";
import { Modal } from "./Modal";
import { Explanation } from "./Explanation";
import { ClockIcon } from "./Icons";

type Saved = { answers: Record<string, ChoiceKey>; current: number; startedAt: number };

/**
 * Mode latihan: tanpa batas waktu. Setelah memilih jawaban, langsung tampil
 * benar/salah, kunci jawaban, dan pembahasan (JP + ID). Hasil akhir disimpan ke riwayat.
 */
export function PracticeRunner({ exam, userName }: { exam: Exam; userName: string }) {
  const router = useRouter();
  const storeKey = `edutech:practice:${exam.id}`;
  const [answers, setAnswers] = useState<Record<string, ChoiceKey>>({});
  const [current, setCurrent] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [modal, setModal] = useState<null | "finish" | "restart">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const navRef = useRef<HTMLOListElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Lanjutkan latihan yang belum selesai (disimpan di browser ini).
  useEffect(() => {
    let saved: Saved | null = null;
    try {
      const raw = window.localStorage.getItem(storeKey);
      saved = raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
      saved = null;
    }
    if (saved) {
      setAnswers(saved.answers ?? {});
      setCurrent(saved.current ?? 0);
    }
    setStartedAt(saved?.startedAt ?? Date.now());
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [storeKey]);

  useEffect(() => {
    if (startedAt === null) return;
    try {
      window.localStorage.setItem(storeKey, JSON.stringify({ answers, current, startedAt } satisfies Saved));
    } catch {
      /* abaikan */
    }
  }, [answers, current, startedAt, storeKey]);

  const total = exam.questions.length;
  const idx = Math.min(current, total - 1);
  const q = exam.questions[idx];
  const selected = answers[q.id];
  const revealed = !!selected;
  const isCorrect = selected === q.answer;

  const go = useCallback(
    (i: number) => {
      setCurrent(Math.min(total - 1, Math.max(0, i)));
      mainRef.current?.scrollTo({ top: 0 });
    },
    [total],
  );
  const choose = (key: ChoiceKey) => {
    if (revealed || busy) return;
    setAnswers((a) => ({ ...a, [q.id]: key }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (["1", "2", "3", "4"].includes(e.key)) {
        const c = q.choices[Number(e.key) - 1];
        if (c) choose(c.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const stats = useMemo(() => {
    const done = exam.questions.filter((x) => answers[x.id]);
    return { answered: done.length, correct: done.filter((x) => answers[x.id] === x.answer).length };
  }, [answers, exam.questions]);

  const finish = async () => {
    setBusy(true);
    setError(false);
    try {
      const id = await finishPractice(exam.id, answers, startedAt ? (Date.now() - startedAt) / 1000 : 0);
      try {
        window.localStorage.removeItem(storeKey);
      } catch {
        /* abaikan */
      }
      router.replace(`/report/${id}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrent(0);
    setStartedAt(Date.now());
    setModal(null);
  };

  const elapsed = startedAt && now ? now - startedAt : 0;

  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="flex items-center gap-3 bg-black px-3 py-2 text-white sm:px-5">
        <div className="min-w-0 flex-1 text-[15px] font-bold leading-snug sm:text-base">
          <div>設問：{idx + 1}</div>
          <div className="truncate">セクション：{stripRuby(q.section)}</div>
        </div>
        <div className="flex items-center gap-2 font-bold">
          <ClockIcon className="h-6 w-6 shrink-0" />
          <div className="leading-snug">
            <div className="text-[15px]">経過時間：</div>
            <div className="text-[15px] tabular-nums sm:text-base">{formatHMS(elapsed)}</div>
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          <button
            onClick={() => setModal("finish")}
            className="rounded-md bg-accent-200 px-5 py-2 text-lg font-medium text-ink hover:brightness-95"
          >
            終了
          </button>
        </div>
      </header>

      <div className="flex gap-3 bg-brand-600 px-3 py-1.5 text-[15px] font-bold text-white sm:px-5">
        <span className="shrink-0 rounded bg-white/20 px-1.5">練習 · Latihan</span>
        <span className="min-w-0 flex-1 truncate">
          {stripRuby(exam.title)}　{stripRuby(exam.level)}
        </span>
        <span className="hidden shrink-0 font-medium sm:inline">受験者：{userName}</span>
      </div>

      <div className="flex min-h-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-3">
        <nav aria-label="問題一覧" className="w-[72px] shrink-0 overflow-y-auto pr-1 sm:w-20">
          <ol ref={navRef} className="flex flex-col gap-1">
            {exam.questions.map((qq, i) => {
              const isCur = i === idx;
              const a = answers[qq.id];
              const color = !a ? "bg-brand-500" : a === qq.answer ? "bg-brand-800" : "bg-red-500";
              return (
                <li key={qq.id} data-idx={i}>
                  <button
                    onClick={() => go(i)}
                    aria-current={isCur ? "step" : undefined}
                    aria-label={`問題${i + 1}${!a ? " 未回答" : a === qq.answer ? " 正解" : " 不正解"}`}
                    className={`relative flex h-8 items-center justify-center rounded-sm text-[15px] font-bold transition-colors ${
                      isCur
                        ? "arrow-right w-full bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                        : `w-[calc(100%-10px)] text-white ${color}`
                    }`}
                  >
                    {i + 1}
                    {a && !isCur && <span className="absolute right-1 text-[10px]">{a === qq.answer ? "○" : "×"}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main
          ref={mainRef}
          className="min-w-0 flex-1 overflow-y-auto rounded-md border border-gray-300 p-3 sm:p-5"
        >
          <div className="q-text rounded-sm bg-gray-100 px-4 py-4 font-medium">
            {`問題${idx + 1}：`}
            <Ruby text={stripQuestionNumber(q.text)} />
          </div>

          <div role="radiogroup" aria-label="選択肢" className="mt-6 flex flex-col gap-4 sm:mt-8">
            {q.choices.map((c) => {
              const isSel = selected === c.key;
              const isAns = c.key === q.answer;
              let cls = "border-slate-600 bg-white hover:bg-accent-200/40";
              if (revealed) {
                if (isAns) cls = "border-brand-700 bg-brand-50";
                else if (isSel) cls = "border-red-500 bg-red-50";
                else cls = "border-gray-300 bg-white text-gray-500";
              }
              return (
                <button
                  key={c.key}
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => choose(c.key)}
                  disabled={revealed}
                  className={`q-text w-full border-[3px] px-4 py-2 text-left transition-colors ${cls}`}
                >
                  {c.key}．<Ruby text={c.text} />
                  {revealed && isAns && <span className="ml-2 text-sm font-bold text-brand-700">○ 正解</span>}
                  {revealed && isSel && !isAns && <span className="ml-2 text-sm font-bold text-red-600">× あなたの回答</span>}
                </button>
              );
            })}
          </div>

          {revealed ? (
            <div className="mt-5">
              <div className={`mb-2 text-lg font-bold ${isCorrect ? "text-brand-700" : "text-red-600"}`}>
                {isCorrect ? "○ 正解！ Benar" : `× 不正解 · Salah — 正解は ${q.answer}`}
              </div>
              <Explanation text={q.explanation} />
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-500">
              Pilih jawaban. Kunci dan pembahasan akan langsung muncul.
            </p>
          )}
        </main>
      </div>

      <footer className="flex items-center gap-2 border-t-[6px] border-brand-600 bg-black px-3 py-3 sm:gap-3 sm:px-5">
        <div className="text-sm leading-tight text-white">
          <div>
            正解 <b className="tabular-nums">{stats.correct}</b> / {stats.answered}
          </div>
          <div className="text-gray-300">
            回答 {stats.answered}/{total}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            className="arrow-left h-12 w-[5.5rem] bg-brand-600 pl-3 text-lg text-white hover:bg-brand-500 disabled:bg-gray-600 disabled:text-gray-400 sm:w-32"
          >
            戻る
          </button>
          {idx < total - 1 ? (
            <button
              onClick={() => go(idx + 1)}
              className="arrow-right-lg h-12 w-[5.5rem] bg-brand-600 pr-3 text-lg text-white hover:bg-brand-500 sm:w-32"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={() => setModal("finish")}
              className="arrow-right-lg h-12 w-[5.5rem] bg-accent-400 pr-3 text-lg font-bold text-black hover:brightness-95 sm:w-32"
            >
              終了
            </button>
          )}
        </div>
      </footer>

      <Modal
        open={modal === "finish"}
        title="練習を終了しますか？"
        onClose={() => !busy && setModal(null)}
        footer={
          <>
            <button
              onClick={() => setModal("restart")}
              disabled={busy}
              className="mr-auto rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Ulang dari awal
            </button>
            <button
              onClick={() => setModal(null)}
              disabled={busy}
              className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={finish}
              disabled={busy}
              className="rounded bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "保存中…" : "終了する"}
            </button>
          </>
        }
      >
        <p>
          回答済み：<b>{stats.answered}</b> / {total} 問 · 正解 <b>{stats.correct}</b>
        </p>
        {total - stats.answered > 0 && (
          <p className="text-red-600">
            未回答 {total - stats.answered} 問 (dihitung salah di laporan).
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Hasil disimpan ke riwayat dan laporan untuk trainer akan dibuat.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">Gagal menyimpan. Cek koneksi lalu coba lagi.</p>}
      </Modal>

      <Modal
        open={modal === "restart"}
        title="最初からやり直しますか？"
        onClose={() => setModal(null)}
        footer={
          <>
            <button onClick={() => setModal("finish")} className="rounded border border-gray-300 px-4 py-2">
              キャンセル
            </button>
            <button onClick={restart} className="rounded bg-red-600 px-4 py-2 font-bold text-white">
              Ulang
            </button>
          </>
        }
      >
        <p>Semua jawaban latihan ini dihapus dan mulai lagi dari soal 1 (tidak disimpan ke riwayat).</p>
      </Modal>
    </div>
  );
}
