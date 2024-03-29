window.onload = function() {
    let socket = io();
    
    let search = document.getElementById('search');
    let form = document.getElementById('box');
    let button = document.getElementById('btn');
    
    let statusField = document.getElementById('status');
    
    let resultsField = document.getElementById('results');
    
    
    let fileSize = 0;
    let queuePosition = 0;
    
    
    search.addEventListener('focus', function() {
        search.classList.add("search-focus");
    });
    search.addEventListener('blur', function() {
        search.classList.remove("search-focus");
    });
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        let query = search.value.trim();
        if (query) {
    		socket.emit('search', query);
        }
        search.value = "";
        search.disabled = true;
        search.style.cursor = "not-allowed";
        search.blur();
        resultsField.innerHTML = "";
        statusField.textContent = "Status: WAIT";
    });
    resultsField.addEventListener('click', function(e) {
        let picked = e.target;
        if(picked.className === "downloadOption") {
            socket.emit('getBook', picked.textContent);
            statusField.textContent = "RETRIEVING: " + picked.textContent;
            search.value = "";
            search.disabled = true;
            search.style.cursor = "not-allowed";search.value = "";
            search.blur();
            resultsField.innerHTML = "";
        }
    }, true);
    
    
    
    
    socket.on('displayResults', function(fileName) {
        zip.workerScriptsPath = "js/zip/"
    	// use a BlobReader to read the zip from a Blob object
    	zip.createReader(new zip.HttpReader("/getZip/?fileName=" + fileName), function(reader) {
    
    	  // get all entries from the zip
    	  reader.getEntries(function(entries) {
    	    if (entries.length) {
    
    	      // get first entry content as text
    	      entries[0].getData(new zip.TextWriter(), function(text) {
    	        // text contains the entry data as a String
    	        let resultsArray = text.split(/\r?\n/);
    	        text = "<ul>\n";
    	        resultsArray.forEach(function(result) {
    	            if(result.substring(0, 1) === "!") {
    	                text += '<li class="downloadOption">' + result + "</li>" + "\n<br>\n";
    	            } else {
    	                text += result + "\n<br>\n";
    	            }
    	        });
    	        text += "</ul>";
    	        resultsField.innerHTML = text;
    	        statusField.textContent = "STATUS: Unzipped";
    
    	        // close the zip reader
    	        reader.close(function() {
                    // onclose callback
                    search.disabled = false;
                    search.style.cursor = "text";
                    socket.emit('deleteResults', fileName);
    	        });
    
    	      }, function(current, total) {
    	        statusField.textContent = "UNZIPPING PROGRESS: " + current + "/" + total;
    	      });
    	    }
    	  });
    	}, function(error) {
    	  // onerror callback
    	  statusField.textContent = "ERROR: Unzipping Error";
    	  socket.emit('deleteResults', fileName);
    	});
    });
    socket.on('queued', function(position) {
        queuePosition = position;
        statusField.textContent = "STATUS: queued @ " + queuePosition;
    });
    socket.on('queuedown', function() {
        queuePosition--;
        if(queuePosition > 0) {
            statusField.textContent = "STATUS: queued @ " + queuePosition;
        }
    });
    socket.on('serving', function() {
        queuePosition = 0;
        statusField.textContent = "STATUS: you are currently being served by the server :)";
    });
    socket.on('failed', function() {
        statusField.textContent = "STATUS: failed :(";
        search.disabled = false;
        search.style.cursor = "text";
    });
    socket.on('noResults', function() {
        statusField.textContent = "STATUS: No Results";
        search.disabled = false;
        search.style.cursor = "text";
    });
    socket.on('fileSize', function(xdccFileSize) {
        fileSize = xdccFileSize;
    });
    socket.on('startingDownload', function() {
        statusField.textContent = "STATUS: Download starting server side.";
    });
    socket.on('downloadProgress', function(bytes) {
        statusField.textContent = "PROGRESS: " + bytes + " bytes downloaded...";
    });
    socket.on('fileReady', function(fileName) {
        search.disabled = false;
        search.style.cursor = "text";
        window.location = ("/download/?fileName=" + fileName);
        statusField.textContent = "Status: SUCCESS";
    });
    
    
    
}