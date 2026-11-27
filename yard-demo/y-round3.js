/* Round three: wait and load jobs in the sample data, work for tomorrow on the day plan, the old "deliver" and "collect"
   labels renamed on saved data, and the test WhatsApp landing in the yard inbox, read and ready to book.
   Sample data in this browser only. Nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && K && K.planBase && K.planWin && window.DSGY3)) { if ((tries || 0) < 300) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, ui = UI.ui, ic = window.ic, h = CS.esc;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    var toast = K.toast, save = K.save;

    /* ---------- saved data from before: "6yd deliver" reads "6yd delivery", "4yd collect" reads "4yd collection" ---------- */
    (function () {
      var y = Y(); if (y.lblV === 1) return; y.lblV = 1;
      (y.cashLog || []).forEach(function (x) { x.what = String(x.what || '').replace(/(\d+yd) deliver$/, '$1 delivery').replace(/(\d+yd) collect$/, '$1 collection'); });
      (y.inbox || []).forEach(function (m) { if (m.reply) m.reply = m.reply.replace(/(\d+yd) deliver\b/g, '$1 delivery').replace(/(\d+yd) collect\b/g, '$1 collection'); });
      save();
    })();

    /* ---------- sample jobs: wait and load today, and unplanned work for tomorrow ---------- */
    function site(cust, i) { var o = YC.oneoff(cust); if (o) return { name: o.site, pc: o.pc }; var c = CS.cust(cust); var s = c.sites[i || 0] || c.sites[0]; return { name: s.name, pc: s.pc }; }
    function mk(id, day, lorry, win, type, cust, i, size, loads, stream, extra) {
      if (K.jobById(id)) return null;
      var st = site(cust, i), p = YC.pos(st.pc), b0 = new Date(); b0.setHours(0, 0, 0, 0);
      var j = { id: id, day: day, lorry: lorry, win: win, type: type, cust: cust, site: st, lat: p.lat, lng: p.lng, size: size, loads: loads, stream: stream, place: 'drive', permit: null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: '', pay: YC.oneoff(cust) ? 'cash' : 'invoice',
        log: [{ at: b0.getTime() - 2 * 86400000 + 9 * 3600000, t: 'Booked by Ellie' }] };
      j.price = YC.priceFor(Y(), j); j.incl = YC.inclFor(Y(), j);
      if (type === 'wait') { j.wait = { incl: 30, rate: 25 }; j.log.push({ at: j.log[0].at, t: 'Wait and load: ' + YC.waitLine(j, Y()) }); }
      if (extra) Object.keys(extra).forEach(function (k) { j[k] = extra[k]; });
      Y().jobs.push(j); return j;
    }
    (function () {
      var y = Y(); if (y.r3V === 1) return; y.r3V = 1;
      var t1 = YC.workDays(1, 1, true)[0], now = YC.nowMin(), w0 = Math.min(900, Math.max(720, Math.ceil((now + 90) / 15) * 15));
      /* today: one wait and load on a skip lorry (it shows in live tracking and on Wayne's phone), and a RoRo wait and load still to plan */
      mk('DSG-3194', 0, 'L1', [w0, w0 + 60], 'wait', 'c13', 0, 8, null, 'mixed', { manual: false, notes: 'Wait and load. Customer has a gang of four ready to load it.' });
      mk('DSG-3195', 0, null, [480, 720], 'wait', 'c11', 0, 20, null, 'wood');
      /* tomorrow: skips and grabs still to plan, every RoRo already on a lorry */
      mk('DSG-3171', t1, null, [420, 540], 'deliver', 'c1', 0, 6, null, 'mixed');
      mk('DSG-3172', t1, null, [480, 720], 'wait', 'o3', 0, 8, null, 'house', { notes: 'No access before 9, the lane is blocked for the school run' });
      mk('DSG-3173', t1, null, [720, 960], 'exchange', 'c12', 0, 12, null, 'plaster');
      mk('DSG-3174', t1, null, [480, 720], 'grab', 'c2', 0, null, 2, 'soil');
      mk('DSG-3175', t1, null, [720, 960], 'muck', 'c11', 1, null, 3, 'soil');
      y.v++; save();
    })();

    /* ---------- the test WhatsApp: it lands in the yard inbox, read by the assistant, ready to book ---------- */
    var FULLPC = /\b([A-Z]{1,2}\d[A-Z\d]?) ?(\d[A-Z]{2})\b/i;
    function timeOf(when) {
      var w = String(when || '').toLowerCase(), m = /^(\d{1,2})(?::\d\d)?(am|pm)$/.exec(w);
      if (m) { var hr = +m[1] % 12 + (m[2] === 'pm' ? 12 : 0); return hr < 8 ? 'early' : hr < 12 ? 'am' : 'pm'; }
      return w === 'pm' ? 'pm' : w === 'am' ? 'am' : null;
    }
    A.trySend = function () {
      var ta = q('#tryText'), txt = ta && ta.value.trim(); if (!txt) { toast('Type a message first', 'pencil'); return; }
      var who = (q('#tryWho') || {}).value || 'new', c = who !== 'new' ? CS.cust(who) : null, r = CS.parse(txt, {}), it = r.items[0] || { svc: 'skip', size: 8, qty: 1 };
      var pcm = FULLPC.exec(txt), pc = pcm ? (pcm[1] + ' ' + pcm[2]).toUpperCase() : (r.pc || r.out || ''), si = 0;
      if (c) { var k = c.sites.map(function (s) { return s.pc; }).indexOf(pc); if (k < 0 && r.out) k = c.sites.map(function (s) { return String(s.pc).split(' ')[0]; }).indexOf(r.out); si = k < 0 ? 0 : k; }
      var svc = it.svc === 'grab' || it.svc === 'muck' ? it.svc : 'skip', size = svc === 'skip' ? (it.size || 8) : null;
      var type = svc !== 'skip' ? svc : r.waitLoad ? 'wait' : r.intent === 'exchange' ? 'exchange' : r.intent === 'collect' ? 'collect' : 'deliver';
      var m = { id: 'mw' + Date.now(), kind: 'book', ch: 'wa', cust: c ? c.id : null, site: si, who: c ? null : 'New WhatsApp contact', phone: c ? null : '07700 900000', pc: c ? null : pc, svc: size && size >= 20 ? 'roro' : svc, type: type, size: size, loads: svc === 'skip' ? null : (it.qty || 1), wl: !!r.waitLoad, day: r.day, time: timeOf(r.when), at: Date.now(), unread: true, text: txt, test: true };
      var y = Y(); y.inbox = y.inbox || []; y.inbox.push(m); y.v++; save();
      A.close(); ui.y4InF = 'all'; ui.yMsg = m.id; if (ui.view !== 'inbox') K.go('inbox'); else UI.render();
      toast('Test WhatsApp in the inbox, read and ready: ' + h(m.type === 'wait' ? 'wait and load' : YC.TYPES[m.type] ? YC.TYPES[m.type].n.toLowerCase() : m.type) + '. Press Book it in', 'whatsapp');
    };
    UI.render();
  }
  start(0);
})();
