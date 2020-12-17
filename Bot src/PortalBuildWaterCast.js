//are these redundent? maybe...
const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalXZ, GoalNear, GoalCompositeAny } = require('mineflayer-pathfinder').goals
const Vec3 = require("vec3")
const csp = require("./csp.js")

exports.buildPortal = buildPortal
exports.locateLava = locateLava
exports.constructionSequence = constructionSequence

let searchingForLava = false
let currTime = 0
let listener = null

function buildPortal(bot, mcData){
    //a portal needs 4 scafolding blocks, 12 lava sources, and a bucket of water
    bot.loadPlugin(require('mineflayer-tool').plugin)
    bot.loadPlugin(require('mineflayer-collectblock').plugin)

    //make sure you have the water and flint&steel first
    // let haveBuildingMaterials = bot.inventory.count(mcData.itemsByName.water_bucket.id) < 1
    //     && bot.inventory.count(mcData.itemsByName.flint_and_steel.id) < 1
    // if (!haveBuildingMaterials){
    //     return false
    // }

    // //first, get 4 dirt for scafold
    // //do this like it's shown here
    // //https://stackoverflow.com/questions/43064719/javascript-asynchronous-method-in-while-loop
    // //this creates promise functions to get all the blocks (bot.collectBlock returns a promise, I think)
    // let neededGathers = 4 - bot.inventory.count(mcData.blocksByName.dirt.id)
     let gathers = []
    // for(i in neededGathers){
    //     gathers.push(
    //         bot.collectBlock.collect(
    //             bot.findBlock({
    //                 matching: mcData.blocksByName.grass.id,
    //                 maxDistance: 32
    //             }),
    //             err => {
    //                 bot.chat(""+err)
    //                 console.log(err)
    //             }
    //         )
    //     )
    // }
    /*while (!bot.inventory.count(mcData.blocksByName.dirt.id) < 4){
        bot.collectBlock.collect(
            bot.findBlock({
                matching: mcData.blocksByName.grass.id,
                maxDistance: 32
            }),
            err => {
                bot.chat(""+err)
                console.log(err)
            }
        )
    }*/
    //the promises are all executed. If they all work out, then we can find the lava!
    findLava = (bot, mcData) => {
        if (listener == null) {
            listener = bot.on('physicTick', () => {
                if(searchingForLava && bot.time.age - currTime > 200) {
                    findLava(bot, mcData)
                }
            })
        }
        searchingForLava = true
        //go to lava. 1-1 is the origin as far as the build is concerned
        let fullLava = locateLava(bot, mcData)
        
        if(!fullLava){
            console.log("No valid lava pool could be found!")
            currTime = bot.time.age
            let botPos = bot.entity.position
            let searchGoal = new GoalXZ(botPos.x-100, botPos.z+100)
            bot.pathfinder.setGoal(searchGoal)
            return false
        }

        console.log(fullLava)

        searchingForLava = false
        //fullLava.forEach(blockArray => console.log(blockArray.forEach(block => console.log(block.position))))
        for(i in fullLava){
            for(k in fullLava[i]){
                console.log(fullLava[i][k].name + " at" + fullLava[i][k].position)
            }
        }
        let lava = fullLava[0][1]
        let lavaGoal = new GoalCompositeAny([
            new GoalXZ(lava.position.x, lava.position.z),
            new GoalNear(lava.position.x, lava.position.y, lava.position.z, 2)
        ])
        bot.pathfinder.setGoal(lavaGoal)

        bot.once("goal_reached", () => {
            let bl = fullLava[1][1]
            bot.chat("TIME TO BUILD at " + bl.position)
            bot.chat("/setblock " + 
                bl.position.x + " " +
                bl.position.y + " " +
                bl.position.z +
                " minecraft:emerald_block"
            )
            console.log("TIME TO BUILD")
        })//constructionSequence(bot, lava))
    }
    //don't do .all that will try to do every gather at the same time
    Promise.all(gathers).then(findLava(bot, mcData))
}

function constructionSequence(bot, buildSite){
    const empytBucket = 660
    const waterBucket = 661
    const lavaBucket = 622
    const findInInv = function findInvItem(item){
        return bot.inventory.findInventoryItem(item, null)
    }

    bot.loadPlugin(require('mineflayer-tool').plugin)
    bot.loadPlugin(require('mineflayer-collectblock').plugin)
    //The portal build goes like this:
    /*  Build plane:
        * means any, L means lava, G means ground
                    NORTH
        Lava:    [1 2 3 4]      EAST
        Land:    [5 6 7 8]*/
    //fun fact: block placements are promises. If I can turn
    //  the bucketting into promises, then this can just be one fat promise
    //  declaration
    //s stands for 'sequence'
    //place a scafold in 2 
    /*const s = placeLiquid(bot, findInInv(waterBucket), buildSite[0][2])
    .catch(err => console.log("Build failed: " + err))*/
    let steps = [
        //place a scafold in 2 
        new SiteTask("scaffold", bot, null, buildSite[0][1]),
        new SiteTask("delay"),
        //place water in 3. This makes 4 obsidian
        new SiteTask("liquid", bot, findInInv(waterBucket), buildSite[0][2]),
        new SiteTask("delay"),
        //recollect scafold. The water from 3 will then flow to 2, making 1 obsidian
        new SiteTask("break", bot, null, buildSite[0][1]),
        new SiteTask("delay"),
        //recollect water in 3
        new SiteTask("bucket", bot, findInInv(empytBucket), buildSite[0][2]),
        new SiteTask("delay"),
    ]
    
    /*
        this is the money maker. It allows us to sequentially
        execute promises (because they apparently couldn't do that
        already). Reduce gives us a promise to execute, and the loop keeps
        going until everything's done, while only starting new promises
        when old ones stop being pending
        Got it from here: https://css-tricks.com/why-using-reduce-to-sequentially-resolve-promises-works/
    */
    steps.reduce( (previousPromise, nextStep) => {
        return previousPromise.then(() => {
          return doBuildTask(nextStep);
        }).catch(err => console.log(err));
      }, Promise.resolve());
    //.then(placeLiquid(bot, findInInv(waterBucket), buildSite[0][2])) //the .then is chaining the above line
    
    /*.then(bot.collectBlock.collect(bot.blockAt(buildSite[0][1])))
    //recollect water in 3
    .then(bucketLiquid(bot, findInInv(empytBucket), buildSite[0][2]))
    */
    
    //dig out the block at 5. Now there's 5 scafold blocks
    //build a 3-high tower on 8.
        //which block does it choose?
    //1 above
    //2 above
    //add an overhang scafold at that height over 4
    //place a scafold on 6
    //place water next to the tower's highest block on 7
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
        /fill -139 65 -258 -145 69 264 minecraft:air
    */
}

function locateLava(bot, mcData){
    if(!mcData){
        bot.chat("fuck a bitch named mcData")
        return false
    }
    /*
        so, I'm gonna do this with constraint satisfaction
        what are the variables? Well, there's 8:
        Border 3, Base 1, Base 2, and Border 4, as well as Ground1-4
        Don't ask why it's like that
        They look like this:
        Border3 Base1   Base2   Border 4
        Ground1 Ground2 Ground3 Ground4
        The constraints are that these blocks are:
            Arranged like this
            Are above y=55 (minecraft sea level is 63), to prevent using underground lava lakes
        The last one can be handled without constaint satisfaction
        It's the first one the constraint satisfaction is for
        I'm probably gonna solve it that way too
    */

    //we'd ideally use this to check blocks from findBlocks, but blocks in that method
    //don't know thier positions (or, at least, liquids don't)
    function lavacheck(block){
        if(block.type === mcData.blocksByName.lava.id){
            if(block.position && block.position.y >= 55){
                return true
            }
        }
        return false
    }
    //first, find all of the lava within the search area
    //  ideally we wouldn't even look below y=55, but we can't do that
    let lavaPositions = bot.findBlocks({
        matching: mcData.blocksByName.lava.id,
        maxDistance: 64,
        count: 5000
    })
    console.log(lavaPositions.length + " hits")

    //get the blocks of all lavas above 55
    let lavas = []
    let lava
    for(i in lavaPositions){
        lava = bot.blockAt(lavaPositions[i])
        if(lavaPositions[i].y > 55 && lava.metadata == 0){
            lavas.push(lava)
        }
    }
    console.log("found " + lavas.length + " lavas")
    lavas = lavas.filter(lava => lava !== undefined)
    console.log("reduced to " + lavas.length)
    //console.log(lavas)

    //get the ground blocks adjacent to lava. Their positions
    //matter to make sure the decided build site is on a coast line
    let newAdj
    let grounds = []
    let lavaId = mcData.blocksByName.lava.id
    let checkAdj
    for(i in lavas){
        newAdj = getAdjacentBlocks(bot, lavas[i])
        for(k in newAdj){
            checkAdj = newAdj[k].type
            if(checkAdj !== lavaId){
                grounds.push(newAdj[i])
            }
        }
    }
    
    //for whatever reason, some lava blocks (and undefined values)
    //still sneak through adjacency, so we clean them out here
    console.log("retrived " + grounds.length + " grounds")
    grounds = grounds.filter(grounds => grounds !== undefined)
    grounds = grounds.filter((block) => {
        let notLava = block.type !== mcData.blocksByName.lava.id
        let notAir = block.type !== mcData.blocksByName.air.id
        return notLava && notAir
    })
    console.log("reduced to " + grounds.length)

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
    lavaVarsA = {
        //"Border1": lavas,
        //"Border2": lavas,
        "Border3": lavas,
        "Border4": lavas,
        "Base1": lavas, //doesn't need to be lava technically
        "Base2": lavas, //doesn't need to be lava technically
        "Ground1": grounds,
        "Ground2": grounds,
        "Ground3": grounds,
        "Ground4": grounds
    }

    //for SOME reason, the csp solver removes values from these objects, even if told
    //not to use them. This is for safety
    lavaVarsB = {
        //"Border1": lavas,
        //"Border2": lavas,
        "Border3": lavas,
        "Border4": lavas,
        "Base1": lavas, //doesn't need to be lava technically
        "Base2": lavas, //doesn't need to be lava technically
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
        //["Border1",     "Base1",    blocksAdjacentX],
        //["Border2",     "Border2",  blocksAdjacentX],
        //["Border1",     "Border2",  blocksAdjacentX],
        ["Border3",     "Ground1",  blocksAdjacentX],
        ["Base1",       "Ground2",  blocksAdjacentX],
        ["Base2",       "Ground3",  blocksAdjacentX],
        ["Border4",     "Ground4",  blocksAdjacentX],
        ["Border3",     "Base1",    blocksAdjacentZ],
        ["Base1",       "Base2",    blocksAdjacentZ],
        ["Border4",     "Base2",    blocksAdjacentZ],
        ["Ground1",     "Ground2",  blocksAdjacentZ],
        ["Ground3",     "Ground4",  blocksAdjacentZ],
        ["Ground3",     "Ground2",  blocksAdjacentZ],
    ]

    //constraints for the z-axis parallel satisfaction
    //I know hardcoing sucks, but what do you want from me?
    lavaConsZ = [
        //["Border1",     "Base1",    blocksAdjacentZ],
        //["Border2",     "Border2",  blocksAdjacentZ],
        //["Border1",     "Border2",  blocksAdjacentZ],
        ["Border3",     "Ground1",  blocksAdjacentZ],
        ["Base1",       "Ground2",  blocksAdjacentZ],
        ["Base2",       "Ground3",  blocksAdjacentZ],
        ["Border4",     "Ground4",  blocksAdjacentZ],
        ["Border3",     "Base1",    blocksAdjacentX],
        ["Base1",       "Base2",    blocksAdjacentX],
        ["Border4",     "Base2",    blocksAdjacentX],
        ["Ground1",     "Ground2",  blocksAdjacentX],
        ["Ground3",     "Ground4",  blocksAdjacentX],
        ["Ground3",     "Ground2",  blocksAdjacentX],
    ]

    //we also need to add constraints to make sure no two blocks
    //  are the same. We can do that with some loops. Even though
    //  it's n^2, but there's, like, 8 entries in each so that's
    //  just 64 executions, which is negelgable
    Object.entries(lavaVarsA).forEach(([Akey, Avalue]) => {
        Object.entries(lavaVarsB).forEach(([Bkey, Bvalue]) => {
            if(Akey != Bkey){
                lavaConsX.push([Akey, Bkey, blocksNotTheSame])
                lavaConsZ.push([Akey, Bkey, blocksNotTheSame])
            }
        })
    })

    //we need csp for this part
    //do the initial pass for the x axis
    console.log("trying x...")
    cr = csp.solve({
        variables: lavaVarsA, 
        constraints: lavaConsX,
    })
    //if it fails on the x axis try again on the Z
    if(cr === "FAILURE"){
        console.log("trying z...")
        cr = csp.solve({
            variables:lavaVarsB, 
            constraints: lavaConsZ
        })
    }   

    //if it still failed, no satisfactory lava in range
    if(cr === "FAILURE"){
        return null
    }
    //if it did, parse that data and return it in a way the bot can use
    else{
        //console.log(cr)
        return [
            //notice how it's layed out like the diagrams above!
            //[null,          cr.Border1, cr.Border2, null],
            [cr.Border3,    cr.Base1,   cr.Base2,   cr.Border4],
            [cr.Ground1,    cr.Ground2, cr.Ground3, cr.Ground4]
        ]
    }
}

//super basic, just return all the blocks adjacent to the argument block
function getAdjacentBlocks(bot, block){
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

    for(i in adj){
        //check for undefined
        if(adj[i] === undefined){
            console.log("undefined value")
        }
    }

    return adj
}

function blocksAdjacentX(blockOne, blockTwo){
    //if the absolute value of the difference between 
    //the two blocks' x is exactly 1, then the blocks are next to
    //each other on the x axis
    //console.log(blockOne.type)
    //console.log(blockTwo.type)
    adjOnX = Math.abs(blockOne.position.x - blockTwo.position.x) == 1
    eqOnY = blockOne.position.y === blockTwo.position.y
    eqOnZ = blockOne.position.z === blockTwo.position.z
    return adjOnX && eqOnY && eqOnZ
}

function blocksAdjacentZ(blockOne, blockTwo){
    //if the absolute value of the difference between 
    //the two blocks' z is exactly 1, then the blocks are next to
    //each other on the z axis
    adjOnZ = Math.abs(blockOne.position.z - blockTwo.position.z) == 1
    eqOnY = blockOne.position.y === blockTwo.position.y
    eqOnX = blockOne.position.x === blockTwo.position.x
    return adjOnZ && eqOnY && eqOnX
}

function blocksNotTheSame(blockOne, blockTwo){
    //check if these are the same block, because I guess
    //that's a constraint we need to have
    return blockOne !== blockTwo
}

//theory: if the bot looks at a face, but that face's oppisite
//  is closer, the bot can't actually see the face
//If this returns true, the provided face is closer, and thus
//  shouldn't be blocked by the block it's on
function isOppisiteFarther(bot, face){
    let pos = bot.entity.position
    let fce = pos.plus(face)
    let opp = pos.minus(face)
    return pos.manhattanDistanceTo(fce) < pos.manhattanDistanceTo(opp)
}

function placeScaffold(bot, destination){
    const validSpaces = {
        air: 0,
        water: 26,
        lava: 27
    }
    const validScafolds = {
        dirt: 9,
        cobblestone: 12,
        netherrack: 193
    };
    const adjacentFaces=[new Vec3(1,0,0),new Vec3(-1,0,0),new Vec3(0,1,0),new Vec3(0,-1,0),new Vec3(0,0,-1),new Vec3(0,0,1)];
    const zeroVector = new Vec3(0, 0, 0)

    //make sure there's actually space to place the item
    if(!Object.values(validSpaces).includes(destination.type)){
        console.log("No space for block at " + destination.position + " because of " + destination.type)
        throw("PLACESCAFFFOLD_NOSPACE")
    }

    //very dumb way of deciding on which item to use as scaffolding
    //  and returns false if there is no such block
    let scaf = bot.inventory.findInventoryItem(validScafolds.dirt)
    if(!scaf){
        scaf = bot.inventory.findInventoryItem(validScafolds.cobblestone)
    }
    if(!scaf){
        scaf = bot.inventory.findInventoryItem(validScafolds.netherrack)
    }
    if(!scaf){throw("PLACESCAFFOLD_NOITEMS")}

    let finalFoundation
    let finalFace
    console.log("trying place for " + destination.position)
    for(i in adjacentFaces){
        let face = adjacentFaces[i]
        let checker = destination.position.plus(face).floored()
        foundation = bot.blockAt(checker)
    
        //if there is a block there, place the scaffold against that block
        //  make sure that block isn't air, water, or lava though. You can't place
        //  blocks against those.
        if(foundation && !Object.values(validSpaces).includes(foundation.type)){
            finalFoundation = foundation
            finalFace = zeroVector.minus(face)
            console.log(`place on ${foundation.name}: ${foundation.position} on ${zeroVector.minus(face)}?`)
            break
        }
    }
    if(!finalFoundation){throw("PLACESCAFFOLD_NOFOUNDATION")}

    //I am praying that the outermost promise doesn't resolve
    //until the interior ones do
    //They do so I guess  we just live in callback hell
    let s = bot.equip(scaf, "hand", () => {
        bot.lookAt(finalFoundation.position, true, () => {
            bot.placeBlock(finalFoundation, finalFace, (err) => {
                if(err){
                    console.log("can't place: " + err)
                }
                else{
                    bot.chat("placed!")
                }
            })
        })
    })
    /*let p = s
    .then(bot.lookAt(finalFoundation.position))
    .then(bot.placeBlock(finalFoundation, finalFace), (err) => {
        if(err){
            console.log("can't place: " + err)
        }
        else{
            bot.chat("placed!")
        }
    })
    .catch(err => console.log("Build failed: " + err))*/

    return s
}

function placeLiquid(bot, liquid, destination){
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
    const zeroVector = new Vec3(0, 0, 0)

    //make sure we have a liquid
    if(!liquid){
        console.log("No liquid item provided")
        throw("PLACELIQUID_NOLIQUID")
    }
    //make sure the liquid we're trying to place is a liquid at all
    if(!Object.values(validLiquids).includes(liquid.type)){
        console.log("Item " + liquid + " (ID: " + liquid.type + ") is not a liquid in a bucket")
        throw("PLACELIQUID_NOLIQUID")
    }

    //make sure there's actually space to place the item
    if(!Object.values(validSpaces).includes(destination.type)){
        console.log("No space for block at " + destination.position + " because of " + destination.type)
        throw("PLACELIQUID_NOSPACE")
    }

    let finalFoundation
    let finalFace
    console.log("trying liquid for " + destination.position)
    for(i in adjacentFaces){
        let face = adjacentFaces[i]
        let checker = destination.position.plus(face).floored()
        foundation = bot.blockAt(checker)
    
        //if there is a block there, place the scaffold against that block
        //  make sure that block isn't air, water, or lava though. You can't place
        //  blocks against those.
        if(foundation && !Object.values(validSpaces).includes(foundation.type)){
            finalFoundation = foundation
            finalFace = zeroVector.minus(face)
            console.log(`liquid on ${foundation.position} on ${zeroVector.minus(face)} (${finalFoundation.position.plus(finalFace)}?`)
            break
        }
    }
    if(!finalFoundation){throw("PLACELIQUID_NOFOUNDATION")}
    
    p = bot.equip(liquid, "hand", () => {
        bot.lookAt(finalFoundation.position.plus(finalFace), false, (err) => {
            if(!err){
                console.log("   looking at " + bot.blockAtCursor().position)
                bot.activateItem()
                bot.chat("Liquided!")
            }
            else{
                throw err
            }
        })
    })
    return p
}

function bucketLiquid(bot, bucket, destination){
    const validSpaces = {
        water: 26,
        lava: 27
    }

    //make sure the thing we're trying to bucket is an actual liquid
    if(!Object.values(validSpaces).includes(destination.type)){
        console.log("No liquid at " + destination.position + ". Instead it's " + destination.type)
        throw("BUCKETLIQUID_NOLIQUID")
    }

    //make sure the liquid is an actual source block
    if(destination.metadata != 0){
        console.log("The liquid at " + destination.position + " isn't a source block")
        throw("BUCKETLIQUID_NOSOURCE")
    }

    return bot.equip(bucket, "hand", (err) => {
        if(!err){
            bot.lookAt(destination.position, null, (err) => {
                if(!err){
                    console.log(`bucket on ${destination.position}?`)
                    bot.activateItem()
                    bot.chat("Bucketed!")
                }
                else{
                    throw err
                }
            })
            return true
        }
    })
}

//for high-efficiancy digging
function digScaffold(bot, destination){
    console.log(`dig on ${destination.name}: ${destination.position}?`)
    bot.tool.equipForBlock(destination)
    return bot.dig(destination, (err) => {
        if(!err){
            bot.chat("Digged!")
        }
        else{
            throw err
        }
    })
}

//for injecting time delays into the bot so it can
//catch up with itself
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function doBuildTask(siteTask){
    const timeBetweenTasks = 1000
    let s = siteTask
    let task
    switch(s.command){
        case "scaffold":
            task = placeScaffold(s.bot, s.destination)
            break;
        case "break":
            //task = digScaffold(s.bot, s.destination)
            task = digScaffold.bot, s.destination
            //task = s.bot.collectBlock.collect(s.destination)
            break;
        case "liquid":
            task = placeLiquid(s.bot, s.item, s.destination)
            break;
        case "bucket":
            task = bucketLiquid(s.bot, s.item, s.destination)
            break;
        case "delay":
            task = delay(timeBetweenTasks)
            break;
        default:
            console.log(`No matching task for ${s.command}`)
            task = null
            break
    }
    return task
}

//Easy object constructor for holding data needed for each step of the build
class SiteTask{
    constructor(command, bot, item, destination){
        this.command = command
        this.bot = bot
        this.item = item
        this.destination = destination
    }
}