'use strict';

var moment = require('moment');
var bots = {}
var irc = require('./irc');


// TODO: 

// - status should be tracked per channel/bot

var update = function(name) {
	console.log('updating status for ' + name);
	bots[name] = {
		status: 'online',
		lastSeen: moment()
	}
}

var get = function() {
	return bots;
}

function init() {
	console.log('botstatus init...');
	irc.addChannelListener(function(from, message) {
		var regex = /Type: @(.*) For My List Of.*/
		var matches = message.trim().match(regex);
		if (matches) {
			update(matches[1]);
		}
	});
}

init();

module.exports = {
	init: init,
	update: update,
	get: get
}