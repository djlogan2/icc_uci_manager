const Amazon = require('./amazon');
const Parser = require("./parser");
const XMLFile = require("./xmlfile");
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

let active_tasks = 0;
let taskArray;
let games;
const xmlfile = new XMLFile("xmlfile.xml");
const amazon = new Amazon();

async function getGames() {
    return new Promise(resolve => {
        fs.readFile("/Users/davidlogan/workspace/icc/pgns/djlogan.pgn", (err, data) => {
            const parser = new Parser();
            parser.feed(data.toString());
            games = parser.gamelist;
            resolve(games);
        });
    });
}

async function getAmazonReady() {
    console.log("Starting up Amazon");
    const taskArray = await amazon.createStockfishTasks(games.length);
    return taskArray;
}

async function shutdownAmazon() {
    console.log("Shutting down amazon");
    amazon.setSpotInstanceCount(0);
}

async function getNextAvailableGame() {
    return new Promise(resolve => {
        console.log("Trying to get next game");
        sem.take(() => {
            const game = games.pop();
            sem.leave();
            console.log("Next game being returned");
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
    return Promise.resolve();
}

async function handleGameResult(tags, game_result) {
    console.log("Writing XML file for completed game");
    await writeXMLFile(tags, game_result);
    console.log("Writing PGN file for completed game");
    await writePGNFile(tags, game_result);
    console.log("Getting next available game");
    const game = await getNextAvailableGame();
    if(!game) {
        console.log("Tasks are dwindling, current=" + active_tasks);
        if(--active_tasks) {
            console.log("All tasks complete, shutting down");
            xmlfile.endFile();
            await shutdownAmazon();
        }
    } else {
        console.log("Setting task on doing next game");
        return game;
    }
}

async function doit() {
    console.log("Loading games");
    games = await getGames();
    console.log("Loaded " + games.length + " games, starting amazon");
    taskArray = await getAmazonReady();
    console.log("Amazon started with " + taskArray.length + " tasks");
    active_tasks = taskArray.length;
    for (let x = 0; x < taskArray.length; x++) {
        const game = await getNextAvailableGame();
        console.log("Starting new game on task");
        taskArray[x].processgame(game, game_result => handleGameResult(game.tags, JSON.parse(game_result)));
    }
}

//amazon.setSpotInstanceCount(0);
doit();
