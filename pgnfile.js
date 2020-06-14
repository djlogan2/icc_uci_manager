const fs = require("fs");
const Queue = require("sync-queue");

class PGNFile {
    constructor(filename) {
        this.filename = filename;
        this.queue = new Queue();
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
        let data = "";

        Object.keys(tags).forEach(tag => data += "[" + tag + " \"" + tags[tag] + "\"]\n");
        data += "\n";

        let moveline = "";
        let white = 1;
        let moveno = 1;
        game.forEach(move => {
            if(white)
                moveline += moveno + ". ";
            moveline += move.move + " {" + move.lines[0].score + " " + move.lines[move.lines.length - 1].score + "/" + move.lines[0].depth + "} ";
            if(moveline.length > 255) {
                const idx = moveline.lastIndexOf(" ");
                data += moveline.substr(0, idx) + "\n";
                moveline = moveline.substr(idx + 1);
            }
            white = (white === 0 ? 1 : 0);
            moveno += white;
        });
        if(moveline && moveline.length) {
            if(moveline.length > 255) {
                const idx = moveline.lastIndexOf(" ");
                data += moveline.substr(0, idx) + "\n";
                moveline = moveline.substr(idx + 1);
            }
            if(moveline.length)
                data += moveline;
        }
        data += "\n";
        this.writePart(data, callback);
    }

    endFile() {
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

module.exports = PGNFile;
