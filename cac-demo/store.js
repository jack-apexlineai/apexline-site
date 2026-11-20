/* CAC demo store: state in this browser only, the message reader, supplier lookup, pricing, drafts and approvals.
   Nothing is ever sent anywhere. "Send" in this demo only adds the message to the screen. */
(function () {
  var KEY = 'cac-demo-v3', LKEY = 'cac-demo-leader';
  var CS = window.CS = {};
  var listeners = [];
  var ME = Math.random().toString(36).slice(2);
  CS.me = ME;

  /* ---------- dates and formatting ---------- */
  function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  CS.dayDate = function (off) { var d = today0(); d.setDate(d.getDate() + (off || 0)); return d; };
  CS.fmtDay = function (off) {
    if (off === 0) return 'Today'; if (off === 1) return 'Tomorrow'; if (off === -1) return 'Yesterday';
    var d = CS.dayDate(off); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  };
  /* n working days from today (skips Saturday and Sunday) */
  CS.wd = function (n) {
    if (!n) return 0; var d = 0, c = 0, st = n > 0 ? 1 : -1;
    while (c < Math.abs(n)) { d += st; var w = CS.dayDate(d).getDay(); if (w !== 0 && w !== 6) c++; }
    return d;
  };
  CS.dayPhrase = function (off) { if (off === 0) return 'today'; if (off === 1) return 'tomorrow'; return 'on ' + CS.fmtDay(off); };
  CS.fmtDayLong = function (off) {
    var d = CS.dayDate(off); var s = DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
    if (off === 0) return 'today (' + s + ')'; if (off === 1) return 'tomorrow (' + s + ')'; return s;
  };
  CS.ago = function (ts) {
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'now'; if (m < 60) return m + ' min';
    var d = new Date(ts), t0 = today0();
    if (d >= t0) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var y = new Date(t0); y.setDate(y.getDate() - 1); if (d >= y) return 'Yesterday';
    return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  };
  CS.clock = function (ts) { var d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  CS.money = function (n, dp) {
    n = Number(n) || 0; var neg = n < 0; n = Math.abs(n);
    var s = n.toLocaleString('en-GB', { minimumFractionDigits: dp ? 2 : 0, maximumFractionDigits: dp ? 2 : 0 });
    return (neg ? '-' : '') + '£' + s;
  };
  CS.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  CS.pct = function (m, s) { return s ? Math.round(m / s * 100) : 0; };
  CS.initials = function (n) { return String(n || '?').replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); };

  /* ---------- state ---------- */
  function seed() {
    var s = window.SEED();
    var now = Date.now();
    s.seededDay = dayKey(new Date()); s.t0 = now; s.liveT0 = null;
    s.jobs.forEach(function (j) { ['day', 'exDay', 'colDay'].forEach(function (k) { if (j[k] != null) j[k] = CS.wd(j[k]); }); });
    s.rateChange.fromDay = CS.wd(s.rateChange.fromDay);
    s.permits.forEach(function (pm) { if (pm.to != null) pm.to = CS.wd(pm.to); });
    s.leaks.forEach(function (l) { l.status = 'open'; });
    s.leads.forEach(function (l) { if (l.next != null) l.next = CS.wd(l.next); if (l.last != null) l.last = CS.wd(l.last); });
    s.quotes.forEach(function (q) { q.day = CS.wd(q.day); });
    var CAS = ['sun', 'mon', 'tues', 'weds', 'thurs', 'fri', 'sat'];
    function toks(x) { return x.replace(/\{BDE\}/g, 'Sam').replace(/\{WDN:(-?\d+)\}/g, function (_, n) { return CAS[CS.dayDate(CS.wd(parseInt(n, 10))).getDay()]; }); }
    s.live.forEach(function (L) { L.text = toks(L.text); });
    s.threads.forEach(function (t) {
      t.msgs.forEach(function (m) {
        m.at = now - m.mins * 60000; delete m.mins; m.text = toks(m.text); if (m.by) m.by = toks(m.by);
        if (m.yclock) { var y = CS.dayDate(-1); var hm = m.yclock.split(':'); y.setHours(+hm[0], +hm[1], 0, 0); m.at = y.getTime(); delete m.yclock; }
      });
      t.last = t.msgs[t.msgs.length - 1].at;
    });
    s.jobs.forEach(function (j) {
      j.log = [{ at: now - 86400000 * Math.max(1, -j.day + 1), t: 'Booked with ' + supName(s, j.sup) }];
      if (j.bookedMins) j.bookedAt = now - j.bookedMins * 60000;
      if (j.status !== 'booked') j.log.push({ at: now - 86400000 * Math.max(0.5, -j.day + 0.5), t: 'Supplier confirmed' });
      if (j.wtn === 'received') j.log.push({ at: now - 86400000 * Math.max(0.2, -j.day), t: 'WTN received and filed' });
    });
    s.feed = [
      { at: now - 26 * 60000, t: 'Read Saltmarsh\'s email and matched the WTN to CAC-1043', ic: 'sparkles' },
      { at: now - 85 * 60000, t: 'Fenreach confirmed the grab for Dunmore at Snettisham, 8am', ic: 'circle-check' },
      { at: now - 120 * 60000, t: 'Auto chase sent to Quayline Skips for CAC-1047', ic: 'bell' },
      { at: now - 200 * 60000, t: CS.bde() + ' sent Q-2230 to Kilner Builders, won 40 min later', ic: 'trending-up' }
    ];
    return s;
  }
  function supName(s, id) { var x = (s.suppliers || []).filter(function (q) { return q.id === id; })[0]; return x ? x.name : 'supplier'; }

  CS.load = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || s.seededDay !== dayKey(new Date()) || !s.threads) { s = seed(); CS.S = s; CS.save(); }
    CS.S = s;
    return s;
  };
  CS.save = function () { try { localStorage.setItem(KEY, JSON.stringify(CS.S)); } catch (e) {} };
  CS.reset = function () { CS.S = seed(); CS.save(); CS.emit(); };
  CS.bde = function () { return (CS.S && CS.S.settings && CS.S.settings.bde) || 'Sam'; };
  CS.renameBde = function (name) {
    name = String(name || '').trim().split(/\s+/)[0]; if (!name) return;
    var old = CS.bde(); if (old === name) return;
    var re = new RegExp('\\b' + old + '\\b', 'g');
    CS.S.threads.forEach(function (t) { t.msgs.forEach(function (m) { if (m.by === old) m.by = name; if (m.dir === 'out') m.text = m.text.replace(re, name); }); });
    CS.S.feed.forEach(function (f) { f.t = f.t.replace(re, name); });
    CS.S.settings.bde = name;
  };
  CS.on = function (fn) { listeners.push(fn); };
  CS.emit = function (why) { listeners.forEach(function (fn) { try { fn(why); } catch (e) { if (window.console) console.error(e); } }); };
  CS.commit = function (why) { CS.save(); CS.emit(why); };
  window.addEventListener('storage', function (e) { if (e.key === KEY) { CS.load(); CS.emit('sync'); } });

  /* ---------- lookups ---------- */
  CS.cust = function (id) { return CS.S.customers.filter(function (c) { return c.id === id; })[0]; };
  CS.sup = function (id) { return CS.S.suppliers.filter(function (c) { return c.id === id; })[0]; };
  CS.job = function (id) { return CS.S.jobs.filter(function (c) { return c.id === id; })[0]; };
  CS.lead = function (id) { return CS.S.leads.filter(function (c) { return c.id === id; })[0]; };
  CS.inv = function (id) { return CS.S.invoices.filter(function (c) { return c.id === id; })[0]; };
  CS.quote = function (id) { return CS.S.quotes.filter(function (c) { return c.id === id; })[0]; };
  CS.thread = function (id) { return CS.S.threads.filter(function (c) { return c.id === id; })[0]; };
  CS.svc = function (k) { return CS.S.services[k] || { name: k, short: k, icon: 'truck' }; };
  CS.party = function (p) {
    if (!p) return { name: 'Unknown', sub: '', first: 'there' };
    if (p.type === 'customer') { var c = CS.cust(p.id); return { name: c.contact, sub: c.name, first: c.first, kind: 'Customer', obj: c, phone: c.phone, email: c.email }; }
    if (p.type === 'supplier') { var s = CS.sup(p.id); return { name: s.name, sub: s.contact + ', ' + s.base, first: s.contact, kind: 'Supplier', obj: s, phone: s.phone }; }
    if (p.type === 'lead') { var l = CS.lead(p.id); return { name: l.contact, sub: l.company, first: l.contact.split(' ')[0], kind: 'New lead', obj: l }; }
    return { name: p.contact || 'New number', sub: p.company || '', first: (p.contact || 'there').split(' ')[0], kind: 'New contact' };
  };
  CS.jobSite = function (j) { var c = CS.cust(j.cust); var s = c && j.site != null && c.sites[j.site]; return s || { name: j.siteName || j.pc || 'Site', pc: j.pc || '' }; };
  CS.jobDesc = function (j) {
    var sv = CS.svc(j.svc);
    if (j.svc === 'skip') return (j.qty > 1 ? j.qty + ' x ' : '') + (j.size >= 20 ? j.size + ' yard RoRo' : j.size + ' yard skip');
    if (j.svc === 'toilet') return j.qty + ' x site toilet' + (j.weeks ? ', ' + j.weeks + ' weeks' : '');
    if (j.svc === 'welfare') return 'Welfare unit' + (j.weeks ? ', ' + j.weeks + ' weeks' : '');
    if (j.svc === 'container') return (j.ft || 20) + 'ft storage container' + (j.weeks ? ', ' + j.weeks + ' weeks' : '');
    if (j.svc === 'fencing') return (j.panels || '') + ' Heras panels' + (j.weeks ? ', ' + j.weeks + ' weeks' : '');
    if (j.svc === 'sweeper') return 'Road sweeper' + (j.hours ? ', ' + j.hours + ' hours' : '');
    if (j.svc === 'concrete') return (j.m3 || '') + 'm3 ' + (j.mix || 'readymix');
    if (j.svc === 'grab' || j.svc === 'muck' || j.svc === 'aggregates') return sv.name + (j.qty > 1 ? ', ' + j.qty + ' loads' : '');
    return sv.name;
  };
  /* the last real message (ignoring automatic acknowledgements) */
  CS.lastReal = function (t) { for (var i = t.msgs.length - 1; i >= 0; i--) if (!t.msgs[i].auto) return t.msgs[i]; return null; };
  CS.needsYou = function (t) { var m = CS.lastReal(t); return !t.done && !!m && m.dir === 'in'; };
  CS.nextId = function (k, prefix) { var n = CS.S.counters[k]++; return prefix + n; };

  /* ---------- postcodes ---------- */
  var AREAS = 'AB AL B BA BB BD BH BL BN BR BS BT CA CB CF CH CM CO CR CT CV CW DA DD DE DG DH DL DN DT DY E EC EH EN EX FK FY G GL GU HA HD HG HP HR HS HU HX IG IP IV KA KT KW KY L LA LD LE LL LN LS LU M ME MK ML N NE NG NN NP NR NW OL OX PA PE PH PL PO PR RG RH RM S SA SE SG SK SL SM SN SO SP SR SS ST SW SY TA TD TF TN TQ TR TS TW UB W WA WC WD WF WN WR WS WV YO ZE'.split(' ');
  CS.area = function (out) { var m = /^[A-Z]+/.exec(out || ''); return m ? m[0] : ''; };
  CS.outward = function (pc) { return String(pc || '').trim().toUpperCase().split(/\s+/)[0]; };
  CS.covers = function (sup, out) { out = CS.outward(out); return sup.areas.indexOf(out) >= 0 || sup.areas.indexOf(CS.area(out)) >= 0; };
  var LONDON = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'];

  /* ---------- pricing ---------- */
  CS.cost = function (sup, it) {
    var r = sup.rates[it.svc]; if (r == null) return null;
    var q = it.qty || 1;
    switch (it.svc) {
      case 'skip': {
        var size = it.size || 8, sizes = Object.keys(r).map(Number).sort(function (a, b) { return a - b; });
        var pick = sizes.filter(function (x) { return x >= size; })[0] || sizes[sizes.length - 1];
        return r[pick] * q;
      }
      case 'grab': case 'muck': case 'aggregates': return r * q;
      case 'welfare': case 'toilet': case 'plant': case 'container': return (r.week * (it.weeks || 1) + r.del) * q;
      case 'fencing': return Math.round(r.week * (it.panels || 20) * (it.weeks || 1) + r.del);
      case 'sweeper': return r.hour * Math.max(it.hours || r.min, r.min);
      case 'concrete': var v = it.m3 || 1; return Math.round(r.m3 * v + (v < 6 ? r.part : 0));
    }
    return null;
  };
  CS.sell = function (svc, cost) { var mk = CS.svc(svc).markup || 0.25; return Math.ceil(cost * (1 + mk) / 5) * 5; };
  CS.permit = function (out) { var a = CS.area(out); return LONDON.indexOf(a) >= 0 ? { cost: 62, sell: 85 } : { cost: 40, sell: 60 }; };

  CS.lookup = function (pc, it) {
    var out = CS.outward(pc);
    var list = CS.S.suppliers.filter(function (s) { return s.services.indexOf(it.svc) >= 0 && CS.covers(s, out); }).map(function (s) {
      var c = CS.cost(s, it); var sl = CS.sell(it.svc, c);
      return { sup: s, cost: c, sell: sl, margin: sl - c };
    }).filter(function (x) { return x.cost != null; });
    var good = list.filter(function (x) { return x.sup.onTime >= 92; }).sort(function (a, b) { return a.cost - b.cost || b.sup.onTime - a.sup.onTime; });
    var rest = list.filter(function (x) { return x.sup.onTime < 92; }).sort(function (a, b) { return a.cost - b.cost; });
    var ranked = good.concat(rest);
    if (ranked.length) {
      var best = ranked[0], cheapest = list.slice().sort(function (a, b) { return a.cost - b.cost; })[0];
      // price the job off the cheapest supplier's sell price so swapping suppliers only moves the margin
      ranked.forEach(function (x) { x.sell = CS.sell(it.svc, best.cost); x.margin = x.sell - x.cost; });
      if (cheapest !== best) best.why = CS.money(best.cost - cheapest.cost) + ' dearer than ' + cheapest.sup.name + ', but ' + best.sup.onTime + '% on time against ' + cheapest.sup.onTime + '%' + (cheapest.sup.wtn ? ' and returns WTNs ' + best.sup.wtn + '% of the time against ' + cheapest.sup.wtn + '%' : '') + '.';
      else best.why = 'Cheapest that covers ' + out + ', ' + best.sup.onTime + '% on time, confirms in about ' + best.sup.resp + ' min.';
    }
    return ranked;
  };

  /* ---------- the message reader ---------- */
  var NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fourteen: 14, sixteen: 16, twenty: 20, forty: 40 };
  function num(x) { if (x == null) return null; x = String(x).toLowerCase(); return NUM[x] != null ? NUM[x] : (isNaN(parseFloat(x)) ? null : parseFloat(x)); }
  var NW = '(\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|sixteen|twenty|forty)';
  var DAYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  var MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };

  CS.parse = function (text, ctx) {
    ctx = ctx || {};
    var t = ' ' + String(text || '').replace(/\s+/g, ' ') + ' ', lo = t.toLowerCase();
    var r = { items: [], notes: [], missing: [] };
    var mm;
    // services
    var has = function (re) { return re.test(lo); };
    var sizeM = new RegExp(NW + '?\\s*(?:x\\s*)?(\\d{1,2})\\s*-?\\s*(?:yard(?:er)?s?|yds?|cubic yards?)\\b', 'i').exec(t);
    var wordSize = /\b(four|six|eight|ten|twelve|fourteen|sixteen|twenty|forty)\s*-?\s*yard/i.exec(t);
    var size = sizeM ? num(sizeM[2]) : (wordSize ? num(wordSize[1]) : null);
    var skipQty = sizeM && sizeM[1] ? num(sizeM[1]) : 1;
    if (/\b(roro|ro-ro|roll on)\b/.test(lo) && !size) size = 20;
    var loads = (mm = new RegExp(NW + '\\s*(?:x\\s*)?(?:grab |tipper |muck away )?loads?\\b', 'i').exec(t)) ? num(mm[1]) : null;
    var weeks = (mm = new RegExp(NW + '\\s*weeks?\\b', 'i').exec(t)) ? num(mm[1]) : null;
    var m3 = (mm = /(\d+(?:\.\d+)?)\s*(?:m3|m³|cubes?|cubic met)/i.exec(t)) ? parseFloat(mm[1]) : null;
    var hours = (mm = /(\d+)\s*(?:hours?|hrs?)\b/i.exec(t)) ? parseInt(mm[1], 10) : null;
    if (has(/concrete|readymix|ready mix|\bc\d{2}\b/) || m3) r.items.push({ svc: 'concrete', m3: m3 || null, mix: (mm = /\b(c\d{2})\b/i.exec(t)) ? mm[1].toUpperCase() + ' concrete' : 'readymix' });
    if (has(/type ?1|\bmot\b|aggregate|ballast|sharp sand|building sand|gravel|hardcore|scalpings/)) r.items.push({ svc: 'aggregates', qty: loads || 1 });
    if (has(/welfare|cabin|canteen/)) r.items.push({ svc: 'welfare', qty: (mm = new RegExp(NW + '\\s*welfare', 'i').exec(t)) ? num(mm[1]) : 1, weeks: weeks || null });
    if (has(/container|\bconnex|\b(?:10|20)\s*ft\b|\b(?:10|20)\s*(?:foot|feet)\b/)) r.items.push({ svc: 'container', qty: 1, ft: /\b10\s*(?:ft|foot|feet)\b/i.test(t) ? 10 : 20, weeks: weeks || null });
    if (has(/toilet|\bloos?\b|portaloo/)) r.items.push({ svc: 'toilet', qty: (mm = new RegExp(NW + '\\s*(?:site )?(?:toilets?|loos?|portaloos?)', 'i').exec(t)) ? num(mm[1]) : 1, weeks: weeks || null });
    if (has(/heras|fenc/)) r.items.push({ svc: 'fencing', panels: (mm = /(\d+)\s*(?:panels?|heras)/i.exec(t)) ? parseInt(mm[1], 10) : null, weeks: weeks || null });
    if (has(/sweep/)) r.items.push({ svc: 'sweeper', hours: hours || null });
    if (has(/digger|excavator|dumper|telehandler|roller|plant hire/)) r.items.push({ svc: 'plant', qty: 1, weeks: weeks || 1 });
    if (has(/\bgrab/)) r.items.push({ svc: 'grab', qty: loads || 1 });
    if (has(/muck|tipper|spoil/) && !has(/\bgrab/)) r.items.push({ svc: 'muck', qty: loads || 1 });
    if (has(/skip|yarder|\d\s*yds?\b|\d\s*-?\s*yard|roro|ro-ro|roll on/) || (size && !r.items.length)) r.items.unshift({ svc: 'skip', size: size, qty: skipQty || 1 });
    // postcode
    var full = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/gi, pc = null, out = null;
    while ((mm = full.exec(t))) { var a = CS.area(mm[1].toUpperCase()); if (AREAS.indexOf(a) >= 0) { pc = mm[1].toUpperCase() + ' ' + mm[2].toUpperCase(); break; } }
    if (!pc) {
      var re = /([A-Za-z]{1,2}\d{1,2}[A-Za-z]?)\b/g;
      while ((mm = re.exec(t))) {
        var prev = t[mm.index - 1]; if (prev && /[\dA-Za-z]/.test(prev)) continue;
        var tok = mm[1].toUpperCase(); var ar = CS.area(tok);
        if (AREAS.indexOf(ar) < 0) continue;
        if (/^C\d\d$/.test(tok)) continue;
        if (mm[1] === mm[1].toLowerCase() && !/^[a-z]{2}\d/.test(mm[1])) continue; // "m3", "b4" written lower case are not postcodes
        out = tok; break;
      }
    }
    if (!pc && ctx.formPc) pc = ctx.formPc.toUpperCase();
    if (pc) out = CS.outward(pc);
    // site match against the customer's known sites
    var c = ctx.cust;
    if (c && c.sites) {
      var byName = c.sites.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) {
        return x.s.name.split(/[ ,]+/).some(function (w) { return w.length > 4 && lo.indexOf(' ' + w.toLowerCase()) >= 0 && !/^(road|lane|street|plots?|site)$/i.test(w); });
      });
      var byOut = c.sites.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return out && CS.outward(x.s.pc) === out; });
      var hit = byName[0] || byOut[0];
      if (hit) {
        r.site = hit.i; r.siteName = hit.s.name; pc = hit.s.pc; out = CS.outward(pc);
        r.siteOptions = (byName.length ? byName : byOut).map(function (x) { return x.i; });
        r.notes.push(byName.length ? 'Site matched by name: ' + hit.s.name + ', ' + hit.s.pc : (byOut.length > 1 ? byOut.length + ' of ' + c.first + '\'s sites are in ' + out + '. Picked ' + hit.s.name + ' (used last). Tap to change.' : 'Site matched from history: ' + hit.s.name + ', ' + hit.s.pc));
      }
    }
    r.pc = pc; r.out = out;
    // day
    var day = null, now = new Date(), dow = now.getDay();
    if (/\btoday\b|\basap\b|this afternoon/.test(lo)) day = 0;
    else if (/\btomorrow\b|\btmrw\b|\btomoz\b/.test(lo)) day = 1;
    else if ((mm = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|weds?|thurs?|thu|fri|sat)\b/.exec(lo))) {
      var want = DAYS[mm[1]]; day = (want - dow + 7) % 7; if (day === 0) day = 7;
      if (/next week/.test(lo) && day < 7) day += 7;
    } else if ((mm = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/.exec(lo))) {
      var d = new Date(now.getFullYear(), MONTHS[mm[2]], parseInt(mm[1], 10)); if (d < today0()) d.setFullYear(d.getFullYear() + 1);
      day = Math.round((d - today0()) / 86400000);
    } else if ((mm = /\b(\d{1,2})\/(\d{1,2})\b/.exec(lo))) {
      var d2 = new Date(now.getFullYear(), parseInt(mm[2], 10) - 1, parseInt(mm[1], 10)); if (d2 < today0()) d2.setFullYear(d2.getFullYear() + 1);
      day = Math.round((d2 - today0()) / 86400000);
    } else if (/next week/.test(lo)) { day = (8 - dow) % 7 || 7; }
    r.day = day;
    r.when = (mm = /\b(\d{1,2})(?::(\d\d))?\s*(am|pm)\b/.exec(lo)) ? mm[1] + (mm[2] ? ':' + mm[2] : '') + mm[3] : (/first thing|morning|\bam\b/.test(lo) ? 'AM' : (/afternoon|\bpm\b/.test(lo) ? 'PM' : ''));
    r.placement = /(on the (road|street|highway|pavement)|road outside|go on the road|in the road|need(s)? a permit|\bpermit\b)/.test(lo) ? 'road' : (/(drive|driveway|on site|in the yard|private land|in the compound)/.test(lo) ? 'drive' : null);
    r.waitLoad = /wait (and|&) load|w&l/.test(lo);
    r.onAccount = /on account|account/.test(lo);
    // intent
    r.priceOnly = /(how much|price for|price on|prices for|a price|quote|what.?s the cost|cost for|cost of)/.test(lo) && !/\bbook (it|them|one|in)\b/.test(lo);
    r.intent = /\b(swap|exchange|change over|changeover)\b|\bit'?s full\b|full to/.test(lo) ? 'exchange' : (/\b(collect|pick up|pickup|take (it|the skip) away|finished with)\b/.test(lo) ? 'collect' : 'request');
    // defaults and gaps
    r.items.forEach(function (it) {
      if (it.svc === 'skip' && !it.size) { it.size = 8; it.assumed = true; }
      if ((it.svc === 'welfare' || it.svc === 'toilet' || it.svc === 'fencing' || it.svc === 'container') && !it.weeks) { it.weeks = 4; it.assumedWeeks = true; }
      if (it.svc === 'fencing' && !it.panels) { it.panels = 20; it.assumed = true; }
      if (it.svc === 'concrete' && !it.m3) { it.m3 = 3; it.assumed = true; }
      if (it.svc === 'sweeper' && !it.hours) it.hours = 4;
      if (r.waitLoad) it.waitLoad = true;
    });
    if (r.intent === 'request') {
      if (!r.items.length) r.missing.push('what you need');
      if (!r.pc && !r.out) r.missing.push('site postcode');
      if (r.day == null && !r.priceOnly) r.missing.push('day');
    }
    return r;
  };

  /* ---------- drafts ---------- */
  function sig(owner) { return owner === 'sam' ? CS.bde() : 'John'; }
  function greet(first) { return CS.S.settings.tone === 'formal' ? 'Hello ' + first + ',' : 'Hi ' + first + ','; }
  function signoff(owner) { return CS.S.settings.tone === 'formal' ? 'Kind regards, ' + (owner === 'sam' ? CS.bde() : 'John Pesci') + ', CAC Waste Management' : 'Cheers, ' + sig(owner); }
  CS.itemText = function (it) {
    switch (it.svc) {
      case 'skip': return (it.qty > 1 ? it.qty + ' x ' : ([8, 11, 18].indexOf(it.size) >= 0 ? 'an ' : 'a ')) + (it.size >= 20 ? it.size + ' yard RoRo' : it.size + ' yard skip') + (it.qty > 1 ? 's' : '') + (it.waitLoad ? ' (wait and load)' : '');
      case 'grab': return (it.qty > 1 ? it.qty + ' grab loads' : 'a grab lorry');
      case 'muck': return (it.qty > 1 ? it.qty + ' loads of muck away' : 'a load of muck away');
      case 'welfare': return (it.qty > 1 ? it.qty + ' welfare units' : 'a welfare unit') + ' for ' + it.weeks + ' weeks';
      case 'toilet': return (it.qty > 1 ? it.qty + ' site toilets' : 'a site toilet') + ' for ' + it.weeks + ' weeks';
      case 'container': return 'a ' + (it.ft || 20) + 'ft storage container for ' + it.weeks + ' weeks';
      case 'fencing': return it.panels + ' Heras panels for ' + it.weeks + ' weeks';
      case 'sweeper': return 'a road sweeper for ' + it.hours + ' hours';
      case 'concrete': return it.m3 + 'm3 of ' + (it.mix || 'readymix');
      case 'aggregates': return (it.qty > 1 ? it.qty + ' loads' : 'a 20t load') + ' of Type 1';
      case 'plant': return 'a 1.5t mini digger for ' + it.weeks + ' week' + (it.weeks > 1 ? 's' : '');
    }
    return CS.svc(it.svc).name;
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function joinList(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  /* Build what the assistant suggests for a thread. Pure: reads state, returns an object. */
  CS.analyse = function (t) {
    var scn = t.scn || { kind: 'parse' };
    var p = CS.party(t.party), lastIn = t.msgs.filter(function (m) { return m.dir === 'in'; }).slice(-1)[0];
    var owner = scn.owner || (p.obj && p.obj.owner) || (t.party.type === 'lead' ? 'sam' : 'john');
    var S = { kind: scn.kind, owner: owner, chips: [], notes: [], drafts: [], steps: [], lines: [] };
    var j, c, sup, s;
    if (t.done) { S.kind = 'done'; S.title = 'Done'; return S; }
    if (!lastIn) { S.kind = 'none'; S.title = 'Nothing waiting'; S.summary = 'Last message was from CAC.'; S.approve = 'Mark as done'; return S; }

    if (scn.kind === 'parse') {
      c = t.party.type === 'customer' ? CS.cust(t.party.id) : null;
      var r = CS.parse(lastIn.text, { cust: c, formPc: t.form && t.form['Site postcode'] });
      if (t.siteOverride != null && c) { r.site = t.siteOverride; r.pc = c.sites[r.site].pc; r.out = CS.outward(r.pc); r.siteName = c.sites[r.site].name; }
      S.parsed = r;
      // exchange or collection of a live job for an existing customer
      if (c && (r.intent === 'exchange' || r.intent === 'collect')) {
        var live = CS.S.jobs.filter(function (x) { return x.cust === c.id && (x.status === 'onhire' || x.status === 'exchange'); });
        if (r.out) live = live.filter(function (x) { return CS.outward(CS.jobSite(x).pc) === r.out; }).concat(live.filter(function (x) { return CS.outward(CS.jobSite(x).pc) !== r.out; }));
        if (live.length) return CS.analyse(Object.assign({}, t, { scn: { kind: r.intent, job: live[0].id, day: r.day } }));
      }
      var isLead = t.party.type === 'lead' || t.party.type === 'newlead';
      S.kind = r.missing.length ? 'ask' : ((r.priceOnly || isLead) ? 'quote' : 'book');
      r.items.forEach(function (it) {
        var sv = CS.svc(it.svc);
        var chip = { k: sv.short, v: CS.itemText(it).replace(/^an? /, '') };
        if (it.assumed || it.assumedWeeks) chip.assumed = true;
        S.chips.push(chip);
      });
      if (r.pc || r.out) S.chips.push({ k: 'Site', v: (r.siteName ? r.siteName + ', ' : '') + (r.pc || r.out) });
      if (r.day != null) S.chips.push({ k: 'When', v: CS.fmtDay(r.day) + (r.when ? ' ' + r.when : '') });
      if (r.placement) S.chips.push({ k: 'Placement', v: r.placement === 'road' ? 'On the road, permit needed' : 'On the drive, no permit' });
      if (c) S.chips.push({ k: 'Account', v: c.terms });
      if (isLead) S.chips.push({ k: 'Owner', v: CS.bde() + ' (new lead, auto assigned)' });
      S.notes = r.notes.slice();
      r.items.forEach(function (it) { if (it.assumed) S.notes.push('Size or quantity not given, priced as ' + CS.itemText(it).replace(/^an? /, '') + '. Change it before sending if needed.'); });
      // price every item
      var pcForLookup = r.pc || r.out;
      var supChoice = t.supOverride || {};
      r.items.forEach(function (it, idx) {
        if (!pcForLookup) return;
        var ranked = CS.lookup(pcForLookup, it);
        if (!ranked.length) { S.notes.push('No supplier on file covers ' + CS.outward(pcForLookup) + ' for ' + CS.svc(it.svc).name.toLowerCase() + '. Add one in Suppliers.'); return; }
        var pick = ranked.filter(function (x) { return x.sup.id === supChoice[idx]; })[0] || ranked[0];
        S.lines.push({ idx: idx, it: it, svc: it.svc, desc: cap(CS.itemText(it).replace(/^an? /, '')), sup: pick.sup.id, cost: pick.cost, sell: pick.sell, why: pick === ranked[0] ? ranked[0].why : 'Picked by hand.', alts: ranked.map(function (x) { return { sup: x.sup.id, cost: x.cost }; }) });
      });
      if (r.placement === 'road' && r.items.some(function (i) { return i.svc === 'skip'; }) && pcForLookup) {
        var pm = CS.permit(pcForLookup); S.lines.push({ permit: true, desc: 'Council skip permit (supplier applies)', cost: pm.cost, sell: pm.sell });
        S.notes.push('Going on the road, so the council permit is added. Councils want 3 to 7 working days notice, the supplier applies.');
      }
      if (t.priceOverride) S.lines.forEach(function (l, i) { if (t.priceOverride[i] != null) l.sell = t.priceOverride[i]; });
      S.sell = S.lines.reduce(function (a, l) { return a + l.sell; }, 0);
      S.cost = S.lines.reduce(function (a, l) { return a + l.cost; }, 0);
      S.margin = S.sell - S.cost;
      var first = p.first, itemsLine = joinList(r.items.map(CS.itemText));
      var where = (r.siteName ? r.siteName + ', ' : '') + (r.pc || r.out || '');
      if (S.kind === 'ask') {
        var qs = [];
        if (r.missing.indexOf('what you need') >= 0) qs.push('what do you need on site');
        if (r.missing.indexOf('site postcode') >= 0) qs.push('what\'s the site postcode');
        if (r.missing.indexOf('day') >= 0) qs.push('which day do you want it');
        S.title = 'Needs ' + joinList(r.missing);
        S.summary = 'Not enough to price or book yet. The reply asks only for what is missing' + (S.lines.length ? ', and gives the price so far.' : '.');
        S.drafts.push({ to: 'customer', party: t.party, ch: replyCh(t.ch), text: greet(first) + ' no problem. ' + cap(joinList(qs)) + '?' + (S.lines.length ? ' It\'s ' + CS.money(S.sell) + ' + VAT.' : '') + ' ' + signoff(owner) });
        S.approve = 'Approve and send'; S.mins = 3;
      } else if (S.kind === 'quote') {
        S.title = 'Quote: ' + itemsLine.replace(/^an? /, '') + (r.out ? ', ' + r.out : '');
        S.summary = 'Priced from your supplier rates for ' + (r.out || 'the site') + '. Margin shown before anything goes out.';
        var body;
        if (t.ch === 'email' || t.ch === 'web') {
          body = greet(first) + '\n\nThanks for getting in touch with CAC. For ' + (r.pc || r.out) + (r.day != null ? ', ' + CS.fmtDayLong(r.day) : '') + ':\n' +
            S.lines.map(function (l) { return '- ' + l.desc + ': ' + CS.money(l.sell) + ' + VAT'; }).join('\n') +
            (S.lines.length > 1 ? '\n\nTotal ' + CS.money(S.sell) + ' + VAT.' : '') +
            (isLead ? '\n\n' + (r.onAccount ? 'Happy to open a 30 day account for you, I just need your company details. ' : '') + 'Reply here or call me on 0330 122 5711 and I\'ll get it booked in.' : '\n\nWant me to book it in?') +
            '\n\n' + (CS.S.settings.tone === 'formal' ? 'Kind regards' : 'Thanks') + ', ' + sig(owner) + '\nCAC Waste Management';
        } else {
          body = greet(first) + ' ' + itemsLine + ' to ' + (r.pc || r.out) + (r.day != null ? ' ' + CS.dayPhrase(r.day) : '') + ' is ' + CS.money(S.sell) + ' + VAT' + (r.placement === 'road' ? ' including the council permit' : '') + '. Want me to book it in? ' + signoff(owner);
        }
        S.drafts.push({ to: 'customer', party: t.party, ch: replyCh(t.ch), text: body });
        S.approve = 'Approve and send quote'; S.mins = 7;
        var crq = c ? CS.credit(c.id, 0) : null;
        if (crq && crq.hold) S.notes.push(c.name + ' are on hold: ' + crq.why + ' The price can go, but a booking will be held until they pay.');
      } else {
        S.title = 'Book: ' + itemsLine.replace(/^an? /, '') + (r.out ? ', ' + r.out : '') + ', ' + CS.fmtDay(r.day);
        S.summary = 'Priced, supplier picked and both messages written. One tap books it.';
        var dl = CS.fmtDayLong(r.day) + (r.when ? ' ' + r.when : ''), onDl = (r.day > 1 ? 'on ' : '') + dl;
        S.drafts.push({ to: 'customer', party: t.party, ch: replyCh(t.ch), text: greet(first) + ' yes no problem. ' + cap(itemsLine) + ' to ' + where + ' ' + onDl + ', ' + CS.money(S.sell) + ' + VAT' + (r.placement === 'road' ? ' including the council permit' : '') + '. Booked in, I\'ll confirm the delivery window as soon as the driver\'s planned. ' + signoff(owner) });
        var bySup = {};
        S.lines.forEach(function (l) { if (!l.permit) (bySup[l.sup] = bySup[l.sup] || []).push(l); });
        Object.keys(bySup).forEach(function (sid) {
          var su = CS.sup(sid);
          var items = bySup[sid].map(function (l) { return CS.itemText(l.it); });
          S.drafts.push({ to: 'supplier', party: { type: 'supplier', id: sid }, ch: 'wa', text: 'Hi ' + su.contact + ', can you do ' + joinList(items) + ' for ' + (c ? c.name : p.sub || p.name) + ', ' + where + ', ' + dl + ' please. ' +
            (r.placement === 'road' ? 'Going on the road, please sort the permit. ' : (r.placement === 'drive' ? 'On the drive, no permit. ' : '')) + 'Ref {JOB}. Send the WTN to this number once it\'s down. Thanks, ' + sig(owner) + ' (CAC)' });
        });
        S.approve = 'Approve: book it and send both'; S.mins = 9;
        var cr = c ? CS.credit(c.id, S.sell) : null;
        if (cr && cr.hold && !t.creditOk) {
          S.kind = 'hold'; S.credit = cr;
          S.title = 'Hold: ' + c.name + ' owe ' + CS.money(cr.owed, true);
          S.summary = cr.why + ' The job is priced and ready, but nothing goes to the supplier until you say so.';
          S.chips.push({ k: 'Credit', v: CS.money(cr.owed) + ' owed, limit ' + CS.money(cr.limit) });
          var inv0 = cr.worstInv;
          S.drafts = [{ to: 'customer', party: t.party, ch: replyCh(t.ch), att: inv0 ? [{ n: inv0.id + '.pdf', t: 'doc' }] : null,
            text: greet(first) + ' happy to get ' + itemsLine + ' to ' + (r.siteName || r.pc || r.out) + ' ' + CS.dayPhrase(r.day) + '. Before I book it in, ' + (inv0 ? inv0.id + ' for ' + CS.money(inv0.amount, true) + ' is ' + (-inv0.due) + ' days over' : 'the account is over its limit') + '. Can you get that paid today and I\'ll book it straight away? ' + signoff(owner) }];
          S.approve = 'Approve: ask ' + first + ' to pay first'; S.alt = 'Book it anyway'; S.mins = 6;
        } else if (cr && cr.overdue > 0) {
          S.notes.push(c.name + ' have ' + CS.money(cr.overdue, true) + ' overdue, ' + cr.worst + ' days late. Under the limit, so this is a heads up only.');
        }
      }
      return S;
    }

    if (scn.kind === 'exchange' || scn.kind === 'collect') {
      j = CS.job(scn.job); c = CS.cust(j.cust); sup = CS.sup(j.sup); s = CS.jobSite(j);
      var dd = scn.day != null ? scn.day : 1, ex = scn.kind === 'exchange';
      S.title = (ex ? 'Exchange ' : 'Collect ') + CS.jobDesc(j).toLowerCase() + ', ' + CS.fmtDay(dd);
      S.summary = 'Matched to ' + j.id + ' at ' + s.name + ', on hire with ' + sup.name + ' since ' + CS.fmtDay(j.day) + '.';
      S.chips = [{ k: 'Job', v: j.id }, { k: 'Site', v: s.name + ', ' + s.pc }, { k: 'When', v: CS.fmtDay(dd) }, { k: 'Supplier', v: sup.name }];
      var exCost = ex ? j.cost : Math.round(j.cost * 0.15), exSell = ex ? j.sell : 0;
      S.lines = [{ desc: ex ? 'Exchange, ' + CS.jobDesc(j).toLowerCase() : 'Collection (included in hire)', sup: j.sup, cost: ex ? exCost : 0, sell: exSell }];
      S.sell = exSell; S.cost = ex ? exCost : 0; S.margin = S.sell - S.cost;
      S.job = j.id; S.day = dd;
      S.drafts.push({ to: 'customer', party: t.party, ch: replyCh(t.ch), text: greet(c.first) + ' no problem, ' + (ex ? 'swap' : 'collection') + ' booked ' + CS.dayPhrase(dd).replace(/^on /, 'for ') + ' at ' + s.name + '.' + (ex ? ' Same price as before, ' + CS.money(exSell) + ' + VAT.' : '') + ' ' + signoff(owner) });
      S.drafts.push({ to: 'supplier', party: { type: 'supplier', id: sup.id }, ch: 'wa', text: 'Hi ' + sup.contact + ', can you ' + (ex ? 'exchange the ' + j.size + 'yd' : 'collect the ' + CS.jobDesc(j).toLowerCase()) + ' at ' + s.name + ', ' + s.pc + ' ' + CS.fmtDayLong(dd) + ' please. Ref ' + j.id + '. WTN to this number as usual. Thanks, ' + sig(owner) + ' (CAC)' });
      S.approve = ex ? 'Approve: book the exchange' : 'Approve: book the collection'; S.mins = 6;
      return S;
    }

    if (scn.kind === 'wtn') {
      j = CS.job(scn.job); c = CS.cust(j.cust); s = CS.jobSite(j);
      S.title = 'WTN in for ' + j.id + ', delivered';
      S.summary = 'Read the email, found the note and the photo, and matched them to ' + j.id + ' for ' + c.name + '.';
      S.chips = [{ k: 'Job', v: j.id + ', ' + CS.jobDesc(j) }, { k: 'Delivered', v: 'Today 08:40' }, { k: 'WTN', v: 'Attached, signed' }, { k: 'Waste', v: CS.svc(j.svc).waste + ', EWC ' + CS.svc(j.svc).ewc }];
      S.notes = ['The WTN gets filed against the job and the customer, kept for 2 years as the duty of care code asks.'];
      S.drafts.push({ to: 'customer', party: { type: 'customer', id: c.id }, ch: 'wa', text: greet(c.first) + ' your ' + CS.jobDesc(j).toLowerCase() + ' is down at ' + s.name + ', dropped at 08:40 on the drive. ' + signoff(owner) });
      S.approve = 'Approve: file the WTN and tell ' + c.first; S.job = j.id; S.mins = 4;
      return S;
    }

    if (scn.kind === 'confirm') {
      j = CS.job(scn.job); c = CS.cust(j.cust); s = CS.jobSite(j); sup = CS.sup(j.sup);
      S.title = sup.name + ' confirmed ' + j.id;
      S.summary = 'Supplier confirmed. The job is marked confirmed and ' + c.first + '\'s confirmation is ready.';
      S.chips = [{ k: 'Job', v: j.id + ', ' + CS.jobDesc(j) }, { k: 'When', v: CS.fmtDay(j.day) + (/8am/.test(lastIn.text) ? ' 8am' : ' AM') }, { k: 'Site', v: s.name }];
      S.drafts.push({ to: 'customer', party: { type: 'customer', id: c.id }, ch: 'wa', text: greet(c.first) + ' all confirmed, ' + CS.jobDesc(j).toLowerCase() + ' at ' + s.name + ' ' + CS.dayPhrase(j.day) + (/8am/.test(lastIn.text) ? ' at 8am, the driver will ring you 30 minutes before.' : ' in the morning.') + ' ' + signoff(j.owner) });
      S.approve = 'Approve: confirm to ' + c.first; S.job = j.id; S.mins = 4;
      return S;
    }

    if (scn.kind === 'reschedule') {
      j = CS.job(scn.job); c = CS.cust(j.cust); s = CS.jobSite(j); sup = CS.sup(j.sup);
      var thu = j.day + 1; while ([0, 6].indexOf(CS.dayDate(thu).getDay()) >= 0) thu++;
      S.title = sup.name + ' can\'t do ' + CS.fmtDay(j.day) + ', offering ' + CS.fmtDay(thu);
      S.summary = 'No other supplier on file covers ' + CS.outward(s.pc) + ' for skips with a better on-time record, and it\'s on a drive so a day later is low risk. Your promise: if a slot slips, the customer hears it from you first, so ' + c.first + '\'s message is already written.';
      S.chips = [{ k: 'Job', v: j.id + ', ' + CS.jobDesc(j) }, { k: 'Was', v: CS.fmtDay(j.day) }, { k: 'Now', v: CS.fmtDay(thu) + ' first thing' }, { k: 'Customer', v: c.name }];
      S.drafts.push({ to: 'customer', party: { type: 'customer', id: c.id }, ch: 'wa', text: greet(c.first) + ' heads up, the supplier\'s a driver down ' + CS.dayPhrase(j.day).replace(/^on /, '') + ' so your 8 yarder at Costessey is now ' + CS.dayPhrase(thu).replace(/^on /, '') + ' first thing. Sorry about that, shout if it causes a problem. ' + signoff(owner) });
      S.drafts.push({ to: 'supplier', party: { type: 'supplier', id: sup.id }, ch: 'wa', text: 'No worries ' + sup.contact + ', ' + CS.fmtDay(thu) + ' first thing is fine. Ref ' + j.id + '. Thanks, John (CAC)' });
      S.approve = 'Approve: move it and tell both'; S.job = j.id; S.day = thu; S.mins = 6;
      return S;
    }

    if (scn.kind === 'paid') {
      var inv = CS.inv(scn.inv); c = CS.cust(inv.cust);
      S.title = inv.id + ' paid, ' + CS.money(inv.amount, true);
      S.summary = 'Remittance read and matched to ' + inv.id + ' for ' + c.name + '. Amount matches to the penny.';
      S.chips = [{ k: 'Invoice', v: inv.id }, { k: 'Amount', v: CS.money(inv.amount, true) }, { k: 'Method', v: 'BACS' }];
      S.approve = 'Approve: mark ' + inv.id + ' paid'; S.inv = inv.id; S.mins = 3;
      return S;
    }

    if (scn.kind === 'pack') {
      c = CS.cust(t.party.id); s = c.sites[scn.site || 0];
      var js = CS.S.jobs.filter(function (x) { return x.cust === c.id && (x.site || 0) === (scn.site || 0) && x.wtn === 'received'; });
      S.title = 'Send ' + js.length + ' WTNs for ' + s.name;
      S.summary = 'Found every waste transfer note for ' + s.name + ' in the last 30 days, all signed and on file.';
      S.chips = [{ k: 'Site', v: s.name }, { k: 'Notes', v: js.length + ' WTNs, ' + js.length + ' jobs' }, { k: 'Period', v: 'Last 30 days' }];
      S.att = js.map(function (x) { return { n: 'WTN-' + x.id + '.pdf', t: 'wtn', job: x.id }; });
      S.drafts.push({ to: 'customer', party: t.party, ch: 'email', text: greet(c.first) + '\n\nAll ' + js.length + ' waste transfer notes for ' + s.name + ' from the last month attached, one per job:\n' + js.map(function (x) { return '- ' + x.id + ', ' + CS.jobDesc(x) + ', ' + CS.fmtDay(x.day); }).join('\n') + '\n\nAny more the QS needs, just shout.\n\n' + signoff(owner) });
      S.approve = 'Approve: send all ' + js.length + ' WTNs'; S.mins = 25;
      return S;
    }

    if (scn.kind === 'bill') {
      var b = CS.S.bills.filter(function (x) { return x.id === scn.bill; })[0]; j = CS.job(b.job); c = CS.cust(j.cust); s = CS.jobSite(j);
      S.title = 'Supplier bill ' + CS.money(b.billed - b.expected) + ' over the agreed rate';
      S.summary = 'Docklight billed ' + CS.money(b.billed) + ' against the ' + CS.money(b.expected) + ' you agreed for ' + j.id + '. The difference is an overweight charge, and the weighbridge ticket backs it up.';
      S.chips = [{ k: 'Job', v: j.id + ', ' + CS.jobDesc(j) }, { k: 'Agreed', v: CS.money(b.expected) }, { k: 'Billed', v: CS.money(b.billed) }, { k: 'Reason', v: 'Overweight, 4.1t' }];
      S.lines = [{ desc: 'Overweight recharge to ' + c.name, cost: b.billed - b.expected, sell: 45 }];
      S.sell = 45; S.cost = b.billed - b.expected; S.margin = 10;
      S.notes = ['Without this, the ' + CS.money(b.billed - b.expected) + ' comes straight off your margin on ' + j.id + '.'];
      S.drafts.push({ to: 'customer', party: { type: 'customer', id: c.id }, ch: 'wa', text: greet(c.first) + ' heads up, the 8 yarder at ' + s.name + ' came in at 4.1 tonnes so there\'s an overweight charge of £45 + VAT. Weighbridge ticket attached, it\'ll go on your next invoice. ' + signoff(owner) });
      S.att = [{ n: 'weighbridge-ticket.jpg', t: 'photo' }];
      S.approve = 'Approve bill, recharge ' + c.first; S.bill = b.id; S.mins = 8;
      return S;
    }

    if (scn.kind === 'none') {
      j = scn.job && CS.job(scn.job);
      S.title = 'Nothing to reply';
      S.summary = j ? 'Delivery of ' + j.id + ' confirmed by the customer. Logged on the job.' : 'No action needed.';
      S.approve = 'Mark as done'; S.mins = 1;
      return S;
    }
    S.kind = 'none'; S.title = 'Nothing to reply'; S.approve = 'Mark as done';
    return S;
  };

  /* ---------- writing to the state ---------- */
  CS.addMsg = function (t, dir, text, extra) {
    var m = { dir: dir, text: text, at: Date.now() }; if (extra) for (var k in extra) m[k] = extra[k];
    t.msgs.push(m); t.last = m.at; return m;
  };
  CS.threadFor = function (party, ch) {
    var t = CS.S.threads.filter(function (x) { return x.party.type === party.type && x.party.id === party.id && x.ch === ch; })[0];
    if (!t) { t = { id: 't' + (CS.S.counters.thread++), party: party, ch: ch, msgs: [], unread: false, last: Date.now() }; CS.S.threads.push(t); }
    return t;
  };
  CS.feed = function (text, ic) { CS.S.feed.unshift({ at: Date.now(), t: text, ic: ic || 'sparkles' }); CS.S.feed = CS.S.feed.slice(0, 40); };
  CS.saved = function (mins) { CS.S.saved.mins += mins || 0; CS.S.saved.actions++; };
  CS.schedule = function (secs, ev) { ev.due = Date.now() + secs * 1000; CS.S.events.push(ev); };
  CS.jobLog = function (j, text) { j.log.push({ at: Date.now(), t: text }); };

  /* Approve the assistant's suggestion. Returns the list of what happened, for the tick-off animation. */
  CS.approve = function (tid, edited) {
    var t = CS.thread(tid); var S = CS.analyse(t); var steps = [];
    var owner = S.owner, by = owner === 'sam' ? CS.bde() : 'John';
    var drafts = S.drafts.map(function (d, i) { return Object.assign({}, d, { text: edited && edited[i] != null ? edited[i] : d.text }); });
    function sendDraft(d, jobId) {
      var text = d.text.replace(/\{JOB\}/g, jobId || '');
      var th = (d.party.type === t.party.type && d.party.id === t.party.id) ? t : CS.threadFor(d.party, d.ch);
      CS.addMsg(th, 'out', text, { by: by, att: d.att || undefined });
      return th;
    }
    var k = S.kind;
    if (k === 'book') {
      var c = CS.cust(t.party.id); var r = S.parsed; var jobIds = [];
      S.lines.filter(function (l) { return !l.permit; }).forEach(function (l, i) {
        var id = CS.nextId('job', 'CAC-');
        var permitLine = S.lines.filter(function (x) { return x.permit; })[0];
        var j = { id: id, cust: c.id, site: r.site != null ? r.site : null, siteName: r.siteName ? null : (r.pc || r.out), pc: r.pc || r.out, svc: l.svc, size: l.it.size, qty: l.it.qty || 1,
          weeks: l.it.weeks, panels: l.it.panels, ft: l.it.ft, m3: l.it.m3, hours: l.it.hours, mix: l.it.mix,
          sup: l.sup, cost: l.cost + (i === 0 && permitLine ? permitLine.cost : 0), sell: l.sell + (i === 0 && permitLine ? permitLine.sell : 0), status: 'booked', day: r.day, bookedAt: Date.now(),
          wtn: (l.svc === 'skip' || l.svc === 'grab' || l.svc === 'muck') ? 'pending' : null, owner: owner, log: [], permit: r.placement === 'road' && l.svc === 'skip' };
        if (r.site == null) j.site = null;
        CS.jobLog(j, 'Booked from ' + chName(t.ch) + ' message, approved by ' + by);
        CS.S.jobs.push(j); jobIds.push(id);
        if (j.permit) CS.S.permits.push({ job: id, council: 'Local council', to: null, status: 'applied' });
      });
      var qid = CS.nextId('quote', 'Q-');
      CS.S.quotes.unshift({ id: qid, cust: c.id, desc: S.lines.map(function (l) { return l.desc; }).join(', '), sell: S.sell, cost: S.cost, status: 'won', day: 0, job: jobIds[0], owner: owner });
      sendDraft(drafts[0]);
      steps.push('Quote ' + qid + ' saved, ' + CS.money(S.sell) + ' at ' + CS.pct(S.margin, S.sell) + '% margin');
      steps.push('Job ' + jobIds.join(', ') + ' on the jobs board');
      drafts.slice(1).forEach(function (d) {
        var jid = jobIds.filter(function (id) { return CS.job(id).sup === d.party.id; })[0] || jobIds[0];
        sendDraft(d, jid);
        steps.push('Booking sent to ' + CS.sup(d.party.id).name + ' on WhatsApp');
        CS.schedule(5 + Math.random() * 2, { type: 'supReply', sup: d.party.id, job: jid, text: 'Yes no problem, ' + CS.dayPhrase(r.day).replace(/^on /, '') + (r.when ? ' ' + r.when : ' AM') + ' for ' + jid });
      });
      steps.push('Reply sent to ' + CS.party(t.party).first);
      CS.feed('Booked ' + jobIds.join(', ') + ' for ' + c.name + ', margin ' + CS.money(S.margin), 'truck');
    } else if (k === 'quote') {
      var qid2 = CS.nextId('quote', 'Q-');
      var q = { id: qid2, desc: S.lines.map(function (l) { return l.desc; }).join(', '), sell: S.sell, cost: S.cost, status: 'sent', day: 0, owner: owner };
      if (t.party.type === 'customer') q.cust = t.party.id; else q.lead = t.party.id;
      CS.S.quotes.unshift(q);
      if (t.party.type === 'lead') { var ld = CS.lead(t.party.id); ld.stage = 'quoted'; ld.last = 0; ld.lastWhat = 'Quote ' + qid2 + ' sent'; ld.next = 2; ld.nextWhat = 'Chase ' + qid2; }
      sendDraft(drafts[0]);
      steps.push('Quote ' + qid2 + ' saved, ' + CS.money(S.sell) + ' at ' + CS.pct(S.margin, S.sell) + '% margin');
      steps.push('Sent to ' + CS.party(t.party).first + ' on ' + chName(t.ch));
      steps.push('Follow up set for ' + CS.dayPhrase(2).replace(/^on /, '') + (owner === 'sam' ? ' on ' + CS.bde() + '\'s list' : ''));
      CS.feed('Quote ' + qid2 + ' sent to ' + CS.party(t.party).sub + ', ' + CS.money(S.sell), 'file-text');
    } else if (k === 'hold') {
      sendDraft(drafts[0]);
      steps.push('Booking held. Nothing sent to the supplier');
      steps.push('Payment request sent to ' + CS.party(t.party).first + (S.credit.worstInv ? ' with ' + S.credit.worstInv.id + ' attached' : ''));
      steps.push('Comes back to your inbox, ready to book, when the invoice is marked paid');
      t.held = true;
      CS.feed('Held a booking for ' + CS.party(t.party).sub + ', ' + CS.money(S.credit.owed) + ' owed', 'alert');
    } else if (k === 'ask') {
      sendDraft(drafts[0]); steps.push('Asked ' + CS.party(t.party).first + ' for the missing details');
    } else if (k === 'exchange' || k === 'collect') {
      var j2 = CS.job(S.job);
      if (k === 'exchange') { j2.status = 'exchange'; j2.exDay = S.day; CS.jobLog(j2, 'Exchange booked for ' + CS.fmtDay(S.day)); }
      else { j2.status = 'collection'; j2.colDay = S.day; CS.jobLog(j2, 'Collection booked for ' + CS.fmtDay(S.day)); }
      sendDraft(drafts[0]); sendDraft(drafts[1], j2.id);
      steps.push((k === 'exchange' ? 'Exchange' : 'Collection') + ' booked on ' + j2.id);
      steps.push('Sent to ' + CS.sup(j2.sup).name + ' on WhatsApp');
      steps.push('Reply sent to ' + CS.party(t.party).first);
      CS.schedule(6, { type: 'supReply', sup: j2.sup, job: j2.id, text: 'Yep ' + CS.dayPhrase(S.day).replace(/^on /, '') + ' AM for ' + j2.id + ', no problem', noStatus: true });
      CS.feed((k === 'exchange' ? 'Exchange' : 'Collection') + ' booked on ' + j2.id, 'exchange');
    } else if (k === 'wtn') {
      var j3 = CS.job(S.job); j3.wtn = 'received'; if (j3.status === 'confirmed' || j3.status === 'booked') j3.status = 'onhire';
      CS.jobLog(j3, 'Delivered 08:40, WTN filed'); sendDraft(drafts[0]);
      steps.push('WTN filed to ' + j3.id + ' and kept for 2 years'); steps.push(j3.id + ' marked delivered'); steps.push('Customer told it\'s down');
      CS.feed('WTN filed for ' + j3.id + ', delivered', 'certificate');
    } else if (k === 'confirm') {
      var j4 = CS.job(S.job); if (j4.status === 'booked') j4.status = 'confirmed'; CS.jobLog(j4, 'Supplier confirmed'); sendDraft(drafts[0]);
      steps.push(j4.id + ' marked confirmed'); steps.push('Confirmation sent to ' + CS.cust(j4.cust).first);
      CS.feed('Confirmed ' + j4.id + ' to ' + CS.cust(j4.cust).name, 'circle-check');
    } else if (k === 'reschedule') {
      var j5 = CS.job(S.job); j5.day = S.day; j5.status = 'confirmed'; CS.jobLog(j5, 'Moved to ' + CS.fmtDay(S.day) + ', supplier short of a driver');
      sendDraft(drafts[0]); sendDraft(drafts[1]);
      steps.push(j5.id + ' moved to ' + CS.fmtDay(S.day)); steps.push(CS.cust(j5.cust).first + ' told'); steps.push(CS.sup(j5.sup).name + ' confirmed');
      CS.feed('Moved ' + j5.id + ' to ' + CS.fmtDay(S.day), 'calendar');
    } else if (k === 'paid') {
      var inv = CS.inv(S.inv); inv.status = 'paid'; inv.paidDay = 0;
      steps.push(inv.id + ' marked paid'); steps.push('Ready to sync to Xero'); steps.push('Removed from the chase list');
      CS.feed(inv.id + ' paid, ' + CS.money(inv.amount, true), 'pound');
    } else if (k === 'pack') {
      drafts[0].att = S.att; sendDraft(drafts[0]);
      steps.push(S.att.length + ' WTNs attached, one per job'); steps.push('Emailed to ' + CS.party(t.party).first);
      CS.feed('Sent ' + S.att.length + ' WTNs to ' + CS.party(t.party).sub, 'certificate');
    } else if (k === 'bill') {
      var b = CS.S.bills.filter(function (x) { return x.id === S.bill; })[0]; b.status = 'approved';
      CS.S.leaks.forEach(function (l) { if (l.bill === b.id) l.status = 'recharged'; });
      var jb = CS.job(b.job); jb.cost = b.billed; jb.sell += 45; CS.jobLog(jb, 'Overweight recharged, £45');
      var iv = CS.S.invoices.filter(function (x) { return x.jobs.indexOf(jb.id) >= 0; })[0]; if (iv) iv.amount += 45;
      drafts[0].att = S.att; sendDraft(drafts[0]);
      steps.push('Bill ' + b.id + ' approved for payment'); steps.push('£45 overweight added to ' + (iv ? iv.id : 'the next invoice')); steps.push(CS.cust(jb.cust).first + ' told, ticket attached');
      CS.feed('Recharged overweight on ' + jb.id + ', margin kept', 'receipt');
    } else {
      steps.push('Marked as done');
    }
    t.done = true; t.unread = false;
    if (k === 'paid') CS.releaseHolds(CS.inv(S.inv).cust);
    CS.saved(S.mins || 1);
    CS.commit('approve');
    return steps;
  };
  function chName(ch) { return ch === 'wa' ? 'WhatsApp' : (ch === 'email' ? 'email' : (ch === 'portal' ? 'customer link' : 'website')); }
  function replyCh(ch) { return ch === 'portal' ? 'wa' : ch; }
  CS.chName = chName;

  /* An incoming message, from the live script, the "send a test message" phone, or a supplier reply. */
  CS.incoming = function (o) {
    var party = o.party;
    if (party.type === 'newlead') {
      var id = 'l' + (CS.S.counters.lead++);
      CS.S.leads.unshift({ id: id, company: party.company, contact: party.contact, area: party.area, type: 'General builder', source: o.ch === 'web' ? 'Website' : 'WhatsApp', stage: 'new', value: 900, next: 0, nextWhat: 'Send quote', last: 0, lastWhat: 'New enquiry' });
      party = { type: 'lead', id: id };
      CS.feed('New lead ' + party.id + ' from the website, given to ' + CS.bde(), 'user-plus');
    }
    var t;
    if (o.ch === 'web' || o.ch === 'portal' || o.newThread) { t = { id: 't' + (CS.S.counters.thread++), party: party, ch: o.ch, msgs: [], last: Date.now() }; CS.S.threads.push(t); }
    else {
      t = CS.threadFor(party, o.ch);
      var lm = t.msgs[t.msgs.length - 1];
      if (!t.done && lm && lm.dir === 'in' && t.scn && t.scn.kind !== 'parse') { t = { id: 't' + (CS.S.counters.thread++), party: party, ch: o.ch, msgs: [], last: Date.now() }; CS.S.threads.push(t); }
    }
    t.done = false; t.unread = true; t.fresh = true; t.scn = o.scn || { kind: 'parse' };
    delete t.supOverride; delete t.siteOverride; delete t.priceOverride; delete t.edits;
    if (o.subject) t.subject = o.subject; if (o.form) t.form = o.form;
    CS.addMsg(t, 'in', o.text, { att: o.att, voice: o.voice });
    return t;
  };

  /* ---------- the clock: live messages and supplier replies ---------- */
  CS.isLeader = function (prefer) {
    var l = null; try { l = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (e) {}
    var now = Date.now();
    if (!l || l.id === ME || now - l.ts > 3500 || (prefer && !l.prefer)) { try { localStorage.setItem(LKEY, JSON.stringify({ id: ME, ts: now, prefer: !!prefer })); } catch (e) {} return true; }
    return false;
  };
  CS.tick = function (opts) {
    opts = opts || {};
    if (!CS.isLeader(opts.prefer)) return [];
    var S = CS.S, now = Date.now(), arrived = [];
    if (opts.runLive && S.settings.live) {
      if (!S.liveT0) { S.liveT0 = now; CS.save(); }
      while (S.liveIdx < S.live.length && now >= S.liveT0 + S.live[S.liveIdx].at * 1000) {
        var L = S.live[S.liveIdx++];
        var t = CS.incoming(L);
        if (L.scn && L.scn.kind === 'confirm') { var jj = CS.job(L.scn.job); if (jj && jj.status === 'booked') { jj.status = 'confirmed'; CS.jobLog(jj, 'Supplier confirmed (read automatically)'); } }
        arrived.push(t);
      }
    }
    var due = S.events.filter(function (e) { return e.due <= now; });
    if (due.length) {
      S.events = S.events.filter(function (e) { return e.due > now; });
      due.forEach(function (e) {
        if (e.type === 'custReply') {
          arrived.push(CS.incoming({ party: { type: 'customer', id: e.cust }, ch: 'wa', text: e.text, scn: e.scn }));
        }
        if (e.type === 'supReply') {
          var j = CS.job(e.job);
          var t2 = CS.incoming({ party: { type: 'supplier', id: e.sup }, ch: 'wa', text: e.text, scn: { kind: e.noStatus ? 'none' : 'confirm', job: e.job } });
          if (j && !e.noStatus && j.status === 'booked') { j.status = 'confirmed'; CS.jobLog(j, 'Supplier confirmed (read automatically)'); }
          if (j && e.noStatus) { t2.unread = false; t2.done = true; CS.jobLog(j, CS.sup(e.sup).name + ' confirmed'); }
          CS.feed(CS.sup(e.sup).name + ' confirmed ' + e.job, 'circle-check');
          arrived.push(t2);
        }
      });
    }
    if (arrived.length) CS.commit('incoming');
    return arrived;
  };

  /* ---------- simple actions used across the screens ---------- */
  CS.chaseSupplier = function (jid) {
    var j = CS.job(jid), su = CS.sup(j.sup), s = CS.jobSite(j);
    var t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa');
    CS.addMsg(t, 'out', 'Hi ' + su.contact + ', can you confirm ' + j.id + ', ' + CS.jobDesc(j).toLowerCase() + ' at ' + s.pc + ' ' + CS.dayPhrase(j.day) + ' please? Thanks, John (CAC)', { by: 'Chase' });
    j.chased = (j.chased || 0) + 1; CS.jobLog(j, 'Supplier chased on WhatsApp');
    CS.schedule(4, { type: 'supReply', sup: su.id, job: j.id, text: 'Sorry John, yes ' + j.id + ' is on ' + CS.dayPhrase(j.day).replace(/^on /, 'for ') });
    CS.saved(3); CS.feed('Chased ' + su.name + ' for ' + j.id, 'bell');
  };
  CS.chaseWtn = function (jid) {
    var j = CS.job(jid), su = CS.sup(j.sup);
    var t = CS.threadFor({ type: 'supplier', id: su.id }, 'wa');
    CS.addMsg(t, 'out', 'Hi ' + su.contact + ', still need the WTN for ' + j.id + ' (' + CS.jobSite(j).pc + ') please. Cheers, John (CAC)', { by: 'Chase' });
    j.wtn = 'chased'; CS.jobLog(j, 'WTN chased'); CS.saved(2); CS.feed('Chased the WTN for ' + j.id, 'certificate');
  };
  CS.remind = function (iid) {
    var inv = CS.inv(iid), c = CS.cust(inv.cust);
    var t = CS.threadFor({ type: 'customer', id: c.id }, 'email');
    t.subject = t.subject || 'Invoice ' + inv.id;
    var od = -inv.due;
    CS.addMsg(t, 'out', greet(c.first) + '\n\nJust a nudge on ' + inv.id + ' for ' + CS.money(inv.amount, true) + (od > 0 ? ', ' + od + ' days past due' : ', due ' + CS.dayPhrase(inv.due).replace(/^on /, '')) + '. Copy attached. If it\'s already gone, ignore this.\n\n' + signoff('john'), { by: 'Chase', att: [{ n: inv.id + '.pdf', t: 'doc' }] });
    inv.reminded = (inv.reminded || 0) + 1; CS.saved(3); CS.feed('Payment reminder sent for ' + inv.id, 'pound');
  };
  CS.chaseQuote = function (qid) {
    var q = CS.quote(qid); var p = q.cust ? { type: 'customer', id: q.cust } : { type: 'lead', id: q.lead };
    var who = CS.party(p);
    var t = CS.threadFor(p, 'wa');
    CS.addMsg(t, 'out', greet(who.first) + ' just checking you got the price for ' + q.desc.toLowerCase() + ', ' + CS.money(q.sell) + ' + VAT? Happy to get it booked in. ' + signoff(q.owner), { by: 'Chase' });
    q.chased = (q.chased || 0) + 1; CS.saved(2); CS.feed('Followed up ' + q.id, 'file-text');
  };
  CS.chaseLists = function () {
    var S = CS.S, now = Date.now();
    var sup = S.jobs.filter(function (j) { return j.status === 'booked'; }).map(function (j) { return { j: j, mins: Math.round((now - (j.bookedAt || now)) / 60000) }; }).sort(function (a, b) { return b.mins - a.mins; });
    var wtn = S.jobs.filter(function (j) { return (j.wtn === 'missing' || j.wtn === 'chased') && j.day <= -S.settings.wtnDays; });
    var pay = S.invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; }).sort(function (a, b) { return a.due - b.due; });
    var quotes = S.quotes.filter(function (q) { return q.status === 'sent' && q.day <= -2; });
    var nudge = CS.nudges();
    return { sup: sup, wtn: wtn, pay: pay, quotes: quotes, nudge: nudge, total: sup.length + wtn.length + pay.length + quotes.length + nudge.length };
  };
  CS.stats = function () {
    var S = CS.S;
    var live = S.jobs.filter(function (j) { return j.status !== 'done'; });
    var monthMargin = S.jobs.reduce(function (a, j) { return a + (j.sell - j.cost); }, 0);
    var needs = S.threads.filter(CS.needsYou);
    return {
      needs: needs.length, unread: S.threads.filter(function (t) { return t.unread && !t.done; }).length,
      today: S.jobs.filter(function (j) { return j.day === 0 || j.exDay === 0 || j.colDay === 0; }).length,
      tomorrow: S.jobs.filter(function (j) { return j.day === 1 || j.exDay === 1 || j.colDay === 1; }).length,
      live: live.length, onhire: S.jobs.filter(function (j) { return j.status === 'onhire' || j.status === 'exchange' || j.status === 'collection'; }).length,
      awaiting: S.jobs.filter(function (j) { return j.status === 'booked'; }).length,
      margin: monthMargin,
      owed: S.invoices.filter(function (i) { return i.status !== 'paid'; }).reduce(function (a, i) { return a + i.amount; }, 0),
      overdue: S.invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; }).reduce(function (a, i) { return a + i.amount; }, 0),
      quotesOpen: S.quotes.filter(function (q) { return q.status === 'sent' || q.status === 'draft'; }).length
    };
  };
  /* ---------- round 2: credit, nudges, money found, permits, reports ---------- */
  CS.credit = function (custId, add) {
    var c = CS.cust(custId); if (!c) return null;
    var unpaid = CS.S.invoices.filter(function (i) { return i.cust === custId && i.status !== 'paid'; });
    var owed = unpaid.reduce(function (a, i) { return a + i.amount; }, 0);
    var late = unpaid.filter(function (i) { return i.due < 0; }).sort(function (a, b) { return a.due - b.due; });
    var overdue = late.reduce(function (a, i) { return a + i.amount; }, 0), worst = late.length ? -late[0].due : 0;
    var r = { limit: c.limit || 0, owed: owed, overdue: overdue, worst: worst, worstInv: late[0] || null, card: !c.limit, unpaid: unpaid };
    if (r.card) { r.state = 'card'; r.label = 'Card'; return r; }
    var over = owed + (add || 0) > r.limit;
    r.hold = worst > 14 || (over && overdue > 0) || owed > r.limit;
    r.state = r.hold ? 'hold' : (overdue > 0 ? 'late' : 'good');
    r.label = r.hold ? 'On hold' : (overdue > 0 ? worst + ' days late' : 'Good');
    r.why = owed > r.limit ? CS.money(owed, true) + ' owed against a ' + CS.money(r.limit) + ' limit' + (worst ? ', and ' + (late[0].id) + ' is ' + worst + ' days late.' : '.')
      : (worst > 14 ? late[0].id + ' is ' + worst + ' days late.' : (over ? 'This order would take them over their ' + CS.money(r.limit) + ' limit with ' + CS.money(overdue, true) + ' already late.' : ''));
    return r;
  };
  /* When a customer pays, any booking held for them comes back ready to approve. */
  CS.releaseHolds = function (custId) {
    var n = 0;
    if (CS.credit(custId, 0).hold) return 0;
    CS.S.threads.forEach(function (t) {
      if (!t.held || t.party.type !== 'customer' || t.party.id !== custId) return;
      t.held = false; t.done = false; t.unread = true; t.creditOk = true; t.last = Date.now(); n++;
      t.msgs.forEach(function (m) { if (m.dir === 'out') m.auto = true; });
    });
    if (n) CS.feed(CS.cust(custId).name + ' paid. Held booking is back in the inbox', 'circle-check');
    return n;
  };
  CS.aged = function (custId) {
    var b = { current: 0, d30: 0, d60: 0, total: 0, rows: [] };
    CS.S.invoices.filter(function (i) { return i.cust === custId && i.status !== 'paid'; }).sort(function (a, b2) { return a.due - b2.due; }).forEach(function (i) {
      var late = -i.due; b.total += i.amount; b.rows.push(i);
      if (late <= 0) b.current += i.amount; else if (late <= 30) b.d30 += i.amount; else b.d60 += i.amount;
    });
    return b;
  };
  /* Skips that have sat too long, or are about due the customer's usual swap. */
  CS.nudges = function () {
    var out = [];
    CS.S.jobs.forEach(function (j) {
      if (j.svc !== 'skip' || j.status !== 'onhire' || j.nudged) return;
      var c = CS.cust(j.cust), su = CS.sup(j.sup), days = -j.day, inc = su.hireDays || 14;
      if (days > inc) {
        var weeks = Math.ceil((days - inc) / 7);
        out.push({ j: j, days: days, kind: 'long', why: days + ' days on site, ' + inc + ' included. ' + su.name + ' charge ' + CS.money(su.weekRate || 25) + ' a week after that (' + CS.money(weeks * (su.weekRate || 25)) + ' so far).' });
      } else if (c.swapDays && (j.site || 0) === 0 && days >= c.swapDays - 1) {
        out.push({ j: j, days: days, kind: 'due', why: c.first + ' has swapped here about every ' + c.swapDays + ' days. This one has been down ' + days + '.' });
      }
    });
    return out.sort(function (a, b) { return b.days - a.days; });
  };
  CS.nudge = function (jid) {
    var j = CS.job(jid), c = CS.cust(j.cust), s = CS.jobSite(j), n = CS.nudges().filter(function (x) { return x.j.id === jid; })[0];
    var t = CS.threadFor({ type: 'customer', id: c.id }, 'wa');
    var long = n && n.kind === 'long';
    CS.addMsg(t, 'out', greet(c.first) + ' the ' + j.size + ' yarder at ' + s.name + (long ? ' has been with you ' + (-j.day) + ' days. Want it swapped or collected? There\'s a weekly hire charge after 14 days, so worth sorting.' : ' has been down ' + (-j.day) + ' days. Ready for a swap yet?') + ' ' + signoff(j.owner), { by: j.owner === 'sam' ? CS.bde() : 'John' });
    j.nudged = true; CS.jobLog(j, 'Customer asked: swap or collect?');
    CS.schedule(6, { type: 'custReply', cust: c.id, text: long ? 'collect it please mate, were done there' : 'yes please swap it tomorrow', scn: { kind: long ? 'collect' : 'exchange', job: j.id, day: 1 } });
    CS.saved(3); CS.feed('Nudged ' + c.name + ' about ' + j.id, 'bell');
  };
  /* Extras nobody has recharged yet. */
  CS.openLeaks = function () { return CS.S.leaks.filter(function (l) { return l.status === 'open'; }); };
  CS.leakTotals = function () { var o = CS.openLeaks(); return { n: o.length, cost: o.reduce(function (a, l) { return a + l.cost; }, 0), recharge: o.reduce(function (a, l) { return a + l.recharge; }, 0) }; };
  CS.recharge = function (lid) {
    var l = CS.S.leaks.filter(function (x) { return x.id === lid; })[0]; if (!l || l.status !== 'open') return null;
    var j = CS.job(l.job), c = CS.cust(j.cust);
    j.cost += l.cost; j.sell += l.recharge; l.status = 'recharged';
    var inv = CS.S.invoices.filter(function (i) { return i.cust === c.id && i.status !== 'paid' && i.jobs.indexOf(j.id) >= 0; })[0];
    if (inv) inv.amount += l.recharge;
    else { inv = { id: CS.nextId('inv', 'INV-'), cust: c.id, amount: l.recharge, issued: 0, due: 30, status: 'unpaid', jobs: [j.id], extra: l.type }; CS.S.invoices.unshift(inv); }
    var t = CS.threadFor({ type: 'customer', id: c.id }, 'wa');
    CS.addMsg(t, 'out', greet(c.first) + ' quick one on ' + j.id + ' at ' + CS.jobSite(j).name + ': ' + l.type.toLowerCase() + ' charge of ' + CS.money(l.recharge) + ' + VAT. ' + l.note.split('. ')[0] + '. It\'s on ' + inv.id + '. ' + signoff(j.owner), { by: 'John' });
    CS.jobLog(j, l.type + ' recharged, ' + CS.money(l.recharge)); CS.saved(6);
    CS.feed('Recharged ' + l.type.toLowerCase() + ' on ' + j.id + ', ' + CS.money(l.recharge), 'receipt');
    return inv.id;
  };
  CS.absorb = function (lid) { var l = CS.S.leaks.filter(function (x) { return x.id === lid; })[0]; if (!l) return; var j = CS.job(l.job); j.cost += l.cost; l.status = 'absorbed'; CS.jobLog(j, l.type + ' absorbed, ' + CS.money(l.cost)); };
  /* Supplier rate change, applied from a date so old quotes never book at a new cost. */
  CS.applyRateChange = function (reprice) {
    var rc = CS.S.rateChange, su = CS.sup(rc.sup); if (rc.status !== 'new') return;
    Object.keys(su.rates[rc.svc]).forEach(function (k) { su.rates[rc.svc][k] += rc.up; });
    rc.quotes.forEach(function (qid) { var q = CS.quote(qid); if (!q) return; var n = parseInt(q.desc, 10) || 1; q.cost += rc.up * n; if (reprice) q.sell += Math.ceil(rc.up * n * 1.33 / 5) * 5; q.repriced = !!reprice; });
    rc.status = reprice ? 'repriced' : 'absorbed';
    CS.feed(su.name + ' rates updated from ' + CS.fmtDay(rc.fromDay) + (reprice ? ', open quotes repriced' : ''), 'warehouse'); CS.saved(10);
  };
  /* Tonnes: the weighbridge figure when the supplier sent one, otherwise a typical weight for the container. */
  CS.tonnes = function (j) {
    if (j.t) return j.t;
    if (j.svc === 'skip') return Math.round((j.size || 8) * 0.27 * 10) / 10 * (j.qty || 1);
    if (j.svc === 'grab') return 15.5 * (j.qty || 1);
    if (j.svc === 'muck') return 18 * (j.qty || 1);
    return 0;
  };
  CS.report = function (custId) {
    var js = CS.S.jobs.filter(function (j) { return j.cust === custId && j.wtn === 'received' && CS.tonnes(j) > 0; });
    var c = CS.cust(custId), r = { jobs: js, moves: js.length, tonnes: 0, diverted: 0, co2: 0, sites: {}, streams: {} };
    js.forEach(function (j) {
      var t = CS.tonnes(j), rec = (CS.sup(j.sup).recov || 90) / 100, soil = j.svc !== 'skip';
      var sn = CS.jobSite(j).name, st = soil ? 'Soil and stones' : 'Mixed construction waste';
      r.tonnes += t; r.diverted += t * rec;
      r.co2 += soil ? (t * rec * 1.01 + t * (1 - rec) * 19.55) : (t * rec * 1.01 + t * (1 - rec) * 4.65);
      r.sites[sn] = r.sites[sn] || { t: 0, d: 0, n: 0 }; r.sites[sn].t += t; r.sites[sn].d += t * rec; r.sites[sn].n++;
      r.streams[st] = (r.streams[st] || 0) + t;
    });
    r.pct = r.tonnes ? Math.round(r.diverted / r.tonnes * 100) : 0; r.tonnes = Math.round(r.tonnes * 10) / 10; r.co2 = Math.round(r.co2);
    r.wtnAll = CS.S.jobs.filter(function (j) { return j.cust === custId && j.wtn && j.status !== 'booked' && j.status !== 'confirmed'; }).length;
    r.cust = c; return r;
  };
  CS.briefing = function () {
    var S = CS.S, st = CS.stats(), ch = CS.chaseLists(), lk = CS.leakTotals();
    var today = S.jobs.filter(function (j) { return j.day === 0 || j.exDay === 0 || j.colDay === 0; });
    var L = ['Morning John. Here\'s ' + CS.dayDate(0).toLocaleDateString('en-GB', { weekday: 'long' }) + '.'];
    L.push('On today: ' + (today.length ? today.map(function (j) { return CS.jobDesc(j).toLowerCase() + ' for ' + CS.cust(j.cust).name; }).join(', ') : 'nothing booked yet') + '.');
    L.push(st.needs + ' messages came in and are drafted, ready for a tap.');
    if (ch.sup.length) L.push('Not confirmed yet: ' + ch.sup.map(function (x) { return CS.sup(x.j.sup).name + ' (' + x.j.id + ')'; }).join(', ') + '. Chased.');
    if (ch.pay.length) L.push(CS.money(st.overdue) + ' overdue across ' + ch.pay.length + ' invoices. Reminders ready.');
    if (lk.n) L.push(CS.money(lk.recharge) + ' of extras to recharge on ' + lk.n + ' jobs.');
    if (ch.nudge.length) L.push(ch.nudge.length + ' skips worth a nudge.');
    return L;
  };
  CS.replyCh = replyCh;
})();
