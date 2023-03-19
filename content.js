var isButtonEnabled = false;

function AddRouteButton() {
    console.log("extension executed!");
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
                alert("\"Optimize Route\" button clicked!")
            });


            var span = document.createElement('span');
            span.setAttribute('class', 'tXNTee L6Bbsd T7HQDc');

            var div = document.createElement('div');
            div.setAttribute('class', 'OyjIsf');

            var img = document.createElement('img');
            img.setAttribute('class', 'k48Abe');
            img.setAttribute('alt', '');
            img.setAttribute('draggable', 'false');
            img.setAttribute('src', '//maps.gstatic.com/consumer/images/icons/2x/search_grey800_18dp.png');

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


