/* Make it yours: the home screen layout, the first time hint and Settings > Appearance.
   The menu editor lives with the rest of the sidebar in ui.js. Everything is kept in
   this browser under wsDemo: keys, and Reset demo clears it. */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;
  var KEY = 'wsDemo:homeLayout', HINT = 'wsDemo:homeHint';

  /* every block on the home screen, in the order it starts in */
  O.HOME_BLOCKS = [
    { id: 'today', name: 'In today', size: 'stat' },
    { id: 'parts', name: 'Waiting on parts', size: 'stat' },
    { id: 'ready', name: 'Ready to invoice', size: 'stat' },
    { id: 'auth', name: 'Needs authorising', size: 'stat' },
    { id: 'pmi', name: 'PMIs due this week', size: 'stat' },
    { id: 'vor', name: 'Off the road', size: 'stat' },
    { id: 'hours', name: 'Hours this month', size: 'stat' },
    { id: 'invoiced', name: 'Invoiced this month', size: 'stat' },
    { id: 'needs', name: 'Needs you', size: 'wide' },
    { id: 'fitters', name: 'The day by fitter', size: 'wide' },
    { id: 'messages', name: 'Last messages out', size: 'half' },
    { id: 'next', name: 'Coming next', size: 'half' }
  ];
  function blockDef(id) {
    for (var i = 0; i < O.HOME_BLOCKS.length; i++) if (O.HOME_BLOCKS[i].id === id) return O.HOME_BLOCKS[i];
    return null;
  }

  O.homeLayout = function () {
    var s = null, order = [], seen = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    ((s && s.order) || []).forEach(function (id) { if (blockDef(id) && !seen[id]) { seen[id] = 1; order.push(id); } });
    O.HOME_BLOCKS.forEach(function (b) { if (!seen[b.id]) order.push(b.id); });
    return { order: order, hidden: ((s && s.hidden) || []).filter(function (id) { return !!blockDef(id); }) };
  };
  function saveHome(l) {
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { }
  }

  O.homeEdit = false;
  function hintSeen() {
    try { return localStorage.getItem(HINT) === '1'; } catch (e) { return true; }
  }
  function markHint() {
    try { localStorage.setItem(HINT, '1'); } catch (e) { }
  }
  O.homeCustomise = function (on) {
    O.homeEdit = !!on;
    O._custIn = !!on;
    if (on) markHint();
    document.body.classList.toggle('homeedit', O.homeEdit);
    O.render();
  };

  var UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  var DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  var SLIDERS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';

  /* office.js hands over the header and one HTML string per block */
  O.homeView = function (title, sub, right, blocks) {
    var l = O.homeLayout(), ed = O.homeEdit;
    var html = '';
    var rightHtml = ed ? '' : '<button class="btn alt cust" id="hCust" aria-label="Customise home" title="Customise home">' + SLIDERS + '<span>Customise</span></button>' + right;
    html += O.head(title, sub, rightHtml);

    if (ed) {
      html += '<div class="custnote">' +
        '<b>Make this screen yours.</b> Drag <span class="g">' + O.ICON.grip + '</span> to move a block, or use the arrows. ' +
        'Tap the eye to hide what you do not need. It saves as you go.</div>';
    } else if (!hintSeen()) {
      html += '<div class="mkhint" id="mkHint"><span class="spark">' + SLIDERS + '</span>' +
        '<span class="tx">Make it yours: drag things where you want them</span>' +
        '<button type="button" class="lnk" id="mkGo">Show me</button>' +
        '<button type="button" class="x" id="mkX" aria-label="Dismiss">&times;</button></div>';
    }

    if (!ed && WS.look('menuStyle') === 'wheel' && O.wheelHtml) html += O.wheelHtml();
    html += '<div class="hblocks' + (ed ? ' edit' : '') + '" id="hBlocks">';
    l.order.forEach(function (id, i) {
      var d = blockDef(id), off = l.hidden.indexOf(id) >= 0;
      if (off && !ed) return;
      var body = blocks[id];
      if (!body) {
        if (!ed) return;
        body = '<div class="card"><div class="ch"><h2>' + esc(d.name) + '</h2></div>' + O.empty('Nothing needs you right now.') + '</div>';
      }
      html += '<div class="hb hb-' + d.size + (off ? ' off' : '') + '" data-hb="' + id + '">';
      if (ed) {
        html += '<div class="hbtools">' +
          '<button type="button" class="grip" aria-label="Drag ' + esc(d.name) + ' to move it">' + O.ICON.grip + '</button>' +
          '<span class="hbn">' + esc(d.name) + '</span>' +
          '<button type="button" class="hbt" data-up="' + id + '" aria-label="Move ' + esc(d.name) + ' up"' + (i === 0 ? ' disabled' : '') + '>' + UP + '</button>' +
          '<button type="button" class="hbt" data-down="' + id + '" aria-label="Move ' + esc(d.name) + ' down"' + (i === l.order.length - 1 ? ' disabled' : '') + '>' + DOWN + '</button>' +
          '<button type="button" class="hbt eye' + (off ? ' is-off' : '') + '" data-eye="' + id + '" aria-pressed="' + off + '" aria-label="' + (off ? 'Show ' : 'Hide ') + esc(d.name) + '">' + (off ? O.ICON.eyeOff : O.ICON.eye) + '</button>' +
          '</div>';
      }
      html += '<div class="hbc"' + (ed ? ' inert' : '') + '>' + body + '</div></div>';
    });
    html += '</div>';
    if (ed) html += '<div class="custbar' + (O._custIn ? ' in' : '') + '" role="toolbar" aria-label="Customise home"><span class="cbt">Customising home</span>' +
      '<button class="btn alt sm" id="hReset">Reset layout</button><button class="btn sm" id="hDone">Done</button></div>';
    return html;
  };

  O.wireHome = function () {
    if (O.wireWheel) O.wireWheel();
    var cust = $('hCust');
    if (cust) cust.onclick = function () { O.homeCustomise(true); };
    var go = $('mkGo');
    if (go) go.onclick = function () { O.homeCustomise(true); };
    var x = $('mkX');
    if (x) x.onclick = function () { markHint(); var h = $('mkHint'); if (h) h.remove(); };
    if (!O.homeEdit) return;
    O._custIn = false;
    document.body.classList.add('homeedit');
    $('hDone').onclick = function () { O.homeCustomise(false); WS.toast('Home screen saved.', 'ok'); };
    $('hReset').onclick = function () {
      try { localStorage.removeItem(KEY); } catch (e) { }
      O.render();
      WS.toast('Home screen put back the way it was.', 'ok');
    };
    var wrap = $('hBlocks');
    function step(id, dir) {
      var l = O.homeLayout(), i = l.order.indexOf(id), j = i + dir;
      if (i < 0 || j < 0 || j >= l.order.length) return;
      l.order.splice(i, 1);
      l.order.splice(j, 0, id);
      saveHome(l);
      O.render();
      var b = document.querySelector('[data-hb="' + id + '"] [data-' + (dir < 0 ? 'up' : 'down') + ']');
      if (b && !b.disabled) b.focus();
    }
    wrap.querySelectorAll('[data-up]').forEach(function (b) { b.onclick = function () { step(b.dataset.up, -1); }; });
    wrap.querySelectorAll('[data-down]').forEach(function (b) { b.onclick = function () { step(b.dataset.down, 1); }; });
    wrap.querySelectorAll('[data-eye]').forEach(function (b) {
      b.onclick = function () {
        var l = O.homeLayout(), id = b.dataset.eye, i = l.hidden.indexOf(id);
        if (i >= 0) l.hidden.splice(i, 1); else l.hidden.push(id);
        saveHome(l);
        O.render();
      };
    });
    O.sortable({
      root: wrap, item: '.hb', handle: '.grip', scroller: null,
      onDrop: function () {
        var l = O.homeLayout();
        l.order = [].map.call(wrap.querySelectorAll('.hb'), function (h) { return h.dataset.hb; });
        saveHome(l);
        O.render();
      }
    });
  };

  /* leaving home ends customising */
  var go0 = O.go;
  O.go = WS.go = function (s) {
    if (O.homeEdit && s !== 'home') { O.homeEdit = false; document.body.classList.remove('homeedit'); }
    return go0(s);
  };

  /* ---------------- Settings > Appearance ---------------- */
  function seg(name, cur, opts) {
    return '<div class="seg" role="radiogroup" data-look="' + name + '">' + opts.map(function (o) {
      return '<button type="button" role="radio" aria-checked="' + (o[0] === cur) + '" data-v="' + o[0] + '"' + (o[0] === cur ? ' class="on"' : '') + '>' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  O.appearanceCard = function () {
    return '<div class="card" id="appearance"><div class="ch"><h2>Appearance</h2></div>' +
      '<div class="hint" style="margin-bottom:14px">How the system looks on this device. It only changes what you see, not anyone else.</div>' +
      '<div class="looks">' +
      '<div class="lk"><div class="lb">Theme</div>' + seg('theme', WS.themePref(), [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Match my device']]) + '</div>' +
      '<div class="lk"><div class="lb">Text size</div>' + seg('textSize', WS.look('textSize'), [['standard', 'Standard'], ['large', 'Large']]) + '</div>' +
      '<div class="lk"><div class="lb">Spacing</div>' + seg('density', WS.look('density'), [['comfortable', 'Comfortable'], ['compact', 'Compact']]) + '</div>' +
      '<div class="lk"><div class="lb">Menu style</div>' + seg('menuStyle', WS.look('menuStyle'), [['sidebar', 'Sidebar'], ['wheel', 'Wheel']]) + '</div>' +
      '</div>' +
      '<div class="lkrow"><div><div class="b">Home screen and menu</div><div class="muted sm">Move things about, hide what you never use, pin your favourites.</div></div>' +
      '<div class="sp"><button type="button" class="btn alt sm" id="apHome">Customise home</button><button type="button" class="btn alt sm" id="apMenu">Edit menu</button></div></div>' +
      '<div class="lkrow" style="margin-top:14px"><div><div class="b">Wheel load in</div><div class="muted sm">The wheel rolls in and its nuts become the menu. Plays once each time the office opens in Wheel style.</div></div>' +
      '<div class="sp"><button type="button" class="btn alt sm" id="apIntro">Play it now</button></div></div>' +
      '</div>';
  };
  O.wireAppearance = function () {
    document.querySelectorAll('[data-look]').forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          var k = g.dataset.look, v = b.dataset.v;
          if (k === 'theme') WS.theme(v); else WS.look(k, v);
          if (k === 'menuStyle') document.body.classList.remove('navopen');
          if (k === 'menuStyle' && v === 'wheel' && O.playIntro) O.playIntro();
          g.querySelectorAll('button').forEach(function (x) {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-checked', String(x === b));
          });
        };
      });
    });
    var pi = $('apIntro');
    if (pi) pi.onclick = function () { if (O.playIntro && !O.playIntro()) WS.toast('Your device is set to reduce motion, so the load in is off.', 'ok'); };
    var h = $('apHome');
    if (h) h.onclick = function () { O.homeEdit = true; O._custIn = true; markHint(); O.go('home'); };
    var m = $('apMenu');
    if (m) m.onclick = function () {
      O.navEdit(true);
      if (window.innerWidth <= 900) document.body.classList.add('navopen');
    };
  };
})();
