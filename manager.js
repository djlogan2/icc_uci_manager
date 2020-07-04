const Amazon = require('./amazon');
const Parser = require("./parser");
const XMLFile = require("./xmlfile");
const PGNFile = require("./pgnfile");
const Task = require("./task");
const fs = require("fs");
const sem = require("semaphore")(1);

// read file to get # of games
// get amazon ready
// get array of tasks
// set each one on its way, each with a callback
//   in the callback
//   write the file(s)
//   sem get next game
//   if next game, return it
//   if no next game, start decrementing active tasks
//   if active tasks == 0, shutdown amazon

const pgn_filename = process.argv[2];

const local_test = process.env.LOCALTEST === "true";
const seconds_per_move = !!process.env.SPM ? parseInt(process.env.SPM) : 10;
const multipv = !!process.env.MPV ? parseInt(process.env.MPV) : 4;
let active_tasks = 0;
let taskArray;
let games;
const xmlfile = new XMLFile(pgn_filename + "-analyzed.xml");
const pgnfile = new PGNFile(pgn_filename + "-analyzed.pgn");
let amazon;// = new Amazon();

async function getGames() {
    return new Promise(resolve => {
        fs.readFile(pgn_filename, (err, data) => {
            const parser = new Parser();
            parser.feed(data.toString());
            games = parser.gamelist;
            for(let x = 0 ; x < games.length ; x++)
                games[x].tags["OrigIndex"] = x;
            resolve(games);
        });
    });
}

async function getAmazonReady() {
    if(local_test) {
        console.log("Local test");
        const task = new Task("127.0.0.1", "1234");
        return [task];
    } else {
        console.log("Starting up Amazon");
        amazon = new Amazon();
        return await amazon.createStockfishTasks(games.length);
    }
}

async function shutdownAmazon() {
    if(!local_test) {
        console.log("Shutting down amazon");
        await amazon.setSpotInstanceCount(0);
        return amazon.shutdown();
    } else
        return Promise.resolve();
}

async function getNextAvailableGame() {
    return new Promise(resolve => {
        console.log("Trying to get next game");
        sem.take(() => {
            const game = games.pop();
            sem.leave();
            if(!!game)
                console.log("Next game being returned, OrigIndex=" + game.tags.OrigIndex);
            resolve(game);
        });
    });
}

async function writeXMLFile(tags, game_result) {
    return new Promise(resolve => {
        console.log("Writing XML for game");
        xmlfile.writeGame(tags, game_result, () => {
            console.log("XML for game written");
            resolve();
        });
    });
}

async function writePGNFile(tags, game_result) {
    console.log("Writing pgn for game");
    return new Promise(resolve => {
        console.log("Writing PGN for game");
        pgnfile.writeGame(tags, game_result, () => {
            console.log("PGN for game written");
            resolve();
        });
    });
}

async function handleGameResult(tags, game_result) {
    console.log("Writing XML file for completed game, OrigIndex=" + tags.OrigIndex);
    await writeXMLFile(tags, game_result);
    console.log("Writing PGN file for completed game, OrigIndex=" + tags.OrigIndex);
    await writePGNFile(tags, game_result);
}

async function doit() {
    console.log("Loading games");
    games = await getGames();
    console.log("Loaded " + games.length + " games, starting amazon");
    taskArray = await getAmazonReady();
    console.log("Amazon started with " + taskArray.length + " tasks");
    active_tasks = taskArray.length;

    const really = async function(task) {
        let nextgame = await getNextAvailableGame();
        while(!!nextgame) {
            console.log("Starting new game on task: OrigIndex=" + nextgame.tags.OrigIndex);
            await task.processgame(seconds_per_move, multipv, nextgame, game_result => handleGameResult(nextgame.tags, JSON.parse(game_result)));
            console.log("Getting next available game");
            nextgame = await getNextAvailableGame();
            if (!nextgame) {
                active_tasks--;
                console.log("Tasks are dwindling, current=" + active_tasks);
                if (active_tasks === 0)
                    console.log("All tasks complete");
            }
        }
    };

    const promises = [];

    for (let x = 0; x < taskArray.length; x++)
        promises.push(really(taskArray[x]));

    await Promise.all(promises);
    console.log("No more games");
}

//(new Amazon()).setSpotInstanceCount(0);
doit()
    .then(() => xmlfile.endFile())
    .then(() => shutdownAmazon());
