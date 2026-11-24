import { splitExplanation } from "@/lib/ruby";
import { Ruby } from "./Ruby";

/** Pembahasan dua bahasa: Jepang (dengan furigana) dan Indonesia. */
export function Explanation({ text, className = "" }: { text?: string | null; className?: string }) {
  const { ja, id } = splitExplanation(text);
  if (!ja && !id) return null;
  return (
    <div className={`space-y-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-[15px] ${className}`}>
      {ja && (
        <div className="leading-[2.3] whitespace-pre-line">
          <span className="mr-1 rounded bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">
            <ruby>
              解説<rp>(</rp>
              <rt>かいせつ</rt>
              <rp>)</rp>
            </ruby>
          </span>
          <Ruby text={ja} />
        </div>
      )}
      {id && (
        <div className="border-t border-brand-200 pt-2 leading-[2.3] whitespace-pre-line text-gray-800">
          <span className="mr-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs font-bold text-white">Pembahasan</span>
          <Ruby text={id} />
        </div>
      )}
    </div>
  );
}
