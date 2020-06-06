/**
 * @file This file is the main entrypoint and manages all the server setup
 * as well as the routes
 * @author Warren Scantlebury
 * @namespace Server
 */

const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const apiRouter = require("./api");
const ioActionsRouter = require("./api/socket");
const attachListeners = require("./socket/chat.io");
const attachGameListeners = require("./socket/game.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
require("./db");
const app = express();

app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(cookieParser());
app.use(cors());
app.use(morgan('combined'));

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIO(server);
global.io = io;
let status = { attached: false };
const activeUsers = {};
attachListeners(io, activeUsers, status);

/** GAME STUFF */
const available = {
  top: {free: true, socket: null},
  bottom: {free: true, socket: null}
}
attachGameListeners(io, available);

app.use("/api", apiRouter(io));
app.use("/io", ioActionsRouter(io));

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
