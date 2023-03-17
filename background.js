// content will be logged onto service worker
// Fired when the extension is first installed, when the extension is updated to a new version, and when Chrome is updated to a new version
chrome.runtime.onInstalled.addListener(details => {
    console.log('Hello from background.js onInstalled');
    if (details.reason === 'install') {
      chrome.tabs.create({ url: 'https://www.routora.com/extension-instructions' });
    } else if (details.reason === 'update') {
      console.log('updated from background.js')
    }
  });
  
  
  /* USE THIS AND CONTENT.JS IF YOU DONT WANT HTML POPUP */
  
  // chrome.action.onClicked.addListener(async function (tab) {
  
  //   // retrieve current google email
  //   let email
  //   await chrome.identity.getProfileUserInfo(function(userInfo) {
  //     console.log(JSON.stringify(userInfo));
  //     email = userInfo.email
  //   });
  
  
  //   // get address list from url
  //   let splitAddressList
  //   await chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
  //     let url = tabs[0].url;
  
  //     let addressListStr = url.split('dir/')[1]
  //     addressListStr = addressListStr.split('/@')[0]
  //     console.log(addressListStr)
  
  //     splitAddressList = addressListStr.split('/')
  //   });
  
  //   // pass in email and address list to content
  //   chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
  //     chrome.tabs.sendMessage(tabs[0].id, {email: email, addressList: splitAddressList}, function(response) {});  
  //   });
  
  // });