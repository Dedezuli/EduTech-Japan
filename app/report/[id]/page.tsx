import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getExam, getResult, getUser } from "@/lib/db";
import { currentUser } from "@/lib/userAuth";
import { isAdmin } from "@/lib/auth";
import { ResultReport } from "@/components/ResultReport";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** Laporan hasil (latihan / simulasi). Bisa dibuka peserta pemiliknya atau admin/trainer. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [admin, me] = await Promise.all([isAdmin(), currentUser()]);
  if (!admin && !me) redirect(`/login?next=/report/${id}`);
  const result = await getResult(id);
  if (!result || (!admin && result.userId !== me?.id)) notFound();
  const [exam, user] = await Promise.all([getExam(result.examId), getUser(result.userId)]);
  if (!exam || !user) notFound();
  const back = admin && result.userId !== me?.id ? `/admin/users/${user.id}/progress` : "/";
  return (
    <ResultReport
      exam={exam}
      result={result}
      user={user}
      actions={
        <>
          <PrintButton />
          <Link href={back} className="rounded border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100">
            {back === "/" ? "トップへ戻る" : "Perkembangan peserta"}
          </Link>
          <span className="self-center text-xs text-gray-500">
            Pilih &quot;Simpan sebagai PDF&quot; di dialog cetak untuk mengirim ke trainer.
          </span>
        </>
      }
    />
  );
}
