/* Registration lookup, preview. Type a reg on Book a vehicle in and the lorry fills itself.
   In the demo: a reg already in the fleet is found at once; any other UK reg gets sample
   details (the year comes from the plate itself, the rest is sample). On the real system
   this calls the DVLA Vehicle Enquiry Service and the DVSA MOT history API, both free. */
(function () {
  var esc = WS.esc;
  WS.normReg = function (s) {
    var r = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[A-Z]{2}\d{2}[A-Z]{3}$/.test(r) ? r.slice(0, 4) + ' ' + r.slice(4) : r;
  };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* the age identifier: 18 = Mar 2018, 68 = Sep 2018 */
  function plateDate(reg) {
    var m = /^[A-Z]{2}(\d{2}) [A-Z]{3}$/.exec(reg);
    if (!m) return null;
    var n = +m[1];
    if (n === 0 || n === 50) return null;
    return n < 50 ? { y: 2000 + n, m: 2 } : { y: 1950 + n, m: 8 };
  }
  WS.regLookup = function (input) {
    var reg = WS.normReg(input);
    if (reg.length < 2) return null;
    var key = reg.replace(/\s/g, '');
    var mine = WS.state.vehicles.filter(function (v) { return v.reg.replace(/\s/g, '') === key; })[0];
    var h = hash(key), pd = plateDate(reg);
    var makes = [['DAF', 'CF 26t'], ['Scania', 'P280'], ['Volvo', 'FE 26t'], ['Mercedes-Benz', 'Arocs 2633'], ['MAN', 'TGS 26.320'], ['Iveco', 'Eurocargo']];
    var colours = ['White', 'Blue', 'Red', 'Green', 'Yellow', 'Silver'];
    var mk = mine ? [mine.make, mine.model] : makes[h % makes.length];
    var yr = pd ? pd.y : (mine && mine.year) || 2017 + (h % 6);
    var first = pd ? MON[pd.m] + ' ' + pd.y : String(yr);
    var today = WS.parse(WS.day(0));
    var due = mine && mine.annualTest ? mine.annualTest : WS.day(40 + (h % 200));
    var dueD = WS.parse(due);
    var age = Math.max(1, today.getFullYear() - yr), odo = mine && mine.odometer ? mine.odometer : age * (48000 + (h % 22000));
    var tests = [];
    for (var i = 0; i < 3; i++) {
      var t = new Date(dueD.getFullYear() - 1 - i, dueD.getMonth(), Math.max(1, dueD.getDate() - 3 - (h >>> (i + 3)) % 9));
      if (t.getFullYear() <= yr) break;
      var res = (h >>> (i * 4)) % 7 === 0 ? 'Pass after rectification' : 'Pass';
      tests.push({ date: WS.iso(t), result: res, km: Math.max(0, Math.round((odo - (i + 1) * (odo / (age + 1))) / 100) * 100),
        note: res === 'Pass' ? '' : ['Nearside brake imbalance, rectified at test', 'Headlamp aim, rectified at test', 'Exhaust leak, rectified at test'][h % 3] });
    }
    return {
      reg: reg, inFleet: !!mine, vehicle: mine || null,
      make: mk[0], model: mk[1], colour: colours[(h >>> 5) % colours.length], first: first, year: yr,
      fuel: 'Diesel', weight: (function () { var t = /(\d+)t\b/.exec((mine || {}).type || ''); return t ? +t[1] * 1000 : [18000, 26000, 32000][h % 3]; })(),
      tax: 'Taxed', taxDue: WS.day(30 + (h % 300)), testDue: due, odo: odo, tests: tests,
      operator: mine ? WS.operator(mine.operatorId) : null, nextPmi: mine ? mine.nextPmi : ''
    };
  };
  WS.regLookupHtml = function (r) {
    var row = function (k, v) { return '<div class="rl-k">' + esc(k) + '</div><div class="rl-v">' + v + '</div>'; };
    return '<div class="reglook" data-reg="' + esc(r.reg) + '">' +
      '<div class="rl-h"><span class="rl-plate">' + esc(r.reg) + '</span>' +
      '<div style="min-width:0"><b>' + esc(r.make + ' ' + r.model) + '</b><div class="muted sm">' +
      (r.inFleet ? 'Already in your fleet' + (r.operator ? ', ' + esc(r.operator.name) : '') : 'Not in your fleet yet') + '</div></div>' +
      '<span class="pill ok rl-src">Sample details</span></div>' +
      '<div class="rl-g">' +
      row('Colour', esc(r.colour)) + row('First registered', esc(r.first)) + row('Fuel', esc(r.fuel)) +
      row('Gross weight', r.weight.toLocaleString('en-GB') + ' kg') +
      row('Road tax', esc(r.tax + ' until ' + WS.dateUK(r.taxDue))) +
      row('Annual test', '<b>Valid until ' + esc(WS.dateUK(r.testDue)) + '</b>') +
      (r.nextPmi ? row('Next PMI', esc(WS.dateUK(r.nextPmi))) : '') +
      '</div>' +
      (r.tests.length ? '<div class="rl-l">Test history</div><ul class="rl-t">' + r.tests.map(function (t) {
        return '<li><span class="pill ' + (t.result === 'Pass' ? 'ok' : 'warn') + '">' + esc(t.result) + '</span>' +
          '<span>' + esc(WS.dateUK(t.date)) + '</span><span class="muted">' + t.km.toLocaleString('en-GB') + ' km</span>' +
          (t.note ? '<div class="muted sm" style="flex-basis:100%">' + esc(t.note) + '</div>' : '') + '</li>';
      }).join('') + '</ul>' : '') +
      '<div class="rl-note">Sample details for the demo.</div>' +
      '</div>';
  };
})();
