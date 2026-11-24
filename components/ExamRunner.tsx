"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChoiceKey, ExamSettings, PublicExam } from "@/lib/types";
import { defaultSettings, loadSettings, saveSettings } from "@/lib/storage";
import { formatHMS } from "@/lib/time";
import { stripQuestionNumber, stripRuby } from "@/lib/ruby";
import { saveProgress, submitExam } from "@/app/exam/[id]/actions";
import { useNoCopy } from "@/lib/useNoCopy";
import type { AttemptPatch } from "@/lib/db";
import { Ruby } from "./Ruby";
import { Modal } from "./Modal";
import { ClockIcon, FlagIcon, GearIcon, HelpIcon } from "./Icons";

export interface RunnerAttempt {
  deadline: number;
  current: number;
  answers: Record<string, ChoiceKey>;
  flags: Record<string, boolean>;
}

/**
 * Layar ujian. Jawaban, flag, dan posisi soal disimpan ke server setiap kali berubah.
 * Sisa waktu dihitung dari deadline di server, jadi refresh/tutup browser tidak menghentikan waktu.
 */
export function ExamRunner({
  exam,
  attempt,
  serverNow,
  userName,
}: {
  exam: PublicExam;
  attempt: RunnerAttempt;
  serverNow: number;
  userName: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(attempt.answers);
  const [flags, setFlags] = useState(attempt.flags);
  const [current, setCurrent] = useState(attempt.current);
  const [settings, setSettings] = useState<ExamSettings>(defaultSettings);
  const [now, setNow] = useState<number | null>(null);
  const [modal, setModal] = useState<null | "finish" | "settings" | "help" | "timeup">(null);
  const [locked, setLocked] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const navRef = useRef<HTMLOListElement>(null);
  const offset = useRef(0); // selisih jam server - jam browser
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const resultUrl = `/exam/${exam.id}/result`;
  useNoCopy();

  useEffect(() => {
    offset.current = serverNow - Date.now();
    setNow(Date.now() + offset.current);
    setSettings(loadSettings());
    const t = setInterval(() => setNow(Date.now() + offset.current), 250);
    return () => clearInterval(t);
  }, [serverNow]);

  const lock = useCallback(() => {
    setLocked(true);
    setModal("timeup");
  }, []);

  /** Kirim perubahan ke server secara berurutan. */
  const persist = useCallback(
    (patch: AttemptPatch) => {
      queue.current = queue.current.then(async () => {
        try {
          const res = await saveProgress(exam.id, patch);
          setSaveError(false);
          if (!res.ok) lock();
        } catch {
          setSaveError(true);
        }
      });
    },
    [exam.id, lock],
  );

  const finish = useCallback(async () => {
    setLocked(true);
    setModal(null);
    await queue.current;
    await submitExam(exam.id);
    router.replace(resultUrl);
  }, [exam.id, router, resultUrl]);

  const remaining = now === null ? attempt.deadline - serverNow : attempt.deadline - now;

  // Waktu habis → submit otomatis & kunci jawaban.
  useEffect(() => {
    if (now !== null && remaining <= 0 && !locked) {
      lock();
      queue.current.then(() => submitExam(exam.id)).catch(() => undefined);
    }
  }, [now, remaining, locked, lock, exam.id]);

  const total = exam.questions.length;
  const idx = Math.min(current, total - 1);
  const q = exam.questions[idx];
  const selected = answers[q.id];
  const flagged = !!flags[q.id];

  const go = useCallback(
    (i: number) => {
      const next = Math.min(total - 1, Math.max(0, i));
      if (next === idx) return;
      setCurrent(next);
      if (!locked) persist({ current: next });
    },
    [total, idx, locked, persist],
  );
  const choose = (key: ChoiceKey) => {
    if (locked) return;
    const value = answers[q.id] === key ? null : key;
    setAnswers((a) => {
      const n = { ...a };
      if (value) n[q.id] = value;
      else delete n[q.id];
      return n;
    });
    persist({ answers: { [q.id]: value } });
  };
  const toggleFlag = () => {
    if (locked) return;
    const value = !flags[q.id];
    setFlags((f) => ({ ...f, [q.id]: value }));
    persist({ flags: { [q.id]: value } });
  };

  // Navigasi keyboard: ← → pindah soal, 1-4 pilih jawaban, F untuk flag.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (["1", "2", "3", "4"].includes(e.key)) {
        const c = q.choices[Number(e.key) - 1];
        if (c) choose(c.key);
      } else if (e.key.toLowerCase() === "f") toggleFlag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Gulir nomor soal aktif agar terlihat di sidebar.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const stats = useMemo(
    () => ({
      answered: exam.questions.filter((x) => answers[x.id]).length,
      flagged: exam.questions.filter((x) => flags[x.id]).length,
    }),
    [answers, flags, exam.questions],
  );

  const changeSettings = (s: ExamSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const lowTime = remaining < 5 * 60_000;

  return (
    <div
      className={`no-copy flex h-dvh flex-col bg-white font-scale-${settings.fontScale} ${settings.showFurigana ? "" : "hide-furigana"}`}
    >
      {/* Header */}
      <header className="flex items-center gap-3 bg-black px-3 py-2 text-white sm:px-5">
        <div className="min-w-0 flex-1 text-[15px] font-bold leading-snug sm:text-base">
          <div>設問：{idx + 1}</div>
          <div className="truncate">
            セクション：{stripRuby(q.section)}
          </div>
        </div>
        <div className="flex items-center gap-2 font-bold" aria-live="polite">
          <ClockIcon className="h-6 w-6 shrink-0" />
          <div className="leading-snug">
            <div className="text-[15px]">残り時間：</div>
            <div className={`text-[15px] tabular-nums sm:text-base ${lowTime ? "text-red-400" : ""}`}>
              {now === null ? "--:--:--" : formatHMS(remaining)}
            </div>
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          <button
            onClick={() => setModal("finish")}
            className="rounded-md bg-accent-200 px-5 py-2 text-lg font-medium text-ink hover:brightness-95 active:brightness-90"
          >
            終了
          </button>
        </div>
      </header>

      {/* Judul ujian */}
      <div className="flex gap-3 bg-brand-600 px-3 py-1.5 text-[15px] font-bold text-white sm:px-5">
        <span className="min-w-0 flex-1 truncate">
          試験：{stripRuby(exam.title)}　{stripRuby(exam.level)}
        </span>
        <span className="hidden shrink-0 font-medium sm:inline">受験者：{userName}</span>
      </div>
      {saveError && (
        <div role="status" className="bg-red-600 px-3 py-1 text-center text-sm text-white">
          回答を保存できませんでした。ネットワークを確認してください。(Gagal menyimpan, cek koneksi)
        </div>
      )}

      {/* Isi */}
      <div className="flex min-h-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-3">
        {/* Navigasi nomor soal */}
        <nav aria-label="問題一覧" className="w-[72px] shrink-0 overflow-y-auto pr-1 sm:w-20">
          <ol ref={navRef} className="flex flex-col gap-1">
            {exam.questions.map((qq, i) => {
              const isCur = i === idx;
              const answered = !!answers[qq.id];
              const isFlag = !!flags[qq.id];
              return (
                <li key={qq.id} data-idx={i}>
                  <button
                    onClick={() => go(i)}
                    aria-current={isCur ? "step" : undefined}
                    aria-label={`問題${i + 1}${answered ? " 回答済み" : " 未回答"}${isFlag ? " フラグあり" : ""}`}
                    className={`relative flex h-8 items-center justify-center rounded-sm text-[15px] font-bold transition-colors ${
                      isCur
                        ? "arrow-right w-full bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                        : answered
                          ? "w-[calc(100%-10px)] bg-brand-800 text-white"
                          : "w-[calc(100%-10px)] bg-brand-500 text-white hover:bg-brand-600"
                    }`}
                  >
                    {i + 1}
                    {isFlag && (
                      <FlagIcon className="absolute left-0.5 top-0.5 h-3.5 w-3.5 text-accent-400 drop-shadow" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Soal */}
        <main className="min-w-0 flex-1 overflow-y-auto rounded-md border border-gray-300 p-3 sm:p-5">
          <div className="q-text rounded-sm bg-gray-100 px-4 py-4 font-medium">
            {`問題${idx + 1}：`}
            <Ruby text={stripQuestionNumber(q.text)} />
          </div>

          <div role="radiogroup" aria-label="選択肢" className="mt-8 flex flex-col gap-5 sm:mt-10">
            {q.choices.map((c) => {
              const isSel = selected === c.key;
              return (
                <button
                  key={c.key}
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => choose(c.key)}
                  disabled={locked}
                  className={`q-text w-full border-[3px] px-4 py-2 text-left transition-colors ${
                    isSel
                      ? "border-slate-600 bg-accent-400"
                      : "border-slate-600 bg-white hover:bg-accent-200/40"
                  }`}
                >
                  {c.key}．<Ruby text={c.text} />
                </button>
              );
            })}
          </div>
        </main>
      </div>

      {/* Bar bawah */}
      <footer className="flex items-center gap-2 border-t-[6px] sm:gap-3 border-brand-600 bg-black px-3 py-3 sm:px-5">
        <button onClick={() => setModal("settings")} aria-label="設定" className="text-white hover:opacity-80">
          <GearIcon className="h-8 w-8 sm:h-9 sm:w-9" />
        </button>
        <span className="h-8 w-px bg-white/70 sm:h-9" aria-hidden />
        <button onClick={() => setModal("help")} aria-label="ヘルプ" className="text-white hover:opacity-80">
          <HelpIcon className="h-8 w-8 sm:h-9 sm:w-9" />
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={toggleFlag}
            aria-pressed={flagged}
            aria-label="フラグ"
            className={`flex h-12 w-11 items-center sm:w-14 justify-center rounded-sm transition-colors ${
              flagged ? "bg-accent-400 text-black" : "bg-brand-600 text-white hover:bg-brand-500"
            }`}
          >
            <FlagIcon className="h-6 w-6" />
          </button>
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

      {/* Modal: konfirmasi selesai */}
      <Modal
        open={modal === "finish"}
        title="試験を終了しますか？"
        onClose={() => setModal(null)}
        footer={
          <>
            <button onClick={() => setModal(null)} className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50">
              キャンセル
            </button>
            <button onClick={finish} className="rounded bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">
              終了する
            </button>
          </>
        }
      >
        <p>
          回答済み：<b>{stats.answered}</b> / {total} 問
        </p>
        {total - stats.answered > 0 && (
          <p className="text-red-600">未回答の問題が {total - stats.answered} 問あります。</p>
        )}
        {stats.flagged > 0 && <p>フラグ付きの問題：{stats.flagged} 問</p>}
        <p className="mt-2 text-sm text-gray-500">終了すると回答を変更できません。</p>
      </Modal>

      {/* Modal: waktu habis */}
      <Modal
        open={modal === "timeup"}
        title="試験時間終了"
        onClose={() => router.replace(resultUrl)}
        footer={
          <button
            onClick={() => router.replace(resultUrl)}
            className="rounded bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700"
          >
            結果を見る
          </button>
        }
      >
        <p>試験時間が終了しました。回答は自動的に提出されました。</p>
      </Modal>

      {/* Modal: pengaturan */}
      <Modal
        open={modal === "settings"}
        title="設定"
        onClose={() => setModal(null)}
        footer={
          <button onClick={() => setModal(null)} className="rounded bg-brand-600 px-4 py-2 text-white">
            閉じる
          </button>
        }
      >
        <fieldset>
          <legend className="mb-2 font-bold">文字の大きさ</legend>
          <div className="flex gap-2">
            {(
              [
                ["normal", "標準"],
                ["large", "大"],
                ["xlarge", "特大"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => changeSettings({ ...settings, fontScale: v })}
                className={`flex-1 rounded border px-3 py-2 ${
                  settings.fontScale === v ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="font-bold">ふりがなを表示</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand-600"
            checked={settings.showFurigana}
            onChange={(e) => changeSettings({ ...settings, showFurigana: e.target.checked })}
          />
        </label>
      </Modal>

      {/* Modal: bantuan */}
      <Modal
        open={modal === "help"}
        title="ヘルプ"
        onClose={() => setModal(null)}
        footer={
          <button onClick={() => setModal(null)} className="rounded bg-brand-600 px-4 py-2 text-white">
            閉じる
          </button>
        }
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>選択肢をクリックして回答します。もう一度クリックすると取り消せます。</li>
          <li>「戻る」「次へ」または左の番号で問題を移動します。</li>
          <li>フラグボタンで、後で見直したい問題に印を付けられます。</li>
          <li>キーボード：← → で移動、1〜4 で選択、F でフラグ。</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span className="inline-block h-4 w-4 rounded-sm bg-brand-500" /> 未回答
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-4 w-4 rounded-sm bg-brand-800" /> 回答済み
          </span>
          <span className="flex items-center gap-1">
            <FlagIcon className="h-4 w-4 text-accent-400" /> フラグ
          </span>
        </div>
      </Modal>
    </div>
  );
}
