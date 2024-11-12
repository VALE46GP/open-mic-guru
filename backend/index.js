require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const routes = require('./src/routes');
const initializeWebSocketServer = require('./src/websocket/WebSocketServer');
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Initialize Passport
const passport = require('passport');
app.use(passport.initialize());

// Initialize WebSocket server and store broadcast function
const { broadcastLineupUpdate } = initializeWebSocketServer(server);
app.locals.broadcastLineupUpdate = broadcastLineupUpdate;

routes(app);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
