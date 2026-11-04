/* Fitter app. Phone first. Same browser storage as the office app, so the office
   sees a clock on within a few seconds. */
(function () {
  var $ = WS.$, esc = WS.esc;
  var me = null, view = 'jobs', jobId = null, pinBuf = '', pickFitter = null, openSec = {};

  WS.initTheme();
  WS.gate(function () {
    WS.load();
    WS.banner();
    $('app').hidden = false;
    try { me = WS.fitter(localStorage.getItem('wsDemo:fitter')) || null; } catch (e) { }
    WS.watch();
    WS.onChange(function () { if (view === 'jobs' || view === 'job') render(); });
    $('fOut').onclick = signOut;
    setInterval(tick, 1000);
    render();
  });

  function signOut() {
    me = null;
    try { localStorage.removeItem('wsDemo:fitter'); } catch (e) { }
    view = 'jobs';
    render();
  }

  function render() {
    var v = $('fview');
    $('fhead').hidden = !me;
    if (!me) { v.innerHTML = loginHtml(); wireLogin(); return; }
    $('fWho').textContent = me.name;
    var open = openJob();
    $('fSub').textContent = open ? 'clocked on to ' + (WS.vehicle(open.vehicleId) || {}).reg : me.role;
    if (view === 'job' && jobId) { v.innerHTML = jobHtml(); wireJob(); }
    else if (view === 'sheet' && jobId) { v.innerHTML = sheetHtml(); wireSheet(); }
    else { v.innerHTML = jobsHtml(); wireJobs(); }
    tick();
    window.scrollTo(0, 0);
  }

  /* ---------------- login ---------------- */
  function loginHtml() {
    var fitters = WS.state.settings.fitters;
    if (!pickFitter) {
      return '<div style="padding:26px 2px 10px;text-align:center">' +
        '<div class="logo" style="width:52px;height:52px;border-radius:14px;margin:0 auto 14px;font-size:19px">' + esc(WS.state.settings.initials || 'NC') + '</div>' +
        '<h1 style="margin-bottom:4px">' + esc(WS.state.settings.name) + '</h1>' +
        '<div class="muted sm" style="margin-bottom:22px">Tap your name to clock on</div></div>' +
        fitters.map(function (f) {
          return '<div class="fjob" data-pick="' + f.id + '"><div class="r1"><span class="rg" style="font-size:17px">' + esc(f.name) + '</span></div>' +
            '<div class="mk">' + esc(f.role) + '</div></div>';
        }).join('') +
        '<div class="card tight" style="margin-top:18px"><div class="hint"><b class="b">Demo PINs</b><br>' +
        fitters.map(function (f) { return esc(f.name) + ' · ' + esc(f.pin); }).join('<br>') + '</div></div>';
    }
    var f = WS.fitter(pickFitter);
    return '<div style="padding:22px 2px 6px;text-align:center">' +
      '<h1 style="margin-bottom:4px">' + esc(f.name) + '</h1>' +
      '<div class="muted sm">Enter your 4 digit PIN</div>' +
      '<div class="pindots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (pinBuf.length > i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="lockerr" id="fErr"></div></div>' +
      '<div class="pinpad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button data-k="back">←</button><button data-k="0">0</button><button data-k="clear">✕</button>' +
      '</div>' +
      '<button class="btn alt block" id="fBack" style="margin-top:16px">Not me</button>' +
      '<div class="hint" style="text-align:center;margin-top:12px">Demo PIN for ' + esc(f.name.split(' ')[0]) + ' is ' + esc(f.pin) + '</div>';
  }

  function wireLogin() {
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { pickFitter = b.dataset.pick; pinBuf = ''; render(); };
    });
    if ($('fBack')) $('fBack').onclick = function () { pickFitter = null; pinBuf = ''; render(); };
    document.querySelectorAll('.pinpad button').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k;
        if (k === 'back') pinBuf = pinBuf.slice(0, -1);
        else if (k === 'clear') pinBuf = '';
        else if (pinBuf.length < 4) pinBuf += k;
        if (pinBuf.length === 4) {
          var f = WS.fitter(pickFitter);
          if (f.pin === pinBuf) {
            me = f;
            try { localStorage.setItem('wsDemo:fitter', f.id); } catch (e) { }
            pickFitter = null; pinBuf = '';
            WS.toast('Morning ' + f.name.split(' ')[0] + '.', 'ok');
            render();
            return;
          }
          pinBuf = '';
          render();
          if ($('fErr')) $('fErr').textContent = 'That PIN is not right.';
          return;
        }
        render();
      };
    });
  }

  /* ---------------- my jobs ---------------- */
  function myJobs() {
    var T = WS.day(0);
    WS.dayPlan(me.id, T);
    return WS.state.jobs.filter(function (j) {
      return j.date === T && (j.fitterId === me.id || !j.fitterId) && j.status !== 'done';
    }).sort(function (a, b) {
      var mine = function (j) { return j.fitterId === me.id ? 0 : 1; };
      if (mine(a) !== mine(b)) return mine(a) - mine(b);
      return (a.order || 0) - (b.order || 0);
    });
  }
  function openJob() {
    var found = null;
    WS.state.jobs.forEach(function (j) {
      (j.clockOns || []).forEach(function (c) { if (c.fitterId === me.id && !c.end) found = j; });
    });
    return found;
  }

  function jobsHtml() {
    var list = myJobs(), open = openJob();
    var done = WS.state.jobs.filter(function (j) { return j.date === WS.day(0) && j.fitterId === me.id && (j.status === 'done' || j.status === 'qc'); });
    var plan = WS.dayPlan(me.id, WS.day(0));
    var planned = plan.reduce(function (s2, j) { return s2 + (j.estHours || 0); }, 0);
    var clocked = plan.reduce(function (s2, j) { return s2 + WS.hoursOn(j); }, 0);
    var cap = me.dayHours || 8;
    var capCls = planned > cap ? 'bad' : planned >= cap - 0.5 ? 'warn' : 'ok';
    return '<div class="phead" style="margin-bottom:14px"><div><h1>My day</h1>' +
      '<div class="sub">' + esc(WS.dayName(WS.day(0))) + ' · ' + list.length + ' to do' + (done.length ? ', ' + done.length + ' finished' : '') + '</div></div></div>' +
      '<div class="card tight" style="margin-bottom:14px">' +
      '<div class="inline"><span class="b">' + WS.hrs(planned) + ' planned</span>' +
      '<span class="muted sm">of ' + cap + 'h</span>' +
      '<span class="right b mono">' + WS.hhmm(clocked) + ' clocked</span></div>' +
      '<div class="cap"><i class="' + capCls + '" style="width:' + Math.min(100, planned / cap * 100) + '%"></i></div>' +
      (planned > cap ? '<div class="muted sm" style="margin-top:7px;color:var(--bad)">That is more than your day. Tell the office if it will not fit.</div>' : '') +
      '</div>' +
      (open ? '<div class="card tight" style="border-color:var(--brand);margin-bottom:14px">' +
        '<div class="muted sm">Clocked on to</div>' +
        '<div class="inline" style="margin-top:4px"><span class="rg" style="font-size:18px;font-weight:800">' + esc((WS.vehicle(open.vehicleId) || {}).reg) + '</span>' +
        '<span class="bigtimer right" id="hdrTimer" data-start="' + open.clockOns.filter(function (c) { return !c.end; })[0].start + '">00:00:00</span></div></div>' : '') +
      (list.length ? list.map(jobRow).join('') : '<div class="card"><div class="empty">Nothing left on your list today.</div></div>') +
      (done.length ? '<h3 style="margin:20px 0 10px" class="muted">Finished today</h3>' + done.map(jobRow).join('') : '');
  }

  function jobRow(j) {
    var v = WS.vehicle(j.vehicleId) || {}, o = WS.operator(j.operatorId) || {};
    var running = (j.clockOns || []).filter(function (c) { return !c.end; })[0];
    var h = WS.hoursOn(j), p = WS.jobProgress(j);
    var fill = Math.min(100, p.est ? p.actual / (p.est * 1.2) * 100 : 0);
    var barCls = p.state === 'over' ? 'bad' : p.state === 'close' ? 'warn' : running ? '' : 'ok';
    return '<div class="fjob" data-job="' + j.id + '">' +
      '<div class="r1">' +
      (j._planStart != null ? '<span class="muted sm mono">' + WS.clockHM(j._planStart) + '</span>' : '') +
      '<span class="rg">' + esc(v.reg || j.type) + '</span>' +
      '<span class="chip">' + esc(j.type) + '</span>' +
      (running ? '<span class="timer right" data-start="' + running.start + '">00:00:00</span>' : (h ? '<span class="muted sm right mono">' + WS.hhmm(h) + '</span>' : '<span class="muted sm right mono">' + WS.hrs(p.est) + '</span>')) + '</div>' +
      '<div class="mk">' + esc((v.make || '') + ' ' + (v.model || '')) + (o.name ? ' · ' + esc(o.name) : '') + '</div>' +
      (p.actual ? '<div class="bar" style="margin-top:9px"><i class="' + barCls + '" style="width:' + fill + '%"></i><u style="left:83.3%"></u></div>' +
        '<div class="muted sm" style="margin-top:5px">' + WS.hhmm(p.actual) + ' of ' + WS.hrs(p.est) +
        (p.state === 'over' ? ' <b style="color:var(--bad)">over by ' + WS.hhmm(p.over) + '</b>' : '') + '</div>' : '') +
      '<div class="r2"><span class="pill ' + WS.statusCls(j.status) + '">' + esc(WS.statusLabel(j.status)) + '</span>' +
      (j.bay ? '<span class="muted sm">' + esc(j.bay) + '</span>' : '<span class="muted sm">no bay yet</span>') +
      (j.priority === 'high' ? '<span class="chip bad">urgent</span>' : '') +
      (j.fitterId === me.id ? '' : '<span class="pill">spare job</span>') + '</div></div>';
  }

  function wireJobs() {
    document.querySelectorAll('[data-job]').forEach(function (c) {
      c.onclick = function () { jobId = c.dataset.job; view = 'job'; render(); };
    });
  }

  /* ---------------- job card ---------------- */
  function jobHtml() {
    var j = WS.job(jobId);
    if (!j) { view = 'jobs'; return jobsHtml(); }
    var v = WS.vehicle(j.vehicleId) || {}, o = WS.operator(j.operatorId) || {};
    var running = (j.clockOns || []).filter(function (c) { return c.fitterId === me.id && !c.end; })[0];
    var h = WS.hoursOn(j), prog = WS.jobProgress(j);
    var myAppr = WS.state.approvals.filter(function (a) { return a.jobId === j.id; });

    var tasks = (j.tasks || []).map(function (t) {
      return '<div class="task' + (t.done ? ' on' : '') + '" data-task="' + t.id + '"><div class="bx">✓</div><div class="tx">' + esc(t.text) + '</div></div>';
    }).join('') || '<div class="hint">No tasks on this one.</div>';

    var parts = (j.parts || []).map(function (p, i) {
      return '<div class="inline" style="padding:9px 0;border-bottom:1px solid var(--line)"><span class="b">' + esc(p.name) + '</span>' +
        '<span class="muted sm">x' + p.qty + '</span>' +
        '<button class="btn alt sm right" data-rmpart="' + i + '">Remove</button></div>';
    }).join('') || '<div class="hint">No parts used yet.</div>';

    var photos = '<div class="thumbs">' +
      (j.photos || []).map(function (p, i) { return '<img class="thumb" src="' + p + '" data-ph="' + i + '" alt="job photo">'; }).join('') +
      '<label class="addph">Add<br>photo<input type="file" accept="image/*" capture="environment" id="jPhoto" hidden></label></div>';

    return '<button class="btn alt sm" id="jBack" style="margin-bottom:14px">← My jobs</button>' +
      '<div class="card">' +
      '<div class="inline"><span class="rg" style="font-size:22px;font-weight:800">' + esc(v.reg) + '</span>' +
      '<span class="chip">' + esc(j.type) + '</span>' +
      '<span class="pill ' + WS.statusCls(j.status) + ' right">' + esc(WS.statusLabel(j.status)) + '</span></div>' +
      '<div class="muted sm" style="margin-top:5px">' + esc(v.make + ' ' + v.model) + ' · ' + esc(o.name || '') + '</div>' +
      '<div class="muted sm">' + esc(j.bay || 'no bay yet') + ' · job ' + esc(j.no) + '</div>' +
      (j.notes ? '<div style="margin-top:12px;padding:11px 12px;background:var(--soft);border-radius:10px;font-size:13.5px">' + esc(j.notes) + '</div>' : '') +
      '<div class="sep"></div>' +
      '<div class="inline"><div><div class="muted sm">Clocked on this job</div>' +
      '<div class="bigtimer" ' + (running ? 'data-start="' + running.start + '"' : '') + '>' + (running ? '00:00:00' : WS.hhmm(h)) + '</div></div>' +
      '<div class="right">' + (running
        ? '<button class="btn danger lg" id="jOff">Clock off</button>'
        : '<button class="btn lg" id="jOn">Clock on</button>') + '</div></div>' +
      '<div class="bar" style="margin-top:12px"><i class="' + (prog.state === 'over' ? 'bad' : prog.state === 'close' ? 'warn' : 'ok') + '" ' +
      'style="width:' + Math.min(100, prog.est ? prog.actual / (prog.est * 1.2) * 100 : 0) + '%"></i><u style="left:83.3%"></u></div>' +
      '<div class="muted sm" style="margin-top:6px">You are allowed <b>' + WS.hrs(prog.est) + '</b> for this one' +
      (prog.state === 'over' ? ' · <b style="color:var(--bad)">over by ' + WS.hhmm(prog.over) + '</b>' : prog.actual ? ' · ' + WS.hhmm(Math.max(0, prog.est - prog.actual)) + ' left' : '') + '</div>' +
      '</div>' +

      (j.type === 'PMI' || j.type === 'MOT prep' ? '<div class="card"><div class="ch"><h2>Inspection sheet</h2>' +
        (j.inspection && j.inspection.lockedAt ? '<span class="pill ok right">signed off</span>' : '') + '</div>' +
        '<div class="hint" style="margin-bottom:12px">DVSA safety inspection, brake test and sign off.</div>' +
        '<button class="btn block" id="jSheet">' + (j.inspection ? (j.inspection.lockedAt ? 'View the sheet' : 'Carry on with the sheet') : 'Start the inspection') + '</button></div>' : '') +

      '<div class="card"><h2>Tasks</h2><div class="sep" style="margin:10px 0"></div>' + tasks + '</div>' +

      '<div class="card"><h2>Parts used</h2><div class="sep" style="margin:10px 0"></div>' + parts +
      '<button class="btn alt block" id="jAddPart" style="margin-top:12px">Add a part</button></div>' +

      '<div class="card"><h2>Photos</h2><div class="sep" style="margin:10px 0"></div>' + photos + '</div>' +

      '<div class="card"><h2>Notes</h2><div class="sep" style="margin:10px 0"></div>' +
      '<div class="inline" style="align-items:flex-start"><textarea class="in" id="jNotes" placeholder="What you found, what you did">' + esc(j.fitterNotes || '') + '</textarea>' +
      (WS.speechOk() ? '<button class="mic" id="jMic" title="Speak the note" aria-label="Speak the note">🎤</button>' : '') + '</div>' +
      '<button class="btn alt block" id="jSaveNotes" style="margin-top:10px">Save notes</button></div>' +

      '<div class="card"><h2>Found something else wrong</h2><div class="sep" style="margin:10px 0"></div>' +
      (myAppr.length ? myAppr.map(function (a) {
        var t = WS.approvalTotals(a);
        return '<div class="' + (a.status === 'Approved' ? 'note' : a.status === 'Declined' ? 'flagbox' : 'flagbox') + '" style="margin-bottom:10px">' +
          '<b>' + esc(a.title) + '</b><br>' + WS.money(t.total) + ' inc VAT · ' +
          (a.status === 'Sent' ? 'waiting on the customer' : a.status === 'Approved' ? 'the customer said yes, crack on' : 'the customer said no, leave it') + '</div>';
      }).join('') : '<div class="hint" style="margin-bottom:12px">Take a photo, say what you have found and roughly how long it will take. ' +
        'The office sends it to the customer with the price. You get a yes or a no back on here.</div>') +
      '<button class="btn block" id="jExtra">Send extra work for authorisation</button></div>' +

      '<div class="card"><h2>Report a problem</h2><div class="sep" style="margin:10px 0"></div>' +
      '<div class="stack">' +
      '<button class="btn alt" data-prob="waiting_parts">Waiting on parts</button>' +
      '<button class="btn alt" data-prob="vor">Off the road (VOR)</button>' +
      '<button class="btn alt" id="jLib">Look something up</button>' +
      '</div></div>' +

      (j.status === 'done' || j.status === 'qc' ? '<div class="card"><div class="inline">' +
        '<span class="pill ok">sent to QC</span><span class="muted sm">the office has it</span></div></div>'
        : '<div class="fbar"><button class="btn danger" id="jProb2">Problem</button><button class="btn" id="jDone">Job done</button></div>');
  }

  function wireJob() {
    var j = WS.job(jobId);
    $('jBack').onclick = function () { view = 'jobs'; render(); };
    if ($('jOn')) $('jOn').onclick = function () { clockOn(j); };
    if ($('jOff')) $('jOff').onclick = function () { clockOff(j); };
    if ($('jSheet')) $('jSheet').onclick = function () { ensureSheet(j); view = 'sheet'; render(); };
    document.querySelectorAll('[data-task]').forEach(function (t) {
      t.onclick = function () {
        var task = j.tasks.filter(function (x) { return x.id === t.dataset.task; })[0];
        task.done = !task.done;
        WS.audit(j, me.name, (task.done ? 'Ticked' : 'Unticked') + ' task: ' + task.text);
        WS.save();
        render();
      };
    });
    document.querySelectorAll('[data-rmpart]').forEach(function (b) {
      b.onclick = function () {
        var p = j.parts.splice(+b.dataset.rmpart, 1)[0];
        WS.audit(j, me.name, 'Removed part: ' + p.name);
        WS.save();
        render();
      };
    });
    $('jAddPart').onclick = function () { addPart(j); };
    if ($('jExtra')) $('jExtra').onclick = function () { raiseExtra(j); };
    if ($('jLib')) $('jLib').onclick = function () { library(j); };
    wireMic('jNotes', 'jMic');
    $('jSaveNotes').onclick = function () {
      j.fitterNotes = $('jNotes').value;
      WS.audit(j, me.name, 'Notes updated');
      WS.save();
      WS.toast('Notes saved.', 'ok');
    };
    var ph = $('jPhoto');
    if (ph) ph.onchange = function () {
      readPhoto(ph.files[0], function (url) {
        j.photos = j.photos || [];
        j.photos.push(url);
        WS.audit(j, me.name, 'Added a photo');
        WS.save();
        render();
      });
    };
    document.querySelectorAll('[data-prob]').forEach(function (b) {
      b.onclick = function () { problem(j, b.dataset.prob); };
    });
    if ($('jProb2')) $('jProb2').onclick = function () { problem(j, 'waiting_parts'); };
    if ($('jDone')) $('jDone').onclick = function () { finish(j); };
  }

  function clockOn(j) {
    var prev = openJob();
    if (prev && prev.id !== j.id) {
      prev.clockOns.forEach(function (c) { if (c.fitterId === me.id && !c.end) c.end = WS.nowStamp(); });
      WS.audit(prev, me.name, 'Clocked off (moved to ' + (WS.vehicle(j.vehicleId) || {}).reg + ')');
      WS.toast('Clocked off ' + (WS.vehicle(prev.vehicleId) || {}).reg + '.', '');
    }
    j.clockOns = j.clockOns || [];
    j.clockOns.push({ fitterId: me.id, start: WS.nowStamp(), end: '' });
    if (!j.fitterId) j.fitterId = me.id;
    if (j.status === 'booked' || j.status === 'in_bay') j.status = 'in_progress';
    WS.audit(j, me.name, 'Clocked on');
    WS.save();
    WS.toast('Clocked on to ' + (WS.vehicle(j.vehicleId) || {}).reg + '.', 'ok');
    render();
  }

  function clockOff(j) {
    j.clockOns.forEach(function (c) { if (c.fitterId === me.id && !c.end) c.end = WS.nowStamp(); });
    WS.audit(j, me.name, 'Clocked off');
    WS.save();
    WS.toast('Clocked off.', 'ok');
    render();
  }

  function addPart(j) {
    var opts = WS.state.stock.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name + ' · bin ' + s.bin + ' · ' + s.qty + ' left') + '</option>';
    }).join('');
    sheet('Add a part',
      '<label class="f"><span class="lb">Off the shelf</span><select class="in" id="pSel"><option value="">Pick a part</option>' + opts + '</select></label>' +
      '<div id="pFlag"></div>' +
      '<label class="f"><span class="lb">Or type it</span><input class="in" id="pName" placeholder="Part name"></label>' +
      '<label class="f"><span class="lb">How many</span><input class="in" id="pQty" type="number" value="1" min="1"></label>',
      'Add', function () {
        var sel = $('pSel'), typed = $('pName').value.trim();
        var item = WS.stockItem(sel.value);
        var name = typed || (item ? item.name : '');
        if (!name) { WS.toast('Pick or type a part.', 'bad'); return false; }
        var qty = +$('pQty').value || 1;
        var cost = !typed && item ? item.cost : 0;
        if (!typed && item) item.qty = Math.max(0, item.qty - qty);
        j.parts = j.parts || [];
        j.parts.push({ name: name, partNo: !typed && item ? item.partNo : '', qty: qty, cost: cost });
        WS.audit(j, me.name, 'Used ' + qty + ' x ' + name);
        WS.save();
        render();
      });
    var sel = $('pSel');
    if (sel) sel.onchange = function () {
      var f = $('pFlag'); f.innerHTML = '';
      var it = WS.stockItem(sel.value);
      if (!it) return;
      if (it.qty <= 0) f.innerHTML = '<div class="flagbox">None on the shelf. The office will put it on order.</div>';
      else if (it.qty <= it.min) f.innerHTML = '<div class="flagbox">Last ' + it.qty + '. The office gets told to reorder.</div>';
      var w = WS.warrantyFlag(j.vehicleId, it.name);
      if (w) f.innerHTML += '<div class="note" style="margin-top:8px"><b>Warranty.</b> We fitted one of these ' + w.monthsAgo +
        ' months ago on ' + esc(w.job.no) + '. Tell the office before you charge it.</div>';
    };
  }

  /* extra work found: the office sends it to the customer with a price */
  function raiseExtra(j) {
    var v = WS.vehicle(j.vehicleId) || {}, o = WS.operator(j.operatorId) || {};
    var rc = WS.rateFor(j.operatorId);
    sheet('Extra work on ' + (v.reg || j.no),
      '<div class="hint" style="margin-bottom:12px">This goes to ' + esc(o.contact || 'the customer') + ' with your photos and a price. ' +
      'The job waits until they answer, so nobody can say you did work they never asked for.</div>' +
      '<label class="f"><span class="lb">What have you found</span><input class="in" id="xT" placeholder="Nearside front discs below limit"></label>' +
      '<label class="f"><span class="lb">What you can see</span>' +
      '<div class="inline" style="align-items:flex-start"><textarea class="in" id="xD" placeholder="Scored past the wear groove, pads down to 3 mm"></textarea>' +
      (WS.speechOk() ? '<button class="mic" id="xMic" aria-label="Speak it">🎤</button>' : '') + '</div></label>' +
      '<label class="f"><span class="lb">Photo of it</span><div class="thumbs" id="xPh">' +
      '<label class="addph">Add<br>photo<input type="file" accept="image/*" capture="environment" id="xFile" hidden></label></div></label>' +
      '<label class="f"><span class="lb">Extra time you need</span><input class="in" id="xH" type="number" step="0.25" min="0.25" value="2"></label>' +
      '<label class="f"><span class="lb">Parts needed</span><select class="in" id="xP"><option value="">None</option>' +
      WS.state.stock.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span class="lb">How many</span><input class="in" id="xQ" type="number" min="1" value="1"></label>' +
      '<div class="money" id="xT2"></div>',
      'Send it to the office', function () {
        var title = $('xT').value.trim();
        if (!title) { WS.toast('Say what you have found.', 'bad'); return false; }
        var parts = [];
        var sp = WS.stockItem($('xP').value);
        if (sp) parts.push({ name: sp.name, qty: +$('xQ').value || 1, cost: sp.cost });
        var a = {
          id: WS.uid('a'), jobId: j.id, operatorId: j.operatorId, vehicleId: j.vehicleId,
          raisedBy: me.name, raisedAt: WS.nowStamp(), title: title, detail: $('xD').value,
          estHours: parseFloat($('xH').value) || 1, parts: parts, photos: xPhotos.slice(),
          status: 'Sent', sentAt: WS.nowStamp(), decidedAt: '', decidedBy: '', channel: WS.channels()
        };
        WS.state.approvals.push(a);
        j.status = 'waiting_auth';
        WS.audit(j, me.name, 'Found extra work and sent it for authorisation: ' + title);
        var t = WS.approvalTotals(a);
        WS.notify((o.contact ? o.contact + ', ' + o.name : 'the operator'), WS.channels(), 'Extra work needs your OK',
          'We have found something on ' + (v.reg || 'your vehicle') + ': ' + title + '. ' + WS.money(t.total) +
          ' inc VAT. Photos and the price are on your portal.', 'approval');
        WS.save();
        WS.toast('Sent. The office has it and the customer has been messaged.', 'ok');
        render();
      });
    var xPhotos = [];
    wireMic('xD', 'xMic');
    var ff = $('xFile');
    if (ff) ff.onchange = function () {
      readPhoto(ff.files[0], function (url) {
        if (!url) return;
        xPhotos.push(url);
        var img = document.createElement('img');
        img.className = 'thumb'; img.src = url; img.alt = 'Extra work photo';
        $('xPh').insertBefore(img, $('xPh').firstChild);
      });
    };
    function calc() {
      var sp = WS.stockItem($('xP').value);
      var hrs = parseFloat($('xH').value) || 0, qty = +$('xQ').value || 1;
      var lab = hrs * rc.rate, pt = sp ? sp.cost * qty * (1 + rc.markup / 100) : 0;
      var net = lab + pt, vat = net * WS.state.settings.vat / 100;
      $('xT2').innerHTML = '<div><span>Labour ' + WS.hrs(hrs) + '</span><b>' + WS.money(lab) + '</b></div>' +
        '<div><span>Parts</span><b>' + WS.money(pt) + '</b></div>' +
        '<div class="g"><span>They will be asked to approve</span><span>' + WS.money(net + vat) + '</span></div>';
    }
    ['xH', 'xP', 'xQ'].forEach(function (id) { var e = $(id); if (e) { e.oninput = calc; e.onchange = calc; } });
    calc();
  }

  /* the technical library, on the phone, where the fitter actually needs it */
  function library(j) {
    var v = WS.vehicle(j.vehicleId) || {};
    var mine = WS.state.library.filter(function (l) {
      return l.applies === 'All' || l.applies === v.make || l.applies === v.type;
    });
    var rest = WS.state.library.filter(function (l) { return mine.indexOf(l) < 0; });
    sheet('Technical library',
      '<div class="hint" style="margin-bottom:12px">Torque settings, schedules and procedures. ' +
      (v.make ? 'Showing what applies to this ' + esc(v.make) + ' first.' : '') + '</div>' +
      mine.concat(rest).map(function (l) {
        return '<div class="card tight" style="margin-bottom:10px"><div class="b">' + esc(l.title) + '</div>' +
          '<div class="muted sm" style="margin:3px 0 7px">' + esc(l.kind) + ' · ' + esc(l.applies) + '</div>' +
          '<div class="hint">' + esc(l.body) + '</div></div>';
      }).join(''), null, null);
  }

  /* speak a note instead of typing it with oily hands */
  function wireMic(fieldId, micId) {
    var mic = $(micId), fld = $(fieldId);
    if (!mic || !fld) return;
    var rec = null;
    mic.onclick = function () {
      if (rec) { try { rec.stop(); } catch (e) { } rec = null; mic.classList.remove('on'); return; }
      var base = fld.value ? fld.value.trim() + ' ' : '';
      mic.classList.add('on');
      rec = WS.listen(function (text) {
        fld.value = base + text;
      }, function (err) {
        mic.classList.remove('on');
        rec = null;
        if (err) WS.toast(err, 'bad');
      });
    };
  }

  function problem(j, kind) {
    var titles = { waiting_parts: 'Waiting on parts', vor: 'Off the road (VOR)' };
    sheet(titles[kind],
      '<label class="f"><span class="lb">What is the problem</span><textarea class="in" id="prNote" placeholder="' +
      (kind === 'waiting_parts' ? 'Which part, who it is on order with' : 'Why it cannot go out') + '"></textarea></label>',
      'Send to the office', function () {
        var note = $('prNote').value.trim();
        if (!note) { WS.toast('Put a line in so the office knows.', 'bad'); return false; }
        if (kind === 'vor') {
          var v = WS.vehicle(j.vehicleId);
          v.vor = true;
          v.notes = note;
          j.status = 'waiting_parts';
        } else if (kind === 'waiting_parts') {
          j.status = 'waiting_parts';
        }
        j.notes = (j.notes ? j.notes + '\n' : '') + me.name + ': ' + note;
        WS.audit(j, me.name, 'Reported ' + titles[kind].toLowerCase() + ': ' + note);
        WS.save();
        WS.toast('Sent to the office.', 'ok');
        render();
      });
  }

  function finish(j) {
    if (j.type === 'PMI' && (!j.inspection || !j.inspection.lockedAt)) {
      WS.toast('Finish and sign off the inspection sheet first.', 'bad');
      return;
    }
    var undone = (j.tasks || []).filter(function (t) { return !t.done; }).length;
    if (undone && !confirm(undone + ' task' + (undone > 1 ? 's are' : ' is') + ' still unticked. Send it to QC anyway?')) return;
    j.clockOns.forEach(function (c) { if (c.fitterId === me.id && !c.end) c.end = WS.nowStamp(); });
    j.status = 'qc';
    WS.audit(j, me.name, 'Job marked done, sent to QC');
    WS.save();
    WS.toast('Sent to QC. Nice one.', 'ok');
    view = 'jobs';
    render();
  }

  /* ---------------- inspection sheet ---------------- */
  function ensureSheet(j) {
    if (j.inspection) return;
    var v = WS.vehicle(j.vehicleId) || {}, o = WS.operator(j.operatorId) || {};
    j.inspection = {
      header: { operator: o.name || '', date: WS.day(0), odometer: v.odometer || 0, inspector: me.name },
      sections: WS.state.template.map(function (s) {
        return {
          id: s.id, name: s.name,
          items: s.items.map(function (nm) { return { name: nm, state: '', note: '', photo: '', rectBy: '', rectAt: '' }; })
        };
      }),
      brake: { method: 'Roller brake test', laden: 'Laden', service: '', secondary: '', parking: '', photo: '' },
      retorque: { done: false, at: '', km: v.odometer || 0 },
      sign: { inspector: { name: '', at: '', sig: '' }, declare: { name: '', at: '', sig: '' } },
      lockedAt: ''
    };
    WS.audit(j, me.name, 'Started the PMI inspection sheet');
    WS.save();
  }

  function sheetHtml() {
    var j = WS.job(jobId), i = j.inspection, v = WS.vehicle(j.vehicleId) || {};
    var locked = !!i.lockedAt;
    var total = 0, done = 0, defects = 0;
    i.sections.forEach(function (s) {
      s.items.forEach(function (it) { total++; if (it.state) done++; if (it.state === 'D') defects++; });
    });

    var secs = i.sections.map(function (s, si) {
      var sDone = s.items.filter(function (it) { return it.state; }).length;
      var sBad = s.items.filter(function (it) { return it.state === 'D'; }).length;
      var open = openSec[s.id];
      return '<div class="isec"><div class="sh" data-sec="' + s.id + '">' + esc(s.name) +
        '<span class="cnt">' + (sBad ? '<span class="chip bad">' + sBad + ' defect</span> ' : '') + sDone + '/' + s.items.length + '</span></div>' +
        (open ? s.items.map(function (it, ii) {
          return '<div class="iitem">' +
            '<div class="nm">' + esc(it.name) + '</div>' +
            '<div class="sw">' +
            '<button class="s' + (it.state === 'S' ? ' on' : '') + '" data-set="' + si + '|' + ii + '|S"' + (locked ? ' disabled' : '') + '>S</button>' +
            '<button class="d' + (it.state === 'D' ? ' on' : '') + '" data-set="' + si + '|' + ii + '|D"' + (locked ? ' disabled' : '') + '>Defect</button>' +
            '<button class="n' + (it.state === 'N/A' ? ' on' : '') + '" data-set="' + si + '|' + ii + '|N/A"' + (locked ? ' disabled' : '') + '>N/A</button>' +
            '</div>' +
            (it.state === 'D' ? '<div class="dnote">' +
              '<textarea class="in" data-note="' + si + '|' + ii + '" placeholder="What is wrong"' + (locked ? ' disabled' : '') + '>' + esc(it.note) + '</textarea>' +
              '<div class="inline" style="margin-top:8px">' +
              (it.photo ? '<img class="thumb" src="' + it.photo + '" alt="defect photo">' : '') +
              (locked ? '' : '<label class="btn alt sm">Add photo<input type="file" accept="image/*" capture="environment" data-dph="' + si + '|' + ii + '" hidden></label>') +
              '</div>' +
              '<div class="row" style="margin-top:8px">' +
              '<label class="f" style="margin:0"><span class="lb">Rectified by</span><input class="in" data-rb="' + si + '|' + ii + '" value="' + esc(it.rectBy) + '"' + (locked ? ' disabled' : '') + '></label>' +
              '<label class="f" style="margin:0"><span class="lb">Date</span><input class="in" type="date" data-ra="' + si + '|' + ii + '" value="' + esc(it.rectAt) + '"' + (locked ? ' disabled' : '') + '></label>' +
              '</div></div>' : '') +
            '</div>';
        }).join('') : '') + '</div>';
    }).join('');

    var sigBox = function (which, s) {
      if (s.sig) {
        return '<div class="sigbox sigdone" style="padding:8px"><img class="sigimg" src="' + s.sig + '" alt="signature"></div>' +
          '<div class="sm b" style="margin-top:6px">' + esc(s.name) + '</div>' +
          '<div class="muted sm">' + esc(WS.whenUK(s.at)) + '</div>';
      }
      if (locked) return '<div class="hint">Not signed.</div>';
      return '<input class="in" data-signame="' + which + '" placeholder="Full name" value="' + esc(s.name) + '" style="margin-bottom:8px">' +
        '<div class="sigbox"><canvas data-sig="' + which + '"></canvas><div class="ph">Sign here</div></div>' +
        '<div class="inline" style="margin-top:8px"><button class="btn alt sm" data-sigclear="' + which + '">Clear</button>' +
        '<button class="btn sm" data-sigsave="' + which + '">Save signature</button></div>';
    };

    return '<button class="btn alt sm" id="sBack" style="margin-bottom:14px">← Job card</button>' +
      '<div class="card"><div class="inline"><h2>PMI inspection</h2>' +
      (locked ? '<span class="pill ok right">locked</span>'
        : '<span class="pill ' + (done === total ? 'ok' : 'warn') + ' right">' + done + '/' + total + '</span>') + '</div>' +
      '<div class="muted sm" style="margin-top:4px">' + esc(v.reg + ' · ' + v.make + ' ' + v.model) + '</div>' +
      '<div class="sep" style="margin:12px 0"></div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Operator</span><input class="in" id="iOp" value="' + esc(i.header.operator) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '<label class="f"><span class="lb">Date</span><input class="in" type="date" id="iDate" value="' + esc(i.header.date) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '</div><div class="row">' +
      '<label class="f"><span class="lb">Odometer (km)</span><input class="in" type="number" id="iOdo" value="' + (i.header.odometer || 0) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '<label class="f"><span class="lb">Inspector</span><input class="in" id="iInsp" value="' + esc(i.header.inspector) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '</div></div>' +

      '<div class="card"><h2>Checks</h2>' +
      '<div class="hint" style="margin:6px 0 12px">Serviceable, Defect or N/A on every item. Tap a section to open it.</div>' +
      secs +
      (defects ? '<div class="inline" style="margin-top:10px"><span class="pill bad">' + defects + ' defect' + (defects > 1 ? 's' : '') + ' raised</span></div>' : '') +
      '</div>' +

      '<div class="card"><h2>Brake performance</h2>' +
      '<div class="hint" style="margin:6px 0 12px">Recorded at every safety inspection.</div>' +
      '<div class="row">' +
      '<label class="f"><span class="lb">Method</span><select class="in" id="bMethod"' + (locked ? ' disabled' : '') + '>' +
      ['Roller brake test', 'Decelerometer', 'EBPMS'].map(function (m) { return '<option' + (i.brake.method === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span class="lb">Condition</span><select class="in" id="bLaden"' + (locked ? ' disabled' : '') + '>' +
      ['Laden', 'Unladen'].map(function (m) { return '<option' + (i.brake.laden === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
      '</div><div class="row">' +
      '<label class="f"><span class="lb">Service %</span><input class="in" type="number" id="bServ" value="' + esc(i.brake.service) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '<label class="f"><span class="lb">Secondary %</span><input class="in" type="number" id="bSec" value="' + esc(i.brake.secondary) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '<label class="f"><span class="lb">Parking %</span><input class="in" type="number" id="bPark" value="' + esc(i.brake.parking) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '</div>' +
      '<div class="hint">Minimums: service 50%, secondary 25%, parking 16%.</div>' +
      '<div class="inline" style="margin-top:10px">' +
      (i.brake.photo ? '<img class="thumb" src="' + i.brake.photo + '" alt="brake printout">' : '') +
      (locked ? '' : '<label class="btn alt sm">Attach the printout<input type="file" accept="image/*" capture="environment" id="bPhoto" hidden></label>') +
      '</div></div>' +

      '<div class="card"><h2>Wheel re torque</h2>' +
      '<div class="task' + (i.retorque.done ? ' on' : '') + '" id="rtTick"><div class="bx">✓</div>' +
      '<div class="tx">Wheel nuts re torqued and recorded</div></div>' +
      (i.retorque.done ? '<div class="muted sm" style="margin-top:8px">' + esc(WS.dateUK(i.retorque.at)) + ' at ' + (+i.retorque.km || 0).toLocaleString('en-GB') + ' km</div>' : '') +
      '</div>' +

      '<div class="card"><h2>Sign off</h2>' +
      '<div class="hint" style="margin:6px 0 14px">Two signatures: the person who inspected it, then the person declaring it roadworthy. Locked afterwards.</div>' +
      '<h3 style="margin-bottom:8px">Inspected by</h3>' + sigBox('inspector', i.sign.inspector) +
      '<div class="sep"></div>' +
      '<h3 style="margin-bottom:8px">Roadworthiness declared by</h3>' + sigBox('declare', i.sign.declare) +
      (locked ? '<div class="inline" style="margin-top:14px"><span class="pill ok">Locked ' + esc(WS.whenUK(i.lockedAt)) + '</span>' +
        '<span class="muted sm">kept on file for 15 months</span></div>'
        : '<button class="btn block lg" id="sLock" style="margin-top:16px">Complete and lock the sheet</button>') +
      '</div>';
  }

  function wireSheet() {
    var j = WS.job(jobId), i = j.inspection, locked = !!i.lockedAt;
    $('sBack').onclick = function () { view = 'job'; render(); };
    document.querySelectorAll('[data-sec]').forEach(function (h) {
      h.onclick = function () { openSec[h.dataset.sec] = !openSec[h.dataset.sec]; render(); };
    });
    if (locked) return;

    var save = function (what) { WS.audit(j, me.name, what); WS.save(); };
    $('iOp').onchange = function () { i.header.operator = this.value; save('Inspection header updated'); };
    $('iDate').onchange = function () { i.header.date = this.value; save('Inspection header updated'); };
    $('iOdo').onchange = function () { i.header.odometer = +this.value || 0; save('Odometer recorded'); };
    $('iInsp').onchange = function () { i.header.inspector = this.value; save('Inspection header updated'); };

    document.querySelectorAll('[data-set]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.set.split('|'), it = i.sections[+p[0]].items[+p[1]];
        it.state = p[2];
        if (p[2] !== 'D') { it.note = ''; it.photo = ''; it.rectBy = ''; it.rectAt = ''; }
        else { it.rectBy = it.rectBy || me.name; it.rectAt = it.rectAt || WS.day(0); }
        WS.audit(j, me.name, it.name + ' marked ' + (p[2] === 'S' ? 'serviceable' : p[2] === 'D' ? 'a defect' : 'not applicable'));
        WS.save();
        render();
      };
    });
    document.querySelectorAll('[data-note]').forEach(function (t) {
      t.onchange = function () {
        var p = t.dataset.note.split('|');
        i.sections[+p[0]].items[+p[1]].note = t.value;
        save('Defect note updated');
      };
    });
    document.querySelectorAll('[data-rb]').forEach(function (t) {
      t.onchange = function () { var p = t.dataset.rb.split('|'); i.sections[+p[0]].items[+p[1]].rectBy = t.value; save('Rectification updated'); };
    });
    document.querySelectorAll('[data-ra]').forEach(function (t) {
      t.onchange = function () { var p = t.dataset.ra.split('|'); i.sections[+p[0]].items[+p[1]].rectAt = t.value; save('Rectification updated'); };
    });
    document.querySelectorAll('[data-dph]').forEach(function (inp) {
      inp.onchange = function () {
        var p = inp.dataset.dph.split('|');
        readPhoto(inp.files[0], function (url) {
          i.sections[+p[0]].items[+p[1]].photo = url;
          save('Defect photo added');
          render();
        });
      };
    });

    $('bMethod').onchange = function () { i.brake.method = this.value; save('Brake test updated'); };
    $('bLaden').onchange = function () { i.brake.laden = this.value; save('Brake test updated'); };
    $('bServ').onchange = function () { i.brake.service = +this.value || ''; save('Brake figures recorded'); };
    $('bSec').onchange = function () { i.brake.secondary = +this.value || ''; save('Brake figures recorded'); };
    $('bPark').onchange = function () { i.brake.parking = +this.value || ''; save('Brake figures recorded'); };
    if ($('bPhoto')) $('bPhoto').onchange = function () {
      var inp = this;
      readPhoto(inp.files[0], function (url) { i.brake.photo = url; save('Brake printout attached'); render(); });
    };

    $('rtTick').onclick = function () {
      i.retorque.done = !i.retorque.done;
      i.retorque.at = i.retorque.done ? WS.day(0) : '';
      i.retorque.km = (WS.vehicle(j.vehicleId) || {}).odometer || 0;
      save('Wheel re torque ' + (i.retorque.done ? 'recorded' : 'cleared'));
      render();
    };

    document.querySelectorAll('[data-sig]').forEach(function (cv) { initPad(cv); });
    document.querySelectorAll('[data-sigclear]').forEach(function (b) {
      b.onclick = function () {
        var cv = document.querySelector('[data-sig="' + b.dataset.sigclear + '"]');
        var c = cv.getContext('2d');
        c.clearRect(0, 0, cv.width, cv.height);
        cv.dataset.drawn = '';
        cv.parentNode.querySelector('.ph').style.display = '';
      };
    });
    document.querySelectorAll('[data-sigsave]').forEach(function (b) {
      b.onclick = function () {
        var which = b.dataset.sigsave;
        var cv = document.querySelector('[data-sig="' + which + '"]');
        var nameIn = document.querySelector('[data-signame="' + which + '"]');
        if (!nameIn.value.trim()) return WS.toast('Put the name in first.', 'bad');
        if (!cv.dataset.drawn) return WS.toast('Sign in the box first.', 'bad');
        i.sign[which] = { name: nameIn.value.trim(), at: WS.nowStamp(), sig: cv.toDataURL('image/png') };
        save((which === 'inspector' ? 'Inspector' : 'Roadworthiness') + ' signature captured: ' + nameIn.value.trim());
        WS.toast('Signature saved.', 'ok');
        render();
      };
    });

    $('sLock').onclick = function () {
      var missing = 0;
      i.sections.forEach(function (s) { s.items.forEach(function (it) { if (!it.state) missing++; }); });
      if (missing) return WS.toast(missing + ' item' + (missing > 1 ? 's are' : ' is') + ' not set yet.', 'bad');
      if (i.brake.service === '' || i.brake.secondary === '' || i.brake.parking === '') {
        if (!i.brake.photo) return WS.toast('Put the brake figures in, or attach the printout.', 'bad');
      }
      if (!i.sign.inspector.sig || !i.sign.declare.sig) return WS.toast('Both signatures are needed.', 'bad');
      i.lockedAt = WS.nowStamp();
      j.defects = [];
      i.sections.forEach(function (s) {
        s.items.forEach(function (it) {
          if (it.state === 'D') j.defects.push({ item: it.name, note: it.note, rectBy: it.rectBy, rectAt: it.rectAt, photo: it.photo });
        });
      });
      var v = WS.vehicle(j.vehicleId);
      if (v) {
        v.lastPmi = i.header.date;
        var nx = WS.parse(i.header.date);
        nx.setDate(nx.getDate() + (v.pmiWeeks || 6) * 7);
        v.nextPmi = WS.iso(nx);
        if (i.header.odometer) v.odometer = +i.header.odometer;
        v.brakeTest = i.header.date;
      }
      WS.audit(j, me.name, 'Inspection signed off and locked');
      WS.save();
      WS.toast('Sheet signed off and locked.', 'ok');
      render();
    };
  }

  function initPad(cv) {
    var rect = cv.getBoundingClientRect();
    cv.width = Math.max(300, Math.floor(rect.width));
    cv.height = 150;
    var c = cv.getContext('2d');
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#111';
    var drawing = false, last = null;
    function pos(e) {
      var r = cv.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (cv.width / r.width), y: (t.clientY - r.top) * (cv.height / r.height) };
    }
    function start(e) {
      e.preventDefault();
      drawing = true;
      last = pos(e);
      cv.dataset.drawn = '1';
      var ph = cv.parentNode.querySelector('.ph');
      if (ph) ph.style.display = 'none';
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      c.beginPath();
      c.moveTo(last.x, last.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      last = p;
    }
    function end() { drawing = false; }
    cv.addEventListener('mousedown', start);
    cv.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    cv.addEventListener('touchstart', start, { passive: false });
    cv.addEventListener('touchmove', move, { passive: false });
    cv.addEventListener('touchend', end);
  }

  /* ---------------- photos ---------------- */
  function readPhoto(file, cb) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 720, w = img.width, h = img.height;
        if (w > max || h > max) { var s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', 0.62));
      };
      img.onerror = function () { WS.toast('That image would not open.', 'bad'); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ---------------- bottom sheet modal ---------------- */
  function sheet(title, body, okLabel, onOk) {
    var mask = WS.el('div', 'mask');
    mask.innerHTML = '<div class="modal"><div class="mh"><h2>' + esc(title) + '</h2><button class="x">&times;</button></div>' +
      '<div class="mb">' + body + '</div>' +
      '<div class="mf"><button class="btn alt" data-close>' + (okLabel ? 'Cancel' : 'Close') + '</button>' +
      (okLabel ? '<button class="btn" id="shOk">' + esc(okLabel) + '</button>' : '') + '</div></div>';
    document.body.appendChild(mask);
    document.body.style.overflow = 'hidden';
    var close = function () { mask.remove(); document.body.style.overflow = ''; };
    mask.querySelector('.x').onclick = close;
    mask.querySelector('[data-close]').onclick = close;
    mask.onclick = function (e) { if (e.target === mask) close(); };
    if ($('shOk')) $('shOk').onclick = function () { if (onOk() !== false) close(); };
  }

  /* ---------------- running timers ---------------- */
  function tick() {
    document.querySelectorAll('[data-start]').forEach(function (el) {
      el.textContent = WS.hms(Date.now() - new Date(el.dataset.start).getTime());
    });
  }
})();
