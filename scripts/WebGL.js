/**
 * Created by polakja15 on 12.01.2017.
 */
var fragShader = "precision mediump float;\n" +
    "uniform sampler2D texture;\n" +
    "varying highp vec2 vUV;\n" +
    "void main() {\n" +
    "   gl_FragColor = texture2D(texture, vUV);\n" +
    "}";
var vertShader = "attribute vec3 aVertexPos;\n" +
    "attribute vec2 aUVPos;\n" +
    "varying highp vec2 vUV;\n" +
    "void main(void) {\n" +
    "   gl_Position = vec4(aVertexPos, 1.0);\n" +
    "   //vUV = aUVPos;\n" +
    "}";

function WebGL(canvas) {
    this.canvas = canvas;
    this.buffers = {};
    this.gl = canvas.getContext("webgl");
    this.shaders = {};
    this.textures = {};
    this.ctrB = 0;
    this.ctrS = 0;
    this.ctrT = 0;

    this.init = function () {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        var shader = this.loadShader(fragShader, vertShader);
        this.loadBuffer([1,1,0, -1,1,0, 1,-1,0, -1,-1,0], [1,1, -1,1, 1,-1, -1,-1], this.loadTexture("assets/back.png"), shader);
    };

    this.draw = function () {
        if (this.texturesToLoad > 0) {
            console.log("Textures not loaded yet!");
            return;
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        for (var bufferID in this.buffers) {
            var buffer = this.buffers[bufferID];
            var shader = this.shaders[buffer.shader].shader;
            this.gl.useProgram(shader);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.vertexBuffer);
            this.gl.vertexAttribPointer(shader.vertexPos, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.uvBuffer);
            this.gl.vertexAttribPointer(shader.uvCoord, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[buffer.textureID]);
            this.gl.uniform1i(this.gl.getUniformLocation(shader, "texture"), 0);

            this.gl.uniform2fv(this.gl.getUniformLocation(shader, "resolution"), Float32Array.from([this.canvas.height, this.canvas.width]));

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
    };

    this.loadShader = function (fragShader, vertShader) {
        var frag = this.compileShader(fragShader, this.gl.FRAGMENT_SHADER);
        var vert = this.compileShader(vertShader, this.gl.VERTEX_SHADER);
        var program = this.createShaderProgram(frag, vert);
        this.gl.useProgram(program);
        var aVertexPos = this.gl.getAttribLocation(program, "aVertexPos");
        this.gl.enableVertexAttribArray(aVertexPos);
        var uvCoord = this.gl.getAttribLocation(program, "aUVPos");
        this.gl.enableVertexAttribArray(uvCoord);
        var id = this.ctrS++;
        this.shaders[id] = new Shader(aVertexPos, uvCoord, program);
        return id;
    };
    
    this.compileShader = function (code, type) {
        var shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, code);
        this.gl.compileShader(shader);
        var success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
        if (!success) {
            throw "could not compile shader:" + this.gl.getShaderInfoLog(shader);
        }
        return shader;
    };
    
    this.createShaderProgram = function (fragmentShader, vertexShader) {
        var program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        var success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!success) {
            throw ("program filed to link:" + this.gl.getProgramInfoLog (program));
        }
        return program;
    };

    this.loadBuffer = function (vertices, uv, textureID, shader) {
        var vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        var uvBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uv), this.gl.STATIC_DRAW);
        var ret = this.ctrB++;
        this.buffers[ret] = new Buffer(vertexBuffer, uvBuffer, shader, textureID);
        return ret;
    };

    this.texturesToLoad = 0;

    this.loadTexture = function (path) {
        this.texturesToLoad++;
        var image = new Image();
        var id = this.ctrT++;
        image.onload = function () {
            var texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.textures[id] = texture;
            this.texturesToLoad--;
        }.bind(this);
        image.src = path;
        console.log(this.ctrT);
        return id;
    };

    this.init();
}

function Shader(vertexPos, uvCoord, shader) {
    this.vertexPos = vertexPos;
    this.uvCoord = uvCoord;
    this.shader = shader;
}

function Buffer (vertexBuffer, uvBuffer, shader, textureID) {
    this.vertexBuffer = vertexBuffer;
    this.uvBuffer = uvBuffer;
    this.textureID = textureID;
    this.shader = shader;
}