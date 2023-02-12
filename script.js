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
    if (index == messageList.length-1) {
        index = 0;
    } else {
        index = index + 1;
    }
}