/* Guided tour of the Coastal safety demo: the wow moments only, in the order that sells.
   Seven steps over the real screens: the operative phone (in the office's phone view) and the office.
   Spotlight, a short caption, Next, Back, Skip, the step count, arrow keys and Esc.
   Nothing is read out by the tour: the speakers still only play when someone taps them.
   Start: the Guided tour button in the office top bar, or office.html?tour=1. */
(function(){
'use strict';
var DEAN = 'o1', STEP = 2;   /* Dean, and step 3 of the LOTOTO procedure (Isolate) */
var mob = function(){ return window.innerWidth <= 760; };
var $ = function(s){ return document.querySelector(s); };

/* ---------- the phone inside the office ---------- */
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
function stepNo(){ var c = q('.swphead .code'), st = q('.step'); return c && st ? +c.textContent.split('/')[0] : 0; }
function isLang(l){ var b = q('[data-lang-set="' + l + '"]'); return !!(b && b.classList.contains('on')); }
function setLang(l, done){ if (!q('[data-lang-set]') || isLang(l)) return done(); tap('[data-lang-set="' + l + '"]'); later(150, done); }

/* a fresh phone on the Who are you screen */
function freshPhone(done){
  if (!window.CSO) return done();
  if (!frame()) CSO.openPhone(); else frame().src = 'phone.html';
  waitFor(function(){ return q('[data-op]'); }, 6000, function(){ later(150, done); });
}
/* Dean logs in: his tile, then the PIN typed one number at a time */
function login(done){
  if (!q('[data-op]')) return done();
  tap('[data-op="' + DEAN + '"]');
  waitFor(function(){ return q('[data-k]'); }, 3000, function(){
    var keys = '1234'.split(''), i = 0;
    (function key(){
      if (i >= keys.length) return waitFor(function(){ return q('.act[data-go="swp"]'); }, 3000, function(){ later(150, done); });
      tap('[data-k="' + keys[i++] + '"]'); later(170, key);
    })();
  });
}
/* from the home screen: Procedures, the LOTOTO one, then forward to step n (0 based) */
function openLototo(n, done){
  tap('.act[data-go="swp"]');
  waitFor(function(){ return q('[data-p="lototo"]'); }, 3000, function(){
    tap('[data-p="lototo"]');
    waitFor(function(){ return stepNo() === 1; }, 3000, function(){ forwardTo(n, done); });
  });
}
function forwardTo(n, done){
  (function more(){
    if (stepNo() >= n + 1 || !q('[data-next]')) return later(120, done);
    tap('[data-next]'); later(90, more);
  })();
}
function rebuildToStep(n, done){ freshPhone(function(){ login(function(){ openLototo(n, done); }); }); }
function onLototo(){ var h = q('.swphead .tt'); return !!(h && q('.step') && q('[data-lang-set]')); }

/* LOTOTO step 3, in the language asked for */
function toStep(lang, done){
  var go = function(){ setLang(lang, done); };
  if (onLototo() && stepNo() === STEP + 1) return go();
  rebuildToStep(STEP, go);
}
/* the picture check, in English */
function toQuiz(done){
  if (q('.qo')) return setLang('en', done);
  if (q('[data-again]') && !q('.signbox.signed')) { tap('[data-again]'); return waitFor(function(){ return stepNo() === 1; }, 3000, function(){ toQuiz(done); }); }
  if (onLototo()) return setLang('en', function(){ forwardTo(99, function(){ tap('[data-next]'); waitFor(function(){ return q('.qo'); }, 3000, function(){ later(120, done); }); }); });
  rebuildToStep(0, function(){ toQuiz(done); });
}
/* answer the picture questions right, whatever has been tapped so far, to reach the sign box */
function answerQuiz(done){
  var tries = 0;
  (function one(){
    if (q('[data-sign]') || q('.done') || ++tries > 6) return later(120, done);
    var w = D() && D().defaultView, c = q('.swphead .code');
    if (!q('.qo') || !w || !c) return later(200, one);
    var qi = +c.textContent.split('/')[0] - 1, qs = (w.CS.QUIZ.lototo || []), right = -1;
    if (qs[qi]) qs[qi].a.forEach(function(a, i){ if (a.ok) right = i; });
    tap('.qo[data-q="' + Math.max(0, right) + '"]');
    later(950, one);
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
  waitFor(function(){ return q('.done'); }, 3000, function(){ later(150, done); });
}
function closePhone(){ if (window.CSO && frame()) CSO.closePhone(); }

/* ------------------------------ the steps ------------------------------ */
var STEPS = [
  { id: 'login', phone: true,
    prep: freshPhone,
    title: 'Log in with a tap',
    body: 'Each operative taps their own name, then a 4 number PIN. No usernames, no passwords.',
    target: ['.tiles'], area: ['.ask'],
    next: login },
  { id: 'readout', phone: true,
    prep: function(done){ toStep('en', done); },
    title: 'Every SWP step, read out',
    body: 'Your LOTOTO procedure, one step at a time with a big picture. Tap a speaker and it reads the step out, as often as he likes.',
    target: ['.step'] },
  { id: 'polish', phone: true,
    prep: function(done){ toStep('pl', done); },
    title: 'The same step, in Polish',
    body: 'One tap switches the words and the voice to Polish. Add whichever languages your lads speak.',
    target: ['.step'], area: ['.langbar'] },
  { id: 'quiz', phone: true,
    prep: toQuiz,
    title: 'Did he take it in?',
    body: 'Picture questions check he understood, not just signed. Tap a wrong answer and it plays that step again.',
    target: ['.quiz'], area: ['.ask'] },
  { id: 'sign', phone: true,
    prep: toSign,
    title: 'Tap to sign',
    body: 'Passed? One big tap signs it, with his name and the time. A finger signature is there too if you want one.',
    target: ['[data-sign]', '.done'], area: ['.quizok'],
    next: sign },
  { id: 'office',
    prep: function(done){ closePhone(); if (window.CSO) CSO.tab('sign'); later(200, done); },
    title: 'The office sees it straight away',
    body: 'Who has signed, when, and how they did on the picture check. Anyone who still has not signed is named.',
    target: [function(){ var r = document.querySelectorAll('#view tr[data-new-sign]'); return r[0]; }, '#view .swpc.new'] },
  { id: 'end', end: true,
    prep: function(done){ closePhone(); if (window.CSO) CSO.tab('board'); later(150, done); },
    title: 'This is the demo',
    body: 'The hard part is wiring up the back end, and that\'s what I handle. The look is the easy part: any change you want is five minutes.',
    body2: 'It\'s a custom build, so every section is built round Coastal: you tell me your SWPs, checks, sites and languages.' }
];

/* --------------------------- the engine --------------------------- */
var run = null, spot, card, ticker;
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
    '<h2 class="tr-h">' + esc(s.title) + '</h2>' +
    '<p class="tr-p">' + esc(s.body) + '</p>' + (s.body2 ? '<p class="tr-p">' + esc(s.body2) + '</p>' : '') +
    '<div class="tr-btns"><button type="button" class="tr-back" data-tr="back"' + (run.i === 0 ? ' disabled' : '') + '>Back</button>' +
    '<button type="button" class="tr-next" data-tr="' + (last ? 'skip' : 'next') + '">' + (last ? 'Done' : run.i === n - 2 ? 'Finish' : 'Next') + '</button></div>';
  card.querySelectorAll('[data-tr]').forEach(function(b){
    var a = b.getAttribute('data-tr');
    b.onclick = a === 'next' ? next : a === 'back' ? back : stop;
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
  if (run.i >= run.steps.length - 1) return stop();
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
function start(){
  if (run) stop();
  if (window.CSO) { var lay = document.getElementById('layer'); if (lay) lay.innerHTML = ''; }
  run = { steps: STEPS, i: 0, busy: false };
  window.__tourDone = false; window.__tourMissing = [];
  document.documentElement.classList.add('touring');
  build();
  show(0);
}
window.CSTour = { start: start, stop: stop, next: next, back: back, active: function(){ return !!run; }, busy: function(){ return !!(run && run.busy); }, step: function(){ return run ? run.steps[run.i].id : null; }, steps: function(){ return STEPS.map(function(s){ return s.id; }); } };

/* the Guided tour button, in the office top bar */
var btn = document.createElement('button');
btn.type = 'button'; btn.id = 'tourBtn'; btn.className = 'smallbtn pri tourbtn';
btn.title = 'A short guided tour of the best bits';
btn.innerHTML = ic('player-play') + '<span>Guided tour</span>';
btn.addEventListener('click', start);
var ph = document.getElementById('openPhone');
if (ph && ph.parentNode) ph.parentNode.insertBefore(btn, ph);
if (/[?&]tour=1\b/.test(location.search)) setTimeout(start, 500);
})();
