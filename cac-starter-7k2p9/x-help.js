/* Help: a question mark in the top bar. A walk-round, short how-to recordings, and the common "is this a fault?" answers.
   The recordings are made on each customer's own system at go-live, so in the demo they are listed, not played. */
(function () {
  var Q = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 1 1 3.9 2.3c-.9.5-1.4 1.1-1.4 2"/><path d="M12 17h.01"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var VIDS = [['Place an order', '1 min'], ['Book an exchange or a collection', '40 sec'], ['Add a supplier and their price list', '1 min'], ['Approve a new supplier', '1 min'], ['Upload a renewed licence or insurance', '40 sec'], ['Put an account on stop', '30 sec'], ['Import customers from a spreadsheet', '1 min']];
  var FIX = [['A customer cannot be booked', 'They are on stop. Take them off stop in Credit control.'], ['A supplier is missing from a new order', 'Their cover area or price list does not include that postcode yet, or a document has run out. Check the Supplier handbook and Compliance.'], ['A supplier shows as blocked', 'A licence, permit or insurance has run out. Upload the new one in Compliance and they can be booked again.']];
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function start(tries) {
    var UI = window.CACUI, top = document.querySelector('header.top');
    if (!(UI && top)) { if ((tries || 0) < 80) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    function place() {
      if (document.getElementById('xhBtn')) return;
      var b = document.createElement('button'); b.className = 'iconbtn xh-btn'; b.id = 'xhBtn'; b.setAttribute('data-act', 'xhHelp'); b.title = 'Help'; b.setAttribute('aria-label', 'Help'); b.innerHTML = Q;
      var demo = document.getElementById('skDemoBtn'), ref = demo ? (demo.closest('.sk-demo') || demo) : top.querySelector('.demo-badge');
      if (ref && ref.parentNode === top) top.insertBefore(b, ref); else top.appendChild(b);
    }
    UI.A.xhHelp = function () {
      var layer = document.getElementById('layer'); if (!layer) return;
      layer.innerHTML = '<div class="scrim" data-act="close"></div><div class="modal xh" role="dialog" aria-label="Help"><div class="mhd"><h2>Help</h2><button class="iconbtn" data-act="close" aria-label="Close">&times;</button></div><div class="mbd">' +
        '<div class="xh-h"><b>How-to recordings</b><span class="tag">Recorded on your own system at go-live</span></div>' +
        '<div class="xh-list">' + VIDS.map(function (v) { return '<div class="xh-v"><i>' + PLAY + '</i><span>' + esc(v[0]) + '</span><small>' + v[1] + '</small></div>'; }).join('') + '</div>' +
        '<div class="xh-h"><b>Looks like a fault, but is a setting</b></div>' +
        '<div class="xh-list">' + FIX.map(function (v) { return '<div class="xh-f"><b>' + esc(v[0]) + '</b><small>' + esc(v[1]) + '</small></div>'; }).join('') + '</div>' +
        '<p class="xh-foot">Still stuck? Ring or message ApexLine on +44 7949 088642.</p></div></div>';
    };
    UI.A.xhTour = function () { UI.A.close(); if (window.CACP && window.CACP.tour) setTimeout(window.CACP.tour, 150); };
    place(); setTimeout(place, 600); setTimeout(place, 1600);
  }
  start(0);
})();
