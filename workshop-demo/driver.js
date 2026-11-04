/* Driver app: the first use walkaround check. A defect here lands on the workshop
   board before the driver has put the kettle on. */
(function () {
  var $ = WS.$, esc = WS.esc;
  var me = null, view = 'home', pick = null, pinBuf = '', draft = null, openSec = {};

  WS.initTheme();
  WS.gate(function () {
    WS.load();
    WS.applyBrand();
    WS.banner();
    $('app').hidden = false;
    try { me = WS.driver(localStorage.getItem('wsDemo:driver')) || null; } catch (e) { }
    WS.watch();
    WS.onChange(function () { if (view === 'home') render(); });
    $('dOut').onclick = function () {
      me = null; draft = null; view = 'home';
      try { localStorage.removeItem('wsDemo:driver'); } catch (e) { }
      render();
    };
    render();
  });

  function render() {
    var v = $('dview');
    $('dhead').hidden = !me;
    if (!me) { v.innerHTML = loginHtml(); wireLogin(); return; }
    $('dWho').textContent = me.name;
    var veh = WS.vehicle(me.vehicleId);
    $('dSub').textContent = veh ? veh.reg + ' · ' + veh.make + ' ' + veh.model : 'Driver check';
    if (view === 'check') { v.innerHTML = checkHtml(); wireCheck(); }
    else { v.innerHTML = homeHtml(); wireHome(); }
    window.scrollTo(0, 0);
  }

  /* ---------------- sign in ---------------- */
  function loginHtml() {
    var ds = WS.state.drivers;
    if (!pick) {
      return '<div style="padding:26px 2px 10px;text-align:center">' +
        '<div class="logo" style="width:52px;height:52px;border-radius:14px;margin:0 auto 14px;font-size:19px">' +
        esc(WS.state.settings.initials || 'NC') + '</div>' +
        '<h1 style="margin-bottom:4px">Driver check</h1>' +
        '<div class="muted sm" style="margin-bottom:22px">Tap your name to start today\'s walkaround</div></div>' +
        ds.map(function (d) {
          var v = WS.vehicle(d.vehicleId) || {}, o = WS.operator(d.operatorId) || {};
          var done = WS.state.checks.some(function (c) { return c.driverId === d.id && c.date === WS.day(0); });
          return '<div class="fjob" data-pick="' + d.id + '"><div class="r1">' +
            '<span class="rg" style="font-size:17px">' + esc(d.name) + '</span>' +
            (done ? '<span class="pill ok right">done today</span>' : '<span class="pill warn right">not done</span>') + '</div>' +
            '<div class="mk">' + esc(v.reg || '') + ' · ' + esc(o.name || '') + '</div></div>';
        }).join('') +
        '<div class="card tight" style="margin-top:18px"><div class="hint"><b class="b">Demo PINs</b><br>' +
        ds.map(function (d) { return esc(d.name) + ' · ' + esc(d.pin); }).join('<br>') + '</div></div>';
    }
    var d = WS.driver(pick);
    return '<div style="padding:22px 2px 6px;text-align:center">' +
      '<h1 style="margin-bottom:4px">' + esc(d.name) + '</h1>' +
      '<div class="muted sm">Enter your 4 digit PIN</div>' +
      '<div class="pindots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (pinBuf.length > i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="lockerr" id="dErr"></div></div>' +
      '<div class="pinpad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button data-k="back">←</button><button data-k="0">0</button><button data-k="clear">✕</button></div>' +
      '<button class="btn alt block" id="dBack" style="margin-top:16px">Not me</button>' +
      '<div class="hint" style="text-align:center;margin-top:12px">Demo PIN for ' + esc(d.name.split(' ')[0]) + ' is ' + esc(d.pin) + '</div>';
  }

  function wireLogin() {
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { pick = b.dataset.pick; pinBuf = ''; render(); };
    });
    if ($('dBack')) $('dBack').onclick = function () { pick = null; pinBuf = ''; render(); };
    document.querySelectorAll('.pinpad button').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k;
        if (k === 'back') pinBuf = pinBuf.slice(0, -1);
        else if (k === 'clear') pinBuf = '';
        else if (pinBuf.length < 4) pinBuf += k;
        if (pinBuf.length === 4) {
          var d = WS.driver(pick);
          if (d.pin === pinBuf) {
            me = d;
            try { localStorage.setItem('wsDemo:driver', d.id); } catch (e) { }
            pick = null; pinBuf = '';
            render();
            return;
          }
          pinBuf = '';
          render();
          if ($('dErr')) $('dErr').textContent = 'That PIN is not right.';
          return;
        }
        render();
      };
    });
  }

  /* ---------------- home ---------------- */
  function todayCheck() {
    return WS.state.checks.filter(function (c) { return c.driverId === me.id && c.date === WS.day(0); })[0] || null;
  }

  function homeHtml() {
    var v = WS.vehicle(me.vehicleId) || {}, t = todayCheck();
    var mine = WS.state.checks.filter(function (c) { return c.driverId === me.id; }).slice(-7).reverse();
    var openJobs = WS.state.jobs.filter(function (j) {
      return j.vehicleId === me.vehicleId && WS.OPEN_STATUSES.indexOf(j.status) >= 0;
    });
    return '<div class="phead" style="margin-bottom:14px"><div><h1>' + esc(v.reg || '') + '</h1>' +
      '<div class="sub">' + esc((v.make || '') + ' ' + (v.model || '')) + ' · ' + esc(WS.dayName(WS.day(0))) + '</div></div></div>' +

      (v.vor ? '<div class="flagbox" style="margin-bottom:14px"><b>This vehicle is off the road.</b> ' + esc(v.notes || '') +
        ' Do not take it out.</div>' : '') +

      (t ? '<div class="card" style="border-color:var(--ok)">' +
        '<div class="inline"><span class="pill ok">Check done</span>' +
        '<span class="muted sm right">' + esc(WS.timeUK(t.at)) + '</span></div>' +
        '<div style="margin-top:10px">' +
        (t.defects.length
          ? '<b>You reported: ' + esc(t.defects[0].item) + '</b><div class="muted sm" style="margin-top:4px">' + esc(t.defects[0].note) + '</div>' +
            (t.jobId ? '<div class="note" style="margin-top:10px">The workshop has raised job ' + esc((WS.job(t.jobId) || {}).no || '') + ' for it.</div>'
              : '<div class="hint" style="margin-top:10px">Sent to the workshop.</div>')
          : '<b>Nil defect.</b> Nothing found, you are good to go.') +
        '</div></div>'
        : '<div class="card"><h2>Today\'s walkaround</h2>' +
          '<div class="hint" style="margin:8px 0 14px">You have not done it yet. It takes about two minutes. ' +
          'It is a legal requirement before you drive and it is kept for the life of the vehicle.</div>' +
          '<button class="btn block lg" id="dStart">Start the check</button></div>') +

      (openJobs.length ? '<div class="card"><h2>In the workshop</h2><div class="sep" style="margin:10px 0"></div>' +
        openJobs.map(function (j) {
          return '<div class="inline" style="padding:9px 0;border-bottom:1px solid var(--line)">' +
            '<div><div class="b">' + esc(j.type) + '</div><div class="muted sm">' + esc(j.no) + '</div></div>' +
            '<span class="pill ' + WS.statusCls(j.status) + ' right">' + esc(WS.statusLabel(j.status)) + '</span></div>';
        }).join('') + '</div>' : '') +

      '<div class="card"><h2>Your last checks</h2><div class="sep" style="margin:10px 0"></div>' +
      (mine.length ? mine.map(function (c) {
        return '<div class="inline" style="padding:9px 0;border-bottom:1px solid var(--line)">' +
          '<div><div class="b">' + esc(WS.dayName(c.date)) + '</div>' +
          '<div class="muted sm">' + esc(c.defects.length ? c.defects[0].item : 'Nil defect') + '</div></div>' +
          '<span class="pill ' + (c.defects.length ? 'bad' : 'ok') + ' right">' + (c.defects.length ? 'defect' : 'clear') + '</span></div>';
      }).join('') : '<div class="hint">Nothing yet.</div>') + '</div>';
  }

  function wireHome() {
    if ($('dStart')) $('dStart').onclick = function () {
      var v = WS.vehicle(me.vehicleId) || {};
      draft = {
        odometer: v.odometer || 0,
        sections: WS.state.walkaround.map(function (s) {
          return { id: s.id, name: s.name, items: s.items.map(function (n) { return { name: n, state: '', note: '', photo: '', severity: '' }; }) };
        })
      };
      openSec = {}; openSec[WS.state.walkaround[0].id] = true;
      view = 'check';
      render();
    };
  }

  /* ---------------- the walkaround ---------------- */
  function checkHtml() {
    var v = WS.vehicle(me.vehicleId) || {};
    var total = 0, done = 0, bad = 0;
    draft.sections.forEach(function (s) {
      s.items.forEach(function (i) { total++; if (i.state) done++; if (i.state === 'D') bad++; });
    });
    return '<button class="btn alt sm" id="cBack" style="margin-bottom:14px">← Back</button>' +
      '<div class="card"><div class="inline"><div><h2>' + esc(v.reg || '') + '</h2>' +
      '<div class="muted sm">' + esc(WS.dayName(WS.day(0))) + ' walkaround</div></div>' +
      '<div class="right" style="text-align:right"><div class="b" style="font-size:19px">' + done + '/' + total + '</div>' +
      '<div class="muted sm">checked</div></div></div>' +
      '<div class="cap" style="margin-top:12px"><i class="' + (bad ? 'bad' : done === total ? 'ok' : '') + '" style="width:' + (done / total * 100) + '%"></i></div>' +
      '<label class="f" style="margin:14px 0 0"><span class="lb">Odometer reading</span>' +
      '<input class="in" id="cOdo" type="number" value="' + draft.odometer + '"></label></div>' +

      draft.sections.map(function (s, si) {
        var sDone = s.items.filter(function (i) { return i.state; }).length;
        var sBad = s.items.filter(function (i) { return i.state === 'D'; }).length;
        var open = openSec[s.id];
        return '<div class="isec"><div class="sh" data-sec="' + s.id + '">' + esc(s.name) +
          '<span class="cnt">' + (sBad ? '<span class="chip bad">' + sBad + '</span> ' : '') + sDone + '/' + s.items.length + '</span></div>' +
          (open ? s.items.map(function (it, ii) {
            return '<div class="iitem"><div class="nm">' + esc(it.name) + '</div>' +
              '<div class="sw">' +
              '<button class="s' + (it.state === 'S' ? ' on' : '') + '" data-set="' + si + '|' + ii + '|S">OK</button>' +
              '<button class="d' + (it.state === 'D' ? ' on' : '') + '" data-set="' + si + '|' + ii + '|D">Problem</button>' +
              '</div>' +
              (it.state === 'D' ? '<div class="dnote">' +
                '<div class="b sm" style="margin-bottom:6px">How bad is it</div>' +
                '<div class="seg" style="margin-bottom:9px">' +
                ['Advisory', 'Dangerous'].map(function (lv) {
                  return '<button data-sev="' + si + '|' + ii + '|' + lv + '"' + (it.severity === lv ? ' class="on"' : '') + '>' + lv + '</button>';
                }).join('') + '</div>' +
                '<textarea class="in" data-note="' + si + '|' + ii + '" placeholder="What is wrong with it">' + esc(it.note) + '</textarea>' +
                '<div class="thumbs" style="margin-top:9px">' +
                (it.photo ? '<img class="thumb" src="' + it.photo + '" alt="Defect photo">' : '') +
                '<label class="addph">Add<br>photo<input type="file" accept="image/*" capture="environment" data-ph="' + si + '|' + ii + '" hidden></label></div>' +
                '</div>' : '') + '</div>';
          }).join('') : '') + '</div>';
      }).join('') +

      '<div class="card" style="margin-top:14px"><div class="hint">' +
      'By sending this you are saying you have walked round the vehicle and checked every item above. ' +
      'Your name, the time and where you are go on the record.</div></div>' +

      '<div class="fbar">' +
      '<button class="btn alt" id="cAllOk">Mark the rest OK</button>' +
      '<button class="btn" id="cSend">' + (bad ? 'Send ' + bad + ' defect' + (bad > 1 ? 's' : '') : 'Send nil defect') + '</button></div>';
  }

  function wireCheck() {
    $('cBack').onclick = function () { view = 'home'; render(); };
    $('cOdo').onchange = function () { draft.odometer = parseInt(this.value, 10) || 0; };
    document.querySelectorAll('[data-sec]').forEach(function (h) {
      h.onclick = function () { openSec[h.dataset.sec] = !openSec[h.dataset.sec]; render(); };
    });
    document.querySelectorAll('[data-set]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.set.split('|');
        var it = draft.sections[+p[0]].items[+p[1]];
        it.state = it.state === p[2] ? '' : p[2];
        if (it.state === 'D' && !it.severity) it.severity = 'Advisory';
        render();
      };
    });
    document.querySelectorAll('[data-sev]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.sev.split('|');
        draft.sections[+p[0]].items[+p[1]].severity = p[2];
        render();
      };
    });
    document.querySelectorAll('[data-note]').forEach(function (t) {
      t.oninput = function () {
        var p = t.dataset.note.split('|');
        draft.sections[+p[0]].items[+p[1]].note = t.value;
      };
    });
    document.querySelectorAll('[data-ph]').forEach(function (f) {
      f.onchange = function () {
        var p = f.dataset.ph.split('|');
        WS.readPhoto(f.files[0], function (url) {
          draft.sections[+p[0]].items[+p[1]].photo = url;
          render();
        });
      };
    });
    $('cAllOk').onclick = function () {
      draft.sections.forEach(function (s) { s.items.forEach(function (i) { if (!i.state) i.state = 'S'; }); });
      render();
      WS.toast('Everything else marked OK.', 'ok');
    };
    $('cSend').onclick = send;
  }

  function send() {
    var missing = 0;
    draft.sections.forEach(function (s) { s.items.forEach(function (i) { if (!i.state) missing++; }); });
    if (missing) {
      WS.toast(missing + ' item' + (missing > 1 ? 's have' : ' has') + ' not been checked yet.', 'bad');
      return;
    }
    var defects = [];
    draft.sections.forEach(function (s) {
      s.items.forEach(function (i) {
        if (i.state === 'D') {
          if (!i.note) { i.note = 'Driver reported a problem with the ' + i.name.toLowerCase() + '.'; }
          defects.push({ item: i.name, note: i.note, severity: i.severity || 'Advisory', photo: i.photo || '' });
        }
      });
    });
    var v = WS.vehicle(me.vehicleId) || {};
    var c = {
      id: WS.uid('ck'), driverId: me.id, vehicleId: me.vehicleId, operatorId: me.operatorId,
      date: WS.day(0), at: WS.nowStamp(), odometer: draft.odometer,
      sections: draft.sections, defects: defects, nilDefect: !defects.length,
      jobId: '', seen: false, location: 'Croydon depot'
    };
    WS.state.checks.push(c);
    if (v.id) v.odometer = draft.odometer;

    var dangerous = defects.filter(function (d) { return d.severity === 'Dangerous'; })[0];
    if (dangerous && v.id) {
      v.vor = true;
      v.notes = 'Off road after a driver defect report: ' + dangerous.item;
    }
    if (defects.length) {
      WS.notify('Workshop', 'in app', 'Driver defect on ' + (v.reg || ''),
        me.name + ' reported ' + defects[0].item + ': ' + defects[0].note, 'defect');
    }
    WS.save();
    draft = null;
    view = 'home';
    render();
    WS.toast(defects.length
      ? 'Sent. The workshop has it' + (dangerous ? ' and the vehicle is marked off the road.' : '.')
      : 'Nil defect sent. Have a good day.', defects.length ? 'bad' : 'ok');
  }
})();
