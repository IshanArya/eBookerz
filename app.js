let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let ircXdcc = require('irc-xdcc');
let bodyParser = require('body-parser');
let favicon = require('serve-favicon');
let path = require('path');
let fs = require('fs-extra');

let port = process.env.PORT || 3000;
let debugFile = path.join(__dirname, "logs", "debug.log");

function log(data) {
    console.log(data);
    fs.appendFile(debugFile, data + "\r\n", function(err) {
        if(err) {
            throw err;
        }
    });
}
function isEmpty(obj) {
    for(let prop in obj) {
        if(obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
}


let botInstance;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));
app.set("view engine", "ejs");

let clients = {};
let queue = [];
let queueOpen = true;
let currentlyServing;
let searchTimeout;

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
            log(err);
        }
    });
    botInstance.addListener('registered', function() { 
        log('eBookerz bot connected to IRC server');
    });
    
    botInstance.addListener('notice', function(nick, to, message) {
        log("NOTICE: " + nick + " => " + to + ": " + message);
        if(nick){
            if(nick.toLowerCase() === "search") {
                //log("NOTICE: " + nick + " => " + to + ": " + message);
                if(message.toLowerCase().includes("sorry")) {
                    clients[currentlyServing.socketid].emit('noResults');
                    retrieveFile();
                    
                }
            }
        }
    });
    botInstance.addListener('ctcp-privmsg', function(from, to, message) {
        if(to !== "#ebooks") {
            log("CTCP Privmsg: " + from + " => " + to + ": " + message);
        }
    });
    botInstance.addListener('ctcp-notice', function(from, to, message) {
        log("CTCP Notice: " + from + " => " + to + ": " + message);
    });
    botInstance.addListener('pm', function (from, message) {
        log("PM - " + from + ' => ME: ' + message);
    });
    botInstance.addListener('xdcc-created', function created(xdccInstance) {
        log("Now serving " + xdccInstance.xdccInfo.xdccPoolIndex + "...");
        if(clients.hasOwnProperty(currentlyServing.socketid)) {
            xdccInstance.socketid = currentlyServing.socketid;
            xdccInstance.timeout = setTimeout(function() {
                clients[xdccInstance.socketid].emit('failed');
                botInstance.removeXdcc(xdccInstance);
            }, 300000);
        } else {
            log("REMOVED XDCC: " + xdccInstance.xdccInfo.fileName);
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
            log("REMOVED XDCC: " + xdccInstance.xdccInfo.fileName);
            botInstance.removeXdcc(xdccInstance);
        }
    });
    botInstance.addListener('xdcc-complete', function complete(xdccInstance) {
        let fileName = xdccInstance.xdccInfo.fileName;
        log(fileName);

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
            log("SEARCHING: " + currentlyServing.query);

        } else if(currentlyServing.hasOwnProperty("downloadOption")) {
            botInstance.say("#ebooks", (currentlyServing.downloadOption));
            log("RETRIEVING: " + currentlyServing.downloadOption);

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
    let fileName = req.query.fileName;
    let filePath = path.join(__dirname, "downloads", fileName);
    res.download(filePath, fileName, function(err) {
        if(err) {
            log(err);
        }
    });
    
});
app.get('/download', function(req, res) {
    let fileName = req.query.fileName;
    let filePath = path.join(__dirname, "downloads", fileName);
    res.download(filePath, fileName, function(err) {
        if(err) {
            log(err);
        }
        fs.unlink(filePath, function(error) {
            if(error) {
                log(error);
                log("NOT DELETED: " + filePath);
                return;
            }
            log("DELETED: " + filePath);
        });
    });
    
});

io.on('connection', function(socket) {
    //log('a user connected');
    clients[socket.id] = socket;
    //log(socket.id);
    
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
                log(error);
                return;
            }
        });
    });
    
    socket.on('disconnect', function() {
        //log("user disconnected");
        delete clients[socket.id];
        for(let i = queue.length - 1; i >= 0; i--) {
            if(queue[i].socketid === socket.id) {
                queue.splice(i, 1);
                break;
            }
        }
        if(isEmpty(clients)) {
            botInstance.getXdccPool()
                .then(function(xdccPool) {
                    for(let i = xdccPool.length - 1; i >= 0; i--) {
                        botInstance.removeXdcc(xdccPool[i]);
                    }
                });
            fs.emptyDir(path.join(__dirname, "downloads"), function(err) {
                if(err) {
                    log(err);
                    return;
                }
                log("Downloads directory emptied!");
            });
        }
    });
});

http.listen(port, function() {
    log("Server started on " + port + "...");
});



