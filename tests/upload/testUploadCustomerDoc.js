
let STAGE = process.env.mygold_stage ? process.env.mygold_stage : 'dev';
const config = require('../../config/credentials.json')[STAGE];
const DvaraGold = require('../../cliient/dvaragold');


const path = require('path');
const request = require('request');
const fs = require('fs');

const extCustomerId = 'ffa9da6a8375dca831fb3be97291763c';
const uploadfilePath = 'tests/res/customer.png';
const fileMetadata = {
    type:'CUSTOMER_LIEN_DOC',
    filename:path.basename(uploadfilePath)
}

async function test(){
    let client = await DvaraGold.Client(config)             
    let uploadResponse = await client.getCustomerDocumentUploadURL(extCustomerId,fileMetadata);
    console.log(uploadResponse);
    let uploadUrl = uploadResponse.uploadurl;
    let s3uploadResult = await uploadClient(uploadUrl,uploadfilePath,uploadResponse.ContentType)     
    console.log(s3uploadResult);
    return 0;
    }

    async function uploadClient(url,diskFilePath,contentType){
        return new Promise((resolve,reject)=>{
            var stats = fs.statSync(diskFilePath);
            fs.createReadStream(diskFilePath).pipe(request({
                method: 'PUT',
                url: url,
                headers: {
                  'Content-Type':contentType,
                  'Content-Length': stats['size']
                }
              }, function (err, res, body) {
                    if(err || res.statusCode != 200){
                        reject({body:res})
                    }
                    else{
                        resolve({body:{status:'OK'}})
                    }
              }));        
        })
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

