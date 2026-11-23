/* CAC demo: Skipper (the chat helper), the bell, the Demo menu, the calm assistant column,
   hot / warm / cold, and the nudge. Rules-based stand-ins on sample data. Nothing leaves this browser.
   Skipper only ever sends when the send button is pressed. */
(function () {
  var CS = window.CS, UI = window.CACUI, ic = window.ic;
  if (!CS || !UI) return;
  var h = CS.esc, money = CS.money, A = UI.A, ui = UI.ui;
  var SK = window.CACSK = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function firstName(n) { return String(n || '').split(' ')[0]; }
  function lc1(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }
  function gp(s) { return String(s).replace(/\bMargin\b/g, 'Gross profit').replace(/\bmargin\b/g, 'gross profit'); }
  function esc(re) { return String(re).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ---------- John's account: a reply never goes out signed by the BDE ---------- */
  SK.fix = function (s) {
    var b = CS.bde(); if (!b) return s;
    return String(s).replace(new RegExp('((?:Cheers|Thanks|Thank you|Kind regards|Regards|Best wishes|Best),?\\s+)' + esc(b) + '\\b', 'g'), '$1John');
  };

  /* ---------- hot, warm, cold (simple rules in the demo) ---------- */
  SK.temp = function (t) {
    if (!t || !t.party || t.party.type === 'supplier') return null;
    function T(k, line, next) { return { k: k, label: k === 'hot' ? 'Hot' : k === 'warm' ? 'Warm' : 'Cold', line: line, next: next }; }
    if (t.done) return T('cold', 'No reply needed', 'Nothing to do');
    if (!CS.needsYou(t)) {
      var m = CS.lastReal(t), quiet = m && m.dir === 'out' && Date.now() - m.at > 2 * 86400000;
      return quiet ? T('cold', 'Gone quiet', 'Chase with a short message') : T('cold', 'Waiting on them', 'Nothing to do until they reply');
    }
    var k = CS.analyse(t).kind;
    if (k === 'book') return T('hot', 'Wants to book', 'Confirm the booking today');
    if (k === 'hold') return T('hot', 'Wants to book', 'Ask for payment before you book');
    if (k === 'exchange') return T('hot', 'Wants a skip swapped', 'Book the swap today');
    if (k === 'collect') return T('hot', 'Wants a collection', 'Book the collection today');
    if (k === 'quote') return T('hot', 'Wants a price', 'Send the price while it is fresh');
    if (k === 'paid') return T('cold', 'No reply needed', 'Mark the invoice paid');
    if (k === 'none') return T('cold', 'No reply needed', 'Mark it done');
    if (k === 'pack') return T('warm', 'Wants paperwork', 'Send the paperwork today');
    return T('warm', 'Asked a question', 'Reply today');
  };
  SK.chip = function (t) {
    var tp = SK.temp(t); if (!tp) return '';
    return '<span class="sk-temp ' + tp.k + '" title="' + h(tp.line + '. Suggested next action: ' + lc1(tp.next)) + '">' + tp.label + '</span>';
  };
  /* one plain line of what they asked for */
  SK.ask = function (t, An) {
    An = An || CS.analyse(t);
    if (/^(book|quote|hold)$/.test(An.kind) && An.chips && An.chips.length) {
      var skip = { Site: 1, When: 1, Account: 1, Owner: 1, Placement: 1, Credit: 1, Job: 1, Supplier: 1 }, items = [], site = '', when = '';
      An.chips.forEach(function (c) { if (c.k === 'Site') site = c.v; else if (c.k === 'When') when = c.v; else if (!skip[c.k]) items.push(c.v); });
      var s2 = site.replace(/,\s*[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, '') || site;
      var out = [items.join(' and '), s2, /^(today|tomorrow)$/i.test(when) ? when.toLowerCase() : when].filter(Boolean).join(', ');
      if (out) return out.charAt(0).toUpperCase() + out.slice(1);
    }
    return String(An.title || '').replace(/, (Today|Tomorrow)$/, function (x, d) { return ', ' + d.toLowerCase(); });
  };
  SK.topHTML = function (t, An) {
    var tp = SK.temp(t);
    return (tp ? '<div class="sk-top">' + SK.chip(t) + '<span class="sk-line">' + h(tp.line) + '</span></div>' : '') +
      '<h3 class="sk-ask">' + h(SK.ask(t, An)) + '</h3>' +
      (An.kind === 'hold' ? '<div class="sk-hold">' + ic('lock') + '<span>' + h(An.title) + '</span></div>' : '') +
      (tp ? '<div class="sk-next"><span>Suggested next action</span> ' + h(tp.next) + '</div>' : '');
  };
  function totHTML(An) {
    return '<div class="money sk-tot"><div class="tot"><div><small>Their price</small><b class="num">' + money(An.sell) + '</b></div><div><small>Supplier cost</small><b class="num">' + money(An.cost) + '</b></div><div class="m"><small>Gross profit</small><b class="num">' + money(An.margin) + ' <span style="font-size:12px">' + CS.pct(An.margin, An.sell) + '%</span></b></div></div></div>';
  }
  /* the step by step flow (v2.js) made lighter: same steps and buttons, less text */
  SK.guideHTML = function (gd, top, btn) {
    var t = ui.sel && CS.thread(ui.sel), An = t ? CS.analyse(t) : null;
    gd = SK.fix(gd).replace(/(£[\d,.]+) margin/g, '$1 gross profit').replace(/>Margin</g, '>Gross profit<').replace('the margin and the reply follow', 'the gross profit and the reply follow');
    gd = gd.replace('<div class="abody guide">', '<div class="abody guide sk-card">' + top + (An && An.lines.length ? totHTML(An) : ''));
    var i = gd.lastIndexOf('</div><div class="approvebar">'); if (i >= 0) gd = gd.slice(0, i) + btn + gd.slice(i);
    return gd;
  };
  A.skMore = function (el) { ui.skMore = ui.skMore || {}; ui.skMore[el.dataset.id] = !ui.skMore[el.dataset.id]; UI.render(); };

  /* ---------- top bar: bell, and the demo tools in one quiet menu ---------- */
  function buildTop() {
    var top = $('.top'); if (!top || $('#skDemo')) return;
    var wrap = document.createElement('div'); wrap.className = 'sk-demo'; wrap.id = 'skDemo';
    wrap.innerHTML = '<button class="iconbtn" id="skDemoBtn" data-act="skDemo" aria-haspopup="true" aria-expanded="false" aria-label="Demo tools" title="Demo tools">' +
      '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h8"/><path d="M16 6h4"/><path d="M12 4v4"/><path d="M4 12h2"/><path d="M10 12h10"/><path d="M6 10v4"/><path d="M4 18h10"/><path d="M18 18h2"/><path d="M14 16v4"/></svg></button>' +
      '<div class="sk-menu" id="skMenu" role="menu" hidden><small>Demo tools</small></div>';
    var badge = $('.demo-badge', top); if (badge) top.insertBefore(wrap, badge); else top.appendChild(wrap);
    var menu = $('#skMenu');
    ['#livePill', '.top [data-act="tryIt"]', '.top [data-act="phone"]', '#themeBtn'].forEach(function (sel) {
      var el = $(sel); if (!el) return; el.classList.remove('hide-sm'); el.setAttribute('role', 'menuitem'); menu.appendChild(el);
    });
  }
  function menuOpen(on) { var m = $('#skMenu'), b = $('#skDemoBtn'); if (!m) return; m.hidden = !on; if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  A.skDemo = function () { var m = $('#skMenu'); menuOpen(m && m.hidden); };

  /* the bell opens the same list, with a calmer heading */
  var asst0 = A.assistant;
  A.assistant = function (el) {
    if (asst0) asst0(el);
    var d = $('#layer .drawer'); if (!d) return;
    var h2 = $('.dhd h2', d), sm = $('.dhd small', d), note = $('.dbd > p.muted', d), ask = $('.dft [data-act="ask"]', d);
    if (h2) h2.innerHTML = ic('bell') + ' Needs you';
    if (sm) sm.textContent = 'Most urgent first';
    if (note) note.textContent = 'Nothing is sent until you press send.';
    if (ask) ask.innerHTML = ic('message') + 'Ask Skipper';
    d.setAttribute('aria-label', 'Needs you');
  };

  /* ---------- Skipper ---------- */
  var SUGG = ['Read my latest email from Lee', 'Any new quotes in the last hour?', 'What needs me?', 'How much is an 8 yard skip in B23?'];
  var started = false;
  function build() {
    if ($('#skFab')) return;
    var fab = document.createElement('button'); fab.className = 'sk-fab'; fab.id = 'skFab'; fab.setAttribute('data-act', 'skToggle'); fab.setAttribute('aria-label', 'Open Skipper, your helper'); fab.title = 'Ask Skipper (/)';
    fab.innerHTML = ic('message');
    var p = document.createElement('section'); p.className = 'sk-panel'; p.id = 'skPanel'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Skipper');
    p.innerHTML = '<header class="sk-hd"><span class="sk-av">' + ic('sparkles') + '</span><div class="sk-ttl"><b>Skipper</b><small>Ask about your inbox, prices, jobs and money</small></div><button class="iconbtn sm" data-act="skToggle" aria-label="Close Skipper">' + ic('x') + '</button></header>' +
      '<div class="sk-msgs" id="skMsgs" aria-live="polite"></div>' +
      '<div class="sk-in"><input id="askQ" placeholder="Ask Skipper" autocomplete="off" aria-label="Ask Skipper"><button class="sk-send" data-act="askGo" aria-label="Send">' + ic('send') + '</button></div>' +
      '<small class="sk-note">Demo: Skipper answers from the sample data.</small>';
    document.body.appendChild(p); document.body.appendChild(fab);
  }
  function isOpen() { var p = $('#skPanel'); return !!p && !p.hidden; }
  function suggHTML() { return '<div class="sk-sugg">' + SUGG.map(function (s) { return '<button data-act="askSugg" data-v="' + h(s) + '">' + h(s) + '</button>'; }).join('') + '</div>'; }
  function add(cls, html) {
    var box = $('#skMsgs'); if (!box) return null;
    if (/\baskans\b/.test(cls)) Array.prototype.forEach.call(box.querySelectorAll('.askans'), function (x) { x.classList.remove('askans'); });
    var d = document.createElement('div'); d.className = 'sk-b ' + cls; d.innerHTML = html; box.appendChild(d); box.scrollTop = box.scrollHeight; return d;
  }
  function say(html) { return add('bot askans', html); }
  function openPanel(focus) {
    build(); var p = $('#skPanel'); p.hidden = false; document.body.classList.add('sk-on');
    if (!started) { started = true; add('bot', '<p>Hi John. Ask me anything, or try one of these.</p>' + suggHTML()); }
    hideNudge();
    if (focus !== false) setTimeout(function () { var i = $('#askQ'); if (i) i.focus(); }, 40);
  }
  function closePanel() { var p = $('#skPanel'); if (p) p.hidden = true; document.body.classList.remove('sk-on'); }
  A.skToggle = function () { if (isOpen()) closePanel(); else openPanel(); };
  /* Ask CAC is Skipper now. Same actions, same #askQ box, same Enter to ask. */
  A.ask = function () { if (A.closeSide) A.closeSide(); if ($('#layer') && $('#layer').innerHTML && A.close) A.close(); menuOpen(false); openPanel(); };
  A.askGo = function () { var i = $('#askQ'), v = ((i && i.value) || '').trim(); if (!v) { if (i) i.focus(); return; } i.value = ''; SK.send(v); };
  A.askSugg = function (el) { SK.send(el.dataset.v); };
  SK.send = function (q) {
    if (!isOpen()) openPanel(false);
    add('me', '<p>' + h(q) + '</p>');
    var html; try { html = reply(q); } catch (e) { html = '<p>Sorry, I could not work that one out. Try one of these.</p>' + suggHTML(); }
    say(html);
  };

  function rowsHTML(rows) {
    if (!rows || !rows.length) return '';
    return '<div class="sk-rows">' + rows.map(function (r) {
      var inner = '<span class="bd"><b>' + h(gp(r[0])) + '</b><small>' + h(gp(r[1])) + '</small></span>' + (r[2] ? '<span class="v">' + (/^<span class="sk-temp/.test(r[2]) ? r[2] : h(gp(r[2]))) + '</span>' : '');
      return r[3] ? '<button class="sk-row" data-act="openThread" data-id="' + h(r[3]) + '">' + inner + '</button>' : '<div class="sk-row">' + inner + '</div>';
    }).join('') + '</div>';
  }
  function actBtn(act, attrs, label) { return '<div class="sk-acts"><button class="btn sm pri" data-act="' + act + '" ' + (attrs || '') + '>' + h(label) + ic('arrow-right') + '</button></div>'; }
  function inbound() { return CS.S.threads.filter(function (t) { return t.msgs.some(function (m) { return m.dir === 'in' && !m.auto; }); }); }
  function chWord(t) { return t.ch === 'wa' ? 'WhatsApp' : t.ch === 'email' ? 'email' : t.ch === 'web' ? 'website enquiry' : CS.chName(t.ch); }
  function tempRank(t) { var tp = SK.temp(t); return !tp ? 3 : tp.k === 'hot' ? 0 : tp.k === 'warm' ? 1 : 2; }

  function reply(q) {
    var lo = q.toLowerCase();
    if (/\b(read|show|open|latest|last|newest|most recent)\b.*\b(e-?mails?|mail|messages?|whatsapps?|texts?|enquir(y|ies))\b|\b(e-?mails?|messages?|whatsapps?)\b.*\b(from|about)\b/.test(lo)) return readMsg(q, lo);
    if (/quote|enquir/.test(lo) && /(last|past) hour|\bnew\b|just in|today/.test(lo)) return newQuotes(lo);
    if (/needs? (me|my|doing|attention|sorting|a reply)|what.*(to do|outstanding|waiting for me)|to-?do|anything for me|what'?s on/.test(lo)) return needsMe();
    if (/chas|gone quiet|follow.?up|waiting on/.test(lo)) return chase();
    var fn = window.CACQ && window.CACQ.answer; if (!fn) return '<p>Try one of these.</p>' + suggHTML();
    var a = fn(q);
    return '<p>' + h(gp(a.t)) + '</p>' + rowsHTML(a.rows) + (a.act ? actBtn('askAct', 'data-k="' + h(a.act[0]) + '" data-v="' + h(a.act[1]) + '"', a.act[2]) : (a.rows.length ? '' : suggHTML()));
  }

  function readMsg(q, lo) {
    var nm = (/\b(?:from|by|off)\s+([a-z][a-z'&.\- ]*?)(?=\s+(?:about|on|re|regarding|please|today|this|that|and)\b|[?.!,]|$)/.exec(lo) || [])[1] || '';
    var topic = (/\babout\s+(?:a |an |the |my |that |this )?([a-z0-9][a-z0-9 ]*?)(?=[?.!,]|$)/.exec(lo) || [])[1] || '';
    var wantMail = /\be-?mails?\b|\bmail\b/.test(lo), wantCh = wantMail ? 'email' : /whatsapp|\btexts?\b/.test(lo) ? 'wa' : '', list = inbound();
    if (nm.trim()) {
      var toks = nm.trim().split(/\s+/);
      list = list.filter(function (t) { var p = CS.party(t.party), hay = (p.name + ' ' + (p.sub || '') + ' ' + (p.first || '')).toLowerCase(); return toks.every(function (k) { return new RegExp('\\b' + esc(k)).test(hay); }); });
      if (!list.length) return '<p>I can\'t find a message from ' + h(nm.trim().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); })) + ' in the inbox.</p>';
    }
    if (topic.trim()) {
      var tk = topic.trim().replace(/s$/, ''), by = list.filter(function (t) {
        if (/^(quote|price|pricing)$/.test(tk)) return !t.done && CS.analyse(t).kind === 'quote';
        var li = t.msgs.filter(function (m) { return m.dir === 'in'; }).slice(-1)[0];
        return ((t.subject || '') + ' ' + (li ? li.text : '') + ' ' + (t.done ? '' : CS.analyse(t).title)).toLowerCase().indexOf(tk) >= 0;
      });
      if (!by.length) return '<p>I can\'t find a message about ' + h(topic.trim()) + ' in the inbox.</p>';
      list = by;
    }
    if (!list.length) return '<p>The inbox is empty.</p>';
    list.sort(function (a, b) {
      return (wantCh ? (a.ch === wantCh ? 0 : 1) - (b.ch === wantCh ? 0 : 1) : 0) || (a.party.type === 'supplier' ? 1 : 0) - (b.party.type === 'supplier' ? 1 : 0) || b.last - a.last;
    });
    return cardHTML(list[0], wantMail);
  }
  function cardHTML(t, wantMail) {
    var p = CS.party(t.party), fn = p.first || firstName(p.name);
    var o = '<p><b>From ' + h(p.name) + '</b>' + (p.sub ? ', ' + h(p.sub) : '') + '<br><span class="sk-mut">' + (wantMail && t.ch !== 'email' ? 'Their newest message is a ' + h(chWord(t)) : h(chWord(t).replace(/^./, function (c) { return c.toUpperCase(); }))) + ', ' + h(CS.ago(t.last)) + '</span></p>';
    var open = '<button class="btn sm" data-act="openThread" data-id="' + t.id + '">Open it</button>';
    if (t.done || !CS.needsYou(t)) return o + '<p>This one is already dealt with. Nothing is waiting on you.</p><div class="sk-acts">' + open + '</div>';
    var An = CS.analyse(t), tp = SK.temp(t);
    o += '<p class="sk-one">' + SK.chip(t) + '<span>' + h(SK.ask(t, An)) + '</span></p>';
    if (!An.drafts.length) return o + '<p>No reply is needed.' + (tp ? ' Suggested next action: ' + h(lc1(tp.next)) + '.' : '') + '</p><div class="sk-acts">' + open + '</div>';
    var idx = 0; An.drafts.some(function (d, i) { if (d.to !== 'supplier') { idx = i; return true; } return false; });
    var d = An.drafts[idx], text = (t.edits && t.edits[idx] != null) ? t.edits[idx] : SK.fix(d.text).replace(/\{JOB\}/g, 'CAC-' + CS.S.counters.job);
    var also = An.drafts.length > 1 ? An.drafts.filter(function (x, i) { return i !== idx; }).map(function (x) { return CS.party(x.party).name; }).join(' and ') : '';
    var lab = t.party.type === 'lead' ? 'Send to lead' : t.party.type === 'customer' ? 'Send to customer' : 'Send';
    return o + '<div class="sk-reply"><small>Suggested reply:</small><textarea readonly rows="' + Math.min(8, Math.max(3, Math.ceil(text.length / 40) + (text.split('\n').length - 1))) + '" aria-label="Suggested reply to ' + h(fn) + '">' + h(text) + '</textarea></div>' +
      (also ? '<p class="sk-mut">Sending also sends the drafted message to ' + h(also) + '.</p>' : '') +
      '<div class="sk-acts"><button class="btn sm pri" data-act="skSend" data-id="' + t.id + '" data-i="' + idx + '">' + ic('send') + lab + '</button><button class="btn sm" data-act="skTweak">' + ic('pencil') + 'Tweak it</button><button class="btn sm ghost" data-act="skLeave">Leave it</button></div>';
  }
  function lock(card, html) { var a = card && $('.sk-acts', card), ta = card && $('textarea', card); if (ta) ta.readOnly = true; if (a) a.innerHTML = html; if (card) card.classList.remove('tweak'); }
  A.skTweak = function (el) { var card = el.closest('.sk-b'), ta = card && $('textarea', card); if (!ta) return; ta.readOnly = false; card.classList.add('tweak'); el.remove(); ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} };
  A.skLeave = function (el) { lock(el.closest('.sk-b'), '<span class="sk-mut">Left in the inbox.</span>'); say('<p>No problem. It stays in the inbox with the draft.</p>'); };
  A.skSend = function (el) {
    var card = el.closest('.sk-b'), ta = card && $('textarea', card), id = el.dataset.id, i = el.dataset.i, t = CS.thread(id);
    if (!t || t.done || !CS.needsYou(t)) { lock(card, '<span class="sk-mut">Already dealt with.</span>'); say('<p>That one is already dealt with.</p>'); return; }
    var An = CS.analyse(t), p = CS.party(t.party), fn = p.first || firstName(p.name);
    /* same path as the inbox button: the approve action reads the reply from a draft box on the page */
    if (ta) { t.edits = t.edits || {}; t.edits[i] = ta.value; CS.save(); if (ui.view === 'inbox' && ui.sel === id) UI.render(); ta.setAttribute('data-draft', i); ta.setAttribute('data-id', id); }
    var book = An.kind === 'book' && An.lines.length && t.party.type === 'customer' && !!A.gBook;
    try { (book ? A.gBook : A.approve)({ dataset: { id: id } }); }
    finally { if (ta) { ta.removeAttribute('data-draft'); ta.removeAttribute('data-id'); } }
    lock(card, '<span class="sk-ok">' + ic('check') + 'Sent</span>');
    say('<p>' + (book ? 'Booked with the supplier and sent to ' : 'Sent to ') + h(fn) + '. <span class="sk-mut">Demo, so nothing really leaves this browser.</span></p><div class="sk-acts"><button class="btn sm" data-act="openThread" data-id="' + id + '">Open it</button></div>');
  };

  function newQuotes(lo) {
    var hour = /hour/.test(lo), win = hour ? 3600000 : 86400000, label = hour ? 'in the last hour' : 'today';
    var all = CS.S.threads.filter(function (t) { return !t.done && CS.needsYou(t) && CS.analyse(t).kind === 'quote'; }).sort(function (a, b) { return b.last - a.last; });
    var list = all.filter(function (t) { return Date.now() - t.last <= win; });
    var rows = list.slice(0, 4).map(function (t) { var An = CS.analyse(t), p = CS.party(t.party); return [p.name, SK.ask(t, An), money(An.sell), t.id]; });
    var txt = list.length ? list.length + ' new quote request' + (list.length > 1 ? 's' : '') + ' ' + label + '. ' + (list.length > 1 ? 'Each one is' : 'It is') + ' priced with a reply drafted.' : 'No new quote requests ' + label + '.' + (all.length ? ' ' + all.length + ' older one' + (all.length > 1 ? 's are' : ' is') + ' still waiting for a price.' : '');
    return '<p>' + h(txt) + '</p>' + rowsHTML(rows) + (all.length ? actBtn('skOrders', '', 'Open the inbox') : '');
  }
  A.skOrders = function () { ui.tab = 'orders'; ui.sel = null; ui.open = false; A.go({ dataset: { v: 'inbox' } }); };
  function needsMe() {
    var list = CS.S.threads.filter(function (t) { return CS.needsYou(t); }).sort(function (a, b) { return tempRank(a) - tempRank(b) || b.last - a.last; });
    var hot = list.filter(function (t) { return tempRank(t) === 0; }).length;
    if (!list.length) return '<p>Nothing needs you. The inbox is clear.</p>';
    var rows = list.slice(0, 4).map(function (t) { var p = CS.party(t.party), tp = SK.temp(t); return [p.name, tp ? tp.next : SK.ask(t), SK.chip(t), t.id]; });
    return '<p>' + list.length + ' conversation' + (list.length > 1 ? 's need' : ' needs') + ' you' + (hot ? ', ' + hot + ' of them hot' : '') + '. Hottest first:</p>' + rowsHTML(rows) + actBtn('assistant', '', 'See the full list');
  }
  function chase() {
    var ch = CS.chaseLists(), rows = [];
    function n(x, one, many) { return x + ' ' + (x === 1 ? one : many); }
    if (ch.sup && ch.sup.length) rows.push([n(ch.sup.length, 'supplier booking', 'supplier bookings'), 'Not confirmed yet', '']);
    if (ch.pay && ch.pay.length) rows.push([n(ch.pay.length, 'invoice', 'invoices'), 'Overdue', money(ch.pay.reduce(function (a, i) { return a + i.amount; }, 0))]);
    if (ch.wtn && ch.wtn.length) rows.push([n(ch.wtn.length, 'waste transfer note', 'waste transfer notes'), 'Not back from the supplier', '']);
    if (ch.quotes && ch.quotes.length) rows.push([n(ch.quotes.length, 'quote', 'quotes'), 'Sent 2 or more days ago, no answer', '']);
    if (!rows.length) return '<p>Nothing to chase. Everyone has come back to you.</p>';
    return '<p>' + n(ch.total || rows.length, 'thing', 'things') + ' waiting on someone else.</p>' + rowsHTML(rows) + actBtn('askAct', 'data-k="go" data-v="chasing"', 'Open chasing');
  }

  /* ---------- nudge: a hot conversation opened, then left without an answer ---------- */
  var nudgeMs = (function () { var v = parseFloat(new URLSearchParams(location.search).get('nudge')); return (v > 0 ? v : 300) * 1000; })();
  var lastSel = null, timers = {}, nudged = {};
  function isHot(id) { var t = CS.thread(id), tp = t && SK.temp(t); return tp && tp.k === 'hot' ? tp : null; }
  function track() {
    var cur = ui.view === 'inbox' ? (ui.sel || null) : null; if (cur === lastSel) return;
    if (lastSel && isHot(lastSel) && !nudged[lastSel] && !timers[lastSel]) (function (id) { timers[id] = setTimeout(function () { delete timers[id]; fire(id); }, nudgeMs); })(lastSel);
    if (cur && timers[cur]) { clearTimeout(timers[cur]); delete timers[cur]; }
    var nb = $('#skNudge'); if (cur && nb && nb.getAttribute('data-id') === cur) hideNudge();
    lastSel = cur;
  }
  function fire(id) {
    var tp = isHot(id); if (!tp || (ui.view === 'inbox' && ui.sel === id)) return;
    nudged[id] = true; hideNudge();
    var p = CS.party(CS.thread(id).party), msg = 'It looks like ' + h(p.first || firstName(p.name)) + ' ' + h(lc1(tp.line)) + '.';
    var btns = '<button class="btn sm pri" data-act="skNudgeOpen" data-id="' + id + '">Open</button><button class="btn sm ghost" data-act="skNudgeX">Dismiss</button>';
    if (isOpen()) say('<p>' + msg + '</p><div class="sk-acts">' + btns + '</div>');
    else {
      var d = document.createElement('div'); d.className = 'sk-nudge'; d.id = 'skNudge'; d.setAttribute('role', 'status'); d.setAttribute('data-id', id);
      d.innerHTML = '<span class="sk-av">' + ic('sparkles') + '</span><div class="bd"><b>' + msg + '</b><div class="sk-acts">' + btns + '</div></div>';
      document.body.appendChild(d);
    }
    ping();
  }
  function hideNudge() { var n = $('#skNudge'); if (n) n.remove(); }
  A.skNudgeOpen = function (el) { var id = el.dataset.id; hideNudge(); if (CS.thread(id)) A.openThread({ dataset: { id: id } }); };
  A.skNudgeX = function (el) { var c = el.closest('.sk-b'); if (c) lock(c, '<span class="sk-mut">Dismissed.</span>'); hideNudge(); };
  var actx = null;
  function ping() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = actx || new AC(); if (actx.state === 'suspended' && actx.resume) actx.resume();
      var t0 = actx.currentTime;
      [[784, 0], [1047, 0.14]].forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t0 + n[1]); g.gain.exponentialRampToValueAtTime(0.07, t0 + n[1] + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.45);
        o.connect(g); g.connect(actx.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + 0.5);
      });
    } catch (e) {}
  }
  SK.ping = ping;

  /* ---------- wiring ---------- */
  SK.after = function () { buildTop(); track(); };
  document.addEventListener('click', function (e) {
    var m = $('#skMenu'); if (m && !m.hidden && !e.target.closest('#skDemoBtn')) menuOpen(false);
    /* on a phone the panel gets out of the way once a button in it takes you somewhere */
    if (window.innerWidth < 900 && isOpen() && e.target.closest('#skPanel [data-act="openThread"],#skPanel [data-act="askAct"],#skPanel [data-act="skOrders"],#skPanel [data-act="skNudgeOpen"],#skPanel [data-act="assistant"]')) closePanel();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = $('#skMenu');
    if (m && !m.hidden) { menuOpen(false); e.stopPropagation(); return; }
    if (isOpen() && !($('#layer') && $('#layer').innerHTML)) { closePanel(); e.stopPropagation(); }
  }, true);

  build(); buildTop();
  UI.render();
})();
