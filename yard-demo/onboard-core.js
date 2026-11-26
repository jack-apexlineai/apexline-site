/* Supplier onboarding and compliance, the data and the rules (built 24 Nov 2026, second-call copy only).
   Every supplier has a compliance record: documents with end dates and reminders, the checks a person made,
   the consents they signed, the credit terms they give Demo Skip & Grab, and an audit trail of who approved what and when.
   A supplier can only be booked once approved, and is held back automatically if a required document runs out.
   Sample data only. Nothing leaves this browser and nothing is sent. */
(function () {
  var CS = window.CS; if (!CS) return;
  var C = CS.COMP = {};
  var ME = 'Dave Archer';

  /* ---------- the document types ---------- */
  C.TYPES = [
    { k: 'wcl', n: 'Waste carrier licence', s: 'Carrier licence', ins: false, waste: true },
    { k: 'permit', n: 'Permit or exemption for each tip site', s: 'Tip site permits', ins: false, waste: true, perSite: true },
    { k: 'pl', n: 'Public liability insurance', s: 'Public liability', ins: true },
    { k: 'el', n: 'Employer\'s liability insurance', s: 'Employer\'s liability', ins: true },
    { k: 'git', n: 'Goods in transit insurance', s: 'Goods in transit', ins: true },
    { k: 'fors', n: 'FORS accreditation', s: 'FORS', ins: false, opt: true },
    { k: 'chas', n: 'CHAS accreditation', s: 'CHAS', ins: false, opt: true }
  ];
  C.type = function (k) { return C.TYPES.filter(function (t) { return t.k === k; })[0]; };
  C.TERMS = ['14 days', '30 days', '30 days end of month', '45 days', '60 days'];

  function hash(s) { var n = 7; s = String(s); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 100003; return n; }
  function at(off, hh, mm) { var d = CS.dayDate(off); d.setHours(hh == null ? 9 : hh, mm || 0, 0, 0); return d.getTime(); }
  C.at = at;
  C.days = function (ts) { return Math.floor((ts - CS.dayDate(0).getTime()) / 864e5); };
  C.iso = function (off) { var d = CS.dayDate(off); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  C.offOf = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null; return Math.round((new Date(+m[1], +m[2] - 1, +m[3]) - CS.dayDate(0)) / 864e5); };
  C.dateOf = function (off) { return CS.dayDate(off).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  C.when = function (ts) { var d = new Date(ts); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  C.cover = function (n) { n = Number(n) || 0; return n >= 1e6 ? '£' + (Math.round(n / 1e5) / 10) + 'm' : CS.money(n); };
  C.me = function () { return ME; };

  /* ---------- the sample records, built the same way every day from the supplier list ---------- */
  function wasteSup(su) { return su.wtn != null; }
  function carrier(su) { return su.licExp != null; }
  function permitNo(su) { var n = hash(su.id + su.name); return 'EPR/' + String.fromCharCode(65 + n % 26, 65 + (n >> 3) % 26) + (3000 + n % 6000) + String.fromCharCode(65 + (n >> 5) % 26, 65 + (n >> 7) % 26); }
  function sampleRec(su) {
    var n = hash(su.id + su.name), joined = -(30 + n % 70), docs = [];
    var ck = function (off) { return { by: ME, at: at(joined + (off || 0), 10, 5 + n % 50) }; };
    if (carrier(su)) docs.push({ k: 'wcl', no: su.cbdu, tier: 'Upper', exp: su.licExp, file: 'Carrier licence ' + su.cbdu + '.pdf', up: joined, reg: { at: at(joined, 10, 2), no: su.cbdu, holder: su.name.toUpperCase() + ' LTD', tier: 'Upper', type: 'Carrier, Broker, Dealer', exp: su.licExp, ok: true, sample: true } });
    if (wasteSup(su)) docs.push({ k: 'permit', site: su.base + ' waste transfer station', kind: 'Permit', no: permitNo(su), exp: null, file: 'Environmental permit.pdf', up: joined });
    docs.push({ k: 'pl', no: 'PL-' + (100000 + n % 899999), cover: n % 3 ? 5e6 : 10e6, exp: su.id === 's4' ? 26 : 70 + n % 280, file: 'Public liability schedule.pdf', up: joined, chk: ck() });
    docs.push({ k: 'el', no: 'EL-' + (200000 + n % 799999), cover: 10e6, exp: 100 + (n >> 2) % 250, file: 'Employers liability certificate.pdf', up: joined, chk: ck() });
    docs.push({ k: 'git', no: 'GT-' + (300000 + n % 699999), cover: n % 2 ? 50000 : 100000, exp: 90 + (n >> 3) % 260, file: 'Goods in transit schedule.pdf', up: joined, chk: ck() });
    if (n % 3 === 0) docs.push({ k: 'fors', level: ['Bronze', 'Silver', 'Gold'][n % 3], no: 'FORS-' + (4000 + n % 5000), exp: 150 + n % 200, file: 'FORS certificate.pdf', up: joined });
    if (n % 4 === 1) docs.push({ k: 'chas', no: 'CHAS-' + (50000 + n % 40000), exp: 120 + n % 220, file: 'CHAS certificate.pdf', up: joined });
    var sig = { name: su.contact + ' ' + ['Hale', 'Barker', 'Dunn', 'Rix', 'Cole', 'Ward', 'Platt', 'Royle'][n % 8], pos: 'Director', typed: true, at: at(joined - 1, 16, 10 + n % 40) };
    return { st: 'approved', joined: joined, by: ME, at: at(joined, 10, 20 + n % 30), docs: docs, terms: ['30 days', '30 days end of month', '14 days', '30 days'][n % 4],
      cons: { terms: sig.at, duty: sig.at, data: sig.at, sig: sig }, sent: [], via: 'link' };
  }
  function seed() {
    var S = CS.S, sup = {}, log = [];
    function L(ts, who, sid, t, kind) { log.push({ at: ts, who: who, sup: sid, t: t, kind: kind || 'info' }); }
    S.suppliers.forEach(function (su) {
      var r = sup[su.id] = sampleRec(su);
      L(r.cons.sig.at, 'Supplier: ' + r.cons.sig.name, su.id, 'Filled in the onboarding link and signed the supplier terms, duty of care declaration and data consent', 'sign');
      if (carrier(su)) L(r.at - 18 * 60000, ME, su.id, 'Checked carrier licence ' + su.cbdu + ' on the Environment Agency register: upper tier, name matches', 'reg');
      L(r.at - 9 * 60000, ME, su.id, 'Checked the insurance certificates by eye: public liability, employer\'s liability, goods in transit', 'check');
      L(r.at, ME, su.id, 'Approved. Can be booked from now', 'approve');
    });
    /* the ones that make the page worth looking at */
    function doc(id, k) { return (sup[id] && sup[id].docs.filter(function (d) { return d.k === k; })[0]) || null; }
    var d;
    if (sup.s16 && (d = doc('s16', 'pl'))) {      /* insurance ran out six days ago: held back automatically */
      d.exp = -6;
      L(at(-36, 9, 0), 'System', 's16', 'Reminder emailed to Terry: public liability runs out on ' + C.dateOf(-6) + ', please send the renewal', 'remind');
      L(at(-13, 11, 42), ME, 's16', 'Chased Terry for the public liability renewal', 'chase');
      L(at(-6, 0, 1), 'System', 's16', 'Blocked automatically: public liability insurance ran out', 'block');
      sup.s16.sent = [{ k: 'pl', at: at(-36, 9, 0), how: 'auto' }, { k: 'pl', at: at(-13, 11, 42), how: 'chase', by: ME }];
    }
    if (sup.s17 && (d = doc('s17', 'wcl'))) {     /* carrier licence due: the reminder has already gone */
      d.exp = 18; d.reg.exp = 18;
      var s17 = CS.sup('s17'); if (s17) s17.licExp = 18;
      L(at(-12, 9, 0), 'System', 's17', 'Reminder emailed to Mick: carrier licence ' + d.no + ' runs out on ' + C.dateOf(18) + ', please send the new one', 'remind');
      sup.s17.sent = [{ k: 'wcl', at: at(-12, 9, 0), how: 'auto' }];
    }
    if (sup.s3 && (d = doc('s3', 'el'))) {
      d.exp = 25; sup.s3.terms = '30 days end of month';
      L(at(-5, 9, 0), 'System', 's3', 'Reminder emailed to Martin: employer\'s liability runs out on ' + C.dateOf(25), 'remind');
      sup.s3.sent = [{ k: 'el', at: at(-5, 9, 0), how: 'auto' }];
    }
    if (sup.s4 && (d = doc('s4', 'pl'))) {
      L(at(-4, 9, 0), 'System', 's4', 'Reminder emailed to Jo: public liability runs out on ' + C.dateOf(26), 'remind');
      sup.s4.sent = [{ k: 'pl', at: at(-4, 9, 0), how: 'auto' }];
    }
    if (sup.s6 && (d = doc('s6', 'git'))) {        /* the renewal came in through their link this morning: a person still has to look at it */
      d.prevExp = 20; d.exp = 365; d.up = 0; d.file = 'GIT renewal 2027.pdf'; d.chk = null; d.renewed = true;
      L(at(0, 8, 14), 'Supplier: Rachel', 's6', 'Uploaded a new goods in transit certificate through their link', 'upload');
    }
    if (sup.s12) {
      var f = doc('s12', 'fors'); if (!f) { f = { k: 'fors', level: 'Bronze', no: 'FORS-7781', file: 'FORS certificate.pdf', up: -200 }; sup.s12.docs.push(f); }
      f.exp = -40;
    }
    /* any other document already inside its reminder month had its reminder go out on the day */
    S.suppliers.forEach(function (su) {
      var r = sup[su.id];
      r.docs.forEach(function (x) {
        if (x.exp == null || x.exp - 30 > 0 || (r.sent || []).some(function (y) { return y.k === x.k; })) return;
        var ts = at(Math.max(x.exp - 30, r.joined), 9, 0);
        r.sent = (r.sent || []).concat([{ k: x.k, at: ts, how: 'auto' }]);
        L(ts, 'System', su.id, 'Reminder emailed to ' + su.contact + ': ' + C.type(x.k).n.toLowerCase() + ' runs out on ' + C.dateOf(x.exp) + ', please send the new one', 'remind');
      });
    });
    /* who has been sent the link, who is waiting to be approved */
    var apps = [
      { id: 'a1', code: 'wd7k2', name: 'Wendmoor Skip Hire Ltd', who: 'Lee', email: 'lee@wendmoorskips.co.uk', phone: '07700 900412', st: 'submitted', sentAt: at(-2, 15, 5), sentBy: ME, opened: at(-1, 15, 58), sub: at(-1, 16, 42),
        chk: { el: { by: 'Ellie Ward', at: at(-1, 17, 5) }, git: { by: 'Ellie Ward', at: at(-1, 17, 6) } },
        data: {
          company: { name: 'Wendmoor Skip Hire Ltd', chno: '13820417', addr: 'Unit 4, Wendmoor Farm, Chobham', pc: 'GU24 8RP', phone: '01276 000412', email: 'office@wendmoorskips.co.uk' },
          book: { name: 'Lee Marsh', phone: '07700 900412', wa: true, email: 'bookings@wendmoorskips.co.uk' }, acc: { name: 'Karen Marsh', phone: '01485 000413', email: 'accounts@wendmoorskips.co.uk' }, ooh: '07700 900414',
          depots: [{ name: 'Chobham yard', pc: 'GU24 8RP' }], tips: [{ name: 'Wendmoor transfer station, Chobham', pc: 'GU24 8RP', kind: 'Permit', no: 'EPR/WB3184KX', exp: '' }],
          areas: ['GU21', 'GU22', 'GU23', 'GU24', 'KT14', 'KT15', 'KT16', 'GU18', 'GU19'], svcs: ['skip', 'grab'], sizes: [4, 6, 8, 12, 16, 20],
          prices: { file: 'Wendmoor prices Nov 2026.pdf', rates: { skip: { 4: 150, 6: 178, 8: 199, 12: 262, 16: 312, 20: 420 }, grab: 300 } },
          terms: '30 days',
          docs: {
            wcl: { no: 'CBDU512094', tier: 'Upper', exp: C.iso(612), file: 'Wendmoor carrier licence.pdf' },
            pl: { cover: 5e6, exp: C.iso(211), file: 'Wendmoor PL schedule.pdf' },
            el: { cover: 10e6, exp: C.iso(211), file: 'Wendmoor EL certificate.jpg' },
            git: { cover: 50000, exp: C.iso(211), file: 'Wendmoor GIT.pdf' },
            fors: { level: 'Bronze', exp: C.iso(140), file: 'FORS Bronze.pdf' }
          },
          cons: { terms: at(-1, 16, 41), duty: at(-1, 16, 41), data: at(-1, 16, 41) },
          sig: { name: 'Lee Marsh', pos: 'Director', typed: 'Lee Marsh', at: at(-1, 16, 42) }
        } },
      { id: 'a2', code: 'hf3m8', name: 'Holmfen Grab and Muckaway', who: 'Dale', email: 'dale@holmfengrab.co.uk', phone: '07700 900427', st: 'submitted', sentAt: at(-4, 10, 12), sentBy: ME, opened: at(-3, 18, 3), sub: at(-3, 19, 26),
        data: {
          company: { name: 'Holmfen Grab and Muckaway', chno: '', addr: 'Holmfen Lane, Pirbright', pc: 'GU24 0NL', phone: '07700 900427', email: 'dale@holmfengrab.co.uk' },
          book: { name: 'Dale Pryor', phone: '07700 900427', wa: true, email: 'dale@holmfengrab.co.uk' }, acc: { name: 'Dale Pryor', phone: '07700 900427', email: 'dale@holmfengrab.co.uk' }, ooh: '',
          depots: [{ name: 'Pirbright', pc: 'GU24 0NL' }], tips: [{ name: 'Fen Lane inert recycling, Normandy', pc: 'GU3 2JR', kind: 'Exemption', no: 'WEX318842 (U1)', exp: C.iso(402) }],
          areas: ['GU24', 'GU3', 'GU15', 'GU16', 'GU19', 'GU21', 'GU22'], svcs: ['grab', 'muck'], sizes: [],
          prices: { file: 'price list photo.jpg', rates: { grab: 285, muck: 360 } },
          terms: '14 days',
          docs: {
            wcl: { no: 'CBDU527318', tier: 'Upper', exp: C.iso(488), file: 'licence.jpg' },
            pl: { cover: 5e6, exp: C.iso(96), file: 'insurance.pdf' },
            el: { cover: 10e6, exp: C.iso(96), file: 'insurance.pdf' }
          },
          cons: { terms: at(-3, 19, 25), duty: at(-3, 19, 25), data: at(-3, 19, 25) },
          sig: { name: 'Dale Pryor', pos: 'Owner', typed: 'Dale Pryor', at: at(-3, 19, 26) }
        } },
      { id: 'a3', code: 'wr9p4', name: 'Westrow Haulage', who: 'Sean', email: 'sean@westrowhaulage.co.uk', phone: '07700 900433', st: 'invited', sentAt: at(-2, 9, 40), sentBy: ME, opened: null, sub: null, data: null }
    ];
    L(apps[1].sentAt, ME, 'a2', 'Sent the onboarding link to Dale at Holmfen Grab and Muckaway', 'invite');
    L(apps[1].sub, 'Supplier: Dale Pryor', 'a2', 'Filled in the onboarding link and signed the supplier terms, duty of care declaration and data consent', 'sign');
    L(apps[0].sentAt, ME, 'a1', 'Sent the onboarding link to Lee at Wendmoor Skip Hire', 'invite');
    L(apps[0].sub, 'Supplier: Lee Marsh', 'a1', 'Filled in the onboarding link and signed the supplier terms, duty of care declaration and data consent', 'sign');
    L(apps[2].sentAt, ME, 'a3', 'Sent the onboarding link to Sean at Westrow Haulage', 'invite');
    L(at(-1, 17, 5), 'Ellie Ward', 'a1', 'Checked the employer\'s liability certificate by eye', 'check');
    L(at(-1, 17, 6), 'Ellie Ward', 'a1', 'Checked the goods in transit certificate by eye', 'check');
    log.sort(function (a, b) { return a.at - b.at; });
    return { v: 1, sup: sup, apps: apps, log: log, set: { remind: 30, req: { wcl: true, permit: true, pl: true, el: true, git: true, fors: false, chas: false }, minPL: 5e6, minEL: 10e6 } };
  }
  C.S = function () { var S = CS.S; if (!S) return null; if (!S.comp || S.comp.v !== 1) { S.comp = seed(); } return S.comp; };
  C.rec = function (sid) { var D = C.S(); if (!D) return null; if (!D.sup[sid]) { var su = CS.sup(sid); if (!su) return null;
    /* added by hand after today's sample was made: nothing on file yet, so it waits for documents and approval */
    D.sup[sid] = { st: 'pending', joined: 0, docs: [], terms: '30 days', cons: null, sent: [], via: 'hand', at: Date.now() };
    D.log.push({ at: Date.now(), who: ME, sup: sid, t: 'Added ' + su.name + ' by hand. Waiting for their documents before they can be booked', kind: 'info' }); }
    return D.sup[sid]; };
  C.app = function (id) { return (C.S().apps || []).filter(function (a) { return a.id === id || a.code === id; })[0] || null; };
  C.log = function (who, sid, t, kind) { var D = C.S(); D.log.push({ at: Date.now(), who: who || ME, sup: sid, t: t, kind: kind || 'info' }); };

  /* ---------- what each document means today ---------- */
  C.needed = function (su, k) {
    var t = C.type(k), D = C.S();
    if (!t) return false;
    if (t.waste && su && !(k === 'wcl' ? carrier(su) : wasteSup(su))) return false;
    return !!D.set.req[k];
  };
  C.relevant = function (su, k) { var t = C.type(k); return !(t.waste && su && !(k === 'wcl' ? carrier(su) : wasteSup(su))); };
  /* in date, due in 30 days, expired or missing. Insurance also has to have been looked at by a person. */
  C.st = function (d) {
    if (!d) return 'missing';
    if (d.exp == null) return 'ok';
    if (d.exp < 0) return 'expired';
    if (d.exp <= 30) return 'due';
    return 'ok';
  };
  C.stName = { ok: 'In date', due: 'Due in 30 days', expired: 'Expired', missing: 'Missing' };
  C.stCls = { ok: 'ok', due: 'amber', expired: 'bad', missing: 'bad' };
  C.remindOn = function (sid, d) { if (!d || d.exp == null) return null; var r = d.remind != null ? d.remind : C.S().set.remind; return d.exp - r; };
  C.lastSent = function (sid, k) { var r = C.rec(sid); var l = ((r && r.sent) || []).filter(function (x) { return x.k === k; }); return l.length ? l[l.length - 1] : null; };
  C.docs = function (sid) { var r = C.rec(sid); return r ? r.docs : []; };
  C.doc = function (sid, k) { return C.docs(sid).filter(function (d) { return d.k === k; })[0] || null; };

  /* can this supplier be booked? and if not, why not, in plain words */
  C.bookable = function (sid) {
    var su = CS.sup(sid), r = C.rec(sid), why = [];
    if (!su || !r) return { ok: true, why: [] };
    if (r.st === 'pending') why.push('Not approved yet');
    if (r.block) why.push('Blocked by ' + r.block.by + ': ' + r.block.why);
    C.TYPES.forEach(function (t) {
      if (!C.needed(su, t.k)) return;
      var ds = r.docs.filter(function (d) { return d.k === t.k; });
      if (!ds.length) { why.push(t.n + ' missing'); return; }
      ds.forEach(function (d) {
        if (C.st(d) === 'expired') why.push(t.n + (d.site ? ' for ' + d.site : '') + ' ran out on ' + C.dateOf(d.exp));
        /* the old one had run out and the new one is in, but nobody has looked at it yet */
        else if (t.ins && !d.chk && d.renewed && (d.prevExp == null || d.prevExp < 0)) why.push('New ' + t.n.toLowerCase() + ' not checked by a person yet');
      });
    });
    return { ok: !why.length, why: why };
  };
  C.status = function (sid) { var r = C.rec(sid), b = C.bookable(sid); if (r && r.st === 'pending') return 'pending'; return b.ok ? 'approved' : 'blocked'; };

  /* reminders go out by themselves on the day: a month before by default, editable per document */
  C.runReminders = function () {
    var D = C.S(); if (!D) return 0; var n = 0, now = Date.now(), t9 = at(0, 9, 0);
    CS.S.suppliers.forEach(function (su) {
      var r = C.rec(su.id); if (!r || r.st !== 'approved') return;
      r.docs.forEach(function (d) {
        var on = C.remindOn(su.id, d); if (on == null || on > 0) return;
        var last = C.lastSent(su.id, d.k);
        if (last && C.days(last.at) >= on) return;      /* already reminded for this renewal */
        var ts = now > t9 ? t9 : now; r.sent = (r.sent || []).concat([{ k: d.k, at: ts, how: 'auto' }]); n++;
        D.log.push({ at: ts, who: 'System', sup: su.id, t: 'Reminder emailed to ' + su.contact + ': ' + C.type(d.k).n.toLowerCase() + (d.exp < 0 ? ' ran out on ' : ' runs out on ') + C.dateOf(d.exp) + ', please send the new one', kind: 'remind' });
      });
    });
    if (n) D.log.sort(function (a, b) { return a.at - b.at; });
    return n;
  };

  /* bookings only ever offer suppliers who can be booked. The rest come back on .held, with the reason */
  var base = CS.lookup;
  CS.lookupAll = base;
  CS.lookup = function (pc, it) {
    if (!CS.S || !CS.S.suppliers) return base(pc, it);
    var all = CS.S.suppliers, ok = [], bad = [];
    all.forEach(function (s) { (C.bookable(s.id).ok ? ok : bad).push(s); });
    var r, held = [];
    if (!bad.length) { r = base(pc, it); r.held = []; return r; }
    try { CS.S.suppliers = ok; r = base(pc, it); CS.S.suppliers = bad; held = base(pc, it); } finally { CS.S.suppliers = all; }
    r.held = held.map(function (x) { return { sup: x.sup, cost: x.cost, why: C.bookable(x.sup.id).why }; });
    return r;
  };

  /* the credit terms each supplier gives Demo Skip & Grab: on their record, and used by the bill check */
  C.terms = function (sid) { var r = C.rec(sid); return (r && r.terms) || '30 days'; };
  C.termDays = function (t) { var m = /(\d+)/.exec(t || ''); return m ? +m[1] : 30; };
  C.payBy = function (sid, from) {
    var t = C.terms(sid), d = CS.dayDate(from || 0);
    if (/end of month/.test(t)) { d = new Date(d.getFullYear(), d.getMonth() + 1, 0); }
    d.setDate(d.getDate() + C.termDays(t));
    return d;
  };
  C.setTerms = function (sid, t, who) {
    var r = C.rec(sid); if (!r || !t || r.terms === t) return;
    var was = r.terms; r.terms = t;
    try { var su = CS.sup(sid), x = window.DSGV2 && window.DSGV2.x && window.DSGV2.x.hb(su); if (x) x.terms = t; } catch (e) {}
    C.log(who || ME, sid, 'Credit terms changed from ' + was + ' to ' + t, 'terms');
  };

  /* ---------- actions ---------- */
  var WASTE_SVC = ['skip', 'grab', 'muck'];
  C.isWasteApp = function (d) { return !!(d && (d.svcs || []).some(function (k) { return WASTE_SVC.indexOf(k) >= 0; })); };
  function code() { var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  C.invite = function (name, who, email, phone) {
    var D = C.S(), a = { id: 'a' + (D.apps.length + 1) + code().slice(0, 2), code: code(), name: name, who: who || '', email: email || '', phone: phone || '', st: 'invited', sentAt: Date.now(), sentBy: ME, opened: null, sub: null, data: null };
    D.apps.push(a); C.log(ME, a.id, 'Sent the onboarding link to ' + (who ? who + ' at ' : '') + name, 'invite'); return a;
  };
  C.opened = function (cd) { var a = C.app(cd); if (a && !a.opened) { a.opened = Date.now(); if (a.st === 'invited') a.st = 'started'; } return a; };
  C.submit = function (cd, data) {
    var D = C.S(), a = cd ? C.app(cd) : null;
    if (!a) { a = { id: 'a' + (D.apps.length + 1) + code().slice(0, 2), code: cd || code(), name: data.company.name, who: (data.book.name || '').split(' ')[0], email: data.book.email, phone: data.book.phone, sentAt: null, sentBy: null, opened: Date.now(), data: null }; D.apps.push(a); }
    a.data = data; a.st = 'submitted'; a.sub = Date.now(); a.name = data.company.name || a.name; a.chk = {}; a.reg = null;
    C.log('Supplier: ' + (data.sig && data.sig.name || a.who), a.id, 'Filled in the onboarding link and signed the supplier terms, duty of care declaration and data consent', 'sign');
    return a;
  };
  /* what is stopping an application being approved. Empty means it can be */
  C.appIssues = function (a) {
    var d = a && a.data, out = []; if (!d) return [{ t: 'Not filled in yet' }];
    var waste = C.isWasteApp(d), D = C.S();
    C.TYPES.forEach(function (t) {
      if (t.k === 'permit') { if (waste && D.set.req.permit && !(d.tips || []).some(function (x) { return x.no; })) out.push({ k: 'permit', t: 'No permit or exemption for a tip site' }); return; }
      if (t.waste && !waste) return;
      var x = d.docs[t.k];
      if (!x || !(x.file || x.no)) { if (D.set.req[t.k]) out.push({ k: t.k, t: t.n + ' missing', ask: true }); return; }
      var off = C.offOf(x.exp); if (off != null && off < 0) out.push({ k: t.k, t: t.n + ' ran out on ' + C.dateOf(off), ask: true });
      if (t.ins && !(a.chk && a.chk[t.k])) out.push({ k: t.k, t: t.n + ' not checked by a person yet', check: true });
    });
    (d.tips || []).forEach(function (x) { var off = C.offOf(x.exp); if (off != null && off < 0) out.push({ k: 'permit', t: 'Exemption for ' + x.name + ' ran out', ask: true }); });
    if (waste && d.docs.wcl && d.docs.wcl.no && !a.reg) out.push({ k: 'wcl', t: 'Carrier licence not checked on the register yet', reg: true });
    if (a.reg && !a.reg.ok) out.push({ k: 'wcl', t: 'Carrier licence did not match the register', ask: true });
    if (!(d.cons && d.cons.terms && d.cons.duty && d.cons.data)) out.push({ t: 'Not every consent given' });
    if (!(d.sig && d.sig.name)) out.push({ t: 'Not signed' });
    return out;
  };
  /* the register check. In this demo the answer is a sample: see onboard notes. */
  C.regSample = function (no, name, expIso) {
    no = String(no || '').toUpperCase().replace(/\s+/g, '');
    if (!/^CBD[UL]\d{5,7}$/.test(no)) return { at: Date.now(), ok: false, no: no, found: false, why: 'That is not a carrier number. They start CBDU (upper tier) or CBDL (lower tier).', sample: true };
    var off = C.offOf(expIso);
    return { at: Date.now(), ok: true, no: no, found: true, holder: String(name || '').toUpperCase().replace(/\bLTD\b/, 'LIMITED'), tier: no[3] === 'U' ? 'Upper' : 'Lower', type: 'Carrier, Broker, Dealer', exp: off != null ? off : 600, sample: true };
  };
  C.appReg = function (a) { var w = a.data.docs.wcl || {}; a.reg = C.regSample(w.no, a.data.company.name, w.exp); if (a.reg.ok && a.reg.tier === 'Lower') a.reg.ok = false, a.reg.why = 'Lower tier. A firm carrying other people\'s waste needs upper tier.';
    C.log(ME, a.id, 'Checked carrier licence ' + (a.reg.no || '') + ' on the Environment Agency register: ' + (a.reg.ok ? a.reg.tier.toLowerCase() + ' tier, name matches' : 'did not match'), 'reg'); return a.reg; };
  C.appCheck = function (a, k) { a.chk = a.chk || {}; a.chk[k] = { by: ME, at: Date.now() }; C.log(ME, a.id, 'Checked the ' + C.type(k).n.toLowerCase() + ' certificate by eye', 'check'); };
  C.approve = function (a) {
    var S = CS.S, d = a.data, n = 100 + S.suppliers.length; while (CS.sup('s' + n)) n++;
    var id = 's' + n, town = String(d.company.addr || '').split(',').pop().trim() || (d.company.pc || '');
    var rates = {}; (d.svcs || []).forEach(function (k) { var pr = d.prices && d.prices.rates && d.prices.rates[k]; if (pr) { rates[k] = JSON.parse(JSON.stringify(pr)); return; } var o = S.suppliers.filter(function (s) { return s.rates && s.rates[k]; })[0]; if (o) rates[k] = JSON.parse(JSON.stringify(o.rates[k])); });
    var waste = C.isWasteApp(d), w = d.docs.wcl || {};
    var su = { id: id, name: d.company.name, contact: String(d.book.name || 'Bookings').split(' ')[0], phone: d.book.phone || d.company.phone, wa: !!d.book.wa, office: d.company.phone, base: town, services: (d.svcs || []).slice(), areas: (d.areas || []).slice(), rates: rates, hireDays: 14, weekRate: 25, resp: 30, onTime: 95, jobs: 0, recov: 90, fresh: true };
    if (!d.book.wa) su.pref = 'email';
    if (waste) { su.wtn = 95; su.cbdu = w.no; su.licExp = C.offOf(w.exp); }
    S.suppliers.push(su);
    var docs = [];
    if (waste && w.no) docs.push({ k: 'wcl', no: w.no, tier: w.tier || 'Upper', exp: C.offOf(w.exp), file: w.file, up: C.days(a.sub), reg: a.reg });
    (d.tips || []).forEach(function (x) { if (x.no) docs.push({ k: 'permit', site: x.name, kind: x.kind, no: x.no, exp: C.offOf(x.exp), file: x.file || '', up: C.days(a.sub) }); });
    ['pl', 'el', 'git', 'fors', 'chas'].forEach(function (k) { var x = d.docs[k]; if (!x || !(x.file || x.no)) return; docs.push({ k: k, no: x.no || '', cover: x.cover, level: x.level, exp: C.offOf(x.exp), file: x.file, up: C.days(a.sub), chk: a.chk && a.chk[k] }); });
    C.S().sup[id] = { st: 'approved', joined: 0, by: ME, at: Date.now(), docs: docs, terms: d.terms || '30 days', cons: { terms: d.cons.terms, duty: d.cons.duty, data: d.cons.data, sig: d.sig }, sent: [], via: 'link', app: a.id };
    try { var x = window.DSGV2 && window.DSGV2.x && window.DSGV2.x.hb(su); if (x) { x.opsEmail = d.book.email || x.opsEmail; x.accEmail = (d.acc && d.acc.email) || x.accEmail; x.acc = String((d.acc && d.acc.name) || x.acc).split(' ')[0]; x.terms = d.terms || x.terms; x.pricesAt = a.sub; } } catch (e) {}
    a.st = 'approved'; a.sup = id; a.decided = Date.now();
    C.log(ME, id, 'Approved ' + su.name + '. Can be booked from now', 'approve');
    return su;
  };
  C.reject = function (a, why) { a.st = 'rejected'; a.decided = Date.now(); C.log(ME, a.id, 'Turned down ' + a.name + (why ? ': ' + why : ''), 'block'); };
  C.check = function (sid, k) { var d = C.doc(sid, k); if (!d) return; d.chk = { by: ME, at: Date.now() }; C.log(ME, sid, 'Checked the ' + C.type(k).n.toLowerCase() + ' certificate by eye', 'check'); };
  C.chase = function (sid, k) { var r = C.rec(sid); r.sent = (r.sent || []).concat([{ k: k, at: Date.now(), how: 'chase', by: ME }]); C.log(ME, sid, 'Chased ' + (CS.sup(sid) || {}).contact + ' for the ' + C.type(k).n.toLowerCase(), 'chase'); };
  C.renew = function (sid, k, o, who) {
    var r = C.rec(sid), d = C.doc(sid, k), t = C.type(k);
    if (!d) { d = { k: k }; r.docs.push(d); }
    ['no', 'cover', 'tier', 'level', 'file'].forEach(function (f) { if (o[f] != null && o[f] !== '') d[f] = o[f]; });
    d.prevExp = d.exp; d.exp = o.exp; d.up = 0; d.renewed = true; if (t.ins) d.chk = null;
    if (k === 'wcl') { var su = CS.sup(sid); if (su) su.licExp = o.exp; d.reg = null; }
    C.log(who || ME, sid, 'New ' + t.n.toLowerCase() + ' filed, runs to ' + C.dateOf(o.exp) + (t.ins ? '. Waiting for a person to check it' : ''), 'upload');
  };
  C.supReg = function (sid) { var su = CS.sup(sid), d = C.doc(sid, 'wcl'); if (!d) return null; d.reg = C.regSample(d.no, su.name, C.iso(d.exp)); C.log(ME, sid, 'Checked carrier licence ' + d.no + ' on the Environment Agency register: ' + (d.reg.ok ? 'upper tier, name matches' : 'did not match'), 'reg'); return d.reg; };
  C.block = function (sid, why) { var r = C.rec(sid); r.block = { by: ME, at: Date.now(), why: why || 'Blocked by hand' }; C.log(ME, sid, 'Blocked by hand: ' + r.block.why, 'block'); };
  C.unblock = function (sid) { var r = C.rec(sid); if (!r.block) return; delete r.block; C.log(ME, sid, 'Unblocked', 'approve'); };
  C.setRemind = function (sid, k, days) { var d = C.doc(sid, k); if (!d) return; d.remind = days; C.log(ME, sid, 'Reminder for the ' + C.type(k).n.toLowerCase() + ' set to ' + days + ' days before it runs out', 'info'); };
  C.approveHand = function (sid) { var r = C.rec(sid); r.st = 'approved'; r.by = ME; r.at = Date.now(); C.log(ME, sid, 'Approved. Can be booked from now', 'approve'); };

  /* the handbook's licence and insurance rows, from the compliance record */
  C.hbDocs = function (su) {
    return C.docs(su.id).filter(function (d) { return !C.type(d.k).opt; }).map(function (d) {
      var t = C.type(d.k);
      return { k: d.k === 'wcl' ? 'lic' : d.k, n: t.n.replace(' for each tip site', '') + (d.site ? ', ' + d.site : ''), no: d.no || '', exp: d.exp };
    });
  };
})();
