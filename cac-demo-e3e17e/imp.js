/* CAC demo, seventh layer: Import from a spreadsheet (Settings cog > Import). The broker's side of the
   shared import (apx-import.js): the team, customers, sites and suppliers. Same three steps as every
   ApexLine system: get the template, fill it in and upload it, done.
   Sample data only. The file is read in this browser and nothing leaves it. */
(function () {
  var CS = window.CS, h = CS.esc, ic = window.ic, APXI = window.APXI;
  var W = window.CACIMP = {}, H = null;
  function S() { return CS.S; }

  /* make-a-copy links to a Google Sheets version of each template. Empty means the button is hidden.
     Fill these in only once the sheets exist and Jack has agreed to share them. */
  var GOOGLE_TEMPLATES = { team: '', customers: '', sites: '', suppliers: '' };

  var SEES = {
    'Director': 'Everything: margin, supplier costs, credit and the whole team\'s pipeline',
    'Account manager': 'Inbox, jobs, suppliers and chasing for the accounts they look after',
    'Office and accounts': 'Invoices, supplier bills, statements and the chasing list',
    'Business Development Executive': 'Leads, quotes and their own accounts'
  };
  function custByName(n) { n = String(n || '').trim().toLowerCase().replace(/\s+(ltd|limited)\.?$/, ''); return S().customers.filter(function (c) { return c.name.toLowerCase().replace(/\s+(ltd|limited)\.?$/, '') === n; })[0]; }
  function supByName(n) { n = String(n || '').trim().toLowerCase(); return S().suppliers.filter(function (s) { return s.name.toLowerCase() === n; })[0]; }
  function pcOk(pc) { return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(String(pc || '').trim()); }
  function pcTidy(pc) { pc = String(pc || '').toUpperCase().replace(/\s+/g, ''); return pc.slice(0, -3) + ' ' + pc.slice(-3); }
  function num(x) { return +String(x == null ? '' : x).replace(/[^\d.\-]/g, '') || 0; }
  var idN = 0;
  function newId(p) { idN++; return p + Date.now().toString(36) + idN.toString(36); }
  function svcKeys(text) {
    var out = [], t = String(text || '').toLowerCase();
    Object.keys(S().services).forEach(function (k) {
      var s = S().services[k];
      if (t.indexOf(k) >= 0 || t.indexOf(s.name.toLowerCase()) >= 0 || t.indexOf(s.short.toLowerCase()) >= 0) out.push(k);
    });
    return out;
  }

  var KINDS = {
    team: {
      label: 'Team', one: 'person', many: 'people', file: 'team', people: true,
      what: 'One row for each person at CAC who needs their own login.',
      fields: [
        { key: 'first', label: 'First name', req: true, eg: 'Sam', syn: ['first', 'forename', 'given name', 'name', 'full name', 'employee', 'employee name', 'staff name'] },
        { key: 'last', label: 'Surname', req: true, eg: 'Carter', syn: ['last name', 'lastname', 'family name', 'second name', 'surname'] },
        { key: 'position', label: 'Position', req: true, eg: 'Account manager', hint: 'Director, Account manager, Office and accounts, or Business Development Executive', syn: ['role', 'job', 'job title', 'title', 'job role', 'department'] },
        { key: 'username', label: 'Username', eg: '', hint: 'Leave blank and one is made for them', syn: ['user', 'user name', 'login', 'log in', 'sign in'] },
        { key: 'pin', label: 'Starting PIN', eg: '', hint: '4 numbers, or leave blank', syn: ['pin', 'pin number', 'pin code', 'passcode', 'code'] },
        { key: 'mobile', label: 'Mobile', eg: '07700 900123', syn: ['phone', 'mobile number', 'tel', 'telephone', 'contact number'] }
      ],
      positions: [
        { name: 'Director', syn: ['owner', 'managing director', 'md', 'partner'] },
        { name: 'Account manager', syn: ['account manager', 'accounts manager', 'customer service', 'coordinator', 'co-ordinator', 'operations', 'ops', 'bookings', 'transport', 'manager'] },
        { name: 'Office and accounts', syn: ['office', 'accounts', 'admin', 'administrator', 'bookkeeper', 'finance', 'credit control', 'office manager'] },
        { name: 'Business Development Executive', syn: ['bde', 'bdm', 'business development', 'sales', 'sales executive', 'sales rep', 'business development manager'] }
      ],
      handNote: 'On your system each person signs in with their username and starting PIN, then has to choose their own PIN straight away. This demo has no sign in, so nothing is sent to anyone.',
      existing: function () {
        var bde = String(CS.bde() || '').split(' ');
        return [{ username: 'j.pesci', first: 'John', last: 'Pesci' }, { username: 'bde', first: bde[0] || '', last: bde.slice(1).join(' ') }]
          .concat((S().team || []).map(function (p) { var b = String(p.name).split(' '); return { username: p.username || '', first: b[0], last: b.slice(1).join(' ') }; }));
      },
      commit: function (items) {
        var s = S();
        s.team = (s.team || []).concat(items.map(function (p) {
          return { name: p.first + ' ' + p.last, role: p.position, sees: SEES[p.position], username: p.username, mobile: p.mobile || '', imported: true };
        }));
        CS.feed(items.length + (items.length === 1 ? ' person' : ' people') + ' added to the team from a spreadsheet', 'users');
        CS.commit();
        return 'They each get their own screens: what they see depends on their position.';
      },
      sample: function () {
        return [['Name', 'Job title', 'Mobile number', 'PIN'],
          ['Leah Morgan', 'Account manager', '07700 900311', ''],
          ['Tariq Hussain', 'Sales', '7700900322', '42'],
          ['Zoë Lindqvist', 'Bookkeeper', '', '6815'],
          ['Callum', 'Account manager', '', ''],
          ['Renée Okoro', 'Driver', '', ''],
          ['John Pesci', 'Director', '', '']];
      },
      addOne: function () { H.A.team(); }, addOneLabel: 'Add one person by hand',
      see: function () { H.A.team(); }, seeLabel: 'See the team'
    },

    customers: {
      label: 'Customers', one: 'customer', many: 'customers', file: 'customers', canUpdate: true, show: 4,
      what: 'One row for each customer, with the person you deal with there.',
      fields: [
        { key: 'name', label: 'Business name', req: true, eg: 'Harbourside Builders Ltd', syn: ['name', 'business', 'customer', 'company', 'account', 'account name', 'customer name'] },
        { key: 'contact', label: 'Contact name', eg: 'Craig Barrett', syn: ['contact', 'person', 'buyer', 'site manager'] },
        { key: 'phone', label: 'Phone', eg: '07700 900288', syn: ['phone', 'tel', 'telephone', 'mobile'] },
        { key: 'email', label: 'Email', eg: 'craig@harboursidebuilders.example', syn: ['email', 'e-mail', 'email address'] },
        { key: 'type', label: 'Type of customer', eg: 'Builder', syn: ['type', 'trade', 'sector', 'customer type'] },
        { key: 'terms', label: 'Payment terms', eg: '30 day account', hint: '30 day account, 14 day account or Card on order', syn: ['terms', 'payment terms', 'payment'] },
        { key: 'limit', label: 'Credit limit', eg: '3000', syn: ['credit limit', 'limit', 'credit'] }
      ],
      check: function (v, c) {
        var key = v.name.toLowerCase();
        if (c.seen[key]) { c.note('is the same business as row ' + c.seen[key] + '.', 'skip'); return; }
        c.seen[key] = c.res.n;
        if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { c.note('"' + v.email + '" does not look like an email address, so it is left blank.'); v.email = ''; }
        if (custByName(v.name)) c.note(v.name + ' is already a customer.', 'update');
      },
      commit: function (items) {
        var s = S(), n = 0;
        items.forEach(function (it) {
          var v = it.v, c = custByName(v.name);
          if (c) {
            if (v.contact) { c.contact = v.contact; c.first = v.contact.split(' ')[0]; }
            ['phone', 'email', 'type'].forEach(function (k) { if (v[k]) c[k] = v[k]; });
            if (v.terms) c.terms = v.terms;
            if (v.limit !== '') c.limit = num(v.limit);
            return;
          }
          var contact = v.contact || v.name;
          s.customers.push({ id: newId('ci'), limit: num(v.limit), name: v.name, contact: contact, first: contact.split(' ')[0], phone: v.phone || '', email: v.email || '',
            type: v.type || 'Builder', terms: v.terms || (num(v.limit) ? '30 day account' : 'Card on order'), owner: 'john', sites: [], isNew: true, imported: true });
          n++;
        });
        if (n) CS.feed(n + (n === 1 ? ' customer' : ' customers') + ' imported from a spreadsheet', 'user-plus');
        CS.commit();
        return n ? 'Add their sites with the Sites template, or they are added the first time they order.' : '';
      },
      sample: function () {
        var known = (S().customers[0] || {}).name || 'Dunmore Groundworks';
        return [['Customer', 'Contact', 'Telephone', 'Email', 'Trade', 'Terms', 'Credit limit'],
          ['Harbourside Builders Ltd', 'Craig Barrett', '07700 900288', 'craig@harboursidebuilders.example', 'Builder', '30 day account', '3000'],
          ['Fenland Roofing', 'Maya Petrov', '07700 900299', 'maya at fenlandroofing', 'Roofing', 'Card on order', ''],
          ['', 'No name', '', '', '', '', ''],
          [known, 'New contact', '07700 900277', '', '', '', ''],
          ['Wensum Landscapes', 'Ian Cho', '07700 900266', 'ian@wensumlandscapes.example', 'Landscaping', '14 day account', '1500']];
      },
      see: function () { H.go('customers'); }, seeLabel: 'See the customers'
    },

    sites: {
      label: 'Sites', one: 'site', many: 'sites', file: 'sites', show: 4,
      what: 'One row for each site you deliver to, against the customer it belongs to.',
      fields: [
        { key: 'cust', label: 'Customer', req: true, eg: 'Harbourside Builders Ltd', syn: ['customer', 'business name', 'company', 'account', 'customer name'] },
        { key: 'name', label: 'Site name', req: true, eg: 'Plot 12, Mill Lane', syn: ['site', 'site name', 'address', 'site address', 'job', 'location'] },
        { key: 'pc', label: 'Postcode', req: true, eg: 'PE30 2HQ', syn: ['postcode', 'post code', 'pc', 'zip'] },
        { key: 'contact', label: 'Site contact', eg: 'Dave on site', syn: ['site contact', 'contact', 'site manager', 'foreman'] },
        { key: 'phone', label: 'Site phone', eg: '07700 900355', syn: ['site phone', 'phone', 'tel', 'mobile', 'contact number'] },
        { key: 'notes', label: 'Access notes', eg: 'Narrow lane, no artics', syn: ['notes', 'access', 'access notes', 'instructions'] }
      ],
      check: function (v, c) {
        var cu = custByName(v.cust);
        if (!cu) { c.note(v.cust + ' is not a customer yet. Import your customers first, then the sites.', 'skip'); return; }
        if (!pcOk(v.pc)) { c.note('"' + v.pc + '" is not a full postcode, like PE30 2HQ.', 'skip'); return; }
        v.pc = pcTidy(v.pc);
        var key = cu.id + '|' + v.pc + '|' + v.name.toLowerCase();
        if (c.seen[key]) { c.note('is the same site as row ' + c.seen[key] + '.', 'skip'); return; }
        c.seen[key] = c.res.n;
        if (cu.sites.some(function (s) { return s.pc === v.pc && s.name.toLowerCase() === v.name.toLowerCase(); })) c.note(v.name + ' is already a site for ' + cu.name + ', so this row is left alone.', 'dup');
      },
      commit: function (items) {
        var cs = {};
        items.forEach(function (it) {
          var v = it.v, cu = custByName(v.cust), s = { name: v.name, pc: v.pc };
          if (v.contact) s.contact = v.contact;
          if (v.phone) s.phone = v.phone;
          if (v.notes) s.notes = v.notes;
          cu.sites.push(s); cs[cu.id] = 1;
        });
        CS.feed(items.length + (items.length === 1 ? ' site' : ' sites') + ' imported from a spreadsheet', 'map-pin');
        CS.commit();
        return 'Across ' + Object.keys(cs).length + (Object.keys(cs).length === 1 ? ' customer.' : ' customers.') + ' They are there to pick in New order.';
      },
      sample: function () {
        var c0 = S().customers[0], c1 = S().customers[1] || c0;
        return [['Customer name', 'Site address', 'Post code', 'Site manager', 'Contact number', 'Access'],
          [c0.name, 'Plot 12, Mill Lane', 'pe318lt', 'Dave', '07700 900355', 'Narrow lane, no artics'],
          [c1.name, 'Wharf Street yard', 'NR1 1AB', '', '', ''],
          [c0.name, c0.sites[0].name, c0.sites[0].pc, '', '', ''],
          ['Nobody Homes', 'Unit 4', 'PE30 1AA', '', '', ''],
          [c1.name, 'High Street', 'Norwich', '', '', '']];
      },
      see: function () { H.go('customers'); }, seeLabel: 'See the customers'
    },

    suppliers: {
      label: 'Suppliers', one: 'supplier', many: 'suppliers', file: 'suppliers', canUpdate: true, show: 4,
      what: 'One row for each supplier, with who to ring and who to pay.',
      fields: [
        { key: 'name', label: 'Supplier name', req: true, eg: 'Northgate Skips', syn: ['supplier', 'name', 'company', 'business name', 'supplier name'] },
        { key: 'contact', label: 'Bookings contact', eg: 'Sarah', syn: ['contact', 'bookings contact', 'bookings', 'contact name'] },
        { key: 'phone', label: 'Phone', eg: '07700 900141', syn: ['phone', 'tel', 'telephone', 'mobile', 'bookings phone'] },
        { key: 'base', label: 'Based in', eg: 'King\'s Lynn', syn: ['base', 'based in', 'town', 'yard', 'location', 'depot'] },
        { key: 'services', label: 'Services', eg: 'Skip hire, Grab hire', hint: 'What they do for you, with commas between', syn: ['services', 'service', 'what they do', 'does'] },
        { key: 'areas', label: 'Postcode areas covered', eg: 'PE30, PE31, PE32', hint: 'The first half of each postcode, with commas between', syn: ['areas', 'postcodes', 'postcode areas', 'covers', 'coverage', 'postcode areas covered'] },
        { key: 'hireDays', label: 'Hire period (days)', eg: '14', syn: ['hire period', 'hire days', 'standard hire', 'hire'] },
        { key: 'acc', label: 'Accounts contact', eg: 'Kelly', syn: ['accounts contact', 'accounts', 'accounts name'] },
        { key: 'accEmail', label: 'Accounts email', eg: 'accounts@northgateskips.example', syn: ['accounts email', 'email', 'accounts e-mail', 'remittance email'] },
        { key: 'cbdu', label: 'Waste carrier number', eg: 'CBDU123456', syn: ['waste carrier', 'carrier number', 'cbdu', 'waste carrier licence', 'licence number'] }
      ],
      check: function (v, c) {
        var key = v.name.toLowerCase();
        if (c.seen[key]) { c.note('is the same supplier as row ' + c.seen[key] + '.', 'skip'); return; }
        c.seen[key] = c.res.n;
        if (v.services && !svcKeys(v.services).length) c.note('we could not match "' + v.services + '" to a service, so they come in as skip hire. Change it in the handbook.');
        if (v.accEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.accEmail)) { c.note('"' + v.accEmail + '" does not look like an email address, so it is left blank.'); v.accEmail = ''; }
        if (supByName(v.name)) c.note(v.name + ' is already in the handbook.', 'update');
      },
      commit: function (items) {
        var s = S(), n = 0, X2 = window.CACV2 && window.CACV2.x;
        items.forEach(function (it) {
          var v = it.v, su = supByName(v.name);
          var areas = String(v.areas || '').toUpperCase().split(/[\s,;]+/).filter(function (a) { return /^[A-Z]{1,2}\d{0,2}[A-Z]?$/.test(a); });
          if (!su) {
            var sv = svcKeys(v.services);
            su = { id: newId('si'), name: v.name, contact: v.contact || 'Bookings', phone: v.phone || '', base: v.base || '', services: sv.length ? sv : ['skip'],
              areas: areas, rates: {}, resp: 30, onTime: 95, wtn: 95, jobs: 0, recov: 90, hireDays: num(v.hireDays) || 14, weekRate: 25, cbdu: v.cbdu || 'Not on file yet', licExp: 365, imported: true };
            s.suppliers.push(su); n++;
          } else {
            ['contact', 'phone', 'base'].forEach(function (k) { if (v[k]) su[k] = v[k]; });
            if (areas.length) su.areas = areas;
            if (num(v.hireDays)) su.hireDays = num(v.hireDays);
            if (v.cbdu) su.cbdu = v.cbdu;
          }
          if (X2 && X2.hb && (v.acc || v.accEmail)) { var x = X2.hb(su); if (v.acc) x.acc = v.acc; if (v.accEmail) x.accEmail = v.accEmail; }
        });
        if (n) CS.feed(n + (n === 1 ? ' supplier' : ' suppliers') + ' imported from a spreadsheet', 'warehouse');
        CS.commit();
        return n ? 'Their prices come in next: open each one in the handbook and upload their price sheet.' : '';
      },
      sample: function () {
        var known = (S().suppliers[0] || {}).name || 'Saltmarsh Skips';
        return [['Supplier', 'Contact', 'Telephone', 'Town', 'What they do', 'Covers', 'Standard hire', 'Accounts name', 'Accounts email', 'Waste carrier licence'],
          ['Northgate Skips', 'Becky', '07700 900401', 'Swaffham', 'Skip hire', 'PE32, PE37, IP25', '28', 'Kelly', 'accounts@northgateskips.example', 'CBDU204418'],
          ['Wash Grab and Tipper', 'Liam', '07700 900412', 'Boston', 'Grab hire, muck away', 'PE20, PE21, PE22', '', '', '', ''],
          ['', 'Nobody', '', '', '', '', '', '', '', ''],
          [known, 'New bookings contact', '07700 900423', '', '', '', '28', '', '', ''],
          ['Brancaster Loos', 'Jo', '07700 900434', 'Hunstanton', 'Portable loos', 'PE31, PE36', '', '', 'jo at brancasterloos', '']];
      },
      see: function () { H.go('suppliers'); }, seeLabel: 'Open the supplier handbook'
    }
  };

  function view() {
    return '<div class="note" style="margin-bottom:16px">' + ic('download') + '<span><b>You bring your own data in, we never ask you to send it to us.</b> Download the template, fill it in, upload it, and check it before anything is added. In this demo the file is read in this browser and goes nowhere.</span></div>' +
      '<div class="apxi" id="apxiRoot">' + APXI.html() + '</div>' +
      '<div class="card pad" style="margin-top:16px" id="impPrices"><div class="row" style="flex-wrap:wrap;gap:10px"><div style="flex:1;min-width:240px"><h2>' + ic('pound') + 'Supplier prices</h2>' +
      '<p class="muted" style="margin:6px 0 0;font-size:13px">Prices come in from the sheet each supplier already sends you. Open a supplier in the handbook and upload their price sheet.</p></div>' +
      '<button class="btn" data-act="go" data-v="suppliers">' + ic('warehouse') + 'Open the supplier handbook</button></div></div>';
  }

  W.kinds = KINDS;
  W.init = function (o) {
    H = o;
    if (!APXI) return;
    APXI.setup({
      rootId: 'apxiRoot', kinds: KINDS, order: ['team', 'customers', 'sites', 'suppliers'], kind: 'team',
      google: GOOGLE_TEMPLATES, printTitle: 'CAC sign in details',
      note: 'In this demo the file is read in this browser. Nothing is uploaded anywhere.',
      toast: function (msg, tone) { H.toast(h(msg), tone === 'bad' ? 'alert' : 'check'); }
    });
    H.V.import = view;
    H.A.importOpen = function (el) {
      H.closeLayer();
      if (APXI.st.result) APXI.setKind(APXI.st.kind);
      var k = el && el.dataset && el.dataset.v;
      if (k && KINDS[k] && APXI.st.kind !== k) APXI.setKind(k);
      H.go('import');
    };
  };
})();
