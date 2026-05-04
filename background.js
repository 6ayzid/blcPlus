// background.js - Background service worker for session keep-alive

const extensionApi = globalThis.browser ?? globalThis.chrome;

// Create the keepAlive alarm when the extension is installed or updated
extensionApi.runtime.onInstalled.addListener(() => {
  extensionApi.alarms.create("keepAlive", {
    delayInMinutes: 15, // Starts the first ping after 15 minutes
    periodInMinutes: 15 // Repeats every 15 minutes
  });
  console.log("Keep-alive alarm scheduled.");
});


// Listen for alarms
extensionApi.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    // Perform a silent fetch to keep the session active
    // 'no-cors' ensures the browser doesn't block the request if CORS headers are missing,
    // and it doesn't leak data unnecessarily.
    fetch("https://elearn.daffodilvarsity.edu.bd/", { mode: "no-cors" })
      .then(() => {
        console.log("Keep-alive ping sent");
      })
      .catch((error) => {
        console.error("Keep-alive ping failed:", error);
      });
  }
});

console.log("Background service worker initialized. keepAlive alarm set.");
