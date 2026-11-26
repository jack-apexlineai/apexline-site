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
  /* ---------------- the office and fitter app story (highlights tour) ----------------
     Jack does each click on camera: drag a job onto a fitter, the fitter signs in and starts it,
     the office shows it, the fitter marks it waiting on parts and starts his next job, the office
     shows that. Both sides share this browser's storage, so the state really flows. Each card
     says what to click and lights up the exact control. Next still works if a click is skipped:
     the step's action is then done for him, so the story always holds together. */
  function fresh() { if (WS._pull) try { WS._pull(); } catch (e) { } return WS.state; }
  function union(els) {
    var box = null;
    els.forEach(function (el) {
      if (!visible(el)) return;
      var q = el.getBoundingClientRect();
      if (!box) box = { l: q.left, t: q.top, r: q.right, b: q.bottom };
      else { box.l = Math.min(box.l, q.left); box.t = Math.min(box.t, q.top); box.r = Math.max(box.r, q.right); box.b = Math.max(box.b, q.bottom); }
    });
    return box;
  }
  var story = {
    job: null, fitter: null, nextJob: null, pool: [],
    pick: function () {
      var st = fresh(), d = WS.day(0);
      var pool = st.jobs.filter(function (j) { return j.date === d && !j.fitterId && j.status !== 'done' && j.vehicleId; });
      story.pool = pool.map(function (j) { return j.id; });
      if (!story.job || !WS.job(story.job) || WS.job(story.job).fitterId) {
        var pref = pool.filter(function (j) { return j.type === 'Repair' || j.type === 'Defect'; })[0] || pool[0];
        story.job = pref ? pref.id : null;
      }
      var fs = st.settings.fitters || [];
      var busy = function (f) { return st.jobs.some(function (j) { return (j.clockOns || []).some(function (c) { return c.fitterId === f.id && !c.end; }); }); };
      var free = fs.filter(function (f) { return !busy(f) && WS.dayPlan(f.id, d).some(function (j) { return j.status !== 'done'; }); });
      story.fitter = (free[0] || fs[0] || {}).id;
    },
    f: function () { return WS.fitter(story.fitter) || {}; },
    fname: function () { return story.f().name || 'a fitter'; },
    reg: function (id) { var j = WS.job(id), v = j && WS.vehicle(j.vehicleId); return v ? v.reg : 'a job'; },
    /* the job he moves on to: the first on his day that is not done and not the story job */
    next: function () {
      var st = fresh(), list = WS.dayPlan(story.fitter, WS.day(0)).filter(function (j) { return j.id !== story.job && j.status !== 'done' && j.status !== 'qc' && j.status !== 'waiting_parts'; });
      if (!story.nextJob || !list.some(function (j) { return j.id === story.nextJob; })) story.nextJob = list[0] ? list[0].id : null;
      void st;
      return story.nextJob;
    },
    /* Jack may drag any waiting job onto any fitter: follow whichever he picked */
    assigned: function () {
      var st = fresh();
      var moved = st.jobs.filter(function (j) { return story.pool.indexOf(j.id) >= 0 && j.fitterId; });
      if (!moved.length) return false;
      var mine = moved.filter(function (j) { return j.id === story.job; })[0] || moved[0];
      story.job = mine.id; story.fitter = mine.fitterId; story.nextJob = null;
      return true;
    },
    open: function (fid) {
      var st = fresh(), out = null;
      st.jobs.forEach(function (j) { (j.clockOns || []).forEach(function (c) { if (c.fitterId === (fid || story.fitter) && !c.end) out = j.id; }); });
      return out;
    },
    started: function () { return story.open() === story.job; },
    parted: function () { var j = (fresh(), WS.job(story.job)); var o = story.open(); return !!j && j.status === 'waiting_parts' && !!o && o !== story.job; },
    assign: function () {
      fresh();
      var j = WS.job(story.job);
      if (!j || j.fitterId) return;
      var d = WS.day(0);
      j.order = WS.dayPlan(story.fitter, d).length;
      j.fitterId = story.fitter;
      if (!j.bay && j.type !== 'Roadside callout' && j.type !== 'Collection / delivery') {
        var taken = WS.jobsOn(d).filter(function (x) { return x.bay && x.id !== j.id && x.status !== 'done'; }).map(function (x) { return x.bay; });
        j.bay = WS.state.settings.bays.filter(function (b) { return taken.indexOf(b) < 0; })[0] || '';
      }
      WS.audit(j, 'Office', 'Planned to ' + story.fname() + ' for today');
      WS.save();
    },
    clock: function (jobId) {
      var me = story.f(), now = WS.nowStamp();
      WS.state.jobs.forEach(function (x) { (x.clockOns || []).forEach(function (c) { if (c.fitterId === me.id && !c.end) c.end = now; }); });
      var j = WS.job(jobId);
      if (!j) return;
      j.clockOns = j.clockOns || [];
      j.clockOns.push({ fitterId: me.id, start: now, end: '' });
      if (j.status === 'booked' || j.status === 'in_bay') j.status = 'in_progress';
      WS.audit(j, me.name, 'Clocked on');
    },
    start: function () {
      fresh(); story.assign(); fresh();
      if (!story.started()) { story.clock(story.job); WS.save(); }
      try { localStorage.setItem('wsTour:fitter', story.fitter); } catch (e) { }
    },
    parts: function () {
      fresh();
      if (!story.started() && !story.parted()) story.start();
      fresh();
      var j = WS.job(story.job);
      if (j && j.status !== 'waiting_parts') { j.status = 'waiting_parts'; WS.audit(j, story.fname(), 'Reported waiting on parts'); }
      var n = story.next();
      if (n && story.open() !== n) story.clock(n);
      WS.save();
    },
    liveCol: function () {
      var nm = story.fname();
      return [].slice.call(document.querySelectorAll('#view .lcol')).filter(function (c) { return c.textContent.indexOf(nm) >= 0; })[0] || $('#view .lcol');
    }
  };

  /* the fitter app: in the phone on a laptop, in a panel above the card on a phone */
  function fitterFrame() { return $('.pmask iframe.pifr') || $('.tr-peek iframe'); }
  function noVoice(ifr) {
    // the voice job card is a preview, not part of the highlights
    var put = function () {
      try {
        var d = ifr.contentDocument;
        if (d && d.head && !d.getElementById('trNoVoice')) {
          var st = d.createElement('style');
          st.id = 'trNoVoice';
          st.textContent = '.vcard,.mic{display:none!important}';
          d.head.appendChild(st);
        }
      } catch (e) { }
    };
    put();
    ifr.addEventListener('load', put);
  }
  function openFitter(done) {
    closeOverlays();
    go('live');
    if (!phone() && O.openPhone) O.openPhone(); else peek('fitter.html?dock=1', 'Fitter app');
    var ifr = fitterFrame();
    if (ifr) noVoice(ifr);
    hideVoiceTip();
    waitFor(function () { var f = fitterFrame(); try { return f && f.contentWindow.WS && f.contentDocument.querySelector('#app, body').children.length; } catch (e) { return false; } }, 4000, function () { setTimeout(done, 300); });
  }
  function closeFitter() {
    unpeek();
    if ($('.pmask .pframe') && O.closePhone) O.closePhone();
    fresh();
    if (O.render) O.render();
  }
  /* a control inside the fitter app, as a box on this page (the phone may be scaled) */
  function frameRect(el) {
    var ifr = fitterFrame();
    if (!ifr) return null;
    var fr = ifr.getBoundingClientRect();
    if (!el) return { l: fr.left, t: fr.top, r: fr.right, b: fr.bottom };
    var k = fr.width / (ifr.clientWidth || fr.width), q = el.getBoundingClientRect();
    if (q.width < 1) return { l: fr.left, t: fr.top, r: fr.right, b: fr.bottom };
    return {
      l: Math.max(fr.left, fr.left + q.left * k), t: Math.max(fr.top, fr.top + q.top * k),
      r: Math.min(fr.right, fr.left + q.right * k), b: Math.min(fr.bottom, fr.top + q.bottom * k)
    };
  }
  /* what to tap next in the fitter app, read off its screen */
  var lastAct = null;
  function fitterAct(stage) {
    var ifr = fitterFrame(), d = null;
    try { d = ifr && ifr.contentDocument; } catch (e) { }
    var out = { el: null, text: '' };
    if (!d || !d.body) return out;
    var f = story.f(), first = (f.name || '').split(' ')[0];
    var q = function (sel) { return d.querySelector(sel); };
    var regOf = function (id) { return story.reg(id); };
    var cur = (function () { var r = q('#jBack') ? d.querySelector('.card .rg') : null; return r ? r.textContent.trim() : ''; })();
    var sr = regOf(story.job);
    if (q('.mask #shOk')) out = { el: q('.mask .modal'), text: 'Type which part, then tap Send to the office' };
    else if (q('[data-pick]')) out = { el: q('[data-pick="' + story.fitter + '"]'), text: 'Tap ' + f.name };
    else if (q('.pinpad')) out = { el: q('.pinpad'), text: 'Put in ' + first + '\'s PIN, ' + (f.pin || '') };
    else if (stage === 'start') {
      if (story.started()) out = { el: q('.bigtimer') || null, text: 'Started. Press Next' };
      else if (cur && cur === sr && q('#jOn')) out = { el: q('#jOn'), text: 'Tap ' + q('#jOn').textContent.trim() };
      else if (cur) out = { el: q('#jBack'), text: 'Tap My jobs' };
      else out = { el: q('.fjob[data-job="' + story.job + '"]'), text: 'Open ' + sr + ', the job the office just gave ' + first };
    } else {
      var j = WS.job(story.job), waiting = j && (fresh(), WS.job(story.job)).status === 'waiting_parts';
      var nx = story.next(), nr = regOf(nx);
      if (story.parted()) out = { el: q('.bigtimer') || null, text: 'Next job going. Press Next' };
      else if (cur && cur === sr) out = waiting ? { el: q('#jBack'), text: 'Tap My jobs' } : { el: q('[data-prob="waiting_parts"]'), text: 'Tap Waiting on parts' };
      else if (cur && cur === nr && q('#jOn')) out = { el: q('#jOn'), text: 'Tap ' + q('#jOn').textContent.trim() };
      else if (cur) out = { el: q('#jBack'), text: 'Tap My jobs' };
      else out = waiting ? { el: q('.fjob[data-job="' + nx + '"]'), text: 'Open ' + nr + ', his next job' } : { el: q('.fjob[data-job="' + story.job + '"]'), text: 'Open ' + sr };
    }
    // bring the control into view inside the phone, once each time it changes
    if (out.el && out.el !== lastAct) {
      lastAct = out.el;
      try { out.el.scrollIntoView({ block: 'center', behavior: RMQ.matches ? 'auto' : 'smooth' }); } catch (e) { }
    }
    return out;
  }
  var RMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var WOW = [
    {
      id: 'wall',
      // every bay in one view
      prep: function (done) { document.documentElement.classList.add('tr-wallview'); go('board'); setTimeout(done, 250); },
      leave: function () { document.documentElement.classList.remove('tr-wallview'); },
      title: 'Your workshop, bay by bay',
      body: 'Every bay, what\'s in and what\'s booked in today, all on one screen.',
      target: ['#view .board']
    },
    {
      id: 'live', hero: true, prep: function (done) { go('live'); setTimeout(done, 200); },
      title: 'Live jobs, on the wall',
      body: 'Every fitter, their job and the clock. Running over shows red. Put it on the workshop TV.',
      target: ['#view .lcol', '#view .grid.g4'], area: '#view .lcol', all: true
    },
    {
      id: 'assign',
      prep: function (done) { story.pick(); go('planner'); setTimeout(done, 250); },
      title: 'The office assigns the work',
      // a phone has no room to drag across, so there it is tap the job and pick the fitter
      body: function () { return phone() ? 'Tap a job and pick a fitter. That\'s their work assigned.' : 'Drag a job onto a fitter. That\'s their work assigned.'; },
      act: function () {
        if (!phone()) return 'Drag ' + story.reg(story.job) + ' onto ' + story.fname();
        return $('#jFit') ? 'Pick ' + story.fname() + ' as the fitter' : 'Tap ' + story.reg(story.job) + ', then pick ' + story.fname();
      },
      target: [function () { return $('#view .pjob[data-job="' + story.job + '"]') || $('#poolCard'); }],
      rect: function () {
        if (phone()) { var sel = $('#jFit'); return union([sel || $('#view .pjob[data-job="' + story.job + '"]')]); }
        var a = $('#view .pjob[data-job="' + story.job + '"]'), c = $('#view .fcol[data-fitter="' + story.fitter + '"]');
        return union([a, c]);
      },
      ready: function () { return story.assigned(); },
      fallback: function () { story.assign(); }
    },
    {
      id: 'fstart',
      prep: function (done) {
        try { localStorage.removeItem('wsTour:fitter'); } catch (e) { }   // the fitter signs in himself
        openFitter(function () { done(); });
      },
      title: 'Their own app, own login',
      body: 'Every fitter has the app on their own phone, with their own login.',
      target: ['.pmask .psizer', '.tr-peek'],
      phoneCard: true,
      act: function () { return fitterAct('start').text; },
      rect: function () { return frameRect(fitterAct('start').el); },
      ready: function () { return story.started(); },
      fallback: function () { story.start(); },
      leave: function () { closeFitter(); }
    },
    {
      id: 'office1',
      prep: function (done) { go('live'); setTimeout(done, 300); },
      title: 'Already showing in the office',
      body: 'Back in the office, it\'s already showing as started.',
      target: [function () { return story.liveCol(); }]
    },
    {
      id: 'fparts',
      prep: function (done) { openFitter(function () { done(); }); },
      title: 'Waiting on parts, next job',
      body: 'The fitter marks it waiting on parts, then starts his next job.',
      target: ['.pmask .psizer', '.tr-peek'],
      phoneCard: true,
      act: function () { return fitterAct('parts').text; },
      rect: function () { return frameRect(fitterAct('parts').el); },
      ready: function () { return story.parted(); },
      fallback: function () { story.parts(); },
      leave: function () { closeFitter(); }
    },
    {
      id: 'office2',
      prep: function (done) { go('live'); setTimeout(done, 300); },
      title: 'Paused for parts, next job going',
      body: 'The office saw it all without a phone call.',
      target: [function () { return story.liveCol(); }]
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
    if (s.rect) { var rb = null; try { rb = s.rect(); } catch (e) { } if (rb) return rb; }
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
    if (run.wow) liveBits(s);
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
    spot.classList.toggle('soft', !!s.phoneCard);
    card.classList.remove('center');
    // on a phone the card is a sheet: along the bottom, or along the top when the target sits low (fixed pop ups)
    var atTop = mob && !s.phoneCard && box.t > vh * 0.45;
    var pk = $('.tr-peek');
    if (pk && mob) pk.style.bottom = Math.round(cr.height + 18) + 'px';
    if (mob && card.classList.contains('attop') !== atTop) { card.classList.toggle('attop', atTop); cr = card.getBoundingClientRect(); }
    var maxB = mob && !atTop ? vh - cr.height - 10 : vh - 8, minT = atTop ? cr.bottom + 8 : 4;
    var l = Math.max(4, box.l - pad), t = Math.max(minT, box.t - pad), r = Math.min(vw - 4, box.r + pad), b = Math.min(maxB, box.b + pad);
    if (b - t < 24) { b = Math.min(maxB, t + 24); }
    spot.style.left = l + 'px'; spot.style.top = t + 'px';
    spot.style.width = Math.max(0, r - l) + 'px'; spot.style.height = Math.max(0, b - t) + 'px';
    if (mob) { card.style.left = card.style.top = ''; return; }
    // story steps in the phone: the card sits beside the whole phone, not the button
    if (s.phoneCard && run.el && run.el.isConnected) {
      var pr = run.el.getBoundingClientRect();
      l = pr.left; t = Math.max(8, pr.top); r = pr.right; b = pr.bottom;
    }
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

  /* the live line on a story card: what to click now, and a tick once it is done */
  function liveBits(s) {
    if (!s.act && !s.ready) return;
    var ok = false;
    try { ok = !!(s.ready && s.ready()); } catch (e) { }
    card.classList.toggle('ready', ok);
    var d = card.querySelector('.tr-do span');
    if (d && s.act) {
      var t = '';
      try { t = ok ? 'Done. Press Next' : s.act(); } catch (e) { }
      if (t && d.textContent !== t) d.textContent = t;
    }
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
      '<p class="tr-p">' + WS.esc(typeof s.body === 'function' ? s.body() : s.body) + '</p>' +
      (s.act ? '<div class="tr-do" aria-live="polite"><i aria-hidden="true"></i><span></span></div>' : '') +
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
    lastAct = null;
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
    // a story click that was skipped is done for him, so the next screens still make sense
    if (s.fallback && s.ready) { var ok = false; try { ok = s.ready(); } catch (e) { } if (!ok) try { s.fallback(); } catch (e) { } }
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
      if (wow) { story.job = story.fitter = story.nextJob = null; story.pool = []; }
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
    wowCopy: function () { return WOW.map(function (s) { return { id: s.id, title: s.title, body: typeof s.body === 'function' ? s.body() : s.body }; }); },
    story: function () { return { job: story.job, fitter: story.fitter, nextJob: story.nextJob, reg: story.reg(story.job), nextReg: story.reg(story.nextJob) }; },
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

  /* highlights mode: Start tour in the wheel menu. On a laptop it sits in the wheel's foot next
     to Full menu, on a phone it is the first tile in the sheet. */
  function wowStart() { if (O.closeWheel) O.closeWheel(true); setTimeout(function () { WS.tour.start('wow'); }, 60); }
  var openWheel0 = O.openWheel;
  if (openWheel0) O.openWheel = function () {
    var r = openWheel0.apply(this, arguments);
    if (!WS.tourWow) return r;
    var foot = document.querySelector('#wMenu .wm-foot');
    if (foot && !document.getElementById('wmTour')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'wmTour';
      b.className = 'wm-all wm-tour';
      b.innerHTML = TOUR_ICON + '<span>Start tour</span>';
      b.onclick = function (e) { e.stopPropagation(); wowStart(); };
      foot.insertBefore(b, foot.firstChild);
    }
    var grid = document.querySelector('#wSheet .ws-grid');
    if (grid && !document.getElementById('wsTourTile')) {
      var t = document.createElement('button');
      t.type = 'button';
      t.id = 'wsTourTile';
      t.className = 'ws-tile ws-tour';
      t.innerHTML = '<span class="wt-ic">' + TOUR_ICON.replace('width="15" height="15"', 'width="20" height="20"') + '</span><span class="wt-l">Start tour</span>';
      t.onclick = function (e) { e.stopPropagation(); wowStart(); };
      grid.insertBefore(t, grid.firstChild);
    }
    return r;
  };

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
    if (WS.tourWanted && !WS.tourWow) {
      WS.tourWanted = false;
      setTimeout(function () { WS.tour.start(); }, $('#wsSignin') ? 500 : 900);
    }
  };
})();
