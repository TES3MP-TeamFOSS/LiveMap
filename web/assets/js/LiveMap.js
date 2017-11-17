/* LiveMap.js
"THE BEER-WARE LICENSE" (Revision 42):
<tuomas.louhelainen@gmail.com> wrote this file.  As long as you retain
this notice you can do whatever you want with this stuff. If we meet
some day, and you think this stuff is worth it, you can buy me a beer
in return.  Tuomas Louhelainen */


//This is the web-part of LiveMap -script that renders tes3mp players on zoomable map

//Usage:
//Ensure that you have installed LiveMap.lua in the correct place with correct configurations.
//Ensure that json-path is set in the LiveMap.lua.

//Change this to point to the same place as LiveMap.lua
var liveMapJsonPath = "assets/json/LiveMap.json";
//This controls json update and marker update cycle in ms, change this to your liking
var updateTime = 200;

    //extensions
    //HeightMap.js is needed for this to work
    var isHeightMapEnabled = false;



    var markers = {};
    var players;
    var zooming = false;
    var showPlayerList = true;
    var markerToFollow = null;
    var playerToFollow = null;

    var playerListDiv = document.getElementById("playerList");

     var map = L.map('map', {
       maxZoom: 18,
       minZoom: 11,
       crs: L.CRS.Simple
     }).setView([-0.045, 0.06], 14);

     var southWest = map.unproject([0, 25600], map.getMaxZoom());
     var northEast = map.unproject([28160, 0], map.getMaxZoom());
     map.setMaxBounds(new L.LatLngBounds(southWest, northEast));

     

    var currentZoom = map.getZoom();

     //player icon
     var playerIcon = L.icon({
       iconUrl: 'assets/img/compass.png',
       iconSize:     [currentZoom*2.2, currentZoom*2.2], // size of the icon
       iconAnchor:   [currentZoom*1.1, currentZoom*1.1], // point of the icon which will correspond to marker's location
     });

     //inside icon
     var insideIcon = L.icon({
       iconUrl: 'assets/img/door.png',
       iconSize:     [currentZoom, currentZoom], // size of the icon
       iconAnchor:   [currentZoom*0.5, currentZoom*0.5], // point of the icon which will correspond to marker's location
     });

    var jsonUpdater = setInterval(checkForUpdates, updateTime);

    //do not set this too low or ui becomes a bit unstable
    var playerListUpdater = setInterval(updatePlayerList, 1000);
    var browserSupportsWebp;

    init();

    function init()
    {
      checkWebpSupport();
    }

    function checkWebpSupport() {
      var html = document.documentElement,
      WebP = new Image();
      WebP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
      
      WebP.onload = WebP.onerror = function() {
          browserSupportsWebp = (WebP.height === 2);
          addTileLayersToMap();
      };
      
    }

    function addTileLayersToMap()
    {
      var tilePath = 'tiles/webp/{z}/map_{x}_{y}.webp';
      if(!browserSupportsWebp)
          tilePath = 'tiles/jpg/{z}/map_{x}_{y}.jpg';
      
      L.tileLayer(tilePath, {
       attribution: 'Map data &copy; Bethesda Softworks',
     }).addTo(map);
    }

    function checkForUpdates() {
      loadJSON(liveMapJsonPath+"?nocache="+(new Date()).getTime(), function(response) {
      players = JSON.parse(response);
      if(!zooming)
        updateMarkers();
      });
    }

     function updateMarkers() {
        var markersToDelete = Object.assign({}, markers);
        for(var key in players)
        {
          if(!players.hasOwnProperty(key)) continue;

          var player = players[key];
          var markerObject = [];
           //check if we have marker for this index
            if(key in markers)
            {
              markerObject = markers[key];
              if(player.isOutside)
              {
                var newPos = map.unproject(convertCoord([player.x,player.y]),map.getMaxZoom());
                if(newPos.lat!=markerObject.marker.getLatLng().lat)
                {
                  markerObject.marker.setLatLng(newPos);
                }

                markerObject.marker.setRotationAngle(player.rot);
                if(!markerObject.isOutside)
                {
                  markerObject.marker.setIcon(playerIcon);
                  markerObject.isOutside = true;
                }
              }
              else if(markerObject.isOutside)
              {
                markerObject.marker.setIcon(insideIcon);
                markerObject.marker.setRotationAngle(0);
                markerObject.isOutside = false;
              }
              delete markersToDelete[key];
            }
            //if not then create new and add that
            else
            {
              var tempMarker = L.marker(map.unproject(convertCoord([player.x,player.y]),map.getMaxZoom()), {icon: playerIcon}).addTo(map);
              markerObject.marker = tempMarker;
              markerObject.marker.setRotationAngle(player.rot);
              markerObject.marker.bindTooltip(key,{className: 'tooltip', direction:'right', permanent:true});
              markers[key] = markerObject;
            }
            centerOnMarker();
         }
         //loop through markers that we need to remove
         for(var key in markersToDelete)
         {
            //remove following
            if(playerToFollow==key)
            {
              resetFollow();
            }
            //remove the marker
            map.removeLayer(markersToDelete[key].marker);
            //remove the object from marker-list
            delete markers[key];
         }
   };

     function updatePlayerList() {
        if(showPlayerList)
        {
          var playerCount = 0;
          for(var key in players)
          {
            playerCount++;
          }
          if(playerCount>0)
          {
            //playerListDiv.setAttribute("style","height:"+(60+(25*playerCount))+"px");
            playerListDiv.innerHTML = '<h3>'+playerCount+' players online</h3>';
            for(var key in players)
            {
              var playerString = "";
              if(playerToFollow!=null)
                if(key==playerToFollow)
                  playerString = "Following: ";
              playerString += "<b>"+key+"</b>";
              if(!players[key].isOutside)
                playerString+= " - "+players[key].cell.substring(0,48);
              playerListDiv.innerHTML += '<a class="playerName" onClick="playerNameClicked(\''+key+'\')"; style="cursor: pointer">'+playerString+'</a><br />';
            }
            if(playerToFollow!=null)
              playerListDiv.innerHTML += '<br /><a class="resetZoom" onClick="resetFollow()"; style="cursor: pointer">Reset follow</a>';
          }
          else
          {
            playerListDiv.setAttribute("style","height:60px");
            playerListDiv.innerHTML = '<h3>No players online</h3>';
          }
          if(isHeightMapEnabled)
              playerListDiv.innerHTML += '<br /><a class="toggleButton" onClick="toggleHeightMap()"; style="cursor: pointer">Toggle heightmap markers</a><br />';
          playerListDiv.innerHTML += '<br /><a class="toggleButton" onClick="toggleList()"; style="cursor: pointer">Hide menu</a><br />';
        }
        else
        {
          playerListDiv.innerHTML = '<br /><a class="toggleButton" onClick="toggleList()"; style="cursor: pointer">Open menu</a><br />';
        }


     };

    function playerNameClicked(key) {
      var marker = markers[key].marker;
      playerToFollow = key;
      markerToFollow = marker;
      centerOnMarker();
      updatePlayerList();
    };

    function toggleList()
    {
      showPlayerList = !showPlayerList;
      updatePlayerList();
    }

    function resetFollow()
    {
      markerToFollow = null;
      playerToFollow = null;
      updatePlayerList();
    }

    function centerOnMarker()
    {
      if(markerToFollow!=null)
      {
        var latLng = markerToFollow.getLatLng();
        map.panTo(latLng,{animate:true,duration:0.05});
      }
    }

    map.on("zoomstart", function () {
     zooming = true; });

    map.on('zoomend', function() {
      zooming = false;

      var currentZoom = map.getZoom();

      playerIcon = L.icon({
        iconUrl: 'assets/img/compass.png',
        iconSize:     [currentZoom*2.2, currentZoom*2.2], // size of the icon
        iconAnchor:   [currentZoom*1.1, currentZoom*1.1], // center of the icon which will correspond to marker's location
      });

      //inside icon
      insideIcon = L.icon({
        iconUrl: 'assets/img/door.png',
        iconSize:     [currentZoom, currentZoom], // size of the icon
        iconAnchor:   [currentZoom*0.5, currentZoom*0.5], // center of the icon which will correspond to marker's location
      });
      updateMarkers();
      refreshAllMarkers();
    });

    function refreshAllMarkers()
    {
      var temp = 0;
       for(var key in markers)
       {
          if(markers[key].isOutside)
          {
            markers[key].marker.setIcon(playerIcon);
          }
          else
          {
            markers[key].marker.setIcon(insideIcon);
            markers[key].marker.setRotationAngle(0);
          }
          temp++;
       }
       console.log("Refreshed "+temp+" markers");
    }

    function loadJSON(file, callback) {
      var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
      xobj.open('GET', file, true);
      xobj.onreadystatechange = function () {
       if (xobj.readyState == 4 && xobj.status == "200") {
         // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
         callback(xobj.responseText);
       }
      };
      xobj.send(null);
    }

    var coordinateMultiplier = 16.0;

    function convertCoord(coord)
    {
      coord[0] = coord[0]/coordinateMultiplier+15358;
      coord[1] = coord[1]/-coordinateMultiplier+15356;
      return coord;
    }

    function reverseCoord(coord)
    {
      coord[0] = coord[0]*coordinateMultiplier-15358;
      coord[1] = coord[1]*-coordinateMultiplier-15356;
      return coord;
    }

    var fontMax = 150, fontMin = 100;

      function sizeBodyFont() {
        var fontSize = ((screen.width / window.innerWidth) * 20);
        document.body.style.fontSize = Math.min(Math.max(fontSize,fontMin),fontMax) + '%';
      }

      sizeBodyFont();

      (function(el) {
        window.addEventListener('resize', sizeBodyFont);
      }())

  