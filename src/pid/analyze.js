import Anthropic from "@anthropic-ai/sdk";
import { ELEMENTS, FLUIDS } from "../scada/catalog";
import { PID_LEGEND } from "./legend";
import { MODEL_ID as MODEL } from "./model";
import { openPdf, pageText, renderPage } from "./pdf";


// API limits: 32 MB per request, 5 MB per image.
const MAX_REQUEST_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Large drawings go as one overview of the sheet plus zoomed quadrants, so small tags stay legible.
const SHEET_RENDER_EDGE = 5200;
const OVERVIEW_EDGE = 2000;
const DETAIL_EDGE = 2600;
const TILE_OVERLAP = 0.08;
const TEXT_LIMIT = 25000;

// Types the model may choose. Annotation-only elements are added by the layout step.
const SYMBOL_TYPES = ELEMENTS.filter((element) => !element.annotation).map((element) => element.type);

const TYPE_GUIDE = `
## SCADA symbol types you can use
- pump: any pump (centrifugal, diaphragm, hose, fish pump, booster pump). Its drive motor is part of the pump; do not add a separate motor.
- fan: blowers, ventilators, compressors, CO2 degasser fans, air supply.
- motor: a motor that drives something not otherwise shown (agitator, mixer, feeder, screw, chain). Never for pump motors.
- oxygen: oxygen supply unit (LOX, oxygen generator, oxygen booster, oxygen main valve cabinet, emergency oxygen supply).
- valve: an automatic or remotely operated valve (MV, PV, SV, RV, frequency-controlled MV).
- tank: fish tanks, buffer and storage tanks, sludge tanks, CIP tanks, catastrophe tanks, general vessels and closed containers.
- sump: sumps and open basins (pump sump, AOT sump, fish barrier sump, open containers, channels used as sumps).
- cone: oxygen cone.
- bio: MBBR, FBBR, biofilter.
- drum: drum filter, polishing filter, mechanical filters and sieves at equipment scale.
- uv: UV unit or UV in channel.
- hx: heat exchanger, heat pump, chiller exchanger.
- cabinet: blower cabinet, MBBR blower cabinet, equipment housed in a cabinet that the operator treats as one unit.
- dosing: chemical dosing, pH control, ozone or chemical injection with its own pump or tank.
- readout: a transmitter or analyser value the operator monitors (level, temperature, pressure, flow, O2, CO2, pH, ORP, turbidity, conductivity, weight, speed). Set attached_to to the element it measures.
- offpage: an off-page connector, where a line leaves the drawing. Its name is where the line goes.
- custom: important equipment with no better match (CO2 degasser, protein skimmer, foam separator, AOT unit, ozone reaction chamber, plate separator, feeding system, sorting machine). Name it clearly.
`;

const SYSTEM_PROMPT = `You convert engineering P&IDs (piping and instrumentation diagrams), mainly for recirculating aquaculture systems (RAS) and related water treatment, into the content of a simplified SCADA/HMI process overview. Operators will use the screen to monitor and control the plant. You are designing an operator overview, not tracing or copying the drawing.

Work in this order:
1. Understand the process first. Identify the process stages and their sequence, the main flow (for example fish tanks, mechanical filtration, pump sump, pumps, biofilter, degassing, oxygenation, UV, back to the fish tanks), the side streams (make-up water, sludge, chemicals, oxygen, air) and how the equipment interacts.
2. Decide what an operator needs to see. Keep the main process equipment, the automatic valves an operator commands or watches change state, and the key transmitters and analysers they monitor. Leave out manual hand valves (HV), check and safety valves, fittings, reducers, flanges, couplings, hoses, sight glasses, drip catchers, funnels, vents, drains, sample points, local indicators and gauges, switches and alarm-only devices, valve position switches, insulation and tracing, tie-in marks, scope and vendor limits, revision clouds, notes, dimensions, line numbers, the title block and the legend. Report what you left out in "omitted", grouped by kind with a count, not item by item.
3. Map each kept item to one SCADA symbol type.
4. Reconstruct the connections between the kept items.

Do not drop important equipment or change the process logic to make the screen cleaner. A drawing with dozens of instruments and manual valves should become a readable overview with the equipment, the valves that matter and the measurements that matter.

Consolidation
- Keep units that operators run individually as separate elements, such as duty and standby pumps, blowers and filters.
- A bank of more than six identical passive units in parallel, such as fish tanks or channels, may become one element named for the bank, for example "Fish tanks T01-T12 (12)". Record every consolidation in "issues".
- Collapse pipe segments, headers, manifolds and tees. Connect equipment to equipment directly, passing through a kept valve when the valve sits on that line.
- When a line leaves the drawing (off-page connector, "to"/"from" reference, drawing number, tie-in), add an "offpage" element with role "offpage" whose name says where it goes, for example "To fish tanks (070401)", and connect to it.

Connections
- Add a connection only when you can trace it on the drawing through piping, possibly through omitted fittings, hand valves or manifolds. Never add a connection from process knowledge alone. If typical process logic suggests a link you cannot trace, do not add it; describe it in "issues".
- "from" is upstream and "to" is downstream, judged from flow arrows, pump orientation or gravity flow. If you cannot tell the direction, add the connection with confidence "low" and say why in "evidence".
- Instruments are never connected. Use attached_to instead.
- Choose the fluid from the line colour, dash pattern or medie code: water lines (fresh, sea, brackish, treated, oxygenated, reject, fish transport, manifold) are "proc"; untreated intake water is "raw"; sludge and dead fish are "sludge"; drainage is "drain"; chemicals are "chem"; air, compressed air and ozone are "gas"; oxygen and liquid oxygen are "o2"; glycol and cooling medium are "glycol"; brine is "brine"; feed is "feed". Use "" when unsure.

Elements
- Copy tags exactly as written, for example "DPT07-FIL02-PU01" or "FIL02-LT01". If no tag is readable, leave tag empty and give a short descriptive name. Never invent a tag.
- name is a short operator-friendly description, for example "Recirculation pump 1".
- role is one of: "equipment", "valve", "instrument", "offpage".
- source describes the symbol as drawn, for example "centrifugal pump with frequency-controlled motor".
- unit is the engineering unit for readouts (level m or %, temperature °C, pressure bar, flow m³/h, O2 mg/L or %, CO2 mg/L, pH, conductivity mS/cm, weight kg, speed Hz). Use "" for other elements.
- attached_to is the id of the element a readout measures, or "" when it measures a line or nothing kept. It is always "" for non-readouts.
- confidence: "high" when symbol and tag are read clearly, "medium" when partly unreadable or the mapping is approximate, "low" when it is a guess. Explain medium and low in note or issues.
- ids are short and unique, such as "el1", "el2".

Stages
- Usually 3 to 8 stages, named the way an operator would name them ("Fish tanks", "Drum filtration", "Pump sump", "Biofilter", "Degassing", "Oxygenation", "UV", "Sludge handling"). order starts at 1 and follows the main flow; side systems come after. Every element's stage_id must be one of the stage ids.

process_summary: two to four plain sentences describing the process as you understood it, including anything about the drawing you could not read.
${TYPE_GUIDE}
${PID_LEGEND}`;

const str = { type: "string" };
const confidence = { type: "string", enum: ["high", "medium", "low"] };
const object = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties
});

export const ANALYSIS_SCHEMA = object({
  process_summary: str,
  stages: { type: "array", items: object({ id: str, name: str, order: { type: "integer" } }) },
  elements: {
    type: "array",
    items: object({
      id: str,
      tag: str,
      name: str,
      type: { type: "string", enum: SYMBOL_TYPES },
      role: { type: "string", enum: ["equipment", "valve", "instrument", "offpage"] },
      stage_id: str,
      attached_to: str,
      unit: str,
      source: str,
      confidence,
      note: str
    })
  },
  connections: {
    type: "array",
    items: object({
      from: str,
      to: str,
      fluid: { type: "string", enum: FLUIDS.map((fluid) => fluid.key) },
      confidence,
      evidence: str
    })
  },
  omitted: { type: "array", items: object({ what: str, count: { type: "integer" }, reason: str }) },
  issues: { type: "array", items: object({ element_id: str, message: str }) }
});

const readAsBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export class AnalysisError extends Error {}

// Copy a region of the source into an image block no larger than maxEdge, encoded under the API image limit.
async function imageBlock(source, region, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(region.width, region.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(region.width * scale));
  canvas.height = Math.max(1, Math.round(region.height * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToBlob(canvas, "image/png");
  let mediaType = "image/png";
  for (const quality of [0.92, 0.85, 0.75, 0.6]) {
    if (blob.size <= MAX_IMAGE_BYTES) break;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    mediaType = "image/jpeg";
  }
  if (blob.size > MAX_IMAGE_BYTES) throw new AnalysisError("The drawing is too detailed to send even after compression. Try a lower-resolution export.");
  return { type: "image", source: { type: "base64", media_type: mediaType, data: await readAsBase64(blob) } };
}

const percent = (value, total) => Math.round((value / total) * 100);

// One sheet as content blocks: the whole sheet, then 2×2 overlapping detail quadrants when it is large.
async function sheetBlocks(source, width, height, sheetName) {
  const blocks = [
    { type: "text", text: `${sheetName}: overview of the whole sheet.` },
    await imageBlock(source, { x: 0, y: 0, width, height }, OVERVIEW_EDGE)
  ];
  if (Math.max(width, height) <= DETAIL_EDGE) return blocks;

  const names = [["top-left", "top-right"], ["bottom-left", "bottom-right"]];
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 2; column++) {
      const x = Math.max(0, Math.round(width * (column * 0.5 - TILE_OVERLAP)));
      const y = Math.max(0, Math.round(height * (row * 0.5 - TILE_OVERLAP)));
      const right = Math.min(width, Math.round(width * ((column + 1) * 0.5 + TILE_OVERLAP)));
      const bottom = Math.min(height, Math.round(height * ((row + 1) * 0.5 + TILE_OVERLAP)));
      blocks.push({
        type: "text",
        text: `${sheetName}: ${names[row][column]} detail, x ${percent(x, width)}–${percent(right, width)}%, y ${percent(y, height)}–${percent(bottom, height)}% of the sheet.`
      });
      blocks.push(await imageBlock(source, { x, y, width: right - x, height: bottom - y }, DETAIL_EDGE));
    }
  }
  return blocks;
}

async function preparePdf(file, pages) {
  const pdf = await openPdf(file);
  try {
    const selected = pages?.length ? pages : [1];
    const blocks = [];
    for (const pageNumber of selected) {
      if (pageNumber > pdf.numPages) throw new AnalysisError(`This PDF has only ${pdf.numPages} pages.`);
      const sheetName = `Page ${pageNumber}`;
      const canvas = await renderPage(pdf, pageNumber, SHEET_RENDER_EDGE);
      blocks.push(...(await sheetBlocks(canvas, canvas.width, canvas.height, sheetName)));
      canvas.width = canvas.height = 0;

      const text = (await pageText(pdf, pageNumber))
        .map((item) => `${item.text} @${item.x},${item.y}`)
        .join("\n")
        .slice(0, TEXT_LIMIT);
      if (text) {
        blocks.push({
          type: "text",
          text: `${sheetName}: text layer of the PDF, one item per line as "text @x%,y%" measured from the top-left corner. Use it to read tags exactly:\n${text}`
        });
      }
    }
    return { blocks, note: `page${selected.length > 1 ? "s" : ""} ${selected.join(", ")} of ${pdf.numPages}` };
  } finally {
    await pdf.destroy();
  }
}

async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  try {
    return { blocks: await sheetBlocks(bitmap, bitmap.width, bitmap.height, "Drawing"), note: "" };
  } finally {
    bitmap.close();
  }
}

async function prepareSvg(file) {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName !== "svg") throw new AnalysisError("This SVG file could not be read.");

  const viewBox = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  const width = parseFloat(svg.getAttribute("width")) || viewBox[2] || 2000;
  const height = parseFloat(svg.getAttribute("height")) || viewBox[3] || 1400;
  const scale = SHEET_RENDER_EDGE / Math.max(width, height);

  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blocks = await sheetBlocks(canvas, canvas.width, canvas.height, "Drawing");

    // Text labels survive exactly in an SVG, so pass them along to help with small or overlapping tags.
    const labels = [...doc.querySelectorAll("text")]
      .map((node) => node.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" | ")
      .slice(0, TEXT_LIMIT);
    if (labels) blocks.push({ type: "text", text: `Text labels extracted from the SVG source, in document order:\n${labels}` });
    return { blocks, note: "" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Turn the uploaded drawing into Messages API content blocks.
export async function prepareDrawing(file, pages) {
  const name = file.name.toLowerCase();
  let drawing;
  if (file.type === "application/pdf" || name.endsWith(".pdf")) drawing = await preparePdf(file, pages);
  else if (file.type === "image/svg+xml" || name.endsWith(".svg")) drawing = await prepareSvg(file);
  else if (["image/png", "image/jpeg"].includes(file.type) || /\.(png|jpe?g)$/.test(name)) drawing = await prepareImage(file);
  else throw new AnalysisError("Unsupported file type. Use a PDF, SVG, PNG or JPG drawing.");

  const bytes = drawing.blocks.reduce((sum, block) => sum + (block.source?.data.length ?? block.text?.length ?? 0), 0);
  if (bytes > MAX_REQUEST_BYTES) throw new AnalysisError("The selected sheets are too large to send in one request. Import fewer pages at a time.");
  return drawing;
}

function describeApiError(error) {
  const reference = error.requestID ? ` (request ${error.requestID})` : "";
  if (error instanceof Anthropic.AuthenticationError) return "The API key was rejected. Check it and try again.";
  if (error instanceof Anthropic.PermissionDeniedError) return `This API key is not allowed to use ${MODEL}${reference}: ${error.message}`;
  if (error instanceof Anthropic.RateLimitError) return `Rate limited by the API. Wait a minute and try again${reference}.`;
  if (error instanceof Anthropic.APIConnectionError) return `Could not reach the Anthropic API: ${error.message}`;
  return `API error ${error.status ?? ""}${reference}: ${error.message}`;
}

/**
 * Ask Claude to read the drawing and return the simplified process model.
 * pages selects PDF pages (1-based). onProgress receives { phase, chars } while the response streams.
 */
export async function analyzePid({ apiKey, file, pages, notes, onProgress, signal }) {
  onProgress?.({ phase: "preparing", chars: 0 });
  const drawing = await prepareDrawing(file, pages);
  if (signal?.aborted) throw new AnalysisError("Analysis cancelled.");

  // The app is a static site, so the request goes straight from the browser with the user's own key.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const instructions = [
    `Analyse the attached P&ID (${file.name}${drawing.note ? `, ${drawing.note}` : ""}) and return the simplified SCADA process model.`,
    "Each sheet comes as an overview image, then overlapping detail images of its quadrants for reading small symbols and tags, and the PDF text layer when the sheet has one. They all show the same sheet, so count each item once.",
    notes?.trim() ? `Notes from the engineer:\n${notes.trim()}` : ""
  ].filter(Boolean).join("\n\n");

  const params = {
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: [...drawing.blocks, { type: "text", text: instructions }] }]
  };

  const run = (withFallback) => {
    const stream = client.beta.messages.stream(
      withFallback ? { ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : params,
      { signal }
    );
    let chars = 0;
    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start" && event.content_block.type === "thinking") onProgress?.({ phase: "thinking", chars });
    });
    stream.on("text", (delta) => {
      chars += delta.length;
      onProgress?.({ phase: "writing", chars });
    });
    return stream.finalMessage();
  };

  onProgress?.({ phase: "analysing", chars: 0 });
  let message;
  try {
    try {
      message = await run(true);
    } catch (error) {
      // Refusal fallbacks are optional: if this key or account cannot use them, ask once without.
      if (!(error instanceof Anthropic.BadRequestError) || !/fallback/i.test(error.message)) throw error;
      message = await run(false);
    }
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError || signal?.aborted) throw new AnalysisError("Analysis cancelled.");
    if (error instanceof Anthropic.APIError) throw new AnalysisError(describeApiError(error));
    throw error;
  }

  if (message.stop_reason === "refusal") {
    throw new AnalysisError(`The model declined to analyse this drawing${message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : "."}`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new AnalysisError("The drawing produced more output than fits in one response. Import fewer pages at a time.");
  }

  const text = message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch {
    throw new AnalysisError(`The response could not be read as a process model (stop reason: ${message.stop_reason}). Try again.`);
  }

  return {
    analysis,
    meta: {
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      fileNote: drawing.note
    }
  };
}
