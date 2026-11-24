/** Lowercase + strip Vietnamese diacritics (incl. đ) so "lich" matches "Lịch". */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * cmdk filter: every query word must appear in the folded item value (+ keywords).
 * Returns a rank in (0, 1]; earlier matches score higher.
 */
export function foldedFilter(value: string, search: string, keywords?: string[]): number {
  const hay = foldText([value, ...(keywords ?? [])].join(" "));
  const words = foldText(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  let score = 0;
  for (const w of words) {
    const idx = hay.indexOf(w);
    if (idx < 0) return 0;
    score += 1 / (1 + idx / 20);
  }
  return Math.min(1, score / words.length);
}
