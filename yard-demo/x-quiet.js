/* Quiet mode, for a prospect clicking through on their own (?quiet=1): the same demo and guided tour, but no pop-up
   bubbles, no sounds and no "new message" alerts. Scripted answers still arrive, they just land quietly in the inbox.
   The live presenter version is unchanged. Sample data only. */
(function () {
  if (new URLSearchParams(location.search).get('quiet') !== '1') return;
  document.documentElement.classList.add('quiet');
  try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch (e) {}
  function start(tries) {
    var UI = window.DSGUI, CS = window.CS, G = window.DSGG;
    if (!(UI && UI.A && CS && CS.S && G && G.run)) { if ((tries || 0) < 100) setTimeout(function () { start((tries || 0) + 1); }, 50); return; }
    if (CS.S.settings.live) { CS.S.settings.live = false; CS.save(); }
    var run0 = G.run;
    G.run = function (a) {
      run0.apply(this, arguments);
      /* Gemma's answer: open her email so the Open and book card is right there, instead of a bubble */
      if (a === 'gemmaBook') setTimeout(function () { try { UI.A.openThread({ dataset: { id: window.DSGV2.gemma() } }); } catch (e) {} }, 60);
    };
    /* any bubble that still gets made is removed straight away */
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && n.classList && n.classList.contains('sk-nudge')) n.remove(); }); });
    }).observe(document.body, { childList: true });
  }
  start(0);
})();
