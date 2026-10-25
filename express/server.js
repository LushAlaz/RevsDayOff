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
const validPosition = (data) => validCoordinates(data) && directions.has(data.direction)
    && (data.sniffing === undefined || typeof data.sniffing === "boolean");
const mapSizes = { "kyle-field": [1440, 640], "aggie-park": [1920, 960], "drill-field": [1080, 480] };
function validCadets(value, room) {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 128) return false;
  const ids = new Set();
  const [width, height] = mapSizes[room];
  return value.every((row) => {
    if (!row || typeof row.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(row.id)
        || ids.has(row.id) || !validCoordinates(row) || !directions.has(row.direction)
        || typeof row.moving !== "boolean" || row.x < 32 || row.x > width - 32
        || row.y < 32 || row.y > height - 32) return false;
    ids.add(row.id);
    return true;
  });
}
const copyCadets = (data) => (data.cadets ?? []).map(({ id, x, y, direction, moving }) => ({ id, x, y, direction, moving }));
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
    if (!validRoom(room) || !validPosition(data) || !validCadets(data.cadets, room)) return;
    if (socket.data.roomId !== room) removePlayer();
    const player = rooms[room][socket.id] ??= { digging: false };
    player.cadets = copyCadets(data);
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;
    player.sniffing = data.sniffing === true && !player.digging;
    socket.data.roomId = room;
    socket.join(room);
    broadcastRoom(room);
  });
  
  socket.on('update_position', (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !validPosition(data) || !validCadets(data.cadets, room)) return;
    const player = rooms[room][socket.id];
    if (!player) return;
    player.cadets = copyCadets(data);
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;
    player.sniffing = data.sniffing === true && !player.digging;
    broadcastRoom(room);
  });

  socket.on('display_legendary_item_won', (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !rooms[room][socket.id] || typeof data?.item !== "string") return;
    const item = data.item;
    io.to(room).emit("display message", {room: "One player won a legendary item " + item});
  });

  socket.on('chomp', (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !rooms[room][socket.id] || !validCoordinates(data)) return;
    socket.broadcast.to(room).emit("chomp", {x: data.x, y: data.y});
  });

  socket.on("sniffing", (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !rooms[room][socket.id] || !validCoordinates(data)
        || typeof data.active !== "boolean") return;
    rooms[room][socket.id].digging = data.active;
    if (data.active) rooms[room][socket.id].sniffing = false;
    broadcastRoom(room);
    socket.broadcast.to(room).emit("sniffing", {id: socket.id, active: data.active, x: data.x, y: data.y});
  });

  socket.on("dug-up", (data) => {
    const room = socket.data.roomId;
    if (!validRoom(room) || !rooms[room][socket.id] || !validCoordinates(data)) return;
    if (rooms[room][socket.id].digging) {
      rooms[room][socket.id].digging = false;
      broadcastRoom(room);
    }
    socket.broadcast.to(room).emit("dug-up", {id: socket.id, x: data.x, y: data.y});
  });

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
