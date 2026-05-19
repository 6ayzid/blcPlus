# blcPlus Change Log

## 2026-05-19 - Navigation, Redirects, Enrolment Flow, and Skeleton Loaders

### Route and Login Flow Fixes
- Retired the broken `https://elearn.daffodilvarsity.edu.bd/?redirect=0` route inside the content script.
- Added an early guard that hides the broken route and redirects users into a valid login/dashboard flow before Decent UI injection starts.
- Fixed the loop where `/my/` could bounce back to `/?redirect=0` by redirecting the retired route to the Moodle login flow instead of directly to dashboard.
- Added detection for Moodle's `login/index.php` "already logged in" confirmation screen.
- Redirects the "already logged in" confirmation screen to the intended BLC page, falling back to dashboard only when there is no safe return URL.
- Added safe BLC URL validation before following a `wantsurl` or pending enrolment return URL.

### Mobile Navigation Redesign
- Added `blc-mobile-shell` detection based on touch/pointer behavior and viewport width so large phone screenshots do not receive desktop navigation styling.
- Reworked the top mobile navbar into a floating rounded capsule with matching translucent dark background, border, blur, and shadow.
- Reworked the bottom mobile navbar to match the top bar style.
- Reduced bottom navbar proportions on mobile: smaller height, smaller icons/text, tighter spacing, and more rounded controls.
- Added page padding for fixed top and bottom navbars so Moodle content is not clipped underneath them.
- Replaced the broken large fallback logo text with a proper `blcPlus` brand mark and label.
- Hid desktop nav links in mobile/touch shell mode.

### Enrolment Page Improvements
- Added detection for logged-out course enrolment pages such as `/enrol/index.php?id=36636`.
- Redirects logged-out enrolment pages to `/login/index.php?wantsurl=<original enrolment URL>` so users return to the exact course after login.
- Stores the pending enrolment URL in `sessionStorage` as a fallback for Moodle login confirmation states.
- On logged-in enrolment pages, moves Moodle's real `Enrol me` submit button next to the `Enrolment key` input.
- Preserves Moodle's original form, input, hidden fields, and submit behavior while improving the layout.
- Added desktop and mobile styling for the enhanced enrolment key/action row.

### Skeleton Loader System
- Replaced the extension's blank loading hide state with a Decent-style full-page skeleton loader.
- Replaced RemUI's `siteloader.svg` page loader visually with a skeleton screen.
- Replaced RemUI `siteinnerloader` images with inline skeleton pills.
- Added a `MutationObserver` that converts dynamically inserted RemUI loader images into skeleton placeholders.
- Styled Moodle `.spinner-border`, `.loading-icon`, and common `data-region` loading placeholder areas with shimmer skeletons.
- Kept Moodle's original loading lifecycle intact; only the visual spinner treatment is replaced.

### Verification
- Ran `node --check content.js`.
- Ran `node --check popup.js` during navbar work.
- Ran `git diff --check`.

