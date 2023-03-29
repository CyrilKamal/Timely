chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'update') {
      console.log('background updated')
    }
  });
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getActiveTabUrl") {
      chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url) {
          sendResponse({url: tabs[0].url});
        } else {
          sendResponse({url: null});
        }
      });
      return true; // Required for async response
    }
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url && tab.active) {
      chrome.tabs.sendMessage(tabId, {action: "urlUpdated", url: changeInfo.url});
    }
  });

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "openLink") {
      openLink(request.curatedLink, request.timeSaved);
    }
  });

  async function openLink(curatedLink, timeSaved) {
    chrome.tabs.create({ url: curatedLink }, function (newTab) {
      chrome.webNavigation.onCompleted.addListener(function listener(details) {
        if (details.tabId === newTab.id) {
          chrome.webNavigation.onCompleted.removeListener(listener);
          chrome.tabs.sendMessage(newTab.id, { action: "showSuccessPopup", timeSaved: timeSaved });
        }
      });
    });
  }

