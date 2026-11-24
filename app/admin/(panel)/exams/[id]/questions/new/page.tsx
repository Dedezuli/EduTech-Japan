import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { Card } from "@/components/admin/ui";

export default async function NewQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const exam = await getExam(id);
  if (!exam) notFound();
  const number = exam.questions.length + 1;
  const sections = [...new Set(exam.questions.map((q) => q.section))];

  return (
    <>
      <div>
        <Link href={`/admin/exams/${exam.id}`} className="text-sm text-gray-500 hover:underline">
          ← {stripRuby(exam.title)}
        </Link>
        <h1 className="text-2xl font-bold">Tambah soal #{number}</h1>
      </div>
      {saved && (
        <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          ✓ Soal sebelumnya tersimpan. Silakan isi soal berikutnya.
        </div>
      )}
      <Card>
        {/* key memastikan form kosong lagi setelah "Simpan & tambah lagi" */}
        <QuestionForm key={number} examId={exam.id} number={number} sections={sections} />
      </Card>
    </>
  );
}
