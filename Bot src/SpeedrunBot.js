const { throws } = require('assert')
const { timeStamp, dir } = require('console')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
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
            port: 57108,
            username: 'Speedrunner',
            version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
        })

        this.bot.loadPlugin(pathfinder)
        this.bot.loadPlugin(require('mineflayer-collectblock').plugin)

        this.mcData = null

        //states
        this.state = "goingToVillage"
        this.prevState = "goingToVillage"
        //doing an action
        this.doing = false

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


    }

    //state transition
    transitionState(){
        switch(this.state){
            case "goingToVillage":
                if (this.atVillage)
                    this.state = "raidingVillage"
                break;
            case "raidingVillage":
                if(this.beds >= 10 && this.chests && this.stone_axe)
                    this.state = "ironAndFoodPhase"
                break;
        }
    }

    //priority action
    chooseAction(){
        console.log("state: " + this.state)

        switch(this.state){
            case "raidingVillage":
                if (this.three_wood){
                    this.doing = true
                    setTimeout(() => { this.craftItem("oak_planks", 3) }, 1000)
                    setTimeout(() => { this.craftItem("stick", 2) }, 2000)
                    setTimeout(() => { this.craftItem("crafting_table", 1) }, 3000)
                    setTimeout(() => { this.equipItem("crafting_table", "hand") }, 3500)
                    setTimeout(() => { this.putBlock("crafting_table", this.findPath())}, 4000)
                    setTimeout(() => { this.craftItem("wooden_pickaxe", 1) }, 6000)
                    setTimeout(() => { this.mineStone()}, 7000)
                    this.wooden_pick = true
                    this.three_wood = false
                } else if(this.three_stone) {
                    this.doing = true
                    setTimeout(() => { this.moveToBlock("crafting_table") }, 500)
                    setTimeout(() => { this.craftItem("stone_pickaxe", 1) }, 10000)
                    setTimeout(() => { this.mineSixStone()}, 11000)
                    this.three_stone = false
                } else if (this.six_stone){
                    this.doing = true
                    setTimeout(() => { this.moveToBlock("crafting_table") }, 1000)
                    setTimeout(() => { this.craftItem("stone_axe", 1) }, 10000)
                    setTimeout(() => { this.chooseAction() }, 11000)
                    this.six_stone = false
                    this.stone_axe = true
                } else {
                    console.log("choosing to raid village")
                    this.raidVillage();
                }
                break;
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
    
    //raiding village priority queue
    raidVillage(){

        if(!this.doing){
            this.doing = true
        }

        let wood
        let bed
        let chest
        let woodDist = 64
        let bedDist = 64
        let chestDist = 64

        if (!this.wooden_pick){
            wood = this.bot.findBlocks({
                //all types of logs
                matching: this.woodArray(),
                maxDistance: 32,
                count: 3
            })
            woodDist = this.distance(wood[0], this.bot.entity.position)
        }

        if (this.beds < 10){
            bed = this.bot.findBlocks({
                //all types of beds
                matching: this.bedArray(),
                maxDistance: 96
            })
            bedDist = this.distance(bed[0], this.bot.entity.position)

            //end if beds >= 10
        }

        if (!this.chests){
            chest = this.bot.findBlocks({
                matching: this.mcData.blocksByName["chest"].id,
                maxDistance: 96
            })
            chestDist = this.distance(chest[0], this.bot.entity.position)

            //ends if no chest within 96 blocks
            if (chest == null)
                this.chests = false
        }

        let min = Math.min(woodDist, bedDist, chestDist)

        switch(min){
            case woodDist:
                console.log("choosing to mine wood")
                setTimeout(() => { this.mineWood(wood, 3) }, 500)
                break
            case bedDist:
                console.log("choosing to get bed")
                setTimeout(() => { this.mineBed(bed, 1) }, 500)
                break
            case chestDist:
                console.log("choosing to get chest")
                setTimeout(() => { this.mineChest(chest, 1) }, 500)
                break
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
                this.chooseAction()
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
                    this.chooseAction()
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
                    this.chooseAction()
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
                this.doing = false
                console.log("amount of beds" + this.beds)
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
    async craftItem (name, amount) {
        const item = this.mcData.findItemOrBlockByName(name)

        let craftingTable = this.mcData.blocksByName["crafting_table"]

        const craftingBlock = this.bot.findBlock({
          matching: craftingTable.id,
          maxDistance: 64
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
        })

        let goal = new GoalGetToBlock(goalBlock.position.x, goalBlock.position.y, goalBlock.position.z)
        this.bot.pathfinder.setGoal(goal)

        return goalBlock
    }
}

module.exports = SpeedrunBot