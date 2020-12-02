const mineflayer = require('mineflayer')
const {pathfinder, Movements} = require('mineflayer-pathfinder')
const {GoalNear} = require('mineflayer-pathfinder').goals
 
const bot = mineflayer.createBot({
  host: 'localhost', // optional
  username: 'Speedrunner',
  version: "1.16.4"    // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
})

// bot needs to connect before loading
const mcData = require('minecraft-data')("1.16.4")
//console.log(mcData)

// plugin loading
bot.loadPlugin(pathfinder)

const moves = new Movements(bot, mcData) 
bot.pathfinder.setMovements(moves)

function goToVillage(/*bot, mcData*/) {
  villageCenter = bot.findBlock({
    matching: mcData.blocksByName.stone.id,
    maxDistance: 2500
  })

  if(!villageCenter){
    bot.chat("No village within 2500")
    return
  }

  //const nearestVillage = bot.biomes[]
  const goal = new GoalNear(
    villageCenter.position.x,
    villageCenter.position.y,
    villageCenter.position.z,
    48
  )
  //we don't need to check to see if the destination moves, because villages don't move
  console.log(goal)
  bot.pathfinder.setGoal(goal, false)

  bot.chat("I'm off to the nearest villiage(bell) at" + villageCenter.position)
}

bot.once('spawn', goToVillage)
 
bot.on('chat', function (username, message) {
  if (username === bot.username) return
  bot.chat(message)
})
 
// Log errors and kick reasons:
bot.on('kicked', (reason, loggedIn) => console.log(reason, loggedIn))
bot.on('error', err => console.log(err))