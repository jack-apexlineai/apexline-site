/* Demo Skip & Grab demo, 23 Nov layer: Chase all ETAs (one message per supplier), skips on site as cards with Book exchange and
   Book collection, the bill check's Correct button with a menu, credit control actions (statement, chase, letter
   before action, debt collection), a customer's portal booking landing in the inbox ready to book, and the half four
   check on tomorrow's unpaid orders. Sample data only. Nothing leaves this browser and nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, V2 = window.DSGV2, SK = window.DSGSK;
    if (!(UI && UI.V && UI.A && CS && CS.S && V2 && V2.x && SK && SK.after && UI.V.jobs && UI.V.credit && UI.V.bills && UI.V.reports)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, X = V2.x, ic = window.ic || function () { return ''; };
    var h = CS.esc, money = CS.money;
    function S() { return CS.S; }
    function q(s) { return document.querySelector(s); }
    function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
    function layer(html) { var l = document.getElementById('layer'); if (l) l.innerHTML = html; }
    function closeLayer() { layer(''); }
    function modal(label, title, body, foot, wide) {
      layer('<div class="scrim" data-act="close"></div><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-label="' + h(label) + '"><div class="mhd"><h2>' + title + '</h2><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' + body + '</div>' + (foot ? '<div class="mft">' + foot + '</div>' : '') + '</div>');
    }
    function toast(text, icon) {
      var box = document.getElementById('toasts'); if (!box) return;
      var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(icon || 'circle-check') + '<span>' + text + '</span>';
      box.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 4200);
    }
    function dLong(off) { return CS.dayDate(off).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }); }
    function dayName(off) { return off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : CS.dayDate(off).toLocaleDateString('en-GB', { weekday: 'long' }); }
    function days() { var out = [0, 1], d = 1; while (out.length < 5 && d < 14) { d++; var w = CS.dayDate(d).getDay(); if (w !== 0 && w !== 6) out.push(d); } return out; }
    function first(n) { return String(n || 'there').split(/\s+/)[0]; }
    function onAcc(c) { return c && !/card/i.test(c.terms || ''); }
    function tel(p) { return p ? '<a class="gx-tel" href="tel:' + String(p).replace(/[^\d+]/g, '') + '">' + h(p) + '</a>' : ''; }
    function custEmail(c, text, subject) { var t = CS.newThread({ type: 'customer', id: c.id }, 'email', subject || 'From Demo Skip & Grab'); CS.addMsg(t, 'out', text, { by: 'Dave', conf: true }); t.done = true; t.unread = false; return t; }
    function supWa(su, text) { var t = CS.threadFor({ type: 'supplier', id: su.id }, su.pref === 'email' ? 'email' : 'wa'); CS.addMsg(t, 'out', text, { by: 'Dave' }); t.done = true; t.unread = false; return t; }
    /* the done screen: what just happened, one line each */
    function doneList(title, lines, foot) {
      modal(title, ic('circle-check') + ' ' + h(title), '<ul class="xm-done">' + lines.map(function (l) { return '<li>' + ic('circle-check') + '<span>' + l + '</span></li>'; }).join('') + '</ul><p class="muted" style="font-size:12.5px;margin:10px 0 0">Demo with sample data. Nothing is really sent.</p>',
        foot || '<span class="sp"></span><button class="btn pri" data-act="close">Done</button>');
    }

    /* every pop-up bubble gets an X in the top right that closes it */
    function addX(n) {
      if (!n.classList || !n.classList.contains('sk-nudge') || n.querySelector('.sk-x')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sk-x'; b.setAttribute('aria-label', 'Close'); b.innerHTML = '&times;';
      b.addEventListener('click', function (e) { e.stopPropagation(); if (n.id === 'gxNudge') { var g = S().threads.filter(function (t) { return t.gx === 2; })[0]; if (g) { g.gxShut = true; CS.save(); } } n.remove(); });
      n.appendChild(b);
    }
    [].forEach.call(document.querySelectorAll('.sk-nudge'), addX);
    new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) addX(n); }); }); }).observe(document.body, { childList: true });
    window.DSGDONE = doneList;   /* the same done screen, for Lee's booking in x-gemma.js */
    /* a booking made from the inbox raises its invoice and emails it, the same as New order does */
    function raiseInv(jid) {
      var j = CS.job(jid); if (!j) return null; var ex = S().invoices.filter(function (i) { return i.jobs && i.jobs.indexOf(jid) >= 0; })[0]; if (ex) return ex;
      var c = CS.cust(j.cust), acc = onAcc(c), inv = { id: CS.nextId('inv', 'INV-'), cust: c.id, amount: j.sell, issued: 0, due: acc ? 30 : 0, status: 'unpaid', jobs: [jid], pay: acc ? 'account' : 'link' };
      S().invoices.unshift(inv); CS.jobLog(j, 'Invoiced on ' + inv.id);
      var t = CS.newThread({ type: 'customer', id: c.id }, 'email', 'Invoice ' + inv.id);
      CS.addMsg(t, 'out', 'Hi ' + first(c.contact) + ',\n\nPlease find invoice ' + inv.id + ' attached for ' + jid + ', ' + CS.jobDesc(j).toLowerCase() + ', ' + money(j.sell) + ' + VAT (' + money(j.sell * 1.2) + ' with VAT).\n\n' + (acc ? 'Due on your ' + String(c.terms || '30 day account').toLowerCase() + '.' : 'You can pay by card with the link on the invoice.') + '\n\nThanks,\nDave\nDemo Skip & Grab', { by: 'Dave', att: [{ n: inv.id + '.pdf', t: 'inv', job: inv.id }] });
      return inv;
    }
    window.DSGINV = raiseInv;

    /* ---------- live jobs: chase every ETA in one go, one message per supplier ---------- */
    function etaGroups() {
      var g = {}, order = [];
      X.movesOn(0).forEach(function (r) {
        var tk = X.track(r.j, 0, r.what); if (tk[0] === 'Complete' || tk[2] >= 3) return;
        var id = r.j.sup; if (!g[id]) { g[id] = { su: CS.sup(id), rows: [] }; order.push(id); } g[id].rows.push(r);
      });
      return order.map(function (id) { return g[id]; });
    }
    function etaText(gr) {
      var su = gr.su, n = gr.rows.length;
      var lines = gr.rows.map(function (r) { var s = CS.jobSite(r.j); return '- ' + r.j.id + ', ' + r.what.toLowerCase() + ', ' + (s.name && s.name !== s.pc ? s.name + ', ' : '') + s.pc; }).join('\n');
      return 'Hi ' + first(su.contact) + ', we have ' + (n === 1 ? 'one job' : n + ' jobs') + ' on with you today:\n' + lines + '\nCould we have an ETA on ' + (n === 1 ? 'it' : 'each of these') + ' please? Thanks, Dave (Demo Skip & Grab)';
    }
    A.xmEtaAll = function () {
      var G = etaGroups(); if (!G.length) { toast('Nothing left to chase today.', 'circle-check'); return; }
      var jobs = G.reduce(function (a, g) { return a + g.rows.length; }, 0);
      modal('Chase all ETAs', ic('whatsapp') + ' Chase all ETAs', '<p class="muted" style="margin:0 0 12px;font-size:13px">' + plural(jobs, 'job') + ' with ' + plural(G.length, 'supplier') + '. One message each, covering all their jobs today, by WhatsApp or email, whichever they use. Change anything first.</p>' +
        G.map(function (g, i) { return '<div class="field"><label for="xmEta' + i + '">' + h(g.su.name) + ' <span class="muted">' + plural(g.rows.length, 'job') + ' · ' + (g.su.pref === 'email' ? 'email' : 'WhatsApp') + '</span></label><textarea id="xmEta' + i + '" data-sup="' + h(g.su.id) + '" rows="' + (3 + g.rows.length) + '">' + h(etaText(g)) + '</textarea></div>'; }).join(''),
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="xmEtaGo" id="xmEtaGo">' + ic('send') + 'Send ' + plural(G.length, 'message') + '</button>', true);
    };
    A.xmEtaGo = function () {
      var tas = document.querySelectorAll('#layer textarea[data-sup]'), n = 0, at = CS.clock(Date.now());
      [].forEach.call(tas, function (ta) { var su = CS.sup(ta.dataset.sup), tx = ta.value.trim(); if (su && tx) { supWa(su, tx); n++; } });
      S().xmEtaAt = Date.now(); CS.commit();
      doneList('ETAs chased', [plural(n, 'supplier') + ' asked at ' + at + ', one message each', 'Their answers land in the inbox and the ETA updates on the board']);
    };

    /* ---------- skips on site: cards, with Book exchange and Book collection ---------- */
    function skCard(x) {
      var j = x.j, c = CS.cust(j.cust), s = CS.jobSite(j), pct = Math.min(100, Math.round(x.on / Math.max(1, x.period) * 100));
      var exB = j.exDay != null && j.exDay >= 0 && j.status === 'exchange';
      var st = x.booked ? '<span class="tag web">' + ic('calendar') + 'Collection ' + h(dayName(j.colDay == null ? 1 : j.colDay)) + '</span>' : exB ? '<span class="tag web">' + ic('exchange') + 'Exchange ' + h(dayName(j.exDay)) + '</span>' : x.due ? '<span class="tag bad">' + ic('alert') + (-x.left) + ' days over</span>' : x.soon ? '<span class="tag amber">Due in ' + plural(x.left, 'day') + '</span>' : '<span class="tag ok">' + plural(x.left, 'day') + ' left</span>';
      return '<div class="card xm-sk' + (x.due && !x.booked ? ' due' : '') + '" data-id="' + j.id + '"><div class="xm-sk-top"><span class="xm-sk-ic">' + ic('skip') + '</span><div><b>' + h(CS.jobDesc(j)) + '</b><small>' + j.id + ' · ' + h(x.su.name) + '</small></div>' + st + '</div>' +
        '<div class="xm-sk-who"><b data-act="openJob" data-id="' + j.id + '">' + h(c.name) + '</b><small>' + h(s.name) + ', ' + h(s.pc) + '</small></div>' +
        '<div class="xm-sk-bar"><i style="width:' + pct + '%" class="' + (x.due ? 'bad' : x.soon ? 'amber' : '') + '"></i></div><small class="xm-sk-d">Day ' + x.on + ' of ' + x.period + ' on hire</small>' +
        (x.booked ? '' : '<div class="xm-sk-b"><button class="btn sm xm-sk-mail" data-act="xmSkMail" data-id="' + j.id + '">' + ic('mail') + 'Email customer</button><button class="btn sm" data-act="xmSk" data-v="ex" data-id="' + j.id + '">' + ic('exchange') + 'Book exchange</button><button class="btn sm' + (x.due ? ' pri' : '') + '" data-act="xmSk" data-v="col" data-id="' + j.id + '">' + ic('archive') + 'Book collection</button></div>') + '</div>';
    }
    function skipsCards() {
      var all = X.onSite(), due = all.filter(function (x) { return x.due; }), soon = all.filter(function (x) { return x.soon; });
      var extra = due.reduce(function (a, x) { return a + Math.ceil(-x.left / 7 || 1) * (x.su.weekRate || 0); }, 0);
      return '<div class="grid g4 kpis" style="margin-bottom:16px">' +
        '<div class="card kpi"><small>' + ic('skip') + 'On site now</small><b>' + all.length + '</b><span class="d">skips and hire items out</span></div>' +
        '<div class="card kpi"><small>' + ic('alert') + 'Collection needs booking</small><b' + (due.length ? ' style="color:var(--bad)"' : '') + '>' + due.length + '</b><span class="d">past the supplier\'s hire period</span></div>' +
        '<div class="card kpi"><small>' + ic('clock') + 'Due in the next 3 days</small><b>' + soon.length + '</b><span class="d">worth booking now</span></div>' +
        '<div class="card kpi"><small>' + ic('pound') + 'Extra hire building up</small><b>' + money(extra) + '</b><span class="d">what suppliers will charge if they sit</span></div></div>' +
        (all.length ? '<div class="xm-skgrid" id="xmSkips">' + all.map(skCard).join('') + '</div>' : '<div class="card"><div class="empty">' + ic('circle-check') + 'Nothing on site.</div></div>') +
        '<p class="muted" style="font-size:12.5px;margin:12px 0 0">Each supplier\'s standard hire period comes from the Supplier handbook. Change it there and these cards follow.</p>';
    }
    var jobs0 = V.jobs;
    V.jobs = function () {
      var tabs = [['live', 'Live jobs today'], ['skips', 'Skips on site']], tab = ui.jobTab === 'skips' ? 'skips' : 'live';
      if (tab === 'skips') return '<div class="row" style="flex-wrap:wrap;margin-bottom:14px"><div class="seg" id="jobTabs">' + tabs.map(function (x) { return '<button data-act="jobTab" data-v="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><span class="sp"></span><button class="btn" data-act="go" data-v="orders">' + ic('calendar') + 'Order diary</button><button class="btn pri" data-act="newOrder">' + ic('plus') + 'New order</button></div>' + skipsCards();
      var html = jobs0.apply(this, arguments), n = etaGroups().length;
      if (n) html = html.replace('<span class="muted xwhint">', '<button class="btn sm pri xm-etaall" data-act="xmEtaAll" id="xmEtaAll">' + ic('whatsapp') + 'Chase all ETAs</button><span class="muted xwhint">');
      return html;
    };
    /* email the customer about their skip: how long it has been out, exchange or collection? */
    function skMailText(x) {
      var j = x.j, c = CS.cust(j.cust), s = CS.jobSite(j), place = (s.name && s.name !== s.pc ? s.name + ', ' : '') + s.pc;
      return 'Hi ' + first(c.contact) + ',\n\nYour ' + CS.jobDesc(j).toLowerCase() + ' at ' + place + ' (' + j.id + ') has been on site for ' + plural(x.on, 'day') + '. ' +
        (x.due ? 'The hire period was ' + plural(x.period, 'day') + ', so extra hire is now building up at ' + money(x.su.weekRate || 25) + ' a week.' : 'The hire period is ' + plural(x.period, 'day') + ', so it is due ' + (x.left <= 0 ? 'now' : 'in ' + plural(x.left, 'day')) + '.') +
        '\n\nWould you like us to book an exchange or a collection? Just reply with the day and we will sort it.\n\nThanks,\nDave\nDemo Skip & Grab';
    }
    A.xmSkMail = function (el) {
      var x = X.onSite().filter(function (o) { return o.j.id === el.dataset.id; })[0]; if (!x) return; var c = CS.cust(x.j.cust);
      modal('Email the customer', ic('mail') + ' Email ' + h(c.name), '<p class="muted" style="margin:0 0 8px;font-size:13px">To ' + h(c.contact) + ', ' + h(c.email || '') + '. Change anything first.</p><div class="field"><textarea id="xmSkMailText" rows="10">' + h(skMailText(x)) + '</textarea></div>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="xmSkMailGo" data-id="' + x.j.id + '" id="xmSkMailGo">' + ic('send') + 'Send</button>', true);
    };
    A.xmSkMailGo = function (el) {
      var j = CS.job(el.dataset.id), tx = ((q('#xmSkMailText') || {}).value || '').trim(); if (!j || !tx) return; var c = CS.cust(j.cust);
      custEmail(c, tx, 'Your skip, ' + j.id); CS.jobLog(j, 'Customer emailed about exchange or collection'); j.skMailed = Date.now(); CS.commit();
      doneList('Email sent', ['Emailed ' + h(c.contact) + ' at ' + CS.clock(Date.now()) + ', exchange or collection?', 'Their reply lands in the inbox, and Book exchange or Book collection is one tap from there']);
    };
    var SKP = {};
    A.xmSk = function (el) {
      var j = CS.job(el.dataset.id); if (!j) return; var ex = el.dataset.v === 'ex', c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup);
      SKP = { id: j.id, ex: ex, day: SKP.id === j.id && SKP.ex === ex && SKP.day != null ? SKP.day : 1 };
      modal(ex ? 'Book an exchange' : 'Book a collection', ic(ex ? 'exchange' : 'archive') + ' ' + (ex ? 'Book an exchange' : 'Book a collection'),
        '<dl class="kv"><dt>Skip</dt><dd>' + h(CS.jobDesc(j)) + ' · ' + j.id + '</dd><dt>Customer</dt><dd>' + h(c.name) + '</dd><dt>Site</dt><dd>' + h(s.name) + ', ' + h(s.pc) + '</dd><dt>Supplier</dt><dd>' + h(su.name) + '</dd>' + (ex ? '<dt>Price</dt><dd>' + money(j.sell) + ' + VAT, ' + (onAcc(c) ? 'on their account' : 'payment link with the invoice') + '</dd>' : '') + '</dl>' +
        '<div class="field" style="margin-top:12px"><label>Which day?</label><div class="chips" id="xmSkDays">' + days().map(function (d) { return '<button type="button" class="pk' + (SKP.day === d ? ' on' : '') + '" data-act="xmSkDay" data-v="' + d + '">' + h(d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : CS.dayDate(d).toLocaleDateString('en-GB', { weekday: 'short' })) + '</button>'; }).join('') + '</div></div>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="xmSkGo" id="xmSkGo">' + ic('check') + (ex ? 'Book the exchange' : 'Book the collection') + '</button>');
    };
    A.xmSkDay = function (el) { SKP.day = Number(el.dataset.v); [].forEach.call(document.querySelectorAll('#xmSkDays .pk'), function (b) { b.classList.toggle('on', Number(b.dataset.v) === SKP.day); }); };
    A.xmSkGo = function () {
      var j = CS.job(SKP.id); if (!j) { closeLayer(); return; }
      var ex = SKP.ex, d = SKP.day == null ? 1 : SKP.day, c = CS.cust(j.cust), s = CS.jobSite(j), su = CS.sup(j.sup), when = dLong(d), place = (s.name && s.name !== s.pc ? s.name + ', ' : '') + s.pc, inv = null;
      if (ex) { j.status = 'exchange'; j.exDay = d; } else { j.status = 'collection'; j.colDay = d; }
      CS.jobLog(j, (ex ? 'Exchange' : 'Collection') + ' booked for ' + when + ' by Dave');
      supWa(su, 'Hi ' + first(su.contact) + ', can you do ' + (ex ? 'an exchange on' : 'a collection of') + ' the ' + CS.jobDesc(j).toLowerCase() + ' at ' + place + ', ' + when + ' please. Ref ' + j.id + '. Thanks, Dave (Demo Skip & Grab)');
      if (ex) {
        inv = CS.nextId('inv', 'INV-');
        S().invoices.unshift({ id: inv, cust: c.id, amount: j.sell, issued: 0, due: onAcc(c) ? 30 : 0, status: 'unpaid', jobs: [j.id], pay: onAcc(c) ? 'account' : 'link' });
        CS.jobLog(j, 'Exchange invoiced on ' + inv);
      }
      custEmail(c, 'Hi ' + first(c.contact) + ',\n\nYour ' + (ex ? 'exchange' : 'collection') + ' is booked. ' + CS.jobDesc(j) + ' at ' + place + ', ' + when + '. Ref ' + j.id + '.' + (inv ? '\n\nInvoice ' + inv + ' for ' + money(j.sell) + ' + VAT is attached' + (onAcc(c) ? ', on your account.' : ', with a link to pay by card.') : '') + '\n\nThanks, Dave\nDemo Skip & Grab', (ex ? 'Exchange' : 'Collection') + ' booked, ' + j.id);
      CS.commit();
      doneList(ex ? 'Exchange booked' : 'Collection booked', [
        (ex ? 'Exchange' : 'Collection') + ' booked with ' + h(su.name) + ', ' + h(when),
        h(su.name) + ' sent the booking on WhatsApp',
        inv ? 'Invoice ' + inv + ' raised, ' + money(j.sell) + ' + VAT' : 'No charge, the collection is part of the hire',
        'Confirmation' + (inv ? ' and invoice' : '') + ' emailed to ' + h(first(c.contact)) + ' at ' + h(c.name)
      ]);
    };

    /* ---------- bill check: Correct, and a menu for the rest ---------- */
    function ordOf(id) { var o = CS.job(id); if (!o && window.DSGV3 && window.DSGV3.find) { try { o = window.DSGV3.find(id); } catch (e) { o = null; } } return o && o.cust ? o : null; }
    var bills0 = V.bills;
    V.bills = function () {
      var html = bills0.apply(this, arguments);
      var bl = (S().v3 && S().v3.bill && S().v3.bill.lines) || [];
      return html.replace(/<button class="btn sm" data-act="billLine" data-i="(\d+)" data-v="accept">It is right<\/button>/g, function (_, i) {
        var l = bl[Number(i)], onJob = !!(l && /hire|weight/i.test(l.type || '') && ordOf(l.ref));   /* only charges the customer caused: extra hire, overweight */
        return '<span class="xm-bl"><button class="btn sm" data-act="billLine" data-i="' + i + '" data-v="accept">' + ic('check') + 'Correct</button>' +
          '<details class="xm-dots"><summary class="btn sm" aria-label="More for this line">&#8943;</summary><div class="xm-menu">' +
          '<button data-act="billDraft">' + ic('mail') + 'Raise a dispute with the supplier</button>' +
          (onJob ? '<button data-act="xmRecharge" data-i="' + i + '">' + ic('receipt') + 'Raise an invoice to the customer</button>' : '') +
          '<button data-act="billLine" data-i="' + i + '" data-v="accept">' + ic('x') + 'Dismiss</button></div></details></span>';
      }).replace(/>Accepted<\/span>/g, '>Accepted</span>');
    };
    A.xmRecharge = function (el) {
      var b = S().v3 && S().v3.bill, l = b && b.lines[Number(el.dataset.i)]; if (!l) return;
      var j = ordOf(l.ref), c = j && CS.cust(j.cust), amt = Math.round((l.over || 0) * 1.2 / 5) * 5 || l.over;
      if (!c) { toast('That line is not on one of your orders, so there is no customer to charge.', 'alert'); return; }
      var inv = CS.nextId('inv', 'INV-');
      S().invoices.unshift({ id: inv, cust: c.id, amount: amt, issued: 0, due: onAcc(c) ? 30 : 0, status: 'unpaid', jobs: [j.id], pay: onAcc(c) ? 'account' : 'link' });
      if (CS.job(j.id)) CS.jobLog(j, (l.type || 'Extra charge') + ' recharged to the customer on ' + inv);
      var pc = ''; try { pc = CS.jobSite(j).pc; } catch (e) {}
      custEmail(c, 'Hi ' + first(c.contact) + ',\n\nThe supplier has charged ' + String(l.type || 'an extra').toLowerCase() + ' on ' + j.id + (pc ? ' at ' + pc : '') + '. Invoice ' + inv + ' for ' + money(amt) + ' + VAT is attached.\n\nAny questions, just reply.\n\nThanks, Dave\nDemo Skip & Grab', 'Invoice ' + inv);
      l.st = 'accept'; CS.commit();
      doneList('Recharged to the customer', ['Invoice ' + inv + ' raised to ' + h(c.name) + ', ' + money(amt) + ' + VAT', 'Emailed to ' + h(first(c.contact)) + ' with the supplier\'s reason', 'The line is marked done, so you pay the supplier and keep your gross profit']);
    };

    /* ---------- credit control: statement, chase, letter before action, debt collection ---------- */
    function owedOf(c) {
      var inv = S().invoices.filter(function (i) { return i.cust === c.id && i.status !== 'paid'; });
      var over = inv.filter(function (i) { return (i.issued || 0) + (i.due || 0) < 0; });
      return { inv: inv, total: inv.reduce(function (a, i) { return a + i.amount; }, 0), over: over, overdue: over.reduce(function (a, i) { return a + i.amount; }, 0), worst: over.reduce(function (a, i) { return Math.max(a, -((i.issued || 0) + (i.due || 0))); }, 0) };
    }
    var CR = {
      statement: { n: 'Send statement', ic: 'file-text', t: function (c, o) { return 'Hi ' + first(c.contact) + ',\n\nPlease find your statement attached. You have ' + plural(o.inv.length, 'open invoice') + ' totalling ' + money(o.total) + (o.overdue ? ', of which ' + money(o.overdue) + ' is overdue' : '') + '.\n\nAny questions, just reply.\n\nThanks, Dave\nDemo Skip & Grab'; } },
      chase: { n: 'Chase payment', ic: 'bell', t: function (c, o) { var l = (o.over.length ? o.over : o.inv).map(function (i) { return i.id; }).join(', '); return 'Hi ' + first(c.contact) + ',\n\nJust a reminder that ' + l + (o.over.length ? ', totalling ' + money(o.overdue) + ', ' + (o.over.length === 1 ? 'is' : 'are') + ' now ' + plural(o.worst, 'day') + ' overdue' : ' ' + (o.inv.length === 1 ? 'is' : 'are') + ' open') + '. Could you let me know when we can expect payment?\n\nThanks, Dave\nDemo Skip & Grab'; } },
      lba: { n: 'Send letter before action', ic: 'alert', t: function (c, o) { return 'Letter before action\n\nDear ' + c.contact + ',\n\n' + c.name + ' owes Demo Skip & Grab ' + money(o.overdue || o.total) + ' on ' + (o.over.length ? o.over : o.inv).map(function (i) { return i.id; }).join(', ') + ', now overdue despite our reminders.\n\nIf this is not paid in full within 14 days of this letter, we intend to start court proceedings to recover the debt without further notice. We may also claim interest and compensation under the Late Payment of Commercial Debts (Interest) Act 1998.\n\nIf you dispute the debt or want to agree a payment plan, contact us now.\n\nYours sincerely,\nDave Archer\nDemo Skip & Grab'; } },
      debt: { n: 'Hand to debt collection', ic: 'lock', t: function (c, o) { return 'To your debt collection agency\n\nPlease take on collection of ' + money(o.overdue || o.total) + ' owed by ' + c.name + ' (' + c.contact + ', ' + (c.phone || '') + '). Invoices ' + (o.over.length ? o.over : o.inv).map(function (i) { return i.id; }).join(', ') + ' attached, with the statement and the full chase history.\n\nThanks, Dave\nDemo Skip & Grab'; } }
    };
    var credit0 = V.credit;
    V.credit = function () {
      var html = credit0.apply(this, arguments);
      return html.replace(/(<button class="btn sm(?: pri)?" data-act="stopToggle" data-id="([^"]+)"[\s\S]*?<\/button>)/g, function (m, b, id) {
        var c = CS.cust(id); if (!c || !owedOf(c).total) return '<span class="xm-crb">' + b + '</span>';
        return '<details class="xm-dots xm-crm"><summary class="btn sm" aria-label="Chase ' + h(c.name) + '">' + ic('mail') + '<span class="hide-sm">Chase</span></summary><div class="xm-menu">' +
          Object.keys(CR).map(function (k) { return '<button data-act="xmCr" data-k="' + k + '" data-id="' + h(id) + '">' + ic(CR[k].ic) + CR[k].n + '</button>'; }).join('') + '</div></details>' + b;
      }).replace(/<details class="xm-dots xm-crm">([\s\S]*?)<\/details>(<button class="btn sm(?: pri)?" data-act="stopToggle"[\s\S]*?<\/button>)/g, function (m, d, b) {
        return '<span class="xm-crb"><details class="xm-dots xm-crm">' + d + '</details>' + b + '</span>';
      });
    };
    A.xmCr = function (el) {
      var c = CS.cust(el.dataset.id), k = el.dataset.k, R = CR[k]; if (!c || !R) return; var o = owedOf(c);
      modal(R.n, ic(R.ic) + ' ' + R.n + ', ' + h(c.name), '<p class="muted" style="margin:0 0 8px;font-size:13px">' + (k === 'debt' ? 'Goes to your debt collection agency. The account goes on stop.' : 'To ' + h(c.contact) + ', ' + h(c.email || '') + '. Change anything first.') + '</p>' +
        '<div class="field"><textarea id="xmCrText" rows="' + (k === 'lba' ? 15 : 9) + '">' + h(R.t(c, o)) + '</textarea></div>' + (k === 'lba' ? '<p class="muted" style="font-size:12px;margin:6px 0 0">A template. Have your solicitor check the wording once before you first use it.</p>' : ''),
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="xmCrGo" data-k="' + k + '" data-id="' + h(c.id) + '" id="xmCrGo">' + ic('send') + (k === 'debt' ? 'Hand it over' : 'Send') + '</button>', true);
    };
    A.xmCrGo = function (el) {
      var c = CS.cust(el.dataset.id), k = el.dataset.k, tx = ((q('#xmCrText') || {}).value || '').trim(); if (!c || !tx) return;
      var o = owedOf(c), lines = [];
      if (k === 'debt') { c.stop = true; lines = [money(o.overdue || o.total) + ' handed to your debt collection agency', 'Invoices, statement and chase history sent with it', h(c.name) + ' put on stop, so no one can book for them']; }
      else { custEmail(c, tx, CR[k].n); lines = [CR[k].n.replace(/^Send /, '').replace(/^./, function (x) { return x.toUpperCase(); }) + ' emailed to ' + h(c.contact) + ' at ' + CS.clock(Date.now()), 'Logged on ' + h(c.name) + '\'s account with the date'];
        if (k === 'lba') lines.push('Next step in 14 days: hand to debt collection, if not paid'); }
      S().xmCr = S().xmCr || {}; S().xmCr[c.id] = { k: k, at: Date.now() };
      CS.commit(); doneList(k === 'debt' ? 'Handed to debt collection' : 'Sent', lines);
    };

    /* ---------- a booking from the customer's own page: lands in the inbox, ready to book ---------- */
    function pxThread(id) { var t = CS.thread(id); return t && t.portalReq && !t.portalReq.quote ? t : null; }
    function pxFacts(t) {
      var F = { sell: (t.portalReq && t.portalReq.price) || 0, cost: 0, sup: null, supName: 'your supplier', onTime: null };
      try { var an = CS.analyse(t), ln = an.lines && an.lines[0]; if (ln) { F.cost = an.cost || ln.cost; F.sup = ln.sup; if (an.sell) F.sell = an.sell; } } catch (e) {}
      var su = F.sup ? CS.sup(F.sup) : null; if (su) { F.supName = su.name; F.onTime = su.onTime; }
      return F;
    }
    function pxCard(t) {
      var c = CS.cust(t.party.id), R = t.portalReq, F = pxFacts(t);
      if (t.pxSup) F.supName = t.pxSup;
      if (t.pxDone) return '<div class="gx-h"><span class="gx-sp">' + ic('circle-check') + '</span><b>Booked' + (t.pxJob ? ' ' + h(t.pxJob) : '') + ' at ' + CS.clock(t.pxDone) + ' by Dave</b><span class="tag ok">Done</span></div><ul class="lx-hist"><li class="ok">' + ic('circle-check') + '<span><b>' + h(F.supName) + ' booked</b>The order went to them on WhatsApp.</span></li><li class="ok">' + ic('circle-check') + '<span><b>' + h(first(c.contact)) + ' has the confirmation by email</b>' + (onAcc(c) ? 'Invoice with it, on their account.' : 'Invoice with a pay by card link. If it is not paid by half four the day before, you get told.') + '</span></li></ul>';
      return '<div class="gx-h"><span class="gx-sp">' + ic('world') + '</span><b>' + h(c.name) + ' booked on their page</b><span class="tag bad">Hot</span><span class="gx-want">Wants to book</span></div>' +
        '<ul class="gx-facts"><li>' + ic('skip') + '<span><b>' + h(R.what) + '</b>, ' + h(R.day) + '</span></li><li>' + ic('map-pin') + '<span>' + h(R.site) + '</span></li>' +
        '<li>' + ic('truck') + '<span><b>' + h(F.supName) + '</b>' + (F.onTime ? ', ' + F.onTime + '% on time,' : '') + ' can do this, no problem.</span></li>' +
        '<li>' + ic('pound') + '<span>' + (onAcc(c) ? 'On account. The invoice goes with the confirmation.' : 'Not on account. A pay by card link goes with the confirmation.') + '</span></li></ul>' +
        '<div class="gx-money"><span><small>Their agreed rate</small><b>' + money(F.sell) + '</b></span><span><small>Supplier cost</small><b>' + money(F.cost) + '</b></span><span class="gp"><small>Gross profit</small><b>' + money(F.sell - F.cost) + '</b></span></div>' +
        '<div class="gx-b"><button class="btn pri" data-act="xpBook" data-id="' + t.id + '">' + ic('check') + 'Book it</button><small>Books ' + h(F.supName) + ', raises the invoice and emails ' + h(first(c.contact)) + ' the confirmation.</small></div>';
    }
    A.xpBook = function (el) {
      var t = pxThread(el.dataset.id); if (!t || t.pxDone) return; var jb = S().counters.job, F = pxFacts(t);
      var n = document.getElementById('xpNudge'); if (n) n.remove();
      try { CS.approve(t.id); } catch (e) { toast('Could not book that one. Open it and book it by hand.', 'alert'); return; }
      t.pxDone = Date.now(); t.pxJob = S().counters.job > jb ? 'Demo Skip & Grab-' + jb : null; t.done = true; t.unread = false; ui.scrollMsgs = true;
      var pinv = t.pxJob ? raiseInv(t.pxJob) : null; CS.commit();
      var c = CS.cust(t.party.id); t.pxSup = F.supName;
      doneList((t.pxJob || 'Order') + ' is booked', ['Order ' + (t.pxJob || '') + ' placed with ' + h(F.supName) + ', purchase order sent to them', 'Invoice ' + (pinv ? pinv.id + ' ' : '') + 'raised, ' + money(F.sell) + ' + VAT' + (onAcc(c) ? ', on account' : ', with a pay by card link'), 'Order confirmation and invoice emailed to ' + h(first(c.contact)) + ', each as its own email']);
    };
    function pxPaint() {
      var old = document.getElementById('xpCard'), t = ui.view === 'inbox' && ui.sel ? pxThread(ui.sel) : null;
      if (!t) { if (old) old.remove(); return; }
      if (ui.pxSel !== t.id) { ui.pxSel = t.id; if (ui.asst !== false) { ui.asst = false; UI.render(); return; } }
      var comp = document.querySelector('#view .compose'); if (!comp) return;
      if (old) old.remove();
      var d = document.createElement('div'); d.id = 'xpCard'; d.className = 'gx s0'; d.innerHTML = pxCard(t);
      comp.parentNode.insertBefore(d, comp);
    }
    var sa = SK.after; SK.after = function () { sa.apply(this, arguments); try { pxPaint(); } catch (e) {} };
    /* the bubble when a booking comes in from a customer's page */
    function pxBubble(t) {
      var c = CS.cust(t.party.id), R = t.portalReq, old = document.getElementById('xpNudge'); if (old) old.remove();
      var d = document.createElement('div'); d.className = 'sk-nudge gx-nudge'; d.id = 'xpNudge'; d.setAttribute('role', 'status');
      d.innerHTML = '<span class="sk-av">' + ic('world') + '</span><div class="bd"><b>' + h(c.name) + ' wants to book.</b><small>' + h(R.what) + ', ' + h(R.day) + '. Booked on their page.</small><div class="sk-acts"><button class="btn sm pri" data-act="xpOpen" data-id="' + t.id + '">Open and book</button><button class="btn sm ghost" data-act="xpX">Dismiss</button></div></div>';
      document.body.appendChild(d); if (SK.ping) SK.ping();
    }
    A.xpOpen = function (el) { var n = document.getElementById('xpNudge'); if (n) n.remove(); A.openThread({ dataset: { id: el.dataset.id } }); };
    A.xpX = function () { var n = document.getElementById('xpNudge'); if (n) n.remove(); };
    setInterval(function () {
      var l = S().threads.filter(function (t) { return t.portalReq && !t.portalReq.quote && !t.done && !t.pxSeen; });
      if (!l.length) return; var t = l[l.length - 1]; l.forEach(function (x) { x.pxSeen = true; }); CS.save();
      if (!(ui.view === 'inbox' && ui.sel === t.id)) pxBubble(t);
    }, 800);
    /* for the tour: a booking from Hexley's page, a few days out, if nobody has made one */
    window.DSGPX = { demo: function () {
      var c = CS.cust('c6'); if (!c) return; var d = CS.wd(3), s = c.sites[0];
      var text = 'Portal request. Existing customer: ' + c.name + '. Existing site: ' + s.name + ' ' + s.pc + '. Wants: an 8 yard skip, ' + dLong(d) + '. Had before on this site. Please book it at their agreed rate.';
      var t = CS.incoming({ party: { type: 'customer', id: c.id }, ch: 'portal', subject: 'Portal booking request', text: text });
      t.portalReq = { what: 'An 8 yard skip', site: s.name + ', ' + s.pc, day: dLong(d), quote: false, price: null }; t.portalReq.price = pxFacts(t).sell; t.pxSeen = true; CS.commit();
      return t.id;
    } };

    /* ---------- half four: tomorrow's orders not on account and not paid ---------- */
    var ONEOFF = [['Mrs Diane Palmer', '07700 900411', 'diane.palmer@example.com', '14 Mill Lane', 'UB6 6BE', 6], ['Kev Sharman', '07700 900432', 'kev.sharman@example.com', '3 Church Close', 'W7 5AT', 8], ['Steph Moran', '07700 900447', 'steph.moran@example.com', '27 Wodehouse Road', 'W7 6JD', 4]];
    function seed430() {
      var s = S(); if (s.xu430) return; s.xu430 = 1;
      ONEOFF.forEach(function (o, i) {
        var id = 'c' + (s.customers.length + 60), b = (CS.lookup(CS.outward(o[4]), { svc: 'skip', size: o[5], qty: 1 }) || [])[0]; if (!b) return;
        var c = { id: id, limit: 0, name: o[0], contact: o[0].replace(/^Mrs /, ''), first: o[0].replace(/^Mrs /, '').split(' ')[0], phone: o[1], email: o[2], type: 'Householder', terms: 'Card on order', owner: 'dave', sites: [{ name: o[3], pc: o[4] }] };
        s.customers.push(c);
        var jid = CS.nextId('job', 'Demo Skip & Grab-'), j = { id: jid, cust: id, site: 0, svc: 'skip', size: o[5], qty: 1, sup: b.sup.id, cost: b.cost, sell: b.sell, status: 'booked', day: 1, bookedAt: Date.now() - (5 - i) * 3600000, wtn: 'pending', owner: 'dave', log: [], contact: { name: c.contact, phone: c.phone }, note: '', eta: null };
        CS.jobLog(j, 'Booked on the website, pay by card link sent'); s.jobs.push(j);
        s.invoices.unshift({ id: CS.nextId('inv', 'INV-'), cust: id, amount: b.sell, issued: 0, due: 0, status: 'unpaid', jobs: [jid], pay: 'link' });
      });
      CS.save();
    }
    function unpaid() {
      return S().jobs.filter(function (j) { return j.day === 1 && !(S().xCancel && S().xCancel[j.id]); }).map(function (j) {
        var c = CS.cust(j.cust), inv = S().invoices.filter(function (i) { return i.jobs && i.jobs.indexOf(j.id) >= 0; })[0];
        return { j: j, c: c, inv: inv };
      }).filter(function (r) { return r.c && !onAcc(r.c) && r.inv && r.inv.status !== 'paid'; });
    }
    function u430Body() {
      var L = unpaid();
      if (!L.length) return '<div class="note" style="background:var(--ok-l)">' + ic('circle-check') + '<span>Everything going out tomorrow is paid or on account.</span></div>';
      return '<p class="xm-430">' + ic('alert') + '<span><b>By the way, Dave, you have ' + plural(L.length, 'order') + ' for tomorrow not paid yet. None are on account.</b> Sort them now, before the supplier goes out.</span></p>' +
        '<div class="xm-430l">' + L.map(function (r) {
          var j = r.j, s = CS.jobSite(j);
          return '<div class="xm-430r" data-id="' + j.id + '"><div class="who"><b>' + h(r.c.name) + '</b><small>' + h(CS.jobDesc(j)) + ' · ' + h(s.name) + ', ' + h(s.pc) + ' · ' + j.id + '</small><small>' + money(j.sell * 1.2) + ' with VAT · link sent, not paid · ' + tel(r.c.phone) + '</small></div>' +
            '<div class="xm-430b"><a class="btn sm pri" href="tel:' + String(r.c.phone).replace(/[^\d+]/g, '') + '">' + ic('phone') + 'Call</a><button class="btn sm" data-act="xu430" data-k="link" data-id="' + j.id + '">' + ic('send') + 'Send link again</button><button class="btn sm" data-act="xu430" data-k="delay" data-id="' + j.id + '">' + ic('calendar') + 'Move a day</button><button class="btn sm" data-act="xu430" data-k="cancel" data-id="' + j.id + '">' + ic('x') + 'Cancel</button></div></div>';
        }).join('') + '</div><p class="muted" style="font-size:12.5px;margin:10px 0 0">Payment links go through Stripe. When one is paid, the order is marked paid on its own and drops off this list.</p>';
    }
    A.xu430 = function (el) {
      seed430();
      var k = el && el.dataset && el.dataset.k, j = k ? CS.job(el.dataset.id) : null;
      if (j) {
        var c = CS.cust(j.cust), su = CS.sup(j.sup), s = CS.jobSite(j);
        if (k === 'link') { custEmail(c, 'Hi ' + first(c.contact) + ', just a reminder your ' + CS.jobDesc(j).toLowerCase() + ' is booked for tomorrow. Please pay by the link in your confirmation email so we can send it out. Thanks, Dave, Demo Skip & Grab', 'Payment for ' + j.id); CS.jobLog(j, 'Payment link sent again at half four'); toast('Link sent again to ' + h(first(c.contact)) + '.', 'send'); }
        if (k === 'delay') { j.day = CS.wd(2); CS.jobLog(j, 'Moved a day, not paid by half four'); supWa(su, 'Hi ' + first(su.contact) + ', can we move ' + j.id + ' at ' + s.pc + ' to ' + dLong(j.day) + ' please. Thanks, Dave (Demo Skip & Grab)'); custEmail(c, 'Hi ' + first(c.contact) + ', as the payment has not come through yet we have moved your skip to ' + dLong(j.day) + '. Pay by the link and it goes out that day. Thanks, Dave, Demo Skip & Grab', 'Your skip, ' + j.id); toast(j.id + ' moved to ' + h(dLong(j.day)) + '. Supplier and customer told.', 'calendar'); }
        if (k === 'cancel') { S().xCancel = S().xCancel || {}; S().xCancel[j.id] = { at: Date.now(), why: 'Not paid by half four the day before' }; supWa(su, 'Hi ' + first(su.contact) + ', please cancel ' + j.id + ' at ' + s.pc + ' tomorrow, sorry. Thanks, Dave (Demo Skip & Grab)'); custEmail(c, 'Hi ' + first(c.contact) + ', as we have not had payment we have cancelled tomorrow\'s skip, ' + j.id + '. If you still need it, just pay by the link or give us a ring and we will rebook it. Thanks, Dave, Demo Skip & Grab', 'Cancelled, ' + j.id); toast(j.id + ' cancelled. Supplier and customer told.', 'x'); }
        CS.commit();
      }
      modal('Half four check', ic('clock') + ' 4:30, tomorrow\'s unpaid orders', u430Body(), '<span class="sp"></span><button class="btn" data-act="close">Done</button>', true);
    };
    /* ---------- put on stop: are you sure? They are emailed and sent a statement of what is overdue ---------- */
    var stop0 = A.stopToggle;
    A.stopToggle = function (el) {
      var c = CS.cust(el.dataset.id); if (!c) return; if (c.stop) return stop0.apply(this, arguments);
      var o = owedOf(c), list = (o.over.length ? o.over : o.inv);
      var tx = 'Hi ' + first(c.contact) + ',\n\nYour account with Demo Skip & Grab has been put on stop' + (o.overdue ? ', as ' + money(o.overdue) + ' is now overdue' : '') + '. We cannot take new orders until it is brought up to date.\n\nYour statement is attached' + (list.length ? ', showing ' + list.map(function (i) { return i.id + ' ' + money(i.amount); }).join(', ') : '') + '.\n\nOnce it is paid we will take the stop off straight away. Any questions, just reply or ring the office.\n\nThanks,\nDave\nDemo Skip & Grab';
      modal('Put on stop', '<span class="xm-warn">!</span> Put ' + h(c.name) + ' on stop?', '<p style="margin:0 0 10px;font-size:14px;line-height:1.45"><b>Are you sure?</b> No one will be able to book for them. They get this email, with a statement of their overdue invoices attached.</p><div class="field"><textarea id="xmStopText" rows="10">' + h(tx) + '</textarea></div>',
        '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn bad pri" data-act="xmStopGo" data-id="' + h(c.id) + '" id="xmStopGo">' + ic('lock') + 'Yes, put on stop</button>', true);
    };
    A.xmStopGo = function (el) {
      var c = CS.cust(el.dataset.id), tx = ((q('#xmStopText') || {}).value || '').trim(); if (!c || c.stop) { closeLayer(); return; }
      closeLayer(); stop0.call(this, el);
      custEmail(c, tx, 'Your account is on stop'); CS.commit();
      doneList(c.name + ' on stop', ['No one can place an order for them until you take them off', 'Emailed ' + h(c.contact) + ' to say they are on stop', 'Statement of their overdue invoices attached']);
    };

    /* ---------- carbon page: the digital waste report for Defra ---------- */
    function dwtRows() {
      return S().jobs.filter(function (j) { return /skip|grab|muck/.test(j.svc) && (j.status === 'done' || j.wtn === 'received'); }).map(function (j) {
        var s = CS.jobSite(j), su = CS.sup(j.sup), sv = S().services[j.svc] || {}, t = j.svc === 'skip' ? Math.round((j.size || 8) * 0.27 * 10) / 10 : 12 * (j.qty || 1);
        return [CS.dayDate(j.day).toISOString().slice(0, 10), j.id, sv.ewc || '', sv.waste || '', t, 'Solid', j.svc === 'skip' ? 'Skip' : 'Tipper lorry', s.pc || '', su ? su.name : '', su ? su.cbdu : '', 'R5'];
      });
    }
    A.xmDwt = function () {
      var head = ['Date', 'Order', 'EWC code', 'Waste description', 'Tonnes (estimate)', 'Physical form', 'Container', 'Site postcode', 'Carrier', 'Carrier registration', 'Recovery code'];
      var csv = [head].concat(dwtRows()).map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'Demo Skip & Grab-digital-waste-report.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) {}
      toast('Digital waste report downloaded, ' + plural(dwtRows().length, 'record') + '.', 'download');
    };
    A.xmDefra = function () {
      modal('Send to Defra', ic('shield-check') + ' Send to Defra', '<p style="margin:0 0 10px;font-size:14px;line-height:1.45">' + plural(dwtRows().length, 'waste record') + ' ready, in the format Defra\'s digital waste tracking service asks for.</p>' +
        '<ul class="xm-done"><li>' + ic('circle-check') + '<span>Download the report and upload it to Defra\'s service, ready now</span></li><li>' + ic('clock') + '<span>Straight from here to Defra, one button, switched on when the direct link is switched on</span></li></ul>' +
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">ApexLine is registered with Defra as a software provider for digital waste tracking.</p>',
        '<button class="btn" data-act="close">Close</button><span class="sp"></span><button class="btn pri" data-act="xmDwt">' + ic('download') + 'Download the report</button>');
    };
    if (V.reports) { var rep0 = V.reports; V.reports = function () {
      return '<div class="card xm-dwt"><div><b>' + ic('shield-check') + 'Digital waste tracking</b><small>Every load you carry, ready for Defra\'s digital waste tracking.</small></div><span class="sp"></span><button class="btn" data-act="xmDwt" id="xmDwtBtn">' + ic('download') + 'Download digital waste report</button><button class="btn pri" data-act="xmDefra">' + ic('shield-check') + 'Send to Defra</button></div>' + rep0.apply(this, arguments);
    }; }

    /* ---------- add a supplier: everything the office needs to send them work ---------- */
    var NS = { svc: {} };
    function nsBody() {
      var SV = S().services, keys = Object.keys(SV);
      function f(id, label, ph, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" placeholder="' + ph + '" autocomplete="off"' + (extra || '') + '></div>'; }
      return '<div class="grid g2">' + f('nsName', 'Company name', 'For example Colne Valley Skips') + f('nsContact', 'Main contact', 'Who you book with') + '</div>' +
        '<div class="field"><label>Main services</label><div class="chips" id="nsSvc">' + keys.map(function (k) { return '<button type="button" class="pk' + (NS.svc[k] ? ' on' : '') + '" data-act="nsSvc" data-v="' + k + '">' + h(SV[k].short) + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label>Their price list</label><label class="drop xm-drop" for="nsFile">' + ic('download') + '<b>Drop their price list here</b><span>Excel, CSV, PDF, Word or a photo of it. Every price and postcode is read in for you to check.</span><input type="file" id="nsFile" accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.heic" hidden></label>' +
          '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">No file to hand?</span><button type="button" class="btn sm" data-act="nsSample">' + ic('file-text') + 'Try the sample: their price list, photographed</button></div><div id="nsRead"></div></div>' +
        '<div class="grid g2">' + f('nsAreas', 'Main area, postcodes covered', 'UB3, UB4, HA') + f('nsBase', 'Yard or base town', 'Hayes') + '</div>' +
        '<div class="grid g2">' + f('nsPh', 'WhatsApp number, if they use it', '07...', ' inputmode="tel"') + f('nsTel', 'Office phone', '01...', ' inputmode="tel"') + '</div>' +
        '<div class="grid g2">' + f('nsPo', 'Email to send purchase orders to', 'bookings@...', ' type="email"') + f('nsAcc', 'Accounts email, for bills and queries', 'accounts@...', ' type="email"') + '</div>' +
        '<div class="grid g2"><div class="field"><label for="nsTerms">Their payment terms</label><select id="nsTerms"><option>30 days</option><option>30 days end of month</option><option>14 days</option><option>7 days</option><option>On booking</option></select></div>' + f('nsHire', 'Standard hire period, days', '14', ' inputmode="numeric" value="14"') + '</div>' +
        '<div class="field"><label for="nsCbdu">Waste carrier number</label><div class="row"><input id="nsCbdu" placeholder="CBDU..." autocomplete="off"><button class="btn" data-act="regCheck">' + ic('shield-check') + 'Check the register</button></div></div><div id="regRes"></div>' +
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Their prices go in next: upload their price sheet, or forward their email and it gets read in. Until then they get starter prices you can change.</p>';
    }
    A.addSup = function () { NS = { svc: { skip: true } }; modal('Add a supplier', ic('warehouse') + ' Add a supplier', nsBody(), '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="saveSup" id="nsSave">' + ic('check') + 'Add supplier</button>', true); };
    var NSR = { 4: 160, 6: 190, 8: 215, 10: 250, 12: 275, 14: 300, 16: 325, 20: 430, 40: 575 }, NSA = ['UB1', 'UB2', 'UB3', 'UB4', 'UB5', 'UB6', 'W5', 'W7', 'HA1'];
    function nsRead(name) {
      var box = q('#nsRead'); if (!box) return;
      box.innerHTML = '<div class="note" style="margin-top:10px">' + ic('sparkles') + '<span>Reading ' + h(name) + '...</span></div>';
      setTimeout(function () {
        var b = q('#nsRead'); if (!b) return;
        NS.rates = { skip: JSON.parse(JSON.stringify(NSR)) }; NS.svc.skip = true;
        var ar = q('#nsAreas'); if (ar && !ar.value.trim()) ar.value = NSA.join(', ');
        [].forEach.call(document.querySelectorAll('#nsSvc .pk'), function (x) { if (x.dataset.v === 'skip') x.classList.add('on'); });
        b.innerHTML = '<div class="note" style="margin-top:10px;background:var(--ok-l)">' + ic('circle-check') + '<span><b>Read ' + Object.keys(NSR).length + ' skip prices and ' + NSA.length + ' postcodes from ' + h(name) + '.</b> Check them, change any that are wrong, then add the supplier.</span></div>' +
          '<table class="dt" style="margin-top:8px"><thead><tr><th>Size</th><th class="r">Their price</th></tr></thead><tbody>' + Object.keys(NSR).map(function (z) { return '<tr><td>' + (z >= 20 ? z + ' yard RoRo' : z + ' yard skip') + '</td><td class="r">' + money(NSR[z]) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<p class="muted" style="font-size:12px;margin:6px 0 0">Sample result. Live, the AI reads their real file, whatever the format, and you check each price before it saves.</p>';
      }, 900);
    }
    A.nsSample = function () { nsRead('price list photo.jpg'); };
    document.addEventListener('change', function (e) { if (e.target && e.target.id === 'nsFile' && e.target.files && e.target.files[0]) nsRead(e.target.files[0].name); });
    A.nsSvc = function (el) { var k = el.dataset.v; NS.svc[k] = !NS.svc[k]; el.classList.toggle('on', !!NS.svc[k]); };
    A.saveSup = function () {
      function v(id) { return String((q('#' + id) || {}).value || '').trim(); }
      var n = v('nsName'); if (!n) { toast('Put the company name in.', 'alert'); var f = q('#nsName'); if (f) f.focus(); return; }
      var svcs = Object.keys(NS.svc).filter(function (k) { return NS.svc[k]; }); if (!svcs.length) { toast('Pick at least one service.', 'alert'); return; }
      var areas = v('nsAreas').toUpperCase().split(/[ ,]+/).filter(Boolean); if (!areas.length) { toast('Put in the postcodes they cover.', 'alert'); var g = q('#nsAreas'); if (g) g.focus(); return; }
      var rates = {}; svcs.forEach(function (k) { if (NS.rates && NS.rates[k]) { rates[k] = NS.rates[k]; return; } var o = S().suppliers.filter(function (s) { return s.rates && s.rates[k]; })[0]; if (o) rates[k] = JSON.parse(JSON.stringify(o.rates[k])); });
      var hire = parseInt(v('nsHire'), 10) || 14, wa = v('nsPh'), id = 's' + (100 + S().suppliers.length);
      var su = { id: id, name: n, contact: v('nsContact') || 'Bookings', phone: wa || v('nsTel') || '', wa: !!wa, office: v('nsTel'), base: v('nsBase'), services: svcs, areas: areas, rates: rates, hireDays: hire, weekRate: 25, resp: 30, onTime: 95, wtn: 95, jobs: 0, cbdu: v('nsCbdu') || 'CBDU to follow', licExp: 365, recov: 90 };
      S().suppliers.push(su);
      try { var x = X.hb(su); if (v('nsPo')) x.opsEmail = v('nsPo'); if (v('nsAcc')) x.accEmail = v('nsAcc'); x.terms = v('nsTerms') || x.terms; } catch (e) {}
      CS.commit();
      doneList(n + ' added', [h(svcs.map(function (k) { return S().services[k].short; }).join(', ')) + ' in ' + h(areas.join(', ')), 'Bookings go ' + (wa ? 'by WhatsApp to ' + h(wa) : 'by email') + (v('nsPo') ? ', purchase orders to ' + h(v('nsPo')) : ''), 'Not bookable yet: they show in Find a supplier and on quotes and orders once their documents are in and you approve them in Compliance. Quicker: send them the onboarding link instead', (NS.rates ? 'Their prices read in from the price list' : 'Starter prices in until their price sheet is uploaded')]);
    };

    /* ---------- team: what sales, admin and finance are doing, with commission ---------- */
    (function () {
      var L = UI.VIEWS; if (!L || L.some(function (x) { return x.k === 'team'; })) return;
      var at = -1; L.forEach(function (x, i) { if (x.k === 'trends') at = i; });
      L.splice(at < 0 ? L.length : at + 1, 0, { k: 'team', g: 'Money', n: 'Team', ic: 'users', sub: 'What sales, admin and finance are doing, and commission' });
    })();
    function teamData() {
      var js = S().jobs, qs = S().quotes, wk = function (d) { return d != null && d <= 0 && d >= -6; };
      function sales(o) {
        var won = qs.filter(function (x) { return x.owner === o && x.status === 'won'; }), sent = qs.filter(function (x) { return x.owner === o && (x.status === 'sent' || x.status === 'won' || x.status === 'lost'); });
        var mine = js.filter(function (j) { return j.owner === o && wk(j.day); }), rev = mine.reduce(function (a, j) { return a + (j.sell || 0); }, 0), gp = mine.reduce(function (a, j) { return a + (j.sell || 0) - (j.cost || 0); }, 0);
        return { orders: mine.length, rev: rev, gp: gp, sent: sent.length, won: won.length, rate: sent.length ? Math.round(won.length / sent.length * 100) : 0 };
      }
      var bde = CS.bde();
      return [
        { n: 'Dave Archer', r: 'Managing Director', c: '#EB9347', k: 'sales', s: sales('dave'), kpi: null },
        { n: bde, r: 'Business Development Executive', c: '#7A3FF2', k: 'sales', s: sales('sam'), com: true },
        { n: 'Ellie Ward', r: 'Office admin', c: '#0E9F6E', k: 'admin', a: { msgs: 64, reply: 7, orders: 18, etas: 22, wtn: 11 } },
        { n: 'Kate Morris', r: 'Accounts', c: '#2563EB', k: 'fin', f: { inv: 31, chased: 9, cash: 6480, over: 1150, bills: 14 } }
      ];
    }
    var COMM = 10;
    function tk(lbl, val, sub) { return '<div class="xm-tk"><small>' + lbl + '</small><b>' + val + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; }
    V.team = function () {
      var T = teamData();
      return '<div class="xm-teamhd"><div><b>' + ic('users') + 'This week, Monday to today</b><small>Logged as people work: every order, quote, message, chase and invoice is counted against whoever did it. Sample figures.</small></div></div>' +
        '<div class="xm-team">' + T.map(function (p) {
          var body = '';
          if (p.k === 'sales') body = tk('Orders placed', p.s.orders) + tk('Revenue booked', money(p.s.rev)) + tk('Gross profit', money(p.s.gp)) + tk('Quotes won', p.s.won + ' of ' + p.s.sent, p.s.rate + '% win rate') + (p.com ? tk('Commission', money(p.s.gp * COMM / 100), COMM + '% of gross profit, your setting') : '');
          if (p.k === 'admin') body = tk('Messages answered', p.a.msgs) + tk('Average reply', p.a.reply + ' min') + tk('Orders placed', p.a.orders) + tk('ETAs chased', p.a.etas) + tk('Notes filed', p.a.wtn);
          if (p.k === 'fin') body = tk('Invoices sent', p.f.inv) + tk('Payments chased', p.f.chased) + tk('Cash collected', money(p.f.cash)) + tk('Overdue cleared', money(p.f.over)) + tk('Supplier bills checked', p.f.bills);
          return '<div class="card xm-tm"><div class="xm-tmh"><span class="av" style="--c:' + p.c + '">' + h(CS.initials(p.n)) + '</span><div><b>' + h(p.n) + '</b><small>' + h(p.r) + '</small></div></div><div class="xm-tks">' + body + '</div></div>';
        }).join('') + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin:12px 0 0">Each person sees their own figures. Only you and your ops manager see everyone. Commission works off the gross profit on what each salesperson brings in, at the rate you set.</p>';
    };

    /* ---------- Take card now: the card is taken first, then the order books and the receipt goes by email ---------- */
    var CARD = { ok: false }, op2 = A.ordPlace;
    A.ordPlace = function (el) {
      var O = V2.order && V2.order(), R = V2.calc && V2.calc();
      if (!O || O.pay !== 'card' || CARD.ok || !R || !R.pick) { CARD.ok = false; return op2.apply(this, arguments); }
      var c = O.cust ? CS.cust(O.cust) : null, em = (c && c.email) || O.email || '', nm = c ? c.name : (O.newName || O.cname || 'the customer');
      if (!c && !String(O.newName || '').trim()) { toast('Put the customer\'s name in first.', 'alert'); var f = q('#ordNew'); if (f) f.focus(); return; }
      if (O.day == null) return op2.apply(this, arguments);
      CARD.back = document.getElementById('layer').innerHTML;
      modal('Take card now', ic('pound') + ' Take card now', '<div class="xm-pay"><small>' + h(nm) + '</small><b>' + money(R.sell * 1.2) + '</b><span>' + money(R.sell) + ' + VAT ' + money(R.sell * 0.2) + '</span></div>' +
        '<div class="field"><label for="xmRcpt">Receipt to</label><input id="xmRcpt" type="email" value="' + h(em) + '" placeholder="name@example.com" autocomplete="off"></div>' +
        '<div class="xm-card" aria-label="Card details, demo"><div class="xm-card-n">' + ic('lock') + '<span>Card number</span><i>1234 1234 1234 1234</i></div><div class="xm-card-r"><span>MM / YY</span><span>CVC</span></div></div>' +
        '<p class="muted" style="font-size:12.5px;margin:8px 0 0">Card details go into Stripe\'s secure box, so they never sit in your system. The receipt goes to the email above. Demo, nothing is charged.</p>',
        '<button class="btn" data-act="xmPayBack">Back</button><span class="sp"></span><button class="btn pri lg" data-act="xmPayGo" id="xmPayGo">' + ic('check') + 'Charge ' + money(R.sell * 1.2) + '</button>');
    };
    A.xmPayBack = function () { if (CARD.back) layer(CARD.back); };
    A.xmPayGo = function () {
      var O = V2.order && V2.order(); if (!O) return; var em = ((q('#xmRcpt') || {}).value || '').trim();
      if (em && !O.cust) O.email = em;
      if (CARD.back) layer(CARD.back);   /* the order form is put back so the order places as normal */
      CARD.ok = true; A.ordPlace();
      toast('Paid by card. Receipt emailed' + (em ? ' to ' + h(em) : '') + '.', 'circle-check');
    };
    UI.render();
  }
  start(0);
})();
