let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../../config/credentials.json')[STAGE];
const DvaraGold = require('../../../cliient/dvaragold');
const extCustomerId = "EXT0";
const id = "be1a80d0-24c4-11eb-84d9-8d25a569b526"

async function test() {
    let client = await DvaraGold.Client(config);
    return await client.shippment_get(extCustomerId, id)
}
test()
    .then(result => {
        console.dir(result)
    })
    .catch(err => {
        console.error(JSON.stringify(err))
    })
    .finally(() => {
        process.exit(0);
    })