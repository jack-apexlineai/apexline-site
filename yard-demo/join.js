/* The supplier's onboarding link: a supplier fills this in on their phone, with no instructions needed.
   Company, contacts, what they do and where, depots and tip sites, prices and credit terms, documents, then they
   agree and sign. It lands in Demo Skip & Grab's "Awaiting approval" list. Demo: it is saved in this browser only, nothing is sent. */
(function () {
  var CS = window.CS, C = CS.COMP, ic = window.ic, h = CS.esc;
  var P = new URLSearchParams(location.search), CODE = P.get('i') || '';
  if (P.get('embed') === '1') document.body.classList.add('embed');
  CS.load();
  var APP = CODE ? C.opened(CODE) : null; CS.save();
  var DKEY = 'dsg-join-' + (CODE || 'open');
  var SIZES = [4, 6, 8, 10, 12, 14, 16, 20, 40];
  var SVCS = ['skip', 'grab', 'muck'];
  var WASTE = ['skip', 'grab', 'muck'];
  var STEPS = ['Your company', 'Who we talk to', 'What you do', 'Depots and tip sites', 'Prices and payment', 'Your documents', 'Agree and sign'];
  var COVERS = { pl: [1e6, 2e6, 5e6, 10e6], el: [5e6, 10e6], git: [25000, 50000, 100000] };

  function blank() {
    var a = APP || {};
    return { step: 0, company: { name: a.name || '', chno: '', addr: '', pc: '', phone: '', email: a.email || '' },
      book: { name: a.who || '', phone: a.phone || '', wa: true, email: a.email || '' }, acc: { name: '', email: '', phone: '' }, ooh: '',
      svcs: [], sizes: [], areas: '', depots: [{ name: '', pc: '' }], tips: [{ name: '', pc: '', kind: 'Permit', no: '', exp: '', file: '' }],
      prices: { file: '', rates: null, later: false }, terms: '', termsOther: '',
      docs: { wcl: { no: '', tier: 'Upper', exp: '', file: '' }, pl: { cover: 0, exp: '', file: '' }, el: { cover: 0, exp: '', file: '' }, git: { cover: 0, exp: '', file: '' }, fors: { level: '', exp: '', file: '' }, chas: { exp: '', file: '' } },
      cons: { terms: 0, duty: 0, data: 0 }, sig: { name: '', pos: '', typed: '', drawn: '', mode: 'type' } };
  }
  var F; try { F = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) { F = null; }
  if (!F || !F.docs) F = blank();
  var ERR = {}, done = !!(APP && (APP.st === 'submitted' || APP.st === 'approved'));
  function save() { try { localStorage.setItem(DKEY, JSON.stringify(F)); } catch (e) {} }
  function q(s) { return document.querySelector(s); }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, F); }
  function set(path, v) { var ks = path.split('.'), o = F; for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
  function waste() { return F.svcs.some(function (k) { return WASTE.indexOf(k) >= 0; }); }
  function first(n) { return String(n || '').trim().split(/\s+/)[0]; }
  function toast(t, i) { var b = q('#toasts'); var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = ic(i || 'circle-check') + '<span>' + t + '</span>'; b.appendChild(el); setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 3600); }
  function areas() { return String(F.areas || '').toUpperCase().split(/[\s,;\/]+/).filter(Boolean); }
  function goodArea(a) { return /^[A-Z]{1,2}(\d[A-Z\d]?)?$/.test(a); }

  /* ---------- small builders ---------- */
  function err(p) { return ERR[p] ? '<small class="jerr" role="alert">' + ic('alert') + h(ERR[p]) + '</small>' : ''; }
  function fld(p, label, o) {
    o = o || {}; var v = get(p); var id = 'f_' + p.replace(/\./g, '_');
    return '<div class="field jf' + (ERR[p] ? ' bad' : '') + '"><label for="' + id + '">' + label + (o.opt ? ' <span class="jopt">optional</span>' : '') + '</label>' +
      (o.hint ? '<small class="jhint">' + o.hint + '</small>' : '') +
      '<input id="' + id + '" data-f="' + p + '" value="' + h(v == null ? '' : v) + '"' + (o.type ? ' type="' + o.type + '"' : '') + (o.ph ? ' placeholder="' + h(o.ph) + '"' : '') + (o.im ? ' inputmode="' + o.im + '"' : '') + (o.ac ? ' autocomplete="' + o.ac + '"' : '') + (o.caps ? ' autocapitalize="characters"' : '') + (o.min ? ' min="' + o.min + '"' : '') + '>' + err(p) + '</div>';
  }
  function chip(act, v, on, label, extra) { return '<button type="button" class="pk jpk' + (on ? ' on' : '') + '" data-j="' + act + '" data-v="' + h(v) + '"' + (extra || '') + ' aria-pressed="' + (on ? 'true' : 'false') + '">' + (on ? ic('check') : '') + label + '</button>'; }
  function upl(p, label, cur) {
    var id = 'u_' + p.replace(/\./g, '_');
    return '<div class="jup' + (cur ? ' has' : '') + (ERR[p] ? ' bad' : '') + '"><label class="btn' + (cur ? '' : ' pri') + '" for="' + id + '">' + ic(cur ? 'refresh' : 'paperclip') + (cur ? 'Change the file' : label) + '</label>' +
      '<input type="file" id="' + id + '" class="vh" data-up="' + p + '" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.heic">' +
      (cur ? '<span class="jfile">' + ic('circle-check') + h(cur) + '</span>' : '<small class="jhint" style="margin:0">A photo on your phone is fine. PDF, Word or Excel too.</small>') + err(p) + '</div>';
  }
  function card(title, sub, body, icn) { return '<section class="card jcard"><div class="jch">' + (icn ? '<span class="jci">' + ic(icn) + '</span>' : '') + '<div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div></div>' + body + '</section>'; }

  /* ---------- the pages ---------- */
  function welcome() {
    var who = APP && APP.who ? 'Hi ' + h(APP.who) + '. ' : '';
    return '<section class="jhero"><h1>' + who + 'Demo Skip & Grab would like to add you as a supplier</h1>' +
      '<p>This takes about 10 minutes. You can stop and come back, it saves as you go.</p>' +
      '<ul class="jlist"><li>' + ic('certificate') + 'Your waste carrier licence</li><li>' + ic('shield-check') + 'Your insurance certificates</li><li>' + ic('file-text') + 'Your price list, if you have one</li></ul>' +
      '<p class="jsmall">A photo of each one on your phone is fine.</p></section>' +
      '<button class="btn pri lg jbig" data-j="start">' + ic('arrow-right') + 'Start</button>' +
      '<button class="jdemo" data-j="fillAll">' + ic('sparkles') + 'Demo: fill the whole thing in for me</button>';
  }
  function p1() {
    return card('Your company', 'As it appears on your invoices.',
      fld('company.name', 'Company name', { ac: 'organization', ph: 'For example Wendmoor Skip Hire Ltd' }) +
      fld('company.chno', 'Companies House number', { opt: true, im: 'numeric', ph: '8 digits, if you are a limited company' }) +
      fld('company.addr', 'Office address', { ac: 'street-address', ph: 'Unit, street and town' }) +
      fld('company.pc', 'Postcode', { ac: 'postal-code', caps: true, ph: 'GU24 8RP' }) +
      fld('company.phone', 'Office phone', { type: 'tel', im: 'tel', ac: 'tel' }) +
      fld('company.email', 'Office email', { type: 'email', ac: 'email', ph: 'office@yourcompany.co.uk' }), 'warehouse');
  }
  function p2() {
    return card('Who takes our bookings?', 'Demo Skip & Grab sends bookings here and expects a quick yes or no.',
      fld('book.name', 'Name', { ac: 'name' }) + fld('book.phone', 'Mobile', { type: 'tel', im: 'tel', ac: 'tel' }) +
      '<label class="jtick"><input type="checkbox" data-c="book.wa"' + (F.book.wa ? ' checked' : '') + '><span>Send bookings to this number on WhatsApp</span></label>' +
      fld('book.email', 'Bookings email', { type: 'email', ac: 'email' }), 'phone') +
      card('Who does your accounts?', 'Where Demo Skip & Grab sends remittances and statement queries.',
        fld('acc.name', 'Name', { ph: 'Can be the same person' }) + fld('acc.email', 'Accounts email', { type: 'email' }) + fld('acc.phone', 'Phone', { type: 'tel', im: 'tel', opt: true }) +
        '<button type="button" class="jlink" data-j="sameAcc">' + ic('checks') + 'Same as bookings</button>', 'pound') +
      card('Out of hours', '', fld('ooh', 'Number for an early start or a problem on site', { type: 'tel', im: 'tel', opt: true }), 'clock');
  }
  function p3() {
    var a = areas();
    return card('What do you do?', 'Tap everything you can supply.',
      '<div class="chips jchips">' + SVCS.map(function (k) { return chip('svc', k, F.svcs.indexOf(k) >= 0, h(CS.S.services[k].name)); }).join('') + '</div>' + err('svcs') +
      (F.svcs.indexOf('skip') >= 0 ? '<div class="field" style="margin-top:14px"><label>Skip sizes</label><div class="chips jchips">' + SIZES.map(function (z) { return chip('size', z, F.sizes.indexOf(z) >= 0, z + (z >= 20 ? ' yd RoRo' : ' yard')); }).join('') + '</div>' + err('sizes') + '</div>' : ''), 'list') +
      card('Where do you work?', 'Type the first half of each postcode you cover, with spaces between. Just the letters covers the whole area.',
        '<div class="field jf' + (ERR.areas ? ' bad' : '') + '"><label for="f_areas">Postcodes you cover</label><textarea id="f_areas" data-f="areas" rows="2" autocapitalize="characters" placeholder="GU21 GU22 GU23 GU24">' + h(F.areas) + '</textarea>' + err('areas') + '</div>' +
        '<div class="chips jareas" id="jareas">' + areaChips(a) + '</div>', 'map-pin');
  }
  function areaChips(a) { return a.map(function (x) { return '<span class="tag ' + (goodArea(x) ? 'ok' : 'bad') + '">' + h(x) + (goodArea(x) ? '' : ', not a postcode') + '</span>'; }).join(''); }
  function p4() {
    var w = waste();
    return card('Depots', 'Where your lorries and skips are kept.',
      F.depots.map(function (d, i) { return '<div class="jrow"><div class="jgrid">' + fld('depots.' + i + '.name', 'Depot name or town', { ph: 'For example Chobham yard' }) + fld('depots.' + i + '.pc', 'Postcode', { caps: true }) + '</div>' + (i ? '<button type="button" class="jx" data-j="rmDepot" data-v="' + i + '" aria-label="Remove this depot">' + ic('x') + '</button>' : '') + '</div>'; }).join('') +
      '<button type="button" class="jlink" data-j="addDepot">' + ic('plus') + 'Add another depot</button>', 'truck') +
      card('Where do you tip?', w ? 'Every site you take Demo Skip & Grab\'s waste to, and its environmental permit or exemption. A person at Demo Skip & Grab checks these.' : 'Only needed if you carry waste. You can skip this.',
        F.tips.map(function (t, i) {
          var p = 'tips.' + i;
          return '<div class="jrow jtip"><div class="jgrid">' + fld(p + '.name', 'Site name', { ph: 'For example Fen Lane recycling, Normandy' }) + fld(p + '.pc', 'Postcode', { caps: true }) + '</div>' +
            '<div class="field"><label>Permit or exemption?</label><div class="chips">' + chip('tipKind', i + '|Permit', t.kind === 'Permit', 'Environmental permit') + chip('tipKind', i + '|Exemption', t.kind === 'Exemption', 'Waste exemption') + '</div></div>' +
            fld(p + '.no', t.kind === 'Permit' ? 'Permit number' : 'Exemption number', { caps: true, ph: t.kind === 'Permit' ? 'EPR/AB1234CD' : 'WEX123456' }) +
            (t.kind === 'Exemption' ? fld(p + '.exp', 'Exemption runs out on', { type: 'date', hint: 'Exemptions last 3 years.' }) : '') +
            upl(p + '.file', 'Add the permit', t.file) +
            (i ? '<button type="button" class="jx" data-j="rmTip" data-v="' + i + '" aria-label="Remove this tip site">' + ic('x') + '</button>' : '') + '</div>';
        }).join('') + err('tips') +
        '<button type="button" class="jlink" data-j="addTip">' + ic('plus') + 'Add another tip site</button>', 'map-pin');
  }
  function sampleRates() {
    var NSR = { 4: 160, 6: 190, 8: 215, 10: 250, 12: 275, 14: 300, 16: 325, 20: 430, 40: 575 }, r = {};
    if (F.svcs.indexOf('skip') >= 0) { r.skip = {}; (F.sizes.length ? F.sizes : [4, 6, 8, 12]).forEach(function (z) { r.skip[z] = NSR[z] || 200; }); }
    if (F.svcs.indexOf('grab') >= 0) r.grab = 300;
    if (F.svcs.indexOf('muck') >= 0) r.muck = 365;
    return r;
  }
  function rateRows() {
    var r = F.prices.rates || {}, out = [];
    Object.keys(r).forEach(function (k) {
      if (typeof r[k] === 'number') out.push(['prices.rates.' + k, CS.S.services[k].name + ', per load']);
      else Object.keys(r[k]).forEach(function (z) { out.push(['prices.rates.' + k + '.' + z, z + (z >= 20 ? ' yard RoRo' : ' yard skip')]); });
    });
    return out;
  }
  function p5() {
    var pr = F.prices, rows = rateRows(), other = F.terms === 'other';
    return card('Your prices', 'Upload your price list as it is. PDF, Word, Excel or a photo of a printed sheet.',
      (pr.reading ? '<div class="note">' + ic('clock') + '<span>Reading ' + h(pr.file) + '...</span></div>' :
        upl('prices.file', 'Add your price list', pr.file) +
        (rows.length ? '<div class="jread"><b>' + ic('sparkles') + 'Here is what we read. Fix anything that is wrong.</b><div class="jrates">' + rows.map(function (x) { var id = 'f_' + x[0].replace(/\./g, '_'); return '<label for="' + id + '"><span>' + h(x[1]) + '</span><span class="jgbp">£<input id="' + id + '" data-f="' + x[0] + '" data-num="1" inputmode="numeric" value="' + h(get(x[0])) + '"></span></label>'; }).join('') + '</div><small class="jhint">Prices before VAT. Demo: this is a sample read. Live, your real file is read and Demo Skip & Grab checks it too.</small></div>' : '') +
        (pr.file ? '' : '<label class="jtick"><input type="checkbox" data-c="prices.later"' + (pr.later ? ' checked' : '') + '><span>I will send my price list later</span></label>')) + err('prices'), 'receipt') +
      card('How long do you give Demo Skip & Grab to pay?', 'Your normal credit terms for Demo Skip & Grab\'s account.',
        '<div class="chips jchips">' + ['14 days', '30 days', '30 days end of month', '60 days'].map(function (t) { return chip('terms', t, F.terms === t, t); }).join('') + chip('terms', 'other', other, 'Something else') + '</div>' +
        (other ? fld('termsOther', 'Your terms', { ph: 'For example 45 days' }) : '') + err('terms'), 'calendar');
  }
  function dcard(k, title, sub, body, cur) { return card(title, sub, body + upl('docs.' + k + '.file', 'Add the certificate', cur), k === 'wcl' ? 'certificate' : 'shield-check'); }
  function coverChips(k) { return '<div class="field"><label>Cover</label><div class="chips jchips">' + COVERS[k].map(function (c) { return chip('cover', k + '|' + c, F.docs[k].cover === c, C.cover(c)); }).join('') + '</div>' + err('docs.' + k + '.cover') + '</div>'; }
  function p6() {
    var D = F.docs, w = waste(), today = C.iso(0);
    return (w ? dcard('wcl', 'Waste carrier licence', 'Demo Skip & Grab checks the number on the Environment Agency\'s public register.',
      fld('docs.wcl.no', 'Registration number', { caps: true, ph: 'CBDU123456' }) +
      '<div class="field"><label>Tier</label><div class="chips">' + chip('tier', 'Upper', D.wcl.tier === 'Upper', 'Upper tier') + chip('tier', 'Lower', D.wcl.tier === 'Lower', 'Lower tier') + '</div></div>' +
      fld('docs.wcl.exp', 'Runs out on', { type: 'date', min: today }), D.wcl.file) : '') +
      dcard('pl', 'Public liability insurance', 'A person at Demo Skip & Grab looks at the certificate itself.', coverChips('pl') + fld('docs.pl.exp', 'Runs out on', { type: 'date', min: today }), D.pl.file) +
      dcard('el', 'Employer\'s liability insurance', '', coverChips('el') + fld('docs.el.exp', 'Runs out on', { type: 'date', min: today }), D.el.file) +
      dcard('git', 'Goods in transit insurance', '', coverChips('git') + fld('docs.git.exp', 'Runs out on', { type: 'date', min: today }), D.git.file) +
      '<p class="jsec">Optional</p>' +
      dcard('fors', 'FORS', 'Only if you have it.', '<div class="field"><label>Level</label><div class="chips">' + ['Bronze', 'Silver', 'Gold'].map(function (l) { return chip('fors', l, D.fors.level === l, l); }).join('') + '</div></div>' + fld('docs.fors.exp', 'Runs out on', { type: 'date', opt: true }), D.fors.file) +
      dcard('chas', 'CHAS', 'Only if you have it.', fld('docs.chas.exp', 'Runs out on', { type: 'date', opt: true }), D.chas.file) +
      '<p class="jsmall">' + ic('bell') + ' A month before anything runs out, Demo Skip & Grab\'s system emails you asking for the new one.</p>';
  }
  var TXT = {
    terms: ['Demo Skip & Grab supplier terms', 'Bookings are confirmed in writing, by WhatsApp or email, with a Demo Skip & Grab order number.', 'Prices are the ones on the price list you send, until you give Demo Skip & Grab notice of a change.', 'A waste transfer note comes back for every load, and a weighbridge ticket for any weight charge.', 'Any extra charge (wait time, overweight, extra hire) is agreed with Demo Skip & Grab before it is invoiced.', 'Sample terms for this demo. Demo Skip & Grab\'s own terms go here.'],
    duty: ['Duty of care declaration', 'We hold a valid waste carrier registration and will keep it in date.', 'We only take waste to sites that hold a permit or exemption to accept it.', 'We give a waste transfer note for every load, with the correct waste code.', 'We will tell Demo Skip & Grab straight away if any registration, permit, exemption or insurance runs out, is suspended or is withdrawn.', 'This is the duty of care on everyone handling waste, under section 34 of the Environmental Protection Act 1990.'],
    data: ['Data consent', 'Demo Skip & Grab can keep the details and documents in this form to book work with you, pay you and check your compliance.', 'Demo Skip & Grab can contact the people named here about bookings, payments and renewals.', 'Your details are not sold or passed on, except where the law requires it.', 'They are kept while you supply Demo Skip & Grab, and after that only as long as the law requires.']
  };
  function cons(k) {
    var t = TXT[k], on = !!F.cons[k];
    return '<div class="jcons' + (on ? ' on' : '') + (ERR['cons.' + k] ? ' bad' : '') + '"><label class="jtick big"><input type="checkbox" data-cons="' + k + '"' + (on ? ' checked' : '') + '><span><b>' + h(t[0]) + '</b>' + (k === 'terms' ? 'I have read and accept Demo Skip & Grab\'s supplier terms.' : k === 'duty' ? 'I confirm the duty of care declaration below.' : 'I agree Demo Skip & Grab can keep and use our details as below.') + '</span></label>' +
      '<details><summary>Read it</summary><ul>' + t.slice(1).map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul></details>' + err('cons.' + k) + '</div>';
  }
  function p7() {
    var s = F.sig, now = new Date();
    return card('Agree', 'Tick each one.', cons('terms') + cons('duty') + cons('data'), 'checks') +
      card('Sign', 'For ' + h(F.company.name || 'your company') + '.',
        fld('sig.name', 'Your full name', { ac: 'name' }) + fld('sig.pos', 'Your position', { ph: 'For example Director' }) +
        '<div class="seg jseg"><button type="button" data-j="sigMode" data-v="type" class="' + (s.mode !== 'draw' ? 'on' : '') + '">Type it</button><button type="button" data-j="sigMode" data-v="draw" class="' + (s.mode === 'draw' ? 'on' : '') + '">Draw it</button></div>' +
        (s.mode === 'draw' ? '<div class="jpad"><canvas id="jcan" width="640" height="220" aria-label="Draw your signature"></canvas><button type="button" class="btn sm" data-j="sigClear">Clear</button></div>'
          : fld('sig.typed', 'Type your name to sign', { ac: 'name' }) + (s.typed ? '<div class="jsig">' + h(s.typed) + '</div>' : '')) + err('sig') +
        '<p class="jsmall">' + ic('clock') + ' Signed ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + '. The date and time are saved with your signature.</p>', 'pencil');
  }
  function thanks() {
    var nm = first(F.sig.name || F.book.name || (APP && APP.who) || '');
    var a = APP && C.app(APP.code), sentOn = a && a.sub ? C.when(a.sub) : '';
    return '<section class="jhero ok"><span class="jbigic">' + ic('circle-check') + '</span><h1>Thanks' + (nm ? ', ' + h(nm) : '') + '. Demo Skip & Grab have got it.</h1>' +
      (sentOn ? '<p>Sent ' + h(sentOn) + '.</p>' : '') + '<p>A person at Demo Skip & Grab checks everything before your first booking. You will hear back by email.</p></section>' +
      card('What happens next', '', '<ol class="jsteps"><li>Your carrier licence is checked on the Environment Agency register.</li><li>Your insurance certificates are looked at by a person.</li><li>You are approved and bookings start coming through.</li><li>A month before anything runs out, you get an email asking for the new one.</li></ol>', 'list') +
      (P.get('embed') === '1' ? '' : '<p class="jsmall" style="text-align:center">Demo: this went to the office screen in this browser only. Nothing was sent.</p>') +
      '<button class="jdemo" data-j="again">' + ic('refresh') + 'Demo: start this form again</button>';
  }

  /* ---------- checks, step by step, in plain words ---------- */
  function need(p, msg) { var v = get(p); if (v == null || String(v).trim() === '') ERR[p] = msg; }
  function email(p) { var v = String(get(p) || '').trim(); if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ERR[p] = 'That does not look like an email address'; }
  function phone(p) { var v = String(get(p) || '').replace(/[^\d+]/g, ''); if (v && v.replace(/^\+44/, '0').length < 10) ERR[p] = 'That number looks too short'; }
  function dateOk(p, req, label) {
    var v = get(p); if (!v) { if (req) ERR[p] = 'Put the date it runs out'; return; }
    var off = C.offOf(v); if (off == null) { ERR[p] = 'Pick a date'; return; }
    if (off < 0) ERR[p] = (label || 'This') + ' has run out. Please add the current one.';
  }
  function check(i) {
    ERR = {};
    if (i === 1) { need('company.name', 'Put your company name in'); need('company.addr', 'Put your office address in'); need('company.pc', 'Put the postcode in'); need('company.phone', 'Put a phone number in'); need('company.email', 'Put an email in'); email('company.email'); phone('company.phone');
      var ch = String(F.company.chno || '').trim(); if (ch && !/^([A-Z]{2}\d{6}|\d{8})$/i.test(ch.replace(/\s/g, ''))) ERR['company.chno'] = 'Companies House numbers are 8 characters, like 13820417'; }
    if (i === 2) { need('book.name', 'Who should we ask for?'); need('book.phone', 'Put a mobile number in'); need('book.email', 'Put an email in'); email('book.email'); phone('book.phone'); need('acc.name', 'Who does your accounts?'); need('acc.email', 'Put an accounts email in'); email('acc.email'); }
    if (i === 3) { if (!F.svcs.length) ERR.svcs = 'Tap at least one thing you supply'; if (F.svcs.indexOf('skip') >= 0 && !F.sizes.length) ERR.sizes = 'Tap the skip sizes you have';
      var a = areas(); if (!a.length) ERR.areas = 'Put in at least one postcode you cover'; else if (a.some(function (x) { return !goodArea(x); })) ERR.areas = 'One of those is not the start of a postcode'; }
    if (i === 4) { need('depots.0.name', 'Where is your depot?'); need('depots.0.pc', 'Put the postcode in');
      if (waste()) { var any = F.tips.some(function (t) { return String(t.no || '').trim(); }); if (!any) { need('tips.0.name', 'Where do you tip?'); need('tips.0.no', 'Put the permit or exemption number in'); }
        F.tips.forEach(function (t, k) { if (String(t.no || '').trim() || String(t.name || '').trim()) { need('tips.' + k + '.name', 'Name the site'); need('tips.' + k + '.no', 'Put the number in'); if (!t.file) ERR['tips.' + k + '.file'] = 'Add a photo or copy of the permit'; if (t.kind === 'Exemption') dateOk('tips.' + k + '.exp', true, 'This exemption'); } }); } }
    if (i === 5) { if (!F.prices.file && !F.prices.later) ERR.prices = 'Add your price list, or tick that you will send it later'; if (!F.terms) ERR.terms = 'Tap your payment terms'; if (F.terms === 'other') need('termsOther', 'Type your terms'); }
    if (i === 6) {
      if (waste()) { var no = String(F.docs.wcl.no || '').toUpperCase().replace(/\s/g, ''); if (!no) ERR['docs.wcl.no'] = 'Put your registration number in'; else if (!/^CBD[UL]\d{5,7}$/.test(no)) ERR['docs.wcl.no'] = 'It starts CBDU or CBDL, then numbers'; dateOk('docs.wcl.exp', true, 'Your licence'); if (!F.docs.wcl.file) ERR['docs.wcl.file'] = 'Add a photo or copy of the licence'; }
      ['pl', 'el', 'git'].forEach(function (k) { if (!F.docs[k].cover) ERR['docs.' + k + '.cover'] = 'Tap your level of cover'; dateOk('docs.' + k + '.exp', true, 'This insurance'); if (!F.docs[k].file) ERR['docs.' + k + '.file'] = 'Add a photo or copy of the certificate'; });
      ['fors', 'chas'].forEach(function (k) { if (F.docs[k].exp) dateOk('docs.' + k + '.exp', false, 'This'); });
    }
    if (i === 7) { ['terms', 'duty', 'data'].forEach(function (k) { if (!F.cons[k]) ERR['cons.' + k] = 'Tick this to carry on'; }); need('sig.name', 'Put your full name in'); need('sig.pos', 'Put your position in');
      if (F.sig.mode === 'draw' ? !F.sig.drawn : !String(F.sig.typed || '').trim()) ERR.sig = F.sig.mode === 'draw' ? 'Draw your signature in the box' : 'Type your name to sign'; }
    return !Object.keys(ERR).length;
  }

  /* ---------- drawing it ---------- */
  function draw() {
    var r = document.getElementById('jview'), s = F.step;
    q('#jsafe').innerHTML = s > 0 && s <= 7 && !done ? ic('lock') + 'Goes to Demo Skip & Grab only' : '';
    if (done) { r.innerHTML = thanks(); q('#jbar').innerHTML = ''; return; }
    if (!s) { r.innerHTML = welcome(); q('#jbar').innerHTML = ''; return; }
    var body = [null, p1, p2, p3, p4, p5, p6, p7][s]();
    r.innerHTML = '<div class="jprog"><div class="jpt"><b>Step ' + s + ' of 7</b><span>' + h(STEPS[s - 1]) + '</span></div><div class="jpb"><i style="width:' + Math.round(s / 7 * 100) + '%"></i></div></div>' + body +
      '<button class="jdemo" data-j="fillStep">' + ic('sparkles') + 'Demo: fill this page in for me</button>';
    q('#jbar').innerHTML = '<button class="btn lg" data-j="back">' + ic('chevron-left') + 'Back</button><button class="btn pri lg" data-j="next">' + (s === 7 ? ic('send') + 'Send to Demo Skip & Grab' : 'Next' + ic('chevron-right')) + '</button>';
    if (s === 7 && F.sig.mode === 'draw') pad();
  }
  function go(s) { F.step = s; save(); ERR = {}; draw(); window.scrollTo(0, 0); }
  function firstErr() { var el = document.querySelector('.jf.bad input, .jf.bad textarea, .bad .jerr, .jerr'); if (el) { el.scrollIntoView({ block: 'center' }); if (el.focus && el.tagName !== 'SMALL') el.focus(); } }
  function pad() {
    var c = document.getElementById('jcan'); if (!c) return; var x = c.getContext('2d'), on = false;
    x.lineWidth = 3.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#1A1A1A';
    if (F.sig.drawn) { var im = new Image(); im.onload = function () { x.drawImage(im, 0, 0); }; im.src = F.sig.drawn; }
    function pt(e) { var b = c.getBoundingClientRect(); return [(e.clientX - b.left) * c.width / b.width, (e.clientY - b.top) * c.height / b.height]; }
    c.addEventListener('pointerdown', function (e) { on = true; c.setPointerCapture(e.pointerId); var p = pt(e); x.beginPath(); x.moveTo(p[0], p[1]); e.preventDefault(); });
    c.addEventListener('pointermove', function (e) { if (!on) return; var p = pt(e); x.lineTo(p[0], p[1]); x.stroke(); e.preventDefault(); });
    function up() { if (!on) return; on = false; F.sig.drawn = c.toDataURL('image/png'); save(); if (ERR.sig) { delete ERR.sig; var e2 = document.querySelector('.jcard .jerr'); if (e2 && e2.parentNode) e2.remove(); } }
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); c.addEventListener('pointerleave', up);
  }

  /* ---------- sample answers, for showing it on a call ---------- */
  function fill(s) {
    var nm = F.company.name || (APP && APP.name) || 'Wendmoor Skip Hire Ltd', who = F.book.name || (APP && APP.who ? APP.who + ' Marsh' : 'Lee Marsh');
    if (!/\s/.test(who)) who += ' Marsh';
    var slug = nm.toLowerCase().replace(/\b(ltd|limited)\b/g, '').replace(/[^a-z]+/g, '').slice(0, 18) || 'yourfirm';
    var d = function (n) { return C.iso(n); };
    if (s === 1) F.company = { name: nm, chno: '13820417', addr: 'Unit 4, Wendmoor Farm, Chobham', pc: 'GU24 8RP', phone: '01276 000412', email: 'office@' + slug + '.co.uk' };
    if (s === 2) { F.book = { name: who, phone: F.book.phone || '07700 900412', wa: true, email: 'bookings@' + slug + '.co.uk' }; F.acc = { name: 'Karen ' + who.split(' ').slice(-1)[0], email: 'accounts@' + slug + '.co.uk', phone: '01485 000413' }; F.ooh = '07700 900414'; }
    if (s === 3) { F.svcs = ['skip', 'grab']; F.sizes = [4, 6, 8, 12, 16, 20]; F.areas = 'GU21 GU22 GU23 GU24 KT14 KT15 KT16 GU18 GU19'; }
    if (s === 4) { F.depots = [{ name: 'Chobham yard', pc: 'GU24 8RP' }]; F.tips = [{ name: 'Wendmoor transfer station, Chobham', pc: 'GU24 8RP', kind: 'Permit', no: 'EPR/WB3184KX', exp: '', file: 'Environmental permit.pdf' }]; }
    if (s === 5) { if (!F.svcs.length) fill(3); F.prices = { file: nm.split(' ')[0] + ' prices Nov 2026.pdf', rates: sampleRates(), later: false }; F.terms = '30 days'; }
    if (s === 6) { F.docs = { wcl: { no: 'CBDU533470', tier: 'Upper', exp: d(612), file: 'Carrier licence.jpg' }, pl: { cover: 5e6, exp: d(211), file: 'Public liability.pdf' }, el: { cover: 10e6, exp: d(211), file: 'Employers liability.jpg' }, git: { cover: 50000, exp: d(211), file: 'Goods in transit.pdf' }, fors: { level: 'Bronze', exp: d(140), file: 'FORS Bronze.pdf' }, chas: { exp: '', file: '' } }; }
    if (s === 7) { var t = Date.now(); F.cons = { terms: t, duty: t, data: t }; F.sig = { name: who, pos: 'Director', typed: who, drawn: '', mode: 'type' }; }
    save();
  }

  function submit() {
    var data = {
      company: F.company, book: F.book, acc: F.acc, ooh: F.ooh,
      depots: F.depots.filter(function (x) { return x.name || x.pc; }), tips: F.tips.filter(function (x) { return x.no; }).map(function (x) { return { name: x.name + (x.pc ? ', ' + x.pc.toUpperCase() : ''), pc: x.pc, kind: x.kind, no: String(x.no).toUpperCase(), exp: x.kind === 'Exemption' ? x.exp : '', file: x.file }; }),
      areas: areas(), svcs: F.svcs.slice(), sizes: F.sizes.slice(),
      prices: { file: F.prices.file, rates: F.prices.file ? F.prices.rates : null, later: F.prices.later },
      terms: F.terms === 'other' ? F.termsOther : F.terms,
      docs: { wcl: waste() ? { no: String(F.docs.wcl.no).toUpperCase().replace(/\s/g, ''), tier: F.docs.wcl.tier, exp: F.docs.wcl.exp, file: F.docs.wcl.file } : null, pl: F.docs.pl, el: F.docs.el, git: F.docs.git, fors: F.docs.fors.file ? F.docs.fors : null, chas: F.docs.chas.file ? F.docs.chas : null },
      cons: { terms: F.cons.terms, duty: F.cons.duty, data: F.cons.data },
      sig: { name: F.sig.name, pos: F.sig.pos, typed: F.sig.mode === 'draw' ? '' : F.sig.typed, drawn: F.sig.mode === 'draw' ? F.sig.drawn : '', at: Date.now() }
    };
    var a = C.submit(CODE, data); APP = a; if (!CODE) { CODE = a.code; }
    CS.commit('join');
    done = true; try { localStorage.removeItem(DKEY); } catch (e) {}
    draw(); window.scrollTo(0, 0);
  }

  /* ---------- taps and typing ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-j]'); if (!el) return;
    var a = el.getAttribute('data-j'), v = el.getAttribute('data-v');
    if (a === 'start') go(1);
    else if (a === 'next') { if (!check(F.step)) { draw(); firstErr(); return; } if (F.step === 7) submit(); else go(F.step + 1); }
    else if (a === 'back') go(F.step - 1);
    else if (a === 'fillStep') { fill(F.step); ERR = {}; draw(); toast('Filled in with sample answers', 'sparkles'); }
    else if (a === 'fillAll') { for (var i = 1; i <= 7; i++) fill(i); go(7); toast('Every page filled in with sample answers. Check any page with Back.', 'sparkles'); }
    else if (a === 'again') { F = blank(); save(); done = false; draw(); }
    else if (a === 'svc') { var k = v, ix = F.svcs.indexOf(k); if (ix >= 0) F.svcs.splice(ix, 1); else F.svcs.push(k); delete ERR.svcs; save(); draw(); }
    else if (a === 'size') { var z = +v, iz = F.sizes.indexOf(z); if (iz >= 0) F.sizes.splice(iz, 1); else F.sizes.push(z); F.sizes.sort(function (x, y) { return x - y; }); delete ERR.sizes; save(); draw(); }
    else if (a === 'sameAcc') { F.acc = { name: F.book.name, email: F.book.email, phone: F.book.phone }; save(); draw(); }
    else if (a === 'addDepot') { F.depots.push({ name: '', pc: '' }); save(); draw(); }
    else if (a === 'rmDepot') { F.depots.splice(+v, 1); save(); draw(); }
    else if (a === 'addTip') { F.tips.push({ name: '', pc: '', kind: 'Permit', no: '', exp: '', file: '' }); save(); draw(); }
    else if (a === 'rmTip') { F.tips.splice(+v, 1); save(); draw(); }
    else if (a === 'tipKind') { var pp = v.split('|'); F.tips[+pp[0]].kind = pp[1]; save(); draw(); }
    else if (a === 'terms') { F.terms = v; delete ERR.terms; save(); draw(); }
    else if (a === 'tier') { F.docs.wcl.tier = v; save(); draw(); }
    else if (a === 'fors') { F.docs.fors.level = F.docs.fors.level === v ? '' : v; save(); draw(); }
    else if (a === 'cover') { var cc = v.split('|'); F.docs[cc[0]].cover = +cc[1]; delete ERR['docs.' + cc[0] + '.cover']; save(); draw(); }
    else if (a === 'sigMode') { F.sig.mode = v; save(); draw(); }
    else if (a === 'sigClear') { F.sig.drawn = ''; save(); draw(); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target, p = t.getAttribute && t.getAttribute('data-f'); if (!p) return;
    var v = t.value; if (t.getAttribute('data-num')) v = Number(String(v).replace(/[^\d.]/g, '')) || 0;
    set(p, v); save();
    if (ERR[p]) { delete ERR[p]; var f = t.closest('.jf'); if (f) { f.classList.remove('bad'); var m = f.querySelector('.jerr'); if (m) m.remove(); } }
    if (p === 'areas') { var b = q('#jareas'); if (b) b.innerHTML = areaChips(areas()); }
    if (p === 'sig.typed') { var sg = document.querySelector('.jsig'); if (sg) sg.textContent = v; else if (v) { var n = document.createElement('div'); n.className = 'jsig'; n.textContent = v; t.closest('.jf').after(n); } }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute('data-c')) { set(t.getAttribute('data-c'), !!t.checked); save(); if (t.getAttribute('data-c') === 'prices.later') { delete ERR.prices; draw(); } return; }
    if (t.getAttribute('data-cons')) { F.cons[t.getAttribute('data-cons')] = t.checked ? Date.now() : 0; save(); delete ERR['cons.' + t.getAttribute('data-cons')]; draw(); return; }
    var up = t.getAttribute('data-up'); if (up && t.files && t.files[0]) {
      var name = t.files[0].name; set(up, name); delete ERR[up]; save();
      if (up === 'prices.file') { F.prices.reading = true; F.prices.later = false; draw(); setTimeout(function () { F.prices.reading = false; F.prices.rates = sampleRates(); save(); draw(); }, 1100); return; }
      draw();
    }
  });
  window.addEventListener('storage', function (e) { if (e.key === DKEY) return; });
  window.DSGJOIN = { state: function () { return F; }, fill: fill, go: go, check: check };
  draw();
})();
