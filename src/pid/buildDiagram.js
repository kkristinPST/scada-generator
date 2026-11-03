import { MarkerType } from "reactflow";
import { ELEMENTS_BY_TYPE, fluidClass, FLUIDS } from "../scada/catalog";

const FLUID_KEYS = new Set(FLUIDS.map((fluid) => fluid.key));
const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 };
const UNASSIGNED_STAGE = { id: "__unassigned", name: "Other", order: 9999 };

// Layout grid, in canvas pixels (node positions are top-left corners).
const COLUMN_WIDTH = 170;
const READOUT_COLUMN = 100;
const ROW_HEIGHT = 130;
const READOUT_ROW = 46;
const READOUT_STACK = 60;
const BYPASS_LANE = 45;
const RETURN_LANE = 85;
const STAGE_GAP = 70;
const LABEL_OFFSET = 90;

export const connectionKey = (connection) => `${connection.from}>${connection.to}`;
const lowerConfidence = (a, b) => (CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b);
const isProcess = (element) => element.type !== "readout";

/**
 * Check the model's output against the inventory and against itself. Nothing the
 * model returned is trusted blindly: unknown types, dangling references, duplicate
 * ids and instrument "pipes" are corrected here and every correction is reported.
 */
export function normalizeAnalysis(raw) {
  const issues = [];
  const list = (value) => (Array.isArray(value) ? value : []);
  const text = (value) => (typeof value === "string" ? value.trim() : "");

  const stages = [];
  const stageIds = new Set();
  for (const stage of list(raw?.stages)) {
    const id = text(stage.id);
    if (!id || stageIds.has(id)) continue;
    stageIds.add(id);
    stages.push({ id, name: text(stage.name) || id, order: Number.isFinite(stage.order) ? stage.order : stages.length + 1 });
  }

  const elements = [];
  const elementIds = new Set();
  const seenTags = new Map();
  for (const item of list(raw?.elements)) {
    let id = text(item.id) || `el${elements.length + 1}`;
    while (elementIds.has(id)) id = `${id}_`;
    elementIds.add(id);

    let type = text(item.type);
    if (!ELEMENTS_BY_TYPE[type] || ELEMENTS_BY_TYPE[type].annotation) {
      issues.push({ elementId: id, message: `Unknown symbol type "${type}" replaced with Custom element.` });
      type = "custom";
    }
    const tag = text(item.tag);
    if (tag) {
      if (seenTags.has(tag)) issues.push({ elementId: id, message: `Tag ${tag} appears more than once (also ${seenTags.get(tag)}). Check for a duplicate.` });
      else seenTags.set(tag, id);
    }
    const stageId = stageIds.has(text(item.stage_id)) ? text(item.stage_id) : UNASSIGNED_STAGE.id;

    elements.push({
      id,
      tag,
      name: text(item.name),
      type,
      role: text(item.role) || "equipment",
      stageId,
      attachedTo: text(item.attached_to),
      unit: text(item.unit),
      source: text(item.source),
      confidence: CONFIDENCE_RANK[item.confidence] !== undefined ? item.confidence : "low",
      note: text(item.note),
      // Optional hints from the tag import: a layout column when there are no pipes, and unticked-by-default items
      column: Number.isInteger(item.column) ? item.column : undefined,
      include: item.include !== false
    });
  }
  if (elements.some((element) => element.stageId === UNASSIGNED_STAGE.id)) stages.push({ ...UNASSIGNED_STAGE });

  const byId = Object.fromEntries(elements.map((element) => [element.id, element]));
  for (const element of elements) {
    if (!element.attachedTo) continue;
    const host = byId[element.attachedTo];
    if (element.type !== "readout" || !host || !isProcess(host)) {
      if (element.type === "readout") issues.push({ elementId: element.id, message: `Measured element "${element.attachedTo}" was not found, so the readout is placed on its own.` });
      element.attachedTo = "";
    }
  }

  const connections = [];
  const connectionKeys = new Set();
  for (const item of list(raw?.connections)) {
    const from = text(item.from);
    const to = text(item.to);
    if (!byId[from] || !byId[to]) {
      issues.push({ elementId: "", message: `Dropped a connection to an element that was not returned (${from || "?"} → ${to || "?"}).` });
      continue;
    }
    if (from === to) continue;
    if (!isProcess(byId[from]) || !isProcess(byId[to])) {
      issues.push({ elementId: byId[from].type === "readout" ? from : to, message: "Instruments are shown as readouts, not connected with pipes. Signal line dropped." });
      continue;
    }
    const connection = {
      from,
      to,
      fluid: FLUID_KEYS.has(item.fluid) ? item.fluid : "",
      confidence: CONFIDENCE_RANK[item.confidence] !== undefined ? item.confidence : "low",
      evidence: text(item.evidence)
    };
    const key = connectionKey(connection);
    if (connectionKeys.has(key)) continue;
    connectionKeys.add(key);
    connections.push(connection);
  }

  for (const issue of list(raw?.issues)) {
    const message = text(issue.message);
    if (message) issues.push({ elementId: byId[text(issue.element_id)] ? text(issue.element_id) : "", message });
  }

  return {
    summary: text(raw?.process_summary),
    stages: stages.sort((a, b) => a.order - b.order),
    elements,
    connections,
    omitted: list(raw?.omitted).map((item) => ({ what: text(item.what), count: Number(item.count) || 0, reason: text(item.reason) })).filter((item) => item.what),
    issues
  };
}

// Review notes shown on the canvas for one element.
function reviewNotes(element, issues) {
  const notes = [];
  if (element.confidence !== "high") notes.push(`${element.confidence === "low" ? "Low" : "Medium"} confidence${element.note ? `: ${element.note}` : ""}`);
  for (const issue of issues) if (issue.elementId === element.id) notes.push(issue.message);
  return notes;
}

/**
 * Remove excluded elements without breaking the process: a path A → X → B through
 * a removed X becomes A → B, flagged for review because it was not drawn that way.
 */
function contract(connections, removedIds, labelOf) {
  let result = connections.map((connection) => ({ ...connection, review: connection.confidence === "high" ? [] : [`${connection.confidence === "low" ? "Low" : "Medium"} confidence${connection.evidence ? `: ${connection.evidence}` : ""}`] }));
  for (const id of removedIds) {
    const incoming = result.filter((connection) => connection.to === id);
    const outgoing = result.filter((connection) => connection.from === id);
    result = result.filter((connection) => connection.from !== id && connection.to !== id);
    for (const a of incoming) {
      for (const b of outgoing) {
        if (a.from === b.to || result.some((connection) => connection.from === a.from && connection.to === b.to)) continue;
        result.push({
          from: a.from,
          to: b.to,
          fluid: a.fluid || b.fluid,
          confidence: lowerConfidence(a.confidence, b.confidence),
          evidence: "",
          review: [...a.review, ...b.review, `Bridged across removed ${labelOf(id)}`]
        });
      }
    }
  }
  return result;
}

// BFS layering: rank = first-visit distance from the sources, so recirculation loops don't explode.
function rankElements(processElements, connections, stageOrder) {
  const outgoing = new Map(processElements.map((element) => [element.id, []]));
  const indegree = new Map(processElements.map((element) => [element.id, 0]));
  for (const connection of connections) {
    outgoing.get(connection.from)?.push(connection.to);
    indegree.set(connection.to, (indegree.get(connection.to) ?? 0) + 1);
  }

  const rank = new Map();
  const ordered = [...processElements].sort((a, b) => stageOrder(a) - stageOrder(b));
  const visit = (starts) => {
    const queue = starts.filter((id) => !rank.has(id));
    queue.forEach((id) => rank.set(id, 0));
    while (queue.length) {
      const id = queue.shift();
      for (const next of outgoing.get(id) ?? []) {
        if (rank.has(next)) continue;
        rank.set(next, rank.get(id) + 1);
        queue.push(next);
      }
    }
  };
  visit(ordered.filter((element) => indegree.get(element.id) === 0).map((element) => element.id));
  // Components that are pure loops have no source; start them at their earliest stage.
  for (const element of ordered) if (!rank.has(element.id)) visit([element.id]);
  // Elements with no pipe at all keep the column their source suggested (the tag import's equipment kinds)
  const connected = new Set(connections.flatMap((connection) => [connection.from, connection.to]));
  for (const element of processElements) if (!connected.has(element.id) && element.column !== undefined) rank.set(element.id, element.column);
  return rank;
}

function nextIdFactory(existingNodes) {
  const used = new Set(existingNodes.map((node) => node.id));
  const counters = {};
  for (const node of existingNodes) {
    const match = /^([a-z]+?)(\d+)$/i.exec(node.id);
    if (match) counters[match[1]] = Math.max(counters[match[1]] ?? 0, Number(match[2]));
  }
  return (type) => {
    let id;
    do {
      counters[type] = (counters[type] ?? 0) + 1;
      id = `${type}${counters[type]}`;
    } while (used.has(id));
    used.add(id);
    return id;
  };
}

/**
 * Turn a reviewed model into React Flow nodes and edges that use the editor's own
 * node types, data fields and edge conventions, so the result is fully editable.
 */
export function buildDiagram(model, { excludedElements = new Set(), excludedConnections = new Set(), typeOverrides = {}, existingNodes = [], origin = { x: 0, y: 0 } } = {}) {
  const typeOf = (element) => typeOverrides[element.id] ?? element.type;
  const labelOf = (id) => {
    const element = model.elements.find((item) => item.id === id);
    return element ? element.tag || element.name || element.id : id;
  };

  const kept = model.elements.filter((element) => !excludedElements.has(element.id)).map((element) => ({ ...element, type: typeOf(element) }));
  const keptIds = new Set(kept.map((element) => element.id));
  for (const element of kept) if (element.attachedTo && !keptIds.has(element.attachedTo)) element.attachedTo = "";

  const removed = model.elements.filter((element) => excludedElements.has(element.id) && isProcess({ type: typeOf(element) })).map((element) => element.id);
  const connections = contract(
    model.connections.filter((connection) => !excludedConnections.has(connectionKey(connection))),
    removed,
    labelOf
  ).filter((connection) => keptIds.has(connection.from) && keptIds.has(connection.to));

  const stageIndex = new Map(model.stages.map((stage, index) => [stage.id, index]));
  const stageOrder = (element) => stageIndex.get(element.stageId) ?? model.stages.length;
  const processElements = kept.filter((element) => isProcess(element));
  const rank = rankElements(processElements, connections, stageOrder);
  const attached = new Map();
  for (const element of kept) {
    if (element.type === "readout" && element.attachedTo) attached.set(element.attachedTo, [...(attached.get(element.attachedTo) ?? []), element]);
  }

  const nextId = nextIdFactory(existingNodes);
  const nodeIdOf = new Map();
  const nodes = [];
  const counts = {};

  const addNode = (element, position) => {
    const id = nextId(element.type);
    nodeIdOf.set(element.id, id);
    counts[element.type] = (counts[element.type] ?? 0) + 1;
    const review = reviewNotes(element, model.issues);
    nodes.push({
      id,
      type: element.type,
      position,
      data: {
        id,
        label: element.type === "offpage" ? element.name || element.tag : element.tag || element.name || ELEMENTS_BY_TYPE[element.type].label,
        isSelected: false,
        ...(element.tag && element.name && element.type !== "offpage" ? { description: element.name } : {}),
        ...(element.type === "readout" ? { value: "", unit: element.unit } : element.type === "offpage" ? {} : { running: true, mode: "auto" }),
        ...(review.length ? { review: review.join(" · ") } : {}),
        pid: { tag: element.tag, name: element.name, role: element.role, source: element.source, confidence: element.confidence }
      }
    });
  };

  let x = origin.x;
  for (const stage of model.stages) {
    const members = kept.filter((element) => element.stageId === stage.id && (isProcess(element) || !element.attachedTo));
    if (members.length === 0) continue;

    // Sub-columns follow flow order inside the stage; loose readouts get the last one.
    const ranks = [...new Set(members.filter(isProcess).map((element) => rank.get(element.id) ?? 0))].sort((a, b) => a - b);
    const columns = ranks.map((r) => members.filter((element) => isProcess(element) && (rank.get(element.id) ?? 0) === r));
    const loose = members.filter((element) => !isProcess(element));
    if (loose.length) columns.push(loose);

    const rowHeight = (element) =>
      isProcess(element) ? Math.max(ROW_HEIGHT, Math.ceil((attached.get(element.id)?.length ?? 0) / 2) * READOUT_STACK * 2 + 10) : READOUT_ROW + 30;
    const heights = columns.map((column) => column.reduce((sum, element) => sum + rowHeight(element), 0));
    const tallest = Math.max(...heights);

    nodes.push({
      id: nextId("label"),
      type: "label",
      position: { x, y: origin.y - LABEL_OFFSET },
      data: { label: stage.name, isSelected: false }
    });
    counts.label = (counts.label ?? 0) + 1;

    columns.forEach((column, columnIndex) => {
      let y = origin.y + (tallest - heights[columnIndex]) / 2;
      const hasReadouts = column.some((element) => attached.has(element.id));
      for (const element of column) {
        addNode(element, { x, y });
        // Readouts sit beside their equipment, alternating above and below the pipe level so the line stays clear
        const lineY = y + 6 + ELEMENTS_BY_TYPE[element.type].height / 2;
        (attached.get(element.id) ?? []).forEach((readout, index) => {
          const tier = Math.floor(index / 2);
          const readoutY = index % 2 === 0 ? lineY - 62 - tier * READOUT_STACK : lineY + 8 + tier * READOUT_STACK;
          addNode(readout, { x: x + 80, y: readoutY });
        });
        y += rowHeight(element);
      }
      x += COLUMN_WIDTH + (hasReadouts ? READOUT_COLUMN : 0);
    });
    x += STAGE_GAP;
  }

  const positionOf = new Map(nodes.map((node) => [node.id, node.position]));
  const byElementId = new Map(kept.map((element) => [element.id, element]));
  const edges = connections.map((connection) => {
    const source = nodeIdOf.get(connection.from);
    const target = nodeIdOf.get(connection.to);
    // Lines that run against the layout (recirculation, returns) or jump over whole stages (side streams)
    // get their own lane underneath instead of overlaying the main flow
    const isReturn = positionOf.get(target).x < positionOf.get(source).x;
    const isBypass = !isReturn && stageOrder(byElementId.get(connection.to)) - stageOrder(byElementId.get(connection.from)) >= 2;
    const lane = isReturn ? RETURN_LANE : isBypass ? BYPASS_LANE : 0;
    return {
      id: `e${source}-${target}`,
      source,
      target,
      ...(lane ? { sourceHandle: "b", targetHandle: "bt", pathOptions: { offset: lane } } : {}),
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      className: [fluidClass(connection.fluid), connection.review.length ? "pipe-review" : ""].filter(Boolean).join(" ") || undefined,
      data: { fluid: connection.fluid, ...(connection.review.length ? { review: connection.review.join(" · ") } : {}) }
    };
  });

  return { nodes, edges, counts };
}
