/**
 * Created by polakja15 on 06.01.2017.
 */
var canvas;
var ctx;
var editorVersion = "v0.1a";

var moveEditor = false;
var mousePos = {x: 0, y: 0};
var editorOffset = {x: 0, y: 0};

function initEditor(canvasI) {
    canvas = canvasI;
    canvas.width = (document.body.clientWidth/ 100) * 50;
    canvas.height = document.body.clientHeight - 20;
    window.addEventListener("resize", function () {
        canvas.width = (document.body.clientWidth/ 100) * 50;
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
    initFiles();
    drawEditor();
    onFileChange = function () {
        openProject(window.localStorage.projectName);
    };
    $("#leftPanel").resizable({
        minWidth: 150,
        maxWidth: 500,
        resize: function (event, ui) {
            canvas.width = document.body.clientWidth - $("#leftPanel").innerWidth() - $("#rightPanel").innerWidth()-1;
            drawEditor();
        }
    });
    $("#rightPanel").resizable({
        minWidth: 150,
        maxWidth: 500,
        handles: "w",
        resize: function (event, ui){
            canvas.width = document.body.clientWidth - $("#leftPanel").innerWidth() - $("#rightPanel").innerWidth();
            ui.position.left = ui.originalPosition.left;
            drawEditor();
        }
    });
    $("#projectFiles").jstree({'core' : {
        "check_callback" : function (operation, node, node_parent, node_position, more) {
            if (operation == "move_node" && node_parent != undefined && node_parent.li_attr != undefined) {
                return !node_parent.li_attr["data-open"];
            }
            return true;
        },
        "themes": {
            "name": "default-dark",
            "dots": false,
            "icons": false
        }, "content": []}, "plugins" : ["contextmenu", "dnd", "unique", "wholerow", "state"],
            "contextmenu":{
                "items": function($node) {
                    var tree = $("#projectFiles").jstree(true);
                    var object = {};
                    if (!$node.li_attr["data-open"]) {
                        object.Create = {
                            "separator_before": false,
                            "separator_after": false,
                            "label": "Create",
                            "action": function (obj) {
                                $node = tree.create_node($node);
                                tree.edit($node);
                            }
                        }
                    }
                    object.Rename = {
                        "separator_before": false,
                        "separator_after": false,
                        "label": "Rename",
                        "action": function (obj) {
                            tree.edit($node);
                        }
                    };
                    object.Remove = {
                        "separator_before": false,
                        "separator_after": false,
                        "label": "Remove",
                        "action": function (obj) {
                            tree.delete_node($node);
                        }
                    };
                    return object;
                }
            }});
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
    for (var x = -3; x < canvas.width/48 + 3; x++) {
        for (var y = -3; y < canvas.height/48+ 3; y++) {
            //if (x == Math.floor(mousePos.x / 16) && y == Math.floor(mousePos.y / 16))
            ctx.drawImage(img, (x + (editorOffset.x%48)/48) * 48, (y + (editorOffset.y%48)/48) * 48, 48, 48);
        }
    }
    editorOffset.x = editorOffset.x%96;
    editorOffset.y = editorOffset.y%96;
}

function onClick(event) {
    switch (event.target.nodeName) {
        case "CANVAS":
            console.log("clicked on canvas");
            break;
        case "A":
            switch (event.target.innerText) {
                case "New project":
                    var projectNameLocal = prompt("Please enter name for the project:");
                    createDir(fileSystem.root, "projects", function () {
                        fileSystem.root.getDirectory("/projects/", {}, function (res) {
                            createDir(res, projectNameLocal, function () {
                                var projectIni = {name: projectNameLocal, editorVersion: editorVersion};
                                writeFile("projects/" + projectNameLocal + "/project.ini", new Blob([JSON.stringify(projectIni)]), function () {
                                    openProject(projectNameLocal);
                                });
                                writeFile("projects/" + projectNameLocal + "/main.scene", new Blob(["{\"name\":\"main\"}"]), function () {

                                });
                            });
                        });
                    });
                    break;
                case "Open project":
                    var modal = "<div class='modal'><ul id='projects' class='horizontalList'></ul><button onclick='document.body.removeChild(document.getElementsByClassName(\"modalBack\")[0])'>Cancel</button></div>";
                    var div = document.createElement("div");
                    div.className = "modalBack";
                    div.innerHTML = modal;
                    document.body.appendChild(div);
                    listFilesInDir("/projects/", function (projects) {
                        var ul = document.getElementById("projects");
                        if (projects.length == 0) {
                            ul.innerHTML += "<a href='javascript:void(0)'><li>No projects found</li></a>"
                        } else {
                            for (var i = 0; i < projects.length; i++) {
                                var project = projects[i];
                                ul.innerHTML += "<a href='javascript:void(0)' onclick='openProject(this.childNodes[0].innerHTML);document.body.removeChild(document.getElementsByClassName(\"modalBack\")[0]);'><li>" + project.name + "</li></a>"
                            }
                        }
                    });
                    break;
                case "Import file(s)":

                    //window.open("spriteEditor.html", "_blank", "top=200,left=500,width=800,height=500");
            }
            console.log("clicked on link");
    }
}

function createFileInProject(parent) {

}

function deleteFileInProject(file) {

}

var projectFileStructure = [];

function openFolder(name, parentFolder) {
    if (parentFolder == null)
        parentFolder = "#";
    listFilesInDir("/projects/" + window.localStorage.projectName + "/" + name, function (files) {
        var final = true;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file.isDirectory) {
                openFolder(name + "/" + file.name, "entry"+projectFileStructure.length);
                final = false;
            }
            projectFileStructure.push({id: "entry"+projectFileStructure.length, li_attr: {"data-open": !file.isDirectory,"data-file": name + "/" + file.name}, text: file.name, parent: parentFolder});
        }
        if (final) {
            var projectFiles = $("#projectFiles");
            projectFiles.jstree(true).settings.core.data = projectFileStructure;
            projectFiles.jstree("refresh");
        }
    });
}

function openProject(name) {
    window.localStorage.projectName = name;
    projectFileStructure = [];
    openFolder("/");
    var projectFiles = $("#projectFiles");
    projectFiles.on("move_node.jstree", function(e, data) {
        var node = data.node;
        var parent = "";
        if (data.parent == "#")
            parent = "/";
        else
            parent = $("#" + data.parent)[0].dataset["file"];
        var projectPath = "projects/" + window.localStorage.projectName + "/";
        moveEntry(projectPath + node.li_attr["data-file"],projectPath + parent);
    });
    projectFiles.on("rename_node.jstree", function (e, node) {
        var projectPath = "projects/" + window.localStorage.projectName + "/";
        var path = node.node.li_attr["data-file"];
        path = path.substr(0, path.lastIndexOf("/")+1);
        renameEntry(projectPath + node.node.li_attr["data-file"], projectPath + path + node.text)
    });
    projectFiles.on("click.jstree", function (e) {
        if (e.originalEvent == undefined || e.originalEvent.type != "keydown")
            return;
        var li = $(event.target).closest("li");
        if (li.data("open")) {
            openFile(li.data("file"));
        }
    });
    projectFiles.on("delete_node.jstree", function (e, node) {
        node = node.node;
        var projectPath = "projects/" + window.localStorage.projectName + "/";
        console.log(projectPath + node.li_attr["data-file"]);
        if (node.li_attr["data-open"]) {
            removeFile(projectPath + node.li_attr["data-file"], function (e) {
                openProject(window.localStorage.projectName);
            });
        } else {
            removeDir(projectPath+node.li_attr["data-file"], function (e) {
                openProject(window.localStorage.projectName);
            })
        }
    });
    projectFiles.on("dblclick.jstree", function (e) {
        var li = $(event.target).closest("li");
        if (li.data("open")) {
            openFile(li.data("file"));
        }
    });
}

function openFile(e) {
    var win = window.open("fileEditor.html", "_blank", "top=200,left=500,width=800,height=500");
    readFile("/projects/" + window.localStorage.projectName + "/" + e, function (c) {
        win.onload = function () {
            win.document.getElementById("fileC").innerHTML = JSON.stringify({name: e, content: c});
        }
    });
}