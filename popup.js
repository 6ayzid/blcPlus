document.addEventListener('DOMContentLoaded', () => {
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

  function setStorage(values) {
    if (globalThis.browser?.storage?.local?.set) {
      return globalThis.browser.storage.local.set(values);
    }

    return new Promise((resolve, reject) => {
      extensionApi.storage.local.set(values, () => {
        const error = extensionApi.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve();
      });
    });
  }

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const autoLoginToggle = document.getElementById('autoLogin');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  
  const showProfileBtn = document.getElementById('showProfileBtn');
  const backBtn = document.getElementById('backBtn');
  const togglePasswordBtn = document.getElementById('togglePassword');

  // Load existing credentials
  getStorage(["username", "password", "autoLogin"]).then((result) => {
    if (result.username) usernameInput.value = result.username;
    if (result.password) passwordInput.value = result.password;
    
    // Default to true if not set
    if (result.autoLogin !== undefined) {
      autoLoginToggle.checked = result.autoLogin;
    } else {
      autoLoginToggle.checked = true;
    }
  }).catch(error => {
    console.error("Error loading settings:", error);
  });

  // Save credentials
  saveBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const autoLogin = autoLoginToggle.checked;

    statusDiv.className = '';
    statusDiv.textContent = 'Saving...';
    
    setStorage({ username, password, autoLogin }).then(() => {
      statusDiv.textContent = 'Settings saved securely!';
      statusDiv.className = 'success';
      setTimeout(() => { statusDiv.textContent = ''; }, 3000);
    }).catch((error) => {
      statusDiv.textContent = 'Error saving settings.';
      statusDiv.className = 'error';
      console.error(error);
    });
  });

  // View Transitions
  showProfileBtn.addEventListener('click', () => {
    document.body.classList.add('show-profile');
  });

  backBtn.addEventListener('click', () => {
    document.body.classList.remove('show-profile');
  });

  // Show/Hide Password
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    // Toggle SVG icon
    if (isPassword) {
      // Eye Off SVG
      togglePasswordBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      // Eye On SVG
      togglePasswordBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  });
});
