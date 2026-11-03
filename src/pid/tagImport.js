// Tag import: build a SCADA overview from the tags printed on a P&ID, with no AI.
// Tags follow the Pure Salmon Technology convention AREA-PROCESS-COMPONENT[.SIGNAL],
// e.g. DPT7-FIL1-PU1.M1, and the codes are mapped with the P&ID legend. Tags do not
// say how equipment is piped, so no connections are produced: the engineer draws them.
import { openPdf, pageText } from "./pdf";

// Equipment component codes → inventory symbol. `confidence` below high marks a mapping
// that is a judgement call; `include: false` lists the item unticked in the review.
const EQUIPMENT = {
  PU: { type: "pump", name: "Pump" },
  VE: { type: "fan", name: "Blower" },
  AV: { type: "fan", name: "Fan" },
  CO: { type: "fan", name: "Compressor", confidence: "medium" },
  BM: { type: "cabinet", name: "Blower", confidence: "medium" },
  TA: { type: "tank", name: "Tank" },
  BK: { type: "sump", name: "Sump" },
  SU: { type: "sump", name: "Sump" },
  CH: { type: "sump", name: "Channel", confidence: "medium" },
  HE: { type: "hx", name: "Heat exchanger" },
  HEX: { type: "hx", name: "Heat exchanger" },
  HP: { type: "hx", name: "Heat pump" },
  RU: { type: "hx", name: "Refrigeration unit", confidence: "medium" },
  BO: { type: "hx", name: "Heating/cooling unit", confidence: "medium" },
  UV: { type: "uv", name: "UV unit" },
  MI: { type: "motor", name: "Mixer" },
  AG: { type: "motor", name: "Agitator" },
  CA: { type: "cabinet", name: "Cabinet", confidence: "medium" },
  SI: { type: "drum", name: "Sieve", confidence: "medium" },
  FIL: { type: "drum", name: "Filter", confidence: "medium" },
  CL: { type: "dosing", name: "Chlorination", confidence: "medium" },
  AO: { type: "custom", name: "AOT unit" },
  PK: { type: "custom", name: "Package unit" },
  CT: { type: "custom", name: "Cooling tower" },
  CE: { type: "custom", name: "Centrifuge" },
  XE: { type: "custom", name: "Miscellaneous equipment", confidence: "low", include: false },
  SP: { type: "custom", name: "Special item", confidence: "low", include: false }
};

// Automatic valves an operator commands or watches. Manual, check and safety valves are left out.
const VALVES = { MV: "Motor valve", PV: "Pneumatic valve", SV: "Solenoid valve", RV: "Regulating valve" };

// Transmitters shown as readouts. Units follow the existing SCADA screens.
const TRANSMITTERS = {
  LT: { name: "Level", unit: "cm" },
  TT: { name: "Temperature", unit: "°C" },
  TE: { name: "Temperature", unit: "°C" },
  PT: { name: "Pressure", unit: "bar" },
  PE: { name: "Pressure", unit: "bar" },
  FT: { name: "Flow", unit: "m³/h" },
  FQ: { name: "Flow", unit: "m³/h" },
  QT: { name: "Analyser", unit: "" },
  AT: { name: "Analyser", unit: "" },
  WT: { name: "Weight", unit: "kg" },
  SC: { name: "Speed", unit: "Hz" }
};

// Left out of an operator overview, reported in the review with a count.
const OMITTED = {
  HV: "Hand valves",
  CV: "Check valves",
  SR: "Safety valves",
  PI: "Local indicators",
  TI: "Local indicators",
  LI: "Local indicators",
  FI: "Local indicators",
  LG: "Local indicators",
  TW: "Thermowells",
  LS: "Switches and alarm-only devices",
  PS: "Switches and alarm-only devices",
  FS: "Switches and alarm-only devices",
  SS: "Switches and alarm-only devices",
  HS: "Switches and alarm-only devices",
  ZS: "Switches and alarm-only devices",
  ZA: "Switches and alarm-only devices",
  XY: "Switches and alarm-only devices",
  WS: "Switches and alarm-only devices",
  LAH: "Switches and alarm-only devices",
  LE: "Measuring elements (shown through their transmitters)",
  ST: "Strainers",
  BL: "Lighting",
  AH: "Local and control panels",
  CC: "Local and control panels",
  SA: "Safety and protection equipment",
  IC: "Inline components"
};

// Codes that mean different things in the legend's equipment and instrument lists.
const AMBIGUOUS = {
  TS: "TS is both a separator (equipment) and a temperature switch (instrument) in the legend",
  AE: "AE is both aeration (equipment) and an analyser element (instrument) in the legend"
};

const LINE_CODES = new Set(["KR", "MF"]);

const OMIT_REASONS = {
  "Pipe line numbers": "Pipes are drawn on the canvas",
  "Motor signals (part of their equipment)": "The equipment symbol already includes its drive"
};

// Process-area names from the legend and the existing SCADA screens.
const PROCESS_NAMES = {
  AEB: "Aeration blowers", ANA: "Analysis", ANT: "Formic acid", AOT: "AOT", CIP: "Clean in place",
  CO2: "CO₂ system", CST: "CO₂ system", DFS: "Dead fish", DIS: "Dispersion", DNA: "Lye dosing",
  DOS: "Dosing", DOX: "Oxygenation", DOZ: "Ozone dosing", DRA: "Drainage", DUV: "UV disinfection",
  EFL: "Fish barrier", ENS: "Energy system", EOX: "Emergency oxygen", ESY: "Energy system",
  FCT: "Ferric chloride", FED: "Feeding", FHA: "Fish handling", FIL: "Filtration", FLO: "Flocculation",
  FLT: "Flotation", FSB: "Fish stop barrier", FST: "Feed storage", FTA: "Fish tanks", FTB: "Fish transport",
  HCL: "Hydrochloric acid", HPA: "Compressed air", HSY: "Heating", INF: "Infrastructure", INN: "Inlet",
  LME: "Lime", LYE: "Lye", MBB: "MBBR", MEO: "Methanol", OXT: "Oxystream", OXY: "Oxygen system",
  OZO: "Ozone", PBS: "Booster station", POL: "Polymer", PRS: "Protein skimmer", PSU: "Pump sump",
  PUT: "Pump tower", SAL: "Salt", SLR: "Sludge from RAS", SLW: "Sludge from WWT", SMP: "Pump sump",
  SOD: "Lye", SOR: "Sorting", SPW: "Spray water", STA: "Sludge pump", STO: "Storage", STR: "CO₂ stripping",
  TPA: "Tools air", VAC: "Vaccination", CSY: "Cooling", WIN: "Intake"
};

const TAG_PATTERN = /\b[A-Z][A-Z0-9]{1,6}(?:-[A-Z0-9]{1,8}){1,4}(?:\.[A-Z]{1,3}\d{0,3})?\b/g;
const OFFPAGE_STAGE = "__offpage";

const familyName = (family) => PROCESS_NAMES[family] ?? family;

/** Split a tag into its parts, or return null for text that is not an equipment, instrument or line tag. */
export function parseTag(tag) {
  const [body, signal = ""] = tag.split(".");
  const segments = body.split("-");
  const isLine = segments.length >= 4 && /^(\d+|NA)$/.test(segments[segments.length - 1]);
  const [area, processPart, componentPart] = segments.length >= 3 ? segments : [segments[0], segments[0], segments[1]];
  const process = /^([A-Z]+)(\d*)$/.exec(processPart);
  const component = /^([A-Z]+)(\d*)([A-Z]?)$/.exec(componentPart ?? "");
  if (!process || !component) return null;
  return {
    tag,
    body,
    area,
    process: processPart,
    family: process[1],
    processNumber: process[2] === "" ? null : Number(process[2]),
    code: component[1],
    number: component[2] === "" ? null : Number(component[2]),
    signal,
    isLine: isLine || LINE_CODES.has(component[1])
  };
}

// Readable default description, e.g. "Pump 1 · Filtration 3"; the engineer can rename it.
function describe(kind, parsed) {
  const unit = parsed.processNumber ? ` ${parsed.processNumber}` : "";
  return `${kind}${parsed.number !== null ? ` ${parsed.number}` : ""} · ${familyName(parsed.family)}${unit}`;
}

function classify(parsed) {
  const { code, family, number } = parsed;
  if (OMITTED[code]) return { omit: OMITTED[code] };
  if (VALVES[code]) return { type: "valve", role: "valve", kind: VALVES[code], confidence: "high" };
  if (TRANSMITTERS[code]) {
    const transmitter = TRANSMITTERS[code];
    return { type: "readout", role: "instrument", kind: transmitter.name, unit: transmitter.unit, confidence: "high" };
  }
  if (code === "FE") {
    // FE is a filter in the equipment list and a flow element in the instrument list.
    if (family !== "FIL") return { omit: "Flow elements (shown through their transmitters)" };
    // The existing SCADA screens name FILn-FE1 "Drum filter n"
    if (number === 1) return { type: "drum", role: "equipment", kind: "Drum filter", confidence: "high" };
    return { type: "drum", role: "equipment", kind: "Filter element", confidence: "low", include: false, note: "Second FE in this filter unit; may be a part of the drum filter or a flow element" };
  }
  if (AMBIGUOUS[code]) return { type: "custom", role: "equipment", kind: code, confidence: "low", include: false, note: AMBIGUOUS[code] };
  if (EQUIPMENT[code]) {
    const equipment = EQUIPMENT[code];
    return { type: equipment.type, role: "equipment", kind: equipment.name, confidence: equipment.confidence ?? "high", include: equipment.include, note: equipment.confidence === "medium" ? `${code} mapped to ${equipment.type}` : "" };
  }
  return { type: "custom", role: "equipment", kind: code, confidence: "low", include: false, note: `Code ${code} is not in the P&ID legend` };
}

/** Text items with tags and their position on the sheet (percent from the top-left). */
async function readTextItems(file, pages) {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const pdf = await openPdf(file);
    try {
      const items = [];
      for (const page of pages?.length ? pages : [1]) {
        for (const item of await pageText(pdf, page)) items.push({ ...item, page });
      }
      return items;
    } finally {
      await pdf.destroy();
    }
  }
  if (file.type === "image/svg+xml" || name.endsWith(".svg")) return readSvgText(await file.text());
  throw new Error("Tag import reads the text in a PDF or SVG. A PNG or JPG has no text layer: export the sheet as PDF or use AI analysis.");
}

// SVG text positions without rendering the file: x/y attributes through translate/matrix transforms.
function readSvgText(source) {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName !== "svg") throw new Error("This SVG file could not be read.");
  const viewBox = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  const width = viewBox[2] || parseFloat(svg.getAttribute("width")) || 1;
  const height = viewBox[3] || parseFloat(svg.getAttribute("height")) || 1;
  const [originX, originY] = [viewBox[0] || 0, viewBox[1] || 0];

  const transformPoint = (element, x, y) => {
    for (let node = element; node && node !== svg.parentNode; node = node.parentNode) {
      const transform = node.getAttribute?.("transform") ?? "";
      for (const [, fn, args] of [...transform.matchAll(/(translate|matrix)\(([^)]*)\)/g)].reverse()) {
        const n = args.split(/[\s,]+/).filter(Boolean).map(Number);
        if (fn === "translate") [x, y] = [x + (n[0] || 0), y + (n[1] || 0)];
        else [x, y] = [n[0] * x + n[2] * y + n[4], n[1] * x + n[3] * y + n[5]];
      }
    }
    return [x, y];
  };

  return [...doc.querySelectorAll("text")].map((node) => {
    const [x, y] = transformPoint(node, parseFloat(node.getAttribute("x")) || 0, parseFloat(node.getAttribute("y")) || 0);
    return { text: node.textContent.replace(/\s+/g, " ").trim(), x: Math.round(((x - originX) / width) * 100), y: Math.round(((y - originY) / height) * 100), page: 1 };
  });
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

/**
 * Turn the tags of one or more sheets into the same raw model the AI analysis returns,
 * so both go through the same validation, review step and layout.
 */
export function tagsToModel(items, { fileName = "", pages = [] } = {}) {
  const found = new Map();
  for (const item of items) {
    for (const tag of item.text.match(TAG_PATTERN) ?? []) {
      if (!found.has(tag)) found.set(tag, { tag, x: item.x, y: item.y, page: item.page });
    }
  }

  const parsed = [...found.values()].map((hit) => ({ ...parseTag(hit.tag), x: hit.x, y: hit.y })).filter((item) => item.code);
  const omitted = new Map();
  const omit = (what) => omitted.set(what, (omitted.get(what) ?? 0) + 1);

  // A motor signal (".M1") belongs to its equipment; it becomes a motor only if the equipment is missing.
  const bodies = new Set(parsed.filter((item) => !item.signal).map((item) => item.body));
  const lines = parsed.filter((item) => item.isLine);
  lines.forEach(() => omit("Pipe line numbers"));

  const elements = [];
  for (const item of parsed) {
    if (item.isLine) continue;
    if (item.signal) {
      if (bodies.has(item.body)) {
        omit("Motor signals (part of their equipment)");
        continue;
      }
      elements.push({ item, type: "motor", role: "equipment", kind: "Motor", confidence: "medium", note: `Motor signal ${item.tag} without its equipment tag on this sheet` });
      continue;
    }
    const result = classify(item);
    if (result.omit) {
      omit(result.omit);
      continue;
    }
    elements.push({ item, ...result });
  }

  // Off-page connectors: process areas whose pipes are on the sheet but whose equipment is not.
  const familiesWithElements = new Set(elements.map((element) => `${element.item.area}-${element.item.family}`));
  const offpage = new Map();
  for (const line of lines) {
    const key = `${line.area}-${line.family}`;
    if (familiesWithElements.has(key)) continue;
    const entry = offpage.get(key) ?? { area: line.area, family: line.family, xs: [], ys: [] };
    entry.xs.push(line.x);
    entry.ys.push(line.y);
    offpage.set(key, entry);
  }
  const mainArea = [...elements.reduce((count, element) => count.set(element.item.area, (count.get(element.item.area) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Stages: one per process family (FIL1…FIL5 are the parallel units of "Filtration"), ordered as drawn, left to right.
  const stageKey = (item) => `${item.area}-${item.family}`;
  const stageMembers = new Map();
  for (const element of elements) {
    const key = stageKey(element.item);
    stageMembers.set(key, [...(stageMembers.get(key) ?? []), element]);
  }
  const areasPerFamily = new Map();
  for (const key of stageMembers.keys()) {
    const family = key.split("-")[1];
    areasPerFamily.set(family, (areasPerFamily.get(family) ?? 0) + 1);
  }
  const stages = [...stageMembers.entries()]
    .map(([key, members]) => {
      const [area, family] = key.split("-");
      return { id: key, name: areasPerFamily.get(family) > 1 ? `${familyName(family)} (${area})` : familyName(family), x: mean(members.map((member) => member.item.x)) };
    })
    .sort((a, b) => a.x - b.x);
  if (offpage.size) stages.push({ id: OFFPAGE_STAGE, name: "Connected systems", x: Infinity });

  // Inside a stage, each kind of equipment gets its own column (ordered as drawn) and parallel units line up in rows.
  const rawElements = [];
  let next = 1;
  const idOf = new Map();
  for (const stage of stages.filter((item) => item.id !== OFFPAGE_STAGE)) {
    const members = stageMembers.get(stage.id).filter((member) => member.type !== "readout");
    const kinds = [...new Set(members.map((member) => member.item.code))].sort(
      (a, b) => mean(members.filter((m) => m.item.code === a).map((m) => m.item.x)) - mean(members.filter((m) => m.item.code === b).map((m) => m.item.x))
    );
    const ordered = [...stageMembers.get(stage.id)].sort(
      (a, b) => (a.item.processNumber ?? 0) - (b.item.processNumber ?? 0) || (a.item.number ?? 0) - (b.item.number ?? 0)
    );
    for (const member of ordered) {
      const id = `t${next++}`;
      idOf.set(member.item.tag, id);
      member.id = id;
      rawElements.push({
        id,
        tag: member.item.tag,
        name: describe(member.kind, member.item),
        type: member.type,
        role: member.role,
        stage_id: stage.id,
        attached_to: "",
        unit: member.unit ?? "",
        source: `${member.item.code} on the P&ID${member.item.page > 1 || pages.length > 1 ? `, page ${member.item.page}` : ""}`,
        confidence: member.confidence,
        note: member.note ?? "",
        column: member.type === "readout" ? 0 : kinds.indexOf(member.item.code),
        include: member.include !== false
      });
    }
  }

  // A transmitter belongs to the nearest equipment in the same process unit (FIL1, not FIL0 or FIL2).
  for (const element of elements.filter((item) => item.type === "readout")) {
    const hosts = elements.filter((host) => host.type !== "readout" && host.include !== false && host.item.process === element.item.process && host.item.area === element.item.area);
    if (hosts.length === 0 || (element.item.processNumber === 0 && hosts.length > 1)) continue;
    const nearest = hosts.reduce((best, host) => (Math.hypot(host.item.x - element.item.x, host.item.y - element.item.y) < Math.hypot(best.item.x - element.item.x, best.item.y - element.item.y) ? host : best));
    rawElements.find((raw) => raw.id === element.id).attached_to = nearest.id;
  }

  for (const entry of [...offpage.values()].sort((a, b) => mean(a.ys) - mean(b.ys))) {
    const label = entry.area === mainArea ? familyName(entry.family) : `${familyName(entry.family)} (${entry.area})`;
    rawElements.push({
      id: `t${next++}`,
      tag: "",
      name: label,
      type: "offpage",
      role: "offpage",
      stage_id: OFFPAGE_STAGE,
      attached_to: "",
      unit: "",
      source: `${entry.xs.length} pipe line${entry.xs.length === 1 ? "" : "s"} tagged ${entry.area}-${entry.family}`,
      confidence: "high",
      note: "",
      column: 0,
      include: true
    });
  }

  const equipmentCount = rawElements.filter((element) => element.role !== "instrument" && element.role !== "offpage").length;
  const readoutCount = rawElements.filter((element) => element.role === "instrument").length;
  const sheet = pages.length ? `page${pages.length > 1 ? "s" : ""} ${pages.join(", ")}` : "the drawing";
  return {
    process_summary: found.size
      ? `Read ${found.size} tags from ${sheet}${fileName ? ` of ${fileName}` : ""}: ${equipmentCount} equipment and valves, ${readoutCount} measurements and ${offpage.size} connected systems. Stages follow the process areas in the tags, ordered as drawn. Tags do not show how equipment is piped, so draw the connections on the canvas (Shift + click two symbols).`
      : `No tags were found on ${sheet}. The text may be drawn as lines rather than real text; try AI analysis instead.`,
    stages: stages.map((stage, index) => ({ id: stage.id, name: stage.name, order: index + 1 })),
    elements: rawElements,
    connections: [],
    omitted: [...omitted.entries()].map(([what, count]) => ({ what, count, reason: OMIT_REASONS[what] ?? "Not needed on an operator overview" })),
    issues: []
  };
}

export async function readTags({ file, pages }) {
  const items = await readTextItems(file, pages);
  return tagsToModel(items, { fileName: file.name, pages: pages ?? [] });
}
