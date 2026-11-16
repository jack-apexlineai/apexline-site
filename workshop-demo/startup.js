/* Office sign-in and the start-up briefing.
   1. Sign in. After the demo PIN gate the office asks who you are: username and a 4 digit PIN
      (George g.noble and the shared office account are 1234 in the demo). Kept for the browser session in
      sessionStorage. Sign out in the top bar comes back here.
   2. The start-up briefing. On sign in, and from Settings > Appearance, the workshop's logo
      resolves on a dark screen, the greeting comes up by UK time, then the day builds line by
      line from the live data. About 7 seconds. Any click or key skips it, reduced motion skips it.
      In Wheel menu style (the default) it hands over to the wheel nuts flying into the menu.
      It is silent: there is no spoken briefing. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var WHO = 'wsDemo:who';
  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  WS.SIGNIN_PIN = '1234';

  /* ---------------- time of day, UK ---------------- */
  WS.ukHour = function (d) {
    d = d || new Date();
    try {
      var h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/London' }).format(d);
      if (h >= 0 && h < 24) return h;
    } catch (e) { }
    return d.getHours();
  };
  WS.partOfDay = function (h) {
    if (h == null) h = WS.ukHour();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  };
  WS.greeting = function (first, h) { return 'Good ' + WS.partOfDay(h) + (first ? ', ' + first : ''); };

  /* ---------------- who is signed in ---------------- */
  function allUsers() { return (WS.state && WS.state.users) || []; }
  function findUser(un) {
    un = String(un || '').trim().toLowerCase();
    return allUsers().filter(function (u) { return u.username === un && u.status !== 'removed'; })[0] || null;
  }
  function officeUser(u) { return u && u.role !== 'Fitter' && u.role !== 'Driver'; }
  function initialsOf(u) { return u ? ((u.first || '').charAt(0) + (u.last || '').charAt(0)).toUpperCase() : ''; }
  WS.me = function () { return findUser(WS.ME); };
  /* the name to greet: a shared account (Office) gets no name */
  WS.greetName = function (u) { u = u === undefined ? WS.me() : u; return u && !u.shared ? u.first : ''; };
  function remembered() { try { return sessionStorage.getItem(WHO); } catch (e) { return null; } }
  function remember(un) { try { sessionStorage.setItem(WHO, un); } catch (e) { } }

  /* ---------------- sign in ---------------- */
  O.signIn = function (done) {
    var u = findUser(remembered());
    if (u && u.status === 'active' && officeUser(u)) { WS.ME = u.username; done(false); return; }
    try { sessionStorage.removeItem(WHO); } catch (e) { }

    var S = WS.state.settings;
    var quick = allUsers().filter(function (x) { return x.status === 'active' && officeUser(x); }).slice(0, 3);
    var start = findUser('g.noble') && findUser('g.noble').status === 'active' ? 'g.noble' : (quick[0] ? quick[0].username : '');
    var wrap = WS.el('div', 'signin');
    wrap.id = 'wsSignin';
    wrap.innerHTML =
      '<div class="si-glow" aria-hidden="true"></div>' +
      '<form class="si-card" id="siForm" autocomplete="off" novalidate>' +
      '<div class="si-logo">' + WS.logoHtml('si-img') + '</div>' +
      '<div class="si-cap">Workshop system</div>' +
      '<h1 class="si-h">Sign in</h1>' +
      (quick.length > 1 ? '<div class="si-quick" role="group" aria-label="Who is signing in">' + quick.map(function (x) {
        return '<button type="button" data-si="' + esc(x.username) + '"><i>' + esc(initialsOf(x)) + '</i><span><b>' + esc(x.first) + '</b><em>' + esc(x.title || x.role) + '</em></span></button>';
      }).join('') + '</div>' : '') +
      '<label class="f"><span class="lb">Username</span><input class="in mono" id="siUser" value="' + esc(start) + '" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username"></label>' +
      '<label class="f" id="siPinF"><span class="lb" id="siPinL">PIN</span>' +
      '<span class="si-pin"><input id="siPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-labelledby="siPinL">' +
      '<span class="si-cells" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span></label>' +
      '<div class="si-err" id="siErr" role="alert"></div>' +
      '<button class="btn block lg" id="siGo" type="submit">Sign in</button>' +
      '<div class="si-hint" id="siHint">Demo PIN <b class="mono">' + WS.SIGNIN_PIN + '</b></div>' +
      '</form>' +
      '<div class="si-foot">' + esc(O.shortName ? O.shortName(S.name) : S.name) + ' · sample data</div>';
    document.body.appendChild(wrap);

    var form = $('siForm'), user = $('siUser'), pin = $('siPin'), err = $('siErr'), cells = wrap.querySelectorAll('.si-cells i');
    var tries = 0, busy = false;
    function method() { var u2 = findUser(user.value); return u2 && u2.signIn === 'password' ? 'password' : 'pin'; }
    function paintUser() {
      var un = user.value.trim().toLowerCase(), u2 = findUser(un), m = method();
      wrap.querySelectorAll('[data-si]').forEach(function (b) { b.classList.toggle('on', b.dataset.si === un); b.setAttribute('aria-pressed', String(b.dataset.si === un)); });
      $('siPinL').textContent = m === 'password' ? 'Password' : 'PIN';
      wrap.querySelector('.si-pin').classList.toggle('pw', m === 'password');
      pin.maxLength = m === 'password' ? 64 : 4;
      pin.setAttribute('inputmode', m === 'password' ? 'text' : 'numeric');
      $('siHint').hidden = !(u2 && m === 'pin' && u2.pin === WS.SIGNIN_PIN);
    }
    function paintCells() {
      var n = pin.value.length;
      cells.forEach(function (c, i) { c.classList.toggle('on', i < n); c.classList.toggle('cur', i === n); });
    }
    function fail(msg) {
      tries++;
      err.textContent = msg;
      pin.value = '';
      paintCells();
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      pin.focus();
    }
    form.addEventListener('animationend', function () { form.classList.remove('shake'); });
    function attempt() {
      if (busy) return;
      var un = user.value.trim().toLowerCase(), u2 = findUser(un), v = pin.value;
      if (!un) { fail('Put in your username.'); user.focus(); return; }
      if (!u2) { fail('Nobody is set up as ' + un + '.'); return; }
      if (u2.status === 'suspended') { fail('That account is suspended. Ask the owner.'); return; }
      if (!officeUser(u2)) { fail('Fitters and drivers sign in on their phone app.'); return; }
      var good = u2.signIn === 'password' ? (v && v === u2.secret) : (v && v === String(u2.pin || ''));
      if (!good) {
        fail(u2.signIn === 'password' ? 'That password is not right.' : tries ? 'Still not right. The demo PIN is ' + WS.SIGNIN_PIN + '.' : 'That PIN is not right.');
        return;
      }
      busy = true;
      remember(u2.username);
      WS.ME = u2.username;
      err.textContent = '';
      wrap.classList.add('ok');
      var go = function () { wrap.remove(); done(true); };
      if (RM.matches || !wrap.animate) go();
      else setTimeout(go, 260);
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); attempt(); });
    pin.addEventListener('input', function () {
      if (method() === 'pin') pin.value = pin.value.replace(/\D/g, '').slice(0, 4);
      err.textContent = '';
      paintCells();
      if (method() === 'pin' && pin.value.length === 4) attempt();
    });
    pin.addEventListener('focus', paintCells);
    pin.addEventListener('blur', function () { cells.forEach(function (c) { c.classList.remove('cur'); }); });
    user.addEventListener('input', function () { err.textContent = ''; paintUser(); });
    wrap.querySelectorAll('[data-si]').forEach(function (b) {
      b.onclick = function () { user.value = b.dataset.si; pin.value = ''; err.textContent = ''; paintUser(); paintCells(); pin.focus(); };
    });
    paintUser();
    paintCells();
    setTimeout(function () { (user.value ? pin : user).focus(); }, 60);
  };

  O.signOut = function () {
    try { sessionStorage.removeItem(WHO); } catch (e) { }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
    location.reload();
  };

  /* the top bar: who is signed in, and Sign out */
  O.paintWho = function () {
    var u = WS.me(), el = $('wsWho');
    if (!el) return;
    el.innerHTML = u ? '<i class="av">' + esc(initialsOf(u)) + '</i><span class="nm">' + esc(u.first + ' ' + u.last) + '</span>' : '';
    el.title = u ? u.first + ' ' + u.last + ' (' + u.username + '), ' + (u.title || u.role) : '';
  };
  O.whoBarHtml = function () {
    return '<span class="who" id="wsWho"></span><button id="wsOut" type="button" class="outbtn" aria-label="Sign out">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg><span>Sign out</span></button>';
  };
  O.wireWho = function () {
    // who is signed in sits at the far end of the bar, after Reset demo
    var sp = document.querySelector('.dbar .sp'), w = $('wsWho'), o = $('wsOut');
    if (sp && w && o) { var sep = WS.el('span', 'whosep'); sp.appendChild(sep); sp.appendChild(w); sp.appendChild(o); }
    O.paintWho();
    var b = $('wsOut');
    if (b) b.onclick = O.signOut;
  };

  /* ---------------- the briefing, from the live data ---------------- */
  O.briefData = function () {
    var st = WS.state, T = WS.day(0);
    var today = WS.jobsOn(T);
    var clocked = st.settings.fitters.filter(function (f) {
      return WS.dayPlan(f.id, T).some(function (j) { return (j.clockOns || []).some(function (c) { return !c.end; }); });
    }).length;
    var vor = st.vehicles.filter(function (v) { return v.vor; }).length;
    var overdue = WS.dueItems(-1).length;
    var sent = st.approvals.filter(function (a) { return a.status === 'Sent'; });
    var ops = {};
    sent.forEach(function (a) { ops[a.operatorId || a.id] = 1; });
    var ready = st.jobs.filter(function (j) { return j.status === 'done' && !j.invoiceId; });
    var money = Math.round(ready.reduce(function (s, j) { return s + (WS.quoteJob(j).net || 0); }, 0));
    var defects = st.checks.filter(function (c) { return c.date === T && c.defects && c.defects.length; }).length;
    return {
      jobs: today.length, clocked: clocked, vor: vor, overdue: overdue,
      customers: Object.keys(ops).length, approvals: sent.length,
      readyJobs: ready.length, money: money, defects: defects
    };
  };
  function pl(n, one, many) { return n === 1 ? one : many; }
  /* each line: parts of text and numbers, and a status */
  O.briefLines = function (d) {
    d = d || O.briefData();
    var L = [];
    L.push({
      k: 'jobs', s: d.jobs ? 'go' : 'ok',
      parts: [{ n: d.jobs }, ' ' + pl(d.jobs, 'job', 'jobs') + ' on today. ', d.clocked ? { n: d.clocked } : 'Nobody', ' ' + (d.clocked ? pl(d.clocked, 'fitter', 'fitters') + ' clocked on.' : 'clocked on yet.')]
    });
    L.push(d.vor
      ? { k: 'vor', s: 'bad', parts: [{ n: d.vor }, ' ' + pl(d.vor, 'vehicle', 'vehicles') + ' off the road.'] }
      : { k: 'vor', s: 'ok', parts: ['Every vehicle is on the road.'] });
    L.push(d.overdue
      ? { k: 'overdue', s: 'bad', parts: [{ n: d.overdue }, ' compliance ' + pl(d.overdue, 'item', 'items') + ' overdue.'] }
      : { k: 'overdue', s: 'ok', parts: ['Compliance is all in date.'] });
    L.push(d.customers
      ? { k: 'customers', s: 'warn', parts: [{ n: d.customers }, ' ' + pl(d.customers, 'customer', 'customers') + ' waiting to authorise extra work.'] }
      : { k: 'customers', s: 'ok', parts: ['No customers waiting to authorise work.'] });
    L.push(d.money
      ? { k: 'money', s: 'ok', parts: [{ n: d.money, money: true }, ' ready to invoice across ', { n: d.readyJobs }, ' ' + pl(d.readyJobs, 'job.', 'jobs.')] }
      : { k: 'money', s: 'ok', parts: ['Everything finished is invoiced.'] });
    L.push(d.defects
      ? { k: 'defects', s: 'warn', parts: [{ n: d.defects }, ' driver defect ' + pl(d.defects, 'report', 'reports') + ' in today.'] }
      : { k: 'defects', s: 'ok', parts: ['No driver defects reported today.'] });
    return L;
  };
  function lineHtml(x, i) {
    var tx = x.parts.map(function (p) {
      if (typeof p === 'string') return esc(p);
      return '<b class="bt-n" data-n="' + p.n + '"' + (p.money ? ' data-money="1"' : '') + '>' + (p.money ? WS.money0(0) : '0') + '</b>';
    }).join('');
    return '<li class="bt-line" data-k="' + x.k + '" data-s="' + x.s + '"><span class="bt-ix">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
      '<span class="bt-tx">' + tx + '</span><i class="bt-dot" aria-hidden="true"></i></li>';
  }
  function plain(x) {
    return x.parts.map(function (p) { return typeof p === 'string' ? p : p.money ? WS.money0(p.n) : String(p.n); }).join('').trim();
  }

  /* ---------------- the start-up ---------------- */
  O.startupState = 'none';
  /* opts.boot: straight after sign in. Returns false when it did not play. */
  O.playStartup = function (opts) {
    opts = opts || {};
    if (document.getElementById('wsBoot')) return false;
    var u = WS.me(), first = WS.greetName(u);
    if (RM.matches) {
      O.startupState = 'skipped';
      if (opts.boot) WS.toast(WS.greeting(first) + '.', 'ok');
      return false;
    }
    if (!document.body.animate) { O.startupState = 'skipped'; return false; }
    if (O.closeModal) O.closeModal();

    var S = WS.state.settings, lines = O.briefLines(), anims = [], timers = [], over = false;
    var hello = WS.greeting(first) + '.';
    var wheelMode = WS.look('menuStyle') === 'wheel' && !!O.playIntro;
    var now = new Date();
    var dateTx = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }) + ' · ' +
      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    var logo = S.logo
      ? '<div class="bt-mark" role="img" aria-label="' + esc(S.name) + '" style="-webkit-mask-image:url(\'' + esc(S.logo) + '\');mask-image:url(\'' + esc(S.logo) + '\')"></div>'
      : '<div class="bt-word">' + esc(String(O.shortName ? O.shortName(S.name) : S.name).toUpperCase()) + '</div>';
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;

    var ov = document.createElement('div');
    ov.id = 'wsBoot';
    ov.className = 'boot';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Start-up briefing');
    ov.innerHTML =
      '<div class="bt-bg" aria-hidden="true"></div>' +
      '<div class="bt-frame" aria-hidden="true"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>' +
      '<div class="bt-meta bt-ml" aria-hidden="true"><span class="bt-live"></span>' + esc(S.initials || '') + ' Workshop</div>' +
      '<div class="bt-meta bt-mr" aria-hidden="true">' + esc(dateTx) + '</div>' +
      '<div class="bt-stage">' +
      '<div class="bt-logo">' + logo + '<i class="bt-scan" aria-hidden="true"></i></div>' +
      '<div class="bt-rule" aria-hidden="true"></div>' +
      '<h1 class="bt-hello" aria-live="polite">' + hello.split(' ').map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(' ') + '</h1>' +
      '<ol class="bt-lines" aria-live="polite">' + lines.map(lineHtml).join('') + '</ol>' +
      '</div>' +
      '<div class="bt-foot">' +
      '<span class="bt-skip">' + (touch ? 'Tap' : 'Click') + ' anywhere or press any key to skip</span></div>' +
      '<div class="bt-prog" aria-hidden="true"><i></i></div>';
    document.body.appendChild(ov);
    document.documentElement.classList.add('boot-on');
    O.startupState = 'playing';
    O.startupLines = lines.map(plain);

    function A(el, kf, o) { if (!el) return null; var a = el.animate(kf, o); anims.push(a); return a; }
    function T(fn, ms) { timers.push(setTimeout(fn, ms)); }
    var q = function (s) { return ov.querySelector(s); };
    var stage = q('.bt-stage'), logoEl = q('.bt-logo'), mark = q('.bt-mark, .bt-word'), scan = q('.bt-scan');
    // the logo box takes the logo's own shape, so the scan line crosses the letters
    if (q('.bt-mark')) {
      var im = new Image(), setAr = function () { if (im.naturalWidth && im.naturalHeight) q('.bt-mark').style.setProperty('--ar', (im.naturalWidth / im.naturalHeight).toFixed(3)); };
      im.onload = setAr;
      im.src = S.logo;
      setAr();
    }
    var EASE = 'cubic-bezier(.2,.7,.2,1)';

    /* the frame and the meta lines */
    ov.querySelectorAll('.bt-frame i').forEach(function (c, i) {
      A(c, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: 120 + i * 60, duration: 700, easing: EASE, fill: 'both' });
    });
    ov.querySelectorAll('.bt-meta, .bt-foot').forEach(function (m) {
      A(m, [{ opacity: 0 }, { opacity: 1 }], { delay: 420, duration: 600, fill: 'both' });
    });

    /* 1. the logo resolves in the middle of the screen, then rises into place */
    var lr = logoEl.getBoundingClientRect();
    var dy = Math.round(window.innerHeight / 2 - (lr.top + lr.height / 2));
    var k0 = Math.max(1, Math.min(1.18, (window.innerWidth * 0.9) / (lr.width || 1))).toFixed(3);
    A(logoEl, [{ transform: 'translateY(' + dy + 'px) scale(' + k0 + ')' }, { transform: 'translateY(' + dy + 'px) scale(' + k0 + ')', offset: 0.62 }, { transform: 'none' }],
      { duration: 2050, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'both' });
    A(mark, [
      { opacity: 0, clipPath: 'inset(0 100% 0 0)', filter: 'blur(6px)' },
      { opacity: 1, clipPath: 'inset(0 0% 0 0)', filter: 'blur(0px)', offset: 0.78 },
      { opacity: 1, clipPath: 'inset(0 0% 0 0)', filter: 'blur(0px)' }
    ], { delay: 200, duration: 1150, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'both' });
    A(scan, [{ left: '0%', opacity: 0 }, { opacity: 1, offset: 0.12 }, { left: '100%', opacity: 1, offset: 0.78 }, { left: '100%', opacity: 0 }],
      { delay: 200, duration: 1150, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'both' });
    if (q('.bt-mark')) A(q('.bt-mark'), [{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { delay: 1150, duration: 1100, easing: 'ease-in-out', fill: 'both' });
    A(logoEl, [{ filter: 'drop-shadow(0 0 0 transparent)' }, { filter: 'drop-shadow(0 0 18px var(--brand-glow))', offset: 0.4 }, { filter: 'drop-shadow(0 0 6px var(--brand-glow))' }],
      { delay: 1150, duration: 1100, easing: 'ease-out', fill: 'both' });

    /* 2. a thin line, then the greeting */
    A(q('.bt-rule'), [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { delay: 1750, duration: 700, easing: EASE, fill: 'both' });
    ov.querySelectorAll('.bt-hello span').forEach(function (w, i) {
      A(w, [{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }],
        { delay: 1950 + i * 110, duration: 650, easing: EASE, fill: 'both' });
    });

    /* 3. the day, a line at a time, each number counting up */
    var L0 = 2850, STEP = 480;
    ov.querySelectorAll('.bt-line').forEach(function (li, i) {
      var d0 = L0 + i * STEP;
      A(li, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: d0, duration: 480, easing: EASE, fill: 'both' });
      A(li.querySelector('.bt-dot'), [{ transform: 'scale(0)' }, { transform: 'scale(1.6)', offset: 0.6 }, { transform: 'scale(1)' }], { delay: d0 + 260, duration: 420, easing: EASE, fill: 'both' });
      li.querySelectorAll('.bt-n').forEach(function (n) { T(function () { count(n, 750); }, d0 + 80); });
    });
    var LAST = L0 + (lines.length - 1) * STEP + 480;
    var END = LAST + 1100;
    A(q('.bt-prog i'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: END, easing: 'linear', fill: 'both' });

    function count(n, ms) {
      var to = +n.dataset.n || 0, money = !!n.dataset.money, t0 = performance.now();
      function fmt(v) { return money ? WS.money0(v) : String(v); }
      function step(t) {
        if (over) return;
        var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        n.textContent = fmt(Math.round(to * e));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    /* 4. hand over to the office */
    T(function () { leave(false); }, END);

    function leave(skipped) {
      if (over) return;
      over = true;
      timers.forEach(clearTimeout);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.removeEventListener(ev, skip, true); });
      document.documentElement.classList.remove('boot-on');
      if (skipped) {
        anims.forEach(function (a) { try { a.finish(); } catch (e) { } });
        ov.querySelectorAll('.bt-n').forEach(function (n) { n.textContent = n.dataset.money ? WS.money0(+n.dataset.n) : n.dataset.n; });
        O.startupState = 'done';
        ov.classList.add('out');
        // the overlay stays a moment to catch the click that skipped it
        var f = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
        f.onfinish = function () { ov.remove(); };
        setTimeout(function () { ov.remove(); }, 400);
        if (wheelMode && O.skipIntro) O.skipIntro();
        markWheelSeen();
        return;
      }
      O.startupState = 'done';
      ov.classList.add('out');
      if (wheelMode) {
        markWheelSeen();
        O.playIntro({ quick: true });
      }
      var a1 = stage.animate([{ opacity: 1, transform: 'none', filter: 'blur(0px)' }, { opacity: 0, transform: 'translateY(-10px) scale(.985)', filter: 'blur(4px)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      ov.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 160, duration: 520, easing: 'ease-in-out', fill: 'forwards' }).onfinish = function () { ov.remove(); };
      setTimeout(function () { ov.remove(); }, 900);
      void a1;
    }
    function markWheelSeen() { try { sessionStorage.setItem('wsDemo:introSeen', '1'); } catch (e) { } }
    function skip(e) {
      if (over) return;
      if (e && e.type === 'keydown' && /^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(e.key)) return;
      if (e && e.type === 'keydown') { e.preventDefault(); e.stopPropagation(); }
      leave(true);
    }
    O.skipStartup = function () { leave(true); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, skip, { capture: true, passive: ev !== 'keydown' }); });
    return true;
  };

  /* ---------------- Settings > Appearance ---------------- */
  O.startupCardHtml = function () {
    return '<div class="lkrow" style="margin-top:14px" id="apStartRow"><div><div class="b">Start-up briefing</div>' +
      '<div class="muted sm">Your logo, a greeting and the day in numbers, straight from the live board. Plays when you sign in.</div></div>' +
      '<div class="sp"><button type="button" class="btn alt sm" id="apStart">Play start-up</button></div></div>';
  };
  O.wireStartupCard = function () {
    var b = $('apStart');
    if (b) b.onclick = function () {
      if (!O.playStartup()) WS.toast('Your device is set to reduce motion, so the start-up is off.', 'ok');
    };
  };
})();
