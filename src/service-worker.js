import { decodeGcs, decodeGcd } from './utils/gcd-decoder.js';

const MAX_REQUESTS = 50;
const SYNC_DEBOUNCE_MS = 200;

const GOOGLE_COLLECT_URLS = [
  '*://www.google-analytics.com/g/collect*',
  '*://www.google-analytics.com/collect*',
  '*://google-analytics.com/g/collect*',
  '*://analytics.google.com/g/collect*',
  '*://region1.google-analytics.com/g/collect*',
  '*://stats.g.doubleclick.net/g/collect*',
];

// In-memory store keyed by tab ID to avoid read-modify-write races on storage
const tabData = new Map();
const syncTimers = new Map();

function getTabData(tabId) {
  if (!tabData.has(tabId)) {
    tabData.set(tabId, { requests: [], history: [] });
  }
  return tabData.get(tabId);
}

function scheduleSyncToStorage(tabId) {
  clearTimeout(syncTimers.get(tabId));
  syncTimers.set(tabId, setTimeout(() => {
    const data = tabData.get(tabId);
    if (data) {
      chrome.storage.session.set({ [`network_${tabId}`]: data });
    }
    syncTimers.delete(tabId);
  }, SYNC_DEBOUNCE_MS));
}

// Monitor network requests for GCS/GCD parameters
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const url = new URL(details.url);
    const gcsRaw = url.searchParams.get('gcs');
    const gcdRaw = url.searchParams.get('gcd');
    if (!gcsRaw && !gcdRaw) return;

    const gcs = gcsRaw ? decodeGcs(gcsRaw) : null;
    const gcd = gcdRaw ? decodeGcd(gcdRaw) : null;
    const entry = { timestamp: Date.now(), gcs, gcd };
    const existing = getTabData(details.tabId);

    // Detect changes for history
    const prevGcsRaw = existing.latestGcs?.raw;
    const prevGcdRaw = existing.latestGcd?.raw;
    if (
      (gcsRaw && gcsRaw !== prevGcsRaw) ||
      (gcdRaw && gcdRaw !== prevGcdRaw)
    ) {
      existing.history.push({
        timestamp: entry.timestamp,
        previousGcs: existing.latestGcs || null,
        newGcs: gcs,
        previousGcd: existing.latestGcd || null,
        newGcd: gcd,
      });
    }

    // Update latest values
    if (gcs) existing.latestGcs = gcs;
    if (gcd) existing.latestGcd = gcd;

    // Append request (capped)
    existing.requests.push(entry);
    if (existing.requests.length > MAX_REQUESTS) {
      existing.requests = existing.requests.slice(-MAX_REQUESTS);
    }

    scheduleSyncToStorage(details.tabId);
  },
  { urls: GOOGLE_COLLECT_URLS },
);

// Clear cached scan results when a tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabData.delete(tabId);
    clearTimeout(syncTimers.get(tabId));
    syncTimers.delete(tabId);
    chrome.storage.session.remove([`scan_${tabId}`, `network_${tabId}`]);
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  clearTimeout(syncTimers.get(tabId));
  syncTimers.delete(tabId);
  chrome.storage.session.remove([`scan_${tabId}`, `network_${tabId}`]);
});
