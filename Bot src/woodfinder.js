const mineflayer = require('mineflayer')

const { performance } = require('perf_hooks')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const collectBlock = require('mineflayer-collectblock').plugin
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow } = require('mineflayer-pathfinder').goals
const Vec3 = require('vec3').Vec3

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node blockfinder.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'woodfinder',
  password: process.argv[5]
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)


bot.once('spawn', () => {
      const mcData = require('minecraft-data')(bot.version)

      const defaultMove = new Movements(bot, mcData)
      //let blockType = mcData.blocksByName['oak_log']

      /*let block = bot.findBlock({
            matching: blockType.id,
            maxDistance: 64
      })*/

      /*bot.on('diggingCompleted', (block) => {
            if (bot.inventory.count(37) < 4){ 
                block = bot.findBlock({
                    matching: blockType.id,
                    maxDistance: 64
                })
                if(!block){
                    bot.chat('I dont see that block nearby')
                    return
                }
                bot.collectBlock.collect(block, err => {
                    if (err) bot.chat(err.message)
                })

                console.log(bot.inventory.items())
            }
      })

      if(!block){
            bot.chat('I dont see that block nearby')
            return
      }

      const ids = blockType.id
      const blocks = bot.findBlocks({ matching: ids, maxDistance: 128, count: 4 })

      console.log(block)
      console.log(blocks)

      bot.collectBlock.collect(block, err => {
        if (err) bot.chat(err.message)
      })

      console.log('done')*/

      /*function findVillage() {
          bot.on('goal_reached', (goal) => {
              gatherWood()
          })
          const villagerFilter = (entity) => entity.type === ''
      }*/

      //console.log(bot.inventory)
      //console.log(bot.entity.position)
      gatherWood()

      function gatherWood(){
            let blockType = mcData.blocksByName['oak_log']
            let block = bot.findBlock({
                  matching: blockType.id,
                  maxDistance: 64
            })
            bot.on('diggingCompleted', (block) => {
                  if(bot.inventory.count(37) < 4){
                        block = bot.findBlock({
                              matching: blockType.id,
                              maxDistance: 64
                        })
                        if(!block){
                              bot.chat('I dont see that block nearby')
                              return
                        }
                        bot.collectBlock.collect(block, err => {
                              if (err) bot.chat(err.message)
                        })

                  } else {
                        initialCrafting()
                  }
            })

            block = bot.findBlock({
                  matching: blockType.id,
                  maxDistance: 64
            })
            if(!block){
                  bot.chat('I dont see that block nearby')
                  return
           }
            bot.collectBlock.collect(block, err => {
                  if (err) bot.chat(err.message)
            })
      }

      function initialCrafting() {
            //let benchRecipes
            /*bot.on('goal_reached', (goal) => {
                  benchRecipes = bot.recipesFor(183, null, null, null)
                  console.log(benchRecipes)
            })*/
            console.log('crafting')
            let plankRecipes = bot.recipesFor(15, null, null, null)
            //console.log(plankRecipes)
            bot.craft(plankRecipes[0], 4, null, craftTable)
            //let currentPos = bot.entity.position
            /*bot.pathfinder.setMovements(defaultMove)
            bot.pathfinder.setGoal(new GoalXZ(150, -50))
            benchRecipes = bot.recipesFor(183, null, null, null)
            while(benchRecipes == []){
                  benchRecipes = bot.recipesFor(183, null, null, null)
            }
            console.log(benchRecipes)*/
      }

      function craftTable() {
            console.log('crafting a table')
            let benchRecipes = bot.recipesFor(183, null, null, null)
            //console.log(benchRecipes)
            bot.craft(benchRecipes[0], 1, null, equipTable)

      }

      function equipTable() {
            console.log('equipping table')
            //console.log(bot.inventory.findInventoryItem(183, null))
            bot.equip(bot.inventory.findInventoryItem(183, null), "hand", placeTable)
            /*let blockToPlaceOn = bot.findBlocks({
                  maxDistance: 16,
                  count: 1
            })
            console.log(blockToPlaceOn)*/
            //bot.placeBlock()
      }

      function placeTable() {
            console.log('placing table')
            //console.log(bot.inventory.items())
            let blockType = mcData.blocksByName['grass_block']
            let blockToPlaceOn = bot.findBlock({
                  matching: blockType.id,
                  maxDistance: 16
            })
            //console.log(blockToPlaceOn)
            bot.placeBlock(blockToPlaceOn, new Vec3(0,1,0), craftSticks)
      }

      function craftSticks() {
            console.log('crafting sticks')
            //console.log(bot.inventory.items())
            let stickRecipes = bot.recipesFor(613, null, null, null)
            bot.craft(stickRecipes[0], 3, null, craftWoodPick)
      }

      function craftWoodPick() {
            console.log('crafting wood pick')
            //console.log(bot.inventory.items())
            let blockType = mcData.blocksByName['crafting_table']
            let benchToUse = bot.findBlocks({
                  matching: blockType.id,
                  maxDistance: 64,
                  count: 0
            })
            let woodPickRecipes = bot.recipesFor(585, null, null, benchToUse)
            console.log(woodPickRecipes)
            console.log(benchToUse[0])
            bot.craft(woodPickRecipes[0], 1, benchToUse[0], next)
            
      }

      function next() {
            console.log('next')
      }
})