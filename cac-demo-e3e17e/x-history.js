/* Order history: every order as a card, newest first, with a search for order number, PO, customer, site or postcode.
   A card opens the order, with its confirmation, invoice and waste transfer note. Each document can be emailed to the
   customer from there (xhEmail), one at a time or all three. Nothing is really sent in the demo. */
(function () {
  function start(tries) {
    var UI = window.CACUI, CS = window.CS, V3 = window.CACV3;
    if (!(UI && UI.A && UI.V && UI.VIEWS && CS && CS.S && V3 && V3.all)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic || function () { return ''; };
    function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
    var SVC_IC = { skip: 'skip', grab: 'backhoe', muck: 'backhoe', welfare: 'home', container: 'warehouse', toilet: 'droplet', fencing: 'fence', sweeper: 'brush', concrete: 'truck', aggregates: 'stack', plant: 'backhoe' };
    var ST = { booked: ['Booked', 'amber'], confirmed: ['Confirmed', 'brand'], onhire: ['On site', 'web'], exchange: ['On site', 'web'], collection: ['On site', 'web'], done: ['Done', 'ok'] };

    /* the menu item, in Work, straight after Orders */
    (function () {
      var L = UI.VIEWS; if (L.some(function (x) { return x.k === 'history'; })) return;
      var at = -1; L.forEach(function (x, i) { if (x.k === 'orders') at = i; });
      L.splice(at < 0 ? L.length : at + 1, 0, { k: 'history', g: 'Work', n: 'Order history', ic: 'list', sub: 'Every order, with its confirmation, invoice and waste transfer note' });
    })();

    function list() {
      var q = String(ui.xhQ || '').trim().toLowerCase().replace(/\s+/g, ''), f = ui.xhF || 'all';
      return V3.all().slice().sort(function (a, b) { return b.off - a.off || (a.id < b.id ? 1 : -1); }).filter(function (o) {
        var g = o.status === 'done' ? 'done' : (o.status === 'booked' || o.status === 'confirmed') ? 'booked' : 'site';
        if (f !== 'all' && f !== g) return false;
        if (!q) return true;
        var c = CS.cust(o.cust) || {}, s = {}; try { s = CS.jobSite(o.src === 'j' ? o.job : o) || {}; } catch (e) {}
        var hay = [o.id, o.id.replace(/^CAC-/, ''), o.po || '', c.name || '', s.name || '', s.pc || '', o.pc || ''].join(' ').toLowerCase().replace(/\s+/g, '');
        return hay.indexOf(q) >= 0;
      });
    }
    function card(o) {
      var c = CS.cust(o.cust) || {}, s = {}; try { s = CS.jobSite(o.src === 'j' ? o.job : o) || {}; } catch (e) {}
      var st = ST[o.status] || ['Done', 'ok'], d = CS.dayDate(o.off), what = '';
      try { what = CS.jobDesc(o.src === 'j' ? o.job : o); } catch (e) { what = o.svc; }
      return '<button class="xh-card" data-act="ordOpen" data-id="' + h(o.id) + '"><span class="xh-ic">' + ic(SVC_IC[o.svc] || 'truck') + '</span>' +
        '<span class="xh-bd"><span class="xh-top"><b>' + h(o.id) + '</b><span class="tag ' + st[1] + '">' + st[0] + '</span></span>' +
        '<b class="xh-what">' + h(what) + '</b><small>' + h(c.name || '') + '</small><small>' + h(s.name || '') + (s.pc ? ', ' + h(s.pc) : '') + '</small>' +
        '<span class="xh-foot"><span>' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + (o.po ? ' · PO ' + h(o.po) : '') + '</span><b>' + money(o.sell) + '</b></span></span></button>';
    }
    V.history = function () {
      var all = list(), shown = all.slice(0, ui.xhN || 48), f = ui.xhF || 'all';
      var chips = [['all', 'All'], ['booked', 'Booked'], ['site', 'On site'], ['done', 'Done']].map(function (x) { return '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-act="xhFilter" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('');
      return '<div class="xh-bar"><div class="xh-search">' + ic('search') + '<input id="xhQ" placeholder="Order number, PO, customer, site or postcode" value="' + h(ui.xhQ || '') + '" autocomplete="off" aria-label="Search orders"></div><div class="xh-chips">' + chips + '</div><span class="xh-n">' + all.length + ' order' + (all.length === 1 ? '' : 's') + '</span></div>' +
        (shown.length ? '<div class="xh-grid">' + shown.map(card).join('') + '</div>' : '<div class="card empty" style="padding:28px;text-align:center">' + ic('search') + ' No order matches that. Try the order number on its own, like 1026.</div>') +
        (all.length > shown.length ? '<div style="text-align:center;margin-top:14px"><button class="btn" data-act="xhMore">Show ' + Math.min(48, all.length - shown.length) + ' more</button></div>' : '');
    };
    A.xhFilter = function (el) { ui.xhF = el.dataset.v; ui.xhN = 48; UI.render(); };
    A.xhMore = function () { ui.xhN = (ui.xhN || 48) + 48; UI.render(); };
    document.addEventListener('input', function (e) {
      if (!e.target || e.target.id !== 'xhQ') return;
      ui.xhQ = e.target.value; ui.xhN = 48;
      var pos = e.target.selectionStart; UI.render();
      var i = document.getElementById('xhQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} }
    });
    document.addEventListener('keydown', function (e) {
      if (!e.target || e.target.id !== 'xhQ' || e.key !== 'Enter') return;
      var first = list()[0]; if (first) A.ordOpen({ dataset: { id: first.id } });
    });

    /* email a document to the customer: a short pop-up with the email written, then a tick */
    var NAMES = { order: 'order confirmation', inv: 'invoice', wtn: 'waste transfer note', all: 'order confirmation, invoice and waste transfer note' };
    function layer(html) { var l = document.getElementById('layer'); if (l) l.innerHTML = html; }
    A.xhEmail = function (el) {
      var o = V3.find(el.dataset.id), k = el.dataset.k; if (!o) return;
      var c = CS.cust(o.cust) || {}, files = [];
      if (k === 'order' || k === 'all') files.push('Order confirmation ' + o.id + '.pdf');
      if ((k === 'inv' || k === 'all') && o.inv) files.push('Invoice ' + o.inv + '.pdf');
      if ((k === 'wtn' || k === 'all') && (o.src === 'h' || (o.job && o.job.wtn === 'received'))) files.push('Waste transfer note WTN-' + o.id.replace(/^CAC-/, '') + '.pdf');
      var what = k === 'all' ? 'the paperwork' : 'the ' + NAMES[k];
      var txt = 'Hi ' + (c.first || 'there') + ',\n\nPlease find ' + what + ' for ' + o.id + ' attached.\n\nCheers, John\nCAC Waste Management';
      layer('<div class="scrim" data-act="close"></div><div class="modal xhm" role="dialog" aria-label="Email to the customer"><div class="mhd"><h2>Email ' + h(k === 'all' ? 'the paperwork' : NAMES[k]) + '</h2><button class="iconbtn" data-act="close" aria-label="Close">&times;</button></div><div class="mbd">' +
        '<div class="xhm-to"><small>To</small><b>' + h(c.contact || c.name || '') + '</b><span>' + h(c.email || '') + '</span></div>' +
        '<div class="xhm-files">' + files.map(function (f) { return '<span>' + ic('paperclip') + h(f) + '</span>'; }).join('') + '</div>' +
        '<textarea id="xhmText" rows="5" aria-label="Email">' + h(txt) + '</textarea></div>' +
        '<div class="mft"><button class="btn" data-act="ordOpen" data-id="' + h(o.id) + '">' + ic('chevron-left') + 'Back to the order</button><span class="sp"></span><button class="btn pri" data-act="xhEmailGo" data-id="' + h(o.id) + '" data-k="' + h(k) + '">' + ic('send') + 'Send</button></div></div>');
      ui.xhFiles = files;
    };
    A.xhEmailGo = function (el) {
      var o = V3.find(el.dataset.id); if (!o) return;
      var c = CS.cust(o.cust) || {}, txt = ((document.getElementById('xhmText') || {}).value || '').trim();
      try { var th = CS.threadFor({ type: 'customer', id: o.cust }, 'email'); CS.addMsg(th, 'out', txt, { by: 'John', att: (ui.xhFiles || []).map(function (n) { return { n: n, t: 'doc' }; }) }); th.done = true; th.unread = false; CS.commit(); } catch (e) {}
      layer('');
      try {
        var d = document.createElement('div'); d.className = 'gx-tick'; d.setAttribute('role', 'status');
        d.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i><b>Sent to ' + h(c.email || c.name || 'the customer') + '</b><small style="color:var(--muted);font-size:12px">Demo, nothing is really sent</small>';
        document.body.appendChild(d); setTimeout(function () { d.classList.add('out'); }, 1300); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1700);
      } catch (e) {}
    };
    if (ui.view === 'history' || location.hash === '#history') { ui.view = 'history'; UI.render(); }
  }
  start(0);
})();
