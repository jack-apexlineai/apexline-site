/* Personal demo links, like the workshop tour: ?name=Mick%20Hughes&co=Quick%20Skip%20Hire&colour=07236D&logo=quickskips
   name   the person signing in (greeting, owner tile, sign-off on messages)
   co     their company name, used everywhere the sample firm name shows
   colour their brand colour as 6 hex digits, used as the accent
   logo   a key from the whitelist below. A key with no image gets an initials badge in their colour.
          Some keys also move the sample yard, customers and sites to that firm's own patch.
   role   optional job title under their name
   Everything is cleaned before use and kept for this tab only (sessionStorage), so it works with ?at= and page reloads.
   Loaded first on every page. The data stays the same underneath; what is shown on screen is swapped as it is drawn. */
(function () {
  var KEY = 'dsg-brand';
  function clean(v, max) { return String(v == null ? '' : v).replace(/[^A-Za-z0-9À-ɏ .,&'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }

  /* whitelist: logo key -> image in brand/ (empty for initials), patch for the sample data, default role */
  var LOGOS = {
    quickskips: { img: '', geo: 'wlondon', role: 'General Manager', domain: 'quickskiphire.com' }
  };

  var q = new URLSearchParams(location.search), p = null;
  if (q.has('name') || q.has('co') || q.has('colour') || q.has('logo')) {
    var hex = String(q.get('colour') || '').replace(/^#/, '');
    p = {
      name: clean(q.get('name'), 32),
      co: clean(q.get('co'), 48),
      role: clean(q.get('role'), 32),
      colour: /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex.toUpperCase() : '',
      logo: String(q.get('logo') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)
    };
    if (!LOGOS[p.logo]) p.logo = '';
    try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  } else {
    try { p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
  }
  if (!p || !(p.name || p.co || p.colour || p.logo)) { window.DSGBRAND = { on: false }; return; }

  var L = LOGOS[p.logo] || {};
  var co = p.co || '', coBare = co.replace(/\s+(Ltd|Limited|LLP|PLC)\.?$/i, '');
  var coLtd = co ? (/\b(Ltd|Limited|LLP|PLC)\.?$/i.test(co) ? co : co + ' Ltd') : '';
  function initialsOf(s) {
    var w = s.replace(/\b(Ltd|Limited|LLP|PLC)\b\.?/gi, '').replace(/[^A-Za-z0-9À-ɏ ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    var i = w.length > 1 ? w.slice(0, 3).map(function (x) { return x.charAt(0); }).join('') : (w[0] || '').slice(0, 2);
    return i.toUpperCase();
  }
  var ini = initialsOf(coBare) || 'SG';
  var full = p.name || '', first = full.split(' ')[0] || '';
  var last = full.split(' ').slice(1).join(' ');
  var user = first ? (last ? first.charAt(0) + '.' + last.replace(/[^A-Za-z]/g, '') : first.replace(/[^A-Za-z]/g, '')).toLowerCase() : 'd.archer';
  var pIni = full ? (last ? first.charAt(0) + last.charAt(0) : first.slice(0, 2)).toUpperCase() : 'DA';
  var domain = L.domain || (coBare ? coBare.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '') + '.co.uk' : 'demoskipandgrab.co.uk');

  var B = window.DSGBRAND = {
    on: true, name: full, first: first, user: user, role: p.role || L.role || '', co: co, coLtd: coLtd, initials: ini, personInitials: pIni,
    colour: p.colour, logo: p.logo, geo: L.geo || '', domain: domain,
    query: function () { var o = []; ['name', 'co', 'role', 'logo'].forEach(function (k) { if (p[k]) o.push(k + '=' + encodeURIComponent(p[k])); }); if (p.colour) o.push('colour=' + p.colour.slice(1)); return o.join('&'); }
  };

  /* ---------- colours ---------- */
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(c, w, f) { return '#' + c.map(function (v, i) { return ('0' + Math.round(v + (w[i] - v) * f).toString(16)).slice(-2); }).join('').toUpperCase(); }
  function lum(c) { var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  var C = p.colour || '#1F4FA8', c = rgb(C), K = [0, 0, 0], W = [255, 255, 255];
  var light = lum(c) > 0.32 ? mix(c, K, 0.35) : C;   /* a pale colour is darkened so text on white stays readable */
  var lc = rgb(light), dk = C; var f = 0; while (lum(rgb(dk)) < 0.14 && f < 0.9) { f += 0.05; dk = mix(c, W, f); }
  var dc = rgb(dk), ink2 = mix(dc, W, 0.45);
  function a(cc, o) { return 'rgba(' + cc.join(',') + ',' + o + ')'; }
  B.badge = light; B.badgeDark = dk;
  if (p.colour) {
    var css = ':root:root{--brand:' + light + ';--brand-hi:' + mix(lc, K, 0.2) + ';--brand-ink:' + light + ';--brand-l:' + a(lc, 0.09) + ';--brand-m:' + a(lc, 0.26) + ';--amber:' + light + ';--amber-l:' + a(lc, 0.09) + ';--ai:' + light + ';--ai-l:' + a(lc, 0.07) + ';--bubble-out:' + mix(lc, W, 0.9) + ';--blue:' + light + '}' +
      ':root:root[data-theme="dark"]{--brand:' + dk + ';--brand-hi:' + mix(dc, W, 0.15) + ';--brand-ink:' + ink2 + ';--brand-l:' + a(dc, 0.16) + ';--brand-m:' + a(dc, 0.3) + ';--amber:' + ink2 + ';--amber-l:' + a(dc, 0.14) + ';--ai:' + ink2 + ';--ai-l:' + a(dc, 0.12) + ';--bubble-out:' + mix(dc, [24, 24, 26], 0.7) + '}' +
      '.xs .xs-go{background:' + dk + '}.xs .xs-go:hover{background:' + mix(dc, W, 0.15) + '}';
    var st = document.createElement('style'); st.id = 'dsgBrandCss'; st.textContent = css; (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- logo: their whitelisted image, or an initials badge with the name ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function svgUrl(s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }
  var nm = (coBare || 'Skip and Grab').toUpperCase(), tw = Math.min(900, Math.max(260, nm.length * 44));
  function wordmark(inv) {
    var fill = inv ? dk : light, txt = inv ? '#FFFFFF' : '#1A1A1A';
    return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (220 + tw) + ' 200" role="img" aria-label="' + esc(coBare) + '">' +
      '<rect x="10" y="20" width="160" height="160" rx="30" fill="' + fill + '"/>' + (inv ? '<rect x="11.5" y="21.5" width="157" height="157" rx="28.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>' : '') +
      '<text x="90" y="100" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="' + (ini.length > 2 ? 62 : 76) + '" fill="#fff" letter-spacing="1">' + esc(ini) + '</text>' +
      '<text x="200" y="100" dy=".35em" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="64" fill="' + txt + '" textLength="' + tw + '" lengthAdjust="spacingAndGlyphs">' + esc(nm) + '</text></svg>');
  }
  var LOGO = L.img ? 'brand/' + L.img : (co ? wordmark(false) : ''), LOGOI = L.img ? 'brand/' + L.img : (co ? wordmark(true) : '');
  var FAV = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="' + light + '"/><text x="32" y="32" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="' + (ini.length > 2 ? 22 : 28) + '" fill="#fff">' + esc(ini) + '</text></svg>');
  B.logoSrc = LOGO; B.logoInvSrc = LOGOI;

  /* ---------- words: sample firm and owner -> theirs, and Surrey -> their patch ---------- */
  var R = [];
  function rep(from, to) { R.push([typeof from === 'string' ? new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : from, to]); }
  if (co) {
    rep(/Demo Skip (&|and) Grab (Ltd|Limited)/g, coLtd); rep(/Skip (&|and) Grab Demo (Ltd|Limited)/g, coLtd);
    rep(/Demo Skip (&|and) Grab/g, coBare); rep(/Skip (&|and) Grab Demo/g, coBare); rep(/Skip & Grab/g, coBare);
    rep(/demoskipandgrab\.co\.uk/g, domain); rep(/\bDSG-(?=\d)/g, ini + '-');
  }
  if (full) {
    rep('Dave Archer', full); rep('d.archer', user); rep(/\bDave\b/g, first);
    if (p.role || L.role) rep('Managing Director', p.role || L.role);
  }
  var GEO = {
    wlondon: {
      phrases: [
        ['Skip permits in Surrey come from Surrey County Council.', 'Skip permits come from the local council: Hillingdon, Ealing, Hounslow, Slough or Buckinghamshire.'],
        ['Lakeside Way, Old Woking GU22 9JR', 'Trout Road, West Drayton UB7 7SN'], ['Our transfer station, Old Woking', 'Our transfer station, West Drayton'],
        ['Wey Valley Soil Recovery, Send', 'Brackmere Soil Recovery, Iver Heath'], ['Wey Valley Soil Recovery', 'Brackmere Soil Recovery'],
        ['Mole Valley Recycling', 'Fenwold Recycling'], ['Byfleet Landscapes', 'Hartsmere Landscapes'], ['Pyrford Plastering', 'Pellbrook Plastering'],
        ['Hook Heath Driveways', 'Stockmoor Driveways'], ['pyrfordplastering', 'pellbrookplastering'], ['byfleetlandscapes', 'hartsmerelandscapes'], ['hookheathdriveways', 'stockmoordriveways'], ['Hook Heath Road', 'Stockley Road'], ['Linden Road, Send', 'Linden Road, Iver Heath'],
        ['Woking and Surrey', 'West Drayton and West London'], ['Surrey County Council', 'Hillingdon Council'], ['in and around Woking', 'in and around West Drayton'],
        ['Old Woking', 'West Drayton'], ['West Byfleet', 'Harlington'], ['Goldsworth Park', 'Cowley Peachey'], ['St Johns', 'Ickenham'], ['New Haw', 'Perivale'], ['West End', 'Brands Hill']
      ],
      words: { Woking: 'West Drayton', Guildford: 'Ealing', Byfleet: 'Hayes', Pyrford: 'Harmondsworth', Weybridge: 'Hounslow', Addlestone: 'Greenford', Chertsey: 'Heston',
        Knaphill: 'Cowley', Horsell: 'Hillingdon', Ripley: 'Iver', Camberley: 'Slough', Mayford: 'Sipson', Sheerwater: 'Uxbridge', Chobham: 'Langley', Ottershaw: 'Cranford',
        Bisley: 'Poyle', Brookwood: 'Colnbrook', Lightwater: 'Cippenham', Maybury: 'Yiewsley', Bagshot: 'Chalvey', Farnham: 'Hanwell', Kingfield: 'Stockley', Surrey: 'West London' },
      pc: { GU22: 'UB7', GU21: 'UB8', GU23: 'SL0', GU24: 'SL3', GU18: 'SL1', GU19: 'SL1', GU15: 'SL2', GU1: 'W5', GU2: 'W13', GU9: 'W7', KT14: 'UB3', KT13: 'TW3', KT15: 'UB6', KT16: 'TW5' },
      council: { UB7: 'Hillingdon Council', UB8: 'Hillingdon Council', UB3: 'Hillingdon Council', SL0: 'Buckinghamshire Council', SL3: 'Slough Borough Council', SL1: 'Slough Borough Council', SL2: 'Slough Borough Council', W5: 'Ealing Council', W13: 'Ealing Council', W7: 'Ealing Council', UB6: 'Ealing Council', TW3: 'Hounslow Council', TW5: 'Hounslow Council' },
      yard: { lat: 51.5122, lng: -0.4748 }, soil: { lat: 51.5300, lng: -0.5120 },
      /* map positions for the sample sites, keyed by the sample postcode underneath */
      pos: { 'GU21 2RX': [51.5290, -0.4800], 'KT14 6EX': [51.4885, -0.4330], 'GU21 4XR': [51.5345, -0.4500], 'GU24 0RT': [51.4845, -0.5230], 'KT14 7QZ': [51.5085, -0.4190],
        'GU22 7HT': [51.5070, -0.4700], 'GU21 4JX': [51.5370, -0.4560], 'KT13 8RS': [51.4685, -0.3630], 'GU24 8TJ': [51.5045, -0.5470], 'GU18 5QW': [51.5130, -0.6280],
        'GU21 5QB': [51.5450, -0.4830], 'GU22 8QN': [51.4885, -0.4790], 'KT16 0SD': [51.4880, -0.4110], 'KT15 1EX': [51.5290, -0.3560], 'GU21 3NN': [51.5230, -0.4830],
        'GU15 3HN': [51.5160, -0.5930], 'GU23 6AR': [51.5200, -0.5070], 'GU1 3JT': [51.5130, -0.3040], 'GU22 8LT': [51.5160, -0.4710], 'GU24 9QA': [51.4740, -0.5150],
        'KT15 3JP': [51.5370, -0.3230], 'KT16 9PH': [51.4840, -0.3800], 'GU19 5AA': [51.5050, -0.6060], 'GU21 7AA': [51.5610, -0.4440], 'GU22 0EF': [51.4880, -0.4560],
        'GU24 9PS': [51.4880, -0.5330], 'GU23 7JB': [51.5290, -0.5160], 'GU22 7XQ': [51.5035, -0.4660], 'GU2': [51.5130, -0.3200], 'GU9': [51.5090, -0.3380] }
    }
  };
  var G = GEO[B.geo];
  if (G) {
    G.phrases.forEach(function (x) { rep(x[0], x[1]); });
    Object.keys(G.words).forEach(function (k) { rep(new RegExp('\\b' + k + '\\b', 'g'), G.words[k]); });
    rep(/\b(GU|KT)(\d{1,2})\b(?! ?[A-Z]{3}\b)/g, function (m) { return G.pc[m] || m; });
    B.mapPc = function (pc) { var d = String(pc || '').split(' ')[0]; return G.pc[d] ? G.pc[d] + String(pc).slice(d.length) : pc; };
    B.councilFor = function (pc) { var d = B.mapPc(pc).split(' ')[0]; return G.council[d] || 'Hillingdon Council'; };
  }
  function swap(s) { if (!s) return s; for (var i = 0; i < R.length; i++) { R[i][0].lastIndex = 0; if (R[i][0].test(s)) { R[i][0].lastIndex = 0; s = s.replace(R[i][0], R[i][1]); } } return s; }
  B.swap = swap;

  /* the yard data hook, called at the end of yard-core.js: positions and councils for the moved patch */
  B.yardCore = function (YC) {
    if (!G) return;
    YC.YARD.lat = G.yard.lat; YC.YARD.lng = G.yard.lng;
    if (YC.TIPS) { if (YC.TIPS.yard) { YC.TIPS.yard.lat = G.yard.lat; YC.TIPS.yard.lng = G.yard.lng; } if (YC.TIPS.soil) { YC.TIPS.soil.lat = G.soil.lat; YC.TIPS.soil.lng = G.soil.lng; } }
    var old = YC.pos;
    YC.pos = function (pc) { var q2 = G.pos[pc] || G.pos[String(pc || '').split(' ')[0]]; return q2 ? { lat: q2[0], lng: q2[1] } : old(pc); };
    YC.councilFor = B.councilFor;
  };

  /* ---------- apply to the page as it is drawn ---------- */
  var ATTR = ['alt', 'title', 'aria-label', 'placeholder'];
  function fixEl(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === 'IMG') {
      var src = el.getAttribute('src') || '';
      if (/brand\/logo-inverted\.svg/.test(src) && LOGOI) el.setAttribute('src', LOGOI);
      else if (/brand\/logo\.svg/.test(src) && LOGO) el.setAttribute('src', LOGO);
    }
    if (el.tagName === 'A') {
      var hr = el.getAttribute('href') || '';
      if (/^(driver|portal|phone|join)\.html/.test(hr) && !/[?&](name|co|logo|colour)=/.test(hr)) el.setAttribute('href', hr + (hr.indexOf('?') < 0 ? '?' : '&') + B.query());
    }
    for (var i = 0; i < ATTR.length; i++) { var v = el.getAttribute(ATTR[i]); if (v) { var nv = swap(v); if (nv !== v) el.setAttribute(ATTR[i], nv); } }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el !== document.activeElement && el.type !== 'password') {
      if (el.value && el.value === el.defaultValue) { var nv2 = swap(el.value); if (nv2 !== el.value) { el.value = nv2; el.defaultValue = nv2; } }
    }
    if (full && el.classList && el.classList.contains('av') && el.textContent === 'DA') el.textContent = pIni;
  }
  function fixText(n) { var v = n.nodeValue; if (!v || v.length < 2) return;
    if (full && v === 'DA' && n.parentNode && n.parentNode.classList && n.parentNode.classList.contains('av')) { n.nodeValue = pIni; return; } var nv = swap(v); if (nv !== v) n.nodeValue = nv; }
  function walk(root) {
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return; fixEl(root); }
    var tw2 = document.createTreeWalker(root, 5, null), n;   /* elements and text */
    while ((n = tw2.nextNode())) {
      if (n.nodeType === 3) { var pe = n.parentNode; if (pe && (pe.tagName === 'SCRIPT' || pe.tagName === 'STYLE')) continue; fixText(n); }
      else fixEl(n);
    }
  }
  function fixHead() {
    var t = swap(document.title); if (t !== document.title) document.title = t;
    var ic = document.querySelector('link[rel="icon"]'); if (ic && co && ic.getAttribute('href') !== FAV && !L.img) ic.setAttribute('href', FAV);
  }
  B.apply = function (root) { walk(root || document.body); fixHead(); };
  /* values put into form boxes by code (a regular's name from their reg, a drafted email) have no event to watch, so they are checked after each tap and key */
  var sweepT = 0;
  function sweep() { sweepT = 0; var els = document.querySelectorAll('input:not([type]),input[type="text"],input[type="search"],textarea'); for (var i = 0; i < els.length; i++) { var e = els[i]; if (e === document.activeElement || !e.value) continue; var nv = swap(e.value); if (nv !== e.value) e.value = nv; } }
  function later() { if (!sweepT) sweepT = setTimeout(sweep, 30); }
  function start() {
    fixHead(); walk(document.body);
    ['click', 'input', 'change', 'keyup'].forEach(function (ev) { document.addEventListener(ev, later, true); });
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') fixText(m.target);
        else if (m.type === 'attributes') fixEl(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'href', 'alt', 'title', 'aria-label', 'placeholder'] });
    var tt = document.querySelector('title'); if (tt) new MutationObserver(fixHead).observe(tt, { childList: true, characterData: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
