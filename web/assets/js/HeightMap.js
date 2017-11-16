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


 	var heightmap;
    var heightMapMarkers;
    var heightMapRendering;
    

    var heightIcon = L.icon({
          iconUrl: 'assets/img/pin.png',
          iconSize: [16, 16],
          iconAnchor: [8, 16],
      });

    var jsonUpdater = setInterval(loadHeightMap, 10000);

    init();
    function init()
    {
      heightMapRendering = false;
      heightMapMarkers = L.layerGroup();
      loadHeightMap();
    }
    
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
      
      for(var x in heightmap)
  		{
  			for(var y in heightmap[x])
  			{
  			  var markerPosition = map.unproject(convertCoord([Number(x),Number(y)]),map.getMaxZoom());
  			  var marker = L.marker([markerPosition.lat, markerPosition.lng],{icon: heightIcon});  
  			  marker.bindPopup(x+","+y+","+heightmap[x][y]);
  			  heightMapMarkers.addLayer(marker);
  			  heightMapMarkerCount++;
  			}
  		}
  		toggleMarkers(heightMapRendering);
    }

    function toggleHeightMap()
    {
      heightMapRendering = !heightMapRendering;
      createHeightMapMarkers();
    }

    function toggleMarkers(bool)
    {
      if(bool)
        map.addLayer(heightMapMarkers);
      else
        map.removeLayer(heightMapMarkers);
    }
    
