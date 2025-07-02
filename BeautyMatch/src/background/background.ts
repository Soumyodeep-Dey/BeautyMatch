// src/background/background.ts

chrome.runtime.onInstalled.addListener(() => {
    console.log("BeautyMatch extension installed.");
  });
  
  // You can add more background logic here in future:
  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { ... });
  