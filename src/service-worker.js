import { decodeGcs, decodeGcd } from './utils/gcd-decoder.js';

const MAX_REQUESTS = 50;

const GOOGLE_COLLECT_URLS = [
  '*://www.google-analytics.com/g/collect*',
  '*://www.google-analytics.com/collect*',
  '*://google-analytics.com/g/collect*',
  '*://analytics.google.com/g/collect*',
  '*://region1.google-analytics.com/g/collect*',
  '*://stats.g.doubleclick.net/g/collect*',
];

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
    const key = `network_${details.tabId}`;

    chrome.storage.session.get(key, (data) => {
      const existing = data[key] || { requests: [], history: [] };

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

      chrome.storage.session.set({ [key]: existing });
    });
  },
  { urls: GOOGLE_COLLECT_URLS },
);

// Clear cached scan results when a tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.session.remove([`scan_${tabId}`, `network_${tabId}`]);
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove([`scan_${tabId}`, `network_${tabId}`]);
});
