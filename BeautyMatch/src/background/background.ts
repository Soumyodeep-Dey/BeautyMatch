chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        sendResponse(tabs[0]);
      } else {
        sendResponse(null);
      }
    });
    return true; // Important to keep the message channel open
  }
});
