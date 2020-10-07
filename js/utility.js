Quintus.Utility = function(Q){
    Q.getSellPrice = function(item){
        return Math.ceil(item.value + item.quality * item.value / 10);
    };
    Q.addViewport = function(stage, toFollow){
        stage.add("viewport");
        /*stage.viewport.scale = 2;
        
        Q.viewFollow(toFollow);
        return;*/
        stage.viewport.scale = 1;
        //The viewSprite is what moves when dragging the viewport
        stage.viewSprite = stage.insert(new Q.ViewSprite());
        stage.viewSprite.centerOn(toFollow.p.loc);
        Q.viewFollow(stage.viewSprite);
    };
    Q.getBuyPrice = function(item){
        return ~~(item.value * 2 + item.quality * item.value / 10);
    };
    Q.createArray = function(num, width, height) {
        var array = [];
        for (var i = 0; i < height; i++) {
            array.push([]);
            for (var j = 0; j < width; j++) {
                array[i].push(num);
            }
        }
        return array;
    };
    Q.getDirArray = function(dir){
        switch(dir){
            case "up":
                return [0,-1];
            case "right":
                return [1,0];
            case "down":
                return [0,1];
            case "left":
                return [-1,0];
        }
    };
    Q.getRotatedDir = function(dir){
        switch(dir){
            case "up":
                return "right";
            case "right":
                return "down";
            case "down":
                return "left";
            case "left":
                return "up";
        }
    };
    Q.getBehindDirArray = function(dir){
        switch(dir){
            case "up":
                return [-1,1];
            case "right":
                return [-1,-1];
            case "down":
                return [1,-1];
            case "left":
                return [1,1];
        }
    };
    Q.getOppositeDir = function(dir){
        switch(dir){
            case "up":
                return "down";
            case "right":
                return "left";
            case "down":
                return "up";
            case "left":
                return "right";
        }
    };
    //Returns the tile properties of each tile layer at a certain coordinate
    Q.getSpaceState = function(){
        
    };
    
    Q.getAllObjectsWithin = function(tiles, loc, w, h){
        let objs = [];
        for(let i = loc[1]; i < loc[1] + h; i++){
            for(let j = loc[0]; j < loc[0] + w; j++){
                if(tiles[i][j]) objs.push(tiles[i][j]);
            }
        }
        return objs;
    };
    Q.isWithinRange = function(obj1, obj2){
        if(obj1.loc[0] >= obj2.loc[0] && obj1.loc[0] + obj1.w < obj2.loc[0] + obj2.w){
            if(obj1.loc[1] >= obj2.loc[1] && obj1.loc[1] + obj1.h < obj2.loc[1] + obj2.h){
                return true;
            }
        }
    };
    Q.getXY = function(loc){
        return {x:loc[0] * Q.tileW + Q.tileW / 2,y:loc[1] * Q.tileH + Q.tileH / 2};
    };
    Q.setXY = function(obj){
        obj.p.x = obj.p.loc[0] * Q.tileW + Q.tileW / 2;
        obj.p.y = obj.p.loc[1] * Q.tileH + Q.tileH / 2;
    };
    Q.getObjectFromList = function(p, stage){
        for(let i = 0; i < stage.lists[p.objType].length; i++){
            if(stage.lists[p.objType][i].p.loc[0] === p.loc[0] && stage.lists[p.objType][i].p.loc[1] === p.loc[1]) return stage.lists[p.objType][i];
        }
    };
    Q.getSpriteAt = function(loc){
        return Q.stage(0).locate(loc[0] * Q.tileW + Q.tileW/2, loc[1] * Q.tileH + Q.tileH / 2, Q.SPRITE_INTERACTABLE);
    };
    Q.getLoc = function(x, y){
        let loc = [x / Q.tileW, y / Q.tileH];
        if(loc[0] < 0 || loc[1] < 0) return [-1, -1];
        return [~~loc[0], ~~loc[1]];
    };
    Q.getTile = function(tile){
        return GDATA.dataFiles["map-gen.json"].tileProps[tile] || {type: "placeholder"};
    },
    Q.getTileCost = function(tile, options){
        options = options || {};
        let tileData = GDATA.dataFiles["map-gen.json"].tileProps[tile];
        if(tileData && options.waterWalk && tileData.type === "water") return 1;
        if(tileData || tile === 0) return tileData ? tileData.cost || 100000 : 1;
        return 100000;
    };
    Q.getObjectData = function(tile){
        return GDATA.dataFiles["map-gen.json"].objectProps[tile];
    };
    Q.notOnBorderOfMap = function(loc, grid){
        if(loc[0] > 0 && loc[1] > 0 && loc[0] < grid[0].length - 1 && loc[1] < grid.length - 1) return true;
    };
    //Returns a path from one location to another
    Q.getPath = function(loc, toLoc, graph, maxScore){
        var start = graph.grid[loc[0]][loc[1]];
        var end = graph.grid[toLoc[0]][toLoc[1]];
        return Q.astar.search(graph, start, end, {maxScore: maxScore});
    };
    Q.getSpriteOn = function(loc, objs){
        for( let i = 0; i < objs.length; i++){
            if(objs[i].p.loc[0] === loc[0] && objs[i].p.loc[1] === loc[1]){
                return objs[i];
            }
        }
    };
    Q.validMoveLoc = function(loc, options){
        let stage = Q.stage(0);
        let groundLayer = stage.lists.TileLayer[0];
        let groundLayer2 = stage.lists.TileLayer[1];
        let objectsLayer = stage.lists.TileLayer[2];
        if(!groundLayer.p.tiles[loc[1]] || groundLayer.p.tiles[loc[1]][loc[0]] === undefined) return -2;
        
        let groundCost = Q.getTileCost(groundLayer.p.tiles[loc[1]][loc[0]], options);
        if(groundCost > 10) return false;
        
        let groundCost2 = Q.getTileCost(groundLayer2.p.tiles[loc[1]][loc[0]], options);
        if(groundCost2 > 10) return false;
        
        let objectTile = objectsLayer.p.tiles[loc[1]][loc[0]];
        //If the objTile is 0, you can go. Check to see what object is there as you can step on some objects.
        if(objectTile === -1){
            let sprite = Q.getSpriteOn(loc, Q(".walkOn").items);
            if(sprite && sprite.p.walkable) return sprite;
            return false;
        }
        if(objectTile > 0) return false;
        return groundCost;
    };
    
    Q.compareLocsForDirection = function(loc1, loc2){
        let difX = loc1[0] - loc2[0];
        let difY = loc1[1] - loc2[1];
        let dir;
        
        if(Math.abs(difX) > Math.abs(difY)){
            if(difX < 0) dir = [0, 1];
            else dir = [0, -1];
        } else {
            if(difY < 0) dir = [1, 0];
            else dir = [-1, 0];
        }
        return dir;
    };
    
    Q.stopMovementInputs = function(){
        Q.inputs["left"] = false;
        Q.inputs["up"] = false;
        Q.inputs["right"] = false;
        Q.inputs["down"] = false;
    };
    Q.spaceAround = function(loc, maps, radius){
        let tiles = [0, 0, 0, 0];
        for(let j = 0; j < maps.length; j++){
            let mapTiles = Q.getTilesAround(loc, maps[j], radius);
            for(let i = 0; i < mapTiles.length; i++){
                let cost = Q.getTileCost(mapTiles[i][2]);
                if(cost > tiles[i]) tiles[i] = cost;
            }
        }
        let space = false;
        for(let i = 0; i < tiles.length; i++){
            if(tiles[i] < 10) space = true;
        }
        return space;
    };
    Q.getTilesAround = function(loc, map, radius, corners){
        function validLoc(l){
            return map[l[1]] !== undefined ? map[l[1]][l[0]] : 0;
        }
        let tiles = [];
        if(corners){
            for(let i = -radius; i < radius + 1; i++){
                for(let j = -radius; j < radius + 1; j++){
                    if(i === 0 && j === radius) j++;
                    tiles.push([loc[0] + i, loc[1] + j - (radius - Math.abs(i)), validLoc([loc[0] + i, loc[1] + j - (radius - Math.abs(i))])]);
                }
            }
        } else {
            for(let i = -radius; i < radius + 1; i++){
                for(let j = 0; j < ((radius * 2 + 1) - Math.abs( i * 2)); j++){
                    if(i === 0 && j === radius) j++;
                    tiles.push([loc[0] + i, loc[1] + j - (radius - Math.abs(i)), validLoc([loc[0] + i, loc[1] + j - (radius - Math.abs(i))])]);
                }
            }
        }
        return tiles;
    };
    Q.getBorderTile = function(tile){
        let borderTile = GDATA.dataFiles["map-gen.json"].borderTiles[tile];
        return borderTile[0] + (borderTile[1] * 20);
    };
    Q.locsMatch = function(loc1, loc2){
        if(loc1[0] === loc2[0] && loc1[1] === loc2[1]) return true;
    };
    
    
    Q.loadMenu = function(){
        Q.inputs["menu"] = false;
        Q.stage(0).pause();
        Q.stageScene("menu", 2);
        Q.AudioController.playSound("open-menu.mp3");
    };
};