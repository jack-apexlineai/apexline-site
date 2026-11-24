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
    /* Since we spoke (added 24 Nov for the second call): supplier onboarding and compliance */
    { id: 'sw-link', sec: 'Since we spoke', act: 'obInvite', m: 'half a min', t: 'Send a supplier a link',
      p: 'New since we spoke. Put the supplier\'s name and number in and press WhatsApp it or Email it. They get a link to fill in on their phone. No forms to chase, nothing for you to type.' },
    { id: 'sw-phone', sec: 'Since we spoke', act: 'obPhone', m: '1 min', t: 'What the supplier fills in',
      p: 'Company, contacts, depots and tip sites, what they do and where, their price list in any format, the credit terms they give you, and their licence and insurance. Then they accept your supplier terms, the duty of care declaration and data consent, and sign. Press Start, or the demo button to fill it in. On a phone, open a link from the list below.' },
    { id: 'sw-approve', sec: 'Since we spoke', act: 'obApp', m: '1 min', t: 'Check it, then approve',
      p: 'Wendmoor filled it in yesterday. Check the carrier licence on the Environment Agency register. The insurance is looked at by a person, not the software: tick it and your name and the time are saved. Approve stays grey until everything is done.' },
    { id: 'sw-docs', sec: 'Since we spoke', act: 'obDocs', m: '1 min', t: 'Every document, in date or not',
      p: 'Every supplier and every document as in date, due in 30 days or expired. A month before anything runs out the supplier is emailed for the new one, by itself. Chase is one tap. The audit trail shows who approved, checked and chased what, and when.',
      x: [{ l: 'Show the audit trail', act: 'obAudit' }, { l: 'Their terms in the bill check', act: 'obTerms' }] },
    { id: 'sw-blocked', sec: 'Since we spoke', act: 'obOrder', m: '1 min', t: 'Out of date means not bookable',
      p: 'Kingsway\'s public liability ran out, so they are held back automatically. New order does not offer them and says why. Once the new certificate is in and checked, they come straight back.',
      x: [{ l: 'Open Kingsway\'s record', act: 'obKingsway' }, { l: 'Show it in Find a supplier', act: 'obFind' }] },
    { id: 'gemma', act: 'gemma', m: '1 min', t: 'An email asking for a price',
      p: 'Gemma\'s email is already read. The site, the supplier and the price are worked out and the reply is written. Press Send reply.' },
    { id: 'hannah', act: 'hannah', m: '1 min', t: 'A new lead off your website',
      p: 'Hannah filled in your quote form a few minutes ago. The price is worked out at your target gross profit and the reply is written. Change the price and the message changes with it. Tap her number to ring her. Press Send quote.' },
    { id: 'quotes', act: 'quotes', m: '1 min', t: 'Your quotes',
      p: 'Every live quote, oldest first, and why you lose the ones you lose. Send all the follow-ups due today in one go, or chase one on its own.' },
    { id: 'gemmabook', act: 'gemmaBook', m: '1 min', t: 'Gemma wants to book',
      p: 'She has answered. It spotted that she wants to book and tells you, wherever you are. Open and book fills the order in. One button places it, raises the invoice and sends the paperwork.' },
    { id: 'lee', act: 'lee', m: '1 min', t: 'A grab for tomorrow',
      p: 'Lee wants a grab tomorrow morning. It knows his site and picks the supplier. Ask them, they answer, book it. Every step stays on the card.' },
    { id: 'diary', act: 'diary', m: '1 min', t: 'The order diary',
      p: 'Every order for the day, with Yesterday, Today and Tomorrow one tap away. Open an order for its confirmation, invoice and waste transfer note.',
      x: [{ l: 'Open one order', act: 'orderPage' }, { l: 'Show the month', act: 'diaryMonth' }] },
    { id: 'live', act: 'livejobs', m: '1 min', t: 'Live jobs today',
      p: 'Today\'s jobs in order of the supplier\'s window. Chase all ETAs sends each supplier one message covering all their jobs today. Change a status from the drop-down. Set one to On the way and it offers to text the customer.',
      x: [{ l: 'Show skips on site', act: 'skips' }] },
    { id: 'handbook', act: 'handbook', m: '1 min', t: 'Supplier handbook',
      p: 'Who is cheapest, fastest to confirm and most reliable, so you know where to send the work. A warning before a licence or insurance runs out.' },
    { id: 'bills', act: 'bills', m: '1 min', t: 'Supplier bill check',
      p: 'Upload a supplier\'s statement and every line is put next to what you booked. Anything that does not match is flagged before you pay.',
      x: [{ l: 'Read the sample statement', act: 'billSample' }] },
    { id: 'money', act: 'money', m: 'half a min', t: 'Money',
      p: 'Every invoice, what is paid, what is owed and what you owe suppliers, with the gross profit on each. Credit control shows who owes what against their limit and chases them in one tap. Trends shows this month against last, and where the month is heading.',
      x: [{ l: 'Show credit control', act: 'creditctl' }, { l: 'Show trends', act: 'trends' }, { l: 'Show the team', act: 'team' }] },
    { id: 'customers', act: 'customers', m: 'half a min', t: 'Customers',
      p: 'A card for every customer: orders, value, gross profit and sites. Put an account on stop and nobody can book for them.',
      x: [{ l: 'Show credit control', act: 'creditctl' }] },
    { id: 'portal', act: 'portal', m: '1 min', t: 'The customer\'s own page',
      p: 'Each customer gets their own page. They book a job, ask for a quote, and find their waste transfer notes, invoices and statements, without ringing you. Each customer has their own waste and carbon dashboard. Book something on it and it lands in your inbox, ready to book in one tap.',
      x: [{ l: 'Show their waste and carbon', act: 'portalGreen' }, { l: 'Open their booking in the inbox', act: 'portalInbox' }] },
    { id: 'carbon', act: 'carbon', m: '1 min', t: 'Waste and carbon',
      p: 'Tonnes, the share kept out of landfill and carbon for every account and site, built from the transfer notes your suppliers send back. Each customer\'s report goes out under your logo. Carbon is an estimate.' },
    { id: 'unpaid', act: 'unpaid', m: 'half a min', t: 'Half four: who has not paid',
      p: 'At half four it checks tomorrow. Anyone not on account who has not paid their link gets flagged, so nothing goes out unpaid. Ring them, send the link again, move it a day or cancel.' },
    { id: 'skipper', act: 'skipper', m: '1 min', t: 'Skipper',
      p: 'Ask it in plain words. It finds the message, suggests the reply, and sends it only when you say so. Press Enter to ask.' }
  ];
  /* quiet version for a prospect on their own (?quiet=1): no scripted moments where a customer or supplier answers on a timer */
  if (new URLSearchParams(location.search).get('quiet') === '1') STEPS = STEPS.filter(function (s) { return s.id !== 'gemmabook' && s.id !== 'lee'; });
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
    else if (st.i < 0) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">' + n + ' screens, a few minutes</b><p class="wk-p">New since we spoke: suppliers onboard themselves from a link, and nobody gets booked with an out of date licence or insurance. That comes first. Press Start. Next moves to the next screen. Click anywhere on the page and this card folds out of the way.</p><div class="wk-b"><button class="pri" data-wk="start">Start</button></div>';
    else if (st.i >= n) b.innerHTML = '<div class="wk-top"><span class="wk-n">Guided tour</span></div><b class="wk-t">That is the main run</b><p class="wk-p">Ask to see anything again, or anything that was not shown.</p><div class="wk-prog"><i style="width:100%"></i></div><div class="wk-b"><button data-wk="back">Back</button><button data-wk="restart">Start again</button><button data-wk="close">Close</button></div>';
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
