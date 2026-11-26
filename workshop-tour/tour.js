/* Self-serve tour: the guided tour over the real office screens.
   Each step goes to a screen, highlights a real element and says in a line or two why it
   matters to a workshop owner. Next, Back, Skip tour, the step count, and the arrow and Esc
   keys. The Tour button in the demo bar starts it again. Only claims the demo backs up. */
(function () {
  var O = WS.O;
  var BOOK = 'https://calendly.com/jack-waste-hub/30min';
  var WA = 'https://wa.me/447949088642?text=' + encodeURIComponent('Hi Jack, I had a look at the workshop system demo.');
  var phone = function () { return window.innerWidth <= 760; };
  var $ = function (s) { return document.querySelector(s); };
  var visible = function (el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  function pickEl(sels) {
    sels = [].concat(sels);
    for (var i = 0; i < sels.length; i++) {
      var s = sels[i], el = typeof s === 'function' ? s() : $(s);
      if (visible(el)) return el;
    }
    return null;
  }
  function closeOverlays() {
    if (O.closeModal) try { O.closeModal(); } catch (e) { }
    if (O.closePhone && $('.pmask .pframe')) try { O.closePhone(); } catch (e) { }
    if (O.closePortal && $('.pmask .bwin')) try { O.closePortal(); } catch (e) { }
    if (O.closeWheel) try { O.closeWheel(true); } catch (e) { }
    document.body.classList.remove('navopen');
  }
  function go(screen) { closeOverlays(); if (O.screen !== screen) O.go(screen); else O.render(); window.scrollTo(0, 0); }
  function pmiWithSheet() {
    var j = (WS.state.jobs || []).filter(function (x) { return x.inspection && x.inspection.sign; })[0];
    return j ? j.id : null;
  }

  /* ------------------------------ the steps ------------------------------ */
  var STEPS = [
    {
      id: 'signin', when: function () { return !!$('#wsSignin'); },
      title: 'Everyone signs in as themselves',
      body: 'The office, the fitters and the accounts each get their own login, so each person sees only what they should. Press Next and we\'ll sign you in as the owner.',
      target: ['#wsSignin .si-card'],
      next: function (done) {
        var pin = $('#siPin'), f = $('#siForm');
        if (!pin || !f) { done(); return; }
        pin.value = WS.SIGNIN_PIN || '1234';
        pin.dispatchEvent(new Event('input', { bubbles: true }));
        if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true }));
        waitFor(function () { return !$('#wsSignin') && (!!$('#wsBoot') || O.startupState === 'skipped' || O.startupState === 'done'); }, 5000, done);
      }
    },
    {
      id: 'briefing', when: function (ctx) { return ctx.fromSignin; },
      skip: function () { return !$('#wsBoot'); },
      title: 'Your morning briefing',
      body: 'Every sign in opens with the day in numbers: jobs in, lorries off the road, overdue inspections, customers yet to authorise work, money ready to invoice. Worked out from the live board, nobody types it up.',
      target: ['#wsBoot .bt-stage', '#wsBoot .bt-lines', '#wsBoot'],
      wait: 1200,
      next: function (done) {
        if ($('#wsBoot') && O.startupContinue) O.startupContinue();
        waitFor(function () { return !$('#wsBoot') && O.introState !== 'playing'; }, 6000, function () { setTimeout(done, 300); });
      }
    },
    {
      id: 'urgent',
      prep: function (done) {
        go('home');
        if (O.urgentScan) setTimeout(O.urgentScan, 50);
        waitFor(function () { return !!$('#wsUrgent .upop'); }, 2500, done);
      },
      title: 'Nothing slips through',
      body: 'An inspection due in the next two days with nothing booked and no reminder sent? It pops up the moment you sign in, with the reminder one tap away. Anything else that needs you sits under the bell.',
      target: ['#wsUrgent', '#wsBell'],
      leave: function () { var u = $('#wsUrgent'); if (u) u.innerHTML = ''; }
    },
    {
      id: 'home', prep: function (done) { go('home'); setTimeout(done, 150); },
      title: 'Your whole day on one screen',
      body: 'What\'s in, waiting on parts, ready to invoice and off the road. Tap any number to go straight to it, and drag the blocks into the order you like.',
      target: ['#hBlocks .stat', '#hBlocks'], area: '#hBlocks', rows: 2
    },
    {
      id: 'bookin',
      prep: function (done) {
        go('bookin');
        setTimeout(function () {
          var r = $('#bReg'), b = $('#bLook');
          if (r && b) { r.value = 'YX19 KTD'; r.dispatchEvent(new Event('input', { bubbles: true })); b.click(); }
          setTimeout(done, 350);
        }, 250);
      },
      title: 'Book a lorry in, in seconds',
      body: 'Type a reg and press Look up, and the lorry\'s details fill themselves (in this demo they\'re sample details). Pick the job, the day and the fitter, and the job card is made.',
      target: [function () { var r = $('#bReg'); return r && r.closest('.card'); }, '#bReg']
    },
    {
      id: 'board', prep: function (done) { go('board'); setTimeout(done, 150); },
      title: 'The workshop board',
      body: 'Every lorry in today and which bay it\'s in. Drag a lorry into a bay to move it. The whiteboard, without the marker pen.',
      target: ['#view .board']
    },
    {
      id: 'planner', prep: function (done) { go('planner'); setTimeout(done, 150); },
      title: 'Plan the day by dragging',
      body: 'Drag a job from the waiting list onto a fitter. Or press Suggest a plan and it shares the work out by each fitter\'s skills, how quick they\'ve been at that job before and the hours they have spare. You still have the final say.',
      target: ['#pAuto'], area: ['#poolCard']
    },
    {
      id: 'inspections', prep: function (done) { go('vcal'); setTimeout(done, 200); },
      title: 'Inspections that come round on their own',
      body: 'Set each lorry\'s interval (6, 8, 10 or 12 weeks) and the dates roll forward by themselves. Move any date to fit the diary. Each customer gets an email 7 days before. In this demo nothing is actually sent.',
      target: ['#autoRem']
    },
    {
      id: 'live', prep: function (done) { go('live'); setTimeout(done, 150); },
      title: 'Live view: who\'s running over',
      body: 'Every fitter, what they\'re on and whether it\'s to time. Green is inside the estimate, amber is close, red is over. It updates as fitters start and finish jobs on their phones.',
      target: ['#view .lcol', '#view .grid.g4'], area: '#view .lcol', all: true
    },
    {
      id: 'fitter',
      prep: function (done) {
        closeOverlays();
        if (!phone() && O.openPhone) { go('live'); O.openPhone(); setTimeout(done, 700); } else { go('home'); setTimeout(done, 150); }
      },
      title: 'The fitter app',
      body: function () {
        return 'Fitters tap their name and PIN, press Start PMI and the office sees it on Live view. Found something else wrong? The photo and price go to the customer to approve. Sign offs are one tap, and Job done sends it to the office.' +
          (phone() ? ' Tap Fitter app up here after the tour to try it.' : ' Try it in the phone: Dave\'s PIN is 1111.');
      },
      target: ['.pmask .psizer', '#wsPhone'],
      leave: function () { if (O.closePhone) O.closePhone(); }
    },
    {
      id: 'approvals', prep: function (done) { go('approvals'); setTimeout(done, 150); },
      title: 'Extra work, approved by the customer',
      body: 'When a fitter finds more wrong, the customer sees the photo and the price and approves it. You see who hasn\'t replied and what\'s held up, and chase them in one click. No more ringing round.',
      target: [function () { var h = $('#view h3'); return h && h.closest('.card'); }, '#view .grid']
    },
    {
      id: 'sheet',
      prep: function (done) { go('vehicles'); var id = pmiWithSheet(); if (id && O.sheetView) O.sheetView(id); setTimeout(done, 300); },
      title: 'Inspection sheets that lock',
      body: 'Every item marked serviceable, defect or N/A, brake figures, wheel re-torque and two signatures, filled in on the fitter\'s phone. Once it\'s signed off it locks and nobody can change it.',
      target: ['.modal', '.mbox', '[role="dialog"]'],
      leave: function () { if (O.closeModal) O.closeModal(); }
    },
    {
      id: 'money', prep: function (done) { if (O.setMoneyView) O.setMoneyView('overview'); go('money'); setTimeout(done, 150); },
      title: 'Money, all in one place',
      body: 'Invoices out, bills in and fitter pay. Labour comes off the fitters\' clock-ons and parts get your markup. Connect Xero in Settings and new invoices are set to post across by themselves (this demo isn\'t linked to a real Xero).',
      target: ['#view .grid'], area: '#view .grid'
    },
    {
      id: 'pay', prep: function (done) { if (O.setMoneyView) O.setMoneyView('pay'); go('money'); setTimeout(done, 200); },
      title: 'Fitter pay without the time cards',
      body: 'Hours come off the clock for any week or month, day rate or hourly. Add overtime and extras, then send one spreadsheet to the accountant.',
      target: ['#view .mview .card', '#view .mview'],
      leave: function () { if (O.setMoneyView) O.setMoneyView('overview'); }
    },
    {
      id: 'portal',
      prep: function (done) {
        closeOverlays();
        if (!phone() && O.openPortal) { go('home'); O.openPortal('o1', { site: true }); setTimeout(done, 600); } else { go('home'); setTimeout(done, 150); }
      },
      title: 'Your customers get their own portal',
      body: function () {
        return 'Each customer signs in to see their own fleet and every due date, book lorries in on days you have room, report a repair with an estimate first, and approve extra work.' +
          (phone() ? ' Tap Customer portal up here after the tour to see it.' : ' It starts on a mock-up of your own website.');
      },
      target: ['.pmask .bwin', '#wsPortal'],
      leave: function () { if (O.closePortal) O.closePortal(); }
    },
    {
      id: 'settings', prep: function (done) { go('settings'); setTimeout(function () { var t = $('#team'); if (t) t.scrollIntoView({ block: 'start' }); done(); }, 200); },
      title: 'You decide who sees what',
      body: 'Add your team and pick what each person can do: see money, approve quotes, run pay, book in. Fitters only ever get the fitter app.',
      target: ['#team .card', '#team']
    },
    {
      id: 'end', prep: function (done) { go('home'); setTimeout(done, 100); },
      end: true,
      title: 'Want this built round your workshop?',
      body: 'This demo is the starting point. Yours is set up with your bays, your fitters, your inspection sheets and your customers. Have a click round, then book 20 minutes with Jack and tell him how your workshop runs.'
    }
  ];


  /* ---------------- the highlights tour (?tour=wow) ----------------
     The wow moments only, for a narrated screen recording. No gate, no sign in, no prices,
     and nothing the demo does not do (no voice, no look-ups). */
  function hideVoiceTip() {
    // the phone's side panel lists the voice preview: not part of the highlights
    document.querySelectorAll('.pmsteps li').forEach(function (li) { if (/speak/i.test(li.textContent)) li.remove(); });
  }
  /* on a phone the fitter app and the portal open in a panel above the tour card, not a new page */
  function peek(src, label) {
    unpeek();
    var w = document.createElement('div');
    w.className = 'tr-peek';
    w.innerHTML = '<iframe src="' + src + '" title="' + WS.esc(label) + '"></iframe>';
    document.body.appendChild(w);
  }
  function unpeek() { var w = $('.tr-peek'); if (w) w.remove(); }
  var WOW = [
    {
      id: 'wall',
      // the board as it would sit on a screen on the wall: every bay in one view
      prep: function (done) { document.documentElement.classList.add('tr-wallview'); go('board'); setTimeout(done, 250); },
      leave: function () { document.documentElement.classList.remove('tr-wallview'); },
      title: 'Your workshop board, on the wall',
      body: 'Every bay, every lorry and every fitter, live on a screen in the workshop. No whiteboard.',
      target: ['#view .board']
    },
    {
      id: 'live', hero: true, prep: function (done) { go('live'); setTimeout(done, 200); },
      title: 'Who\'s on time, who\'s running over',
      body: 'Every fitter, the job they\'re on and the clock against the estimate. Over time shows red.',
      target: ['#view .lcol', '#view .grid.g4'], area: '#view .lcol', all: true
    },
    {
      id: 'fitter',
      prep: function (done) {
        closeOverlays();
        if (!phone() && O.openPhone) {
          // Dave already signed in on the phone, so it opens on his day
          try { localStorage.setItem('wsTour:fitter', 'f1'); } catch (e) { }
          go('live'); O.openPhone();
          setTimeout(function () { hideVoiceTip(); done(); }, 900);
        } else {
          try { localStorage.setItem('wsTour:fitter', 'f1'); } catch (e) { }
          go('live'); peek('fitter.html?dock=1', 'Fitter app'); setTimeout(done, 900);
        }
      },
      title: 'The fitter app, on any phone',
      body: 'Clock on, photos and parts from any phone, in the bay or out on the van.',
      target: ['.pmask .psizer', '.tr-peek', '#wsPhone'],
      leave: function () { try { localStorage.removeItem('wsTour:fitter'); } catch (e) { } unpeek(); if (O.closePhone) O.closePhone(); }
    },
    {
      id: 'approvals', prep: function (done) { go('approvals'); setTimeout(done, 200); },
      title: 'Extra work, approved from their phone',
      body: 'The fitter finds it, the customer sees the price and taps approve. No ringing round.',
      target: ['#view .appr', '#view .grid']
    },
    {
      id: 'sheet',
      prep: function (done) { go('vehicles'); var id = pmiWithSheet(); if (id && O.sheetView) O.sheetView(id); setTimeout(done, 300); },
      title: 'Inspection sheets that lock',
      body: 'Filled in on the fitter\'s phone and signed off. Once it\'s signed, nobody can change it.',
      target: ['.modal', '.mbox', '[role="dialog"]'],
      leave: function () { if (O.closeModal) O.closeModal(); }
    },
    {
      id: 'invoice', prep: function (done) { if (O.setMoneyView) O.setMoneyView('invoices'); go('money'); setTimeout(done, 200); },
      title: 'Job done to invoice, one click',
      body: 'Finished jobs line up here. One click raises the invoice, ready to go across to Xero.',
      target: [function () {
        var h = [].slice.call(document.querySelectorAll('#view .card h2')).filter(function (x) { return /waiting to be billed/i.test(x.textContent); })[0];
        return h && h.closest('.card');
      }, '#view .grid'],
      clip: 300,
      leave: function () { if (O.setMoneyView) O.setMoneyView('overview'); }
    },
    {
      id: 'pay', prep: function (done) { if (O.setMoneyView) O.setMoneyView('pay'); go('money'); setTimeout(done, 200); },
      title: 'Fitter pay that adds itself up',
      body: 'Hours come straight off the clock, so no time cards. One spreadsheet for the accountant.',
      target: [function () { var t = $('#view .mview table'); return t && t.closest('.card'); }, '#view .mview .card', '#view .mview'],
      leave: function () { if (O.setMoneyView) O.setMoneyView('overview'); }
    },
    {
      id: 'portal',
      prep: function (done) {
        closeOverlays();
        if (!phone() && O.openPortal) { go('home'); O.openPortal('o1'); setTimeout(done, 900); }
        else { go('home'); peek('portal.html?dock=1&as=o1', 'Customer portal'); setTimeout(done, 900); }
      },
      title: 'Your customers get their own portal',
      body: 'They see their fleet and due dates, book lorries in and approve work, under your name.',
      target: ['.pmask .bwin', '.tr-peek', '#wsPortal'],
      leave: function () { unpeek(); if (O.closePortal) O.closePortal(); }
    },
    {
      id: 'end', prep: function (done) { go('live'); setTimeout(done, 150); },
      end: true,
      title: 'Built round how your workshop already works.',
      body: 'Your bays, your fitters, your sheets and your customers. Set up the way you run it.'
    }
  ];

  /* --------------------------- the engine --------------------------- */
  var run = null;   // { steps, i, busy }
  var spot, card, ticker;

  function waitFor(test, ms, done) {
    var t0 = Date.now();
    (function poll() {
      var ok = false;
      try { ok = test(); } catch (e) { }
      if (ok || Date.now() - t0 > ms) done(ok); else setTimeout(poll, 80);
    })();
  }

  function build() {
    if (spot) return;
    spot = document.createElement('div');
    spot.className = 'tr-spot';
    spot.setAttribute('aria-hidden', 'true');
    card = document.createElement('div');
    card.className = 'tr-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-label', 'Guided tour');
    document.body.appendChild(spot);
    document.body.appendChild(card);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    ticker = setInterval(place, 250);
  }
  function teardown() {
    if (spot) spot.remove();
    if (card) card.remove();
    spot = card = null;
    clearInterval(ticker);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.documentElement.classList.remove('touring', 'tr-wow');
  }
  function onKey(e) {
    if (!run || run.busy) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); back(); }
  }

  function stepTarget(s) { return s.target ? pickEl(s.target) : null; }

  /* the box to light up: the target, or the area round it (capped to the screen) */
  function rectFor(s) {
    var el = run && run.el;
    if (!el || !el.isConnected) { el = stepTarget(s); if (run) run.el = el; }
    if (!el) return null;
    var r = el.getBoundingClientRect(), box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    if (s.clip) box.b = Math.min(box.b, box.t + s.clip);
    if (s.area) {
      var areas = s.all ? [].slice.call(document.querySelectorAll(s.area)) : [].concat(s.area).map(function (x) { return $(x); });
      areas.forEach(function (a) {
        if (!visible(a)) return;
        var q = a.getBoundingClientRect();
        box.l = Math.min(box.l, q.left); box.t = Math.min(box.t, q.top); box.r = Math.max(box.r, q.right); box.b = Math.max(box.b, q.bottom);
      });
    }
    return box;
  }

  function place() {
    if (!run || !spot || !card) return;
    var s = run.steps[run.i], vw = window.innerWidth, vh = window.innerHeight, pad = 6;
    var box = rectFor(s);
    var mob = phone();
    var cr = card.getBoundingClientRect();
    if (!box) {
      card.classList.remove('attop');
      spot.classList.add('none');
      card.classList.toggle('center', !mob);
      card.style.left = card.style.top = '';
      return;
    }
    spot.classList.remove('none');
    card.classList.remove('center');
    // on a phone the card is a sheet: along the bottom, or along the top when the target sits low (fixed pop ups)
    var atTop = mob && box.t > vh * 0.45;
    if (mob && card.classList.contains('attop') !== atTop) { card.classList.toggle('attop', atTop); cr = card.getBoundingClientRect(); }
    var maxB = mob && !atTop ? vh - cr.height - 10 : vh - 8, minT = atTop ? cr.bottom + 8 : 4;
    var l = Math.max(4, box.l - pad), t = Math.max(minT, box.t - pad), r = Math.min(vw - 4, box.r + pad), b = Math.min(maxB, box.b + pad);
    if (b - t < 24) { b = Math.min(maxB, t + 24); }
    spot.style.left = l + 'px'; spot.style.top = t + 'px';
    spot.style.width = Math.max(0, r - l) + 'px'; spot.style.height = Math.max(0, b - t) + 'px';
    if (mob) { card.style.left = card.style.top = ''; return; }
    // the card beside the highlight: right, left, below, above, else the bottom corner
    var cw = cr.width, ch = cr.height, gap = 16, x, y;
    if (r + gap + cw < vw - 8) { x = r + gap; y = t; }
    else if (l - gap - cw > 8) { x = l - gap - cw; y = t; }
    else if (b + gap + ch < vh - 8) { x = l; y = b + gap; }
    else if (t - gap - ch > 8) { x = l; y = t - gap - ch; }
    else { x = vw - cw - 16; y = vh - ch - 16; }
    x = Math.max(8, Math.min(x, vw - cw - 8));
    y = Math.max(8, Math.min(y, vh - ch - 8));
    card.style.left = x + 'px'; card.style.top = y + 'px';
  }

  function paintWow() {
    var s = run.steps[run.i], n = run.steps.length, last = s.end;
    var dots = '';
    for (var k = 0; k < n; k++) dots += '<i class="' + (k < run.i ? 'done' : k === run.i ? 'on' : '') + '"></i>';
    card.classList.toggle('end', !!last);
    card.classList.toggle('hero', !!s.hero);
    card.innerHTML =
      (last ? '<img class="tr-badge" src="' + WS.esc(WS.state.settings.logo || 'brand/demo-badge.svg') + '" alt="" width="52" height="52">' : '') +
      '<div class="tr-top"><span class="tr-kick">' + WS.esc(WS.state.settings.name) + '</span>' +
      '<span class="tr-n">' + (run.i + 1) + ' of ' + n + '</span>' +
      '<button type="button" class="tr-x" data-tr="skip" aria-label="Close the tour" title="Close (Esc)">&times;</button></div>' +
      '<h2 class="tr-h">' + WS.esc(s.title) + '</h2>' +
      '<p class="tr-p">' + WS.esc(s.body) + '</p>' +
      '<div class="tr-foot"><div class="tr-dots" aria-hidden="true">' + dots + '</div>' +
      '<div class="tr-btns"><button type="button" class="tr-back" data-tr="back"' + (run.i === 0 ? ' disabled' : '') + '>Back</button>' +
      '<button type="button" class="tr-next" data-tr="' + (last ? 'skip' : 'next') + '">' + (last ? 'Close' : 'Next') + '</button></div></div>';
    card.querySelectorAll('[data-tr]').forEach(function (b) {
      var a = b.getAttribute('data-tr');
      if (a === 'next') b.onclick = next;
      else if (a === 'back') b.onclick = back;
      else if (a === 'skip') b.onclick = stop;
    });
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    place();
    var nb = card.querySelector('.tr-next');
    if (nb) try { nb.focus({ preventScroll: true }); } catch (e) { }
  }

  function paint() {
    if (run.wow) { paintWow(); return; }
    var s = run.steps[run.i], n = run.steps.length, last = s.end;
    var body = typeof s.body === 'function' ? s.body() : s.body;
    card.classList.toggle('end', !!last);
    card.innerHTML =
      '<div class="tr-top"><span class="tr-n">' + (run.i + 1) + ' of ' + n + '</span>' +
      '<button type="button" class="tr-skip" data-tr="skip">' + (last ? 'Close' : 'Skip tour') + '</button></div>' +
      '<div class="tr-bar"><i style="width:' + Math.round((run.i + 1) / n * 100) + '%"></i></div>' +
      '<h2 class="tr-h">' + WS.esc(s.title) + '</h2>' +
      '<p class="tr-p">' + WS.esc(body) + '</p>' +
      (last ?
        '<div class="tr-cta"><a class="tr-book" href="' + BOOK + '" target="_blank" rel="noopener" data-tr="book">Book 20 minutes with Jack</a>' +
        '<a class="tr-wa" href="' + WA + '" target="_blank" rel="noopener" data-tr="wa">WhatsApp Jack on 07949 088642</a></div>' +
        '<div class="tr-btns"><button type="button" class="tr-back" data-tr="back">Back</button><button type="button" class="tr-next" data-tr="skip">Look round myself</button></div>' :
        '<div class="tr-btns"><button type="button" class="tr-back" data-tr="back"' + (run.i === 0 ? ' disabled' : '') + '>Back</button>' +
        '<button type="button" class="tr-next" data-tr="next">' + (run.i === n - 2 ? 'Finish' : 'Next') + '</button></div>');
    card.querySelectorAll('[data-tr]').forEach(function (b) {
      var a = b.getAttribute('data-tr');
      if (a === 'next') b.onclick = next;
      else if (a === 'back') b.onclick = back;
      else if (a === 'skip') b.onclick = stop;
    });
    // the start-up briefing skips itself on any press: keep the tour's own presses off it
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    place();
    var nb = card.querySelector('.tr-next');
    if (nb) try { nb.focus({ preventScroll: true }); } catch (e) { }
  }

  function scrollTo(el) {
    if (!el) return;
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    var room = phone() ? vh * 0.5 : vh - 40;
    if (r.top < 60 || r.bottom > room) {
      var y = window.scrollY + r.top - (phone() ? 116 : 96);
      window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
    }
  }

  function show(i, dir) {
    if (!run) return;
    run.busy = true;
    run.i = i;
    run.el = null;
    var s = run.steps[i];
    card.classList.add('busy');
    spot.classList.add('none');
    var go2 = function () {
      if (!run) return;
      if (s.skip && s.skip()) { run.busy = false; show(dir < 0 ? Math.max(0, i - 1) : i + 1, dir); return; }
      setTimeout(function () {
        if (!run) return;
        waitFor(function () { return !s.target || !!stepTarget(s); }, 3000, function () {
          if (!run) return;
          run.el = stepTarget(s);
          if (s.target && !run.el) (window.__tourMissing = window.__tourMissing || []).push(s.id);
          if (run.el && !$('.pmask')) scrollTo(run.el);
          card.classList.remove('busy');
          document.documentElement.setAttribute('data-tour-step', s.id);
          run.busy = false;
          paint();
        });
      }, s.wait || 0);
    };
    if (s.prep) s.prep(go2); else go2();
  }
  function next() {
    if (!run || run.busy) return;
    var s = run.steps[run.i];
    if (run.i >= run.steps.length - 1) { stop(); return; }
    var fwd = function () { if (s.leave) s.leave(); show(run.i + 1, 1); };
    if (s.next) { run.busy = true; card.classList.add('busy'); s.next(function () { if (run) { run.busy = false; fwd(); } }); }
    else fwd();
  }
  function back() {
    if (!run || run.busy || run.i === 0) return;
    var s = run.steps[run.i];
    if (s.leave) s.leave();
    var j = run.i - 1;
    // never go back to the sign in or the briefing once they are done
    while (j > 0 && (run.steps[j].id === 'signin' || run.steps[j].id === 'briefing')) j--;
    if (run.steps[j].id === 'signin' || run.steps[j].id === 'briefing') return;
    show(j, -1);
  }
  function stop() {
    if (!run) return;
    var s = run.steps[run.i];
    if (s && s.leave) try { s.leave(); } catch (e) { }
    if ($('#wsBoot') && O.startupContinue) O.startupContinue();
    document.documentElement.classList.remove('tr-wallview');
    unpeek();
    run = null;
    teardown();
    document.documentElement.removeAttribute('data-tour-step');
    window.__tourDone = true;
  }

  WS.tour = {
    start: function (mode) {
      if (run) stop();
      var wow = mode === 'wow';
      var ctx = { fromSignin: !!$('#wsSignin') };
      var list = wow ? WOW.slice() : STEPS.filter(function (s) { return !s.when || s.when(ctx); });
      run = { steps: list, i: 0, busy: false, wow: wow };
      window.__tourDone = false;
      window.__tourMissing = [];
      document.documentElement.classList.add('touring');
      document.documentElement.classList.toggle('tr-wow', wow);
      build();
      show(0, 1);
    },
    stop: stop,
    next: next,
    back: back,
    steps: function (mode) { return run ? run.steps.map(function (s) { return s.id; }) : (mode === 'wow' ? WOW : STEPS).map(function (s) { return s.id; }); },
    wowCopy: function () { return WOW.map(function (s) { return { id: s.id, title: s.title, body: s.body }; }); },
    active: function () { return !!run; }
  };

  /* the Tour button, in the demo controls at the top */
  var TOUR_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z"/></svg>';
  function addButton() {
    var g = document.getElementById('wsDemoBtns');
    if (!g || document.getElementById('wsTourBtn')) return !!g;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'wsTourBtn';
    b.className = 'phonebtn tourbtn';
    b.title = 'Start the guided tour';
    b.setAttribute('aria-label', 'Guided tour');
    b.innerHTML = TOUR_ICON + '<span>Tour</span>';
    b.onclick = function () { closeOverlays(); WS.tour.start(WS.tourWow ? 'wow' : ''); };
    g.insertBefore(b, g.firstChild);
    return true;
  }

  /* no visitor name: the briefing just says Good morning */
  var greet0 = WS.greetName;
  WS.greetName = function (u) {
    if (!WS.ownerFirst) { u = u === undefined ? WS.me() : u; if (u && u.username === 'owner') return ''; }
    return greet0 ? greet0(u) : '';
  };

  /* hook into the office start: the tour starts on the sign in if they asked for it */
  var boot0 = O.boot;
  O.boot = function () {
    boot0();
    var tries = 0;
    var t = setInterval(function () { if (addButton() || ++tries > 200) clearInterval(t); }, 100);
    if (WS.tourWow) {
      setTimeout(function () { WS.tour.start('wow'); }, 700);
    } else if (WS.tourWanted) {
      WS.tourWanted = false;
      setTimeout(function () { WS.tour.start(); }, $('#wsSignin') ? 500 : 900);
    }
  };
})();
