import { useEffect } from "react";
import { X } from "lucide-react";

export default function HelpModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="help-dialog-header">
          <div>
            <span className="eyebrow">Quick guide</span>
            <h2 id="help-title">Working with your diagram</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close help"
          >
            <X size={17} />
          </button>
        </header>

        <div className="help-dialog-content">
          <section>
            <h3>Add equipment</h3>
            <p>Open <strong>Elements</strong>, then drag a symbol from the equipment library onto the canvas.</p>
          </section>
          <section>
            <h3>Connect equipment</h3>
            <p>Hold <strong>Shift</strong> and click two components to connect them. You can also drag from a connection handle.</p>
          </section>
          <section>
            <h3>Edit the diagram</h3>
            <p>Drag components to reposition them. Double-click a label to rename it. Select a pipe and press <strong>Delete</strong> to remove the connection.</p>
          </section>
          <section>
            <h3>Set equipment state</h3>
            <p>Select a symbol to open its <strong>Properties</strong>. Set running or stopped, Auto or Manual mode, alarm priority and acknowledgement, alarm suppression, out of service, and an optional value readout. Symbols follow the NJORD SCADA rules: the body fill shows run or stop only, and alarms appear as a badge next to the symbol.</p>
          </section>
          <section>
            <h3>Import a P&amp;ID</h3>
            <p>Choose <strong>Import P&amp;ID</strong>, pick a PDF or SVG drawing and enter the page to import. <strong>Tag import</strong> reads the equipment and instrument tags printed on the drawing, maps them with the P&amp;ID legend codes and lays them out by process area. It is free and instant, and nothing leaves your browser. Tags do not show the piping, so draw the connections afterwards with Shift + click.</p>
            <p>In the review step you can untick elements and change a symbol before anything is added. Codes that are not in the legend are listed unticked. Generated elements are ordinary canvas elements. Anything uncertain has a dashed frame; select it to read the note, then choose <strong>Mark as reviewed</strong>.</p>
            <p><strong>AI analysis</strong> also works out the connections, but needs an Anthropic API key. The drawing is then sent from your browser to the Anthropic API.</p>
          </section>
          <section>
            <h3>Examples</h3>
            <p>Choose <strong>Examples</strong> to load a ready-made overview built from the existing SCADA screens: the RAS loop, water intake and energy, sludge and fish barrier, oxygenation and lift pumps, and lye dosing. Examples replace the current diagram and can be edited like any other.</p>
          </section>
          <section>
            <h3>Pipe fluids</h3>
            <p>Choose a fluid under <strong>Pipes</strong> in the Elements library to colour new connections. Select an existing pipe to change its fluid. Oxygen and gas lines are dashed.</p>
          </section>
          <section>
            <h3>Manage your layout</h3>
            <p>Adjust equipment counts in the toolbar or import and export a JSON diagram. <strong>Reset</strong> discards your changes and goes back to the diagram as it was loaded: the example you opened, the file you imported, or an empty canvas after <strong>Clear</strong>. It is available once something has changed.</p>
          </section>
          <section>
            <h3>Useful tips</h3>
            <ul>
              <li>Click the canvas background to clear your selection.</li>
              <li>Connection handles appear when an equipment symbol is selected.</li>
              <li>Choose <strong>Clear</strong> to remove every item from the canvas.</li>
              <li>To remove a pipe, click it and press <strong>Delete</strong>, or choose <strong>Delete pipe</strong> in Properties. A line that cannot be selected is a display leftover: reload the page.</li>
            </ul>
          </section>
        </div>

        <footer className="help-dialog-footer">
          <button type="button" className="toolbar-button toolbar-button--primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
