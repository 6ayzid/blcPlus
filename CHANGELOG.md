# blcPlus Extension - Detailed Changelog

## Overview
This document outlines all modifications made to the blcPlus extension during development. The extension underwent multiple iterations including Chrome compatibility testing, Firefox refinements, bug fixes, and branding updates.

---

## Changes Made

### 1. Chrome Compatibility Layer (Initial Conversion)
**Date:** May 3, 2026  
**Status:** Completed and Reverted

#### Description
Converted the extension from Firefox-specific WebExtensions API to Chrome MV3 (Manifest V3) with a fallback compatibility layer.

#### Files Modified
- **manifest.json**
  - Changed `background.scripts` to `service_worker` entry point
  - Changed `browser_action` to `action` (Chrome naming)
  - Removed Firefox-specific `browser_specific_settings` block
  - Added `minimum_chrome_version: "88"`
  - Restructured `web_accessible_resources` to MV3 format

- **background.js**
  - Wrapped all `browser.*` API calls with fallback: `const extensionApi = globalThis.browser ?? globalThis.chrome;`
  - Converted callback-based Chrome APIs to Promise-based for consistency

- **content.js**
  - Added API compatibility layer with `getStorage()` helper function
  - Falls back to Promise-wrapped Chrome `storage.local.get()` when Firefox API unavailable
  - Updated `browser.runtime.getURL()` to `extensionApi.runtime.getURL()`

- **popup.js**
  - Added dual storage helper functions: `getStorage()` and `setStorage()`
  - Both functions support Firefox Promise-based API and Chrome callback-based API
  - Ensured proper error handling via `extensionApi.runtime.lastError`

- **README.md**
  - Updated all branding from "Firefox extension" to "Chrome extension"
  - Changed installation instructions from `about:debugging` to `chrome://extensions`
  - Updated step descriptions for Chrome developer mode

#### Why Reverted
- Firefox strict MV2 requirements conflicted with Chrome MV3
- Decided to maintain Firefox as primary target due to existing user base

---

### 2. Fixed Redirect Loop Issue
**Date:** May 3, 2026  
**Status:** Completed and Retained

#### Description
The extension was entering an infinite redirect loop when users accessed `https://elearn.daffodilvarsity.edu.bd/?redirect=0`. This occurred because the redirect logic was too broad and caught both the plain homepage and the portal's own redirect parameter.

#### Files Modified
- **content.js**

#### Technical Changes
```javascript
// BEFORE (Line 49)
const currentUrl = window.location.href;
// ...
if (!isLoggedOut && (currentUrl === rootUrl || currentUrl === rootUrl + '?redirect=0')) {

// AFTER (Lines 49-86)
const currentUrl = new URL(window.location.href);
// ...
const isPlainRootPage = currentUrl.origin === 'https://elearn.daffodilvarsity.edu.bd' && 
                        currentUrl.pathname === '/' && 
                        currentUrl.search === '';

if (!isLoggedOut && isPlainRootPage) {
```

#### Impact
- The extension now only redirects from the plain homepage (no query parameters)
- Respects the portal's own `?redirect=0` parameter without interference
- Prevents infinite redirect loops while maintaining intended redirect functionality

#### Additional Change
- Updated login page detection to use `currentUrl.pathname.includes()` instead of string matching on full URL

---

### 3. Tagline/Branding Update
**Date:** May 3, 2026  
**Status:** Completed and Retained

#### Description
Changed the extension's marketing tagline from "Automated Portal Access" to "BLC, but actually good" for a more casual, user-friendly brand voice.

#### Files Modified
- **popup.html** (Line 429)
  ```html
  <!-- BEFORE -->
  <p class="subtitle">Automated Portal Access</p>
  
  <!-- AFTER -->
  <p class="subtitle">BLC, but actually good</p>
  ```

- **README.md** (Line 6)
  ```markdown
  <!-- BEFORE -->
  **The Ultimate Quality-of-Life Upgrade for the DIU BLC Portal.**
  
  <!-- AFTER -->
  **BLC, but actually good**
  ```

#### Impact
- More concise and memorable brand messaging
- Better reflects the extension's actual functionality
- Appears in both the popup UI and project documentation

---

### 4. Fixed Contact Me Button
**Date:** May 3, 2026  
**Status:** Completed and Retained

#### Description
The "Contact Me" button in the developer profile section was non-functional. It used an inline `window.open()` call with a `mailto:` protocol, which is unreliable in extension popup contexts.

#### Files Modified
- **popup.html** (Lines 235-250, 521)

#### Technical Changes
```html
<!-- BEFORE -->
<button class="btn-primary" onclick="window.open('mailto:8ayzid@gmail.com', '_blank')">
  Contact Me
</button>

<!-- AFTER -->
<a class="btn-primary" href="mailto:8ayzid@gmail.com">Contact Me</a>
```

#### CSS Updates
Updated `.btn-primary` class to support `<a>` elements:
```css
.btn-primary {
  display: block;           /* Added */
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background-color: var(--primary);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: transform 0.1s, background-color 0.2s;
  box-shadow: var(--shadow-md);
  text-decoration: none;    /* Added */
  text-align: center;       /* Added */
  box-sizing: border-box;   /* Added */
}
```

#### Impact
- Contact link now reliably opens the user's default mail client
- Proper semantic HTML with `<a>` tag instead of button with JavaScript
- Works consistently across Chrome and Firefox

---

### 5. Packaging and Distribution
**Date:** May 3-4, 2026  
**Status:** Completed

#### Description
Created distribution packages for both Firefox and Chrome compatibility testing.

#### Packages Created
1. **blcPlus-1.01.zip** (May 3, 2026)
   - Initial versioned archive
   - 31,605 bytes
   - Contains Chrome MV3 version

2. **blcPlus-firefox-20260504-001127.zip** (May 4, 2026)
   - Firefox MV2 compatible version
   - Timestamped naming convention
   - Unique identifier based on creation timestamp

3. **blcPlus-firefox-20260504-001127.xpi** (May 4, 2026)
   - Firefox XPI format (identical to .zip content)
   - Ready for Firefox installation or distribution
   - Same timestamp as corresponding .zip file

---

### 6. Firefox Compatibility Restoration
**Date:** May 4, 2026  
**Status:** Completed (Final)

#### Description
Converted the extension back from Chrome MV3 to Firefox MV2 after loading issues were encountered. This ensures full Firefox compatibility while maintaining a fallback layer for Chrome support.

#### Files Modified
- **manifest.json**

#### Technical Changes
```json
{
  "manifest_version": 2,  /* Changed from 3 */
  "name": "blcPlus",
  "version": "1.0",
  "icons": {
    "48": "icons/48x48.png",
    "128": "icons/128x128.png"
  },
  "description": "Fixes session timeouts and injects custom CSS on the university portal.",
  "permissions": [
    "storage",
    "alarms",
    "https://elearn.daffodilvarsity.edu.bd/*"  /* Moved from host_permissions */
  ],
  /* Removed host_permissions block */
  "background": {
    "scripts": ["background.js"]  /* Changed from service_worker */
  },
  "content_scripts": [ /* Unchanged */ ],
  "browser_action": {  /* Changed from action */
    "default_popup": "popup.html",
    "default_title": "blcPlus Settings",
    "default_icon": {
      "16": "icons/16x16.png",
      "32": "icons/32x32.png"
    }
  },
  "web_accessible_resources": [
    "icons/128x128.png"  /* Simplified from object format */
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "blcplus@6ayzid.github.io",
      "strict_min_version": "109.0",
      "data_collection_permissions": {
        "required": ["none"]
      }
    }
  }
}
```

#### Why This Version
- Firefox MV2 is more reliable for this extension's use case
- All core scripts maintain Chrome fallback via `globalThis.browser ?? globalThis.chrome`
- Simpler manifest structure without service worker complexity
- Tested and verified to load in Firefox dev mode

#### Impact
- Extension now reliably loads in Firefox
- Chrome support maintained through API compatibility layer
- Cleaner development workflow with fewer edge cases

---

## Summary of Key Features

### Auto-Login Functionality
- Monitors for `notloggedin` class or explicit login pages
- Automatically injects stored credentials
- Submits login form with human-like timing
- Fixed to avoid redirect loops

### Session Keep-Alive
- Background script pings server every 15 minutes
- Prevents automatic session timeouts
- Uses `no-cors` mode to avoid security restrictions

### Responsive Dashboard UI
- Material 3 design with light/dark mode support
- Smooth slide transitions between Settings and Profile views
- Secure local storage for credentials
- Toggle for enabling/disabling auto-login

### Developer Contact Integration
- Profile card with social links
- Functional mailto link for contact
- Professional presentation of developer information

---

## Technical Stack

- **Language:** JavaScript (ES6+)
- **Manifest Version:** 2 (Firefox primary, Chrome fallback)
- **Styling:** CSS3 with CSS Variables
- **Storage:** WebExtension Storage API
- **Target Sites:** https://elearn.daffodilvarsity.edu.bd/
- **Browsers:** Firefox 109+, Chrome 88+ (with fallback)

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | May 3, 2026 | Initial release, Firefox MV2 base |
| 1.01-chrome-test | May 3, 2026 | Chrome MV3 compatibility test (reverted) |
| 1.01-firefox-final | May 4, 2026 | Firefox MV2 with bug fixes and branding updates |

---

## Known Limitations

1. **Credentials Storage:** Stored in browser local storage without encryption (browser's native isolation provides security)
2. **Portal-Specific:** Only works with DIU's BLC portal domain
3. **Manual Session Timeout:** If session expires server-side, re-login required
4. **Chrome Support:** Currently Firefox primary; Chrome support via API fallback layer only

---

## Future Enhancements (Potential)

- [ ] Add version bumping to manifest on future releases
- [ ] Create GitHub Actions for automated packaging
- [ ] Add settings UI for customizing keep-alive interval
- [ ] Support for multiple portal URLs
- [ ] Encrypted credential storage option
- [ ] User activity logging for debugging
- [ ] Chrome Web Store publication

---

## Testing Checklist

- [x] Firefox MV2 manifest validation
- [x] Content script loads and executes
- [x] Background script initializes alarms
- [x] Storage API works in popup
- [x] Auto-login flow tested
- [x] Redirect logic prevents loops
- [x] Contact button opens mail client
- [x] UI responsive on popup size
- [x] Dark mode styling applies correctly

---

## Files in This Release

```
blcPlus/
├── manifest.json          # Firefox MV2 configuration
├── background.js          # Keep-alive service (alarm-driven)
├── content.js            # Auto-login & redirect logic
├── popup.html            # Settings & profile dashboard UI
├── popup.js              # Popup interaction handlers
├── styles.css            # Portal-specific custom styling
├── icons/
│   ├── 16x16.png        # Browser action icon (small)
│   ├── 32x32.png        # Browser action icon (medium)
│   ├── 48x48.png        # Extension listing icon
│   └── 128x128.png      # Extension branding
├── README.md            # User documentation
└── CHANGELOG.md         # This file
```

---

**Last Updated:** May 4, 2026  
**Current Release:** blcPlus-firefox-20260504-001127 (v1.01)
