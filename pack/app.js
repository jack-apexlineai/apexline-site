/* Candidate Pack recruiter app. Vanilla JS, hash routes, Supabase for data, one edge function for AI and email. */
(function () {
  'use strict';
  var CFG = window.PACK_CFG;
  var sb = window.supabase.createClient(CFG.url, CFG.anon, { auth: { persistSession: true, storageKey: 'cp-auth', autoRefreshToken: true } });
  var esc = PackDoc.esc;
  var root = document.getElementById('root');
  var S = { me: null, agency: null, timers: [], deferredInstall: null };

  // ---------- icons ----------
  function svg(p, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + p + '</svg>'; }
  var I = {
    today: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
    packs: svg('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    bank: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.2.2 3.8 1.8 4.5 4.8"/>'),
    briefs: svg('<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12.5h18"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    brief: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
    cv: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.6 3.6-5.5 7-5.5s6 1.9 7 5.5"/><path d="M19 3v5M16.5 5.5h5"/>'),
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    wa: svg('<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 10c0 3 2 5 5 5l1-1.4-2-1-1 .9c-1-.4-1.6-1-2-2l.9-1-1-2z" fill="currentColor" stroke="none"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    send: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    print: svg('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    card: svg('<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M9 7h6M9 11h6M9 15h3"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>', ' stroke-width="3"'),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
    shield: svg('<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    warn: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>'),
    chase: svg('<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>'),
    file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    out: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    dl: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    chart: svg('<path d="M3 20h18"/><rect x="5" y="11" width="3.2" height="6.5" rx="1"/><rect x="10.4" y="6" width="3.2" height="11.5" rx="1"/><rect x="15.8" y="9" width="3.2" height="8.5" rx="1"/>'),
    pound: svg('<path d="M17 19H7c1.6-1 2.4-2.6 2.4-4.6V8.8A3.8 3.8 0 0 1 13.2 5c1.6 0 2.9.8 3.5 2"/><path d="M6.5 12.5h7.5"/>'),
    trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  };

  // ---------- small helpers ----------
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function initials(n) { return String(n || '?').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).slice(0, 2).join('').toUpperCase() || '?'; }
  function first(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function ago(t) {
    if (!t) return '';
    var s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 0) return inTime(t);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: s > 86400 * 300 ? 'numeric' : undefined });
  }
  function inTime(t) {
    var d = new Date(t), now = new Date();
    var hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'today ' + hm;
    var tm = new Date(now); tm.setDate(now.getDate() + 1);
    if (d.toDateString() === tm.toDateString()) return 'tomorrow ' + hm;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + hm;
  }
  function gbp(n) { return '£' + Math.round(Number(n) || 0).toLocaleString('en-GB'); }
  function dLong(d) { return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function dShort(d) { return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function when(t) { return t ? new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function telHref(n) { return 'tel:' + String(n || '').replace(/[^\d+]/g, ''); }
  function waHref(n, text) {
    var d = String(n || '').replace(/\D/g, '');
    if (d.indexOf('0') === 0) d = '44' + d.slice(1);
    return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  function packLink(token) { return new URL('v/?t=' + token, location.href.split('#')[0]).href; }
  function debounce(f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; }
  function agencyOk(a) {
    if (!a || a.status === 'locked') return false;
    if (a.paid_until && new Date(a.paid_until + 'T23:59:59') < new Date()) return false;
    return true;
  }
  function isDemo() { return S.agency && (S.agency.plan === 'demo' || S.agency.slug === 'northbridge-search'); }
  function retentionDue(c) {
    var m = (S.agency && S.agency.retention_months) || 24;
    var lim = new Date(); lim.setMonth(lim.getMonth() - m);
    return new Date(c.last_contacted_at) < lim;
  }

  // Errors in plain words, with what to do next. Technical messages never reach the recruiter.
  function friendly(m) {
    m = String(m || '');
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'No connection. Check your signal or Wi-Fi, then try again.';
    if (/jwt|token.*expired|log in again|not authenticated/i.test(m)) return 'Your login has timed out. Log in again and carry on.';
    if (/row-level security|violates.*policy|permission denied|not allowed|403/i.test(m)) return 'Your login cannot do that. Ask your account owner.';
    if (/mime|file type|payload too large|exceeded the maximum/i.test(m)) return 'That file cannot be used. Use a PNG, JPG, SVG or WebP under 2MB.';
    if (/duplicate key|already exists/i.test(m)) return 'That already exists. Check the list and try again.';
    if (/^something went wrong/i.test(m) || /internal|unexpected|status of 5\d\d/i.test(m)) return 'That did not work this time. Wait a minute and try again. If it keeps happening, WhatsApp ApexLine on 07949 088642.';
    return m;
  }
  var toastT;
  function toast(msg, err, action) {
    var el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = err ? friendly(msg) : msg;
    if (action) {
      var b = document.createElement('button'); b.className = 'tact'; b.type = 'button'; b.textContent = action.label;
      b.onclick = function () { el.className = 'toast'; clearTimeout(toastT); action.run(); };
      el.appendChild(b);
    }
    el.className = 'toast on' + (err ? ' err' : '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.className = 'toast' + (err ? ' err' : ''); }, err ? 6500 : action ? 6000 : 3200);
  }
  // One-sentence help, only where something is genuinely not obvious.
  function qhint(text) { return '<button class="qhint" type="button" aria-label="What is this?" data-hint="' + esc(text) + '">?</button>'; }
  document.addEventListener('click', function (e) {
    var q = e.target.closest && e.target.closest('[data-hint]');
    var open = $('.hintpop');
    if (open) open.parentNode.removeChild(open);
    if (!q || (open && open._for === q)) return;
    e.preventDefault(); e.stopPropagation();
    var pop = document.createElement('div'); pop.className = 'hintpop'; pop.setAttribute('role', 'tooltip'); pop.textContent = q.getAttribute('data-hint'); pop._for = q;
    document.body.appendChild(pop);
    var r = q.getBoundingClientRect(), w = Math.min(280, window.innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }, true);
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  // A satisfying tick when a pack is built or sent. Never blocks a tap.
  function tickPop(label) {
    var el = document.createElement('div'); el.className = 'tickpop'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="tp-in"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg><span>' + esc(label) + '</span></div>';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduced() ? 900 : 1500);
  }
  // A little confetti burst for a placement. Pointer events off, gone in under 2 seconds.
  function confetti() {
    if (reduced()) return;
    var box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    var cols = [getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#C8102E', '#0E1014', '#F2B705', '#16794A', '#1D5FD1', '#FF6B81'];
    var h = '';
    for (var i = 0; i < 70; i++) {
      var x = (Math.random() * 2 - 1) * 46, y = -(40 + Math.random() * 50), r = Math.round(Math.random() * 720 - 360);
      h += '<i style="--x:' + x.toFixed(1) + 'vw;--y:' + y.toFixed(1) + 'vh;--r:' + r + 'deg;--d:' + (0.9 + Math.random() * 0.8).toFixed(2) + 's;background:' + cols[i % cols.length] + ';' + (i % 3 ? '' : 'border-radius:50%;') + '"></i>';
    }
    box.innerHTML = h;
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 2000);
  }

  async function fn(action, body) {
    var s = (await sb.auth.getSession()).data.session;
    var r = await fetch(CFG.fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (s ? s.access_token : CFG.anon) },
      body: JSON.stringify(Object.assign({ action: action }, body || {}))
    });
    var j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) {
      if (r.status === 402) { S.agency.status = 'locked'; renderPaused(); }
      throw new Error(friendly(j.error || 'Something went wrong. Please try again.'));
    }
    return j;
  }
  function must(res) { if (res.error) throw new Error(res.error.message); return res.data; }

  // ---------- thinking overlay (Claude Code style words) ----------
  var GLYPHS = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
  function think(words, sub, safe) {
    var el = document.createElement('div');
    el.className = 'thinking';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="orb"><i></i><i></i><div class="glyph">' + GLYPHS[0] + '</div></div><div class="word"><span>' + esc(words[0]) + '</span></div><div class="dots"><b></b><b></b><b></b></div>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + (safe ? '<div class="safe">' + I.shield.replace('<svg', '<svg width="15" height="15"') + 'Scored on skills and experience only</div>' : '');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
    var g = 0, step = 0, tick = 0, wt = null, alive = true;
    var gt = setInterval(function () { g = (g + 1) % GLYPHS.length; var gl = $('.glyph', el); if (gl) gl.textContent = GLYPHS[g]; }, 130);
    // Every third word is a step line, so people still know what is happening. The rest come from the fun pool.
    function next() {
      tick++;
      if (tick % 3 === 0 && step < words.length - 1) { step++; return words[step]; }
      return funWord();
    }
    function swap() {
      if (!alive) return;
      var box = $('.word', el);
      var old = $('span', box);
      var nw = document.createElement('span');
      nw.className = 'in';
      nw.textContent = next();
      box.appendChild(nw);
      requestAnimationFrame(function () { requestAnimationFrame(function () { nw.className = ''; if (old) old.className = 'out'; }); });
      setTimeout(function () { if (old && old.parentNode) old.parentNode.removeChild(old); }, 500);
      wt = setTimeout(swap, 1500 + Math.random() * 1000);
    }
    wt = setTimeout(swap, 1500 + Math.random() * 1000);
    return {
      stop: function () {
        alive = false; clearInterval(gt); clearTimeout(wt);
        el.classList.remove('on');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
      }
    };
  }
  // Step lines say what is really happening; they are mixed in with the fun pool below.
  var WORDS = {
    brief: ['Reading the brief...', 'Pulling out the must haves...', 'Searching your candidates...', 'Ranking the shortlist...', 'Nearly there...'],
    cv: ['Reading the CV...', 'Hiding personal details...', 'Filing the candidate...', 'Checking your open briefs...', 'Nearly there...'],
    pack: ['Reading the CV and notes...', 'Matching against the brief...', 'Writing it up...', 'Finding your voice...', 'Nearly there...'],
    regen: ['Rewriting...', 'Polishing...', 'Nearly there...'],
    sample: ['Reading the sample brief...', 'Searching your candidates...', 'Reading the sample CV...', 'Hiding personal details...', 'Matching it to the brief...', 'Nearly there...']
  };
  var FUN = ['Ruminating', 'Cooking', 'Generating', 'Imagining', 'Conjuring', 'Percolating', 'Noodling', 'Marinating', 'Brewing', 'Scheming', 'Pondering',
    'Crafting', 'Simmering', 'Wrangling', 'Untangling', 'Polishing', 'Sharpening the pencil', 'Reading between the lines', 'Sniffing out the best fit',
    'Doing the boring bit for you', 'Putting the kettle on', 'Making you look good', 'Mulling it over', 'Joining the dots', 'Weighing the evidence',
    'Tidying the commas', 'Buffing the shine', 'Lining things up', 'Checking twice', 'Finding the good bits', 'Smoothing the edges', 'Rolling up the sleeves',
    'Thinking it through', 'Shuffling the shortlist', 'Picking the right words', 'Getting the facts straight', 'Cutting the waffle', 'Straightening the tie',
    'Adding a bit of polish', 'Cross-checking', 'Assembling', 'Fine tuning', 'Distilling', 'Sifting', 'Warming up the printer'];
  var funBag = [];
  // Random order, and no repeats until the whole pool has been used.
  function funWord() {
    if (!funBag.length) {
      funBag = FUN.slice();
      for (var i = funBag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = funBag[i]; funBag[i] = funBag[j]; funBag[j] = t; }
    }
    return funBag.pop() + '...';
  }

  // ---------- file reading (pdf.js and mammoth, loaded only when needed) ----------
  function loadScript(src) {
    return new Promise(function (ok, bad) {
      if ($('script[src="' + src + '"]')) return ok();
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('Could not load the file reader.')); };
      document.head.appendChild(s);
    });
  }
  async function extractText(file) {
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      var pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      var out = [];
      for (var p = 1; p <= pdf.numPages; p++) {
        var tc = await (await pdf.getPage(p)).getTextContent();
        var line = '';
        tc.items.forEach(function (it) { line += it.str; if (it.hasEOL) { out.push(line); line = ''; } else if (it.str && !/\s$/.test(it.str)) line += ' '; });
        if (line) out.push(line);
        out.push('');
      }
      return out.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    if (name.endsWith('.docx')) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
      var r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return r.value.trim();
    }
    if (name.endsWith('.doc')) throw new Error('Old .doc files cannot be read. Save it as PDF or DOCX first.');
    return (await file.text()).trim();
  }

  // ---------- dictation (Web Speech API where supported) ----------
  function recorder(btn, ta) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.hidden = true; return; }
    var rec = null, base = '';
    btn.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-GB'; rec.continuous = true; rec.interimResults = true;
      base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
      rec.onresult = function (e) {
        var fin = '', tmp = '';
        for (var i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else tmp += e.results[i][0].transcript; }
        ta.value = base + fin + tmp;
      };
      rec.onend = function () { rec = null; btn.classList.remove('on'); btn.querySelector('.lbl').textContent = 'Record notes'; };
      rec.onerror = function () { toast('The mic stopped. Try the keyboard mic instead.', true); };
      rec.start();
      btn.classList.add('on'); btn.querySelector('.lbl').textContent = 'Stop recording';
    });
  }

  // ---------- sheet ----------
  function sheet(title, body, foot, opts) {
    opts = opts || {};
    closeSheet();
    var tt = $('#toast'); if (tt) tt.className = 'toast';
    var bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheetbg';
    var el = document.createElement('div'); el.className = 'sheet' + (opts.wide ? ' wide' : ''); el.id = 'sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
    el.innerHTML = '<div class="sh-top"><h2 class="sp ell">' + esc(title) + '</h2><button class="ibtn" data-close aria-label="Close" style="border:0">' + I.close + '</button></div><div class="sh-body">' + body + '</div>' + (foot ? '<div class="sh-foot">' + foot + '</div>' : '');
    document.body.appendChild(bg); document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { bg.classList.add('on'); el.classList.add('on'); });
    bg.onclick = closeSheet;
    $('[data-close]', el).onclick = closeSheet;
    return el;
  }
  function closeSheet() {
    var a = $('#sheet'), b = $('#sheetbg');
    if (a) a.parentNode.removeChild(a);
    if (b) b.parentNode.removeChild(b);
    document.body.style.overflow = '';
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (ok) {
      var el = sheet(title, '<p style="font-size:16px">' + esc(text) + '</p>', '<button class="btn" data-no>Cancel</button><button class="btn ' + (danger ? 'danger' : 'pri') + '" data-yes>' + esc(okLabel) + '</button>');
      $('[data-no]', el).onclick = function () { closeSheet(); ok(false); };
      $('[data-yes]', el).onclick = function () { closeSheet(); ok(true); };
    });
  }

  // ---------- theme ----------
  function applyBrand() {
    var b = (S.agency && S.agency.brand_colour) || '#C8102E';
    var r = document.documentElement.style;
    r.setProperty('--brand', b);
    r.setProperty('--brand-d', PackDoc.shade(b, -0.22));
    r.setProperty('--brand-l', PackDoc.shade(b, 0.9));
    var m = /^#?([0-9a-f]{6})$/i.exec(b); var n = m ? parseInt(m[1], 16) : 0xC8102E;
    r.setProperty('--brand-m', 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',.16)');
    r.setProperty('--brand-rgb', (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255));
    var red = b.toLowerCase() === '#c8102e';
    r.setProperty('--brand-hi', red ? '#E8344F' : PackDoc.shade(b, 0.18));
    r.setProperty('--brand-lo', red ? '#9E0B23' : PackDoc.shade(b, -0.3));
    var tc = $('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', b);
  }

  // ---------- login ----------
  function renderLogin(msg) {
    document.title = 'Candidate Pack';
    root.innerHTML = '<div class="login"><div class="art"><h2>Client-ready candidates in <span>minutes</span>, not hours.</h2><p>Drop in the brief. Your candidates are searched, the write-ups are done in your voice, and the client gets chased for you.</p></div>' +
      '<form class="form" id="lf" autocomplete="on"><div class="logo">' + I.packs + '</div><h1>Log in</h1><p class="muted" style="margin-bottom:22px">Use the email and password your agency sent you.</p>' +
      (msg ? '<div class="warnbox" style="margin-bottom:14px">' + I.warn + '<div>' + esc(msg) + '</div></div>' : '') +
      '<div class="field"><label class="f" for="le">Email</label><input class="in" id="le" type="email" autocomplete="username" inputmode="email" required></div>' +
      '<div class="field"><label class="f" for="lp">Password</label><input class="in" id="lp" type="password" autocomplete="current-password"></div>' +
      '<button class="btn pri lg block" type="submit" id="lbtn">Log in</button>' +
      '<button class="btn ghost block" type="button" id="lmagic" style="margin-top:8px">Email me a login link instead</button>' +
      '<p class="tiny muted" style="margin-top:20px">Trouble logging in? Ask your account owner, or WhatsApp ApexLine support.</p></form></div>';
    $('#lf').onsubmit = async function (e) {
      e.preventDefault();
      var b = $('#lbtn'); b.disabled = true; b.textContent = 'Logging in...';
      var r = await sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value });
      if (r.error) { b.disabled = false; b.textContent = 'Log in'; toast(r.error.message === 'Invalid login credentials' ? 'That email and password do not match. Check for a typo, or ask your account owner for a new password.' : r.error.message, true); return; }
      start();
    };
    $('#lmagic').onclick = async function () {
      var email = $('#le').value.trim();
      if (!email) { toast('Type your email first.', true); $('#le').focus(); return; }
      var r = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: location.href.split('#')[0] } });
      toast(r.error ? 'We could not send a login link just now. Use your password, or ask your account owner to reset it.' : 'Check your email for a login link.', !!r.error);
    };
  }

  function renderPaused() {
    root.innerHTML = '<div class="paused"><div class="ic">' + I.shield + '</div><h1>This account is paused</h1><p class="muted" style="margin:10px 0 22px">' + esc(S.agency ? S.agency.name : 'Your agency') + '\'s Candidate Pack is switched off at the moment. Your data is safe. Contact ApexLine to switch it back on.</p><a class="btn pri" href="https://wa.me/447949088642">WhatsApp ApexLine</a> <button class="btn" id="so">Log out</button></div>';
    $('#so').onclick = signOut;
  }
  async function signOut() { await sb.auth.signOut(); S.me = null; S.agency = null; location.hash = ''; renderLogin(); }

  // ---------- boot ----------
  async function start() {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) return renderLogin();
    var me = (await sb.from('members').select('*').eq('user_id', s.user.id).maybeSingle()).data;
    if (!me) { await sb.auth.signOut(); return renderLogin('This login is not linked to an agency yet.'); }
    S.me = me;
    S.user = s.user;
    if (!me.agency_id) {
      root.innerHTML = '<div class="paused"><div class="ic">' + I.settings + '</div><h1>You are the ApexLine admin</h1><p class="muted" style="margin:10px 0 22px">Agencies, logins and switches live on the admin page.</p><a class="btn pri" href="admin/">Open admin</a> <button class="btn" id="so">Log out</button></div>';
      $('#so').onclick = signOut; return;
    }
    S.agency = (await sb.from('agencies').select('*').eq('id', me.agency_id).maybeSingle()).data;
    applyBrand();
    if (!agencyOk(S.agency)) return renderPaused();
    document.title = S.agency.name + ' · Packs';
    renderShell();
    if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/today'; else route();
    if (!meta().welcome_done && !isDemo()) showWelcome();
    if (isDemo()) samples().catch(function () {});
  }

  // ---------- first run ----------
  function meta() { return (S.user && S.user.user_metadata) || {}; }
  async function setMeta(o) {
    S.user = S.user || {}; S.user.user_metadata = Object.assign({}, meta(), o);
    var r = await sb.auth.updateUser({ data: o });
    if (r.data && r.data.user) S.user = r.data.user;
  }
  function showWelcome() {
    var a = S.agency;
    var el = document.createElement('div');
    el.className = 'welcome'; el.id = 'welcome';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Welcome to Candidate Pack');
    el.innerHTML = '<div class="wl-in"><div class="row" style="margin-bottom:18px">' + (a.logo_url ? '<div class="mark"><img src="' + esc(a.logo_url) + '" alt=""></div>' : '<div class="mark">' + esc(initials(a.name)) + '</div>') + '<span class="sp"></span><button class="btn ghost sm" data-w="skip">Skip</button></div>' +
      '<h1>Welcome, ' + esc(first(S.me.name) || 'there') + '</h1><p class="muted" style="font-size:16px;margin:6px 0 18px">Candidate Pack turns a job brief and a CV into a client-ready profile in about a minute.</p>' +
      '<div class="wl-cards">' +
      '<div class="wl-card"><b>1</b><div><div class="t">Add a brief and a CV</div><div class="s">Paste them in or drop in the files. We match the CV to the brief.</div></div></div>' +
      '<div class="wl-card"><b>2</b><div><div class="t">Get a pack in your voice</div><div class="s">A branded profile for the client. Tap any line to change it.</div></div></div>' +
      '<div class="wl-card"><b>3</b><div><div class="t">Send it and relax</div><div class="s">See when the client opens it. Polite chasers go out for you.</div></div></div>' +
      '</div><button class="btn pri lg block" data-w="sample">' + I.spark + 'Try it now with a sample</button><button class="btn block" data-w="brief" style="margin-top:10px">Add your first brief</button>' +
      '<p class="tiny muted" style="text-align:center;margin:14px 0 0">The sample is made up. Remove it from Today in one tap.</p></div>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { el.classList.add('on'); });
  }
  function closeWelcome() {
    var el = $('#welcome'); if (!el) return;
    el.parentNode.removeChild(el); document.body.style.overflow = '';
    setMeta({ welcome_done: true }).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-w]'); if (!b) return;
    var w = b.getAttribute('data-w');
    closeWelcome();
    if (w === 'sample') runSample();
    else if (w === 'brief') addBriefSheet();
    else if (w === 'cv') addCvSheet();
  });

  // ---------- samples ----------
  // A sample is picked by its id and replays results real Claude produced earlier, so it costs nothing and counts no usage.
  // The demo agency is samples only. Every other agency pastes and uploads its own, with the sample as a first-run try.
  var SAMPLE = { brief: 'brief-harbourline', cv: 'cv-gavin' };
  var OWN_LINE = 'On your own account, you paste or drop in your real briefs and CVs. That\'s what you get from day one, with a 14-day money-back guarantee.';
  var samplesP = null;
  function samples() {
    if (!samplesP) samplesP = fn('sample_list').then(function (r) { return r.samples || []; }).catch(function (e) { samplesP = null; throw e; });
    return samplesP;
  }
  async function sampleState() {
    if (isDemo()) return { jobs: [], cands: [] };
    var r = await Promise.all([
      sb.from('jobs').select('id').not('sample_id', 'is', null).limit(5),
      sb.from('candidates').select('id').not('sample_id', 'is', null).limit(5)
    ]);
    return { jobs: (r[0].data || []).map(function (x) { return x.id; }), cands: (r[1].data || []).map(function (x) { return x.id; }) };
  }
  async function runSample() {
    closeSheet();
    var st = await sampleState();
    if (st.jobs.length && st.cands.length) { location.hash = '#/job/' + st.jobs[0] + '?pick=' + st.cands[0]; return; }
    var t = think(WORDS.sample, 'A made-up brief and CV, so you can watch it all work. About 15 seconds.', true);
    try {
      var jobId = st.jobs[0];
      if (!jobId) {
        jobId = (await fn('add_brief', { sample_id: SAMPLE.brief })).job.id;
        // The sample client is you, so sending it shows you exactly what a client sees.
        await sb.from('jobs').update({ client_email: S.me.email }).eq('id', jobId);
      }
      var candId = st.cands[0];
      if (!candId) candId = (await fn('add_cv', { sample_id: SAMPLE.cv, job_id: jobId })).candidate.id;
      t.stop();
      location.hash = '#/job/' + jobId + '?pick=' + candId;
      toast('Sample ready. Gavin fits the brief. Tap Build 1 pack.');
    } catch (e) { t.stop(); toast(e.message, true); }
  }
  async function removeSample(st) {
    if (!(await confirmBox('Remove the sample?', 'This deletes the made-up Harbourline brief, Gavin and any pack you built from them. Your own work is not touched.', 'Remove sample', true))) return;
    try {
      if (st.cands.length) must(await sb.from('candidates').delete().in('id', st.cands));
      if (st.jobs.length) must(await sb.from('jobs').delete().in('id', st.jobs));
      toast('Sample removed.'); route();
    } catch (e) { toast(e.message, true); }
  }

  var NAV = [['today', 'Today', I.today], ['packs', 'Packs', I.packs], ['bank', 'Candidates', I.bank], ['briefs', 'Briefs', I.briefs], ['reports', 'Reports', I.chart], ['settings', 'Settings', I.settings]];
  function renderShell() {
    var a = S.agency;
    var mark = a.logo_url ? '<div class="mark"><img src="' + esc(a.logo_url) + '" alt=""></div>' : '<div class="mark">' + esc(initials(a.name)) + '</div>';
    root.innerHTML = '<div class="app"><aside class="side">' +
      '<div class="brandrow">' + mark + '<div style="min-width:0"><div class="bn ell">' + esc(a.name) + '</div><div class="bs">Candidate Pack</div></div></div>' +
      '<div class="sideact"><button class="btn pri block" data-act="brief">' + I.plus + 'Add brief</button></div>' +
      NAV.map(function (n) { return '<a class="nv" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + n[2] + n[1] + '<span class="cnt" data-cnt="' + n[0] + '" hidden></span></a>'; }).join('') +
      '<div class="foot"><div class="b" style="color:var(--ink)">' + esc(S.me.name) + '</div>' + esc(S.me.role === 'owner' ? 'Owner' : 'Recruiter') + '</div></aside>' +
      '<div class="main"><div class="top" id="top"><div class="top-in"><button class="back" id="back" hidden aria-label="Back">' + I.back + '</button><div class="ttl ell sp" id="ttl"></div><div id="topx" class="row"></div></div></div><div id="view"></div></div></div>' +
      '<nav class="bnav" aria-label="Main">' + NAV.map(function (n) { return '<a href="#/' + n[0] + '" data-nav="' + n[0] + '">' + n[2] + '<span>' + n[1] + '</span><span class="dot" data-cnt="' + n[0] + '" hidden></span></a>'; }).join('') + '</nav>';
    $$('[data-act="brief"]').forEach(function (b) { b.onclick = addBriefSheet; });
    window.addEventListener('scroll', function () { var t = $('#top'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
  }
  function setTop(title, backHash, extra) {
    $('#ttl').textContent = title;
    var b = $('#back');
    b.hidden = !backHash;
    b.classList.toggle('mob', false);
    b.onclick = function () { if (history.length > 1 && S.prevHash) history.back(); else location.hash = backHash; };
    $('#topx').innerHTML = extra || '';
  }
  function setBadge(key, n) {
    $$('[data-cnt="' + key + '"]').forEach(function (e) { e.hidden = !n; e.textContent = n; });
  }
  function view(html, actionbar) {
    S.timers.forEach(clearInterval); S.timers = [];
    document.body.classList.toggle('has-actionbar', !!actionbar);
    $('#view').innerHTML = html + (actionbar ? '<div class="actionbar" id="abar">' + actionbar + '</div>' : '');
    window.scrollTo(0, 0);
  }
  function every(ms, f) { S.timers.push(setInterval(function () { if (!document.hidden) f(); }, ms)); }

  function route() {
    if (!S.agency) return;
    closeSheet();
    var h = location.hash.replace(/^#\/?/, '');
    var q = {};
    if (h.indexOf('?') >= 0) { h.split('?')[1].split('&').forEach(function (kv) { var p = kv.split('='); q[p[0]] = decodeURIComponent(p[1] || ''); }); h = h.split('?')[0]; }
    var p = h.split('/');
    var navKey = { pack: 'packs', c: 'bank', job: 'briefs' }[p[0]] || p[0];
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === navKey); });
    var screens = { today: scToday, packs: scPacks, pack: scPack, bank: scBank, c: scCand, briefs: scBriefs, job: scJob, reports: scReports, settings: scSettings };
    (screens[p[0]] || scToday)(p[1], p[2], q).catch(function (e) { console.warn(e); view('<div class="wrap"><div class="empty">' + esc(friendly(e.message) || 'This page did not load.') + '<div style="margin-top:12px"><button class="btn" onclick="location.reload()">Try again</button></div></div></div>'); });
    S.prevHash = S.curHash; S.curHash = location.hash;
  }
  window.addEventListener('hashchange', route);

  // ---------- data ----------
  var PACK_LIST = 'id,status,open_count,chase_stage,next_chase_at,sent_at,first_opened_at,last_opened_at,feedback_outcome,feedback_text,feedback_at,feedback_seen,created_at,updated_at,job_id,candidate_id,public_token,created_by,jobs(title,client_company,client_contact_name,client_phone,client_email,status),candidates(name,phone),placements(id,fee_gbp,start_date,placed_at)';
  // A pack has at most one placement. PostgREST returns it as an object or a one-item list.
  function plc(p) { var x = p && p.placements; return Array.isArray(x) ? (x[0] || null) : (x || null); }
  async function getPacks(filter) {
    var q = sb.from('packs').select(PACK_LIST).order('updated_at', { ascending: false }).limit(300);
    if (filter && filter.job) q = q.eq('job_id', filter.job);
    if (filter && filter.cand) q = q.eq('candidate_id', filter.cand);
    return must(await q);
  }
  var OUT = { interview: 'Wants to interview', not_for_us: 'Not for us', more_info: 'Wants to know more' };
  function chips(p) {
    var c = [];
    if (p.status === 'draft') c.push('<span class="chip draft"><span class="d"></span>Draft</span>');
    if (p.status === 'sent') c.push('<span class="chip sent"><span class="d"></span>Sent</span>');
    if (p.open_count > 0 && p.status !== 'draft') c.push('<span class="chip opened"><span class="d"></span>Opened' + (p.open_count > 1 ? ' x' + p.open_count : '') + '</span>');
    if (p.chase_stage > 0 && !p.feedback_outcome) c.push('<span class="chip chased"><span class="d"></span>Chased' + (p.chase_stage > 1 ? ' x' + p.chase_stage : '') + '</span>');
    if (p.feedback_outcome) c.push('<span class="chip feedback"><span class="d"></span>' + esc(OUT[p.feedback_outcome]) + '</span>');
    if (plc(p)) c.push('<span class="chip placed"><span class="d"></span>Placed</span>');
    if (p.status === 'closed') c.push('<span class="chip closed"><span class="d"></span>Closed</span>');
    return '<div class="chips">' + c.join('') + '</div>';
  }
  function canPlace(p) { return p.sent_at && !plc(p) && p.status !== 'closed' && p.feedback_outcome !== 'not_for_us'; }
  function packItem(p, right, opts) {
    var j = p.jobs || {}, c = p.candidates || {};
    if (opts && opts.place && canPlace(p)) {
      return '<div class="item" role="link" tabindex="0" data-go="#/pack/' + p.id + '"><div class="av red">' + esc(initials(c.name)) + '</div><div class="bd"><div class="t1 ell">' + esc(c.name || 'Candidate') + '</div><div class="t2 ell">' + esc(j.title || '') + (j.client_company ? ' · ' + esc(j.client_company) : '') + '</div><div style="margin-top:6px">' + chips(p) + '</div></div><button class="btn sm placebtn" data-place="' + p.id + '">' + I.trophy + '<span>Placed?</span></button></div>';
    }
    return '<a class="item" href="#/pack/' + p.id + '"><div class="av red">' + esc(initials(c.name)) + '</div><div class="bd"><div class="t1 ell">' + esc(c.name || 'Candidate') + '</div><div class="t2 ell">' + esc(j.title || '') + (j.client_company ? ' · ' + esc(j.client_company) : '') + '</div><div style="margin-top:6px">' + chips(p) + '</div></div>' + (right || '<div class="tiny muted" style="white-space:nowrap">' + ago(p.updated_at) + '</div>') + '</a>';
  }
  function callBtns(phone, waText) {
    if (!phone) return '';
    return '<a class="ibtn call" href="' + telHref(phone) + '" aria-label="Call the client">' + I.phone + '</a>' + (waText !== null ? '<a class="ibtn wa" href="' + waHref(phone, waText) + '" target="_blank" rel="noopener" aria-label="WhatsApp" onclick="event.stopPropagation()">' + I.wa + '</a>' : '');
  }

  // ---------- Today ----------
  async function scToday() {
    setTop('Today');
    var hr = new Date().getHours();
    var hi = hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening';
    view('<div class="wrap narrow"><div class="hello"><div class="muted small">' + new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><h1>' + hi + ', ' + esc(first(S.me.name)) + '</h1></div>' +
      '<div class="acts"><button class="act main-act" data-a="brief"><div class="ic">' + I.brief + '</div><div><div class="t">Add brief</div><div class="s">Paste in a job. We find who fits and write the packs.</div></div></button>' +
      '<button class="act sec-act" data-a="cv"><div class="ic">' + I.cv + '</div><div><div class="t">Add CV</div><div class="s">Save a candidate and see which briefs they fit.</div></div></button></div>' +
      '<div id="todayextra"></div><div id="todaybody"><div class="skel" style="height:84px;margin-bottom:10px"></div><div class="skel" style="height:84px"></div></div></div>');
    $('[data-a="brief"]').onclick = addBriefSheet;
    $('[data-a="cv"]').onclick = function () { addCvSheet(); };
    await drawToday();
    every(20000, drawToday);
  }
  async function drawToday() {
    var owner = S.me.role === 'owner';
    var r = await Promise.all([getPacks(), sb.from('jobs').select('id,title,client_company,status,created_at,matches(count),packs(count)').eq('status', 'open').order('created_at', { ascending: false }).limit(20),
      sb.from('candidates').select('id', { count: 'exact' }).limit(1), sampleState(),
      owner ? sb.from('members').select('user_id', { count: 'exact' }).eq('agency_id', S.agency.id).limit(1) : Promise.resolve({ count: 0 })]);
    var packs = r[0], jobs = must(r[1]), nCands = r[2].count || 0, st = r[3], nTeam = r[4].count || 0;
    drawExtras(st, nTeam, !packs.length && !jobs.length && !nCands);
    var endToday = new Date(); endToday.setHours(23, 59, 59, 999);
    var callNow = packs.filter(function (p) { return p.status === 'opened' && !p.feedback_outcome && !plc(p); });
    var fb = packs.filter(function (p) { return p.feedback_outcome && (!p.feedback_seen || (Date.now() - new Date(p.feedback_at)) < 2 * 86400e3) && p.status !== 'closed'; });
    var chase = packs.filter(function (p) { return p.next_chase_at && !p.feedback_outcome && new Date(p.next_chase_at) <= endToday && ['sent', 'opened'].indexOf(p.status) >= 0; });
    setBadge('today', callNow.length + fb.filter(function (p) { return !p.feedback_seen; }).length);
    var h = '';
    function sec(t, sub, items) { return '<div class="sec"><h2>' + t + '</h2><span class="muted">' + sub + '</span></div><div class="list">' + items + '</div>'; }
    if (callNow.length) h += sec('Opened, no answer yet', 'Call the client now', callNow.map(function (p) {
      var j = p.jobs || {};
      var who = j.client_contact_name ? first(j.client_contact_name) : 'The client';
      return '<div class="item" role="link" tabindex="0" data-go="#/pack/' + p.id + '/card"><div class="av red">' + esc(initials(p.candidates && p.candidates.name)) + '</div><div class="bd"><div class="t1 ell">' + esc(p.candidates && p.candidates.name) + '</div><div class="t2">' + esc(who) + ' at ' + esc(j.client_company || 'the client') + ' opened it ' + (p.open_count > 1 ? p.open_count + ' times' : 'once') + ', last ' + ago(p.last_opened_at) + '</div></div>' + (j.client_phone ? '<a class="btn sm callsm" href="' + telHref(j.client_phone) + '">' + I.phone + '<span>Call</span></a>' : '') + '</div>';
    }).join(''));
    if (fb.length) h += sec('Feedback in', 'The chasers have stopped', fb.map(function (p) {
      return packItem(p, '<div class="tiny muted" style="white-space:nowrap">' + ago(p.feedback_at) + '</div>').replace('href="#/pack/' + p.id + '"', 'href="#/pack/' + p.id + '/timeline"');
    }).join(''));
    if (chase.length) h += sec('Chasers going out today', 'Automatic, in your wording', chase.map(function (p) {
      var st = p.chase_stage === 0 ? '48 hour chaser' : '5 day chaser';
      var t = new Date(p.next_chase_at) < new Date() ? 'next run' : inTime(p.next_chase_at).replace('today ', '');
      return packItem(p, '<div class="tiny muted" style="text-align:right;white-space:nowrap">' + st + '<br>' + esc(t) + '</div>');
    }).join(''));
    if (!h && !packs.length && !jobs.length && !nCands) h = '<div class="startcard"><div class="sc-ic">' + I.spark + '</div><h2>Nothing here yet, and that is fine</h2><p>Add a job brief and a CV, and you get a client-ready pack in about a minute. Want to see it work first?</p><button class="btn block" data-w="sample">' + I.spark + 'Try it now with a sample</button></div>';
    else if (!h) h = '<div class="empty" style="margin-top:8px"><div class="b" style="color:var(--ink);font-size:16px">All clear</div>Nothing needs you right now. Calls to make, client replies and chasers show up here.</div>';
    if (jobs.length) h += sec('Open briefs', jobs.length + ' live', jobs.map(function (j) {
      var mc = (j.matches && j.matches[0] && j.matches[0].count) || 0, pc = (j.packs && j.packs[0] && j.packs[0].count) || 0;
      return '<a class="item" href="#/job/' + j.id + '"><div class="av">' + I.briefs.replace('<svg', '<svg width="20" height="20"') + '</div><div class="bd"><div class="t1 ell">' + esc(j.title) + '</div><div class="t2 ell">' + esc(j.client_company) + '</div></div><div class="tiny muted" style="text-align:right;white-space:nowrap"><b style="color:var(--ink)">' + mc + '</b> ' + (mc === 1 ? 'match' : 'matches') + '<br>' + pc + ' pack' + (pc === 1 ? '' : 's') + '</div></a>';
    }).join(''));
    var tb = $('#todaybody'); if (tb) tb.innerHTML = h;
  }

  function setupItems(nTeam) {
    var a = S.agency, md = meta();
    return [
      ['brand', 'Add your logo', !!a.logo_url],
      ['brand', 'Pick your colours', !!md.colours_done || String(a.brand_colour).toLowerCase() !== '#c8102e' || a.template_key !== 'classic' || a.font !== 'Inter'],
      ['voice', 'Paste 2 past write-ups so packs sound like you', String(a.voice_samples || '').trim().length > 80],
      ['team', 'Invite your recruiters', nTeam > 1]
    ];
  }
  function drawExtras(st, nTeam, empty) {
    var box = $('#todayextra'); if (!box) return;
    var h = '';
    if (st.jobs.length || st.cands.length) h += '<div class="samplebar">' + I.spark + '<div class="sp">You have the made-up sample in here: Gavin and the Harbourline brief.</div><button class="btn sm" id="rmsample">Remove</button></div>';
    var items = setupItems(nTeam), done = items.filter(function (x) { return x[2]; }).length;
    if (S.me.role === 'owner' && !isDemo() && !meta().setup_hidden && done < items.length) {
      h += '<div class="setup card pad"><div class="row"><div class="sp"><h2>Get your team set up</h2><div class="small muted">' + done + ' of ' + items.length + ' done. Takes about 5 minutes.</div></div><button class="btn ghost sm" id="hidesetup">Hide</button></div><div class="sbar"><i style="width:' + Math.round(100 * done / items.length) + '%"></i></div>' +
        items.map(function (x) { return '<a class="srow' + (x[2] ? ' done' : '') + '" href="#/settings?s=' + x[0] + '" data-setup="' + x[0] + '"><span class="sck">' + I.check + '</span><span class="sp">' + esc(x[1]) + '</span>' + (x[2] ? '' : I.back.replace('<svg', '<svg class="chev"')) + '</a>'; }).join('') + '</div>';
    }
    box.innerHTML = h;
    if ($('#rmsample')) $('#rmsample').onclick = function () { removeSample(st); };
    if ($('#hidesetup')) $('#hidesetup').onclick = function () { setMeta({ setup_hidden: true }); box.querySelector('.setup').remove(); toast('Hidden. The same steps live in Settings.'); };
  }

  // ---------- Packs ----------
  var FILTERS = [['all', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['opened', 'Opened'], ['chased', 'Chased'], ['feedback', 'Feedback'], ['placed', 'Placed'], ['closed', 'Closed']];
  async function scPacks(_a, _b, q) {
    setTop('Packs', null, '<button class="btn pri sm" data-act2="brief">' + I.plus + '<span>New pack</span></button>');
    $('[data-act2="brief"]').onclick = addBriefSheet;
    var f = q.f || 'all';
    var job = q.job ? must(await sb.from('jobs').select('id,title,client_company').eq('id', q.job).maybeSingle()) : null;
    view('<div class="wrap narrow">' + (job ? '<div class="row" style="margin:4px 0 12px"><span class="chip line">' + esc(job.title) + ' · ' + esc(job.client_company) + '</span><a class="small" href="#/packs">Show all</a></div>' : '') +
      '<div class="filters" role="tablist">' + FILTERS.map(function (x) { return '<button class="fbtn' + (x[0] === f ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="list" id="plist"><div class="skel" style="height:84px"></div></div></div>');
    $$('[data-f]').forEach(function (b) { b.onclick = function () { location.hash = '#/packs?f=' + b.getAttribute('data-f') + (q.job ? '&job=' + q.job : ''); }; });
    var packs = await getPacks(q.job ? { job: q.job } : null);
    var sel = packs.filter(function (p) {
      if (f === 'all') return true;
      if (f === 'opened') return p.open_count > 0 && p.status !== 'draft';
      if (f === 'chased') return p.chase_stage > 0;
      if (f === 'feedback') return !!p.feedback_outcome;
      if (f === 'placed') return !!plc(p);
      return p.status === f;
    });
    $('#plist').innerHTML = sel.length ? sel.map(function (p) { return packItem(p, null, { place: true }); }).join('')
      : !packs.length ? emptyBox('Your packs live here: one branded profile per candidate, ready to send to the client.', '<button class="btn pri" data-act3="brief">' + I.plus + 'Add a brief</button><button class="btn" data-w="sample">Try a sample</button>')
      : emptyBox('No packs are ' + (FILTERS.find(function (x) { return x[0] === f; }) || ['', 'in this list'])[1].toLowerCase() + ' right now.', '<a class="btn" href="#/packs">Show all packs</a>');
    $$('[data-act3="brief"]').forEach(function (b) { b.onclick = addBriefSheet; });
    $$('[data-place]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); var p = sel.find(function (x) { return x.id === b.getAttribute('data-place'); }); if (p) placeSheet(p, 'list'); };
    });
  }
  function emptyBox(line, buttons) { return '<div class="empty emptyx"><p style="margin:0 0 14px;color:var(--ink-2);font-size:15px">' + line + '</p><div class="row flexwrap" style="justify-content:center">' + (buttons || '') + '</div></div>'; }

  // ---------- Pack (editor, timeline, briefing card) ----------
  async function loadPack(id) {
    return must(await sb.from('packs').select('*, jobs(*), candidates(*), placements(*)').eq('id', id).maybeSingle());
  }
  function recruiterMeta() { return { name: S.me.name, email: S.me.email, phone: S.me.phone }; }
  function docMeta(p) { return { agency: S.agency, candidate_name: p.candidates.name, role: p.jobs.title, client_company: p.jobs.client_company, recruiter: recruiterMeta() }; }

  async function scPack(id, tab) {
    var p = await loadPack(id);
    if (!p) throw new Error('That pack was not found.');
    tab = tab || 'edit';
    if (p.feedback_outcome && !p.feedback_seen && tab === 'timeline') { sb.from('packs').update({ feedback_seen: true }).eq('id', p.id).then(function () {}); }
    setTop(p.candidates.name, '#/packs');
    var seg = '<div class="seg" role="tablist">' + [['edit', 'Pack'], ['timeline', 'Timeline'], ['card', 'Quick read']].map(function (t) { return '<button class="' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var head = '<div class="edhead"><div class="sp" style="min-width:0"><div class="small muted ell">' + esc(p.jobs.title) + ' · ' + esc(p.jobs.client_company) + '</div></div>' + chips(p) + placedHeadBtn(p) + '</div>';
    if (tab === 'timeline') { await packTimeline(p, seg, head); return bindPlaced(p, tab); }
    if (tab === 'card') { await packCard(p, seg, head); return bindPlaced(p, tab); }
    var flags = (p.output_flags || []).length ? '<div class="warnbox flagbox">' + I.warn + '<div><b>Check the wording.</b> These words can point to protected characteristics: ' + esc(p.output_flags.map(function (f) { return f.words.join(', '); }).join(', ')) + '. Edit them out before sending.</div></div>' : '';
    var red = (p.candidates.redaction || []).filter(function (r) { return ['contact', 'name', 'title'].indexOf(r.key) < 0; });
    var safe = '<div class="okbox flagbox">' + I.shield + '<div><b>Scored on skills and experience only.</b> ' + (red.length ? 'Removed before the AI saw it: ' + esc(red.map(function (r) { return r.label.toLowerCase(); }).join(', ')) + '.' : 'Contact details and the name were hidden from the AI.') + '</div></div>';
    var missing = (p.content.missing || []).length ? '<div class="warnbox flagbox">' + I.warn + '<div><b>Not in the CV or your notes</b> (the client may ask): ' + esc(p.content.missing.join('; ')) + '</div></div>' : '';
    var editcue = p.sent_at ? '' : '<div class="editcue">' + I.edit + '<span><b>Tap any line to change it.</b> It saves by itself. Happy with it? Tap Send to client.</span></div>';
    var sentLabel = p.sent_at ? 'Send again' : 'Send to client';
    view('<div class="wrap narrow">' + seg + head + editcue + flags + safe + missing + '<div class="docwrap" id="doc">' + PackDoc.html(p.content, docMeta(p), { editable: true }) + '</div><div class="row" style="margin-top:10px"><span class="saved" id="saved">All changes saved</span></div></div>',
      '<button class="btn" data-x="preview">' + I.eye + '<span>Preview</span></button><button class="btn" data-x="pdf">' + I.print + '<span>PDF</span></button><button class="btn pri" data-x="send">' + I.send + '<span>' + sentLabel + '</span></button>');
    bindTabs(p.id);
    bindPlaced(p, 'edit');
    var save = debounce(async function () {
      var c = PackDoc.tidy(p.content);
      var res = await sb.from('packs').update({ content: c }).eq('id', p.id);
      $('#saved').textContent = res.error ? 'Could not save: ' + res.error.message : 'All changes saved';
    }, 700);
    $('#doc').addEventListener('input', function (e) {
      var el = e.target.closest('[data-p]'); if (!el) return;
      PackDoc.setPath(p.content, el.getAttribute('data-p'), el.innerText.replace(/\u2014/g, ', ').trim());
      $('#saved').textContent = 'Saving...';
      save();
    });
    $('#doc').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-p]') && e.target.tagName !== 'P') { e.preventDefault(); e.target.blur(); } });
    $$('[data-regen]').forEach(function (b) {
      b.onclick = async function () {
        var key = b.getAttribute('data-regen');
        var ins = await askInstruction(key);
        if (ins === null) return;
        b.classList.add('busy');
        var t = think(WORDS.regen, 'Rewriting the ' + ({ fit: 'fit summary', cv: 'CV', practical: 'practical details', questions: 'interview questions' }[key] || key) + '.');
        try { await fn('regen_section', { pack_id: p.id, section: key, instruction: ins }); t.stop(); toast('Rewritten.'); scPack(p.id, 'edit'); }
        catch (e) { t.stop(); b.classList.remove('busy'); toast(e.message, true); }
      };
    });
    $('[data-x="preview"]').onclick = function () { window.open(packLink(p.public_token), '_blank'); };
    $('[data-x="pdf"]').onclick = function () { window.open(packLink(p.public_token) + '&print=1', '_blank'); };
    $('[data-x="send"]').onclick = async function () {
      if (p.sent_at && !(await confirmBox('Send it again?', (p.jobs.client_contact_name || 'The client') + ' already has this pack. Sending again emails them the same link.', 'Yes, send again'))) return;
      sendSheet(p);
    };
  }
  function bindTabs(id) { $$('[data-tab]').forEach(function (b) { b.onclick = function () { var t = b.getAttribute('data-tab'); location.hash = '#/pack/' + id + (t === 'edit' ? '' : '/' + t); }; }); }
  function askInstruction(key) {
    return new Promise(function (ok) {
      var el = sheet('Rewrite this section', '<p class="muted">Tell it what to change, or leave it blank for a sharper version.</p><textarea class="in" id="ins" style="min-height:110px" placeholder="For example: shorter, and lead with the margin work"></textarea><div class="hint">' + I.mic + 'Tap the mic on your keyboard to dictate.</div>', '<button class="btn" data-no>Cancel</button><button class="btn pri" data-yes>Rewrite</button>');
      $('[data-no]', el).onclick = function () { closeSheet(); ok(null); };
      $('[data-yes]', el).onclick = function () { var v = $('#ins').value.trim(); closeSheet(); ok(v); };
    });
  }

  function sendSheet(p) {
    var j = p.jobs, c = p.candidates;
    var link = '{link}';
    var fit = (p.content.fit && p.content.fit.headline) || '';
    var msg = 'Hi ' + (first(j.client_contact_name) || 'there') + ',\n\nI think ' + first(c.name) + ' is well worth a look for the ' + j.title + ' role. ' + fit + '\n\nThe full profile is here, with a one tap button to tell me what you think:\n' + link + '\n\nHappy to talk it through.\n\n' + S.me.name + '\n' + S.agency.name;
    var el = sheet('Send to client',
      '<div class="field"><label class="f" for="sto">To</label><input class="in" id="sto" type="email" inputmode="email" value="' + esc(p.sent_to || j.client_email || '') + '" placeholder="client@company.co.uk"></div>' +
      '<div class="field"><label class="f" for="ssub">Subject</label><input class="in" id="ssub" value="' + esc(c.name + ' for your ' + j.title + ' role') + '"></div>' +
      '<div class="field"><label class="f" for="smsg">Message</label><textarea class="in" id="smsg" style="min-height:240px">' + esc(msg) + '</textarea><div class="hint">Keep {link} in the message: it becomes the button to the profile. Replies come straight to ' + esc(S.me.email) + '.</div></div>' +
      (j.client_email && j.client_email === S.me.email ? '<div class="okbox" style="margin-bottom:10px">' + I.spark + '<div>This goes to you, so you can see exactly what a client gets.</div></div>' : '') +
      '<div class="okbox">' + I.chase + '<div>If ' + esc(first(j.client_contact_name) || 'the client') + ' goes quiet, a polite chaser goes after 48 hours and again at 5 days. It stops the moment they reply.</div></div>',
      '<button class="btn" data-close2>Cancel</button><button class="btn pri" id="sgo"></button>');
    $('[data-close2]', el).onclick = closeSheet;
    function label() { var v = $('#sto').value.trim(); $('#sgo').innerHTML = I.send + '<span class="ell">' + (v ? 'Send to ' + esc(v.split('@')[0]) : 'Send') + '</span>'; }
    label(); $('#sto').oninput = label;
    $('#sgo').onclick = async function () {
      var to = $('#sto').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { toast('Add the client\'s email address, for example name@company.co.uk.', true); $('#sto').focus(); return; }
      if ($('#smsg').value.indexOf('{link}') < 0 && !(await new Promise(function (ok) { ok(confirm('The message has no {link}, so the client gets no button to the profile. Send anyway?')); }))) return;
      var b = this; b.disabled = true; b.innerHTML = 'Sending...';
      try {
        var r = await fn('send_pack', { pack_id: p.id, to: to, subject: $('#ssub').value.trim(), message: $('#smsg').value });
        closeSheet();
        var es = r.email && r.email.status;
        if (es === 'failed') toast('The pack is marked as sent, but the email bounced. Check the address and tap Send again.', true);
        else { tickPop('Sent'); toast(es === 'simulated' ? 'Marked as sent. Email is not switched on for your account yet, so the client has not had it. ApexLine switches it on.' : r.email && r.email.to !== to ? 'Sent to the test inbox. Email is in test mode, so the client has not had it yet.' : 'Sent to ' + to + '. You will see here when they open it.'); }
        scPack(p.id, 'timeline');
      } catch (e) { b.disabled = false; label(); toast(e.message, true); }
    };
  }

  var EV = {
    created: function () { return 'Pack written'; },
    regenerated: function (m) { return 'Rewrote the ' + (m.section || 'section'); },
    sent: function (m) { return 'Sent to ' + (m.to || 'the client'); },
    opened: function (m) { return 'Opened by the client' + (m.n > 1 ? ' (' + m.n + ' times now)' : '') + (m.device ? ' on ' + m.device : ''); },
    chased: function (m) { return (m.stage === 1 ? '48 hour' : '5 day') + ' chaser sent'; },
    feedback: function (m) { return 'Client: ' + (OUT[m.outcome] || m.outcome); },
    added: function () { return 'Added to your candidates'; },
    contacted: function () { return 'Marked as contacted'; },
    brief_added: function (m) { return 'Brief added, ' + (m.matches || 0) + ' matches from your candidates'; },
    placed: function (m) { return 'Placed' + (m.fee != null ? ', ' + gbp(m.fee) + ' fee' : '') + (m.start_date ? ', starts ' + dShort(m.start_date) : ''); },
    placement_updated: function (m) { return 'Placement updated' + (m.fee != null ? ', ' + gbp(m.fee) + ' fee' : ''); },
    placement_removed: function () { return 'Placement removed'; }
  };
  async function packTimeline(p, seg, head) {
    var ev = must(await sb.from('events').select('*').eq('pack_id', p.id).order('at', { ascending: false }));
    var fbCard = p.feedback_outcome ? '<div class="card pad" style="border-color:var(--ok);margin-bottom:14px"><div class="small muted">Client feedback, ' + esc(ago(p.feedback_at)) + '</div><div style="font-size:20px;font-weight:800;margin:4px 0">' + esc(OUT[p.feedback_outcome]) + '</div>' + (p.feedback_text ? '<div style="font-size:16px">"' + esc(p.feedback_text) + '"</div>' : '') + '</div>' : '';
    var next = (!p.feedback_outcome && p.next_chase_at) ? '<div class="okbox" style="margin-bottom:14px">' + I.chase + '<div>Next chaser: <b>' + esc(p.chase_stage === 0 ? '48 hour' : '5 day') + '</b>, ' + esc(inTime(p.next_chase_at)) + '.</div></div>' : '';
    var stats = '<div class="kv" style="margin-bottom:16px"><div><b>Sent</b><span>' + (p.sent_at ? esc(when(p.sent_at)) : 'Not yet') + '</span></div><div><b>Opens</b><span>' + p.open_count + (p.last_opened_at ? ', last ' + esc(ago(p.last_opened_at)) : '') + '</span></div></div>';
    var tl = '<div class="tl">' + ev.map(function (e) {
      var f = EV[e.type] || function () { return e.type; };
      var q = e.type === 'feedback' && e.meta && e.meta.text ? '<div class="q">"' + esc(e.meta.text) + '"</div>' : '';
      return '<div class="ev ' + esc(e.type) + '"><div class="t">' + esc(f(e.meta || {})) + '</div><div class="w">' + esc(when(e.at)) + '</div>' + q + '</div>';
    }).join('') + '</div>';
    var canChase = p.sent_at && !p.feedback_outcome && p.chase_stage < 2 && p.status !== 'closed';
    view('<div class="wrap narrow">' + seg + head + fbCard + next + stats + '<div class="card pad">' + tl + '</div></div>',
      '<button class="btn" data-x="link">' + I.link + '<span>Copy link</span></button>' + (canChase ? '<button class="btn" data-x="chase">' + I.chase + '<span>Chase now</span></button>' : '') + (p.status !== 'closed' ? '<button class="btn" data-x="close"><span>Close pack</span></button>' : '<button class="btn" data-x="reopen"><span>Reopen</span></button>'));
    bindTabs(p.id);
    $('[data-x="link"]').onclick = function () { copy(packLink(p.public_token)); };
    if ($('[data-x="chase"]')) $('[data-x="chase"]').onclick = async function () {
      if (!(await confirmBox('Send a chaser now?', 'The ' + (p.chase_stage === 0 ? '48 hour' : '5 day') + ' chaser goes to ' + (p.sent_to || 'the client') + ' in your wording.', 'Send chaser'))) return;
      try { await fn('chase_now', { pack_id: p.id }); toast('Chaser sent.'); scPack(p.id, 'timeline'); } catch (e) { toast(e.message, true); }
    };
    if ($('[data-x="close"]')) $('[data-x="close"]').onclick = async function () {
      var before = { status: p.status, next_chase_at: p.next_chase_at, feedback_seen: p.feedback_seen };
      try { must(await sb.from('packs').update({ status: 'closed', next_chase_at: null, feedback_seen: true }).eq('id', p.id)); } catch (e) { return toast(e.message, true); }
      toast('Pack closed. No more chasers.', false, { label: 'Undo', run: async function () { await sb.from('packs').update(before).eq('id', p.id); toast('Reopened.'); if (/^#\/pack\//.test(location.hash)) scPack(p.id, 'timeline'); } });
      scPack(p.id, 'timeline');
    };
    if ($('[data-x="reopen"]')) $('[data-x="reopen"]').onclick = async function () {
      must(await sb.from('packs').update({ status: p.feedback_outcome ? 'feedback' : p.open_count ? 'opened' : p.sent_at ? 'sent' : 'draft' }).eq('id', p.id)); scPack(p.id, 'timeline');
    };
    every(15000, async function () {
      var n = must(await sb.from('packs').select('open_count,feedback_outcome,chase_stage,status').eq('id', p.id).maybeSingle());
      if (n && (n.open_count !== p.open_count || n.feedback_outcome !== p.feedback_outcome || n.chase_stage !== p.chase_stage || n.status !== p.status)) { toast('Updated just now.'); scPack(p.id, 'timeline'); }
    });
  }
  function copy(t) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Link copied.'); }, function () { prompt('Copy this link', t); });
    else prompt('Copy this link', t);
  }

  function briefingCard(o) {
    var b = o.briefing || {};
    var facts = '<div class="facts"><div><b>Salary</b><span>' + esc(o.salary || 'Not given') + '</span></div><div><b>Notice</b><span>' + esc(o.notice || 'Not given') + '</span></div><div><b>Available</b><span>' + esc(o.availability || 'Not given') + '</span></div></div>';
    var h = '<div class="bcard"><div class="hd"><div class="nm">' + esc(o.name) + '</div><div class="rl">' + esc(o.sub) + '</div>' + (o.chips ? '<div style="margin-top:10px">' + o.chips + '</div>' : '') + '</div><div class="bd">';
    if ((b.key_points || []).length) h += '<h4>5 things to know</h4><ol>' + b.key_points.slice(0, 5).map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ol>';
    h += '<h4>The practical bits</h4>' + facts;
    if (o.fit) h += '<h4>Why they fit</h4><div class="fit">' + esc(o.fit) + '</div>';
    if ((b.say_to_client || []).length) h += '<h4>Say this to the client</h4><ol class="say">' + b.say_to_client.slice(0, 3).map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ol>';
    var fl = (b.flags || []).concat(o.missing || []);
    if (fl.length) h += '<h4>Flags and missing info</h4><ul class="flags">' + fl.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>';
    h += o.buttons || '';
    h += '</div></div>';
    return h;
  }
  async function packCard(p, seg, head) {
    var c = p.candidates, j = p.jobs, pr = p.content.practical || {};
    var link = packLink(p.public_token);
    var waText = 'Hi ' + (first(j.client_contact_name) || '') + ', here is ' + first(c.name) + '\'s profile for the ' + j.title + ' role: ' + link;
    var btns = '<div class="callbar">' +
      (j.client_phone ? '<a class="btn call" href="' + telHref(j.client_phone) + '">' + I.phone + 'Call ' + esc(first(j.client_contact_name) || 'client') + '</a><a class="btn wa" href="' + waHref(j.client_phone, waText) + '" target="_blank" rel="noopener">' + I.wa + 'WhatsApp link</a>' : '<a class="btn" href="#/job/' + j.id + '">Add client number</a><button class="btn" data-x="link">' + I.link + 'Copy link</button>') +
      (c.phone ? '<a class="btn" href="' + telHref(c.phone) + '">' + I.phone + 'Call ' + esc(first(c.name)) + '</a><a class="btn" href="' + waHref(c.phone, 'Hi ' + first(c.name) + ', quick update on ' + j.client_company + '.') + '" target="_blank" rel="noopener">' + I.wa + 'WhatsApp ' + esc(first(c.name)) + '</a>' : '') +
      '</div>' + placedCardBlock(p);
    view('<div class="wrap narrow">' + seg + briefingCard({ name: c.name, sub: j.title + ' · ' + j.client_company, chips: chips(p).replace(/chip /g, 'chip line '), briefing: p.content.briefing, salary: pr.salary, notice: pr.notice, availability: pr.availability, fit: p.content.fit && p.content.fit.headline, missing: p.content.missing, buttons: btns }) + '</div>');
    bindTabs(p.id);
    if ($('[data-x="link"]')) $('[data-x="link"]').onclick = function () { copy(link); };
  }

  // ---------- Placements ----------
  function placedHeadBtn(p) {
    if (!p.sent_at) return '';
    var pl = plc(p);
    return pl ? '<button class="btn sm placedtag" data-x="placed" aria-label="Edit placement">' + I.trophy + '<span>' + esc(gbp(pl.fee_gbp)) + '</span></button>'
      : '<button class="btn sm" data-x="placed">' + I.trophy + '<span>Mark placed</span></button>';
  }
  function placedCardBlock(p) {
    if (!p.sent_at) return '';
    var pl = plc(p);
    if (!pl) return '<button class="btn block placebig" data-x="placed">' + I.trophy + 'Mark as placed</button>';
    return '<div class="placedbox"><div class="ic">' + I.trophy + '</div><div class="sp" style="min-width:0"><div class="t">Placed, ' + esc(gbp(pl.fee_gbp)) + ' fee</div><div class="s">' + (pl.start_date ? 'Starts ' + esc(dLong(pl.start_date)) : 'Start date not set') + '</div></div><button class="btn sm" data-x="placed">Edit</button></div>';
  }
  function bindPlaced(p, tab) {
    $$('[data-x="placed"]').forEach(function (b) { b.onclick = function () { placeSheet(p, tab); }; });
  }
  function parseFee(v) {
    var s = String(v || '').replace(/[£,\s]/g, '').toLowerCase();
    var k = /k$/.test(s); if (k) s = s.slice(0, -1);
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var n = Number(s) * (k ? 1000 : 1);
    return n >= 0 && n <= 1000000 ? Math.round(n * 100) / 100 : null;
  }
  function placeSheet(p, tab) {
    var pl = plc(p), j = p.jobs, c = p.candidates;
    var el = sheet(pl ? 'Edit placement' : 'Mark as placed',
      '<div class="placehero"><div class="av red">' + esc(initials(c.name)) + '</div><div style="min-width:0"><div class="b ell" style="font-size:17px">' + esc(c.name) + '</div><div class="small muted ell">' + esc(j.title) + ' · ' + esc(j.client_company) + '</div></div></div>' +
      '<div class="field"><label class="f" for="pfee">Fee</label><div class="money"><span>£</span><input class="in" id="pfee" inputmode="decimal" autocomplete="off" placeholder="12,500" value="' + (pl ? esc(String(Number(pl.fee_gbp))) : '') + '"></div><div class="hint">What you invoice the client for this hire.</div></div>' +
      '<div class="field"><label class="f" for="pstart">Start date</label><input class="in" id="pstart" type="date" value="' + esc((pl && pl.start_date) || '') + '"></div>' +
      (!pl && j.status === 'open' ? '<label class="checkrow"><input type="checkbox" id="pfill" checked><span>Mark the brief as filled</span></label>' : '') +
      '<div class="okbox" style="margin-top:12px">' + I.chart + '<div>The fee shows on your Reports as money that came from packs. Any chasers still due on this pack stop.</div></div>' +
      (pl ? '<button class="btn danger block" id="punplace" style="margin-top:14px">' + I.trash + 'Remove placement</button>' : ''),
      '<button class="btn" data-close2>Cancel</button><button class="btn pri" id="psave">' + I.check + (pl ? 'Save' : 'Mark placed') + '</button>');
    $('[data-close2]', el).onclick = closeSheet;
    setTimeout(function () { var f = $('#pfee'); if (f && !pl) f.focus(); }, 280);
    $('#psave').onclick = async function () {
      var fee = parseFee($('#pfee').value);
      if (fee === null) { toast('Add the fee in pounds, for example 12500.', true); $('#pfee').focus(); return; }
      var start = $('#pstart').value || null;
      var b = this; b.disabled = true;
      try {
        if (pl) must(await sb.from('placements').update({ fee_gbp: fee, start_date: start }).eq('id', pl.id).select('id'));
        else must(await sb.from('placements').insert({ agency_id: S.agency.id, pack_id: p.id, fee_gbp: fee, start_date: start }).select('id'));
        if ($('#pfill') && $('#pfill').checked) await sb.from('jobs').update({ status: 'filled' }).eq('id', p.job_id);
        closeSheet();
        if (pl) toast('Placement saved.');
        else { confetti(); toast('Nice one! ' + gbp(fee) + ' is on your Reports.'); }
        if (tab === 'list') route(); else scPack(p.id, tab);
      } catch (e) { b.disabled = false; toast(e.message, true); }
    };
    if ($('#punplace')) $('#punplace').onclick = async function () {
      if (!(await confirmBox('Remove this placement?', 'The ' + gbp(pl.fee_gbp) + ' fee comes off your Reports. The pack stays.', 'Remove', true))) return;
      try { must(await sb.from('placements').delete().eq('id', pl.id).select('id')); toast('Placement removed.'); if (tab === 'list') route(); else scPack(p.id, tab); } catch (e) { toast(e.message, true); }
    };
  }

  // ---------- Reports ----------
  // Numbers come from the pack_report RPC (security invoker, so RLS applies). A recruiter only ever gets their own.
  var PERIODS = [['week', 'This week'], ['month', 'This month'], ['last', 'Last month'], ['quarter', 'This quarter'], ['custom', 'Custom']];
  function repPrefs(v) {
    try {
      if (v) { localStorage.setItem('cp-rep', JSON.stringify(v)); return v; }
      return JSON.parse(localStorage.getItem('cp-rep') || 'null') || {};
    } catch (e) { return v || {}; }
  }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function periodRange(key, cf, ct) {
    var now = new Date(), today = dayStart(now), tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (key === 'week') { var w = new Date(today); w.setDate(today.getDate() - ((today.getDay() + 6) % 7)); return { from: w, to: tomorrow }; }
    if (key === 'last') return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 1) };
    if (key === 'quarter') return { from: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), to: tomorrow };
    if (key === 'custom' && cf && ct) {
      var a = new Date(cf + 'T00:00:00'), b = new Date(ct + 'T00:00:00'); if (b < a) { var t = a; a = b; b = t; }
      b.setDate(b.getDate() + 1); return { from: a, to: b };
    }
    return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
  }
  function rangeLabel(r) {
    var end = new Date(r.to); end.setDate(end.getDate() - 1);
    var a = r.from, sameY = a.getFullYear() === end.getFullYear(), sameM = sameY && a.getMonth() === end.getMonth();
    if (+a === +dayStart(end)) return dLong(ymd(a));
    return a.toLocaleDateString('en-GB', sameM ? { day: 'numeric' } : sameY ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }) + ' to ' + end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function num(v) { return Number(v || 0).toLocaleString('en-GB'); }
  function pct(v) { return v == null ? 'n/a' : (Math.round(Number(v) * 10) / 10).toString() + '%'; }
  function share(a, b) { return b ? Math.round(1000 * a / b) / 10 : null; }
  function dur(h) {
    if (h == null) return 'n/a';
    h = Number(h);
    if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min';
    if (h < 48) { var x = Math.round(h * 10) / 10; return x + (x === 1 ? ' hour' : ' hours'); }
    return Math.round(h / 24 * 10) / 10 + ' days';
  }
  function csvCell(v) {
    if (v == null) return '';
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; // no formula injection in Excel
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadCsv(name, header, rows) {
    var txt = '﻿' + [header].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  // cols: [label, html(row), csv(row), extra class]
  function rtable(id, cols, rows, empty) {
    if (!rows.length) return '<div class="empty">' + esc(empty) + '</div>';
    return '<div class="rtable-wrap"><table class="rtable" id="' + id + '"><thead><tr>' + cols.map(function (c) { return '<th class="' + (c[3] || '') + '">' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="' + (r._cls || '') + '">' + cols.map(function (c, i) { return '<td class="' + (c[3] || '') + (i === 0 ? ' lead' : '') + '" data-l="' + esc(c[0]) + '">' + c[1](r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function csvBtn(key) { return '<button class="btn sm csv noprint" data-csv="' + key + '">' + I.dl + '<span>CSV</span></button>'; }

  async function scReports() {
    var owner = S.me.role === 'owner';
    var pr = repPrefs();
    var st = { period: PERIODS.some(function (x) { return x[0] === pr.period; }) ? pr.period : 'month', cf: pr.cf || '', ct: pr.ct || '', member: owner ? (pr.member || '') : '' };
    setTop('Reports', null, '<button class="btn sm" id="rprint">' + I.print + '<span>Download summary</span></button>');
    var team = owner ? must(await sb.from('members').select('user_id,name,role').eq('agency_id', S.agency.id).order('created_at')) : [];
    if (st.member && !team.some(function (m) { return m.user_id === st.member; })) st.member = '';
    view('<div class="wrap reports"><div class="print-only phead"><div class="pn">' + esc(S.agency.name) + '</div><div class="ps" id="pscope"></div></div>' +
      '<div class="rhead noprint"><div class="period" role="tablist" aria-label="Period">' + PERIODS.map(function (x) { return '<button role="tab" class="pbtn' + (x[0] === st.period ? ' on' : '') + '" data-per="' + x[0] + '" aria-selected="' + (x[0] === st.period) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (owner ? '<select class="in rsel" id="rmember" aria-label="Recruiter"><option value="">Whole agency</option>' + team.map(function (m) { return '<option value="' + esc(m.user_id) + '"' + (m.user_id === st.member ? ' selected' : '') + '>' + esc(m.name || m.email) + '</option>'; }).join('') + '</select>' : '') +
      '</div><div class="custom noprint" id="rcustom"' + (st.period === 'custom' ? '' : ' hidden') + '><div class="grid2c"><div><label class="f" for="rcf">From</label><input class="in" type="date" id="rcf" value="' + esc(st.cf) + '"></div><div><label class="f" for="rct">To</label><input class="in" type="date" id="rct" value="' + esc(st.ct) + '"></div></div><button class="btn pri" id="rapply">Show</button></div>' +
      '<div class="rrange" id="rrange"></div><div id="rbody"><div class="skel" style="height:150px;margin-bottom:12px"></div><div class="tiles">' + '<div class="skel" style="height:104px"></div>'.repeat(4) + '</div></div></div>');
    function save() { repPrefs({ period: st.period, cf: st.cf, ct: st.ct, member: st.member }); }
    $$('[data-per]').forEach(function (b) {
      b.onclick = function () {
        st.period = b.getAttribute('data-per');
        $$('[data-per]').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
        $('#rcustom').hidden = st.period !== 'custom';
        if (st.period === 'custom') {
          if (!st.cf || !st.ct) { var r0 = periodRange('month'); var e0 = new Date(r0.to); e0.setDate(e0.getDate() - 1); $('#rcf').value = st.cf = ymd(r0.from); $('#rct').value = st.ct = ymd(e0); }
        }
        save(); load();
      };
    });
    $('#rapply').onclick = function () {
      if (!$('#rcf').value || !$('#rct').value) { toast('Pick both dates.', true); return; }
      st.cf = $('#rcf').value; st.ct = $('#rct').value; save(); load();
    };
    if ($('#rmember')) $('#rmember').onchange = function () { st.member = this.value; save(); load(); };
    $('#rprint').onclick = function () {
      var t = document.title;
      document.title = S.agency.name + ' report, ' + $('#rrange').textContent;
      window.addEventListener('afterprint', function f() { document.title = t; window.removeEventListener('afterprint', f); });
      window.print();
    };
    var seq = 0;
    async function load() {
      var my = ++seq;
      var r = periodRange(st.period, st.cf, st.ct);
      var who = owner ? (st.member ? (team.find(function (m) { return m.user_id === st.member; }) || {}).name : 'Whole agency') : 'Your numbers';
      $('#rrange').innerHTML = '<span class="b">' + esc(rangeLabel(r)) + '</span><span class="muted"> · ' + esc(who) + '</span>';
      $('#pscope').textContent = 'Candidate Pack report · ' + rangeLabel(r) + ' · ' + who;
      $('#rbody').style.opacity = '.55';
      var res = await sb.rpc('pack_report', { p_from: r.from.toISOString(), p_to: r.to.toISOString(), p_member: st.member || null });
      if (my !== seq) return;
      $('#rbody').style.opacity = '';
      if (res.error) { $('#rbody').innerHTML = '<div class="empty">' + esc(res.error.message) + '</div>'; return; }
      drawReport(res.data, r, who, owner);
    }
    await load();
  }

  function drawReport(d, r, who, owner) {
    var t = d.tiles, ch = d.chasers, bk = d.bank, mins = d.minutes_per_pack;
    var fname = function (k) { return S.agency.slug + '-' + k + '-' + ymd(r.from) + '-to-' + ymd(new Date(r.to - 86400e3)) + '.csv'; };
    var h = '';
    if (!t.sent && !t.built && !t.placements) h += '<div class="emptyx empty" style="margin-bottom:14px;text-align:left"><p style="margin:0 0 12px;color:var(--ink-2);font-size:15px"><b>Your numbers fill in as you send packs:</b> opens, client replies, interviews, placements and the hours you saved.</p><button class="btn pri" data-act3="brief">' + I.plus + 'Add a brief</button></div>';
    // ROI line
    var fromBank = (d.placements || []).filter(function (x) { return x.from_bank; }).length;
    h += '<section class="roi"><div class="roi-in"><div class="roi-k">' + I.pound + '<span>Fees from packs</span></div>' +
      (t.placements ? '<div class="roi-n" id="roi-fees">' + esc(gbp(t.fees)) + '</div><div class="roi-t">in fees came from packs sent through Candidate Pack</div>' +
        '<div class="roi-s">' + t.placements + ' placement' + (t.placements === 1 ? '' : 's') + ' made in this period' + (fromBank ? ', ' + fromBank + ' of them from candidates already in your bank' : '') + '.</div>'
      : '<div class="roi-n" id="roi-fees">£0</div><div class="roi-t">in fees marked in this period so far</div><div class="roi-s">When a candidate is placed, tap <b>Placed?</b> next to their pack on Packs. The fee shows up here.</div>') +
      '</div><div class="roi-side"><div><b>' + esc(num(t.hours_saved)) + '</b><span>hours saved</span></div><div><b>' + t.interviews + '</b><span>interviews</span></div></div></section>';
    // tiles
    function tile(label, val, sub, cls) { return '<div class="tile' + (cls ? ' ' + cls : '') + '"><div class="tl-l">' + label + '</div><div class="tl-v">' + val + '</div><div class="tl-s">' + sub + '</div></div>'; }
    h += '<div class="tiles">' +
      tile('Packs sent', num(t.sent), num(t.built) + ' built in this period') +
      tile('Client open rate', pct(t.open_rate), t.sent ? num(t.opened) + ' of ' + num(t.sent) + ' opened' : 'No packs sent yet') +
      tile('Average time to first open', esc(dur(t.avg_open_hours)), 'from sending to the client\'s first look') +
      tile('Feedback rate', pct(t.feedback_rate), t.sent ? num(t.feedback) + ' clients replied' : 'No packs sent yet') +
      tile('Interviews requested', num(t.interviews), t.sent ? pct(t.interview_rate) + ' of packs sent' : 'No packs sent yet') +
      tile('Placements and fees', num(t.placements) + ' <small>· ' + esc(gbp(t.fees)) + '</small>', 'placements made in this period', 'money') +
      tile('Hours saved', esc(num(t.hours_saved)) + ' <small>hours</small>', 'estimate, based on ' + mins + ' min per pack (' + (owner ? '<a href="#/settings?s=reports">change in Settings</a>' : 'set by your agency owner') + ')', 'saved') +
      '</div>';
    // funnel
    var steps = [['Sent', t.sent, null], ['Opened', t.opened, 'of sent'], ['Feedback', t.feedback, 'of opened'], ['Interview', t.interviews, 'of feedback'], ['Placed', t.cohort_placed, 'of interviews']];
    var funnelRows = steps.map(function (s, i) { var prev = i ? steps[i - 1][1] : null; return { step: s[0], n: s[1], conv: i ? share(s[1], prev) : null, of: s[2], ofSent: share(s[1], t.sent) }; });
    h += '<section class="card pad rsec"><div class="rsec-h"><div><h2>Funnel</h2><div class="small muted">What happened to the ' + num(t.sent) + ' pack' + (t.sent === 1 ? '' : 's') + ' sent in this period</div></div>' + csvBtn('funnel') + '</div>' +
      (t.sent ? '<div class="funnel">' + funnelRows.map(function (f, i) {
        return '<div class="fstep"><div class="fl"><span class="fn">' + esc(f.step) + '</span><span class="fc">' + num(f.n) + '</span></div><div class="fbar"><i style="width:' + Math.max(f.ofSent || 0, f.n ? 2 : 0) + '%"></i></div><div class="fp">' + (i ? (f.conv == null ? 'n/a' : pct(f.conv)) + ' ' + f.of : '100%') + '</div></div>';
      }).join('') + '</div>' : '<div class="empty">No packs were sent in this period.</div>') + '</section>';
    // placements
    var pls = d.placements || [];
    h += '<section class="card pad rsec"><div class="rsec-h"><div><h2>Placements</h2><div class="small muted">Made in this period, from packs</div></div>' + (pls.length ? csvBtn('placements') : '') + '</div>' +
      rtable('t-placements', [
        ['Candidate', function (x) { return '<a href="#/pack/' + esc(x.pack_id) + '">' + esc(x.candidate) + '</a>'; }],
        ['Role', function (x) { return esc(x.role); }],
        ['Client', function (x) { return esc(x.client); }],
        ['Recruiter', function (x) { return esc(x.recruiter); }],
        ['Fee', function (x) { return '<b>' + esc(gbp(x.fee)) + '</b>'; }, null, 'n'],
        ['Start date', function (x) { return x.start_date ? esc(dLong(x.start_date)) : 'Not set'; }, null, 'n']
      ], pls, 'No placements marked in this period yet.') + '</section>';
    // clients
    var cls = (d.clients || []).map(function (c) { c._cls = c.ghost ? 'ghost' : ''; return c; });
    var ghosts = cls.filter(function (c) { return c.ghost; });
    h += '<section class="card pad rsec"><div class="rsec-h"><div><h2>Clients</h2><div class="small muted">' + (ghosts.length ? ghosts.length + ' ghosting you: chase them or drop them' : 'Who reads your packs and who replies') + '</div></div>' + (cls.length ? csvBtn('clients') : '') + '</div>' +
      rtable('t-clients', [
        ['Client', function (c) { return esc(c.client) + (c.ghost ? ' <span class="chip ghostchip">Ghoster</span>' : ''); }],
        ['Packs sent', function (c) { return num(c.sent); }, null, 'n'],
        ['Open rate', function (c) { return pct(c.open_rate); }, null, 'n'],
        ['Feedback rate', function (c) { return '<span class="' + (c.ghost ? 'bad' : c.feedback_rate >= 60 ? 'good' : '') + '">' + pct(c.feedback_rate) + '</span>'; }, null, 'n'],
        ['Avg time to feedback', function (c) { return esc(dur(c.avg_fb_hours)); }, null, 'n'],
        ['Interviews', function (c) { return num(c.interviews); }, null, 'n'],
        ['Placed', function (c) { return num(c.placed); }, null, 'n']
      ], cls, 'No packs went to clients in this period.') +
      (cls.length ? '<p class="tiny muted" style="margin:10px 0 0">Ghoster: 3 or more packs sent over 5 days ago, and feedback on fewer than 40% of them.</p>' : '') + '</section>';
    // recruiters
    if (owner && d.recruiters) {
      var rec = d.recruiters.filter(function (x) { return x.sent || x.placements || x.built || x.role; });
      h += '<section class="card pad rsec"><div class="rsec-h"><div><h2>Recruiters</h2><div class="small muted">Leaderboard for the whole agency</div></div>' + csvBtn('recruiters') + '</div>' +
        rtable('t-recruiters', [
          ['Recruiter', function (x) { var i = rec.indexOf(x); return '<span class="rank' + (i === 0 && x.fees > 0 ? ' top' : '') + '">' + (i + 1) + '</span>' + esc(x.name); }],
          ['Packs sent', function (x) { return num(x.sent); }, null, 'n'],
          ['Opens', function (x) { return num(x.opened); }, null, 'n'],
          ['Interviews', function (x) { return num(x.interviews); }, null, 'n'],
          ['Placements', function (x) { return num(x.placements); }, null, 'n'],
          ['Fees', function (x) { return '<b>' + esc(gbp(x.fees)) + '</b>'; }, null, 'n']
        ], rec, 'No recruiter activity in this period.') + '</section>';
    }
    // chasers and bank
    h += '<div class="rgrid"><section class="card pad rsec"><div class="rsec-h"><div><h2>Chasers</h2><div class="small muted">Do the automatic chasers work?</div></div></div>' +
      (ch.sent ? '<div class="big2"><b>' + pct(ch.reply_rate) + '</b><span>of chased packs got feedback within 48 hours of a chaser</span></div>' +
        '<div class="kv kv3"><div><b>Chasers sent</b><span>' + num(ch.sent) + '</span></div><div><b>Packs chased</b><span>' + num(ch.packs) + '</span></div><div><b>Replied in 48h</b><span>' + num(ch.replied_48h) + '</span></div></div>' +
        (ch.pending ? '<p class="tiny muted" style="margin:10px 0 0">' + ch.pending + ' chased in the last 48 hours, still waiting. Not counted yet.</p>' : '')
        : '<div class="empty">No chasers went out in this period.</div>') + '</section>' +
      '<section class="card pad rsec"><div class="rsec-h"><div><h2>Candidate bank</h2><div class="small muted">Is the bank earning?</div></div></div>' +
      '<div class="big2"><b>' + num(bk.packs_from_bank) + '</b><span>of ' + num(t.sent) + ' packs sent went to people already in your bank</span></div>' +
      '<div class="kv kv3"><div><b>In the bank</b><span>' + num(bk.total) + '</span></div><div><b>Added</b><span>' + num(bk.added) + '</span></div><div><b>Bank matches</b><span>' + num(bk.suggested) + '</span></div><div><b>Put forward</b><span>' + num(bk.put_forward) + (bk.suggested ? ' (' + pct(share(bk.put_forward, bk.suggested)) + ')' : '') + '</span></div><div><b>Placed from bank</b><span>' + num(bk.placed_from_bank) + '</span></div></div></section></div>';
    h += '<div class="row noprint" style="margin-top:16px;flex-wrap:wrap"><button class="btn" data-csv="summary">' + I.dl + 'All headline numbers as CSV</button><span class="tiny muted">Opens in Excel or Google Sheets.</span></div>';
    $('#rbody').innerHTML = h;
    $$('#rbody [data-act3="brief"]').forEach(function (b) { b.onclick = addBriefSheet; });

    var CSV = {
      summary: function () {
        var rows = [['Period', rangeLabel(r)], ['Scope', who], ['Packs sent', t.sent], ['Packs built', t.built], ['Packs opened', t.opened], ['Client open rate %', t.open_rate], ['Average hours to first open', t.avg_open_hours],
          ['Packs with feedback', t.feedback], ['Feedback rate %', t.feedback_rate], ['Interviews requested', t.interviews], ['Placements made', t.placements], ['Fees from packs GBP', Number(t.fees)],
          ['Minutes saved per pack (setting)', mins], ['Hours saved (estimate)', t.hours_saved], ['Chasers sent', ch.sent], ['Packs chased', ch.packs], ['Chased packs with feedback within 48h', ch.replied_48h], ['Chaser reply rate %', ch.reply_rate],
          ['Candidates in bank', bk.total], ['Candidates added', bk.added], ['Bank matches suggested', bk.suggested], ['Bank matches put forward', bk.put_forward], ['Packs sent to bank candidates', bk.packs_from_bank], ['Placements from bank', bk.placed_from_bank]];
        return [['Metric', 'Value'], rows];
      },
      funnel: function () { return [['Stage', 'Count', '% of previous stage', '% of sent'], funnelRows.map(function (f) { return [f.step, f.n, f.conv, f.ofSent]; })]; },
      placements: function () { return [['Candidate', 'Role', 'Client', 'Recruiter', 'Fee GBP', 'Start date', 'Placed on', 'From bank'], pls.map(function (x) { return [x.candidate, x.role, x.client, x.recruiter, Number(x.fee), x.start_date || '', String(x.placed_at).slice(0, 10), x.from_bank ? 'Yes' : 'No']; })]; },
      clients: function () { return [['Client', 'Packs sent', 'Opened', 'Open rate %', 'Feedback', 'Feedback rate %', 'Avg hours to feedback', 'Interviews', 'Placed', 'Ghoster'], cls.map(function (c) { return [c.client, c.sent, c.opened, c.open_rate, c.feedback, c.feedback_rate, c.avg_fb_hours, c.interviews, c.placed, c.ghost ? 'Yes' : 'No']; })]; },
      recruiters: function () { return [['Recruiter', 'Packs sent', 'Opens', 'Interviews', 'Placements', 'Fees GBP', 'Packs built'], (d.recruiters || []).map(function (x) { return [x.name, x.sent, x.opened, x.interviews, x.placements, Number(x.fees), x.built]; })]; }
    };
    $$('[data-csv]').forEach(function (b) {
      b.onclick = function () { var k = b.getAttribute('data-csv'); var c = CSV[k](); downloadCsv(fname(k), c[0], c[1]); toast('CSV downloaded.'); };
    });
  }

  // ---------- Bank ----------
  async function scBank(_a, _b, q) {
    setTop('Candidates', null, '<button class="btn pri sm" id="addcvtop">' + I.plus + '<span>Add CV</span></button>');
    $('#addcvtop').onclick = function () { addCvSheet(); };
    var f = q.f || 'all';
    view('<div class="wrap narrow"><div class="searchbar" style="margin-bottom:10px">' + I.search + '<input class="in" id="bq" type="search" placeholder="Search skills, titles, places" value="' + esc(q.s || '') + '" aria-label="Search your candidates"></div>' +
      '<div class="filters">' + [['all', 'Everyone'], ['short', 'Short notice'], ['avail', 'Available now'], ['review', 'Due for review']].map(function (x) { return '<button class="fbtn' + (x[0] === f ? ' on' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + qhint('Due for review: no contact for ' + ((S.agency && S.agency.retention_months) || 24) + ' months. UK GDPR says get in touch or delete them.') +
      '<select class="fbtn" id="bloc" aria-label="Location"><option value="">Any location</option></select></div><div id="bcount" class="small muted" style="margin:0 0 8px"></div><div class="list" id="blist"><div class="skel" style="height:72px"></div></div></div>');
    var cands = must(await sb.from('candidates').select('id,name,current_title,location,skills,salary_expectation,notice_period,availability,last_contacted_at,summary').order('last_contacted_at', { ascending: false }).limit(2000));
    var locs = Array.from(new Set(cands.map(function (c) { return (c.location || '').split(',')[0].trim(); }).filter(Boolean))).sort();
    $('#bloc').innerHTML += locs.map(function (l) { return '<option' + (q.l === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
    function draw() {
      var s = $('#bq').value.trim().toLowerCase(), loc = $('#bloc').value;
      var terms = s.split(/\s+/).filter(Boolean);
      var list = cands.filter(function (c) {
        var hay = [c.name, c.current_title, c.location, c.summary, (c.skills || []).join(' ')].join(' ').toLowerCase();
        if (terms.some(function (t) { return hay.indexOf(t) < 0; })) return false;
        if (loc && (c.location || '').indexOf(loc) !== 0) return false;
        var n = (c.notice_period || '').toLowerCase();
        if (f === 'short' && !/(^|\D)(1|one)\s*month|week|immediate|none|0/.test(n)) return false;
        if (f === 'avail' && !/immediate|now|available|none/.test((c.availability + ' ' + n).toLowerCase())) return false;
        if (f === 'review' && !retentionDue(c)) return false;
        return true;
      });
      $('#bcount').textContent = list.length + ' of ' + cands.length + ' candidates';
      $('#blist').innerHTML = list.length ? list.map(function (c) {
        var due = retentionDue(c);
        return '<a class="item" href="#/c/' + c.id + '"><div class="av">' + esc(initials(c.name)) + '</div><div class="bd"><div class="t1 ell">' + esc(c.name || 'Name needed') + '</div><div class="t2 ell">' + esc(c.current_title) + (c.location ? ' · ' + esc(c.location) : '') + '</div><div class="chips" style="margin-top:6px">' + (c.salary_expectation ? '<span class="chip line">' + esc(c.salary_expectation) + '</span>' : '') + (c.notice_period ? '<span class="chip line">' + esc(c.notice_period) + '</span>' : '') + (due ? '<span class="chip opened">Review</span>' : '') + '</div></div><div class="tiny muted" style="white-space:nowrap">' + ago(c.last_contacted_at) + '</div></a>';
      }).join('') : !cands.length ? emptyBox('Every CV you add is kept here, so you can find good people again for the next brief.', '<button class="btn pri" data-act3="cv">' + I.plus + 'Add a CV</button><button class="btn" data-w="sample">Try a sample</button>')
        : emptyBox('No one matches that.', '<button class="btn" id="bclear">Clear the search</button>');
      $$('[data-act3="cv"]').forEach(function (b) { b.onclick = function () { addCvSheet(); }; });
      if ($('#bclear')) $('#bclear').onclick = function () { $('#bq').value = ''; $('#bloc').value = ''; f = 'all'; $$('[data-f]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-f') === 'all'); }); draw(); };
    }
    draw();
    $('#bq').addEventListener('input', debounce(draw, 120));
    $('#bloc').onchange = draw;
    $$('[data-f]').forEach(function (b) { b.onclick = function () { f = b.getAttribute('data-f'); $$('[data-f]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
  }

  async function scCand(id) {
    var r = await Promise.all([
      sb.from('candidates').select('*').eq('id', id).maybeSingle(),
      sb.from('packs').select(PACK_LIST).eq('candidate_id', id).order('updated_at', { ascending: false }),
      sb.from('matches').select('score,reason,gaps,job_id,jobs(id,title,client_company,status)').eq('candidate_id', id).order('score', { ascending: false }),
      sb.from('events').select('*').eq('candidate_id', id).order('at', { ascending: false }).limit(50)
    ]);
    var c = must(r[0]); if (!c) throw new Error('That candidate was not found.');
    var packs = must(r[1]), matches = must(r[2]).filter(function (m) { return m.jobs && m.jobs.status === 'open'; }), ev = must(r[3]);
    setTop(c.name || 'Candidate', '#/bank');
    var due = retentionDue(c);
    var red = (c.redaction || []).filter(function (x) { return ['contact', 'name', 'title'].indexOf(x.key) < 0; });
    var packed = {}; packs.forEach(function (p) { packed[p.job_id] = 1; });
    var h = '<div class="wrap narrow">';
    if (!c.name) h += '<div class="warnbox flagbox">' + I.warn + '<div style="flex:1"><b>What is their name?</b> We could not find it on the CV.<div class="row" style="margin-top:8px"><input class="in" id="cname" placeholder="Full name"><button class="btn pri" id="savename">Save</button></div></div></div>';
    h += briefingCard({ name: c.name || 'Name needed', sub: [c.current_title, c.location].filter(Boolean).join(' · '), briefing: { key_points: c.key_points, flags: [] }, salary: c.salary_expectation, notice: c.notice_period, availability: c.availability, fit: c.summary, missing: c.missing,
      buttons: '<div class="callbar">' + (c.phone ? '<a class="btn call" href="' + telHref(c.phone) + '">' + I.phone + 'Call</a><a class="btn wa" href="' + waHref(c.phone, 'Hi ' + first(c.name) + ', ') + '" target="_blank" rel="noopener">' + I.wa + 'WhatsApp</a>' : '') + (c.email ? '<a class="btn" href="mailto:' + esc(c.email) + '">' + I.mail + 'Email</a>' : '') + '<button class="btn" id="touch">' + I.check + 'Contacted today</button></div>' });
    h += '<div class="okbox" style="margin-top:12px">' + I.shield + '<div>Stored and scored on skills and experience only.' + (red.length ? ' Removed: ' + esc(red.map(function (x) { return x.label.toLowerCase(); }).join(', ')) + '.' : '') + '</div></div>';
    if (due) h += '<div class="warnbox" style="margin-top:10px">' + I.warn + '<div><b>Due for review.</b> No contact in over ' + ((S.agency.retention_months) || 24) + ' months. Get in touch, or delete them under UK GDPR.</div></div>';
    if ((c.skills || []).length) h += '<div class="sec"><h2>Skills</h2></div><div class="chips">' + c.skills.map(function (s) { return '<span class="chip line">' + esc(s) + '</span>'; }).join('') + '</div>';
    h += '<div class="sec"><h2>Open briefs they fit</h2></div><div class="list">' + (matches.length ? matches.map(function (m) {
      return '<div class="item" style="cursor:default"><div class="score' + (m.score < 70 ? ' mid' : '') + '">' + m.score + '</div><div class="bd"><div class="t1 ell">' + esc(m.jobs.title) + '</div><div class="t2 ell">' + esc(m.jobs.client_company) + '</div><div class="why">' + esc(m.reason) + '</div></div>' + (packed[m.job_id] ? '<a class="btn sm" href="#/packs?job=' + m.job_id + '">Packs</a>' : '<button class="btn pri sm" data-build="' + m.job_id + '">Build pack</button>') + '</div>';
    }).join('') : emptyBox('No open briefs fit yet. Every new brief is checked against them by itself.', '<button class="btn" data-act3="brief">' + I.plus + 'Add a brief</button>')) + '</div>';
    h += '<div class="sec"><h2>Packs</h2></div><div class="list">' + (packs.length ? packs.map(function (p) { return packItem(p); }).join('') : '<div class="empty">Not put forward to a client yet.</div>') + '</div>';
    h += '<div class="sec"><h2>Notes</h2><span class="muted">Personal details are taken out when you save</span></div><textarea class="in" id="cnotes" style="min-height:120px">' + esc(c.notes) + '</textarea><div class="row" style="margin-top:8px"><button class="btn rec" id="crec" type="button"><span class="pulse"></span>' + I.mic + '<span class="lbl">Record notes</span></button><span class="sp"></span><button class="btn" id="savenotes">Save notes</button></div>';
    h += '<div class="sec"><h2>History</h2></div><div class="card pad"><div class="tl">' + ev.map(function (e) { var f = EV[e.type] || function () { return e.type; }; return '<div class="ev ' + esc(e.type) + '"><div class="t">' + esc(f(e.meta || {})) + '</div><div class="w">' + esc(when(e.at)) + '</div></div>'; }).join('') + '<div class="ev added"><div class="t">First added</div><div class="w">' + esc(when(c.created_at)) + '</div></div></div></div>';
    h += '<div class="sec"><h2>Data</h2></div><div class="row flexwrap">' + (c.cv_file_path ? '<button class="btn" id="origcv">' + I.file + 'Original CV</button>' : '') + '<button class="btn danger" id="delc">' + I.trash + 'Delete candidate</button></div><p class="tiny muted" style="margin-top:8px">Last contacted ' + esc(when(c.last_contacted_at)) + '. Deleting removes the record, the CV file, their packs and all history for good.</p></div>';
    view(h);
    $$('[data-act3="brief"]').forEach(function (b) { b.onclick = addBriefSheet; });
    recorder($('#crec'), $('#cnotes'));
    if ($('#savename')) $('#savename').onclick = async function () { var n = $('#cname').value.trim(); if (!n) return; must(await sb.from('candidates').update({ name: n }).eq('id', c.id)); toast('Saved.'); scCand(c.id); };
    $('#touch').onclick = async function () {
      must(await sb.from('candidates').update({ last_contacted_at: new Date().toISOString() }).eq('id', c.id));
      must(await sb.from('events').insert({ agency_id: S.agency.id, candidate_id: c.id, type: 'contacted' }));
      toast('Marked as contacted today.'); scCand(c.id);
    };
    $('#savenotes').onclick = async function () {
      var red2 = PackRedact.redact($('#cnotes').value, c.name);
      must(await sb.from('candidates').update({ notes: red2.text, last_contacted_at: new Date().toISOString() }).eq('id', c.id));
      var gone = red2.removed.filter(function (x) { return ['name', 'contact'].indexOf(x.key) < 0; });
      toast(gone.length ? 'Saved. Taken out: ' + gone.map(function (x) { return x.label.toLowerCase(); }).join(', ') + '.' : 'Notes saved.');
      $('#cnotes').value = red2.text;
    };
    $$('[data-build]').forEach(function (b) { b.onclick = function () { buildPacks(b.getAttribute('data-build'), [c]); }; });
    if ($('#origcv')) $('#origcv').onclick = async function () {
      var r2 = await sb.storage.from('cvs').createSignedUrl(c.cv_file_path, 120);
      if (r2.error) return toast(r2.error.message, true);
      window.open(r2.data.signedUrl, '_blank');
    };
    $('#delc').onclick = async function () {
      if (!(await confirmBox('Delete ' + (c.name || 'this candidate') + '?', 'This deletes their record, CV file, packs and history for good. It cannot be undone.', 'Delete for good', true))) return;
      if (c.cv_file_path) await sb.storage.from('cvs').remove([c.cv_file_path]);
      must(await sb.from('candidates').delete().eq('id', c.id));
      toast('Deleted.'); location.hash = '#/bank';
    };
  }

  // ---------- Briefs ----------
  async function scBriefs() {
    setTop('Briefs', null, '<button class="btn pri sm" id="addbtop">' + I.plus + '<span>Add brief</span></button>');
    $('#addbtop').onclick = addBriefSheet;
    view('<div class="wrap narrow"><div class="list" id="jlist"><div class="skel" style="height:72px"></div></div></div>');
    var jobs = must(await sb.from('jobs').select('id,title,client_company,status,created_at,matches(count),packs(count)').order('created_at', { ascending: false }));
    $('#jlist').innerHTML = jobs.length ? jobs.map(function (j) {
      var mc = (j.matches[0] || {}).count || 0, pc = (j.packs[0] || {}).count || 0;
      return '<a class="item" href="#/job/' + j.id + '"><div class="av">' + I.briefs.replace('<svg', '<svg width="20" height="20"') + '</div><div class="bd"><div class="t1 ell">' + esc(j.title) + '</div><div class="t2 ell">' + esc(j.client_company) + ' · ' + ago(j.created_at) + '</div><div class="chips" style="margin-top:6px"><span class="chip ' + (j.status === 'open' ? 'feedback' : 'closed') + '">' + esc(j.status[0].toUpperCase() + j.status.slice(1)) + '</span><span class="chip line">' + mc + ' ' + (mc === 1 ? 'match' : 'matches') + '</span><span class="chip line">' + pc + ' pack' + (pc === 1 ? '' : 's') + '</span></div></div></a>';
    }).join('') : emptyBox('Each job a client gives you goes here. Paste it in and we find who fits from your candidates.', '<button class="btn pri" data-act3="brief">' + I.plus + 'Add a brief</button><button class="btn" data-w="sample">Try a sample</button>');
    $$('#jlist [data-act3="brief"]').forEach(function (b) { b.onclick = addBriefSheet; });
  }

  async function scJob(id, _x, q) {
    var r = await Promise.all([
      sb.from('jobs').select('*').eq('id', id).maybeSingle(),
      sb.from('matches').select('score,reason,gaps,source,candidate_id,candidates(id,name,current_title,location,salary_expectation,notice_period)').eq('job_id', id).order('score', { ascending: false }),
      getPacks({ job: id })
    ]);
    var j = must(r[0]); if (!j) throw new Error('That brief was not found.');
    var matches = must(r[1]).filter(function (m) { return m.candidates; }), packs = r[2];
    var packed = {}; packs.forEach(function (p) { packed[p.candidate_id] = p; });
    var fresh = matches.filter(function (m) { return !packed[m.candidate_id]; });
    setTop(j.title, '#/briefs');
    var sel = {};
    if (q.new) fresh.forEach(function (m, i) { if (m.score >= 70 && i < 3) sel[m.candidate_id] = 1; });
    if (q.pick && fresh.some(function (m) { return m.candidate_id === q.pick; })) sel[q.pick] = 1;
    var isSample = !isDemo() && !!j.sample_id;
    var warn = (j.brief_warnings || []).length ? '<div class="warnbox flagbox">' + I.warn + '<div>This brief mentions <b>' + esc(j.brief_warnings.map(function (w) { return w.words.join(', '); }).join(', ')) + '</b>. That is ignored: everyone is scored on skills and experience only.</div></div>' : '';
    var h = '<div class="wrap narrow">' + (isSample ? '<div class="samplebar" style="margin-bottom:12px">' + I.spark + '<div class="sp">A made-up sample brief, so you can try it. Remove it from Today any time.</div></div>' : '') + warn;
    h += '<div class="card pad"><div class="row" style="align-items:flex-start"><div class="sp" style="min-width:0"><div class="small muted">' + esc(j.client_company) + '</div><h2 style="margin:2px 0 6px">' + esc(j.title) + '</h2></div><select class="in" id="jstatus" style="width:auto;min-height:38px;padding:6px 10px;font-size:14px" aria-label="Brief status">' + ['open', 'filled', 'closed'].map(function (s) { return '<option value="' + s + '"' + (j.status === s ? ' selected' : '') + '>' + s[0].toUpperCase() + s.slice(1) + '</option>'; }).join('') + '</select></div>' +
      '<p style="color:var(--ink-2)">' + esc(j.summary) + '</p>' +
      '<div class="kv" style="margin:12px 0"><div><b>Salary</b><span>' + esc(j.salary_band || 'Not given') + '</span></div><div><b>Location</b><span>' + esc(j.location || 'Not given') + '</span></div></div>' +
      '<div class="small b" style="margin:12px 0 6px">Must haves</div><ul style="margin:0;padding-left:20px">' + (j.must_haves || []).map(function (m) { return '<li style="margin-bottom:4px">' + esc(m) + '</li>'; }).join('') + '</ul>' +
      ((j.nice_to_haves || []).length ? '<div class="small b" style="margin:12px 0 6px">Nice to haves</div><div class="chips">' + j.nice_to_haves.map(function (m) { return '<span class="chip line">' + esc(m) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="small b" style="margin:16px 0 6px">Client contact</div><div class="grid2"><input class="in" data-jf="client_contact_name" placeholder="Name" value="' + esc(j.client_contact_name) + '" aria-label="Client contact name"><input class="in" data-jf="client_phone" placeholder="Phone" inputmode="tel" value="' + esc(j.client_phone) + '" aria-label="Client phone"><input class="in" data-jf="client_email" placeholder="Email" inputmode="email" value="' + esc(j.client_email) + '" aria-label="Client email"><input class="in" data-jf="salary_band" placeholder="Salary" value="' + esc(j.salary_band) + '" aria-label="Salary"></div>' +
      ((j.missing || []).length ? '<div class="warnbox" style="margin-top:12px">' + I.warn + '<div><b>Not in the brief:</b> ' + esc(j.missing.join('; ')) + '</div></div>' : '') + '</div>';
    h += '<div style="margin-top:18px" id="mhead">' + (fresh.length ? '<div class="banner"><div class="n">' + fresh.length + '</div><div><div class="t">You already have ' + (fresh.length === 1 ? '1 person' : fresh.length + ' people') + ' who fit this</div><div class="s">Ranked on skills and experience only. Tick who to put forward, then tap Build. ' + qhint('The number is a match score out of 100: how well their experience meets the must haves.') + '</div></div></div>' : packs.length ? '' : emptyBox('No one in your candidates fits this yet. Add a CV and it is checked against this brief straight away.', '<button class="btn pri" data-act3="cvjob">' + I.upload + 'Add a CV</button>')) + '</div>';
    h += '<div class="list" style="margin-top:12px" id="mlist">' + fresh.map(function (m) {
      var c = m.candidates;
      return '<div class="match' + (sel[c.id] ? ' on' : '') + '" data-m="' + c.id + '" role="checkbox" aria-checked="' + (!!sel[c.id]) + '" tabindex="0"><div class="tick">' + I.check + '</div><div class="bd" style="flex:1;min-width:0"><div class="row"><div class="t1 ell sp" style="font-weight:750">' + esc(c.name) + '</div><div class="score' + (m.score < 70 ? ' mid' : '') + '">' + m.score + '</div></div><div class="t2 small muted ell">' + esc(c.current_title) + (c.location ? ' · ' + esc(c.location) : '') + '</div><div class="why">' + esc(m.reason) + '</div>' + (m.gaps && !/^none/i.test(m.gaps) ? '<div class="gap">Gap: ' + esc(m.gaps) + '</div>' : '') + '<a class="tiny" href="#/c/' + c.id + '" onclick="event.stopPropagation()">View profile</a></div></div>';
    }).join('') + '</div>';
    if (packs.length) h += '<div class="sec"><h2>Packs for this brief</h2></div><div class="list">' + packs.map(function (p) { return packItem(p); }).join('') + '</div>';
    h += '<details style="margin-top:18px"><summary class="small muted" style="cursor:pointer">Original brief</summary><pre style="white-space:pre-wrap;font-family:inherit;font-size:13.5px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px;overflow-wrap:anywhere">' + esc(j.brief_text) + '</pre></details></div>';
    // One obvious action: Build when there is someone to build for, otherwise Add CVs.
    view(h, fresh.length ? '<button class="btn" id="dropcv">' + I.upload + '<span>Add CVs</span></button><button class="btn pri" id="build" disabled>Build packs</button>' : '<button class="btn pri" id="dropcv">' + I.upload + '<span>Add CVs for this brief</span></button>');
    function upd() {
      var n = Object.keys(sel).length;
      var b = $('#build'); if (!b) return;
      b.disabled = !n; b.textContent = n ? 'Build ' + n + ' pack' + (n > 1 ? 's' : '') : 'Tick people first';
    }
    upd();
    $$('[data-m]').forEach(function (el) {
      function tog() { var k = el.getAttribute('data-m'); if (sel[k]) delete sel[k]; else sel[k] = 1; el.classList.toggle('on', !!sel[k]); el.setAttribute('aria-checked', !!sel[k]); upd(); }
      el.onclick = tog; el.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog(); } };
    });
    $$('[data-act3="cvjob"]').forEach(function (b) { b.onclick = function () { addCvSheet(j); }; });
    if ($('#build')) $('#build').onclick = function () { buildPacks(j.id, fresh.filter(function (m) { return sel[m.candidate_id]; }).map(function (m) { return m.candidates; })); };
    $('#dropcv').onclick = function () { addCvSheet(j); };
    $('#jstatus').onchange = async function () { must(await sb.from('jobs').update({ status: this.value }).eq('id', j.id)); toast('Brief marked ' + this.value + '.'); };
    $$('[data-jf]').forEach(function (el) { el.onchange = async function () { var o = {}; o[el.getAttribute('data-jf')] = el.value.trim(); must(await sb.from('jobs').update(o).eq('id', j.id)); toast('Saved.'); }; });
  }

  // Ask only for what is missing, then build the packs in parallel.
  async function buildPacks(jobId, cands) {
    if (!cands.length) return;
    var full = must(await sb.from('candidates').select('id,name,salary_expectation,notice_period,availability').in('id', cands.map(function (c) { return c.id; })));
    var gaps = full.filter(function (c) { return !c.salary_expectation || !c.notice_period; });
    var extra = {};
    if (gaps.length) {
      var go = await new Promise(function (ok) {
        var el = sheet('A couple of quick details', '<p class="muted">These are not in the CV or your notes. Add them if you know them, or tap Skip and the pack says "Not given".</p>' + gaps.map(function (c) {
          return '<div class="card pad" style="margin-bottom:10px"><div class="b" style="margin-bottom:8px">' + esc(c.name) + '</div><div class="grid2">' + (!c.salary_expectation ? '<input class="in" data-g="' + c.id + '" data-k="salary" placeholder="Salary expectation">' : '') + (!c.notice_period ? '<input class="in" data-g="' + c.id + '" data-k="notice" placeholder="Notice period">' : '') + '</div></div>';
        }).join(''), '<button class="btn" data-skip>Skip</button><button class="btn pri" data-go>Build</button>');
        $('[data-skip]', el).onclick = function () { closeSheet(); ok(true); };
        $('[data-go]', el).onclick = function () { $$('[data-g]', el).forEach(function (i) { if (i.value.trim()) { extra[i.getAttribute('data-g')] = extra[i.getAttribute('data-g')] || {}; extra[i.getAttribute('data-g')][i.getAttribute('data-k')] = i.value.trim(); } }); closeSheet(); ok(true); };
        $('[data-close]', el).onclick = function () { closeSheet(); ok(false); };
      });
      if (!go) return;
    }
    var t = think(WORDS.pack, cands.length > 1 ? 'Writing ' + cands.length + ' packs side by side. About a minute.' : 'About a minute. The CV, the fit and the questions, in your voice.', true);
    var made = [], failed = [];
    var queue = cands.slice();
    await Promise.all([0, 1, 2].map(async function () {
      while (queue.length) {
        var c = queue.shift();
        try { var r = await fn('generate_pack', Object.assign({ job_id: jobId, candidate_id: c.id }, extra[c.id] || {})); made.push(r.pack); }
        catch (e) { failed.push((c.name || 'One candidate') + ': ' + e.message); }
      }
    }));
    t.stop();
    if (failed.length) toast(failed.join(' '), true);
    if (made.length) tickPop(made.length === 1 ? 'Pack ready' : made.length + ' packs ready');
    if (made.length === 1) { location.hash = '#/pack/' + made[0].id; toast('Pack ready. Read it, change any line, then send.'); }
    else if (made.length) { location.hash = '#/packs?f=draft&job=' + jobId; toast(made.length + ' packs ready to check.'); }
  }

  // ---------- Add brief ----------
  // Demo agency: samples only. Pick one, see what came in, tap once.
  function sampleOpts(list, pick) {
    return '<div class="sopts" role="radiogroup">' + list.map(function (x) {
      return '<button type="button" class="sopt' + (x.id === pick ? ' on' : '') + '" data-s="' + esc(x.id) + '" role="radio" aria-checked="' + (x.id === pick) + '"><span class="rd"></span><span class="sp" style="min-width:0"><span class="t1">' + esc(x.label) + '</span><span class="t2">' + esc(x.sub || '') + '</span></span></button>';
    }).join('') + '</div>';
  }
  async function demoPicker(kind, job) {
    var list;
    try { list = (await samples()).filter(function (x) { return x.kind === kind; }); } catch (e) { return toast(e.message, true); }
    if (!list.length) return toast('The samples are not available right now. Try again in a minute.', true);
    var pick = list[0].id;
    if (kind === 'cv' && job && job.sample_id) { var p = list.find(function (x) { return x.pair === job.sample_id; }); if (p) pick = p.id; }
    var brief = kind === 'brief';
    var el = sheet(brief ? 'Add brief' : (job ? 'Add CV for ' + job.title : 'Add CV'),
      '<p class="muted" style="margin-bottom:12px">' + (brief ? 'Pick a sample brief. We pull out the job, search your candidates and show who fits.' : 'Pick a sample CV. We take out personal details, add them to your candidates and check every open brief.') + '</p>' +
      sampleOpts(list, pick) +
      '<div class="small b" style="margin:16px 0 6px">' + (brief ? 'What the client sent' : 'The CV as it arrived') + '</div><pre class="spre" id="spre"></pre>' +
      (brief ? '' : '<div class="small b" style="margin:14px 0 6px">Your interview notes</div><pre class="spre" id="snotes" style="max-height:130px"></pre><div class="okbox" style="margin-top:12px">' + I.shield + '<div>Age, date of birth, nationality, family, health, photos and contact details are taken out before anything is stored or scored.</div></div>') +
      '<p class="ownline">' + esc(OWN_LINE) + '</p>',
      '<button class="btn pri lg" id="spgo">' + (brief ? 'Find my people' : 'Add to my candidates') + '</button>');
    function show() {
      var x = list.find(function (y) { return y.id === pick; });
      $('#spre', el).textContent = x.text;
      if ($('#snotes', el)) $('#snotes', el).textContent = x.notes || 'No notes.';
      $$('[data-s]', el).forEach(function (b) { var on = b.getAttribute('data-s') === pick; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    }
    $$('[data-s]', el).forEach(function (b) { b.onclick = function () { pick = b.getAttribute('data-s'); show(); }; });
    show();
    $('#spgo', el).onclick = async function () {
      closeSheet();
      var t = brief ? think(WORDS.brief, 'Checking every candidate you have against this brief.', true) : think(WORDS.cv, 'Saving them with your candidates and checking every open brief.', true);
      try {
        if (brief) { var r = await fn('add_brief', { sample_id: pick }); t.stop(); location.hash = '#/job/' + r.job.id + '?new=1'; }
        else { var r2 = await fn('add_cv', { sample_id: pick, job_id: job ? job.id : null }); t.stop(); cvResult(r2, job); }
      } catch (e) { t.stop(); toast(e.message, true); }
    };
  }

  function addBriefSheet() {
    if (isDemo()) return demoPicker('brief');
    var el = sheet('Add brief',
      '<p class="muted" style="margin-bottom:12px">Paste the brief or the client\'s email. We pull out the job, search your candidates and show who fits.</p>' +
      '<textarea class="in" id="btxt" style="min-height:220px" placeholder="Paste the brief here"></textarea>' +
      '<div class="hint">' + I.mic + 'On a phone, tap the mic on your keyboard to dictate it.</div>' +
      '<div class="or">or</div><label class="drop" id="bdrop"><input type="file" id="bfile" accept=".pdf,.docx,.txt,.eml,text/plain,application/pdf" hidden><div class="big">Upload the brief</div><div class="small muted">PDF, Word or text, from Files, iCloud or email</div></label>' +
      '<button class="btn ghost block" data-w="sample" style="margin-top:10px">No brief to hand? Try it with a sample</button>',
      '<button class="btn pri lg" id="bgo">Find my people</button>');
    var ta = $('#btxt');
    $('#bfile').onchange = async function () {
      var f = this.files[0]; if (!f) return;
      try { ta.value = await extractText(f); toast('Brief read from ' + f.name + '.'); } catch (e) { toast(e.message, true); }
    };
    dropzone($('#bdrop'), async function (f) { try { ta.value = await extractText(f); } catch (e) { toast(e.message, true); } });
    $('#bgo').onclick = async function () {
      var txt = ta.value.trim();
      if (txt.length < 40) { toast('Paste in the whole brief first, or upload the file.', true); ta.focus(); return; }
      closeSheet();
      var t = think(WORDS.brief, 'Checking every candidate you have against this brief.', true);
      try { var r = await fn('add_brief', { brief: txt }); t.stop(); location.hash = '#/job/' + r.job.id + '?new=1'; }
      catch (e) { t.stop(); toast(e.message, true); }
    };
  }
  function dropzone(el, cb) {
    ['dragenter', 'dragover'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove('over'); }); });
    el.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) cb(f); });
  }

  // ---------- Add CV ----------
  function addCvSheet(job) {
    if (isDemo()) return demoPicker('cv', job);
    var file = null;
    var el = sheet(job ? 'Add CV for ' + job.title : 'Add CV',
      '<label class="drop" id="cdrop"><input type="file" id="cfile" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden><div class="big" id="cfname">Drop in the CV</div><div class="small muted">PDF or Word. On a phone: Files, iCloud or an email attachment.</div></label>' +
      '<details style="margin-top:10px" id="cpastewrap"><summary class="small" style="cursor:pointer;color:var(--brand);font-weight:650">Or paste the CV text</summary><textarea class="in" id="ctxt" style="margin-top:8px" placeholder="Paste the CV here"></textarea></details>' +
      '<div class="field" style="margin-top:16px"><label class="f" for="cnote">Your interview notes <span class="muted">(optional)</span></label><textarea class="in" id="cnote" style="min-height:120px" placeholder="Why they are moving, salary, notice, your view"></textarea>' +
      '<div class="row" style="margin-top:8px"><button class="btn rec" id="crec2" type="button"><span class="pulse"></span>' + I.mic + '<span class="lbl">Record notes</span></button><span class="hint" style="margin:0">or tap the keyboard mic</span></div></div>' +
      '<div class="okbox">' + I.shield + '<div>Age, date of birth, nationality, family, health, photos and contact details are taken out before anything is stored or scored.</div></div>',
      '<button class="btn pri lg" id="cgo">Add to my candidates</button>');
    recorder($('#crec2'), $('#cnote'));
    function pick(f) { file = f; $('#cfname').textContent = f.name; }
    $('#cfile').onchange = function () { if (this.files[0]) pick(this.files[0]); };
    dropzone($('#cdrop'), pick);
    $('#cgo').onclick = async function () {
      var text = '';
      try { text = file ? await extractText(file) : $('#ctxt').value.trim(); } catch (e) { return toast(e.message, true); }
      if (text.length < 80) { toast(file ? 'We could not read any text in that file. If it is a scanned picture, open it, copy the text and paste it in instead.' : 'Choose the CV file first, or paste the CV text.', true); return; }
      var notes = $('#cnote').value.trim();
      closeSheet();
      var t = think(WORDS.cv, 'Saving them with your candidates and checking every open brief.', true);
      try {
        var path = null;
        if (file) {
          path = S.agency.id + '/' + (crypto.randomUUID ? crypto.randomUUID() : Date.now()) + '/' + file.name.replace(/[^\w.\-]+/g, '_');
          var up = await sb.storage.from('cvs').upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (up.error) path = null;
        }
        var r = await fn('add_cv', { cv_text: text, notes: notes, cv_file_path: path, job_id: job ? job.id : null });
        t.stop();
        cvResult(r, job);
      } catch (e) { t.stop(); toast(e.message, true); }
    };
  }
  function cvResult(r, job) {
    var c = r.candidate;
    var red = (c.redaction || []).filter(function (x) { return x.key !== 'name'; });
    var body = '<div class="card pad"><div class="row"><div class="av red">' + esc(initials(c.name)) + '</div><div class="sp" style="min-width:0"><div class="b ell" style="font-size:17px">' + esc(c.name || 'Name needed') + '</div><div class="small muted ell">' + esc(c.current_title) + (c.location ? ' · ' + esc(c.location) : '') + '</div></div><span class="chip feedback">Added</span></div>' +
      (r.needs_name ? '<div class="row" style="margin-top:12px"><input class="in" id="nm" placeholder="Their full name (not on the CV)"><button class="btn pri" id="nmsave">Save</button></div>' : '') +
      '<p style="margin:12px 0 0;color:var(--ink-2)">' + esc(c.summary) + '</p></div>' +
      '<div class="okbox" style="margin-top:12px">' + I.shield + '<div><b>Taken out before the AI saw it:</b> ' + (red.length ? esc(red.map(function (x) { return x.label.toLowerCase() + (x.count > 1 ? ' (' + x.count + ')' : ''); }).join(', ')) : 'nothing sensitive found') + '.</div></div>';
    body += '<div class="sec"><h2>' + (r.matches.length ? 'Fits ' + r.matches.length + ' open brief' + (r.matches.length > 1 ? 's' : '') : 'No open briefs fit yet') + '</h2></div><div class="list">' + r.matches.map(function (m) {
      return '<div class="item" style="cursor:default"><div class="score' + (m.score < 70 ? ' mid' : '') + '">' + m.score + '</div><div class="bd"><div class="t1 ell">' + esc(m.job ? m.job.title : '') + '</div><div class="t2 ell">' + esc(m.job ? m.job.client_company : '') + '</div><div class="why">' + esc(m.reason) + '</div></div><button class="btn pri sm" data-bp="' + m.id + '">Build pack</button></div>';
    }).join('') + '</div>';
    if (!r.matches.length) body += '<p class="muted small" style="margin-top:8px">They are saved with your candidates. Every new brief is checked against them by itself.</p>';
    var el = sheet('Added to your candidates', body, '<a class="btn" href="#/c/' + c.id + '" id="vprof">View profile</a>' + (job ? '<a class="btn pri" href="#/job/' + job.id + '" id="vjob">Back to the brief</a>' : '<button class="btn pri" id="another">Add another</button>'));
    $$('[data-bp]', el).forEach(function (b) { b.onclick = function () { closeSheet(); buildPacks(b.getAttribute('data-bp'), [c]); }; });
    if ($('#another')) $('#another').onclick = function () { addCvSheet(); };
    if ($('#vjob')) $('#vjob').onclick = function () { closeSheet(); setTimeout(route, 0); };
    if ($('#nmsave')) $('#nmsave').onclick = async function () { var n = $('#nm').value.trim(); if (!n) return; must(await sb.from('candidates').update({ name: n }).eq('id', c.id)); c.name = n; toast('Saved.'); };
  }

  // ---------- Settings ----------
  var COLOURS = ['#C8102E', '#0E1014', '#1F4FD8', '#0F766E', '#6D28D9', '#B45309', '#BE185D', '#15803D'];
  var TPLS = [['classic', 'Classic'], ['executive', 'Executive'], ['modern', 'Modern'], ['minimal', 'Minimal']];
  async function scSettings(_a, _b, q) {
    setTop('Settings');
    var a = S.agency, owner = S.me.role === 'owner';
    var h = '<div class="wrap narrow">';
    h += '<div class="sec"><h2>You</h2></div><div class="card pad"><div class="grid2"><div><label class="f" for="mn">Name</label><input class="in" id="mn" value="' + esc(S.me.name) + '"></div><div><label class="f" for="mp">Mobile (shown to clients)</label><input class="in" id="mp" inputmode="tel" value="' + esc(S.me.phone || '') + '"></div></div><div class="row flexwrap" style="margin-top:12px"><span class="small muted sp">' + esc(S.me.email) + '</span><button class="btn" id="chpw">Change password</button><button class="btn" id="saveme">Save</button></div></div>';
    h += '<div class="sec"><h2>On your phone</h2></div><div class="card pad"><p style="margin:0 0 10px">Install Candidate Pack on your home screen and it opens full screen like an app.</p><p class="small muted" style="margin:0">iPhone: tap Share, then <b>Add to Home Screen</b>. Android: tap the menu, then <b>Install app</b>.</p>' + (S.deferredInstall ? '<button class="btn pri" id="inst" style="margin-top:12px">Install now</button>' : '') + '</div>';
    if (owner) {
      h += '<div class="sec" id="s-brand"><h2>Your brand</h2><span class="muted">What clients see. Saves as you tap.</span></div><div class="card pad">' +
        '<label class="f">Logo</label><div class="row" style="margin-bottom:14px"><div class="mark" style="width:56px;height:56px;border-radius:14px">' + (a.logo_url ? '<img src="' + esc(a.logo_url) + '" alt="">' : esc(initials(a.name))) + '</div><label class="btn">' + I.upload + 'Upload logo<input type="file" id="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden></label></div>' +
        '<label class="f">Colour</label><div class="swatches" style="margin-bottom:8px">' + COLOURS.map(function (c) { return '<button class="sw' + (c.toLowerCase() === a.brand_colour.toLowerCase() ? ' on' : '') + '" data-col="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '"></button>'; }).join('') + '</div><input class="in" id="colour" value="' + esc(a.brand_colour) + '" style="max-width:160px;margin-bottom:14px" aria-label="Brand colour hex">' +
        '<label class="f" for="font">Font</label><select class="in" id="font" style="margin-bottom:14px">' + ['Inter', 'Manrope', 'DM Sans', 'Lora', 'Playfair Display'].map(function (f) { return '<option' + (f === a.font ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select>' +
        '<label class="f">Pack layout</label><div class="tpls">' + TPLS.map(function (t) { return '<button class="tpl' + (t[0] === a.template_key ? ' on' : '') + '" data-tpl="' + t[0] + '"><div class="pv">' + tplPreview(t[0], a.brand_colour) + '</div><div class="nm">' + t[1] + '</div></button>'; }).join('') + '</div></div>';
      h += '<div class="sec" id="s-voice"><h2>Your voice</h2>' + qhint('Packs copy the tone and style of these. They never copy facts from them.') + '</div><div class="card pad"><label class="f" for="voice">Paste two or three write-ups you have sent to clients. Every pack is written to sound like these.</label><textarea class="in" id="voice" style="min-height:200px" placeholder="Paste a past candidate write-up here, then another below it">' + esc(a.voice_samples) + '</textarea><div class="row" style="margin-top:10px"><span class="small muted sp" data-saved="voice"></span><button class="btn" data-savetext="voice">Save voice</button></div></div>';
      h += '<div class="sec"><h2>Client chasers</h2>' + qhint('Words in curly brackets are filled in for each pack, for example {client_first_name} becomes Nadia.') + '</div><div class="card pad"><p class="small muted">Polite reminders that go by themselves in UK working hours if the client has not replied. They stop the moment the client answers.</p><label class="f" for="c48">After 48 hours</label><textarea class="in" id="c48" style="min-height:110px;margin-bottom:12px">' + esc(a.chaser_48h) + '</textarea><label class="f" for="c5">After 5 days</label><textarea class="in" id="c5" style="min-height:110px">' + esc(a.chaser_5d) + '</textarea><div class="row" style="margin-top:10px"><span class="small muted sp" data-saved="chasers"></span><button class="btn" data-savetext="chasers">Save chasers</button></div></div>';
      h += '<div class="sec" id="s-team"><h2>Team</h2><span class="muted" id="seats"></span></div><div class="card pad"><div id="team"><div class="skel" style="height:50px"></div></div><div class="grid2" style="margin-top:12px"><input class="in" id="tn" placeholder="Name"><input class="in" id="te" type="email" placeholder="Email"></div><div class="row" style="margin-top:10px"><select class="in" id="tr" style="width:auto"><option value="recruiter">Recruiter</option><option value="owner">Owner</option></select><span class="sp"></span><button class="btn pri" id="tadd">Add teammate</button></div><p class="small muted" style="margin:10px 0 0">They get their own login. You send them the details on the next screen.</p></div>';
      h += '<div class="sec"><h2>Data and UK GDPR</h2></div><div class="card pad"><p style="margin:0 0 10px">You are the data controller for your candidates; ApexLine is your processor under our data processing agreement. <b>Give every candidate your privacy notice</b> when you add them.</p><label class="f" for="ret">Flag candidates for review after no contact for</label><div class="row" style="margin-bottom:12px"><select class="in" id="ret" style="width:auto">' + [6, 12, 18, 24, 36].map(function (m) { return '<option value="' + m + '"' + (m === a.retention_months ? ' selected' : '') + '>' + m + ' months</option>'; }).join('') + '</select><button class="btn" id="saveret">Save</button></div><button class="btn" id="export">' + I.dl + 'Export all your data</button></div>';
      h += '<div class="sec" id="s-reports"><h2>Reports</h2></div><div class="card pad"><label class="f" for="mpp">Minutes a pack saves your recruiters</label><div class="row" style="margin-bottom:8px"><input class="in" id="mpp" type="number" min="5" max="480" inputmode="numeric" style="max-width:110px" value="' + (a.minutes_per_pack || 45) + '"><span class="muted">minutes</span><span class="sp"></span><button class="btn" id="savempp">Save</button></div><p class="small muted" style="margin:0">Hours saved on Reports is an estimate: packs built times this number. Set it to what one pack used to take by hand: formatting the CV, writing the fit summary and the email.</p></div>';
    }
    h += '<div class="sec"><h2>Account</h2></div><div class="card pad"><div class="row"><div class="sp small muted">' + esc(a.name) + ' · ' + esc(a.status === 'trial' ? 'Trial' : 'Active') + '</div><button class="btn" id="signout">' + I.out + 'Log out</button></div></div></div>';
    view(h);
    $('#chpw').onclick = changePassword;
    $('#saveme').onclick = async function () { must(await sb.from('members').update({ name: $('#mn').value.trim(), phone: $('#mp').value.trim() }).eq('user_id', S.me.user_id)); S.me.name = $('#mn').value.trim(); S.me.phone = $('#mp').value.trim(); toast('Saved.'); };
    $('#signout').onclick = signOut;
    if ($('#inst')) $('#inst').onclick = function () { S.deferredInstall.prompt(); };
    if (!owner) return;
    // Branding saves the moment you tap it. Long text saves with its own button or when you leave the box.
    async function saveAgency(row, msg, brand) {
      var res = await sb.from('agencies').update(row).eq('id', a.id).select().single();
      if (res.error) { toast(res.error.message, true); return false; }
      S.agency = a = res.data; applyBrand();
      if (brand && !meta().colours_done) setMeta({ colours_done: true }).catch(function () {});
      if (msg) toast(msg);
      return true;
    }
    $$('[data-col]').forEach(function (b) { b.onclick = function () { var c = b.getAttribute('data-col'); $('#colour').value = c; $$('[data-col]').forEach(function (x) { x.classList.toggle('on', x === b); }); saveAgency({ brand_colour: c }, 'Colour saved. Packs use it straight away.', true); }; });
    $('#colour').onchange = function () { var v = this.value.trim(); if (!/^#[0-9a-f]{6}$/i.test(v)) return toast('Use a colour code like #C8102E.', true); $$('[data-col]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-col').toLowerCase() === v.toLowerCase()); }); saveAgency({ brand_colour: v }, 'Colour saved.', true); };
    $('#font').onchange = function () { saveAgency({ font: this.value }, 'Font saved.', true); };
    $$('[data-tpl]').forEach(function (b) { b.onclick = function () { $$('[data-tpl]').forEach(function (x) { x.classList.toggle('on', x === b); }); saveAgency({ template_key: b.getAttribute('data-tpl') }, 'Layout saved.', true); }; });
    function textSaver(key, row) {
      var mark = $('[data-saved="' + key + '"]');
      var go = async function () { if (await saveAgency(row())) mark.textContent = 'Saved ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
      $('[data-savetext="' + key + '"]').onclick = go;
      return go;
    }
    var sv = textSaver('voice', function () { return { voice_samples: $('#voice').value }; });
    $('#voice').onchange = sv;
    var sc = textSaver('chasers', function () { return { chaser_48h: $('#c48').value, chaser_5d: $('#c5').value }; });
    $('#c48').onchange = sc; $('#c5').onchange = sc;
    $('#logo').onchange = async function () {
      var f = this.files[0]; if (!f) return;
      if (f.size > 2e6) return toast('Logo must be under 2MB.', true);
      var path = a.id + '/logo-' + Date.now() + '.' + (f.name.split('.').pop() || 'png').toLowerCase();
      // Each upload has its own name, so no upsert (upsert needs a read policy the logos bucket does not have).
      var up = await sb.storage.from('logos').upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) return toast(up.error.message, true);
      var url = sb.storage.from('logos').getPublicUrl(path).data.publicUrl;
      var res = await sb.from('agencies').update({ logo_url: url }).eq('id', a.id).select().single();
      if (res.error) return toast(res.error.message, true);
      S.agency = res.data; toast('Logo saved. Clients see it on every pack.'); renderShell(); location.hash = '#/settings?s=brand'; route();
    };
    $('#saveret').onclick = async function () { var res = await sb.from('agencies').update({ retention_months: Number($('#ret').value) }).eq('id', a.id).select().single(); if (res.error) return toast(res.error.message, true); S.agency = res.data; toast('Saved.'); };
    $('#export').onclick = exportData;
    $('#savempp').onclick = async function () {
      var m = Math.round(Number($('#mpp').value));
      if (!(m >= 5 && m <= 480)) return toast('Pick between 5 and 480 minutes.', true);
      var res = await sb.from('agencies').update({ minutes_per_pack: m }).eq('id', a.id).select().single();
      if (res.error) return toast(res.error.message, true);
      S.agency = res.data; toast('Saved. Reports now use ' + m + ' minutes per pack.');
    };
    var focusOn = { reports: '#mpp', team: '#tn', voice: '#voice' };
    if (q && q.s && $('#s-' + q.s)) setTimeout(function () { var e = $('#s-' + q.s); e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); if (focusOn[q.s]) $(focusOn[q.s]).focus({ preventScroll: true }); }, 60);
    async function team() {
      var m = must(await sb.from('members').select('user_id,name,email,role,phone').eq('agency_id', a.id).order('created_at'));
      $('#seats').textContent = m.length + ' of ' + a.recruiter_seats + ' logins used';
      $('#team').innerHTML = m.map(function (x) { return '<div class="member"><div class="av">' + esc(initials(x.name)) + '</div><div class="sp" style="min-width:0"><div class="b ell">' + esc(x.name) + '</div><div class="small muted ell">' + esc(x.email) + ' · ' + esc(x.role) + '</div></div>' + (x.user_id !== S.me.user_id ? '<button class="btn sm danger" data-rm="' + x.user_id + '">Remove</button>' : '<span class="chip line">You</span>') + '</div>'; }).join('');
      $$('[data-rm]').forEach(function (b) { b.onclick = async function () { if (!(await confirmBox('Remove this login?', 'They will not be able to log in any more. Their packs stay.', 'Remove', true))) return; try { await fn('remove_member', { user_id: b.getAttribute('data-rm') }); toast('Removed.'); team(); } catch (e) { toast(e.message, true); } }; });
    }
    team();
    $('#tadd').onclick = async function () {
      try {
        var nm = $('#tn').value.trim(), em = $('#te').value.trim();
        if (!nm || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Add their name and work email.', true); return; }
        var r = await fn('invite', { name: nm, email: em, role: $('#tr').value });
        var link = location.href.split('#')[0];
        var msg = 'Hi ' + first(nm) + ', you are set up on Candidate Pack for ' + S.agency.name + '.\nLog in here: ' + link + '\nEmail: ' + r.email + '\nTemporary password: ' + r.password + '\nYou can change the password in Settings.';
        sheet('Teammate added', '<p>Send these to ' + esc(nm) + '. The password is shown only once, so copy it now.</p><div class="kv"><div><b>Email</b><span>' + esc(r.email) + '</span></div><div><b>Temporary password</b><span style="font-family:ui-monospace,monospace">' + esc(r.password) + '</span></div></div><p class="small muted" style="margin-top:12px">Log in at: ' + esc(link) + '</p>', '<button class="btn" data-close4>Close</button><button class="btn pri" data-close3>' + I.link + 'Copy and close</button>');
        $('[data-close4]').onclick = closeSheet;
        $('[data-close3]').onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { toast('Copied. Paste it into a message to ' + first(nm) + '.'); }, function () {}); closeSheet(); };
        $('#tn').value = ''; $('#te').value = ''; team();
      } catch (e) { toast(e.message, true); }
    };
  }
  function changePassword() {
    var el = sheet('Change password', '<div class="field"><label class="f" for="np1">New password</label><input class="in" id="np1" type="password" autocomplete="new-password"><div class="hint">At least 8 characters.</div></div>', '<button class="btn" data-no>Cancel</button><button class="btn pri" data-yes>Save password</button>');
    $('[data-no]', el).onclick = closeSheet;
    $('[data-yes]', el).onclick = async function () {
      var v = $('#np1').value;
      if (v.length < 8) return toast('Use at least 8 characters.', true);
      var r = await sb.auth.updateUser({ password: v });
      if (r.error) return toast(/weak|pwned|leaked/i.test(r.error.message) ? 'That password is too easy to guess. Try a longer one.' : r.error.message, true);
      closeSheet(); toast('Password changed.');
    };
  }
  function tplPreview(t, col) {
    var head = t === 'executive' ? '#0B0C0F' : t === 'minimal' ? '#fff' : col;
    return '<div style="position:absolute;inset:0;background:' + (t === 'modern' ? '#F1F1F4' : '#fff') + '"><div style="height:26px;background:' + head + ';' + (t === 'minimal' ? 'border-top:4px solid ' + col + ';border-bottom:1px solid #eee' : '') + '"></div><div style="margin:-8px 8px 0;height:22px;background:#fff;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.12)"></div><div style="margin:8px 10px 0;height:5px;width:60%;background:#DDD;border-radius:3px"></div><div style="margin:5px 10px 0;height:5px;width:80%;background:#EEE;border-radius:3px"></div></div>';
  }
  async function exportData() {
    var t = think(['Gathering everything...', 'Packing it up...'], 'Your candidates, briefs, packs and history as one file.');
    try {
      var r = await Promise.all(['candidates', 'jobs', 'packs', 'matches', 'events'].map(function (tb) { return sb.from(tb).select('*').limit(10000); }));
      var data = { agency: S.agency.name, exported_at: new Date().toISOString() };
      ['candidates', 'jobs', 'packs', 'matches', 'events'].forEach(function (tb, i) { data[tb] = must(r[i]).map(function (x) { delete x.fts; return x; }); });
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = S.agency.slug + '-export-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
      t.stop(); toast('Exported.');
    } catch (e) { t.stop(); toast(e.message, true); }
  }

  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g && !e.target.closest('a,button')) location.hash = g.getAttribute('data-go');
  });
  document.addEventListener('keydown', function (e) {
    var g = e.target.closest && e.target.closest('[data-go]');
    if (g && e.target === g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = g.getAttribute('data-go'); }
  });

  // ---------- start ----------
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); S.deferredInstall = e; });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () {});
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { S.me = null; S.agency = null; renderLogin(); } });
  start();
})();
