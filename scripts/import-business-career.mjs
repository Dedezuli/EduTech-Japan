// Import paket latihan Business Career dari data/business-career/*.json ke database.
// Jalankan: node scripts/import-business-career.mjs [--replace]
// Tanpa --replace, paket yang id-nya sudah ada dilewati.
// Dengan --replace, isi soal diperbarui per nomor urut (id soal tetap sama),
// jadi percobaan, laporan, dan riwayat perkembangan peserta tidak hilang.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const replace = process.argv.includes("--replace");
const dir = join(process.cwd(), "data", "business-career");

const meta = (e) => ({
  title: e.title,
  level: e.level,
  description: e.description,
  durationMinutes: e.durationMinutes,
  passingScore: e.passingScore,
  shuffleQuestions: e.shuffleQuestions,
});
const qData = (q, i) => ({
  position: i,
  section: q.section,
  text: q.text,
  answer: q.answer,
  explanation: q.explanation ?? null,
});

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const exams = JSON.parse(readFileSync(join(dir, file), "utf8"));
  for (const e of exams) {
    const existing = await prisma.exam.findUnique({
      where: { id: e.id },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (existing && !replace) {
      console.log(`lewati ${e.id} (sudah ada)`);
      continue;
    }
    if (!existing) {
      await prisma.exam.create({
        data: {
          id: e.id,
          ...meta(e),
          questions: {
            create: e.questions.map((q, i) => ({
              ...qData(q, i),
              choices: { create: q.choices.map((c, j) => ({ key: c.key, position: j, text: c.text })) },
            })),
          },
        },
      });
      console.log(`import ${e.id}: ${e.questions.length} soal`);
      continue;
    }
    await prisma.$transaction(
      async (tx) => {
        await tx.exam.update({ where: { id: e.id }, data: meta(e) });
        for (const [i, q] of e.questions.entries()) {
          const row = existing.questions[i];
          if (row) {
            await tx.question.update({ where: { id: row.id }, data: qData(q, i) });
            for (const [j, c] of q.choices.entries()) {
              await tx.choice.upsert({
                where: { questionId_key: { questionId: row.id, key: c.key } },
                create: { questionId: row.id, key: c.key, position: j, text: c.text },
                update: { position: j, text: c.text },
              });
            }
          } else {
            await tx.question.create({
              data: {
                examId: e.id,
                ...qData(q, i),
                choices: { create: q.choices.map((c, j) => ({ key: c.key, position: j, text: c.text })) },
              },
            });
          }
        }
        const extra = existing.questions.slice(e.questions.length).map((r) => r.id);
        if (extra.length) await tx.question.deleteMany({ where: { id: { in: extra } } });
      },
      { timeout: 60_000 },
    );
    console.log(`perbarui ${e.id}: ${e.questions.length} soal`);
  }
}
await prisma.$disconnect();
