import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CircleAlert, FileScan, LoaderCircle, Upload, X } from "lucide-react";
import { ElementIcon, FluidSwatch } from "./InventoryPanel";
import { ELEMENTS, ELEMENTS_BY_TYPE, FLUIDS } from "./scada/catalog";
import { buildDiagram, connectionKey, normalizeAnalysis } from "./pid/buildDiagram";
import { MAX_PAGES, parsePageSpec } from "./pid/pages";
import { estimateCost, MODEL_ID, MODEL_NAME, PRICE_PER_MTOK } from "./pid/model";

const KEY_STORAGE = "scada-anthropic-api-key";
const ACCEPTED_FILES = ".pdf,.svg,.png,.jpg,.jpeg,application/pdf,image/svg+xml,image/png,image/jpeg";
const SYMBOL_OPTIONS = ELEMENTS.filter((element) => !element.annotation);
const FLUID_BY_KEY = Object.fromEntries(FLUIDS.map((fluid) => [fluid.key, fluid]));

const MODES = [
  { value: "tags", label: "Tag import (no AI)" },
  { value: "ai", label: "AI analysis (API key)" }
];

const PHASES = {
  preparing: "Preparing the drawing",
  analysing: "Sending the drawing to Claude",
  thinking: "Reading the drawing and working out the process",
  writing: "Writing the process model"
};

const readStoredKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
};

const formatSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

const isPdf = (file) => Boolean(file) && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

// Page count and a thumbnail of the chosen page, so the right sheet is confirmed before anything is sent.
// State is only set from async callbacks and keyed by file and page, so stale results are ignored.
function usePdfPreview(file, pageSpec) {
  const [doc, setDoc] = useState({ file: null, pdf: null, error: "" });
  const [thumb, setThumb] = useState({ key: "", url: "" });

  useEffect(() => {
    if (!isPdf(file)) return undefined;
    let cancelled = false;
    let opened = null;
    import("./pid/pdf")
      .then(({ openPdf }) => openPdf(file))
      .then((pdf) => {
        opened = pdf;
        if (cancelled) pdf.destroy();
        else setDoc({ file, pdf, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setDoc({ file, pdf: null, error: error.message });
      });
    return () => {
      cancelled = true;
      opened?.destroy();
    };
  }, [file]);

  const current = doc.file === file ? doc : { pdf: null, error: "" };
  const pageCount = current.pdf?.numPages ?? 0;
  const parsed = pageCount ? parsePageSpec(pageSpec, pageCount) : { pages: [], error: "" };
  const firstPage = parsed.pages[0];
  const thumbKey = current.pdf && firstPage ? `${file.name}:${file.size}:${firstPage}` : "";

  useEffect(() => {
    if (!thumbKey) return undefined;
    let cancelled = false;
    import("./pid/pdf")
      .then(({ renderPage }) => renderPage(current.pdf, firstPage, 720))
      .then((canvas) => {
        if (!cancelled) setThumb({ key: thumbKey, url: canvas.toDataURL("image/png") });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thumbKey, current.pdf, firstPage]);

  return {
    isPdf: isPdf(file),
    loading: isPdf(file) && doc.file !== file,
    error: current.error,
    pageCount,
    pages: parsed.pages,
    pageError: parsed.error,
    thumb: thumb.key === thumbKey ? thumb.url : "",
    firstPage
  };
}

function Confidence({ value }) {
  if (value === "high") return null;
  return <span className={`confidence confidence--${value}`}>{value}</span>;
}

function UploadStep({ mode, setMode, file, setFile, pdf, pageSpec, setPageSpec, apiKey, setApiKey, remember, setRemember, notes, setNotes, error, onAnalyse }) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef(null);

  const pick = (files) => {
    if (files?.[0]) setFile(files[0]);
  };

  return (
    <>
      <div className="help-dialog-content">
        <div className="segmented" role="radiogroup" aria-label="Import method">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              className={mode === option.value ? "is-active" : ""}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {mode === "tags" ? (
          <p>
            Reads the equipment and instrument tags printed on the P&amp;ID, maps them with the legend codes and lays them
            out by process area. Free and instant. Tags do not show the piping, so you draw the connections afterwards.
          </p>
        ) : (
          <p>
            Claude reads the drawing, works out the process and its connections, keeps what an operator needs, and lays it
            out with the symbols from your Elements library. Needs an Anthropic API key.
          </p>
        )}
        <p className="inspector-note">You review the result before anything is added to the canvas.</p>

        <div
          className={`drop-zone${isOver ? " is-over" : ""}${file ? " has-file" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsOver(false);
            pick(event.dataTransfer.files);
          }}
        >
          <FileScan size={22} strokeWidth={1.5} aria-hidden="true" />
          {file ? (
            <span className="drop-zone-file">
              <strong>{file.name}</strong>
              <small>{formatSize(file.size)}</small>
            </span>
          ) : (
            <span>Drop a PDF, SVG, PNG or JPG drawing here</span>
          )}
          <button type="button" className="toolbar-button" onClick={() => inputRef.current?.click()}>
            <Upload size={14} strokeWidth={1.8} />
            {file ? "Choose another file" : "Choose file"}
          </button>
          <input ref={inputRef} type="file" accept={ACCEPTED_FILES} hidden onChange={(event) => pick(event.target.files)} />
        </div>

        {pdf.isPdf && (
          <div className="pid-pages">
            <div className="inspector-field">
              <label className="inspector-label" htmlFor="pid-pages">Pages to import</label>
              <input
                id="pid-pages"
                className="inspector-input"
                value={pageSpec}
                onChange={(event) => setPageSpec(event.target.value)}
                placeholder="3"
                inputMode="numeric"
                aria-describedby="pid-pages-hint"
              />
              <small id="pid-pages-hint" className={`inspector-note${pdf.pageError || pdf.error ? " pid-field-error" : ""}`}>
                {pdf.loading
                  ? "Reading the PDF…"
                  : pdf.error || pdf.pageError || `${pdf.pageCount} page${pdf.pageCount === 1 ? "" : "s"} in this PDF. For example 3, 3,5 or 2-4 (up to ${MAX_PAGES}).`}
              </small>
            </div>
            <figure className="pid-thumb">
              {pdf.thumb ? <img src={pdf.thumb} alt={`Page ${pdf.firstPage} of the PDF`} /> : <span>{pdf.loading ? "" : "No preview"}</span>}
              {pdf.thumb && <figcaption>Page {pdf.firstPage}</figcaption>}
            </figure>
          </div>
        )}

        {mode === "ai" && (
          <>
            <div className="inspector-field">
              <label className="inspector-label" htmlFor="pid-notes">Notes for the analysis (optional)</label>
              <textarea
                id="pid-notes"
                className="inspector-input pid-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="For example: only sheet 3, focus on the RAS loop, ignore the hatchery"
              />
            </div>

            <div className="inspector-field">
              <label className="inspector-label" htmlFor="pid-key">Anthropic API key</label>
              <input
                id="pid-key"
                className="inspector-input"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-ant-…"
              />
              <label className="inspector-toggle pid-remember">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>Remember the key in this browser</span>
              </label>
              <small className="inspector-note">
                The drawing and key go from your browser straight to the Anthropic API. Nothing passes through another server.
              </small>
              <small className="inspector-note pid-cost-note">
                Uses {MODEL_NAME} (<code>{MODEL_ID}</code>), billed to the account this key belongs to at ${PRICE_PER_MTOK.input} per
                million input tokens and ${PRICE_PER_MTOK.output} per million output tokens. One page is usually well under $1; the
                exact cost is shown after the analysis.
              </small>
            </div>
          </>
        )}

        {error && (
          <p className="pid-error" role="alert">
            <CircleAlert size={15} strokeWidth={1.8} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
      <footer className="help-dialog-footer">
        <button
          type="button"
          className="toolbar-button toolbar-button--primary"
          disabled={!file || (mode === "ai" && !apiKey.trim()) || (pdf.isPdf && (pdf.loading || Boolean(pdf.error) || pdf.pages.length === 0))}
          onClick={onAnalyse}
        >
          {mode === "tags" ? "Read tags" : "Analyse drawing"}
          <ArrowRight size={14} strokeWidth={1.8} />
        </button>
      </footer>
    </>
  );
}

function AnalysingStep({ progress, startedAt, onCancel }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.round((now - startedAt) / 1000));

  return (
    <>
      <div className="help-dialog-content pid-progress" aria-live="polite">
        <LoaderCircle className="spin" size={26} strokeWidth={1.5} aria-hidden="true" />
        <strong>{PHASES[progress.phase] ?? "Working"}</strong>
        <span>
          {seconds}s elapsed{progress.chars ? ` · ${progress.chars.toLocaleString()} characters received` : ""}
        </span>
        <small>Large drawing sets can take a few minutes.</small>
      </div>
      <footer className="help-dialog-footer">
        <button type="button" className="toolbar-button" onClick={onCancel}>Cancel</button>
      </footer>
    </>
  );
}

function ReviewStep({ model, meta, hasDiagram, onBack, onGenerate }) {
  const [excludedElements, setExcludedElements] = useState(() => new Set(model.elements.filter((element) => !element.include).map((element) => element.id)));
  const [excludedConnections, setExcludedConnections] = useState(
    () => new Set(model.connections.filter((connection) => connection.confidence === "low").map(connectionKey))
  );
  const [typeOverrides, setTypeOverrides] = useState({});
  const [placement, setPlacement] = useState(hasDiagram ? "append" : "replace");

  const byId = useMemo(() => Object.fromEntries(model.elements.map((element) => [element.id, element])), [model]);
  const labelOf = (id) => byId[id]?.tag || byId[id]?.name || id;
  const toggle = (setter, key) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const keptCount = model.elements.length - excludedElements.size;
  const flagged = model.elements.filter((element) => element.confidence !== "high").length;

  return (
    <>
      <div className="help-dialog-content pid-review">
        {model.summary && <p className="pid-summary">{model.summary}</p>}
        <p className="pid-meta">
          {model.elements.length} elements · {model.connections.length} connections · {flagged} to review
          {meta && ` · ${meta.inputTokens.toLocaleString()} input / ${meta.outputTokens.toLocaleString()} output tokens (about $${estimateCost(meta.inputTokens, meta.outputTokens).toFixed(2)})`}
          {meta?.fileNote && ` · drawing ${meta.fileNote}`}
        </p>

        {model.stages.map((stage) => {
          const members = model.elements.filter((element) => element.stageId === stage.id);
          if (members.length === 0) return null;
          return (
            <section key={stage.id}>
              <h3>{stage.name}</h3>
              <ul className="pid-list">
                {members.map((element) => {
                  const type = typeOverrides[element.id] ?? element.type;
                  const excluded = excludedElements.has(element.id);
                  return (
                    <li key={element.id} className={excluded ? "is-excluded" : ""}>
                      <input
                        type="checkbox"
                        checked={!excluded}
                        onChange={() => toggle(setExcludedElements, element.id)}
                        aria-label={`Include ${element.tag || element.name}`}
                      />
                      <span className="pid-icon" aria-hidden="true">
                        <ElementIcon element={ELEMENTS_BY_TYPE[type]} />
                      </span>
                      <span className="pid-item-text">
                        <strong>{element.tag || element.name}</strong>
                        <small>
                          {element.tag && element.name ? `${element.name} · ` : ""}
                          {element.attachedTo ? `measures ${labelOf(element.attachedTo)} · ` : ""}
                          {element.source}
                        </small>
                        {element.note && element.confidence !== "high" && <small className="pid-item-note">{element.note}</small>}
                      </span>
                      <Confidence value={element.confidence} />
                      <select
                        className="pid-type"
                        value={type}
                        onChange={(event) => setTypeOverrides((current) => ({ ...current, [element.id]: event.target.value }))}
                        aria-label={`Symbol for ${element.tag || element.name}`}
                      >
                        {SYMBOL_OPTIONS.map((option) => (
                          <option key={option.type} value={option.type}>{option.label}</option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section>
          <h3>Connections</h3>
          {model.connections.length === 0 ? (
            <p>No connections could be traced on the drawing. Connect the elements on the canvas.</p>
          ) : (
            <ul className="pid-list">
              {model.connections.map((connection) => {
                const key = connectionKey(connection);
                const excluded = excludedConnections.has(key);
                const fluid = FLUID_BY_KEY[connection.fluid] ?? FLUIDS[0];
                return (
                  <li key={key} className={excluded ? "is-excluded" : ""} title={connection.evidence || undefined}>
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => toggle(setExcludedConnections, key)}
                      aria-label={`Include connection ${labelOf(connection.from)} to ${labelOf(connection.to)}`}
                    />
                    <FluidSwatch fluid={fluid} />
                    <span className="pid-item-text">
                      <strong>{labelOf(connection.from)} → {labelOf(connection.to)}</strong>
                      <small>
                        {fluid.label}
                        {connection.confidence !== "high" && connection.evidence ? ` · ${connection.evidence}` : ""}
                      </small>
                    </span>
                    <Confidence value={connection.confidence} />
                  </li>
                );
              })}
            </ul>
          )}
          <small className="inspector-note">
            Low-confidence connections start unticked. Removing an element keeps its line: the pipe is bridged across it and flagged for review.
          </small>
        </section>

        {model.issues.length > 0 && (
          <section>
            <h3>Flagged for review</h3>
            <ul className="pid-notes-list">
              {model.issues.map((issue, index) => (
                <li key={index}>
                  {issue.elementId && <strong>{labelOf(issue.elementId)}: </strong>}
                  {issue.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        {model.omitted.length > 0 && (
          <details>
            <summary>Left out of the overview ({model.omitted.reduce((sum, item) => sum + (item.count || 1), 0)} items)</summary>
            <ul className="pid-notes-list">
              {model.omitted.map((item, index) => (
                <li key={index}>
                  <strong>{item.what}{item.count ? ` (${item.count})` : ""}</strong>
                  {item.reason && ` · ${item.reason}`}
                </li>
              ))}
            </ul>
          </details>
        )}

        {hasDiagram && (
          <div className="inspector-field">
            <span className="inspector-label">Place on canvas</span>
            <div className="segmented" role="radiogroup" aria-label="Place on canvas">
              {[
                { value: "append", label: "Add next to current diagram" },
                { value: "replace", label: "Replace current diagram" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={placement === option.value}
                  className={placement === option.value ? "is-active" : ""}
                  onClick={() => setPlacement(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="help-dialog-footer pid-footer">
        <button type="button" className="toolbar-button" onClick={onBack}>Import another drawing</button>
        <button
          type="button"
          className="toolbar-button toolbar-button--primary"
          disabled={keptCount === 0}
          onClick={() => onGenerate({ excludedElements, excludedConnections, typeOverrides }, placement)}
        >
          Generate diagram ({keptCount})
        </button>
      </footer>
    </>
  );
}

// Kept mounted while closed so an analysis survives closing and reopening the dialog.
export default function PidImportModal({ isOpen, onClose, existingNodes, onApply }) {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [apiKey, setApiKey] = useState(readStoredKey);
  const [remember, setRemember] = useState(() => Boolean(readStoredKey()));
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("tags");
  const [pageSpec, setPageSpec] = useState("1");
  const pdf = usePdfPreview(file, pageSpec);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ phase: "preparing", chars: 0 });
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && step !== "analysing") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, step]);

  if (!isOpen) return null;

  const handleReadTags = async () => {
    setError("");
    setProgress({ phase: "preparing", chars: 0 });
    setStartedAt(Date.now());
    setStep("analysing");
    try {
      const { readTags } = await import("./pid/tagImport");
      const model = normalizeAnalysis(await readTags({ file, pages: pdf.isPdf ? pdf.pages : undefined }));
      if (model.elements.length === 0) throw new Error(model.summary || "No equipment or instrument tags were found.");
      setResult({ model, meta: null, key: Date.now() });
      setStep("review");
    } catch (caught) {
      console.error("Tag import failed", caught);
      setError(caught?.message ?? String(caught));
      setStep("upload");
    }
  };

  const handleAnalyse = async () => {
    try {
      if (remember) localStorage.setItem(KEY_STORAGE, apiKey.trim());
      else localStorage.removeItem(KEY_STORAGE);
    } catch {
      // Storage can be unavailable (private mode); the key still works for this session.
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setStartedAt(Date.now());
    setProgress({ phase: "preparing", chars: 0 });
    setStep("analysing");
    try {
      // Loaded on demand so the API client is only downloaded by people who use automatic mode
      const { analyzePid } = await import("./pid/analyze");
      const { analysis, meta } = await analyzePid({
        apiKey: apiKey.trim(),
        file,
        pages: pdf.isPdf ? pdf.pages : undefined,
        notes,
        onProgress: setProgress,
        signal: controller.signal
      });
      const model = normalizeAnalysis(analysis);
      if (model.elements.length === 0) throw new Error("No process equipment was recognised on this drawing.");
      setResult({ model, meta, key: Date.now() });
      setStep("review");
    } catch (caught) {
      console.error("P&ID analysis failed", caught);
      setError(caught?.message ?? String(caught));
      setStep("upload");
    } finally {
      abortRef.current = null;
    }
  };

  const handleGenerate = (choices, placement) => {
    const append = placement === "append";
    const existing = append ? existingNodes : [];
    const origin = existing.length
      ? {
          x: Math.max(...existing.map((node) => node.position.x)) + 320,
          y: Math.min(...existing.map((node) => node.position.y)) + 90
        }
      : { x: 0, y: 0 };
    onApply(buildDiagram(result.model, { ...choices, existingNodes: existing, origin }), placement);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={step === "analysing" ? undefined : onClose}>
      <section
        className="help-dialog pid-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pid-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="help-dialog-header">
          <div>
            <span className="eyebrow">{mode === "tags" ? "Tag import" : "Automatic mode"}</span>
            <h2 id="pid-title">{step === "review" ? "Review the process overview" : "Import P&ID"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close import" disabled={step === "analysing"}>
            <X size={17} />
          </button>
        </header>

        {step === "upload" && (
          <UploadStep
            mode={mode}
            setMode={setMode}
            file={file}
            setFile={setFile}
            pdf={pdf}
            pageSpec={pageSpec}
            setPageSpec={setPageSpec}
            apiKey={apiKey}
            setApiKey={setApiKey}
            remember={remember}
            setRemember={setRemember}
            notes={notes}
            setNotes={setNotes}
            error={error}
            onAnalyse={mode === "tags" ? handleReadTags : handleAnalyse}
          />
        )}
        {step === "analysing" && <AnalysingStep progress={progress} startedAt={startedAt} onCancel={() => abortRef.current?.abort()} />}
        {step === "review" && result && (
          <ReviewStep
            key={result.key}
            model={result.model}
            meta={result.meta}
            hasDiagram={existingNodes.length > 0}
            onBack={() => setStep("upload")}
            onGenerate={handleGenerate}
          />
        )}
      </section>
    </div>
  );
}
