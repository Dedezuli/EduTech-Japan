import { notFound, redirect } from "next/navigation";
import { getAttempt, getExam, getResultForAttempt } from "@/lib/db";
import { topicStats } from "@/lib/report";
import { requireUser } from "@/lib/userAuth";
import { ResultView } from "@/components/ResultView";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/exam/${id}/result`);
  const exam = await getExam(id);
  if (!exam) notFound();
  const attempt = await getAttempt(user.id, exam.id);
  if (!attempt?.submittedAt) redirect(`/exam/${exam.id}`);
  const result = await getResultForAttempt(attempt.id);
  return (
    <ResultView
      exam={exam}
      attempt={attempt}
      userName={user.name}
      reportHref={result ? `/report/${result.id}` : undefined}
      topics={result ? topicStats(result.detail) : undefined}
    />
  );
}
