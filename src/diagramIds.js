// Ids must be unique: React Flow and React key their elements by id, and a duplicate
// makes deletes hit two items at once and leaves the canvas out of step with the data.

/** Next free `${type}${n}` id, numbered after the highest one in use. */
export function nextNodeId(type, nodes) {
  const pattern = new RegExp(`^${type.replace(/[^a-z0-9]/gi, "")}(\\d+)$`);
  const highest = nodes.reduce((max, node) => Math.max(max, Number(pattern.exec(node.id)?.[1] ?? 0)), 0);
  return `${type}${highest + 1}`;
}

/** `e<source>-<target>`, with a suffix when two pipes join the same pair of symbols. */
export function uniqueEdgeId(source, target, edges) {
  const base = `e${source}-${target}`;
  const taken = new Set(edges.map((edge) => edge.id));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

/**
 * Make a loaded diagram safe to render: rename duplicate node and pipe ids, and drop
 * pipes whose source or target symbol is missing (they cannot be drawn or selected).
 */
export function cleanDiagram(nodes = [], edges = []) {
  const nodeIds = new Set();
  const cleanNodes = nodes.map((node) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      return node;
    }
    let suffix = 2;
    while (nodeIds.has(`${node.id}_${suffix}`)) suffix++;
    const id = `${node.id}_${suffix}`;
    nodeIds.add(id);
    return { ...node, id, data: { ...node.data, id } };
  });

  const edgeIds = new Set();
  const cleanEdges = [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    let id = edge.id;
    if (edgeIds.has(id)) {
      let suffix = 2;
      while (edgeIds.has(`${edge.id}-${suffix}`)) suffix++;
      id = `${edge.id}-${suffix}`;
    }
    edgeIds.add(id);
    cleanEdges.push(id === edge.id ? edge : { ...edge, id });
  }
  return { nodes: cleanNodes, edges: cleanEdges };
}
