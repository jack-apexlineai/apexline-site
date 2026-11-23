/* CBR edition: the data for body builds, the vans and their stock, the people,
   and the pictures used as sample photos. Loaded on every page after store.js,
   so the office, the phones and the customer tracker all seed the same demo.
   Everything here is made up. */
(function () {
  WS.ownerFirst = 'Jamie';
  WS.ownerLast = 'Boyce';
  WS.SEED_V = 131;

  /* ---------------- build stages ---------------- */
  WS.BUILD_STAGES = [
    { k: 'enquiry', name: 'Enquiry', short: 'Enquiry' },
    { k: 'quoted', name: 'Quoted', short: 'Quoted' },
    { k: 'ordered', name: 'Ordered, chassis due', short: 'Chassis due' },
    { k: 'chassis', name: 'Chassis in and prep', short: 'Chassis in', work: true },
    { k: 'subframe', name: 'Subframe and tipping gear', short: 'Subframe', work: true },
    { k: 'fab', name: 'Body fabrication', short: 'Fabrication', work: true },
    { k: 'paint', name: 'Paint', short: 'Paint', work: true },
    { k: 'fitout', name: 'Fit out: sheet, lights, weighing', short: 'Fit out', work: true },
    { k: 'pdi', name: 'PDI and handover', short: 'Handover', work: true },
    { k: 'delivered', name: 'Delivered', short: 'Delivered' }
  ];
  WS.WORK_STAGES = WS.BUILD_STAGES.filter(function (s) { return s.work; }).map(function (s) { return s.k; });
  WS.stageIx = function (k) { for (var i = 0; i < WS.BUILD_STAGES.length; i++) if (WS.BUILD_STAGES[i].k === k) return i; return 0; };
  WS.stageName = function (k) { return (WS.BUILD_STAGES[WS.stageIx(k)] || {}).name || k; };
  WS.stageShort = function (k) { return (WS.BUILD_STAGES[WS.stageIx(k)] || {}).short || k; };

  /* the bodies CBR builds (from cbr-ltd.co.uk/tipper-bodies) with sample prices and hours.
     hours are per work stage: chassis, subframe, fab, paint, fitout, pdi */
  WS.BODIES = [
    { id: 'agg8', name: 'Aluminium aggregate tipper body, 8x4', price: 14950, materials: 6800, hours: { chassis: 6, subframe: 12, fab: 60, paint: 14, fitout: 14, pdi: 6 } },
    { id: 'ins8', name: 'Insulated asphalt tipper body, 8x4', price: 17450, materials: 8200, hours: { chassis: 6, subframe: 12, fab: 72, paint: 16, fitout: 18, pdi: 6 } },
    { id: 'agg6', name: 'Aluminium tipper body, 6x4', price: 12900, materials: 5600, hours: { chassis: 5, subframe: 10, fab: 50, paint: 12, fitout: 12, pdi: 5 } },
    { id: 'grain6', name: 'Aluminium grain body, 6x4', price: 13600, materials: 5900, hours: { chassis: 5, subframe: 10, fab: 54, paint: 12, fitout: 14, pdi: 5 } },
    { id: 'swap', name: 'Body swap onto a new chassis', price: 4800, materials: 650, hours: { chassis: 6, subframe: 14, fab: 0, paint: 4, fitout: 10, pdi: 5 } }
  ];
  /* what comes as standard on every tipper body, from CBR's own website */
  WS.BODY_STANDARD = ['Shovel holder and glove box', 'Dawes CH8 tailgate board', 'LED side lights with integrated indicators'];
  WS.OPTIONS = [
    { id: 'gear', name: 'Tipping gear and hydraulics (front ram, tank, PTO)', price: 4600, cost: 3450, stage: 'subframe', hours: 8, on: true },
    { id: 'sheet', name: 'Automatic sheet system', price: 2650, cost: 1980, stage: 'fitout', hours: 6, on: true },
    { id: 'weigh', name: 'Onboard weighing', price: 1850, cost: 1380, stage: 'fitout', hours: 5 },
    { id: 'tar', name: 'Insulated tar hatches', price: 0, cost: 0, stage: 'fab', hours: 0, only: 'ins8', fixed: true },
    { id: 'deck', name: 'Seamless one piece deck', price: 1150, cost: 820, stage: 'fab', hours: 6 },
    { id: 'hd', name: 'Heavy duty side panels', price: 980, cost: 690, stage: 'fab', hours: 4 },
    { id: 'stainless', name: 'Stainless panels', price: 1400, cost: 980, stage: 'fab', hours: 8 },
    { id: 'skirts', name: 'Side skirts', price: 1250, cost: 760, stage: 'fitout', hours: 6 },
    { id: 'catwalk', name: 'Catwalk', price: 690, cost: 420, stage: 'fitout', hours: 4 },
    { id: 'cab', name: 'Custom cab storage', price: 540, cost: 260, stage: 'fitout', hours: 4 },
    { id: 'laser', name: 'Laser cut name boards', price: 380, cost: 190, stage: 'fitout', hours: 2 }
  ];
  WS.HANDOVER = [
    'Chassis VIN and base vehicle approval (CoC) on file',
    'Approval route confirmed (multi stage or IVA)',
    'Plated weights checked, unladen weight recorded',
    'Notifiable alteration (VTG10) sent, if needed',
    'Tipping test: full tip, body prop fitted, PUWER check',
    'Sheet system test',
    'Lights and electrics test',
    'Onboard weighing calibrated',
    'Customer walk round and sign off'
  ];
  WS.BUILD_COST_RATE = 32;   // loaded cost of an hour in the build hall, for the margin

  /* ---------------- sample photos, drawn ----------------
     A side view of a tipper at each stage of the build, and close ups for repairs.
     Real photos come from the engineers' phones. */
  function truck(stage, colour) {
    var s = WS.stageIx(stage), body = colour || '#C9CED6';
    var alloy = '#C9CED6', painted = s >= WS.stageIx('paint');
    var bc = painted ? body : alloy, out = '';
    // chassis rails and wheels
    out += '<rect x="58" y="160" width="300" height="10" rx="2" fill="#2A2F37"/>';
    [92, 250, 292, 334].forEach(function (x) {
      out += '<circle cx="' + x + '" cy="182" r="21" fill="#1C2027"/><circle cx="' + x + '" cy="182" r="10" fill="#8A929E"/><circle cx="' + x + '" cy="182" r="3.5" fill="#2A2F37"/>';
    });
    // cab
    out += '<path d="M40 168V96q0-12 12-14l52-4q10 0 12 10l4 80z" fill="#F3F4F6" stroke="#3B414B" stroke-width="2"/>' +
      '<path d="M52 94l50-4q6 0 7 6l2 30H52z" fill="#9EC5DD" opacity=".85"/><rect x="40" y="148" width="80" height="8" fill="#3B414B"/>' +
      '<rect x="36" y="160" width="10" height="10" rx="2" fill="#E8A33A"/>';
    if (s >= WS.stageIx('subframe')) out += '<rect x="128" y="150" width="226" height="10" fill="#4A515C"/>';
    if (s >= WS.stageIx('subframe')) out += '<rect x="126" y="96" width="9" height="56" rx="3" fill="' + (s >= WS.stageIx('fab') ? '#5B6370' : '#9AA3AF') + '"/>';
    if (s >= WS.stageIx('fab')) {
      var tip = stage === 'pdi' ? ' transform="rotate(14 354 150)"' : '';
      out += '<g' + tip + '><path d="M138 150V92h214l6 58z" fill="' + bc + '" stroke="#5B6370" stroke-width="2"/>';
      for (var i = 0; i < 5; i++) out += '<path d="M' + (162 + i * 40) + ' 94v54" stroke="' + (painted ? 'rgba(0,0,0,.18)' : '#AEB4BD') + '" stroke-width="3"/>';
      out += '<path d="M138 104h214" stroke="' + (painted ? 'rgba(0,0,0,.15)' : '#B6BCC4') + '" stroke-width="2"/>';
      if (s >= WS.stageIx('fitout')) {
        out += '<path d="M140 90q107-18 212 0" fill="none" stroke="#1F2933" stroke-width="5"/>';
        for (var k = 0; k < 6; k++) out += '<rect x="' + (150 + k * 38) + '" y="144" width="7" height="4" rx="1" fill="#F59E0B"/>';
        out += '<rect x="148" y="112" width="70" height="14" rx="2" fill="#fff" opacity=".9"/><text x="183" y="123" font-size="9" font-family="Inter,Arial" font-weight="800" text-anchor="middle" fill="#3B414B">CBR</text>';
      }
      out += '</g>';
    }
    if (stage === 'fab') out += '<g fill="#FFD27A"><circle cx="230" cy="128" r="3"/><path d="M230 128l-14-10M230 128l12-14M230 128l16 4M230 128l-6 16" stroke="#FFB020" stroke-width="1.5"/></g>';
    return out;
  }
  function scene(inside, label, extra) {
    var bg = inside
      ? '<rect width="400" height="240" fill="#59616C"/><rect y="0" width="400" height="150" fill="#6B7480"/>' +
        '<g opacity=".25" stroke="#2A2F37" stroke-width="2">' + [40, 120, 200, 280, 360].map(function (x) { return '<path d="M' + x + ' 0v150"/>'; }).join('') + '</g>' +
        '<rect y="150" width="400" height="90" fill="#8C939C"/><path d="M0 204h400" stroke="#E8C547" stroke-width="4" stroke-dasharray="26 16" opacity=".8"/>'
      : '<rect width="400" height="240" fill="#BFD9EA"/><rect y="150" width="400" height="90" fill="#7C838C"/><rect y="120" width="400" height="32" fill="#9DB79A"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">' + bg + extra + '</svg>';
  }
  function closeUp(kind) {
    var c = '';
    if (kind === 'ram') c = '<rect width="400" height="240" fill="#3E454F"/><rect x="150" y="10" width="70" height="220" rx="10" fill="#9AA3AF"/><rect x="168" y="10" width="34" height="120" fill="#D7DCE2"/><rect x="146" y="120" width="78" height="18" rx="5" fill="#5B6370"/><path d="M200 138q4 30 -4 60" stroke="#6B4E16" stroke-width="7" fill="none" opacity=".75"/><circle cx="196" cy="206" r="7" fill="#6B4E16" opacity=".75"/>';
    else if (kind === 'hinge') c = '<rect width="400" height="240" fill="#2F343C"/><rect x="0" y="40" width="400" height="90" fill="#1E1E1E"/><rect x="120" y="120" width="160" height="40" rx="8" fill="#8A929E"/><path d="M150 132l40 18 30-22 40 16" stroke="#F2F2F2" stroke-width="4" fill="none"/><path d="M196 128l14 30" stroke="#C0352A" stroke-width="4"/>';
    else if (kind === 'hose') c = '<rect width="400" height="240" fill="#2C3138"/><path d="M20 180q120-150 220-60t160-40" stroke="#111" stroke-width="22" fill="none"/><path d="M228 110l20 16" stroke="#F4D35E" stroke-width="5"/><g fill="#C8A64A" opacity=".8"><circle cx="246" cy="150" r="10"/><circle cx="262" cy="172" r="6"/><circle cx="236" cy="190" r="8"/></g>';
    else if (kind === 'pins') c = '<rect width="400" height="240" fill="#3A3F47"/><rect x="60" y="70" width="280" height="100" rx="14" fill="#6E7682"/><ellipse cx="200" cy="120" rx="40" ry="32" fill="#2A2E35"/><ellipse cx="206" cy="120" rx="30" ry="30" fill="#A7AFBA"/><path d="M168 120a40 32 0 0 1 4-14" stroke="#C0352A" stroke-width="4" fill="none"/>';
    else if (kind === 'sheet') c = '<rect width="400" height="240" fill="#BFD9EA"/><rect x="40" y="110" width="320" height="80" fill="#C9CED6" stroke="#5B6370" stroke-width="2"/><path d="M40 108q160-40 220 0" stroke="#1F2933" stroke-width="8" fill="none"/><circle cx="268" cy="108" r="10" fill="#4A515C"/>';
    else if (kind === 'lights') c = '<rect width="400" height="240" fill="#2F343C"/><rect x="0" y="80" width="400" height="80" fill="#C9CED6"/>' + [60, 150, 240, 330].map(function (x, i) { return '<rect x="' + x + '" y="150" width="30" height="12" rx="3" fill="' + (i === 2 ? '#555' : '#F59E0B') + '"/>'; }).join('');
    else c = '<rect width="400" height="240" fill="#59616C"/><circle cx="200" cy="120" r="50" fill="#8C939C"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">' + c + '</svg>';
  }
  /* 'stage:fab:#E67D00' or 'close:ram' -> an svg data url */
  WS.artSrc = function (token) {
    var p = String(token || '').split(':'), svg;
    if (p[0] === 'stage') {
      var st = p[1], out = st === 'delivered' || st === 'pdi';
      svg = scene(!out, '', truck(st, p[2] ? '#' + p[2] : ''));
    } else svg = closeUp(p[1]);
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };
  WS.photoSrc = function (ph) {
    var s = typeof ph === 'string' ? ph : (ph && (ph.src || ph.art)) || '';
    if (/^(stage|close):/.test(s)) return WS.artSrc(s);
    return s;
  };

  /* ---------------- helpers ---------------- */
  WS.build = function (id) { return (WS.state.builds || []).filter(function (b) { return b.id === id; })[0] || null; };
  WS.van = function (id) { return (WS.state.vans || []).filter(function (v) { return v.id === id; })[0] || null; };
  WS.buildQuoted = function (b) { var t = 0; Object.keys(b.hoursQuoted || {}).forEach(function (k) { t += b.hoursQuoted[k]; }); return t; };
  WS.buildHours = function (b, stage) {
    var t = 0, now = Date.now();
    (b.labour || []).forEach(function (l) {
      if (stage && l.stage !== stage) return;
      if (l.hours != null) t += l.hours;
      else if (l.start) t += Math.max(0, (now - new Date(l.start).getTime()) / 3600000);
    });
    return t;
  };
  WS.buildMaterials = function (b) { return (b.materials || []).reduce(function (s, m) { return s + (m.actual || 0); }, 0); };
  WS.buildBudget = function (b) { return (b.materials || []).reduce(function (s, m) { return s + (m.budget || 0); }, 0); };
  /* the money on a build: price, what it has cost so far, and the margin if it finishes like this */
  WS.buildMoney = function (b) {
    var rate = WS.BUILD_COST_RATE, hq = WS.buildQuoted(b), hb = WS.buildHours(b);
    var si = WS.stageIx(b.stage), started = si >= WS.stageIx('chassis');
    // stages not started yet are assumed to come in on their quoted hours
    var projH = 0;
    WS.WORK_STAGES.forEach(function (k) {
      var booked = WS.buildHours(b, k), q = (b.hoursQuoted || {})[k] || 0, ki = WS.stageIx(k);
      projH += ki < si ? booked : ki === si ? Math.max(booked, q) : q;
    });
    if (b.stage === 'delivered') projH = hb;
    var budget = WS.buildBudget(b), spent = WS.buildMaterials(b);
    var projMat = Math.max(budget, spent);
    var quoteMargin = b.price - budget - hq * rate;
    var projMargin = b.price - projMat - projH * rate;
    return {
      price: b.price, hoursQuoted: hq, hoursBooked: hb, hoursProjected: projH, started: started,
      budget: budget, spent: spent, quoteMargin: quoteMargin, projMargin: projMargin,
      quotePct: b.price ? quoteMargin / b.price * 100 : 0, projPct: b.price ? projMargin / b.price * 100 : 0
    };
  };
  WS.buildOver = function (b) {
    return WS.WORK_STAGES.filter(function (k) {
      var q = (b.hoursQuoted || {})[k] || 0;
      return q && WS.buildHours(b, k) > q * 1.05;
    });
  };
  WS.buildLog = function (b, who, what) {
    b.log = b.log || [];
    b.log.unshift({ at: WS.nowStamp(), who: who, what: what });
  };

  /* ---------------- people ---------------- */
  var baseUsers = WS.ensureUsers;
  WS.ensureUsers = function (s) {
    var changed = baseUsers(s);
    if (!s || !s.users) return changed;
    if (!s.users.some(function (u) { return u.id === 'u3'; })) {
      changed = true;
      s.users.push({ id: 'u3', first: 'Gavin', last: 'Spooncer', username: 'gavin', role: 'Director', title: 'Director', signIn: 'pin', pin: '1234', status: 'active', perms: WS.rolePerms('Director'), addedBy: 'owner', addedAt: WS.at(WS.day(-21), 9, 0) });
      s.users.forEach(function (u) { if (u.id === 'u1') u.title = 'Director'; if (u.id === 'u2') { u.first = 'Office'; u.last = 'and accounts'; u.title = 'Accounts'; } });
    }
    return changed;
  };

  /* ---------------- the seed ---------------- */
  var baseSeed = WS.seed;
  WS.seed = function () {
    var s = baseSeed();
    var r = WS.rng(20261124);
    var T = WS.day(0);
    var F = function (id) { return s.settings.fitters.filter(function (f) { return f.id === id; })[0]; };
    var vOf = function (op, re) { return s.vehicles.filter(function (v) { return v.operatorId === op && re.test(v.type); }); };
    s.settings.buildCostRate = WS.BUILD_COST_RATE;
    s.settings.accounts = 'Xero';

    function ago(mins) {
      var now = new Date(), d = new Date(now.getTime() - mins * 60000);
      var floor = new Date(); floor.setHours(7, 0, 0, 0);
      if (floor > now) floor = new Date(now.getTime() - 10 * 3600000);
      if (d < floor) d = floor;
      if (d > now) d = now;
      return WS.stampOf(d);
    }
    function ahead(mins) { return WS.stampOf(new Date(Date.now() + mins * 60000)); }
    /* nothing seeded is stamped later than now, whatever time the demo is opened */
    function clampAt(stamp) { var now = WS.nowStamp(); return stamp > now ? ago(20) : stamp; }
    /* a working day n days from today: CBR is shut at weekends */
    function wd(n) { var d = WS.parse(WS.day(n)), k = d.getDay(); if (k === 6) n += 2; else if (k === 0) n += 1; return WS.day(n); }
    function weekday(iso) { return WS.parse(iso).toLocaleDateString('en-GB', { weekday: 'long' }); }

    /* ---------- the build team (they book hours to builds, not to repair jobs) ---------- */
    s.buildTeam = [
      { id: 'b1', name: 'Ryan Pegg', role: 'Fabricator, aluminium', pin: '8111' },
      { id: 'b2', name: 'Kieran Moss', role: 'Fabricator, welder', pin: '8222' },
      { id: 'b3', name: 'Sean Bright', role: 'Painter and fitter', pin: '8333' }
    ];

    /* ---------- vans and van stock ---------- */
    var vanStock = function (seedQ) {
      return [
        ['Hydraulic hose', 'HYD-4120', 64, 4], ['Tipping ram seal kit', 'HYD-4255', 148, 2], ['Tipping valve', 'HYD-4310', 186, 1],
        ['PTO switch', 'HYD-4402', 54, 1], ['Side marker lamp', 'ELE-8042', 12.5, 6], ['Bulb set', 'ELE-8090', 9.5, 4],
        ['Tailgate hinge pin set', 'BDY-1310', 38, 2], ['Tailgate air ram', 'HYD-4190', 165, 1], ['Weld wire 1.2mm 7kg', 'WLD-1270', 62, 1],
        ['Push fit air fittings kit', 'AIR-6201', 18, 3], ['Hydraulic oil 20L', 'FLU-9060', 46, 2]
      ].map(function (p, i) {
        return { name: p[0], partNo: p[1], cost: p[2], min: p[3], qty: Math.max(0, p[3] + (seedQ[i] || 0)) };
      });
    };
    s.vans = [
      { id: 'van1', name: 'Van 1', reg: 'AF73 KXR', engineer: 'f5', stock: vanStock([1, -1, 0, 1, 2, 1, 0, 0, 1, 2, -1]) },
      { id: 'van2', name: 'Van 2', reg: 'AE23 MVO', engineer: 'f6', stock: vanStock([2, 0, -1, 0, -2, 0, 1, 1, 0, 0, 0]) },
      { id: 'van3', name: 'Van 3', reg: 'AK72 DWU', engineer: 'f7', stock: vanStock([0, 1, 0, -1, 0, -1, 1, 0, 0, 1, 1]) }
    ];

    /* ---------- today's call outs ---------- */
    var jn = 2000;
    function cjob(o) {
      jn++;
      var v = o.vehicle;
      var tasks = (o.tasks || ['Safety check on arrival', 'Find the fault', 'Repair', 'Test', 'Customer signs off']).map(function (t, i) { return { id: 't' + i, text: t, done: !!o.tasksDone || i < (o.tasksDoneN || 0) }; });
      return {
        id: 'j' + jn, no: 'JC' + jn, vehicleId: v ? v.id : '', operatorId: o.operatorId || (v ? v.operatorId : ''),
        type: o.type || 'Repair', date: T, bay: 'Mobile van', fitterId: o.fitterId || '',
        estHours: o.estHours || 1.5, order: o.order != null ? o.order : 99, priority: o.priority || 'normal', source: o.source || 'Phone call',
        status: o.status || 'booked', tasks: tasks, notes: o.notes || '', parts: o.parts || [], clockOns: o.clockOns || [], photos: o.photos || [],
        inspection: null, defects: [], qc: o.qc || null, invoiceId: '', createdAt: o.createdAt || ago(300),
        audit: o.audit || [{ at: ago(300), who: 'Office', what: 'Call out booked from a phone call' }],
        site: o.site, van: o.van
      };
    }
    var f5 = F('f5'), f6 = F('f6'), f7 = F('f7');
    var brindleyTip = vOf('o5', /^Tipper 32t/), halIns = vOf('o6', /Insulated/), pelTr = vOf('o2', /trailer/i), saxSkip = vOf('o1', /Skip loader/),
      fenHook = vOf('o4', /Hook/), wexTip = vOf('o3', /Tipper/);
    var calls = [];
    // Ash, Van 1: one done and signed, one on site now, one to go
    calls.push(cjob({ vehicle: brindleyTip[0], fitterId: f5.id, order: 0, status: 'done', estHours: 1.5, tasksDone: true,
      notes: 'Tipping ram leaking at the top gland, body creeping down when loaded.',
      site: { name: 'Brindley Aggregates quarry', town: 'Whittlesey', postcode: 'PE7' },
      parts: [{ name: 'Tipping ram seal kit', partNo: 'HYD-4255', qty: 1, cost: 148, from: 'van1' }, { name: 'Hydraulic oil 20L', partNo: 'FLU-9060', qty: 1, cost: 46, from: 'van1' }],
      clockOns: [{ fitterId: f5.id, start: ago(205), end: ago(110) }],
      photos: [WS.artSrc('close:ram')],
      van: { stage: 'done', setOff: ago(235), arrivedAt: ago(208), leftAt: ago(104), safety: [true, true, true, true],
        sign: { name: 'Dean Brindley', at: ago(106), sig: '' }, summary: 'Resealed the front tipping ram, topped up the oil, three full tips loaded and the body holds. Customer happy.' },
      audit: [{ at: ago(300), who: 'Office', what: 'Call out booked from a phone call' }, { at: ago(235), who: f5.name, what: 'On the way' },
        { at: ago(208), who: f5.name, what: 'Arrived on site, safety check done' }, { at: ago(205), who: f5.name, what: 'Clocked on' },
        { at: ago(110), who: f5.name, what: 'Job done, parts used from Van 1' }, { at: ago(106), who: 'Dean Brindley', what: 'Signed for the work on the engineer\'s phone' }] }));
    calls.push(cjob({ vehicle: halIns[0], fitterId: f5.id, order: 1, status: 'in_progress', estHours: 2, tasksDoneN: 2,
      notes: 'Tar hatch hinge cracked on the insulated body. Weld and plate it so they can go out this afternoon.',
      site: { name: 'Halcott Surfacing depot', town: 'Long Sutton', postcode: 'PE12' },
      clockOns: [{ fitterId: f5.id, start: ago(62), end: '' }], photos: [WS.artSrc('close:hinge')],
      van: { stage: 'working', setOff: ago(98), arrivedAt: ago(66), safety: [true, true, true, true] },
      audit: [{ at: ago(280), who: 'Office', what: 'Call out booked from a phone call' }, { at: ago(98), who: f5.name, what: 'On the way' },
        { at: ago(66), who: f5.name, what: 'Arrived on site, safety check done' }, { at: ago(62), who: f5.name, what: 'Clocked on' },
        { at: ago(40), who: f5.name, what: 'Photo added: crack along the hinge weld' }] }));
    calls.push(cjob({ vehicle: pelTr[0], fitterId: f5.id, order: 2, estHours: 1.5,
      notes: 'Sheet will not roll out the full length. Check the motor and the bows.',
      site: { name: 'Pelham Bulk Haulage yard', town: 'Gedney Hill', postcode: 'PE12' },
      van: { stage: 'booked', eta: '' } }));
    // Josh, Van 2: found more wrong, waiting on the customer, then one more
    var josh = cjob({ vehicle: saxSkip[0], fitterId: f6.id, order: 0, status: 'waiting_auth', estHours: 1.5, tasksDoneN: 3,
      notes: 'Lifting arm hose burst on the skip loader. Replace and test.',
      site: { name: 'Saxby Skip Hire yard', town: 'March', postcode: 'PE15' },
      parts: [{ name: 'Hydraulic hose', partNo: 'HYD-4120', qty: 1, cost: 64, from: 'van2' }],
      clockOns: [{ fitterId: f6.id, start: ago(95), end: ago(28) }], photos: [WS.artSrc('close:hose'), WS.artSrc('close:pins')],
      van: { stage: 'working', setOff: ago(130), arrivedAt: ago(98), safety: [true, true, true, true] },
      audit: [{ at: ago(260), who: 'Office', what: 'Call out booked from a phone call' }, { at: ago(130), who: f6.name, what: 'On the way' },
        { at: ago(98), who: f6.name, what: 'Arrived on site, safety check done' }, { at: ago(95), who: f6.name, what: 'Clocked on' },
        { at: ago(40), who: f6.name, what: 'New hose fitted, arm tested' },
        { at: ago(28), who: f6.name, what: 'Found something else: lifting arm pivot pins worn. Sent to the customer to approve' }] });
    calls.push(josh);
    calls.push(cjob({ vehicle: fenHook[0], fitterId: f6.id, order: 1, estHours: 1.5,
      notes: 'Hook arm locking ram sticking. Driver says it clunks home late.',
      site: { name: 'Fenmarsh Waste depot', town: 'Wisbech', postcode: 'PE13' }, van: { stage: 'booked' } }));
    // Kyle, Van 3: on the way now
    calls.push(cjob({ vehicle: wexTip[0], fitterId: f7.id, order: 0, estHours: 1,
      notes: 'Tailgate not locking on the air ram. Lorry stood until it is fixed.', priority: 'high',
      site: { name: 'Wexcombe Plant yard', town: 'Chatteris', postcode: 'PE16' },
      van: { stage: 'on_way', setOff: ago(14), eta: ahead(18) },
      audit: [{ at: ago(90), who: 'Office', what: 'Call out booked from a phone call' }, { at: ago(14), who: f7.name, what: 'On the way, about 30 minutes' }] }));
    calls.push(cjob({ vehicle: brindleyTip[1] || brindleyTip[0], fitterId: f7.id, order: 1, estHours: 1.5,
      notes: 'All nearside marker lamps out. Suspect the loom at the body.',
      site: { name: 'Brindley Aggregates quarry', town: 'Whittlesey', postcode: 'PE7' }, van: { stage: 'booked' } }));
    calls.forEach(function (j) { s.jobs.push(j); });

    /* the last two weeks on the road: about three call outs a van a day, done, signed and invoiced,
       so the week's figures (hours on jobs against hours on the clock) have something real behind them */
    var FAULTS = [['Tipping ram creeping down under load', 'Tipping ram seal kit', 'HYD-4255', 148], ['Tailgate not locking', 'Tailgate air ram', 'HYD-4190', 165], ['Sheet not rolling back', '', '', 0],
      ['Hydraulic hose burst at the tank', 'Hydraulic hose', 'HYD-4120', 64], ['Marker lamps out down one side', 'Side marker lamp', 'ELE-8042', 12.5], ['PTO will not engage', 'PTO switch', 'HYD-4402', 54],
      ['Tailgate hinge pin seized', 'Tailgate hinge pin set', 'BDY-1310', 38], ['Body prop bracket cracked, weld and plate', '', '', 0], ['Tipping valve sticking', 'Tipping valve', 'HYD-4310', 186]];
    var SITES = [['Brindley Aggregates quarry', 'Whittlesey', 'o5'], ['Halcott Surfacing depot', 'Long Sutton', 'o6'], ['Pelham Bulk Haulage yard', 'Gedney Hill', 'o2'], ['Saxby Skip Hire yard', 'March', 'o1'],
      ['Fenmarsh Waste depot', 'Wisbech', 'o4'], ['Wexcombe Plant yard', 'Chatteris', 'o3']];
    var hinv = 4600;
    for (var hd = -14; hd <= -1; hd++) {
      var hday = WS.day(hd), hdow = WS.parse(hday).getDay();
      if (hdow === 0 || hdow === 6) continue;
      [f5, f6, f7].forEach(function (f, fi) {
        [[8, 0], [10, 30], [13, 30]].forEach(function (tm, k) {
          var site = SITES[Math.floor(r() * SITES.length)], fault = FAULTS[Math.floor(r() * FAULTS.length)];
          var vs = s.vehicles.filter(function (v) { return v.operatorId === site[2] && !/trailer/i.test(v.type); });
          var v = vs[Math.floor(r() * vs.length)] || vs[0];
          var hrs = Math.round((1.25 + r() * 0.9) * 4) / 4;
          var st0 = new Date(WS.at(hday, tm[0], tm[1] + Math.floor(r() * 20))), en0 = new Date(st0.getTime() + hrs * 3600000);
          var op = s.operators.filter(function (o) { return o.id === site[2]; })[0];
          var j = cjob({ vehicle: v, fitterId: f.id, order: k, status: 'done', estHours: 1.5, tasksDone: true, notes: fault[0] + '.',
            site: { name: site[0], town: site[1], postcode: '' },
            parts: fault[1] ? [{ name: fault[1], partNo: fault[2], qty: 1, cost: fault[3], from: f.van }] : [],
            clockOns: [{ fitterId: f.id, start: WS.stampOf(st0), end: WS.stampOf(en0) }],
            van: { stage: 'done', setOff: WS.stampOf(new Date(st0.getTime() - 30 * 60000)), arrivedAt: WS.stampOf(new Date(st0.getTime() - 4 * 60000)), leftAt: WS.stampOf(en0), safety: [true, true, true, true],
              sign: { name: op.contact, at: WS.stampOf(en0), sig: '' } },
            createdAt: WS.at(hday, 7, 15),
            audit: [{ at: WS.at(hday, 7, 15), who: 'Office', what: 'Call out booked from a phone call' }, { at: WS.stampOf(st0), who: f.name, what: 'Arrived on site, safety check done' },
              { at: WS.stampOf(en0), who: op.contact, what: 'Signed for the work on the engineer\'s phone' }] });
          j.date = hday;
          s.jobs.push(j);
          // invoiced the day it was done, the older ones paid
          hinv++;
          var rate = op.labourRate || s.settings.labourRate, mk = op.markup != null ? op.markup : s.settings.markup;
          var labour = Math.round(hrs * rate * 100) / 100, partsNet = Math.round(j.parts.reduce(function (a, p) { return a + p.cost * p.qty * (1 + mk / 100); }, 0) * 100) / 100;
          var gross = labour + partsNet, disc = Math.round(gross * (op.discount || 0)) / 100, net = Math.round((gross - disc) * 100) / 100, vat = Math.round(net * s.settings.vat) / 100;
          var inv = { id: 'iv' + hinv, no: 'INV-' + hinv, jobId: j.id, vehicleId: j.vehicleId, operatorId: j.operatorId, date: hday, due: WS.day(hd + (op.terms || 30)),
            hours: hrs, rate: rate, labour: labour, partsNet: partsNet, discount: disc, net: net, vat: vat, total: Math.round((net + vat) * 100) / 100,
            cost: Math.round((j.parts.reduce(function (a, p) { return a + p.cost * p.qty; }, 0) + hrs * 24) * 100) / 100,
            xeroExported: WS.stampOf(new Date(en0.getTime() + 20 * 60000)), xeroId: 'XI-' + (93000 + hinv), paid: hd < -8 && r() < 0.6 ? WS.at(WS.day(hd + 7), 11, 0) : '', parts: j.parts.slice() };
          s.invoices.push(inv);
          j.invoiceId = inv.id;
        });
      });
    }
    // the breakdown phoned in this morning, not given to a van yet
    s.jobs.forEach(function (j) {
      if (j.type === 'Roadside callout' && j.date === T && !j.fitterId) {
        j.site = { name: 'A47 lay by near Guyhirn', town: 'Guyhirn', postcode: 'PE13' };
        j.van = { stage: 'booked' };
        j.tasks = ['Safety check on arrival', 'Find the fault', 'Repair', 'Test', 'Customer signs off'].map(function (t, i) { return { id: 't' + i, text: t, done: false }; });
      }
      if (j.type === 'Collection / delivery' && j.date === T && !j.fitterId) { j.bay = ''; }
    });
    // the extra work Josh found
    s.approvals.push({ id: 'a2', jobId: josh.id, operatorId: josh.operatorId, vehicleId: josh.vehicleId,
      raisedBy: f6.name, raisedAt: ago(28),
      title: 'Lifting arm pivot pins worn',
      detail: 'While fitting the new hose I found both main arm pivot pins worn oval, about 4 mm of play. Safe to finish today, but they need doing before they crack the boss. I can do it now while I am here.',
      estHours: 2.5, parts: [{ name: 'Pivot pin and bush kit', qty: 1, cost: 164 }],
      photos: [WS.artSrc('close:pins')], status: 'Sent', sentAt: ago(27), decidedAt: '', decidedBy: '', channel: 'WhatsApp and email' });
    s.notifications.unshift({ id: 'n9', at: ago(27), to: 'Gary Wade, Saxby Skip Hire Ltd', channel: 'WhatsApp and email',
      subject: 'Extra work needs your OK', body: 'Josh has found worn pivot pins on your skip loader. Photo and price are on your phone.', kind: 'approval' });

    /* ---------- body builds ---------- */
    var body = function (id) { return WS.BODIES.filter(function (b) { return b.id === id; })[0]; };
    function mkBuild(o) {
      var bd = body(o.body), hq = {};
      WS.WORK_STAGES.forEach(function (k) { hq[k] = bd.hours[k] || 0; });
      var price = bd.price, mats = [
        { item: 'Aluminium sheet and extrusions', budget: Math.round(bd.materials * 0.78), actual: 0 },
        { item: 'Paint and consumables', budget: Math.round(bd.materials * 0.1), actual: 0 },
        { item: 'Lights, wiring and fixings', budget: Math.round(bd.materials * 0.12), actual: 0 }
      ];
      (o.options || []).forEach(function (oid) {
        var op = WS.OPTIONS.filter(function (x) { return x.id === oid; })[0];
        if (!op) return;
        price += op.price;
        if (op.hours) hq[op.stage] += op.hours;
        if (op.cost) mats.push({ item: op.name, budget: op.cost, actual: 0 });
      });
      var si = WS.stageIx(o.stage);
      // what has been spent so far: materials bought by the stage they are needed
      mats.forEach(function (m, i) {
        var need = /Aluminium/.test(m.item) ? 'fab' : /Paint/.test(m.item) ? 'paint' : /gear/.test(m.item) ? 'subframe' : 'fitout';
        var ni = WS.stageIx(need), bought = need === 'fab' || need === 'subframe' ? WS.stageIx('chassis') : ni;
        if (si >= bought) {
          m.actual = Math.round(m.budget * (o.matFactor && /Aluminium/.test(m.item) ? o.matFactor : 0.96 + r() * 0.06));
          m.supplier = /Aluminium/.test(m.item) ? 'Eastern Alloy Stockholders' : /gear/.test(m.item) ? 'Tipping Gear Supplies' : 'Fenland Motor Factors';
        }
      });
      // dates: the paperwork stages before the chassis, then the work stages spread over the days in build
      var team = { chassis: 'Darren Cole', subframe: 'Kieran Moss', fab: 'Ryan Pegg', paint: 'Sean Bright', fitout: 'Sean Bright', pdi: 'Darren Cole' };
      var CAP = { chassis: 'Chassis in, checked against the order', subframe: 'Subframe and front ram on', fab: 'Body tacked up, sides on', paint: 'Out of the paint booth',
        fitout: 'Sheet, lights and weighing fitted', pdi: 'Tipping test, body on the prop' };
      var labour = [], stageDates = {}, photos = [];
      var endN = o.endDay || 0, startN = endN - (o.daysIn || 0), wsI = WS.stageIx('chassis');
      var preDays = { enquiry: -20, quoted: -16, ordered: -12 };
      WS.BUILD_STAGES.forEach(function (st, i) {
        if (i > si) return;
        if (i < wsI) stageDates[st.k] = WS.day(Math.min(endN, startN + preDays[st.k]));
        else stageDates[st.k] = WS.day(Math.round(startN + (i - wsI) * (endN - startN) / Math.max(1, si - wsI)));
      });
      if (si < wsI) { var back = 0; for (var bi = si; bi >= 0; bi--) { stageDates[WS.BUILD_STAGES[bi].k] = WS.day(endN - back); back += bi === si ? (o.lastFor || 0) + 3 : 4; } }
      if (o.chassis && si >= wsI) o.chassis.arrived = stageDates.chassis;
      WS.WORK_STAGES.forEach(function (k) {
        var ki = WS.stageIx(k), q = hq[k];
        if (ki > si || !q) return;
        var f = (o.factor && o.factor[k]) || (0.9 + r() * 0.12);
        var h = ki < si ? q * f : q * (o.partDone != null ? o.partDone : 0.45);
        h = Math.round(h * 4) / 4;
        // spread over the days the stage ran, about a day's work at a time
        var from = WS.daysBetween(T, stageDates[k]), to = ki < si ? WS.daysBetween(T, stageDates[WS.BUILD_STAGES[ki + 1].k]) : 0;
        var n = Math.max(1, Math.round(h / 7.5)), days = Math.max(1, to - from + (ki < si ? 0 : 1));
        for (var e = 0; e < n; e++) {
          var dn = Math.min(0, from + Math.floor(e * days / n));
          if (WS.parse(WS.day(dn)).getDay() === 0) dn = Math.min(0, dn + 1);
          // the last entry takes the remainder, so the stage adds up to exactly h
          var each = Math.round(h / n * 4) / 4, hh = e === n - 1 ? Math.round((h - each * (n - 1)) * 4) / 4 : each;
          labour.push({ stage: k, who: k === 'fab' && e % 2 ? 'Kieran Moss' : team[k], date: WS.day(dn), hours: hh });
        }
        var pd = ki < si ? WS.day(Math.max(from, to - 1)) : stageDates[k];
        photos.push({ stage: k, art: 'stage:' + k + ':' + (o.colour || 'C9CED6').replace('#', ''), by: team[k], at: clampAt(WS.at(pd, 10 + (ki % 5), 12 + ki * 3)), caption: CAP[k] });
      });
      if (o.stage === 'delivered') photos.push({ stage: 'delivered', art: 'stage:delivered:' + (o.colour || 'C9CED6').replace('#', ''), by: 'Jamie Boyce', at: clampAt(WS.at(stageDates.delivered || T, 14, 5)), caption: 'Handed over to the customer' });
      var checks = {};
      WS.HANDOVER.forEach(function (h, i) { if (i < (o.checksDone || 0)) checks[h] = { by: i < 4 ? 'Jamie Boyce' : 'Darren Cole', at: WS.at(WS.day(o.stage === 'delivered' ? endN - 1 : -1), 9 + i, 10) }; });
      return {
        id: o.id, no: o.no, operatorId: o.operatorId, body: o.body, title: bd.name, options: o.options || [],
        colour: o.colour || '', colourName: o.colourName || 'Customer colour',
        chassis: o.chassis, stage: o.stage, stageDates: stageDates, due: o.due, price: price, depositPct: 25,
        hoursQuoted: hq, labour: labour, materials: mats, photos: photos, checks: checks,
        quoteSent: o.quoteSent || '', notes: o.notes || '', log: o.log || [], updates: o.updates || [], invoices: [], extras: [],
        createdAt: WS.at(stageDates.enquiry || T, 9, 30)
      };
    }
    var veh = function (op, re) { var l = vOf(op, re); return l[0]; };
    s.builds = [
      mkBuild({ id: 'bd1', no: 'B-0138', operatorId: 'o4', body: 'agg6', options: ['gear', 'sheet', 'hd'], stage: 'delivered', daysIn: 28, endDay: -6, due: WS.day(-6),
        colour: '#2E6B3F', colourName: 'Council green',
        chassis: { make: 'DAF', model: 'CF 370 FAN 6x4', vin: 'XLRAT85MC0E61047', reg: 'AF26 GZK', due: WS.day(-32), arrived: WS.day(-33), from: 'DAF dealer' },
        checksDone: 9, notes: 'Second body for Fenmarsh this year.', log: [{ at: WS.at(WS.day(-6), 14, 5), who: 'Jamie Boyce', what: 'Handed over to Lisa Howes, signed for on the phone' }] }),
      mkBuild({ id: 'bd2', no: 'B-0139', operatorId: 'o6', body: 'ins8', options: ['gear', 'sheet', 'weigh', 'tar', 'catwalk'], stage: 'pdi', daysIn: 26, due: wd(2), partDone: 0.5,
        colour: '#1F2933', colourName: 'Halcott charcoal',
        chassis: { make: 'Volvo', model: 'FMX 460 8x4', vin: 'YV2XTY0G8RB914233', reg: 'AV26 HLC', due: WS.day(-27), arrived: WS.day(-26), from: 'Volvo dealer' },
        checksDone: 6, notes: 'Handover ' + weekday(wd(2)) + ' at 10. Ciaran collecting.', log: [{ at: ago(150), who: 'Darren Cole', what: 'Tipping test done, body prop fitted and checked' }] }),
      mkBuild({ id: 'bd3', no: 'B-0140', operatorId: 'o5', body: 'agg8', options: ['gear', 'sheet', 'weigh', 'deck', 'hd'], stage: 'paint', daysIn: 18, due: wd(8), partDone: 0.35,
        colour: '#E67D00', colourName: 'Brindley orange', factor: { fab: 83 / 70, subframe: 1.0, chassis: 0.95 },
        chassis: { make: 'DAF', model: 'CF 450 FAD 8x4', vin: 'XLRAT85MC0E62211', reg: 'Not registered', due: WS.day(-19), arrived: WS.day(-18), from: 'DAF dealer' },
        notes: 'First of two for Brindley. Seamless deck took longer than quoted.',
        log: [{ at: WS.at(WS.day(-2), 15, 40), who: 'Ryan Pegg', what: 'Fabrication finished, 13h over the quote on the deck' }] }),
      mkBuild({ id: 'bd4', no: 'B-0141', operatorId: 'o5', body: 'agg8', options: ['gear', 'sheet', 'weigh', 'deck', 'hd'], stage: 'fab', daysIn: 9, due: wd(17), partDone: 0.42,
        colour: '#E67D00', colourName: 'Brindley orange',
        chassis: { make: 'DAF', model: 'CF 450 FAD 8x4', vin: 'XLRAT85MC0E62218', reg: 'Not registered', due: WS.day(-10), arrived: WS.day(-9), from: 'DAF dealer' },
        notes: 'Second of two for Brindley.', log: [{ at: ago(70), who: 'Ryan Pegg', what: 'Clocked on to body fabrication' }] }),
      mkBuild({ id: 'bd5', no: 'B-0142', operatorId: 'o2', body: 'grain6', options: ['gear', 'sheet', 'skirts'], stage: 'ordered', daysIn: 0, lastFor: 3, due: wd(30),
        colour: '#2453A6', colourName: 'Pelham blue',
        chassis: { make: 'Scania', model: 'G 410 B6x4', vin: 'Not yet', reg: 'Not registered', due: WS.day(-5), newDue: wd(3), arrived: '', from: 'Scania dealer', late: 'Dealer says ' + weekday(wd(3)) + ': waiting on a transport slot from the factory.' },
        notes: 'Deposit paid. Chassis late from the dealer.',
        log: [{ at: WS.at(WS.day(-5), 16, 10), who: 'Jamie Boyce', what: 'Chassis did not arrive. Dealer gave a new date. Pelham sent an update' }] }),
      mkBuild({ id: 'bd6', no: 'B-0143', operatorId: 'o3', body: 'agg6', options: ['gear', 'sheet'], stage: 'quoted', daysIn: 0, endDay: -3, due: wd(45),
        chassis: { make: 'Volvo', model: 'FM 380 6x4', vin: 'Not yet', reg: 'Not registered', due: wd(28), arrived: '', from: 'Customer supplying' },
        quoteSent: WS.at(WS.day(-3), 11, 20), notes: 'Tony wants it before the spring. Follow up today.' }),
      mkBuild({ id: 'bd7', no: 'B-0144', operatorId: 'o1', body: 'swap', options: ['gear'], stage: 'enquiry', daysIn: 0, due: wd(40),
        chassis: { make: 'DAF', model: 'CF 330 FAN', vin: 'Not yet', reg: 'Not registered', due: '', arrived: '', from: 'Customer supplying' },
        notes: 'From the website form this morning: move an existing tipper body onto a new chassis.' })
    ];
    // invoices already raised on builds: deposits, and the balance on the delivered one
    var invn = 4400;
    s.builds.forEach(function (b) {
      var si = WS.stageIx(b.stage);
      function raise(label, amount, dayN, paid, xero) {
        invn++;
        var net = Math.round(amount * 100) / 100, vat = Math.round(net * s.settings.vat) / 100;
        var inv = { id: 'ib' + invn, no: 'INV-' + invn, jobId: '', buildId: b.id, buildNo: b.no, vehicleId: '', operatorId: b.operatorId,
          date: WS.day(dayN), due: WS.day(dayN + 30), hours: 0, rate: 0, labour: 0, partsNet: 0, discount: 0, net: net, vat: vat,
          total: Math.round((net + vat) * 100) / 100, cost: 0, xeroExported: xero ? WS.at(WS.day(dayN), 17, 0) : '', xeroId: xero ? 'XI-' + (91000 + invn) : '',
          paid: paid ? WS.at(WS.day(dayN + 6), 10, 0) : '', parts: [],
          lines: [{ desc: b.no + ' ' + b.title + ', ' + label, qty: 1, unit: net }] };
        s.invoices.push(inv);
        b.invoices.push(inv.id);
      }
      if (si >= WS.stageIx('ordered')) raise('deposit ' + b.depositPct + '%', b.price * b.depositPct / 100, b.stage === 'ordered' ? -6 : -(WS.daysBetween(b.stageDates.ordered || T, T)) - 1, true, true);
      if (b.stage === 'delivered') raise('balance on handover', b.price * (100 - b.depositPct) / 100, -6, false, true);
    });
    // an extra Dean asked for on his second body, priced and waiting for his yes on the tracker
    s.builds[3].extras.push({ id: 'x1', opt: 'catwalk', name: 'Catwalk', price: 690, cost: 420, hours: 4, stage: 'fitout', status: 'Sent', at: WS.at(WS.day(-1), 15, 10), by: 'Jamie Boyce', decidedAt: '', decidedBy: '' });
    // extra work the engineers found and the customers approved in the last few weeks
    [[-2, 'o5', 'Front ram top seal weeping', 1.5, 148, 'Ash Parker'], [-5, 'o1', 'Lifting chain worn past the limit', 1, 210, 'Josh Turner'], [-8, 'o6', 'Tar hatch seal perished', 1.5, 96, 'Ash Parker'],
      [-12, 'o3', 'Tailgate hinge pins seized', 2, 38, 'Kyle Burrows'], [-15, 'o2', 'Sheet motor failed', 2, 240, 'Josh Turner'], [-19, 'o4', 'Hook arm hose chafed through', 1, 64, 'Craig Sutton']].forEach(function (x, i) {
      var op = s.operators.filter(function (o) { return o.id === x[1]; })[0], vv = s.vehicles.filter(function (v) { return v.operatorId === x[1]; })[0];
      s.approvals.push({ id: 'ah' + i, jobId: '', operatorId: x[1], vehicleId: vv ? vv.id : '', raisedBy: x[5], raisedAt: WS.at(WS.day(x[0]), 10, 5),
        title: x[2], detail: x[2] + '. Found on the job, photo sent with the price.', estHours: x[3], parts: [{ name: 'Parts', qty: 1, cost: x[4] }], photos: [],
        status: 'Approved', sentAt: WS.at(WS.day(x[0]), 10, 8), decidedAt: WS.at(WS.day(x[0]), 10, 31), decidedBy: op ? op.contact : '', channel: 'WhatsApp and email' });
    });
    // Ryan is on B-0141 now
    var b4 = s.builds[3];
    b4.labour.push({ stage: 'fab', who: 'Ryan Pegg', date: T, start: ago(70) });
    b4.photos.push({ stage: 'fab', art: 'stage:fab', by: 'Ryan Pegg', at: ago(35), caption: 'Front bulkhead and sides tacked up' });
    s.builds[1].updates.push({ at: clampAt(WS.at(T, 9, 5)), text: 'Paint and fit out done. Tipping test passed. Handover ' + weekday(WS.day(2)) + ' at 10.', by: 'Jamie Boyce' });
    s.builds[3].updates.push({ at: WS.at(WS.day(-4), 12, 0), text: 'Your second chassis is in and the subframe is on.', by: 'Jamie Boyce' });

    /* the old London style alerts are not CBR's: no driver checks unless they ask */
    s.checks = s.checks.filter(function (c) { return c.date !== T; });
    return s;
  };
})();
