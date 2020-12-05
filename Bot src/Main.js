const { BADHINTS } = require('dns')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
const GoalXZ = goals.GoalXZ
const SpeedrunBot = require('./SpeedrunBot');

const speedrunner = new SpeedrunBot();

//on spawn
let mcData
speedrunner.bot.once("spawn", () =>{
    mcData = require("minecraft-data")(speedrunner.bot.version)
    const movements = new Movements(speedrunner.bot, mcData)
    speedrunner.bot.pathfinder.setMovements(movements)

    speedrunner.mcData = mcData
})

//recieving server messages
speedrunner.bot.on("message", (jsonMsg, position) => {
    speedrunner.goToVillage(jsonMsg)
})

//on chat
speedrunner.bot.on('chat', (username, message) => {
    const args = message.split(' ')
    let amount = null
    switch(true){
        //collect a block
        //syntax: collect [item amount] [item name]
        case args[0] === 'collect':
            if (args.length < 2){
                speedrunner.bot.chat("need item name")
                break
            }

            amount = 1
            let type = args[1]
            if (args.length === 3) {
                amount = parseInt(args[1])
                type = args[2]
            }

            speedrunner.mineBlocks(type, amount)
            break
        //list inventory in chat
        //syntax: inventory
        case args[0] === "inventory":
            speedrunner.listInv()
            break
        //locate village and travel there
        //syntax: village
        case args[0] === "village":
            speedrunner.bot.chat("/locate village")
            break
        //equip an item in a slot
        //syntax: equip [item name] [slot]
        case args[0] === "equip":
            if (args.length !== 3){
                speedrunner.bot.chat("need item name and slot")
                break
            }

            speedrunner.equipItem(args[1], args[2]);
            break
        //drop an item
        //syntax: toss [item name] [item amount]
        case args[0] === "toss":
            if (args.length < 2){
                speedrunner.bot.chat("need item name")
                break
            }

            amount = null
            if (args.length === 3)
                amount = parseInt(args[2])

            speedrunner.tossItem(args[1], amount)
            break
        //unequip an item
        //syntax: unequip [slot]
        case args[0] === "unequip":
            if (args.length < 2){
                speedrunner.bot.chat("need slot")
                break
            }

            speedrunner.unequipItem(args[1]);
            break
        //craft a thing
        //syntax: craft [item name] [item amount]
        case args[0] === "craft":
            if (args.length < 2){
                speedrunner.bot.chat("need item name")
            }

            amount = 1
            if (args.length === 3)
                amount = parseInt(args[2])

            speedrunner.craftItem(args[1], amount)
            break
        case args[0] === "place":
            if (args.length < 2){
                speedrunner.bot.chat("need block name")
            }

            let name = args[1]
            switch(true){
                case name === "crafting_table":
                    let goalBlock = speedrunner.moveToBlock("dirt")

                    speedrunner.putCrafting(goalBlock)
                    break
            }
            break
        case args[0] === "move":
            if (args.length < 2){
                speedrunner.bot.chat("need block name")
                break
            }

            speedrunner.moveToBlock(args[1])
            break
    }
})

//on pathfinder goal complete
speedrunner.bot.on("goal_reached", () =>{

})

//every tick
speedrunner.bot.on("physicTick", () => {

})