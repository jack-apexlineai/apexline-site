/* CAC demo, fourth layer: the quote desk. New quote from anywhere, caller recognised, buy price, floor, ideal and
   stretch from his own rules, what this customer paid last time, the script to say on the phone, then sent by
   WhatsApp or email and chased if it goes quiet. Plus the price book (rules, every area and size, price list
   upload) and Ask CAC. Sample data only. Nothing leaves this browser. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var Q = window.CACQ = {}, H = null, D = null;
  function S() { return CS.S; }
  function c5(n) { return Math.ceil(n / 5) * 5; }
  var SVC_ORDER = ['skip', 'grab', 'muck', 'welfare', 'container', 'toilet', 'fencing', 'sweeper', 'concrete', 'aggregates', 'plant'];
  var SIZES = [4, 6, 8, 10, 12, 14, 16, 20, 40];
  var FLOOR = { skip: 25, grab: 30, muck: 30, welfare: 60, container: 30, toilet: 20, fencing: 40, sweeper: 25, concrete: 40, aggregates: 30, plant: 40 };
  var QTY = { grab: ['Loads', 1], muck: ['Loads', 1], aggregates: ['Loads', 1], welfare: ['Weeks', 4], container: ['Weeks', 4], toilet: ['Weeks', 4], fencing: ['Panels', 40], sweeper: ['Hours', 4], concrete: ['Cubic metres', 6], plant: ['Weeks', 1] };
  var REGIONS = [
    ['Hunstanton and West Norfolk', 'PE31'], ['King\'s Lynn', 'PE30'], ['Norwich', 'NR3'], ['Fens and Peterborough', 'PE13'],
    ['East London', 'E14'], ['Birmingham', 'B23'], ['Manchester', 'M1'], ['Liverpool', 'L1']
  ];

  /* ---------- pricing rules ---------- */
  function rules() {
    var st = S().settings; st.pricing = st.pricing || {};
    SVC_ORDER.forEach(function (k) { if (!st.pricing[k] && CS.svc(k)) st.pricing[k] = { mk: Math.round((CS.svc(k).markup || 0.25) * 100), floor: FLOOR[k] }; });
    return st.pricing;
  }
  function ladder(svc, cost) {
    var r = rules()[svc] || { mk: 25, floor: 25 };
    var ideal = c5(cost * (1 + r.mk / 100)), floor = c5(cost + r.floor), stretch = c5(ideal * 1.08);
    if (floor >= ideal) floor = ideal - 5;
    return { cost: cost, floor: floor, ideal: ideal, stretch: stretch };
  }
  function itemOf(d) {
    var it = { svc: d.svc, qty: 1 };
    if (d.svc === 'skip') it.size = d.size;
    var q = Number(d.qty) || (QTY[d.svc] || [0, 1])[1];
    if (/grab|muck|aggregates/.test(d.svc)) it.qty = q;
    if (/welfare|container|toilet|plant/.test(d.svc)) it.weeks = q;
    if (d.svc === 'fencing') { it.panels = q; it.weeks = 4; }
    if (d.svc === 'sweeper') it.hours = q;
    if (d.svc === 'concrete') it.m3 = q;
    if (d.svc === 'container') it.ft = 20;
    return it;
  }
  function descOf(it) { var t = CS.itemText(it).replace(/^(an|a) /i, ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function agreed(custId, it) { var a = (S().agreed || {})[custId]; if (!a) return null; return a[it.svc + (it.size ? '-' + it.size : '')] || null; }
  /* what they paid last time for the same thing */
  function lastPaid(custId, it) {
    if (!custId) return null;
    return S().jobs.filter(function (j) { return j.cust === custId && j.svc === it.svc && (it.svc !== 'skip' || j.size === it.size); }).sort(function (a, b) { return b.day - a.day; })[0] || null;
  }
  /* quote history for the area: real quotes first, topped up with a steady sample so the demo always has some */
  function areaStats(out, svc, ideal) {
    var area = CS.area(out), seed = 0; (out + svc).split('').forEach(function (ch) { seed += ch.charCodeAt(0); });
    var n = 6 + seed % 7, won = Math.round(n * (0.55 + (seed % 4) * 0.07));
    return { n: n, won: won, avg: c5(ideal * (0.97 + (seed % 3) * 0.01)), area: area };
  }
  function offers(x, it) { if (it.svc !== 'skip') return true; var r = x.sup.rates.skip || {}; return Object.keys(r).some(function (k) { return Number(k) >= (it.size || 8); }); }
  function lookup(out, it) { return (CS.lookup(out, it) || []).filter(function (x) { return offers(x, it); }); }
  function whoFromPhone(ph) {
    var p = String(ph || '').replace(/\D/g, ''); if (p.length < 6) return null;
    var c = S().customers.filter(function (x) { return String(x.phone || '').replace(/\D/g, '') === p; })[0];
    if (c) return { type: 'customer', obj: c };
    var l = S().leads.filter(function (x) { return String(x.phone || '').replace(/\D/g, '') === p; })[0];
    if (l) return { type: 'lead', obj: l };
    return null;
  }

  /* ---------- the desk ---------- */
  function fresh(pre) {
    D = { ph: '', name: '', co: '', svc: 'skip', size: 8, qty: '', pc: '', road: false, day: 1, sup: null, sell: null, step: 'quote' };
    if (pre) Object.keys(pre).forEach(function (k) { D[k] = pre[k]; });
  }
  function dayLabel(n) { return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : CS.dayDate(n).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }); }
  function nextDays() { var o = [0, 1], d = 2; while (o.length < 5) { if ([0, 6].indexOf(CS.dayDate(d).getDay()) < 0) o.push(d); d++; } return o; }
  function calc() {
    var it = itemOf(D), out = CS.outward(D.pc), r = { it: it, out: out, list: [] };
    if (!out || !/^[A-Z]{1,2}\d/.test(out)) return r;
    r.list = lookup(out, it);
    var pick = r.list.filter(function (x) { return x.sup.id === D.sup; })[0] || r.list[0];
    r.pick = pick;
    if (pick) {
      r.lad = ladder(it.svc, pick.cost);
      if (D.road && it.svc === 'skip') { var pm = CS.permit(out); r.permit = pm; r.lad = { cost: r.lad.cost + pm.cost, floor: r.lad.floor + pm.sell, ideal: r.lad.ideal + pm.sell, stretch: r.lad.stretch + pm.sell }; }
      r.who = whoFromPhone(D.ph);
      r.agreed = r.who && r.who.type === 'customer' ? agreed(r.who.obj.id, it) : null;
      r.last = r.who && r.who.type === 'customer' ? lastPaid(r.who.obj.id, it) : null;
      r.stats = areaStats(out, it.svc, r.lad.ideal);
      r.sell = D.sell != null ? D.sell : (r.agreed ? r.agreed + (r.permit ? r.permit.sell : 0) : r.lad.ideal);
    }
    return r;
  }
  function whoLine() {
    var w = whoFromPhone(D.ph);
    if (!D.ph) return '<span class="muted">Type their number as you pick up. Known customers come up straight away.</span>';
    if (!w) return String(D.ph).replace(/\D/g, '').length >= 10 ? '<span class="tag brand">' + ic('user-plus') + 'New caller</span> <span class="muted">Saved as a lead the moment you quote. Put a name in.</span>' : '<span class="muted">Keep typing...</span>';
    if (w.type === 'customer') {
      var c = w.obj, cr = CS.credit(c.id, 0), live = S().jobs.filter(function (j) { return j.cust === c.id && j.status !== 'done'; }).length;
      return '<span class="tag ok">' + ic('user') + h(c.contact) + ', ' + h(c.name) + '</span> <span class="muted">' + c.sites.length + ' site' + (c.sites.length === 1 ? '' : 's') + ' · ' + live + ' live job' + (live === 1 ? '' : 's') + ' · ' + h(c.terms) + (cr.state === 'hold' ? '</span> <span class="tag bad">' + ic('lock') + 'On hold, ' + money(cr.owed) + ' owed' : '') + '</span>';
    }
    return '<span class="tag amber">' + ic('user-plus') + h(w.obj.contact) + ', ' + h(w.obj.company) + '</span> <span class="muted">Lead, ' + h(w.obj.stage) + '</span>';
  }
  function chip(act, v, on, label) { return '<button class="pk' + (on ? ' on' : '') + '" data-act="' + act + '" data-v="' + h(String(v)) + '">' + label + '</button>'; }
  function deskBody() {
    var q = QTY[D.svc];
    return '<div class="desk"><div class="dleft">' +
      '<div class="dsec"><div class="dlab">' + ic('phone') + 'Who\'s calling?</div><div class="grid g2"><div class="field"><input id="dkPh" placeholder="Their number" value="' + h(D.ph) + '" inputmode="tel" autocomplete="off"></div><div class="field"><input id="dkName" placeholder="Name and company" value="' + h(D.name) + '" autocomplete="off"></div></div><div id="dkWho" class="dwho">' + whoLine() + '</div></div>' +
      '<div class="dsec"><div class="dlab">' + ic('truck') + 'What do they need?</div><div class="chips">' + SVC_ORDER.map(function (k) { return chip('dkSvc', k, D.svc === k, h(CS.svc(k).short || CS.svc(k).name)); }).join('') + '</div>' +
      (D.svc === 'skip' ? '<div class="chips" style="margin-top:8px">' + SIZES.map(function (z) { return chip('dkSize', z, D.size === z, z >= 20 ? z + 'yd RoRo' : z + ' yard'); }).join('') + '</div>' :
        '<div class="field" style="margin-top:8px;max-width:200px"><label for="dkQty">' + q[0] + '</label><input id="dkQty" inputmode="numeric" value="' + h(D.qty || q[1]) + '"></div>') + '</div>' +
      '<div class="dsec"><div class="dlab">' + ic('map-pin') + 'Where?</div><div class="row" style="gap:8px;flex-wrap:wrap"><div class="field" style="margin:0;width:150px"><input id="dkPc" placeholder="Postcode, first bit is fine" value="' + h(D.pc) + '" autocomplete="off" style="text-transform:uppercase"></div>' +
      (D.svc === 'skip' ? chip('dkRoad', 0, !D.road, 'On the drive') + chip('dkRoad', 1, D.road, 'On the road (permit)') : '') + '</div></div>' +
      '<div class="dsec"><div class="dlab">' + ic('calendar') + 'When?</div><div class="chips">' + nextDays().map(function (n) { return chip('dkDay', n, D.day === n, dayLabel(n)); }).join('') + '</div></div>' +
      '</div><div class="dright" id="dkRes">' + resHtml() + '</div></div>';
  }
  function resHtml() {
    var r = calc();
    if (!r.out || !/^[A-Z]{1,2}\d/.test(r.out)) return '<div class="dempty">' + ic('search') + '<b>Put the postcode in</b><span>The first bit is enough. The buy price, your floor and your ideal price show here as you type.</span></div>';
    if (!r.pick) {
      var near = S().suppliers.filter(function (s) { return s.services.indexOf(r.it.svc) >= 0; }).slice(0, 3);
      return '<div class="dempty warn">' + ic('alert') + '<b>' + ((CS.lookup(r.out, r.it) || []).length ? 'No supplier on file does ' + h(CS.itemText(r.it)) + ' in ' + h(r.out) + ' yet' : 'Nobody on file covers ' + h(r.out) + ' for ' + h(CS.svc(r.it.svc).name.toLowerCase()) + ' yet') + '</b><span>Ask the nearest suppliers, and save the caller so you can ring back within the hour.</span>' +
        (near.length ? '<button class="btn pri" data-act="dkAskCover">' + ic('whatsapp') + 'Ask ' + near.length + ' suppliers if they cover ' + h(r.out) + '</button>' : '') + '</div>';
    }
    var L = r.lad, sell = r.sell, m = sell - L.cost, pc = CS.pct(m, sell);
    var band = sell < L.floor ? 'bad' : sell < L.ideal ? 'amber' : 'ok';
    var pos = Math.max(0, Math.min(100, Math.round((sell - L.floor + 20) / (L.stretch - L.floor + 40) * 100)));
    var su = r.pick.sup, alts = r.list.filter(function (x) { return x !== r.pick; }).slice(0, 2);
    var desc = descOf(r.it), say = 'Yes, ' + CS.itemText(r.it) + ' in ' + r.out + ' ' + dayLabel(D.day).toLowerCase() + ' is ' + money(sell) + ' plus VAT' + (r.permit ? ', permit included' : '') + '.';
    return '<div class="dbuy"><div><small>Buy from</small><b>' + h(su.name) + '</b><span class="muted">' + h(su.base) + ' · ' + su.onTime + '% on time · WTN back ' + (su.wtn || 'n/a') + (su.wtn ? '%' : '') + '</span></div><div class="r"><small>Cost</small><b class="num">' + money(L.cost) + '</b></div></div>' +
      (alts.length ? '<div class="dalts">' + alts.map(function (x) { return '<button class="pk sm" data-act="dkSup" data-v="' + x.sup.id + '">' + h(x.sup.name) + ' ' + money(x.cost) + ' · ' + x.sup.onTime + '%</button>'; }).join('') + '</div>' : '') +
      '<div class="ladder"><button data-act="dkSet" data-v="' + L.floor + '" class="lad bad"><small>Floor</small><b>' + money(L.floor) + '</b><span>don\'t go under</span></button><button data-act="dkSet" data-v="' + L.ideal + '" class="lad ok"><small>Ideal</small><b>' + money(L.ideal) + '</b><span>' + CS.pct(L.ideal - L.cost, L.ideal) + '% margin</span></button><button data-act="dkSet" data-v="' + L.stretch + '" class="lad brand"><small>Stretch</small><b>' + money(L.stretch) + '</b><span>anything over is bonus</span></button></div>' +
      '<div class="dsay"><label for="dkSell">Price you\'re giving them</label><div class="row" style="gap:10px;align-items:center"><span class="pfx">£</span><input id="dkSell" inputmode="numeric" value="' + sell + '"><span class="tag ' + band + '" id="dkMarg">' + money(m) + ' · ' + pc + '%</span></div>' +
      '<div class="meter dmeter"><i style="width:' + pos + '%;background:var(--' + (band === 'ok' ? 'ok' : band === 'amber' ? 'amber' : 'bad') + ')"></i></div>' +
      (sell < L.floor ? '<div class="note" style="background:var(--bad-l);margin-top:8px">' + ic('alert') + '<span><b>Under your floor.</b> If ' + h(CS.bde()) + ' quotes this, it comes to you to OK first.</span></div>' : '') + '</div>' +
      '<div class="dintel">' +
      (r.agreed ? '<div>' + ic('lock') + '<span><b>Agreed rate for ' + h(r.who.obj.name) + ': ' + money(r.agreed) + '.</b> From their account, used automatically' + (r.permit ? ', plus the permit' : '') + '.</span></div>' : '') +
      (r.last ? '<div>' + ic('clock') + '<span><b>Last time ' + h(r.who.obj.first) + ' paid ' + money(r.last.sell) + '</b> for this (' + r.last.id + ', ' + CS.fmtDay(r.last.day) + ').</span></div>' : '') +
      '<div>' + ic('trending-up') + '<span><b>' + r.out + ' area: won ' + r.stats.won + ' of the last ' + r.stats.n + ' ' + h(CS.svc(r.it.svc).short.toLowerCase()) + ' quotes</b>, average winning price ' + money(r.stats.avg) + '.</span></div>' +
      '</div>' +
      '<div class="dscript"><small>' + ic('message') + 'Say it like this</small>"' + h(say) + '"</div>';
  }
  function refreshRes() { var b = H.$('#dkRes'); if (b) b.innerHTML = resHtml(); var w = H.$('#dkWho'); if (w) w.innerHTML = whoLine(); }
  function deskFoot() {
    return '<button class="btn" data-act="dkDraft">' + ic('file-text') + '<span class="hide-sm">Save draft</span></button><span class="sp" style="flex:1"></span>' +
      '<button class="btn" data-act="dkSend" data-v="email">' + ic('mail') + 'Email it</button><button class="btn" data-act="dkSend" data-v="wa">' + ic('whatsapp') + 'WhatsApp it</button><button class="btn pri" data-act="dkBook">' + ic('check') + 'They said yes, book it</button>';
  }
  Q.open = function (pre) { if (!H) return; fresh(pre); H.A.closeSide(); H.modal('New quote', deskBody(), deskFoot(), true); setTimeout(function () { var f = H.$(D.ph ? '#dkPc' : '#dkPh'); if (f) f.focus(); }, 60); };
  function redraw() { var b = document.querySelector('#layer .modal .mbd'); if (b) b.innerHTML = deskBody(); else H.modal('New quote', deskBody(), deskFoot(), true); }

  /* who the quote is for: an existing customer, a lead, or a new caller saved as a lead */
  function party() {
    var w = whoFromPhone(D.ph);
    if (w && w.type === 'customer') return { type: 'customer', id: w.obj.id, first: w.obj.first, name: w.obj.name, contact: w.obj.contact, email: w.obj.email, phone: w.obj.phone };
    if (w && w.type === 'lead') return { type: 'lead', id: w.obj.id, first: w.obj.contact.split(' ')[0], name: w.obj.company, contact: w.obj.contact, phone: w.obj.phone };
    var nm = (D.name || 'New caller').split(',')[0].trim(), co = (D.name.split(',')[1] || '').trim() || nm;
    var id = 'l' + (S().counters.lead++);
    S().leads.unshift({ id: id, company: co, contact: nm, phone: D.ph || '', area: CS.outward(D.pc), type: 'Builder', source: 'Phone call', stage: 'quoted', value: 0, next: 2, nextWhat: 'Follow up the quote', last: 0, lastWhat: 'Quoted on the phone' });
    return { type: 'lead', id: id, first: nm.split(' ')[0], name: co, contact: nm, phone: D.ph, isNew: true };
  }
  function makeQuote(p, r, status) {
    var id = CS.nextId('quote', 'Q-');
    var q = { id: id, desc: descOf(r.it) + ', ' + r.out, sell: r.sell, cost: r.lad.cost, status: status, day: 0, owner: 'john', sup: r.pick.sup.id, pc: D.pc.toUpperCase(), fromDesk: true, item: CS.itemText(r.it), when: dayLabel(D.day), permit: !!r.permit };
    if (p.type === 'customer') q.cust = p.id; else q.lead = p.id;
    S().quotes.unshift(q);
    if (p.type === 'lead') { var l = CS.lead(p.id); l.stage = 'quoted'; l.value = r.sell; l.last = 0; l.lastWhat = 'Quote ' + id + ' ' + (status === 'sent' ? 'sent' : 'drafted'); l.next = 2; l.nextWhat = 'Follow up ' + id; }
    return q;
  }
  function quoteText(p, q, r, ch) {
    var lines = (ch === 'email' ? 'Hi ' + p.first + ',\n\nThanks for the call. Here\'s your price:\n\n' : 'Hi ' + p.first + ', thanks for the call. ') +
      descOf(r.it) + ' at ' + r.out + ', ' + dayLabel(D.day).toLowerCase() + ': ' + money(q.sell) + ' + VAT' + (r.permit ? ', council permit included' : '') + '.' +
      (ch === 'email' ? '\n\nThat includes delivery, collection and the waste transfer note. The price is held for 14 days. Accept it in one tap at cacwaste.co.uk/q/' + q.id + ', reply to this email, or call 0330 122 5711 and it\'s booked.\n\nCheers,\nJohn Pesci\nCAC Waste Management\nOne number for everything.' : ' Delivery, collection and the waste transfer note all in. Price held for 14 days. Tap to accept and it\'s booked: cacwaste.co.uk/q/' + q.id + ' Cheers, John');
    return lines;
  }
  function sendStep(ch) {
    var r = calc(); if (!r.pick) { H.toast('Put a postcode in that a supplier covers first', 'alert'); return; }
    D.ch = ch; var w = whoFromPhone(D.ph);
    var to = ch === 'email' ? (w && w.type === 'customer' ? w.obj.email : '') : (D.ph || (w && w.obj.phone) || '');
    var p = { first: (w ? (w.type === 'customer' ? w.obj.first : w.obj.contact.split(' ')[0]) : ((D.name || 'there').split(' ')[0])) };
    var b = document.querySelector('#layer .modal .mbd');
    var body = '<div class="field"><label for="dkTo">' + (ch === 'email' ? 'Their email' : 'Their WhatsApp number') + '</label><input id="dkTo" value="' + h(to) + '" placeholder="' + (ch === 'email' ? 'name@company.co.uk' : '07...') + '"></div>' +
      '<div class="field"><label for="dkMsg">' + (ch === 'email' ? 'Email, with the quote as a PDF under your logo' : 'WhatsApp message') + '</label><textarea id="dkMsg" rows="' + (ch === 'email' ? 10 : 5) + '">' + h(quoteText(p, { sell: r.sell, id: 'Q-' + S().counters.quote }, r, ch)) + '</textarea></div>' +
      (ch === 'email' ? '<div class="row" style="gap:8px"><span class="tag">' + ic('paperclip') + 'CAC-quote.pdf</span><span class="muted" style="font-size:12.5px">Logo, price, what\'s included, valid 14 days</span></div>' : '') +
      '<p class="muted" style="font-size:12.5px;margin:10px 0 0">If they don\'t answer in 2 days it comes up on Today: follow up, yes or no.</p>';
    H.modal(ch === 'email' ? 'Email the quote' : 'WhatsApp the quote', body, '<button class="btn" data-act="dkBack">Back</button><button class="btn pri" data-act="dkSendGo">' + ic('send') + 'Send</button>');
  }

  /* ---------- quotes gone quiet: yes or no ---------- */
  function quiet() { return S().quotes.filter(function (q) { return q.status === 'sent' && q.day <= -2 && !q.snoozed; }).sort(function (a, b) { return a.day - b.day; }); }
  Q.quietCard = function () {
    var l = quiet(); if (!l.length) return '';
    return '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('bell') + 'Quotes gone quiet. Follow up?</h2><span class="muted" style="font-size:12.5px">' + money(l.reduce(function (a, q) { return a + q.sell; }, 0)) + ' of work waiting on an answer</span></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
      l.slice(0, 4).map(function (q) {
        var p = CS.party(q.cust ? { type: 'customer', id: q.cust } : { type: 'lead', id: q.lead });
        return '<div class="rowline qq"><div class="bd"><b>' + h(p.sub || p.name) + ', ' + h(q.desc) + '</b><small>' + money(q.sell) + ', ' + money(q.sell - q.cost) + ' margin · quoted ' + (-q.day) + ' days ago' + (q.chased ? ' · chased ' + q.chased + 'x' : '') + '</small></div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-act="qYes" data-id="' + q.id + '">' + ic('whatsapp') + 'Yes, follow up</button><button class="btn sm" data-act="qWon" data-id="' + q.id + '">They booked</button><button class="btn sm" data-act="qLost" data-id="' + q.id + '">Lost</button><button class="btn sm" data-act="qLater" data-id="' + q.id + '">Not now</button></div></div>';
      }).join('') + '</div></div>';
  };

  Q.lostInsight = function () {
    var qs = S().quotes, won = qs.filter(function (q) { return q.status === 'won'; }), lost = qs.filter(function (q) { return q.status === 'lost'; });
    if (!lost.length) return '';
    var why = {}; lost.forEach(function (q) { var k = String(q.lostWhy || 'No reason').split(',')[0]; why[k] = (why[k] || 0) + 1; });
    var top = Object.keys(why).sort(function (a, b) { return why[b] - why[a]; })[0];
    var avg = function (l) { return l.length ? Math.round(l.reduce(function (a, q) { return a + CS.pct(q.sell - q.cost, q.sell); }, 0) / l.length) : 0; };
    return '<div class="card" style="margin-bottom:16px"><div class="bd"><div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-start"><span class="spark">' + ic('target') + '</span><div style="flex:1;min-width:240px"><b style="font-size:15px">Why you lose quotes</b>' +
      '<p class="muted" style="margin:4px 0 0;font-size:13px">Won ' + won.length + ', lost ' + lost.length + '. Top reason: <b>' + h(top) + '</b> (' + why[top] + '). Lost quotes averaged ' + avg(lost) + '% margin against ' + avg(won) + '% on the ones you won' + (avg(lost) > avg(won) ? ', so there was room to come down towards your floor on some of them.' : '. Price was not the gap on margin, so look at speed and the supplier.') + '</p></div>' +
      '<button class="btn" data-act="go" data-v="pricebook">' + ic('list') + 'Check your prices</button></div></div></div>';
  };

  /* ---------- price book ---------- */
  Q.priceBook = function () {
    var R = rules();
    var row = function (reg) {
      var out = reg[1];
      return '<tr><td><b>' + h(reg[0]) + '</b><small>' + out + ' and around</small></td>' + [4, 6, 8, 12, 16, 20, 40].map(function (z) {
        var b = lookup(out, { svc: 'skip', size: z, qty: 1 })[0];
        if (!b) return '<td class="r muted">n/a</td>';
        var L = ladder('skip', b.cost);
        return '<td class="r"><button class="pcell" data-act="pbCell" data-pc="' + out + '" data-z="' + z + '"><b>' + money(L.ideal) + '</b><small>buy ' + money(b.cost) + '</small></button></td>';
      }).join('') + '</tr>';
    };
    return '<div class="grid g3 kpis" style="margin-bottom:16px">' +
      '<button class="card kpi" data-act="upload" data-v="supplier"><small>' + ic('download') + 'Supplier price list</small><b style="font-size:17px">Upload one</b><span class="d">PDF, Excel, a photo or forward the email. It reads every price in.</span></button>' +
      '<button class="card kpi" data-act="upload" data-v="customer"><small>' + ic('lock') + 'A customer\'s agreed rates</small><b style="font-size:17px">Upload one</b><span class="d">Their trade rates, used automatically on every quote for them.</span></button>' +
      '<button class="card kpi hero" data-act="desk"><small>' + ic('plus') + 'On the phone now?</small><b style="font-size:17px">New quote</b><span class="d">Postcode and size. The price is there before they finish asking.</span></button></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="hd"><h2>' + ic('list') + 'Your skip prices, every area</h2><span class="muted" style="font-size:12.5px">Ideal price from today\'s best supplier and your rules. Tap any price to quote it.</span></div><div class="tw"><table class="t pbook"><thead><tr><th>Area</th>' + [4, 6, 8, 12, 16, 20, 40].map(function (z) { return '<th class="r">' + (z >= 20 ? z + 'yd RoRo' : z + ' yard') + '</th>'; }).join('') + '</tr></thead><tbody>' + REGIONS.map(row).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="hd"><h2>' + ic('settings') + 'Your pricing rules</h2><span class="muted" style="font-size:12.5px">Change a number and every price in the system follows</span></div><div class="tw"><table class="t"><thead><tr><th>Service</th><th class="r">Ideal markup</th><th class="r">Floor, at least</th><th class="hide-sm">Means</th></tr></thead><tbody>' +
      SVC_ORDER.map(function (k) {
        var r = R[k]; var ex = k === 'skip' ? (function () { var b = (CS.lookup('PE31', { svc: 'skip', size: 8, qty: 1 }) || [])[0]; if (!b) return ''; var L = ladder('skip', b.cost); return 'PE31 8 yard: buy ' + money(L.cost) + ', floor ' + money(L.floor) + ', ideal ' + money(L.ideal) + ', stretch ' + money(L.stretch); })() : '';
        return '<tr><td><b>' + h(CS.svc(k).name) + '</b></td><td class="r"><input class="rin" data-rule="mk" data-k="' + k + '" value="' + r.mk + '" inputmode="numeric" aria-label="' + h(CS.svc(k).name) + ' markup"> %</td><td class="r">£ <input class="rin" data-rule="floor" data-k="' + k + '" value="' + r.floor + '" inputmode="numeric" aria-label="' + h(CS.svc(k).name) + ' floor"></td><td class="hide-sm"><small class="muted">' + h(ex) + '</small></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  };
  function uploadBody(kind) {
    return '<label class="drop" for="upFile">' + ic('download') + '<b>Drop the ' + (kind === 'supplier' ? 'supplier\'s price list' : 'customer\'s rate sheet') + ' here</b><span>PDF, Excel, CSV or a photo. Or forward the email to prices@cacwaste.co.uk.</span><input type="file" id="upFile" accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg" hidden></label>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">No file to hand?</span><button class="btn sm" data-act="upSample" data-v="' + kind + '">' + ic('file-text') + 'Try the sample: ' + (kind === 'supplier' ? 'Ringmere Skip Hire, prices from 1 Jan.pdf' : 'Pellow Homes agreed rates.xlsx') + '</button></div><div id="upRes" style="margin-top:12px"></div>';
  }
  function upResult(kind) {
    if (kind === 'supplier') {
      var su = CS.sup('s13'), sk = su.rates.skip, ch = { 8: 10, 10: 10, 12: 10 };
      return '<div class="note" style="background:var(--ok-l)">' + ic('circle-check') + '<span><b>Read 9 prices from Ringmere Skip Hire.</b> 3 go up £10 from 1 January. Every open quote using them is checked.</span></div>' +
        '<table class="dt" style="margin-top:10px"><thead><tr><th>Size</th><th class="r">Now</th><th class="r">From 1 Jan</th><th class="r">Change</th></tr></thead><tbody>' + Object.keys(sk).map(function (z) { var up = ch[z] || 0; return '<tr><td>' + (z >= 20 ? z + 'yd RoRo' : z + ' yard') + '</td><td class="r">' + money(sk[z]) + '</td><td class="r">' + money(sk[z] + up) + '</td><td class="r">' + (up ? '<span class="tag amber">+' + money(up) + '</span>' : '<span class="muted">same</span>') + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn pri" data-act="upApply" data-v="supplier">' + ic('check') + 'Update Ringmere\'s rates</button></div>';
    }
    return '<div class="note" style="background:var(--ok-l)">' + ic('circle-check') + '<span><b>Read 3 agreed rates for Pellow Homes.</b> Every quote for Kerry uses these from now on, with your margin shown against them.</span></div>' +
      '<table class="dt" style="margin-top:10px"><thead><tr><th>Service</th><th class="r">Agreed price</th></tr></thead><tbody><tr><td>8 yard skip</td><td class="r">£265</td></tr><tr><td>12 yard skip</td><td class="r">£335</td></tr><tr><td>20 yard RoRo</td><td class="r">£525</td></tr></tbody></table>' +
      '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn pri" data-act="upApply" data-v="customer">' + ic('check') + 'Save to Pellow Homes\' account</button></div>';
  }

  /* ---------- Ask CAC ---------- */
  var ASK_SUGG = ['how much is an 8 yard skip in B23?', 'who owes me money?', 'which skips have been out longest?', 'margin this month?', 'any WTNs missing?', 'who covers NR3 for grabs?'];
  function answer(q) {
    var lo = q.toLowerCase(), st = CS.stats(), ch = CS.chaseLists();
    if (/owe|overdue|debt|unpaid|chase.*pay/.test(lo)) {
      return { t: ch.pay.length ? money(st.overdue) + ' is overdue across ' + ch.pay.length + ' invoices.' : 'Nothing overdue. Everyone\'s paid up.', rows: ch.pay.slice(0, 5).map(function (i) { return [CS.cust(i.cust).name, i.id + ', ' + (-i.due) + ' days late', money(i.amount)]; }), act: ch.pay.length ? ['go', 'chasing', 'Send the reminders'] : null };
    }
    if (/longest|on hire|sat|sitting|been out/.test(lo)) {
      var on = S().jobs.filter(function (j) { return j.status === 'onhire' && j.svc === 'skip'; }).sort(function (a, b) { return a.day - b.day; });
      return { t: on.length + ' skips on hire. The longest has been out ' + (on[0] ? -on[0].day : 0) + ' days.', rows: on.slice(0, 5).map(function (j) { return [CS.cust(j.cust).name, CS.jobDesc(j) + ' at ' + CS.jobSite(j).name, (-j.day) + ' days']; }), act: ['go', 'chasing', 'Nudge them'] };
    }
    if (/wtn|transfer note/.test(lo)) {
      return { t: ch.wtn.length ? ch.wtn.length + ' transfer notes still to come back. Each one is being chased.' : 'Every transfer note is in.', rows: ch.wtn.slice(0, 5).map(function (j) { return [CS.sup(j.sup).name, j.id + ', ' + CS.cust(j.cust).name, j.wtn === 'chased' ? 'chased' : 'missing']; }), act: ['go', 'paperwork', 'Open duty of care'] };
    }
    if (/margin|profit|made/.test(lo)) {
      var mtd = S().months[S().months.length - 1], by = {};
      S().jobs.forEach(function (j) { var c = CS.cust(j.cust); by[c.name] = (by[c.name] || 0) + j.sell - j.cost; });
      var top = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 4);
      return { t: money(mtd.margin) + ' margin booked this month on ' + money(mtd.rev) + ' of sales, ' + CS.pct(mtd.margin, mtd.rev) + '%.', rows: top.map(function (n) { return [n, 'margin on the books', money(by[n])]; }), act: ['go', 'money', 'Open money'] };
    }
    var p = CS.parse(q, {});
    var pcm = /\b([A-Z]{1,2}\d[A-Z\d]?)\b/i.exec(q);
    if (p.items.length && pcm) {
      var it = p.items[0], out = pcm[1].toUpperCase();
      var cover = /who covers|supplier for|who does/.test(lo);
      var list = lookup(out, it);
      if (!list.length) return { t: ((CS.lookup(out, it) || []).length ? 'No supplier on file does ' + CS.itemText(it) + ' in ' + out + ' yet.' : 'Nobody on file covers ' + out + ' for ' + CS.svc(it.svc).name.toLowerCase() + ' yet.') + ' Start a quote and it\'ll ask the nearest suppliers.', rows: [], act: ['deskPre', out + '|' + it.svc + '|' + (it.size || 8), 'Start a quote'] };
      var L = ladder(it.svc, list[0].cost);
      if (cover) return { t: list.length + (list.length === 1 ? ' supplier covers ' : ' suppliers cover ') + out + ' for ' + CS.svc(it.svc).name.toLowerCase() + '.', rows: list.slice(0, 4).map(function (x) { return [x.sup.name, x.sup.base + ', ' + x.sup.onTime + '% on time', money(x.cost)]; }), act: ['deskPre', out + '|' + it.svc + '|' + (it.size || 8), 'Start a quote'] };
      return { t: descOf(it) + ' in ' + out + ': buy ' + money(L.cost) + ' from ' + list[0].sup.name + '. Sell at ' + money(L.ideal) + ', floor ' + money(L.floor) + ', stretch ' + money(L.stretch) + '.', rows: list.slice(0, 3).map(function (x) { return [x.sup.name, x.sup.base + ', ' + x.sup.onTime + '% on time', money(x.cost)]; }), act: ['deskPre', out + '|' + it.svc + '|' + (it.size || 8), 'Quote it'] };
    }
    if (/quote/.test(lo)) {
      var open = S().quotes.filter(function (x) { return x.status === 'sent'; });
      return { t: open.length + ' quotes out, ' + money(open.reduce(function (a, x) { return a + x.sell; }, 0)) + ' of work. ' + quiet().length + ' have gone quiet.', rows: open.slice(0, 5).map(function (x) { return [x.id, x.desc, money(x.sell)]; }), act: ['go', 'quotes', 'Open quotes'] };
    }
    return { t: 'In the live build this goes to an AI model that reads your jobs, quotes, invoices and suppliers, so you can ask it anything. In the demo, try one of these.', rows: [], act: null };
  }
  function askBody(q) {
    var a = q ? answer(q) : null;
    return '<div class="askin"><span class="spark">' + ic('sparkles') + '</span><input id="askQ" placeholder="Ask about prices, money, skips, paperwork..." value="' + h(q || '') + '" autocomplete="off"><button class="btn pri" data-act="askGo">Ask</button></div>' +
      '<div class="chips" style="margin:10px 0 4px">' + ASK_SUGG.map(function (s) { return '<button class="pk sm" data-act="askSugg" data-v="' + h(s) + '">' + h(s) + '</button>'; }).join('') + '</div>' +
      (a ? '<div class="askans"><p>' + h(a.t) + '</p>' + (a.rows.length ? '<table class="dt"><tbody>' + a.rows.map(function (r) { return '<tr><td><b>' + h(r[0]) + '</b><small>' + h(r[1]) + '</small></td><td class="r">' + h(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
        (a.act ? '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn pri" data-act="askAct" data-k="' + a.act[0] + '" data-v="' + h(a.act[1]) + '">' + h(a.act[2]) + ic('arrow-right') + '</button></div>' : '') + '</div>' : '') +
      '<p class="muted" style="font-size:12px;margin:10px 0 0">Demo answers come from the sample data by simple rules. Live, an AI model reads your own records and answers in plain English. It reads and suggests, it never sends on its own.</p>';
  }

  /* ---------- wiring ---------- */
  Q.init = function (o) {
    H = o; var A = H.A, V = H.V; rules();
    S().agreed = S().agreed || { c1: { 'skip-8': 270 } };
    V.pricebook = Q.priceBook;
    var todayV = V.today; V.today = function () { return Q.quietCard() + todayV(); };
    var quotesV = V.quotes; V.quotes = function () { return Q.quietCard() + Q.lostInsight() + quotesV(); };
    var supV = V.suppliers; V.suppliers = function () { return '<div class="row" style="margin-bottom:14px;flex-wrap:wrap;gap:10px"><div style="flex:1;min-width:220px"><b style="font-size:15px">New price list from a supplier?</b><span class="muted" style="font-size:13px;display:block">Upload it or forward the email. Every price is read in and checked against your open quotes.</span></div><button class="btn" data-act="upload" data-v="supplier">' + ic('download') + 'Upload a price list</button></div>' + supV(); };
    var fab = document.createElement('button'); fab.className = 'fab'; fab.setAttribute('data-act', 'desk'); fab.setAttribute('aria-label', 'New quote'); fab.innerHTML = ic('plus') + '<span>New quote</span>'; document.body.appendChild(fab);

    A.desk = function () { Q.open(); };
    A.dkSvc = function (el) { D.svc = el.dataset.v; D.qty = ''; D.sup = null; D.sell = null; redraw(); };
    A.dkSize = function (el) { D.size = Number(el.dataset.v); D.sup = null; D.sell = null; redraw(); };
    A.dkRoad = function (el) { D.road = el.dataset.v === '1'; D.sell = null; redraw(); };
    A.dkDay = function (el) { D.day = Number(el.dataset.v); redraw(); };
    A.dkSup = function (el) { D.sup = el.dataset.v; D.sell = null; refreshRes(); };
    A.dkSet = function (el) { D.sell = Number(el.dataset.v); refreshRes(); };
    A.dkAskCover = function () {
      var r = calc(), near = S().suppliers.filter(function (s) { return s.services.indexOf(r.it.svc) >= 0; }).slice(0, 3);
      near.forEach(function (s) { var t = CS.threadFor({ type: 'supplier', id: s.id }, 'wa'); CS.addMsg(t, 'out', 'Hi ' + s.contact + ', do you cover ' + r.out + ' for ' + CS.itemText(r.it) + '? If so what\'s your price? Thanks, John (CAC)', { by: 'John' }); });
      var p = party(); CS.saved(8); CS.commit();
      H.closeLayer(); H.toast('Asked ' + near.length + ' suppliers about ' + h(r.out) + '. ' + h(p.contact) + ' is saved, their answers land in the inbox.', 'whatsapp');
    };
    A.dkDraft = function () { var r = calc(); if (!r.pick) { H.toast('Put a postcode in that a supplier covers first', 'alert'); return; } var p = party(), q = makeQuote(p, r, 'draft'); CS.commit(); H.closeLayer(); H.toast(q.id + ' saved for ' + h(p.name) + '. It\'s in Quotes when you\'re ready.', 'file-text', { act: 'openQuote', id: q.id, label: 'Open' }); };
    A.dkSend = function (el) { sendStep(el.dataset.v); };
    A.dkBack = function () { H.modal('New quote', deskBody(), deskFoot(), true); };
    A.dkSendGo = function () {
      var r = calc(), ch = D.ch, to = (H.$('#dkTo').value || '').trim(), msg = H.$('#dkMsg').value;
      if (!to) { H.toast(ch === 'email' ? 'Put their email in' : 'Put their number in', 'alert'); return; }
      if (ch === 'wa' && !D.ph) D.ph = to;
      var p = party(), q = makeQuote(p, r, 'sent');
      if (p.type === 'lead' && ch === 'wa') CS.lead(p.id).phone = to;
      var t = CS.threadFor({ type: p.type, id: p.id }, ch === 'email' ? 'email' : 'wa'); if (ch === 'email') t.subject = 'Your quote from CAC, ' + q.id;
      CS.addMsg(t, 'out', msg, { by: 'John', att: ch === 'email' ? [{ n: 'CAC-quote-' + q.id + '.pdf', t: 'doc' }] : null });
      CS.feed('Quote ' + q.id + ' sent to ' + p.name, 'file-text'); CS.saved(6); CS.commit(); H.closeLayer();
      H.toast(q.id + ' ' + (ch === 'email' ? 'emailed' : 'sent on WhatsApp') + ' to ' + h(p.first) + '. If it goes quiet for 2 days, it asks you to follow up.', 'send', { act: 'quoteView', id: q.id, label: 'See their view' });
    };
    A.dkBook = function () {
      var r = calc(); if (!r.pick) { H.toast('Put a postcode in that a supplier covers first', 'alert'); return; }
      var w = whoFromPhone(D.ph), c;
      if (w && w.type === 'customer') c = w.obj;
      else {
        var nm = (D.name || 'New caller').split(',')[0].trim(), co = (D.name.split(',')[1] || '').trim() || nm;
        c = { id: 'c' + (S().customers.length + 40), limit: 0, name: co, contact: nm, first: nm.split(' ')[0], phone: D.ph, email: '', type: 'Builder', terms: 'Card on order', owner: 'john', sites: [{ name: CS.outward(D.pc), pc: D.pc.toUpperCase() }] };
        S().customers.push(c);
      }
      var q = makeQuote({ type: 'customer', id: c.id }, r, 'won');
      var id = CS.nextId('job', 'CAC-'), su = r.pick.sup;
      var j = { id: id, cust: c.id, site: null, siteName: D.pc.toUpperCase(), pc: D.pc.toUpperCase(), svc: r.it.svc, size: r.it.size, qty: r.it.qty || 1, weeks: r.it.weeks, panels: r.it.panels, ft: r.it.ft, m3: r.it.m3, hours: r.it.hours,
        sup: su.id, cost: r.lad.cost, sell: r.sell, status: 'booked', day: D.day, bookedAt: Date.now(), wtn: /skip|grab|muck/.test(r.it.svc) ? 'pending' : null, owner: 'john', log: [], permit: !!r.permit };
      CS.jobLog(j, 'Booked on the phone from ' + q.id); S().jobs.push(j); q.job = id;
      var ts = CS.threadFor({ type: 'supplier', id: su.id }, 'wa');
      CS.addMsg(ts, 'out', 'Hi ' + su.contact + ', ' + CS.itemText(r.it) + ' for ' + c.name + ', ' + D.pc.toUpperCase() + ', ' + dayLabel(D.day).toLowerCase() + (r.permit ? ', on the road so permit needed' : '') + ' please. Ref ' + id + '. Thanks, John (CAC)', { by: 'John' });
      var tc = CS.threadFor({ type: 'customer', id: c.id }, 'wa');
      CS.addMsg(tc, 'out', 'Hi ' + c.first + ', that\'s booked: ' + CS.itemText(r.it) + ' at ' + D.pc.toUpperCase() + ', ' + dayLabel(D.day).toLowerCase() + ', ' + money(r.sell) + ' + VAT. Ref ' + id + '. I\'ll confirm the window once the driver\'s allocated. Cheers, John', { by: 'John' });
      CS.feed('Booked ' + id + ' on the phone for ' + c.name, 'truck'); CS.saved(9); CS.commit(); H.closeLayer();
      H.toast(id + ' booked with ' + h(su.name) + ' and ' + h(c.first) + ' has the confirmation. Being chased until it\'s confirmed.', 'truck', { act: 'openJob', id: id, label: 'Open' });
    };
    A.qYes = function (el) { CS.chaseQuote(el.dataset.id); CS.quote(el.dataset.id).day = Math.min(CS.quote(el.dataset.id).day, -2); CS.quote(el.dataset.id).snoozed = true; CS.commit(); H.toast('Followed up on WhatsApp. If they reply it lands in the inbox.', 'whatsapp'); };
    A.qWon = function (el) { var q = CS.quote(el.dataset.id); q.status = 'won'; CS.commit(); H.toast(q.id + ' marked won. Book it from the inbox when they confirm the day.', 'check'); };
    A.qLater = function (el) { CS.quote(el.dataset.id).snoozed = true; CS.commit(); H.toast('Left for now. It comes back tomorrow.', 'clock'); };
    A.qLost = function (el) {
      var id = el.dataset.id;
      H.modal('Why was ' + id + ' lost?', '<p class="muted" style="margin:0 0 10px;font-size:13px">One tap. Over a month it shows you where you lose work, by area and by supplier.</p><div class="chips">' + ['Price', 'Went direct to a skip firm', 'Timing, couldn\'t do the day', 'No reply', 'Job fell through'].map(function (r) { return '<button class="pk" data-act="qLostWhy" data-id="' + id + '" data-v="' + h(r) + '">' + h(r) + '</button>'; }).join('') + '</div>', '<button class="btn" data-act="close">Cancel</button>');
    };
    A.qLostWhy = function (el) { var q = CS.quote(el.dataset.id); q.status = 'lost'; q.lostWhy = el.dataset.v; CS.commit(); H.closeLayer(); H.toast(q.id + ' lost: ' + h(el.dataset.v.toLowerCase()) + '. Noted against the area and the supplier.', 'check'); };
    A.quoteView = function (el) { H.openPhone('portal.html?q=' + encodeURIComponent(el.dataset.id), 'What the customer sees'); };
    A.pbCell = function (el) { Q.open({ pc: el.dataset.pc, svc: 'skip', size: Number(el.dataset.z) }); };
    A.upload = function (el) { H.modal(el.dataset.v === 'supplier' ? 'Upload a supplier price list' : 'Upload a customer\'s agreed rates', uploadBody(el.dataset.v)); };
    A.upSample = function (el) { var b = H.$('#upRes'); if (!b) return; b.innerHTML = '<div class="note">' + ic('clock') + '<span>Reading the prices...</span></div>'; setTimeout(function () { var x = H.$('#upRes'); if (x) x.innerHTML = upResult(el.dataset.v); }, 900); };
    A.upApply = function (el) {
      if (el.dataset.v === 'supplier') { var sk = CS.sup('s13').rates.skip; [8, 10, 12].forEach(function (z) { sk[z] += 10; }); CS.feed('Ringmere Skip Hire price list read in, 3 rates up £10', 'warehouse'); H.toast('Ringmere\'s rates updated. Quotes and the price book follow.', 'warehouse'); }
      else { S().agreed = S().agreed || {}; S().agreed.c2 = { 'skip-8': 265, 'skip-12': 335, 'skip-20': 525 }; CS.feed('Agreed rates saved for Pellow Homes', 'lock'); H.toast('Pellow Homes\' agreed rates saved. Every quote for Kerry uses them.', 'lock'); }
      CS.saved(20); CS.commit(); H.closeLayer();
    };
    A.ask = function () { H.A.closeSide(); H.modal('Ask CAC', askBody(''), null, true); setTimeout(function () { var i = H.$('#askQ'); if (i) i.focus(); }, 60); };
    A.askSugg = function (el) { var b = document.querySelector('#layer .modal .mbd'); if (b) b.innerHTML = askBody(el.dataset.v); };
    A.askGo = function () { var v = (H.$('#askQ') || {}).value || ''; var b = document.querySelector('#layer .modal .mbd'); if (b) b.innerHTML = askBody(v.trim()); };
    A.askAct = function (el) {
      if (el.dataset.k === 'go') { H.closeLayer(); H.go(el.dataset.v); return; }
      var p = el.dataset.v.split('|'); Q.open({ pc: p[0], svc: p[1], size: Number(p[2]) || 8 });
    };

    document.addEventListener('input', function (e) {
      var el = e.target; if (!D) return;
      if (el.id === 'dkPh') { D.ph = el.value; D.sell = null; refreshRes(); }
      if (el.id === 'dkName') D.name = el.value;
      if (el.id === 'dkPc') { D.pc = el.value; D.sup = null; D.sell = null; refreshRes(); }
      if (el.id === 'dkQty') { D.qty = el.value; D.sell = null; refreshRes(); }
      if (el.id === 'dkSell') {
        var v = parseFloat(String(el.value).replace(/[^\d.]/g, '')); if (isNaN(v)) return; D.sell = v;
        var pos = el.selectionStart; refreshRes(); var n = H.$('#dkSell'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} }
      }
      if (el.classList.contains('rin')) {
        var x = parseFloat(el.value); if (isNaN(x) || x < 0) return; rules()[el.dataset.k][el.dataset.rule] = x; CS.save();
        var k = el.dataset.k, rl = el.dataset.rule; clearTimeout(Q._t); Q._t = setTimeout(function () { H.render(); var f = document.querySelector('.rin[data-k="' + k + '"][data-rule="' + rl + '"]'); if (f) { f.focus(); var l = f.value.length; try { f.setSelectionRange(l, l); } catch (er) {} } }, 400);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id === 'askQ') { e.preventDefault(); A.askGo(); }
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'q' || e.key === 'n') && !document.querySelector('#layer .modal')) { e.preventDefault(); Q.open(); }
      if (e.key === '/' && !document.querySelector('#layer .modal')) { e.preventDefault(); A.ask(); }
    });
    document.addEventListener('change', function (e) {
      if (e.target.id === 'upFile' && e.target.files && e.target.files[0]) {
        var kind = /rate|agreed/i.test(e.target.files[0].name) ? 'customer' : 'supplier'; var b = H.$('#upRes');
        if (b) { b.innerHTML = '<div class="note">' + ic('clock') + '<span>Reading ' + h(e.target.files[0].name) + '...</span></div>'; setTimeout(function () { var x = H.$('#upRes'); if (x) x.innerHTML = '<p class="muted" style="font-size:12.5px;margin:0 0 8px">Demo: your file stays on your computer. Here\'s what a read looks like, using the sample.</p>' + upResult(kind); }, 1100); }
      }
    });
  };
})();
