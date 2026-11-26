/* Yard core: the lorries, today's jobs, skips on site, tip tickets, waste transfer notes and Defra records.
   Shared by the office (yard.js) and the driver app (driver.html). Everything is sample data in this browser.
   Lorries move on a simulated clock: nothing here is real vehicle tracking until it is linked to the trackers.
   A job a driver has started in the app is still finished by the simulation once that phone is off the screen. */
(function () {
  var YC = window.DSGYC = {};

  /* ---------- fixed sample data ---------- */
  YC.YARD = { name: 'Our yard and transfer station', addr: 'Lakeside Way, Old Woking GU22 9JR', lat: 51.3050, lng: -0.5350, permit: 'EPR/DS4821WK' };
  YC.CARRIER = { name: 'Demo Skip & Grab Ltd', reg: 'CBDU123456', addr: 'Lakeside Way, Old Woking GU22 9JR' };
  YC.TIPS = {
    yard: { n: 'Our transfer station, Old Woking', permit: 'EPR/DS4821WK', lat: 51.3050, lng: -0.5350 },
    soil: { n: 'Wey Valley Soil Recovery, Send', permit: 'EPR/WV2210SD', lat: 51.2790, lng: -0.5180 }
  };
  YC.STREAMS = {
    mixed:    { n: 'Mixed construction and demolition', ewc: '17 09 04', rec: 84, code: 'R13', dens: 0.19, form: 'Mixed' },
    soil:     { n: 'Soil and stones', ewc: '17 05 04', rec: 98, code: 'R5', dens: 0.62, form: 'Solid' },
    hardcore: { n: 'Hardcore and rubble', ewc: '17 01 07', rec: 99, code: 'R5', dens: 0.55, form: 'Solid' },
    concrete: { n: 'Concrete', ewc: '17 01 01', rec: 100, code: 'R5', dens: 0.6, form: 'Solid' },
    wood:     { n: 'Wood', ewc: '17 02 01', rec: 96, code: 'R3', dens: 0.12, form: 'Solid' },
    green:    { n: 'Green waste', ewc: '20 02 01', rec: 100, code: 'R3', dens: 0.1, form: 'Solid' },
    plaster:  { n: 'Plasterboard', ewc: '17 08 02', rec: 92, code: 'R5', dens: 0.2, form: 'Solid' },
    metal:    { n: 'Mixed metals', ewc: '17 04 07', rec: 100, code: 'R4', dens: 0.25, form: 'Solid' },
    house:    { n: 'Household clear-out', ewc: '20 03 01', rec: 68, code: 'R13', dens: 0.14, form: 'Mixed' }
  };
  YC.SIZES = [2, 4, 6, 8, 10, 12, 14, 16];
  YC.RORO_SIZES = [20, 40];
  /* the price list: London prices, ex VAT. RoRos carry a tonnage allowance; every tonne over it is charged at the over rate */
  YC.PRICES = {
    skip: { 2: 150, 4: 230, 6: 280, 8: 320, 10: 360, 12: 395, 14: 430, 16: 460 },
    roro: { 20: { price: 450, incl: 2 }, 40: { price: 595, incl: 3 } },
    overRate: 75, grab: 380, muck: 360, hireDays: 14, permit: 65
  };
  YC.prices = function (Y) { if (Y && !Y.prices) Y.prices = JSON.parse(JSON.stringify(YC.PRICES)); return (Y && Y.prices) || YC.PRICES; };
  YC.isRoro = function (j) { return (j.size || 0) >= 20 && j.type !== 'grab' && j.type !== 'muck'; };
  YC.priceFor = function (Y, j) {
    var P = YC.prices(Y);
    if (j.type === 'grab') return P.grab * (j.loads || 1);
    if (j.type === 'muck') return P.muck * (j.loads || 1);
    if (YC.isRoro(j)) return (P.roro[j.size >= 30 ? 40 : 20]).price;
    return P.skip[j.size] || P.skip[8];
  };
  YC.inclFor = function (Y, j) { var P = YC.prices(Y); return YC.isRoro(j) ? (P.roro[j.size >= 30 ? 40 : 20]).incl : null; };
  /* a RoRo ticket over its allowance: what is owed for the extra weight */
  YC.overCheck = function (Y, t, j) {
    if (!t || !j || !YC.isRoro(j) || t.over) return null;
    var incl = j.incl != null ? j.incl : YC.inclFor(Y, j), rate = YC.prices(Y).overRate;
    if (!(t.net > incl)) return null;
    var over = Math.round((t.net - incl) * 100) / 100, amt = Math.round(over * rate * 100) / 100;
    t.over = { incl: incl, over: over, rate: rate, amount: amt, vat: Math.round(amt * 20) / 100, status: 'pending' };
    return t.over;
  };
  YC.LOAD_T = 16;   /* a grab or muckaway 8-wheeler carries about 16 tonnes */
  YC.LORRIES = [
    { id: 'L1', n: 'Skip lorry 1', reg: 'DS21 SKP', driver: 'Wayne Pike', first: 'Wayne', kind: 'skip', col: '#1F4FA8' },
    { id: 'L2', n: 'Skip lorry 2', reg: 'DS22 SKP', driver: 'Darren Cole', first: 'Darren', kind: 'skip', col: '#1F4FA8' },
    { id: 'L4', n: 'Skip lorry 3', reg: 'DS24 SKP', driver: 'Marcus Dunn', first: 'Marcus', kind: 'skip', col: '#1F4FA8' },
    { id: 'L3', n: 'Hook lorry', reg: 'DS70 RRO', driver: 'Jason Hurst', first: 'Jason', kind: 'roro', col: '#1F4FA8' },
    { id: 'G1', n: 'Grab 1', reg: 'DS19 GRB', driver: 'Ricky Bell', first: 'Ricky', kind: 'grab', col: '#1F4FA8' },
    { id: 'G2', n: 'Grab 2', reg: 'DS23 GRB', driver: 'Callum Reid', first: 'Callum', kind: 'grab', col: '#1F4FA8' }
  ];
  YC.KIND = { skip: 'Skip loader, up to 16 yards', roro: 'Hook lift, 20 and 40 yard', grab: '8-wheel grab lorry' };
  YC.GROUPS = [['skip', 'Skip lorries'], ['roro', 'Hook lift / RoRo'], ['grab', 'Grab lorries']];
  YC.TYPES = {
    deliver: { n: 'Deliver', ic: 'skip', waste: false },
    exchange: { n: 'Exchange', ic: 'exchange', waste: true },
    collect: { n: 'Collect', ic: 'truck', waste: true },
    grab: { n: 'Grab', ic: 'backhoe', waste: true },
    muck: { n: 'Muckaway', ic: 'truck', waste: true }
  };
  /* site positions for the map (sample sites in and around Woking) */
  var P = {
    'GU21 2RX': [51.3180, -0.6100], 'KT14 6EX': [51.3380, -0.5050], 'GU21 4XR': [51.3290, -0.5660], 'GU24 0RT': [51.3040, -0.6330], 'KT14 7QZ': [51.3430, -0.4750],
    'GU22 7HT': [51.3160, -0.5530], 'GU21 4JX': [51.3260, -0.5740], 'KT13 8RS': [51.3710, -0.4570], 'GU24 8TJ': [51.3470, -0.6030], 'GU18 5QW': [51.3470, -0.6670],
    'GU21 5QB': [51.3300, -0.5280], 'GU22 8QN': [51.3170, -0.5060], 'KT16 0SD': [51.3640, -0.5270], 'KT15 1EX': [51.3690, -0.4900], 'GU21 3NN': [51.3180, -0.5890],
    'GU15 3HN': [51.3370, -0.7440], 'GU23 6AR': [51.2990, -0.4910], 'GU1 3JT': [51.2360, -0.5720], 'GU22 8LT': [51.3220, -0.5400], 'GU24 9QA': [51.3260, -0.6300],
    'KT15 3JP': [51.3510, -0.4970], 'KT16 9PH': [51.3890, -0.5080], 'GU19 5AA': [51.3600, -0.6920], 'GU21 7AA': [51.3120, -0.5820], 'GU22 0EF': [51.2930, -0.5670],
    'GU24 9PS': [51.3380, -0.6320], 'GU23 7JB': [51.2850, -0.5290], 'GU22 7XQ': [51.3140, -0.5470]
  };
  YC.pos = function (pc) { var p = P[pc]; return p ? { lat: p[0], lng: p[1] } : { lat: YC.YARD.lat, lng: YC.YARD.lng }; };
  /* extra one-off sites (domestic and small trade, not account customers) */
  var ONEOFF = {
    o1: { name: 'Mrs Helen Ashworth', site: 'Station Road, St Johns', pc: 'GU21 7AA', phone: '07700 900355' },
    o2: { name: 'Mr Ian Pell', site: 'Greenway, Mayford', pc: 'GU22 0EF', phone: '07700 900366' },
    o3: { name: 'Mrs Lisa Moreton', site: 'Holt Road, West End', pc: 'GU24 9PS', phone: '07700 900377' },
    o4: { name: 'Mr Tom Garside', site: 'Linden Road, Send', pc: 'GU23 7JB', phone: '07700 900388' },
    o5: { name: 'Mrs Sarah Okafor', site: '14 Oakfield Road, Woking', pc: 'GU22 7XQ', phone: '07700 900399' }
  };
  YC.oneoff = function (id) { return ONEOFF[id]; };

  function hash(s) { var n = 0; s = String(s); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }
  YC.hash = hash;
  function rnd(s, a, b) { return a + (hash(s) % 1000) / 1000 * (b - a); }

  /* ---------- clock ---------- */
  /* minutes since midnight on the UK clock. Before 07:15 or after 16:45 the yard shows as it was at 13:40, so the demo always has a working day to show */
  YC.nowMin = function () {
    var d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    if (m < 435 || m > 1005) return 820;
    return m;
  };
  YC.hhmm = function (m) { m = Math.round(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  YC.win = function (j) { return YC.hhmm(j.win[0]) + ' to ' + YC.hhmm(j.win[1]); };
  YC.TRAVEL = 150000; YC.DWELL = 70000;   /* demo time: a leg takes two and a half minutes, a stop a little over one */

  /* ---------- building the day ---------- */
  function J(id, lorry, w0, w1, type, cust, site, size, stream, extra) {
    var j = { id: id, day: 0, lorry: lorry, win: [w0, w1], type: type, cust: cust, site: site, size: size || null, loads: null, stream: stream, place: 'drive', permit: null,
      status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: '', log: [] };
    if (extra) for (var k in extra) j[k] = extra[k];
    if ((type === 'grab' || type === 'muck') && !j.loads) j.loads = 1;
    return j;
  }
  function siteOf(S, cust, idx) {
    if (ONEOFF[cust]) { var o = ONEOFF[cust]; return { name: o.site, pc: o.pc }; }
    var c = (S.customers || []).filter(function (x) { return x.id === cust; })[0];
    var s = c && c.sites[idx || 0]; return s ? { name: s.name, pc: s.pc } : { name: 'Site', pc: 'HA1 2LT' };
  }
  function permitFor(pc, j, from, to) {
    var council = 'Surrey County Council';   /* in Surrey the county council licenses skips on the road */
    return { council: council, ref: 'SKP/' + (2600 + hash(j) % 900), from: from, to: to };
  }
  YC.permitFor = permitFor;
  function seedJobs(S) {
    var L = [
      J('DSG-3101', 'L1', 450, 510, 'deliver', 'c1', 0, 8, 'mixed'),
      J('DSG-3102', 'L1', 540, 600, 'exchange', 'c4', 1, 6, 'mixed'),
      J('DSG-3103', 'L1', 660, 720, 'collect', 'c11', 0, 8, 'wood'),
      J('DSG-3104', 'L1', 780, 840, 'deliver', 'c13', 0, 6, 'house', { place: 'road' }),
      J('DSG-3105', 'L1', 870, 930, 'exchange', 'c1', 1, 8, 'mixed'),
      J('DSG-3111', 'L2', 450, 510, 'collect', 'c7', 0, 12, 'green'),
      J('DSG-3112', 'L2', 570, 630, 'deliver', 'c12', 0, 12, 'plaster'),
      J('DSG-3113', 'L2', 660, 720, 'exchange', 'c13', 1, 8, 'house', { place: 'road' }),
      J('DSG-3114', 'L2', 810, 870, 'deliver', 'o2', 0, 4, 'house'),
      J('DSG-3115', 'L2', 900, 960, 'collect', 'c12', 1, 6, 'mixed', { place: 'road' }),
      J('DSG-3120', 'L3', 420, 470, 'collect', 'c14', 1, 40, 'mixed'),
      J('DSG-3121', 'L3', 510, 590, 'deliver', 'c14', 0, 20, 'mixed'),
      J('DSG-3122', 'L3', 630, 720, 'exchange', 'c14', 2, 40, 'mixed'),
      J('DSG-3123', 'L3', 810, 900, 'collect', 'c1', 0, 20, 'hardcore'),
      J('DSG-3131', 'G1', 480, 540, 'grab', 'c1', 1, null, 'soil', { loads: 2 }),
      J('DSG-3132', 'G1', 600, 660, 'grab', 'c4', 1, null, 'hardcore'),
      J('DSG-3133', 'G1', 720, 780, 'muck', 'c11', 1, null, 'soil', { loads: 2 }),
      J('DSG-3134', 'G1', 840, 900, 'grab', 'o1', 0, null, 'soil'),
      J('DSG-3141', 'G2', 510, 570, 'grab', 'c14', 0, null, 'soil', { loads: 3 }),
      J('DSG-3142', 'G2', 660, 720, 'grab', 'c14', 2, null, 'concrete'),
      J('DSG-3143', 'G2', 810, 870, 'muck', 'c12', 0, null, 'soil'),
      J('DSG-3144', 'G2', 900, 960, 'grab', 'c13', 0, null, 'hardcore'),
      /* not given a lorry yet: these are for dragging onto the plan */
      J('DSG-3151', null, 720, 840, 'deliver', 'o4', 0, 8, 'mixed'),
      J('DSG-3152', null, 840, 960, 'collect', 'o3', 0, 6, 'house', { place: 'road' }),
      J('DSG-3153', null, 780, 900, 'grab', 'c2', 0, null, 'soil')
    ];
    L.forEach(function (j) {
      var s = siteOf(S, j.cust, j.site); j.site = s; var p = YC.pos(s.pc); j.lat = p.lat; j.lng = p.lng;
      if (j.place === 'road') j.permit = permitFor(s.pc, j.id, -2, 12);
      j.price = YC.priceFor(null, j); j.incl = YC.inclFor(null, j);
    });
    /* tomorrow, so the plan has a next day to look at */
    var t1 = YC.wd1 || 1, T = [
      J('DSG-3161', 'L1', 450, 510, 'deliver', 'c14', 2, 8, 'mixed'), J('DSG-3162', 'L1', 570, 630, 'collect', 'c4', 0, 6, 'mixed', { place: 'road' }),
      J('DSG-3163', 'L2', 480, 540, 'exchange', 'c12', 0, 12, 'plaster'), J('DSG-3164', 'L3', 480, 570, 'deliver', 'c14', 0, 40, 'mixed'),
      J('DSG-3165', 'G1', 480, 540, 'grab', 'c11', 1, null, 'soil', { loads: 2 }), J('DSG-3166', 'G2', 540, 600, 'muck', 'c14', 0, null, 'soil', { loads: 4 })
    ];
    T.forEach(function (j) { j.price = YC.priceFor(null, j); j.incl = YC.inclFor(null, j); j.day = t1; var s = siteOf(S, j.cust, j.site); j.site = s; var p = YC.pos(s.pc); j.lat = p.lat; j.lng = p.lng; if (j.place === 'road') j.permit = permitFor(s.pc, j.id, t1 - 1, t1 + 13); });
    return L.concat(T);
  }
  function seedOnsite(S) {
    var R = [
      ['S-0412', 8, 'c1', 0, -9, 'mixed'], ['S-0388', 6, 'c4', 1, -16, 'mixed'], ['S-0451', 12, 'c12', 0, -4, 'plaster'], ['S-0367', 8, 'c11', 1, -19, 'wood', 'road'],
      ['S-0420', 4, 'o2', 0, -2, 'house'], ['S-0398', 16, 'c14', 0, -11, 'mixed'], ['S-0402', 8, 'c13', 1, -14, 'house', 'road'], ['S-0377', 6, 'c7', 0, -22, 'green'],
      ['S-0433', 10, 'c12', 1, -6, 'mixed', 'road'], ['R-0091', 20, 'c14', 1, -8, 'mixed'], ['R-0087', 40, 'c14', 2, -15, 'mixed'], ['S-0445', 8, 'c2', 0, -3, 'mixed'],
      ['S-0359', 6, 'o3', 0, -26, 'house', 'road'], ['S-0461', 8, 'c1', 1, -1, 'soil'], ['S-0429', 12, 'c11', 0, -13, 'wood'], ['S-0414', 6, 'o1', 0, -7, 'house']
    ];
    return R.map(function (r) {
      var s = siteOf(S, r[2], r[3]), p = YC.pos(s.pc), o = { id: r[0], size: r[1], cust: r[2], site: s, lat: p.lat, lng: p.lng, since: r[4], stream: r[5], hire: 14, place: r[6] || 'drive', booked: null };
      if (o.place === 'road') o.permit = permitFor(s.pc, r[0], r[4], r[4] + 14);
      return o;
    });
  }
  YC.custName = function (S, id) {
    if (ONEOFF[id]) return ONEOFF[id].name;
    var c = (S.customers || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : 'Customer';
  };
  YC.custFirst = function (S, id) {
    if (ONEOFF[id]) return ONEOFF[id].name.replace(/^(Mrs|Mr|Ms|Miss)\s+/, '').split(' ')[0];
    var c = (S.customers || []).filter(function (x) { return x.id === id; })[0]; return c ? (c.first || String(c.contact).split(' ')[0]) : 'there';
  };
  YC.lorry = function (id) { return YC.LORRIES.filter(function (l) { return l.id === id; })[0] || null; };
  YC.what = function (j) {
    if (j.type === 'grab' || j.type === 'muck') return (j.type === 'grab' ? 'Grab' : 'Muckaway') + ', ' + j.loads + ' load' + (j.loads === 1 ? '' : 's') + ' (about ' + (j.loads * YC.LOAD_T) + 't)';
    return YC.TYPES[j.type].n + ' ' + j.size + ' yard ' + (j.size >= 20 ? 'RoRo' : 'skip');
  };
  YC.whatShort = function (j) {
    if (j.type === 'grab' || j.type === 'muck') return j.loads + ' x ' + (j.type === 'grab' ? 'grab' : 'muckaway');
    return j.size + 'yd ' + YC.TYPES[j.type].n.toLowerCase();
  };

  /* history: yesterday's and earlier tickets, so the weighbridge and Defra lists are full on first look */
  function seedHistory(S, Y) {
    var cs = ['c1', 'c4', 'c11', 'c12', 'c13', 'c14', 'c7', 'o1', 'o2'], st = ['mixed', 'mixed', 'soil', 'hardcore', 'wood', 'green', 'plaster', 'house', 'concrete'], n = 0;
    for (var d = -1; d >= -6; d--) {
      var wd = new Date(); wd.setDate(wd.getDate() + d); if (wd.getDay() === 0 || wd.getDay() === 6) continue;
      for (var i = 0; i < 9; i++) {
        var id = 'H' + (-d) + '-' + i, s = st[(i + (-d)) % st.length], c = cs[(i * 3 + (-d)) % cs.length], grab = s === 'soil' || s === 'concrete', tip = (s === 'soil' || s === 'concrete' || s === 'hardcore') && i % 2 ? 'soil' : 'yard';
        var lorry = grab ? (i % 2 ? 'G1' : 'G2') : (i % 3 === 0 ? 'L3' : i % 2 ? 'L1' : 'L2'), size = grab ? null : [6, 8, 8, 12, 4, 16, 20][i % 7];
        var net = grab ? Math.round(rnd(id, 12.5, 16.5) * 100) / 100 : Math.round(size * YC.STREAMS[s].dens * rnd(id + 'w', 0.8, 1.25) * 100) / 100;
        var t = { id: 'T-' + (48210 + (n++)), day: d, time: 480 + i * 52, site: tip, lorry: lorry, net: net, gross: Math.round((net + (grab ? 15.2 : 9.8)) * 100) / 100, stream: s, cust: c, job: 'DSG-' + (2900 + n), matched: true, read: 'Weighbridge' };
        Y.tickets.push(t);
      }
    }
  }
  /* ---------- days, capacity and Saturdays ---------- */
  YC.CAP = { day: 26, sat: 10 };
  YC.dayDate = function (off) { if (YC._CS && YC._CS.dayDate) return YC._CS.dayDate(off); var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; };
  YC.isSat = function (off) { return YC.dayDate(off).getDay() === 6; };
  YC.isSun = function (off) { return YC.dayDate(off).getDay() === 0; };
  /* count working days from tomorrow: Saturdays count only if the yard works them */
  YC.workDays = function (from, n, sat) { var o = [], d = from; while (o.length < n && d < from + 60) { var w = YC.dayDate(d).getDay(); if (w !== 0 && (sat || w !== 6)) o.push(d); d++; } return o; };
  YC.nthWorkDay = function (n) { return YC.workDays(1, n, false)[n - 1]; };   /* Monday to Friday, for council permits */
  YC.cap = function (off) { return YC.isSat(off) ? YC.CAP.sat : YC.CAP.day; };
  YC.booked = function (Y, off) { return Y.jobs.filter(function (j) { return j.day === off; }).length; };
  YC.full = function (Y, off) { return YC.booked(Y, off) >= YC.cap(off); };
  YC.soonest = function (Y, from, sat) { var L = YC.workDays(from, 30, sat); for (var i = 0; i < L.length; i++) if (!YC.full(Y, L[i])) return L[i]; return L[L.length - 1]; };
  function fillDay(S, Y, off, startN) {
    var cs = ['c1', 'c2', 'c4', 'c11', 'c12', 'c13', 'c14', 'c6', 'c7'], ly = ['L1', 'L2', 'G1', 'G2', 'L3'], sat = YC.isSat(off), n = startN, k = 0;
    var have = YC.forLorryAny ? 0 : 0;
    while (YC.booked(Y, off) < YC.cap(off) && k < 40) {
      var lid = ly[k % ly.length], lo = YC.lorry(lid), c = cs[(k * 5 + off) % cs.length], idx = k % 2, cust = (S.customers || []).filter(function (x) { return x.id === c; })[0];
      if (cust && idx >= cust.sites.length) idx = 0;
      var used = Y.jobs.filter(function (j) { return j.day === off && j.lorry === lid; }).length, w0 = 450 + used * 75;
      if (sat && w0 > 690) { k++; continue; }
      var type = lo.kind === 'grab' ? 'grab' : ['deliver', 'exchange', 'collect'][k % 3], size = lo.kind === 'roro' ? (k % 2 ? 20 : 40) : lo.kind === 'grab' ? null : [6, 8, 8, 12, 4][k % 5];
      var j = J('DSG-' + (n++), lid, w0, w0 + 60, type, c, idx, size, type === 'grab' ? 'soil' : 'mixed');
      var st = siteOf(S, c, idx); j.site = st; var p = YC.pos(st.pc); j.lat = p.lat; j.lng = p.lng; j.day = off; j.price = YC.priceFor(null, j); j.incl = YC.inclFor(null, j);
      Y.jobs.push(j); k++;
    }
    return n;
  }
  YC.fresh = function (S, CS) {
    YC._CS = CS || YC._CS;
    YC.wd1 = CS && CS.wd ? CS.wd(1) : 1;
    var Y = { v: 1, day: S.seededDay, made: Date.now(), jobs: seedJobs(S), onsite: seedOnsite(S), tickets: [], defra: [], problems: [], texts: [], feed: [], counters: { job: 3300, ticket: 48700, wtn: 5200 } };
    seedHistory(S, Y);
    /* tomorrow and the next working day are full, so New booking offers the soonest day with room */
    var busy = YC.workDays(1, 2, true), nid = 3200; busy.forEach(function (off) { nid = fillDay(S, Y, off, nid); });
    /* permits: every road job and road skip has a card; one booked half an hour ago has not been applied for yet */
    var pn = 501, now0 = Date.now();
    Y.permits = [];
    function addP(o, st, paidBy, created, job) {
      if (Y.permits.some(function (p) { return p.addr === o.site.name && p.pc === o.site.pc; })) return;
      Y.permits.push({ id: 'PM-' + (pn++), job: job || null, skip: o.id && !job ? o.id : null, cust: o.cust, addr: o.site.name, pc: o.site.pc, council: 'Surrey County Council', status: st, paidBy: paidBy, price: YC.PRICES.permit,
        ref: o.permit ? o.permit.ref : null, from: o.permit ? o.permit.from : null, to: o.permit ? o.permit.to : null, createdAt: created, log: [] });
    }
    Y.onsite.filter(function (o) { return o.permit; }).forEach(function (o, i) { addP(o, 'approved', i % 2 ? 'customer' : 'us', now0 - (20 + i) * 86400000); });
    Y.jobs.filter(function (j) { return j.permit && j.day === 0; }).forEach(function (j, i) { addP(j, 'approved', i % 2 ? 'us' : 'customer', now0 - 6 * 86400000, j.id); });
    Y.jobs.filter(function (j) { return j.permit && j.day > 0; }).forEach(function (j) { addP(j, 'waiting', 'customer', now0 - 3 * 86400000, j.id); });
    var d4 = YC.nthWorkDay(4), d5 = YC.nthWorkDay(5);
    [['DSG-3168', 'c2', 0, d4, 'applied', null, now0 - 2 * 86400000], ['DSG-3169', 'o5', 0, d5, 'apply', null, now0 - 29 * 60000]].forEach(function (r) {
      var j = J(r[0], null, 450, 720, 'deliver', r[1], r[2], 8, r[1] === 'o5' ? 'house' : 'mixed', { place: 'road' }), st = siteOf(S, r[1], r[2]); j.site = st; var p = YC.pos(st.pc); j.lat = p.lat; j.lng = p.lng; j.day = r[3];
      j.permit = permitFor(st.pc, j.id, r[3], r[3] + 14); j.price = YC.priceFor(null, j) + YC.PRICES.permit; j.incl = null; j.log.push({ at: r[6], t: 'Booked on the road, permit needed' });
      Y.jobs.push(j); addP(j, r[4], r[5], r[6], j.id);
    });
    /* the inbox: two messages, one wants a price, one wants to book (a voice note, written out) */
    Y.inbox = [
      { id: 'm1', kind: 'quote', ch: 'wa', cust: 'c5', site: 0, size: 8, at: now0 - 14 * 60000, unread: true,
        text: 'Hi Dave, how much for an 8 yard skip at Westgate Road in Weybridge? It can go on the drive. Thanks' },
      { id: 'm2', kind: 'book', ch: 'wa', cust: 'c4', site: 1, size: 6, voice: 11, at: now0 - 6 * 60000, unread: true,
        text: 'Morning Dave, it\'s Rob. Can you drop a 6 yarder at the Horsell job, first day you\'ve got, morning please. On the drive like last time. Cheers mate' }
    ];
    /* two tickets read off a photo that did not match a job by themselves */
    Y.tickets.push({ id: 'T-48690', day: 0, time: 560, site: 'yard', lorry: 'L2', net: 1.84, gross: 11.62, stream: 'mixed', cust: null, job: null, matched: false, read: 'Photo of the ticket' });
    Y.tickets.push({ id: 'T-48691', day: 0, time: 605, site: 'soil', lorry: 'G1', net: 15.12, gross: 30.4, stream: 'soil', cust: null, job: null, matched: false, read: 'Photo of the ticket' });
    /* loads other carriers tipped at our transfer station today: the Defra receipt is ours to report */
    Y.incoming = [
      { id: 'IN-771', time: 545, carrier: 'Ringway Skip Hire', reg: 'CBDU377415', veh: 'RM68 SKP', stream: 'mixed', net: 2.12, est: false },
      { id: 'IN-772', time: 610, carrier: 'Westfield Roofing (own waste)', reg: '', veh: 'WR19 VAN', stream: 'wood', net: 0.86, est: false, why: 'No carrier registration number, and no reason given' },
      { id: 'IN-773', time: 655, carrier: 'Colne Valley Skips', reg: 'CBDU418027', veh: 'SS70 HKL', stream: 'mixed', net: null, est: true, why: 'No weight: the weighbridge was down, so an estimate has to be entered' }
    ];
    /* the first RoRo of the day came back heavy: it waits on the weighbridge screen for one tap */
    var b0 = new Date(); b0.setHours(0, 0, 0, 0);
    var heavy = Y.jobs.filter(function (j) { return j.id === 'DSG-3120'; })[0];
    if (heavy) {
      heavy.at.onway = b0.getTime() + 415 * 60000; heavy.at.arrived = b0.getTime() + 430 * 60000; heavy.eta = { at: heavy.at.onway, text: '' };
      YC.complete(S, Y, heavy, { net: 4.86, plate: true }, b0.getTime() + 455 * 60000);
    }
    YC.settle(S, Y, true);
    /* the day plan starts nearly empty: each lorry keeps what it has done and the job it is on, the rest of today waits in Unplanned */
    /* and whatever the time of day, there is a list of jobs waiting to be planned */
    var nowM = YC.nowMin(), base = Math.max(480, Math.min(nowM + 30, 900)), FILL = [['deliver', 'c2', 1, 6, 'mixed'], ['grab', 'c1', 1, null, 'soil'], ['exchange', 'c12', 0, 8, 'plaster'], ['collect', 'c11', 0, 12, 'wood'], ['muck', 'c14', 0, null, 'soil'], ['deliver', 'c14', 1, 20, 'mixed'], ['deliver', 'o1', 0, 4, 'house']];
    FILL.forEach(function (f, i) {
      var w0 = Math.min(990, base + i * 25), j = J('DSG-' + (3180 + i), null, w0, w0 + 60, f[0], f[1], f[2], f[3], f[4]), st = siteOf(S, f[1], f[2]);
      j.site = st; var pp = YC.pos(st.pc); j.lat = pp.lat; j.lng = pp.lng; j.price = YC.priceFor(null, j); j.incl = YC.inclFor(null, j); Y.jobs.push(j);
    });
    YC.LORRIES.forEach(function (lo) { var act = YC.active(YC.forLorry(Y, lo.id, 0)); Y.jobs.forEach(function (j) { if (j.day === 0 && j.lorry === lo.id && j.status === 'planned' && j !== act) j.lorry = null; }); });
    return Y;
  };
  YC.ensure = function (S, CS) {
    if (!S) return null;
    if (!S.yard || S.yard.day !== S.seededDay || !S.yard.jobs) S.yard = YC.fresh(S, CS);
    else if (!YC._caught) { YC._caught = true; YC.settle(S, S.yard, false); }   /* opened again later in the day: catch up to the clock once */
    return S.yard;
  };
  YC.today = function (Y) { return Y.jobs.filter(function (j) { return j.day === 0; }); };
  YC.forLorry = function (Y, id, day) { return Y.jobs.filter(function (j) { return j.lorry === id && (j.day || 0) === (day || 0); }).sort(function (a, b) { return a.win[0] - b.win[0]; }); };

  /* ---------- finishing a job: ticket, WTN and Defra record ---------- */
  function tipFor(j) { return (j.stream === 'soil' || j.stream === 'concrete' || (j.stream === 'hardcore' && (j.type === 'grab' || j.type === 'muck'))) ? 'soil' : 'yard'; }
  YC.weight = function (j) {
    if (j.type === 'grab' || j.type === 'muck') return Math.round(j.loads * rnd(j.id, 13.2, 16.4) * 100) / 100;
    var w = Math.round((j.size || 8) * YC.STREAMS[j.stream].dens * rnd(j.id + 'w', 0.85, 1.2) * 100) / 100;
    if (YC.isRoro(j)) { var inc = j.incl != null ? j.incl : YC.inclFor(null, j); if (w > inc * 0.95) w = Math.round(inc * rnd(j.id + 'r', 0.78, 0.94) * 100) / 100; }   /* the weighbridge decides if a RoRo is over; a normal day stays inside */
    return w;
  };
  YC.complete = function (S, Y, j, data, when) {
    data = data || {}; when = when || Date.now();
    j.status = 'done'; j.at.done = when; if (!j.at.arrived) j.at.arrived = when - 600000; if (!j.at.onway) j.at.onway = j.at.arrived - 1500000;
    if (!j.photos.length) j.photos.push({ k: j.type === 'deliver' ? 'drop' : 'collect', sample: true, at: when });
    if (!j.sig) j.sig = { name: YC.custFirst(S, j.cust) + (YC.oneoff(j.cust) ? '' : ' (site)'), sample: true, at: when };
    if (YC.TYPES[j.type].waste && !j.ticket) {
      var lo = YC.lorry(j.lorry), net = data.net != null ? data.net : YC.weight(j);
      var t = { id: data.ticketNo || ('T-' + (Y.counters.ticket++)), day: 0, time: Math.min(1020, (new Date(when).getHours() * 60 + new Date(when).getMinutes()) + 25), site: tipFor(j), lorry: j.lorry, net: net,
        gross: Math.round((net + (lo && lo.kind !== 'skip' ? 15.2 : 9.8)) * 100) / 100, stream: j.stream, cust: j.cust, job: j.id, matched: true, read: data.ticketNo ? 'Driver typed it in' : data.plate ? 'Weighbridge, number plate read' : 'Weighbridge' };
      if (data.gross) { t.gross = data.gross; t.tare = data.tare; }
      Y.tickets.push(t); j.ticket = t.id;
      if (YC.overCheck(Y, t, j)) { t.onBridge = when; j.log.push({ at: when, t: t.net.toFixed(2) + ' t on the weighbridge, ' + t.over.over.toFixed(2) + ' t over the ' + t.over.incl + ' t included' }); }
    }
    if (YC.TYPES[j.type].waste && !j.wtn) j.wtn = 'WTN-' + (Y.counters.wtn++);
    j.log.push({ at: when, t: 'Done' });
    Y.v++;
  };
  /* on the day the demo opens, everything that should be finished by now is */
  YC.settle = function (S, Y, first) {
    var now = YC.nowMin(), base = new Date(); base.setHours(0, 0, 0, 0);
    function ts(m) { return base.getTime() + m * 60000; }
    YC.LORRIES.forEach(function (lo) {
      var list = YC.forLorry(Y, lo.id, 0), cur = null;
      list.forEach(function (j) {
        if (j.status === 'done') return;
        if (j.manual) { if (!cur) cur = j; return; }
        if (j.win[1] + 10 <= now && !cur) {
          j.at.onway = ts(j.win[0] - 25); j.at.arrived = ts(j.win[0] + 5);
          j.eta = { at: ts(j.win[0] - 25), text: etaAt(S, j, 20 + YC.hash(j.id) % 15, j.win[0] - 25) }; Y.texts.unshift({ at: j.eta.at, job: j.id, to: YC.custName(S, j.cust), text: j.eta.text });
          YC.complete(S, Y, j, null, ts(j.win[0] + 25 + hash(j.id) % 20));
        } else if (!cur) cur = j;
      });
      if (cur && first) { cur.status = 'onway'; cur.at.onway = Date.now() - (hash(cur.id) % 60) * 1000 - 20000; cur.eta = { at: ts(now), text: etaAt(S, cur, 15 + hash(cur.id) % 20, now) }; Y.texts.unshift({ at: ts(now), job: cur.id, to: YC.custName(S, cur.cust), text: cur.eta.text }); }
    });
    Y.texts.sort(function (a, b) { return b.at - a.at; });
  };

  /* ---------- where each lorry is ---------- */
  function lerp(a, b, f) { return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }; }
  /* the job a lorry is on now: the one on the road or on site, else the next one booked */
  YC.active = function (list) { return list.filter(function (x) { return x.status === 'onway' || x.status === 'onsite'; })[0] || list.filter(function (x) { return x.status !== 'done'; })[0] || null; };
  YC.where = function (Y, id, nowTs) {
    nowTs = nowTs || Date.now();
    var all = YC.forLorry(Y, id, 0), yard = { lat: YC.YARD.lat, lng: YC.YARD.lng }, prev = yard, lastDone = null;
    var done = all.filter(function (x) { return x.status === 'done'; }).sort(function (a, b) { return (a.at.done || 0) - (b.at.done || 0); }), act = YC.active(all);
    var list = done.concat(act ? [act] : []);
    for (var i = 0; i < list.length; i++) {
      var j = list[i];
      if (j.status === 'done') { prev = j; lastDone = j; continue; }
      if (j.status === 'onway') { var f = Math.max(0, Math.min(0.97, (nowTs - (j.at.onway || nowTs)) / YC.TRAVEL)); return { lat: lerp(prev, j, f).lat, lng: lerp(prev, j, f).lng, state: 'onway', job: j, f: f, from: prev }; }
      if (j.status === 'onsite') return { lat: j.lat, lng: j.lng, state: 'onsite', job: j };
      return { lat: prev.lat, lng: prev.lng, state: lastDone ? 'between' : 'yard', job: j };
    }
    if (lastDone) {
      var back = Math.max(0, Math.min(1, (nowTs - (lastDone.at.done || nowTs)) / YC.TRAVEL));
      return { lat: lerp(lastDone, yard, back).lat, lng: lerp(lastDone, yard, back).lng, state: back >= 1 ? 'home' : 'returning', job: null };
    }
    return { lat: yard.lat, lng: yard.lng, state: 'yard', job: null };
  };
  YC.etaMins = function (Y, j, nowTs) {
    if (j.status !== 'onway') return null;
    var left = Math.max(0, YC.TRAVEL - ((nowTs || Date.now()) - (j.at.onway || 0)));
    var dist = 0, w = YC.where(Y, j.lorry, nowTs); if (w && w.from) { var dx = (j.lat - w.from.lat) * 111, dy = (j.lng - w.from.lng) * 67; dist = Math.sqrt(dx * dx + dy * dy); }
    return Math.max(2, Math.round(dist * 1.6 * (left / YC.TRAVEL)));   /* road minutes at about 37 mph, scaled to how far along it is */
  };

  /* ---------- driver actions (used by the driver app and by the simulation) ---------- */
  YC.etaText = function (S, Y, j) {
    var lo = YC.lorry(j.lorry), mins = YC.etaMins(Y, j) || 20, at = new Date(Date.now() + mins * 60000);
    return etaAt(S, j, mins, at.getHours() * 60 + at.getMinutes() - mins);
  };
  function etaAt(S, j, mins, fromMin) {
    var lo = YC.lorry(j.lorry), what = j.type === 'grab' || j.type === 'muck' ? 'with the grab lorry' : j.type === 'collect' ? 'to collect your ' + j.size + ' yard skip' : 'with your ' + j.size + ' yard skip';
    return 'Hi ' + YC.custFirst(S, j.cust) + ', ' + (lo ? lo.first : 'your driver') + ' from Demo Skip & Grab is on his way ' + what + '. About ' + mins + ' minutes, so around ' + YC.hhmm(fromMin + mins) + '.';
  }
  YC.act = function (S, Y, id, what, data) {
    var j = Y.jobs.filter(function (x) { return x.id === id; })[0]; if (!j) return null;
    var now = Date.now(); j.manual = true;
    if (what === 'onway') {
      /* only one job on the road per lorry */
      Y.jobs.forEach(function (x) { if (x !== j && x.lorry === j.lorry && x.day === 0 && (x.status === 'onway' || x.status === 'onsite')) { x.status = 'planned'; x.at = {}; } });
      j.status = 'onway'; j.at.onway = now; j.log.push({ at: now, t: 'On the way' });
      if (!data || data.text !== false) { j.eta = { at: now, text: YC.etaText(S, Y, j) }; Y.texts.unshift({ at: now, job: j.id, to: YC.custName(S, j.cust), text: j.eta.text }); }
    }
    if (what === 'arrived') { j.status = 'onsite'; j.at.arrived = now; j.log.push({ at: now, t: 'Arrived on site' }); }
    if (what === 'photo') { j.photos.push({ k: data && data.k || (j.type === 'deliver' ? 'drop' : 'collect'), src: data && data.src || null, sample: !(data && data.src), at: now }); }
    if (what === 'sig') { j.sig = { name: data && data.name || '', src: data && data.src || null, at: now, none: !!(data && data.none) }; }
    if (what === 'done') {
      YC.complete(S, Y, j, data || {}, now);
      /* the next job on this lorry is now the one to go to */
    }
    Y.v++;
    return j;
  };

  /* the office simulation: lorries drive to their next job, stop, and finish it. A job a driver is working in the app is left to the driver. */
  YC.tick = function (S, Y, nowTs, skip) {
    nowTs = nowTs || Date.now(); var ev = [];
    YC.LORRIES.forEach(function (lo) {
      if (lo.id === skip) return;   /* the lorry whose phone is on screen is driven by the buttons on the phone */
      var list = YC.forLorry(Y, lo.id, 0), j = YC.active(list);
      if (!j) return;
      if (j.status === 'planned') {
        var last = list.filter(function (x) { return x.status === 'done'; }).pop();
        if (!last || nowTs - (last.at.done || 0) > 20000) {
          j.status = 'onway'; j.at.onway = nowTs; j.manual = false; j.eta = { at: nowTs, text: YC.etaText(S, Y, j) };
          Y.texts.unshift({ at: nowTs, job: j.id, to: YC.custName(S, j.cust), text: j.eta.text });
          ev.push({ k: 'onway', j: j, lo: lo }); Y.v++;
        }
      } else if (j.status === 'onway' && nowTs - (j.at.onway || 0) >= YC.TRAVEL) {
        j.status = 'onsite'; j.at.arrived = nowTs; ev.push({ k: 'arrived', j: j, lo: lo }); Y.v++;
      } else if (j.status === 'onsite' && nowTs - (j.at.arrived || 0) >= YC.DWELL) {
        YC.complete(S, Y, j, null, nowTs); ev.push({ k: 'done', j: j, lo: lo });
      }
    });
    return ev;
  };

  /* ---------- Defra digital waste tracking: receipts at our own transfer station ---------- */
  YC.defraRows = function (S, Y) {
    var D = Y.defraState || (Y.defraState = {});
    var rows = [];
    Y.tickets.filter(function (t) { return t.site === 'yard' && t.matched; }).forEach(function (t) {
      var lo = YC.lorry(t.lorry), sv = YC.STREAMS[t.stream], st = D[t.id];
      rows.push({ id: t.id, day: t.day, time: t.time, carrier: YC.CARRIER.name, reg: YC.CARRIER.reg, veh: lo ? lo.reg : '', stream: t.stream, ewc: sv.ewc, desc: sv.n, form: sv.form, net: t.net, est: false,
        code: sv.code, from: t.cust ? YC.custName(S, t.cust) : '', job: t.job, status: st ? st.s : (t.day < 0 ? 'submitted' : 'ready'), why: st && st.why, sub: st && st.at });
    });
    (Y.incoming || []).forEach(function (x) {
      var sv = YC.STREAMS[x.stream], st = D[x.id];
      rows.push({ id: x.id, day: 0, time: x.time, carrier: x.carrier, reg: x.reg, veh: x.veh, stream: x.stream, ewc: sv.ewc, desc: sv.n, form: sv.form, net: x.net, est: x.est, code: sv.code, from: x.carrier, job: null,
        status: st ? st.s : (x.why ? 'error' : 'ready'), why: st ? st.why : x.why, sub: st && st.at, inc: true });
    });
    return rows.sort(function (a, b) { return (b.day - a.day) || (b.time - a.time); });
  };
  YC.defraCSV = function (rows) {
    var H = ['Date received', 'Time received', 'Carrier name', 'Carrier registration', 'Vehicle registration', 'EWC code', 'Waste description', 'Physical form', 'Net weight (tonnes)', 'Weight estimated', 'Disposal or recovery code', 'Receiving site', 'Site permit', 'Your reference'];
    function q(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return [H.join(',')].concat(rows.map(function (r) {
      var d = new Date(); d.setDate(d.getDate() + (r.day || 0));
      return [d.toLocaleDateString('en-GB'), YC.hhmm(r.time), r.carrier, r.reg, r.veh, r.ewc, r.desc, r.form, r.net, r.est ? 'Yes' : 'No', r.code, YC.TIPS.yard.n, YC.TIPS.yard.permit, r.id].map(q).join(',');
    })).join('\n');
  };

  /* sample photo, drawn here so the demo needs no image files */
  YC.samplePhoto = function (kind, size) {
    var col = kind === 'collect' ? '#5B6B7A' : '#1F4FA8';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD7EA"/><stop offset="1" stop-color="#E8F0F5"/></linearGradient></defs>' +
      '<rect width="320" height="220" fill="url(#s)"/><rect y="120" width="320" height="100" fill="#9A9A92"/><rect y="118" width="320" height="6" fill="#7E7E76"/>' +
      '<rect x="18" y="40" width="90" height="80" fill="#C9B8A0"/><rect x="34" y="62" width="22" height="22" fill="#8FB3CF"/><rect x="70" y="62" width="22" height="22" fill="#8FB3CF"/><path d="M12 42 L63 14 L114 42 Z" fill="#8A4B3A"/>' +
      '<path d="M120 150 L276 150 L258 206 L138 206 Z" fill="' + col + '"/><path d="M120 150 L276 150 L273 160 L123 160 Z" fill="#00000033"/>' +
      (kind === 'collect' ? '<path d="M136 150 Q170 120 200 140 Q230 118 262 150 Z" fill="#8C7B65"/>' : '') +
      '<text x="198" y="190" font-family="Arial" font-weight="700" font-size="16" fill="#fff" text-anchor="middle">' + (size ? size + ' YD' : 'GRAB') + '</text>' +
      '<rect x="8" y="8" width="104" height="22" rx="11" fill="#000000AA"/><text x="60" y="23" font-family="Arial" font-size="11" fill="#fff" text-anchor="middle">Sample photo</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  YC.sampleSig = function (name) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70"><path d="M10 50 C30 10 45 60 60 35 S90 20 100 45 S130 60 140 30 S170 15 180 40 S210 55 230 25" fill="none" stroke="#1A1A1A" stroke-width="2.4" stroke-linecap="round"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
})();
