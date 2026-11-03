import { useState } from "react";
import { Search, X } from "lucide-react";
import { ELEMENTS, FLUIDS } from "./scada/catalog";

const CATEGORIES = [...new Set(ELEMENTS.map((element) => element.category))];

export function ElementIcon({ element }) {
  const { Symbol, width, height } = element;
  if (element.readout) return <Symbol data={{ value: "7.2", unit: "pH" }} />;
  // Fit the canvas size into the 34px icon box without changing its proportions.
  const scale = Math.min(34 / width, 34 / height, 1);
  return <Symbol running width={width * scale} height={height * scale} />;
}

export default function InventoryPanel({ isOpen, onToggle, activeFluid, onFluidChange }) {
  const [draggedElement, setDraggedElement] = useState(null);
  const [query, setQuery] = useState("");

  const handleDragStart = (event, element) => {
    setDraggedElement(element);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text", JSON.stringify({ type: element.type, label: element.label }));
  };

  const needle = query.trim().toLowerCase();
  const matches = (element) =>
    !needle || element.label.toLowerCase().includes(needle) || element.category.toLowerCase().includes(needle);

  return (
    <aside
      id="inventory-panel"
      className={`inventory-panel${isOpen ? " is-open" : ""}`}
      aria-label="Equipment inventory"
      aria-hidden={!isOpen}
    >
      <div className="inventory-content">
        <div className="inventory-heading">
          <div>
            <span className="eyebrow">Library</span>
            <h2>Elements</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onToggle}
            aria-label="Close equipment inventory"
          >
            <X size={16} />
          </button>
        </div>
        <p className="inventory-hint">Drag a symbol onto the canvas to add it to your diagram.</p>

        <label className="inventory-search">
          <Search size={13} strokeWidth={1.8} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter elements"
            aria-label="Filter elements"
          />
        </label>

        {CATEGORIES.map((category) => {
          const items = ELEMENTS.filter((element) => element.category === category && matches(element));
          if (items.length === 0) return null;
          return (
            <section className="inventory-group" key={category}>
              <h3 className="inventory-group-title">{category}</h3>
              <div className="inventory-list">
                {items.map((element) => (
                  <div
                    key={element.type}
                    className={`inventory-item${draggedElement?.type === element.type ? " is-dragging" : ""}`}
                    draggable
                    onDragStart={(event) => handleDragStart(event, element)}
                    onDragEnd={() => setDraggedElement(null)}
                  >
                    <span className="inventory-icon" aria-hidden="true">
                      <ElementIcon element={element} />
                    </span>
                    <span className="inventory-item-label">{element.label}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section className="inventory-group">
          <h3 className="inventory-group-title">Pipes</h3>
          <p className="inventory-hint">Fluid used for new connections. Select a pipe on the canvas to change it.</p>
          <div className="fluid-list" role="radiogroup" aria-label="Fluid for new connections">
            {FLUIDS.map((fluid) => (
              <button
                key={fluid.key || "none"}
                type="button"
                role="radio"
                aria-checked={activeFluid === fluid.key}
                className={`fluid-option${activeFluid === fluid.key ? " is-active" : ""}`}
                onClick={() => onFluidChange(fluid.key)}
              >
                <FluidSwatch fluid={fluid} />
                {fluid.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export function FluidSwatch({ fluid }) {
  return (
    <svg className="fluid-swatch" width="28" height="8" viewBox="0 0 28 8" aria-hidden="true">
      <path
        d="M2 4 H26"
        fill="none"
        stroke={fluid.key ? `var(--color-fl-${fluid.key})` : "var(--color-sc-pipe)"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={fluid.dashed ? "7 6" : undefined}
      />
    </svg>
  );
}
