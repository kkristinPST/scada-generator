import { useState } from "react";
import { Handle, Position } from "reactflow";

export default function BiofilterNode({ data, isConnectable }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || "");

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div style={{ textAlign: "center", position: "relative", padding: "8px" }}>
      {/* Visible Handles - Show only when selected */}
      {data.isSelected && (
        <>
          <Handle type="target" position={Position.Top} style={{ background: "#ff6b6b", width: "10px", height: "10px" }} isConnectable={isConnectable} />
          <Handle type="source" position={Position.Bottom} style={{ background: "#4ecdc4", width: "10px", height: "10px" }} isConnectable={isConnectable} />
          <Handle type="target" position={Position.Left} style={{ background: "#ff6b6b", width: "10px", height: "10px" }} isConnectable={isConnectable} />
          <Handle type="source" position={Position.Right} style={{ background: "#4ecdc4", width: "10px", height: "10px" }} isConnectable={isConnectable} />
        </>
      )}
      {/* Hidden handles for connections */}
      {!data.isSelected && (
        <>
          <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
          <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
          <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
          <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
        </>
      )}

      <svg
        width="50"
        height="50"
        viewBox="0 0 60 60"
        style={{ margin: "4px auto", display: "block" }}
      >
        {/* Biofilter simplified circle */}
        <circle cx="30" cy="30" r="22" fill="none" stroke="#16a34a" strokeWidth="2" />
        <circle cx="30" cy="30" r="18" fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.5" />
        <circle cx="30" cy="30" r="10" fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.3" />
      </svg>

      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          style={{
            padding: "2px 4px",
            borderRadius: "3px",
            border: "1px solid #999",
            fontSize: "11px",
            textAlign: "center",
            width: "70px"
          }}
        />
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          style={{
            fontSize: 11,
            marginTop: 4,
            cursor: "pointer",
            padding: "2px 4px",
            borderRadius: "4px",
            backgroundColor: data.isSelected ? "#e3f2fd" : "transparent",
            border: data.isSelected ? "2px solid #2196f3" : "none"
          }}
        >
          {label || "Biofilter"}
        </div>
      )}
    </div>
  );
}