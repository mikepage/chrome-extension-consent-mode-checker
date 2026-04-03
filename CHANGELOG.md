# Changelog

## 1.1.0

### Added

- **GCS/GCD network monitoring** — intercepts Google Analytics collect requests in real time and decodes `gcs` (G100/G101/G110/G111) and `gcd` consent parameters with human-readable explanations
- **GCD calculator** — paste or edit any GCD string to decode consent signals for ad_storage, analytics_storage, ad_user_data, and ad_personalization
- **Consent history** — tracks GCS/GCD changes over time as users interact with cookie banners, shown as a color-coded timeline
- **Collapsible sections** — Network Signals, GCD Calculator, and Consent History sections can be expanded/collapsed
- **Real-time updates** — network signals and history update live while the popup is open
- **`webRequest` permission** — monitors Google Analytics endpoints to extract consent parameters from URL query strings
- **`host_permissions`** — scoped to Google Analytics and DoubleClick domains only

### Changed

- Service worker now handles network request monitoring alongside cache cleanup
- Popup loads and displays captured network data alongside scan results
- GCD calculator auto-fills with the latest captured GCD value from network requests

## 1.0.0

- Initial release
- Consent Mode v2 detection from dataLayer, google_tag_data.ics, and GTM internals
- CMP detection for 15 platforms (Cookiebot, OneTrust, CookieYes, Didomi, iubenda, Quantcast, TrustArc, Complianz, Cookie Information, Usercentrics, Civic Cookie Control, Osano, CookieFirst, Consentmanager, TCF API)
- Google Tag detection (gtag.js and GTM)
- Validation with 8 rules (missing defaults, missing required types, missing wait_for_update, no CMP, no tags, no updates)
- Session-scoped caching with automatic cleanup on navigation
