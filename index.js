var http = require('http').createServer().listen(3000);
var io = require('socket.io').listen(http);

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'bdMessages.db', autoload: true });


function makeRoom() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 15; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

var search = {};
var online = 0;

setInterval(function(){
  console.log(Object.keys(io.sockets.connected).length);
}, 1000 * 60 * 60 * 24);

io.on('connection', function (socket) {
  online++;
  io.emit('online', {online: online});
console.log("connect " + socket.id);

socket.on("getRooms", function(data){
  db.find({}, {roomName : 1}, function(err, rooms){
    socket.emit("getRooms", rooms);
  });
});

socket.on("getMsg", function(data){
  db.find({roomName: data.roomName}).sort({time: 1}).exec(function(err, msg){
    socket.emit("getMsg", msg);
  });
});

socket.on("disconnect", function(){
  delete search[socket.id];
  online--;
  io.emit('online', {online: online});
});


var roomName = "";
var cancel = false;

socket.on("reconnect_socket", function(data){
  if(data.roomName != "")
    socket.join(data.roomName);
});

socket.on("reed_socket", function(data){
    socket.leave(data.oldRoom);
    socket.join(data.roomName);
});

socket.on("leave_room", function(data){
  socket.leave(data.roomName);
});

socket.on("deleteMsg", function(data){
  db.remove({}, { multi: true }, function (err, numRemoved) {
    console.log("Удалено сообщений: " + numRemoved);
  });
});

socket.on("chat_msg", function(data){
  io.in(data.roomName).emit('chat_msg', data);
  data.time = new Date().getTime();
  if(data.msg == "%$&wgb$5sfgeq#67$235" || data.msg == "sdfgfhg$#%$df" || data.msg == "ijk^%$%234qe" ||
     data.msg == "xc12ad!#!adz" || data.msg == "xc12ad!#!addsf")
      return;
  db.insert(data, function(err, newMsg){
    if(err){
      console.log("Ошибка");
      return;
    }
  });

});

socket.on("cancel", function(data){
  cancel = true;
  delete search[socket.id];
});
  socket.on("search", function(data){

    var find = false;
    for(key in search){
      if(cancel){
        cancel = false;
        break;
        return;
      }
      if(search[key].im[0] == data.opponent[0] && search[key].opponent[0] == data.im[0] && search[key].im[1] == data.opponent[1] && search[key].opponent[1] == data.im[1] || //пол и возраст совпали
         search[key].opponent[1] == "0" && search[key].im[0] == data.opponent[0] && search[key].im[1] == data.opponent[1] ||//я ищу кого то конкретного, оппонент ищет какой то пол любого возраста
         data.opponent[1] == "0" && search[key].opponent[0] == data.im[0] && search[key].im[0] == data.opponent[0] && search[key].opponent[1] == data.im[1] ||//я ищу какой то пол любого возраста, оппонент ищет кого то конкретного
         search[key].opponent[1] == "0" && data.opponent[1] == "0" && search[key].im[0] == data.opponent[0] && search[key].opponent[0] == data.im[0] ||//оба ищем какой то пол любого возраста
         search[key].opponent[0] == "0" && data.opponent[0] == search[key].im[0] && search[key].im[1] == data.opponent[1] ||//я ищу кого то, оппонент ищет любого
         search[key].opponent[0] == "0" && data.opponent[1] == "0" && data.opponent[0] == search[key].im[0] ||//я ищу любой возраст, оппонент ищет хоть кого
         data.opponent[0] == "0" && search[key].opponent[0] == data.im[0] && search[key].opponent[1] == data.im[1] ||//я ищу хоть кого, оппонент ищет кого то конкретного
         data.opponent[0] == "0" && search[key].opponent[1] == "0" && search[key].opponent[0] == data.im[0] ||
         data.opponent[0] == "0" && search[key].opponent[0] == "0"){

          find = true;
          roomName = makeRoom();
          socket.join(roomName);
          search[key].socket.join(roomName);


          socket.emit("on_find", {room: roomName, name: search[key].my_name, author: 0});
          search[key].socket.emit("on_find", {room: roomName, name: data.my_name, author: 1});
          delete search[key];
          break;
          return;
        }
    }
    if(!find)
      search[socket.id] = {im: data.im, opponent: data.opponent, my_name: data.my_name, socket: socket};
    console.log(search);
  });

});
