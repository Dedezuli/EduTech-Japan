import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser, listExams, listResults } from "@/lib/db";
import { ProgressView } from "@/components/ProgressView";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** Perkembangan satu peserta untuk trainer. */
export default async function UserProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();
  const [exams, results] = await Promise.all([listExams(), listResults({ userId: id })]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h1 className="mr-auto text-2xl font-bold">Perkembangan peserta</h1>
        <PrintButton />
        <Link href="/admin/progress" className="rounded border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50">
          Semua peserta
        </Link>
      </div>
      <ProgressView user={user} exams={exams.filter((e) => e.questions.length > 0)} results={results} />
    </>
  );
}
