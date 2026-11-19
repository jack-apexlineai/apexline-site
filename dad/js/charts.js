// Hand-drawn SVG charts. No libraries, works offline.
import { money, shortDate, esc } from './util.js';

export function ring(frac, size = 64, stroke = 7, cls = '') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac || 0));
  return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="${stroke}"/>
    <circle class="ring-val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - f)).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export function spark(values, w = 96, h = 28, cls = '') {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
  const max = Math.max(...v);
  const min = Math.min(...v);
  const span = max - min || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((x - min) / span) * (h - 6)).toFixed(1)}`);
  return `<svg class="spark ${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// Bars = ad spend, line = Shopify sales. Responsive via viewBox.
export function spendVsSales(series, W = 720, H = 240) {
  W = Math.max(280, Math.round(W));
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const n = series.length;
  const max = Math.max(10, ...series.map((d) => Math.max(d.spend, d.sales))) * 1.1;
  const step = (W - padL - padR) / n;
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = 4;
  let grid = '';
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/><text x="${padL - 8}" y="${(y(v) + 4).toFixed(1)}" class="axis" text-anchor="end">£${Math.round(v)}</text>`;
  }
  const bw = Math.max(3, step * 0.56);
  const bars = series.map((d, i) => {
    const x = padL + i * step + (step - bw) / 2;
    return `<rect class="bar" x="${x.toFixed(1)}" y="${y(d.spend).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - padB - y(d.spend)).toFixed(1)}" rx="${Math.min(4, bw / 2).toFixed(1)}"><title>${esc(shortDate(d.date))}: spend ${money(d.spend, true)}, Shopify ${money(d.sales, true)}</title></rect>`;
  }).join('');
  const pts = series.map((d, i) => `${(padL + i * step + step / 2).toFixed(1)},${y(d.sales).toFixed(1)}`);
  const area = `M${pts[0]} L${pts.join(' L')} L${(padL + (n - 1) * step + step / 2).toFixed(1)},${H - padB} L${(padL + step / 2).toFixed(1)},${H - padB} Z`;
  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - padL) / 64))));
  const labels = series.map((d, i) => ((n - 1 - i) % every === 0 ? `<text x="${(padL + i * step + step / 2).toFixed(1)}" y="${H - 8}" class="axis" text-anchor="middle">${esc(shortDate(d.date))}</text>` : '')).join('');
  return `<svg class="combo" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Daily ad spend against Shopify sales">
    ${grid}${bars}
    <path d="${area}" class="area"/>
    <polyline points="${pts.join(' ')}" class="line" fill="none"/>
    ${series.map((d, i) => `<circle cx="${(padL + i * step + step / 2).toFixed(1)}" cy="${y(d.sales).toFixed(1)}" r="${step > 14 ? 3 : 0}" class="dot"/>`).join('')}
    ${labels}
  </svg>`;
}
