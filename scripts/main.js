/**
 * Created by polakja15 on 06.01.2017.
 */
var canvas;
var ctx;
var editorTilesHor = 9;
var editorTilesVer = 16;
var editorVersion = "v0.1";

var moveEditor = false;
var mousePos = {x: 0, y: 0};
var editorOffset = {x: 0, y: 0};

var fileSystem;
var keyboardListener;

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

function errorHandler(e) {
    var msg = '';

    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    }

    console.log('Error: ' + msg);
}

function onInitFs(fs) {
    fileSystem = fs;
}

function removeFile(filePath) {
    fileSystem.root.getFile(filePath, {create: false}, function(fileEntry) {

        fileEntry.remove(function() {
        }, errorHandler);

    }, errorHandler);
}

function writeFile(filePath, content) {
    console.log(filePath);
    fileSystem.root.getFile(filePath, {create: true}, function(fileEntry) {

        // Create a FileWriter object for our FileEntry (log.txt).
        fileEntry.createWriter(function(fileWriter) {

            fileWriter.onwriteend = function(e) {
                console.log('Write completed.');
            };

            fileWriter.onerror = function(e) {
                console.log('Write failed: ' + e.toString());
            };

            fileWriter.write(content);

        }, errorHandler);

    }, errorHandler);
}

function readFile(filePath, callback) {
    fileSystem.root.getFile(filePath, {}, function(fileEntry) {
        fileEntry.file(function(file) {
            var reader = new FileReader();

            reader.onloadend = function(e) {
                callback(this.result);
            };

            reader.readAsText(file);
        }, errorHandler);

    }, errorHandler);
}

function createDir(rootDirEntry, folders) {
    // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
    if (folders[0] == '.' || folders[0] == '') {
        folders = folders.slice(1);
    }
    rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
        if (folders.length) {
            createDir(dirEntry, folders.slice(1));
        }
    }, errorHandler);
}

function removeDir(dirPath) {
    fileSystem.root.getDirectory(dirPath, {}, function(dirEntry) {

        dirEntry.removeRecursively(function() {
            console.log('Directory removed.');
        }, errorHandler);

    }, errorHandler);
}

function listFilesInDir(dirPath, callback) {
    fileSystem.root.getDirectory(dirPath,{}, function (res) {
        var dirReader = res.createReader();
        dirReader.readEntries(callback);
    });
}

function initEditor(canvasI) {
    canvas = canvasI;
    canvas.width = (document.body.clientWidth/ 100) * 70;
    canvas.height = document.body.clientHeight - 20;
    window.addEventListener("resize", function () {
        canvas.width = (document.body.clientWidth/ 100) * 70;
        canvas.height = document.body.clientHeight - 20;
    });
    ctx = canvas.getContext("2d");
    canvas.onclick = function (event) {
        onClick(event);
    };
    canvas.onmousemove = function (event) {
        onMouseMove(event);
    };
    keyboardListener = new window.keypress.Listener();
    keyboardListener.register_combo({"keys":"space", "on_keydown": function (a, b, c) {moveEditor = true;}, "on_release": function (a, b, c) {moveEditor = false;}, "prevent_repeat": true, "prevent_default": true});
    window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024*200, function(grantedBytes) {
        window.requestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
    }, function(e) {
        console.log('Error', e);
    });
}

function onMouseMove(event) {
    var tmpX = event.pageX - canvas.offsetLeft - mousePos.x;
    var tmpY = event.pageY - canvas.offsetTop - mousePos.y;
    mousePos.x += tmpX;
    mousePos.y += tmpY;
    if (moveEditor) {
        editorOffset.x += tmpX;
        editorOffset.y += tmpY;
    }
    drawEditor();
}

function drawEditor() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var img = document.getElementById("background");
    for (var x = -3; x < canvas.width/16 + 3; x++) {
        for (var y = -3; y < canvas.height/16 + 3; y++) {
            //if (x == Math.floor(mousePos.x / 16) && y == Math.floor(mousePos.y / 16))
            ctx.drawImage(img, (x + (editorOffset.x%16)/16) * 16, (y + (editorOffset.y%16)/16) * 16, 16, 16);
        }
    }
    editorOffset.x = editorOffset.x%32;
    editorOffset.y = editorOffset.y%32;
}

function onClick(event) {
    switch (event.target.nodeName) {
        case "CANVAS":
            console.log("clicked on canvas");
            break;
        case "A":
            switch (event.target.innerText) {
                case "New project":
                    var projectName = prompt("Please enter name for the project:");
                    createDir(fileSystem.root, [projectName]);
                    var projectIni = {name: projectName, editorVersion: editorVersion};
                    writeFile(projectName+"/project.ini", new Blob([JSON.stringify(projectIni)]));
                    listFilesInDir(projectName, function (files) {
                        var ul = document.getElementById("projectFiles");
                        ul.innerHTML = "";
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            ul.innerHTML += "<li>"+file.name+"</li>";
                        }
                    });
                    break;
                case "Open project":
                    var projectName = prompt("Please enter name for the project:");
                    listFilesInDir("/"+projectName, function (files) {
                        var ul = document.getElementById("projectFiles");
                        ul.innerHTML = "";
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            ul.innerHTML += "<li>"+file.name+"</li>";
                        }
                    });
                    break;
            }
            console.log("clicked on link");
    }
}