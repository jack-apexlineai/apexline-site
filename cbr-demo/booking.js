/* Due dates and bookings, shared by the office (Vehicle calendar) and the customer portal
   (Book vehicles in). Everything is worked out from the live demo data in this browser. */
(function () {
  var WS = window.WS;

  /* the compliance dates each vehicle carries, with the short name used on the calendar */
  WS.DUE_SHORT = { nextPmi: 'PMI', annualTest: 'MOT', brakeTest: 'Brake test', tacho: 'Tacho', loler: 'LOLER' };
  WS.DUE_LONG = { nextPmi: 'PMI', annualTest: 'annual test (MOT)', brakeTest: 'laden brake test', tacho: 'tacho calibration', loler: 'LOLER inspection' };
  /* the job a due item books in as */
  WS.DUE_JOB = { nextPmi: 'PMI', annualTest: 'MOT prep', brakeTest: 'PMI', tacho: 'Service', loler: 'LOLER' };
  WS.JOB_FOR = { 'PMI': 'PMI', 'MOT prep': 'annual test (MOT)', 'LOLER': 'LOLER inspection', 'Service': 'service', 'Repair': 'repair', 'Tyres': 'tyres', 'Defect': 'defect' };

  WS.urgency = function (date) {
    var n = WS.daysBetween(WS.day(0), date);
    return n < 0 ? 'bad' : n <= 7 ? 'warn' : '';
  };

  /* every due item between two ISO dates (inclusive); overdue: true adds everything already past */
  WS.dueBetween = function (from, to, overdue) {
    var out = [], T = WS.day(0);
    WS.state.vehicles.forEach(function (v) {
      WS.DUE_KINDS.forEach(function (k) {
        var d = v[k.key];
        if (!d) return;
        var inRange = d >= from && d <= to, past = overdue && d < T;
        if (!inRange && !past) return;
        out.push({ v: v, key: k.key, kind: WS.DUE_SHORT[k.key], long: WS.DUE_LONG[k.key], date: d, u: WS.urgency(d), op: WS.operator(v.operatorId) });
      });
    });
    out.sort(function (a, b) { return a.date.localeCompare(b.date) || a.v.reg.localeCompare(b.v.reg); });
    return out;
  };

  /* "2 PMIs, 1 MOT" */
  WS.countKinds = function (items) {
    var n = {}, order = [];
    items.forEach(function (x) { if (!n[x.kind]) { n[x.kind] = 0; order.push(x.kind); } n[x.kind]++; });
    return order.map(function (k) {
      var c = n[k], plural = c === 1 ? k : (/s$/.test(k) ? k : k + 's');
      return c + ' ' + plural;
    }).join(', ');
  };

  WS.isoAdd = function (iso, days) { var d = WS.parse(iso); d.setDate(d.getDate() + days); return WS.iso(d); };
  WS.weekStartOf = function (iso) { var d = WS.parse(iso), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return WS.iso(d); };
  WS.monthStart = function (iso) { return iso.slice(0, 8) + '01'; };
  WS.monthEnd = function (iso) { var d = WS.parse(WS.monthStart(iso)); d.setMonth(d.getMonth() + 1); d.setDate(0); return WS.iso(d); };
  WS.monthName = function (iso) { return WS.parse(iso).toLocaleDateString('en-GB', { month: 'long' }); };
  WS.dayLabel = function (iso) { return WS.parse(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };

  /* workshop room on a day, from the fitters' working hours and what is already booked */
  WS.OPEN_TIMES = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
  WS.dayCapacity = function (iso) {
    var wd = WS.parse(iso).getDay(), st = WS.state.settings;
    if (wd === 0 || wd === 6) return { closed: true, cap: 0, used: 0, free: 0 };
    var cap = st.fitters.reduce(function (s, f) { return s + (f.dayHours || st.dayHours || 8); }, 0);
    var used = WS.state.jobs.filter(function (j) { return j.date === iso && j.status !== 'cancelled'; })
      .reduce(function (s, j) { return s + (j.estHours || WS.stdTime(j.type)); }, 0);
    return { closed: false, cap: cap, used: Math.round(used * 100) / 100, free: Math.max(0, Math.round((cap - used) * 100) / 100) };
  };

  /* book one or more vehicles in on a day. items: [{ vehicleId, type }]. Returns the new jobs. */
  WS.bookVehicles = function (o) {
    var op = WS.operator(o.operatorId), made = [];
    o.items.forEach(function (it) {
      var v = WS.vehicle(it.vehicleId);
      var n = 1000 + WS.state.jobs.length + 1;
      var type = it.type || 'PMI';
      var j = {
        id: WS.uid('j'), no: 'JC' + n, vehicleId: it.vehicleId, operatorId: o.operatorId,
        type: type, date: o.date, bay: '', fitterId: '',
        estHours: WS.stdTime(type), order: 99, priority: 'normal',
        source: 'Customer portal', status: 'booked', dropOff: o.time || '',
        bookedBy: o.by || '', bookedAt: WS.nowStamp(),
        tasks: (WS.JOB_TASKS[type] || []).map(function (t, i) { return { id: 't' + i, text: t, done: false }; }),
        notes: 'Booked in on the customer portal by ' + (o.by || 'the customer') + '. Drop off ' + (o.time || 'any time') + '.',
        parts: [], clockOns: [], photos: [], inspection: null, defects: [],
        qc: null, invoiceId: '', createdAt: WS.nowStamp(),
        audit: [{ at: WS.nowStamp(), who: (o.by || 'Customer') + ' (' + (op ? op.name : '') + ')', what: 'Booked in on the customer portal for ' + o.date + ' ' + (o.time || '') }]
      };
      if ((it.chips && it.chips.length) || it.desc) j.work = [WS.portalWork(it.chips, it.desc, [], 'Routine', o.by, op)];
      WS.state.jobs.push(j);
      made.push(j);
      WS.notify('Workshop', 'in app', 'New booking from the customer portal', WS.bookingLine(j), 'booking');
    });
    WS.save();
    return made;
  };
  /* "Saxby Skip Hire booked AE17 LEB in for its PMI on Thu 3 Dec" */
  WS.bookingLine = function (j) {
    if (j.portalLine) return j.portalLine;
    var op = WS.operator(j.operatorId), v = WS.vehicle(j.vehicleId);
    return WS.shortName(op ? op.name : 'A customer') + ' booked ' + (v ? v.reg : 'a vehicle') + ' in for its ' +
      (WS.JOB_FOR[j.type] || j.type) + ' on ' + WS.parse(j.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      (j.dropOff ? ', drop off ' + j.dropOff : '');
  };
  /* ---------------- Report a repair ---------------- */
  WS.REPAIR_CHIPS = [
    ['brakes', 'Brakes', 'brake defect'], ['lights', 'Lights', 'lights defect'], ['tyres', 'Tyres', 'tyre problem'],
    ['air', 'Air leak', 'air leak'], ['dash', 'Warning light on dash', 'warning light on the dash'],
    ['engine', 'Engine or gearbox', 'engine or gearbox fault'], ['hyd', 'Hydraulics or skip loader arm', 'hydraulics fault'],
    ['body', 'Bodywork', 'bodywork damage'], ['tail', 'Tail lift', 'tail lift fault'], ['other', 'Other', 'fault']
  ];
  function chip(id) { return WS.REPAIR_CHIPS.filter(function (c) { return c[0] === id; })[0]; }
  WS.repairPhrase = function (ids) {
    var ph = (ids || []).map(function (id) { var c = chip(id); return c ? c[2] : ''; }).filter(Boolean);
    if (!ph.length) ph = ['fault'];
    var an = function (w) { return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; };
    return ph.length > 2 ? an(ph[0]) + ', ' + an(ph[1]) + ' and more' : ph.map(an).join(' and ');
  };
  WS.repairConcern = function (ids, desc) {
    var lab = (ids || []).map(function (id) { var c = chip(id); return c ? c[1] : ''; }).filter(Boolean).join(', ');
    desc = String(desc || '').trim();
    return lab && desc ? lab + ': ' + desc : lab || desc || 'Fault reported';
  };
  /* one entry in the standard job card format, filled from what the customer said */
  WS.portalWork = function (ids, desc, photos, urgency, by, op) {
    return { id: WS.uid('w'), concern: WS.repairConcern(ids, desc), location: '', cause: '', fix: '', parts: [], labour: '',
      urgency: urgency || 'Routine', photos: (photos || []).slice(), by: (by || 'Customer') + (op ? ', ' + WS.shortName(op.name) : ''), at: WS.nowStamp(), source: 'portal' };
  };
  /* an indicative range, never a quote: the standard time for the job at the customer's labour
     rate, plus the typical parts for what they ticked where the stock list has a price */
  WS.REPAIR_PARTS = {
    brakes: ['Brake pad set', 'Brake chamber'], lights: ['Bulb set', 'Indicator lamp'], tyres: ['Tyre 315/80 R22.5'],
    air: ['Drain valve', 'Air dryer cartridge'], hyd: ['Hydraulic hose', 'Tipping ram seal kit'], body: ['Mudguard']
  };
  WS.repairEstimate = function (operatorId, ids) {
    var rc = WS.rateFor(operatorId), hrs = WS.stdTime('Repair'), lo = 0, hi = 0, names = [];
    (ids || []).forEach(function (id) {
      var ps = (WS.REPAIR_PARTS[id] || []).map(function (nm) { return WS.stockByName(nm); }).filter(Boolean);
      if (!ps.length) return;
      var cost = ps.map(function (p) { return p.cost * (1 + rc.markup / 100); });
      lo += Math.min.apply(null, cost);
      hi += cost.reduce(function (s, c) { return s + c; }, 0);
      ps.forEach(function (p) { names.push(p.name); });
    });
    var extra = Math.max(0, (ids || []).length - 1) * 0.5;   // each extra fault, another half hour or so
    var lab = (hrs + extra) * rc.rate;
    var r5 = function (n) { return Math.round(n / 5) * 5; };
    var low = r5(lab * 0.75 + lo), high = Math.max(low + 20, r5(lab * 1.5 + hi));
    return { low: low, high: high, hours: hrs + extra, rate: rc.rate, parts: names,
      text: 'Estimate ' + WS.money0(low) + ' to ' + WS.money0(high) + ' + VAT',
      note: 'Final price after inspection, nothing done over the estimate without your OK.' };
  };

  WS.REPAIR_URG = { vor: ['VOR', 'off the road'], soon: ['Urgent', 'needs doing soon'], next: ['Routine', 'for the next visit'] };
  /* o: operatorId, by, vehicleId or newReg, chips, desc, photos, drive ('yes' or 'no'), date, time, addr, contact, urgency */
  WS.reportRepair = function (o) {
    var op = WS.operator(o.operatorId), v = o.vehicleId ? WS.vehicle(o.vehicleId) : null;
    if (!v) {
      v = { id: WS.uid('v'), reg: String(o.newReg || '').toUpperCase().replace(/\s+/g, ' ').trim(), vin: '', make: '', model: '', year: '', type: 'Not known yet',
        operatorId: o.operatorId, odometer: 0, pmiWeeks: 6, lastPmi: '', nextPmi: '', annualTest: '', brakeTest: '', tacho: '', loler: '',
        vor: false, notes: 'Added by the customer on the portal. Check the details.', needsCheck: true, docs: [] };
      WS.state.vehicles.push(v);
    }
    var urg = WS.REPAIR_URG[o.urgency] || WS.REPAIR_URG.soon;
    var drive = o.drive !== 'no';
    var date = drive ? o.date : WS.day(0);
    var n = 1000 + WS.state.jobs.length + 1;
    var line = WS.shortName(op ? op.name : 'A customer') + ' reported ' + WS.repairPhrase(o.chips) + ' on ' + v.reg + ', ' + urg[1] + ', ' +
      (drive ? 'drop off ' + WS.dayLabel(date) + ' ' + (o.time || '') : 'needs collecting, call ' + (o.contact || 'them') + ' back');
    var j = {
      id: WS.uid('j'), no: 'JC' + n, vehicleId: v.id, operatorId: o.operatorId, type: 'Repair', date: date,
      bay: drive ? '' : 'Mobile van', fitterId: '', estHours: WS.stdTime('Repair'), order: 99,
      priority: o.urgency === 'vor' ? 'high' : 'normal', source: 'Customer portal', status: 'booked',
      dropOff: drive ? (o.time || '') : '', bookedBy: o.by || '', bookedAt: WS.nowStamp(), portalLine: line,
      repair: { drive: drive ? 'yes' : 'no', addr: drive ? '' : (o.addr || ''), contact: o.contact || '', urgency: o.urgency || 'soon' },
      tasks: (WS.JOB_TASKS.Repair || []).map(function (t, i) { return { id: 't' + i, text: t, done: false }; }),
      notes: 'Reported on the customer portal by ' + (o.by || 'the customer') + '. ' +
        (drive ? 'Driving it in, drop off ' + WS.dayLabel(date) + ' ' + (o.time || '') + '.' : 'Cannot be driven in: collect or recover from ' + (o.addr || 'the address given') + '. Call ' + (o.contact || 'them') + '.'),
      work: [WS.portalWork(o.chips, o.desc, o.photos, urg[0], o.by, op)],
      estimate: WS.repairEstimate(o.operatorId, o.chips),
      parts: [], clockOns: [], photos: (o.photos || []).slice(), inspection: null, defects: [],
      qc: null, invoiceId: '', createdAt: WS.nowStamp(),
      audit: [{ at: WS.nowStamp(), who: (o.by || 'Customer') + ' (' + (op ? op.name : '') + ')', what: 'Reported a repair on the customer portal: ' + WS.repairConcern(o.chips, o.desc) }]
    };
    if (o.urgency === 'vor') { v.vor = true; v.notes = 'Off the road, reported by ' + (o.by || 'the customer') + ': ' + WS.repairConcern(o.chips, o.desc); }
    WS.state.jobs.push(j);
    WS.notify('Workshop', 'in app', 'Repair reported on the customer portal', line, 'booking');
    WS.save();
    return j;
  };

  /* ---------------- a customer's account, in plain figures ----------------
     Money in these figures is inc VAT, the same as Money's "Owed to us". Pending work is before VAT,
     the same as Home's "Ready to invoice". Pending estimates: repair estimates on work not started yet
     plus extra work waiting on the customer's OK. */
  WS.customerFigures = function (opId) {
    var st = WS.state, T = WS.day(0), yr = T.slice(0, 4);
    var inv = st.invoices.filter(function (i) { return i.operatorId === opId; });
    var thisYear = inv.filter(function (i) { return String(i.date).slice(0, 4) === yr; });
    var sum = function (l) { return Math.round(l.reduce(function (s2, i) { return s2 + i.total; }, 0) * 100) / 100; };
    var unpaid = inv.filter(function (i) { return !i.paid; });
    var late = unpaid.filter(function (i) { return i.due < T; });
    var late30 = unpaid.filter(function (i) { return WS.daysBetween(i.due, T) > 30; });
    var ready = st.jobs.filter(function (j) { return j.operatorId === opId && j.status === 'done' && !j.invoiceId; });
    var ests = st.jobs.filter(function (j) { return j.operatorId === opId && j.estimate && WS.notStarted(j) && j.status !== 'done'; });
    var appr = st.approvals.filter(function (a) { return a.operatorId === opId && a.status === 'Sent'; });
    var estLow = ests.reduce(function (s2, j) { return s2 + j.estimate.low; }, 0) + appr.reduce(function (s2, a) { return s2 + WS.approvalTotals(a).net; }, 0);
    var estHigh = ests.reduce(function (s2, j) { return s2 + j.estimate.high; }, 0) + appr.reduce(function (s2, a) { return s2 + WS.approvalTotals(a).net; }, 0);
    var vs = WS.vehiclesOf(opId), next = null;
    vs.forEach(function (v) {
      [['nextPmi', 'PMI'], ['annualTest', 'MOT']].forEach(function (k) {
        if (v[k[0]] && (!next || v[k[0]] < next.date)) next = { date: v[k[0]], kind: k[1], reg: v.reg };
      });
    });
    var visits = st.jobs.filter(function (j) { return j.operatorId === opId && j.date <= T && ((j.clockOns || []).length || j.status === 'done' || j.status === 'qc'); })
      .map(function (j) { return j.date; }).sort();
    return {
      vehicles: vs.length, invoiced: sum(thisYear), paid: sum(thisYear.filter(function (i) { return i.paid; })),
      owed: sum(unpaid), owedN: unpaid.length, late: sum(late), lateN: late.length, late30: sum(late30),
      pending: Math.round(ready.reduce(function (s2, j) { return s2 + (WS.quoteJob(j).net || 0); }, 0) * 100) / 100, pendingN: ready.length,
      estN: ests.length + appr.length, estLow: Math.round(estLow), estHigh: Math.round(estHigh),
      next: next, last: visits.length ? visits[visits.length - 1] : ''
    };
  };
  /* "£1,240 owed, 2 invoices" and "£480 over 30 days": words, not colours */
  WS.owedText = function (f) {
    if (!f.owedN) return 'Nothing owed';
    return WS.money0(f.owed) + ' owed, ' + f.owedN + ' invoice' + (f.owedN === 1 ? '' : 's');
  };
  WS.lateText = function (f) {
    return f.late30 ? WS.money0(f.late30) + ' over 30 days' : f.late ? WS.money0(f.late) + ' past due' : '';
  };
  WS.estText = function (f) {
    if (!f.estN) return 'None';
    return f.estN + ', ' + (f.estLow === f.estHigh ? WS.money0(f.estLow) : WS.money0(f.estLow) + ' to ' + WS.money0(f.estHigh));
  };

  WS.portalBookings = function () {
    return WS.state.jobs.filter(function (j) { return j.source === 'Customer portal'; })
      .sort(function (a, b) { return String(b.bookedAt).localeCompare(String(a.bookedAt)); });
  };
})();
