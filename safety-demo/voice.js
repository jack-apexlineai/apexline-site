/* Recorded narration for the demo.
   Every fixed sentence the app speaks was recorded once as an MP3 in audio/,
   named by a hash of the sentence. audio/manifest.js lists which ones exist.
   A line is split into sentences: recorded ones play as MP3, anything else
   (for example a worker's own words in a read-back) falls back to the browser voice.
   Same file is used by the Node build script, so the split and hash always match. */
(function(root){
'use strict';

function norm(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

/* Sentences end at . ! or ? followed by a space or the end. */
function split(text){
  var t = norm(text);
  if (!t) return [];
  var out = [], re = /[^.!?]+(?:[.!?]+|$)/g, m;
  while ((m = re.exec(t))) { var s = norm(m[0]); if (s) out.push(s); }
  return out.length ? out : [t];
}

/* cyrb53: small, fast 53 bit string hash. Hex, 14 chars. */
function hash(str){
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (var i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  var n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return ('00000000000000' + n.toString(16)).slice(-14);
}

var api = { norm: norm, split: split, hash: hash };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.CSVoice = api;
})(this);
