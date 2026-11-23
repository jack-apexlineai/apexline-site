/* The demo always shows UK time, whatever clock this laptop is on. On a machine set to UK time this file does nothing.
   Rehearsing only: add ?at=14:00 to the address and the demo starts at that UK time today. It stays that way in that tab. */
(function () {
  var R = Date, shift = 0;
  try {
    var n = new R(), o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(n).forEach(function (x) { o[x.type] = +x.value; });
    var wall = new R(o.year, o.month - 1, o.day, o.hour, o.minute, o.second);
    shift = Math.round((wall.getTime() - n.getTime()) / 60000) * 60000;
    var at = '', set = 0;
    try {
      at = new URLSearchParams(location.search).get('at') || '';
      if (/^\d\d?:\d\d$/.test(at)) { set = R.now(); sessionStorage.setItem('cac-at', at + '|' + set); }
      else { var sv = (sessionStorage.getItem('cac-at') || '').split('|'); at = sv[0] || ''; set = +sv[1] || 0; }
    } catch (e1) {}
    var m = /^(\d\d?):(\d\d)$/.exec(at);
    if (m && set && +m[1] < 24 && +m[2] < 60) shift = new R(o.year, o.month - 1, o.day, +m[1], +m[2], 0).getTime() - set;
  } catch (e) { shift = 0; }
  if (!shift) return;
  class UKDate extends R {
    constructor() { if (arguments.length === 0) super(R.now() + shift); else super(...arguments); }
    static now() { return R.now() + shift; }
  }
  window.Date = UKDate;
  window.CACCLOCK = { shift: shift };
})();
