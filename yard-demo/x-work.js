/* Demo Skip & Grab demo, work layer: live jobs for today only with a status the office can change, the order diary
   opening on a day view with back arrows on every drill-down, and PO numbers shown where they are set.
   Sample data only. Nothing leaves this browser and nothing is sent. */
(function () {
  var CS = window.CS, UI = window.DSGUI, V2 = window.DSGV2, V3 = window.DSGV3, ic = window.ic;
  if (!CS || !UI || !V2 || !V2.x || !V3) return;
  var h = CS.esc, money = CS.money, A = UI.A, V = UI.V, ui = UI.ui, X = V2.x;
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var PHONE = '01632 960 555';
  function S() { return CS.S; }
  function q(s) { return document.querySelector(s); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* ---------- small pop-up and toast helpers, same markup as the rest of the app ---------- */
  function layer(html) { var l = document.getElementById('layer'); if (l) l.innerHTML = html; }
  function closeLayer() { layer(''); }
  function modal(label, title, body, foot) {
    layer('<div class="scrim" data-act="close"></div><div class="modal" role="dialog" aria-label="' + h(label) + '"><div class="mhd"><h2>' + title + '</h2><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' + body + '</div>' + (foot ? '<div class="mft">' + foot + '</div>' : '') + '</div>');
  }
  function toast(text, icon) {
    var box = document.getElementById('toasts'); if (!box) return;
    var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(icon || 'circle-check') + '<span>' + text + '</span>';
    box.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 4200);
  }

  /* ---------- sample PO numbers on a few account jobs, so the diary has some to show ---------- */
  function seedPo() {
    var s = S(); if (s.xwPo) return; s.xwPo = 1;
    s.jobs.forEach(function (j) { var c = CS.cust(j.cust); if (!j.po && c && !/card/i.test(c.terms || '') && X.hash(j.id) % 3 === 0) j.po = String(450000 + X.hash(j.id) % 9000); });
    CS.save();
  }

  /* ---------- live jobs: today only, in ETA order, with a status the office sets ---------- */
  var ST = ['Confirmed', 'On the way', 'Rescheduled', 'In progress', 'Complete'];
  var STC = { 'Confirmed': ['brand', 1], 'On the way': ['mail', 2], 'Rescheduled': ['amber', 1], 'In progress': ['web', 2], 'Complete': ['ok', 3] };
  var track0 = X.track;
  /* the status worked out from the booking and the clock, in the five words. Empty while the supplier has not confirmed. */
  function baseSt(j, what) { var tk = track0(j, 0, what); return tk[2] === 0 ? '' : tk[2] === 3 ? 'Complete' : tk[0] === 'On the way' ? 'On the way' : 'Confirmed'; }
  /* the office's own choice wins, until the job itself moves on (delivered, collected and so on) */
  function liveSt(j, what) { return j.liveSt && ST.indexOf(j.liveSt) >= 0 && j.liveStWas === j.status ? j.liveSt : baseSt(j, what); }
  X.track = function (j, d, what) {
    var tk = track0(j, d, what); if (d !== 0) return tk;
    var s = liveSt(j, what); return s ? [s, STC[s][0], STC[s][1]] : tk;
  };
  function etaCell(j) { return j.status === 'booked' ? '<b class="muted">' + h(X.eta(j)) + '</b><small>Asked for, not confirmed yet</small>' : '<b>' + h(X.eta(j)) + '</b>'; }
  function stSelect(j, what) {
    var cur = liveSt(j, what);
    return '<select class="xwst" id="xwst-' + j.id + '" data-xwst="' + j.id + '" data-st="' + h(cur) + '" aria-label="Status for ' + j.id + '">' +
      (cur ? '' : '<option value="" selected disabled hidden>Not confirmed yet</option>') +
      ST.map(function (s) { return '<option value="' + s + '"' + (s === cur ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      (cur ? '' : '<small class="xwwait">Waiting on supplier</small>');
  }
  function liveView() {
    var rows = X.movesOn(0), sts = rows.map(function (r) { return liveSt(r.j, r.what); });
    function n(v) { return sts.filter(function (s) { return s === v; }).length; }
    var wait = n(''), way = n('On the way') + n('In progress'), done = n('Complete');
    return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
      '<div class="card kpi"><small>' + ic('truck') + 'Today</small><b>' + rows.length + '</b><span class="d">deliveries, swaps and collections</span></div>' +
      '<div class="card kpi"><small>' + ic('route') + 'On the way or in progress</small><b>' + way + '</b><span class="d">out on the road now</span></div>' +
      '<div class="card kpi"><small>' + ic('circle-check') + 'Complete</small><b>' + done + '</b><span class="d">of ' + rows.length + ' today</span></div>' +
      '<div class="card kpi"><small>' + ic('clock') + 'Waiting on a supplier</small><b' + (wait ? ' style="color:var(--amber)"' : '') + '>' + wait + '</b><span class="d">chased for you until they confirm</span></div></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('truck') + 'Live jobs today <span class="muted" style="font-weight:600">' + rows.length + '</span></h2><span class="muted xwhint">' + dLong(0) + '</span></div>' +
      (rows.length ? '<div class="tw"><table class="t livet xwsheet" id="liveToday"><thead><tr><th><span class="hide-sm">Supplier\'s </span>ETA</th><th>Site address</th><th class="hide-sm">Service</th><th class="hide-md">Site contact</th><th class="hide-sm">Supplier</th><th>Status</th><th class="hide-md">Notes</th><th class="hide-sm"></th></tr></thead><tbody>' +
        rows.map(function (r, i) {
          var j = r.j, c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), ct = X.contact(j), st = sts[i];
          var note = j.note || (j.permit ? 'On the road, permit needed' : '') || (r.what === 'Exchange' ? 'Swap full for empty' : '');
          return '<tr class="click' + (st === 'Complete' ? ' xwdone' : '') + '" data-act="openJob" data-id="' + j.id + '"><td>' + etaCell(j) + '<small>' + r.what + ' · ' + j.id + '</small></td>' +
            '<td><b>' + h(s.name) + '</b><small>' + h(j.addr ? j.addr + ', ' : '') + h(s.pc) + ' · ' + h(c.name) + '</small><small class="xwsm">' + h(CS.jobDesc(j)) + ' · ' + h(su.name) + '</small><small class="only-md">' + h(ct.name) + ' ' + h(ct.phone || '') + '</small></td>' +
            '<td class="hide-sm">' + h(CS.jobDesc(j)) + '</td><td class="hide-md"><b>' + h(ct.name) + '</b><small>' + h(ct.phone || '') + '</small></td><td class="hide-sm">' + h(su.name) + '</td>' +
            '<td class="xwstc" data-act="xwCell">' + stSelect(j, r.what) + (st !== 'Complete' ? '<button class="lnk xwsm xwask" data-act="askEta" data-id="' + j.id + '">' + ic('whatsapp') + 'Ask ETA</button>' : '') + '</td><td class="hide-md"><small style="display:inline">' + h(note) + '</small></td>' +
            '<td class="r hide-sm">' + (st !== 'Complete' ? '<button class="btn sm" data-act="askEta" data-id="' + j.id + '" title="Ask the supplier where they are">' + ic('whatsapp') + '<span class="hide-sm">Ask ETA</span></button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('circle-check') + 'Nothing moving today.</div>') + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin:0">Jobs are in order of the supplier\'s ETA, the window they gave when they confirmed the booking. Change the status as the day moves on. Ask ETA drafts a WhatsApp to the supplier.</p>';
  }
  var jobsV = V.jobs;
  V.jobs = function () {
    if (ui.jobTab === 'skips') return jobsV();
    var tabs = [['live', 'Live jobs today'], ['skips', 'Skips on site']];
    return '<div class="row" style="flex-wrap:wrap;margin-bottom:14px"><div class="seg" id="jobTabs">' + tabs.map(function (x) { return '<button data-act="jobTab" data-v="' + x[0] + '" class="' + (x[0] === 'live' ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><span class="sp"></span><button class="btn" data-act="go" data-v="orders">' + ic('calendar') + 'Order diary</button><button class="btn pri" data-act="newOrder">' + ic('plus') + 'New order</button></div>' + liveView();
  };

  /* the text the customer would get. A draft only: the text message service is an optional add-on and nothing is sent here. */
  function moveOf(j) { return j.exDay === 0 ? 'Exchange' : j.colDay === 0 ? 'Collection' : 'Delivery'; }
  function textFor(j) {
    var ct = X.contact(j), s = CS.jobSite(j), what = moveOf(j), desc = CS.jobDesc(j).toLowerCase(), win = X.eta(j), place = (s.name && s.name !== s.pc ? s.name + ', ' : '') + s.pc;
    var doing = what === 'Collection' ? 'on the way to collect the ' + desc + ' from ' + place : what === 'Exchange' ? 'on the way to swap the ' + desc + ' at ' + place : 'on the way to ' + place + ' with your ' + desc;
    return 'Hi ' + X.first(ct.name || 'there') + ', your driver is ' + doing + '.' + (/\d\s*to\s*\d/.test(win) ? ' They should be with you between ' + win.replace(/\s*to\s*/, ' and ') + '.' : '') + ' Any problems, call us on ' + PHONE + '. Ref ' + j.id + '. Demo Skip & Grab';
  }
  var ADDON = ' <span class="tag ai xwaddon" title="The text message service is an optional extra">Add-on</span>';
  function askText(j) {
    var ct = X.contact(j);
    modal('Text the customer', ic('message') + ' On the way' + ADDON,
      '<p class="xwq" id="xwAsk">Text the customer that the driver is on the way?</p>' +
      '<dl class="kv"><dt>Job</dt><dd>' + j.id + ' · ' + h(CS.jobDesc(j)) + '</dd><dt>To</dt><dd>' + h(ct.name) + (ct.phone ? ' · ' + h(ct.phone) : '') + '</dd></dl>' +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">The text message service is an optional add-on. This is a demo with sample data, so nothing is sent.</p>',
      '<button class="btn" data-act="xwTextNo" id="xwNo">No</button><button class="btn pri" data-act="xwTextYes" data-id="' + j.id + '" id="xwYes">' + ic('check') + 'Yes</button>');
  }
  A.xwTextNo = function () { closeLayer(); };
  A.xwTextYes = function (el) {
    var j = CS.job(el.dataset.id); if (!j) { closeLayer(); return; }
    var ct = X.contact(j), text = textFor(j);
    CS.jobLog(j, 'On the way text drafted for ' + X.first(ct.name || 'the customer')); CS.save();
    modal('Text drafted', ic('message') + ' Text drafted' + ADDON,
      '<p class="muted" style="font-size:13px;margin:0 0 10px">To ' + h(ct.name) + (ct.phone ? ' · ' + h(ct.phone) : '') + '</p><div class="xwsms" id="xwSms">' + h(text) + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">Drafted and ready. Nothing is sent in this demo. With the text message add-on switched on, this goes to the customer when the job is set to On the way.</p>',
      '<span class="sp"></span><button class="btn pri" data-act="close">Done</button>');
    toast('Text to ' + h(X.first(ct.name || 'the customer')) + ' drafted and ready. Nothing is sent in this demo.', 'message');
  };
  document.addEventListener('change', function (e) {
    var el = e.target, id = el && el.getAttribute && el.getAttribute('data-xwst'); if (!id) return;
    var j = CS.job(id), v = el.value; if (!j || ST.indexOf(v) < 0) return;
    j.liveSt = v; j.liveStWas = j.status; CS.jobLog(j, 'Status set to ' + v);
    /* an account job that was held back for invoicing: the invoice is raised now the job is complete */
    var inv = v === 'Complete' && j.invLater && X.raiseLater ? X.raiseLater(j) : null, cu = inv ? CS.cust(j.cust) : null;
    if (inv) CS.feed('Invoice ' + inv + ' raised for ' + (cu ? cu.name : 'the customer') + ', ' + j.id + ' is complete', 'receipt');
    CS.commit();
    if (inv) toast(j.id + ' set to Complete. Invoice ' + inv + ' is raised and ready for ' + h(cu ? cu.name : 'the customer') + '.', 'receipt');
    else if (v === 'On the way') askText(j); else toast(j.id + ' set to ' + v + '.', 'check');
  });

  /* ---------- the order diary opens on a day ---------- */
  function dia() { if (!ui.diary) ui.diary = { mode: 'day', off: 0, q: '', cust: '', sup: '', svc: '', status: '', paid: '', more: 1 }; return ui.diary; }
  var OST = { booked: ['Waiting on supplier', 'amber'], confirmed: ['Confirmed', 'brand'], onhire: ['On hire', 'ok'], exchange: ['Exchange booked', 'mail'], collection: ['Collection booked', 'web'], done: ['Done', ''] };
  function ostTag(st) { var s = OST[st] || [st, '']; return '<span class="tag ' + s[1] + '">' + h(s[0]) + '</span>'; }
  function etaOf(o) { return X.eta(o.job || o); }
  function etaNum(o) { var m = /^(\d+)(?::(\d+))?/.exec(etaOf(o)); var n = m ? +m[1] + (m[2] ? +m[2] / 60 : 0) : 8; return n < 7 ? n + 12 : n; }
  function dLong(off) { var d = CS.dayDate(off); return DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()] + ' ' + d.getFullYear(); }
  function relName(off) { return off === 0 ? 'Today' : off === -1 ? 'Yesterday' : off === 1 ? 'Tomorrow' : off < 0 ? plural(-off, 'day') + ' ago' : 'In ' + plural(off, 'day'); }
  var BACKL = { month: 'Back to month', week: 'Back to week' };
  function dayPage(d) {
    var l = V3.all().filter(function (o) { return o.off === d.off; }).sort(function (a, b) { return etaNum(a) - etaNum(b) || (a.id < b.id ? -1 : 1); });
    var rev = l.reduce(function (a, o) { return a + o.sell; }, 0), gp = l.reduce(function (a, o) { return a + o.sell - o.cost; }, 0);
    var modes = [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['list', 'List']];
    function quick(off, act, label) { return '<button class="pk' + (d.off === off ? ' on' : '') + '" data-act="' + act + '" data-v="' + off + '"' + (act === 'diaToday' ? ' id="diaTodayBtn"' : '') + '>' + label + '</button>'; }
    return '<div class="dbar"><div class="seg" id="diaModes">' + modes.map(function (x) { return '<button data-act="diaMode" data-v="' + x[0] + '" class="' + (x[0] === 'day' ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<span class="sp"></span><button class="btn pri" data-act="newOrder">' + ic('plus') + 'New order</button></div>' +
      (BACKL[d.from] ? '<button class="btn xwback" id="diaBack" data-act="diaBack">' + ic('chevron-left') + BACKL[d.from] + '</button>' : '') +
      '<div class="card xwday"><div class="xwdnav"><button class="iconbtn" data-act="diaNav" data-v="-1" aria-label="Previous day" title="Previous day">' + ic('chevron-left') + '</button>' +
      '<div class="xwdate"><b id="diaLabel">' + dLong(d.off) + '</b><small>' + relName(d.off) + ' · ' + (l.length ? plural(l.length, 'order') + ' · ' + money(rev) + ' sales · ' + money(gp) + ' gross profit' : 'no orders') + '</small></div>' +
      '<button class="iconbtn" data-act="diaNav" data-v="1" aria-label="Next day" title="Next day">' + ic('chevron-right') + '</button></div>' +
      '<div class="xwquick">' + quick(-1, 'diaRel', 'Yesterday') + quick(0, 'diaToday', 'Today') + quick(1, 'diaRel', 'Tomorrow') + '</div></div>' +
      (l.length ? '<div class="card"><div class="tw"><table class="t xwsheet" id="diaDayList"><thead><tr><th>Time</th><th>Order</th><th>Customer</th><th class="hide-sm">Site</th><th class="hide-md">Service</th><th class="hide-md">Supplier</th><th class="hide-sm">Status</th><th class="r">Price</th></tr></thead><tbody>' +
        l.map(function (o) {
          var c = CS.cust(o.cust), s = CS.jobSite(o), su = CS.sup(o.sup), po = o.po || (o.job && o.job.po) || '';
          return '<tr class="click" data-act="ordOpen" data-id="' + o.id + '"><td><b>' + h(etaOf(o)) + '</b></td>' +
            '<td><b class="xwid">' + o.id + '</b>' + (po ? '<small class="xwpo">PO number ' + h(po) + '</small>' : '') + '<small class="only-md">' + h(CS.jobDesc(o)) + '</small></td>' +
            '<td><b>' + h(c ? c.name : 'Customer') + '</b><small class="xwsm">' + h(s.name) + ', ' + h(s.pc) + '</small><small class="only-md">' + h(su ? su.name : '') + '</small></td>' +
            '<td class="hide-sm">' + h(s.name) + '<small>' + h(s.pc) + '</small></td><td class="hide-md">' + h(CS.jobDesc(o)) + '</td><td class="hide-md">' + h(su ? su.name : '') + '</td>' +
            '<td class="hide-sm">' + ostTag(o.status) + '</td><td class="r"><b class="num">' + money(o.sell) + '</b><small>' + money(o.sell - o.cost) + ' gross profit</small><span class="xwsm xwsmtag">' + ostTag(o.status) + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>'
        : '<div class="card"><div class="empty">' + ic('calendar') + 'No orders ' + (d.off > 0 ? 'booked for this day yet.' : 'on this day.') + (d.off >= 0 ? ' <button class="btn sm pri" data-act="newOrder" style="margin-left:8px">' + ic('plus') + 'New order</button>' : '') + '</div></div>') +
      '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Every order for the day, in time order. Tap an order to open its page. Month, Week and List are at the top.</p>';
  }
  var ordersV = V.orders;
  V.orders = function () { seedPo(); var d = dia(); return d.mode === 'day' ? dayPage(d) : ordersV(); };

  var diaMode0 = A.diaMode; A.diaMode = function (el) { dia().from = null; return diaMode0(el); };
  var diaDay0 = A.diaDay; A.diaDay = function (el) {
    var d = dia(), inView = el && el.closest && el.closest('#view');
    d.from = ui.view === 'orders' && inView && BACKL[d.mode] ? d.mode : null;
    return diaDay0(el);
  };
  A.diaBack = function () { var d = dia(); d.mode = BACKL[d.from] ? d.from : 'month'; d.from = null; UI.render(); window.scrollTo(0, 0); };
  A.diaRel = function (el) { dia().off = Number(el.dataset.v) || 0; UI.render(); };

  /* ---------- a back arrow on the order page, and on anything opened from it ---------- */
  var back = null;
  function backBtn(b, cls) { return '<button class="btn sm xwbk' + (cls ? ' ' + cls : '') + '" data-act="' + b.act + '"' + (b.attrs || '') + '>' + ic('chevron-left') + h(b.label) + '</button>'; }
  var ordOpen0 = A.ordOpen; A.ordOpen = function (el) {
    var id = el && el.dataset && el.dataset.id, inLayer = el && el.closest && el.closest('#layer'), dr = inLayer && el.closest('.drawer'), o = id && V3.find(id);
    if (!o) return;
    if (!inLayer) back = { id: id, act: 'close', label: ui.view === 'orders' ? ({ day: 'Back to the day', month: 'Back to month', week: 'Back to week', list: 'Back to the list' }[dia().mode] || 'Back') : 'Back' };
    else if (dr && A.supScore && /Scorecard/.test(dr.textContent || '')) back = { id: id, act: 'supScore', attrs: ' data-id="' + h(o.sup) + '"', label: 'Back to the scorecard' };
    else if (!back || back.id !== id) back = { id: id, act: 'close', label: 'Back' };
    ordOpen0(el);
    var hd = q('#layer .modal .mhd'); if (hd && q('#layer .opage') && !hd.querySelector('.xwbk')) hd.insertAdjacentHTML('afterbegin', backBtn(back));
  };
  ['ordView', 'openInv', 'openJob', 'histDoc', 'viewWtn'].forEach(function (k) {
    var f = A[k]; if (!f) return;
    A[k] = function (el) {
      var from = el && el.closest && el.closest('#layer .modal') && q('#layer .opage') && back ? back.id : null;
      var r = f.apply(this, arguments);
      if (from && !q('#layer .opage') && !q('#layer [data-act="ordOpen"][data-id="' + from + '"]')) {
        var ft = q('#layer .mft') || q('#layer .dft') || q('#layer .mhd') || q('#layer .dhd');
        if (ft) ft.insertAdjacentHTML('afterbegin', backBtn({ act: 'ordOpen', attrs: ' data-id="' + h(from) + '"', label: 'Back to the order' }, 'xwbko'));
      }
      if (k === 'openJob') { var j = CS.job(el && el.dataset && el.dataset.id), kv = q('#layer .drawer .dbd dl.kv'); if (j && j.po && kv && !kv.querySelector('.xwpodd')) kv.insertAdjacentHTML('beforeend', '<dt>PO number</dt><dd class="xwpodd">' + h(j.po) + '</dd>'); }
      return r;
    };
  });

  /* this file loads after the first paint, so open the diary on the day view and draw again */
  if (ui.diary) { ui.diary.mode = 'day'; ui.diary.from = null; }
  seedPo();
  UI.render();
})();
