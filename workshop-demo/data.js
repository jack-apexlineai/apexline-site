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

WS.PARTS = [
  { name: 'Oil filter', cost: 14.5 }, { name: 'Air filter', cost: 38 }, { name: 'Fuel filter', cost: 21 },
  { name: 'Brake pad set', cost: 96 }, { name: 'Brake disc', cost: 128 }, { name: 'Air dryer cartridge', cost: 42 },
  { name: 'Wiper blade pair', cost: 18 }, { name: 'Side marker lamp', cost: 12.5 }, { name: 'Bulb set', cost: 9.5 },
  { name: 'AdBlue 10L', cost: 11 }, { name: 'Engine oil 20L', cost: 84 }, { name: 'Coolant 5L', cost: 19 },
  { name: 'Hydraulic hose', cost: 64 }, { name: 'Tipping ram seal kit', cost: 148 }, { name: 'King pin kit', cost: 210 },
  { name: 'Shock absorber', cost: 88 }, { name: 'Brake shoe set', cost: 142 }, { name: 'Tyre 315/80 R22.5', cost: 268 },
  { name: 'Wheel nut indicators', cost: 7.5 }, { name: 'Mudguard', cost: 46 }, { name: 'Air bag', cost: 132 },
  { name: 'Drain valve', cost: 16 }
];

WS.JOB_TASKS = {
  'PMI': ['Safety inspection to DVSA template', 'Brake performance test', 'Record odometer', 'Wheel re torque', 'Raise defects and quote', 'Update maintenance file'],
  'Repair': ['Confirm reported fault', 'Diagnose', 'Carry out repair', 'Road test', 'Clean down and hand back'],
  'Defect': ['Confirm driver defect report', 'Rectify defect', 'Sign off rectification', 'Return to service'],
  'MOT prep': ['Pre test inspection', 'Rectify advisories', 'Brake test and print', 'Headlamp aim', 'Clean and present for test'],
  'LOLER': ['Thorough examination of lifting gear', 'Check rams, pins and hoses', 'Function test under load', 'Issue LOLER report', 'Update examination record'],
  'Service': ['Engine oil and filter', 'Air and fuel filters', 'Grease all points', 'Top up fluids', 'Road test']
};

WS.seed = function () {
  var r = WS.rng(20261104);
  var pick = function (a) { return a[Math.floor(r() * a.length)]; };
  var int = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };

  var settings = {
    name: 'Demo Commercials Ltd',
    address: 'Unit 4, Hanworth Trading Estate, Feltham, London TW13 6DH',
    phone: '020 7946 0188',
    email: 'workshop@democommercials.co.uk',
    vatNo: 'GB 412 7788 03',
    opLicence: 'OK1122334',
    labourRate: 75,
    markup: 20,
    vat: 20,
    bays: ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'],
    fitters: [
      { id: 'f1', name: 'Dave Mitchell', pin: '1111', role: 'Senior fitter' },
      { id: 'f2', name: 'Marek Nowak', pin: '2222', role: 'Fitter' },
      { id: 'f3', name: 'Lee Barnard', pin: '3333', role: 'Fitter' },
      { id: 'f4', name: 'Sam Okafor', pin: '4444', role: 'Apprentice fitter' }
    ]
  };

  var operators = [
    { id: 'o1', name: 'Thameside Skips Ltd', contact: 'Gary Wills', phone: '020 7946 0321', email: 'gary@thamesideskips.co.uk', trade: 'Skip hire' },
    { id: 'o2', name: 'Hanworth Haulage', contact: 'Priya Shah', phone: '020 7946 0455', email: 'priya@hanworthhaulage.co.uk', trade: 'Haulage' },
    { id: 'o3', name: 'Crane and Access Scaffolding', contact: 'Tom Reilly', phone: '020 7946 0677', email: 'tom@caascaffold.co.uk', trade: 'Scaffolding' },
    { id: 'o4', name: 'Boroughs Waste Services', contact: 'Lisa Hammond', phone: '020 7946 0712', email: 'l.hammond@boroughswaste.gov.uk', trade: 'Council contractor' },
    { id: 'o5', name: 'M4 Aggregates', contact: 'Dean Fletcher', phone: '020 7946 0890', email: 'dean@m4aggregates.co.uk', trade: 'Tipper work' },
    { id: 'o6', name: 'Vale Plant Hire', contact: 'Ciaran Doyle', phone: '020 7946 0944', email: 'ciaran@valeplant.co.uk', trade: 'Plant hire' }
  ];

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
  // roughly: skips and hooks for the waste operators, tractors and tippers for the hauliers
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
      // last PMI somewhere inside the interval, a few deliberately overdue
      var overdue = vn === 4 || vn === 17 || vn === 26;
      var sinceLast = overdue ? pmiWeeks * 7 + int(3, 16) : int(2, pmiWeeks * 7 - 3);
      var lastPmi = WS.day(-sinceLast);
      var nextPmi = WS.day(-sinceLast + pmiWeeks * 7);
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
        nextPmi: nextPmi,
        // a well run workshop is mostly in date, so only the odd item is late
        annualTest: WS.day(vn === 7 ? int(-12, -3) : int(16, 330)),
        brakeTest: WS.day(int(10, 170)),
        tacho: isTrailer ? '' : WS.day(vn === 19 ? int(-9, -2) : int(40, 700)),
        loler: spec.loler ? WS.day(int(12, 330)) : '',
        vor: false,
        notes: ''
      });
    }
  });
  // one vehicle off the road
  vehicles[9].vor = true;
  vehicles[9].notes = 'Off road: waiting on a replacement air bag and a brake chamber.';

  var types = ['PMI', 'Repair', 'Defect', 'MOT prep', 'LOLER', 'Service'];
  var jobs = [], jn = 1000, invoices = [], invn = 4100;

  function newJob(o) {
    jn++;
    var v = o.vehicle;
    var tasks = (WS.JOB_TASKS[o.type] || []).map(function (t, i) { return { id: 't' + i, text: t, done: !!o.tasksDone }; });
    return {
      id: 'j' + jn, no: 'JC' + jn,
      vehicleId: v.id, operatorId: v.operatorId,
      type: o.type, date: o.date, bay: o.bay || '', fitterId: o.fitterId || '',
      status: o.status, tasks: tasks, notes: o.notes || '',
      parts: o.parts || [], clockOns: o.clockOns || [], photos: [],
      inspection: o.inspection || null, defects: o.defects || [],
      qc: o.qc || null, invoiceId: '', createdAt: WS.at(o.date, 7, 30),
      audit: o.audit || [{ at: WS.at(o.date, 7, 30), who: 'Office', what: 'Job card created' }]
    };
  }

  function clockOn(fitterId, date, startH, startM, hours) {
    var s = new Date(WS.at(date, startH, startM));
    var e = new Date(s.getTime() + hours * 3600000);
    var fmt = function (d) {
      return WS.iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00';
    };
    return { fitterId: fitterId, start: fmt(s), end: fmt(e) };
  }

  function someParts(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var p = pick(WS.PARTS);
      out.push({ name: p.name, qty: int(1, 2), cost: p.cost });
    }
    return out;
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
    // a sheet signed earlier today must not carry a time that has not happened yet
    var isToday = date === WS.day(0);
    var sgn1 = isToday ? ago(250) : WS.at(date, 15, 20);
    var sgn2 = isToday ? ago(240) : WS.at(date, 15, 35);
    return {
      header: { operator: '', date: date, odometer: v.odometer, inspector: fitter.name },
      sections: sections,
      brake: { method: 'Roller brake test', laden: 'Laden', service: int(52, 68), secondary: int(28, 40), parking: int(19, 28), photo: '' },
      retorque: { done: true, at: date, km: v.odometer },
      sign: {
        inspector: { name: fitter.name, at: sgn1, sig: '' },
        declare: { name: 'Dave Mitchell', at: sgn2, sig: '' }
      },
      lockedAt: sgn2
    };
  }

  // ---- history: about two weeks of finished work ----
  var histDays = [-14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1];
  histDays.forEach(function (d, di) {
    var dow = WS.parse(WS.day(d)).getDay();
    if (dow === 0) return; // no Sunday work
    var count = dow === 6 ? 1 : int(2, 3);
    for (var i = 0; i < count; i++) {
      var v = vehicles[int(0, vehicles.length - 1)];
      var type = pick(types);
      var f = settings.fitters[int(0, 3)];
      var hours = type === 'PMI' ? 3 + r() * 1.5 : type === 'LOLER' ? 2 + r() : 1.5 + r() * 3;
      hours = Math.round(hours * 4) / 4;
      var withDefect = r() < .4;
      var date = WS.day(d);
      var job = newJob({
        vehicle: v, type: type, date: date, bay: settings.bays[int(0, 3)], fitterId: f.id,
        status: 'done', tasksDone: true,
        parts: type === 'PMI' || type === 'Service' ? someParts(int(1, 3)) : someParts(int(0, 2)),
        clockOns: [clockOn(f.id, date, 8, 0, hours)],
        inspection: type === 'PMI' ? filledInspection(v, f, date, withDefect) : null,
        qc: { by: 'Dave Mitchell', at: WS.at(date, 16, 10), note: 'Checked and road tested.' },
        audit: [
          { at: WS.at(date, 7, 30), who: 'Office', what: 'Job card created' },
          { at: WS.at(date, 8, 0), who: f.name, what: 'Clocked on' },
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

  // invoice most of the finished work, and mark the older half as already sent to Xero
  var done = jobs.filter(function (j) { return j.status === 'done'; });
  done.forEach(function (j, i) {
    if (i % 5 === 4) return; // a few left uninvoiced on purpose
    invn++;
    var hrs = j.clockOns.reduce(function (s, c) { return s + (new Date(c.end) - new Date(c.start)) / 3600000; }, 0);
    var labour = Math.round(hrs * settings.labourRate * 100) / 100;
    var partsNet = j.parts.reduce(function (s, p) { return s + p.cost * p.qty * (1 + settings.markup / 100); }, 0);
    partsNet = Math.round(partsNet * 100) / 100;
    var net = Math.round((labour + partsNet) * 100) / 100;
    var vat = Math.round(net * settings.vat) / 100;
    var inv = {
      id: 'i' + invn, no: 'INV-' + invn, jobId: j.id, vehicleId: j.vehicleId, operatorId: j.operatorId,
      date: j.date, hours: Math.round(hrs * 100) / 100, rate: settings.labourRate,
      labour: labour, partsNet: partsNet, net: net, vat: vat, total: Math.round((net + vat) * 100) / 100,
      xeroExported: i < done.length * 0.6 ? WS.at(j.date, 17, 0) : '',
      parts: j.parts.slice()
    };
    invoices.push(inv);
    j.invoiceId = inv.id;
  });

  // ---- today: the board, half full ----
  var T = WS.day(0);

  function stampOf(d) {
    return WS.iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00';
  }
  /* today's clock ons are worked back from the real clock, so the board reads
     sensibly whether the demo is opened at 9am or at teatime */
  function ago(mins) {
    var now = new Date(), d = new Date(now.getTime() - mins * 60000);
    var floor = new Date(); floor.setHours(6, 30, 0, 0);
    if (d < floor) d = floor;
    if (d > now) d = now;
    return stampOf(d);
  }
  function clockAgo(fitterId, startMinsAgo, durMins) {
    return { fitterId: fitterId, start: ago(startMinsAgo), end: ago(Math.max(0, startMinsAgo - durMins)) };
  }

  var f1 = settings.fitters[0], f2 = settings.fitters[1], f3 = settings.fitters[2], f4 = settings.fitters[3];
  var vIn = function (i) { return vehicles[i]; };

  jobs.push(newJob({ vehicle: vIn(0), type: 'PMI', date: T, bay: 'Bay 1', fitterId: f1.id, status: 'in_progress',
    clockOns: [{ fitterId: f1.id, start: ago(95), end: '' }],
    audit: [{ at: ago(110), who: 'Office', what: 'Job card created' }, { at: ago(95), who: f1.name, what: 'Clocked on' }] }));

  jobs.push(newJob({ vehicle: vIn(13), type: 'Repair', date: T, bay: 'Bay 2', fitterId: f2.id, status: 'waiting_parts',
    notes: 'Air leak at the front axle chamber. Chamber ordered from the dealer, due in tomorrow morning.',
    parts: [{ name: 'Brake chamber', qty: 1, cost: 112 }],
    clockOns: [clockAgo(f2.id, 240, 105)],
    audit: [{ at: ago(250), who: 'Office', what: 'Job card created' },
      { at: ago(240), who: f2.name, what: 'Clocked on' },
      { at: ago(135), who: f2.name, what: 'Reported waiting on parts: brake chamber on order' }] }));

  jobs.push(newJob({ vehicle: vIn(21), type: 'LOLER', date: T, bay: 'Bay 3', fitterId: f3.id, status: 'in_bay',
    audit: [{ at: ago(200), who: 'Office', what: 'Job card created' }, { at: ago(150), who: 'Office', what: 'Moved to Bay 3' }] }));

  jobs.push(newJob({ vehicle: vIn(9), type: 'Defect', date: T, bay: 'Bay 4', fitterId: f4.id, status: 'waiting_parts',
    notes: 'Driver reported the vehicle dropping on the nearside. Air bag split. VOR until the part lands.',
    parts: [{ name: 'Air bag', qty: 1, cost: 132 }],
    clockOns: [clockAgo(f4.id, 200, 75)],
    audit: [{ at: ago(215), who: 'Office', what: 'Job card created' },
      { at: ago(200), who: f4.name, what: 'Clocked on' },
      { at: ago(125), who: f4.name, what: 'Reported VOR: air bag split, part on order' }] }));

  jobs.push(newJob({ vehicle: vIn(3), type: 'PMI', date: T, bay: '', fitterId: '', status: 'booked',
    notes: 'PMI is overdue, operator asked us to fit it in today.' }));
  jobs.push(newJob({ vehicle: vIn(16), type: 'MOT prep', date: T, bay: '', fitterId: '', status: 'booked' }));
  jobs.push(newJob({ vehicle: vIn(25), type: 'Service', date: T, bay: '', fitterId: '', status: 'booked' }));

  // one finished this morning and sitting in QC
  var qcJob = newJob({ vehicle: vIn(6), type: 'PMI', date: T, bay: 'Bay 1', fitterId: f1.id, status: 'qc', tasksDone: true,
    clockOns: [clockAgo(f1.id, 300, 75)],
    audit: [{ at: ago(310), who: 'Office', what: 'Job card created' },
      { at: ago(300), who: f1.name, what: 'Clocked on' },
      { at: ago(225), who: f1.name, what: 'Job marked done, sent to QC' }] });
  qcJob.inspection = filledInspection(vIn(6), f1, T, true);
  qcJob.inspection.header.operator = (operators.filter(function (o) { return o.id === vIn(6).operatorId; })[0] || {}).name || '';
  qcJob.defects = [{ item: 'Indicators and repeaters', note: 'Nearside front indicator intermittent, loose connector at the lamp.', rectBy: f1.name, rectAt: T, photo: '' }];
  jobs.push(qcJob);

  // ---- booked ahead ----
  [1, 1, 2, 3, 4, 6].forEach(function (d, i) {
    var v = vehicles[(i * 5 + 2) % vehicles.length];
    jobs.push(newJob({ vehicle: v, type: i % 2 ? 'PMI' : pick(['Repair', 'Service', 'MOT prep']), date: WS.day(d), bay: '', fitterId: '', status: 'booked' }));
  });

  return {
    v: 1,
    settings: settings,
    operators: operators,
    vehicles: vehicles,
    jobs: jobs,
    invoices: invoices,
    template: WS.INSPECTION_TEMPLATE,
    seededAt: new Date().toISOString(),
    rev: 1
  };
};

window.WS = WS;
