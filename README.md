# Consent Mode Checker

A lightweight Chrome extension that verifies Google Consent Mode v2 implementation on any web page. Built for developers and marketers who need to quickly check whether consent mode is correctly configured with their CMP.

## Why

Google requires Consent Mode v2 for advertising in the EEA. Verifying it usually means digging through browser console, inspecting `dataLayer` pushes, and checking `google_tag_data` internals. This extension does it in one click — open the popup and see the full consent state, detected CMP, and any issues.

## Features

- **Consent Mode v2 detection** — reads default consent, updates, and current state from `dataLayer`, `google_tag_data.ics`, and GTM internals
- **CMP detection** — identifies Cookiebot, OneTrust, CookieYes, Didomi, iubenda, Quantcast, TrustArc, Complianz, Cookie Information, Usercentrics, Civic Cookie Control, Osano, CookieFirst, Consentmanager, and any TCF API
- **Google Tag detection** — checks for gtag.js and Google Tag Manager
- **Validation** — flags missing default consent, missing required v2 types (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`), missing `wait_for_update`, and missing consent updates
- **No permissions abuse** — uses only `activeTab` and `scripting`, no background data collection

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
  service-worker.js          Service worker (clears cached scans)
  content/detector.js        Injected detector (self-contained)
  popup/popup.html|css|js    Popup UI
  utils/ui.js                Popup DOM helpers
```

## Privacy

This extension **does not collect, transmit, or store any user data** outside of your browser. Scan results are cached in `chrome.storage.session` (cleared on tab navigation) for popup performance only. There are no analytics, no tracking, no network requests, and no third-party dependencies.

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
| `storage` | Caches scan results in `chrome.storage.session` so the popup can display results without re-scanning when reopened. Data is session-scoped and cleared on tab navigation. No data is transmitted externally. |
| `activeTab` | Needed to access the current tab when the user opens the popup. The extension injects the detector script into the active tab to read consent mode state. Access is only granted for the tab the user explicitly interacts with. |
| `scripting` | Used to inject the detector content script (`content/detector.js`) into the active tab in the `MAIN` world to access page JavaScript globals (`dataLayer`, `google_tag_data`, `google_tag_manager`, CMP objects). The script only reads consent state — it does not modify any page content. |

## License

MIT
