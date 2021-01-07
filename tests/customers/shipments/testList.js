let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../../config/credentials.json')[STAGE];
const DvaraGold = require('../../../cliient/dvaragold');
const extCustomerId = "EXT0";

const queryParams = {
    orderId: "264f8e30-24c4-11eb-bfbf-1f2a6b301476"
}
async function test() {
    let client = await DvaraGold.Client(config);
    return await client.shippment_list(extCustomerId, queryParams)
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