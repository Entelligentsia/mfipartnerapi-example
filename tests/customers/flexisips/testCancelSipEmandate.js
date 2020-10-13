let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../../config/credentials.json')[STAGE];
const DvaraGold = require('../../../cliient/dvaragold');

const extCustomerId = 'EXT0';
const sipId = `37c84770-03ad-11eb-8545-65f1f8867384`

async function test(){
    let client = await DvaraGold.Client(config)
    return await client.cancelSipEmandate(extCustomerId, sipId)
}

test()
.then(result=>{
    console.dir(result)
})
.catch(err=>{
    console.error(err)
})
.finally(()=>{
    process.exit(0);
})