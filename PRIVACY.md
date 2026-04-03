# Privacy Policy — Consent Mode Checker

**Last updated:** 2026-04-03

## Overview

Consent Mode Checker is a Chrome extension that verifies Google Consent Mode v2 implementation on web pages. It does not collect, transmit, or store any user data outside of your browser.

## Data collection

This extension collects **no personal data**. It does not track browsing activity, record page content, or send any information to external servers.

## Local storage

Scan results and network signal data are cached locally in `chrome.storage.session` for the sole purpose of displaying results in the extension popup without re-scanning. This data is session-scoped, cleared on tab navigation, and never transmitted externally.

## Network monitoring

The extension monitors requests to Google Analytics collect endpoints (`google-analytics.com`, `analytics.google.com`, `stats.g.doubleclick.net`) solely to extract `gcs` and `gcd` consent parameters from the URL. Only these URL parameters are read — no request bodies, response content, cookies, or headers are accessed. The extracted consent parameters are stored locally in session storage and cleared when you navigate away or close the tab.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Cache scan results and network signal data in session storage so the popup can display results without re-scanning when reopened. |
| `activeTab` | Access the current tab to inject the detector when you open the popup. Only the tab you interact with is accessed. |
| `scripting` | Inject the detector script into the active tab to read consent mode state from page JavaScript globals. The script only reads data — it does not modify any page content. |
| `webRequest` | Observe Google Analytics collect requests to extract `gcs` and `gcd` consent parameters from the URL. No request bodies or response content is accessed. |
| `host_permissions` | Scoped to Google Analytics and DoubleClick domains only. Required by the `webRequest` permission to monitor consent parameters in network requests. |

## Third parties

This extension has no third-party dependencies, no analytics, no advertising, and makes no network requests of its own.

## Contact

If you have questions about this privacy policy, open an issue at [github.com/mikepage/chrome-extension-consent-mode-checker](https://github.com/mikepage/chrome-extension-consent-mode-checker/issues).
