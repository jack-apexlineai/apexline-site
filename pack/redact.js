/* Candidate Pack: protected characteristics guard.
   One file, used in the browser (preview of what gets removed) and in the edge functions
   (the copy that actually runs before the AI sees anything).
   redact(text, name): strips age, date of birth, gender, nationality, ethnicity, religion,
     marital and family status, pregnancy, health, disability, sexual orientation and photos,
     plus contact details, the candidate's name and study years (an age proxy).
   checkOutput(text): flags protected wording in what the AI wrote.
   checkBrief(text): warns when a job brief asks for something it should not.
   Rule: candidates are written up on skills and experience only. */
(function (root) {
  var CATEGORIES = [
    { key: 'age', label: 'Age or date of birth', re: [
      /\b(date of birth|d\.?\s?o\.?\s?b\.?|place of birth|birth ?date|birthday)\b/i,
      /\bage[ds]?\s*[:\-]?\s*\d{2}\b/i,
      /\b\d{2}\s*[- ]?\s*(years?|yrs?)\s*[- ]?\s*(old|of age)\b/i,
      /\bturning\s+\d{2}\b/i,
      /\bat the age of\b/i,
      /\b[Aa]t \d{2},/,
      /\bborn\s+(in|on)?\s*\d/i,
      /\bborn\s+(in|on)\b/i,
      /\b(retire|retiring|retirement|winds? down|wind down|winding down)\b/i
    ] },
    { key: 'gender', label: 'Gender or pronouns', re: [
      /\b(gender|sex|pronouns)\s*:/i,
      /\b(male|female|non-binary|transgender|trans woman|trans man)\b/i,
      /\((he|she|they)\s*\/\s*(him|her|them)\)/i,
      /\b(he|she|they)\s*\/\s*(him|her|them)\b/i
    ] },
    { key: 'nationality', label: 'Nationality or citizenship', re: [
      /\b(nationality|citizenship|citizen|passport holder|national of|passport)\b/i,
      /\b(visa status|immigration status)\b/i
    ] },
    { key: 'ethnicity', label: 'Ethnicity or race', re: [/\b(ethnic\w*|race|racial)\b/i] },
    { key: 'religion', label: 'Religion or belief', re: [/\b(religio\w*|faith\s*:|church|mosque|synagogue|gurdwara|temple|catholic|protestant|christian|muslim|islam\w*|jewish|judaism|hindu\w*|sikh\w*|buddhis\w*|atheis\w*)\b/i] },
    { key: 'family', label: 'Marital or family status', re: [
      /\b(marital|married|marriage|divorc\w*|widow\w*|husband|wife|spouse|fianc\w*|civil partner\w*|dependants?)\b/i,
      /\b(kids|children|child|baby|babies|mum|mom|dad|father|mother|parent of|childcare|school runs?|nursery)\b/i,
      /\b(my|our|her|his|their|a|one|two|three|four|\d)\s+(young\s+|grown[- ]up\s+)?(sons?|daughters?)\b/i,
      /\b(pregnan\w*|maternity|paternity|parental leave)\b/i,
      /^\s*status\s*:\s*(single|married|divorced|separated|widowed)/i
    ] },
    { key: 'health', label: 'Health or disability', re: [
      /^\s*health\s*:/i,
      /\b(health (condition|issue|problem)s?|ill[- ]health|illness|disab\w*|diagnos\w*|medical|surgery|operation on|cancer|depression|anxiety|sick leave|long[- ]term sick|mental health|neurodiver\w*|autis\w*|adhd|dyslexi\w*|wheelchair)\b/i
    ] },
    { key: 'orientation', label: 'Sexual orientation', re: [/\b(gay|lesbian|bisexual|sexual orientation|lgbt\w*)\b/i] },
    { key: 'photo', label: 'Photo', re: [
      /\b(photo|photograph|headshot|head shot|selfie|profile picture|picture of me)\b/i,
      /\[(image|img|picture)[^\]]*\]/i,
      /\.(jpe?g|png|heic|webp)\b/i
    ] }
  ];

  var CONTACT = [
    /[\w.+-]+@[\w-]+\.[\w.-]+/g,
    /(\+44\s?\(?0?\)?\s?7\d{3}|\(?07\d{3}\)?|\(?0\d{2,4}\)?)\s?\d{3}\s?\d{3,4}\b/g,
    /\b(https?:\/\/)?(www\.)?linkedin\.com\/\S+/gi,
    /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/g,
    /\b[A-Z]{1,2}\d{1,2}\b(?=\s*$)/gm,
    /^\s*(address|home address|tel|telephone|mobile|phone|email|e-mail)\s*:.*$/gim
  ];

  var TITLES = /\b(Mr|Mrs|Ms|Miss|Mx)\.?\s+(?=[A-Z])/g;

  var EDU_LINE = /\b(BA|BSc|BEng|MEng|MA|MSc|MBA|PhD|LLB|degree|university|college|school|A[- ]levels?|GCSEs?|O[- ]levels?|diploma|ACA|ACCA|CIMA|CIPD|qualified|graduated)\b/;

  function categorise(s) {
    var hits = [];
    for (var i = 0; i < CATEGORIES.length; i++) {
      var c = CATEGORIES[i];
      for (var j = 0; j < c.re.length; j++) { if (c.re[j].test(s)) { hits.push(c.key); break; } }
    }
    return hits;
  }

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function neutralPronouns(text) {
    var cap = function (w, r) { return w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r; };
    // "she owns" -> "the candidate owns" keeps the verb right; otherwise "they".
    text = text.replace(/\b(he|she)\s+(\w+)\b/gi, function (m, p, v) {
      if (/^(was|is|has|does)$/i.test(v)) return cap(p, 'they') + ' ' + ({ was: 'were', is: 'are', has: 'have', does: 'do' })[v.toLowerCase()];
      if (/[a-z]s$/i.test(v) && !/(ss|us)$/i.test(v)) return cap(p, 'the candidate') + ' ' + v;
      return cap(p, 'they') + ' ' + v;
    });
    // "her" before a verb-ish word or punctuation is an object (them); before a noun it is possessive (their).
    text = text.replace(/\bher\b(?=\s*(?:$|[,.;:!?)]|\s(?:to|and|a|an|the|about|for|in|on|at|with|if|that|back|up|out|how|what|why|when|through|over|into|again|first)\b))/gim, function (w) { return cap(w, 'them'); });
    var map = { he: 'they', she: 'they', him: 'them', his: 'their', her: 'their', hers: 'theirs', himself: 'themselves', herself: 'themselves', "he's": "they're", "she's": "they're" };
    return text.replace(/\b(he's|she's|himself|herself|hers|his|her|him|he|she)\b/gi, function (w) { return cap(w, map[w.toLowerCase()]); });
  }

  function redact(text, name) {
    var removed = {};
    var note = function (k, s) { (removed[k] = removed[k] || []).push(String(s).trim().slice(0, 80)); };
    var src = String(text || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');

    var contact = 0;
    for (var i = 0; i < CONTACT.length; i++) src = src.replace(CONTACT[i], function () { contact++; return ''; });
    var titles = 0;
    src = src.replace(TITLES, function () { titles++; return ''; });
    if (name) {
      var full = String(name).trim();
      var parts = full.split(/\s+/).filter(function (p) { return p.length >= 2; });
      if (full) src = src.replace(new RegExp('\\b' + escRe(full) + '\\b', 'gi'), 'the candidate');
      for (var p = 0; p < parts.length; p++) {
        src = src.replace(new RegExp('\\b' + escRe(parts[p]) + '\\b', 'g'), 'the candidate');
        src = src.replace(new RegExp('\\b' + escRe(parts[p].toUpperCase()) + '\\b', 'g'), 'the candidate');
      }
      src = src.replace(/\b(the candidate)(\s+the candidate)+\b/gi, 'the candidate');
    }

    var out = [];
    var inEdu = false;
    var years = 0;
    var lines = src.split('\n');
    for (var li = 0; li < lines.length; li++) {
      var rawLine = lines[li];
      var line = rawLine;
      if (/^\s*(education|qualifications|education and qualifications|education & qualifications)\b/i.test(line)) inEdu = true;
      else if (/^\s*[A-Z][A-Z &]{3,}\s*$/.test(line)) inEdu = /EDUCATION|QUALIFICATION/.test(line);
      var segs = line.split(/\s+[|\u2022\u00b7]\s+|\s+\|\s*|\s*\|\s+/);
      var keptSegs = [];
      for (var si = 0; si < segs.length; si++) {
        var sentences = segs[si].split(/(?<=[.!?;])\s+/);
        var keep = [];
        for (var k = 0; k < sentences.length; k++) {
          var s = sentences[k];
          var cats = categorise(s);
          if (cats.length) cats.forEach(function (c) { note(c, s); });
          else keep.push(s);
        }
        var joined = keep.join(' ').trim();
        if (joined) keptSegs.push(joined);
      }
      line = keptSegs.join(' | ');
      if (line && (inEdu || EDU_LINE.test(line))) {
        line = line.replace(/,?\s*\(?\b(19|20)\d{2}\b\s*(-|to|\u2013)?\s*((19|20)\d{2}|present)?\)?/gi, function () { years++; return ''; }).replace(/\s+$/, '');
      }
      line = line.replace(/[,\s]+$/g, '').replace(/(\s*\|\s*)+$/g, '').replace(/^(\s*\|\s*)+/g, '').replace(/(\s*\|\s*){2,}/g, ' | ').replace(/\s{2,}/g, ' ');
      if (/^\s*the candidate\s*$/i.test(line)) line = '';
      if (line.trim() || !rawLine.trim()) out.push(line);
    }
    var result = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    result = neutralPronouns(result);

    var summary = [];
    for (var ci = 0; ci < CATEGORIES.length; ci++) {
      var c = CATEGORIES[ci];
      if (removed[c.key]) summary.push({ key: c.key, label: c.label, count: removed[c.key].length });
    }
    if (titles) summary.push({ key: 'title', label: 'Title (Mr, Mrs, Ms)', count: titles });
    if (contact) summary.push({ key: 'contact', label: 'Contact details', count: contact });
    if (years) summary.push({ key: 'years', label: 'Study years', count: years });
    if (name) summary.push({ key: 'name', label: 'Name', count: 1 });
    return { text: result, removed: summary };
  }

  var OUTPUT_CHECKS = [
    { key: 'age', label: 'age', re: /\b(age|aged|ageing|years old|year-old|young|younger|older|elderly|born|date of birth|retire\w*|wind(s|ing)? down|later in (his|her|their) career|end of (his|her|their) career)\b/gi },
    { key: 'gender', label: 'gendered pronoun or gender', re: /\b(he|she|him|his|her|hers|himself|herself|male|female|gender)\b/gi },
    { key: 'nationality', label: 'nationality', re: /\b(nationality|citizen\w*|foreign|immigra\w*|passport)\b/gi },
    { key: 'ethnicity', label: 'ethnicity', re: /\b(ethnic\w*|race|racial)\b/gi },
    { key: 'religion', label: 'religion', re: /\b(religio\w*|church|mosque|synagogue)\b/gi },
    { key: 'family', label: 'family status', re: /\b(married|marital|husband|wife|spouse|kids|children|mum|dad|mother|father|pregnan\w*|maternity|paternity|school runs?)\b/gi },
    { key: 'health', label: 'health', re: /\b(illness|ill[- ]health|sick|surgery|disab\w*|diagnos\w*|mental health)\b/gi },
    { key: 'orientation', label: 'sexual orientation', re: /\b(gay|lesbian|bisexual|sexual orientation)\b/gi }
  ];

  function checkOutput(text) {
    var t = String(text || '');
    var flags = [];
    for (var i = 0; i < OUTPUT_CHECKS.length; i++) {
      var c = OUTPUT_CHECKS[i];
      var m = t.match(c.re);
      if (m) {
        var seen = {};
        var words = [];
        m.forEach(function (w) { w = w.toLowerCase(); if (!seen[w]) { seen[w] = 1; words.push(w); } });
        flags.push({ key: c.key, label: c.label, words: words });
      }
    }
    return { clean: flags.length === 0, flags: flags };
  }

  function checkBrief(text) {
    var t = String(text || '');
    var hits = [];
    var pats = [
      ['age', /\b(\d0s|young|younger|older|energetic|digital native|recent graduate|aged|years old|mature)\b/gi],
      ['gender', /\b(male|female|man|woman|men|women|guy|girl|lady|ladies|gentleman)\b/gi],
      ['nationality', /\b(british only|native english|nationality|citizen)\b/gi],
      ['family', /\b(married|kids|children|no family|family commitments)\b/gi],
      ['health', /\b(able-bodied|healthy|fit and well)\b/gi]
    ];
    pats.forEach(function (p) {
      var m = t.match(p[1]);
      if (m) {
        var seen = {}; var words = [];
        m.forEach(function (w) { w = w.toLowerCase(); if (!seen[w]) { seen[w] = 1; words.push(w); } });
        hits.push({ key: p[0], words: words });
      }
    });
    return hits;
  }

  root.PackRedact = { redact: redact, checkOutput: checkOutput, checkBrief: checkBrief, CATEGORIES: CATEGORIES };
})(typeof window !== 'undefined' ? window : globalThis);
