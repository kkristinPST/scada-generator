// Example diagrams rebuilt from the existing SCADA mimics, made with the editor's own
// elements so they load, edit and export like anything drawn by hand.
// Coordinates are symbol centres taken from the screenshots; off-page connectors use
// their left edge. Values and states are the ones shown on the screens.
import { ELEMENTS_BY_TYPE, fluidClass } from "../scada/catalog";
import { nextNodeId, uniqueEdgeId } from "../diagramIds";

const TAG_CHAR_WIDTH = 6.4;

// Approximate rendered width of an equipment node, to centre it on the screenshot position.
function nodeWidth(type, data) {
  const { width } = ELEMENTS_BY_TYPE[type];
  const tag = (data.label?.length ?? 0) * TAG_CHAR_WIDTH + 10;
  const description = Math.min(130, (data.description?.length ?? 0) * 5.2);
  return Math.max(72, width, data.showReadout ? 66 : 0, tag, description) + 8;
}

function createDiagram(build) {
  const nodes = [];
  const edges = [];

  const add = (type, cx, cy, data = {}) => {
    const id = nextNodeId(type, nodes);
    const { height } = ELEMENTS_BY_TYPE[type];
    const position =
      type === "offpage"
        ? { x: cx, y: cy - 18 }
        : { x: cx - nodeWidth(type, data) / 2, y: cy - height / 2 - 6 - (data.showReadout ? 31 : 0) };
    nodes.push({ id, type, position, data: { id, isSelected: false, ...data } });
    return id;
  };

  const helpers = {
    offpage: (x, cy, label) => add("offpage", x, cy, { label }),
    equipment: (type, cx, cy, label, description, state = {}) => add(type, cx, cy, { label, description, running: true, mode: "auto", ...state }),
    readout: (cx, cy, label, description, value, unit, state = {}) => add("readout", cx, cy, { label, description, value, unit, ...state }),
    pipe: (source, target, fluid = "proc", from = "r", to = "l") => {
      edges.push({ id: uniqueEdgeId(source, target, edges), source, target, sourceHandle: from, targetHandle: to, type: "smoothstep", className: fluidClass(fluid), data: { fluid } });
    }
  };
  build(helpers);
  return { nodes, edges };
}

// Shorthand for equipment states on the mimics.
const hz = (value, state = {}) => ({ showReadout: true, value: String(value), unit: "Hz", running: Number(value) > 0, ...state });
const manual = { mode: "manual" };

const rasLoopDpt1 = () =>
  createDiagram(({ offpage, equipment, readout, pipe }) => {
    const fishIn = offpage(40, 430, "Fish tanks");
    readout(215, 480, "DPT1-FIL0-LT1", "Level before filter", "16", "cm");
    const backwash1 = equipment("pump", 185, 300, "DPT1-FIL0-PU1", "Backwash pump filter 1", hz(0));
    const drum1 = equipment("drum", 335, 300, "DPT1-FIL1-FE1", "Drum filter 1", hz(0));
    const backwash2 = equipment("pump", 185, 610, "DPT1-FIL0-PU2", "Backwash pump filter 2", hz(0));
    const drum2 = equipment("drum", 335, 610, "DPT1-FIL2-FE1", "Drum filter 2", hz(0));

    readout(560, 150, "DPT1-AEB0-BM1-TT1", "Blower cabinet temperature 1", "24.0", "°C");
    readout(720, 150, "DPT1-AEB0-BM2-TT1", "Blower cabinet temperature 2", "16.8", "°C");
    const blower1 = equipment("cabinet", 560, 300, "DPT1-AEB0-BM1", "Blower 1 MBBR", hz(42));
    const blower2 = equipment("cabinet", 720, 300, "DPT1-AEB0-BM2", "Blower 2 MBBR", hz(0));
    const mbbr = equipment("bio", 640, 600, "MBBR", "Bioreactor");
    readout(640, 720, "DPT1-AEB0-LT1", "Level in bioreactor", "248", "cm");

    const fan1 = equipment("fan", 890, 330, "DPT1-STR0-AV1", "CO₂-fan 1", hz(0, manual));
    const fan2 = equipment("fan", 1005, 330, "DPT1-STR0-AV2", "CO₂-fan 2", hz(0, { ...manual, alarm: "high" }));
    const stripper = equipment("custom", 945, 640, "CO₂ stripper", "");
    readout(945, 790, "DPT1-STR1-PT1", "Vacuum in CO₂ stripping", "-14.4", "mbar");

    readout(1160, 500, "DPT1-SMP0-PT1", "Fish tank pressure", "1.2", "mVs");
    readout(1330, 500, "DPT1-SMP0-TT1", "Pump sump temperature", "8.7", "°C");
    const lift1 = equipment("pump", 1160, 660, "DPT1-SMP0-PU1", "Lift pump 1", hz(37, { alarm: "high" }));
    const lift2 = equipment("pump", 1300, 660, "DPT1-SMP0-PU2", "Lift pump 2", hz(0, { outOfService: true }));
    const sump = equipment("sump", 1230, 800, "Pump sump", "");
    readout(1230, 900, "DPT1-SMP0-LT1", "Level in pump sump", "193", "cm");
    readout(1580, 640, "DPT1-SMP0-QT1", "CO₂ in pump sump", "4", "mg/L");
    readout(1580, 710, "DPT1-SMP0-QT2", "O₂ in pump sump", "95.3", "%");
    readout(1580, 780, "DPT1-SMP0-QT3", "pH 1 in pump sump", "6.9", "pH");
    readout(1580, 850, "DPT1-SMP0-QT4", "pH 2 in pump sump", "6.7", "pH", { alarm: "crit" });

    const oxy1 = equipment("pump", 1190, 130, "DPT1-DOX0-PU1", "Oxygenation pump 1", hz(0, manual));
    const oxy2 = equipment("pump", 1190, 310, "DPT1-DOX0-PU2", "Oxygenation pump 2", hz(0, manual));
    const cone = equipment("cone", 1395, 210, "Oxygen cone", "");
    readout(1395, 340, "DPT1-DOX1-PT1", "Oxygen water pressure", "0.3", "bar");
    const oxygen = offpage(1700, 40, "Oxygen");
    const dose1 = equipment("valve", 1495, 120, "DPT1-DOX1-SV1", "Base dose valve", manual);
    const dose2 = equipment("valve", 1640, 120, "DPT1-DOX1-SV2", "Extra dose valve", manual);
    const fishOut1 = offpage(1690, 240, "Fish tanks");
    const fishOut2 = offpage(1690, 470, "Fish tanks");

    const lye = offpage(40, 820, "Lye");
    const lye1 = equipment("pump", 285, 800, "DPT1-DNA0-PU1", "Lye pump 1", { ...manual, running: false, alarm: "high", showReadout: true, value: "0.0", unit: "l/h" });
    const lye2 = equipment("pump", 285, 950, "DPT1-DNA0-PU2", "Lye pump 2", { ...manual, running: false, alarm: "high", acked: true, showReadout: true, value: "0.0", unit: "l/h" });

    pipe(fishIn, drum1);
    pipe(fishIn, drum2);
    pipe(backwash1, drum1);
    pipe(backwash2, drum2);
    pipe(drum1, mbbr);
    pipe(drum2, mbbr);
    pipe(blower1, mbbr, "gas", "b", "t");
    pipe(blower2, mbbr, "gas", "b", "t");
    pipe(mbbr, stripper);
    pipe(fan1, stripper, "gas", "b", "t");
    pipe(fan2, stripper, "gas", "b", "t");
    pipe(stripper, sump);
    pipe(sump, lift1, "proc", "r", "bt");
    pipe(sump, lift2, "proc", "r", "bt");
    pipe(lift1, fishOut2);
    pipe(lift2, fishOut2);
    pipe(lift1, oxy1, "proc", "r", "bt");
    pipe(lift1, oxy2, "proc", "r", "bt");
    pipe(oxy1, cone);
    pipe(oxy2, cone);
    pipe(cone, fishOut1);
    pipe(oxygen, dose2, "o2", "b", "t");
    pipe(oxygen, dose1, "o2", "b", "t");
    pipe(dose1, cone, "o2", "b", "t");
    pipe(dose2, cone, "o2", "b", "t");
    pipe(lye, lye1, "chem");
    pipe(lye, lye2, "chem");
    pipe(lye1, mbbr, "chem", "r", "bt");
    pipe(lye2, mbbr, "chem", "r", "bt");
  });

const waterIntakeEnergy = () =>
  createDiagram(({ offpage, equipment, readout, pipe }) => {
    readout(100, 70, "Total flow: plant", "", "65.6", "m³/h");
    readout(100, 150, "Total flow: Building 1", "", "14.0", "m³/h");
    readout(100, 230, "Total flow: Building 2", "", "51.6", "m³/h");
    readout(300, 70, "UTE0-TT1", "Outdoor temperature", "15.0", "°C");
    readout(300, 160, "HTL0-JK1", "Compressor air pressure", "5.2", "bar");
    readout(300, 250, "DPT1-WIN0-TT1", "Intake water temperature", "6.2", "°C");

    const intake = offpage(40, 520, "Intake water");
    const intakePump = equipment("pump", 345, 520, "WIN0-PBS0-PU1", "Intake pump to plant", hz(0, manual));
    readout(345, 370, "DPT0-WIN0-PT1", "Pressure before filter skid", "1.8", "bar");
    const filterSkid = equipment("drum", 500, 330, "WIN0-FIL0", "Filter skid");
    readout(480, 170, "DPT0-WIN0-PT3", "Differential pressure across skid", "0.03", "bar");
    const uv = equipment("uv", 650, 180, "WIN0-UV1", "Inlet UV · stopped by warning", { running: false, alarm: "high", showReadout: true, value: "0.0", unit: "mJ/cm²" });
    readout(700, 320, "DPT0-WIN0-PT2", "Pressure after filter skid", "1.8", "bar");
    const exchanger = equipment("hx", 830, 370, "WIN0-HEX0", "Heat exchanger");
    readout(900, 260, "DPT1-WIN0-TT2", "Make-up water temp after exchanger", "7.2", "°C");
    const booster = equipment("pump", 1005, 400, "DPT0-ENS0-PU1", "Drain water booster pump", hz(0, manual));
    const fishBarrier = offpage(1090, 400, "Fish barrier");

    readout(1215, 200, "DPT1-ENS0-FT3", "Make-up water flow: start feeding", "4.6", "m³/h");
    const makeup1Valve = equipment("valve", 1400, 250, "DPT1-ENS0-RV1", "Make-up water valve start feeding", { ...manual, showReadout: true, value: "23", unit: "%" });
    const makeup1 = offpage(1480, 250, "Make-up DPT1");
    readout(1280, 330, "DPT2-ENS0-FT3", "Make-up water flow: growth", "9.4", "m³/h");
    const makeup2Valve = equipment("valve", 1400, 420, "DPT2-ENS0-RV1", "Make-up water valve growth", { ...manual, showReadout: true, value: "32", unit: "%" });
    const makeup2 = offpage(1480, 420, "Make-up DPT2");

    const chiller = equipment("hx", 1270, 540, "Chiller / heat pump", "");
    const shunt = equipment("valve", 1270, 690, "DPT2-ENS1-MV1", "Chiller shunt valve", { running: false, showReadout: true, value: "0", unit: "%" });
    readout(1450, 570, "DPT2-ENS1-TT3", "Glycol temperature chiller", "7.5", "°C");
    readout(1460, 680, "DPT2-ENS1-TT4", "Process water temp after chiller", "7.8", "°C");
    readout(940, 690, "DPT2-ENS1-TT2", "Process water temp supply: chiller", "9.2", "°C");
    readout(1105, 690, "DPT2-ENS1-TT1", "Glycol temperature chiller return", "8.6", "°C");

    const rasGrowthDrain = offpage(40, 790, "RAS DPT2");
    const drainPump = equipment("pump", 290, 790, "DPT2-ENS0-PU2", "Drain pump: growth", hz(0, manual));
    readout(520, 770, "DPT2-ENS0-FT2", "Drain water flow to exchanger: growth", "0.0", "m³/h");

    const rasGrowth = offpage(40, 920, "RAS DPT2");
    const circGrowth = equipment("pump", 290, 920, "DPT2-ENS0-PU1", "Energy system circ pump: growth", hz(60, manual));
    readout(520, 900, "DPT2-ENS0-FT1", "Circulated flow to heat pump: growth", "16.8", "m³/h");
    readout(750, 900, "DPT2-SMP0-TT1", "Temperature pump sump", "11.6", "°C");
    const heatPump = equipment("hx", 1145, 990, "Heat pump", "");
    readout(1360, 900, "DPT2-ENS0-TT1", "Temperature to growth after heat pump", "15.2", "°C");
    const rasGrowthOut = offpage(1480, 920, "RAS DPT2");

    const rasStart = offpage(40, 1060, "RAS DPT1");
    const circStart = equipment("pump", 290, 1060, "DPT1-ENS0-PU1", "Energy system circ pump: start feeding", hz(50, manual));
    readout(520, 1040, "DPT1-ENS0-FT1", "Circulated flow to heat pump: start feeding", "17.5", "m³/h");
    readout(750, 1040, "DPT1-SMP0-TT1", "Temperature pump sump", "12.2", "°C");
    readout(1360, 1040, "DPT1-ENS0-TT1", "Temperature to start feeding", "14.8", "°C");
    const rasStartOut = offpage(1480, 1060, "RAS DPT1");

    pipe(intake, intakePump, "raw");
    pipe(intakePump, filterSkid, "raw");
    pipe(filterSkid, uv, "raw");
    pipe(uv, exchanger, "raw");
    pipe(exchanger, makeup1Valve);
    pipe(exchanger, makeup2Valve);
    pipe(makeup1Valve, makeup1);
    pipe(makeup2Valve, makeup2);
    pipe(exchanger, booster, "drain");
    pipe(booster, fishBarrier, "drain");
    pipe(rasGrowthDrain, drainPump, "drain");
    pipe(drainPump, exchanger, "drain", "r", "bt");
    pipe(chiller, shunt, "glycol", "b", "t");
    pipe(chiller, heatPump, "glycol", "b", "t");
    pipe(rasGrowth, circGrowth, "glycol");
    pipe(circGrowth, heatPump, "glycol");
    pipe(heatPump, rasGrowthOut, "glycol");
    pipe(rasStart, circStart, "glycol");
    pipe(circStart, heatPump, "glycol");
    pipe(heatPump, rasStartOut, "glycol");
  });

const sludgeFishBarrier = () =>
  createDiagram(({ offpage, equipment, readout, pipe }) => {
    const rasGrowth = offpage(30, 60, "RAS DPT2");
    const rasStart = offpage(30, 120, "RAS DPT1");
    const sludgeSump = equipment("sump", 380, 230, "WWT0-INN0", "Sludge drain sump");
    readout(200, 250, "WWT0-INN0-LT1", "Level in sludge drain sump", "42", "cm");
    const sludgePump = equipment("pump", 580, 230, "WWT0-INN0-PU1", "Sludge intake pump", hz(50));
    const sludgeBuilding = offpage(1470, 120, "Sludge building");

    const drainStart = offpage(30, 345, "Drain water DPT1");
    const drainGrowth = offpage(30, 405, "Drain water DPT2");
    const barrierGrowth = equipment("sump", 670, 480, "DPT2-EFL0", "Fish barrier DPT2");
    const barrierStart = equipment("sump", 820, 480, "DPT1-EFL0", "Fish barrier DPT1");
    readout(510, 490, "DPT2-EFL0-LT1", "Fish barrier sump level RAS 2", "12", "cm");
    readout(980, 490, "DPT1-EFL0-LT1", "Fish barrier sump level RAS 1", "12", "cm");
    const drainOut = offpage(1470, 560, "Drain water");

    pipe(rasGrowth, sludgeSump, "sludge", "r", "t");
    pipe(rasStart, sludgeSump, "sludge");
    pipe(sludgeSump, sludgePump, "sludge");
    pipe(sludgePump, sludgeBuilding, "sludge");
    pipe(drainStart, barrierStart, "drain", "r", "t");
    pipe(drainGrowth, barrierGrowth, "drain");
    pipe(barrierGrowth, barrierStart, "drain");
    pipe(barrierStart, drainOut, "drain");
  });

const oxygenationDpt3 = () =>
  createDiagram(({ offpage, equipment, readout, pipe }) => {
    const drainExchanger = offpage(15, 440, "Drain exchanger");
    const topExchanger = offpage(15, 500, "Top exchanger");
    const mbbr = offpage(15, 570, "MBBR");
    const lye = offpage(15, 650, "Lye");
    const sump = equipment("sump", 560, 610, "DPT3-SMP0", "Pump sump");
    readout(780, 610, "DPT3-SMP0-LT1", "Level in pump sump", "259", "cm");
    readout(320, 110, "DPT3-SMP0-QT1", "CO₂ in pump sump", "2", "mg/L", { alarm: "crit" });
    readout(320, 180, "DPT3-SMP0-QT2", "O₂ in pump sump", "99.0", "%", { alarm: "high" });
    readout(320, 250, "DPT3-SMP0-QT3", "pH 1 in pump sump", "7.4", "pH", { alarm: "high" });
    readout(320, 320, "DPT3-SMP0-QT4", "pH 2 in pump sump", "7.4", "pH", { alarm: "high" });
    const topPump = equipment("pump", 480, 760, "DPT3-ENS0-PU1", "Top exchanger pump", hz(42));
    const drainPump = equipment("pump", 650, 760, "DPT3-ENS0-PU3", "Drain pump", hz(0, manual));

    const oxy1 = equipment("pump", 480, 270, "DPT3-DOX0-PU1", "Oxygenation pump 1", hz(0));
    const oxy2 = equipment("pump", 620, 270, "DPT3-DOX0-PU2", "Oxygenation pump 2", hz(39));
    const oxy3 = equipment("pump", 760, 270, "DPT3-DOX0-PU3", "Oxygenation pump 3", hz(0));
    readout(620, 120, "DPT3-DOX0-PT1", "Oxygen cone pressure", "2.0", "bar");
    const oxygen = offpage(840, 60, "Oxygen");

    const cones = [1, 2, 3, 4, 5].map((n) => {
      const cx = 1340 - (n - 1) * 85;
      const cy = 190 + (n - 1) * 40;
      const valve = equipment("valve", cx, cy - 100, `Cone ${n} O₂`, "");
      const cone = equipment("cone", cx, cy, `Cone ${n}`, "");
      pipe(oxygen, valve, "o2", "b", "t");
      pipe(valve, cone, "o2", "b", "t");
      return cone;
    });
    const fishTop = offpage(1480, 150, "Fish tanks");
    const analysis = equipment("pump", 890, 400, "DPT3-SMP0-PU6", "Analysis pump", { running: true });

    const lifts = [1, 2, 3, 4, 5].map((n) => {
      const cy = 420 + (n - 1) * 110;
      const running = n !== 3;
      const valve = equipment("valve", 1140, cy, `PU${n} valve`, "", { running });
      const pump = equipment("pump", 1260, cy, `DPT3-SMP0-PU${n}`, `Lift pump ${n}`, hz(running ? 41 : 0));
      pipe(sump, valve);
      pipe(valve, pump);
      return pump;
    });
    const fishLift = offpage(1480, 640, "Fish tanks");
    readout(1430, 400, "DPT3-SMP0-PT1", "Tank pressure", "6.0", "mVs");
    readout(1430, 480, "DPT3-SMP0-TT1", "Temperature in pump sump", "12.6", "°C");

    const sortingValve = equipment("valve", 1140, 1000, "Sorting valve", "", manual);
    const sortingPump = equipment("pump", 1260, 1000, "DPT3-FHA0-PU1", "Sorting water pump", hz(35, manual));
    readout(1430, 920, "DPT3-FHA0-PT1", "Sorting water pressure", "1.3", "bar");
    const sorting = offpage(1480, 1010, "Sorting");

    pipe(drainExchanger, sump);
    pipe(topExchanger, sump);
    pipe(mbbr, sump);
    pipe(lye, sump, "chem");
    pipe(sump, topPump, "proc", "b", "t");
    pipe(sump, drainPump, "proc", "b", "t");
    pipe(sump, oxy1, "proc", "r", "bt");
    pipe(sump, oxy2, "proc", "r", "bt");
    pipe(sump, oxy3, "proc", "r", "bt");
    pipe(oxy1, cones[4]);
    pipe(oxy1, cones[3]);
    pipe(oxy2, cones[2]);
    pipe(oxy2, cones[1]);
    pipe(oxy3, cones[0]);
    cones.forEach((cone) => pipe(cone, fishTop));
    pipe(sump, analysis);
    lifts.forEach((pump) => pipe(pump, fishLift));
    pipe(sump, sortingValve);
    pipe(sortingValve, sortingPump);
    pipe(sortingPump, sorting);
  });

const lyeDosing = () =>
  createDiagram(({ offpage, equipment, readout, pipe }) => {
    const lye = offpage(50, 385, "Lye");
    const tank = equipment("tank", 370, 385, "Lye tank", "");
    readout(370, 490, "CHM0-DNA0-LT1", "Lye tank level", "65.8", "%");
    readout(680, 100, "CHM0-DNA0-TT1", "Lye room temperature", "13.9", "°C");
    const doses = [
      ["CHM0-DNA1-PU1", "Dosing pump 1-1", "0.0", "DPT3 pump sump"],
      ["CHM0-DNA1-PU2", "Dosing pump 1-2", "6.2", "DPT3 pump sump"],
      ["CHM0-DNA2-PU1", "Dosing pump 2-1", "5.6", "DPT4 pump sump"],
      ["CHM0-DNA2-PU2", "Dosing pump 2-2", "0.0", "DPT4 pump sump"]
    ];
    pipe(lye, tank, "chem");
    doses.forEach(([tag, description, flow, destination], index) => {
      const cy = 160 + index * 175;
      const pump = equipment("pump", 965, cy, tag, description, { ...manual, running: Number(flow) > 0, showReadout: true, value: flow, unit: "l/h" });
      const out = offpage(1290, cy, destination);
      pipe(tank, pump, "chem");
      pipe(pump, out, "chem");
    });
  });

export const EXAMPLES = [
  { id: "ras-dpt1", name: "RAS loop DPT1", description: "Drum filters, MBBR, CO₂ stripping, pump sump, oxygenation and lye", build: rasLoopDpt1 },
  { id: "intake-energy", name: "Water intake and energy", description: "Intake, filter skid, UV, heat exchanger, make-up water and heat pump loops", build: waterIntakeEnergy },
  { id: "sludge-barrier", name: "Sludge and fish barrier", description: "Sludge drain sump and the DPT1/DPT2 fish barrier sumps", build: sludgeFishBarrier },
  { id: "oxygenation-dpt3", name: "Oxygenation and lift pumps DPT3", description: "Pump sump, oxygen cones, lift pumps and sorting water", build: oxygenationDpt3 },
  { id: "lye-dosing", name: "Lye dosing", description: "Lye tank and dosing pumps to the DPT3 and DPT4 pump sumps", build: lyeDosing }
];
