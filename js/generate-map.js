Quintus.GenerateMap = function(Q){
    Q.GameObject.extend("mapGenerator",{
        getRandomItemFromGrid: function(grid, items, max){
            let randItem = Math.random() * (max || 100);
            let acc = 0;
            for(let l = 0; l < grid.length; l++){
                acc += grid[l];
                if(randItem < acc){
                    return items[l];
                }
            }
        },
        getObjectCenter: function(obj, round){
            let center = [obj.loc[0] + obj.w / 2, obj.loc[1] + obj.h / 2];
            return round ? [~~center[0], ~~center[1]] : center;
        },
        getDistanceBetweenPoints: function(a, b){
            return Math.max(0, Math.abs(a[0] - b[0])) + Math.max(0, Math.abs(a[1] - b[1]));
        },
        getDistanceTo: function(obj1, obj2){
            let obj1Center = Q.MapGen.getObjectCenter(obj1);
            let obj2Center = Q.MapGen.getObjectCenter(obj2);
            let x = Math.abs(obj1Center[0] - obj2Center[0]);
            let y = Math.abs(obj1Center[1] - obj2Center[1]);
            let distX = Math.max(0, x - (obj1.w / 2 + obj2.w / 2));
            let distY = Math.max(0, y - (obj1.h / 2 + obj2.h / 2));
            return distX + distY;
        },
        //Returns a location that is valid for placement of a chunk
        getLocInBounds: function(map, chunks, chunk, mapWidth, mapHeight){
            chunk.minDistFromEdge = chunk.minDistFromEdge || 1;
            let chunkW = chunk.w,
                chunkH = chunk.h,
                minX = chunk.minDistFromEdge, 
                minY = chunk.minDistFromEdge,
                maxX = mapWidth - chunk.minDistFromEdge - chunkW,
                maxY = mapHeight - chunk.minDistFromEdge - chunkH,
                loc;
            let farmChunk = chunks.find(function(c){return c.type === "farm";});
            let townChunk = chunks.find(function(c){return c.type === "town";});
            function generateLoc(){
                return [~~(Math.random() * (maxX - minX) + minX), ~~(Math.random() * (maxY - minY) + minY)];
            }
            function processOptions(){
                let success = false;
                if(chunk.minDistFromFarm || chunk.maxDistFromFarm){
                    let dist = Q.MapGen.getDistanceTo(farmChunk, {w: chunkW, h: chunkH, loc: loc});
                    if(chunk.minDistFromFarm){
                        if(dist < chunk.minDistFromFarm) success = true;
                    }
                    if(chunk.maxDistFromFarm){
                        if(dist > chunk.maxDistFromFarm) success = true;
                    }
                }
                if(chunk.minDistFromTown || chunk.maxDistFromTown){
                    let dist = Q.MapGen.getDistanceTo(townChunk, {w: chunkW, h: chunkH, loc: loc});
                    if(chunk.minDistFromTown){
                        if(dist < chunk.minDistFromTown) success = true;
                    }
                    if(chunk.maxDistFromTown){
                        if(dist > chunk.maxDistFromTown) success = true;
                    }
                }
                return success;
            }
            function overlap(){
                for(let i = 0; i < chunkH; i++ ){
                    for(let j = 0; j < chunkW; j++ ){
                        if(map[loc[1] + i][loc[0] + j] !== 0) return true;
                    }
                }
                if(chunk.exit){
                    for(let i = 0; i < chunk.exit.length; i++){
                        let cost = Q.getTileCost(map[loc[1] + chunk.exit[i][1]][loc[0] + chunk.exit[i][0]]);
                        if(cost > 10) {
                            return true;
                        }
                    }
                }
                return false;
            }
            //Process the x,y location based on its relative positioning. Don't overlap other chunks.
            let iterations = 0;
            do {
                loc = generateLoc();
                iterations ++;
                if(iterations > 1000){
                    iterations = 0;
                    return console.log("Failed to generate this map: ", map, chunk);
                } //TODO: Regenerate map if it really fails
            } while(overlap() || processOptions());
            return loc;
        },
        //Draws along a path and doesn't care what's in the way
        bulldozePath: function(map, path, tile, thickness, corners){
            if(!corners){
                for(let i = 0; i < path.length; i++){
                    for(let k = 0; k < thickness * 2 + 1; k ++){
                        let paths = [[path[i].x - thickness + k, path[i].y], [path[i].x + thickness - k, path[i].y], [path[i].x, path[i].y - thickness + k], [path[i].x, path[i].y + thickness - k]];
                        paths.forEach(function(p){
                            if(map[p[1]]) map[p[1]][p[0]] = tile;
                        });
                    }
                }
            } else {
                for(let i = 0; i < path.length; i++){
                    for(let j = -thickness; j < thickness + 1; j++){
                        for(let k = -thickness; k < thickness + 1; k++){
                            if(map[path[i].y + j] && map[path[i].y + j][path[i].x + k] >= 0) {
                                map[path[i].y + j][path[i].x + k] = tile;
                            }
                        }
                    }
                }
            }
        },
        //Draws along a path
        drawPath: function(map, path, tile, thickness, corners){
            for(let i = 0; i < path.length; i++){
                if(!corners){
                    for(let k = 0; k < thickness * 2 + 1; k ++){
                        let paths = [[path[i].x - thickness + k, path[i].y], [path[i].x + thickness - k, path[i].y], [path[i].x, path[i].y - thickness + k], [path[i].x, path[i].y + thickness - k]];
                        paths.forEach(function(p){
                            if(map[p[1]] && map[p[1]][p[0]] === 0) {
                                map[p[1]][p[0]] = tile;
                            }
                        });
                    }
                } else {
                    for(let k = -thickness; k < thickness - 1; k++){
                        for(let l = -thickness; l < thickness - 1; l++){
                            if(map[path[i].y + k] && map[path[i].y + k][path[i].x + l] === 0) {
                                map[path[i].y + k][path[i].x + l] = tile;
                            }
                        }
                    }
                }
            }
        },
        //Carves wall tiles
        fillPath: function(map, path, wallTile, floorTile, thickness){
            for(let i = 0; i < path.length; i++){
                for(let k = 0; k < thickness * 2 + 1; k ++){
                    let paths = [[path[i].x - thickness + k, path[i].y], [path[i].x + thickness - k, path[i].y], [path[i].x, path[i].y - thickness + k], [path[i].x, path[i].y + thickness - k]];
                    paths.forEach(function(p){
                        if(map[p[1]] && map[p[1]][p[0]] === wallTile) {
                            map[p[1]][p[0]] = floorTile;
                        }
                    });
                }
                 //map[path[i].y][path[i].x] = theme.floorTile;
            }
        },
        
        getMapPortion: function(tiles, startLoc, w, h){
            let portion = [];
            for(let i = 0; i < h; i++){
                for(let j = 0; j < w; j++){
                    portion.push(tiles[startLoc[1] + i][startLoc[0] + j]);
                }
            }
            return portion;
        },
        //Randomly generates chunks that have no tiles provided.
        generateChunk: function(chunk, theme, objects, finishMap){
            function rand(chance){
                return Math.random() < chance;
            }
            function setBorderTiles(tiles, excludeTiles, mainTile, borderTile, options){
                options = options || {};
                function needsBorder(tile, main, useType){
                    if(!useType){
                        if(tile === main) return true;
                    } else {
                        if(Q.getTile(tile).type === useType) return true;
                    }
                }
                let directions = [1, 2, 8, 4];
                for(let i = 0; i < tiles.length; i++){
                    for(let j = 0; j < tiles[0].length; j++){
                        //Set the tile to border if it needs it.
                        if(needsBorder(tiles[i][j], mainTile, options.useType)){
                            let frame = 0;
                            let tilesAround = Q.getTilesAround([j, i], tiles, 1);
                            for( let k = 0; k < tilesAround.length; k++){
                                let tileType = Q.getTile(tilesAround[k][2]).type;
                                if(!excludeTiles.includes(tileType)) frame += directions[k];
                            }
                            if(frame){
                                tiles[i][j] = borderTile + Q.getBorderTile(frame);
                            }
                        }
                    }
                }
            }
            function setBottomCornerTiles(tiles, borderTile, cornerTile){
                for(let i = 0; i < tiles.length; i++){
                    for(let j = 0; j < tiles[0].length; j++){
                        let bottomLeft = tiles[i + 1] && (tiles[i + 1][j] === borderTile + 20 || tiles[i + 1][j] === borderTile + 40);
                        let left = tiles[i][j - 1] && (tiles[i][j - 1] === borderTile + 40 || tiles[i][j - 1] === borderTile + 41);
                        if(bottomLeft && left){
                            tiles[i][j] = cornerTile;
                        } else {   
                            let bottomRight = tiles[i + 1] && (tiles[i + 1][j] === borderTile + 22 || tiles[i + 1][j] === borderTile + 42);
                            let right = tiles[i][j + 1] && (tiles[i][j + 1] === borderTile + 42 || tiles[i][j + 1] === borderTile + 41);
                            if(bottomRight && right){
                                tiles[i][j] = cornerTile + 1;
                            }
                        }
                    }
                }
            }
            function drawVerticalBridge(tiles, bridgeTileLoc){
                let bridgeStarted = false;
                let bridgeTiles = [];
                for(let i = 0; i < tiles.length; i++){
                    if(tiles[i][bridgeTileLoc] === theme.waterTile){
                        if(!bridgeStarted){
                            tiles[i][bridgeTileLoc] = theme.riverBridgeVertical - 1;
                            bridgeStarted = true;
                        } else {
                            tiles[i][bridgeTileLoc] = theme.riverBridgeVertical;
                        }
                        tiles[i][bridgeTileLoc - 1] = theme.waterTile;
                        tiles[i][bridgeTileLoc + 1] = theme.waterTile;
                        bridgeTiles.push([bridgeTileLoc, i]);
                    }
                    else if(bridgeStarted){
                        tiles[i][bridgeTileLoc] = theme.riverBridgeVertical + 1;
                        tiles[i][bridgeTileLoc - 1] = theme.waterTile;
                        tiles[i][bridgeTileLoc + 1] = theme.waterTile;
                        bridgeStarted = false;
                        bridgeTiles.push([bridgeTileLoc, i]);
                    }
                }
                return bridgeTiles;
            }
            function drawHorizontalBridge(tiles, bridgeTileLoc){
                let bridgeStarted = false;
                let bridgeTiles = [];
                for(let i = 0; i < tiles[bridgeTileLoc].length; i++){
                    if(tiles[bridgeTileLoc][i] === theme.waterTile){
                        if(!bridgeStarted){
                            tiles[bridgeTileLoc][i] = theme.riverBridgeHorizontal - 1;
                            bridgeStarted = true;
                        } else {
                            tiles[bridgeTileLoc][i] = theme.riverBridgeHorizontal;
                        }
                        tiles[bridgeTileLoc - 1][i] = theme.waterTile;
                        tiles[bridgeTileLoc + 1][i] = theme.waterTile;
                        bridgeTiles.push([i, bridgeTileLoc]);
                    }
                    else if(bridgeStarted){
                        tiles[bridgeTileLoc][i] = theme.riverBridgeHorizontal + 1;
                        bridgeStarted = false;
                        tiles[bridgeTileLoc - 1][i] = theme.waterTile;
                        tiles[bridgeTileLoc + 1][i] = theme.waterTile;
                        bridgeTiles.push([i, bridgeTileLoc]);
                    }
                }
                return bridgeTiles;
            }
            function genRandomLoc(w, h){
                return [~~(Math.random() * w), ~~(Math.random() * h)];
            }
            function validPath(path, minPathLen){
                if(path.length > minPathLen) return true;
            }
            function randomBorderLoc(w, h, dir){
                let axis = [0, 0];
                let minOrMax = 0;
                if(dir){
                    if(dir === "left"){
                        axis[1] = 1;
                        minOrMax = 1;
                    } else if(dir === "up"){
                        axis[0] = 1;
                        minOrMax = 1;
                    } else if(dir === "right"){
                        axis[1] = 1;
                        minOrMax = 0;
                    } else {
                        axis[0] = 1;
                        minOrMax = 0;
                    }
                } else {
                    axis[~~(Math.random() * 2)] = 1;
                    minOrMax = ~~(Math.random() * 2);
                }
                let x = ~~((Math.random() * ((w - 2) + 1)) + 2);
                let y = ~~((Math.random() * ((h - 2) + 1)) + 2);
                return [x * axis[0] + w * minOrMax * axis[1], y * axis[1] + h * minOrMax * axis[0]];
            }
            //Random along border
            function randomPlayerSpawn(tiles, toLoc, dir, matrix, minPathLen){
                let path = [];
                let w = chunk.tiles[0].length - 1;
                let h = chunk.tiles.length - 1;
                let loc;
                do {
                    loc = randomBorderLoc(w, h, dir);
                    if(Q.getTileCost(tiles[loc[1]][loc[0]]) < 10){
                        path = Q.getPath(loc, toLoc, matrix);
                    }
                }
                while(!validPath(path, minPathLen))
                return [path, loc];
            }
            //Sends a loc that has nothing on it back within a certain range. Tries 10 times, otherwise return false
            function generateValidLoc(tiles, w, h, x, y, objW, objH){
                function areaInvalid(tiles, loc, objW, objH){
                    let valid = true;
                    for(let i = 0; i < objH ; i++){
                        for(let j = 0; j < objW ; j++){
                            if(Q.getTileCost(tiles[loc[1] + i][loc[0] + j]) !== 1) valid = false;
                        }
                    }
                    return valid;
                }
                let loc;
                let tries = 0;
                do {
                    let randX = x + ~~(Math.random() * w);
                    let randY = y + ~~(Math.random() * h);
                    loc = [randX, randY];
                    tries ++ ;
                } while(tries < 10 && !areaInvalid(tiles, loc, objW, objH));
                return tries === 10 ? false : loc;
            }
            function goUntilEmptyTile(tiles, start, coord){
                let tile = start;
                do {
                    tile = [tile[0] + coord[0], tile[1] + coord[1]];
                } while(tiles[tile[1]] && tiles[tile[1]][tile[0]] !== 0);
                if(!tiles[tile[1]]) tile = [tile[0] - coord[0], tile[1] - coord[1]];
                return tile;
            }
            function validateLoc(loc, minW, minH, maxW, maxH){
                let validLoc = loc;
                if(loc[0] < minW) validLoc[0] = minW;
                else if(loc[0] > maxW - 1) validLoc[0] = maxW;
                if(loc[1] < minH) validLoc[1] = minH;
                else if(loc[1] > maxH - 1) validLoc[1] = maxH;
                return validLoc;
            }
            function collisionOrNot(tile, c){
                if(Array.isArray(c)){
                    return c.includes(tile);
                } else if(c === "excludeZero"){
                    let cost = Q.getTileCost(tile);
                    return cost <= 10 && tile !== 0;
                }  else if(typeof c === "string"){
                    let type = Q.getTile(tile).type;
                    return type === c;
                } else { 
                    let cost = Q.getTileCost(tile);
                    return cost <= 10;
                }
            }
            function getPocketTiles(loc, tiles, dirty, collision){
                let checkNow = [loc];
                let checkNext;
                let pocketTiles = [];
                let minX = tiles[0].length;
                let minY = tiles.length;
                let maxX = 0;
                let maxY = 0;
                function setBounds(x, y){
                    if(x < minX) minX = x;
                    else if(x > maxX) maxX = x;
                    if(y < minY) minY = y;
                    else if(y > maxY) maxY = y;
                }
                do {
                    checkNext = [];
                    for(let i = 0; i < checkNow.length; i++){
                        let c = checkNow[i];
                        if(!dirty[c[1]][c[0]] && collisionOrNot(tiles[c[1]][c[0]], collision)){
                            setBounds(c[0], c[1]);
                            pocketTiles.push([c[0], c[1]]);
                            //Expand to all directions
                            
                            if(dirty[c[1] - 1] && dirty[c[1] - 1][c[0]] === 0) checkNext.push([c[0], c[1] - 1]);
                            if(dirty[c[1]][c[0] + 1] === 0) checkNext.push([c[0] + 1, c[1]]);
                            if(dirty[c[1] + 1] && dirty[c[1] + 1][c[0]] === 0) checkNext.push([c[0], c[1] + 1]);
                            if(dirty[c[1]][c[0] - 1] === 0) checkNext.push([c[0] - 1, c[1]]);
                        }
                        dirty[c[1]][c[0]] = 1;
                    }
                    checkNow = checkNext;
                } while(checkNow.length);
                let w = Math.abs(maxX - minX);
                let h = Math.abs(maxY - minY);
                return {tiles: pocketTiles, w: w, h: h, center: pocketTiles[~~(pocketTiles.length / 2)]};
            }
            function getPockets(tiles, collision){
                let checked = Q.createArray(0, tiles[0].length, tiles.length);
                let pockets = [];
                for(let i = 0; i < tiles.length; i++){
                    for(let j = 0; j < tiles[0].length; j++){
                        if(!checked[i][j] && collisionOrNot(tiles[i][j], collision)){
                            pockets.push(getPocketTiles([j, i], tiles, checked, collision));
                        }
                        checked[i][j] = 1;
                    }
                }
                return pockets;
            }
            function clearPockets(tiles, groundTile, matrix, pocketTile){
                //Only create one of these if needed
                let noScoreMatrix;
                let pockets = getPockets(tiles, pocketTile);
                //Connect the pockets.
                if(pockets.length > 1){
                    for(let i = 0; i < pockets.length - 1; i++){
                        let path = Q.getPath(pockets[i].center, pockets[(i + 1)].center, matrix);
                        //If this path is taking way too long, just go straight
                        if(path.length > tiles[0].length / 2){
                            Q.MapGen.drawPath(tiles, path, groundTile, 0);
                            if(!noScoreMatrix) noScoreMatrix = Q.MapGen.generateNoScoreMatrix(tiles);
                            path = Q.getPath(pockets[i].center, pockets[(i + 1)].center, noScoreMatrix);
                        }
                        Q.MapGen.bulldozePath(tiles, path, groundTile, 1);
                    }
                }
            }
            function connectPockets(tiles, groundTile, matrix, pocketTile){
                let pockets = getPockets(tiles, pocketTile);
                if(pockets.length > 1){
                    for(let i = 0; i < pockets.length - 1; i++){
                        let path = Q.getPath(pockets[i].center, pockets[(i + 1)].center, matrix);
                        Q.MapGen.drawPath(tiles, path, groundTile, 0);
                    }
                }
                
            }
            function fillPockets(tiles, maxPocketLen, replaceTile, collision){
                let pockets = getPockets(tiles, collision);
                if(pockets.length > 1){
                    let largest = pockets[0];
                    for(let i = 1; i < pockets.length; i++){
                        if(pockets[i].tiles.length > largest.tiles.length){
                            largest = pockets[i];
                        }
                    }
                    for(let i = 0; i < pockets.length; i++){
                        if(pockets[i] !== largest && pockets[i].tiles.length < maxPocketLen){
                            for(let j = 0; j < pockets[i].tiles.length; j++){
                                tiles[pockets[i].tiles[j][1]][pockets[i].tiles[j][0]] = replaceTile;
                            }
                        }
                    }
                }
            }
            function cleanMap(tiles, mainTile, groundTile, thickness){
                let thicknessTiles = thickness * 2 - 1;
                let cleanedMap = Q.createArray(0, tiles[0].length, tiles.length);
                for(let i = 0; i < tiles.length; i++){
                    for(let j = 0; j < tiles[0].length; j++){
                        let valid = true;
                        //Make a 3x3 shape
                        for(let l = 0; l < thicknessTiles; l++){
                            for(let m = 0; m < thicknessTiles; m++){
                                if(tiles[i + l]){
                                    if(tiles[i + l][j + m] !== mainTile){
                                        valid = false;
                                    }
                                } else {
                                    valid = false;
                                }
                            }
                        }
                        for(let l = 0; l < thicknessTiles; l++){
                            for(let m = 0; m < thicknessTiles; m++){
                                if(valid){
                                    if(cleanedMap[i + l]) cleanedMap[i + l][j + m] = 1;
                                }
                            }
                        }
                    }
                }
                for(let i = 0; i < cleanedMap.length; i++){
                    for(let j = 0; j < cleanedMap[0].length; j++){
                        if(tiles[i][j] === mainTile && cleanedMap[i][j] === 0) {
                            tiles[i][j] = groundTile;
                        }
                    }
                }
            };
            function createRoom(tile, w, h){
                let roomW = ~~(Math.random() * w / 2) + 4;
                let roomH = ~~(Math.random() * h / 2) + 4;
                let roomTiles = Q.createArray(tile, roomW, roomH);
                let roomLoc = genRandomLoc(w - roomW - 1, h - roomH - 1);
                roomLoc[0] ++;
                roomLoc[1] ++;
                return {loc: roomLoc, w: roomW, h:roomH, tiles: roomTiles};
            }
            
            //Gets the first instance of a certain sized square chunk. When calling this function, put in a while loop to go through each of them.
            function getSquareChunk(tiles, toGet, tileToGet){
                //Make sure the tiles are all equal to the tileToGet
                function validSquare(square){
                    if(!square.length) return false;
                    for(let i = 0; i < square.length; i++){
                        if(square[i] !== tileToGet) return false;
                    }
                    return true;
                }
                function getSquare(x, y, size){
                    let t = [];
                    for(let a = 0; a < size; a++){
                        for(let b = 0; b < size; b++){
                            if(y + a >= tiles.length || x + b >= tiles[0].length){
                                return [];
                            } else {
                                t.push(tiles[y + a][x + b]);
                            }
                        }
                    }
                    return t;
                }
                if(toGet === "largest"){
                    let largestBoxLoc;
                    let largestBoxSize = 0;
                    for(let i = 0; i < tiles.length; i++){
                        for(let j = 0; j < tiles[0].length; j++){
                            let squareTiles = [];
                            let size = 0;
                            do {
                                size ++;
                                squareTiles = getSquare(j, i, size + 1);
                            } while(validSquare(squareTiles));
                            if(size >= largestBoxSize){
                                largestBoxSize = size;
                                largestBoxLoc = [j, i];
                            }
                        }
                    }
                    return {loc: largestBoxLoc, size: largestBoxSize};
                } 
                else {
                    //toGet is a number. Get all of this size or bigger
                    for(let i = 0; i < tiles.length; i++){
                        for(let j = 0; j < tiles[0].length; j++){
                            let squareTiles = [];
                            let size = 0;
                            do {
                                size ++;
                                squareTiles = getSquare(j, i, size + 1);
                            } while(validSquare(squareTiles));
                            if(size >= toGet){
                                return {loc: [j, i], size: size};
                            }
                        }
                    }
                }
            }
            //Takes an array that is created by the Q.getTilesWithin function ([x, y, tileIdx]) and replaces each istance of tileToReplace with replaceWith.
            function replaceAllOfThisTile(tilesAround, tiles, tileToReplace, replaceWith){
                for(let i = 0; i < tilesAround.length; i++){
                    if(tilesAround[i][2] === tileToReplace && tiles[tilesAround[i][1]]){
                        tiles[tilesAround[i][1]][tilesAround[i][0]] = replaceWith;
                    }
                }
            }
            
            if(chunk.type === "river"){
                let drawDirection = [0, 0];
                if(chunk.riverDirection){
                    if(chunk.riverDirection === "horizontal"){
                        drawDirection[0] = 1;
                    } else {
                        drawDirection[1] = 1;
                    }
                } else {
                    drawDirection[~~(Math.random() * 2)] = 1;
                }
                let lastLoc = [0, 0];
                let path = [lastLoc];
                let minX = 0, 
                    maxX = 0, 
                    minY = 0, 
                    maxY = 0;
                let lastDirectionCount = 0;
                let lastDirectionX = 0;
                let lastDirectionY = 0;
                for(let i = 0; i < chunk.len; i++){
                    let randX = Math.round(Math.random()) * 2 - 1;
                    let randY = Math.round(Math.random()) * 2 - 1;
                    if(lastDirectionCount > chunk.riverThickness){
                        //randX = 0;
                        //randY = 0;
                    }
                    let x = Math.min(lastLoc[0] + 1, lastLoc[0] + randX + drawDirection[0]);
                    let y = Math.min(lastLoc[1] + 1, lastLoc[1] + randY + drawDirection[1]);
                    lastLoc = [x, y];
                    path.push(lastLoc);
                    minX = Math.min(x, minX);
                    minY = Math.min(y, minY);
                    maxX = Math.max(x, maxX);
                    maxY = Math.max(y, maxY);
                    if(lastDirectionX === randX || lastDirectionY === randY){
                        lastDirectionCount ++;
                    } else {
                        lastDirectionX = randX;
                        lastDirectionY = randY;
                        lastDirectionCount = 0;
                    }
                }
                let width = (Math.abs(minX) + Math.abs(maxX));
                let height = (Math.abs(minY) + Math.abs(maxY));
                let bank = chunk.bank * 2;
                let thickness = chunk.riverThickness * 2 + 1 + 2;
                let arrW = width + bank + thickness;
                let arrH = height + bank + thickness;
                let offsetX = (minX + maxX) / 2;
                let offsetY = (minY + maxY) / 2;
                let startX = ~~(arrW / 2 - offsetX) * drawDirection[1];
                let startY = ~~(arrH / 2 - offsetY) * drawDirection[0];
                let tilesWidth = width + ((bank + thickness) * drawDirection[1]) + drawDirection[0];
                let tilesHeight = height + ((bank + thickness) * drawDirection[0]) + drawDirection[1];
                let tiles = Q.createArray(0, tilesWidth, tilesHeight);

                for( let i = 0; i < path.length; i++){
                    for( let j = -chunk.riverThickness; j < chunk.riverThickness + 1; j++){
                        if(tiles[startY + path[i][1] + j * drawDirection[0]]) tiles[startY + path[i][1] + j * drawDirection[0]][startX + path[i][0]+ j * drawDirection[1]] = theme.waterTile;
                    }
                }
                //Round the river edges
                cleanMap(tiles, theme.waterTile, theme.floorTile, 2);
                let bridgeTileLoc = Math.floor(Math.random() * ((tilesWidth * drawDirection[0]) + (tilesHeight * drawDirection[1]) - 4)) + 2;
                let bridgeTiles;
                if(drawDirection[0]){
                    bridgeTiles = drawVerticalBridge(tiles, bridgeTileLoc);
                } else {
                    bridgeTiles = drawHorizontalBridge(tiles, bridgeTileLoc);
                }
                chunk.tiles = tiles;
                chunk.maxExitDistFromEdge = 4;
                chunk.w = tiles[0].length;
                chunk.h = tiles.length;
                //Set the exit to the middle of the bridge.
                chunk.exit = [
                    [bridgeTileLoc * drawDirection[0] + ~~(tilesWidth / 2) * drawDirection[1], bridgeTileLoc * drawDirection[1] + ~~(tilesHeight / 2) * drawDirection[0]]
                ];
                //let matrix = Q.MapGen.generateAstarMatrix(chunk.tiles);
                
                let treeMatrixTiles = [];
                for(let i = 0; i < chunk.tiles.length; i++){
                    treeMatrixTiles.push([]);
                    for(let j = 0; j < chunk.tiles[0].length; j++){
                        if(chunk.tiles[i][j] === theme.treeTile){
                            treeMatrixTiles[i].push(1);
                        } else if(Q.getTile(chunk.tiles[i][j]).type === "bridge"){
                            treeMatrixTiles[i].push(2);
                        } else if(chunk.tiles[i][j] === theme.floorTile){
                            treeMatrixTiles[i].push(2);
                        } else if(chunk.tiles[i][j] === theme.waterTile){
                            treeMatrixTiles[i].push(2);
                        } else {
                            treeMatrixTiles[i].push(100);
                        }
                    }
                }
                let treeMatrix = Q.MapGen.generateSetScoreMatrix(treeMatrixTiles);
                let largestArea;
                //Get rid of big patches of forest.
                do {
                    largestArea = getSquareChunk(chunk.tiles, "largest", 0);
                    for(let i = 0; i < largestArea.size; i++){
                        for(let j = 0; j < largestArea.size; j++){
                            let center = [largestArea.loc[0] + ~~(largestArea.size / 2), largestArea.loc[1] + ~~(largestArea.size / 2)];
                            if(chunk.tiles[center[1]]){
                                Q.MapGen.drawPath(chunk.tiles, Q.getPath(chunk.exit[0], center, treeMatrix), theme.floorTile, 1);
                            }
                        }
                    }
                } while(largestArea.size > 3);
                
                //Create a bubble of floorTile at each end of the bridge where there is no tile.
                replaceAllOfThisTile(Q.getTilesAround(bridgeTiles[0], chunk.tiles, 5), chunk.tiles, 0, theme.floorTile);
                replaceAllOfThisTile(Q.getTilesAround(bridgeTiles[bridgeTiles.length - 1], chunk.tiles, 5), chunk.tiles, 0, theme.floorTile);
                
                
                
                fillPockets(chunk.tiles, 3, theme.treeTile, [theme.floorTile]);
                
                let pockets = getPockets(chunk.tiles, "excludeZero");
                //TODO: spawn some treasure on smaller pockets???
                
                setBorderTiles(tiles, ["bridge", "water"], theme.waterTile, theme.waterBorder);
                
            } else if(chunk.type === "mine"){

            } else if(chunk.type === "forest"){
                let w = chunk.w;
                let h = chunk.h;
                //Create empty matrix
                let tiles = Q.createArray(0, w, h);
                chunk.tiles = tiles;
                let matrix;
                let houses = chunk.houses;
                let houseObjects = [];
                chunk.door = [];
                chunk.exit = [];
                chunk.interior = [];
                if(houses){
                    for(let i = 0; i < houses.length; i++){
                        let house = houses[i];
                        let obj = Object.assign({}, house);
                        obj.loc = [~~(Math.random() * (w - obj.w)),  ~~(Math.random() * (h - obj.h))];
                        for(let j = 0; j < house.door.length; j++){
                            let door = house.door[j];
                            let interiorNum = ~~(Math.random() * door[2].length);
                            chunk.exit.push([obj.loc[0] + door[0], obj.loc[1] + door[1] + 1]);
                            chunk.door.push([obj.loc[0] + door[0], obj.loc[1] + door[1], [0]]);
                            chunk.interior.push(obj.interior[door[2][interiorNum]]);
                        }
                        houseObjects.push(obj);
                        Q.MapGen.drawChunk(chunk.tiles, obj, obj.tiles);
                    }
                    let matrix = Q.MapGen.generateAstarMatrix(chunk.tiles);
                    for(let i = 0; i < houseObjects.length ; i++){
                        let border = randomBorderLoc(w - 1, h - 1);
                        Q.MapGen.drawPath(chunk.tiles, Q.getPath(border, chunk.exit[i], matrix), theme.floorTile, 1);
                    }
                    
                }
                if(!matrix) matrix = Q.MapGen.generateAstarMatrix(chunk.tiles);
                
                let randomTiles = [theme.floorTile + 1, theme.wallTile + 1];
                generateShape = function(){
                    randTile = function(){
                        return randomTiles[~~(Math.random() * 2)];
                    };
                    let shapeW = 7;
                    let shapeH = 7;
                    let tiles = [
                        randTile(),22,22,22,22,22,randTile(),
                        22,22,22,randTile(),22,22,22,
                        22,22,randTile(),101,randTile(),22,22,
                        22,randTile(),101,101,101,randTile(),22,
                        22,22,randTile(),101,randTile(),22,22,
                        22,22,22,randTile(),22,22,22,
                        randTile(),22,22,22,22,22,randTile()
                    ];
                    
                    return {w: shapeW, h: shapeH, tiles:tiles, loc: genRandomLoc(w - shapeW, h - shapeH)};
                };
                
                let numOfPaths = 3;
                
                for(let i = 0; i < numOfPaths; i++){
                    let shape = generateShape();
                    Q.MapGen.drawChunkOnFloor(chunk.tiles, shape, shape.tiles);
                    let randomLoc = genRandomLoc(w, h);
                    Q.MapGen.drawPath(chunk.tiles, Q.getPath(shape.loc, randomLoc, matrix), theme.floorTile, 1);
                    //Get the closest house and draw a path to there.
                    if(houseObjects.length){
                        let distances = [];
                        for(let i = 0; i < houseObjects.length; i++){
                            let house = houseObjects[i];
                            let dist = Q.MapGen.getDistanceBetweenPoints(chunk.exit[i], shape.loc);
                            distances.push([dist, chunk.exit[i]]);
                        }
                        distances.sort(function(x, y){return x[0] > y[0];});
                        let closestLoc = distances[0][1];
                        let path = Q.getPath(shape.loc, closestLoc, matrix);
                        path.push(shape.loc);
                        path.push(closestLoc);
                        Q.MapGen.drawPath(chunk.tiles, path, theme.floorTile, 0);
                        
                    }
                }
                //Make it extra pretty
                Q.MapGen.beautifyMap(chunk.tiles, theme, chunk.beautifulPercentage || theme.beautifulPercentage);
                
            } else if(chunk.type === "lake"){
                let tiles = chunk.tiles = Q.createArray(0, chunk.w, chunk.h);
                let center = [~~(chunk.w / 2), ~~(chunk.h / 2)];
                let lakeSize = ~~(Math.random() * (chunk.lakeSize[1] - chunk.lakeSize[0])) + chunk.lakeSize[0];
                let lakeRadiusW = ~~(chunk.w / lakeSize);
                let lakeRadiusH = ~~(chunk.h / lakeSize);
                let lakeBubbles = chunk.lakeBubbles || 3;
                let lakeInfo = {
                    width: chunk.w,
                    height: chunk.h
                };
                
                for(let i = -lakeRadiusH; i < lakeRadiusH + 1; i++){
                    for(let j = -lakeRadiusW; j < lakeRadiusW + 1; j++){
                        if(Math.abs(i) + Math.abs(j) <= (lakeRadiusH + lakeRadiusW) / 1.6 ){
                            tiles[i + center[1]][j + center[0]] = theme.waterTile;
                        }
                    }
                }
                let bubbleRadiusW = Math.ceil(lakeRadiusW / 2);
                let bubbleRadiusH = Math.ceil(lakeRadiusH / 2);
                let minX = center[0] - lakeRadiusW + 1;
                let maxX = center[0] + lakeRadiusW - 1;
                let minY = center[1] - lakeRadiusH + 1;
                let maxY = center[1] + lakeRadiusH - 1;
                for(let i = 0; i < lakeBubbles; i++){
                    let randLoc = [~~(Math.random() * (maxX - minX)) + minX, ~~(Math.random() * (maxY - minY)) + minY];
                    let randEdge = (Math.random() * 2) + 1;
                    for(let j = -bubbleRadiusH; j < bubbleRadiusH + 1; j++){
                        for(let k = -bubbleRadiusW; k < bubbleRadiusW + 1; k++){
                            if(Math.abs(j) + Math.abs(k) <= (bubbleRadiusH + bubbleRadiusW) / randEdge){
                                tiles[randLoc[1] + j][randLoc[0] + k] = theme.waterTile;
                            }
                        }
                    }
                }
                let matrix = Q.MapGen.generateAstarMatrix(tiles);
                let points = [
                    goUntilEmptyTile(tiles, center, [-1, 0]),
                    goUntilEmptyTile(tiles, center, [0, -1]),
                    goUntilEmptyTile(tiles, center, [1, 0]),
                    goUntilEmptyTile(tiles, center, [0, 1])
                ];
                let paths = [
                    Q.getPath(points[0], points[1], matrix),
                    Q.getPath(points[1], points[2], matrix),
                    Q.getPath(points[2], points[3], matrix),
                    Q.getPath(points[3], points[0], matrix)
                ];
                for(let i = 0 ; i < paths.length; i++){
                    if(paths[i].length){
                        Q.MapGen.drawPath(tiles, paths[i], theme.floorTile, 1);
                    }
                }
                
                let hasIsland = ~~(Math.random() + chunk.island);
                if(hasIsland){
                    lakeInfo.hasIsland = true;
                    let islandSize = ~~(Math.random() * (chunk.islandSize[1] - chunk.islandSize[0])) + chunk.islandSize[0];
                    let islandRadiusW = Math.max(2, ~~(lakeRadiusW / islandSize));
                    let islandRadiusH = Math.max(2, ~~(lakeRadiusH / islandSize));
                    for(let i = -islandRadiusH; i < islandRadiusH + 1; i++){
                        for(let j = -islandRadiusW; j < islandRadiusW + 1; j++){
                            let tile = theme.floorTile;
                            if(i === -islandRadiusH || i === islandRadiusH || j === -islandRadiusW || j === islandRadiusW){
                                let rand = ~~(Math.random() * 1.5);
                                if(rand) tile = theme.waterTile;
                            }
                            let forestRand = ~~(Math.random() + chunk.islandForest);
                            if(forestRand) tile = theme.treeTile;
                            tiles[i + center[1]][j + center[0]] = tile;
                        }
                    }
                    let hasDungeonOnIsland = ~~(Math.random() + chunk.islandDungeon);
                    tiles[center[1]][center[0]] = -1;//Reserve dungeon entrance tile
                    let spawns = chunk.islandSpawnObject;
                    for(let i = 0; i < spawns.length; i++){
                        let num = spawns[i].min ? ~~(Math.random() * (spawns[i].max - spawns[i].min)) + spawns[i].min : 1;
                        for( let j = 0; j < num; j++){
                            let chance = spawns[i].chance || 1;
                            let item = Q.getObjectData(spawns[i].tile);
                            let loc = generateValidLoc(tiles, islandRadiusW * 2, islandRadiusH * 2, center[0] - islandRadiusW, center[1] - islandRadiusH, item.w, item.h);
                            if(loc && tiles[loc[1]][loc[0]] !== -1){
                                tiles[loc[1]][loc[0]] = -1;// Reserve this tile since there will be an object placed on it.
                                chunk.spawnObject.push({tile: spawns[i].tile, loc: loc, chance: chance});
                            }
                            
                        }
                    }
                    if(hasDungeonOnIsland){
                        lakeInfo.hasDungeon = true;
                        tiles[center[1]][center[0]] = 224;
                        chunk.door = [[center[0], center[1], [0]]];
                        chunk.interior = chunk.islandDungeonInterior;
                    }
                }
                
                setBorderTiles(tiles, ["bridge", "water"], theme.waterTile, theme.waterBorder);
                Q.MapGen.currentlyCreating.info.lake.push(lakeInfo);
                Q.MapGen.beautifyMap(chunk.tiles, theme, chunk.beautifulPercentage || theme.beautifulPercentage);
            } 
            //Create a floor in the dungeon
            else if(chunk.type === "dungeonFloor"){
                
                //TODO: remake most of this using the pockets function etc...
                
                let depth = chunk.depth;
                let curFloor = chunk.floor;
                chunk.spawnItem = [];
                let w = chunk.floorW;
                let h = chunk.floorH;
                let size = w * h;
                let dungeonLevel = chunk.level;
                let oreGrid = GDATA.dataFiles["map-gen.json"].oreGrid[dungeonLevel - 1];
                let oreItems = GDATA.dataFiles["map-gen.json"].oreItems[dungeonLevel - 1];
                
                let tiles = Q.createArray(theme.dungeonTile, w, h);
                let tiles2 = Q.createArray(0, w, h);
                let objectsGrid = Q.createArray(0, w, h);
                let matrix = Q.MapGen.generateAstarMatrix(tiles);
                
                let roomNum = chunk.rooms;
                let rooms = [];
                for(let i = 0; i < roomNum; i++){
                    let room = createRoom(theme.dungeonGround, w, h);
                    Q.MapGen.setBorder(room.tiles, theme.dungeonTile, room.tiles[0].length, room.tiles.length);
                    Q.MapGen.drawChunk(tiles, {w: room.w, h: room.h, loc: room.loc}, room.tiles);
                    for(let j = 0; j < rooms.length; j ++){
                        let path = Q.getPath([~~(rooms[j].loc[0] + rooms[j].w / 2), ~~(rooms[j].loc[1] + rooms[j].h / 2)], [~~(room.loc[0] + room.w / 2), ~~(room.loc[1] + room.h / 2)], matrix);
                        Q.MapGen.bulldozePath(tiles, path, theme.dungeonGround, 0);
                    }
                    rooms.push(room);
                }
                //Clean the rooms
                for(let i = 0; i < rooms.length; i++){
                    for(let j = 1; j < rooms[i].h - 2; j++){
                        for(let k = 1; k < rooms[i].w - 2; k++){
                            tiles[rooms[i].loc[1] + j][rooms[i].loc[0] + k] = theme.dungeonGround;
                        }
                    }
                    //Randomly put a tile in the corners
                    if(~~(Math.random() * 2)) tiles[rooms[i].loc[1] + 1][rooms[i].loc[0] + 1] = theme.dungeonTile;
                    if(~~(Math.random() * 2)) tiles[rooms[i].loc[1] + 1][rooms[i].loc[0] + rooms[i].w - 2] = theme.dungeonTile;
                    if(~~(Math.random() * 2)) tiles[rooms[i].loc[1] + rooms[i].h - 2][rooms[i].loc[0] + rooms[i].w - 2] = theme.dungeonTile;
                    if(~~(Math.random() * 2)) tiles[rooms[i].loc[1] + rooms[i].h - 2][rooms[i].loc[0] + 1] = theme.dungeonTile;
                }
                let maxSprings = 3;
                for(let i = 0; i < maxSprings; i++){
                    let makeSpring = ~~(Math.random() + 0.1);
                    if(makeSpring){
                        let springTiles = [
                            [189, 189, 189],
                            [189, 90, 189],
                            [189, 189, 189]
                        ];
                        let springW = 3;
                        let springH = 3;
                        let springLoc = genRandomLoc(w - springW - 1, h - springH - 1);
                        springLoc[0] ++;
                        springLoc[1] ++;
                        let spring = {w: springW, h: springH, loc: springLoc, tiles: springTiles};
                        let numItems = 2;
                        for(let j = 0; j < numItems; j++){
                            let makeItem  = ~~(Math.random() + 0.75);
                            if(makeItem){
                                let loc = genRandomLoc(springW, springH);
                                let item = Q.MapGen.generateObject({tile: 147, w: 1, h: 1, loc: [0, 0]}, [springLoc[0] + loc[0], springLoc[1] + loc[1]]);
                                objects.push(item);
                                
                            }
                        }
                        Q.MapGen.drawChunkOnFloor(tiles, spring, spring.tiles, theme.dungeonGround);
                        Q.MapGen.drawChunkOnFloor(tiles, spring, spring.tiles, theme.dungeonTile);
                        let exit = Q.MapGen.getClosestExit(spring, rooms[0]);
                        let path = Q.getPath(rooms[0].loc, exit, matrix);
                        Q.MapGen.fillPath(tiles, path, theme.dungeonTile, theme.dungeonGround, 1);
                    }
                }
                
                let openTiles = [];
                for(let i = 0; i < tiles.length; i++){
                    for(let j = 0; j < tiles[0].length; j++){
                        if(tiles[i][j] === theme.dungeonGround) openTiles.push([j, i]);
                    }
                }
                
                //Place a bunch of random breakable rocks.
                let num = ~~((Math.random() * openTiles.length / 4) + openTiles.length / 4);
                for(let i = 0; i < num; i++){
                    let item, obj, loc;
                    loc = openTiles.splice(~~(Math.random() * openTiles.length), 1)[0];
                    if(i === 0){
                        obj = {tile: 22, loc: loc, processed: ["ladder", "down", theme.ladderDown]};
                    } else if(i === 1){
                        obj = {tile: 22, loc: loc, processed: ["pitfall", ~~(Math.random() * 5), theme.pitfall]};
                    } else {
                        item = Q.MapGen.getRandomItemFromGrid(oreGrid, oreItems);
                        obj = {tile: 22, loc: loc, processed: [item, 1]};
                    }
                    chunk.spawnItem.push(obj);
                }
                
                chunk.playerSpawn = openTiles.splice(~~(Math.random() * openTiles.length), 1)[0];
                chunk.ladder = [[chunk.playerSpawn[0], chunk.playerSpawn[1], "up", theme.ladderUp]];
                tiles2[chunk.playerSpawn[1]][chunk.playerSpawn[0]] = theme.ladderUp;
                
                //50% chance of spawning a ladder without having to uncover it.
                let spawnLadderOnEmpty = ~~(Math.random() * 2);
                if(spawnLadderOnEmpty){
                    let loc = openTiles.splice(~~(Math.random() * openTiles.length), 1)[0];
                    chunk.ladder.push([loc[0], loc[1], "down", theme.ladderDown]);
                    tiles2[loc[1]][loc[0]] = theme.ladderDown;
                }
                
                let spawnPitfallOnEmpty = ~~(Math.random() * 1.1);
                if(spawnPitfallOnEmpty){
                    let loc = openTiles.splice(~~(Math.random() * openTiles.length), 1)[0];
                    chunk.pitfall = [[loc[0], loc[1], ~~(Math.random() * 5), theme.pitfall]];
                }
                
                
                
                //setBorderTiles(tiles, ["bridge", "water"], theme.waterTile, theme.waterBorder);
                Q.MapGen.setBorder(tiles, theme.dungeonTile, tiles[0].length, tiles.length);
                setBorderTiles(tiles, ["dungeon-wall"], theme.dungeonTile, theme.dungeonBorder);
                
                
                
                
                chunk.tiles = tiles;
                chunk.tiles2 = tiles2;
                chunk.spawnObject = objects;
                Q.MapGen.beautifyMap(chunk.tiles, theme, chunk.beautifulPercentage || theme.beautifulPercentage);
            } else if(chunk.type === "rocks" || chunk.type === "dungeon"){
                //TODO: Depending on the images, I may need either a custom setBorderTiles, or include checking all 8 directions to get the correct tile.
                let tiles = chunk.tiles = Q.createArray(0, chunk.w, chunk.h);
                let size = chunk.w * chunk.h;
                let center = [~~(chunk.w / 2), ~~(chunk.h / 2)];
                let rockFormations = chunk.rockFormations;
                let formationW = chunk.w;
                let formationH = chunk.h;
                let formationThickness = 2;
                let formationLength = chunk.formationLength;
                for(let i = 0; i < rockFormations; i++){
                    let startLoc = validateLoc(genRandomLoc(formationW, formationH), formationThickness, formationThickness, formationW - formationThickness / 2, formationH - formationThickness / 2);
                    
                    let curLoc = startLoc;
                    let paths = [{x: startLoc[0], y: startLoc[1]}];
                    for(let j = 0; j < formationLength; j++){
                        let rand = [Math.round(Math.random() * 2) - 1, Math.round(Math.random() * 2) - 1];
                        curLoc = validateLoc([curLoc[0] + rand[0], curLoc[1] + rand[1]], formationThickness, formationThickness, chunk.w - formationThickness / 2, chunk.h - formationThickness / 2);
                        paths.push({x: curLoc[0], y: curLoc[1]});
                    }
                    Q.MapGen.drawPath(tiles, paths, theme.rocksTile, formationThickness, true);
                }
                chunk.tiles = tiles;
                let matrix = Q.MapGen.generateAstarMatrix(chunk.tiles);
                
                /*
                for(let i = 0; i < chunk.tiles.length; i++){
                    for(let j = 0; j < chunk.tiles[0].length; j++){
                        if(Q.getTileCost(chunk.tiles[j][i]) <= 10){
                            let path = Q.getPath(center, [j, i], matrix, 100000);
                            if(!path.length){
                                chunk.tiles[i][j] = theme.rocksTile;
                            }
                        }
                    }
                }*/
                
                tiles[center[1]][center[0]] = theme.rocksGround;
                
                clearPockets(chunk.tiles, theme.rocksGround, matrix);
                cleanMap(chunk.tiles, theme.rocksTile, theme.rocksGround, formationThickness);
                
                //Create some grass "splotches" in each of the corners
                for(let i = 0; i < 8; i ++){
                    for(let j = 0; j < 8 - i; j++){
                        //Do all 4 corners at once
                        if(Q.getTileCost(chunk.tiles[i][j]) <= 10) chunk.tiles[i][j] = theme.spiceTiles.rocks[0];
                        if(Q.getTileCost(chunk.tiles[i][chunk.tiles[0].length - 1 - j]) <= 10) chunk.tiles[i][chunk.tiles[0].length - 1 - j] = theme.spiceTiles.rocks[0];
                        if(Q.getTileCost(chunk.tiles[chunk.tiles.length - 1 - i][chunk.tiles[0].length - 1 - j]) <= 10) chunk.tiles[chunk.tiles.length - 1 - i][chunk.tiles[0].length - 1 - j] = theme.spiceTiles.rocks[0];
                        if(Q.getTileCost(chunk.tiles[chunk.tiles.length - 1 - i][j]) <= 10) chunk.tiles[chunk.tiles.length - 1 - i][j] = theme.spiceTiles.rocks[0];
                    }
                }
                
                for(let i = 0; i < chunk.tiles.length; i++){
                    for(let j = 0; j < chunk.tiles[0].length; j++){
                        if(chunk.tiles[i][j] === 0){
                            chunk.tiles[i][j] = theme.treeTile;
                        }
                    }
                }
                //Set initial borders
                setBorderTiles(chunk.tiles, ["rock-wall"], theme.rocksTile, theme.rocksBorder);
                //Set bottom corner tiles
                setBottomCornerTiles(chunk.tiles, theme.rocksBorder, theme.rocksCorner);
                
                let anyOverlap = false;
                do {
                    anyOverlap = false;
                    //Get the pockets of rocksTile
                    let mountains = getPockets(chunk.tiles, [theme.rocksTile]);
                    if(mountains.length > 1){
                        let mountainsTiles = Q.createArray(1000, chunk.tiles[0].length, chunk.tiles.length);
                        //Set up all rocksTiles in an array
                        for(let i = 0; i < mountains.length; i++){
                            for(let j = 0; j < mountains[i].tiles.length; j++){
                                mountainsTiles[mountains[i].tiles[j][1]][mountains[i].tiles[j][0]] = 1;
                            }
                        }
                        let mountainsMatrix = Q.MapGen.generateSetScoreMatrix(mountainsTiles);
                        //Check if there's any overlap. (Any rocksTile that is 4 or 5 spaces)
                        for(let i = 0; i < mountains.length - 1; i++){
                            let pathBetweenTwo = Q.getPath(mountains[i].center, mountains[(i + 1)].center, mountainsMatrix);
                            let consecutive = 0;
                            let consecutiveStart;
                            for(let j = 0; j < pathBetweenTwo.length; j++){
                                if(pathBetweenTwo[j].weight === 1000){
                                    if(!consecutive){
                                        consecutiveStart = j;
                                    }
                                    consecutive ++;
                                }
                            }
                            if(consecutive <= formationThickness * 2){
                                //Merge the mountains.
                                for(let j = 0; j < consecutive; j++){
                                    Q.MapGen.bulldozePath(chunk.tiles, [pathBetweenTwo[consecutiveStart + j]], theme.rocksTile, 2, true);
                                }
                                anyOverlap = true;
                            }
                        }
                    }
                    if(anyOverlap){
                        //Convert all rock walls into rockTile
                        for(let i = 0; i < chunk.tiles.length; i++){
                            for(let j = 0; j < chunk.tiles[0].length; j++){
                                if(Q.getTile(chunk.tiles[i][j]).type === "rock-wall"){
                                    chunk.tiles[i][j] = theme.rocksTile;
                                }
                            }
                        }
                        //Get rid of all pockets (All walkable tiles should be able to be reached)
                        clearPockets(chunk.tiles, theme.rocksGround, matrix);
                        //Make sure there is nothing less than 3x3
                        cleanMap(chunk.tiles, theme.rocksTile, theme.rocksGround, formationThickness);
                        //Set initial borders
                        setBorderTiles(chunk.tiles, ["rock-wall"], theme.rocksTile, theme.rocksBorder);
                        //Set bottom corner tiles
                        setBottomCornerTiles(chunk.tiles, theme.rocksBorder, theme.rocksCorner);
                    }
                } while(anyOverlap);
                
                //Fill all pockets except the main one.
                fillPockets(chunk.tiles, size, theme.treeTile);
                Q.MapGen.beautifyMap(chunk.tiles, theme, chunk.beautifulPercentage || theme.beautifulPercentage);
                
                //Create a dungeon entrance and outer sign, as well as the first floor.
                if(chunk.type === "dungeon"){
                    let rocksWithSpaceBelow = [];
                    for(let i = 0; i < chunk.tiles.length; i++){
                        for(let j = 0; j < chunk.tiles[i].length; j++){
                            if(Q.getTile(chunk.tiles[i][j]).type === "rock-wall"){
                                let valid = true;
                                //Sides for 2 tiles (4 total)
                                let mustBeRockWall = [
                                    Q.getTile(chunk.tiles[i][j - 2]).type, 
                                    Q.getTile(chunk.tiles[i][j - 1]).type, 
                                    Q.getTile(chunk.tiles[i][j + 1]).type, 
                                    Q.getTile(chunk.tiles[i][j + 2]).type
                                ];
                                let mustBeEmpty;
                                if(chunk.tiles[i + 1]){
                                    //Bottom 3 tiles
                                    mustBeEmpty = [
                                        Q.getTileCost(chunk.tiles[i + 1][j]), 
                                        Q.getTileCost(chunk.tiles[i + 1][j - 1]), 
                                        Q.getTileCost(chunk.tiles[i + 1][j + 1])
                                    ];
                                } else {
                                    valid = false;
                                }
                                
                                if(valid){
                                    for(let k = 0; k < mustBeRockWall.length; k++){
                                        if(mustBeRockWall[k] !== "rock-wall"){
                                            valid = false;
                                        }
                                    }
                                }
                                if(valid){
                                    for(let k = 0; k < mustBeEmpty.length; k++){
                                        if(mustBeEmpty[k] >= 10){
                                            valid = false;
                                        }
                                    }
                                }
                                if(valid){
                                    rocksWithSpaceBelow.push([j, i]);
                                }
                            }
                        }
                    }
                    if(!rocksWithSpaceBelow.length){
                        return Q.MapGen.generateChunk(chunk, theme, objects, finishMap);
                    }
                    let dungeonEntrance = rocksWithSpaceBelow[~~(Math.random() * rocksWithSpaceBelow.length)];
                    chunk.door = [[dungeonEntrance[0], dungeonEntrance[1], [0]]];
                    chunk.tiles[dungeonEntrance[1]][dungeonEntrance[0]] = 224;
                    
                    //TODO: create a sign outside of the dungeon that is the same as the one inside.
                    
                    //Create the first floor interior based on the exterior rocks.
                    
                    chunk.interior[0].w = chunk.w + 2;
                    chunk.interior[0].h = chunk.h + 2;
                    let interiorTiles1 = Q.createArray(0, chunk.interior[0].w, chunk.interior[0].h);
                    let interiorTiles2 = Q.createArray(0, chunk.interior[0].w, chunk.interior[0].h);
                    
                    
                    let mountainPockets = getPockets(chunk.tiles, "rock-wall");
                    //Figure out which pocket contains the dungeon entrance and create the interior tiles based on this mountain.
                    //TODO: figure out correct pocket (using [0] right now)
                    //Offset is the extra border around the chunk.
                    let offset = 1;
                    let pocket = mountainPockets[0];
                    for(let i = 0; i < pocket.tiles.length; i++){
                        let loc = pocket.tiles[i];
                        interiorTiles1[loc[1] + offset][loc[0] + offset] = theme.dungeonGround;
                    }
                    for(let i = offset; i < interiorTiles1.length - offset; i++){
                        for(let j = offset; j < interiorTiles1[0].length - offset; j++){
                            if(interiorTiles1[i][j] === 0){
                                interiorTiles1[i][j] = theme.rocksTile;
                            }
                        }
                    }
                    interiorTiles1[dungeonEntrance[1] + offset][dungeonEntrance[0] + offset] = theme.dungeonGround;
                    chunk.interior[0].playerSpawn = [dungeonEntrance[0] + offset, dungeonEntrance[1] + offset];
                    
                    chunk.interior[0].door = [[chunk.interior[0].playerSpawn[0], chunk.interior[0].playerSpawn[1] + 1, "outside"]];
                    interiorTiles1[chunk.interior[0].playerSpawn[1] + 1][chunk.interior[0].playerSpawn[0]] = theme.dungeonExit;
                    
                    //Randomly place the ladder on a floor tile.
                    let floor = getPockets(interiorTiles1, theme.dungeonGround)[0];
                    let ladderLoc = floor.tiles[~~(Math.random() * floor.tiles.length)];
                    
                    chunk.interior[0].ladder = [[ladderLoc[0], ladderLoc[1], "down", theme.ladderDown]];
                    //TODO: add sign to exterior and interior.
                    
                    Q.MapGen.setBorder(interiorTiles1, theme.dungeonTile, interiorTiles1[0].length, interiorTiles1.length);
                    setBorderTiles(interiorTiles1, ["dungeon-wall"], theme.dungeonTile, theme.dungeonBorder);
                    chunk.interior[0].tiles = interiorTiles1;
                    chunk.interior[0].tiles2 = interiorTiles2;
                    
                }
                
            }
            
            
            if(finishMap){
                let matrix = Q.MapGen.generateAstarMatrix(chunk.tiles);
                let spawnPath = randomPlayerSpawn(chunk.tiles, chunk.exit[0], chunk.playerDir, matrix, chunk.maxExitDistFromEdge);
                chunk.playerSpawn = [spawnPath[1][0], spawnPath[1][1]];
                Q.MapGen.setBorder(chunk.tiles, theme.wallTile, chunk.tiles[0].length, chunk.tiles.length);
                chunk.tiles[chunk.playerSpawn[1]][chunk.playerSpawn[0]] = theme.floorTile;
                Q.MapGen.fillBlanks(chunk.tiles, theme);
                Q.MapGen.fillPath(chunk.tiles, spawnPath[0], theme.wallTile, theme.floorTile, chunk.pathThickness || 0);

                Q.MapGen.drawPath(chunk.tiles, Q.getPath(chunk.exit[0], [3, 3], matrix), theme.floorTile, chunk.bank || 0);
                Q.MapGen.drawPath(chunk.tiles, Q.getPath(chunk.exit[0], [chunk.w - 3, 3], matrix), theme.floorTile, chunk.bank || 0);
                Q.MapGen.drawPath(chunk.tiles, Q.getPath(chunk.exit[0], [chunk.w - 3, chunk.h - 3], matrix), theme.floorTile, chunk.bank || 0);
                Q.MapGen.drawPath(chunk.tiles, Q.getPath(chunk.exit[0], [3, chunk.h - 3], matrix), theme.floorTile, chunk.bank || 0);
                Q.MapGen.beautifyMap(chunk.tiles, theme, chunk.beautifulPercentage || theme.beautifulPercentage);
            }
            return chunk;
        },
        //Adds a single chunk to the ground and objects map
        insertChunk: function(ground1, ground2, objects, chunks, chunk, mapWidth, mapHeight, chunkGrid, theme){
            if(chunks.length > 1){
                let exit;
                chunk.loc = chunk.loc || Q.MapGen.getLocInBounds(ground1, chunkGrid, chunk, mapWidth, mapHeight);
                if(!chunk.loc) return false;
                if(chunk.type !== "farm" && chunk.exit){
                    let farmChunk = chunks.find(function(c){return c.type === "farm";});
                    exit = Q.MapGen.getClosestExit(chunk, farmChunk);
                    //If the exit is being blocked by another chunk, remake this chunk
                    if(Q.getTileCost(ground1[exit[1]][exit[0]]) > 10) {
                        chunk.loc = false;
                        return insertChunk(ground1, ground2, objects, chunks, chunk, mapWidth, mapHeight, chunkGrid, theme);
                    }
                    ground1[exit[1]][exit[0]] = -1; //Reserve exit space so nothing gets placed on it.
                }
                chunk.exit = exit;
            } else {
                chunk.loc = chunk.loc || [0, 0];
            }
            Q.MapGen.drawChunk(ground1, chunk, chunk.tiles);
            if(chunk.tiles2) Q.MapGen.drawChunk(ground2, chunk, chunk.tiles2);
            return chunk;
        },
        insertChunks: function(ground1, ground2, objects, chunks, mapWidth, mapHeight, theme, mainMap){
            let chunkGrid = [];
            //Add the chunk to the map. If the chunk is randomly generated (and not generated already), make it here as well.
            for(let i = 0; i < chunks.length; i++){
                if(!chunks[i].tiles){
                    chunks[i] = Q.MapGen.generateChunk(chunks[i], theme, objects);
                }
                let chunk = Q.MapGen.insertChunk(ground1, ground2, objects, chunks, chunks[i], mapWidth, mapHeight, chunkGrid, theme);
                if(!chunk) return false;
                chunkGrid.push(chunk);
            }
            //Force the player spawn location to not have objects placed on it.
            let playerSpawn = [chunkGrid[0].playerSpawn[0] + chunkGrid[0].loc[0], chunkGrid[0].playerSpawn[1] + chunkGrid[0].loc[1]];
            let oldTile = ground1[playerSpawn[1]][playerSpawn[0]];
            ground1[playerSpawn[1]][playerSpawn[0]] = -2;
            if(mainMap){
                //Connect the chunk to the farm
                Q.MapGen.connectChunks(ground1, chunkGrid, objects, theme);
                //Fill any 0's with walls and -1's with floor tiles
                Q.MapGen.fillBlanks(ground1, theme);
                //Make the map look a little nicer
                Q.MapGen.beautifyMap(ground1, theme, theme.beautifulPercentage);
            }
            
            //Add any spawn objects on top (randomly generated objects don't land on collision tiles)
            for(let i = 0; i < chunks.length; i++){
                Q.MapGen.createObjects(ground1, ground2, objects, theme, chunks[i]);
            }
            ground1[playerSpawn[1]][playerSpawn[0]] = oldTile;
            return chunkGrid;
        },
        spotTaken: function(map, spot){
            if(!map[spot[1]] || (map[spot[1]] && map[spot[1]][spot[0]])) return true;
        },
        drawChunkOnFloor: function(map, obj, tiles, floor){
            floor = floor || 0;
            //If we've passed a matrix ( [height.. [width]] )
            if(tiles[1][0] >= 0){
                let chunkLoc = obj.loc;
                for( let i = 0; i < obj.h; i++){
                    for( let j = 0; j < obj.w; j++){
                        if(map[i + chunkLoc[1]][j + chunkLoc[0]] === floor) map[i + chunkLoc[1]][j + chunkLoc[0]] = tiles[i][j];
                    }
                }
            } 
            //If we've passed single dimensional array ( [width + height] )
            else {
                let chunkLoc = obj.loc;
                for( let i = 0; i < obj.h; i++){
                    for( let j = 0; j < obj.w; j++){
                        if(map[i + chunkLoc[1]][j + chunkLoc[0]] === floor) map[i + chunkLoc[1]][j + chunkLoc[0]] = tiles[j + i * obj.w]  - 1;
                    }
                }
            }
        },
        drawChunk: function(map, obj, tiles){
            //If we've passed a matrix ( [height.. [width]] )
            if(tiles[1][0] >= 0){
                let chunkLoc = obj.loc;
                for( let i = 0; i < obj.h; i++){
                    for( let j = 0; j < obj.w; j++){
                        map[i + chunkLoc[1]][j + chunkLoc[0]] = tiles[i][j];
                    }
                }
            } 
            //If we've passed single dimensional array ( [width + height] )
            else {
                let chunkLoc = obj.loc;
                for( let i = 0; i < obj.h; i++){
                    for( let j = 0; j < obj.w; j++){
                        map[i + chunkLoc[1]][j + chunkLoc[0]] = tiles[j + i * obj.w]  - 1;
                    }
                }
            }
        },
        drawChunkWithinBounds: function(map, obj, tiles){
            //If we've passed a matrix ( [height.. [width]] )
            if(tiles[1][0] >= 0){
                let chunkLoc = obj.loc;
                for( let i = 0; i < obj.h; i++){
                    for( let j = 0; j < obj.w; j++){
                        if(map[i + chunkLoc[1]]) map[i + chunkLoc[1]][j + chunkLoc[0]] = tiles[i][j];
                    }
                }
            } 
            //If we've passed single dimensional array ( [width + height] )
            else {
                let chunkLoc = obj.loc;
                for( let i = 0; i < obj.h; i++){
                    for( let j = 0; j < obj.w; j++){
                        if(map[i + chunkLoc[1]]) map[i + chunkLoc[1]][j + chunkLoc[0]] = tiles[j + i * obj.w] - 1;
                    }
                }
            }
        },
        getClosestExit: function(a, b){
            if(!a.exit) return Q.MapGen.getObjectCenter(a, true);
            let bCenter = Q.MapGen.getObjectCenter(b, true);
            let distances = [];
            for(let i = 0; i < a.exit.length; i++){
                if(!b.exit){
                    distances.push([Q.MapGen.getDistanceBetweenPoints([a.loc[0]+ a.exit[i][0], a.loc[1]+ a.exit[i][1]], bCenter), a.exit[i]]);
                } else {
                    for(let j = 0; j < b.exit.length; j++){
                        distances.push([Q.MapGen.getDistanceBetweenPoints([a.loc[0]+ a.exit[i][0], a.loc[1]+ a.exit[i][1]], [b.loc[0]+ b.exit[j][0], b.loc[1]+ b.exit[j][1]]), a.exit[i]]);
                    }
                }
            }
            distances.sort(function(x, y){return x[0] > y[0];});
            //Determine highest number from array
            return [a.loc[0] + distances[0][1][0], a.loc[1] + distances[0][1][1]];
        },
        generateAstarMatrix: function(map){
            let astarMap = [];
            //For some reason the astar code wants the matrix in the map[x][y] format instead of map[y][x]
            for(let i = 0; i < map[0].length; i++){
                astarMap[i] = [];
                for(let j = 0; j < map.length; j++){
                    astarMap[i].push(Q.getTileCost(map[j][i]));
                }
            }
            return new Q.Graph(astarMap);
        },
        generateSetScoreMatrix: function(map){
            let astarMap = [];
            for(let i = 0; i < map[0].length; i++){
                astarMap[i] = [];
                for(let j = 0; j < map.length; j++){
                    astarMap[i].push(map[j][i]);
                }
            }
            return new Q.Graph(astarMap);
        },
        generateNoScoreMatrix: function(map){
            let astarMap = Q.createArray(1, map[0].length, map.length);
            return new Q.Graph(astarMap);
        },
        //Does not take into account items spawned on top. For example, a log could spawn that blocks the path.
        connectChunks: function(map, chunkGrid, objectsList, theme){
            function getConnection(obj1, obj2, thickness, matrix){
                let obj1Point = obj1.exit || Q.MapGen.getClosestExit(obj1, obj2);
                let obj2Point = obj2.exit || Q.MapGen.getClosestExit(obj2, obj1);
                if(!obj1Point || !obj2Point) return false;
                let path = Q.getPath(obj1Point, obj2Point, matrix);
                return [path, thickness, obj2.type];
            }
            
            let farmChunk = chunkGrid.find(function(c){return c.type === "farm";});
            let townChunk = chunkGrid.find(function(c){return c.type === "town";});
            let connections = [];
            let connectFarmTo = ["plot", "lake", "river", "dungeon", "forage", "forest", "rocks"];
            let connectTownTo = ["river", "forest", "rocks"];
            for(let i = 0; i < chunkGrid.length; i++){
                let matrix = Q.MapGen.generateAstarMatrix(map);
                if(farmChunk !== chunkGrid[i] && connectFarmTo.includes(chunkGrid[i].type)){
                    let farmConnection = getConnection(farmChunk, chunkGrid[i], chunkGrid[i].pathThickness, matrix);
                    if(farmConnection){
                        connections.push(farmConnection);
                    }
                }
                if(townChunk !== chunkGrid[i] && connectTownTo.includes(chunkGrid[i].type)){
                    let townConnection = getConnection(townChunk, chunkGrid[i], 1, matrix);
                    if(townConnection){
                        connections.push(townConnection);
                    }
                }
            }
            function completeConnections(){
                function createRoadTiles(map, path, objType, floorTile, roadTile, dirtTile){
                    if(objType === "portal" || objType === "house"){
                        for(let j = 0; j < path.length; j++){
                            if(map[path[j].y][path[j].x] === floorTile  || map[path[j].y][path[j].x] === -1 || !Q.MapGen.spotTaken(map, [path[j].x, path[j].y])){
                                map[path[j].y][path[j].x] = roadTile;
                            }
                        }
                        return;
                    };
                    if(objType === "plot"){
                        //map[path[path.length-1].y][path[path.length-1].x] = roadTile;
                    }
                };
                function createThickTiles(map, path, objType, thickness, floorTile, roadTile, dirtTile){
                    for(let j = 0; j < path.length; j++){
                        if(thickness){
                            for(let k = 0; k < thickness * 2 + 1; k ++){
                                // + shape
                                let paths = [
                                    [path[j].x - thickness + k, path[j].y], 
                                    [path[j].x + thickness - k, path[j].y], 
                                    [path[j].x, path[j].y],
                                    [path[j].x, path[j].y - thickness + k], 
                                    [path[j].x, path[j].y + thickness - k]
                                ];
                                paths.forEach(function(p){
                                    if(!Q.MapGen.spotTaken(map, p)){
                                        map[p[1]][p[0]] = floorTile;
                                    }
                                });
                                //Randomly spawn an object on if possible
                                if(theme.roadForage){
                                    //Chance to spawn
                                    let rand = Math.floor(Math.random() + theme.roadForage.percentage);
                                    if(rand){
                                        let item = Q.MapGen.getRandomItemFromGrid(theme.roadForage.forageGrid, theme.roadForage.items);
                                        let randLoc = paths[Math.floor(Math.random() * paths.length)];
                                        if(Q.getTileCost(map[randLoc[1]][randLoc[0]]) < 10){
                                            objectsList.push(Q.MapGen.generateObject({tile: item, loc: [0, 0]}, randLoc));
                                        }
                                    }
                                }
                            }
                        }
                    }

                }
                for(let i = 0; i < connections.length; i++){
                    let props = connections[i];
                    let path = props[0];
                    let thickness = props[1] || 0;
                    let pathToObjType = props[2];
                    if(!path) continue;
                    createRoadTiles(map, path, pathToObjType, theme.floorTile, theme.roadTile, theme.dirtTile);
                    createThickTiles(map, path, pathToObjType, thickness, theme.floorTile, theme.roadTile, theme.dirtTile);
                }
            }
            //Put plots and forages first
            /*connections.sort(function(c){return c[2] === "plot" || c[2] === "forage" ? 0 : 1;});
            //Put the portals last
            connections.sort(function(c){return c[2] === "portal" ? 1 : 0;});*/
            completeConnections();
        },
        fillBlanks: function(map, theme){
            for( let i = 0; i < map[0].length; i++){
                for(let j = 0; j < map.length; j++){
                    if(map[j] && map[j][i] === 0) map[j][i] = theme.wallTile;
                    if(map[j] && map[j][i] === -1) map[j][i] = theme.floorTile;
                }
            }
        },
        beautifyMap: function(map, theme, beautifulPercentage){
            //Generate 2-4% spicy tiles
            let mapW = map[0].length;
            let mapH = map.length;
            let dim = mapW * mapH;
            let numberOfSpicySquares = Math.floor(Math.random() * (dim * beautifulPercentage));
            for(let i = 0; i < numberOfSpicySquares; i++){
                let coord = [Math.floor(Math.random() * mapW), Math.floor(Math.random() * mapH)];
                let tile = map[coord[1]][coord[0]];
                if(tile === theme.floorTile) map[coord[1]][coord[0]] = theme.spiceTiles.floor[Math.floor(Math.random() * theme.spiceTiles.floor.length)];
                if(tile === theme.roadTile) map[coord[1]][coord[0]] = theme.spiceTiles.road[Math.floor(Math.random() * theme.spiceTiles.road.length)];
                if(tile === theme.wallTile) map[coord[1]][coord[0]] = theme.spiceTiles.wall[Math.floor(Math.random() * theme.spiceTiles.wall.length)];
                if(tile === theme.dirtTile) map[coord[1]][coord[0]] = theme.spiceTiles.dirt[Math.floor(Math.random() * theme.spiceTiles.dirt.length)];
                if(tile === theme.waterTile) map[coord[1]][coord[0]] = theme.spiceTiles.river[Math.floor(Math.random() * theme.spiceTiles.river.length)];
                if(tile === theme.dungeonGround) map[coord[1]][coord[0]] = theme.spiceTiles.dungeon[Math.floor(Math.random() * theme.spiceTiles.dungeon.length)];
            }
        },
        setBorder: function(map, borderTile, mapWidth, mapHeight){
            //Set up border around stage (left -> right - 1 tile, right -> bottom - 1 tile, etc... First tile is always corner)
            for(let i = 0; i < mapWidth - 1; i++){
                if(Q.getTileCost(map[0][i]) < 10) map[0][i] = borderTile;
                if(Q.getTileCost(map[mapHeight - 1][mapWidth - 1 - i]) < 10) map[mapHeight - 1][mapWidth - 1 - i] = borderTile;
            }
            for(let i = 0; i < mapHeight - 1; i++){
                if(Q.getTileCost(map[i][mapWidth - 1]) < 10) map[i][mapWidth - 1] = borderTile;
                if(Q.getTileCost(map[mapHeight - 1 - i][0]) < 10) map[mapHeight - 1 - i][0] = borderTile;
            }
        },
        generateObject: function(object, loc){
            let data = Q.getObjectData(object.tile);
            let objLoc = object.loc ? [loc[0] + object.loc[0], loc[1] + object.loc[1]] : false;
            let newObj = this.createObjectData(objLoc, object, data);
            return newObj;
        },
        
        generateNPC:function(character, loc){
            let num = Math.floor(Math.random() * character.sprite.length);
            let charLoc = character.loc[num];
            let dir = character.dir[num];
            let sprite = character.sprite[num];
            let type = character.type[num][Math.floor(Math.random() * character.type[num].length)];
            let speechNum = Math.floor(Math.random() * type[1].length);
            let dialogue = GDATA.dataFiles["map-gen.json"].npcProps[type[0]].speech[type[1][speechNum]];
            let props = GDATA.dataFiles["map-gen.json"].npcProps[type[0]].props;
            if(dialogue.info){
                let info = dialogue.info;
                switch(info[0]){
                    case "sell":
                        Q.MapGen.currentlyCreating.info.shops.push(info);
                        break;
                }
            }
            return {loc: [loc[0] + charLoc[0], loc[1] + charLoc[1]], type: type[0], dialogue:dialogue.dialogue, sheet:sprite, dir:dir, props: props, charType: type[0], charNum: type[1], speechNum:speechNum};
        },
        //Generates an item's quality when it is picked up for the first time (or processed)
        generateItemQuality: function(charQuality, charConsistency){
            let range = Math.max(0, charQuality - charConsistency);
            let bottom = Math.max(1, charQuality - range);
            let quality = ~~(Math.random() * range) + bottom;
            return quality;
        },
        createObjectData: function(objLoc, object, data){
            let newObj = Object.assign({}, data);
            newObj = Object.assign(newObj, object);
            newObj.loc = objLoc;
            return newObj;
        },
        addToMap: function(map, loc, w, h, tile){
            w = w || 1;
            h = h || 1;
            for( let i = 0; i < h; i++){
                for( let j = 0; j < w; j++){
                    map[loc[1] + i][loc[0] + j] = tile + j  + (i * 10);
                }
            }
        },
        getRelevantChunks: function(chunks){
            let relevant = [];
            for(let i = 0; i < chunks.length; i++){
                if(chunks[i].spawnObject || chunks[i].door) relevant.push(chunks[i]);
            }
            return relevant;
            
        },
        
        //Add or remove fish at every 30 minute interval in each chunk that has fish within this world.
        updateFishes: function(world){
            let stage = Q.stage(0);
            let temperature = world.temperature;
            let playerInside = stage.playerInside;
            let chunks = world.chunks;
            
            let allFish = world.map.objects.filter(function(obj){return obj.animal === "Fish";});
            for(let i = 0; i < chunks.length; i++){
                let chunk = chunks[i];
                let chunkData = Q.MapGen.getChunkData(chunk.type, chunk.idx);
                //Spawn and remove some fish
                if(chunkData.spawnFish){
                    //Remove some fish
                    let chunkFish = allFish.filter(function(fish){return Q.isWithinRange(fish, chunk);});
                    //TODO: come up with a logical number to remove.
                    let removeNum = 5;
                    if(chunkFish.length){
                        for(let j = 0; j < removeNum; j++){
                            let randRemove = ~~(Math.random() * chunkFish.length);
                            //Don't remove it if it's being fished right now.
                            if(!chunkFish[randRemove].beingFished){
                                Q.DataController.removeObjectFromMap(chunkFish[randRemove], world.map.objects, world.map.objectsGrid);
                                Q.DataController.removeFromAnimatedTiles("fish", chunkFish[randRemove].loc);
                                Q.DataController.removeObjectFromTileLayers(chunkFish[randRemove], [stage.lists.TileLayer[1], stage.lists.TileLayer[2]]);
                            }
                        }
                    }
                    //TODO: come up with a logical number to spawn.
                    //Spawn some fish
                    let spawnMore = 5;
                    let fishes = Q.MapGen.spawnNumOfFish(chunk, chunkData, temperature, spawnMore, world.map);
                    if(!playerInside && fishes.length){
                        for(let j = 0; j < fishes.length; j++){
                            stage.animatedTiles.fish.push(fishes[j].loc);
                        }
                    }
                }
            }
        },
        getAvailableFish: function(temp, fish){
            let availableFish = [];
            let chanceArray = [];
            for(let i = 0; i < fish.length; i++){
                let fishData = GDATA.dataFiles["map-gen.json"].fish.types[fish[i]];
                if(fishData.tempMin <= temp && fishData.tempMax >= temp){
                    availableFish.push(fishData);
                    chanceArray.push(fishData.rarity);
                }
            }
            return {availableFish: availableFish, chanceArray: chanceArray};
        },
        getChunkData: function(type, idx){
            return GDATA.dataFiles["map-gen.json"].chunks[type][idx];
        },
        getLocsOfCertainTile: function(map, match){
            let locs = [];
            //A tile type has been passed in
            if(typeof match === "string"){
                for(let i = 0; i < map.length; i++){
                    for(let j = 0; j < map[0].length; j++){
                        if(Q.getTile(map[i][j]).type === match) locs.push([j, i]);
                    }
                }
            } 
            //An array of tiles to matches
            else if(Array.isArray(match)){ 
                for(let i = 0; i < map.length; i++){
                    for(let j = 0; j < map[0].length; j++){
                        if(match.includes(map[i][j])) locs.push([j, i]);
                    }
                }
            } 
            //Match a specific tile
            else {
                for(let i = 0; i < map.length; i++){
                    for(let j = 0; j < map[0].length; j++){
                        if(map[i][j] === match) locs.push([j, i]);
                    }
                }
            }
            return locs;
        },
        spawnNumOfFish: function(chunk, chunkData, temperature, numOfFish, map){
            let waterTemperature = temperature * 0.75;
            let objects = map.objects;
            let objectsGrid = map.objectsGrid;
            function spawnOne(tiles){
                let randLocIdx;
                let times = 0;
                do {
                    randLocIdx = ~~(Math.random() * tiles.length);
                    times ++;
                } while(times < 10 && objectsGrid[chunk.loc[1] + tiles[randLocIdx][1]][chunk.loc[0] + tiles[randLocIdx][0]]);
                if(times < 10){
                    let fish = Object.assign({}, Q.MapGen.getRandomItemFromGrid(chanceArray, availableFish, allChances));
                    fish.loc = [chunk.loc[0] + tiles[randLocIdx][0], chunk.loc[1] + tiles[randLocIdx][1]];
                    fish.w = 1;
                    fish.h = 1;
                    //Add the fish to the objects array
                    objects.push(fish);
                    //Add the fish to the objects grid
                    Q.DataController.addToObjects(objectsGrid, fish.loc, fish.w, fish.h, fish);
                    return fish;
                }
                return false;
            }
            let waterTiles = chunk.waterTiles;
            let bridgeTiles = chunk.aroundBridgeWaterTiles;
            let spawn = chunkData.spawnFish;
            let available = Q.MapGen.getAvailableFish(waterTemperature, spawn.fish);
            let availableFish = available.availableFish;
            if(!availableFish.length) return;
            let chanceArray = available.chanceArray;
            let allChances = chanceArray.reduce(function(a, b){return a + b;}, 0);

            let fishes = [];
            let tilesets = bridgeTiles.length ? [waterTiles, bridgeTiles] : [waterTiles];
            for(let i = 0; i < numOfFish; i++){
                let fish = spawnOne(tilesets[~~(Math.random() * tilesets.length)]);
                if(fish){
                    fishes.push(fish);
                }
            }
            return fishes;
        },
        //Spawn fish on day start.
        spawnFishies: function(map, chunks, temperature){
            for(let i = 0; i < chunks.length; i++){
                let chunk = chunks[i];
                let chunkData = Q.MapGen.getChunkData(chunk.type, chunk.idx);
                if(chunkData.spawnFish){
                    let spawn = chunkData.spawnFish;
                    let numOfFish = ~~(Math.random() * (spawn.max - spawn.min)) + spawn.min;
                    Q.MapGen.spawnNumOfFish(chunk, chunkData, temperature, numOfFish, map);
                }
            }
        },
        spawnObjects: function(spawn, groundLayer, groundLayer2, objectsLayer, objects, chunk){
            function generateRandomLoc(loc, w, h){
                return [Math.floor(Math.random() * w) + loc[0], Math.floor(Math.random() * h) + loc[1]];
            }
            function areaInvalid(groundTiles, objectsTiles, loc, w, h, startLoc, maxW, maxH){
                for(let i = 0; i < h ; i++){
                    for(let j = 0; j < w ; j++){
                        if(loc[1] - startLoc[1] + i >= maxH || loc[0] - startLoc[0] + j >= maxW) return true;
                        if(Q.getTileCost(groundTiles[loc[1] + i][loc[0] + j]) > 10 || objectsTiles[loc[1] + i][loc[0] + j]) return true;
                    }
                }
            }
            function getAndSetObjectLoc(groundTiles, groundTiles2, objsMap, objectsList, object, chunk){
                if(!object.loc){
                    //Make sure we have room
                    let tries = 0;
                    while(tries < 20 && (!object.loc || areaInvalid(groundTiles, objsMap, object.loc, object.w, object.h, chunk.loc, chunk.w, chunk.h) || areaInvalid(groundTiles2, objsMap, object.loc, object.w, object.h,chunk.loc,  chunk.w, chunk.h))){
                        object.loc = generateRandomLoc(chunk.loc, chunk.w, chunk.h);
                        tries ++;
                    }
                    if(tries < 20){
                        Q.MapGen.addToMap(objsMap, object.loc, object.w, object.h, object.tile || -1);
                        objectsList.push(object);
                    }
                } else if(object.type === "furniture" || !areaInvalid(groundTiles, objsMap, object.loc, object.w, object.h, chunk.loc,  chunk.w, chunk.h) || !areaInvalid(groundTiles, objsMap, object.loc, object.w, object.h,chunk.loc,  chunk.w, chunk.h)){
                    Q.MapGen.addToMap(objsMap, object.loc, object.w, object.h, object.tile || -1);
                    objectsList.push(object);
                }
            }
            for(let j = 0; j < spawn.length; j++){
                let item = spawn[j];
                let num = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min || 1;
                let chance = item.chance || 1;
                for(let k = 0; k < num; k++){
                    if(Math.random() > 1 - chance){
                        getAndSetObjectLoc(groundLayer, groundLayer2, objectsLayer, objects, Q.MapGen.generateObject(item, chunk.loc), chunk);
                    }
                }
            }
        },
        createObjects: function(groundLayer, groundLayer2, objects, theme, chunk){
            if(chunk.spawnCharacter){
                for(let j = 0; j < chunk.spawnCharacter.length; j++){
                    let character = chunk.spawnCharacter[j];
                    let npc = Q.MapGen.generateNPC(character, chunk.loc);
                    npc.objType = "NPC";
                    objects.push(npc);
                }   
            }
            if(chunk.spawnFurniture){
                for(let j = 0; j < chunk.spawnFurniture.length; j++){
                    let item = chunk.spawnFurniture[j];
                    let itemData = Q.MapGen.generateObject(item, chunk.loc);
                    objects.push(itemData);
                }   
            }
            if(chunk.spawnItem){
                for(let j = 0; j < chunk.spawnItem.length; j++){
                    let item = chunk.spawnItem[j];
                    let itemData = Q.MapGen.generateObject(item, chunk.loc);
                    objects.push(itemData);
                }   
            }
            if(chunk.door){
                for(let i = 0; i < chunk.door.length; i++){
                    let doorSpawn = chunk.door[i];
                    let door;
                    if(doorSpawn[2] === "outside"){
                        door = {
                            loc: [doorSpawn[0] + chunk.loc[0], doorSpawn[1] + chunk.loc[1]], 
                            name:"door", 
                            type:chunk.type, 
                            objType: "Door",
                            target: doorSpawn[2]
                        };
                    } else {
                        let interior = chunk.interior[doorSpawn[2][Math.floor(Math.random() * doorSpawn[2].length)]];
                        if(!interior.tiles){
                            interior = Q.MapGen.generateChunk(interior, theme, objects, true);
                        }
                        interior.loc = interior.loc || [0, 0];
                        let interiorTiles1 = Q.createArray(0, interior.w, interior.h);
                        let interiorTiles2 = Q.createArray(0, interior.w, interior.h);
                        let interiorObjects = [];
                        let chunkGrid = Q.MapGen.getRelevantChunks(Q.MapGen.insertChunks(interiorTiles1, interiorTiles2, interiorObjects, [interior], interior.w, interior.h, theme));
                        door = {
                            loc: [doorSpawn[0] + chunk.loc[0], doorSpawn[1] + chunk.loc[1]], 
                            name:"door", 
                            type:chunk.type, 
                            objType: "Door",
                            map:{
                                ground1: interiorTiles1,
                                ground2: interiorTiles2,
                                objects: interiorObjects,
                                specialTiles: [],
                                objectsGrid: Q.MapGen.generateObjectsGrid(interiorObjects, interior.w, interior.h)
                            },
                            chunks: Q.MapGen.getRelevantChunkData(chunkGrid), 
                            playerSpawn: interior.playerSpawn, 
                            helpers: []
                        };
                        if(chunk.type === "dungeon"){
                            let bottom = interior.bottom[~~(Math.random() * interior.bottom.length)];
                            interior.deepestDive = 0;
                            let bottomTiles1 = Q.createArray(0, bottom.w, bottom.h);
                            let bottomTiles2 = Q.createArray(0, bottom.w, bottom.h);
                            let bottomObjects = [];
                            let bottomGrid = Q.MapGen.getRelevantChunks(Q.MapGen.insertChunks(bottomTiles1, bottomTiles2, bottomObjects, [bottom], bottom.w, bottom.h, theme));
                            door.bottom = {
                                loc: [0, 0],
                                map:{
                                    ground1: bottomTiles1,
                                    ground2: bottomTiles2,
                                    objects: bottomObjects,
                                    specialTiles: [],
                                    objectsGrid: Q.MapGen.generateObjectsGrid(bottomObjects, interior.w, interior.h)
                                },
                                chunks: Q.MapGen.getRelevantChunkData(bottomGrid), 
                                playerSpawn: bottom.playerSpawn,
                                type: "dungeon"
                            };
                        }
                    }
                    objects.push(door);
                }
            }
            if(chunk.ladder){
                for(let i = 0 ; i < chunk.ladder.length; i++){
                    let ladderSpawn = chunk.ladder[i];
                    let ladder = {loc: [chunk.loc[0] + ladderSpawn[0], chunk.loc[1] + ladderSpawn[1]], objType: "Ladder", dungeon: chunk, direction: ladderSpawn[2]};
                    objects.push(ladder);
                    groundLayer2[ladder.loc[1]][ladder.loc[0]] = ladderSpawn[3];
                }
            }
            if(chunk.pitfall){
                for(let i = 0 ; i < chunk.pitfall.length; i++){
                    let pitfallSpawn = chunk.pitfall[i];
                    let pitfall = {loc: [chunk.loc[0] + pitfallSpawn[0], chunk.loc[1] + pitfallSpawn[1]], objType: "Pitfall", floors: pitfallSpawn[2]};
                    objects.push(pitfall);
                    groundLayer2[pitfall.loc[1]][pitfall.loc[0]] = pitfallSpawn[3];
                }
            }
            if(chunk.sign){
                for(let i = 0 ; i < chunk.sign.length; i++){
                    let signSpawn = chunk.sign[i];
                    let sign = {loc: [chunk.loc[0] + signSpawn[0], chunk.loc[1] + signSpawn[1]], objType: "Sign", dungeon: chunk, signType: signSpawn[2]};
                    objects.push(sign);
                    groundLayer2[sign.loc[1]][sign.loc[0]] = signSpawn[3];
                }
            }
        },
        generateWorldName: function(data){
            function rand(arr){
                return arr[~~(Math.random() * arr.length)];
            }
            //Names consist of 2 parts.
            let p1 = [];
            let p2 = [];
            let width = data.levelData.props.mapWidth;
            let height = data.levelData.props.mapHeight;
            let mapSize = width * height;
            let themeNum = data.levelData.props.themeNum;
            switch(true){
                case mapSize < 500:
                    p1.push(
                        "Small",
                        "Little",
                        "Tiny"
                    );
                    break
                case mapSize < 1500:
                    p1.push(
                        "Medium",
                        "Cool"
                    );
                    break;
            }
            switch(true){
                case data.level === 1:
                    p1.push(
                        "First",
                        "New"
                    );
                    break;
                case data.level < 3:
                    p1.push(
                        "Intermediate"
                    );
                    break;
                case data.level < 6:
                    
                    break;
                case data.level < 10:
                    
                    break;
                case data.level === 10:
                    
                    break;
            }
            switch(true){
                case themeNum === 0:
                    p2.push(
                        "Forest",
                        "Meadow",
                        "Valley",
                        "Lake"
                    );
                    break
            }
            return rand(p1) + " " + rand(p2);
        },
        generateFestivals: function(world){
            let festivals = [];
            let shops = world.info.shops;
            for(let i = 0; i < shops.length; i++){
                let festivalGottenFromThisShop = false;
                for(let j = 0; j < shops[i][1].length; j++){
                    if(!festivalGottenFromThisShop){
                        let item = Q.getObjectData(shops[i][1][j]);
                        if(item.type === "seed"){
                            let prodItem = Q.getObjectData(item.produces);
                            festivals.push({name:prodItem.name + " Festival", crop: item.produces, day:7});
                            festivalGottenFromThisShop = true;
                        } else if(item.type === "tool"){
                            festivals.push({name:item.name + " Festival", tool: shops[i][1][j], day:15});
                            festivalGottenFromThisShop = true;
                        }
                    }
                }
            }
            return festivals;
        },
        
        generateObjectsGrid: function(objectsArray, mapW, mapH){
            let grid = Q.createArray(0, mapW, mapH);
            for(let i = 0; i < objectsArray.length; i++){
                let obj = objectsArray[i];
                for(let j = 0; j < obj.h; j++){
                    for(let k = 0; k < obj.w; k++){
                        grid[obj.loc[1] + j][obj.loc[0] + k] = obj;
                    }
                }
            }
            return grid;
        },
        getRelevantChunkData: function(chunks){
            let rel = [];
            for(let i = 0; i < chunks.length; i++){
                let c = chunks[i];
                let chunkData = {
                    w: c.w,
                    h: c.h,
                    loc: c.loc,
                    type: c.type,
                    idx: c.idxChosen
                };
                //We need to keep track of the water and bridge tiles if we're spawning fish.
                if(c.spawnFish){
                    chunkData.waterTiles = Q.MapGen.getLocsOfCertainTile(c.tiles, "water");
                    let bridgeTiles = Q.MapGen.getLocsOfCertainTile(c.tiles, "bridge");
                    let aroundBridgeWaterTiles = [];
                    for(let i = 0; i < bridgeTiles.length; i++){
                        let tilesAround = Q.getTilesAround(bridgeTiles[i], c.tiles, 1);
                        for(let j = 0; j < tilesAround.length; j++){
                            if(Q.getTile(tilesAround[j][2]).type === "water"){
                                aroundBridgeWaterTiles.push(tilesAround[j]);
                            }
                        }
                    }
                    chunkData.aroundBridgeWaterTiles = aroundBridgeWaterTiles;
                }
                rel.push(chunkData);
            }
            return rel;
        },
        createWorld: function(level) {
            let levelData = Q.MapGen.getLevelData(level);
            let mapWidth = levelData.props.mapWidth,
                mapHeight = levelData.props.mapHeight,
                ground1 = Q.createArray(0, mapWidth, mapHeight),
                ground2 = Q.createArray(0, mapWidth, mapHeight),
                objects = [];
            Q.MapGen.currentlyCreating = {
                timesVisited: 0, 
                rank: levelData.props.level, 
                helpers:[], 
                level: 1,
                currentDay: 1,
                music:{
                    town: "town-01",
                    farm: "inside-farm",
                    mapDay: "map-theme-01",
                    mapNight: "map-theme-02",
                    dungeon: "inside-dungeon"
                },
                info:{
                    lake: [],
                    dungeon: [],
                    shops:[],
                    ores:[]
                },
                levelData: levelData
            };
            Q.MapGen.setBorder(ground1, levelData.props.theme.borderTile, mapWidth, mapHeight);

            let chunkGrid = Q.MapGen.insertChunks(ground1, ground2, objects, levelData.chunks, mapWidth, mapHeight, levelData.props.theme, true);
            //If we've run into problems, restart the process.
            if(!chunkGrid) return Q.MapGen.createWorld(level);
            Q.MapGen.currentlyCreating.map = {
                ground1: ground1,
                ground2: ground2,
                objects: objects,
                specialTiles: [],
                objectsGrid: Q.MapGen.generateObjectsGrid(objects, mapWidth, mapHeight)
            };
            Q.MapGen.currentlyCreating.chunks = Q.MapGen.getRelevantChunkData(chunkGrid);
            
            Q.MapGen.currentlyCreating.playerSpawn = [chunkGrid[0].playerSpawn[0] + chunkGrid[0].loc[0], chunkGrid[0].playerSpawn[1] + chunkGrid[0].loc[1]];
            Q.MapGen.currentlyCreating.name = Q.MapGen.generateWorldName(Q.MapGen.currentlyCreating);
            Q.MapGen.currentlyCreating.festivals = Q.MapGen.generateFestivals(Q.MapGen.currentlyCreating);
            return Q.MapGen.currentlyCreating;
        },
        getLevelData: function(level){
            let data = GDATA.dataFiles["map-gen.json"];
            //Loop through each of the chunks and figure out which chunk to use.
            let levelData = {
                props: data.levels[level].props,
                chunks: []
            };
            levelData.props.theme = data.themes[levelData.props.themeNum];
            if(levelData.props.theme.roadForage) levelData.props.theme.roadForage.forageGrid = data.forageGrid[levelData.props.theme.roadForage.grid];
            let chunks = data.levels[level].chunks;
            for(let i = 0; i < chunks.length; i ++){
                let chunkData = chunks[i];
                //If we've set a loc, only spawn one chunk there. Otherwise, if chunkData is not set, set to 1, otherwise use provided value.
                let num = chunkData.loc ? 1 : chunkData.num || 1;
                let idxs = chunkData.idx;
                for(let j = 0; j < num; j++){
                    let idx = ~~(Math.random() * idxs.length);
                    let newChunk = Object.assign({}, data.chunks[chunkData.type][idxs[idx]]);
                    newChunk = Object.assign(newChunk, chunkData);
                    newChunk.idxChosen = idx;
                    levelData.chunks.push(newChunk);
                }
            }
            return levelData;
        }
    });
    
};


