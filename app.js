var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ircXdcc = require('irc-xdcc');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var util = require('util');

var log_file = fs.createWriteStream(path.join(__dirname, "logs", "/debug.log"), {flags : 'w'});
var log_stdout = process.stdout;
var port = process.env.PORT || 3000;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};
function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
}


var botInstance;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

var clients = {};
var fileClaims = {};
var queue = [];
var queueOpen = true;

ircXdcc('irc.irchighway.net', 'ebookerz', {
    port: 6669,
    destPath: path.join(__dirname, "downloads"),
    acceptUnpooled: true,
    channels: ["#ebooks"]
}).then(function(instance) {
    botInstance = instance;
    botInstance.addListener('registered', function() { 
        console.log('eBookerz bot connected to IRC server');
    });
    
    botInstance.addListener('notice', function(nick, to, message) {
        //console.log("NOTICE: " + nick + " => " + to + ": " + message);
        if(nick){
            if(nick.toLowerCase() === "search") {
                message = message.toLowerCase();
                //console.log("NOTICE: " + nick + " => " + to + ": " + message);
                if(message.includes("sorry")) {
                    for (var index in fileClaims) {
                        if (fileClaims.hasOwnProperty(index) && fileClaims[index].hasOwnProperty("query")) {
                            var query = fileClaims[index].query.toLowerCase();
                            if(message.includes(query)) {
                                clients[fileClaims[index].socketid].emit('noResults');
                                console.log("NO RESULTS: " + query);
                                delete fileClaims[index];
                                if(queue[0]) {
                                    retrieveFile();
                                } else {
                                    queueOpen = true;
                                }
                                break;
                            }
                            
                        }
                    }
                }
            }
        }
    });
    botInstance.addListener('ctcp-privmsg', function(from, to, message) {
        console.log("CTCP Privmsg: " + from + " => " + to + ": " + message);
    });
    botInstance.addListener('ctcp-notice', function(from, to, message) {
        console.log("CTCP Notice: " + from + " => " + to + ": " + message);
    });
    botInstance.addListener('pm', function (from, message) {
        console.log("PM - " + from + ' => ME: ' + message);
    });
    botInstance.addListener('xdcc-created', function created(xdccInstance) {
        console.log("Now serving " + xdccInstance.xdccInfo.xdccPoolIndex + "...");
        if(queue[0]) {
            retrieveFile();
        } else {
            queueOpen = true;
        }

    });
    botInstance.addListener('xdcc-progress', function(xdccInstance, received) {
        if(xdccInstance.xdccInfo.fileName.slice(-3) !== "zip") {
            clients[fileClaims[xdccInstance.xdccInfo.xdccPoolIndex].socketid].emit('downloadProgress', received);
        }
    });
    botInstance.addListener('xdcc-complete', function complete(xdccInstance) {
        var fileName = xdccInstance.xdccInfo.fileName;
        var fileIndex = xdccInstance.xdccInfo.xdccPoolIndex;
        console.log(fileName);
       
        if(fileName.slice(-3) === "zip") {
            clients[fileClaims[fileIndex].socketid].emit('displayResults', fileName);
        } else {
            clients[fileClaims[fileIndex].socketid].emit('fileReady', fileName);
        }
        delete fileClaims[fileIndex];
        //botInstance.removeXdcc(xdccInstance);
    });
}).catch(console.error.bind(console));

function retrieveFile() {
    queueOpen = false;
    var client = queue[0];
    if(client.hasOwnProperty("query")) {
        botInstance.getXdccPool()
            .then(function(xdccPool) {
                fileClaims[xdccPool.length] = client;
            });
        clients[client.socketid].emit('serving');
        botInstance.say("#ebooks", ("@search " + client.query));
        console.log("SEARCHING: " + client.query);

    } else if(client.hasOwnProperty("downloadOption")) {
        botInstance.getXdccPool()
            .then(function(xdccPool) {
                //console.log("LENGTH: " + xdccPool.length);
                fileClaims[xdccPool.length] = client;
            });
        clients[client.socketid].emit('serving');
        botInstance.say("#ebooks", (client.downloadOption));
        console.log("RETRIEVING: " + client.downloadOption);

    }
    queue.splice(0, 1);

}


app.get('/', function(req, res) {
    res.render("index");
});
app.get('/test', function(req, res) {
    res.render("test");
});

app.get('/getZip', function(req, res) {
    var fileName = req.query.fileName;
    var filePath = path.join(__dirname, "downloads", fileName);
    res.download(filePath, fileName, function(err) {
        if(err) {
            console.error(err);
        }
    });
    
});
app.get('/download', function(req, res) {
    var fileName = req.query.fileName;
    var filePath = path.join(__dirname, "downloads", fileName);
    res.download(filePath, fileName, function(err) {
        if(err) {
            console.error(err);
        }
        fs.unlink(filePath, function(error) {
            if(error) {
                console.log(error);
                console.log("NOT DELETED: " + filePath);
                return;
            }
            console.log("DELETED: " + filePath);
        });
    });
    
});

io.on('connection', function(socket) {
    //console.log('a user connected');
    clients[socket.id] = socket;
    //console.log(socket.id);
    
    socket.on('search', function(query) {
        queue.push({socketid: socket.id, query: query});
        socket.emit('queued', queue.length);
        if(queueOpen && queue[0]) {
            retrieveFile();
        }
    });
    socket.on('getBook', function(downloadOption) {
        queue.push({socketid: socket.id, downloadOption: downloadOption});
        socket.emit('queued', queue.length);
        if(queueOpen && queue[0]) {
            retrieveFile();
        }
    });
    socket.on('deleteResults', function(fileName) {
        fs.unlink(path.join(__dirname, "downloads", fileName), function(error) {
            if(error) {
                console.error(error);
                return;
            }
        });
    });
    
    socket.on('disconnect', function() {
        //console.log("user disconnected");
        
        for (var index in fileClaims) {
            if (fileClaims.hasOwnProperty(index)) {
                if(fileClaims[index].socketid === socket.id) {
                    botInstance.getXdccPool()
                        .then(function(xdccPool) {
                            botInstance.removePoolId(index);
                        });
                    delete fileClaims[index];
                    break;
                        
                }
                
            }
        }
        delete clients[socket.id];
        if(isEmpty(clients)) {
            botInstance.getXdccPool()
                .then(function(xdccPool) {
                    while(xdccPool.length > 0) {
                        botInstance.removePoolId(0);
                    }
                });
        }
    });
});

http.listen(port, function() {
    console.log("Server started on " + port + "...");
});



