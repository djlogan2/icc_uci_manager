const Amazon = require('./amazon');
const Parser = require("./parser");
const fs = require("fs");

// fs.readFile("/Users/davidlogan/workspace/icc/pgns/djlogan.pgn", (err, data) => {
//     const parser = new Parser();
//     parser.feed(data.toString());
//     const movelist = parser.gamelist.map(game => {
//         return game.variations.movelist.map(variation => variation.move).filter(move => !!move);
//     });
//     console.log(movelist);
// });

const amazon = new Amazon();
amazon.setSpotInstanceCount(0)
  .then(() => amazon.shutdown());
//process.exit(0);
// amazon.createStockfishTasks(2)
//     .then(() => console.log("here"))
//     .then(() => amazon.shutdown())
//     .then(() => console.log("end!"));

