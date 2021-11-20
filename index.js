const GoogleRecaptcha = require('google-recaptcha')
const io = require('socket.io')(null, {
    cors: {
        origin: '*',
    },
    secure: false,
});

const googleRecaptcha = new GoogleRecaptcha({secret: '6Ld9PUIdAAAAAGAkK39NYtQXgxHEjjuXKlY91A4r'})

const rooms = {};
const search = {};
const disconnectRooms = {};
let online = 0;

io.on('connection', client => {
    let cancel = false;
    online++;

    client.on("disconnect", () => {
        delete search[client.id];
        online--;
        io.emit('online', {online: online});

        disconnectRooms[client.roomName] = setTimeout(() => {
            io.in(client.roomName).emit('chatMsg', {
                id: -1,
                message: "",
                roomName: client.roomName,
                timestamp: Date.now(),
                type: "exit",
            });
        }, 30000);
    });

    client.on("reconnectSocket", data => {
        if(data.roomName) {
            client.join(data.roomName);
            client.roomName = data.roomName;

            if (disconnectRooms[client.roomName]) {
                clearTimeout(disconnectRooms[client.roomName]);
            }
        }
    });

    client.on("leaveRoom", data => {
        client.leave(data.roomName);
    });

    client.on("chatMsg", data => {
        io.in(data.roomName).emit('chatMsg', data);
    });

    client.on("setWrite", data => {
        io.in(data.roomName).emit('setWrite', data);
    });

    client.on("cancel", function(data){
        cancel = true;
        delete search[client.id];
    });

    client.on("search", async data => {
        const resultCaptcha = await checkRecapthca(data.token);

        if (!resultCaptcha) {
            return;
        }

        for (let id in search) {
            if (
                ((search[id].me.sex === data.find.sex &&
                        search[id].find.sex === data.me.sex) ||
                    (data.find.sex == "0" && search[id].find.sex === data.me.sex) ||
                    (search[id].find.sex == "0" && data.find.sex === search[id].me.sex) ||
                    (search[id].find.sex == "0" && data.find.sex == "0")) &&
                ((search[id].me.yeards === data.find.yeards &&
                        search[id].find.yeards === data.me.yeards) ||
                    (data.find.yeards == "0" &&
                        search[id].find.yeards === data.me.yeards) ||
                    (search[id].find.yeards == "0" &&
                        data.find.yeards === search[id].me.yeards) ||
                    (search[id].find.yeards == "0" && data.find.yeards == "0"))
            ) {
                let roomName = makeRoom();

                client.join(roomName);
                search[id].socket.join(roomName);

                client.emit("onFind", {
                    roomName: roomName,
                });

                search[id].socket.emit("onFind", {
                    roomName: roomName,
                });

                client.roomName = roomName;
                search[id].socket.roomName = roomName;

                delete search[id];
                return;
            }
        }

        search[client.id] = {
            me: data.me,
            find: data.find,
            socket: client
        };
    });
});

function makeRoom() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 15; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function checkRecapthca(token) {
    return new Promise((resolve) => {
        googleRecaptcha.verify({response: token}, (error) => {
            console.log(error);

            if (error) {
                return resolve(false);
            }

            return resolve(true);
        });

    })
}

io.listen(3000);
console.log('socket server start on port 3000');