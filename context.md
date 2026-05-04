# Project Context: blcPlus Moodle Reskin

## Overview
We are building a Chrome extension (`blcPlus`) to completely reskin a heavy, outdated Moodle LMS dashboard (referred to as the "Vanilla" site) into a clean, modern, and lightweight frontend (the "Decent" design).

## The Strict Rules of Engagement ("Hide, Scrape, & Clone")
1. **No Server-Side Edits:** We operate entirely on the client side via the Chrome extension.
2. **Preserve the Original DOM:** We cannot delete or overwrite original DOM elements using `innerHTML` on the body, because the site heavily relies on them for event listeners, state, and form submissions.
3. **The Strategy:** 
   - **Hide** the original elements using `display: none !important;`
   - **Scrape** their data (text, images, links) via JavaScript.
   - **Clone/Create** our new beautiful "Decent" UI elements based on the scraped data.
   - **Inject** the new elements into the DOM.
   - **Route Interactions:** Redirect clicks on our new elements to the original hidden elements using `.click()` or location redirects.
4. **Incremental Approach:** We execute this one small, deliberate step at a time to prevent breaking the brittle Moodle architecture.

## Current Progress: Step 2 (The Navbar)
We have successfully completed Step 1 (CSS variables and base setup) and have just finished polishing Step 2: The Desktop and Mobile Navbars.

### Desktop Navbar Implementation
*   **Layout:** Wrapped in a `.decent-navbar-inner` container (`max-width: 1140px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 56px;`).
*   **Logo Visibility:** Wrapped the Moodle logo in a white pill (`.logo-bg`) to prevent it from washing out against the dark navy background of the navbar.
*   **Scroll Behavior:** Slides up (`translateY(-100%)`) out of view when scrolling down (threshold 80px), and slides back down when scrolling up. Uses a snappy `0.25s ease` transition to match the Decent design reference.
*   **Positioning Fix:** Changed from `position: sticky` to `position: fixed`. Moodle's root containers often restrict `sticky` positioning, causing the navbar to stay at the top of the *document* rather than the *viewport*. `position: fixed` ensures it works reliably.
*   **Hover-to-Unhide:** Added a `mousemove` listener. If the navbar is hidden and the user moves their cursor to the top edge of the window (`<= 25px`), the navbar instantly slides back down.

### Mobile Bottom Navbar Implementation
*   **Layout:** Uses `position: fixed; bottom: 0; left: 0; right: 0;` with a protective `body { padding-bottom: 64px !important; }` rule to prevent it from covering page content.
*   **Styling:** Matches the exact Decent design specs (`flex-direction: column`, `gap: 3px`, `font-size: 0.65rem`, icon size `22x22`).
*   **Content limits:** Strictly limited to three evenly spaced items: **Home, Courses, and Schedule**. (Tasks, Notices, and Profile were intentionally omitted).
*   **Scroll Behavior:** Slides down (`translateY(100%)`) to hide when scrolling down, and slides back up when scrolling up. Matches the 0.25s snappy transition of the top navbar.

### Injection Logic (`content.js`)
*   The desktop and mobile navbars are built using a template string populated with scraped data (e.g., Moodle logo, user initials/avatar, and active URL states).
*   The elements are dynamically prepended to `document.body` as soon as the DOM loads.
*   Scroll and mouse listeners are attached to manage the `nav-hidden` state across both navbars simultaneously.

## Next Steps
We are ready to move on from the Navbars to the next component in the UI (likely the dashboard layout, quick stats, or the course grid) following the exact same "Hide, Scrape, & Clone" philosophy.
