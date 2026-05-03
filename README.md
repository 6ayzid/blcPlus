<div align="center">
  <img src="icons/128x128.png" alt="blcPlus Logo" width="128">
  
  # blcPlus 🚀
  
  **The Ultimate Quality-of-Life Upgrade for the DIU BLC Portal.**
  
  [![Firefox Add-on](https://img.shields.io/badge/Firefox-Extension-FF7139?style=flat-square&logo=Firefox-Browser)](https://github.com/6ayzid/blcPlus)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
  [![Open Source](https://img.shields.io/badge/Open_Source-❤️-success?style=flat-square)](https://github.com/6ayzid/blcPlus)
  
  *Say goodbye to repetitive manual logins and frustrating session timeouts.*
</div>

---

## 📖 What is blcPlus?

**blcPlus** is a powerful, open-source Firefox extension specifically designed to enhance the experience on the Daffodil International University (DIU) Blended Learning Center (BLC) portal. It actively monitors your session state and uses background automation to handle authentication and session longevity—wrapped in a beautiful, Material 3 design dashboard.

## ✨ Features

- **Bulletproof Auto-Login**: Never manually type your credentials again. The extension actively watches for the `notloggedin` state or explicit login pages and automatically injects your credentials and logs you in.
- **Smart Redirects**: Automatically bypasses the generic BLC homepage and redirects you straight to your Dashboard (`/my/`) if you are already logged in.
- **Session Keep-Alive**: Prevents frustrating automatic logouts. A lightweight background script sends a silent ping to the server every 15 minutes to keep your active session alive.
- **Material 3 UI Dashboard**: A sleek, modern popup interface with automatic light/dark mode support to easily manage your credentials and toggle the Auto-Login feature.
- **Developer Profile**: Includes a polished developer profile view with sliding animations.

## 🚀 Installation (Developer Mode)

Currently, the extension is loaded manually via Firefox's debugging tools:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/6ayzid/blcPlus.git
   ```
2. Open Firefox and type `about:debugging` into the URL address bar.
3. Click on **"This Firefox"** in the left-hand sidebar.
4. Click the **"Load Temporary Add-on..."** button.
5. Navigate to the downloaded `blcPlus` folder and select the `manifest.json` file.

The blcPlus icon will now appear in your Firefox toolbar!

## ⚙️ Usage

1. Click on the **blcPlus** extension icon in your browser toolbar to open the settings dashboard.
2. Enter your **Student ID / Username** and **Password**.
3. Toggle the **Enable Auto-Login** switch to the ON position.
4. Click **Save Settings**.
5. Navigate to the [DIU BLC Portal](https://elearn.daffodilvarsity.edu.bd/). The extension will immediately take over, log you in, and redirect you to your dashboard.

## 📁 Project Structure

- `manifest.json`: The Manifest V3 configuration file.
- `popup.html` / `popup.js`: The Material 3 dashboard UI, slide transitions, and local storage logic.
- `content.js`: The core DOM manipulation script that handles auto-login and redirects via `MutationObserver`.
- `background.js`: The alarm-driven service that pings the server to keep your session alive.

---
*Disclaimer: This extension securely stores your credentials locally within your browser using `browser.storage.local`. It does not send your data to any external servers.*
