/**
 * Default fragment shader. <b>Do not change!</b>
 * @type {string}
 */
var fragShader = "precision mediump float;\n" +
    "uniform sampler2D texture;\n" +
    "uniform vec3 color;\n" +
    "varying highp vec2 vUV;\n" +
    "void main() {\n" +
    "   gl_FragColor = texture2D(texture, vUV);\n" +
    "   //gl_FragColor = vec4(color, 1.0);\n" +
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
 * @param canvas Canvas to be used for rendering
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
    this.ctrF = 0;

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
     * Call this function to draw onto canvas or onto Framebuffer, if specified.
     * @param frameBuffer frame buffer to be drawn to. <i>Null</i> if want render to canvas. @type {FrameBuffer}
     */
    this.draw = function (frameBuffer) {
        if (this.texturesToLoad > 0) {
            console.log("Textures not loaded yet!");
            return;
        }
        if (frameBuffer != null && frameBuffer != undefined) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer.buffer);
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        for (var meshID in this.meshes) {
            if (!this.meshes.hasOwnProperty(meshID))
                continue;
            var mesh = this.meshes[meshID];
            this.gl.useProgram(mesh.shader.shader);

            //BUFFER BINDING
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.vertexBuffer);
            this.gl.vertexAttribPointer(mesh.shader.vertexPos, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.uvBuffer);
            this.gl.vertexAttribPointer(mesh.shader.uvCoord, 2, this.gl.FLOAT, false, 0, 0);

            //TEXTURE BINDING
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[mesh.texture.id].texture);
            this.gl.uniform1i(this.gl.getUniformLocation(mesh.shader.shader, "texture"), 0);

            // GLOBAL UNIFORMS
            this.gl.uniform2fv(this.gl.getUniformLocation(mesh.shader.shader, "resolution"), Float32Array.from([this.canvas.height, this.canvas.width]));

            //LOCAL UNIFORMS
            for (var uniform in mesh.uniforms) {
                uniform = mesh.uniforms[uniform];
                if (uniform.type == UniformTypes.m2f || uniform.type == UniformTypes.m3f || uniform.type == UniformTypes.m4f)
                    this.gl[uniform.type](this.gl.getUniformLocation(mesh.shader.shader, uniform.name), false, uniform.value);
                else
                    this.gl[uniform.type](this.gl.getUniformLocation(mesh.shader.shader, uniform.name), uniform.value);
            }

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
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
        var shader = new Shader(this.ctrS++, aVertexPos, uvCoord, program);
        this.shaders[shader.id] = shader;
        return shader;
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
        this.meshes[id] = new Mesh(id, this.gl, vertices, uv, shader, textureID);
        return this.meshes[id];
    };

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
        var tex = this.registerTexture(id, null);
        image.onload = function () {
            tex.setTexture(image);
            this.texturesToLoad--;
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
        if (id == null)
            id = this.ctrT++;
        var tex = new Texture(id, this.gl, texture);
        this.textures[id] = tex;
        return tex;
    };

    /**
     * Used to create Framebuffer for rendering to off-screen texture.
     * @returns {FrameBuffer}
     */
    this.createFramebuffer = function () {
        var fb = new FrameBuffer(this.ctrF++, this.gl);
        this.frameBuffers[fb.id] = fb;
        return fb;
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
 * Types of uniforms that can be passed to setLocalUniform method of @link {Mesh}
 * @type {{}}
 */
UniformTypes = {
   "1fv":  "uniform1fv",
    "2fv": "uniform2fv",
    "3fv": "uniform3fv",
    "4fv": "uniform4fv",
    "1iv":  "uniform1iv",
    "2iv": "uniform2iv",
    "3iv": "uniform3iv",
    "4iv": "uniform4iv",
    "m2f": "uniformMatrix2fv",
    "m3f": "uniformMatrix3fv",
    "m4f": "uniformMatrix4fv"
};

/**
 * <b>Do not use. Used internally.</b>
 * @param id ID of the mesh
 * @param gl Instance of {@link WebGL}
 * @param vertices Vertices float array
 * @param uv UV float array
 * @param shader Shader object
 * @param texture Texture ID.
 * @param [transformationMatrix] Optional parameter.
 * @constructor
 */
function Mesh (id, gl, vertices, uv, shader, texture, transformationMatrix) {
    this.id = id;
    this.gl = gl;
    this.vertexBuffer = this.gl.createBuffer();
    this.uvBuffer = this.gl.createBuffer();
    this.texture = texture;
    this.shader = shader;
    this.uniforms = [];

    /**
     * Used to set data to buffer of this mesh.
     * @param buffer Buffer too be changed.
     * @param data {Float32Array} Data to be written.
     */
    this.setBufferData = function (buffer, data) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
    };

    this.addLocalUniform = function (name, value, type) {
        this.uniforms.push(new UniformStruct(name, value, type))
    };

    this.setBufferData(this.vertexBuffer, vertices);
    this.setBufferData(this.uvBuffer, uv);
    //this.addLocalUniform("transformationMatrix", transformationMatrix, UniformTypes.m4f);
}

/**
 * <b>Do not use. Used internally.</b>
 * @param name {string} Name of the uniform in shader.
 * @param value Value to be sent.
 * @param type {UniformTypes} Type of the uniform @link {UniformTypes}
 * @constructor
 */
function UniformStruct(name, value, type) {
    this.name = name;
    this.value = value;
    this.type = type;
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

    if (texture != null && texture != undefined)
        this.setTexture(texture);
}

/**
 * <b>Do not use. Used internally.</b>
 * @param id ID of the framebuffer.
 * @param gl WebGLRenderingContext instance @type {WebGLRenderingContext}
 * @constructor
 */
function FrameBuffer(id, gl) {
    this.id = id;
    this.gl = gl;
    this.texture = new Texture(null, this.gl);
    this.buffer = this.gl.createFramebuffer();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture.texture, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
}