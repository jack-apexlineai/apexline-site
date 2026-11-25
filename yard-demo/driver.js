/* Driver app: today's jobs in order, navigate, on my way text, photo, signature, ticket and weight.
   Inside the office demo it works on the office's own data, so the map and plan move as you press. On its own it saves in this browser. */
(function () {
  var params = new URLSearchParams(location.search), LID = params.get('l') || 'L1', embed = params.get('embed') === '1';
  var host = null; try { if (window.parent !== window && window.parent.CS && window.parent.DSGYC && window.parent.CS.S) host = window.parent; } catch (e) { host = null; }
  var CS = host ? host.CS : window.CS, YC = host ? host.DSGYC : window.DSGYC, ic = window.ic;
  if (!host) CS.load();
  if (embed) document.body.classList.add('embed');
  function S() { return CS.S; }
  function Y() { return YC.ensure(CS.S, CS); }
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return document.querySelector(s); }
  function save() { CS.save(); if (host && host.DSGUI) { try { host.DSGUI.render(); } catch (e) {} } }
  function toast(t, i) { var b = $('#toasts'), el = document.createElement('div'); el.className = 'dv-toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 3600); }
  var lo = YC.lorry(LID) || YC.LORRIES[0];
  var st = { open: null, ticket: {}, seen: -1 };   /* what is open on screen, and ticket fields typed so far */

  function jobs() { return YC.forLorry(Y(), lo.id, 0); }
  function cur() { return YC.active(jobs()); }
  function waste(j) { return YC.TYPES[j.type].waste; }
  function custPhone(j) { var c = CS.cust && CS.cust(j.cust); if (c) return c.phone; var o = YC.oneoff(j.cust); return o ? o.phone : ''; }
  function mapsUrl(j) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(j.site.name + ', ' + j.site.pc); }

  function draw() {
    var y = Y(), L = jobs(), c = cur(), done = L.filter(function (j) { return j.status === 'done'; }), hr = new Date().getHours();
    st.seen = y.v;
    $('#lorry').innerHTML = '<i style="background:' + lo.col + '"></i>' + h(lo.n) + ' · ' + h(lo.reg);
    var o = '<section class="dv-hi"><small>' + h(CS.dayDate(0).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + '</small><h1>' + (hr < 12 ? 'Morning' : 'Afternoon') + ', ' + h(lo.first) + '</h1>' +
      '<div class="dv-prog"><span><b>' + done.length + '</b> of ' + L.length + ' done</span><span class="dv-bar"><i style="width:' + (L.length ? Math.round(done.length / L.length * 100) : 0) + '%"></i></span></div></section>';
    if (c) o += card(c, true);
    else o += '<section class="dv-card dv-done-all">' + ic('circle-check') + '<h2>All done for today</h2><p>Every job has its photo, signature and paperwork. Head back to the yard.</p></section>';
    var rest = L.filter(function (j) { return j.status !== 'done' && j !== c; });
    if (rest.length) o += '<h3 class="dv-h">Still to do</h3>' + rest.map(function (j, i) { return card(j, false, i + 2); }).join('');
    if (done.length) o += '<h3 class="dv-h">Done today</h3>' + done.slice().reverse().map(function (j) { return '<div class="dv-mini done">' + ic('check') + '<span><b>' + h(YC.whatShort(j)) + '</b><small>' + h(j.site.name) + ' · ' + CS.clock(j.at.done) + (j.wtn ? ' · ' + h(j.wtn) : '') + '</small></span></div>'; }).join('');
    $('#main').innerHTML = o;
  }
  function card(j, isCur, n) {
    var sv = YC.STREAMS[j.stream], nm = YC.custName(S(), j.cust);
    if (!isCur) return '<div class="dv-mini"><span class="dv-n">' + n + '</span><span><b>' + YC.hhmm(j.win[0]) + ' · ' + h(YC.whatShort(j)) + '</b><small>' + h(j.site.name) + '</small></span></div>';
    var hasPhoto = j.photos.some(function (p) { return p.at >= (j.at.arrived || 0); }), hasSig = !!j.sig && j.sig.at >= (j.at.arrived || 0), tk = st.ticket[j.id] || {}, hasTk = !waste(j) || (tk.no && tk.net > 0);
    var o = '<section class="dv-card cur"><div class="dv-ct"><span class="dv-tag ' + j.status + '">' + ({ planned: 'Next job', onway: 'On the way', onsite: 'On site', done: 'Done' })[j.status] + '</span><span class="dv-win">' + YC.win(j) + '</span></div>' +
      '<h2>' + h(YC.what(j)) + '</h2><p class="dv-who"><b>' + h(nm) + '</b><br>' + h(j.site.name) + ', ' + h(j.site.pc) + '</p>' +
      '<div class="dv-facts"><span>' + ic('certificate') + h(sv.n) + ' · EWC ' + sv.ewc + '</span>' + (j.permit ? '<span class="warn">' + ic('alert') + 'On the road. Lights and cones. Permit ' + h(j.permit.ref) + '</span>' : '') + (j.notes ? '<span>' + ic('pencil') + h(j.notes) + '</span>' : '') + '</div>';
    if (j.status === 'planned') {
      o += '<div class="dv-acts"><a class="dv-btn" href="' + mapsUrl(j) + '" target="_blank" rel="noopener">' + ic('route') + 'Navigate</a>' + (custPhone(j) ? '<a class="dv-btn" href="tel:' + h(String(custPhone(j)).replace(/\s/g, '')) + '">' + ic('phone') + 'Ring</a>' : '') + '</div>' +
        '<button class="dv-big" data-a="onway">' + ic('send') + 'On my way<small>Texts ' + h(nm.split(' ')[0] === 'Mrs' || nm.split(' ')[0] === 'Mr' ? nm : YC.custFirst(S(), j.cust)) + ' an ETA</small></button>';
    } else if (j.status === 'onway') {
      o += (j.eta && j.eta.text ? '<div class="dv-text">' + ic('message') + '<span><b>Text sent ' + CS.clock(j.eta.at) + '</b>' + h(j.eta.text) + '</span></div>' : '') +
        '<div class="dv-acts"><a class="dv-btn" href="' + mapsUrl(j) + '" target="_blank" rel="noopener">' + ic('route') + 'Navigate</a>' + (custPhone(j) ? '<a class="dv-btn" href="tel:' + h(String(custPhone(j)).replace(/\s/g, '')) + '">' + ic('phone') + 'Ring</a>' : '') + '</div>' +
        '<button class="dv-big" data-a="arrived">' + ic('map-pin') + 'I am here</button>';
    } else if (j.status === 'onsite') {
      o += '<ol class="dv-steps">' +
        '<li class="' + (hasPhoto ? 'ok' : '') + '"><span class="dv-sn">' + (hasPhoto ? ic('check') : '1') + '</span><div><b>Photo ' + (j.type === 'deliver' ? 'of the skip where you left it' : 'of the load before you lift') + '</b>' +
          (hasPhoto ? '<img class="dv-ph" src="' + h(lastPhoto(j)) + '" alt="Photo taken">' : '<label class="dv-btn pri">' + ic('eye') + 'Take photo<input type="file" accept="image/*" capture="environment" id="photoIn" hidden></label><button class="dv-link" data-a="samplePhoto">Use a sample photo</button>') + '</div></li>' +
        '<li class="' + (hasSig ? 'ok' : '') + '"><span class="dv-sn">' + (hasSig ? ic('check') : '2') + '</span><div><b>Customer signs</b>' +
          (hasSig ? '<small>' + (j.sig.none ? 'Customer not there, photo is the proof' : 'Signed by ' + h(j.sig.name || 'the customer')) + '</small>' : '<button class="dv-btn pri" data-a="sign">' + ic('pencil') + 'Sign on the screen</button><button class="dv-link" data-a="nosig">Customer not there</button>') + '</div></li>' +
        (waste(j) ? '<li class="' + (hasTk ? 'ok' : '') + '"><span class="dv-sn">' + (hasTk ? ic('check') : '3') + '</span><div><b>Tip ticket and weight</b><div class="dv-tk"><label>Ticket number<input id="tkNo" value="' + h(tk.no || '') + '" placeholder="T-48700" autocomplete="off"></label><label>Net tonnes<input id="tkNet" inputmode="decimal" value="' + h(tk.net || '') + '" placeholder="1.85"></label></div><button class="dv-link" data-a="readTicket">' + ic('eye') + 'Read it from a photo of the ticket</button></div></li>' : '') +
        '</ol><button class="dv-big" data-a="done"' + (hasPhoto && hasSig && hasTk ? '' : ' disabled') + '>' + ic('circle-check') + 'Finish job<small>' + (waste(j) ? 'Makes the transfer note and sends it' : 'Tells the office and the customer') + '</small></button>';
    }
    return o + '</section>';
  }
  function lastPhoto(j) { var p = j.photos[j.photos.length - 1]; return p.src || YC.samplePhoto(p.k, j.size); }

  function act(what, data) {
    var c = cur(); if (!c) return;
    YC.act(S(), Y(), c.id, what, data); save();
    if (what === 'onway') toast('Text sent to ' + h(YC.custName(S(), c.cust)) + ' with your ETA', 'message');
    if (what === 'arrived') toast('Office told you are on site', 'map-pin');
    if (what === 'done') toast('Job done' + (c.wtn ? '. ' + h(c.wtn) + ' made and sent' : '') + '. Next job is up', 'circle-check');
    draw(); window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return; var a = b.getAttribute('data-a'), c = cur();
    if (a === 'onway' || a === 'arrived') act(a);
    if (a === 'samplePhoto') act('photo', { k: c && c.type === 'deliver' ? 'drop' : 'collect' });
    if (a === 'nosig') act('sig', { none: true, name: '' });
    if (a === 'sign') signPad();
    if (a === 'readTicket' && c) { st.ticket[c.id] = { no: 'T-' + (Y().counters.ticket), net: YC.weight(c).toFixed(2) }; draw(); toast('Ticket read: ' + st.ticket[c.id].no + ', ' + st.ticket[c.id].net + ' t', 'receipt'); }
    if (a === 'done' && c) { var tk = st.ticket[c.id] || {}; act('done', waste(c) ? { ticketNo: tk.no, net: parseFloat(tk.net) } : {}); }
    if (a === 'sigClear') { var cv = $('#sigCv'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.dataset.ink = ''; }
    if (a === 'sigCancel') $('#sheet').innerHTML = '';
    if (a === 'sigOk') { var cv2 = $('#sigCv'), nm = ($('#sigName') || {}).value || ''; if (!cv2.dataset.ink) { toast('Ask them to sign in the box first', 'alert'); return; } var src = cv2.toDataURL('image/png'); $('#sheet').innerHTML = ''; act('sig', { name: nm.trim() || YC.custFirst(S(), c.cust), src: src }); }
  });
  document.addEventListener('input', function (e) {
    var c = cur(); if (!c) return;
    if (e.target.id === 'tkNo' || e.target.id === 'tkNet') {
      var tk = st.ticket[c.id] = st.ticket[c.id] || {}; if (e.target.id === 'tkNo') tk.no = e.target.value.trim(); else tk.net = parseFloat(e.target.value.replace(/[^\d.]/g, '')) || '';
      var btn = document.querySelector('[data-a="done"]'), hasPhoto = c.photos.some(function (p) { return p.at >= (c.at.arrived || 0); }), hasSig = !!c.sig && c.sig.at >= (c.at.arrived || 0);
      if (btn) btn.disabled = !(hasPhoto && hasSig && tk.no && tk.net > 0);
    }
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
    cv.addEventListener('pointerdown', function (e) { down = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); var p = pt(e); x.beginPath(); x.moveTo(p[0], p[1]); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) { if (!down) return; var p = pt(e); x.lineTo(p[0], p[1]); x.stroke(); cv.dataset.ink = '1'; e.preventDefault(); });
    cv.addEventListener('pointerup', function () { down = false; });
    cv.addEventListener('pointerleave', function () { down = false; });
  }
  /* follow the office: the simulation and the day plan can change this list */
  setInterval(function () {
    if (!host) { try { var raw = JSON.parse(localStorage.getItem('dsg-v1') || 'null'); if (raw && raw.yard && raw.yard.v !== st.seen) { CS.S = raw; } } catch (e) {} }
    var y = Y(); if (y.v === st.seen) return;
    var ae = document.activeElement; if ($('#sheet').innerHTML || (ae && ae.tagName === 'INPUT')) return;
    draw();
  }, 1200);
  draw();
})();
