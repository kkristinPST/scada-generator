import { useState } from "react";
import { useReactFlow } from "reactflow";

// A stage or area heading. Annotation only: no handles, no state.
export default function LabelNode({ id, data }) {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const label = data.label || "Section";

  const commit = () => {
    setIsEditing(false);
    setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, label: draft } } : node)));
  };

  return (
    <div className={`section-label${data.isSelected ? " is-selected" : ""}`}>
      {isEditing ? (
        <input
          autoFocus
          className="eq-tag-input nodrag"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && commit()}
          aria-label="Section name"
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
  );
}
