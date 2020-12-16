const { throws } = require('assert')
const { timeStamp, dir } = require('console')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
const pvp = require("mineflayer-pvp").plugin
const { PassThrough } = require('stream')
const Recipe = require('prismarine-recipe')("1.16").Recipe
const { Vec3 } = require('vec3')
const GoalXZ = goals.GoalXZ
const GoalGetToBlock = goals.GoalGetToBlock
const GoalNear = goals.GoalNear

class SpeedrunBot{
    constructor(){
        this.bot = mineflayer.createBot({
            host: 'localhost', // optional
            port: 50056,
            username: 'Speedrunner',
            version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
        })

        this.bot.loadPlugin(pathfinder)
        this.bot.loadPlugin(require('mineflayer-collectblock').plugin)
        this.bot.loadPlugin(pvp)

        this.mcData = null

        //states
        this.state = "goingToVillage"
        this.prevState = "goingToVillage"
        //doing an action
        this.doing = false

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
        this.golem = false
        //actual iron golem being attacked
        this.iron_golem_target
        this.iron = 0

        //crafting stuff
        this.bread = false
        this.bucket = false
        this.flint = false
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
                if(this.beds >= 8 && this.chests && this.stone_axe && this.hays >= 8)
                    this.state = "ironPhase"
                break;
        }
    }

    //priority action
    chooseAction(){
        //console.log("state: " + this.state)

        switch(this.state){
            case "raidingVillage":
                if (this.three_wood){
                    this.doing = true
                    setTimeout(() => { this.craftBasic("oak_planks", 3) }, 1000)
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
                if (!this.golem){
                    console.log("on iron phase now")
                    this.ironPhase()
                    //get enough iron and the go to crafting table and make bread and bucket
                } else if (this.iron < 4){
                    this.ironPhase()
                } else if (this.bread && this.bucket){
                    this.getWater()
                } else if (!this.water){
                    this.findGravel()
                } else if (!this.flint){
                    setTimeout(() => { this.craftBasic("flint_and_steel", 1) }, 1000)
                } else if (this.flint){
                   //keep breaking gravel till you get flint
                } else {
                    //locate lava pool
                }
                break
            case "lavaPhase":
                break
        }
    }

    findPath(){
        let path = this.bot.findBlock({
            matching: [this.mcData.blocksByName["grass_path"].id]
        })

        return path
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
        let woodDist = 128
        let bedDist = 128
        let chestDist = 128
        let hayDist = 128

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

        if (this.beds < 8){
            bed = this.bot.findBlocks({
                //all types of beds
                matching: this.bedArray(),
                maxDistance: 128
            })
            if (bed[0] == null){
                this.beds = 8
            } else {
                bedDist = this.distance(bed[0], this.bot.entity.position)
            }
            //end if beds >= 8
        }

        if (!this.chests){
            chest = this.bot.findBlocks({
                matching: this.mcData.blocksByName["chest"].id,
                maxDistance: 128
            })
            if (chest[0] != null){
                chestDist = this.distance(chest[0], this.bot.entity.position)
            } else {
                this.chests = true
            }
        }

        if (this.hays < 8){
            hay = this.bot.findBlocks({
                //all types of beds
                matching: this.mcData.blocksByName["hay_block"].id,
                maxDistance: 128
            })
            if (hay[0] == null){
                //this.hays = 8
            } else {
                hayDist = this.distance(hay[0], this.bot.entity.position)
            }
        }

        let min = Math.min(woodDist, bedDist, chestDist, hayDist, 127)

        switch(min){
            case woodDist:
                if (!this.wooden_pick){
                    console.log("choosing to mine wood")
                    setTimeout(() => { this.mineWood(wood, 3) }, 500)
                    break
                }
            case bedDist:
                if (this.beds < 8){
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
        this.water = true
    }

    //collect 5 gravel
    findGravel(){
        const blockType = this.mcData.blocksByName["gravel"]

        let count = 5
      
        const blocks = this.bot.findBlocks({
            matching: blockType.id,
            maxDistance: 128,
            count: count
        })
      
        if (blocks.length === 0) {
            this.bot.chat("I don't see that block nearby.")
            return
        }
      
        const targets = []
        for (let i = 0; i < Math.min(blocks.length, count); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
      
        //this.bot.chat(`Found ${targets.length} ${blockType}(s)`)
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
            }
        })
    }

    //kill them golems
    goToIronGolem(iron_golem){
        let goal = new GoalNear(iron_golem.position.x, iron_golem.position.y+6, iron_golem.position.z, 2)
        this.bot.pathfinder.setGoal(goal)
    }

    attackIronGolem(){
        if (this.iron_golem_target != null){
            if (this.distance(this.iron_golem_target.position, this.bot.entity.position) > 5.5){
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
            }

            this.golem = true

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
                // setTimeout(() => {this.doing = false}, 200)
                this.transitionState()
                this.chooseAction()
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
                // setTimeout(() => {this.doing = false}, 200)
                this.transitionState(); 
                this.chooseAction()
            }
        })
    }

    //mine blocks
    mineBlocks(block, count) {
        const blockType = this.mcData.blocksByName[block]
        if (!blockType) {
            this.bot.chat(`"I don't know any blocks named ${block}.`)
            return
        }
      
        const blocks = this.bot.findBlocks({
            matching: blockType.id,
            maxDistance: 128,
            count: count
        })
      
        if (blocks.length === 0) {
            this.bot.chat("I don't see that block nearby.")
            return
        }
      
        const targets = []
        for (let i = 0; i < Math.min(blocks.length, count); i++) {
            targets.push(this.bot.blockAt(blocks[i]))
        }
      
        //this.bot.chat(`Found ${targets.length} ${blockType}(s)`)
      
        this.bot.collectBlock.collect(targets, err => {
            if (err) {
                // An error occurred, report it.
                this.bot.chat(err.message)
                console.log(err)
            } else {
                // All blocks have been collected.
                this.bot.chat('Done')
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