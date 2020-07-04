const http = require('http');

class Task {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
    }

    sigh(seconds_per_game, game) {
        return new Promise(resolve => {
            const _movelist = game.variations.movelist.map(variation => variation.move).filter(move => !!move);
            const request = JSON.stringify({go_options: {totaltime: seconds_per_game * 1000}, game: _movelist});
            //const movelist = JSON.stringify(_movelist);
            const options = {
                timeout:  4 /* hours */ * 60 /* minutes */ * 60 /* seconds */ * 1000 /* ms */,
                host: this.ip,
                port: this.port,
                path: "/",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(request)
                }
            };
            const req = http.request(options, res => {
                let engine_response = "";
                res.setEncoding("utf-8");
                res.on("data", (data) => engine_response += data);
                res.on("end", () => {
                    // ... create the pgn file and the xml file
                    resolve(engine_response);
                });
            });
            req.write(request);
            req.end();
        });
    }

    async processgame(seconds_per_game, game, callback) {
        const engine_response = await this.sigh(seconds_per_game, game);
        await callback(engine_response);
    }
}

module.exports = Task;
