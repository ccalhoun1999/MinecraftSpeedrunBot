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

    //FSM Strat, implement FSM and change to HFSM later?
    //village
        //asynchronously look for flint while going to village
    //3 wood
        //1 bench
        //8 sticks
        //wood pick
        //3 cobble
        //stone pick
        //5 cobble
        //stone axe
        //stone hoe
    //~10 beds
    //Raid chests (destroy all chests will be easiest)
    //32 planks
    //20 cobble
    //hay for ~20 bread
    //iron golem
    //bucket of water
    //finish flint n steel
    //Find lava pool
    //Build nether portal
})

//recieving server messages
speedrunner.bot.on("message", (jsonMsg, position) => {
    speedrunner.goToVillage(jsonMsg)
})

//on chat
speedrunner.bot.on('chat', (username, message) => {
    const args = message.split(' ')
    let amount = null
    switch(args[0]){
        //list inventory in chat
        //syntax: inventory
        case "inventory":
            speedrunner.sayItems()
            break
        //locate village and travel there
        //syntax: village
        //Pathfinder is also pretty slow, not sure why
        case "village":
            speedrunner.bot.chat("/locate village")
            break
        case 'collect':
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
        //equip an item in a slot
        //syntax: equip [item name] [slot]
        case "equip":
            if (args.length !== 3){
                speedrunner.bot.chat("need item name and slot")
                break
            }

            speedrunner.equipItem(args[1], args[2]);
            break
        //drop an item
        //syntax: toss [item name] [item amount]
        case "toss":
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
        case "unequip":
            if (args.length < 2){
                speedrunner.bot.chat("need slot")
                break
            }

            speedrunner.unequipItem(args[1]);
            break
        //craft a thing
        //syntax: craft [item name] [item amount]
        case "craft":
            if (args.length < 2){
                speedrunner.bot.chat("need item name")
            }

            amount = 1
            if (args.length === 3)
                amount = parseInt(args[2])

            speedrunner.craftItem(args[1], amount)
            break
        //Doesn't work as anticipated, struggles to place the block
        case "place":
            if (args.length < 2){
                speedrunner.bot.chat("need block name")
            }

            //circle around north, south, east, west until block is placed or fail
            //I tried using catch except but it still crashes for some reason so for
            //the time being I have commented out directions other than east
            speedrunner.bot.look(0, -3.14 / 3, true)
            speedrunner.putBlock(args[1], speedrunner.bot.blockAtCursor())
            //speedrunner.bot.look(3.14 / 2, -3.14 / 3, true)
            //speedrunner.putBlock(args[1], speedrunner.bot.blockAtCursor())
            
            //speedrunner.bot.look(3.14, -3.14 / 3, true)
            //speedrunner.putBlock(args[1], speedrunner.bot.blockAtCursor())
            
            //speedrunner.bot.look(3 * 3.14 / 2, -3.14 / 3, true)
            //speedrunner.putBlock(args[1], speedrunner.bot.blockAtCursor())   
            break
            
        case "move":
            if (args.length < 2){
                speedrunner.bot.chat("need block name")
                break
            }

            speedrunner.moveToBlock(args[1])
            break

        case "ironPhase":
            speedrunner.ironPhase()
    }
})

//on pathfinder goal complete
speedrunner.bot.on("goal_reached", () =>{

    console.log("goal reached in state: " + speedrunner.state)

    switch(speedrunner.state){
        case "goingToVillage":
            speedrunner.atVillage = true
            break;
        case "raidingVillage":
            if(speedrunner.goingToCraft){
                if (speedrunner.three_stone){
                    console.log("crafting stone")
                    setTimeout(() => { speedrunner.craftItem("stone_pickaxe", 1) }, 1000)
                    setTimeout(() => { speedrunner.mineSixStone()}, 2000)
                    speedrunner.three_stone = false
                } else if (speedrunner.six_stone){
                    setTimeout(() => { speedrunner.craftItem("stone_axe", 1) }, 1000)
                    setTimeout(() => { this.stone_axe = true; speedrunner.chooseAction()}, 3000)
                    speedrunner.six_stone = false
                }
                this.goingToCraft = false
            }
            break
        default:
            break;
    }
})

//every tick
speedrunner.bot.on("physicTick", () => {
    if (!speedrunner.doing){
        speedrunner.transitionState()
        speedrunner.chooseAction()
    }

    switch(speedrunner.state){
        case "goingToVillage":
            speedrunner.bot.setControlState("sprint", true)
            // speedrunner.bot.setControlState("jump", true)
    }
})

speedrunner.bot.on("diggingCompleted", () => {
    console.log("finished getting blocks")
})