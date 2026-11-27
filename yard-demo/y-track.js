/* Live tracking (one column per lorry over the map), Suggested runs on the day plan, and the 30 second booking.
   Sample data in this browser only. The lorries move on the demo clock (?at=HH:MM sets it). */
(function () {
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, YC = window.DSGYC, K = window.DSGY && window.DSGY.kit;
    if (!(UI && UI.V && UI.A && CS && CS.S && YC && K && window.DSGNAV)) { if ((tries || 0) < 200) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    var A = UI.A, V = UI.V, ui = UI.ui, ic = window.ic, h = CS.esc, money = CS.money;
    function S() { return CS.S; }
    function Y() { return YC.ensure(CS.S, CS); }
    function q(s) { return document.querySelector(s); }
    var toast = K.toast, plural = K.plural;
    var COL = { L1: '#1F4FA8', L2: '#0E9F6E', L4: '#D97706', L3: '#7C3AED', G1: '#DC2626', G2: '#0891B2' };
    function col(id) { return COL[id] || '#52525B'; }
    function street(j) { var p = String(j.site.name).split(','); var s = p[0].replace(/^\d+\s*/, '').trim(); return s.length > 24 ? s.slice(0, 23) + '.' : s; }

    /* ======================================================================
       LIVE TRACKING: one column per lorry, the map underneath
       ====================================================================== */
    function dayList(id) {
      var y = Y(), L = YC.forLorry(y, id, 0), act = YC.active(L);
      var done = L.filter(function (j) { return j.status === 'done'; }).sort(function (a, b) { return (a.at.done || 0) - (b.at.done || 0); });
      var rest = L.filter(function (j) { return j.status !== 'done' && j !== act; });
      return { done: done, act: act, rest: rest, all: done.concat(act ? [act] : []).concat(rest) };
    }
    function jobStatus(j, d) {
      if (j.status === 'done') return ['Complete ' + CS.clock(j.at.done), 'ok'];
      if (j.status === 'onway') { var m = YC.etaMins(Y(), j) || 10; return ['On the way, ETA ' + CS.clock(Date.now() + m * 60000), 'way']; }
      if (j.status === 'onsite') return [YC.cashState(j) === 'due' ? 'On site, cash to take' : 'On site', 'site'];
      if (d.rest[0] === j && d.act && d.act !== j) return ['Next', 'next'];
      if (d.act === j) return ['Next', 'next'];
      return ['Booked ' + K.winLabel(j), ''];
    }
    V.tracking = function () {
      var y = Y(), sel = ui.y2Sel;
      var cols = YC.LORRIES.map(function (l) {
        var d = dayList(l.id), w = YC.where(y, l.id);
        var rows = d.all.map(function (j) {
          var st = jobStatus(j, d);
          return '<button class="ylt-j ' + st[1] + '" data-act="yJob" data-id="' + j.id + '"><span class="ylt-pc">' + h(j.site.pc) + '</span><span class="ylt-ad">' + h(street(j)) + '</span><span class="ylt-st">' + h(st[0]) + '</span>' + (YC.isCash(j) ? YC.cashTag(j) : '') + '</button>';
        }).join('') || '<p class="ylt-e">No jobs yet. Give it some on the day plan.</p>';
        var now = w.state === 'returning' ? 'Heading back to the yard' : w.state === 'home' ? 'Back at the yard' : '';
        return '<section class="ylt-c' + (sel === l.id ? ' on' : '') + '" style="--lc:' + col(l.id) + '" data-act="y2Col" data-v="' + l.id + '" id="ylt-' + l.id + '"><header><span class="yplate">' + h(l.reg) + '</span><b>' + h(l.driver) + '</b><small>' + d.done.length + ' of ' + d.all.length + ' done' + (now ? ' · ' + now : '') + '</small><i class="ylt-k"></i></header><div class="ylt-l">' + rows + '</div></section>';
      }).join('');
      return '<div class="ybar ytr-bar"><span class="ytr-note">' + ic('map-pin') + '<span>Every lorry, every job, live. Tap a lorry to find it on the map. Positions come from your trackers or the driver app.</span></span><button class="btn pri" data-act="yDrvOpen" id="yDrvOpen">' + ic('mobile') + 'Open the driver app</button></div>' +
        '<div class="ylt-cols" id="yltCols">' + cols + '</div><div class="ylt-map card" id="y2MapSlot"></div>' +
        '<p class="muted yfoot">Sample data: the lorries are simulated on the demo clock. Complete a job in the driver app and it moves to Complete in its column straight away.</p>';
    };
    K.LIVEV.tracking = 1;
    A.y2Col = function (el, e) {
      if (e && e.target.closest && e.target.closest('.ylt-j')) return;
      ui.y2Sel = ui.y2Sel === el.dataset.v ? null : el.dataset.v; UI.render(); ui.y2Fit = true;
    };
    A.yFocus = function (el) { ui.y2Sel = el.dataset.v; ui.y2Fit = true; if (ui.view !== 'tracking') K.go('tracking'); else UI.render(); };
    A.yLorry = A.yFocus;
    A.yTrackJob = function (el) { var j = K.jobById(el.dataset.id); A.close(); ui.y2Sel = j && j.lorry; ui.y2Fit = true; K.go('tracking'); };

    /* the map element is kept between redraws, so it never flickers */
    var BOX = null, M = null, LM = {}, JM = {}, RL = {}, mv = -1;
    function box() { if (!BOX) { BOX = document.createElement('div'); BOX.className = 'ymap y2map'; } return BOX; }
    function routePts(id) {
      var d = dayList(id), y = Y(), pts = [[YC.YARD.lat, YC.YARD.lng]];
      d.all.forEach(function (j) { pts.push([j.lat, j.lng]); }); pts.push([YC.YARD.lat, YC.YARD.lng]); return pts;
    }
    function lorryIcon(l, w, on) {
      var st = w.state === 'onway' ? 'On the way' : w.state === 'onsite' ? 'On site' : w.state === 'returning' ? 'Heading back' : w.state === 'home' ? 'At the yard' : w.state === 'between' ? 'Between jobs' : 'At the yard';
      return '<span class="y2lm' + (on ? ' on' : '') + '" style="--lc:' + col(l.id) + '"><b>' + h(l.reg) + '</b><small>' + h(l.first + ', ' + st) + '</small></span>';
    }
    function draw(force) {
      if (!BOX || !document.body.contains(BOX) || !window.L) return;
      var y = Y(), sel = ui.y2Sel;
      if (!M) {
        M = window.L.map(BOX, { zoomControl: true, scrollWheelZoom: false });
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(M);
        window.L.marker([YC.YARD.lat, YC.YARD.lng], { icon: window.L.divIcon({ className: 'yyard', html: '<span>' + ic('home') + '</span>', iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 500 }).addTo(M).bindTooltip('Our yard', { direction: 'top' });
        var all = [[YC.YARD.lat, YC.YARD.lng]]; YC.today(y).forEach(function (j) { if (j.lorry) all.push([j.lat, j.lng]); });
        M.fitBounds(all, { padding: [24, 24] });
      }
      if (force || mv !== y.v) {
        mv = y.v;
        Object.keys(JM).forEach(function (k) { M.removeLayer(JM[k]); }); JM = {};
        YC.LORRIES.forEach(function (l) {
          var pts = routePts(l.id), on = !sel || sel === l.id;
          if (RL[l.id]) M.removeLayer(RL[l.id]);
          RL[l.id] = window.L.polyline(pts, { color: col(l.id), weight: sel === l.id ? 6 : 3.5, opacity: on ? 0.9 : 0.18, dashArray: sel === l.id ? null : '6 6' }).addTo(M);
          dayList(l.id).all.forEach(function (j, i) {
            var c = j.status === 'done' ? '#16A34A' : j.status === 'onsite' ? '#2563EB' : j.status === 'onway' ? col(l.id) : '#fff';
            JM[j.id] = window.L.circleMarker([j.lat, j.lng], { radius: sel === l.id ? 8 : 6, weight: 3, color: col(l.id), fillColor: c, fillOpacity: 1, opacity: on ? 1 : 0.3 }).addTo(M)
              .bindTooltip(h(l.reg + ': ' + (i + 1) + '. ' + j.site.pc + ' ' + street(j) + ', ' + jobStatus(j, dayList(l.id))[0]) + (YC.isCash(j) ? '<br>' + YC.cashTag(j) : ''), { direction: 'top' });
            JM[j.id].on('click', function () { A.yJob({ dataset: { id: j.id } }); });
          });
        });
      }
      YC.LORRIES.forEach(function (l) {
        var w = YC.where(y, l.id), html = lorryIcon(l, w, sel === l.id);
        if (!LM[l.id]) { LM[l.id] = window.L.marker([w.lat, w.lng], { icon: window.L.divIcon({ className: 'y2lmw', html: html, iconSize: [150, 40], iconAnchor: [16, 20] }), zIndexOffset: 1000 }).addTo(M); LM[l.id]._h = html; LM[l.id].on('click', function () { A.y2Col({ dataset: { v: l.id } }); }); }
        else if (LM[l.id]._h !== html) { LM[l.id]._h = html; LM[l.id].setIcon(window.L.divIcon({ className: 'y2lmw', html: html, iconSize: [150, 40], iconAnchor: [16, 20] })); }
        LM[l.id].setLatLng([w.lat, w.lng]); LM[l.id].setZIndexOffset(sel === l.id ? 2000 : 1000);
      });
      if (ui.y2Fit) { ui.y2Fit = false; if (sel) { var p = routePts(sel), w0 = YC.where(y, sel); p.push([w0.lat, w0.lng]); M.fitBounds(p, { padding: [40, 40], maxZoom: 13 }); } }
    }
    function reattach() {
      var s = q('#y2MapSlot'); if (!s) return; var b = box(); if (b.parentNode !== s) s.appendChild(b);
      setTimeout(function () { if (M) M.invalidateSize(); draw(true); var c = ui.y2Sel && q('#ylt-' + ui.y2Sel); if (c && c.scrollIntoView && window.innerWidth < 900) c.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 30);
    }
    new MutationObserver(reattach).observe(q('#view'), { childList: true });
    setInterval(function () { if (ui.view === 'tracking') draw(false); }, 1000);

    /* ======================================================================
       SUGGESTED RUNS on the day plan
       ====================================================================== */
    function miles(a, b) { var R = 3959, dLa = (b.lat - a.lat) * Math.PI / 180, dLn = (b.lng - a.lng) * Math.PI / 180, x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLn / 2) * Math.sin(dLn / 2); return 2 * R * Math.asin(Math.sqrt(x)) * 1.3; }   /* road miles: straight line plus about a third */
    var YARD = function () { return { lat: YC.YARD.lat, lng: YC.YARD.lng }; };
    function kindOf(j) { return j.type === 'grab' || j.type === 'muck' ? 'grab' : YC.isRoro(j) ? 'roro' : 'skip'; }
    function district(j) { return String(j.site.pc).split(' ')[0]; }
    function tipOf(j) { return (j.stream === 'soil' || j.stream === 'concrete') ? YC.TIPS.soil : YC.TIPS.yard; }
    function legMiles(stops, j0) {
      var m = 0, at = YARD(); stops.forEach(function (j) { m += miles(at, j); at = j; });
      var waste = stops.filter(function (j) { return YC.TYPES[j.type].waste; });
      if (waste.length) { var t = tipOf(waste[waste.length - 1]); m += miles(at, t); at = t; }
      m += miles(at, YARD()); return m;
    }
    function suggest() {
      var y = Y(), un = YC.today(y).filter(function (j) { return !j.lorry && j.status === 'planned'; }), runs = [];
      /* skips: up to 2 empties stacked going out, only 1 full coming back, so an exchange or collection ends the run */
      var sk = un.filter(function (j) { return kindOf(j) === 'skip'; }), used = {};
      sk.sort(function (a, b) { return miles(YARD(), b) - miles(YARD(), a); });
      sk.forEach(function (seed) {
        if (used[seed.id]) return; var run = [seed]; used[seed.id] = 1;
        function out(r) { return r.filter(function (j) { return j.type === 'deliver' || j.type === 'exchange'; }).length; }
        function back(r) { return r.filter(function (j) { return j.type === 'exchange' || j.type === 'collect'; }).length; }
        sk.filter(function (j) { return !used[j.id]; }).sort(function (a, b) { return miles(seed, a) - miles(seed, b); }).forEach(function (j) {
          if (used[j.id] || miles(seed, j) > 4.5) return;
          var t = run.concat([j]); if (out(t) > 2 || back(t) > 1) return; run = t; used[j.id] = 1;
        });
        run.sort(function (a, b) { return (a.type === 'deliver' ? 0 : 1) - (b.type === 'deliver' ? 0 : 1) || miles(YARD(), a) - miles(YARD(), b); });
        runs.push({ k: 'skip', jobs: run });
      });
      un.filter(function (j) { return kindOf(j) === 'roro'; }).forEach(function (j) { runs.push({ k: 'roro', jobs: [j] }); });
      un.filter(function (j) { return kindOf(j) === 'grab'; }).forEach(function (j) { runs.push({ k: 'grab', jobs: [j] }); });
      /* give each run to the lorry of the right kind with the least on */
      var load = {}; YC.LORRIES.forEach(function (l) { load[l.id] = YC.forLorry(y, l.id, 0).filter(function (j) { return j.status !== 'done'; }).length * 60; });
      runs.forEach(function (r) {
        var m = legMiles(r.jobs), loads = r.jobs.reduce(function (a, j) { return a + (j.loads || 1); }, 0);
        r.miles = r.k === 'grab' ? m + (loads - 1) * 2 * miles(r.jobs[0], tipOf(r.jobs[0])) : m;
        r.mins = Math.round(r.miles / 22 * 60 + r.jobs.length * 20 + (r.k === 'grab' ? loads * 25 : r.jobs.some(function (j) { return YC.TYPES[j.type].waste; }) ? 15 : 0) + (r.k === 'skip' ? 15 : 0));
        var fit = YC.LORRIES.filter(function (l) { return l.kind === r.k; }).sort(function (a, b) { return load[a.id] - load[b.id]; })[0];
        r.lorry = fit ? fit.id : null; if (fit) load[fit.id] += r.mins;
        r.why = reason(r);
      });
      return runs.sort(function (a, b) { return String(a.lorry).localeCompare(String(b.lorry)) || b.jobs.length - a.jobs.length; });
    }
    function reason(r) {
      var lo = YC.lorry(r.lorry), reg = lo ? lo.reg : 'a lorry', j0 = r.jobs[0];
      if (r.k === 'grab') { var n = j0.loads || 1; return '1 ' + (j0.type === 'muck' ? 'muckaway' : 'grab') + ' job, ' + plural(n, 'load') + '. A grab lorry tips after every load, at ' + tipOf(j0).n.split(',')[0] + '. One run for ' + reg + '.'; }
      if (r.k === 'roro') return 'A hook lorry carries one container at a time, so this ' + j0.size + ' yard ' + YC.TYPES[j0.type].n.toLowerCase() + ' is a run on its own. One run for ' + reg + '.';
      var c = { deliver: 0, exchange: 0, collect: 0 }; r.jobs.forEach(function (j) { c[j.type]++; });
      var parts = []; if (c.deliver) parts.push(c.deliver === 1 ? 'a delivery' : c.deliver + ' deliveries'); if (c.exchange) parts.push('an exchange'); if (c.collect) parts.push('a collection');
      var txt = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
      var far = 0; r.jobs.forEach(function (a) { r.jobs.forEach(function (b) { far = Math.max(far, miles(a, b)); }); });
      var dists = {}; r.jobs.forEach(function (j) { dists[district(j)] = 1; });
      var where = r.jobs.length > 1 ? ' all within ' + Math.max(1, Math.ceil(far)) + ' mile' + (Math.ceil(far) > 1 ? 's' : '') + ' of ' + Object.keys(dists)[0] : ' in ' + district(j0);
      var tail = c.exchange || c.collect ? ' The full skip comes back last, then the tip.' : c.deliver === 2 ? ' Two empties stacked on the way out.' : '';
      return txt.charAt(0).toUpperCase() + txt.slice(1) + where + '.' + tail + ' One run for ' + reg + '.';
    }
    function runCard(r, i) {
      var lo = YC.lorry(r.lorry);
      return '<div class="card yrun" style="--lc:' + col(r.lorry) + '"><div class="yrun-h"><span class="yplate sm">' + h(lo ? lo.reg : 'No lorry free') + '</span><b>' + h(lo ? lo.driver : '') + '</b><span class="sp"></span><small>' + r.miles.toFixed(0) + ' miles · about ' + (r.mins >= 60 ? Math.floor(r.mins / 60) + 'h ' + (r.mins % 60) + 'm' : r.mins + ' min') + '</small></div>' +
        '<ol class="yrun-l">' + r.jobs.map(function (j) { return '<li><b>' + h(j.site.pc) + '</b><span>' + h(YC.whatShort(j)) + ', ' + h(street(j)) + '</span>' + (YC.isCash(j) ? '<span class="tag ycashjob">Cash job</span>' : '') + '</li>'; }).join('') + (r.jobs.some(function (j) { return YC.TYPES[j.type].waste; }) ? '<li class="tip"><b>Tip</b><span>' + h(tipOf(r.jobs[r.jobs.length - 1]).n) + '</span></li>' : '') + '<li class="tip"><b>Yard</b><span>Back to Lakeside Way</span></li></ol>' +
        '<p class="yrun-why">' + ic('route') + '<span>' + h(r.why) + '</span></p><button class="btn sm' + (lo ? ' pri' : '') + '" data-act="y2UseRun" data-i="' + i + '"' + (lo ? '' : ' disabled') + '>' + ic('check') + 'Use this run</button></div>';
    }
    var plan0 = V.plan;
    V.plan = function () {
      var html = plan0.apply(this, arguments), d = ui.yPlanDay == null ? 0 : ui.yPlanDay;
      if (d !== 0) return html;
      var btn = '<button class="btn" data-act="y2Suggest" id="y2Suggest">' + ic('route') + 'Suggest runs</button>';
      html = html.replace('<span class="sp"></span>', '<span class="sp"></span>' + btn);
      if (ui.y2Runs) {
        var R = ui.y2RunsL = suggest();
        var panel = '<section class="yruns" id="yRuns"><div class="yh-rh"><h3>' + ic('route') + 'Suggested runs</h3><small class="muted">' + (R.length ? plural(R.reduce(function (a, r) { return a + r.jobs.length; }, 0), 'unplanned job') + ' in ' + plural(R.length, 'run') + ', grouped by how close the postcodes are and what each lorry can carry' : 'Nothing unplanned for today') + '</small><span class="sp"></span>' +
          (R.length ? '<button class="btn pri" data-act="y2UsePlan" id="y2UsePlan">' + ic('check') + 'Use this plan</button>' : '') + '<button class="btn" data-act="y2RunsOff">' + ic('x') + 'Hide</button></div>' +
          '<p class="muted yruns-rule">Skip loaders take up to 2 empty skips out but only 1 full one back, so an exchange or collection ends the run with a tip. A hook lorry carries 1 container. A grab lorry tips after every load.</p>' +
          '<div class="yruns-g">' + R.map(runCard).join('') + '</div></section>';
        html = html.replace('<div class="yplan2"', panel + '<div class="yplan2"');
      }
      return html;
    };
    A.y2Suggest = function () { ui.y2Runs = true; UI.render(); var p = q('#yRuns'); if (p && p.scrollIntoView) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    A.y2RunsOff = function () { ui.y2Runs = false; UI.render(); };
    function useRun(r) {
      var lo = YC.lorry(r.lorry); if (!lo) return 0;
      var list = YC.forLorry(Y(), lo.id, 0), last = list.length ? Math.max.apply(null, list.map(function (j) { return j.win[0]; })) : YC.nowMin(), t = Math.max(last + 30, YC.nowMin() + 15);
      r.jobs.forEach(function (j) { if (j.lorry) return; j.lorry = lo.id; j.manual = false; var len = j.win[1] - j.win[0]; j.win = [Math.min(t, 990), Math.min(t, 990) + Math.min(len, 60)]; t += 35; j.log.push({ at: Date.now(), t: 'Given to ' + lo.reg + ', ' + lo.driver + ' (suggested run)' }); });
      return r.jobs.length;
    }
    A.y2UseRun = function (el) { var r = (ui.y2RunsL || [])[+el.dataset.i]; if (!r) return; var n = useRun(r); Y().v++; K.save(); UI.render(); toast(plural(n, 'job') + ' on ' + h(YC.lorry(r.lorry).reg) + '. It shows in live tracking and on ' + h(YC.lorry(r.lorry).first) + '\'s phone now', 'route'); };
    A.y2UsePlan = function () { var n = 0, R = ui.y2RunsL || suggest(); R.forEach(function (r) { n += useRun(r); }); Y().v++; K.save(); ui.y2Runs = false; UI.render(); toast('Plan used: ' + plural(n, 'job') + ' on ' + plural(R.filter(function (r) { return r.lorry; }).map(function (r) { return r.lorry; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length, 'lorry', 'lorries') + '. Live tracking and the drivers\' phones have it', 'route'); };

    /* ======================================================================
       30 SECOND BOOKING: customer, tap the site, what, when, done
       ====================================================================== */
    var STREETS = {
      GU21: ['Anchor Hill, Knaphill', 'Bagshot Road, Knaphill', 'Littlewick Road, Horsell', 'Church Hill, Horsell', 'Arthurs Bridge Road, Woking'], GU22: ['Kingfield Road, Woking', 'Maybury Hill, Woking', 'Pyrford Road, Woking', 'Westfield Avenue, Woking', 'Hook Heath Road, Woking'],
      GU24: ['Lye Road, Brookwood', 'Guildford Road, Bisley', 'Holt Road, West End', 'Bagshot Road, Chobham', 'Station Road, Chobham'], GU23: ['Send Road, Send', 'Linden Road, Send', 'High Street, Ripley', 'Newark Lane, Ripley'],
      KT14: ['Chertsey Road, Byfleet', 'High Road, Byfleet', 'Camphill Road, West Byfleet', 'Old Woking Road, West Byfleet'], KT15: ['Woodham Lane, New Haw', 'Station Road, Addlestone', 'Brighton Road, Addlestone'], KT16: ['Guildford Street, Chertsey', 'London Street, Chertsey'], KT13: ['Queens Road, Weybridge', 'Oatlands Drive, Weybridge']
    };
    function addrs(pc) {
      pc = String(pc || '').toUpperCase().replace(/\s+/g, ' ').trim(); var d = pc.split(' ')[0], L = STREETS[d] || ['High Street', 'Church Road', 'Station Road', 'Park Road'], n = YC.hash(pc);
      return L.slice(0, 4).map(function (s, i) { return (3 + (n + i * 7) % 60) + ' ' + s; });
    }
    function st3() { return ui.y3 || (ui.y3 = fresh3()); }
    function fresh3() { return { cust: '', site: null, npc: '', naddr: '', nname: '', nphone: '', found: null, svc: 'skip', type: 'deliver', size: 8, rsize: 20, loads: 1, stream: 'mixed', place: 'site', permit: true, day: null, time: 'am', at: '10:00', notes: '', price: null, pay: 'invoice', more: false, t0: Date.now() }; }
    function chips(k, v, opts, act) { return '<div class="y3chips">' + opts.map(function (o) { return '<button type="button" class="y3c' + (String(v) === String(o[0]) ? ' on' : '') + '" data-act="' + (act || 'y3Set') + '" data-k="' + k + '" data-v="' + h(o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
    function siteObj(b) { var c = b.cust && b.cust !== 'new' ? CS.cust(b.cust) : null; if (c && b.site !== 'new' && b.site != null) { var s = c.sites[+b.site]; return s ? { name: s.name, pc: s.pc } : null; } if (b.naddr && b.npc) return { name: b.naddr, pc: b.npc.toUpperCase() }; return null; }
    function ready(b) { return !!(b.cust && siteObj(b) && (b.cust !== 'new' || String(b.nname).trim())); }
    function html3() {
      var b = st3(), s = S(), y = Y(), c = b.cust && b.cust !== 'new' ? CS.cust(b.cust) : null, skipish = b.svc === 'skip' || b.svc === 'roro', P = YC.prices(y);
      var custs = s.customers.slice().sort(function (x, z) { return x.name < z.name ? -1 : 1; });
      var o = '<div class="y3">' +
        '<div class="y3-s"><span class="y3-n">1</span><div class="field"><label for="y3Cust">Customer</label><select id="y3Cust" data-y3="cust"><option value="">Pick a customer</option>' + custs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === b.cust ? ' selected' : '') + '>' + h(x.name) + (x.stop ? ' (on stop)' : '') + '</option>'; }).join('') + '<option value="new"' + (b.cust === 'new' ? ' selected' : '') + '>New customer</option></select>' + (b.cust ? K.creditBox(b.cust) : '') + '</div></div>';
      if (b.cust) {
        o += '<div class="y3-s"><span class="y3-n">2</span><div class="field"><label>Site</label>';
        if (c) o += '<div class="y3sites">' + c.sites.map(function (x, i) { return '<button type="button" class="y3site' + (String(b.site) === String(i) ? ' on' : '') + '" data-act="y3Set" data-k="site" data-v="' + i + '"><b>' + h(x.name.split(',')[0]) + '</b><small>' + h(x.name.split(',').slice(1).join(',').trim() + ' ' + x.pc) + '</small></button>'; }).join('') + '<button type="button" class="y3site add' + (b.site === 'new' ? ' on' : '') + '" data-act="y3Set" data-k="site" data-v="new">' + ic('plus') + '<b>New site</b></button></div>';
        if (!c) o += '<div class="ybk2"><div class="field"><label for="y3Name">Name</label><input id="y3Name" data-y3t="nname" value="' + h(b.nname) + '" placeholder="Mrs Jane Smith"></div><div class="field"><label for="y3Phone">Mobile</label><input id="y3Phone" data-y3t="nphone" value="' + h(b.nphone) + '" placeholder="07700 900000"></div></div>';
        if (!c || b.site === 'new') {
          o += '<div class="y3pc"><input id="y3Pc" data-y3t="npc" value="' + h(b.npc) + '" placeholder="Postcode, e.g. GU21 4XR" autocomplete="off" style="text-transform:uppercase"><button type="button" class="btn" data-act="y3Find" id="y3Find">' + ic('search') + 'Find address</button></div>';
          if (b.found) o += '<div class="y3sites">' + b.found.map(function (a) { return '<button type="button" class="y3site' + (b.naddr === a ? ' on' : '') + '" data-act="y3Addr" data-v="' + h(a) + '"><b>' + h(a.split(',')[0]) + '</b><small>' + h((a.split(',')[1] || '').trim() + ' ' + b.npc.toUpperCase()) + '</small></button>'; }).join('') + '</div>';
        }
        o += '</div></div>';
      }
      if (siteObj(b)) {
        o += '<div class="y3-s"><span class="y3-n">3</span><div class="field"><label>What</label>' + chips('svc', b.svc, [['skip', 'Skip'], ['roro', 'RoRo'], ['grab', 'Grab'], ['muck', 'Muckaway']]) +
          (skipish ? chips('type', b.type, [['deliver', 'Deliver'], ['exchange', 'Exchange'], ['collect', 'Collect']]) + (b.svc === 'skip' ? chips('size', b.size, YC.SIZES.map(function (z) { return [z, z + ' yd']; })) : chips('rsize', b.rsize, YC.RORO_SIZES.map(function (z) { return [z, z + ' yd, ' + P.roro[z].incl + ' t incl']; })))
            : chips('loads', b.loads, [[1, '1 load'], [2, '2 loads'], [3, '3 loads'], [4, '4 loads']])) + '</div></div>';
        if (skipish && b.type === 'deliver') o += '<div class="y3-s"><span class="y3-n">' + ic('certificate') + '</span><div class="field"><label>Where does it go?</label>' + chips('place', b.place, [['site', 'On the drive or site'], ['road', 'On the road']]) +
          (b.place === 'road' ? '<label class="ypermit"><input type="checkbox" id="y3Permit"' + (b.permit ? ' checked' : '') + '><span><b>Apply for a council permit</b> adds ' + money(P.permit) + '. Permits take 3 to 5 working days, so the earliest date is ' + h(K.dayLong(YC.nthWorkDay(5))) + '.</span></label>' : '') + '</div></div>';
        var days = K.b2Days(b), day = K.b2Day(b);
        o += '<div class="y3-s"><span class="y3-n">4</span><div class="field"><label>When</label><div class="ydays">' + days.map(function (d) { var n = YC.booked(y, d), cap = YC.cap(d), full = n >= cap; return '<button type="button" data-act="y3Set" data-k="day" data-v="' + d + '" class="' + (d === day ? 'on' : '') + (full ? ' full' : '') + '"' + (full ? ' disabled' : '') + '><b>' + h(K.dayLabel(d)) + '</b><small>' + (full ? 'Full' : n + ' of ' + cap) + '</small><i style="width:' + Math.min(100, Math.round(n / cap * 100)) + '%"></i></button>'; }).join('') + '</div>' +
          chips('time', b.time, YC.isSat(day) ? [['am', 'AM']] : [['am', 'AM'], ['pm', 'PM']]) + '</div></div>';
        o += '<div class="y3-s"><span class="y3-n">' + ic('pound') + '</span><div class="field"><label>Payment</label>' + chips('pay', b.pay, [['invoice', 'Invoice'], ['cash', 'Pay cash on the day']]) +
          '<small class="muted" id="y3Price">' + (b.pay === 'cash' ? h(K.b2CashLine(b)) : h(money(K.b2Price(b))) + ' + VAT from your price list' + (K.b2Permit(b) ? ', permit included' : '')) + '</small></div></div>';
        o += '<details class="y3more"' + (b.more ? ' open' : '') + '><summary>Price, waste type and a note for the driver</summary><div class="ybk2"><div class="field"><label for="y3PriceIn">Price + VAT</label><div class="yprice"><span>£</span><input id="y3PriceIn" data-y3t="price" inputmode="decimal" value="' + h(b.price != null ? b.price : K.b2Price(b)) + '"></div></div>' +
          '<div class="field"><label for="y3Stream">Waste</label><select id="y3Stream" data-y3="stream">' + Object.keys(YC.STREAMS).map(function (k) { return '<option value="' + k + '"' + (k === b.stream ? ' selected' : '') + '>' + h(YC.STREAMS[k].n) + '</option>'; }).join('') + '</select></div></div><div class="field"><label for="y3Notes">Note for the driver</label><input id="y3Notes" data-y3t="notes" value="' + h(b.notes) + '" placeholder="Gate code, where to put it"></div></details>';
      }
      return o + '</div>';
    }
    function foot3() { var b = st3(); return '<span class="y3tm" id="y3Tm"></span><span class="sp"></span><button class="btn" data-act="close">Cancel</button><button class="btn pri lg" data-act="y3Go" id="yBkGo"' + (ready(b) ? '' : ' disabled') + '>' + ic('check') + 'Book it</button>'; }
    function draw3() { var m = q('#layer .y3m'); if (!m) return; var bd = m.querySelector('.mbd'), sc = bd.scrollTop; bd.innerHTML = html3(); m.querySelector('.mft').innerHTML = foot3(); bd.scrollTop = sc; tick3(); }
    function tick3() { var t = q('#y3Tm'), b = ui.y3; if (!t || !b) return; var s = Math.floor((Date.now() - b.t0) / 1000); t.innerHTML = ic('clock') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    setInterval(tick3, 1000);
    A.yBook = function (el) {
      ui.y3 = fresh3(); if (el && el.dataset && el.dataset.c) { ui.y3.cust = el.dataset.c; }
      if (A.closeSide) A.closeSide(); if (A.yWheelClose) A.yWheelClose();
      K.modal(ic('plus') + ' New booking', html3(), foot3(), 'ybkm y3m'); tick3();
    };
    A.yWheelBook = function () { if (A.yWheelClose) A.yWheelClose(); A.yBook(); };
    A.y3Set = function (el) {
      var b = st3(), k = el.dataset.k, v = el.dataset.v;
      b[k] = /^(size|rsize|loads|day)$/.test(k) ? +v : v;
      if (k === 'svc') { b.stream = v === 'skip' || v === 'roro' ? 'mixed' : 'soil'; if (!(v === 'skip' || v === 'roro')) b.place = 'site'; }
      if (k === 'type' && v !== 'deliver') b.place = 'site';
      if (/^(svc|size|rsize|loads|place|type)$/.test(k)) b.price = null;
      if (k === 'site' && v === 'new') { b.npc = ''; b.naddr = ''; b.found = null; }
      draw3(); if (k === 'site' && v === 'new') { var p = q('#y3Pc'); if (p) p.focus(); }
    };
    A.y3Find = function () {
      var b = st3(), p = q('#y3Pc'); b.npc = String((p && p.value) || b.npc).toUpperCase().trim();
      if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(b.npc.replace(/\s+/g, ' '))) { toast('Put a full postcode in, like GU21 4XR', 'alert'); if (p) p.focus(); return; }
      if (b.npc.indexOf(' ') < 0) b.npc = b.npc.slice(0, -3) + ' ' + b.npc.slice(-3);
      b.found = addrs(b.npc); b.naddr = ''; draw3();
    };
    A.y3Addr = function (el) { var b = st3(); b.naddr = el.dataset.v; draw3(); };
    document.addEventListener('change', function (e) {
      var el = e.target; if (!el.closest || !el.closest('.y3m')) return; var b = st3();
      if (el.dataset.y3) { b[el.dataset.y3] = el.value; if (el.dataset.y3 === 'cust') { b.site = el.value && el.value !== 'new' && CS.cust(el.value).sites.length === 1 ? 0 : null; b.found = null; b.naddr = ''; } draw3(); }
      if (el.id === 'y3Permit') { b.permit = el.checked; b.price = null; draw3(); }
    });
    document.addEventListener('input', function (e) {
      var el = e.target; if (!el.dataset || !el.dataset.y3t || !el.closest || !el.closest('.y3m')) return; var b = st3(); b[el.dataset.y3t] = el.value;
      if (el.dataset.y3t === 'price') { var pr = q('#y3Price'); if (pr) pr.textContent = b.pay === 'cash' ? K.b2CashLine(b) : money(parseFloat(el.value) || 0) + ' + VAT'; }
      if (el.dataset.y3t === 'nname') { var g = q('#yBkGo'); if (g) g.disabled = !ready(b); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'y3Pc') { e.preventDefault(); A.y3Find(); } });
    document.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('y3more')) st3().more = e.target.open; }, true);
    A.y3Go = function () {
      var b = st3(), y = Y(), c = b.cust && b.cust !== 'new' ? CS.cust(b.cust) : null, site = siteObj(b); if (!ready(b)) return;
      var J0 = K.b2Job(b), off = K.b2Day(b); if (YC.full(y, off)) { toast('That day is full. Pick another', 'calendar'); return; }
      var win = b.time === 'pm' ? [720, 1020] : [450, 720], p = YC.pos(site.pc), id = 'DSG-' + (y.counters.job++), perm = K.b2Permit(b);
      var j = { id: id, day: off, lorry: null, win: win, type: J0.type, cust: c ? c.id : 'new:' + id, cname: c ? null : String(b.nname).trim(), site: site, lat: p.lat, lng: p.lng, size: J0.size, loads: J0.loads,
        price: parseFloat(String(b.price == null ? '' : b.price).replace(/[^\d.]/g, '')) || K.b2Price(b), incl: YC.inclFor(y, J0), stream: b.stream, place: perm || (b.place === 'road' && J0.type === 'deliver') ? 'road' : 'drive',
        permit: perm ? YC.permitFor(site.pc, id, off, off + 14) : null, status: 'planned', at: {}, photos: [], sig: null, ticket: null, wtn: null, eta: null, notes: b.notes || '', pay: b.pay === 'cash' ? 'cash' : 'invoice',
        log: [{ at: Date.now(), t: 'Booked by ' + K.uName(K.meU()).split(' ')[0] + (b.pay === 'cash' ? ', cash on the day' : '') }], isNew: true, bookedIn: Math.round((Date.now() - b.t0) / 1000) };
      if (c && b.site === 'new') { c.sites.push({ name: site.name, pc: site.pc }); }
      y.jobs.push(j);
      if (perm) { y.permits = y.permits || []; y.permits.unshift({ id: 'PM-' + (600 + y.permits.length), job: id, cust: j.cust, addr: site.name, pc: site.pc, council: YC.councilFor(site.pc), status: 'apply', paidBy: null, price: YC.prices(y).permit, ref: j.permit.ref, from: off, to: off + 14, createdAt: Date.now(), log: [] }); }
      if (b.fromMsg) { var m = (y.inbox || []).filter(function (x) { return x.id === b.fromMsg; })[0]; if (m) { m.done = true; m.doneAt = Date.now(); m.job = id; m.reply = 'Booked in for ' + K.dayName(off) + (b.time === 'pm' ? ' afternoon' : ' morning') + ', ' + YC.whatShort(j) + ' at ' + site.name.split(',')[0] + '. Cheers, Dave'; } }
      y.v++; K.save();
      var s2 = j.bookedIn, tm = Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0');
      var m2 = q('#layer .y3m');
      if (m2) {
        m2.querySelector('.mbd').innerHTML = '<div class="y3done" id="y3Done"><span class="y3tick">' + ic('circle-check') + '</span><h3>Booked in ' + tm + '</h3><p><b>' + h(id) + '</b> · ' + h(YC.what(j)) + '<br>' + h(c ? c.name : j.cname) + ', ' + h(site.name + ', ' + site.pc) + '<br>' + h(K.dayLong(off)) + ', ' + (b.time === 'pm' ? 'afternoon' : 'morning') + (j.pay === 'cash' ? '<br><span class="tag ycashjob">Cash job</span> ' + h(YC.cashLine(j)) : '') + '</p>' +
          '<small class="muted">Confirmation sent to the customer. Give it a lorry on the day plan' + (perm ? '. Permit card made: apply within 30 minutes' : '') + '.</small></div>';
        m2.querySelector('.mft').innerHTML = '<span class="sp"></span><button class="btn" data-act="yBook">' + ic('plus') + 'Book another</button><button class="btn pri" data-act="y3Done">Done</button>';
      }
      ui.yBkDay = 'week'; ui.yBkF = 'all';
    };
    A.y3Done = function () { A.close(); if (ui.view !== 'bookings') K.go('bookings'); else UI.render(); };
    A.yMsgBook = function (el) {
      var m = (Y().inbox || []).filter(function (x) { return x.id === el.dataset.id; })[0]; if (!m) return;
      A.yBook(); var b = st3(); b.t0 = Date.now(); b.cust = m.cust && CS.cust(m.cust) ? m.cust : 'new'; b.site = m.cust && CS.cust(m.cust) ? (m.site || 0) : null;
      if (b.cust === 'new') { b.nname = m.who || ''; b.nphone = m.phone || ''; b.npc = m.pc || ''; b.found = m.pc ? addrs(m.pc) : null; }
      b.svc = m.svc || 'skip'; b.type = m.type || 'deliver'; if (m.size) b.size = m.size; if (m.loads) b.loads = m.loads; b.place = 'site'; b.fromMsg = m.id; b.notes = m.note || ''; draw3();
    };
    window.DSGY3 = { addrs: addrs, suggest: suggest, col: col, street: street };
    if (ui.view === 'tracking' || ui.view === 'plan') UI.render();
  }
  start(0);
})();
