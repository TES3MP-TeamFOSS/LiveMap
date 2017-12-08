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

    //user configurable settings
    //json update and marker update time in ms
    var updateTime = 1000;
    //do map zoom to player when name is clicked
    var zoomToPlayerWhenClicked = true;
    //animated zooms, affects performance
    var animatedZoom = false;
     //player icon size relative to zoom
    var playerSizeModifier = 1.75;
    //use smoothing on marker movement
    var movementSmoothing = true;


    //extensions
    //HeightMap.js is needed for this to work
    var isHeightMapEnabled = false;
    
    //do not change anything after this point
    var markers = {};
    var players;
    var zooming = false;
    var showPlayerList = true;
    var markerToFollow = null;
    var playerToFollow = null;
    var fitPlayers = false;
    var isProgramaticZoom = false;
    var playerListDiv = document.getElementById("playerList");

    var map = L.map('map', {
      maxZoom: 20,
      minZoom: 11,
      crs: L.CRS.Simple
    }).setView([-0.045, 0.06], 13);

    var southWest = map.unproject([0, 102400], map.getMaxZoom());
    var northEast = map.unproject([112640, 0], map.getMaxZoom());
    map.setMaxBounds(new L.LatLngBounds(southWest, northEast));

    var currentZoom = map.getZoom();

    //player icon
    var playerIcon = L.icon({
      iconUrl: 'assets/img/compass.png',
      iconSize:     [currentZoom*playerSizeModifier, currentZoom*playerSizeModifier], // size of the icon
      iconAnchor:   [currentZoom*playerSizeModifier*0.5, currentZoom*playerSizeModifier*0.5], // point of the icon which will correspond to marker's location
      interactive:false
    });

    //inside icon
    var insideIcon = L.icon({
      iconUrl: 'assets/img/door.png',
      iconSize:     [currentZoom, currentZoom], // size of the icon
      iconAnchor:   [currentZoom*0.5, currentZoom*0.5], // point of the icon which will correspond to marker's location
      interactive:false
    });
    
    var browserSupportsWebp;

    init();

    function init()
    {
      checkWebpSupport();
      checkForUpdates();
      var jsonUpdater = requestInterval(checkForUpdates, updateTime);
      if(movementSmoothing)
        var markerUpdater = requestInterval(updateMarkers, updateTime);
      var playerListUpdater = requestInterval(updatePlayerList, 1000);
    }

    var startTime = Date.now();

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
        tileSize: 256,
        updateWhenZooming: false,
        maxZoom: 25,
        maxNativeZoom: 18,
        minZoom: 11,
        bounds: new L.LatLngBounds(southWest, northEast)
      }).addTo(map);
    }

    function checkForUpdates() {
     loadJSON(liveMapJsonPath+"?nocache="+(new Date()).getTime(), function(response) {
        var tempJson;
        try {
          players = JSON.parse(response);
        } catch (e) { 
          console.log("Json not updated!");          
        }
        if(!movementSmoothing)
          updateMarkers();
      });
    }

    function updateMarkers() {
      var markersToDelete = Object.assign({}, markers);
      for(var key in players)
      {
        //jump to next if player doesnt exist
        if(!players.hasOwnProperty(key)) 
          continue;
        var player = players[key];
        var markerObject = [];
        //check if we have marker for this index
        if(key in markers)
        { 
          markerObject = markers[key];
          if(player.isOutside)
          {
            var newPos = map.unproject(convertCoord([player.x,player.y]),map.getMaxZoom());
            //if we are using smoothing use the slideTo-function
            if(movementSmoothing)
            {
              markerObject.marker.slideTo(newPos,{
                duration: updateTime,
                startRotation: markerObject.marker.getRotationAngle(),
                endRotation: player.rot,
                keepAtCenter: (markerToFollow!=null && markerToFollow == markerObject.marker),
              });
            }
            else
            {
              markerObject.marker.setLatLng(newPos);
              markerObject.marker.setRotationAngle(player.rot);           
            }
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
          markerObject.marker.setRotationOrigin("center");
          markerObject.marker.bindTooltip(key,{className: 'tooltip', direction:'right', permanent:true});
          markers[key] = markerObject;
        }
      }
      //loop through markers that we need to remove
      for(var key in markersToDelete)
      {
        //remove following
        if(playerToFollow==key)
          resetFollow();
        //remove the marker
        map.removeLayer(markersToDelete[key].marker);
        //remove the object from marker-list
        delete markers[key];
      }

      if(fitPlayers)
        updateFit();
      if(playerToFollow!=null)
        centerOnMarker();
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
            if(fitPlayers)
              playerListDiv.innerHTML += '<br /><a class="resetZoom" onClick="toggleFitPlayers()"; style="cursor: pointer">Reset player fit</a>';
            else
              playerListDiv.innerHTML += '<br /><a class="resetZoom" onClick="toggleFitPlayers()"; style="cursor: pointer">Enable player fit</a>';

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
      fitPlayers = false;
      var marker = markers[key].marker;
      playerToFollow = key;
      markerToFollow = marker;
      if(zoomToPlayerWhenClicked)
        zoomToMarker();
      else
        centerOnMarker();
      updatePlayerList();
    };

    function toggleFitPlayers()
    {
      resetFollow();
      fitPlayers = !fitPlayers;
      if(fitPlayers)
        updateFit();
    }

    function updateFit()
    {
      var markerArray = [];
      for(var marker in markers)
      {
        markerArray.push(markers[marker].marker);
      }
      var group = new L.featureGroup(markerArray);
      isProgramaticZoom = true;
      map.fitBounds(group.getBounds().pad(0.1));
    }

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
      if(zoomToPlayerWhenClicked)
      {
        map.setView([-0.045, 0.06], 13);
      }

    }

    function centerOnMarker()
    {
      if(markerToFollow!=null)
      {
        var latLng = markerToFollow.getLatLng();
        map.panTo(latLng,{animate:true,duration:0.05});
      }
    }

    function zoomToMarker()
    {
      if(markerToFollow!=null)
      {
        isProgramaticZoom = true;
         var latLng = markerToFollow.getLatLng();
        if(animatedZoom)
        {
          map.flyTo(latLng, 18,{animate:true, duration:1.0}); 

        }
        else
          map.setView(latLng,map.getMaxZoom());
      }
    }

    map.on("zoomstart", function () {
      if(!isProgramaticZoom)
      {
        if(fitPlayers)
        {
          fitPlayers = false;
        }
      }
     zooming = true; });

    map.on('zoomend', function() {
      zooming = false;

      currentZoom = map.getZoom();

      playerIcon = L.icon({
        iconUrl: 'assets/img/compass.png',
        iconSize:     [currentZoom*playerSizeModifier, currentZoom*playerSizeModifier], // size of the icon
        iconAnchor:   [currentZoom*playerSizeModifier*0.5, currentZoom*playerSizeModifier*0.5], // point of the icon which will correspond to marker's location
      });

      //inside icon
      insideIcon = L.icon({
        iconUrl: 'assets/img/door.png',
        iconSize:     [currentZoom, currentZoom], // size of the icon
        iconAnchor:   [currentZoom*0.5, currentZoom*0.5], // center of the icon which will correspond to marker's location
      });
      isProgramaticZoom = false;
      updateMarkers();
      refreshAllMarkerIcons();
    });

    function refreshAllMarkerIcons()
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
    
    var coordinateMultiplier = 4.0;

    function convertCoord(coord)
    {
      coord[0] = coord[0]/coordinateMultiplier+61444;
      coord[1] = coord[1]/-coordinateMultiplier+61444;
      return coord;
    }

    function reverseCoord(coord)
    {
      coord[0] = coord[0]*coordinateMultiplier-61444;
      coord[1] = coord[1]*-coordinateMultiplier-61444;
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
    }());


    function randomRange(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function requestAnimFrame(fn){
    return window.requestAnimationFrame(fn) || setTimeout(callback, 1000 / 60);
    };


    function requestInterval(fn, delay) {
      if( !window.requestAnimationFrame && !window.webkitRequestAnimationFrame && !(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && !window.oRequestAnimationFrame && !window.msRequestAnimationFrame)
        return window.setInterval(fn, delay);
      var start = new Date().getTime(),
      handle = new Object();
      function loop() {
        var current = new Date().getTime(), delta = current - start;
        if(delta >= delay) {
          fn.call();
          start = new Date().getTime();
        }
        handle.value = requestAnimFrame(loop);
      };
      handle.value = requestAnimFrame(loop);
      return handle;
    };

    function requestTimeout(fn, delay) {
      
      if(!window.requestAnimationFrame && !window.webkitRequestAnimationFrame && !(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && !window.oRequestAnimationFrame && !window.msRequestAnimationFrame)
        return setTimeout(fn,delay);
      var start = new Date().getTime(), handle = new Object();
      function loop(){
        var current = new Date().getTime(),
        delta = current - start;
        delta >= delay ? fn.call() : handle.value = requestAnimFrame(loop);
      };
      handle.value = requestAnimFrame(loop);
      return handle;
    };

     window.clearRequestTimeout = function(handle) {
      window.cancelAnimationFrame ? window.cancelAnimationFrame(handle.value) :
      window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame(handle.value) :
      window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
      window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame(handle.value) :
      window.oCancelRequestAnimationFrame ? window.oCancelRequestAnimationFrame(handle.value) :
      window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame(handle.value) :
      clearTimeout(handle);
      };

    window.clearRequestInterval = function(handle) {
      window.cancelAnimationFrame ? window.cancelAnimationFrame(handle.value) :
      window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame(handle.value) :
      window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
      window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame(handle.value) :
      window.oCancelRequestAnimationFrame ? window.oCancelRequestAnimationFrame(handle.value) :
      window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame(handle.value) :
      clearInterval(handle);
    };




    