/* Waste in: weighbridge tickets for lorries tipping at the yard, the same way WasteLine does it.
   Type the registration: a known tipper fills in from its last visit (stored tare, customer, waste), one of your own
   lorries asks which job the load came from and replaces that job's estimated weight with the real one.
   Gross minus tare is the net, priced per tonne or per load, paid by cash or card or put on account.
   On account tickets are billed as Waste in invoices. Every ticket makes its transfer note and its Defra record.
   Sample data in this browser only. */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && window.DSGY && window.DSGNAV)) { if ((tries || 0) < 200) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    function gbp(n) { return CS.money(n, true); }
    function save() { CS.save(); }
    function toast(t, i) { var b = q('#toasts'); if (!b) return; var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 4200); }
    function modal(title, body, foot, cls) { q('#layer').innerHTML = '<div class="scrim" data-act="close"></div><div class="modal ' + (cls || '') + '" role="dialog" aria-label="' + h(String(title).replace(/<[^>]+>/g, '')) + '"><div class="mhd"><h2>' + title + '</h2><button class="iconbtn" data-act="close" aria-label="Close">' + ic('x') + '</button></div><div class="mbd">' + body + '</div>' + (foot ? '<div class="mft">' + foot + '</div>' : '') + '</div>'; }
    function regKey(r) { return String(r || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
    function hhmm() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

    /* ---------- the yard's waste types, gate prices per tonne (ex VAT) and loads ---------- */
    var WT = ['mixed', 'soil', 'hardcore', 'concrete', 'wood', 'green', 'plaster', 'metal', 'house'];
    var RATE = { mixed: 165, soil: 45, hardcore: 28, concrete: 28, wood: 95, green: 65, plaster: 175, metal: 0, house: 165 }, PER_LOAD = 85;
    var LOADS = ['4 yard skip', '6 yard skip', '8 yard skip', '12 yard skip', '16 yard skip', 'Grab load', 'Tipper', 'Roll-on roll-off', 'Van / loose'];
    /* regulars at the weighbridge: their stored tare, the customer, what they usually bring */
    var REGS = {
      KX19VAN: { customer: 'Mr Dan Hollis', biz: false, tare: 2140, driver: 'Dan', load: 'Van / loose', waste: 'house', origin: '27 Elm Road, Horsell GU21' },
      PY68TIP: { customer: 'Pyrford Plastering Ltd', biz: true, tare: 7820, driver: 'Carl', load: 'Tipper', waste: 'plaster', origin: 'Coldharbour Road job, Pyrford', lic: 'CBDU271144', email: 'accounts@pyrfordplastering.co.uk' },
      BL20LND: { customer: 'Byfleet Landscapes', biz: true, tare: 6950, driver: 'Mo', load: 'Tipper', waste: 'green', origin: 'Oyster Lane garden, Byfleet', lic: 'CBDU350912', email: 'office@byfleetlandscapes.co.uk' },
      RM68SKP: { customer: 'Ringway Skip Hire', biz: true, tare: 9840, driver: 'Gav', load: '8 yard skip', waste: 'mixed', origin: 'Customer skips, Guildford', lic: 'CBDU377415', email: 'accounts@ringwayskips.co.uk' },
      WR19VAN: { customer: 'Westmarsh Roofing', biz: true, tare: 2310, driver: 'Steve', load: 'Van / loose', waste: 'wood', origin: 'Kingfield roof strip, Woking', lic: 'CBDU312987', email: '' },
      TL70BLD: { customer: 'R. Tolhurst Builders', biz: true, tare: 3420, driver: 'Rob', load: 'Van / loose', waste: 'mixed', origin: 'Elmcroft Avenue extension, Horsell', lic: 'CBDU300177', email: 'rob@tolhurstbuilders.co.uk' }
    };
    function own(reg) { var k = regKey(reg); return YC.LORRIES.filter(function (l) { return regKey(l.reg) === k; })[0] || null; }

    /* ---------- seed a realistic Surrey day ---------- */
    function seed(y) {
      if (y.wastein) return y.wastein;
      var W = y.wastein = { list: [], invoices: [], n: 1201, inv: 401 };
      function t(day, time, reg, net, rateBasis, pay, status, extra) {
        var r = REGS[regKey(reg)] || {}, waste = (extra && extra.waste) || r.waste || 'mixed', basis = rateBasis || 'tonne', rate = basis === 'load' ? PER_LOAD : RATE[waste];
        var gross = (r.tare || 7000) + net, charge = basis === 'load' ? rate : Math.round(net / 1000 * rate * 100) / 100;
        var o = { no: 'TI-' + (W.n++), day: day, time: time, reg: reg, customer: r.customer, biz: !!r.biz, email: r.email || '', driver: r.driver || '', origin: r.origin || '', load: r.load || 'Tipper', waste: waste, ewc: YC.STREAMS[waste].ewc, lic: r.lic || '',
          gross: gross, tare: r.tare || 7000, net: net, basis: basis, rate: rate, charge: charge, vat: Math.round(charge * 20) / 100, total: Math.round(charge * 120) / 100, pay: pay, status: status, notes: '' };
        if (extra) for (var k in extra) o[k] = extra[k];
        W.list.push(o); return o;
      }
      t(-1, '08:05', 'RM68 SKP', 3240, 'tonne', 'On account', 'Invoiced', { inv: 'WI-400' });
      t(-1, '09:20', 'PY68 TIP', 4860, 'tonne', 'On account', 'On account');
      t(-1, '11:45', 'KX19 VAN', 640, 'load', 'Cash', 'Paid');
      t(-1, '14:10', 'BL20 LND', 3120, 'tonne', 'On account', 'On account');
      t(0, '07:38', 'RM68 SKP', 2980, 'tonne', 'On account', 'On account');
      t(0, '08:12', 'KX19 VAN', 820, 'load', 'Card', 'Paid');
      t(0, '08:55', 'PY68 TIP', 5120, 'tonne', 'On account', 'On account');
      t(0, '09:31', 'TL70 BLD', 1260, 'tonne', 'Cash', 'Paid');
      t(0, '10:06', 'BL20 LND', 3880, 'tonne', 'On account', 'On account');
      t(0, '10:48', 'WR19 VAN', 860, 'tonne', 'Cash', 'Unpaid', { notes: 'Said he would pay on the way out' });
      t(0, '11:22', 'KX19 VAN', 0, 'load', 'Card', 'Paid', { customer: 'Mrs Kate Brennan', biz: false, driver: 'Kate', origin: '4 Pond Road, Knaphill GU21', waste: 'house', ewc: YC.STREAMS.house.ewc, net: 540, gross: 2680, tare: 2140, charge: PER_LOAD, vat: 17, total: 102, reg: 'LV66 KTB' });
      t(0, '12:04', 'RM68 SKP', 2410, 'tonne', 'On account', 'On account');
      /* parked: a lorry weighed full, waiting to come back over empty */
      W.list.push({ no: 'TI-' + (W.n++), day: 0, time: '12:41', reg: 'GU17 HDT', customer: 'Hook Heath Driveways', biz: true, email: '', driver: 'Lee', origin: 'Hook Heath Road, Woking', load: 'Tipper', waste: 'hardcore', ewc: YC.STREAMS.hardcore.ewc, lic: 'CBDU388210', gross: 18640, tare: null, net: null, basis: 'tonne', rate: RATE.hardcore, charge: null, vat: null, total: null, pay: 'On account', status: 'Open', notes: '' });
      W.invoices.push({ no: 'WI-399', day: -32, customer: 'Pyrford Plastering Ltd', email: 'accounts@pyrfordplastering.co.uk', tickets: 9, tonnes: 41.6, net: 7280, total: 8736, status: 'Paid', paidDay: -6, due: -2 });
      W.invoices.push({ no: 'WI-400', day: -1, customer: 'Ringway Skip Hire', email: 'accounts@ringwayskips.co.uk', tickets: 6, tonnes: 18.9, net: 3118.5, total: 3742.2, status: 'Unpaid', due: 29 });
      return W;
    }
    function W() { return seed(Y()); }

    /* own lorry loads: every collection, swap and grab tipped at the yard comes in with an estimate until it is weighed */
    function ownLoads(lid) {
      var y = Y();
      return y.jobs.filter(function (j) { return j.day === 0 && j.lorry === lid && YC.TYPES[j.type].waste && (j.status === 'done' || j.status === 'onsite'); })
        .map(function (j) { var t = y.tickets.filter(function (x) { return x.id === j.ticket; })[0]; return { j: j, t: t }; })
        .filter(function (x) { return !x.t || x.t.est || x.t.site === 'yard'; })
        .sort(function (a, b) { return (b.j.at.done || 0) - (a.j.at.done || 0); });
    }

    /* ---------- the form ---------- */
    function fresh() { ui.wi = { reg: '', customer: '', email: '', driver: '', origin: '', load: 'Tipper', waste: 'mixed', ewc: YC.STREAMS.mixed.ewc, lic: '', gross: '', tare: '', basis: 'tonne', rate: RATE.mixed, pay: 'Cash', notes: '', time: hhmm(), date: 0, job: null, own: null, note: '', regNote: '', draft: null }; return ui.wi; }
    function F() { return ui.wi || fresh(); }
    function nums() { var f = F(), g = parseFloat(String(f.gross).replace(/[^\d.]/g, '')), t = parseFloat(String(f.tare).replace(/[^\d.]/g, '')), r = parseFloat(String(f.rate).replace(/[^\d.]/g, ''));
      var net = !isNaN(g) && !isNaN(t) && g > t ? Math.round(g - t) : null, ch = isNaN(r) ? null : f.basis === 'load' ? r : net != null ? Math.round(net / 1000 * r * 100) / 100 : null;
      return { g: isNaN(g) ? null : g, t: isNaN(t) ? null : t, net: net, nt: net != null ? net / 1000 : null, r: isNaN(r) ? null : r, ch: ch, vat: ch != null ? Math.round(ch * 20) / 100 : null, tot: ch != null ? Math.round(ch * 120) / 100 : null }; }
    function seg(k, v, opts) { return '<div class="seg yseg wiseg" role="group">' + opts.map(function (o) { return '<button type="button" data-act="wiSet" data-k="' + k + '" data-v="' + h(o[0]) + '" class="' + (String(v) === String(o[0]) ? 'on' : '') + '">' + h(o[1]) + '</button>'; }).join('') + '</div>'; }
    function fld(id, label, val, attrs, note) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" data-wi="' + id.replace(/^wi/, '').toLowerCase() + '" value="' + h(val == null ? '' : val) + '" autocomplete="off"' + (attrs || '') + '>' + (note ? '<small class="muted" id="' + id + 'Note">' + note + '</small>' : '') + '</div>'; }
    function calcHTML() {
      var f = F(), n = nums();
      return { net: n.net != null ? '<b>' + n.net.toLocaleString('en-GB') + ' kg</b><small>' + n.nt.toFixed(2) + ' t</small>' : (n.g != null && n.t != null ? '<span class="bad">Tare must be less than gross</span>' : '-'),
        calc: n.ch != null && (f.basis === 'load' || n.nt != null) ? (f.basis === 'load' ? '1 load x ' + gbp(n.r) : n.nt.toFixed(2) + ' t x ' + gbp(n.r) + ' per tonne') + ' = <b>' + gbp(n.ch) + '</b> + VAT ' + gbp(n.vat) + ' = <b>' + gbp(n.tot) + '</b>' + (f.own ? ' <span class="muted">(your own load, no tipping charge)</span>' : '') : '',
        ok: !!(String(f.customer).trim() && String(f.reg).trim() && n.net != null && n.ch != null) };
    }
    function formHTML() {
      var f = F(), c = calcHTML(), names = S().customers.map(function (x) { return x.name; }).concat(Object.keys(REGS).map(function (k) { return REGS[k].customer; }));
      return '<section class="card wif" id="wiForm"><div class="yh-rh"><h3>' + ic('stack') + 'New ticket</h3><small class="muted">' + (f.draft ? 'Resuming ' + h(f.draft) : 'Time in filled in for you') + '</small></div>' +
        '<div class="wig">' + fld('wiReg', 'Vehicle registration', f.reg, ' placeholder="AB12 CDE" style="text-transform:uppercase"', f.regNote || 'Type it and a regular or one of your own lorries fills in') +
        '<div class="field"><label for="wiCustomer">Customer</label><input id="wiCustomer" data-wi="customer" list="wiCustList" value="' + h(f.customer) + '" placeholder="Company or name" autocomplete="off"><datalist id="wiCustList">' + names.map(function (n) { return '<option value="' + h(n) + '">'; }).join('') + '</datalist></div>' +
        fld('wiEmail', 'Email for the ticket <i>(optional)</i>', f.email, ' placeholder="accounts@"') + fld('wiDriver', 'Driver\'s name', f.driver) + fld('wiTime', 'Time in', f.time, ' type="time"') + '</div>' +
        (f.note ? '<div class="wipick" id="wiJob">' + f.note + '</div>' : '') +
        '<div class="field"><label for="wiOrigin">Address <i>(where the waste came from, shown on the transfer note)</i></label><input id="wiOrigin" data-wi="origin" value="' + h(f.origin) + '" placeholder="Site or company address" autocomplete="off"></div>' +
        '<div class="field"><label>Load</label>' + seg('load', f.load, LOADS.map(function (x) { return [x, x]; })) + '</div>' +
        '<div class="field"><label>Waste type</label>' + seg('waste', f.waste, WT.map(function (k) { return [k, YC.STREAMS[k].n]; })) + '</div>' +
        '<div class="wig two">' + fld('wiEwc', 'EWC code', f.ewc, '', 'Set from the waste type') + fld('wiLic', 'Carrier registration <i>(for waste tracking)</i>', f.lic, ' placeholder="CBDU"') + '</div>' +
        '<div class="wbox"><div class="field"><label for="wiGross">Gross <i>(lorry full)</i></label><div class="kgin"><input id="wiGross" data-wi="gross" inputmode="numeric" value="' + h(f.gross) + '" placeholder="0"><span>kg</span></div></div><b class="wminus">-</b>' +
        '<div class="field"><label for="wiTare">Tare <i>(lorry empty)</i></label><div class="kgin"><input id="wiTare" data-wi="tare" inputmode="numeric" value="' + h(f.tare) + '" placeholder="0"><span>kg</span></div></div><b class="wminus">=</b>' +
        '<div class="field"><label>Net weight</label><div class="wnet" id="wiNet">' + c.net + '</div></div></div>' +
        '<div class="wig two"><div class="field"><label>Charge</label>' + seg('basis', f.basis, [['tonne', 'Per tonne'], ['load', 'Per load']]) + '</div>' +
        '<div class="field"><label for="wiRate">' + (f.basis === 'load' ? 'Price per load' : 'Price per tonne') + ' <i>(ex VAT)</i></label><div class="yprice"><span>£</span><input id="wiRate" data-wi="rate" inputmode="decimal" value="' + h(f.rate) + '"></div></div></div>' +
        '<div class="wicalc" id="wiCalc">' + c.calc + '</div>' +
        '<div class="field"><label>Payment</label>' + seg('pay', f.pay, [['Cash', 'Cash'], ['On account', 'On account'], ['Card', 'Card']]) + '</div>' +
        fld('wiNotes', 'Notes <i>(optional)</i>', f.notes) +
        '<div class="wiacts"><button class="btn" data-act="wiPark" id="wiPark">' + ic('clock') + 'Park it, weigh the next lorry</button><button class="btn pri lg" data-act="wiSave" id="wiSave"' + (c.ok ? '' : ' disabled') + '>' + ic('check') + 'Save ticket</button></div></section>';
    }
    function refreshCalc() { var c = calcHTML(), n = q('#wiNet'), k = q('#wiCalc'), b = q('#wiSave'); if (n) n.innerHTML = c.net; if (k) k.innerHTML = c.calc; if (b) b.disabled = !c.ok; }
    function redrawForm() { var el = q('#wiForm'); if (!el) return; var ae = document.activeElement && document.activeElement.id, ss = document.activeElement && document.activeElement.selectionStart; el.outerHTML = formHTML(); if (ae && q('#' + ae)) { var x = q('#' + ae); x.focus(); try { x.setSelectionRange(ss, ss); } catch (e) {} } }

    A.wiSet = function (el) {
      var f = F(), k = el.dataset.k, v = el.dataset.v; f[k] = v;
      if (k === 'waste') { f.ewc = YC.STREAMS[v].ewc; if (f.basis === 'tonne' && !f.own) f.rate = RATE[v]; }
      if (k === 'basis' && !f.own) f.rate = v === 'load' ? PER_LOAD : RATE[f.waste];
      redrawForm();
    };
    /* typing the registration: own lorry, a regular, or a stranger */
    function lookup() {
      var f = F(), k = regKey(f.reg); if (k.length < 5) return;
      var lo = own(f.reg);
      if (lo) {
        var L = ownLoads(lo.id); f.own = lo.id; f.driver = lo.driver; f.lic = YC.CARRIER.reg; f.tare = lo.kind === 'skip' ? 9800 : 15200; f.regNote = 'Stored tare for ' + lo.reg + ': ' + f.tare.toLocaleString('en-GB') + ' kg.';
        if (L.length) {
          var x = L[0];
          f.note = '<b>' + h(lo.reg) + ' is one of your lorries. Is this load from ' + h(x.j.site.name) + '?</b><div class="muted">' + h(YC.custName(S(), x.j.cust)) + ' · ' + h(YC.whatShort(x.j)) + ' · ' + h(YC.STREAMS[x.j.stream].n) + ' · ' + h(x.j.id) + (x.t ? ' · estimate ' + x.t.net.toFixed(2) + ' t' : '') + '</div>' +
            '<div class="wiacts left"><button class="btn sm pri" data-act="wiJob" data-id="' + x.j.id + '">Yes, fill it in</button>' + L.slice(1, 4).map(function (z) { return '<button class="btn sm" data-act="wiJob" data-id="' + z.j.id + '">No, it\'s ' + h(z.j.id) + ' at ' + h(z.j.site.name.split(',')[0]) + '</button>'; }).join('') + '<button class="btn sm" data-act="wiNotJob">No, a different load</button></div>';
        } else { f.customer = YC.CARRIER.name; f.note = '<b>' + h(lo.reg) + ' is one of your lorries.</b> No finished job to link, so it is filed as your own load: your yard is the carrier, no charge.'; f.rate = 0; }
      } else {
        var r = REGS[k]; f.own = null; f.note = '';
        if (r) { f.customer = r.customer; f.email = r.email || ''; f.driver = r.driver || ''; f.origin = r.origin || ''; f.load = r.load; f.waste = r.waste; f.ewc = YC.STREAMS[r.waste].ewc; f.lic = r.lic || ''; f.tare = r.tare; f.rate = f.basis === 'load' ? PER_LOAD : RATE[r.waste]; f.pay = r.biz ? 'On account' : 'Cash';
          f.regNote = 'Stored tare from its last visit: ' + r.tare.toLocaleString('en-GB') + ' kg. Reweigh if in doubt.'; }
        else f.regNote = 'Not seen before. Weigh it full now, then empty on the way out.';
      }
      redrawForm();
    }
    A.wiJob = function (el) {
      var f = F(), j = Y().jobs.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!j) return;
      var t = Y().tickets.filter(function (x) { return x.id === j.ticket; })[0];
      f.job = j.id; f.customer = YC.custName(S(), j.cust); f.origin = j.site.name + ', ' + j.site.pc; f.waste = j.stream; f.ewc = YC.STREAMS[j.stream].ewc; f.load = j.size >= 20 ? 'Roll-on roll-off' : j.size ? j.size + ' yard skip' : 'Grab load'; f.rate = 0; f.basis = 'tonne'; f.pay = 'On account';
      f.note = '<b>Linked to ' + h(j.id) + ' for ' + h(f.customer) + '.</b> Your own load: no tipping charge, it is on the skip price. ' + (t ? 'The estimate of ' + t.net.toFixed(2) + ' t is replaced by this weight on the transfer note and the Defra record.' : 'The weight goes on the transfer note and the Defra record.');
      redrawForm(); var g = q('#wiGross'); if (g) g.focus();
    };
    A.wiNotJob = function () { var f = F(); f.job = null; f.own = null; f.note = ''; f.customer = ''; f.rate = RATE[f.waste]; redrawForm(); };
    document.addEventListener('input', function (e) {
      var el = e.target; if (!el.dataset || !el.dataset.wi || !el.closest || !el.closest('#wiForm')) return;
      var f = F(), k = el.dataset.wi; f[k] = el.value;
      if (k === 'reg') { clearTimeout(ui.wiT); ui.wiT = setTimeout(lookup, 350); }
      if (k === 'customer') { var c = S().customers.filter(function (x) { return x.name.toLowerCase() === el.value.trim().toLowerCase(); })[0]; if (c) { if (!f.email) f.email = c.email; if (!f.origin) f.origin = (c.sites[0] || {}).name || ''; if (!f.own) f.pay = 'On account'; } }
      refreshCalc();
    });

    function isBiz(name) { var n = String(name).trim().toLowerCase(); return S().customers.some(function (c) { return c.name.toLowerCase() === n; }) || Object.keys(REGS).some(function (k) { return REGS[k].biz && REGS[k].customer.toLowerCase() === n; }) || /\b(ltd|limited|builders|landscapes|roofing|skip|hire|joinery|developments|groundworks|renovations|plastering|driveways)\b/i.test(name); }
    A.wiSave = function () {
      var f = F(), n = nums(), w = W(), y = Y(), c = calcHTML(); if (!c.ok) return;
      var biz = !f.own && isBiz(f.customer), pay = f.pay, status = f.own ? 'Own load' : pay === 'On account' ? 'On account' : 'Paid';
      var o = { no: f.draft || ('TI-' + (w.n++)), day: 0, time: f.time || hhmm(), reg: String(f.reg).toUpperCase().trim(), customer: String(f.customer).trim(), biz: biz, email: f.email, driver: f.driver, origin: f.origin, load: f.load, waste: f.waste, ewc: f.ewc, lic: f.lic,
        gross: n.g, tare: n.t, net: n.net, basis: f.basis, rate: n.r, charge: n.ch, vat: n.vat, total: n.tot, pay: f.own ? '' : pay, status: status, notes: f.notes, own: !!f.own, job: f.job };
      if (f.draft) w.list = w.list.filter(function (x) { return x.no !== f.draft; });
      w.list.push(o);
      var extra = '';
      if (f.job) {
        var j = y.jobs.filter(function (x) { return x.id === f.job; })[0], t = j && y.tickets.filter(function (x) { return x.id === j.ticket; })[0];
        if (j && !t) { YC.complete(S(), y, j, { net: n.net / 1000, gross: n.g / 1000, tare: n.t / 1000, plate: true }, Date.now()); t = y.tickets.filter(function (x) { return x.id === j.ticket; })[0]; }
        else if (t) { var was = t.net; t.net = Math.round(n.net / 10) / 100; t.gross = n.g / 1000; t.tare = n.t / 1000; t.est = false; t.read = 'Weighbridge, number plate read'; t.over = null; t.onBridge = Date.now(); j.log.push({ at: Date.now(), t: 'Weighed in at ' + t.net.toFixed(2) + ' t, the estimate of ' + was.toFixed(2) + ' t replaced' }); if (YC.overCheck(y, t, j)) extra = ' This RoRo is over its tonnage: the extra weight invoice is ready.'; }
        o.ticket = t && t.id;
      }
      y.v++; save(); ui.wiDone = o; fresh(); UI.render();
      toast('<b>' + h(o.no) + ' saved</b>. ' + (f.own ? 'Weight on the transfer note and the Defra record.' : 'Transfer note made and ' + (o.email ? 'emailed to ' + h(o.email) + '.' : 'ready to print.')) + extra, 'circle-check');
    };
    A.wiPark = function () {
      var f = F(), w = W(); if (!String(f.reg).trim() && !String(f.customer).trim() && !String(f.gross).trim()) { fresh(); UI.render(); toast('Fresh ticket ready', 'stack'); return; }
      var n = nums(), o = { no: f.draft || ('TI-' + (w.n++)), day: 0, time: f.time || hhmm(), reg: String(f.reg).toUpperCase().trim(), customer: String(f.customer).trim() || 'Not known yet', biz: isBiz(f.customer), email: f.email, driver: f.driver, origin: f.origin, load: f.load, waste: f.waste, ewc: f.ewc, lic: f.lic,
        gross: n.g, tare: n.t, net: null, basis: f.basis, rate: n.r, charge: null, vat: null, total: null, pay: f.pay, status: 'Open', notes: f.notes };
      if (f.draft) w.list = w.list.filter(function (x) { return x.no !== f.draft; });
      w.list.push(o); save(); fresh(); ui.wiOpen = true; UI.render(); toast('Parked in Open tickets. Weigh the next lorry', 'clock');
    };
    A.wiResume = function (el) {
      var o = W().list.filter(function (x) { return x.no === el.dataset.no; })[0]; if (!o) return;
      var f = fresh(); f.draft = o.no; ['reg', 'customer', 'email', 'driver', 'origin', 'load', 'waste', 'ewc', 'lic', 'basis', 'pay', 'notes', 'time'].forEach(function (k) { if (o[k] != null) f[k] = o[k]; });
      f.gross = o.gross || ''; f.tare = o.tare || (REGS[regKey(o.reg)] || {}).tare || ''; f.rate = o.rate != null ? o.rate : RATE[o.waste];
      ui.wiOpen = false; UI.render(); var t = q('#wiTare'); if (t) t.focus(); toast('Ticket ' + h(o.no) + ' reopened. Weigh it empty, then Save ticket', 'stack');
    };
    A.wiDiscard = function (el) { if (el.dataset.arm !== '1') { el.dataset.arm = '1'; el.textContent = 'Sure?'; return; } var w = W(); w.list = w.list.filter(function (x) { return x.no !== el.dataset.no; }); save(); UI.render(); toast('Open ticket discarded', 'x'); };
    A.wiOpenT = function () { ui.wiOpen = !ui.wiOpen; UI.render(); };
    A.wiNew = function () { fresh(); ui.wiDone = null; UI.render(); var r = q('#wiReg'); if (r) r.focus(); };
    A.wiF = function (el) { ui.wiF = el.dataset.v; UI.render(); };
    A.wiPaid = function (el) { var o = W().list.filter(function (x) { return x.no === el.dataset.no; })[0]; if (!o) return; o.status = 'Paid'; o.pay = o.pay === 'On account' ? 'Bank transfer' : o.pay; save(); UI.render(); toast(h(o.no) + ' marked paid', 'circle-check'); };
    A.wiInvoice = function (el) {
      var w = W(), name = el.dataset.c, L = w.list.filter(function (o) { return o.customer === name && o.status === 'On account'; }); if (!L.length) return;
      var net = L.reduce(function (a, o) { return a + (o.charge || 0); }, 0), tn = L.reduce(function (a, o) { return a + (o.net || 0); }, 0) / 1000, no = 'WI-' + (w.inv++);
      w.invoices.unshift({ no: no, day: 0, customer: name, email: L[0].email, tickets: L.length, tonnes: Math.round(tn * 100) / 100, net: Math.round(net * 100) / 100, total: Math.round(net * 120) / 100, status: 'Unpaid', due: 30 });
      L.forEach(function (o) { o.status = 'Invoiced'; o.inv = no; }); ui.wiF = 'inv'; save(); UI.render();
      toast('<b>Invoice ' + h(no) + '</b>: ' + L.length + ' tickets, ' + gbp(net * 1.2) + '. ' + (L[0].email ? 'Emailed to ' + h(L[0].email) + '. Demo, nothing is sent' : 'PDF ready to send'), 'receipt');
    };
    A.wiInvPaid = function (el) { var w = W(), v = w.invoices.filter(function (x) { return x.no === el.dataset.no; })[0]; if (!v) return; v.status = 'Paid'; v.paidDay = 0; w.list.forEach(function (o) { if (o.inv === v.no) o.status = 'Paid'; }); save(); UI.render(); toast('Invoice ' + h(v.no) + ' marked paid, and its tickets with it', 'circle-check'); };
    A.wiTicket = function (el) {
      var o = W().list.filter(function (x) { return x.no === el.dataset.no; })[0]; if (!o) return; var st = YC.STREAMS[o.waste] || YC.STREAMS.mixed, folder = o.own ? 'Waste in / Own loads' : o.biz ? 'Waste in / Business Customers / ' + o.customer : 'Waste in / Residential & One-Off Tips';
      function bx(l, v) { return '<div class="yw-bx"><small>' + l + '</small>' + v + '</div>'; }
      modal(ic('receipt') + ' Weighbridge ticket ' + h(o.no), '<div class="yw"><div class="yw-hd"><img src="brand/logo.svg" alt="Demo Skip & Grab"><div><b>Weighbridge ticket and transfer note</b><small>' + h(o.no) + ' · ' + h(YC.dayDate(o.day).toLocaleDateString('en-GB')) + ' ' + h(o.time) + '</small></div></div>' +
        '<div class="yw-g">' + bx('Vehicle', '<span class="yplate sm">' + h(o.reg) + '</span><br>Driver ' + h(o.driver || '')) + bx('Weights', 'Gross ' + (o.gross || 0).toLocaleString('en-GB') + ' kg<br>Tare ' + (o.tare || 0).toLocaleString('en-GB') + ' kg<br><b>Net ' + (o.net || 0).toLocaleString('en-GB') + ' kg</b>') +
        bx('A. The waste', '<b>' + h(st.n) + '</b><br>EWC ' + h(o.ewc) + ' · ' + h(o.load)) + bx('B. Where it came from', '<b>' + h(o.customer) + '</b><br>' + h(o.origin || '')) +
        bx('C. Carrier', h(o.own ? YC.CARRIER.name : o.customer) + '<br>' + (o.lic ? 'Waste carrier ' + h(o.lic) : '<span class="bad">No carrier registration</span>')) + bx('D. Received at', '<b>' + h(YC.TIPS.yard.n) + '</b><br>Permit ' + h(YC.TIPS.yard.permit)) + '</div>' +
        (o.charge != null && !o.own ? '<p style="margin:10px 0 0"><b>' + (o.basis === 'load' ? '1 load x ' + gbp(o.rate) : (o.net / 1000).toFixed(2) + ' t x ' + gbp(o.rate) + ' per tonne') + ' = ' + gbp(o.charge) + ' + VAT ' + gbp(o.vat) + ' = ' + gbp(o.total) + '</b> · ' + h(o.status) + '</p>' : '') +
        '<p class="yw-dec">Filed under ' + h(folder) + '. Added to waste tracking, ready for Defra.</p></div>', '<button class="btn" data-act="close">Close</button><span class="sp"></span><button class="btn pri" data-act="yPrint">' + ic('printer') + 'Print ticket</button>', 'wide ywm');
    };

    /* ---------- the page ---------- */
    V.wastein = function () {
      var w = W(), y = Y(), f = ui.wiF || 'today', qq = String(ui.wiQ || '').toLowerCase();
      var today = w.list.filter(function (o) { return o.day === 0 && o.status !== 'Open'; }), open = w.list.filter(function (o) { return o.status === 'Open'; });
      var owed = w.list.filter(function (o) { return o.status === 'Unpaid' || o.status === 'On account'; }), tonnes = today.reduce(function (a, o) { return a + (o.net || 0); }, 0) / 1000, takings = today.filter(function (o) { return !o.own; }).reduce(function (a, o) { return a + (o.charge || 0); }, 0);
      var est = ownLoadsAll();
      var head = '<div class="ybar"><span class="yhint">' + ic('stack') + 'Weighbridge tickets for lorries tipping at the yard</span><span class="sp"></span><button class="btn' + (open.length ? ' on' : '') + '" data-act="wiOpenT" id="wiOpenBtn">' + ic('clock') + 'Open tickets' + (open.length ? ' (' + open.length + ')' : '') + '</button><button class="btn pri" data-act="wiNew" id="wiNewBtn">' + ic('plus') + 'New ticket</button></div>';
      var stats = '<div class="ykpis"><div class="card kpi"><small>Loads in today</small><b>' + today.length + '</b><span class="d">' + today.filter(function (o) { return o.biz && !o.own; }).length + ' business, ' + today.filter(function (o) { return !o.biz && !o.own; }).length + ' residential and one-off</span></div><div class="card kpi"><small>Tonnes in today</small><b>' + tonnes.toFixed(2) + ' t</b><span class="d">net, off the weighbridge</span></div>' +
        '<div class="card kpi"><small>Tipping today (ex VAT)</small><b>' + gbp(takings) + '</b><span class="d">waste in revenue</span></div><div class="card kpi"><small>Tickets not paid</small><b class="' + (owed.length ? 'bad' : '') + '">' + owed.length + '</b><span class="d">' + gbp(owed.reduce(function (a, o) { return a + (o.total || 0); }, 0)) + ' inc VAT</span></div></div>';
      var estBar = est.length ? '<div class="ycr ok wiest" id="wiEst">' + ic('truck') + '<span><b>' + est.length + ' of your own loads came back with an estimated weight.</b> Weigh them in: type the lorry\'s registration and pick the job, and the real weight replaces the estimate. ' + est.slice(0, 3).map(function (x) { return '<span class="yplate yx">' + h(YC.lorry(x.j.lorry).reg) + '</span> ' + h(x.j.id); }).join(', ') + '</span></div>' : '';
      var openL = ui.wiOpen ? '<section class="card wiopen" id="wiOpenList"><div class="yh-rh"><h3>' + ic('clock') + 'Open tickets</h3><small class="muted">' + (open.length ? open.length + ' waiting to finish' : 'Nothing parked') + '</small></div>' + (open.length ? open.map(function (o) { return '<div class="ych"><span class="bd"><b>' + h(o.no) + ' · <span class="yplate yx">' + h(o.reg) + '</span> ' + h(o.customer) + '</b><small>Weighed full ' + (o.gross ? o.gross.toLocaleString('en-GB') + ' kg' : '') + ' at ' + h(o.time) + '</small></span><button class="btn sm pri" data-act="wiResume" data-no="' + o.no + '">Resume</button><button class="btn sm" data-act="wiDiscard" data-no="' + o.no + '">Discard</button></div>'; }).join('') : '<p class="muted">Start a ticket, then Park it to weigh the next lorry.</p>') + '</section>' : '';
      var done = ui.wiDone ? '<div class="card widone" id="wiDone"><div class="yh-rh"><h3>' + ic('circle-check') + h(ui.wiDone.no) + ' saved</h3><small class="muted">' + h(ui.wiDone.customer) + ' · ' + h(ui.wiDone.reg) + ' · ' + ((ui.wiDone.net || 0) / 1000).toFixed(2) + ' t' + (ui.wiDone.own ? '' : ' · ' + gbp(ui.wiDone.total)) + '</small></div><div class="wiacts left"><button class="btn sm pri" data-act="wiTicket" data-no="' + ui.wiDone.no + '">' + ic('printer') + 'Print ticket</button><button class="btn sm" data-act="wiNew">Next lorry</button></div><small class="muted">' + (ui.wiDone.email && !ui.wiDone.own ? 'Ticket emailed to ' + h(ui.wiDone.email) + '. ' : '') + 'Added to waste tracking, ready to submit. Filed under ' + h(ui.wiDone.own ? 'Waste in / Own loads' : ui.wiDone.biz ? 'Waste in / Business Customers / ' + ui.wiDone.customer : 'Waste in / Residential & One-Off Tips') + '.</small></div>' : '';
      var bridge = window.DSGBRIDGE ? window.DSGBRIDGE() : '';
      var tabs = '<div class="ufil"><div class="ychips" style="margin:0">' + [['today', 'Today'], ['owed', 'Unpaid'], ['acct', 'On account'], ['inv', 'Waste in invoices'], ['biz', 'Business customers'], ['res', 'Residential & one-off'], ['all', 'All tickets']].map(function (x) { return '<button class="ychip' + (f === x[0] ? ' on' : '') + '" data-act="wiF" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><input class="wiq" id="wiQ" placeholder="Search customer, vehicle or ticket" value="' + h(ui.wiQ || '') + '" autocomplete="off"></div>';
      return head + bridge + stats + estBar + openL + done + formHTML() + tabs + listHTML(f, qq);
    };
    function ownLoadsAll() { var o = []; YC.LORRIES.forEach(function (l) { ownLoads(l.id).forEach(function (x) { if (x.t && x.t.est) o.push(x); }); }); return o; }
    function listHTML(f, qq) {
      var w = W();
      if (f === 'acct') {
        var by = {}; w.list.filter(function (o) { return o.status === 'On account'; }).forEach(function (o) { var k = o.customer; by[k] = by[k] || { customer: k, email: o.email, count: 0, tn: 0, net: 0, from: o.day, to: o.day }; var a = by[k]; a.count++; a.tn += (o.net || 0) / 1000; a.net += o.charge || 0; a.from = Math.min(a.from, o.day); a.to = Math.max(a.to, o.day); });
        var L = Object.keys(by).map(function (k) { return by[k]; }).filter(function (a) { return !qq || a.customer.toLowerCase().indexOf(qq) >= 0; });
        if (!L.length) return '<div class="card"><p class="muted yempty">No tickets waiting to be invoiced. Tickets saved as On account collect here until you bill them.</p></div>';
        return '<div class="card"><div class="tw"><table class="t ytab"><thead><tr><th>Customer</th><th>Tickets</th><th class="r">Tonnes</th><th class="r">To bill (inc VAT)</th><th></th></tr></thead><tbody>' + L.map(function (a) { return '<tr><td><b>' + h(a.customer) + '</b><small>' + h(a.email || 'No email: you get the PDF to send') + '</small></td><td>' + a.count + '<small>' + h(YC.dayDate(a.from).toLocaleDateString('en-GB')) + (a.to !== a.from ? ' to ' + h(YC.dayDate(a.to).toLocaleDateString('en-GB')) : '') + '</small></td><td class="r num">' + a.tn.toFixed(2) + ' t</td><td class="r num"><b>' + gbp(a.net * 1.2) + '</b><small>' + gbp(a.net) + ' + VAT</small></td><td class="r"><button class="btn sm pri" data-act="wiInvoice" data-c="' + h(a.customer) + '">Invoice everything</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
      }
      if (f === 'inv') {
        var I = w.invoices.filter(function (v) { return !qq || (v.customer + ' ' + v.no).toLowerCase().indexOf(qq) >= 0; });
        return '<div class="card"><div class="tw"><table class="t ytab" id="wiInvTable"><thead><tr><th>Invoice</th><th>Customer</th><th>Tickets</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>' + I.map(function (v) { var late = v.status !== 'Paid' && v.due < 0; return '<tr><td><b>' + h(v.no) + '</b><small>' + h(YC.dayDate(v.day).toLocaleDateString('en-GB')) + '</small></td><td>' + h(v.customer) + '<small>' + h(v.email || '') + '</small></td><td>' + v.tickets + '<small>' + v.tonnes + ' t</small></td><td class="r num"><b>' + gbp(v.total) + '</b></td><td>' + (v.status === 'Paid' ? '<span class="tag ok">Paid</span>' : '<span class="tag ' + (late ? 'bad' : '') + '">' + (late ? 'Overdue' : 'Unpaid') + '</span><small>due ' + h(YC.dayDate(v.day + 30).toLocaleDateString('en-GB')) + '</small>') + '</td><td class="r">' + (v.status === 'Paid' ? '' : '<button class="btn sm" data-act="wiInvPaid" data-no="' + v.no + '">Mark paid</button>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      }
      var L2 = w.list.filter(function (o) { return o.status !== 'Open'; }).filter(function (o) { return f === 'all' || (f === 'today' ? o.day === 0 : f === 'owed' ? /^(Unpaid|On account)$/.test(o.status) : f === 'biz' ? o.biz && !o.own : f === 'res' ? !o.biz && !o.own : true); })
        .filter(function (o) { return !qq || (o.customer + ' ' + o.reg + ' ' + o.no).toLowerCase().indexOf(qq) >= 0; }).sort(function (a, b) { return b.day - a.day || (b.time < a.time ? -1 : 1); });
      if (!L2.length) return '<div class="card"><p class="muted yempty">' + (f === 'today' ? 'No lorries in yet today.' : 'Nothing here.') + '</p></div>';
      return '<div class="card"><div class="tw"><table class="t ytab" id="wiTable"><thead><tr><th>Time in</th><th>Customer</th><th>Vehicle</th><th>Waste</th><th class="r">Net</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>' + L2.map(function (o) {
        var owed = o.status === 'Unpaid' || o.status === 'On account';
        return '<tr><td><b>' + h(o.time) + '</b><small>' + h(o.no) + (o.day ? ' · ' + h(YC.dayDate(o.day).toLocaleDateString('en-GB')) : '') + '</small></td><td>' + h(o.customer) + '<small>' + (o.own ? 'Your own load' + (o.job ? ', ' + h(o.job) : '') : o.biz ? 'Business customer' : 'Residential or one-off') + '</small></td>' +
          '<td><span class="yplate yx">' + h(o.reg) + '</span><small>' + h(o.load) + '</small></td><td>' + h((YC.STREAMS[o.waste] || {}).n || o.waste) + '<small>EWC ' + h(o.ewc) + '</small></td><td class="r num"><b>' + ((o.net || 0) / 1000).toFixed(2) + ' t</b><small>' + (o.net || 0).toLocaleString('en-GB') + ' kg</small></td>' +
          '<td class="r num"><b>' + (o.own ? '-' : gbp(o.total)) + '</b><small>' + (o.own ? 'On the skip price' : o.basis === 'load' ? 'Per load' : 'Per tonne') + '</small></td><td>' + (o.status === 'Invoiced' ? '<span class="tag">Invoiced</span><small>' + h(o.inv) + '</small>' : '<span class="tag ' + (o.status === 'Paid' || o.status === 'Own load' ? 'ok' : 'bad') + '">' + h(o.status) + '</span><small>' + h(o.pay || '') + '</small>') + '</td>' +
          '<td class="r"><button class="btn sm" data-act="wiTicket" data-no="' + o.no + '">Ticket</button>' + (owed ? ' <button class="btn sm" data-act="wiPaid" data-no="' + o.no + '">Mark paid</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    }
    document.addEventListener('input', function (e) { if (e.target.id === 'wiQ') { ui.wiQ = e.target.value; var v = q('#view'); var L = listHTML(ui.wiF || 'today', ui.wiQ.toLowerCase()), old = q('#wiTable, #wiInvTable'); var holder = old ? old.closest('.card') : null; if (holder) holder.outerHTML = L; } });

    /* own loads come back with an estimated weight until they are weighed in */
    var cmp = YC.complete;
    YC.complete = function (Sx, Yx, j, data, when) {
      var had = j.ticket; cmp.apply(this, arguments);
      if (!had && j.ticket && !(data && data.net != null)) { var t = Yx.tickets.filter(function (x) { return x.id === j.ticket; })[0]; if (t && t.site === 'yard') { t.est = true; t.read = 'Estimate from the ' + (j.size ? j.size + ' yard skip' : 'grab load') + ', weigh it in'; } }
    };
    /* Defra: waste in tickets are receipts at our transfer station too */
    var dr = YC.defraRows;
    YC.defraRows = function (Sx, Yx) {
      var rows = dr.apply(this, arguments), D = Yx.defraState || {};
      rows.forEach(function (r) { var t = Yx.tickets.filter(function (x) { return x.id === r.id; })[0]; if (t && t.est) r.est = true; });
      ((Yx.wastein && Yx.wastein.list) || []).filter(function (o) { return o.status !== 'Open' && !o.own; }).forEach(function (o) {
        var st = D[o.no], sv = YC.STREAMS[o.waste] || YC.STREAMS.mixed;
        rows.push({ id: o.no, day: o.day, time: (function () { var p = String(o.time).split(':'); return (+p[0]) * 60 + (+p[1] || 0); })(), carrier: o.biz ? o.customer : o.customer + ' (own household waste)', reg: o.lic || (o.biz ? '' : 'Householder, no registration needed'), veh: o.reg, stream: o.waste, ewc: o.ewc, desc: sv.n, form: sv.form,
          net: (o.net || 0) / 1000, est: false, code: sv.code, from: o.customer, job: null, status: st ? st.s : (o.biz && !o.lic ? 'error' : o.day < 0 ? 'submitted' : 'ready'), why: st ? st.why : (o.biz && !o.lic ? 'No carrier registration number, and no reason given' : null), sub: st && st.at, wi: true });
      });
      return rows.sort(function (a, b) { return (b.day - a.day) || (b.time - a.time); });
    };

    /* menu and wheel: Waste in first under Yard */
    var V0 = UI.VIEWS.filter(function (v) { return v.k === 'tickets'; })[0];
    if (false) {
      var at = UI.VIEWS.indexOf(V0);
      UI.VIEWS.splice(at < 0 ? UI.VIEWS.length : at, 0, { k: 'wastein', g: 'Yard', n: 'Waste in', ic: 'stack', sub: 'Weighbridge tickets for lorries tipping at the yard' });
    }
    if (V0) { V0.n = 'Tickets and WTNs'; V0.ic = 'receipt'; }
    var fix0 = A.yDfFix;
    A.yDfFix = function (el) {
      if (!/^TI-/.test(el.dataset.id)) return fix0.apply(this, arguments);
      var o = W().list.filter(function (x) { return x.no === el.dataset.id; })[0]; if (!o) return;
      modal(ic('pencil') + ' Fix ' + h(o.no), '<p class="muted" style="margin:0 0 10px">' + h(o.customer) + ' tipped without a waste carrier number. Add it from their licence.</p><div class="field"><label for="wiFixReg">Carrier registration</label><input id="wiFixReg" placeholder="CBDU123456"></div>', '<button class="btn" data-act="close">Cancel</button><span class="sp"></span><button class="btn pri" data-act="wiFixGo" data-no="' + o.no + '">' + ic('check') + 'Save, it is ready</button>');
    };
    A.wiFixGo = function (el) { var o = W().list.filter(function (x) { return x.no === el.dataset.no; })[0], v = ((q('#wiFixReg') || {}).value || '').trim(); if (!o) return; if (!v) { toast('Add the carrier number', 'alert'); return; } o.lic = v.toUpperCase(); Y().v++; save(); A.close(); UI.render(); toast(h(o.no) + ' fixed and ready for Defra', 'circle-check'); };

    /* ---------- the yard board, WasteLine's yard picture: what is in, what is going out, skip stock, lorries by reg ---------- */
    var STOCK = [['4 yard', 4, 30, 18], ['6 yard', 6, 45, 31], ['8 yard', 8, 60, 47], ['12 yard', 12, 25, 17], ['16 yard', 16, 12, 9], ['20 yard RoRo', 20, 10, 6], ['40 yard RoRo', 40, 8, 5]];
    function stock() {
      var y = Y();
      return STOCK.map(function (s) {
        var out = s[3] + y.onsite.filter(function (o) { return o.size === s[1]; }).length - 2;
        var deliv = YC.today(y).filter(function (j) { return j.type === 'deliver' && j.size === s[1] && j.status !== 'planned'; }).length, back = YC.today(y).filter(function (j) { return j.type === 'collect' && j.size === s[1] && j.status === 'done'; }).length;
        out = Math.max(0, out + deliv - back); return { size: s[0], owned: s[2], out: Math.min(out, s[2]), yard: Math.max(0, s[2] - out) };
      });
    }
    function wasteOut(y) {
      if (!y.wasteout) y.wasteout = [
        { no: 'WO-301', time: '09:40', reg: 'DS19 GRB', to: 'Wey Valley Soil Recovery, Send', waste: 'soil', t: 15.8, done: true },
        { no: 'WO-302', time: '11:15', reg: 'DS70 RRO', to: 'Mole Valley Recycling, Leatherhead', waste: 'mixed', t: 7.2, done: true },
        { no: 'WO-303', time: '13:30', reg: 'DS23 GRB', to: 'Wey Valley Soil Recovery, Send', waste: 'hardcore', t: 14.6, done: true },
        { no: 'WO-304', time: '15:30', reg: 'DS70 RRO', to: 'Mole Valley Recycling, Leatherhead', waste: 'wood', t: 4.1, done: false },
        { no: 'WO-305', time: '16:15', reg: 'DS19 GRB', to: 'Wey Valley Soil Recovery, Send', waste: 'soil', t: 15, done: false }
      ];
      return y.wasteout;
    }
    V.board = function () {
      var y = Y(), w = W(), now = new Date(), tv = document.body.classList.contains('ytv'), t0 = YC.today(y), dn = t0.filter(function (j) { return j.status === 'done'; }).length;
      var inT = w.list.filter(function (o) { return o.day === 0 && o.status !== 'Open'; }).sort(function (a, b) { return a.time < b.time ? 1 : -1; }), open = w.list.filter(function (o) { return o.status === 'Open'; });
      var tin = inT.reduce(function (a, o) { return a + (o.net || 0); }, 0) / 1000, WO = wasteOut(y), wdone = WO.filter(function (o) { return o.done; }), tout = wdone.reduce(function (a, o) { return a + o.t; }, 0);
      var over = y.onsite.filter(function (o) { return -o.since > o.hire && !o.booked; }).length, due = y.onsite.filter(function (o) { var d = -o.since; return d <= o.hire && o.hire - d <= 3 && !o.booked; }).length, ST = stock(), outAll = ST.reduce(function (a, s) { return a + s.out; }, 0);
      var t1 = YC.workDays(1, 1, true)[0], tmr = y.jobs.filter(function (j) { return j.day === t1; }), tmrUn = tmr.filter(function (j) { return !j.lorry; }).length;
      var C = 2 * Math.PI * 42, pct = t0.length ? dn / t0.length : 0;
      function tile(v, l, s, cls) { return '<div class="ybw-t ' + (cls || '') + '"><b>' + v + '</b><span>' + l + '</span>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; }
      return '<div class="yboard ybw' + (tv ? ' tv' : '') + '" id="yBoard"><div class="yb-top"><div><b class="yb-clock">' + YC.hhmm(now.getHours() * 60 + now.getMinutes()) + '</b><small>' + h(YC.dayDate(0).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + h(YC.YARD.addr) + '</small></div><span class="sp"></span>' +
        (tv ? '<button class="btn" data-act="yTVOff">' + ic('x') + 'Exit full screen</button>' : '<button class="btn pri" data-act="yTV">' + ic('dashboard') + 'Full screen for the TV</button>') + '</div>' +
        (over || due ? '<button class="ybw-site' + (over ? ' red' : '') + '" data-act="go" data-v="skips"><b>' + (over ? over + ' skip' + (over > 1 ? 's have' : ' has') + ' been out longer than the 14-day hire period.' : due + ' skip' + (due > 1 ? 's are' : ' is') + ' nearly at the end of the hire period.') + '</b> ' + (over && due ? due + ' more coming up. ' : '') + '<span>View skips on site</span></button>' : '') +
        '<div class="ybw-tiles">' + tile(dn + '<i>/' + t0.length + '</i>', 'Jobs today', (t0.length - dn) + ' still to do') + tile(inT.length, 'Loads in today', tin.toFixed(1) + ' t over the weighbridge') + tile(wdone.length, 'Loads out today', tout.toFixed(1) + ' t to the tip and recyclers') +
        tile(outAll, 'Skips out on hire', over ? '<em>' + over + ' over the hire period</em>' : 'none over the hire period', over ? 'bad' : '') + tile(tmr.length, 'Jobs tomorrow', tmrUn ? tmrUn + ' not planned yet' : 'all planned', tmrUn ? 'warn' : '') + '</div>' +
        '<div class="ybw-g"><section class="yb-p ybw-stock"><h3>' + ic('skip') + 'Skip stock in the yard</h3>' + ST.map(function (s) { var low = s.yard <= Math.max(1, Math.round(s.owned * 0.1)), p = s.owned ? Math.round(s.out / s.owned * 100) : 0; return '<div class="ybw-stk' + (low ? ' low' : '') + '"><span class="ybw-sz">' + h(s.size) + '</span><b>' + s.yard + '</b><span class="ybw-in">in the yard</span><span class="ybw-bar"><i style="width:' + p + '%"></i></span><small>' + s.out + ' out on hire · ' + s.owned + ' owned</small></div>'; }).join('') + '</section>' +
        '<section class="yb-p ybw-wi"><h3>' + ic('stack') + 'Waste in: on the weighbridge today</h3>' + (open.length ? '<div class="ybw-open">' + open.map(function (o) { return '<span class="yplate sm">' + h(o.reg) + '</span> ' + h(o.customer) + ' weighed full, waiting to weigh out'; }).join('<br>') + '</div>' : '') +
          inT.slice(0, 6).map(function (o) { return '<div class="ybw-r"><span class="ybw-tm">' + h(o.time) + '</span><span class="yplate sm">' + h(o.reg) + '</span><span class="ybw-c">' + h(o.customer) + '<small>' + h((YC.STREAMS[o.waste] || {}).n || '') + '</small></span><b>' + ((o.net || 0) / 1000).toFixed(2) + ' t</b></div>'; }).join('') + '</section>' +
        '<section class="yb-p ybw-lor"><h3>' + ic('truck') + 'Lorries</h3>' + YC.LORRIES.map(function (l) { var wq = YC.where(y, l.id), L = YC.forLorry(y, l.id, 0), d = L.filter(function (j) { return j.status === 'done'; }).length, cur = wq.job; var now1 = wq.state === 'onway' ? 'En route to ' + cur.site.name.split(',').pop().trim() + ', ' + YC.etaMins(y, cur) + ' min' : wq.state === 'onsite' ? 'On site at ' + cur.site.name.split(',').pop().trim() : wq.state === 'returning' ? 'Heading back to the yard' : 'In the yard'; return '<div class="ybw-r"><span class="yplate sm">' + h(l.reg) + '</span><span class="ybw-c">' + h(l.driver) + '<small>' + h(now1) + '</small></span><b>' + d + '/' + L.length + '</b></div>'; }).join('') + '</section>' +
        '<section class="yb-p ybw-out"><h3>' + ic('route') + 'Waste out: going out today</h3>' + WO.map(function (o) { return '<div class="ybw-r' + (o.done ? ' done' : '') + '"><span class="ybw-tm">' + h(o.time) + '</span><span class="yplate sm">' + h(o.reg) + '</span><span class="ybw-c">' + h(o.to) + '<small>' + h(YC.STREAMS[o.waste].n) + ', WTN ' + h(o.no) + '</small></span><b>' + (o.done ? o.t.toFixed(1) + ' t' : 'Booked') + '</b></div>'; }).join('') + '</section></div>' +
        '<small class="ybd-foot">Updates by itself: the weighbridge, the drivers and the trackers feed it.</small></div>';
    };

    window.DSGWASTEIN = { seed: seed, regs: REGS, rate: RATE };
    if (location.hash === '#wastein') ui.view = 'wastein';
    UI.render();
  }
  start(0);
})();
