import { getExam } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { questionsToCSV } from "@/lib/csv";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const exam = await getExam(id);
  if (!exam) return new Response("Not found", { status: 404 });
  return new Response(questionsToCSV(exam.questions), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="soal-${exam.id}.csv"`,
    },
  });
}
