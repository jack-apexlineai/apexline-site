/* Recurring inspections. Each vehicle has an inspection interval (6, 8, 10 or 12 weeks).
   The next inspections roll forward from the next one due, any date can be moved to fit
   the diary, and the customer gets an email 7 days before each one, from the workshop. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O, S = O.SCREENS;
  var WEEKS = [6, 8, 10, 12];

  function addDays(iso, n) { var d = WS.parse(iso); d.setDate(d.getDate() + n); return WS.iso(d); }
  WS.pmiSchedule = function (v, n) {
    if (!v || !v.nextPmi) return [];
    var w = v.pmiWeeks || 6, moves = v.pmiMoves || {}, out = [];
    for (var k = 0; k < (n || 4); k++) {
      var auto = addDays(v.nextPmi, k * w * 7);
      out.push({ k: k, date: k === 0 ? v.nextPmi : (moves[k] || auto), moved: k > 0 && !!moves[k] });
    }
    return out;
  };
  WS.remindOn = function (v) { return v && v.pmiRemind !== false; };
  /* the reminder emails that go out between two days (each one 7 days before an inspection) */
  WS.autoReminders = function (from, to) {
    var out = [];
    WS.state.vehicles.forEach(function (v) {
      if (!WS.remindOn(v)) return;
      var op = WS.operator(v.operatorId);
      if (!op) return;
      WS.pmiSchedule(v, 4).forEach(function (s) {
        var send = addDays(s.date, -7);
        if (send >= from && send <= to) out.push({ v: v, op: op, send: send, date: s.date });
      });
    });
    return out.sort(function (a, b) { return a.send < b.send ? -1 : a.send > b.send ? 1 : 0; });
  };
  function emailText(v, op, date) {
    var first = String(op.contact || '').split(' ')[0] || 'there', S2 = WS.state.settings;
    return 'Hi ' + first + ',\n\n' + v.reg + ' is due its safety inspection on ' +
      WS.parse(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) +
      '. It is booked in with us for that day. If you need to move it, just reply or change it on your portal.\n\nThanks,\n' + WS.shortName(S2.name);
  }

  function schedHtml(v) {
    var op = WS.operator(v.operatorId) || {}, w = v.pmiWeeks || 6, list = WS.pmiSchedule(v, 4), on = WS.remindOn(v);
    return '<div class="card tight sched" id="vSched" style="margin:0 0 14px">' +
      '<div class="inline" style="gap:10px;flex-wrap:wrap"><h3 style="margin:0">Inspection schedule</h3>' +
      '<label class="inline sm" style="gap:6px;margin-left:auto">Every <select class="in" id="vsW" style="width:auto;padding:4px 8px">' +
      WEEKS.map(function (x) { return '<option value="' + x + '"' + (x === w ? ' selected' : '') + '>' + x + ' weeks</option>'; }).join('') +
      '</select></label></div>' +
      '<div class="hint" style="margin:6px 0 10px">Booked in automatically every ' + w + ' weeks. Move any date to fit your diary.</div>' +
      (list.length ? '<div class="sched-list">' + list.map(function (s) {
        var st = WS.dueState(s.date);
        return '<div class="sched-row"><span class="muted sm" style="width:58px">' + (s.k === 0 ? 'Next' : 'Then') + '</span>' +
          '<input class="in" type="date" data-vsk="' + s.k + '" value="' + s.date + '" style="width:auto;padding:5px 8px">' +
          (s.k === 0 && st ? WS.O.pill(st.short, st.cls) : s.moved ? '<span class="chip">moved</span>' : '') +
          (on ? '<span class="muted sm right">email ' + esc(WS.dateShort(addDays(s.date, -7))) + '</span>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="muted sm">Set the next inspection date to start the schedule.</div>') +
      '<label class="inline sm" style="gap:8px;margin-top:10px"><input type="checkbox" id="vsR"' + (on ? ' checked' : '') + '> Email ' +
      esc(op.contact || 'the customer') + ' 7 days before each one (' + esc(op.email || '') + ')</label>' +
      (on && list.length ? ' <button type="button" class="lnk sm" id="vsPrev">See the email</button>' : '') +
      '</div>';
  }
  function wireSched(v) {
    var box = $('vSched'); if (!box) return;
    var redraw = function () { box.outerHTML = schedHtml(v); wireSched(v); };
    $('vsW').onchange = function () {
      v.pmiWeeks = +this.value; v.pmiMoves = {}; WS.save(); redraw();
      WS.toast(v.reg + ' now every ' + v.pmiWeeks + ' weeks.', 'ok');
    };
    box.querySelectorAll('[data-vsk]').forEach(function (inp) {
      inp.onchange = function () {
        if (!inp.value) return;
        var k = +inp.dataset.vsk;
        if (k === 0) v.nextPmi = inp.value;
        else { v.pmiMoves = v.pmiMoves || {}; v.pmiMoves[k] = inp.value; }
        WS.save(); redraw();
        WS.toast(v.reg + ' inspection moved to ' + WS.dateShort(inp.value) + '.', 'ok');
      };
    });
    $('vsR').onchange = function () { v.pmiRemind = this.checked; WS.save(); redraw(); };
    var pv = $('vsPrev');
    if (pv) pv.onclick = function () {
      var op = WS.operator(v.operatorId) || {}, s = WS.pmiSchedule(v, 1)[0];
      WS.toast('Sent ' + WS.dateShort(addDays(s.date, -7)) + ' to ' + op.email + ': ' + emailText(v, op, s.date).split('\n\n')[1], 'ok');
    };
  }
  O.schedHtml = schedHtml;

  /* the vehicle file opens with its schedule at the top */
  var vf0 = O.vehicleFile;
  O.vehicleFile = function (id) {
    var r = vf0.apply(this, arguments);
    var v = WS.vehicle(id), mb = document.querySelector('.modal .mb');
    if (v && mb && !$('vSched')) { mb.insertAdjacentHTML('afterbegin', schedHtml(v)); wireSched(v); }
    return r;
  };

  /* Vehicle calendar: the automatic reminder emails for the next 14 days */
  var vc0 = S.vcal;
  if (vc0) S.vcal = function () {
    var html = vc0.apply(this, arguments), T = WS.day(0);
    var list = WS.autoReminders(T, addDays(T, 13));
    var card = '<div class="card tight vbook" id="autoRem"><div class="vops-h">Automatic reminders, next 14 days</div>' +
      '<div class="muted sm" style="margin:-2px 0 8px">Each customer gets an email from you 7 days before their inspection. Nothing to press.</div>' +
      (list.length ? '<ul>' + list.slice(0, 8).map(function (x) {
        return '<li data-vveh="' + x.v.id + '"><span class="vo-dot go"></span><b>' + esc(WS.dateShort(x.send)) + '</b> &nbsp;' +
          esc(x.op.contact + ', ' + WS.shortName(x.op.name)) + ' · ' + esc(x.v.reg) + ' inspection ' + esc(WS.dateShort(x.date)) + '</li>';
      }).join('') + '</ul>' + (list.length > 8 ? '<div class="muted sm">and ' + (list.length - 8) + ' more</div>' : '')
        : '<div class="muted sm">None due to go out.</div>') + '</div>';
    var at = html.indexOf('<div class="card vcal">');
    return at >= 0 ? html.slice(0, at) + card + html.slice(at) : html + card;
  };
})();
