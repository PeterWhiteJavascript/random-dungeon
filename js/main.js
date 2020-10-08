$(function() {
var Q = window.Q = Quintus({audioSupported: ['mp3','ogg','wav']}) 
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio, GenerateMap, Animations, Viewport, Utility, Music, Objects, Stages")
        .setup("quintus", {development:true, width:$("#content-container").width(), height:$("#content-container").height()})
        .touch()
        .controls(true)
        .enableSound();

Q.input.drawButtons = function(){};
Q.setImageSmoothing(false);

//Since this is a top-down game, there's no gravity
Q.gravityY = 0;
//The width of the tiles
Q.tileW = 32;
//The height of the tiles
Q.tileH = 32;
//Astar functions used for pathfinding
Q.astar = astar;
//A necessary component of Astar
Q.Graph = Graph;

//Load all of the assets that we need. We should probably load bgm only when necessary as it takes several seconds per file.
var toLoad = [];
var fileKeys = Object.keys(GDATA);

let SEED = Math.random();
console.log("This game is running off of initial seed " + SEED + ".");
//Math.seedrandom(0.52339);
//Math.seedrandom(0.9520442834654275);


//TEMP: don't load music on every page refresh. Music also won't be loaded unless enabled, so if it's set to off, then loading times while testing will be great.
delete GDATA["bgm"];
GDATA.saveFiles["save-file1.json"].options.musicEnabled = true;

for(var i=0;i<fileKeys.length;i++){
    var files = GDATA[fileKeys[i]];
    if(Array.isArray(files)){
        toLoad.push(files);
        delete GDATA[fileKeys[i]];
    }
}
Q.load(toLoad.join(","),function(){
    Q.MenuController = new Q.menuController();
    Q.SaveFile = GDATA.saveFiles["save-file1.json"].files[0];
    Q.CharacterController = new Q.characterController();
    Q.CharacterController.setParty();
    Q.DataController = new Q.dataController();
    Q.TimeController = new Q.timeController();
    Q.TimeController.on("timeChanged", Q.DataController.updateFish);
    Q.TimeController.on("timeChanged", Q.DataController.updateTemperature);
    
    Q.Inventory = new Q.inventory();
    Q.Inventory.setOptions();
    Q.AudioController = new Q.audioController();
    Q.FishingController = new Q.fishingController();
    Q.MapGen = new Q.mapGenerator();
    Q.OptionsController = new Q.optionsController();
    Q.OptionsController.options = GDATA.saveFiles["save-file1.json"].options;
    Q.TextProcessor = new Q.textProcessor();
    
    
    Q.assets["characters.json"] = GDATA.dataFiles["characters.json"];
    Q.assets["ui-objects.json"] = GDATA.dataFiles["ui-objects.json"];
    Q.assets["sprites.json"] = GDATA.dataFiles["sprites.json"];
    Q.setUpAnimations();
    
    let startWorld = Q.MapGen.createWorld("Farming");
    
    Q.DataController.worlds.push(startWorld);
    
   // startWorld.playerSpawn = [57, 78];
    Q.DataController.travelToWorld(startWorld);
    
    Q.stageScene("hud", 1);
    /*setTimeout(function(){
        Q.stage(0).pause();
        Q.DataController.cycleDay();
    }, 1000);*/
   //Q.stage().lists.Door[4].enter();
   /* setTimeout(function(){
        Q.stage().lists.Ladder[0].enter();
    }, 100);*/
    /*Q.stage(0).pause();
    Q.stageScene("shop", 2, {items:Q.MenuController.getSaleItems([100, 101, 100, 101, 100, 101, 100, 101])});
    
    Q.stage(0).pause();
    Q.stageScene("dialogue", 2, {dialogue:[{text: "Would you like to go to sleep for the night?"},{options:[{text:"Yes", func:"goToSleep"}, {text:"No", func:"exitMenu"}]}]});
    
    */
});
//Q.debug = true;
});