/* CAC demo, fifth layer: the home dashboard you arrange yourself, placing an order, the step by step reply in the inbox,
   the assistant's to do list, live jobs today, skips on site, the supplier handbook (contacts, prices, surcharges,
   licences, price sheets, waste transfer note set up), what each customer is worth, and a pipeline you can drag.
   Sample data only. Nothing leaves this browser. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var W = window.CACV2 = {}, H = null, O = null, drag = null;
  function S() { return CS.S; }
  function q(s) { return document.querySelector(s); }
  function hash(s) { var n = 7; s = String(s); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 100003; return n; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function first(n) { return String(n).split(' ')[0]; }
  function dateOf(off) { return CS.dayDate(off).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function inWords(d) { return d <= 0 ? 'has run out' : d < 14 ? 'in ' + d + ' day' + (d === 1 ? '' : 's') : d < 28 ? 'in ' + Math.round(d / 7) + ' weeks' : d < 60 ? 'in about 1 month' : 'in ' + Math.round(d / 30) + ' months'; }
  function weeks(days) { var w = Math.round(days / 7); return w + ' week' + (w === 1 ? '' : 's'); }

  /* ---------- the extra sample data this layer keeps ---------- */
  var ACC = ['Linda', 'Tracey', 'Mo', 'Claire', 'Dawn', 'Imran', 'Sue', 'Pat', 'Kelly', 'Nina', 'Ros', 'Hazel', 'Bev'];
  var TILES = ['today', 'inbox', 'skips', 'chasing', 'money', 'handbook', 'sales', 'carbon'];
  function D() {
    var s = S();
    if (!s.v2) s.v2 = { home: TILES.slice(), hidden: [], hb: {}, wtnMap: { s1: true, s2: true, s7: true }, wtnAsk: 7, pulls: 0 };
    return s.v2;
  }
  function hb(su) {
    var d = D(), x = d.hb[su.id];
    if (!x) {
      var n = hash(su.id + su.name), slug = su.name.toLowerCase().replace(/[^a-z]+/g, '');
      x = d.hb[su.id] = {
        acc: ACC[n % ACC.length], accPhone: '07700 900' + (300 + n % 600), accEmail: 'accounts@' + slug + '.co.uk', opsEmail: 'bookings@' + slug + '.co.uk',
        fuel: [0, 3, 4.5, 5, 6.5][n % 5], terms: ['30 days', '30 days end of month', '14 days', '30 days'][n % 4],
        permit: su.wtn != null ? 'EPR/' + String.fromCharCode(65 + n % 26, 65 + (n >> 3) % 26) + (3000 + n % 6000) + String.fromCharCode(65 + (n >> 5) % 26, 65 + (n >> 7) % 26) : null,
        insNo: 'PL-' + (100000 + n % 899999), insExp: su.id === 's4' ? 26 : 70 + n % 280, asked: {}
      };
    }
    return x;
  }
  /* every dated document for one supplier */
  function docs(su) {
    var x = hb(su), out = [];
    if (su.licExp != null) out.push({ k: 'lic', n: 'Waste carrier licence', no: su.cbdu, exp: su.licExp });
    if (x.permit) out.push({ k: 'permit', n: 'Environmental permit', no: x.permit, exp: null });
    out.push({ k: 'ins', n: 'Public liability insurance', no: x.insNo, exp: x.insExp });
    return out;
  }
  function warnings() {
    var out = [];
    S().suppliers.forEach(function (su) { docs(su).forEach(function (d) { if (d.exp != null && d.exp < 60) out.push({ su: su, d: d }); }); });
    return out.sort(function (a, b) { return a.d.exp - b.d.exp; });
  }
  function docTag(d) {
    if (d.exp == null) return '<span class="tag ok">' + ic('shield-check') + 'No end date</span>';
    if (d.exp < 60) return '<span class="tag ' + (d.exp < 30 ? 'bad' : 'amber') + '">' + ic('alert') + 'Runs out ' + inWords(d.exp) + '</span>';
    return '<span class="tag ok">' + ic('shield-check') + 'Valid to ' + dateOf(d.exp) + '</span>';
  }

  /* ---------- jobs: today, tomorrow, and what is sitting on site ---------- */
  var WIN = ['7 to 8:30', '8 to 10', '9 to 11', '10 to 12', '12 to 2', '1 to 3'];
  function eta(j) { return j.eta || WIN[hash(j.id) % WIN.length]; }
  function etaStart(j) { var m = /^(\d+)/.exec(eta(j)); var n = m ? +m[1] : 8; return n < 7 ? n + 12 : n; }
  function etaEnd(j) { var m = /to\s*(\d+)(?::(\d+))?/.exec(eta(j)); if (!m) return etaStart(j) + 2; var n = +m[1] + (m[2] ? +m[2] / 60 : 0); return n < 7.5 ? n + 12 : n; }
  function contact(j) { var c = CS.cust(j.cust); return j.contact || { name: c.contact, phone: c.phone }; }
  function moveOn(j, d) { return j.exDay === d ? 'Exchange' : j.colDay === d ? 'Collection' : j.day === d ? 'Delivery' : null; }
  function track(j, d, what) {
    var now = new Date(), hr = now.getHours() + now.getMinutes() / 60, onWay = d === 0 && hr >= etaStart(j) - 1;
    /* half an hour past the end of the supplier's window, a confirmed job shows as done, so an afternoon demo is not full of morning jobs still on the way */
    var past = d === 0 && hr >= etaEnd(j) + 0.5;
    if (d !== 0) return j.status === 'booked' ? ['Waiting on supplier', 'amber', 0] : ['Confirmed', 'brand', 1];
    if (what === 'Delivery') {
      if (j.status === 'booked') return ['Waiting on supplier', 'amber', 0];
      if (j.status === 'confirmed') return past ? ['Delivered', 'ok', 3] : onWay ? ['On the way', 'mail', 2] : ['Confirmed', 'brand', 1];
      return ['Delivered', 'ok', 3];
    }
    if (what === 'Exchange') return j.status === 'exchange' ? (past ? ['Exchanged', 'ok', 3] : onWay ? ['On the way', 'mail', 2] : ['Confirmed', 'brand', 1]) : ['Exchanged', 'ok', 3];
    return j.status === 'collection' ? (past ? ['Collected', 'ok', 3] : onWay ? ['On the way', 'mail', 2] : ['Confirmed', 'brand', 1]) : ['Collected', 'ok', 3];
  }
  function movesOn(d) {
    return S().jobs.map(function (j) { var w = moveOn(j, d); return w ? { j: j, what: w, d: d } : null; }).filter(Boolean).sort(function (a, b) { return etaStart(a.j) - etaStart(b.j); });
  }
  function onSite() {
    return S().jobs.filter(function (j) { return j.status === 'onhire' || j.status === 'exchange' || j.status === 'collection'; }).map(function (j) {
      var su = CS.sup(j.sup), period = j.svc === 'skip' ? (su.hireDays || 14) : (j.weeks ? j.weeks * 7 : (su.hireDays || 14));
      var on = Math.max(0, -j.day), left = period - on;
      return { j: j, su: su, period: period, on: on, left: left, booked: j.status === 'collection', due: j.status !== 'collection' && left <= 0, soon: j.status !== 'collection' && left > 0 && left <= 3 };
    }).sort(function (a, b) { return (a.booked ? 1 : 0) - (b.booked ? 1 : 0) || a.left - b.left; });
  }
  function liveTable(rows, title, empty) {
    var dots = function (n) { return '<span class="trk" title="Booked, confirmed, on the way, done">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i <= n ? 'on' : '') + '"></i>'; }).join('') + '</span>'; };
    return '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('truck') + h(title) + ' <span class="muted" style="font-weight:600">' + rows.length + '</span></h2></div>' +
      (rows.length ? '<div class="tw"><table class="t livet"><thead><tr><th>Date</th><th>Site address</th><th>Service</th><th class="hide-md">Site contact</th><th>Status</th><th class="hide-sm">Supplier</th><th>Supplier\'s ETA</th><th class="hide-md">Notes</th><th></th></tr></thead><tbody>' +
        rows.map(function (r) {
          var j = r.j, c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), ct = contact(j), tk = track(j, r.d, r.what);
          var note = j.note || (j.permit ? 'On the road, permit needed' : '') || (r.what === 'Exchange' ? 'Swap full for empty' : '');
          return '<tr class="click" data-act="openJob" data-id="' + j.id + '"><td><b>' + CS.fmtDay(r.d) + '</b><small>' + r.what + ' · ' + j.id + '</small></td>' +
            '<td><b>' + h(s.name) + '</b><small>' + h(j.addr ? j.addr + ', ' : '') + h(s.pc) + ' · ' + h(c.name) + '</small><small class="only-md">' + h(ct.name) + ' ' + h(ct.phone || '') + '</small></td>' +
            '<td>' + h(CS.jobDesc(j)) + '</td><td class="hide-md"><b>' + h(ct.name) + '</b><small>' + h(ct.phone || '') + '</small></td>' +
            '<td><span class="tag ' + tk[1] + '">' + tk[0] + '</span>' + dots(tk[2]) + '</td><td class="hide-sm">' + h(su.name) + '</td>' +
            '<td><b>' + (j.status === 'booked' ? '<span class="muted">Asked for ' + h(eta(j)) + '</span>' : h(eta(j))) + '</b></td><td class="hide-md"><small style="display:inline">' + h(note) + '</small></td>' +
            '<td class="r">' + (tk[2] < 3 ? '<button class="btn sm" data-act="askEta" data-id="' + j.id + '" title="Ask the supplier where they are">' + ic('whatsapp') + '<span class="hide-sm">Ask ETA</span></button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('circle-check') + h(empty) + '</div>') + '</div>';
  }
  function liveView() {
    var nd = CS.wd(1), t0 = movesOn(0), t1 = movesOn(nd), wait = t0.concat(t1).filter(function (r) { return r.j.status === 'booked'; }).length;
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('truck') + 'Today</small><b>' + t0.length + '</b><span class="d">deliveries, swaps and collections</span></div>' +
      '<div class="card kpi"><small>' + ic('calendar') + (nd === 1 ? 'Tomorrow' : CS.fmtDay(nd)) + '</small><b>' + t1.length + '</b><span class="d">already lined up</span></div>' +
      '<div class="card kpi"><small>' + ic('clock') + 'Waiting on a supplier</small><b' + (wait ? ' style="color:var(--amber)"' : '') + '>' + wait + '</b><span class="d">chased for you until they confirm</span></div>' +
      '<div class="card kpi"><small>' + ic('skip') + 'On site now</small><b>' + onSite().length + '</b><span class="d">' + onSite().filter(function (x) { return x.due; }).length + ' need a collection booked</span></div></div>' +
      liveTable(t0, 'Live jobs today', 'Nothing moving today.') + liveTable(t1, nd === 1 ? 'Tomorrow' : 'Next working day, ' + CS.fmtDay(nd), 'Nothing booked yet.') +
      '<p class="muted" style="font-size:12.5px;margin:0">The ETA is the window the supplier gave when they confirmed the booking. Ask ETA sends them a WhatsApp, and their answer lands in the inbox.</p>';
  }
  function skipsView() {
    var all = onSite(), due = all.filter(function (x) { return x.due; }), soon = all.filter(function (x) { return x.soon; });
    var extra = due.reduce(function (a, x) { return a + Math.ceil(-x.left / 7 || 1) * (x.su.weekRate || 0); }, 0);
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('skip') + 'On site now</small><b>' + all.length + '</b><span class="d">skips and hire items out</span></div>' +
      '<div class="card kpi"><small>' + ic('alert') + 'Collection needs booking</small><b' + (due.length ? ' style="color:var(--bad)"' : '') + '>' + due.length + '</b><span class="d">past the supplier\'s hire period</span></div>' +
      '<div class="card kpi"><small>' + ic('clock') + 'Due in the next 3 days</small><b>' + soon.length + '</b><span class="d">worth booking now</span></div>' +
      '<div class="card kpi"><small>' + ic('pound') + 'Extra hire building up</small><b>' + money(extra) + '</b><span class="d">what suppliers will charge if they sit</span></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('skip') + 'Skips on site <span class="muted" style="font-weight:600">' + all.length + '</span></h2></div>' +
      (all.length ? '<div class="tw"><table class="t"><thead><tr><th>On site</th><th>Customer and site</th><th class="hide-sm">Supplier</th><th>Hire period</th><th>Days on site</th><th>Collection</th><th></th></tr></thead><tbody>' +
        all.map(function (x) {
          var j = x.j, c = CS.cust(j.cust), s = CS.jobSite(j);
          var st = x.booked ? '<span class="tag web">' + ic('calendar') + 'Booked ' + CS.fmtDay(j.colDay == null ? 1 : j.colDay) + '</span>' : x.due ? '<span class="tag bad">' + ic('alert') + 'Collection needs booking</span>' : x.soon ? '<span class="tag amber">Due in ' + x.left + ' day' + (x.left === 1 ? '' : 's') + '</span>' : '<span class="tag ok">' + x.left + ' days left</span>';
          return '<tr class="click" data-act="openJob" data-id="' + j.id + '"><td><b>' + h(CS.jobDesc(j)) + '</b><small>' + j.id + '</small></td><td><b>' + h(c.name) + '</b><small>' + h(s.name) + ', ' + h(s.pc) + '</small></td>' +
            '<td class="hide-sm">' + h(x.su.name) + '</td><td><b>' + weeks(x.period) + '</b><small>' + h(first(x.su.name)) + ' standard</small></td>' +
            '<td><b' + (x.due ? ' style="color:var(--bad)"' : '') + '>' + x.on + '</b><small>' + (x.due ? (-x.left) + ' over' : 'since ' + CS.fmtDay(j.day)) + '</small></td><td>' + st + '</td>' +
            '<td class="r">' + (x.booked ? '' : '<button class="btn sm' + (x.due ? ' pri' : '') + '" data-act="skCollect" data-id="' + j.id + '">' + ic('archive') + '<span class="hide-sm">Book collection</span></button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('circle-check') + 'Nothing on site.</div>') + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">Each supplier\'s standard hire period comes from the Supplier handbook. Change it there and this list follows.</p>';
  }

  /* ---------- placing an order ---------- */
  var SVCS = ['skip', 'grab', 'muck', 'welfare', 'container', 'toilet', 'fencing', 'sweeper', 'concrete', 'aggregates', 'plant'];
  var SIZES = [4, 6, 8, 10, 12, 14, 16, 20, 40];
  var QTY = { grab: ['Loads', 1], muck: ['Loads', 1], aggregates: ['Loads', 1], welfare: ['Weeks', 4], container: ['Weeks', 4], toilet: ['Weeks', 4], fencing: ['Panels', 40], sweeper: ['Hours', 4], concrete: ['Cubic metres', 6], plant: ['Weeks', 1] };
  var TIMES = ['Any time', '7 to 8:30', '8 to 12', '12 to 4'];
  /* what goes in the skip. Soil, rubble or concrete in anything over 8 yards is too heavy to lift, so it warns */
  var MATS = ['Mixed general', 'Soil and stones', 'Concrete and rubble', 'Green waste', 'Wood', 'Plasterboard', 'Metal'], HEAVY = /soil|concrete|hardcore|rubble/i;
  var EWC = { 'Mixed general': '17 09 04', 'Soil and stones': '17 05 04', 'Concrete and rubble': '17 01 07', 'Green waste': '20 02 01', 'Wood': '17 02 01', 'Plasterboard': '17 08 02', 'Metal': '17 04 07' };
  function wasteSvc(svc) { return svc === 'skip' || svc === 'grab' || svc === 'muck'; }
  CS.ewcOf = function (m) { return EWC[m] || ''; };
  function heavyWarn() {
    if (O.svc !== 'skip' || !O.mat || !HEAVY.test(O.mat) || !(O.size > 8) || O.size >= 20) return '';
    return '<div class="note xwheavy" id="ordHeavy" role="alert" style="background:var(--warn-l,#FEF3C7);margin-top:8px">' + ic('alert') + '<span><b>Too heavy to lift.</b> A ' + O.size + ' yard skip full of ' + h(O.mat.toLowerCase()) + ' is over the lorry\'s lifting weight. Suggest an 8 yard or smaller, or a grab. If they want the ' + O.size + ' yard, it can only be half filled.</span></div>';
  }
  function itemOf(d) {
    var it = { svc: d.svc, qty: 1 }, n = Number(d.qty) || (QTY[d.svc] || [0, 1])[1];
    if (d.svc === 'skip') it.size = Number(d.size) || 8;
    if (/grab|muck|aggregates/.test(d.svc)) it.qty = n;
    if (/welfare|container|toilet|plant/.test(d.svc)) it.weeks = n;
    if (d.svc === 'fencing') { it.panels = n; it.weeks = 4; }
    if (d.svc === 'sweeper') it.hours = n;
    if (d.svc === 'concrete') it.m3 = n;
    if (d.svc === 'container') it.ft = 20;
    return it;
  }
  function descOf(it) { return cap(CS.itemText(it).replace(/^(an|a) /i, '')); }
  function freshOrder(pre) {
    /* a new order opens blank: no customer picked, Take card now picked, until someone is chosen */
    O = { cust: '', site: 'other', house: '', addr: '', town: '', pc: '', cname: '', cphone: '', email: '', newName: '', svc: 'skip', size: 8, qty: '', day: null, time: TIMES[0], sup: null, sell: null, pay: 'card', send: 'email', note: '', po: '' };
    if (pre) for (var k in pre) O[k] = pre[k];
    /* paperwork always goes by email; a day only counts once one is picked */
    O.send = 'email'; O.day = (O.day == null || O.day === '' || isNaN(Number(O.day))) ? null : Number(O.day);
    return O;
  }
  /* the full site address line: road (and house number) plus the town */
  function fullAddr() {
    var hs = String(O.house || '').trim(), rd = String(O.addr || '').trim(), line = hs && rd ? (/^\d+[a-z]?$/i.test(hs) ? hs + ' ' + rd : hs + ', ' + rd) : (hs || rd);
    return [line, O.town].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(', ');
  }
  /* ---------- postcode finds the road: postcodes.io for the place, OpenStreetMap for the road ---------- */
  var PCC = {};
  function pcKey(v) { v = String(v || '').toUpperCase().replace(/\s+/g, ''); return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(v) ? v : ''; }
  function pcStHtml() {
    var k = pcKey(O && O.pc), x = k && PCC[k]; if (!x) return '';
    if (x.st === 'busy') return '<span class="xwspin" aria-hidden="true"></span>Finding the road...';
    if (x.st === 'ok') return 'Found from the postcode';
    return '<span class="xwpcbad">Address not found. Type it in by hand, or book it and check the address later.</span>';
  }
  function pcPaint() { var s = q('#ordPcSt'); if (s) s.innerHTML = pcStHtml(); }
  function pcFill(k) {
    var x = PCC[k]; if (!O || !x || pcKey(O.pc) !== k || !q('#layer #ordL')) return;
    if (x.st === 'ok') {
      var cur = String(O.addr || ''), nv = null;
      if (!cur.trim()) nv = x.road; else if (O.addrRoad && cur.indexOf(O.addrRoad) >= 0) nv = cur.replace(O.addrRoad, x.road);
      if (nv != null) { O.addr = nv; O.addrRoad = x.road; var a = q('#ordAddr'); if (a && a.value !== nv) a.value = nv; }
      var tw = String(O.town || '').trim();
      if (x.town && (!tw || tw === O.townAuto)) { O.town = x.town; O.townAuto = x.town; var t = q('#ordTown'); if (t) t.value = x.town; }
    }
    pcPaint();
  }
  function pcGet(u) {
    var ac = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ac) ac.abort(); }, 7000);
    return fetch(u, ac ? { signal: ac.signal } : undefined).then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }, function (e) { clearTimeout(tm); throw e; });
  }
  function pcLook() {
    var k = pcKey(O && O.pc); if (!k) { pcPaint(); return; }
    if (PCC[k]) { if (PCC[k].st === 'busy') pcPaint(); else pcFill(k); return; }
    var x = PCC[k] = { st: 'busy' }, town0 = ''; pcPaint();
    try {
      pcGet('https://api.postcodes.io/postcodes/' + encodeURIComponent(k)).then(function (j) {
        var r = j && j.result; if (!r || r.latitude == null || r.longitude == null) throw new Error('no result');
        town0 = r.admin_district || r.parish || '';
        return pcGet('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + r.latitude + '&lon=' + r.longitude + '&zoom=17');
      }).then(function (n) {
        var a = (n && n.address) || {}; if (!a.road) throw new Error('no road');
        x.st = 'ok'; x.road = a.road; x.town = a.town || a.village || a.city || town0; pcFill(k);
      }).catch(function () { x.st = 'fail'; pcFill(k); });
    } catch (e) { x.st = 'fail'; pcFill(k); }
  }
  /* ---------- the day: Today, Tomorrow, the next three working days, or any date from the picker ---------- */
  var WDS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dayLbl(d) { return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : WDS[CS.dayDate(d).getDay()]; }
  function isoOf(off) { var d = CS.dayDate(off); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function offOf(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return Math.round((d - CS.dayDate(0)) / 864e5); }
  function dayField() {
    var q5 = days(), has = O.day != null, other = has && q5.indexOf(O.day) < 0;
    return '<div class="field"><label>Date</label><div class="chips" id="ordDays">' + q5.map(function (d) { return pk('ordDay', d, O.day === d, dayLbl(d)); }).join('') +
      '<span class="xwdp"><button type="button" class="pk' + (other ? ' on' : '') + '" id="ordPickBtn" data-act="ordPick">' + ic('calendar') + (other ? h(CS.fmtDay(O.day)) : 'Choose a date') + '</button>' +
      '<input type="date" id="ordDate" min="' + isoOf(0) + '"' + (has ? ' value="' + isoOf(O.day) + '"' : '') + ' tabindex="-1" aria-label="Choose a date"></span></div></div>';
  }
  function ordCust() { return O.cust === 'new' ? null : CS.cust(O.cust); }
  function ordPc() { var c = ordCust(); return (c && O.site !== 'other' && c.sites[O.site]) ? c.sites[O.site].pc : O.pc; }
  function ordCalc() {
    var it = itemOf(O), pc = (ordPc() || '').trim(), ranked = pc.length >= 2 ? CS.lookup(pc, it) : [];
    var pick = ranked.filter(function (r) { return r.sup.id === O.sup; })[0] || ranked[0] || null;
    var sell = O.sell != null ? O.sell : (pick ? pick.sell : 0);
    return { it: it, pc: pc, ranked: ranked, pick: pick, sell: sell, cost: pick ? pick.cost : 0, margin: pick ? sell - pick.cost : 0 };
  }
  function days() { var out = [0, 1], d = 1; while (out.length < 5 && d < 14) { d++; var w = CS.dayDate(d).getDay(); if (w !== 0 && w !== 6) out.push(d); } return out; }
  function pk(act, v, on, label) { return '<button type="button" class="pk' + (on ? ' on' : '') + '" data-act="' + act + '" data-v="' + h(v) + '">' + label + '</button>'; }
  function ordLeft() {
    var c = ordCust(), q2 = QTY[O.svc];
    return '<div class="field"><label for="ordCust">Customer</label><select id="ordCust"><option value=""' + (O.cust === '' ? ' selected' : '') + '>Pick a customer, or fill in a new one below</option>' + S().customers.map(function (x) { return '<option value="' + x.id + '"' + (x.id === O.cust ? ' selected' : '') + '>' + h(x.name) + ' (' + h(x.contact) + ')</option>'; }).join('') + '</select></div>' +
      (c && c.stop ? '<div class="xwstop" id="ordStop" role="alert">' + ic('lock') + '<span><b>On stop. Speak to the accounts team.</b><small>' + h(c.name) + ' are on stop in Credit control, so no order can be placed for them.</small></span></div>' : '') +
      (c ? '' : '<div class="field"><label for="ordNew">Customer or company name</label><input id="ordNew" value="' + h(O.newName) + '" placeholder="For example Harlow Builders"></div>') +
      (c ? '<div class="field"><label for="ordSite">Site</label><select id="ordSite">' + c.sites.map(function (s, i) { return '<option value="' + i + '"' + (String(O.site) === String(i) ? ' selected' : '') + '>' + h(s.name) + ', ' + h(s.pc) + '</option>'; }).join('') + '<option value="other"' + (O.site === 'other' ? ' selected' : '') + '>A different address</option></select></div>' : '') +
      (!c || O.site === 'other' ? '<div class="field xwpc"><label for="ordPc">Postcode</label><input id="ordPc" value="' + h(O.pc) + '" placeholder="PE36 5AB" autocomplete="off" autocapitalize="characters" spellcheck="false"><div class="xwpcst" id="ordPcSt" aria-live="polite">' + pcStHtml() + '</div></div>' +
        '<div class="frow"><div class="field" style="flex:1"><label for="ordHouse">House name or number</label><input id="ordHouse" value="' + h(O.house || '') + '" placeholder="15, or Rose Cottage"></div><div class="field" style="flex:1.4"><label for="ordAddr">Street</label><input id="ordAddr" value="' + h(O.addr) + '" placeholder="Found from the postcode"></div><div class="field" style="flex:1"><label for="ordTown">Town</label><input id="ordTown" value="' + h(O.town || '') + '" placeholder="Found from the postcode"></div></div>' : '') +
      '<div class="frow"><div class="field" style="flex:1"><label for="ordCn">Site contact name</label><input id="ordCn" value="' + h(O.cname) + '"></div><div class="field" style="flex:1"><label for="ordCp">Site contact number</label><input id="ordCp" value="' + h(O.cphone) + '" inputmode="tel"></div></div>' +
      (c ? '' : '<div class="field"><label for="ordEmail">Email, for the confirmation and receipt</label><input id="ordEmail" type="email" value="' + h(O.email || '') + '" placeholder="name@example.com" autocomplete="off"></div>') +
      '<div class="field"><label>Service</label><div class="chips">' + SVCS.map(function (k) { return pk('ordSvc', k, O.svc === k, h(S().services[k].short)); }).join('') + '</div></div>' +
      (O.svc === 'skip' ? '<div class="field"><label>Size</label><div class="chips">' + SIZES.map(function (z) { return pk('ordSize', z, O.size === z, z + ' yd'); }).join('') + '</div></div>' +
        ''
        : '<div class="field" style="max-width:180px"><label for="ordQty">' + q2[0] + '</label><input id="ordQty" inputmode="numeric" value="' + h(O.qty || q2[1]) + '"></div>') +
      (wasteSvc(O.svc) ? '<div class="field"><label>Waste stream</label><div class="chips">' + MATS.map(function (m) { return pk('ordMat', m, O.mat === m, h(m)); }).join('') + '</div>' + (O.mat ? '<small class="muted" style="display:block;margin-top:6px">EWC ' + EWC[O.mat] + ', goes on the order, the supplier\'s booking and the waste transfer note</small>' : '') + heavyWarn() + '</div>' : '') +
      dayField() +
      '<div class="field"><label>Time on site</label><div class="chips">' + TIMES.map(function (t) { return pk('ordTime', t, O.time === t, t); }).join('') + pk('ordTime', '__custom', O.timeC, 'Custom time') + '</div>' +
        (O.timeC ? '<input id="ordTimeC" value="' + h(O.timeC === true ? '' : O.timeC) + '" placeholder="For example 10:30 to 11:30, or before 7am" style="margin-top:8px;max-width:320px" autocomplete="off">' : '') + '</div>' +
      '<div class="field"><label for="ordPo">PO number (optional)</label><input id="ordPo" value="' + h(O.po || '') + '" placeholder="The customer\'s purchase order number" autocomplete="off" maxlength="40"></div>' +
      '<div class="field"><label for="ordNote">Notes for the driver (optional)</label><input id="ordNote" value="' + h(O.note) + '" placeholder="Gate code, where to put it, who to ring"></div>';
  }
  function ordRight() {
    var r = ordCalc(), c = ordCust(), later = invLaterOn();
    if (c && c.stop) return '<div class="xwstop">' + ic('lock') + '<span><b>On stop. Speak to the accounts team.</b><small>Suppliers and prices are hidden while this customer is on stop.</small></span></div>';
    if (!r.pc) return '<div class="note">' + ic('map-pin') + '<span>Put the site postcode in and the suppliers who cover it show here, with their price and yours.</span></div>';
    if (!r.pick) return '<div class="note">' + ic('alert') + '<span>No supplier on file covers ' + h(CS.outward(r.pc)) + ' for ' + h(S().services[O.svc].name.toLowerCase()) + '. Add one in the Supplier handbook, or pick a different service.</span></div>';
    var cr = c ? CS.credit(c.id, r.sell) : null;
    return '<div class="sec"><h3>Supplier</h3></div>' + r.ranked.slice(0, 4).map(function (x, i) {
      return '<button type="button" class="supopt' + (x.sup.id === r.pick.sup.id ? ' on' : '') + '" data-act="ordSup" data-v="' + x.sup.id + '"><span class="nm"><b>' + h(x.sup.name) + (i === 0 ? ' <span class="tag ok">Best pick</span>' : '') + '</b><small>' + x.sup.onTime + '% on time · confirms in ~' + x.sup.resp + ' min</small></span><b class="num">' + money(x.cost) + '</b>' + (x.sup.id === r.pick.sup.id ? ic('circle-check') : '') + '</button>';
    }).join('') +
      '<div class="money" style="margin-top:12px"><div class="ln"><div class="d"><b>' + h(descOf(r.it)) + '</b><small>' + h(r.pick.sup.name) + ' · cost ' + money(r.cost) + '</small></div><span class="c">price</span><input id="ordSell" inputmode="numeric" value="' + r.sell + '" aria-label="Customer price"></div>' +
      '<div class="tot"><div><small>Customer</small><b class="num">' + money(r.sell) + '</b></div><div><small>Supplier</small><b class="num">' + money(r.cost) + '</b></div><div class="m"><small>Gross profit</small><b class="num">' + money(r.margin) + ' <span style="font-size:12px">' + CS.pct(r.margin, r.sell) + '%</span></b></div></div></div>' +
      (cr && cr.hold && !(c && c.stop) ? '<div class="note" style="margin-top:10px;background:var(--bad-l)">' + ic('alert') + '<span><b>' + h(c.name) + ' are on hold.</b> ' + h(cr.why) + ' You can still place it, it is your call.</span></div>' : '') +
      '<div class="field" style="margin-top:14px"><label>How they pay</label><div class="chips">' + pk('ordPay', 'account', O.pay === 'account', 'On account') + pk('ordPay', 'link', O.pay === 'link', 'Send a payment link') + pk('ordPay', 'card', O.pay === 'card', 'Take card now') + '</div></div>' +
      (O.pay === 'account' ? '<div class="field" id="ordInvWhen"><label>When to invoice</label><div class="chips">' + pk('ordInv', 'now', !later, 'Invoice now') + pk('ordInv', 'later', later, 'Invoice when the job is complete') + '</div></div>' : '') +
      '<p class="xwsendby" id="ordSendBy">' + ic('mail') + '<span>' + (later ? 'Confirmation goes by email to ' + h((c && c.email) || 'the customer') + '. The invoice follows by email when the job is complete.' : 'Confirmation and invoice go by email to ' + h((c && c.email) || 'the customer')) + '</span></p>' +
      (later ? '<div class="note" id="ordInvNote">' + ic('sparkles') + '<span>One tap books it with ' + h(r.pick.sup.name) + ' and sends ' + h(first(O.cname || (c ? c.first : 'the customer'))) + ' the order confirmation. No invoice yet. It is raised when the job is marked complete.</span></div>' : '') +
      (later ? '' : '<div class="note">' + ic('sparkles') + '<span>One tap books it with ' + h(r.pick.sup.name) + ', raises the invoice, and sends ' + h(first(O.cname || (c ? c.first : 'the customer'))) + ' the order confirmation' + (O.pay === 'account' ? ' and the invoice.' : O.pay === 'link' ? ' and the invoice with a pay by card link.' : '. The card is taken first.') + '</span></div>');
  }
  /* on account only: hold the invoice back until the job is marked complete */
  function invLaterOn() { return O.pay === 'account' && O.inv === 'later'; }
  /* raise the invoice that was held back. Same shape as the one place() makes. */
  function raiseLater(j) {
    if (!j || !j.invLater) return null;
    var inv = CS.nextId('inv', 'INV-');
    S().invoices.unshift({ id: inv, cust: j.cust, amount: j.sell, issued: 0, due: 30, status: 'unpaid', paidDay: undefined, jobs: [j.id], pay: 'account' });
    delete j.invLater; CS.jobLog(j, 'Invoiced on ' + inv + ', raised when the job was marked complete');
    return inv;
  }
  function ordFoot() { var r = ordCalc(), c = ordCust(), stop = c && c.stop, noDay = O.day == null; return '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri lg" id="ordGo" data-act="ordPlace"' + (r.pick && !stop && !noDay ? '' : ' disabled') + '>' + ic(stop ? 'lock' : noDay ? 'calendar' : 'check') + (stop ? 'On stop' : noDay ? 'Pick a day' : 'Place the order' + (r.pick ? ', ' + money(r.sell) : '')) + '</button>'; }
  function ordDraw() { H.modal('New order', '<div class="ord"><div id="ordL">' + ordLeft() + '</div><div class="res" id="ordR">' + ordRight() + '</div></div>', ordFoot(), true); }
  function ordRes() { var r = q('#ordR'); if (r) r.innerHTML = ordRight(); var f = document.querySelector('#layer .modal .mft'); if (f) f.innerHTML = ordFoot(); }
  function ordDoc(j) {
    var c = CS.cust(j.cust), s = CS.jobSite(j), ct = contact(j), inv = S().invoices.filter(function (i) { return i.jobs.indexOf(j.id) >= 0; })[0];
    return '<div class="doc v2doc"><div class="dh2"><img src="brand/cac-logo.svg" alt="CAC Waste Management"><div><b>Order confirmation</b><small>' + j.id + ' · ' + dateOf(0) + '</small></div></div>' +
      '<dl class="kv"><dt>Customer</dt><dd>' + h(c.name) + '</dd><dt>Site address</dt><dd>' + h(j.addr ? j.addr + ', ' : (s.name && s.name !== s.pc ? s.name + ', ' : '')) + h(s.pc) + '</dd><dt>Site contact</dt><dd>' + h(ct.name) + ' · ' + h(ct.phone || '') + '</dd>' +
      (j.po ? '<dt>PO number</dt><dd>' + h(j.po) + '</dd>' : '') + '<dt>What</dt><dd>' + h(CS.jobDesc(j)) + '</dd>' + (j.mat ? '<dt>Waste stream</dt><dd>' + h(j.mat) + ', EWC ' + h(EWC[j.mat] || '') + '</dd>' : '') + '<dt>When</dt><dd>' + CS.fmtDayLong(j.day) + (eta(j) !== 'Any time' ? ', ' + h(eta(j)) : '') + '</dd>' + (j.note ? '<dt>Notes</dt><dd>' + h(j.note) + '</dd>' : '') +
      '<dt>Price</dt><dd>' + money(j.sell, true) + ' + VAT (' + money(j.sell * 1.2, true) + ' with VAT)</dd><dt>Invoice</dt><dd>' + (inv ? inv.id + (inv.status === 'paid' ? ', paid by card' : inv.pay === 'link' ? ', pay by card link on the invoice' : ', on your ' + h(c.terms.toLowerCase())) : j.invLater ? 'Raised when the job is complete' : 'To follow') + '</dd></dl>' +
      '<p style="color:#666;font-size:12.5px;margin:12px 0 0">We will confirm the delivery window once the driver is planned. Your waste transfer note follows after delivery. Any changes, reply to this message or call 0330 122 5711.</p></div>';
  }
  function place() {
    var r = ordCalc(); if (!r.pick) { H.toast('Put a postcode in that a supplier covers first', 'alert'); return; }
    var c = ordCust(), s = S();
    if (c && c.stop) { H.toast('On stop. Speak to the accounts team.', 'lock'); return; }
    if (O.day == null) { H.toast('Pick a day first', 'calendar'); return; }
    O.send = 'email';
    if (!c) {
      var nm = (O.newName || '').trim(); if (!nm) { H.toast('Put the customer\'s name in', 'alert'); var f = q('#ordNew'); if (f) f.focus(); return; }
      c = { id: 'c' + (s.customers.length + 40), limit: 0, name: nm, contact: O.cname || nm, first: first(O.cname || nm), phone: O.cphone, email: String(O.email || '').trim(), type: 'Builder', terms: 'Card on order', owner: 'john', sites: [{ name: fullAddr() || CS.outward(r.pc), pc: r.pc.toUpperCase() }] };
      s.customers.push(c); O.site = 0;
    }
    var other = O.site === 'other', id = CS.nextId('job', 'CAC-'), su = r.pick.sup, it = r.it;
    var j = { id: id, cust: c.id, site: other ? null : Number(O.site), siteName: other ? (fullAddr() || r.pc.toUpperCase()) : null, pc: other ? r.pc.toUpperCase() : null, addr: other ? fullAddr() : '', svc: it.svc, size: it.size, qty: it.qty || 1, weeks: it.weeks, panels: it.panels, ft: it.ft, m3: it.m3, hours: it.hours,
      sup: su.id, cost: r.cost, sell: r.sell, status: 'booked', day: O.day, bookedAt: Date.now(), wtn: /skip|grab|muck/.test(it.svc) ? 'pending' : null, owner: 'john', log: [],
      contact: { name: O.cname || c.contact, phone: O.cphone || c.phone }, note: [O.mat && wasteSvc(it.svc) ? O.mat + ' (EWC ' + EWC[O.mat] + ')' : '', O.note].filter(Boolean).join('. '), eta: O.time === 'Any time' ? null : O.time };
    if (O.mat && wasteSvc(it.svc)) j.mat = O.mat;
    var po = String(O.po || '').trim(); if (po) j.po = po;
    if (!other) { delete j.siteName; delete j.pc; }
    CS.jobLog(j, 'Order placed by John'); s.jobs.push(j);
    var later = invLaterOn(), inv = later ? null : CS.nextId('inv', 'INV-'), paid = O.pay === 'card';
    if (later) { j.invLater = true; CS.jobLog(j, 'Invoice held back. It is raised when the job is marked complete'); }
    else {
    s.invoices.unshift({ id: inv, cust: c.id, amount: r.sell, issued: 0, due: O.pay === 'account' ? 30 : 0, status: paid ? 'paid' : 'unpaid', paidDay: paid ? 0 : undefined, jobs: [id], pay: O.pay });
    CS.jobLog(j, 'Invoiced on ' + inv + (paid ? ', paid by card' : ''));
    }
    var site = CS.jobSite(j), when = CS.fmtDayLong(O.day) + (j.eta ? ', ' + j.eta : '');
    var ts = CS.threadFor({ type: 'supplier', id: su.id }, su.pref === 'email' ? 'email' : 'wa');
    CS.addMsg(ts, 'out', 'Hi ' + su.contact + ', can you do ' + CS.itemText(it) + ' at ' + (j.addr ? j.addr + ', ' : '') + site.pc + ', ' + when + ' please. Site contact ' + j.contact.name + ' ' + (j.contact.phone || '') + '.' + (j.note ? ' ' + j.note + '.' : '') + ' Ref ' + id + '. Thanks, John (CAC)', { by: 'John' });
    CS.schedule(6 + Math.random() * 2, { type: 'supReply', sup: su.id, job: id, text: 'Yes no problem, ' + CS.dayPhrase(O.day).replace(/^on /, '') + (j.eta ? ' ' + j.eta : ' AM') + ' for ' + id });
    /* the confirmation is always its own email, the standard template, never a reply in the customer's conversation */
    var ch = 'email', tc = CS.newThread({ type: 'customer', id: c.id }, ch, 'Order confirmation ' + id);
    var body = 'Hi ' + c.first + ',\n\nYour order is booked.\n\nOrder: ' + id + '\nWhat: ' + CS.cap1(CS.itemText(it)) + '\nSite: ' + (j.addr ? j.addr + ', ' : (site.name && site.name !== site.pc ? site.name + ', ' : '')) + site.pc + '\nDate: ' + CS.cap1(when) + (j.eta ? ', ' + j.eta : '') + '\nPrice: ' + money(r.sell) + ' + VAT (' + money(r.sell * 1.2) + ' with VAT)' + (j.po ? '\nYour PO: ' + j.po : '') + '\n\n';
    if (later) CS.addMsg(tc, 'out', body + 'Your order confirmation is attached. The invoice follows once the job is complete.\n\nThanks,\nJohn\nCAC Waste Management',
      { by: 'John', conf: id, att: [{ n: 'Order-confirmation-' + id + '.pdf', t: 'order', job: id }] });
    else CS.addMsg(tc, 'out', body + 'Your order confirmation and invoice ' + inv + ' are attached' + (O.pay === 'link' ? '. You can pay by card with the link on the invoice.' : paid ? '. Paid by card, thank you. Your receipt is attached.' : ', on your account.') + '\n\nThanks,\nJohn\nCAC Waste Management',
      { by: 'John', conf: id, att: [{ n: 'Order-confirmation-' + id + '.pdf', t: 'order', job: id }, { n: inv + '.pdf', t: 'inv', job: inv }] });
    tc.done = true; tc.unread = false;
    CS.feed('Order ' + id + ' placed for ' + c.name + ', ' + money(r.sell), 'truck'); CS.saved(12); CS.commit();
    H.ui.flash = id;
    var steps = ['Job ' + id + ' created: ' + descOf(it) + ', ' + CS.fmtDay(O.day), 'Booking sent to ' + su.name + ' on WhatsApp, chased until they confirm',
      'Invoice ' + inv + ' raised for ' + money(r.sell) + ' + VAT' + (paid ? ' and marked paid by card' : O.pay === 'link' ? ' with a pay by card link' : ', on their account'), 'Order confirmation and invoice sent to ' + c.first + ' by ' + (ch === 'email' ? 'email' : 'WhatsApp')];
    if (later) steps.splice(2, 2, 'Order confirmation sent to ' + c.first + ' by ' + (ch === 'email' ? 'email' : 'WhatsApp'), 'No invoice yet. It is raised when ' + id + ' is marked complete on Live jobs');
    H.modal('Order placed', '<div class="donecard" style="margin:0"><h3>' + ic('circle-check') + id + ' is booked</h3>' + steps.map(function (x, i) { return '<div class="st" style="animation-delay:' + (i * 0.22) + 's">' + ic('check') + '<span>' + h(x) + '</span></div>'; }).join('') +
      '<div class="saved">About 12 minutes of typing and copying, done in one tap.</div></div>',
      '<button class="btn" data-act="ordView" data-id="' + id + '">' + ic('file-text') + 'Order confirmation</button>' + (later ? '' : '<button class="btn" data-act="openInv" data-id="' + inv + '">' + ic('receipt') + 'Invoice</button>') + '<button class="btn" data-act="openJob" data-id="' + id + '">' + ic('truck') + 'Open the job</button><span class="sp"></span><button class="btn pri" data-act="close">Done</button>');
    return id;
  }

  /* ---------- the step by step reply in the inbox ---------- */
  function guide(t, A) {
    if (t.done || !(A.kind === 'book' || A.kind === 'quote') || !A.lines.length) return null;
    var book = A.kind === 'book', g = t.g || { step: 1 }, r = A.parsed, p = CS.party(t.party), nm = p.first || first(p.name);
    var last = book ? 3 : 2, sPrice = book ? 2 : 1;
    function step(n, title, body, sum, always) {
      var st = g.step > n ? 'done' : g.step === n ? 'on' : 'todo';
      return '<div class="gstep ' + st + (always ? ' show' : '') + '" data-step="' + n + '"><span class="gn">' + (st === 'done' ? ic('check') : n) + '</span><div class="gb"><b>' + title + '</b>' + (st === 'done' ? '<span class="gs">' + sum + ' <button class="lnk" data-act="gStep" data-id="' + t.id + '" data-v="' + n + '">Change</button></span>' : (st === 'on' || always) ? body : '') + '</div></div>';
    }
    var supHtml = '';
    A.lines.forEach(function (l) {
      if (!l.alts || l.alts.length < 2) { if (l.why && l.sup) supHtml += '<div class="note">' + ic('star') + '<span><b>' + h(CS.sup(l.sup).name) + '</b>: ' + h(l.why) + '</span></div>'; return; }
      supHtml += '<div class="supsel"><div class="sec"><h3>Supplier for ' + h(l.desc.toLowerCase()) + '</h3></div>' + l.alts.map(function (a) { var su = CS.sup(a.sup);
        return '<button class="supopt' + (a.sup === l.sup ? ' on' : '') + '" data-act="pickSup" data-id="' + t.id + '" data-i="' + l.idx + '" data-s="' + a.sup + '"><span class="nm"><b>' + h(su.name) + '</b><small>' + su.onTime + '% on time · confirms in ~' + su.resp + ' min' + (su.wtn ? ' · WTNs ' + su.wtn + '%' : '') + '</small></span><b class="num">' + money(a.cost) + '</b>' + (a.sup === l.sup ? ic('circle-check') : '') + '</button>'; }).join('') + (l.why ? '<div class="note">' + ic('star') + '<span>' + h(l.why) + '</span></div>' : '') + '</div>';
    });
    var o = '<div class="abody guide"><div class="ahead"><span class="tag ai">' + ic('sparkles') + 'Response drafted</span><h3>' + h(A.title) + '</h3><p>' + (book ? 'Check the date, check the price, then one tap books it and sends everything.' : 'Check the price, then one tap sends the quote.') + '</p><div class="gsum"><b>' + money(A.sell) + ' + VAT</b><span class="tag ok">' + money(A.margin) + ' margin · ' + CS.pct(A.margin, A.sell) + '%</span>' + (A.lines[0] && A.lines[0].sup ? '<span class="muted">' + h(CS.sup(A.lines[0].sup).name) + (A.lines.filter(function (l) { return l.sup; }).length > 1 ? ' and others' : '') + '</span>' : '') + '</div></div>';
    if (A.chips.length) o += '<div class="chips">' + A.chips.map(function (c) { return '<span class="chip' + (c.assumed ? ' assumed' : '') + '"><small>' + h(c.k) + '</small><span>' + h(c.v) + '</span></span>'; }).join('') + '</div>';
    A.notes.forEach(function (n) { var multi = /Tap to change/.test(n); o += '<div class="note' + (multi ? ' click' : '') + '"' + (multi ? ' data-act="cycleSite" data-id="' + t.id + '" role="button" tabindex="0"' : '') + '>' + ic('sparkles') + '<span>' + h(n) + '</span></div>'; });
    if (book) {
      var dl = CS.fmtDayLong(r.day);
      var opts = []; for (var n = 1; n <= 9 && opts.length < 6; n++) { var d = CS.wd(n); if (d !== r.day && d !== r.dayWas && opts.indexOf(d) < 0) opts.push(d); }
      o += step(1, 'Can we do it ' + (r.day > 1 ? 'on ' : '') + h(dl) + '?',
        (g.pick ? '<small>Pick a date we can do. The reply tells ' + h(nm) + '.</small><div class="chips">' + opts.map(function (d) { return '<button class="pk" data-act="gDay" data-id="' + t.id + '" data-v="' + d + '">' + CS.fmtDay(d) + '</button>'; }).join('') + '</div><button class="lnk" data-act="gNoBack" data-id="' + t.id + '">Back</button>'
          : '<div class="row gbtns"><button class="btn ok" data-act="gYes" data-id="' + t.id + '">' + ic('check') + 'Yes</button><button class="btn" data-act="gNo" data-id="' + t.id + '">' + ic('calendar') + 'No, pick another date</button></div>'),
        r.dayWas != null ? 'Moved to ' + h(dl) + '. The reply says so.' : 'Yes, ' + h(dl) + '.');
    }
    o += step(sPrice, 'Input the price',
      '<div class="money">' + A.lines.map(function (l, i) { var su = l.sup && CS.sup(l.sup);
        return '<div class="ln"><div class="d"><b>' + h(l.desc) + '</b><small>' + (su ? h(su.name) + ' · cost ' + money(l.cost) : 'Cost ' + money(l.cost)) + '</small></div><span class="c">price</span><input id="price-' + t.id + '-' + i + '" data-price="' + i + '" data-id="' + t.id + '" inputmode="numeric" value="' + l.sell + '" aria-label="Customer price"></div>'; }).join('') +
      '<div class="tot"><div><small>Customer</small><b class="num">' + money(A.sell) + '</b></div><div><small>Supplier</small><b class="num">' + money(A.cost) + '</b></div><div class="m"><small>Margin</small><b class="num">' + money(A.margin) + ' <span style="font-size:12px">' + CS.pct(A.margin, A.sell) + '%</span></b></div></div></div>' +
      supHtml + '<div class="row gbtns"><button class="btn ok" data-act="gPrice" data-id="' + t.id + '">' + ic('check') + 'Price is right</button></div><small>Prices come from your price book. Type over any of them and the margin and the reply follow.</small>',
      money(A.sell) + ' + VAT, ' + money(A.margin) + ' margin (' + CS.pct(A.margin, A.sell) + '%).');
    var sendBody = '';
    A.drafts.forEach(function (d, i) {
      var who = CS.party(d.party), text = (t.edits && t.edits[i] != null) ? t.edits[i] : d.text.replace(/\{JOB\}/g, 'CAC-' + S().counters.job);
      sendBody += '<div class="draft"><div class="dh">' + ic(H.chIcon(d.ch)) + '<span>To ' + h(d.to === 'supplier' ? who.name : who.name + (who.sub ? ', ' + who.sub : '')) + '</span><span class="sp"></span><span class="tag ai">' + (d.to === 'supplier' ? 'Supplier booking' : 'Your reply') + '</span></div>' +
        '<textarea id="draft-' + t.id + '-' + i + '" data-draft="' + i + '" data-id="' + t.id + '" rows="' + Math.min(8, Math.max(3, Math.ceil(text.length / 48) + (text.split('\n').length - 1))) + '">' + h(text) + '</textarea></div>';
    });
    if (book) sendBody += '<div class="note">' + ic('receipt') + '<span>The invoice and the order confirmation are made from this booking and go with the reply.</span></div>';
    o += step(last, book ? 'Book it and send' : 'Send the quote', sendBody, '', true);
    o += '</div><div class="approvebar">' + (g.step >= last
      ? '<button class="btn ok lg gbig" data-act="' + (book ? 'gBook' : 'approve') + '" data-id="' + t.id + '">' + ic('check') + (book ? 'Book with supplier and send invoice and confirmation to ' + h(nm) : 'Send the quote to ' + h(nm)) + '</button>'
      : '<div class="gprog">Step ' + g.step + ' of ' + last + '</div>') +
      '<div class="row" style="justify-content:center"><button class="btn sm ghost" data-act="skip" data-id="' + t.id + '">Not now</button><button class="btn sm ghost" data-act="ownReply" data-id="' + t.id + '">' + ic('pencil') + 'I\'ll reply myself</button></div>' +
      '<small>Nothing is sent until the last tap. Edit any line first if you want.</small></div>';
    return o;
  }
  function gset(id, fn) { var t = CS.thread(id); t.g = t.g || { step: 1 }; fn(t.g, t); CS.save(); H.render(); }

  /* ---------- the assistant: one list of what needs doing ---------- */
  function todo() {
    var ch = CS.chaseLists(), needs = H.sortedThreads().filter(H.needsYou), due = onSite().filter(function (x) { return x.due; }), wr = warnings(), miss = wtnMissing();
    var out = [];
    needs.slice(0, 8).forEach(function (t) { var p = CS.party(t.party), A = CS.analyse(t); out.push({ g: 'Reply', ic: H.chIcon(t.ch), b: A.title, s: p.name + (p.sub ? ', ' + p.sub : '') + ' · ' + CS.ago(t.last), act: 'openThread', id: t.id, btn: 'Open' }); });
    if (ch.sup.length) out.push({ g: 'Chase', ic: 'warehouse', b: ch.sup.length + ' booking' + (ch.sup.length > 1 ? 's' : '') + ' not confirmed by the supplier', s: 'Longest wait ' + ch.sup[0].mins + ' minutes', act: 'go', v: 'chasing', btn: 'See' });
    if (due.length) out.push({ g: 'Chase', ic: 'skip', b: due.length + ' skip' + (due.length > 1 ? 's' : '') + ' on site past the hire period', s: 'Collection needs booking', act: 'jobTab', v: 'skips', btn: 'See' });
    if (ch.pay.length) out.push({ g: 'Chase', ic: 'pound', b: ch.pay.length + ' invoice' + (ch.pay.length > 1 ? 's' : '') + ' overdue, ' + money(ch.pay.reduce(function (a, i) { return a + i.amount; }, 0)), s: 'Reminders are written, one tap sends them', act: 'go', v: 'chasing', btn: 'See' });
    if (miss.length) out.push({ g: 'Chase', ic: 'certificate', b: miss.length + ' waste transfer note' + (miss.length > 1 ? 's' : '') + ' not back after ' + D().wtnAsk + ' days', s: 'Want to chase them? Up to you', act: 'go', v: 'paperwork', btn: 'See' });
    if (ch.quotes.length) out.push({ g: 'Chase', ic: 'file-text', b: ch.quotes.length + ' quote' + (ch.quotes.length > 1 ? 's' : '') + ' gone quiet', s: 'Sent 2 or more days ago, no answer', act: 'go', v: 'quotes', btn: 'See' });
    wr.slice(0, 3).forEach(function (w) { out.push({ g: 'Stay compliant', ic: 'shield-check', b: first(w.su.name) + '\'s ' + w.d.n.toLowerCase() + ' runs out ' + inWords(w.d.exp), s: 'Ask for the new one before it does', act: 'openSup', id: w.su.id, btn: 'Open' }); });
    return out;
  }
  function wtnMissing() { var n = D().wtnAsk; return S().jobs.filter(function (j) { return (j.wtn === 'missing' || j.wtn === 'chased') && j.day <= -n && !j.wtnLeave; }); }
  function assistant() {
    var list = todo(), groups = ['Reply', 'Chase', 'Stay compliant'];
    var body = list.length ? groups.map(function (g) {
      var rows = list.filter(function (x) { return x.g === g; }); if (!rows.length) return '';
      return '<div class="sec"><h3>' + g + ' <span class="muted">' + rows.length + '</span></h3></div>' + rows.map(function (x) {
        return '<button class="todo" data-act="' + x.act + '"' + (x.id ? ' data-id="' + x.id + '"' : '') + (x.v ? ' data-v="' + x.v + '"' : '') + '>' + ic(x.ic) + '<span class="bd"><b>' + h(x.b) + '</b><small>' + h(x.s) + '</small></span><span class="link">' + x.btn + ic('chevron-right') + '</span></button>';
      }).join('');
    }).join('') : '<div class="empty">' + ic('circle-check') + 'All clear. Nothing needs you.</div>';
    H.drawer(ic('sparkles') + ' Assistant', 'What needs doing, most urgent first', '<div class="todos">' + body + '</div><p class="muted" style="font-size:12px;margin:14px 0 0">The assistant reads, drafts and reminds. It never sends anything until you tap.</p>',
      '<button class="btn" data-act="ask">' + ic('sparkles') + 'Ask a question</button><span class="sp"></span><button class="btn pri" data-act="close">Close</button>');
  }

  /* ---------- home: tiles you arrange ---------- */
  function tileDefs() {
    var st = CS.stats(), ch = CS.chaseLists(), mtd = S().months[S().months.length - 1], t0 = movesOn(0), os = onSite(), due = os.filter(function (x) { return x.due; }), wr = warnings();
    var needs = H.sortedThreads().filter(H.needsYou), leads = S().leads.filter(function (l) { return l.stage !== 'won'; });
    var rep = S().customers.map(function (c) { return CS.report(c.id); }).filter(function (r) { return r.moves; });
    var tonnes = rep.reduce(function (a, r) { return a + r.tonnes; }, 0), div = rep.reduce(function (a, r) { return a + r.tonnes * r.pct / 100; }, 0);
    function row(act, attrs, a, b, tag) { return '<button class="trow" data-act="' + act + '" ' + attrs + '><span class="bd"><b>' + a + '</b><small>' + b + '</small></span>' + (tag || '') + '</button>'; }
    function big(n, label, red) { return '<div class="tbig"><b' + (red ? ' style="color:var(--bad)"' : '') + '>' + n + '</b><span>' + label + '</span></div>'; }
    return {
      today: { n: 'Today', ic: 'truck', act: 'jobTab', v: 'live', go: 'Live jobs', body: big(t0.length, 'jobs moving today, ' + st.awaiting + ' waiting on a supplier') + (t0.slice(0, 3).map(function (r) { var s = CS.jobSite(r.j), tk = track(r.j, 0, r.what); return row('openJob', 'data-id="' + r.j.id + '"', h(r.what + ': ' + CS.jobDesc(r.j)), h(s.pc) + ' · ' + h(eta(r.j)), '<span class="tag ' + tk[1] + '">' + tk[0] + '</span>'); }).join('') || '<small class="muted">Nothing moving today.</small>') },
      inbox: { n: 'Inbox', ic: 'inbox', act: 'go', v: 'inbox', go: 'Open the inbox', body: big(needs.length, 'need a reply, every one already drafted' + (st.unread ? ' · <span class="redtxt">' + st.unread + ' unread</span>' : '')) + needs.slice(0, 3).map(function (t) { var p = CS.party(t.party); return row('openThread', 'data-id="' + t.id + '"', h(p.name), h(CS.analyse(t).title), t.unread ? '<span class="ub">1</span>' : ''); }).join('') },
      skips: { n: 'Skips on site', ic: 'skip', act: 'jobTab', v: 'skips', go: 'See them all', body: big(os.length, 'on site, ' + (due.length ? '<span class="redtxt">' + due.length + ' need a collection booked</span>' : 'none overdue'), false) + os.slice(0, 3).map(function (x) { var c = CS.cust(x.j.cust); return row('openJob', 'data-id="' + x.j.id + '"', h(CS.jobDesc(x.j)) + ', ' + h(c.name), h(x.su.name) + ' · ' + weeks(x.period) + ' hire · day ' + x.on, x.due ? '<span class="tag bad">Book collection</span>' : x.booked ? '<span class="tag web">Booked</span>' : '<span class="tag ok">' + x.left + ' left</span>'); }).join('') },
      chasing: { n: 'Chasing', ic: 'bell', act: 'go', v: 'chasing', go: 'Open chasing', body: big(ch.total, 'things waiting on someone else') + [[ch.sup.length, 'suppliers not confirmed'], [ch.pay.length, 'customers not paid'], [ch.wtn.length, 'waste transfer notes not back'], [ch.quotes.length, 'quotes gone quiet']].map(function (x) { return '<div class="tline"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') },
      money: { n: 'Money', ic: 'pound', act: 'go', v: 'money', go: 'Open money', body: big(money(mtd.margin), 'margin this month, ' + CS.pct(mtd.margin, mtd.rev) + '% on ' + money(mtd.rev)) + '<div class="tline"><b>' + money(st.overdue) + '</b><span>overdue to you</span></div><div class="tline"><b>' + money(st.owed) + '</b><span>owed in total</span></div><div class="tline"><b>' + money(CS.leakTotals().recharge) + '</b><span>extras not yet recharged</span></div>' },
      handbook: { n: 'Supplier handbook', ic: 'warehouse', act: 'go', v: 'suppliers', go: 'Open the handbook', body: big(S().suppliers.length, 'suppliers, with contacts, prices and licences') + (wr.length ? wr.slice(0, 2).map(function (w) { return row('openSup', 'data-id="' + w.su.id + '"', h(w.su.name), h(w.d.n) + ' runs out ' + inWords(w.d.exp), '<span class="tag ' + (w.d.exp < 30 ? 'bad' : 'amber') + '">' + w.d.exp + ' days</span>'); }).join('') : '<small class="muted">Every licence and insurance is in date.</small>') },
      sales: { n: 'Sales pipeline', ic: 'trending-up', act: 'go', v: 'sales', go: 'Open the pipeline', body: big(money(leads.reduce(function (a, l) { return a + l.value; }, 0)), 'a month in the pipeline, ' + leads.length + ' open deals') + '<div class="tline"><b>' + leads.filter(function (l) { return l.next != null && l.next <= 0; }).length + '</b><span>follow ups due</span></div><div class="tline"><b>' + st.quotesOpen + '</b><span>quotes out</span></div>' },
      carbon: { n: 'Waste and carbon', ic: 'leaf', act: 'go', v: 'reports', go: 'Open the reports', body: big((Math.round(tonnes * 10) / 10) + ' t', 'handled this year') + '<div class="tline"><b>' + (tonnes ? Math.round(div / tonnes * 100) : 0) + '%</b><span>kept out of landfill</span></div><div class="tline"><b>' + rep.length + '</b><span>accounts with a report ready</span></div>' }
    };
  }
  function homeView() {
    var d = D(), defs = tileDefs(), arr = !!H.ui.arrange;
    d.home = d.home.filter(function (k) { return defs[k]; }); TILES.forEach(function (k) { if (d.home.indexOf(k) < 0 && d.hidden.indexOf(k) < 0) d.home.push(k); });
    var st = CS.stats(), hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    return '<div class="homehd"><div style="flex:1;min-width:220px"><h2>' + greet + ', John</h2><p class="muted">' + st.needs + ' messages need you and every one has a draft. Drag the tiles to lay this page out how you like it.</p></div>' +
      '<button class="btn' + (arr ? ' dark' : '') + '" data-act="homeArrange">' + ic(arr ? 'check' : 'pencil') + (arr ? 'Done' : 'Arrange') + '</button><button class="btn pri" data-act="newOrder">' + ic('plus') + 'New order</button></div>' +
      (arr && d.hidden.length ? '<div class="row" style="flex-wrap:wrap;margin-bottom:12px"><span class="muted" style="font-size:13px">Put back:</span>' + d.hidden.map(function (k) { return '<button class="pk sm" data-act="tileShow" data-v="' + k + '">' + ic('plus') + h(defs[k].n) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="tiles' + (arr ? ' arr' : '') + '" id="tiles">' + d.home.map(function (k, i) {
        var t = defs[k];
        return '<section class="card tile" draggable="true" data-tile="' + k + '"><div class="hd"><span class="grip" title="Drag to move">' + ic('menu') + '</span><h2>' + ic(t.ic) + h(t.n) + '</h2>' +
          (arr ? (i === 0 ? '' : '<button class="iconbtn sm" data-act="tileMove" data-v="' + k + '" data-d="-1" aria-label="Move ' + h(t.n) + ' earlier">' + ic('chevron-left') + '</button>') + (i === d.home.length - 1 ? '' : '<button class="iconbtn sm" data-act="tileMove" data-v="' + k + '" data-d="1" aria-label="Move ' + h(t.n) + ' later">' + ic('chevron-right') + '</button>') + '<button class="iconbtn sm" data-act="tileHide" data-v="' + k + '" aria-label="Hide ' + h(t.n) + '">' + ic('x') + '</button>' : '') +
          '</div><div class="bd">' + t.body + '</div><button class="tgo" data-act="' + t.act + '" data-v="' + t.v + '">' + t.go + ic('chevron-right') + '</button></section>';
      }).join('') + '</div>';
  }
  W.moveTile = function (k, before) { var a = D().home, i = a.indexOf(k); if (i < 0 || k === before) return; a.splice(i, 1); var j = before ? a.indexOf(before) : a.length; a.splice(j < 0 ? a.length : j, 0, k); CS.save(); H.render(); };

  /* ---------- the supplier handbook ---------- */
  function hbView(old) {
    var wr = warnings(), cut = old.indexOf('<div class="card"><div class="hd"><h2>' + ic('warehouse') + 'Suppliers '), rest = cut > 0 ? old.slice(0, cut) : old;
    var mapped = S().suppliers.filter(function (s) { return s.wtn != null; });
    return (wr.length ? '<div class="card warnc" style="margin-bottom:16px"><div class="hd"><h2>' + ic('shield-check') + 'To stay compliant <span class="muted" style="font-weight:600">' + wr.length + '</span></h2></div><div class="bd" style="padding-top:4px;padding-bottom:4px">' + wr.map(function (w) {
      var x = hb(w.su);
      return '<div class="rowline"><span class="tag ' + (w.d.exp < 30 ? 'bad' : 'amber') + '">' + w.d.exp + ' days</span><div class="bd"><b>' + h(w.su.name) + '\'s ' + h(w.d.n.toLowerCase()) + ' runs out ' + inWords(w.d.exp) + '</b><small>' + h(w.d.no) + ' · ends ' + dateOf(w.d.exp) + (x.asked[w.d.k] ? ' · asked for the new one' : '') + '</small></div><button class="btn sm" data-act="hbAsk" data-id="' + w.su.id + '" data-k="' + w.d.k + '">' + ic('whatsapp') + '<span class="hide-sm">Ask for the new one</span></button></div>';
    }).join('') + '</div></div>' : '') +
      '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('warehouse') + 'Suppliers <span class="muted" style="font-weight:600">' + S().suppliers.length + '</span></h2><button class="btn sm" data-act="go" data-v="pricebook">' + ic('list') + '<span class="hide-sm">Your price book</span></button><button class="btn sm" data-act="addSup">' + ic('plus') + '<span class="hide-sm">Add supplier</span></button></div>' +
      '<div class="tw"><table class="t"><thead><tr><th>Supplier</th><th class="hide-sm">Bookings</th><th class="hide-md">Accounts</th><th>Hire period</th><th class="hide-sm">Fuel surcharge</th><th>Licences</th><th class="hide-md">Waste transfer notes</th></tr></thead><tbody>' +
      S().suppliers.map(function (s) {
        var x = hb(s), ds = docs(s), bad = ds.filter(function (d) { return d.exp != null && d.exp < 60; })[0];
        return '<tr class="click" data-act="openSup" data-id="' + s.id + '"><td><b>' + h(s.name) + '</b>' + (s.preferred ? ' <span class="tag brand">Preferred</span>' : '') + '<small>' + s.services.map(function (k) { return S().services[k].short; }).join(', ') + ' · ' + h(s.base) + '</small></td>' +
          '<td class="hide-sm"><b>' + h(s.contact) + '</b><small style="white-space:nowrap">' + h(s.phone) + '</small></td><td class="hide-md"><b>' + h(x.acc) + '</b><small>' + h(x.accEmail) + '</small></td>' +
          '<td>' + (s.hireDays ? weeks(s.hireDays) : '<span class="muted">By the week</span>') + '</td><td class="hide-sm">' + (x.fuel ? x.fuel + '%' : '<span class="muted">None</span>') + '</td>' +
          '<td>' + (bad ? docTag(bad) : '<span class="tag ok">' + ic('shield-check') + 'In date</span>') + '</td>' +
          '<td class="hide-md">' + (s.wtn == null ? '<span class="muted">No waste</span>' : D().wtnMap[s.id] ? '<span class="tag ok">' + ic('check') + 'Read automatically</span>' : '<span class="tag">Not set up</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' + rest +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">' + mapped.filter(function (s) { return D().wtnMap[s.id]; }).length + ' of ' + mapped.length + ' waste suppliers have their waste transfer note set up. Open a supplier to set up the rest.</p>';
  }
  function rateRows(su) {
    var rows = [];
    Object.keys(su.rates || {}).forEach(function (svc) {
      var r = su.rates[svc], nm = S().services[svc] ? S().services[svc].short : svc;
      if (typeof r === 'number') { rows.push({ svc: svc, k: null, n: nm, v: r }); return; }
      Object.keys(r).forEach(function (k) { if (typeof r[k] !== 'number') return; rows.push({ svc: svc, k: k, n: svc === 'skip' ? k + ' yard skip' : nm + ', ' + ({ week: 'per week', del: 'delivery', load: 'per load', hour: 'per hour', m3: 'per cubic metre', day: 'per day', min: 'minimum', col: 'collection' }[k] || k), v: r[k] }); });
    });
    return rows;
  }
  function hbBlock(su) {
    var x = hb(su), ds = docs(su), rows = rateRows(su);
    return '<div class="hbk" id="hbk"><div class="sec"><h3>Contacts</h3></div>' +
      '<div class="rowline"><div class="bd"><b>' + h(su.contact) + ', bookings</b><small>' + h(su.phone) + ' · ' + h(x.opsEmail) + '</small><small>' + (su.pref === 'email' ? 'Prefers email. Purchase orders go to ' + h(x.opsEmail) : 'Prefers WhatsApp') + '</small></div>' +
        (su.pref === 'email' ? '<button class="btn sm pri" data-act="msgParty" data-ch="email" data-type="supplier" data-id="' + su.id + '">' + ic('mail') + 'Email</button><button class="btn sm" data-act="msgParty" data-ch="wa" data-type="supplier" data-id="' + su.id + '">' + ic('whatsapp') + 'WhatsApp</button>'
          : '<button class="btn sm pri" data-act="msgParty" data-ch="wa" data-type="supplier" data-id="' + su.id + '">' + ic('whatsapp') + 'WhatsApp</button><button class="btn sm" data-act="msgParty" data-ch="email" data-type="supplier" data-id="' + su.id + '">' + ic('mail') + 'Email</button>') + '</div>' +
      '<div class="rowline"><div class="bd"><b>' + h(x.acc) + ', accounts team</b><small>' + h(x.accPhone) + ' · ' + h(x.accEmail) + ' · pays on ' + h(x.terms) + '</small></div></div>' +
      '<div class="sec"><h3>Hire and surcharges</h3></div><div class="frow">' +
      (su.hireDays ? '<div class="field" style="flex:1"><label for="hbHire">Standard hire period</label><select id="hbHire" data-id="' + su.id + '">' + [7, 14, 21, 28].map(function (d) { return '<option value="' + d + '"' + (su.hireDays === d ? ' selected' : '') + '>' + weeks(d) + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="field" style="flex:1"><label for="hbFuel">Fuel surcharge, %</label><input id="hbFuel" data-id="' + su.id + '" inputmode="decimal" value="' + x.fuel + '"></div>' +
      (su.weekRate ? '<div class="field" style="flex:1"><label>Extra hire after that</label><input value="' + money(su.weekRate) + ' a week" disabled></div>' : '') + '</div>' +
      '<div class="sec"><h3>Their prices</h3><button class="btn sm" data-act="hbPrices" data-id="' + su.id + '">' + ic('download') + 'Upload a price sheet</button></div>' +
      (rows.length ? '<div class="ratesg">' + rows.map(function (r) { return '<span><small>' + h(r.n) + '</small><b>' + money(r.v, r.v % 1 !== 0) + '</b></span>'; }).join('') + '</div>' : '<p class="muted" style="font-size:13px">No prices on file yet.</p>') +
      (x.pricesAt ? '<p class="muted" style="font-size:12px;margin:6px 0 0">Price sheet read in ' + CS.ago(x.pricesAt) + '.</p>' : '') +
      '<div class="sec"><h3>Licences and insurance</h3><button class="btn sm" data-act="hbDoc" data-id="' + su.id + '">' + ic('download') + 'Upload a document</button></div>' +
      ds.map(function (d) { return '<div class="rowline"><div class="bd"><b>' + h(d.n) + '</b><small>' + h(d.no) + (d.exp != null ? ' · ends ' + dateOf(d.exp) : '') + (x.asked[d.k] ? ' · asked for the new one' : '') + '</small></div>' + docTag(d) + (d.exp != null && d.exp < 60 ? '<button class="btn sm" data-act="hbAsk" data-id="' + su.id + '" data-k="' + d.k + '">' + ic('whatsapp') + 'Ask</button>' : '') + '</div>'; }).join('') +
      (su.wtn != null ? '<div class="sec"><h3>Waste transfer notes</h3></div><div class="rowline"><div class="bd"><b>' + (D().wtnMap[su.id] ? 'Read automatically' : 'Not set up yet') + '</b><small>' + (D().wtnMap[su.id] ? 'Every note from ' + h(su.name) + ' is read and filed against the job.' : 'Show the system one of their notes, once. After that every note from them reads itself.') + '</small></div><button class="btn sm' + (D().wtnMap[su.id] ? '' : ' pri') + '" data-act="hbWtn" data-id="' + su.id + '">' + ic('certificate') + (D().wtnMap[su.id] ? 'Set up again' : 'Set up') + '</button></div>' : '') +
      '<div class="sec"><h3>How they perform</h3></div></div>';
  }
  function priceReview(su) {
    var rows = rateRows(su), x = hb(su), ch = 0;
    rows.forEach(function (r, i) { var up = (hash(su.id + r.n) % 3 === 0) || i === 1; r.nv = up ? (r.v < 10 ? Math.round((r.v + 0.2) * 10) / 10 : r.v + (r.v >= 300 ? 15 : r.v >= 100 ? 10 : 5)) : r.v; if (r.nv !== r.v) ch++; });
    var nf = x.fuel ? x.fuel + 0.5 : 3;
    W._rev = { id: su.id, rows: rows, fuel: nf };
    return '<p style="margin:0 0 10px;font-size:13.5px"><b>' + rows.length + ' prices read, ' + ch + ' have changed.</b> Check them, then save. Nothing changes until you do.</p>' +
      '<div class="tw" style="max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:12px"><table class="t"><thead><tr><th>Price</th><th class="r">Now</th><th class="r">On the sheet</th><th class="r">Change</th></tr></thead><tbody>' +
      rows.map(function (r) { var dlt = Math.round((r.nv - r.v) * 100) / 100; return '<tr' + (dlt ? ' class="chg"' : '') + '><td><b>' + h(r.n) + '</b></td><td class="r num">' + money(r.v, r.v % 1 !== 0) + '</td><td class="r num"><b>' + money(r.nv, r.nv % 1 !== 0) + '</b></td><td class="r">' + (dlt ? '<span class="tag amber">+' + money(dlt, dlt % 1 !== 0) + '</span>' : '<span class="muted">Same</span>') + '</td></tr>'; }).join('') +
      '<tr class="chg"><td><b>Fuel surcharge</b></td><td class="r num">' + x.fuel + '%</td><td class="r num"><b>' + nf + '%</b></td><td class="r"><span class="tag amber">+' + (Math.round((nf - x.fuel) * 10) / 10) + '%</span></td></tr></tbody></table></div>' +
      '<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="hbPriceSave">' + ic('check') + 'Looks right, save it</button></div>';
  }
  var WF = [['Ticket number', 'WT-48213'], ['Date', ''], ['Vehicle', 'AK21 RLO'], ['Waste', 'Mixed construction and demolition waste'], ['Waste code', '17 09 04'], ['Gross weight', '9.84 t'], ['Tare weight', '7.38 t'], ['Net weight', '2.46 t']];
  function wtnReview(su) {
    var types = WF.map(function (f) { return f[0]; }).concat(['Site or job reference', 'Ignore this']);
    var found = WF.map(function (f) { return [f[0], f[0] === 'Date' ? dateOf(-1) : f[1]]; });
    return '<div class="wtng"><div class="doc wtnmock"><b>' + h(su.name) + '</b><small>Waste transfer note · ' + h(su.cbdu || '') + '</small>' + found.map(function (f) { return '<div><span>' + h(f[0] === 'Tare weight' ? 'Wt 2' : f[0] === 'Gross weight' ? 'Wt 1' : f[0] === 'Net weight' ? 'Net' : f[0] === 'Waste code' ? 'EWC' : f[0]) + '</span><b>' + h(f[1]) + '</b></div>'; }).join('') + '</div>' +
      '<div><p style="margin:0 0 8px;font-size:13.5px"><b>Here is what it found.</b> Check each one. Two it was not sure about, so it is asking.</p>' + found.map(function (f, i) {
        var unsure = f[0] === 'Gross weight' || f[0] === 'Tare weight';
        return '<div class="wmap' + (unsure ? ' ask' : '') + '"><span class="v"><b>' + h(f[1]) + '</b><small>' + (unsure ? 'Printed as "Wt ' + (f[0] === 'Gross weight' ? 1 : 2) + '". What is this?' : 'Looks like') + '</small></span><select aria-label="What is ' + h(f[1]) + '" data-wmap="' + i + '">' + (unsure ? '<option value="">Pick one</option>' : '') + types.map(function (t) { return '<option' + (!unsure && t === f[0] ? ' selected' : '') + '>' + h(t) + '</option>'; }).join('') + '</select></div>';
      }).join('') + '</div></div>' +
      '<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="hbWtnSave" data-id="' + su.id + '">' + ic('check') + 'Save, and read every ' + h(first(su.name)) + ' note like this</button></div>';
  }
  function upBox(id, label, sample, act, sid) {
    return '<div class="upbox"><label class="btn" for="' + id + '">' + ic('download') + label + '</label><input type="file" id="' + id + '" data-id="' + sid + '" hidden><button class="btn dark" data-act="' + act + '" data-id="' + sid + '">' + ic('play') + sample + '</button></div><div id="hbRes"></div>' +
      '<p class="muted" style="font-size:12px;margin:10px 0 0">Demo: nothing is uploaded, your file stays on your computer and the sample is shown. Live, the file is read for you and you check it before anything is saved.</p>';
  }
  function reading(text, then) { var b = q('#hbRes'); if (!b) return; b.innerHTML = '<div class="note" style="margin-top:12px">' + ic('clock') + '<span>' + h(text) + '</span></div>'; setTimeout(function () { var x = q('#hbRes'); if (x) x.innerHTML = '<div style="margin-top:12px">' + then() + '</div>'; }, 900); }

  /* ---------- waste transfer notes that file themselves ---------- */
  function wtnCard() {
    var d = D(), miss = wtnMissing(), filed = S().jobs.filter(function (j) { return j.wtn === 'received'; }).slice(-3).reverse();
    return '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('mail') + 'Waste transfer notes file themselves</h2><span class="tag ok hide-sm">' + ic('check') + 'Inbox linked (sample)</span><button class="btn sm" data-act="wtnPull">' + ic('refresh') + 'Check the inbox now</button></div><div class="bd">' +
      '<p style="margin:0 0 10px;font-size:13.5px">When a supplier emails a waste transfer note, it is picked up from your inbox, read, matched to the job and filed. You do nothing.</p>' +
      filed.map(function (j) { var su = CS.sup(j.sup); return '<div class="rowline"><span class="tag ok">' + ic('certificate') + 'Filed</span><div class="bd"><b>' + h(su.name) + ' · ' + j.id + '</b><small>' + h(CS.jobDesc(j)) + ' · net ' + (Math.round(CS.tonnes(j) * 100) / 100) + ' t · read from their email</small></div><button class="btn sm" data-act="viewWtn" data-id="' + j.id + '">' + ic('eye') + '<span class="hide-sm">View</span></button></div>'; }).join('') +
      '<div class="sec" style="margin-top:14px"><h3>Not back after ' + d.wtnAsk + ' days <span class="muted">' + miss.length + '</span></h3><div class="seg">' + [7, 14].map(function (n) { return '<button data-act="wtnAsk" data-v="' + n + '" class="' + (d.wtnAsk === n ? 'on' : '') + '">' + (n / 7) + ' week' + (n > 7 ? 's' : '') + '</button>'; }).join('') + '</div></div>' +
      (miss.length ? miss.map(function (j) { var su = CS.sup(j.sup); return '<div class="rowline"><span class="tag bad">' + (-j.day) + ' days</span><div class="bd"><b>No note from ' + h(su.name) + ' for ' + j.id + '. Want to chase?</b><small>' + h(CS.jobDesc(j)) + ' at ' + h(CS.cust(j.cust).name) + (j.wtn === 'chased' ? ' · already chased once' : '') + '</small></div><button class="btn sm pri" data-act="chaseWtn" data-id="' + j.id + '">' + ic('whatsapp') + 'Chase</button><button class="btn sm ghost" data-act="wtnLeave" data-id="' + j.id + '">Leave it</button></div>'; }).join('')
        : '<div class="empty" style="padding:14px">' + ic('circle-check') + 'Every note older than that is back.</div>') + '</div></div>';
  }

  /* ---------- customers: what each one is worth ---------- */
  function worth() {
    var rows = S().customers.map(function (c) {
      var js = S().jobs.filter(function (j) { return j.cust === c.id; }), sell = js.reduce(function (a, j) { return a + j.sell; }, 0), cost = js.reduce(function (a, j) { return a + j.cost; }, 0);
      var k = 5 + hash(c.id + c.name) % 6, base = 600 + hash(c.name) % 2400, rev = Math.round((sell * k + base) / 10) * 10, pc = sell ? (sell - cost) / sell : 0.22 + (hash(c.id) % 8) / 100;
      return { c: c, jobs: js.length * k + 2 + hash(c.id) % 5, rev: rev, profit: Math.round(rev * pc / 10) * 10, pc: Math.round(pc * 100) };
    }).sort(function (a, b) { return b.profit - a.profit; });
    var tot = rows.reduce(function (a, r) { return a + r.profit; }, 0), totR = rows.reduce(function (a, r) { return a + r.rev; }, 0), top = rows.slice(0, 3).reduce(function (a, r) { return a + r.profit; }, 0), mx = rows[0] ? rows[0].profit : 1;
    return '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('pound') + 'What each customer is worth</h2><span class="tag hide-sm">Last 12 months</span></div><div class="bd" style="padding-bottom:6px"><p style="margin:0 0 6px;font-size:13.5px">' + money(totR) + ' of sales and <b>' + money(tot) + ' of profit</b> across ' + rows.length + ' customers. Your top 3 bring in ' + Math.round(top / Math.max(1, tot) * 100) + '% of the profit.</p></div>' +
      '<div class="tw"><table class="t"><thead><tr><th>Customer</th><th class="r hide-sm">Jobs</th><th class="r">Revenue</th><th class="r">Profit</th><th class="r hide-sm">Margin</th><th class="hide-md" style="width:22%">Share of profit</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="click" data-act="openCust" data-id="' + r.c.id + '"><td><b>' + h(r.c.name) + '</b><small>' + h(r.c.type) + '</small></td><td class="r num hide-sm">' + r.jobs + '</td><td class="r num">' + money(r.rev) + '</td><td class="r num"><b>' + money(r.profit) + '</b></td><td class="r hide-sm"><span class="tag ' + (r.pc >= 20 ? 'ok' : r.pc >= 12 ? 'amber' : 'bad') + '">' + r.pc + '%</span></td><td class="hide-md"><div class="meter"><i style="width:' + Math.round(r.profit / mx * 100) + '%"></i></div></td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  }

  /* ---------- sales: a pipeline you can drag ---------- */
  var STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['quoted', 'Quoted'], ['trial', 'First job'], ['won', 'Account opened']];
  function deal(l) {
    var n = hash(l.id + l.company);
    if (!l.phone) l.phone = '07700 900' + (400 + n % 500);
    if (!l.email) l.email = first(l.contact).toLowerCase() + '@' + l.company.toLowerCase().replace(/ and /g, '').replace(/[^a-z]+/g, '') + '.co.uk';
    return l;
  }
  function pipeHTML() {
    return '<div class="card pad" style="margin-bottom:12px;padding-bottom:12px"><div class="row" style="flex-wrap:wrap"><h2 style="flex:1;min-width:200px">' + ic('trending-up') + 'Pipeline</h2><span class="muted" style="font-size:12.5px">Drag a deal to move it on. WhatsApp or email straight from the card.</span></div></div>' +
      '<div class="pipe dragp">' + STAGES.map(function (st) {
        var ls = S().leads.filter(function (l) { return l.stage === st[0]; }), val = ls.reduce(function (a, l) { return a + l.value; }, 0);
        return '<div class="bcol" data-stage="' + st[0] + '"><div class="bh">' + st[1] + '<span class="n">' + ls.length + (val ? ' · ' + money(val) : '') + '</span></div><div class="bb">' + ls.map(function (l) {
          deal(l);
          return '<div class="lc" draggable="true" role="button" tabindex="0" data-act="openLead" data-id="' + l.id + '"><b>' + h(l.company) + '</b><small>' + h(l.contact) + ' · ' + h(l.phone) + '</small><small>' + ic('map-pin') + h(l.area) + ' · ~' + money(l.value) + '/mo · ' + h(l.source) + '</small>' +
            (l.next != null && st[0] !== 'won' ? '<span class="due ' + (l.next < 0 ? 'late' : l.next === 0 ? 'today' : '') + '">' + ic('calendar') + ' ' + (l.next < 0 ? (-l.next) + ' days late' : CS.fmtDay(l.next)) + ': ' + h(l.nextWhat) + '</span>' : '') +
            '<span class="lcb"><button class="btn sm" data-act="dealMsg" data-id="' + l.id + '" data-v="wa" aria-label="WhatsApp ' + h(l.contact) + '">' + ic('whatsapp') + 'WhatsApp</button><button class="btn sm" data-act="dealMsg" data-id="' + l.id + '" data-v="email" aria-label="Email ' + h(l.contact) + '">' + ic('mail') + 'Email</button></span></div>';
        }).join('') + (ls.length ? '' : '<div class="empty" style="padding:14px 6px;font-size:12.5px">Drop a deal here</div>') + '</div></div>';
      }).join('') + '</div>';
  }
  function salesView(old) {
    var a = old.indexOf('<div class="grid g4 kpis"'), b = old.indexOf('<div class="pipe">');
    if (a < 0 || b < 0) return old;
    return old.slice(0, a) + pipeHTML() + '<div style="height:16px"></div>' + old.slice(a, b);
  }
  function setStage(id, st) {
    var l = CS.lead(id); if (!l || l.stage === st) return false;
    l.stage = st; l.last = 0; l.lastWhat = 'Moved to ' + STAGES.filter(function (x) { return x[0] === st; })[0][1]; if (st === 'won') { S().sam.accounts++; l.next = null; }
    CS.commit(); H.toast(h(l.company) + ' moved to ' + STAGES.filter(function (x) { return x[0] === st; })[0][1], 'arrow-right'); return true;
  }
  W.setStage = setStage;

  /* ---------- for the presenter guide ---------- */
  W.gemma = function () {
    var s = S(), t = s.threads.filter(function (x) { return x.party.type === 'customer' && x.party.id === 'c7' && !x.done && CS.needsYou(x); })[0];
    if (!t) {
      var i = -1; s.live.forEach(function (L, k) { if (k >= (s.liveIdx || 0) && L.party && L.party.id === 'c7') i = k; });
      var L = i >= 0 ? s.live.splice(i, 1)[0] : { party: { type: 'customer', id: 'c7' }, ch: 'email', subject: 'Grab for the Wells site', text: 'Hi John,\n\nCan we get a grab lorry to take clean soil from the Wells site NR23 on Monday? How much would that be?\n\nThanks, Gemma' };
      t = CS.incoming(L); t.fresh = false; CS.commit();
    }
    return t.id;
  };
  W.onSite = onSite; W.warnings = warnings; W.todo = todo; W.order = function () { return O; }; W.calc = function () { return O ? ordCalc() : null; };
  W.x = { hb: hb, docs: docs, onSite: onSite, eta: eta, contact: contact, track: track, movesOn: movesOn, warnings: warnings, dateOf: dateOf, weeks: weeks, inWords: inWords, hash: hash, first: first, cap: cap, D: D, itemOf: itemOf, descOf: descOf, raiseLater: raiseLater,
    order: function (pre) { H.A.closeSide(); freshOrder(pre); ordDraw(); } };

  /* ---------- wiring ---------- */
  W.init = function (o) {
    H = o; var A = H.A, V = H.V, X = window.CACX; D();
    X.guide = guide;
    X.todoCount = function () { return todo().length; };
    V.home = homeView;
    V.jobs = function () {
      var tab = H.ui.jobTab === 'skips' ? 'skips' : 'live', tabs = [['live', 'Live jobs today'], ['skips', 'Skips on site']];
      return '<div class="row" style="flex-wrap:wrap;margin-bottom:14px"><div class="seg" id="jobTabs">' + tabs.map(function (x) { return '<button data-act="jobTab" data-v="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><span class="sp"></span><button class="btn" data-act="go" data-v="orders">' + ic('calendar') + 'Order diary</button><button class="btn pri" data-act="newOrder">' + ic('plus') + 'New order</button></div>' +
        (tab === 'skips' ? skipsView() : liveView());
    };
    var supV = V.suppliers; V.suppliers = function () { return hbView(supV()); };
    var pbV = V.pricebook; V.pricebook = function () { return '<div class="row" style="margin-bottom:12px"><button class="btn sm" data-act="go" data-v="suppliers">' + ic('chevron-left') + 'Supplier handbook</button><span class="muted" style="font-size:13px">Your own selling prices. Set once, then every quote uses them.</span></div>' + pbV(); };
    var papV = V.paperwork; V.paperwork = function () { return wtnCard() + papV(); };
    var custV = V.customers; V.customers = function () { return custV() + '<div style="height:16px"></div>' + worth(); };
    var salesV = V.sales; V.sales = function () { return salesView(salesV()); };

    A.jobTab = function (el) { H.closeLayer(); H.ui.jobTab = el.dataset.v; if (H.ui.view !== 'jobs') H.go('jobs'); else H.render(); };
    A.askEta = function (el) { var j = CS.job(el.dataset.id), su = CS.sup(j.sup), t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa'); CS.addMsg(t, 'out', 'Hi ' + su.contact + ', have you got an ETA for ' + j.id + ' at ' + CS.jobSite(j).pc + ' please? Thanks, John (CAC)', { by: 'John' }); CS.saved(2); CS.commit(); H.toast('Asked ' + h(su.name) + ' for an ETA on ' + j.id + '. Their answer lands in the inbox.', 'whatsapp'); };
    A.skCollect = function (el) { var j = CS.job(el.dataset.id), su = CS.sup(j.sup); j.status = 'collection'; j.colDay = CS.wd(1); CS.jobLog(j, 'Collection booked for ' + CS.fmtDay(j.colDay)); var t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa'); CS.addMsg(t, 'out', 'Hi ' + su.contact + ', please collect ' + j.id + ' at ' + CS.jobSite(j).pc + ' ' + CS.dayPhrase(j.colDay) + '. Thanks, John (CAC)', { by: 'John' }); CS.saved(4); CS.commit(); H.toast('Collection booked with ' + h(su.name) + ' for ' + CS.fmtDay(j.colDay), 'archive'); };

    A.newOrder = function (el) { H.A.closeSide(); freshOrder(el && el.dataset && el.dataset.cust ? { cust: el.dataset.cust, cname: CS.cust(el.dataset.cust).contact, cphone: CS.cust(el.dataset.cust).phone } : null); ordDraw(); };
    A.ordSvc = function (el) { O.svc = el.dataset.v; O.qty = ''; O.sup = null; O.sell = null; ordDraw(); };
    A.ordSize = function (el) { O.size = Number(el.dataset.v); O.sup = null; O.sell = null; ordDraw(); };
    A.ordDay = function (el) { O.day = Number(el.dataset.v); ordDraw(); };
    A.ordTime = function (el) {
      if (el.dataset.v === '__custom') { O.timeC = O.timeC || true; O.time = typeof O.timeC === 'string' ? O.timeC : 'Any time'; ordDraw(); var f = q('#ordTimeC'); if (f) f.focus(); return; }
      O.timeC = false; O.time = el.dataset.v; ordDraw();
    };
    A.ordMat = function (el) { O.mat = O.mat === el.dataset.v ? '' : el.dataset.v; ordDraw(); };
    A.ordSup = function (el) { O.sup = el.dataset.v; O.sell = null; ordRes(); };
    A.ordPay = function (el) { O.pay = el.dataset.v; ordRes(); };
    A.ordInv = function (el) { O.inv = el.dataset.v === 'later' ? 'later' : 'now'; ordRes(); };
    A.ordSend = function () { O.send = 'email'; ordRes(); };
    A.ordPick = function () {
      var i = q('#ordDate'); if (!i) return;
      try { if (typeof i.showPicker === 'function') { i.showPicker(); return; } } catch (e) {}
      var w = i.parentNode; if (w) w.classList.add('open'); i.removeAttribute('tabindex'); try { i.focus(); } catch (e2) {}
    };
    A.ordPlace = function () { place(); };
    A.ordView = function (el) { var j = CS.job(el.dataset.id); if (!j) return; H.modal('Order confirmation ' + j.id, ordDoc(j), '<button class="btn" data-act="openJob" data-id="' + j.id + '">' + ic('truck') + 'Open the job</button><span class="sp"></span><button class="btn pri" data-act="close">Close</button>'); };
    var att = A.att; A.att = function (el) { if (el.dataset.t === 'order') return A.ordView({ dataset: { id: el.dataset.job } }); if (el.dataset.t === 'inv' && CS.inv(el.dataset.job)) return A.openInv({ dataset: { id: el.dataset.job } }); return att(el); };

    A.gYes = function (el) { gset(el.dataset.id, function (g) { g.step = 2; g.pick = false; }); };
    A.gNo = function (el) { gset(el.dataset.id, function (g) { g.pick = true; }); };
    A.gNoBack = function (el) { gset(el.dataset.id, function (g) { g.pick = false; }); };
    A.gDay = function (el) { gset(el.dataset.id, function (g, t) { t.dayOverride = Number(el.dataset.v); t.edits = null; g.pick = false; g.step = 2; }); H.toast('Date moved. The reply and the supplier booking both say ' + CS.fmtDay(Number(el.dataset.v)) + '.', 'calendar'); };
    A.gPrice = function (el) { gset(el.dataset.id, function (g) { g.step = Math.max(g.step, 1) + 1; }); };
    A.gStep = function (el) { gset(el.dataset.id, function (g, t) { g.step = Number(el.dataset.v); g.pick = false; if (g.step === 1 && t.dayOverride != null) { delete t.dayOverride; t.edits = null; } }); };
    A.gBook = function (el) {
      var t = CS.thread(el.dataset.id), An = CS.analyse(t), c = CS.cust(t.party.id), edits = {};
      Array.prototype.forEach.call(document.querySelectorAll('textarea[data-draft][data-id="' + t.id + '"]'), function (ta) { edits[ta.dataset.draft] = ta.value; });
      var before = S().counters.job, steps = CS.approve(t.id, edits), ids = [];
      for (var n = before; n < S().counters.job; n++) ids.push('CAC-' + n);
      if (!ids.length) { H.ui.justDone[t.id] = { steps: steps, mins: An.mins || 1, job: null }; H.render(); return; }
      var inv = CS.nextId('inv', 'INV-'), card = /card/i.test(c.terms);
      S().invoices.unshift({ id: inv, cust: c.id, amount: An.sell, issued: 0, due: card ? 0 : 30, status: 'unpaid', jobs: ids, pay: card ? 'link' : 'account' });
      ids.forEach(function (id) { CS.jobLog(CS.job(id), 'Invoiced on ' + inv); });
      CS.addMsg(t, 'out', 'Order confirmation and invoice ' + inv + ' attached' + (card ? ', you can pay by card with the link on the invoice.' : ', on your ' + c.terms.toLowerCase() + '.'), { by: An.owner === 'sam' ? CS.bde() : 'John', att: ids.map(function (id) { return { n: 'Order-confirmation-' + id + '.pdf', t: 'order', job: id }; }).concat([{ n: inv + '.pdf', t: 'inv', job: inv }]) });
      steps.push('Invoice ' + inv + ' and the order confirmation sent to ' + c.first);
      CS.feed('Invoice ' + inv + ' raised and sent to ' + c.name, 'receipt'); CS.saved(5); delete t.g; CS.commit();
      H.ui.justDone[t.id] = { steps: steps, mins: (An.mins || 9) + 5, job: ids[0] }; H.ui.flash = ids[0];
      H.toast('Booked. ' + ids.join(', ') + ' with the supplier, invoice and confirmation with ' + h(c.first) + '.', 'circle-check'); H.render();
    };

    A.assistant = function () { H.A.closeSide(); assistant(); };
    A.homeArrange = function () { H.ui.arrange = !H.ui.arrange; H.render(); };
    A.tileMove = function (el) { var a = D().home, i = a.indexOf(el.dataset.v), j = i + Number(el.dataset.d); if (i < 0 || j < 0 || j >= a.length) return; a.splice(i, 1); a.splice(j, 0, el.dataset.v); CS.save(); H.render(); };
    A.tileHide = function (el) { var d = D(); d.home = d.home.filter(function (k) { return k !== el.dataset.v; }); if (d.hidden.indexOf(el.dataset.v) < 0) d.hidden.push(el.dataset.v); CS.save(); H.render(); };
    A.tileShow = function (el) { var d = D(); d.hidden = d.hidden.filter(function (k) { return k !== el.dataset.v; }); d.home.push(el.dataset.v); CS.save(); H.render(); };

    var openSup = A.openSup; A.openSup = function (el) { openSup(el); var su = CS.sup(el.dataset.id), b = document.querySelector('#layer .drawer .dbd'); if (su && b && !q('#hbk')) b.insertAdjacentHTML('afterbegin', hbBlock(su)); };
    function reSup(id) { A.openSup({ dataset: { id: id } }); }
    A.hbAsk = function (el) {
      var su = CS.sup(el.dataset.id), d = docs(su).filter(function (x) { return x.k === el.dataset.k; })[0], t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa');
      CS.addMsg(t, 'out', 'Hi ' + su.contact + ', our records show your ' + d.n.toLowerCase() + ' ' + d.no + ' runs out on ' + dateOf(d.exp) + '. Can you send the new one over when it comes through? Thanks, John (CAC)', { by: 'John' });
      hb(su).asked[d.k] = true; su.checked = true; CS.saved(3); CS.commit(); H.toast('Asked ' + h(su.name) + ' for the new ' + h(d.n.toLowerCase()) + '.', 'shield-check'); if (document.querySelector('#layer .drawer')) reSup(su.id);
    };
    A.hbPrices = function (el) { var su = CS.sup(el.dataset.id); H.modal('Price sheet from ' + h(su.name), '<p style="margin:0 0 12px;font-size:13.5px">Upload the spreadsheet or PDF they sent. Every price is read and shown next to what you have now, so you can check it before it saves.</p>' + upBox('hbFile', 'Choose their price sheet', 'Use a sample sheet', 'hbPriceSample', su.id), null, true); };
    A.hbPriceSample = function (el) { var su = CS.sup(el.dataset.id); reading('Reading ' + su.name + '\'s prices...', function () { return priceReview(su); }); };
    A.hbPriceSave = function () {
      var rv = W._rev; if (!rv) return; var su = CS.sup(rv.id), ch = 0; su.rates = JSON.parse(JSON.stringify(su.rates));
      rv.rows.forEach(function (r) { if (r.nv === r.v) return; ch++; if (r.k == null) su.rates[r.svc] = r.nv; else su.rates[r.svc][r.k] = r.nv; });
      var x = hb(su); x.fuel = rv.fuel; x.pricesAt = Date.now(); W._rev = null;
      CS.feed(su.name + ' price sheet read in, ' + ch + ' prices changed', 'warehouse'); CS.saved(20); CS.commit(); H.closeLayer();
      H.toast(h(su.name) + '\'s price list is updated. ' + ch + ' prices changed, fuel surcharge now ' + x.fuel + '%. New quotes use them straight away.', 'warehouse', { act: 'openSup', id: su.id, label: 'Open' });
    };
    A.hbDoc = function (el) { var su = CS.sup(el.dataset.id); H.modal('Licence or insurance from ' + h(su.name), '<p style="margin:0 0 12px;font-size:13.5px">Upload the certificate. The number and the end date are read off it, and you get a reminder before it runs out.</p>' + upBox('hbDocFile', 'Choose the document', 'Use a sample certificate', 'hbDocSample', su.id), null, false); };
    A.hbDocSample = function (el) {
      var su = CS.sup(el.dataset.id), d = docs(su).filter(function (x) { return x.exp != null; }).sort(function (a, b) { return a.exp - b.exp; })[0];
      reading('Reading the certificate...', function () { var ne = d.exp + (d.k === 'lic' ? 1095 : 365); W._doc = { id: su.id, k: d.k, exp: ne };
        return '<dl class="kv"><dt>Document</dt><dd>' + h(d.n) + '</dd><dt>Number</dt><dd>' + h(d.no) + '</dd><dt>Ends</dt><dd>' + dateOf(ne) + '</dd></dl><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="hbDocSave">' + ic('check') + 'Right, save it</button></div>'; });
    };
    A.hbDocSave = function () { var dd = W._doc; if (!dd) return; var su = CS.sup(dd.id); if (dd.k === 'lic') su.licExp = dd.exp; else hb(su).insExp = dd.exp; delete hb(su).asked[dd.k]; W._doc = null; CS.feed('New certificate filed for ' + su.name, 'shield-check'); CS.commit(); H.closeLayer(); H.toast('Filed. ' + h(su.name) + ' is in date until ' + dateOf(dd.exp) + ', and you get a reminder before then.', 'shield-check'); };
    A.hbWtn = function (el) { var su = CS.sup(el.dataset.id); H.modal('Set up ' + h(su.name) + '\'s waste transfer note', '<p style="margin:0 0 12px;font-size:13.5px">You do this once per supplier. Upload one of their notes. The system shows you what it thinks each part is, you put right anything it got wrong, and from then on every note from them is read the same way.</p>' + upBox('hbWtnFile', 'Choose one of their notes', 'Use a sample note', 'hbWtnSample', su.id), null, true); };
    A.hbWtnSample = function (el) { var su = CS.sup(el.dataset.id); reading('Reading the note...', function () { return wtnReview(su); }); };
    A.hbWtnSave = function (el) {
      var sel = document.querySelectorAll('#layer select[data-wmap]'), empty = Array.prototype.filter.call(sel, function (s) { return !s.value; })[0];
      if (empty) { empty.focus(); H.toast('Two weights still need an answer. Pick what each one is.', 'alert'); return; }
      var su = CS.sup(el.dataset.id); D().wtnMap[su.id] = true; CS.feed('Waste transfer note set up for ' + su.name, 'certificate'); CS.commit(); H.closeLayer();
      H.toast('Saved. Every waste transfer note from ' + h(su.name) + ' now reads itself and files against the job.', 'certificate');
    };

    A.wtnAsk = function (el) { D().wtnAsk = Number(el.dataset.v); CS.save(); H.render(); };
    A.wtnLeave = function (el) { CS.job(el.dataset.id).wtnLeave = true; CS.commit(); H.toast('Left. It won\'t ask about that one again.', 'check'); };
    A.wtnPull = function () {
      H.toast('Checking the inbox for waste transfer notes...', 'refresh');
      setTimeout(function () {
        var j = S().jobs.filter(function (x) { return x.wtn === 'missing' || x.wtn === 'chased'; }).sort(function (a, b) { return a.day - b.day; })[0];
        if (!j) { H.toast('Nothing new. Every note that has arrived is filed.', 'circle-check'); return; }
        var su = CS.sup(j.sup); j.wtn = 'received'; CS.jobLog(j, 'WTN picked up from the inbox, read and filed'); CS.feed('WTN from ' + su.name + ' read from the inbox and filed against ' + j.id, 'certificate'); CS.saved(6); CS.commit();
        H.toast('Found 1 from ' + h(su.name) + '. Read it, net ' + (Math.round(CS.tonnes(j) * 100) / 100) + ' t, filed against ' + j.id + '.', 'certificate', { act: 'viewWtn', id: j.id, label: 'View' });
      }, 1100);
    };

    var openLead = A.openLead; A.openLead = function (el) {
      openLead(el); var l = CS.lead(el.dataset.id), b = document.querySelector('#layer .drawer .dbd'); if (!l || !b) return; deal(l);
      b.insertAdjacentHTML('afterbegin', '<div class="rowline"><div class="bd"><b>' + h(l.contact) + '</b><small>' + h(l.phone) + ' · ' + h(l.email) + '</small><small>' + ic('map-pin') + 'Site area: ' + h(l.area) + '</small></div><button class="btn sm" data-act="dealMsg" data-id="' + l.id + '" data-v="wa">' + ic('whatsapp') + 'WhatsApp</button><button class="btn sm" data-act="dealMsg" data-id="' + l.id + '" data-v="email">' + ic('mail') + 'Email</button></div>' +
        '<div class="field" style="margin-top:10px"><label>Stage</label><div class="chips">' + STAGES.map(function (s) { return '<button class="pk sm' + (l.stage === s[0] ? ' on' : '') + '" data-act="dealStage" data-id="' + l.id + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div></div>');
    };
    A.dealStage = function (el) { if (setStage(el.dataset.id, el.dataset.v)) A.openLead({ dataset: { id: el.dataset.id } }); };
    A.dealMsg = function (el) {
      var l = deal(CS.lead(el.dataset.id)), ch = el.dataset.v, by = l.stage === 'new' ? 'thanks for getting in touch' : 'just following up';
      var text = ch === 'email' ? 'Hi ' + first(l.contact) + ',\n\n' + cap(by) + ' about ' + (l.nextWhat ? l.nextWhat.toLowerCase().replace(/^(send|follow up|chase) /, '') : 'your sites') + ' around ' + l.area + '. When is a good time for a quick call this week?\n\nThanks, John\nCAC Waste Management' : 'Hi ' + first(l.contact) + ', John at CAC here, ' + by + '. When is a good time for a quick call this week?';
      H.modal((ch === 'email' ? 'Email ' : 'WhatsApp ') + h(l.contact), '<p class="muted" style="margin:0 0 8px;font-size:13px">To ' + h(ch === 'email' ? l.email : l.phone) + ' · ' + h(l.company) + '</p><div class="field"><label for="dealText">Message</label><textarea id="dealText" rows="' + (ch === 'email' ? 7 : 4) + '">' + h(text) + '</textarea></div>',
        '<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="dealSend" data-id="' + l.id + '" data-v="' + ch + '">' + ic('send') + 'Send</button>');
      setTimeout(function () { var x = q('#dealText'); if (x) x.focus(); }, 60);
    };
    A.dealSend = function (el) {
      var l = CS.lead(el.dataset.id), ch = el.dataset.v, text = (q('#dealText') || {}).value || ''; if (!text.trim()) { H.toast('Write a message first', 'alert'); return; }
      var t = CS.threadFor({ type: 'lead', id: l.id }, ch === 'email' ? 'email' : 'wa'); if (ch === 'email' && !t.subject) t.subject = 'CAC Waste Management';
      CS.addMsg(t, 'out', text, { by: 'John' }); t.done = true; l.last = 0; l.lastWhat = (ch === 'email' ? 'Email' : 'WhatsApp') + ' sent'; if (l.stage === 'new') l.stage = 'contacted'; l.next = CS.wd(2); l.nextWhat = 'Follow up the ' + (ch === 'email' ? 'email' : 'WhatsApp');
      CS.saved(4); CS.commit(); H.closeLayer(); H.toast((ch === 'email' ? 'Emailed ' : 'WhatsApp sent to ') + h(l.contact) + '. Logged on the deal, follow up set for ' + CS.fmtDay(l.next) + '.', ch === 'email' ? 'mail' : 'whatsapp');
    };

    /* form fields */
    document.addEventListener('input', function (e) {
      var el = e.target;
      if (O && document.querySelector('#layer #ordL')) {
        if (el.id === 'ordNew') O.newName = el.value;
        if (el.id === 'ordAddr') O.addr = el.value;
        if (el.id === 'ordHouse') O.house = el.value;
        if (el.id === 'ordEmail') O.email = el.value;
        if (el.id === 'ordTown') O.town = el.value;
        if (el.id === 'ordPc') { O.pc = el.value; O.sup = null; O.sell = null; ordRes(); pcLook(); }
        if (el.id === 'ordCn') O.cname = el.value;
        if (el.id === 'ordCp') O.cphone = el.value;
        if (el.id === 'ordNote') O.note = el.value;
        if (el.id === 'ordPo') O.po = el.value;
        if (el.id === 'ordTimeC') { O.timeC = el.value || true; O.time = el.value.trim() || 'Any time'; }
        if (el.id === 'ordQty') { O.qty = el.value; O.sell = null; ordRes(); }
      }
    });
    document.addEventListener('change', function (e) {
      var el = e.target;
      if (el.id === 'ordCust') { O.cust = el.value; O.sup = null; O.sell = null; O.stopOk = false; var c = ordCust(); O.site = c ? 0 : 'other'; if (c) { O.cname = c.contact; O.cphone = c.phone; O.pay = /card/i.test(c.terms) ? 'card' : 'account'; } else { O.cname = ''; O.cphone = ''; O.pay = 'card'; } ordDraw(); }
      if (el.id === 'ordSite') { O.site = el.value === 'other' ? 'other' : Number(el.value); O.sup = null; O.sell = null; ordDraw(); }
      if (el.id === 'ordDate' && O && document.querySelector('#layer #ordL')) { var off = offOf(el.value); if (off != null && off >= 0 && off <= 730) { O.day = off; ordDraw(); } }
      if (el.id === 'ordSell') { var v = parseFloat(String(el.value).replace(/[^\d.]/g, '')); if (!isNaN(v)) { O.sell = v; ordRes(); } }
      if (el.id === 'hbHire') { CS.sup(el.dataset.id).hireDays = Number(el.value); CS.commit(); H.toast('Hire period saved. Skips on site follows it.', 'check'); }
      if (el.id === 'hbFuel') { var f = parseFloat(el.value); if (!isNaN(f) && f >= 0) { hb(CS.sup(el.dataset.id)).fuel = f; CS.commit(); H.toast('Fuel surcharge saved.', 'check'); } }
      if (el.id === 'hbFile') A.hbPriceSample(el);
      if (el.id === 'hbDocFile') A.hbDocSample(el);
      if (el.id === 'hbWtnFile') A.hbWtnSample(el);
      if (el.dataset && el.dataset.wmap != null) { var row = el.closest('.wmap'); if (row && el.value) row.classList.remove('ask'); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('lc') && e.target === document.activeElement) { e.preventDefault(); A.openLead(e.target); }
    });

    /* drag and drop: home tiles and pipeline deals */
    document.addEventListener('dragstart', function (e) {
      var t = e.target.closest ? e.target.closest('.tile[data-tile], .lc[draggable]') : null; if (!t) return;
      drag = t.classList.contains('tile') ? { k: 'tile', id: t.getAttribute('data-tile') } : { k: 'deal', id: t.getAttribute('data-id') };
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.id); } catch (er) {}
      setTimeout(function () { t.classList.add('dragging'); }, 0);
    });
    function over(e) { if (!drag || !e.target.closest) return null; return drag.k === 'tile' ? e.target.closest('.tile[data-tile]') : e.target.closest('.bcol[data-stage]'); }
    function clear() { Array.prototype.forEach.call(document.querySelectorAll('.dropon'), function (x) { x.classList.remove('dropon'); }); }
    document.addEventListener('dragover', function (e) { var t = over(e); if (!t) return; e.preventDefault(); if (!t.classList.contains('dropon')) { clear(); t.classList.add('dropon'); } });
    document.addEventListener('drop', function (e) {
      var t = over(e); if (!t || !drag) return; e.preventDefault(); var d = drag; drag = null; clear();
      if (d.k === 'tile') { var to = t.getAttribute('data-tile'); if (to === d.id) { H.render(); return; } var a = D().home, from = a.indexOf(d.id), dest = a.indexOf(to); a.splice(from, 1); a.splice(dest, 0, d.id); CS.save(); H.render(); }
      else if (!setStage(d.id, t.getAttribute('data-stage'))) H.render();
    });
    document.addEventListener('dragend', function () { drag = null; clear(); Array.prototype.forEach.call(document.querySelectorAll('.dragging'), function (x) { x.classList.remove('dragging'); }); });
    if (window.CACV3) window.CACV3.init(H);
  };
})();
