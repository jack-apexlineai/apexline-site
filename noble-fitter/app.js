/* Noble Fitter (trial). Sample jobs, stored on this phone only. Nothing is sent anywhere.
   One thing per screen. Voice is the phone's own dictation, always shown back and confirmed before it saves. */
(function () {
  'use strict';

  var KEY = 'nobleFitter:v2';
  var VERSION = '1.0 trial';

  /* Trial sign in. In the live system George gives every fitter their own username and PIN. */
  var FITTERS = [
    { id: 'fitter', username: 'fitter', name: 'Fitter', pin: '1234' }
  ];

  /* Safety inspection sheet, the same DVSA based sections as the workshop build (workshop/data.js).
     George's own templates replace this once he sends them. */
  var SHEET = [
    { id: 'cab', name: 'Cab and inside', items: ['Seat belts and anchorages', 'Seat condition and security', 'Steering wheel and column',
      'Mirrors, glass and visibility', 'Windscreen washers and wipers', 'Horn', 'Driving controls and pedals', 'Warning lights and gauges',
      'Speed limiter function', 'Tachograph seal and calibration date', 'Heater and demister', 'Cab doors, steps and security',
      'Fire extinguisher and first aid kit'] },
    { id: 'chassis', name: 'Chassis and body', items: ['Chassis members and cross members', 'Body security and mountings', 'Spray suppression',
      'Markings, plates and reflective markings', 'Fuel tank, cap and lines', 'Battery security and condition', 'Trailer coupling and fifth wheel',
      'Landing legs and support legs', 'Skip or hook gear rams, pins and hoses', 'Hydraulic oil level and leaks'] },
    { id: 'brakes', name: 'Brakes', items: ['Service brake operation', 'Parking brake operation', 'Air build up time', 'Air system leaks',
      'Brake pipes, hoses and couplings', 'Brake chambers and slack adjusters', 'ABS and EBS warning operation', 'Brake linings, pads and discs',
      'Load sensing valve'] },
    { id: 'steer', name: 'Steering and suspension', items: ['Steering play and operation', 'Steering linkage and joints', 'Power steering system and fluid',
      'Springs, leaves and hangers', 'Air bags, valves and lines', 'Shock absorbers', 'Anti roll bar and links', 'Axles, U bolts and mountings',
      'King pins and wheel bearings'] },
    { id: 'wheels', name: 'Wheels and tyres', items: ['Tyre condition and damage', 'Tread depth', 'Tyre pressures', 'Wheel and rim condition',
      'Wheel nut security and indicators', 'Wheel re torque recorded', 'Spare wheel carrier'] },
    { id: 'lights', name: 'Lights and electrics', items: ['Headlamps and aim', 'Side and rear lamps', 'Indicators and repeaters', 'Stop lamps',
      'Hazard warning', 'Fog lamps', 'Reversing lamp and alarm', 'Number plate lamp', 'Reflectors and marker lamps', 'Wiring, looms and connections'] },
    { id: 'exhaust', name: 'Exhaust and emissions', items: ['Exhaust system condition and leaks', 'Excessive smoke', 'AdBlue system and level',
      'DPF warning and regeneration', 'Engine oil leaks', 'Coolant leaks and level'] }
  ];
  var SHEET_TOTAL = SHEET.reduce(function (a, x) { return a + x.items.length; }, 0);
  function hasSheet(j) { return j.type === 'PMI' || j.type === 'MOT prep'; }
  function sec(id) { for (var i = 0; i < SHEET.length; i++) if (SHEET[i].id === id) return SHEET[i]; return null; }
  function sheetOf(j) {
    if (!j.sheet) { j.sheet = {}; SHEET.forEach(function (x) { j.sheet[x.id] = x.items.map(function () { return ''; }); }); }
    return j.sheet;
  }
  function secCount(j, id) { var a = sheetOf(j)[id]; return a.filter(function (v) { return v; }).length; }
  function sheetCount(j) { return SHEET.reduce(function (a, x) { return a + secCount(j, x.id); }, 0); }
  function sheetDefects(j) { var n = 0; SHEET.forEach(function (x) { sheetOf(j)[x.id].forEach(function (v) { if (v === 'defect') n++; }); }); return n; }

  var AREAS = SHEET.map(function (x) { return x.name; }).concat(['Engine and gearbox', 'Air and hydraulics', 'Something else']);

  var SEV = {
    advisory: { label: 'Advisory', sub: 'Keep an eye on it, check at the next inspection', chip: 'blue' },
    fix: { label: 'Needs fixing', sub: 'Book it in to be put right', chip: 'amber' },
    dnu: { label: 'Do not use', sub: 'Not safe. Vehicle stays off the road', chip: 'bad' }
  };

  var PARTS = [
    ['Oil filter', 'FLT-1184'], ['Air filter', 'FLT-2290'], ['Fuel filter', 'FLT-3301'], ['Brake pad set', 'BRK-5540'],
    ['Brake disc', 'BRK-5612'], ['Brake chamber', 'BRK-5790'], ['Brake shoe set', 'BRK-5833'], ['Air dryer cartridge', 'AIR-6120'],
    ['Drain valve', 'AIR-6188'], ['Wiper blade pair', 'CAB-7011'], ['Side marker lamp', 'ELE-8042'], ['Bulb set', 'ELE-8090'],
    ['Indicator lamp', 'ELE-8121'], ['AdBlue 10L', 'FLU-9010'], ['Engine oil 20L', 'FLU-9044'], ['Coolant 5L', 'FLU-9077'],
    ['Hydraulic hose', 'HYD-4120'], ['Tipping ram seal kit', 'HYD-4255'], ['King pin kit', 'SUS-3310'], ['Shock absorber', 'SUS-3388'],
    ['Air bag', 'SUS-3402'], ['Tyre 315/80 R22.5', 'TYR-2215'], ['Wheel nut indicators', 'TYR-2290'], ['Mudguard', 'BDY-1140']
  ];

  /* Sample jobs. Every registration starts with Z, which no GB plate uses, so none can be a real lorry.
     Customers are the made up operators from the Noble demo. */
  function sampleJobs() {
    var j = [
      ['07:30', 'ZP17 BNL', 'Mercedes Antos 2530 skip loader', 'Boroughs Waste Services', 'PMI', '8 weekly safety inspection', 2, 'Bay 2'],
      ['10:00', 'ZT68 KVD', 'Scania P280 skip loader', 'Thameside Skips Ltd', 'Repair', 'Air leak on the nearside rear, driver reports', 1.5, 'Bay 2'],
      ['11:45', 'ZA66 MRT', 'MAN TGS 26.320 tipper', 'M4 Aggregates', 'Defect', 'Driver walkaround: offside indicator out', 0.5, 'Bay 2'],
      ['13:00', 'ZW70 LKS', 'Iveco Eurocargo 180', 'Hanworth Haulage', 'Service', 'Full service, oil and filters', 2.5, 'Bay 3'],
      ['15:30', 'ZN21 BOW', 'Volvo FM 330 hook loader', 'Vale Plant Hire', 'MOT prep', 'Pre MOT check before Friday lane slot', 1.5, 'Bay 5 MOT']
    ];
    return j.map(function (r, i) {
      return { id: 'j' + (i + 1), fitterId: 'fitter', time: r[0], reg: r[1], make: r[2], customer: r[3], type: r[4], task: r[5], std: r[6], bay: r[7],
        status: 'todo', clock: [], defects: [], notes: [], parts: [], doneAt: null };
    });
  }

  /* ---------- storage ---------- */
  var S = load();
  function fresh() { return { v: 2, lastUser: '', me: null, jobs: sampleJobs(), drafts: {}, nudgeOff: false, seededAt: Date.now() }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.v === 2 && o.jobs) return o; }
    } catch (e) {}
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { toast('The phone is out of space for the trial. Reset the trial in the menu to clear old photos.', 5000); return false; }
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function me() { for (var i = 0; i < FITTERS.length; i++) if (FITTERS[i].id === S.me) return FITTERS[i]; return null; }
  function fitter(id) { for (var i = 0; i < FITTERS.length; i++) if (FITTERS[i].id === id) return FITTERS[i]; return null; }
  function job(id) { for (var i = 0; i < S.jobs.length; i++) if (S.jobs[i].id === id) return S.jobs[i]; return null; }
  function myJobs() { return S.jobs.filter(function (j) { return j.fitterId === S.me; }); }
  function first(n) { return String(n).split(' ')[0]; }
  function initials(n) { return String(n).split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hms(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60); }
  function hm(ms) { var m = Math.round(ms / 60000); var h = Math.floor(m / 60); m = m % 60; return h ? h + 'h ' + m + 'm' : m + 'm'; }
  function hrs(h) { var m = Math.round(h * 60); return Math.floor(m / 60) ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm'; }
  function clockTime(t) { var d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function elapsed(j) { var t = 0, now = Date.now(); j.clock.forEach(function (c) { t += (c.end || now) - c.start; }); return t; }
  function running() { return S.jobs.filter(function (j) { return j.fitterId === S.me && j.status === 'running'; })[0] || null; }
  function today() { return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function greet() { var h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; }
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function typeChip(t) {
    var c = { PMI: 'blue', Repair: 'amber', Defect: 'bad', 'MOT prep': 'blue', Service: 'go', Tyres: '' }[t] || '';
    return '<span class="chip ' + c + '">' + esc(t) + '</span>';
  }
  function statusChip(j) {
    if (j.status === 'running') return '<span class="chip go">On the clock</span>';
    if (j.status === 'paused') return '<span class="chip amber">Paused</span>';
    if (j.status === 'done') return '<span class="chip go">Done</span>';
    return '';
  }

  var ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    part: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>'
  };

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }

  /* ---------- navigation (history, so the Android back button works) ---------- */
  var cur = { s: 'who', p: {}, d: 0 };
  function go(s, p, replace) {
    stopTalk();
    var st = { s: s, p: p || {}, d: replace ? cur.d : cur.d + 1 };
    try { if (replace) history.replaceState(st, ''); else history.pushState(st, ''); } catch (e) {}
    cur = st; render(true);
  }
  function back(fallback, p) {
    stopTalk();
    if (cur.d > 0) history.back(); else go(fallback || 'jobs', p || {}, true);
  }
  function home(msg) {
    stopTalk();
    if (msg) pendingToast = msg;
    if (cur.d > 0) { history.go(-cur.d); return; }
    cur = { s: S.me ? 'jobs' : 'who', p: {}, d: 0 };
    try { history.replaceState(cur, ''); } catch (e) {}
    render(true); flushToast();
  }
  var pendingToast = null;
  function flushToast() { if (pendingToast) { toast(pendingToast[0], pendingToast[1]); pendingToast = null; } }
  window.addEventListener('popstate', function (e) {
    stopTalk();
    var st = e.state;
    if (!st || !st.s) st = { s: S.me ? 'jobs' : 'who', p: {}, d: 0 };
    if (S.me && (st.s === 'who' || st.s === 'pin')) st = { s: 'jobs', p: {}, d: st.d || 0 };
    cur = st; render(true); flushToast();
  });

  /* ---------- render ---------- */
  var tick;
  function render(top) {
    clearInterval(tick);
    if (!S.me && cur.s !== 'who' && cur.s !== 'pin') cur = { s: 'who', p: {}, d: cur.d };
    var fn = SCREENS[cur.s] || SCREENS.jobs;
    var p = cur.p || {};
    if (/^(job|defect|notes|parts|done|sheet|section)$/.test(cur.s) && !job(p.job)) { cur = { s: 'jobs', p: {}, d: cur.d }; fn = SCREENS.jobs; p = {}; }
    $('view').innerHTML = fn.html(p);
    if (fn.after) fn.after(p);
    if (top) window.scrollTo(0, 0);
    tick = setInterval(updateClocks, 1000);
  }
  function updateClocks() {
    var els = document.querySelectorAll('[data-clock]');
    for (var i = 0; i < els.length; i++) { var j = job(els[i].getAttribute('data-clock')); if (j) els[i].textContent = hms(elapsed(j)); }
  }
  function backBtn(label, act) {
    return '<button class="back" data-act="' + (act || 'back') + '">' + ICON.back + esc(label) + '</button>';
  }
  function topBar(right) {
    return '<div class="top"><img src="logo.png" alt="Noble Commercial Truck Services">' +
      '<div class="ttl">Noble Fitter<small>Noble Commercial Truck Services</small></div>' +
      '<div class="right">' + (right || '') + '</div></div>';
  }

  /* ---------- speech (the phone's own dictation first; Web Speech only where it is reliable) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canTalk = !!SR && !isIOS();
  var rec = null, recTa = null;
  function talkUI(taId, value, placeholder) {
    return '<div class="hint">' + ICON.mic + '<div><b>Tap the microphone on your keyboard and talk.</b> Your words appear in the box. Check them and fix anything before you save.</div></div>' +
      '<textarea class="big" id="' + taId + '" placeholder="' + esc(placeholder) + '" autocapitalize="sentences" spellcheck="true">' + esc(value || '') + '</textarea>' +
      (canTalk ? '<button class="btn ghost talk" data-act="talk" data-ta="' + taId + '">' + ICON.mic + '<span>Talk</span> <span class="pill trial">Trial</span></button>' : '');
  }
  function startTalk(btn) {
    var ta = $(btn.getAttribute('data-ta'));
    if (!ta) return;
    if (rec) { stopTalk(); return; }
    var base = ta.value.replace(/\s+$/, '');
    try {
      rec = new SR(); recTa = ta;
      rec.lang = 'en-GB'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        var txt = '';
        for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        txt = txt.trim();
        if (txt) txt = txt.charAt(0).toUpperCase() + txt.slice(1);
        ta.value = (base ? base + (/[.!?]$/.test(base) ? ' ' : '. ') : '') + txt;
        ta.dispatchEvent(new Event('input'));
      };
      rec.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Microphone is blocked. Use the microphone on your keyboard instead.', 4000);
        else if (e.error === 'no-speech') toast('Didn\'t catch anything. Tap Talk and try again.');
        else if (e.error !== 'aborted') toast('Talk stopped. Use the microphone on your keyboard instead.', 3500);
      };
      rec.onend = function () { rec = null; recTa = null; setTalkBtn(btn, false); };
      rec.start();
      setTalkBtn(btn, true);
    } catch (err) { rec = null; toast('Talk isn\'t available here. Use the microphone on your keyboard.', 3500); }
  }
  function setTalkBtn(btn, on) {
    if (!btn || !btn.isConnected) return;
    btn.classList.toggle('on', on);
    btn.querySelector('span').textContent = on ? 'Listening, tap to stop' : 'Talk';
  }
  function stopTalk() { if (rec) { try { rec.stop(); } catch (e) {} } }

  /* ---------- screens ---------- */
  var SCREENS = {};

  SCREENS.who = {
    html: function () {
      return '<div class="hero"><img src="logo.png" alt="Noble Commercial Truck Services"><h1>Noble Fitter</h1>' +
        '<p class="muted">Sign in to see your jobs</p></div>' +
        '<label class="lbl" for="user">Username</label>' +
        '<input class="search" id="user" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" value="' + esc(S.lastUser || '') + '" placeholder="Your username">' +
        '<div class="pinmsg" id="usermsg" style="text-align:left;margin-top:8px"></div>' +
        '<div class="stack" style="margin-top:8px"><button class="btn" data-act="usernext">Next</button></div>' +
        '<div class="gap"></div><div class="card small" style="margin-top:24px"><span class="pill trial">Trial</span> Username <b>fitter</b>, PIN <b>1234</b>. When the app goes live, George gives you your own PIN.</div>';
    },
    after: function () {
      var u = $('user');
      u.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); userNext(); } });
    }
  };
  function userNext() {
    var v = ($('user').value || '').trim().toLowerCase();
    var f = FITTERS.filter(function (x) { return x.username === v; })[0];
    var m = $('usermsg');
    if (!v) { m.className = 'pinmsg err'; m.textContent = 'Type your username first.'; return; }
    if (!f) { m.className = 'pinmsg err'; m.textContent = 'We don\'t know that username. For the trial it\'s fitter.'; return; }
    S.lastUser = f.username; save(); pinBuf = ''; $('user').blur();
    go('pin', { id: f.id });
  }

  var pinBuf = '';
  SCREENS.pin = {
    html: function (p) {
      var f = fitter(p.id) || FITTERS[0];
      var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
      return backBtn('Back', 'back') +
        '<div class="hero" style="padding-bottom:4px"><h1>Enter your PIN</h1><p class="muted">Signing in as ' + esc(f.username) + '</p></div>' +
        '<div class="dots" id="dots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < pinBuf.length ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="pinmsg" id="pinmsg">4 numbers</div>' +
        '<div class="pad">' + keys.map(function (k) {
          if (!k) return '<button class="blank" tabindex="-1" aria-hidden="true"></button>';
          if (k === 'del') return '<button class="del" data-act="pdel" aria-label="Delete">Delete</button>';
          return '<button data-act="pkey" data-k="' + k + '">' + k + '</button>';
        }).join('') + '</div>';
    }
  };
  function pinKey(k, p) {
    if (pinBuf.length >= 4) return;
    pinBuf += k; drawDots();
    if (pinBuf.length === 4) {
      var f = fitter(p.id);
      setTimeout(function () {
        if (f && pinBuf === f.pin) {
          pinBuf = ''; S.me = f.id; save();
          history.replaceState({ s: 'jobs', p: {}, d: 0 }, ''); cur = { s: 'jobs', p: {}, d: 0 }; render(true);
          toast('Signed in. ' + greet() + '.');
        } else {
          pinBuf = ''; drawDots();
          var d = $('dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
          var m = $('pinmsg'); m.className = 'pinmsg err'; m.textContent = 'That PIN didn\'t match. Try again.';
        }
      }, 120);
    }
  }
  function drawDots() {
    var d = $('dots'); if (!d) return;
    d.innerHTML = [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < pinBuf.length ? 'on' : '') + '"></i>'; }).join('');
  }

  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (cur.s === 'jobs' || cur.s === 'menu') render(); });
  window.addEventListener('appinstalled', function () { deferredInstall = null; S.nudgeOff = true; save(); toast('Installed. Open Noble Fitter from your home screen.'); });

  SCREENS.jobs = {
    html: function () {
      var f = me(); var js = myJobs();
      var todo = js.filter(function (j) { return j.status !== 'done'; });
      var done = js.filter(function (j) { return j.status === 'done'; });
      var r = running();
      var h = topBar('<button class="menu-btn" data-act="menu">Menu</button>');
      if (!standalone() && !S.nudgeOff) {
        h += '<div class="nudge"><span>Add it to your home screen</span><button class="go" data-act="howto">Show me</button><button class="x" data-act="nudgeoff" aria-label="Hide">Hide</button></div>';
      }
      h += '<h1>' + greet() + '</h1>' +
        '<p class="muted" style="margin-top:6px">' + today() + ' &middot; ' + (todo.length ? todo.length + ' job' + (todo.length === 1 ? '' : 's') + ' to do' : 'all jobs done') + '</p>';
      if (r) {
        h += '<div style="margin-top:20px"><button class="oncl" data-act="open" data-id="' + r.id + '"><span><small>On the clock</small><b>' + esc(r.reg) + '</b></span><span class="t" data-clock="' + r.id + '">' + hms(elapsed(r)) + '</span></button></div>';
      }
      h += '<div class="section-h">My jobs today</div>';
      if (!todo.length) h += '<div class="card"><b>Nothing left on your list.</b><p class="muted" style="margin-top:6px">Good work. Done jobs are below.</p></div>';
      h += '<div class="list">' + todo.map(jobCard).join('') + '</div>';
      if (done.length) h += '<div class="section-h">Done today</div><div class="list">' + done.map(jobCard).join('') + '</div>';
      h += '<div class="foot"><span class="pill trial">Trial, sample data on this phone</span></div>';
      return h;
    }
  };
  function jobCard(j) {
    var cls = j.status === 'done' ? ' done' : j.status === 'running' ? ' live' : '';
    var dnu = j.defects.some(function (d) { return d.severity === 'dnu'; });
    return '<button class="jobc' + cls + '" data-act="open" data-id="' + j.id + '">' +
      '<div class="l1"><span class="time">' + esc(j.time) + '</span><span class="plate">' + esc(j.reg) + '</span>' + typeChip(j.type) + statusChip(j) + (dnu ? '<span class="chip bad">Do not use</span>' : '') + '</div>' +
      '<div class="l2">' + esc(j.task) + '</div>' +
      '<div class="l3">' + esc(j.make) + ' &middot; ' + esc(j.customer) + '</div></button>';
  }

  SCREENS.job = {
    html: function (p) {
      var j = job(p.job);
      var h = backBtn('My jobs', 'tojobs');
      h += '<div class="jhead"><span class="plate big">' + esc(j.reg) + '</span>' +
        '<div class="meta">' + typeChip(j.type) + '<span class="chip">' + esc(j.bay) + '</span><span class="chip">Booked ' + esc(j.time) + '</span></div>' +
        '<div class="what">' + esc(j.task) + '</div>' +
        '<div class="sub">' + esc(j.make) + ' &middot; ' + esc(j.customer) + '</div></div>';

      if (j.defects.some(function (d) { return d.severity === 'dnu'; })) {
        h += '<div class="alert bad">Do not use. A defect on this vehicle means it stays off the road. Tell the office.</div>';
      }

      var t = elapsed(j);
      if (j.status === 'done') {
        h += '<div class="alert ok">Job done at ' + clockTime(j.doneAt) + ' &middot; ' + hm(t) + ' on the clock</div>';
      } else {
        var stTxt = j.status === 'running' ? 'On the clock' : j.status === 'paused' ? 'Paused' : 'Not started';
        var stCls = j.status === 'running' ? ' run' : j.status === 'paused' ? ' pause' : '';
        h += '<div class="clock"><div class="state' + stCls + '">' + stTxt + '</div>' +
          '<div class="tm" data-clock="' + j.id + '">' + hms(t) + '</div><div class="of">Booked for ' + hrs(j.std) + '</div>';
        if (j.status === 'todo') h += '<button class="btn go" data-act="start">' + ICON.play + 'Start job</button>';
        else if (j.status === 'running') h += '<div class="row2"><button class="btn amber" data-act="pause">' + ICON.pause + 'Pause</button><button class="btn" data-act="finish">' + ICON.tick + 'Finish</button></div>';
        else h += '<div class="row2"><button class="btn go" data-act="start">' + ICON.play + 'Carry on</button><button class="btn" data-act="finish">' + ICON.tick + 'Finish</button></div>';
        h += '</div>';

        h += '<div class="acts">' +
          (hasSheet(j) ? actRow('sheet', 'green', ICON.list, 'Inspection sheet', sheetCount(j) === SHEET_TOTAL ? 'All ' + SHEET_TOTAL + ' items checked' : sheetCount(j) + ' of ' + SHEET_TOTAL + ' items checked', 0) : '') +
          actRow('defect', 'red', ICON.warn, 'Report a defect', 'Area, what\'s wrong, photo', j.defects.length) +
          actRow('notes', 'blue', ICON.note, 'Job card', 'Talk or type what you did', j.notes.length) +
          actRow('parts', 'grey', ICON.part, 'Parts used', 'Add the parts you fitted', j.parts.reduce(function (a, x) { return a + x.qty; }, 0)) +
          '</div>';
      }

      h += logList(j);
      if (j.status === 'done') h += '<div style="margin-top:24px"><button class="btn ghost" data-act="reopen">Reopen this job</button></div>';
      return h;
    }
  };
  function actRow(act, ic, icon, title, sub, n) {
    return '<button class="act" data-act="' + act + '"><span class="ic ' + ic + '">' + icon + '</span><span><b>' + title + '</b><small>' + sub + '</small></span>' +
      (n ? '<span class="cnt">' + n + '</span>' : '') + '<span class="chev">' + ICON.chev + '</span></button>';
  }
  function logList(j) {
    var h = '';
    if (j.defects.length) {
      h += '<div class="section-h">Defects</div><div class="list">' + j.defects.map(function (d) {
        var s = SEV[d.severity];
        return '<div class="logitem"><div class="h"><span class="chip ' + s.chip + '">' + s.label + '</span><b>' + esc(d.item || d.area) + '</b></div>' +
          '<div class="tx">' + esc(d.text) + '</div>' + (d.photo ? '<img src="' + d.photo + '" alt="Defect photo">' : '') +
          '<div class="ft">' + esc(d.area) + ' &middot; ' + clockTime(d.at) + '</div></div>';
      }).join('') + '</div>';
    }
    if (j.notes.length) {
      h += '<div class="section-h">Job card</div><div class="list">' + j.notes.map(function (n) {
        return '<div class="logitem"><div class="tx" style="margin-top:0">' + esc(n.text) + '</div><div class="ft">' + clockTime(n.at) + ' &middot; checked and saved</div></div>';
      }).join('') + '</div>';
    }
    if (j.parts.length && j.status === 'done') {
      h += '<div class="section-h">Parts used</div><div class="list">' + j.parts.map(function (x) {
        return '<div class="logitem"><div class="h"><b>' + x.qty + ' x ' + esc(x.name) + '</b></div>' + (x.partNo ? '<div class="ft">' + esc(x.partNo) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    return h;
  }

  /* clock actions */
  function startJob(j) {
    var r = running();
    if (r && r.id !== j.id) { closeSeg(r); r.status = 'paused'; toast('Paused ' + r.reg + ' first. Now on ' + j.reg + '.', 3200); }
    j.clock.push({ start: Date.now(), end: null }); j.status = 'running'; save(); render();
  }
  function closeSeg(j) { var c = j.clock[j.clock.length - 1]; if (c && !c.end) c.end = Date.now(); }
  function pauseJob(j) { closeSeg(j); j.status = 'paused'; save(); render(); toast('Paused. Tap Carry on when you\'re back.'); }

  /* ---------- inspection sheet: sections, then one section per screen ---------- */
  SCREENS.sheet = {
    html: function (p) {
      var j = job(p.job); var n = sheetCount(j);
      var h = backBtn('Back') + '<div class="steps">Inspection sheet &middot; ' + esc(j.reg) + '</div>' +
        '<div class="qh"><h1>Inspection sheet</h1><p>' + n + ' of ' + SHEET_TOTAL + ' items checked. Tap a section to go through it.</p></div><div class="list">';
      h += SHEET.map(function (x) {
        var c = secCount(j, x.id), all = c === x.items.length;
        var dn = sheetOf(j)[x.id].filter(function (v) { return v === 'defect'; }).length;
        return '<button class="act" data-act="section" data-sec="' + x.id + '"><span class="ic ' + (all ? 'green' : 'grey') + '">' + (all ? ICON.tick : ICON.list) + '</span>' +
          '<span><b>' + esc(x.name) + '</b><small>' + (all ? 'Done' : c + ' of ' + x.items.length + ' checked') + (dn ? ' &middot; <span style="color:var(--bad);font-weight:700">' + dn + ' defect' + (dn === 1 ? '' : 's') + '</span>' : '') + '</small></span>' +
          '<span class="chev">' + ICON.chev + '</span></button>';
      }).join('');
      h += '</div><div class="stack" style="margin-top:24px"><button class="btn" data-act="back">' + ICON.tick + 'Back to the job</button></div>';
      return h;
    }
  };
  SCREENS.section = {
    html: function (p) {
      var j = job(p.job); var x = sec(p.sec) || SHEET[0]; var a = sheetOf(j)[x.id];
      var idx = SHEET.indexOf(x); var nxt = SHEET[idx + 1];
      var c = secCount(j, x.id);
      var h = backBtn('All sections') + '<div class="steps">Inspection sheet &middot; ' + esc(j.reg) + ' &middot; section ' + (idx + 1) + ' of ' + SHEET.length + '</div>' +
        '<div class="qh"><h1>' + esc(x.name) + '</h1><p>' + c + ' of ' + x.items.length + ' checked</p></div>';
      if (c < x.items.length) h += '<div class="stack" style="margin-bottom:18px"><button class="btn ghost" data-act="restok">' + ICON.tick + 'Mark the rest OK</button></div>';
      h += '<div class="list">' + x.items.map(function (it, i) {
        var v = a[i];
        return '<div class="item' + (v ? ' set-' + v : '') + '"><div class="inm">' + esc(it) + '</div><div class="iopts">' +
          '<button class="iok' + (v === 'ok' ? ' on' : '') + '" data-act="iset" data-i="' + i + '" data-v="ok">OK</button>' +
          '<button class="idef' + (v === 'defect' ? ' on' : '') + '" data-act="idef" data-i="' + i + '">Defect</button>' +
          '<button class="ina' + (v === 'na' ? ' on' : '') + '" data-act="iset" data-i="' + i + '" data-v="na">N/A</button></div></div>';
      }).join('') + '</div>';
      h += '<div class="stack" style="margin-top:24px">' + (nxt ? '<button class="btn" data-act="section" data-sec="' + nxt.id + '" data-replace="1">Next: ' + esc(nxt.name) + '</button>' : '<button class="btn" data-act="back">' + ICON.tick + 'Back to all sections</button>') + '</div>';
      return h;
    }
  };

  /* ---------- defect: one question per screen ---------- */
  function draft(kind, jobId) {
    if (!S.drafts) S.drafts = {};
    var d = S.drafts[kind];
    if (!d || d.job !== jobId) { d = S.drafts[kind] = { job: jobId, area: '', text: '', photo: '', severity: '' }; save(); }
    return d;
  }
  function DD() { return draft('defect', cur.p.job); }
  function ND() { return draft('note', cur.p.job); }
  SCREENS.defect = {
    html: function (p) {
      var j = job(p.job); var d = draft('defect', j.id); var step = p.step || 1;
      var h = '<button class="back" data-act="dstepback">' + ICON.back + (step === 1 || (step === 2 && d.sheetRef) ? 'Cancel' : 'Back') + '</button>' +
        '<div class="steps">Report a defect &middot; ' + esc(j.reg) + (step < 5 ? ' &middot; step ' + step + ' of 4' : '') + '</div>';
      if (step === 1) {
        h += '<div class="qh"><h1>Where is it?</h1></div><div class="tiles">' + AREAS.map(function (a) {
          return '<button class="tile' + (d.area === a ? ' sel' : '') + '" data-act="darea" data-v="' + esc(a) + '">' + esc(a) + '</button>';
        }).join('') + '</div>';
      } else if (step === 2) {
        h += '<div class="qh"><h1>What\'s wrong?</h1><p>' + esc(d.item ? d.area + ', ' + d.item : d.area) + '. Say where on the vehicle, for example nearside front.</p></div>' +
          talkUI('dtext', d.text, 'For example: nearside front brake pads down to 3 mil, need replacing') +
          '<div class="gap"></div><div class="stack" style="margin-top:18px"><button class="btn" data-act="dnext2" id="dnext2"' + (d.text.trim() ? '' : ' disabled') + '>Next</button></div>';
      } else if (step === 3) {
        h += '<div class="qh"><h1>Add a photo</h1><p>A clear photo of the defect helps the office and the customer.</p></div>' +
          (d.photo ? '<img class="photo-prev" src="' + d.photo + '" alt="Your photo">' : '') +
          '<div class="stack">' +
          '<label class="btn ' + (d.photo ? 'ghost' : '') + '" for="camin">' + ICON.cam + (d.photo ? 'Take it again' : 'Take a photo') + '</label>' +
          '<input class="filein" type="file" id="camin" accept="image/*" capture="environment">' +
          '<label class="btn ghost" for="libin">Choose from my photos</label>' +
          '<input class="filein" type="file" id="libin" accept="image/*">' +
          '</div><div class="gap"></div><div class="stack" style="margin-top:18px">' +
          (d.photo ? '<button class="btn" data-act="dnext3">Next</button><button class="btn link" data-act="dnophoto">Remove photo</button>'
            : '<button class="btn link" data-act="dnext3">Skip, no photo</button>') + '</div>';
      } else if (step === 4) {
        h += '<div class="qh"><h1>How bad is it?</h1></div><div class="stack">' +
          ['advisory', 'fix', 'dnu'].map(function (k) {
            return '<button class="sev ' + k + '" data-act="dsev" data-v="' + k + '"><span class="dot"></span><span><b>' + SEV[k].label + '</b><small>' + SEV[k].sub + '</small></span></button>';
          }).join('') + '</div>';
      } else {
        var s = SEV[d.severity];
        h += '<div class="qh"><h1>Is this right?</h1><p>Check it before you save. Tap Change to fix anything.</p></div><div class="chk">' +
          '<div><div class="k">Where' + (d.sheetRef ? '' : '<button data-act="dgo" data-step="1">Change</button>') + '</div><div class="card"><b>' + esc(d.area) + '</b>' + (d.item ? '<div class="muted small" style="margin-top:4px">' + esc(d.item) + '</div>' : '') + '</div></div>' +
          '<div><div class="k">What\'s wrong<button data-act="dgo" data-step="2">Change</button></div><div class="readback">' + esc(d.text) + '</div></div>' +
          '<div><div class="k">Photo<button data-act="dgo" data-step="3">Change</button></div>' + (d.photo ? '<img class="photo-prev" src="' + d.photo + '" alt="Your photo">' : '<div class="card muted">No photo</div>') + '</div>' +
          '<div><div class="k">How bad<button data-act="dgo" data-step="4">Change</button></div><div class="card"><span class="chip ' + s.chip + '">' + s.label + '</span> <span class="muted small">' + s.sub + '</span></div></div>' +
          '</div><div class="stack" style="margin-top:24px"><button class="btn go" data-act="dsave">' + ICON.tick + 'Yes, save defect</button></div>';
      }
      return h;
    },
    after: function (p) {
      var ta = $('dtext');
      if (ta) ta.addEventListener('input', function () { DD().text = ta.value; save(); var b = $('dnext2'); if (b) b.disabled = !ta.value.trim(); });
      ['camin', 'libin'].forEach(function (id) {
        var el = $(id); if (!el) return;
        el.addEventListener('change', function () {
          var file = el.files && el.files[0]; if (!file) return;
          toast('Adding photo...', 1500);
          shrink(file, function (url) {
            if (!url) { toast('That photo couldn\'t be read. Try again.'); return; }
            DD().photo = url;
            if (save()) render();
            else { DD().photo = ''; save(); }
          });
        });
      });
    }
  };
  function dstep(n) { go('defect', { job: cur.p.job, step: n }, true); }
  function shrink(file, cb) {
    var url = URL.createObjectURL(file); var img = new Image();
    img.onload = function () {
      var max = 1000, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try { cb(c.toDataURL('image/jpeg', 0.7)); } catch (e) { cb(null); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  /* ---------- job card notes ---------- */
  SCREENS.notes = {
    html: function (p) {
      var j = job(p.job); var d = draft('note', j.id);
      if (p.check) {
        return '<button class="back" data-act="ncheckback">' + ICON.back + 'Change it</button>' +
          '<div class="steps">Job card &middot; ' + esc(j.reg) + '</div>' +
          '<div class="qh"><h1>Is this right?</h1><p>Read it through. It only saves when you tap Yes.</p></div>' +
          '<div class="readback">' + esc(d.text) + '</div>' +
          '<div class="gap"></div><div class="stack" style="margin-top:24px"><button class="btn go" data-act="nsave">' + ICON.tick + 'Yes, save it</button>' +
          '<button class="btn ghost" data-act="ncheckback">No, change it</button></div>';
      }
      return backBtn('Back') + '<div class="steps">Job card &middot; ' + esc(j.reg) + ' <span class="pill trial">Voice is a trial feature</span></div>' +
        '<div class="qh"><h1>What did you do?</h1><p>Say what you found, what you did, and anything still to do.</p></div>' +
        talkUI('ntext', d.text, 'For example: replaced nearside front pads and checked the disc, all good. Offside rear pads at 5 mil, advisory.') +
        '<div class="gap"></div><div class="stack" style="margin-top:18px"><button class="btn" data-act="ncheck" id="ncheck"' + (d.text.trim() ? '' : ' disabled') + '>Check it</button></div>';
    },
    after: function () {
      var ta = $('ntext');
      if (ta) ta.addEventListener('input', function () { ND().text = ta.value; save(); var b = $('ncheck'); if (b) b.disabled = !ta.value.trim(); });
    }
  };

  /* ---------- parts ---------- */
  var partQ = '';
  SCREENS.parts = {
    html: function (p) {
      var j = job(p.job);
      var h = backBtn('Done') + '<div class="steps">Parts used &middot; ' + esc(j.reg) + '</div><div class="qh"><h1>Parts used</h1></div>';
      if (j.parts.length) {
        h += '<div class="list">' + j.parts.map(function (x, i) {
          return '<div class="prow"><div class="nm"><b>' + esc(x.name) + '</b>' + (x.partNo ? '<small>' + esc(x.partNo) + '</small>' : '') + '</div>' +
            '<div class="qty"><button data-act="pminus" data-i="' + i + '" aria-label="One less">&minus;</button><span>' + x.qty + '</span><button data-act="pplus" data-i="' + i + '" aria-label="One more">+</button></div></div>';
        }).join('') + '</div><div class="section-h">Add another part</div>';
      } else {
        h += '<p class="muted" style="margin:-8px 0 16px">Nothing added yet. Search or pick from the list.</p>';
      }
      h += '<input class="search" id="pq" type="search" placeholder="Type a part name or number" value="' + esc(partQ) + '" autocomplete="off" enterkeyhint="search">' +
        '<div class="list" id="plist" style="margin-top:12px"></div>' +
        '<div class="stack" style="margin-top:24px"><button class="btn" data-act="back">' + ICON.tick + 'Done</button></div>';
      return h;
    },
    after: function () {
      var q = $('pq'); drawParts();
      q.addEventListener('input', function () { partQ = q.value; drawParts(); });
    }
  };
  function drawParts() {
    var el = $('plist'); if (!el) return;
    var q = partQ.trim().toLowerCase();
    var m = PARTS.filter(function (x) { return !q || x[0].toLowerCase().indexOf(q) > -1 || x[1].toLowerCase().indexOf(q) > -1; });
    var h = '';
    if (q && !m.some(function (x) { return x[0].toLowerCase() === q; })) {
      h += '<div class="prow"><div class="nm"><b>' + esc(partQ.trim()) + '</b><small>Not on the list, add it anyway</small></div><button class="addp" data-act="padd" data-n="' + esc(partQ.trim()) + '" data-no="">Add</button></div>';
    }
    h += m.slice(0, q ? 12 : 8).map(function (x) {
      return '<div class="prow"><div class="nm"><b>' + esc(x[0]) + '</b><small>' + esc(x[1]) + '</small></div><button class="addp" data-act="padd" data-n="' + esc(x[0]) + '" data-no="' + esc(x[1]) + '">Add</button></div>';
    }).join('');
    el.innerHTML = h;
  }

  /* ---------- finish ---------- */
  SCREENS.done = {
    html: function (p) {
      var j = job(p.job); var t = elapsed(j);
      var nparts = j.parts.reduce(function (a, x) { return a + x.qty; }, 0);
      return backBtn('Not yet') + '<div class="steps">' + esc(j.reg) + '</div>' +
        '<div class="qh"><h1>Mark this job done?</h1><p>The clock stops and the job moves to Done.</p></div>' +
        '<div class="sumg"><div><b data-clock="' + j.id + '">' + hms(t) + '</b><span>on the clock</span></div><div><b>' + hrs(j.std) + '</b><span>booked</span></div>' +
        '<div><b>' + j.defects.length + '</b><span>defect' + (j.defects.length === 1 ? '' : 's') + '</span></div><div><b>' + nparts + '</b><span>part' + (nparts === 1 ? '' : 's') + ' used</span></div></div>' +
        (hasSheet(j) && sheetCount(j) < SHEET_TOTAL ? '<div class="alert bad">Inspection sheet not finished: ' + sheetCount(j) + ' of ' + SHEET_TOTAL + ' items checked.</div>' : '') +
        (j.notes.length ? '' : '<div class="alert info">No job card notes yet. You can add them first, or finish without.</div>') +
        '<div class="gap"></div><div class="stack" style="margin-top:20px"><button class="btn go" data-act="donesave">' + ICON.tick + 'Yes, job done</button>' +
        (hasSheet(j) && sheetCount(j) < SHEET_TOTAL ? '<button class="btn ghost" data-act="donesheet">Finish the sheet first</button>' : '') +
        (j.notes.length ? '' : '<button class="btn ghost" data-act="donenotes">Add job card notes first</button>') + '</div>';
    }
  };

  /* ---------- menu ---------- */
  SCREENS.menu = {
    html: function () {
      var f = me();
      return backBtn('Back') + '<div class="qh"><h1>Menu</h1><p>Signed in as ' + esc(f.username) + '</p></div><div class="stack">' +
        (deferredInstall ? '<button class="mrow" data-act="install">Install the app<small style="margin-left:auto">Puts it on your home screen</small></button>' : '') +
        '<button class="mrow" data-act="howto"><span>Put it on my home screen<small>How to install on iPhone or Android</small></span></button>' +
        '<button class="mrow" data-act="signout"><span>Sign out<small>Someone else uses this phone</small></span></button>' +
        '<button class="mrow" data-act="reset"><span>Reset the trial<small>Clears what you\'ve done and puts the sample jobs back</small></span></button>' +
        '</div><div class="card" style="margin-top:24px"><span class="pill trial">Trial</span><p style="margin-top:10px">This is a trial with sample jobs. Everything stays on this phone and nothing goes to the office yet.</p>' +
        '<p class="muted" style="margin-top:10px">Something not right or a good idea? Send Jack a WhatsApp voice note.</p></div>' +
        '<div class="foot">Noble Fitter ' + VERSION + ' &middot; built by ApexLine</div>';
    }
  };
  SCREENS.howto = {
    html: function () {
      var ios = isIOS();
      var iphone = '<div class="card howto"><h2>iPhone</h2><ol><li>Open this page in <b>Safari</b></li><li>Tap the <b>Share</b> button (the square with the arrow)</li><li>Scroll down, tap <b>Add to Home Screen</b></li><li>Tap <b>Add</b></li></ol></div>';
      var android = '<div class="card howto"><h2>Android</h2><ol><li>Open this page in <b>Chrome</b></li><li>Tap the <b>three dots</b> at the top right</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b></li><li>Tap <b>Install</b></li></ol></div>';
      return backBtn('Back') + '<div class="qh"><h1>Put it on your home screen</h1><p>Then it opens like a normal app, full screen.</p></div>' +
        (standalone() ? '<div class="alert ok" style="margin:0 0 16px">It\'s already installed on this phone.</div>' : '') +
        (deferredInstall ? '<div class="stack" style="margin-bottom:16px"><button class="btn" data-act="install">Install the app</button></div>' : '') +
        '<div class="stack">' + (ios ? iphone + android : android + iphone) + '</div>';
    }
  };
  SCREENS.reset = {
    html: function () {
      return backBtn('Cancel') + '<div class="qh"><h1>Reset the trial?</h1><p>This clears your clock times, defects, photos, notes and parts on this phone, and puts the sample jobs back.</p></div>' +
        '<div class="gap"></div><div class="stack"><button class="btn bad" data-act="resetyes">Yes, reset it</button><button class="btn ghost" data-act="back">No, keep it</button></div>';
    }
  };

  /* ---------- one tap handler for everything ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-act'); var p = cur.p || {}; var j = p.job ? job(p.job) : null;
    switch (a) {
      case 'back': back(cur.s === 'job' ? 'jobs' : cur.s === 'section' ? 'sheet' : (p.job ? 'job' : 'jobs'), p.job ? { job: p.job } : {}); break;
      case 'tojobs': back('jobs'); break;
      case 'usernext': userNext(); break;
      case 'pkey': pinKey(b.getAttribute('data-k'), p); break;
      case 'pdel': pinBuf = pinBuf.slice(0, -1); drawDots(); break;
      case 'menu': go('menu'); break;
      case 'howto': go('howto'); break;
      case 'nudgeoff': S.nudgeOff = true; save(); render(); break;
      case 'install':
        if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(function () { deferredInstall = null; render(); }); }
        break;
      case 'signout': S.me = null; save(); home(['Signed out.']); break;
      case 'reset': go('reset'); break;
      case 'resetyes':
        var keep = S.me, off = S.nudgeOff, lu = S.lastUser; S = fresh(); S.me = keep; S.nudgeOff = off; S.lastUser = lu; save();
        home(['Trial reset. Sample jobs are back.']); break;
      case 'open': go('job', { job: b.getAttribute('data-id') }); break;
      case 'start': startJob(j); if (j.clock.length === 1) toast('Clock started on ' + j.reg + '.'); break;
      case 'pause': pauseJob(j); break;
      case 'finish': go('done', { job: j.id }); break;
      case 'donesave':
        closeSeg(j); j.status = 'done'; j.doneAt = Date.now(); save();
        home(['Job done. ' + j.reg + ' moved to Done.']); break;
      case 'donenotes': go('notes', { job: j.id }, true); break;
      case 'donesheet': go('sheet', { job: j.id }, true); break;
      case 'reopen': j.status = 'paused'; j.doneAt = null; save(); render(); toast('Reopened. Tap Carry on to start the clock.'); break;
      case 'defect': draft('defect', j.id); go('defect', { job: j.id, step: 1 }); break;
      case 'darea': DD().area = b.getAttribute('data-v'); save(); dstep(DD().severity ? 5 : 2); break;
      case 'dnext2': stopTalk(); DD().text = ($('dtext').value || '').trim(); save(); if (DD().text) dstep(DD().severity ? 5 : 3); break;
      case 'dnext3': dstep(DD().severity ? 5 : 4); break;
      case 'dnophoto': DD().photo = ''; save(); render(); break;
      case 'dsev': DD().severity = b.getAttribute('data-v'); save(); dstep(5); break;
      case 'dgo': dstep(+b.getAttribute('data-step')); break;
      case 'dstepback':
        if ((p.step || 1) === 1 || (p.step === 2 && DD().sheetRef)) { delete S.drafts.defect; save(); back('job', { job: p.job }); }
        else dstep(p.step === 5 ? 4 : p.step - 1);
        break;
      case 'dsave':
        var d = DD();
        if (!d.area || !d.text.trim() || !d.severity) { dstep(!d.area ? 1 : !d.text.trim() ? 2 : 4); break; }
        j.defects.push({ id: 'd' + Date.now(), area: d.area, item: d.item || '', text: d.text.trim(), photo: d.photo, severity: d.severity, by: S.me, at: Date.now() });
        if (d.sheetRef) { var sr = d.sheetRef.split(':'); sheetOf(j)[sr[0]][+sr[1]] = 'defect'; }
        delete S.drafts.defect;
        if (!save()) { j.defects.pop(); S.drafts.defect = d; save(); break; }
        pendingToast = d.severity === 'dnu' ? ['Saved. Do not use, tell the office now.', 4000] : ['Defect saved.'];
        back('job', { job: j.id }); if (cur.d === 0) flushToast();
        break;
      case 'notes': draft('note', j.id); go('notes', { job: j.id }); break;
      case 'ncheck': stopTalk(); ND().text = ($('ntext').value || '').trim(); save(); if (ND().text) go('notes', { job: j.id, check: true }, true); break;
      case 'ncheckback': go('notes', { job: j.id }, true); break;
      case 'nsave':
        if (!ND().text.trim()) { go('notes', { job: j.id }, true); break; }
        j.notes.push({ text: ND().text.trim(), by: S.me, at: Date.now() }); delete S.drafts.note; save();
        pendingToast = ['Saved to the job card.']; back('job', { job: j.id }); if (cur.d === 0) flushToast(); break;
      case 'talk': startTalk(b); break;
      case 'sheet': go('sheet', { job: j.id }); break;
      case 'section': go('section', { job: j.id, sec: b.getAttribute('data-sec') }, !!b.getAttribute('data-replace')); break;
      case 'iset': sheetOf(j)[p.sec][+b.getAttribute('data-i')] = b.getAttribute('data-v'); save(); render(); break;
      case 'restok':
        var arr = sheetOf(j)[p.sec]; arr.forEach(function (v, i) { if (!v) arr[i] = 'ok'; }); save(); render(); toast('Rest marked OK.'); break;
      case 'idef':
        var ii = +b.getAttribute('data-i'), sx = sec(p.sec);
        if (sheetOf(j)[p.sec][ii] === 'defect') { toast('Defect already reported. It\'s on the job.'); break; }
        S.drafts = S.drafts || {};
        S.drafts.defect = { job: j.id, area: sx.name, item: sx.items[ii], sheetRef: sx.id + ':' + ii, text: '', photo: '', severity: '' }; save();
        go('defect', { job: j.id, step: 2 }); break;
      case 'parts': partQ = ''; go('parts', { job: j.id }); break;
      case 'padd':
        var n = b.getAttribute('data-n'), no = b.getAttribute('data-no'), hit = null;
        j.parts.forEach(function (x) { if (x.name.toLowerCase() === n.toLowerCase()) hit = x; });
        if (hit) hit.qty++; else j.parts.push({ name: n, partNo: no, qty: 1, by: S.me, at: Date.now() });
        save(); partQ = ''; render(true); toast('Added ' + n + '.'); break;
      case 'pplus': j.parts[+b.getAttribute('data-i')].qty++; save(); render(); break;
      case 'pminus':
        var x = j.parts[+b.getAttribute('data-i')]; x.qty--;
        if (x.qty <= 0) { j.parts.splice(+b.getAttribute('data-i'), 1); toast('Removed ' + x.name + '.'); }
        save(); render(); break;
    }
  });

  /* ---------- start ---------- */
  (function boot() {
    var st = history.state;
    if (S.me && st && st.s && SCREENS[st.s] && st.s !== 'who' && st.s !== 'pin') cur = st;
    else { cur = { s: S.me ? 'jobs' : 'who', p: {}, d: 0 }; try { history.replaceState(cur, ''); } catch (e) {} }
    render(true);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) updateClocks(); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {}); });
    }
  })();
})();
