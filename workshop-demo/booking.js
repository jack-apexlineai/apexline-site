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
      WS.state.jobs.push(j);
      made.push(j);
      WS.notify('Workshop', 'in app', 'New booking from the customer portal', WS.bookingLine(j), 'booking');
    });
    WS.save();
    return made;
  };
  /* "Thameside Skips booked SN17 LEB in for its PMI on Thu 3 Dec" */
  WS.bookingLine = function (j) {
    var op = WS.operator(j.operatorId), v = WS.vehicle(j.vehicleId);
    return WS.shortName(op ? op.name : 'A customer') + ' booked ' + (v ? v.reg : 'a vehicle') + ' in for its ' +
      (WS.JOB_FOR[j.type] || j.type) + ' on ' + WS.parse(j.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      (j.dropOff ? ', drop off ' + j.dropOff : '');
  };
  WS.portalBookings = function () {
    return WS.state.jobs.filter(function (j) { return j.source === 'Customer portal'; })
      .sort(function (a, b) { return String(b.bookedAt).localeCompare(String(a.bookedAt)); });
  };
})();
