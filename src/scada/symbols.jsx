// NJORD process symbols as React SVG.
// Geometry is taken from the design system's symbol pack; every colour is a
// token from scada.css. The body fill says run or stop and nothing else:
// alarms are carried by the badge, never by recolouring the symbol.

const body = (running) => (running ? "var(--color-sc-run)" : "var(--color-sc-stop)");
const EDGE = "var(--color-sc-edge)";

function Svg({ viewBox, width, height, title, children }) {
  return (
    <svg className="eq-symbol" viewBox={viewBox} width={width} height={height} role="img" aria-label={title}>
      {children}
    </svg>
  );
}

const PUMP_DISC =
  "M33.75 16.4297C33.75 7.3558 26.3942 0 17.3203 0C8.24645 0 0.890625 7.3558 0.890625 16.4297C0.890625 25.5035 8.24645 32.8594 17.3203 32.8594C26.3942 32.8594 33.75 25.5035 33.75 16.4297Z";

export function PumpSymbol({ running = true, width, height }) {
  return (
    <Svg viewBox="0 0 34 33" width={width} height={height} title="Pump">
      <path d={PUMP_DISC} fill="var(--color-sc-fill-lite)" />
      <path
        d="M17.2688 0.102936C8.22342 0.102936 0.890625 7.43573 0.890625 16.4812C0.890625 25.5267 8.22353 32.8594 17.2688 32.8594C26.3142 32.8594 33.6471 25.5266 33.6471 16.4812C33.6471 7.43562 26.3142 0.102936 17.2688 0.102936ZM17.013 2.66203L3.48148 17.2165C3.46834 16.9704 3.44972 16.73 3.44972 16.4807C3.44972 8.93509 9.50045 2.80004 17.013 2.66203ZM17.5247 2.66203C25.0374 2.80013 31.088 8.93565 31.088 16.4816C31.088 16.7309 31.0694 16.9713 31.0562 17.2174L17.5247 2.66203ZM4.44119 21.6318L30.0967 21.6318C28.0529 26.7094 23.0782 30.3007 17.2695 30.3007C11.4608 30.3007 6.48472 26.7094 4.44119 21.6318Z"
        fill={body(running)}
      />
    </Svg>
  );
}

const FAN_BODY =
  "M0.890625 16.4324C0.890625 7.38686 8.21067 0.0664062 17.2567 0.0664062C26.3026 0.0664062 33.6227 7.38635 33.6227 16.4324C33.6227 25.4785 26.3026 32.7985 17.2567 32.7985C8.21067 32.7985 0.890625 25.4785 0.890625 16.4324ZM3.26523 16.4324C3.26523 22.1259 6.6631 27.0193 11.5443 29.2045L7.91822 6.06838C5.07763 8.62916 3.26523 12.3066 3.26523 16.4324ZM22.9685 29.2045C27.8497 27.0203 31.2476 22.1265 31.2476 16.4324C31.2476 12.3068 29.4353 8.62833 26.5947 6.06735L22.9685 29.2045Z";

export function FanSymbol({ running = true, width, height, title = "Fan" }) {
  return (
    <Svg viewBox="0 0 34 33" width={width} height={height} title={title}>
      <path d={PUMP_DISC} fill="var(--color-sc-fill-lite)" />
      <path d={FAN_BODY} fill={body(running)} />
    </Svg>
  );
}

// The O₂ unit keeps the compressor glyph it always had, which shares the fan geometry.
export function OxygenSymbol(props) {
  return <FanSymbol {...props} title="O₂ unit" />;
}

const MOTOR_PATHS = [
  "M39.637 18.5555C39.637 8.30849 31.3302 0.00164795 21.0832 0.00164795C10.8361 0.00164795 2.5293 8.30849 2.5293 18.5555C2.5293 28.8025 10.8361 37.1094 21.0832 37.1094C31.3302 37.1094 39.637 28.8025 39.637 18.5555Z",
  "M36.7374 18.5561C36.7374 9.91019 29.7285 2.90129 21.0826 2.90129C12.4366 2.90129 5.42773 9.91019 5.42773 18.5561C5.42773 27.202 12.4366 34.2109 21.0826 34.2109C29.7285 34.2109 36.7374 27.202 36.7374 18.5561Z",
  "M15.2852 5.79898L15.2852 31.3105H26.8813V5.79898H15.2852Z"
];

function MotorGlyph({ running }) {
  return (
    <>
      <path d={MOTOR_PATHS[0]} fill={body(running)} />
      <path d={MOTOR_PATHS[1]} fill="var(--color-sc-fill-lite)" />
      <path d={MOTOR_PATHS[2]} fill={body(running)} />
    </>
  );
}

export function MotorSymbol({ running = true, width, height }) {
  return (
    <Svg viewBox="2 0 38 38" width={width} height={height} title="Motor">
      <MotorGlyph running={running} />
    </Svg>
  );
}

export function ValveSymbol({ running = true, width, height }) {
  const fill = body(running);
  return (
    <Svg viewBox="0 0 21 32" width={width} height={height} title={running ? "Valve, open" : "Valve, closed"}>
      <path d="M19.6426 1.79492L10.3217 15.7762L1.00081 1.79492L19.6426 1.79492Z" fill={fill} stroke={EDGE} strokeWidth="0.926" />
      <path d="M19.6426 30.5008H1.00081L10.3217 16.5195L19.6426 30.5008Z" fill={fill} stroke={EDGE} strokeWidth="0.926" />
    </Svg>
  );
}

export function ConeSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 29 46" width={width} height={height} title="Cone">
      <path
        d="M14.1813 0.0395715C12.079 0.0395715 10.3748 0.32475 10.3748 0.676527V1.18609C10.3748 1.36717 10.837 1.53962 11.6436 1.66033V3.7339L4.10116 41.5981C4.05696 41.7154 4.03337 41.8333 4.03077 41.9514C4.03077 41.9909 4.03727 42.0296 4.04572 42.0678C4.04572 42.0737 4.05221 42.0797 4.05221 42.0857C4.28151 43.7894 8.7468 45.1341 14.1814 45.1361C19.615 45.1342 24.0799 43.79 24.3106 42.0867C24.3106 42.0906 24.3041 42.0946 24.3041 42.0986C24.3197 42.0504 24.3301 42.0016 24.3301 41.9513C24.3236 41.8416 24.3047 41.732 24.2646 41.6229L22.9596 35.0721L22.0229 30.37L16.7171 3.73341V1.65932C17.5229 1.53873 17.9842 1.36648 17.9859 1.18559V0.676018C17.9859 0.324241 16.2817 0.0390625 14.1794 0.0390625L14.1813 0.0395715Z"
        fillRule="evenodd"
        fill="var(--color-sc-vessel)"
        stroke={EDGE}
        strokeWidth="0.926"
      />
      <circle cx="14" cy="37" r="4.6" fill="var(--color-sc-line)" stroke={EDGE} strokeWidth="0.69" />
      <circle cx="14" cy="23" r="4.6" fill="var(--color-sc-line)" stroke={EDGE} strokeWidth="0.69" />
    </Svg>
  );
}

export function TankSymbol({ width, height }) {
  return (
    <Svg viewBox="0 33 68 40" width={width} height={height} title="Tank">
      <rect x="5.79" y="39.16" width="55.95" height="27.98" fill="var(--color-sc-water)" opacity="0.9" />
      <path
        d="M1.31445 71.6142H66.2148V33.5692H60.6199V66.0193H6.90931V33.5692H1.31445V71.6142Z"
        fill="var(--color-sc-vessel)"
        stroke={EDGE}
        strokeWidth="1.11897"
      />
    </Svg>
  );
}

// Department stage glyphs below are drawn in the NJORD vocabulary (vessel fill,
// edge stroke, line-grey internals). The symbol pack does not ship their SVG.

export function BiofilterSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 48 48" width={width} height={height} title="Biofilter">
      <circle cx="24" cy="24" r="22.5" fill="var(--color-sc-vessel)" stroke={EDGE} strokeWidth="1.1" />
      <circle cx="24" cy="24" r="16" fill="var(--color-sc-fill-lite)" stroke="var(--color-sc-line)" strokeWidth="1" />
      <circle cx="24" cy="24" r="8.5" fill="none" stroke="var(--color-sc-line)" strokeWidth="1" />
      <circle cx="24" cy="24" r="2.4" fill="var(--color-sc-line)" />
    </Svg>
  );
}

export function UVSymbol({ running = true, width, height }) {
  const lamp = body(running);
  return (
    <Svg viewBox="0 0 44 34" width={width} height={height} title="UV panel">
      <rect x="0.65" y="0.65" width="42.7" height="32.7" rx="3" fill="var(--color-sc-cabinet)" stroke="var(--color-sc-cabinet-edge)" strokeWidth="1.3" />
      {[8, 17, 26].map((y) => (
        <rect key={y} x="6" y={y - 2.5} width="32" height="5" rx="2.5" fill={lamp} stroke={EDGE} strokeWidth="0.7" />
      ))}
    </Svg>
  );
}

export function DrumFilterSymbol({ running = true, width, height }) {
  return (
    <Svg viewBox="0 0 60 42" width={width} height={height} title="Drum filter">
      <rect x="0.65" y="0.65" width="58.7" height="40.7" rx="4" fill="var(--color-sc-node)" stroke="var(--color-slate-300)" strokeWidth="1.3" />
      <circle cx="23" cy="21" r="14" fill="var(--color-sc-vessel)" stroke={EDGE} strokeWidth="0.926" />
      <circle cx="23" cy="21" r="9" fill="none" stroke="var(--color-sc-line)" strokeWidth="1" strokeDasharray="2.2 1.8" />
      <g transform="translate(40 12) scale(0.48)">
        <MotorGlyph running={running} />
      </g>
    </Svg>
  );
}

export function BlowerCabinetSymbol({ running = true, width, height }) {
  return (
    <Svg viewBox="0 0 50 44" width={width} height={height} title="Blower cabinet">
      <rect x="0.65" y="0.65" width="48.7" height="42.7" rx="3" fill="var(--color-sc-cabinet)" stroke="var(--color-sc-cabinet-edge)" strokeWidth="1.3" />
      <g transform="translate(8 5.5)">
        <path d={PUMP_DISC} fill="var(--color-sc-fill-lite)" />
        <path d={FAN_BODY} fill={body(running)} />
      </g>
    </Svg>
  );
}

export function HeatExchangerSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 36 36" width={width} height={height} title="Heat exchanger">
      <circle cx="18" cy="18" r="16.5" fill="var(--color-sc-fill-lite)" stroke={EDGE} strokeWidth="1.1" />
      <path d="M1.5 18 H7 L11 10 L18 26 L25 10 L29 18 H34.5" fill="none" stroke={EDGE} strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  );
}

export function SumpSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 72 34" width={width} height={height} title="Sump basin">
      <rect x="5" y="12" width="62" height="17" fill="var(--color-sc-water)" opacity="0.9" />
      <path d="M0.6 0.6 H5.2 V28.6 H66.8 V0.6 H71.4 V33.4 H0.6 Z" fill="var(--color-sc-vessel)" stroke={EDGE} strokeWidth="1.1" />
    </Svg>
  );
}

export function DosingSymbol({ running = true, width, height }) {
  return (
    <Svg viewBox="0 0 40 44" width={width} height={height} title="Dosing unit">
      <path d="M2 4 Q2 1 5 1 H19 Q22 1 22 4 V41 H2 Z" fill="var(--color-sc-vessel)" stroke={EDGE} strokeWidth="0.926" />
      <rect x="4.5" y="18" width="15" height="20.5" fill="var(--color-fl-chem)" opacity="0.55" />
      <g transform="translate(22 26) scale(0.5)">
        <path d={PUMP_DISC} fill="var(--color-sc-fill-lite)" />
        <circle cx="17.27" cy="16.48" r="15.2" fill="none" stroke={body(running)} strokeWidth="2.6" />
        <path d="M9 24 L17.27 6 L25.5 24 Z" fill={body(running)} />
      </g>
    </Svg>
  );
}

export function CustomSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 40 40" width={width} height={height} title="Custom element">
      <rect x="1" y="1" width="38" height="38" rx="4" fill="var(--color-sc-node)" stroke="var(--color-slate-600)" strokeWidth="1.2" strokeDasharray="3 2.5" />
      <path d="M20 12 V28 M12 20 H28" stroke="var(--color-slate-400)" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function LabelSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 40 24" width={width} height={height} title="Section label">
      <text x="20" y="13" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight="500" fill="var(--color-slate-600)">
        AB
      </text>
      <path d="M4 19 H36" stroke="var(--color-slate-300)" strokeWidth="1.2" />
    </Svg>
  );
}

export function OffPageSymbol({ width, height }) {
  return (
    <Svg viewBox="0 0 44 20" width={width} height={height} title="Off-page connector">
      <path d="M1 1 H35 L43 10 L35 19 H1 Z" fill="var(--color-sc-node)" stroke="var(--color-sc-edge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 10 H27" stroke="var(--color-slate-400)" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/* ── cluster parts ── */

export function Readout({ value = "", unit = "", alarm = "none", suppressed = false, className = "" }) {
  const state = alarm !== "none" ? alarm : suppressed ? "sup" : "";
  return (
    <svg className={`rd ${state} ${className}`} width="66" height="25" viewBox="0 0 66 25" role="img" aria-label={`${value} ${unit}`}>
      <rect className="rd-box" x="0.5" y="0.5" width="65" height="24" rx="4" />
      <text className="rd-v" x="33" y="17" textAnchor="middle">
        {value === "" ? "—" : value}
        {unit && <tspan className="rd-u"> {unit}</tspan>}
      </text>
    </svg>
  );
}

export function ReadoutSymbol({ data }) {
  return <Readout value={data?.value ?? ""} unit={data?.unit ?? ""} alarm={data?.alarm ?? "none"} suppressed={(data?.suppression ?? "none") !== "none"} />;
}

const MODE_TEXT = { auto: "A", manual: "M" };

export function ModeChip({ mode, style }) {
  if (mode === "oos") {
    return (
      <svg className="eq-chip" width="17" height="17" viewBox="0 0 17 17" style={style} role="img" aria-label="Out of service">
        <rect x="0.6" y="0.6" width="15.8" height="15.8" rx="3" fill="var(--color-sc-node)" stroke="var(--color-slate-600)" strokeWidth="1.2" />
        <g transform="translate(3,3) scale(0.46)" fill="none" stroke="var(--color-slate-600)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </g>
      </svg>
    );
  }
  const manual = mode === "manual";
  const ink = manual ? "var(--color-sc-manual)" : "var(--color-slate-600)";
  return (
    <svg className="eq-chip" width="17" height="17" viewBox="0 0 17 17" style={style} role="img" aria-label={manual ? "Manual" : "Auto"}>
      <rect x="0.6" y="0.6" width="15.8" height="15.8" rx="3" fill="var(--color-sc-node)" stroke={manual ? ink : "var(--color-slate-300)"} strokeWidth="1.2" />
      <text x="8.5" y="12.5" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" fill={ink}>
        {MODE_TEXT[mode] ?? "A"}
      </text>
    </svg>
  );
}

// Priority is colour AND shape; acknowledgement is opacity only.
export function AlarmBadge({ priority, acked, style }) {
  const shape = {
    crit: <path d="M0 -8.8 L9 6.6 L-9 6.6 Z" fill="var(--color-sc-abnormal)" />,
    high: <circle r="8" fill="var(--color-warning)" />,
    lo: <path d="M0 -9 L9 0 L0 9 L-9 0 Z" fill="var(--color-sc-alarm-lo)" />
  }[priority];
  if (!shape) return null;
  const label = { crit: "Critical alarm", high: "High alarm", lo: "Medium or low alarm" }[priority];
  return (
    <svg className="eq-badge" width="22" height="22" viewBox="-11 -11 22 22" style={style} role="img" aria-label={`${label}${acked ? ", acknowledged" : ""}`}>
      <g opacity={acked ? 0.45 : 1} stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round">
        {shape}
        <text y={priority === "crit" ? 5.6 : 3.8} textAnchor="middle" stroke="none" fontSize="10" fontWeight="700" fill={priority === "crit" ? "#FFFFFF" : "#3D2C00"}>
          !
        </text>
      </g>
    </svg>
  );
}

// Suppression: the ALARM is deactivated. Neutral dashed square, never healthy and never an alarm.
export function SuppressionMark({ kind, style }) {
  if (kind !== "blocked" && kind !== "oos") return null;
  return (
    <svg className="eq-badge" width="22" height="22" viewBox="-11 -11 22 22" style={style} role="img" aria-label={kind === "blocked" ? "Alarm blocked" : "Alarm out of service"}>
      <rect x="-8" y="-8" width="16" height="16" rx="3" fill="var(--color-sc-node)" stroke="var(--color-slate-600)" strokeWidth="1.2" strokeDasharray="2.5 1.8" />
      <g transform="translate(-5.5,-5.5) scale(0.46)" fill="none" stroke="var(--color-slate-600)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {kind === "blocked" ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </>
        ) : (
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        )}
      </g>
    </svg>
  );
}
