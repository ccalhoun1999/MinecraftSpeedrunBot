const { throws } = require('assert')
const { waitForDebugger } = require('inspector')
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
            port: 60307,
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
    sayItems(items = this.bot.inventory.items()) {
        const output = items.map(this.itemToString).join(', ')
        if (output) {
          this.bot.chat(output)
        } else {
          this.bot.chat('empty inventory')
        }
    }

    clearInventory () {
        let essentials = ["wooden_pickaxe",
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
                                "oak_wood",
                                "spruce_wood",
                                "birch_wood",
                                "jungle_wood",
                                "acacia_wood",
                                "dark_oak_wood",
                                "oak_planks",
                                "spruce_planks",
                                "birch_planks",
                                "jungle_planks",
                                "acacia_planks",
                                "dark_oak_planks",
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
            }, 100 * i)
        }
    }

    check (essentials, item) {
        if (essentials.indexOf(item) == -1) {
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
          matching: craftingTable.id
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
            this.bot.chat(`I can make ${item.name}`)
            return true
        } else {
            this.bot.chat(`I cannot make ${item.name}`)
            return false
        }
    }

    //places a
    putBlock(name, block){
        if (this.hasItem(name)){
            this.equipItem(name, "hand")

            this.bot.chat(`placing ${name} on ${block}`)
            this.bot.placeBlock(block, new Vec3(0, 1, 0))
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

    //opens a chest and stays inside of it
    watchChest (minecart) {
        let chestToOpen
        if (minecart) {
            chestToOpen = Object.keys(this.bot.entities).map(id => this.bot.entities[id]).find(e => e.entityType === this.mcData.entitiesByName.chest_minecart && 
                e.objectData.intField === 1 && 
                this.bot.entity.position.distanceTo(e.position) < 3)
            if (!chestToOpen) {
                this.bot.chat('no chest minecart found')
                return
            }
        } else {
            chestToOpen = this.bot.findBlock({
                matching: ['chest', 'ender_chest', 'trapped_chest'].map(name => this.mcData.blocksByName[name].id),
                maxDistance: 6
            })
            if (!chestToOpen) {
                this.bot.chat('no chest found')
                return
            }
        }

        const chest = this.bot.openChest(chestToOpen)
        chest.on('open', () => {
            this.sayItems(chest.items())
        })
        chest.on('updateSlot', (oldItem, newItem) => {
            this.bot.chat(`chest update: ${itemToString(oldItem)} -> ${itemToString(newItem)}`)
        })
        chest.on('close', () => {
            this.bot.chat('chest closed')
        })
      
        this.bot.on('chat', (username, message) =>{
            this.onChestChat(username, message, chest)
        })
    }

    onChestChat (username, message, chest) {
        const command = message.split(' ')
        switch (true) {
            case /^close$/.test(message):
                this.closeChest(chest)
                break
            case /^withdraw \d+ \w+$/.test(message):
                // withdraw amount name
                // ex: withdraw 16 stick
                this.withdrawItem(command[2], command[1], chest)
                break
            case /^deposit \d+ \w+$/.test(message):
                // deposit amount name
                // ex: deposit 16 stick
                this.depositItem(command[2], command[1], chest)
                break
        }
    }
  
    closeChest (chest) {
        chest.close()
    }
  
    async withdrawItem (name, amount, chest) {
        const item = itemByName(chest.items(), name)
        if (item) {
            try {
                await chest.withdraw(item.type, null, amount)
                this.bot.chat(`withdrew ${amount} ${item.name}`)
            } catch (err) {
                this.bot.chat(`unable to withdraw ${amount} ${item.name}`)
            }
      } else {
            this.bot.chat(`unknown item ${name}`)
      }
    }
  
    async depositItem (name, amount, chest) {
        const item = itemByName(this.bot.inventory.items(), name)
        if (item) {
            try {
                await chest.deposit(item.type, null, amount)
                this.bot.chat(`deposited ${amount} ${item.name}`)
            } catch (err) {
                this.bot.chat(`unable to deposit ${amount} ${item.name}`)
            }
        } else {
            this.bot.chat(`unknown item ${name}`)
        }
    }

}

module.exports = SpeedrunBot