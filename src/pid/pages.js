export const MAX_PAGES = 3;

// "3", "3,5" or "2-4" → sorted page numbers within the document.
export function parsePageSpec(spec, pageCount) {
  const pages = new Set();
  for (const part of spec.split(",").map((piece) => piece.trim()).filter(Boolean)) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) return { pages: [], error: `"${part}" is not a page number or range.` };
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start) return { pages: [], error: `"${part}" is not a valid range.` };
    if (end > pageCount) return { pages: [], error: `This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.` };
    for (let page = start; page <= end; page++) pages.add(page);
  }
  if (pages.size === 0) return { pages: [], error: "Enter the page to import." };
  if (pages.size > MAX_PAGES) return { pages: [], error: `Import at most ${MAX_PAGES} pages at a time.` };
  return { pages: [...pages].sort((a, b) => a - b), error: "" };
}
