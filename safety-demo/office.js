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
document.getElementById('openPhone').innerHTML = ic('device-mobile') + '<span class="btxt">Phone view</span>';
document.getElementById('openPhone').title = 'Open the operative phone over the office';
document.getElementById('resetBtn').innerHTML = ic('refresh') + '<span class="btxt">Reset demo</span>';
document.getElementById('openPhone').addEventListener('click', openPhoneView);
document.getElementById('wordsBtn').innerHTML = ic('school') + '<span class="btxt">Plain English</span>';
document.getElementById('wordsBtn').addEventListener('click', words);

/* ---------- the operative phone, over the office ----------
   The real phone.html in a same-origin iframe, in a phone frame. It shares this browser's
   storage, so a check, defect or lock done in it shows on the board. On a phone itself
   the button just opens the phone page. */
var PSTEPS = [
  ['Log in', 'Tap your name, then your four number PIN. It is 1234 for the demo.'],
  ['Pre-shift check', 'Check a machine, then pick it. Each check is read out. Tap OK or Problem.'],
  ['Report a defect', 'Tap Report a defect and just say what is wrong. Check what it heard, then send it. It lands on the live board.'],
  ['Lock on', 'My lock, Put my lock on, pick the machine. Stop it, isolate it, fit your lock and tag, then tap My lock is on.'],
  ['Sign the LOTOTO procedure', 'Procedures, pick the isolation one. Listen to each step, then tap the big box to sign.']
];
var phoneMask = null, phoneFit = null;
function phoneKey(e){ if (e.key === 'Escape' && !document.documentElement.classList.contains('touring')) closePhoneView(); }
function phoneSize(){
  if (!phoneMask) return;
  /* fit the height, and the width on a narrow screen; during the guided tour on a phone, leave room for the tour card */
  var narrow = window.innerWidth <= 760, touring = document.documentElement.classList.contains('touring');
  var s = Math.max(0.4, Math.min(1, (window.innerHeight - (narrow && touring ? 250 : 40)) / 824, narrow ? (window.innerWidth - 24) / 414 : 1));
  phoneMask.querySelector('.pframe').style.transform = 'scale(' + s + ')';
  var sz = phoneMask.querySelector('.psizer');
  sz.style.width = Math.round(414 * s) + 'px';
  sz.style.height = Math.round(824 * s) + 'px';
}
function openPhoneView(inline){
  if (window.innerWidth <= 760 && inline !== true) { location.href = 'phone.html'; return; }
  if (phoneMask) return;
  phoneMask = document.createElement('div');
  phoneMask.className = 'pmask';
  phoneMask.setAttribute('role', 'dialog');
  phoneMask.setAttribute('aria-modal', 'true');
  phoneMask.setAttribute('aria-label', 'Operative phone');
  phoneMask.innerHTML = '<button type="button" class="pmx" id="pmClose" aria-label="Close the phone" title="Close (Esc)">&times;</button>' +
    '<div class="pmwrap"><div class="psizer"><div class="pframe"><span class="pbtn pb1"></span><span class="pbtn pb2"></span><span class="pbtn pb3"></span>' +
    '<div class="pscreen"><div class="psbar"><span class="ptime">' + CS.hm(CS.now()) + '</span><span class="pisland"></span>' +
    '<span class="picons"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>' +
    '<svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.2" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor"/></svg></span></div>' +
    '<iframe class="pifr" src="phone.html" title="Operative phone"></iframe><div class="phome"><span></span></div></div></div></div>' +
    '<div class="pmsteps"><div class="pmk">' + ic('device-mobile') + 'Operative phone</div><h2>How it works</h2><ol>' +
    PSTEPS.map(function(x){ return '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>'; }).join('') +
    '</ol><div class="pmfoot">Close the phone to see it on the office board.</div></div></div>';
  document.body.appendChild(phoneMask);
  document.body.classList.add('phoneopen');
  phoneSize();
  document.getElementById('pmClose').addEventListener('click', closePhoneView);
  phoneMask.addEventListener('click', function(e){ if ((e.target === phoneMask || e.target.classList.contains('pmwrap')) && !document.documentElement.classList.contains('touring')) closePhoneView(); });
  document.addEventListener('keydown', phoneKey);
  var f = phoneMask.querySelector('iframe');
  f.addEventListener('load', function(){ try { f.contentWindow.document.addEventListener('keydown', phoneKey); } catch (e) {} });
  phoneFit = phoneSize;
  window.addEventListener('resize', phoneFit);
  setTimeout(function(){ var c = document.getElementById('pmClose'); if (c) c.focus(); }, 30);
}
function closePhoneView(){
  if (!phoneMask) return;
  try { var w = phoneMask.querySelector('iframe').contentWindow; if (w.CS && w.CS.stop) w.CS.stop(); else if (w.speechSynthesis) w.speechSynthesis.cancel(); } catch (e) {}
  phoneMask.remove(); phoneMask = null;
  document.body.classList.remove('phoneopen');
  document.removeEventListener('keydown', phoneKey);
  window.removeEventListener('resize', phoneFit);
  /* pick up whatever was done in the phone, then redraw the office */
  CS.load();
  prevStatus = snapshot();
  CS.state.events.forEach(function(x){ seenEvents[x.id] = 1; });
  render();
  document.getElementById('openPhone').focus();
}
document.getElementById('resetBtn').addEventListener('click', function(){
  if (!confirm('Reset the demo back to the sample data?')) return;
  CS.reset(); prevStatus = snapshot(); seenEvents = {}; CS.state.events.forEach(function(e){ seenEvents[e.id] = 1; });
  closeLayer(); render(); toast('Demo reset to the sample data', 'green', 'refresh');
});
function tick(){ document.getElementById('clock').innerHTML = CS.hm(CS.now()); }
tick(); setInterval(tick, 10000);

function tabs(){
  var locks = CS.activeLocks().length;
  var lotoMissing = CS.OPS.filter(function(o){ return !CS.hasSigned('lototo', o.id); }).length;
  var insp = CS.MACHINES.filter(function(m){ return CS.inspWorst(m.id) === 'red'; }).length;
  var gapsOpen = CS.gapsToday().filter(function(g){ return !g.coveredBy; }).length;
  var t = [['board', 'layout-dashboard', 'Live board', ''], ['cover', 'truck', 'Cover and breakdowns', gapsOpen ? '<span class="cnt red">' + gapsOpen + '</span>' : ''], ['iso', 'lock', 'Isolations', locks ? '<span class="cnt">' + locks + '</span>' : ''], ['sign', 'signature', 'Sign-offs', lotoMissing ? '<span class="cnt">' + lotoMissing + '</span>' : ''], ['insp', 'calendar', 'Inspections', insp ? '<span class="cnt red">' + insp + '</span>' : ''], ['people', 'id-badge', 'People', ''], ['rec', 'printer', 'Records', '']];
  document.getElementById('tabs').innerHTML = t.map(function(x){ return '<button class="' + (tab === x[0] ? 'on' : '') + '" data-tab="' + x[0] + '">' + ic(x[1]) + x[2] + x[3] + '</button>'; }).join('');
  $$('[data-tab]').forEach(function(b){ b.addEventListener('click', function(){ tab = b.dataset.tab; render(); }); });
}

function filters(){
  return '<div class="filters">' + [['all', 'Both sites']].concat(CS.SITES.map(function(s){ return [s.id, s.name]; })).map(function(f){
    return '<button class="chip' + (siteF === f[0] ? ' on' : '') + '" data-site="' + f[0] + '">' + esc(f[1]) + '</button>';
  }).join('') + '<span class="date">' + CS.dayLabel(CS.now()) + ' · Shift started 07:00</span></div>';
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
    (function(){ var red = 0, amb = 0; ms.forEach(function(m){ CS.inspections(m.id).forEach(function(x){ if (x.c === 'red') red++; else if (x.c === 'amber') amb++; }); }); return k(red ? 'red' : amb ? 'amber' : 'green', 'calendar', 'Inspections', red ? red + '<small> overdue</small>' : amb, red ? amb + ' more due in 30 days' : 'Due in the next 30 days'); })() +
    (function(){ var nm = CS.state.nearmisses.filter(function(n){ return CS.now() - n.at < 7 * 864e5 && (siteF === 'all' || n.site === siteF); }); return k(nm.some(function(n){ return n.open; }) ? 'amber' : '', 'alert-octagon', 'Near misses', nm.length, 'Last 7 days, ' + nm.filter(function(n){ return n.how === 'voice'; }).length + ' by voice'); })() +
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
    '<div class="cks">' + cks + '</div>' + inspLine(m.id) + '</button>';
}
function inspLine(mid){
  var l = CS.inspections(mid).filter(function(x){ return x.kind !== 'SERVICE'; });
  return '<div class="insl">' + l.map(function(x){ return '<span class="ip ' + x.c + '">' + x.kind + ' · ' + x.label.replace('Due ', '') + '</span>'; }).join('') + '</div>';
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
      '<div class="info"><b>' + esc(m.name) + ' <span style="color:var(--muted);font-weight:600">· ' + esc(CS.site(m.site).name) + '</span></b><small>' + CS.avatar(o, 'xs') + ' ' + esc(o.first + ' ' + o.last) + ', ' + esc(o.role) + (big && l.reason ? ' · ' + esc(l.reason) : '') + '</small>' + (l.permit ? '<span class="ptag">' + ic('shield-lock') + esc(l.permit) + ' · group box</span>' : '') + '</div>' +
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
      '<div class="tx"><b>' + esc(m.name) + (d.severity === 'serious' ? ', do not use' : ', minor defect') + '</b><br>' + esc(d.note) + (d.raw ? '<i class="raw">' + ic('microphone') + '"' + esc(d.raw) + '"</i>' : '') + '<small>' + esc(o.first + ' ' + o.last) + ' · ' + CS.hm(d.at) + ' · ' + esc(CS.site(m.site).name) + (d.how === 'voice' ? ' · by voice' : '') + (d.assigned ? ' · with ' + esc(CS.op(d.assigned).first) + ' (fitter)' : '') + '</small></div>' +
      (d.photo ? '<img src="' + d.photo + '" alt="Defect photo" data-zoom>' : '') +
      '<button class="smallbtn act" data-fix="' + d.id + '">' + ic('check') + 'Fixed</button></div>' });
  });
  machines().forEach(function(m){
    if (CS.checksToday(m.id, 'pre').length || CS.activeLocks(m.id).length || CS.doNotUse(m.id)) return;
    items.push({ w: 2, h: '<div class="att" data-mrow="' + m.id + '"><span class="ai amber">' + ic('clock') + '</span><div class="tx"><b>' + esc(m.name) + ' has no pre-shift check</b><br>Shift started 07:00 at ' + esc(CS.site(m.site).name) + '<small>' + esc(m.model) + ' · ' + esc(m.ref.replace('Asset ', '')) + '</small></div></div>' });
  });
  CS.gapsToday().forEach(function(g){
    if (g.coveredBy) return; var gm = CS.machine(g.machine || g.from); if (machines().indexOf(gm) < 0) return; var o = CS.op(g.op);
    items.push({ w: 0.3, h: '<div class="att" data-gotab="cover"><span class="ai red">' + ic(g.kind === 'sick' ? 'thermometer' : 'truck') + '</span><div class="tx"><b>' + (g.kind === 'sick' ? esc(gm.name) + ' needs cover: ' + esc(o.first) + ' is off sick' : esc(CS.machine(g.from).name) + ' broke down: ' + (g.machine ? esc(gm.name) + ' needs a driver' : 'no spare free')) + '</b><br>' + CS.coverCandidates(g).length + ' trained to cover. Open Cover and breakdowns to ask them.<small>' + CS.hm(g.at) + ' · ' + esc(CS.site(gm.site).name) + '</small></div></div>' });
  });
  CS.state.nearmisses.forEach(function(n){
    if (!n.open || (siteF !== 'all' && n.site !== siteF)) return; var o = CS.op(n.op);
    items.push({ w: 0.5, h: '<div class="att"><span class="ai ' + (n.severity === 'high' ? 'red' : 'amber') + '">' + ic('alert-octagon') + '</span><div class="tx"><b>' + esc(n.title) + '</b><br>' + esc(n.text) + (n.raw ? '<i class="raw">' + ic('microphone') + '"' + esc(n.raw) + '"</i>' : '') + '<small>' + esc(o.first + ' ' + o.last) + ' · ' + CS.hm(n.at) + ' · ' + (n.severity === 'high' ? 'High potential' : 'Low potential') + ' · ' + esc(n.action) + '</small></div><button class="smallbtn act" data-nm="' + n.id + '">' + ic('check') + 'Reviewed</button></div>' });
  });
  machines().forEach(function(m){
    CS.inspections(m.id).forEach(function(x){ if (x.c !== 'red') return;
      items.push({ w: 0.8, h: '<div class="att" data-mrow="' + m.id + '"><span class="ai red">' + ic('calendar') + '</span><div class="tx"><b>' + esc(m.name) + ': ' + esc(x.name) + ' overdue</b><br>' + esc(x.label) + '. Do not use it for lifting until it has been examined.<small>' + esc(x.every) + ' · last report ' + esc(x.ref) + ' · ' + esc(CS.site(m.site).name) + '</small></div></div>' }); });
  });
  items.sort(function(a, b){ return a.w - b.w; });
  return '<section class="panel" id="attPanel"><div class="ph"><h2>' + ic('alert-triangle') + 'Needs attention</h2><span class="sp"></span><span class="note">' + items.length + ' items</span></div>' +
    (items.length ? items.map(function(i){ return i.h; }).join('') : '<div class="empty">All clear</div>') + '</section>';
}
function feed(){
  var ev = CS.state.events.slice().sort(function(a, b){ return b.at - a.at; }).slice(0, 8);
  return '<section class="panel"><div class="ph"><h2>' + ic('activity') + 'Live activity</h2></div><div class="feed">' +
    ev.map(function(e){ return '<div class="ev' + (seenEvents[e.id] ? '' : ' new') + '"><span class="t">' + CS.hm(e.at) + '</span><span>' + esc(e.text) + '</span></div>'; }).join('') + '</div></section>';
}

/* ---------- tabs ---------- */
function pageBoard(){
  return filters() + kpis() + '<div class="grid2"><div>' + '<section class="panel" id="boardPanel"><div class="ph"><h2>' + ic('layout-dashboard') + 'Plant board</h2><span class="sp"></span><span class="note">Tap a machine for its checks, defects and locks</span></div>' + board() + '</section></div>' +
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
    '<div>' + permitsPanel() + '<section class="panel"><div class="ph"><h2>' + ic('building-factory-2') + 'Fixed plant isolation status</h2></div>' +
    fixed.map(function(m){ var l = CS.activeLocks(m.id); return '<div class="drow" data-mrow="' + m.id + '"><span class="mi" style="font-size:24px;color:var(--ink2)">' + ic(CS.KIND_ICON[m.kind]) + '</span><span class="sp"><b>' + esc(m.name) + '</b> <small style="color:var(--muted)">· ' + esc(CS.site(m.site).name) + '</small></span>' + (l.length ? '<span class="pill lock">' + ic('lock') + l.length + ' lock' + (l.length > 1 ? 's' : '') + ' on</span>' : '<span class="pill ok">Not isolated</span>') + '</div>'; }).join('') +
    '</section>' + lotoCard() + '</div></div>';
}
function permitsPanel(){
  var ps = CS.state.permits.filter(function(p){ return machines().indexOf(CS.machine(p.machine)) >= 0 && (p.open || CS.isToday(p.closed || 0)); }).sort(function(a, b){ return b.at - a.at; });
  return '<section class="panel"><div class="ph"><h2>' + ic('shield-lock') + 'Permits to work</h2><span class="sp"></span><span class="note">Group lock box, one person one lock</span></div>' +
    (ps.length ? ps.map(function(p){
      var m = CS.machine(p.machine), on = CS.activeLocks(p.machine).filter(function(l){ return l.permit === p.id; });
      return '<div class="ptw' + (p.open ? '' : ' closed') + '"><div class="pt1"><b>' + esc(p.id) + '</b><span>' + esc(m.name) + ' · ' + esc(CS.site(m.site).name) + '</span>' + (p.open ? '<span class="pill lock">' + ic('lock') + on.length + ' on the box</span>' : '<span class="pill ok">Closed ' + CS.hm(p.closed) + '</span>') + '</div>' +
        '<div class="pt2">' + esc(p.job) + ' · issued by ' + esc(CS.op(p.by).first + ' ' + CS.op(p.by).last) + ' at ' + CS.hm(p.at) + '</div>' +
        '<div class="pt3">' + p.points.map(function(x){ return '<span>' + ic('circle-check') + esc(x.t.split('.')[0]) + '</span>'; }).join('') + '<span>' + ic('circle-check') + 'Tried, nothing moved</span></div>' +
        (p.open ? '<div class="avs">' + on.map(function(l){ var o = CS.op(l.op); return '<span class="p">' + CS.avatar(o, 'xs') + esc(o.first) + ' · lock ' + o.lock + '</span>'; }).join('') + '</div>' : (p.note ? '<div class="pt2">Hand back: ' + esc(p.note) + '</div>' : '')) + '</div>';
    }).join('') : '<div class="empty">No permits today</div>') + '</section>';
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
  var T = CS.TBT, tops = CS.OPS.filter(function(o){ return o.site === T.site && (siteF === 'all' || siteF === T.site); });
  var tbt = tops.length ? '<section class="panel"><div class="ph"><h2>' + ic('users-group') + 'Toolbox talk today: ' + esc(T.title) + '</h2><span class="sp"></span><span class="note">' + esc(T.by) + ' · ' + esc(CS.site(T.site).name) + ' · tap to sign attendance</span></div><div class="tbtg">' +
    tops.map(function(o){ var a = CS.state.tbt.filter(function(x){ return x.op === o.id && x.tbt === T.id; })[0]; return '<div class="tb' + (a ? ' ok' : '') + '">' + CS.avatar(o, 'sm') + '<span><b>' + esc(o.first + ' ' + o.last) + '</b><small>' + (a ? 'Signed ' + CS.hm(a.at) : 'Not signed yet') + '</small></span>' + ic(a ? 'circle-check' : 'clock') + '</div>'; }).join('') + '</div></section>' : '';
  return filters() + '<div class="swpcards">' + cards + '</div>' + tbt +
    '<section class="panel"><div class="ph"><h2>' + ic('signature') + 'Sign-off log</h2><span class="sp"></span>' +
    CS.SWPS.map(function(p){ return '<button class="chip' + (swpF === p.id ? ' on' : '') + '" data-swpf="' + p.id + '" style="margin-left:6px">' + esc(p.title) + '</button>'; }).join('') +
    '<button class="smallbtn pri" data-brief="' + swpF + '" style="margin-left:6px">' + ic('file-search') + 'Briefing record</button></div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Who</th><th>Site</th><th>Procedure</th><th>Signed</th><th>Understood</th><th>How</th></tr></thead><tbody>' +
    (log.length ? log.map(function(s){ var o = CS.op(s.op), p = CS.byId(CS.SWPS, s.swp); return '<tr data-new-sign="' + s.id + '"><td><span class="who">' + CS.avatar(o, 'sm') + esc(o.first + ' ' + o.last) + '</span></td><td>' + esc(CS.site(o.site).name) + '</td><td>' + esc(p.title) + ' <small style="color:var(--muted)">' + esc(s.ver || p.ver) + (s.lang === 'pl' ? ' · in Polish' : '') + '</small></td><td>' + CS.hm(s.at) + ' · ' + CS.dayLabel(s.at) + '</td><td>' + (s.quiz ? '<span class="pill ' + (s.quiz.tries > 1 ? 'amber' : 'ok') + '">' + ic('circle-check') + s.quiz.right + ' of ' + s.quiz.of + (s.quiz.tries > 1 ? ', 2nd listen' : ', first time') + '</span>' : '<span style="color:var(--muted)">Before picture checks</span>') + '</td><td>' + (s.sig ? '<img src="' + s.sig + '" alt="Signature" style="height:30px;background:#fff;border-radius:6px;padding:2px 6px">' : '<span class="pill ok">' + ic('hand-finger') + 'Tap to sign, after listening</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">No sign-offs yet</td></tr>') +
    '</tbody></table></div></section>';
}
function pageRec(){
  var ms = machines();
  var list = CS.state.checks.filter(function(c){ return ms.indexOf(CS.machine(c.machine)) >= 0; }).sort(function(a, b){ return b.at - a.at; });
  var picker = '<section class="panel auditp"><div class="ph"><h2>' + ic('file-search') + 'Audit pack</h2><span class="sp"></span><span class="note">For an inspector, an insurer or your director</span></div><div class="aud">' +
    '<span>Show everything for</span><select id="auditSel" aria-label="Machine">' + ms.map(function(m){ return '<option value="' + m.id + '"' + (m.id === 'm2' ? ' selected' : '') + '>' + esc(m.name + ' · ' + CS.site(m.site).name) + '</option>'; }).join('') + '</select><span>in the last 30 days</span><button class="smallbtn pri" data-auditgo>' + ic('file-search') + 'Build the pack</button></div></section>';
  return filters() + picker + '<section class="panel"><div class="ph"><h2>' + ic('printer') + 'Check records</h2><span class="sp"></span><span class="linknote">' + ic('link') + 'Can link to your current system</span></div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Time</th><th>Machine</th><th>Check</th><th>Who</th><th>Result</th><th></th></tr></thead><tbody>' +
    list.map(function(c){ var m = CS.machine(c.machine), o = CS.op(c.op), t = CS.byId(CS.CHECK_TYPES, c.type), f = c.items.filter(function(i){ return !i.ok; }).length;
      return '<tr><td>' + CS.hm(c.at) + '</td><td><b>' + esc(m.name) + '</b> <small style="color:var(--muted)">' + esc(CS.site(m.site).name) + '</small></td><td>' + t.name + '</td><td><span class="who">' + CS.avatar(o, 'sm') + esc(o.first + ' ' + o.last) + '</span></td><td>' + (f ? '<span class="pill bad">' + f + ' defect' + (f > 1 ? 's' : '') + '</span>' : '<span class="pill ok">All OK</span>') + '</td><td><button class="smallbtn" data-rec="' + c.id + '">' + ic('printer') + 'View and print</button></td></tr>'; }).join('') +
    '</tbody></table></div></section>';
}

/* ---------- cover and breakdowns ----------
   Who is off today, what that leaves without a driver, who is trained and allowed to cover it,
   one tap to ask them, first yes gets it. Breakdowns: Do not use, fitter told, spare suggested. */
function jobList(mid){
  var j = CS.jobsFor(mid);
  if (!j.length) return '';
  return '<div class="gjobs"><small>' + j.length + ' job' + (j.length > 1 ? 's' : '') + ' today on ' + esc(CS.machine(mid).name) + '</small>' + j.map(function(x){ return '<span>' + CS.hm(x.at) + ' · ' + esc(x.what) + ' · ' + esc(x.where) + '</span>'; }).join('') + '</div>';
}
function gapCard(g){
  var who = CS.op(g.op), m = g.machine ? CS.machine(g.machine) : null, cands = CS.coverCandidates(g);
  var bd = g.kind === 'breakdown' ? CS.byId(CS.state.breakdowns, g.breakdown) : null, from = g.from ? CS.machine(g.from) : null;
  var cov = g.coveredBy ? CS.op(g.coveredBy) : null;
  var head = g.kind === 'sick'
    ? ''
    : '<span class="gi red">' + ic('truck') + '</span><div class="gt"><b>' + esc(from.name) + ' has broken down</b><small>' + esc(who.first + ' ' + who.last) + ' · ' + CS.hm(g.at) + (bd && bd.where ? ' · ' + esc(bd.where) : '') + '</small></div>';
  if (g.kind === 'sick') { var ab = CS.byId(CS.state.absences, g.absence); head = '<span class="gi red">' + ic('thermometer') + '</span><div class="gt"><b>' + esc(who.first + ' ' + who.last) + ' is off sick</b><small>' + esc(who.role) + ' · ' + (ab && ab.how === 'office' ? 'logged by the office' : 'told us on the phone') + ' at ' + CS.hm(g.at) + '</small></div>'; }
  var h = '<div class="gap ' + (cov ? 'ok' : 'open') + '" data-gap="' + g.id + '"><div class="g1">' + head + (cov ? '<span class="pill ok">' + ic('circle-check') + 'Covered</span>' : '<span class="pill bad">' + ic('alert-triangle') + 'Needs cover</span>') + '</div>';
  if (bd) {
    var fit = CS.op(CS.FITTER[from.site]);
    h += '<div class="gbd">' + (bd.photo ? '<img src="' + bd.photo + '" alt="Breakdown photo" data-zoom>' : '') + '<div><b>' + esc(bd.text) + '</b>' + (bd.raw ? '<i class="raw">' + ic('microphone') + '"' + esc(bd.raw) + '"</i>' : '') +
      '<div class="gflags"><span class="pill bad">' + ic('hand-stop') + (bd.open ? 'Do not use' : 'Fixed ' + CS.hm(bd.back)) + '</span><span class="pill amber">' + ic('tools') + esc(fit.first) + ' the fitter told</span></div></div></div>';
  }
  if (g.kind === 'sick') h += '<div class="gneed">' + ic(CS.KIND_ICON[m.kind]) + '<span><b>' + esc(m.name) + ' needs a ' + (m.kind === 'lorry' ? 'driver' : 'driver or operator') + ' today</b></span></div>' + jobList(g.jobsOf);
  else if (m) h += '<div class="gneed">' + ic(CS.KIND_ICON[m.kind]) + '<span><b>Spare: ' + esc(m.name) + '</b><small>' + esc(m.model) + (CS.checksToday(m.id, 'pre').length ? ' · pre-shift check done today' : ' · needs a pre-shift check') + '</small></span></div>' + jobList(g.jobsOf);
  else h += '<div class="gneed">' + ic('alert-triangle') + '<span><b>No spare free</b><small>The fitter or office sorts a hire or moves the work.</small></span></div>' + jobList(g.jobsOf);
  if (cov) {
    h += '<div class="gcov">' + CS.avatar(cov, 'sm') + '<span class="gtx"><b>' + esc(cov.first + ' ' + cov.last) + ' is covering ' + esc(m.name) + '</b><small>Said yes at ' + CS.hm(g.coveredAt) + '. First to say yes gets it. Logged.</small></span>' + ic('circle-check') + '</div>';
  } else if (m) {
    var sug = cands.filter(function(c){ return !c.no && !c.cov; })[0];
    if (g.kind === 'breakdown' && sug) h += '<div class="gsug">' + ic('bulb') + '<span>Suggested: <b>' + esc(m.name) + '</b> with <b>' + esc(sug.op.first + ' ' + sug.op.last) + '</b>, trained on it' + (sug.st.free ? ' and free' : ' (' + esc(sug.st.t.charAt(0).toLowerCase() + sug.st.t.slice(1)) + ')') + '</span>' + (sug.asked ? '' : '<button class="smallbtn pri" data-ask="' + g.id + '" data-op="' + sug.op.id + '">' + ic('send') + 'Ask ' + esc(sug.op.first) + '</button>') + '</div>';
    var open = cands.filter(function(c){ return !c.asked && !c.no && !c.cov; });
    h += '<div class="cands"><div class="ch">Trained and allowed to drive ' + esc(m.name) + ' · ' + cands.length + '</div>' +
      (cands.length ? cands.map(function(c){
        var o = c.op, state = c.cov ? '' : c.no ? '<span class="pill bad">' + ic('x') + 'Said no</span>' : c.asked ? '<span class="pill amber">' + ic('clock') + 'Asked, waiting</span>' : '<button class="smallbtn" data-ask="' + g.id + '" data-op="' + o.id + '">' + ic('send') + 'Ask</button>';
        return '<div class="cand">' + CS.avatar(o, 'sm') + '<span class="cn"><b>' + esc(o.first + ' ' + o.last) + '</b><small>' + esc(o.role) + '</small></span><span class="pill ' + (c.st.free ? 'ok' : 'mute') + '">' + esc(c.st.t) + '</span>' + state + '</div>';
      }).join('') : '<div class="empty">Nobody else is trained on ' + esc(m.name) + '. Ring round or hire in.</div>') + '</div>' +
      (open.length > 1 ? '<button class="smallbtn pri wide" data-askall="' + g.id + '">' + ic('send') + 'Ask all ' + open.length + ' on their phones. First yes gets it</button>' : '');
  }
  return h + '</div>';
}
function pageCover(){
  var gs = CS.gapsToday().filter(function(g){ var m = CS.machine(g.machine || g.from); return siteF === 'all' || m.site === siteF; }).sort(function(a, b){ return (a.coveredBy ? 1 : 0) - (b.coveredBy ? 1 : 0) || b.at - a.at; });
  var ops = CS.OPS.filter(function(o){ return siteF === 'all' || o.site === siteF; });
  var off = ops.filter(function(o){ return CS.offToday(o.id); });
  var open = gs.filter(function(g){ return !g.coveredBy; }).length;
  var offRoad = CS.state.breakdowns.filter(function(b){ return b.open && (siteF === 'all' || CS.machine(b.machine).site === siteF); }).length;
  function k(cls, icon, label, v, sub){ return '<div class="kpi ' + cls + '"><div class="k">' + ic(icon) + label + '</div><div class="v">' + v + '</div><div class="s">' + sub + '</div></div>'; }
  var sum = '<div class="kpis three">' + k(off.length ? 'amber' : 'green', 'thermometer', 'Off sick today', off.length, off.length ? off.map(function(o){ return o.first; }).join(', ') : 'Everyone is in') +
    k(open ? 'red' : 'green', 'user-check', 'Gaps to cover', open, open ? 'Still need a driver' : gs.length ? 'All covered' : 'Nothing to cover') +
    k(offRoad ? 'red' : 'green', 'truck', 'Off the road', offRoad, offRoad ? 'Broken down today' : 'All vehicles running') + '</div>';
  var present = ops.filter(function(o){ return !CS.offToday(o.id) && !o.fitter; });
  var logBox = '<section class="panel"><div class="ph"><h2>' + ic('thermometer') + 'Someone rang in sick?</h2></div><div class="aud"><select id="sickSel" aria-label="Who is off sick">' + present.map(function(o){ return '<option value="' + o.id + '">' + esc(o.first + ' ' + o.last + ' · ' + o.role) + '</option>'; }).join('') + '</select><button class="smallbtn pri" data-sicklog>' + ic('thermometer') + 'Log off sick</button></div><div class="ph" style="margin:10px 0 0"><span class="note">Most people tap "I\'m off sick" on their own phone. This is for when they ring in.</span></div></section>';
  /* absence list */
  var abs = ops.map(function(o){ var l = CS.state.absences.filter(function(a){ return a.op === o.id && CS.now() - a.at < 56 * 864e5; }).sort(function(a, b){ return b.at - a.at; }); return { o: o, l: l, today: CS.offToday(o.id), pat: CS.absencePattern(o.id) }; })
    .filter(function(x){ return x.l.length; }).sort(function(a, b){ return (b.today ? 1 : 0) - (a.today ? 1 : 0) || b.l.length - a.l.length; });
  var absP = '<section class="panel"><div class="ph"><h2>' + ic('calendar') + 'Off sick, last 8 weeks</h2><span class="sp"></span><span class="note">Spots patterns from the dates</span></div><div class="tw"><table class="t tsm"><thead><tr><th>Who</th><th>Days</th><th>Last off</th><th>Pattern</th></tr></thead><tbody>' +
    (abs.length ? abs.map(function(x){ return '<tr><td class="nw"><b>' + esc(x.o.first + ' ' + x.o.last) + '</b></td><td><b>' + x.l.length + '</b></td><td class="nw">' + (x.today ? '<span class="pill bad">Today</span>' : esc(CS.weekday(x.l[0].at).slice(0, 3) + ' ' + CS.dShort(x.l[0].at))) + '</td><td>' + (x.pat ? '<span class="pill amber">' + esc(x.pat) + '</span>' : '<span style="color:var(--muted)">None</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="empty">Nobody off in the last 8 weeks</td></tr>') +
    '</tbody></table></div></section>';
  /* breakdown log */
  var ms = machines().filter(function(m){ return m.group === 'mobile'; });
  var rows = ms.map(function(m){
    var h = CS.state.bdHist.filter(function(x){ return x.machine === m.id; }), live = CS.state.breakdowns.filter(function(x){ return x.machine === m.id; });
    var days = h.reduce(function(a, x){ return a + x.days; }, 0) + live.filter(function(x){ return !x.open; }).length;
    var lastH = h.slice().sort(function(a, b){ return b.at - a.at; })[0], lastL = live.slice().sort(function(a, b){ return b.at - a.at; })[0];
    return { m: m, n: h.length + live.length, days: days, openNow: live.some(function(x){ return x.open; }), last: lastL ? 'Today: ' + (lastL.what || 'breakdown') + (lastL.open ? '' : ', back ' + CS.hm(lastL.back)) : lastH ? CS.dShort(lastH.at) + ': ' + lastH.what : '' };
  }).filter(function(x){ return x.n; }).sort(function(a, b){ return (b.openNow ? 1 : 0) - (a.openNow ? 1 : 0) || b.n - a.n; });
  var bdP = '<section class="panel"><div class="ph"><h2>' + ic('truck') + 'Breakdown log, last 12 months</h2></div><div class="tw"><table class="t tsm"><thead><tr><th>Vehicle</th><th>Breakdowns</th><th>Days off the road</th><th>Last one</th></tr></thead><tbody>' +
    rows.map(function(x){ return '<tr><td><b>' + esc(x.m.name) + '</b><br><small style="color:var(--muted)">' + esc(x.m.model) + '</small></td><td><b>' + x.n + '</b></td><td>' + x.days + (x.openNow ? ' <span class="pill bad">Off now</span>' : '') + '</td><td>' + esc(x.last) + '</td></tr>'; }).join('') +
    '</tbody></table></div><div class="ph" style="margin:10px 0 0"><span class="note">Earlier breakdowns are sample data. New ones go in from the phone.</span></div></section>';
  return filters() + sum + '<div class="grid2"><div><section class="panel"><div class="ph"><h2>' + ic('user-check') + 'Today\'s gaps</h2><span class="sp"></span><span class="note">Live from the phones</span></div>' +
    (gs.length ? gs.map(gapCard).join('') : '<div class="empty">' + ic('circle-check') + ' Nobody off and nothing broken down. Gaps show here the moment someone taps "I\'m off sick" or reports a breakdown.</div>') + '</section>' + bdP + '</div>' +
    '<div>' + logBox + absP + '</div></div>';
}
function bindCover(){
  $$('[data-ask]', view).forEach(function(b){ b.addEventListener('click', function(){ var o = CS.op(b.dataset.op); if (CS.askCover(b.dataset.ask, [o.id])) toast('Asked ' + o.first + ' on their phone', '', 'send'); render(); }); });
  $$('[data-askall]', view).forEach(function(b){ b.addEventListener('click', function(){ var g = CS.byId(CS.state.gaps, b.dataset.askall), ids = CS.coverCandidates(g).filter(function(c){ return !c.asked && !c.no && !c.cov; }).map(function(c){ return c.op.id; }); if (CS.askCover(g.id, ids)) toast('Asked ' + ids.map(function(id){ return CS.op(id).first; }).join(', ') + ' on their phones. First yes gets it.', '', 'send'); render(); }); });
  var sb = view.querySelector('[data-sicklog]'); if (sb) sb.addEventListener('click', function(){ var id = view.querySelector('#sickSel').value, o = CS.op(id); if (CS.markSick(id, 'office')) { prevStatus = snapshot(); render(); toast(o.first + ' logged off sick.' + (o.main ? ' ' + CS.machine(o.main).name + ' needs cover.' : ''), 'red', 'thermometer'); } });
}
/* Plain English: what the safety words mean. */
function words(){
  layer.innerHTML = '<div class="scrim" data-close></div><aside class="drawer notip"><div class="dh"><span class="mi">' + ic('school') + '</span><div><h2>Plain English</h2><small>What the safety words on screen mean. Hover any dotted word to see this too.</small></div><button class="smallbtn x" data-close>' + ic('x') + 'Close</button></div>' +
    CS.GLOSS.map(function(g){ return '<div class="gl1"><b>' + esc(g[0].charAt(0).toUpperCase() + g[0].slice(1)) + '</b><span>' + esc(g[1]) + '</span></div>'; }).join('') + '</aside>';
  $$('[data-close]', layer).forEach(function(b){ b.addEventListener('click', closeLayer); });
}

/* ---------- render ---------- */
function render(changed){
  tabs();
  var y = window.scrollY;
  view.innerHTML = tab === 'board' ? pageBoard() : tab === 'cover' ? pageCover() : tab === 'iso' ? pageIso() : tab === 'sign' ? pageSign() : tab === 'insp' ? pageInsp() : tab === 'people' ? pagePeople() : pageRec();
  window.scrollTo(0, y);
  $$('[data-site]', view).forEach(function(b){ b.addEventListener('click', function(){ siteF = b.dataset.site; render(); }); });
  $$('[data-swpf]', view).forEach(function(b){ b.addEventListener('click', function(){ swpF = b.dataset.swpf; render(); }); });
  $$('[data-m]', view).forEach(function(b){ b.addEventListener('click', function(){ drawer(b.dataset.m); }); });
  $$('.att[data-mrow],.drow[data-mrow],.lockrow[data-mrow]', view).forEach(function(b){ b.style.cursor = 'pointer'; b.addEventListener('click', function(e){ if (e.target.closest('[data-fix],[data-zoom]')) return; drawer(b.dataset.mrow); }); });
  $$('[data-fix]', view).forEach(function(b){ b.addEventListener('click', function(){ CS.fixDefect(b.dataset.fix); prevStatus = snapshot(); render(); toast('Defect marked fixed', 'green', 'check'); }); });
  $$('[data-zoom]', view).forEach(function(i){ i.addEventListener('click', function(){ zoom(i.src); }); });
  $$('[data-rec]', view).forEach(function(b){ b.addEventListener('click', function(){ record(b.dataset.rec); }); });
  $$('[data-nm]', view).forEach(function(b){ b.addEventListener('click', function(){ var n = CS.byId(CS.state.nearmisses, b.dataset.nm); if (n) { n.open = false; CS.persist({ type: 'nm' }); } render(); toast('Near miss marked reviewed', 'green', 'check'); }); });
  $$('[data-audit]', view).forEach(function(b){ b.addEventListener('click', function(){ audit(b.dataset.audit); }); });
  $$('[data-brief]', view).forEach(function(b){ b.addEventListener('click', function(){ briefing(b.dataset.brief); }); });
  var asel = view.querySelector('#auditSel'); if (asel) view.querySelector('[data-auditgo]').addEventListener('click', function(){ audit(asel.value); });
  if (tab === 'cover') bindCover();
  $$('[data-gotab]', view).forEach(function(b){ b.style.cursor = 'pointer'; b.addEventListener('click', function(){ tab = b.dataset.gotab; render(); window.scrollTo(0, 0); }); });
  CS.terms(view); CS.terms(document.getElementById('tabs'));
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
    '<h3>Inspections</h3>' + CS.inspections(mid).map(function(x){ return '<div class="drow"><span class="sp"><b>' + esc(x.name) + '</b><br><small style="color:var(--muted)">' + esc(x.every) + ' · last ' + CS.dYear(x.last) + ' · ' + esc(x.ref) + '</small></span><span class="pill ' + (x.c === 'green' ? 'ok' : x.c === 'red' ? 'bad' : 'amber') + '">' + esc(x.label) + '</span></div>'; }).join('') +
    '<button class="smallbtn audbtn" data-audit="' + mid + '">' + ic('file-search') + 'Audit pack: everything for ' + esc(m.name) + ', last 30 days</button>' +
    '<h3>Checks today</h3>' + (cks.length ? cks.map(function(c){ var o = CS.op(c.op), t = CS.byId(CS.CHECK_TYPES, c.type), f = c.items.filter(function(i){ return !i.ok; }).length; return '<div class="drow"><span class="sp"><b>' + t.name + '</b> · ' + CS.hm(c.at) + '<br><small style="color:var(--muted)">' + esc(o.first + ' ' + o.last) + '</small></span>' + (f ? '<span class="pill bad">' + f + ' defect' + (f > 1 ? 's' : '') + '</span>' : '<span class="pill ok">All OK</span>') + '<button class="smallbtn" data-rec="' + c.id + '">' + ic('printer') + 'Record</button></div>'; }).join('') : '<div class="empty">No checks yet today</div>') +
    '</aside>';
  $$('[data-close]', layer).forEach(function(b){ b.addEventListener('click', closeLayer); });
  $$('[data-fix]', layer).forEach(function(b){ b.addEventListener('click', function(){ CS.fixDefect(b.dataset.fix); prevStatus = snapshot(); render(); drawer(mid); toast('Defect marked fixed', 'green', 'check'); }); });
  $$('[data-rec]', layer).forEach(function(b){ b.addEventListener('click', function(){ record(b.dataset.rec); }); });
  $$('[data-audit]', layer).forEach(function(b){ b.addEventListener('click', function(){ audit(b.dataset.audit); }); });
  $$('[data-zoom]', layer).forEach(function(i){ i.addEventListener('click', function(){ zoom(i.src); }); });
  CS.terms(layer);
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

/* ---------- inspections ---------- */
function pageInsp(){
  var ms = machines();
  var cell = function(m, kind){ var x = CS.inspections(m.id).filter(function(i){ return i.kind === kind; })[0]; if (!x) return '<td><span style="color:var(--muted)">' + (kind === 'LOLER' ? 'Not used for lifting' : 'Not tracked here') + '</span></td>'; return '<td><span class="pill ' + (x.c === 'green' ? 'ok' : x.c === 'red' ? 'bad' : 'amber') + '">' + esc(x.label) + '</span><br><small style="color:var(--muted)">' + esc(x.every) + ' · last ' + CS.dYear(x.last) + ' · ' + esc(x.ref) + '</small></td>'; };
  return filters() + '<section class="panel"><div class="ph"><h2>' + ic('calendar') + 'Inspection and examination dates</h2><span class="sp"></span><span class="legend"><span><i style="background:var(--ok)"></i>over 30 days</span><span><i style="background:var(--amber)"></i>due in 30 days</span><span><i style="background:var(--bad)"></i>overdue</span></span></div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Machine</th><th>LOLER thorough examination</th><th>PUWER inspection</th><th>Service</th><th></th></tr></thead><tbody>' +
    ms.map(function(m){ return '<tr><td><b>' + esc(m.name) + '</b><br><small style="color:var(--muted)">' + esc(m.model + ' · ' + CS.site(m.site).name) + '</small></td>' + cell(m, 'LOLER') + cell(m, 'PUWER') + cell(m, 'SERVICE') + '<td><button class="smallbtn" data-audit="' + m.id + '">' + ic('file-search') + 'Audit pack</button></td></tr>'; }).join('') +
    '</tbody></table></div><div class="ph" style="margin:12px 0 0"><span class="note">LOLER: lifting equipment such as forklifts and telehandlers needs a thorough examination by a competent person at least every 12 months (every 6 months for lifting accessories or anything that lifts people), or to a written examination scheme. PUWER reg 6: inspect plant where wear could make it unsafe, and keep the result until the next inspection. Dates and intervals shown are sample data.</span></div></section>';
}

/* ---------- people: authorisations and training ---------- */
function pagePeople(){
  var ops = CS.OPS.filter(function(o){ return siteF === 'all' || o.site === siteF; });
  return filters() + '<section class="panel"><div class="ph"><h2>' + ic('id-badge') + 'Who can use what, and who can isolate what</h2><span class="sp"></span><span class="note">The phone blocks anyone not on these lists</span></div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Person</th><th>Trained to use</th><th>Authorised to isolate</th><th>Training needing action</th><th>New LOTOTO</th></tr></thead><tbody>' +
    ops.map(function(o){
      var flags = CS.training(o.id).filter(function(t){ return CS.tStatus(t).c !== 'green'; });
      return '<tr><td><span class="who">' + CS.avatar(o, 'sm') + '<span><b>' + esc(o.first + ' ' + o.last) + '</b><br><small style="color:var(--muted)">' + esc(o.role + ' · ' + CS.site(o.site).name + ' · lock ' + o.lock) + '</small></span></span></td>' +
        '<td>' + o.drive.map(function(id){ var ok = CS.canDrive(o.id, id).ok; return '<span class="tagm' + (ok ? '' : ' bad') + '">' + esc(CS.machine(id).name) + '</span>'; }).join('') + '</td>' +
        '<td>' + (o.iso.length ? o.iso.map(function(id){ return '<span class="tagm lk">' + ic('lock') + esc(CS.machine(id).name) + '</span>'; }).join('') : '<span class="pill bad">Not authorised</span>') + '</td>' +
        '<td>' + (flags.length ? flags.map(function(t){ var st = CS.tStatus(t); return '<span class="pill ' + (st.c === 'red' ? 'bad' : 'amber') + '" style="margin:2px 4px 2px 0">' + esc(t.name.replace('(in-house)', '').trim() + ': ' + st.label) + '</span>'; }).join('') : '<span class="pill ok">All in date</span>') + '</td>' +
        '<td>' + (CS.hasSigned('lototo', o.id) ? '<span class="pill ok">' + ic('check') + 'Signed</span>' : '<span class="pill amber">Not yet</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';
}

/* ---------- audit pack: everything for one machine, last 30 days ---------- */
function audit(mid){
  var m = CS.machine(mid), hist = CS.history(mid), todayCks = CS.state.checks.filter(function(c){ return c.machine === mid; });
  var rows = hist.concat(todayCks.map(function(c){ var f = c.items.filter(function(i){ return !i.ok; }).length; return { at: c.at, type: c.type, op: c.op, ok: !f, note: f ? f + ' defect' + (f > 1 ? 's' : '') + ' reported' : '' }; })).sort(function(a, b){ return b.at - a.at; });
  var days = {}; rows.forEach(function(r){ if (r.type === 'pre') days[CS.dShort(r.at)] = 1; });
  var defs = CS.state.defects.filter(function(d){ return d.machine === mid; });
  var locks = CS.state.locks.filter(function(l){ return l.machine === mid; });
  var permits = CS.state.permits.filter(function(p){ return p.machine === mid; });
  var nms = CS.state.nearmisses.filter(function(n){ return n.machine === mid; });
  var drivers = CS.OPS.filter(function(o){ return o.drive.indexOf(mid) >= 0; });
  var T = function(t){ return CS.dShort(t) + ' ' + CS.hm(t); };
  var nm = function(id){ var o = CS.op(id); return esc(o.first + ' ' + o.last); };
  layer.innerHTML = '<div class="recwrap"><div class="recbar"><button class="smallbtn" data-close>' + ic('arrow-left') + 'Back</button><span class="sp"></span><span class="linknote" style="color:#cfd6d2">' + ic('file-search') + 'Built in one click from the records</span><button class="smallbtn" data-print style="background:var(--brand);color:#fff;border-color:var(--brand)">' + ic('printer') + 'Print or save as PDF</button></div>' +
    '<article class="rec"><div class="rh"><img src="coastal-logo.svg" alt="Coastal Recycling"><div class="ti"><b>Audit pack: ' + esc(m.name) + '</b><small>Last 30 days to ' + CS.dayLabel(CS.now()) + '</small></div></div>' +
    '<div class="meta"><div><small>Machine</small><b>' + esc(m.name) + '</b><br>' + esc(m.model) + '</div><div><small>Reg or asset</small><b>' + esc(m.ref) + '</b></div><div><small>Site</small><b>' + esc(CS.site(m.site).name) + '</b></div>' +
    '<div><small>Checks recorded</small><b>' + rows.length + '</b><br>' + Object.keys(days).length + ' days with a pre-use check</div><div><small>Defects open now</small><b>' + defs.filter(function(d){ return d.open; }).length + '</b><br>' + defs.length + ' on record today</div><div><small>Isolations</small><b>' + locks.length + ' locks, ' + permits.length + ' permits</b></div></div>' +
    '<h4>Inspections and examinations</h4><table><thead><tr><th>Type</th><th>Interval</th><th>Last</th><th>Next due</th><th>Report</th></tr></thead><tbody>' +
    CS.inspections(mid).map(function(x){ return '<tr><td><b>' + esc(x.name) + '</b></td><td>' + esc(x.every) + '</td><td>' + CS.dShort(x.last) + '</td><td class="' + (x.c === 'red' ? 'res-bad' : '') + '">' + esc(x.label) + '</td><td>' + esc(x.ref) + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<h4>Defects and how they were closed</h4><table><thead><tr><th>Reported</th><th>Defect</th><th>By</th><th>Severity</th><th>Closed</th></tr></thead><tbody>' +
    (defs.length ? defs.map(function(d){ return '<tr><td>' + T(d.at) + '</td><td>' + esc(d.note) + (d.how === 'voice' ? ' (by voice)' : '') + '</td><td>' + nm(d.op) + '</td><td>' + (d.severity === 'serious' ? 'Serious, Do not use' : 'Minor') + '</td><td>' + (d.open ? '<span class="res-bad">Open</span>' : T(d.fixedAt) + (d.fixedBy ? ', ' + nm(d.fixedBy) : '') + (d.fixNote ? ': ' + esc(d.fixNote) : '')) + '</td></tr>'; }).join('') : '<tr><td colspan="5">No defects open today. Earlier minor defects are in the check log below.</td></tr>') + '</tbody></table>' +
    '<h4>Isolations</h4><table><thead><tr><th>On</th><th>Off</th><th>Who</th><th>Why</th></tr></thead><tbody>' +
    (locks.length ? locks.map(function(l){ return '<tr><td>' + T(l.on) + '</td><td>' + (l.off ? T(l.off) : '<b>Still on</b>') + '</td><td>' + nm(l.op) + ', lock ' + CS.op(l.op).lock + '</td><td>' + esc(l.reason || '') + (l.permit ? ' (' + esc(l.permit) + ')' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="4">No isolations recorded</td></tr>') + '</tbody></table>' +
    (nms.length ? '<h4>Near misses</h4><table><tbody>' + nms.map(function(n){ return '<tr><td>' + T(n.at) + '</td><td>' + esc(n.text) + '</td><td>' + esc(n.action) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
    '<h4>Who is trained to use it</h4><table><tbody>' + drivers.map(function(o){ var t = CS.training(o.id).filter(function(x){ return x.name === CS.CARD[m.kind]; })[0], st = t ? CS.tStatus(t) : null; return '<tr><td><b>' + nm(o.id) + '</b></td><td>' + esc(t ? t.name : 'Fitter') + '</td><td class="' + (st && st.c === 'red' ? 'res-bad' : '') + '">' + esc(st ? st.label : '') + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<h4>Check log</h4><table><thead><tr><th>When</th><th>Check</th><th>Who</th><th>Result</th></tr></thead><tbody>' +
    rows.map(function(r){ return '<tr><td>' + T(r.at) + '</td><td>' + CS.byId(CS.CHECK_TYPES, r.type).name + '</td><td>' + nm(r.op) + '</td><td class="' + (r.ok ? 'res-ok' : 'res-bad') + '">' + (r.ok ? 'All OK' : esc(r.note)) + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<div class="rf"><span>Coastal Recycling · Audit pack · ' + esc(m.name) + '</span><span>Demo, sample data. Earlier days are made up for the demo · Built by ApexLine</span></div></article></div>';
  $$('[data-close]', layer).forEach(function(b){ b.addEventListener('click', closeLayer); });
  layer.querySelector('[data-print]').addEventListener('click', function(){ window.print(); });
}

/* ---------- briefing record ----------
   Who was briefed on a procedure, when, which version, in which language, and how they did on the
   picture check. One click from the Sign-offs tab, for an auditor (ISO 45001), HSE or the insurer. */
function briefing(sid){
  var p = CS.byId(CS.SWPS, sid); if (!p) return;
  var ops = CS.OPS.filter(function(o){ return siteF === 'all' || o.site === siteF; });
  var signs = CS.state.signoffs.filter(function(x){ return x.swp === sid && ops.indexOf(CS.op(x.op)) >= 0; }).sort(function(a, b){ return b.at - a.at; });
  var latest = {}; signs.forEach(function(x){ if (!latest[x.op]) latest[x.op] = x; });
  var miss = ops.filter(function(o){ return !latest[o.id]; });
  var first = signs.filter(function(x){ return x.quiz && x.quiz.tries <= 1; }).length, again = signs.filter(function(x){ return x.quiz && x.quiz.tries > 1; }).length;
  var pl = signs.filter(function(x){ return x.lang === 'pl'; }).length;
  var T = function(t){ return CS.dShort(t) + ' ' + CS.hm(t); };
  var nm = function(o){ return esc(o.first + ' ' + o.last); };
  layer.innerHTML = '<div class="recwrap"><div class="recbar"><button class="smallbtn" data-close>' + ic('arrow-left') + 'Back</button><span class="sp"></span><span class="linknote" style="color:#cfd6d2">' + ic('file-search') + 'Built in one click from the sign-offs</span><button class="smallbtn" data-print style="background:var(--brand);color:#fff;border-color:var(--brand)">' + ic('printer') + 'Print or save as PDF</button></div>' +
    '<article class="rec brief"><div class="rh"><img src="coastal-logo.svg" alt="Coastal Recycling"><div class="ti"><b>Briefing record: ' + esc(p.title) + '</b><small>' + esc(p.code + ' · ' + p.ver) + ' · to ' + CS.dayLabel(CS.now()) + '</small></div></div>' +
    '<div class="meta"><div><small>Procedure</small><b>' + esc(p.title) + '</b><br>' + esc(p.code + ' · ' + p.ver) + '</div><div><small>Sites</small><b>' + esc(siteF === 'all' ? CS.SITES.map(function(x){ return x.name; }).join(' and ') : CS.site(siteF).name) + '</b></div><div><small>Signed</small><b>' + Object.keys(latest).length + ' of ' + ops.length + '</b><br>' + miss.length + ' still to sign</div>' +
    '<div><small>Picture check</small><b>' + first + ' first time</b><br>' + again + ' after a second listen</div><div><small>Language</small><b>' + (signs.length - pl) + ' English, ' + pl + ' Polish</b></div><div><small>How</small><b>Read out, then tap to sign</b></div></div>' +
    '<h4>Who has been briefed</h4><table><thead><tr><th>Who</th><th>Site</th><th>Signed</th><th>Version</th><th>Language</th><th>Picture check</th></tr></thead><tbody>' +
    (signs.length ? signs.map(function(x){ var o = CS.op(x.op); return '<tr><td><b>' + nm(o) + '</b><br>' + esc(o.role) + '</td><td>' + esc(CS.site(o.site).name) + '</td><td>' + T(x.at) + '</td><td>' + esc(x.ver || p.ver) + '</td><td>' + (x.lang === 'pl' ? 'Polish' : 'English') + '</td><td class="' + (x.quiz && x.quiz.tries <= 1 ? 'res-ok' : '') + '">' + (x.quiz ? x.quiz.right + ' of ' + x.quiz.of + (x.quiz.tries > 1 ? ', after a second listen' : ', first time') : 'Before picture checks') + '</td></tr>'; }).join('') : '<tr><td colspan="6">No sign-offs yet</td></tr>') + '</tbody></table>' +
    '<h4>Not briefed yet</h4><table><tbody>' + (miss.length ? miss.map(function(o){ return '<tr><td><b>' + nm(o) + '</b></td><td>' + esc(o.role) + '</td><td>' + esc(CS.site(o.site).name) + '</td><td class="res-bad">Not signed</td></tr>'; }).join('') : '<tr><td>Everyone has signed</td></tr>') + '</tbody></table>' +
    '<div class="rf"><span>Coastal Recycling · Briefing record · ' + esc(p.code) + '</span><span>Demo, sample data · Built by ApexLine</span></div></article></div>';
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
  arrived();
});
/* show what changed: tiles flash, new events pop up as toasts (from the phone window, or the tour) */
function arrived(){
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
    if (x.kind === 'nearmiss' || x.kind === 'sick' || x.kind === 'breakdown') tone = 'red';
    if (x.kind === 'cover') tone = 'green';
    var icon = x.kind === 'sick' ? 'thermometer' : x.kind === 'breakdown' ? 'truck' : x.kind === 'cover' ? 'user-check' : x.kind === 'askno' ? 'user-x' : x.kind === 'nearmiss' ? 'alert-octagon' : x.kind === 'lockon' ? 'lock' : x.kind === 'lockoff' ? 'lock-open' : x.kind === 'defect' ? 'alert-triangle' : x.kind === 'sign' ? 'signature' : 'clipboard-check';
    toast(x.text, tone, icon);
  });
}

/* Hooks for the guided tour (tour.js). */
window.CSO = {
  openPhone: function(){ openPhoneView(true); },
  closePhone: closePhoneView,
  phoneFrame: function(){ return phoneMask ? phoneMask.querySelector('iframe') : null; },
  fit: phoneSize,
  tab: function(t){ closeLayer(); tab = t; siteF = 'all'; render(); window.scrollTo(0, 0); },
  arrived: arrived,
  reset: function(){ CS.reset(); prevStatus = snapshot(); seenEvents = {}; CS.state.events.forEach(function(e){ seenEvents[e.id] = 1; }); closeLayer(); render(); }
};

/* Keep the lock timers and ages fresh. */
setInterval(function(){ if (!layer.innerHTML) render(); }, 30000);
render();
})();
