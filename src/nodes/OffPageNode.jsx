import { useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";

// Off-page connector: where a line leaves the screen ("Fish tanks ›"), as on the existing SCADA mimics.
// Same handle ids as equipment, so generated return lines can route to it.
export default function OffPageNode({ id, data, isConnectable }) {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const label = data.label || "Off-page";
  const handleStyle = data.isSelected ? { width: 10, height: 10 } : undefined;

  const commit = () => {
    setIsEditing(false);
    setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, label: draft } } : node)));
  };

  return (
    <div className={`offpage${data.isSelected ? " is-selected" : ""}${data.review ? " needs-review" : ""}`} title={data.review ? `Needs review: ${data.review}` : undefined}>
      <Handle id="l" type="target" position={Position.Left} style={handleStyle} isConnectable={isConnectable} />
      <Handle id="r" type="source" position={Position.Right} style={handleStyle} isConnectable={isConnectable} />
      <Handle id="t" type="target" position={Position.Top} style={handleStyle} isConnectable={isConnectable} />
      <Handle id="bt" type="target" position={Position.Bottom} style={handleStyle} isConnectable={isConnectable} isConnectableStart={false} />
      <Handle id="b" type="source" position={Position.Bottom} style={handleStyle} isConnectable={isConnectable} />
      <div className="offpage-shape">
        {isEditing ? (
          <input
            autoFocus
            className="eq-tag-input nodrag"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === "Enter" && commit()}
            aria-label="Connector name"
          />
        ) : (
          <span
            onDoubleClick={() => {
              setDraft(label);
              setIsEditing(true);
            }}
            title="Double-click to rename"
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
