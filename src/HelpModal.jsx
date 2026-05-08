export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "30px",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          textAlign: "left"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", textAlign: "left", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#333" }}>Help and Instructions</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999"
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ color: "#555", lineHeight: "1.6", fontSize: "14px" }}>
          <h3 style={{ color: "#333", marginTop: "16px", marginBottom: "8px" }}>Adding Elements</h3>
          <p>
            1. Click the <strong>"► Show"</strong> button to open the inventory panel on the left<br />
            2. <strong>Drag any element</strong> from the panel onto the canvas<br />
            3. The element will be placed where you drop it
          </p>

          <h3 style={{ color: "#333", marginTop: "16px", marginBottom: "8px" }}>Creating Connections</h3>
          <p>
            1. Click an element to <strong>select</strong> it (handles appear)<br />
            2. Hold <strong>Shift</strong> and click another element to create a pipe connection<br />
            3. A smooth gray pipe will be drawn between them<br />
            4. You can also drag handles to create custom 90° pipes
          </p>

          <h3 style={{ color: "#333", marginTop: "16px", marginBottom: "8px" }}>Editing Connections</h3>
          <p>
            1. Click on a pipe line to <strong>select</strong> it<br />
            2. The line will highlight in blue<br />
            3. You can <strong>drag the line</strong> to reposition it<br />
            4. Press <strong>Delete</strong> to remove the connection<br />
            5. Handles are hidden by default for a clean canvas
          </p>

          <h3 style={{ color: "#333", marginTop: "16px", marginBottom: "8px" }}>Labeling Elements</h3>
          <p>
            1. <strong>Double-click</strong> any element label to edit it<br />
            2. Press Enter or click elsewhere to save
          </p>

          <h3 style={{ color: "#333", marginTop: "16px", marginBottom: "8px" }}>Reset</h3>
          <p>
            Click the <strong>"↻ Reset Layout"</strong> button to restore the default layout and reset all pipe visibility states. This will clear all custom connections and revert to the initial configuration.
          </p>

          <h3 style={{ color: "#333", marginTop: "16px", marginBottom: "8px" }}>Tips</h3>
          <ul style={{ marginTop: "8px" }}>
            <li>Adjust component counts without losing your layout</li>
            <li>Handles (colored dots) only appear when you select an element</li>
            <li>Default pipes (from initial layout) are lighter colored (gray)</li>
            <li>User-created pipes are darker (dark gray, 90° angles)</li>
            <li>Click the canvas background to deselect everything</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold"
          }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
