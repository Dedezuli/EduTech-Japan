import { notFound } from "next/navigation";
import { getExam } from "@/lib/db";
import { requireUser } from "@/lib/userAuth";
import { PracticeRunner } from "@/components/PracticeRunner";

export const dynamic = "force-dynamic";

/** Mode latihan: kunci & pembahasan dikirim ke browser karena langsung ditampilkan setelah menjawab. */
export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/practice/${id}`);
  const exam = await getExam(id);
  if (!exam || exam.questions.length === 0) notFound();
  return <PracticeRunner exam={exam} userName={user.name} />;
}
