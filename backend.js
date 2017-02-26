var ircXdcc = require('irc-xdcc');
var express = require('express');
var app = express();


/*

Regex: /\.[a-zA-Z0-9]{3,4}\s/

*/


var botInstance;

ircXdcc('irc.irchighway.net', 'flisawtoo', {
    port: 6669,
    acceptUnpooled: true,
    channels:["#ebooks"]
}).then(function(instance) {
    botInstance = instance;
    botInstance.addListener('registered', function() { 
        console.log('bot connected'); 
    });
    
    botInstance.addListener('pm', function (from, message) {
        console.log(from + ' => ME: ' + message);
    });
    
    botInstance.addListener('message', function (from, to, message) {
        console.log(from + ' => ' + to + ": " + message);
    });
    
    botInstance.addListener('selfMessage', function (to, message) {
        console.log('ME => ' + to + ": " + message);
    });
    
    botInstance.addListener('ctcp-privmsg', function(from, to, message) {
        console.log("CTCP: " + from + " => " + to + ": " + message);
    });
    
    botInstance.addListener('raw', function(message) {
        if(message.command === "NOTICE"){
            
            if(message.args[1].toLowerCase().includes("sorry")) {
                console.log("No matches to search");
            }
        }
                
    });
    
}).catch(console.error.bind(console));

app.get('/', function(req, res) {
    botInstance.say("#ebooks", "!Mysfyt Dr Seuss - The Cat in the Hat (pdf).rar");
    //!pizda Rowling, JK - Harry Potter 4 - Goblet of Fire.pdf
    res.send("Harry Potter searched");
});

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server started.");
});

var searchValidityChecker = {
    exists: function(query, callback) {
        botInstance.addListener('raw', function(message) {
            if(message.command === "NOTICE"){
                console.log("received notice");
                
                if(message.args[0] == botInstance.opt.nick) {
                    console.log("matches");
                    var notice = message.args[1].toLowerCase();
                    console.log(notice);
                    
                    //Searching handler
                    if(notice.includes(String(query).toLowerCase())) {
                        console.log("notice includes query");
                        if(notice.includes("sending results")) {
                            var fileName = message.args[1].match(/SearchBot_.*1,9./)[0];
                            fileName = fileName.substring(0, fileName.length - 4)
                            this.exists(fileName, callback);
                    
                        } else if(notice.includes("sorry")) {
                            console.log("includes sorry");
                            //callback();
                    
                        }
                    }
                    
                }
            }
                
        });
    }
}

    botInstance.addListener('message', function (from, to, message) {
        console.log(from + ' => ' + to + ": " + message);
    });
    botInstance.addListener('raw', function(message) {
        var channels = [],
            channel,
            nick,
            from,
            text,
            to;
        if(message.command === "NOTICE"){
            from = message.nick;
            to = message.args[0];
                if (!to) {
                    to = null;
                }
                text = message.args[1] || '';
                console.log(message);
                if (to == botInstance.opt.nick)
                    console.log('GOT NOTICE from ' + (from ? '"' + from + '"' : 'the server') + ': "' + text + '"');
        }
                
    });
    
    



var request = new XMLHttpRequest();
request.open('POST', '/search', true);
request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
request.onload = function() {
    if (request.status !== 200) {
        console.error('Request failed.  Returned status of ' + request.status);
    }
};
request.send("query=" + query + "&socketid=" + socket.id);


app.post('/search', function(req, res) {
    var query = req.body.query.trim();
    var socketid = req.body.socketid;
    if(query) {
        botInstance.getXdccPool()
            .then(function(xdccPool) {
                //console.log("LENGTH: " + xdccPool.length);
                fileClaims[xdccPool.length] = {socketid: socketid, query: query};
            });
        
        botInstance.say("#ebooks", ("@search " + query));
        console.log("SEARCHING: " + query);
        
    }
        
    res.redirect('/');
});



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



NOTICE: Search => demebookz: Search flood! 5 Minute ignore.