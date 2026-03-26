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
    container.innerHTML = '<div class="consent-type" style="grid-column:1/-1;color:#999;font-style:italic">Not set</div>';
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
