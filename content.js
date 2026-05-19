// content.js - Auto-login and redirect script for blcPlus
const extensionApi = globalThis.browser ?? globalThis.chrome;

function syncMobileShellClass() {
  const isTouchShell =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    window.matchMedia('(max-width: 900px)').matches;

  document.documentElement.classList.toggle('blc-mobile-shell', isTouchShell);
}

syncMobileShellClass();
window.addEventListener('resize', syncMobileShellClass, { passive: true });

function ensureBlcSkeletonLoader() {
  if (document.getElementById('blcSkeletonLoader')) return;

  const loader = document.createElement('div');
  loader.id = 'blcSkeletonLoader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML = `
    <div class="blc-skeleton-shell">
      <div class="blc-skeleton-topbar"></div>
      <div class="blc-skeleton-grid">
        <div class="blc-skeleton-main">
          <div class="blc-skeleton-line blc-skeleton-title"></div>
          <div class="blc-skeleton-line blc-skeleton-short"></div>
          <div class="blc-skeleton-card blc-skeleton-hero"></div>
          <div class="blc-skeleton-row">
            <div class="blc-skeleton-card"></div>
            <div class="blc-skeleton-card"></div>
          </div>
          <div class="blc-skeleton-card blc-skeleton-wide"></div>
        </div>
        <div class="blc-skeleton-side">
          <div class="blc-skeleton-card"></div>
          <div class="blc-skeleton-card"></div>
          <div class="blc-skeleton-card"></div>
        </div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(loader);
}

function replaceRemuiLoaderImages(root = document) {
  const selector = 'img[src*="/theme/remui/pix/siteloader.svg"], img[src*="/theme/remui/pix/siteinnerloader.svg"], img[src*="siteinnerloader"]';
  const images = [];

  if (root.nodeType === Node.ELEMENT_NODE && root.matches(selector)) {
    images.push(root);
  }

  root.querySelectorAll?.(selector).forEach((img) => images.push(img));

  images.forEach((img) => {
    if (img.dataset.blcSkeletonApplied === 'true') return;

    const skeleton = document.createElement('span');
    skeleton.className = 'blc-inline-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    img.dataset.blcSkeletonApplied = 'true';
    img.replaceWith(skeleton);
  });
}

function startSkeletonLoaderWatcher() {
  replaceRemuiLoaderImages();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        replaceRemuiLoaderImages(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function getStorage(keys) {
  if (globalThis.browser?.storage?.local?.get) {
    return globalThis.browser.storage.local.get(keys);
  }

  return new Promise((resolve, reject) => {
    extensionApi.storage.local.get(keys, (result) => {
      const error = extensionApi.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result);
    });
  });
}

const currentUrl = new URL(window.location.href);
const loginUrlPath = 'login/index.php';
const rootUrl = 'https://elearn.daffodilvarsity.edu.bd/';
const dashboardUrl = 'https://elearn.daffodilvarsity.edu.bd/my/';
const targetLogoSelector = 'img.navbar-brand-logo, .navbar-brand img, img.logo';
const extensionLogoUrl = extensionApi.runtime.getURL('icons/128x128.png');
const isCourseEnrolPage =
  currentUrl.origin === 'https://elearn.daffodilvarsity.edu.bd' &&
  currentUrl.pathname === '/enrol/index.php' &&
  currentUrl.searchParams.has('id');
const isRetiredRootRedirectPage =
  currentUrl.origin === 'https://elearn.daffodilvarsity.edu.bd' &&
  currentUrl.pathname === '/' &&
  currentUrl.searchParams.get('redirect') === '0';

function getLoginUrlWithReturn(returnUrl = window.location.href) {
  const loginUrl = new URL(`https://elearn.daffodilvarsity.edu.bd/${loginUrlPath}`);
  loginUrl.searchParams.set('wantsurl', returnUrl);
  return loginUrl.href;
}

function getSafeBLCUrl(value) {
  try {
    const url = new URL(value, rootUrl);
    return url.origin === 'https://elearn.daffodilvarsity.edu.bd' ? url.href : null;
  } catch {
    return null;
  }
}

function isAlreadyLoggedInLoginPrompt() {
  if (!currentUrl.pathname.includes(loginUrlPath) || !document.body) return false;

  const pageText = (document.body.textContent || "").toLowerCase();
  return pageText.includes("you are already logged in as") &&
    pageText.includes("you need to log out before logging in as different user");
}

function redirectAwayFromAlreadyLoggedInPrompt() {
  if (!isAlreadyLoggedInLoginPrompt()) return false;

  const wantsUrl = currentUrl.searchParams.get('wantsurl');
  const pendingEnrolUrl = sessionStorage.getItem("blcPlus_pending_enrol_url");
  const returnUrl = getSafeBLCUrl(wantsUrl) || getSafeBLCUrl(pendingEnrolUrl) || dashboardUrl;

  sessionStorage.removeItem("blcPlus_login_attempted");
  sessionStorage.removeItem("blcPlus_pending_enrol_url");
  console.log("blcPlus: Already-logged-in login prompt detected. Redirecting to intended page...");
  window.location.replace(returnUrl);
  return true;
}

function redirectLoggedOutEnrolPageToLogin() {
  if (!isCourseEnrolPage || !document.body) return false;

  const loginInfo = document.querySelector('.logininfo');
  const isGuest = loginInfo &&
    (loginInfo.textContent.includes('guest access') || loginInfo.textContent.includes('not logged in'));
  const isLoggedOut = document.body.classList.contains('notloggedin') || isGuest;
  const hasEnrolPassword = Boolean(document.querySelector('input[name="enrolpassword"]'));

  if (!isLoggedOut || hasEnrolPassword) return false;

  sessionStorage.setItem("blcPlus_pending_enrol_url", window.location.href);
  sessionStorage.removeItem("blcPlus_login_attempted");
  console.log("blcPlus: Logged-out enrol page detected. Redirecting to login with course return URL...");
  window.location.replace(getLoginUrlWithReturn(window.location.href));
  return true;
}

function enhanceSelfEnrolForm() {
  if (!isCourseEnrolPage || !document.body) return;

  const form = document.querySelector('form[action*="/enrol/index.php"]');
  const enrolPassword = form?.querySelector('input[name="enrolpassword"]');
  const submitButton = form?.querySelector('#id_submitbutton, input[name="submitbutton"][type="submit"]');
  const passwordItem = enrolPassword?.closest('.fitem');
  const submitItem = submitButton?.closest('.fitem');
  const passwordElement = enrolPassword?.closest('.felement');

  if (!form || !enrolPassword || !submitButton || !passwordItem || !submitItem || !passwordElement) return;
  if (form.dataset.blcPlusEnrolEnhanced === 'true') return;

  const actionRow = document.createElement('div');
  actionRow.className = 'blc-enrol-action-row blc-decent-wrapper';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'blc-enrol-key-wrap';

  enrolPassword.parentNode.insertBefore(inputWrap, enrolPassword);
  inputWrap.appendChild(enrolPassword);
  actionRow.appendChild(inputWrap);
  actionRow.appendChild(submitButton);
  passwordElement.appendChild(actionRow);

  submitItem.classList.add('blc-enrol-submit-relocated');
  passwordItem.classList.add('blc-enrol-key-enhanced');
  form.classList.add('blc-enrol-form-enhanced');
  form.dataset.blcPlusEnrolEnhanced = 'true';
}

if (isRetiredRootRedirectPage) {
  document.documentElement.setAttribute('data-blc-loading', 'true');
  sessionStorage.removeItem("blcPlus_login_attempted");
  console.log("blcPlus: Retired root redirect page detected. Redirecting to login flow...");
  window.location.replace(`https://elearn.daffodilvarsity.edu.bd/${loginUrlPath}`);
}

// Initialize decent design wrapper immediately avoiding async delay if possible
let isDecentUIEnabled = true;
if (!isRetiredRootRedirectPage) {
  getStorage(["decentUI"]).then(result => {
    if (result.decentUI === false) {
      document.documentElement.setAttribute('data-theme-decent', 'false');
      isDecentUIEnabled = false;
    }
  });
}

// Immediately hide the raw Moodle DOM for Decent UI injection
if (!isRetiredRootRedirectPage) {
  ensureBlcSkeletonLoader();
  document.documentElement.setAttribute('data-blc-loading', 'true');
}

console.log("blcPlus: Content script initialized.");

// Utility to robustly wait for an element to appear in the DOM
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function replaceNavbarLogo() {
  const logos = document.querySelectorAll(targetLogoSelector);
  logos.forEach((logo) => {
    if (logo.dataset.blcPlusLogoApplied === 'true') return;
    logo.src = extensionLogoUrl;
    logo.srcset = extensionLogoUrl;
    
    // Also update any <source> siblings if the img is inside a <picture>
    if (logo.parentElement && logo.parentElement.tagName === 'PICTURE') {
      const sources = logo.parentElement.querySelectorAll('source');
      sources.forEach(source => {
        source.srcset = extensionLogoUrl;
      });
    }

    logo.dataset.blcPlusLogoApplied = 'true';
  });
}

function startNavbarLogoWatcher() {
  replaceNavbarLogo();

  const logoObserver = new MutationObserver(() => {
    replaceNavbarLogo();
  });

  logoObserver.observe(document.documentElement, { childList: true, subtree: true });
}

if (isRetiredRootRedirectPage) {
  console.log("blcPlus: Skipping Decent UI injection on retired redirect page.");
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (redirectAwayFromAlreadyLoggedInPrompt()) return;
    if (redirectLoggedOutEnrolPageToLogin()) return;

    startSkeletonLoaderWatcher();
    startNavbarLogoWatcher();
    buildDecentNavbar();
    enhanceSelfEnrolForm();
    document.documentElement.removeAttribute('data-blc-loading');
  }, { once: true });
} else {
  if (!redirectAwayFromAlreadyLoggedInPrompt() && !redirectLoggedOutEnrolPageToLogin()) {
    startSkeletonLoaderWatcher();
    startNavbarLogoWatcher();
    buildDecentNavbar();
    enhanceSelfEnrolForm();
    document.documentElement.removeAttribute('data-blc-loading');
  }
}

// 1. Root URL Redirect (If logged in, go to Dashboard)
setTimeout(() => {
  if (isRetiredRootRedirectPage) return;
  if (redirectAwayFromAlreadyLoggedInPrompt()) return;
  if (redirectLoggedOutEnrolPageToLogin()) return;

  const isLoggedOut = document.body.classList.contains('notloggedin');
  const isPlainRootPage = currentUrl.origin === 'https://elearn.daffodilvarsity.edu.bd' && currentUrl.pathname === '/' && currentUrl.search === '';

  if (!isLoggedOut && isPlainRootPage) {
    sessionStorage.removeItem("blcPlus_login_attempted");
    console.log("blcPlus: Logged in and on root URL. Redirecting to dashboard...");
    window.location.replace(dashboardUrl);
  }

  // Also clear the flag if we reach the dashboard successfully
  if (currentUrl.href.includes(dashboardUrl)) {
    sessionStorage.removeItem("blcPlus_login_attempted");
  }
}, 500);

// Retrieve stored settings
if (!isRetiredRootRedirectPage) {
  getStorage(["username", "password", "autoLogin"]).then(async (result) => {
  if (result.autoLogin !== true) {
    console.log("blcPlus: Auto-Login is disabled or settings not found.");
    return;
  }

  if (redirectAwayFromAlreadyLoggedInPrompt()) return;

  const isExplicitLoginPage = currentUrl.pathname.includes(loginUrlPath);
  const loginInfo = document.querySelector('.logininfo');
  const isGuest = loginInfo && (loginInfo.textContent.includes('guest access') || loginInfo.textContent.includes('not logged in'));
  const isLoggedOutClassPresent = document.body.classList.contains('notloggedin') || isGuest;

  // 2 & 3. Execute Auto-Login sequence
  // Trigger if we are on the explicit login URL OR if the body has the 'notloggedin' class (redundant method)
  if (isExplicitLoginPage || isLoggedOutClassPresent) {
    console.log("blcPlus: Login condition met. Waiting for input fields to render...");
    
    // Give the DOM a moment to render the fields (2.5 seconds max)
    const usernameInput = await waitForElement("#username", 2500);
    const passwordInput = await waitForElement("#password", 2500);

    if (usernameInput && passwordInput && result.username && result.password) {
      
      // Infinite loop prevention: check if we already tried to log in on this session
      if (sessionStorage.getItem("blcPlus_login_attempted") === "true") {
          console.warn("blcPlus: Auto-login halted. We already tried logging in recently (possible incorrect credentials).");
          return;
      }
      
      sessionStorage.setItem("blcPlus_login_attempted", "true");

      console.log("blcPlus: Fields found. Injecting credentials...");
      
      // Inject and trigger events, using native setter to bypass React/Vue input hijacking
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      
      usernameInput.focus();
      nativeInputValueSetter.call(usernameInput, result.username);
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      usernameInput.blur();
      
      passwordInput.focus();
      nativeInputValueSetter.call(passwordInput, result.password);
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      passwordInput.blur();

      console.log("blcPlus: Credentials injected. Submitting form...");
      
      const loginBtn = document.getElementById("loginbtn");
      if (loginBtn) {
          loginBtn.click();
      } else {
          const form = usernameInput.closest('form');
          if (form) form.submit();
      } 
      
    } else {
      console.log("blcPlus: Missing username/password fields on this page.");
      
      // If we couldn't find the fields, but we are logged out and NOT on the login page -> Redirect
      if (isLoggedOutClassPresent && !isExplicitLoginPage) {
        console.log("blcPlus: Redirecting to dedicated login page...");
        window.location.replace(isCourseEnrolPage ? getLoginUrlWithReturn(window.location.href) : `https://elearn.daffodilvarsity.edu.bd/${loginUrlPath}`);
      }
    }
  }

}).catch((error) => {
  console.error("blcPlus: Error accessing local storage:", error);
});
}

function buildDecentNavbar() {
  if (!isDecentUIEnabled) return;
  if (document.querySelector('.blc-decent-navbar')) return;

  const customLogoSrc = extensionApi.runtime.getURL('logo/128x128.png');

  const navHTML = `
  <nav class="navbar blc-decent-navbar blc-decent-wrapper" id="decentNavbar" aria-label="Main navigation">
    <div class="decent-navbar-inner">
      <div class="nav-left">
        <button class="logo" style="background:transparent;border:none;cursor:pointer;padding:0;outline:none;" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/my/'">
          <span class="logo-mark"><img src="${customLogoSrc}" alt="" aria-hidden="true"></span>
          <span class="logo-text">blcPlus</span>
        </button>
        <div class="nav-links" id="desktopNav">
          <button class="nav-link ${currentUrl.pathname.includes('/my/index.php') || currentUrl.pathname.endsWith('/my/') ? 'active' : ''}" data-view="dashboard" aria-current="page" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/my/'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </button>
          <button class="nav-link ${currentUrl.pathname.includes('courses.php') ? 'active' : ''}" data-view="courses" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/my/courses.php'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Courses
          </button>
          <button class="nav-link ${currentUrl.pathname.includes('calendar/view.php') ? 'active' : ''}" data-view="schedule" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/calendar/view.php?view=upcoming'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Schedule
          </button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="nav-link" data-view="profile" style="padding:6px; background:transparent; border:none; outline:none;" id="decentUserMenuBtn">
          <div class="avatar" id="navAvatar" title="Profile">?</div>
        </button>
      </div>
    </div>
  </nav>

  <div class="mobile-nav blc-decent-wrapper" id="decentMobileNav">
    <div class="mobile-nav-inner">
      <button class="mobile-nav-link ${currentUrl.pathname.includes('/my/index.php') || currentUrl.pathname.endsWith('/my/') ? 'active' : ''}" data-view="dashboard" aria-label="Dashboard" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/my/'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Home
      </button>
      <button class="mobile-nav-link ${currentUrl.pathname.includes('courses.php') ? 'active' : ''}" data-view="courses" aria-label="Courses" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/my/courses.php'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        Courses
      </button>
      <button class="mobile-nav-link ${currentUrl.pathname.includes('calendar/view.php') ? 'active' : ''}" data-view="schedule" aria-label="Schedule" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/calendar/view.php?view=upcoming'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Schedule
      </button>
    </div>
  </div>
  `;

  const profileLink = document.querySelector('.logininfo a[title="View profile"]');
  const userBox = document.querySelector('.userbutton .userpicture');
  
  const userName = profileLink ? profileLink.textContent.trim() : "";
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "?";
  
  let avatarHTML = userInitials;
  if (userBox && userBox.src) {
    avatarHTML = `<img src="${userBox.src}" alt="${userName}" />`;
  }

  const navContainer = document.createElement('div');
  navContainer.innerHTML = navHTML;
  const navElement = navContainer.firstElementChild;

  const avatarEl = navContainer.querySelector('#navAvatar');
  if (avatarEl) {
    avatarEl.innerHTML = avatarHTML;
    avatarEl.title = userName || "Profile";
  }
  
  const decentMenuBtn = navContainer.querySelector('#decentUserMenuBtn');
  const dropdownToggleHandler = (e) => {
     e.preventDefault();
     window.location.href = 'https://elearn.daffodilvarsity.edu.bd/user/profile.php';
  };

  if (decentMenuBtn) {
    decentMenuBtn.addEventListener('click', dropdownToggleHandler);
  }

  if (document.body) {
    // Prepend the new nodes to the body.
    Array.from(navContainer.children).forEach(child => document.body.prepend(child));
  }

  // Scroll visibility logic
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('decentNavbar');
    const mobileNav = document.getElementById('decentMobileNav');
    
    if (window.scrollY > lastScrollY && window.scrollY > 60) {
      if (navbar) navbar.classList.add('nav-hidden');
      if (mobileNav) mobileNav.classList.add('nav-hidden');
    } else {
      if (navbar) navbar.classList.remove('nav-hidden');
      if (mobileNav) mobileNav.classList.remove('nav-hidden');
    }
    lastScrollY = window.scrollY;
  }, { passive: true });

  // Desktop: reveal top navbar when mouse moves near the top edge
  document.addEventListener('mousemove', (e) => {
    if (e.clientY <= 25) {
      const navbar = document.getElementById('decentNavbar');
      if (navbar) navbar.classList.remove('nav-hidden');
    }
  }, { passive: true });
}

