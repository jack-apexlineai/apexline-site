/* Guided tour inside the demo, for showing it on one shared screen. Add ?guide=1 to the address.
   A card at the foot of the side menu says what each screen is. Next sets up the next screen.
   Pause folds it away so you can click round freely, and Continue puts the screen back.
   Everything on the card is written for the person watching. ?guide=0 switches it off. */
(function () {
  var ON = 'dsg-walk-on', KEY = 'dsg-walk', p = new URLSearchParams(location.search), on = false;
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
    { id: 'home', act: 'yHome', m: '1 min', t: 'Your whole yard, on one screen',
      p: 'Skips, grabs, lorries, drivers, paperwork and money, in one place. Eight tiles, nothing else to learn. Revenue this week sits first, because money in matters most. Tap any tile to go straight there.' },
    { id: 'bookings', act: 'yBookings', m: '1 min', t: 'Bookings, skips and grabs',
      p: 'Every job with its size or loads, the waste stream and the EWC code, and a road permit where it needs one. Press New booking: pick the customer, the skip or grab, the waste, and it suggests the right lorry.',
      x: [{ l: 'Open a new booking', act: 'yBookNew' }] },
    { id: 'plan', act: 'yPlan', m: '1 min', t: 'The day plan',
      p: 'One column per lorry. Drag a job onto a lorry and it is on that driver\'s phone straight away. A grab job will not go on a skip lorry, and a 40 yard RoRo only goes on the hook lorry.' },
    { id: 'skips', act: 'ySkips', m: '1 min', t: 'Skips on site',
      p: 'Every skip out on hire, how many days it has been there, and which ones are over the hire period. Exchange or Collection is one tap: it goes on tomorrow\'s plan and the customer gets a text.',
      x: [{ l: 'Show only the overdue ones', act: 'ySkipsOver' }] },
    { id: 'permits', act: 'yPermits', m: 'half a min', t: 'Permits',
      p: 'Every road permit from To apply for, through Applied for, Paid and Waiting on council, to Approved. A road booking makes its permit card by itself, and if nobody has applied within 30 minutes, you get a nudge.' },
    { id: 'driver', act: 'yDriver', m: '1 min', t: 'The driver app',
      p: 'What the driver sees on his phone. Today\'s jobs in order, Navigate, and On my way, which texts the customer an ETA. On site: a photo, the customer signs on the screen, then the ticket and weight. Press the buttons on the phone.' },
    { id: 'tracking', act: 'yTrack', m: '1 min', t: 'Live tracking',
      p: 'Every lorry on the map, and every job going from booked to on the way, on site and done as the drivers press their buttons. Tap a lorry to follow it. In the demo the lorries are simulated.' },
    { id: 'tickets', act: 'yTickets', m: '1 min', t: 'Weighbridge tickets and transfer notes',
      p: 'Tip tickets come in and match to the right job by lorry, time and site. The odd one it cannot place waits for one tap. A waste transfer note is made the moment the driver finishes, with the signature, photo and weight.',
      x: [{ l: 'Open a waste transfer note', act: 'yWtn' }] },
    { id: 'roro', act: 'yRoro', m: '1 min', t: 'A RoRo back on the weighbridge',
      p: 'The hook lorry weighs on and the number plate is read. It is matched to its job and customer by lorry, time and site. The RoRo came in over the tonnage it includes, so the invoice for the extra weight is ready with the sum worked out. Press Yes, send the invoice: it goes to the customer with the ticket, and onto the job.',
      x: [{ l: 'Show the RoRo prices', act: 'yPrices' }, { l: 'Weigh another lorry in', act: 'yRoroWeigh' }] },
    { id: 'credit', act: 'yCredit', m: '1 min', t: 'Credit control',
      p: 'Cash collected this week, who owes what, and how late, at 30, 60 and 90 days. Statements and reminders go out by themselves. Put a customer on stop and every new booking for them warns you and asks twice.',
      x: [{ l: 'Try booking a customer on stop', act: 'yBookStop' }] },
    { id: 'defra', act: 'yDefra', m: '1 min', t: 'Ready for Defra\'s digital waste tracking',
      p: 'Every load into your transfer station is prepared for Defra as it happens: ready, submitted, or needs fixing, with the reason. Fix the two flagged ones, then export the ready ones in Defra\'s format.' },
    { id: 'recycling', act: 'yRecycle', m: 'half a min', t: 'Recycling report',
      p: 'Tonnes, recycling rate and carbon for the whole company by month and by waste stream, and a report for each customer under your logo. Sample figures.' },
    { id: 'scoreboard', act: 'yScore', m: '1 min', t: 'The scoreboard',
      p: 'Who is top this week. Quotes, orders and gross profit for the office and sales, with commission worked out at the rate you set. The drivers have their own league: jobs a day and on time.',
      x: [{ l: 'Show the drivers\' league', act: 'yScoreDrv' }] },
    { id: 'portal', act: 'portal', m: '1 min', t: 'The customer\'s own page',
      p: 'Each customer gets their own page with your logo. They book a skip, ask for a swap and find their transfer notes, invoices and waste report, without ringing you. Every request comes to you first.' },
    { id: 'mine', act: 'yMineShow', m: 'half a min', t: 'Make it yours',
      p: 'Everyone sets out their own screen. Drag the menu into your own order, pin favourites to the top, drag the home tiles round. It is saved for each person, with a reset.',
      x: [{ l: 'Arrange the home tiles', act: 'yArrange' }] },
    { id: 'assistant', act: 'yAssist', m: '1 min', t: 'The assistant, and Report a problem',
      p: 'Ask it in plain words: which skips are overdue, where is Grab 1, who owes me money. Something not right? Report a problem and it goes straight to Jack with the details. Same-day fix or that month\'s free.',
      x: [{ l: 'Report a problem', act: 'yProblem' }] },
    { id: 'inbox', act: 'yInbox', m: '1 min', t: 'One inbox, replies written for you',
      p: 'Sian wants a price: the quote is worked out from your price list and the reply is written, so it is one tap to approve and send. Rob left a voice note to book: it is written out, and Book it in fills the booking for you to confirm.' }
  ];
  /* quiet version for a prospect on their own (?quiet=1): no scripted moments where a customer or supplier answers on a timer */
  if (new URLSearchParams(location.search).get('quiet') === '1') STEPS = STEPS.filter(function (s) { return s.id !== 'gemmabook' && s.id !== 'lee'; });
  var st = { i: -1, paused: false };
  try { var sv = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (sv && typeof sv.i === 'number') st = { i: Math.max(-1, Math.min(STEPS.length, sv.i)), paused: !!sv.paused }; } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function run(act) {
    try { window.scrollTo(0, 0); if (window.DSGUI) window.DSGUI.ui.hcSeen = false; window.DSGG.run(act); } catch (e) {}
    if (act === 'home' || act === 'reset') { var tb = document.getElementById('toasts'); if (tb) tb.innerHTML = ''; }   /* no "live messages off" pop-up at the start */
  }
  /* a calm inbox for showing: one WhatsApp booking and one website enquiry, then Gemma's email arrives on step 2. Nothing else lands. */
  var KEEP = ['t15', 't3'];
  function calm() {
    try {
      var S = window.CS.S;
      S.threads = S.threads.filter(function (t) { return KEEP.indexOf(t.id) >= 0 || (t.party && t.party.id === 'c7'); });
      S.live = (S.live || []).filter(function (L) { return L.party && L.party.id === 'c7'; }); S.liveIdx = 0;
      if (window.DSGUI) { window.DSGUI.ui.sel = null; }
      window.CS.commit();
    } catch (e) {}
  }
  /* in the guided run the bell counts the conversations that need a reply, so it matches the calm inbox */
  function bell() {
    try { if (window.DSGX) window.DSGX.todoCount = function () { return window.CS.S.threads.filter(function (t) { return !t.done && window.CS.needsYou(t); }).length; }; } catch (e) {}
  }
  function box() { var b = document.getElementById('walk'); if (!b) { b = document.createElement('div'); b.id = 'walk'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Guided tour'); document.body.appendChild(b); b.addEventListener('click', click); if (window.ResizeObserver) new ResizeObserver(size).observe(b); } return b; }   /* the observer also fires when the start-up screen goes and the card comes back */
  function size() { var b = document.getElementById('walk'); document.body.style.setProperty('--walkh', (b ? b.offsetHeight : 0) + 'px'); }

  function draw() {
    var b = box(), n = STEPS.length, s = STEPS[st.i];
    document.body.classList.add('walking');
    b.className = st.paused ? 'paused' : '';
    if (st.paused) b.innerHTML = '<span class="wk-n">Tour' + (s ? ' · ' + (st.i + 1) + ' of ' + n : '') + '</span><button data-wk="resume" title="Put this screen back and show the card">Resume</button>' + (s ? '<button class="pri" data-wk="next" title="Go to the next screen">' + (st.i === n - 1 ? 'Finish' : 'Next') + '</button>' : '');
    else if (st.i < 0) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">' + n + ' screens, about fifteen minutes</b><p class="wk-p">The whole skip and grab system, one screen at a time: bookings, the driver app, tracking, credit control and Defra. Press Start. Next moves to the next screen. Click anywhere on the page and this card folds out of the way.</p><div class="wk-b"><button class="pri" data-wk="start">Start</button></div>';
    else if (st.i >= n) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">That is the main run</b><p class="wk-p">Live inside 2 to 4 weeks. Download the templates, fill them in, and upload them here yourself. We walk you through it on a call. Ask to see anything again, or anything that was not shown.</p><div class="wk-prog"><i style="width:100%"></i></div><div class="wk-b"><button data-wk="back">Back</button><button data-wk="restart">Start again</button><button data-wk="close">Close</button></div>';
    else b.innerHTML = '<div class="wk-top"><span class="wk-n">' + (s.sec ? esc(s.sec) + ' · ' : 'Tour · ') + (st.i + 1) + ' of ' + n + '</span>' + (s.m ? '<span class="wk-m">' + s.m + '</span>' : '') + '<button class="mini" data-wk="pause" title="Fold the tour away. It also folds by itself as soon as you click anywhere on the page">Hide</button></div>' +
      '<b class="wk-t">' + esc(s.t) + '</b><p class="wk-p">' + esc(s.p) + '</p>' +
      (s.x ? '<div class="wk-x">' + s.x.map(function (x) { return '<button class="xtra" data-wk="x" data-a="' + x.act + '">' + esc(x.l) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="wk-prog"><i style="width:' + Math.round((st.i + 1) / n * 100) + '%"></i></div>' +
      '<div class="wk-b">' + (st.i > 0 ? '<button data-wk="back">Back</button>' : '') + '<button data-wk="again" title="Put this screen back as it was">Again</button><button class="pri" data-wk="next">' + (st.i === n - 1 ? 'Finish' : 'Next') + '</button></div>';
    size();
  }
  function show(i, restoring) {
    st.i = i; st.paused = false; save();
    if (i >= 0 && i < STEPS.length) run(restoring && STEPS[i].back ? STEPS[i].back : STEPS[i].act);
    else if (i >= STEPS.length) run('yHome');
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
    if (!(window.DSGG && window.DSGUI && window.CS && window.CS.S && window.DSGY)) { if ((tries || 0) < 160) setTimeout(function () { begin((tries || 0) + 1); }, 50); return; }
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
  window.DSGWALK = { steps: STEPS.map(function (s) { return s.id; }), state: function () { return { i: st.i, paused: st.paused }; } };
  begin(0);
})();
