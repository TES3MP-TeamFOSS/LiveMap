/* HeightMap.js
"THE BEER-WARE LICENSE" (Revision 42):
<tuomas.louhelainen@gmail.com> wrote this file.  As long as you retain
this notice you can do whatever you want with this stuff. If we meet
some day, and you think this stuff is worth it, you can buy me a beer
in return.  Tuomas Louhelainen */

//This is an optional add-on to the LiveMap that for now enables HeighMap marker rendering

//Usage:

//Add this line to the index.html just before </body>
/*

<script type="text/javascript" src="assets/js/HeightMap.js"></script>

*/
//and find
//isHeightMapEnabled = false;
//in LiveMap.js and change that to
//isHeightMapEnabled = true;
  
    //These can be changed
    //HeightMapClick.json location
    var clickJsonLocation = 'assets/json/HeightMapClick.json';
    //Post click data to HeightMapClick.php (requires php support)
    var phpPosting = true;    
    //viewport padding for showing markers, this is added for performance gain, default: -0.2 range -1-0 
    var markerPadding = -0.2;

    //Do not touch these
    var heightmap;
    var heightMapMarkers;
    var heightMapRendering;
    
    var heightIcon = L.icon({
          iconUrl: 'assets/img/pin.png',
          iconSize: [16, 16],
          iconAnchor: [8, 16],
      });

    init();
    function init()
    {
      heightMapRendering = false;
      heightMapMarkers = L.layerGroup();
      loadHeightMap();
    }
    
    var  markerCluster = L.markerClusterGroup(
        {
          disableClusteringAtZoom: map.getMaxZoom(),
          maxClusterRadius: 600,
          spiderfyOnMaxZoom: false,
          removeOutsideVisibleBounds: true,
          // When bulk adding layers, adds markers in chunks. Means addLayers may not add all the layers in the call, others will be loaded during setTimeouts
          chunkedLoading: true,
          chunkInterval: 200, // process markers for a maximum of ~ n milliseconds (then trigger the chunkProgress callback)
          chunkDelay: 50, // at the end of each interval, give n milliseconds back to system/browser
          chunkProgress: null,
          paddingValue: markerPadding,
        });

    function loadHeightMap()
    {
      loadJSON("assets/json/HeightMap.json?nocache="+(new Date()).getTime(), function(response) {
      heightmap = JSON.parse(response);
      createHeightMapMarkers()
     });
    }
   
    function createHeightMapMarkers()
    {
      var heightMapMarkerCount = 0;
      heightMapMarkers.clearLayers();
      markerCluster.clearLayers();
      for(var x in heightmap)
      {
        for(var y in heightmap[x])
        {
          var markerPosition = map.unproject(convertCoord([Number(x),Number(y)]),map.getMaxZoom());
          var marker = L.marker([markerPosition.lat, markerPosition.lng],{icon: heightIcon, iconAnchor:[8,8]});
          marker.x = Number(x),
          marker.y = Number(y);
          marker.z = Number(heightmap[x][y]);
          //attach click event
          if(phpPosting)
            marker.on('click', postDataToPHP);
          marker.on('mouseover', addHover);
          marker.bindPopup("x:"+x+",y:"+y+",z:"+heightmap[x][y]);
          heightMapMarkers.addLayer(marker);
          heightMapMarkerCount++;
          markerCluster.addLayer(marker);
        }
      }
    }

    function toggleHeightMap()
    {
      heightMapRendering = !heightMapRendering;
      toggleMarkers(heightMapRendering);
    }

    function toggleMarkers(bool)
    {
      if(bool)
        map.addLayer(markerCluster);
      else
        map.removeLayer(markerCluster);
    }

    function postDataToPHP(e)
    {
      var timestamp = Math.round(+new Date()/1000);
      $.post("assets/php/HeightMapClick.php", { "x":e.target.x, "y":e.target.y,"z":e.target.z,"timestamp":timestamp});
    }

    function addHover(e)
    {
      $(this._icon).addClass('heightMarkerZoom');
    }

