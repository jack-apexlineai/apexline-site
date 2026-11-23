/* CBR engineer app, on the phone: van engineers (call outs, safety check, photos, parts from
   the van, extra work, the customer signs) and the build team (clock on to a build stage,
   photos). Shares this browser's storage with the office, so the office sees it in seconds. */
(function () {
  var $ = WS.$, esc = WS.esc;
  var Q = /[?&]as=([a-z0-9]+)/i.exec(location.search);
  var who = Q ? Q[1] : '';
  if (!who) { try { who = sessionStorage.getItem('wsCBR:vanWho') || ''; } catch (e) { } }
  var view = { name: 'day', id: '' };
  var extra = null, signDrawn = false;

  function T() { return WS.day(0); }
  function now() { return WS.nowStamp(); }
  function person() {
    if (!who) return null;
    if (who.charAt(0) === 'b') { var b = (WS.state.buildTeam || []).filter(function (x) { return x.id === who; })[0]; return b ? { id: b.id, name: b.name, role: b.role, fab: true } : null; }
    var f = WS.fitter(who);
    return f && f.mobile ? { id: f.id, name: f.name, role: f.role, van: f.van } : null;
  }
  /* on a phone on its own (not inside the office's phone frame), a way back to the office demo */
  function officeLink() { return WS.inDock ? '' : '<a class="va-office" href="index.html">Back to the office demo</a>'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function first(n) { return String(n || '').split(' ')[0]; }
  function greet(n) { var h = new Date().getHours(); return 'Good ' + (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening') + ', ' + n; }
  function myVan() { var p = person(); return p && p.van ? WS.van(p.van) : null; }
  function myJobs() {
    return WS.state.jobs.filter(function (j) { return j.date === T() && j.bay === 'Mobile van' && j.fitterId === who; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function stageOf(j) {
    if (j.status === 'done') return 'done';
    if (j.status === 'waiting_auth') return 'waiting';
    return (j.van && j.van.stage) || 'booked';
  }
  var STAGE = { booked: ['To do', ''], on_way: ['On the way', 'go'], on_site: ['On site', 'go'], working: ['Working', 'go'], waiting: ['Waiting on customer', 'warn'], done: ['Done and signed', 'ok'] };
  function pill(t, c) { return '<span class="pill ' + (c || '') + '">' + esc(t) + '</span>'; }
  function since(t) { var m = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000)); return m < 60 ? m + 'm' : WS.dur(m / 60); }
  function opOf(j) { return WS.operator(j.operatorId) || {}; }
  function sample(j) {
    var n = String(j.notes || '').toLowerCase();
    return 'close:' + (/hinge|weld|crack/.test(n) ? 'hinge' : /ram|tip/.test(n) ? 'ram' : /hose|burst|leak/.test(n) ? 'hose' : /sheet/.test(n) ? 'sheet' : /lamp|light|loom/.test(n) ? 'lights' : /pin/.test(n) ? 'pins' : 'generic');
  }
  function save(msg) { WS.save(); render(); if (msg) WS.toast(msg, 'ok'); }

  /* ---------------- screens ---------------- */
  function top() {
    var p = person(), v = myVan();
    return '<header class="va-top"><img src="brand/cbr-logo.png" alt="CBR" class="va-logo">' +
      '<div class="va-who"><b>' + esc(p ? p.name : 'CBR engineer app') + '</b><span>' + esc(p ? (v ? v.name + ' · ' + v.reg : p.role) : 'Commercial Bodies & Repairs') + '</span></div>' +
      (p ? '<button type="button" class="va-sw" id="vaSwitch">Switch</button>' : '') + '</header>';
  }
  function login() {
    var engs = WS.state.settings.fitters.filter(function (f) { return f.mobile; });
    var team = WS.state.buildTeam || [];
    function btn(id, name, role) {
      return '<button type="button" class="va-person" data-who="' + id + '"><span class="cb-av">' + esc(name.split(' ').map(function (x) { return x[0]; }).join('')) + '</span><span><b>' + esc(name) + '</b><em>' + esc(role) + '</em></span></button>';
    }
    return top() + '<div class="va-pad"><h1 class="va-h">Who are you?</h1><p class="va-muted">Tap your name. In the demo there is no PIN.</p>' +
      '<div class="va-grp">In the vans</div>' + engs.map(function (f) { return btn(f.id, f.name, f.role); }).join('') +
      '<div class="va-grp">In the build hall</div>' + team.map(function (b) { return btn(b.id, b.name, b.role); }).join('') + officeLink() + '</div>';
  }

  function day() {
    var p = person(), l = myJobs(), v = myVan();
    var cur = l.filter(function (j) { var s = stageOf(j); return s !== 'booked' && s !== 'done'; })[0];
    var left = l.filter(function (j) { return j.status !== 'done'; }).length;
    var low = v ? v.stock.filter(function (x) { return x.qty < x.min; }).length : 0;
    return top() + '<div class="va-pad"><h1 class="va-h">' + esc(greet(first(p.name))) + '.</h1>' +
      '<p class="va-muted">' + (l.length ? left + ' of ' + l.length + ' call outs left today.' : 'Nothing booked yet. The office will send you one.') + '</p>' +
      (cur ? '<button type="button" class="va-now" data-job="' + cur.id + '"><span class="va-nk">Now</span><b>' + esc(cur.site.name) + '</b><span>' + esc(STAGE[stageOf(cur)][0]) + (cur.van.arrivedAt ? ' · on site ' + since(cur.van.arrivedAt) : '') + '</span><i>›</i></button>' : '') +
      '<ol class="va-list">' + l.map(function (j, i) {
        var veh = WS.vehicle(j.vehicleId), s = stageOf(j);
        return '<li><button type="button" class="va-job ' + s + '" data-job="' + j.id + '"><span class="va-n">' + (i + 1) + '</span><span class="va-jt"><b>' + esc(j.site.name) + '</b>' +
          '<span>' + esc(j.site.town) + ' · ' + esc(WS.shortName(opOf(j).name || '')) + (veh ? ' · ' + esc(veh.reg) : '') + '</span><span class="va-fault">' + esc(j.notes) + '</span></span>' + pill(STAGE[s][0], STAGE[s][1]) + '</button></li>';
      }).join('') + '</ol>' +
      (v ? '<button type="button" class="btn alt block" id="vaStock">' + esc(v.name) + ' stock' + (low ? ' · ' + low + ' low' : '') + '</button>' : '') + officeLink() + '</div>';
  }

  function stockView() {
    var v = myVan();
    return top() + '<div class="va-pad"><button type="button" class="va-back" id="vaBack">‹ My day</button><h1 class="va-h">' + esc(v.name) + ' stock</h1>' +
      '<p class="va-muted">Comes off when you add it to a job. The stores restock it from the office.</p>' +
      '<div class="va-stock">' + v.stock.map(function (x) {
        return '<div class="va-srow' + (x.qty < x.min ? ' low' : '') + '"><span><b>' + esc(x.name) + '</b><em>' + esc(x.partNo) + '</em></span><span class="va-q">' + x.qty + '<em>keep ' + x.min + '</em></span></div>';
      }).join('') + '</div></div>';
  }

  function jobView() {
    var j = WS.job(view.id);
    if (!j) { view = { name: 'day' }; return day(); }
    var s = stageOf(j), veh = WS.vehicle(j.vehicleId), o = opOf(j), v = myVan();
    var appr = WS.state.approvals.filter(function (a) { return a.jobId === j.id; }).slice(-1)[0];
    var out = top() + '<div class="va-pad"><button type="button" class="va-back" id="vaBack">‹ My day</button>' +
      '<div class="va-jh"><div class="va-jhk">' + pill(STAGE[s][0], STAGE[s][1]) + (j.priority === 'high' ? pill('Urgent', 'bad') : '') + '</div>' +
      '<h1 class="va-h">' + esc(j.site.name) + '</h1><p class="va-muted">' + esc(j.site.town) + (j.site.postcode ? ' ' + esc(j.site.postcode) : '') + ' · ' + esc(o.name || '') + '</p>' +
      '<div class="va-veh">' + (veh ? '<span class="reg">' + esc(veh.reg) + '</span> <span>' + esc(veh.make + ' ' + veh.model) + '</span>' : '<span>Vehicle to check on site</span>') + '</div>' +
      '<div class="va-fault big">' + esc(j.notes) + '</div>' +
      '<button type="button" class="btn alt sm" id="vaCall">Call ' + esc(first(o.contact)) + '</button></div>';

    if (s === 'booked') out += '<button type="button" class="va-go" id="vaOnWay">I\'m on my way</button><p class="va-muted c">' + esc(first(o.contact)) + ' gets a text to say you are coming.</p>';
    else if (s === 'on_way' && !view.safety) out += '<button type="button" class="va-go" id="vaArrive">I\'ve arrived</button><p class="va-muted c">Set off ' + WS.timeUK(j.van.setOff) + '.</p>';
    else if (s === 'on_way' && view.safety) out += safety(j);
    else if (s === 'waiting') {
      out += '<div class="va-wait"><b>Waiting for ' + esc(first(o.contact)) + ' to approve</b><span>' + esc(appr ? appr.title : 'the extra work') + ' · sent ' + (appr ? since(appr.sentAt) : '') + ' ago</span>' +
        '<span class="va-muted">You will see it here the moment they answer. Carry on with the original job meanwhile.</span></div>' + working(j, v);
    } else if (s === 'working') {
      if (appr && (appr.status === 'Approved' || appr.status === 'Declined') && !(j.clockOns || []).some(function (c) { return !c.end; }))
        out += '<div class="va-ans ' + (appr.status === 'Approved' ? 'ok' : 'no') + '"><b>' + esc(appr.decidedBy || first(o.contact)) + ' ' + appr.status.toLowerCase() + ' it' + (appr.decidedAt ? ' at ' + WS.timeUK(appr.decidedAt) : '') + '</b><span>' + esc(appr.title) + '</span>' +
          '<button type="button" class="btn" id="vaCarry">' + (appr.status === 'Approved' ? 'Carry on, do the extra work' : 'Carry on with the original job') + '</button></div>';
      out += working(j, v);
    } else if (s === 'done') out += doneView(j);
    return out + '</div>';
  }

  function safety(j) {
    var items = ['Parked somewhere safe, off the live road', 'Cones and beacon out', 'Hi vis and PPE on', 'Driver or yard told I am working on it'];
    var sf = j.van.safety || [];
    var all = items.every(function (x, i) { return sf[i]; });
    return '<div class="va-card"><h2>Safety check</h2><p class="va-muted">Before you touch it. Logged with the time.</p>' +
      items.map(function (x, i) { return '<button type="button" class="cb-chk' + (sf[i] ? ' on' : '') + '" data-sf="' + i + '" aria-pressed="' + !!sf[i] + '"><i>' + (sf[i] ? '✓' : '') + '</i><span>' + esc(x) + '</span></button>'; }).join('') +
      '<button type="button" class="va-go" id="vaStart"' + (all ? '' : ' disabled') + '>Start work</button></div>';
  }

  function working(j, v) {
    var open = (j.clockOns || []).some(function (c) { return !c.end; });
    var hrs = WS.hoursOn(j);
    var out = '<div class="va-timer"><span>' + (open ? 'On the clock' : 'Clock stopped') + '</span><b id="vaClock">' + WS.dur(hrs) + '</b><span>of ' + WS.dur(j.estHours) + ' allowed</span></div>';
    out += '<div class="va-card"><h2>The job</h2>' + (j.tasks || []).map(function (t) {
      return '<button type="button" class="cb-chk' + (t.done ? ' on' : '') + '" data-task="' + t.id + '" aria-pressed="' + !!t.done + '"><i>' + (t.done ? '✓' : '') + '</i><span>' + esc(t.text) + '</span></button>';
    }).join('') + '</div>';
    out += '<div class="va-card"><h2>Photos <span class="cb-count">' + (j.photos || []).length + '</span></h2><div class="va-phs">' + (j.photos || []).map(function (p) { return '<img src="' + WS.photoSrc(p) + '" alt="Job photo">'; }).join('') + '</div>' +
      '<div class="va-row"><label class="btn alt sm">Take a photo<input type="file" accept="image/*" capture="environment" id="vaPhoto" hidden></label><button type="button" class="btn alt sm" id="vaSample">Use a sample photo</button></div></div>';
    out += '<div class="va-card"><h2>Parts used</h2>' + ((j.parts || []).length ? '<ul class="va-parts">' + j.parts.map(function (p) { return '<li><span>' + esc(p.name) + '</span><b>x' + p.qty + '</b></li>'; }).join('') + '</ul>' : '<p class="va-muted">None yet.</p>') +
      (v ? '<div class="va-grp">From ' + esc(v.name) + '</div><div class="va-pick">' + v.stock.map(function (x, i) {
        return '<button type="button" class="va-pk" data-part="' + i + '"' + (x.qty ? '' : ' disabled') + '><span>' + esc(x.name) + '</span><em>' + x.qty + ' in van</em></button>';
      }).join('') + '</div>' : '') + '</div>';
    out += '<div class="va-card"><h2>Notes</h2><textarea class="in" id="vaNote" rows="3" placeholder="What you found and what you did">' + esc(j.van.note || '') + '</textarea>' +
      '<div class="va-row"><button type="button" class="btn alt sm" id="vaNoteSave">Save note</button>' + (WS.speechOk() ? '<button type="button" class="btn alt sm" id="vaMic">Speak it</button>' : '') + '</div></div>';
    if (stageOf(j) !== 'waiting') out += '<button type="button" class="btn alt block va-extra" id="vaExtra">Found something else wrong</button>';
    out += '<button type="button" class="va-go" id="vaFinish">Finished, get it signed</button>';
    return out;
  }

  function extraView() {
    var j = WS.job(view.id), o = opOf(j), rc = WS.rateFor(j.operatorId);
    var tot = (parseFloat(extra.hours) || 0) * rc.rate + (parseFloat(extra.price) || 0) * (1 + rc.markup / 100);
    return top() + '<div class="va-pad"><button type="button" class="va-back" id="vaBackJob">‹ Back to the job</button><h1 class="va-h">Found something else</h1>' +
      '<p class="va-muted">Goes to ' + esc(o.contact || 'the customer') + ' by WhatsApp and email with your photo and a price. They approve on their phone.</p>' +
      '<label class="f"><span class="lb">What did you find</span><input class="in" id="exT" value="' + esc(extra.title) + '" placeholder="Arm pivot pins worn"></label>' +
      '<label class="f"><span class="lb">Tell them more</span><textarea class="in" id="exD" rows="3">' + esc(extra.detail) + '</textarea></label>' +
      '<div class="grid g2"><label class="f"><span class="lb">Hours</span><input class="in" id="exH" type="number" min="0.25" step="0.25" value="' + esc(extra.hours) + '"></label>' +
      '<label class="f"><span class="lb">Parts cost £</span><input class="in" id="exP" type="number" min="0" step="1" value="' + esc(extra.price) + '"></label></div>' +
      '<div class="va-phs">' + extra.photos.map(function (p) { return '<img src="' + WS.photoSrc(p) + '" alt="">'; }).join('') + '</div>' +
      '<div class="va-row"><label class="btn alt sm">Take a photo<input type="file" accept="image/*" capture="environment" id="exPh" hidden></label><button type="button" class="btn alt sm" id="exSample">Use a sample photo</button></div>' +
      '<div class="va-est">They will see about <b>' + WS.money(tot * 1.2) + '</b> including VAT</div>' +
      '<button type="button" class="va-go" id="exSend">Send for approval</button></div>';
  }

  function signView() {
    var j = WS.job(view.id), o = opOf(j), hrs = WS.hoursOn(j);
    var sum = j.van.note || (j.tasks || []).filter(function (t) { return t.done; }).map(function (t) { return t.text; }).join('. ');
    return top() + '<div class="va-pad"><button type="button" class="va-back" id="vaBackJob">‹ Back to the job</button><h1 class="va-h">Customer signs</h1>' +
      '<p class="va-muted">Hand the phone over. It goes to the office straight away, ready to invoice.</p>' +
      '<div class="va-card"><dl class="cb-dl"><dt>Time</dt><dd>' + WS.dur(hrs) + ' on site</dd><dt>Parts</dt><dd>' + esc((j.parts || []).map(function (p) { return p.qty + ' x ' + p.name; }).join(', ') || 'None') + '</dd><dt>Photos</dt><dd>' + (j.photos || []).length + '</dd></dl>' +
      '<label class="f"><span class="lb">What was done</span><textarea class="in" id="sgSum" rows="3">' + esc(sum) + '</textarea></label></div>' +
      '<label class="f"><span class="lb">Name</span><input class="in" id="sgName" value="' + esc(o.contact || '') + '"></label>' +
      '<div class="lb" style="margin-top:12px">Sign here</div><canvas class="va-sig" id="sgPad" width="340" height="150" aria-label="Signature pad"></canvas>' +
      '<div class="va-row"><button type="button" class="btn alt sm" id="sgClear">Clear</button></div>' +
      '<button type="button" class="va-go" id="sgDone" disabled>Signed, send to the office</button></div>';
  }

  function doneView(j) {
    var g = j.van.sign || {};
    return '<div class="va-card va-signed"><h2>Signed for</h2>' + (g.sig ? '<img src="' + g.sig + '" alt="Signature" class="va-sigimg">' : '<div class="va-sigline">' + esc(g.name || '') + '</div>') +
      '<p><b>' + esc(g.name || '') + '</b> · ' + (g.at ? WS.timeUK(g.at) : '') + '</p>' + (j.van.summary ? '<p class="va-muted">' + esc(j.van.summary) + '</p>' : '') +
      '<p class="va-muted">' + WS.dur(WS.hoursOn(j)) + ' on site · ' + plural((j.parts || []).length, 'part') + ' · ' + plural((j.photos || []).length, 'photo') + '. With the office, ready to invoice.</p></div>';
  }

  /* ---------------- build team ---------------- */
  function myBuilds() {
    return (WS.state.builds || []).filter(function (b) { var i = WS.stageIx(b.stage); return i >= WS.stageIx('chassis') && i <= WS.stageIx('pdi'); });
  }
  function openClock(b) { var p = person(); return (b.labour || []).filter(function (l) { return l.who === p.name && l.start && l.hours == null; })[0]; }
  function fabDay() {
    var p = person();
    return top() + '<div class="va-pad"><h1 class="va-h">' + esc(greet(first(p.name))) + '.</h1><p class="va-muted">Builds in the hall. Tap one to clock on.</p>' +
      myBuilds().map(function (b) {
        var c = openClock(b), q = b.hoursQuoted[b.stage] || 0, h = WS.buildHours(b, b.stage);
        return '<button type="button" class="va-job ' + (c ? 'working' : '') + '" data-build="' + b.id + '"><span class="va-n">' + esc(b.no.slice(-3)) + '</span><span class="va-jt"><b>' + esc(b.no) + ' · ' + esc(WS.shortName((WS.operator(b.operatorId) || {}).name || '')) + '</b>' +
          '<span>' + esc(WS.stageName(b.stage)) + '</span><span class="va-fault">' + WS.dur(h) + ' of ' + WS.dur(q) + ' on this stage</span></span>' + (c ? pill('On it ' + since(c.start), 'go') : '') + '</button>';
      }).join('') + officeLink() + '</div>';
  }
  function fabBuild() {
    var b = WS.build(view.id), p = person();
    if (!b) { view = { name: 'day' }; return fabDay(); }
    var c = openClock(b), q = b.hoursQuoted[b.stage] || 0, h = WS.buildHours(b, b.stage), pct = q ? Math.min(100, h / q * 100) : 0;
    var mine = (b.photos || []).slice(-4).reverse();
    return top() + '<div class="va-pad"><button type="button" class="va-back" id="vaBack">‹ My builds</button>' +
      '<h1 class="va-h">' + esc(b.no) + '</h1><p class="va-muted">' + esc((WS.operator(b.operatorId) || {}).name || '') + ' · ' + esc(b.title) + '</p>' +
      '<div class="va-card"><div class="va-grp">Stage</div><h2>' + esc(WS.stageName(b.stage)) + '</h2>' +
      '<div class="cb-prog big"><i class="' + (h > q * 1.05 ? 'over' : '') + '" style="width:' + pct + '%"></i></div><p class="va-muted">' + WS.dur(h) + ' of ' + WS.dur(q) + ' allowed on this stage</p></div>' +
      (c ? '<button type="button" class="va-go stop" id="fbOff">Clock off · on it ' + since(c.start) + '</button>' : '<button type="button" class="va-go" id="fbOn">Clock on to ' + esc(WS.stageShort(b.stage).toLowerCase()) + '</button>') +
      '<div class="va-card"><h2>Photo for the build file</h2><input class="in" id="fbCap" placeholder="What it shows, like front bulkhead welded">' +
      '<div class="va-row"><label class="btn alt sm">Take a photo<input type="file" accept="image/*" capture="environment" id="fbPh" hidden></label><button type="button" class="btn alt sm" id="fbSample">Use a sample photo</button></div>' +
      '<div class="va-phs">' + mine.map(function (x) { return '<img src="' + WS.photoSrc(x.art || x.src) + '" alt="">'; }).join('') + '</div></div>' +
      (b.stage !== 'pdi' ? '<button type="button" class="btn alt block" id="fbDone">Tell the office this stage is done</button>' : '') + '</div>';
  }

  /* ---------------- render and wire ---------------- */
  var ticker = null;
  function render() {
    var root = $('va'), p = WS.state ? person() : null;
    if (!p) { root.innerHTML = login(); wireLogin(); return; }
    if (p.fab) {
      root.innerHTML = view.name === 'build' ? fabBuild() : fabDay();
      wireFab();
    } else {
      root.innerHTML = view.name === 'job' ? jobView() : view.name === 'stock' ? stockView() : view.name === 'extra' ? extraView() : view.name === 'sign' ? signView() : day();
      wireVan();
    }
    var sw = $('vaSwitch');
    if (sw) sw.onclick = function () { who = ''; try { sessionStorage.removeItem('wsCBR:vanWho'); } catch (e) { } view = { name: 'day' }; render(); };
  }
  function wireLogin() {
    document.querySelectorAll('[data-who]').forEach(function (b) {
      b.onclick = function () { who = b.dataset.who; try { sessionStorage.setItem('wsCBR:vanWho', who); } catch (e) { } view = { name: 'day' }; render(); window.scrollTo(0, 0); };
    });
  }
  function go(v) { view = v; render(); window.scrollTo(0, 0); }
  function on(id, fn) { var e = $(id); if (e) e.onclick = fn; }

  function wireVan() {
    var p = person(), j = view.id ? WS.job(view.id) : null, v = myVan();
    document.querySelectorAll('[data-job]').forEach(function (b) { b.onclick = function () { go({ name: 'job', id: b.dataset.job }); }; });
    on('vaStock', function () { go({ name: 'stock' }); });
    on('vaBack', function () { go({ name: 'day' }); });
    on('vaBackJob', function () { go({ name: 'job', id: view.id }); });
    if (!j) return;
    var o = opOf(j);
    on('vaCall', function () { WS.toast('On a real phone this rings ' + (o.contact || 'the customer') + '.', ''); });
    on('vaOnWay', function () {
      j.van.stage = 'on_way'; j.van.setOff = now(); j.van.eta = WS.stampOf(new Date(Date.now() + 35 * 60000));
      WS.audit(j, p.name, 'On the way');
      WS.notify(o.contact + ', ' + o.name, 'SMS', 'Engineer on the way', first(p.name) + ' from CBR is on the way to ' + j.site.name + ', about 35 minutes.', 'ready');
      save(first(o.contact) + ' has had a text to say you are on the way.');
    });
    on('vaArrive', function () { view.safety = true; render(); });
    document.querySelectorAll('[data-sf]').forEach(function (b) {
      b.onclick = function () { j.van.safety = j.van.safety || []; j.van.safety[+b.dataset.sf] = !j.van.safety[+b.dataset.sf]; WS.save(); render(); };
    });
    on('vaStart', function () {
      j.van.stage = 'working'; j.van.arrivedAt = j.van.arrivedAt || now(); j.status = 'in_progress';
      j.clockOns.push({ fitterId: p.id, start: now(), end: '' });
      WS.audit(j, p.name, 'Arrived on site, safety check done');
      WS.audit(j, p.name, 'Clocked on');
      view.safety = false;
      save('Clocked on. The office can see you are working.');
    });
    on('vaCarry', function () {
      j.status = 'in_progress';
      j.clockOns.push({ fitterId: p.id, start: now(), end: '' });
      WS.audit(j, p.name, 'Carried on after the customer answered');
      save('Back on the clock.');
    });
    document.querySelectorAll('[data-task]').forEach(function (b) {
      b.onclick = function () { var t = (j.tasks || []).filter(function (x) { return x.id === b.dataset.task; })[0]; if (t) { t.done = !t.done; WS.save(); render(); } };
    });
    var ph = $('vaPhoto');
    if (ph) ph.onchange = function () { WS.readPhoto(ph.files && ph.files[0], function (url) { if (url) { j.photos.push(url); WS.audit(j, p.name, 'Photo added'); save('Photo on the job card.'); } }); };
    on('vaSample', function () { j.photos.push(WS.artSrc(sample(j))); WS.audit(j, p.name, 'Photo added'); save('Photo on the job card. The office can see it now.'); });
    document.querySelectorAll('[data-part]').forEach(function (b) {
      b.onclick = function () {
        var x = v.stock[+b.dataset.part];
        if (!x || !x.qty) return;
        x.qty--;
        var have = (j.parts || []).filter(function (q) { return q.partNo === x.partNo; })[0];
        if (have) have.qty++; else j.parts.push({ name: x.name, partNo: x.partNo, qty: 1, cost: x.cost, from: v.id });
        WS.audit(j, p.name, 'Used ' + x.name + ' from ' + v.name);
        save(x.name + ' on the job. ' + v.name + ' has ' + x.qty + ' left.');
      };
    });
    on('vaNoteSave', function () { j.van.note = $('vaNote').value.trim(); WS.audit(j, p.name, 'Note added'); save('Note saved.'); });
    on('vaMic', function () {
      var b = $('vaMic'), box = $('vaNote'), base = box.value ? box.value + ' ' : '';
      b.textContent = 'Listening...';
      WS.listen(function (s) { box.value = base + s; }, function (err) { b.textContent = 'Speak it'; if (err) WS.toast(err, 'bad'); });
    });
    on('vaExtra', function () { extra = { title: '', detail: '', hours: '1', price: '', photos: [] }; go({ name: 'extra', id: j.id }); });
    on('vaFinish', function () { signDrawn = false; go({ name: 'sign', id: j.id }); });
    // extra work
    if (view.name === 'extra') {
      var keep = function () { extra.title = $('exT').value; extra.detail = $('exD').value; extra.hours = $('exH').value; extra.price = $('exP').value; };
      ['exT', 'exD'].forEach(function (id) { $(id).oninput = keep; });
      ['exH', 'exP'].forEach(function (id) { $(id).onchange = function () { keep(); render(); }; });
      var eph = $('exPh');
      eph.onchange = function () { keep(); WS.readPhoto(eph.files && eph.files[0], function (url) { if (url) { extra.photos.push(url); render(); } }); };
      on('exSample', function () { keep(); extra.photos.push(WS.artSrc(sample({ notes: extra.title + ' ' + j.notes }))); render(); });
      on('exSend', function () {
        keep();
        if (!extra.title.trim()) { WS.toast('Say what you found.', 'bad'); return; }
        var a = { id: WS.uid('a'), jobId: j.id, operatorId: j.operatorId, vehicleId: j.vehicleId, raisedBy: p.name, raisedAt: now(),
          title: extra.title.trim(), detail: extra.detail.trim() || extra.title.trim(), estHours: parseFloat(extra.hours) || 1,
          parts: parseFloat(extra.price) ? [{ name: 'Parts for ' + extra.title.trim().toLowerCase(), qty: 1, cost: parseFloat(extra.price) }] : [],
          photos: extra.photos.slice(), status: 'Sent', sentAt: now(), decidedAt: '', decidedBy: '', channel: 'WhatsApp and email' };
        WS.state.approvals.push(a);
        j.photos = j.photos.concat(extra.photos);
        j.clockOns.forEach(function (c) { if (!c.end) c.end = now(); });
        j.status = 'waiting_auth';
        WS.audit(j, p.name, 'Found something else: ' + a.title + '. Sent to the customer to approve');
        WS.notify(o.contact + ', ' + o.name, 'WhatsApp and email', 'Extra work needs your OK', first(p.name) + ' has found ' + a.title.toLowerCase() + '. Photo and price are on your phone.', 'approval');
        extra = null;
        view = { name: 'job', id: j.id };
        save('Sent to ' + (o.contact || 'the customer') + '. You will see their answer here.');
      });
    }
    // signature
    if (view.name === 'sign') {
      var c = $('sgPad'), ctx = c.getContext('2d'), down = false, last = null;
      ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1B2433';
      var pos = function (e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
      c.addEventListener('pointerdown', function (e) { e.preventDefault(); down = true; last = pos(e); try { c.setPointerCapture(e.pointerId); } catch (x) { } });
      c.addEventListener('pointermove', function (e) {
        if (!down) return;
        var q = pos(e);
        ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        last = q;
        if (!signDrawn) { signDrawn = true; $('sgDone').disabled = false; }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { c.addEventListener(ev, function () { down = false; }); });
      on('sgClear', function () { ctx.clearRect(0, 0, c.width, c.height); signDrawn = false; $('sgDone').disabled = true; });
      on('sgDone', function () {
        var nm = $('sgName').value.trim();
        if (!nm) { WS.toast('Put in the name of who is signing.', 'bad'); return; }
        if (!signDrawn) { WS.toast('Ask them to sign in the box.', 'bad'); return; }
        j.clockOns.forEach(function (x) { if (!x.end) x.end = now(); });
        (j.tasks || []).forEach(function (t) { t.done = true; });
        j.van.summary = $('sgSum').value.trim();
        j.van.sign = { name: nm, at: now(), sig: c.toDataURL('image/png') };
        j.van.stage = 'done'; j.van.leftAt = now();
        j.status = 'done';
        WS.audit(j, p.name, 'Job done, parts used from ' + (v ? v.name : 'the van'));
        WS.audit(j, nm, 'Signed for the work on the engineer\'s phone');
        view = { name: 'job', id: j.id };
        save('Done. The office has it, ready to invoice.');
      });
    }
  }

  function wireFab() {
    var p = person();
    document.querySelectorAll('[data-build]').forEach(function (b) { b.onclick = function () { go({ name: 'build', id: b.dataset.build }); }; });
    on('vaBack', function () { go({ name: 'day' }); });
    var b = view.id ? WS.build(view.id) : null;
    if (!b) return;
    on('fbOn', function () {
      (WS.state.builds || []).forEach(function (x) { (x.labour || []).forEach(function (l) { if (l.who === p.name && l.start && l.hours == null) l.hours = Math.max(0.25, Math.round(WS.buildHours({ labour: [l] }) * 4) / 4); }); });
      b.labour.push({ stage: b.stage, who: p.name, date: T(), start: now() });
      WS.buildLog(b, p.name, 'Clocked on to ' + WS.stageName(b.stage).toLowerCase());
      save('On the clock for ' + b.no + '. The office can see it.');
    });
    on('fbOff', function () {
      var c = openClock(b);
      if (c) { c.hours = Math.max(0.25, Math.round(WS.buildHours({ labour: [c] }) * 4) / 4); }
      WS.buildLog(b, p.name, 'Clocked off ' + WS.stageName(b.stage).toLowerCase() + ', ' + WS.dur(c ? c.hours : 0));
      save(WS.dur(c ? c.hours : 0) + ' booked to ' + b.no + '.');
    });
    var addPh = function (src) {
      var cap = ($('fbCap').value || '').trim() || WS.stageShort(b.stage);
      b.photos.push({ stage: b.stage, src: /^data:/.test(src) ? src : '', art: /^data:/.test(src) ? '' : src, by: p.name, at: now(), caption: cap });
      WS.buildLog(b, p.name, 'Added a photo: ' + cap);
      save('Photo on the build file and the customer\'s tracker.');
    };
    var fp = $('fbPh');
    if (fp) fp.onchange = function () { WS.readPhoto(fp.files && fp.files[0], function (url) { if (url) addPh(url); }); };
    on('fbSample', function () { addPh('stage:' + b.stage + ':' + String(b.colour || '').replace('#', '')); });
    on('fbDone', function () {
      WS.buildLog(b, p.name, WS.stageName(b.stage) + ' done, ready for the next stage');
      WS.notify('Office', 'in app', b.no + ' stage done', p.name + ' says ' + WS.stageName(b.stage).toLowerCase() + ' is done on ' + b.no + '.', 'ready');
      save('The office has been told. They move it on.');
    });
  }

  /* ---------------- boot ---------------- */
  WS.initTheme();
  WS.load();
  WS.applyBrand();
  WS.watch();
  WS.onChange(function () {
    // never redraw under someone signing or typing
    if (view.name === 'sign' || view.name === 'extra') return;
    var a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) return;
    render();
  });
  render();
  ticker = setInterval(function () {
    var el = $('vaClock');
    if (el && view.id) { var j = WS.job(view.id); if (j) el.textContent = WS.dur(WS.hoursOn(j)); }
  }, 20000);
})();
