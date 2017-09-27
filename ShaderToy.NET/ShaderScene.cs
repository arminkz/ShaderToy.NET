using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Design;
using System.ComponentModel;
using System.Runtime.InteropServices;

using GlmNet;

using SharpGL;
using SharpGL.Shaders;
using SharpGL.SceneGraph.Core;
using SharpGL.VertexBuffers;

namespace ShaderToy.NET
{
    public class ShaderScene
    {
        //  Constants that specify the attribute indexes.
        const uint attributeIndexPosition = 0;

        //Texture Names Array
        private uint[] glTextureArray = new uint[2] { 0 , 0 };

        float resolutionX;
        float resolutionY;

        float time;

        //  The vertex buffer array which contains the vertex and texture coords buffers.
        VertexBufferArray vertexBufferArray;
        VertexBufferArray texCoordsBufferArray;

        private bool needsRefresh = true;

        private Shader ashader;
        public Shader ActiveShader
        {
            get
            {
                return ashader;
            }
            set
            {
                ashader = value;
                needsRefresh = true;
            }
        }

        //  The shader program for our vertex and fragment shader.
        private ShaderProgram shaderProgram;


        public ShaderScene(Shader shader)
        {
            this.ashader = shader;
        }

        /// <summary>
        /// Initialises the scene.
        /// </summary>
        /// <param name="gl">The OpenGL instance.</param>
        public void Initialise(OpenGL gl)
        {
            time = DateTime.Now.Millisecond / 1000;
            //  Set a blue clear colour.
            //gl.ClearColor(0.4f, 0.6f, 0.9f, 0.0f);

            //  Create the shader program.
            var vertexShaderSource = ResourceHelper.LoadTextFromRecource("ShaderToy.NET.Shaders.main.vert");
            var fragmentShaderSource = ResourceHelper.LoadTextFromRecource("ShaderToy.NET.Shaders." + ActiveShader.ResourceName + ".frag");
            shaderProgram = new ShaderProgram();
            shaderProgram.Create(gl, vertexShaderSource, fragmentShaderSource, null);

            shaderProgram.BindAttributeLocation(gl, attributeIndexPosition, "position");
            shaderProgram.AssertValid(gl);

            //Generate Textures
            gl.GenTextures(2, glTextureArray);
            //shaderProgram.BindAttributeLocation(gl, glTextureArray[0], "iChannel0");
            //shaderProgram.BindAttributeLocation(gl, glTextureArray[1], "iChannel1");
            var ch0loc = shaderProgram.GetUniformLocation(gl, "iChannel0");
            gl.ActiveTexture(OpenGL.GL_TEXTURE0);
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[0]);
            gl.Uniform1(ch0loc, 0);

            var ch1loc = shaderProgram.GetUniformLocation(gl, "iChannel1");
            gl.ActiveTexture(OpenGL.GL_TEXTURE1);
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[1]);
            gl.Uniform1(ch1loc, 1);

            /*gl.ActiveTexture(OpenGL.GL_TEXTURE0);
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[0]);
            gl.ActiveTexture(OpenGL.GL_TEXTURE1);
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[1]);*/

            //  Now create the geometry for the square.
            CreateVerticesForSquare(gl);

            needsRefresh = false;
        }

        /// <summary>
        /// Draws the scene.
        /// </summary>
        /// <param name="gl">The OpenGL instance.</param>
        public void Draw(OpenGL gl, float width, float height)
        {
            if (needsRefresh) Initialise(gl);

            resolutionX = width;
            resolutionY = height;

            //  Clear the scene.
            gl.Clear(OpenGL.GL_COLOR_BUFFER_BIT | OpenGL.GL_DEPTH_BUFFER_BIT | OpenGL.GL_STENCIL_BUFFER_BIT);

            //  Bind the shader, set the matrices.
            shaderProgram.Bind(gl);

            shaderProgram.SetUniform3(gl, "iResolution", resolutionX, resolutionY, 0.0f);
            shaderProgram.SetUniform1(gl, "iGlobalTime", time);
            
            time += 0.1f;

            //  Bind the out vertex array.
            vertexBufferArray.Bind(gl);
            texCoordsBufferArray.Bind(gl);

            //Bind Textures
            var ch0loc = shaderProgram.GetUniformLocation(gl, "iChannel0");
            gl.ActiveTexture(OpenGL.GL_TEXTURE0);
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[0]);
            gl.Uniform1(ch0loc, 0);

            var ch1loc = shaderProgram.GetUniformLocation(gl, "iChannel1");
            gl.ActiveTexture(OpenGL.GL_TEXTURE1);
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[1]);
            gl.Uniform1(ch1loc, 1);

            //  Draw the square.
            gl.DrawArrays(OpenGL.GL_TRIANGLES, 0, 6);

            //  Unbind our vertex array and shader.
            vertexBufferArray.Unbind(gl);
            texCoordsBufferArray.Unbind(gl);


            shaderProgram.Unbind(gl);
        }

        /// <summary>
        /// The width of the texture images.
        /// </summary>
        private int[] width = new int[2] { 0, 0 };

        /// <summary>
        /// The height of the texture images.
        /// </summary>
        private int[] height = new int[2] { 0, 0 };

        /// <summary>
        /// updates pixel data of the desired texture.
        /// </summary>
        public void UpdateTextureBitmap(OpenGL gl, int texIndex , Bitmap image)
        {
            int[] textureMaxSize = { 0 };
            gl.GetInteger(OpenGL.GL_MAX_TEXTURE_SIZE, textureMaxSize);

            if (image == null) return;
 
            //	Find the target width and height sizes, which is just the highest
            //	posible power of two that'll fit into the image.
            int targetWidth = textureMaxSize[0];
            int targetHeight = textureMaxSize[0];

            //Console.WriteLine("Updating Tex " + texIndex + "Tex Max Size : " + targetWidth + "x" + targetHeight);

            for (int size = 1; size <= textureMaxSize[0]; size *= 2)
            {
                if (image.Width < size)
                {
                    targetWidth = size / 2;
                    break;
                }
                if (image.Width == size)
                    targetWidth = size;

            }

            for (int size = 1; size <= textureMaxSize[0]; size *= 2)
            {
                if (image.Height < size)
                {
                    targetHeight = size / 2;
                    break;
                }
                if (image.Height == size)
                    targetHeight = size;
            }

            //  If need to scale, do so now.
            if (image.Width != targetWidth || image.Height != targetHeight)
            {
                //  Resize the image.
                Image newImage = image.GetThumbnailImage(targetWidth, targetHeight, null, IntPtr.Zero);

                //  Destory the old image, and reset.
                image.Dispose();
                image = (Bitmap)newImage;
            }

            //  Lock the image bits (so that we can pass them to OGL).
            BitmapData bitmapData = image.LockBits(new Rectangle(0, 0, image.Width, image.Height),
                ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);

            //	Set the width and height.
            width[texIndex] = image.Width;
            height[texIndex] = image.Height;

            if(texIndex == 0)
            gl.ActiveTexture(OpenGL.GL_TEXTURE0);
            else
            gl.ActiveTexture(OpenGL.GL_TEXTURE1);

            //	Bind our texture object (make it the current texture).
            gl.BindTexture(OpenGL.GL_TEXTURE_2D, glTextureArray[texIndex]);

            //  Set the image data.
            gl.TexImage2D(OpenGL.GL_TEXTURE_2D, 0, (int)OpenGL.GL_RGBA,
                width[texIndex], height[texIndex], 0, OpenGL.GL_BGRA, OpenGL.GL_UNSIGNED_BYTE,
                bitmapData.Scan0);

            //  Unlock the image.
            image.UnlockBits(bitmapData);

            //  Dispose of the image file.
            image.Dispose();

            //  Set linear filtering mode.
            gl.TexParameter(OpenGL.GL_TEXTURE_2D, OpenGL.GL_TEXTURE_MIN_FILTER, OpenGL.GL_LINEAR);
            gl.TexParameter(OpenGL.GL_TEXTURE_2D, OpenGL.GL_TEXTURE_MAG_FILTER, OpenGL.GL_LINEAR);

        }


        /// <summary>
        /// Creates the geometry for the square, also creating the vertex buffer array.
        /// </summary>
        /// <param name="gl">The OpenGL instance.</param>
        private void CreateVerticesForSquare(OpenGL gl)
        {
            var vertices = new float[18];
            vertices[0] = -1.0f; vertices[1] = -1.0f; vertices[2] = 0.0f; // Bottom left corner  
            vertices[3] = -1.0f; vertices[4] = 1.0f; vertices[5] = 0.0f; // Top left corner  
            vertices[6] = 1.0f; vertices[7] = 1.0f; vertices[8] = 0.0f; // Top Right corner  
            vertices[9] = 1.0f; vertices[10] = -1.0f; vertices[11] = 0.0f; // Bottom right corner  
            vertices[12] = -1.0f; vertices[13] = -1.0f; vertices[14] = 0.0f; // Bottom left corner  
            vertices[15] = 1.0f; vertices[16] = 1.0f; vertices[17] = 0.0f; // Top Right corner   

            var texcoords = new float[12];
            texcoords[0] = 0.0f; texcoords[1] = 0.0f;
            texcoords[2] = 0.0f; texcoords[3] = 1.0f;
            texcoords[4] = 1.0f; texcoords[5] = 1.0f;
            texcoords[6] = 1.0f; texcoords[7] = 0.0f;
            texcoords[8] = 0.0f; texcoords[9] = 0.0f;
            texcoords[10] = 1.0f; texcoords[11] = 1.0f;

            //  Create the vertex array object.
            vertexBufferArray = new VertexBufferArray();
            vertexBufferArray.Create(gl);
            vertexBufferArray.Bind(gl);

            texCoordsBufferArray = new VertexBufferArray();
            texCoordsBufferArray.Create(gl);
            texCoordsBufferArray.Bind(gl);


            //  Create a vertex buffer for the vertex data.
            var vertexDataBuffer = new VertexBuffer();
            vertexDataBuffer.Create(gl);
            vertexDataBuffer.Bind(gl);
            vertexDataBuffer.SetData(gl, 0, vertices, false, 3);

            var texCoordsBuffer = new VertexBuffer();
            texCoordsBuffer.Create(gl);
            texCoordsBuffer.Bind(gl);
            texCoordsBuffer.SetData(gl, 1, texcoords, false, 2);

            //  Now do the same for the colour data.
            /*var colourDataBuffer = new VertexBuffer();
            colourDataBuffer.Create(gl);
            colourDataBuffer.Bind(gl);
            colourDataBuffer.SetData(gl, 1, colors, false, 3);*/

            //  Unbind the vertex array, we've finished specifying data for it.
            vertexBufferArray.Unbind(gl);
            texCoordsBufferArray.Unbind(gl);
        }

    }
}
