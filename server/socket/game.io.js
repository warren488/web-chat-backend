module.exports = function(io, available) {
    const gameServer = io.of("/game");
    gameServer.on("connect", function(socket) {
        socket.send("welcome");
        socket.on("bottomPos", data => {
            gameServer.emit("bottomPos", data);
        });
        socket.on("topPos", data => {
            gameServer.emit("topPos", data);
        });
        socket.on("start", (data, cb) => {
            if (available.bottom.free) {
                console.log("bottom");
                available.bottom.free = false;
                available.bottom.socket = socket.id;
                return cb("bottom");
            } else if (available.top.free) {
                console.log("top");
                available.top.free = false;
                available.top.socket = socket.id;
                return cb("top");
            }
        });
    });
    gameServer.on("disconnecting", function (socket) {
        if(available.bottom.socket === socket.id){
            available.bottom.socket = null
            available.bottom.free = true
        }
        if(available.top.socket === socket.id){
            available.top.socket = null
            available.top.free = true
        }
    });
};
