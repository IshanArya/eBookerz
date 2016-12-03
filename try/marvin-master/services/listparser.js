'use strict';

var fs = require('fs');
var Lazy = require('lazy');

var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'warning'
});

var file = fs.createReadStream('file.txt');
var body = [];
var separator = false;
var dir = null;
new Lazy(file).lines.forEach(function(line) {

    line = line.toString();
    if (line.match(/^!.*/)) {
    	// this looks like a file
    	// strip off the info (for now at least. later we can parse that shit)
    	line = line.substr(0, line.indexOf('::')).trim(); 
    	if (line.match(/.*\.mp3/)) {
    		var filename = line.substr(line.indexOf(' ') + 1);
    		var user = line.substr(1, line.indexOf(' ') - 1);
    		body.push({ index:  { _index: 'mp3passion', _type: 'mp3'} });
    		body.push({filename: filename, user: user, dir: dir});
    	}
    } else if (line.match(/^=+/))  {
    	separator = !separator;
    } else if (separator) {
    	dir = line.trim();
    } else {
    	//console.log('NOMATCH: ' + line);
    }
    if (body.length >= 1000) {
    	// flush batch when it reaches 1000
		client.bulk({body: body}, function(err, resp) {
			if (err) {
				console.log('ERROR: ' + err);
			} else {
				console.log('Procesed ' + resp.items.length + ' items');
			}
		});    	
		body = [];
    }
});

// flush the last batch
client.bulk({body: body}, function(err, resp) {
	if (err) {
		console.log('ERROR: ' + err);
	} else {
		console.log('Procesed ' + resp.items.length + ' items');
	}
});    	