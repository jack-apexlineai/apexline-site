/* Driver app: pick your lorry, PIN, then today's jobs in order. On the job: a site photo, the customer signs,
   Send to office. The next job starts by itself and the office map and yard board show you on the way.
   Inside the office demo it works on the office's own data. On its own it saves in this browser. */
(function () {
  var params = new URLSearchParams(location.search), embed = params.get('embed') === '1';
  var host = null; try { if (window.parent !== window && window.parent.CS && window.parent.DSGYC && window.parent.CS.S) host = window.parent; } catch (e) { host = null; }
  var CS = host ? host.CS : window.CS, YC = host ? host.DSGYC : window.DSGYC, ic = window.ic;
  if (!host) CS.load();
  if (embed) document.body.classList.add('embed');
  function S() { return CS.S; }
  function Y() { return YC.ensure(CS.S, CS); }
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return document.querySelector(s); }
  function save() { CS.save(); if (host && host.DSGUI) { try { host.DSGUI.render(); } catch (e) {} } }
  function toast(t, i) { var b = $('#toasts'), el = document.createElement('div'); el.className = 'dv-toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 3400); }
  var PIN = '1234';
  var st = { lid: params.get('l') || null, signed: false, pin: '', seen: -1, bad: false };
  function tellHost() { try { if (host && host.DSGUI) host.DSGUI.ui.yDrv = st.signed ? st.lid : null; } catch (e) {} }
  function lo() { return YC.lorry(st.lid); }
  function jobs() { return YC.forLorry(Y(), st.lid, 0); }
  function cur() { return YC.active(jobs()); }
  function custPhone(j) { var c = CS.cust && CS.cust(j.cust); if (c) return c.phone; var o = YC.oneoff(j.cust); return o ? o.phone : ''; }
  function mapsUrl(j) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(j.site.name + ', ' + j.site.pc); }
  function since(j, k) { return k === 'photo' ? j.photos.some(function (p) { return p.at >= (j.at.started || 0); }) : !!j.sig && j.sig.at >= (j.at.started || 0); }

  function draw() {
    $('#lorry').innerHTML = st.lid && st.signed ? '<b>' + h(lo().reg) + '</b>' : '';
    if (!st.lid) return pick();
    if (!st.signed) return pin();
    var y = Y(), L = jobs(), c = cur(), done = L.filter(function (j) { return j.status === 'done'; }).sort(function (a, b) { return (b.at.done || 0) - (a.at.done || 0); });
    st.seen = y.v;
    var hr = new Date().getHours();
    var o = '<section class="dv-hi"><small>' + h(CS.dayDate(0).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + '</small><h1>' + (hr < 12 ? 'Morning' : 'Afternoon') + ', ' + h(lo().first) + '</h1>' +
      '<div class="dv-prog"><span><b>' + done.length + '</b> of ' + L.length + ' done</span><span class="dv-bar"><i style="width:' + (L.length ? Math.round(done.length / L.length * 100) : 0) + '%"></i></span></div></section>';
    if (c) o += card(c);
    else o += '<section class="dv-card dv-done-all">' + ic('circle-check') + '<h2>All done for today</h2><p>Every job has its photo and signature. Head back to the yard.</p></section>';
    var rest = L.filter(function (j) { return j.status !== 'done' && j !== c; });
    if (rest.length) o += '<h3 class="dv-h">Still to do</h3>' + rest.map(function (j, i) { return '<div class="dv-mini"><span class="dv-n">' + (i + 2) + '</span><span><b>' + YC.hhmm(j.win[0]) + ' · ' + h(YC.whatShort(j)) + '</b><small>' + h(j.site.name) + '</small></span></div>'; }).join('');
    if (done.length) o += '<h3 class="dv-h">Done today</h3>' + done.map(function (j) { return '<div class="dv-mini done">' + ic('check') + '<span><b>' + h(YC.whatShort(j)) + '</b><small>' + h(j.site.name) + ' · ' + CS.clock(j.at.done) + '</small></span></div>'; }).join('');
    o += '<button class="dv-link dv-switch" data-a="switch">' + ic('truck') + 'Not ' + h(lo().reg) + '? Change lorry</button>';
    $('#main').innerHTML = o;
  }
  function pick() {
    $('#main').innerHTML = '<section class="dv-hi"><h1>Which lorry are you on?</h1><p class="dv-sub">Tap your lorry, then put your PIN in.</p></section>' +
      YC.LORRIES.map(function (l) { return '<button class="dv-pick" data-a="pick" data-v="' + l.id + '"><span class="dv-plate">' + h(l.reg) + '</span><span><b>' + h(l.driver) + '</b></span>' + ic('chevron-right') + '</button>'; }).join('');
  }
  function pin() {
    var dots = ''; for (var i = 0; i < 4; i++) dots += '<i class="' + (i < st.pin.length ? 'on' : '') + '"></i>';
    $('#main').innerHTML = '<section class="dv-hi dv-pinb"><span class="dv-plate">' + h(lo().reg) + '</span><h1>Hi ' + h(lo().first) + '</h1><p class="dv-sub">Put your PIN in</p><div class="dv-dots' + (st.bad ? ' bad' : '') + '" id="pinDots">' + dots + '</div>' +
      (st.bad ? '<p class="dv-err">That PIN is not right. Try again.</p>' : '<p class="dv-sub">Demo PIN 1234</p>') + '</section>' +
      '<div class="dv-pad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'del'].map(function (k) {
        if (k === 'back') return '<button class="dv-k sm" data-a="unpick">Back</button>';
        if (k === 'del') return '<button class="dv-k sm" data-a="pdel" aria-label="Delete">' + ic('chevron-left') + '</button>';
        return '<button class="dv-k" data-a="pk" data-v="' + k + '">' + k + '</button>';
      }).join('') + '</div>';
  }
  function card(j) {
    var sv = YC.STREAMS[j.stream], nm = YC.custName(S(), j.cust), ph = since(j, 'photo'), sg = since(j, 'sig');
    var o = '<section class="dv-card cur"><div class="dv-ct"><span class="dv-tag ' + j.status + '">' + (j.status === 'onsite' ? 'On site' : 'Now') + '</span><span class="dv-win">' + YC.win(j) + '</span></div>' +
      '<h2>' + h(YC.what(j)) + '</h2><p class="dv-who"><b>' + h(nm) + '</b><br>' + h(j.site.name) + ', ' + h(j.site.pc) + '</p>' +
      '<div class="dv-facts"><span>' + ic('certificate') + h(sv.n) + ' · EWC ' + sv.ewc + '</span>' + (j.permit ? '<span class="warn">' + ic('alert') + 'On the road. Lights and cones. Permit ' + h(j.permit.ref) + '</span>' : '') + (j.notes ? '<span>' + ic('pencil') + h(j.notes) + '</span>' : '') + '</div>' +
      '<div class="dv-acts"><a class="dv-btn" href="' + mapsUrl(j) + '" target="_blank" rel="noopener">' + ic('route') + 'Navigate</a>' + (custPhone(j) ? '<a class="dv-btn" href="tel:' + h(String(custPhone(j)).replace(/\s/g, '')) + '">' + ic('phone') + 'Ring</a>' : '') + '</div>' +
      '<ol class="dv-steps">' +
      '<li class="' + (ph ? 'ok' : '') + '"><span class="dv-sn">' + (ph ? ic('check') : '1') + '</span><div><b>Site photo</b>' +
        (ph ? '<img class="dv-ph" src="' + h(lastPhoto(j)) + '" alt="Site photo">' : '<label class="dv-btn pri">' + ic('eye') + 'Take photo<input type="file" accept="image/*" capture="environment" id="photoIn" hidden></label><button class="dv-link" data-a="samplePhoto">Use a sample photo</button>') + '</div></li>' +
      '<li class="' + (sg ? 'ok' : '') + '"><span class="dv-sn">' + (sg ? ic('check') : '2') + '</span><div><b>Customer signature</b>' +
        (sg ? '<small>' + (j.sig.none ? 'Customer not there, the photo is the proof' : 'Signed by ' + h(j.sig.name || 'the customer')) + '</small>' : '<button class="dv-btn pri" data-a="sign">' + ic('pencil') + 'Sign on the screen</button><button class="dv-link" data-a="nosig">Customer not there</button>') + '</div></li>' +
      '</ol><button class="dv-big" data-a="send" id="sendBtn"' + (ph && sg ? '' : ' disabled') + '>' + ic('send') + 'Send to office<small>' + (YC.TYPES[j.type].waste ? 'Makes the transfer note, then your next job' : 'Tells the office, then your next job') + '</small></button>';
    return o + '</section>';
  }
  function lastPhoto(j) { var p = j.photos[j.photos.length - 1]; return p.src || YC.samplePhoto(p.k, j.size); }
  function start(j) { if (!j.at.started) { j.at.started = Date.now() - 1; } }

  function act(what, data) {
    var c = cur(); if (!c) return; start(c);
    if (what === 'send') {
      YC.act(S(), Y(), c.id, 'done', {});
      var nx = cur();
      if (nx) { YC.act(S(), Y(), nx.id, 'onway'); nx.at.started = Date.now(); }
      save(); draw(); window.scrollTo(0, 0);
      toast('Sent to the office' + (c.wtn ? ', ' + h(c.wtn) + ' made' : '') + (nx ? '. On your way to ' + h(nx.site.name.split(',').pop().trim()) : ''), 'send');
      return;
    }
    YC.act(S(), Y(), c.id, what, data); c.manual = true; save(); draw();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return; var a = b.getAttribute('data-a'), c = cur();
    if (a === 'pick') { st.lid = b.getAttribute('data-v'); st.pin = ''; st.bad = false; draw(); }
    if (a === 'unpick' || a === 'switch') { st.lid = null; st.signed = false; st.pin = ''; tellHost(); draw(); }
    if (a === 'pk' && st.pin.length < 4) {
      st.pin += b.getAttribute('data-v'); st.bad = false;
      if (st.pin.length === 4) {
        if (st.pin === PIN) { st.signed = true; tellHost(); var c0 = cur(); if (c0) { c0.at.started = Date.now(); if (c0.status === 'planned') { YC.act(S(), Y(), c0.id, 'onway'); save(); } } draw(); (function () { var n = jobs().filter(function (j) { return j.status !== 'done'; }).length; toast('Signed in. ' + n + (n === 1 ? ' job' : ' jobs') + ' to go today', 'truck'); })(); return; }
        st.bad = true; st.pin = '';
      }
      draw();
    }
    if (a === 'pdel') { st.pin = st.pin.slice(0, -1); draw(); }
    if (a === 'samplePhoto') act('photo', { k: c && c.type === 'deliver' ? 'drop' : 'collect' });
    if (a === 'nosig') act('sig', { none: true, name: '' });
    if (a === 'sign') signPad();
    if (a === 'send') act('send');
    if (a === 'sigClear') { var cv = $('#sigCv'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.dataset.ink = ''; }
    if (a === 'sigCancel') $('#sheet').innerHTML = '';
    if (a === 'sigOk') { var cv2 = $('#sigCv'), nm = ($('#sigName') || {}).value || ''; if (!cv2.dataset.ink) { toast('Ask them to sign in the box first', 'alert'); return; } var src = cv2.toDataURL('image/png'); $('#sheet').innerHTML = ''; act('sig', { name: nm.trim() || YC.custFirst(S(), c.cust), src: src }); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'photoIn' || !e.target.files || !e.target.files[0]) return;
    var c = cur(), fr = new FileReader();
    fr.onload = function () {
      var img = new Image(); img.onload = function () {
        var k = Math.min(1, 480 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); act('photo', { k: c.type === 'deliver' ? 'drop' : 'collect', src: cv.toDataURL('image/jpeg', 0.7) });
      }; img.onerror = function () { act('photo', { k: c.type === 'deliver' ? 'drop' : 'collect' }); }; img.src = fr.result;
    };
    fr.readAsDataURL(e.target.files[0]);
  });
  function signPad() {
    var c = cur(); if (!c) return;
    $('#sheet').innerHTML = '<div class="dv-scrim"></div><div class="dv-sheet" role="dialog" aria-label="Customer signature"><h2>' + h(YC.custName(S(), c.cust)) + ', please sign</h2><p>' + h(YC.what(c)) + ' at ' + h(c.site.name) + '</p>' +
      '<canvas id="sigCv" width="640" height="260" aria-label="Signature box"></canvas><label class="dv-nm">Name<input id="sigName" value="' + h(YC.custFirst(S(), c.cust)) + '" autocomplete="off"></label>' +
      '<div class="dv-acts"><button class="dv-btn" data-a="sigClear">Clear</button><button class="dv-btn" data-a="sigCancel">Cancel</button><button class="dv-btn pri" data-a="sigOk">' + ic('check') + 'Done</button></div></div>';
    var cv = $('#sigCv'), x = cv.getContext('2d'), down = false;
    x.lineWidth = 4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#1A1A1A';
    function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
    cv.addEventListener('pointerdown', function (e) { down = true; if (cv.setPointerCapture) cv.setPointerCapture(e.pointerId); var p = pt(e); x.beginPath(); x.moveTo(p[0], p[1]); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) { if (!down) return; var p = pt(e); x.lineTo(p[0], p[1]); x.stroke(); cv.dataset.ink = '1'; e.preventDefault(); });
    cv.addEventListener('pointerup', function () { down = false; });
    cv.addEventListener('pointerleave', function () { down = false; });
  }
  setInterval(function () {
    if (!st.signed) return;
    if (!host) { try { var raw = JSON.parse(localStorage.getItem(CS.KEY || 'dsg-v1') || 'null'); if (raw && raw.yard && raw.yard.v !== st.seen) { CS.S = raw; } } catch (e) {} }
    var y = Y(); if (y.v === st.seen) return;
    var ae = document.activeElement; if ($('#sheet').innerHTML || (ae && ae.tagName === 'INPUT')) return;
    draw();
  }, 1200);
  window.addEventListener('pagehide', function () { st.signed = false; tellHost(); });
  draw();
})();
