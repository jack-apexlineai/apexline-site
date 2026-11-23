/* Gemma's enquiry, the simple way. Her email opens on its own, with a suggested reply sitting above the reply box.
   Send it. Half a minute later she answers, a bubble says she wants to book, and "Open and book" goes straight to
   the order with everything filled in. ?nudge=5 in the address makes her answer after 5 seconds.
   Demo only: her answer is scripted and nothing is really sent. */
(function () {
  function start(tries) {
    var UI = window.CACUI, CS = window.CS, V2 = window.CACV2, SK = window.CACSK;
    if (!(UI && CS && CS.S && V2 && V2.x && SK && SK.after)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, ui = UI.ui, ic = window.ic || function () { return ''; };
    var delay = (function () { var v = parseFloat(new URLSearchParams(location.search).get('nudge')); return (v > 0 ? v : 30) * 1000; })();
    function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
    function gem() {
      var l = CS.S.threads.filter(function (t) { return t.party && t.party.type === 'customer' && t.party.id === 'c7' && (t.gx != null || /grab loads of clean soil/i.test((t.msgs[0] || {}).text || '')); });
      return l[0] || null;
    }
    /* the price, supplier and day come from the system's own reading of her first message, worked out once and kept */
    function facts(t) {
      if (t.gxF) return t.gxF;
      var c = CS.cust('c7'), site = (c.sites && c.sites[0]) || { name: 'Wells quay site', pc: 'NR23 1AT' }, F = { qty: 2, site: site.name, pc: site.pc, day: 7, sell: 0, cost: 0, sup: null };
      try {
        var an = CS.analyse(t), ln = an && an.lines && an.lines[0];
        if (ln) { F.sell = an.sell || ln.sell; F.cost = an.cost || ln.cost; F.sup = ln.sup; }
        if (an && an.parsed && typeof an.parsed.day === 'number' && an.parsed.day > 0) F.day = an.parsed.day;
      } catch (e) {}
      if (!F.sell || !F.sup) { try { var b = (CS.lookup(CS.outward(site.pc), { svc: 'grab', qty: 2 }) || [])[0]; if (b) { F.sell = b.sell; F.cost = b.cost; F.sup = b.sup.id; } } catch (e2) {} }
      var su = F.sup ? CS.sup(F.sup) : null; F.supName = su ? su.name : 'your grab supplier'; F.onTime = su ? su.onTime : null;
      F.dayLong = CS.dayDate(F.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
      t.gxF = F; return F;
    }
    function draft(t) {
      var F = facts(t);
      return t.gxDraft != null ? t.gxDraft : 'Hi Gemma,\n\nYes, no problem. 2 grab loads of clean soil from the ' + F.site + ' on ' + F.dayLong + ' comes to ' + money(F.sell) + ' + VAT.\n\nShall I book it in?\n\nCheers, John';
    }
    function card(t) {
      var F = facts(t);
      if (t.gx === 1) return '<div class="gx-line">' + ic('send') + '<span><b>Reply sent to Gemma by email.</b> Waiting for her answer. Demo, nothing is really sent.</span></div>';
      if (t.gx === 2) return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Gemma wants to book</b><span class="tag ok">Ready to book</span></div><p class="gx-p">' + h(F.dayLong) + ', between 8 and 12, on account. 2 grab loads from the ' + h(F.site) + ' with ' + h(F.supName) + '.</p><div class="gx-b"><button class="btn pri" data-act="gxBook">' + ic('check') + 'Open and book</button></div>';
      if (t.gx === 3) return '<div class="gx-line ok">' + ic('circle-check') + '<span><b>Booked' + (t.gxJob ? ', ' + h(t.gxJob) : '') + '.</b> 2 grab loads, ' + h(F.dayLong) + ', 8 to 12, with ' + h(F.supName) + '.</span><button class="btn sm" data-act="go" data-v="orders">Open the diary</button></div>';
      return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Suggested reply</b><span class="tag bad">Hot</span><span class="gx-want">Wants a price</span></div>' +
        '<ul class="gx-facts"><li>' + ic('map-pin') + '<span>Site already on her account: <b>' + h(F.site) + ', ' + h(F.pc) + '</b></span></li>' +
        '<li>' + ic('truck') + '<span><b>' + h(F.supName) + '</b> covers ' + h(CS.outward(F.pc)) + (F.onTime ? ', ' + F.onTime + '% on time' : '') + '</span></li>' +
        '<li>' + ic('calendar') + '<span>' + h(F.dayLong) + ' is a week away, so it should be no problem. Check with the supplier when you book.</span></li></ul>' +
        '<div class="gx-money"><span><small>Their price</small><b>' + money(F.sell) + '</b></span><span><small>Supplier cost</small><b>' + money(F.cost) + '</b></span><span class="gp"><small>Gross profit</small><b>' + money(F.sell - F.cost) + '</b></span></div>' +
        '<textarea id="gxText" rows="6" aria-label="Suggested reply to Gemma">' + h(draft(t)) + '</textarea>' +
        '<div class="gx-b"><button class="btn pri" data-act="gxSend">' + ic('send') + 'Send reply</button><small>Goes by email, the way she wrote in. Change anything first.</small></div>';
    }
    /* Hannah's website enquiry and Lee's WhatsApp get the same simple card: the facts, the money, a reply that reads like John wrote it, one button */
    var SIMPLE = { t3: 'quote', t15: 'book' };
    function ago(ms) { var m = Math.max(1, Math.round((Date.now() - ms) / 60000)); return m < 60 ? m + (m === 1 ? ' minute' : ' minutes') + ' ago' : Math.round(m / 60) + ' hours ago'; }
    function sfacts(t) {
      if (t.sxF) return t.sxF;
      var F = { sell: 0, cost: 0, sup: null, day: 1, idx: 0, pc: '', site: '' };
      try {
        var an = CS.analyse(t), ln = an.lines && an.lines[0];
        F.sell = an.sell; F.cost = an.cost; F.sup = ln && ln.sup; F.desc = ln ? ln.desc : '';
        if (an.parsed) { F.day = an.parsed.day; F.pc = an.parsed.pc || ''; F.site = an.parsed.siteName || ''; }
        (an.drafts || []).forEach(function (d, i) { if (d.to === 'customer') F.idx = i; });
      } catch (e) {}
      var su = F.sup ? CS.sup(F.sup) : null; F.supName = su ? su.name : 'your supplier'; F.onTime = su ? su.onTime : null;
      F.dayLong = CS.dayDate(F.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
      t.sxF = F; return F;
    }
    function sdraft(t) {
      var F = sfacts(t);
      if (t.sxDraft != null) return t.sxDraft;
      if (SIMPLE[t.id] === 'quote') return 'Hi Hannah,\n\nThanks for getting in touch. A 12 yard skip delivered to ' + F.pc + ' on ' + F.dayLong + ' is ' + money(F.sell) + ' + VAT.\n\nOn account is no problem, I just need your company details. Want me to book it in?\n\nCheers, John';
      return 'Hi Lee, yes no problem mate. Grab booked in for tomorrow at the Histon site, ' + money(F.sell) + ' + VAT. Have requested AM, will confirm the window as soon as possible.';
    }
    function scard(t) {
      var F = sfacts(t), quote = SIMPLE[t.id] === 'quote', c = t.party.type === 'customer' ? CS.cust(t.party.id) : null;
      if (t.sx === 1) return quote
        ? '<div class="gx-line ok">' + ic('circle-check') + '<span><b>Quote sent to Hannah.</b> It is on the Quotes page with your other open quotes. Demo, nothing is really sent.</span><button class="btn sm" data-act="go" data-v="quotes">Open quotes</button></div>'
        : '<div class="gx-line ok">' + ic('circle-check') + '<span><b>Booked' + (t.sxJob ? ', ' + h(t.sxJob) : '') + '.</b> ' + h(F.supName) + ' asked for the morning. Lee has his reply on WhatsApp and the confirmation by email. Demo, nothing is really sent.</span><button class="btn sm" data-act="go" data-v="orders">Open the diary</button></div>';
      var live = c ? CS.S.jobs.filter(function (j) { return j.cust === c.id && ['booked', 'confirmed', 'onhire', 'exchange', 'collection'].indexOf(j.status) >= 0; }).length : 0;
      var first = t.msgs[0] || {}, lead = quote ? CS.party(t.party) : null, ph = (t.form && t.form.Phone) || (lead && lead.phone) || '';
      var facts = quote
        ? '<li>' + ic('clock') + '<span>Came in <b>' + ago(first.at || Date.now()) + '</b> from your website. She found you on Google Ads.</span></li>' +
          '<li>' + ic('phone') + '<span>New lead. <b>Ring her now' + (ph ? ' on ' + h(ph) : '') + '</b> while it is fresh, or send this.</span></li>' +
          '<li>' + ic('truck') + '<span><b>' + h(F.supName) + '</b> covers ' + h(CS.outward(F.pc)) + (F.onTime ? ', ' + F.onTime + '% on time' : '') + '</span></li>'
        : '<li>' + ic('users') + '<span>Existing customer: <b>' + h(c ? c.name : '') + '</b>, ' + live + ' live jobs</span></li>' +
          '<li>' + ic('map-pin') + '<span>Site already on his account: <b>' + h(F.site) + ', ' + h(F.pc) + '</b></span></li>' +
          '<li>' + ic('truck') + '<span><b>' + h(F.supName) + '</b> covers ' + h(CS.outward(F.pc)) + (F.onTime ? ', ' + F.onTime + '% on time' : '') + '. Morning asked for.</span></li>';
      return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Suggested reply</b><span class="tag bad">Hot</span><span class="gx-want">' + (quote ? 'Wants a price' : 'Wants to book') + '</span></div>' +
        '<ul class="gx-facts">' + facts + '</ul>' +
        '<div class="gx-money"><span><small>Their price</small><b>' + money(F.sell) + '</b></span><span><small>Supplier cost</small><b>' + money(F.cost) + '</b></span><span class="gp"><small>Gross profit</small><b>' + money(F.sell - F.cost) + '</b></span></div>' +
        '<textarea id="sxText" rows="' + (quote ? 6 : 3) + '" aria-label="Suggested reply">' + h(sdraft(t)) + '</textarea>' +
        '<div class="gx-b"><button class="btn pri" data-act="sxSend" data-id="' + t.id + '">' + ic(quote ? 'send' : 'check') + (quote ? 'Send quote' : 'Book and send') + '</button><small>' + (quote ? 'Goes by email to the address on her form.' : 'Books ' + h(F.supName) + ' and sends Lee this on WhatsApp.') + ' Change anything first.</small></div>';
    }
    function tick(text) {
      try {
        var d = document.createElement('div'); d.className = 'gx-tick'; d.setAttribute('role', 'status');
        d.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i><b>' + h(text) + '</b>';
        document.body.appendChild(d);
        setTimeout(function () { d.classList.add('out'); }, 1100); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1500);
      } catch (e) {}
    }
    A.sxSend = function (el) {
      var t = CS.thread(el.dataset.id); if (!t || !SIMPLE[t.id] || t.sx === 1) return;
      var F = sfacts(t), ta = document.getElementById('sxText'), txt = ((ta && ta.value) || sdraft(t)).trim(), ed = {}; ed[F.idx] = txt;
      var jb = CS.S.counters.job;
      try { CS.approve(t.id, ed); } catch (e) { return; }
      t.sx = 1; t.sxJob = CS.S.counters.job > jb ? 'CAC-' + jb : null; t.unread = false; ui.scrollMsgs = true; CS.commit();
      tick(SIMPLE[t.id] === 'quote' ? 'Quote sent' : 'Booked and sent');
    };
    function paintSimple() {
      var sid = ui.view === 'inbox' ? ui.sel : null, t = sid && SIMPLE[sid] ? CS.thread(sid) : null, old = document.getElementById('gxCard');
      if (!t || !(t.sx === 1 || (!t.done && CS.needsYou(t)))) return false;
      if (ui.gxSel !== t.id) { ui.gxSel = t.id; if (ui.asst !== false) { ui.asst = false; UI.render(); return true; } }
      var comp = document.querySelector('#view .compose'); if (!comp) return true;
      if (old) old.remove();
      var d = document.createElement('div'); d.id = 'gxCard'; d.className = 'gx s' + (t.sx === 1 ? 3 : 0); d.innerHTML = scard(t);
      comp.parentNode.insertBefore(d, comp);
      return true;
    }
    function paint() {
      if (paintSimple()) return;
      var t = gem(), old = document.getElementById('gxCard');
      if (!t || ui.view !== 'inbox' || ui.sel !== t.id) { ui.gxSel = null; if (old) old.remove(); return; }
      if (t.gx == null) t.gx = 0;
      if (ui.gxSel !== t.id) { ui.gxSel = t.id; if (ui.asst !== false) { ui.asst = false; UI.render(); return; } }   /* her email opens on its own, the long assistant column stays shut */
      var comp = document.querySelector('#view .compose'); if (!comp) return;
      if (old) old.remove();
      var d = document.createElement('div'); d.id = 'gxCard'; d.className = 'gx s' + t.gx; d.innerHTML = card(t);
      comp.parentNode.insertBefore(d, comp);
    }
    /* once she has answered, the chip on her conversation says hot, wants to book, to match the bubble */
    var st0 = SK.temp; SK.temp = function (t) {
      if (t && t.gx === 2) return { k: 'hot', label: 'Hot', line: 'Wants to book', next: 'Open and book' };
      return st0.apply(this, arguments);
    };
    var sa = SK.after; SK.after = function () { sa.apply(this, arguments); try { paint(); } catch (e) {} };
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'gxText') { var t = gem(); if (t) t.gxDraft = e.target.value; } });
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'sxText' && ui.sel && SIMPLE[ui.sel]) { var t = CS.thread(ui.sel); if (t) t.sxDraft = e.target.value; } });

    A.gxSend = function () {
      var t = gem(); if (!t) return;
      var el = document.getElementById('gxText'), txt = ((el && el.value) || draft(t)).trim(); if (!txt) return;
      CS.addMsg(t, 'out', txt, { by: 'John' }); t.gx = 1; t.gxAt = Date.now(); t.done = true; t.unread = false; ui.scrollMsgs = true; CS.commit();
      tick('Reply sent');
    };
    function ping() {
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; var ac = new AC(), t0 = ac.currentTime;
        [[880, 0], [1320, 0.14]].forEach(function (n) { var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, t0 + n[1]); g.gain.exponentialRampToValueAtTime(0.12, t0 + n[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.32); o.connect(g); g.connect(ac.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + 0.36); });
        setTimeout(function () { try { ac.close(); } catch (e) {} }, 900);
      } catch (e) {}
    }
    function hideBubble() { var n = document.getElementById('gxNudge'); if (n) n.remove(); }
    function bubble() {
      hideBubble();
      var d = document.createElement('div'); d.className = 'sk-nudge gx-nudge'; d.id = 'gxNudge'; d.setAttribute('role', 'status');
      d.innerHTML = '<span class="sk-av">' + ic('sparkles') + '</span><div class="bd"><b>It looks like Gemma wants to book.</b><small>"Yes please, go ahead for Monday. Between 8 and 12 if you can."</small><div class="sk-acts"><button class="btn sm pri" data-act="gxBook">Open and book</button><button class="btn sm ghost" data-act="gxDismiss">Dismiss</button></div></div>';
      document.body.appendChild(d);
    }
    function answer(t) {
      CS.addMsg(t, 'in', 'Hi John,\n\nYes please, go ahead for Monday. Between 8 and 12 if you can. On account as usual.\n\nThanks, Gemma');
      t.gx = 2; t.done = false; t.unread = !(ui.view === 'inbox' && ui.sel === t.id); CS.commit();
      bubble(); ping();
    }
    setInterval(function () { var t = gem(); if (t && t.gx === 1 && t.gxAt && Date.now() - t.gxAt >= delay) answer(t); else if (t && t.gx !== 2) hideBubble(); }, 500);
    A.gxDismiss = function () { hideBubble(); };
    A.gxBook = function () {
      var t = gem(); if (!t) return; var F = facts(t), c = CS.cust('c7');
      hideBubble(); t.unread = false; CS.save(); ui.gxBooking = t.id;
      V2.x.order({ cust: 'c7', site: 0, cname: c.contact, cphone: c.phone, svc: 'grab', qty: 2, day: F.day, time: '8 to 12', pay: 'account', send: 'email', note: 'Clean soil. From Gemma\'s email.' });
    };
    var op = A.ordPlace;
    A.ordPlace = function (el) {
      var ids = {}; CS.S.jobs.forEach(function (j) { ids[j.id] = 1; });
      op.call(this, el);
      var t = ui.gxBooking ? CS.thread(ui.gxBooking) : null, nj = CS.S.jobs.filter(function (j) { return !ids[j.id] && j.cust === 'c7'; })[0];
      if (t && nj) { t.gx = 3; t.gxJob = nj.id; t.done = true; t.unread = false; ui.gxBooking = null; CS.commit(); }
    };
    /* for the guided tour: make sure the reply has gone and she has answered, then show the bubble */
    window.CACGX = { force: function () {
      var t = gem(); if (!t) { try { t = CS.thread(V2.gemma()); } catch (e) {} } if (!t) return;
      if (t.gx == null) t.gx = 0;
      if (t.gx === 0) { CS.addMsg(t, 'out', draft(t), { by: 'John' }); t.gx = 1; t.gxAt = Date.now(); t.done = true; t.unread = false; }
      if (t.gx === 1) answer(t); else if (t.gx === 2) { CS.commit(); bubble(); }
    }, state: function () { var t = gem(); return t ? t.gx : null; } };
    UI.render();
  }
  start(0);
})();
