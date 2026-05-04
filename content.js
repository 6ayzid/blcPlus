// content.js - Auto-login and redirect script for blcPlus
const extensionApi = globalThis.browser ?? globalThis.chrome;

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

// Initialize decent design wrapper immediately avoiding async delay if possible
let isDecentUIEnabled = true;
getStorage(["decentUI"]).then(result => {
  if (result.decentUI === false) {
    document.documentElement.setAttribute('data-theme-decent', 'false');
    isDecentUIEnabled = false;
  }
});

// Immediately hide the raw Moodle DOM for Decent UI injection
document.documentElement.setAttribute('data-blc-loading', 'true');

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

const currentUrl = new URL(window.location.href);
const loginUrlPath = 'login/index.php';
const rootUrl = 'https://elearn.daffodilvarsity.edu.bd/';
const dashboardUrl = 'https://elearn.daffodilvarsity.edu.bd/my/';
const targetLogoSelector = 'img.navbar-brand-logo, .navbar-brand img, img.logo';
const extensionLogoUrl = extensionApi.runtime.getURL('icons/128x128.png');

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startNavbarLogoWatcher();
    buildDecentNavbar();
    document.documentElement.removeAttribute('data-blc-loading');
  }, { once: true });
} else {
  startNavbarLogoWatcher();
  buildDecentNavbar();
  document.documentElement.removeAttribute('data-blc-loading');
}

// 1. Root URL Redirect (If logged in, go to Dashboard)
setTimeout(() => {
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
getStorage(["username", "password", "autoLogin"]).then(async (result) => {
  if (result.autoLogin !== true) {
    console.log("blcPlus: Auto-Login is disabled or settings not found.");
    return;
  }

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
        window.location.replace(`https://elearn.daffodilvarsity.edu.bd/${loginUrlPath}`);
      }
    }
  }

}).catch((error) => {
  console.error("blcPlus: Error accessing local storage:", error);
});

function buildDecentNavbar() {
  if (!isDecentUIEnabled) return;
  if (document.querySelector('.blc-decent-navbar')) return;

  const moodleLogoEl = document.querySelector('.navbar-brand-logo');
  const customLogoSrc = chrome.runtime.getURL('logo/128x128.png');

  const navHTML = `
  <nav class="navbar blc-decent-navbar blc-decent-wrapper" id="decentNavbar" aria-label="Main navigation">
    <div class="decent-navbar-inner">
      <div class="nav-left">
        <button class="logo" style="background:transparent;border:none;cursor:pointer;padding:0;outline:none;" onclick="window.location.href='https://elearn.daffodilvarsity.edu.bd/my/'">
          <img src="${customLogoSrc}" style="height: 32px; width: auto;" alt="blcPlus Logo">
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

