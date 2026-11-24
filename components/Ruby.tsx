import { parseRuby } from "@/lib/ruby";

/** Render teks berformat {漢字|かんじ} sebagai <ruby>. */
export function Ruby({ text }: { text: string }) {
  return (
    <>
      {parseRuby(text).map((seg, i) =>
        seg.ruby ? (
          <ruby key={i}>
            {seg.base}
            <rp>(</rp>
            <rt>{seg.ruby}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span key={i}>{seg.base}</span>
        ),
      )}
    </>
  );
}
