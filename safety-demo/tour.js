/* Guided tours of the Coastal safety demo, over the real screens. Two clean parts:
   Part 1, Office tour: office screens only. Where something comes from a phone (Dean's defect,
   Wayne off sick, Craig saying yes), the office just shows it arriving, with a one-line note.
   Part 2, Phone tour: what operatives and fitters see on their phone. Checks, LOTOTO read out in
   English or Polish, the picture check, tap to sign, the fitter's job list.
   Every card is plain English: any safety word gets its meaning on the card.
   Nothing is read out by the tour: the speakers still only play when someone taps them.
   Start: the Guided tour button in the office top bar, office.html?tour=office or ?tour=phone (?tour=1 is the phone). */
(function(){
'use strict';
var mob = function(){ return window.innerWidth <= 760; };

/* ---------- the phone inside the office ----------
   Every move the tour makes on the phone is slow enough to watch and talk over:
   one tap, a pause, the next tap. Nothing moves until Next is pressed. */
var PACE = 650, KEY_PACE = 380;
function frame(){ return window.CSO && CSO.phoneFrame(); }
function D(){ var f = frame(); try { return f && f.contentDocument && f.contentWindow.CS ? f.contentDocument : null; } catch (e) { return null; } }
function q(s){ var d = D(); return d ? d.querySelector(s) : null; }
function tap(s){ var el = typeof s === 'string' ? q(s) : s; if (el) el.click(); return !!el; }
function waitFor(test, ms, done){
  var t0 = Date.now();
  (function poll(){
    var ok = false;
    try { ok = !!test(); } catch (e) {}
    if (ok || Date.now() - t0 > ms) done(ok); else setTimeout(poll, 80);
  })();
}
function later(ms, fn){ setTimeout(fn, ms); }
/* run a list of moves one after another, with a pause after each */
function seq(list, done){ var i = 0; (function one(){ if (i >= list.length) return done(); var f = list[i++]; f(function(){ later(PACE, one); }); })(); }
function stepNo(){ var c = q('.swphead .code'), st = q('.step'); return c && st ? +c.textContent.split('/')[0] : 0; }
function isLang(l){ var b = q('[data-lang-set="' + l + '"]'); return !!(b && b.classList.contains('on')); }
function setLang(l, done){ if (!q('[data-lang-set]') || isLang(l)) return done(); tap('[data-lang-set="' + l + '"]'); later(400, done); }
function whoIs(){ var h = q('.me h1'); return h ? h.textContent.replace(/^Hi\s+/, '').trim() : ''; }

/* a fresh phone on the Who are you screen */
function freshPhone(done){
  if (!window.CSO) return done();
  if (!frame()) CSO.openPhone(); else frame().src = 'phone.html';
  waitFor(function(){ return q('[data-op]'); }, 6000, function(){ later(250, done); });
}
function openPhone(done){ if (!window.CSO) return done(); if (!frame()) { CSO.openPhone(); waitFor(function(){ return q('#view .screen'); }, 6000, function(){ later(250, done); }); } else done(); }
/* someone logs in: their tile, then the PIN typed one number at a time */
function loginAs(id, done){
  if (!q('[data-op]')) return done();
  tap('[data-op="' + id + '"]');
  waitFor(function(){ return q('[data-k]'); }, 3000, function(){
    var keys = '1234'.split(''), i = 0;
    later(KEY_PACE, function key(){
      if (i >= keys.length) return waitFor(function(){ return q('.me'); }, 3000, function(){ later(300, done); });
      tap('[data-k="' + keys[i++] + '"]'); later(KEY_PACE, key);
    });
  });
}
/* get the phone to this person's home screen without logging in twice */
function homeOf(id, first, done){
  openPhone(function(){
    if (q('.me') && whoIs() === first) return done();
    var hb = q('#homeBtn');
    if (hb && !hb.hidden) { tap(hb); return waitFor(function(){ return q('.me'); }, 3000, function(){ if (whoIs() === first) return later(200, done); toWho(function(){ loginAs(id, done); }); }); }
    toWho(function(){ loginAs(id, done); });
  });
}
function toWho(done){
  if (q('[data-op]')) return done();
  if (q('.me') && q('#backBtn') && !q('#backBtn').hidden) { tap('#backBtn'); return waitFor(function(){ return q('[data-op]'); }, 3000, function(){ later(250, done); }); }
  freshPhone(done);
}
/* LOTOTO step n (1 based), in English unless asked; walks forward one step at a time */
function onLototo(){ return !!(q('.swphead .tt') && q('.step') && q('[data-lang-set]')); }
function forwardTo(n, done){
  (function more(){
    if (stepNo() >= n || !q('[data-next]')) return later(200, done);
    tap('[data-next]'); later(PACE, more);
  })();
}
function lototo(n, lang, done){
  var go = function(){ setLang(lang || 'en', done); };
  if (onLototo() && stepNo() === n) return go();
  if (onLototo() && stepNo() < n) return setLang('en', function(){ forwardTo(n, go); });
  homeOf('o1', 'Dean', function(){
    seq([function(d){ tap('.act[data-go="swp"]'); waitFor(function(){ return q('[data-p="lototo"]'); }, 3000, d); },
         function(d){ tap('[data-p="lototo"]'); waitFor(function(){ return stepNo() === 1; }, 3000, d); }],
      function(){ if (n > 1) forwardTo(n, go); else go(); });
  });
}
/* the picture check, in English */
function toQuiz(done){
  if (q('.qo')) return setLang('en', done);
  if (q('[data-sign]') || q('.done')) return lototo(1, 'en', function(){ toQuiz(done); });
  lototo(stepNo() || 1, 'en', function(){ forwardTo(9, function(){ tap('[data-next]'); waitFor(function(){ return q('.qo'); }, 3000, function(){ later(250, done); }); }); });
}
/* answer the picture questions right, whatever has been tapped so far, to reach the sign box */
function answerQuiz(done){
  var tries = 0;
  (function one(){
    if (q('[data-sign]') || q('.done') || ++tries > 6) return later(250, done);
    var w = D() && D().defaultView, c = q('.swphead .code');
    if (!q('.qo') || !w || !c) return later(200, one);
    var qi = +c.textContent.split('/')[0] - 1, qs = (w.CS.QUIZ.lototo || []), right = -1;
    if (qs[qi]) qs[qi].a.forEach(function(a, i){ if (a.ok) right = i; });
    tap('.qo[data-q="' + Math.max(0, right) + '"]');
    later(1300, one);
  })();
}
function toSign(done){
  if (q('[data-sign]') || q('.done')) return done();
  toQuiz(function(){ answerQuiz(done); });
}
function sign(done){
  if (q('.done')) return done();
  var b = q('[data-sign]');
  if (b && !b.classList.contains('signed')) tap(b);
  waitFor(function(){ return q('.done'); }, 3000, function(){ later(400, done); });
}
function closePhone(){ if (window.CSO && frame()) CSO.closePhone(); }
function office(t){ return function(done){ closePhone(); if (window.CSO) CSO.tab(t); later(250, done); }; }

/* the lock question, in plain English (also on the phone, under the question) */
var LOCK_WHY = 'Only the person who put a lock on can take it off. So nobody can switch the machine back on while someone is working on it.';

/* ---------- things that come in from a phone, done straight on the office data ----------
   The office tour never opens the phone. It makes the same change the phone would, then the
   office shows it arriving: the tile flashes, the note pops up. Safe to run twice (Back, Next). */
var TOUR_DEFECT = 'd_tour_dean';
function arrive(change){
  return function(done){
    closePhone();
    if (!window.CS || !window.CSO) return done();
    CS.load();
    change();
    CSO.arrived();
    later(500, done);
  };
}
function deanDefect(){
  if (CS.byId(CS.state.defects, TOUR_DEFECT)) return;
  var raw = "the reversing alarm on shovel two isn't working, it's been cutting out since first thing";
  var c = CS.tidyDefect(raw, 'kw');
  CS.addDefect({ id: TOUR_DEFECT, machine: c.machine, part: c.part, title: c.title, text: c.text, severity: c.severity, raw: raw }, 'o1');
}
function wayneGap(){ return CS.gapsToday().filter(function(g){ return g.op === 'o14' && g.kind === 'sick'; })[0] || null; }
function wayneSick(){ if (!CS.offToday('o14')) CS.markSick('o14', 'phone'); }
function craigYes(){
  wayneSick();
  var g = wayneGap(); if (!g || g.coveredBy) return;
  if (g.asked.indexOf('o16') < 0) CS.askCover(g.id, ['o16']);
  CS.answerCover(g.id, 'o16', true);
}
function onTab(t, change){ return arrive(function(){ CSO.tab(t); change(); }); }

/* ------------------------------ Part 1, office tour ------------------------------ */
var OFFICE = [
  { id: 'board',
    prep: function(done){ closePhone(); if (window.CSO) { CSO.reset(); CSO.tab('board'); } later(300, done); },
    title: 'The morning board, both sites',
    body: 'Every machine and lorry at Kenbury Wood and Deep Moor. Green is ready, amber needs a look, red is Do not use.',
    why: 'Your pre and post shift checks, digital: a missing check shows here before the shift gets going.',
    target: ['#boardPanel .mgrid'], area: ['#boardPanel .sitehead'] },
  { id: 'attention',
    prep: office('board'),
    title: 'Needs attention',
    body: 'Serious defects, missing checks and overdue inspections, worst first.',
    why: 'Problems come to you. Nobody walks the yard chasing paper sheets.',
    target: ['#attPanel'] },
  { id: 'defect',
    prep: onTab('board', deanDefect),
    from: 'Dean reported this from his phone',
    title: 'A defect comes in',
    body: 'Dean said the reversing alarm on Shovel 2 keeps cutting out. Shovel 2 turns red, Do not use, and Steve the fitter gets the job.',
    why: 'Defects are logged the moment they are found, in his own words, and nobody takes out an unsafe machine.',
    target: ['[data-m="m2"]'] },
  { id: 'iso',
    prep: office('iso'),
    title: 'Who has a lock on what',
    body: 'Every padlock on every machine, live, and every permit to work (the written go-ahead for a risky repair).',
    body2: 'Isolating means switching a machine off at its isolator (the main switch) and fitting your own padlock.',
    why: 'LOTOTO (lock out, tag out, try out) is your focus: you see who is working inside which machine.',
    target: ['#view .panel.iso'] },
  { id: 'sick',
    prep: onTab('cover', wayneSick),
    from: 'Wayne told the office from his phone',
    title: 'Wayne is off sick',
    body: 'Lorry 1 needs a driver. The office sees who is trained on Lorry 1, who is free, and Wayne\'s jobs. One click asks them all.',
    why: 'Cover comes from the training records, so nobody untrained ends up on a lorry.',
    target: ['#view .gap.open', '#view .gap'],
    next: function(done){ var b = $('#view [data-askall]'); if (b) b.click(); later(600, done); } },
  { id: 'covered',
    prep: onTab('cover', craigYes),
    from: 'Craig said yes from his phone',
    title: 'Covered, and logged',
    body: 'First to say yes gets it. A breakdown works the same way: Do not use, the fitter told, and a spare lorry with a trained driver.',
    why: 'One click instead of ten phone calls, and you can see which lorry keeps breaking down.',
    target: ['#view .gap.ok', '#view .gap'] },
  { id: 'signoffs',
    prep: office('sign'),
    title: 'Who has signed the procedures',
    body: 'Who has signed the new LOTOTO (lock out, tag out, try out) procedure, when, which version and in which language. Anyone not signed yet is named.',
    why: 'Evidence for your ISO 45001 audit with BSI, without a binder.',
    target: ['#view .swpc.new'], area: ['#view [data-brief]'] },
  { id: 'insp',
    prep: office('insp'),
    title: 'Inspection dates',
    body: 'PUWER: machines kept safe and inspected. LOLER: anything that lifts, examined by a competent person, usually every year. Red is overdue.',
    why: 'Helps you evidence PUWER and LOLER, with every date in one place.',
    target: ['#view .panel'] },
  { id: 'people',
    prep: office('people'),
    title: 'Who can use what',
    body: 'Who is trained on each machine and lorry, and who is allowed to lock off. Training running out shows amber, then red.',
    why: 'The phone stops anyone untrained, and only trained people are offered cover.',
    target: ['#view .panel'] },
  { id: 'records',
    prep: office('rec'),
    title: 'Records and audit pack',
    body: 'Every check, ready to print. Pick a machine and get its audit pack: checks, defects, locks and inspections in one file.',
    why: 'When an inspector, insurer or your director asks, it is one click.',
    target: ['#view .auditp'] },
  { id: 'end', end: true, then: 'phone',
    prep: office('board'),
    title: 'That is the office',
    body: 'Next, the phone: what your operatives and fitters see.',
    body2: 'Press Phone tour when you are ready.' }
];

/* ------------------------------ Part 2, phone tour ------------------------------ */
var PHONE = [
  { id: 'login', phone: true,
    prep: function(done){ closePhone(); if (window.CSO) { CSO.reset(); CSO.tab('board'); } freshPhone(done); },
    title: 'Log in with a tap',
    body: 'Each person taps their own name, then a 4 number PIN. No usernames, no passwords.',
    why: 'Every check, lock and signature is logged against their name.',
    target: ['.tiles'], area: ['.ask'],
    next: function(done){ toWho(function(){ loginAs('o1', done); }); } },
  { id: 'home', phone: true,
    prep: function(done){ homeOf('o1', 'Dean', done); },
    title: 'Dean\'s own page',
    body: 'His checks due today, the procedures he still has to sign, his machines and his training dates. Every button can be read out.',
    why: 'Your pre and post shift checks start here, on his phone, not on a paper sheet.',
    target: ['.acts'], area: ['.me'] },
  { id: 'check', phone: true,
    prep: function(done){
      if (q('.item') && q('[data-a]')) return done();
      homeOf('o1', 'Dean', function(){ seq([
        function(d){ tap('[data-due="m2"]') || tap('[data-due]'); waitFor(function(){ return q('[data-t="pre"]'); }, 3000, d); },
        function(d){ tap('[data-t="pre"]'); waitFor(function(){ return q('.item'); }, 3000, d); }], done); }); },
    title: 'The pre-shift check',
    body: 'One check per screen, read out. He taps OK or Not OK. Not OK asks for a photo and how bad it is.',
    why: 'A serious fault turns the machine red, Do not use, on the office board straight away.',
    target: ['.item'], area: ['.yn'] },
  { id: 'procedure', phone: true,
    prep: function(done){ lototo(1, 'en', done); },
    title: 'Your LOTOTO procedure',
    body: 'LOTOTO means lock out, tag out, try out: switch it off, lock it, prove it will not start. One step per screen, with a big picture.',
    why: 'LOTOTO is your focus. Every operative gets the same steps, the same way, every time.',
    target: ['.step'] },
  { id: 'readout', phone: true,
    prep: function(done){ lototo(3, 'en', done); },
    title: 'Every step, read out',
    body: 'Step 3, Isolate: switch the baler off at its isolator, the main switch. Tap the speaker and it reads the step out, as often as he likes.',
    why: 'Nobody has to be a strong reader to follow it properly.',
    target: ['.step'] },
  { id: 'polish', phone: true,
    prep: function(done){ lototo(3, 'pl', done); },
    title: 'The same step, in Polish',
    body: 'One tap switches the words and the voice to Polish. Other languages can be added.',
    why: 'Many of your operatives are Polish speakers. The record shows which language each person signed in.',
    target: ['.step'], area: ['.langbar'] },
  { id: 'quiz', phone: true,
    prep: toQuiz,
    title: 'Did he take it in?',
    body: 'Picture questions check he understood, not just signed. A wrong answer plays that step again.',
    body2: '"Who can take your lock off?" ' + LOCK_WHY,
    why: 'For your ISO 45001 audit: proof each person understood the procedure, not just a signature.',
    target: ['.quiz'], area: ['.ask'] },
  { id: 'sign', phone: true,
    prep: toSign,
    title: 'Tap to sign',
    body: 'Passed? One big tap signs it, with his name, the time and the version.',
    why: 'No chasing paper sign-off sheets round two sites.',
    target: ['[data-sign]', '.done'], area: ['.quizok'],
    next: sign },
  { id: 'fitter', phone: true,
    prep: function(done){ homeOf('o13', 'Steve', done); },
    title: 'The fitter\'s job list',
    body: 'Steve the fitter gets every defect the operatives report, worst first. He fixes it, says what he did, and the machine goes back in use.',
    why: 'Faults reach the fitter the moment they are reported, not at the end of the shift.',
    target: [function(){ var j = q('[data-job]'); return j ? j.closest('.todos') : null; }] },
  { id: 'end', end: true,
    prep: function(done){ closePhone(); if (window.CSO) CSO.tab('board'); later(250, done); },
    title: 'That is the demo',
    body: 'If you want it, we build it round Coastal: your SWPs (safe work procedures), checks, sites and languages.',
    body2: 'Who else at Coastal would need to see this?' }
];
var TOURS = { phone: PHONE, office: OFFICE };
var STEPS = PHONE;

/* --------------------------- the engine --------------------------- */
var run = null, spot, card, ticker, menu = null;
var $ = function(s){ return document.querySelector(s); };
var visible = function(el){ if (!el || !el.isConnected) return false; var r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
function find(s, sel){
  if (typeof sel === 'function') return sel();
  return s.phone ? q(sel) : $(sel);
}
function pick(s, list){
  list = [].concat(list || []);
  for (var i = 0; i < list.length; i++) { var el = find(s, list[i]); if (visible(el)) return el; }
  return null;
}
/* an element's box on the office page, also for one inside the phone (scaled and clipped to the phone screen) */
function boxOf(el){
  var r = el.getBoundingClientRect();
  if (el.ownerDocument === document) return { l: r.left, t: r.top, r: r.right, b: r.bottom };
  var f = frame(); if (!f) return null;
  var fr = f.getBoundingClientRect(), k = fr.width / (f.offsetWidth || fr.width);
  return { l: Math.max(fr.left, fr.left + r.left * k), t: Math.max(fr.top, fr.top + r.top * k), r: Math.min(fr.right, fr.left + r.right * k), b: Math.min(fr.bottom, fr.top + r.bottom * k) };
}
function rectFor(s){
  if (!s.target) return null;
  var el = run.el && run.el.isConnected ? run.el : (run.el = pick(s, s.target));
  if (!el) return null;
  var box = boxOf(el); if (!box) return null;
  (s.area || []).forEach(function(a){
    var e = find(s, a); if (!visible(e)) return;
    var x = boxOf(e); if (!x) return;
    box.l = Math.min(box.l, x.l); box.t = Math.min(box.t, x.t); box.r = Math.max(box.r, x.r); box.b = Math.max(box.b, x.b);
  });
  return box;
}

function build(){
  if (spot) return;
  spot = document.createElement('div'); spot.className = 'tr-spot none'; spot.setAttribute('aria-hidden', 'true');
  card = document.createElement('div'); card.className = 'tr-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided tour'); card.setAttribute('aria-live', 'polite');
  document.body.appendChild(spot); document.body.appendChild(card);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  ticker = setInterval(place, 250);
}
function teardown(){
  if (spot) spot.remove(); if (card) card.remove();
  spot = card = null;
  clearInterval(ticker);
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', onResize);
  document.documentElement.classList.remove('touring');
  document.documentElement.removeAttribute('data-tour-step');
  if (window.CSO) CSO.fit();
}
function onResize(){ if (window.CSO) CSO.fit(); place(); }
function onKey(e){
  if (!run) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(); }
  else if (run.busy) return;
  else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); back(); }
}

function place(){
  if (!run || !spot || !card) return;
  var s = run.steps[run.i], vw = window.innerWidth, vh = window.innerHeight, pad = 6;
  if (run.busy) { spot.classList.add('none'); return; }
  var box = rectFor(s), m = mob();
  if (!box) {
    spot.classList.add('none');
    card.classList.toggle('center', !m);
    card.style.left = card.style.top = '';
    return;
  }
  spot.classList.remove('none'); card.classList.remove('center');
  var cr = card.getBoundingClientRect();
  var maxB = m ? vh - cr.height - 12 : vh - 6;
  var l = Math.max(4, box.l - pad), t = Math.max(4, box.t - pad), r = Math.min(vw - 4, box.r + pad), b = Math.min(maxB, box.b + pad);
  if (b - t < 24) b = t + 24;
  spot.style.left = l + 'px'; spot.style.top = t + 'px';
  spot.style.width = Math.max(0, r - l) + 'px'; spot.style.height = Math.max(0, b - t) + 'px';
  if (m) { card.style.left = card.style.top = ''; return; }
  /* beside the highlight: right, left, below, above, else the bottom corner */
  var cw = cr.width, ch = cr.height, gap = 18, x, y;
  if (r + gap + cw < vw - 8) { x = r + gap; y = t; }
  else if (l - gap - cw > 8) { x = l - gap - cw; y = t; }
  else if (b + gap + ch < vh - 8) { x = l; y = b + gap; }
  else if (t - gap - ch > 8) { x = l; y = t - gap - ch; }
  else { x = vw - cw - 16; y = vh - ch - 16; }
  card.style.left = Math.max(8, Math.min(x, vw - cw - 8)) + 'px';
  card.style.top = Math.max(8, Math.min(y, vh - ch - 8)) + 'px';
}

function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function paint(){
  var s = run.steps[run.i], n = run.steps.length, last = !!s.end;
  card.classList.toggle('end', last);
  card.innerHTML =
    '<div class="tr-top"><span class="tr-n">' + (run.i + 1) + ' of ' + n + '</span>' +
    '<button type="button" class="tr-skip" data-tr="skip">' + (last ? 'Close' : 'Skip tour') + '</button></div>' +
    '<div class="tr-bar"><i style="width:' + Math.round((run.i + 1) / n * 100) + '%"></i></div>' +
    (s.from ? '<p class="tr-from">' + ic('device-mobile') + '<span>' + esc(s.from) + '</span></p>' : '') +
    '<h2 class="tr-h">' + esc(s.title) + '</h2>' +
    '<p class="tr-p">' + esc(s.body) + '</p>' + (s.body2 ? '<p class="tr-p' + (s.end ? '' : ' tr-p2') + '">' + esc(s.body2) + '</p>' : '') +
    (s.why ? '<p class="tr-why"><b>Why it matters</b>' + esc(s.why) + '</p>' : '') +
    '<div class="tr-btns"><button type="button" class="tr-back" data-tr="back"' + (run.i === 0 ? ' disabled' : '') + '>Back</button>' +
    '<button type="button" class="tr-next" data-tr="' + (last ? (s.then ? 'then' : 'skip') : 'next') + '">' + (last ? (s.then ? 'Phone tour' : 'Done') : 'Next') + '</button></div>';
  card.querySelectorAll('[data-tr]').forEach(function(b){
    var a = b.getAttribute('data-tr');
    b.onclick = a === 'next' ? next : a === 'back' ? back : a === 'then' ? function(){ start(s.then); } : stop;
  });
  place();
  var nb = card.querySelector('.tr-next'); if (nb) try { nb.focus({ preventScroll: true }); } catch (e) {}
}
function busyCard(){
  card.classList.add('busy'); spot.classList.add('none');
  if (!card.innerHTML) card.innerHTML = '<p class="tr-p">One moment</p>';
}
/* a target lower than the phone screen: scroll the phone; on the office: scroll the page */
function reveal(s, el){
  if (!el) return;
  if (s.phone) {
    var w = el.ownerDocument.defaultView, r = el.getBoundingClientRect();
    if (r.bottom > w.innerHeight - 10 || r.top < 60) w.scrollTo(0, Math.max(0, w.scrollY + r.top - 80));
  } else {
    var r2 = el.getBoundingClientRect(), room = mob() ? window.innerHeight * 0.5 : window.innerHeight - 40;
    if (r2.top < 70 || r2.bottom > room) window.scrollTo(0, Math.max(0, window.scrollY + r2.top - (mob() ? 130 : 110)));
  }
}
function show(i){
  if (!run) return;
  run.busy = true; run.i = i; run.el = null;
  var s = run.steps[i];
  busyCard();
  var after = function(){
    if (!run || run.steps[run.i] !== s) return;
    waitFor(function(){ return !s.target || pick(s, s.target); }, 3000, function(){
      if (!run || run.steps[run.i] !== s) return;
      run.el = s.target ? pick(s, s.target) : null;
      if (s.target && !run.el) (window.__tourMissing = window.__tourMissing || []).push(s.id);
      reveal(s, run.el);
      card.classList.remove('busy');
      document.documentElement.setAttribute('data-tour-step', s.id);
      run.busy = false;
      paint();
    });
  };
  if (s.phone && window.CSO && !frame()) { CSO.openPhone(); }
  if (s.prep) s.prep(after); else after();
}
function next(){
  if (!run || run.busy) return;
  var s = run.steps[run.i];
  if (run.i >= run.steps.length - 1) return s.then ? start(s.then) : stop();
  if (s.next) { run.busy = true; busyCard(); s.next(function(){ if (run) { run.busy = false; show(run.i + 1); } }); }
  else show(run.i + 1);
}
function back(){ if (!run || run.busy || run.i === 0) return; show(run.i - 1); }
function stop(){
  if (!run) return;
  run = null;
  teardown();
  window.__tourDone = true;
}
function start(which){
  closeMenu();
  if (run) stop();
  if (window.CSO) { var lay = document.getElementById('layer'); if (lay) lay.innerHTML = ''; }
  var steps = TOURS[which] || PHONE;
  run = { steps: steps, i: 0, busy: false, which: TOURS[which] ? which : 'phone' };
  window.__tourDone = false; window.__tourMissing = [];
  document.documentElement.classList.add('touring');
  build();
  show(0);
}
window.CSTour = { start: start, stop: stop, next: next, back: back, menu: openMenu, active: function(){ return !!run; }, busy: function(){ return !!(run && run.busy); }, which: function(){ return run ? run.which : null; }, step: function(){ return run ? run.steps[run.i].id : null; }, steps: function(w){ return (TOURS[w] || PHONE).map(function(s){ return s.id; }); } };

/* pick a tour: Part 1 the office, Part 2 the phone */
function closeMenu(){ if (menu) { menu.remove(); menu = null; document.removeEventListener('keydown', menuKey, true); } }
function menuKey(e){ if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } }
function openMenu(){
  if (run) stop();
  closeMenu();
  menu = document.createElement('div'); menu.className = 'tr-menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Choose a guided tour');
  menu.innerHTML = '<div class="tr-mcard"><div class="tr-top"><span class="tr-n">Guided tour</span><button type="button" class="tr-skip" data-tm="close">Close</button></div>' +
    '<h2 class="tr-h">Which tour?</h2><p class="tr-p">Each one moves only when you press Next, so you can talk over every step. Both start from fresh sample data.</p>' +
    '<button type="button" class="tr-pick" data-tour="office"><b>Part 1: Office tour</b><span>What you see in the office. The board, a defect coming in, isolations, cover for a driver off sick, sign-offs, inspections, people, records. ' + OFFICE.length + ' steps.</span></button>' +
    '<button type="button" class="tr-pick" data-tour="phone"><b>Part 2: Phone tour</b><span>What operatives and fitters see on their phone. Log in, a pre-shift check, LOTOTO read out in English and Polish, the picture check, tap to sign, the fitter\'s jobs. ' + PHONE.length + ' steps.</span></button></div>';
  document.body.appendChild(menu);
  menu.addEventListener('click', function(e){ if (e.target === menu) closeMenu(); });
  menu.querySelector('[data-tm="close"]').onclick = closeMenu;
  menu.querySelectorAll('[data-tour]').forEach(function(b){ b.onclick = function(){ start(b.getAttribute('data-tour')); }; });
  document.addEventListener('keydown', menuKey, true);
  try { menu.querySelector('[data-tour="office"]').focus({ preventScroll: true }); } catch (e) {}
}

/* the Guided tour button, in the office top bar */
var btn = document.createElement('button');
btn.type = 'button'; btn.id = 'tourBtn'; btn.className = 'smallbtn pri tourbtn';
btn.title = 'A guided tour: Part 1 the office, Part 2 the phone';
btn.innerHTML = ic('player-play') + '<span>Guided tour</span>';
btn.addEventListener('click', openMenu);
var ph = document.getElementById('openPhone');
if (ph && ph.parentNode) ph.parentNode.insertBefore(btn, ph);
var tq = (location.search.match(/[?&]tour=(\w+)/) || [])[1];
if (tq) setTimeout(function(){ start(tq === 'office' ? 'office' : 'phone'); }, 500);
})();
