var isButtonEnabled = false;
var globalUrl = '';
//everything past this is no longer frontend related (refactoring stuff)
// calling the async background function to begin getting background info pre optimization
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
    }
});



function readLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}


const writeLocalStorage = (key, value) => {
    chrome.storage.local.set({ [key]: value });
};

async function getTotal() {
    try {
        const value = await readLocalStorage("totalTimeSaved");
        return JSON.parse(value);
    } catch (err) {
        return { previous_total: "000 day 00 hr 00 min", current_addition: 0 };
    }
}


/*
// DEVELOPER NOTES FOR READ-ME, this FUNCTION BELOW IS FOR DELETING NOT USED IN RELEASE, BUT DEF IN DEBUG MODEs
function removeKeyFromStorage(key) {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.remove(key, function () {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}



DEVELOPER NOTES TO ADD TO READ.ME, This function can be called as a full-proof way to make sure to let an async call run syncrhonously afterwards
 //REMOVE key-value pair from storage
 removeKeyFromStorage(key).then(() => {
      console.log("Key-value pair removed from storage");
    });

*/



function addTime(totalTime, timeToAdd) {
    const totalPattern = /(\d{3}) day (\d{2}) hr (\d{2}) min/;
    const addPattern = /(\d{1,2}) hr (\d{1,2}) min/;
    const totalMatch = totalPattern.exec(totalTime);
    const addMatch = addPattern.exec(timeToAdd);

    if (totalMatch === null) {
        throw new Error(`Invalid totalTime: ${totalTime}`);
    }

    if (addMatch === null) {
        throw new Error(`Invalid timeToAdd: ${timeToAdd}`);
    }

    const totalDays = parseInt(totalMatch[1]);
    const totalHours = parseInt(totalMatch[2]);
    const totalMinutes = parseInt(totalMatch[3]);

    const addHours = parseInt(addMatch[1]);
    const addMinutes = parseInt(addMatch[2]);

    const totalMinutesWithDays = totalMinutes + totalHours * 60 + totalDays * 24 * 60;
    const addMinutesWithDays = addMinutes + addHours * 60;

    const newTotalMinutes = totalMinutesWithDays + addMinutesWithDays;
    const newDays = Math.floor(newTotalMinutes / (24 * 60));
    const newHours = Math.floor((newTotalMinutes % (24 * 60)) / 60);
    const newMinutes = newTotalMinutes % 60;

    return `${newDays.toString().padStart(3, '0')} day ${newHours.toString().padStart(2, '0')} hr ${newMinutes.toString().padStart(2, '0')} min`;
}


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.action === "urlUpdated") {
        globalUrl = request.url;
    } else if (request.action === "showSuccessPopup") {
        //save then show
        let total;
        const key = "totalTimeSaved";
        console.log(JSON.stringify(request.timeSaved));



        try {
            total = await getTotal();
        } catch (err) {
            console.error(err);
            total = { previous_total: "000 day 00 hr 00 min", current_addition: 0 };
        }

        console.log(total.previous_total);
        total.previous_total = addTime(total.previous_total, request.timeSaved);
        //total.previous_total += request.timeSaved;
        total.current_addition = request.timeSaved;



        // SET RESPONSE

        // Save new total
        chrome.storage.local.set({ [key]: JSON.stringify(total) }, function () {
            console.log(`Saved ${JSON.stringify(total)} to local storage`);
        });



        // Set response
        sendResponse(total);

        for (const key in localStorage) {
            const value = localStorage.getItem(key);
            console.log(`Key: ${key}, Value: ${value}`);
        }




        showPopup('You just saved: ' + JSON.stringify(request.timeSaved) + '\nTotal time saved: ' + total.previous_total, '#4BB543');
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

    let addressList = []
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "getAddresses" }, function (response) {
            addressList = response
            console.log(addressList)

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
                    .then(response)
                    .then(data => {
                        console.log('Success:', data);
                        if (data.link.length === 0 || !data.link.includes("google.com/maps/")) {
                            // log potential error url in firebase
                            // now show error message if input method does not work
                            showPopup('Error, Please Re-Enter Stops', '#f44336')
                        } else {
                            chrome.runtime.sendMessage({ action: "openLink", curatedLink: data.link, timeSaved: data.timeDifference });
                            //globalTimeSaved = data.timeDifference
                            //openLink(data.link)
                        }
                    })
                    .catch((error) => {
                        console.log('Error:', error);
                        // log potential error url in firebase
                        showPopup('Error: Refresh and try again.', '#f44336')
                    });
            }
        });
    });
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

