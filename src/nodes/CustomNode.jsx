import { useState } from "react";
import { Handle, Position } from "reactflow";

export default function CustomNode({ data, isConnectable }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || "Custom");

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

      {/* Empty Box Visual */}
      <div
        style={{
          width: "50px",
          height: "50px",
          border: "2px dashed #999",
          borderRadius: "4px",
          margin: "4px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          fontSize: "24px",
          color: "#bbb"
        }}
      >
        ✚
      </div>

      {isEditing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBlur();
            }
          }}
          style={{
            marginTop: "4px",
            padding: "4px",
            fontSize: "12px",
            border: "1px solid #4ecdc4",
            borderRadius: "3px",
            width: "80px"
          }}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          style={{
            marginTop: "4px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: "pointer",
            minHeight: "16px",
            color: "#333"
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
