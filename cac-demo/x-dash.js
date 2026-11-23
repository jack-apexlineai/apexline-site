/* Home, the picture: a dark panel with this month racing last month, three gauges, and today hour by hour.
   It takes the place of the plain bar chart at the top of Home. Sample data, like the rest of the demo. */
(function () {
  function start(tries) {
    var UI = window.CACUI, V3 = window.CACV3, V2 = window.CACV2, CS = window.CS;
    if (!(UI && V3 && V3.forecast && V2 && V2.x && CS && CS.S)) { if ((tries || 0) < 80) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var X2 = V2.x, orig = UI.V.home;
    function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
    function ic(n) { return window.ic ? window.ic(n) : ''; }
    function mlen(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

    /* sales added up day by day through a month */
    function cum(list, len) {
      var by = [], i; for (i = 0; i <= len; i++) by[i] = 0;
      list.forEach(function (o) { var d = CS.dayDate(o.off).getDate(); if (d <= len) by[d] += o.sell; });
      for (i = 1; i <= len; i++) by[i] += by[i - 1];
      return by;
    }
    function ring(pct, big, label, sub, first) {
      var r = 34, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct)), off = c * (1 - p);
      return '<div class="xd-ring"><svg viewBox="0 0 84 84" aria-hidden="true"><circle class="bg" cx="42" cy="42" r="' + r + '"/><circle class="fg' + (first ? ' grow' : '') + '" cx="42" cy="42" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" style="--c:' + c.toFixed(1) + '"/></svg>' +
        '<b class="v">' + big + '</b><div class="t"><b>' + h(label) + '</b><small>' + sub + '</small></div></div>';
    }
    function hero(first) {
      var f = V3.forecast(), cur = f.cur, prev = f.prev, now = CS.dayDate(0), dom = now.getDate(), len = mlen(now);
      var pd = prev ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : null, plen = pd ? mlen(pd) : len, span = Math.max(len, plen);
      var a = cum(cur.l, len), b = prev ? cum(prev.l, plen) : null;
      var top = Math.max(f.est, a[dom], b ? b[plen] : 0) * 1.12 || 1;
      var W = 640, Hh = 210, L = 46, R = 16, T = 14, B = 26;
      function x(d) { return L + (d - 1) / (span - 1) * (W - L - R); }
      function y(v) { return T + (1 - v / top) * (Hh - T - B); }
      function path(arr, to) { var s = ''; for (var d = 1; d <= to; d++) s += (d === 1 ? 'M' : 'L') + x(d).toFixed(1) + ' ' + y(arr[d]).toFixed(1); return s; }
      var grid = '', k;
      for (k = 1; k <= 3; k++) { var gv = top / 1.12 * k / 3; grid += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv).toFixed(1) + '" y2="' + y(gv).toFixed(1) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (y(gv) + 3.5).toFixed(1) + '" text-anchor="end">£' + Math.round(gv / 1000) + 'k</text>'; }
      var xs = ''; [1, 8, 15, 22, 29].forEach(function (d) { if (d <= span) xs += '<text class="ax" x="' + x(d).toFixed(1) + '" y="' + (Hh - 7) + '" text-anchor="middle">' + d + '</text>'; });
      var area = path(a, dom) + 'L' + x(dom).toFixed(1) + ' ' + y(0).toFixed(1) + 'L' + x(1).toFixed(1) + ' ' + y(0).toFixed(1) + 'Z';
      var dr = prev ? cur.s.rev - prev.st.rev : 0, moves = X2.movesOn(0), done = moves.filter(function (m) { return X2.track(m.j, 0, m.what)[2] >= 3; }).length;
      var gp = cur.s.rev ? cur.s.margin / cur.s.rev : 0;
      return '<section class="xd-hero' + (first ? ' first' : '') + '" id="homeChart">' +
        '<div class="xd-l"><div class="xd-top"><div><small class="xd-k">' + h(cur.long) + ' so far</small><b class="xd-big" data-count="' + Math.round(cur.s.rev) + '">' + money(cur.s.rev) + '</b>' +
        (prev ? '<span class="xd-d ' + (dr >= 0 ? 'up' : 'down') + '">' + (dr >= 0 ? '&#9650; ' : '&#9660; ') + money(Math.abs(dr)) + (dr >= 0 ? ' ahead of ' : ' behind ') + h(prev.long) + ' at this point</span>' : '') + '</div>' +
        '<div class="xd-leg"><span><i class="l1"></i>' + h(cur.long) + '</span>' + (prev ? '<span><i class="l2"></i>' + h(prev.long) + '</span>' : '') + '<span><i class="l3"></i>Estimate</span></div></div>' +
        '<svg class="xd-chart" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Sales this month day by day against last month, with an estimate for the rest of the month"><defs><linearGradient id="xdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EB9347" stop-opacity=".42"/><stop offset="1" stop-color="#EB9347" stop-opacity="0"/></linearGradient></defs>' +
        grid + xs +
        (b ? '<path class="pm" d="' + path(b, plen) + '"/>' : '') +
        '<path class="ar" d="' + area + '"/><path class="tm" pathLength="1" d="' + path(a, dom) + '"/>' +
        '<path class="fc" d="M' + x(dom).toFixed(1) + ' ' + y(a[dom]).toFixed(1) + 'L' + x(len).toFixed(1) + ' ' + y(f.est).toFixed(1) + '"/>' +
        '<circle class="end" cx="' + x(len).toFixed(1) + '" cy="' + y(f.est).toFixed(1) + '" r="4"/><text class="lab" x="' + (x(len) - 8).toFixed(1) + '" y="' + (y(f.est) - 9).toFixed(1) + '" text-anchor="end">' + money(f.est) + ', an estimate</text>' +
        '<circle class="pulse" cx="' + x(dom).toFixed(1) + '" cy="' + y(a[dom]).toFixed(1) + '" r="9"/><circle class="now" cx="' + x(dom).toFixed(1) + '" cy="' + y(a[dom]).toFixed(1) + '" r="4.5"/>' +
        '</svg></div>' +
        '<div class="xd-r">' +
        ring(gp, Math.round(gp * 100) + '%', 'Gross profit', money(cur.s.margin) + ' this month', first) +
        ring(f.est ? cur.s.rev / f.est : 0, Math.round((f.est ? cur.s.rev / f.est : 0) * 100) + '%', 'Of the month\'s estimate', money(f.est) + ' estimated', first) +
        ring(moves.length ? done / moves.length : 0, done + '/' + moves.length, 'Jobs done today', (moves.length - done) + ' still to go', first) +
        '<button class="xd-go" data-act="go" data-v="trends">Open trends' + ic('chevron-right') + '</button></div></section>';
    }

    /* today, hour by hour: every job as a bar on its supplier's window, with a line for now */
    function win(j) {
      var e = X2.eta(j) || '', m = /(\d+)(?::(\d+))?\s*to\s*(\d+)(?::(\d+))?/.exec(e); if (!m) return [8, 10];
      var s = +m[1] + (m[2] ? +m[2] / 60 : 0), t = +m[3] + (m[4] ? +m[4] / 60 : 0);
      if (s < 7) s += 12; if (t < 7.5) t += 12; if (t <= s) t = s + 1.5;
      return [s, t];
    }
    function dayStrip() {
      var H0 = 7, H1 = 17, moves = X2.movesOn(0), lanes = [], rows = '', n = { ok: 0, mail: 0, brand: 0, amber: 0 };
      moves.forEach(function (m) {
        var w = win(m.j), tk = X2.track(m.j, 0, m.what), lane = 0, c = CS.cust(m.j.cust);
        while (lanes[lane] != null && lanes[lane] > w[0] - 0.05) lane++;
        lanes[lane] = w[1];
        n[tk[1]] = (n[tk[1]] || 0) + 1;
        var left = (Math.max(H0, w[0]) - H0) / (H1 - H0) * 100, wid = (Math.min(H1, w[1]) - Math.max(H0, w[0])) / (H1 - H0) * 100;
        rows += '<button class="xd-job ' + tk[1] + '" data-act="openJob" data-id="' + h(m.j.id) + '" style="left:' + left.toFixed(2) + '%;width:' + wid.toFixed(2) + '%;top:' + (lane * 34) + 'px" title="' + h(m.what + ': ' + CS.jobDesc(m.j) + ', ' + c.name + ', ' + X2.eta(m.j) + ', ' + tk[0]) + '"><b>' + h(CS.jobDesc(m.j)) + '</b><span>' + h(c.name) + '</span></button>';
      });
      var hours = ''; for (var hh = H0; hh <= H1; hh++) hours += '<span style="left:' + ((hh - H0) / (H1 - H0) * 100).toFixed(2) + '%">' + (hh > 12 ? hh - 12 : hh) + (hh < 12 ? 'am' : 'pm') + '</span>';
      var d = new Date(), now = d.getHours() + d.getMinutes() / 60, nowL = now >= H0 && now <= H1 ? '<i class="xd-now" style="left:' + ((now - H0) / (H1 - H0) * 100).toFixed(2) + '%"><em>Now</em></i>' : '';
      var chips = [['ok', 'done'], ['mail', 'on the way'], ['brand', 'confirmed'], ['amber', 'waiting on a supplier']].filter(function (x) { return n[x[0]]; }).map(function (x) { return '<span class="xd-chip ' + x[0] + '"><i></i>' + n[x[0]] + ' ' + x[1] + '</span>'; }).join('');
      return '<section class="card xd-day" id="homeDay"><div class="xd-dh"><h2>' + ic('truck') + 'Today, hour by hour</h2><div class="xd-chips">' + chips + '</div><button class="btn sm" data-act="jobTab" data-v="live">Live jobs' + ic('chevron-right') + '</button></div>' +
        (moves.length ? '<div class="xd-scroll"><div class="xd-track"><div class="xd-hours">' + hours + '</div><div class="xd-lanes" style="height:' + (lanes.length * 34 + 2) + 'px">' + nowL + rows + '</div></div></div><p class="xd-note">Each bar sits on the window the supplier gave. It is not vehicle tracking.</p>' : '<div class="empty">Nothing moving today.</div>') + '</section>';
    }
    function countUp() {
      var el = document.querySelector('#homeChart [data-count]'); if (!el) return;
      var to = +el.getAttribute('data-count'), t0 = null;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      function step(ts) { if (!document.body.contains(el)) return; if (t0 == null) t0 = ts; var p = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - p, 3); el.textContent = money(to * e); if (p < 1) requestAnimationFrame(step); else el.textContent = money(to); }
      requestAnimationFrame(step);
    }
    UI.V.home = function () {
      var first = !UI.ui.hcSeen, html = orig(), out;
      try { out = html.replace(/<section class="card homechart[\s\S]*?<\/section>/, function () { return hero(first) + dayStrip(); }); }
      catch (e) { return html; }                                  /* if anything goes wrong the plain Home still shows */
      if (first) setTimeout(countUp, 30);
      return out;
    };
    /* when the start-up screen clears, Home draws its chart again so the line and the gauges are seen moving */
    if (window.MutationObserver) new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) for (var k = 0; k < list[i].removedNodes.length; k++) {
        if (list[i].removedNodes[k].id === 'boot' && UI.ui.view === 'home') { UI.ui.hcSeen = false; UI.render(); return; }
      }
    }).observe(document.body, { childList: true });
    if (UI.ui.view === 'home') { UI.ui.hcSeen = false; UI.render(); }
  }
  start(0);
})();
