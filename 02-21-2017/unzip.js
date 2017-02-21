var yauzl = require('yauzl');
var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');

yauzl.open(path.join(__dirname, "file.zip"), {autoClose: true, lazyEntries: true}, function(err, zipfile) {
	if (err) throw err;
	zipfile.readEntry();
	zipfile.on("entry", function(entry) {
	    if (/\/$/.test(entry.fileName)) {
	    	// directory file names end with '/' 
      		mkdirp(entry.fileName, function(err) {
		        if (err) throw err;
		        zipfile.readEntry();
	      	});
	    } else {
	      // file entry 
	    	zipfile.openReadStream(entry, function(err, readStream) {
	        	if (err) throw err;
	        	// ensure parent directory exists 
	        	mkdirp(path.dirname(entry.fileName), function(err) {
	          		if (err) throw err;
	          		readStream.pipe(fs.createWriteStream(entry.fileName));
	          		readStream.on("end", function() {
	            		zipfile.readEntry();
          			});
	        	});
	      	});
	    }
	});
});