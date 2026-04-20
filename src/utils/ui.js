import { GCD_SIGNAL_CODES } from './gcd-decoder.js';

const CONSENT_TYPES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

function addConsentRow(container, template, consentType, consentValue) {
  const fragment = template.content.cloneNode(true);
  const typeElement = fragment.querySelector('.consent-type');
  const valueElement = fragment.querySelector('.consent-value');
  typeElement.textContent = consentType;

  if (consentValue === 'granted') {
    valueElement.textContent = 'granted';
    valueElement.classList.add('consent-granted');
  } else if (consentValue === 'denied') {
    valueElement.textContent = 'denied';
    valueElement.classList.add('consent-denied');
  } else if (consentValue !== undefined) {
    valueElement.textContent = String(consentValue);
  } else {
    valueElement.textContent = 'not set';
    valueElement.classList.add('consent-missing');
  }

  container.appendChild(fragment);
}

function renderConsentGrid(container, data, template) {
  container.innerHTML = '';
  if (!data) {
    const placeholder = document.createElement('div');
    placeholder.className = 'consent-type';
    placeholder.style.cssText = 'grid-column:1/-1;color:#999;font-style:italic';
    placeholder.textContent = 'Not set';
    container.appendChild(placeholder);
    return;
  }
  for (const consentType of CONSENT_TYPES) {
    addConsentRow(container, template, consentType, data[consentType]);
  }
  // Show any extra keys not in CONSENT_TYPES
  for (const [consentType, consentValue] of Object.entries(data)) {
    if (CONSENT_TYPES.includes(consentType) || consentType === 'event' || consentType === 'wait_for_update') continue;
    if (typeof consentValue !== 'string') continue;
    addConsentRow(container, template, consentType, consentValue);
  }
}

function addBadge(container, template, text, className) {
  const badge = template.content.firstElementChild.cloneNode(true);
  badge.textContent = text;
  badge.classList.add(className);
  container.appendChild(badge);
}

export function renderResults(scanResult, elements) {
  const { consentRowTemplate, badgeTemplate, issueTemplate } = elements;

  // --- Status Banner ---
  const hasConsentMode = scanResult.consentMode.detected;
  const hasCmp = scanResult.cmp.detected;
  const hasDefaults = !!scanResult.consentMode.defaults;
  const issueCount = scanResult.issues.length;

  if (hasConsentMode && hasCmp && hasDefaults && issueCount <= 1) {
    elements.statusBanner.className = 'banner banner-pass';
    elements.statusBanner.textContent = 'Consent Mode v2 detected';
  } else if (hasConsentMode) {
    elements.statusBanner.className = 'banner banner-warn';
    elements.statusBanner.textContent = `Consent Mode detected with ${issueCount} issue${issueCount !== 1 ? 's' : ''}`;
  } else {
    elements.statusBanner.className = 'banner banner-fail';
    elements.statusBanner.textContent = 'No Consent Mode implementation found';
  }

  // --- CMP Info ---
  elements.cmpInfo.innerHTML = '';
  if (scanResult.cmp.detected) {
    const versionLabel = scanResult.cmp.version ? ` v${scanResult.cmp.version}` : '';
    addBadge(elements.cmpInfo, badgeTemplate, scanResult.cmp.name + versionLabel, 'badge-green');
  } else {
    addBadge(elements.cmpInfo, badgeTemplate, 'Not detected', 'badge-red');
  }

  // --- Tag Info ---
  elements.tagInfo.innerHTML = '';
  if (scanResult.gtagPresent) addBadge(elements.tagInfo, badgeTemplate, 'gtag.js', 'badge-green');
  if (scanResult.gtmPresent) addBadge(elements.tagInfo, badgeTemplate, 'GTM', 'badge-green');
  if (!scanResult.gtagPresent && !scanResult.gtmPresent) addBadge(elements.tagInfo, badgeTemplate, 'None found', 'badge-red');

  // --- Consent Defaults ---
  renderConsentGrid(elements.consentDefaults, scanResult.consentMode.defaults, consentRowTemplate);

  // --- Consent Updates ---
  if (scanResult.consentMode.updates) {
    elements.updatesSection.classList.remove('hidden');
    renderConsentGrid(elements.consentUpdates, scanResult.consentMode.updates, consentRowTemplate);
  } else {
    elements.updatesSection.classList.add('hidden');
  }

  // --- Current State ---
  if (scanResult.consentMode.implementation) {
    elements.stateSection.classList.remove('hidden');
    renderConsentGrid(elements.consentState, scanResult.consentMode.implementation, consentRowTemplate);
  } else {
    elements.stateSection.classList.add('hidden');
  }

  // --- Issues ---
  if (scanResult.issues.length) {
    elements.issuesSection.classList.remove('hidden');
    elements.issuesList.innerHTML = '';
    for (const issueText of scanResult.issues) {
      const issueItem = issueTemplate.content.firstElementChild.cloneNode(true);
      issueItem.textContent = issueText;
      elements.issuesList.appendChild(issueItem);
    }
  } else {
    elements.issuesSection.classList.add('hidden');
  }
}

export function renderNetworkSignals(networkData, elements) {
  const { consentRowTemplate, badgeTemplate } = elements;

  if (!networkData || networkData.requests.length === 0) {
    elements.networkSection.classList.add('hidden');
    return;
  }

  elements.networkSection.classList.remove('hidden');

  // --- GCS ---
  elements.gcsInfo.innerHTML = '';
  const gcs = networkData.latestGcs;
  if (gcs) {
    const label = `${gcs.raw} — Ads: ${gcs.ads}, Analytics: ${gcs.analytics}`;
    const allGranted = gcs.ads === 'granted' && gcs.analytics === 'granted';
    const allDenied = gcs.ads === 'denied' && gcs.analytics === 'denied';
    const badgeClass = allGranted ? 'badge-green' : allDenied ? 'badge-red' : 'badge-gray';
    addBadge(elements.gcsInfo, badgeTemplate, label, badgeClass);
  } else {
    addBadge(elements.gcsInfo, badgeTemplate, 'Not found in requests', 'badge-gray');
  }

  // --- GCD ---
  renderGcdGrid(elements.gcdGrid, networkData.latestGcd, consentRowTemplate);

  // --- Meta ---
  elements.networkMeta.textContent = `${networkData.requests.length} request${networkData.requests.length !== 1 ? 's' : ''} captured`;
}

export function renderGcdGrid(container, gcd, template) {
  container.innerHTML = '';
  if (!gcd || !gcd.signals) {
    const placeholder = document.createElement('div');
    placeholder.className = 'consent-type';
    placeholder.style.cssText = 'grid-column:1/-1;color:#999;font-style:italic';
    placeholder.textContent = 'Not found in requests';
    container.appendChild(placeholder);
    return;
  }
  for (const signal of gcd.signals) {
    const fragment = template.content.cloneNode(true);
    const typeEl = fragment.querySelector('.consent-type');
    const valueEl = fragment.querySelector('.consent-value');
    typeEl.textContent = signal.type;
    valueEl.textContent = `${signal.code} — ${signal.label}`;
    if (signal.status === 'granted') valueEl.classList.add('consent-granted');
    else if (signal.status === 'denied') valueEl.classList.add('consent-denied');
    else valueEl.classList.add('consent-missing');
    container.appendChild(fragment);
  }
}

function formatRelativeTime(timestamp) {
  const diff = Math.round((Date.now() - timestamp) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function renderHistory(networkData, elements) {
  if (!networkData || !networkData.history || networkData.history.length === 0) {
    elements.historySection.classList.add('hidden');
    return;
  }

  elements.historySection.classList.remove('hidden');
  elements.historyTimeline.innerHTML = '';

  // Newest first
  const entries = [...networkData.history].reverse();
  for (const entry of entries) {
    const div = document.createElement('div');
    div.className = 'history-entry';

    const time = document.createElement('div');
    time.className = 'history-time';
    time.textContent = formatRelativeTime(entry.timestamp);

    const detail = document.createElement('div');
    detail.className = 'history-detail';

    if (entry.newGcs) {
      const span = document.createElement('span');
      const prev = entry.previousGcs?.raw || '—';
      span.className = entry.newGcs.ads === 'granted' && entry.newGcs.analytics === 'granted'
        ? 'history-change-granted' : 'history-change-denied';
      span.textContent = `GCS: ${prev} → ${entry.newGcs.raw}`;
      detail.appendChild(span);
    }
    if (entry.newGcd) {
      if (detail.childNodes.length) detail.appendChild(document.createElement('br'));
      const span = document.createElement('span');
      const prev = entry.previousGcd?.raw || '—';
      span.textContent = `GCD: ${prev} → ${entry.newGcd.raw}`;
      detail.appendChild(span);
    }

    div.appendChild(time);
    div.appendChild(detail);
    elements.historyTimeline.appendChild(div);
  }
}
