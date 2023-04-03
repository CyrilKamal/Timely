// loading messages
let loadingMessages = [
    'calculating distance',
    'mapping waypoints',
    'streamlining your route',
    'optimizing stops',
    'plotting coordinates',
    'optimizing your journey',
    'loading locations',
    'arranging stops',
    'sorting destinations'
]
let index = 0;
var timer = setInterval(loadingLoop, 200);
function loadingLoop() {
    var message = document.getElementById("messages");
    message.innerHTML = loadingMessages[index]
    message.style.fontSize = '15px'
    if (index == loadingMessages.length - 1) {
        index = 0;
    } else {
        index = index + 1;
    }
}
//everything past this is no longer frontend related (refactoring stuff)
// scrub link asynch to get Stops
background()
async function background() {
    console.log('yo its main :D')

    // scrub address list from url
    let splitAddressList
    let url = ''
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        try {
            url = tabs[0].url;

            let addressListStr = url.split('dir/')[1]
            addressListStr = addressListStr.split('/@')[0]
            console.log(addressListStr)

            splitAddressList = addressListStr.split('/')

            if (splitAddressList.length < 4) {
                showError('Please enter more stops')
            } else {
                // calls main function when data is ready
                getOptimizedLink(splitAddressList)
            }
        } catch (err) {
            // could not get the stops
            showError('Create A Route')
        }
    });
}

async function getOptimizedLink(addressList, url) {

    console.log('address list', addressList)
    console.log('current url', url)

    // call cyclic server to get optimized link
    fetch('https://giddy-tuna-bedclothes.cyclic.app/ol', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: (JSON.stringify({ splitAddressList: addressList }))
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            if (data.link.length === 0 || !data.link.includes("google.com/maps/")) {
                //retry with text
                retryText(url)
            } else {
                //openLink(data.link)
                //SUCCESS open link now
                chrome.runtime.sendMessage({ action: "openLink", curatedLink: data.link, timeSaved: data.timeDifference });
            }
        })
        .catch((error) => {
            console.log('error:', error);
            showError('Error: Refresh and try again.')
        });
}

function retryText(url) {

    let addressList = []
    // get the addresses from the input fields
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "getAddresses" }, function (response) {
            addressList = response
            console.log(addressList)
            // check to see if addressList was succesful (if empty return from server that means unsuccesful so showerr)
            if (addressList === null || addressList === undefined || addressList.length === 0) {
                showError('Error, Please Re-Enter Stops');
                return;
            } else {

                // call server on cyclic to get optimized google maps route link
                fetch('https://giddy-tuna-bedclothes.cyclic.app/ol', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: (JSON.stringify({ splitAddressList: addressList }))
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Success:', data);
                        if (data.link.length === 0 || !data.link.includes("google.com/maps/")) {
                            // show error message if retryText method does not work
                            showError('Error: Please Enter Stops Again')
                        } else {
                            //SUCCESS open link now
                            chrome.runtime.sendMessage({ action: "openLink", curatedLink: data.link, timeSaved: data.timeDifference });
                        }
                    })
                    .catch((error) => {
                        console.log('Error:', error);
                        showError('Error, try refreshing the page')
                    });
            }
        });
    });
}

async function openLink(optimizedLink) {
    window.open(optimizedLink)
}

function showError(err) {
    clearInterval(timer);
    var message = document.getElementById("messages");
    message.innerHTML = err
    message.style.color = '#cf5d5d'

    var loadingAnimation = document.getElementById("loadingDiv");
    loadingAnimation.remove();
}