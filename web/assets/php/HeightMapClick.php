<?php

/* HeightMapClick.php
"THE BEER-WARE LICENSE" (Revision 42):
<tuomas.louhelainen@gmail.com> wrote this file.  As long as you retain
this notice you can do whatever you want with this stuff. If we meet
some day, and you think this stuff is worth it, you can buy me a beer
in return.  Tuomas Louhelainen 

Description:
This takes json formatted POST data from HeightMap.js and writes that data to HeightMapMarkerClick.json -file overwriting the previous

*/

	//file to write
	$jsonFile = "../json/HeightMapMarkerClick.json";
	$x = $_POST['x'];
	$y = $_POST['y'];
	$z = $_POST['z'];
	$timestamp = $_POST['timestamp'];
	$clickData = array(
		"x"=> $x,
		"y"=> $y,
		"z"=> $z,
		"timestamp"=>$timestamp
		);
	
	$jsondata = json_encode($clickData, JSON_PRETTY_PRINT);

	if(file_put_contents($jsonFile, $jsondata)) {
        echo 'Data successfully saved';
    }
   	else 
        echo "error";
?>