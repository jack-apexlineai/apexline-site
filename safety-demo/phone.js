/* Operative phone view. Icons first, audio first, short text. */
(function(){
'use strict';
var S = CS.load();
var view = document.getElementById('view');
var backBtn = document.getElementById('backBtn');
var homeBtn = document.getElementById('homeBtn');
var muteBtn = document.getElementById('muteBtn');
var esc = CS.esc;

var ctx = {};          /* current operative, site, machine, check in progress */
var stack = [];        /* screen history for the back button */
var busy = false;      /* blocks double taps during animations */

/* ---------- helpers ---------- */
function $(sel, root){ return (root || view).querySelector(sel); }
function $$(sel, root){ return Array.prototype.slice.call((root || view).querySelectorAll(sel)); }
function buzz(ms){ try { if (navigator.vibrate) navigator.vibrate(ms || 25); } catch (e) {} }
function toast(t){ var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 2600); }

/* Nothing is read out unless the person taps a speaker (Jack, 18 Nov). quiet() is where auto speech used to be. */
function quiet(){}
var talkTimer = null;
function speak(text, lang){
  CS.say(text, lang);
  $$('.say,.replay').forEach(function(b){ b.classList.add('talking'); });
  clearInterval(talkTimer);
  var started = CS.now();
  talkTimer = setInterval(function(){
    var on = CS.speaking();
    if ((!on && CS.now() - started > 600) || CS.now() - started > 20000 || CS.muted) {
      $$('.say,.replay').forEach(function(b){ b.classList.remove('talking'); });
      clearInterval(talkTimer);
    }
  }, 250);
}

/* The same speaker icon, next to every piece of text that matters. Tap it as often as you like. */
function langAttr(lang){ return lang && lang !== 'en' ? ' data-lang="' + lang + '"' : ''; }
function spk(text, cls, lang){ return '<span class="spk' + (cls ? ' ' + cls : '') + '" role="button" tabindex="0" aria-label="Read this out" data-say="' + esc(text) + '"' + langAttr(lang) + '>' + ic('volume') + '</span>'; }
function askHead(title, talk, lang){
  return '<div class="ask"><h1>' + esc(title) + '</h1><button class="say" data-say="' + esc(talk || title) + '"' + langAttr(lang) + ' aria-label="Read it out">' + ic('volume') + '</button></div>';
}
/* Demo language pack: Polish on the LOTOTO procedure only. */
function LP(){ return ctx.lang === 'pl' && ctx.swp && ctx.swp.p.id === 'lototo' && window.CS_PL ? window.CS_PL : null; }
function langBar(){
  if (!ctx.swp || ctx.swp.p.id !== 'lototo' || !window.CS_PL) return '';
  var pl = !!LP();
  return '<div class="langbar"><span class="lbl">' + ic('language') + 'Demo: language pack</span><div class="seg" role="group" aria-label="Language">' +
    '<button type="button" data-lang-set="en" class="' + (pl ? '' : 'on') + '" aria-pressed="' + !pl + '">English</button>' +
    '<button type="button" data-lang-set="pl" class="' + (pl ? 'on' : '') + '" aria-pressed="' + pl + '" lang="pl">Polski</button></div></div>';
}
function crumbs(){
  var h = '<div class="crumbs">';
  if (ctx.op) h += '<span class="crumb">' + CS.avatar(ctx.op) + esc(ctx.op.first) + '</span>';
  if (ctx.site) h += '<span class="crumb">' + ic('map-pin') + esc(ctx.site.name) + '</span>';
  if (ctx.machine) h += '<span class="crumb">' + ic(CS.KIND_ICON[ctx.machine.kind]) + esc(ctx.machine.name) + '</span>';
  return h + '</div>';
}

/* ---------- navigation ---------- */
function go(fn, arg, opts){
  opts = opts || {};
  if (!opts.replace && stack.length) stack[stack.length - 1].scroll = window.scrollY;
  if (opts.reset) stack = [];
  if (opts.replace) stack.pop();
  stack.push({ fn: fn, arg: arg });
  render(false);
}
function back(){
  if (busy || stack.length < 2) return;
  stack.pop();
  render(true);
}
function render(isBack){
  var top = stack[stack.length - 1];
  var out = top.fn(top.arg) || {};
  view.innerHTML = '<div class="screen' + (isBack ? ' back' : '') + '">' + out.html + '</div>';
  window.scrollTo(0, 0);
  backBtn.hidden = stack.length < 2;
  homeBtn.hidden = !ctx.op || top.fn === hub || top.fn === who;
  $$('[data-say]').forEach(function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); e.preventDefault(); buzz(); speak(b.getAttribute('data-say'), b.getAttribute('data-lang')); });
    b.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); speak(b.getAttribute('data-say'), b.getAttribute('data-lang')); } });
  });
  $$('[data-lang-set]').forEach(function(b){
    b.addEventListener('click', function(){ if (busy) return; var v = b.getAttribute('data-lang-set'); if (v === (ctx.lang || 'en')) return; buzz(); ctx.lang = v; render(false); });
  });
  if (out.bind) out.bind($('.screen'));
  if (out.talk) setTimeout(function(){ quiet(out.talk, out.lang); }, 180);
}
backBtn.innerHTML = ic('arrow-left');
homeBtn.innerHTML = ic('home');
backBtn.addEventListener('click', back);
homeBtn.addEventListener('click', function(){ if (!busy) { ctx = { op: ctx.op }; go(hub, null, { reset: true }); } });
function paintMute(){ muteBtn.innerHTML = ic(CS.muted ? 'volume-off' : 'volume-2'); muteBtn.classList.toggle('off', CS.muted); }
muteBtn.addEventListener('click', function(){ CS.setMuted(!CS.muted); paintMute(); if (!CS.muted) quiet('Sound is on'); });
paintMute();

function onTap(root, sel, fn){
  $$(sel, root).forEach(function(el){
    el.addEventListener('click', function(e){ if (busy) return; buzz(); fn(el, e); });
  });
}

/* Big animated tick or cross over the whole screen. */
function burst(kind, then){
  busy = true;
  var d = document.createElement('div');
  d.className = 'burst ' + kind;
  d.innerHTML = '<div class="disc"><svg viewBox="0 0 24 24">' + (kind === 'ok' ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>') + '</svg></div>';
  document.body.appendChild(d);
  setTimeout(function(){ d.classList.add('out'); }, 520);
  setTimeout(function(){ d.remove(); busy = false; then && then(); }, 760);
}

/* ---------- 1. who are you ---------- */
function who(){
  var bySite = CS.SITES.map(function(s){
    return '<div class="sect">' + ic('map-pin') + esc(s.name) + '</div><div class="tiles three">' +
      CS.OPS.filter(function(o){ return o.site === s.id; }).map(function(o){
        return '<button class="tile person" data-op="' + o.id + '">' + CS.avatar(o) + '<span class="nm">' + esc(o.first) + '</span></button>';
      }).join('') + '</div>';
  }).join('');
  return {
    html: askHead('Who are you?', 'Who are you? Tap your name.') + bySite,
    bind: function(r){ onTap(r, '[data-op]', function(el){ ctx = { pin: CS.op(el.dataset.op) }; go(pinPad); }); }
  };
}
function pinPad(){
  var o = ctx.pin, typed = '';
  var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x', 0, 'ok'];
  return {
    html: '<div class="pinwho">' + CS.avatar(o, 'lg') + '<div><b>' + esc(o.first + ' ' + o.last) + '</b><small>' + esc(o.role + ' · ' + CS.site(o.site).name) + '</small></div></div>' +
      askHead('Your PIN', 'Hi ' + o.first + '. Tap your four number PIN. For this demo it is one, two, three, four.') +
      '<div class="pindots" id="pdots"><i></i><i></i><i></i><i></i></div>' +
      '<div class="pinpad">' + keys.map(function(k){ return '<button class="pk' + (typeof k === 'string' ? ' fn' : '') + '" data-k="' + k + '" aria-label="' + (k === 'x' ? 'Delete' : k === 'ok' ? 'Enter' : k) + '">' + (k === 'x' ? ic('arrow-left') : k === 'ok' ? ic('check') : k) + '</button>'; }).join('') + '</div>' +
      '<div class="pinhint">' + ic('key') + 'Demo PIN 1234 ' + spk('For this demo, the PIN is one, two, three, four.') + '</div>',
    talk: 'Hi ' + o.first + '. Tap your PIN.',
    bind: function(r){
      var dots = $$('#pdots i', r);
      function paint(){ dots.forEach(function(d, i){ d.classList.toggle('on', i < typed.length); }); }
      $$('[data-k]', r).forEach(function(b){
        b.addEventListener('click', function(){
          if (busy) return; buzz(15);
          var k = b.dataset.k;
          if (k === 'x') typed = typed.slice(0, -1);
          else if (k === 'ok' || typed.length < 4) { if (k !== 'ok') typed += k; }
          paint();
          if (typed.length === 4 && (k === 'ok' || k !== 'x')) {
            if (typed === CS.PIN) { busy = true; setTimeout(function(){ busy = false; ctx = { op: o }; go(hub, null, { replace: true }); afterLogin(); }, 120); }
            else { r.querySelector('#pdots').classList.add('shake'); quiet('That PIN is not right. Try again.'); setTimeout(function(){ typed = ''; paint(); var pd = r.querySelector('#pdots'); if (pd) pd.classList.remove('shake'); }, 500); }
          }
        });
      });
    }
  };
}
/* QR tag on a machine opens phone.html?m=<id>: after the PIN it goes straight to that machine's check. */
var qrMachine = null;
try { var qm = new URLSearchParams(location.search).get('m'); if (qm && CS.machine(qm)) qrMachine = CS.machine(qm); } catch (e) {}
function afterLogin(){
  if (!qrMachine) return;
  var m = qrMachine; qrMachine = null;
  ctx.flow = 'check'; ctx.site = CS.site(m.site); ctx.machine = m;
  var cd = CS.canDrive(ctx.op.id, m.id);
  if (!cd.ok) return go(notAllowed, { m: m, why: cd.why, what: 'check' });
  if (CS.doNotUse(m.id)) return go(dnuScreen);
  go(pickType);
}

/* ---------- 2. personal home ---------- */
function pill(c, t){ return '<span class="pp ' + c + '">' + esc(t) + '</span>'; }
function todo(icon, title, sub, attr, cls, sayText){
  return '<button class="todo ' + (cls || '') + '" ' + attr + '>' + ic(icon) + '<span class="txt"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span>' + spk(sayText || (title + '. ' + sub)) + ic('chevron-right') + '</button>';
}
function hub(){
  var o = ctx.op, mine = CS.activeLocks().filter(function(l){ return l.op === o.id; });
  var due = o.drive.map(CS.machine).filter(function(m){ return m.site === o.site && !CS.checksToday(m.id, 'pre').length && !CS.activeLocks(m.id).length && !CS.doNotUse(m.id) && CS.canDrive(o.id, m.id).ok; });
  var toSign = CS.SWPS.filter(function(p){ return !CS.hasSigned(p.id, o.id); });
  var tbtDue = o.site === CS.TBT.site && !CS.atTbt(o.id);
  var permits = CS.openPermits().filter(function(p){ return CS.machine(p.machine).site === o.site; });
  var jobs = o.fitter ? CS.openDefects().filter(function(d){ return d.assigned === o.id; }).sort(function(a, b){ return (a.severity === 'serious' ? 0 : 1) - (b.severity === 'serious' ? 0 : 1); }) : [];
  var tr = CS.training(o.id);
  var h = '<div class="me">' + CS.avatar(o, 'lg') + '<div class="mt"><h1>Hi ' + esc(o.first) + '</h1><small>' + esc(o.role + ' · ' + CS.site(o.site).name) + ' · Lock ' + o.lock + '</small></div>' +
    spk('Hi ' + o.first + '. This is your page. ' + (o.fitter ? 'You have ' + jobs.length + ' job' + (jobs.length === 1 ? '' : 's') + ' to fix. ' : '') + (due.length ? due.length + ' check' + (due.length > 1 ? 's' : '') + ' due. ' : 'Your checks are done. ') + (mine.length ? 'You have a lock on. ' : '') + (toSign.length ? toSign.length + ' procedure' + (toSign.length > 1 ? 's' : '') + ' to sign.' : '')) + '</div>';
  /* fitter: jobs and maintenance isolations first */
  if (o.fitter) {
    h += '<div class="sect">' + ic('tools') + 'Jobs for me' + spk('Jobs for me. Defects the operatives reported, sent to you.') + '</div><div class="todos">' +
      (jobs.length ? jobs.map(function(d){ var m = CS.machine(d.machine); return todo(d.severity === 'serious' ? 'hand-stop' : 'alert-triangle', m.name + ': ' + (d.title ? d.title.replace(m.name + ': ', '') : d.note), (d.severity === 'serious' ? 'Do not use' : 'Minor') + ' · ' + CS.op(d.op).first + ' · ' + CS.hm(d.at), 'data-job="' + d.id + '"', d.severity === 'serious' ? 'red' : 'amber', m.name + '. ' + d.note); }).join('') : '<div class="none">' + ic('circle-check') + 'No jobs waiting</div>') + '</div>';
    h += '<div class="sect">' + ic('shield-lock') + 'Maintenance isolations' + spk('Maintenance isolations. Permits to work that are open on your site.') + '</div><div class="todos">' +
      (permits.length ? permits.map(function(p){ var m = CS.machine(p.machine); return todo('shield-lock', p.id + ' · ' + m.name, p.job + ' · ' + p.workers.length + ' lock' + (p.workers.length > 1 ? 's' : '') + ' on the box', 'data-permit="' + p.id + '"', 'lock'); }).join('') : '<div class="none">' + ic('lock-open') + 'No permits open</div>') + '</div>';
  }
  /* big actions */
  h += '<div class="acts">' +
    '<button class="act hi" data-go="check">' + ic('clipboard-check') + '<b>Check a machine</b>' + spk('Check a machine. Pre shift, running or post shift.') + '</button>' +
    '<button class="act mic" data-go="voice">' + ic('microphone') + '<b>Report a defect</b><small>Just say it</small>' + spk('Report a defect. Tap, and just say what is wrong.') + '</button>' +
    '<button class="act" data-go="near">' + ic('alert-octagon') + '<b>Near miss</b><small>Just say it</small>' + spk('Near miss. Tap, and say what nearly happened.') + '</button>' +
    '<button class="act" data-go="swp">' + (toSign.length ? '<span class="newtag">' + toSign.length + ' TO SIGN</span>' : '') + ic('file-text') + '<b>Procedures</b><small>Listen, then sign</small>' + spk('Safe work procedures. Listen, then sign.') + '</button>' +
    '<button class="act' + (mine.length ? ' locked' : '') + '" data-go="lock">' + ic(mine.length ? 'lock' : 'lock-open') + '<b>My lock</b><small>' + (mine.length ? 'On ' + esc(mine.map(function(l){ return CS.machine(l.machine).name; }).join(', ')) : 'Lock on, lock off') + '</small>' + spk('My lock. Lock on, lock off.') + '</button>' +
    '<button class="act" data-go="tbt">' + (tbtDue ? '<span class="newtag">TODAY</span>' : '') + ic('users-group') + '<b>Toolbox talk</b><small>' + (tbtDue ? 'Not signed' : o.site === CS.TBT.site ? 'Signed' : 'None today') + '</small>' + spk('Toolbox talk.') + '</button>' +
    '</div>';
  /* today for you */
  var items = '';
  mine.forEach(function(l){ var m = CS.machine(l.machine); items += todo('lock', 'Your lock is on ' + m.name, 'Since ' + CS.hm(l.on) + ' (' + CS.since(l.on) + ')' + (l.permit ? ' · ' + l.permit : ''), l.permit ? 'data-permit="' + l.permit + '"' : 'data-go2="lock"', 'lock'); });
  if (!o.fitter) permits.forEach(function(p){ if (p.workers.indexOf(o.id) >= 0) return; if (!CS.canIsolate(o.id, p.machine).ok) return; var m = CS.machine(p.machine); items += todo('shield-lock', 'Join permit ' + p.id, m.name + ': put your lock on the group box before you go in', 'data-permit="' + p.id + '"', 'lock'); });
  due.forEach(function(m){ items += todo(CS.KIND_ICON[m.kind], m.name + ': pre-shift check', 'Due now · ' + CS.checklist(m, 'pre').length + ' checks', 'data-due="' + m.id + '"', 'hi'); });
  toSign.forEach(function(p){ items += todo('file-text', p.title, (p.isNew ? 'New. ' : '') + 'Listen and sign · ' + p.mins + ' min', 'data-swp="' + p.id + '"', p.isNew ? 'amber' : ''); });
  if (tbtDue) items += todo('users-group', 'Toolbox talk: ' + CS.TBT.title, 'Listen and sign you were there', 'data-go2="tbt"', 'amber');
  h += '<div class="sect">' + ic('clock') + 'Today for you' + spk('Today for you. The things you still need to do.') + '</div><div class="todos">' + (items || '<div class="none">' + ic('circle-check') + 'All done for now</div>') + '</div>';
  /* my machines and authorisations */
  h += '<div class="sect">' + ic('id-badge') + 'My machines' + spk('My machines. The machines you are trained to use, and the ones you are allowed to lock off.') + '</div><div class="card mach">' +
    '<div class="lbl">Trained to use</div><div class="chips">' + o.drive.map(function(id){ var m = CS.machine(id), st = CS.status(id), cd = CS.canDrive(o.id, id); return '<span class="mchip ' + (cd.ok ? st.c : 'red') + '">' + ic(CS.KIND_ICON[m.kind]) + esc(m.name) + (cd.ok ? '' : ' · card expired') + '</span>'; }).join('') + '</div>' +
    '<div class="lbl">Allowed to isolate (lock off)</div><div class="chips">' + (o.iso.length ? o.iso.map(function(id){ var m = CS.machine(id); return '<span class="mchip lockc">' + ic('lock') + esc(m.name) + '</span>'; }).join('') : '<span class="mchip red">' + ic('hand-stop') + 'Not authorised yet. Needs LOTOTO training</span>') + '</div></div>';
  /* training */
  h += '<div class="sect">' + ic('school') + 'My training' + spk('My training. Green is in date. Amber is due soon. Red is out of date or not done.') + '</div><div class="card trn">' +
    tr.map(function(t){ var st = CS.tStatus(t); return '<div class="tr"><i class="dot ' + st.c + '"></i><span class="tn">' + esc(t.name) + '</span>' + pill(st.c, st.label) + '</div>'; }).join('') + '</div>' +
    '<button class="bigbtn ghost" data-out>' + ic('arrow-left') + 'Not ' + esc(o.first) + '? Switch person</button>';
  return {
    html: h,
    talk: 'Hi ' + o.first + '.' + (o.fitter && jobs.length ? ' You have ' + jobs.length + ' job' + (jobs.length > 1 ? 's' : '') + '.' : due.length ? ' You have ' + due.length + ' check' + (due.length > 1 ? 's' : '') + ' due.' : ''),
    bind: function(r){
      onTap(r, '[data-go]', function(el){
        var g = el.dataset.go;
        if (g === 'check') { ctx.flow = 'check'; go(pickSite); }
        if (g === 'voice') { ctx.v = null; go(voice, 'defect'); }
        if (g === 'near') { ctx.v = null; go(voice, 'nearmiss'); }
        if (g === 'swp') go(swpList);
        if (g === 'lock') go(lockHome);
        if (g === 'tbt') go(tbtView);
      });
      onTap(r, '[data-go2]', function(el){ if (el.dataset.go2 === 'lock') go(lockHome); else go(tbtView); });
      onTap(r, '[data-due]', function(el){ var m = CS.machine(el.dataset.due); ctx.flow = 'check'; ctx.site = CS.site(m.site); ctx.machine = m; go(pickType); });
      onTap(r, '[data-swp]', function(el){ ctx.swp = { p: CS.byId(CS.SWPS, el.dataset.swp), step: 0, sig: null, saved: false, tries: 0 }; go(swpStep, 0); });
      onTap(r, '[data-job]', function(el){ go(fitterJob, el.dataset.job); });
      onTap(r, '[data-permit]', function(el){ go(permitView, el.dataset.permit); });
      onTap(r, '[data-out]', function(){ ctx = {}; go(who, null, { reset: true }); });
    }
  };
}

/* ---------- 3. site ---------- */
function pickSite(){
  return {
    html: askHead('Which site?', 'Which site are you on?') +
      '<div class="tiles one">' + CS.SITES.map(function(s){
        return '<button class="tile row big' + (s.id === ctx.op.site ? ' hi' : '') + '" data-site="' + s.id + '">' + ic('building-factory-2') + '<span class="txt"><span class="nm">' + esc(s.name) + '</span><span class="sub" style="display:block">' + esc(s.town) + '</span></span></button>';
      }).join('') + '</div>',
    talk: 'Which site are you on?',
    bind: function(r){ onTap(r, '[data-site]', function(el){ ctx.site = CS.site(el.dataset.site); ctx.machine = null; go(pickMachine); }); }
  };
}

/* ---------- 4. machine ---------- */
function machineTile(m){
  var st = CS.status(m.id), flag = '', cls = '';
  var auth = ctx.flow === 'lock' ? CS.canIsolate(ctx.op.id, m.id) : CS.canDrive(ctx.op.id, m.id);
  if (!auth.ok) { flag = '<span class="flag no">' + (ctx.flow === 'lock' ? 'Not authorised' : 'Not trained') + '</span>'; cls = ' noauth has-flag'; }
  else if (st.dnu) { flag = '<span class="flag dnu">Do not use</span>'; cls = ' dnu has-flag'; }
  else if (st.locks.length) { flag = '<span class="flag lock">Locked out</span>'; cls = ' locked has-flag'; }
  else if (ctx.flow === 'check' && CS.checksToday(m.id, 'pre').length) { flag = '<span class="flag done">Pre-shift done</span>'; cls = ' has-flag'; }
  return '<button class="tile' + cls + '" data-m="' + m.id + '">' + flag + ic(CS.KIND_ICON[m.kind]) + '<span class="nm">' + esc(m.name) + '</span><span class="sub">' + esc(m.ref.replace('Asset ', '')) + '</span></button>';
}
function pickMachine(){
  var ms = CS.MACHINES.filter(function(m){ return m.site === ctx.site.id; });
  var mob = ms.filter(function(m){ return m.group === 'mobile'; }), fix = ms.filter(function(m){ return m.group === 'fixed'; });
  var lockFlow = ctx.flow === 'lock';
  var groups = lockFlow ? [['Fixed plant', fix, 'building-factory-2'], ['Mobile plant', mob, 'bulldozer']] : [['Mobile plant', mob, 'bulldozer'], ['Fixed plant', fix, 'building-factory-2']];
  return {
    html: crumbs() + askHead(lockFlow ? 'Lock on which machine?' : 'Which machine?', lockFlow ? 'Which machine are you isolating?' : 'Which machine are you checking?') +
      groups.map(function(g){ return '<div class="sect">' + ic(g[2]) + g[0] + '</div><div class="tiles">' + g[1].map(machineTile).join('') + '</div>'; }).join(''),
    talk: lockFlow ? 'Which machine are you isolating?' : 'Which machine?',
    bind: function(r){
      onTap(r, '[data-m]', function(el){
        ctx.machine = CS.machine(el.dataset.m);
        var a = lockFlow ? CS.canIsolate(ctx.op.id, ctx.machine.id) : CS.canDrive(ctx.op.id, ctx.machine.id);
        if (!a.ok) return go(notAllowed, { m: ctx.machine, why: a.why, what: lockFlow ? 'isolate' : 'check' });
        if (lockFlow) return go(lockConfirm);
        if (CS.doNotUse(ctx.machine.id)) return go(dnuScreen);
        go(pickType);
      });
    }
  };
}

function notAllowed(a){
  var m = a.m, isIso = a.what === 'isolate';
  var talk = 'Stop. You are not allowed to ' + (isIso ? 'isolate ' : 'use ') + m.name + '. ' + a.why + ' Call your supervisor.';
  return {
    html: crumbs() + '<div class="done red" style="flex:0;padding-top:0"><div class="disc">' + ic('hand-stop').replace('class="ic ', 'style="font-size:96px;color:#fff" class="ic ') + '</div><h1>' + (isIso ? 'Not authorised' : 'Not trained') + '</h1>' +
      '<div class="meta">You cannot ' + (isIso ? 'put a lock on' : 'check or drive') + ' <b>' + esc(m.name) + '</b>.<br>' + esc(a.why) + ' ' + spk(talk) + '</div>' +
      '<div class="stamp">' + ic('users') + 'Call your supervisor. The office can see this.</div></div>' +
      '<button class="bigbtn ghost" data-back>' + ic('arrow-left') + 'Back</button>',
    talk: talk,
    bind: function(r){ onTap(r, '[data-back]', back); }
  };
}
function dnuScreen(){
  var m = ctx.machine, d = CS.openDefects(m.id).filter(function(x){ return x.severity === 'serious'; })[0], by = CS.op(d.op);
  return {
    html: crumbs() + '<div class="done red" style="flex:0;padding-top:0"><div class="disc">' + ic('hand-stop').replace('class="ic ', 'style="font-size:96px;color:#fff" class="ic ') + '</div><h1>Do not use</h1>' +
      '<div class="meta"><b>' + esc(m.name) + '</b> has a serious defect.<br>' + esc(d.note) + '</div>' +
      '<div class="stamp">' + CS.avatar(by, 'xs') + 'Reported by ' + esc(by.first) + ' at ' + CS.hm(d.at) + '</div></div>' +
      (d.photo ? '<img src="' + d.photo + '" alt="Defect photo" style="width:100%;border-radius:18px;margin:16px 0 0;border:1px solid var(--line)">' : '') +
      '<button class="bigbtn ghost" data-back>' + ic('arrow-left') + 'Pick another machine</button>',
    talk: 'Stop. Do not use ' + m.name + '. ' + d.note + '. Tell your supervisor.',
    bind: function(r){ onTap(r, '[data-back]', back); }
  };
}

/* ---------- 5. check type ---------- */
function pickType(){
  var m = ctx.machine;
  return {
    html: crumbs() + askHead('Which check?', 'Which check? Pre shift. Running. Or post shift.') +
      '<div class="tiles one">' + CS.CHECK_TYPES.map(function(t){
        var done = CS.checksToday(m.id, t.id)[0];
        return '<button class="tile row big' + (t.id === 'pre' && !done ? ' hi' : '') + '" data-t="' + t.id + '">' + ic(t.icon) + '<span class="txt"><span class="nm">' + t.name + '</span><span class="sub" style="display:block">' + (done ? 'Done by ' + esc(CS.op(done.op).first) + ' at ' + CS.hm(done.at) : CS.checklist(m, t.id).length + ' checks') + '</span></span></button>';
      }).join('') + '</div>' +
      (CS.activeLocks(m.id).length ? '<div class="lockcard" style="margin-top:14px">' + ic('lock') + '<div><b>Locked out</b><small>' + CS.activeLocks(m.id).map(function(l){ return esc(CS.op(l.op).first); }).join(', ') + ' has a lock on. Do not start it.</small></div></div>' : ''),
    talk: 'Which check?',
    bind: function(r){
      onTap(r, '[data-t]', function(el){
        var t = el.dataset.t;
        ctx.check = { id: CS.uid('c'), type: t, list: CS.checklist(m, t), idx: 0, answers: [], defects: [], sig: null, saved: false };
        go(item);
      });
    }
  };
}

/* ---------- 6. one check item per screen ---------- */
function item(){
  var c = ctx.check, it = c.list[c.idx], n = c.list.length;
  var prog = c.list.map(function(_, i){ var a = c.answers[i]; return '<i class="' + (a === true ? 'ok' : a === false ? 'bad' : i === c.idx ? 'cur' : '') + '"></i>'; }).join('');
  var talk = it.t + '. ' + it.s + ' Is it OK?';
  return {
    html: '<div class="prog">' + prog + '</div>' +
      '<div class="item"><span class="num">' + (c.idx + 1) + ' of ' + n + ' · ' + esc(ctx.machine.name) + '</span>' +
      '<div class="bigic">' + ic(it.i) + '</div><h2>' + esc(it.t) + spk(it.t + '. ' + it.s) + '</h2><p>' + esc(it.s) + spk(it.s) + '</p>' +
      '<button class="replay" data-say="' + esc(talk) + '">' + ic('volume') + 'Play again</button></div>' +
      '<div class="yn"><button class="n" data-a="0" aria-label="Not OK">' + ic('x') + '<span>Not OK</span>' + spk('Red cross. Not OK. Tap this if there is a problem.', 'onbtn') + '</button><button class="y" data-a="1" aria-label="OK">' + ic('check') + '<span>OK</span>' + spk('Green tick. OK. Tap this if it is fine.', 'onbtn') + '</button></div>',
    talk: talk,
    bind: function(r){
      onTap(r, '[data-a]', function(el){
        if (c.answers[c.idx] !== undefined && c.answers.length > c.idx) { /* already answered this one */ }
        var ok = el.dataset.a === '1';
        c.answers[c.idx] = ok;
        CS.stop();
        burst(ok ? 'ok' : 'bad', function(){
          if (!ok) return go(defect, null, { replace: true });
          nextItem(true);
        });
      });
    }
  };
}
function nextItem(replace){
  var c = ctx.check;
  if (c.idx < c.list.length - 1) { c.idx++; go(item, null, { replace: replace }); }
  else go(summary, null, { replace: replace });
}

/* ---------- 7. defect: photo + severity ---------- */
function defect(){
  var c = ctx.check, it = c.list[c.idx];
  var d = c.pending = c.pending && c.pending.idx === c.idx ? c.pending : { idx: c.idx, item: it.t, note: it.t + ' not OK', photo: null };
  return {
    html: '<div class="ask"><h1>' + esc(it.t) + ' not OK</h1><button class="say" data-say="Take a photo if you can. Then tell us how bad it is." aria-label="Read it out">' + ic('volume') + '</button></div>' +
      '<label class="photo" id="ph">' + (d.photo ? '<img src="' + d.photo + '" alt="Your photo"><span class="retake">Retake</span>' : ic('camera') + 'Take a photo<small>If you can</small>') +
      '<input type="file" accept="image/*" capture="environment" aria-label="Take a photo"></label>' +
      '<button class="bigbtn ghost" data-vd>' + ic('microphone') + 'Say what is wrong instead</button>' +
      '<div class="sect">' + ic('alert-triangle') + 'How bad is it?' + spk('How bad is it? Minor, still safe to use, fix soon. Or serious, not safe, do not use.') + '</div>' +
      '<div class="sev"><button class="minor" data-sev="minor">' + ic('alert-triangle') + '<span><b>Minor</b><small>Still safe to use. Fix soon.</small></span></button>' +
      '<button class="serious" data-sev="serious">' + ic('hand-stop') + '<span><b>Serious</b><small>Not safe. Do not use.</small></span></button></div>',
    talk: 'Take a photo if you can. Then tell us how bad it is. Minor, still safe to use. Or serious, do not use.',
    bind: function(r){
      var inp = $('input[type=file]', r);
      inp.addEventListener('change', function(){
        var f = inp.files && inp.files[0]; if (!f) return;
        shrink(f, function(url){ d.photo = url; go(defect, null, { replace: true }); });
      });
      onTap(r, '[data-vd]', function(){ ctx.v = null; go(voice, { kind: 'defect', fromCheck: true }); });
      onTap(r, '[data-sev]', function(el){
        d.severity = el.dataset.sev;
        c.defects = c.defects.filter(function(x){ return x.idx !== c.idx; });
        c.defects.push(d); c.pending = null;
        if (d.severity === 'serious') quiet('Serious. ' + ctx.machine.name + ' will be marked do not use.');
        nextItem(true);
      });
    }
  };
}
function shrink(file, cb){
  var rd = new FileReader();
  rd.onload = function(){
    var img = new Image();
    img.onload = function(){
      var max = 640, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
      var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      try { cb(cv.toDataURL('image/jpeg', 0.7)); } catch (e) { cb(null); }
    };
    img.onerror = function(){ toast('Could not read that photo'); };
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}

/* ---------- 8. summary + tap to sign ---------- */
function sigPad(r, onDraw){
  var wrap = $('.sigpad', r), cv = $('canvas', wrap), g = cv.getContext('2d'), drawing = false, drawn = false;
  function size(){ var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; g.scale(dpr, dpr); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111'; }
  size();
  function pos(e){ var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
  cv.addEventListener('pointerdown', function(e){ drawing = true; cv.setPointerCapture(e.pointerId); var p = pos(e); g.beginPath(); g.moveTo(p[0], p[1]); e.preventDefault(); });
  cv.addEventListener('pointermove', function(e){ if (!drawing) return; var p = pos(e); g.lineTo(p[0], p[1]); g.stroke(); drawn = true; });
  cv.addEventListener('pointerup', function(){ drawing = false; if (drawn) onDraw(cv.toDataURL('image/png')); });
  $('.clr', wrap).addEventListener('click', function(){ g.clearRect(0, 0, cv.width, cv.height); drawn = false; onDraw(null); });
}
function sigBlock(U){
  return '<button class="sigtoggle" data-sigt>' + ic('signature') + (U ? U.sigToggle : 'Add your finger signature') + ' <span style="color:var(--muted);font-weight:600">' + (U ? U.optional : '(optional)') + '</span></button>' +
    '<div class="sigpad" hidden><canvas></canvas><span class="line"></span><span class="hint">' + (U ? U.sigHint : 'Sign here with your finger') + '</span><button class="clr" type="button">' + (U ? U.clear : 'Clear') + '</button></div>';
}
function bindSig(r, holder){
  var t = $('[data-sigt]', r), pad = $('.sigpad', r), ready = false;
  t.addEventListener('click', function(){ pad.hidden = !pad.hidden; if (!ready && !pad.hidden) { ready = true; sigPad(r, function(u){ holder.sig = u; }); } });
}
function summary(){
  var c = ctx.check, m = ctx.machine, t = CS.byId(CS.CHECK_TYPES, c.type);
  var fails = c.answers.filter(function(a){ return a === false; }).length;
  var serious = c.defects.some(function(d){ return d.severity === 'serious'; });
  var rows = c.list.map(function(it, i){
    var ok = c.answers[i] !== false, d = c.defects.filter(function(x){ return x.idx === i; })[0];
    return '<div class="r ' + (ok ? 'ok' : 'bad') + '">' + ic(it.i) + '<span class="t">' + esc(it.t) + (d ? '<em>' + (d.severity === 'serious' ? 'Serious, do not use' : 'Minor') + (d.photo ? ' · photo' : '') + '</em>' : '') + '</span><span class="res">' + ic(ok ? 'check' : 'x') + '</span></div>';
  }).join('');
  var talk = fails ? 'You found ' + fails + ' problem' + (fails > 1 ? 's' : '') + '. Tap the big box to sign.' : 'All OK. Tap the big box to sign.';
  return {
    html: crumbs() + askHead(fails ? fails + ' problem' + (fails > 1 ? 's' : '') + ' found' : 'All OK', talk) +
      (serious ? '<div class="dnubanner">' + ic('hand-stop') + '<span>' + esc(m.name) + ' will be marked Do not use<small>The office sees it straight away</small></span></div>' : '') +
      '<div class="sum">' + rows + '</div>' +
      sigBlock() + '<div class="saynext">' + spk('Tap the big box to sign. That puts your name on this check.') + 'What does signing mean?</div>' +
      '<button class="signbox pulse" data-sign>' + ic('hand-finger') + 'Tap here to sign<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + t.name + ' check</small></button>',
    talk: talk,
    bind: function(r){
      bindSig(r, c);
      var box = $('[data-sign]', r);
      box.addEventListener('click', function(){
        if (busy || c.saved) return;
        c.saved = true; buzz(40);
        box.classList.remove('pulse'); box.classList.add('signed');
        box.innerHTML = ic('circle-check') + 'Signed<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + CS.hm(CS.now()) + '</small>';
        S = CS.load();
        var rec = { id: c.id, machine: m.id, op: ctx.op.id, type: c.type, at: CS.now(), signed: true, sig: c.sig || null,
          items: c.list.map(function(it, i){ return { t: it.t, ok: c.answers[i] !== false }; }),
          defects: c.defects.map(function(d){ return { item: d.item, note: d.note, severity: d.severity, photo: d.photo }; }) };
        CS.saveCheck(rec);
        burst(serious ? 'bad' : 'ok', function(){ go(checkDone, rec, { replace: true }); });
      });
    }
  };
}
function checkDone(rec){
  var m = ctx.machine, t = CS.byId(CS.CHECK_TYPES, rec.type), dnu = CS.doNotUse(m.id);
  stack = [stack[0], stack[1], stack[stack.length - 1]];
  var talk = dnu ? 'Thank you ' + ctx.op.first + '. Your check is saved. ' + m.name + ' is now marked do not use. Tell your supervisor.' : 'Thank you ' + ctx.op.first + '. Your check is saved.';
  return {
    html: '<div class="done' + (dnu ? ' red' : '') + '"><div class="disc">' + (dnu ? ic('hand-stop').replace('class="ic ', 'style="font-size:92px;color:#fff" class="ic ') : '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>') + '</div>' +
      '<h1>' + (dnu ? 'Saved. Do not use.' : 'Done, ' + esc(ctx.op.first)) + '</h1>' +
      '<div class="meta"><b>' + t.name + ' check</b> on <b>' + esc(m.name) + '</b></div>' +
      '<div class="stamp">' + ic('clock') + CS.hm(rec.at) + ' · ' + CS.dayLabel(rec.at) + '</div>' +
      '<div class="stamp">' + ic('signature') + 'Signed by ' + esc(ctx.op.first + ' ' + ctx.op.last) + '</div></div>' +
      '<div class="twin"><button class="bigbtn ghost" data-more>' + ic('clipboard-check') + 'Another</button><button class="bigbtn" data-home>' + ic('home') + 'Home</button></div>',
    talk: talk,
    bind: function(r){
      onTap(r, '[data-home]', function(){ ctx = { op: ctx.op }; go(hub, null, { reset: true }); });
      onTap(r, '[data-more]', function(){ ctx = { op: ctx.op, site: ctx.site, flow: 'check' }; stack = [stack[0], stack[1]]; go(pickSite); go(pickMachine); });
    }
  };
}

/* ---------- SWP library ---------- */
function swpList(){
  return {
    html: askHead('Safe work procedures', 'Pick a procedure. It will be read out to you, one step at a time.') +
      '<div class="tiles one">' + CS.SWPS.map(function(p){
        var signed = CS.hasSigned(p.id, ctx.op.id);
        return '<button class="tile row' + (p.isNew && !signed ? ' hi' : '') + '" data-p="' + p.id + '">' + (p.isNew && !signed ? '<span class="newtag">NEW</span>' : '') + ic(p.icon) +
          '<span class="txt"><span class="nm">' + esc(p.title) + '</span><span class="sub" style="display:block">' + p.steps.length + ' steps · ' + p.mins + ' min · ' + (signed ? '<span style="color:var(--ok)">Signed</span>' : '<span style="color:var(--hivis)">Not signed yet</span>') + '</span></span></button>';
      }).join('') + '</div>',
    talk: 'Pick a procedure. It will be read out to you.',
    bind: function(r){ onTap(r, '[data-p]', function(el){ ctx.swp = { p: CS.byId(CS.SWPS, el.dataset.p), step: 0, sig: null, saved: false }; go(swpStep, 0); }); }
  };
}
function bakerFor(){ return CS.MACHINES.filter(function(m){ return m.site === ctx.op.site && m.kind === ctx.swp.p.machineKind; })[0]; }
function swpStep(i){
  var p = ctx.swp.p, st = p.steps[i], n = p.steps.length;
  var L = LP(), U = L && L.ui, lg = L ? L.code : null, T = L ? L.swp.lototo : null;
  var sTitle = T ? T.title : p.title, sT = T ? T.steps[i].t : st.t, sS = T ? T.steps[i].s : st.s, word = U ? U.step : 'Step';
  var prog = p.steps.map(function(_, k){ return '<i class="' + (k < i ? 'ok' : k === i ? 'cur' : '') + '"></i>'; }).join('');
  var talk = word + ' ' + (i + 1) + '. ' + sT + '. ' + sS;
  var lockBtn = '';
  if (st.lockAction) {
    var bm = bakerFor();
    if (bm && !CS.canIsolate(ctx.op.id, bm.id).ok) {
      var why = CS.canIsolate(ctx.op.id, bm.id).why;
      if (U) why = U.noAuthWhy(bm.name, /not done/.test(why));
      var naT = U ? U.noAuth(bm.name) : 'You are not authorised to lock off ' + bm.name, naL = U ? U.noAuthLearn : 'Listen and learn the steps, but an authorised person does the isolation.';
      lockBtn = '<div class="noauthcard">' + ic('hand-stop') + '<div><b>' + esc(naT) + '</b><small>' + esc(why) + ' ' + esc(naL) + '</small></div>' + spk(naT + '. ' + why, '', lg) + '</div>';
    } else if (bm) {
      var has = CS.activeLocks(bm.id).some(function(l){ return l.op === ctx.op.id; });
      lockBtn = '<button class="lockrec' + (has ? ' on' : '') + '" data-lock="' + bm.id + '">' + ic(has ? 'lock-check' : 'lock') + esc(has ? (U ? U.lockOn(bm.name) : 'Your lock is on ' + bm.name) : (U ? U.lockTap(bm.name) : 'Tap when your lock is on ' + bm.name)) + '</button>';
    }
  }
  return {
    html: langBar() + '<div class="swphead"' + (lg ? ' lang="' + lg + '"' : '') + '>' + ic(p.icon).replace('class="ic ', 'style="font-size:26px;color:var(--brand-hi)" class="ic ') + '<span class="tt">' + esc(sTitle) + '</span><span class="code">' + (i + 1) + '/' + n + '</span></div>' +
      '<div class="prog">' + prog + '</div>' +
      '<div class="step' + (st.lockAction ? ' lockstep' : '') + '"' + (lg ? ' lang="' + lg + '"' : '') + '><span class="stepno">' + (i + 1) + '</span><div class="bigic">' + ic(st.i) + '</div><h2>' + esc(sT) + spk(word + ' ' + (i + 1) + '. ' + sT, '', lg) + '</h2><p>' + esc(sS) + spk(sS, '', lg) + '</p>' + lockBtn + '</div>' +
      '<div class="navrow"><button class="rep" data-rep>' + ic('repeat') + (U ? U.repeat : 'Repeat') + '</button><button class="nxt" data-next>' + (i === n - 1 ? (U ? U.finish : 'Finish') : (U ? U.next : 'Next')) + ic('arrow-right') + '</button></div>',
    talk: talk, lang: lg,
    bind: function(r){
      onTap(r, '[data-rep]', function(){ speak(talk, lg); });
      onTap(r, '[data-next]', function(){ if (i < n - 1) go(swpStep, i + 1); else { ctx.swp.q = 0; ctx.swp.tries = 0; ctx.swp.right = 0; go(swpQuiz, 0); } });
      onTap(r, '[data-lock]', function(el){
        var mid = el.dataset.lock;
        if (CS.activeLocks(mid).some(function(l){ return l.op === ctx.op.id; })) return;
        S = CS.load(); if (!CS.lockOn(mid, ctx.op.id, 'Isolation: ' + p.title)) return;
        el.classList.add('on'); el.innerHTML = ic('lock-check') + esc(U ? U.lockOn(CS.machine(mid).name) : 'Your lock is on ' + CS.machine(mid).name);
        quiet(U ? U.lockSay : 'Your lock is on. The office can see it.', lg);
      });
    }
  };
}
function swpSign(){
  var sw = ctx.swp, p = sw.p, L = LP(), U = L && L.ui, lg = L ? L.code : null;
  return {
    html: langBar() + '<div' + (lg ? ' lang="' + lg + '"' : '') + '><div class="swphead">' + ic(p.icon).replace('class="ic ', 'style="font-size:26px;color:var(--brand-hi)" class="ic ') + '<span class="tt">' + esc(L ? L.swp.lototo.title : p.title) + '</span><span class="code">' + esc(p.code) + '</span></div>' +
      (sw.quiz ? '<div class="quizok">' + ic('circle-check') + '<span>' + (U ? esc(U.quizOk(sw.quiz.right, sw.quiz.of, sw.quiz.tries)) : 'You answered ' + sw.quiz.right + ' of ' + sw.quiz.of + ' picture questions' + (sw.quiz.tries > 1 ? ', after another listen' : ' first time')) + '</span></div>' : '') +
      askHead(U ? U.understand : 'Do you understand?', U ? U.understandSay : 'Do you understand this procedure? If yes, tap the big box to sign. If not, play it again or ask your supervisor.', lg) +
      '<button class="signbox pulse" data-sign>' + ic('hand-finger') + (U ? U.iUnderstand : 'I understand') + '<small>' + (U ? U.tapToSign : 'Tap to sign') + ' · ' + esc(ctx.op.first + ' ' + ctx.op.last) + '</small></button>' +
      sigBlock(U) +
      '<button class="bigbtn ghost" data-again>' + ic('repeat') + (U ? U.again : 'Play it again from the start') + '</button></div>',
    talk: U ? U.understandTalk : 'Do you understand this procedure? If yes, tap the big box to sign.', lang: lg,
    bind: function(r){
      bindSig(r, sw);
      onTap(r, '[data-again]', function(){ go(swpStep, 0); });
      var box = $('[data-sign]', r);
      box.addEventListener('click', function(){
        if (busy || sw.saved) return;
        sw.saved = true; buzz(40);
        box.classList.remove('pulse'); box.classList.add('signed');
        box.innerHTML = ic('circle-check') + (U ? U.signed : 'Signed') + '<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + CS.hm(CS.now()) + '</small>';
        S = CS.load();
        var rec = CS.signSwp(p.id, ctx.op.id, sw.sig, sw.quiz || null, lg);
        burst('ok', function(){ go(swpDone, rec, { replace: true }); });
      });
    }
  };
}
function swpDone(rec){
  var p = ctx.swp.p, L = rec && rec.lang === 'pl' ? LP() : null, U = L && L.ui, lg = L ? L.code : null;
  stack = [stack[0], stack[1], stack[stack.length - 1]];
  return {
    html: '<div class="done"' + (lg ? ' lang="' + lg + '"' : '') + '><div class="disc"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>' + (U ? U.doneTitle : 'Signed') + ', ' + esc(ctx.op.first) + '</h1>' +
      '<div class="meta">' + (U ? U.doneMeta : 'You understand') + '<br><b>' + esc(L ? L.swp.lototo.title : p.title) + '</b></div>' +
      '<div class="stamp">' + ic('clock') + CS.hm(rec.at) + ' · ' + CS.dayLabel(rec.at) + '</div>' +
      '<div class="stamp">' + ic('file-text') + esc(p.code + ' · ' + p.ver) + (L ? ' · Polski' : '') + '</div></div>' +
      '<div class="twin"><button class="bigbtn ghost" data-list>' + ic('file-text') + (U ? U.more : 'More') + '</button><button class="bigbtn" data-home>' + ic('home') + (U ? U.home : 'Home') + '</button></div>',
    talk: U ? U.doneSay : 'Thank you. You have signed the procedure.', lang: lg,
    bind: function(r){
      onTap(r, '[data-home]', function(){ ctx = { op: ctx.op }; go(hub, null, { reset: true }); });
      onTap(r, '[data-list]', function(){ stack = [stack[0], stack[1]]; go(swpList); });
    }
  };
}

/* ---------- My lock ---------- */
function lockHome(){
  var mine = CS.activeLocks().filter(function(l){ return l.op === ctx.op.id; });
  var cards = mine.map(function(l){
    var m = CS.machine(l.machine);
    return '<div class="lockcard">' + ic('lock') + '<div style="flex:1;min-width:0"><b>' + esc(m.name) + '</b><small>' + esc(CS.site(m.site).name) + ' · on since ' + CS.hm(l.on) + ' (' + CS.since(l.on) + ')</small></div></div>' +
      (l.permit ? '<button class="bigbtn" data-permit="' + l.permit + '" style="margin:0 0 18px">' + ic('shield-lock') + 'Open permit ' + esc(l.permit) + '</button>' : '<button class="bigbtn" data-off="' + l.id + '" style="margin:0 0 18px">' + ic('lock-open') + 'Take my lock off</button>');
  }).join('');
  var talk = mine.length ? 'Your lock is on ' + mine.map(function(l){ return CS.machine(l.machine).name; }).join(' and ') + '. Tap take my lock off when the work is done.' : 'You have no lock on. Tap put my lock on, when you isolate a machine.';
  return {
    html: askHead(mine.length ? 'Your lock is on' : 'My lock', talk) +
      '<div class="padlock">' + ic(mine.length ? 'lock' : 'lock-open') + '<span class="tagno">Lock ' + ctx.op.lock + '</span></div>' +
      cards +
      '<button class="bigbtn yellow" data-on>' + ic('lock') + (mine.length ? 'Lock another machine' : 'Put my lock on') + '</button>' +
      '<button class="bigbtn ghost" data-lsw>' + ic('file-text') + 'How to isolate the baler</button>',
    talk: talk,
    bind: function(r){
      onTap(r, '[data-on]', function(){ ctx.flow = 'lock'; ctx.site = CS.site(ctx.op.site); go(pickMachine); });
      onTap(r, '[data-off]', function(el){ go(lockOffConfirm, el.dataset.off); });
      onTap(r, '[data-permit]', function(el){ go(permitView, el.dataset.permit); });
      onTap(r, '[data-lsw]', function(){ ctx.swp = { p: CS.byId(CS.SWPS, 'lototo'), step: 0 }; go(swpStep, 0); });
    }
  };
}
function lockConfirm(){
  var m = ctx.machine, others = CS.activeLocks(m.id), mineOn = others.some(function(l){ return l.op === ctx.op.id; });
  var ci = CS.canIsolate(ctx.op.id, m.id);
  if (!ci.ok) return notAllowed({ m: m, why: ci.why, what: 'isolate' });
  if (mineOn) return { html: crumbs() + askHead('Your lock is already on', 'Your lock is already on ' + m.name) + '<button class="bigbtn ghost" data-back>' + ic('arrow-left') + 'Back</button>', talk: 'Your lock is already on ' + m.name, bind: function(r){ onTap(r, '[data-back]', back); } };
  var talk = 'Stop ' + m.name + '. Isolate it. Then fit your padlock, number ' + ctx.op.lock + ', and your tag. Tap the yellow button when your lock is on.';
  return {
    html: crumbs() + askHead('Lock on ' + m.name, talk) +
      '<div class="padlock">' + ic('lock') + '<span class="tagno">Lock ' + ctx.op.lock + '</span></div>' +
      '<div class="tiles three" style="margin-bottom:6px">' +
      '<div class="tile" style="min-height:104px;font-size:14px">' + ic('player-stop') + 'Stopped</div>' +
      '<div class="tile" style="min-height:104px;font-size:14px">' + ic('power') + 'Isolated</div>' +
      '<div class="tile" style="min-height:104px;font-size:14px">' + ic('tag') + 'Lock and tag</div></div>' +
      (others.length ? '<div class="lockcard" style="margin-top:8px">' + ic('users') + '<div><b>' + others.length + ' lock' + (others.length > 1 ? 's' : '') + ' already on</b><small>' + others.map(function(l){ return esc(CS.op(l.op).first); }).join(', ') + '. Fit yours as well.</small></div></div>' : '') +
      '<button class="bigbtn yellow" data-on>' + ic('lock') + 'My lock is on</button>',
    talk: talk,
    bind: function(r){
      var b = $('[data-on]', r);
      b.addEventListener('click', function(){
        if (busy || b.disabled) return;
        b.disabled = true; buzz(40);
        S = CS.load();
        var l = CS.lockOn(m.id, ctx.op.id, 'Isolation');
        if (!l) return;
        burst('ok', function(){ go(lockDone, l, { replace: true }); });
      });
    }
  };
}
function lockDone(l){
  var m = CS.machine(l.machine);
  stack = [stack[0], stack[1], stack[stack.length - 1]];
  return {
    html: '<div class="done lockd"><div class="disc">' + ic('lock') + '</div><h1>Your lock is on</h1>' +
      '<div class="meta"><b>' + esc(m.name) + '</b> · ' + esc(CS.site(m.site).name) + '</div>' +
      '<div class="stamp">' + ic('clock') + 'On at ' + CS.hm(l.on) + '</div>' +
      '<div class="stamp">' + ic('lock') + 'Lock ' + ctx.op.lock + ' · ' + esc(ctx.op.first + ' ' + ctx.op.last) + '</div>' +
      '<div class="meta" style="font-size:16px;margin-top:6px">Only you can take it off.</div></div>' +
      '<button class="bigbtn" data-home>' + ic('home') + 'Home</button>',
    talk: 'Your lock is on ' + m.name + '. Only you can take it off.',
    bind: function(r){ onTap(r, '[data-home]', function(){ ctx = { op: ctx.op }; go(hub, null, { reset: true }); }); }
  };
}
function lockOffConfirm(lid){
  var l = CS.byId(CS.state.locks, lid);
  if (!l || l.off) return { html: askHead('Lock already off') + '<button class="bigbtn" data-home>' + ic('home') + 'Home</button>', bind: function(r){ onTap(r, '[data-home]', function(){ go(hub, null, { reset: true }); }); } };
  var m = CS.machine(l.machine);
  var talk = 'Before you take your lock off. Tools and people clear. Guards back on and closed. Tell everyone it is starting.';
  return {
    html: askHead('Take your lock off', talk) +
      '<div class="lockcard">' + ic('lock') + '<div><b>' + esc(m.name) + '</b><small>On since ' + CS.hm(l.on) + ' (' + CS.since(l.on) + ')</small></div></div>' +
      '<div class="tiles three">' +
      '<div class="tile" style="min-height:112px;font-size:14px">' + ic('tools') + 'Tools and people clear</div>' +
      '<div class="tile" style="min-height:112px;font-size:14px">' + ic('shield-check') + 'Guards back on</div>' +
      '<div class="tile" style="min-height:112px;font-size:14px">' + ic('speakerphone') + 'Tell everyone</div></div>' +
      '<button class="bigbtn" data-off>' + ic('lock-open') + 'All done. Lock off</button>',
    talk: talk,
    bind: function(r){
      var b = $('[data-off]', r);
      b.addEventListener('click', function(){
        if (busy || b.disabled) return;
        b.disabled = true; buzz(40);
        S = CS.load();
        CS.lockOff(lid, ctx.op.id);
        ctx.machine = m; ctx.site = CS.site(m.site);
        burst('ok', function(){ go(lockOffDone, l, { replace: true }); });
      });
    }
  };
}
function lockOffDone(l){
  var m = CS.machine(l.machine), still = CS.activeLocks(m.id);
  stack = [stack[0], stack[1], stack[stack.length - 1]];
  return {
    html: '<div class="done"><div class="disc"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>Lock off</h1>' +
      '<div class="meta"><b>' + esc(m.name) + '</b><br>' + (still.length ? still.length + ' other lock' + (still.length > 1 ? 's' : '') + ' still on. Do not start it.' : 'Do a pre-shift check before use.') + '</div>' +
      '<div class="stamp">' + ic('clock') + 'Off at ' + CS.hm(CS.now()) + '</div></div>' +
      (still.length ? '' : '<button class="bigbtn" data-chk>' + ic('clipboard-check') + 'Do the pre-shift check</button>') +
      '<button class="bigbtn ghost" data-home>' + ic('home') + 'Home</button>',
    talk: 'Your lock is off. ' + (still.length ? 'Other locks are still on. Do not start it.' : 'Do a pre shift check before use.'),
    bind: function(r){
      onTap(r, '[data-home]', function(){ ctx = { op: ctx.op }; go(hub, null, { reset: true }); });
      onTap(r, '[data-chk]', function(){
        ctx.flow = 'check';
        ctx.check = { id: CS.uid('c'), type: 'pre', list: CS.checklist(m, 'pre'), idx: 0, answers: [], defects: [], sig: null, saved: false };
        go(item);
      });
    }
  };
}


/* ---------- voice entry: speak it, we tidy it with fixed rules, read it back, you confirm ---------- */
var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
function listen(onText, onEnd){
  var C = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!C) { onEnd('nospeech'); return null; }
  var rec = new C();
  rec.lang = 'en-GB'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = function(e){ var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; onText(t, e.results[e.results.length - 1].isFinal); };
  rec.onerror = function(e){ onEnd(e && e.error === 'not-allowed' ? 'blocked' : 'nohear'); };
  rec.onend = function(){ onEnd(''); };
  try { CS.stop(); rec.start(); } catch (e) { onEnd('nostart'); return null; }
  return rec;
}
var VK = {
  defect: { h: 'Say what is wrong', say: 'Tap the microphone. Say what is wrong, in your own words. Say which machine.', ex: 'For example: the reversing alarm on shovel two is not working.', icon: 'microphone' },
  nearmiss: { h: 'Say what nearly happened', say: 'Tap the microphone. Say what nearly happened, and where. Nobody gets in trouble for reporting a near miss.', ex: 'For example: someone walked behind the shovel at the tipping bay.', icon: 'alert-octagon' },
  fix: { h: 'Say what you fixed', say: 'Tap the microphone. Say what you did, and how you tested it.', ex: 'For example: fitted a new reversing alarm, tested it, all working.', icon: 'tools' }
};
function sampleFor(a){
  var dm = ctx.op.site === 'dm';
  if (a.kind === 'nearmiss') return dm ? 'a visitor walked right behind the three sixty handler at the tipping bay while it was slewing, he was not in the walkway' : 'a lad walked right behind shovel two when I was reversing by the tipping bay, he was not in the walkway';
  if (a.kind === 'fix') return 'fitted a new reversing alarm and tested it, all working';
  if (a.fromCheck) { var it = ctx.check.list[ctx.check.idx]; return 'the ' + it.t.toLowerCase() + ' on ' + ctx.machine.name.toLowerCase() + ' is not working, it keeps cutting out'; }
  return dm ? 'the horn on the three sixty handler is not working, it is dead since this morning' : "the reversing alarm on shovel two isn't working, it's been cutting out since first thing";
}
function voice(arg){
  var a = typeof arg === 'string' ? { kind: arg } : arg, k = VK[a.kind];
  var v = ctx.v = ctx.v && ctx.v.kind === a.kind ? ctx.v : { kind: a.kind, raw: '', id: CS.uid(a.kind === 'nearmiss' ? 'n' : 'd'), saved: false };
  var rec = null;
  return {
    html: (a.fromCheck || a.kind === 'fix' ? crumbs() : '') + askHead(k.h, k.say + ' ' + k.ex) +
      '<div class="vbox"><button class="micbig" data-mic aria-label="Tap to talk">' + ic('microphone') + '</button>' +
      '<div class="vstate" id="vstate">' + (SR ? 'Tap to talk' : 'Talking is not available in this browser. Type it below, or try the sample.') + '</div>' +
      '<div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="vex">' + esc(k.ex) + spk(k.ex) + '</div></div>' +
      '<label class="vtype"><span>' + ic('writing-sign') + 'What I heard. Change it or type it here' + spk('What I heard. You can change it, or type it here instead.') + '</span><textarea id="vraw" rows="3" placeholder="Or type it here">' + esc(v.raw) + '</textarea></label>' +
      '<div class="twin"><button class="bigbtn ghost" data-sample>' + ic('player-play') + 'Try a sample</button><button class="bigbtn" data-tidy' + (v.raw ? '' : ' disabled') + '>' + ic('clipboard-check') + 'Tidy it up</button></div>' +
      '<div class="honest">' + ic('shield-check') + '<span>Tidied with fixed word lists and templates, not AI. Nothing goes in until you hear it read back and press Confirm.</span></div>',
    talk: k.h + '. ' + k.ex,
    bind: function(r){
      var ta = $('#vraw', r), tidyB = $('[data-tidy]', r), mic = $('[data-mic]', r), stEl = $('#vstate', r), box = $('.vbox', r);
      function sync(){ v.raw = ta.value; tidyB.disabled = !v.raw.trim(); }
      ta.addEventListener('input', sync);
      function stop(){ if (rec) { try { rec.stop(); } catch (e) {} } rec = null; box.classList.remove('on'); }
      mic.addEventListener('click', function(){
        if (busy) return; buzz();
        if (rec) { stop(); stEl.textContent = 'Stopped. Check the words, then Tidy it up.'; return; }
        var base = ta.value.trim() ? ta.value.trim() + ' ' : '';
        box.classList.add('on'); stEl.textContent = 'Listening. Speak now.';
        rec = listen(function(t){ ta.value = base + t; sync(); }, function(err){
          box.classList.remove('on'); rec = null;
          stEl.textContent = err === 'nospeech' ? 'Talking is not available in this browser. Type it, or try the sample.' : err === 'blocked' ? 'The microphone is blocked. Type it, or try the sample.' : err ? 'Did not catch that. Try again, or type it.' : (ta.value.trim() ? 'Got it. Check the words, then Tidy it up.' : 'Did not catch that. Try again.');
          if (!err && ta.value.trim()) setTimeout(function(){ if (!busy && stack[stack.length - 1].fn === voice) tidyB.click(); }, 500);
        });
      });
      onTap(r, '[data-sample]', function(){ stop(); ta.value = sampleFor(a); sync(); stEl.textContent = 'Sample words loaded. Tap Tidy it up.'; quiet(ta.value); });
      tidyB.addEventListener('click', function(){
        if (busy || tidyB.disabled) return; buzz(); stop(); sync();
        go(voiceCard, a);
      });
    }
  };
}
function buildCard(a){
  var v = ctx.v, siteId = ctx.op.site;
  if (a.kind === 'nearmiss') return CS.tidyNearMiss(v.raw, siteId);
  if (a.kind === 'fix') { var d = CS.byId(CS.state.defects, a.did), t = CS.cap(v.raw.trim().replace(/[.\s]+$/, '')) + '.'; return { kind: 'fix', machine: d.machine, title: 'Fixed: ' + CS.machine(d.machine).name, text: t, severity: null, action: CS.machine(d.machine).name + ' goes back to Ready. The next driver does a pre-use check before using it.', unsure: /test/i.test(t) ? [] : ['You did not say how you tested it. Add it if you can.'], raw: v.raw }; }
  return CS.tidyDefect(v.raw, siteId, a.fromCheck ? ctx.machine : (v.forceM ? CS.machine(v.forceM) : null));
}
function readback(c){
  if (c.kind === 'fix') return 'Here is what I wrote. ' + c.text + ' ' + c.action + ' If it is right, tap confirm.';
  return 'Here is what I wrote. ' + c.title.replace(':', '.') + '. ' + c.text + ' Suggested: ' + (c.kind === 'nearmiss' ? (c.severity === 'high' ? 'high potential' : 'low potential') : c.severity === 'serious' ? 'serious, do not use' : 'minor') + '. ' + c.action + ' If it is right, tap confirm.';
}
function voiceCard(a){
  var v = ctx.v;
  var c = v.card && v.card.raw === v.raw && !v.redo ? v.card : (v.card = buildCard(a));
  v.redo = false;
  if (v.sev && c.kind === 'defect') { if (c.severity !== v.sev) { c.severity = v.sev; c.edited = true; c.action = v.sev === 'serious' ? 'Do not use ' + (c.machine ? CS.machine(c.machine).name : 'it') + ' until the fitter has fixed and tested it. Keep the key out.' : 'Carry on with care. The fitter will look at it within 24 hours.'; } }
  var m = c.machine ? CS.machine(c.machine) : null, rb = readback(c);
  var siteMs = CS.MACHINES.filter(function(x){ return x.site === ctx.op.site; });
  function row(lbl, val, say, cls){ return '<div class="vrow ' + (cls || '') + '"><small>' + lbl + '</small><div class="vv"><b>' + val + '</b>' + spk(say) + '</div></div>'; }
  var sevRow = '';
  if (c.kind === 'defect') sevRow = '<div class="vrow"><small>How bad · suggested by the rules' + (c.edited ? ' · <span class="edited">changed by you</span>' : '') + '</small><div class="sevpick"><button class="minor' + (c.severity === 'minor' ? ' on' : '') + '" data-s="minor">' + ic('alert-triangle') + 'Minor</button><button class="serious' + (c.severity === 'serious' ? ' on' : '') + '" data-s="serious">' + ic('hand-stop') + 'Serious, do not use</button></div><div class="why">' + esc(c.why || '') + spk(c.why || '') + '</div></div>';
  if (c.kind === 'nearmiss') sevRow = row('Potential', c.severity === 'high' ? '<span class="pp red">High potential</span> ' + esc(c.cat) : '<span class="pp amber">Low potential</span> ' + esc(c.cat), c.why);
  return {
    html: (a.fromCheck || a.kind === 'fix' ? crumbs() : '') + askHead('Is this right?', rb) +
      '<div class="heard">' + ic('ear') + '<span><small>You said</small>"' + esc(v.raw) + '"</span></div>' +
      (c.unsure && c.unsure.length ? '<div class="unsure">' + ic('alert-triangle') + '<div><b>Check before confirming</b>' + c.unsure.map(function(u){ return '<small>' + esc(u) + '</small>'; }).join('') + '</div></div>' : '') +
      '<div class="vcard">' + row('Title', esc(c.title), c.title) +
      (c.kind !== 'fix' ? '<div class="vrow' + (m ? '' : ' warn') + '"><small>Machine</small>' + (m ? '<div class="vv"><b>' + ic(CS.KIND_ICON[m.kind]) + esc(m.name) + ' <span class="muted">' + esc(CS.site(m.site).name) + '</span></b>' + spk(m.name) + '</div>' : '') +
        (!a.fromCheck ? '<div class="mpick">' + siteMs.map(function(x){ return '<button class="' + (m && m.id === x.id ? 'on' : '') + '" data-pm="' + x.id + '">' + esc(x.name) + '</button>'; }).join('') + '</div>' : '') + '</div>' : '') +
      row(c.kind === 'nearmiss' ? 'What happened' : c.kind === 'fix' ? 'What was done' : 'The defect', esc(c.text), c.text) + sevRow +
      row(c.kind === 'fix' ? 'Next' : 'Action', esc(c.action), c.action, 'vact') + '</div>' +
      '<button class="replay wide" data-say="' + esc(rb) + '">' + ic('volume') + 'Read it all out</button>' +
      '<div class="twin"><button class="bigbtn ghost" data-again>' + ic('microphone') + 'Say it again</button><button class="bigbtn' + (c.severity === 'serious' ? ' red' : '') + '" data-ok' + (c.kind !== 'fix' && !m ? ' disabled' : '') + '>' + ic('check') + 'Confirm</button></div>',
    talk: rb,
    bind: function(r){
      onTap(r, '[data-s]', function(el){ v.sev = el.dataset.s; go(voiceCard, a, { replace: true }); });
      onTap(r, '[data-pm]', function(el){ v.forceM = el.dataset.pm; v.redo = true; go(voiceCard, a, { replace: true }); });
      onTap(r, '[data-again]', function(){ back(); });
      var ok = $('[data-ok]', r);
      ok.addEventListener('click', function(){
        if (busy || ok.disabled || v.saved) return;
        v.saved = true; ok.disabled = true; buzz(40);
        S = CS.load();
        if (a.fromCheck) {
          var ch = ctx.check, d = ch.pending && ch.pending.idx === ch.idx ? ch.pending : { idx: ch.idx, item: ch.list[ch.idx].t, photo: null };
          d.note = c.text; d.severity = c.severity; d.title = c.title;
          ch.defects = ch.defects.filter(function(x){ return x.idx !== ch.idx; }); ch.defects.push(d); ch.pending = null;
          stack.length -= 2;
          return burst(c.severity === 'serious' ? 'bad' : 'ok', function(){ nextItem(true); });
        }
        var rec = c.kind === 'nearmiss' ? CS.addNearMiss({ id: v.id, machine: c.machine, cat: c.cat, title: c.title, text: c.text, severity: c.severity, action: c.action, raw: v.raw }, ctx.op.id)
          : c.kind === 'fix' ? CS.fitterFix(a.did, ctx.op.id, c.text)
          : CS.addDefect({ id: v.id, machine: c.machine, part: c.part, title: c.title, text: c.text, severity: c.severity, raw: v.raw }, ctx.op.id);
        burst(c.severity === 'serious' || c.severity === 'high' ? 'bad' : 'ok', function(){ go(voiceDone, { a: a, c: c }, { replace: true }); });
      });
    }
  };
}
function voiceDone(x){
  var c = x.c, m = c.machine ? CS.machine(c.machine) : null, red = c.severity === 'serious';
  stack = [stack[0], stack[1], stack[stack.length - 1]];
  var fit = m ? CS.op(CS.FITTER[m.site]) : null;
  var talk = c.kind === 'nearmiss' ? 'Thank you ' + ctx.op.first + '. Your near miss is in. The supervisor will look at it today.' : c.kind === 'fix' ? 'Thank you. ' + m.name + ' is back in use.' : 'Thank you ' + ctx.op.first + '. ' + (red ? m.name + ' is now marked do not use. ' : '') + fit.first + ' the fitter has the job.';
  return {
    html: '<div class="done' + (red ? ' red' : '') + '"><div class="disc">' + (red ? ic('hand-stop').replace('class="ic ', 'style="font-size:92px;color:#fff" class="ic ') : '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>') + '</div>' +
      '<h1>' + (c.kind === 'nearmiss' ? 'Near miss reported' : c.kind === 'fix' ? 'Back in use' : red ? 'Saved. Do not use.' : 'Defect reported') + '</h1>' +
      '<div class="meta"><b>' + esc(c.title) + '</b>' + spk(talk) + '</div>' +
      (c.kind === 'defect' ? '<div class="stamp">' + CS.avatar(fit, 'xs') + 'Sent to ' + esc(fit.first) + ', fitter at ' + esc(CS.site(m.site).name) + '</div>' : '') +
      '<div class="stamp">' + ic('clock') + CS.hm(CS.now()) + ' · ' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · by voice</div></div>' +
      '<button class="bigbtn" data-home>' + ic('home') + 'Home</button>',
    talk: talk,
    bind: function(r){ onTap(r, '[data-home]', function(){ ctx = { op: ctx.op }; go(hub, null, { reset: true }); }); }
  };
}

/* ---------- picture check after an SWP: did they take it in? ---------- */
function swpQuiz(qi){
  var sw = ctx.swp, qs = CS.QUIZ[sw.p.id] || [];
  if (!qs.length) return swpSign();
  var q = qs[qi], wrong = sw.wrongAt === qi;
  var L = LP(), U = L && L.ui, lg = L ? L.code : null, LQ = L ? L.swp.lototo.quiz[qi] : null;
  var qq = LQ ? LQ.q : q.q, qsay = LQ ? LQ.say : q.say, stepS = L ? L.swp.lototo.steps[q.step].s : sw.p.steps[q.step].s;
  return {
    html: langBar() + '<div' + (lg ? ' lang="' + lg + '"' : '') + '><div class="swphead">' + ic(sw.p.icon).replace('class="ic ', 'style="font-size:26px;color:var(--brand-hi)" class="ic ') + '<span class="tt">' + (U ? U.quick : 'Quick check') + '</span><span class="code">' + (qi + 1) + '/' + qs.length + '</span></div>' +
      askHead(qq, qsay, lg) +
      (wrong ? '<div class="unsure">' + ic('repeat') + '<div><b>' + (U ? U.notQuite : 'Not quite. Listen to this step again') + '</b><small>' + esc(stepS) + '</small></div>' + spk(stepS, '', lg) + '</div>' : '') +
      '<div class="quiz">' + q.a.map(function(o, i){ var t = LQ ? LQ.a[i] : o.t; return '<button class="qo" data-q="' + i + '">' + ic(o.i) + '<b>' + esc(t) + '</b>' + spk(t, 'onbtn', lg) + '</button>'; }).join('') + '</div>' +
      '<div class="honest">' + ic('shield-check') + '<span>' + (U ? U.honest : 'A signature shows they were given it. A picture question shows they took it in.') + '</span></div></div>',
    talk: qsay, lang: lg,
    bind: function(r){
      onTap(r, '[data-q]', function(el){
        var o = q.a[+el.dataset.q];
        if (o.ok) {
          sw.right = (sw.right || 0) + 1;
          sw.wrongAt = null;
          burst('ok', function(){
            if (qi < qs.length - 1) go(swpQuiz, qi + 1, { replace: true });
            else { sw.quiz = { right: qs.length, of: qs.length, tries: 1 + (sw.tries || 0) }; go(swpSign, null, { replace: true }); }
          });
        } else {
          sw.tries = (sw.tries || 0) + 1; sw.wrongAt = qi;
          burst('bad', function(){ go(swpQuiz, qi, { replace: true }); setTimeout(function(){ quiet((U ? U.notQuiteSay : 'Not quite. Listen again.') + ' ' + stepS, lg); }, 250); });
        }
      });
    }
  };
}

/* ---------- toolbox talk with tap-to-sign attendance ---------- */
function tbtView(){
  var t = CS.TBT, done = CS.atTbt(ctx.op.id), all = t.points.map(function(p){ return p.t + '. ' + p.s; }).join(' ');
  var signed = CS.state.tbt.filter(function(x){ return x.tbt === t.id; }).length;
  return {
    html: '<div class="swphead">' + ic('users-group').replace('class="ic ', 'style="font-size:26px;color:var(--brand-hi)" class="ic ') + '<span class="tt">Toolbox talk</span><span class="code">' + t.mins + ' min</span></div>' +
      askHead(t.title, 'Toolbox talk. ' + t.title + '. Given by ' + t.by + '.') +
      '<div class="tbtby">' + ic('user') + 'Given by ' + esc(t.by) + ' · ' + esc(CS.site(t.site).name) + ' · ' + signed + ' signed so far</div>' +
      '<div class="tpoints">' + t.points.map(function(p, i){ return '<div class="tp"><span class="ti">' + ic(p.i) + '</span><div><b>' + (i + 1) + '. ' + esc(p.t) + '</b><small>' + esc(p.s) + '</small></div>' + spk(p.t + '. ' + p.s) + '</div>'; }).join('') + '</div>' +
      '<button class="replay wide" data-say="' + esc(all) + '">' + ic('volume') + 'Play all four</button>' +
      (done ? '<div class="quizok">' + ic('circle-check') + '<span>You signed that you were there</span></div>' :
      '<button class="signbox pulse" data-sign>' + ic('hand-finger') + 'I was there and I understand<small>Tap to sign · ' + esc(ctx.op.first + ' ' + ctx.op.last) + '</small></button>'),
    talk: 'Toolbox talk. ' + t.title + '. Tap a speaker to hear each point.',
    bind: function(r){
      var box = $('[data-sign]', r); if (!box) return;
      box.addEventListener('click', function(){
        if (busy || box.classList.contains('signed')) return;
        box.classList.remove('pulse'); box.classList.add('signed'); buzz(40);
        box.innerHTML = ic('circle-check') + 'Signed<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + CS.hm(CS.now()) + '</small>';
        S = CS.load(); CS.signTbt(ctx.op.id);
        quiet('Thank you. You have signed the toolbox talk.');
      });
    }
  };
}

/* ---------- fitter: jobs, permit to work, group lock ---------- */
function fitterJob(did){
  var d = CS.byId(CS.state.defects, did);
  if (!d || !d.open) return { html: askHead('Job done') + '<button class="bigbtn" data-home>' + ic('home') + 'Home</button>', bind: function(r){ onTap(r, '[data-home]', function(){ go(hub, null, { reset: true }); }); } };
  var m = CS.machine(d.machine), by = CS.op(d.op), fixed = m.group === 'fixed', pt = CS.openPermits(m.id)[0];
  ctx.machine = m; ctx.site = CS.site(m.site);
  var talk = m.name + '. ' + d.note + ' Reported by ' + by.first + '. ' + (fixed ? 'This is fixed plant. Isolate it under a permit to work before you start.' : 'Key out and your lock on before you start. When it is fixed and tested, tap fixed and tested.');
  return {
    html: crumbs() + askHead(d.title ? d.title.replace(m.name + ': ', '') : d.note, talk) +
      '<div class="vcard"><div class="vrow"><small>Defect</small><div class="vv"><b>' + esc(d.note) + '</b>' + spk(d.note) + '</div></div>' +
      '<div class="vrow"><small>Reported</small><div class="vv"><b>' + CS.avatar(by, 'xs') + ' ' + esc(by.first + ' ' + by.last) + ' · ' + CS.hm(d.at) + (d.how === 'voice' ? ' · by voice' : '') + '</b></div></div>' +
      '<div class="vrow"><small>Status</small><div class="vv">' + (d.severity === 'serious' ? '<span class="pp red">Do not use</span>' : '<span class="pp amber">Minor, still in use</span>') + '</div></div>' +
      (d.raw ? '<div class="vrow"><small>What ' + esc(by.first) + ' said</small><div class="vv"><i>"' + esc(d.raw) + '"</i>' + spk(d.raw) + '</div></div>' : '') + '</div>' +
      (d.photo ? '<img src="' + d.photo + '" alt="Defect photo" class="jobimg">' : '') +
      (fixed ? (pt ? '<button class="bigbtn yellow" data-pv="' + pt.id + '">' + ic('shield-lock') + 'Open permit ' + esc(pt.id) + '</button>' : '<button class="bigbtn yellow" data-ptw>' + ic('shield-lock') + 'Isolate it: permit to work</button>') + '<div class="saynext">' + spk('Fixed plant is isolated under a permit to work. Every person working on it puts their own lock on the group lock box.') + 'Why a permit?</div>'
        : '<div class="lockcard">' + ic('key') + '<div><b>Before you start</b><small>Bucket down, engine off, key out. Your lock on the battery isolator.</small></div>' + spk('Before you start. Bucket down, engine off, key out. Your lock on the battery isolator.') + '</div><button class="bigbtn" data-fix>' + ic('circle-check') + 'Fixed and tested</button>'),
    talk: talk,
    bind: function(r){
      onTap(r, '[data-ptw]', function(){ ctx.ptw = { did: did, done: {}, tried: false, saved: false }; go(permitStart, did); });
      onTap(r, '[data-pv]', function(el){ go(permitView, el.dataset.pv); });
      onTap(r, '[data-fix]', function(){ ctx.v = null; go(voice, { kind: 'fix', did: did }); });
    }
  };
}
var POINTS = {
  baler: ['Main electrical isolator off. Your lock and tag on it.', 'Hydraulic pressure dumped. Gauge reads zero.', 'Ram and platen blocked with the safety prop.'],
  other: ['Main electrical isolator off. Your lock and tag on it.', 'Stored energy released. Belt or drum stopped and chocked.']
};
function permitStart(did){
  var d = CS.byId(CS.state.defects, did), m = CS.machine(d.machine), pts = POINTS[m.kind] || POINTS.other, P = ctx.ptw;
  var all = pts.every(function(_, i){ return P.done[i]; }) && P.tried;
  var talk = 'Permit to work for ' + m.name + '. Isolate every energy source. Tap each one when it is done. Then try to start it.';
  return {
    html: crumbs() + askHead('Permit to work', talk) +
      '<div class="ptwhead"><b>' + esc(m.name) + '</b><small>Job: ' + esc(d.title || d.note) + '</small></div>' +
      '<div class="sect">' + ic('power') + 'Isolation points' + spk('Isolation points. Every source of energy: electric, hydraulic, and gravity.') + '</div>' +
      '<div class="todos">' + pts.map(function(t, i){ return '<button class="pt' + (P.done[i] ? ' on' : '') + '" data-pt="' + i + '">' + ic(P.done[i] ? 'circle-check' : 'lock') + '<span class="txt"><b>' + esc(t) + '</b></span>' + spk(t) + '</button>'; }).join('') + '</div>' +
      '<div class="sect">' + ic('hand-click') + 'Try out' + spk('Try out. Press start. Nothing should move. This proves it is dead.') + '</div>' +
      '<button class="pt' + (P.tried ? ' on' : '') + '" data-try>' + ic(P.tried ? 'circle-check' : 'hand-click') + '<span class="txt"><b>I pressed start. Nothing moved.</b></span>' + spk('I pressed start. Nothing moved.') + '</button>' +
      '<div class="lockcard" style="margin-top:14px">' + ic('users-group') + '<div><b>Group lock box</b><small>Isolation keys go in the box. Everyone working on it puts their own lock on the box.</small></div>' + spk('Group lock box. The isolation keys go in the box. Everyone working on it puts their own lock on the box.') + '</div>' +
      '<button class="bigbtn yellow" data-issue' + (all ? '' : ' disabled') + '>' + ic('shield-lock') + 'Issue permit and lock on</button>',
    talk: talk,
    bind: function(r){
      onTap(r, '[data-pt]', function(el){ var i = +el.dataset.pt; P.done[i] = !P.done[i]; if (P.done[i]) quiet(pts[i]); go(permitStart, did, { replace: true }); });
      onTap(r, '[data-try]', function(){ P.tried = !P.tried; if (P.tried) quiet('Nothing moved. Good.'); go(permitStart, did, { replace: true }); });
      var b = $('[data-issue]', r);
      b.addEventListener('click', function(){
        if (busy || b.disabled || P.saved) return;
        P.saved = true; b.disabled = true; buzz(40);
        S = CS.load();
        var pr = CS.raisePermit({ machine: m.id, job: d.title || d.note, defect: did, points: pts.map(function(t){ return { t: t, done: true }; }) }, ctx.op.id);
        burst('ok', function(){ stack.length -= 1; go(permitView, pr.id, { replace: true }); quiet('Permit ' + pr.id.split('-').join(' ') + ' issued. Your lock is on. The office can see it.'); });
      });
    }
  };
}
function permitView(pid){
  var p = CS.byId(CS.state.permits, pid);
  if (!p) return { html: askHead('Permit not found'), bind: function(){} };
  var m = CS.machine(p.machine), issuer = CS.op(p.by), me = ctx.op, onIt = CS.activeLocks(m.id).filter(function(l){ return l.permit === p.id; });
  var mineL = onIt.filter(function(l){ return l.op === me.id; })[0], others = onIt.filter(function(l){ return l.op !== p.by; });
  var isIssuer = me.id === p.by, can = CS.canIsolate(me.id, m.id);
  var talk = 'Permit ' + p.id.split('-').join(' ') + ' on ' + m.name + '. ' + (p.open ? onIt.length + ' lock' + (onIt.length === 1 ? '' : 's') + ' on the group box.' : 'Closed.') + (isIssuer && others.length ? ' You cannot close it until everyone has taken their own lock off.' : '');
  var btn = '';
  if (!p.open) btn = '';
  else if (isIssuer) btn = '<label class="vtype"><span>' + ic('writing-sign') + 'What was done' + spk('Say or type what was done, then close the permit.') + '</span><textarea id="pnote" rows="2" placeholder="What was done">' + esc(ctx.pnote || '') + '</textarea></label><button class="bigbtn ghost" data-psample>' + ic('player-play') + 'Try a sample</button>' +
    '<button class="bigbtn" data-close' + (others.length ? ' disabled' : '') + '>' + ic('lock-open') + 'Work done. Close permit</button>' + (others.length ? '<div class="unsure">' + ic('lock') + '<div><b>Cannot close yet</b><small>' + others.map(function(l){ return esc(CS.op(l.op).first); }).join(', ') + ' still ' + (others.length > 1 ? 'have locks' : 'has a lock') + ' on the box. Only they can take ' + (others.length > 1 ? 'them' : 'it') + ' off.</small></div></div>' : '');
  else if (mineL) btn = '<button class="bigbtn" data-myoff="' + mineL.id + '">' + ic('lock-open') + 'I am out. Take my lock off the box</button>';
  else if (can.ok) btn = '<button class="bigbtn yellow" data-join>' + ic('lock') + 'Put my lock on the group box</button>';
  else btn = '<div class="noauthcard">' + ic('hand-stop') + '<div><b>Not authorised</b><small>' + esc(can.why) + '</small></div></div>';
  return {
    html: crumbs() + askHead('Permit ' + p.id, talk) +
      '<div class="ptwhead' + (p.open ? '' : ' closed') + '"><b>' + esc(m.name) + ' · ' + (p.open ? 'Open' : 'Closed') + '</b><small>Job: ' + esc(p.job) + '</small><small>Issued by ' + esc(issuer.first + ' ' + issuer.last) + ' at ' + CS.hm(p.at) + '</small></div>' +
      '<div class="sect">' + ic('power') + 'Isolated' + spk('Isolated. ' + p.points.map(function(x){ return x.t; }).join(' ')) + '</div><div class="todos">' + p.points.map(function(x){ return '<div class="pt on">' + ic('circle-check') + '<span class="txt"><b>' + esc(x.t) + '</b></span></div>'; }).join('') + '<div class="pt on">' + ic('circle-check') + '<span class="txt"><b>Tried. Nothing moved.</b></span></div></div>' +
      '<div class="sect">' + ic('users-group') + 'Locks on the group box' + spk('Locks on the group box. One person, one lock.') + '</div><div class="gbox">' +
      (onIt.length ? onIt.map(function(l){ var o = CS.op(l.op); return '<div class="gl">' + CS.avatar(o, 'sm') + '<span><b>' + esc(o.first + ' ' + o.last) + '</b><small>Lock ' + o.lock + ' · since ' + CS.hm(l.on) + '</small></span>' + ic('lock') + '</div>'; }).join('') : '<div class="none">' + ic('lock-open') + 'No locks on</div>') + '</div>' + btn,
    talk: talk,
    bind: function(r){
      var ta = $('#pnote', r); if (ta) ta.addEventListener('input', function(){ ctx.pnote = ta.value; });
      onTap(r, '[data-psample]', function(){ ta.value = ctx.pnote = 'Ram seals replaced. Ran it empty three times, returns fully. Guards back on.'; quiet(ta.value); });
      onTap(r, '[data-join]', function(el){ el.disabled = true; S = CS.load(); CS.joinPermit(p.id, me.id); burst('ok', function(){ go(permitView, p.id, { replace: true }); quiet('Your lock is on the group box.'); }); });
      onTap(r, '[data-myoff]', function(el){ el.disabled = true; S = CS.load(); CS.lockOff(el.dataset.myoff, me.id); burst('ok', function(){ go(permitView, p.id, { replace: true }); quiet('Your lock is off the box.'); }); });
      var cb = $('[data-close]', r);
      if (cb) cb.addEventListener('click', function(){
        if (busy || cb.disabled) return; cb.disabled = true; buzz(40);
        S = CS.load();
        if (!CS.closePermit(p.id, me.id, (ta && ta.value) || '')) { cb.disabled = false; return toast('Someone still has a lock on'); }
        ctx.pnote = '';
        burst('ok', function(){ go(permitView, p.id, { replace: true }); quiet(m.name + ' is handed back. Do a pre shift check before use.'); });
      });
    }
  };
}

/* ---------- live sync with other windows ---------- */
window.addEventListener('storage', function(e){
  if (e.key !== CS.KEY) return;
  S = CS.load();
  var last = S.last || {};
  if (last.type === 'reset') { ctx = {}; stack = []; go(who, null, { reset: true }); toast('Demo reset'); return; }
  var top = stack[stack.length - 1];
  /* Refresh list screens so Do not use and lock flags stay true. */
  if (top && [pickMachine, hub, lockHome, swpList, pickType, permitView, fitterJob, tbtView].indexOf(top.fn) >= 0 && !busy) render(false);
});

go(who, null, { reset: true });
})();
