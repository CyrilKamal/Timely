var isButtonEnabled = false;
var globalUrl = '';
//everything past this is no longer frontend related (refactoring stuff)
// calling the async background function to begin getting background info pre optimization
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        switch(message.type) {
            case "getAddresses":

                let inputAddressList = []
                // checking to see if the class name is present
                try {
                    if (document.getElementsByClassName('tactile-searchbox-input')[0]) {
                        // if so get the addresses from the input fields
                        let inputVals = document.getElementsByClassName('tactile-searchbox-input');
                        for (let i = 0; i < inputVals.length; i++){
                            let addressTxt = inputVals[i].ariaLabel
                            if (addressTxt.length > 16) {
                                if (addressTxt.substring(0,15) === 'Starting point ') {
                                    console.log(addressTxt.substring(15))
                                    addressTxt = addressTxt.substring(15)
                                }
                            }
                            if (addressTxt.length > 13) {
                                if (addressTxt.substring(0,12) === 'Destination ') {
                                    console.log(addressTxt.substring(12))
                                    addressTxt = addressTxt.substring(12)
                                }
                            }
                            inputAddressList.push(addressTxt)
                        }
                    }
                } catch(err) {
                    console.log(err)
                }


                sendResponse(inputAddressList);
            break;
        }
    }
);

chrome.runtime.sendMessage({ action: "getActiveTabUrl" }, function (response) {
    if (response.url) {
        globalUrl = response.url
    } else {
        showPopup('Could not scrub URL', '#f44336');
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "urlUpdated") {
        globalUrl = request.url
        console.log('global url updated: ', globalUrl)
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "urlUpdated") {
        globalUrl = request.url;
    } else if (request.action === "showSuccessPopup") {
        showPopup('You just saved: ' + request.timeSaved, '#4BB543');
    }
});


async function background(url) {
    console.log('yo its main :D')

    // get address list from url
    let splitAddressList
    try {
        let addressListStr = url.split('dir/')[1]
        addressListStr = addressListStr.split('/@')[0]
        console.log(addressListStr)

        splitAddressList = addressListStr.split('/')

        if (splitAddressList.length < 4) {
            showPopup('Please enter at least 4 stops.', '#f44336')
        } else {
            // calls main functino when data is ready
            getOptimizedLink(splitAddressList)
        }
    } catch (err) {
        // could not get the stops
        showPopup('Create Route for Google Maps', '#f44336')
    }
}

async function getOptimizedLink(addressList, url) {

    console.log('address list', addressList)
    console.log('current url', url)

    // call server to get optimized link
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
                chrome.runtime.sendMessage({ action: "openLink", curatedLink: data.link, timeSaved: data.timeDifference });
                //globalTimeSaved = data.timeDifference
                //openLink(data.link)
            }
        })
        .catch((error) => {
            console.log('Error:', error);
            showPopup('Error: Refresh and try again.', '#f44336')
        });
}

function retryText(url) {
    let addressList = [];
    // get the addresses from the input fields
    let inputVals = document.getElementsByClassName('tactile-searchbox-input');
    for (let i = 0; i < inputVals.length; i++) {
        let addressTxt = inputVals[i].ariaLabel
        if (addressTxt.length > 16) {
            if (addressTxt.substring(0, 15) === 'Starting point ') {
                console.log(addressTxt.substring(15))
                addressTxt = addressTxt.substring(15)
            }
        }
        if (addressTxt.length > 13) {
            if (addressTxt.substring(0, 12) === 'Destination ') {
                console.log(addressTxt.substring(12))
                addressTxt = addressTxt.substring(12)
            }
        }
        addressList.push(addressTxt)
    }

    // check to see if addressList was succesful (not if empty)
    if (addressList === null || addressList === undefined || addressList.length === 0) {
        showPopup('Error: Please Enter Stops Again', '#f44336');
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
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                if (data.link.length === 0 || !data.link.includes("google.com/maps/")) {
                    // show error message if retryText method does not work
                    showError('Error, Please Re-Enter Stops')
                } else {
                    chrome.runtime.sendMessage({ action: "openLink", curatedLink: data.link, timeSaved: data.timeDifference });
                }
            })
            .catch((error) => {
                console.log('Error:', error);
                showError('Error, try refreshing the page')
            });
    }
}

/* async function openLink(curatedLink) {
    chrome.tabs.create({ URL: curatedLink }, function (newTab) {
        chrome.webNavigation.onCompleted.addListener(function listener(details) {
            if (details.tabId === newTab.id) {
                chrome.webNavigation.onCompleted.removeListener(listener);
                chrome.tabs.sendMessage(newTab.id, { action: "showSuccessPopup" });
            }
        });
    });
} */


function showPopup(errorMessage, backgroundColor) {
    var popup = document.createElement('div');
    popup.setAttribute('id', 'error-popup');
    //popup.setAttribute('style', 'position: fixed; top: 10px; right: 10px; z-index: 1000; background-color: #f44336; color: white; padding: 16px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);');
    popup.setAttribute('style', 'position: fixed; top: 10px; right: 10px; z-index: 1000; background-color: ' + backgroundColor + '; color: white; padding: 16px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);');
    var closeButton = document.createElement('button');
    closeButton.setAttribute('style', 'background: none; border: none; color:white; font-size: 16px; cursor: pointer; margin-right: 8px;');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', function () {
        popup.remove();
    });

    var message = document.createElement('span');
    message.setAttribute('style', 'display: inline-block; vertical-align: middle;');
    message.innerText = errorMessage;

    popup.appendChild(closeButton);
    popup.appendChild(message);
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.remove();
    }, 5000);
}
function AddRouteButton() {
    var parentElement = document.querySelector(".dryRY");
    if (parentElement && !isButtonEnabled) { //button not enable yet
        console.log("Optimize Route button added!");
        var secondLastChild = parentElement.lastChild.previousSibling;

        var newElement = document.createElement('div');
        newElement.setAttribute('class', 'KNfEk Rqu0ae ');

        var button = document.createElement('button');
        button.setAttribute('class', 'e2moi ');
        button.setAttribute('aria-label', 'Optimize current route');
        button.setAttribute('data-tooltip', 'Optimize current route');
        button.setAttribute('jsaction', 'pane.wfvdle21;keydown:ripple.play;mousedown:ripple.play;ptrdown:ripple.play;focus:pane.focusTooltip;blur:pane.blurTooltip');
        button.setAttribute('jslog', '97797; track:click;metadata:WyIwYWhVS0V3aWIwcXJWbXViOUFoVUNtR29GSFV6WkF1MFEtQ1FJQmlnRCJd');
        button.id = "maps-optimize-route"

        button.addEventListener("click", function (event) {
            background(globalUrl);
        });


        var span = document.createElement('span');
        span.setAttribute('class', 'tXNTee L6Bbsd T7HQDc');

        var div = document.createElement('div');
        div.setAttribute('class', 'OyjIsf');

        var img = document.createElement('img');
        img.setAttribute('class', 'k48Abe');
        img.setAttribute('alt', '');
        img.setAttribute('draggable', 'false');
        img.setAttribute('src', 'https://cdn.discordapp.com/attachments/852958177167015936/1086869178348228689/icon.png');

        var innerSpan = document.createElement('span');
        innerSpan.setAttribute('class', 'uEubGf fontTitleSmall');
        innerSpan.innerText = 'Optimize Route';

        span.appendChild(div);
        span.appendChild(img);
        span.appendChild(innerSpan);

        button.appendChild(span);

        newElement.appendChild(button);

        parentElement.insertBefore(newElement, secondLastChild);

        isButtonEnabled = true;
    } else if (!parentElement) { //if parent element for the button doesn't exist
        isButtonEnabled = false;
        console.log("There's an error while adding the button.");
    }
}


function init() {

    window.onload = function () {
        setInterval(AddRouteButton, 500);
    };
}

init()


