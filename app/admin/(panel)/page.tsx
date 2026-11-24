import Link from "next/link";
import { listExams } from "@/lib/db";
import { stripRuby } from "@/lib/ruby";
import { Card, btnPrimary } from "@/components/admin/ui";

export default async function AdminHome() {
  const exams = await listExams();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Daftar Ujian</h1>
        <Link href="/admin/exams/new" className={btnPrimary}>
          + Ujian baru
        </Link>
      </div>
      <Card>
        {exams.length === 0 ? (
          <p className="text-gray-500">Belum ada ujian. Klik “Ujian baru” untuk membuat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Judul</th>
                  <th className="py-2 pr-4 font-medium">Level</th>
                  <th className="py-2 pr-4 text-right font-medium">Soal</th>
                  <th className="py-2 pr-4 text-right font-medium">Durasi</th>
                  <th className="py-2 text-right font-medium">Lulus</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/exams/${e.id}`} className="font-bold text-brand-700 hover:underline">
                        {stripRuby(e.title)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{stripRuby(e.level)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{e.questions.length}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{e.durationMinutes} mnt</td>
                    <td className="py-3 text-right tabular-nums">{e.passingScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
