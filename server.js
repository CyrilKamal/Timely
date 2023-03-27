const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const {Client} = require("@googlemaps/google-maps-services-js");
const client = new Client({});

process.env.GOOGLE_MAPS_API_KEY = 'AIzaSyA0JImnEIWWiKcxMd2vgx1M5qK3jeRNd4c'


const app = express()
// adding Helmet to enhance your Rest API's security
app.use(helmet());

// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// enabling CORS for all requests
app.use(cors());

// adding morgan to log HTTP requests
app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

function reorder(arr, index, n) {
  var temp = [...Array(n)];

  // arr[i] should be present at index[i] index
  for (var i = 0; i < n; i++) temp[index[i]] = arr[i];

  // Copy temp[] to arr[]
  for (var i = 0; i < n; i++) {
    arr[i] = temp[i];
    index[i] = i;
  }
}

// defining an endpoint to return all ads
app.get('/', (req, res) => {
  res.send('default get route');
});

// defining an endpoint to return all ads
app.post('/ol', (req, res) => {
  
  res.send('posting to ol endpoint');
  let reqList = req.body.splitAddressList;
  console.log(reqList)
  let origin = reqList[0];
  const lastIndex = reqList.length - 1;
  let destination = reqList[lastIndex];
  reqList.shift()
  reqList.pop()
  console.log(reqList)
  origin = origin.replaceAll('+', ' ');
  destination = destination.replaceAll('+', ' ');
  var waypts = [];
  for (let i = 0; i < reqList.length; i++) {
    let element = reqList[i].replaceAll('+', ' ');
    //element = '"' + element + '"'
    waypts.push({
      location: element,
      stopover: true
      });
}

console.log(waypts)
origin = "'" + origin + "'"
destination = "'" + destination + "'"
console.log(origin)
console.log(destination)
console.log(waypts)
client
  .directions({
    params: {
      origin: origin,
      destination: destination, //{placeId: "ChIJh1a5WhEMa0gRY1JU4PEam8Q"},
      waypoints: waypts,
      optimize: true,
      travelMode: 'DRIVING',
      key: process.env.GOOGLE_MAPS_API_KEY
    },
    timeout: 10000, // milliseconds
  })
  .then((r) => {
    console.log("got r")
    const routeOrder = r.data.routes[0].waypoint_order;
    for(let i = 0; i < reqList.length; i++){
      reqList[i] = reqList[i].replaceAll(' ', '+');
    }
    const n = reqList.length
    reorder(reqList, routeOrder, n)
    console.log(reqList)
  })
  .catch((e) => {
    console.log('Directions request failed due to ' + e);
    for (var key in e.config.data) {
      if (e.config.data.hasOwnProperty(key)) {
          console.log(key)
      }
  }
  });


});

app.listen(3001, () => {
  console.log('listening on port 3001');
});

/**
  directionsService.route(request, function(response, status) {
  if (status === 'OK') {
    directionsDisplay.setDirections(response);
    const routeOrder = Object.values(response.routes[0].waypoint_order)
    for(let i = 0; i < cleanList.length; i++){
      cleanList[i].replaceAll(' ', '+');
    }
    const n = cleanList.length
    reorder(cleanList, routeOrder, n)
    console.log(cleanList)
  } else {
    window.alert('Directions request failed due to ' + status);
  }
})
 */