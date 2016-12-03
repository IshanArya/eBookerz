'use strict';

var irc = require('irc');

// this stuff should be configurable
var channels = ['#mfdguild'];

var client;

function init() {
	console.log('bot init');
	// TODO: config
	client = new irc.Client('irc.quakenet.org', 'marvin', {
		autoconnect: false,
		userName: 'marvin',
		realName: 'marvin',
		port: 6667,
		localAddress: null,
		debug: true,
		showErrors: true,
		autoRejoin: true,
		autoConnect: false,
		channels: channels,
		floodProtection: false,
		floodProtectionDelay: 1000,
		stripColors: true,
		channelPrefixes: "&#",
		messageSplit: 512
	});

	client.connect();
};

init();

function addChannelListener(callback) {
	channels.forEach(function(channel) {
		client.addListener('message' + channel, callback);
	});
}

module.exports = {
	init: init,
	addChannelListener: addChannelListener,
	addListener: function(target, callback) {
		client.addListener(target, callback);
	},
	say: function(target, msg) {
		client.say(target, msg);
	}
}