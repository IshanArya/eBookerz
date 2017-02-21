
var f = document.getElementById('fileThing');
var btn = document.getElementById('btn');


btn.addEventListener('click', function() {
	zip.workerScriptsPath = "js/zip/"
	// use a BlobReader to read the zip from a Blob object
	zip.createReader(new zip.HttpReader(f.value), function(reader) {

	  // get all entries from the zip
	  reader.getEntries(function(entries) {
	    if (entries.length) {

	      // get first entry content as text
	      entries[0].getData(new zip.TextWriter(), function(text) {
	        // text contains the entry data as a String
	        console.log(text);
	        console.log("printed");

	        // close the zip reader
	        reader.close(function() {
	          // onclose callback
	        });

	      }, function(current, total) {
	        // onprogress callback
	      });
	    }
	  });
	}, function(error) {
	  // onerror callback
	});
});

