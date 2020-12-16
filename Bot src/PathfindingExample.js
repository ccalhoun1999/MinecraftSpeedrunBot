const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const GoalFollow = goals.GoalFollow
const GoalBlock = goals.GoalBlock
const lavaBuild = require('./PortalBuildWaterCast.js')

const bot = mineflayer.createBot({
    host: 'localhost',
    username: 'pathfinder_Bot'
})

bot.loadPlugin(pathfinder)

function followPlayer() {
    const playerCI = bot.players['Tommynator314159']

    if (!playerCI || !playerCI.entity) {
        bot.chat("I can't see Thomas!")
        return
    }

    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    movements.scafoldingBlocks = []

    bot.pathfinder.setMovements(movements)

    const goal = new GoalFollow(playerCI.entity, 1)
    bot.pathfinder.setGoal(goal, true)
}

function goToIronGolem () {
    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    //movements.scafoldingBlocks = []
    bot.pathfinder.setMovements(movements)

    const golem = bot.nearestEntity(match = (entity) => {
        if (entity.id == mcData.entitiesByName.iron_golem.id){
            bot.chat("found suitable target of " + entity.name + " " + entity.id)
            bot.chat("Iron golems are ID " + mcData.entitiesByName.iron_golem.id + ", btw")
            return true
        }
        return false
    })

    if (!golem) {
        bot.chat("I can't see any iron golems!")
        return
    }
    else{
        bot.chat("I'm on my way to " + golem.name)
    }

    const x = golem.position.x
    const y = golem.position.y
    const z = golem.position.z
    const goal = new GoalBlock(x, y, z)
    // While golems can move, we just need to get to the area it is in,
    //  the village. This might also route to a pillager outpost though, so... ya know.
    bot.pathfinder.setGoal(goal, false)
}

function locateEmeraldBlock () {
    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    movements.scafoldingBlocks = []
    bot.pathfinder.setMovements(movements)

    const emeraldBlock = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 32
    })

    if (!emeraldBlock) {
        bot.chat("I can't see any emerald blocks!")
        return
    }

    const x = emeraldBlock.position.x
    const y = emeraldBlock.position.y + 1
    const z = emeraldBlock.position.z
    const goal = new GoalBlock(x, y, z)
    bot.pathfinder.setGoal(goal)
}

function lavaTest(){
    //l = new lavaBuild.PortalBuildWaterCast()
    mcData = require('minecraft-data')(bot.version)
    result = lavaBuild.locateLava(bot, mcData)
    if(result){
        console.log("site found")
        for(i in result){
            for(k in result[i]){
                console.log(result[i][k].name + " at" + result[i][k].position)
            }
        }
        bot.chat("trying build...")
        lavaBuild.constructionSequence(bot, result)
    }
    else{
        console.log("Build failed")
    }
}

bot.once('spawn', lavaTest)