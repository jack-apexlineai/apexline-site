/* Card carousel (home "What we build"). Native scroll-snap does the swiping on touch; this adds arrows, mouse drag,
   arrow keys and the progress bar. No libraries. */
(function(){
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-carousel]').forEach(function(root){
    var track = root.querySelector('.cc-track'), prev = root.querySelector('.cc-prev'), next = root.querySelector('.cc-next');
    var fill = root.querySelector('.cc-progress i'), cards = [].slice.call(track.querySelectorAll('.cc'));
    if(!track || !cards.length) return;
    var behave = calm ? 'auto' : 'smooth';
    function pad(){ return parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0; }
    function snapPoints(){ var max = track.scrollWidth - track.clientWidth, p = pad();
      return cards.map(function(c){ return Math.min(max, Math.max(0, c.offsetLeft - p)); }); }
    function nearest(){ var x = track.scrollLeft, pts = snapPoints(), best = 0;
      pts.forEach(function(v, i){ if(Math.abs(v - x) < Math.abs(pts[best] - x)) best = i; }); return best; }
    function go(i){ var pts = snapPoints(); i = Math.max(0, Math.min(cards.length - 1, i)); track.scrollTo({ left: pts[i], behavior: behave }); }
    function update(){
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max - 2;
      if(fill) fill.style.width = (max > 0 ? Math.min(100, (track.scrollLeft + track.clientWidth) / track.scrollWidth * 100) : 100) + '%';
    }
    prev.addEventListener('click', function(){ go(nearest() - 1); });
    next.addEventListener('click', function(){ go(nearest() + 1); });
    track.addEventListener('scroll', function(){ window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    track.addEventListener('keydown', function(e){
      if(e.target !== track) return;
      var k = e.key;
      if(k === 'ArrowRight'){ e.preventDefault(); go(nearest() + 1); }
      else if(k === 'ArrowLeft'){ e.preventDefault(); go(nearest() - 1); }
      else if(k === 'Home'){ e.preventDefault(); go(0); }
      else if(k === 'End'){ e.preventDefault(); go(cards.length - 1); }
    });
    // Mouse drag on desktop (touch and trackpads already scroll natively).
    var down = false, moved = false, startX = 0, startLeft = 0;
    track.addEventListener('pointerdown', function(e){
      if(e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', function(e){
      if(!down) return;
      var dx = e.clientX - startX;
      if(!moved && Math.abs(dx) > 5){ moved = true; track.classList.add('dragging'); }
      if(moved){ e.preventDefault(); track.scrollLeft = startLeft - dx; }
    });
    window.addEventListener('pointerup', function(){
      if(!down) return; down = false;
      if(moved){ var i = nearest(); track.classList.remove('dragging'); go(i); setTimeout(function(){ moved = false; }, 0); }
    });
    track.addEventListener('click', function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    track.addEventListener('dragstart', function(e){ e.preventDefault(); });
    update();
  });
})();
