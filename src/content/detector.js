// This function is serialized and injected into the active tab via
// chrome.scripting.executeScript({ func }). It must be entirely
// self-contained — no imports or references to outer scope.
// The export is only used by popup.js to import the reference;
// Chrome strips the module wrapper when injecting via executeScript.
export function detectConsentMode() {
  const result = {
    consentMode: { detected: false, defaults: null, updates: null, implementation: null },
    cmp: { detected: false, name: null, version: null },
    gtagPresent: false,
    gtmPresent: false,
    dataLayerEntries: [],
    issues: [],
    timestamp: Date.now(),
  };

  const CONSENT_TYPES = [
    'ad_storage',
    'ad_user_data',
    'ad_personalization',
    'analytics_storage',
    'functionality_storage',
    'personalization_storage',
    'security_storage',
  ];

  // --- Detect Google Tag (gtag.js / GTM) ---
  const scripts = document.querySelectorAll('script[src]');
  for (const script of scripts) {
    const scriptSource = script.src || '';
    if (scriptSource.includes('googletagmanager.com/gtag/js')) result.gtagPresent = true;
    if (scriptSource.includes('googletagmanager.com/gtm.js')) result.gtmPresent = true;
  }

  // --- Detect CMP ---
  const cmpDetectors = [
    {
      name: 'Cookiebot',
      test: () => typeof window.Cookiebot !== 'undefined' || !!document.querySelector('script[src*="cookiebot.com"]'),
      version: () => window.Cookiebot?.version || null,
    },
    {
      name: 'OneTrust',
      test: () => typeof window.OneTrust !== 'undefined' || !!document.querySelector('script[src*="onetrust.com"]') || !!document.getElementById('onetrust-consent-sdk'),
      version: () => window.OneTrust?.version || null,
    },
    {
      name: 'CookieYes',
      test: () => typeof window.cookieyes !== 'undefined' || !!document.querySelector('script[src*="cookieyes.com"]'),
      version: () => null,
    },
    {
      name: 'Didomi',
      test: () => typeof window.Didomi !== 'undefined' || !!document.querySelector('script[src*="didomi"]'),
      version: () => window.Didomi?.version || null,
    },
    {
      name: 'iubenda',
      test: () => typeof window._iub !== 'undefined' || !!document.querySelector('script[src*="iubenda.com"]'),
      version: () => null,
    },
    {
      name: 'Quantcast',
      test: () => typeof window.__tcfapi !== 'undefined' && !!document.querySelector('script[src*="quantcast"]'),
      version: () => null,
    },
    {
      name: 'TrustArc',
      test: () => typeof window.truste !== 'undefined' || !!document.querySelector('script[src*="trustarc.com"]'),
      version: () => null,
    },
    {
      name: 'Complianz',
      test: () => typeof window.complianz !== 'undefined' || !!document.querySelector('script[src*="complianz"]'),
      version: () => null,
    },
    {
      name: 'Cookie Information',
      test: () => !!document.querySelector('script[src*="cookieinformation.com"]'),
      version: () => null,
    },
    {
      name: 'Usercentrics',
      test: () => typeof window.UC_UI !== 'undefined' || !!document.querySelector('script[src*="usercentrics"]'),
      version: () => window.UC_UI?.version || null,
    },
    {
      name: 'Civic Cookie Control',
      test: () => typeof window.CookieControl !== 'undefined',
      version: () => window.CookieControl?.version || null,
    },
    {
      name: 'Osano',
      test: () => typeof window.Osano !== 'undefined' || !!document.querySelector('script[src*="osano.com"]'),
      version: () => null,
    },
    {
      name: 'CookieFirst',
      test: () => typeof window.CookieFirst !== 'undefined' || !!document.querySelector('script[src*="cookiefirst.com"]'),
      version: () => null,
    },
    {
      name: 'Consentmanager',
      test: () => typeof window.__cmp !== 'undefined' && !!document.querySelector('script[src*="consentmanager"]'),
      version: () => null,
    },
  ];

  for (const detector of cmpDetectors) {
    try {
      if (detector.test()) {
        result.cmp.detected = true;
        result.cmp.name = detector.name;
        result.cmp.version = detector.version();
        break;
      }
    } catch (_) {
      // ignore errors from CMP detection
    }
  }

  // --- Check TCF API (IAB Transparency & Consent Framework) ---
  if (!result.cmp.detected && typeof window.__tcfapi !== 'undefined') {
    result.cmp.detected = true;
    result.cmp.name = 'Unknown (TCF API detected)';
  }

  // --- Scan dataLayer for consent entries ---
  if (Array.isArray(window.dataLayer)) {
    for (const entry of window.dataLayer) {
      // gtag-style consent: [0] = 'consent', [1] = 'default'|'update', [2] = {…}
      if (Array.isArray(entry) && entry[0] === 'consent') {
        const action = entry[1]; // 'default' or 'update'
        const consentParams = entry[2];
        if (action === 'default') {
          result.consentMode.detected = true;
          result.consentMode.defaults = consentParams;
        } else if (action === 'update') {
          result.consentMode.detected = true;
          result.consentMode.updates = consentParams;
        }
        result.dataLayerEntries.push({ action, params: consentParams });
      }
      // GTM dataLayer push style
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const eventName = entry.event || entry[0];
        if (eventName === 'consent_default' || eventName === 'gtm.consent_default') {
          result.consentMode.detected = true;
          result.consentMode.defaults = entry;
          result.dataLayerEntries.push({ action: 'default', params: entry });
        }
        if (eventName === 'consent_update' || eventName === 'gtm.consent_update') {
          result.consentMode.detected = true;
          result.consentMode.updates = entry;
          result.dataLayerEntries.push({ action: 'update', params: entry });
        }
      }
    }
  }

  // --- Check window.google_tag_data for consent state (set by gtag.js) ---
  // gtag.js consumes dataLayer entries, so defaults/updates may no longer be
  // in the dataLayer array. Extract them from the internal consent state.
  // Internally gtag stores booleans; map to 'granted'/'denied' strings.
  function toConsentString(value) {
    if (value === true || value === 'granted') return 'granted';
    if (value === false || value === 'denied') return 'denied';
    return value;
  }

  if (window.google_tag_data?.ics?.entries) {
    result.consentMode.detected = true;
    const icsEntries = window.google_tag_data.ics.entries;
    const defaultConsent = {};
    const updatedConsent = {};
    const currentConsent = {};
    for (const [consentType, consentEntry] of Object.entries(icsEntries)) {
      if (!CONSENT_TYPES.includes(consentType)) continue;
      if (consentEntry.default !== undefined) defaultConsent[consentType] = toConsentString(consentEntry.default);
      if (consentEntry.update !== undefined) updatedConsent[consentType] = toConsentString(consentEntry.update);
      currentConsent[consentType] = toConsentString(consentEntry.update !== undefined ? consentEntry.update : consentEntry.default);
    }
    if (Object.keys(defaultConsent).length && !result.consentMode.defaults) {
      result.consentMode.defaults = defaultConsent;
    }
    if (Object.keys(updatedConsent).length && !result.consentMode.updates) {
      result.consentMode.updates = updatedConsent;
    }
    if (Object.keys(currentConsent).length) {
      result.consentMode.implementation = currentConsent;
    }
  }

  // --- Also check GTM internal consent model ---
  if (window.google_tag_manager) {
    for (const containerId of Object.keys(window.google_tag_manager)) {
      const gtmContainer = window.google_tag_manager[containerId];
      if (!gtmContainer?.dataLayer?.get) continue;
      try {
        const defaultConsent = {};
        const currentConsent = {};
        for (const consentType of CONSENT_TYPES) {
          const defaultValue = gtmContainer.dataLayer.get('consentModel.default.' + consentType);
          const currentValue = gtmContainer.dataLayer.get('consentModel.' + consentType);
          if (defaultValue !== undefined) defaultConsent[consentType] = toConsentString(defaultValue);
          if (currentValue !== undefined) currentConsent[consentType] = toConsentString(currentValue);
          if (defaultValue !== undefined || currentValue !== undefined) result.consentMode.detected = true;
        }
        if (Object.keys(defaultConsent).length && !result.consentMode.defaults) {
          result.consentMode.defaults = defaultConsent;
        }
        if (Object.keys(currentConsent).length && !result.consentMode.implementation) {
          result.consentMode.implementation = currentConsent;
        }
        // If current differs from defaults, there was an update
        if (!result.consentMode.updates) {
          const updatedConsent = {};
          for (const consentType of CONSENT_TYPES) {
            if (currentConsent[consentType] !== undefined && currentConsent[consentType] !== defaultConsent[consentType]) {
              updatedConsent[consentType] = currentConsent[consentType];
            }
          }
          if (Object.keys(updatedConsent).length) result.consentMode.updates = updatedConsent;
        }
      } catch (_) {
        // ignore
      }
    }
  }

  // --- Determine implementation type ---
  if (result.consentMode.detected) {
    if (result.gtmPresent && result.gtagPresent) {
      result.consentMode.type = 'gtag + GTM';
    } else if (result.gtmPresent) {
      result.consentMode.type = 'GTM';
    } else if (result.gtagPresent) {
      result.consentMode.type = 'gtag.js';
    } else {
      result.consentMode.type = 'Unknown';
    }
  }

  // --- Validate implementation ---
  if (!result.consentMode.detected) {
    result.issues.push('No Google Consent Mode implementation detected');
  }
  if (result.consentMode.detected && !result.consentMode.defaults) {
    result.issues.push('No default consent state found — consent defaults should be set before Google tags fire');
  }
  if (result.consentMode.detected && result.consentMode.defaults) {
    const defaults = result.consentMode.defaults;
    const requiredConsentTypes = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'];
    for (const consentType of requiredConsentTypes) {
      if (!(consentType in defaults)) {
        result.issues.push(`Missing required consent type in defaults: ${consentType}`);
      }
    }
    // wait_for_update can be set globally in defaults, or per-type in ICS entries
    let hasWaitForUpdate = defaults.wait_for_update
      || window.google_tag_data?.ics?.waitForUpdate;
    if (!hasWaitForUpdate && window.google_tag_data?.ics?.entries) {
      for (const consentEntry of Object.values(window.google_tag_data.ics.entries)) {
        if (consentEntry.wait_for_update) { hasWaitForUpdate = true; break; }
      }
    }
    if (!hasWaitForUpdate) {
      result.issues.push('Missing wait_for_update in defaults — recommended to set (e.g. 500ms) so CMP can load before tags fire');
    }
  }
  if (!result.cmp.detected) {
    result.issues.push('No CMP (Consent Management Platform) detected');
  }
  if (!result.gtagPresent && !result.gtmPresent) {
    result.issues.push('No Google Tag (gtag.js) or Google Tag Manager found');
  }
  if (result.consentMode.detected && !result.consentMode.updates) {
    result.issues.push('No consent update found — user consent choices may not be applied');
  }

  return result;
}
