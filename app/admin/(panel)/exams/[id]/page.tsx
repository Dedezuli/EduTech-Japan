import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { ExamForm } from "@/components/admin/ExamForm";
import { Card, btnDanger, btnGhost, btnPrimary } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { moveQuestion, removeExam, removeQuestion } from "../../../actions";

export default async function ExamAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await getExam(id);
  if (!exam) notFound();
  const n = exam.questions.length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-gray-500 hover:underline">
            ← Daftar ujian
          </Link>
          <h1 className="text-2xl font-bold">{stripRuby(exam.title)}</h1>
        </div>
        <Link href={`/admin/exams/${exam.id}/results`} className={btnPrimary}>
          Lihat hasil peserta
        </Link>
      </div>

      <Card title="Pengaturan ujian">
        <ExamForm exam={exam} />
      </Card>

      <Card
        title={`Soal (${n})`}
        actions={
          <>
            <a href={`/admin/exams/${exam.id}/export`} className={btnGhost}>
              Export CSV
            </a>
            <Link href={`/admin/exams/${exam.id}/import`} className={btnGhost}>
              Upload CSV
            </Link>
            <Link href={`/admin/exams/${exam.id}/questions/new`} className={btnPrimary}>
              + Tambah soal
            </Link>
          </>
        }
      >
        {n === 0 ? (
          <p className="text-gray-500">Belum ada soal. Tambahkan satu per satu atau upload CSV.</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {exam.questions.map((q, i) => (
              <li key={q.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">{stripRuby(q.section)}</div>
                  <Link
                    href={`/admin/exams/${exam.id}/questions/${q.id}`}
                    className="line-clamp-2 font-medium hover:text-brand-700 hover:underline"
                  >
                    {stripRuby(q.text)}
                  </Link>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Jawaban: <b className="text-brand-700">{q.answer}</b> ·{" "}
                    {stripRuby(q.choices.find((c) => c.key === q.answer)?.text ?? "")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={moveQuestion}>
                    <input type="hidden" name="examId" value={exam.id} />
                    <input type="hidden" name="qid" value={q.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} aria-label="Naikkan" className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                      ↑
                    </button>
                  </form>
                  <form action={moveQuestion}>
                    <input type="hidden" name="examId" value={exam.id} />
                    <input type="hidden" name="qid" value={q.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button disabled={i === n - 1} aria-label="Turunkan" className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                      ↓
                    </button>
                  </form>
                  <Link
                    href={`/admin/exams/${exam.id}/questions/${q.id}`}
                    className="rounded px-2 py-1 text-sm text-brand-700 hover:bg-brand-50"
                  >
                    Edit
                  </Link>
                  <form action={removeQuestion}>
                    <input type="hidden" name="examId" value={exam.id} />
                    <input type="hidden" name="qid" value={q.id} />
                    <ConfirmButton message={`Hapus soal nomor ${i + 1}?`} className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50">
                      Hapus
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Zona berbahaya">
        <form action={removeExam} className="flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="id" value={exam.id} />
          <p className="text-sm text-gray-600">Menghapus ujian beserta semua soalnya. Tidak bisa dibatalkan.</p>
          <ConfirmButton message="Hapus ujian ini beserta semua soalnya?" className={btnDanger}>
            Hapus ujian
          </ConfirmButton>
        </form>
      </Card>
    </>
  );
}
