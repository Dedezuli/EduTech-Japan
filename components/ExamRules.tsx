/** Ketentuan ujian yang ditampilkan di halaman login (Jepang + terjemahan Indonesia). */
export const EXAM_RULES: { ja: string; id: string }[] = [
  {
    ja: "試験時間は開始ボタンを押した時点から計測されます。",
    id: "Waktu ujian mulai dihitung saat tombol 開始する (Mulai) ditekan.",
  },
  {
    ja: "ページの再読み込み、ブラウザを閉じる、通信が切れた場合でも、時間は止まりません。",
    id: "Waktu tetap berjalan walaupun halaman di-refresh, browser ditutup, atau koneksi terputus.",
  },
  {
    ja: "回答は選択するたびに自動保存されます。再度ログインすると、続きから受験できます（時間内のみ）。",
    id: "Jawaban tersimpan otomatis setiap kali dipilih. Login kembali untuk melanjutkan (selama waktu masih ada).",
  },
  {
    ja: "試験時間が終了すると、回答は自動的に提出され、変更できなくなります。",
    id: "Saat waktu habis, jawaban otomatis dikumpulkan dan tidak bisa diubah lagi.",
  },
  {
    ja: "「終了」ボタンを押して提出した後は、回答を変更できません。",
    id: "Setelah menekan 終了 (Selesai) dan mengumpulkan, jawaban tidak bisa diubah.",
  },
  {
    ja: "各試験の受験は1回のみです。",
    id: "Setiap ujian hanya bisa dikerjakan satu kali.",
  },
  {
    ja: "問題文のコピー、貼り付け、右クリック、印刷はできません。",
    id: "Soal tidak bisa di-copy, paste, klik kanan, atau dicetak.",
  },
  {
    ja: "ログイン情報を他人と共有しないでください。",
    id: "Jangan bagikan username dan password kepada orang lain.",
  },
];

export function ExamRules() {
  return (
    <section aria-labelledby="rules-title" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <h2 id="rules-title" className="border-b border-gray-200 px-5 py-3 font-bold">
        受験上の注意 <span className="font-normal text-gray-500">· Ketentuan ujian</span>
      </h2>
      <ol className="space-y-3 px-5 py-4">
        {EXAM_RULES.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div>
              <div className="text-[15px] leading-relaxed">{r.ja}</div>
              <div className="text-sm text-gray-500">{r.id}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
