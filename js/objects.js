Quintus.Objects = function(Q){
    Q.GameObject.extend("textProcessor",{
        evaluateStringConditional:function(vr, op, vl){
            switch(op){
                case "==": return vr == vl;
                case "!=": return vr != vl;
                case ">": return vr > vl;
                case "<": return vr < vl;
                case ">=": return vr >= vl;
                case "<=": return vr <= vl;
                case "set": return vl ? vr : !vr;
            }
        },
        getDeepValue:function(obj, path){
            for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
                obj = obj[path[i]];
            };
            return obj;
        },
        //Takes a string and evaluates anything within {} and then returns a new string
        replaceText:function(text){
            //Loop through each {}
            while(typeof text === "string" && text.indexOf("{") !== -1){
                text = text.replace(/\{(.*?)\}/,function(match, p1, p2, p3, offset, string){
                    return Q.TextProcessor.getVarValue(p1);
                });
            }
            return text;
           
        },
        getVarValue:function(text){
            var newText;
            var category = text[0];
            var prop = text.slice(text.indexOf("@")+1,text.length);
            switch(category){
                //{w@worldVariable}
                case "w":
                    newText = Q.DataController.currentWorld[prop];
                    break;
            }
            
            return newText;
        }
    });
    
    Q.GameObject.extend("menuController",{
        currentItem: false, 
        currentCont: false,
        returnToGame: function(){
            Q.player.p.canInput = true;
            Q.clearStage(2);
            Q.stage(0).unpause();
        },
        changeContainer: function(cont, noSound){
            let currentItem = Q.MenuController.currentItem;
            let currentCont = Q.MenuController.currentCont;
            currentCont.p.prevIdx = currentCont.p.saveIdx ? [currentItem[0], currentItem[1]] : [0, 0];
            currentItem = false;
            if(!noSound) Q.AudioController.playSound("change-menu.mp3");
            if(!currentCont.p.noDehover){
                currentCont.dehoverAll();
            } else {
                for(let i = 0; i < cont.p.menuButtons.length; i++){
                    for(let j = 0; j < cont.p.menuButtons[i].length; j++){
                        if(cont.p.menuButtons[i][j].p.fill === cont.p.menuButtons[i][j].p.selectedColour) currentItem = [j, i];
                    }
                }
            }
            Q.MenuController.currentCont = cont;
            if(!currentItem){
                Q.MenuController.currentItem = cont.p.prevIdx || [0, 0];
                Q.MenuController.adjustMenuPosition([0, 0]);
            }
        },
        keepInRange: function(coord){
            let currentItem = Q.MenuController.currentItem;
            currentItem[0] += coord[0];
            currentItem[1] += coord[1];
            let currentCont = Q.MenuController.currentCont;
            let buttons = currentCont.p.menuButtons;
            let maxX, maxY;
            
            function getMaxY(){
                let num = 0;
                for(let i = 0; i < buttons.length; i++){
                    if(buttons[i] && buttons[i][currentItem[0]]) num++;
                }
                return num - 1;
            }
            if(coord[0]) maxX = buttons[currentItem[1]].length - 1;
            if(coord[1]) maxY = getMaxY();
            if(currentItem[0] > maxX) return [0, currentItem[1]];
            if(currentItem[1] > maxY) return [currentItem[0], 0];
            if(currentItem[0] < 0) return [maxX, currentItem[1]];
            if(currentItem[1] < 0) return [currentItem[0], maxY];
            return currentItem;
        },
        adjustMenuPosition: function(coord){
            let currentItem = Q.MenuController.currentItem;
            let currentCont = Q.MenuController.currentCont;
            let buttons = currentCont.p.menuButtons;
            do {
                currentItem = Q.MenuController.keepInRange(coord);
            }
            while(!buttons[currentItem[1]][currentItem[0]]);
            buttons[currentItem[1]][currentItem[0]].hover();
            Q.MenuController.currentItem = currentItem;
        },
        acceptInputs: function(){
            if(Q.inputs["down"]){
                this.adjustMenuPosition([0, 1]);
                Q.AudioController.playSound("move-cursor.mp3");
                Q.inputs["down"] = false;
            } else if(Q.inputs["up"]){
                this.adjustMenuPosition([0, -1]);
                Q.AudioController.playSound("move-cursor.mp3");
                Q.inputs["up"] = false;
            }
            if(Q.inputs["left"]){
                this.adjustMenuPosition([-1, 0]);
                Q.AudioController.playSound("move-cursor.mp3");
                Q.inputs["left"] = false;
            } else if(Q.inputs["right"]){
                this.adjustMenuPosition([1, 0]);
                Q.AudioController.playSound("move-cursor.mp3");
                Q.inputs["right"] = false;
            }
            if(Q.inputs["interact"]){
                Q.MenuController.currentCont.interact(Q.MenuController.currentCont.p.menuButtons[Q.MenuController.currentItem[1]][Q.MenuController.currentItem[0]]);
                Q.inputs["interact"] = false;
            }
            if(Q.inputs["menu"]){
                Q.MenuController.currentCont.trigger("goBack", Q.MenuController.currentCont.p.prevCont);
                Q.inputs["menu"] = false;
            }
        },
        acceptInteract: function(){
            if(Q.inputs["interact"]){
                Q.inputs["interact"] = false;
                Q.MenuController.currentCont.trigger("interact");
            }
        },
        getSaleItems: function(data){
            let items = [];
            for(let i = 0; i < data.length; i++){
                let item = GDATA.dataFiles["map-gen.json"].objectProps[data[i]];
                item.quality = 1;
                item.tile = data[i];
                items.push(item);
            }
            return items;
        },
        //All functions that can happen when answering a question in a menu
        menuButtonInteractFunction:function(func, props, interactWith){
            let object, newDialogue;
            if(typeof func === "string"){
                switch(func){
                    case "exitMenu":
                        Q.MenuController.returnToGame();
                        break;
                    case "goToSleep":
                        Q.DataController.cycleDay();
                        break;
                    case "loadShop":
                        Q.stageScene("shop", 2, {items: Q.MenuController.getSaleItems(props)});
                        break;
                    case "loadSell":
                        Q.stageScene("sell", 2, {allowSell: props});
                        break;
                    case "loadHire":
                        Q.stageScene("hire", 2, {props: props, interactWith: interactWith});
                        break;
                    case "changeText":
                        object = Q.getObjectFromList(interactWith, Q.stage(0));
                        newDialogue = GDATA.dataFiles["map-gen.json"].npcProps[object.p.charType].speech[props[0]].dialogue;
                        Q.stage(0).objectsGrid[object.p.loc[1]][object.p.loc[0]].dialogue = newDialogue;
                        Q.MenuController.returnToGame();
                        break;
                    case "changeTextFluid":
                        object = Q.getObjectFromList(interactWith, Q.stage(0));
                        newDialogue = GDATA.dataFiles["map-gen.json"].npcProps[object.p.charType].speech[props[0]].dialogue;
                        Q.stage(0).objectsGrid[object.p.loc[1]][object.p.loc[0]].dialogue = newDialogue;
                        interactWith.dialogue = newDialogue;
                        return newDialogue;
                }
            } else {
                func();
            }
        },
        dialogueInteractFunction: function(item, objectData){
            let func = item.func;
            let props = item.props;
            let object = Q.getObjectFromList(objectData, Q.stage(0));
            switch(func){
                case "walkTo":
                    console.log("TODO: add autoMove component");
                    break;
                case "changeText":
                    Q.stage(0).objectsGrid[object.p.loc[1]][object.p.loc[0]].dialogue = GDATA.dataFiles["map-gen.json"].npcProps[object.p.charType].speech[props[0]].dialogue;
                    break;
                case "randomText":
                    return [item.props[0][~~(Math.random() * item.props[0].length)]];
                    break;
                case "getInfo":
                    let textString = "";
                    switch(props[0]){
                        case "lake":
                            let info = Q.DataController.currentWorld.info.lake;
                            let lakeSize = info.w * info.h;
                            let size = lakeSize < 150 ? "small" : lakeSize > 300 ? "large" : "medium sized";
                            let intro = "",
                                island = "",
                                dungeon = "";
                            if(info.length === 1){
                                intro = Q.DataController.currentWorld.name + " has 1 "+size+" lake."
                                island = info[0].hasIsland ? " There is an island in the middle" : "";
                                dungeon = info[0].hasDungeon ? " and there is a dungeon on it." : info[0].hasIsland ? "." : "";
                            } else {
                                intro = Q.DataController.currentWorld.name + " has "+info.length+" lakes.";
                                let numOfIslands = info.filter(function(lake){return lake.hasIsland;}).length;
                                let numOfDungeons = info.filter(function(lake){return lake.hasDungeon;}).length;
                                if(numOfIslands === 0){
                                    island = " There are no islands on "+(info.length === 2 ? "either" : "any")+" of the lakes.";
                                } else if(numOfIslands === 1){
                                    island = " There is an island on one of the lakes";
                                    if(numOfDungeons === 1){
                                        dungeon = " and it has a dungeon on it.";
                                    } else {
                                        island += ".";
                                    }
                                } else {
                                    island = " There are islands on " + (numOfIslands === 2 ? "both" : numOfIslands) + " of the lakes";
                                    if(numOfDungeons > 0){
                                        if(numOfDungeons === numOfIslands){
                                            if(numOfDungeons === 2){
                                                dungeon = " and they each have a dungeon on them.";
                                            } else {
                                                dungeon = " and all of the lakes have a dungeon on them.";
                                            }
                                        } else {
                                            if(numOfDungeons === 1){
                                                dungeon = " and " + numOfDungeons + " of the islands has a dungeon on it.";
                                            } else {
                                                dungeon = " and " + numOfDungeons + " of the islands have dungeons on them.";
                                            }
                                        }
                                    } else {
                                        island += ".";
                                    }
                                    
                                }
                                
                            }
                            textString = intro + island + dungeon;
                            return [textString];
                        case "festivals":
                            let text = [];
                            let festivals = Q.DataController.currentWorld.festivals;
                            if(festivals.length === 0){
                                text.push("There won't be any festivals in this town...");
                            } else if(festivals.length === 1){
                                text.push("We do a single festival here in "+Q.DataController.currentWorld.name+".");
                                text.push(" It's the " + festivals[0].name + " and it's on day "+festivals[0].day);
                            } else {
                                text.push("We put on "+festivals.length+" festivals here in "+Q.DataController.currentWorld.name+". ");
                                for(let i = 0; i < festivals.length; i++){
                                    text.push(festivals[i].name + " on day "+festivals[i].day+". ");
                                }
                            }
                            
                            return text;
                    }
                    break;
            }
        }
    });
    Q.GameObject.extend("dataController",{
        worlds:[
            
        ],
        currentMap: false,
        changeMap: function(map){
            //Can't remember why this is here. It messes up dungeons.
            //If we can match the maps, return the current map.
            //if((map.name && map.name === this.currentMap.name) || ((map.loc && this.currentMap.loc) && map.loc[0] === this.currentMap.loc[0] && map.loc[1] === this.currentMap[1])) return this.currentMap;
            //If the maps didn't match maybe do something different???
            this.currentMap = map;
            return this.currentMap;
        },
        addToTileLayer:function(tileLayer, loc, w, h, tile){
            for( let i = 0; i < h; i++){
                for( let j = 0; j < w; j++){
                    tileLayer.setTile(loc[0] + j, loc[1] + i, tile + j  + (i * 10));
                }
            }
        },
        //Adds to the passed in objectsGrid (matrix)
        addToObjects:function(map, loc, w, h, object){
            if(!loc) return;
            for( let i = 0; i < h; i++){
                for( let j = 0; j < w; j++){
                    map[loc[1] + i][loc[0] + j] = object;
                }
            }
        },
        changeObjectLoc:function(oldLoc, newLoc){
            let objLayer = Q.stage(0).lists.TileLayer[2];
            let tile = objLayer.p.tiles[oldLoc[1]][oldLoc[0]];
            objLayer.p.tiles[newLoc[1]][newLoc[0]] = tile;
            objLayer.p.tiles[oldLoc[1]][oldLoc[0]] = 0;
            oldLoc = newLoc;
        },
        removeObjectFromMap: function(item, objects, objectGrid, tileLayer){
            let startLoc = item.loc;
            for( let i = 0; i < item.h; i++){
                for(let j = 0; j < item.w; j++){
                    if(tileLayer) tileLayer.setTile(startLoc[0] + i, startLoc[1] + j, 0);
                    objectGrid[startLoc[1] + i][startLoc[0] + j] = 0;
                }   
            }
            //Find and remove from objs
            for(let i = objects.length - 1; i >= 0; i--){
                if(startLoc[0] === objects[i].loc[0] && startLoc[1] === objects[i].loc[1]){
                    objects.splice(i, 1);
                    return;
                };
            }
        },
        addObjectToMap:function (item, loc, objects, tileLayer, objectsGrid){
            item.loc = loc;
            this.addToTileLayer(tileLayer, loc, item.w, item.h, item.tile);
            this.addToObjects(objectsGrid, loc, item.w, item.h, item);
            objects.push(item);
        },
        offMap:function(map, sound){
            if(sound) Q.AudioController.playSound(sound);
            Q.inputs["left"] = false;
            Q.inputs["right"] = false;
            Q.inputs["up"] = false;
            Q.inputs["down"] = false;
            let playerDir = Q.stage(0).lists.Player[0].p.dir;
            map.playerDir = playerDir;
            Q.DataController.enterMainMap(map);
        },
        ascendLadder: function(){
            Q.stage(0).pause();
            Q.stageScene("dialogue", 2, {dialogue:["Would you like to return to the surface?" , 
                {options:[{text:"Yes", func:function(){
                    Q.DataController.dungeonHub.currentFloor = 0;
                    Q.stageScene("map", 0, {data: Q.DataController.currentDungeon});
                    Q.MenuController.returnToGame();
                    Q.AudioController.playSound("enter-door.mp3");
                }
            }, {text:"No", func:"exitMenu"}]}]});
            
        },
        descendLadder: function(ladder){
            let dungeon = ladder.dungeon || Q.DataController.dungeonHub;
            if(!Q.DataController.dungeonHub){
                Q.DataController.dungeonHub = dungeon;
                Q.DataController.currentMap.playerSpawn = Q.stage(0).lists.Player[0].p.loc;
                if(!Q.DataController.dungeonHub.deepestDive) Q.DataController.dungeonHub.deepestDive = 1;
            }
            Q.DataController.dungeonHub.currentFloor = Q.DataController.dungeonHub.currentFloor ? Q.DataController.dungeonHub.currentFloor + 1 : 1;
            
            if(Q.DataController.dungeonHub.deepestDive < Q.DataController.dungeonHub.currentFloor) Q.DataController.dungeonHub.deepestDive = Math.min(dungeon.depth, Q.DataController.dungeonHub.currentFloor);
            //On bottom floor
            if(Q.DataController.dungeonHub.currentFloor >= dungeon.depth){
                Q.stageScene("map", 0, {data:Q.DataController.currentDungeon.bottom});
            } 
            //Go to next floor
            else {
                let floor = {
                    loc: [0, 0],
                    w: dungeon.floorW, 
                    h: dungeon.floorH,
                    floorW: dungeon.floorW,
                    floorH: dungeon.floorH,
                    level: dungeon.level,
                    type: "dungeonFloor",
                    floor: Q.DataController.dungeonHub.currentFloor,
                    depth: dungeon.depth,
                    themeNum: Q.DataController.dungeonHub.themeNum,
                    beautifulPercentage: dungeon.beautifulPercentage,
                    rooms: dungeon.rooms
                };
                let interiorTiles1 = Q.createArray(0, floor.w, floor.h);
                let interiorTiles2 = Q.createArray(0, floor.w, floor.h);
                let interiorObjects = [];
                let chunk = Q.MapGen.insertChunks(interiorTiles1, interiorTiles2, interiorObjects, [floor], floor.w, floor.h, GDATA.dataFiles["map-gen.json"].themes[floor.themeNum])[0];
                let dungeonFloorData = {
                    loc: [floor.loc[0], floor.loc[1]], 
                    name:"Dungeon Floor "+Q.DataController.dungeonHub.currentFloor, 
                    map:{
                        ground1: interiorTiles1,
                        ground2: interiorTiles2, 
                        objects: interiorObjects,
                        specialTiles: [],
                        objectsGrid: Q.MapGen.generateObjectsGrid(interiorObjects, floor.w, floor.h)
                    },
                    chunks: [], 
                    playerSpawn: chunk.playerSpawn,
                    type: "dungeonFloor"
                };
                Q.stageScene("map", 0, {data: dungeonFloorData});
            }
        },
        enterDoor:function(door){
            Q.AudioController.playSound("enter-door.mp3");
            Q.DataController.currentMap.playerSpawn = Q.stage(0).lists.Player[0].p.lastLoc;
            door.playerDir = Q.stage(0).lists.Player[0].p.dir;
            door.lastMap = Q.DataController.currentMap;
            if(door.target === "outside"){
                Q.DataController.offMap(Q.DataController.currentMap.lastMap);
            } else {
                Q.stageScene("map", 0, {data: door});
                if(door.type === "farm"){
                    Q.AudioController.playMusic(Q.DataController.currentWorld.music.farm);
                } else if(door.type === "town" || door.type === "forest"){
                    Q.AudioController.playMusic(Q.DataController.currentWorld.music.town);
                } else if(door.type === "dungeon"){
                    Q.AudioController.playMusic(Q.DataController.currentWorld.music.dungeon);
                    Q.DataController.currentDungeon = door;
                }
            }
        },
        travelToWorld: function(world){
            //Do anything that needs to be done on day start (change locations of fishies)
            Q.DataController.startDay(world);
            
            Q.DataController.currentWorld = world;
            world.timesVisited ++;
            Q.stageScene("map", 0, {data: world});
            
            //When the player is in town, the music changes.
            Q.player.p.inTown = false;
            Q.AudioController.playMusic(Q.TimeController.getMapMusic(Q.DataController.currentWorld.music));
        },
        enterMainMap:function(map){
            Q.stageScene("map", 0, {data: map});
            Q.player.p.inTown = true;
            Q.player.trigger("atDest");
        },
        checkSpawnObjects: function(map, chunks){
            let ground = map.ground1;
            let ground2 = map.ground2;
            let objects = map.objects;
            let objectsNumber = Q.createArray(0, ground[0].length, ground.length);
            let objectsLayer = Q.createArray(0, ground[0].length, ground.length);
            for(let i = 0; i < objects.length; i++){
                let object = objects[i];
                objectsNumber[object.loc[1]][object.loc[0]] = object;
                Q.MapGen.addToMap(objectsLayer, object.loc, object.w, object.h, object.tile || -1);
            }
            for(let i = 0; i < chunks.length; i++){
                let chunk = chunks[i];
                let chunkData = Q.MapGen.getChunkData(chunk.type, chunk.idx);
                if(chunkData.spawnObject){
                    let objs = Q.getAllObjectsWithin(objectsNumber, chunk.loc, chunk.w, chunk.h);
                    //Filter out objects with an objType (these items are characters, doors, etc..)
                    objs = objs.filter(function(obj){return !obj.objType;});
                    //If there are less than 10 objects within this chunk, spawn some more.
                    if(objs.length < 10){
                        Q.MapGen.spawnObjects(chunkData.spawnObject, ground, ground2, objectsLayer, objects, chunk);
                    }
                }
            }
        },
        updateFish: function(time){
            if(time[1] === 2 || time[1] === 5){
                Q.MapGen.updateFishes(Q.DataController.currentWorld);
            }
        },
        updateTemperature: function(time){
            let world = Q.DataController.currentWorld;
            if(time[1] === 0){
                world.temperature ++;
            }
        },
        removeFromAnimatedTiles: function(category, loc){
            let stage = Q.stage(0);
            for(let i = stage.animatedTiles[category].length - 1; i >= 0; i--){
                if(stage.animatedTiles[category][i][0] === loc[0] && stage.animatedTiles[category][i][1] === loc[1]){
                    stage.animatedTiles[category].splice(i, 1);
                    break;
                }
            }
        },
        startDay: function(world){
            console.log(world)
            
            //TODO: Figure out the temperature based on the time of day and season.
            world.temperature = 9;
            
            let groundLayer = world.map.ground1;
            let groundLayer2 = world.map.ground2;
            let objects = world.map.objects;
            
            
            //Once the week is complete, spawn some more items.
            //This also occurs the first day that a world is visited as the current day will be 1.
            if(world.currentDay % 7 === 1){
                //Right now, only the main map can have spawn objects. If I were to add interiors having spawn objects, it'd go here.
                Q.DataController.checkSpawnObjects(world.map, world.chunks);
            }
            //Each day, spawn fish.
            Q.MapGen.spawnFishies(world.map, world.chunks, world.temperature);
        },
        //Change the day. Update ALL MAPS
        cycleDay: function(){
            //Revert watered and ground dug tiles, advance crops, do helper stuff, etc.. of all maps in a world (main, dungeon, dungeon bottom, inside places that can have spec tiles)
            function updateMap(world){
                let ground = world.map.ground1;
                let ground2 = world.map.ground2;
                let objects = world.map.objects;
                let specGround = world.map.specialTiles;
                let objectsGrid = world.map.objectsGrid;
                
                
                for(let i = objects.length - 1; i >= 0 ; i--){
                    let object = objects[i];
                    if(object.type === "plantedCrop"){
                        let groundTile = Q.getTile(ground[object.loc[1]][object.loc[0]]);
                        if(groundTile.type === "seedsInWateredSoil" || groundTile.type === "wateredSoil"){
                            ground[object.loc[1]][object.loc[0]] = object.tilled;
                            object.currentDay += 5;
                            let tileIdx = -1;
                            let idxTracker = 0;
                            for(let j = 0; j < object.days.length;j++){
                                if(object.currentDay > idxTracker){
                                    idxTracker += object.days[j];
                                    tileIdx ++;
                                }
                            }
                            if(object.currentDay > idxTracker){
                                ground[object.loc[1]][object.loc[0]] = 40;//Set to soil
                                let item = Q.MapGen.generateObject({tile: object.produces, w: 1, h: 1, loc: [0, 0]}, object.loc);
                                item.quality = object.quality;
                                objects[i] = item;
                                continue;
                            }
                            object.tile = object.stages[tileIdx];
                        }   
                    } else if(object.type === "dungeon"){
                        updateMap(object);
                        updateMap(object.bottom);
                    } else if(objects[i].animal === "Fish"){
                        Q.MapGen.removeFish(world.map, object);
                    }
                }
                for(let i = specGround.length - 1; i >= 0; i--){
                    ground[specGround[i].loc[1]][specGround[i].loc[0]] = specGround[i].revert;
                    specGround.splice(i, 0);
                }
                let helpers = world.helpers;
                if(helpers){
                    //TODO: get the result of this helper's job for this day (acquire items, etc..)
                    for(let i = 0; i < helpers.length; i++){
                        let helper = helpers[i];
                    }
                }
            }
            Q.AudioController.playSound("sleep-for-the-night.mp3");
            //Fade to black first (Or do some kind of sleeping animation? What about for passing out after 5?)
            let fader = Q.stage(1).insert(new Q.Fader());
            fader.on("finishedFadingIn", function(){
                let worlds = Q.DataController.worlds;
                for(let i = worlds.length - 1; i >= 0; i--){
                    updateMap(worlds[i]);
                    worlds[i].currentDay ++;
                }
                //Update the clock.
                Q.TimeController.finishDay();
                //Give the player more energy and health based on the currentTime
                Q.CharacterController.dayEnd();
                
                Q.DataController.currentMap.playerSpawn = Q.player.p.loc;
                Q.DataController.currentMap.playerDir = Q.player.p.dir;
                
                Q.DataController.currentWorld.day++;
                Q.DataController.startDay(Q.DataController.currentWorld);
                Q.stageScene("map", 0, {data: Q.DataController.currentMap});
            });
        }
    });
    Q.UI.Container.extend("Fader",{
        init: function(p){
            this._super(p, {
                opacity: 0.1,
                x:0, y: 0,
                cx:0, cy:0,
                w: Q.width,
                h: Q.height,
                fill: "black"
            });
            this.add("tween");
            this.fadeIn();
        },
        fadeIn: function(){
            Q.clearStage(2);
            this.animate({opacity: 1}, 3, Q.Easing.Quadratic.InOut, 
            {
                callback: function(){
                    this.trigger("finishedFadingIn");
                    this.fadeOut();
                }
            });
        },
        fadeOut: function(){
            this.animate({opacity: 0}, 1, Q.Easing.Quadratic.InOut, 
            {
                delay: 1,
                callback: function(){
                    this.destroy();
                    Q.stage(0).unpause();
                }
            });
        }
    });
    
    Q.component("walkOn",{
        added:function(){
            this.entity.p.tileCost = 1;
        }
    });
    Q.component("interactable",{
        added:function(){
            
        }
    });
    Q.component("animations",{
        added:function(){
            this.entity.on("playStand");
            this.entity.on("playWalk");
        },
        extend: {
            validateAnimation:function(anim, dir){
                dir = dir || this.p.dir;
                this.p.dir = dir;
                return this.p.animation !== (anim + dir) ? anim + dir : false;
            },
            playStand:function(dir){
                let anim = this.validateAnimation("standing", dir);
                if(anim) this.play(anim);
                
            },
            playWalk:function(dir){
                let anim = this.validateAnimation("walking", dir);
                if(anim) this.play(anim);
            }
        }
    });
    
    Q.component("playerControls",{
        added:function(p){
            var p = this.entity.p;
            if(!p.stepDistance) { p.stepDistance = Q.tileH; }
            if(!p.stepDelay) { p.stepDelay = 0.3; }
            p.stepWait = 0;
            p.diffX = 0;
            p.diffY = 0;
            p.inputs = Q.inputs;
            p.canInput = true;
            p.prevTileCost = 1;
            p.walkSpeed = 0.2;
            p.runSpeed = 0.15 - Q.CharacterController.party[0].stats.speed * 0.01;
            p.rotationFrameCount = 0;
            this.entity.on("step", this, "step");
            this.entity.on("acceptInputs", this, "acceptInputted");
            this.entity.on("checkInteract", this, "interact");
            this.entity.on("checkBack", this, "back");
            this.entity.on("pressItemHotkey", this, "pressItemHotkey");
            this.entity.on("useItem", this, "useItem");
            this.on("cycleHeldItem", this, "cycleHeldItem");
            this.on("useTool");
            this.entity.on("atDest", this, "atDest");
        },
        
        
        useItem: function(){
            if(Q.Inventory.heldItem){
                if(Q.Inventory.heldItem.edible){
                    Q.CharacterController.eatItem(Q.Inventory.heldItem, Q.CharacterController.party[0]);
                    Q.Inventory.getRidOfHeldItem();
                }
            }
        },
        cycleHeldItem: function(num){
            let items = Q.Inventory.bag.items;
            let heldItem = Q.Inventory.heldItem;
            let curIdx = heldItem.lastidx; //TODO: give last idx when taking item out of bag.
            //Held items are not in bag. If there are no non-hotkeyed items in bag, do nothing.
            if(num > 0){
                for(let i = curIdx; i < items.length + curIdx; i++){
                    if(i === items.length) i = 0;
                    if(!items[i].hotkey){
                        //Switch held item to this item position in bag, this item becomes held item.
                    }
                }
            }
        },
        //Used to put held item away
        back:function(){
            if(Q.Inventory.heldItem){
                Q.Inventory.putAwayHeldItem();
            }
        },
        loadFurnitureMenu: function(item){
            switch(item.name){
                case "Bed":
                    Q.stage(0).pause();
                    Q.stageScene("dialogue", 2, {dialogue:["Would you like to go to sleep for the night?" , {options:[{text:"Yes", func:"goToSleep"}, {text:"No", func:"exitMenu"}]}]});
                    break;
                case "Book Shelf":
                    
                    break;
            }
        },
        interact: function(){
            let p = this.entity.p;
            //Figure out what is in front of the player and if the player can interact with it.
            let arr = Q.getDirArray(this.entity.p.dir);
            let stage = Q.stage(0);
            let loc = [this.entity.p.loc[0] + arr[0], this.entity.p.loc[1] + arr[1]];
            let groundLayer = stage.lists.TileLayer[0];
            let groundLayer2 = stage.lists.TileLayer[1];
            let objects = stage.objects;
            let objectsGrid = stage.objectsGrid;
            let objectsTileLayer = stage.lists.TileLayer[2];
            //If we're interacting with a tile that's not on the tileLayer (the tile you step on to exit a building)
            if(!objectsGrid[loc[1]]) return;
            let interactWith = objectsGrid[loc[1]][loc[0]];
            if(interactWith.objType === "Door"){
                Q.DataController.enterDoor(interactWith);
                return;
            } else if(interactWith.objType === "Sign"){
                stage.pause();
                let dialogue = Q.getObjectFromList(interactWith, stage).getSignDialogue();
                Q.stageScene("dialogue", 2, {dialogue: dialogue});
                return;
            }
            if(interactWith.type === "furniture"){
                this.loadFurnitureMenu(interactWith);
                return;
            }
            //If we're not holding something
            if(!Q.Inventory.heldItem){
                if(interactWith && interactWith.interact && interactWith.interact.includes("Open")){
                    if(interactWith.treasure >= 0){
                        let treasureLevel = interactWith.treasure;
                        let treasureGrid = GDATA.dataFiles["map-gen.json"].treasureGrid[treasureLevel];
                        let treasureItems = GDATA.dataFiles["map-gen.json"].treasureItems[treasureLevel];
                        let treasure = Q.MapGen.getRandomItemFromGrid(treasureGrid, treasureItems);
                        let data = Q.MapGen.generateObject({tile: treasure}, false);
                        Q.Inventory.pickUp(data);
                        Q.Inventory.replaceItem(interactWith, groundLayer, groundLayer2, objects, objectsTileLayer, objectsGrid, [interactWith.opened, 1]);
                    }
                    return;
                }
                //Held item does not take up space in bag so don't check for room here.
                if(interactWith && interactWith.interact && interactWith.interact.includes("Pickup")){
                    Q.Inventory.pickUpItemOffGround(interactWith, objects, objectsTileLayer, objectsGrid);
                    return;
                }
                if(interactWith.dialogue){
                    stage.pause();
                    Q.stageScene("dialogue", 2, interactWith);
                }
                if(interactWith && interactWith.interact && (interactWith.interact.includes("Axe") || interactWith.interact.includes("Hammer"))){
                    if(interactWith.handmade){
                        interactWith.hp -= Q.CharacterController.party[0].stats.strength;
                        if(interactWith.hp <= 0){
                            Q.Inventory.replaceItem(interactWith, groundLayer, groundLayer2, objects, objectsTileLayer, objectsGrid, interactWith.handmade);      
                        }
                        Q.CharacterController.changeEnergy(5, Q.CharacterController.party[0]);
                        Q.CharacterController.party[0].proficiency["Hands"] ++;
                        Q.stage(1).trigger("increaseProficiency");
                        Q.AudioController.playSound("attack-with-sword.mp3");
                    }
                }
            } else {
                //Do things that can be done with held item (Give to someone, throw, etc..)
                if(!interactWith && Q.getTileCost(groundLayer.p.tiles[loc[1]][loc[0]]) < 10 && Q.getTileCost(objectsTileLayer.p.tiles[loc[1]][loc[0]]) < 10 && Q.notOnBorderOfMap(loc, objectsTileLayer.p.tiles)){
                    Q.Inventory.placeItemOnGround(loc, objects, objectsTileLayer, objectsGrid, Q.Inventory.heldItem, 1);
                    Q.Inventory.getRidOfHeldItem();
                    return;
                }
            }
        },
        useSeed: function(seed){
            Q.AudioController.playSound("plant-seed.mp3");
            Q.CharacterController.changeEnergy(1, Q.CharacterController.party[0]);
            Q.stage(1).trigger("increaseProficiency");
        },
        useTool:function(tool){
            Q.AudioController.playSound(tool.sound+".mp3");
            Q.CharacterController.changeEnergy(tool.levelData.energy, Q.CharacterController.party[0]);
            Q.CharacterController.party[0].proficiency[tool.name] ++;
            Q.stage(1).trigger("increaseProficiency");
        },
        getOnRaft: function(loc, raft){
            let p = this.entity.p;
            p.loc = loc;
            Q.setXY(this.entity);
            
            //Create a raft sprite and put it under the player.
            this.entity.p.onRaft = raft;
            this.entity.p.raft = Q.stage(0).insert(new Q.Sprite({x: p.x, y: p.y, sheet:"objects", frame: 65, z: 2}));
            this.entity.p.raft.on("step", function(){
                this.p.x = Q.player.p.x;
                this.p.y = Q.player.p.y;
            });
        },
        getOffRaft: function(){
            this.entity.p.onRaft = false;
            this.entity.p.raft.destroy();
        },
        pressItemHotkey: function(key){
            Q.inputs["item-hk-"+key] = false;
            let stage = Q.stage(0);
            let item = Q.Inventory.hotkeys[key];
            if(item ===  false) return;
            if(item.type === "tool" || item.type === "seed"){
                if(Q.Inventory.heldItem) return Q.AudioController.playSound("invalid-action.mp3");
                let arr = Q.getDirArray(this.entity.p.dir);
                let loc = [this.entity.p.loc[0] + arr[0], this.entity.p.loc[1] + arr[1]];
                let groundLayer = stage.lists.TileLayer[0];
                //If there's no tile (offscreen)
                if(!groundLayer.p.tiles[loc[1]]) return;
                
                let groundLayer2 = stage.lists.TileLayer[1];
                let groundTile = Q.getTile(groundLayer.p.tiles[loc[1]][loc[0]]);
                let groundTile2 = Q.getTile(groundLayer2.p.tiles[loc[1]][loc[0]]);
                let objects = stage.objects;
                let objectsGrid = stage.objectsGrid;
                let objectsTileLayer = stage.lists.TileLayer[2];
                let interactWith = objectsGrid[loc[1]][loc[0]];
                if(item.name === "Hoe" && groundTile.type === "soil" && !interactWith){
                    this.trigger("useTool", item);
                    Q.CharacterController.party[0].proficiency["Ground Tilled"] ++;
                    groundLayer.setTile(loc[0], loc[1], groundTile.tilled);
                    stage.ground1[loc[1]][loc[0]] = groundTile.tilled;
                    return;
                }
                if(item.name === "Watering Can" && (groundTile.type === "tilledSoil" || groundTile.type === "seedsInTilledSoil")){
                    if(item.capacity > 0){
                        item.capacity --;
                        this.trigger("useTool", item);
                        Q.CharacterController.party[0].proficiency["Watered"] ++;
                        if(groundTile.type === "tilledSoil"){
                            groundLayer.setTile(loc[0], loc[1], groundTile.watered);
                            stage.ground1[loc[1]][loc[0]] = groundTile.watered;
                        }
                        else if(groundTile.type === "seedsInTilledSoil"){ 
                            groundLayer.setTile(loc[0], loc[1], groundTile.seedsInWateredSoil);
                            stage.ground1[loc[1]][loc[0]] = groundTile.seedsInWateredSoil;
                        }
                        let wateredSoilObject = {
                            type: "wateredSoil",
                            loc: loc,
                            revert: groundTile.tilled
                        };
                        stage.specialTiles.push(wateredSoilObject);
                    } else {
                        Q.AudioController.playSound("invalid-action.mp3");
                    }
                    return;
                }
                if(item.name === "Watering Can" && groundTile.type === "water"){
                    item.capacity = item.levelData.capacity;
                    Q.AudioController.playSound("use-watering-can.mp3");
                    Q.CharacterController.changeEnergy(item.levelData.energy, Q.CharacterController.party[0]);
                    return;
                }
                if(item.name === "Fishing Rod" && groundTile2.type === "fish"){
                    Q.AudioController.playSound("use-axe.mp3");
                    Q.CharacterController.changeEnergy(item.levelData.energy, Q.CharacterController.party[0]);
                    Q.FishingController.initiateFishing(item, interactWith);
                    return;
                }
                if(item.type === "seed" && (groundTile.type === "tilledSoil" || groundTile.type === "wateredSoil") && (!interactWith)){
                    this.trigger("useSeed", item);
                    Q.CharacterController.party[0].proficiency["Seeds Planted"] ++;
                    if(groundTile.type === "tilledSoil") groundLayer.setTile(loc[0], loc[1], groundTile.seedsInTilledSoil);
                    else if(groundTile.type === "wateredSoil") groundLayer.setTile(loc[0], loc[1], groundTile.seedsInWateredSoil);
                    item.quantity --;
                    if(item.quantity === 0){
                        Q.Inventory.removeFromBag(item);
                        Q.Inventory.setHotkey(item.hotkey, false);
                    }
                    let seedsObj = {
                        name:"Planted "+item.name,
                        type:"plantedCrop",
                        quality: item.quality,
                        days: item.days, 
                        stages:item.stages,
                        currentDay: 0,
                        produces: item.produces,
                        loc: loc,
                        interact:[],
                        tilled: groundTile.tilled
                    };
                    Q.DataController.addToObjects(objectsGrid, loc, 1, 1, seedsObj);
                    objects.push(seedsObj);
                    
                    return;
                }
                if(item.name === "Raft" && !Q.player.p.stepping &&  !Q.player.p.onRaft && groundTile.type === "water" && !interactWith){
                    Q.player.playerControls.getOnRaft(loc, item);
                    return;
                }
                if(item.name === "Shovel" && groundTile.type === "dirt" && !interactWith){
                    this.trigger("useTool", item);
                    //Don't spawn an item if we're on the border of the map.
                    if(Q.notOnBorderOfMap(loc, objectsTileLayer.p.tiles)){
                        let groundLevel = Q.DataController.currentWorld.level;
                        let digGrid = GDATA.dataFiles["map-gen.json"].digGrid[groundLevel - 1];
                        let digItems = GDATA.dataFiles["map-gen.json"].digItems[groundLevel - 1];
                        let groundItem = Q.MapGen.getRandomItemFromGrid(digGrid, digItems);
                        if(groundItem){
                            let data = Q.MapGen.generateObject({tile: groundItem}, loc);
                            Q.DataController.addObjectToMap(data, loc, objects, objectsTileLayer, objectsGrid);
                        }
                    }
                    Q.CharacterController.party[0].proficiency["Shovel"] ++;
                    Q.SaveFile.achievements["Ground Dug"] ++;
                    stage.specialTiles.push({type:"groundDug", loc: loc, revert: groundLayer.p.tiles[loc[1]][loc[0]]});
                
                    groundLayer.setTile(loc[0], loc[1], groundTile.shoveled);
                    return;
                }
                if(!objectsGrid[loc[1]]) return;
                if(interactWith && interactWith.interact && interactWith.interact.includes(item.name)){
                    console.log(item, interactWith)
                    this.trigger("useTool", item);
                    if(item.levelData.damage && interactWith.hp){
                        interactWith.hp -= item.levelData.damage;
                        if(interactWith.hp <= 0){
                            Q.Inventory.replaceItem(interactWith, groundLayer, groundLayer2, objects, objectsTileLayer, objectsGrid, interactWith.processed);         
                        }
                        if(item.name === "Axe") Q.SaveFile.achievements["Lumber Chopped"] += interactWith.quantity;
                        else if(item.name === "Hammer") Q.SaveFile.achievements["Rocks Smashed"] += interactWith.quantity;
                    }
                }
                else {
                    
                }
            } else {
                if(Q.Inventory.heldItem && Q.Inventory.heldItem.hotkey === item.hotkey){
                    Q.Inventory.putAwayHeldItem();
                    return;
                }
                Q.Inventory.removeFromBag(item);
                if(Q.Inventory.heldItem){
                    Q.Inventory.putAwayHeldItem(true);
                }
                Q.Inventory.holdItem(item);
                Q.AudioController.playSound("take-item-out-of-bag.mp3");
            }
        },
        //When at the tile that you were moving to
        atDest:function(){
            var p = this.entity.p;
            p.diffX = 0;
            p.diffY = 0;
            p.canInput = true;
            p.stepped = false;
            p.stepping = false;
            let groundLayer = Q.stage(0).lists.TileLayer[0].p.tiles;
            let groundType = Q.getTile(groundLayer[p.loc[1]][p.loc[0]]).type;
            if(p.objUnder) return p.objUnder.trigger("playerOn");
            if(groundType !== "water"){
                if(p.onRaft){
                    this.getOffRaft();
                }
            }
            if(!this.acceptInputted()) this.entity.playStand(p.dirOnArrival);
            p.dirOnArrival = false;
        },
        getSpeed: function(){
            let p = this.entity.p;
            let speed = p.walkSpeed;
            if(p.onRaft){
                speed = p.onRaft.levelData.speed;
            } else if(p.running){
                speed = p.runSpeed + (p.prevTileCost * 0.05);
            } else {
                speed = p.walkSpeed + (p.prevTileCost * 0.05);
            }
            return speed;
        },
        acceptInputted:function(){
            var p = this.entity.p;
            var inputted = p.inputs;
            p.receivedInputs = true;
            p.running = Q.OptionsController.options.autoRun || p.inputs.run;
            p.dirOnArrival = inputted.left ? "left" : inputted.right ? "right" : inputted.up ? "up" : inputted.down ? "down" : p.dirOnArrival;
            if(p.canInput){
                let diffX = 0, 
                    diffY = 0,
                    tileCost,
                    destX,
                    destY,
                    toDir;
                if(inputted.up) {
                    diffY = -p.stepDistance;
                    toDir = "up";
                } else if(inputted.down) {
                    diffY = p.stepDistance;
                    toDir = "down";
                }
                if(diffY){
                    destX = p.x;
                    destY = p.y + diffY;
                    tileCost = Q.validMoveLoc(Q.getLoc(destX, destY), {waterWalk: p.onRaft});
                    if(Q.OptionsController.options.walkThroughWallsCheat && !tileCost) tileCost = 1; //Walk through walls cheat
                }
                if(!tileCost){
                    diffY = 0;
                    if(inputted.left) {
                        diffX = -p.stepDistance;
                        toDir = "left";
                    } else if(inputted.right) {
                        diffX = p.stepDistance;
                        toDir = "right";
                    }
                    if(diffX) {
                        destX = p.x + diffX;
                        destY = p.y;
                        tileCost = Q.validMoveLoc(Q.getLoc(destX, destY), {waterWalk: p.onRaft});
                        if(Q.OptionsController.options.walkThroughWallsCheat && !tileCost) tileCost = 1; //Walk through walls cheat
                    }
                }
                if(!diffX && !diffY || p.rotationFrameCount < 3 || !tileCost){
                    let moveTowardsDir = false;
                    if(p.rotationFrameCount === 0) moveTowardsDir = p.dir === toDir;
                    p.rotationFrameCount ++;
                    if(!moveTowardsDir){
                        return this.entity.playStand(toDir);
                    }
                }
                if(tileCost){
                    let isNum = Number.isInteger(tileCost);
                    if(!isNum){
                        p.objUnder = tileCost;
                        tileCost = p.objUnder.p.tileCost;
                    } else {
                        p.objUnder = false;
                    }
                    //We're going offscreen
                    if(tileCost === -2) return Q.DataController.offMap(Q.DataController.currentMap.lastMap, "exit-door.mp3");
                    p.diffX = diffX;
                    p.diffY = diffY;
                    p.destX = destX;
                    p.destY = destY;
                    p.lastLoc = p.loc;
                    p.loc = Q.getLoc(p.destX, p.destY);
                    p.dir = toDir;
                    //Set loc as soon as the area is valid so other objs don't move here.
                    //Might need to rework this as this overrides objects that can be walked on (ladders)
                    //if(isNum) Q.DataController.changeObjectLoc(p.lastLoc, p.loc);
                    p.stepDelay = this.getSpeed();
                    p.canInput = false;
                    p.stepping = true;
                    p.origX = p.x;
                    p.origY = p.y;
                    p.stepWait = p.stepDelay;
                    p.stepped = true;
                    p.prevTileCost = tileCost;
                    //Play the walking animation
                    this.entity.playWalk(p.dir);
                    return true;
                }
                return this.entity.playStand(p.dir);
            }
        },

        step:function(dt){
            var p = this.entity.p;
            p.stepWait -= dt;
            if(p.stepping) {
                p.x += p.diffX * dt / p.stepDelay;
                p.y += p.diffY * dt / p.stepDelay;
            }
            if(p.stepWait > 0) {return; }
            //At destination
            if(p.stepping) {
                p.x = p.destX;
                p.y = p.destY;
                this.entity.trigger("atDest");
            } else {
                p.stepping = false;
            }
            if(!p.receivedInputs){
                p.rotationFrameCount = 0;
            }
            p.receivedInputs = false;
            p.z = p.y;
        }
    });
    //Holds the data for the door at a certain location. This is also what is used inside to go out
    Q.Sprite.extend("Door",{
        init:function(p){
            this._super(p, {
                type: Q.SPRITE_DOOR | Q.SPRITE_INTERACTABLE,
                w:Q.tileW,
                h:Q.tileH,
                walkable: true
            });
            this.add("walkOn, interactable");
            this.on("inserted");
            this.on("playerOn", this, "enter");
        },
        inserted:function(){
            this.setXY();
        },
        setXY:function(){
            this.p.x = this.p.loc[0] * Q.tileW + Q.tileW/2;
            this.p.y = this.p.loc[1] * Q.tileH + Q.tileH/2;
        },
        enter:function(){
            Q.stopMovementInputs();
            Q.DataController.enterDoor(this.p);
        }
    });
    Q.Sprite.extend("Ladder",{
        init:function(p){
            this._super(p, {
                type: Q.SPRITE_DOOR | Q.SPRITE_INTERACTABLE,
                w:Q.tileW,
                h:Q.tileH,
                walkable: true
            });
            this.add("walkOn, interactable");
            this.on("inserted");
            this.on("playerOn", this, "enter");
        },
        inserted:function(){
            this.setXY();
        },
        setXY:function(){
            this.p.x = this.p.loc[0] * Q.tileW + Q.tileW/2;
            this.p.y = this.p.loc[1] * Q.tileH + Q.tileH/2;
        },
        enter:function(){
            Q.stopMovementInputs();
            if(this.p.direction === "up"){
                Q.DataController.ascendLadder(this.p);
            } else {
                Q.DataController.descendLadder(this.p);
                Q.AudioController.playSound("enter-door.mp3");
            }
        }
    });
    Q.Sprite.extend("Pitfall",{
        init:function(p){
            this._super(p, {
                type: Q.SPRITE_DOOR | Q.SPRITE_INTERACTABLE,
                w:Q.tileW,
                h:Q.tileH,
                walkable: true
            });
            this.add("walkOn, interactable");
            this.on("inserted");
            this.on("playerOn", this, "enter");
        },
        inserted:function(){
            this.setXY();
        },
        setXY:function(){
            this.p.x = this.p.loc[0] * Q.tileW + Q.tileW/2;
            this.p.y = this.p.loc[1] * Q.tileH + Q.tileH/2;
        },
        enter:function(){
            Q.stopMovementInputs();
            Q.DataController.dungeonHub.currentFloor += this.p.floors;
            Q.DataController.descendLadder(this.p);
            Q.AudioController.playSound("throw-item.mp3");
        }
    });
    Q.Sprite.extend("Sign",{
        init: function(p){
            this._super(p, {
                
            });
        },
        getSignDialogue: function(){
            switch(this.p.signType){
                case "dungeonTracker":
                    
                    return ["Deepest floor travelled: "+this.p.dungeon.deepestDive+". \n\ Level "+this.p.dungeon.level+". TODO: Make this into a menu type "];
            }
        }
    });
    Q.Sprite.extend("NPC",{
        init:function(p){
            this._super(p, {
                type: Q.SPRITE_CHARACTER | Q.SPRITE_INTERACTABLE,
                dir: "down",
                sprite: "Character"
            });
            this.add("animation, tween");
            this.add("animations, interactable");
            this.on("inserted");
        },
        inserted:function(){
            this.setXY();
            this.trigger("playStand");
            this.p.z = this.p.y;
        },
        setXY:function(){
            this.p.x = this.p.loc[0] * Q.tileW + Q.tileW/2;
            this.p.y = this.p.loc[1] * Q.tileH + Q.tileH/2;
        }
    });
    Q.Sprite.extend("Player",{
        init:function(p){
            this._super(p, {
                type: Q.SPRITE_CHARACTER,
                dir: "down",
                sheet: "player-1",
                sprite: "Character"
            });
            this.add("animation, tween");
            this.add("animations");
            this.on("inserted");
            this.on("step", this, "addControls");
            this.p.addControls = 2;
        },
        inserted:function(){
            this.setXY();
            this.trigger("playStand");
            this.p.z = this.p.y;
            this.p.lastLoc = this.p.loc;
            this.showHoldItem(Q.Inventory.heldItem);
        },
        setXY:function(){
            this.p.x = this.p.loc[0] * Q.tileW + Q.tileW/2;
            this.p.y = this.p.loc[1] * Q.tileH + Q.tileH/2;
        },
        addControls:function(){
            this.p.addControls --;
            if(this.p.addControls < 0){ 
                this.add("playerControls");
                this.off("step", this, "addControls");
            }
        },
        showHoldItem:function(item){
            if(!item) return;
            let itemSprite = this.heldItemSprite = new Q.Sprite({x: 0, y:-Q.tileH /2, w: Q.tileW, h: Q.tileH, sheet:"objects", frame:item.tile});
            this.stage.insert(itemSprite, this);
        },
        removeHoldItem:function(){
            this.heldItemSprite.destroy();
        }
    });
    Q.GameObject.extend("fishingController", {
        initiateFishing: function(rod, fish){
            Q.stageScene("fishing", 2, {rod: rod, fish: fish});
            fish.beingFished = true;
            Q.player.p.canInput = false;
        }
    });
    
    Q.GameObject.extend("optionsController",{
        toggleBoolOpt:function(opt){
            if(this.options[opt]) this.options[opt] = false;
            else this.options[opt] = true;
            
            if(opt === "musicEnabled"){
                Q.audioController.checkMusicEnabled();
            }
        },
        adjustSound:function(){
            
        }
    });
    //Keeps track of items in the bag, held item, tool locations, etc...
    Q.GameObject.extend("inventory", {
        player: {},
        heldItem:false,
        maxBagItems: GDATA.dataFiles["general-data.json"].maxBagItems,
        hotkeys:{
            0: false,
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false
        },
        getItemData:function(items){
            let itemData = [];
            for(let i = 0; i < items.length ; i++){
                let item = items[i];
                if(!item){
                    itemData.push(false);
                    continue;
                }
                let data = GDATA.dataFiles["map-gen.json"].objectProps[item.tile];
                let newItem = Object.assign({}, data);
                newItem.quality = item.quality;
                if(newItem.type === "tool"){
                    newItem.levelData = data.levels[item.quality - 1];
                    if(newItem.levelData.capacity) newItem.capacity = newItem.levelData.capacity;
                }
                newItem.quantity = item.quantity;
                newItem.tile = item.tile;
                newItem.hotkey = item.hotkey;
                if(item.hotkey) this.hotkeys[item.hotkey] = newItem;
                itemData.push(newItem);
            }
            return itemData;
        },
        getFirstItem:function(){
            for(let i = 0; i < this.bag.items.length; i++){
                if(this.bag.items[i]) return this.bag.items[i];
            }
        },
        getFirstEmptyIdx: function(){
            let party = Q.CharacterController.party;
            let maxItems = Q.Inventory.maxBagItems;
            for(let i = 0; i < party.length; i++){
                let char = party[i];
                for(let j = 0; j < char.bag.maxItems; j++){
                    if(!this.bag.items[j + i * maxItems]) return j + i * maxItems;
                }
            }
        },
        getCurrentItems: function(){
            let items = [];
            for(let i = 0; i < this.bag.items.length; i++){
                if(this.bag.items[i]) items.push(this.bag.items[i]);
            }
            return items;
        },
        resetAllHotkeys: function(){
            this.hotkeys = {
                0: false,
                1: false,
                2: false,
                3: false,
                4: false,
                5: false,
                6: false,
                7: false,
                8: false,
                9: false
            };
            Q.stage(1).trigger("hotkeyItemChanged", {key: 1});
            Q.stage(1).trigger("hotkeyItemChanged", {key: 2});
            Q.stage(1).trigger("hotkeyItemChanged", {key: 3});
            for(let i = 0; i < this.bag.items.length; i++){
                if(this.bag.items[i].hotkey) this.setHotkey(this.bag.items[i].hotkey, i);
            }
        },
        setHotkey: function(key, itemIdx){
            if(!key) return;
            Q.inputs["item-hk-"+key] = false;
            let item = this.bag.items[itemIdx] || false;
            if(item.hotkey) this.hotkeys[item.hotkey] = false;
            if(this.hotkeys[key]) this.hotkeys[key].hotkey = false;
            this.hotkeys[key] = item;
            Q.stage(1).trigger("hotkeyItemChanged", {key: key, remove: item.hotkey});
            item.hotkey = key;
            return item;
        },
        setOptions:function(){
            let party = Q.CharacterController.party;
            let maxItems = 0;
            let items = [];
            let maxBagItems = this.maxBagItems;
            for(let i = 0; i < party.length; i++){
                maxItems += party[i].bag.maxItems;
                let charItems = party[i].bag.items;
                let num = maxBagItems - charItems.length;
                for(let j = 0; j < num; j++){
                    charItems.push(false);
                }
                items = items.concat(charItems);
            }
            this.bag = {
                maxItems: maxItems,
                items: this.getItemData(items)
            };
            this.bag.numItems = this.getCurrentItems().length;
        },
        getBagItemsAmount: function(items){
            let num = 0;
            for(let i = 0; i < items.length; i++){
                if(items[i]) num++;
            }
            return num;
        },
        changeBagItemsAmount: function(num, set){
            if(set){
                this.bag.numItems = num;
            } else {
                this.bag.numItems += num;
            }
            Q.stage(1).trigger("bagItemsChanged");
        },
        //Removes the item from bag (does not remove hotkeys as that is done when the item is thrown).
        removeFromBag: function(item){
            for(let i = this.bag.items.length - 1; i >= 0; i--){
                if(this.bag.items[i].name === item.name && this.bag.items[i].quality === item.quality){
                    this.bag.items[i] = false;
                    this.changeBagItemsAmount(-1);
                    return;
                }
            }
        },
        holdItem:function(item){
            if(item && !this.heldItem){
                this.heldItem = item;
                Q.player.showHoldItem(item);
                delete item.loc;
            }
        },
        //For processed and handmade items and chests
        replaceItem: function(item, groundLayer, groundLayer2, objects, objectsTileLayer, objectsGrid, replaceItem){
            Q.DataController.removeObjectFromMap(item, objects, objectsGrid, objectsTileLayer);
            let obj;
            if(replaceItem[0] === "ladder"){
                obj = Q.MapGen.createObjectData(item.loc, {tile: -1}, {w: 1, h: 1, objType: "Ladder", direction: replaceItem[1]});
                groundLayer2.setTile(item.loc[0], item.loc[1], replaceItem[2]);
                Q.stage(0).insert(new Q[obj.objType](obj));
            } else if(replaceItem[0] === "pitfall"){
                obj = Q.MapGen.createObjectData(item.loc, {tile: -1}, {w: 1, h: 1, objType: "Pitfall", floors: replaceItem[1]});
                groundLayer2.setTile(item.loc[0], item.loc[1], replaceItem[2]);
                Q.stage(0).insert(new Q[obj.objType](obj));
            } else {
                let replaceWith = Q.getObjectData(replaceItem[0]);
                obj = Q.MapGen.createObjectData(item.loc, {tile: replaceItem[0]}, replaceWith);
                obj.quantity = replaceItem[1] * (item.quantity || 1);
                if(Q.CharacterController.party[0].special[obj.type+"Quality"]) obj.quality = Q.MapGen.generateItemQuality(Q.CharacterController.party[0].special[obj.type+"Quality"], Q.CharacterController.party[0].special.consistency);
            }
            if(obj.tile){
                Q.DataController.addObjectToMap(obj, item.loc, objects, objectsTileLayer, objectsGrid);
            }
        },
        pickUpItemOffGround: function(interactWith, objects, objectsTileLayer, objectsGrid){
            Q.DataController.removeObjectFromMap(interactWith, objects, objectsGrid, objectsTileLayer);
            Q.Inventory.pickUp(interactWith);
        },
        pickUp: function(item){
            Q.AudioController.playSound("pick-up-item.mp3");
            Q.Inventory.holdItem(item);
            if(!item.quantity) item.quantity = 1;
            if(!item.quality) item.quality = Q.MapGen.generateItemQuality(Q.CharacterController.party[0].special[item.type+"Quality"], Q.CharacterController.party[0].special.consistency);
        },
        //Used for placing a single held item as well as using/eating a single item.
        getRidOfHeldItem: function(){
            this.heldItem.quantity --;
            if(this.heldItem.quantity <= 0){
                if(this.heldItem.hotkey) Q.Inventory.setHotkey(this.heldItem.hotkey, false);
                Q.player.removeHoldItem();
                this.heldItem = false;
            }
        },
        placeItemOnGround:function(loc, objects, objectsTileLayer, objectsGrid, item, quantity){
            console.log( objects)
            Q.AudioController.playSound("throw-item.mp3");
            let placedItem = Object.assign({}, item);
            placedItem.quantity = quantity || 1;
            placedItem.hotkey = false;
            Q.DataController.addObjectToMap(placedItem, loc, objects, objectsTileLayer, objectsGrid);
        },
        getIdxOfItem:function(items, item){
            for( let i = 0; i < items.length; i++){
                if(items[i].tile === item.tile && items[i].quality === item.quality) return i;
            }
        },
        getAverageQuality: function(add, cur){
            return (cur.quantity * cur.quality + add.quantity * add.quality) / (cur.quantity + add.quantity);
        },
        addItemToBag: function(item, idx){
            let items = this.bag.items;
            idx = idx || this.getIdxOfItem(items, item);
            item.quantity = item.quantity || 1;
            if(idx >= 0){
                this.increaseItemQuantity(items, item, item.quantity, idx);
            } else {
                let firstEmptyIdx = this.getFirstEmptyIdx();
                items[firstEmptyIdx] = item;
                this.changeBagItemsAmount(1);
            }
        },
        increaseItemQuantity: function(items, item, num, idx){
            idx = (idx >= 0 || idx) ? idx : this.getIdxOfItem(items, item);
            items[idx].quality = this.getAverageQuality(item, items[idx]);
            items[idx].quantity += num;
        },
        //Combines all items in bag. Makes quality average
        combineAllItems:function(items){
            let newItems = {};
            let newItemArr = [];
            for(let i = items.length - 1; i >= 0 ; i --){
                if(!items[i]) continue;
                if(!newItems[items[i].tile]){
                    newItems[items[i].tile] = items[i];
                    newItemArr[items[i].name] = items[i];
                } else {
                    this.increaseItemQuantity(newItemArr, items[i], items[i].quantity, items[i].name);
                }
            }
            let bagItems = [];
            let keys = Object.keys(newItems);
            for(let i = 0; i < keys.length; i++){
                if(newItems[keys[i]]){
                    bagItems.push(newItems[keys[i]]);
                }
            }
            for(let i = bagItems.length; i < Q.Inventory.maxBagItems; i++){
                bagItems.push(false);
            }
            this.sortItems(bagItems);
            return bagItems;
        },
        sortItems:function(items){
            //Sort by quality, then:
            //Sort by type (tool, forage, crop, seeds, etc...)
            let sortOrder = GDATA.dataFiles["map-gen.json"].objectTypes;
            items.sort(function(a, b){return b.quality - a.quality;});
            items.sort(function(a, b){return sortOrder.indexOf(b.type) - sortOrder.indexOf(a.type);});
            return items;
        },
        putAwayHeldItem:function(noSound){
            let idx = this.getIdxOfItem(Q.Inventory.bag.items, this.heldItem);
            let maxBagItems = Q.Inventory.maxBagItems;
            for(let i = 0; i < Q.CharacterController.party.length; i++){
                let char = Q.CharacterController.party[i];
                let maxItems = char.bag.maxItems;
                let charItems = Q.Inventory.bag.items.slice(i * maxBagItems, maxBagItems + i * maxBagItems);
                let numItems = Q.Inventory.getBagItemsAmount(charItems);
                if(numItems < maxItems || idx >= 0){
                    if(!noSound) Q.AudioController.playSound("put-away-item.mp3");
                    this.addItemToBag(this.heldItem, idx);
                    this.heldItem = false;
                    Q.player.removeHoldItem();
                    return true;
                }
            }
            if(!noSound) Q.AudioController.playSound("invalid-action.mp3");
        },
        combineSingleItem: function(item, toCombine){
            this.increaseItemQuantity([item, toCombine], toCombine, toCombine.quantity, 0);
        },
        //Change the position of an item
        switchItemsInBag: function(item, toIdx){
            //If they are the same item, combine them.
            if(item.name === this.bag.items[toIdx].name && item.tile === this.bag.items[toIdx].tile){
                //If the items are exactly the same, we have moved to the same spot
                if(item.quality === this.bag.items[toIdx].quality) return;
                this.combineSingleItem(this.bag.items[toIdx], item);
                this.removeFromBag(item);
                Q.AudioController.playSound("take-item-out-of-bag.mp3");
            } else {
                let idx  = this.getIdxOfItem(this.bag.items, item);
                let temp = this.bag.items[idx];
                this.bag.items[idx] = this.bag.items[toIdx];
                this.bag.items[toIdx] = temp;
                Q.AudioController.playSound("put-away-item.mp3");
            }
        }
    });
    
    Q.GameObject.extend("Character",{
        init: function(p){
            let types = GDATA.dataFiles["general-data.json"].characterTypes;
            this.type = p.type[~~(Math.random() * p.type.length)] || types[~~(Math.random() * types.length)];
            this.gender = p.gender || ["Male", "Female"][~~(Math.random() * 2)];
            this.name = p.name || GDATA.dataFiles["general-data.json"][this.gender+"Names"][~~(Math.random() * GDATA.dataFiles["general-data.json"][this.gender+"Names"].length)];
            this.level = p.level;
            this.generateStats(this.type, this.level);
            this.value = 1000 * this.level;
            this.generated = true;
        },
        generateStats: function(type, level){
            this.bag = {
                "maxItems": 4,
                "items": []
            };
            this.special =  {
                "forageQuality": ~~(Math.random() * level) + 1,
                "cropQuality":  ~~(Math.random() * level) + 1,
                "cookedQuality":  ~~(Math.random() * level) + 1,
                "fishQuality":  ~~(Math.random() * level) + 1,
                "oreQuality":  ~~(Math.random() * level) + 1,
                "materialQuality":  ~~(Math.random() * level) + 1,
                "toolQuality":  ~~(Math.random() * level) + 1,
                "consistency": ~~(Math.random() * (level / 2))
            };
            this.stats = {
                "maxEnergy": 80 + level * 10,
                "maxHealth": 80 + level * 10,
                "energy": 80 + level * 10,
                "health": 80 + level * 10,
                "strength": 1,
                "bulk": 1,
                "speed": 1,
                "sight": 4
            },
            this.proficiency = {
                "Axe": 0,
                "Hammer": 0,
                "Hoe": 0,
                "Watering Can": 0,
                "Fishing Rod": 0,
                "Capture Net": 0,
                "Kitchen": 0,
                "Sword": 0,
                "Shield": 0,
                "Shovel": 0,
                "Hands": 0
            };
            
            switch(type){
                case "Leader":
                    this.special.consistency += 2 + ~~(0.5 * level);
                    this.stats.sight += 2 + ~~(0.5 * level);
                    this.proficiency["Axe"] = ~~(2.5 * level);
                    this.proficiency["Hammer"] = ~~(2.5 * level);
                    this.proficiency["Hoe"] = ~~(2.5 * level);
                    this.proficiency["Watering Can"] = ~~(2.5 * level);
                    this.proficiency["Capture Net"] = ~~(2.5 * level);
                    this.proficiency["Kitchen"] = ~~(2.5 * level);
                    this.proficiency["Sword"] = ~~(2.5 * level);
                    this.proficiency["Shield"] = ~~(2.5 * level);
                    this.proficiency["Shovel"] = ~~(2.5 * level);
                    break;
                case "Farmer":
                    this.proficiency["Hoe"] = 10 * level;
                    this.proficiency["Watering Can"] = 10 * level;
                    this.special.cropQuality += 1 + ~~(0.5 * level);
                    this.stats.sight += ~~(0.5 * level);
                    break;
                case "Soldier":
                    this.stats.maxEnergy += 20;
                    this.stats.maxHealth += 20;
                    this.stats.health += 20;
                    this.stats.energy += 20;
                    this.stats.strength += 1 * level;
                    this.stats.bulk += ~~(0.5 * level);
                    this.stats.speed += ~~(0.5 * level);
                    this.stats.sight += ~~(0.5 * level);
                    this.proficiency["Sword"] = 10 * level;
                    this.proficiency["Shield"] = 10 * level;
                    break;
                case "Miner":
                    this.special.oreQuality += 1 + ~~(0.5 * level);
                    this.stats.strength += 2 + ~~(0.5 * level);
                    this.stats.bulk += 1 + ~~(0.25 * level);
                    this.proficiency["Hammer"] = 10 * level;
                    this.proficiency["Shovel"] = 10 * level;
                    break;
                case "Forager":
                    this.special.forageQuality += 1 + ~~(0.5 * level);
                    this.stats.sight += 3 + ~~(0.75 * level);
                    this.stats.speed += ~~(0.5 * level);
                    
                    break;
                case "Woodsman":
                    this.special.materialQuality += 1 + ~~(0.5 * level);
                    this.stats.strength += 2 + ~~(0.5 * level);
                    this.stats.bulk += 1 + ~~(0.25 * level);
                    this.proficiency["Axe"] = 10 * level;
                    this.proficiency["Hammer"] = 10 * level;
                    break;
                case "Fisherman":
                    this.special.fishQuality += 1 + ~~(0.5 * level);
                    this.proficiency["Fishing Rod"] = 10 * level;
                    
                    break;
                case "Chef":
                    this.special.cookedQuality += 1 + ~~(0.5 * level);
                    this.proficiency["Kitchen"] = 10 * level;
                    
                    break;
            }
        }
    });
    Q.GameObject.extend("characterController", {
        party:[],
        standby: [],
        addCharToRoster: function(char){
            if(this.party.length < 3){
                this.party.push(char);
                Q.Inventory.setOptions();
            } else {
                this.standby.push(char);
            }
            
        },
        setParty: function(){
            let characters = Q.SaveFile.characters;
            let party = [];
            for(let i = 0 ; i < characters.length; i++){
                if(characters[i].task.type === "Party"){
                    party[characters[i].task.position] = characters[i];
                } else if(characters[i].task.type === "Standby"){
                    this.standBy.push(characters[i]);
                }
            }
            this.party = party;
        },
        
        //Restore health and stamina to all characters
        dayEnd: function(){
            let characters = Q.SaveFile.characters;
            //Helpers always go to bed on time ;)
            let helperRestore = [50, 20];
            let restore = [50, 20];
            restore[0] -= (Q.TimeController.currentTime[0] - 6) * 5;
            restore[1] -= (Q.TimeController.currentTime[0] - 6) * 3;
            for(let i = 0; i < characters.length; i++){
                let rest = restore;
                if(characters[i].task.type !== "Party"){
                    rest = helperRestore;   
                }
                this.eatItem({edible: rest}, characters[i]);
            }
        },
        keepInBounds: function(num, max){
            if(num > max){
                num = max;
            }
            return num;
        },
        //Eat an item. Also used on day end to restore.
        eatItem:function(item, char){
            char.stats.energy = this.keepInBounds(char.stats.energy + item.edible[0], char.stats.maxEnergy);
            char.stats.health = this.keepInBounds(char.stats.health + item.edible[1], char.stats.maxHealth);
            Q.stage(1).trigger("energyChanged");
            Q.stage(1).trigger("healthChanged");
            Q.AudioController.playSound("eat-item.mp3");
        },
        
        changeEnergy: function(num, char){
            if(!char.stats.energy){
                char.stats.health -= num * 2;
                char.proficiency["Damage Taken"] += num * 2;
                if(char.stats.health <= 0){
                    char.stats.health = 0;
                    Q.stage(1).trigger("healthChanged");
                    Q.stage(0).pause();
                    Q.DataController.cycleDay();
                }
                Q.stage(1).trigger("healthChanged");
            } else{
                char.stats.energy -= num;
                if(char.stats.energy < 0){
                    char.stats.energy = 0;
                }
                char.proficiency["Energy Used"] += num;
                Q.stage(1).trigger("energyChanged");
            }
        }
    });
    
    Q.GameObject.extend("timeController",{
        currentTime: [6, 0],
        nightStart: 18,
        getMapMusic: function(music){
            if(this.currentTime[0] > this.nightStart - 1 || this.currentTime[0] < 6){
                return music.mapNight;
            } else {
                return music.mapDay;
            }
        },
        finishDay: function(){
            let curTime = this.currentTime;
            let newTime = [6, 0];
            switch(curTime[0]){
                case 22:
                case 23:
                    newTime[0] = 8;
                    break;
                case 0: 
                    newTime[0] = 9;
                    break;
                case 1:
                    newTime[0] = 10;
                    break;
                case 2:
                case 3:
                    newTime[0] = 11;
                    break;
                case 4: 
                case 5:
                    newTime[0] = 12;
                    break;
            }
            this.currentTime = newTime;
            this.lastSeconds = new Date().getSeconds();
            this.trigger("timeChanged", [newTime[0], newTime[1]]);
        },
        turnOnTime: function(){
            function keepInRange(){
                let newSeconds = Q.TimeController.currentTime[1] + 1;
                let newMinutes = Q.TimeController.currentTime[0];
                if(newSeconds >= 60){
                    newMinutes ++;
                    if(newMinutes >= 24){
                        newMinutes = 0;
                    }
                    newSeconds = 0;
                }
                return [newMinutes, newSeconds];
            }
            function incrementTime(){
                let newTime = new Date();
                let curSeconds = newTime.getSeconds();
                if(curSeconds !== Q.TimeController.lastSeconds){
                    let curTime = keepInRange();
                    if(Q.TimeController.currentTime[0] === this.nightStart - 1 && curTime[0] === this.nightStart) Q.AudioController.playMusic(Q.DataController.currentWorld.music.mapNight);
                    Q.TimeController.currentTime = curTime;
                    Q.TimeController.trigger("timeChanged", [curTime[0], curTime[1]]);
                    Q.TimeController.lastSeconds = curSeconds;
                    if(curTime[0] === 5){
                        Q.stage(0).pause();
                        Q.DataController.cycleDay();
                    }
                }
            }
            Q.TimeController.lastSeconds = new Date().getSeconds();
            Q.stage(0).on("step", incrementTime);
            Q.stage(0).on("pause", function(){
                Q.stage(0).off("step", incrementTime);
            });
        }
    });
};