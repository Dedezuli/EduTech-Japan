import Link from "next/link";
import { listExams, listResults } from "@/lib/db";
import { requireUser } from "@/lib/userAuth";
import { ProgressView } from "@/components/ProgressView";

export const dynamic = "force-dynamic";

/** Perkembangan peserta sendiri. */
export default async function MyProgressPage() {
  const user = await requireUser("/progress");
  const [exams, results] = await Promise.all([listExams(), listResults({ userId: user.id })]);
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center bg-black px-4 py-3 text-white">
        <span className="text-lg font-bold">
          <ruby>
            学習状況<rt>がくしゅうじょうきょう</rt>
          </ruby>{" "}
          · Perkembangan saya
        </span>
        <Link href="/" className="ml-auto rounded border border-gray-500 px-3 py-1 text-sm text-gray-200 hover:bg-white/10">
          トップへ
        </Link>
      </header>
      <div className="h-1.5 bg-brand-600" />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <ProgressView user={user} exams={exams.filter((e) => e.questions.length > 0)} results={results} />
      </main>
    </div>
  );
}
