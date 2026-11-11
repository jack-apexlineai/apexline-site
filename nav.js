/* Shared top nav: opens and closes the Products menu. */
(function(){
  var p=document.getElementById('prod'); if(!p) return;
  var b=p.querySelector('.prod-btn'), m=p.querySelector('.prod-menu');
  function set(open){ b.setAttribute('aria-expanded',open?'true':'false'); m.hidden=!open; p.classList.toggle('open',open); }
  b.addEventListener('click',function(e){ e.stopPropagation(); set(m.hidden); });
  document.addEventListener('click',function(e){ if(!p.contains(e.target)) set(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !m.hidden){ set(false); b.focus(); } });
  // Mark the product page we're on.
  var here=location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');
  m.querySelectorAll('a').forEach(function(a){ if(a.getAttribute('href')===here) a.setAttribute('aria-current','page'); });
})();
