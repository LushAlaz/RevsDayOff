// Import the express library
const express = require('express');
const cors = require("cors");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

// node --watch server.js
// node --watch --env-file=.env.local server.js
const allowedOrigins = [
  process.env.NEXT_PUBLIC_NETWORK_CLIENT_DOMAIN,
  process.env.NEXT_PUBLIC_NETWORK_SERVER_DOMAIN,
];
const PORT = process.env.PORT || 3001;

// Initialize the Express and Socket.io application instance
const app = express();
const server = createServer(app);
app.use(cors({origin: allowedOrigins})); app.use(express.json({limit: "100kb"})); app.use(express.urlencoded({extended: true, limit: "100kb"}));
const io = new Server(server, {cors: {origin: allowedOrigins, methods: ["GET", "POST"]}, maxHttpBufferSize: 100_000});

const rooms = {
  "kyle-field": Object.create(null),
  "drill-field": Object.create(null),
  "aggie-park": Object.create(null),
};
const directions = new Set(["up", "down", "left", "right"]);
const validRoom = (room) => typeof room === "string" && Object.hasOwn(rooms, room);
const validCoordinates = (data) => data && Number.isFinite(data.x) && Number.isFinite(data.y);
const validPosition = (data) => validCoordinates(data) && directions.has(data.direction);
const broadcastRoom = (room) => io.to(room).emit("update_data", {room: rooms[room]});

//socket
io.on('connection', (socket) => {
  function removePlayer() {
    const room = socket.data.roomId;
    if (!validRoom(room)) return;
    delete rooms[room][socket.id];
    socket.leave(room);
    delete socket.data.roomId;
    broadcastRoom(room);
  }

  socket.on('join_room', (data) => {
    const room = data?.room;
    if (!validRoom(room) || !validPosition(data)) return;
    if (socket.data.roomId !== room) removePlayer();
    const player = rooms[room][socket.id] ??= {};
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;
    socket.data.roomId = room;
    socket.join(room);
    broadcastRoom(room);
  });
  
  socket.on('update_position', (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !validPosition(data)) return;
    const player = rooms[room][socket.id];
    if (!player) return;
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;
    broadcastRoom(room);
  });

  socket.on('display_legendary_item_won', (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !rooms[room][socket.id] || typeof data?.item !== "string") return;
    const item = data.item;
    io.to(room).emit("display message", {room: "One player won a legendary item " + item});
  })

  socket.on('chomp', (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !rooms[room][socket.id] || !validCoordinates(data)) return;
    socket.broadcast.to(room).emit("chomp", {x: data.x, y: data.y});
  })

  socket.on("sniffing", (data) => {
    
  })
  socket.on('disconnect', removePlayer);
});

// express
app.get('/', async (req, res) => {
    res.json({ message: "Server Healthy"})
});

app.get('/greetings', (req, res) => {
    res.send('Hello');
});

app.get('/data', (req, res) => {
    res.json({rooms: rooms});
})

// Start the server and listen for incoming requests
if (require.main === module) server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});

// Import without binding a port for protocol tests; CLI startup is unchanged.
module.exports = { app, server, io, rooms };

//normally we do app.listen(), however app.listen creates the server and runs it. however we already created
//a server for websockets. if we do app.listen(), it won't run that server and will instead create and
//run a different one
