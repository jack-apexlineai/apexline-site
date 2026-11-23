// Four short sounds, made on the device (no files, works offline).
// Off by default; switched on in Settings. Phones only allow sound after a tap,
// so the first tap anywhere wakes the audio up for the rest of the visit.
import { state } from './store.js';

let ctx = null;

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

export const soundOn = () => !!state.settings.sound;

// Called on the first tap of the visit.
export function unlock() {
  if (!soundOn()) return;
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}
document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
document.addEventListener('keydown', unlock, { capture: true, passive: true });

function note(c, { f, f2, type = 'sine', at = 0, dur = 0.3, vol = 0.12, attack = 0.012 }) {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SOUNDS = {
  // Soft power-on: two notes rising.
  boot: (c) => { note(c, { f: 220, f2: 330, dur: 0.5, vol: 0.06, attack: 0.08 }); note(c, { f: 440, at: 0.18, dur: 0.7, vol: 0.05, attack: 0.1 }); },
  // Start the clock: a short tick.
  start: (c) => { note(c, { f: 1500, f2: 900, type: 'triangle', dur: 0.07, vol: 0.09, attack: 0.003 }); },
  // Sergeant: a low double thud.
  nag: (c) => { note(c, { f: 150, f2: 70, dur: 0.22, vol: 0.22, attack: 0.004 }); note(c, { f: 150, f2: 70, at: 0.2, dur: 0.22, vol: 0.18, attack: 0.004 }); },
  // Meditation and deep thinking: one soft bell.
  bell: (c) => { note(c, { f: 528, dur: 2.6, vol: 0.09, attack: 0.02 }); note(c, { f: 1056, dur: 1.8, vol: 0.03, attack: 0.02 }); note(c, { f: 792, at: 0.02, dur: 2.2, vol: 0.025, attack: 0.03 }); },
  // Perfect day: a rising chime.
  perfect: (c) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(c, { f, type: 'triangle', at: i * 0.09, dur: 0.6, vol: 0.07 })); },
};

// Plays if sound is on and the browser allows it. Never throws.
export function play(name, { force = false } = {}) {
  if (!force && !soundOn()) return false;
  const c = audio();
  if (!c || !SOUNDS[name]) return false;
  try {
    if (c.state === 'suspended') c.resume().catch(() => {});
    SOUNDS[name](c);
    return true;
  } catch {
    return false;
  }
}
