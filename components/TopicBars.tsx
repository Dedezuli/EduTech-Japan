import { masteryLabel, type TopicStat } from "@/lib/report";
import { Ruby } from "./Ruby";

const TONE = {
  good: { bar: "bg-brand-600", text: "text-brand-700" },
  mid: { bar: "bg-accent-400", text: "text-amber-700" },
  low: { bar: "bg-red-500", text: "text-red-600" },
} as const;

/** Persentase penguasaan per materi, dalam bentuk batang. */
export function TopicBars({ stats }: { stats: TopicStat[] }) {
  if (!stats.length) return null;
  return (
    <ul className="space-y-3">
      {stats.map((s) => {
        const m = masteryLabel(s.pct);
        const tone = TONE[m.tone];
        return (
          <li key={s.topic} className="break-inside-avoid">
            <div className="flex items-end justify-between gap-2 text-sm">
              <span className="leading-[2.1] font-medium">
                <Ruby text={s.topic} />
              </span>
              <span className={`shrink-0 tabular-nums font-bold ${tone.text}`}>
                {s.pct}%<span className="ml-1 text-xs font-normal text-gray-500">({s.correct}/{s.total})</span>
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-200 print:border print:border-gray-400">
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${s.pct}%` }} />
            </div>
            <div className={`mt-0.5 text-xs ${tone.text}`}>
              {m.ja} · {m.id}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
