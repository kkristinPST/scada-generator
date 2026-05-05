import { useState } from "react";

const AVAILABLE_ELEMENTS = [
  { type: "pump", label: "Pump", icon: "🚿" },
  { type: "motor", label: "Motor", icon: "⚡" },
  { type: "valve", label: "Valve", icon: "🔀" },
  { type: "bio", label: "Biofilter", icon: "🌱" },
  { type: "tank", label: "Tank", icon: "🛢️" },
  { type: "oxygen", label: "Oxygen Unit", icon: "💨" },
  { type: "cone", label: "Cone", icon: "🔻" },
  { type: "sensor", label: "Sensor", icon: "📊" }
];

export default function InventoryPanel({ isOpen, onToggle }) {
  const [draggedElement, setDraggedElement] = useState(null);

  const handleDragStart = (e, element) => {
    setDraggedElement(element);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text", JSON.stringify(element));
  };

  const handleDragEnd = () => {
    setDraggedElement(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          top: "60px",
          left: "10px",
          zIndex: 100,
          padding: "8px 12px",
          backgroundColor: "#4ecdc4",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "bold",
          transition: "all 0.3s ease"
        }}
        title="Toggle Inventory"
      >
        {isOpen ? "◄ Hide" : "► Show"}
      </button>

      {/* Inventory Panel */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: "50px",
          width: "200px",
          height: "calc(100vh - 60px)",
          backgroundColor: "#f0f0f0",
          borderRight: "2px solid #ddd",
          boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 99,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}
      >
        <div style={{ padding: "12px" }}>
          <h3 style={{ margin: "50px 0 12px 0", fontSize: "14px", color: "#333" }}>
            Elements
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {AVAILABLE_ELEMENTS.map((element) => (
              <div
                key={element.type}
                draggable
                onDragStart={(e) => handleDragStart(e, element)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: "10px",
                  backgroundColor: draggedElement?.type === element.type ? "#4ecdc4" : "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "grab",
                  fontSize: "12px",
                  fontWeight: "500",
                  userSelect: "none",
                  transition: "all 0.2s ease",
                  opacity: draggedElement?.type === element.type ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onDragOver={handleDragOver}
              >
                <span style={{ fontSize: "16px" }}>{element.icon}</span>
                <span>{element.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
