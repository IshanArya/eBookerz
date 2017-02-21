window.onload = function() {
    var socket = io();
    
    var search = document.getElementById('search');
    var form = document.getElementById('box');
    var button = document.getElementById('btn');
    
    var statusField = document.getElementById('status');
    
    search.addEventListener('focus', function() {
        search.classList.add("search-focus");
    });
    search.addEventListener('blur', function() {
        search.classList.remove("search-focus");
    });
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var query = search.value.trim();
        if (query) {
            var request = new XMLHttpRequest();
    		request.open('POST', '/search', true);
    		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    		request.onload = function() {
    		    if (request.status !== 200) {
    		        console.error('Request failed.  Returned status of ' + request.status);
    		    }
    		};
    		request.send("query=" + query + "&socketid=" + socket.id);
        }
        search.value = "";
        search.disabled = true;
        search.style.cursor = "not-allowed";
        statusField.textContent = "Status: WAIT";
        search.blur();
    });
    
    socket.on('download', function(downloadInfo) {
        search.disabled = false;
        search.style.cursor = "text";
        window.location = ("/download/?fileName=" + downloadInfo.fileName + "&fileIndex=" + downloadInfo.fileIndex);
        statusField.textContent = "Status: SUCCESS";
    });
    
    
    
}