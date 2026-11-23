/* Settings > Team and permissions. Who can sign in, how, and what they can do.
   Sign in secrets are kept in this browser only and never shown, just "set". */
(function () {
  var $ = WS.$, esc = WS.esc, O = WS.O;

  function users() { return (WS.state.users || []).filter(function (u) { return u.status !== 'removed'; }); }
  function byId(id) { return (WS.state.users || []).filter(function (u) { return u.id === id; })[0]; }
  function stamp(by, at, what) { return (what || 'Added') + ' by ' + by + ', ' + WS.whenUK(at); }
  function auditLine(u) {
    var bits = [];
    bits.push(u.owner ? 'Account owner' : stamp(u.addedBy || 'owner', u.addedAt));
    if (u.changedAt) bits.push(stamp(u.changedBy, u.changedAt, 'Changed'));
    if (u.status === 'suspended' && u.suspendedAt) bits.push(stamp(u.suspendedBy, u.suspendedAt, 'Suspended'));
    return bits.join(' · ');
  }
  function signLabel(u) { return (u.signIn === 'password' ? 'Password' : 'PIN') + ' set'; }
  function initials(u) { return ((u.first || '').charAt(0) + (u.last || '').charAt(0)).toUpperCase(); }
  function permCount(u) { return WS.PERMS.filter(function (p) { return u.perms && u.perms[p[0]]; }).length; }

  O.teamCard = function () {
    var list = users();
    return '<div class="card" id="team"><div class="ch"><h2>Team and permissions</h2>' +
      '<div class="sp"><button type="button" class="btn sm" id="tmAdd">Add user</button></div></div>' +
      '<div class="hint" style="margin-bottom:12px">Who can sign in and what they can do. You are signed in as <b class="mono">' + esc(WS.ME) + '</b>, ' + esc(((WS.me && WS.me()) || {}).role || 'Director') + '.</div>' +
      '<div class="tlist">' + list.map(function (u) {
        return '<div class="trow' + (u.status === 'suspended' ? ' sus' : '') + '" data-user="' + u.id + '">' +
          '<div class="tav">' + esc(initials(u)) + '</div>' +
          '<div class="tmain"><div class="tname">' + esc(u.first + ' ' + u.last) + ' <span class="mono tuser">' + esc(u.username) + '</span></div>' +
          '<div class="muted sm">' + esc(u.title || u.role) + ' · ' + esc(signLabel(u)) + ' · ' + permCount(u) + ' permission' + (permCount(u) === 1 ? '' : 's') + '</div>' +
          '<div class="taudit">' + esc(auditLine(u)) + '</div></div>' +
          '<div class="tside">' + O.pill(u.role, u.role === 'Director' ? 'go' : '') +
          (u.status === 'suspended' ? O.pill('Suspended', 'bad') : '') +
          '<button type="button" class="btn alt sm" data-uedit="' + u.id + '">Edit</button></div></div>';
      }).join('') + '</div></div>';
  };

  function permsHtml(perms, lock) {
    return '<div class="perms">' + WS.PERMS.map(function (p) {
      return '<label class="tog"><input type="checkbox" data-perm="' + p[0] + '"' + (perms[p[0]] ? ' checked' : '') + (lock ? ' disabled' : '') + '>' +
        '<span class="trk"><i></i></span><span class="tl">' + esc(p[1]) + '</span></label>';
    }).join('') + '</div>';
  }
  function readPerms(root) {
    var o = {};
    root.querySelectorAll('[data-perm]').forEach(function (c) { o[c.dataset.perm] = c.checked; });
    return o;
  }
  function signHtml(method, editing) {
    return '<div class="f"><span class="lb">Sign in with</span><div class="seg" id="uSignM">' +
      '<button type="button" data-m="pin"' + (method === 'pin' ? ' class="on"' : '') + '>4 digit PIN</button>' +
      '<button type="button" data-m="password"' + (method === 'password' ? ' class="on"' : '') + '>Password</button></div></div>' +
      '<label class="f" id="uPinF"' + (method === 'pin' ? '' : ' hidden') + '><span class="lb">' + (editing ? 'New PIN, leave blank to keep it' : 'PIN') + '</span>' +
      '<input class="in" id="uPin" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 numbers"></label>' +
      '<label class="f" id="uPwF"' + (method === 'password' ? '' : ' hidden') + '><span class="lb">' + (editing ? 'New password, leave blank to keep it' : 'Password') + '</span>' +
      '<input class="in" id="uPw" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>' +
      '<div class="hint" style="margin:-4px 0 12px">Demo only: it is kept in this browser and only ever shown as set.</div>';
  }
  function wireSign(m) {
    m.querySelectorAll('#uSignM button').forEach(function (b) {
      b.onclick = function () {
        m.querySelectorAll('#uSignM button').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('uPinF').hidden = b.dataset.m !== 'pin';
        $('uPwF').hidden = b.dataset.m !== 'password';
      };
    });
    $('uPin').oninput = function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); };
  }
  /* the secret typed in, checked; null when it is not right */
  function readSecret(m, required) {
    var method = m.querySelector('#uSignM .on').dataset.m;
    var v = method === 'pin' ? $('uPin').value.trim() : $('uPw').value;
    if (!v && !required) return { method: method, value: '' };
    if (method === 'pin' && !/^\d{4}$/.test(v)) { WS.toast('The PIN needs to be 4 numbers.', 'bad'); return null; }
    if (method === 'password' && v.length < 8) { WS.toast('The password needs at least 8 characters.', 'bad'); return null; }
    return { method: method, value: v };
  }
  function roleSelect(cur, lock) {
    return '<label class="f"><span class="lb">Role</span><select class="in" id="uRole"' + (lock ? ' disabled' : '') + '>' +
      WS.ROLES.map(function (r) { return '<option' + (r === cur ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>' +
      (lock ? '<span class="hint">The account owner stays a Director.</span>' : '') + '</label>';
  }
  function linkFitter(u, pin) {
    var st = WS.state.settings;
    var f = u.fitterId ? WS.fitter(u.fitterId) : null;
    if (!f) {
      f = { id: WS.uid('f'), name: u.first + ' ' + u.last, role: u.title || 'HGV technician', pin: pin || '0000', costRate: 22,
        payType: 'hour', payRate: 18, dayHours: st.dayHours, skills: Object.keys(st.standardTimes) };
      st.fitters.push(f);
      u.fitterId = f.id;
    }
    if (pin) f.pin = pin;
  }

  function addUser() {
    var m = O.modal('Add user',
      '<div class="row"><label class="f"><span class="lb">First name</span><input class="in" id="uFirst" autocomplete="off"></label>' +
      '<label class="f"><span class="lb">Surname</span><input class="in" id="uLast" autocomplete="off"></label></div>' +
      '<div class="row"><label class="f"><span class="lb">Username</span><input class="in mono" id="uName" autocomplete="off" placeholder="first initial dot surname"></label>' +
      roleSelect('Office') + '</div>' +
      signHtml('pin') +
      '<div class="f"><span class="lb">What they can do</span><div id="uPerms">' + permsHtml(WS.rolePerms('Office')) + '</div></div>',
      'Add user', function () {
        var first = $('uFirst').value.trim(), last = $('uLast').value.trim(), un = $('uName').value.trim().toLowerCase();
        if (!first || !last) { WS.toast('Put in their first name and surname.', 'bad'); return; }
        if (!/^[a-z0-9.]{3,}$/.test(un)) { WS.toast('Usernames are letters, numbers and dots, like owner.', 'bad'); return; }
        if (users().some(function (u) { return u.username === un; })) { WS.toast(un + ' is already taken.', 'bad'); return; }
        var sec = readSecret(m, true);
        if (!sec) return;
        var u = {
          id: WS.uid('u'), first: first, last: last, username: un, role: $('uRole').value, title: $('uRole').value,
          signIn: sec.method, secret: sec.method === 'password' ? sec.value : '', status: 'active',
          perms: readPerms($('uPerms')), addedBy: WS.ME, addedAt: WS.nowStamp()
        };
        if (u.role === 'Fitter') { u.title = 'HGV technician'; linkFitter(u, sec.method === 'pin' ? sec.value : ''); }
        else if (sec.method === 'pin') u.pin = sec.value;
        WS.state.users.push(u);
        WS.save(); O.closeModal(); O.render();
        WS.toast(first + ' added as ' + un + '.' + (u.role === 'Fitter' ? ' They can sign into the fitter app now.' : ''), 'ok');
      });
    var typed = false;
    var auto = function () { if (!typed) $('uName').value = WS.username($('uFirst').value, $('uLast').value, WS.state.users); };
    $('uFirst').oninput = auto; $('uLast').oninput = auto;
    $('uName').oninput = function () { typed = !!this.value; };
    $('uRole').onchange = function () { $('uPerms').innerHTML = permsHtml(WS.rolePerms(this.value)); };
    wireSign(m);
    $('uFirst').focus();
  }

  function editUser(id) {
    var u = byId(id);
    if (!u) return;
    var lock = !!u.owner;
    var extra = lock ? '' :
      '<button class="btn alt" id="uSus">' + (u.status === 'suspended' ? 'Reactivate' : 'Suspend') + '</button>' +
      '<button class="btn danger" id="uDel">Remove</button>';
    var m = O.modal(u.first + ' ' + u.last,
      '<div class="muted sm" style="margin:-4px 0 14px"><span class="mono">' + esc(u.username) + '</span> · ' + esc(auditLine(u)) + '</div>' +
      roleSelect(u.role, lock) +
      signHtml(u.signIn || 'pin', true) +
      '<div class="f"><span class="lb">What they can do</span><div id="uPerms">' + permsHtml(u.perms || WS.rolePerms(u.role), lock) + '</div>' +
      (lock ? '<div class="hint">The owner can always do everything.</div>' : '') + '</div>',
      'Save', function () {
        var sec = readSecret(m, false);
        if (!sec) return;
        if (sec.method !== u.signIn && !sec.value) { WS.toast('Set the new ' + (sec.method === 'pin' ? 'PIN' : 'password') + ' too.', 'bad'); return; }
        var role = $('uRole').value;
        u.role = role;
        if (!lock) u.perms = readPerms($('uPerms'));
        if (sec.value) {
          u.signIn = sec.method;
          if (sec.method === 'password') u.secret = sec.value;
        }
        if (role === 'Fitter') linkFitter(u, sec.method === 'pin' ? sec.value : '');
        else if (sec.method === 'pin' && sec.value) u.pin = sec.value;
        u.changedBy = WS.ME; u.changedAt = WS.nowStamp();
        WS.save(); O.closeModal(); O.render();
        WS.toast(u.first + ' saved.', 'ok');
      }, '', extra);
    $('uRole').onchange = function () { $('uPerms').innerHTML = permsHtml(WS.rolePerms(this.value)); };
    wireSign(m);
    if ($('uSus')) $('uSus').onclick = function () {
      if (u.status === 'suspended') { u.status = 'active'; u.suspendedAt = ''; }
      else { u.status = 'suspended'; u.suspendedBy = WS.ME; u.suspendedAt = WS.nowStamp(); }
      u.changedBy = WS.ME; u.changedAt = WS.nowStamp();
      WS.save(); O.closeModal(); O.render();
      WS.toast(u.first + (u.status === 'suspended' ? ' is suspended and cannot sign in.' : ' can sign in again.'), 'ok');
    };
    if ($('uDel')) $('uDel').onclick = function () {
      if (!confirm('Remove ' + u.first + ' ' + u.last + '? They will not be able to sign in. Their past work stays on the records.')) return;
      u.status = 'removed'; u.changedBy = WS.ME; u.changedAt = WS.nowStamp();
      WS.save(); O.closeModal(); O.render();
      WS.toast(u.first + ' removed.', 'ok');
    };
  }

  O.wireTeam = function () {
    if ($('tmAdd')) $('tmAdd').onclick = addUser;
    document.querySelectorAll('[data-uedit]').forEach(function (b) { b.onclick = function () { editUser(b.dataset.uedit); }; });
  };
})();
