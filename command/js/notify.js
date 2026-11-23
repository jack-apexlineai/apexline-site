// Reminders. Phase 1: phone or laptop notifications while the app is open or
// installed (plus an in-app banner). Phase 2: the backend sends Web Push so
// reminders arrive even when the app is closed. WhatsApp is a later add-on.

import { esc } from './util.js';
import { icon } from './icons.js';
import { play } from './sound.js';

export const supported = () => 'Notification' in window;
export const permission = () => (supported() ? Notification.permission : 'unsupported');

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

export async function ask() {
  if (!supported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function osNotify(title, body, tag) {
  if (permission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', renotify: true, vibrate: [180, 80, 180] });
      return true;
    }
    new Notification(title, { body, tag, icon: 'icons/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}

// Shows the banner in the app, and a real notification if allowed and the app is
// not in front (or force is set, for the test button).
export function alertMe(title, body, { tag = 'cmd', enabled = true, force = false, kind = 'sergeant', actions = [], quiet = false, sound } = {}) {
  // Sergeant reminders get the low thud, starting the clock gets a tick, info messages get nothing.
  const snd = sound !== undefined ? sound : kind === 'sergeant' && !['start', 'done', 'alldone', 'cmd'].includes(tag) ? 'nag' : null;
  if (snd) play(snd);
  if (!quiet) toast(body, { title, kind, actions, duration: kind === 'sergeant' ? 7000 : 4500 });
  if (enabled && (force || document.visibilityState !== 'visible')) osNotify(title, body, tag);
  if (enabled && navigator.vibrate && kind === 'sergeant') {
    try { navigator.vibrate([120, 60, 120]); } catch { /* not supported */ }
  }
}

let wrap;
export function toast(msg, { title = '', kind = 'info', actions = [], duration = 4500 } = {}) {
  wrap = wrap || document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'sergeant' ? 'alert' : 'status');
  el.innerHTML = `
    ${kind === 'sergeant' ? `<div class="toast-badge">${icon('flame', 18)}</div>` : ''}
    <div class="toast-body">${title ? `<strong>${esc(title)}</strong>` : ''}<span>${esc(msg)}</span></div>
    ${actions.map((a, i) => `<button class="toast-btn" data-i="${i}">${esc(a.label)}</button>`).join('')}
    <button class="toast-x" aria-label="Dismiss">${icon('x', 16)}</button>`;
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector('.toast-x').onclick = close;
  el.querySelectorAll('.toast-btn').forEach((b) => {
    b.onclick = () => { actions[+b.dataset.i].fn(); close(); };
  });
  wrap.appendChild(el);
  while (wrap.children.length > 2) wrap.firstChild.remove();
  if (duration) setTimeout(close, duration);
  return el;
}
