import { questionsToCSV } from "@/lib/csv";

/** Template CSV berisi 2 contoh soal. */
export function GET() {
  const csv = questionsToCSV([
    {
      section: "{品質|ひんしつ}{管理|かんり}",
      text: "{問題|もんだい}1：PDCAサイクルの「D」が{表|あらわ}すものはどれか。",
      choices: [
        { key: "ア", text: "{計画|けいかく}" },
        { key: "イ", text: "{実行|じっこう}" },
        { key: "ウ", text: "{評価|ひょうか}" },
        { key: "エ", text: "{改善|かいぜん}" },
      ],
      answer: "イ",
      explanation: "Dは Do（{実行|じっこう}）を{表|あらわ}す。",
    },
    {
      section: "{安全|あんぜん}{衛生|えいせい}",
      text: "{問題|もんだい}2：５Sに{含|ふく}まれないものはどれか。",
      choices: [
        { key: "ア", text: "{整理|せいり}" },
        { key: "イ", text: "{整頓|せいとん}" },
        { key: "ウ", text: "{清掃|せいそう}" },
        { key: "エ", text: "{節約|せつやく}" },
      ],
      answer: "エ",
      explanation: "",
    },
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-soal.csv"',
    },
  });
}
