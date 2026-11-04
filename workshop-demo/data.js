/* Workshop demo seed data. Everything is made up. Dates are generated relative to
   the real current date, so the board always looks live. The PRNG is seeded, so a
   reset always rebuilds exactly the same demo. */

var WS = window.WS || {};

WS.rng = function (seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

WS.today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
WS.iso = function (d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
WS.day = function (n) { var d = WS.today(); d.setDate(d.getDate() + n); return WS.iso(d); };
WS.at = function (dayStr, h, m) { return dayStr + 'T' + String(h).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0') + ':00'; };
WS.parse = function (s) { return new Date(String(s).length <= 10 ? s + 'T00:00:00' : s); };
WS.daysBetween = function (a, b) { return Math.round((WS.parse(b) - WS.parse(a)) / 86400000); };
WS.stampOf = function (d) {
  return WS.iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00';
};

/* ---------------- inspection template (DVSA Guide to Maintaining Roadworthiness) ---------------- */
WS.INSPECTION_TEMPLATE = [
  { id: 'cab', name: 'Cab and inside', items: [
    'Seat belts and anchorages', 'Seat condition and security', 'Steering wheel and column',
    'Mirrors, glass and visibility', 'Windscreen washers and wipers', 'Horn',
    'Driving controls and pedals', 'Warning lights and gauges', 'Speed limiter function',
    'Tachograph seal and calibration date', 'Heater and demister', 'Cab doors, steps and security',
    'Fire extinguisher and first aid kit'] },
  { id: 'chassis', name: 'Chassis and body', items: [
    'Chassis members and cross members', 'Body security and mountings', 'Spray suppression',
    'Markings, plates and reflective markings', 'Fuel tank, cap and lines', 'Battery security and condition',
    'Trailer coupling and fifth wheel', 'Landing legs and support legs', 'Skip or hook gear rams, pins and hoses',
    'Hydraulic oil level and leaks'] },
  { id: 'brakes', name: 'Brakes', items: [
    'Service brake operation', 'Parking brake operation', 'Air build up time', 'Air system leaks',
    'Brake pipes, hoses and couplings', 'Brake chambers and slack adjusters', 'ABS and EBS warning operation',
    'Brake linings, pads and discs', 'Load sensing valve'] },
  { id: 'steer', name: 'Steering and suspension', items: [
    'Steering play and operation', 'Steering linkage and joints', 'Power steering system and fluid',
    'Springs, leaves and hangers', 'Air bags, valves and lines', 'Shock absorbers',
    'Anti roll bar and links', 'Axles, U bolts and mountings', 'King pins and wheel bearings'] },
  { id: 'wheels', name: 'Wheels and tyres', items: [
    'Tyre condition and damage', 'Tread depth', 'Tyre pressures', 'Wheel and rim condition',
    'Wheel nut security and indicators', 'Wheel re torque recorded', 'Spare wheel carrier'] },
  { id: 'lights', name: 'Lights and electrics', items: [
    'Headlamps and aim', 'Side and rear lamps', 'Indicators and repeaters', 'Stop lamps',
    'Hazard warning', 'Fog lamps', 'Reversing lamp and alarm', 'Number plate lamp',
    'Reflectors and marker lamps', 'Wiring, looms and connections'] },
  { id: 'exhaust', name: 'Exhaust and emissions', items: [
    'Exhaust system condition and leaks', 'Excessive smoke', 'AdBlue system and level',
    'DPF warning and regeneration', 'Engine oil leaks', 'Coolant leaks and level'] }
];

/* ---------------- driver daily walkaround (DVSA driver defect reporting) ---------------- */
WS.WALKAROUND = [
  { id: 'out', name: 'Outside the cab', items: [
    'Lights and indicators', 'Reflectors and markers', 'Mirrors and glass', 'Wipers and washers',
    'Tyres and wheel fixings', 'Spray suppression', 'Body, doors and shutters', 'Security of load',
    'Number plate', 'Fuel and oil leaks', 'AdBlue level', 'Coupling security'] },
  { id: 'in', name: 'In the cab', items: [
    'Seat belt and seat', 'Steering', 'Horn', 'Brakes and air build up', 'Warning lights',
    'Speedometer and tachograph', 'Heater and demister', 'Height marker correct'] },
  { id: 'gear', name: 'Lifting gear and ancillaries', items: [
    'Rams, pins and hoses', 'Hydraulic oil level', 'Chains, hooks and sheets', 'Safety props and guards',
    'Emergency stop'] }
];

/* ---------------- parts catalogue and stock ---------------- */
WS.PARTS = [
  { name: 'Oil filter', partNo: 'FLT-1184', cost: 14.5, bin: 'A1', warranty: 12 },
  { name: 'Air filter', partNo: 'FLT-2290', cost: 38, bin: 'A1', warranty: 12 },
  { name: 'Fuel filter', partNo: 'FLT-3301', cost: 21, bin: 'A2', warranty: 12 },
  { name: 'Brake pad set', partNo: 'BRK-5540', cost: 96, bin: 'B1', warranty: 24 },
  { name: 'Brake disc', partNo: 'BRK-5612', cost: 128, bin: 'B1', warranty: 24 },
  { name: 'Brake chamber', partNo: 'BRK-5790', cost: 112, bin: 'B2', warranty: 24 },
  { name: 'Brake shoe set', partNo: 'BRK-5833', cost: 142, bin: 'B2', warranty: 24 },
  { name: 'Air dryer cartridge', partNo: 'AIR-6120', cost: 42, bin: 'B3', warranty: 12 },
  { name: 'Drain valve', partNo: 'AIR-6188', cost: 16, bin: 'B3', warranty: 12 },
  { name: 'Wiper blade pair', partNo: 'CAB-7011', cost: 18, bin: 'C1', warranty: 6 },
  { name: 'Side marker lamp', partNo: 'ELE-8042', cost: 12.5, bin: 'C2', warranty: 12 },
  { name: 'Bulb set', partNo: 'ELE-8090', cost: 9.5, bin: 'C2', warranty: 6 },
  { name: 'Indicator lamp', partNo: 'ELE-8121', cost: 24, bin: 'C2', warranty: 12 },
  { name: 'AdBlue 10L', partNo: 'FLU-9010', cost: 11, bin: 'D1', warranty: 0 },
  { name: 'Engine oil 20L', partNo: 'FLU-9044', cost: 84, bin: 'D1', warranty: 0 },
  { name: 'Coolant 5L', partNo: 'FLU-9077', cost: 19, bin: 'D1', warranty: 0 },
  { name: 'Hydraulic hose', partNo: 'HYD-4120', cost: 64, bin: 'E1', warranty: 12 },
  { name: 'Tipping ram seal kit', partNo: 'HYD-4255', cost: 148, bin: 'E1', warranty: 12 },
  { name: 'King pin kit', partNo: 'SUS-3310', cost: 210, bin: 'F1', warranty: 24 },
  { name: 'Shock absorber', partNo: 'SUS-3388', cost: 88, bin: 'F1', warranty: 24 },
  { name: 'Air bag', partNo: 'SUS-3402', cost: 132, bin: 'F2', warranty: 24 },
  { name: 'Tyre 315/80 R22.5', partNo: 'TYR-2215', cost: 268, bin: 'G1', warranty: 0 },
  { name: 'Wheel nut indicators', partNo: 'TYR-2290', cost: 7.5, bin: 'G1', warranty: 0 },
  { name: 'Mudguard', partNo: 'BDY-1140', cost: 46, bin: 'H1', warranty: 12 }
];

WS.JOB_TASKS = {
  'PMI': ['Safety inspection to DVSA template', 'Brake performance test', 'Record odometer', 'Wheel re torque', 'Raise defects and quote', 'Update maintenance file'],
  'Repair': ['Confirm reported fault', 'Diagnose', 'Carry out repair', 'Road test', 'Clean down and hand back'],
  'Defect': ['Confirm driver defect report', 'Rectify defect', 'Sign off rectification', 'Return to service'],
  'MOT prep': ['Pre test inspection', 'Rectify advisories', 'Brake test and print', 'Headlamp aim', 'Clean and present for test'],
  'LOLER': ['Thorough examination of lifting gear', 'Check rams, pins and hoses', 'Function test under load', 'Issue LOLER report', 'Update examination record'],
  'Service': ['Engine oil and filter', 'Air and fuel filters', 'Grease all points', 'Top up fluids', 'Road test'],
  'Tyres': ['Check tread and pressures', 'Fit replacement tyres', 'Torque wheel nuts', 'Fit re torque indicators'],
  'Roadside callout': ['Travel to vehicle', 'Diagnose at roadside', 'Repair or recover', 'Return to base'],
  'Collection / delivery': ['Collect vehicle from operator', 'Check in and record condition', 'Return vehicle to operator'],
  'Vehicle swap': ['Prepare replacement vehicle', 'Swap over and record condition', 'Hand keys and paperwork'],
  'Workshop duties': ['Workshop tidy and sweep', 'Check tool calibration', 'Stock put away']
};

/* job types that do not need a vehicle on the card */
WS.NON_VEHICLE_TYPES = ['Workshop duties'];

/* ---------------- the seed ---------------- */
WS.seed = function () {
  var r = WS.rng(20261104);
  var pick = function (a) { return a[Math.floor(r() * a.length)]; };
  var int = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
  var T = WS.day(0);

  /* Company details are placeholders. Jack: correct these in Settings before this
     goes to the customer. Nothing here was taken from a real company record. */
  var settings = {
    name: 'Noble Commercials Ltd',
    initials: 'NC',
    brand: '#2E6BE6',
    address: 'Unit 7, Beddington Cross, Beddington Lane, Croydon CR0 4XH',
    phone: '020 8683 4120',
    email: 'workshop@noblecommercials.co.uk',
    web: 'noblecommercials.co.uk',
    vatNo: 'GB 418 2290 71',
    companyNo: '00000000',
    opLicence: 'OK2214788',
    bank: 'Lloyds 30-96-24 · 41880237',
    labourRate: 78,
    markup: 25,
    vat: 20,
    dayStart: 7.5,
    dayHours: 8,
    bays: ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5 MOT', 'Mobile van'],
    fitters: [
      { id: 'f1', name: 'Dave Mitchell', pin: '1111', role: 'Workshop foreman', costRate: 26, dayHours: 8, skills: ['PMI', 'LOLER', 'MOT prep', 'Repair', 'Service'] },
      { id: 'f2', name: 'Marek Nowak', pin: '2222', role: 'HGV technician', costRate: 23, dayHours: 8, skills: ['PMI', 'Repair', 'Service', 'Tyres'] },
      { id: 'f3', name: 'Lee Barnard', pin: '3333', role: 'HGV technician', costRate: 23, dayHours: 8, skills: ['PMI', 'Repair', 'Roadside callout', 'Service'] },
      { id: 'f4', name: 'Sam Okafor', pin: '4444', role: 'Apprentice technician', costRate: 14, dayHours: 8, skills: ['Service', 'Tyres', 'Defect'] },
      { id: 'f5', name: 'Ryan Cole', pin: '5555', role: 'Mobile technician', costRate: 25, dayHours: 8, skills: ['Roadside callout', 'Repair', 'Defect', 'Collection / delivery'] }
    ],
    /* standard operational times in hours, used to load the day planner */
    standardTimes: {
      'PMI': 1.5, 'Service': 2, 'Repair': 2, 'Defect': 1, 'MOT prep': 2, 'LOLER': 1,
      'Tyres': 0.75, 'Roadside callout': 2.5, 'Collection / delivery': 1,
      'Vehicle swap': 0.75, 'Workshop duties': 1
    },
    xero: {
      connected: false, key: '', tenant: '', tenantName: '',
      salesAccount: '200', partsAccount: '310', taxType: 'OUTPUT2',
      autoSend: true, lastSync: ''
    },
    notify: { sms: true, email: true, whatsapp: true, fromName: 'Noble Commercials' },
    erTargets: { pmiOnTime: 95, defectsPerPmi: 2.5, motFirstTime: 90, driverChecks: 95 },
    overtimeAfter: 8,
    overtimeRate: 1.5
  };

  var operators = [
    { id: 'o1', name: 'Thameside Skips Ltd', contact: 'Gary Wills', phone: '020 7946 0321', email: 'gary@thamesideskips.co.uk', trade: 'Skip hire', portalPin: '7001', terms: 30, labourRate: 72, discount: 8, markup: 20, creditLimit: 12000 },
    { id: 'o2', name: 'Hanworth Haulage', contact: 'Priya Shah', phone: '020 7946 0455', email: 'priya@hanworthhaulage.co.uk', trade: 'Haulage', portalPin: '7002', terms: 30, labourRate: 78, discount: 0, markup: 25, creditLimit: 8000 },
    { id: 'o3', name: 'Crane and Access Scaffolding', contact: 'Tom Reilly', phone: '020 7946 0677', email: 'tom@caascaffold.co.uk', trade: 'Scaffolding', portalPin: '7003', terms: 14, labourRate: 78, discount: 0, markup: 25, creditLimit: 5000 },
    { id: 'o4', name: 'Boroughs Waste Services', contact: 'Lisa Hammond', phone: '020 7946 0712', email: 'l.hammond@boroughswaste.gov.uk', trade: 'Council contractor', portalPin: '7004', terms: 45, labourRate: 70, discount: 10, markup: 18, creditLimit: 25000 },
    { id: 'o5', name: 'M4 Aggregates', contact: 'Dean Fletcher', phone: '020 7946 0890', email: 'dean@m4aggregates.co.uk', trade: 'Tipper work', portalPin: '7005', terms: 30, labourRate: 78, discount: 5, markup: 25, creditLimit: 10000 },
    { id: 'o6', name: 'Vale Plant Hire', contact: 'Ciaran Doyle', phone: '020 7946 0944', email: 'ciaran@valeplant.co.uk', trade: 'Plant hire', portalPin: '7006', terms: 30, labourRate: 78, discount: 0, markup: 25, creditLimit: 6000 }
  ];

  var suppliers = [
    { id: 's1', name: 'TruckParts Direct', phone: '0121 496 0110', email: 'sales@truckpartsdirect.co.uk', account: 'NOB-4471', lead: 1 },
    { id: 's2', name: 'Croydon Motor Factors', phone: '020 8683 7700', email: 'trade@croydonfactors.co.uk', account: 'CMF-2290', lead: 0 },
    { id: 's3', name: 'DAF Dealer Parts', phone: '020 8561 4000', email: 'parts@dafdealer.co.uk', account: 'D-88120', lead: 2 },
    { id: 's4', name: 'Bandvulc Tyres', phone: '01752 893 600', email: 'orders@bandvulc.co.uk', account: 'BV-7741', lead: 1 }
  ];

  /* ---------------- vehicles ---------------- */
  var specs = [
    { type: 'Skip loader 18t', makes: [['DAF', 'LF 260'], ['Volvo', 'FL 280'], ['MAN', 'TGM 18.250']], loler: true, pmi: 6 },
    { type: 'Skip loader 26t', makes: [['Scania', 'P 280 B6x2'], ['DAF', 'CF 290'], ['Mercedes', 'Antos 2530']], loler: true, pmi: 6 },
    { type: 'Hook loader 32t', makes: [['Volvo', 'FM 460 8x4'], ['Scania', 'G 410 8x4'], ['DAF', 'CF 450 8x4']], loler: true, pmi: 6 },
    { type: 'Tipper 32t', makes: [['MAN', 'TGS 35.440'], ['Mercedes', 'Arocs 3240'], ['Volvo', 'FMX 460']], loler: false, pmi: 8 },
    { type: 'Tractor unit 44t', makes: [['Scania', 'R 450 Highline'], ['DAF', 'XF 480 FTG'], ['Volvo', 'FH 500'], ['Mercedes', 'Actros 2545']], loler: false, pmi: 8 },
    { type: 'Rigid box 18t', makes: [['DAF', 'LF 290'], ['Mercedes', 'Atego 1824']], loler: false, pmi: 10 },
    { type: 'Tipping trailer', makes: [['Wilcox', 'Alloy 58yd'], ['Fruehauf', 'Steel 44yd']], loler: false, pmi: 10 },
    { type: 'Curtainsider trailer', makes: [['SDC', 'Tri axle'], ['Montracon', 'Tri axle']], loler: false, pmi: 10 }
  ];

  var letters = 'ABCDEFGHJKLMNOPRSTUVWXY';
  var areas = ['LV', 'YJ', 'KX', 'BD', 'GH', 'MV', 'RE', 'WP', 'SN', 'FD'];
  var usedRegs = {};
  function reg(year) {
    for (var i = 0; i < 60; i++) {
      var s = pick(areas) + String(year) + ' ' + letters[int(0, 22)] + letters[int(0, 22)] + letters[int(0, 22)];
      if (!usedRegs[s]) { usedRegs[s] = 1; return s; }
    }
    return 'LV21 AAA';
  }

  var vehicles = [], vn = 0;
  var plan = [
    ['o1', 'Skip loader 18t', 3], ['o1', 'Skip loader 26t', 2], ['o1', 'Hook loader 32t', 1],
    ['o2', 'Tractor unit 44t', 4], ['o2', 'Curtainsider trailer', 2],
    ['o3', 'Rigid box 18t', 2], ['o3', 'Skip loader 18t', 1],
    ['o4', 'Hook loader 32t', 3], ['o4', 'Skip loader 26t', 2],
    ['o5', 'Tipper 32t', 4], ['o5', 'Tipping trailer', 2],
    ['o6', 'Tractor unit 44t', 2], ['o6', 'Tipper 32t', 2]
  ];
  plan.forEach(function (p) {
    var spec = specs.filter(function (s) { return s.type === p[1]; })[0];
    for (var i = 0; i < p[2]; i++) {
      vn++;
      var mk = pick(spec.makes);
      var yr = int(17, 24);
      var isTrailer = /trailer/i.test(spec.type);
      var pmiWeeks = spec.pmi;
      var overdue = vn === 4 || vn === 17 || vn === 26;
      var sinceLast = overdue ? pmiWeeks * 7 + int(3, 16) : int(2, pmiWeeks * 7 - 3);
      var lastPmi = WS.day(-sinceLast);
      vehicles.push({
        id: 'v' + vn,
        reg: isTrailer ? 'C' + int(100000, 999999) : reg(yr),
        vin: 'WS' + String(int(100000, 999999)) + 'X' + String(int(10000, 99999)),
        make: mk[0], model: mk[1], year: 2000 + yr,
        type: spec.type,
        operatorId: p[0],
        odometer: isTrailer ? 0 : int(80, 720) * 1000,
        pmiWeeks: pmiWeeks,
        lastPmi: lastPmi,
        nextPmi: WS.day(-sinceLast + pmiWeeks * 7),
        annualTest: WS.day(vn === 7 ? int(-12, -3) : int(16, 330)),
        brakeTest: WS.day(int(10, 170)),
        tacho: isTrailer ? '' : WS.day(vn === 19 ? int(-9, -2) : int(40, 700)),
        loler: spec.loler ? WS.day(int(12, 330)) : '',
        vor: false,
        notes: '',
        docs: [
          { name: 'V5C registration document', at: WS.day(-int(200, 900)) },
          { name: 'Plating certificate', at: WS.day(-int(100, 700)) },
          { name: 'Insurance schedule', at: WS.day(-int(10, 300)) }
        ]
      });
    }
  });
  vehicles[9].vor = true;
  vehicles[9].notes = 'Off road: waiting on a replacement air bag and a brake chamber.';

  /* ---------------- drivers (for the walkaround app) ---------------- */
  var driverNames = [
    ['Steve Bellamy', 'o1'], ['Kev Doran', 'o1'], ['Anita Price', 'o2'], ['Jarek Zielinski', 'o2'],
    ['Mo Rahman', 'o4'], ['Terry Flynn', 'o5'], ['Nicky Adams', 'o5'], ['Paul Osei', 'o6']
  ];
  var drivers = driverNames.map(function (d, i) {
    var mine = vehicles.filter(function (v) { return v.operatorId === d[1] && !/trailer/i.test(v.type); });
    return { id: 'd' + (i + 1), name: d[0], pin: String(2001 + i), operatorId: d[1], vehicleId: (mine[i % Math.max(1, mine.length)] || mine[0] || {}).id || '' };
  });

  /* ---------------- stock ---------------- */
  var stock = WS.PARTS.map(function (p, i) {
    var min = [2, 2, 2, 4, 2, 2, 2, 3, 4, 6, 6, 8, 4, 10, 4, 6, 3, 1, 1, 2, 2, 4, 20, 2][i] || 2;
    var qty = min + int(-2, 8);
    if (i === 5 || i === 20 || i === 12) qty = int(0, 1);
    return {
      id: 'p' + (i + 1), name: p.name, partNo: p.partNo, bin: p.bin,
      qty: Math.max(0, qty), min: min, cost: p.cost, warranty: p.warranty,
      supplierId: /TYR/.test(p.partNo) ? 's4' : /BRK|AIR|SUS/.test(p.partNo) ? 's1' : /HYD|BDY/.test(p.partNo) ? 's3' : 's2',
      onOrder: 0
    };
  });

  /* ---------------- technical library and campaigns ---------------- */
  var library = [
    { id: 'l1', title: 'DAF CF wheel nut torque settings', kind: 'Torque settings', applies: 'DAF', body: 'Front and rear wheel nuts 600 Nm. Re torque between 25 and 50 km after any wheel removal and record it on the job card.' },
    { id: 'l2', title: 'Scania P series PMI schedule', kind: 'Manufacturer schedule', applies: 'Scania', body: 'Safety inspection every 6 weeks for waste and tipper work. Full service every 60,000 km or 12 months, whichever comes first.' },
    { id: 'l3', title: 'DVSA Guide to Maintaining Roadworthiness', kind: 'DVSA guidance', applies: 'All', body: 'Inspection records must be kept for at least 15 months. Brake performance must be assessed at every safety inspection. Records must not be altered after sign off.' },
    { id: 'l4', title: 'Hook loader LOLER thorough examination', kind: 'Procedure', applies: 'Hook loader 32t', body: 'Thorough examination every 12 months, or every 6 months where the equipment lifts people. Record ram, pin, hose and chain condition. Issue a report of thorough examination.' },
    { id: 'l5', title: 'AdBlue and DPF fault finding', kind: 'Fault finding', applies: 'All', body: 'Check AdBlue quality with a refractometer before condemning the SCR system. A failed NOx sensor will log the same fault codes as a dosing failure.' },
    { id: 'l6', title: 'Volvo FM air suspension bleed procedure', kind: 'Procedure', applies: 'Volvo', body: 'Raise on the ECS to maximum, bleed each bag in turn from the nearside rear forward, then reset ride height with the diagnostic tool.' }
  ];

  var campaigns = [
    { id: 'c1', ref: 'R2026-114', title: 'DAF CF steering shaft recall', kind: 'Manufacturer recall', applies: { make: 'DAF' }, detail: 'Inspect the lower steering shaft universal joint for play and replace where movement is felt. Dealer claim applies.', due: WS.day(44), created: WS.day(-12), done: [] },
    { id: 'c2', ref: 'INT-009', title: 'Skip gear hose check', kind: 'Internal campaign', applies: { type: 'Skip loader 18t' }, detail: 'Two hose failures in six weeks. Check all hydraulic hoses for chafing at the chassis rail and fit a sleeve where needed.', due: WS.day(21), created: WS.day(-6), done: [] },
    { id: 'c3', ref: 'SW-2026-3', title: 'Scania EBS software update', kind: 'Software update', applies: { make: 'Scania' }, detail: 'Update EBS to version 3.14 at the next workshop visit. Takes about 40 minutes on the diagnostic tool.', due: WS.day(70), created: WS.day(-20), done: [] }
  ];

  /* ---------------- job builders ---------------- */
  var types = ['PMI', 'Repair', 'Defect', 'MOT prep', 'LOLER', 'Service'];
  var jobs = [], jn = 1000, invoices = [], invn = 4100;

  function std(type) { return settings.standardTimes[type] || 1.5; }

  function newJob(o) {
    jn++;
    var v = o.vehicle;
    var tasks = (WS.JOB_TASKS[o.type] || []).map(function (t, i) { return { id: 't' + i, text: t, done: !!o.tasksDone }; });
    return {
      id: 'j' + jn, no: 'JC' + jn,
      vehicleId: v ? v.id : '', operatorId: o.operatorId || (v ? v.operatorId : ''),
      type: o.type, date: o.date, bay: o.bay || '', fitterId: o.fitterId || '',
      estHours: o.estHours != null ? o.estHours : std(o.type),
      order: o.order != null ? o.order : 99,
      priority: o.priority || 'normal',
      source: o.source || 'Office',
      status: o.status, tasks: tasks, notes: o.notes || '',
      parts: o.parts || [], clockOns: o.clockOns || [], photos: [],
      inspection: o.inspection || null, defects: o.defects || [],
      qc: o.qc || null, invoiceId: '', createdAt: o.createdAt || WS.at(o.date, 7, 30),
      audit: o.audit || [{ at: WS.at(o.date, 7, 30), who: 'Office', what: 'Job card created' }]
    };
  }

  function clockOn(fitterId, date, startH, startM, hours) {
    var s = new Date(WS.at(date, startH, startM));
    var e = new Date(s.getTime() + hours * 3600000);
    return { fitterId: fitterId, start: WS.stampOf(s), end: WS.stampOf(e) };
  }

  function someParts(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var p = pick(WS.PARTS);
      out.push({ name: p.name, partNo: p.partNo, qty: int(1, 2), cost: p.cost });
    }
    return out;
  }

  /* today's clock ons are worked back from the real clock, so the board reads
     sensibly whether the demo is opened at 9am or at teatime */
  function ago(mins) {
    var now = new Date(), d = new Date(now.getTime() - mins * 60000);
    var floor = new Date(); floor.setHours(7, 30, 0, 0);
    if (d < floor) d = floor;
    if (d > now) d = now;
    return WS.stampOf(d);
  }
  function clockAgo(fitterId, startMinsAgo, durMins) {
    return { fitterId: fitterId, start: ago(startMinsAgo), end: ago(Math.max(0, startMinsAgo - durMins)) };
  }

  function filledInspection(v, fitter, date, withDefect) {
    var sections = WS.INSPECTION_TEMPLATE.map(function (sec) {
      return {
        id: sec.id, name: sec.name,
        items: sec.items.map(function (nm, i) {
          var state = 'S';
          if (withDefect && sec.id === 'lights' && i === 2) state = 'D';
          if (nm === 'Spare wheel carrier' || nm === 'Trailer coupling and fifth wheel') state = 'N/A';
          return {
            name: nm, state: state,
            note: state === 'D' ? 'Nearside front indicator intermittent, loose connector at the lamp.' : '',
            photo: '', rectBy: state === 'D' ? fitter.name : '', rectAt: state === 'D' ? date : ''
          };
        })
      };
    });
    var isToday = date === WS.day(0);
    var sgn1 = isToday ? ago(250) : WS.at(date, 15, 20);
    var sgn2 = isToday ? ago(240) : WS.at(date, 15, 35);
    return {
      header: { operator: '', date: date, odometer: v.odometer, inspector: fitter.name },
      sections: sections,
      brake: { method: 'Roller brake test', laden: 'Laden', service: int(52, 68), secondary: int(28, 40), parking: int(19, 28), photo: '', imported: false },
      retorque: { done: true, at: date, km: v.odometer, nm: 600 },
      sign: {
        inspector: { name: fitter.name, at: sgn1, sig: '' },
        declare: { name: 'Dave Mitchell', at: sgn2, sig: '' }
      },
      lockedAt: sgn2
    };
  }

  /* ---------------- history: about two weeks of finished work ---------------- */
  var histDays = [-14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1];
  histDays.forEach(function (d) {
    var dow = WS.parse(WS.day(d)).getDay();
    if (dow === 0) return;
    var count = dow === 6 ? 1 : int(2, 4);
    for (var i = 0; i < count; i++) {
      var v = vehicles[int(0, vehicles.length - 1)];
      var type = pick(types);
      var f = settings.fitters[int(0, 3)];
      var est = std(type);
      var hours = Math.round((est * (0.68 + r() * 0.52)) * 4) / 4;
      if (hours < 0.5) hours = 0.5;
      var withDefect = r() < .4;
      var date = WS.day(d);
      var startH = 8 + (i * 2);
      var job = newJob({
        vehicle: v, type: type, date: date, bay: settings.bays[int(0, 3)], fitterId: f.id,
        status: 'done', tasksDone: true, estHours: est, order: i,
        parts: type === 'PMI' || type === 'Service' ? someParts(int(1, 3)) : someParts(int(0, 2)),
        clockOns: [clockOn(f.id, date, startH > 15 ? 15 : startH, 0, hours)],
        inspection: type === 'PMI' ? filledInspection(v, f, date, withDefect) : null,
        qc: { by: 'Dave Mitchell', at: WS.at(date, 16, 10), note: 'Checked and road tested.' },
        audit: [
          { at: WS.at(date, 7, 30), who: 'Office', what: 'Job card created' },
          { at: WS.at(date, startH > 15 ? 15 : startH, 0), who: f.name, what: 'Clocked on' },
          { at: WS.at(date, 15, 40), who: f.name, what: 'Job marked done, sent to QC' },
          { at: WS.at(date, 16, 10), who: 'Dave Mitchell', what: 'QC signed off' }
        ]
      });
      if (type === 'PMI') {
        job.inspection.header.operator = (operators.filter(function (o) { return o.id === v.operatorId; })[0] || {}).name || '';
        if (withDefect) job.defects = [{ item: 'Indicators and repeaters', note: 'Nearside front indicator intermittent, loose connector at the lamp.', rectBy: f.name, rectAt: date, photo: '' }];
      }
      jobs.push(job);
    }
  });

  /* invoice most of the finished work, and mark the older half as already sent to Xero */
  var done = jobs.filter(function (j) { return j.status === 'done'; });
  done.forEach(function (j, i) {
    if (i % 5 === 4) return;
    invn++;
    var op = operators.filter(function (o) { return o.id === j.operatorId; })[0] || {};
    var rate = op.labourRate || settings.labourRate;
    var mk = op.markup != null ? op.markup : settings.markup;
    var hrs = j.clockOns.reduce(function (s, c) { return s + (new Date(c.end) - new Date(c.start)) / 3600000; }, 0);
    var labour = Math.round(hrs * rate * 100) / 100;
    var partsNet = j.parts.reduce(function (s, p) { return s + p.cost * p.qty * (1 + mk / 100); }, 0);
    partsNet = Math.round(partsNet * 100) / 100;
    var gross = labour + partsNet;
    var disc = Math.round(gross * (op.discount || 0)) / 100;
    var net = Math.round((gross - disc) * 100) / 100;
    var vat = Math.round(net * settings.vat) / 100;
    var paid = i < done.length * 0.45;
    var inv = {
      id: 'i' + invn, no: 'INV-' + invn, jobId: j.id, vehicleId: j.vehicleId, operatorId: j.operatorId,
      date: j.date, due: WS.day(WS.daysBetween(T, j.date) + (op.terms || 30)),
      hours: Math.round(hrs * 100) / 100, rate: rate,
      labour: labour, partsNet: partsNet, discount: disc, net: net, vat: vat,
      total: Math.round((net + vat) * 100) / 100,
      cost: Math.round((j.parts.reduce(function (s, p) { return s + p.cost * p.qty; }, 0) + hrs * 24) * 100) / 100,
      xeroExported: i < done.length * 0.6 ? WS.at(j.date, 17, 0) : '',
      xeroId: i < done.length * 0.6 ? 'XI-' + (90210 + i) : '',
      paid: paid ? WS.at(WS.day(WS.daysBetween(T, j.date) + int(8, 26)), 11, 0) : '',
      parts: j.parts.slice()
    };
    invoices.push(inv);
    j.invoiceId = inv.id;
  });

  /* ---------------- today's board ---------------- */
  var f1 = settings.fitters[0], f2 = settings.fitters[1], f3 = settings.fitters[2],
      f4 = settings.fitters[3], f5 = settings.fitters[4];
  var vIn = function (i) { return vehicles[i]; };

  /* Dave: PMI running now, then two more planned */
  jobs.push(newJob({ vehicle: vIn(6), type: 'PMI', date: T, bay: 'Bay 1', fitterId: f1.id, status: 'qc',
    estHours: 1.5, order: 0, tasksDone: true,
    clockOns: [clockAgo(f1.id, 300, 85)],
    audit: [{ at: ago(310), who: 'Office', what: 'Job card created' },
      { at: ago(300), who: f1.name, what: 'Clocked on' },
      { at: ago(215), who: f1.name, what: 'Job marked done, sent to QC' }] }));

  jobs.push(newJob({ vehicle: vIn(0), type: 'PMI', date: T, bay: 'Bay 1', fitterId: f1.id, status: 'in_progress',
    estHours: 1.5, order: 1,
    clockOns: [{ fitterId: f1.id, start: ago(95), end: '' }],
    audit: [{ at: ago(110), who: 'Office', what: 'Job card created' }, { at: ago(95), who: f1.name, what: 'Clocked on' }] }));

  jobs.push(newJob({ vehicle: vIn(11), type: 'Service', date: T, bay: 'Bay 1', fitterId: f1.id, status: 'booked', estHours: 2, order: 2 }));
  jobs.push(newJob({ vehicle: vIn(24), type: 'LOLER', date: T, bay: 'Bay 1', fitterId: f1.id, status: 'booked', estHours: 1, order: 3 }));

  /* Marek: repair waiting on parts, then a PMI and tyres */
  jobs.push(newJob({ vehicle: vIn(13), type: 'Repair', date: T, bay: 'Bay 2', fitterId: f2.id, status: 'waiting_parts',
    estHours: 2, order: 0,
    notes: 'Air leak at the front axle chamber. Chamber ordered from the dealer, due in tomorrow morning.',
    parts: [{ name: 'Brake chamber', partNo: 'BRK-5790', qty: 1, cost: 112 }],
    clockOns: [clockAgo(f2.id, 240, 105)],
    audit: [{ at: ago(250), who: 'Office', what: 'Job card created' },
      { at: ago(240), who: f2.name, what: 'Clocked on' },
      { at: ago(135), who: f2.name, what: 'Reported waiting on parts: brake chamber on order' }] }));

  jobs.push(newJob({ vehicle: vIn(18), type: 'PMI', date: T, bay: 'Bay 2', fitterId: f2.id, status: 'in_progress',
    estHours: 1.5, order: 1,
    clockOns: [{ fitterId: f2.id, start: ago(125), end: '' }],
    audit: [{ at: ago(130), who: 'Office', what: 'Job card created' }, { at: ago(125), who: f2.name, what: 'Clocked on' }] }));

  jobs.push(newJob({ vehicle: vIn(27), type: 'Tyres', date: T, bay: 'Bay 2', fitterId: f2.id, status: 'booked', estHours: 0.75, order: 2 }));

  /* Lee: one finished this morning, LOLER in the bay, then an overdue PMI squeezed in */
  jobs.push(newJob({ vehicle: vIn(10), type: 'Service', date: T, bay: 'Bay 3', fitterId: f3.id, status: 'done',
    estHours: 2, order: 0, tasksDone: true,
    parts: [{ name: 'Oil filter', partNo: 'FLT-1184', qty: 1, cost: 14.5 }, { name: 'Engine oil 20L', partNo: 'FLU-9044', qty: 1, cost: 84 }],
    clockOns: [clockAgo(f3.id, 320, 115)],
    qc: { by: 'Dave Mitchell', at: ago(195), note: 'Checked and road tested.' },
    audit: [{ at: ago(330), who: 'Office', what: 'Job card created' },
      { at: ago(320), who: f3.name, what: 'Clocked on' },
      { at: ago(205), who: f3.name, what: 'Job marked done, sent to QC' },
      { at: ago(195), who: 'Dave Mitchell', what: 'QC signed off' }] }));

  jobs.push(newJob({ vehicle: vIn(21), type: 'LOLER', date: T, bay: 'Bay 3', fitterId: f3.id, status: 'in_bay',
    estHours: 1, order: 1,
    audit: [{ at: ago(200), who: 'Office', what: 'Job card created' }, { at: ago(150), who: 'Office', what: 'Moved to Bay 3' }] }));

  jobs.push(newJob({ vehicle: vIn(3), type: 'PMI', date: T, bay: 'Bay 3', fitterId: f3.id, status: 'booked',
    estHours: 1.5, order: 2, priority: 'high',
    notes: 'PMI is overdue, operator asked us to fit it in today.' }));

  jobs.push(newJob({ vehicle: vIn(16), type: 'MOT prep', date: T, bay: 'Bay 5 MOT', fitterId: f3.id, status: 'booked', estHours: 2, order: 3 }));

  /* Sam: defect waiting on parts, service, workshop duties */
  jobs.push(newJob({ vehicle: vIn(9), type: 'Defect', date: T, bay: 'Bay 4', fitterId: f4.id, status: 'waiting_parts',
    estHours: 1, order: 0,
    notes: 'Driver reported the vehicle dropping on the nearside. Air bag split. VOR until the part lands.',
    parts: [{ name: 'Air bag', partNo: 'SUS-3402', qty: 1, cost: 132 }],
    clockOns: [clockAgo(f4.id, 200, 75)],
    audit: [{ at: ago(215), who: 'Office', what: 'Job card created' },
      { at: ago(200), who: f4.name, what: 'Clocked on' },
      { at: ago(125), who: f4.name, what: 'Reported VOR: air bag split, part on order' }] }));

  jobs.push(newJob({ vehicle: vIn(25), type: 'Service', date: T, bay: 'Bay 4', fitterId: f4.id, status: 'booked', estHours: 2, order: 1 }));
  jobs.push(newJob({ vehicle: null, operatorId: '', type: 'Workshop duties', date: T, bay: '', fitterId: f4.id, status: 'booked', estHours: 1, order: 2 }));

  /* Ryan, mobile: a roadside callout and a collection */
  jobs.push(newJob({ vehicle: vIn(29), type: 'Roadside callout', date: T, bay: 'Mobile van', fitterId: f5.id, status: 'in_progress',
    estHours: 2.5, order: 0,
    notes: 'Broken down on the A23 at Purley. Reported as no air build up.',
    clockOns: [{ fitterId: f5.id, start: ago(70), end: '' }],
    audit: [{ at: ago(85), who: 'Office', what: 'Job card created from a phone call' }, { at: ago(70), who: f5.name, what: 'Clocked on' }] }));

  jobs.push(newJob({ vehicle: vIn(14), type: 'Collection / delivery', date: T, bay: 'Mobile van', fitterId: f5.id, status: 'booked', estHours: 1, order: 1 }));

  /* unassigned, waiting to be planned */
  jobs.push(newJob({ vehicle: vIn(8), type: 'Repair', date: T, bay: '', fitterId: '', status: 'booked', estHours: 2,
    notes: 'Tipping body creeping down under load. Suspect ram seals.' }));
  jobs.push(newJob({ vehicle: vIn(20), type: 'Defect', date: T, bay: '', fitterId: '', status: 'booked', estHours: 1,
    source: 'Driver check', notes: 'Driver check: offside rear marker lamp out.' }));

  /* ---------------- booked ahead, some already planned to a fitter ---------------- */
  var ahead = [
    [1, 'PMI', 2, f1.id, 0], [1, 'Service', 10, f2.id, 0], [1, 'Repair', 13, f2.id, 1],
    [1, 'MOT prep', 16, '', null], [2, 'PMI', 22, f3.id, 0], [2, 'LOLER', 24, '', null],
    [3, 'PMI', 5, '', null], [3, 'Service', 19, '', null], [4, 'PMI', 28, '', null],
    [6, 'MOT prep', 1, '', null], [7, 'PMI', 12, '', null], [8, 'Service', 23, '', null]
  ];
  ahead.forEach(function (a) {
    jobs.push(newJob({
      vehicle: vehicles[a[2]], type: a[1], date: WS.day(a[0]), bay: '',
      fitterId: a[3], order: a[4] == null ? 99 : a[4], status: 'booked'
    }));
  });

  /* ---------------- driver walkaround checks ---------------- */
  var checks = [];
  function makeCheck(dr, v, dayN, defectItem, severity) {
    var date = WS.day(dayN);
    var sections = WS.WALKAROUND.map(function (sec) {
      return {
        id: sec.id, name: sec.name,
        items: sec.items.map(function (nm) {
          return { name: nm, state: defectItem === nm ? 'D' : 'S', note: defectItem === nm ? severity.note : '', photo: '' };
        })
      };
    });
    return {
      id: 'ck' + (checks.length + 1), driverId: dr.id, vehicleId: v.id, operatorId: v.operatorId,
      date: date, at: dayN === 0 ? ago(int(60, 240)) : WS.at(date, 6, int(10, 55)),
      odometer: v.odometer, sections: sections,
      defects: defectItem ? [{ item: defectItem, note: severity.note, severity: severity.level, photo: '' }] : [],
      nilDefect: !defectItem, jobId: '', seen: dayN < 0,
      location: pick(['Croydon depot', 'Beddington Lane', 'Mitcham yard', 'Purley Way'])
    };
  }
  drivers.forEach(function (dr, i) {
    var v = vehicles.filter(function (x) { return x.id === dr.vehicleId; })[0] || vehicles[i];
    for (var d = -5; d <= -1; d++) {
      if (WS.parse(WS.day(d)).getDay() === 0) continue;
      checks.push(makeCheck(dr, v, d, null, null));
    }
  });
  /* today: most nil defect, two with something found, two not done yet */
  drivers.forEach(function (dr, i) {
    var v = vehicles.filter(function (x) { return x.id === dr.vehicleId; })[0] || vehicles[i];
    if (i === 3 || i === 6) return;   // these two have not checked in yet
    if (i === 2) {
      checks.push(makeCheck(dr, v, 0, 'Lights and indicators', { level: 'Dangerous', note: 'Offside rear marker lamp not working and the lens is cracked.' }));
    } else if (i === 5) {
      checks.push(makeCheck(dr, v, 0, 'Fuel and oil leaks', { level: 'Advisory', note: 'Small oil drip under the gearbox after standing overnight.' }));
    } else {
      checks.push(makeCheck(dr, v, 0, null, null));
    }
  });

  /* ---------------- quotes ---------------- */
  var quotes = [
    { id: 'q1', no: 'QT-2041', operatorId: 'o1', vehicleId: vehicles[2].id, date: WS.day(-3),
      title: 'Skip gear ram reseal and hose replacement',
      lines: [
        { kind: 'Labour', desc: 'Strip, reseal both tipping rams, refit and test', qty: 6, unit: 78 },
        { kind: 'Part', desc: 'Tipping ram seal kit', qty: 2, unit: 185 },
        { kind: 'Part', desc: 'Hydraulic hose', qty: 2, unit: 80 }
      ], status: 'Sent', sentAt: WS.at(WS.day(-3), 14, 10), decidedAt: '' },
    { id: 'q2', no: 'QT-2042', operatorId: 'o5', vehicleId: vehicles[26].id, date: WS.day(-6),
      title: 'Full brake overhaul, drive and trailer axles',
      lines: [
        { kind: 'Labour', desc: 'Brake overhaul, four axles', qty: 9, unit: 74.1 },
        { kind: 'Part', desc: 'Brake shoe set', qty: 4, unit: 177.5 },
        { kind: 'Part', desc: 'Brake chamber', qty: 2, unit: 140 }
      ], status: 'Accepted', sentAt: WS.at(WS.day(-6), 9, 30), decidedAt: WS.at(WS.day(-5), 8, 15) },
    { id: 'q3', no: 'QT-2043', operatorId: 'o3', vehicleId: vehicles[16].id, date: WS.day(-1),
      title: 'Tail lift LOLER rectification',
      lines: [
        { kind: 'Labour', desc: 'Replace worn pivot pins and bushes', qty: 3.5, unit: 78 },
        { kind: 'Part', desc: 'Pin and bush kit', qty: 1, unit: 164 }
      ], status: 'Draft', sentAt: '', decidedAt: '' }
  ];

  /* ---------------- extra work authorisations ---------------- */
  var approvals = [
    { id: 'a1', jobId: '', operatorId: 'o4', vehicleId: vehicles[18].id,
      raisedBy: 'Marek Nowak', raisedAt: ago(165),
      title: 'Nearside front brake discs below limit',
      detail: 'Both nearside front discs are scored past the wear groove and the pads are down to 3 mm. It will not pass a brake test like this.',
      estHours: 2.5, parts: [{ name: 'Brake disc', qty: 2, cost: 128 }, { name: 'Brake pad set', qty: 1, cost: 96 }],
      photos: [], status: 'Sent', sentAt: ago(150), decidedAt: '', decidedBy: '', channel: 'WhatsApp and email' }
  ];

  /* ---------------- purchase orders ---------------- */
  var pos = [
    { id: 'po1', no: 'PO-3310', supplierId: 's3', date: WS.day(-1), status: 'Ordered',
      lines: [{ stockId: 'p6', name: 'Brake chamber', qty: 2, cost: 112 }], expected: WS.day(1), received: '' },
    { id: 'po2', no: 'PO-3311', supplierId: 's1', date: WS.day(-2), status: 'Ordered',
      lines: [{ stockId: 'p21', name: 'Air bag', qty: 2, cost: 132 }], expected: WS.day(0), received: '' },
    { id: 'po3', no: 'PO-3309', supplierId: 's2', date: WS.day(-6), status: 'Received',
      lines: [{ stockId: 'p10', name: 'Wiper blade pair', qty: 6, cost: 18 }, { stockId: 'p12', name: 'Bulb set', qty: 10, cost: 9.5 }],
      expected: WS.day(-5), received: WS.at(WS.day(-5), 10, 20) }
  ];
  stock.filter(function (s) { return s.id === 'p6'; })[0].onOrder = 2;
  stock.filter(function (s) { return s.id === 'p21'; })[0].onOrder = 2;

  /* ---------------- notifications sent out ---------------- */
  var notifications = [
    { id: 'n1', at: ago(150), to: 'Lisa Hammond, Boroughs Waste Services', channel: 'WhatsApp and email',
      subject: 'Extra work needs your OK', body: 'We have found something on ' + vehicles[18].reg + ' that needs your authorisation before we carry on. Photos and a price are on your portal.', kind: 'approval' },
    { id: 'n2', at: ago(420), to: 'Gary Wills, Thameside Skips Ltd', channel: 'SMS',
      subject: 'Vehicle ready', body: vehicles[6].reg + ' has passed its safety inspection and is ready for collection.', kind: 'ready' },
    { id: 'n3', at: WS.at(WS.day(-1), 16, 40), to: 'Priya Shah, Hanworth Haulage', channel: 'Email',
      subject: 'PMI due in 14 days', body: 'Three of your vehicles have a safety inspection due in the next two weeks. Reply to book them in.', kind: 'reminder' }
  ];

  return {
    v: 1,
    settings: settings,
    operators: operators,
    suppliers: suppliers,
    vehicles: vehicles,
    drivers: drivers,
    jobs: jobs,
    invoices: invoices,
    quotes: quotes,
    approvals: approvals,
    stock: stock,
    pos: pos,
    checks: checks,
    campaigns: campaigns,
    library: library,
    notifications: notifications,
    template: WS.INSPECTION_TEMPLATE,
    walkaround: WS.WALKAROUND,
    seededAt: new Date().toISOString(),
    rev: 1
  };
};

window.WS = WS;
