const axios = require('axios');
const crypto = require('crypto')

const ServiceType = {
    TheAltening: 0,
    McLeaks: 1,
    Cracked: 2,
    PWD: 3
}

exports.getAlt = function (service, token, cb) {
    if (service == ServiceType.TheAltening) {
        cb({
            name: token.replace("@alt.com", "")
        });
    } else if (service == ServiceType.McLeaks) {
        axios.post('https://auth.mcleaks.net/v1/redeem', {
            "token": token
        }).then((res) => {
            if (res.data.success) {
                cb({
                    name: res.data.result.mcname,
                    token: res.data.result.session
                });
            } else {
                console.log("Error: " + res.data.errorMessage);
                cb(null);
            }
        }).catch((error) => {
            console.error(error)
        });
    } else if(service == ServiceType.Cracked) {
        cb({
            name: token.substring(0, 16)
        });
    } else if(service == ServiceType.PWD) {
        cb({
            name: token
        });
    }
}

exports.joinMCLeaks = function (session, mcname, server, serverid, sharedsecret, serverkey, cb) {
    // Generate server hash
    var serverhash = mcHexDigest(crypto.createHash('sha1')
        .update(serverid)
        .update(sharedsecret)
        .update(serverkey)
        .digest());

    axios.post('https://auth.mcleaks.net/v1/joinserver', {
        "session": session,
        "mcname": mcname,
        "serverhash": serverhash,
        "server": server
    }).then((res) => {
        if (res.data.success) {
            console.log("MCLeaks joined success");
            cb(undefined, res.data);
        } else {
            console.log("Error: " + res.data.errorMessage);
            cb(res.data.errorMessage, res.data);
        }
    }).catch((error) => {
        console.error(error)
        cb(error, res.data);
    });
}

function mcHexDigest(hash, encoding) {
    if (!(hash instanceof Buffer)) { hash = new Buffer(hash, encoding) }
    var negative = hash.readInt8(0) < 0
    if (negative) performTwosCompliment(hash)
    var digest = hash.toString('hex')
    digest = digest.replace(/^0+/g, '')
    if (negative) digest = '-' + digest
    return digest
}

function performTwosCompliment(buffer) {
    var carry = true
    var i, newByte, value
    for (i = buffer.length - 1; i >= 0; --i) {
        value = buffer.readUInt8(i)
        newByte = ~value & 0xff
        if (carry) {
            carry = newByte === 0xff
            buffer.writeUInt8(carry ? 0 : (newByte + 1), i)
        } else {
            buffer.writeUInt8(newByte, i)
        }
    }
}

exports.validateTheAltening = function (token, cb) {
    axios.post('http://authserver.thealtening.com/authenticate', {
        "agent": {
            "name": "Minecraft",
            "version": 1
        },
        "username": token + "@alt.com",
        "password": "hunter2",
    }).then((res) => {
        cb(undefined, res.data);
    }).catch((error) => {
        console.error(error)
        cb(error, error);
    });
}

exports.joinTheAltening = function (accessToken, userid, server, serverid, sharedsecret, serverkey, cb) {
    // Generate server hash
    var serverhash = mcHexDigest(crypto.createHash('sha1')
        .update(serverid)
        .update(sharedsecret)
        .update(serverkey)
        .digest());

    axios.post('http://sessionserver.thealtening.com/session/minecraft/join', {
        "accessToken": accessToken,
        "selectedProfile": userid,
        "serverId": serverhash
    }).then((res) => {
        cb(undefined, res.data);
    }).catch((error) => {
        console.error(error)
        cb(error, error);
    });
}