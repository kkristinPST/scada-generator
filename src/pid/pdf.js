// PDF access for P&ID import: page count, thumbnails, high-resolution page
// renders and the text layer. Loaded on demand, like the rest of src/pid.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(file) {
  try {
    return await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (error) {
    if (error?.name === "PasswordException") throw new Error("This PDF needs a password to open. Export the sheet without a password and try again.");
    throw new Error(`This PDF could not be opened (${error?.message ?? error}).`);
  }
}

// Render one page onto a canvas whose longest edge is at most maxEdge pixels.
export async function renderPage(pdf, pageNumber, maxEdge) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: maxEdge / Math.max(base.width, base.height) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  page.cleanup();
  return canvas;
}

// Text that exists as real text in the PDF, with its position as a percentage of the sheet.
// Drawings exported with outlined (SHX) fonts have little or none; the rendered images cover those.
export async function pageText(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items = [];
  for (const item of content.items) {
    const text = item.str?.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    items.push({ text, x: Math.round((x / viewport.width) * 100), y: Math.round((y / viewport.height) * 100) });
  }
  return items;
}
