export type RubySegment = { base: string; ruby?: string };

/** Mengubah "{設備|せつび}を{利用|りよう}する" menjadi segmen untuk <ruby>. */
export function parseRuby(input: string): RubySegment[] {
  const segments: RubySegment[] = [];
  const re = /\{([^|{}]+)\|([^{}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) segments.push({ base: input.slice(last, m.index) });
    segments.push({ base: m[1], ruby: m[2] });
    last = re.lastIndex;
  }
  if (last < input.length) segments.push({ base: input.slice(last) });
  return segments;
}

/** Teks polos tanpa furigana (untuk aria-label, judul, dll). */
export function stripRuby(input: string): string {
  return input.replace(/\{([^|{}]+)\|[^{}]+\}/g, "$1");
}

/** Hapus nomor manual di awal teks soal, mis. "{問題|もんだい}１：" atau "問題12:", karena nomor dibuat otomatis. */
export function stripQuestionNumber(text: string): string {
  return text.replace(/^\s*(\{問題\|[^}]*\}|問題)\s*[0-9０-９]+\s*[：:．.]\s*/, "");
}
