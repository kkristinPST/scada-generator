import {
  BiofilterSymbol,
  BlowerCabinetSymbol,
  ConeSymbol,
  CustomSymbol,
  DosingSymbol,
  DrumFilterSymbol,
  FanSymbol,
  HeatExchangerSymbol,
  LabelSymbol,
  OffPageSymbol,
  MotorSymbol,
  OxygenSymbol,
  PumpSymbol,
  ReadoutSymbol,
  SumpSymbol,
  TankSymbol,
  UVSymbol,
  ValveSymbol
} from "./symbols";

// Every element the editor can place. `type` is the React Flow node type and is
// stored in exported JSON, so existing keys must never be renamed.
//   width/height  symbol size on the canvas (mimic scale 1.25 for pumps and fans)
//   runState      body fill reflects running / stopped
//   mode          shows the Auto / Manual chip
//   fan           fans sit their chip and badge lower
//   annotation    drawing aid, not process equipment (no handles, no state)
//   connector     connectable, but no equipment state (off-page connectors)
export const ELEMENTS = [
  { type: "pump", label: "Pump", category: "Equipment", Symbol: PumpSymbol, width: 42, height: 41, runState: true, mode: true },
  { type: "fan", label: "Fan / blower", category: "Equipment", Symbol: FanSymbol, width: 42, height: 41, runState: true, mode: true, fan: true },
  { type: "motor", label: "Motor", category: "Equipment", Symbol: MotorSymbol, width: 46, height: 46, runState: true, mode: true },
  { type: "oxygen", label: "O₂ unit", category: "Equipment", Symbol: OxygenSymbol, width: 42, height: 41, runState: true, mode: true, fan: true },
  { type: "valve", label: "Valve", category: "Equipment", Symbol: ValveSymbol, width: 26, height: 40, runState: true, mode: true, runLabels: ["Open", "Closed"] },
  { type: "tank", label: "Tank", category: "Vessels & treatment", Symbol: TankSymbol, width: 68, height: 40 },
  { type: "sump", label: "Sump basin", category: "Vessels & treatment", Symbol: SumpSymbol, width: 72, height: 34 },
  { type: "cone", label: "Cone", category: "Vessels & treatment", Symbol: ConeSymbol, width: 36, height: 57 },
  { type: "bio", label: "Biofilter", category: "Vessels & treatment", Symbol: BiofilterSymbol, width: 50, height: 50 },
  { type: "drum", label: "Drum filter", category: "Vessels & treatment", Symbol: DrumFilterSymbol, width: 64, height: 45, runState: true, mode: true },
  { type: "uv", label: "UV panel", category: "Vessels & treatment", Symbol: UVSymbol, width: 50, height: 39, runState: true, mode: true, runLabels: ["Lamps on", "Lamps off"] },
  { type: "hx", label: "Heat exchanger", category: "Vessels & treatment", Symbol: HeatExchangerSymbol, width: 40, height: 40 },
  { type: "cabinet", label: "Blower cabinet", category: "Vessels & treatment", Symbol: BlowerCabinetSymbol, width: 54, height: 48, runState: true, mode: true },
  { type: "dosing", label: "Dosing unit", category: "Vessels & treatment", Symbol: DosingSymbol, width: 40, height: 44, runState: true, mode: true },
  { type: "readout", label: "Readout", category: "Instruments", Symbol: ReadoutSymbol, width: 66, height: 25, readout: true },
  { type: "custom", label: "Custom element", category: "Custom", Symbol: CustomSymbol, width: 40, height: 40 },
  { type: "offpage", label: "Off-page connector", category: "Annotations", Symbol: OffPageSymbol, width: 110, height: 36, connector: true },
  { type: "label", label: "Section label", category: "Annotations", Symbol: LabelSymbol, width: 40, height: 24, annotation: true }
];

export const ELEMENTS_BY_TYPE = Object.fromEntries(ELEMENTS.map((element) => [element.type, element]));

// Fluid line coding. Gases are dashed as well as coloured so they survive
// monochrome print and colour blindness.
export const FLUIDS = [
  { key: "", label: "Unassigned" },
  { key: "proc", label: "Process water" },
  { key: "raw", label: "Raw water" },
  { key: "drain", label: "Drain" },
  { key: "sludge", label: "Sludge" },
  { key: "glycol", label: "Glycol" },
  { key: "brine", label: "Brine" },
  { key: "chem", label: "Chemical" },
  { key: "feed", label: "Feed" },
  { key: "o2", label: "Oxygen", dashed: true },
  { key: "gas", label: "Gas", dashed: true }
];

export const fluidClass = (fluid) => (fluid ? `fl-${fluid}` : undefined);
