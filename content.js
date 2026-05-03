// content.js - Auto-login and redirect script for blcPlus

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

const currentUrl = window.location.href;
const loginUrlPath = 'login/index.php';
const rootUrl = 'https://elearn.daffodilvarsity.edu.bd/';
const dashboardUrl = 'https://elearn.daffodilvarsity.edu.bd/my/';

// 1. Root URL Redirect (If logged in, go to Dashboard)
setTimeout(() => {
  const isLoggedOut = document.body.classList.contains('notloggedin');
  if (!isLoggedOut && (currentUrl === rootUrl || currentUrl === rootUrl + '?redirect=0')) {
    console.log("blcPlus: Logged in and on root URL. Redirecting to dashboard...");
    window.location.replace(dashboardUrl);
  }
}, 500);

// Retrieve stored settings
browser.storage.local.get(["username", "password", "autoLogin"]).then(async (result) => {
  if (result.autoLogin !== true) {
    console.log("blcPlus: Auto-Login is disabled or settings not found.");
    return;
  }

  const isExplicitLoginPage = currentUrl.includes(loginUrlPath);
  const isLoggedOutClassPresent = document.body.classList.contains('notloggedin');

  // 2 & 3. Execute Auto-Login sequence
  // Trigger if we are on the explicit login URL OR if the body has the 'notloggedin' class (redundant method)
  if (isExplicitLoginPage || isLoggedOutClassPresent) {
    console.log("blcPlus: Login condition met. Waiting for input fields to render...");
    
    // Give the DOM a moment to render the fields (2.5 seconds max)
    const usernameInput = await waitForElement("#username", 2500);
    const passwordInput = await waitForElement("#password", 2500);

    if (usernameInput && passwordInput && result.username && result.password) {
      console.log("blcPlus: Fields found. Injecting credentials...");
      
      // Inject and trigger events
      usernameInput.value = result.username;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      passwordInput.value = result.password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait 500ms to mimic human timing / let JS validate, then submit
      setTimeout(() => {
        // Try exact ID first
        let loginBtn = document.getElementById("loginbtn");
        
        // Fallback: Any submit button inside the same form
        if (!loginBtn) {
          const form = usernameInput.closest('form');
          if (form) {
            loginBtn = form.querySelector('button[type="submit"], input[type="submit"]');
          }
        }

        if (loginBtn) {
          console.log("blcPlus: Clicking login button...");
          loginBtn.click();
        } else {
          console.log("blcPlus: Login button not found. Attempting to submit form directly...");
          const form = usernameInput.closest('form');
          if (form) form.submit();
        }
      }, 500);
      
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
