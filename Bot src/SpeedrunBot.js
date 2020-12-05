const { throws } = require('assert')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
const { Vec3 } = require('vec3')
const GoalXZ = goals.GoalXZ
const GoalGetToBlock = goals.GoalGetToBlock
const GoalNear = goals.GoalNear

class SpeedrunBot{
    constructor(){
        this.bot = mineflayer.createBot({
            host: 'localhost', // optional
            port: 49528,
            username: 'Speedrunner',
            version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
        })

        this.bot.loadPlugin(pathfinder)
        this.bot.loadPlugin(require('mineflayer-collectblock').plugin)

        this.state = 1

        this.mcData = null
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
      
        let goal = new GoalXZ(x, z)
        this.bot.pathfinder.setGoal(goal)
    }

    //mine blocks in a 128 radius
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
      
        this.bot.chat(`Found ${targets.length} ${blockType}(s)`)
      
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
    listInv(items = this.bot.inventory.items()) {
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
    craftItem (name, amount) {
        const item = require('minecraft-data')(this.bot.version).findItemOrBlockByName(name)

        let craftingTable = this.mcData.blocksByName["crafting_table"]

        const craftingBlock = this.bot.findBlock({
          matching: craftingTable.id
        })

        if (item) {
            if (this.canCraft(item, craftingBlock)){
                const recipe = this.bot.recipesFor(item.id, null, 1, craftingBlock)[0]
                try {
                    this.bot.craft(recipe, amount, craftingBlock)
                    this.bot.chat(`did the recipe for ${name} ${amount} times`)
                } catch (err) {
                    this.bot.chat(`error making ${name}`)
                }
            }
        } else {
            this.bot.chat(`unknown item: ${name}`)
        }
    }

    canCraft(item, table){
        const recipe = this.bot.recipesFor(item.id, null, 1, table)[0]
        if (recipe) {
            this.bot.chat(`I can make ${item.name}`)
            return true
        } else {
            this.bot.chat(`I cannot make ${item.name}`)
            return false
        }
    }

    putCrafting(block){
        //find the nearest dirt/sand block and place a crafting table on it

        if (this.hasItem("crafting_table")){
            this.equipItem("crafting_table", "hand")

            this.bot.chat("placing crafting table")
            this.bot.placeBlock(block, new Vec3(0, 1, 0))
        } else {
            this.bot.chat("no crafting table in inventory")
        }
    }

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