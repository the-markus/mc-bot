var mineflayer = require('mineflayer');
var altservice = require('./altservice');
const { v4: uuidv4 } = require('uuid');

const ServiceType = {
    TheAltening: 0,
    McLeaks: 1,
    Cracked: 2,
    PWD: 3
}

var config = { bots: [] };
var ct = uuidv4().split("-").join("");

console.log(" _____ ______   ________                ________  ________  _________   ");
console.log("|\\   _ \\  _   \\|\\   ____\\              |\\   __  \\|\\   __  \\|\\___   ___\\ ");
console.log("\\ \\  \\\\\\__\\ \\  \\ \\  \\___|  ____________\\ \\  \\|\\ /\\ \\  \\|\\  \\|___ \\  \\_| ");
console.log(" \\ \\  \\\\|__| \\  \\ \\  \\    |\\____________\\ \\   __  \\ \\  \\\\\\  \\   \\ \\  \\  ");
console.log("  \\ \\  \\    \\ \\  \\ \\  \\___\\|____________|\\ \\  \\|\\  \\ \\  \\\\\\  \\   \\ \\  \\ ");
console.log("   \\ \\__\\    \\ \\__\\ \\_______\\             \\ \\_______\\ \\_______\\   \\ \\__\\");
console.log("    \\|__|     \\|__|\\|_______|              \\|_______|\\|_______|    \\|__|");
console.log("                                                                        ");
console.log("                                                                        ");
console.log("Starting MC-BOT...");
console.log("Welcome! Please enter the required fields:");

const prompt = require('prompt');
prompt.message = "";
prompt.delimiter = ">";

var schema = {
    properties: {
        host: {
            description: 'Enter the host',
            message: 'Host is required',
            type: 'string',
            default: "localhost"
        },
        port: {
            description: 'Enter the port',
            message: 'Port must be a number',
            type: 'integer',
            default: 25565
        },
        number_of_bots: {
            description: 'How many bots?',
            message: 'Must be a number',
            type: 'integer',
            minimum: 1,
            default: 1
        },
        altservice: {
            description: 'What alt service? [TheAltening=0/McLeaks=1/Cracked=2/PWD=3]',
            message: 'Must be a number between 0 and 3',
            type: 'integer',
            minimum: 0,
            maximum: 3,
            default: 0
        }
    }
};

prompt.start();

prompt.get(schema, function (err, result) {
    if (err) { return console.error(err); }
    config.host = result.host;
    config.port = result.port;
    config.number_of_bots = result.number_of_bots;
    config.altservice = result.altservice;


    console.log("Starting bots...");
    startbots();
});

function startbots() {

    var i = config.bots.length;

    var altq = {
        properties: {
            botalt: {
                description: "Alt token for bot #" + i,
                message: "Token is required!",
                required: true,
                type: "string"
            }
        }
    }

    if (config.altservice == ServiceType.Cracked || config.altservice == ServiceType.PWD) {
        altq.properties.botalt.description = "Name of bot #" + i;
        altq.properties.botalt.message = "Name is required!";
    }

    if (config.altservice == ServiceType.PWD) {
        altq.properties.botpw = {
            description: "Password for bot #" + i,
            message: "Password is required!",
            required: true,
            type: "string",
            hidden: true,
            replace: '*'
        }
    }


    prompt.get(altq, function (err, result) {
        if (err) { return console.error(err); }

        console.log(`Getting account for bot #${i}...`);

        altservice.getAlt(config.altservice, result.botalt, function (alt) {

            if (alt == null) {
                console.log("Alt not valid");
                return;
            }

            var options = {
                host: config.host,
                port: config.port,
                username: alt.name,
                mcleaks: false,
                thealtening: false
            };

            if (config.altservice == ServiceType.McLeaks) {
                options.mcleaks = true;
                options.session = {
                    accessToken: alt.token,
                    selectedProfile: {
                        name: alt.name
                    }
                }
            } else if (config.altservice == ServiceType.TheAltening) {
                options.thealtening = true;
                options.session = {
                    accessToken: alt.name,
                    selectedProfile: {
                        name: alt.name
                    }
                }
            } else if (config.altservice == ServiceType.PWD) {
                options.password = result.botpw;
            }

            var bot = mineflayer.createBot(options);
            bindevents(bot, options, i, alt);
            config.bots.push(bot);
        });
    });
}

function bindevents(bot, options, i, alt) {
    if (i == 0) {
        bot.on('chat', function (username, message) {
            if (username === bot.username) return;
            console.log(`${username}: ${message}`);
        });
    }

    bot.on('login', function () {
        console.log(`Bot ${bot.username} logged in`);

        if (config.bots.length < config.number_of_bots) {
            startbots();
        } else {
            listenForCommands();
        }
    });

    bot.on('kicked', function (reason, loggedin) {
        console.log(`Bot ${bot.username} was kicked because of ${reason}`);
        if (JSON.parse(reason).translate != undefined) {
            console.log("Seems like the bot cannot join the server, aborting.");
            return;
        }
        console.log(`Reconnecting bot ${bot.username}...`);
        bot = mineflayer.createBot(options);
        bindevents(bot, options, i);
    });

    bot.on('error', err => console.log("Error on " + bot.username + ": " + err));
}

process.on("SIGINT", function () {
    process.exit();
});

process.on('exit', function (code) {
    console.log("Exiting, stopping bots...");
    config.bots.forEach(bot => {
        bot.end();
    });
});

function listenForCommands() {
    prompt.get([' '], function (err, result) {
        if (err) { return console.error(err); }
        var cmd = result[' '].split(' ')[0];
        var args = result[' '].split(' ').splice(1, result[' '].length - 1);
        switch (cmd) {
            case "help":
                console.log("Commands:");
                console.log("   -help: Displays help");
                console.log("   -stop: Stops all bots");
                console.log("   -say: Let them bots speak");
                break;
            case "say":
                if(args.length > 0) {
                    config.bots.forEach(bot => {
                        bot.chat(args.join(" "));
                    });
                } else {
                    console.log("Usage: say <msg>")
                }
                
                break;
            case "stop":
                process.exit();
            default:
                console.log("Command not found. Type \"help\" for help");
                break;
        }
        listenForCommands();
    });
}