/* Wording: the office says "gross profit", not "margin". Done in one place so every screen, pop-up and card follows.
   Only words on the page are changed. Nothing typed into a box or a message draft is touched. */
(function () {
  var RX = /\bmargins?\b/i, RXG = /\bmargins?\b/gi;
  function fix(s) { return s.replace(RXG, function (m) { return m === m.toUpperCase() ? 'GROSS PROFIT' : (m.charAt(0) === 'M' ? 'Gross profit' : 'gross profit'); }); }
  function walk(n) {
    if (n.nodeType === 3) { if (RX.test(n.nodeValue)) n.nodeValue = fix(n.nodeValue); return; }
    if (n.nodeType !== 1) return;
    var tag = n.tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return;
    for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  function start() {
    walk(document.body);
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'characterData') { if (m.target.parentNode && RX.test(m.target.nodeValue)) walk(m.target); }
        else for (var k = 0; k < m.addedNodes.length; k++) walk(m.addedNodes[k]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
