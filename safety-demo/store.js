/* Coastal Recycling safety demo. Shared data store.
   Everything lives in this browser (localStorage). Sample data only.
   Both the phone view and the office view read and write the same key,
   so two windows on one machine stay in step through the storage event. */
(function(){
'use strict';
var KEY = 'coastal-safety-demo-v2';
var MIN = 60000;

/* UK time everywhere. The demo is screen-shared from abroad, so every clock
   and every seeded time is Europe/London, never the laptop's own time zone.
   If it is opened outside UK working hours, a fixed demo shift moves the clock
   to a mid-morning UK working day (same date), stored with the seed. */
var SHIFT = 0;
var LFMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function lparts(t){ var o = {}; LFMT.formatToParts(new Date(t)).forEach(function(p){ o[p.type] = +p.value; }); if (o.hour === 24) o.hour = 0; return { y: o.year, mo: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second }; }
function now(){ return Date.now() + SHIFT; }
function calcShift(){ var p = lparts(Date.now()), mins = p.h * 60 + p.mi; if (mins >= 465 && mins <= 1050) return 0; return (640 - mins) * MIN; }
function dateKey(t){ var p = lparts(t); return p.y + '-' + p.mo + '-' + p.d; }
function today(h, m, base){ var b = base || now(), p = lparts(b); var off = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - Math.floor(b / MIN) * MIN; return Date.UTC(p.y, p.mo - 1, p.d, h, m) - off; }
function daysFrom(n){ return now() + n * 24 * 60 * MIN; }
/* A seeded morning time, pulled back if the demo is opened very early. */
function at(h, m, rank){ return Math.min(today(h, m), now() - (rank || 1) * 7 * MIN); }
function uid(p){ return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

var SITES = [
  { id: 'kw', name: 'Kenbury Wood', town: 'Kennford, Exeter', shift: '07:00' },
  { id: 'dm', name: 'Deep Moor', town: 'Torrington', shift: '07:00' }
];

/* drive = machines they are trained and authorised to operate and check.
   iso = machines they are authorised to isolate (put a lock on).
   Demo PIN for everyone is 1234. */
var OPS = [
  { id: 'o1', first: 'Dean', last: 'Hooper', site: 'kw', role: 'Shovel driver', lock: 11, col: '#10976F', drive: ['m1', 'm2', 'm5'], iso: [] },
  { id: 'o2', first: 'Lee', last: 'Pengelly', site: 'kw', role: 'Baler operator', lock: 12, col: '#E8A317', drive: ['m6', 'm7', 'm8', 'm5'], iso: ['m6', 'm7', 'm8'] },
  { id: 'o3', first: 'Kyle', last: 'Ashford', site: 'kw', role: '360 driver', lock: 13, col: '#3B82F6', drive: ['m3', 'm1'], iso: ['m8'] },
  { id: 'o4', first: 'Shaun', last: 'Rowe', site: 'kw', role: 'Telehandler', lock: 14, col: '#E2553F', drive: ['m4', 'm5'], iso: [] },
  { id: 'o5', first: 'Jamie', last: 'Tozer', site: 'kw', role: 'Picker', lock: 15, col: '#8B5CF6', drive: ['m6'], iso: ['m6'] },
  { id: 'o6', first: 'Marek', last: 'Nowak', site: 'kw', role: 'Picker', lock: 16, col: '#0EA5A4', drive: ['m6', 'm5'], iso: ['m6'] },
  { id: 'o13', first: 'Steve', last: 'Luxton', site: 'kw', role: 'Fitter', lock: 17, col: '#475569', fitter: true, drive: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'], iso: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'] },
  { id: 'o7', first: 'Gary', last: 'Hext', site: 'dm', role: 'Shredder operator', lock: 21, col: '#D97706', drive: ['m12', 'm13'], iso: ['m12', 'm13'] },
  { id: 'o8', first: 'Callum', last: 'Squire', site: 'dm', role: 'Shovel driver', lock: 22, col: '#2563EB', drive: ['m9', 'm11'], iso: [] },
  { id: 'o9', first: 'Ryan', last: 'Bolt', site: 'dm', role: 'Fitter', lock: 23, col: '#DC2626', fitter: true, drive: ['m9', 'm10', 'm11', 'm12', 'm13'], iso: ['m9', 'm10', 'm11', 'm12', 'm13'] },
  { id: 'o10', first: 'Tom', last: 'Vosper', site: 'dm', role: '360 driver', lock: 24, col: '#059669', drive: ['m10', 'm9'], iso: ['m13'] },
  { id: 'o11', first: 'Nathan', last: 'Heard', site: 'dm', role: 'Forklift', lock: 25, col: '#7C3AED', drive: ['m11'], iso: [] },
  { id: 'o12', first: 'Pete', last: 'Stoneman', site: 'dm', role: 'Yard operative', lock: 26, col: '#DB2777', drive: ['m11'], iso: [] }
];
var PIN = '1234';
var FITTER = { kw: 'o13', dm: 'o9' };

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


/* Training and competence. Card names are typical UK schemes, dates are sample. */
var CARD = { shovel: 'NPORS N600 Loading shovel', excavator: 'NPORS N202 360 excavator', telehandler: 'NPORS N010 Telehandler', forklift: 'RTITB Counterbalance forklift', picking: 'In-house: Picking line', baler: 'In-house: Baler operation', conveyor: 'In-house: Conveyor and infeed', shredder: 'In-house: Shredder operation', trommel: 'In-house: Trommel operation' };
var T_OVERRIDE = { 'o1|forklift': 18, 'o4|telehandler': 11, 'o8|forklift': -4, 'o12|Manual handling': 9 };
function training(oid){
  var o = op(oid), seen = {}, out = [];
  var n = parseInt(oid.slice(1), 10);
  function add(name, days, note){ var k = oid + '|' + name; out.push({ name: name, exp: days == null ? null : daysFrom(days), note: note || '' }); }
  add('Site induction', 260 + n * 7);
  o.drive.forEach(function(mid){ var k = machine(mid).kind; if (seen[k]) return; seen[k] = 1; var ov = T_OVERRIDE[oid + '|' + k]; add(CARD[k], ov != null ? ov : 120 + ((n * 37 + k.length * 53) % 700)); });
  if (o.iso.length || o.fitter) add('LOTOTO isolation (in-house)', 300 + n * 11);
  else add('LOTOTO isolation (in-house)', null, 'Not done');
  var mh = T_OVERRIDE[oid + '|Manual handling']; add('Manual handling', mh != null ? mh : 200 + n * 13);
  if (o.fitter) add('Permit to work issuer', 410 + n * 5);
  return out;
}
function tStatus(t){ if (t.exp == null) return { c: 'red', label: t.note || 'Not done' }; var d = Math.round((t.exp - now()) / (24 * 60 * MIN)); if (d < 0) return { c: 'red', label: 'Expired ' + dShort(t.exp), days: d }; if (d <= 30) return { c: 'amber', label: 'Expires ' + dShort(t.exp), days: d }; return { c: 'green', label: 'In date to ' + dShort(t.exp), days: d }; }
function canDrive(oid, mid){ var o = op(oid); if (o.drive.indexOf(mid) < 0) return { ok: false, why: 'You are not trained on ' + machine(mid).name + '.' }; var k = machine(mid).kind, t = training(oid).filter(function(x){ return x.name === CARD[k]; })[0]; if (t && tStatus(t).c === 'red') return { ok: false, why: 'Your ' + CARD[k] + ' card has expired.' }; return { ok: true }; }
function canIsolate(oid, mid){ var o = op(oid); if (o.iso.indexOf(mid) >= 0) return { ok: true }; var lt = training(oid).filter(function(x){ return /LOTOTO/.test(x.name); })[0]; return { ok: false, why: (lt && lt.exp == null ? 'Your LOTOTO isolation training is not done yet. ' : '') + 'You are not on the authorised list for isolating ' + machine(mid).name + '.' }; }

/* Statutory inspections per machine. days = days from today until next due.
   LOLER thorough examination: at least every 12 months for this lifting equipment
   (6 months for accessories or equipment that lifts people), or per an examination scheme. */
var INSPECT = {
  m1: [['PUWER', 'PUWER inspection', 'Every 3 months', 41], ['SERVICE', '500 hour service', 'By hours', 63]],
  m2: [['PUWER', 'PUWER inspection', 'Every 3 months', 22], ['SERVICE', '500 hour service', 'By hours', 12]],
  m3: [['PUWER', 'PUWER inspection', 'Every 3 months', 58], ['SERVICE', '500 hour service', 'By hours', 35]],
  m4: [['LOLER', 'LOLER thorough examination', 'Every 12 months', 9], ['PUWER', 'PUWER inspection', 'Every 3 months', 47], ['SERVICE', '500 hour service', 'By hours', 70]],
  m5: [['LOLER', 'LOLER thorough examination', 'Every 12 months', 143], ['PUWER', 'PUWER inspection', 'Every 3 months', 30]],
  m6: [['PUWER', 'PUWER inspection', 'Every 6 months', 88]],
  m7: [['PUWER', 'PUWER inspection', 'Every 6 months', 6], ['SERVICE', 'Hydraulic service', 'Every 6 months', 54]],
  m8: [['PUWER', 'PUWER inspection', 'Every 6 months', 120]],
  m9: [['PUWER', 'PUWER inspection', 'Every 3 months', 17], ['SERVICE', '500 hour service', 'By hours', 44]],
  m10: [['PUWER', 'PUWER inspection', 'Every 3 months', 66], ['SERVICE', '500 hour service', 'By hours', 5]],
  m11: [['LOLER', 'LOLER thorough examination', 'Every 12 months', -3], ['PUWER', 'PUWER inspection', 'Every 3 months', 38]],
  m12: [['PUWER', 'PUWER inspection', 'Every 6 months', 101], ['SERVICE', 'Shaft and bearing service', 'Every 6 months', 26]],
  m13: [['PUWER', 'PUWER inspection', 'Every 6 months', 73]]
};
function inspections(mid){
  return (INSPECT[mid] || []).map(function(x, i){
    var due = daysFrom(x[3]), d = x[3];
    return { kind: x[0], name: x[1], every: x[2], due: due, last: due - (x[2].indexOf('12') >= 0 ? 365 : x[2].indexOf('6') >= 0 ? 182 : 91) * 24 * 60 * MIN, ref: (x[0] === 'LOLER' ? 'TE-' : x[0] === 'PUWER' ? 'PI-' : 'SV-') + (4100 + parseInt(mid.slice(1), 10) * 7 + i),
      c: d < 0 ? 'red' : d <= 30 ? 'amber' : 'green', label: d < 0 ? 'Overdue ' + (-d) + ' day' + (d === -1 ? '' : 's') : d === 0 ? 'Due today' : 'Due ' + dShort(due) };
  });
}
function inspWorst(mid){ var l = inspections(mid); return l.some(function(x){ return x.c === 'red'; }) ? 'red' : l.some(function(x){ return x.c === 'amber'; }) ? 'amber' : 'green'; }

/* Picture questions after each SWP. A signature shows they were given it; this shows they took it in. */
var QUIZ = {
  lototo: [
    { q: 'Who can take your lock off?', say: 'Who can take your lock off? Tap the picture.', step: 7, a: [ { i: 'user', t: 'Only me', ok: true }, { i: 'users', t: 'My supervisor' }, { i: 'users-group', t: 'Anyone' } ] },
    { q: 'Lock is on. What next?', say: 'Your lock is on. What do you do next? Tap the picture.', step: 5, a: [ { i: 'tools', t: 'Start the work' }, { i: 'hand-click', t: 'Try to start it', ok: true }, { i: 'arrow-right', t: 'Walk away' } ] }
  ],
  refuel: [ { q: 'Fuel spilt. What now?', say: 'You spill fuel. What do you do? Tap the picture.', step: 3, a: [ { i: 'droplet-exclamation', t: 'Spill kit, tell supervisor', ok: true }, { i: 'clock', t: 'Leave it to dry' }, { i: 'gas-station', t: 'Keep filling' } ] } ],
  picking: [ { q: 'Belt is blocked. First?', say: 'The belt is blocked. What do you do first? Tap the picture.', step: 0, a: [ { i: 'hand-off', t: 'Reach in quick' }, { i: 'hand-stop', t: 'Stop, isolate, lock', ok: true }, { i: 'tools', t: 'Poke it while running' } ] } ]
};

/* Toolbox talk for today, with tap-to-sign attendance. */
var TBT = { id: 'tbt-iso', title: 'Isolation: one person, one lock', by: 'Tristan Cooper', site: 'kw', mins: 10,
  points: [
    { i: 'hand-stop', t: 'An e-stop is not isolation', s: 'Pressing the emergency stop does not make a machine safe to work on. Only the isolator, locked with your own padlock, does that.' },
    { i: 'lock', t: 'Your lock, your key', s: 'Everyone working inside the guard fits their own lock. You keep your key in your pocket. Nobody else can take your lock off.' },
    { i: 'arrows-down', t: 'Stored energy', s: 'Hydraulic pressure, a raised ram or a loaded belt can still move after the power is off. Dump it, block it, or wait for it to stop.' },
    { i: 'hand-click', t: 'Try it', s: 'Always try to start it after you lock it. If anything moves, stop and tell your supervisor.' }
  ] };

/* Rules-based tidy-up of a spoken note. No AI: fixed word lists and templates. */
var NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, to: 2, too: 2, won: 1, tree: 3, free: 3 };
var MACHINE_WORDS = [
  [/\b(shovel|loader|loading shovel)\s*(one|won|1)\b/, 'm1'], [/\b(shovel|loader|loading shovel)\s*(two|to|too|2)\b/, 'm2'], [/\b(shovel|loader|loading shovel)\s*(three|tree|free|3)\b/, 'm9'],
  [/\b(360|three sixty|sorter|sorting grab)\b/, 'm3', 'kw'], [/\b(360|three sixty|handler|doosan)\b/, 'm10', 'dm'],
  [/\b(telehandler|tele handler|telly|teli|jcb)\b/, 'm4'], [/\b(forklift|fork lift|fork truck|forky)\b/, 'm5', 'kw'], [/\b(forklift|fork lift|fork truck|forky)\b/, 'm11', 'dm'],
  [/\b(picking line|picking belt|picking station|picking cabin|pickers)\b/, 'm6'], [/\b(baler|bailer|bale press)\b/, 'm7'], [/\b(infeed|conveyor|belt)\b/, 'm8'],
  [/\b(shredder|shredda)\b/, 'm12'], [/\b(trommel|drum|screen)\b/, 'm13']
];
var PARTS = [
  [/revers\w* (alarm|beeper|bleeper|buzzer)|\bbeeper\b|\bbleeper\b|white noise alarm/, 'Reversing alarm', 1], [/\bhorn\b/, 'Horn', 1], [/\bbeacon|flashing light/, 'Beacon', 1],
  [/\bbrakes?\b/, 'Brakes', 1], [/\bsteering\b/, 'Steering', 1], [/seat ?belt/, 'Seatbelt', 1], [/\bcamera\b/, 'Reversing camera', 1], [/\bmirror/, 'Mirror', 0],
  [/e ?stop|emergency stop/, 'Emergency stop', 1], [/pull (wire|cord)|lanyard/, 'Pull wire stop', 1], [/\bguard/, 'Guard', 1], [/interlock/, 'Guard interlock', 1],
  [/(hydraulic )?hose/, 'Hydraulic hose', 0], [/\b(tyre|tire|puncture)/, 'Tyre', 0], [/\blights?\b|headlight|work light/, 'Work lights', 0], [/fire extinguisher|extinguisher/, 'Fire extinguisher', 1],
  [/bucket|pins?\b/, 'Bucket and pins', 0], [/\btracks?\b/, 'Tracks', 0], [/\bforks?\b|\bchains?\b/, 'Forks and chains', 1], [/\bram\b|platen/, 'Ram', 0], [/\bwiper|windscreen/, 'Windscreen and wipers', 0], [/\bleak|oil|diesel|coolant/, 'Leak', 0]
];
var FAULTS = [
  [/cut(ting|s)? out|on and off|comes and goes|intermittent|keeps going|sometimes/, 'cutting out, working on and off'],
  [/(is ?n.?t|not|doesn.?t|does not|aint|ain.?t|won.?t|stopped) (work|go|going|working|beeping|sounding)|\bdead\b|\bbroken\b|packed up|gave up|not working/, 'not working'],
  [/\bleak(ing|s)?\b|weeping|dripping|pissing/, 'leaking'], [/crack(ed|s)?/, 'cracked'], [/\bloose\b|wobbl/, 'loose'], [/missing|gone|fell off/, 'missing'],
  [/smash|damag|bent|split|ripped|torn/, 'damaged'], [/nois|knock|grind|squeal|bang|rattl/, 'making an unusual noise'], [/slow|sluggish|not returning|won.?t return/, 'slow or not returning fully'], [/dirty|filthy|cover(ed)? in/, 'dirty, cannot see properly']
];
var HAZARD_WORDS = /danger|unsafe|nearly|almost|fire|smok|spark|burn|hit|crush|trap/;
var PLACES = [[/tipping (bay|hall|floor|area)/, 'the tipping bay'], [/weighbridge/, 'the weighbridge'], [/picking (cabin|station|line)/, 'the picking cabin'], [/baler/, 'the baler area'], [/(fuel|bowser)/, 'the fuel bowser'], [/(walkway|crossing)/, 'the pedestrian walkway'], [/gate|entrance/, 'the site entrance'], [/yard/, 'the yard']];
function words2num(t){ return t.replace(/\b(one|two|three|four|five)\b/g, function(w){ return NUMW[w]; }); }
function cap(s){ s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
function findMachine(low, siteId){
  for (var i = 0; i < MACHINE_WORDS.length; i++){ var r = MACHINE_WORDS[i]; if (r[0].test(low) && (!r[2] || !siteId || r[2] === siteId)) return machine(r[1]); }
  for (var j = 0; j < MACHINE_WORDS.length; j++){ if (MACHINE_WORDS[j][0].test(low)) return machine(MACHINE_WORDS[j][1]); }
  return null;
}
function tidyDefect(raw, siteId, mFixed){
  var low = ' ' + String(raw || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  var m = mFixed || findMachine(low, siteId), part = null, fault = null, crit = 0, unsure = [];
  for (var i = 0; i < PARTS.length; i++) if (PARTS[i][0].test(low)) { part = PARTS[i][1]; crit = PARTS[i][2]; break; }
  for (var j = 0; j < FAULTS.length; j++) if (FAULTS[j][0].test(low)) { fault = FAULTS[j][1]; break; }
  var since = (low.match(/\bsince ([a-z0-9 ]{3,30}?)(?= and | but |$| it | the )/) || [])[1];
  if (!m) unsure.push('Which machine. Tap it below.');
  if (!part) unsure.push('Which part. We could not tell, check the wording.');
  if (part === 'Leak' && !fault) fault = 'leaking';
  if (!fault) fault = 'not right';
  var serious = !!(crit && /not working|cutting out|missing|damaged|cracked/.test(fault)) || HAZARD_WORDS.test(low) || /brake|steering/.test((part || '').toLowerCase());
  var partL = part ? part.toLowerCase() : 'fault';
  var title = (m ? m.name + ': ' : '') + (part || 'Fault') + (part === 'Leak' ? '' : ' ' + fault.split(',')[0]);
  var text = (part === 'Leak' ? 'Leak found' + (m ? ' on ' + m.name : '') : (part || 'A fault') + (m ? ' on ' + m.name : '') + ' is ' + fault) + (since ? ', since ' + since.trim() : '') + '.';
  var why = serious ? (crit ? cap(partL) + ' is a safety device. Rule: a safety device not working means Do not use.' : 'You mentioned a hazard. Rule: treat it as serious until a fitter checks it.') : 'Not a safety device. Rule: safe to use for now, fitter to look at it.';
  var action = serious ? 'Do not use' + (m ? ' ' + m.name : '') + ' until the fitter has fixed and tested the ' + partL + '. Keep the key out. The fitter has been told.' : 'Carry on with care. The fitter will look at the ' + partL + ' within 24 hours.';
  return { kind: 'defect', machine: m ? m.id : null, part: part, fault: fault, title: title, text: text, severity: serious ? 'serious' : 'minor', why: why, action: action, unsure: unsure, raw: raw };
}
function tidyNearMiss(raw, siteId){
  var low = ' ' + String(raw || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  var m = findMachine(low, siteId), place = null, unsure = [];
  for (var i = 0; i < PLACES.length; i++) if (PLACES[i][0].test(low)) { place = PLACES[i][1]; break; }
  var person = /\b(lad|bloke|man|woman|guy|person|pedestrian|driver|someone|somebody|customer|visitor|he|she|they)\b/.test(low);
  var vehicle = !!m && m.group === 'mobile' || /\b(lorry|truck|wagon|van|car|skip)\b/.test(low);
  var cat = person && vehicle ? 'Person and vehicle' : /slip|trip|fell|fall/.test(low) ? 'Slip, trip or fall' : /fell off|dropped|falling|came off/.test(low) ? 'Falling object' : m && m.group === 'fixed' ? 'Machinery' : 'Other';
  var high = cat === 'Person and vehicle' || cat === 'Machinery' || HAZARD_WORDS.test(low);
  if (!place) unsure.push('Where it happened. Check the wording.');
  var title = 'Near miss: ' + (cat === 'Person and vehicle' ? 'person close to ' + (m ? m.name : 'a moving vehicle') : cat.toLowerCase() + (m ? ' at ' + m.name : '')) + (place ? ' at ' + place : '');
  var text = cap(cat === 'Person and vehicle' ? 'A person was close to ' + (m ? m.name : 'a moving vehicle') + ' while it was moving' : 'Something nearly went wrong' + (m ? ' at ' + m.name : '')) + (place ? ', at ' + place : '') + '. Nobody was hurt.';
  var action = cat === 'Person and vehicle' ? 'Supervisor to check the walkway and the exclusion zone' + (place ? ' at ' + place : '') + ' before the next shift.' : 'Supervisor to look at it today and talk to the team.';
  return { kind: 'nearmiss', machine: m ? m.id : null, place: place, cat: cat, title: title, text: text, severity: high ? 'high' : 'low', why: high ? 'Could have caused a serious injury. Rule: high potential, review today.' : 'Low potential. Rule: review this week.', action: action, unsure: unsure, raw: raw };
}

/* 30 days of sample history for the audit pack. Made up on the fly, not stored. */
function history(mid){
  var m = machine(mid), out = [], ops = OPS.filter(function(o){ return o.drive.indexOf(mid) >= 0 && !o.fitter; });
  if (!ops.length) ops = OPS.filter(function(o){ return o.site === m.site; });
  var seedN = parseInt(mid.slice(1), 10);
  for (var d = 29; d >= 1; d--){
    var day = now() - d * 24 * 60 * MIN, wd = new Date(day).getUTCDay();
    if (wd === 0) continue;
    var o = ops[(d + seedN) % ops.length], t0 = today(6, 40 + ((d * 7 + seedN) % 25), day);
    var fail = (d * 13 + seedN * 5) % 23 === 0;
    out.push({ at: t0, type: 'pre', op: o.id, ok: !fail, note: fail ? 'Minor: ' + (m.group === 'mobile' ? 'work light out' : 'guard bolt loose') + '. Fixed same day by the fitter.' : '' });
    if (wd !== 6) out.push({ at: today(15, 20 + ((d * 3) % 30), day), type: 'post', op: o.id, ok: true, note: '' });
  }
  return out;
}

var DEMO_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f3c"/><stop offset="1" stop-color="#1c201e"/></linearGradient></defs>' +
  '<rect width="320" height="220" fill="url(#g)"/><rect x="40" y="40" width="240" height="120" rx="12" fill="#e2a514"/><rect x="58" y="58" width="90" height="60" rx="6" fill="#2b2f2d"/>' +
  '<circle cx="230" cy="96" r="26" fill="#2b2f2d"/><g fill="#555" ><circle cx="222" cy="90" r="3"/><circle cx="234" cy="90" r="3"/><circle cx="222" cy="102" r="3"/><circle cx="234" cy="102" r="3"/></g>' +
  '<path d="M200 60 L262 132" stroke="#ff4d3d" stroke-width="6" stroke-linecap="round"/><path d="M262 60 L200 132" stroke="#ff4d3d" stroke-width="6" stroke-linecap="round"/>' +
  '<text x="160" y="196" fill="#cfd6d2" font-family="Arial" font-size="15" text-anchor="middle">Sample photo: reversing alarm</text></svg>');

function seed(){
  var s = { v: 2, shift: SHIFT, seededAt: now(), checks: [], defects: [], locks: [], signoffs: [], events: [], nearmisses: [], tbt: [], permits: [], last: null };
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
  s.defects.push({ id: uid('d'), machine: 'm9', op: 'o8', at: bad.at, item: 'Horn and reversing alarm', note: 'Reversing alarm not working', severity: 'serious', photo: DEMO_PHOTO, check: bad.id, open: true, assigned: 'o9' });
  var balerChk = s.checks.filter(function(c){ return c.machine === 'm7'; })[0];
  s.defects.push({ id: uid('d'), machine: 'm7', op: 'o2', at: balerChk.at + 3 * MIN, item: 'Ram', note: 'Ram slow, not returning fully on the return stroke', severity: 'minor', photo: null, check: null, open: true, assigned: 'o13', how: 'voice' });
  /* Active permit and lock: fitter on the trommel at Deep Moor. */
  var ptw = { id: 'PTW-0411', machine: 'm13', by: 'o9', at: now() - 55 * MIN, job: 'Drum bearing change', open: true,
    points: [ { t: 'Main electrical isolator', done: true }, { t: 'Drive belt guard removed, drum chocked', done: true } ], tried: true, workers: ['o9'] };
  s.permits.push(ptw);
  s.locks.push({ id: uid('l'), machine: 'm13', op: 'o9', on: now() - 52 * MIN, off: null, reason: 'Drum bearing change', permit: 'PTW-0411' });
  s.nearmisses.push({ id: uid('n'), at: now() - 26 * 60 * MIN, op: 'o10', machine: 'm10', site: 'dm', cat: 'Person and vehicle', title: 'Near miss: person close to 360 Handler at the tipping bay', text: 'A visitor walked out of the walkway behind the 360 Handler while it was slewing, at the tipping bay. Nobody was hurt.', severity: 'high', action: 'Barrier added to the walkway by the tipping bay.', open: false, how: 'voice' });
  ['o2', 'o3', 'o5', 'o13'].forEach(function(o, i){ s.tbt.push({ id: uid('t'), tbt: TBT.id, op: o, at: at(7, 12 + i, 6) }); });
  /* Earlier lock, now off. */
  s.locks.push({ id: uid('l'), machine: 'm7', op: 'o2', on: at(7, 24, 6), off: at(7, 49, 5), reason: 'Clearing a wire jam' });
  /* Sign-offs. LOTOTO is new, so only some have signed. */
  var signedL = ['o2', 'o9', 'o7', 'o5', 'o3'];
  signedL.forEach(function(o, i){ s.signoffs.push({ id: uid('s'), swp: 'lototo', op: o, at: now() - (i * 26 + 40) * 60 * MIN / 12, quiz: { right: 2, of: 2, tries: i === 3 ? 2 : 1 } }); });
  OPS.forEach(function(o, i){ if (i !== 3 && i !== 11) s.signoffs.push({ id: uid('s'), swp: 'refuel', op: o.id, at: now() - (20 + i * 3) * 24 * 60 * MIN }); });
  ['o1', 'o2', 'o3', 'o5', 'o6', 'o7', 'o12', 'o4'].forEach(function(o, i){ s.signoffs.push({ id: uid('s'), swp: 'picking', op: o, at: now() - (9 + i * 4) * 24 * 60 * MIN }); });
  s.events.push({ id: uid('e'), at: bad.at, kind: 'defect', machine: 'm9', op: 'o8', text: 'Callum reported a serious defect on Shovel 3. Do not use.' });
  s.events.push({ id: uid('e'), at: s.locks[0].on, kind: 'lockon', machine: 'm13', op: 'o9', text: 'Ryan put a lock on the Trommel.' });
  return s;
}

var state = null;
function load(){
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.v === 2) { SHIFT = p.shift || 0; if (dateKey(p.seededAt) === dateKey(now())) { state = p; return state; } } } } catch (e) {}
  SHIFT = calcShift(); state = seed(); persist(null); return state;
}
function persist(change){
  if (change) { change.ts = now(); change.n = Math.random(); state.last = change; }
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { /* Storage full, most likely large photos. Drop old photos and retry. */
    state.defects.forEach(function(d, i){ if (i < state.defects.length - 1 && d.photo && d.photo.indexOf('data:image/jpeg') === 0) d.photo = DEMO_PHOTO; });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) {}
  }
}
function reset(){ SHIFT = calcShift(); state = seed(); state.last = { type: 'reset', ts: now() }; persist(); return state; }

function byId(list, id){ for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
function op(id){ return byId(OPS, id); }
function machine(id){ return byId(MACHINES, id); }
function site(id){ return byId(SITES, id); }
function isToday(t){ return dateKey(t) === dateKey(now()); }

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

function addEvent(kind, mid, oid, text){ state.events.push({ id: uid('e'), at: now(), kind: kind, machine: mid, op: oid, text: text }); if (state.events.length > 80) state.events.shift(); }

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
  if (!canIsolate(oid, mid).ok) return null;
  var mine = activeLocks(mid).filter(function(l){ return l.op === oid; });
  if (mine.length) return mine[0];
  var l = { id: uid('l'), machine: mid, op: oid, on: now(), off: null, reason: reason || '' };
  state.locks.push(l);
  addEvent('lockon', mid, oid, op(oid).first + ' put a lock on ' + machine(mid).name + '.');
  persist({ type: 'lockon', machine: mid, op: oid });
  return l;
}
function lockOff(lid, oid){
  var l = byId(state.locks, lid);
  if (!l || l.off || l.op !== oid) return false;
  l.off = now();
  addEvent('lockoff', l.machine, oid, op(oid).first + ' took their lock off ' + machine(l.machine).name + '.');
  persist({ type: 'lockoff', machine: l.machine, op: oid });
  return true;
}
function signSwp(swpId, oid, sig, quiz){
  if (hasSigned(swpId, oid) && byId(SWPS, swpId).isNew && state.signoffs.some(function(x){ return x.swp === swpId && x.op === oid && now() - x.at < 5000; })) return null;
  var s = { id: uid('s'), swp: swpId, op: oid, at: now(), sig: sig || null, ver: byId(SWPS, swpId).ver, quiz: quiz || null };
  state.signoffs.push(s);
  addEvent('sign', null, oid, op(oid).first + ' signed ' + byId(SWPS, swpId).title + '.');
  persist({ type: 'sign', swp: swpId, op: oid });
  return s;
}
function addDefect(d, oid){
  var mid = d.machine, m = machine(mid), rec = { id: uid('d'), machine: mid, op: oid, at: now(), item: d.part || 'Fault', note: d.text, title: d.title, severity: d.severity, photo: null, check: null, open: true, assigned: FITTER[m.site], how: d.how || 'voice', raw: d.raw };
  if (byId(state.defects, d.id)) return null;
  if (d.id) rec.id = d.id;
  state.defects.push(rec);
  addEvent('defect', mid, oid, op(oid).first + ' reported by voice: ' + d.title + (d.severity === 'serious' ? '. Do not use.' : '.'));
  persist({ type: 'defect', machine: mid, op: oid });
  return rec;
}
function addNearMiss(n, oid){
  if (n.id && byId(state.nearmisses, n.id)) return null;
  var rec = { id: n.id || uid('n'), at: now(), op: oid, machine: n.machine, site: op(oid).site, cat: n.cat, title: n.title, text: n.text, severity: n.severity, action: n.action, open: true, how: n.how || 'voice', raw: n.raw };
  state.nearmisses.push(rec);
  addEvent('nearmiss', n.machine, oid, op(oid).first + ' reported a ' + (n.severity === 'high' ? 'high potential ' : '') + 'near miss: ' + n.title.replace('Near miss: ', '') + '.');
  persist({ type: 'nearmiss', op: oid });
  return rec;
}
function signTbt(oid){
  if (state.tbt.some(function(t){ return t.op === oid && t.tbt === TBT.id; })) return false;
  state.tbt.push({ id: uid('t'), tbt: TBT.id, op: oid, at: now() });
  addEvent('sign', null, oid, op(oid).first + ' signed the toolbox talk: ' + TBT.title + '.');
  persist({ type: 'sign', op: oid });
  return true;
}
function atTbt(oid){ return state.tbt.some(function(t){ return t.op === oid && t.tbt === TBT.id; }); }
function openPermits(mid){ return state.permits.filter(function(p){ return p.open && (!mid || p.machine === mid); }); }
function raisePermit(p, oid){
  if (openPermits(p.machine).length) return openPermits(p.machine)[0];
  var n = 412 + state.permits.length - 1;
  var rec = { id: 'PTW-0' + n, machine: p.machine, by: oid, at: now(), job: p.job, defect: p.defect || null, open: true, points: p.points, tried: true, workers: [oid] };
  state.permits.push(rec);
  var l = { id: uid('l'), machine: p.machine, op: oid, on: now(), off: null, reason: p.job, permit: rec.id };
  state.locks.push(l);
  addEvent('lockon', p.machine, oid, op(oid).first + ' issued permit ' + rec.id + ' and isolated ' + machine(p.machine).name + ' for maintenance.');
  persist({ type: 'lockon', machine: p.machine, op: oid });
  return rec;
}
function joinPermit(pid, oid){
  var p = byId(state.permits, pid); if (!p || !p.open) return false;
  if (p.workers.indexOf(oid) >= 0) return false;
  p.workers.push(oid);
  state.locks.push({ id: uid('l'), machine: p.machine, op: oid, on: now(), off: null, reason: 'Working under ' + p.id, permit: p.id });
  addEvent('lockon', p.machine, oid, op(oid).first + ' put their lock on the group lock box for ' + p.id + '.');
  persist({ type: 'lockon', machine: p.machine, op: oid });
  return true;
}
function closePermit(pid, oid, note){
  var p = byId(state.permits, pid); if (!p || !p.open) return false;
  var others = activeLocks(p.machine).filter(function(l){ return l.permit === p.id && l.op !== oid; });
  if (others.length) return false;
  activeLocks(p.machine).filter(function(l){ return l.permit === p.id; }).forEach(function(l){ l.off = now(); });
  p.open = false; p.closed = now(); p.note = note || '';
  if (p.defect) { var d = byId(state.defects, p.defect); if (d && d.open) { d.open = false; d.fixedAt = now(); d.fixedBy = oid; d.fixNote = note || ''; } }
  addEvent('lockoff', p.machine, oid, op(oid).first + ' closed permit ' + p.id + '. ' + machine(p.machine).name + ' handed back. Pre-shift check needed.');
  persist({ type: 'lockoff', machine: p.machine, op: oid });
  return true;
}
function fitterFix(did, oid, note){
  var d = byId(state.defects, did); if (!d || !d.open) return false;
  d.open = false; d.fixedAt = now(); d.fixedBy = oid; d.fixNote = note || '';
  addEvent('fixed', d.machine, oid, op(oid).first + ' fixed and tested ' + machine(d.machine).name + ': ' + (note || d.note) + ' Back in use.');
  persist({ type: 'fixed', machine: d.machine, op: oid });
  return true;
}
function hasSigned(swpId, oid){ return state.signoffs.some(function(s){ return s.swp === swpId && s.op === oid; }); }
function fixDefect(did){
  var d = byId(state.defects, did); if (!d || !d.open) return;
  d.open = false; d.fixedAt = now();
  addEvent('fixed', d.machine, null, 'Defect on ' + machine(d.machine).name + ' marked fixed in the office.');
  persist({ type: 'fixed', machine: d.machine });
}

/* Time helpers */
function hm(t){ var p = lparts(t); return ('0' + p.h).slice(-2) + ':' + ('0' + p.mi).slice(-2); }
function dayLabel(t){ return new Date(t).toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function dYear(t){ return new Date(t).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' }); }
function dShort(t){ return new Date(t).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' }); }
function since(t){ var m = Math.max(0, Math.round((now() - t) / MIN)); if (m < 1) return 'just now'; if (m < 60) return m + ' min'; var h = Math.floor(m / 60); if (h < 24) return h + 'h ' + ('0' + (m % 60)).slice(-2) + 'm'; return Math.floor(h / 24) + ' days'; }
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
  now: now, PIN: PIN, FITTER: FITTER, TBT: TBT, QUIZ: QUIZ, CARD: CARD, training: training, tStatus: tStatus, canDrive: canDrive, canIsolate: canIsolate,
  inspections: inspections, inspWorst: inspWorst, tidyDefect: tidyDefect, tidyNearMiss: tidyNearMiss, history: history, dShort: dShort, dYear: dYear, cap: cap,
  addDefect: addDefect, addNearMiss: addNearMiss, signTbt: signTbt, atTbt: atTbt, openPermits: openPermits, raisePermit: raisePermit, joinPermit: joinPermit, closePermit: closePermit, fitterFix: fitterFix,
  KEY: KEY, SITES: SITES, OPS: OPS, MACHINES: MACHINES, SWPS: SWPS, CHECK_TYPES: CHECK_TYPES, KIND_ICON: KIND_ICON, DEMO_PHOTO: DEMO_PHOTO,
  load: load, reset: reset, persist: persist, get state(){ return state; },
  op: op, machine: machine, site: site, byId: byId, uid: uid, checklist: checklist,
  openDefects: openDefects, activeLocks: activeLocks, checksToday: checksToday, doNotUse: doNotUse, status: status,
  saveCheck: saveCheck, lockOn: lockOn, lockOff: lockOff, signSwp: signSwp, hasSigned: hasSigned, fixDefect: fixDefect,
  hm: hm, dayLabel: dayLabel, since: since, ago: ago, esc: esc, initials: initials, avatar: avatar, isToday: isToday,
  say: say, setMuted: setMuted, get muted(){ return muted; }
};
})();
