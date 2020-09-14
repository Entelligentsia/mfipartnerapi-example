const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWSCognito = require("amazon-cognito-identity-js");
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const apigClientFactory = require("aws-api-gateway-client").default;
const AWS = require('aws-sdk');
global.fetch = require('node-fetch');

const STAGE = "test"; // ideally to be read from an environment variable.
const config = require("../config/credentials.js").config;

const poolData = {
    UserPoolId: config.userPool,
    ClientId: config.appClient
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);


function authenticate(callback) {

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
            const _accesstoken = result.getAccessToken();
            callback(null,{
                idToken: result.getIdToken().getJwtToken(),
                accessToken: _accesstoken ? _accesstoken.getJwtToken() : null,
                validity_seconds: _accesstoken.getExpiration() - _accesstoken.getIssuedAt()
            });
        },
        onFailure: function (err) {
            console.log(err.message ? err.message : err);
            callback(err,null);
        },
        newPasswordRequired: function () {
            console.log("Given user needs to set a new password");
            callback("Given user needs to set a new password",null);
        },
        mfaRequired: function () {
            console.log("MFA is not currently supported");
            callback("MFA is not currently supported",null);
        },
        customChallenge: function () {
            console.log("Custom challenge is not currently supported");
            callback("Custom challenge is not currently supported",null);
        }
    });
}

function getCredentials(userTokens, callback) {
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
            callback(err,null)
            return;
        }
        callback(null,userTokens);
    });
}

exports.authenticateClient = function (callback) {
    authenticate(function (err,tokens) {
        if(err){
            callback(err,null);
            return;
        }
        getCredentials(tokens, function (err,_tokens) {
            if(err){
                callback(err,null);
                return;
            }
            var credentials = AWS.config.credentials;
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

exports.authenticateClientAsync = async function(){
    return new Promise((resolve,reject)=>{
        try{
            exports.authenticateClient(function(err,client){
                if(err || !client){
                    reject(err ? err : "Unable to authenticate");
                }
                else{
                    resolve(client);
                }
            })
        }
        catch(e){
            reject(e);
        }
    })
}