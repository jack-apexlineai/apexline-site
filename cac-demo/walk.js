/* Guided tour inside the demo, for showing it on one shared screen. Add ?guide=1 to the address.
   A card at the foot of the side menu says what each screen is. Next sets up the next screen.
   Pause folds it away so you can click round freely, and Continue puts the screen back.
   Everything on the card is written for the person watching. ?guide=0 switches it off. */
(function () {
  var ON = 'cac-walk-on', KEY = 'cac-walk', p = new URLSearchParams(location.search), on = false;
  try {
    if (p.get('guide') === '1') {
      sessionStorage.setItem(ON, '1');
      /* opening the link fresh (typed, pasted or clicked) always starts the tour from the beginning. A refresh keeps your place. */
      var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
      if (nav.type !== 'reload' && nav.type !== 'back_forward') sessionStorage.removeItem(KEY);
    }
    if (p.get('guide') === '0') { sessionStorage.removeItem(ON); sessionStorage.removeItem(KEY); }
    on = sessionStorage.getItem(ON) === '1';
  } catch (e) { on = p.get('guide') === '1'; }
  if (!on) return;

  var STEPS = [
    { id: 'home', act: 'startup', back: 'homeDash', m: '1 min', t: 'Your home page',
      p: 'This is your view, the director\'s. Everyone you add gets their own login and only sees what you allow. Today\'s jobs, what is unpaid and what is booked this week, the month\'s revenue, and what is on the road right now.' },
    { id: 'gemma', act: 'gemma', m: '1 min', t: 'An email asking for a price',
      p: 'Gemma\'s email is already read. The site, the supplier and the price are worked out and the reply is written. Press Send reply.' },
    { id: 'order', act: 'order', m: '1 min', t: 'Place an order',
      p: 'Someone rings. Pick the customer, the service and the day. It shows who covers it, your price and the gross profit. PO number if they have one. One button books the supplier and sends the paperwork.' },
    { id: 'gemmabook', act: 'gemmaBook', m: '1 min', t: 'Gemma wants to book',
      p: 'She has answered. It spotted that she wants to book and tells you, wherever you are. Open and book fills the order in. One button places it.' },
    { id: 'diary', act: 'diary', m: '1 min', t: 'The order diary',
      p: 'Every order for the day, with Yesterday, Today and Tomorrow one tap away. Open an order for its confirmation, invoice and waste transfer note.',
      x: [{ l: 'Open one order', act: 'orderPage' }, { l: 'Show the month', act: 'diaryMonth' }] },
    { id: 'live', act: 'livejobs', m: '1 min', t: 'Live jobs today',
      p: 'Today\'s jobs in order of the supplier\'s window. Change a status from the drop-down. Set one to On the way and it offers to text the customer.',
      x: [{ l: 'Show skips on site', act: 'skips' }] },
    { id: 'handbook', act: 'handbook', m: '1 min', t: 'Supplier handbook',
      p: 'Who is cheapest, fastest to confirm and most reliable, so you know where to send the work. A warning before a licence or insurance runs out.' },
    { id: 'bills', act: 'bills', m: '1 min', t: 'Supplier bill check',
      p: 'Upload a supplier\'s statement and every line is put next to what you booked. Anything that does not match is flagged before you pay.',
      x: [{ l: 'Read the sample statement', act: 'billSample' }] },
    { id: 'customers', act: 'customers', m: 'half a min', t: 'Customers',
      p: 'A card for every customer: orders, value, gross profit and sites. Put an account on stop and nobody can book for them.',
      x: [{ l: 'Show credit control', act: 'creditctl' }] },
    { id: 'portal', act: 'portal', m: '1 min', t: 'The customer\'s own page',
      p: 'Each customer gets their own page. They book a job, ask for a quote, and find their waste transfer notes, invoices and statements, without ringing you. Every request comes to you first.' },
    { id: 'carbon', act: 'carbon', m: '1 min', t: 'Waste and carbon',
      p: 'Tonnes, the share kept out of landfill and carbon for every account and site, built from the transfer notes your suppliers send back. Each customer\'s report goes out under your logo. Carbon is an estimate.' },
    { id: 'skipper', act: 'skipper', m: '1 min', t: 'Skipper',
      p: 'Ask it in plain words. It finds the message, suggests the reply, and sends it only when you say so. Press Enter to ask.' }
  ];
  var st = { i: -1, paused: false };
  try { var sv = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (sv && typeof sv.i === 'number') st = { i: Math.max(-1, Math.min(STEPS.length, sv.i)), paused: !!sv.paused }; } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function run(act) {
    try { window.scrollTo(0, 0); if (window.CACUI) window.CACUI.ui.hcSeen = false; window.CACG.run(act); } catch (e) {}
    if (act === 'home' || act === 'reset') { var tb = document.getElementById('toasts'); if (tb) tb.innerHTML = ''; }   /* no "live messages off" pop-up at the start */
  }
  /* a calm inbox for showing: one WhatsApp booking and one website enquiry, then Gemma's email arrives on step 2. Nothing else lands. */
  var KEEP = ['t15', 't3'];
  function calm() {
    try {
      var S = window.CS.S;
      S.threads = S.threads.filter(function (t) { return KEEP.indexOf(t.id) >= 0 || (t.party && t.party.id === 'c7'); });
      S.live = (S.live || []).filter(function (L) { return L.party && L.party.id === 'c7'; }); S.liveIdx = 0;
      if (window.CACUI) { window.CACUI.ui.sel = null; }
      window.CS.commit();
    } catch (e) {}
  }
  /* in the guided run the bell counts the conversations that need a reply, so it matches the calm inbox */
  function bell() {
    try { if (window.CACX) window.CACX.todoCount = function () { return window.CS.S.threads.filter(function (t) { return !t.done && window.CS.needsYou(t); }).length; }; } catch (e) {}
  }
  function box() { var b = document.getElementById('walk'); if (!b) { b = document.createElement('div'); b.id = 'walk'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Guided tour'); document.body.appendChild(b); b.addEventListener('click', click); if (window.ResizeObserver) new ResizeObserver(size).observe(b); } return b; }   /* the observer also fires when the start-up screen goes and the card comes back */
  function size() { var b = document.getElementById('walk'); document.body.style.setProperty('--walkh', (b ? b.offsetHeight : 0) + 'px'); }

  function draw() {
    var b = box(), n = STEPS.length, s = STEPS[st.i];
    document.body.classList.add('walking');
    b.className = st.paused ? 'paused' : '';
    if (st.paused) b.innerHTML = '<span class="wk-n">Tour' + (s ? ' · ' + (st.i + 1) + ' of ' + n : '') + '</span><button data-wk="resume" title="Put this screen back and show the card">Resume</button>' + (s ? '<button class="pri" data-wk="next" title="Go to the next screen">' + (st.i === n - 1 ? 'Finish' : 'Next') + '</button>' : '');
    else if (st.i < 0) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">' + n + ' screens, a few minutes</b><p class="wk-p">Press Start. Next moves to the next screen. Click anywhere on the page and this card folds out of the way.</p><div class="wk-b"><button class="pri" data-wk="start">Start</button></div>';
    else if (st.i >= n) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">That is the main run</b><p class="wk-p">Ask to see anything again, or anything that was not shown.</p><div class="wk-prog"><i style="width:100%"></i></div><div class="wk-b"><button data-wk="back">Back</button><button data-wk="restart">Start again</button><button data-wk="close">Close</button></div>';
    else b.innerHTML = '<div class="wk-top"><span class="wk-n">Tour · ' + (st.i + 1) + ' of ' + n + '</span>' + (s.m ? '<span class="wk-m">' + s.m + '</span>' : '') + '<button class="mini" data-wk="pause" title="Fold the tour away. It also folds by itself as soon as you click anywhere on the page">Hide</button></div>' +
      '<b class="wk-t">' + esc(s.t) + '</b><p class="wk-p">' + esc(s.p) + '</p>' +
      (s.x ? '<div class="wk-x">' + s.x.map(function (x) { return '<button class="xtra" data-wk="x" data-a="' + x.act + '">' + esc(x.l) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="wk-prog"><i style="width:' + Math.round((st.i + 1) / n * 100) + '%"></i></div>' +
      '<div class="wk-b">' + (st.i > 0 ? '<button data-wk="back">Back</button>' : '') + '<button data-wk="again" title="Put this screen back as it was">Again</button><button class="pri" data-wk="next">' + (st.i === n - 1 ? 'Finish' : 'Next') + '</button></div>';
    size();
  }
  function show(i, restoring) {
    st.i = i; st.paused = false; save();
    if (i >= 0 && i < STEPS.length) run(restoring && STEPS[i].back ? STEPS[i].back : STEPS[i].act);
    else if (i >= STEPS.length) run('today');
    draw();
  }
  function click(e) {
    var el = e.target.closest('[data-wk]'); if (!el) return;
    e.stopPropagation(); e.preventDefault();
    var k = el.getAttribute('data-wk');
    if (k === 'start' || k === 'restart') { run('reset'); calm(); show(0); }
    else if (k === 'next') show(st.i + 1);
    else if (k === 'back') show(st.i - 1, true);
    else if (k === 'again') show(st.i, true);
    else if (k === 'x') run(el.getAttribute('data-a'));
    else if (k === 'pause') { st.paused = true; save(); draw(); }
    else if (k === 'resume') show(st.i, true);
    else if (k === 'close') { try { sessionStorage.removeItem(ON); sessionStorage.removeItem(KEY); } catch (e2) {} var b = document.getElementById('walk'); if (b) b.remove(); document.body.classList.remove('walking'); document.body.style.removeProperty('--walkh'); try { var u = new URL(location.href); u.searchParams.delete('guide'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e3) {} }
  }
  function begin(tries) {
    if (!(window.CACG && window.CACUI && window.CS && window.CS.S)) { if ((tries || 0) < 80) setTimeout(function () { begin((tries || 0) + 1); }, 50); return; }
    bell();
    if (st.i < 0) { run('reset'); calm(); draw(); }        /* waiting to start: Home, live messages off */
    else if (st.paused || st.i >= STEPS.length) { calm(); draw(); }                  /* a reload keeps the place, and keeps the inbox calm */
    else { calm(); show(st.i, true); }
    window.addEventListener('resize', size);
    /* click anywhere on the page and the card folds down to a small strip, out of the way. Resume or Next bring it back. */
    document.addEventListener('click', function (e) {
      if (st.paused || st.i < 0 || st.i >= STEPS.length) return;
      var t = e.target; if (!t || !t.closest || t.closest('#walk') || t.closest('#boot') || t.closest('#xsign')) return;
      st.paused = true; save(); draw();
    }, true);
  }
  window.CACWALK = { steps: STEPS.map(function (s) { return s.id; }), state: function () { return { i: st.i, paused: st.paused }; } };
  begin(0);
})();
