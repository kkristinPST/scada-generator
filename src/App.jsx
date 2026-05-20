import { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from "reactflow";
import { Download, Upload, HelpCircle, Undo2, Redo2 } from "lucide-react";
import "reactflow/dist/style.css";

import PumpNode from "./nodes/PumpNode";
import TankNode from "./nodes/TankNode";
import BiofilterNode from "./nodes/BiofilterNode";
import ValveNode from "./nodes/ValveNode";
import MotorNode from "./nodes/MotorNode";
import ConeNode from "./nodes/ConeNode";
import UVPanelNode from "./nodes/UVPanelNode";
import CustomNode from "./nodes/CustomNode";
import InventoryPanel from "./InventoryPanel";
import HelpModal from "./HelpModal";

// Pipe styling
const pipeStyles = `
  .react-flow__edge-step {
    stroke: #333;
    stroke-width: 3;
  }
  .react-flow__edge-step:hover {
    stroke: #0066cc;
    stroke-width: 4;
  }
  .react-flow__edge-step.selected {
    stroke: #0066cc !important;
    stroke-width: 4 !important;
  }
  .react-flow__edge-smoothstep {
    stroke: #666;
    stroke-width: 2.5;
  }
  .react-flow__edge-smoothstep:hover {
    stroke: #0066cc;
    stroke-width: 3.5;
  }
  .react-flow__edge-smoothstep.selected {
    stroke: #0066cc !important;
    stroke-width: 3.5 !important;
  }
`;

const generateRASLayout = (
  intakePumps,
  bioFilters,
  oxygenUnits,
  pressureTanks,
  motorCount,
  valveCount,
  coneCount
) => {
  const newNodes = [];
  const edges = [];

  // Reasonable flow layout:
  // Motor -> Pump -> Valve -> Biofilter -> Tank -> Cone -> Return Tank
  // (with optional oxygen units branching from tank)

  let xPos = 50;
  let yPos = 150;
  const horizontalSpacing = 280;
  const verticalSpacing = 100;

  // Section 1: Motors (left column, top)
  const motorNodeIds = [];
  let motorYPos = yPos - 150;
  for (let i = 1; i <= motorCount; i++) {
    const id = `motor${i}`;
    newNodes.push({
      id,
      type: "motor",
      position: { x: xPos, y: motorYPos },
      data: { id, label: `Motor ${i}` }
    });
    motorNodeIds.push(id);
    motorYPos += verticalSpacing;
  }

  // Section 2: Intake Pumps
  const pumpNodeIds = [];
  let pumpYPos = yPos;
  for (let i = 1; i <= intakePumps; i++) {
    const id = `pump${i}`;
    newNodes.push({
      id,
      type: "pump",
      position: { x: xPos, y: pumpYPos },
      data: { id, label: `Pump ${i}` }
    });
    pumpNodeIds.push(id);
    pumpYPos += verticalSpacing;
  }

  xPos += horizontalSpacing;

  // Section 3: Valves
  const valveNodeIds = [];
  let valveYPos = yPos;
  for (let i = 1; i <= valveCount; i++) {
    const id = `valve${i}`;
    newNodes.push({
      id,
      type: "valve",
      position: { x: xPos, y: valveYPos },
      data: { id, label: `Valve ${i}` }
    });
    valveNodeIds.push(id);
    valveYPos += verticalSpacing;
  }

  xPos += horizontalSpacing;

  // Section 4: Biofilters
  const bioNodeIds = [];
  let bioYPos = yPos;
  for (let i = 1; i <= bioFilters; i++) {
    const id = `bio${i}`;
    newNodes.push({
      id,
      type: "bio",
      position: { x: xPos, y: bioYPos },
      data: { id, label: `Biofilter ${i}` }
    });
    bioNodeIds.push(id);
    bioYPos += verticalSpacing;
  }

  xPos += horizontalSpacing;

  // Section 5: Main Tank (center-bottom)
  const tankId = "tank1";
  newNodes.push({
    id: tankId,
    type: "tank",
    position: { x: xPos, y: yPos + 50 },
    data: { id: tankId, label: "Main Tank" }
  });

  // Section 6: Oxygen Units (optional, branching down from tank)
  const oxygenNodeIds = [];
  if (oxygenUnits > 0) {
    const oxyXPos = xPos + horizontalSpacing * 0.5;
    const oxyYPos = yPos + 250;
    const oxygenCols = Math.ceil(Math.sqrt(oxygenUnits));

    for (let i = 1; i <= oxygenUnits; i++) {
      const id = `oxygen${i}`;
      const col = (i - 1) % oxygenCols;
      const row = Math.floor((i - 1) / oxygenCols);

      newNodes.push({
        id,
        type: "oxygen",
        position: {
          x: oxyXPos + col * 120,
          y: oxyYPos + row * 100
        },
        data: { id, label: `O₂ ${i}` }
      });
      oxygenNodeIds.push(id);
    }
  }

  xPos += horizontalSpacing;

  // Section 7: Cones (Settlement tanks)
  const coneNodeIds = [];
  let coneYPos = yPos + 50;
  for (let i = 1; i <= coneCount; i++) {
    const id = `cone${i}`;
    newNodes.push({
      id,
      type: "cone",
      position: { x: xPos, y: coneYPos },
      data: { id, label: `Cone ${i}` }
    });
    coneNodeIds.push(id);
    coneYPos += verticalSpacing;
  }

  xPos += horizontalSpacing;

  // Section 8: Return Tanks
  const returnTankIds = [];
  let returnYPos = yPos + 50;
  for (let i = 1; i <= pressureTanks; i++) {
    const id = `ptank${i}`;
    newNodes.push({
      id,
      type: "tank",
      position: { x: xPos, y: returnYPos },
      data: { id, label: `Return Tank ${i}` }
    });
    returnTankIds.push(id);
    returnYPos += verticalSpacing;
  }

  // Create connections
  // Motors -> Pumps
  for (let i = 0; i < Math.min(motorNodeIds.length, pumpNodeIds.length); i++) {
    edges.push({
      id: `e${motorNodeIds[i]}-${pumpNodeIds[i]}`,
      source: motorNodeIds[i],
      target: pumpNodeIds[i],
      type: "smoothstep"
    });
  }

  // Pumps -> Valves
  for (let i = 0; i < Math.min(pumpNodeIds.length, valveNodeIds.length); i++) {
    edges.push({
      id: `e${pumpNodeIds[i]}-${valveNodeIds[i]}`,
      source: pumpNodeIds[i],
      target: valveNodeIds[i],
      type: "smoothstep"
    });
  }

  // Valves -> Biofilters
  for (let i = 0; i < Math.min(valveNodeIds.length, bioNodeIds.length); i++) {
    edges.push({
      id: `e${valveNodeIds[i]}-${bioNodeIds[i]}`,
      source: valveNodeIds[i],
      target: bioNodeIds[i],
      type: "smoothstep"
    });
  }

  // Biofilters -> Main Tank
  for (let i = 0; i < bioNodeIds.length; i++) {
    edges.push({
      id: `e${bioNodeIds[i]}-${tankId}`,
      source: bioNodeIds[i],
      target: tankId,
      type: "smoothstep"
    });
  }

  // Main Tank -> Oxygen Units (if any)
  for (let i = 0; i < oxygenNodeIds.length; i++) {
    edges.push({
      id: `e${tankId}-${oxygenNodeIds[i]}`,
      source: tankId,
      target: oxygenNodeIds[i],
      type: "smoothstep"
    });
  }

  // Oxygen/Tank -> Cones
  const sourceForCones = oxygenNodeIds.length > 0 ? oxygenNodeIds[0] : tankId;
  for (let i = 0; i < coneNodeIds.length; i++) {
    edges.push({
      id: `e${sourceForCones}-${coneNodeIds[i]}`,
      source: sourceForCones,
      target: coneNodeIds[i],
      type: "smoothstep"
    });
  }

  // Cones -> Return Tanks
  for (let i = 0; i < coneNodeIds.length; i++) {
    const returnTankIdx = i % returnTankIds.length;
    edges.push({
      id: `e${coneNodeIds[i]}-${returnTankIds[returnTankIdx]}`,
      source: coneNodeIds[i],
      target: returnTankIds[returnTankIdx],
      type: "smoothstep"
    });
  }

  return { newNodes, edges };
};

const nodeTypes = {
  pump: PumpNode,
  tank: TankNode,
  bio: BiofilterNode,
  valve: ValveNode,
  motor: MotorNode,
  cone: ConeNode,
  uv: UVPanelNode,
  custom: CustomNode
};

export default function App() {
  const [intakePumps, setIntakePumps] = useState(1);
  const [bioFilters, setBioFilters] = useState(1);
  const [oxygenUnits, setOxygenUnits] = useState(0);
  const [pressureTanks, setPressureTanks] = useState(1);
  const [motorCount, setMotorCount] = useState(1);
  const [valveCount, setValveCount] = useState(1);
  const [coneCount, setConeCount] = useState(1);
  const [selectedElement, setSelectedElement] = useState(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [multiSelectNodes, setMultiSelectNodes] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const isInitialized = useRef(false);
  const elementCounterRef = useRef({});
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

  // Clear all nodes and edges
  const handleClearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to clear everything?")) {
      setNodes([]);
      setEdges([]);
      setIntakePumps(0);
      setBioFilters(0);
      setOxygenUnits(0);
      setPressureTanks(0);
      setMotorCount(0);
      setValveCount(0);
      setConeCount(0);
      setSelectedElement(null);
      setSelectedEdge(null);
    }
  }, []);

  // Initialize layout only on first render
  useEffect(() => {
    if (!isInitialized.current) {
      const { newNodes, edges: newEdges } = generateRASLayout(
        intakePumps,
        bioFilters,
        oxygenUnits,
        pressureTanks,
        motorCount,
        valveCount,
        coneCount
      );
      const nodesWithSelection = newNodes.map((node) => ({
        ...node,
        data: { ...node.data, isSelected: false }
      }));
      setNodes(nodesWithSelection);
      setEdges(newEdges);
      isInitialized.current = true;
    }
  }, []);

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
        const id = `${type}${i}`;
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

  // Reset to initial layout
  const resetLayout = () => {
    const { newNodes, edges: newEdges } = generateRASLayout(
      intakePumps,
      bioFilters,
      oxygenUnits,
      pressureTanks,
      motorCount,
      valveCount,
      coneCount
    );
    const nodesWithSelection = newNodes.map((node) => ({
      ...node,
      data: { ...node.data, isSelected: false }
    }));
    setNodes(nodesWithSelection);
    setEdges(newEdges);
    setSelectedElement(null);
  };

  const onConnect = useCallback((connection) => {
    setEdges((eds) => [...eds, { ...connection, id: `e${connection.source}-${connection.target}`, type: "step" }]);
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
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;

    // Position calculated from viewport (simplified without reactFlowInstance)
    // Adjust as needed based on actual zoom/pan state
    const position = { x, y };

    // Generate unique ID for new element
    const typeKey = elementData.type;
    if (!elementCounterRef.current[typeKey]) {
      elementCounterRef.current[typeKey] = nodes.filter((n) => n.type === typeKey).length + 1;
    } else {
      elementCounterRef.current[typeKey]++;
    }

    const newId = `${typeKey}${elementCounterRef.current[typeKey]}`;
    const label = `${elementData.label} ${elementCounterRef.current[typeKey]}`;

    const newNode = {
      id: newId,
      type: elementData.type,
      position,
      data: { id: newId, label, isSelected: false }
    };

    setNodes((nds) => [...nds, newNode]);
    saveToHistory();

    // Update the count state based on the dropped element type
    switch (typeKey) {
      case "pump":
        setIntakePumps((prev) => prev + 1);
        break;
      case "motor":
        setMotorCount((prev) => prev + 1);
        break;
      case "valve":
        setValveCount((prev) => prev + 1);
        break;
      case "bio":
        setBioFilters((prev) => prev + 1);
        break;
      case "oxygen":
        setOxygenUnits((prev) => prev + 1);
        break;
      case "cone":
        setConeCount((prev) => prev + 1);
        break;
      case "tank":
        setPressureTanks((prev) => prev + 1);
        break;
      default:
        break;
    }
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
    const edgeId = `e${sourceId}-${targetId}`;
    // Check if edge already exists
    if (edges.some((e) => e.id === edgeId)) return;

    setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed }
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
          setIntakePumps(designData.config.intakePumps);
          setBioFilters(designData.config.bioFilters);
          setOxygenUnits(designData.config.oxygenUnits);
          setPressureTanks(designData.config.pressureTanks);
          setMotorCount(designData.config.motorCount);
          setValveCount(designData.config.valveCount);
          setConeCount(designData.config.coneCount);
          setNodes(designData.nodes);
          setEdges(designData.edges);
          setSelectedElement(null);
          setSelectedEdge(null);
        } catch (error) {
          alert("Error importing file: " + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Save layout as default (to localStorage)
  const handleSaveLayout = () => {
    const layoutData = {
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
    localStorage.setItem("scada-default-layout", JSON.stringify(layoutData));
    alert("Layout saved as default!");
  };

  // Load default layout on startup (if exists)
  useEffect(() => {
    const savedLayout = localStorage.getItem("scada-default-layout");
    if (savedLayout && !isInitialized.current) {
      try {
        const layoutData = JSON.parse(savedLayout);
        setIntakePumps(layoutData.config.intakePumps);
        setBioFilters(layoutData.config.bioFilters);
        setOxygenUnits(layoutData.config.oxygenUnits);
        setPressureTanks(layoutData.config.pressureTanks);
        setMotorCount(layoutData.config.motorCount);
        setValveCount(layoutData.config.valveCount);
        setConeCount(layoutData.config.coneCount);
        const nodesWithSelection = layoutData.nodes.map((node) => ({
          ...node,
          data: { ...node.data, isSelected: false }
        }));
        setNodes(nodesWithSelection);
        setEdges(layoutData.edges);
        isInitialized.current = true;
      } catch (error) {
        console.error("Error loading saved layout:", error);
      }
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{pipeStyles}</style>
      
      {/* Minimal Control Panel */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "10px 12px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: "12px"
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {[
            { label: "Pumps", value: intakePumps, onChange: handleIntakePumpsChange },
            { label: "Motors", value: motorCount, onChange: handleMotorCountChange },
            { label: "Valves", value: valveCount, onChange: handleValveCountChange },
            { label: "Biofilters", value: bioFilters, onChange: handleBioFiltersChange },
            { label: "Tanks", value: pressureTanks, onChange: handlePressureTanksChange },
            { label: "Cones", value: coneCount, onChange: handleConeCountChange }
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <label style={{ whiteSpace: "nowrap", fontWeight: "bold" }}>{item.label}:</label>
              <input
                type="number"
                min="0"
                max="20"
                value={item.value}
                onChange={(e) => item.onChange(parseInt(e.target.value) || 0)}
                style={{
                  padding: "4px",
                  borderRadius: "3px",
                  border: "1px solid #999",
                  width: "35px",
                  fontSize: "12px"
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleSaveLayout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              whiteSpace: "nowrap"
            }}
            title="Save current layout as default"
          >
            Save Layout
          </button>

          <button
            onClick={handleClearAll}
            style={{
              padding: "6px 12px",
              backgroundColor: "transparent",
              color: "#e74c3c",
              border: "1px solid #e74c3c",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              whiteSpace: "nowrap"
            }}
            title="Clear all nodes and edges"
          >
            Clear All
          </button>

          {/* <button
            onClick={handleUndo}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "transparent",
              border: "none",
              cursor: historyStep > 0 ? "pointer" : "not-allowed",
              opacity: historyStep > 0 ? 0.6 : 0.3,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
            title="Undo"
            onMouseEnter={(e) => { if (historyStep > 0) e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { if (historyStep > 0) e.currentTarget.style.opacity = "0.6"; }}
          >
            <Undo2 size={20} color="#3a3a3a" strokeWidth={2} />
          </button>

          <button
            onClick={handleRedo}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "transparent",
              border: "none",
              cursor: historyStep < history.length - 1 ? "pointer" : "not-allowed",
              opacity: historyStep < history.length - 1 ? 0.6 : 0.3,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
            title="Redo"
            onMouseEnter={(e) => { if (historyStep < history.length - 1) e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { if (historyStep < history.length - 1) e.currentTarget.style.opacity = "0.6"; }}
          >
            <Redo2 size={20} color="#3a3a3a" strokeWidth={2} />
          </button> */}
        </div>

        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#666" }}>
          💡 Shift+Click to connect | Drag handles to create pipes | Click pipes to select/delete
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setHelpOpen(true)}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              opacity: 0.5,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
            title="Help & Instructions"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
          >
            <HelpCircle size={20} color="#555" strokeWidth={2} />
          </button>

          <button
            onClick={handleExport}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              opacity: 0.6,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
            title="Download as JSON"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          >
            <Download size={20} color="#3a3a3a" strokeWidth={2} />
          </button>

          <button
            onClick={handleImport}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              opacity: 0.6,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
            title="Import from JSON"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          >
            <Upload size={20} color="#3a3a3a" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div
        style={{ flex: 1 }}
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
          fitView
        >
          <Background />
        </ReactFlow>
      </div>

      <InventoryPanel isOpen={inventoryOpen} onToggle={() => setInventoryOpen(!inventoryOpen)} />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}