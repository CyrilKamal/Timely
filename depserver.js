const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyA0JImnEIWWiKcxMd2vgx1M5qK3jeRNd4c',
  Promise: Promise
});



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



// defining an endpoint to return all ads
app.get('/', (req, res) => {
  res.send('default get route');
});

// defining an endpoint to return all ads
app.post('/ol', (req, res) => {
  let reqList = req.body.splitAddressList;
  //console.log(reqList)
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
    waypts.push(element);
  }


  //origin = '"' + origin + '"'
  //destination = '"' + destination + '"'
  console.log(origin)
  console.log(destination)
  console.log(waypts)
  let preTimeInMinutes = 0;

  googleMapsClient.directions({ origin: origin, destination: destination, waypoints: waypts, mode: "driving" })
    .asPromise()
    .then((preOptResponse) => {
      const preOptRoute = preOptResponse.json.routes[0];
      const preTimeInSeconds = preOptRoute.legs.reduce((acc, leg) => acc + leg.duration.value, 0);
      preTimeInMinutes = preTimeInSeconds / 60;
      console.log('pretime:' + preTimeInMinutes);

      return googleMapsClient.directions({ origin: origin, destination: destination, waypoints: waypts, optimize: true, mode: "driving" })
        .asPromise();
    })
    .then((postOptResponse) => {
      const postOptRoute = postOptResponse.json.routes[0];
      const postTimeInSeconds = postOptRoute.legs.reduce((acc, leg) => acc + leg.duration.value, 0);
      const postTimeInMinutes = postTimeInSeconds / 60;
      console.log('post time' + postTimeInMinutes);

      const routeOrder = postOptResponse.json.routes[0].waypoint_order;
      const output = routeOrder.map(i => reqList[i]);
      origin = origin.replaceAll(' ', '+');
      destination = destination.replaceAll(' ', '+');
      output.unshift(origin);
      output.push(destination);
      let urlstr = output.join('_');
      urlstr = urlstr.replaceAll('_', '/');
      urlstr = "https://www.google.com/maps/dir/" + urlstr;
      let diff = preTimeInMinutes - postTimeInMinutes;
      const hours = Math.floor(diff / 60);
      const minutes = Math.round(diff % 60);
      const formattedTime = `${hours} hr ${minutes} min`;
      res.send({ link: urlstr, timeDifference: formattedTime });
    })
    .catch((err) => {
      if (err.json && err.json.status) {
        console.log(err.json.status);
      } else {
        console.log('Error:', err);
      }
    });
  /* googleMapsClient.directions({origin: origin, destination: destination, waypoints:waypts, optimize:true, mode: "driving"})
      .asPromise()
      .then((response) => {
      //console.log(response)
      //console.log(response.json.routes[0].waypoint_order)
      const route = response.json.routes[0];
      const preTimeInSeconds = route.legs.reduce((acc, leg) => acc + leg.duration.value, 0);
      const preTimeInMinutes = preTimeInSeconds / 60;
      console.log(preTimeInMinutes);
      const routeOrder = response.json.routes[0].waypoint_order;
      for(let i = 0; i < reqList.length; i++){
        reqList[i] = reqList[i].replaceAll(' ', '+');
      }
      const output = routeOrder.map(i => reqList[i]);
      origin = origin.replaceAll(' ', '+');
      destination = destination.replaceAll(' ', '+');
      output.unshift(origin)
      output.push(destination)
      let urlstr = output.join('_')
      urlstr = urlstr.replaceAll('_', '/')
      urlstr = "https://www.google.com/maps/dir/" + urlstr
      urlstr = JSON.stringify(urlstr)
      res.send(urlstr);
      })
      .catch((err) => {
      console.log(err.json.status);
      }); */

  // client
  //   .directions({
  //     params: {
  //       origin: origin,
  //       destination: destination, //{placeId: "ChIJh1a5WhEMa0gRY1JU4PEam8Q"},
  //       waypoints: waypts,
  //       optimize: true,
  //       travelMode: 'DRIVING',
  //       key: process.env.GOOGLE_MAPS_API_KEY
  //     },
  //     timeout: 10000, // milliseconds
  //   })
  //   .then((r) => {
  //     console.log("got r")
  //     const routeOrder = r.data.routes[0].waypoint_order;
  //     for(let i = 0; i < reqList.length; i++){
  //       reqList[i] = reqList[i].replaceAll(' ', '+');
  //     }
  //     const n = reqList.length
  //     reorder(reqList, routeOrder, n)
  //     console.log(reqList)
  //   })
  //   .catch((e) => {
  //     console.log('Directions request failed due to ' + e);
  //     for (var key in e.config.data) {
  //       if (e.config.data.hasOwnProperty(key)) {
  //           console.log(key)
  //       }
  //   }
  //   });


});

app.listen(process.env.PORT || port, () => console.log(`listening on port ${port}`))

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