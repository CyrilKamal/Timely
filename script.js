// loading bar
let messageList = [
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
var interval = setInterval(loadingLoop, 200);
function loadingLoop() {
    var message = document.getElementById("messages");
    message.innerHTML = messageList[index]
    message.style.fontSize = '15px'
    if (index == messageList.length - 1) {
        index = 0;
    } else {
        index = index + 1;
    }
}
//everything past this is no longer frontend related (refactoring stuff)
// scrub link asynchronusly to get Stops
background()
async function background() {
    console.log('yo its main :D')

    // get address list from url
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
                // calls main functino when data is ready
                getOptimizedLink(splitAddressList)
            }
        } catch (err) {
            // could not retrieve addresses
            showError('Create Route on Google Maps')
        }
    });
}

async function getOptimizedLink(addressList, url) {

    console.log('address list', addressList)
    console.log('current url', url)

    // call on server to get ol
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
            if (data.length === 0 || !data.includes("google.com/maps/")) {

                // ***
                // INPUT TEXT METHOD (instead of url)
                // ***
                retryText(url)

            } else {
                openLink(data)
            }
        })
        .catch((error) => {
            console.log('Error:', error);
            showError('Error, try refreshing the page')
        });
}

function retryText(url) {

    let addressList = []
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "getAddresses" }, function (response) {
            addressList = response
            console.log(addressList)

            // check to see if addressList was succesful (not if empty)
            if (addressList === null || addressList === undefined || addressList.length === 0) {
                showError('Error, Please Re-Enter Stops');
                return;
            } else {

                // call server on heroku to get optimized google maps route link
                fetch('https://giddy-tuna-bedclothes.cyclic.app/ol', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: (JSON.stringify({ splitAddressList: addressList }))
                })
                    .then(response)
                    .then(data => {
                        console.log('Success:', data);
                        if (data.length === 0 || !data.includes("google.com/maps/")) {
                            // show error message if retryText method does not work
                            showError('Error, Please Re-Enter Stops')
                        } else {
                            openLink(data)
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
    clearInterval(interval);
    var message = document.getElementById("messages");
    message.innerHTML = err
    message.style.color = '#cf5d5d'

    var loadingAnimation = document.getElementById("loadingDiv");
    loadingAnimation.remove();
}