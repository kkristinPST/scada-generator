// Drawing conventions from the Pure Salmon Technology P&ID legend (LEGEND 1-6,
// rev C, 26.11.24), condensed to what the model needs to read a drawing and map
// it onto the SCADA inventory.

export const PID_LEGEND = `
## Drawing conventions (Pure Salmon Technology P&ID legend)

Tag formats
- Pipe line: SIZE-SPEC-MEDIE-AREA-PROCESSAREA-SEQ-GROUP, e.g. 160-PE14-WRW-DPT01-FIL02-01-1000.
- Instrument and equipment: AREA-PROCESSAREA-COMPONENT(+signal), e.g. DPT07-FIL02-PU01 (pump), DPT07-FIL02-PU01.MO01 (its motor), DPT07-PSU00-FE01.LT01 (instrument).
- Valve: AREA-PROCESSAREA-VALVETYPE+No, e.g. DPT07-PSU00-HV01.
- Drawing number references such as 070401 point to other P&IDs (off-page).

Process line colours (main systems, solid)
- blue fresh water, magenta sea water, light blue brackish water, orange sludge, red fish transport, thick blue manifold, black lines without line no. (typical waterway).
Auxiliary systems (dashed)
- cyan chemical, green air, orange oxygenated water, blue oxygen, magenta ozone, yellow dead fish, green feed.

Medie codes (fluid in the line)
- Water: FWR fresh water, WSW sea water, WBW brackish/sea water, WTF/TWS treated water, WSS source water, WOW oxygenated water, WRW reject water, FWA feed water, RWI/SWI untreated intake water.
- Sludge and waste: SRA sludge from RAS, DRA drainage, DFH dead fish/ensilage.
- Chemicals: CHA hydrochloric acid, CHP hydrogen peroxide, CFA formic acid, CSH lye, CCA citric acid, CFL flocculant, FCT ferric chloride, CME methanol, CPO polymer, CLI lime, CAM ammonia, AFO anti foaming, SLT salt.
- Gases: AIR air, ACA compressed air, AIA instrument air, GOX oxygen, LOX liquid oxygen, OZO ozone, STM steam.
- Thermal: CGL glycol, CCM cooling medium, CBR brine.
- FED feed.

Process area codes (help name stages)
- FTA fish tank system, FIL filtration, PSU pump sump, MBB MBBR, CO2/CST CO2 system, OXY oxygen system, OXT oxystream, OZO ozone, AOT AOT/advanced water treatment, PRS protein skimmer, UV, SLR/SLW sludge, STO storage, DRA drainage, HSY heating, CSY cooling, DOS dosing, FCT ferric chloride, LYE lye, SAL NaCl, FTB fish transport, INF infrastructure, ENS ensilage.

Equipment component codes
- PU pumps, BL/VE blowers and ventilators, CO compressors, FI filters, SI sieve, ST strainer, TA vessels and tanks, SU sumps, HE heat exchanger, HP heat pump, UV UV, MI mixers, AG agitators, AE aeration, CL chlorination, CT cooling tower, TS separators, PK package unit, RU refrigeration, CA cabinet, AO AOT, MO motor (signal suffix).
Valve codes
- HV hand valve, CV check valve, MV motor valve, PV pneumatic valve, RV regulated valve, SV solenoid valve, SR safety valve.
Instrument codes
- Transmitters/elements: LT level, TT/TE temperature, PT/PE pressure, FT/FE/FQ flow, AT/AE analyser (O2, CO2, pH, ORP, turbidity, conductivity), WT weight, SC frequency converter.
- Local and switching only: LI, TI, PI, FI indicators, LS, PS, FS, TS, SS, HS, ZS switches, ZA position alarm, LAH level alarm, LG level glass, TW thermowell.
- Fail-safe marks on valves: FO fail open, FC fail close, FL fail lock. HH/LL marks on instruments are alarm limits.

Symbols (equipment drawn in green on the legend)
- Fish tanks: rectangular or round fish tank. Sieve, outlet box (mortality box), streamer, fish pot, center tower, emergency oxygen, air lift, light fixture, injector, standpipe/inlet channel.
- Oxygen: oxygen cone (tall cone with feet), booster, oxygen main valve cabinet.
- Filter and degasser: polishing filter, drum filter (box with drum), drum filter hatchery, CO2 degasser (box with hatched media), CO2 degasser hatchery, MBBR/FBBR (cluster of small circles), isolation plate, hose with sieve basket, demister, waterlock, degasser air-in channel/box, strainer.
- UV and channel: UV unit (box with vertical lamps), UV in channel, channel.
- Heat exchangers and CIP: plate exchanger (box with X), CIP tank.
- Sumps and AOT: AOT box, AOT sump 1/2, sump, FBBR, pump sump hatchery, fish barrier sump, sludge tank, ozone reaction chamber, plate separator.
- Skimmer: protein skimmer (top), micro bubble vent, foaming/stripping unit, foam separator, reduction concrete channel.
- Dead fish/ensilage: dead fish tank, grinder, funnel, catastrophe tank, drip tray. Bucket: instrument bucket.
- Feeding: feeding automate, feed silo, heating element, hyflow unit, drum feeder, intermediate outlet, disc feeder, feed screw, feed weight, fish feed chain, Z elevator, big bag, pull station. Sorting: sorting/vaccine machine, dewatering.
- General: pump (circle with triangle), diaphragm pump, hose pump, fish pump, general compressor, general heat exchanger (circle with zigzag), axial blower, general vessel, conical heads vessel, container closed/open, motor (M in circle), frequency controlled motor, bottom aeration diffuser, mixer with motor, propeller agitator, filter, liquid filter, scale, silencer, compensator.
- Valves: general (bow tie), air release, angle, ball, butterfly, knife gate, globe, three way, angled seat, injection, diaphragm, needle, penstock, check, swing check, damper, two way distributor; automatic valves show an actuator on top (piston = PV, M in circle = MV, M with arrow = frequency controlled MV, box = solenoid SV, dome = regulating RV).
- Instruments: orifice, flow meter, rotameter, volume meter, controller (circle in square), field instrument (circle with tag), weight cell, radar, signal horn, signal light.
- Fittings and annotation (never shown on SCADA): reducer, eccentric reducer, sight glass, flange, blind flange, couplings, hose, drip catcher, funnel, outlet to atmosphere, insulation patterns, revision cloud, scope interface symbol (PST/BH), U.G/A.G marks, slope, level reference, tie-in reference, P&ID reference box, room limit, vendor package limit, cabinet/box limit.
`;
