import { notFound } from "next/navigation";
import { getAttemptById, getExam, getResultForAttempt } from "@/lib/db";
import { topicStats } from "@/lib/report";
import { ResultView } from "@/components/ResultView";

export const dynamic = "force-dynamic";

/** Detail jawaban satu peserta (tampilan sama seperti yang dilihat peserta). */
export default async function AttemptDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const attempt = await getAttemptById(attemptId);
  if (!attempt?.submittedAt) notFound();
  const exam = await getExam(attempt.examId);
  if (!exam) notFound();
  const result = await getResultForAttempt(attempt.id);
  return (
    <div className="-mx-4 -my-4 overflow-hidden rounded-lg sm:-mx-6 sm:-my-6">
      <ResultView
        exam={exam}
        attempt={attempt}
        userName={`${attempt.user.name} (${attempt.user.username})`}
        backHref="/admin/results"
        backLabel="Kembali ke daftar hasil"
        reportHref={result ? `/report/${result.id}` : undefined}
        topics={result ? topicStats(result.detail) : undefined}
      />
    </div>
  );
}
