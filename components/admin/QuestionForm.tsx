"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { saveQuestion, type FormState } from "@/app/admin/actions";
import type { ChoiceKey, Question } from "@/lib/types";
import { CHOICE_KEYS } from "@/lib/validate";
import { Ruby } from "../Ruby";
import { stripQuestionNumber } from "@/lib/ruby";
import { Errors, Field, btnGhost, btnPrimary, inputCls, keepValues } from "./ui";

export function QuestionForm({
  examId,
  question,
  number,
  sections,
}: {
  examId: string;
  question?: Question;
  number: number;
  sections: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuestion, { errors: [] });
  const [section, setSection] = useState(question?.section ?? sections[sections.length - 1] ?? "");
  const [text, setText] = useState(question?.text ?? "");
  const [choices, setChoices] = useState<string[]>(
    CHOICE_KEYS.map((k) => question?.choices.find((c) => c.key === k)?.text ?? ""),
  );
  const [answer, setAnswer] = useState<ChoiceKey | "">(question?.answer ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={keepValues(action, startTransition)} className="space-y-4">
        <input type="hidden" name="examId" value={examId} />
        {question && <input type="hidden" name="qid" value={question.id} />}

        <Field label="Seksi / kategori">
          <input
            name="section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            list="sections"
            required
            className={inputCls}
          />
          <datalist id="sections">
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Teks soal"
          hint={
            <>
              Nomor soal (問題1, 問題2, …) dibuat otomatis, tidak perlu ditulis. Furigana ditulis <code className="rounded bg-gray-100 px-1">{"{漢字|かんじ}"}</code>, contoh{" "}
              <code className="rounded bg-gray-100 px-1">{"{設備|せつび}"}</code>
            </>
          }
        >
          <textarea name="text" value={text} onChange={(e) => setText(e.target.value)} rows={3} required className={inputCls} />
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-bold text-gray-700">Pilihan jawaban (pilih yang benar)</legend>
          {CHOICE_KEYS.map((k, i) => (
            <div key={k} className="flex items-center gap-2">
              <label
                className={`flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md border font-bold ${
                  answer === k ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white"
                }`}
                title="Tandai sebagai jawaban benar"
              >
                <input
                  type="radio"
                  name="answer"
                  value={k}
                  checked={answer === k}
                  onChange={() => setAnswer(k)}
                  className="sr-only"
                />
                {k}
              </label>
              <input
                name={`choice_${i}`}
                value={choices[i]}
                onChange={(e) => setChoices((c) => c.map((v, j) => (j === i ? e.target.value : v)))}
                required
                aria-label={`Pilihan ${k}`}
                className={inputCls}
              />
            </div>
          ))}
        </fieldset>

        <Field label="Pembahasan (opsional)">
          <textarea
            name="explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>

        <Errors errors={state.errors} />

        <div className="flex flex-wrap gap-2">
          <button disabled={pending} className={btnPrimary}>
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
          {!question && (
            <button disabled={pending} name="next" value="new" className={btnGhost}>
              Simpan & tambah lagi
            </button>
          )}
          <Link href={`/admin/exams/${examId}`} className={btnGhost}>
            Batal
          </Link>
        </div>
      </form>

      {/* Preview seperti tampilan peserta */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-2 text-sm font-bold text-gray-700">Preview</div>
        <div className="overflow-hidden rounded-md border border-gray-300 bg-white" lang="ja">
          <div className="bg-black px-3 py-1.5 text-sm font-bold text-white">
            設問：{number}　セクション：{section.replace(/\{([^|{}]+)\|[^{}]+\}/g, "$1")}
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-sm bg-gray-100 px-3 py-2 text-[17px] leading-[2.3]">
              {`問題${number}：`}
              <Ruby text={stripQuestionNumber(text)} />
            </div>
            {CHOICE_KEYS.map((k, i) => (
              <div
                key={k}
                className={`border-[3px] border-slate-600 px-3 py-1 text-[17px] leading-[2.3] ${
                  answer === k ? "bg-accent-400" : ""
                }`}
              >
                {k}．<Ruby text={choices[i]} />
              </div>
            ))}
            {explanation && (
              <div className="rounded bg-brand-50 px-3 py-1 text-sm leading-[2.2]">
                解説：<Ruby text={explanation} />
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Pilihan berwarna kuning = jawaban benar.</p>
      </div>
    </div>
  );
}
