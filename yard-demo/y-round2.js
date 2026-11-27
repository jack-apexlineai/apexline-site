/* Round two: where each lorry is heading under the map, quotes at the standard or a custom price, the day plan in
   time windows with access notes and service colours, extra weight and grab weight charges in Money with their own
   chasing list, and a yard day summary. Sample data in this browser only. Nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit, O = window.DSGY4, T = window.DSGY3;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && K && O && T && window.DSGY5 && window.DSGWHEEL)) { if ((tries || 0) < 300) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc, money = CS.money;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    var toast = K.toast, plural = K.plural, modal = K.modal, save = K.save;

    /* ---------- a customer site at GU22 8BA, for the postcode-first booking ---------- */
    (function () {
      var s = S(); if (s.customers.some(function (c) { return c.id === 'c15'; })) return;
      s.customers.push({ id: 'c15', limit: 3000, swapDays: 10, name: 'BBJ Ltd', contact: 'Ben Jarvis', first: 'Ben', phone: '07700 900466', email: 'ben@bbjltd.co.uk', type: 'Builders', terms: '30 day account', owner: 'ellie', sites: [{ name: '15 Sandy Lane, Maybury', pc: 'GU22 8BA' }, { name: 'Old Woking Road unit, Pyrford', pc: 'GU22 8LT' }] });
      save();
    })();

    /* ======================================================================
       LIVE TRACKING: where each lorry is, and where it is heading
       ====================================================================== */
    function pcOf(j) { return j ? j.site.pc : ''; }
    function heading(l) {
      var y = Y(), w = YC.where(y, l.id), L = YC.forLorry(y, l.id, 0), act = YC.active(L), done = L.filter(function (j) { return j.status === 'done'; }).sort(function (a, b) { return (a.at.done || 0) - (b.at.done || 0); }), last = done[done.length - 1];
      var now = '', to = '', eta = null;
      if (w.state === 'onway') { now = 'On the road'; to = 'On way to ' + pcOf(w.job) + ' (next job)'; eta = YC.etaMins(y, w.job); }
      else if (w.state === 'onsite') { now = 'At ' + pcOf(w.job); var nx = L.filter(function (j) { return j.status === 'planned'; })[0]; to = YC.cashState(w.job) === 'due' ? 'On the job, cash to take' : nx ? 'Next: ' + pcOf(nx) : 'Then back to the yard'; }
      else if (w.state === 'returning') { now = 'On the road'; to = 'On way to yard'; var back = Math.max(0, Math.min(1, (Date.now() - (last.at.done || 0)) / YC.TRAVEL)), dx = (last.lat - YC.YARD.lat) * 111, dy = (last.lng - YC.YARD.lng) * 67; eta = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy) * 1.6 * (1 - back))); }
      else if (w.state === 'between') { now = 'At ' + pcOf(last); to = act ? 'On way to ' + pcOf(act) + ' (next job) soon' : 'On way to yard'; }
      else if (w.state === 'home') { now = 'At the yard'; to = 'Day done'; }
      else { now = 'At the yard'; to = act ? 'Next: ' + pcOf(act) + ', ' + K.winLabel(act) : 'Nothing booked yet'; }
      return { now: now, to: to, eta: eta, road: now === 'On the road' };
    }
    function listHTML() {
      return YC.LORRIES.map(function (l) {
        var x = heading(l), c = T.col(l.id);
        return '<div class="ylt-hr' + (ui.y2Sel === l.id ? ' on' : '') + '" style="--lc:' + c + '" data-act="y2Col" data-v="' + l.id + '"><span class="yplate yx">' + h(l.reg) + '</span><span class="ylt-now' + (x.road ? ' road' : '') + '">' + ic(x.road ? 'truck' : 'map-pin') + h(x.now) + '</span><span class="ylt-to">' + h(x.to) + '</span><b class="ylt-eta">' + (x.eta != null ? 'ETA ' + x.eta + ' min' : '') + '</b></div>';
      }).join('');
    }
    var trk = V.tracking;
    V.tracking = function () {
      var html = trk.apply(this, arguments);
      return html.replace('<p class="muted yfoot">', '<section class="card ylt-head" id="yltHead"><div class="yh-rh"><h3>' + ic('route') + 'Where each lorry is heading</h3><span class="livepill"><i></i>Live</span></div><div id="yltList">' + listHTML() + '</div></section><p class="muted yfoot">');
    };
    setInterval(function () { if (ui.view !== 'tracking') return; var b = q('#yltList'); if (b) b.innerHTML = listHTML(); }, 3000);

    /* ======================================================================
       QUOTES: your price list, or a custom price
       ====================================================================== */
    function qst() { return ui.yq || (ui.yq = { pc: '', looked: false, pick: null, cust: '', site: null, oneoff: null, nname: '', nphone: '', ch: 'wa', svc: 'skip', type: 'deliver', size: 8, rsize: 20, loads: 1, place: 'site', permit: true, pmode: 'std', price: null, msg: null }); }
    function qJob(b) { return K.b2Job(b); }
    function qStd(b) { return K.b2Price(b); }
    function qPrice(b) { var p = parseFloat(String(b.price == null ? '' : b.price).replace(/[^\d.]/g, '')); return b.pmode === 'custom' && p > 0 ? p : qStd(b); }
    function qWho(b) { var c = b.cust && CS.cust(b.cust); if (c) return { name: c.contact, first: c.first, co: c.name }; if (b.oneoff) { var o = YC.oneoff(b.oneoff); return { name: o.name, first: o.name.replace(/^(Mrs|Mr|Ms|Miss)\s+/, '').split(' ')[0], co: o.name }; } var n = String(b.nname || '').trim(); return { name: n, first: n.replace(/^(Mrs|Mr|Ms|Miss)\s+/, '').split(' ')[0] || 'there', co: n }; }
    function qSite(b) { var c = b.cust && CS.cust(b.cust); if (c && b.site != null) return c.sites[+b.site]; if (b.oneoff) { var o = YC.oneoff(b.oneoff); return { name: o.site, pc: o.pc }; } return b.pc ? { name: T.addrs(b.pc)[0], pc: b.pc } : null; }
    function qText(b) {
      var w = qWho(b), s = qSite(b), J0 = qJob(b), p = qPrice(b), so = YC.soonest(Y(), K.b2Earliest(b), K.sat());
      var what = J0.type === 'grab' || J0.type === 'muck' ? plural(J0.loads, J0.type === 'grab' ? 'grab load' : 'muckaway load') : 'a ' + J0.size + ' yard ' + (J0.size >= 20 ? 'RoRo' : 'skip');
      return 'Hi ' + w.first + ', ' + what + ' at ' + (s ? s.name.split(',')[0] : 'your site') + ' is ' + money(p) + ' + VAT' + (J0.size && J0.size < 20 ? ', with ' + YC.prices(Y()).hireDays + ' days hire' : '') + (K.b2Permit(b) ? ', including the council permit' : '') + '. Soonest I can do it is ' + K.dayName(so) + '. Want me to book it in? Cheers, Dave';
    }
    function qChips(k, v, opts) { return '<div class="y3chips">' + opts.map(function (o) { return '<button type="button" class="y3c' + (String(v) === String(o[0]) ? ' on' : '') + '" data-act="yqSet" data-k="' + k + '" data-v="' + h(o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
    function qHTML() {
      var b = qst(), M = b.looked ? T.knownSites(b.pc) : [], P = YC.prices(Y()), skipish = b.svc === 'skip' || b.svc === 'roro';
      var o = '<div class="y3"><div class="y3-s"><span class="y3-n">1</span><div class="field"><label for="yqPc">Postcode</label><div class="y3pc"><input id="yqPc" value="' + h(b.pc) + '" placeholder="e.g. GU22 8BA" autocomplete="off" style="text-transform:uppercase"><button type="button" class="btn" data-act="yqFind">' + ic('search') + 'Find</button></div>';
      if (b.looked) o += '<div class="y3sites">' + M.map(function (m) { return '<button type="button" class="y3site' + (b.pick === m.key ? ' on' : '') + '" data-act="yqPick" data-v="' + h(m.key) + '"><b>' + h(m.name) + '</b><small>site ' + h(m.addr.split(',')[0]) + ', ' + h(m.pc) + '</small></button>'; }).join('') + '<button type="button" class="y3site add' + (b.pick === 'new' ? ' on' : '') + '" data-act="yqPick" data-v="new">' + ic('plus') + '<b>New customer</b></button></div>';
      o += '</div></div>';
      if (b.pick === 'new') o += '<div class="ybk2"><div class="field"><label for="yqName">Name</label><input id="yqName" data-yq="nname" value="' + h(b.nname) + '" placeholder="Mrs Jane Smith"></div><div class="field"><label for="yqPhone">Mobile or email</label><input id="yqPhone" data-yq="nphone" value="' + h(b.nphone) + '" placeholder="07700 900000"></div></div>';
      if (b.pick) {
        o += '<div class="y3-s"><span class="y3-n">2</span><div class="field"><label>Service</label>' + qChips('svc', b.svc, [['skip', 'Skip'], ['roro', 'RoRo'], ['grab', 'Grab'], ['muck', 'Muckaway']]) +
          (skipish ? qChips('type', b.type, [['deliver', 'Deliver'], ['exchange', 'Exchange'], ['collect', 'Collect']]) + (b.svc === 'skip' ? qChips('size', b.size, YC.SIZES.map(function (z) { return [z, z + ' yd']; })) : qChips('rsize', b.rsize, YC.RORO_SIZES.map(function (z) { return [z, z + ' yd, ' + P.roro[z].incl + ' t incl']; }))) + (b.type === 'deliver' ? qChips('place', b.place, [['site', 'On the drive or site'], ['road', 'On the road, with a permit']]) : '')
            : qChips('loads', b.loads, [[1, '1 load'], [2, '2 loads'], [3, '3 loads'], [4, '4 loads']])) + '</div></div>' +
          '<div class="y3-s"><span class="y3-n">3</span><div class="field"><label>Price</label>' + qChips('pmode', b.pmode, [['std', 'Standard price ' + money(qStd(b))], ['custom', 'Custom price']]) +
          (b.pmode === 'custom' ? '<div class="yprice"><span>£</span><input id="yqPrice" data-yq="price" inputmode="decimal" value="' + h(b.price != null ? b.price : qStd(b)) + '"><span class="muted">+ VAT</span></div>' : '<small class="muted">From your price list. Change it in Price list.</small>') + '</div></div>' +
          '<div class="y3-s"><span class="y3-n">4</span><div class="field"><label>Send by</label>' + qChips('ch', b.ch, [['wa', 'WhatsApp'], ['email', 'Email']]) + '<textarea id="yqMsg" rows="4">' + h(b.msg != null ? b.msg : qText(b)) + '</textarea></div></div>';
      }
      return o + '</div>';
    }
    function qDraw() { var m = q('#layer .yqm'); if (!m) return; var bd = m.querySelector('.mbd'), sc = bd.scrollTop; bd.innerHTML = qHTML(); bd.scrollTop = sc; var g = q('#yqGo'); if (g) g.disabled = !qst().pick; }
    A.desk = function () { ui.yq = null; qst(); modal(ic('file-text') + ' New quote', qHTML(), '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri lg" data-act="yqGo" id="yqGo" disabled>' + ic('send') + 'Send quote</button>', 'ybkm yqm'); setTimeout(function () { var p = q('#yqPc'); if (p) p.focus(); }, 40); };
    A.yqFind = function () { var b = qst(), p = q('#yqPc'), v = String((p && p.value) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.length < 5) { toast('Put a full postcode in, like GU22 8BA', 'alert'); return; } b.pc = v.slice(0, -3) + ' ' + v.slice(-3); b.looked = true; b.pick = null; var M = T.knownSites(b.pc); if (M.length === 1) qPick(M[0].key); qDraw(); };
    function qPick(key) { var b = qst(); b.pick = key; b.cust = ''; b.site = null; b.oneoff = null; b.msg = null; if (key === 'new') return; var m = T.knownSites(b.pc).filter(function (x) { return x.key === key; })[0]; if (!m) return; if (m.oneoff) b.oneoff = m.cust; else { b.cust = m.cust; b.site = m.site; } }
    A.yqPick = function (el) { qPick(el.dataset.v); qDraw(); };
    A.yqSet = function (el) { var b = qst(), k = el.dataset.k, v = el.dataset.v; b[k] = /^(size|rsize|loads)$/.test(k) ? +v : v; if (k === 'svc' && !(v === 'skip' || v === 'roro')) { b.type = v; b.place = 'site'; } else if (k === 'svc' && (b.type === 'grab' || b.type === 'muck')) b.type = 'deliver'; if (k !== 'ch') b.msg = null; qDraw(); if (k === 'pmode' && v === 'custom') { var i = q('#yqPrice'); if (i) { i.focus(); i.select(); } } };
    document.addEventListener('input', function (e) { var el = e.target; if (!el.closest || !el.closest('.yqm')) return; var b = qst(); if (el.dataset.yq) { b[el.dataset.yq] = el.value; if (el.dataset.yq === 'price') { b.msg = null; var t = q('#yqMsg'); if (t) t.value = qText(b); } } if (el.id === 'yqMsg') b.msg = el.value; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'yqPc') { e.preventDefault(); A.yqFind(); } });
    A.yqGo = function () {
      var b = qst(); if (!b.pick) return; if (b.pick === 'new' && !String(b.nname).trim()) { toast('Put their name in first', 'alert'); return; }
      var s = qSite(b), J0 = qJob(b), id = CS.nextId('quote', 'Q-'), w = qWho(b), p = qPrice(b), t = (q('#yqMsg') || {}).value || qText(b);
      S().quotes.unshift({ id: id, cust: b.cust || null, who: b.cust ? null : w.name, oneoff: b.oneoff, desc: (J0.size ? J0.size + ' yard ' + (J0.size >= 20 ? 'RoRo' : 'skip') : plural(J0.loads, J0.type === 'grab' ? 'grab load' : 'muckaway load')) + ', ' + (s ? s.name.split(',')[0] : b.pc), pc: b.pc, sell: p, priceMode: b.pmode, status: 'sent', day: 0, owner: 'dave', ch: b.ch, text: t, job: J0 });
      CS.save(); A.close(); toast('Quote ' + h(id) + ' for ' + money(p) + ' + VAT sent to ' + h(w.name) + ' by ' + (b.ch === 'wa' ? 'WhatsApp' : 'email') + (b.pmode === 'custom' ? ', custom price' : '') + '. Demo, nothing is sent', 'send');
      if (ui.view === 'quotes') UI.render(); else K.go('quotes');
    };
    V.quotes = function () {
      var L = S().quotes.slice().sort(function (a, b) { return (b.day || 0) - (a.day || 0); }), f = ui.yqF || 'sent', cnt = { sent: 0, won: 0, lost: 0, all: L.length };
      L.forEach(function (x) { if (cnt[x.status] != null) cnt[x.status]++; });
      var show = L.filter(function (x) { return f === 'all' || x.status === f; }), open = L.filter(function (x) { return x.status === 'sent'; });
      function who(x) { var c = x.cust && CS.cust(x.cust); return c ? c.name : x.who || 'Customer'; }
      return '<div class="ykpis three"><div class="card kpi hero"><small>' + ic('file-text') + 'Waiting on an answer</small><b>' + open.length + '</b><span class="d">' + money(open.reduce(function (a, x) { return a + (x.sell || 0); }, 0)) + ' + VAT of work</span></div><div class="card kpi"><small>' + ic('check') + 'Won</small><b>' + cnt.won + '</b><span class="d">booked in</span></div><div class="card kpi"><small>' + ic('x') + 'Lost</small><b>' + cnt.lost + '</b><span class="d">no answer or went elsewhere</span></div></div>' +
        '<div class="ybar"><div class="ychips" style="margin:0">' + [['sent', 'Waiting'], ['won', 'Won'], ['lost', 'Lost'], ['all', 'All']].map(function (x) { return '<button class="ychip' + (f === x[0] ? ' on' : '') + '" data-act="yqF" data-v="' + x[0] + '">' + x[1] + ' <b>' + cnt[x[0]] + '</b></button>'; }).join('') + '</div><span class="sp"></span><button class="btn pri" data-act="desk">' + ic('plus') + 'New quote</button></div>' +
        '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Quote</th><th>Customer</th><th>What</th><th class="r">Price</th><th>Sent</th><th></th></tr></thead><tbody>' + (show.map(function (x) {
          var days = -(x.day || 0); return '<tr><td><b>' + h(x.id) + '</b>' + (x.priceMode === 'custom' ? '<small>Custom price</small>' : '<small>Standard price</small>') + '</td><td>' + h(who(x)) + '</td><td>' + h(x.desc) + '</td><td class="r num"><b>' + money(x.sell) + '</b><small>+ VAT</small></td><td>' + (days ? days + ' day' + (days === 1 ? '' : 's') + ' ago' : 'Today') + (x.chased ? '<small>followed up</small>' : '') + '</td>' +
            '<td class="r"><div class="row" style="justify-content:flex-end;gap:6px;flex-wrap:wrap">' + (x.status === 'sent' ? '<button class="btn sm" data-act="yqChase" data-id="' + x.id + '">' + ic('send') + 'Follow up</button><button class="btn sm pri" data-act="yqWon" data-id="' + x.id + '">' + ic('calendar') + 'Book it</button><button class="btn sm" data-act="yqLost" data-id="' + x.id + '">Lost</button>' : '<span class="tag ' + (x.status === 'won' ? 'ok' : '') + '">' + (x.status === 'won' ? 'Won' : x.status === 'lost' ? 'Lost' : h(x.status)) + '</span>') + '</div></td></tr>';
        }).join('') || '<tr><td colspan="6" class="muted">Nothing here.</td></tr>') + '</tbody></table></div></div><p class="muted yfoot">Every quote is at your standard price from the price list, or a custom price you type when you agree one.</p>';
    };
    A.yqF = function (el) { ui.yqF = el.dataset.v; UI.render(); };
    function qBy(id) { return S().quotes.filter(function (x) { return x.id === id; })[0]; }
    A.yqChase = function (el) { var x = qBy(el.dataset.id); if (!x) return; x.chased = (x.chased || 0) + 1; CS.save(); UI.render(); toast('Follow up sent for ' + h(x.id) + '. Demo, nothing is sent', 'send'); };
    A.yqLost = function (el) { var x = qBy(el.dataset.id); if (!x) return; x.status = 'lost'; CS.save(); UI.render(); toast(h(x.id) + ' marked lost', 'x'); };
    A.yqWon = function (el) { var x = qBy(el.dataset.id); if (!x) return; x.status = 'won'; CS.save(); UI.render(); A.yBook(x.cust ? { dataset: { c: x.cust } } : null); };

    /* ======================================================================
       DAY PLAN: time windows, access notes, service colours, compatible lorries light up
       ====================================================================== */
    var WIN = [['early', '7 to 9'], ['am', '8 to 12'], ['pm', '12 to 4']];
    function rule(j) { var m = /no access (before|after) (\d{1,2})/i.exec(j.notes || ''); return m ? { k: m[1].toLowerCase(), hr: +m[2], note: j.notes } : null; }
    function winOf(j) {
      var r = rule(j), w = j.win[0] < 480 ? 'early' : j.win[0] < 720 ? 'am' : 'pm';
      if (r && r.k === 'before' && w === 'early' && r.hr >= 9) w = 'am';
      if (r && r.k === 'after' && w === 'pm' && r.hr + 12 <= 13) w = 'am';
      return w;
    }
    function winLbl(j) { var w = winOf(j); return WIN.filter(function (x) { return x[0] === w; })[0][1]; }
    function kind(j) { return j.type === 'grab' || j.type === 'muck' ? 'grab' : YC.isRoro(j) ? 'roro' : 'skip'; }
    function seedPlan() {
      var y = Y(); if (y.planV) return; y.planV = 1;
      [['DSG-3181', 'No access before 9, school drop-off on the lane'], ['DSG-3183', 'No access after 3, the yard gates are locked'], ['DSG-3185', 'No access before 9, residents\' parking']].forEach(function (r) { var j = K.jobById(r[0]); if (j) j.notes = r[1]; });
      save();
    }
    function planSort(a, b) { var o = { early: 0, am: 1, pm: 2 }, ra = rule(a), rb = rule(b); return o[winOf(a)] - o[winOf(b)] || (rb ? 1 : 0) - (ra ? 1 : 0) || a.win[0] - b.win[0]; }
    function pcard(j) {
      var locked = j.status !== 'planned', r = rule(j), k = kind(j);
      return '<div class="ypc y2pc svc-' + k + (locked ? ' locked' : '') + '" ' + (locked ? '' : 'draggable="true"') + ' data-pj="' + j.id + '" data-kind="' + k + '"><button class="ypc-b" data-act="yJob" data-id="' + j.id + '"><span class="ypc-t"><b>' + winLbl(j) + '</b>' + (r ? '<i class="y2bang" title="' + h(r.note) + '" aria-label="' + h(r.note) + '">!</i>' : '') + '<small class="y2sug">' + (locked ? '' : 'suggested') + '</small>' + (locked ? K.stTag(j) : '') + '</span><b>' + h(YC.whatShort(j)) + '</b><small>' + h(YC.custName(S(), j.cust)) + '</small><small>' + h(j.site.pc + ', ' + j.site.name.split(',')[0]) + '</small>' +
        '<span class="ypc-x"><span class="tag svc">' + (k === 'grab' ? 'Grab' : k === 'roro' ? 'RoRo' : 'Skip') + '</span>' + (j.permit ? '<span class="tag">Permit</span>' : '') + K.cashBadge(j) + '</span></button>' +
        (locked ? '' : '<label class="ypc-mv"><span>Move to</span><select class="ymove" data-id="' + j.id + '" aria-label="Move ' + j.id + ' to a lorry"><option value="none"' + (!j.lorry ? ' selected' : '') + '>Unplanned</option>' + YC.LORRIES.map(function (l) { return '<option value="' + l.id + '"' + (j.lorry === l.id ? ' selected' : '') + '>' + h(l.reg + ', ' + l.driver) + '</option>'; }).join('') + '</select></label>') + '</div>';
    }
    K.planBase = function () {
      seedPlan();
      var y = Y(), d = ui.yPlanDay == null ? 0 : ui.yPlanDay, t1 = CS.wd(1);
      var un = y.jobs.filter(function (j) { return j.day === d && !j.lorry; }).sort(planSort);
      var tray = '<section class="ycol none" data-col="none"><header><b>Unplanned</b><small>' + (un.length ? plural(un.length, 'job') + ' waiting. Drag each one onto a registration' : 'Every job is on a lorry. Drag one back here to take it off') + '</small></header><div class="ycol-b">' + un.map(pcard).join('') + '</div></section>';
      var groups = YC.GROUPS.map(function (g) {
        var L = YC.LORRIES.filter(function (l) { return l.kind === g[0]; });
        return '<div class="ygrp ygrp-' + g[0] + '" style="--n:' + L.length + '"><div class="ygrp-h">' + h(g[1]) + '</div><div class="ygrp-c">' + L.map(function (l) {
          var js = y.jobs.filter(function (j) { return j.day === d && j.lorry === l.id; }).sort(planSort), dn = js.filter(function (j) { return j.status === 'done'; }), open = js.filter(function (j) { return j.status !== 'done'; });
          return '<section class="ycol" data-col="' + l.id + '" data-lk="' + l.kind + '"><header><span class="yreg">' + h(l.reg) + '</span><small>' + h(l.driver) + '</small>' + (dn.length ? '<small class="ycap">' + plural(dn.length, 'job') + ' done today</small>' : '') + '</header><div class="ycol-b">' + open.map(pcard).join('') + (open.length ? '' : '<p class="ycol-e">Drop a job here</p>') + '</div></section>';
        }).join('') + '</div></div>';
      }).join('');
      return '<div class="ybar"><div class="seg">' + [[0, 'Today'], [t1, 'Tomorrow']].map(function (x) { return '<button data-act="yPlanDay" data-v="' + x[0] + '" class="' + (d === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><span class="y2leg"><i class="svc-skip"></i>Skip<i class="svc-grab"></i>Grab<i class="svc-roro"></i>RoRo<b class="y2bang">!</b>access note, hover to read</span><span class="sp"></span><button class="btn pri" data-act="yBook">' + ic('plus') + 'New booking</button></div>' +
        '<div class="yplan2" id="yPlan">' + tray + '<div class="ygrps">' + groups + '</div></div><p class="muted yfoot">Windows are 7 to 9, 8 to 12 and 12 to 4, suggested from the booking. Access notes come first and show a !. Drag a job onto a lorry, between lorries, or back to Unplanned. Only the lorries that can do it stay lit while you drag.</p>';
    };
    var vw = q('#view');
    vw.addEventListener('dragstart', function (e) {
      var c = e.target.closest && e.target.closest('[data-pj]'); if (!c) return; var j = K.jobById(c.getAttribute('data-pj')); if (!j) return;
      document.body.classList.add('y2drag');
      Array.prototype.forEach.call(document.querySelectorAll('#yPlan .ycol[data-col]'), function (col) { var id = col.getAttribute('data-col'), ok = id === 'none' || K.lorryFits(YC.lorry(id), j); col.classList.toggle('y2ok', ok); col.classList.toggle('y2no', !ok); });
    }, true);
    function clearDrag() { document.body.classList.remove('y2drag'); Array.prototype.forEach.call(document.querySelectorAll('.y2ok,.y2no'), function (c) { c.classList.remove('y2ok', 'y2no'); }); }
    vw.addEventListener('dragend', clearDrag, true); vw.addEventListener('drop', function () { setTimeout(clearDrag, 0); }, true);

    /* ======================================================================
       MONEY: extra weight (RoRo) and per tonne (grab) charges, then their own chasing list
       ====================================================================== */
    function seedWeight() {
      var y = Y(); if (y.wcV) return; y.wcV = 1;
      var c = CS.cust('c12'), now = YC.nowMin(), b0 = new Date(); b0.setHours(0, 0, 0, 0); var d = Math.max(470, now - 95);
      var j = { id: 'DSG-3135', day: 0, lorry: 'G2', win: [d - 50, d + 10], type: 'grab', cust: 'c12', site: { name: c.sites[0].name, pc: c.sites[0].pc }, size: null, loads: 1, stream: 'mixed', place: 'drive', permit: null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: 'Charged by the tonne: mixed waste at £185/t', log: [{ at: b0.getTime() + (d - 1500) * 60000, t: 'Booked by Ellie, mixed waste grab by the tonne' }], perT: 185, manual: true };
      var p = YC.pos(j.site.pc); j.lat = p.lat; j.lng = p.lng; j.price = 0; j.incl = null;
      y.jobs.push(j); j.at.onway = b0.getTime() + (d - 35) * 60000; j.at.arrived = b0.getTime() + (d - 15) * 60000;
      YC.complete(S(), y, j, { net: 4.0 }, b0.getTime() + d * 60000); j.price = Math.round(4.0 * 185 * 100) / 100;
      var t = y.tickets.filter(function (x) { return x.id === j.ticket; })[0]; if (t) { t.est = false; t.read = 'Weighbridge, number plate read'; }
      y.wc = { 'DSG-3135': { status: 'new' } };
      save();
    }
    function wItems() {
      var y = Y(); y.wc = y.wc || {};
      var L = y.tickets.filter(function (t) { return t.over && t.over.auto; }).map(function (t) { var j = K.jobById(t.job), st = y.wc[t.job] || (y.wc[t.job] = { status: 'raised', inv: t.over.inv }); return { j: j, t: t, kind: 'roro', st: st, amt: t.over.amount, chg: t.over.over, line: j.size + ' yd RoRo came back ' + t.net.toFixed(2) + ' t, ' + t.over.incl + ' t included on quote, excess ' + t.over.over.toFixed(2) + ' t at ' + money(t.over.rate) + '/t', label: j.size + ' yd RoRo' }; });
      y.jobs.filter(function (j) { return j.perT && j.status === 'done'; }).forEach(function (j) { var t = O.ticketOf(j), st = y.wc[j.id] || (y.wc[j.id] = { status: 'new' }); if (t) L.push({ j: j, t: t, kind: 'grab', st: st, amt: j.price, chg: t.net, line: wName(j) + ' grab, charged at ' + money(j.perT) + '/t, came back ' + t.net.toFixed(2) + ' t: ' + t.net.toFixed(2) + ' t x ' + money(j.perT) + ' = ' + money(j.price, true) + ' + VAT', label: wName(j) + ' grab' }); });
      return L;
    }
    function wName(j) { return j.stream === 'mixed' ? 'Mixed waste' : YC.STREAMS[j.stream].n; }
    function raise(x) { var s = S(), c = CS.cust(x.j.cust), id = O.invNo(x.j); if (!s.invoices.some(function (i) { return i.id === id; }) && c) s.invoices.unshift({ id: id, cust: x.j.cust, amount: x.amt, issued: 0, due: c.limit ? 30 : 7, status: 'unpaid', jobs: [x.j.id], what: x.label + ', ' + x.chg.toFixed(2) + ' t by weight', over: x.kind === 'roro' ? x.amt : null }); x.st.inv = id; if (x.st.status === 'new') x.st.status = 'raised'; x.j.invoiced = id; }
    window.DSGBRIDGE = function () {
      var L = wItems(); if (!L.length) return '';
      var open = L.filter(function (x) { return x.st.status !== 'sent'; }), sent = L.filter(function (x) { return x.st.status === 'sent'; });
      return '<section class="card ywb yover" id="yBridge"><div class="yh-rh"><h3>' + ic('stack') + 'Charges by weight</h3><small class="muted">RoRos over the tonnes on the quote, and grabs charged by the tonne</small></div>' + (open.map(function (x) {
        var c = YC.custName(S(), x.j.cust);
        return '<div class="ywc"><div class="bd"><b>' + h(x.j.id) + ' · ' + h(c) + ' · ' + h(x.label) + ' · ' + x.chg.toFixed(2) + ' t chargeable</b><small>' + h(x.line) + '</small>' + (x.st.status === 'raised' ? '<span class="tag ok">' + ic('receipt') + 'On invoice ' + h(x.st.inv) + ', ' + money(x.amt, true) + ' + VAT</span>' : '<span class="tag amber">Not invoiced yet</span>') + '</div><div class="ywc-b">' +
          (x.st.status === 'raised' ? '<button class="btn sm" data-act="y4Doc" data-k="inv" data-id="' + h(x.j.id) + '">' + ic('receipt') + 'Invoice</button><button class="btn sm" data-act="y4Doc" data-k="tk" data-id="' + h(x.j.id) + '">' + ic('stack') + 'Ticket</button><button class="btn sm pri" data-act="ywcSend" data-id="' + h(x.j.id) + '">' + ic('send') + (x.kind === 'roro' ? 'Send invoice and ticket to customer' : 'Send invoice and ticket') + '</button>'
            : '<button class="btn sm" data-act="ywcRaise" data-id="' + h(x.j.id) + '">' + ic('receipt') + 'Raise invoice</button><button class="btn sm" data-act="y4Doc" data-k="tk" data-id="' + h(x.j.id) + '">' + ic('stack') + 'Ticket</button><button class="btn sm pri" data-act="ywcSend" data-id="' + h(x.j.id) + '">' + ic('send') + 'Send invoice and ticket</button>') + '</div></div>';
      }).join('') || '<p class="muted" style="margin:0">Every weight charge has gone to the customer. They are in the chasing list below.</p>') + (sent.length ? '<small class="muted">' + plural(sent.length, 'sent weight charge') + ' now in the chasing list below</small>' : '') + '</section>';
    };
    function wBy(id) { return wItems().filter(function (x) { return x.j.id === id; })[0]; }
    A.ywcRaise = function (el) { var x = wBy(el.dataset.id); if (!x) return; raise(x); Y().v++; save(); UI.render(); toast('Invoice ' + h(x.st.inv) + ' raised: ' + x.chg.toFixed(2) + ' t, ' + money(x.amt, true) + ' + VAT. In your accounts package', 'receipt'); };
    A.ywcSend = function (el) { var x = wBy(el.dataset.id); if (!x) return; raise(x); x.st.status = 'sent'; x.st.sentAt = Date.now(); x.j.log.push({ at: Date.now(), t: 'Invoice ' + x.st.inv + ' and ticket ' + x.t.id + ' sent to the customer' }); Y().v++; save(); UI.render(); toast('Invoice ' + h(x.st.inv) + ' and ticket ' + h(x.t.id) + ' sent to ' + h(YC.custName(S(), x.j.cust)) + '. It is in the chasing list. Demo, nothing is sent', 'send'); };
    function chaseCard() {
      var y = Y(), s = S(), L = wItems().filter(function (x) { return x.st.status === 'sent'; }).map(function (x) { return { k: x.j.id, t: x.st.inv + ' · ' + YC.custName(s, x.j.cust), d: x.label + ' by weight, invoice ' + money(((S().invoices.filter(function (i) { return i.id === x.st.inv; })[0] || {}).amount || x.amt) * 1.2, true) + ' with VAT · sent ' + CS.clock(x.st.sentAt) + ', due in ' + ((CS.cust(x.j.cust) || {}).limit ? '30' : '7') + ' days', ch: x.st.chased, id: x.j.id, inv: true }; });
      s.invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; }).sort(function (a, b) { return a.due - b.due; }).forEach(function (i) { var c = CS.cust(i.cust); L.push({ k: i.id, t: i.id + ' · ' + (c ? c.name : ''), d: money(i.amount * 1.2, true) + ' with VAT · ' + (-i.due) + ' days late', ch: (y.chase || {})[i.id] && y.chase[i.id].n, late: true }); });
      return '<section class="card ycash-c" id="yMoneyChase"><div class="yh-rh"><h3>' + ic('bell') + 'Chasing</h3><small class="muted">Sent invoices waiting to be paid, latest first</small></div>' + (L.map(function (x) { return '<div class="ych"><i class="ych-dot ' + (x.late ? 'bad' : 'amber') + '"></i><span class="bd"><b>' + h(x.t) + '</b><small>' + h(x.d) + (x.ch ? ' · ' + plural(x.ch, 'reminder') + ' sent' : '') + '</small></span>' + (x.id ? '<button class="btn sm" data-act="y4Doc" data-k="inv" data-id="' + h(x.id) + '">' + ic('receipt') + 'Invoice</button>' : '') + '<button class="btn sm pri" data-act="ywcChase" data-k="' + h(x.k) + '"' + (x.late ? ' data-late="1"' : '') + '>' + ic('mail') + 'Chase</button></div>'; }).join('') || '<p class="muted">Nothing waiting.</p>') + '</section>';
    }
    A.ywcChase = function (el) {
      var y = Y(), k = el.dataset.k;
      if (el.dataset.late) { y.chase = y.chase || {}; var c0 = y.chase[k] || { n: 0 }; y.chase[k] = { n: c0.n + 1, at: Date.now() }; }
      else { var st = (y.wc || {})[k]; if (st) st.chased = (st.chased || 0) + 1; }
      y.v++; save(); UI.render(); toast('Reminder sent, with the invoice attached. Demo, nothing is sent', 'mail');
    };
    var money0 = V.money;
    V.money = function () { var html = money0.apply(this, arguments); return html.replace('<div class="card"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('receipt') + 'Invoices', chaseCard() + '<div class="card"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('receipt') + 'Invoices'); };

    /* ======================================================================
       DAY SUMMARY: the yard's own day
       ====================================================================== */
    V.today = function () {
      var y = Y(), s = S(), t0 = YC.today(y), dn = t0.filter(function (j) { return j.status === 'done'; }), un = t0.filter(function (j) { return !j.lorry; });
      var needs = (y.inbox || []).filter(function (m) { return !m.done; }).length, cash = YC.cashItems(s, y).filter(function (x) { return x.day === 0 && x.state === 'collected'; }).reduce(function (a, x) { return a + x.cash.gross; }, 0), ag = K.aged();
      var sales = dn.reduce(function (a, j) { return a + (j.price || 0); }, 0), hr = new Date().getHours();
      return '<div style="margin-bottom:16px"><h2 style="font-size:24px">' + (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + ', Dave</h2><p class="muted" style="margin:4px 0 0">' + plural(t0.length, 'job') + ' on today, ' + dn.length + ' done, ' + un.length + ' still to give a lorry. ' + plural(needs, 'message') + ' waiting.</p></div>' +
        '<div class="ykpis"><button class="card kpi" data-act="go" data-v="inbox"><small>' + ic('inbox') + 'Needs you</small><b>' + needs + '</b><span class="d">replies ready, one tap each</span></button><button class="card kpi hero" data-act="go" data-v="tracking"><small>' + ic('truck') + 'Jobs today</small><b>' + dn.length + ' / ' + t0.length + '</b><span class="d">' + un.length + ' waiting on the day plan</span></button><button class="card kpi" data-act="go" data-v="money"><small>' + ic('pound') + 'Done today</small><b>' + money(sales) + '</b><span class="d">+ VAT, ' + money(cash) + ' of it in cash</span></button><button class="card kpi" data-act="go" data-v="credit"><small>' + ic('alert') + 'Overdue to you</small><b class="bad">' + money(ag.over) + '</b><span class="d">reminders ready</span></button></div>' +
        '<div class="card"><div class="yh-rh" style="padding:14px 16px 6px"><h3>' + ic('route') + 'Today</h3><button class="btn sm" data-act="go" data-v="plan">Day plan</button></div><div class="tw"><table class="t ytab"><tbody>' + t0.slice().sort(function (a, b) { return a.win[0] - b.win[0]; }).map(function (j) { var lo = YC.lorry(j.lorry); return '<tr class="click" data-act="yJob" data-id="' + j.id + '"><td><b>' + h(K.winLabel(j)) + '</b><small>' + h(j.id) + '</small></td><td><b>' + h(YC.whatShort(j)) + '</b><small>' + h(YC.custName(s, j.cust)) + ', ' + h(j.site.pc) + '</small></td><td class="hide-sm">' + (lo ? '<span class="yplate yx">' + h(lo.reg) + '</span>' : '<span class="tag bad">No lorry yet</span>') + '</td><td class="r">' + K.stTag(j) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div class="card ytexts"><div class="yh-rh"><h3>' + ic('message') + 'Texts to customers today</h3></div>' + (y.texts.slice(0, 6).map(function (t) { return '<div class="ytx"><small>' + CS.clock(t.at) + ' · ' + h(t.to) + '</small><span>' + h(t.text) + '</span></div>'; }).join('') || '<p class="muted">None yet today.</p>') + '</div>';
    };

    seedWeight();
    UI.render();
  }
  start(0);
})();
