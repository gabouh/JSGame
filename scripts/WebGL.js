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
    "   vUV = aUVPos;\n" +
    "}";

/**
 * Returns WebGL renderer instance.
 * @param canvas Canvas to be used for rendering (!!! May be subject of change to allow rendering to texture to allow image postprocessing)
 * @constructor
 */
function WebGL(canvas) {
    this.canvas = canvas;
    this.meshes = {};
    this.gl = canvas.getContext("webgl");
    this.shaders = {};
    this.textures = {};
    this.ctrB = 0;
    this.ctrS = 0;
    this.ctrT = 0;

    /**
     * <b>Do not use. Used internally.</b>
     * Used for object initialization.
     */
    this.init = function () {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    };

    /**
     * Call this function to draw onto canvas (TODO: Allow rendering to texture)
     */
    this.draw = function () {
        if (this.texturesToLoad > 0) {
            console.log("Textures not loaded yet!");
            return;
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        for (var meshID in this.meshes) {
            if (!this.meshes.hasOwnProperty(meshID))
                continue;
            var mesh = this.meshes[meshID];
            var shader = this.shaders[mesh.shader];
            this.gl.useProgram(shader.shader);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.vertexBuffer);
            this.gl.vertexAttribPointer(shader.vertexPos, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.uvBuffer);
            this.gl.vertexAttribPointer(shader.uvCoord, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[mesh.textureID]);
            this.gl.uniform1i(this.gl.getUniformLocation(shader.shader, "texture"), 0);

            this.gl.uniform2fv(this.gl.getUniformLocation(shader.shader, "resolution"), Float32Array.from([this.canvas.height, this.canvas.width]));

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
    };

    /**
     * Use this to load shader onto GPU
     * @param fragShader Source code of fragment shader.
     * @param vertShader Source code of vertex shader.
     * @returns {*} Shader object. Please refer to {@link Shader}
     */
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
        return this.shaders[id];
    };

    /**
     * <b>Do not use. Used internally.</b>
     * Compiles shader and loads it onto GPU
     * @param code Code of the shader.
     * @param type Specifies shader type (gl.FRAGMENT_SHADER or gl.VERTEX_SHADER)
     * @returns {WebGLShader}
     */
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

    /**
     * <b>Do not use. Used internally.</b>
     * Creates shader program from two shaders.
     * @param fragmentShader Fragment shader position.
     * @param vertexShader Vertex shader position.
     * @returns {WebGLProgram}
     */
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

    /**
     * Load
     * @param vertices
     * @param uv
     * @param shader
     * @param textureID
     * @returns {*}
     */
    this.loadMesh = function (vertices, uv, shader, textureID) {
        var vertexBuffer =
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        var uvBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uv), this.gl.STATIC_DRAW);
        var ret = this.ctrB++;
        this.meshes[ret] = new Mesh(ret, vertexBuffer, uvBuffer, shader, textureID);
        return this.meshes[ret];
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
        return id;
    };

    this.init();
}

/**
 * <b>Do not use. Used internally.</b>
 * @param id ID of the shader
 * @param vertexPos attribute pos
 * @param uvCoord attribute pos
 * @param shader shader pos
 * @constructor
 */
function Shader(id, vertexPos, uvCoord, shader) {
    this.id = id;
    this.vertexPos = vertexPos;
    this.uvCoord = uvCoord;
    this.shader = shader;
}

/**
 * <b>Do not use. Used internally.</b>
 * @param id ID of the mesh
 * @param gl Instace of {@link WebGL}
 * @param vertices Vertices float array
 * @param uv UV float array
 * @param shader Shader object
 * @param textureID Texture ID.
 * @param transformationMatrix
 * @constructor
 */
function Mesh (id, gl, vertices, uv, shader, textureID, transformationMatrix /* OPTIONAL */) {
    this.id = id;
    this.gl = gl;
    this.vertexBuffer = this.gl.createBuffer();
    this.uvBuffer = this.gl.createBuffer();
    this.textureID = textureID;
    this.shader = shader;
    this.transformationMatrix = transformationMatrix;

    this.setBufferData = function (buffer, data) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
    };

    this.setBufferData(this.vertexBuffer, vertices);
    this.setBufferData(this.uvBuffer, uv);
}