/* Two basics.
   1. Every booking sends the customer an email confirmation with the order confirmation attached, whatever channel they
      asked on. A WhatsApp reply can still go back as the quick answer; the confirmation always goes by email.
      This covers bookings approved from the inbox, from Skipper, from a customer portal request and from Lee's card.
      New order already sends its confirmation by email, so it is not sent twice.
   2. Once a conversation has been dealt with it does not fall to "cold". It says what happened: Booked, Quote sent or Replied. */
(function () {
  function start(tries) {
    var UI = window.CACUI, CS = window.CS, SK = window.CACSK;
    if (!(UI && UI.A && CS && CS.S && CS.approve && SK && SK.temp)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }

    function confirmEmail(j) {
      var c = CS.cust(j.cust); if (!c) return;
      var s = {}; try { s = CS.jobSite(j) || {}; } catch (e) {}
      var when = CS.dayDate(j.day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      var what = ''; try { what = CS.jobDesc(j); } catch (e) { what = 'Your order'; }
      var txt = 'Hi ' + (c.first || 'there') + ',\n\nYour booking is confirmed.\n\nOrder: ' + j.id + '\nWhat: ' + what + '\nSite: ' + (s.name || '') + (s.pc ? ', ' + s.pc : '') + '\nDate: ' + when + (j.time && !/any/i.test(j.time) ? ', ' + j.time : '') + '\nPrice: ' + money(j.sell) + ' + VAT' + (j.po ? '\nYour PO: ' + j.po : '') +
        '\n\nThe order confirmation is attached. I will let you know the delivery window as soon as the supplier gives it.\n\nCheers, John\nCAC Waste Management';
      try { var th = CS.newThread({ type: 'customer', id: c.id }, 'email', 'Order confirmation ' + j.id); CS.addMsg(th, 'out', txt, { by: 'John', att: [{ n: 'Order confirmation ' + j.id + '.pdf', t: 'doc' }], conf: j.id }); th.done = true; th.unread = false; } catch (e) {}
      j.log = j.log || []; j.log.push({ t: 'Order confirmation emailed to ' + (c.email || c.contact || 'the customer'), at: Date.now() });
    }
    var ap = CS.approve;
    CS.approve = function (tid) {
      var before = {}; CS.S.jobs.forEach(function (j) { before[j.id] = 1; });
      var out = ap.apply(this, arguments);
      try {
        CS.S.jobs.filter(function (j) { return !before[j.id]; }).forEach(function (j) {
          confirmEmail(j);
          if (Array.isArray(out)) out.push('Order confirmation emailed');
        });
        CS.save();
      } catch (e) {}
      return out;
    };

    /* the chip says what happened once it is dealt with */
    var t0 = SK.temp;
    SK.temp = function (t) {
      var r = t0.apply(this, arguments);
      if (!t || !t.party || t.party.type === 'supplier' || !r || r.k !== 'cold') return r;
      var outs = (t.msgs || []).filter(function (m) { return m.dir === 'out' && !m.auto; }), last = outs[outs.length - 1];
      if (!last) return r;
      var booked = t.gx === 3 || (t.sx === 1 && t.sxJob) || /\bbooked\b|\bbooking is confirmed\b/i.test(last.text || '');
      if (booked) return { k: 'booked', label: 'Booked', line: 'Booked', next: 'Nothing to do' };
      if (/\+ ?VAT/.test(last.text || '')) return { k: 'warm', label: 'Quote sent', line: 'Quote sent', next: 'Follow up if no answer in 2 days' };
      return { k: 'done', label: 'Replied', line: 'Replied', next: 'Nothing to do' };
    };
    UI.render();
  }
  start(0);
})();
