/* Client view. Loads the pack by its token, logs the open (server side), records feedback. */
(function () {
  var CFG = window.PACK_CFG;
  var page = document.getElementById('page');
  var q = new URLSearchParams(location.search);
  var token = q.get('t') || '';
  var esc = PackDoc.esc;
  var data = null;

  // A recruiter previewing their own pack is not counted as an open.
  function recruiterToken() {
    try {
      var s = JSON.parse(localStorage.getItem('cp-auth') || 'null');
      if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 30000)) return s.access_token;
    } catch (e) {}
    return null;
  }
  async function call(action, body) {
    var h = { 'Content-Type': 'application/json' };
    var rt = recruiterToken();
    if (rt) h.Authorization = 'Bearer ' + rt;
    var r = await fetch(CFG.fn, { method: 'POST', headers: h, body: JSON.stringify(Object.assign({ action: action, t: token }, body || {})) });
    var j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || 'This link is not working right now.');
    return j;
  }
  function err(msg) {
    page.innerHTML = '<div class="verr"><h1>' + esc(msg) + '</h1><p>If you were expecting a candidate profile, reply to the email it came in and we will send a fresh link.</p></div>';
  }
  var LABEL = { interview: 'Interview them', not_for_us: 'Not for us', more_info: 'Tell me more' };
  var THANKS = { interview: 'Great. We will be in touch today to set up the interview.', not_for_us: 'Thanks for letting us know. It helps us find the right person.', more_info: 'Thanks. We will come back to you with more today.' };

  function bar() {
    var p = data.pack;
    if (p.feedback_outcome) {
      return '<div class="vbar"><div class="vdone"><div class="tick"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div><div><div class="t">You said: ' + esc(LABEL[p.feedback_outcome]) + '</div><div class="s">' + esc(THANKS[p.feedback_outcome]) + '</div></div></div></div>';
    }
    return '<div class="vbar" id="vbar"><div class="vbar-in"><div class="q">What do you think of ' + esc(p.candidate_name.split(' ')[0]) + '?</div>' +
      '<button class="vb" data-o="not_for_us">Not for us</button><button class="vb" data-o="more_info">Tell me more</button><button class="vb pri" data-o="interview">Interview them</button></div></div>';
  }
  function render() {
    var a = data.agency, p = data.pack;
    document.title = p.candidate_name + ' for ' + p.role + ' · ' + a.name;
    document.documentElement.style.setProperty('--pb', a.brand_colour || '#C8102E');
    var meta = { agency: a, candidate_name: p.candidate_name, role: p.role, client_company: p.client_company, recruiter: data.recruiter,
      date: new Date(p.sent_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) };
    page.innerHTML = (data.preview ? '<div class="vpre"><b>Preview.</b> This is what your client sees. Your own views are not counted as opens.<button onclick="window.print()">Save as PDF</button></div>' : '') +
      '<div class="vwrap">' + PackDoc.html(p.content, meta, {}) + '</div>' + bar();
    Array.prototype.forEach.call(document.querySelectorAll('[data-o]'), function (b) { b.onclick = function () { give(b.getAttribute('data-o')); }; });
  }
  function give(outcome) {
    var needs = outcome !== 'interview';
    var bg = document.createElement('div'); bg.className = 'vmodal-bg';
    var m = document.createElement('div'); m.className = 'vmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    var title = { interview: 'Interview ' + data.pack.candidate_name.split(' ')[0] + '?', not_for_us: 'Not for you?', more_info: 'What would you like to know?' }[outcome];
    var sub = { interview: 'Add any times that suit, or leave it blank and we will call you.', not_for_us: 'A quick reason helps us send better people. Optional.', more_info: 'Ask anything. We will come back to you today.' }[outcome];
    m.innerHTML = '<h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p><textarea id="ftxt" placeholder="' + (outcome === 'interview' ? 'For example: Tuesday or Wednesday afternoon' : outcome === 'not_for_us' ? 'For example: notice period too long' : 'Your question') + '"></textarea><div class="row"><button class="vb" id="fcancel">Cancel</button><button class="vb pri" id="fsend">' + (outcome === 'interview' ? 'Yes, set it up' : 'Send') + '</button></div>';
    document.body.appendChild(bg); document.body.appendChild(m);
    function close() { bg.remove(); m.remove(); }
    bg.onclick = close; document.getElementById('fcancel').onclick = close;
    if (!needs) setTimeout(function () { document.getElementById('ftxt').focus(); }, 50);
    document.getElementById('fsend').onclick = async function () {
      var b = this; b.disabled = true; b.textContent = 'Sending...';
      try {
        await call('feedback', { outcome: outcome, text: document.getElementById('ftxt').value });
        data.pack.feedback_outcome = outcome; close(); render();
      } catch (e) { b.disabled = false; b.textContent = 'Try again'; alert(e.message); }
    };
  }
  (async function () {
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return err('This link is not valid');
    try { data = await call('view'); }
    catch (e) { return err(e.message.replace(/\.$/, '')); }
    render();
    if (q.get('print') === '1') setTimeout(function () { window.print(); }, 700);
  })();
})();
