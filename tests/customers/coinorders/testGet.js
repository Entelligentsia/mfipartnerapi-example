let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../../config/credentials.json')[STAGE];
const DvaraGold = require('../../../cliient/dvaragold');
const extCustomerId = "EXT0";
const orderId = '87523630-2995-11eb-8345-33598b7703e4'

async function test() {
    let client = await DvaraGold.Client(config);
    return await client.getCoinOrder(extCustomerId, orderId)
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