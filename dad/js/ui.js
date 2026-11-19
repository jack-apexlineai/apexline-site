// Shared UI bits: the re-render hook, bottom sheets and small templates.
import { esc } from './util.js';
import { icon } from './icons.js';

export const bus = { render: () => {}, go: () => {}, perfect: () => {} };
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let openSheetEl = null;
let lastFocus = null;

// A sheet slides up from the bottom on phones and sits centred on laptops.
export function openSheet(html, { id = 'sheet', onClose, wide = false, dismissable = true } = {}) {
  closeSheet(true);
  document.querySelectorAll('#toasts .toast').forEach((t) => t.remove());
  lastFocus = document.activeElement;
  const root = document.getElementById('sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.dataset.sheet = id;
  wrap.innerHTML = `<div class="sheet-back" data-close></div>
    <div class="sheet ${wide ? 'sheet-wide' : ''}" role="dialog" aria-modal="true">
      <div class="sheet-grab" aria-hidden="true"></div>
      ${dismissable ? `<button class="sheet-x icon-btn" data-close aria-label="Close">${icon('x', 18)}</button>` : ''}
      <div class="sheet-body">${html}</div>
    </div>`;
  root.appendChild(wrap);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => wrap.classList.add('in'));
  if (dismissable) {
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
  }
  wrap._onClose = onClose;
  wrap._dismissable = dismissable;
  openSheetEl = wrap;
  const first = wrap.querySelector('[autofocus]') || wrap.querySelector('.sheet-body button, .sheet-body input');
  if (first && window.matchMedia('(pointer: fine)').matches) setTimeout(() => first.focus(), 60);
  return wrap;
}

export function closeSheet(silent = false) {
  const el = openSheetEl;
  if (!el) return;
  openSheetEl = null;
  el.classList.remove('in');
  el.classList.add('out');
  setTimeout(() => el.remove(), 220);
  document.body.classList.remove('has-sheet');
  if (!silent && el._onClose) el._onClose();
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch { /* gone */ }
}

export const sheetOpen = (id) => !!openSheetEl && (!id || openSheetEl.dataset.sheet === id);
export const currentSheet = () => openSheetEl;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openSheetEl && openSheetEl._dismissable) closeSheet();
});

export function pill(text, tone = 'plain', ico = '') {
  return `<span class="pill pill-${tone}">${ico ? icon(ico, 13) : ''}${esc(text)}</span>`;
}

export function moneyMarks(n) {
  if (!n) return '';
  return `<span class="marks" title="${['', 'Low earner', 'Makes money', 'Big earner'][n]}">${'£'.repeat(n)}</span>`;
}

export function seg(name, options, value, extra = '') {
  return `<div class="seg ${extra}" role="radiogroup">${options.map(([v, label]) => `<button type="button" role="radio" aria-checked="${String(v) === String(value)}" class="${String(v) === String(value) ? 'on' : ''}" data-act="${name}" data-v="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
}
