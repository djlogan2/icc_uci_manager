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
        game.forEach(move => {
            let idx = move.lines.findIndex(line => line.pv.split(" ")[0] === move.alg);
            if(idx === -1)
                idx = 0;
            else
                idx++;
            data += this.replaceAll(xmlmovestart, {"white": white, "played": idx});
            move.lines.forEach(line => {
                data += this.replaceAll(xmlpvstart, {san: line.pv.split(" ")[0], depth: line.depth, time: line.time, score: line.score});
                data += xmlpvend;
            });
            data += xmlmoveend;
        });
        data += xmlgameend;
        this.writePart(data, callback);
        white = (white === 0 ? 1 : 0);
    }

    endFile() {
        this.writePart(xmlend);
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
    "<NumVariations>999</NumVariations>" +
    "<SearchDepth>999</SearchDepth>" +
    "<MinTime>9999</MinTime>" +
    "<MaxTime>9999</MaxTime>" +
    "<HashSize>999</HashSize>" +
    "<BookDepth>999</BookDepth>" +
    "<PlayerName>{playername}</PlayerName>" +
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
