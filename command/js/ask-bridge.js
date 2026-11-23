// Turns Claude's suggestions (from the `ask` function) into Ask Command buttons.
// Nothing happens until John taps. Risky ones (big ad budget rises, a target that accepts losing
// ads) need a second tap after a plain warning.
//
// Used by js/ask.js in live mode. It does not import the app: ask.js passes in its own btn() and
// say() helpers and a handlers object (see INTEGRATION.md for the exact handlers).

export const ACTION_NAMES = ['backup', 'set_sound', 'set_theme', 'set_tone', 'set_deep_days', 'set_deep_time', 'add_task', 'open', 'turn_on_reminders', 'set_ad_budget', 'set_target_roas'];

// handlers[action](value) does the change and returns a short confirmation (or an error string
// starting with "!" to show instead).
export function liveButtons(suggestions, { btn, say, handlers }) {
  const list = Array.isArray(suggestions) ? suggestions : [];
  return list
    .filter((s) => s && ACTION_NAMES.includes(s.action) && typeof handlers[s.action] === 'function')
    .map((s) => {
      const run = () => {
        let msg;
        try {
          msg = handlers[s.action](s.value);
        } catch {
          msg = '!That did not work. Nothing was changed.';
        }
        if (typeof msg === 'string' && msg.startsWith('!')) say(msg.slice(1));
        else say(msg || 'Done.');
      };
      if (!s.risky) return btn(s.label, run, 'primary');
      return btn(s.label, () => {
        say(`${s.warning} Are you sure?`, [
          btn('Yes, I understand. Do it', run, 'danger'),
          btn('No, leave it', () => say('Fine, nothing changed.')),
        ]);
      }, 'ghost');
    });
}

// Keeps the chat history in the shape the ask function expects, including whether each reply
// pushed back (so the server knows a warning was already given).
export function historyFrom(log, limit = 12) {
  return log
    .filter((m) => (m.who === 'me' || m.who === 'cmd') && m.text && !m.local)
    .slice(-limit)
    .map((m) => (m.who === 'me' ? { role: 'user', content: m.text } : { role: 'assistant', content: m.text, pushedBack: !!m.pushedBack }));
}
