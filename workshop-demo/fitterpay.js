/* Fitter pay: hours off the clock, each fitter's day or hourly rate, overtime and
   extras, and one spreadsheet for the accountant. Pick a period, answer the overtime
   and extras question for each fitter, say who gets it, send.
   Sending is simulated in the demo. In the real system it goes through the email service.
   Loaded before office3.js, which boots the app. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var S = O.SCREENS, W = O.WIRE;
  var stat = O.stat, head = O.head, empty = O.empty;

  var OFFER_XLSX = false;                       // this demo does not load an Excel library
  var TO_KEY = String(WS.KEY).split(':')[0] + ':payTo';
  var DEFAULT_TO = 'accounts@example-accountants.co.uk';
  var STEPS = ['Period', 'Overtime and extras', 'Who gets it', 'Send'];

  O.payMode = 'week';
  O.payFrom = ''; O.payTo = '';

  function r2(n) { return Math.round((+n || 0) * 100) / 100; }
  function f2(n) { return r2(n).toFixed(2); }
  function addDays(iso, n) { var d = WS.parse(iso); d.setDate(d.getDate() + n); return WS.iso(d); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  /* ---------------- pay rates ---------------- */
  WS.payOf = function (f) {
    var type = f && f.payType === 'day' ? 'day' : 'hour';
    var rate = parseFloat(f && f.payRate);
    if (!(rate > 0)) rate = type === 'day' ? 150 : ((f && f.costRate) || 18);
    return { type: type, rate: rate };
  };
  WS.payLabel = function (f) {
    var p = WS.payOf(f);
    return WS.money(p.rate) + (p.type === 'day' ? ' a day' : ' an hour');
  };

  /* the two fields on the Settings edit and add a fitter boxes */
  O.payFields = function (f) {
    var p = WS.payOf(f);
    return '<div class="row"><label class="f"><span class="lb">Paid by</span><select class="in" id="fPT">' +
      '<option value="hour"' + (p.type === 'hour' ? ' selected' : '') + '>The hour</option>' +
      '<option value="day"' + (p.type === 'day' ? ' selected' : '') + '>The day</option></select></label>' +
      '<label class="f"><span class="lb">Pay rate £ (day or hour)</span><input class="in" id="fPR" type="number" step="0.01" min="0" value="' + f2(p.rate) + '"></label></div>';
  };
  O.payRead = function (f) {
    var t = $('fPT'), r = $('fPR');
    if (!t || !r) return;
    f.payType = t.value === 'day' ? 'day' : 'hour';
    var v = parseFloat(r.value);
    if (v > 0) f.payRate = r2(v);
    else if (!(f.payRate > 0)) f.payRate = WS.payOf(f).rate;
  };

  /* ---------------- periods ---------------- */
  var MODES = [['week', 'This week'], ['lastweek', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Dates']];
  function monthRange(off) {
    var d = WS.today(); d.setDate(1); d.setMonth(d.getMonth() + off);
    return [WS.iso(d), WS.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
  }
  WS.payPeriod = function (mode) {
    if (mode === 'lastweek') return [WS.weekStart(-1), addDays(WS.weekStart(-1), 6)];
    if (mode === 'month') return monthRange(0);
    if (mode === 'lastmonth') return monthRange(-1);
    if (mode === 'custom' && O.payFrom && O.payTo) return O.payFrom <= O.payTo ? [O.payFrom, O.payTo] : [O.payTo, O.payFrom];
    return [WS.weekStart(0), addDays(WS.weekStart(0), 6)];
  };
  function periodLabel(p) { return WS.dateUK(p.from) + ' to ' + WS.dateUK(p.to); }
  WS.payFile = function (p, ext) {
    // a whole calendar month reads better as fitter-pay-2026-10
    var whole = p.from.slice(8) === '01' && p.to === WS.iso(new Date(+p.from.slice(0, 4), +p.from.slice(5, 7), 0));
    return 'fitter-pay-' + (whole ? p.from.slice(0, 7) : p.from + (p.from !== p.to ? '-to-' + p.to : '')) + '.' + (ext || 'csv');
  };

  /* ---------------- the maths ----------------
     A day's hours are the gate clock (in to out, less half an hour for lunch on a
     day over 6 hours), or the job clock ons if they add up to more. Hourly fitters
     get their rate for up to the overtime threshold each day. Day rate fitters get a
     day for each day worked, half a day under 6 hours. Hours past the threshold are
     only paid once the office adds them as overtime, and a few minutes past it
     (under a quarter of an hour) is not flagged. */
  function gateHours(c) {
    var st = WS.state.settings, s = new Date(c.start).getTime(), e;
    if (c.end) e = new Date(c.end).getTime();
    else e = Math.min(Date.now(), s + ((st.dayHours || 8) + 0.5) * 3600000);   // still on site: up to a normal day
    var h = (e - s) / 3600000;
    if (h <= 0) return 0;
    return h > 6 ? h - 0.5 : h;
  }
  WS.fitterPay = function (from, to) {
    var st = WS.state, set = st.settings, ot = set.overtimeAfter || 8, otx = set.overtimeRate || 1.5;
    var days = [];
    for (var d = from; d <= to; d = addDays(d, 1)) days.push(d);
    var key = from + '|' + to, saved = (st.payExtras || {})[key] || {};
    var rows = set.fitters.map(function (f) {
      var pay = WS.payOf(f), gate = {}, job = {};
      (st.dayClocks || []).forEach(function (c) {
        if (c.fitterId === f.id && c.date >= from && c.date <= to) gate[c.date] = (gate[c.date] || 0) + gateHours(c);
      });
      st.jobs.forEach(function (j) {
        (j.clockOns || []).forEach(function (c) {
          var dd = String(c.start).slice(0, 10);
          if (c.fitterId !== f.id || dd < from || dd > to) return;
          var s = new Date(c.start).getTime(), e = c.end ? new Date(c.end).getTime() : Date.now();
          if (e > s) job[dd] = (job[dd] || 0) + (e - s) / 3600000;
        });
      });
      var hours = 0, basicHours = 0, over = 0, worked = 0;
      days.forEach(function (dd) {
        var h = r2(Math.max(gate[dd] || 0, job[dd] || 0));
        if (!h) return;
        hours += h; basicHours += Math.min(h, ot);
        if (h - ot >= 0.25) over += h - ot;
        worked += h >= 6 ? 1 : 0.5;
      });
      hours = r2(hours); basicHours = r2(basicHours); over = r2(over);
      var basic = pay.type === 'day' ? r2(worked * pay.rate) : r2(basicHours * pay.rate);
      var hourly = pay.type === 'day' ? pay.rate / (f.dayHours || set.dayHours || 8) : pay.rate;
      var x = saved[f.id] || null;
      var otHours = x && !x.none ? r2(x.otHours) : 0, otRate = x && !x.none ? r2(x.otRate) : 0;
      var otPay = r2(otHours * otRate), extra = x && !x.none ? r2(x.extra) : 0;
      return {
        fitter: f, pay: pay, days: worked, hours: hours, basicHours: basicHours, over: over,
        otRateSuggest: r2(hourly * otx), basic: basic, otHours: otHours, otRate: otRate, otPay: otPay,
        extra: extra, note: x && !x.none ? (x.note || '') : '', answered: !!x,
        total: r2(basic + otPay + extra)
      };
    });
    var sum = function (k) { return r2(rows.reduce(function (s, r) { return s + r[k]; }, 0)); };
    return {
      from: from, to: to, key: key, days: days, rows: rows, ot: ot, otx: otx,
      totals: { days: sum('days'), hours: sum('hours'), basicHours: sum('basicHours'), basic: sum('basic'),
        otHours: sum('otHours'), otPay: sum('otPay'), extra: sum('extra'), total: sum('total'), over: sum('over') }
    };
  };
  function current() { var pp = WS.payPeriod(O.payMode); return WS.fitterPay(pp[0], pp[1]); }

  /* ---------------- the spreadsheet ---------------- */
  WS.payRows = function (p) {
    var set = WS.state.settings, t = p.totals;
    var rows = [['Fitter pay', set.name], ['Period', periodLabel(p)], [],
      ['Fitter', 'Role', 'Paid by', 'Rate', 'Days worked', 'Hours clocked', 'Basic hours', 'Basic pay',
        'Overtime hours', 'Overtime rate', 'Overtime pay', 'Extras', 'Extras note', 'Total pay']];
    p.rows.forEach(function (r) {
      rows.push([r.fitter.name, r.fitter.role, r.pay.type === 'day' ? 'Day rate' : 'Hourly', r2(r.pay.rate), r.days, r.hours,
        r.basicHours, r.basic, r.otHours, r.otRate, r.otPay, r.extra, r.note, r.total]);
    });
    rows.push(['Total', '', '', '', t.days, t.hours, t.basicHours, t.basic, t.otHours, '', t.otPay, t.extra, '', t.total]);
    return rows;
  };
  var MONEY_COLS = [3, 7, 9, 10, 11, 13];
  WS.payCsv = function (p) {
    return WS.csv(WS.payRows(p).map(function (row, i) {
      if (i < 4) return row;
      return row.map(function (v, c) { return MONEY_COLS.indexOf(c) >= 0 && v !== '' ? f2(v) : v; });
    }));
  };
  function downloadCsv(p) {
    WS.download(WS.payFile(p), WS.payCsv(p));
    WS.toast('Spreadsheet downloaded: ' + WS.payFile(p) + '.', 'ok');
  }
  var xlsxLoading = false;
  function downloadXlsx(p) {
    function go() {
      var X = window.XLSX, wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(WS.payRows(p)), 'Fitter pay');
      X.writeFile(wb, WS.payFile(p, 'xlsx'));
      WS.toast('Spreadsheet downloaded: ' + WS.payFile(p, 'xlsx') + '.', 'ok');
    }
    if (window.XLSX) return go();
    if (xlsxLoading) return;
    xlsxLoading = true;
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function () { xlsxLoading = false; go(); };
    s.onerror = function () { xlsxLoading = false; WS.toast('Could not load the Excel writer. The CSV opens in Excel too.', 'bad'); };
    document.head.appendChild(s);
  }

  /* ---------------- who gets it, remembered in this browser ---------------- */
  function savedTo() {
    var a = null;
    try { a = JSON.parse(localStorage.getItem(TO_KEY) || 'null'); } catch (e) { }
    return Array.isArray(a) && a.length ? a.slice(0, 3) : [DEFAULT_TO];
  }
  function saveTo(list) { try { localStorage.setItem(TO_KEY, JSON.stringify(list.slice(0, 3))); } catch (e) { } }
  function emailOk(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

  /* ---------------- screen ---------------- */
  function money(n) { return n ? WS.money(n) : '<span class="muted">-</span>'; }

  S.fitterpay = function () {
    var p = current(), t = p.totals, sent = WS.state.paySent || [];
    var extras = r2(t.otPay + t.extra);
    return head('Fitter pay', 'Hours off the clock, each fitter\'s rate, overtime and extras. One spreadsheet for the accountant.',
      '<button class="btn alt" id="fpRates">Pay rates</button>' +
      '<button class="btn alt" id="fpCsv">Download spreadsheet</button>' +
      (OFFER_XLSX ? '<button class="btn alt" id="fpXlsx">Excel (.xlsx)</button>' : '') +
      '<button class="btn" id="fpSend">Send to the accountant</button>') +

      '<div class="card tight" style="margin-bottom:14px">' +
      '<div class="seg" id="fpMode">' + MODES.map(function (m) {
        return '<button type="button" data-pm="' + m[0] + '"' + (O.payMode === m[0] ? ' class="on"' : '') + '>' + esc(m[1]) + '</button>';
      }).join('') + '</div>' +
      '<div class="inline" style="margin-top:10px">' +
      '<input class="in" type="date" id="fpFrom" value="' + p.from + '" style="width:auto;flex:0 1 170px" aria-label="From">' +
      '<span class="muted sm">to</span>' +
      '<input class="in" type="date" id="fpTo" value="' + p.to + '" style="width:auto;flex:0 1 170px" aria-label="To">' +
      '<button class="btn alt sm" id="fpGo">Show</button></div>' +
      '<div style="margin-top:10px"><b id="fpPer">' + esc(periodLabel(p)) + '</b>' +
      '<span class="muted sm"> · ' + plural(p.rows.length, 'fitter', 'fitters') + ' · past ' + p.ot + ' hours a day only counts once you add it as overtime</span></div></div>' +

      '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Hours clocked', WS.hrs(t.hours), t.over ? WS.hrs(t.over) + ' of it past ' + p.ot + 'h a day' : 'across ' + p.rows.length + ' fitters', t.over ? 'warn' : '') +
      stat('Basic pay', WS.money0(t.basic), 'rates times days or hours') +
      stat('Overtime and extras', WS.money0(extras), t.otHours ? WS.hrs(t.otHours) + ' overtime added' : 'nothing added yet', extras ? 'warn' : '') +
      stat('Total to pay', WS.money0(t.total), 'before tax and NI', 'ok') +
      '</div>' +

      '<div class="tablewrap scroller"><table class="tbl" id="fpTbl"><thead><tr><th>Fitter</th>' +
      '<th class="num hide-sm">Days</th><th class="num">Hours</th><th class="num hide-sm">Rate</th><th class="num hide-sm">Basic pay</th>' +
      '<th class="num hide-sm">Overtime</th><th class="num hide-sm">Extras</th><th class="num">Total</th><th class="hide-sm"></th></tr></thead><tbody>' +
      p.rows.map(function (r) {
        var otCell = r.otHours
          ? WS.hrs(r.otHours) + ' · ' + WS.money(r.otPay) + '<div class="muted sm">at ' + WS.money(r.otRate) + '</div>'
          : (r.over && !r.answered ? '<span class="muted sm">' + WS.hrs(r.over) + ' past ' + p.ot + 'h, not added</span>' : '<span class="muted">-</span>');
        var btn = function (lbl) { return '<button class="btn alt sm" data-fpx="' + r.fitter.id + '">' + lbl + '</button>'; };
        return '<tr data-fprow="' + r.fitter.id + '"><td><b>' + esc(r.fitter.name) + '</b>' +
          '<div class="muted sm">' + esc(WS.payLabel(r.fitter)) + '</div>' +
          '<div class="only-sm" style="margin-top:6px">' + btn(r.answered ? 'Change extras' : 'Add extras') + '</div></td>' +
          '<td class="num hide-sm">' + (r.days || '<span class="muted">-</span>') + '</td>' +
          '<td class="num">' + (r.hours ? WS.hrs(r.hours) : '<span class="muted">-</span>') +
          (r.hours && r.hours !== r.basicHours ? '<div class="muted sm hide-sm">' + WS.hrs(r.basicHours) + ' basic</div>' : '') + '</td>' +
          '<td class="num hide-sm">' + WS.money(r.pay.rate) + '<div class="muted sm">' + (r.pay.type === 'day' ? 'a day' : 'an hour') + '</div></td>' +
          '<td class="num hide-sm">' + money(r.basic) + '</td>' +
          '<td class="num hide-sm">' + otCell + '</td>' +
          '<td class="num hide-sm">' + money(r.extra) + (r.note ? '<div class="muted sm">' + esc(r.note) + '</div>' : '') + '</td>' +
          '<td class="num b">' + WS.money(r.total) +
          (r.otPay || r.extra ? '<div class="muted sm only-sm">' + (r.otPay + r.extra >= 0 ? '+' : '') + WS.money(r.otPay + r.extra) + ' added</div>' : '') + '</td>' +
          '<td class="num hide-sm">' + btn(r.answered ? 'Change' : 'Add extras') + '</td></tr>';
      }).join('') +
      '<tr style="background:var(--th)" data-fptot="1"><td class="b">Everyone</td>' +
      '<td class="num b hide-sm">' + t.days + '</td><td class="num b">' + WS.hrs(t.hours) + '</td><td class="hide-sm"></td>' +
      '<td class="num b hide-sm">' + WS.money(t.basic) + '</td>' +
      '<td class="num b hide-sm">' + (t.otPay ? WS.money(t.otPay) : '-') + '</td>' +
      '<td class="num b hide-sm">' + (t.extra ? WS.money(t.extra) : '-') + '</td>' +
      '<td class="num b">' + WS.money(t.total) + '</td><td class="hide-sm"></td></tr>' +
      '</tbody></table></div>' +

      '<div class="note" style="margin-top:14px"><b>How the hours are worked out.</b> Off the clock: in at the gate to out at the gate, less half an hour for lunch. ' +
      'Hourly fitters are paid their rate for up to ' + p.ot + ' hours a day. Day rate fitters get a day for each day worked, half a day under 6 hours. ' +
      'Anything past ' + p.ot + ' hours a day is only paid when you add it as overtime, so nothing goes to the accountant you have not seen.</div>' +

      '<div class="card" style="margin-top:16px"><div class="ch"><h2>Sent</h2><div class="sp"><span class="muted sm">Last ten</span></div></div>' +
      (sent.length
        ? '<div class="tablewrap"><table class="tbl" id="fpSent"><thead><tr><th>When</th><th>Period</th><th class="hide-sm">To</th><th class="hide-sm">File</th><th class="num">Total</th></tr></thead><tbody>' +
          sent.slice(0, 10).map(function (x) {
            return '<tr><td class="nowrap">' + esc(WS.whenUK(x.at)) + '</td><td>' + esc(WS.dateShort(x.from) + ' to ' + WS.dateShort(x.to)) +
              '<div class="muted sm only-sm">' + esc(x.to_.join(', ')) + '</div></td>' +
              '<td class="hide-sm">' + esc(x.to_.join(', ')) + '</td><td class="hide-sm mono sm">' + esc(x.file) + '</td>' +
              '<td class="num b">' + WS.money(x.total) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : empty('Nothing sent yet. Press Send to the accountant when the period is done.')) +
      '<div class="hint" style="margin-top:10px">In this demo the email is not really sent. In the live system it goes from the workshop\'s own address, with the spreadsheet attached.</div></div>';
  };

  W.fitterpay = function () {
    document.querySelectorAll('[data-pm]').forEach(function (b) {
      b.onclick = function () {
        O.payMode = b.dataset.pm;
        if (O.payMode === 'custom' && !O.payFrom) { O.payFrom = $('fpFrom').value; O.payTo = $('fpTo').value; }
        O.render();
      };
    });
    $('fpGo').onclick = function () {
      var a = $('fpFrom').value, b = $('fpTo').value;
      if (!a || !b) { WS.toast('Pick both dates.', 'bad'); return; }
      O.payFrom = a; O.payTo = b; O.payMode = 'custom';
      O.render();
    };
    $('fpRates').onclick = ratesModal;
    $('fpCsv').onclick = function () { downloadCsv(current()); };
    var xb = $('fpXlsx');
    if (xb) xb.onclick = function () { downloadXlsx(current()); };
    $('fpSend').onclick = function () { askExtras(current(), 0); };
    document.querySelectorAll('[data-fpx]').forEach(function (b) {
      b.onclick = function () {
        var p = current();
        p.rows.forEach(function (r, i) { if (r.fitter.id === b.dataset.fpx) askExtras(p, i, true); });
      };
    });
  };

  /* ---------------- pay rates ---------------- */
  function ratesModal() {
    var fs = WS.state.settings.fitters;
    O.modal('Pay rates',
      '<div class="hint" style="margin-bottom:14px">Each fitter is paid by the day or by the hour, before tax. ' +
      'The rate goes on the spreadsheet for the accountant.</div>' +
      fs.map(function (f) {
        var p = WS.payOf(f);
        return '<div class="row" style="align-items:flex-end">' +
          '<div style="flex:1 1 150px;padding-bottom:14px"><div class="b">' + esc(f.name) + '</div><div class="muted sm">' + esc(f.role) + '</div></div>' +
          '<label class="f" style="flex:1 1 120px"><span class="lb">Paid by</span><select class="in" data-prt="' + f.id + '">' +
          '<option value="hour"' + (p.type === 'hour' ? ' selected' : '') + '>The hour</option>' +
          '<option value="day"' + (p.type === 'day' ? ' selected' : '') + '>The day</option></select></label>' +
          '<label class="f" style="flex:1 1 110px"><span class="lb">Rate £</span><input class="in" type="number" step="0.01" min="0" data-prr="' + f.id + '" value="' + f2(p.rate) + '"></label></div>';
      }).join(''),
      'Save the rates', function (mask) {
        var bad = [];
        fs.forEach(function (f) {
          var v = parseFloat(mask.querySelector('[data-prr="' + f.id + '"]').value);
          if (!(v > 0)) bad.push(f.name);
        });
        if (bad.length) { WS.toast('Put a rate in for ' + andList(bad) + '.', 'bad'); return; }
        fs.forEach(function (f) {
          f.payType = mask.querySelector('[data-prt="' + f.id + '"]').value === 'day' ? 'day' : 'hour';
          f.payRate = r2(parseFloat(mask.querySelector('[data-prr="' + f.id + '"]').value));
        });
        WS.save(); O.closeModal(); O.render();
        WS.toast('Pay rates saved.', 'ok');
      });
  }

  /* ---------------- step 2: overtime and extras, one fitter at a time ---------------- */
  function stepsBar(cur) {
    return '<div class="steps">' + STEPS.map(function (n, i) {
      return '<div class="sp2 ' + (i < cur ? 'dn' : i === cur ? 'on' : '') + '"><i>' + (i < cur ? '✓' : i + 1) + '</i>' + esc(n) + '</div>';
    }).join('') + '</div>';
  }
  function storeExtras(p, fid, val) {
    var st = WS.state;
    st.payExtras = st.payExtras || {};
    st.payExtras[p.key] = st.payExtras[p.key] || {};
    st.payExtras[p.key][fid] = val;
    WS.save();
  }

  function askExtras(p, i, single) {
    var r = p.rows[i], f = r.fitter, first = f.name.split(' ')[0];
    var prev = (WS.state.payExtras || {})[p.key] || {}, x = prev[f.id] || null;
    var yes = x && !x.none, no = x && x.none;
    var clock = r.hours
      ? WS.hrs(r.hours) + ' clocked over ' + plural(r.days, 'day', 'days') + ', ' + WS.payLabel(f) + '. Basic pay ' + WS.money(r.basic) + '.'
      : 'No hours on the clock for this period.';
    var body = (single ? '' : stepsBar(1)) +
      '<div class="muted sm">' + (single ? '' : 'Fitter ' + (i + 1) + ' of ' + p.rows.length + ' · ') + esc(periodLabel(p)) + '</div>' +
      '<h3 style="margin:8px 0 6px;font-size:17px" id="fxQ">Any overtime or extras for ' + esc(f.name) + '?</h3>' +
      '<div class="hint">' + esc(clock) + '</div>' +
      (r.over ? '<div class="flagbox" style="margin-bottom:0">The clock shows <b>' + WS.hrs(r.over) + '</b> past ' + p.ot + ' hours a day. ' +
        'It is not paid unless you add it as overtime.</div>' : '') +
      '<div class="big2" style="margin:14px 0">' +
      '<button type="button" data-yn="no"' + (no ? ' class="ok"' : '') + '>No</button>' +
      '<button type="button" data-yn="yes"' + (yes ? ' class="ok"' : '') + '>Yes</button></div>' +
      '<div id="fxFields"' + (yes ? '' : ' hidden') + '>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Overtime hours</span><input class="in" id="fxOtH" type="number" step="0.25" min="0" value="' + (yes ? (x.otHours || '') : (r.over ? Math.round(r.over * 4) / 4 : '')) + '" placeholder="0"></label>' +
      '<label class="f"><span class="lb">Overtime rate per hour £</span><input class="in" id="fxOtR" type="number" step="0.01" min="0" value="' + f2(yes && x.otRate ? x.otRate : r.otRateSuggest) + '"></label></div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">One off extra £ (minus for a deduction)</span><input class="in" id="fxEx" type="number" step="0.01" value="' + (yes && x.extra ? x.extra : '') + '" placeholder="0.00"></label>' +
      '<label class="f"><span class="lb">What it is for</span><input class="in" id="fxNote" value="' + esc(yes ? x.note || '' : '') + '" placeholder="Tool allowance, bonus, advance back"></label></div>' +
      '<div class="hint" id="fxSum"></div></div>';

    var last = i === p.rows.length - 1;
    var okLabel = single ? 'Save' : (last ? 'Next: who gets it' : 'Next fitter');
    var back = !single ? '<button class="btn alt" id="fxBack">Back</button>' : '';
    var mask = O.modal(single ? 'Overtime and extras' : 'Send fitter pay', body, okLabel, function () { commit(); }, '', back);
    var choice = yes ? 'yes' : no ? 'no' : '';

    function vals() {
      return {
        otHours: r2(Math.max(0, parseFloat($('fxOtH').value) || 0)),
        otRate: r2(Math.max(0, parseFloat($('fxOtR').value) || 0)),
        extra: r2(parseFloat($('fxEx').value) || 0),
        note: $('fxNote').value.trim()
      };
    }
    function paintSum() {
      var v = vals(), add = r2(v.otHours * v.otRate + v.extra);
      $('fxSum').textContent = (add >= 0 ? 'Adds ' + WS.money(add) : 'Takes ' + WS.money(-add) + ' off') + ' ' + first + '\'s pay. ' +
        'New total ' + WS.money(r.basic + add) + '.';
    }
    function next() {
      O.closeModal();
      var np = WS.fitterPay(p.from, p.to);
      O.render();
      if (single) return;
      if (last) askTo(np); else askExtras(np, i + 1);
    }
    function commit() {
      if (!choice) { WS.toast('Press No or Yes for ' + first + '.', 'bad'); return; }
      if (choice === 'no') { storeExtras(p, f.id, { none: true }); return next(); }
      var v = vals();
      if (!v.otHours && !v.extra) { WS.toast('Put in the overtime hours or an amount, or press No.', 'bad'); return; }
      if (v.otHours && !v.otRate) { WS.toast('Put in the overtime rate.', 'bad'); return; }
      if (v.extra && !v.note) { WS.toast('Say what the ' + (v.extra < 0 ? 'deduction' : 'extra') + ' is for.', 'bad'); return; }
      if (!v.otHours) v.otRate = 0;
      storeExtras(p, f.id, v);
      next();
    }
    mask.querySelectorAll('[data-yn]').forEach(function (b) {
      b.onclick = function () {
        choice = b.dataset.yn;
        mask.querySelectorAll('[data-yn]').forEach(function (o) { o.classList.toggle('ok', o === b); });
        $('fxFields').hidden = choice !== 'yes';
        if (choice === 'no') commit();
        else { paintSum(); $('fxOtH').focus(); }
      };
    });
    ['fxOtH', 'fxOtR', 'fxEx'].forEach(function (id) { $(id).oninput = paintSum; });
    if (yes) paintSum();
    var bb = $('fxBack');
    if (bb) bb.onclick = function () { if (i === 0) O.closeModal(); else askExtras(WS.fitterPay(p.from, p.to), i - 1); };
  }

  /* ---------------- step 3: who gets it ---------------- */
  function askTo(p) {
    var list = savedTo();
    var labels = ['Accountant\'s email', 'Also send to', 'And to'];
    var body = stepsBar(2) +
      '<h3 style="margin:0 0 6px;font-size:17px">Who gets it?</h3>' +
      '<div class="hint" style="margin-bottom:14px">Up to three email addresses. They are remembered for next time.</div>' +
      labels.map(function (l, n) {
        return '<label class="f"><span class="lb">' + esc(l) + (n ? ' (optional)' : '') + '</span>' +
          '<input class="in" type="email" data-to="' + n + '" autocomplete="off" value="' + esc(list[n] || '') + '"' +
          (n ? '' : ' placeholder="' + DEFAULT_TO + '"') + '></label>';
      }).join('');
    var mask = O.modal('Send fitter pay', body, 'Next: check and send', function () {
      var to = [], bad = '';
      mask.querySelectorAll('[data-to]').forEach(function (inp) {
        var v = inp.value.trim();
        if (!v) return;
        if (!emailOk(v)) bad = bad || v;
        else if (to.indexOf(v) < 0) to.push(v);
      });
      if (bad) { WS.toast(bad + ' does not look like an email address.', 'bad'); return; }
      if (!to.length) { WS.toast('Put in at least one email address.', 'bad'); return; }
      saveTo(to);
      review(p, to);
    }, '', '<button class="btn alt" id="toBack">Back</button>');
    $('toBack').onclick = function () { askExtras(p, p.rows.length - 1); };
  }

  /* ---------------- step 4: check and send ---------------- */
  function review(p, to) {
    p = WS.fitterPay(p.from, p.to);
    var t = p.totals, file = WS.payFile(p);
    var body = stepsBar(3) +
      '<div class="muted sm">Fitter pay for</div><div class="b" style="margin-bottom:12px">' + esc(periodLabel(p)) + '</div>' +
      '<div class="tablewrap"><table class="tbl"><thead><tr><th>Fitter</th><th class="num hide-sm">Hours</th><th class="num hide-sm">Basic</th>' +
      '<th class="num"><span class="hide-sm">Overtime and extras</span><span class="only-sm">Added</span></th><th class="num">Total</th></tr></thead><tbody>' +
      p.rows.map(function (r) {
        return '<tr><td>' + esc(r.fitter.name) + '</td><td class="num hide-sm">' + WS.hrs(r.hours) + '</td><td class="num hide-sm">' + WS.money(r.basic) + '</td>' +
          '<td class="num">' + money(r2(r.otPay + r.extra)) + '</td><td class="num b">' + WS.money(r.total) + '</td></tr>';
      }).join('') +
      '<tr style="background:var(--th)"><td class="b">Everyone</td><td class="num b hide-sm">' + WS.hrs(t.hours) + '</td><td class="num b hide-sm">' + WS.money(t.basic) + '</td>' +
      '<td class="num b">' + WS.money(r2(t.otPay + t.extra)) + '</td><td class="num b">' + WS.money(t.total) + '</td></tr></tbody></table></div>' +
      '<div class="card tight" style="margin:14px 0 0;box-shadow:none">' +
      '<div class="muted sm">To</div><div class="b" id="rvTo">' + esc(to.join(', ')) + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Subject</div><div>' + esc(WS.state.settings.name + ': fitter pay, ' + periodLabel(p)) + '</div>' +
      '<div class="muted sm" style="margin-top:8px">Attached</div><div class="mono sm">' + esc(file) + '</div></div>';
    var extra = '<button class="btn alt" id="rvBack">Back</button>' +
      '<button class="btn alt" id="rvCsv">Download spreadsheet</button>' +
      (OFFER_XLSX ? '<button class="btn alt" id="rvXlsx">Excel</button>' : '');
    var mask = O.modal('Send fitter pay', body, 'Send to accountant', function () {
      var b = mask.querySelector('[data-ok]');
      b.disabled = true; b.textContent = 'Sending...';
      setTimeout(function () { sent(p, to, file); }, 700);
    }, '', extra);
    $('rvBack').onclick = function () { askTo(p); };
    $('rvCsv').onclick = function () { downloadCsv(p); };
    var rx = $('rvXlsx');
    if (rx) rx.onclick = function () { downloadXlsx(p); };
  }

  function sent(p, to, file) {
    var st = WS.state;
    st.paySent = st.paySent || [];
    st.paySent.unshift({ at: WS.nowStamp(), from: p.from, to: p.to, to_: to.slice(), file: file, total: p.totals.total });
    if (st.paySent.length > 30) st.paySent.length = 30;
    WS.save();
    O.closeModal();
    if (O.screen === 'money' || O.screen === 'fitterpay') O.render();
    var msg = 'Sent to ' + andList(to) + ' with ' + file + ' attached.';
    O.modal('Sent',
      stepsBar(4) +
      '<div class="note" id="fpDone"><b>' + esc(msg) + '</b></div>' +
      '<div class="hint" style="margin-top:12px">' + plural(p.rows.length, 'fitter', 'fitters') + ', ' + WS.money(p.totals.total) + ' in total for ' +
      esc(periodLabel(p)) + '. It is in the Sent list on this screen.</div>' +
      '<div class="hint" style="margin-top:8px">Demo only: nothing has left this browser. In the live system the email service sends it.</div>');
    WS.toast(msg, 'ok');
  }
})();
