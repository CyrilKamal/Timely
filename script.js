// loading bar
let messageList = [
    'scanning map',
    'retrieving addresses',
    'retrieving current route',
    'extracting stops',
    'running optimization model',
    'crunching numbers',
    'optimizing route',
    'rearranging stops',
    'generating optimized route'
]
let index = 0;
var interval = setInterval(myTimer, 200);
function myTimer() {
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
// calling the async background function to begin getting background info pre optimization
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
                // does not call main if email is empty, ensures that no firebase calls will break database
                // calls main functino when data is ready
                main(splitAddressList)
            }
        } catch (err) {
            // could not retrieve addresses
            showError('Create Route on Google Maps')
        }
    });
}

async function main(addressList, url) {

    console.log('address list', addressList)
    console.log('current url', url)

    // http://localhost:3001 - LOCAL SERVER
    // https://routify-extension-server.herokuapp.com = DEPLOYED SERVER
    // check to see if max request count has been made
    // low priority, no need to display error message on popup
    // if more than 500 requests were made, raise a sus alarm
    // call server on heroku to get optimized google maps route link
    fetch('http://localhost:3001/ol', {
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
                inputMethod(url)

            } else {
                go(data)
            }
        })
        .catch((error) => {
            console.log('Error:', error);
            showError('Error, try refreshing the page')
        });
}

function inputMethod(url) {

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
                fetch('http://localhost:3001/ol', {
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
                            // log potential error url in firebase
                            // now show error message if input method does not work
                            showError('Error, Please Re-Enter Stops')
                        } else {
                            go(data)
                        }
                    })
                    .catch((error) => {
                        console.log('Error:', error);
                        // log potential error url in firebase
                        showError('Error, try refreshing the page')
                    });
            }
        });
    });
}

async function go(curatedLink) {
    window.open(curatedLink)
}

function showError(err) {
    clearInterval(interval);
    var message = document.getElementById("messages");
    message.innerHTML = err
    message.style.color = '#cd5c5c'

    var loadingAnimation = document.getElementById("loading-container");
    loadingAnimation.remove();
}