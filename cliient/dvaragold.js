const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWSCognito = require("amazon-cognito-identity-js");
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const apigClientFactory = require("aws-api-gateway-client").default;
const ON_ERROR_RECONNECT_DELAY = 60 * 1000;
const AWS = require('aws-sdk');
global.fetch = require('node-fetch')

function authenticate(config, callback) {
    const poolData = {
        UserPoolId: config.userPool,
        ClientId: config.appClient
    };

    AWS.config.update({ region: config.region });
    var userPool = new AWSCognito.CognitoUserPool(poolData);

    var userData = {
        Username: config.user,
        Pool: userPool
    };
    var authenticationData = {
        Username: config.user,
        Password: config.password
    };
    var authenticationDetails = new AWSCognito.AuthenticationDetails(
        authenticationData
    );

    var cognitoUser = new AWSCognito.CognitoUser(userData);

    console.log("Authenticating with User Pool");

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            callback(null, {
                idToken: result.getIdToken().getJwtToken(),
                accessToken: result.getAccessToken().getJwtToken()
            });
        },
        onFailure: function (err) {
            console.log(err.message ? err.message : err);
            callback(err, null);
        },
        newPasswordRequired: function () {
            console.log("Given user needs to set a new password");
            callback("Given user needs to set a new password", null);
        },
        mfaRequired: function () {
            console.log("MFA is not currently supported");
            callback("MFA is not currently supported", null);
        },
        customChallenge: function () {
            console.log("Custom challenge is not currently supported");
            callback("Custom challenge is not currently supported", null);
        }
    });
}

function getCredentials(config, userTokens, callback) {
    console.log("Getting temporary credentials");

    var logins = {};
    var idToken = userTokens.idToken;
    var accessToken = userTokens.accessToken;

    logins[
        "cognito-idp." + config.region + ".amazonaws.com/" + config.userPool
    ] = idToken;

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: config.identityPool,
        Logins: logins
    });

    AWS.config.credentials.get(function (err) {
        if (err) {
            console.log(err.message ? err.message : err);
            callback(err, null)
            return;
        }

        callback(null, userTokens);
    });
}

function authenticateClient(config, callback) {
    authenticate(config, function (err, tokens) {
        if (err) {
            callback(err, null);
            return;
        }
        getCredentials(config, tokens, function (err, _tokens) {
            if (err) {
                callback(err, null);
                return;
            }
            var credentials = AWS.config.credentials;
            // console.dir({
            //     accessKey: credentials.accessKeyId,
            //     secretKey: credentials.secretAccessKey,
            //     sessionToken: credentials.sessionToken,
            //     region: config.region                
            // });
            var apigClient = apigClientFactory.newClient({
                accessKey: credentials.accessKeyId,
                secretKey: credentials.secretAccessKey,
                sessionToken: credentials.sessionToken,
                region: config.region,
                invokeUrl: `${config.basePath}`,
            });
            callback(null, apigClient, credentials.expireTime);
        })
    })
}

async function authenticateClientAsync(config) {
    return new Promise((resolve, reject) => {
        try {
            authenticateClient(config, function (err, client, expireTime) {
                if (err || !client) {
                    reject(err ? err : "Unable to authenticate");
                }
                else {
                    resolve({ client: client, expireTime: expireTime });
                }
            })
        }
        catch (e) {
            reject(e);
        }
    })
}
async function get(client, api, additionalParametrs) {
    return new Promise((resolve, reject) => {
        client
            .invokeApi(null, api, 'GET', additionalParametrs)
            .then(function (result) {
                resolve(result.data)
            })
            .catch(function (result) {
                reject(getErrorResponse(result));
            });
    })

}
async function post(client, api, parameters) {
    return new Promise((resolve, reject) => {
        client
            .invokeApi(null, api,
                'POST', {},
                parameters
            )
            .then(function (result) {
                resolve(result.data)
            })
            .catch(function (result) {
                reject(getErrorResponse(result));
            });

    })

}
async function put(client, api, parameters) {
    return new Promise((resolve, reject) => {
        client
            .invokeApi(null, api,
                'PUT', {},
                parameters
            )
            .then(function (result) {
                resolve(result.data)
            })
            .catch(function (result) {
                reject(getErrorResponse(result));
            });

    })

}


async function _delete(client, api, parameters) {
    return new Promise((resolve, reject) => {
        client
            .invokeApi(null, api,
                'DELETE', {},
                parameters
            )
            .then(function (result) {
                resolve(result.data)
            })
            .catch(function (result) {
                reject(getErrorResponse(result));
            });

    })

}

function getErrorResponse(result) {
    if (result.response) {
        return {
            status: result.response.status,
            statusText: result.response.statusText,
            data: result.response.data
        }
    }
    else {
        return result.message;
    }
}

class Client {
    constructor(config) {
        this._config = config;
        const self = this;
        return new Promise((resolve, reject) => {
            self.renewClientToken(function (err, status) {
                resolve(self)
            })
        })
    }
    renewClientToken(callback) {
        authenticateClientAsync(this._config)
            .then((data) => {
                const { client, expireTime } = data;
                this._client = client;
                if (expireTime) {
                    const _renew = parseInt((expireTime.getTime() - Date.now()) * 75 / 100)
                    setTimeout((dg) => {
                        dg.renewClientToken(callback)
                    }, _renew, this)
                    console.log('\x1b[33m%s\x1b[33m', `Will auto renew token in ${parseInt(_renew / 1000)} seconds`)
                }
                console.log('Client token renewed');
                if (callback) callback(null, true)
            })
            .catch(e => {
                console.error(e);
                console.log(`Token renewal failed. Client unusable @ ${new Date()}`);
                setTimeout((dg) => {
                    dg.renewClientToken(callback)
                }, ON_ERROR_RECONNECT_DELAY, this)
                console.log(`Will try to reconnect in ${ON_ERROR_RECONNECT_DELAY}`);
            })
    }
    _GET(api, queryParameters) {
        return get(this._client, api, queryParameters)
    }
    _POST(api, parameters) {
        return post(this._client, api, parameters)
    }
    _DELETE(api, parameters) {
        return _delete(this._client, api, parameters)
    }
    _PUT(api, parameters) {
        return put(this._client, api, parameters)
    }
    testSetup() {
        return get(this._client, `/test`)
    }
    addPaymentDetails(details) {
        return post(this._client, `/orders/addPaymentDetails`, details)
    }
    getCustomerInvoiceUrl(customerId, orderid) {
        return get(this._client, `/customers/${customerId}/orderinvoice/${orderid}`)
    }
    getPartnerEodReport(date) {
        return get(this._client, `/eodreport/${date}`)
    }
    getSsoUrl(data) {
        return post(this._client, `/auth/sso_url`,data)
    }
    createEtfBuyOrder(customerId, order) {
        return post(this._client, `/customers/${customerId}/etforders/buy`, order)
    }
    createEtfSIPBuyOrder(customerId, order) {
        return post(this._client, `/customers/${customerId}/etforders/sipbuy`, order)
    }
    addPaymentDetailsForETforders(payments) {
        return post(this._client, `/etforders/addPaymentDetails`, payments)
    }

    taxRates(customerId, queryParams) {
        const additionalParametrs = {
            queryParams: queryParams
        }
        return get(this._client, `/customers/${customerId}/taxrates`, additionalParametrs)
    }
    taxRatesBranch(extBranchId, queryParams) {
        const additionalParametrs = {
            queryParams: queryParams
        }
        return get(this._client, `/branches/${extBranchId}/taxrates`, additionalParametrs)
    }
    loaninquire(customerId, queryParams) {
        const additionalParametrs = {
            queryParams: queryParams
        }
        return get(this._client, `/customers/${customerId}/loaninquiry`, additionalParametrs)
    }

    loanrequest(data) {
        return post(this._client, `/loans`, data)
    }

    loandetails(loanid) {

        return get(this._client, `/loans/${loanid}`)
    }


    addconsentdetails(loanid, data) {
        return post(this._client, `/loans/${loanid}/addconsentdetails`, data)
    }




    createEtfSellOrder(customerId, order) {
        return post(this._client, `/customers/${customerId}/etforders/sell`, order)
    }
    cancelEtfOrder(customerId, orderId, cancellationReason) {
        return post(this._client, `/customers/${customerId}/etforders/cancel`, {
            id: orderId,
            cancellationreason: cancellationReason
        })
    }
    getEtfOrder(customerId, orderId) {
        return get(this._client, `/customers/${customerId}/etforders/${orderId}`)
    }
    pincode(pincode) {
        return get(this._client, `/pincode/${pincode}`)
    }
    getEtfOrderList(customerId, orderId) {
        return get(this._client, `/customers/${customerId}/etforders`)
    }
    bookBullionRate(extCustomerId, bullionName, bullionId, rateType) {
        const additionalParametrs = {
            queryParams: {
                bullionName: bullionName,
                bullionId: bullionId,
                rateType: rateType
            }
        }
        return get(this._client, `/customers/${extCustomerId}/bullionrates`, additionalParametrs)
    }
    bullionRateHistoryCustomerSip(extCustomerId, bullionId) {
        const additionalParametrs = {
            queryParams: {
                bullionId: bullionId,
            }
        }
        return get(this._client, `/customers/${extCustomerId}/bullionrates/sipplanning`, additionalParametrs)
    }
    bullionRateHistoryCustomer(extCustomerId, bullionId) {
        const additionalParametrs = {
            queryParams: {
                bullionId: bullionId,
            }
        }
        return get(this._client, `/customers/${extCustomerId}/bullionrates/recenthistory`, additionalParametrs)
    }
    bullionRateHistoryBranchSip(extBranchId, bullionId) {
        const additionalParametrs = {
            queryParams: {
                bullionId: bullionId,
            }
        }
        return get(this._client, `/branches/${extBranchId}/bullionrates/sipplanning`, additionalParametrs)
    }
    bullionRateHistoryBranch(extBranchId, bullionId) {
        const additionalParametrs = {
            queryParams: {
                bullionId: bullionId,
            }
        }
        return get(this._client, `/branches/${extBranchId}/bullionrates/recenthistory`, additionalParametrs)
    }

    bookBullionRateBranch(extBranchId, bullionName, bullionId, rateType) {
        const additionalParametrs = {
            queryParams: {
                bullionName: bullionName,
                bullionId: bullionId,
                rateType: rateType
            }
        }
        return get(this._client, `/branches/${extBranchId}/bullionrates`, additionalParametrs)
    }

    getBullions(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/bullions`)
    }
    getBullionsBranch(extBranchId) {
        return get(this._client, `/bullions`)
    }
    getPassbook(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/passbook`)
    }
    createBuyOrder(extCustomerId, order) {
        return post(this._client, `/customers/${extCustomerId}/buyorders`, order)
    }
    getBuyOrder(extCustomerId, orderId) {
        return get(this._client, `/customers/${extCustomerId}/buyorders/${orderId}`)
    }
    getBuyOrders(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/buyorders`)
    }

    createSellOrder(extCustomerId, order) {
        return post(this._client, `/customers/${extCustomerId}/sellorders`, order)
    }
    getSellOrder(extCustomerId, orderId) {
        return get(this._client, `/customers/${extCustomerId}/sellorders/${orderId}`)
    }
    getSellOrders(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/sellorders`)
    }
    createCoinOrder(extCustomerId, order) {
        return post(this._client, `/customers/${extCustomerId}/coinorders`, order)
    }
    createJewelerOrder(extCustomerId, order) {
        return post(this._client, `/customers/${extCustomerId}/jewelerorders`, order)
    }
    cancelPayment(extCustomerid, orderId, total, cancellationReason, type) {
        return post(this._client, `/customers/${extCustomerid}/cancelpayment`, {
            orderid: orderId,
            total: total,
            cancellationreason: cancellationReason,
            type: type
        })
    }

    cancelOrder(extCustomerid, orderId, cancellationReason) {
        return post(this._client, `/customers/${extCustomerid}/cancelorder`, {
            id: orderId,
            cancellationreason: cancellationReason
        })
    }
    getAgents() {
        return get(this._client, '/agents')
    }
    getAgent(extAgentId) {
        return get(this._client, `/agents/${extAgentId}`)
    }
    saveAgents(agents) {
        return post(this._client, `/agents`, agents)
    }
    updateAgent(extAgentId, agent) {
        return put(this._client, `/agents/${extAgentId}`, agent)
    }
    getBranches() {
        return get(this._client, '/branches')
    }
    getBranch(extBranchId) {
        return get(this._client, `/branches/${extBranchId}`)
    }
    saveBranches(branches) {
        return post(this._client, `/branches`, branches)
    }
    updateBranch(extBranchId, branch) {
        return put(this._client, `/branches/${extBranchId}`, branch)
    }
    getCustomers(queryStringParameters) {
        const additionalParametrs = {
            queryParams: queryStringParameters
        }
        return get(this._client, `/customers`, additionalParametrs)
    }
    getCustomer(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}`)
    }
    saveCustomers(customers) {
        return post(this._client, `/customers`, customers)
    }
    updateCustomer(extCustomerId, customer) {
        return post(this._client, `/customers/${extCustomerId}`, customer)
    }
    requestOtp(phoneNumber) {
        return post(this._client, `/customers/requestotp`, { 'phoneNumber': phoneNumber })
    }
    login(session) {
        return post(this._client, `/customers/login`, session)
    }
    updateCustomer(extCustomerId, customer) {
        return put(this._client, `/customers/${extCustomerId}`, customer)
    }
    getGatewayConfig(customerId) {
        return post(this._client, `/payments/${customerId}/gatewayconfig`, { test: 'dummy' })
    }
    getProduct(id,extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/products/${id}`)
    }
    getProductShowcase(queryStringParameters,extCustomerId) {
        const additionalParametrs = {
            queryParams: queryStringParameters
        }
        return get(this._client, `/customers/${extCustomerId}/productshowcase`, additionalParametrs)
    }
    getProducts(queryStringParameters,extCustomerId) {
        const additionalParametrs = {
            queryParams: queryStringParameters
        }
        return get(this._client, `/customers/${extCustomerId}/products`, additionalParametrs)
    }
    testWebhook(data) {
        return post(this._client, `/webhooks/dummy`, data)
    }
    getCustomerDocumentUploadURL(extCustomerId, fileMetadata) {
        return post(this._client, `/customers/${extCustomerId}/uploaddoc`, fileMetadata)
    }
    getCustomerDocumentUploadURLForConsent(extCustomerId, fileMetadata) {
        return post(this._client, `/customers/${extCustomerId}/uploadconsentdoc`, fileMetadata)
    }
    getCustomerFileBasedOnFilePath(filePath) {
        return get(this._client, `${filePath}`)
    }
    getCustomerSips(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/sips`)
    }
    cancelCustomerSip(extCustomerId, sipId) {
        return _delete(this._client, `/customers/${extCustomerId}/sips/${sipId}`)
    }
    createCustomerSip(extCustomerId, sip) {
        return post(this._client, `/customers/${extCustomerId}/sips`, sip)
    }
    payCustomerSipInstallment(extCustomerId, sipOrder) {
        return post(this._client, `/customers/${extCustomerId}/siporders`, sipOrder)
    }
    updateCustomerSip(extCustomerId, sipId, sipOrder) {
        return put(this._client, `/customers/${extCustomerId}/sips/${sipId}`, sipOrder)
    }
    getCustomerSipDetails(extCustomerId, sipId) {
        return get(this._client, `/customers/${extCustomerId}/sips/${sipId}`)
    }
    getCustomerflexiSips(extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/flexisips`)
    }
    cancelCustomerflexiSip(extCustomerId, sipId) {
        return _delete(this._client, `/customers/${extCustomerId}/flexisips/${sipId}`)
    }
    createCustomerflexiSip(extCustomerId, sip) {
        return post(this._client, `/customers/${extCustomerId}/flexisips`, sip)
    }
    updateCustomerflexiSip(extCustomerId, sipId, sipOrder) {
        return put(this._client, `/customers/${extCustomerId}/flexisips/${sipId}`, sipOrder)
    }
    getCustomerSipflexiDetails(extCustomerId, sipId) {
        return get(this._client, `/customers/${extCustomerId}/flexisips/${sipId}`)
    }

    getOrdersMfiWise(queryParams) {
        const additionalParametrs = {
            queryParams: queryParams
        }
        return get(this._client, `/orders`, additionalParametrs)
    }

    getInvoice(extCustomerId, orderid) {
        return get(this._client, `/customers/${extCustomerId}/orderinvoice/${orderid}`)
    }
    addKycDetails(data, loanId) {
        return post(this._client, `/loans/${loanId}/addkycdetails`, data)
    }

    createPaymentLinkRegular(data) {
        return post(this._client, `/orders/paymentlinks`, data)
    }
    createPaymentLinkEtf(data) {
        return post(this._client, `/etforders/paymentlinks`, data)
    }
    getPaymentLinkEtf(id) {
        return get(this._client, `/etforders/paymentlinks/${id}`,)
    }
    getPaymentLinkRegular(id) {
        return get(this._client, `/orders/paymentlinks/${id}`,)
    }
    cancelPaymentLinkEtf(id) {
        return _delete(this._client, `/etforders/paymentlinks/${id}`,)
    }
    cancelPaymentLinkRegular(id) {
        return _delete(this._client, `/orders/paymentlinks/${id}`,)
    }
    resendPaymentLinkEtf(id) {
        return post(this._client, `/etforders/paymentlinks/${id}/notify`,)
    }
    resendPaymentLinkRegular(id) {
        return post(this._client, `/etforders/paymentlinks/${id}/notify`,)
    }
    verifyBankDetails(data) {
        return post(this._client, `/verification/cstmrbankdetails`, data)
    }
    createEmandateLink(data,extCustomerId) {
        return post(this._client, `/customers/${extCustomerId}/emandate/createlink`, data)
    }
    cancelEmandateLink(id,extCustomerId) {
        return _delete(this._client, `/customers/${extCustomerId}/emandate/${id}`)
    }
    getEmandateLink(id,extCustomerId) {
        return get(this._client, `/customers/${extCustomerId}/emandate/${id}`)
    }
    resendEmandateLink(id,extCustomerId) {
        return post(this._client, `/customers/${extCustomerId}/emandate/${id}/notify`)
    }
    // emergency sell
    emergencySellCreate(extCustomerId, order) {
        return post(this._client, `/customers/${extCustomerId}/emergencysellorders`, order)

    }
    emergencySellGet(extCustomerId, orderid) {
        return get(this._client, `/customers/${extCustomerId}/emergencysellorders/${orderid}`)

    }
    emergencySellList(extCustomerId, queryParams) {
        const additionalParametrs = {
            queryParams: queryParams
        }
        return get(this._client, `/customers/${extCustomerId}/emergencysellorders`, additionalParametrs)
    }

    

    // jewellery sell
    jewelleryCreate(extCustomerId, order) {
        return post(this._client, `/customers/${extCustomerId}/jewelleryorders`, order)

    }
    jewelleryGet(extCustomerId, orderid) {
        return get(this._client, `/customers/${extCustomerId}/jewelleryorders/${orderid}`)

    }
    jewelleryList(extCustomerId, queryParams) {
        const additionalParametrs = {
            queryParams: queryParams
        }
        return get(this._client, `/customers/${extCustomerId}/jewelleryorders`, additionalParametrs)
    }
    inquiryJewellery(customerId, data) {
        return post(this._client, `/customers/${customerId}/goldtojewellery`, data)

    }
    applyLein(data){
        return post(this._client, `/liens`, data)

    }
    getLein(id){
        return get(this._client, `/liens/${id}`,)
    }
    addServiceChargePaymentDetail(id,data){
        return post(this._client, `/liens/${id}/addservicechargepayment`, data)

    }


}

exports.Client = async function (config) {
    return new Client(config);
}