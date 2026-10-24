// Import the express library
const express = require('express');
const cors = require("cors");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { match } = require('node:assert');

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

const matchmaking = [];
const roomMatchMaking = {};
const gameData = {};

//socket
io.on('connection', (socket) => {
  
  socket.on('pass', (data) => {
    io.to(socket.data.roomId).emit("update_data", {currentGame: currentGame});
  });
  
});

// express
app.get('/', async (req, res) => {
    res.json({ message: "Server Healthy"})
});

app.get('/greetings', (req, res) => {
    res.send('Hello');
});

// Start the server and listen for incoming requests
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});

//normally we do app.listen(), however app.listen creates the server and runs it. however we already created
//a server for websockets. if we do app.listen(), it won't run that server and will instead create and
//run a different one