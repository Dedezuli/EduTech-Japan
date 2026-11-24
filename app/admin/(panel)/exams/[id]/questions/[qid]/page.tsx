import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { Card } from "@/components/admin/ui";

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string; qid: string }> }) {
  const { id, qid } = await params;
  const exam = await getExam(id);
  const index = exam?.questions.findIndex((q) => q.id === qid) ?? -1;
  if (!exam || index < 0) notFound();
  const sections = [...new Set(exam.questions.map((q) => q.section))];

  return (
    <>
      <div>
        <Link href={`/admin/exams/${exam.id}`} className="text-sm text-gray-500 hover:underline">
          ← {stripRuby(exam.title)}
        </Link>
        <h1 className="text-2xl font-bold">Edit soal #{index + 1}</h1>
      </div>
      <Card>
        <QuestionForm examId={exam.id} question={exam.questions[index]} number={index + 1} sections={sections} />
      </Card>
    </>
  );
}
