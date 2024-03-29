var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ircXdcc = require('irc-xdcc');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var path = require('path');
var fs = require('fs-extra');

var port = process.env.PORT || 3000;

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
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));
app.set("view engine", "ejs");

var clients = {};
var queue = [];
var queueOpen = true;
var currentlyServing;
var searchTimeout;

ircXdcc('irc.irchighway.net', 'ebookerz', {
    userName: 'ebookerz',
    realName: "The eBookerz",
    port: 6669,
    destPath: path.join(__dirname, "downloads"),
    acceptUnpooled: true,
    autoRejoin: true,
    autoConnect: true,
    channels: ["#ebooks"]
}).then(function(instance) {
    botInstance = instance;
    botInstance.addListener('error', function(err) {
        if(err.xdccInfo.error === "no dcc message" ) {

        } else {
            console.error(err);
        }
    });
    botInstance.addListener('registered', function() { 
        console.log('eBookerz bot connected to IRC server');
    });
    
    botInstance.addListener('notice', function(nick, to, message) {
        console.log("NOTICE: " + nick + " => " + to + ": " + message);
        if(nick){
            if(nick.toLowerCase() === "search") {
                //console.log("NOTICE: " + nick + " => " + to + ": " + message);
                if(message.toLowerCase().includes("sorry")) {
                    clients[currentlyServing.socketid].emit('noResults');
                    retrieveFile();
                    
                }
            }
        }
    });
    botInstance.addListener('ctcp-privmsg', function(from, to, message) {
        if(to !== "#ebooks") {
            console.log("CTCP Privmsg: " + from + " => " + to + ": " + message);
        }
    });
    botInstance.addListener('ctcp-notice', function(from, to, message) {
        console.log("CTCP Notice: " + from + " => " + to + ": " + message);
    });
    botInstance.addListener('pm', function (from, message) {
        console.log("PM - " + from + ' => ME: ' + message);
    });
    botInstance.addListener('xdcc-created', function created(xdccInstance) {
        console.log("Now serving " + xdccInstance.xdccInfo.xdccPoolIndex + "...");
        if(clients.hasOwnProperty(currentlyServing.socketid)) {
            xdccInstance.socketid = currentlyServing.socketid;
            xdccInstance.timeout = setTimeout(function() {
                clients[xdccInstance.socketid].emit('failed');
                botInstance.removeXdcc(xdccInstance);
            }, 300000);
        } else {
            console.log("REMOVED XDCC: " + xdccInstance.xdccInfo.fileName);
            botInstance.removeXdcc(xdccInstance);
        }
        retrieveFile();

    });
    botInstance.addListener('xdcc-progress', function(xdccInstance, received) {
        if(clients.hasOwnProperty(xdccInstance.socketid)) {
            if(xdccInstance.xdccInfo.fileName.slice(-3) !== "zip") {
                clients[xdccInstance.socketid].emit('downloadProgress', received);
            }
        } else {
            console.log("REMOVED XDCC: " + xdccInstance.xdccInfo.fileName);
            botInstance.removeXdcc(xdccInstance);
        }
    });
    botInstance.addListener('xdcc-complete', function complete(xdccInstance) {
        var fileName = xdccInstance.xdccInfo.fileName;
        console.log(fileName);

        clearTimeout(xdccInstance.timeout);
       
        if(fileName.slice(-3) === "zip") {
            clients[xdccInstance.socketid].emit('displayResults', fileName);
        } else {
            clients[xdccInstance.socketid].emit('fileReady', fileName);
        }
    });
}).catch(console.error.bind(console));

function retrieveFile() {
    if(searchTimeout) {
        clearTimeout(searchTimeout);
    }
    if(queue[0]) {
        queueOpen = false;
        currentlyServing = queue[0];
        io.sockets.emit('queuedown');
        clients[currentlyServing.socketid].emit('serving');
        if(currentlyServing.hasOwnProperty("query")) {
            botInstance.say("#ebooks", ("@search " + currentlyServing.query));
            console.log("SEARCHING: " + currentlyServing.query);

        } else if(currentlyServing.hasOwnProperty("downloadOption")) {
            botInstance.say("#ebooks", (currentlyServing.downloadOption));
            console.log("RETRIEVING: " + currentlyServing.downloadOption);

        }
        searchTimeout = setTimeout(function() {
            clients[currentlyServing.socketid].emit('failed');
            if(queue[0]) {
                retrieveFile();
            } else {
                queueOpen = true;
            }
        }, 360000);
        queue.splice(0, 1);
    } else {
        queueOpen = true;
    }

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
        if(queueOpen) {
            retrieveFile();
        }
    });
    socket.on('getBook', function(downloadOption) {
        queue.push({socketid: socket.id, downloadOption: downloadOption});
        socket.emit('queued', queue.length);
        if(queueOpen) {
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
        delete clients[socket.id];
        for(var i = queue.length - 1; i >= 0; i--) {
            if(queue[i].socketid === socket.id) {
                queue.splice(i, 1);
                break;
            }
        }
        if(isEmpty(clients)) {
            botInstance.getXdccPool()
                .then(function(xdccPool) {
                    for(var i = xdccPool.length - 1; i >= 0; i--) {
                        botInstance.removeXdcc(xdccPool[i]);
                    }
                });
            fs.emptyDir(path.join(__dirname, "downloads"), function(err) {
                if(err) {
                    console.error(err);
                    return;
                }
                console.log("Downloads directory emptied!");
            });
        }
    });
});

http.listen(port, function() {
    console.log("Server started on " + port + "...");
});



