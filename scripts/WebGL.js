/**
 * Created by polakja15 on 12.01.2017.
 */
var fragShader = "precision mediump float;\n" +
    "uniform vec2 resolution;\n" +
    "void main() {\n" +
    "   vec2 uv = (resolution.xy - gl_FragCoord.xy) / max(resolution.x, resolution.y);" +
    "   gl_FragColor = vec4(0.0, uv, 1.0);\n" +
    "}";
var fragShader2 = "precision mediump float;\n" +
    "uniform vec2 resolution;\n" +
    "void main() {\n" +
    "   vec2 uv = (resolution.xy - gl_FragCoord.xy) / max(resolution.x, resolution.y);" +
    "   gl_FragColor = vec4(uv, 0.0, 1.0);\n" +
    "}";
var vertShader = "attribute vec3 vPos;\n" +
    "void main(void) {\n" +
    "   gl_Position = vec4(vPos, 1.0);\n" +
    "}";
function WebGL(canvas) {
    this.canvas = canvas;
    this.buffers = {};
    this.gl = canvas.getContext("webgl");
    this.shaders = {};
    this.textureAtlas = null;
    this.ctrB = 0;
    this.ctrS = 0;

    this.init = function () {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        var shader = this.loadShader(fragShader, vertShader);
        this.loadBuffer([1.0,1.0,0.0,-1.0,1.0,0.0,1.0,-1.0,0.0,-1.0,-1.0,0.0], shader);
        this.loadBuffer([0.2,0.2,0.0,-0.2,0.2,0.0,0.2,-0.2,0.0,-0.2,-0.2,0.0], this.loadShader(fragShader2, vertShader));
    };

    this.draw = function () {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        for (var bufferID in this.buffers) {
            var buffer = this.buffers[bufferID];
            var shader = this.shaders[buffer.shader].shader;
            this.gl.useProgram(shader);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.vertexBuffer);
            this.gl.vertexAttribPointer(shader.vertexPos, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.uvBuffer);
            this.gl.vertexAttribPointer(shader.uvCoord, 2, gl.FLOAT, false, 0, 0);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(shader.shader, "texture"), 0);

            this.gl.uniform2fv(this.gl.getUniformLocation(shader, "resolution"), Float32Array.from([this.canvas.height, this.canvas.width]));

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
    };
    
    this.loadShader = function (fragShader, vertShader) {
        var frag = this.compileShader(fragShader, this.gl.FRAGMENT_SHADER);
        var vert = this.compileShader(vertShader, this.gl.VERTEX_SHADER);
        var program = this.createShaderProgram(frag, vert);
        this.gl.useProgram(program);
        var vPos = this.gl.getAttribLocation(program, "vPos");
        this.gl.enableVertexAttribArray(vPos);
        var uvCoord = gl.getAttribLocation(shaderProgram, "uvCoord");
        this.gl.enableVertexAttribArray(textureCoordAttribute);
        var id = this.ctrS++;
        this.shaders[id] = new Shader(vPos, uvCoord, program);
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
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        var uvBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uv), this.gl.STATIC_DRAW);
        var ret = this.ctrB++;
        this.buffers[ret] = new Buffer(vertexBuffer, uvBuffer, shader, textureID);
        return ret;
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