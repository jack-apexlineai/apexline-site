// Ads screen: numbers in his order, the morning briefing, and approve buttons.
import { state, save } from './store.js';
import { source } from './integrations.js';
import { buildAdvice, accountWindow, shopWindow, dailySeries, adWindow, applyChanges } from './advice.js';
import { ymd, esc, money, num, shortDate, addDays } from './util.js';
import { icon } from './icons.js';
import { spark, spendVsSales } from './charts.js';
import { bus, pill, seg, openSheet } from './ui.js';
import { toast } from './notify.js';

const today = () => ymd();
let range = 7;
let cache = { key: '', data: null, advice: null };

export function getAds() {
  const key = today() + JSON.stringify(state.ads.changes) + JSON.stringify(state.settings.ads) + Object.keys(state.ads.decisions).length;
  if (cache.key !== key) {
    const raw = source.adsSync(today());
    const data = raw.empty ? raw : applyChanges(raw, state.ads.changes);
    const advice = raw.empty
      ? { recs: [], status: {}, budget: {}, copy: [], summary: ['Your ads show here once Meta is connected in Settings.'] }
      : buildAdvice(data, state.settings.ads, today(), state.ads.decisions);
    cache = { key, data, advice };
  }
  return cache;
}

const openRecs = (advice) => advice.recs.filter((r) => !state.ads.decisions[r.id]);

const EMPTY_CARD = (big) => `<section class="card${big ? '' : ' ads-mini'}">
    <div class="card-head"><h3>${icon('spark', 16)} Ads</h3></div>
    <p class="sub">Connect your Meta account in Settings and your ads briefing shows here: spend, ROAS, purchases, and plain-English advice each morning. Nothing changes in Meta unless you press Approve.</p>
    <a href="#settings" class="mini-cta">Connect Meta in Settings ${icon('right', 14)}</a>
  </section>`;

export function adsMini() {
  if (getAds().data.empty) return EMPTY_CARD(false);
  const { data, advice } = getAds();
  const a = accountWindow(data, today(), 7);
  const acts = openRecs(advice).filter((r) => r.action).length;
  const t = state.settings.ads.targetRoas;
  return `<section class="card ads-mini">
    <div class="card-head"><h3>${icon('spark', 16)} Ads briefing</h3><a href="#ads" class="link">Open ${icon('right', 14)}</a></div>
    <div class="mini-kpis">
      <div><span class="stat-label">ROAS, 7 days</span><strong class="${a.roas >= t ? 'good' : a.roas >= 1 ? 'warn' : 'bad'}">${num(a.roas, 2)}</strong></div>
      <div><span class="stat-label">Spend</span><strong>${money(a.spend)}</strong></div>
      <div><span class="stat-label">Purchases</span><strong>${num(a.purchases)}</strong></div>
    </div>
    <a href="#ads" class="mini-cta ${acts ? 'hot' : ''}">${acts ? `${acts} change${acts === 1 ? '' : 's'} waiting for your OK` : 'No changes needed today'} ${icon('right', 14)}</a>
  </section>`;
}

export const pendingCount = () => openRecs(getAds().advice).filter((r) => r.action).length;

export const KPI = [
  { k: 'spend', label: 'Spend', fmt: (v) => money(v), good: null, explain: 'What you paid Meta in this period.' },
  { k: 'cpa', label: 'Cost per purchase', fmt: (v) => (v ? money(v, true) : 'n/a'), good: 'low', explain: 'Ad spend divided by sales. Lower is better. At your target ROAS this needs to be under about £27.' },
  { k: 'roas', label: 'ROAS', fmt: (v) => num(v, 2), good: 'high', explain: 'Sales Meta says the ads made, divided by spend. 1.45 means £1.45 back for every £1. Under 1 means losing money.' },
  { k: 'purchases', label: 'Purchases', fmt: (v) => num(v), good: 'high', explain: 'Orders Meta tracked from the ads.' },
  { k: 'ctr', label: 'CTR', fmt: (v) => `${num(v * 100, 2)}%`, good: 'high', explain: 'Click-through rate. Out of 100 people who saw an ad, how many clicked. Over 1% is decent, falling CTR means the ad is getting stale.' },
  { k: 'cpm', label: 'CPM', fmt: (v) => money(v, true), good: 'low', explain: 'Cost to show your ads 1,000 times. It rises when audiences get crowded, like Black Friday.' },
  { k: 'freq', label: 'Frequency', fmt: (v) => num(v, 2), good: 'low', explain: 'How many times the average person saw your ads. Over 3 on cold audiences usually means they are getting bored of them.' },
];

function kpiTiles(data) {
  const cur = accountWindow(data, today(), range);
  const prev = accountWindow(data, today(), range, range);
  const target = state.settings.ads.targetRoas;
  return `<section class="kpis">${KPI.map((m) => {
    const v = cur[m.k];
    const p = prev[m.k];
    let delta = '';
    if (p && v != null) {
      const ch = (v - p) / p;
      const better = m.good === 'high' ? ch > 0 : m.good === 'low' ? ch < 0 : null;
      if (Math.abs(ch) >= 0.005) delta = `<span class="delta ${better === null ? '' : better ? 'good' : 'bad'}">${ch > 0 ? icon('up', 12) : icon('down', 12)}${num(Math.abs(ch) * 100, 0)}%</span>`;
    }
    let tone = '';
    if (m.k === 'roas') tone = v >= target ? 'good' : v >= state.settings.ads.minRoas ? 'warn' : 'bad';
    if (m.k === 'freq') tone = v >= 3 ? 'warn' : '';
    return `<button class="kpi card ${tone}" data-act="explain" data-k="${m.k}">
      <span class="kpi-label">${m.label} ${icon('info', 13)}</span>
      <span class="kpi-val">${m.fmt(v)}</span>
      <span class="kpi-foot">${delta}<span class="muted">vs previous ${range} days</span></span>
      ${m.k === 'roas' ? `<span class="kpi-target">Target ${num(state.settings.ads.targetRoas, 2)}</span>` : ''}
    </button>`;
  }).join('')}</section>
  <p class="muted small kpi-note">Arrows compare with the ${range} days before. Tap any number for what it means.</p>`;
}

export const SAFE_LINE = 'Small step. Check it yourself before you approve. This is based on your numbers, not professional advice.';

function recCard(r) {
  const tone = { off: 'bad', tired: 'warn', scale: 'good', budget: 'info', learn: 'mute' }[r.type];
  const tag = { off: 'Turn off', tired: 'Tired creative', scale: 'Scale', budget: 'Budget', learn: 'Too early' }[r.type];
  return `<article class="rec card rec-${r.type}" data-rec="${esc(r.id)}">
    <div class="rec-top">${pill(tag, tone)}${r.impact ? `<span class="muted small">${esc(r.impact)}</span>` : ''}</div>
    <h3>${esc(r.title)}</h3>
    <p>${esc(r.body)}</p>
    ${r.facts ? `<dl class="facts">${r.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    <p class="rec-safe">${icon('info', 14)}<span>${SAFE_LINE}</span></p>
    ${r.action ? `<div class="row gap wrap rec-actions">
      <button class="btn primary" data-act="approve" data-id="${esc(r.id)}">${icon('check', 16)} Approve: ${esc(r.action.label)}</button>
      <button class="btn ghost" data-act="dismiss" data-id="${esc(r.id)}">Not now</button>
    </div>` : ''}
  </article>`;
}

function adsTable(data, advice) {
  const rows = data.ads.map((ad) => ({ ad, w: adWindow(ad, today(), range), st: advice.status[ad.id] || { tag: 'Keep', tone: 'good', text: '' } }))
    .sort((a, b) => b.w.spend - a.w.spend);
  const roasSeries = (ad) => {
    const out = [];
    for (let i = Math.min(ad.daily.length, 28); i >= 7; i -= 3) out.push(adWindow(ad, today(), 7, i - 7).roas);
    return out;
  };
  return `<section class="card">
    <div class="card-head"><h3>Your ads</h3><span class="muted small">Last ${range} days · sorted by spend</span></div>
    <div class="ad-list">
      <div class="ad-row ad-headrow" aria-hidden="true"><span>Ad</span><span>Spend</span><span>Cost per purchase</span><span>ROAS</span><span>Purch.</span><span>CTR</span><span>Freq.</span><span>ROAS trend</span></div>
      ${rows.map(({ ad, w, st }) => `<div class="ad-row ${ad.status === 'paused' ? 'paused' : ''}">
        <span class="ad-name"><strong>${esc(ad.name)}</strong><small>${esc(ad.campaign)} · ${esc(ad.format)} · ${money(ad.budget, true)}/day</small>${pill(st.tag, st.tone)}<small class="ad-note">${esc(st.text)}</small></span>
        <span data-l="Spend">${money(w.spend)}</span>
        <span data-l="Cost per purchase">${w.cpa ? money(w.cpa, true) : 'none'}</span>
        <span data-l="ROAS" class="${w.roas >= state.settings.ads.targetRoas ? 'good' : w.roas >= 1 ? 'warn' : 'bad'}"><strong>${num(w.roas, 2)}</strong></span>
        <span data-l="Purchases">${num(w.purchases)}</span>
        <span data-l="CTR">${num(w.ctr * 100, 2)}%</span>
        <span data-l="Frequency" class="${w.freq >= (ad.retargeting ? 6 : 3) ? 'warn' : ''}">${num(w.freq, 1)}</span>
        <span class="spark-cell ${w.roas >= state.settings.ads.targetRoas ? 'good' : 'bad'}">${spark(roasSeries(ad), 84, 26)}</span>
      </div>`).join('')}
    </div>
  </section>`;
}

export function view() {
  if (getAds().data.empty) return `<header class="page-head"><div><h1>Ads</h1><p class="sub">Your Meta numbers in the order you check them, with plain-English advice.</p></div></header>${EMPTY_CARD(true)}`;
  const { data, advice } = getAds();
  const recs = openRecs(advice);
  const acting = recs.filter((r) => r.action);
  const infos = recs.filter((r) => !r.action);
  const series = dailySeries(data, today(), range);
  const shop = shopWindow(data, today(), range);
  const acct = accountWindow(data, today(), range);
  const changes = state.ads.changes.slice().reverse();
  const w = Math.min(1100, (document.querySelector('#main')?.clientWidth || 720) - 40);
  const chartW = window.innerWidth >= 1100 ? Math.min(760, w * 0.62) : w;

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">${esc(data.account.name)} · to ${esc(shortDate(addDays(today(), -1)))}</p>
      <h1>Ads</h1>
      <p class="sub">Your Meta numbers in the order you check them, with plain-English advice. Nothing changes in Meta unless you press Approve.</p>
    </div>
    ${seg('range', [[7, '7 days'], [14, '14 days'], [30, '30 days']], range)}
  </header>

  ${kpiTiles(data)}

  <section class="briefing">
    <div class="section-head">
      <h2>${icon('spark', 20)} This morning's briefing</h2>
      <span class="muted small">Written 7:00am from yesterday's numbers</span>
    </div>
    ${acting.length ? acting.map(recCard).join('') : '<div class="card empty-note">Nothing to approve. Everything is on track.</div>'}
    ${infos.map(recCard).join('')}
    <p class="ads-hire">${icon('info', 15)}<span>If you hire someone to run your ads, keep this running. Once your Meta account is connected, it records what they change and how it went, so you can learn from it later.</span></p>
    ${changes.length ? `<div class="card changes"><div class="card-head"><h3>${icon('check', 16)} Approved</h3><span class="muted small">Sample mode: logged here. Live: sent to Meta when you press Approve.</span></div>
      <ul class="plain-list">${changes.map((c) => `<li><span>${esc(c.label)}</span><button class="link" data-act="undo-change" data-id="${esc(c.recId)}">Undo</button></li>`).join('')}</ul></div>` : ''}
  </section>

  <div class="grid-2">
    <section class="card chart-card">
      <div class="card-head"><h3>Ad spend vs Shopify sales</h3><span class="legend"><i class="lg-bar"></i>Ad spend <i class="lg-line"></i>Shopify sales</span></div>
      <div class="chart" data-chart>${spendVsSales(series, chartW, 230)}</div>
      <div class="chart-foot">
        <div><span class="stat-label">Shopify sales</span><strong>${money(shop.sales)}</strong><small>${num(shop.orders)} orders</small></div>
        <div><span class="stat-label">Ad spend</span><strong>${money(acct.spend)}</strong><small>${num(acct.purchases)} from ads</small></div>
        <div><span class="stat-label">Shop takings per £1 of ads</span><strong>${money(acct.spend ? shop.sales / acct.spend : 0, true)}</strong><small>includes non-ad sales</small></div>
      </div>
    </section>
    <section class="card summary-card">
      <div class="card-head"><h3>${icon('edit', 16)} The week in plain English</h3></div>
      ${advice.summary.map((p) => `<p>${esc(p)}</p>`).join('')}
    </section>
  </div>

  ${adsTable(data, advice)}

  <section>
    <div class="section-head"><h2>${icon('bolt', 20)} New ad ideas to test</h2><span class="muted small">One at a time, inside your current budget</span></div>
    <div class="ideas">
      ${advice.copy.map((c, i) => `<article class="card idea">
        <span class="eyebrow">Idea ${i + 1}</span>
        <h3>"${esc(c.hook)}"</h3>
        <p>${esc(c.text)}</p>
        <p class="muted small"><strong>Headline:</strong> ${esc(c.headline)}</p>
        <p class="muted small">${esc(c.why)}</p>
        ${c.how ? `<p class="idea-how">${esc(c.how)}</p>` : ''}
        <button class="btn ghost sm" data-act="copy-idea" data-i="${i}">${icon('copy', 15)} Copy</button>
      </article>`).join('')}
    </div>
  </section>

  <p class="muted small foot-note">${icon('info', 13)} Amazon PPC is run by your agency, so it is not in here. Amazon payouts show in Money. ROAS here is what Meta reports, Shopify sales are the real till.</p>`;
}

export const actions = {
  range: (el) => { range = +el.dataset.v; bus.render(); },
  approve: (el) => {
    const { advice } = getAds();
    const r = advice.recs.find((x) => x.id === el.dataset.id);
    if (!r || !r.action) return;
    state.ads.decisions[r.id] = 'approved';
    const ad = getAds().data.ads.find((a) => a.id === r.action.adId);
    state.ads.changes.push({ recId: r.id, adId: r.action.adId, kind: r.action.kind, from: r.action.from, to: r.action.to, at: Date.now(), label: `${r.action.kind === 'pause' ? 'Turned off' : 'Budget'} "${ad ? ad.name : ''}"${r.action.kind === 'budget' ? ` ${money(r.action.from, true)} to ${money(r.action.to, true)}/day` : ''}` });
    save();
    bus.render();
    toast(r.action.kind === 'pause' ? 'Approved. Ad turned off.' : 'Approved. Budget changed.', { kind: 'good', actions: [{ label: 'Undo', fn: () => actions['undo-change']({ dataset: { id: r.id } }) }] });
  },
  dismiss: (el) => {
    state.ads.decisions[el.dataset.id] = 'dismissed';
    save();
    bus.render();
    toast('Skipped for this week.', { kind: 'info', actions: [{ label: 'Undo', fn: () => { delete state.ads.decisions[el.dataset.id]; save(); bus.render(); } }] });
  },
  'undo-change': (el) => {
    const id = el.dataset.id;
    delete state.ads.decisions[id];
    state.ads.changes = state.ads.changes.filter((c) => c.recId !== id);
    save();
    bus.render();
  },
  explain: (el) => {
    const m = KPI.find((x) => x.k === el.dataset.k);
    if (!m) return;
    openSheet(`<div class="explain"><h2>${esc(m.label)}</h2><p>${esc(m.explain)}</p></div>`, { id: 'explain' });
  },
  'copy-idea': async (el) => {
    const c = getAds().advice.copy[+el.dataset.i];
    if (!c) return;
    const text = `Hook: ${c.hook}\n\n${c.text}\n\nHeadline: ${c.headline}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied. Paste it into Ads Manager.', { kind: 'good', duration: 2500 });
    } catch {
      toast('Could not copy here. Press and hold the text to copy it.', { kind: 'info' });
    }
  },
};
