// Command live mode: login session, data sync, Ask Command (Claude), own API key, memory notes
// and connection status, all against John's own Supabase project.
//
// Drop into Dad/planner/js/ with merge.js and login.js. See INTEGRATION.md for the lines to add.
// Talks to Supabase with plain fetch (no extra library), so it works offline from the app's cache.
//
// Sync model:
//   - The app keeps working from its local copy (localStorage) at all times.
//   - Changes are pushed a moment after he stops tapping (debounced), or when he comes back online.
//   - Each save says which server version it was based on. If another device saved first, the
//     server says so, the two copies are merged (merge.js: nothing he did is silently dropped),
//     and the merged copy is saved.
//   - Deep thinking sessions are also written to their own append-only table.

import { mergeState } from './merge.js';

const AUTH_KEY = 'command.auth';
const DEVICE_KEY = 'command.device';
const metaKey = (uid) => `command.sync.${uid}`;
const baseKey = (uid) => `command.base.${uid}`;
const BEFORE_LIVE = 'command.v1.beforeLive';

function safeStore(storage) {
  return {
    get(k) { try { return storage.getItem(k); } catch { return null; } },
    set(k, v) { try { storage.setItem(k, v); return true; } catch { return false; } },
    del(k) { try { storage.removeItem(k); } catch { /* ignore */ } },
    getJSON(k) { try { return JSON.parse(storage.getItem(k)); } catch { return null; } },
    setJSON(k, v) { try { storage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
}

export class LiveError extends Error {
  constructor(kind, message, status = 0) {
    super(message || kind);
    this.kind = kind; // 'offline' | 'auth' | 'signed_out' | 'bad' | 'server'
    this.status = status;
  }
}

export function createLive(cfg = {}) {
  const url = String(cfg.url || '').replace(/\/+$/, '');
  const key = cfg.key || '';
  const store = safeStore(cfg.storage || globalThis.localStorage);
  const fetchImpl = cfg.fetch || ((...a) => globalThis.fetch(...a));
  const now = cfg.now || (() => Date.now());
  const events = new Map();
  const emit = (name, data) => (events.get(name) || []).forEach((fn) => { try { fn(data); } catch { /* listener errors never break sync */ } });
  const on = (name, fn) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); return () => events.get(name).delete(fn); };

  let device = store.get(DEVICE_KEY);
  if (!device) {
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    device = `${touch ? 'phone' : 'laptop'}-${Math.random().toString(36).slice(2, 8)}`;
    store.set(DEVICE_KEY, device);
  }

  // ---------- Session ----------
  let session = store.getJSON(AUTH_KEY);
  let refreshing = null;

  function keep(s) {
    if (!s || !s.access_token) throw new LiveError('auth', 'No session returned');
    session = {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || Math.floor(now() / 1000) + (s.expires_in || 3600),
      user: s.user ? { id: s.user.id, email: s.user.email } : session && session.user,
    };
    store.setJSON(AUTH_KEY, session);
    emit('auth', session.user);
    return session.user;
  }

  function dropSession(reason) {
    session = null;
    store.del(AUTH_KEY);
    emit('signed-out', reason || 'signed_out');
  }

  async function raw(path, { method = 'GET', body, auth = true, headers = {}, keepalive = false } = {}) {
    const h = { apikey: key, ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (auth) {
      const t = await token();
      h.Authorization = `Bearer ${t}`;
    }
    let res;
    try {
      res = await fetchImpl(`${url}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), keepalive });
    } catch {
      throw new LiveError('offline', 'Could not reach the server');
    }
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) {
      const msg = (data && (data.error_description || data.msg || data.message || data.error)) || `HTTP ${res.status}`;
      throw new LiveError(res.status === 401 || res.status === 403 ? 'auth' : res.status >= 500 ? 'server' : 'bad', String(msg), res.status);
    }
    return data;
  }

  async function refresh() {
    if (!session || !session.refresh_token) { dropSession('expired'); throw new LiveError('signed_out', 'Please sign in again'); }
    if (!refreshing) {
      refreshing = raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh_token } })
        .then((s) => keep(s))
        .catch((e) => {
          if (e.kind !== 'offline') { dropSession('expired'); throw new LiveError('signed_out', 'Please sign in again'); }
          throw e;
        })
        .finally(() => { refreshing = null; });
    }
    await refreshing;
    return session.access_token;
  }

  async function token() {
    if (!session) throw new LiveError('signed_out', 'Not signed in');
    if (session.expires_at - 60 <= Math.floor(now() / 1000)) return refresh();
    return session.access_token;
  }

  // Calls with the user's token; on a 401 refreshes once and tries again.
  async function call(path, opts = {}) {
    try {
      return await raw(path, opts);
    } catch (e) {
      if (e.kind === 'auth' && e.status === 401 && session) {
        await refresh();
        return raw(path, opts);
      }
      throw e;
    }
  }

  const auth = {
    user: () => (session ? session.user : null),
    signedIn: () => !!session,
    on,
    async signIn(identifier, password) {
      const id = String(identifier || '').trim();
      if (!id || !password) throw new LiveError('bad', 'Type your email or username and your password.');
      if (id.includes('@')) {
        try {
          return keep(await raw('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: id, password } }));
        } catch (e) {
          if (e.kind === 'offline') throw e;
          throw new LiveError('bad', 'That email or password is not right. Try again.');
        }
      }
      try {
        return keep(await raw('/functions/v1/login', { method: 'POST', auth: false, body: { username: id, password } }));
      } catch (e) {
        if (e.kind === 'offline') throw e;
        throw new LiveError('bad', e.message || 'That username or password is not right.');
      }
    },
    async signOut() {
      const s = session;
      dropSession('signed_out');
      if (s) {
        try { await fetchImpl(`${url}/auth/v1/logout`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${s.access_token}` } }); } catch { /* offline is fine */ }
      }
    },
    // Email links (invite, password reset). Supports the token_hash link in our email templates,
    // and Supabase's default #access_token link. Returns 'invite' | 'recovery' | 'error' | null.
    async handleRedirect(loc = globalThis.location, history = globalThis.history) {
      const q = new URLSearchParams(loc.search);
      const h = new URLSearchParams(loc.hash.replace(/^#/, ''));
      const clean = () => { try { history.replaceState(null, '', loc.pathname); } catch { /* ignore */ } };
      if (h.get('error') || h.get('error_description')) {
        clean();
        emit('link-error', h.get('error_description') || h.get('error'));
        return 'error';
      }
      if (q.get('token_hash') && q.get('type')) {
        const type = q.get('type');
        clean();
        try {
          keep(await raw('/auth/v1/verify', { method: 'POST', auth: false, body: { type, token_hash: q.get('token_hash') } }));
          return type === 'recovery' ? 'recovery' : 'invite';
        } catch (e) {
          emit('link-error', e.kind === 'offline' ? 'You are offline. Open the link again when you have internet.' : 'That link has expired or was already used. Ask Jack for a new one, or use Forgot password.');
          return 'error';
        }
      }
      if (h.get('access_token') && h.get('refresh_token')) {
        const type = h.get('type');
        clean();
        keep({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in')) || 3600 });
        try {
          const u = await call('/auth/v1/user');
          keep({ ...session, user: u });
        } catch { /* user loads later */ }
        return type === 'recovery' ? 'recovery' : 'invite';
      }
      return null;
    },
    async setPassword(password) {
      if (!password || password.length < 10) throw new LiveError('bad', 'Use at least 10 characters.');
      try {
        await call('/auth/v1/user', { method: 'PUT', body: { password } });
      } catch (e) {
        if (e.kind === 'offline') throw e;
        throw new LiveError('bad', /weak|pwned|leaked/i.test(e.message) ? 'That password is too easy to guess or has appeared in a leak. Pick another.' : 'Could not save that password. Try a different one.');
      }
    },
    async sendReset(email, redirectTo) {
      await raw(`/auth/v1/recover${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`, { method: 'POST', auth: false, body: { email: String(email || '').trim() } });
    },
  };

  // ---------- Sync ----------
  let app = null; // { getState, replaceState, onChange, onRemote, canApply }
  let meta = null;
  let status = 'idle';
  let timer = null;
  let firstChangeAt = 0;
  let pushing = null;
  let again = false;
  let edits = 0;
  let retryMs = 0;
  let pollTimer = null;
  const setStatus = (s, extra) => { status = s; emit('status', { status: s, ...extra }); };

  const uid = () => (session && session.user ? session.user.id : null);
  const loadMeta = () => store.getJSON(metaKey(uid())) || null;
  const saveMeta = () => store.setJSON(metaKey(uid()), meta);
  const loadBase = () => store.getJSON(baseKey(uid()));
  const saveBase = (s) => store.setJSON(baseKey(uid()), s);
  const snapshot = () => JSON.parse(JSON.stringify(app.getState()));

  function apply(next, why) {
    app.replaceState(next);
    if (app.onRemote) app.onRemote(why);
  }

  async function fetchRemote() {
    const rows = await call('/rest/v1/app_state?select=state,version,updated_at,device');
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function fetchSessions() {
    const rows = await call('/rest/v1/thinking_sessions?select=id,date,question,body,mins,started_at,ended_at&order=started_at.asc');
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id, date: r.date, q: r.question, text: r.body, mins: r.mins,
      startedAt: r.started_at ? Date.parse(r.started_at) : null, endedAt: r.ended_at ? Date.parse(r.ended_at) : null,
    }));
  }

  // Put back any deep thinking session that is in the table but missing from the state.
  function restoreSessions(state, rows) {
    const have = new Set(((state.thinking && state.thinking.sessions) || []).map((s) => s.id));
    const missing = rows.filter((r) => !have.has(r.id));
    if (!missing.length) return null;
    const next = JSON.parse(JSON.stringify(state));
    next.thinking = next.thinking || { sessions: [] };
    next.thinking.sessions = [...(next.thinking.sessions || []), ...missing].sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
    return next;
  }

  async function uploadSessions(state) {
    const list = (state.thinking && state.thinking.sessions) || [];
    const done = new Set(meta.uploaded || []);
    const fresh = list.filter((s) => s && s.id && !done.has(s.id));
    if (!fresh.length) return;
    await call('/rest/v1/rpc/add_thinking_sessions', { method: 'POST', body: { p_sessions: fresh, p_device: device } });
    meta.uploaded = [...done, ...fresh.map((s) => s.id)].slice(-2000);
    saveMeta();
  }

  // First sync on this device, or coming back to the app: line the local copy up with the server.
  async function reconcile() {
    const local = snapshot();
    const remote = await fetchRemote();
    if (!meta) {
      // First live sign in on this device. Keep a copy of what was here, just in case.
      store.setJSON(BEFORE_LIVE, local);
      meta = { uid: uid(), version: 0, dirty: true, lastEditAt: 0, uploaded: [] };
      if (!remote) {
        saveMeta();
        return push();
      }
      // The account already has data from another device. Default: the account's copy wins and
      // this device's deep thinking sessions are added to it (the old local copy is kept above).
      // The app can ask John instead through app.firstSync: 'server' | 'merge' | 'local'.
      let choice = 'server';
      if (app.firstSync) { try { choice = (await app.firstSync({ local, remote: remote.state })) || 'server'; } catch { choice = 'server'; } }
      let merged;
      if (choice === 'merge') merged = mergeState(null, local, remote.state, { localNewer: false });
      else if (choice === 'local') merged = mergeState(null, local, { thinking: remote.state.thinking }, { localNewer: true });
      else merged = mergeState(null, { thinking: local.thinking }, remote.state, { localNewer: false });
      apply(merged, 'first-sync');
      meta.version = remote.version;
      meta.dirty = JSON.stringify(merged) !== JSON.stringify(remote.state);
      saveBase(remote.state);
      saveMeta();
      emit('first-sync', { choice, backedUp: true });
      return meta.dirty ? push() : undefined;
    }
    if (!remote) {
      meta.version = 0;
      meta.dirty = true;
      saveMeta();
      return push();
    }
    if (remote.version === meta.version) {
      if (meta.dirty) return push();
      return undefined;
    }
    if (!meta.dirty) {
      if (app.canApply && !app.canApply()) return undefined; // he is typing; try again shortly
      apply(remote.state, 'remote');
      meta.version = remote.version;
      saveBase(remote.state);
      saveMeta();
      return undefined;
    }
    const merged = mergeState(loadBase(), local, remote.state, { localNewer: meta.lastEditAt > Date.parse(remote.updated_at) });
    apply(merged, 'merge');
    meta.version = remote.version;
    saveBase(remote.state);
    saveMeta();
    return push();
  }

  async function pushOnce() {
    const sent = snapshot();
    const editsAtSend = edits;
    setStatus('saving');
    const r = await call('/rest/v1/rpc/save_state', { method: 'POST', body: { p_state: sent, p_base_version: meta.version || 0, p_device: device } });
    if (r && r.ok) {
      meta.version = r.version;
      if (edits === editsAtSend) meta.dirty = false;
      saveBase(sent);
      saveMeta();
      try { await uploadSessions(sent); } catch { /* retried on the next save */ }
      return true;
    }
    if (r && r.conflict) {
      // Another device saved first. Merge, keep the server copy as the new common ancestor, go again.
      const merged = mergeState(loadBase(), app.getState(), r.state, { localNewer: meta.lastEditAt > Date.parse(r.updated_at) });
      apply(merged, 'merge');
      meta.version = r.version;
      meta.dirty = true;
      saveBase(r.state);
      saveMeta();
      return false;
    }
    throw new LiveError('server', 'Unexpected reply from save');
  }

  async function push() {
    if (!app || !meta) return;
    if (pushing) { again = true; return pushing; }
    clearTimeout(timer);
    timer = null;
    firstChangeAt = 0;
    pushing = (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new LiveError('offline');
        let tries = 0;
        while (!(await pushOnce())) {
          if (++tries >= 4) throw new LiveError('server', 'Could not settle the save');
        }
        retryMs = 0;
        setStatus('saved', { at: now() });
      } catch (e) {
        if (e.kind === 'signed_out') { setStatus('signed-out'); return; }
        setStatus(e.kind === 'offline' ? 'offline' : 'error', { message: e.message });
        retryMs = Math.min(retryMs ? retryMs * 3 : 5000, 120000);
        clearTimeout(timer);
        timer = setTimeout(() => push(), retryMs);
      } finally {
        pushing = null;
        if (again) { again = false; schedule(0); }
      }
    })();
    return pushing;
  }

  function schedule(delay = 1500) {
    if (!firstChangeAt) firstChangeAt = now();
    const wait = Math.max(0, Math.min(delay, 10000 - (now() - firstChangeAt)));
    clearTimeout(timer);
    timer = setTimeout(() => push(), wait);
  }

  function onLocalChange(info) {
    if (info && info.remote) return; // our own replaceState
    if (!meta) return;
    edits++;
    meta.dirty = true;
    meta.lastEditAt = now();
    saveMeta();
    setStatus('pending');
    schedule();
  }

  async function pull() {
    if (!app || !meta || pushing) return;
    try {
      await reconcile();
      const restored = restoreSessions(app.getState(), await fetchSessions());
      if (restored) { apply(restored, 'sessions'); meta.dirty = true; saveMeta(); schedule(0); }
    } catch (e) {
      if (e.kind === 'offline') setStatus('offline');
    }
  }

  const sync = {
    on,
    status: () => status,
    // app: { getState, replaceState(next) (must notify listeners with { remote: true }),
    //        onChange(fn), onRemote(why) (re-render), canApply() (false while he is typing) }
    async start(appHooks) {
      if (!session) throw new LiveError('signed_out', 'Sign in first');
      app = appHooks;
      meta = loadMeta();
      if (meta && meta.uid !== uid()) meta = null;
      app.onChange(onLocalChange);
      try {
        await reconcile();
        const restored = restoreSessions(app.getState(), await fetchSessions());
        if (restored) { apply(restored, 'sessions'); meta.dirty = true; saveMeta(); await push(); }
        if (status !== 'saved' && status !== 'error') setStatus(meta.dirty ? 'pending' : 'saved', { at: now() });
      } catch (e) {
        if (e.kind === 'signed_out') throw e;
        // Offline at start: carry on with the local copy, push when back.
        if (!meta) { meta = { uid: uid(), version: 0, dirty: true, lastEditAt: now(), uploaded: [] }; saveMeta(); }
        setStatus(e.kind === 'offline' ? 'offline' : 'error', { message: e.message });
        retryMs = 5000;
        timer = setTimeout(() => pull(), retryMs);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => { retryMs = 0; pull(); });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') pull();
          else if (meta && meta.dirty) push();
        });
        window.addEventListener('pagehide', () => { if (meta && meta.dirty) flushKeepalive(); });
        clearInterval(pollTimer);
        pollTimer = setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 120000);
      }
    },
    flush: () => push(),
    pull,
  };

  // Last-chance save as the page closes. Small states only (browsers cap keepalive bodies at 64KB).
  function flushKeepalive() {
    try {
      const body = JSON.stringify({ p_state: app.getState(), p_base_version: meta.version || 0, p_device: device });
      if (body.length > 60000 || !session) return;
      fetchImpl(`${url}/rest/v1/rpc/save_state`, { method: 'POST', keepalive: true, headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body });
    } catch { /* the next open pushes it */ }
  }

  // ---------- Ask Command ----------
  async function ask(message, history = [], summary = {}) {
    return call('/functions/v1/ask', { method: 'POST', body: { message, history, summary } });
  }

  const aiKey = {
    status: () => call('/functions/v1/ai-key', { method: 'POST', body: { action: 'status' } }),
    set: (k) => call('/functions/v1/ai-key', { method: 'POST', body: { action: 'set', key: String(k || '').trim() } }),
    clear: () => call('/functions/v1/ai-key', { method: 'POST', body: { action: 'clear' } }),
  };

  const memory = {
    list: () => call('/rest/v1/ai_memory?select=id,kind,body,source,created_at&order=created_at.desc'),
    add: (body) => call('/rest/v1/ai_memory', { method: 'POST', body: { kind: 'told', body: String(body || '').slice(0, 300) }, headers: { Prefer: 'return=minimal' } }),
    remove: (id) => call(`/rest/v1/ai_memory?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };

  const usage = () => call('/rest/v1/ai_usage?select=month,billed_to,requests,cost_gbp&order=month.desc&limit=6');

  const connections = {
    list: () => call('/rest/v1/connections?select=provider,status,scopes,account_label,connected_at'),
    // Returns { status: 'not_configured' } today. When switched on: navigates to the provider's Allow page.
    async start(provider, shop) {
      const r = await call('/functions/v1/connect-start', { method: 'POST', body: { provider, shop } });
      if (r && r.status === 'redirect' && r.url && typeof location !== 'undefined') location.href = r.url;
      return r;
    },
  };

  return { auth, sync, ask, aiKey, memory, usage, connections, device: () => device, LiveError };
}

// ---------- Compact data summary for Ask Command ----------
// Only what Claude needs to answer about his day, ticks, ads and money. Never his deep thinking text.
// extras: { ads: { last7: {...}, prev7: {...}, pending: n }, habitIds: [...], today: 'YYYY-MM-DD' }
export function summarise(state, extras = {}) {
  const date = extras.today || new Date().toISOString().slice(0, 10);
  const day = (state.days && state.days[date]) || { tasks: [] };
  const tasks = (day.tasks || []).filter((t) => !['dropped', 'moved', 'rolled'].includes(t.status)).slice(0, 25)
    .map((t) => ({ title: String(t.title || '').slice(0, 80), mins: t.mins, status: t.status, deadline: t.deadline || undefined, rolled: t.rolled || undefined }));
  const ticks = (state.habits && state.habits[date]) || {};
  const ids = extras.habitIds || [];
  const streak = (id) => {
    let n = 0;
    const d = new Date(`${date}T12:00:00`);
    if (!(state.habits && state.habits[date] && state.habits[date][id])) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 400; i++) {
      const k = d.toISOString().slice(0, 10);
      if (state.habits && state.habits[k] && state.habits[k][id]) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  };
  const month = date.slice(0, 7);
  const tx = ((state.money && state.money.tx) || []).filter((t) => String(t.date || '').startsWith(month));
  const sumOf = (type) => Math.round(tx.filter((t) => t.type === type).reduce((a, t) => a + (Number(t.amount) || 0), 0));
  const s = state.settings || {};
  const th = (state.thinking && state.thinking.sessions) || [];
  return {
    sample: state.mode === 'sample',
    name: state.profile && state.profile.name,
    business: state.profile && state.profile.business,
    today: { date, closed: !!day.closed, tasks },
    ticks: { done: Object.keys(ticks).filter((k) => ticks[k]), left: ids.filter((id) => !ticks[id]), streaks: Object.fromEntries(ids.map((id) => [id, streak(id)])) },
    ads: extras.ads || null,
    adSettings: s.ads || null,
    money: { month, in: sumOf('in'), out: sumOf('out'), left: sumOf('in') - sumOf('out') },
    settings: { sound: !!s.sound, theme: s.theme, tone: s.tone, deepDays: s.deep && s.deep.days, deepStart: s.deep && s.deep.start },
    thinking: { sessions: th.length, thisMonth: th.filter((x) => String(x.date || '').startsWith(month)).length },
  };
}

// The app's single instance, from config.js.
const CFG = (typeof window !== 'undefined' && window.PLANNER_CONFIG) || {};
export const live = CFG.mode === 'live' ? createLive({ url: CFG.supabaseUrl, key: CFG.supabaseKey }) : null;
