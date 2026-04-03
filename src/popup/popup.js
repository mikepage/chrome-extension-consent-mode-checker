import { detectConsentMode } from '../content/detector.js';
import { decodeGcd } from '../utils/gcd-decoder.js';
import { renderResults, renderNetworkSignals, renderGcdGrid, renderHistory } from '../utils/ui.js';

const elements = {
  loading: document.getElementById('loading'),
  results: document.getElementById('results'),
  statusBanner: document.getElementById('statusBanner'),
  cmpInfo: document.getElementById('cmpInfo'),
  tagInfo: document.getElementById('tagInfo'),
  consentDefaults: document.getElementById('consentDefaults'),
  consentUpdates: document.getElementById('consentUpdates'),
  updatesSection: document.getElementById('updatesSection'),
  consentState: document.getElementById('consentState'),
  stateSection: document.getElementById('stateSection'),
  issuesSection: document.getElementById('issuesSection'),
  issuesList: document.getElementById('issuesList'),
  rescanBtn: document.getElementById('rescanBtn'),
  consentRowTemplate: document.getElementById('consent-row-template'),
  badgeTemplate: document.getElementById('badge-template'),
  issueTemplate: document.getElementById('issue-template'),
  // Network signals
  networkSection: document.getElementById('networkSection'),
  networkContent: document.getElementById('networkContent'),
  gcsInfo: document.getElementById('gcsInfo'),
  gcdGrid: document.getElementById('gcdGrid'),
  networkMeta: document.getElementById('networkMeta'),
  // GCD Calculator
  gcdInput: document.getElementById('gcdInput'),
  gcdCalcResult: document.getElementById('gcdCalcResult'),
  gcdCalcError: document.getElementById('gcdCalcError'),
  // History
  historySection: document.getElementById('historySection'),
  historyTimeline: document.getElementById('historyTimeline'),
};

let currentTabId = null;

async function scan() {
  elements.loading.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.rescanBtn.classList.add('hidden');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      func: detectConsentMode,
      target: { tabId: tab.id },
      world: 'MAIN',
    });

    chrome.storage.session.set({ [`scan_${tab.id}`]: result });

    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
    elements.rescanBtn.classList.remove('hidden');
    renderResults(result, elements);
    loadNetworkData(tab.id);
  } catch (error) {
    console.warn('Consent Mode Checker: cannot scan this tab', error);
    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
    elements.rescanBtn.classList.remove('hidden');
    elements.statusBanner.className = 'banner banner-fail';
    elements.statusBanner.textContent = 'Cannot scan this page (restricted URL)';
  }
}

async function loadNetworkData(tabId) {
  const key = `network_${tabId}`;
  const data = await chrome.storage.session.get(key);
  const networkData = data[key];
  renderNetworkSignals(networkData, elements);
  renderHistory(networkData, elements);

  // Pre-fill calculator with latest GCD if available
  if (networkData?.latestGcd?.raw && !elements.gcdInput.value) {
    elements.gcdInput.value = networkData.latestGcd.raw;
    elements.gcdInput.dispatchEvent(new Event('input'));
  }
}

// Load cached result or scan
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  const cached = await chrome.storage.session.get(`scan_${tab.id}`);
  if (cached[`scan_${tab.id}`]) {
    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
    elements.rescanBtn.classList.remove('hidden');
    renderResults(cached[`scan_${tab.id}`], elements);
    loadNetworkData(tab.id);
  } else {
    scan();
  }
})();

elements.rescanBtn.addEventListener('click', scan);

// Collapsible sections
for (const toggle of document.querySelectorAll('.section-title-toggle')) {
  toggle.addEventListener('click', () => {
    const target = document.getElementById(toggle.dataset.target);
    if (target) target.classList.toggle('collapsed');
  });
}

// GCD Calculator
elements.gcdInput.addEventListener('input', (e) => {
  const value = e.target.value.trim();
  if (!value) {
    elements.gcdCalcResult.innerHTML = '';
    elements.gcdCalcError.classList.add('hidden');
    return;
  }
  const decoded = decodeGcd(value);
  if (decoded && decoded.signals) {
    renderGcdGrid(elements.gcdCalcResult, decoded, elements.consentRowTemplate);
    elements.gcdCalcError.classList.add('hidden');
  } else {
    elements.gcdCalcResult.innerHTML = '';
    elements.gcdCalcError.textContent = 'Invalid GCD format. Expected: 11<code>1<code>1<code>1<code><digit>';
    elements.gcdCalcError.classList.remove('hidden');
  }
});

// Real-time network data updates while popup is open
let debounceTimer = null;
chrome.storage.session.onChanged.addListener((changes) => {
  if (!currentTabId) return;
  const key = `network_${currentTabId}`;
  if (changes[key]) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const networkData = changes[key].newValue;
      renderNetworkSignals(networkData, elements);
      renderHistory(networkData, elements);
    }, 300);
  }
});

