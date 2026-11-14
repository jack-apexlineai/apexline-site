/* Candidate Pack document renderer. Same HTML for the recruiter's editor and the client view.
   PackDoc.html(content, meta, opts) -> string
   meta: { agency:{name,logo_url,brand_colour,font,template_key}, candidate_name, role, client_company, recruiter, date }
   opts.editable: adds contenteditable fields (data-p="fit.summary") and section regenerate buttons. */
(function (root) {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hexToRgb(h) { var m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [200, 16, 46]; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(h, f) { var c = hexToRgb(h); return 'rgb(' + c.map(function (v) { return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f); }).join(',') + ')'; }
  var FONTS = { 'Inter': "'Inter',system-ui,sans-serif", 'Manrope': "'Manrope','Inter',sans-serif", 'DM Sans': "'DM Sans','Inter',sans-serif", 'Lora': "'Lora',Georgia,serif", 'Playfair Display': "'Playfair Display',Georgia,serif" };
  var VERDICT = { strong: 'Strong match', partial: 'Partly there', gap: 'Gap to test' };

  function field(tag, path, value, ed, cls) {
    var c = cls ? ' class="' + cls + '"' : '';
    if (!ed) return '<' + tag + c + '>' + esc(value) + '</' + tag + '>';
    return '<' + tag + c + ' contenteditable="true" spellcheck="true" data-p="' + path + '">' + esc(value) + '</' + tag + '>';
  }
  function regen(key, ed) {
    if (!ed) return '';
    return '<button class="regen" type="button" data-regen="' + key + '" title="Rewrite this section"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>Rewrite</button>';
  }
  function initials(n) { return String(n || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }

  function vars(agency) {
    var b = (agency && agency.brand_colour) || '#C8102E';
    var f = FONTS[(agency && agency.font) || 'Inter'] || FONTS.Inter;
    return '--pb:' + b + ';--pb-d:' + shade(b, -0.32) + ';--pb-l:' + shade(b, 0.9) + ';--pb-m:' + shade(b, 0.75) + ';--pf:' + f + ';';
  }

  function html(content, meta, opts) {
    content = content || {};
    meta = meta || {};
    opts = opts || {};
    var ed = !!opts.editable;
    var a = meta.agency || {};
    var cv = content.cv || {}, fit = content.fit || {}, pr = content.practical || {};
    var tpl = a.template_key || 'classic';
    var logo = a.logo_url ? '<img class="pd-logo" src="' + esc(a.logo_url) + '" alt="' + esc(a.name) + '">' : '<div class="pd-word">' + esc(a.name || '') + '</div>';
    var date = meta.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    var h = '';
    h += '<article class="pd pd-' + esc(tpl) + '" style="' + vars(a) + '">';
    // header
    h += '<header class="pd-head"><div class="pd-head-in">' + logo + '<div class="pd-tag">Candidate profile</div></div></header>';
    // hero
    h += '<section class="pd-hero"><div class="pd-av">' + esc(initials(meta.candidate_name)) + '</div><div class="pd-hero-t">';
    h += '<div class="pd-for">For ' + esc(meta.role || 'the role') + (meta.client_company ? ' at ' + esc(meta.client_company) : '') + '</div>';
    h += '<h1 class="pd-name">' + esc(meta.candidate_name || 'Candidate') + '</h1>';
    h += field('div', 'cv.headline', cv.headline || '', ed, 'pd-headline');
    h += '</div></section>';
    // fit
    h += '<section class="pd-sec pd-fit"><div class="pd-sh"><h2>Why they fit your brief</h2>' + regen('fit', ed) + '</div>';
    h += field('p', 'fit.headline', fit.headline || '', ed, 'pd-quote');
    h += field('p', 'fit.summary', fit.summary || '', ed, 'pd-summary');
    if ((fit.points || []).length) {
      h += '<div class="pd-points">';
      fit.points.forEach(function (p, i) {
        var v = p.verdict || 'partial';
        h += '<div class="pd-point"><div class="pd-pt-top">' + field('div', 'fit.points.' + i + '.requirement', p.requirement, ed, 'pd-req') + '<span class="pd-v pd-v-' + esc(v) + '">' + esc(VERDICT[v] || v) + '</span></div>' + field('div', 'fit.points.' + i + '.evidence', p.evidence, ed, 'pd-ev') + '</div>';
      });
      h += '</div>';
    }
    h += '</section>';
    // practical
    h += '<section class="pd-sec"><div class="pd-sh"><h2>The practical details</h2>' + regen('practical', ed) + '</div><div class="pd-facts">';
    [['salary', 'Salary'], ['notice', 'Notice period'], ['availability', 'Availability'], ['location', 'Location'], ['working_pattern', 'Working pattern']].forEach(function (k) {
      h += '<div class="pd-fact"><b>' + k[1] + '</b>' + field('span', 'practical.' + k[0], pr[k[0]] || 'Not given', ed) + '</div>';
    });
    h += '</div></section>';
    // CV
    h += '<section class="pd-sec pd-cv"><div class="pd-sh"><h2>Career</h2>' + regen('cv', ed) + '</div>';
    h += field('p', 'cv.profile', cv.profile || '', ed, 'pd-profile');
    (cv.experience || []).forEach(function (x, i) {
      h += '<div class="pd-job"><div class="pd-job-top"><div>' + field('div', 'cv.experience.' + i + '.role', x.role, ed, 'pd-role') + field('div', 'cv.experience.' + i + '.company', x.company, ed, 'pd-co') + '</div>' + field('div', 'cv.experience.' + i + '.dates', x.dates, ed, 'pd-dates') + '</div>';
      if (x.context) h += field('div', 'cv.experience.' + i + '.context', x.context, ed, 'pd-ctx');
      if ((x.bullets || []).length) {
        h += '<ul>';
        x.bullets.forEach(function (b, j) { h += field('li', 'cv.experience.' + i + '.bullets.' + j, b, ed); });
        h += '</ul>';
      }
      h += '</div>';
    });
    if ((cv.education || []).length) {
      h += '<h3 class="pd-h3">Qualifications</h3><ul class="pd-edu">';
      cv.education.forEach(function (e, i) { h += field('li', 'cv.education.' + i, e, ed); });
      h += '</ul>';
    }
    if ((cv.skills || []).length) {
      h += '<h3 class="pd-h3">Skills</h3><div class="pd-skills">';
      cv.skills.forEach(function (s, i) { h += field('span', 'cv.skills.' + i, s, ed); });
      h += '</div>';
    }
    h += '</section>';
    // questions
    if ((content.questions || []).length) {
      h += '<section class="pd-sec pd-qs"><div class="pd-sh"><h2>Questions worth asking at interview</h2>' + regen('questions', ed) + '</div><ol>';
      content.questions.forEach(function (q, i) { h += '<li>' + field('div', 'questions.' + i + '.question', q.question, ed, 'pd-q') + field('div', 'questions.' + i + '.why', q.why, ed, 'pd-why') + '</li>'; });
      h += '</ol></section>';
    }
    // footer
    var r = meta.recruiter || {};
    h += '<footer class="pd-foot"><div><div class="pd-fn">' + esc(r.name || a.name || '') + '</div><div class="pd-fs">' + esc(a.name || '') + ' &middot; ' + esc(date) + '</div></div>';
    h += '<div class="pd-fc">' + (r.phone ? '<a href="tel:' + esc(String(r.phone).replace(/[^\d+]/g, '')) + '">' + esc(r.phone) + '</a>' : '') + (r.email ? '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : '') + '</div></footer>';
    h += '<div class="pd-legal">Contact details removed. Assessed on skills and experience only. Please arrange interviews through ' + esc(a.name || 'us') + '.</div>';
    h += '</article>';
    return h;
  }

  // Set a value inside content by "a.b.0.c".
  function setPath(obj, path, value) {
    var parts = path.split('.');
    var o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
      if (o[k] == null) o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      o = o[k];
    }
    var last = /^\d+$/.test(parts[parts.length - 1]) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
    o[last] = value;
  }
  // Removes empty list items left after editing.
  function tidy(content) {
    var c = JSON.parse(JSON.stringify(content || {}));
    function clean(arr) { return (arr || []).filter(function (x) { return typeof x === 'string' ? x.trim() : true; }); }
    if (c.cv) {
      c.cv.skills = clean(c.cv.skills); c.cv.education = clean(c.cv.education);
      (c.cv.experience || []).forEach(function (x) { x.bullets = clean(x.bullets); });
    }
    return c;
  }

  root.PackDoc = { html: html, setPath: setPath, tidy: tidy, esc: esc, vars: vars, shade: shade };
})(typeof window !== 'undefined' ? window : globalThis);
