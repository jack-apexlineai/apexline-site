/* The start-up screen. The logo comes up on a dark screen, then the greeting by UK time, then four lines from
   today's own figures, one at a time. After about six seconds it hands over to Home by itself. Any click or key skips it. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, V2 = window.DSGV2, V3 = window.DSGV3;
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
        '<img class="xb-logo" src="brand/logo-inverted.svg" alt="Demo Skip & Grab">' +
        '<h2 class="xb-hi">' + greet + ', Dave.</h2><div class="xb-day">' + day + '</div>' +
        '<ul class="xb-list">' + lines().map(function (l, i) { return '<li style="animation-delay:' + (1.5 + i * 0.5).toFixed(2) + 's">' + ic(l[0]) + '<span>' + l[1] + '</span></li>'; }).join('') + '</ul>' +
        '<div class="xb-bar"><i></i></div></div>';
      document.body.appendChild(b);
      document.documentElement.classList.remove('xb-pre');   /* the start-up is now on top, so the dark cover can go */
      var total = RM ? 1800 : 6400, t = setTimeout(end, total), gone = false;
      function end() {
        if (gone) return; gone = true; clearTimeout(t); document.removeEventListener('keydown', key, true);
        b.classList.add('out'); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 520);
      }
      function key(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') end(); }
      b.addEventListener('click', end); document.addEventListener('keydown', key, true);
    }
    /* sign in first: the Demo Skip & Grab logo, username d.archer and a 4 digit PIN (1234 in the demo), then the start-up screen.
       In the real build each person has their own login and PIN, checked on the server. ?pin=0 skips this screen. */
    var PIN = '1234', USER = (window.DSGBRAND && DSGBRAND.on && DSGBRAND.user) || 'd.archer';
    function signin(then) {
      if (new URLSearchParams(location.search).get('pin') === '0') { then(); return; }
      var old = document.getElementById('xsign'); if (old && old.parentNode) old.parentNode.removeChild(old);
      var w = document.createElement('div'); w.id = 'xsign'; w.className = 'xs';
      w.innerHTML = '<div class="xb-glow" aria-hidden="true"></div><form class="xs-card" id="xsForm" autocomplete="off" novalidate>' +
        '<img class="xs-logo" src="brand/logo-inverted.svg" alt="Demo Skip & Grab"><div class="xs-cap">Office system</div><h1 class="xs-h">' + (window.DSGBRAND && DSGBRAND.first ? 'Welcome, ' + DSGBRAND.first : 'Sign in') + '</h1>' +
        '<label class="xs-f"><span>Username</span><input id="xsUser" value="' + USER + '" autocapitalize="none" autocorrect="off" spellcheck="false"></label>' +
        '<label class="xs-f"><span>PIN</span><span class="xs-pin"><input id="xsPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN"><span class="xs-cells" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span></label>' +
        '<div class="xs-err" id="xsErr" role="alert"></div><button class="xs-go" type="submit">Sign in</button></form><div class="xs-foot">Demo Skip & Grab · sample data</div>';
      document.body.appendChild(w);
      document.documentElement.classList.remove('xb-pre');
      var pin = w.querySelector('#xsPin'), user = w.querySelector('#xsUser'), err = w.querySelector('#xsErr'), cells = w.querySelectorAll('.xs-cells i'), done = false;
      function paint() { var n = pin.value.length; [].forEach.call(cells, function (c, i) { c.className = i < n ? 'on' : (i === n ? 'cur' : ''); }); }
      function go(e) {
        if (e) e.preventDefault(); if (done) return;
        var u = String(user.value || '').trim().toLowerCase();
        if (u !== USER) { err.textContent = 'No one with that username. Try ' + USER + '.'; user.focus(); return; }
        if (pin.value.length < 4) { err.textContent = 'Enter your 4 digit PIN.'; pin.focus(); return; }
        if (pin.value !== PIN) { err.textContent = 'That PIN is not right. Try again.'; pin.value = ''; paint(); w.querySelector('.xs-card').classList.remove('shake'); void w.offsetWidth; w.querySelector('.xs-card').classList.add('shake'); pin.focus(); return; }
        done = true; err.textContent = '';
        then();   /* the start-up goes in underneath first, so nothing else shows while the sign-in fades */
        requestAnimationFrame(function () { w.classList.add('ok'); setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 400); });
      }
      pin.addEventListener('input', function () { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); err.textContent = ''; paint(); if (pin.value.length === 4) setTimeout(go, 160); });
      pin.addEventListener('focus', paint); pin.addEventListener('blur', function () { [].forEach.call(cells, function (c, i) { c.className = i < pin.value.length ? 'on' : ''; }); });
      w.querySelector('#xsForm').addEventListener('submit', go);
      setTimeout(function () { try { pin.focus(); } catch (e) {} paint(); }, 60);
    }
    window.DSGSIGN = { pass: function () { var w = document.getElementById('xsign'); if (!w) return false; w.querySelector('#xsPin').value = PIN; w.querySelector('#xsForm').dispatchEvent(new Event('submit', { cancelable: true })); return true; } };   /* for the tests */
    /* the Play the start-up button, the guided tour and the presenter guide all come through here */
    A.boot = function () { try { A.close(); } catch (e) {} signin(run); };
    /* it plays every time the page loads, including a refresh and the guided tour, unless ?boot=0 is in the address
       or the guided tour is part way through (a refresh mid-demo keeps your place without replaying it) */
    setTimeout(function () { document.documentElement.classList.remove('xb-pre'); }, 2500);   /* never leave the cover up if something goes wrong */
    var q = new URLSearchParams(location.search);
    var first = document.getElementById('boot');
    if (q.get('boot') !== '0') setTimeout(function () { signin(run); }, 200);   /* every load, a refresh too. A moment's wait so the guided inbox is calmed first and the figures match */
    else if (first && !/\bxb\b/.test(first.className)) run();
  }
  start(0);
})();
