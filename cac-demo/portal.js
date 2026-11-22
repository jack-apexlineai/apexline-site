/* CAC customer link: what a customer sees. Their sites, what is on them, a swap or collection in one tap,
   and their paperwork. Every request lands in the CAC inbox for a person to approve. Sample data only. */
(function () {
  var CS = window.CS, h = CS.esc, money = CS.money, ic = window.ic;
  var params = new URLSearchParams(location.search);
  if (params.get('embed')) document.body.classList.add('embed');
  var S = CS.load();
  var cid = params.get('c') || 'c1'; if (!CS.cust(cid)) cid = 'c1';
  var asked = {};

  function $(s) { return document.querySelector(s); }
  function toast(t, i) { var b = $('#toasts'), el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = 0; setTimeout(function () { el.remove(); }, 400); }, 3600); }
  var ST = { booked: ['Booked, confirming', 'amber'], confirmed: ['Confirmed', 'brand'], onhire: ['On site', 'ok'], exchange: ['Swap booked', 'mail'], collection: ['Collection booked', 'web'] };

  function render() {
    S = CS.S;
    document.documentElement.setAttribute('data-theme', S.settings.theme);
    $('#plogo').src = S.settings.theme === 'dark' ? 'brand/cac-logo-inverted.svg' : 'brand/cac-logo.svg';
    $('#callBtn').innerHTML = ic('phone') + '0330 122 5711';
    var c = CS.cust(cid), js = S.jobs.filter(function (j) { return j.cust === cid; });
    var sites = c.sites.map(function (s, i) {
      var live = js.filter(function (j) { return j.site === i && j.status !== 'done'; });
      return '<div class="acard"><div class="who">' + ic('map-pin') + '<span class="bd"><b>' + h(s.name) + '</b><small>' + h(s.pc) + '</small></span></div>' +
        (live.map(function (j) {
          if (j.status !== 'onhire') delete asked[j.id];
          var st = ST[j.status] || ['', ''], can = j.status === 'onhire' && j.svc === 'skip' && !asked[j.id];
          var when = j.status === 'exchange' ? 'Swap ' + CS.fmtDay(j.exDay).toLowerCase() : j.status === 'collection' ? 'Collection ' + CS.fmtDay(j.colDay).toLowerCase() : j.status === 'onhire' ? 'Delivered ' + CS.fmtDay(j.day).toLowerCase() : 'Due ' + CS.fmtDay(j.day).toLowerCase();
          return '<div class="pjob" style="padding:10px 0;flex-wrap:wrap"><span class="bd"><b>' + h(CS.jobDesc(j)) + '</b><small>' + when + ' · ref ' + j.id + '</small></span>' +
            (asked[j.id] ? '<span class="tag amber">' + ic('clock') + h(asked[j.id]) + ' requested</span>' : '<span class="tag ' + st[1] + '">' + st[0] + '</span>') +
            (can ? '<div class="btns" style="width:100%;grid-template-columns:1fr 1fr;margin-top:8px"><button class="btn pri" data-act="swap" data-id="' + j.id + '">' + ic('exchange') + 'Swap it</button><button class="btn" data-act="collect" data-id="' + j.id + '">' + ic('archive') + 'Collect it</button></div>' : '') + '</div>';
        }).join('') || '<span class="muted" style="font-size:13px">Nothing on this site right now.</span>') +
        '<button class="btn" data-act="order" data-site="' + i + '" style="width:100%">' + ic('plus') + 'Order something for this site</button></div>';
    }).join('');
    var wtns = js.filter(function (j) { return j.wtn === 'received'; }).slice(-5).reverse();
    var invs = S.invoices.filter(function (i) { return i.cust === cid; }).slice(0, 4);
    var r = CS.report(cid);
    $('#cview').innerHTML = '<div class="phello"><h2>Hi ' + h(c.first) + '</h2><p>' + h(c.name) + '. Everything on your sites, in one place.</p></div>' +
      '<div class="psec">' + ic('map-pin') + 'Your sites</div>' + sites +
      (r.moves ? '<div class="psec">' + ic('leaf') + 'This month</div><div class="ptiles"><div class="ptile"><small>Waste moved</small><b>' + r.tonnes + ' t</b></div><div class="ptile"><small>Out of landfill</small><b>' + r.pct + '%</b></div><div class="ptile"><small>Notes on file</small><b>' + r.moves + '</b></div></div>' : '') +
      '<div class="psec">' + ic('certificate') + 'Waste transfer notes</div><div class="plist">' + (wtns.map(function (j) { return '<button class="pjob" data-act="wtn" data-id="' + j.id + '"><span class="bd"><b>' + h(CS.jobDesc(j)) + ', ' + h(CS.jobSite(j).name) + '</b><small>' + j.id + ' · ' + CS.fmtDay(j.day) + '</small></span>' + ic('download') + '</button>'; }).join('') || '<div class="empty">None yet.</div>') + '</div>' +
      '<div class="psec">' + ic('receipt') + 'Invoices</div><div class="plist">' + (invs.map(function (i) { return '<button class="pjob" data-act="inv" data-id="' + i.id + '"><span class="bd"><b>' + i.id + ' · ' + money(i.amount, true) + '</b><small>' + (i.status === 'paid' ? 'Paid' : 'Due ' + CS.fmtDay(i.due)) + '</small></span><span class="tag ' + (i.status === 'paid' ? 'ok' : i.due < 0 ? 'bad' : '') + '">' + (i.status === 'paid' ? 'Paid' : i.due < 0 ? (-i.due) + ' days over' : 'Due') + '</span>' + ic('download') + '</button>'; }).join('') || '<div class="empty">None yet.</div>') + '</div>' +
      '<p class="muted" style="text-align:center;font-size:11.5px;margin:6px 0 0">Demo with sample data. Requests go to the CAC office, a person confirms each one.' + (params.get('embed') ? '' : ' <a class="link" href="index.html#customers">Back to the office</a>') + '</p>';
  }

  /* a quote sent from the office, opened from the link in the WhatsApp or email */
  var qid = params.get('q');
  function renderQuote() {
    S = CS.S;
    document.documentElement.setAttribute('data-theme', S.settings.theme);
    $('#plogo').src = S.settings.theme === 'dark' ? 'brand/cac-logo-inverted.svg' : 'brand/cac-logo.svg';
    $('#callBtn').innerHTML = ic('phone') + '0330 122 5711';
    var q = CS.quote(qid);
    if (!q) { $('#cview').innerHTML = '<div class="phello"><h2>Quote not found</h2><p>Give us a ring on 0330 122 5711 and we\'ll sort it.</p></div>'; return; }
    var p = CS.party(q.cust ? { type: 'customer', id: q.cust } : { type: 'lead', id: q.lead });
    var held = new Date(); held.setDate(held.getDate() + 14);
    $('#cview').innerHTML = '<div class="phello"><h2>Hi ' + h(p.first) + '</h2><p>Here\'s your price from CAC. One tap and it\'s booked.</p></div>' +
      '<div class="acard pquote"><small class="muted">Quote ' + h(q.id) + '</small><b class="pqi">' + h(q.desc) + '</b>' + (q.when ? '<span class="muted">' + h(q.when) + (q.pc ? ' · ' + h(q.pc) : '') + '</span>' : '') +
      '<div class="pqp">' + money(q.sell) + '<small> + VAT</small></div>' +
      '<ul class="pqinc"><li>' + ic('check') + 'Delivery and collection</li><li>' + ic('check') + 'Waste transfer note, sent to you</li>' + (q.permit ? '<li>' + ic('check') + 'Council permit sorted</li>' : '') + '<li>' + ic('check') + 'Registered carrier CBDU650137</li></ul>' +
      '<small class="muted">Price held until ' + held.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '</small>' +
      (q.accepted ? '<div class="note" style="background:var(--ok-l);margin-top:12px">' + ic('circle-check') + '<span><b>Accepted, thank you.</b> We\'ll confirm the delivery window on WhatsApp shortly.</span></div>' :
        '<div class="btns" style="margin-top:14px;grid-template-columns:1fr"><button class="btn pri" data-act="acceptQ" style="height:48px;font-size:15px">' + ic('check') + 'Accept and book it</button><a class="btn" href="tel:03301225711">' + ic('phone') + 'Ring us about it</a></div>') + '</div>' +
      '<p class="muted" style="text-align:center;font-size:11.5px;margin:10px 0 0">One number for everything. Same person, every time.<br>Demo with sample data.</p>';
  }
  function acceptQuote() {
    var q = CS.quote(qid); if (!q || q.accepted) return;
    q.accepted = true; q.status = 'won';
    var p = q.cust ? { type: 'customer', id: q.cust } : { type: 'lead', id: q.lead };
    CS.incoming({ party: p, ch: 'portal', subject: 'Quote ' + q.id + ' accepted', text: 'Accepted quote ' + q.id + ': ' + (q.item || q.desc) + ' at ' + (q.pc || '') + ' ' + (q.when || '').toLowerCase() + ', ' + money(q.sell) + ' + VAT. Please book it.' });
    CS.commit('portal'); renderQuote(); toast('Accepted. CAC will confirm the window on WhatsApp.', 'circle-check');
  }
  function request(kind, jid) {
    var j = CS.job(jid), s = CS.jobSite(j), ex = kind === 'exchange';
    asked[jid] = ex ? 'Swap' : 'Collection';
    CS.incoming({ party: { type: 'customer', id: cid }, ch: 'portal', subject: 'Customer link request', text: (ex ? 'Swap' : 'Collection') + ' requested for the ' + CS.jobDesc(j).toLowerCase() + ' at ' + s.name + ' (' + j.id + '), tomorrow if possible.', scn: { kind: kind, job: jid, day: 1 } });
    CS.commit('portal');
    toast((ex ? 'Swap' : 'Collection') + ' requested. We\'ll confirm on WhatsApp shortly.', 'circle-check');
  }
  var A = {
    swap: function (el) { request('exchange', el.dataset.id); },
    collect: function (el) { request('collect', el.dataset.id); },
    order: function (el) {
      var c = CS.cust(cid), s = c.sites[el.dataset.site];
      $('#layer').innerHTML = '<div class="scrim" data-act="closeL"></div><div class="modal" role="dialog" aria-label="Order for this site"><div class="mhd"><h2>Order for ' + h(s.name) + '</h2><button class="iconbtn" data-act="closeL" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' +
        '<div class="field"><label for="poWhat">What do you need?</label><select id="poWhat"><option>8 yard skip</option><option>6 yard skip</option><option>12 yard skip</option><option>Grab lorry</option><option>Site toilet for 4 weeks</option><option>Welfare unit for 4 weeks</option></select></div>' +
        '<div class="field"><label for="poWhen">When?</label><select id="poWhen"><option>Tomorrow</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option></select></div>' +
        '<div class="field"><label for="poNote">Anything we should know?</label><input id="poNote" placeholder="On the drive, gate code, AM only"></div></div>' +
        '<div class="mft"><button class="btn pri" data-act="orderSend" data-site="' + el.dataset.site + '">' + ic('send') + 'Send to CAC</button></div></div>';
    },
    orderSend: function (el) {
      var c = CS.cust(cid), s = c.sites[el.dataset.site];
      var txt = 'Need a ' + $('#poWhat').value.toLowerCase() + ' at ' + s.name + ' ' + s.pc + ' ' + $('#poWhen').value.toLowerCase() + ($('#poNote').value.trim() ? '. ' + $('#poNote').value.trim() : '');
      CS.incoming({ party: { type: 'customer', id: cid }, ch: 'portal', subject: 'Customer link order', text: txt });
      CS.commit('portal'); $('#layer').innerHTML = ''; toast('Sent. We\'ll confirm the price and the day shortly.', 'circle-check');
    },
    wtn: function (el) {
      var j = CS.job(el.dataset.id), su = CS.sup(j.sup), sv = CS.svc(j.svc), c = CS.cust(cid), s = CS.jobSite(j);
      $('#layer').innerHTML = '<div class="scrim" data-act="closeL"></div><div class="modal" role="dialog" aria-label="Waste transfer note"><div class="mhd"><h2>WTN ' + j.id + '</h2><button class="iconbtn" data-act="closeL" aria-label="Close">' + ic('x') + '</button></div><div class="mbd"><div class="doc"><h4>Waste Transfer Note</h4><div style="color:#666;font-size:11.5px">Ref ' + j.id + ' · ' + CS.dayDate(j.day).toLocaleDateString('en-GB') + ' · Sample document for the demo</div>' +
        '<div class="dg"><div class="bx"><small>Waste</small>' + h(sv.waste || '') + '<br>EWC ' + h(sv.ewc || '') + '</div><div class="bx"><small>Site</small>' + h(s.name) + '<br>' + h(s.pc) + '</div><div class="bx"><small>Producer</small>' + h(c.name) + '</div><div class="bx"><small>Carrier</small>' + h(su.name) + '<br>' + h(su.cbdu) + '</div></div></div></div></div>';
    },
    inv: function (el) {
      var i = CS.inv(el.dataset.id), c = CS.cust(cid); if (!i) return;
      $('#layer').innerHTML = '<div class="scrim" data-act="closeL"></div><div class="modal" role="dialog" aria-label="Invoice"><div class="mhd"><h2>Invoice ' + i.id + '</h2><button class="iconbtn" data-act="closeL" aria-label="Close">' + ic('x') + '</button></div><div class="mbd"><div class="doc"><h4>Invoice ' + i.id + '</h4><div style="color:#666;font-size:11.5px">' + CS.dayDate(i.issued).toLocaleDateString('en-GB') + ' · Sample document for the demo</div>' +
        '<div class="dg"><div class="bx"><small>To</small>' + h(c.name) + '</div><div class="bx"><small>Net</small>' + money(i.amount, true) + '</div><div class="bx"><small>VAT at 20%</small>' + money(i.amount * 0.2, true) + '</div><div class="bx"><small>Total</small>' + money(i.amount * 1.2, true) + '<br>' + (i.status === 'paid' ? 'Paid' : 'Due ' + CS.fmtDay(i.due)) + '</div></div></div></div></div>';
    },
    acceptQ: function () { acceptQuote(); },
    closeL: function () { $('#layer').innerHTML = ''; }
  };
  document.addEventListener('click', function (e) { var el = e.target.closest('[data-act]'); if (!el) return; var a = el.getAttribute('data-act'); if (A[a]) { e.preventDefault(); A[a](el); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') A.closeL(); });
  CS.on(function () { if (!$('#layer').innerHTML) { if (qid) renderQuote(); else render(); } });
  if (qid) renderQuote(); else render();
})();
