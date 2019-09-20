const authenticatiion = require('../auth/authenticate.js');

var testGetRate = function () {
    authenticatiion.authenticateClient(function (err, client) {
        if (client) {
            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(JSON.stringify(body));
                }
            }
            getRate(client, callback);
        }
        else {
            console.error(err);
        }
    })
}

var getRate = function (client, callback) {
    const extCustomerId = "47054";
    const additionalParametrs = {}    
    client.invokeApi(null, `/customers/${extCustomerId}/passbook`, 'GET',additionalParametrs)
        .then(function (result) {
            console.log(result.data)
        })
        .catch(function (result) {
            if (result.response) {
                console.dir({
                    status: result.response.status,
                    statusText: result.response.statusText,
                    data: result.response.data
                });
            } else {
                console.log(result.message);
            }
        });
}

testGetRate();