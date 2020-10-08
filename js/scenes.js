Quintus.Stages = function(Q){
    
    Q.Sprite.extend("Cursor", {
        init: function(p){
            this._super(p,{
                sheet:"cursor", 
                frame:0
            });
        },
        attachItem: function(item){
            this.p.itemSprite = this.stage.insert(new Q.Sprite({x: -16, y: 16, w:32, h:32, sheet: "objects", frame:item.tile, item: item}), this);
        },
        removeItem: function(){
            this.p.itemSprite.destroy();
            this.p.itemSprite = false;
        }
    });
    Q.UI.Container.extend("MenuButtonContainer",{
        init: function(p){
            this._super(p, {
                fill: Q.OptionsController.options.menuColor, 
                cx: 0, 
                cy:0,
                menuButtons: []
            });
        },
        interact: function(button){
            button.trigger("interactWith", button.p.toContainer);
        },
        dehoverAll: function(){
            for(let i = 0; i < this.p.menuButtons.length; i++){
                for(let j = 0; j < this.p.menuButtons[i].length; j++){
                    this.p.menuButtons[i][j].dehover();
                }
            }
        },
        removeContent:function(){
            let stage = this.stage;
            this.children.forEach(function(child){stage.remove(child);});
            this.p.menuButtons = [];
        },
        fillEmptyMenuButtons: function(fillTo){
            if(!fillTo){
                fillTo = 0;
                for(let i = 0; i < this.p.menuButtons.length; i++){
                    fillTo = Math.max(this.p.menuButtons[i].length, fillTo);
                }
            }
            for(let i = this.p.menuButtons.length - 1; i >= 0; i--){
                if(!this.p.menuButtons[i].length){ 
                    this.p.menuButtons.splice(i, 1);
                    continue;
                };
                if(this.p.menuButtons[i].length < fillTo){
                    let diff = fillTo - this.p.menuButtons[i].length;
                    for(let j = 0; j < diff; j++){
                        this.p.menuButtons[i].push(this.p.menuButtons[i][fillTo - diff - 1]);
                    }
                }
            }
        }
    });
    Q.UI.Container.extend("MenuButton", {
        init: function(p){
            this._super(p, {
                w: 140,
                h: 35,
                x:5,
                cx:0, cy:0,
                fill: "white",
                selectedColour: "teal",
                defaultColour: "white"
            });
            if(p.label){
                this.on("inserted", this, "addText");
            }
            this.p.defaultRadius = this.p.radius;
        },
        dehover:function(){
            this.p.fill = this.p.defaultColour;
            this.trigger("dehover");
            this.p.radius = this.p.defaultRadius;
        },
        setFill: function(color){
            this.p.fill = color || this.p.selectedColour;
        },
        hover:function(){
            for(let i = 0; i < this.container.p.menuButtons.length; i++){
                for(let j = 0; j < this.container.p.menuButtons[i].length; j++){
                    this.container.p.menuButtons[i][j].dehover();
                }
            }
            this.setFill();
            
            this.stage.insert(this.p.cursor, this.container);
            this.p.cursor.p.x = this.p.x + this.p.w - 5;
            this.p.cursor.p.y = this.p.y + 5;
            this.p.cursor.refreshMatrix();
            this.p.radius = this.p.defaultRadius / 2;
            this.trigger("hover");
        },
        addText:function(){
            let size = this.p.size || 14;
            this.insert(new Q.UI.Text({label: this.p.label, x: this.p.w / 2, y: this.p.h / 2 - size + 2, size: size || 14}));
        }
    });
    Q.UI.Text.extend("ScrollingText",{
        init: function(p){
            this._super(p, {
                x:10, y: 5,
                align: "left",
                cx:0, cy:0
            });
            this.on("inserted");
        },
        inserted: function(){
            this.calcSize();
            this.on("interact", this, "doneScrolling");
        },
        doneScrolling: function(){
            this.trigger("doneScrolling");
        }
    });
    Q.scene("hire", function(stage){
        let interactWith = stage.options.interactWith;
        let hireObject = interactWith.props.loadHire[stage.options.props[0]][0];
        let hiredAll = interactWith.props.loadHire[stage.options.props[0]][1];
        let generatedHire = hireObject[0].generated || false;
        let toHire = [];
        if(!generatedHire){
            for(let i = 0; i < hireObject.length; i++){
                toHire.push(new Q.Character(hireObject[i]));
            }
            hireObject = toHire;
        } else {
            toHire = hireObject;
        }
        interactWith.props.loadHire[stage.options.props[0]][0] = hireObject;
        
        let cursor = new Q.Cursor();
        
        let menuCont = stage.insert(new Q.UI.Container({x: Q.width / 2 - 350, y:Q.height / 2 - 300, w: 700, h: 400, cx:0, cy:0, fill: Q.OptionsController.options.menuColor, opacity:0.8, border:1}));
        
        let hireCharCont  = menuCont.insert(new Q.MenuButtonContainer({x: 5, y:5, w: 535, h: 280, noDehover: true, menuButtons:[[]], saveIdx: true}));
        hireCharCont.on("goBack", function(){
            Q.MenuController.returnToGame();
            Q.AudioController.playSound("close-menu.mp3");
        });
        
        let menuOptionsCont = menuCont.insert(new Q.MenuButtonContainer({x: 545, y:5, w: 150, h: 390}));
        let hireCharButton = menuOptionsCont.insert(new Q.MenuButton({label:"Hire", y: 5, cursor: cursor}));
        hireCharButton.on("interactWith", function(){
            Q.inputs["interact"] = false;
            let charCost = menuOptionsCont.p.currentButton.p.char.value;
            if(Q.SaveFile.money < charCost){
                Q.AudioController.playSound("invalid-action.mp3");
            } else {
                Q.SaveFile.money -= charCost;
                Q.stage(1).trigger("moneyValueChanged");
                Q.CharacterController.addCharToRoster(menuOptionsCont.p.currentButton.p.char);
                toHire.splice(menuOptionsCont.p.currentButton.p.idx, 1);
                if(!toHire.length){
                    for(let i = 0; i < hiredAll.length; i++){
                        Q.MenuController.dialogueInteractFunction(hiredAll[i], interactWith);
                    }
                    return Q.MenuController.returnToGame();
                }
                hireCharCont.removeContent();
                
                hireCharCont.p.menuButtons = [[]];
                showItems();
                
                this.dehover();
                Q.MenuController.currentItem = [0, 0];
                Q.MenuController.currentCont = hireCharCont;
                Q.MenuController.adjustMenuPosition(Q.MenuController.currentItem);
                
                //Q.AudioController.playSound("purchase-item.mp3");
            }
            
        });
        
        function showItems(){
            let xIdx = 0;
            let yIdx = 0;
            for(let i = 0; i < toHire.length; i++){
                let hire = toHire[i];
                let button = hireCharCont.insert(new Q.MenuButton({x: 5 + xIdx * 85, y: 5 + yIdx * 85, w: 80, h: 80, radius: 40, idx: i, cursor: cursor, char: hire}));
                hireCharCont.p.menuButtons[yIdx][xIdx] = button;
                //button.p.itemSprite = hireCharCont.insert(new Q.Sprite({"sheet": "objects", frame:item.tile, x: 5 + xIdx * 85 + 25, y: 5 + 20 + yIdx * 85, w: 40, h: 40, cx:0, cy:0}));
                button.on("interactWith", function(){
                    menuOptionsCont.p.currentButton = this;
                    Q.MenuController.changeContainer(menuOptionsCont);
                    this.setFill("teal");
                });
                button.on("hover", function(){
                    name.p.label = hire.name;
                    /*quality.p.label = ""+~~item.quality;
                    type.p.label = item.type;
                    value.p.label = "" + (item.value * 2);
                    */
                });
                xIdx ++;
                if(xIdx > 5){
                    yIdx ++;
                    xIdx = 0;
                    hireCharCont.p.menuButtons.push([]);
                }
            }
        }
        let backButton = menuOptionsCont.insert(new Q.MenuButton({label:"Back", y: 45, cursor: cursor, toContainer: hireCharCont}));
        backButton.on("interactWith", Q.MenuController.changeContainer);
        menuOptionsCont.on("goBack", function(){
            Q.MenuController.changeContainer(hireCharCont);
        });
        
        menuOptionsCont.p.menuButtons = [
            [hireCharButton],
            [backButton]
        ];
        
        let itemInfo = menuCont.insert(new Q.UI.Container({x: 5, y: menuCont.p.h - 110, w: 535, h: 105, cx: 0, cy:0, fill:"white"}));
        let name = itemInfo.insert(new Q.UI.Text({x: 150, y: 35, label:(toHire[0].name || ""), align:"center"}));
/*
        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 5, label:"Type: ", align:"left"}));
        let type = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 5, label:""+(items[0].type || ""), align:"right"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 35, label:"Quality: ", align:"left"}));
        let quality = itemInfo.insert(new Q.UI.Text({x:itemInfo.p.w - 10, y: 35, label:""+(~~items[0].quality || ""), align:"right"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 65, label:"Cost: ", align:"left"}));
        let value = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 65, label:""+(items[0].value * 2), align:"right"}));
        */
        showItems();
        
        Q.MenuController.currentItem = [0, 0];
        Q.MenuController.currentCont = hireCharCont;
        stage.on("step", Q.MenuController, "acceptInputs");
        Q.MenuController.adjustMenuPosition(Q.MenuController.currentItem);
        
    });
    Q.scene("sell", function(stage){
        function sortItems(items, allowSell){
            function sortedItems(items, by){
                let sorted = [];
                for(let i = 0; i < items.length; i++){
                    if(items[i].type === by) sorted.push(items[i]);
                }
                return sorted;
            }
            if(allowSell.length){
                for(let i = 0; i < allowSell[i]; i++){
                    items = sortedItems(items, allowSell[i]);
                }
            }
            return items;
        }
        let items = sortItems(Q.Inventory.bag.items, stage.options.allowSell);
        let cursor = new Q.Cursor();
        
        let menuCont = stage.insert(new Q.UI.Container({x: Q.width / 2 - 350, y:Q.height / 2 - 300, w: 700, h: 400, cx:0, cy:0, fill: Q.OptionsController.options.menuColor, opacity:0.8, border:1}));
        let sellItemsCont  = menuCont.insert(new Q.MenuButtonContainer({x: 5, y:5, w: 535, h: 280, noDehover: true, menuButtons:[[]], saveIdx: true}));
        sellItemsCont.on("goBack", function(){
            Q.MenuController.returnToGame();
            Q.AudioController.playSound("close-menu.mp3");
        });
        
        let itemInfo = menuCont.insert(new Q.UI.Container({x: 5, y: menuCont.p.h - 110, w: 535, h: 105, cx: 0, cy:0, fill:"white"}));
        let name = itemInfo.insert(new Q.UI.Text({x: 150, y: 35, label:(items[0].name || ""), align:"center"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 5, label:"Type: ", align:"left"}));
        let type = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 5, label:""+(items[0].type || ""), align:"right"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 35, label:"Quality: ", align:"left"}));
        let quality = itemInfo.insert(new Q.UI.Text({x:itemInfo.p.w - 10, y: 35, label:""+(~~items[0].quality || ""), align:"right"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 65, label:"Cost: ", align:"left"}));
        let value = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 65, label:""+Q.getSellPrice(items[0]), align:"right"}));
        
        
        
        function showItems(items){
            let xIdx = 0;
            let yIdx = 0;
            sellItemsCont.p.menuButtons = [[]];
            for(let i = 0; i < items.length; i++){
                let item = items[i];
                if(!item) continue;
                let itemValue = Q.getSellPrice(item);
                let button = sellItemsCont.insert(new Q.MenuButton({x: 5 + xIdx * 85, y: 5 + yIdx * 85, w: 80, h: 80, radius: 40, idx: i, cursor: cursor, item: item}));
                sellItemsCont.p.menuButtons[yIdx][xIdx] = button;
                button.p.itemSprite = sellItemsCont.insert(new Q.Sprite({"sheet": "objects", frame:item.tile, x: 5 + xIdx * 85 + 25, y: 5 + 20 + yIdx * 85, w: 40, h: 40, cx:0, cy:0}));
                button.p.quantityText =  sellItemsCont.insert(new Q.UI.Text({x: 5 + xIdx * 85 + 40, y: 5 + yIdx * 85, w: 40, h: 40, cx:0, cy:0, label:"x"+item.quantity, size: 10}));
                button.on("interactWith", function(){
                    menuOptionsCont.p.currentButton = this;
                    Q.MenuController.changeContainer(menuOptionsCont);
                    this.setFill("teal");
                });
                button.on("hover", function(){
                    name.p.label = item.name;
                    quality.p.label = ""+~~item.quality;
                    type.p.label = item.type;
                    value.p.label = "" + itemValue;
                });
                xIdx ++;
                if(xIdx > 5 && (xIdx * yIdx) !== items.length){
                    yIdx ++;
                    xIdx = 0;
                    sellItemsCont.p.menuButtons.push([]);
                }
            }
            if(!xIdx && !yIdx) return true;
        }
        
        let menuOptionsCont = menuCont.insert(new Q.MenuButtonContainer({x: 545, y:5, w: 150, h: 390}));
        let sellItemButton = menuOptionsCont.insert(new Q.MenuButton({label:"Sell", y: 5, cursor: cursor}));
        sellItemButton.on("interactWith", function(){
            let item = menuOptionsCont.p.currentButton.p.item;
            let itemValue = Q.getSellPrice(item);
            Q.SaveFile.money += itemValue;
            Q.stage(1).trigger("moneyValueChanged");
            item.quantity --;
            menuOptionsCont.p.currentButton.p.quantityText.p.label = "x"+item.quantity;
            Q.AudioController.playSound("purchase-item.mp3");
            if(item.quantity === 0){
                Q.Inventory.setHotkey(item.hotkey, false);
                Q.Inventory.removeFromBag(item);
                sellItemsCont.removeContent();
                let newItems = sortItems(Q.Inventory.bag.items, stage.options.allowSell);
                let noItems = showItems(newItems);
                if(noItems) return Q.MenuController.returnToGame();
                sellItemsCont.p.prevIdx = [0, 0];
                Q.MenuController.changeContainer(sellItemsCont, true);
                
            }
        });
        let backButton = menuOptionsCont.insert(new Q.MenuButton({label:"Back", y: 45, cursor: cursor, toContainer: sellItemsCont}));
        backButton.on("interactWith", Q.MenuController.changeContainer);
        menuOptionsCont.on("goBack", function(){
            Q.MenuController.changeContainer(sellItemsCont);
        });
        
        menuOptionsCont.p.menuButtons = [
            [sellItemButton],
            [backButton]
        ];
        let noItems = showItems(items);
        if(noItems) return Q.MenuController.returnToGame();
        
        
        Q.MenuController.currentItem = [0, 0];
        Q.MenuController.currentCont = sellItemsCont;
        stage.on("step", Q.MenuController, "acceptInputs");
        Q.MenuController.adjustMenuPosition(Q.MenuController.currentItem);
    });
    Q.scene("shop", function(stage){
        let items = stage.options.items;
        let cursor = new Q.Cursor();
        
        let menuCont = stage.insert(new Q.UI.Container({x: Q.width / 2 - 350, y:Q.height / 2 - 300, w: 700, h: 400, cx:0, cy:0, fill: Q.OptionsController.options.menuColor, opacity:0.8, border:1}));
        
        let buyItemsCont  = menuCont.insert(new Q.MenuButtonContainer({x: 5, y:5, w: 535, h: 280, noDehover: true, menuButtons:[[]], saveIdx: true}));
        buyItemsCont.on("goBack", function(){
            Q.MenuController.returnToGame();
            Q.AudioController.playSound("close-menu.mp3");
        });
        let menuOptionsCont = menuCont.insert(new Q.MenuButtonContainer({x: 545, y:5, w: 150, h: 390}));
        function showPurchaseHowMany(item){
            menuOptionsCont.removeContent();
            let purchaseHowManyText = menuOptionsCont.insert(new Q.UI.Text({x: 75, y: 5, label: "How Many"}));
            let curQuantity = menuOptionsCont.insert(new Q.UI.Text({x: 75, y: 45, label: "1"}));
            
            
            let confirm  = menuOptionsCont.insert(new Q.MenuButton({label:"Confirm", y: 125, cursor: cursor, item: item}));
            confirm.on("interactWith", function(){
                let item = this.p.item;
                let quantity = parseInt(curQuantity.p.label);
                let itemCost = Q.getBuyPrice(item) * quantity;
                item.quantity = quantity;
                
                Q.SaveFile.money -= itemCost;
                Q.stage(1).trigger("moneyValueChanged");
                Q.Inventory.addItemToBag(item);
                Q.AudioController.playSound("purchase-item.mp3");
                menuOptionsCont.trigger("goBack");
            });
            
            let quantityDown = menuOptionsCont.insert(new Q.MenuButton({label:"-", y: 85, w:67.5, x:5, cursor: cursor}));
            quantityDown.on("interactWith", function(){
                let curAmount = parseInt(curQuantity.p.label);
                if(curAmount > 1){
                    curQuantity.p.label = "" + (curAmount - 1);
                } else {
                    Q.AudioController.playSound("invalid-action.mp3");
                }
            });
            let quantityUp = menuOptionsCont.insert(new Q.MenuButton({label:"+", y: 85, w:67.5, x: 77.5, cursor: cursor}));
            quantityUp.on("interactWith", function(){
                let curAmount = parseInt(curQuantity.p.label);
                if((curAmount + 1) * Q.getBuyPrice(item) <= Q.SaveFile.money){
                    curQuantity.p.label = "" + (curAmount + 1);
                } else {
                    Q.AudioController.playSound("invalid-action.mp3");
                }
            });
            let backButton = menuOptionsCont.insert(new Q.MenuButton({label:"Back", y: 165, cursor: cursor}));
            backButton.on("interactWith", function(){
                menuOptionsCont.trigger("goBack");
            });
            menuOptionsCont.p.menuButtons = [
                [quantityDown, quantityUp], 
                [confirm, confirm], 
                [backButton, backButton]
            ];
            Q.MenuController.currentItem = [0, 0];
            Q.MenuController.currentCont = menuOptionsCont;
            Q.MenuController.adjustMenuPosition([1, 1]);
        }

        function showBuyItems(){
            menuOptionsCont.removeContent();
            let buyItemButton = menuOptionsCont.insert(new Q.MenuButton({label:"Purchase", y: 5, cursor: cursor}));
            buyItemButton.on("interactWith", function(){
                let item = Q.Inventory.getItemData([menuOptionsCont.p.currentButton.p.item])[0];
                if(Q.Inventory.bag.items.length !== Q.Inventory.bag.maxItems && Q.getBuyPrice(item) <= Q.SaveFile.money){
                    //Load purchase how many
                    showPurchaseHowMany(item);
                } else {
                    Q.AudioController.playSound("invalid-action.mp3");
                }
            });
            let backButton = menuOptionsCont.insert(new Q.MenuButton({label:"Back", y: 45, cursor: cursor, toContainer: buyItemsCont}));
            backButton.on("interactWith", Q.MenuController.changeContainer);
            menuOptionsCont.on("goBack", function(){
                menuOptionsCont.off("goBack");
                Q.MenuController.changeContainer(buyItemsCont);
                showBuyItems();
            });

            menuOptionsCont.p.menuButtons = [
                [buyItemButton],
                [backButton]
            ];
            
        }
        showBuyItems();
        
        let itemInfo = menuCont.insert(new Q.UI.Container({x: 5, y: menuCont.p.h - 110, w: 535, h: 105, cx: 0, cy:0, fill:"white"}));
        let name = itemInfo.insert(new Q.UI.Text({x: 150, y: 35, label:(items[0].name || ""), align:"center"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 5, label:"Type: ", align:"left"}));
        let type = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 5, label:""+(items[0].type || ""), align:"right"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 35, label:"Quality: ", align:"left"}));
        let quality = itemInfo.insert(new Q.UI.Text({x:itemInfo.p.w - 10, y: 35, label:""+(~~items[0].quality || ""), align:"right"}));

        itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 65, label:"Cost: ", align:"left"}));
        let value = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 65, label:""+Q.getBuyPrice(items[0]), align:"right"}));
        
        
        let xIdx = 0;
        let yIdx = 0;
        for(let i = 0; i < items.length; i++){
            let item = items[i];
            let button = buyItemsCont.insert(new Q.MenuButton({x: 5 + xIdx * 85, y: 5 + yIdx * 85, w: 80, h: 80, radius: 40, idx: i, cursor: cursor, item: item}));
            buyItemsCont.p.menuButtons[yIdx][xIdx] = button;
            button.p.itemSprite = buyItemsCont.insert(new Q.Sprite({"sheet": "objects", frame:item.tile, x: 5 + xIdx * 85 + 25, y: 5 + 20 + yIdx * 85, w: 40, h: 40, cx:0, cy:0}));
            button.on("interactWith", function(){
                menuOptionsCont.p.currentButton = this;
                Q.MenuController.changeContainer(menuOptionsCont);
                this.setFill("teal");
            });
            button.on("hover", function(){
                name.p.label = item.name;
                quality.p.label = ""+~~item.quality;
                type.p.label = item.type;
                value.p.label = "" + Q.getBuyPrice(items[0]);
            });
            xIdx ++;
            if(xIdx > 5){
                yIdx ++;
                xIdx = 0;
                buyItemsCont.p.menuButtons.push([]);
            }
        }
        
        Q.MenuController.currentItem = [0, 0];
        Q.MenuController.currentCont = buyItemsCont;
        Q.MenuController.adjustMenuPosition(Q.MenuController.currentItem);
        stage.on("step", Q.MenuController, "acceptInputs");
    });
    
    Q.scene("dialogue", function(stage){
        let dialogue = stage.options.dialogue;
        let idx = 0;
        
        let dialogueBox = stage.insert(new Q.UI.Container({x: Q.width / 2 - 350, y:Q.height - 210, w: 700, h: 200, cx:0, cy:0, fill: Q.OptionsController.options.menuColor, opacity:0.8, border:1}));
        let textArea = dialogueBox.insert(new Q.UI.Container({x:5, y:5, cx:0, cy:0, w:500, h:190, fill: Q.OptionsController.options.menuColor}));
        let optionsArea = dialogueBox.insert(new Q.MenuButtonContainer({x:510, y:5, cx:0, cy:0, w:185, h:190, fill: Q.OptionsController.options.menuColor}));
        optionsArea.displayOptions = function(options){
            let cursor = new Q.Cursor();
            optionsArea.p.menuButtons = [];
            for(let i = 0; i < options.length; i++){
                let button = optionsArea.insert(new Q.MenuButton({x: 5, y: 5 + 40 * i, w:175, label: options[i].text, func: options[i].func, props:options[i].props, cursor: cursor}));
                button.on("interactWith", function(){
                    optionsArea.removeContent();
                    //If there's no function, we're just cycling text.
                    if(!this.p.func){
                        processDialogue();
                    } else {
                        let newTextAvailable = Q.MenuController.menuButtonInteractFunction(this.p.func, this.p.props, stage.options);
                        if(newTextAvailable){
                            dialogue = newTextAvailable;
                            idx = 0;
                            processDialogue();
                        }
                    }
                });
                optionsArea.p.menuButtons.push([button]);
                
            }
        };
        function processDialogue(){
            stage.off("step", Q.MenuController, "acceptInteract");
            stage.off("step", Q.MenuController, "acceptInputs");
            let item = dialogue[idx];
            idx ++;
            if(!item) return Q.MenuController.returnToGame();
            if(typeof item === "string"){
                if(textArea.p.text) textArea.p.text.destroy();
                item = Q.TextProcessor.replaceText(item);
                textArea.p.text = textArea.insert(new Q.ScrollingText({label:item}));
                textArea.p.text.on("doneScrolling", processDialogue);
                Q.MenuController.currentCont = textArea.p.text;
                stage.on("step", Q.MenuController, "acceptInteract");
            } else if(item.options){
                Q.MenuController.currentCont = optionsArea;
                Q.MenuController.currentCont.displayOptions(item.options);
                Q.MenuController.currentItem = [0, 0];
                Q.MenuController.adjustMenuPosition(Q.MenuController.currentItem);
                stage.on("step", Q.MenuController, "acceptInputs");
            } else if(item.func){
                let newDialogue = Q.MenuController.dialogueInteractFunction(item, stage.options);
                if(newDialogue){
                    idx --;
                    dialogue.splice(idx, 1);
                    for(let i = newDialogue.length - 1; i >=0 ; i--){
                        dialogue.splice(idx, 0, newDialogue[i]);
                    }
                }
                if(dialogue[idx]){
                    processDialogue();
                } else {
                    Q.MenuController.returnToGame();
                }
            }
            if(dialogue[idx] && dialogue[idx].options) processDialogue();
        }
        processDialogue();
    });
    Q.scene("menu", function(stage){
        function getSpaceInFrontOfPlayer(){
            let player = Q.player;
            let arr = Q.getDirArray(player.p.dir);
            let loc = [player.p.loc[0] + arr[0], player.p.loc[1] + arr[1]];
            let groundLayer = Q.stage(0).lists.TileLayer[0];
            let objectsGrid = Q.stage(0).objectsGrid;
            let objectsTileLayer = Q.stage(0).lists.TileLayer[2];
            if(!objectsGrid[loc[1]] || !Q.notOnBorderOfMap(loc, objectsGrid) || objectsGrid[loc[1]][loc[0]] || objectsTileLayer.p.tiles[loc[1]][loc[0]]) return false;
            if(Q.getTileCost(groundLayer.p.tiles[loc[1]][loc[0]]) < 10) return true;
        }
        function createButtonList(items, mainCont, toCont){
            let list = [];
            for(let i = 0; i < items.length; i++){
                let cont = mainCont.insert(new Q.MenuButton({label:items[i], y: 5 + 40 * i, toContainer: toCont, cursor: cursor}));
                cont.on("interactWith", Q.MenuController.changeContainer);
                cont.on("hover", addContent);
                list.push([cont]);
            }
            mainCont.p.menuButtons = list;
        }
        let spaceInFrontOfPlayer = getSpaceInFrontOfPlayer();
        let cursor = new Q.Cursor();
        
        let menuCont = stage.insert(new Q.UI.Container({x: Q.width / 2 - 350, y:Q.height / 2 - 250, w: 785, h: 635, cx:0, cy:0, fill: Q.OptionsController.options.menuColor, opacity:0.8, border:1}));
        let menuOptionsCont = menuCont.insert(new Q.MenuButtonContainer({x: 5, y:5, w: 150, h: 390, noDehover: true, saveIdx: true}));
        menuOptionsCont.on("goBack", function(){
            Q.MenuController.returnToGame();
            Q.AudioController.playSound("close-menu.mp3");
        });
        Q.MenuController.currentItem = [0, 0];
        Q.MenuController.currentCont = menuOptionsCont;
        stage.on("step", Q.MenuController, "acceptInputs");
        function getItemUses(item){
            if(!item) return false;
            let uses = [["Move"]];
            if(spaceInFrontOfPlayer){
                uses.push(["Place"]);
            }
            if(item.edible){
                uses.push(["Eat"]);
            }
            if(item.type === "equipment"){
                if(item.equipped){
                    uses.push(["Remove"]);
                } else {
                    uses.push(["Equip"]);
                }
            }
            uses.push(["Combine All"]);
            uses.push(["Sort"]);
            return uses;
        }
        function showItemUses(uses, cont){
            let stage = Q.stage(0);
            cont.removeContent();
            if(!uses) return;
            cont.p.menuButtons = [];
            for(let i = 0; i < uses.length; i++){
                let button = cont.insert(new Q.MenuButton({x: 5, y: 5 + i * 27.5, cx:0, cy:0, w: 85, h: 25, size: 10,  label: uses[i][0], cursor: cursor}));
                button.on("interactWith", function(){
                    let item = cont.p.currentButton.p.bagItem;
                    let maxItems = Q.Inventory.maxBagItems;
                    let idx = cont.p.currentButton.p.charIdx * maxItems;
                    switch(this.p.label){
                        case "Move": 
                            cont.p.currentButton.p.itemSprite.destroy();
                            cont.p.currentButton.p.quantityText.destroy();
                            
                            cont.p.cursor.attachItem(item);
                            cont.p.currentButton.p.hotkeyText.p.label = "";
                            
                            Q.inputs["menu"] = true;
                            Q.inputs["interact"] = false;
                            break;
                        case "Place":
                            let player = Q.player;
                            let arr = Q.getDirArray(player.p.dir);
                            let loc = [player.p.loc[0] + arr[0], player.p.loc[1] + arr[1]];
                            let objectsGrid = stage.objectsGrid;
                            let objectsTileLayer = stage.lists.TileLayer[2];
                            let objects = stage.objects;
                            Q.Inventory.placeItemOnGround(loc, objects, objectsTileLayer, objectsGrid, item, item.quantity);
                            Q.Inventory.removeFromBag(item);
                            cont.p.currentButton.p.itemSprite.destroy();
                            cont.p.currentButton.p.quantityText.destroy();
                            spaceInFrontOfPlayer = getSpaceInFrontOfPlayer();
                            Q.inputs["menu"] = true;
                            Q.inputs["interact"] = false;
                            if(item.hotkey) Q.inputs["item-hk-"+item.hotkey] = true;
                           break;
                       case "Eat":
                            Q.CharacterController.eatItem(item, Q.CharacterController.party[0]);
                            item.quantity --;
                            if(!item.quantity){
                                Q.Inventory.removeFromBag(item);
                                cont.p.currentButton.p.itemSprite.destroy();
                                cont.p.currentButton.p.quantityText.destroy();
                                Q.inputs["menu"] = true;
                                Q.inputs["interact"] = false;
                                if(item.hotkey) Q.inputs["item-hk-"+item.hotkey] = true;
                            } else {
                                cont.p.currentButton.p.quantityText.p.label = "x"+item.quantity;
                            }
                            break;
                        case "Combine All":
                            Q.Inventory.bag.items = Q.Inventory.bag.items.concat(Q.Inventory.combineAllItems(Q.Inventory.bag.items.splice(idx, maxItems)), Q.Inventory.bag.items.splice(idx, Q.Inventory.bag.items.length - idx));
                            Q.Inventory.changeBagItemsAmount(Q.Inventory.getBagItemsAmount(Q.Inventory.bag.items), true);
                            Q.Inventory.resetAllHotkeys();
                            addContent("Items");
                            Q.inputs["menu"] = true;
                            Q.inputs["interact"] = false;
                            break;
                        case "Sort":
                            Q.Inventory.bag.items = Q.Inventory.bag.items.concat(Q.Inventory.sortItems(Q.Inventory.bag.items.splice(idx, maxItems)), Q.Inventory.bag.items.splice(idx, Q.Inventory.bag.items.length - idx));
                            addContent("Items");
                            Q.inputs["menu"] = true;
                            Q.inputs["interact"] = false;
                            break;
                         //TODO equipment
                        case "Remove":

                            break;
                        case "Equip":

                            break;
                    }
                });
                cont.p.menuButtons.push([button]);
            }
        }
        
        let contentCont = menuCont.insert(new Q.MenuButtonContainer({x: 160, y: 5, prevCont: menuOptionsCont, additionalContainers: []}));
        contentCont.on("goBack", function(){
            this.p.additionalContainers.forEach(function(cont){
                cont.removeContent();
                cont.destroy();
            });
            this.p.saveIdx = false;
            
        });
        contentCont.on("goBack", Q.MenuController.changeContainer);
        
        function addContent(category){
            category = category || this.p.label;
            contentCont.removeContent();
            contentCont.p.additionalContainers = [];
            switch(category){
                case "Items":
                    contentCont.p.saveIdx = true;
                    contentCont.p.w = 620;
                    contentCont.p.h = 625;
                    let controlsCont = menuCont.insert(new Q.MenuButtonContainer({x: 685, y: 5, w: 95, h: 280, cx: 0, cy:0, prevCont: contentCont, cursor: cursor}));
                    controlsCont.on("goBack", Q.MenuController.changeContainer);
                    contentCont.p.additionalContainers.push(controlsCont);
                    let bagItems = Q.Inventory.bag.items;
                    //Create the item info cont
                    let itemInfo = contentCont.insert(new Q.UI.Container({x: 5, y: contentCont.p.h - 110, w: 525, h: 105, cx: 0, cy:0, fill:"white"}));
                    let name = itemInfo.insert(new Q.UI.Text({x: 150, y: 35, label:(bagItems[0].name || ""), align:"center"}));
                    
                    itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 5, label:"Type: ", align:"left"}));
                    let type = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 5, label:""+(bagItems[0].type || ""), align:"right"}));
                    
                    itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 35, label:"Quality: ", align:"left"}));
                    let quality = itemInfo.insert(new Q.UI.Text({x:itemInfo.p.w - 10, y: 35, label:""+(~~bagItems[0].quality || ""), align:"right"}));
                    
                    itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 200, y: 65, label:"Value: ", align:"left"}));
                    let value = itemInfo.insert(new Q.UI.Text({x: itemInfo.p.w - 10, y: 65, label:""+(bagItems[0] ? Q.getSellPrice(bagItems[0]) : ""), align:"right"}));
                    contentCont.p.menuButtons = [[]];
                    
                    let maxBagItems = Q.Inventory.maxBagItems;
                    let xIdx = 0;
                    let yIdx = 0;
                    let charIdx = 0;
                    
                    for(let i = 0; i < maxBagItems * Q.CharacterController.party.length; i++){
                        if(i >= maxBagItems * (charIdx + 1)){
                            charIdx ++;
                        }
                        let item = bagItems[i] || false;
                        //Show an item icon.
                        if(i - (charIdx * maxBagItems) < Q.CharacterController.party[charIdx].bag.maxItems){
                            let button = contentCont.insert(new Q.MenuButton({x: 5 + xIdx * 85, y: 5 + yIdx * 85, w: 80, h: 80, radius: 40, idx: i, cursor: cursor, item: item, charIdx: charIdx}));
                            let hotkeyText = contentCont.insert(new Q.UI.Text({x: 5 + xIdx * 85 + 40, y: 5 + 55 + yIdx * 85, w: 40, h: 40, cx:0, cy:0, label: ""+(item.hotkey || ""), size: 14}));
                            button.p.hotkeyText = hotkeyText;
                            contentCont.p.menuButtons[yIdx][xIdx] = button;
                            function changeHotkey(num, button){
                                let item = Q.Inventory.setHotkey(num, button.p.idx);
                                for(let i = 0 ; i < button.container.p.menuButtons.length; i++){
                                    for(let j = 0; j < button.container.p.menuButtons[i].length; j++){
                                        if(button.container.p.menuButtons[i][j].p.hotkeyText.p.label === ""+num) button.container.p.menuButtons[i][j].p.hotkeyText.p.label = "";
                                    }
                                }
                                if(item) {
                                    button.p.hotkeyText.p.label = ""+num;
                                    Q.AudioController.playSound("hotkey-item.mp3");
                                }
                            }
                            button.on("hover", function(){
                                this.on("step", function(){
                                    if(Q.inputs["item-hk-1"]){
                                        changeHotkey(1, this);
                                    } else if(Q.inputs["item-hk-2"]){
                                        changeHotkey(2, this);
                                    } else if(Q.inputs["item-hk-3"]){
                                        changeHotkey(3, this);
                                    }
                                });
                                let bagItem = bagItems[this.p.idx];
                                showItemUses(getItemUses(bagItem), controlsCont);
                                if(!bagItem) bagItem = {name:"", quality: "", type: "", value: ""};
                                name.p.label = bagItem.name;
                                quality.p.label = ""+~~bagItem.quality;
                                type.p.label = bagItem.type;
                                value.p.label = "" + Q.getSellPrice(bagItem);
                            });
                            button.on("interactWith", function(){
                                if(!cursor.p.itemSprite){
                                    if(controlsCont.p.menuButtons.length){
                                        controlsCont.p.currentButton = this;
                                        Q.MenuController.changeContainer(controlsCont);
                                        this.setFill("teal");
                                    }
                                } 
                                //If we're moving an item
                                else {
                                    //Place the item in that spot. Switch items if there is an item there already.
                                    Q.Inventory.switchItemsInBag(cursor.p.itemSprite.p.item, this.p.idx);
                                    cursor.removeItem();
                                    addContent(category);
                                    Q.MenuController.adjustMenuPosition([0, 0]);
                                }
                            });
                            button.on("dehover", function(){
                                this.off("step");
                            });
                            if(item){
                                button.p.quantityText =  contentCont.insert(new Q.UI.Text({x: 5 + xIdx * 85 + 40, y: 5 + yIdx * 85, w: 40, h: 40, cx:0, cy:0, label:"x"+item.quantity, size: 10}));
                                button.p.bagItem = item;
                                button.p.itemSprite = contentCont.insert(new Q.Sprite({"sheet": "objects", frame:item.tile, x: 5 + xIdx * 85 + 25, y: 5 + 20 + yIdx * 85, w: 40, h: 40, cx:0, cy:0}));
                            }
                        } 
                        //Show a item icon with x through it
                        else {
                            let button = contentCont.insert(new Q.MenuButton({x: 5 + xIdx * 85, y: 5 + yIdx * 85, w: 80, h: 80, radius: 40, idx: i, fill:"#111"}));
                        }
                        xIdx ++;
                        if(xIdx > 5 && i !== maxBagItems * Q.CharacterController.party.length - 1){
                            yIdx ++;
                            xIdx = 0;
                            contentCont.p.menuButtons.push([]);
                        }
                    }
                    contentCont.fillEmptyMenuButtons(maxBagItems / 2);
                    break;
                case "Party":
                    contentCont.p.w = 150;
                    contentCont.p.h = 280;
                    let party = Q.CharacterController.party;
                    let actionsList = contentCont.insert(new Q.MenuButtonContainer({x: 160, y: 5, w: 150, h: 105, cx: 0, cy:0, prevCont: contentCont, cursor: cursor}));
                    contentCont.p.additionalContainers.push(actionsList);
                    contentCont.p.menuButtons = [];
                    let partyActions = ["Eat", "Equip"];
                    for(let i = 0; i < party.length; i++){
                        let memberCont = contentCont.insert(new Q.MenuButton({label:party[i].name, y: 5 + 40 * i, toContainer: actionsList, cursor: cursor}));
                        contentCont.p.menuButtons.push([memberCont]);
                    }
                    break;
                case "Map":
                
                    break;
                case "Options":
                    
                    break;
            }
        }
        createButtonList(["Items", "Party", "Map", "Options"], menuOptionsCont, contentCont);
        Q.MenuController.adjustMenuPosition(Q.MenuController.currentItem);
    });
    Q.scene("hud", function(stage){
        let toolEquipContainer = stage.insert(new Q.UI.Container({x: Q.width - 200 - 10 - 330, y:10, cx:0, cy:0}));
        let toolEquipIcons = {
            
        };
        function setUpHotkeyCont(num){
            let hkCont = toolEquipContainer.insert(new Q.Sprite({sheet: "hotkey-"+num, w:64, h:64, cx:0, cy:0, x: num * 80}));
            let tile = 0;
            if(Q.Inventory.hotkeys[num] !==  false){
                tile = Q.Inventory.hotkeys[num].tile;
            }
            toolEquipIcons[num] = toolEquipContainer.insert(new Q.Sprite({"sheet": "objects", frame:tile, x: hkCont.p.w / 2 + num * 80 - 4, y: hkCont.p.h / 2 - 4}));
        };
        setUpHotkeyCont(1);
        setUpHotkeyCont(2);
        setUpHotkeyCont(3);
        
        stage.on("hotkeyItemChanged", function(props){
            let tile = 0;
            if(Q.Inventory.hotkeys[props.key]){
                tile = Q.Inventory.hotkeys[props.key].tile;
            }
            if(props.remove){
                toolEquipIcons[props.remove].p.frame = 0;
            }
            toolEquipIcons[props.key].p.frame = tile;
        });
        
        let hudContainer = stage.insert(new Q.UI.Container({x: Q.width - 200 - 10, y:10, w: 200, h: 180, cx:0, cy:0, fill: Q.OptionsController.options.menuColor, opacity:0.5, border:1}));
        
        //Temporarily just show stats as numbers
        hudContainer.insert(new Q.UI.Text({label:"Energy ", align: "left", x:10, y: 10}));
        let energyValue = hudContainer.insert(new Q.UI.Text({label:Q.CharacterController.party[0].stats.energy.toString(), align: "right", x:hudContainer.p.w - 10, y: 10}));
        
        hudContainer.insert(new Q.UI.Text({label:"Health ", align: "left", x:10, y: 50}));
        let healthValue = hudContainer.insert(new Q.UI.Text({label:Q.CharacterController.party[0].stats.health.toString(), align: "right", x:hudContainer.p.w - 10,  y: 50}));
        
        hudContainer.insert(new Q.UI.Text({label:"Bag ", align: "left", x:10, y: 90}));
        let bagValue = hudContainer.insert(new Q.UI.Text({label:Q.Inventory.bag.numItems + " / " + Q.Inventory.bag.maxItems, align: "right", x:hudContainer.p.w - 10,  y: 90}));
        
        hudContainer.insert(new Q.UI.Text({label:"Money ", align: "left", x:10, y: 130}));
        let moneyValue = hudContainer.insert(new Q.UI.Text({label:Q.SaveFile.money.toString(), align: "right", x:hudContainer.p.w - 10,  y: 130}));
        
        stage.on("energyChanged", function(){
            energyValue.p.label = Q.CharacterController.party[0].stats.energy.toString();
        });
        stage.on("healthChanged", function(){
            healthValue.p.label = Q.CharacterController.party[0].stats.health.toString();
        });
        stage.on("bagItemsChanged", function(){
            bagValue.p.label = Q.Inventory.bag.numItems + " / " + Q.Inventory.bag.maxItems; 
        });
        stage.on("moneyValueChanged", function(){
            moneyValue.p.label = Q.SaveFile.money.toString();
        });
        
        let weatherContainer = stage.insert(new Q.UI.Container({x: Q.width - 10 - 97, y:200, cx:0, cy:0}));
        weatherContainer.insert(new Q.Sprite({sheet: "weather-bg", w:64, h:64, cx:0, cy:0, x: 0}));
        weatherContainer.insert(new Q.Sprite({sheet: "weather-icons", frame: 0, w:64, h:64, cx:0, cy:0, x: 17, y: 5}));
        
        let time = weatherContainer.insert(new Q.UI.Text({x: 48, y: 64, align: "center", label: "6:00", time: [6, 0]}));
        time.changeTime = function(to){
            if(to[1] < 10) to[1] = "0"+to[1];
            this.p.label = to[0] + ":" + to[1];
        };
        Q.TimeController.on("timeChanged", time, "changeTime");
        
        
    });
    function animateTiles(chunk, animatedTiles, tileLayer, stage, tileType, animations, animationTime){
        let numFrames = animations.length;
        for(let i = 0; i < chunk.h; i++){
            for(let j = 0; j < chunk.w; j++){
                if(Array.isArray(tileType)){
                    if(tileType.includes(tileLayer.p.tiles[chunk.loc[1] + i][chunk.loc[0] + j])){
                        animatedTiles.push([chunk.loc[0] + j, chunk.loc[1] + i]);
                    }
                } else {
                    if(Q.getTile(tileLayer.p.tiles[chunk.loc[1] + i][chunk.loc[0] + j]).type === tileType){
                        animatedTiles.push([chunk.loc[0] + j, chunk.loc[1] + i]);
                    }
                }
            }
        }
        
        let curAnim = 0;
        let curFrame = 0;
        stage.on("step", function(){
            curAnim++;
            if(curAnim >= animationTime){
                curFrame++;
                if(curFrame >= numFrames) curFrame = 0;
                animatedTiles.forEach(function(tile){
                    let frame = curFrame + (tile[0] % numFrames);
                    if(frame >= numFrames) frame =  Math.abs(frame - numFrames);
                    tileLayer.setTile(tile[0], tile[1],  animations[frame]);
                });
                curAnim = 0;
            }
        });
    }
        
    Q.scene("map", function(stage){
        let data = Q.DataController.changeMap(stage.options.data);
        stage.playerInside = data.type ? true : false;
        stage.ground1 = data.map.ground1;
        stage.ground2 = data.map.ground2;
        stage.specialTiles = data.map.specialTiles;
        stage.objects = data.map.objects;
        stage.objectsGrid = data.map.objectsGrid;
        let tileLayer = new Q.TileLayer({
            tiles: data.map.ground1,
            sheet: "tiles",
            z: 0
        });
        stage.insert(tileLayer);
        let tileLayer2 = new Q.TileLayer({
            tiles: data.map.ground2,
            sheet: "tiles",
            z: 1
        });
        stage.insert(tileLayer2);
        let playerSpawn = [data.playerSpawn[0], data.playerSpawn[1]];
        let player = Q.player = stage.insert(new Q.Player({loc: playerSpawn , dir:data.playerDir || "down"}));
        
        //If we're on the main map
        if(!stage.playerInside){
            stage.animatedTiles = {
                water: [],
                fish: []
            };
            
            //TEMP: the arrays of frames should be passed in for animated tiles. These arrays should be gotten from somewhere.
            let river = data.chunks.find(function(chunk){return chunk.type === "river";});
            if(river){
                //Animate the water
                animateTiles(river, stage.animatedTiles.water, tileLayer, stage, [88, 47, 48, 49, 50, 51, 52], [88, 47, 48, 49, 50, 51, 52], 20);
                //Animate the fishes
                animateTiles(river, stage.animatedTiles.fish, tileLayer2, stage, [27, 28, 29, 30], [27, 28, 29, 30], 10);
            }
            let lake = data.chunks.find(function(chunk){return chunk.type === "lake";});
            
            if(lake){
                //Animate the water
                animateTiles(lake, stage.animatedTiles.water, tileLayer, stage, 88, [47, 48, 49, 50, 51, 52], 20);
                //Animate the fishes
                animateTiles(lake, stage.animatedTiles.fish, tileLayer2, stage, 27, [27, 28, 29, 30], 10);
            }
            
            let town = data.chunks.find(function(chunk){return chunk.type === "town";});
            player.on("atDest", function(){
                let inTownRange = Q.isWithinRange({w: 1, h: 1, loc: this.p.loc}, town);
                if(!player.p.inTown && inTownRange){
                    Q.AudioController.playMusic(Q.DataController.currentWorld.music.town);
                    player.p.inTown = true;
                } else if(player.p.inTown && !inTownRange){
                    Q.AudioController.playMusic(Q.TimeController.getMapMusic(Q.DataController.currentWorld.music));
                    player.p.inTown = false;
                }
            });
        } 
        //If we're going into an interior, the type will be the chunk type (farm house === "farm", etc...)
        else {
            //THIS MIGHT BE HANDLED ELSEWHERE ACTUALLY
            if(data.spawnFurniture){
                
            }
        }
        let objectTiles = Q.createArray(0, tileLayer.p.tiles[0].length, tileLayer.p.tiles.length);
        
        //Add the objects in. The tileLayer is set up, so just generate a game object for each object. Draw the ones that have a sheet.
        for(let i = 0; i < stage.objects.length; i++){
            let obj = stage.objects[i];
            //It will have been given an objType if we're spawning something that has an animation
            if(obj.objType){
                stage.insert(new Q[obj.objType](obj));
            }
            if(obj.animal === "Fish"){
                stage.animatedTiles.fish.push(obj.loc);
            }
            Q.MapGen.addToMap(objectTiles, obj.loc, obj.w || 1, obj.h || 1, obj.tile || -1);
            Q.DataController.addToObjects(stage.objectsGrid, obj.loc, obj.w || 1, obj.h || 1, obj);
        }
        //All interactables that go on top of tile layer (trees, rocks, etc)
        let objectLayer = new Q.TileLayer({
            tiles: objectTiles,
            sheet: "objects",
            z: 2
        });
        stage.insert(objectLayer);
        
        
        Q.addViewport(stage, player);
        stage.on("step", function(){
            if(Q.inputs["left"] || Q.inputs["right"] || Q.inputs["down"] || Q.inputs["up"]) {
                player.trigger("acceptInputs");
            }
            if(!player.p.canInput) return;
            if(Q.inputs["interact"]){
                player.trigger("checkInteract");
                Q.inputs["interact"] = false;
            }
            if(Q.inputs["back"]){
                player.trigger("checkBack");
                Q.inputs["back"] = false;
            }
            if(Q.inputs["use-item"]){
                player.trigger("useItem");
                Q.inputs["use-item"] = false;
            }
            if(Q.inputs["cycle-left"]){
                player.trigger("cycleHeldItem", -1);
                Q.inputs["cycle-left"] = false;
            }
            if(Q.inputs["cycle-right"]){
                player.trigger("cycleHeldItem", 1);
                Q.inputs["cycle-right"] = false;
                 
                //TEMP
               // Q.DataController.cycleDay();
            }
            
            if(Q.inputs["item-hk-1"]) player.trigger("pressItemHotkey", 1);
            if(Q.inputs["item-hk-2"]) player.trigger("pressItemHotkey", 2);
            if(Q.inputs["item-hk-3"]) player.trigger("pressItemHotkey", 3);
            if(Q.inputs["item-hk-4"]) player.trigger("pressItemHotkey", 4);
            if(Q.inputs["item-hk-5"]) player.trigger("pressItemHotkey", 5);
            if(Q.inputs["item-hk-6"]) player.trigger("pressItemHotkey", 6);
            if(Q.inputs["item-hk-7"]) player.trigger("pressItemHotkey", 7);
            if(Q.inputs["item-hk-8"]) player.trigger("pressItemHotkey", 8);
            if(Q.inputs["item-hk-9"]) player.trigger("pressItemHotkey", 9);
            if(Q.inputs["item-hk-0"]) player.trigger("pressItemHotkey", 0);
            
            if(Q.inputs["menu"]) Q.loadMenu();
        });
        
        Q.TimeController.turnOnTime();
        
        
    }, {sort: true});
    
    Q.scene("fishing", function(stage){
        let rod = stage.options.rod;
        let fish = stage.options.fish;
        if(!fish){
            Q.stage(0).pause();
            Q.stageScene("dialogue", 2, {dialogue:["There's no fish for some reason..."]});
            return;
        }
        let fishFrame = fish.group === "Salmon" ? 14 : fish.group === "Trout" ? 13 : 15;
        let mainBoxWidth = 400;
        let barWidth = 95;
        let percentage = barWidth / 100;
        //Figure out how much damage is dealt in terms of percentage of max health.
        let fishMaxHealth = fish.health;
        let healthPercent = percentage * fishMaxHealth;
        
        let esc = 100;
        let escPercent = percentage * esc;
        
        
        let mainBox = stage.insert(new Q.UI.Container({x: Q.width / 2 - mainBoxWidth / 2, y: Q.height - 200, w: mainBoxWidth, h: 100, fill: "white", cx:0, cy:0}));
        let topBox = mainBox.insert(new Q.UI.Container({x:5, y: 5, w: mainBoxWidth - 10, h: 45, cx:0, cy:0, radius: 0}));
        let hpBottomBar = topBox.insert(new Q.UI.Container({x:5, y: 10, h: 20, w: barWidth, fill:"grey", cx: 0, cy:0}));
        let hpTopBar = topBox.insert(new Q.UI.Container({x:5, y: 10, h: 20, w: barWidth, fill:"green", cx: 0, cy:0}));
        hpTopBar.add("tween");
        
        let fishIcon = topBox.insert(new Q.Sprite({x: 190, y: 5, w: 32, h: 32, sheet: "objects", frame: fishFrame, cy:0}));
        
        let escBottomBar = topBox.insert(new Q.UI.Container({x:290, y: 10, h: 20, w: barWidth, fill:"grey", cx: 0, cy:0}));
        let escTopBar = topBox.insert(new Q.UI.Container({x:290, y: 10, h: 20, w: barWidth, fill:"lightblue", cx: 0, cy:0}));
        escTopBar.add("tween");
        
        let sliderSize = 180;
        let sliderStart = 100;
        let sliderEnd = sliderStart + sliderSize ;
        
        let bottomBox = mainBox.insert(new Q.UI.Container({x:5, y:50, w: mainBoxWidth - 10, h: 45, cx:0, cy:0, radius: 0}));
        
        let sliderBottomBar = bottomBox.insert(new Q.UI.Container({x: sliderStart, y: 5, h: 40, w: sliderSize, fill: "lightgrey", cx:0, cy:0}));
        
        let hitLineSpeed = 5;
        let hitBoxWidth = 50 - fish.rank * 5;
        //let hitBoxPosition = ~~(Math.random() * (sliderSize - hitBoxWidth)) + sliderStart;
        let hitBoxPosition = sliderStart + sliderSize / 2;
        let hitBox = bottomBox.insert(new Q.UI.Container({x: hitBoxPosition, y: 5, h: 40, w: hitBoxWidth, fill: "grey", cy:0, radius: 0}));
        hitBox.add("tween");
        let hitLine = bottomBox.insert(new Q.UI.Container({x: sliderStart, y: 5, h: 40, w: 1, fill: "black", cy:0, radius: 0, speed: hitLineSpeed, direction: 1}));
        
        function keepWithinBounds(value, min, max){
            if(value > max) return max;
            if(value < min) return min;
            return value;
        }
        
        let fishState = {
            hp: healthPercent,
            esc: escPercent
        };
        let barAnimSpeed = 0.15;
        rod.levelData.damage = 1;
        stage.on("step", function(){
            if(fishState.hp <= 0){
                let fishItem = Q.MapGen.generateObject({tile: fishFrame});
                fishItem.quality = Q.MapGen.generateItemQuality(Q.CharacterController.party[0].special["fishQuality"], Q.CharacterController.party[0].special.consistency);
                Q.Inventory.pickUp(fishItem);
                Q.DataController.removeObjectFromMap(fish, Q.DataController.currentWorld.map.objects, Q.DataController.currentWorld.map.objectsGrid);
                Q.DataController.removeFromAnimatedTiles("fish", fish.loc);
                Q.DataController.removeObjectFromTileLayers(fish, [Q.stage(0).lists.TileLayer[1], Q.stage(0).lists.TileLayer[2]]);
                let randWeight = ((Math.random() * (fish.weight[1] - fish.weight[0])) + fish.weight[0]).toFixed(2);
                Q.stage(0).pause();
                Q.stageScene("dialogue", 2, {dialogue:["Caught a " + randWeight + "kg " + fish.name + " !"]});
            } else if(fishState.esc <= 0 ){
                Q.AudioController.playSound("throw-item.mp3");
                Q.DataController.removeObjectFromMap(fish, Q.DataController.currentWorld.map.objects, Q.DataController.currentWorld.map.objectsGrid);
                Q.DataController.removeFromAnimatedTiles("fish", fish.loc);
                Q.DataController.removeObjectFromTileLayers(fish, [Q.stage(0).lists.TileLayer[1], Q.stage(0).lists.TileLayer[2]]);
                Q.stage(0).pause();
                Q.stageScene("dialogue", 2, {dialogue:["The " + fish.name + " got away..."]});
            }
            hitLine.p.x += hitLine.p.speed * hitLine.p.direction;
            if(hitLine.p.x > sliderEnd || hitLine.p.x < sliderStart){
                hitLine.p.direction *= -1;
                hitLine.p.interactedThisInterval = false;
                fishState.esc -= fish.strength * percentage;
                let escPercentValue = fishState.esc / escPercent * percentage * escBottomBar.p.w;
                escTopBar.animate({ w: keepWithinBounds(escPercentValue, 0, escBottomBar.p.w)}, barAnimSpeed, Q.Easing.Quadratic.InOut);
                Q.AudioController.playSound("text-stream.mp3");
            }
            if(Q.inputs["interact"]){
                if(!hitLine.p.interactedThisInterval){
                    //Increase speed
                    hitLine.p.speed += Math.random();
                    //If the bar is within the range of this frame and last frame.
                    let hit1 = hitLine.p.x - hitLine.p.speed * hitLine.p.direction;
                    let hit2 = hitLine.p.x + hitLine.p.speed * hitLine.p.direction;
                    let min = Math.min(hit1, hit2);
                    let max = Math.max(hit1, hit2);
                    //If we hit within the box
                    if(min < hitBox.p.x + hitBox.p.w / 2 && max > hitBox.p.x - hitBox.p.w / 2){
                        fishState.esc += rod.levelData.speed * percentage;
                        let escPercentValue = fishState.esc / escPercent * percentage * escBottomBar.p.w;
                        escTopBar.animate({ w: keepWithinBounds(escPercentValue, 0, escBottomBar.p.w)}, barAnimSpeed, Q.Easing.Quadratic.InOut);
                        fishState.hp -= keepWithinBounds(rod.levelData.damage - fish.bulk, 1, rod.levelData.damage) * percentage;
                        let hpPercentValue = fishState.hp / healthPercent  * percentage * hpBottomBar.p.w; 
                        hpTopBar.animate({ w: keepWithinBounds(hpPercentValue, 0, hpBottomBar.p.w)}, barAnimSpeed, Q.Easing.Quadratic.InOut);
                        hitBox.p.fill = "#EEE";
                        hitBox.animate({}, 0.1, Q.Easing.Quadratic.InOut, {callback: function(){this.p.fill = "grey";}});
                        Q.AudioController.playSound("attack-with-sword.mp3");
                    } 
                    //If we hit outside of the box
                    else {
                        //Decrease speed
                        hitLine.p.speed -= Math.random();
                        fishState.esc -= rod.levelData.speed * percentage;
                        let escPercentValue = fishState.esc / escPercent * percentage * escBottomBar.p.w;
                        escTopBar.animate({w: keepWithinBounds(escPercentValue, 0, escBottomBar.p.w)}, barAnimSpeed, Q.Easing.Quadratic.InOut);
                        Q.AudioController.playSound("throw-item.mp3");
                    }
                    hitLine.p.interactedThisInterval = true;
                }
                Q.inputs["interact"] = false;
            }
            
        });
        
    });
    
    
};