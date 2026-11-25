/* Demo Skip & Grab phone view. Same data as the office, so approving here updates the office screen straight away. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var params = new URLSearchParams(location.search);
  if (params.get('embed')) document.body.classList.add('embed');
  var S = CS.load();
  var ui = { tab: 'home', thread: null, done: {}, reading: {} };

  function $(s) { return document.querySelector(s); }
  function needsYou(t) { return CS.needsYou(t); }
  function sorted() { return S.threads.slice().sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.last - a.last; }); }
  function chIcon(ch) { return ch === 'wa' ? 'whatsapp' : (ch === 'email' ? 'mail' : (ch === 'portal' ? 'link' : 'world')); }
  function av(name, type) { var pal = type === 'supplier' ? ['#3F3F46', '#52525B'] : type === 'lead' ? ['#7A3FF2', '#6D28D9'] : ['#EB9347', '#C7672A', '#D9853A']; var n = 0; for (var i = 0; i < name.length; i++) n += name.charCodeAt(i); return '<span class="av" style="--c:' + pal[n % pal.length] + '">' + h(CS.initials(name)) + '</span>'; }
  function toast(t, i) { var b = $('#toasts'), el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = 0; setTimeout(function () { el.remove(); }, 400); }, 3200); }
  function greeting() { var hr = new Date().getHours(); return hr < 12 ? 'Morning' : (hr < 18 ? 'Afternoon' : 'Evening'); }

  function render() {
    S = CS.S;
    document.documentElement.setAttribute('data-theme', S.settings.theme);
    $('#plogo').src = S.settings.theme === 'dark' ? 'brand/logo-inverted.svg' : 'brand/logo.svg';
    $('#pthemeBtn').innerHTML = ic(S.settings.theme === 'dark' ? 'sun' : 'moon');
    $('#plive').className = 'livepill' + (S.settings.live ? '' : ' off'); $('#plive').innerHTML = '<i></i>' + (S.settings.live ? 'Live' : 'Paused');
    var st = CS.stats();
    var tabs = [['home', 'Home', 'home'], ['inbox', 'Inbox', 'inbox'], ['jobs', 'Jobs', 'truck'], ['money', 'Money', 'pound']];
    $('#ptabs').innerHTML = tabs.map(function (t) { return '<button data-act="tab" data-v="' + t[0] + '" class="' + (ui.tab === t[0] && !ui.thread ? 'on' : '') + '">' + ic(t[2]) + t[1] + (t[0] === 'inbox' && st.needs ? '<span class="cnt">' + st.needs + '</span>' : '') + '</button>'; }).join('');
    var ae = document.activeElement, aeId = ae && ae.id;
    $('#pview').innerHTML = ui.thread ? threadView(CS.thread(ui.thread)) : (V[ui.tab] || V.home)();
    if (aeId && document.getElementById(aeId)) document.getElementById(aeId).focus();
  }

  function card(t) {
    var p = CS.party(t.party), A = CS.analyse(t), last = CS.lastReal(t) || t.msgs[t.msgs.length - 1];
    return '<div class="acard" id="card-' + t.id + '"><div class="who">' + av(p.name, t.party.type) + '<span class="bd"><b>' + h(p.name) + '</b><small>' + ic(chIcon(t.ch)) + ' ' + h(p.sub) + ' · ' + CS.ago(t.last) + '</small></span></div>' +
      '<div class="msg">' + (last.voice ? ic('microphone') + ' ' : '') + h(last.text) + '</div><div class="ttl">' + ic('sparkles') + '<span>' + h(A.title) + (A.margin ? ' <span class="tag ok">' + money(A.margin) + ' margin</span>' : '') + '</span></div>' +
      '<div class="btns"><button class="btn ' + (A.kind === 'hold' ? 'pri' : 'ok') + '" data-act="approve" data-id="' + t.id + '">' + ic(A.kind === 'hold' ? 'pound' : 'check') + h(shortApprove(A)) + '</button><button class="btn" data-act="open" data-id="' + t.id + '">Read</button></div></div>';
  }
  function shortApprove(A) { return { hold: 'Ask for payment', book: 'Approve booking', quote: 'Send quote', ask: 'Send reply', exchange: 'Book exchange', collect: 'Book collection', wtn: 'File WTN', paid: 'Mark paid', pack: 'Send WTNs', bill: 'Approve and recharge', confirm: 'Confirm to customer', reschedule: 'Move and tell both' }[A.kind] || 'Mark done'; }

  var V = {};
  V.home = function () {
    var st = CS.stats(), mtd = S.months[S.months.length - 1], needs = sorted().filter(needsYou);
    return '<div class="phello"><h2>' + greeting() + ', Dave</h2><p>' + (needs.length ? needs.length + ' need you. Each one is ready to approve.' : 'Nothing needs you. Inbox clear.') + '</p></div>' +
      '<div class="ptiles"><button class="ptile" data-act="tab" data-v="inbox"><small>Needs you</small><b>' + st.needs + '</b></button><button class="ptile" data-act="tab" data-v="jobs"><small>Jobs today</small><b>' + st.today + '</b></button><button class="ptile hero" data-act="tab" data-v="money"><small>Margin, month</small><b>£' + (mtd.margin / 1000).toFixed(1) + 'k</b></button></div>' +
      '<div class="psec">' + ic('sparkles') + 'Ready for you</div>' + (needs.length ? needs.slice(0, 5).map(card).join('') : '<div class="acard"><div class="empty">' + ic('circle-check') + 'All done. Enjoy the brew.</div></div>') +
      '<button class="btn lg" data-act="test" style="width:100%">' + ic('whatsapp') + 'Send a test message as a customer</button>' +
      '<div class="psec">' + ic('hourglass') + 'Done for you today</div><div class="acard"><b style="font-size:26px">' + Math.floor(S.saved.mins / 60) + 'h ' + (S.saved.mins % 60) + 'm</b><span class="muted" style="font-size:13px">of admin, ' + S.saved.actions + ' tasks. Estimate.</span></div>';
  };
  V.inbox = function () {
    return '<div class="plist">' + sorted().map(function (t) {
      var p = CS.party(t.party), last = CS.lastReal(t) || t.msgs[t.msgs.length - 1];
      return '<button class="it' + (t.unread && !t.done ? ' unread' : '') + (t.done ? ' done' : '') + '" data-act="open" data-id="' + t.id + '"><span class="av" style="--c:' + (t.party.type === 'supplier' ? '#3F3F46' : t.party.type === 'lead' ? '#7A3FF2' : '#EB9347') + '">' + h(CS.initials(p.name)) + '<span class="ch ' + t.ch + '">' + ic(chIcon(t.ch)) + '</span></span><span class="bd"><span class="l1"><b>' + h(p.name) + '</b><time>' + CS.ago(t.last) + '</time></span><span class="l2">' + h(p.sub) + '</span><span class="l3">' + h((last.dir === 'out' ? 'You: ' : '') + last.text) + '</span></span></button>';
    }).join('') + '</div>';
  };
  V.jobs = function () {
    var waiting = S.jobs.filter(function (j) { return j.status === 'booked'; });
    var soon = S.jobs.filter(function (j) { return [j.day, j.exDay, j.colDay].some(function (d) { return d === 0 || d === 1; }) && j.status !== 'booked'; });
    function row(j, chase) { var c = CS.cust(j.cust), s = CS.jobSite(j); return '<div class="pjob"><span class="bd"><b>' + j.id + ', ' + h(CS.jobDesc(j)) + '</b><small>' + h(c.name) + ', ' + h(s.pc) + ' · ' + CS.fmtDay(j.day) + ' · ' + h(CS.sup(j.sup).name) + '</small></span>' + (chase ? '<button class="btn sm" data-act="chase" data-id="' + j.id + '">' + ic('bell') + 'Chase</button>' : '<span class="tag ok">' + money(j.sell - j.cost) + '</span>') + '</div>'; }
    return '<div class="psec">' + ic('clock') + 'Waiting on suppliers</div><div class="plist">' + (waiting.map(function (j) { return row(j, true); }).join('') || '<div class="empty">' + ic('circle-check') + 'All confirmed.</div>') + '</div>' +
      '<div class="psec">' + ic('truck') + 'Today and tomorrow</div><div class="plist">' + (soon.map(function (j) { return row(j); }).join('') || '<div class="empty">Nothing booked.</div>') + '</div>';
  };
  V.money = function () {
    var st = CS.stats(), mtd = S.months[S.months.length - 1];
    var late = S.invoices.filter(function (i) { return i.status !== 'paid' && i.due < 0; });
    return '<div class="ptiles" style="grid-template-columns:1fr 1fr"><div class="ptile hero"><small>Margin this month</small><b>' + money(mtd.margin) + '</b></div><div class="ptile"><small>Owed to you</small><b>' + money(st.owed) + '</b></div></div>' +
      '<div class="psec">' + ic('alert') + 'Late payers</div><div class="plist">' + (late.map(function (i) { var c = CS.cust(i.cust); return '<div class="pjob"><span class="bd"><b>' + h(c.name) + ', ' + money(i.amount, true) + '</b><small>' + i.id + ' · ' + (-i.due) + ' days late' + (i.reminded ? ' · reminded' : '') + '</small></span><button class="btn sm" data-act="remind" data-id="' + i.id + '">' + ic('mail') + 'Remind</button></div>'; }).join('') || '<div class="empty">' + ic('circle-check') + 'Nobody is late.</div>') + '</div>';
  };
  function threadView(t) {
    if (!t) { ui.thread = null; return V.home(); }
    var p = CS.party(t.party);
    var msgs = t.msgs.map(function (m) { return '<div class="bub ' + (m.dir === 'out' ? 'out' : 'in') + '">' + (t.subject && m === t.msgs[0] ? '<span class="subj">' + h(t.subject) + '</span>' : '') + (m.voice ? '<span class="vtr">' + ic('microphone') + 'Voice note, written out</span>' : '') + h(m.text) + (m.att && m.att.length ? '<div class="att">' + m.att.map(function (a) { return '<button data-act="noop">' + ic(a.t === 'wtn' ? 'certificate' : 'paperclip') + h(a.n) + '</button>'; }).join('') + '</div>' : '') + '<div class="meta">' + CS.clock(m.at) + '</div></div>'; }).join('');
    var o = '<div class="pth"><div class="pback"><button class="iconbtn" data-act="back" aria-label="Back">' + ic('chevron-left') + '</button>' + av(p.name, t.party.type) + '<span><b>' + h(p.name) + '</b><small>' + h(p.sub) + ' · ' + CS.chName(t.ch) + '</small></span></div><div class="msgs">' + msgs + '</div>';
    var d = ui.done[t.id];
    if (d) return o + '<div class="pdone"><h3>' + ic('circle-check') + 'Done</h3>' + d.map(function (s, i) { return '<div class="st" style="animation-delay:' + (i * 0.25) + 's">' + ic('check') + '<span>' + h(s) + '</span></div>'; }).join('') + '<button class="btn pri" data-act="nextOne" style="margin-top:6px">' + ic('arrow-right') + 'Next one</button></div></div>';
    if (t.done) return o + '<div class="acard"><b>Done</b><span class="muted" style="font-size:13px">Nothing waiting here.</span></div></div>';
    if (ui.reading[t.id]) return o + '<div class="acard"><div class="reading" style="padding:4px"><div class="rl"><span class="dot"></span>Reading it, checking rates, writing your reply</div><div class="skel" style="width:80%"></div><div class="skel" style="width:60%"></div></div></div></div>';
    var A = CS.analyse(t);
    o += '<div class="acard"><div class="ttl">' + ic('sparkles') + '<span>' + h(A.title) + '</span></div>' + (A.chips.length ? '<div class="chips">' + A.chips.slice(0, 5).map(function (c) { return '<span class="chip"><small>' + h(c.k) + '</small><span>' + h(c.v) + '</span></span>'; }).join('') + '</div>' : '') +
      (A.lines.length ? '<div class="money"><div class="tot"><div><small>Customer</small><b>' + money(A.sell) + '</b></div><div><small>Supplier</small><b>' + money(A.cost) + '</b></div><div class="m"><small>Margin</small><b>' + money(A.margin) + '</b></div></div></div>' : '') +
      A.drafts.map(function (dr, i) { var w = CS.party(dr.party); return '<label class="muted" style="font-size:12px;font-weight:700" for="pd-' + t.id + '-' + i + '">' + ic(chIcon(dr.ch)) + ' To ' + h(w.name) + '</label><textarea class="pdraft" id="pd-' + t.id + '-' + i + '" data-draft="' + i + '" data-id="' + t.id + '">' + h((t.edits && t.edits[i] != null) ? t.edits[i] : dr.text.replace(/\{JOB\}/g, 'Demo Skip & Grab-' + S.counters.job)) + '</textarea>'; }).join('') +
      '<button class="btn ok lg" data-act="approve" data-id="' + t.id + '" style="width:100%">' + ic('check') + h(A.approve || 'Approve') + '</button><small class="muted" style="text-align:center;font-size:11.5px">Nothing sends until you tap approve.</small></div></div>';
    return o;
  }

  function open(id) {
    var t = CS.thread(id); ui.thread = id; delete ui.done[id];
    if (t.fresh && !t.done) { ui.reading[id] = true; t.fresh = false; t.unread = false; CS.save(); setTimeout(function () { delete ui.reading[id]; render(); }, 1100); }
    else if (t.unread) { t.unread = false; CS.save(); }
    render(); window.scrollTo(0, 0);
  }
  var A = {
    tab: function (el) { ui.tab = el.dataset.v; ui.thread = null; render(); window.scrollTo(0, 0); },
    open: function (el) { open(el.dataset.id); },
    back: function () { ui.thread = null; render(); },
    approve: function (el) {
      var id = el.dataset.id, edits = {};
      document.querySelectorAll('textarea[data-draft][data-id="' + id + '"]').forEach(function (ta) { edits[ta.dataset.draft] = ta.value; });
      var steps = CS.approve(id, edits);
      if (ui.thread === id) { ui.done[id] = steps; render(); }
      else { var c = document.getElementById('card-' + id); toast(h(steps[0]), 'circle-check'); if (c) { c.classList.add('gone'); setTimeout(render, 480); } else render(); }
    },
    nextOne: function () { var n = sorted().filter(needsYou)[0]; if (n) open(n.id); else { ui.thread = null; ui.tab = 'home'; render(); toast('All clear', 'circle-check'); } },
    chase: function (el) { CS.chaseSupplier(el.dataset.id); CS.commit(); toast('Chased on WhatsApp', 'bell'); },
    remind: function (el) { CS.remind(el.dataset.id); CS.commit(); toast('Reminder sent, invoice attached', 'mail'); },
    ptheme: function () { S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; CS.commit(); },
    noop: function () { toast('Attachment stored on the job', 'paperclip'); },
    test: function () {
      var opts = S.customers.map(function (c) { return '<option value="' + c.id + '">' + h(c.contact) + ', ' + h(c.name) + '</option>'; }).join('');
      document.getElementById('layer').innerHTML = '<div class="scrim" data-act="closeL"></div><div class="modal" role="dialog" aria-label="Send a test message"><div class="mhd"><h2>Send as a customer</h2><button class="iconbtn" data-act="closeL" aria-label="Close">' + ic('x') + '</button></div><div class="mbd"><div class="field"><label for="ptWho">From</label><select id="ptWho">' + opts + '</select></div><div class="field"><label for="ptText">WhatsApp message</label><input id="ptText" value="need an 8 yarder in UB6 Tuesday"></div></div><div class="mft"><button class="btn pri" data-act="testSend">' + ic('send') + 'Send</button></div></div>';
    },
    closeL: function () { document.getElementById('layer').innerHTML = ''; },
    testSend: function () {
      var txt = document.getElementById('ptText').value.trim(); if (!txt) return;
      var t = CS.incoming({ party: { type: 'customer', id: document.getElementById('ptWho').value }, ch: 'wa', text: txt });
      CS.save(); document.getElementById('layer').innerHTML = ''; toast('New WhatsApp in', 'whatsapp'); open(t.id);
    }
  };
  document.addEventListener('click', function (e) { var el = e.target.closest('[data-act]'); if (!el) return; var a = el.getAttribute('data-act'); if (A[a]) { e.preventDefault(); A[a](el); } });
  document.addEventListener('input', function (e) { var el = e.target; if (el.dataset.draft != null) { var t = CS.thread(el.dataset.id); t.edits = t.edits || {}; t.edits[el.dataset.draft] = el.value; CS.save(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') A.closeL(); if (e.key === 'Enter' && e.target.id === 'ptText') A.testSend(); });
  CS.on(function () { var ae = document.activeElement; if (ae && ae.tagName === 'TEXTAREA') return; render(); });
  setInterval(function () { var got = CS.tick({ runLive: !params.get('embed') }); if (got.length) { got.forEach(function (t) { toast('New ' + CS.chName(t.ch) + ' from ' + h(CS.party(t.party).name), chIcon(t.ch)); }); render(); } }, 1000);
  render();
})();
