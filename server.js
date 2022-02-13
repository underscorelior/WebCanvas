function dimensional_array(dimensions, default_value) {
    var array = [];
    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? default_value : dimensional_array(dimensions.slice(1), default_value));
    }
    return array;
}

var cfg = require('./config.json');

var DIM = cfg["dim"];
var pixels;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var ghpages = require('gh-pages');

var colors = ["#000000", "#FFFFFF", "#880000", "#AAFFEE", "#CC44CC", "#00CC55", "#4379F7", "#E6EE77", "#E87A38", "#422E06", "#F78D8D", "#575757", "#B5B5B5", "#90F043", "#00C3FF", "#DEDEDE"];

var ratelimits = {};

try {
    pixels = JSON.parse(fs.readFileSync(cfg["pixels_path"], "utf8"));
} catch (e) {
    pixels = dimensional_array([DIM[1], DIM[0]], cfg["default_color"]);
    console.log(e);
}


app.use(express.static(__dirname + '/./client'));


io.on('connection', function(socket) {
    console.log("[CONNECTION] Online: " + io.engine.clientsCount)
    socket.emit('init', pixels);
    socket.emit("users", io.engine.clientsCount);
    socket.on('set', function(p) {
        if (ratelimits[socket.handshake.address] && ((new Date()).getTime() - ratelimits[socket.handshake.address]) >= cfg["ratelimit"]) {
            ratelimits[socket.handshake.address] = (new Date()).getTime();
            try {
                if (p.y < DIM[1] && p.x < DIM[0] && p.y >= 0 && p.x >= 0 && Number.isInteger(p.c) && p.c >= 0 && p.c < colors.length) {
                    pixels[p.y][p.x] = p.c
                    io.emit('set', {
                        x: p.x,
                        y: p.y,
                        c: p.c
                    });
                }
            } catch (e) {}
        } else if (!ratelimits[socket.handshake.address]) {
            ratelimits[socket.handshake.address] = (new Date()).getTime();
            try {
                if (p.y < DIM[1] && p.x < DIM[0] && p.y >= 0 && p.x >= 0 && Number.isInteger(p.c) && p.c >= 0 && p.c < colors.length) {
                    pixels[p.y][p.x] = p.c
                    io.emit('set', {
                        x: p.x,
                        y: p.y,
                        c: p.c
                    });
                }
            } catch (e) {}
        }
    });
});

setInterval(function() {
    io.emit("init", pixels);
    io.emit("users", io.engine.clientsCount);
}, cfg["init_interval"]);

setInterval(function() {
    fs.writeFile(
        cfg["pixels_path"],
        JSON.stringify(pixels),
        function(err) {
            if (err) {}
        }
    );
}, cfg["save_interval"]);


http.listen(cfg["port"], cfg["host"], function() {
    console.log('[DEBUG] Listening on ' + cfg["host"] + ':' + cfg["port"]);
});
ghpages.publish('dist', function(err) {});
