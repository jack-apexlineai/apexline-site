/* Office view. Live board of plant, isolations, sign-offs and printable records. */
(function(){
'use strict';
CS.load();
var view = document.getElementById('view');
var layer = document.getElementById('layer');
var esc = CS.esc;
var tab = 'board', siteF = 'all', swpF = 'lototo';
var prevStatus = snapshot();
var seenEvents = {};
CS.state.events.forEach(function(e){ seenEvents[e.id] = 1; });

function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function sites(){ return CS.SITES.filter(function(s){ return siteF === 'all' || s.id === siteF; }); }
function machines(){ return CS.MACHINES.filter(function(m){ return siteF === 'all' || m.site === siteF; }); }
function snapshot(){ var o = {}; CS.MACHINES.forEach(function(m){ var s = CS.status(m.id); o[m.id] = s.c + '|' + s.locks.length + '|' + CS.checksToday(m.id).length + '|' + CS.openDefects(m.id).length; }); return o; }

/* ---------- top bar ---------- */
document.getElementById('openPhone').innerHTML = ic('device-mobile') + 'Phone view';
document.getElementById('resetBtn').innerHTML = ic('refresh') + 'Reset demo';
document.getElementById('openPhone').addEventListener('click', function(){ window.open('phone.html', 'coastal-phone', 'width=430,height=900'); });
document.getElementById('resetBtn').addEventListener('click', function(){
  if (!confirm('Reset the demo back to the sample data?')) return;
  CS.reset(); prevStatus = snapshot(); seenEvents = {}; CS.state.events.forEach(function(e){ seenEvents[e.id] = 1; });
  closeLayer(); render(); toast('Demo reset to the sample data', 'green', 'refresh');
});
function tick(){ var d = new Date(); document.getElementById('clock').textContent = CS.hm(d); }
tick(); setInterval(tick, 10000);

function tabs(){
  var locks = CS.activeLocks().length;
  var lotoMissing = CS.OPS.filter(function(o){ return !CS.hasSigned('lototo', o.id); }).length;
  var t = [['board', 'layout-dashboard', 'Live board', ''], ['iso', 'lock', 'Isolations', locks ? '<span class="cnt">' + locks + '</span>' : ''], ['sign', 'signature', 'Sign-offs', lotoMissing ? '<span class="cnt">' + lotoMissing + '</span>' : ''], ['rec', 'printer', 'Records', '']];
  document.getElementById('tabs').innerHTML = t.map(function(x){ return '<button class="' + (tab === x[0] ? 'on' : '') + '" data-tab="' + x[0] + '">' + ic(x[1]) + x[2] + x[3] + '</button>'; }).join('');
  $$('[data-tab]').forEach(function(b){ b.addEventListener('click', function(){ tab = b.dataset.tab; render(); }); });
}

function filters(){
  return '<div class="filters">' + [['all', 'Both sites']].concat(CS.SITES.map(function(s){ return [s.id, s.name]; })).map(function(f){
    return '<button class="chip' + (siteF === f[0] ? ' on' : '') + '" data-site="' + f[0] + '">' + esc(f[1]) + '</button>';
  }).join('') + '<span class="date">' + CS.dayLabel(Date.now()) + ' · Shift started 07:00</span></div>';
}

/* ---------- KPIs ---------- */
function kpis(){
  var ms = machines(), pre = ms.filter(function(m){ return CS.checksToday(m.id, 'pre').length; }).length;
  var defs = CS.openDefects().filter(function(d){ return ms.indexOf(CS.machine(d.machine)) >= 0; });
  var dnu = ms.filter(function(m){ return CS.doNotUse(m.id); }).length;
  var locks = CS.activeLocks().filter(function(l){ return ms.indexOf(CS.machine(l.machine)) >= 0; });
  var ops = CS.OPS.filter(function(o){ return siteF === 'all' || o.site === siteF; });
  var loto = ops.filter(function(o){ return CS.hasSigned('lototo', o.id); }).length;
  var checksN = CS.state.checks.filter(function(c){ return CS.isToday(c.at) && ms.indexOf(CS.machine(c.machine)) >= 0; }).length;
  function k(cls, icon, label, v, sub, bar){ return '<div class="kpi ' + cls + '"><div class="k">' + ic(icon) + label + '</div><div class="v">' + v + '</div><div class="s">' + sub + '</div>' + (bar != null ? '<div class="bar"><i style="width:' + bar + '%"></i></div>' : '') + '</div>'; }
  return '<div class="kpis">' +
    k('green', 'sunrise', 'Pre-shift done', pre + '<small> / ' + ms.length + '</small>', checksN + ' checks today', Math.round(pre / ms.length * 100)) +
    k(ms.length - pre ? 'amber' : '', 'clock', 'Missing', ms.length - pre, 'No pre-shift check yet') +
    k(defs.length ? 'amber' : '', 'alert-triangle', 'Open defects', defs.length, defs.length ? 'Oldest ' + CS.ago(Math.min.apply(null, defs.map(function(d){ return d.at; }))) : 'None open') +
    k(dnu ? 'red' : '', 'hand-stop', 'Do not use', dnu, dnu ? 'Serious defect reported' : 'All plant usable') +
    k('lock', 'lock', 'Locks on now', locks.length, locks.length ? locks.length + ' machine' + (locks.length > 1 ? 's' : '') + ' isolated' : 'Nothing isolated') +
    k(loto < ops.length ? 'amber' : 'green', 'file-text', 'New LOTOTO signed', loto + '<small> / ' + ops.length + '</small>', (ops.length - loto) + ' still to sign', Math.round(loto / ops.length * 100)) +
    '</div>';
}

/* ---------- machine card ---------- */
function mcard(m){
  var s = CS.status(m.id);
  var cks = CS.CHECK_TYPES.map(function(t){
    var c = CS.checksToday(m.id, t.id)[0];
    if (c) { var bad = c.items.some(function(i){ return !i.ok; }); return '<span class="ck ' + (bad ? 'bad' : 'ok') + '">' + t.name.replace('-shift', '') + ' ' + CS.hm(c.at) + '</span>'; }
    if (t.id === 'pre') return '<span class="ck miss">Pre missing</span>';
    return '<span class="ck">' + t.name.replace('-shift', '') + '</span>';
  }).join('');
  return '<button class="mc ' + s.c + '" data-m="' + m.id + '">' +
    (s.locks.length ? '<span class="lk">' + ic('lock') + s.locks.length + '</span>' : '') +
    '<div class="top"><span class="mi">' + ic(CS.KIND_ICON[m.kind]) + '</span><div style="min-width:0"><div class="nm">' + esc(m.name) + '</div><div class="rf">' + esc(m.model) + ' · ' + esc(m.ref.replace('Asset ', '')) + '</div></div></div>' +
    '<div class="st"><i></i>' + s.label + (s.locks.length && !s.dnu ? ' · ' + s.locks.map(function(l){ return esc(CS.op(l.op).first); }).join(', ') : '') + '</div>' +
    '<div class="cks">' + cks + '</div></button>';
}

function board(){
  var html = sites().map(function(s){
    var ms = CS.MACHINES.filter(function(m){ return m.site === s.id; });
    var g = { green: 0, amber: 0, red: 0, lock: 0 }; ms.forEach(function(m){ g[CS.status(m.id).c]++; });
    return '<div class="sitehead">' + esc(s.name) + ' <small>' + esc(s.town) + ' · ' + ms.length + ' machines</small>' +
      '<span class="legend"><span><i style="background:var(--ok)"></i>' + g.green + ' ready</span><span><i style="background:var(--amber)"></i>' + g.amber + ' attention</span><span><i style="background:var(--bad)"></i>' + g.red + ' do not use</span><span><i style="background:var(--hivis)"></i>' + g.lock + ' locked out</span></span></div>' +
      '<div class="mgrid">' + ms.map(mcard).join('') + '</div>';
  }).join('');
  return html;
}

/* ---------- isolation board ---------- */
function lockRows(list, big){
  if (!list.length) return '<div class="empty">' + ic('lock-open') + ' No locks on right now</div>';
  return list.sort(function(a, b){ return a.on - b.on; }).map(function(l){
    var o = CS.op(l.op), m = CS.machine(l.machine);
    return '<div class="lockrow" data-lock="' + l.id + '" data-mrow="' + m.id + '"><span class="pl">' + ic('lock') + '<b>' + o.lock + '</b></span>' +
      '<div class="info"><b>' + esc(m.name) + ' <span style="color:var(--muted);font-weight:600">· ' + esc(CS.site(m.site).name) + '</span></b><small>' + CS.avatar(o, 'xs') + ' ' + esc(o.first + ' ' + o.last) + ', ' + esc(o.role) + (big && l.reason ? ' · ' + esc(l.reason) : '') + '</small></div>' +
      '<div class="tm"><b>' + CS.since(l.on) + '</b><small>since ' + CS.hm(l.on) + '</small></div></div>';
  }).join('');
}
function isoPanel(){
  var list = CS.activeLocks().filter(function(l){ return machines().indexOf(CS.machine(l.machine)) >= 0; });
  return '<section class="panel iso" id="isoPanel"><div class="stripe hazard"></div><div class="inner"><div class="ph"><h2>' + ic('lock') + 'Isolation board</h2><span class="sp"></span><span class="count">' + list.length + ' lock' + (list.length === 1 ? '' : 's') + ' on</span></div>' +
    lockRows(list) + '<div class="ph" style="margin:10px 0 0"><span class="note">Who has a lock on which machine, right now. Updates the moment a lock goes on or off.</span></div></div></section>';
}

/* ---------- needs attention ---------- */
function attention(){
  var items = [];
  CS.openDefects().forEach(function(d){
    var m = CS.machine(d.machine); if (machines().indexOf(m) < 0) return; var o = CS.op(d.op);
    items.push({ w: d.severity === 'serious' ? 0 : 1, h: '<div class="att" data-mrow="' + m.id + '"><span class="ai ' + (d.severity === 'serious' ? 'red' : 'amber') + '">' + ic(d.severity === 'serious' ? 'hand-stop' : 'alert-triangle') + '</span>' +
      '<div class="tx"><b>' + esc(m.name) + (d.severity === 'serious' ? ', do not use' : ', minor defect') + '</b><br>' + esc(d.note) + '<small>' + esc(o.first + ' ' + o.last) + ' · ' + CS.hm(d.at) + ' · ' + esc(CS.site(m.site).name) + '</small></div>' +
      (d.photo ? '<img src="' + d.photo + '" alt="Defect photo" data-zoom>' : '') +
      '<button class="smallbtn act" data-fix="' + d.id + '">' + ic('check') + 'Fixed</button></div>' });
  });
  machines().forEach(function(m){
    if (CS.checksToday(m.id, 'pre').length || CS.activeLocks(m.id).length || CS.doNotUse(m.id)) return;
    items.push({ w: 2, h: '<div class="att" data-mrow="' + m.id + '"><span class="ai amber">' + ic('clock') + '</span><div class="tx"><b>' + esc(m.name) + ' has no pre-shift check</b><br>Shift started 07:00 at ' + esc(CS.site(m.site).name) + '<small>' + esc(m.model) + ' · ' + esc(m.ref.replace('Asset ', '')) + '</small></div></div>' });
  });
  items.sort(function(a, b){ return a.w - b.w; });
  return '<section class="panel"><div class="ph"><h2>' + ic('alert-triangle') + 'Needs attention</h2><span class="sp"></span><span class="note">' + items.length + ' items</span></div>' +
    (items.length ? items.map(function(i){ return i.h; }).join('') : '<div class="empty">All clear</div>') + '</section>';
}
function feed(){
  var ev = CS.state.events.slice().sort(function(a, b){ return b.at - a.at; }).slice(0, 8);
  return '<section class="panel"><div class="ph"><h2>' + ic('activity') + 'Live activity</h2></div><div class="feed">' +
    ev.map(function(e){ return '<div class="ev' + (seenEvents[e.id] ? '' : ' new') + '"><span class="t">' + CS.hm(e.at) + '</span><span>' + esc(e.text) + '</span></div>'; }).join('') + '</div></section>';
}

/* ---------- tabs ---------- */
function pageBoard(){
  return filters() + kpis() + '<div class="grid2"><div>' + '<section class="panel"><div class="ph"><h2>' + ic('layout-dashboard') + 'Plant board</h2><span class="sp"></span><span class="note">Tap a machine for its checks, defects and locks</span></div>' + board() + '</section></div>' +
    '<div>' + isoPanel() + attention() + feed() + '</div></div>';
}
function pageIso(){
  var act = CS.activeLocks().filter(function(l){ return machines().indexOf(CS.machine(l.machine)) >= 0; });
  var hist = CS.state.locks.filter(function(l){ return CS.isToday(l.on) && machines().indexOf(CS.machine(l.machine)) >= 0; }).sort(function(a, b){ return b.on - a.on; });
  var fixed = machines().filter(function(m){ return m.group === 'fixed'; });
  return filters() +
    '<div class="grid2"><div><section class="panel iso"><div class="stripe hazard"></div><div class="inner"><div class="ph"><h2>' + ic('lock') + 'Locks on right now</h2><span class="sp"></span><span class="count">' + act.length + ' on</span></div>' + lockRows(act, true) + '</div></section>' +
    '<section class="panel"><div class="ph"><h2>' + ic('history') + 'Lock on, lock off today</h2></div><div class="tw"><table class="t"><thead><tr><th>Machine</th><th>Who</th><th>Lock</th><th>On</th><th>Off</th><th>Time locked</th></tr></thead><tbody>' +
    hist.map(function(l){ var o = CS.op(l.op), m = CS.machine(l.machine); return '<tr><td><b>' + esc(m.name) + '</b><br><small style="color:var(--muted)">' + esc(CS.site(m.site).name) + '</small></td><td><span class="who">' + CS.avatar(o, 'sm') + esc(o.first + ' ' + o.last) + '</span></td><td>' + o.lock + '</td><td>' + CS.hm(l.on) + '</td><td>' + (l.off ? CS.hm(l.off) : '<span class="pill lock">' + ic('lock') + 'Still on</span>') + '</td><td>' + (l.off ? durText(l.off - l.on) : CS.since(l.on)) + '</td></tr>'; }).join('') +
    '</tbody></table></div></section></div>' +
    '<div><section class="panel"><div class="ph"><h2>' + ic('building-factory-2') + 'Fixed plant isolation status</h2></div>' +
    fixed.map(function(m){ var l = CS.activeLocks(m.id); return '<div class="drow" data-mrow="' + m.id + '"><span class="mi" style="font-size:24px;color:var(--ink2)">' + ic(CS.KIND_ICON[m.kind]) + '</span><span class="sp"><b>' + esc(m.name) + '</b> <small style="color:var(--muted)">· ' + esc(CS.site(m.site).name) + '</small></span>' + (l.length ? '<span class="pill lock">' + ic('lock') + l.length + ' lock' + (l.length > 1 ? 's' : '') + ' on</span>' : '<span class="pill ok">Not isolated</span>') + '</div>'; }).join('') +
    '</section>' + lotoCard() + '</div></div>';
}
function durText(ms){ var m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + ('0' + (m % 60)).slice(-2) + 'm'; }
function lotoCard(){
  var p = CS.byId(CS.SWPS, 'lototo');
  var ops = CS.OPS.filter(function(o){ return siteF === 'all' || o.site === siteF; });
  var miss = ops.filter(function(o){ return !CS.hasSigned('lototo', o.id); });
  return '<section class="panel"><div class="ph"><h2>' + ic('file-text') + 'New LOTOTO procedure</h2><span class="sp"></span><span class="note">' + esc(p.code + ' · ' + p.ver) + '</span></div>' +
    '<div class="swpc new" style="border:0;padding:0;background:none"><div class="pct">' + (ops.length - miss.length) + '<small> of ' + ops.length + ' signed</small></div><div class="bar"><i style="width:' + Math.round((ops.length - miss.length) / ops.length * 100) + '%"></i></div>' +
    (miss.length ? '<div class="miss">Not signed yet</div><div class="avs">' + miss.map(function(o){ return '<span class="p">' + CS.avatar(o, 'xs') + esc(o.first + ' ' + o.last) + '</span>'; }).join('') + '</div>' : '<div class="miss" style="color:var(--ok)">Everyone has signed</div>') + '</div></section>';
}
function pageSign(){
  var ops = CS.OPS.filter(function(o){ return siteF === 'all' || o.site === siteF; });
  var cards = CS.SWPS.map(function(p){
    var miss = ops.filter(function(o){ return !CS.hasSigned(p.id, o.id); }), n = ops.length - miss.length;
    return '<div class="swpc' + (p.isNew ? ' new' : '') + '"><div class="h">' + ic(p.icon) + '<div style="min-width:0"><b>' + esc(p.title) + '</b><small>' + esc(p.code + ' · ' + p.ver + (p.isNew ? ' · ' + p.issued : '')) + '</small></div></div>' +
      '<div class="pct">' + n + '<small> of ' + ops.length + ' signed</small></div><div class="bar"><i style="width:' + Math.round(n / ops.length * 100) + '%"></i></div>' +
      (miss.length ? '<div class="miss">Not signed yet (' + miss.length + ')</div><div class="avs">' + miss.map(function(o){ return '<span class="p">' + CS.avatar(o, 'xs') + esc(o.first + ' ' + o.last.charAt(0)) + '</span>'; }).join('') + '</div>' : '<div class="miss" style="color:var(--ok)">Everyone has signed</div>') + '</div>';
  }).join('');
  var log = CS.state.signoffs.filter(function(s){ return s.swp === swpF && ops.indexOf(CS.op(s.op)) >= 0; }).sort(function(a, b){ return b.at - a.at; });
  return filters() + '<div class="swpcards">' + cards + '</div>' +
    '<section class="panel"><div class="ph"><h2>' + ic('signature') + 'Sign-off log</h2><span class="sp"></span>' +
    CS.SWPS.map(function(p){ return '<button class="chip' + (swpF === p.id ? ' on' : '') + '" data-swpf="' + p.id + '" style="margin-left:6px">' + esc(p.title) + '</button>'; }).join('') + '</div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Who</th><th>Site</th><th>Procedure</th><th>Signed</th><th>How</th></tr></thead><tbody>' +
    (log.length ? log.map(function(s){ var o = CS.op(s.op), p = CS.byId(CS.SWPS, s.swp); return '<tr data-new-sign="' + s.id + '"><td><span class="who">' + CS.avatar(o, 'sm') + esc(o.first + ' ' + o.last) + '</span></td><td>' + esc(CS.site(o.site).name) + '</td><td>' + esc(p.title) + ' <small style="color:var(--muted)">' + esc(s.ver || p.ver) + '</small></td><td>' + CS.hm(s.at) + ' · ' + CS.dayLabel(s.at) + '</td><td>' + (s.sig ? '<img src="' + s.sig + '" alt="Signature" style="height:30px;background:#fff;border-radius:6px;padding:2px 6px">' : '<span class="pill ok">' + ic('hand-finger') + 'Tap to sign, after listening</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="empty">No sign-offs yet</td></tr>') +
    '</tbody></table></div></section>';
}
function pageRec(){
  var ms = machines();
  var list = CS.state.checks.filter(function(c){ return ms.indexOf(CS.machine(c.machine)) >= 0; }).sort(function(a, b){ return b.at - a.at; });
  return filters() + '<section class="panel"><div class="ph"><h2>' + ic('printer') + 'Check records</h2><span class="sp"></span><span class="linknote">' + ic('link') + 'Can link to your current system</span></div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Time</th><th>Machine</th><th>Check</th><th>Who</th><th>Result</th><th></th></tr></thead><tbody>' +
    list.map(function(c){ var m = CS.machine(c.machine), o = CS.op(c.op), t = CS.byId(CS.CHECK_TYPES, c.type), f = c.items.filter(function(i){ return !i.ok; }).length;
      return '<tr><td>' + CS.hm(c.at) + '</td><td><b>' + esc(m.name) + '</b> <small style="color:var(--muted)">' + esc(CS.site(m.site).name) + '</small></td><td>' + t.name + '</td><td><span class="who">' + CS.avatar(o, 'sm') + esc(o.first + ' ' + o.last) + '</span></td><td>' + (f ? '<span class="pill bad">' + f + ' defect' + (f > 1 ? 's' : '') + '</span>' : '<span class="pill ok">All OK</span>') + '</td><td><button class="smallbtn" data-rec="' + c.id + '">' + ic('printer') + 'View and print</button></td></tr>'; }).join('') +
    '</tbody></table></div></section>';
}

/* ---------- render ---------- */
function render(changed){
  tabs();
  var y = window.scrollY;
  view.innerHTML = tab === 'board' ? pageBoard() : tab === 'iso' ? pageIso() : tab === 'sign' ? pageSign() : pageRec();
  window.scrollTo(0, y);
  $$('[data-site]', view).forEach(function(b){ b.addEventListener('click', function(){ siteF = b.dataset.site; render(); }); });
  $$('[data-swpf]', view).forEach(function(b){ b.addEventListener('click', function(){ swpF = b.dataset.swpf; render(); }); });
  $$('[data-m]', view).forEach(function(b){ b.addEventListener('click', function(){ drawer(b.dataset.m); }); });
  $$('.att[data-mrow],.drow[data-mrow],.lockrow[data-mrow]', view).forEach(function(b){ b.style.cursor = 'pointer'; b.addEventListener('click', function(e){ if (e.target.closest('[data-fix],[data-zoom]')) return; drawer(b.dataset.mrow); }); });
  $$('[data-fix]', view).forEach(function(b){ b.addEventListener('click', function(){ CS.fixDefect(b.dataset.fix); prevStatus = snapshot(); render(); toast('Defect marked fixed', 'green', 'check'); }); });
  $$('[data-zoom]', view).forEach(function(i){ i.addEventListener('click', function(){ zoom(i.src); }); });
  $$('[data-rec]', view).forEach(function(b){ b.addEventListener('click', function(){ record(b.dataset.rec); }); });
  (changed || []).forEach(function(c){
    $$('[data-m="' + c.id + '"],[data-mrow="' + c.id + '"]', view).forEach(function(el){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); if (c.tone) el.classList.add(c.tone); setTimeout(function(){ el.classList.remove('flash', 'red', 'green'); }, 2500); });
  });
  CS.state.events.forEach(function(e){ seenEvents[e.id] = 1; });
}

/* ---------- drawer ---------- */
function closeLayer(){ layer.innerHTML = ''; }
function drawer(mid){
  var m = CS.machine(mid), s = CS.status(mid), cks = CS.checksToday(mid), defs = CS.state.defects.filter(function(d){ return d.machine === mid && (d.open || CS.isToday(d.at)); }), locks = CS.activeLocks(mid);
  layer.innerHTML = '<div class="scrim" data-close></div><aside class="drawer"><div class="dh"><span class="mi">' + ic(CS.KIND_ICON[m.kind]) + '</span><div><h2>' + esc(m.name) + '</h2><small>' + esc(m.model + ' · ' + m.ref + ' · ' + CS.site(m.site).name) + '</small></div><button class="smallbtn x" data-close>' + ic('x') + 'Close</button></div>' +
    '<span class="pill ' + (s.c === 'green' ? 'ok' : s.c === 'red' ? 'bad' : s.c === 'lock' ? 'lock' : 'amber') + '" style="font-size:13px;padding:6px 12px">' + s.label + '</span>' +
    '<h3>Locks on</h3>' + (locks.length ? lockRows(locks, true) : '<div class="empty">Not isolated</div>') +
    '<h3>Defects</h3>' + (defs.length ? defs.map(function(d){ var o = CS.op(d.op); return '<div class="drow">' + (d.photo ? '<img src="' + d.photo + '" alt="Defect photo" data-zoom>' : '') + '<span class="sp"><b>' + esc(d.note) + '</b><br><small style="color:var(--muted)">' + esc(o.first + ' ' + o.last) + ' · ' + CS.hm(d.at) + '</small><br>' + (d.open ? '<span class="pill ' + (d.severity === 'serious' ? 'bad' : 'amber') + '">' + (d.severity === 'serious' ? 'Serious, do not use' : 'Minor') + '</span>' : '<span class="pill ok">Fixed ' + CS.hm(d.fixedAt) + '</span>') + '</span>' + (d.open ? '<button class="smallbtn" data-fix="' + d.id + '">' + ic('check') + 'Mark fixed</button>' : '') + '</div>'; }).join('') : '<div class="empty">No defects</div>') +
    '<h3>Checks today</h3>' + (cks.length ? cks.map(function(c){ var o = CS.op(c.op), t = CS.byId(CS.CHECK_TYPES, c.type), f = c.items.filter(function(i){ return !i.ok; }).length; return '<div class="drow"><span class="sp"><b>' + t.name + '</b> · ' + CS.hm(c.at) + '<br><small style="color:var(--muted)">' + esc(o.first + ' ' + o.last) + '</small></span>' + (f ? '<span class="pill bad">' + f + ' defect' + (f > 1 ? 's' : '') + '</span>' : '<span class="pill ok">All OK</span>') + '<button class="smallbtn" data-rec="' + c.id + '">' + ic('printer') + 'Record</button></div>'; }).join('') : '<div class="empty">No checks yet today</div>') +
    '</aside>';
  $$('[data-close]', layer).forEach(function(b){ b.addEventListener('click', closeLayer); });
  $$('[data-fix]', layer).forEach(function(b){ b.addEventListener('click', function(){ CS.fixDefect(b.dataset.fix); prevStatus = snapshot(); render(); drawer(mid); toast('Defect marked fixed', 'green', 'check'); }); });
  $$('[data-rec]', layer).forEach(function(b){ b.addEventListener('click', function(){ record(b.dataset.rec); }); });
  $$('[data-zoom]', layer).forEach(function(i){ i.addEventListener('click', function(){ zoom(i.src); }); });
}
function zoom(src){ var d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = '<img src="' + src + '" alt="Defect photo">'; d.addEventListener('click', function(){ d.remove(); }); document.body.appendChild(d); }

/* ---------- printable record ---------- */
function record(cid){
  var c = CS.byId(CS.state.checks, cid), m = CS.machine(c.machine), o = CS.op(c.op), t = CS.byId(CS.CHECK_TYPES, c.type);
  var list = CS.checklist(m, c.type), defs = CS.state.defects.filter(function(d){ return d.check === c.id; });
  var f = c.items.filter(function(i){ return !i.ok; }).length;
  layer.innerHTML = '<div class="recwrap"><div class="recbar"><button class="smallbtn" data-close>' + ic('arrow-left') + 'Back</button><span class="sp"></span><span class="linknote" style="color:#cfd6d2">' + ic('link') + 'Can link to your current system</span><button class="smallbtn" data-print style="background:var(--brand);color:#fff;border-color:var(--brand)">' + ic('printer') + 'Print or save as PDF</button></div>' +
    '<article class="rec"><div class="rh"><img src="coastal-logo.svg" alt="Coastal Recycling"><div class="ti"><b>' + t.name + ' plant check</b><small>Record ' + esc(c.id.slice(-6).toUpperCase()) + '</small></div></div>' +
    '<div class="meta"><div><small>Machine</small><b>' + esc(m.name) + '</b><br>' + esc(m.model) + '</div><div><small>Reg or asset</small><b>' + esc(m.ref) + '</b></div><div><small>Site</small><b>' + esc(CS.site(m.site).name) + '</b><br>' + esc(CS.site(m.site).town) + '</div>' +
    '<div><small>Operative</small><b>' + esc(o.first + ' ' + o.last) + '</b><br>' + esc(o.role) + '</div><div><small>Date and time</small><b>' + CS.dayLabel(c.at) + '</b><br>' + CS.hm(c.at) + '</div><div><small>Result</small><b class="' + (f ? 'res-bad' : 'res-ok') + '">' + (f ? f + ' defect' + (f > 1 ? 's' : '') + ' reported' : 'All items OK') + '</b></div></div>' +
    '<table><thead><tr><th style="width:36px">#</th><th>Item</th><th>What was checked</th><th style="width:80px">Result</th></tr></thead><tbody>' +
    c.items.map(function(it, i){ var l = list[i] || {}; return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(it.t) + '</b></td><td>' + esc(l.s || '') + '</td><td class="' + (it.ok ? 'res-ok' : 'res-bad') + '">' + (it.ok ? 'OK' : 'NOT OK') + '</td></tr>'; }).join('') +
    '</tbody></table></div>' +
    (defs.length ? '<div class="defs"><b>Defects reported</b>' + defs.map(function(d){ return '<div style="margin-top:6px">' + esc(d.note) + ' · <b>' + (d.severity === 'serious' ? 'Serious, machine marked Do not use' : 'Minor') + '</b>' + (d.open ? '' : ' · Fixed ' + CS.hm(d.fixedAt)) + (d.photo ? '<img src="' + d.photo + '" alt="Defect photo">' : '') + '</div>'; }).join('') + '</div>' : '') +
    '<div class="sig"><div class="box">' + (c.sig ? '<img src="' + c.sig + '" alt="Signature">' : 'Signed by tap: ' + esc(o.first + ' ' + o.last)) + '</div><div class="box" style="flex:0 0 200px">' + CS.hm(c.at) + ', ' + CS.dayLabel(c.at) + '</div></div>' +
    '<div class="rf"><span>Coastal Recycling · Site safety record</span><span>Demo record, sample data · Built by ApexLine</span></div></article></div>';
  $$('[data-close]', layer).forEach(function(b){ b.addEventListener('click', closeLayer); });
  layer.querySelector('[data-print]').addEventListener('click', function(){ window.print(); });
}

/* ---------- toasts ---------- */
function toast(text, tone, icon){
  var box = document.getElementById('toasts'), d = document.createElement('div');
  d.className = tone || ''; d.innerHTML = ic(icon || 'bell') + '<span>' + esc(text) + '</span>';
  box.appendChild(d); setTimeout(function(){ d.style.transition = 'opacity .4s'; d.style.opacity = '0'; }, 4200); setTimeout(function(){ d.remove(); }, 4700);
  while (box.children.length > 4) box.firstChild.remove();
}

/* ---------- live updates from the phone window ---------- */
window.addEventListener('storage', function(e){
  if (e.key !== CS.KEY) return;
  CS.load();
  var last = CS.state.last || {};
  if (last.type === 'reset') { prevStatus = snapshot(); seenEvents = {}; CS.state.events.forEach(function(x){ seenEvents[x.id] = 1; }); closeLayer(); render(); toast('Demo reset to the sample data', 'green', 'refresh'); return; }
  var now = snapshot(), changed = [];
  Object.keys(now).forEach(function(id){ if (now[id] !== prevStatus[id]) changed.push({ id: id, tone: CS.status(id).c === 'red' ? 'red' : CS.status(id).c === 'green' ? 'green' : '' }); });
  prevStatus = now;
  var fresh = CS.state.events.filter(function(x){ return !seenEvents[x.id]; });
  if (!layer.querySelector('.recwrap')) closeLayer();
  render(changed);
  fresh.forEach(function(x){
    var tone = x.kind === 'defect' ? 'red' : x.kind === 'check' || x.kind === 'lockoff' || x.kind === 'sign' ? 'green' : '';
    var icon = x.kind === 'lockon' ? 'lock' : x.kind === 'lockoff' ? 'lock-open' : x.kind === 'defect' ? 'alert-triangle' : x.kind === 'sign' ? 'signature' : 'clipboard-check';
    toast(x.text, tone, icon);
  });
});

/* Keep the lock timers and ages fresh. */
setInterval(function(){ if (!layer.innerHTML) render(); }, 30000);
render();
})();
