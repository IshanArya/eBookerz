'use strict';

var ip = require('ip');
var net = require('net');
var fs = require('fs');
var os = require('os');
var irc = require('./irc');

function handleDccSend(from, to, message) {
	console.log('handle dcc send');
	var args = message.toLowerCase().split(" ");
	if (args[0] === "dcc" || args[1] === "send") {
		var filename = args[2];
		var address = ip.fromLong(args[3]);
		var port = args[4];
		downloadFile(filename, address, port);
	}
}

function downloadFile(filename, address, port, size) {
	filename = 'downloads/' + filename;
	var file = fs.createWriteStream(filename);
	file.on('error', function(err) {
		console.log(err)
	});
	
	var socket = net.connect(port, address, function() {
		socket.on('error', function(err) {
			console.log('ERROR: ' + error);
		});
		
		file.on('open', function() {
			console.log('file open');
		});

		socket.on('end', function() {
			console.log('Connection closed');
			file.end(function() {
				//TODO: compare sizes, etc
			});
		});
		socket.on('data', function(data) {
			socket.pause();
			file.write(data, function() {
				var buf = new Buffer([0,0,0,0]);
				buf.writeUInt32BE(file.bytesWritten, 0);
				socket.write(buf,function() {
					socket.resume();
				});
			});						
		});		
	});
}


function init() {
	irc.addListener('ctcp-privmsg', handleDccSend);
	
	fs.exists('downloads', function(exists) {
		if (!exists) {
			fs.mkdir('downloads', function(err) {
				console.log(err);
			});
		}
	});
}

init();

module.exports = {
	send: function(bot, from, target, params, raw) {
		//var command = 'DCC SEND nope.jpg ' + ip.toLong('1.2.3.4') + ' 1234 234234';
		//bot.client.ctcp(from, 'privmsg', command);
	}
}