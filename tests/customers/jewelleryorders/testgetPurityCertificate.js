let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../../config/credentials.json')[STAGE];
const DvaraGold = require('../../../cliient/dvaragold');
const extCustomerId = "ffa9da6a8375dca831fb3be97291763c";
const fileid = '92dbb730-bb83-434c-8e11-a188516c76ed.png'

async function test() {
    let client = await DvaraGold.Client(config);
    return await client.jewelleryPurityCertificate(extCustomerId, fileid)
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