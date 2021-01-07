let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../config/credentials.json')[STAGE];
const DvaraGold = require('../../cliient/dvaragold');
var extBranchId = '1-address-check';
const queyparams = {
    bullionId: "G1"
}

async function test() {
    let client = await DvaraGold.Client(config);
    return await client.getLtvRate(extBranchId, queyparams);
}
test()
    .then(result => {
        console.dir(result)
    })
    .catch(err => {
        console.error(err)
    })
    .finally(() => {
        process.exit(0);
    })