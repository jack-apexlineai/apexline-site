/* Guided tour inside the demo, for showing it on one shared screen. Add ?guide=1 to the address.
   A card at the foot of the side menu says what each screen is. Next sets up the next screen.
   Pause folds it away so you can click round freely, and Continue puts the screen back.
   Everything on the card is written for the person watching. ?guide=0 switches it off. */
(function () {
  var ON = 'cac-walk-on', KEY = 'cac-walk', p = new URLSearchParams(location.search), on = false;
  try {
    if (p.get('guide') === '1') sessionStorage.setItem(ON, '1');
    if (p.get('guide') === '0') { sessionStorage.removeItem(ON); sessionStorage.removeItem(KEY); }
    on = sessionStorage.getItem(ON) === '1';
  } catch (e) { on = p.get('guide') === '1'; }
  if (!on) return;

  var STEPS = [
    { id: 'home', act: 'startup', back: 'homeDash', t: 'Your home page',
      p: 'This is your view, the director\'s. Everyone you add gets their own login and only sees what you allow. Sales by month at the top, then a card for each thing that needs you. Arrange chooses what is on here.' },
    { id: 'gemma', act: 'gemma', t: 'An order from an email',
      p: 'Gemma\'s email is already read and the reply is drafted. Three answers: the date, the price, then one button books the supplier and sends her the invoice and confirmation.' },
    { id: 'order', act: 'order', t: 'Place an order',
      p: 'Pick a customer, a service and a day. It shows who covers it, their price, your price and the margin. One button books the supplier and sends the paperwork.' },
    { id: 'diary', act: 'diary', t: 'The order diary',
      p: 'Every order, past and booked, by month, week or day. The arrows flick back through every month.',
      x: [{ l: 'Open one order', act: 'orderPage' }, { l: 'Show the week', act: 'diaryWeek' }, { l: 'Show the list', act: 'diaryList' }] },
    { id: 'trends', act: 'trends', t: 'Trends and the forecast',
      p: 'This month against the same point last month, in plain words. The forecast is an estimate from what you have taken per working day.' },
    { id: 'bills', act: 'bills', t: 'Supplier bill check',
      p: 'Upload a supplier\'s statement and every line is put next to what you booked. Anything that does not match is flagged before you pay.',
      x: [{ l: 'Read the sample statement', act: 'billSample' }] },
    { id: 'handbook', act: 'handbook', t: 'Supplier handbook',
      p: 'Every supplier\'s contacts, prices and hire period in one place, with a warning before a licence or insurance runs out.' },
    { id: 'skips', act: 'skips', t: 'Skips on site',
      p: 'Every skip on site, counted against that supplier\'s hire period, and flagged when a collection needs booking.',
      x: [{ l: 'Show live jobs today', act: 'livejobs' }] },
    { id: 'chasing', act: 'chasing', t: 'Chasing',
      p: 'Everything waiting on someone else, with the chase message already written.' }
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
  function box() { var b = document.getElementById('walk'); if (!b) { b = document.createElement('div'); b.id = 'walk'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Guided tour'); document.body.appendChild(b); b.addEventListener('click', click); if (window.ResizeObserver) new ResizeObserver(size).observe(b); } return b; }   /* the observer also fires when the start-up screen goes and the card comes back */
  function size() { var b = document.getElementById('walk'); document.body.style.setProperty('--walkh', (b ? b.offsetHeight : 0) + 'px'); }

  function draw() {
    var b = box(), n = STEPS.length, s = STEPS[st.i];
    document.body.classList.add('walking');
    b.className = st.paused ? 'paused' : '';
    if (st.paused) b.innerHTML = '<span class="wk-n">Tour' + (s ? ' · ' + (st.i + 1) + ' of ' + n : '') + '</span><button data-wk="resume" title="Put this screen back and show the card">Resume</button>' + (s ? '<button class="pri" data-wk="next" title="Go to the next screen">' + (st.i === n - 1 ? 'Finish' : 'Next') + '</button>' : '');
    else if (st.i < 0) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">' + n + ' screens, a few minutes</b><p class="wk-p">Press Start. Next moves to the next screen. Click anywhere on the page and this card folds out of the way.</p><div class="wk-b"><button class="pri" data-wk="start">Start</button></div>';
    else if (st.i >= n) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">That is the main run</b><p class="wk-p">Ask to see anything again, or anything that was not shown.</p><div class="wk-prog"><i style="width:100%"></i></div><div class="wk-b"><button data-wk="back">Back</button><button data-wk="restart">Start again</button><button data-wk="close">Close</button></div>';
    else b.innerHTML = '<div class="wk-top"><span class="wk-n">Tour · ' + (st.i + 1) + ' of ' + n + '</span><button class="mini" data-wk="pause" title="Fold the tour away. It also folds by itself as soon as you click anywhere on the page">Hide</button></div>' +
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
    if (st.i < 0) { run('reset'); calm(); draw(); }        /* waiting to start: Home, live messages off */
    else if (st.paused || st.i >= STEPS.length) draw();                              /* a reload keeps the place */
    else show(st.i, true);
    window.addEventListener('resize', size);
    /* click anywhere on the page and the card folds down to a small strip, out of the way. Resume or Next bring it back. */
    document.addEventListener('click', function (e) {
      if (st.paused || st.i < 0 || st.i >= STEPS.length) return;
      var t = e.target; if (!t || !t.closest || t.closest('#walk') || t.closest('#boot')) return;
      st.paused = true; save(); draw();
    }, true);
  }
  window.CACWALK = { steps: STEPS.map(function (s) { return s.id; }), state: function () { return { i: st.i, paused: st.paused }; } };
  begin(0);
})();
