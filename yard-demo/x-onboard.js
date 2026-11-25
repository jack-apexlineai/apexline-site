/* Demo Skip & Grab demo, second-call layer (24 Nov 2026): supplier onboarding and compliance for the ops manager.
   Send a supplier a link, they fill it in on their phone, it lands in Awaiting approval. A person checks the
   insurance by eye and runs the licence check, then approves. Every document has an end date and a reminder.
   A supplier is held back from bookings until approved, and automatically if a required document runs out.
   Sample data only. Nothing leaves this browser and nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, C = CS && CS.COMP, V2 = window.DSGV2;
    if (!(UI && UI.V && UI.A && CS && CS.S && C && V2 && V2.x && UI.V.suppliers && UI.V.find)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc, money = CS.money;
    function S() { return CS.S; }
    function q(s) { return document.querySelector(s); }
    function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
    function first(n) { return String(n || '').trim().split(/\s+/)[0]; }
    function layer(html) { var l = document.getElementById('layer'); if (l) l.innerHTML = html; }
    function close() { layer(''); ui.cpDraw = null; }
    function modal(label, title, body, foot, wide) {
      ui.cpDraw = null;
      layer('<div class="scrim" data-act="close"></div><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-label="' + h(label) + '"><div class="mhd"><h2>' + title + '</h2><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' + body + '</div>' + (foot ? '<div class="mft">' + foot + '</div>' : '') + '</div>');
    }
    function drawer(title, sub, body, foot) {
      var old = q('#layer .drawer .dbd'), top = old && q('#layer .drawer[data-cp]') ? old.scrollTop : 0;
      layer('<div class="scrim" data-act="close"></div><aside class="drawer cpdr" data-cp="1" role="dialog" aria-label="' + h(title) + '"><div class="dhd"><div style="flex:1;min-width:0"><h2>' + title + '</h2><small>' + sub + '</small></div><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="dbd">' + body + '</div>' + (foot ? '<div class="dft">' + foot + '</div>' : '') + '</aside>');
      var nb = q('#layer .drawer .dbd'); if (nb && top) nb.scrollTop = top;
    }
    function toast(text, icon) {
      var box = document.getElementById('toasts'); if (!box) return;
      var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(icon || 'circle-check') + '<span>' + text + '</span>';
      box.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 4200);
    }
    function openPhone(src, title) {
      if (window.innerWidth < 900) { location.href = src; return; }
      var ex = q('#phmodal'); if (ex) ex.remove();
      var d = document.createElement('div'); d.className = 'phmodal'; d.id = 'phmodal'; d.setAttribute('data-src', src);
      d.innerHTML = '<button class="x" data-act="closePhone" aria-label="Close phone">' + ic('x') + '</button><iframe src="' + src + (src.indexOf('?') >= 0 ? '&' : '?') + 'embed=1" title="' + h(title || 'The supplier\'s phone') + '"></iframe>';
      document.body.appendChild(d);
    }
    function commit() { CS.commit('comp'); }
    function link(a) { return location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + 'join.html?i=' + a.code; }
    function shortLink(a) { return 'apexlineai.com/…/join.html?i=' + a.code; }
    function stTag(st, extra) { return '<span class="tag ' + C.stCls[st] + '">' + ic(st === 'ok' ? 'shield-check' : 'alert') + C.stName[st] + (extra || '') + '</span>'; }
    function sTag(sid) {
      var s = C.status(sid);
      if (s === 'pending') return '<span class="tag amber">' + ic('clock') + 'Awaiting approval</span>';
      if (s === 'blocked') return '<span class="tag bad">' + ic('lock') + 'Blocked</span>';
      return '<span class="tag ok">' + ic('circle-check') + 'Approved</span>';
    }
    function dShort(off) { return off == null ? 'No end date' : C.dateOf(off); }
    function dueWords(off) { if (off == null) return 'No end date'; if (off < 0) return 'Ran out ' + C.dateOf(off); if (off === 0) return 'Runs out today'; return 'Runs out ' + C.dateOf(off) + (off <= 30 ? ', in ' + plural(off, 'day') : ''); }
    function what(d) {
      var t = C.type(d.k);
      if (t.ins) return C.cover(d.cover) + ' cover' + (d.no ? ' · ' + d.no : '');
      if (d.k === 'wcl') return d.no + ' · ' + (d.tier || 'Upper') + ' tier';
      if (d.k === 'permit') return (d.kind || 'Permit') + ' ' + d.no + (d.site ? ' · ' + d.site : '');
      if (d.k === 'fors') return (d.level ? d.level + ' · ' : '') + (d.no || '');
      return d.no || '';
    }

    /* ---------- the menu ---------- */
    (function () {
      var L = UI.VIEWS; if (L.some(function (x) { return x.k === 'compliance'; })) return;
      var at = -1; L.forEach(function (x, i) { if (x.k === 'suppliers') at = i; });
      L.splice(at + 1, 0, { k: 'compliance', g: 'Suppliers', n: 'Compliance', ic: 'shield-check', sub: 'Onboarding, documents, approvals and who checked what' });
    })();

    /* ---------- the numbers ---------- */
    function allDocs() {
      var out = [];
      S().suppliers.forEach(function (su) {
        var r = C.rec(su.id); if (!r) return;
        C.TYPES.forEach(function (t) {
          var ds = r.docs.filter(function (d) { return d.k === t.k; });
          if (!ds.length) { if (C.needed(su, t.k) && r.st !== 'pending') out.push({ su: su, t: t, d: null, st: 'missing' }); return; }
          ds.forEach(function (d) { out.push({ su: su, t: t, d: d, st: C.st(d), unchk: t.ins && !d.chk, opt: !C.needed(su, t.k) }); });
        });
      });
      return out;
    }
    function counts() {
      var D = C.S(), ds = allDocs(), sups = S().suppliers;
      return {
        queue: D.apps.filter(function (a) { return a.st === 'submitted'; }).length,
        waiting: D.apps.filter(function (a) { return a.st === 'invited' || a.st === 'started'; }).length,
        blocked: sups.filter(function (s) { return C.status(s.id) === 'blocked'; }).length,
        pending: sups.filter(function (s) { return C.status(s.id) === 'pending'; }).length,
        due: ds.filter(function (x) { return x.st === 'due'; }).length,
        expired: ds.filter(function (x) { return x.st === 'expired' && !x.opt; }).length,
        unchk: ds.filter(function (x) { return x.unchk; }).length,
        ok: ds.filter(function (x) { return x.st === 'ok' && !x.opt; }).length, req: ds.filter(function (x) { return !x.opt; }).length
      };
    }
    C.counts = counts;
    function cp() { if (!ui.cp) ui.cp = { tab: 'queue', f: 'all', type: 'all', q: '', who: 'all' }; return ui.cp; }

    /* ---------- the Compliance page ---------- */
    V.compliance = function () {
      C.runReminders();
      var n = counts(), f = cp();
      var kpi = function (k, cls, icn, label, val, sub, tab, fil) { return '<button class="card kpi cpk' + (cls ? ' ' + cls : '') + '" data-act="cpGo" data-tab="' + tab + '" data-f="' + (fil || '') + '"><small>' + ic(icn) + label + '</small><b>' + val + '</b><span class="d">' + sub + '</span></button>'; };
      var tabs = [['queue', 'Awaiting approval', n.queue], ['sup', 'Suppliers', S().suppliers.length], ['docs', 'Documents', n.due + n.expired], ['log', 'Audit trail', 0], ['set', 'Settings', 0]];
      var body = f.tab === 'queue' ? queueView() : f.tab === 'sup' ? supView() : f.tab === 'docs' ? docsView() : f.tab === 'log' ? logView() : setView();
      return '<div class="cphd"><div><b>' + ic('shield-check') + 'Every supplier checked before they are booked</b><small>Send a supplier a link, they fill it in on their phone. You check, you approve. If a licence or insurance runs out, they are held back from bookings until the new one is in.</small></div>' +
        '<div class="cpbtns"><button class="btn pri" data-act="cpInvite" id="cpInviteBtn">' + ic('send') + 'Send an onboarding link</button><button class="btn" data-act="cpChaseAll">' + ic('bell') + 'Chase everything due</button></div></div>' +
        '<div class="grid g4 kpis cpkpis">' +
        kpi('q', n.queue ? 'hot' : '', 'clock', 'Awaiting approval', n.queue, plural(n.waiting, 'link') + ' sent, not filled in yet', 'queue') +
        kpi('b', n.blocked ? 'bad' : '', 'lock', 'Blocked', n.blocked, 'cannot be booked right now', 'sup', 'blocked') +
        kpi('d', n.due ? 'amb' : '', 'calendar', 'Due in 30 days', n.due, 'reminders go by themselves', 'docs', 'due') +
        kpi('o', '', 'shield-check', 'Required documents in date', (n.req ? Math.round(n.ok / n.req * 100) : 100) + '%', n.ok + ' of ' + n.req + (n.unchk ? ' · ' + n.unchk + ' to check' : ''), 'docs', 'all') + '</div>' +
        '<div class="seg cpseg" role="tablist">' + tabs.map(function (t) { return '<button role="tab" data-act="cpTab" data-v="' + t[0] + '" class="' + (f.tab === t[0] ? 'on' : '') + '" aria-selected="' + (f.tab === t[0]) + '">' + t[1] + (t[2] ? ' <span class="cnt' + (t[0] === 'queue' ? ' red' : ' grey') + '">' + t[2] + '</span>' : '') + '</button>'; }).join('') + '</div>' +
        '<div id="cpBody">' + body + '</div>';
    };

    /* ---------- awaiting approval ---------- */
    function issueBtn(a, x) {
      if (x.check) return '<button class="btn sm" data-act="cpAppOpen" data-id="' + a.id + '" data-to="d-' + x.k + '">' + ic('eye') + 'Look at it</button>';
      if (x.reg) return '<button class="btn sm" data-act="cpAppReg" data-id="' + a.id + '">' + ic('shield-check') + 'Check the register</button>';
      if (x.ask) return '<button class="btn sm" data-act="cpAppAsk" data-id="' + a.id + '" data-k="' + (x.k || '') + '">' + ic('mail') + 'Ask for it</button>';
      return '';
    }
    function appCard(a) {
      var d = a.data, is = C.appIssues(a), ready = !is.length;
      return '<div class="card cpapp' + (ready ? ' ready' : '') + '" data-app="' + a.id + '"><div class="cpah"><div><b>' + h(a.name) + '</b><small>Filled in by ' + h(d.sig.name) + ', ' + h(d.sig.pos) + ' · ' + h(CS.ago(a.sub)) + (a.sentBy ? ' · link sent by ' + h(first(a.sentBy)) : '') + '</small></div>' +
        (ready ? '<span class="tag ok">' + ic('circle-check') + 'Ready to approve</span>' : '<span class="tag amber">' + plural(is.length, 'thing') + ' to sort</span>') + '</div>' +
        '<div class="cpmeta">' + d.svcs.map(function (k) { return '<span class="tag">' + h(S().services[k].short) + '</span>'; }).join('') + '<span class="tag">' + ic('map-pin') + plural(d.areas.length, 'postcode area') + '</span><span class="tag">' + ic('calendar') + 'Gives you ' + h(d.terms || 'no terms given') + '</span><span class="tag">' + ic('receipt') + (d.prices && d.prices.file ? 'Price list read' : 'Price list to follow') + '</span></div>' +
        (ready ? '<div class="note ok">' + ic('circle-check') + '<span>Licence checked on the register, insurance looked at by a person, terms and duty of care signed. Nothing else needed.</span></div>'
          : '<div class="cpiss">' + is.map(function (x) { return '<div class="rowline"><span class="cic bad">' + ic('alert') + '</span><div class="bd"><b>' + h(x.t) + '</b></div>' + issueBtn(a, x) + '</div>'; }).join('') + '</div>') +
        '<div class="cardfoot cpfoot"><button class="btn sm" data-act="cpAppOpen" data-id="' + a.id + '">' + ic('eye') + 'Open everything</button><button class="btn sm" data-act="cpAppNo" data-id="' + a.id + '">' + ic('x') + 'Turn down</button><span class="sp"></span>' +
        '<button class="btn sm ok" data-act="cpApprove" data-id="' + a.id + '"' + (ready ? '' : ' disabled title="Sort the things above first"') + '>' + ic('check') + 'Approve</button></div></div>';
    }
    function queueView() {
      var D = C.S(), subs = D.apps.filter(function (a) { return a.st === 'submitted'; }).sort(function (a, b) { return b.sub - a.sub; });
      var wait = D.apps.filter(function (a) { return a.st === 'invited' || a.st === 'started'; });
      var done = D.apps.filter(function (a) { return (a.st === 'approved' || a.st === 'rejected') && a.decided && Date.now() - a.decided < 864e5 * 7; });
      return (subs.length ? '<div class="cpapps">' + subs.map(appCard).join('') + '</div>' : '<div class="card"><div class="empty">' + ic('circle-check') + 'Nobody waiting. Send a supplier the link and they land here when they have filled it in.</div></div>') +
        '<div class="card" style="margin-top:16px"><div class="hd"><h2>' + ic('send') + 'Links sent, not filled in yet <span class="muted" style="font-weight:600">' + wait.length + '</span></h2></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' +
        (wait.map(function (a) { return '<div class="rowline"><div class="bd"><b>' + h(a.name) + (a.who ? ', ' + h(a.who) : '') + '</b><small>Sent ' + h(CS.ago(a.sentAt)) + ' to ' + h(a.email || a.phone) + ' · ' + (a.opened ? 'opened ' + h(CS.ago(a.opened)) + ', part filled' : 'not opened yet') + '</small></div><button class="btn sm" data-act="cpAsThem" data-id="' + a.id + '">' + ic('mobile') + '<span class="hide-sm">Open it as them</span></button><button class="btn sm" data-act="cpResend" data-id="' + a.id + '">' + ic('bell') + '<span class="hide-sm">Send again</span></button></div>'; }).join('') || '<div class="empty" style="padding:16px">None.</div>') + '</div></div>' +
        (done.length ? '<div class="card" style="margin-top:16px"><div class="hd"><h2>' + ic('checks') + 'Decided this week</h2></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' + done.map(function (a) { return '<div class="rowline"><div class="bd"><b>' + h(a.name) + '</b><small>' + (a.st === 'approved' ? 'Approved' : 'Turned down') + ' by ' + h(C.me()) + ', ' + h(C.when(a.decided)) + '</small></div>' + (a.sup ? '<button class="btn sm" data-act="cpSup" data-id="' + a.sup + '">' + ic('eye') + 'Open</button>' : '') + '</div>'; }).join('') + '</div></div>' : '');
    }

    /* the full application, as the ops manager checks it */
    function certMock(name, k, x) {
      var t = C.type(k);
      return '<div class="cpcert"><div class="cpch"><b>' + (t.ins ? 'Certificate of insurance' : t.n) + '</b><small>' + h(x.file || '') + '</small></div><dl class="kv"><dt>Insured</dt><dd>' + h(name) + '</dd>' +
        (t.ins ? '<dt>Cover</dt><dd>' + C.cover(x.cover) + ' ' + (k === 'git' ? 'any one vehicle' : 'any one occurrence') + '</dd><dt>Period</dt><dd>' + C.dateOf(C.offOf(x.exp) - 365) + ' to ' + C.dateOf(C.offOf(x.exp)) + '</dd>' : '<dt>Number</dt><dd>' + h(x.no || '') + '</dd>') +
        '</dl><small class="muted">Sample of what they uploaded. Live, this is their actual file.</small></div>';
    }
    function regBox(r) {
      if (!r) return '';
      if (!r.ok) return '<div class="note bad">' + ic('alert') + '<span><b>' + (r.found === false ? 'Not found on the register.' : 'Does not match.') + '</b> ' + h(r.why || '') + '</span></div>';
      return '<div class="cpreg"><b>' + ic('shield-check') + 'On the Environment Agency register</b><dl class="kv"><dt>Number</dt><dd>' + h(r.no) + '</dd><dt>Holder</dt><dd>' + h(r.holder) + ' <span class="tag ok">' + ic('check') + 'Name matches</span></dd><dt>Tier</dt><dd>' + h(r.tier) + '</dd><dt>Type</dt><dd>' + h(r.type) + '</dd><dt>Runs to</dt><dd>' + C.dateOf(r.exp) + '</dd><dt>Checked</dt><dd>' + h(C.when(r.at)) + '</dd></dl>' +
        '<small class="muted">Sample result in this demo. Live, the number is looked up on the Environment Agency\'s public register for England and the answer is saved here.</small></div>';
    }
    function sigBox(sig) {
      if (!sig) return '<p class="muted">Not signed.</p>';
      return '<div class="cpsig">' + (sig.drawn ? '<img src="' + sig.drawn + '" alt="Signature">' : '<span class="cpsigt">' + h(sig.typed || sig.name) + '</span>') + '<small><b>' + h(sig.name) + '</b>, ' + h(sig.pos || '') + ' · signed ' + h(C.when(sig.at)) + (sig.drawn ? ', drawn' : sig.typed === true || sig.typed ? ', typed' : '') + '</small></div>';
    }
    function consRows(cons, sig) {
      var L = [['terms', 'Demo Skip & Grab supplier terms'], ['duty', 'Duty of care declaration'], ['data', 'Data consent']];
      return L.map(function (x) { var t = cons && cons[x[0]]; return '<div class="rowline"><span class="cic ' + (t ? 'ok' : 'bad') + '">' + ic(t ? 'check' : 'x') + '</span><div class="bd"><b>' + x[1] + '</b><small>' + (t ? 'Accepted ' + h(C.when(t)) : 'Not accepted') + '</small></div></div>'; }).join('') + sigBox(sig);
    }
    function appDrawer(id, to) {
      var a = C.app(id); if (!a || !a.data) return; var d = a.data, is = C.appIssues(a), waste = C.isWasteApp(d);
      var doc = function (k) {
        var t = C.type(k), x = d.docs[k]; if (t.waste && !waste) return '';
        if (!x || !(x.file || x.no)) return '<div class="cpdoc" id="d-' + k + '"><div class="rowline"><div class="bd"><b>' + t.n + '</b><small>' + (t.opt ? 'Not sent. Optional.' : 'Not sent') + '</small></div>' + (t.opt ? '' : stTag('missing')) + (t.opt ? '' : '<button class="btn sm" data-act="cpAppAsk" data-id="' + a.id + '" data-k="' + k + '">' + ic('mail') + 'Ask for it</button>') + '</div></div>';
        var off = C.offOf(x.exp), st = C.st({ exp: off }), chk = a.chk && a.chk[k];
        return '<div class="cpdoc" id="d-' + k + '"><div class="rowline"><div class="bd"><b>' + t.n + '</b><small>' + (t.ins ? C.cover(x.cover) + ' cover · ' : k === 'wcl' ? h(x.no) + ' · ' + h(x.tier) + ' tier · ' : k === 'fors' ? h(x.level || '') + ' · ' : '') + dueWords(off) + '</small></div>' + stTag(st) + '</div>' +
          '<details' + (to === 'd-' + k ? ' open' : '') + '><summary>' + ic('file-text') + 'Open the certificate</summary>' + certMock(d.company.name, k, x) + '</details>' +
          (t.ins ? (chk ? '<div class="cpchk ok">' + ic('circle-check') + '<span>Checked by <b>' + h(chk.by) + '</b>, ' + h(C.when(chk.at)) + '</span></div>'
            : '<div class="cpchk"><span>' + ic('eye') + '<b>A person checks this, not the software.</b> Open the certificate. Check the company name, the cover and the dates.</span><button class="btn sm pri" data-act="cpAppChk" data-id="' + a.id + '" data-k="' + k + '">' + ic('check') + 'I have checked it</button></div>') : '') +
          (k === 'wcl' ? (a.reg ? regBox(a.reg) : '<div class="cpchk"><span>' + ic('shield-check') + 'Look the number up on the Environment Agency register.</span><button class="btn sm pri" data-act="cpAppReg" data-id="' + a.id + '">' + ic('shield-check') + 'Check the register</button></div>') : '') + '</div>';
      };
      var rates = []; Object.keys((d.prices && d.prices.rates) || {}).forEach(function (k) { var r = d.prices.rates[k]; if (typeof r === 'number') rates.push([S().services[k].name + ', per load', r]); else Object.keys(r).forEach(function (z) { rates.push([z + ' yard skip', r[z]]); }); });
      drawer(h(a.name), (is.length ? plural(is.length, 'thing') + ' to sort before you can approve' : 'Ready to approve') + ' · sent ' + h(C.when(a.sub)),
        (is.length ? '<div class="note bad">' + ic('alert') + '<span>' + is.map(function (x) { return h(x.t); }).join('. ') + '.</span></div>' : '<div class="note ok">' + ic('circle-check') + '<span>Everything is in and checked. Approve and they can be booked straight away.</span></div>') +
        '<div><div class="sec"><h3>Company</h3></div><dl class="kv"><dt>Name</dt><dd>' + h(d.company.name) + '</dd><dt>Companies House</dt><dd>' + (d.company.chno ? h(d.company.chno) : '<span class="muted">Not given (sole trader or partnership)</span>') + '</dd><dt>Office</dt><dd>' + h(d.company.addr) + ', ' + h(d.company.pc) + '</dd><dt>Phone</dt><dd>' + h(d.company.phone) + '</dd><dt>Email</dt><dd>' + h(d.company.email) + '</dd></dl></div>' +
        '<div><div class="sec"><h3>Contacts</h3></div><dl class="kv"><dt>Bookings</dt><dd>' + h(d.book.name) + ' · ' + h(d.book.phone) + (d.book.wa ? ' (WhatsApp)' : '') + '<br>' + h(d.book.email) + '</dd><dt>Accounts</dt><dd>' + h(d.acc.name) + ' · ' + h(d.acc.email) + '</dd>' + (d.ooh ? '<dt>Out of hours</dt><dd>' + h(d.ooh) + '</dd>' : '') + '</dl></div>' +
        '<div><div class="sec"><h3>What they do and where</h3></div><div class="chips">' + d.svcs.map(function (k) { return '<span class="tag brand">' + h(S().services[k].name) + '</span>'; }).join('') + (d.sizes && d.sizes.length ? '<span class="tag">' + d.sizes.join(', ') + ' yard</span>' : '') + '</div><div class="chips" style="margin-top:8px">' + d.areas.map(function (x) { return '<span class="tag">' + h(x) + '</span>'; }).join('') + '</div></div>' +
        '<div><div class="sec"><h3>Depots and tip sites</h3></div>' + d.depots.map(function (x) { return '<div class="rowline"><span class="cic">' + ic('truck') + '</span><div class="bd"><b>' + h(x.name) + '</b><small>Depot · ' + h(x.pc) + '</small></div></div>'; }).join('') +
        (d.tips || []).map(function (x) { var off = C.offOf(x.exp); return '<div class="rowline"><span class="cic">' + ic('map-pin') + '</span><div class="bd"><b>' + h(x.name) + '</b><small>Tip site · ' + h(x.kind) + ' ' + h(x.no) + (off != null ? ' · ' + dueWords(off) : '') + '</small></div>' + stTag(C.st({ exp: off })) + '</div>'; }).join('') + '</div>' +
        '<div><div class="sec"><h3>Prices and credit terms</h3></div>' + (rates.length ? '<div class="ratesg">' + rates.map(function (r) { return '<span><small>' + h(r[0]) + '</small><b>' + money(r[1]) + '</b></span>'; }).join('') + '</div><p class="muted" style="font-size:12px;margin:6px 0 0">Read from ' + h(d.prices.file) + '. They checked the read on their phone. Sample read in this demo.</p>' : '<p class="muted" style="font-size:13px">Price list to follow.</p>') +
        '<dl class="kv" style="margin-top:10px"><dt>Credit terms</dt><dd><b>' + h(d.terms || 'Not given') + '</b>, used by the bill check once approved</dd></dl></div>' +
        '<div><div class="sec"><h3>Documents</h3></div>' + ['wcl', 'pl', 'el', 'git', 'fors', 'chas'].map(doc).join('') + '</div>' +
        '<div><div class="sec"><h3>What they agreed and signed</h3></div>' + consRows(d.cons, d.sig) + '</div>',
        '<button class="btn" data-act="cpAppNo" data-id="' + a.id + '">' + ic('x') + 'Turn down</button><button class="btn" data-act="cpAppAsk" data-id="' + a.id + '">' + ic('mail') + 'Ask for something</button><span class="sp"></span><button class="btn ok" data-act="cpApprove" data-id="' + a.id + '"' + (is.length ? ' disabled' : '') + '>' + ic('check') + 'Approve</button>');
      ui.cpDraw = function () { appDrawer(id); };
      if (to) setTimeout(function () { var el = document.getElementById(to); if (el) el.scrollIntoView({ block: 'center' }); }, 60);
    }

    /* ---------- suppliers ---------- */
    function supRows() {
      var f = cp(), qq = (f.q || '').toLowerCase();
      return S().suppliers.filter(function (su) {
        if (qq && su.name.toLowerCase().indexOf(qq) < 0) return false;
        var st = C.status(su.id), ds = allDocs().filter(function (x) { return x.su.id === su.id; });
        if (f.f === 'blocked') return st === 'blocked';
        if (f.f === 'pending') return st === 'pending';
        if (f.f === 'due') return ds.some(function (x) { return x.st === 'due'; });
        if (f.f === 'unchk') return ds.some(function (x) { return x.unchk; });
        return true;
      });
    }
    function supView() {
      var f = cp(), list = supRows(), n = counts();
      var chips = [['all', 'All'], ['blocked', 'Blocked', n.blocked], ['due', 'Something due'], ['unchk', 'To check', n.unchk], ['pending', 'Awaiting documents', n.pending]];
      return '<div class="card pad cpfil"><div class="chips">' + chips.map(function (c) { return '<button class="pk sm' + (f.f === c[0] ? ' on' : '') + '" data-act="cpF" data-v="' + c[0] + '">' + c[1] + (c[2] ? ' · ' + c[2] : '') + '</button>'; }).join('') + '</div><input id="cpQ" class="cpq" placeholder="Search suppliers" value="' + h(f.q) + '" autocomplete="off" aria-label="Search suppliers"></div>' +
        '<div class="card"><div class="tw"><table class="t cpt"><thead><tr><th>Supplier</th><th>Status</th><th class="hide-sm">Documents</th><th class="hide-md">Next to run out</th><th class="hide-md">Their terms</th><th></th></tr></thead><tbody>' +
        (list.map(function (su) {
          var ds = allDocs().filter(function (x) { return x.su.id === su.id && !x.opt; }), b = C.bookable(su.id);
          var nx = ds.filter(function (x) { return x.d && x.d.exp != null; }).sort(function (a, c) { return a.d.exp - c.d.exp; })[0];
          var bad = ds.filter(function (x) { return x.st === 'expired' || x.st === 'missing'; }).length, due = ds.filter(function (x) { return x.st === 'due'; }).length, un = ds.filter(function (x) { return x.unchk; }).length;
          return '<tr class="click" data-act="cpSup" data-id="' + su.id + '"><td><b>' + h(su.name) + '</b><small>' + h(su.base) + (b.ok ? '' : ' · <span class="redtxt">' + h(b.why[0]) + '</span>') + '</small></td><td>' + sTag(su.id) + '</td>' +
            '<td class="hide-sm">' + (bad ? '<span class="tag bad">' + bad + ' expired or missing</span> ' : '') + (due ? '<span class="tag amber">' + due + ' due</span> ' : '') + (un ? '<span class="tag">' + un + ' to check</span> ' : '') + (!bad && !due && !un ? '<span class="tag ok">' + ic('shield-check') + 'All ' + ds.length + ' in date</span>' : '') + '</td>' +
            '<td class="hide-md">' + (nx ? h(C.type(nx.d.k).s) + '<small>' + dShort(nx.d.exp) + '</small>' : '<span class="muted">Nothing on file</span>') + '</td><td class="hide-md">' + h(C.terms(su.id)) + '</td><td class="r"><button class="btn sm">' + ic('eye') + '<span class="hide-sm">Open</span></button></td></tr>';
        }).join('') || '<tr><td colspan="6"><div class="empty">Nothing matches.</div></td></tr>') + '</tbody></table></div></div>';
    }
    function supDrawer(sid) {
      var su = CS.sup(sid), r = C.rec(sid); if (!su || !r) return; var b = C.bookable(sid);
      var ds = C.TYPES.map(function (t) { return { t: t, l: r.docs.filter(function (d) { return d.k === t.k; }) }; });
      var rows = ds.map(function (g) {
        var t = g.t; if (!C.relevant(su, t.k)) return '';
        if (!g.l.length) return '<div class="cpdoc"><div class="rowline"><div class="bd"><b>' + t.n + '</b><small>' + (C.needed(su, t.k) ? 'Not on file' : 'Optional, not on file') + '</small></div>' + (C.needed(su, t.k) ? stTag('missing') + '<button class="btn sm" data-act="cpChase" data-id="' + sid + '" data-k="' + t.k + '">' + ic('mail') + 'Ask for it</button>' : '') + '<button class="btn sm" data-act="cpRenew" data-id="' + sid + '" data-k="' + t.k + '">' + ic('download') + 'Add it</button></div></div>';
        return g.l.map(function (d) {
          var st = C.st(d), on = C.remindOn(sid, d), last = C.lastSent(sid, d.k), rem = d.remind != null ? d.remind : C.S().set.remind;
          var remTxt = d.exp == null ? 'No end date, no reminder needed' : last && C.days(last.at) >= on ? (last.how === 'chase' ? 'Chased by ' + first(last.by || C.me()) + ' ' : 'Reminder emailed ') + CS.ago(last.at) : on > 0 ? 'Reminder goes ' + C.dateOf(on) + ', ' + rem + ' days before' : 'Reminder due';
          return '<div class="cpdoc' + (st === 'expired' ? ' bad' : st === 'due' ? ' amb' : '') + '"><div class="rowline"><div class="bd"><b>' + t.n + (C.needed(su, t.k) ? '' : ' <span class="muted" style="font-weight:600">· optional</span>') + '</b><small>' + h(what(d)) + '</small><small>' + dueWords(d.exp) + '</small></div>' + stTag(st) + '</div>' +
            '<div class="cprem"><span>' + ic('bell') + h(remTxt) + '</span>' + (d.exp != null ? '<label class="cpsel">Remind<select data-cprem="' + sid + '|' + d.k + '" aria-label="When to remind">' + [14, 30, 60, 90].map(function (x) { return '<option value="' + x + '"' + (x === rem ? ' selected' : '') + '>' + x + ' days before</option>'; }).join('') + '</select></label>' : '') + '</div>' +
            (t.ins ? (d.chk ? '<div class="cpchk ok">' + ic('circle-check') + '<span>Checked by <b>' + h(d.chk.by) + '</b>, ' + h(C.when(d.chk.at)) + '</span></div>' : '<div class="cpchk"><span>' + ic('eye') + '<b>New certificate, not looked at yet.</b> A person checks insurance, not the software.</span><button class="btn sm pri" data-act="cpChk" data-id="' + sid + '" data-k="' + d.k + '">' + ic('check') + 'I have checked it</button></div>') : '') +
            (d.k === 'wcl' ? (d.reg ? regBox(d.reg) : '') : '') +
            '<div class="cpdacts">' + (st !== 'ok' ? '<button class="btn sm pri" data-act="cpChase" data-id="' + sid + '" data-k="' + d.k + '">' + ic('mail') + 'Chase for the new one</button>' : '') + '<button class="btn sm" data-act="cpRenew" data-id="' + sid + '" data-k="' + d.k + '">' + ic('download') + 'Upload the new one</button>' + (d.k === 'wcl' ? '<button class="btn sm" data-act="cpSupReg" data-id="' + sid + '">' + ic('shield-check') + 'Check the register' + (d.reg ? ' again' : '') + '</button>' : '') + '</div></div>';
        }).join('');
      }).join('');
      var log = C.S().log.filter(function (x) { return x.sup === sid || (r.app && x.sup === r.app); }).slice(-8).reverse();
      drawer(h(su.name), 'Compliance record · ' + h(su.base),
        (b.ok ? '<div class="note ok">' + ic('circle-check') + '<span><b>Can be booked.</b> Approved by ' + h(r.by || C.me()) + ' on ' + h(C.when(r.at)) + '.</span></div>'
          : '<div class="note bad">' + ic('lock') + '<span><b>' + (r.st === 'pending' ? 'Cannot be booked yet.' : 'Blocked. Cannot be booked.') + '</b> ' + b.why.map(h).join('. ') + '.' + (r.block ? '' : ' Upload the new document and it is bookable again.') + '</span></div>') +
        '<div><div class="sec"><h3>Documents</h3></div>' + rows + '</div>' +
        '<div><div class="sec"><h3>Credit terms they give you</h3></div><div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><select id="cpTerms" data-id="' + sid + '" aria-label="Credit terms">' + C.TERMS.concat(C.TERMS.indexOf(C.terms(sid)) < 0 ? [C.terms(sid)] : []).map(function (t) { return '<option' + (t === C.terms(sid) ? ' selected' : '') + '>' + h(t) + '</option>'; }).join('') + '</select><small class="muted">Shown on their handbook page and used by the bill check to say when to pay.</small></div></div>' +
        '<div><div class="sec"><h3>What they agreed and signed</h3></div>' + (r.cons ? consRows(r.cons, r.cons.sig) : '<p class="muted" style="font-size:13px">Added by hand, nothing signed yet. Send them the link to sign.</p>') + '</div>' +
        '<div><div class="sec"><h3>Audit trail</h3><button class="btn sm" data-act="cpLogFor" data-id="' + sid + '">' + ic('list') + 'See all</button></div>' + log.map(logRow).join('') + '</div>',
        (r.block ? '<button class="btn" data-act="cpUnblock" data-id="' + sid + '">' + ic('refresh') + 'Unblock</button>' : '<button class="btn" data-act="cpBlock" data-id="' + sid + '">' + ic('lock') + 'Block by hand</button>') +
        '<button class="btn" data-act="openSup" data-id="' + sid + '">' + ic('warehouse') + 'Handbook page</button><span class="sp"></span>' + (r.st === 'pending' ? '<button class="btn ok" data-act="cpApproveHand" data-id="' + sid + '"' + (b.why.length > 1 ? ' disabled title="Their documents are not all in yet"' : '') + '>' + ic('check') + 'Approve</button>' : '<button class="btn pri" data-act="close">Done</button>'));
      ui.cpDraw = function () { supDrawer(sid); };
    }

    /* ---------- documents ---------- */
    function docRows() {
      var f = cp(), qq = (f.q || '').toLowerCase();
      return allDocs().filter(function (x) {
        if (qq && x.su.name.toLowerCase().indexOf(qq) < 0) return false;
        if (f.type !== 'all' && x.t.k !== f.type) return false;
        if (f.f === 'attn') return x.st !== 'ok' || x.unchk;
        if (f.f === 'expired') return x.st === 'expired';
        if (f.f === 'due') return x.st === 'due';
        if (f.f === 'missing') return x.st === 'missing';
        if (f.f === 'unchk') return x.unchk;
        if (f.f === 'ok') return x.st === 'ok';
        return true;
      }).sort(function (a, b) { var o = { expired: 0, missing: 1, due: 2, ok: 3 }; return (o[a.st] - o[b.st]) || ((a.d && a.d.exp != null ? a.d.exp : 9999) - (b.d && b.d.exp != null ? b.d.exp : 9999)); });
    }
    function docsView() {
      var f = cp(), all = allDocs(), rows = docRows();
      var cnt = function (fn) { return all.filter(fn).length; };
      var chips = [['attn', 'Needs attention', cnt(function (x) { return x.st !== 'ok' || x.unchk; })], ['all', 'All', all.length], ['expired', 'Expired', cnt(function (x) { return x.st === 'expired'; })], ['due', 'Due in 30 days', cnt(function (x) { return x.st === 'due'; })], ['unchk', 'Not checked yet', cnt(function (x) { return x.unchk; })], ['missing', 'Missing', cnt(function (x) { return x.st === 'missing'; })], ['ok', 'In date', cnt(function (x) { return x.st === 'ok'; })]];
      return '<div class="card pad cpfil"><div class="chips">' + chips.map(function (c) { return '<button class="pk sm' + (f.f === c[0] ? ' on' : '') + '" data-act="cpF" data-v="' + c[0] + '">' + c[1] + ' · ' + c[2] + '</button>'; }).join('') + '</div>' +
        '<div class="row cpfr"><select id="cpType" aria-label="Document type"><option value="all">Every document</option>' + C.TYPES.map(function (t) { return '<option value="' + t.k + '"' + (f.type === t.k ? ' selected' : '') + '>' + h(t.s) + '</option>'; }).join('') + '</select><input id="cpQ" class="cpq" placeholder="Search suppliers" value="' + h(f.q) + '" autocomplete="off" aria-label="Search suppliers"></div></div>' +
        '<div class="card"><div class="tw"><table class="t cpt"><thead><tr><th>Supplier</th><th>Document</th><th class="hide-md">Details</th><th class="hide-sm">Runs out</th><th>Status</th><th class="hide-md">Reminder</th><th></th></tr></thead><tbody>' +
        (rows.slice(0, 80).map(function (x) {
          var d = x.d, last = d ? C.lastSent(x.su.id, d.k) : C.lastSent(x.su.id, x.t.k), on = d ? C.remindOn(x.su.id, d) : null;
          var rem = !d ? (last ? 'Asked ' + CS.ago(last.at) : 'Not asked yet') : d.exp == null ? 'None needed' : last && C.days(last.at) >= on ? (last.how === 'chase' ? 'Chased ' : 'Emailed ') + CS.ago(last.at) : on > 0 ? 'Goes ' + C.dateOf(on) : 'Due';
          var chased = last && last.how === 'chase' && Date.now() - last.at < 36e5;
          return '<tr data-row="' + x.su.id + '|' + x.t.k + '"><td><b class="click" data-act="cpSup" data-id="' + x.su.id + '">' + h(x.su.name) + '</b><small>' + sTag(x.su.id) + '</small></td><td>' + h(x.t.s) + (x.opt ? '<small>Optional</small>' : '') + '</td><td class="hide-md"><small>' + (d ? h(what(d)) : 'Not on file') + '</small></td>' +
            '<td class="hide-sm">' + (d ? dShort(d.exp) : '') + '</td><td>' + stTag(x.st) + (x.unchk ? ' <span class="tag">' + ic('eye') + 'To check</span>' : '') + '</td><td class="hide-md"><small>' + h(rem) + '</small></td>' +
            '<td class="r">' + (x.st !== 'ok' ? (chased ? '<span class="tag ok">' + ic('check') + 'Chased</span>' : '<button class="btn sm pri" data-act="cpChase" data-id="' + x.su.id + '" data-k="' + x.t.k + '" data-quick="1">' + ic('mail') + 'Chase</button>') : x.unchk ? '<button class="btn sm" data-act="cpSup" data-id="' + x.su.id + '">' + ic('eye') + 'Check</button>' : '') + '</td></tr>';
        }).join('') || '<tr><td colspan="7"><div class="empty">' + ic('circle-check') + 'Nothing here.</div></td></tr>') + '</tbody></table></div></div>' +
        '<p class="muted" style="font-size:12.5px;margin:12px 0 0">In date means more than 30 days left. Reminders email the supplier by themselves on the day, ' + C.S().set.remind + ' days before by default, and you can change it per document. Chase sends one more straight away. Optional documents never block a booking.</p>';
    }

    /* ---------- audit trail ---------- */
    function whoName(id) { var su = CS.sup(id); if (su) return su.name; var a = C.app(id); return a ? a.name : ''; }
    function logRow(x) {
      var icn = { approve: 'circle-check', block: 'lock', remind: 'bell', chase: 'mail', check: 'eye', reg: 'shield-check', sign: 'pencil', upload: 'paperclip', invite: 'send', terms: 'calendar' }[x.kind] || 'list';
      return '<div class="rowline cplog k-' + x.kind + '"><span class="cic">' + ic(icn) + '</span><div class="bd"><b>' + h(x.t) + '</b><small>' + h(C.when(x.at)) + ' · ' + h(x.who) + (whoName(x.sup) ? ' · ' + h(whoName(x.sup)) : '') + '</small></div></div>';
    }
    function logView() {
      var f = cp(), D = C.S(), L = D.log.slice().reverse().filter(function (x) { return f.who === 'all' || x.sup === f.who || (C.rec(f.who) && C.rec(f.who).app === x.sup); });
      var ids = {}; D.log.forEach(function (x) { if (whoName(x.sup)) ids[x.sup] = whoName(x.sup); });
      return '<div class="card pad cpfil"><div class="row cpfr" style="margin:0"><select id="cpWho" aria-label="Which supplier"><option value="all">Every supplier</option>' + Object.keys(ids).sort(function (a, b) { return ids[a] < ids[b] ? -1 : 1; }).map(function (k) { return '<option value="' + k + '"' + (f.who === k ? ' selected' : '') + '>' + h(ids[k]) + '</option>'; }).join('') + '</select>' +
        '<button class="btn" data-act="cpCsv">' + ic('download') + 'Download for an audit</button></div><small class="muted" style="display:block;margin-top:8px">Who sent the link, who signed, who checked the licence and the insurance, who approved, every reminder and chase. Nothing on this list can be edited or deleted.</small></div>' +
        '<div class="card"><div class="bd" style="padding-top:2px;padding-bottom:2px">' + (L.slice(0, 120).map(logRow).join('') || '<div class="empty">Nothing yet.</div>') + '</div></div>';
    }

    /* ---------- settings ---------- */
    function setView() {
      var st = C.S().set;
      return '<div class="grid g2" style="align-items:start"><div class="card"><div class="hd"><h2>' + ic('list') + 'Documents every supplier must have</h2></div><div class="bd">' +
        C.TYPES.map(function (t) { return '<label class="cptog"><input type="checkbox" data-cpreq="' + t.k + '"' + (st.req[t.k] ? ' checked' : '') + '><span><b>' + h(t.n) + '</b><small>' + (t.waste ? 'Only for suppliers who carry waste. ' : '') + (st.req[t.k] ? 'Required: missing or expired means they cannot be booked.' : 'Optional: kept on file, never blocks a booking.') + '</small></span></label>'; }).join('') + '</div></div>' +
        '<div class="card"><div class="hd"><h2>' + ic('bell') + 'Reminders and checks</h2></div><div class="bd"><div class="field"><label for="cpRemDef">Email the supplier this long before a document runs out</label><select id="cpRemDef">' + [14, 30, 45, 60, 90].map(function (x) { return '<option value="' + x + '"' + (x === st.remind ? ' selected' : '') + '>' + x + ' days' + (x === 30 ? ' (one month)' : '') + '</option>'; }).join('') + '</select><small class="muted">Each document can be changed on its own.</small></div>' +
        '<div class="field"><label for="cpMinPL">Lowest public liability cover you accept</label><select id="cpMinPL">' + [1e6, 2e6, 5e6, 10e6].map(function (x) { return '<option value="' + x + '"' + (x === st.minPL ? ' selected' : '') + '>' + C.cover(x) + '</option>'; }).join('') + '</select><small class="muted">Shown to whoever checks the certificate.</small></div>' +
        '<p class="muted" style="font-size:12.5px;margin:0">Who can approve a supplier: you and your ops manager. Everyone else can see the list but not approve.</p></div></div></div>';
    }

    /* ---------- actions ---------- */
    function redraw() { if (ui.view === 'compliance') UI.render(); if (ui.cpDraw && q('#layer .drawer[data-cp]')) ui.cpDraw(); }
    A.cpGo = function (el) { var f = cp(); f.tab = el.dataset.tab; f.f = el.dataset.f || 'all'; f.type = 'all'; f.q = ''; UI.render(); };
    A.cpTab = function (el) { var f = cp(); if (f.tab !== el.dataset.v) { f.tab = el.dataset.v; f.f = f.tab === 'docs' ? 'attn' : 'all'; f.type = 'all'; f.q = ''; } UI.render(); };
    A.cpF = function (el) { cp().f = el.dataset.v; UI.render(); };
    A.cpSup = function (el) { supDrawer(el.dataset.id); };
    A.cpLogFor = function (el) { var f = cp(); f.tab = 'log'; f.who = el.dataset.id; close(); if (ui.view !== 'compliance') A.go({ dataset: { v: 'compliance' } }); else UI.render(); };
    A.cpAppOpen = function (el) { appDrawer(el.dataset.id, el.dataset.to); };
    A.cpAppChk = function (el) { var a = C.app(el.dataset.id); C.appCheck(a, el.dataset.k); commit(); toast('Recorded: ' + C.type(el.dataset.k).n.toLowerCase() + ' checked by ' + h(C.me()) + '.', 'eye'); redraw(); };
    A.cpAppReg = function (el) {
      var a = C.app(el.dataset.id); var btn = el; btn.disabled = true; btn.innerHTML = ic('clock') + 'Checking...';
      setTimeout(function () { var r = C.appReg(a); commit(); toast(r.ok ? 'On the register, name matches. Sample result.' : 'Did not match the register.', r.ok ? 'shield-check' : 'alert'); if (q('#layer .drawer[data-cp]')) appDrawer(a.id, 'd-wcl'); else redraw(); }, 700);
    };
    A.cpApprove = function (el) {
      var a = C.app(el.dataset.id); if (!a || C.appIssues(a).length) return;
      var su = C.approve(a); commit();
      modal('Approved', ic('circle-check') + ' ' + h(su.name) + ' approved', '<ul class="xm-done">' + ['Added to the supplier handbook, with their contacts, depots, tip sites and prices', 'Bookable from now in New order, quotes and Find a supplier for ' + h(su.areas.join(', ')), 'Credit terms of ' + h(C.terms(su.id)) + ' saved, so the bill check knows when to pay them', 'Reminders set for every document, ' + C.S().set.remind + ' days before it runs out', 'Recorded in the audit trail: approved by ' + h(C.me()) + ', ' + h(C.when(Date.now()))].map(function (l) { return '<li>' + ic('circle-check') + '<span>' + l + '</span></li>'; }).join('') + '</ul><p class="muted" style="font-size:12.5px;margin:10px 0 0">Demo with sample data. Nothing is really sent.</p>',
        '<button class="btn" data-act="cpSup" data-id="' + su.id + '">' + ic('shield-check') + 'Their compliance record</button><span class="sp"></span><button class="btn pri" data-act="close">Done</button>');
    };
    A.cpApproveHand = function (el) { C.approveHand(el.dataset.id); commit(); toast('Approved. Recorded in the audit trail.', 'circle-check'); redraw(); };
    A.cpAppNo = function (el) {
      var a = C.app(el.dataset.id);
      modal('Turn down', 'Turn down ' + h(a.name) + '?', '<div class="field"><label for="cpNoWhy">Reason, for the audit trail</label><input id="cpNoWhy" placeholder="For example: does not cover our areas" autocomplete="off"></div><p class="muted" style="font-size:12.5px;margin:0">They are not told automatically. Nothing is deleted: the form and documents stay on file.</p>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="cpAppNoGo" data-id="' + a.id + '">Turn down</button>');
    };
    A.cpAppNoGo = function (el) { var a = C.app(el.dataset.id), w = (q('#cpNoWhy') || {}).value || ''; C.reject(a, w.trim()); commit(); close(); toast(h(a.name) + ' turned down. Kept on file.', 'x'); };
    A.cpAppAsk = function (el) {
      var a = C.app(el.dataset.id), k = el.dataset.k, d = a.data || {}, nm = first((d.book && d.book.name) || a.who), t = k && C.type(k);
      var txt = 'Hi ' + nm + ', thanks for filling in the form for Demo Skip & Grab. Before we can book you on jobs we just need ' + (t ? 'your ' + t.n.toLowerCase() + (k === 'permit' ? '' : ' certificate') : 'one more thing') + '. You can add it on the same link: ' + link(a) + '\n\nThanks, Dave\nDemo Skip & Grab';
      modal('Ask for something', ic('mail') + ' Ask ' + h(a.name), '<div class="field"><label for="cpAskTxt">Email to ' + h((d.book && d.book.email) || a.email) + '</label><textarea id="cpAskTxt" rows="6">' + h(txt) + '</textarea></div><p class="muted" style="font-size:12.5px;margin:0">Demo: nothing is sent.</p>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="cpAskGo" data-id="' + a.id + '" data-k="' + (k || '') + '">' + ic('send') + 'Send</button>');
    };
    A.cpAskGo = function (el) { var a = C.app(el.dataset.id), k = el.dataset.k; C.log(C.me(), a.id, 'Asked ' + a.name + ' for ' + (k ? 'the ' + C.type(k).n.toLowerCase() : 'more information'), 'chase'); commit(); close(); toast('Sent to ' + h(a.name) + '. Logged in the audit trail.', 'mail'); };
    A.cpResend = function (el) { var a = C.app(el.dataset.id); a.sentAt = Date.now(); C.log(C.me(), a.id, 'Sent the onboarding link to ' + a.name + ' again', 'invite'); commit(); toast('Link sent to ' + h(a.name) + ' again. Demo: nothing is sent.', 'send'); };
    A.cpAsThem = function (el) { var a = C.app(el.dataset.id); openPhone('join.html?i=' + a.code, a.name + ' on their phone'); };

    /* send a supplier the link */
    A.cpInvite = function () {
      modal('Send an onboarding link', ic('send') + ' Send a supplier the link', '<p style="margin:0 0 12px;font-size:13.5px">They fill it in on their phone: company, contacts, depots and tip sites, what they do and where, prices, credit terms and documents, then they sign. It lands in Awaiting approval.</p>' +
        '<div class="field"><label for="cpInvName">Company</label><input id="cpInvName" placeholder="For example Westfield Skips" autocomplete="off"></div>' +
        '<div class="grid g2" style="gap:0 12px"><div class="field"><label for="cpInvWho">Who to ask for</label><input id="cpInvWho" placeholder="First name" autocomplete="off"></div><div class="field"><label for="cpInvPh">Mobile, for WhatsApp</label><input id="cpInvPh" inputmode="tel" autocomplete="off"></div></div>' +
        '<div class="field"><label for="cpInvEm">Email</label><input id="cpInvEm" type="email" autocomplete="off"></div>',
        '<button class="btn" data-act="cpInvSample">' + ic('sparkles') + 'Fill with a sample</button><span class="sp"></span><button class="btn pri" data-act="cpInvGo" data-ch="email">' + ic('mail') + 'Email it</button><button class="btn pri" data-act="cpInvGo" data-ch="wa">' + ic('whatsapp') + 'WhatsApp it</button>');
      setTimeout(function () { var f = q('#cpInvName'); if (f) f.focus(); }, 40);
    };
    A.cpInvSample = function () { var v = { cpInvName: 'Westfield Skips', cpInvWho: 'Gary', cpInvPh: '07700 900451', cpInvEm: 'gary@westfieldskips.co.uk' }; Object.keys(v).forEach(function (k) { var f = q('#' + k); if (f) f.value = v[k]; }); };
    A.cpInvGo = function (el) {
      var g = function (id) { return String((q('#' + id) || {}).value || '').trim(); };
      var nm = g('cpInvName'), who = g('cpInvWho'), ph = g('cpInvPh'), em = g('cpInvEm'), ch = el.dataset.ch;
      if (!nm) { toast('Put the company name in.', 'alert'); var f = q('#cpInvName'); if (f) f.focus(); return; }
      if (ch === 'wa' && !ph) { toast('Put a mobile number in to WhatsApp it.', 'alert'); var p = q('#cpInvPh'); if (p) p.focus(); return; }
      if (ch === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast('Put an email address in to email it.', 'alert'); var e = q('#cpInvEm'); if (e) e.focus(); return; }
      var a = C.invite(nm, who, em, ph); commit();
      var msg = 'Hi ' + (who || 'there') + ', it\'s Dave at Demo Skip & Grab. To set you up as a supplier, could you fill this in? It takes about 10 minutes and a photo of your licence and insurance is fine.\n' + link(a);
      modal('Link sent', ic('circle-check') + ' Link sent to ' + h(nm), '<div class="cpmsg"><small>' + (ch === 'wa' ? ic('whatsapp') + 'WhatsApp to ' + h(ph) : ic('mail') + 'Email to ' + h(em)) + '</small><p>' + h(msg).replace(/\n/g, '<br>') + '</p></div>' +
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">They show under Links sent until they fill it in, then in Awaiting approval. Demo: nothing is sent.</p>',
        '<button class="btn" data-act="cpAsThem" data-id="' + a.id + '">' + ic('mobile') + 'See what ' + h(who || 'they') + ' see</button><span class="sp"></span><button class="btn pri" data-act="close">Done</button>');
      var f2 = cp(); f2.tab = 'queue'; if (ui.view === 'compliance') UI.render();
    };

    /* chase one document: one tap from the list, sent straight away */
    function chaseText(su, k) {
      var d = C.doc(su.id, k), t = C.type(k), st = C.st(d);
      return 'Hi ' + su.contact + ', it\'s Dave at Demo Skip & Grab. ' + (st === 'missing' ? 'We do not have your ' + t.n.toLowerCase() + ' on file.' : 'Our records show your ' + t.n.toLowerCase() + (st === 'expired' ? ' ran out on ' : ' runs out on ') + C.dateOf(d.exp) + '.') +
        ' Could you send the new one? A photo or PDF back to this message is fine.' + (st === 'expired' || st === 'missing' ? ' Until then we cannot book you on Demo Skip & Grab jobs.' : '') + '\n\nThanks, Dave';
    }
    function chaseSend(sid, k) {
      var su = CS.sup(sid); C.chase(sid, k);
      try { var t = CS.threadFor({ type: 'supplier', id: sid }, su.pref === 'email' ? 'email' : 'wa'); CS.addMsg(t, 'out', chaseText(su, k), { by: 'Dave' }); t.done = true; t.unread = false; } catch (e) {}
      return su;
    }
    A.cpChase = function (el) {
      var su = chaseSend(el.dataset.id, el.dataset.k); commit();
      toast('Chased ' + h(su.contact) + ' at ' + h(su.name) + ' by ' + (su.pref === 'email' ? 'email' : 'WhatsApp') + '. In their conversation and the audit trail.', 'mail'); redraw();
    };
    A.cpChaseAll = function () {
      var L = allDocs().filter(function (x) { return (x.st === 'expired' || x.st === 'due' || x.st === 'missing') && !x.opt; }), done = {};
      L.forEach(function (x) { var l = C.lastSent(x.su.id, x.t.k); if (l && l.how === 'chase' && Date.now() - l.at < 36e5) return; chaseSend(x.su.id, x.t.k); done[x.su.id] = 1; });
      commit(); var n = Object.keys(done).length;
      toast(n ? 'Chased ' + plural(n, 'supplier') + ' for ' + plural(L.length, 'document') + '. Each one is in their conversation.' : 'Nothing to chase. Everything due was chased in the last hour.', 'bell'); redraw();
    };
    A.cpChk = function (el) { C.check(el.dataset.id, el.dataset.k); commit(); toast('Recorded: checked by ' + h(C.me()) + ', ' + h(C.when(Date.now())) + '.', 'eye'); redraw(); };
    A.cpSupReg = function (el) { var r = C.supReg(el.dataset.id); commit(); toast(r && r.ok ? 'On the register. Sample result.' : 'Did not match the register.', 'shield-check'); redraw(); };
    A.cpBlock = function (el) {
      var su = CS.sup(el.dataset.id);
      modal('Block by hand', ic('lock') + ' Block ' + h(su.name), '<div class="field"><label for="cpBlkWhy">Why, for the audit trail</label><input id="cpBlkWhy" placeholder="For example: missed three deliveries this month" autocomplete="off"></div><p class="muted" style="font-size:12.5px;margin:0">They stop showing on New order, quotes and Find a supplier until you unblock them. Jobs already booked stay booked.</p>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="cpBlockGo" data-id="' + su.id + '">' + ic('lock') + 'Block</button>');
    };
    A.cpBlockGo = function (el) { var w = String((q('#cpBlkWhy') || {}).value || '').trim() || 'Blocked by hand'; C.block(el.dataset.id, w); commit(); supDrawer(el.dataset.id); toast('Blocked. Recorded in the audit trail.', 'lock'); };
    A.cpUnblock = function (el) { C.unblock(el.dataset.id); commit(); toast('Unblocked. Recorded in the audit trail.', 'refresh'); redraw(); };
    A.cpRenew = function (el) {
      var su = CS.sup(el.dataset.id), k = el.dataset.k, t = C.type(k), d = C.doc(su.id, k) || {};
      modal('New document', ic('download') + ' New ' + h(t.n.toLowerCase()), '<p style="margin:0 0 12px;font-size:13.5px">From ' + h(su.name) + '. Usually they send it back to the reminder, or add it on their link.</p>' +
        '<label class="btn" for="cpRnFile" style="cursor:pointer">' + ic('paperclip') + 'Choose the file</label><input type="file" id="cpRnFile" class="vh" accept="image/*,.pdf,.doc,.docx"><span id="cpRnName" class="muted" style="font-size:12.5px;margin-left:8px">Or use a sample</span>' +
        (t.ins ? '<div class="field" style="margin-top:12px"><label for="cpRnCover">Cover</label><select id="cpRnCover">' + (k === 'git' ? [25000, 50000, 100000] : k === 'el' ? [5e6, 10e6] : [1e6, 2e6, 5e6, 10e6]).map(function (x) { return '<option value="' + x + '"' + (x === d.cover ? ' selected' : '') + '>' + C.cover(x) + '</option>'; }).join('') + '</select></div>' : '<div class="field" style="margin-top:12px"><label for="cpRnNo">Number</label><input id="cpRnNo" value="' + h(d.no || '') + '" autocomplete="off"></div>') +
        '<div class="field"><label for="cpRnExp">Runs out on</label><input id="cpRnExp" type="date" value="' + C.iso((d.exp != null && d.exp > 0 ? d.exp : 0) + 365) + '" min="' + C.iso(1) + '"></div>' +
        (t.ins ? '<p class="muted" style="font-size:12.5px;margin:0">Saving files it as not checked yet. A person still ticks that they have looked at it.</p>' : ''),
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="cpRenewGo" data-id="' + su.id + '" data-k="' + k + '">' + ic('check') + 'Save it</button>');
    };
    A.cpRenewGo = function (el) {
      var sid = el.dataset.id, k = el.dataset.k, g = function (id) { return (q('#' + id) || {}).value; };
      var exp = C.offOf(g('cpRnExp')); if (exp == null || exp < 1) { toast('Pick a date in the future.', 'alert'); return; }
      var fl = q('#cpRnFile'); C.renew(sid, k, { exp: exp, cover: g('cpRnCover') ? +g('cpRnCover') : null, no: g('cpRnNo'), file: fl && fl.files && fl.files[0] ? fl.files[0].name : 'New ' + C.type(k).s.toLowerCase() + '.pdf' });
      commit(); supDrawer(sid); toast('Filed. ' + (C.bookable(sid).ok ? CS.esc(CS.sup(sid).name) + ' can be booked.' : 'Still blocked: ' + h(C.bookable(sid).why[0]) + '.'), 'shield-check');
    };
    A.cpCsv = function () {
      var rows = [['When', 'Who', 'Supplier', 'What']].concat(C.S().log.map(function (x) { return [C.when(x.at), x.who, whoName(x.sup), x.t]; }));
      var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      try { var u = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), a = document.createElement('a'); a.href = u; a.download = 'Demo Skip & Grab supplier audit trail.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); } catch (e) {}
      toast('Audit trail saved as a spreadsheet, ' + plural(rows.length - 1, 'line') + '.', 'download');
    };
    document.addEventListener('change', function (e) {
      var t = e.target; if (!t) return;
      if (t.dataset && t.dataset.cprem) { var p = t.dataset.cprem.split('|'); C.setRemind(p[0], p[1], +t.value); commit(); toast('Reminder set to ' + t.value + ' days before.', 'bell'); redraw(); }
      else if (t.id === 'cpTerms') { C.setTerms(t.dataset.id, t.value); commit(); toast('Credit terms saved: ' + h(t.value) + '. The bill check uses them.', 'calendar'); redraw(); }
      else if (t.id === 'cpType') { cp().type = t.value; UI.render(); }
      else if (t.id === 'cpWho') { cp().who = t.value; UI.render(); }
      else if (t.dataset && t.dataset.cpreq) { C.S().set.req[t.dataset.cpreq] = t.checked; C.log(C.me(), null, C.type(t.dataset.cpreq).n + (t.checked ? ' now required' : ' now optional') + ' for every supplier', 'info'); commit(); }
      else if (t.id === 'cpRemDef') { C.S().set.remind = +t.value; C.log(C.me(), null, 'Default reminder set to ' + t.value + ' days before', 'info'); commit(); }
      else if (t.id === 'cpMinPL') { C.S().set.minPL = +t.value; commit(); }
      else if (t.id === 'cpRnFile' && t.files && t.files[0]) { var n = q('#cpRnName'); if (n) n.textContent = t.files[0].name; }
    });
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'cpQ') { cp().q = e.target.value; var b = q('#cpBody'); if (b) b.innerHTML = cp().tab === 'sup' ? supView() : docsView(); var i = q('#cpQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } });
    CS.on(function (why) { if (why === 'sync' && ui.cpDraw && q('#layer .drawer[data-cp]')) ui.cpDraw(); });

    /* ---------- the rest of the office, told about compliance ---------- */
    window.DSGOB = {
      /* the handbook's top box: one line on compliance and a way in */
      hbBanner: function () {
        var n = counts(); if (!n.queue && !n.blocked && !n.due && !n.unchk) return '';
        return '<div class="card warnc cpban" style="margin-bottom:16px"><div class="hd"><h2>' + ic('shield-check') + 'To stay compliant</h2><button class="btn sm pri" data-act="go" data-v="compliance">' + ic('shield-check') + 'Open compliance</button></div><div class="bd cpbanb">' +
          (n.blocked ? '<button class="tag bad" data-act="cpGo" data-tab="sup" data-f="blocked">' + ic('lock') + plural(n.blocked, 'supplier') + ' blocked</button>' : '') + (n.due ? '<button class="tag amber" data-act="cpGo" data-tab="docs" data-f="due">' + ic('calendar') + plural(n.due, 'document') + ' due in 30 days</button>' : '') +
          (n.unchk ? '<button class="tag" data-act="cpGo" data-tab="docs" data-f="unchk">' + ic('eye') + n.unchk + ' to check</button>' : '') + (n.queue ? '<button class="tag brand" data-act="cpGo" data-tab="queue">' + ic('clock') + n.queue + ' awaiting approval</button>' : '') + '</div></div>';
      },
      supTag: function (su) { var s = C.status(su.id); if (s !== 'approved') return sTag(su.id); var ds = allDocs().filter(function (x) { return x.su.id === su.id && !x.opt; }); var due = ds.filter(function (x) { return x.st === 'due'; })[0]; return due ? stTag('due') : '<span class="tag ok">' + ic('shield-check') + 'In date</span>'; },
      hbSection: function (su) {
        var b = C.bookable(su.id), ds = allDocs().filter(function (x) { return x.su.id === su.id && !x.opt; });
        return '<div class="sec"><h3>Licences and insurance</h3><button class="btn sm" data-act="cpSup" data-id="' + su.id + '">' + ic('shield-check') + 'Compliance record</button></div>' +
          (b.ok ? '' : '<div class="note bad" style="margin-bottom:6px">' + ic('lock') + '<span><b>Cannot be booked.</b> ' + b.why.map(h).join('. ') + '.</span></div>') +
          ds.map(function (x) { return '<div class="rowline"><div class="bd"><b>' + h(x.t.n.replace(' for each tip site', '')) + '</b><small>' + (x.d ? h(what(x.d)) + ' · ' + dShort(x.d.exp) : 'Not on file') + '</small></div>' + stTag(x.st) + '</div>'; }).join('') +
          '<div class="rowline"><div class="bd"><b>Credit terms they give you</b><small>Pay on ' + h(C.terms(su.id)) + '</small></div></div>';
      },
      heldNote: function (held, short) {
        if (!held || !held.length) return '';
        return '<div class="note cpheld" role="note">' + ic('lock') + '<span><b>Not offered: </b>' + held.slice(0, 3).map(function (x) { return '<b>' + h(x.sup.name) + '</b>, ' + h(String(x.why[0] || 'not approved').replace(/^./, function (c) { return c.toLowerCase(); })); }).join('; ') + '. ' + (short ? '' : '<button class="linkbtn" data-act="cpSup" data-id="' + held[0].sup.id + '">See why</button>') + '</span></div>';
      },
      /* the bill check: the terms they agreed, and the date to pay by. The sample statement asks for 14 days. */
      billTerms: function (su) {
        var t = C.terms(su.id), pb = C.payBy(su.id, 0).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), same = t === '14 days';
        return '<div class="note cpterms ' + (same ? 'ok' : 'amb') + '" style="margin:0 14px 10px">' + ic('calendar') + '<span><b>Credit terms with ' + h(su.name) + ': ' + h(t) + '.</b> ' + (same ? 'The statement matches. Pay by ' + pb + '.' : 'The statement asks for payment in 14 days. Your agreed terms say pay by <b>' + pb + '</b>.') + ' <button class="linkbtn" data-act="cpSup" data-id="' + su.id + '">Change the terms</button></span></div>';
      },
      open: function (sid) { supDrawer(sid); }, openApp: function (id, to) { appDrawer(id, to); }, invite: A.cpInvite
    };

    /* Find a supplier: anyone covering it who cannot be booked shows under the list, with why */
    window.DSGOB.findHeld = function (held) {
      if (!held || !held.length) return '';
      return '<div class="card cpfind"><div class="hd"><h2>' + ic('lock') + 'Covers it, but cannot be booked <span class="muted" style="font-weight:600">' + held.length + '</span></h2></div><div class="bd" style="padding-top:2px;padding-bottom:2px">' + held.map(function (x) { return '<div class="rowline"><div class="bd"><b>' + h(x.sup.name) + '</b><small>' + h(x.why.join('. ')) + '</small></div><button class="btn sm" data-act="cpSup" data-id="' + x.sup.id + '">' + ic('shield-check') + 'Compliance</button></div>'; }).join('') + '</div></div>';
    };
    /* ---------- screens for the tour and Jack's presenter guide ---------- */
    var R = window.DSGG && window.DSGG.RUN;
    if (R) {
      var ca = function () { try { var b = q('#boot'); if (b) b.remove(); var tb = q('#tourBox'); if (tb && A.tourEnd) A.tourEnd(); A.close(); A.closePhone(); if (A.closeSide) A.closeSide(); } catch (e) {} ui.cpDraw = null; };
      var tab = function (t, f) { var c = cp(); c.tab = t; c.f = f || 'all'; c.type = 'all'; c.q = ''; c.who = 'all'; if (ui.view !== 'compliance') A.go({ dataset: { v: 'compliance' } }); else UI.render(); };
      R.obHome = function () { ca(); tab('queue'); };
      R.obInvite = function () { ca(); tab('queue'); A.cpInvite(); A.cpInvSample(); };
      R.obPhone = function () {
        ca(); tab('queue');
        var a = C.S().apps.filter(function (x) { return x.st === 'invited' || x.st === 'started'; })[0] || C.app('wr9p4');
        if (a && window.innerWidth >= 900) openPhone('join.html?i=' + a.code, a.name + ' on their phone');
      };
      R.obQueue = function () { ca(); tab('queue'); };
      R.obApp = function () { ca(); tab('queue'); var a = C.app('a1'); if (a && a.st === 'submitted') appDrawer('a1'); else if (a && a.sup) supDrawer(a.sup); };
      R.obDocs = function () { ca(); tab('docs', 'attn'); };
      R.obAudit = function () { ca(); tab('log'); };
      R.obKingsway = function () { ca(); tab('sup', 'blocked'); supDrawer('s16'); };
      R.obFind = function () { ca(); ui.find = null; A.go({ dataset: { v: 'find' } }); };
      R.obOrder = function () {
        ca(); if (ui.view !== 'find') A.go({ dataset: { v: 'find' } });
        A.newOrder({ dataset: { cust: 'c1' } });
        setTimeout(function () { var s = q('#ordSite'); if (s) { s.value = '0'; s.dispatchEvent(new Event('change', { bubbles: true })); } setTimeout(function () { var n = q('#ordR .cpheld'); if (n) n.scrollIntoView({ block: 'center' }); }, 80); }, 60);
      };
      R.obTerms = function () { ca(); A.go({ dataset: { v: 'bills' } }); if (!(S().v3 && S().v3.bill) && A.billSample) A.billSample(); };
    }
    C.runReminders(); CS.save();
    if (location.hash === '#compliance' && ui.view !== 'compliance') { ui.view = 'compliance'; }
    UI.render();
    window.DSGOBReady = true;
  }
  start(0);
})();
