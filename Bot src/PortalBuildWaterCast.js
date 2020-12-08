//are these redundent? maybe...
const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalXZ, GoalNear, GoalCompositeAny } = require('mineflayer-pathfinder').goals
const Vec3 = require("Vec3")
const csp = require("csp.js")

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

        //make sure you have the water and flint&steel first
        let haveBuildingMaterials = bot.inventory.count(mcData.itemsByName.water_bucket.id) < 1
            && bot.inventory.count(mcData.itemsByName.flint_and_steel.id) < 1
        if (!haveBuildingMaterials){
            return false
        }

        //first, get 4 dirt for scafold
        //needs the CollectBlock module
        //might also be kinda scuff idk
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

        //go to lava. 1-1 is the origin as far as the build is concerned
        let fullLava = this.locateLava()
        if(!fullLava){
            console.log("No valid lava pool could be found!")
            return false
        }
        let lava = fullLava[1][1]
        let lavaGoal = new GoalCompositeAny([
            new GoalXZ(lava.position.x, lava.position.z),
            new GoalNear(lava.position.x, lava.position.y, lava.position.z, 2)
        ])
        bot.pathfinder.setGoal(lavaGoal)

        bot.once("goal_reached", constructionSequence(bot, lava))
    }

    constructionSequence(bot, buildSite){
        
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
            Land:    [5G 6G 7G 8G]*
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
    /*//another function I stole from some other dude's bot
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
    }*/

    locateLava(bot, mcData){
        /*
            so, I'm gonna do this with constraint satisfaction
            what are the variables? Well, there's 6:
            Border 1 , Border 2, Border 3, Base 1, Base 2, and Border 4
            They look like this:
            [any]   Border1 Border2 [any]
            Border3 Base1   Base2   Border 4
            Ground  Ground  Ground  Ground
            The constraints are that these blocks are:
                Arranged like this
                Are part of a larger lava pool made of 12 lava
                Are above y=55 (minecraft sea level is 63), to prevent using underground lava lakes
            The last one can be handled without constaint satisfaction
            The second-to-last one can be solved recusively, probably
            It's the first one the constraint satisfaction is for
            I'm probably gonna solve it that way too
        */

        //first, find all of the lava within the search area
        //  ideally we wouldn't even look below y=55, but we can't do that
        //      well we can but I'm not sure how
        let lavaPositions = bot.findBlocks({
            matching: mcData.blocksByName.lava.id,  //would ideally disqualify blocks below y=55
            maxDistance: 1000
        })

        //get the blocks of all lavas above 55
        let lavas = []
        let lava
        for(i in lavaPositions){
            lava = bot.blockAt(lavaPositions[i])
            if(lavas[i].y > 55 && lava.metadata == 0){
                lavas.push(lava)
            }
        }

        //get the ground blocks adjacent to lava. Their positions
        //matter to make sure the decided build site is on a coast line
        let newAdj
        let grounds = []
        for(i in lavas){
            newAdj = this.getAdjacentBlocks(bot, lavas[i])
            for(k in newAdj){
                if(k.type != mcData.blocksByName.lava.id){
                    grounds.push(newAdj[i])
                }
            }
        }

        //group lavas by adjacency
        /*
            So, in theory, a lava lake that is big enough won't even need
            us to group things together, they'll just be big enough.
            If we don't group this together ahead of time, there's a chance 
            that the lava pool we find will be too small. However, if we
            don't do it, then we don't need to figure out how to do it.
        */

        /*
            constraint solve for good lava
            I'm using https://github.com/PrajitR/jusCSP because
            why do the work myself?
            Anyways, jusCSP takes an object with 4 properties:
                variables: each thing we need and its domains
                constraints: a series of nodes that takes two variables and a function
                    that represents the constraints
                callback: what to do as things are solves (we don't need this)
                timestep: how long to wait between each calc (we don't need this)
        */
       //variables
        lavaVars = {
            "Border1": lavas,
            "Border2": lavas,
            "Border3": lavas,
            "Border4": lavas,
            "Base1": lavas,
            "Base2": lavas,
            "Ground1": grounds,
            "Ground2": grounds,
            "Ground3": grounds,
            "Ground4": grounds
        }

        /*
            Constraints for the x-axis parallel satisfaction.
            While jusCPS constraints aren't reflexive, the functions
                we use as constraints are
        */
        lavaConsX = [
            ["Border1",     "Base1",    this.blocksAdjacentX],
            ["Border2",     "Border2",  this.blocksAdjacentX],
            ["Border1",     "Border2",  this.blocksAdjacentX],
            ["Border3",     "Groun1",   this.blocksAdjacentX],
            ["Base1",       "Ground2",  this.blocksAdjacentX],
            ["Base2",       "Ground3",  this.blocksAdjacentX],
            ["Border4",     "Ground4",  this.blocksAdjacentX],
            ["Border3",     "Base1",    this.blocksAdjacentX],
            ["Border4",     "Base2",    this.blocksAdjacentX],
            ["Ground1",     "Ground2",  this.blocksAdjacentX],
            ["Ground3",     "Ground4",  this.blocksAdjacentX],
        ]

        //constraints for the z-axis parallel satisfaction
        //I know hardcoing sucks, but what do you want from me?
        lavaConsZ = [
            ["Border1",     "Base1",    this.blocksAdjacentZ],
            ["Border2",     "Border2",  this.blocksAdjacentZ],
            ["Border1",     "Border2",  this.blocksAdjacentZ],
            ["Border3",     "Groun1",   this.blocksAdjacentZ],
            ["Base1",       "Ground2",  this.blocksAdjacentZ],
            ["Base2",       "Ground3",  this.blocksAdjacentZ],
            ["Border4",     "Ground4",  this.blocksAdjacentZ],
            ["Border3",     "Base1",    this.blocksAdjacentZ],
            ["Border4",     "Base2",    this.blocksAdjacentZ],
            ["Ground1",     "Ground2",  this.blocksAdjacentZ],
            ["Ground3",     "Ground4",  this.blocksAdjacentZ],
        ]

        //we need csp for this part
        //do the initial pass for the x axis
        cr = csp.solve({lavaVars, lavaConsX})
        //if it fails on the x axism try again on the Z
        if(cr === "FAILURE"){constrainResult = csp.solve({lavaVars, lavaConsZ})}

        //if it still failed, no satisfactory lava in range
        if(cr === "FAILURE"){
            return null
        }
        //if it did, parse that data and return it in a way the bot can use
        else{
            return [
                //notice how it's layed out like the diagrams above!
                [null,          cr.Border1, cr.Border2, null],
                [cr.Border3,    cr.Base1,   cr.Base2,   cr.Border4],
                [cr.Ground1,    cr.Ground2, cr.Ground3, cr.Ground4]
            ]
        }
    }

    //super basic, just return all the blocks adjacent to the argument block
    getAdjacentBlocks(bot, block){
        let pos = block.position
        let adj = []
        let p

        p = bot.blockAt(pos.plus(new Vec3(1, 0, 0)))
        if(p){adj.push(p)}
        p = bot.blockAt(pos.plus(new Vec3(-1, 0, 0)))
        if(p){adj.push(p)}
        p = bot.blockAt(pos.plus(new Vec3(0, 0, 1)))
        if(p){adj.push(p)}
        p = bot.blockAt(pos.plus(new Vec3(0, 0, -1)))
        if(p){adj.push(p)}

        return adj
    }

    blocksAdjacentX(blockOne, blockTwo){
        //if the absolute value of the difference between 
        //the two blocks' x is exactly 1, then the blocks are next to
        //each other on the x axis
        return Math.abs(blockOne.position.x - blockTwo.position.x) == 1
    }

    blocksAdjacentZ(blockOne, blockTwo){
        //if the absolute value of the difference between 
        //the two blocks' z is exactly 1, then the blocks are next to
        //each other on the z axis
        return Math.abs(blockOne.position.z - blockTwo.position.z) == 1
    }

    placeLiquid(bot, liquid, destination, callback){
        const validLiquids = {
            lavaBucket: 662,
            waterBucket: 661
        }
        const validSpaces = {
            air: 0,
            water: 26,
            lava: 27
        }
        const adjacentFaces=[new Vec3(1,0,0),new Vec3(-1,0,0),new Vec3(0,1,0),new Vec3(0,-1,0),new Vec3(0,0,-1),new Vec3(0,0,1)];
    
        //make sure the liquid we're trying to place is a liquid at all
        if(!Object.values(validLiquids).includes(liquid.type)){
            console.log("Item " + liquid + " (ID: " + liquid.type + ") is not a liquid in a bucket")
            return false
        }
    
        //make sure there's actually space to place the item
        if(!Object.values(validSpaces).includes(destination.type)){
            console.log("No space for liquid at " + destination.position + " because of " + destination.type)
            return false
        }
    
        bot.equip(liquid, "hand", (err) => {
            if(!err){
                //check each potential face water could be placed on to get it in the destination block
                for(i in adjacentFaces){
                    let face = adjacentFaces[i]
                    let checker = destination.position.plus(face).floored()
                    foundation = bot.blockAt(checker)
                    
                    //if there is a block there, place the liquid against that block
                    if(foundation){
                        bot.lookAt(checker, null, () => {
                            bot.activateItem()
                        })
                        bot.chat("Placed!")
                        return true
                    }
                }
                bot.chat("can't place!")
                return false
            }
        })
    
        //not sure how to do callbacks tbh
        return
    }
    
    bucketLiquid(bot, bucket, destination, callback){
        const validSpaces = {
            water: 26,
            lava: 27
        }
    
        //make sure the thing we're trying to bucket is an actual liquid
        if(!Object.values(validSpaces).includes(destination.type)){
            console.log("No liquid at " + destination.position + ". Instead it's " + destination.type)
            return false
        }

        //make sure the liquid is an actual source block
        if(destination.metadata != 0){
            console.log("The liquid at " + destination.position + " isn't a source block")
        }
    
        bot.equip(bucket, "hand", (err) => {
            if(!err){
                bot.lookAt(checker, null, () => {
                    bot.activateItem()
                })
                bot.chat("Placed!")
                return true
            }
        })
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