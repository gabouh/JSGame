/**
 * Created by Jan on 09/01/2017.
 */
var fileSystem;
var keyboardListener;

var onFileChange = null;

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

function errorHandler(e) {
    var msg = '';

    switch (e.code) {
        case DOMError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case DOMError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case DOMError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case DOMError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case DOMError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    }

    console.log('Error: ' + msg);
    console.log(e);
}

function onInitFs(fs) {
    fileSystem = fs;
}

function removeFile(filePath, callback) {
    fileSystem.root.getFile(filePath, {create: false}, function(fileEntry) {

        fileEntry.remove(function() {
            if (callback != null)
                callback();
        }, errorHandler);

    }, errorHandler);
}

function writeFile(filePath, content, callback) {
    fileSystem.root.getFile(filePath, {create: true}, function(fileEntry) {

        // Create a FileWriter object for our FileEntry (log.txt).
        fileEntry.createWriter(function(fileWriter) {

            fileWriter.onwriteend = function(e) {
                console.log('Write completed.');
                callback();
            };

            fileWriter.onerror = function(e) {
                console.log('Write failed: ' + e.toString());
            };

            fileWriter.write(content);

        }, errorHandler);
    }, errorHandler);
    if (onFileChange != null)
        onFileChange();
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

function createDir(rootDirEntry, folder, callback) {
    rootDirEntry.getDirectory(folder, {create: true}, function(dirEntry) {
        callback();
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
    fileSystem.root.getDirectory(dirPath, {}, function (res) {
        var dirReader = res.createReader();
        dirReader.readEntries(callback);
    });
}

function initFiles() {
    window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024*200, function(grantedBytes) {
        window.requestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
    }, function(e) {
        console.log('Error', e);
    });
}