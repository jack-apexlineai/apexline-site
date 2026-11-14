/* ApexLine admin: agencies, logins, the licence switch, usage and service keys. Admins only (members.is_admin). */
(function () {
  var CFG = window.PACK_CFG;
  var sb = window.supabase.createClient(CFG.url, CFG.anon, { auth: { persistSession: true, storageKey: 'cp-auth' } });
  var esc = PackDoc.esc;
  var root = document.getElementById('root');
  var A = { list: [] };
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function toast(m, e) { var t = $('#toast') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast' })); t.className = 'toast on' + (e ? ' err' : ''); t.textContent = m; clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'toast'; }, 3800); }
  async function fn(action, body) {
    var s = (await sb.auth.getSession()).data.session;
    var r = await fetch(CFG.fn, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (s ? s.access_token : '') }, body: JSON.stringify(Object.assign({ action: action }, body || {})) });
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || 'Failed');
    return j;
  }
  function ago(t) { if (!t) return 'never'; var s = (Date.now() - new Date(t)) / 1000; if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }
  function modal(title, body, foot) {
    close();
    var bg = document.createElement('div'); bg.className = 'sheet-bg on'; bg.id = 'mbg';
    var el = document.createElement('div'); el.className = 'sheet on'; el.id = 'm';
    el.innerHTML = '<div class="sh-top"><h2 class="sp">' + esc(title) + '</h2><button class="ibtn" style="border:0" id="mx" aria-label="Close">✕</button></div><div class="sh-body">' + body + '</div>' + (foot ? '<div class="sh-foot">' + foot + '</div>' : '');
    document.body.appendChild(bg); document.body.appendChild(el);
    bg.onclick = close; $('#mx').onclick = close;
    return el;
  }
  function close() { ['#m', '#mbg'].forEach(function (s) { var e = $(s); if (e) e.remove(); }); }

  function login(msg) {
    root.innerHTML = '<div class="login"><div class="art"><h2>Candidate Pack <span>admin</span></h2><p>Agencies, logins, the licence switch and usage.</p></div><form class="form" id="lf"><h1>Admin log in</h1>' + (msg ? '<div class="warnbox" style="margin:10px 0">' + esc(msg) + '</div>' : '') + '<div class="field" style="margin-top:16px"><label class="f">Email</label><input class="in" id="le" type="email" autocomplete="username"></div><div class="field"><label class="f">Password</label><input class="in" id="lp" type="password" autocomplete="current-password"></div><button class="btn pri lg block">Log in</button></form></div>';
    $('#lf').onsubmit = async function (e) { e.preventDefault(); var r = await sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value }); if (r.error) return toast(r.error.message, true); boot(); };
  }
  async function boot() {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) return login();
    var me = (await sb.from('members').select('*').eq('user_id', s.user.id).maybeSingle()).data;
    if (!me || !me.is_admin) { await sb.auth.signOut(); return login('That login is not an admin.'); }
    A.me = me;
    root.innerHTML = '<div class="top adm-top"><div class="top-in"><div class="mark">CP</div><div class="ttl sp">Candidate Pack admin</div><button class="btn sm" id="newag">+ New agency</button><button class="btn sm ghost" id="so" style="color:#fff">Log out</button></div></div><div class="wrap"><div id="body"><div class="skel" style="height:160px;margin-top:16px"></div></div></div>';
    $('#so').onclick = async function () { await sb.auth.signOut(); login(); };
    $('#newag').onclick = function () { editAgency(null); };
    draw();
  }
  async function draw() {
    var r = await Promise.all([fn('admin_overview'), fn('admin_secrets')]);
    A.list = r[0].agencies; var sec = r[1].secrets;
    var live = A.list.filter(function (a) { return a.plan !== 'internal'; });
    var h = '<div class="sec"><h2>Agencies</h2><span class="muted">' + live.length + ' total, ' + live.filter(function (a) { return a.ok; }).length + ' switched on</span></div><div class="agrid">';
    h += A.list.map(function (a) {
      var st = a.status === 'locked' ? '<span class="chip red">Locked</span>' : !a.ok ? '<span class="chip red">Paid until passed</span>' : a.status === 'trial' ? '<span class="chip opened">Trial</span>' : '<span class="chip feedback">Active</span>';
      return '<div class="acard"><div class="row"><div class="mark" style="background:' + esc(a.brand_colour) + '">' + (a.logo_url ? '<img src="' + esc(a.logo_url) + '" alt="">' : esc(a.name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase())) + '</div><div class="sp" style="min-width:0"><div class="nm ell">' + esc(a.name) + '</div><div class="small muted ell">' + esc(a.slug) + ' · ' + esc(a.plan) + (a.paid_until ? ' · paid until ' + esc(a.paid_until) : '') + '</div></div>' + st + '</div>' +
        '<div class="stats"><div><b>' + a.members.length + '/' + a.recruiter_seats + '</b><span>logins</span></div><div><b>' + a.packs_30d + '</b><span>packs 30d</span></div><div><b>' + a.candidates + '</b><span>candidates</span></div><div><b>$' + a.ai_cost_30d.toFixed(2) + '</b><span>AI 30d</span></div></div>' +
        '<div class="small muted" style="margin-bottom:10px">Last activity ' + ago(a.last_activity) + '</div>' +
        '<div class="row flexwrap"><button class="btn sm" data-edit="' + a.id + '">Edit</button><button class="btn sm" data-team="' + a.id + '">Logins</button>' + (a.status === 'locked' ? '<button class="btn sm pri" data-unlock="' + a.id + '">Switch on</button>' : '<button class="btn sm danger" data-lock="' + a.id + '">Switch off</button>') + (a.plan === 'demo' ? '<button class="btn sm" data-shift="' + a.id + '">Refresh demo dates</button>' : '') + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="two" style="margin-top:20px"><div class="card pad"><h2 style="margin-bottom:10px">Onboard a new agency (under 30 minutes)</h2><ol class="steps"><li>New agency: name, short name, colour, layout, seats, plan, status.</li><li>Upload their logo and paste two past write-ups as voice samples.</li><li>Paste their chaser wording if they have their own.</li><li>Logins: add the owner and recruiters. Copy each temporary password.</li><li>Send them the link and logins, then do the 20 minute walkthrough.</li></ol><p class="small muted" style="margin:10px 0 0">Switch off sets status to locked: every page, write and AI call is blocked, and client links stop working. Switch on reverses it.</p></div>';
    h += '<div class="card pad"><h2 style="margin-bottom:10px">Service keys</h2>' + keyRow('ANTHROPIC_API_KEY', 'Claude API key', sec) + keyRow('RESEND_API_KEY', 'Resend API key (email)', sec) +
      '<div class="member"><div class="sp"><div class="b">Real emails</div><div class="small muted">' + (sec.EMAIL_LIVE.value === 'yes' ? 'LIVE: emails go to the real client and recruiter addresses' : 'Test mode: every email goes to delivered@resend.dev') + '</div></div><button class="btn sm ' + (sec.EMAIL_LIVE.value === 'yes' ? '' : 'pri') + '" id="live">' + (sec.EMAIL_LIVE.value === 'yes' ? 'Back to test mode' : 'Go live') + '</button></div>' +
      '<div class="member"><div class="sp"><div class="b">Chasers</div><div class="small muted">Run every 30 minutes by pg_cron, UK working hours only</div></div><button class="btn sm" id="runch">Run now</button></div></div></div>';
    $('#body').innerHTML = h;
    $$('[data-edit]').forEach(function (b) { b.onclick = function () { editAgency(A.list.find(function (a) { return a.id === b.getAttribute('data-edit'); })); }; });
    $$('[data-team]').forEach(function (b) { b.onclick = function () { team(A.list.find(function (a) { return a.id === b.getAttribute('data-team'); })); }; });
    $$('[data-lock]').forEach(function (b) { b.onclick = function () { if (confirm('Switch this agency off? Every login and client link stops working until you switch it back on.')) setStatus(b.getAttribute('data-lock'), 'locked'); }; });
    $$('[data-unlock]').forEach(function (b) { b.onclick = function () { setStatus(b.getAttribute('data-unlock'), 'active'); }; });
    $$('[data-shift]').forEach(function (b) { b.onclick = async function () { try { var r = await fn('admin_shift_demo', { agency_id: b.getAttribute('data-shift') }); toast('Demo dates moved forward ' + r.shifted + '.'); draw(); } catch (e) { toast(e.message, true); } }; });
    $$('[data-key]').forEach(function (b) { b.onclick = async function () { var k = b.getAttribute('data-key'); var v = prompt('Paste the ' + k + ' (leave blank to remove). It is stored server side and never shown again.'); if (v === null) return; try { await fn('admin_secrets', { name: k, value: v }); toast('Saved.'); draw(); } catch (e) { toast(e.message, true); } }; });
    $('#live').onclick = async function () {
      var goLive = sec.EMAIL_LIVE.value !== 'yes';
      if (goLive && !confirm('Go live? From now on emails go to real clients and recruiters.')) return;
      await fn('admin_secrets', { name: 'EMAIL_LIVE', value: goLive ? 'yes' : '' }); draw();
    };
    $('#runch').onclick = async function () { try { var r = await fn('admin_run_chasers'); toast(r.skipped ? 'Not run: ' + r.skipped : r.sent + ' chasers sent.'); } catch (e) { toast(e.message, true); } };
  }
  function keyRow(k, label, sec) { return '<div class="member"><div class="sp"><div class="b">' + label + '</div><div class="small muted">' + (sec[k].set ? 'Set ' + ago(sec[k].updated_at) : 'Not set') + '</div></div><button class="btn sm" data-key="' + k + '">' + (sec[k].set ? 'Replace' : 'Add') + '</button></div>'; }
  async function setStatus(id, status) { try { await fn('admin_save_agency', { id: id, agency: { status: status } }); toast(status === 'locked' ? 'Switched off.' : 'Switched on.'); draw(); } catch (e) { toast(e.message, true); } }

  function editAgency(a) {
    var x = a || { name: '', slug: '', brand_colour: '#C8102E', font: 'Inter', template_key: 'classic', voice_samples: '', chaser_48h: '', chaser_5d: '', plan: 'core_monthly', recruiter_seats: 4, status: 'trial', paid_until: '', retention_months: 24, notes: '', logo_url: '' };
    var sel = function (id, opts, v) { return '<select class="in" id="' + id + '">' + opts.map(function (o) { o = [].concat(o); return '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + (o[1] || o[0]) + '</option>'; }).join('') + '</select>'; };
    var el = modal(a ? 'Edit ' + a.name : 'New agency',
      '<div class="grid2"><div class="field"><label class="f">Agency name</label><input class="in" id="an" value="' + esc(x.name) + '"></div><div class="field"><label class="f">Short name (for the sending address)</label><input class="in" id="as" value="' + esc(x.slug) + '" placeholder="northbridge-search"></div></div>' +
      '<div class="grid2"><div class="field"><label class="f">Brand colour</label><input class="in" id="ac" value="' + esc(x.brand_colour) + '" type="color" style="height:46px;padding:4px"></div><div class="field"><label class="f">Font</label>' + sel('af', ['Inter', 'Manrope', 'DM Sans', 'Lora', 'Playfair Display'], x.font) + '</div></div>' +
      '<div class="grid2"><div class="field"><label class="f">Pack layout</label>' + sel('at', [['classic', 'Classic'], ['executive', 'Executive'], ['modern', 'Modern'], ['minimal', 'Minimal']], x.template_key) + '</div><div class="field"><label class="f">Logo</label><input class="in" type="file" id="al" accept="image/png,image/jpeg,image/svg+xml,image/webp">' + (x.logo_url ? '<div class="tiny muted">Current: set</div>' : '') + '</div></div>' +
      '<div class="grid2"><div class="field"><label class="f">Plan</label>' + sel('ap', [['core_monthly', 'Core monthly'], ['core_yearly', 'Core yearly'], ['demo', 'Demo'], ['internal', 'Internal']], x.plan) + '</div><div class="field"><label class="f">Logins (seats)</label><input class="in" id="ase" type="number" min="1" max="200" value="' + x.recruiter_seats + '"></div></div>' +
      '<div class="grid2"><div class="field"><label class="f">Status</label>' + sel('ast', [['trial', 'Trial'], ['active', 'Active'], ['locked', 'Locked (switched off)']], x.status) + '</div><div class="field"><label class="f">Paid until (blank = no end date)</label><input class="in" id="apu" type="date" value="' + esc(x.paid_until || '') + '"></div></div>' +
      '<div class="field"><label class="f">Voice samples (two or three past write-ups)</label><textarea class="in" id="av" style="min-height:160px">' + esc(x.voice_samples) + '</textarea></div>' +
      '<div class="field"><label class="f">48 hour chaser (blank keeps the default)</label><textarea class="in" id="a48" style="min-height:90px">' + esc(x.chaser_48h) + '</textarea></div>' +
      '<div class="field"><label class="f">5 day chaser</label><textarea class="in" id="a5" style="min-height:90px">' + esc(x.chaser_5d) + '</textarea></div>' +
      '<div class="grid2"><div class="field"><label class="f">Review candidates after (months)</label><input class="in" id="ar" type="number" min="1" max="120" value="' + x.retention_months + '"></div><div class="field"><label class="f">Notes (only you see these)</label><input class="in" id="ano" value="' + esc(x.notes || '') + '"></div></div>',
      '<button class="btn" id="mc">Cancel</button><button class="btn pri" id="ms">' + (a ? 'Save' : 'Create agency') + '</button>');
    $('#an').oninput = function () { if (!a) $('#as').value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); };
    $('#mc').onclick = close;
    $('#ms').onclick = async function () {
      var row = { name: $('#an').value.trim(), slug: $('#as').value.trim(), brand_colour: $('#ac').value, font: $('#af').value, template_key: $('#at').value, plan: $('#ap').value, recruiter_seats: Number($('#ase').value), status: $('#ast').value, paid_until: $('#apu').value, voice_samples: $('#av').value, retention_months: Number($('#ar').value), notes: $('#ano').value };
      if ($('#a48').value.trim()) row.chaser_48h = $('#a48').value.trim();
      if ($('#a5').value.trim()) row.chaser_5d = $('#a5').value.trim();
      if (!row.name || !row.slug) return toast('Add a name and short name.', true);
      try {
        var r = await fn('admin_save_agency', { id: a && a.id, agency: row });
        var f = $('#al').files[0];
        if (f) {
          var path = r.agency.id + '/logo-' + Date.now() + '.' + (f.name.split('.').pop() || 'png').toLowerCase();
          var up = await sb.storage.from('logos').upload(path, f, { contentType: f.type, upsert: true });
          if (up.error) throw new Error('Logo: ' + up.error.message);
          await fn('admin_save_agency', { id: r.agency.id, agency: { logo_url: sb.storage.from('logos').getPublicUrl(path).data.publicUrl } });
        }
        close(); toast(a ? 'Saved.' : 'Agency created. Now add their logins.'); draw();
      } catch (e) { toast(e.message, true); }
    };
  }
  function team(a) {
    var el = modal('Logins for ' + a.name,
      '<div id="tl">' + a.members.map(function (m) { return '<div class="member"><div class="av">' + esc((m.name || '?').slice(0, 2).toUpperCase()) + '</div><div class="sp" style="min-width:0"><div class="b ell">' + esc(m.name) + '</div><div class="small muted ell">' + esc(m.email) + ' · ' + esc(m.role) + '</div></div><button class="btn sm danger" data-rm="' + m.user_id + '">Remove</button></div>'; }).join('') + '</div>' +
      '<div class="sec"><h2>Add a login</h2><span class="muted">' + a.members.length + ' of ' + a.recruiter_seats + ' used</span></div><div class="grid2"><input class="in" id="tn" placeholder="Name"><input class="in" id="te" type="email" placeholder="Email"><input class="in" id="tp" placeholder="Mobile (optional)"><select class="in" id="tr"><option value="owner">Owner</option><option value="recruiter" selected>Recruiter</option></select></div><div id="tres"></div>',
      '<button class="btn" id="tc">Done</button><button class="btn pri" id="ta">Add login</button>');
    $('#tc').onclick = function () { close(); draw(); };
    $$('[data-rm]', el).forEach(function (b) { b.onclick = async function () { if (!confirm('Remove this login?')) return; try { await fn('remove_member', { user_id: b.getAttribute('data-rm') }); b.closest('.member').remove(); toast('Removed.'); } catch (e) { toast(e.message, true); } }; });
    $('#ta').onclick = async function () {
      try {
        var r = await fn('invite', { agency_id: a.id, name: $('#tn').value.trim(), email: $('#te').value.trim(), phone: $('#tp').value.trim(), role: $('#tr').value });
        $('#tres').innerHTML = '<div class="okbox" style="margin-top:12px"><div><b>Login created.</b> Send this to them (shown once):<br>Email: ' + esc(r.email) + '<br>Temporary password: <code>' + esc(r.password) + '</code><br>Link: https://apexlineai.com/pack/</div></div>';
        $('#tn').value = ''; $('#te').value = ''; $('#tp').value = '';
      } catch (e) { toast(e.message, true); }
    };
  }
  boot();
})();
