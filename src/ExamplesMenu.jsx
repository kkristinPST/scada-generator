import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutTemplate } from "lucide-react";
import { EXAMPLES } from "./examples";

// Toolbar menu that loads one of the example diagrams onto the canvas.
export default function ExamplesMenu({ onLoad }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [isOpen]);

  return (
    <div className="examples-menu" ref={menuRef}>
      <button
        type="button"
        className={`toolbar-button${isOpen ? " toolbar-button--active" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Load an example diagram"
      >
        <LayoutTemplate size={15} strokeWidth={1.8} />
        Examples
        <ChevronDown size={13} strokeWidth={1.8} />
      </button>
      {isOpen && (
        <div className="examples-popover" role="menu">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              role="menuitem"
              className="examples-item"
              onClick={() => {
                setIsOpen(false);
                onLoad(example);
              }}
            >
              <strong>{example.name}</strong>
              <small>{example.description}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
