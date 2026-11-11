/* Enquiry form (home and /custom). Posts to the ApexLine "enquiry" edge function, which emails apexlineai@gmail.com.
   If that function isn't reachable (not deployed yet, or offline), it opens the visitor's email app with the enquiry filled in instead. */
/* The two options (Book a call / Send an enquiry) are tabs. #book and #enquiry links open the matching one. */
(function(){
  var tabs = [].slice.call(document.querySelectorAll('.enq-opt[role=tab]')); if(!tabs.length) return;
  function pick(tab, focus){
    tabs.forEach(function(t){ var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on; });
    if(focus) tab.focus();
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ pick(t); });
    t.addEventListener('keydown', function(e){
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if(j === null) return; e.preventDefault(); pick(tabs[(j + tabs.length) % tabs.length], true);
    });
  });
  function fromHash(scroll){
    var id = location.hash.slice(1), t = tabs.filter(function(x){ return x.getAttribute('aria-controls') === id; })[0];
    if(!t) return; pick(t);
    if(scroll) document.querySelector('.enq-opts').scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', function(){ fromHash(true); });
  fromHash(true);
})();
(function(){
  var ENDPOINT = 'https://iyxsehwyvriujaixnwow.supabase.co/functions/v1/enquiry';
  var INBOX = 'apexlineai@gmail.com';
  var form = document.getElementById('enqForm'); if(!form) return;
  var started = Date.now(), btn = form.querySelector('button[type=submit]'), status = form.querySelector('.status');
  function val(n){ var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; }
  function say(msg, err){ status.textContent = msg; status.className = 'status' + (err ? ' err' : ''); }
  function done(){
    var box = document.createElement('div'); box.className = 'enq-done';
    box.innerHTML = '<div class="tick"></div><h3>Enquiry sent.</h3><p>Thanks, ' + val('name').replace(/[<>&"]/g,'') + '. We\'ll come back to you at ' + val('email').replace(/[<>&"]/g,'') + ' with a price.</p>';
    form.replaceWith(box);
  }
  function mailFallback(d){
    var body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nCompany: ' + (d.company || '-') + '\nTimeline: ' + (d.timeline || '-') +
      '\nBudget range: ' + (d.budget || '-') + '\n\nWhat I want built:\n' + d.what + '\n';
    var url = 'mailto:' + INBOX + '?subject=' + encodeURIComponent('Enquiry: ' + d.name + (d.company ? ', ' + d.company : '')) + '&body=' + encodeURIComponent(body);
    if(window.__enqOpen) window.__enqOpen(url); else location.href = url; // __enqOpen: test hook only
    say('Your email app should open with your enquiry filled in: just press send. If it doesn\'t, email ' + INBOX + '.');
    btn.disabled = false;
  }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!form.reportValidity()) return;
    var d = { name: val('name'), email: val('email'), company: val('company'), what: val('what'), timeline: val('timeline'),
      budget: val('budget'), website: val('website'), page: location.pathname, elapsed: Date.now() - started };
    btn.disabled = true; say('Sending...');
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { s: r.status, j: j }; }); })
      .then(function(x){
        if(x.s === 200 && x.j.ok) return done();
        if(x.s === 400 || x.s === 429){ btn.disabled = false; return say((x.s === 429 ? 'Too many enquiries from here. ' : 'Please check your name, email and project details. ') + 'Or email ' + INBOX + '.', true); }
        mailFallback(d);
      })
      .catch(function(){ mailFallback(d); });
  });
})();
