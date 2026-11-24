import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { CSV_COLUMNS } from "@/lib/csv";
import { CsvImport } from "@/components/admin/CsvImport";
import { Card, btnGhost } from "@/components/admin/ui";

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await getExam(id);
  if (!exam) notFound();

  return (
    <>
      <div>
        <Link href={`/admin/exams/${exam.id}`} className="text-sm text-gray-500 hover:underline">
          ← {stripRuby(exam.title)}
        </Link>
        <h1 className="text-2xl font-bold">Upload soal dari CSV</h1>
      </div>

      <Card>
        <CsvImport examId={exam.id} existingCount={exam.questions.length} />
      </Card>

      <Card title="Format CSV" actions={<a href="/admin/csv-template" className={btnGhost}>Download template</a>}>
        <div className="space-y-3 text-sm">
          <p>Baris pertama harus header berikut (urutan kolom bebas):</p>
          <code className="block overflow-x-auto rounded bg-gray-100 px-3 py-2">{CSV_COLUMNS.join(",")}</code>
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>
              <b>choice_a – choice_d</b> menjadi pilihan ア, イ, ウ, エ.
            </li>
            <li>
              <b>answer</b> boleh diisi ア/イ/ウ/エ, A/B/C/D, atau 1/2/3/4.
            </li>
            <li>
              <b>explanation</b> opsional.
            </li>
            <li>
              Furigana ditulis <code className="rounded bg-gray-100 px-1">{"{漢字|かんじ}"}</code>. Contoh:{" "}
              <code className="rounded bg-gray-100 px-1">{"{設備|せつび}の{目的|もくてき}"}</code>
            </li>
            <li>Teks yang berisi koma harus diapit tanda kutip ("..."). Excel dan Google Sheets melakukannya otomatis.</li>
            <li>Simpan dari Excel dengan format “CSV UTF-8” agar huruf Jepang tidak rusak.</li>
          </ul>
          <p className="text-gray-500">
            Tips: gunakan <b>Export CSV</b> di halaman ujian untuk mendapatkan contoh file berisi soal yang sudah ada.
          </p>
        </div>
      </Card>
    </>
  );
}
