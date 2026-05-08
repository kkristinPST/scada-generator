import { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from "reactflow";
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

  const verticalSpacing = 100;
  const oxygenCols = 4;

  let xPos = 50;

  // Section 1: Intake Pumps
  const pumpNodeIds = [];
  let yPos = 100;
  for (let i = 1; i <= intakePumps; i++) {
    const id = `pump${i}`;
    newNodes.push({
      id,
      type: "pump",
      position: { x: xPos, y: yPos },
      data: { id, label: `Pump ${i}`, handles: { top: true, bottom: true, left: false, right: false } }
    });
    pumpNodeIds.push(id);
    yPos += verticalSpacing;
  }

  xPos += 280;
  yPos = 100;

  // Section 2: Motors
  const motorNodeIds = [];
  for (let i = 1; i <= motorCount; i++) {
    const id = `motor${i}`;
    newNodes.push({
      id,
      type: "motor",
      position: { x: xPos, y: yPos },
      data: { id, label: `Motor ${i}`, handles: { top: true, bottom: true, left: false, right: false } }
    });
    motorNodeIds.push(id);
    yPos += verticalSpacing;
  }

  xPos += 280;
  yPos = 100;

  // Section 3: Valves
  const valveNodeIds = [];
  for (let i = 1; i <= valveCount; i++) {
    const id = `valve${i}`;
    newNodes.push({
      id,
      type: "valve",
      position: { x: xPos, y: yPos },
      data: { id, label: `Valve ${i}`, handles: { top: true, bottom: true, left: false, right: false } }
    });
    valveNodeIds.push(id);
    yPos += verticalSpacing;
  }

  xPos += 280;
  yPos = 100;

  // Section 4: Biofilters
  const bioNodeIds = [];
  for (let i = 1; i <= bioFilters; i++) {
    const id = `bio${i}`;
    newNodes.push({
      id,
      type: "bio",
      position: { x: xPos, y: yPos },
      data: { id, label: `Biofilter ${i}`, handles: { top: true, bottom: true, left: false, right: false } }
    });
    bioNodeIds.push(id);
    yPos += verticalSpacing;
  }

  xPos += 350;
  yPos = 150;

  // Section 5: Main Tank
  const tankId = "tank1";
  newNodes.push({
    id: tankId,
    type: "tank",
    position: { x: xPos, y: yPos },
    data: { id: tankId, label: "Main Tank", handles: { top: true, bottom: true, left: true, right: true } }
  });

  xPos += 350;
  yPos = 400;

  // Section 6: Oxygen/Aeration Units (Grid layout)
  const oxygenNodeIds = [];
  const oxyXPos = xPos - 100;
  const oxyYPos = yPos;

  for (let i = 1; i <= oxygenUnits; i++) {
    const id = `oxygen${i}`;
    const col = (i - 1) % oxygenCols;
    const row = Math.floor((i - 1) / oxygenCols);

    newNodes.push({
      id,
      type: "oxygen",
      position: {
        x: oxyXPos + col * 150,
        y: oxyYPos + row * 120
      },
      data: { id, label: `O₂ ${i}`, handles: { top: true, bottom: true, left: false, right: false } }
    });
    oxygenNodeIds.push(id);
  }

  // Section 7: Cones (Settlement tanks)
  xPos += 250;
  yPos = oxyYPos;
  const coneNodeIds = [];
  for (let i = 1; i <= coneCount; i++) {
    const id = `cone${i}`;
    newNodes.push({
      id,
      type: "cone",
      position: { x: xPos, y: yPos },
      data: { id, label: `Cone ${i}`, handles: { top: true, bottom: true, left: false, right: false } }
    });
    coneNodeIds.push(id);
    yPos += verticalSpacing;
  }

  // Section 8: Return Tanks
  xPos += 280;
  yPos = oxyYPos;
  for (let i = 1; i <= pressureTanks; i++) {
    const id = `ptank${i}`;
    newNodes.push({
      id,
      type: "tank",
      position: { x: xPos, y: yPos },
      data: { id, label: `Return Tank ${i}` }
    });
    yPos += verticalSpacing;
  }

  // Add default edges connecting the sections
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

  // Main Tank -> Oxygen Units
  for (let i = 0; i < oxygenNodeIds.length; i++) {
    edges.push({
      id: `e${tankId}-${oxygenNodeIds[i]}`,
      source: tankId,
      target: oxygenNodeIds[i],
      type: "smoothstep"
    });
  }

  // Oxygen -> Cones
  for (let i = 0; i < Math.min(oxygenNodeIds.length, coneNodeIds.length); i++) {
    edges.push({
      id: `e${oxygenNodeIds[i]}-${coneNodeIds[i]}`,
      source: oxygenNodeIds[i],
      target: coneNodeIds[i],
      type: "smoothstep"
    });
  }

  // Cones -> Return Tanks
  const returnTankIds = [];
  for (let i = 1; i <= pressureTanks; i++) {
    returnTankIds.push(`ptank${i}`);
  }
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
  const [intakePumps, setIntakePumps] = useState(2);
  const [bioFilters, setBioFilters] = useState(2);
  const [oxygenUnits, setOxygenUnits] = useState(8);
  const [pressureTanks, setPressureTanks] = useState(2);
  const [motorCount, setMotorCount] = useState(2);
  const [valveCount, setValveCount] = useState(2);
  const [coneCount, setConeCount] = useState(2);
  const [selectedElement, setSelectedElement] = useState(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [multiSelectNodes, setMultiSelectNodes] = useState([]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const isInitialized = useRef(false);
  const elementCounterRef = useRef({});

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
        setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge));
        setSelectedEdge(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdge, setEdges]);

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
            { label: "O₂", value: oxygenUnits, onChange: handleOxygenUnitsChange },
            { label: "Cones", value: coneCount, onChange: handleConeCountChange },
            { label: "Tanks", value: pressureTanks, onChange: handlePressureTanksChange }
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

        <button
          onClick={resetLayout}
          style={{
            padding: "6px 12px",
            backgroundColor: "#ff6b6b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            whiteSpace: "nowrap"
          }}
        >
          ↻ Reset Layout
        </button>

        <button
          onClick={() => setHelpOpen(true)}
          style={{
            padding: "6px 12px",
            backgroundColor: "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            whiteSpace: "nowrap"
          }}
          title="Help & Instructions"
        >
        Help
        </button>

        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#666" }}>
          💡 Shift+Click to connect | Drag handles to create pipes | Click pipes to select/delete
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