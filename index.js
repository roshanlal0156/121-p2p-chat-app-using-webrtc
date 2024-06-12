var express = require('express');
const NodeCache = require( "node-cache" ); 
var path = require('path');
const http = require('http');
const WebSocketServer = require("websocket").server;

const app = express();
const cache = new NodeCache();
app.set('view engine', 'ejs');
app.use("/public", express.static(path.join(__dirname, 'public')));

const roomConnections = {};  // Map to keep track of room creator connections

const server = http.createServer(app);
const websocket = new WebSocketServer({
    httpServer: server
});

server.listen(3000, () => {
    console.log('App running on port:: 3000');
});

websocket.on("request", request => {
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("Opened!!!"));
    connection.on("close", () => console.log("CLOSED!!!"));
    connection.on("message", message => {
        let offerSDP = JSON.parse(message.utf8Data).offer;
        let roomId = JSON.parse(message.utf8Data).room_id;
        console.log("offer SDP for room id "+ roomId+" : " + offerSDP);
        cache.set(roomId, {"offer": offerSDP, "answer": ""});

        roomConnections[roomId] = connection;
    });

    // Use connection.send to send stuff to the client 
    // sendevery5seconds(connection);
});

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

function sendevery5seconds(connection) {
    setInterval(() => {
        connection.send('Message from server every 5 seconds');
    }, 5000);
}

app.get('/', (req, res) => {
    res.render('home');
});

app.post('/create-room-id', (req, res) => {
    const room_id = makeid(10);
    console.log('Room ID is ' + room_id);
    res.send({ "room_id": room_id });
});

app.get('/get-offer', (req, res) => {
    room = cache.get(req.query.room_id);
    res.send({"offer" : room.offer})
});

app.get('/joinee', (req, res) => {
    res.send('Joinee WebSocket Server is running');
});




// Create a new HTTP server for the /joinee WebSocket
const joineeServer = http.createServer(app);
const joineeWebsocket = new WebSocketServer({
    httpServer: joineeServer,
    autoAcceptConnections: false
});

joineeServer.listen(3001, () => {
    console.log('Joinee server running on port:: 3001');
});

joineeWebsocket.on("request", request => {
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("Joinee WebSocket Opened!!!"));
    connection.on("close", () => console.log("Joinee WebSocket CLOSED!!!"));
    connection.on("message", message => {
        console.log("Message from Joinee WebSocket: " + message.utf8Data);
        // Handle Joinee WebSocket messages here
        let answerSDP = JSON.parse(message.utf8Data).answer;
        let roomId = JSON.parse(message.utf8Data).room_id;
        console.log("answer SDP for room id "+ roomId+" : " + answerSDP);
        cache.set(roomId, {"offer": cache.get(roomId).offer, "answer": answerSDP});

        const creatorConnection = roomConnections[roomId];
        if (creatorConnection) {
            creatorConnection.send(JSON.stringify({
                "room_id": roomId,
                "answer": answerSDP
            }));
        }
    });

    // Optional: send a message to the client every 5 seconds
    // sendevery5seconds(connection);
});