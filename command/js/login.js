// Command login screens: sign in (email or username + password), choose a password (from the
// invite or reset email), and the phone PIN.
//
// The PIN: after the first password sign in on a phone, John can choose a 6 to 8 digit PIN.
// It is stored only on that phone, as a salted PBKDF2 hash (210,000 rounds, SHA-256), never sent
// anywhere. 5 wrong PINs and it is wiped and he signs in with his password again.
// The PIN is a screen lock: it stops someone picking up his unlocked phone and opening the app.
//
// Usage (see INTEGRATION.md):  await gate(live, { pin: 'phone' });  then start the app.

const PIN_KEY = 'command.pin';
const PIN_ITER = 210000;
const PIN_MAX_FAILS = 5;
const PIN_MIN = 6;
const PIN_MAX = 8;

const FLAME = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5c.5 3.5 5.5 6 5.5 11a5.5 5.5 0 01-11 0c0-2.5 1.2-4 2.5-5.2.3 1.7 1 2.7 2 3.2-.3-3.4.2-6.5 1-9z"/></svg>';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: PIN just will not stick */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// ---------- PIN hashing ----------
const b64e = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin, uid, salt, iter) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${pin}:${uid}`), 'PBKDF2', false, ['deriveBits']);
  return b64e(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
}

export async function pinMake(pin, uid, iter = PIN_ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${iter}$${b64e(salt)}$${await derive(pin, uid, salt, iter)}`;
}

export async function pinCheck(pin, uid, stored) {
  const [, iter, salt, hash] = String(stored).split('$');
  if (!iter || !salt || !hash) return false;
  const got = await derive(pin, uid, b64d(salt), Number(iter));
  let diff = got.length ^ hash.length;
  for (let i = 0; i < Math.min(got.length, hash.length); i++) diff |= got.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export const pinRecord = () => store.get(PIN_KEY);
export const clearPin = () => store.del(PIN_KEY);

function pinWanted(mode) {
  if (mode === 'off') return false;
  if (mode === 'always') return true;
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

// ---------- Screen ----------
const CSS = `
#cmd-gate{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:24px 16px;overflow-y:auto;
  background:radial-gradient(120% 80% at 50% 0%,var(--accent-soft,rgba(228,82,29,.1)),transparent 60%),var(--bg,#0d0c0b);color:var(--text,#f3efe9);
  font-family:var(--font,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif)}
#cmd-gate .g-card{width:100%;max-width:380px;background:var(--card,#171513);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:var(--r,20px);
  padding:28px 22px;box-shadow:var(--shadow-lg,0 30px 80px -24px rgba(0,0,0,.5));text-align:center}
#cmd-gate .g-mark{width:56px;height:56px;margin:0 auto 10px;border-radius:16px;display:grid;place-items:center;color:var(--accent-ink,#fff);
  background:linear-gradient(180deg,var(--accent-2,#ff7a3c),var(--accent,#e4521d))}
#cmd-gate h1{font-family:var(--display,inherit);font-size:24px;margin:4px 0 4px;letter-spacing:-.01em}
#cmd-gate p{margin:0 0 16px;color:var(--text-2,#bdb4a8);font-size:15px;line-height:1.45}
#cmd-gate form{display:grid;gap:12px;text-align:left}
#cmd-gate label{font-size:14px;font-weight:600;color:var(--text-2,#bdb4a8);display:grid;gap:6px}
#cmd-gate input{font:inherit;font-size:17px;width:100%;box-sizing:border-box;padding:13px 14px;border-radius:12px;border:1px solid var(--line-2,rgba(255,255,255,.16));
  background:var(--card-2,#1f1c19);color:var(--text,#f3efe9)}
#cmd-gate input:focus{outline:2px solid var(--accent,#e4521d);outline-offset:1px}
#cmd-gate .g-row{display:flex;gap:8px;align-items:center}
#cmd-gate .g-row input{flex:1}
#cmd-gate .g-btn{font:inherit;font-size:17px;font-weight:600;border:0;border-radius:12px;padding:14px 16px;cursor:pointer;width:100%;
  color:var(--accent-ink,#fff);background:linear-gradient(180deg,var(--accent-2,#ff7a3c),var(--accent,#e4521d))}
#cmd-gate .g-btn[disabled]{opacity:.55;cursor:default}
#cmd-gate .g-link{font:inherit;font-size:15px;background:none;border:0;color:var(--accent-2,#ff7a3c);cursor:pointer;padding:10px;margin-top:6px}
#cmd-gate .g-show{font:inherit;font-size:14px;background:var(--card-3,#2a2622);color:var(--text-2,#bdb4a8);border:0;border-radius:10px;padding:12px 10px;cursor:pointer;white-space:nowrap}
#cmd-gate .g-msg{min-height:22px;font-size:14px;margin:6px 0 0;color:var(--bad,#ff6b6b);text-align:center}
#cmd-gate .g-msg.ok{color:var(--good,#3ecf8e)}
#cmd-gate .g-dots{display:flex;gap:10px;justify-content:center;margin:6px 0 4px;min-height:16px}
#cmd-gate .g-dots i{width:14px;height:14px;border-radius:50%;border:2px solid var(--line-2,rgba(255,255,255,.3))}
#cmd-gate .g-dots i.on{background:var(--accent,#e4521d);border-color:var(--accent,#e4521d)}
#cmd-gate .g-dots.shake{animation:gshake .35s}
@keyframes gshake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
#cmd-gate .g-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px auto 6px;max-width:290px}
#cmd-gate .g-pad button{font:inherit;font-size:24px;font-weight:600;height:62px;border-radius:16px;border:1px solid var(--line,rgba(255,255,255,.08));
  background:var(--card-2,#1f1c19);color:var(--text,#f3efe9);cursor:pointer}
#cmd-gate .g-pad button.fn{font-size:15px;font-weight:600;color:var(--text-2,#bdb4a8)}
#cmd-gate .g-pad button:active{transform:scale(.97)}
#cmd-gate .g-pad .blank{visibility:hidden}
#cmd-gate .g-small{font-size:13px;color:var(--muted,#8f857a);margin-top:14px}
@media (prefers-reduced-motion:reduce){#cmd-gate .g-dots.shake{animation:none}}
`;

function root() {
  let el = document.getElementById('cmd-gate');
  if (!el) {
    if (!document.getElementById('cmd-gate-css')) {
      const st = document.createElement('style');
      st.id = 'cmd-gate-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    el = document.createElement('div');
    el.id = 'cmd-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    document.body.appendChild(el);
  }
  document.body.classList.add('gate-open');
  return el;
}

function hide() {
  const el = document.getElementById('cmd-gate');
  if (el) el.remove();
  document.body.classList.remove('gate-open');
}

const card = (title, sub, inner) => `<div class="g-card"><div class="g-mark">${FLAME}</div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}${inner}</div>`;

// ---------- Screens ----------
function signInScreen(live, { message, okMessage } = {}) {
  return new Promise((resolve) => {
    const el = root();
    el.setAttribute('aria-label', 'Sign in');
    el.innerHTML = card('Command', 'Sign in to your planner.', `
      <form data-g="signin" novalidate>
        <label>Email or username<input name="id" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" required></label>
        <label>Password<div class="g-row"><input name="pw" type="password" autocomplete="current-password" required><button type="button" class="g-show" data-g="show">Show</button></div></label>
        <button class="g-btn" type="submit">Sign in</button>
      </form>
      <p class="g-msg ${okMessage ? 'ok' : ''}" role="alert" data-g="msg">${esc(okMessage || message || '')}</p>
      <button class="g-link" type="button" data-g="forgot">Forgot your password?</button>`);
    const f = el.querySelector('form');
    const msg = el.querySelector('[data-g="msg"]');
    const say = (t, good = false) => { msg.textContent = t; msg.classList.toggle('ok', good); };
    el.querySelector('[data-g="show"]').onclick = (e) => {
      const i = f.pw;
      i.type = i.type === 'password' ? 'text' : 'password';
      e.target.textContent = i.type === 'password' ? 'Show' : 'Hide';
    };
    el.querySelector('[data-g="forgot"]').onclick = () => forgotScreen(live, f.id.value).then(resolve);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const b = f.querySelector('button[type=submit]');
      if (!f.id.value.trim() || !f.pw.value) return say('Type your email or username and your password.');
      b.disabled = true;
      b.textContent = 'Signing in...';
      try {
        await live.auth.signIn(f.id.value, f.pw.value);
        f.pw.value = '';
        resolve('password');
      } catch (err) {
        say(err.kind === 'offline' ? 'You are offline. Signing in needs the internet the first time.' : err.message);
        b.disabled = false;
        b.textContent = 'Sign in';
      }
    };
    setTimeout(() => { try { f.id.focus(); } catch { /* ignore */ } }, 30);
  });
}

function forgotScreen(live, prefill = '') {
  return new Promise((resolve) => {
    const el = root();
    el.innerHTML = card('Reset your password', 'Type the email you use for Command. We will email you a link to choose a new password.', `
      <form data-g="forgot" novalidate>
        <label>Email<input name="email" type="email" autocomplete="email" autocapitalize="none" value="${esc(prefill.includes('@') ? prefill : '')}" required></label>
        <button class="g-btn" type="submit">Email me a link</button>
      </form>
      <p class="g-msg" role="alert" data-g="msg"></p>
      <button class="g-link" type="button" data-g="back">Back to sign in</button>`);
    const f = el.querySelector('form');
    const msg = el.querySelector('[data-g="msg"]');
    el.querySelector('[data-g="back"]').onclick = () => signInScreen(live).then(resolve);
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) { msg.textContent = 'Type your full email address.'; return; }
      const b = f.querySelector('button');
      b.disabled = true;
      try {
        await live.auth.sendReset(f.email.value, location.origin + location.pathname);
      } catch (err) {
        if (err.kind === 'offline') { msg.textContent = 'You are offline. Try again when you have internet.'; b.disabled = false; return; }
      }
      // Same answer whether or not the email is known.
      signInScreen(live, { okMessage: 'If that email has an account, a reset link is on its way. Check your inbox.' }).then(resolve);
    };
  });
}

function setPasswordScreen(live, type) {
  return new Promise((resolve) => {
    const el = root();
    const first = type === 'invite';
    el.innerHTML = card(first ? 'Welcome to Command' : 'Choose a new password', first ? 'Choose your own password. Nobody else will see it, Jack included.' : 'Pick a new password for Command.', `
      <form data-g="setpw" novalidate>
        <label>New password<div class="g-row"><input name="pw" type="password" autocomplete="new-password" minlength="10" required><button type="button" class="g-show" data-g="show">Show</button></div></label>
        <label>Type it again<input name="pw2" type="password" autocomplete="new-password" required></label>
        <button class="g-btn" type="submit">Save password</button>
      </form>
      <p class="g-msg" role="alert" data-g="msg"></p>
      <p class="g-small">At least 10 characters. A short sentence you will remember works well.</p>`);
    const f = el.querySelector('form');
    const msg = el.querySelector('[data-g="msg"]');
    el.querySelector('[data-g="show"]').onclick = (e) => {
      const t = f.pw.type === 'password' ? 'text' : 'password';
      f.pw.type = t;
      f.pw2.type = t;
      e.target.textContent = t === 'password' ? 'Show' : 'Hide';
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (f.pw.value.length < 10) { msg.textContent = 'Use at least 10 characters.'; return; }
      if (f.pw.value !== f.pw2.value) { msg.textContent = 'The two passwords do not match.'; return; }
      const b = f.querySelector('button[type=submit]');
      b.disabled = true;
      try {
        await live.auth.setPassword(f.pw.value);
        f.pw.value = '';
        f.pw2.value = '';
        resolve('password');
      } catch (err) {
        msg.textContent = err.kind === 'offline' ? 'You are offline. Try again when you have internet.' : err.message;
        b.disabled = false;
      }
    };
  });
}

function pinScreen({ mode, uid }) {
  // mode 'set': choose (6 to 8 digits) then confirm. mode 'enter': unlock.
  return new Promise((resolve) => {
    const el = root();
    const rec = pinRecord();
    const st = { entry: '', first: '', busy: false };
    const title = () => (mode === 'enter' ? 'Enter your PIN' : st.first ? 'Type it again' : 'Choose a PIN for this phone');
    const sub = () => (mode === 'enter' ? '' : st.first ? '' : '6 to 8 numbers. You will use it to open Command on this phone.');
    const target = () => (mode === 'enter' ? (rec && rec.len) || PIN_MAX : st.first ? st.first.length : PIN_MAX);
    el.setAttribute('aria-label', 'PIN');
    el.innerHTML = card('', '', `
      <h1 data-g="title" style="margin-top:0"></h1><p data-g="sub"></p>
      <div class="g-dots" data-g="dots" aria-hidden="true"></div>
      <p class="g-msg" role="alert" data-g="msg"></p>
      <div class="g-pad" data-g="pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((k) => (k === 'del' ? '<button type="button" class="fn" data-k="del" aria-label="Delete">Delete</button>' : k === 'ok' ? `<button type="button" class="fn${mode === 'enter' ? ' blank' : ''}" data-k="ok">Next</button>` : `<button type="button" data-k="${k}">${k}</button>`)).join('')}</div>
      ${mode === 'enter' ? '<button class="g-link" type="button" data-g="forgot">Use my password instead</button>' : '<button class="g-link" type="button" data-g="skip">Not now</button>'}`);
    el.querySelector('h1').remove(); // the card's empty title
    el.querySelector('.g-card > p:not([data-g])')?.remove();
    const $ = (s) => el.querySelector(`[data-g="${s}"]`);
    const draw = () => {
      $('title').textContent = title();
      $('sub').textContent = sub();
      const n = Math.max(target(), st.entry.length, mode === 'set' && !st.first ? PIN_MIN : 0);
      $('dots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < st.entry.length ? 'on' : ''}"></i>`).join('');
      $('dots').setAttribute('aria-label', `${st.entry.length} digits typed`);
      const ok = el.querySelector('[data-k="ok"]');
      if (ok && mode === 'set') ok.disabled = st.first ? true : st.entry.length < PIN_MIN;
    };
    const fail = (t) => {
      st.entry = '';
      draw();
      $('msg').textContent = t;
      const d = $('dots');
      d.classList.remove('shake');
      void d.offsetWidth;
      d.classList.add('shake');
    };
    const submit = async () => {
      if (st.busy) return;
      st.busy = true;
      try {
        if (mode === 'set') {
          if (!st.first) {
            if (st.entry.length < PIN_MIN) return;
            st.first = st.entry;
            st.entry = '';
            $('msg').textContent = '';
            draw();
            return;
          }
          if (st.entry !== st.first) {
            st.first = '';
            return fail('They did not match. Choose your PIN again.');
          }
          store.set(PIN_KEY, { uid, hash: await pinMake(st.entry, uid), len: st.entry.length, fails: 0 });
          st.entry = '';
          return resolve('set');
        }
        const r = pinRecord();
        if (r && r.uid === uid && (await pinCheck(st.entry, uid, r.hash))) {
          r.fails = 0;
          store.set(PIN_KEY, r);
          st.entry = '';
          return resolve('unlocked');
        }
        const fails = ((r && r.fails) || 0) + 1;
        if (!r || fails >= PIN_MAX_FAILS) {
          clearPin();
          return resolve('too-many');
        }
        store.set(PIN_KEY, { ...r, fails });
        const left = PIN_MAX_FAILS - fails;
        fail(`Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
      } finally {
        st.busy = false;
      }
    };
    const key = (k) => {
      if (st.busy) return;
      if (k === 'del') { st.entry = st.entry.slice(0, -1); return draw(); }
      if (k === 'ok') return submit();
      if (st.entry.length >= target()) return;
      st.entry += k;
      $('msg').textContent = '';
      draw();
      if (st.entry.length === target() && (mode === 'enter' || st.first)) submit();
    };
    $('pad').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b && !b.disabled) key(b.dataset.k); };
    const onKey = (e) => {
      if (!document.getElementById('cmd-gate')) return document.removeEventListener('keydown', onKey);
      if (/^[0-9]$/.test(e.key)) key(e.key);
      else if (e.key === 'Backspace') key('del');
      else if (e.key === 'Enter') key('ok');
    };
    document.addEventListener('keydown', onKey);
    if ($('forgot')) $('forgot').onclick = () => { document.removeEventListener('keydown', onKey); resolve('forgot'); };
    if ($('skip')) $('skip').onclick = () => { document.removeEventListener('keydown', onKey); resolve('skipped'); };
    draw();
  });
}

// ---------- The gate ----------
// Resolves once John is signed in (and has unlocked with his PIN where one is set).
// opts.pin: 'phone' (default: PIN offered on touch screens), 'always' or 'off'.
export async function gate(live, opts = {}) {
  const pinMode = opts.pin || 'phone';
  let how = null;
  let linkError = null;
  const offErr = live.auth.on('link-error', (m) => { linkError = m; });
  const linkType = await live.auth.handleRedirect().catch(() => null);
  if (linkType === 'invite' || linkType === 'recovery') {
    if (linkType === 'recovery') clearPin();
    how = await setPasswordScreen(live, linkType);
  }
  offErr();

  for (;;) {
    if (!live.auth.signedIn()) {
      how = await signInScreen(live, { message: linkError || opts.message });
      linkError = null;
    }
    const uid = live.auth.user() && live.auth.user().id;
    const rec = pinRecord();
    if (rec && rec.uid !== uid) clearPin();
    if (pinWanted(pinMode)) {
      if (how) {
        // Just signed in with a password on this device: offer a PIN if there is none.
        if (!pinRecord()) await pinScreen({ mode: 'set', uid });
        break;
      }
      if (pinRecord()) {
        const r = await pinScreen({ mode: 'enter', uid });
        if (r === 'unlocked') break;
        if (r === 'forgot') clearPin();
        await live.auth.signOut();
        opts = { ...opts, message: r === 'too-many' ? 'Too many wrong PINs. Sign in with your password.' : '' };
        how = null;
        continue;
      }
    }
    break;
  }
  hide();
  return live.auth.user();
}

// Lock the app again when he comes back after a while (phone only, and only if a PIN is set),
// and show the sign in screen if the login ever expires.
export function watch(live, opts = {}) {
  const lockAfter = opts.lockAfterMs ?? 5 * 60 * 1000;
  let hiddenAt = 0;
  let open = false;
  const relock = async (message) => {
    if (open) return;
    open = true;
    try { await gate(live, { ...opts, message }); } finally { open = false; if (opts.onUnlock) opts.onUnlock(); }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > lockAfter && pinRecord() && pinWanted(opts.pin || 'phone')) relock();
    hiddenAt = 0;
  });
  live.auth.on('signed-out', (why) => { if (why === 'expired') relock('Your login has expired. Please sign in again.'); });
}

// Forget this phone's PIN (for a "Remove PIN" button in Settings).
export function removePin() { clearPin(); }
