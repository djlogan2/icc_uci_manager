const http = require('http');

class Task {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
    }

    sigh(game) {
        return new Promise(resolve => {
            const _movelist = game.variations.movelist.map(variation => variation.move).filter(move => !!move);
            const movelist = JSON.stringify(_movelist);
            const options = {
                timeout:  60 /* minutes */ * 60 /* seconds */ * 1000 /* ms */,
                host: this.ip,
                port: this.port,
                path: "/",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(movelist)
                }
            };
            const req = http.request(options, res => {
                let engine_response = "";
                res.setEncoding("utf-8");
                res.on("data", (data) => engine_response += data);
                res.on("end", () => {
                    console.log(engine_response);
                    // ... create the pgn file and the xml file
                    resolve(engine_response);
                });
            });
            req.write(movelist);
            req.end();
        });
    }

    async processgame(firstgame, callback) {
        let game = firstgame;
        do {
            const engine_response = await this.sigh(game);
            game = await callback(engine_response);
        } while(!!game);
    }
}

module.exports = Task;
