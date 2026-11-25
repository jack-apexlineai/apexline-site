/* ApexLine spreadsheet import. One drop-in module, the same three steps in every system:
   1. Get the template   2. Fill it in and upload it   3. Done
   Nothing is saved until the person presses the Add button. Headings are matched for them,
   problems are said in plain words, and what is already in the system is left alone unless they ask.
   The same file is used by every product (workshop-demo, workshop-tour, yard-demo). Keep the copies identical.
   How to add it to a new build: apexlineai.com/SOP_DATA_IMPORT.md */
(function (root) {
  'use strict';
  var A = root.APXI = { version: 1, MAX_ROWS: 500 };

  /* ============================== small helpers ============================== */
  A.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var esc = A.esc;
  function trim(s) { return String(s == null ? '' : s).replace(/ /g, ' ').trim(); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  A.norm = function (h) { return A.fold(h).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };

  /* accents off, so José becomes Jose and Zieliński becomes Zielinski */
  A.fold = function (s) {
    s = String(s == null ? '' : s);
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    var map = { 'ł': 'l', 'Ł': 'L', 'ø': 'o', 'Ø': 'O', 'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'đ': 'd', 'Đ': 'D', 'ı': 'i', 'þ': 'th', 'Þ': 'Th', 'œ': 'oe', 'Œ': 'OE' };
    return s.replace(/[łŁøØßæÆđĐıþÞœŒ]/g, function (c) { return map[c]; });
  };

  /* ============================== CSV ============================== */
  /* quotes, commas or semicolons or tabs, Windows line ends, Excel's "sep=;" first line */
  A.parseCsv = function (text) {
    text = String(text || '').replace(/^﻿/, '');
    var sep = /^sep=(.)\r?\n/i.exec(text);
    if (sep) text = text.slice(sep[0].length);
    var first = text.split(/\r?\n/)[0] || '';
    var delim = sep ? sep[1] : [',', ';', '\t'].map(function (c) { return { c: c, n: first.split(c).length }; }).sort(function (a, b) { return b.n - a.n; })[0].c;
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return trim(c) !== ''; }); });
  };
  A.toCsv = function (rows) {
    return rows.map(function (r) {
      return r.map(function (v) { var s = String(v == null ? '' : v); return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',');
    }).join('\r\n');
  };

  /* dd/mm/yyyy, yyyy-mm-dd or a spreadsheet serial number. Gives yyyy-mm-dd. */
  A.parseDate = function (s) {
    s = trim(s);
    if (!s) return { ok: true, v: '' };
    var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return { ok: true, v: m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]) };
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s))) {
      var y = m[3].length === 2 ? '20' + m[3] : m[3];
      if (+m[2] > 12 || +m[2] < 1 || +m[1] > 31 || +m[1] < 1) return { ok: false };
      return { ok: true, v: y + '-' + pad2(m[2]) + '-' + pad2(m[1]) };
    }
    if (/^\d{5}$/.test(s)) return { ok: true, v: serialDate(+s).iso };
    return { ok: false };
  };
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function serialDate(n) {
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    var iso = d.toISOString().slice(0, 10);
    return { iso: iso, uk: iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) };
  }

  /* ============================== headings ============================== */
  /* match their headings to our fields: exact name or a known other name first, then a loose "contains" */
  A.autoMap = function (fields, headers) {
    var map = {}, used = {};
    var hs = (headers || []).map(A.norm);
    fields.forEach(function (f) {
      var names = [A.norm(f.label)].concat((f.syn || []).map(A.norm));
      for (var i = 0; i < hs.length; i++) {
        if (!used[i] && hs[i] && names.indexOf(hs[i]) >= 0) { map[f.key] = i; used[i] = 1; return; }
      }
    });
    fields.forEach(function (f) {
      if (map[f.key] != null) return;
      var names = [A.norm(f.label)].concat((f.syn || []).map(A.norm)).filter(function (s) { return s.length > 2; });
      for (var i = 0; i < hs.length; i++) {
        if (used[i] || !hs[i]) continue;
        if (names.some(function (s) { return hs[i].indexOf(s) >= 0; })) { map[f.key] = i; used[i] = 1; return; }
      }
    });
    return map;
  };

  /* ============================== usernames and PINs ============================== */
  /* first initial dot surname, plain letters only, with a number on the end if it is taken */
  A.username = function (first, last, taken) {
    var f = A.fold(first).toLowerCase().replace(/[^a-z0-9]/g, ''), l = A.fold(last).toLowerCase().replace(/[^a-z0-9]/g, '');
    var base = f && l ? f.charAt(0) + '.' + l : (f || l || 'user');
    if (base.length < 3) base = (base + '.user').slice(0, 6);
    var u = base, n = 2;
    var has = function (x) { return typeof taken === 'function' ? taken(x) : !!(taken && taken[x]); };
    while (has(u)) u = base + (n++);
    return u;
  };
  var COMMON_PINS = ['1212', '2121', '1122', '2580', '0852', '1313', '6969', '1004', '2000', '2001', '1010', '2020', '0101', '1001', '0007', '1984', '2468', '1357', '9999'];
  /* too easy to guess: four the same, a run up or down, or one of the handful everybody picks */
  A.pinObvious = function (pin) {
    pin = String(pin || '');
    if (!/^\d{4}$/.test(pin)) return false;
    if (/^(\d)\1{3}$/.test(pin)) return true;
    if ('01234567890'.indexOf(pin) >= 0 || '09876543210'.indexOf(pin) >= 0) return true;
    return COMMON_PINS.indexOf(pin) >= 0;
  };
  /* why a person's own new PIN is not allowed, in words for them, or '' when it is fine */
  A.pinProblem = function (pin, startPin) {
    pin = String(pin || '');
    if (!/^\d{4}$/.test(pin)) return 'Your PIN needs to be 4 numbers.';
    if (startPin && pin === String(startPin)) return 'That is the starting PIN you were given. Pick a new one.';
    if (A.pinObvious(pin)) return 'That one is too easy to guess. Pick another.';
    return '';
  };
  A.randomPin = function (avoid) {
    var p, tries = 0;
    do { p = String(Math.floor(Math.random() * 10000)); while (p.length < 4) p = '0' + p; tries++; }
    while ((A.pinObvious(p) || (avoid && avoid[p])) && tries < 200);
    return p;
  };

  /* ============================== xlsx: write ============================== */
  var CRC = null;
  function crc32(u8) {
    if (!CRC) {
      CRC = [];
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = CRC[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  /* a plain zip with nothing compressed, which is all a small template needs */
  function zipStore(files) {
    var chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = utf8(f.name), data = f.data, crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    var all = chunks.concat(central, [new Uint8Array(end.buffer)]);
    var out = new Uint8Array(all.reduce(function (a, c) { return a + c.length; }, 0)), p = 0;
    all.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function xmlEsc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  /* rows[0] is the headings. Every cell is text, so a PIN of 0042 and a mobile starting 07 stay as typed.
     opts: { sheet: 'People', exampleRows: 1, widths: [..] } */
  A.xlsxWrite = function (rows, opts) {
    opts = opts || {};
    var NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    var ncol = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 1);
    var cols = '';
    for (var c = 0; c < ncol; c++) {
      var w = (opts.widths && opts.widths[c]) || Math.max(14, Math.min(40, String(rows[0][c] || '').length + 6));
      cols += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" style="2" customWidth="1"/>';
    }
    var body = rows.map(function (r, ri) {
      var s = ri === 0 ? 1 : ri <= (opts.exampleRows || 0) ? 3 : 2;
      return '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) {
        return '<c r="' + colName(ci) + (ri + 1) + '" t="inlineStr" s="' + s + '"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
      }).join('') + '</row>';
    }).join('');
    var sheetName = xmlEsc(String(opts.sheet || 'Sheet1').replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31));
    var files = [
      ['[Content_Types].xml', head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', head + '<workbook xmlns="' + NS + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="' + sheetName + '" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', head + '<styleSheet xmlns="' + NS + '"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><i/><sz val="11"/><color rgb="FF808080"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8ECF2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
      ['xl/worksheets/sheet1.xml', head + '<worksheet xmlns="' + NS + '"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + cols + '</cols><sheetData>' + body + '</sheetData></worksheet>']
    ];
    return zipStore(files.map(function (f) { return { name: f[0], data: utf8(f[1]) }; }));
  };

  /* ============================== xlsx: read ============================== */
  function inflateRaw(u8) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no inflate here'));
    var ds = new DecompressionStream('deflate-raw');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function unzip(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), end = -1;
    for (var i = u8.length - 22; i >= 0 && i > u8.length - 70000; i--) { if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; } }
    if (end < 0) throw new Error('not a zip');
    var n = dv.getUint16(end + 10, true), p = dv.getUint32(end + 16, true), files = {}, dec = new TextDecoder();
    for (var k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true),
        xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      var name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      files[name] = { method: method, csize: csize, off: off };
      p += 46 + nl + xl + cl;
    }
    return {
      names: Object.keys(files),
      text: function (name) {
        var f = files[name];
        if (!f) return Promise.resolve(null);
        var nl2 = dv.getUint16(f.off + 26, true), xl2 = dv.getUint16(f.off + 28, true), start = f.off + 30 + nl2 + xl2;
        var raw = u8.subarray(start, start + f.csize);
        return (f.method === 0 ? Promise.resolve(raw) : inflateRaw(raw)).then(function (d) { return new TextDecoder().decode(d); });
      }
    };
  }
  function xmlDoc(text) { return new DOMParser().parseFromString(text, 'application/xml'); }
  function kids(node, name) { return Array.prototype.filter.call(node.getElementsByTagNameNS('*', name), function () { return true; }); }
  function textOf(node) {
    return kids(node, 't').filter(function (t) { return !(t.parentNode && t.parentNode.localName === 'rPh'); }).map(function (t) { return t.textContent; }).join('');
  }
  function colIndex(ref) { var m = /^([A-Z]+)/.exec(ref || ''), n = 0; if (!m) return -1; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }
  function dateFmt(id, custom) {
    if ((id >= 14 && id <= 17) || id === 22 || (id >= 27 && id <= 36) || (id >= 50 && id <= 58)) return true;
    var code = custom[id];
    if (!code) return false;
    code = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
    return /[dy]/i.test(code);
  }
  /* the first sheet of an .xlsx as rows of strings */
  A.xlsxRead = function (buf) {
    var z;
    try { z = unzip(buf); } catch (e) { return Promise.reject(e); }
    return Promise.all([z.text('xl/workbook.xml'), z.text('xl/_rels/workbook.xml.rels'), z.text('xl/sharedStrings.xml'), z.text('xl/styles.xml')]).then(function (parts) {
      var path = '';
      if (parts[0] && parts[1]) {
        var wb = xmlDoc(parts[0]), sheet = kids(wb, 'sheet')[0], rid = '';
        if (sheet) Array.prototype.forEach.call(sheet.attributes, function (a) { if (a.localName === 'id' && a.name !== 'sheetId') rid = a.value; });
        kids(xmlDoc(parts[1]), 'Relationship').forEach(function (r) {
          if (r.getAttribute('Id') === rid) { var t = r.getAttribute('Target') || ''; path = t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t; }
        });
      }
      if (!path || z.names.indexOf(path) < 0) path = z.names.filter(function (n) { return /^xl\/worksheets\/[^\/]+\.xml$/.test(n); }).sort()[0];
      if (!path) throw new Error('no sheet in that file');
      var shared = parts[2] ? kids(xmlDoc(parts[2]), 'si').map(textOf) : [];
      var xfs = [], custom = {};
      if (parts[3]) {
        var st = xmlDoc(parts[3]);
        kids(st, 'numFmt').forEach(function (f) { custom[+f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || ''; });
        var cx = kids(st, 'cellXfs')[0];
        if (cx) xfs = kids(cx, 'xf').map(function (x) { return +x.getAttribute('numFmtId') || 0; });
      }
      return z.text(path).then(function (xml) {
        var rows = [];
        kids(xmlDoc(xml), 'row').forEach(function (r) {
          var row = [], next = 0;
          kids(r, 'c').forEach(function (c) {
            var ci = colIndex(c.getAttribute('r'));
            if (ci < 0) ci = next;
            next = ci + 1;
            var t = c.getAttribute('t'), vEl = kids(c, 'v')[0], v = vEl ? vEl.textContent : '';
            if (t === 's') v = shared[+v] == null ? '' : shared[+v];
            else if (t === 'inlineStr') v = textOf(c);
            else if (t === 'b') v = v === '1' ? 'TRUE' : 'FALSE';
            else if (t === 'e') v = '';
            else if (v !== '' && !isNaN(+v)) {
              var fmt = xfs[+c.getAttribute('s') || 0] || 0;
              if (dateFmt(fmt, custom) && +v > 59 && +v < 2958466) v = serialDate(+v).uk;
              else if (/e/i.test(v) || /\.\d{10,}/.test(v)) v = String(Math.round(+v * 1e6) / 1e6);
            }
            while (row.length < ci) row.push('');
            row[ci] = String(v);
          });
          rows.push(row);
        });
        return rows;
      });
    });
  };

  /* any file the person picks, as { name, rows }. CSV, a text file, .xlsx, and old .xls through the Excel reader. */
  A.SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var sheetJsWait = null;
  function sheetJs() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    if (!sheetJsWait) {
      sheetJsWait = new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = A.SHEETJS;
        s.onload = function () { ok(root.XLSX); };
        s.onerror = function () { sheetJsWait = null; no(new Error('could not load the Excel reader')); };
        document.head.appendChild(s);
      });
    }
    return sheetJsWait;
  }
  function readAs(file, how, enc) {
    return new Promise(function (ok, no) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { no(new Error('could not read that file')); };
      if (how === 'buffer') fr.readAsArrayBuffer(file); else fr.readAsText(file, enc || 'utf-8');
    });
  }
  A.readFile = function (file) {
    var name = (file && file.name) || 'file';
    if (/\.xlsx$/i.test(name) || /\.xls$/i.test(name)) {
      return readAs(file, 'buffer').then(function (buf) {
        var old = function () {
          return sheetJs().then(function (X) {
            var wb = X.read(new Uint8Array(buf), { type: 'array' });
            return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
          });
        };
        return (/\.xlsx$/i.test(name) ? A.xlsxRead(buf).catch(old) : old()).then(function (rows) { return { name: name, rows: rows }; });
      });
    }
    return readAs(file, 'text').then(function (text) {
      /* a CSV saved by Excel on Windows is not UTF-8, so accented names come out as question marks: read it again */
      if (text.indexOf('�') >= 0) return readAs(file, 'text', 'windows-1252');
      return text;
    }).then(function (text) { return { name: name, rows: A.parseCsv(text) }; });
  };

  /* ============================== the import itself ============================== */
  A.cfg = null;
  A.st = null;
  function fresh(kind) { return { kind: kind, file: '', headers: null, rows: null, map: {}, total: 0, pinMode: 'same', startPin: '1111', showMap: false, update: false, result: null, busy: false }; }
  A.setup = function (cfg) {
    A.cfg = cfg;
    var keep = A.st && cfg.kinds[A.st.kind] ? A.st : null;
    A.st = keep || fresh(cfg.kind && cfg.kinds[cfg.kind] ? cfg.kind : Object.keys(cfg.kinds)[0]);
    if (!keep && cfg.startPin) A.st.startPin = cfg.startPin;
    bind();
    return A;
  };
  A.setKind = function (k) {
    if (!A.cfg || !A.cfg.kinds[k]) return;
    var pin = A.st.startPin, mode = A.st.pinMode;
    A.st = fresh(k); A.st.startPin = pin; A.st.pinMode = mode;
  };
  function K() { return A.cfg.kinds[A.st.kind]; }
  function say(msg, tone) { if (A.cfg.toast) A.cfg.toast(msg, tone || 'ok'); }
  function isExample(r) { return (r || []).some(function (c) { return /^\s*example\s*[:,]/i.test(String(c || '')); }); }

  A.templateRows = function (kindKey) {
    var k = A.cfg.kinds[kindKey || A.st.kind];
    var eg = k.fields.map(function (f) { return f.eg == null ? '' : String(f.eg); });
    eg[0] = 'Example: ' + (eg[0] || '');
    return [k.fields.map(function (f) { return f.label; }), eg];
  };
  A.templateFile = function (kindKey) {
    var k = A.cfg.kinds[kindKey || A.st.kind], rows = A.templateRows(kindKey);
    var name = (k.file || kindKey || A.st.kind) + '-template';
    try { return { name: name + '.xlsx', data: A.xlsxWrite(rows, { sheet: k.label, exampleRows: 1 }), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }; }
    catch (e) { return { name: name + '.csv', data: '﻿' + A.toCsv(rows), mime: 'text/csv;charset=utf-8' }; }
  };
  A.download = function (name, data, mime) {
    var blob = new Blob([data], { type: mime || 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    A.lastDownload = { name: name, size: blob.size };
  };

  /* take rows in (headings first) and move to the check screen */
  A.load = function (name, rows) {
    var st = A.st;
    rows = (rows || []).map(function (r) { return (r || []).map(function (c) { return c == null ? '' : String(c); }); })
      .filter(function (r) { return r.some(function (c) { return trim(c) !== ''; }); });
    if (!rows.length) { say('That file is empty. Download the template, fill it in and try again.', 'bad'); return false; }
    var data = rows.slice(1).filter(function (r) { return !isExample(r); });
    if (!data.length) { say('That file only has the headings and the example row. Add your own rows under them.', 'bad'); return false; }
    var map = A.autoMap(K().fields, rows[0]);
    if (!Object.keys(map).length) {
      say('We could not find any of the headings we need in that file. Download the template and copy your ' + K().many + ' into it.', 'bad');
      return false;
    }
    st.file = name; st.headers = rows[0]; st.total = rows.length - 1;
    st.rows = rows.slice(1, A.MAX_ROWS + 1);
    st.map = map; st.result = null; st.showMap = false;
    return true;
  };

  /* every row, checked. status: add, update, dup (already here, left alone), skip (a problem), example */
  A.check = function () {
    var st = A.st, k = K(), out = [], ctx = { seen: {}, taken: {}, kind: k, st: st, rows: out };
    if (k.people) (k.existing ? k.existing() : []).forEach(function (p) { ctx.taken[String(p.username || '').toLowerCase()] = 1; });
    (st.rows || []).forEach(function (r, i) {
      var res = { n: i + 2, v: {}, status: 'add', msgs: [], warn: false };
      if (isExample(r)) { res.status = 'example'; out.push(res); return; }
      k.fields.forEach(function (f) { res.v[f.key] = st.map[f.key] != null ? trim(r[st.map[f.key]]) : ''; });
      /* one "Name" column with both names in it: split it for them */
      if (k.people && !res.v.last && st.map.last == null && /\s/.test(res.v.first)) {
        var bits = res.v.first.split(/\s+/);
        res.v.first = bits.shift(); res.v.last = bits.join(' ');
      }
      var missing = k.fields.filter(function (f) { return f.req && !res.v[f.key]; });
      if (missing.length) {
        res.status = 'skip';
        res.msgs.push('Row ' + res.n + ' has no ' + missing.map(function (f) { return f.label.toLowerCase(); }).join(' and no ') + '.');
        out.push(res); return;
      }
      var note = function (text, how) {
        res.msgs.push('Row ' + res.n + (/^(has|is) /.test(text) ? ' ' : ': ') + text);
        if (how === 'skip' || how === 'dup' || how === 'update') res.status = how; else res.warn = true;
      };
      if (k.people) checkPerson(res, ctx, note);
      else if (k.pins) checkPin(res, note);
      if (k.check && res.status !== 'skip') k.check(res.v, { note: note, seen: ctx.seen, res: res, st: st });
      if (res.status === 'update' && !k.canUpdate) res.status = 'dup';
      out.push(res);
    });
    return out;
  };
  function findPosition(k, text) {
    var n = A.norm(text), hit = null;
    (k.positions || []).forEach(function (p) {
      if (hit) return;
      if (A.norm(p.name) === n || (p.syn || []).some(function (s) { return A.norm(s) === n; })) hit = p;
    });
    if (!hit) (k.positions || []).forEach(function (p) {
      if (hit) return;
      if ([p.name].concat(p.syn || []).some(function (s) { s = A.norm(s); return s.length > 3 && n.indexOf(s) >= 0; })) hit = p;
    });
    return hit;
  }
  function checkPerson(res, ctx, note) {
    var k = ctx.kind, v = res.v, st = ctx.st;
    var pos = findPosition(k, v.position);
    if (!pos) {
      note((v.position ? '"' + v.position + '" is not a position we know' : 'there is no position') + '. Use one of: ' + k.positions.filter(function (p) { return !p.refuse; }).map(function (p) { return p.name; }).join(', ') + '.', 'skip');
      return;
    }
    if (pos.refuse) { note(pos.refuse, 'skip'); return; }
    res.position = pos.name;
    res.title = v.position;
    var existing = k.existing ? k.existing() : [];
    var nameKey = function (f, l) { return trim(String(f || '') + ' ' + String(l || '')).toLowerCase().replace(/\s+/g, ' '); };
    var full = nameKey(v.first, v.last);
    /* username: theirs if they gave one, otherwise made for them */
    var un = String(v.username || '').toLowerCase().replace(/\s+/g, '');
    if (un) {
      un = A.fold(un);
      if (!/^[a-z0-9.]{3,30}$/.test(un)) { note('the username "' + v.username + '" will not work. Usernames are letters, numbers and dots, at least 3 long. Leave it blank and one is made for them.', 'skip'); return; }
      if (existing.some(function (p) { return String(p.username).toLowerCase() === un; })) { note(un + ' is already in the system, so this row is left alone.', 'dup'); res.username = un; return; }
      if (ctx.seen['u:' + un]) { note('has the same username as row ' + ctx.seen['u:' + un] + ' (' + un + ').', 'skip'); return; }
    } else {
      if (existing.some(function (p) { return nameKey(p.first, p.last) === full; })) {
        note(v.first + ' ' + v.last + ' is already in the system, so this row is left alone.', 'dup');
        return;
      }
      un = A.username(v.first, v.last, function (x) { return ctx.taken[x] || ctx.seen['u:' + x]; });
      res.madeUsername = true;
      if (!A.fold(v.first + v.last).replace(/[^a-zA-Z0-9]/g, '')) note('we could not make a username out of that name, so they come in as ' + un + '. You can change it after.');
      if (ctx.seen['n:' + full]) note('same name as row ' + ctx.seen['n:' + full] + ', so they come in as ' + un + '. Leave one out if it is the same person.');
    }
    ctx.seen['u:' + un] = res.n;
    if (!ctx.seen['n:' + full]) ctx.seen['n:' + full] = res.n;
    res.username = un;
    checkPin(res, note);
    if (v.mobile) {
      var mob = v.mobile.replace(/[^\d+]/g, '');
      if (/^7\d{9}$/.test(mob)) mob = '0' + mob;
      v.mobile = mob.length >= 10 ? (/^0\d{10}$/.test(mob) ? mob.slice(0, 5) + ' ' + mob.slice(5) : mob) : v.mobile;
    }
    if (k.languages && v.language) {
      var lang = k.languages.filter(function (l) { return A.norm(l) === A.norm(v.language); })[0];
      if (!lang) { note('we do not have "' + v.language + '" as a language yet, so they start in ' + k.languages[0] + '.'); v.language = ''; }
      else v.language = lang;
    }
  }
  /* starting PIN: theirs if it is 4 numbers, otherwise the one on the screen */
  function checkPin(res, note) {
    var raw = res.v.pin, pin = String(raw || '').replace(/\s+/g, '');
    if (pin && /^\d{1,3}$/.test(pin)) {
      while (pin.length < 4) pin = '0' + pin;
      note('the PIN was read as ' + pin + ' (spreadsheets drop the noughts at the front).');
    } else if (pin && !/^\d{4}$/.test(pin)) {
      note('the PIN "' + raw + '" is not 4 numbers, so they get the starting PIN instead.');
      pin = '';
    }
    res.ownPin = pin;
  }
  function hasPins(k) { return !!(k.people || k.pins); }
  /* a single Name column is enough for people, the surname is split off it */
  function needMissing(k, st) {
    return k.fields.filter(function (f) {
      if (!f.req || st.map[f.key] != null) return false;
      if (k.people && f.key === 'last' && st.map.first != null && /name/.test(A.norm(st.headers[st.map.first])) && !/first|fore|given/.test(A.norm(st.headers[st.map.first]))) return false;
      return true;
    });
  }
  function counts(rows) {
    var c = { add: 0, update: 0, dup: 0, skip: 0, example: 0, warn: 0 };
    rows.forEach(function (x) { c[x.status]++; if (x.warn && x.status !== 'skip') c.warn++; });
    return c;
  }
  A.pinOk = function () { return A.st.pinMode === 'random' || /^\d{4}$/.test(A.st.startPin); };

  /* save it. Only called from the Add button. */
  A.commit = function () {
    var st = A.st, k = K();
    if (st.busy) return;
    if (hasPins(k) && !A.pinOk()) { say('The starting PIN needs to be 4 numbers.', 'bad'); return; }
    var rows = A.check(), c = counts(rows), used = {};
    var items = rows.filter(function (x) { return x.status === 'add' || (x.status === 'update' && st.update); });
    if (!items.length) return;
    if (hasPins(k)) {
      items.forEach(function (x) {
        x.pin = x.ownPin || (st.pinMode === 'random' ? A.randomPin(used) : st.startPin);
        used[x.pin] = 1;
      });
    }
    st.busy = true;
    var extra = '';
    try {
      extra = k.commit(items.map(function (x) {
        return k.people ? { first: x.v.first, last: x.v.last, position: x.position, title: x.title, username: x.username, pin: x.pin, mobile: x.v.mobile || '', language: x.v.language || '', row: x.n }
          : { v: x.v, pin: x.pin || '', update: x.status === 'update', row: x.n, flags: x.flags || {} };
      }), { file: st.file }) || '';
    } catch (e) {
      st.busy = false;
      say('Something went wrong and nothing was added. Try again.', 'bad');
      if (root.console) console.error(e);
      return;
    }
    st.busy = false;
    st.result = {
      added: items.filter(function (x) { return x.status === 'add'; }).length,
      updated: items.filter(function (x) { return x.status === 'update'; }).length,
      left: c.dup + (st.update ? 0 : c.update), skipped: c.skip, extra: extra,
      people: !hasPins(k) ? null : items.filter(function (x) { return x.status === 'add'; }).map(function (x) {
        return k.people ? { name: x.v.first + ' ' + x.v.last, position: x.position, username: x.username, pin: x.pin } : k.hand(x.v, x.pin);
      })
    };
    st.rows = null; st.headers = null; st.map = {};
    A.render();
    say(plural(st.result.added, k.one, k.many) + ' added' + (st.result.updated ? ', ' + st.result.updated + ' updated' : '') + '.', 'ok');
    if (A.cfg.after) A.cfg.after(st.kind, st.result);
  };

  /* ============================== what it looks like ============================== */
  function btn(act, label, cls, attrs) { return '<button type="button" class="ai-btn ' + (cls || '') + '" data-ai="' + act + '"' + (attrs || '') + '>' + label + '</button>'; }
  function chip(text, tone) { return '<span class="ai-chip ' + (tone || '') + '">' + esc(text) + '</span>'; }
  function stepsHtml(on) {
    return '<ol class="ai-steps">' + ['Get the template', 'Fill it in and upload it', 'Done'].map(function (t, i) {
      var n = i + 1;
      return '<li class="' + (n < on ? 'dn' : n === on ? 'on' : '') + '"><i>' + (n < on ? '&#10003;' : n) + '</i><span>' + t + '</span></li>';
    }).join('') + '</ol>';
  }
  function kindsHtml() {
    var keys = A.cfg.order || Object.keys(A.cfg.kinds);
    if (keys.length < 2) return '';
    return '<div class="ai-kinds" role="tablist" aria-label="What you are importing">' + keys.map(function (key) {
      return '<button type="button" role="tab" aria-selected="' + (A.st.kind === key) + '" class="' + (A.st.kind === key ? 'on' : '') + '" data-ai="kind" data-k="' + key + '">' + esc(A.cfg.kinds[key].label) + '</button>';
    }).join('') + '</div>';
  }

  A.html = function () {
    if (!A.cfg) return '';
    var st = A.st, k = K();
    var top = kindsHtml();
    if (st.result) return top + stepsHtml(4) + doneHtml();
    if (st.rows) return top + stepsHtml(2) + reviewHtml();
    var g = (A.cfg.google || {})[st.kind];
    return top + stepsHtml(1) +
      '<div class="ai-two">' +
      '<section class="ai-card" id="aiStep1"><h3><b>1</b>Get the template</h3>' +
      '<p>A spreadsheet with the right headings and one example row. It opens in Excel or Google Sheets. ' + esc(k.what || '') + '</p>' +
      '<div class="ai-acts">' + btn('tpl', 'Download the template', 'pri lg') +
      (g ? '<a class="ai-btn lg" id="aiGoogle" href="' + esc(g) + '" target="_blank" rel="noopener">Open in Google Sheets</a>' : '') + '</div>' +
      '<div class="ai-cols"><span>What goes in it</span>' + k.fields.map(function (f) {
        return '<em class="' + (f.req ? 'req' : '') + '" title="' + esc(f.hint || '') + '">' + esc(f.label) + '</em>';
      }).join('') + '</div>' +
      '<p class="ai-small">The darker ones are needed. Leave the rest blank if you do not have them. ' +
      (k.people ? 'A username is made for anyone you leave blank.' : 'Already have a spreadsheet of your own? Upload that. The headings are matched for you.') + '</p>' +
      (k.addOne ? '<p class="ai-small">Only adding one or two? ' + btn('addone', esc(k.addOneLabel || 'Add one by hand'), 'link') + '</p>' : '') +
      '</section>' +
      '<section class="ai-card" id="aiStep2"><h3><b>2</b>Fill it in, then upload it</h3>' +
      '<div class="ai-drop" id="aiDrop"><div class="ai-big">Drop the spreadsheet here</div>' +
      '<div class="ai-small">Excel or CSV. The first row is the headings.</div>' +
      '<div class="ai-acts mid">' + btn('pick', 'Choose the file', 'pri') +
      (k.sample ? btn('sample', 'Try it with a sample file', '') : '') + '</div>' +
      '<input type="file" id="aiFile" accept=".csv,.txt,.tsv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></div>' +
      '<p class="ai-small">Nothing is added until you have checked it and pressed the button. ' + esc(A.cfg.note || '') + '</p>' +
      '</section></div>';
  };

  function cellsFor(x, k) {
    if (k.people) {
      return [
        '<b>' + esc(x.v.first + ' ' + x.v.last) + '</b>',
        x.position ? esc(x.position) + (x.title && A.norm(x.title) !== A.norm(x.position) ? ' <span class="ai-mut">(' + esc(x.title) + ')</span>' : '') : esc(x.v.position || ''),
        x.username ? '<code>' + esc(x.username) + '</code>' : ''
      ];
    }
    return k.fields.slice(0, k.show || 4).map(function (f) { return x.v[f.key] ? esc(x.v[f.key]) : '<span class="ai-mut">-</span>'; });
  }
  function reviewHtml() {
    var st = A.st, k = K(), rows = A.check(), c = counts(rows);
    var doing = c.add + (st.update ? c.update : 0);
    var heads = k.people ? ['Name', 'Position', 'Username'] : k.fields.slice(0, k.show || 4).map(function (f) { return f.label; });
    var problems = [];
    rows.forEach(function (x) { if (x.status === 'skip' || x.status === 'dup' || x.status === 'update' || x.warn) x.msgs.forEach(function (m) { problems.push({ t: m, s: x.status === 'skip' ? 'bad' : x.status === 'add' ? 'warn' : 'mut' }); }); });
    var bad = problems.filter(function (p) { return p.s === 'bad'; }), other = problems.filter(function (p) { return p.s !== 'bad'; });
    var reqMissing = needMissing(k, st);
    var label;
    if (!doing) label = 'Nothing to add yet';
    else if (st.update && c.update) label = c.add ? 'Add ' + plural(c.add, k.one, k.many) + ' and update ' + c.update : (c.update === 1 ? 'Update this 1 ' + k.one : 'Update these ' + c.update + ' ' + k.many);
    else label = c.add === 1 ? 'Add this 1 ' + k.one : 'Add these ' + c.add + ' ' + k.many;
    var pinBlock = '';
    if (hasPins(k)) {
      var own = rows.filter(function (x) { return x.status === 'add' && x.ownPin; }).length;
      pinBlock = '<div class="ai-pin" id="aiPin"><h4>Starting PINs</h4>' +
        '<label class="ai-radio"><input type="radio" name="aiPinMode" value="same"' + (st.pinMode === 'same' ? ' checked' : '') + '>' +
        '<span>Everyone starts on the same PIN <input id="aiStartPin" class="ai-pinin" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="Starting PIN" value="' + esc(st.startPin) + '"' + (st.pinMode === 'same' ? '' : ' disabled') + '></span></label>' +
        '<label class="ai-radio"><input type="radio" name="aiPinMode" value="random"' + (st.pinMode === 'random' ? ' checked' : '') + '><span>Give everyone a different random PIN</span></label>' +
        '<div class="ai-pinmsg" id="aiPinMsg">' + (A.pinOk() ? '' : 'The starting PIN needs to be 4 numbers.') + '</div>' +
        '<p class="ai-small">' + (own ? plural(own, 'person has', 'people have') + ' their own PIN in the file and keep it. ' : '') +
        'Whichever you pick, each person has to choose their own PIN the first time they sign in. You get a list to hand out on the next screen.</p></div>';
    }
    return '<section class="ai-card" id="aiReview"><div class="ai-hd"><h3><b>2</b>Check it before anything is added</h3>' +
      '<span class="ai-file">' + esc(st.file) + '</span>' + btn('reset', 'Different file', 'sm') + '</div>' +
      '<div class="ai-chips">' + chip(plural(c.add, 'to add', 'to add'), c.add ? 'ok' : '') +
      (c.update || c.dup ? chip((c.update + c.dup) + ' already in the system', 'mut') : '') +
      (c.skip ? chip(plural(c.skip, 'row with a problem', 'rows with a problem'), 'bad') : '') +
      (c.example ? chip('example row left out', 'mut') : '') + '</div>' +
      (st.total > A.MAX_ROWS ? '<div class="ai-box warn">That file has ' + st.total + ' rows. The first ' + A.MAX_ROWS + ' are shown here. Add these, then upload the rest as a second file.</div>' : '') +
      (reqMissing.length ? '<div class="ai-box bad" id="aiNeed">We could not find a column for ' + esc(reqMissing.map(function (f) { return f.label; }).join(' or ')) + '. Tell us which one it is under "How the columns were matched".</div>' : '') +
      (bad.length ? '<div class="ai-box bad" id="aiProblems"><b>' + plural(bad.length, 'row will be left out', 'rows will be left out') + '.</b> Fix them in the spreadsheet and upload it again, or carry on without them.<ul>' +
        bad.map(function (p) { return '<li>' + esc(p.t) + '</li>'; }).join('') + '</ul></div>' : '') +
      (other.length ? '<div class="ai-box" id="aiNotes"><b>Worth a look.</b><ul>' + other.map(function (p) { return '<li>' + esc(p.t) + '</li>'; }).join('') + '</ul></div>' : '') +
      (k.canUpdate && c.update ? '<label class="ai-check"><input type="checkbox" id="aiUpdate"' + (st.update ? ' checked' : '') + '><span>Also update the ' + c.update + ' already in the system with what is in this file</span></label>' : '') +
      pinBlock +
      '<div class="ai-tablewrap"><table class="ai-table"><thead><tr><th class="num">Row</th>' + heads.map(function (h, i) { return '<th' + (i > 0 ? ' class="ai-hide"' : '') + '>' + esc(h) + '</th>'; }).join('') + '<th>What happens</th></tr></thead><tbody>' +
      rows.filter(function (x) { return x.status !== 'example'; }).map(function (x) {
        var what = x.status === 'add' ? chip(x.warn ? 'Add, see note' : 'Add', x.warn ? 'warn' : 'ok')
          : x.status === 'update' ? chip(st.update ? 'Update' : 'Already here', st.update ? 'ok' : 'mut')
          : x.status === 'dup' ? chip('Already here', 'mut') : chip('Left out', 'bad');
        /* on a phone only the first column shows, with the second tucked under it */
        var cells = cellsFor(x, k);
        return '<tr class="' + x.status + '"><td class="num">' + x.n + '</td>' + cells.map(function (h, i) {
          return '<td' + (i > 0 ? ' class="ai-hide"' : '') + '>' + h + (i === 0 && cells[1] ? '<span class="ai-sub">' + cells[1] + '</span>' : '') + '</td>';
        }).join('') + '<td>' + what + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<details class="ai-map" id="aiMap"' + (st.showMap || reqMissing.length ? ' open' : '') + '><summary>How the columns were matched</summary>' +
      '<p class="ai-small">Your headings on the right. Change any that are wrong.</p><div class="ai-mapgrid">' + k.fields.map(function (f) {
        return '<label><span>' + esc(f.label) + (f.req ? ' <b>needed</b>' : '') + '</span><select data-ai-map="' + f.key + '"><option value="">Not in my file</option>' +
          st.headers.map(function (h, i) { return '<option value="' + i + '"' + (st.map[f.key] === i ? ' selected' : '') + '>' + esc(h || ('Column ' + (i + 1))) + '</option>'; }).join('') + '</select></label>';
      }).join('') + '</div></details>' +
      '<div class="ai-acts end">' + btn('go', esc(label), 'pri lg', (!doing || reqMissing.length || (hasPins(k) && !A.pinOk()) ? ' disabled' : '') + ' id="aiGo"') +
      '<span class="ai-small">Nothing has been added yet.</span></div></section>';
  }
  function doneHtml() {
    var st = A.st, k = K(), r = st.result;
    var bits = [plural(r.added, k.one, k.many) + ' added'];
    if (r.updated) bits.push(r.updated + ' updated');
    if (r.left) bits.push(r.left + ' already here and left alone');
    if (r.skipped) bits.push(plural(r.skipped, 'row', 'rows') + ' left out');
    var hand = '';
    if (r.people && r.people.length) {
      hand = '<div class="ai-hand" id="aiHand"><h4>The list to hand out</h4>' +
        '<p class="ai-small">' + esc(handNote(k)) + ' This is the only time the starting PINs are shown.</p>' +
        '<div class="ai-tablewrap">' + handTable(r.people, k, 'ai-table') + '</div><div class="ai-acts">' + btn('print', 'Print the list', '') + btn('list', 'Download the list', '') + '</div></div>';
    }
    return '<section class="ai-card" id="aiDone"><h3><b>&#10003;</b>Done</h3>' +
      '<div class="ai-box ok"><b>' + esc(bits.join(', ')) + '.</b>' + (r.extra ? ' ' + esc(r.extra) : '') + '</div>' + hand +
      '<div class="ai-acts end">' + (k.see ? btn('see', esc(k.seeLabel || 'See them'), 'pri') : '') + btn('again', 'Import another file', '') + '</div></section>';
  }

  function handNote(k) { return k.handNote || 'Each person signs in with their username and starting PIN, then has to choose their own PIN straight away.'; }
  function handCols(people, k) {
    var cols = [['name', 'Name'], ['position', k.handPos || 'Position']];
    if (people.some(function (p) { return p.username; })) cols.push(['username', 'Username']);
    cols.push(['pin', 'Starting PIN']);
    return cols;
  }
  function handTable(people, k, cls) {
    var cols = handCols(people, k);
    return '<table' + (cls ? ' class="' + cls + '"' : '') + '><thead><tr>' + cols.map(function (c) { return '<th' + (c[0] === 'position' && cls ? ' class="ai-hide"' : '') + '>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      people.map(function (p) {
        return '<tr>' + cols.map(function (c) {
          var v = esc(p[c[0]] || '');
          return '<td' + (c[0] === 'position' && cls ? ' class="ai-hide"' : '') + '>' + (c[0] === 'name' ? '<b>' + v + '</b>' : c[0] === 'position' ? v : '<code>' + v + '</code>') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  A.handRows = function () {
    var r = A.st.result, k = K(), cols = handCols(r.people, k);
    return [cols.map(function (c) { return c[1]; })].concat(r.people.map(function (p) { return cols.map(function (c) { return p[c[0]] || ''; }); }));
  };

  A.rootEl = function () { return document.getElementById((A.cfg && A.cfg.rootId) || 'apxiRoot'); };
  A.render = function () { var el = A.rootEl(); if (el) el.innerHTML = A.html(); };

  /* the hand-out list, printed on its own page */
  A.printList = function () {
    var r = A.st.result;
    if (!r || !r.people) return;
    var old = document.getElementById('aiPrint');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'aiPrint'; d.className = 'ai-print';
    d.innerHTML = '<h1>' + esc(A.cfg.printTitle || 'Sign in details') + '</h1><p>' + esc(handNote(K())) + '</p>' + handTable(r.people, K(), '');
    document.body.appendChild(d);
    document.documentElement.classList.add('ai-printing');
    var done = function () { document.documentElement.classList.remove('ai-printing'); d.remove(); root.removeEventListener('afterprint', done); };
    root.addEventListener('afterprint', done);
    try { root.print(); } catch (e) { }
    setTimeout(done, 1500);
  };

  function take(file) {
    if (!file) return;
    A.readFile(file).then(function (f) {
      if (A.load(f.name, f.rows)) { A.render(); say(plural(Math.min(A.st.total, A.MAX_ROWS), 'row', 'rows') + ' read from ' + f.name + '.', 'ok'); }
    }).catch(function () {
      say('We could not read that file. Save it as Excel (.xlsx) or CSV and try again.', 'bad');
    });
  }
  A.take = take;

  var bound = false;
  function bind() {
    if (bound || typeof document === 'undefined') return;
    bound = true;
    var inside = function (t) { return t && t.closest && t.closest('.apxi'); };
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-ai]');
      if (!b || !inside(b) || !A.cfg) return;
      var act = b.getAttribute('data-ai'), st = A.st, k = K();
      if (act === 'kind') { if (st.kind !== b.getAttribute('data-k')) { A.setKind(b.getAttribute('data-k')); A.render(); } }
      else if (act === 'tpl') { var t = A.templateFile(); A.download(t.name, t.data, t.mime); say('Template downloaded. Fill it in, save it, then upload it here.', 'ok'); }
      else if (act === 'pick') { var f = document.getElementById('aiFile'); if (f) f.click(); }
      else if (act === 'sample') { if (A.load('sample-' + (k.file || st.kind) + '.xlsx', k.sample())) A.render(); }
      else if (act === 'reset') { var pin = st.startPin, mode = st.pinMode; A.setKind(st.kind); A.st.startPin = pin; A.st.pinMode = mode; A.render(); }
      else if (act === 'again') { A.setKind(st.kind); A.render(); }
      else if (act === 'go') A.commit();
      else if (act === 'print') A.printList();
      else if (act === 'list') {
        A.download('sign-in-list.xlsx', A.xlsxWrite(A.handRows(), { sheet: 'Sign in list' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }
      else if (act === 'see') { if (k.see) k.see(); }
      else if (act === 'addone') { if (k.addOne) k.addOne(); }
    });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!inside(t) || !A.cfg) return;
      if (t.id === 'aiFile') { take(t.files && t.files[0]); t.value = ''; }
      else if (t.getAttribute('data-ai-map')) {
        var key = t.getAttribute('data-ai-map'), st = A.st;
        if (t.value === '') delete st.map[key];
        else { var idx = +t.value; Object.keys(st.map).forEach(function (k2) { if (st.map[k2] === idx) delete st.map[k2]; }); st.map[key] = idx; }
        st.showMap = true; A.render();
      }
      else if (t.name === 'aiPinMode') { A.st.pinMode = t.value; A.render(); }
      else if (t.id === 'aiUpdate') { A.st.update = t.checked; A.render(); }
    });
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id !== 'aiStartPin' || !inside(t)) return;
      t.value = t.value.replace(/\D/g, '').slice(0, 4);
      A.st.startPin = t.value;
      var m = document.getElementById('aiPinMsg'), go = document.getElementById('aiGo');
      if (m) m.textContent = A.pinOk() ? '' : 'The starting PIN needs to be 4 numbers.';
      if (go) { var c = counts(A.check()); go.disabled = !A.pinOk() || !(c.add + (A.st.update ? c.update : 0)); }
    });
    document.addEventListener('toggle', function (e) { if (e.target.id === 'aiMap' && A.st) A.st.showMap = e.target.open; }, true);
    ['dragover', 'dragleave', 'drop'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        var dz = e.target.closest && e.target.closest('#aiDrop');
        if (!dz) return;
        e.preventDefault();
        dz.classList.toggle('over', type === 'dragover');
        if (type === 'drop') take(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
      });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
