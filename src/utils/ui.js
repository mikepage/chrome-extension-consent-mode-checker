const CONSENT_TYPES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

function addConsentRow(container, template, type, value) {
  const frag = template.content.cloneNode(true);
  const typeEl = frag.querySelector('.consent-type');
  const valueEl = frag.querySelector('.consent-value');
  typeEl.textContent = type;

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

  container.appendChild(frag);
}

function renderConsentGrid(container, data, template) {
  container.innerHTML = '';
  if (!data) {
    container.innerHTML = '<div class="consent-type" style="grid-column:1/-1;color:#999;font-style:italic">Not set</div>';
    return;
  }
  for (const type of CONSENT_TYPES) {
    addConsentRow(container, template, type, data[type]);
  }
  // Show any extra keys not in CONSENT_TYPES
  for (const [key, value] of Object.entries(data)) {
    if (CONSENT_TYPES.includes(key) || key === 'event' || key === 'wait_for_update') continue;
    if (typeof value !== 'string') continue;
    addConsentRow(container, template, key, value);
  }
}

function addBadge(container, template, text, className) {
  const badge = template.content.firstElementChild.cloneNode(true);
  badge.textContent = text;
  badge.classList.add(className);
  container.appendChild(badge);
}

export function renderResults(result, elements) {
  const { consentRowTemplate, badgeTemplate, issueTemplate } = elements;

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
  elements.cmpInfo.innerHTML = '';
  if (result.cmp.detected) {
    const version = result.cmp.version ? ` v${result.cmp.version}` : '';
    addBadge(elements.cmpInfo, badgeTemplate, result.cmp.name + version, 'badge-green');
  } else {
    addBadge(elements.cmpInfo, badgeTemplate, 'Not detected', 'badge-red');
  }

  // --- Tag Info ---
  elements.tagInfo.innerHTML = '';
  if (result.gtagPresent) addBadge(elements.tagInfo, badgeTemplate, 'gtag.js', 'badge-green');
  if (result.gtmPresent) addBadge(elements.tagInfo, badgeTemplate, 'GTM', 'badge-green');
  if (!result.gtagPresent && !result.gtmPresent) addBadge(elements.tagInfo, badgeTemplate, 'None found', 'badge-red');

  // --- Consent Defaults ---
  renderConsentGrid(elements.consentDefaults, result.consentMode.defaults, consentRowTemplate);

  // --- Consent Updates ---
  if (result.consentMode.updates) {
    elements.updatesSection.classList.remove('hidden');
    renderConsentGrid(elements.consentUpdates, result.consentMode.updates, consentRowTemplate);
  } else {
    elements.updatesSection.classList.add('hidden');
  }

  // --- Current State ---
  if (result.consentMode.implementation) {
    elements.stateSection.classList.remove('hidden');
    renderConsentGrid(elements.consentState, result.consentMode.implementation, consentRowTemplate);
  } else {
    elements.stateSection.classList.add('hidden');
  }

  // --- Issues ---
  if (result.issues.length) {
    elements.issuesSection.classList.remove('hidden');
    elements.issuesList.innerHTML = '';
    for (const issue of result.issues) {
      const item = issueTemplate.content.firstElementChild.cloneNode(true);
      item.textContent = issue;
      elements.issuesList.appendChild(item);
    }
  } else {
    elements.issuesSection.classList.add('hidden');
  }
}
