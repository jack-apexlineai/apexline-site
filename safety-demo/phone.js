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

var talkTimer = null;
function speak(text){
  CS.say(text);
  $$('.say,.replay').forEach(function(b){ b.classList.add('talking'); });
  clearInterval(talkTimer);
  var started = Date.now();
  talkTimer = setInterval(function(){
    var on = window.speechSynthesis && speechSynthesis.speaking;
    if ((!on && Date.now() - started > 600) || Date.now() - started > 20000 || CS.muted) {
      $$('.say,.replay').forEach(function(b){ b.classList.remove('talking'); });
      clearInterval(talkTimer);
    }
  }, 250);
}

function askHead(title, talk){
  return '<div class="ask"><h1>' + esc(title) + '</h1><button class="say" data-say="' + esc(talk || title) + '" aria-label="Read it out">' + ic('volume') + '</button></div>';
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
  $$('[data-say]').forEach(function(b){ b.addEventListener('click', function(){ buzz(); speak(b.getAttribute('data-say')); }); });
  if (out.bind) out.bind($('.screen'));
  if (out.talk) setTimeout(function(){ speak(out.talk); }, 180);
}
backBtn.innerHTML = ic('arrow-left');
homeBtn.innerHTML = ic('home');
backBtn.addEventListener('click', back);
homeBtn.addEventListener('click', function(){ if (!busy) { ctx = { op: ctx.op }; go(hub, null, { reset: true }); } });
function paintMute(){ muteBtn.innerHTML = ic(CS.muted ? 'volume-off' : 'volume-2'); muteBtn.classList.toggle('off', CS.muted); }
muteBtn.addEventListener('click', function(){ CS.setMuted(!CS.muted); paintMute(); if (!CS.muted) speak('Sound is on'); });
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
    bind: function(r){ onTap(r, '[data-op]', function(el){ ctx = { op: CS.op(el.dataset.op) }; go(hub); }); }
  };
}

/* ---------- 2. hub ---------- */
function hub(){
  var o = ctx.op, mine = CS.activeLocks().filter(function(l){ return l.op === o.id; });
  var lotoDue = !CS.hasSigned('lototo', o.id);
  var lockSub = mine.length ? 'On ' + mine.map(function(l){ return CS.machine(l.machine).name; }).join(', ') : 'Lock on, lock off';
  return {
    html: '<div class="ask"><h1>Hi ' + esc(o.first) + '</h1><button class="say" data-say="Hi ' + esc(o.first) + '. What do you want to do? Check a machine. Safe work procedures. Or your lock." aria-label="Read it out">' + ic('volume') + '</button></div>' +
      '<div class="tiles one">' +
      '<button class="tile row big hi" data-go="check">' + ic('clipboard-check') + '<span class="txt"><span class="nm">Check a machine</span><span class="sub" style="display:block">Pre-shift, running, post-shift</span></span>' + ic('chevron-right') + '</button>' +
      '<button class="tile row big" data-go="swp">' + (lotoDue ? '<span class="newtag">NEW TO SIGN</span>' : '') + ic('file-text') + '<span class="txt"><span class="nm">Safe work procedures</span><span class="sub" style="display:block">Listen, then sign</span></span>' + ic('chevron-right') + '</button>' +
      '<button class="tile row big' + (mine.length ? ' locked' : '') + '" data-go="lock">' + ic(mine.length ? 'lock' : 'lock-open') + '<span class="txt"><span class="nm">My lock</span><span class="sub" style="display:block">' + esc(lockSub) + '</span></span>' + ic('chevron-right') + '</button>' +
      '</div>',
    talk: 'Hi ' + o.first + '. What do you want to do?',
    bind: function(r){
      $$('.tile.row .ic:last-child', r).forEach(function(i){ i.style.fontSize = '28px'; i.style.color = 'var(--muted)'; });
      onTap(r, '[data-go]', function(el){
        var g = el.dataset.go;
        if (g === 'check') { ctx.flow = 'check'; go(pickSite); }
        if (g === 'swp') go(swpList);
        if (g === 'lock') go(lockHome);
      });
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
  if (st.dnu) { flag = '<span class="flag dnu">Do not use</span>'; cls = ' dnu has-flag'; }
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
        if (lockFlow) return go(lockConfirm);
        if (CS.doNotUse(ctx.machine.id)) return go(dnuScreen);
        go(pickType);
      });
    }
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
      '<div class="bigic">' + ic(it.i) + '</div><h2>' + esc(it.t) + '</h2><p>' + esc(it.s) + '</p>' +
      '<button class="replay" data-say="' + esc(talk) + '">' + ic('volume') + 'Play again</button></div>' +
      '<div class="yn"><button class="n" data-a="0" aria-label="Not OK">' + ic('x') + '<span>Not OK</span></button><button class="y" data-a="1" aria-label="OK">' + ic('check') + '<span>OK</span></button></div>',
    talk: talk,
    bind: function(r){
      onTap(r, '[data-a]', function(el){
        if (c.answers[c.idx] !== undefined && c.answers.length > c.idx) { /* already answered this one */ }
        var ok = el.dataset.a === '1';
        c.answers[c.idx] = ok;
        if (window.speechSynthesis) speechSynthesis.cancel();
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
      '<div class="sect">' + ic('alert-triangle') + 'How bad is it?</div>' +
      '<div class="sev"><button class="minor" data-sev="minor">' + ic('alert-triangle') + '<span><b>Minor</b><small>Still safe to use. Fix soon.</small></span></button>' +
      '<button class="serious" data-sev="serious">' + ic('hand-stop') + '<span><b>Serious</b><small>Not safe. Do not use.</small></span></button></div>',
    talk: 'Take a photo if you can. Then tell us how bad it is. Minor, still safe to use. Or serious, do not use.',
    bind: function(r){
      var inp = $('input[type=file]', r);
      inp.addEventListener('change', function(){
        var f = inp.files && inp.files[0]; if (!f) return;
        shrink(f, function(url){ d.photo = url; go(defect, null, { replace: true }); });
      });
      onTap(r, '[data-sev]', function(el){
        d.severity = el.dataset.sev;
        c.defects = c.defects.filter(function(x){ return x.idx !== c.idx; });
        c.defects.push(d); c.pending = null;
        if (d.severity === 'serious') speak('Serious. ' + ctx.machine.name + ' will be marked do not use.');
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
function sigBlock(){
  return '<button class="sigtoggle" data-sigt>' + ic('signature') + 'Add your finger signature <span style="color:var(--muted);font-weight:600">(optional)</span></button>' +
    '<div class="sigpad" hidden><canvas></canvas><span class="line"></span><span class="hint">Sign here with your finger</span><button class="clr" type="button">Clear</button></div>';
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
      sigBlock() + '<div style="height:12px"></div>' +
      '<button class="signbox pulse" data-sign>' + ic('hand-finger') + 'Tap here to sign<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + t.name + ' check</small></button>',
    talk: talk,
    bind: function(r){
      bindSig(r, c);
      var box = $('[data-sign]', r);
      box.addEventListener('click', function(){
        if (busy || c.saved) return;
        c.saved = true; buzz(40);
        box.classList.remove('pulse'); box.classList.add('signed');
        box.innerHTML = ic('circle-check') + 'Signed<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + CS.hm(Date.now()) + '</small>';
        S = CS.load();
        var rec = { id: c.id, machine: m.id, op: ctx.op.id, type: c.type, at: Date.now(), signed: true, sig: c.sig || null,
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
  var prog = p.steps.map(function(_, k){ return '<i class="' + (k < i ? 'ok' : k === i ? 'cur' : '') + '"></i>'; }).join('');
  var talk = 'Step ' + (i + 1) + '. ' + st.t + '. ' + st.s;
  var lockBtn = '';
  if (st.lockAction) {
    var bm = bakerFor();
    if (bm) {
      var has = CS.activeLocks(bm.id).some(function(l){ return l.op === ctx.op.id; });
      lockBtn = '<button class="lockrec' + (has ? ' on' : '') + '" data-lock="' + bm.id + '">' + ic(has ? 'lock-check' : 'lock') + (has ? 'Your lock is on ' + esc(bm.name) : 'Tap when your lock is on ' + esc(bm.name)) + '</button>';
    }
  }
  return {
    html: '<div class="swphead">' + ic(p.icon).replace('class="ic ', 'style="font-size:26px;color:var(--brand-hi)" class="ic ') + '<span class="tt">' + esc(p.title) + '</span><span class="code">' + (i + 1) + '/' + n + '</span></div>' +
      '<div class="prog">' + prog + '</div>' +
      '<div class="step' + (st.lockAction ? ' lockstep' : '') + '"><span class="stepno">' + (i + 1) + '</span><div class="bigic">' + ic(st.i) + '</div><h2>' + esc(st.t) + '</h2><p>' + esc(st.s) + '</p>' + lockBtn + '</div>' +
      '<div class="navrow"><button class="rep" data-rep>' + ic('repeat') + 'Repeat</button><button class="nxt" data-next>' + (i === n - 1 ? 'Finish' : 'Next') + ic('arrow-right') + '</button></div>',
    talk: talk,
    bind: function(r){
      onTap(r, '[data-rep]', function(){ speak(talk); });
      onTap(r, '[data-next]', function(){ if (i < n - 1) go(swpStep, i + 1); else go(swpSign); });
      onTap(r, '[data-lock]', function(el){
        var mid = el.dataset.lock;
        if (CS.activeLocks(mid).some(function(l){ return l.op === ctx.op.id; })) return;
        S = CS.load(); CS.lockOn(mid, ctx.op.id, 'Isolation: ' + p.title);
        el.classList.add('on'); el.innerHTML = ic('lock-check') + 'Your lock is on ' + esc(CS.machine(mid).name);
        speak('Your lock is on. The office can see it.');
      });
    }
  };
}
function swpSign(){
  var sw = ctx.swp, p = sw.p;
  return {
    html: '<div class="swphead">' + ic(p.icon).replace('class="ic ', 'style="font-size:26px;color:var(--brand-hi)" class="ic ') + '<span class="tt">' + esc(p.title) + '</span><span class="code">' + esc(p.code) + '</span></div>' +
      askHead('Do you understand?', 'Do you understand this procedure? If yes, tap the big box to sign. If not, play it again or ask your supervisor.') +
      '<button class="signbox pulse" data-sign>' + ic('hand-finger') + 'I understand<small>Tap to sign · ' + esc(ctx.op.first + ' ' + ctx.op.last) + '</small></button>' +
      sigBlock() +
      '<button class="bigbtn ghost" data-again>' + ic('repeat') + 'Play it again from the start</button>',
    talk: 'Do you understand this procedure? If yes, tap the big box to sign.',
    bind: function(r){
      bindSig(r, sw);
      onTap(r, '[data-again]', function(){ go(swpStep, 0); });
      var box = $('[data-sign]', r);
      box.addEventListener('click', function(){
        if (busy || sw.saved) return;
        sw.saved = true; buzz(40);
        box.classList.remove('pulse'); box.classList.add('signed');
        box.innerHTML = ic('circle-check') + 'Signed<small>' + esc(ctx.op.first + ' ' + ctx.op.last) + ' · ' + CS.hm(Date.now()) + '</small>';
        S = CS.load();
        var rec = CS.signSwp(p.id, ctx.op.id, sw.sig);
        burst('ok', function(){ go(swpDone, rec, { replace: true }); });
      });
    }
  };
}
function swpDone(rec){
  var p = ctx.swp.p;
  stack = [stack[0], stack[1], stack[stack.length - 1]];
  return {
    html: '<div class="done"><div class="disc"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>Signed, ' + esc(ctx.op.first) + '</h1>' +
      '<div class="meta">You understand<br><b>' + esc(p.title) + '</b></div>' +
      '<div class="stamp">' + ic('clock') + CS.hm(rec.at) + ' · ' + CS.dayLabel(rec.at) + '</div>' +
      '<div class="stamp">' + ic('file-text') + esc(p.code + ' · ' + p.ver) + '</div></div>' +
      '<div class="twin"><button class="bigbtn ghost" data-list>' + ic('file-text') + 'More</button><button class="bigbtn" data-home>' + ic('home') + 'Home</button></div>',
    talk: 'Thank you ' + ctx.op.first + '. You have signed the procedure.',
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
      '<button class="bigbtn" data-off="' + l.id + '" style="margin:0 0 18px">' + ic('lock-open') + 'Take my lock off</button>';
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
      onTap(r, '[data-lsw]', function(){ ctx.swp = { p: CS.byId(CS.SWPS, 'lototo'), step: 0 }; go(swpStep, 0); });
    }
  };
}
function lockConfirm(){
  var m = ctx.machine, others = CS.activeLocks(m.id), mineOn = others.some(function(l){ return l.op === ctx.op.id; });
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
      '<div class="stamp">' + ic('clock') + 'Off at ' + CS.hm(Date.now()) + '</div></div>' +
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

/* ---------- live sync with other windows ---------- */
window.addEventListener('storage', function(e){
  if (e.key !== CS.KEY) return;
  S = CS.load();
  var last = S.last || {};
  if (last.type === 'reset') { ctx = {}; stack = []; go(who, null, { reset: true }); toast('Demo reset'); return; }
  var top = stack[stack.length - 1];
  /* Refresh list screens so Do not use and lock flags stay true. */
  if (top && [pickMachine, hub, lockHome, swpList, pickType].indexOf(top.fn) >= 0 && !busy) render(false);
});

go(who, null, { reset: true });
})();
