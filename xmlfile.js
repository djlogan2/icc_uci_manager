const fs = require("fs");
const Queue = require("sync-queue");

class XMLFile {
    constructor(filename) {
        this.filename = filename;
        this.queue = new Queue();
        this.writePart(xmlstart);
    }

    writePart(part, callback) {
        fs.appendFile(this.filename, part, err => {
            if(err) console.log(err);
            this.queue.next();
            if(typeof callback === "function")
                callback();
        });
    }

    writeGame(tags, game, callback) {
        let data = this.replaceAll(xmlgamestart, {"event": tags.Event, "date": tags.Date, "white": tags.White, "black": tags.Black, "result": tags.Result, "time_control": tags.TimeControl});
        let white = 1;
        for(let x = 0 ; x < game.length ; x++) {
            let idx = game[x].lines.findIndex(line => line.pv.split(" ")[0] === game[x].alg);
            if(idx === -1) {
                const nextline = game[x + 1] ? {...game[x + 1].lines[0]} : null;
                if (nextline) {
                    nextline.pv = game[x].alg;
                    nextline.score *= -1;
                    game[x].lines.push(nextline);
                } else {
                    game[x].lines.push({pv: game[x].alg, score: 0, depth: 0, time: 0, nps: 0, multipv: 0, nodes: 0});
                }
            }
        }

        game.forEach(move => {
            let idx = move.lines.findIndex(line => line.pv.split(" ")[0] === move.alg);
            if(idx === -1)
                idx = move.lines.length;
            else
                idx++;
            data += this.replaceAll(xmlmovestart, {"white": white, "played": idx});
            move.lines.forEach(line => {
                data += this.replaceAll(xmlpvstart, {san: line.pv.split(" ")[0], depth: line.depth, time: line.time, score: line.score});
                data += xmlpvend;
            });
            if(idx === move.lines.length) {
                data += this.replaceAll(xmlpvstart, {san: move.alg, depth: 0, time: 0, score: 0});
                data += xmlpvend;
            }
            data += xmlmoveend;
            white = (white === 0 ? 1 : 0);
        });
        data += xmlgameend;
        this.writePart(data, callback);
        white = (white === 0 ? 1 : 0);
    }

    endFile() {
        return new Promise(resolve => this.writePart(xmlend, resolve));
    }

    replaceAll(str,mapObj){
        const clone = {};
        Object.keys(mapObj).forEach(key => {clone["{" + key + "}"] = mapObj[key]});
        var re = new RegExp(Object.keys(clone).join("|"),"gi");
        return str.replace(re, function(matched){
            return clone[matched.toLowerCase()];
        });
    }
}

module.exports = XMLFile;

const xmlstart =
    "<Games>" +
    "<EngineSettings>" +
    "<EnginePath>xxx</EnginePath>" +
    "<NumVariations>4</NumVariations>" +
    "<SearchDepth>4</SearchDepth>" +
    "<MinTime>4</MinTime>" +
    "<MaxTime>4</MaxTime>" +
    "<HashSize>4</HashSize>" +
    "<BookDepth>4</BookDepth>" +
    "<PlayerName/>" +
    "</EngineSettings>";
const xmlgamestart =
    "<Game>" +
    "<Event>{event}</Event>" +
    "<Date>{date}</Date>" +
    "<White>{white}</White>" +
    "<Black>{black}</Black>" +
    "<Result>{result}</Result>" +
    "<TimeControl>{time_control}</TimeControl>" +
    "<Positions>";
const xmlmovestart =
    "<Position>" +
    "<White>{white}</White>" +
    "<MovePlayed>{played}</MovePlayed>" +
    "<Moves>";
const xmlpvstart =
    "<Move>" +
    "<Move>{san}</Move>" +
    "<Depth>{depth}</Depth>" +
    "<Time>{time}</Time>" +
    "<Score>{score}</Score>" +
    "</Move>";
const xmlpvend = "";
const xmlmoveend =
    "</Moves>" +
    "</Position>";
const xmlgameend =
    "</Positions>" +
    "</Game>";
const xmlend =
    "</Games>";
