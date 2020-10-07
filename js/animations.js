Quintus.Animations=function(Q){
Q.setUpAnimations=function(){
    Q.sheet("tiles",
        "tiles/tiles.png",
        {
           tilew:32,
           tileh:32,
           sx:2,
           sy:2,
           w:686,
           h:820,
           spacingX:2, 
           spacingY:2
    });
    Q.sheet("objects",
        "tiles/objects.png",
        {
           tilew:32,
           tileh:32,
           sx:0,
           sy:0,
           w:320,
           h:320,
           spacingX:0, 
           spacingY:0
    });
    Q.compileSheets("sprites/characters.png", "characters.json");
    Q.compileSheets("ui/ui-objects.png", "ui-objects.json");
    
    Q.compileSheets("tiles/objects-2.png", "sprites.json");
    let standRate = 1/3;
    let walkRate = 1/6;
    Q.animations("Character", {
        standingdown:{ frames: [0,1], rate:standRate},
        walkingdown:{ frames: [0,1], rate:walkRate},
        standingleft:{ frames: [2,3], rate:standRate},
        walkingleft:{ frames: [2,3], rate:walkRate},
        standingup:{ frames: [4,5], rate:standRate},
        walkingup:{ frames: [4,5], rate:walkRate},
        standingright:{ frames: [6,7], rate:standRate},
        walkingright:{ frames: [6,7], rate:walkRate}
    });

    
};
};
