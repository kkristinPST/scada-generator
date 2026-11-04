import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from "reactflow";
import {
  Download,
  FileScan,
  HelpCircle,
  PanelLeft,
  RotateCcw,
  Trash2,
  Upload
} from "lucide-react";
import "reactflow/dist/style.css";

import "./scada/scada.css";

import EquipmentNode from "./nodes/EquipmentNode";
import LabelNode from "./nodes/LabelNode";
import OffPageNode from "./nodes/OffPageNode";
import InventoryPanel from "./InventoryPanel";
import InspectorPanel from "./InspectorPanel";
import HelpModal from "./HelpModal";
import PidImportModal from "./PidImportModal";
import ExamplesMenu from "./ExamplesMenu";
import { EXAMPLES } from "./examples";
import { ELEMENTS, fluidClass } from "./scada/catalog";
import { cleanDiagram, nextNodeId, uniqueEdgeId } from "./diagramIds";

// What each equipment counter in the toolbar counts.
const COUNTED_TYPES = ["pump", "motor", "valve", "bio", "oxygen", "tank", "cone"];

const countByType = (nodes) =>
  Object.fromEntries(COUNTED_TYPES.map((type) => [type, nodes.filter((node) => node.type === type).length]));

// Everything that makes a diagram different, and nothing that only reflects the view (selection, measured size).
const diagramSignature = (nodes, edges) =>
  JSON.stringify([
    nodes.map((node) => [node.id, node.type, Math.round(node.position.x), Math.round(node.position.y), { ...node.data, isSelected: undefined }]),
    edges.map((edge) => [edge.id, edge.source, edge.target, edge.sourceHandle ?? null, edge.targetHandle ?? null, edge.className ?? "", edge.data ?? null])
  ]);

// A diagram ready for the canvas: ids made unique, nothing selected, counters derived from it.
function prepareDiagram({ nodes, edges }, label, counts) {
  const clean = cleanDiagram(nodes, edges);
  const prepared = clean.nodes.map((node) => ({ ...node, data: { ...node.data, isSelected: false } }));
  return { nodes: prepared, edges: clean.edges, counts: counts ?? countByType(prepared), label };
}

const createStartDiagram = () => prepareDiagram(EXAMPLES[0].build(), `the "${EXAMPLES[0].name}" example`);

// Every library element renders through the same NJORD symbol node.
const nodeTypes = {
  ...Object.fromEntries(ELEMENTS.map((element) => [element.type, EquipmentNode])),
  label: LabelNode,
  offpage: OffPageNode
};

export default function App() {
  // What Reset returns to: the diagram exactly as it was last loaded (example, import or Clear)
  const [baseline, setBaseline] = useState(createStartDiagram);
  const [intakePumps, setIntakePumps] = useState(baseline.counts.pump);
  const [bioFilters, setBioFilters] = useState(baseline.counts.bio);
  const [oxygenUnits, setOxygenUnits] = useState(baseline.counts.oxygen);
  const [pressureTanks, setPressureTanks] = useState(baseline.counts.tank);
  const [motorCount, setMotorCount] = useState(baseline.counts.motor);
  const [valveCount, setValveCount] = useState(baseline.counts.valve);
  const [coneCount, setConeCount] = useState(baseline.counts.cone);
  const [selectedElement, setSelectedElement] = useState(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [multiSelectNodes, setMultiSelectNodes] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [highlightedCounter, setHighlightedCounter] = useState(null);
  const [activeFluid, setActiveFluid] = useState("");
  const [pidOpen, setPidOpen] = useState(false);
  const [flowInstance, setFlowInstance] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(baseline.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseline.edges);

  const isUndoRedoing = useRef(false);
  const previousEdgesLengthRef = useRef(0);

  // Save state to history (only if not currently undoing/redoing)
  const saveToHistory = useCallback(() => {
    if (isUndoRedoing.current) return;
    
    const state = {
      nodes,
      edges,
      intakePumps,
      bioFilters,
      oxygenUnits,
      pressureTanks,
      motorCount,
      valveCount,
      coneCount
    };
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [nodes, edges, intakePumps, bioFilters, oxygenUnits, pressureTanks, motorCount, valveCount, coneCount, history, historyStep]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      isUndoRedoing.current = true;
      const newStep = historyStep - 1;
      const state = history[newStep];
      setIntakePumps(state.intakePumps);
      setBioFilters(state.bioFilters);
      setOxygenUnits(state.oxygenUnits);
      setPressureTanks(state.pressureTanks);
      setMotorCount(state.motorCount);
      setValveCount(state.valveCount);
      setConeCount(state.coneCount);
      setNodes(state.nodes);
      setEdges(state.edges);
      setHistoryStep(newStep);
      setTimeout(() => { isUndoRedoing.current = false; }, 0);
    }
  }, [historyStep, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      isUndoRedoing.current = true;
      const newStep = historyStep + 1;
      const state = history[newStep];
      setIntakePumps(state.intakePumps);
      setBioFilters(state.bioFilters);
      setOxygenUnits(state.oxygenUnits);
      setPressureTanks(state.pressureTanks);
      setMotorCount(state.motorCount);
      setValveCount(state.valveCount);
      setConeCount(state.coneCount);
      setNodes(state.nodes);
      setEdges(state.edges);
      setHistoryStep(newStep);
      setTimeout(() => { isUndoRedoing.current = false; }, 0);
    }
  }, [historyStep, history]);

  // Put a whole diagram on the canvas and remember it as the point Reset returns to
  const loadDiagram = useCallback((diagram) => {
    setIntakePumps(diagram.counts.pump ?? 0);
    setBioFilters(diagram.counts.bio ?? 0);
    setOxygenUnits(diagram.counts.oxygen ?? 0);
    setPressureTanks(diagram.counts.tank ?? 0);
    setMotorCount(diagram.counts.motor ?? 0);
    setValveCount(diagram.counts.valve ?? 0);
    setConeCount(diagram.counts.cone ?? 0);
    setNodes(diagram.nodes);
    setEdges(diagram.edges);
    setBaseline(diagram);
    setSelectedElement(null);
    setSelectedEdge(null);
    setMultiSelectNodes([]);
    // Wait for React Flow to measure the new nodes before fitting them in view
    setTimeout(() => flowInstance?.fitView({ padding: 0.15, duration: 300 }), 250);
  }, [setNodes, setEdges, flowInstance]);

  const isDirty = useMemo(
    () => diagramSignature(nodes, edges) !== diagramSignature(baseline.nodes, baseline.edges),
    [nodes, edges, baseline]
  );

  // Clear all nodes and edges; an empty canvas becomes the reset point
  const handleClearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to clear everything?")) {
      loadDiagram(prepareDiagram({ nodes: [], edges: [] }, "an empty canvas"));
    }
  }, [loadDiagram]);

  // Go back to the diagram as it was last loaded, discarding every change since
  const handleReset = () => {
    if (!isDirty || !window.confirm(`Discard your changes and go back to ${baseline.label}?`)) return;
    loadDiagram(baseline);
  };

  // Update selection state in nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, isSelected: selectedElement === node.id }
      }))
    );
  }, [selectedElement, setNodes]);

  // Helper function to add nodes for a category
  const addNodes = (type, currentCount, newCount, startLabel, nodeTypeKey) => {
    if (newCount > currentCount) {
      const newNodesToAdd = [];
      const positions = {
        pump: { x: 50, baseY: 100, spacing: 100 },
        motor: { x: 330, baseY: 100, spacing: 100 },
        valve: { x: 610, baseY: 100, spacing: 100 },
        bio: { x: 890, baseY: 100, spacing: 100 },
        oxygen: { x: 1290, baseY: 400, spacing: 120, cols: 4 },
        cone: { x: 1540, baseY: 400, spacing: 100 },
        ptank: { x: 1820, baseY: 400, spacing: 100 }
      };

      const pos = positions[type];
      for (let i = currentCount + 1; i <= newCount; i++) {
        const taken = [...nodes, ...newNodesToAdd];
        const id = taken.some((node) => node.id === `${type}${i}`) ? nextNodeId(type, taken) : `${type}${i}`;
        let position;
        if (type === "oxygen") {
          const col = (i - 1) % pos.cols;
          const row = Math.floor((i - 1) / pos.cols);
          position = { x: pos.x - 100 + col * 150, y: pos.baseY + row * pos.spacing };
        } else {
          position = { x: pos.x, y: pos.baseY + (i - 1) * pos.spacing };
        }

        newNodesToAdd.push({
          id,
          type: nodeTypeKey,
          position,
          data: { id, label: `${startLabel} ${i}`, isSelected: false }
        });
      }
      setNodes((nds) => [...nds, ...newNodesToAdd]);
    } else if (newCount < currentCount) {
      // Remove nodes for this type
      const idsToRemove = [];
      for (let i = newCount + 1; i <= currentCount; i++) {
        idsToRemove.push(`${type}${i}`);
      }
      setNodes((nds) => nds.filter((n) => !idsToRemove.includes(n.id)));
      // Also remove edges connected to removed nodes
      setEdges((eds) => eds.filter((e) => !idsToRemove.includes(e.source) && !idsToRemove.includes(e.target)));
    }
  };

  // Handle count changes - add or remove nodes without resetting
  const handleIntakePumpsChange = (value) => {
    addNodes("pump", intakePumps, value, "Pump", "pump");
    setIntakePumps(value);
  };

  const handleMotorCountChange = (value) => {
    addNodes("motor", motorCount, value, "Motor", "motor");
    setMotorCount(value);
  };

  const handleValveCountChange = (value) => {
    addNodes("valve", valveCount, value, "Valve", "valve");
    setValveCount(value);
  };

  const handleBioFiltersChange = (value) => {
    addNodes("bio", bioFilters, value, "Biofilter", "bio");
    setBioFilters(value);
  };

  const handleOxygenUnitsChange = (value) => {
    addNodes("oxygen", oxygenUnits, value, "O₂", "oxygen");
    setOxygenUnits(value);
  };

  const handleConeCountChange = (value) => {
    addNodes("cone", coneCount, value, "Cone", "cone");
    setConeCount(value);
  };

  const handlePressureTanksChange = (value) => {
    addNodes("ptank", pressureTanks, value, "Return Tank", "tank");
    setPressureTanks(value);
  };

  const onConnect = useCallback((connection) => {
    setEdges((eds) => {
      const exists = eds.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          (edge.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
          (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
      );
      if (exists) return eds;
      return [
      ...eds,
      {
        ...connection,
        id: uniqueEdgeId(connection.source, connection.target, eds),
        type: "step",
        className: fluidClass(activeFluid),
        data: { fluid: activeFluid }
      }
      ];
    });
  }, [setEdges, activeFluid]);

  // Inspector edits write straight into node and edge data, so they export with the diagram
  const updateNodeData = useCallback((nodeId, patch) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node)));
  }, [setNodes]);

  const updateEdgeFluid = useCallback((edgeId, fluid) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId ? { ...edge, className: fluidClass(fluid), data: { ...edge.data, fluid } } : edge
      )
    );
  }, [setEdges]);

  const resolveEdgeReview = useCallback((edgeId) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id !== edgeId) return edge;
        const { review: _review, ...data } = edge.data ?? {};
        return { ...edge, className: fluidClass(data.fluid), data };
      })
    );
  }, [setEdges]);

  // Automatic mode: place a P&ID conversion on the canvas and keep the equipment counters in step
  const handlePidApply = useCallback(({ nodes: newNodes, edges: newEdges }, placement) => {
    const replace = placement === "replace";
    const combined = { nodes: replace ? newNodes : [...nodes, ...newNodes], edges: replace ? newEdges : [...edges, ...newEdges] };
    loadDiagram(prepareDiagram(combined, "the P&ID import result"));
  }, [nodes, edges, loadDiagram]);

  const handleLoadExample = (example) => {
    if (isDirty && !window.confirm(`Replace the current diagram with the "${example.name}" example? Your changes will be lost.`)) return;
    loadDiagram(prepareDiagram(example.build(), `the "${example.name}" example`));
  };

  const deleteEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    setSelectedEdge(null);
  }, [setEdges]);

  // Handle drag over canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle drop from inventory panel
  const handleDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    let elementData;
    try {
      elementData = JSON.parse(data);
    } catch {
      return;
    }

    const bounds = e.currentTarget.getBoundingClientRect();
    // Drop where the pointer is on the canvas, whatever the zoom and pan
    const position = flowInstance
      ? flowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      : { x: e.clientX - bounds.left, y: e.clientY - bounds.top };

    // Next free id for this type, so a symbol deleted earlier never leaves a clash behind
    const typeKey = elementData.type;
    const newId = nextNodeId(typeKey, nodes);
    const label = `${elementData.label} ${newId.slice(typeKey.length)}`;

    const newNode = {
      id: newId,
      type: elementData.type,
      position,
      data: { id: newId, label, isSelected: false }
    };

    setNodes((nds) => [...nds, newNode]);
    saveToHistory();

    // Update the count state based on the dropped element type
    // and highlight the corresponding counter
    switch (typeKey) {
      case "pump":
        setHighlightedCounter("pump");
        setIntakePumps((prev) => prev + 1);
        break;
      case "motor":
        setHighlightedCounter("motor");
        setMotorCount((prev) => prev + 1);
        break;
      case "valve":
        setHighlightedCounter("valve");
        setValveCount((prev) => prev + 1);
        break;
      case "bio":
        setHighlightedCounter("bio");
        setBioFilters((prev) => prev + 1);
        break;
      case "oxygen":
        setHighlightedCounter("oxygen");
        setOxygenUnits((prev) => prev + 1);
        break;
      case "cone":
        setHighlightedCounter("cone");
        setConeCount((prev) => prev + 1);
        break;
      case "tank":
        setHighlightedCounter("tank");
        setPressureTanks((prev) => prev + 1);
        break;
      default:
        break;
    }

    // Remove highlight after animation completes
    setTimeout(() => setHighlightedCounter(null), 600);
  };

  // Handle node click with Shift for multi-selection
  const handleNodeClickMulti = (event, node) => {
    if (event.shiftKey) {
      // Multi-selection mode - Shift+click builds a connection
      if (multiSelectNodes.length === 0) {
        setMultiSelectNodes([node.id]);
        setSelectedElement(null);
      } else if (multiSelectNodes.length === 1) {
        if (multiSelectNodes[0] === node.id) {
          // Clicked same node again, deselect
          setMultiSelectNodes([]);
        } else {
          // Create connection between two nodes
          createPipeConnection(multiSelectNodes[0], node.id);
          setMultiSelectNodes([]);
        }
      }
    } else {
      // Normal selection
      setMultiSelectNodes([]);
      setSelectedElement(selectedElement === node.id ? null : node.id);
      setSelectedEdge(null);
    }
    event.stopPropagation();
  };

  // Create a pipe connection between two nodes
  const createPipeConnection = (sourceId, targetId) => {
    // One Shift + click pipe per pair of symbols
    if (edges.some((e) => e.source === sourceId && e.target === targetId)) return;
    const edgeId = uniqueEdgeId(sourceId, targetId, edges);

    setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        className: fluidClass(activeFluid),
        data: { fluid: activeFluid }
      }
    ]);
    saveToHistory();
  };

  // Handle edge click to select it
  const handleEdgeClick = (event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge.id);
    setSelectedElement(null);
    setMultiSelectNodes([]);
  };

  // Handle canvas click
  const handleCanvasClick = () => {
    setSelectedElement(null);
    setMultiSelectNodes([]);
    setSelectedEdge(null);
  };

  // Handle keyboard events for deleting edges
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" && selectedEdge) {
        setEdges((eds) => {
          const newEdges = eds.filter((edge) => edge.id !== selectedEdge);
          // Save to history after state updates
          setTimeout(() => {
            if (!isUndoRedoing.current) {
              saveToHistory();
            }
          }, 0);
          return newEdges;
        });
        setSelectedEdge(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdge]);

  // Export design as JSON
  const handleExport = () => {
    const designData = {
      version: 1,
      timestamp: new Date().toISOString(),
      config: {
        intakePumps,
        bioFilters,
        oxygenUnits,
        pressureTanks,
        motorCount,
        valveCount,
        coneCount
      },
      nodes,
      edges
    };
    const json = JSON.stringify(designData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scada-design-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import design from JSON
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const designData = JSON.parse(event.target?.result);
          const config = designData.config;
          // Keep the counters the file was saved with; older files without them count the symbols
          const counts = config && {
            pump: config.intakePumps,
            bio: config.bioFilters,
            oxygen: config.oxygenUnits,
            tank: config.pressureTanks,
            motor: config.motorCount,
            valve: config.valveCount,
            cone: config.coneCount
          };
          loadDiagram(prepareDiagram({ nodes: designData.nodes ?? [], edges: designData.edges ?? [] }, `"${file.name}"`, counts));
        } catch (error) {
          alert("Error importing file: " + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const componentCounts = [
    { label: "Pumps", value: intakePumps, onChange: handleIntakePumpsChange, key: "pump" },
    { label: "Motors", value: motorCount, onChange: handleMotorCountChange, key: "motor" },
    { label: "Valves", value: valveCount, onChange: handleValveCountChange, key: "valve" },
    { label: "Biofilters", value: bioFilters, onChange: handleBioFiltersChange, key: "bio" },
    { label: "O₂ units", value: oxygenUnits, onChange: handleOxygenUnitsChange, key: "oxygen" },
    { label: "Tanks", value: pressureTanks, onChange: handlePressureTanksChange, key: "tank" },
    { label: "Cones", value: coneCount, onChange: handleConeCountChange, key: "cone" }
  ];

  return (
    <main className="editor-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">SG</div>
          <div className="brand-copy">
            <span className="brand-name">SCADA Generator</span>
            <span className="brand-subtitle">Process editor</span>
          </div>
        </div>
        <span className="header-context">RAS system · Diagram workspace</span>
      </header>

      <section className="editor-toolbar" aria-label="Diagram controls">
        <div className="toolbar-main">
          <button
            type="button"
            className={`toolbar-button${inventoryOpen ? " toolbar-button--active" : ""}`}
            onClick={() => setInventoryOpen((open) => !open)}
            aria-expanded={inventoryOpen}
            aria-controls="inventory-panel"
          >
            <PanelLeft size={15} strokeWidth={1.8} />
            Elements
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => setPidOpen(true)}
            title="Generate a SCADA overview from an engineering P&ID"
          >
            <FileScan size={15} strokeWidth={1.8} />
            Import P&amp;ID
          </button>
          <ExamplesMenu onLoad={handleLoadExample} />

          <span className="toolbar-divider" aria-hidden="true" />
          <span className="toolbar-label">Equipment count</span>
          <div className="counter-group">
            {componentCounts.map((item) => (
              <label className="element-counter" key={item.key}>
                <span className="counter-label">{item.label}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={item.value}
                  onChange={(event) => item.onChange(parseInt(event.target.value, 10) || 0)}
                  className={highlightedCounter === item.key ? "counter-pulse" : ""}
                  aria-label={`${item.label} count`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className="toolbar-button toolbar-button--primary"
            onClick={handleExport}
            title="Download diagram as JSON"
          >
            <Download size={14} strokeWidth={1.8} />
            Export
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={handleImport}
            title="Import diagram from JSON"
          >
            <Upload size={14} strokeWidth={1.8} />
            Import
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={handleReset}
            disabled={!isDirty}
            title={isDirty ? `Discard changes and go back to ${baseline.label}` : "No changes to reset"}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
            Reset
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--quiet-danger"
            onClick={handleClearAll}
            title="Remove all elements from the diagram"
          >
            <Trash2 size={14} strokeWidth={1.8} />
            Clear
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => setHelpOpen(true)}
            title="Help and instructions"
          >
            <HelpCircle size={15} strokeWidth={1.8} />
            Help
          </button>
        </div>
      </section>

      <section
        className="canvas-stage"
        aria-label="Process diagram canvas"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClickMulti}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handleCanvasClick}
          nodeTypes={nodeTypes}
          onInit={setFlowInstance}
          fitView
        >
          <Background color="var(--grid-dot)" gap={24} size={1} />
        </ReactFlow>
        <div className="canvas-status" aria-live="polite">
          <span className="canvas-meta">
            <strong>{nodes.filter((node) => node.type !== "label").length}</strong> equipment
            <span aria-hidden="true">·</span>
            <strong>{edges.length}</strong> connections
          </span>
          <span className="canvas-meta">Shift + click to connect</span>
        </div>
        <InventoryPanel
          isOpen={inventoryOpen}
          onToggle={() => setInventoryOpen(false)}
          activeFluid={activeFluid}
          onFluidChange={setActiveFluid}
        />
        <InspectorPanel
          node={nodes.find((node) => node.id === selectedElement)}
          edge={edges.find((edge) => edge.id === selectedEdge)}
          onNodeChange={updateNodeData}
          onEdgeFluidChange={updateEdgeFluid}
          onEdgeDelete={deleteEdge}
          onEdgeResolve={resolveEdgeReview}
          onClose={handleCanvasClick}
        />
      </section>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <PidImportModal
        isOpen={pidOpen}
        onClose={() => setPidOpen(false)}
        existingNodes={nodes}
        onApply={handlePidApply}
      />
    </main>
  );
}