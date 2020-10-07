<?php
/* 
 * This file loads most game data for the main game (GameDataLoader.php in the event edtor loads an incomplete list of files as not all are necessary in the editor)
 * For non-data files, it generates a list of the files in each directory for client-side loading in the GDATA object
 * This file does not load event data files as those are loaded when needed 
 * This file does not load maps as those are loaded when needed
 * This file does not load tiles as those are loaded when loading the .tmx file in game
 * This file does not load save data as that is loaded in index.php
*/

$dataDirectories = [
    ["data/","dataFiles"],
    ["save/","saveFiles"]
];
$otherDirectories = [
    ["images/sprites/","sprites"],
    ["images/tiles/","tiles"],
    ["images/ui/","ui"],
    ["js/","js"],
    ["audio/sfx/","sfx"],
    ["audio/bgm/","bgm"]
];
$data = (object)[];
foreach(array_merge($dataDirectories, $otherDirectories) as $key => $value){
    $path = $value[0];
    $name = $value[1];
    $dh = opendir($path);
    $decode = $key<count($dataDirectories);
    $dirData = $decode ? (object)[] : [];
    while($file = readdir($dh)) {
        if ($file === '.' || $file === '..') { continue; }
        //Decode the file if it's data, otherwise make the list to be loaded in client
        $decode ? $dirData -> $file = json_decode(file_get_contents($path . $file)) : $dirData[] = substr($path, strpos($path, "/") + 1).$file;
    }
    $data -> $name = $dirData;
}
?>
<!--Libraries-->
<script src='lib/quintus.js'></script>
<script src='lib/quintus_sprites.js'></script>
<script src='lib/quintus_scenes.js'></script>
<script src='lib/quintus_input.js'></script>
<script src='lib/quintus_anim.js'></script>
<script src='lib/quintus_2d.js'></script>
<script src='lib/quintus_touch.js'></script>
<script src='lib/quintus_ui.js'></script>
<script src='lib/quintus_audio.js'></script>
<script src="lib/astar.js"></script>
<script src="lib/jquery-3.1.1.js"></script>
<script src="lib/jquery-ui.min.js"></script>
<script src="lib/seedrandom.min.js"></script>
<?php
foreach($data -> js as $file ){
?>
    <script src="js/<?php echo $file ?>"></script>
<?php
}
unset($data->js);
?>
<script>
    var GDATA = <?php echo json_encode($data); ?>;
</script>