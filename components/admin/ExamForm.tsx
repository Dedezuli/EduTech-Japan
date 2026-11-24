"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { saveExam, type FormState } from "@/app/admin/actions";
import type { Exam } from "@/lib/types";
import { Ruby } from "../Ruby";
import { Errors, Field, btnPrimary, inputCls, keepValues } from "./ui";

export function ExamForm({ exam }: { exam?: Exam }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveExam, { errors: [] });
  const [title, setTitle] = useState(exam?.title ?? "");
  const [level, setLevel] = useState(exam?.level ?? "");
  const [saved, setSaved] = useState(false);
  const [initial] = useState(state);

  // Tampilkan "Tersimpan" sebentar setelah update berhasil (buat baru akan redirect).
  useEffect(() => {
    if (state === initial || state.errors.length) return;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [state, initial]);

  return (
    <form onSubmit={keepValues(action, startTransition)} className="space-y-4">
      {exam && <input type="hidden" name="id" value={exam.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul ujian" hint={<>Furigana: {"{漢字|かんじ}"}</>}>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        </Field>
        <Field label="Level / nama tes">
          <input name="level" value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls} />
        </Field>
      </div>
      {(title || level) && (
        <div className="rounded-md bg-brand-50 px-3 py-1 text-sm leading-[2.2]">
          Preview: <Ruby text={title} />　<Ruby text={level} />
        </div>
      )}
      <Field label="Deskripsi">
        <textarea name="description" defaultValue={exam?.description} rows={2} className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Durasi (menit)">
          <input
            name="durationMinutes"
            type="number"
            min={1}
            max={600}
            defaultValue={exam?.durationMinutes ?? 60}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Nilai lulus (0–100)">
          <input
            name="passingScore"
            type="number"
            min={0}
            max={100}
            defaultValue={exam?.passingScore ?? 70}
            required
            className={inputCls}
          />
        </Field>
      </div>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name="shuffleQuestions"
          defaultChecked={exam?.shuffleQuestions ?? true}
          className="mt-1 h-4 w-4 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-bold text-gray-700">Acak urutan soal untuk setiap peserta</span>
          <span className="block text-xs text-gray-500">
            Setiap peserta mendapat urutan berbeda. Urutannya tetap sama untuk peserta itu walaupun halaman di-refresh.
            Berlaku untuk peserta yang mulai setelah pengaturan ini disimpan.
          </span>
        </span>
      </label>
      <Errors errors={state.errors} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan…" : exam ? "Simpan perubahan" : "Buat ujian"}
        </button>
        {saved && !pending && (
          <span className="text-sm text-brand-700">✓ Tersimpan</span>
        )}
      </div>
    </form>
  );
}
