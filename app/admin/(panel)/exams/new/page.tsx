import Link from "next/link";
import { ExamForm } from "@/components/admin/ExamForm";
import { Card } from "@/components/admin/ui";

export default function NewExamPage() {
  return (
    <>
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          ← Daftar ujian
        </Link>
        <h1 className="text-2xl font-bold">Ujian baru</h1>
      </div>
      <Card>
        <ExamForm />
      </Card>
    </>
  );
}
