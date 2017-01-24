/**
 * Default fragment shader. <b>Do not change!</b>
 * @type {string}
 */
var fragShader = "precision mediump float;\n" +
    "uniform sampler2D texture;\n" +
    "varying highp vec2 vUV;\n" +
    "void main() {\n" +
    "   gl_FragColor = texture2D(texture, vUV);\n" +
    "}";
/**
 * Default vertex shader. <b>Do not change!</b>
 * @type {string}
 */
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
    this.gl = canvas.getContext("webgl");
    this.meshes = {};
    this.shaders = {};
    this.textures = {};
    this.frameBuffers = {};
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
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[mesh.texture.id].texture);
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
     * Loads mesh onto GPU and returns object
     * @param vertices Vertices float array
     * @param uv UV float array
     * @param shader Shader object
     * @param textureID Texture ID.
     * @returns {Mesh}
     */
    this.loadMesh = function (vertices, uv, shader, textureID) {
        var id = this.ctrB++;
        this.meshes[id] = new Mesh(id, vertices, uv, shader, textureID);
        return this.meshes[id];
    };

    /**
     * <b>Do not modify. Used internally.</b>
     * @type {number}
     */
    this.texturesToLoad = 0;

    /**
     * Loads texture and registers it using @link {this.registerTexture}
     * @param path Relative path to the image file. @type {String}
     * @returns {Texture}
     */
    this.loadTexture = function (path) {
        this.texturesToLoad++;
        var image = new Image();
        var id = this.ctrT++;
        var tex = null;
        image.onload = function () {
            this.registerTexture(id, image);
        }.bind(this);
        image.src = path;
        return tex;
    };

    /**
     * Registers texture to this renderer
     * @param id ID to register as (null for automatic) @type {number}
     * @param texture The Image object @type {Image}
     */
    this.registerTexture = function (id, texture) {
        tex = new Texture(id, this.gl, texture);
        this.textures[id] = tex;
        this.texturesToLoad--;
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
 * @param gl Instance of {@link WebGL}
 * @param vertices Vertices float array
 * @param uv UV float array
 * @param shader Shader object
 * @param texture Texture ID.
 * @param transformationMatrix Optional parameter.
 * @constructor
 */
function Mesh (id, gl, vertices, uv, shader, texture, transformationMatrix /* OPTIONAL */) {
    this.id = id;
    this.gl = gl;
    this.vertexBuffer = this.gl.createBuffer();
    this.uvBuffer = this.gl.createBuffer();
    this.texture = texture;
    this.shader = shader;
    this.transformationMatrix = transformationMatrix;

    /**
     * Used to set data to buffer of this mesh.
     * @param buffer Buffer too be changed.
     * @param data Data to be written. @type {Float32Array}
     */
    this.setBufferData = function (buffer, data) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
    };

    this.setBufferData(this.vertexBuffer, vertices);
    this.setBufferData(this.uvBuffer, uv);
}

/**
 * <b>Do not use. Used internally.</b>
 * @param id ID of the texture
 * @param gl Instance of {@link WebGL}
 * @param texture Texture object @type {Image}
 * @constructor
 */
function Texture(id, gl, texture) {
    this.id = id;
    this.gl = gl;
    this.texture = this.gl.createTexture();

    /**
     * Allows replacing data of this texture.
     * @param texture Texture to be loaded to GPU @type {Image}
     */
    this.setTexture = function (texture) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    };

    if (texture != null)
        this.setTexture(texture);
}

/**
 *
 * @param id
 * @param glRenderer WebGL instance @type {WebGL}
 * @constructor
 */
function FrameBuffer(id, glRenderer) {
    this.id = id;
    this.glRenderer = glRenderer;
    this.texture = new Texture(this.glRenderer.ctrT++, this.glRenderer.gl);
    this.buffer = this.gl.createFrameBuffer();
}