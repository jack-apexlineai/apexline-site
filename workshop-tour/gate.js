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

  WS.beforeBoot = function (boot) {
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
