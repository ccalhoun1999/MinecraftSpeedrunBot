const { throws } = require('assert')
const { timeStamp, dir } = require('console')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
//const pvp = require("mineflayer-pvp").plugin
const lavaBuild = require('./PortalBuildWaterCast')
const { PassThrough } = require('stream')
const Recipe = require('prismarine-recipe')("1.16").Recipe
const { Vec3 } = require('vec3')
const GoalXZ = goals.GoalXZ
const GoalGetToBlock = goals.GoalGetToBlock
const GoalNear = goals.GoalNear
const GoalBlock = goals.GoalBlock

class SpeedrunBot{
    constructor(){
        this.bot = mineflayer.createBot({
            host: 'localhost', // optional
            port: 50456,
            username: 'Speedrunner',
            version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
        })

        this.bot.loadPlugin(pathfinder)
        this.bot.loadPlugin(require('mineflayer-collectblock').plugin)
        //this.bot.loadPlugin(pvp)

        this.mcData = null

        //states
        this.state = "goingToVillage"
        this.prevState = "goingToVillage"
        //doing an action
        this.doing = false
        //index of arrays
        this.index = 0

        //moving to craft
        this.goingToCraft = false

        //village section
        this.atVillage = false

        this.wooden_pick = false
        this.three_wood = false
        this.three_stone = false

        this.stone_pick = false
        this.six_stone = false
        this.stone_axe = false

        this.beds = 0
        this.chests = false
        this.hays = 0

        //iron phase
        this.dirt = 0

        this.golem = false
        //actual iron golem being attacked
        this.iron_golem_target
        this.iron = 0
        this.goingToGolem = false

        this.goingToIron = false
        this.goingToFlint = false

        //crafting stuff
        this.bread = false
        this.bucket = false

        //gravel
        this.placeGravelHere
        this.gravel = false
        this.flint = false

        //water stuff
        this.waterBlock
        this.gettingWater = false
        this.water = false
    }

    //state transition
    transitionState(){
        switch(this.state){
            case "goingToVillage":
                if (this.atVillage)
                    this.state = "raidingVillage"
                break;
            case "raidingVillage":
                console.log("beds " + this.beds)
                console.log("chest " + this.chests)
                console.log("stone axe " + this.stone_axe)
                console.log("hay " + this.hays)
                if(this.beds >= 4 && this.chests && this.stone_axe && this.hays >= 8)
                    this.state = "ironPhase"
                break;
            case "ironPhase":
                if (this.flint && this.water && this.bread){
                    this.clearInventory()
                    setTimeout(() => { this.state = "lavaPhase"; }, 1500)
                }
                    
        }
    }

    //priority action
    chooseAction(){
        //console.log("state: " + this.state)

        switch(this.state){
            case "raidingVillage":
                if (this.three_wood){
                    this.doing = true
                    setTimeout(() => { this.craftPlanks(3) }, 1000)
                    setTimeout(() => { this.craftBasic("stick", 2) }, 2000)
                    setTimeout(() => { this.craftBasic("crafting_table", 1) }, 3000)
                    setTimeout(() => { this.equipItem("crafting_table", "hand") }, 3500)
                    setTimeout(() => { let path = this.findPath(); let goal = new GoalNear(path.position.x, path.position.y, path.position.z, 3); 
                        this.bot.pathfinder.setGoal(goal); this.goingToCraft = true }, 4000)
                } else if(this.three_stone) {
                    this.doing = true
                    setTimeout(() => { this.moveToBlock("crafting_table"); this.goingToCraft = true }, 500)
                } else if (this.six_stone){
                    this.doing = true
                    setTimeout(() => { this.moveToBlock("crafting_table"); this.goingToCraft = true }, 500)
                } else {
                    console.log("choosing to raid village")
                    this.doing = true
                    this.raidVillage();
                }
                break
            case "ironPhase":
                if (this.dirt < 20){
                    this.doing = true
                    this.mineDirt()
                } else if (!this.golem){
                    console.log("on iron phase now")
                    this.ironPhase()
                    //get enough iron and the go to crafting table and make bread and bucket
                } else if (this.iron < 4){
                    this.ironPhase()
                } else if (this.bread && this.bucket && !this.water){
                    this.getWater()
                } else if (this.water && !this.gravel){
                    this.doing = true
                    this.findGravel()
                } else if (this.flint){
                    setTimeout(() => { this.craftBasic("flint_and_steel", 1) }, 500)
                    setTimeout(() => { this.transitionState(); this.chooseAction(); }, 1000)
                } else if (!this.flint){
                    if (this.hasItem("gravel")){
                        setTimeout(() => {
                            console.log("going to place gravel block")
                            let path = this.findPath(); 
                            let goal = new GoalNear(path.position.x, path.position.y, path.position.z, 2); 
                            this.bot.pathfinder.setGoal(goal); 
                            this.goingToCraft = true
                        }, 1000)
                    }
                }
                break
            case "lavaPhase":
                lavaBuild.buildPortal(this.bot, this.mcData)
                break
        }
    }

    clearInventory () {
        let essentials = [      "wooden_pickaxe",
                                "stone_pickaxe",
                                "iron_pickaxe",
                                "stone_axe",
                                "stone_hoe",
                                "bucket",
                                "water_bucket",
                                "bread",
                                "hay_block",
                                "wheat",
                                "cobblestone",
                                "crafting_table",
                                "stick",
                                "lava_bucket",
                                "dirt",
                                "oak_log",
                                "spruce_log",
                                "birch_log",
                                "jungle_log",
                                "acacia_log",
                                "dark_oak_log",
                                "oak_planks",
                                "spruce_planks",
                                "birch_planks",
                                "jungle_planks",
                                "acacia_planks",
                                "dark_oak_planks",
                                "flint_and_steel",
                                "white_bed",
                                "orange_bed",
                                "magenta_bed", 
                                "light_blue_bed",
                                "yellow_bed",
                                "lime_bed", 
                                "pink_bed", 
                                "gray_bed", 
                                "light_gray_bed", 
                                "cyan_bed", 
                                "purple_bed", 
                                "blue_bed", 
                                "brown_bed",
                                "green_bed",
                                "red_bed", 
                                "black_bed"

                            ]
        let inv = this.bot.inventory.items()
        for (var i = 0, size = inv.length; i < size; i++){
            toss(essentials, inv, i, this.bot, this)
        }
        this.sayItems()

        function toss(essentials, inv, i, bot, self) {
            setTimeout(function() {
                var item = inv[i]
                //bot.chat(item.name)
                if (essentials.indexOf(item.name) == -1) {
                    bot.tossStack(item)
                    //bot.chat("tossed" + self.itemToString(item))
                }
            }, 50 * i)
        }
    }

    check (essentials, item) {
        if (essentials.indexOf(item) == -1) {
        }
    }

    findPath(){
        let path = this.bot.findBlock({
            matching: [this.mcData.blocksByName["grass_path"].id]
        })

        return path
    }

    getLava() {
        console.log("getting lava")
        lavaBuild.buildPortal(this.bot, this.mcData)
    }

    craftPlanks(count){
        if(this.hasItem("oak_log")){
            this.craftBasic("oak_planks", count)
        } else if (this.hasItem("spruce_log")){
            this.craftBasic("spruce_planks", count)
        } else if (this.hasItem("birch_log")){
            this.craftBasic("birch_planks", count)
        } else if (this.hasItem("jungle_log")){
            this.craftBasic("jungle_planks", count)
        } else if (this.hasItem("acacia_log")){
            this.craftBasic("acacia_planks", count)
        } else if (this.hasItem("dark_oak_log")){
            this.craftBasic("dark_oak_planks", count)
        }
    }

    woodArray(){
        return [this.mcData.blocksByName["oak_log"].id, this.mcData.blocksByName["spruce_log"].id, 
        this.mcData.blocksByName["birch_log"].id, this.mcData.blocksByName["acacia_log"].id, this.mcData.blocksByName["dark_oak_log"].id]
    }

    bedArray(){
        return [this.mcData.blocksByName["white_bed"].id, this.mcData.blocksByName["orange_bed"].id, this.mcData.blocksByName["magenta_bed"].id, 
        this.mcData.blocksByName["light_blue_bed"].id, this.mcData.blocksByName["yellow_bed"].id, this.mcData.blocksByName["lime_bed"].id, 
        this.mcData.blocksByName["pink_bed"].id, this.mcData.blocksByName["gray_bed"].id, this.mcData.blocksByName["light_gray_bed"].id, 
        this.mcData.blocksByName["cyan_bed"].id, this.mcData.blocksByName["purple_bed"].id, this.mcData.blocksByName["blue_bed"].id, 
        this.mcData.blocksByName["brown_bed"].id, this.mcData.blocksByName["green_bed"].id, this.mcData.blocksByName["red_bed"].id, 
        this.mcData.blocksByName["black_bed"].id]
    }

    ironPhase(){
        this.state = "ironPhase"
        this.doing = true

        const filter = e => e.type === 'mob' && e.position.distanceTo(this.bot.entity.position) < 128 &&
                    e.mobType !== 'Armor Stand' && e.name === "iron_golem"
        
        let iron_golem = this.bot.nearestEntity(filter)

        if (iron_golem != null){
            this.iron_golem_target = iron_golem
            this.goToIronGolem(iron_golem)
            // console.log(this.iron_golem_target)
        }
    }
    
    //raiding village priority queue
    raidVillage(){
        let wood
        let bed
        let chest
        let hay
        let woodDist = 64
        let bedDist = 64
        let chestDist = 64
        let hayDist = 64

        if (!this.wooden_pick){
            wood = this.bot.findBlocks({
                //all types of logs
                matching: this.woodArray(),
                maxDistance: 24,
                count: 3
            })
            if (wood[0] == null){
                //this.wooden_pick = true
            } else {
                woodDist = this.distance(wood[0], this.bot.entity.position)
            } 
        }

        if (this.beds < 4){
            bed = this.bot.findBlocks({
                //all types of beds
                matching: this.bedArray(),
                maxDistance: 64
            })
            if (bed[0] == null){
                if (this.hays >= 8 && this.chests && this.stone_axe)
                    this.beds = 4
            } else {
                bedDist = this.distance(bed[0], this.bot.entity.position)
            }
            //end if beds >= 8
        }

        if (!this.chests){
            chest = this.bot.findBlocks({
                matching: this.mcData.blocksByName["chest"].id,
                maxDistance: 64
            })
            if (chest[0] != null){
                chestDist = this.distance(chest[0], this.bot.entity.position)
            } else {
                if (this.beds >= 4 && this.hays >= 8 && this.stone_axe)
                    this.chests = true
            }
        }

        if (this.hays < 8){
            hay = this.bot.findBlocks({
                //all types of beds
                matching: this.mcData.blocksByName["hay_block"].id,
                maxDistance: 64
            })
            if (hay[0] == null){
                if (this.beds >= 4 && this.chests && this.stone_axe)
                    this.hays = 8
            } else {
                hayDist = this.distance(hay[0], this.bot.entity.position)
            }
        }

        let min = Math.min(woodDist, bedDist, chestDist, hayDist, 63)

        switch(min){
            case woodDist:
                if (!this.wooden_pick){
                    console.log("choosing to mine wood")
                    setTimeout(() => { this.mineWood(wood, 3) }, 500)
                    break
                }
            case bedDist:
                if (this.beds < 4){
                    console.log("choosing to get bed")
                    setTimeout(() => { this.mineBed(bed, 1) }, 500)
                }
                break
            case chestDist:
                if (!this.chests){
                    console.log("choosing to get chest")
                    setTimeout(() => { this.mineChest(chest, 1) }, 500)
                }
                break
            case hayDist:
                if (this.hays < 8){
                    console.log("choosing to get hay")
                    setTimeout(() => { this.mineHay(hay, 1) }, 500)
                }
                break
            default:
                this.transitionState()
                this.chooseAction()
                break
        }
    }

    //water
    getWater(){
        this.gettingWater = true
        let waterBlocks = this.bot.findBlocks({
            matching: this.mcData.blocksByName["water"].id,
            maxDistance: 128,
            count: 10
        })

        if (waterBlocks[0] != null){
            let goal = new GoalBlock(waterBlocks[0].x, waterBlocks[0].y, waterBlocks[0].z)
            this.bot.pathfinder.setGoal(goal)
            this.waterBlock = waterBlocks[0]
        }
    }

    //collect 5 gravel
    findGravel(){
        this.bot.chat("finding gravel")
        const gravelType = this.mcData.blocksByName["gravel"]
      
        const gravel = this.bot.findBlock({
            matching: gravelType.id,
            maxDistance: 128,
        })

        if (gravel != null){
            if (gravel.position.y > 59){
                const targets = []
                targets.push(gravel)

                this.bot.collectBlock.collect(targets, err => {
                    if (err) {
                        // An error occurred, report it.
                        this.bot.chat(err.message)
                        console.log(err)
                    } else {
                        // All blocks have been collected.
                        this.bot.chat('got the gravel')
                        this.gravel = true
                        this.goingToFlint = true
                        this.chooseAction()
                    }
                })
            }
        }
    }

    //kill them golems
    goToIronGolem(iron_golem){
        let goal = new GoalGetToBlock(iron_golem.position.x, iron_golem.position.y+6, iron_golem.position.z)
        this.bot.pathfinder.setGoal(goal)
        this.goingToGolem = true
    }

    attackIronGolem(){
        if (this.iron_golem_target != null){
            if (this.distance(this.iron_golem_target.position, this.bot.entity.position) > 6.5){
                this.goToIronGolem(this.iron_golem_target)
            } else {
                console.log("attacking golem")
                this.bot.setControlState("jump", true)
                this.bot.attack(this.iron_golem_target)
                setTimeout(() => {this.attackIronGolem()}, 1250)
            }
        } else {
            this.bot.setControlState("jump", false)
            //pick up the iron
            const filter1 = e => e.type === 'object' && e.objectType === "Item" && e.kind === "Drops" && e.metadata[7].itemId == 579
            let iron = this.bot.nearestEntity(filter1)

            //console.log(iron)
            if (iron != null){
                let goal = new GoalGetToBlock(iron.position.x, iron.position.y, iron.position.z)
                setTimeout(() => {this.bot.pathfinder.setGoal(goal)}, 1300)
                this.goingToIron = true
            }

            this.golem = true
            this.goingToGolem = false

            // this.transitionState()
            // this.chooseAction()
        }
    }

    //distance formula
    distance(point1, point2){
        let temp = Math.pow((point2.x - point1.x), 2) + Math.pow((point2.y - point1.y), 2) + Math.pow((point2.z - point1.z), 2)
        return Math.sqrt(temp)
    }

    //go to the village
    goToVillage(jsonMsg){
        const text = String(jsonMsg).split(" ")
      
        if (text[2] != "village"){
          return
        }
      
        this.bot.chat(String(jsonMsg))
        this.bot.chat("Moving to village now")
      
        const x = parseInt(text[5])
        const z = parseInt(text[7])
      
        let goal = new GoalNear(x, 70, z, 32);
        this.bot.pathfinder.setGoal(goal)
    }

    mineChest(blocks){
        const targets = []
        for (let i = 0; i < Math.min(blocks.length); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                this.state = this.prevState
                this.doing = false
                // this.transitionState()
                // this.chooseAction()
            }
        })
    }

    mineSixStone(){
        this.three_wood = false
        let stone = this.bot.findBlocks({
            //all types of logs
            matching: [this.mcData.blocksByName["stone"].id, this.mcData.blocksByName["cobblestone"].id],
            maxDistance: 17,
            count: 3
        })

        const targets = []
        for (let i = 0; i < Math.min(stone.length); i++) {
            targets.push(this.bot.blockAt(stone[i]))
        }
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                if (!this.six_stone){
                    this.three_stone = false
                    this.six_stone = true
                    this.doing = false
                    // this.transitionState()
                    // this.chooseAction()
                }
            }
        })
    }

    mineStone(){
        this.three_wood = false
        let stone = this.bot.findBlocks({
            //all types of logs
            matching: [this.mcData.blocksByName["stone"].id, this.mcData.blocksByName["cobblestone"].id],
            maxDistance: 17,
            count: 3
        })

        const targets = []
        for (let i = 0; i < Math.min(stone.length); i++) {
            targets.push(this.bot.blockAt(stone[i]))
        }
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                if (!this.three_stone){
                    this.three_wood = false
                    this.three_stone = true
                    this.doing = false
                    //this.chooseAction()
                }
            }
        })
    }

    mineWood(blocks){
      
        const targets = []
        for (let i = 0; i < Math.min(blocks.length); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                this.state = this.prevState
                this.three_wood = true
                this.doing = false
                //this.chooseAction()
            }
        })
    }

    mineHay(blocks){
        const targets = []
        for (let i = 0; i < Math.min(blocks.length); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                this.state = this.prevState
                ++this.hays
                console.log("amount of hay" + this.hays)
                setTimeout(() => {this.transitionState(); this.chooseAction()}, 200)
            }
        })
    }

    mineBed(blocks){
        const targets = []
        for (let i = 0; i < Math.min(blocks.length); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                this.state = this.prevState
                ++this.beds
                console.log("amount of beds" + this.beds)
                setTimeout(() => {this.transitionState(); this.chooseAction()}, 200)
            }
        })
    }

    dirtArray(){
        //return [this.mcData.blocksByName["dirt"].id, this.mcData.blocksByName["grass_block"].id, this.mcData.blocksByName["grass_path"].id]
        return [this.mcData.blocksByName["grass_block"].id, this.mcData.blocksByName["grass_path"].id]
    }

    mineDirt(){
        const blocks = this.bot.findBlocks({
            matching: this.dirtArray(),
            maxDistance: 128,
            count: 20
        })
        
        const targets = []
        for (let i = 0; i < Math.min(blocks.length, 20); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
        
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
                this.dirt = 20
                this.chooseAction()
            }
        })
    }

    //list your inventory
    sayItems(items = this.bot.inventory.items()) {
        const output = items.map(this.itemToString).join(', ')
        if (output) {
          this.bot.chat(output)
        } else {
          this.bot.chat('empty inventory')
        }
    }

    //helper for listing inventory
    itemToString (item) {
        if (item) {
            return `${item.name} x ${item.count}`
        } else {
            return '(nothing)'
        }
    }

    //tosses given item
    tossItem (name, amount) {
        const item = this.hasItem(name)
        if (!item) {
            this.bot.chat(`I have no ${name}`)
        } else if (amount) {
            this.bot.toss(item.type, null, amount)
        } else {
            this.bot.tossStack(item)
        }
    }

    //returns the first item instance if in inventory, null if none
    hasItem(name) {
        return this.bot.inventory.items().filter(item => item.name === name)[0]
    }

    //equip the item in the destination slot
    equipItem (name, destination) {
        const item = this.hasItem(name)
        if (item) {
            try {
                this.bot.equip(item, destination)
                this.bot.chat(`equipped ${name}`)
            } catch (err) {
                this.bot.chat(`cannot equip ${name}: ${err.message}`)
            }
        } else {
            this.bot.chat(`I have no ${name}`)
        }
    }

    //unequip the item at destination slot
    unequipItem(destination){
        this.bot.unequip(destination)
    }

    //craft an item
    async craftItem (name, amount, table=true) {
        const item = this.mcData.findItemOrBlockByName(name)

        let craftingTable = this.mcData.blocksByName["crafting_table"]

        const craftingBlock = this.bot.findBlock({
            matching: craftingTable.id,
        })

        if (item) {
            if (this.canCraft(item, craftingBlock)){
                const recipe = this.bot.recipesFor(item.id, null, null, craftingBlock)[0]

                //reverse the recipe because the recipes are reversed for some reason
                if (recipe.inShape != null){
                    recipe.inShape = recipe.inShape.reverse();
                }
                
                try {
                    await this.bot.craft(recipe, amount, craftingBlock)
                    this.bot.chat(`did the recipe for ${name} ${amount} times`)
                } catch (err) {
                    this.bot.chat(err.message)
                }
            }
        } else {
            this.bot.chat(`unknown item: ${name}`)
        }
    }

    craftBasic(name, amount){
        const item = this.mcData.findItemOrBlockByName(name)

        if (item) {
            if (this.canCraft(item, null)){
                const recipe = this.bot.recipesFor(item.id, null, null, null)[0]

                //reverse the recipe because the recipes are reversed for some reason
                if (recipe.inShape != null){
                    recipe.inShape = recipe.inShape.reverse();
                }
                
                try {
                    this.bot.craft(recipe, amount, null)
                    this.bot.chat(`did the recipe for ${name} ${amount} times`)
                } catch (err) {
                    this.bot.chat(err.message)
                }
            }
        } else {
            this.bot.chat(`unknown item: ${name}`)
        }
    }

    //checks if an item is craftable
    canCraft(item, table){
        const recipe = this.bot.recipesFor(item.id, null, 1, table)[0]
        if (recipe) {
            //this.bot.chat(`I can make ${item.name}`)
            return true
        } else {
            //this.bot.chat(`I cannot make ${item.name}`)
            return false
        }
    }

    //places a
    putBlock(name, block){
        if (this.hasItem(name)){
            this.equipItem(name, "hand")

            this.bot.chat(`placing ${name} on ${block}`)
            this.bot.placeBlock(block, new Vec3(0, 1, 0), err=>{
                if (err) {
                    // An error occurred, report it.
                    this.bot.chat(err.message)
                } else {
                    // All blocks have been collected.
                    this.bot.chat('placed')
                }
            })
        } else {
            this.bot.chat(`no ${name} in inventory`)
        }
    }

    //move right next to a block
    moveToBlock(block){
        const blockType = this.mcData.blocksByName[block]

        const goalBlock = this.bot.findBlock({
            matching: blockType.id,
            maxDistance: 128
        })

        if (goalBlock == null)
            return

        let goal = new GoalGetToBlock(goalBlock.position.x, goalBlock.position.y, goalBlock.position.z)
        this.bot.pathfinder.setGoal(goal)

        return goalBlock
    }
}

module.exports = SpeedrunBot