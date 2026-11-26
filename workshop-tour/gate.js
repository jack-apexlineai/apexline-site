/* Self-serve tour: the email gate and the welcome choice. Runs before the office starts.
   1. First visit: email (name and workshop optional). Saved in this browser, so a returning
      visitor goes straight in. The details go to ApexLine's enquiry inbox in the background;
      the visitor gets in straight away either way, and an unsent one is retried next visit.
   2. Then once per browser session: "Guided tour" or "I'll do it myself, thanks". */
(function () {
  var ENDPOINT = 'https://iyxsehwyvriujaixnwow.supabase.co/functions/v1/enquiry';
  var LEAD = 'wsTourLead';          // not under wsTour: so Reset demo never clears it
  var CHOSE = 'wsTourChose';        // sessionStorage: the welcome choice was made this session
  var started = Date.now();
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

  function getLead() { try { return JSON.parse(localStorage.getItem(LEAD) || 'null'); } catch (e) { return null; } }
  function setLead(l) { try { localStorage.setItem(LEAD, JSON.stringify(l)); } catch (e) { } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  WS.validEmail = function (s) { return EMAIL_RE.test(String(s || '').trim()); };

  /* the visitor's first name greets them on the start-up briefing */
  function useName(l) {
    var parts = String((l && l.name) || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return;
    var cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1); };
    WS.ownerFirst = cap(parts[0]).slice(0, 30);
    WS.ownerLast = parts.slice(1).map(cap).join(' ').slice(0, 40);
  }

  /* send the lead to ApexLine. The enquiry function wants name, email and "what", and treats
     anything sent within 3 seconds of the page opening as a bot, so it waits for that. */
  function post(l, tries) {
    var wait = Math.max(0, 3200 - (Date.now() - started));
    setTimeout(function () {
      var body = {
        name: (l.name || 'No name given') + ' (workshop tour)',
        email: l.email,
        company: l.workshop || '',
        what: 'Opened the self-serve workshop tour.\nSource: workshop-tour\nName: ' + (l.name || '-') +
          '\nWorkshop: ' + (l.workshop || '-'),
        timeline: 'workshop-tour',
        source: 'workshop-tour',
        page: location.pathname + ' (source: workshop-tour)',
        website: '',
        elapsed: Date.now() - started
      };
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) {
          var cur = getLead() || l;
          if (r.status === 200 || r.status === 400) { cur.sent = true; setLead(cur); }   // 400: bad data, never retry it
          else if (tries < 1 && r.status !== 429) setTimeout(function () { post(l, tries + 1); }, 4000);
          window.__tourPosted = r.status;
        })
        .catch(function () { window.__tourPosted = 'failed'; });
    }, wait);
  }

  function overlay(html, cls) {
    var w = document.createElement('div');
    w.className = 'tgate ' + (cls || '');
    w.innerHTML = '<div class="tg-card" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(w);
    return w;
  }
  var BADGE = '<img class="tg-badge" src="brand/demo-badge.svg" alt="" width="56" height="56">';

  function gate(next) {
    var w = overlay(
      BADGE +
      '<div class="tg-kick">HGV workshop system · live demo</div>' +
      '<h1 class="tg-h">See the workshop system working</h1>' +
      '<p class="tg-p">A working demo with sample data. Click anything, you can\'t break it. The guided tour takes about 5 minutes.</p>' +
      '<form id="tgForm" novalidate autocomplete="on">' +
      '<label class="tg-f"><span>Your email</span><input id="tgEmail" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required placeholder="you@yourworkshop.co.uk"></label>' +
      '<div class="tg-row">' +
      '<label class="tg-f"><span>Your name <em>optional</em></span><input id="tgName" name="name" autocomplete="name" maxlength="80"></label>' +
      '<label class="tg-f"><span>Workshop <em>optional</em></span><input id="tgShop" name="organization" autocomplete="organization" maxlength="120"></label>' +
      '</div>' +
      '<label class="tg-hp" aria-hidden="true">Website<input id="tgWeb" tabindex="-1" autocomplete="off"></label>' +
      '<div class="tg-err" id="tgErr" role="alert"></div>' +
      '<button class="tg-go" id="tgGo" type="submit">Open the demo</button>' +
      '<p class="tg-small">Your email goes to Jack at ApexLine, who built this. He may drop you a line about it. Nothing else.</p>' +
      '</form>', 'tg-gate');
    var f = w.querySelector('#tgForm'), em = w.querySelector('#tgEmail'), err = w.querySelector('#tgErr');
    setTimeout(function () { try { em.focus({ preventScroll: true }); } catch (e) { } }, 60);
    em.addEventListener('input', function () { err.textContent = ''; em.removeAttribute('aria-invalid'); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = em.value.trim();
      if (!WS.validEmail(email)) {
        err.textContent = email ? 'That email doesn\'t look right. Check it and try again.' : 'Put in your email to open the demo.';
        em.setAttribute('aria-invalid', 'true');
        em.focus();
        return;
      }
      if (w.querySelector('#tgWeb').value) { w.remove(); next(); return; }   // a bot: let it in, send nothing
      var l = {
        email: email.slice(0, 200),
        name: w.querySelector('#tgName').value.trim().slice(0, 80),
        workshop: w.querySelector('#tgShop').value.trim().slice(0, 120),
        at: new Date().toISOString(), sent: false
      };
      setLead(l);
      useName(l);
      post(l, 0);
      w.remove();
      next();
    });
  }

  function choose(boot) {
    var seen = null;
    try { seen = sessionStorage.getItem(CHOSE); } catch (e) { }
    if (seen) { boot(); return; }
    var first = WS.ownerFirst || '';
    var w = overlay(
      BADGE +
      '<h1 class="tg-h">' + (first ? 'Welcome, ' + esc(first) + '.' : 'Welcome.') + ' How do you want to look round?</h1>' +
      '<p class="tg-p">This is a full workshop system for HGV repair: bookings, the day plan, fitters on their phones, inspections, customers and money. All sample data, so try anything.</p>' +
      '<div class="tg-choice">' +
      '<button type="button" class="tg-go" id="tgTour"><b>Guided tour</b><span>About 5 minutes, the best bits first</span></button>' +
      '<button type="button" class="tg-alt" id="tgSelf"><b>I\'ll do it myself, thanks</b><span>The Tour button at the top brings the tour back</span></button>' +
      '</div>', 'tg-welcome');
    function pick(tour) {
      try { sessionStorage.setItem(CHOSE, tour ? 'tour' : 'self'); } catch (e) { }
      WS.tourWanted = tour;
      w.remove();
      boot();
    }
    w.querySelector('#tgTour').onclick = function () { pick(true); };
    w.querySelector('#tgSelf').onclick = function () { pick(false); };
    setTimeout(function () { try { w.querySelector('#tgTour').focus({ preventScroll: true }); } catch (e) { } }, 60);
  }

  /* ?tour=wow: recording mode. The plain system for a screen recording: no email gate, no welcome
     choice, no lead sent, no guided tour and no Tour button. Fresh sample data on every load,
     then the normal sign in and the full start-up, exactly as a real user sees it. Only the
     urgent pop ups that slide in over the screen are held back. The flag is kept for the browser session so it survives a reload or a sign out. */
  var WOW = 'wsTourWow';
  function wowUrl() {
    try { return new URLSearchParams(location.search).get('tour') === 'wow'; } catch (e) { return false; }
  }
  function wowMode() {
    if (wowUrl()) { try { sessionStorage.setItem(WOW, '1'); } catch (e) { } return true; }
    try { return sessionStorage.getItem(WOW) === '1'; } catch (e) { return false; }
  }
  /* recording mode can be made personal from the link, and it is remembered for the session:
       name=    the owner's first name (sign in tile, Good morning, top bar)
       co=      the company name everywhere the brand shows, with its initials on the badge
       colour=  the brand accent, a hex like 1F6F8B (the app keeps the contrast right)
     Plain text only: letters, numbers, spaces and . , & - are kept, the rest is dropped. */
  var WOWP = 'wsTourWowP';
  function clean(v, max) {
    return String(v == null ? '' : v).replace(/[^A-Za-z0-9\u00C0-\u024F .,&-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function wowParams() {
    var p = null;
    if (wowUrl()) {
      try {
        var q = new URLSearchParams(location.search), hex = String(q.get('colour') || q.get('color') || '').replace(/^#/, '');
        p = { name: clean(q.get('name'), 24), co: clean(q.get('co'), 48), colour: /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex.toUpperCase() : '' };
        sessionStorage.setItem(WOWP, JSON.stringify(p));
      } catch (e) { }
      return p || {};
    }
    try { p = JSON.parse(sessionStorage.getItem(WOWP) || 'null'); } catch (e) { }
    return p || {};
  }
  function initialsOf(co) {
    var w = co.replace(/\b(Ltd|Limited|LLP|PLC)\b\.?/gi, '').replace(/[^A-Za-z0-9\u00C0-\u024F ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    var i = w.length > 1 ? w.slice(0, 3).map(function (x) { return x.charAt(0); }).join('') : (w[0] || '').slice(0, 2);
    return i.toUpperCase() || 'WS';
  }
  /* put the company on the loaded sample data: every screen, email and invoice reads it from here */
  function brandAs(p) {
    var S = WS.state.settings, ch = false;
    if (p.co && S.name !== p.co) {
      S.name = p.co; S.initials = initialsOf(p.co);
      S.logo = ''; S.logoStack = ''; S.logoName = '';      // the neutral badge says DEMO: their initials instead
      if (S.notify) S.notify.fromName = p.co;
      if (S.xero) S.xero.tenantName = p.co;
      ch = true;
    }
    if (p.colour && S.brand !== p.colour) { S.brand = p.colour; ch = true; }
    return ch;
  }
  WS.beforeBoot = function (boot) {
    if (wowMode()) {
      WS.tourWow = true;
      var wp = wowParams();
      if (wp.name) { WS.ownerFirst = wp.name.charAt(0).toUpperCase() + wp.name.slice(1); WS.ownerLast = ''; }
      if (wowUrl()) {
        try {
          localStorage.removeItem('wsTour:state');
          localStorage.removeItem('wsTour:fitter');
          sessionStorage.removeItem('wsTour:who');
          sessionStorage.removeItem('wsTour:introSeen');
          sessionStorage.setItem('wsTour:urgentSeen', '["*"]');   // the urgent pop ups would slide in over a recording
        } catch (e) { }
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        // the demo's sample Xero link is already on, so an invoice goes across in one click on
        // camera (it is the demo's own stand-in: nothing reaches a real Xero)
        try {
          WS.load();
          var x = WS.state.settings.xero;
          if (x && !WS.xeroOk()) {
            x.key = 'sample-demo-key-0000000000000000'; x.connected = true; x.autoSend = true;
            x.tenantName = WS.state.settings.name; x.lastSync = WS.nowStamp();
          }
          brandAs(wp);
          WS.persist();
        } catch (e) { }
      } else if (wp.co || wp.colour) {
        try { WS.load(); if (brandAs(wp)) WS.persist(); } catch (e) { }
      }
      boot();
      return;
    }
    var l = getLead();
    if (l && WS.validEmail(l.email)) {
      useName(l);
      if (!l.sent) post(l, 1);
      choose(boot);
      return;
    }
    gate(function () { choose(boot); });
  };
})();
