import { notFound, redirect } from "next/navigation";
import { getAttempt, getExam } from "@/lib/db";
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
  return <ResultView exam={exam} attempt={attempt} userName={user.name} />;
}
