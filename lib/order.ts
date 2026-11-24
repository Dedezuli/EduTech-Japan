/**
 * Urutkan soal sesuai urutan milik peserta. Soal yang ditambahkan admin setelah peserta mulai
 * (tidak ada di urutan) ditaruh di akhir; soal yang sudah dihapus diabaikan.
 */
export function orderQuestions<T extends { id: string }>(questions: T[], order: string[]): T[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const result: T[] = [];
  for (const id of order) {
    const q = byId.get(id);
    if (q && !seen.has(id)) {
      result.push(q);
      seen.add(id);
    }
  }
  for (const q of questions) if (!seen.has(q.id)) result.push(q);
  return result;
}
