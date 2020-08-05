var mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalNear } = require('mineflayer-pathfinder').goals;
var altservice = require('./altservice');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
var colors = require('colors');

const ServiceType = {
    TheAltening: 0,
    McLeaks: 1,
    Cracked: 2,
    PWD: 3
}

var disconnected = [];
var config = { bots: [] };
var ct = uuidv4().split("-").join("");

console.log(" _____ ______   ________                ________  ________  _________   ".rainbow);
console.log("|\\   _ \\  _   \\|\\   ____\\              |\\   __  \\|\\   __  \\|\\___   ___\\ ".rainbow);
console.log("\\ \\  \\\\\\__\\ \\  \\ \\  \\___|  ____________\\ \\  \\|\\ /\\ \\  \\|\\  \\|___ \\  \\_| ".rainbow);
console.log(" \\ \\  \\\\|__| \\  \\ \\  \\    |\\____________\\ \\   __  \\ \\  \\\\\\  \\   \\ \\  \\  ".rainbow);
console.log("  \\ \\  \\    \\ \\  \\ \\  \\___\\|____________|\\ \\  \\|\\  \\ \\  \\\\\\  \\   \\ \\  \\ ".rainbow);
console.log("   \\ \\__\\    \\ \\__\\ \\_______\\             \\ \\_______\\ \\_______\\   \\ \\__\\".rainbow);
console.log("    \\|__|     \\|__|\\|_______|              \\|_______|\\|_______|    \\|__|".rainbow);
console.log("                                                                        ".rainbow);
console.log("                                                                        ");
console.log("Starting MC-BOT...");
console.log("Welcome! Please enter the required fields:");

var rl = null;

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
            bindevents(bot, options, i);
            config.bots.push({ options: options, bot: bot });
        });
    });
}

function bindevents(bot, options, i) {
    bot.loadPlugin(pathfinder);

    bot.on('chat', function (username, message) {
        if (username === bot.username) return;
        var index = config.bots.findIndex(w => w.bot.username == bot.username);
        if (index == 0) {
            console.log(`${username}: ${message}`);
        } else if (disconnected.includes(config.bots[index - 1].bot.username)) {
            console.log(`${username}: ${message}`);
        }
    });

    bot.on('login', function () {
        console.log(`Bot ${bot.username} logged in`);

        if (disconnected.includes(bot.username)) {
            disconnected.splice(disconnected.indexOf(bot.username), 1);
        }

        if (config.bots.length < config.number_of_bots) {
            startbots();
        } else {
            listenForCommands();
        }
    });

    bot.on('kicked', function (reason, loggedin) {
        if (!disconnected.includes(bot.username)) {
            disconnected.push(bot.username);
        }
        console.log(`Bot ${bot.username} was kicked because of ${reason}`);
        if (JSON.parse(reason).translate != undefined) {
            console.log("Seems like the bot cannot join the server, aborting.");
            return;
        } else if (JSON.parse(reason).text != undefined) {
            if (reason.includes("ban")) {
                console.log("Seems like the bot got banned, you can manually reconnect with \"reconnect\"");
                return;
            }
        }
        console.log(`Reconnecting bot ${bot.username} in 10 seconds...`);
        setTimeout(() => {
            disconnected.splice(disconnected.indexOf(bot.username), 1);
            bot = mineflayer.createBot(options);
            bindevents(bot, options, i);
        }, 10000);
    });

    bot.on('error', err => console.log("Error on " + bot.username + ": " + err));
}

process.on("SIGINT", function () {
    process.exit();
});

process.on('exit', function (code) {
    console.log("Exiting, stopping bots...");
    config.bots.forEach(wrap => {
        wrap.bot.end();
    });
});

function listenForCommands() {

    if (rl == null) {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    rl.question('> '.gray, (answer) => {
        var args = answer.split(' ');
        var cmd = args[0];
        args.splice(0, 1);
        switch (cmd) {
            case "help":
                console.log("Commands:");
                console.log("   -help: Displays help");
                console.log("   -stop: Stops all bots");
                console.log("   -say <msg/cmd>: Let them bots speak");
                console.log("   -botsay <#> <msg/cmd>: Let one bot speak");
                console.log("   -reconnect [#]: Manually reconnect all/one bot(s)");
                console.log("   -goto [#] <player>: Let one/all bot(s) go to player");
                console.log("   -new: Create new bot");
                console.log("   -list: List all bots");
                break;
            case "say":
                if (args.length > 0) {
                    config.bots.forEach(wrap => {
                        wrap.bot.chat(args.join(" "));
                    });
                } else {
                    console.log("Usage: say <msg/cmd>");
                }
                break;
            case "botsay":
                if (args.length > 1) {
                    if (parseInt(args[0]) >= config.bots.length) {
                        console.log("Bot not found");
                        break;
                    }
                    config.bots[parseInt(args[0])].bot.chat(args.slice(1, args.length).join(" "));
                } else {
                    console.log("Usage: botsay <#> <msg/cmd>");
                }
                break;
            case "reconnect":
                if (args.length == 0) {
                    config.bots.forEach(wrap => {
                        if (disconnected.includes(wrap.bot.username)) {
                            console.log(`Reconnecting bot ${wrap.bot.username}...`);
                            wrap.bot = mineflayer.createBot(wrap.bot.options);
                            bindevents(wrap.bot, wrap.bot.options, i);
                        }
                    });
                } else if (args.length == 1) {
                    if (parseInt(args[0]) >= config.bots.length) {
                        console.log("Bot not found");
                        break;
                    }
                    var wrap = config.bots[parseInt(args[0])];
                    wrap.bot.end();
                    wrap.bot = mineflayer.createBot(wrap.options);
                    bindevents(wrap.bot, wrap.options, parseInt(args[0]));
                } else {
                    console.log("Usage: reconnect [#]");
                }
                break;
            case "list":
                for (let i = 0; i < config.bots.length; i++) {
                    console.log("#" + i + ": " + config.bots[i].bot.username);
                }
                break;
            case "goto":
                if(args.length == 1) {
                    var name = args[0];
                    for (let i = 0; i < config.bots.length; i++) {
                        var b = config.bots[i].bot;
                        const mcData = require('minecraft-data')(b.version);
                        const defaultMove = new Movements(b, mcData)
                        if(name == b.username) return;

                        const target = b.players[name] ? b.players[name].entity : null;
                        if(!target) {
                            console.log(`Bot ${b.username} cannot see player ${name} on the map`);
                        } else {
                            const p = target.position;
                            b.pathfinder.setMovements(defaultMove);
                            b.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1));
                        }
                    }
                } else if(args.length == 2) {
                    if (parseInt(args[0]) >= config.bots.length) {
                        console.log("Bot not found");
                        break;
                    }
                    var b = config.bots[parseInt(args[0])].bot;
                    var name = args[1];
                    const mcData = require('minecraft-data')(b.version);
                    const defaultMove = new Movements(b, mcData)
                    if(name == b.username) return;

                    const target = b.players[name] ? b.players[name].entity : null;
                    if(!target) {
                        console.log(`Bot ${b.username} cannot see player ${name} on the map`);
                    } else {
                        const p = target.position;
                        b.pathfinder.setMovements(defaultMove);
                        b.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1));
                    }
                } else {
                    console.log("Usage: goto [#] <player>");
                }
                break;
            case "new":
                rl.close();
                rl = null;
                config.number_of_bots++;
                startbots();
                return;
            case "secret":
                console.log("You are not ready for the secret".trap);
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