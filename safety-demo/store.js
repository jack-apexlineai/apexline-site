/* Coastal Recycling safety demo. Shared data store.
   Everything lives in this browser (localStorage). Sample data only.
   Both the phone view and the office view read and write the same key,
   so two windows on one machine stay in step through the storage event. */
(function(){
'use strict';
var KEY = 'coastal-safety-demo-v1';
var MIN = 60000;

function today(h, m){ var d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); }
/* A seeded morning time, pulled back if the demo is opened very early. */
function at(h, m, rank){ return Math.min(today(h, m), Date.now() - (rank || 1) * 7 * MIN); }
function uid(p){ return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

var SITES = [
  { id: 'kw', name: 'Kenbury Wood', town: 'Kennford, Exeter', shift: '07:00' },
  { id: 'dm', name: 'Deep Moor', town: 'Torrington', shift: '07:00' }
];

var OPS = [
  { id: 'o1', first: 'Dean', last: 'Hooper', site: 'kw', role: 'Shovel driver', lock: 11, col: '#10976F' },
  { id: 'o2', first: 'Lee', last: 'Pengelly', site: 'kw', role: 'Baler operator', lock: 12, col: '#E8A317' },
  { id: 'o3', first: 'Kyle', last: 'Ashford', site: 'kw', role: '360 driver', lock: 13, col: '#3B82F6' },
  { id: 'o4', first: 'Shaun', last: 'Rowe', site: 'kw', role: 'Telehandler', lock: 14, col: '#E2553F' },
  { id: 'o5', first: 'Jamie', last: 'Tozer', site: 'kw', role: 'Picker', lock: 15, col: '#8B5CF6' },
  { id: 'o6', first: 'Marek', last: 'Nowak', site: 'kw', role: 'Picker', lock: 16, col: '#0EA5A4' },
  { id: 'o7', first: 'Gary', last: 'Hext', site: 'dm', role: 'Shredder operator', lock: 21, col: '#D97706' },
  { id: 'o8', first: 'Callum', last: 'Squire', site: 'dm', role: 'Shovel driver', lock: 22, col: '#2563EB' },
  { id: 'o9', first: 'Ryan', last: 'Bolt', site: 'dm', role: 'Fitter', lock: 23, col: '#DC2626' },
  { id: 'o10', first: 'Tom', last: 'Vosper', site: 'dm', role: '360 driver', lock: 24, col: '#059669' },
  { id: 'o11', first: 'Nathan', last: 'Heard', site: 'dm', role: 'Forklift', lock: 25, col: '#7C3AED' },
  { id: 'o12', first: 'Pete', last: 'Stoneman', site: 'dm', role: 'Yard operative', lock: 26, col: '#DB2777' }
];

/* kind: shovel, excavator, telehandler, forklift, picking, baler, shredder, trommel, conveyor */
var MACHINES = [
  { id: 'm1', site: 'kw', kind: 'shovel', name: 'Shovel 1', model: 'Volvo L120H loading shovel', ref: 'WX19 KFD', asset: 'KW-01', group: 'mobile' },
  { id: 'm2', site: 'kw', kind: 'shovel', name: 'Shovel 2', model: 'CAT 950M loading shovel', ref: 'WU21 HTV', asset: 'KW-02', group: 'mobile' },
  { id: 'm3', site: 'kw', kind: 'excavator', name: '360 Sorter', model: 'Hitachi ZX210 with sorting grab', ref: 'Asset KW-03', asset: 'KW-03', group: 'mobile' },
  { id: 'm4', site: 'kw', kind: 'telehandler', name: 'Telehandler', model: 'JCB 535-95', ref: 'WP70 BZN', asset: 'KW-04', group: 'mobile' },
  { id: 'm5', site: 'kw', kind: 'forklift', name: 'Forklift', model: 'Linde H30 diesel', ref: 'Asset KW-05', asset: 'KW-05', group: 'mobile' },
  { id: 'm6', site: 'kw', kind: 'picking', name: 'Picking line', model: '6 bay picking station', ref: 'Asset KW-PL1', asset: 'KW-PL1', group: 'fixed' },
  { id: 'm7', site: 'kw', kind: 'baler', name: 'Baler 1', model: 'Horizontal baler', ref: 'Asset KW-BL1', asset: 'KW-BL1', group: 'fixed' },
  { id: 'm8', site: 'kw', kind: 'conveyor', name: 'Infeed conveyor', model: 'Belt conveyor C1', ref: 'Asset KW-C1', asset: 'KW-C1', group: 'fixed' },
  { id: 'm9', site: 'dm', kind: 'shovel', name: 'Shovel 3', model: 'Volvo L90H loading shovel', ref: 'WK68 RZE', asset: 'DM-01', group: 'mobile' },
  { id: 'm10', site: 'dm', kind: 'excavator', name: '360 Handler', model: 'Doosan DX225LC', ref: 'Asset DM-02', asset: 'DM-02', group: 'mobile' },
  { id: 'm11', site: 'dm', kind: 'forklift', name: 'Forklift', model: 'Toyota 8FD25', ref: 'Asset DM-03', asset: 'DM-03', group: 'mobile' },
  { id: 'm12', site: 'dm', kind: 'shredder', name: 'Shredder', model: 'Slow speed shredder', ref: 'Asset DM-SH1', asset: 'DM-SH1', group: 'fixed' },
  { id: 'm13', site: 'dm', kind: 'trommel', name: 'Trommel', model: 'Trommel screen', ref: 'Asset DM-TR1', asset: 'DM-TR1', group: 'fixed' }
];

var KIND_ICON = { shovel: 'bulldozer', excavator: 'backhoe', telehandler: 'car-crane', forklift: 'forklift', picking: 'm-picking', baler: 'm-baler', shredder: 'm-shredder', trommel: 'm-trommel', conveyor: 'm-conveyor' };

/* Check lists. t = short title shown, s = what to look for (also read out). */
var MOBILE_PRE = {
  base: [
    { i: 'droplet', t: 'Leaks', s: 'Walk round. Look under the machine for oil, fuel or coolant leaks.' },
    { i: 'tir', t: 'Tyres', s: 'Check the tyres for cuts, bulges and damage.' },
    { i: 'bucket', t: 'Bucket and pins', s: 'Check the bucket, pins and retaining bolts. No cracks, nothing missing.' },
    { i: 'eye', t: 'Mirrors and camera', s: 'Mirrors and camera are clean, set right and not damaged.' },
    { i: 'bulb', t: 'Lights and beacon', s: 'Work lights and the orange beacon all work.' },
    { i: 'speakerphone', t: 'Horn and reversing alarm', s: 'Sound the horn. Check the reversing alarm works.' },
    { i: 'armchair', t: 'Seatbelt', s: 'Seatbelt is not damaged and clicks in.' },
    { i: 'fire-extinguisher', t: 'Fire extinguisher', s: 'Fire extinguisher is in the cab, in date, and the pin is in.' },
    { i: 'steering-wheel', t: 'Brakes and steering', s: 'Test the brakes and steering before you move off.' }
  ],
  excavator: { 1: { i: 'tools', t: 'Tracks', s: 'Check the tracks and rollers. No damage, nothing loose.' }, 2: { i: 'bucket', t: 'Grab and quick hitch', s: 'Grab is locked on. Quick hitch safety pin is in.' } },
  telehandler: { 2: { i: 'forklift', t: 'Forks and boom', s: 'Forks locked on. No damage to the boom or the hoses.' } },
  forklift: { 2: { i: 'forklift', t: 'Forks and chains', s: 'Forks, mast and chains. No cracks, no slack chains.' } }
};
var MOBILE_RUN = [
  { i: 'gauge', t: 'Warning lights', s: 'No warning lights on the dash.' },
  { i: 'ear', t: 'Noises', s: 'No strange noises or knocks.' },
  { i: 'droplet', t: 'Leaks', s: 'No new leaks since the start of shift.' },
  { i: 'speakerphone', t: 'Alarm and beacon', s: 'Reversing alarm and beacon still working.' }
];
var MOBILE_POST = [
  { i: 'parking', t: 'Park up safe', s: 'Park in the parking area. Bucket down on the ground.' },
  { i: 'flame', t: 'Clean round the engine', s: 'Clear dust and waste from round the engine. This stops fires.' },
  { i: 'alert-triangle', t: 'Any new damage', s: 'Walk round. Is the machine free of new damage?' },
  { i: 'key', t: 'Brake on, key out', s: 'Park brake on. Key out and handed back.' }
];
var FIXED_PRE = [
  { i: 'shield-check', t: 'Guards', s: 'All guards are fitted and closed.' },
  { i: 'hand-stop', t: 'Emergency stops', s: 'Test each emergency stop. The machine must stop.' },
  { i: 'traffic-cone', t: 'Area clear', s: 'The area is clear. No trip hazards, no people inside the barrier.' },
  { i: 'droplet', t: 'Leaks', s: 'No hydraulic oil leaks under or around the machine.' },
  { i: 'alert-triangle', t: 'Signs in place', s: 'Warning signs are in place and easy to read.' },
  { i: 'lock', t: 'Isolator', s: 'The isolator works and can take a padlock.' }
];
var FIXED_EXTRA = {
  baler: { i: 'm-baler', t: 'Wire and ram', s: 'Wire feed is clear. Nothing in the ram area.' },
  picking: { i: 'link', t: 'Pull wires', s: 'Pull a pull wire. The belt must stop.' },
  conveyor: { i: 'link', t: 'Pull wires', s: 'Pull a pull wire. The belt must stop.' },
  shredder: { i: 'm-shredder', t: 'Hopper and shafts', s: 'Nothing stuck in the hopper. Shafts are clear.' },
  trommel: { i: 'm-trommel', t: 'Drum and screens', s: 'Drum and screen panels are not damaged.' }
};
var FIXED_RUN = [
  { i: 'ear', t: 'Noise and shake', s: 'No strange noise or shaking.' },
  { i: 'shield-check', t: 'Guards still on', s: 'All guards are still on and closed.' },
  { i: 'trash', t: 'Spillage', s: 'No build up of waste round the machine.' },
  { i: 'hand-stop', t: 'Stops in reach', s: 'Emergency stops are clear and easy to reach.' }
];
var FIXED_POST = [
  { i: 'player-stop', t: 'Run empty and stop', s: 'Run the machine empty. Then stop it.' },
  { i: 'lock', t: 'Isolate', s: 'Isolate at the isolator.' },
  { i: 'trash', t: 'Clean down', s: 'Clean down. Clear spillage round the machine.' },
  { i: 'alert-triangle', t: 'Any new damage', s: 'Is the machine free of new damage?' }
];

function checklist(machine, type){
  var list;
  if (machine.group === 'mobile') {
    if (type === 'pre') {
      list = MOBILE_PRE.base.slice();
      var sw = MOBILE_PRE[machine.kind];
      if (sw) Object.keys(sw).forEach(function(k){ list[+k] = sw[k]; });
    } else list = (type === 'run' ? MOBILE_RUN : MOBILE_POST).slice();
  } else {
    if (type === 'pre') { list = FIXED_PRE.slice(); if (FIXED_EXTRA[machine.kind]) list.splice(1, 0, FIXED_EXTRA[machine.kind]); }
    else list = (type === 'run' ? FIXED_RUN : FIXED_POST).slice();
  }
  return list;
}

var CHECK_TYPES = [
  { id: 'pre', name: 'Pre-shift', say: 'Pre shift check', icon: 'sunrise' },
  { id: 'run', name: 'Running', say: 'Running check', icon: 'activity' },
  { id: 'post', name: 'Post-shift', say: 'Post shift check', icon: 'moon' }
];

/* Safe work procedures. Each step: icon, short title, narration. */
var SWPS = [
  { id: 'lototo', code: 'SWP-014', ver: 'Version 3', isNew: true, issued: 'Issued this week', icon: 'lock',
    title: 'Isolating the baler', sub: 'Lock out, tag out, try out', mins: 4, machineKind: 'baler',
    steps: [
      { i: 'users-group', t: 'Tell people', s: 'Tell everyone who works on or near the baler that you are going to isolate it. Tell the shovel driver to stop feeding it.' },
      { i: 'player-stop', t: 'Stop the machine', s: 'Stop the baler at the control panel with the normal stop button. Wait for the ram to stop moving.' },
      { i: 'power', t: 'Isolate', s: 'Go to the main isolator for the baler. Turn it to off.' },
      { i: 'lock', t: 'Your lock and tag', s: 'Fit your own padlock to the isolator. Fit your own tag with your name and the date. One person, one lock. Never use someone else\'s lock.', lockAction: true },
      { i: 'arrows-down', t: 'Release stored energy', s: 'Release the hydraulic pressure with the dump valve. Check the gauge reads zero. Lower or block the ram and the platen, so nothing can fall or move.' },
      { i: 'hand-click', t: 'Try out', s: 'Try to start the baler. Nothing should happen. Check the gauge again. This proves there is zero energy. Put the start control back to off.' },
      { i: 'tools', t: 'Do the work', s: 'Now do the work. If you leave the area, your lock stays on.' },
      { i: 'lock-open', t: 'Only you remove your lock', s: 'When you have finished, only you take your lock off. Never remove someone else\'s lock. If a lock is left on, tell your supervisor.' },
      { i: 'clipboard-check', t: 'Back into service', s: 'Guards back on and closed. Tools and people clear. Tell everyone the baler is starting. Then do a pre shift check before use.' }
    ] },
  { id: 'refuel', code: 'SWP-006', ver: 'Version 2', icon: 'gas-station',
    title: 'Refuelling the loading shovel', sub: 'At the fuel bowser', mins: 2, machineKind: 'shovel',
    steps: [
      { i: 'parking', t: 'Park at the bowser', s: 'Park on level ground at the fuel bowser. Bucket down on the ground.' },
      { i: 'key', t: 'Engine off', s: 'Engine off and key out. No smoking. No phones near the fuel.' },
      { i: 'gas-station', t: 'Fill up', s: 'Stay with the nozzle the whole time. Do not overfill.' },
      { i: 'droplet-exclamation', t: 'Spills', s: 'If you spill fuel, use the spill kit straight away and tell your supervisor.' },
      { i: 'check', t: 'Finish', s: 'Cap back on tight. Nozzle back on the bowser. Wipe up any drips.' }
    ] },
  { id: 'picking', code: 'SWP-009', ver: 'Version 2', icon: 'm-picking',
    title: 'Clearing a picking line blockage', sub: 'Never reach into a moving belt', mins: 3, machineKind: 'picking',
    steps: [
      { i: 'hand-stop', t: 'Stop the line', s: 'Stop the line with the stop button. Never reach into a moving belt.' },
      { i: 'lock', t: 'Isolate and lock', s: 'Isolate the line at the isolator. Fit your own padlock and tag.' },
      { i: 'hand-click', t: 'Try out', s: 'Try to start the line. Nothing should move.' },
      { i: 'tools', t: 'Clear it with the hook', s: 'Clear the blockage with the hook tool, not your hands. Wear your gloves.' },
      { i: 'lock-open', t: 'Lock off, guards on', s: 'Guards back on. Take your own lock off.' },
      { i: 'speakerphone', t: 'Tell the team', s: 'Tell the pickers the line is starting before you start it.' }
    ] }
];

var DEMO_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f3c"/><stop offset="1" stop-color="#1c201e"/></linearGradient></defs>' +
  '<rect width="320" height="220" fill="url(#g)"/><rect x="40" y="40" width="240" height="120" rx="12" fill="#e2a514"/><rect x="58" y="58" width="90" height="60" rx="6" fill="#2b2f2d"/>' +
  '<circle cx="230" cy="96" r="26" fill="#2b2f2d"/><g fill="#555" ><circle cx="222" cy="90" r="3"/><circle cx="234" cy="90" r="3"/><circle cx="222" cy="102" r="3"/><circle cx="234" cy="102" r="3"/></g>' +
  '<path d="M200 60 L262 132" stroke="#ff4d3d" stroke-width="6" stroke-linecap="round"/><path d="M262 60 L200 132" stroke="#ff4d3d" stroke-width="6" stroke-linecap="round"/>' +
  '<text x="160" y="196" fill="#cfd6d2" font-family="Arial" font-size="15" text-anchor="middle">Sample photo: reversing alarm</text></svg>');

function seed(){
  var s = { v: 1, seededAt: Date.now(), checks: [], defects: [], locks: [], signoffs: [], events: [], last: null };
  function chk(mid, op, type, h, m, rank, fails){
    var mach = MACHINES.filter(function(x){ return x.id === mid; })[0];
    var items = checklist(mach, type).map(function(it, idx){ return { t: it.t, ok: !(fails && fails[idx]) }; });
    var c = { id: uid('c'), machine: mid, op: op, type: type, at: at(h, m, rank), items: items, signed: true, sig: null };
    s.checks.push(c); return c;
  }
  chk('m1', 'o1', 'pre', 6, 52, 9);
  chk('m3', 'o3', 'pre', 6, 58, 8);
  chk('m6', 'o5', 'pre', 7, 5, 7);
  chk('m7', 'o2', 'pre', 7, 8, 6);
  chk('m4', 'o4', 'pre', 7, 15, 5);
  chk('m5', 'o6', 'pre', 7, 21, 5);
  chk('m12', 'o7', 'pre', 7, 2, 7);
  chk('m10', 'o10', 'pre', 7, 11, 6);
  chk('m11', 'o11', 'pre', 7, 18, 5);
  chk('m12', 'o7', 'run', 10, 15, 2);
  var bad = chk('m9', 'o8', 'pre', 6, 48, 9, { 5: true });
  s.defects.push({ id: uid('d'), machine: 'm9', op: 'o8', at: bad.at, item: 'Horn and reversing alarm', note: 'Reversing alarm not working', severity: 'serious', photo: DEMO_PHOTO, check: bad.id, open: true });
  /* Active lock: fitter on the trommel at Deep Moor. */
  s.locks.push({ id: uid('l'), machine: 'm13', op: 'o9', on: Date.now() - 52 * MIN, off: null, reason: 'Drum bearing change' });
  /* Earlier lock, now off. */
  s.locks.push({ id: uid('l'), machine: 'm7', op: 'o2', on: at(7, 24, 6), off: at(7, 49, 5), reason: 'Clearing a wire jam' });
  /* Sign-offs. LOTOTO is new, so only some have signed. */
  var signedL = ['o2', 'o9', 'o7', 'o5', 'o3'];
  signedL.forEach(function(o, i){ s.signoffs.push({ id: uid('s'), swp: 'lototo', op: o, at: Date.now() - (i * 26 + 40) * 60 * MIN / 12 }); });
  OPS.forEach(function(o, i){ if (i !== 3 && i !== 11) s.signoffs.push({ id: uid('s'), swp: 'refuel', op: o.id, at: Date.now() - (20 + i * 3) * 24 * 60 * MIN }); });
  ['o1', 'o2', 'o3', 'o5', 'o6', 'o7', 'o12', 'o4'].forEach(function(o, i){ s.signoffs.push({ id: uid('s'), swp: 'picking', op: o, at: Date.now() - (9 + i * 4) * 24 * 60 * MIN }); });
  s.events.push({ id: uid('e'), at: bad.at, kind: 'defect', machine: 'm9', op: 'o8', text: 'Callum reported a serious defect on Shovel 3. Do not use.' });
  s.events.push({ id: uid('e'), at: s.locks[0].on, kind: 'lockon', machine: 'm13', op: 'o9', text: 'Ryan put a lock on the Trommel.' });
  return s;
}

var state = null;
function load(){
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.v === 1 && new Date(p.seededAt).toDateString() === new Date().toDateString()) { state = p; return state; } } } catch (e) {}
  state = seed(); persist(null); return state;
}
function persist(change){
  if (change) { change.ts = Date.now(); change.n = Math.random(); state.last = change; }
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { /* Storage full, most likely large photos. Drop old photos and retry. */
    state.defects.forEach(function(d, i){ if (i < state.defects.length - 1 && d.photo && d.photo.indexOf('data:image/jpeg') === 0) d.photo = DEMO_PHOTO; });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) {}
  }
}
function reset(){ state = seed(); state.last = { type: 'reset', ts: Date.now() }; persist(); return state; }

function byId(list, id){ for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
function op(id){ return byId(OPS, id); }
function machine(id){ return byId(MACHINES, id); }
function site(id){ return byId(SITES, id); }
function isToday(t){ var a = new Date(t), b = new Date(); return a.toDateString() === b.toDateString(); }

function openDefects(mid){ return state.defects.filter(function(d){ return d.open && (!mid || d.machine === mid); }); }
function activeLocks(mid){ return state.locks.filter(function(l){ return !l.off && (!mid || l.machine === mid); }); }
function checksToday(mid, type){ return state.checks.filter(function(c){ return c.machine === mid && isToday(c.at) && (!type || c.type === type); }).sort(function(a, b){ return b.at - a.at; }); }
function doNotUse(mid){ return openDefects(mid).some(function(d){ return d.severity === 'serious'; }); }

/* Machine status for the board: red, amber, green, plus a locked flag. */
function status(mid){
  var dnu = doNotUse(mid), minor = openDefects(mid).length > 0, pre = checksToday(mid, 'pre').length > 0, locks = activeLocks(mid);
  var s = { locks: locks, dnu: dnu, pre: pre };
  if (dnu) { s.c = 'red'; s.label = 'Do not use'; }
  else if (locks.length) { s.c = 'lock'; s.label = 'Locked out'; }
  else if (minor) { s.c = 'amber'; s.label = 'Minor defect'; }
  else if (!pre) { s.c = 'amber'; s.label = 'No pre-shift check'; }
  else { s.c = 'green'; s.label = 'Ready'; }
  return s;
}

function addEvent(kind, mid, oid, text){ state.events.push({ id: uid('e'), at: Date.now(), kind: kind, machine: mid, op: oid, text: text }); if (state.events.length > 80) state.events.shift(); }

function saveCheck(c){
  if (byId(state.checks, c.id)) return false; /* already saved: double tap guard */
  state.checks.push(c);
  var m = machine(c.machine), o = op(c.op), t = byId(CHECK_TYPES, c.type);
  var fails = c.items.filter(function(i){ return !i.ok; }).length;
  (c.defects || []).forEach(function(d){
    state.defects.push({ id: uid('d'), machine: c.machine, op: c.op, at: c.at, item: d.item, note: d.note || d.item, severity: d.severity, photo: d.photo || null, check: c.id, open: true });
  });
  delete c.defects;
  var serious = doNotUse(c.machine);
  addEvent(fails ? 'defect' : 'check', c.machine, c.op, o.first + ' did a ' + t.name.toLowerCase() + ' check on ' + m.name + (fails ? ', ' + fails + ' defect' + (fails > 1 ? 's' : '') + ' reported' + (serious ? '. Do not use.' : '.') : '. All OK.'));
  persist({ type: fails ? 'defect' : 'check', machine: c.machine, op: c.op });
  return true;
}
function lockOn(mid, oid, reason){
  var mine = activeLocks(mid).filter(function(l){ return l.op === oid; });
  if (mine.length) return mine[0];
  var l = { id: uid('l'), machine: mid, op: oid, on: Date.now(), off: null, reason: reason || '' };
  state.locks.push(l);
  addEvent('lockon', mid, oid, op(oid).first + ' put a lock on ' + machine(mid).name + '.');
  persist({ type: 'lockon', machine: mid, op: oid });
  return l;
}
function lockOff(lid, oid){
  var l = byId(state.locks, lid);
  if (!l || l.off || l.op !== oid) return false;
  l.off = Date.now();
  addEvent('lockoff', l.machine, oid, op(oid).first + ' took their lock off ' + machine(l.machine).name + '.');
  persist({ type: 'lockoff', machine: l.machine, op: oid });
  return true;
}
function signSwp(swpId, oid, sig){
  var s = { id: uid('s'), swp: swpId, op: oid, at: Date.now(), sig: sig || null, ver: byId(SWPS, swpId).ver };
  state.signoffs.push(s);
  addEvent('sign', null, oid, op(oid).first + ' signed ' + byId(SWPS, swpId).title + '.');
  persist({ type: 'sign', swp: swpId, op: oid });
  return s;
}
function hasSigned(swpId, oid){ return state.signoffs.some(function(s){ return s.swp === swpId && s.op === oid; }); }
function fixDefect(did){
  var d = byId(state.defects, did); if (!d || !d.open) return;
  d.open = false; d.fixedAt = Date.now();
  addEvent('fixed', d.machine, null, 'Defect on ' + machine(d.machine).name + ' marked fixed in the office.');
  persist({ type: 'fixed', machine: d.machine });
}

/* Time helpers */
function hm(t){ var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function dayLabel(t){ return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function since(t){ var m = Math.max(0, Math.round((Date.now() - t) / MIN)); if (m < 1) return 'just now'; if (m < 60) return m + ' min'; var h = Math.floor(m / 60); if (h < 24) return h + 'h ' + ('0' + (m % 60)).slice(-2) + 'm'; return Math.floor(h / 24) + ' days'; }
function ago(t){ var s = since(t); return s === 'just now' ? s : s + ' ago'; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function initials(o){ return (o.first[0] + o.last[0]).toUpperCase(); }
function avatar(o, cls){ return '<span class="av ' + (cls || '') + '" style="--c:' + o.col + '">' + initials(o) + '</span>'; }

/* Speech. en-GB voice, cancels anything already playing. */
var muted = false;
try { muted = localStorage.getItem(KEY + '-mute') === '1'; } catch (e) {}
function voice(){
  if (!window.speechSynthesis) return null;
  var vs = speechSynthesis.getVoices() || [];
  var gb = vs.filter(function(v){ return /en[-_]GB/i.test(v.lang); });
  var pref = gb.filter(function(v){ return /Daniel|Serena|Kate|Arthur|Google UK English|Martha|Libby|Ryan|Sonia/i.test(v.name); });
  return pref[0] || gb[0] || null;
}
function say(text){
  if (!window.speechSynthesis || muted || !text) return;
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; u.rate = 0.95; u.pitch = 1;
    try { var v = voice(); if (v) u.voice = v; } catch (e2) {}
    speechSynthesis.speak(u);
  } catch (e) {}
}
function setMuted(m){ muted = !!m; try { localStorage.setItem(KEY + '-mute', muted ? '1' : '0'); } catch (e) {} if (muted && window.speechSynthesis) speechSynthesis.cancel(); }
if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', function(){});

window.CS = {
  KEY: KEY, SITES: SITES, OPS: OPS, MACHINES: MACHINES, SWPS: SWPS, CHECK_TYPES: CHECK_TYPES, KIND_ICON: KIND_ICON, DEMO_PHOTO: DEMO_PHOTO,
  load: load, reset: reset, persist: persist, get state(){ return state; },
  op: op, machine: machine, site: site, byId: byId, uid: uid, checklist: checklist,
  openDefects: openDefects, activeLocks: activeLocks, checksToday: checksToday, doNotUse: doNotUse, status: status,
  saveCheck: saveCheck, lockOn: lockOn, lockOff: lockOff, signSwp: signSwp, hasSigned: hasSigned, fixDefect: fixDefect,
  hm: hm, dayLabel: dayLabel, since: since, ago: ago, esc: esc, initials: initials, avatar: avatar, isToday: isToday,
  say: say, setMuted: setMuted, get muted(){ return muted; }
};
})();
