/* CAC demo, quotes and duty of care layer.
   1. Quotes list in the order it needs attention: oldest open quote first, the one sent last at the bottom, won and lost after.
   2. One button at the top of Quotes that follows up every quote gone quiet, using the same follow-up as the single buttons.
   3. Duty of care: every filed waste transfer note says which order it is filed on, and opens that order.
   Sample data only. Nothing leaves this browser and nothing is sent. */
(function () {
  function start(tries) {
    var UI = window.CACUI, CS = window.CS;
    if (!(UI && UI.V && UI.A && CS && CS.S && UI.V.quotes && UI.V.paperwork)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    if (UI.xQuotes) return; UI.xQuotes = 1;
    var A = UI.A, V = UI.V;
    var ic = window.ic || function () { return ''; };
    var h = CS.esc || function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var money = CS.money || function (n) { return '£' + Math.round(n); };
    function S() { return CS.S; }
    function quotes() { return (S() && S().quotes) || []; }
    function tpl(html) { var t = document.createElement('template'); t.innerHTML = html; return t; }
    function toast(text, icon) {
      var box = document.getElementById('toasts'); if (!box) return;
      var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(icon || 'circle-check') + '<span>' + text + '</span>';
      box.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 5200);
    }

    /* ---------- which quotes are due a follow-up: the same rule as the "Quotes gone quiet" card ---------- */
    function isQuiet(q) { return q.status === 'sent' && q.day <= -3; }
    function due() { return quotes().filter(function (q) { return isQuiet(q) && !q.snoozed; }).sort(function (a, b) { return a.day - b.day; }); }
    function doneToday() { return quotes().some(function (q) { return isQuiet(q) && q.snoozed && q.chased; }); }

    /* ---------- remember when a quote is sent, so the one sent last can sit at the bottom of the open quotes ---------- */
    var seen = null;
    function snap() {
      var first = !seen, now = Date.now(), l = quotes(), next = {};
      for (var i = l.length - 1; i >= 0; i--) {
        var x = l[i];
        if (!first && x.status === 'sent' && seen[x.id] !== 'sent') x.xqAt = now + (l.length - i);
        next[x.id] = x.status;
      }
      seen = next;
    }
    function order() {
      var l = quotes(), pos = {};
      l.forEach(function (x, i) { pos[x.id] = i; });
      function grp(x) { return x.status === 'won' ? 1 : x.status === 'lost' ? 2 : 0; }
      var sorted = l.slice().sort(function (a, b) {
        var ga = grp(a), gb = grp(b);
        if (ga !== gb) return ga - gb;
        if (ga === 0) return ((b.xqAt || 0) - (a.xqAt || 0)) || (b.day - a.day) || (pos[b.id] - pos[a.id]);   /* the one just sent at the top, then newest first */
        return (b.day - a.day) || (pos[a.id] - pos[b.id]);                                                    /* won and lost: newest first */
      });
      var out = {}; sorted.forEach(function (x, i) { out[x.id] = i; }); return out;
    }

    function bar() {
      var l = due(), n = l.length, worth = l.reduce(function (a, x) { return a + (x.sell || 0); }, 0);
      var label, note, off = !n;
      if (n) { label = ic('send') + '<span>Send all follow-ups due today</span><span class="xq-n" id="xqDueN">' + n + '</span>'; note = n + (n === 1 ? ' quote was' : ' quotes were') + ' sent 3 or more days ago with no answer. ' + money(worth) + ' of work.'; }
      else if (doneToday()) { label = ic('check') + '<span>All followed up today</span>'; note = 'Every quote that had gone quiet has a follow-up ready. Nothing is sent in this demo.'; }
      else { label = ic('check') + '<span>No follow-ups due today</span>'; note = 'No quote is waiting on a follow-up today.'; }
      return '<div class="card xq-bar" id="xqBar" data-due="' + n + '"><div class="xq-bt"><b>' + ic('bell') + 'Follow-ups due today</b><small>' + h(note) + '</small></div>' +
        '<button type="button" class="btn pri xq-all" id="xqSendAll" data-act="xqSendAll"' + (off ? ' disabled aria-disabled="true"' : '') + '>' + label + '</button></div>';
    }

    var quotes0 = V.quotes;
    V.quotes = function () {
      var html = quotes0();
      try {
        snap();
        var t = tpl(html), root = t.content, ord = order();
        var rows = [].slice.call(root.querySelectorAll('tr[data-act="openQuote"]'));
        if (rows.length > 1) {
          var body = rows[0].parentNode;
          /* only the live quotes in the list: won and lost ones are counted in the figures and the reasons, not listed */
          var st = {}; quotes().forEach(function (x) { st[x.id] = x.status; });
          if ((UI.ui.qFilter || 'all') === 'all') rows.forEach(function (r) { var s2 = st[r.getAttribute('data-id')]; if (s2 === 'won' || s2 === 'lost') r.parentNode.removeChild(r); });
          rows = rows.filter(function (r) { return !!r.parentNode; });
          rows.filter(function (r) { return r.parentNode === body; })
            .sort(function (a, b) { var x = ord[a.getAttribute('data-id')], y = ord[b.getAttribute('data-id')]; return (x == null ? 1e6 : x) - (y == null ? 1e6 : y); })
            .forEach(function (r) { body.appendChild(r); });
        }
        /* the "Need a follow up" number follows the same rule as the button, so the two always agree */
        [].forEach.call(root.querySelectorAll('.kpi'), function (k) {
          var sm = k.querySelector('small'), b = k.querySelector('b');
          if (sm && b && /need a follow.?up/i.test(sm.textContent)) b.textContent = due().length;
        });
        return bar() + t.innerHTML;
      } catch (e) { return html; }
    };

    /* one press: the app's own follow-up for each quiet quote, then one toast */
    A.xqSendAll = function () {
      var l = due(), n = l.length; if (!n) return;
      l.forEach(function (x) { CS.chaseQuote(x.id); x.snoozed = true; });
      CS.commit();
      toast(n + (n === 1 ? ' follow-up' : ' follow-ups') + ' ready. Nothing is sent in this demo.', 'send');
    };

    /* ---------- duty of care: a filed note says which order it is filed on ---------- */
    function hasOrder(id) { return !!(A.ordOpen && window.CACV3 && window.CACV3.find && window.CACV3.find(id)); }
    var pap0 = V.paperwork;
    V.paperwork = function () {
      var html = pap0();
      try {
        var t = tpl(html), root = t.content;
        [].forEach.call(root.querySelectorAll('[data-act="viewWtn"][data-id]'), function (b) {
          var id = b.getAttribute('data-id'), j = CS.job && CS.job(id);
          if (j && j.wtn !== 'received') return;
          var row = b.closest('tr') || b.closest('.rowline'); if (!row || row.querySelector('.xq-where')) return;
          var sp = b.querySelector('span'); if (sp) sp.textContent = 'View note'; else b.insertAdjacentHTML('beforeend', '<span>View note</span>');
          b.classList.add('xq-vn'); b.setAttribute('title', 'View the waste transfer note'); b.setAttribute('aria-label', 'View note for ' + id);
          var where = '<button type="button" class="xq-where" data-act="' + (hasOrder(id) ? 'ordOpen' : 'openJob') + '" data-id="' + h(id) + '" title="Open the order. Its documents are kept together there.">' +
            '<span>Filed on order ' + h(id) + '</span>' + ic('chevron-right') + '</button>';
          if (row.tagName === 'TR') {
            var tag = row.querySelector('td .tag.ok'), cell = tag ? tag.closest('td') : null;
            if (!cell) { var tds = row.querySelectorAll('td'); cell = tds[tds.length - 2] || tds[0]; }
            if (cell) { cell.classList.add('xq-wc'); cell.insertAdjacentHTML('beforeend', where); }
            var tb = row.closest('table'); if (tb) tb.classList.add('xq-wt');
          } else {
            var bd = row.querySelector('.bd'); if (bd) bd.insertAdjacentHTML('beforeend', where);
            row.classList.add('xq-fr');
          }
        });
        return t.innerHTML;
      } catch (e) { return html; }
    };

    snap();
    if (UI.render) UI.render();
  }
  start(0);
})();
