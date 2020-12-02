const { BADHINTS } = require('dns')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
const GoalFollow = goals.GoalFollow
const GoalBlock = goals.GoalBlock
const GoalGetToBlock = goals.GoalGetToBlock
const GoalXZ = goals.GoalXZ
const mineflayerViewer = require('prismarine-viewer').mineflayer
 
const bot = mineflayer.createBot({
  host: 'localhost', // optional
  port: 50274,
  username: 'Speedrunner',
  version: false     // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(require('mineflayer-collectblock').plugin)

//update function *********************************** update function
bot.on("physicTick", () => {
  bot.setControlState("sprint", true)
  //bot.chat("/locate village")

  //look at nearest entity
  // const entity = bot.nearestEntity()
  // if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0))
});

//locate the nearest village
function locateVillage(){
  bot.chat("/locate village")
}

//go to nearest village
function goToVillage(jsonMsg){
  const text = String(jsonMsg).split(" ")

  if (text[2] != "village"){
    return
  }

  bot.chat(String(jsonMsg))
  bot.chat("Moving to village now")

  const x = parseInt(text[5])
  const z = parseInt(text[7])

  bot.lookat

  const goal = new GoalXZ(x, z)
  bot.pathfinder.setGoal(goal, true)
}

function mineBlock(username, message) {
  const args = message.split(' ')
  if (args[0] !== 'collect') return

  let count = 1
  if (args.length === 3) count = parseInt(args[1])

  let type = args[1]
  if (args.length === 3) type = args[2]

  const blockType = mcData.blocksByName[type]
  if (!blockType) {
    bot.chat(`"I don't know any blocks named ${type}.`)
    return
  }

  const blocks = bot.findBlocks({
    matching: blockType.id,
    maxDistance: 64,
    count: count
  })

  if (blocks.length === 0) {
    bot.chat("I don't see that block nearby.")
    return
  }

  const targets = []
  for (let i = 0; i < Math.min(blocks.length, count); i++) {
    targets.push(bot.blockAt(blocks[i]))
  }

  bot.chat(`Found ${targets.length} ${type}(s)`)

  bot.collectBlock.collect(targets, err => {
    if (err) {
      // An error occurred, report it.
      bot.chat(err.message)
      console.log(err)
    } else {
      // All blocks have been collected.
      bot.chat('Done')
    }
  })
}

let mcData
bot.once("spawn", () =>{
  mcData = require("minecraft-data")(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)
  // bot.pathfinder.thinkTimeout = 30 * 1000

  locateVillage()
})

//on chat
bot.on('chat', (username, message) => {
  mineBlock(username, message)
})

bot.once("message", (jsonMsg, position) => {
  goToVillage(jsonMsg)
})