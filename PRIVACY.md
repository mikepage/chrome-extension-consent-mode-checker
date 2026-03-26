# Privacy Policy — Consent Mode Checker

**Last updated:** 2026-03-26

## Overview

Consent Mode Checker is a Chrome extension that verifies Google Consent Mode v2 implementation on web pages. It does not collect, transmit, or store any user data outside of your browser.

## Data collection

This extension collects **no personal data**. It does not track browsing activity, record page content, or send any information to external servers.

## Local storage

Scan results are cached locally in `chrome.storage.session` for the sole purpose of displaying results in the extension popup without re-scanning. This data is session-scoped, cleared on tab navigation, and never transmitted externally.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Cache scan results in session storage so the popup can display results without re-scanning when reopened. |
| `activeTab` | Access the current tab to inject the detector when you open the popup. Only the tab you interact with is accessed. |
| `scripting` | Inject the detector script into the active tab to read consent mode state from page JavaScript globals. The script only reads data — it does not modify any page content. |

## Third parties

This extension has no third-party dependencies, no analytics, no advertising, and makes no network requests.

## Contact

If you have questions about this privacy policy, open an issue at [github.com/mikepage/chrome-extension-consent-mode-checker](https://github.com/mikepage/chrome-extension-consent-mode-checker/issues).
