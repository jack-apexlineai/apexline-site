/* Gemma's enquiry, the simple way. Her email opens on its own, with a suggested reply sitting above the reply box.
   Send it. Half a minute later she answers, a bubble says she wants to book, and "Open and book" goes straight to
   the order with everything filled in. ?nudge=5 in the address makes her answer after 5 seconds.
   Demo only: her answer is scripted and nothing is really sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, V2 = window.DSGV2, SK = window.DSGSK;
    if (!(UI && CS && CS.S && V2 && V2.x && SK && SK.after)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, ui = UI.ui, ic = window.ic || function () { return ''; };
    var QUIET = new URLSearchParams(location.search).get('quiet') === '1';   /* quiet version: Gemma's scripted answer never comes */
    var delay = (function () { var v = parseFloat(new URLSearchParams(location.search).get('nudge')); return (v > 0 ? v : 30) * 1000; })();
    function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
    function gem() {
      var l = CS.S.threads.filter(function (t) { return t.party && t.party.type === 'customer' && t.party.id === 'c7' && (t.gx != null || /grab (loads of|lorry to take) clean soil/i.test((t.msgs[0] || {}).text || '')); });
      return l[0] || null;
    }
    /* the price, supplier and day come from the system's own reading of her first message, worked out once and kept */
    function facts(t) {
      if (t.gxF) return t.gxF;
      var c = CS.cust('c7'), site = (c.sites && c.sites[0]) || { name: 'Canal wharf site, Willesden', pc: 'NW10 4QB' }, F = { qty: 1, site: site.name, pc: site.pc, day: 7, sell: 0, cost: 0, sup: null };
      try {
        var an = CS.analyse(t), ln = an && an.lines && an.lines[0];
        if (ln) { F.sell = an.sell || ln.sell; F.cost = an.cost || ln.cost; F.sup = ln.sup; }
        if (an && an.parsed && typeof an.parsed.day === 'number' && an.parsed.day > 0) F.day = an.parsed.day;
      } catch (e) {}
      if (!F.sell || !F.sup) { try { var b = (CS.lookup(CS.outward(site.pc), { svc: 'grab', qty: 1 }) || [])[0]; if (b) { F.sell = b.sell; F.cost = b.cost; F.sup = b.sup.id; } } catch (e2) {} }
      var su = F.sup ? CS.sup(F.sup) : null; F.supName = su ? su.name : 'your grab supplier'; F.onTime = su ? su.onTime : null;
      F.dayLong = CS.dayDate(F.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
      t.gxF = F; return F;
    }
    function draft(t) {
      var F = facts(t);
      return t.gxDraft != null ? t.gxDraft : 'Hi Gemma,\n\nYes, no problem. A grab lorry for the clean soil at the ' + F.site + ' on ' + F.dayLong + ' is ' + money(F.sell) + ' + VAT.\n\nShall I book it in?\n\nCheers, Dave';
    }
    function card(t) {
      var F = facts(t);
      if (t.gx === 1) return '<div class="gx-line">' + ic('send') + '<span><b>Reply sent to Gemma by email.</b> ' + (QUIET ? 'Her answer lands in this conversation, and one tap books it.' : 'Waiting for her answer.') + ' Demo, nothing is really sent.</span></div>';
      if (t.gx === 2) return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Gemma wants to book</b><span class="tag ok">Ready to book</span></div><p class="gx-p">' + h(F.dayLong) + ', between 8 and 12, on account. A grab lorry at the ' + h(F.site) + ' with ' + h(F.supName) + '.</p><div class="gx-b"><button class="btn pri" data-act="gxBook">' + ic('check') + 'Open and book</button></div>';
      if (t.gx === 3) return '<div class="gx-line ok">' + ic('circle-check') + '<span><b>Booked' + (t.gxJob ? ', ' + h(t.gxJob) : '') + '.</b> Grab lorry, ' + h(F.dayLong) + ', 8 to 12, with ' + h(F.supName) + '.</span><button class="btn sm" data-act="go" data-v="orders">Open the diary</button></div>';
      return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Suggested reply</b><span class="tag bad">Hot</span><span class="gx-want">Wants a price</span></div>' +
        '<ul class="gx-facts"><li>' + ic('map-pin') + '<span>Site already on her account: <b>' + h(F.site) + ', ' + h(F.pc) + '</b></span></li>' +
        '<li>' + ic('truck') + '<span><b>' + h(F.supName) + '</b> covers ' + h(CS.outward(F.pc)) + (F.onTime ? ', ' + F.onTime + '% on time' : '') + '</span></li>' +
        '<li>' + ic('calendar') + '<span>' + h(F.dayLong) + ' is a week away, so it should be no problem. Check with the supplier when you book.</span></li></ul>' +
        money3(F, 'gx') +
        '<textarea id="gxText" rows="6" aria-label="Suggested reply to Gemma">' + h(draft(t)) + '</textarea>' +
        '<div class="gx-b"><button class="btn pri" data-act="gxSend">' + ic('send') + 'Send reply</button><small>Goes by email, the way she wrote in. Change anything first.</small></div>';
    }
    /* Hannah's website enquiry and Lee's WhatsApp get the same simple card: the facts, the money, a reply that reads like Dave wrote it, one button */
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
      if (SIMPLE[t.id] === 'quote') return 'Hi Hannah,\n\nThanks for getting in touch. A 12 yard skip delivered to ' + F.pc + ' on ' + F.dayLong + ' is ' + money(F.sell) + ' + VAT.\n\nWant me to book it in?\n\nCheers, Dave';
      return 'Hi Lee, yes no problem mate. Grab booked in for tomorrow at the Northolt site, ' + money(F.sell) + ' + VAT. Have requested AM, will confirm the window as soon as possible.';
    }
    /* Undo: the whole state is saved just before an action and put back on Undo (kept in memory, so it lasts until a reload) */
    var SNAP = {};
    function snap(id) { try { SNAP[id] = JSON.stringify(CS.S); } catch (e) {} }
    A.sxUndo = function (el) {
      var id = el.dataset.id, s = SNAP[id]; if (!s) return;
      try { CS.S = JSON.parse(s); } catch (e) { return; }
      delete SNAP[id]; ['lxNudge', 'gxNudge'].forEach(function (k) { var n = document.getElementById(k); if (n && n.parentNode) n.parentNode.removeChild(n); });
      CS.commit(); tick('Undone');
    };
    function undoBtn(id) { return SNAP[id] ? '<button class="btn sm" data-act="sxUndo" data-id="' + id + '">' + ic('refresh') + 'Undo</button>' : ''; }
    function at(ms) { try { return CS.clock(ms); } catch (e) { return ''; } }

    /* Lee: ask the supplier first, they answer, then book it */
    function lsups(t) {
      var F = sfacts(t), L = [];
      try { L = (CS.lookup(CS.outward(F.pc), { svc: 'grab', qty: 1 }) || []).slice(0, 3); } catch (e) {}
      return L.map(function (x) { var su = x.sup && x.sup.id ? x.sup : CS.sup(x.sup); return { id: su.id, name: su.name, contact: su.contact || 'there', cost: x.cost, sell: x.sell, onTime: su.onTime }; });
    }
    function lpick(t) { var L = lsups(t), s = L.filter(function (s) { return s.id === t.lxSup; })[0] || L[0] || { id: sfacts(t).sup, name: sfacts(t).supName, contact: 'there', cost: sfacts(t).cost, sell: sfacts(t).sell }; if (t.lxSell) s.sell = t.lxSell; return s; }
    function lsupMsg(t, s) {
      var F = sfacts(t);
      return 'Hi ' + s.contact + ', can you do a grab lorry for soil and clay at ' + F.site + ', ' + F.pc + ' tomorrow, AM if possible? Confirming ' + money(s.cost) + ' as per your price. Ref Demo Skip & Grab-' + CS.S.counters.job + '. Thanks, Dave (Demo Skip & Grab)';
    }
    function lcustMsg(t) { var s = lpick(t); return t.lxDraft != null ? t.lxDraft : 'Hi Lee, yes no problem mate. Grab booked in for tomorrow at the Northolt site, ' + money(s.sell) + ' + VAT. Have requested AM, will confirm the window as soon as possible.'; }
    /* their price can be typed over: the gross profit and the message change with it */
    function money3(s, k) {
      return '<div class="gx-money" data-cost="' + s.cost + '"><span><small>Their price</small><label class="gx-pin">£<input class="gx-price" data-k="' + (k || '') + '" value="' + Math.round(s.sell) + '" inputmode="numeric" aria-label="Their price"></label></span><span><small>Supplier cost</small><b>' + money(s.cost) + '</b></span><span class="gp"><small>Gross profit</small><b class="gx-gp">' + money(s.sell - s.cost) + ' <em>' + (s.sell ? Math.round((s.sell - s.cost) / s.sell * 100) : 0) + '%</em></b></span></div>';
    }
    function tel(p) { return '<a class="gx-tel" href="tel:' + String(p).replace(/[^\d+]/g, '') + '">' + h(p) + '</a>'; }
    document.addEventListener('input', function (e) {
      var el = e.target; if (!el || !el.classList || !el.classList.contains('gx-price')) return;
      var nv = parseInt(String(el.value).replace(/[^\d]/g, ''), 10); if (!(nv > 0)) return;
      var k = el.dataset.k, t, old, ta, box = el.closest('.gx-money'), cost = Number(box && box.dataset.cost) || 0;
      if (k === 'gx') { t = gem(); if (!t) return; var G = facts(t); old = G.sell; G.sell = nv; ta = document.getElementById('gxText'); }
      else if (k === 'lx') { t = CS.thread('t15'); if (!t) return; old = lpick(t).sell; t.lxSell = nv; t.priceOverride = { 0: nv }; ta = document.getElementById('lxText'); }
      else { t = ui.sel && CS.thread(ui.sel); if (!t) return; var X = sfacts(t); old = X.sell; X.sell = nv; t.priceOverride = { 0: nv }; ta = document.getElementById('sxText'); }
      if (ta && old !== nv) { ta.value = ta.value.split(money(old)).join(money(nv)); ta.dispatchEvent(new Event('input', { bubbles: true })); }
      var gp = box && box.querySelector('.gx-gp'); if (gp) gp.innerHTML = money(nv - cost) + ' <em>' + Math.round((nv - cost) / nv * 100) + '%</em>';
      CS.save();
    });
    /* every step stays on the card, so the history of the job is there to read: asked, answered, booked */
    function lhist(t, s) {
      var r = [];
      if (t.lxAt) r.push('<li>' + ic('whatsapp') + '<span><b>' + at(t.lxAt) + ' Dave asked ' + h(s.name) + '</b><q>' + h(t.lxSent || '') + '</q></span></li>');
      if (t.lxReplyAt) r.push('<li>' + ic('message') + '<span><b>' + at(t.lxReplyAt) + ' ' + h(s.name) + ' replied</b><q>' + h(t.lxReply || '') + '</q></span></li>');
      if (t.lxDoneAt) r.push('<li class="ok">' + ic('circle-check') + '<span><b>' + at(t.lxDoneAt) + ' Booked' + (t.sxJob ? ' ' + h(t.sxJob) : '') + ' by Dave</b>Lee has his reply on WhatsApp and the confirmation by email. ' + h(s.name) + ' has the booking.</span></li>');
      return r.length ? '<ul class="lx-hist">' + r.join('') + '</ul>' : '';
    }
    function lcard(t) {
      var F = sfacts(t), c = CS.cust(t.party.id), s = lpick(t);
      if (t.lx === 3) return '<div class="gx-h"><span class="gx-sp">' + ic('circle-check') + '</span><b>Booked, tomorrow AM with ' + h(s.name) + '</b><span class="tag ok">Done</span></div>' + lhist(t, s) +
        '<div class="gx-b">' + undoBtn(t.id) + '<button class="btn sm" data-act="xh2Dia" data-v="1">Open tomorrow</button><small>Demo, nothing is really sent.</small></div>';
      if (t.lx === 1) return '<div class="gx-h"><span class="gx-sp">' + ic('clock') + '</span><b>Waiting for ' + h(s.name) + '</b><span class="tag">Asked</span></div>' + lhist(t, s) + '<div class="gx-b">' + undoBtn(t.id) + '</div>';
      if (t.lx === 2) return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>' + h(s.name) + ' can do it</b><span class="tag ok">Ready to book</span></div>' +
        lhist(t, s) + money3(s, 'lx') +
        '<textarea id="lxText" rows="3" aria-label="Reply to Lee">' + h(lcustMsg(t)) + '</textarea>' +
        '<div class="gx-b"><button class="btn pri" data-act="lxBook">' + ic('check') + 'Book it</button><small>Books ' + h(s.name) + ', sends Lee this on WhatsApp and emails his confirmation.</small>' + undoBtn(t.id) + '</div>';
      var live = c ? CS.S.jobs.filter(function (j) { return j.cust === c.id && ['booked', 'confirmed', 'onhire', 'exchange', 'collection'].indexOf(j.status) >= 0; }).length : 0, L = lsups(t);
      if (!t.lxSup && L[0]) t.lxSup = L[0].id;
      return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Next step: ask the supplier</b><span class="tag bad">Hot</span><span class="gx-want">Wants to book</span></div>' +
        '<ul class="gx-facts"><li>' + ic('users') + '<span>Existing customer: <b>' + h(c ? c.name : '') + '</b>, ' + live + ' live jobs</span></li><li>' + ic('map-pin') + '<span>Site already on his account: <b>' + h(F.site) + ', ' + h(F.pc) + '</b>. Soil and clay, tomorrow, morning asked for.</span></li><li>' + ic('stack') + '<span>Waste stream: <b>Soil and stones</b>, EWC 17 05 04. Goes on the booking and the waste transfer note.</span></li></ul>' +
        '<div class="lx-sups">' + L.map(function (x, i) { return '<label class="lx-sup' + (x.id === t.lxSup ? ' on' : '') + '"><input type="radio" name="lxSup" value="' + x.id + '"' + (x.id === t.lxSup ? ' checked' : '') + '><span><b>' + h(x.name) + '</b>' + (i === 0 ? '<span class="tag ok">Best pick</span>' : '') + '<small>' + (x.onTime ? x.onTime + '% on time · ' : '') + 'buy ' + money(x.cost) + '</small></span><b class="lx-p">' + money(x.sell - x.cost) + '<small>gross profit</small></b></label>'; }).join('') + '</div>' +
        '<textarea id="lxSupText" rows="3" aria-label="Message to the supplier">' + h(t.lxSupDraft != null ? t.lxSupDraft : lsupMsg(t, s)) + '</textarea>' +
        '<div class="gx-b"><button class="btn pri" data-act="lxAsk">' + ic('whatsapp') + 'Ask ' + h(s.name.split(' ')[0]) + '</button><small>Goes to them on WhatsApp. Book Lee in once they say yes.</small></div>';
    }
    A.lxAsk = function () {
      var t = CS.thread('t15'); if (!t || t.lx) return; var s = lpick(t), ta = document.getElementById('lxSupText');
      snap(t.id);
      var txt = ((ta && ta.value) || lsupMsg(t, s)).trim(), th = CS.threadFor({ type: 'supplier', id: s.id }, 'wa');
      CS.addMsg(th, 'out', txt, { by: 'Dave' }); th.done = true; th.unread = false;
      t.lx = 1; t.lxAt = Date.now(); t.lxSent = txt; t.lxSupTid = th.id; t.unread = false; CS.commit(); tick('Sent to ' + s.name);
    };
    document.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'lxSup') { var t = CS.thread('t15'); if (t) { t.lxSup = e.target.value; t.lxSupDraft = null; CS.save(); UI.render(); } }
    });
    document.addEventListener('input', function (e) {
      var t = CS.thread('t15'); if (!t || !e.target) return;
      if (e.target.id === 'lxSupText') t.lxSupDraft = e.target.value;
      if (e.target.id === 'lxText') t.lxDraft = e.target.value;
    });
    var supDelay = (function () { var v = parseFloat(new URLSearchParams(location.search).get('nudge')); return (v > 0 ? Math.min(v, 3) : 3) * 1000; })();   /* the supplier answers about 3 seconds after Dave asks */
    function lbubble(t) {
      var s = lpick(t), old = document.getElementById('lxNudge'); if (old) old.remove();
      var d = document.createElement('div'); d.className = 'sk-nudge gx-nudge'; d.id = 'lxNudge'; d.setAttribute('role', 'status');
      d.innerHTML = '<span class="sk-av">' + ic('whatsapp') + '</span><div class="bd"><b>' + h(s.name) + ' can do Lee\'s grab. Book it in?</b><small>"' + h(t.lxReply) + '"</small><div class="sk-acts"><button class="btn sm pri" data-act="lxBook">Book it</button><button class="btn sm ghost" data-act="lxOpen">Open</button></div></div>';
      document.body.appendChild(d); ping();
    }
    A.lxOpen = function () { var n = document.getElementById('lxNudge'); if (n) n.remove(); A.openThread({ dataset: { id: 't15' } }); };
    setInterval(function () {
      var t = CS.thread('t15'); if (!t || t.lx !== 1 || !t.lxAt || Date.now() - t.lxAt < supDelay) return;
      var s = lpick(t), th = CS.thread(t.lxSupTid) || CS.threadFor({ type: 'supplier', id: s.id }, 'wa');
      t.lxReply = 'Hi Dave, yes we can do that, no problem. AM is fine.'; t.lxReplyAt = Date.now();
      CS.addMsg(th, 'in', t.lxReply); th.done = true; th.unread = false;
      t.lx = 2; CS.commit(); lbubble(t);
    }, 500);
    A.lxBook = function () {
      var t = CS.thread('t15'); if (!t || t.lx !== 2) return;
      var s = lpick(t), ta = document.getElementById('lxText'), txt = ((ta && ta.value) || lcustMsg(t)).trim();
      var n = document.getElementById('lxNudge'); if (n) n.remove();
      snap(t.id);
      t.supOverride = { 0: s.id }; t.edits = null;
      var An = CS.analyse(t), ed = {}, jb = CS.S.counters.job;
      (An.drafts || []).forEach(function (d, i) { if (d.to === 'customer') ed[i] = txt; else if (d.to === 'supplier') ed[i] = 'Thanks ' + s.contact + ', that\'s booked in. Ref {JOB}. Cheers, Dave (Demo Skip & Grab)'; });
      try { CS.approve(t.id, ed); } catch (e) { return; }
      t.lx = 3; t.lxDoneAt = Date.now(); t.sxJob = CS.S.counters.job > jb ? 'Demo Skip & Grab-' + jb : null; t.done = true; t.unread = false;
      var lj = t.sxJob ? CS.job(t.sxJob) : null; if (lj) { lj.mat = 'Soil and stones'; CS.jobLog(lj, 'Waste stream: Soil and stones, EWC 17 05 04'); }
      var th = CS.thread(t.lxSupTid); if (th) { th.done = true; th.unread = false; }
      ui.scrollMsgs = true;
      /* the same booked screen as every other order: what was booked, the PO, the invoice, who was told */
      var jid = t.sxJob, inv = jid && window.DSGINV ? window.DSGINV(jid) : null, c = CS.cust(t.party.id) || {}, jj = jid ? CS.job(jid) : null, sell = jj ? jj.sell : s.sell;
      CS.commit();
      if (window.DSGDONE) window.DSGDONE((jid || 'Order') + ' is booked', [
        'Grab lorry booked with ' + h(s.name) + ', tomorrow AM, ref ' + h(jid || ''),
        'Purchase order sent to ' + h(s.contact) + ' at ' + h(s.name) + ' on WhatsApp',
        inv ? 'Invoice ' + h(inv.id) + ' raised, ' + money(inv.amount) + ' + VAT, on their ' + h((c.terms || 'account').toLowerCase()) : 'Invoice raised, ' + money(sell) + ' + VAT, on their account',
        'Lee has his reply on WhatsApp',
        'Order confirmation and invoice emailed to ' + h(c.email || 'Lee') + ', each as its own email'
      ]);
      else tick('Booked');
    };

    function scard(t) {
      if (SIMPLE[t.id] === 'book') return lcard(t);
      var F = sfacts(t);
      if (t.sx === 1) {
        var fu = CS.dayDate(CS.wd(3)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
        return '<div class="gx-line ok">' + ic('circle-check') + '<span><b>Quote sent at ' + at(t.sxAt) + ' by Dave, by email.</b> Follow-up due ' + h(fu) + ', it is on the Quotes page. Demo, nothing is really sent.</span>' + undoBtn(t.id) + '<button class="btn sm" data-act="go" data-v="quotes">Open quotes</button></div>';
      }
      var first = t.msgs[0] || {}, lead = CS.party(t.party), ph = (t.form && t.form.Phone) || (lead && lead.phone) || '';
      return '<div class="gx-h"><span class="gx-sp">' + ic('sparkles') + '</span><b>Suggested reply</b><span class="tag bad">Hot</span><span class="gx-want">Wants a price</span></div>' +
        '<ul class="gx-facts"><li>' + ic('clock') + '<span>Came in <b>' + ago(first.at || Date.now()) + '</b> from your website. She found you on Google Ads.</span></li>' +
        '<li>' + ic('phone') + '<span>New lead. <b>Ring her now</b>' + (ph ? ' on ' + tel(ph) : '') + ' while it is fresh, or send this.</span></li>' +
        '<li>' + ic('truck') + '<span><b>' + h(F.supName) + '</b> covers ' + h(CS.outward(F.pc)) + (F.onTime ? ', ' + F.onTime + '% on time' : '') + '</span></li></ul>' +
        money3({ sell: F.sell, cost: F.cost }, 'sx') +
        '<textarea id="sxText" rows="6" aria-label="Suggested reply">' + h(sdraft(t)) + '</textarea>' +
        '<div class="gx-b"><button class="btn pri" data-act="sxSend" data-id="' + t.id + '">' + ic('send') + 'Send quote</button><small>Goes by email to the address on her form. Change anything first.</small></div>';
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
      var t = CS.thread(el.dataset.id); if (!t || SIMPLE[t.id] !== 'quote' || t.sx === 1) return;
      var F = sfacts(t), ta = document.getElementById('sxText'), txt = ((ta && ta.value) || sdraft(t)).trim(), ed = {}; ed[F.idx] = txt;
      snap(t.id);
      try { CS.approve(t.id, ed); } catch (e) { return; }
      t.sx = 1; t.sxAt = Date.now(); t.unread = false; ui.scrollMsgs = true; CS.commit();
      tick('Quote sent');
    };
    function paintSimple() {
      var sid = ui.view === 'inbox' ? ui.sel : null, t = sid && SIMPLE[sid] ? CS.thread(sid) : null, old = document.getElementById('gxCard');
      if (!t || !(t.sx === 1 || t.lx >= 1 || (!t.done && CS.needsYou(t)))) return false;
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
      CS.addMsg(t, 'out', txt, { by: 'Dave' }); t.gx = 1; t.gxAt = Date.now(); t.done = true; t.unread = false; ui.scrollMsgs = true; CS.commit();
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
      CS.addMsg(t, 'in', 'Hi Dave,\n\nYes please, go ahead for Monday. Between 8 and 12 if you can. On account as usual.\n\nThanks, Gemma');
      t.gx = 2; t.done = false; t.unread = !(ui.view === 'inbox' && ui.sel === t.id); CS.commit();
      bubble(); ping();
    }
    setInterval(function () { if (QUIET) return; var t = gem(); if (t && t.gx === 1 && t.gxAt && Date.now() - t.gxAt >= delay) answer(t); else if (t && t.gx !== 2) hideBubble(); }, 500);
    A.gxDismiss = function () { hideBubble(); };
    A.gxBook = function () {
      var t = gem(); if (!t) return; var F = facts(t), c = CS.cust('c7');
      hideBubble(); t.unread = false; CS.save(); ui.gxBooking = t.id;
      V2.x.order({ cust: 'c7', site: 0, cname: c.contact, cphone: c.phone, svc: 'grab', qty: 1, sell: F.sell, mat: 'Soil and stones', day: F.day, time: '8 to 12', pay: 'account', send: 'email', note: 'Clean soil. From Gemma\'s email.' });
    };
    var op = A.ordPlace;
    A.ordPlace = function (el) {
      var ids = {}; CS.S.jobs.forEach(function (j) { ids[j.id] = 1; });
      op.call(this, el);
      var t = ui.gxBooking ? CS.thread(ui.gxBooking) : null, nj = CS.S.jobs.filter(function (j) { return !ids[j.id] && j.cust === 'c7'; })[0];
      if (t && nj) { t.gx = 3; t.gxJob = nj.id; t.done = true; t.unread = false; ui.gxBooking = null; CS.commit(); }
    };
    /* for the guided tour: make sure the reply has gone and she has answered, then show the bubble */
    window.DSGGX = { force: function () {
      if (QUIET) return;
      var t = gem(); if (!t) { try { t = CS.thread(V2.gemma()); } catch (e) {} } if (!t) return;
      if (t.gx == null) t.gx = 0;
      if (t.gx === 0) { CS.addMsg(t, 'out', draft(t), { by: 'Dave' }); t.gx = 1; t.gxAt = Date.now(); t.done = true; t.unread = false; }
      if (t.gx === 1) answer(t); else if (t.gx === 2) { CS.commit(); bubble(); }
    }, state: function () { var t = gem(); return t ? t.gx : null; } };
    UI.render();
  }
  start(0);
})();
