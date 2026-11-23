/* The start-up screen. The logo comes up on a dark screen, then the greeting by UK time, then four lines from
   today's own figures, one at a time. After about six seconds it hands over to Home by itself. Any click or key skips it. */
(function () {
  function start(tries) {
    var UI = window.CACUI, CS = window.CS, V2 = window.CACV2, V3 = window.CACV3;
    if (!(UI && UI.A && CS && CS.S && V2 && V2.x && V3 && V3.forecast)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, X2 = V2.x, ic = window.ic || function () { return ''; };
    var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
    function plural(n, one, many) { return n === 1 ? one : many; }
    function lines() {
      var st = CS.stats(), f = V3.forecast(), cur = f.cur, prev = f.prev, moves = X2.movesOn(0), done = moves.filter(function (m) { return X2.track(m.j, 0, m.what)[2] >= 3; }).length;
      var needs = CS.S.threads.filter(function (t) { return !t.done && CS.needsYou(t); }).length, dr = prev ? cur.s.rev - prev.st.rev : 0, out = [];
      out.push(['inbox', needs ? '<b>' + needs + '</b> ' + plural(needs, 'message needs', 'messages need') + ' you. Every reply is already written.' : 'Nothing in the inbox needs you.']);
      out.push(['truck', '<b>' + moves.length + '</b> ' + plural(moves.length, 'job', 'jobs') + ' moving today, <b>' + done + '</b> done so far.']);
      out.push(['trending-up', '<b>' + money(cur.s.rev) + '</b> taken in ' + cur.long + (prev ? ', <b>' + money(Math.abs(dr)) + '</b> ' + (dr >= 0 ? 'ahead of' : 'behind') + ' ' + prev.long + ' at this point.' : ' so far.')]);
      out.push(['pound', st.overdue ? '<b>' + money(st.overdue) + '</b> is overdue to you. The chases are written.' : 'Nothing is overdue to you.']);
      return out;
    }
    function run() {
      var old = document.getElementById('boot'); if (old && old.parentNode) old.parentNode.removeChild(old);
      var hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
      var day = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      var b = document.createElement('div'); b.className = 'boot xb'; b.id = 'boot'; b.setAttribute('role', 'status');
      b.innerHTML = '<div class="xb-glow" aria-hidden="true"></div><div class="xb-in">' +
        '<img class="xb-logo" src="brand/cac-logo-inverted.svg" alt="CAC Waste Management">' +
        '<h2 class="xb-hi">' + greet + ', John.</h2><div class="xb-day">' + day + '</div>' +
        '<ul class="xb-list">' + lines().map(function (l, i) { return '<li style="animation-delay:' + (1.5 + i * 0.5).toFixed(2) + 's">' + ic(l[0]) + '<span>' + l[1] + '</span></li>'; }).join('') + '</ul>' +
        '<div class="xb-bar"><i></i></div></div>';
      document.body.appendChild(b);
      var total = RM ? 1800 : 6400, t = setTimeout(end, total), gone = false;
      function end() {
        if (gone) return; gone = true; clearTimeout(t); document.removeEventListener('keydown', key, true);
        b.classList.add('out'); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 520);
      }
      function key(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') end(); }
      b.addEventListener('click', end); document.addEventListener('keydown', key, true);
    }
    /* the Play the start-up button, the guided tour and the presenter guide all come through here */
    A.boot = function () { try { A.close(); } catch (e) {} run(); };
    /* it plays every time the page loads, including a refresh and the guided tour, unless ?boot=0 is in the address
       or the guided tour is part way through (a refresh mid-demo keeps your place without replaying it) */
    var q = new URLSearchParams(location.search), mid = false;
    try { var w = JSON.parse(sessionStorage.getItem('cac-walk') || 'null'); mid = sessionStorage.getItem('cac-walk-on') === '1' && !!w && w.i >= 0; } catch (e) {}
    var first = document.getElementById('boot');
    if (q.get('boot') !== '0' && !mid) setTimeout(run, 200);   /* a moment's wait so the guided inbox is calmed first and the figures match */
    else if (first && !/\bxb\b/.test(first.className)) run();
  }
  start(0);
})();
