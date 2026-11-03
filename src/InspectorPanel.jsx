import { Check, Trash2, X } from "lucide-react";
import { ELEMENTS_BY_TYPE, FLUIDS } from "./scada/catalog";
import { FluidSwatch } from "./InventoryPanel";

const ALARMS = [
  { value: "none", label: "None" },
  { value: "crit", label: "Critical" },
  { value: "high", label: "High" },
  { value: "lo", label: "Medium / low" }
];

const SUPPRESSIONS = [
  { value: "none", label: "None" },
  { value: "blocked", label: "Blocked" },
  { value: "oos", label: "Out of service" }
];

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="inspector-field">
      <span className="inspector-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? "is-active" : ""}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="inspector-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

// Shown on anything generated from a P&ID that the import flagged as uncertain.
function ReviewNote({ review, onResolve }) {
  if (!review) return null;
  return (
    <div className="review-note" role="note">
      <span className="inspector-label">Needs review</span>
      <p>{review}</p>
      <button type="button" className="toolbar-button" onClick={onResolve}>
        <Check size={14} strokeWidth={1.8} />
        Mark as reviewed
      </button>
    </div>
  );
}

function PidSource({ pid }) {
  if (!pid) return null;
  return (
    <div className="pid-source">
      <span className="inspector-label">From P&amp;ID</span>
      <dl>
        {pid.tag && (<><dt>Tag</dt><dd>{pid.tag}</dd></>)}
        {pid.name && (<><dt>Name</dt><dd>{pid.name}</dd></>)}
        {pid.source && (<><dt>Symbol</dt><dd>{pid.source}</dd></>)}
        {pid.confidence && (<><dt>Confidence</dt><dd>{pid.confidence}</dd></>)}
      </dl>
    </div>
  );
}

function NodeInspector({ node, onChange }) {
  const element = ELEMENTS_BY_TYPE[node.type] ?? ELEMENTS_BY_TYPE.custom;
  const data = node.data;
  const set = (patch) => onChange(node.id, patch);
  const alarm = data.alarm ?? "none";
  const [onLabel, offLabel] = element.runLabels ?? ["Running", "Stopped"];

  const nameField = (
    <div className="inspector-field">
      <label className="inspector-label" htmlFor="inspector-name">Name</label>
      <input
        id="inspector-name"
        className="inspector-input"
        value={data.label ?? ""}
        placeholder={element.label}
        onChange={(event) => set({ label: event.target.value })}
      />
    </div>
  );

  if (element.annotation) return nameField;
  if (element.connector) {
    return (
      <>
        <ReviewNote review={data.review} onResolve={() => set({ review: undefined })} />
        {nameField}
      </>
    );
  }

  return (
    <>
      <ReviewNote review={data.review} onResolve={() => set({ review: undefined })} />
      {nameField}
      <div className="inspector-field">
        <label className="inspector-label" htmlFor="inspector-description">Description</label>
        <input
          id="inspector-description"
          className="inspector-input"
          value={data.description ?? ""}
          placeholder="Shown under the tag"
          onChange={(event) => set({ description: event.target.value })}
        />
      </div>

      {element.runState && (
        <Segmented
          label="State"
          value={data.running ?? true ? "run" : "stop"}
          options={[{ value: "run", label: onLabel }, { value: "stop", label: offLabel }]}
          onChange={(value) => set({ running: value === "run" })}
        />
      )}

      {element.mode && (
        <Segmented
          label="Mode"
          value={data.mode ?? "auto"}
          options={[{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }]}
          onChange={(value) => set({ mode: value })}
        />
      )}

      <Segmented label="Alarm" value={alarm} options={ALARMS} onChange={(value) => set({ alarm: value })} />
      {alarm !== "none" && (
        <Toggle label="Acknowledged" checked={Boolean(data.acked)} onChange={(acked) => set({ acked })} />
      )}

      <Segmented
        label="Alarm suppression"
        value={data.suppression ?? "none"}
        options={SUPPRESSIONS}
        onChange={(value) => set({ suppression: value })}
      />
      {alarm !== "none" && (data.suppression ?? "none") !== "none" && (
        <p className="inspector-note">An active alarm is drawn instead of the suppression mark.</p>
      )}

      {!element.readout && (
        <Toggle
          label="Equipment out of service"
          hint="PLC lock-out: ghosts the symbol"
          checked={Boolean(data.outOfService)}
          onChange={(outOfService) => set({ outOfService })}
        />
      )}

      {!element.readout && (
        <Toggle label="Show readout" checked={Boolean(data.showReadout)} onChange={(showReadout) => set({ showReadout })} />
      )}

      {(element.readout || data.showReadout) && (
        <div className="inspector-row">
          <div className="inspector-field">
            <label className="inspector-label" htmlFor="inspector-value">Value</label>
            <input
              id="inspector-value"
              className="inspector-input"
              value={data.value ?? ""}
              onChange={(event) => set({ value: event.target.value })}
            />
          </div>
          <div className="inspector-field">
            <label className="inspector-label" htmlFor="inspector-unit">Unit</label>
            <input
              id="inspector-unit"
              className="inspector-input"
              value={data.unit ?? ""}
              onChange={(event) => set({ unit: event.target.value })}
            />
          </div>
        </div>
      )}

      <PidSource pid={data.pid} />
    </>
  );
}

function EdgeInspector({ edge, onFluidChange, onDelete, onResolve }) {
  const current = edge.data?.fluid ?? "";
  return (
    <>
      <ReviewNote review={edge.data?.review} onResolve={() => onResolve(edge.id)} />
      <div className="inspector-field">
        <span className="inspector-label">Fluid</span>
        <div className="fluid-list" role="radiogroup" aria-label="Pipe fluid">
          {FLUIDS.map((fluid) => (
            <button
              key={fluid.key || "none"}
              type="button"
              role="radio"
              aria-checked={current === fluid.key}
              className={`fluid-option${current === fluid.key ? " is-active" : ""}`}
              onClick={() => onFluidChange(edge.id, fluid.key)}
            >
              <FluidSwatch fluid={fluid} />
              {fluid.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="toolbar-button toolbar-button--quiet-danger" onClick={() => onDelete(edge.id)}>
        <Trash2 size={14} strokeWidth={1.8} />
        Delete pipe
      </button>
    </>
  );
}

export default function InspectorPanel({ node, edge, onNodeChange, onEdgeFluidChange, onEdgeDelete, onEdgeResolve, onClose }) {
  if (!node && !edge) return null;
  const title = node ? (ELEMENTS_BY_TYPE[node.type] ?? ELEMENTS_BY_TYPE.custom).label : "Pipe";

  return (
    <aside className="inspector-panel" aria-label="Properties">
      <div className="inventory-heading">
        <div>
          <span className="eyebrow">Properties</span>
          <h2>{title}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close properties">
          <X size={16} />
        </button>
      </div>
      <div className="inspector-body">
        {node ? (
          <NodeInspector node={node} onChange={onNodeChange} />
        ) : (
          <EdgeInspector edge={edge} onFluidChange={onEdgeFluidChange} onDelete={onEdgeDelete} onResolve={onEdgeResolve} />
        )}
      </div>
    </aside>
  );
}
