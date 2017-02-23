var express = require('express');
var ircXdcc = require('irc-xdcc');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = process.env.PORT || 3000;
var botInstance;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

var clients = {};
var fileClaim = {};

ircXdcc('irc.irchighway.net', 'ebookerz', {
    port: 6669,
    destPath: path.join(__dirname, "downloads"),
    acceptUnpooled: true,
    channels:["#ebooks"]
}).then(function(instance) {
    botInstance = instance;
    botInstance.addListener('registered', function() { 
        console.log('bot connected');
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
        
    });
    botInstance.addListener('xdcc-complete', function complete(xdccInstance) {
       var fileName = xdccInstance.xdccInfo.fileName;
       var fileIndex = xdccInstance.xdccInfo.xdccPoolIndex;
       console.log(fileName);
       clients[fileClaim[fileIndex]].emit('download', {fileName: fileName, fileIndex: fileIndex});
    });
}).catch(console.error.bind(console));


app.get('/', function(req, res) {
    //console.log(botInstance.opt);
    res.render("index");
});

app.get('/download', function(req, res) {
    var fileName = req.query.fileName;
    var fileIndex = req.query.fileIndex;
    var filePath = path.join(__dirname, "downloads", fileName);
    res.download(filePath, fileName, function(err) {
        if(err) {
            console.error(err);
        }
        
        fs.unlink(filePath, function(error) {
            if(error) {
                console.error(error);
                return;
            }
        });
    });
    delete fileClaim[fileIndex];
});

app.post('/search', function(req, res) {
    var query = req.body.query.trim();
    var socketid = req.body.socketid;
    if(query) {
        botInstance.getXdccPool()
            .then(function(xdccPool) {
                //console.log("LENGTH: " + xdccPool.length);
                fileClaim[xdccPool.length] = socketid;
            });
        
        botInstance.say("#ebooks", ("@search " + query));
        console.log("SEARCHING: " + query);
        
    }
        
    res.redirect('/');
});

io.on('connection', function(socket) {
    //console.log('a user connected');
    clients[socket.id] = socket;
    //console.log(socket.id);
    
    socket.on('disconnect', function() {
        //console.log("user disconnected");
        delete clients[socket.id];
    });
});

http.listen(port, process.env.IP, function() {
    console.log("Server started on " + port + "...");
});



