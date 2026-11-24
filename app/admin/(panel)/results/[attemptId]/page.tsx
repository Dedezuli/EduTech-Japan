import { notFound } from "next/navigation";
import { getAttemptById, getExam } from "@/lib/db";
import { ResultView } from "@/components/ResultView";

export const dynamic = "force-dynamic";

/** Detail jawaban satu peserta (tampilan sama seperti yang dilihat peserta). */
export default async function AttemptDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const attempt = await getAttemptById(attemptId);
  if (!attempt?.submittedAt) notFound();
  const exam = await getExam(attempt.examId);
  if (!exam) notFound();
  return (
    <div className="-mx-4 -my-4 overflow-hidden rounded-lg sm:-mx-6 sm:-my-6">
      <ResultView
        exam={exam}
        attempt={attempt}
        userName={`${attempt.user.name} (${attempt.user.username})`}
        backHref="/admin/results"
        backLabel="Kembali ke daftar hasil"
      />
    </div>
  );
}
