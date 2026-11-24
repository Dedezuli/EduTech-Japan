"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importCsvQuestions } from "@/app/admin/actions";
import { csvToQuestions, type CsvRowResult } from "@/lib/csv";
import { stripRuby } from "@/lib/ruby";
import { Errors, btnGhost, btnPrimary } from "./ui";

export function CsvImport({ examId, existingCount }: { examId: string; existingCount: number }) {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvRowResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);

  const valid = rows.filter((r) => r.value);
  const invalid = rows.filter((r) => !r.value);

  async function loadFile(file: File) {
    setDone(null);
    setFileName(file.name);
    const text = await file.text();
    const res = csvToQuestions(text);
    setErrors(res.headerErrors);
    setRows(res.rows);
  }

  function submit() {
    if (mode === "replace" && !window.confirm(`Ganti semua ${existingCount} soal yang ada dengan ${valid.length} soal dari CSV?`))
      return;
    start(async () => {
      const res = await importCsvQuestions(
        examId,
        valid.map((r) => r.value!),
        mode,
      );
      if (res.ok) {
        setDone(res.count ?? 0);
        setRows([]);
        setFileName("");
        router.refresh();
      } else setErrors(res.errors);
    });
  }

  return (
    <div className="space-y-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) loadFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
          dragging ? "border-brand-600 bg-brand-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadFile(f);
            e.target.value = "";
          }}
        />
        <span className="text-base font-bold">{fileName || "Pilih file CSV atau tarik ke sini"}</span>
        <span className="mt-1 text-sm text-gray-500">Encoding UTF-8. Pemisah koma (,) atau titik koma (;).</span>
      </label>

      {done !== null && (
        <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          ✓ {done} soal berhasil diimport.{" "}
          <a href={`/admin/exams/${examId}`} className="font-bold underline">
            Lihat daftar soal
          </a>
        </div>
      )}

      <Errors errors={errors} />

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded bg-brand-50 px-2 py-1 text-brand-800">{valid.length} soal valid</span>
            {invalid.length > 0 && (
              <span className="rounded bg-red-50 px-2 py-1 text-red-700">{invalid.length} baris bermasalah (dilewati)</span>
            )}
          </div>

          <div className="max-h-[420px] overflow-auto rounded-md border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Baris</th>
                  <th className="px-3 py-2 font-medium">Soal</th>
                  <th className="px-3 py-2 font-medium">Jawaban</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={`border-t border-gray-100 ${r.value ? "" : "bg-red-50/60"}`}>
                    <td className="px-3 py-2 tabular-nums text-gray-500">{r.line}</td>
                    <td className="px-3 py-2">
                      {r.value ? (
                        <>
                          <div className="text-xs text-gray-500">{stripRuby(r.value.section)}</div>
                          <div className="line-clamp-2">{stripRuby(r.value.text)}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold">{r.value?.answer ?? ""}</td>
                    <td className="px-3 py-2">
                      {r.value ? (
                        <span className="text-brand-700">OK</span>
                      ) : (
                        <span className="text-red-700">{r.errors.join("; ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <fieldset className="space-y-1 text-sm">
            <legend className="mb-1 font-bold text-gray-700">Cara import</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "append"} onChange={() => setMode("append")} className="accent-brand-600" />
              Tambahkan ke {existingCount} soal yang sudah ada
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} className="accent-brand-600" />
              Ganti semua soal yang ada
            </label>
          </fieldset>

          <div className="flex gap-2">
            <button onClick={submit} disabled={pending || valid.length === 0} className={btnPrimary}>
              {pending ? "Mengimport…" : `Import ${valid.length} soal`}
            </button>
            <button
              onClick={() => {
                setRows([]);
                setFileName("");
                setErrors([]);
              }}
              className={btnGhost}
            >
              Batal
            </button>
          </div>
        </>
      )}
    </div>
  );
}
