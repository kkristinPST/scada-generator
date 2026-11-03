import { useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { ELEMENTS_BY_TYPE } from "../scada/catalog";
import { AlarmBadge, ModeChip, Readout, SuppressionMark } from "../scada/symbols";

const TAG_TONE = { crit: "eq-tag--crit", high: "eq-tag--high", lo: "eq-tag--lo" };

// One node for every library element. Cluster geometry follows the NJORD spec,
// measured from the symbol centre: mode chip at cx-40/cy-20, badge at cx-32/cy+9,
// readout above the symbol, tag below. Fans sit their chip and badge lower.
export default function EquipmentNode({ id, type, data, isConnectable }) {
  const element = ELEMENTS_BY_TYPE[type] ?? ELEMENTS_BY_TYPE.custom;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const running = data.running ?? true;
  const alarm = data.alarm ?? "none";
  const suppression = data.suppression ?? "none";
  const outOfService = Boolean(data.outOfService);
  const { Symbol, width, height } = element;
  const label = data.label || element.label;

  const startEditing = () => {
    setDraft(label);
    setIsEditing(true);
  };

  const commitLabel = () => {
    setIsEditing(false);
    setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, label: draft } } : node)));
  };

  const cy = height / 2;
  const half = width / 2;
  const chipTop = cy + (element.fan ? -8 : -20);
  const badgeCy = cy + (element.fan ? 26 : 9);
  const chipStyle = { left: half - 40, top: chipTop };
  const badgeStyle = { left: half - 32 - 11, top: badgeCy - 11 };
  const handleStyle = data.isSelected ? { width: 10, height: 10 } : undefined;

  // An active alarm takes precedence over a suppression mark. A readout carries its
  // own alarm on its edge and value, so it never gets a second badge.
  const showBadge = !element.readout && alarm !== "none";
  const showSuppression = !element.readout && alarm === "none" && suppression !== "none";

  return (
    <div
      className={`eq-node${outOfService ? " is-oos" : ""}${data.isSelected ? " is-selected" : ""}${data.review ? " needs-review" : ""}`}
      title={data.review ? `Needs review: ${data.review}` : undefined}
    >
      {!element.readout && data.showReadout && (
        <Readout className="eq-readout" value={data.value ?? ""} unit={data.unit ?? ""} />
      )}

      <div className="eq-body" style={{ width, height }}>
        {/* Left/right come first: edges without a handle id attach to the first one, so flow reads left to right */}
        <Handle id="l" type="target" position={Position.Left} style={handleStyle} isConnectable={isConnectable} />
        <Handle id="r" type="source" position={Position.Right} style={handleStyle} isConnectable={isConnectable} />
        <Handle id="t" type="target" position={Position.Top} style={handleStyle} isConnectable={isConnectable} />
        {/* Return lines arrive from below. Drop-only, and rendered under the bottom source so dragging still starts there */}
        <Handle id="bt" type="target" position={Position.Bottom} style={handleStyle} isConnectable={isConnectable} isConnectableStart={false} />
        <Handle id="b" type="source" position={Position.Bottom} style={handleStyle} isConnectable={isConnectable} />

        {element.readout ? <Symbol data={data} /> : <Symbol running={running} width={width} height={height} />}

        {element.mode && <ModeChip mode={outOfService ? "oos" : data.mode ?? "auto"} style={chipStyle} />}
        {showBadge && <AlarmBadge priority={alarm} acked={Boolean(data.acked)} style={badgeStyle} />}
        {showSuppression && <SuppressionMark kind={suppression} style={badgeStyle} />}
      </div>

      {isEditing ? (
        <input
          autoFocus
          type="text"
          className="eq-tag-input nodrag"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitLabel}
          onKeyDown={(event) => event.key === "Enter" && commitLabel()}
          aria-label="Element name"
        />
      ) : (
        <div className={`eq-tag ${TAG_TONE[alarm] ?? ""}`} onDoubleClick={startEditing} title="Double-click to rename">
          {label}
        </div>
      )}
      {data.description && <div className="eq-desc">{data.description}</div>}
    </div>
  );
}
