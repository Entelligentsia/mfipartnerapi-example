const authenticatiion = require('../../auth/authenticate.js');
const shortid = require('shortid')

var testPostAgents = function () {
    authenticatiion.authenticateClient(function (err, client) {
        if (client) {
            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var info = JSON.parse(body);
                    console.log(info);

                }
            }
            saveAgents(client, callback);
        }
        else {
            console.error(err);
        }
    })
}

var saveAgents = function (client, callback) {
    var _id = shortid.generate();
    const _agents = [
        { extAgentId: `${_id}1`, extBranchId: 'caNwGhfus1', name: { first: "Ajay", middle: "", last: "Singh" } },
        { extAgentId: `${_id}2`, extBranchId: 'caNwGhfus1', name: { first: "ajit", middle: "", last: "Singh" } },
        { extAgentId: `${_id}3`, extBranchId: 'caNwGhfus1', name: { first: "Ajay", middle: "", last: "kumar" } }
    ]
    client
        .invokeApi(null, '/agents', 'POST', {}, _agents)
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

testPostAgents();