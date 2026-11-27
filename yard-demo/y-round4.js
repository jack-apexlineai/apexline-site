/* Round four: a calm 11am at a busy yard (20 of 38 jobs done, 4 lorries out, 2 in the yard waiting to tip),
   Wayne's run for the demo story (GU21 3NN, then the wait and load at GU22 8LT, then back to tip), the customer SMS toast
   when a driver goes on his way, Home as a thriving yard, and drag to change the order of a lorry's run (mouse and touch).
   Sample data in this browser only. Nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit;
    var ok = UI && UI.V && UI.A && CS && CS.S && YC && K && K.planBase && window.DSGY3 && K.msgFirst;
    if (ok) { var y0 = YC.ensure(CS.S, CS); ok = y0 && y0.r3V === 1 && y0.inboxV === 2; }
    if (!ok) { if ((tries || 0) < 300) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    var toast = K.toast, save = K.save, plural = K.plural;
    function waste(j) { return YC.TYPES[j.type] && YC.TYPES[j.type].waste; }
    function fits(l, j) { if (j.type === 'grab' || j.type === 'muck') return l.kind === 'grab'; if ((j.size || 0) >= 20) return l.kind === 'roro'; return l.kind === 'skip'; }

    /* ---------- the sample day at 11am ---------- */
    function runOrder(y, lid, first) {
      var L = YC.forLorry(y, lid, 0), done = L.filter(function (j) { return j.status === 'done'; }).sort(function (a, b) { return (a.at.done || 0) - (b.at.done || 0); });
      var live = L.filter(function (j) { return j.status === 'onway' || j.status === 'onsite'; }), plan = L.filter(function (j) { return j.status === 'planned'; }).sort(function (a, b) { return a.win[0] - b.win[0]; });
      if (first) plan.sort(function (a, b) { return (b.id === first) - (a.id === first); });
      done.concat(live).concat(plan).forEach(function (j, i) { j.seq = i; });
    }
    (function seed() {
      var y = Y(); if (y.r4s === 1) return; y.r4s = 1; y.tip = y.tip || {};
      var s = S(), now = Date.now(), b0 = new Date(); b0.setHours(0, 0, 0, 0);
      function lo(id) { return YC.lorry(id); }
      /* Jason's hook lorry is back at the yard with a full RoRo, waiting to tip */
      var a3 = YC.active(YC.forLorry(y, 'L3', 0));
      if (a3 && a3.status !== 'done' && waste(a3)) { var t3 = now - 18 * 60000; a3.at.onway = a3.at.onway || t3 - 50 * 60000; a3.at.arrived = t3 - 25 * 60000; YC.complete(s, y, a3, null, t3); y.tip.L3 = { job: a3.id, at: t3 - YC.TRAVEL }; }
      /* Marcus is back with his last load, waiting to tip */
      var d4 = YC.forLorry(y, 'L4', 0).filter(function (j) { return j.status === 'done' && waste(j); }).sort(function (a, b) { return (a.at.done || 0) - (b.at.done || 0); }).pop();
      if (d4) y.tip.L4 = { job: d4.id, at: (d4.at.done || now) - 1000 };
      /* earlier jobs today, finished, so the day reads 20 done */
      var t0 = YC.today(y), keep = { 'DSG-3194': 1, 'DSG-3195': 1 }, story = { 'GU21 3NN': 1, 'GU22 8LT': 1 };   /* Wayne's two postcodes stay his alone */
      function pool() { return YC.today(y).filter(function (j) { return !j.lorry && j.status === 'planned' && !YC.isCash(j) && j.type !== 'wait' && !j.notes && !j.permit && !keep[j.id] && !story[j.site.pc]; }).sort(function (a, b) { return a.win[0] - b.win[0]; }); }
      var order = ['L2', 'G1', 'G2', 'L1', 'G1', 'L2', 'G2', 'L1', 'L4', 'L2', 'G1', 'G2'], k = 0, guard = 0;
      while (YC.today(y).filter(function (j) { return j.status === 'done'; }).length < 20 && guard++ < 40) {
        var lid = order[k++ % order.length], l = lo(lid), j = pool().filter(function (x) { return fits(l, x); })[0]; if (!j) continue;
        var dn = YC.forLorry(y, lid, 0).filter(function (x) { return x.status === 'done'; }), first = Math.min.apply(null, dn.map(function (x) { return x.at.done || now; }).concat([now - 60 * 60000]));
        var at = Math.max(b0.getTime() + 7 * 3600000 + 20 * 60000, first - 55 * 60000), m = Math.round((at - b0.getTime()) / 60000);
        j.lorry = lid; j.win = [Math.max(420, m - 45), Math.max(480, m + 15)]; j.manual = false; j.at.onway = at - 40 * 60000; j.at.arrived = at - 15 * 60000;
        YC.complete(s, y, j, null, at);
      }
      /* the rest of the morning planned on the lorries that are out, a few left to drag on */
      [['L1', 2], ['L2', 2], ['G1', 2], ['G2', 2], ['L4', 1]].forEach(function (r) {
        for (var i = 0; i < r[1]; i++) { var l = lo(r[0]), j = pool().filter(function (x) { return fits(l, x); })[0]; if (!j) break; j.lorry = r[0]; j.manual = false; if (r[0] === 'L1') j.win = [Math.max(j.win[0], 810 + i * 60), Math.max(j.win[1], 870 + i * 60)]; }
      });
      YC.LORRIES.forEach(function (l) { runOrder(y, l.id, l.id === 'L1' ? 'DSG-3194' : null); });
      /* Wayne's wait and load at GU22 8LT carries a weight allowance: the weighbridge reads it over */
      var wl = K.jobById('DSG-3194'); if (wl) { wl.incl = 2; wl.bridgeNet = 2.64; wl.log.push({ at: wl.log[0] ? wl.log[0].at : now, t: '2 t included on the quote, then ' + CS.money(YC.prices(y).overRate) + ' a tonne' }); }
      /* skips on site: 3 overdue for collection, 1 due soon */
      var os = y.onsite.filter(function (o) { return !o.booked; }), od = os.filter(function (o) { return -o.since > o.hire; });
      od.slice(3).forEach(function (o) { o.since = -(o.hire - 4); });
      os.filter(function (o) { return -o.since <= o.hire && o.hire + o.since <= 1; }).slice(1).forEach(function (o) { o.since = -(o.hire - 4); });
      /* permits: one renewal due soon */
      (y.permits || []).filter(function (p) { return p.status === 'approved' && !p.collected && p.to >= 0 && p.to <= 3; }).slice(1).forEach(function (p) { p.to += 9; });
      /* messages: 7 to reply, Priya's transfer note already sent */
      (y.inbox || []).forEach(function (m) { if (m.id === 'm6' && !m.done) { m.done = true; m.doneAt = now - 50 * 60000; m.reply = m.draft; } });
      y.r4sk = 140 - y.onsite.filter(function (o) { return !o.booked; }).length;
      y.r4pm = 14 - (y.permits || []).filter(function (p) { return p.status === 'approved'; }).length;
      y.v++; save();
    })();

    /* ---------- the SMS toast, top right of the office ---------- */
    function smsBox() { var b = q('#ySms'); if (!b) { b = document.createElement('div'); b.id = 'ySms'; b.className = 'ysms'; b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); } return b; }
    function sms(j) {
      var y = Y(), m = YC.etaMins(y, j) || 20, w = YC.smsWin(m), el = document.createElement('div');
      el.className = 'ysms-t'; el.innerHTML = ic('message') + '<span><b>SMS sent to ' + h(YC.custName(S(), j.cust)) + ':</b> driver on the way, arriving in about ' + w[0] + ' to ' + w[1] + ' minutes</span>';
      smsBox().appendChild(el); setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, 7000);
    }
    window.DSGY4R = { sms: sms };

    /* ---------- Home: a thriving yard at 11am ---------- */
    var home0 = V.home;
    V.home = function () {
      var html = home0.apply(this, arguments), y = Y(), t0 = YC.today(y), dn = t0.filter(function (j) { return j.status === 'done'; }).length;
      var wait = 0, out = 0; YC.LORRIES.forEach(function (l) { var w = YC.where(y, l.id); if (w.tip && w.state === 'tipwait') wait++; else if (w.state !== 'home' && w.state !== 'yard') out++; });
      var os = y.onsite.filter(function (o) { return !o.booked; }), od = os.filter(function (o) { return -o.since > o.hire; }).length, soon = os.filter(function (o) { return -o.since <= o.hire && o.hire + o.since <= 1; }).length;
      var P = y.permits || [], act = P.filter(function (p) { return p.status === 'approved'; }).length + (y.r4pm || 0), ren = P.filter(function (p) { return p.status === 'approved' && !p.collected && p.to >= 0 && p.to <= 3; }).length, ap = P.filter(function (p) { return p.status === 'apply'; }).length;
      var msgs = (y.inbox || []).filter(function (m) { return !m.done; }).length;
      var T = {
        jobs: [dn + '<i> of ' + t0.length + ' done</i>', ['On track to complete all ' + t0.length]],
        lorries: [out + '<i> out</i>', [wait + ' in the yard waiting to tip']],
        skips: [String(os.length + (y.r4sk || 0)), [od + ' overdue for collection', soon + ' due soon for collection']],
        inbox: [String(msgs), [msgs ? 'to reply' : 'All answered']],
        permits2: [act + '<i> active</i>', [ren + ' renewal' + (ren === 1 ? '' : 's') + ' due soon', ap + ' new permit' + (ap === 1 ? '' : 's') + ' to apply for']]
      };
      var box = document.createElement('div'); box.innerHTML = html;
      Object.keys(T).forEach(function (k) {
        var tile = box.querySelector('[data-tile="' + k + '"]'); if (!tile) return; var b = tile.querySelector('.yh-tb > b'), sp = tile.querySelector('.yh-tb > span'), sm = tile.querySelector('.yh-tb > small');
        if (k === 'lorries' && sm) sm.innerHTML = ic('truck') + 'Lorries';
        if (b) b.innerHTML = T[k][0];
        if (sp) sp.outerHTML = '<span class="y4lines">' + T[k][1].map(function (x) { return '<span>' + h(x) + '</span>'; }).join('') + '</span>';
        tile.classList.remove('bad');
      });
      return box.innerHTML;
    };

    /* ---------- Day plan: drag a job up or down its lorry's run ---------- */
    function reorder(id, beforeId) {
      var j = K.jobById(id); if (!j || !j.lorry || j.status !== 'planned') return false;
      var y = Y(), d = j.day || 0, L = YC.forLorry(y, j.lorry, d), plan = L.filter(function (x) { return x.status === 'planned' && x !== j; });
      var i = beforeId ? plan.map(function (x) { return x.id; }).indexOf(beforeId) : -1; if (i < 0) plan.push(j); else plan.splice(i, 0, j);
      var before = L.filter(function (x) { return x.status === 'planned'; }).map(function (x) { return x.id; }).join();
      var done = L.filter(function (x) { return x.status === 'done'; }).sort(function (a, b) { return (a.at.done || 0) - (b.at.done || 0); }), live = L.filter(function (x) { return x.status === 'onway' || x.status === 'onsite'; });
      done.concat(live).concat(plan).forEach(function (x, n) { x.seq = n; });
      if (plan.map(function (x) { return x.id; }).join() === before) { UI.render(); return true; }
      var l = YC.lorry(j.lorry), pos = plan.indexOf(j) + 1;
      j.log.push({ at: Date.now(), t: 'Moved to number ' + pos + ' on ' + l.reg + '\'s run' }); y.v++; save(); UI.render();
      toast(h(YC.whatShort(j)) + ' at ' + h(j.site.pc) + ' is now number ' + pos + ' of the jobs still to do on ' + h(l.reg) + '. ' + h(l.first) + '\'s phone shows the new order', 'route');
      return true;
    }
    function colOf(el) { return el && el.closest && el.closest('#yPlan .ycol[data-col]'); }
    function cardsIn(col) { return Array.prototype.slice.call(col.querySelectorAll('.ycol-b > .ypc[data-pj]')); }
    function insertAt(col, y, dragId) {
      var C = cardsIn(col).filter(function (c) { return c.getAttribute('data-pj') !== dragId; });
      for (var i = 0; i < C.length; i++) { var r = C[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return C[i]; }
      return null;
    }
    var mark = null;
    function showMark(col, before) {
      if (!mark) { mark = document.createElement('div'); mark.className = 'y4ins'; }
      var body = col.querySelector('.ycol-b'); if (before) body.insertBefore(mark, before); else body.appendChild(mark);
    }
    function hideMark() { if (mark && mark.parentNode) mark.parentNode.removeChild(mark); }
    function clearDrag() { hideMark(); document.body.classList.remove('y2drag'); Array.prototype.forEach.call(document.querySelectorAll('.y2ok,.y2no,.ycol.ydrop,.ypc.ydrag,.ypc.y4lift'), function (c) { c.classList.remove('y2ok', 'y2no', 'ydrop', 'ydrag', 'y4lift'); }); }
    /* with a mouse: the normal drag, dropped inside its own lorry */
    var dragId = null;
    document.addEventListener('dragstart', function (e) { var c = e.target.closest && e.target.closest('#yPlan [data-pj]'); dragId = c ? c.getAttribute('data-pj') : null; }, true);
    document.addEventListener('dragend', function () { dragId = null; hideMark(); }, true);
    document.addEventListener('dragover', function (e) {
      if (!dragId) return; var col = colOf(e.target), j = K.jobById(dragId);
      if (!col || !j || col.getAttribute('data-col') !== j.lorry) { hideMark(); return; }
      e.preventDefault(); showMark(col, insertAt(col, e.clientY, dragId));
    }, true);
    document.addEventListener('drop', function (e) {
      if (!dragId) return; var col = colOf(e.target), j = K.jobById(dragId); if (!col || !j || col.getAttribute('data-col') !== j.lorry) { hideMark(); return; }
      e.preventDefault(); e.stopPropagation(); var b = insertAt(col, e.clientY, dragId), id = dragId; dragId = null; clearDrag(); reorder(id, b ? b.getAttribute('data-pj') : null);
    }, true);
    /* with a finger: hold the grip and slide it up or down */
    var tz = null;
    document.addEventListener('pointerdown', function (e) {
      var g = e.target.closest && e.target.closest('.y4grip'); if (!g || e.pointerType === 'mouse') return;
      var card = g.closest('[data-pj]'), col = colOf(card); if (!card || !col) return;
      e.preventDefault(); var r = card.getBoundingClientRect(), gh = card.cloneNode(true);
      gh.className += ' y4ghost'; gh.style.width = r.width + 'px'; gh.style.left = r.left + 'px'; gh.style.top = r.top + 'px'; document.body.appendChild(gh);
      card.classList.add('ydrag', 'y4lift');
      tz = { id: card.getAttribute('data-pj'), col: col, gh: gh, dy: e.clientY - r.top, pid: e.pointerId, before: undefined };
      try { g.setPointerCapture(e.pointerId); } catch (x) {}
    }, true);
    document.addEventListener('pointermove', function (e) {
      if (!tz || e.pointerId !== tz.pid) return; e.preventDefault();
      tz.gh.style.top = (e.clientY - tz.dy) + 'px'; var b = insertAt(tz.col, e.clientY, tz.id); tz.before = b; showMark(tz.col, b);
      if (e.clientY < 70) window.scrollBy(0, -12); else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
    }, { capture: true, passive: false });
    function endTouch(e, cancel) {
      if (!tz || (e && e.pointerId !== tz.pid)) return; var t = tz; tz = null; t.gh.remove(); clearDrag();
      if (cancel || t.before === undefined) { UI.render(); return; }
      reorder(t.id, t.before ? t.before.getAttribute('data-pj') : null);
    }
    document.addEventListener('pointerup', function (e) { endTouch(e); }, true);
    document.addEventListener('pointercancel', function (e) { endTouch(e, true); }, true);
    document.addEventListener('touchmove', function (e) { if (tz) e.preventDefault(); }, { passive: false });
    /* each job on a lorry gets a grip to drag it up or down */
    var plan0 = V.plan;
    V.plan = function () {
      var html = plan0.apply(this, arguments);
      return html.replace(/(<div class="ypc y2pc svc-\w+" draggable="true" data-pj="([^"]+)" data-kind="\w+">)/g, '$1<span class="y4grip" role="button" tabindex="-1" aria-label="Hold and slide to change the order" title="Drag up or down to change the order"><i></i><i></i><i></i></span>');
    };

    UI.render();
  }
  start(0);
})();
