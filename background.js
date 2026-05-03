// background.js - Background script for session keep-alive

// Create the keepAlive alarm when the extension loads/starts
browser.alarms.create("keepAlive", {
  delayInMinutes: 15, // Starts the first ping after 15 minutes
  periodInMinutes: 15 // Repeats every 15 minutes
});

// Listen for alarms
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    // Perform a silent fetch to keep the session active
    // 'no-cors' ensures the browser doesn't block the request if CORS headers are missing,
    // and it doesn't leak data unnecessarily.
    fetch('https://elearn.daffodilvarsity.edu.bd/', { mode: 'no-cors' })
      .then(() => {
        console.log('Keep-alive ping sent');
      })
      .catch((error) => {
        console.error('Keep-alive ping failed:', error);
      });
  }
});

console.log("Background script initialized. keepAlive alarm set.");
