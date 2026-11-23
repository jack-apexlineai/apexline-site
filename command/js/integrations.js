// One place for every outside account. Phase 1 returns sample data.
// Phase 2 (live): each provider is connected by John clicking Allow on the
// provider's own page. Tokens live only on the backend, never in this browser,
// and never with Jack. The browser only ever calls our own /api routes.

import { sampleAds, sampleCalendar } from './sample.js';
import { ymd } from './util.js';

const CFG = window.PLANNER_CONFIG || { mode: 'local', apiBase: '/api' };
export const LIVE = CFG.mode === 'live';

export const PROVIDERS = [
  {
    id: 'google', name: 'Google Calendar', icon: 'calendar', phase: 1,
    what: 'Reads your calendar so meetings and family plans block out time in your day.',
    allow: 'See your calendar events (read only). It cannot change or delete anything.',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  },
  {
    id: 'meta', name: 'Meta ads', icon: 'meta', phase: 1,
    what: 'Reads your ad numbers every morning for the dashboard and the advice.',
    allow: 'Read your ad account numbers. Changes only happen when you press Approve.',
    scopes: ['ads_read', 'ads_management', 'business_management'],
  },
  {
    id: 'shopify', name: 'Shopify', icon: 'bag', phase: 1,
    what: 'Shows your real sales next to ad spend, and payouts in Money.',
    allow: 'Read orders and payouts. It cannot change your shop.',
    scopes: ['read_orders', 'read_shopify_payments_payouts'],
  },
  {
    id: 'amazon', name: 'Amazon Seller Central', icon: 'box', phase: 2,
    what: 'Sales and payouts from Amazon. Your agency keeps running PPC.',
    allow: 'Read sales and settlement reports.',
    scopes: ['SP-API: Reports, Finances'],
  },
  {
    id: 'analytics', name: 'Google Analytics', icon: 'chart', phase: 2,
    what: 'Website visitors and where they came from.',
    allow: 'Read your Analytics reports.',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },
  {
    id: 'email', name: 'Email marketing', icon: 'mail', phase: 2,
    what: 'Klaviyo or Mailchimp: list size and what your emails sell.',
    allow: 'Read campaign results.',
    scopes: ['campaigns:read', 'metrics:read'],
  },
  {
    id: 'accounts', name: 'Accounts', icon: 'wallet', phase: 2,
    what: 'Xero or QuickBooks, so Money fills itself in.',
    allow: 'Read bank transactions and invoices.',
    scopes: ['accounting.transactions.read'],
  },
  {
    id: 'buffer', name: 'Buffer', icon: 'send', phase: 2,
    what: 'Your scheduled posts, and ticks "Posted content" for you when a post goes out.',
    allow: 'Read your scheduled and sent posts.',
    scopes: ['posts:read'],
  },
];

// Start the Allow flow. Live: the backend redirects to the provider's own consent page.
export function connect(id) {
  if (!LIVE) return false;
  window.location.href = `${CFG.apiBase}/connect/${encodeURIComponent(id)}/start`;
  return true;
}

async function api(path) {
  const res = await fetch(`${CFG.apiBase}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// Same shapes in sample and live mode, so the screens never care which is used.
export const source = {
  async ads(today = ymd()) {
    if (LIVE) return api(`/meta/insights?until=${today}`);
    return sampleAds(today);
  },
  adsSync(today = ymd()) {
    // Live: empty until Meta is connected, never sample numbers on his real version.
    if (LIVE) return { account: { name: 'Meta not connected', id: null }, ads: [], shopify: [], empty: true };
    return sampleAds(today);
  },
  calendar(date, today = ymd()) {
    // Live: empty until Google Calendar is connected.
    if (LIVE) return [];
    return sampleCalendar(date, today);
  },
};
