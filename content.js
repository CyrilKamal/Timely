var globalUrl = '';
//everything past this is no longer frontend related (refactoring stuff)
// calling the async background function to begin getting background info pre optimization
chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        switch (message.type) {
            case "getAddresses":

                let inputAddressList = []
                // checking to see if the class name is present
                try {
                    if (document.getElementsByClassName('tactile-searchbox-input')[0]) {
                        // if so get the addresses from the input fields
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
                            inputAddressList.push(addressTxt)
                        }
                    }
                } catch (err) {
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
        showErrPopup('Could not scrub URL', '#f44336');
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


// using a get function to receive the total time, then passing total time into this function to receive the currency
function getCurrency(totalTime, avg_speed_km_h = 60, fuel_consumption_l_100km = 10, avg_gas_price_per_l = 1.50) {
    const totalPattern = /(\d{3}) day (\d{2}) hr (\d{2}) min/;
    const addPattern = /(\d{1,2}) hr (\d{1,2}) min/;
    const totalMatch = totalPattern.exec(totalTime);
    const addMatch = addPattern.exec(totalTime);

    let totalMinutesWithDays;


    if (totalMatch === null) {
        //at this point we know we're adding current time and not total time, if it's null here then it's a bad totalTime
        if (addMatch == null) {

            throw new Error(`Invalid totalTime: ${totalTime}`);
        } else {


            const addHours = parseInt(addMatch[1]);
            const addMinutes = parseInt(addMatch[2]);

            totalMinutesWithDays = addMinutes + addHours * 60;

        }


    } else {


        const totalDays = parseInt(totalMatch[1]);
        const totalHours = parseInt(totalMatch[2]);
        const totalMinutes = parseInt(totalMatch[3]);


        totalMinutesWithDays = totalMinutes + totalHours * 60 + totalDays * 24 * 60;
    }

    // total minutes With Days //minutes to money --> assumption 60km/h 1km/minute 10L/100km 1L/1km --> 1L/minute $1.50 per L 

    // totalMinutes --> 1km/minute --> 1L/minute --> $1.50/L --> money 

    // variables --> average speed (km/h) --> fuel consumption (L/100km) --> gas-price ($ / per L)
    // 60km/hour --> /60 --> km/min
    let km_per_m = avg_speed_km_h / 60;
    //km/minute L/100km  / 100
    let l_per_m = km_per_m * fuel_consumption_l_100km / 100;

    // l/m * $/l  = $/m 
    let money_per_minute = l_per_m * avg_gas_price_per_l;

    let money = money_per_minute * totalMinutesWithDays;



    return money.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getCO2EmissionsSaved(totalTime, avg_speed_km_h = 60, fuel_consumption_l_100km = 10, co2_emissions_g_per_l = 2.3) {
    const totalPattern = /(\d{3}) day (\d{2}) hr (\d{2}) min/;
    const addPattern = /(\d{1,2}) hr (\d{1,2}) min/;
    const totalMatch = totalPattern.exec(totalTime);
    const addMatch = addPattern.exec(totalTime);

    let totalMinutesWithDays;

    if (totalMatch === null) {
        //at this point we know we're adding current time and not total time, if it's null here then it's a bad totalTime
        if (addMatch == null) {
            throw new Error(`Invalid totalTime: ${totalTime}`);
        } else {
            const addHours = parseInt(addMatch[1]);
            const addMinutes = parseInt(addMatch[2]);

            totalMinutesWithDays = addMinutes + addHours * 60;
        }
    } else {
        const totalDays = parseInt(totalMatch[1]);
        const totalHours = parseInt(totalMatch[2]);
        const totalMinutes = parseInt(totalMatch[3]);

        totalMinutesWithDays = totalMinutes + totalHours * 60 + totalDays * 24 * 60;
    }

    // total minutes With Days //minutes to CO2 emissions saved --> assumption 60km/h 1km/minute 10L/100km 2.3g/CO2 per L
    // totalMinutes --> 1km/minute --> 1L/100km --> CO2 emissions g/minute

    // variables --> average speed (km/h) --> fuel consumption (L/100km) --> CO2 emissions (g/L)
    // 60km/hour --> /60 --> km/min
    let km_per_m = avg_speed_km_h / 60;
    //km/minute L/100km  / 100
    let l_per_m = km_per_m * fuel_consumption_l_100km / 100;

    // l/m * g/l  = g/m 
    let co2_emissions_per_minute = l_per_m * co2_emissions_g_per_l;

    let co2_emissions_saved = co2_emissions_per_minute * totalMinutesWithDays;

    return co2_emissions_saved.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' g';
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

        showPopup('#FFFFFF', 'Timely Now',
            {
                "Travel Time Saved": `${request.timeSaved.replace(/"/g, '')}`,
                "Money Saved": `${getCurrency(request.timeSaved)}`,
                "CO2 Emissions Saved": `${getCO2EmissionsSaved(request.timeSaved)}`
            })
        showPopup('#FFFFFF', 'Timely Wallet',
            {
                "Total Travel Time Saved": `${total.previous_total}`,
                "Total Money Saved": `${getCurrency(total.previous_total)}`,
                "Total CO2 Emissions Saved": `${getCO2EmissionsSaved(total.previous_total)}`
            })
    }
});

// scrub link asynch to get Stops
async function background(url) {
    console.log('yo its main :D')

    // scrub address list from url
    let splitAddressList
    try {
        let addressListStr = url.split('dir/')[1]
        addressListStr = addressListStr.split('/@')[0]
        console.log(addressListStr)

        splitAddressList = addressListStr.split('/')

        if (splitAddressList.length < 4) {
            showErrPopup('Please enter at least 4 stops.', '#f44336')
        } else {
            // calls main function when data is ready
            getOptimizedLink(splitAddressList)
        }
    } catch (err) {
        // could not get the stops
        showErrPopup('Create Route for Google Maps', '#f44336')
    }
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
                //SUCCESS open link now
                chrome.runtime.sendMessage({ action: "openLink", curatedLink: data.link, timeSaved: data.timeDifference });
                //globalTimeSaved = data.timeDifference
                //openLink(data.link)
            }
        })
        .catch((error) => {
            console.log('error:', error);
            showErrPopup('Error: Refresh and try again.', '#f44336')
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

    // // check to see if addressList was succesful (if empty return from server that means unsuccesful so showerr)
    if (addressList === null || addressList === undefined || addressList.length === 0) {
        showErrPopup('Error: Please Enter Stops Again', '#f44336');
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
                showError('Error: Refresh and try again.')
            });
    }
}

// some variables to create on showPopup
var popupWidth = 400; // Initialize popup width to 200 pixels
var popupHeight = 10; // Initialize popup height to 10
let popupContainer; // Initialize container for popups

function showPopup(backgroundColor, title = "", message = {}) {
    const popup = document.createElement("div");
    popup.setAttribute("class", "popup");
    popup.setAttribute(
        "style",
        `position: fixed; top: ${popupHeight}px; right: 10px; z-index: 1000; background-color: ${backgroundColor}; color: white; padding: 10px 15px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); width: ${popupWidth}px;`
    );


    // Add a new div element to the popup
    const blueStrip = document.createElement('div');
    blueStrip.style.backgroundColor = '#1a73e8';
    blueStrip.style.width = '5px';
    blueStrip.style.position = 'absolute';  // Change position to 'absolute'
    blueStrip.style.top = '0';
    blueStrip.style.left = '0';
    blueStrip.style.height = '100%';
    blueStrip.style.borderBottomLeftRadius = '15px';
    blueStrip.style.borderTopLeftRadius = '15px';
    blueStrip.style.overflow = 'hidden';

    // Append the blue strip to the popup element
    popup.appendChild(blueStrip);

    if (title !== "") {
        const popupTitle = document.createElement("div");
        popupTitle.setAttribute("class", "popup-title");
        popupTitle.setAttribute(
            "style",
            "font-size: 20px; text-align: center; color: #202124; margin-bottom: 10px;font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 1rem; font-weight: 500; letter-spacing: 0; line-height: 1.5rem;"
        );
        popupTitle.textContent = title;
        popup.appendChild(popupTitle);
    }

    if (message) {
        const popupMessage = document.createElement("div");
        popupMessage.setAttribute("class", "popup-message");
        popupMessage.setAttribute("style", "font-size: 14px; text-align: left; color: #202124; font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 1rem; font-weight: normal; letter-spacing: 0; line-height: 1.5rem;");

        //go through each one
        for (const key in message) {
            var keyElement = document.createElement("span");
            keyElement.setAttribute(
                "style",
                "display: inline-block; width: 200px; color: #70757a; font-weight: bold; font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 1rem; font-weight: normal; letter-spacing: 0; line-height: 1.5rem;"
            );
            keyElement.innerText = key + ":";

            var valueElement = document.createElement("span");
            valueElement.setAttribute(
                "style",
                "display: inline-block; margin-left: 5px; color: #1a73e8; white-space: nowrap; font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 1rem; font-weight: normal; letter-spacing: 0; line-height: 1.5rem;"
            );
            valueElement.innerHTML = `${message[key]}`;

            var messageElement = document.createElement("div");
            messageElement.style.cssText =
                "overflow: auto; margin-bottom: 5px;"; // adding margin between each key

            messageElement.appendChild(keyElement);
            messageElement.appendChild(valueElement);
            popup.appendChild(messageElement);
        }

        popup.appendChild(popupMessage);
    }

    const closeButton = document.createElement("button");
    closeButton.setAttribute("class", "popup-close-button");
    closeButton.setAttribute(
        "style",
        "background: none; border: none; color:grey; font-size: 20px; cursor: pointer; position: absolute; top: 5px; right: 5px;"
    );
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", function () {
        popup.remove();
        if (popupContainer && popupContainer.hasChildNodes()) {
            popupHeight -= popupContainer.lastChild.offsetHeight + 10;
        }
    });

    popup.appendChild(closeButton);
    document.body.appendChild(popup);

    popupHeight += popup.offsetHeight + 10;

    if (!popupContainer) {
        popupContainer = document.createElement("div");
        popupContainer.setAttribute("class", "popup-container");
        popupContainer.setAttribute(
            "style",
            "position: fixed; top: 100px; right: 10px; z-index: 1000;"
        );
        document.body.appendChild(popupContainer);
    }

    popupContainer.appendChild(popup);

    setTimeout(() => {
        popup.remove();
        popupHeight -= popup.offsetHeight + 10;
        if (popupHeight < 10) {
            popupContainer.remove();
            popupContainer = null;
        }
    }, 15000);
}


function showErrPopup(errorMessage, backgroundColor) {
    var popup = document.createElement('div');
    popup.setAttribute('id', 'error-popup');
    popup.setAttribute('style', 'position: fixed; top: ' + popupHeight + 'px; right: 10px; z-index: 1000; background-color: ' + backgroundColor + '; color: white; padding: 16px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);');

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
    popupHeight += popup.offsetHeight + 10; // Add the height of the popup and some margin to the total popup height
    setTimeout(() => {
        popup.remove();
    }, 10000);
}

function getTextColor(backgroundColor) {
    // Calculate the perceived brightness of the background color
    var r = parseInt(backgroundColor.substr(1, 2), 16);
    var g = parseInt(backgroundColor.substr(3, 2), 16);
    var b = parseInt(backgroundColor.substr(5, 2), 16);
    var brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return white or black depending on perceived brightness
    return brightness > 125 ? 'black' : 'white';
}


function AddRouteButton() {
    var parentElement = document.querySelector(".dryRY");
    if (!parentElement || !parentElement.children.length) {
        // Parent element doesn't exist or hasn't loaded yet, skip injection
        return;
    }

    if (!document.getElementById("maps-optimize-route")) { //if button does not exist
        console.log("Optimize Route button added!");

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
        span.style.background = "linear-gradient(to right, #1a73e8, #50c6de)"; // Set the background gradient

        var div = document.createElement('div');
        div.setAttribute('class', 'OyjIsf');

        var img = document.createElement('img');
        img.setAttribute('class', 'k48Abe');
        img.setAttribute('alt', '');
        img.setAttribute('draggable', 'false');
        img.setAttribute('src', 'https://cdn.discordapp.com/attachments/852958177167015936/1110937466984206356/icon.png');

        var innerSpan = document.createElement('span');
        innerSpan.setAttribute('class', 'uEubGf fontTitleSmall');
        innerSpan.innerText = 'Optimize Route';
        innerSpan.style.color = 'white';

        span.appendChild(div);
        span.appendChild(img);
        span.appendChild(innerSpan);

        button.appendChild(span);

        // Move the new button to the first position
        var firstChild = parentElement.firstChild;
        if (firstChild) {
            parentElement.insertBefore(newElement, firstChild);
        } else {
            parentElement.appendChild(newElement);
        }

        newElement.appendChild(button);
    }
    else if (parentElement.firstChild.id != "maps-optimize-route") {
        //If button is no longer the first button, move the button to the first position
            parentElement.insertBefore(document.getElementById("maps-optimize-route"), parentElement.firstChild);
    }
}


function init() {
    AddRouteButton(); // Call immediately

    setInterval(AddRouteButton, 500); // Call every 500 milliseconds
}

init();