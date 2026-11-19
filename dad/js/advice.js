// Ads maths and the morning advice. Runs offline with clear rules.
// Phase 2: the backend can send the same numbers to Claude for richer wording
// (see claudeRequest at the bottom). The rules stay as the safety net.

import { addDays, money, num, fromYmd, ymd, sum } from './util.js';
import { AOV } from './sample.js';

export function totals(rows) {
  const spend = sum(rows, (r) => r.spend);
  const impr = sum(rows, (r) => r.impr);
  const clicks = sum(rows, (r) => r.clicks);
  const purchases = sum(rows, (r) => r.purchases);
  const revenue = sum(rows, (r) => r.revenue);
  const freqW = sum(rows, (r) => (r.freq || 0) * r.impr);
  return {
    spend, impr, clicks, purchases, revenue,
    roas: spend ? revenue / spend : 0,
    cpa: purchases ? spend / purchases : null,
    ctr: impr ? clicks / impr : 0,
    cpm: impr ? (spend / impr) * 1000 : 0,
    freq: impr ? freqW / impr : 0,
  };
}

// Rows between (today - from) and (today - to), inclusive. from > to. 1 = yesterday.
const inRange = (rows, today, from, to) => {
  const a = addDays(today, -from);
  const b = addDays(today, -to);
  return rows.filter((r) => r.date >= a && r.date <= b);
};

export function adWindow(ad, today, days, offset = 0) {
  return totals(inRange(ad.daily, today, days + offset, 1 + offset));
}

export function accountWindow(data, today, days, offset = 0) {
  const rows = [];
  data.ads.forEach((a) => rows.push(...inRange(a.daily, today, days + offset, 1 + offset)));
  return totals(rows);
}

export function shopWindow(data, today, days, offset = 0) {
  const rows = inRange(data.shopify, today, days + offset, 1 + offset);
  return { sales: sum(rows, (r) => r.sales), orders: sum(rows, (r) => r.orders) };
}

export function dailySeries(data, today, days) {
  const out = [];
  for (let ago = days; ago >= 1; ago--) {
    const date = addDays(today, -ago);
    let spend = 0;
    let revenue = 0;
    data.ads.forEach((a) => {
      const d = a.daily.find((x) => x.date === date);
      if (d) { spend += d.spend; revenue += d.revenue; }
    });
    const s = data.shopify.find((x) => x.date === date);
    out.push({ date, spend, revenue, sales: s ? s.sales : 0 });
  }
  return out;
}

export function applyChanges(data, changes = []) {
  changes.forEach((c) => {
    const ad = data.ads.find((a) => a.id === c.adId);
    if (!ad) return;
    if (c.kind === 'pause') ad.status = 'paused';
    if (c.kind === 'budget') ad.budget = c.to;
  });
  return data;
}

function mondayOf(today) {
  const d = fromYmd(today);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return ymd(d);
}

const r2 = (n) => Math.round(n * 100) / 100;
export const MAX_RAISE = 0.1; // budget increases are never more than 10% at a time

// The rules. Everything is in plain English with the numbers that drove it.
export function buildAdvice(data, settings, today, decisions = {}) {
  const target = settings.targetRoas || 1.45;
  const floor = settings.minRoas || 1.0;
  const targetCpa = AOV / target;
  const week = mondayOf(today);
  const recs = [];
  const status = {};
  const winners = [];

  // Where the month is heading, worked out first so no advice can push it over his cap.
  const t = fromYmd(today);
  const dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const monthStart = ymd(new Date(t.getFullYear(), t.getMonth(), 1));
  let mtd = 0;
  data.ads.forEach((a) => a.daily.forEach((d) => { if (d.date >= monthStart && d.date < today) mtd += d.spend; }));
  const daily = sum(data.ads.filter((a) => a.status !== 'paused'), (a) => a.budget);
  const left = dim - t.getDate() + 1;
  const projected = mtd + daily * left;

  data.ads.forEach((ad) => {
    const age = ad.daily.length;
    const w7 = adWindow(ad, today, 7);
    const w14 = adWindow(ad, today, 14);
    const base = adWindow(ad, today, 30, 21); // days 22 to 51 ago, the ad's "normal"
    const id = (type) => `${type}:${ad.id}:${week}`;

    if (ad.status === 'paused') {
      status[ad.id] = { tag: 'Paused', tone: 'mute', text: 'You paused this.' };
      return;
    }
    // New ads stay in learning for their first 7 days, unless they are clearly burning money.
    if (age < 7 && !(w7.spend >= targetCpa * 2 && w7.purchases === 0)) {
      status[ad.id] = { tag: 'Learning', tone: 'info', text: `Only ${age} days old. Too early to judge.` };
      recs.push({
        id: id('learn'), type: 'learn', adId: ad.id, title: `Leave "${ad.name}" alone for now`,
        body: `It started ${age} days ago and has spent ${money(w7.spend)}. Meta needs about ${money(targetCpa * 2)} of spend before the numbers mean anything. Check it again on ${dayIn(today, 7 - age)}.`,
        facts: [['Spent', money(w7.spend)], ['ROAS so far', num(w7.roas, 2)], ['Purchases', num(w7.purchases)]],
      });
      return;
    }

    const losing = (w14.spend >= targetCpa * 1.2 && w14.purchases === 0) || (w14.spend >= targetCpa * 1.5 && w14.roas < floor);
    if (losing) {
      const perWeek = ad.budget * 7;
      status[ad.id] = { tag: 'Turn off', tone: 'bad', text: `ROAS ${num(w14.roas, 2)} over 14 days.` };
      recs.push({
        id: id('off'), type: 'off', adId: ad.id, title: `Turn off "${ad.name}"`,
        body: w14.purchases === 0
          ? `It has spent ${money(w14.spend)} in the last 14 days and sold nothing. That is more than one sale's worth of budget gone. Switch it off and put the money behind what works.`
          : `In the last 14 days it spent ${money(w14.spend)} and brought back ${money(w14.revenue)}. That is ${money(w14.revenue / w14.spend, true)} back for every £1, under your floor of ${num(floor, 1)}. It is losing money.`,
        facts: [['Spent (14d)', money(w14.spend)], ['ROAS (14d)', num(w14.roas, 2)], ['Purchases', num(w14.purchases)], ['CTR', pctS(w14.ctr)]],
        action: { label: 'Turn it off', kind: 'pause', adId: ad.id },
        impact: `Saves about ${money(perWeek)} a week`,
        saving: perWeek,
      });
      return;
    }

    const freqLimit = ad.retargeting ? 6 : 3;
    const tired = w7.freq >= freqLimit && base.impr > 0 && (w7.ctr <= base.ctr * 0.75 || w7.roas <= base.roas * 0.75);
    if (tired) {
      status[ad.id] = { tag: 'Tired', tone: 'warn', text: `Seen ${num(w7.freq, 1)} times each. Clicks down.` };
      const to = r2(ad.budget * 0.7);
      recs.push({
        id: id('tired'), type: 'tired', adId: ad.id, title: `"${ad.name}" is getting tired`,
        body: `People have now seen it about ${num(w7.freq, 1)} times each. Clicks are down from ${pctS(base.ctr)} to ${pctS(w7.ctr)} and ROAS has dropped from ${num(base.roas, 2)} to ${num(w7.roas, 2)}. Same audience, same ad, getting bored. Make a fresh version: new first 3 seconds, same offer. Until then, cut its budget by 30%.`,
        facts: [['Frequency', num(w7.freq, 1)], ['CTR now', pctS(w7.ctr)], ['CTR before', pctS(base.ctr)], ['ROAS now', num(w7.roas, 2)]],
        action: { label: `Cut budget to ${money(to, true)}/day`, kind: 'budget', adId: ad.id, from: ad.budget, to },
        impact: 'Stops the slide while you film a new version',
        saving: (ad.budget - to) * 7,
      });
      return;
    }

    // A winner: at least 7 days old, enough sales to judge, not seen too often.
    if (age >= 7 && w7.roas >= target + 0.3 && w14.purchases >= 5 && w7.purchases >= 2 && w7.freq < freqLimit) {
      status[ad.id] = { tag: 'Keep', tone: 'good', text: `ROAS ${num(w7.roas, 2)}, your best.` };
      winners.push({ ad, w7, w14, freqLimit });
      return;
    }

    if (w7.roas >= target) status[ad.id] = { tag: 'Keep', tone: 'good', text: `On target at ${num(w7.roas, 2)}.` };
    else if (w7.roas >= floor) status[ad.id] = { tag: 'Watch', tone: 'warn', text: `Above 1, below target.` };
    else status[ad.id] = { tag: 'Watch', tone: 'bad', text: `Below 1 this week.` };
    if (ad.retargeting && w7.freq >= 4) status[ad.id].text += ` Frequency ${num(w7.freq, 1)}, normal for retargeting.`;
  });

  // Safety first: pausing clear losers comes before putting more behind a winner,
  // and a raise is one 10% step on the single best ad, only if the month stays under his cap.
  const losersOpen = recs.some((r) => r.type === 'off');
  winners.sort((a, b) => b.w7.roas - a.w7.roas);
  winners.forEach(({ ad, w7, w14 }, i) => {
    if (losersOpen) { status[ad.id].text += ' Turn off the losers first.'; return; }
    if (i > 0) return;
    const to = r2(ad.budget * (1 + MAX_RAISE));
    const extraMonth = (to - ad.budget) * left;
    if (projected + extraMonth > (settings.budgetHigh || 0)) { status[ad.id].text += ' No room under your monthly cap.'; return; }
    status[ad.id] = { tag: 'Scale', tone: 'good', text: `ROAS ${num(w7.roas, 2)}, room for a small step.` };
    recs.push({
      id: `scale:${ad.id}:${week}`, type: 'scale', adId: ad.id, title: `Put a little more behind "${ad.name}"`,
      body: `It is your best ad: ROAS ${num(w7.roas, 2)} over 7 days against a ${num(target, 2)} target, ${num(w14.purchases)} sales in 14 days, and people have only seen it ${num(w7.freq, 1)} times each. If you are comfortable with the extra spend, raise the budget 10%. Then leave it at least 3 days before any more. The month still lands under your ${money(settings.budgetHigh)} cap.`,
      facts: [['ROAS (7d)', num(w7.roas, 2)], ['Cost per sale', w7.cpa ? money(w7.cpa, true) : 'n/a'], ['Frequency', num(w7.freq, 1)], ['Purchases (14d)', num(w14.purchases)]],
      action: { label: `Raise to ${money(to, true)}/day`, kind: 'budget', adId: ad.id, from: ad.budget, to },
      impact: `About ${money((to - ad.budget) * 7)} more a week`,
      saving: -(to - ad.budget) * 7,
    });
  });

  // Budget pacing for the month.
  const open = recs.filter((r) => r.action && !decisions[r.id]);
  const afterDaily = daily - sum(open, (r) => (r.saving || 0) / 7);
  const afterProjected = mtd + afterDaily * left;
  const budget = { mtd, daily, projected, afterDaily, afterProjected, low: settings.budgetLow, high: settings.budgetHigh, daysLeft: left };

  const acct7 = accountWindow(data, today, 7);
  if (open.length) {
    recs.push({
      id: `budget:all:${week}`,
      type: 'budget', title: 'Budget after these changes',
      body: `Right now you are set to spend ${money(daily, true)} a day, landing the month at about ${money(projected)}. If you approve the changes above, that becomes ${money(afterDaily, true)} a day and about ${money(afterProjected)} for the month. Your range is ${money(settings.budgetLow)} to ${money(settings.budgetHigh)}.${afterProjected < settings.budgetLow ? ` That is a little under your range. No need to fill it: spending less is fine while money is tight.` : afterProjected > settings.budgetHigh ? ` That is still over your range, so trim about ${money((afterProjected - settings.budgetHigh) / left, true)} a day from the weakest ad.` : ''}`,
      facts: [['Spent this month', money(mtd)], ['Daily now', money(daily, true)], ['Daily after', money(afterDaily, true)], ['Month lands at', money(afterProjected)]],
      info: true,
    });
  } else if (projected > settings.budgetHigh) {
    recs.push({ id: `budget:high:${week}`, type: 'budget', title: 'On course to overspend', body: `At ${money(daily, true)} a day the month lands at about ${money(projected)}, over your ${money(settings.budgetHigh)} limit. Trim about ${money((projected - settings.budgetHigh) / left, true)} a day from the weakest ad.`, facts: [['Month lands at', money(projected)]], info: true });
  } else if (projected < settings.budgetLow && acct7.roas >= target) {
    recs.push({ id: `budget:low:${week}`, type: 'budget', title: 'Under your range, and that is fine', body: `Ads are on target (${num(acct7.roas, 2)}) and the month lands at ${money(projected)}, under your ${money(settings.budgetLow)} minimum. Only if you can afford it, add 10% to your best ad and wait 3 days before anything more.`, facts: [['Month lands at', money(projected)]], info: true });
  }

  const order = { off: 0, tired: 1, scale: 2, budget: 3, learn: 4 };
  recs.sort((a, b) => order[a.type] - order[b.type]);
  return { recs, status, budget, copy: copyIdeas(data, today), summary: weeklySummary(data, settings, today, recs, status) };
}

const pctS = (v) => `${num(v * 100, 2)}%`;
function dayIn(today, n) {
  const d = fromYmd(addDays(today, Math.max(1, n)));
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

const COPY = {
  ugc: { hook: 'POV: your gym bag finally matches the effort you put in.', text: 'Unboxed it, packed it, trained with it. INFRNO kit is made for the sessions that actually hurt. Free UK delivery.', headline: 'Built for hard sessions' },
  founder: { hook: 'Why INFRNO exists, in 20 seconds.', text: 'Most gym kit is made for photos. Ours is made for the last rep. Film a quick to-camera clip in the gym, no script, and tell people why.', headline: 'Made for the last rep' },
  testimonial: { hook: 'Start with the result, not the intro.', text: 'Same proof, new face: a different customer, 15 seconds, open on the moment they hit a PR wearing the kit. Caption the first line big.', headline: 'Real people. Real sessions.' },
  offer: { hook: 'Two is cheaper than one. Do the maths.', text: 'Bundle your training kit and save. Limited stock on the winter range.', headline: 'Bundle and save' },
  delivery: { hook: 'Still thinking about it? Delivery is on us.', text: 'Free UK delivery on every INFRNO order. Arrives in time for Monday.', headline: 'Free UK delivery' },
  launch: { hook: 'The winter drop is here. It will not hang around.', text: 'New INFRNO hoodies. Heavyweight, built to train in and live in. When they are gone, they are gone.', headline: 'Winter range, out now' },
};

const TEST_SMALL = 'Test it small: one new version at a time, inside the budget the ad already has. No extra spend.';

export function copyIdeas(data, today) {
  const ranked = data.ads
    .filter((a) => a.daily.length >= 7)
    .map((a) => ({ a, w: adWindow(a, today, 14) }))
    .filter((x) => x.w.purchases >= 2)
    .sort((x, y) => y.w.roas - x.w.roas);
  const angles = [];
  ranked.forEach((x) => { if (!angles.includes(x.a.angle) && COPY[x.a.angle]) angles.push(x.a.angle); });
  const picks = angles.slice(0, 2);
  const out = picks.map((ang) => {
    const src = ranked.find((x) => x.a.angle === ang);
    return { ...COPY[ang], why: `Your "${src.a.name}" ad is working (ROAS ${num(src.w.roas, 2)}). Same angle, new words.`, how: TEST_SMALL };
  });
  out.push({ ...COPY.testimonial, why: 'Your testimonial reel is tired. This is the brief for its replacement.', how: 'Swap it in for the tired one on the same budget. No extra spend.' });
  return out;
}

function weeklySummary(data, settings, today, recs, status) {
  const target = settings.targetRoas;
  const a = accountWindow(data, today, 7);
  const prev = accountWindow(data, today, 7, 7);
  const shop = shopWindow(data, today, 7);
  const ads = data.ads.map((ad) => ({ ad, w: adWindow(ad, today, 7) })).filter((x) => x.w.spend > 5);
  const best = ads.filter((x) => x.w.purchases >= 2).sort((x, y) => y.w.roas - x.w.roas)[0];
  const worst = ads.slice().sort((x, y) => x.w.roas - y.w.roas)[0];
  const verdict = a.roas >= target ? 'above your target' : a.roas >= settings.minRoas ? 'making money but just under your target' : 'losing money';
  const trend = a.roas > prev.roas + 0.05 ? 'up from' : a.roas < prev.roas - 0.05 ? 'down from' : 'about the same as';
  const offs = recs.filter((r) => r.type === 'off').length;
  const tired = recs.filter((r) => r.type === 'tired').length;
  const scale = recs.filter((r) => r.type === 'scale').length;
  const todo = [];
  if (offs) todo.push(`turn off ${offs === 1 ? 'the loser' : `${offs} losers`}`);
  if (tired) todo.push('film a fresh version of the tired ad');
  if (scale) todo.push('if you can afford it, a small 10% step on your best ad');
  return [
    `Last 7 days you spent ${money(a.spend)} on Meta ads. Meta says that brought in ${money(a.revenue)} of sales, a ROAS of ${num(a.roas, 2)}. That is ${verdict} (${num(target, 2)}), and ${trend} ${num(prev.roas, 2)} the week before.`,
    `Shopify took ${money(shop.sales)} in total from ${num(shop.orders)} orders. So for every £1 on ads, the shop took ${money(a.spend ? shop.sales / a.spend : 0, true)}. That includes people who found you without an ad.`,
    best && worst ? `Best ad: "${best.ad.name}" at ROAS ${num(best.w.roas, 2)}. Weakest: "${worst.ad.name}", ${money(worst.w.spend)} spent for ${money(worst.w.revenue)} back.` : '',
    todo.length ? `This week: ${todo.join(', ')}.` : 'This week: hold steady. Nothing needs changing.',
  ].filter(Boolean);
}

// ---------- Phase 2: Claude ----------
// The backend sends this once each morning. Model per Jack's brief; the cheaper
// claude-sonnet-5-5 or claude-haiku-5-5 also work. Never called from the browser.
export function claudeRequest(data, settings, today) {
  const ads = data.ads.map((ad) => ({ name: ad.name, status: ad.status, daily_budget: ad.budget, d7: adWindow(ad, today, 7), d14: adWindow(ad, today, 14), baseline: adWindow(ad, today, 30, 21) }));
  return {
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    system: 'You are a blunt, practical Meta ads adviser for a small UK e-commerce brand. Plain English, short sentences, numbers first, no jargon without a one-line explanation. Never use em dashes. The owner has little money, so be cautious: prefer pausing clear losers over scaling winners; budget increases are at most 10% at a time, only on ads at least 7 days old with enough purchases to judge; never suggest total monthly spend above the cap; leave ads under 7 days old to learn. Every suggestion needs the numbers that justify it and ends with: Small step. Check it yourself before you approve.',
    messages: [{ role: 'user', content: JSON.stringify({ target_roas: settings.targetRoas, floor_roas: settings.minRoas, monthly_budget: [settings.budgetLow, settings.budgetHigh], shopify_7d: shopWindow(data, today, 7), ads }) }],
  };
}
