var irc = require('irc');
var ircXdcc = require('irc-xdcc');
var express = require('express');
var app = express();

var options = {
	userName: 'gdsaiojbgfaw',
    realName: 'Samantha Picoral',
    port: 6669,
    localAddress: null,
    debug: false,
    showErrors: false,
    autoRejoin: false,
    autoConnect: true,
    channels: ["#ebooks"],
    secure: false,
    selfSigned: false,
    certExpired: false,
    floodProtection: false,
    floodProtectionDelay: 1000,
    sasl: false,
    retryCount: 0,
    retryDelay: 2000,
    stripColors: false,
    channelPrefixes: "&#",
    messageSplit: 512,
    encoding: ''
};

var botInstance;

ircXdcc('irc.irchighway.net', 'nodebot', {
    debug: true,
    port: 6669,
    acceptUnpooled: true,
    channels: ['#ebooks']
}).then(function(instance) {
      botInstance = instance;
      botInstance.addListener('registered', function() { console.log('bot connected'); });
      botInstance.addListener('message', function (from, to, message) {
   		console.log("MSG - " + from + ' => ' + to + ': ' + message);
		});
		botInstance.addListener('pm', function (from, message) {
		    console.log("PM - " + from + ' => ME: ' + message);
		});

		botInstance.addListener('error', function(message) {
		    console.log('error: ', message);
		});
		botInstance.addListener('selfMessage', function(to, message) {
			console.log("SM - Me => " + to + ": " + message);
		});

		botInstance.addListener('ctcp-privmsg', function(from, to, message) {
			console.log("CTCP privmsg:" + from + ' => ' + to + ': ' + message);
		});
		botInstance.addListener('ctcp-notice', function(from, to, message) {
			console.log("CTCP notice:" + from + ' => ' + to + ': ' + message);
		});


		app.get('/', function(req, res) {
			botInstance.say("#ebooks", "@search harry potter");
			res.send("Hi!");
		});

		app.listen(3000, function() {
			console.log("Server started...");
		});
		    })
    .catch(console.error.bind(console));





