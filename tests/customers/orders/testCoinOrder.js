const authenticatiion = require('../../../auth/authenticate.js');
const async = require('async');
const bookbullionrate = require('./bookbullionrate');
var testPaySipInstallment = function () {
    const extCustomerId = "EXTCUST01";
    const bullion = {id:"97389e60-9f24-11e9-af59-6586eb183cd1"}
    authenticatiion.authenticateClient(function (err, client) {
        if (client) {
            async.waterfall([
                function(next){
                    bookbullionrate.bookBullionRate(
                                                client,
                                                extCustomerId,
                                                bullion.name,
                                                bullion.id,
                                                "buy",
                                                next);
                },
                function(bullionRate,next){
                    console.dir(bullionRate);
                    const aBookedRate = bullionRate[0];
                    if(aBookedRate){
                        const _order = {
                            agentId:'EXTAGT02',
                            bullion:bullion, //need a valid bullion id
                            bullionRateId:aBookedRate.id, //bullion rateid got through rate booking.
                            weightInGm:1,
                            rateInrPerGm:2751,
                            orderTotalValueInr:1000,  //can be 0 to skip an installment.                           
                            taxRates:[
                                {
                                    taxName: "sgst",
                                    taxCode:"sgst",
                                    taxRatePercent: 18
                                }        
                            ],
                            coinInventoryIds: [
                                {
                                  "coinSpecification": {
                                    "bullionDetails": {
                                      "bullionName": "string",
                                      "bullionShortName": "string",
                                      "purity": "24kt",
                                      "status": "available"
                                    },
                                    "design": "religious",
                                    "name": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                                    "weightInGm": 0,
                                    "makingChargesInr": 0,
                                    "image": "string"
                                  },
                                  "quantity": 10
                                }
                              ],
                              shipment: {
                                "shippingAddress": {
                                  "houseNumber": "string",
                                  "streetName": "string",
                                  "area": "string",
                                  "cityOrVillage": "string",
                                  "postOffice": "string",
                                  "district": "string",
                                  "pinCode": 0,
                                  "state": "string",
                                  "stdCode": 0,
                                  "landmark": "string",
                                  "country": "string"
                                },
                                "shippingCharges": 0
                              }                                
                        }
                        next(null,_order);                        
                        
                    }
                    else{
                        next("Unable to book a bullion rate for this txn");
                    }
                },
                function(sipOrder,next){
                    createBuyOrder(client,extCustomerId,sipOrder,next);
                }
            ],function(err,result){
                if(err){
                    console.error(err)
                }
                else{
                    console.dir(result);
                }
            })
            //sendPaySipInsyallment(client, callback);
        }
        else {
            console.error(err);
        }
    })
}

var createBuyOrder = function (client,extCustomerId,order,callback) {
    
    client
        .invokeApi(null, `/customers/${extCustomerId}/coinorders`,
            'POST', {},
            order
        )
        .then(function (result) {
            callback(null,result.data)
        })
        .catch(function (result) {
            if (result.response) {
                callback({
                    status: result.response.status,
                    statusText: result.response.statusText,
                    data: result.response.data
                });
            } else {
                callback(result.message);
            }
        });
}

testPaySipInstallment();