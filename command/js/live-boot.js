// Starts Command in live mode: login (and PIN on the phone), then sync, then the normal app boot.
// Called from the last line of js/app.js (see INTEGRATION.md). In local mode it just boots.
import { live } from './live.js';
import { gate, watch } from './login.js';
import { state, replaceState, onChange } from './store.js';
import { bus } from './ui.js';

const CFG = window.PLANNER_CONFIG || {};

// Do not swap in a copy from the server while he is typing or a sheet or focus screen is open.
function canApply() {
  const a = document.activeElement;
  if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && a.value) return false;
  if (document.body.classList.contains('has-sheet')) return false;
  if (document.querySelector('[data-think]')) return false;
  return true;
}

// A small pill, only shown when changes are waiting to go up.
function syncPill() {
  const el = document.createElement('div');
  el.id = 'sync-pill';
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:900;padding:7px 12px;border-radius:999px;font-size:13px;font-weight:600;background:var(--card,#171513);color:var(--text-2,#bdb4a8);border:1px solid var(--line-2,rgba(255,255,255,.16));box-shadow:var(--shadow,none);display:none;max-width:calc(100vw - 32px);text-align:center';
  document.body.appendChild(el);
  live.sync.on('status', ({ status }) => {
    document.body.dataset.sync = status;
    const text = status === 'offline' ? 'Offline. Saved on this device, it will sync when you are back online.'
      : status === 'error' ? 'Could not sync just now. Your changes are safe on this device.'
        : '';
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
  });
}

export async function liveBoot(boot) {
  if (!live) return boot();
  let booted = false;
  await gate(live, { pin: CFG.pin || 'phone' });
  syncPill();
  try {
    await live.sync.start({
      getState: () => state,
      replaceState,
      onChange,
      canApply,
      onRemote: () => { if (booted && bus.render) bus.render(); },
    });
  } catch (e) {
    if (e && e.kind === 'signed_out') return location.reload();
    // Anything else: carry on with the local copy, sync retries by itself.
  }
  booted = true;
  boot();
  watch(live, { pin: CFG.pin || 'phone', onUnlock: () => live.sync.pull() });
  window.__live = live;
}
