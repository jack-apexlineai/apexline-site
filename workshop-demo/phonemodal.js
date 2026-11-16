/* Fitter app in a phone, over the office. The real fitter.html in a same-origin iframe,
   so it shares this browser's storage: clock on in the phone, close it, and the office
   already shows it. On a phone itself the button just opens the fitter app. */
(function () {
  var $ = WS.$, O = WS.O;
  var FW = 414, FH = 824;            // a 390 x 800 screen inside a 12px bezel
  var PHONE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.5 18.5h3"/></svg>';

  /* only what the fitter app really does */
  var STEPS = [
    ['Log in with your PIN', 'Tap your name and put in your 4 digit PIN. Dave is 1111.'],
    ['Your jobs for today', 'My day lists your jobs in order, with the time each one is allowed.'],
    ['Clock on', 'Open a job and press Clock on. The timer starts and the office sees it on Live view.'],
    ['Do the job', 'Tick the tasks, add the parts used and a photo. Found something else wrong? Send it for the customer to authorise.'],
    ['Speak the job card', 'A preview of what is coming. Say it in one go and it fills the standard job card: concern, location, cause, fix, parts, labour, urgency. Check what it read back, approve.'],
    ['Job done', 'Press Job done and it goes to the office for QC.']
  ];

  var mask = null, fit = null;

  function clock() {
    var d = new Date();
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }
  O.phoneFrame = function (src, title) {
    return '<div class="psizer"><div class="pframe">' +
      '<span class="pbtn pb1"></span><span class="pbtn pb2"></span><span class="pbtn pb3"></span>' +
      '<div class="pscreen">' +
      '<div class="psbar"><span class="ptime">' + clock() + '</span><span class="pisland"></span>' +
      '<span class="picons"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>' +
      '<svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor"><path d="M7.5 2.2c2.2 0 4.2.9 5.7 2.3l1.1-1.2A9.6 9.6 0 0 0 7.5.6 9.6 9.6 0 0 0 .7 3.3l1.1 1.2a8 8 0 0 1 5.7-2.3zm0 3.2c1.3 0 2.5.5 3.4 1.3l1.1-1.2a6.6 6.6 0 0 0-9 0l1.1 1.2c.9-.8 2.1-1.3 3.4-1.3zm0 3.2c.5 0 .9.2 1.2.5L7.5 10.4 6.3 9.1c.3-.3.7-.5 1.2-.5z"/></svg>' +
      '<svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.2" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor"/><path d="M23 4v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45"/></svg></span></div>' +
      '<iframe class="pifr" src="' + src + '" title="' + WS.esc(title) + '"></iframe>' +
      '<div class="phome"><span></span></div>' +
      '</div></div></div>';
  };

  function size() {
    if (!mask) return;
    var s = Math.max(0.4, Math.min(1, (window.innerHeight - 40) / FH));
    var sz = mask.querySelector('.psizer'), fr = mask.querySelector('.pframe');
    fr.style.transform = 'scale(' + s + ')';
    sz.style.width = Math.round(FW * s) + 'px';
    sz.style.height = Math.round(FH * s) + 'px';
  }
  function onKey(e) { if (e.key === 'Escape') O.closePhone(); }

  O.openPhone = function () {
    if (window.innerWidth <= 760) { location.href = 'fitter.html'; return; }
    if (mask) return;
    mask = WS.el('div', 'pmask');
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-label', 'Fitter app on a phone');
    mask.innerHTML =
      '<button type="button" class="pmx" id="pmClose" aria-label="Close the fitter app" title="Close (Esc)">&times;</button>' +
      '<div class="pmwrap">' + O.phoneFrame('fitter.html?dock=1', 'Fitter app') +
      '<div class="pmsteps"><div class="pmk">' + PHONE + 'Fitter app</div>' +
      '<h2>How it works</h2>' +
      '<ol>' + STEPS.map(function (s) { return '<li><b>' + WS.esc(s[0]) + '</b><span>' + WS.esc(s[1]) + '</span></li>'; }).join('') + '</ol>' +
      '<div class="pmfoot">Close the phone to see it on the office screen.</div></div>' +
      '</div>';
    document.body.appendChild(mask);
    document.body.classList.add('phoneopen');
    size();
    $('pmClose').onclick = O.closePhone;
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.classList.contains('pmwrap')) O.closePhone();
    });
    document.addEventListener('keydown', onKey);
    // Esc still closes when the phone has the focus
    var ifr = mask.querySelector('iframe');
    ifr.addEventListener('load', function () {
      try { ifr.contentWindow.document.addEventListener('keydown', onKey); } catch (e) { }
    });
    fit = size;
    window.addEventListener('resize', fit);
    setTimeout(function () { var c = $('pmClose'); if (c) c.focus(); }, 30);
  };

  O.closePhone = function () {
    if (!mask) return;
    mask.remove();
    mask = null;
    document.body.classList.remove('phoneopen');
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', fit);
    // pick up whatever the fitter did, then redraw the office
    WS._pull();
    O.render();
    var b = $('wsPhone');
    if (b) b.focus();
  };

  O.initPhone = function () {
    var bell = $('wsBell');
    if (!bell || $('wsPhone')) return;
    var b = WS.el('button', 'phonebtn');
    b.type = 'button';
    b.id = 'wsPhone';
    b.title = 'Open the fitter app on a phone';
    b.setAttribute('aria-label', 'Fitter app');
    b.innerHTML = PHONE + '<span>Fitter app</span>';
    var g = $('wsDemoBtns');
    if (g) g.insertBefore(b, g.firstChild); else bell.parentNode.insertBefore(b, bell);
    b.onclick = O.openPhone;
    // the customer portal, in a browser window, next to it
    var c = WS.el('button', 'phonebtn');
    c.type = 'button';
    c.id = 'wsPortal';
    c.title = 'Open the customer portal as a customer';
    c.setAttribute('aria-label', 'Customer portal');
    c.innerHTML = BROWSER + '<span>Customer portal</span>';
    b.parentNode.insertBefore(c, b.nextSibling);
    c.onclick = function () { O.openPortal(null, { site: true }); };
  };

  /* ---------------- the customer portal in a browser window ----------------
     The real portal.html in a same-origin iframe, already signed in as a customer
     (Thameside Skips by default, they have PMIs due soon). Switch customer in the bar. */
  var BROWSER = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="2.4"/><path d="M2.5 8.5h19M6 6.3h.01M8.6 6.3h.01"/></svg>';
  var pmask = null, pfit = null;
  function psize() {
    if (!pmask) return;
    var w = Math.min(1180, window.innerWidth - 110), h = Math.min(860, window.innerHeight - 56);
    var win = pmask.querySelector('.bwin');
    win.style.width = w + 'px';
    win.style.height = h + 'px';
  }
  function pKey(e) { if (e.key === 'Escape') O.closePortal(); }
  /* opts.site: start on a mock-up of the workshop's own website, whose Customer login button
     leads to the portal sign in (prefilled for the demo). Otherwise straight into the portal. */
  var SITE = 'londonenvironmentalgroup.co.uk', PORTAL = 'portal.londonenvironmentalgroup.co.uk';
  function siteHtml() {
    var S = WS.state.settings;
    return '<div class="mocksite" id="mockSite"><span class="ms-tag">Mock-up of your website</span>' +
      '<header class="ms-nav"><span class="ms-logo">' + (S.logo ? '<img src="' + WS.esc(S.logo) + '" alt="' + WS.esc(S.name) + '">' : WS.esc(S.name)) + '</span>' +
      '<nav><span>Skip hire</span><span>Workshop</span><span>Contact</span><button type="button" class="ms-mini" data-mslogin>Customer login</button></nav></header>' +
      '<section class="ms-hero"><div class="ms-in"><div class="ms-kick">' + WS.esc(WS.shortName(S.name)) + '</div>' +
      '<h1>Skip hire and HGV workshop, London</h1>' +
      '<p>Book your lorry in, report a repair and see your paperwork online, any time.</p>' +
      '<button type="button" class="ms-cta" id="msLogin" data-mslogin>Customer login / Book your lorry in</button></div></section>' +
      '<section class="ms-row"><div><b>PMIs and MOT prep</b><span>Six weekly inspections done to the DVSA guide.</span></div>' +
      '<div><b>Repairs and defects</b><span>Tell us what is wrong and get an estimate first.</span></div>' +
      '<div><b>Your fleet online</b><span>Due dates, bookings and invoices in one place.</span></div></section></div>';
  }
  O.openPortal = function (opId, opts) {
    opts = opts || {};
    opId = opId || O.portalAs || 'o1';
    if (window.innerWidth <= 760) { location.href = 'portal.html'; return; }
    if (pmask) O.closePortal();
    O.portalAs = opId;
    pmask = WS.el('div', 'pmask');
    pmask.setAttribute('role', 'dialog');
    pmask.setAttribute('aria-modal', 'true');
    pmask.setAttribute('aria-label', 'Customer portal');
    pmask.innerHTML =
      '<button type="button" class="pmx" id="bwClose" aria-label="Close the customer portal" title="Close (Esc)">&times;</button>' +
      '<div class="bwin"><div class="bw-bar"><span class="bw-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="bw-url"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg><span id="bwUrl"></span></span>' +
      '<button type="button" class="bw-skip" id="bwSkip">Skip to portal</button>' +
      '<label class="bw-sw" id="bwSwL"><span>Switch customer</span><select id="bwSw">' + WS.state.operators.map(function (o) {
        return '<option value="' + o.id + '"' + (o.id === opId ? ' selected' : '') + '>' + WS.esc(o.name) + '</option>';
      }).join('') + '</select></label></div>' +
      '<div class="bw-body" id="bwBody"></div></div>';
    document.body.appendChild(pmask);
    document.body.classList.add('phoneopen');
    psize();
    $('bwClose').onclick = O.closePortal;
    $('bwSkip').onclick = function () { showPortal('as'); };
    $('bwSw').onchange = function () { O.portalAs = this.value; showPortal('as'); };
    pmask.addEventListener('click', function (e) { if (e.target === pmask) O.closePortal(); });
    document.addEventListener('keydown', pKey);
    pfit = psize;
    window.addEventListener('resize', pfit);
    if (opts.site) showSite(); else showPortal('as');
  };
  function showSite() {
    $('bwUrl').textContent = SITE;
    $('bwSkip').hidden = false;
    $('bwSwL').hidden = true;
    $('bwBody').innerHTML = siteHtml();
    O.portalStep = 'site';
    $('bwBody').querySelectorAll('[data-mslogin]').forEach(function (b) { b.onclick = function () { showPortal('demo'); }; });
  }
  /* how: 'as' signs straight in as the chosen customer, 'demo' shows the sign in prefilled */
  function showPortal(how) {
    $('bwUrl').textContent = PORTAL;
    $('bwSkip').hidden = true;
    $('bwSwL').hidden = false;
    $('bwBody').innerHTML = '<iframe class="bw-ifr" src="portal.html?dock=1&' + (how === 'demo' ? 'demo=' : 'as=') + O.portalAs + '" title="Customer portal"></iframe>';
    O.portalStep = 'portal';
    var ifr = $('bwBody').querySelector('iframe');
    ifr.addEventListener('load', function () { try { ifr.contentWindow.document.addEventListener('keydown', pKey); } catch (e) { } });
  }
  O.closePortal = function () {
    if (!pmask) return;
    pmask.remove();
    pmask = null;
    document.body.classList.remove('phoneopen');
    document.removeEventListener('keydown', pKey);
    window.removeEventListener('resize', pfit);
    WS._pull();
    O.render();
    var b = $('wsPortal');
    if (b) b.focus();
  };
})();
