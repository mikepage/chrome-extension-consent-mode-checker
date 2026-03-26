// This function is serialized and injected into the active tab via
// chrome.scripting.executeScript({ func }). It must be entirely
// self-contained — no imports or references to outer scope.
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
    const src = script.src || '';
    if (src.includes('googletagmanager.com/gtag/js')) result.gtagPresent = true;
    if (src.includes('googletagmanager.com/gtm.js')) result.gtmPresent = true;
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

  for (const cmp of cmpDetectors) {
    try {
      if (cmp.test()) {
        result.cmp.detected = true;
        result.cmp.name = cmp.name;
        result.cmp.version = cmp.version();
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
        const params = entry[2];
        if (action === 'default') {
          result.consentMode.detected = true;
          result.consentMode.defaults = params;
        } else if (action === 'update') {
          result.consentMode.detected = true;
          result.consentMode.updates = params;
        }
        result.dataLayerEntries.push({ action, params });
      }
      // GTM dataLayer push style
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const event = entry.event || entry[0];
        if (event === 'consent_default' || event === 'gtm.consent_default') {
          result.consentMode.detected = true;
          result.consentMode.defaults = entry;
          result.dataLayerEntries.push({ action: 'default', params: entry });
        }
        if (event === 'consent_update' || event === 'gtm.consent_update') {
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
  if (window.google_tag_data?.ics?.entries) {
    result.consentMode.detected = true;
    const entries = window.google_tag_data.ics.entries;
    const defaults = {};
    const updates = {};
    const current = {};
    for (const [key, val] of Object.entries(entries)) {
      if (!CONSENT_TYPES.includes(key)) continue;
      if (val.default !== undefined) defaults[key] = val.default;
      if (val.update !== undefined) updates[key] = val.update;
      current[key] = val.update !== undefined ? val.update : val.default;
    }
    if (Object.keys(defaults).length && !result.consentMode.defaults) {
      result.consentMode.defaults = defaults;
    }
    if (Object.keys(updates).length && !result.consentMode.updates) {
      result.consentMode.updates = updates;
    }
    if (Object.keys(current).length) {
      result.consentMode.implementation = current;
    }
  }

  // --- Also check GTM internal consent model ---
  if (window.google_tag_manager) {
    for (const containerId of Object.keys(window.google_tag_manager)) {
      const container = window.google_tag_manager[containerId];
      if (!container?.dataLayer?.get) continue;
      try {
        const defaults = {};
        const current = {};
        for (const type of CONSENT_TYPES) {
          const defVal = container.dataLayer.get('consentModel.default.' + type);
          const curVal = container.dataLayer.get('consentModel.' + type);
          if (defVal !== undefined) defaults[type] = defVal;
          if (curVal !== undefined) current[type] = curVal;
          if (defVal !== undefined || curVal !== undefined) result.consentMode.detected = true;
        }
        if (Object.keys(defaults).length && !result.consentMode.defaults) {
          result.consentMode.defaults = defaults;
        }
        if (Object.keys(current).length && !result.consentMode.implementation) {
          result.consentMode.implementation = current;
        }
        // If current differs from defaults, there was an update
        if (!result.consentMode.updates) {
          const updates = {};
          for (const type of CONSENT_TYPES) {
            if (current[type] !== undefined && current[type] !== defaults[type]) {
              updates[type] = current[type];
            }
          }
          if (Object.keys(updates).length) result.consentMode.updates = updates;
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
    const requiredV2 = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'];
    for (const type of requiredV2) {
      if (!(type in defaults)) {
        result.issues.push(`Missing required consent type in defaults: ${type}`);
      }
    }
    const hasWaitForUpdate = defaults.wait_for_update
      || window.google_tag_data?.ics?.waitForUpdate;
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
