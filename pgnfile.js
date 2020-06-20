const fs = require("fs");
const Queue = require("sync-queue");
const Chess = require("chess.js").Chess;

class PGNFile {
    constructor(filename) {
        this.filename = filename;
        this.queue = new Queue();
    }

    writePart(part, callback) {
        fs.appendFile(this.filename, part, err => {
            if (err) console.log(err);
            this.queue.next();
            if (typeof callback === "function")
                callback();
        });
    }

    writeGame(tags, _game, callback) {
        const pgngame = [];
        let data = "";
        const chess = new Chess();

        Object.keys(tags).forEach(tag => data += "[" + tag + " \"" + tags[tag] + "\"]\n");
        data += "\n";

        let moveline = "";
        let white = 1;
        let moveno = 1;

        for(let x = 0 ; x < _game.length ; x++) {
            const nextmove = _game[x + 1];
            pgngame.push({
                move: _game[x].move,
                score_before_move: _game[x].lines[0].score * ( white ? 1 : -1),
                depth_before_move: _game[x].lines[0].depth,
                score_after_move: (nextmove ? -nextmove.lines[0].score : 0) * (white ? 1 : -1),
                depth_after_move: nextmove ? nextmove.lines[0].depth : 0,
                best_move: _game[x].lines[0].pv.split(" ")[0],
                blunder: _game[x].lines[0].score - (nextmove ? -nextmove.lines[0].score : 0) >= 100
            });
        }

        pgngame.forEach(move => {
            let prefix = "";
            if (white)
                prefix += moveno + ". ";
            else
                prefix += moveno + (white ? ". " : ". ... ");
            moveline += prefix;

            try {
                moveline += move.move + " ";
            } catch (e) {
                console.log(e);
            }

            moveline +=
                " {[%eval " + move.score_after_move + "," + move.depth_after_move + "]} ";
            if(move.blunder) {
                const temp_chess = new Chess(chess.fen());
                const cmove = temp_chess.move(move.best_move, {sloppy: true});
                moveline +=
                    " ({Stockfish 9 64:} " + prefix + " " + cmove.san + " {[%eval " + move.score_before_move + "," + move.depth_before_move + "]}) ";
            }
            if (moveline.length > 255) {
                const idx = moveline.lastIndexOf(" ");
                data += moveline.substr(0, idx) + "\n";
                moveline = moveline.substr(idx + 1);
            }
            white = (white === 0 ? 1 : 0);
            moveno += white;
            chess.move(move.move);
        });

        moveline += " " + tags.Result;

        if (moveline && moveline.length) {
            if (moveline.length > 255) {
                const idx = moveline.lastIndexOf(" ");
                data += moveline.substr(0, idx) + "\n";
                moveline = moveline.substr(idx + 1);
            }
            if (moveline.length)
                data += moveline;
        }
        data += "\n";
        this.writePart(data, callback);
    }

    endFile() {
    }

    replaceAll(str, mapObj) {
        const clone = {};
        Object.keys(mapObj).forEach(key => {
            clone["{" + key + "}"] = mapObj[key]
        });
        var re = new RegExp(Object.keys(clone).join("|"), "gi");
        return str.replace(re, function (matched) {
            return clone[matched.toLowerCase()];
        });
    }
}

module.exports = PGNFile;
