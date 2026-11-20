/* CAC Waste Management demo: sample data only. Every supplier, customer and lead here is made up for the demo.
   Dates are relative to today so the demo always looks live. Phone numbers use the 07700 900 range Ofcom keeps for drama. */
(function () {
  function range(area, a, b) { var o = []; for (var i = a; i <= b; i++) o.push(area + i); return o; }
  var SERVICES = {
    skip:       { name: 'Skip hire',         short: 'Skip',        icon: 'skip',     unit: 'skip',       markup: 0.33, ewc: '17 09 04', waste: 'Mixed construction and demolition waste' },
    grab:       { name: 'Grab hire',         short: 'Grab',        icon: 'truck',    unit: 'load',       markup: 0.24, ewc: '17 05 04', waste: 'Soil and stones' },
    muck:       { name: 'Muck away',         short: 'Muck away',   icon: 'truck',    unit: 'load',       markup: 0.22, ewc: '17 05 04', waste: 'Soil and stones' },
    welfare:    { name: 'Welfare unit',      short: 'Welfare',     icon: 'home',     unit: 'week',       markup: 0.34 },
    container:  { name: 'Storage container', short: 'Container',   icon: 'archive',  unit: 'week',       markup: 0.35 },
    toilet:     { name: 'Site toilet',       short: 'Toilet',      icon: 'droplet',  unit: 'week',       markup: 0.40 },
    fencing:    { name: 'Heras fencing',     short: 'Fencing',     icon: 'fence',    unit: 'panel/week', markup: 0.35 },
    sweeper:    { name: 'Road sweeper',      short: 'Sweeper',     icon: 'brush',    unit: 'hour',       markup: 0.25 },
    concrete:   { name: 'Readymix concrete', short: 'Concrete',    icon: 'truck',    unit: 'm3',         markup: 0.16 },
    aggregates: { name: 'Aggregates',        short: 'Aggregates',  icon: 'stack',    unit: 'load',       markup: 0.20 },
    plant:      { name: 'Plant hire',        short: 'Plant',       icon: 'backhoe',  unit: 'week',       markup: 0.28 }
  };

  var NORFOLK_SKIP = { 4: 150, 6: 180, 8: 205, 10: 240, 12: 265, 14: 290, 16: 315, 20: 420, 40: 560 };
  var SUPPLIERS = [
    { id: 's1', recov: 94, hireDays: 14, weekRate: 25, name: 'Saltmarsh Skips', contact: 'Sarah', phone: '07700 900141', base: 'Heacham', services: ['skip'],
      areas: range('PE', 30, 38).concat(range('NR', 21, 27)), rates: { skip: NORFOLK_SKIP },
      resp: 14, onTime: 97, wtn: 99, jobs: 61, cbdu: 'CBDU418207', licExp: 640, preferred: true },
    { id: 's13', recov: 88, hireDays: 14, weekRate: 25, name: 'Ringmere Skip Hire', contact: 'Gav', phone: '07700 900162', base: 'Downham Market', services: ['skip'],
      areas: range('PE', 1, 7).concat(range('PE', 13, 14), range('PE', 30, 34), ['PE37', 'PE38', 'NR19', 'NR20']),
      rates: { skip: { 4: 145, 6: 172, 8: 195, 10: 232, 12: 255, 14: 280, 16: 305, 20: 410, 40: 545 } },
      resp: 35, onTime: 91, wtn: 84, jobs: 38, cbdu: 'CBDU377415', licExp: 38 },
    { id: 's3', recov: 86, hireDays: 14, weekRate: 25, name: 'Brecklane Waste', contact: 'Martin', phone: '07700 900118', base: 'Thetford', services: ['skip'],
      areas: range('NR', 1, 18).concat(range('IP', 24, 27), range('CB', 21, 25)),
      rates: { skip: { 4: 155, 6: 185, 8: 210, 10: 245, 12: 270, 14: 295, 16: 320, 20: 430, 40: 575 } },
      resp: 41, onTime: 88, wtn: 81, jobs: 44, cbdu: 'CBDU402981', licExp: 410 },
    { id: 's2', recov: 97, hireDays: 14, weekRate: 25, name: 'Fenreach Grab and Haulage', contact: 'Lee', phone: '07700 900127', base: 'King\'s Lynn', services: ['grab', 'muck', 'aggregates'],
      areas: ['PE', 'CB', 'NR'], rates: { grab: 275, muck: 320, aggregates: 360 },
      resp: 22, onTime: 95, wtn: 96, jobs: 52, cbdu: 'CBDU355960', licExp: 820, preferred: true },
    { id: 's4', name: 'Wherrydale Welfare Hire', contact: 'Jo', phone: '07700 900133', base: 'Norwich', services: ['welfare', 'container', 'toilet', 'fencing'],
      areas: ['NR', 'PE', 'IP', 'CB', 'CO'], rates: { welfare: { week: 145, del: 180 }, container: { week: 28, del: 95 }, toilet: { week: 22, del: 45 }, fencing: { week: 1.4, del: 85 } },
      resp: 30, onTime: 96, wtn: null, jobs: 27, cbdu: 'n/a (no waste)', licExp: null },
    { id: 's5', name: 'Kingsmere Readymix', contact: 'Phil', phone: '07700 900149', base: 'Fakenham', services: ['concrete', 'aggregates'],
      areas: ['PE', 'NR'], rates: { concrete: { m3: 118, part: 60 }, aggregates: 375 },
      resp: 26, onTime: 93, wtn: null, jobs: 19, cbdu: 'n/a (supply only)', licExp: null },
    { id: 's6', name: 'Hollowfield Plant and Sweepers', contact: 'Rachel', phone: '07700 900156', base: 'Ely', services: ['plant', 'sweeper'],
      areas: ['PE', 'CB', 'NR', 'IP'], rates: { plant: { week: 165, del: 90 }, sweeper: { hour: 52, min: 4 } },
      resp: 19, onTime: 98, wtn: null, jobs: 23, cbdu: 'CBDU391044', licExp: 515 },
    { id: 's12', name: 'Stoneharbour Aggregates', contact: 'Kev', phone: '07700 900171', base: 'Lincoln', services: ['aggregates'],
      areas: ['PE', 'NR', 'CB', 'IP', 'LN', 'NG'], rates: { aggregates: 340 },
      resp: 48, onTime: 90, wtn: null, jobs: 11, cbdu: 'n/a (supply only)', licExp: null },
    { id: 's7', recov: 92, hireDays: 14, weekRate: 25, name: 'Docklight Skips', contact: 'Ray', phone: '07700 900184', base: 'Barking', services: ['skip'],
      areas: ['E', 'N', 'SE', 'IG', 'RM', 'EC'], rates: { skip: { 4: 240, 6: 280, 8: 320, 10: 360, 12: 395, 14: 430, 16: 460 } },
      resp: 18, onTime: 94, wtn: 95, jobs: 22, cbdu: 'CBDU288140', licExp: 290 },
    { id: 's8', recov: 95, hireDays: 14, weekRate: 25, name: 'Larkbridge Grab Hire', contact: 'Dev', phone: '07700 900190', base: 'Croydon', services: ['grab', 'muck'],
      areas: ['SW', 'W', 'SE', 'CR', 'KT', 'E'], rates: { grab: 330, muck: 395 },
      resp: 33, onTime: 92, wtn: 90, jobs: 9, cbdu: 'CBDU301877', licExp: 700 },
    { id: 's9', recov: 90, hireDays: 14, weekRate: 25, name: 'Brindlecross Skips', contact: 'Paula', phone: '07700 900115', base: 'Walsall', services: ['skip', 'grab', 'muck'],
      areas: ['B', 'WS', 'WV', 'DY', 'CV'], rates: { skip: { 4: 175, 6: 210, 8: 255, 10: 290, 12: 320, 14: 350, 16: 380 }, grab: 300, muck: 345 },
      resp: 24, onTime: 93, wtn: 92, jobs: 14, cbdu: 'CBDU366502', licExp: 455 },
    { id: 's10', recov: 93, hireDays: 14, weekRate: 25, name: 'Moorvale Grab and Skip', contact: 'Shaun', phone: '07700 900122', base: 'Oldham', services: ['skip', 'grab', 'muck'],
      areas: ['M', 'SK', 'OL', 'BL', 'WN'], rates: { skip: { 4: 170, 6: 205, 8: 245, 10: 280, 12: 310, 14: 340, 16: 370 }, grab: 290, muck: 340 },
      resp: 21, onTime: 95, wtn: 94, jobs: 12, cbdu: 'CBDU349918', licExp: 980 },
    { id: 's11', recov: 89, hireDays: 14, weekRate: 25, name: 'Quayline Skips', contact: 'Carl', phone: '07700 900137', base: 'Bootle', services: ['skip'],
      areas: ['L', 'CH', 'WA', 'PR'], rates: { skip: { 4: 165, 6: 198, 8: 235, 10: 270, 12: 300, 14: 330, 16: 360 } },
      resp: 52, onTime: 89, wtn: 86, jobs: 8, cbdu: 'CBDU412360', licExp: 21 }
  ];

  var CUSTOMERS = [
    { id: 'c1', limit: 5000, swapDays: 9, name: 'Dunmore Groundworks', contact: 'Dan Dunmore', first: 'Dan', phone: '07700 900211', email: 'dan@dunmore-groundworks.co.uk', type: 'Groundworks', terms: '30 day account', owner: 'john',
      sites: [{ name: 'Docking Road, Burnham Market', pc: 'PE31 8LT' }, { name: 'Lynn Road plots, Snettisham', pc: 'PE31 7PB' }] },
    { id: 'c2', limit: 4000, swapDays: 7, name: 'Pellow Homes', contact: 'Kerry Pellow', first: 'Kerry', phone: '07700 900224', email: 'kerry@pellowhomes.co.uk', type: 'Developer', terms: '30 day account', owner: 'john',
      sites: [{ name: 'Drayton site, Fakenham Road', pc: 'NR8 6RG' }, { name: 'Costessey plots', pc: 'NR5 0LY' }] },
    { id: 'c3', limit: 2000, name: 'Ashby and Venn Civils', contact: 'Mark Venn', first: 'Mark', phone: '07700 900236', email: 'mark@ashbyvenn.co.uk', type: 'Civils', terms: '30 day account', owner: 'john',
      sites: [{ name: 'Oundle Road compound', pc: 'PE2 9PJ' }] },
    { id: 'c4', limit: 0, name: 'R. Tolhurst Builders', contact: 'Rob Tolhurst', first: 'Rob', phone: '07700 900245', email: 'rob@tolhurstbuilders.co.uk', type: 'General builder', terms: 'Card on order', owner: 'john',
      sites: [{ name: 'Cliff Parade, Hunstanton', pc: 'PE36 6EJ' }, { name: 'Heacham extension', pc: 'PE31 7HD' }] },
    { id: 'c5', limit: 2500, name: 'Calder Fit-Out', contact: 'Sian Calder', first: 'Sian', phone: '07700 900252', email: 'sian@calderfitout.co.uk', type: 'Fit-out', terms: '30 day account', owner: 'john',
      sites: [{ name: 'Westferry Road', pc: 'E14 8JH' }] },
    { id: 'c6', limit: 6000, name: 'Hexley Developments', contact: 'Lee Hexley', first: 'Lee', phone: '07700 900263', email: 'lee@hexleydev.co.uk', type: 'Regional developer', terms: '30 day account', owner: 'john',
      sites: [{ name: 'Plot 4, Histon', pc: 'CB24 9LQ' }, { name: 'Cottenham phase 2', pc: 'CB24 8RX' }] },
    { id: 'c7', limit: 4000, name: 'Marram Landscapes', contact: 'Gemma Shaw', first: 'Gemma', phone: '07700 900271', email: 'gemma@marramlandscapes.co.uk', type: 'Landscaping', terms: '30 day account', owner: 'sam',
      sites: [{ name: 'Wells quay site', pc: 'NR23 1AT' }] },
    { id: 'c8', limit: 1000, name: 'Greaves Roofing', contact: 'Paul Greaves', first: 'Paul', phone: '07700 900283', email: 'paul@greavesroofing.co.uk', type: 'Roofing', terms: '30 day account', owner: 'sam',
      sites: [{ name: 'Erdington job', pc: 'B23 6TR' }] },
    { id: 'c9', limit: 0, name: 'Tidemill Construction', contact: 'Tom Ellis', first: 'Tom', phone: '07700 900294', email: 'tom@tidemillconstruction.co.uk', type: 'General builder', terms: 'Card on order', owner: 'sam',
      sites: [{ name: 'Ancoats refurb', pc: 'M4 6BF' }] },
    { id: 'c10', limit: 1500, name: 'Kilner Builders', contact: 'Andy Kilner', first: 'Andy', phone: '07700 900298', email: 'andy@kilnerbuilders.co.uk', type: 'General builder', terms: '30 day account', owner: 'sam',
      sites: [{ name: 'Toxteth terrace', pc: 'L8 0RE' }] }
  ];

  function job(id, cust, site, svc, size, qty, sup, cost, sell, status, day, wtn, extra) {
    var j = { id: id, cust: cust, site: site, svc: svc, size: size, qty: qty || 1, sup: sup, cost: cost, sell: sell, status: status, day: day,
      wtn: wtn, log: [], owner: 'john' };
    if (extra) for (var k in extra) j[k] = extra[k];
    return j;
  }
  var JOBS = [
    job('CAC-1026', 'c8', 0, 'skip', 6, 1, 's9', 210, 280, 'onhire', -17, 'received', { permit: true }),
    job('CAC-1028', 'c10', 0, 'skip', 8, 1, 's11', 235, 310, 'onhire', -11, 'received'),
    job('CAC-1030', 'c6', 0, 'skip', 12, 1, 's3', 270, 355, 'done', -12, 'received'),
    job('CAC-1031', 'c6', 0, 'skip', 8, 1, 's3', 210, 280, 'done', -9, 'received'),
    job('CAC-1032', 'c6', 0, 'grab', null, 1, 's2', 275, 340, 'done', -7, 'received'),
    job('CAC-1033', 'c6', 0, 'skip', 12, 1, 's3', 270, 355, 'exchange', -3, 'received', { exDay: 1 }),
    job('CAC-1034', 'c6', 1, 'welfare', null, 1, 's4', 905, 1210, 'onhire', -10, null, { weeks: 5 }),
    job('CAC-1035', 'c6', 0, 'muck', null, 1, 's2', 320, 390, 'done', -5, 'received'),
    job('CAC-1036', 'c5', 0, 'skip', 8, 1, 's7', 320, 425, 'done', -6, 'received', { t: 4.1, permit: true }),
    job('CAC-1037', 'c3', 0, 'skip', 20, 1, 's13', 410, 545, 'onhire', -4, 'missing'),
    job('CAC-1038', 'c4', 0, 'skip', 6, 1, 's1', 180, 240, 'collection', -2, 'received', { colDay: 1 }),
    job('CAC-1039', 'c2', 0, 'skip', 8, 1, 's3', 210, 280, 'onhire', -6, 'missing'),
    job('CAC-1040', 'c7', 0, 'toilet', null, 2, 's4', 309, 432, 'onhire', -14, null, { weeks: 6 }),
    job('CAC-1041', 'c1', 0, 'skip', 8, 1, 's1', 205, 275, 'onhire', -5, 'received'),
    job('CAC-1042', 'c8', 0, 'skip', 8, 1, 's9', 255, 340, 'confirmed', 1, 'pending'),
    job('CAC-1043', 'c4', 1, 'skip', 12, 1, 's1', 265, 350, 'confirmed', 0, 'pending'),
    job('CAC-1044', 'c9', 0, 'skip', 8, 1, 's10', 245, 325, 'onhire', 0, 'received', { permit: true }),
    job('CAC-1045', 'c2', 1, 'skip', 8, 1, 's3', 210, 280, 'booked', 2, 'pending', { bookedMins: 190 }),
    job('CAC-1046', 'c3', 0, 'sweeper', null, 1, 's6', 208, 260, 'confirmed', 1, null, { hours: 4 }),
    job('CAC-1047', 'c10', 0, 'skip', 8, 1, 's11', 235, 310, 'booked', 1, 'pending', { bookedMins: 52, permit: true }),
    job('CAC-1048', 'c1', 1, 'grab', null, 1, 's2', 275, 340, 'booked', 3, 'pending', { bookedMins: 95 })
  ];
  JOBS.forEach(function (j) { if (j.cust === 'c7' || j.cust === 'c8' || j.cust === 'c9' || j.cust === 'c10') j.owner = 'sam'; });

  var QUOTES = [
    { id: 'Q-2218', cust: 'c3', desc: '20 yard RoRo, Oundle Road', sell: 545, cost: 410, status: 'won', day: -6, job: 'CAC-1037', owner: 'john' },
    { id: 'Q-2221', cust: 'c8', desc: 'Muck away, 4 loads, Erdington', sell: 1700, cost: 1380, status: 'sent', day: -3, owner: 'sam' },
    { id: 'Q-2223', lead: 'l2', desc: '2 x 8 yard skips, monthly account', sell: 560, cost: 410, status: 'sent', day: -2, owner: 'sam' },
    { id: 'Q-2224', cust: 'c6', desc: 'Heras fencing, 60 panels, 12 weeks', sell: 1475, cost: 1093, status: 'sent', day: -1, owner: 'john' },
    { id: 'Q-2225', cust: 'c5', desc: '16 yard skip, Westferry Road', sell: 610, cost: 460, status: 'lost', day: -8, owner: 'john', lostWhy: 'Price, went direct' },
    { id: 'Q-2226', lead: 'l5', desc: 'Grab hire, 2 loads, Cambridge', sell: 690, cost: 550, status: 'draft', day: 0, owner: 'sam' },
    { id: 'Q-2227', cust: 'c9', desc: '8 yard skip, Ancoats', sell: 325, cost: 245, status: 'won', day: -1, job: 'CAC-1044', owner: 'sam' },
    { id: 'Q-2228', cust: 'c7', desc: '2 x 6 yard skips, Wells quay', sell: 480, cost: 360, status: 'sent', day: -4, owner: 'sam' },
    { id: 'Q-2229', cust: 'c2', desc: '8 yard skip, Costessey', sell: 280, cost: 210, status: 'won', day: -1, job: 'CAC-1045', owner: 'john' },
    { id: 'Q-2232', cust: 'c2', desc: '3 x 8 yard skips, Costessey, December', sell: 840, cost: 630, status: 'sent', day: -1, owner: 'john', sup: 's3' },
    { id: 'Q-2230', cust: 'c10', desc: '8 yard skip, Toxteth', sell: 310, cost: 235, status: 'won', day: 0, job: 'CAC-1047', owner: 'sam' }
  ];

  var INVOICES = [
    { id: 'INV-2201', cust: 'c6', amount: 635, issued: -20, due: 10, status: 'paid', paidDay: -4, jobs: ['CAC-1030', 'CAC-1031'] },
    { id: 'INV-2203', cust: 'c5', amount: 425, issued: -6, due: 24, status: 'unpaid', jobs: ['CAC-1036'] },
    { id: 'INV-2204', cust: 'c3', amount: 2340, issued: -42, due: -12, status: 'unpaid', jobs: [] },
    { id: 'INV-2205', cust: 'c4', amount: 365, issued: -15, due: -15, status: 'paid', paidDay: -15, jobs: [] },
    { id: 'INV-2206', cust: 'c6', amount: 1940, issued: -14, due: 16, status: 'unpaid', jobs: ['CAC-1032', 'CAC-1035', 'CAC-1034'] },
    { id: 'INV-2207', cust: 'c2', amount: 1284, issued: -25, due: 5, status: 'unpaid', jobs: [] },
    { id: 'INV-2208', cust: 'c7', amount: 960, issued: -35, due: -5, status: 'unpaid', jobs: [] },
    { id: 'INV-2209', cust: 'c1', amount: 1975, issued: -10, due: 20, status: 'unpaid', jobs: [] },
    { id: 'INV-2210', cust: 'c8', amount: 640, issued: -49, due: -19, status: 'unpaid', jobs: [] },
    { id: 'INV-2211', cust: 'c9', amount: 325, issued: 0, due: 0, status: 'unpaid', jobs: ['CAC-1044'] }
  ];

  var BILLS = [
    { id: 'DL-88412', sup: 's7', job: 'CAC-1036', expected: 320, billed: 355, status: 'query', note: 'Overweight, 4.1 tonnes. Recharge Calder Fit-Out?' },
    { id: 'SS-2291', sup: 's1', job: 'CAC-1041', expected: 205, billed: 205, status: 'matched' },
    { id: 'FR-1180', sup: 's2', job: 'CAC-1035', expected: 320, billed: 320, status: 'matched' },
    { id: 'BW-7734', sup: 's3', job: 'CAC-1031', expected: 210, billed: 210, status: 'matched' },
    { id: 'RM-0417', sup: 's13', job: 'CAC-1037', expected: 410, billed: 410, status: 'matched' }
  ];

  var LEADS = [
    { id: 'l1', company: 'Price and Rowe Builders', contact: 'Hannah Price', area: 'Wisbech PE13', type: 'General builder', source: 'Website', stage: 'new', value: 1800, next: 0, nextWhat: 'Send quote for skips and fencing', last: 0, lastWhat: 'Website enquiry' },
    { id: 'l2', company: 'Brayfield Groundworks', contact: 'Craig Brayfield', area: 'King\'s Lynn PE30', type: 'Groundworks', source: 'LinkedIn', stage: 'quoted', value: 2400, next: 0, nextWhat: 'Follow up Q-2223', last: -2, lastWhat: 'Quote sent' },
    { id: 'l3', company: 'Fennick Homes', contact: 'Laura Fennick', area: 'Norwich NR4', type: 'Developer', source: 'Cold call', stage: 'contacted', value: 4200, next: -2, nextWhat: 'Call back about 3 sites', last: -5, lastWhat: 'Call, asked for price list' },
    { id: 'l4', company: 'Mardle Civils', contact: 'Ian Mardle', area: 'Dereham NR19', type: 'Civils', source: 'Referral', stage: 'trial', value: 3100, next: 2, nextWhat: 'Check first job went well', last: -1, lastWhat: 'First job booked' },
    { id: 'l5', company: 'Quillan Roofing', contact: 'Ben Quillan', area: 'Cambridge CB1', type: 'Roofing', source: 'Website', stage: 'quoted', value: 900, next: 1, nextWhat: 'Send Q-2226', last: 0, lastWhat: 'Quote drafted' },
    { id: 'l6', company: 'Pennant Fit-Out', contact: 'Zoe Pennant', area: 'London SE1', type: 'Fit-out', source: 'LinkedIn', stage: 'contacted', value: 1500, next: 1, nextWhat: 'Send intro pack', last: -3, lastWhat: 'LinkedIn chat' },
    { id: 'l7', company: 'Tarrant and Lowe Landscapes', contact: 'Matt Lowe', area: 'Ely CB7', type: 'Landscaping', source: 'Cold call', stage: 'new', value: 700, next: 0, nextWhat: 'First call', last: null, lastWhat: '' },
    { id: 'l8', company: 'Kelling Developments', contact: 'Nick Kelling', area: 'Holt NR25', type: 'Developer', source: 'Referral', stage: 'won', value: 3800, next: 5, nextWhat: 'Account review', last: -6, lastWhat: 'Account opened' },
    { id: 'l9', company: 'Oakmere Builders', contact: 'Steve Oakes', area: 'Swaffham PE37', type: 'General builder', source: 'Cold call', stage: 'contacted', value: 1100, next: 0, nextWhat: 'Call back after 2pm', last: -1, lastWhat: 'Call, busy' },
    { id: 'l10', company: 'Rendle Groundworks', contact: 'Gary Rendle', area: 'Peterborough PE7', type: 'Groundworks', source: 'LinkedIn', stage: 'new', value: 2600, next: 1, nextWhat: 'Connect and message', last: null, lastWhat: '' },
    { id: 'l11', company: 'Brentmoor Homes', contact: 'Claire Brent', area: 'Bury St Edmunds IP33', type: 'Developer', source: 'Website', stage: 'quoted', value: 3300, next: 1, nextWhat: 'Chase quote', last: -2, lastWhat: 'Quote sent' },
    { id: 'l12', company: 'Sallow Roofing', contact: 'Dean Sallow', area: 'Birmingham B30', type: 'Roofing', source: 'Cold call', stage: 'won', value: 800, next: 7, nextWhat: 'Monthly check in', last: -9, lastWhat: 'First order' }
  ];

  function m(dir, text, mins, extra) { var o = { dir: dir, text: text, mins: mins }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  var THREADS = [
    { id: 't1', party: { type: 'customer', id: 'c1' }, ch: 'wa', unread: true, scn: { kind: 'exchange', job: 'CAC-1041' },
      msgs: [m('out', 'Morning Dan, Saltmarsh are dropping the 8 yarder at Docking Road before 10. Cheers, John', 7210, { by: 'John' }),
             m('in', 'Morning John, can you swap the 8 yarder at Docking Rd tomorrow? its full to the brim', 18)] },
    { id: 't2', party: { type: 'supplier', id: 's1' }, ch: 'email', unread: true, subject: 'Delivered CAC-1043 Heacham', scn: { kind: 'wtn', job: 'CAC-1043' },
      msgs: [m('in', 'Hi John,\n\n12 yard dropped at the Heacham extension at 08:40, on the drive as asked. Waste transfer note attached.\n\nThanks, Sarah\nSaltmarsh Skips', 26, { att: [{ n: 'WTN-CAC-1043.pdf', t: 'wtn' }, { n: 'delivered-heacham.jpg', t: 'photo' }] })] },
    { id: 't3', party: { type: 'lead', id: 'l1' }, ch: 'web', unread: true, subject: 'Get a quote, cacwaste.co.uk', scn: { kind: 'parse', owner: 'sam' },
      form: { 'Your name': 'Hannah Price', Company: 'Price and Rowe Builders', Email: 'hannah@priceandrowe.co.uk', Phone: '07700 900302', 'Site postcode': 'PE13 2RT', 'Service needed': 'Skip Hire', 'Came from': 'Google Ads, skip hire King\'s Lynn' },
      msgs: [m('in', 'Two 12 yard skips and around 40 panels of Heras fencing for a 6 week job starting 1st December. On account if possible.', 34)] },
    { id: 't4', party: { type: 'supplier', id: 's3' }, ch: 'wa', unread: true, scn: { kind: 'reschedule', job: 'CAC-1045' },
      msgs: [m('out', 'Hi Martin, 8yd builders skip for Pellow Homes, Costessey plots NR5 0LY, {WDN:2} AM please. On the drive. Ref CAC-1045. Thanks, John (CAC)', 190, { by: 'John' }),
             m('in', 'John cant do {WDN:2} for Pellow NR5 now, driver off. {WDN:3} first thing ok?', 41)] },
    { id: 't5', party: { type: 'customer', id: 'c5' }, ch: 'wa', unread: true, scn: { kind: 'parse' },
      msgs: [m('in', 'Hi John price for a 6 yard skip E14 8JH this Friday please, will have to go on the road outside', 52)] },
    { id: 't6', party: { type: 'customer', id: 'c2' }, ch: 'email', unread: false, subject: 'Remittance advice INV-2207', scn: { kind: 'paid', inv: 'INV-2207' },
      msgs: [m('in', 'Hello,\n\nPlease find attached remittance for INV-2207, £1,284.00 paid by BACS today.\n\nKind regards\nAccounts, Pellow Homes', 70, { att: [{ n: 'Remittance-INV-2207.pdf', t: 'doc' }] })] },
    { id: 't7', party: { type: 'supplier', id: 's2' }, ch: 'wa', unread: false, scn: { kind: 'confirm', job: 'CAC-1048' },
      msgs: [m('out', 'Hi Lee, grab lorry for Dunmore Groundworks, Lynn Road plots, Snettisham PE31 7PB, {WDN:3} 8am please. Ref CAC-1048. Thanks, John (CAC)', 95, { by: 'John' }),
             m('in', 'Grab booked {WDN:3} 8am for Dunmore at Lynn Rd Snettisham, driver will ring 30 min before', 85)] },
    { id: 't8', party: { type: 'customer', id: 'c6' }, ch: 'email', unread: true, subject: 'WTNs for Plot 4 Histon', scn: { kind: 'pack', site: 0 },
      msgs: [m('in', 'Hi John,\n\nThe client\'s QS wants every waste transfer note for Plot 4 for the last month before they sign off the valuation. Can you send them over today?\n\nCheers, Lee', 110)] },
    { id: 't9', party: { type: 'customer', id: 'c8' }, ch: 'wa', unread: false, scn: { kind: 'parse', owner: 'sam' },
      msgs: [m('in', 'how much for muck away B23 6TR, 3 loads Monday', 150)] },
    { id: 't10', party: { type: 'supplier', id: 's7' }, ch: 'email', unread: false, subject: 'Invoice DL-88412 for CAC-1036', scn: { kind: 'bill', bill: 'DL-88412' },
      msgs: [m('in', 'Invoice attached for the E14 8 yard (your ref CAC-1036). Includes £35.00 overweight, came in at 4.1t.\n\nRay, Docklight Skips', 180, { att: [{ n: 'DL-88412.pdf', t: 'doc' }, { n: 'weighbridge-ticket.jpg', t: 'photo' }] })] },
    { id: 't11', party: { type: 'customer', id: 'c9' }, ch: 'wa', unread: false, scn: { kind: 'none', job: 'CAC-1044' },
      msgs: [m('out', 'Hi Tom, Moorvale are dropping your 8 yarder at Ancoats this morning. Cheers, {BDE} (CAC)', 300, { by: '{BDE}' }),
             m('in', 'cheers mate skips arrived', 220)] },
    { id: 't14', party: { type: 'customer', id: 'c3' }, ch: 'wa', unread: true, scn: { kind: 'parse' },
      msgs: [m('in', 'John need another 20 yard roro at Oundle Rd {WDN:2} please', 64)] },
    { id: 't15', party: { type: 'customer', id: 'c6' }, ch: 'wa', unread: true, scn: { kind: 'parse' },
      msgs: [m('in', 'Lee here. Need a grab at Histon {WDN:1}, 2 loads pls', 0, { yclock: '21:14' }),
             m('out', 'Thanks Lee, got that. The office opens at 8 and John will confirm first thing. If it can\'t wait, ring 0330 122 5711.', 0, { yclock: '21:14', by: 'Auto reply, out of hours', auto: true })] },
    { id: 't12', party: { type: 'customer', id: 'c4' }, ch: 'wa', unread: false, done: true,
      msgs: [m('in', 'Can you collect the 6 yarder at Cliff Parade tomorrow John', 1500),
             m('out', 'No problem Rob, booked with Saltmarsh for tomorrow. Cheers, John', 1490, { by: 'John' })] },
    { id: 't13', party: { type: 'supplier', id: 's13' }, ch: 'wa', unread: false, done: true,
      msgs: [m('out', 'Hi Gav, still need the WTN for CAC-1037 Oundle Road please. Cheers, John (CAC)', 1440, { by: 'Auto chase' })] }
  ];

  var LIVE = [
    { at: 9, party: { type: 'customer', id: 'c2' }, ch: 'wa', text: 'Need an 8 yarder at the Drayton site Tuesday please, on the drive as usual' },
    { at: 26, party: { type: 'customer', id: 'c4' }, ch: 'wa', voice: 9, text: 'John it\'s Rob. Can you get us a grab lorry to the Heacham job {WDN:2} morning, load of muck to go. Cheers' },
    { at: 46, party: { type: 'newlead', company: 'Blake Extensions', contact: 'Jordan Blake', area: 'Hunstanton PE36' }, ch: 'web', subject: 'Get a quote, cacwaste.co.uk',
      form: { 'Your name': 'Jordan Blake', Company: 'Blake Extensions', Email: 'jordan@blakeextensions.co.uk', Phone: '07700 900318', 'Site postcode': 'PE36 5BW', 'Service needed': 'Readymix Concrete', 'Came from': 'cacwaste.co.uk, Readymix page' },
      text: '6m3 of C25 concrete for footings Thursday morning. No pump needed, chute is fine.' },
    { at: 68, party: { type: 'supplier', id: 's11' }, ch: 'wa', text: 'Yes 8yd for Kilner L8 confirmed {WDN:1} AM', scn: { kind: 'confirm', job: 'CAC-1047' } },
    { at: 98, party: { type: 'customer', id: 'c7' }, ch: 'email', subject: 'Welfare and loos for Wells', text: 'Hi John,\n\nCan we get a welfare unit and 2 toilets at the Wells site NR23 for 8 weeks from Monday?\n\nThanks, Gemma' }
  ];

  /* Extras the suppliers billed, or that built up, and nobody has recharged yet. */
  var LEAKS = [
    { id: 'L1', type: 'Overweight', job: 'CAC-1036', cost: 35, recharge: 45, bill: 'DL-88412', note: 'Came in at 4.1 tonnes. On Docklight\'s bill, not on the customer invoice.' },
    { id: 'L2', type: 'Permit', job: 'CAC-1036', cost: 62, recharge: 85, note: 'Council permit paid through Docklight. Not on the customer invoice.' },
    { id: 'L3', type: 'Waiting time', job: 'CAC-1032', cost: 30, recharge: 40, note: 'Grab kept waiting 35 minutes at Plot 4. First 15 are free.' },
    { id: 'L4', type: 'Wasted journey', job: 'CAC-1031', cost: 60, recharge: 75, note: 'Skip blocked in by a van, driver turned away.' },
    { id: 'L5', type: 'Extra hire', job: 'CAC-1026', cost: 50, recharge: 60, note: 'On site past the 14 days included. Brindlecross charge by the week after that.' }
  ];
  var PERMITS = [
    { job: 'CAC-1026', council: 'Birmingham City Council', to: 4, status: 'valid' },
    { job: 'CAC-1044', council: 'Manchester City Council', to: 10, status: 'valid' },
    { job: 'CAC-1047', council: 'Liverpool City Council', to: null, status: 'applied' }
  ];
  var RATECHANGE = { sup: 's3', svc: 'skip', up: 12, fromDay: 8, quotes: ['Q-2232'], status: 'new' };

  var MONTHS = [
    { m: 'Aug', rev: 6200, margin: 1420 }, { m: 'Sep', rev: 18900, margin: 4610 }, { m: 'Oct', rev: 31400, margin: 7930 }, { m: 'Nov', rev: 27800, margin: 7140, mtd: true }
  ];
  var WEEKS = [1120, 1580, 1420, 2210, 2640, 2390, 3080, 3420];

  window.SEED = function () {
    return JSON.parse(JSON.stringify({
      services: SERVICES, suppliers: SUPPLIERS, customers: CUSTOMERS, jobs: JOBS, quotes: QUOTES, invoices: INVOICES, bills: BILLS,
      leads: LEADS, threads: THREADS, live: LIVE, leaks: LEAKS, permits: PERMITS, rateChange: RATECHANGE, months: MONTHS, weeks: WEEKS,
      sam: { calls: [14, 17, 12, 11, 10], callTarget: 100, emails: 38, linkedin: 22, quotes: 7, accounts: 2 },
      counters: { job: 1049, quote: 2233, inv: 2212, thread: 100, lead: 100 },
      saved: { mins: 186, actions: 31 },
      settings: { theme: 'light', live: true, tone: 'friendly', autoChase: true, chaseMins: 30, wtnDays: 2, outOfHours: true, briefing: true },
      liveIdx: 0, events: [], feed: []
    }));
  };
})();
