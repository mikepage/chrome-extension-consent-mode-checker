const CONSENT_TYPES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

function renderConsentGrid(container, data) {
  container.replaceChildren();
  if (!data) {
    const placeholder = document.createElement('div');
    placeholder.className = 'consent-type';
    placeholder.style.cssText = 'grid-column:1/-1;color:#999;font-style:italic';
    placeholder.textContent = 'Not set';
    container.appendChild(placeholder);
    return;
  }
  for (const type of CONSENT_TYPES) {
    const value = data[type];

    const typeEl = document.createElement('div');
    typeEl.className = 'consent-type';
    typeEl.textContent = type;

    const valueEl = document.createElement('div');
    valueEl.className = 'consent-value';

    if (value === 'granted') {
      valueEl.textContent = 'granted';
      valueEl.classList.add('consent-granted');
    } else if (value === 'denied') {
      valueEl.textContent = 'denied';
      valueEl.classList.add('consent-denied');
    } else if (value !== undefined) {
      valueEl.textContent = String(value);
    } else {
      valueEl.textContent = 'not set';
      valueEl.classList.add('consent-missing');
    }

    container.appendChild(typeEl);
    container.appendChild(valueEl);
  }

  // Show any extra keys not in CONSENT_TYPES
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (CONSENT_TYPES.includes(key) || key === 'event' || key === 'wait_for_update') continue;
      if (typeof value !== 'string') continue;
      const typeEl = document.createElement('div');
      typeEl.className = 'consent-type';
      typeEl.textContent = key;
      const valueEl = document.createElement('div');
      valueEl.className = 'consent-value';
      valueEl.textContent = value;
      if (value === 'granted') valueEl.classList.add('consent-granted');
      if (value === 'denied') valueEl.classList.add('consent-denied');
      container.appendChild(typeEl);
      container.appendChild(valueEl);
    }
  }
}

function makeBadge(text, className) {
  const span = document.createElement('span');
  span.className = `badge ${className}`;
  span.textContent = text;
  return span;
}

export function renderResults(result, elements) {
  // --- Status Banner ---
  const hasConsentMode = result.consentMode.detected;
  const hasCmp = result.cmp.detected;
  const hasDefaults = !!result.consentMode.defaults;
  const issueCount = result.issues.length;

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
  elements.cmpInfo.replaceChildren();
  if (result.cmp.detected) {
    const version = result.cmp.version ? ` v${result.cmp.version}` : '';
    elements.cmpInfo.appendChild(makeBadge(result.cmp.name + version, 'badge-green'));
  } else {
    elements.cmpInfo.appendChild(makeBadge('Not detected', 'badge-red'));
  }

  // --- Tag Info ---
  elements.tagInfo.replaceChildren();
  if (result.gtagPresent) elements.tagInfo.appendChild(makeBadge('gtag.js', 'badge-green'));
  if (result.gtmPresent) elements.tagInfo.appendChild(makeBadge('GTM', 'badge-green'));
  if (!result.gtagPresent && !result.gtmPresent) elements.tagInfo.appendChild(makeBadge('None found', 'badge-red'));

  // --- Consent Defaults ---
  renderConsentGrid(elements.consentDefaults, result.consentMode.defaults);

  // --- Consent Updates ---
  if (result.consentMode.updates) {
    elements.updatesSection.classList.remove('hidden');
    renderConsentGrid(elements.consentUpdates, result.consentMode.updates);
  } else {
    elements.updatesSection.classList.add('hidden');
  }

  // --- Current State ---
  if (result.consentMode.implementation) {
    elements.stateSection.classList.remove('hidden');
    renderConsentGrid(elements.consentState, result.consentMode.implementation);
  } else {
    elements.stateSection.classList.add('hidden');
  }

  // --- Issues ---
  if (result.issues.length) {
    elements.issuesSection.classList.remove('hidden');
    elements.issuesList.replaceChildren();
    for (const issue of result.issues) {
      const item = document.createElement('div');
      item.className = 'issue-item';
      item.textContent = issue;
      elements.issuesList.appendChild(item);
    }
  } else {
    elements.issuesSection.classList.add('hidden');
  }
}
