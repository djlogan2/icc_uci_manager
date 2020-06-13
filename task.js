const http = require('http');

class Task {
    constructor(ip) {
        this.ip = ip;
    }

    processgame(moves, callback) {
        http.post("http://" + ip + ":3010")
    }
}
