/* The customer's build tracker: a link CBR sends with every update. Stage, photos and date,
   straight from the build file, so nobody has to ring to ask where their body is. */
(function () {
  var $ = WS.$, esc = WS.esc;
  var Q = /[?&]b=([a-z0-9]+)/i.exec(location.search), id = Q ? Q[1] : 'bd4';
  var asking = false;

  function render() {
    var b = WS.build(id) || (WS.state.builds || [])[0];
    if (!b) { $('tk').innerHTML = '<div class="va-pad">This tracker link has expired.</div>'; return; }
    var o = WS.operator(b.operatorId) || {}, si = WS.stageIx(b.stage);
    var photos = (b.photos || []).slice().reverse();
    var hero = photos[0];
    var late = b.stage === 'ordered' && b.chassis && !b.chassis.arrived && b.chassis.due < WS.day(0);
    var ups = (b.updates || []).slice().reverse();
    $('tk').innerHTML =
      '<header class="va-top"><img src="brand/cbr-logo.png" alt="CBR" class="va-logo"><div class="va-who"><b>Commercial Bodies & Repairs</b><span>Your build tracker</span></div></header>' +
      '<div class="va-pad"><p class="va-muted">Hi ' + esc(String(o.contact || '').split(' ')[0]) + ', here is your new body.</p>' +
      '<h1 class="va-h">' + esc(b.title) + '</h1><p class="va-muted">' + esc(b.no) + ' · ' + esc(b.chassis.make + ' ' + b.chassis.model) + '</p>' +
      (hero ? '<img class="tk-hero" src="' + WS.photoSrc(hero.art || hero.src) + '" alt="Latest photo of your build"><div class="tk-cap">' + esc(hero.caption || '') + ' · ' + WS.whenUK(hero.at) + '</div>' : '') +
      '<div class="tk-due ' + (late ? 'late' : '') + '"><span>' + (b.stage === 'delivered' ? 'Delivered' : 'Ready for') + '</span><b>' + WS.dateUK(b.stage === 'delivered' && b.stageDates.delivered ? b.stageDates.delivered : b.due) + '</b>' +
      (late ? '<em>Your chassis is late from the dealer. We start the day it lands.</em>' : '') + '</div>' +
      '<ol class="tk-steps">' + WS.BUILD_STAGES.map(function (s, i) {
        var d = b.stageDates && b.stageDates[s.k];
        return '<li class="' + (i < si ? 'd' : i === si ? 'c' : '') + '"><i>' + (i < si ? '✓' : '') + '</i><span><b>' + esc(s.name) + '</b>' + (d && i <= si ? '<em>' + WS.dateShort(d) + '</em>' : '') + '</span></li>';
      }).join('') + '</ol>' +
      (b.extras || []).filter(function (x) { return x.status === 'Sent'; }).map(function (x) {
        return '<div class="va-card tk-extra"><h2>An extra for you to approve</h2><p><b>' + esc(x.name) + '</b><br>' + WS.money0(x.price) + ' plus VAT, priced by ' + esc(x.by) + '</p>' +
          '<p class="va-muted">Nothing is built until you say yes.</p><div class="va-row"><button type="button" class="btn" data-xyes="' + x.id + '">Yes, add it</button><button type="button" class="btn alt" data-xno="' + x.id + '">No thanks</button></div></div>';
      }).join('') +
      (ups.length ? '<div class="va-card"><h2>From CBR</h2>' + ups.map(function (u) { return '<div class="tk-up"><b>' + esc(u.by) + '</b> · <span>' + WS.whenUK(u.at) + '</span><p>' + esc(u.text) + '</p></div>'; }).join('') + '</div>' : '') +
      (photos.length > 1 ? '<div class="va-card"><h2>Photos</h2><div class="va-phs">' + photos.slice(1).map(function (p) { return '<img src="' + WS.photoSrc(p.art || p.src) + '" alt="' + esc(p.caption || '') + '">'; }).join('') + '</div></div>' : '') +
      (asking ? '<div class="va-card"><h2>Ask CBR</h2><textarea class="in" id="tkQ" rows="3" placeholder="Your question"></textarea><div class="va-row"><button type="button" class="btn" id="tkSend">Send</button><button type="button" class="btn alt" id="tkCancel">Cancel</button></div></div>'
        : '<button type="button" class="btn alt block" id="tkAsk">Ask CBR a question</button>') +
      '<p class="va-muted c" style="margin-top:16px">Unit 7, 51 Algores Way, Wisbech · cbr-ltd.co.uk</p>' +
      (WS.inDock ? '' : '<a class="va-office" href="index.html">Back to the office demo</a>') + '</div>';
    function decide(xid, yes) {
      var x = (b.extras || []).filter(function (e) { return e.id === xid; })[0];
      if (!x) return;
      x.status = yes ? 'Approved' : 'Declined'; x.decidedAt = WS.nowStamp(); x.decidedBy = o.contact || 'Customer';
      if (yes) {
        b.price += x.price;
        b.hoursQuoted[x.stage] = (b.hoursQuoted[x.stage] || 0) + (x.hours || 0);
        if (x.cost) b.materials.push({ item: x.name, budget: x.cost, actual: 0 });
        if (x.opt && b.options.indexOf(x.opt) < 0) b.options.push(x.opt);
      }
      WS.buildLog(b, o.contact || 'Customer', (yes ? 'Approved' : 'Declined') + ' the extra on their tracker: ' + x.name + ', ' + WS.money0(x.price));
      WS.notify('Office', 'in app', b.no + ' extra ' + (yes ? 'approved' : 'declined'), (o.contact || 'Customer') + ' ' + (yes ? 'approved' : 'declined') + ' ' + x.name + '.', yes ? 'ready' : 'defect');
      WS.save(); render();
      WS.toast(yes ? 'Added to your build. CBR have been told.' : 'No problem. CBR have been told.', 'ok');
    }
    document.querySelectorAll('[data-xyes]').forEach(function (e) { e.onclick = function () { decide(e.dataset.xyes, true); }; });
    document.querySelectorAll('[data-xno]').forEach(function (e) { e.onclick = function () { decide(e.dataset.xno, false); }; });
    var a = $('tkAsk'); if (a) a.onclick = function () { asking = true; render(); var q = $('tkQ'); if (q) q.focus(); };
    var c = $('tkCancel'); if (c) c.onclick = function () { asking = false; render(); };
    var s = $('tkSend'); if (s) s.onclick = function () {
      var t = $('tkQ').value.trim();
      if (!t) { WS.toast('Type your question first.', 'bad'); return; }
      WS.buildLog(b, o.contact || 'Customer', 'Asked on the tracker: ' + t);
      WS.notify('Office', 'in app', b.no + ' question', (o.contact || 'Customer') + ' asked: ' + t, 'approval');
      asking = false;
      WS.save();
      render();
      WS.toast('Sent to CBR. They will reply by text.', 'ok');
    };
  }
  WS.initTheme();
  WS.load();
  WS.applyBrand();
  WS.watch();
  WS.onChange(function () { if (!asking) render(); });
  render();
})();
