# Consent Mode Checker

A lightweight Chrome extension that verifies Google Consent Mode v2 implementation on any web page. Built for developers and marketers who need to quickly check whether consent mode is correctly configured with their CMP.

## Why

Google requires Consent Mode v2 for advertising in the EEA. Verifying it usually means digging through browser console, inspecting `dataLayer` pushes, checking `google_tag_data` internals, and filtering network requests for `gcs`/`gcd` parameters. This extension does it in one click — open the popup and see the full consent state, network signals, detected CMP, and any issues.

## Features

- **Consent Mode v2 detection** — reads default consent, updates, and current state from `dataLayer`, `google_tag_data.ics`, and GTM internals
- **GCS/GCD network monitoring** — intercepts Google Analytics collect requests in real time and decodes the `gcs` (G100/G101/G110/G111) and `gcd` consent parameters with human-readable explanations
- **GCD calculator** — paste or edit any GCD string to decode the consent signal for each type (ad_storage, analytics_storage, ad_user_data, ad_personalization)
- **Consent history** — tracks GCS/GCD changes over time so you can see how consent state evolves as users interact with the cookie banner
- **CMP detection** — identifies Cookiebot, OneTrust, CookieYes, Didomi, iubenda, Quantcast, TrustArc, Complianz, Cookie Information, Usercentrics, Civic Cookie Control, Osano, CookieFirst, Consentmanager, and any TCF API
- **Google Tag detection** — checks for gtag.js and Google Tag Manager
- **Validation** — flags missing default consent, missing required v2 types (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`), missing `wait_for_update`, and missing consent updates
- **Zero dependencies** — no third-party libraries, no analytics, no tracking

## Usage

1. Navigate to the page you want to check
2. Click the extension icon in the toolbar
3. The popup scans the page and shows results immediately
4. Click **Rescan** to re-check after interacting with the cookie banner

| Section | What it shows |
|---|---|
| Status banner | Overall pass/warn/fail |
| CMP Platform | Detected consent management platform |
| Google Tags | gtag.js and/or GTM presence |
| Consent Defaults | Default consent state set before tags fire |
| Consent Updates | Consent state after user interaction |
| Current State | Live consent state from Google tag internals |
| Network Signals | Real-time GCS and GCD parameters from Google collect requests |
| GCD Calculator | Decode any GCD string into per-type consent signals |
| Consent History | Timeline of GCS/GCD changes on the current page |
| Issues | Validation warnings and errors |

## Install from source

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the repo root

## Project structure

```
manifest.json
images/
src/
  service-worker.js          Service worker (network monitoring, cache cleanup)
  content/detector.js        Injected detector (self-contained)
  popup/popup.html|css|js    Popup UI
  utils/ui.js                Popup DOM helpers
  utils/gcd-decoder.js       GCS/GCD decoding logic
```

## Privacy

This extension **does not collect, transmit, or store any user data** outside of your browser. Scan results and captured network signals are cached in `chrome.storage.session` (cleared on tab navigation) for popup performance only. Network monitoring is limited to Google Analytics collect endpoints to extract consent parameters — no request content or browsing data is recorded. There are no analytics, no tracking, and no third-party dependencies.

### Chrome Web Store privacy disclosures

| Question | Answer |
|---|---|
| Does the extension collect user data? | No |
| Does the extension transmit data to remote servers? | No |
| Does the extension use remote code? | No |
| Does the extension use third-party libraries? | No |
| Data usage categories | None |

### Permission justifications

| Permission | Justification |
|---|---|
| `storage` | Caches scan results and network signal data in `chrome.storage.session` so the popup can display results without re-scanning when reopened. Data is session-scoped and cleared on tab navigation. No data is transmitted externally. |
| `activeTab` | Needed to access the current tab when the user opens the popup. The extension injects the detector script into the active tab to read consent mode state. Access is only granted for the tab the user explicitly interacts with. |
| `scripting` | Used to inject the detector content script (`content/detector.js`) into the active tab in the `MAIN` world to access page JavaScript globals (`dataLayer`, `google_tag_data`, `google_tag_manager`, CMP objects). The script only reads consent state — it does not modify any page content. |
| `webRequest` | Monitors Google Analytics collect requests (`google-analytics.com`, `region1.google-analytics.com`, `analytics.google.com`, `stats.g.doubleclick.net`) to extract `gcs` and `gcd` consent parameters. Only URL parameters are read — no request bodies or response content is accessed. |
| `host_permissions` | Scoped to Google Analytics and DoubleClick domains only. Required by `webRequest` to observe consent parameters in Google tag network requests. No other domains are accessed. |

## License

MIT
