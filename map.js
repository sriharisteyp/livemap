
var map = L.map("map").setView([8.5241, 76.9366], 8); // Default view centered on Trivandrum Beach
      var manualZoom = false; // Flag to track manual zoom

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      var userIcon = L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      var arrowIcon = L.divIcon({
        className: "arrow-icon",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        html: '<img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" style="transform: rotate(0deg);">',
      });

      var userMarker = L.marker([0, 0], { draggable: true, icon: userIcon })
        .addTo(map)
        .bindPopup("Your Location");

      var arrowMarker = L.marker([0, 0], { icon: arrowIcon }).addTo(map);

      var destinationMarkers = [];

      var routingControl;
      var plannedRoute;
      var roundaboutAlertThreshold = 0.05;

      function onMarkerDrag(e) {
        var marker = e.target;
        var position = marker.getLatLng();
        checkOffRoute(position);
        calculateRoute(position.lat, position.lng);
      }

      userMarker.on("dragend", onMarkerDrag);

      function addDestinationMarker(lat, lng, placeName, description, images) {
        var destinationMarker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup(createPopupContent(placeName, description, images));
        destinationMarkers.push(destinationMarker);
      }

      function removeDestinationMarkers() {
        destinationMarkers.forEach(function (marker) {
          map.removeLayer(marker);
        });
        destinationMarkers = [];
      }

      function calculateRoute(destLat, destLng) {
        if (routingControl) {
          map.removeControl(routingControl);
        }
        removeDestinationMarkers();
        routingControl = L.Routing.control({
          waypoints: [
            L.latLng(userMarker.getLatLng().lat, userMarker.getLatLng().lng),
            L.latLng(destLat, destLng),
          ],
          routeWhileDragging: true,
          show: false, // Hide the control by default
          createMarker: function (i, waypoint, n) {
            if (i === 0) {
              // Start marker
              return L.marker(waypoint.latLng, {
                icon: userIcon,
              });
            } else {
              // End marker
              return L.marker(waypoint.latLng, {
                icon: L.divIcon({
                  className: "leaflet-div-icon",
                  html: '<img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" style="transform: rotate(0deg);">',
                }),
              });
            }
          },
        }).addTo(map);

        plannedRoute = routingControl.getWaypoints();
        routingControl.getPlan().setWaypoints(plannedRoute);
        routingControl.getPlan().setRouteMode("driving");
        routingControl._line.bringToFront();
        speakDirections(routingControl.getRouter());
      }

      function onPlaceSelected() {
        var selectedPlace = document.getElementById("places").value.split(",");
        var destLat = parseFloat(selectedPlace[0]);
        var destLng = parseFloat(selectedPlace[1]);

        var placeName =
          document.getElementById("places").options[
            document.getElementById("places").selectedIndex
          ].text;
        var description = "Brief information about " + placeName;
        var images = [
          "https://via.placeholder.com/150",
          "https://via.placeholder.com/150",
        ];

        calculateRoute(destLat, destLng);
        showPopup(destLat, destLng, placeName, description, images);
      }

      function showPopup(lat, lng, placeName, description, images) {
        var popup = L.popup({
          closeButton: false,
          maxWidth: 300,
        })
          .setLatLng([lat, lng])
          .setContent(createPopupContent(placeName, description, images))
          .openOn(map);
      }

      function createPopupContent(placeName, description, images) {
        var content = '<div class="popup-content">';
        content += "<h3>" + placeName + "</h3>";
        content += "<p>" + description + "</p>";

        images.forEach(function (image) {
          content +=
            '<img class="popup-image" src="' +
            image +
            '" alt="' +
            placeName +
            '">';
        });

        content += '<button onclick="startRouting()">Start</button>';
        content += "</div>";

        return content;
      }

      function checkOffRoute(currentPosition) {
        if (!plannedRoute) return;

        var currentPoint = L.latLng(currentPosition.lat, currentPosition.lng);
        var closestPointOnRoute = L.GeometryUtil.closest(
          map,
          plannedRoute,
          currentPoint
        );
        var distance = currentPoint.distanceTo(closestPointOnRoute.latLng);

        if (distance > roundaboutAlertThreshold) {
          alert("You are off-route!");
        }
      }

      function speakDirections(router) {
        var instructions = router._instructions;
        var speechUtterance = new SpeechSynthesisUtterance();

        if (instructions.length > 0) {
          speechUtterance.text = "Starting route. ";
          instructions.forEach(function (instruction) {
            speechUtterance.text += instruction + ". ";
          });

          window.speechSynthesis.speak(speechUtterance);
        }
      }

      function startRouting() {
        if (routingControl) {
          routingControl.route();
        }
      }

      navigator.geolocation.getCurrentPosition(
        function (position) {
          var userLat = position.coords.latitude;
          var userLng = position.coords.longitude;
          userMarker.setLatLng([userLat, userLng]);
          arrowMarker.setLatLng([userLat, userLng]);

          if (!manualZoom) {
            map.setView([userLat, userLng]);
          }

          // Get user's heading and rotate the arrow icon
          if (position.coords.heading) {
            var heading = position.coords.heading;
            var icon = arrowIcon.options.html;
            icon = icon.replace(
              /rotate\(\d+deg\)/,
              "rotate(" + heading + "deg)"
            );
            arrowIcon.options.html = icon;
            arrowMarker.setIcon(arrowIcon);
          }
        },
        function (error) {
          console.error("Error getting user location:", error.message);
        }
      );

      map.on("zoom", function () {
        manualZoom = true;
      });

      setInterval(updateUserLocation, 5000);
      updateUserLocation();