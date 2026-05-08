import { useState } from "react";
import pumpImg from "./assets/pump.svg";
import motorImg from "./assets/motor.svg";
import valveImg from "./assets/valve.svg";
import tankImg from "./assets/tank.svg";
import coneImg from "./assets/cone.svg";
import uvPanelImg from "./assets/UV panel.png";

const AVAILABLE_ELEMENTS = [
  { type: "pump", label: "Pump", icon: pumpImg, isImage: true },
  { type: "motor", label: "Motor", icon: motorImg, isImage: true },
  { type: "valve", label: "Valve", icon: valveImg, isImage: true },
  { type: "bio", label: "Biofilter", icon: "biofilter", isImage: false },
  { type: "tank", label: "Tank", icon: tankImg, isImage: true },
  { type: "cone", label: "Cone", icon: coneImg, isImage: true },
  { type: "uv", label: "UV Panel", icon: uvPanelImg, isImage: true },
  { type: "custom", label: "Custom Element", icon: "✚", isImage: false }
];

const BiofilterIcon = () => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 60 60"
    style={{ display: "block" }}
  >
    <circle cx="30" cy="30" r="22" fill="none" stroke="#16a34a" strokeWidth="2" />
    <circle cx="30" cy="30" r="18" fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.5" />
    <circle cx="30" cy="30" r="10" fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.3" />
  </svg>
);

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
                  gap: "8px"
                }}
                onDragOver={handleDragOver}
              >
                {element.isImage ? (
                  <img
                    src={element.icon}
                    alt={element.label}
                    style={{
                      width: "30px",
                      height: "30px",
                      objectFit: "contain"
                    }}
                  />
                ) : element.icon === "biofilter" ? (
                  <BiofilterIcon />
                ) : (
                  <span style={{ fontSize: "18px", minWidth: "30px", textAlign: "center" }}>
                    {element.icon}
                  </span>
                )}
                <span>{element.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
