class PortalBuildWaterCast{
    constructor(){
        this.v = require('vec3')

        this.validScafolds = {
            3:  true, // dirt
            4:  true, // cobblestone
            87: true, // netherrack
        };
    }


    buildPortal(bot, mcData){
        //a portal needs 4 scafolding blocks, 12 lava sources, and a bucket of water
        bot.loadPlugin(require('mineflayer-collectblock').plugin)

        //make sure you have the water first
        if (!bot.inventory.count(mcData.itemsByName.water_bucket.id) < 1){
            return false
        }

        //first, get 4 dirt for scafold
        //needs the CollectBlock module
        while (!bot.inventory.count(mcData.blocksByName.dirt.id < 4)){
            bot.collectBlock(
                bot.findBlock({
                    matching: mcData.blocksByName.dirt.id,
                    maxDistance: 32
                }),
                err => {
                    bot.chat(err)
                    console.log(err)
                }
            )
        }

        let buildOriginBlock = pass
        //pathfind to nearest lava source.
        /*
            I'm still unsure how to do long-distance biome location with mineflayer
            The checks below should be part of the search process
        */

        //check: are there 12 lavas in a group AND the border of the pool is 4 long and has two other lavas next to it
        //AND there is three blocks of clear space above the 4 lava area and the land right next to it.
            //if there isn't, try looking somewhere else, I guess.

        //once the lava pool is confirmed, memorize the 4 long lava segment. This will be the 
        //  portal's actual location.
        //the original buildOriginBlock is 2L
        let blk = this.bot.world.getBlock       //the getBlock function
        let orPos = buildOriginBlock.position   //the origin block
        let buildSite = [[], [], []]

        //in mineflayer, south and west are positive
        for(i = -1; i <= 1; ++i){
            for(k = -1; k <= 2; ++k){
                buildSite[i+1][k+1] = blk(orPos + this.v(i, 0,))
            }
        }
        
        /*
        tL is techniqueList, a list of everything the bot needs to do
            I'm using this instead of sequential calls to make sure
            the blocks are placed appropritely with call backs.
            because there is no cadence, only speed, in this technique,
            no events or waits are required
        I think this way of making methods works...
        Basically, each function's callback is to shift the array and then call
        whatever comes out

        FINISH BUILDING THIS INTO A NICE LITTLE QUEUE OF FUNCTIONS
        */

        //The portal build goes like this:
        /*  Build plane:
            * means any, L means lava, G means ground
                        NORTH
            Lava:    [9* AL BL C*]
            Lava:    [1L 2L 3L 4L]      EAST
            Land:    [5G 6G 7G 8G]*/
        //I might need to manually get block placements ready too...
        //Also... need to figure out how to ground this cardinally, since
        //  relative block placements NEED to be done using non-relative compass
            
        
        let topFace = this.v(0, 1, 0)
        let water = mcData.itemsByName.water_bucket.id
        let bucket = mcData.itemsByName.bucket.id
        let lava = mcData.itemsByName.lava_bucket.id
        let tl = new Queue(true)

        //place a scafold in 2
        tl.add(() => {this.fullPlaceScaffold(bot, buildSite[1][1], topFace, null);})
        //place water in 3
        tl.add(() => {
            bot.equip(water)     //leaving out the 2nd argument = hold this item
            bot.lookAt(buildSite[1][2].position)
            bot.activateItem()   //leaving out argument = item in main hand
        })
        //recollect scafold
        tl.add(() => 
            bot.collectBlock(
                bot.findBlock({
                    matching: (block) => {return block == buildSite[1][2]},
                    maxDistance: 32
                }),
            err => {
                bot.chat(err)
                console.log(err)
            })
        )
        //By now, 1, 4, A, and B should all be obsidian
        //recollect water
        tl.add(() => {
            bot.equip(bucket)     //leaving out the 2nd argument = hold this item
            bot.lookAt(buildSite[1][2].position)
            bot.activateItem()   //leaving out argument = item in main hand
        })
        //dig out the block at 5. Now there's 5 scafold blocks
        tl.add(() => 
            bot.collectBlock(
                bot.findBlock({
                    matching: (block) => {return block == buildSite[2][0]},
                    maxDistance: 32
                }),
            err => {
                bot.chat(err)
                console.log(err)
            })
        )
        //build a 3-high tower on 8.
            //which block does it choose?
        tl.add(() => {this.fullPlaceScaffold(bot, buildSite[2][3], topFace, null);})
        //1 above
        let mid = bot.blockAt(buildSite[2][3].position + this.v(0, 1, 0))
        tl.add(() => {this.fullPlaceScaffold(bot, mid, topFace, null);})
        //2 above
        let top = bot.blockAt(buildSite[2][3].position + this.v(0, 2, 0))
        tl.add(() => {this.fullPlaceScaffold(bot, top, topFace, null);})
        //add an overhang scafold at that height over 4
        //this is a bit of a craphshoot because which face this goes on depends on
        //  the relative orientation of the portal... good thing someone's had the same
        //  problem before
        let hang = (buildSite[2][3].position + this.v(0, 3, 0))
        tl.add(() => {this.placeHanger(hang, null);})
        //place a scafold on 6
        tl.add(() => {this.fullPlaceScaffold(bot, buildSite[2][1], topFace, null);})
        //place water next to the tower's highest block on 7
        tl.add(() => {
            bot.equip(water)     //leaving out the 2nd argument = hold this item
            //the issue is looking at the correct face...
            bot.lookAt(buildSite[2][2].position + this.v(0, 3, 0))
            bot.activateItem()   //leaving out argument = item in main hand
        })
        /*
            
            As Fast As Possible:
            place lava on 1
            place lava on 4
            place lava on 1
            place lava on 4
            place lava on 3 (using the scafold block above 4)
            place lava on 2 (using the previously made block)
            recollect water
            VERY QUICKLY, dig out 2 and 3. Place lava in both
                the portal is now complete
            Enter portal frame
            look down
            spam-click flint-n-steel until in Nether
        */
    }
    //another function I stole from some other dude's bot
    //https://github.com/PrismarineJS/mineflayer-scaffold/blob/master/index.js
    fullPlaceScaffold(bot, refBlock, face, cb){
        //if we're already holding some scaffolding, place it
        if (bot.heldItem && this.validScafolds[bot.heldItem.type]){
            bot.placeBlock(refBlock, face, cb)
            return true
        }

        //get a list of scaffolds we have in general
        let scaffoldingItems = bot.inventory.items().filter(function(item) {
            return scaffoldBlockTypes[item.type];
        });

        //grab one of 'em
        let item = scaffoldingItems[0]
        
        //if we don't actually have any... well shucks
        if (!item){
            bot.chat("Out of scaffolding for the portal!")
            console.log("Out of scaffolding for the portal!")
            return false
        }

        //null means "place in hand"
        //also I don't think callbacks work this way but...
        return bot.equip(item, null, (error) => {
            //if we couldn't equip it...
            if (error){
                bot.chat("Failed to equip scaffold!")
                console.log("Failed to equip scaffold!")
                return false
            }
            //if we could...
            else{
                //place it!
                bot.placeBlock(refBlock, face, cb)
                return true
            }
        })
    }

    //place a block at a coordinate, as long as there is a face to place it on
    //blockPosition is the position, done is a callback for the placeBlock action
    placeHanger(blockPosition, done){
        blockPosition=blockPosition.floored();
        if(isNotEmpty(blockPosition)) {done(); return;}
        if(bot.heldItem===null) {done(true);return;}
        let p;
        const contiguousBlocks=[new Vec3(1,0,0),new Vec3(-1,0,0),new Vec3(0,1,0),new Vec3(0,-1,0),new Vec3(0,0,-1),new Vec3(0,0,1)];
        for(let i in contiguousBlocks)
        {
            p=blockPosition.plus(contiguousBlocks[i]);
            if(isNotEmpty(p))
            {
                this.fullPlaceScaffold(bot, {position:p},(new Vec3(0,0,0)).minus(contiguousBlocks[i]),done);
                return;
            }
        }
    }
}

//little queue class to make the callbacks easier. Thanks, stackoverflow from 7 years ago!
//use the promises functionality here https://stackoverflow.com/questions/17528749/semaphore-like-queue-in-javascript
class Queue {  
    constructor(autorun = true, queue = []) {
      this.running = false;
      this.autorun = autorun;
      this.queue = queue;
    }
  
    add(cb) {
      this.queue.push((value) => {
          const finished = new Promise((resolve, reject) => {
          const callbackResponse = cb(value);
  
          if (callbackResponse !== false) {
              resolve(callbackResponse);
          } else {
              reject(callbackResponse);
          }
        });
  
        finished.then(this.dequeue.bind(this), (() => {}));
      });
  
      if (this.autorun && !this.running) {
          this.dequeue();
      }
  
      return this;
    }
  
    dequeue(value) {
      this.running = this.queue.shift();
  
      if (this.running) {
          this.running(value);
      }
  
      return this.running;
    }
  
    get next() {
      return this.dequeue;
    }
  }