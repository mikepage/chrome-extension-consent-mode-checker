import { detectConsentMode } from '../content/detector.js';
import { renderResults } from '../utils/ui.js';

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
};

async function scan() {
  elements.loading.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.rescanBtn.classList.add('hidden');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      func: detectConsentMode,
      target: { tabId: tab.id },
      world: 'MAIN', // Access page JS globals (dataLayer, gtag, etc.)
    });

    // Cache result
    chrome.storage.session.set({ [`scan_${tab.id}`]: result });

    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
    elements.rescanBtn.classList.remove('hidden');
    renderResults(result, elements);
  } catch (error) {
    console.warn('Consent Mode Checker: cannot scan this tab', error);
    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
    elements.rescanBtn.classList.remove('hidden');
    elements.statusBanner.className = 'banner banner-fail';
    elements.statusBanner.textContent = 'Cannot scan this page (restricted URL)';
  }
}

// Load cached result or scan
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const cached = await chrome.storage.session.get(`scan_${tab.id}`);
  if (cached[`scan_${tab.id}`]) {
    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
    elements.rescanBtn.classList.remove('hidden');
    renderResults(cached[`scan_${tab.id}`], elements);
  } else {
    scan();
  }
})();

elements.rescanBtn.addEventListener('click', scan);
