const httpserver = require('http').createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.write('<h1>There is nothing here</h1>')
    res.end()
})
const io = require('socket.io')(httpserver, {
    transports: ["websocket"],
    cors: {
        origin: '*',
    }
})

let users = []

io.on("connection", (socket) => {
    socket.on("UserJoin", (user) => {
        if (users.length === 0) {
            user.type = 'host'
            io.to(socket.id).emit('UserIsHost')
        } else {
            io.to(socket.id).emit('UsersInRoom', users)
        }
        
        users.push(user)
        socket.broadcast.emit('UserJoinedRoom', user)
    })

    socket.on("EndCall", () => {
        io.emit("EndCall")
    })

    socket.on("SetRoomMode", mode => {
        io.emit("SetRoomMode", mode)
    })

    socket.on("disconnect", () => {
        users = users.filter( user => {
            return user.id !== socket.id
        })
        io.emit('UserDisconnect', socket.id)
    })

    socket.on("NextUserToSpeak", (userId) => {
        console.log("nextspeak", userId);
        io.emit("UserToSpeak", userId)
    })

    socket.on("Offer", ({target, caller, sdp}) => {
        io.to(target).emit("Signal", {callerId: caller, incomingSignal: sdp})
    })

    socket.on("SendingSignal", payload => {
        socket.broadcast.emit("UserSpeakingSignal", {signal: payload.signal, callerId: payload.callerId})
    })

    socket.on("Answer", ({target, caller, sdp}) => {
        io.to(target).emit("ReceivingAnswer", {answerId: caller, sdp})
    })

    socket.on("ReturnSignal", payload => {
        io.to(payload.callerId).emit("ReceivingReturnedSignal", {id: socket.id, signal: payload.signal})
    })

    socket.on("ICECandidate", ({target, candidate}) => {
        io.to(target).emit("NewICECandidate", {iceId: socket.id, candidate})
    })

    socket.on("NewStory", story => {
        io.emit("SetStory", story)
        io.emit("SetRoomMode", "vote")
    })

    socket.on("Point", votePayload => {
        io.emit("UserPoint",votePayload)
    })

    socket.on("RemovePoint", payload => {
        io.emit("RemovePoint", payload)
    })

    socket.on("Results", () => {
        console.log("result");
        io.emit("Results")
    })
})

const PORT = process.env.PORT || 8888;

httpserver.listen(PORT, '0.0.0.0');

console.log("listening to port", PORT);

//aaaa