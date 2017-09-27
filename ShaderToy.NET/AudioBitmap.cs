using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

using SharpGL;
using SharpGL.SceneGraph.Primitives;
using SharpGL.SceneGraph;
using SharpGL.SceneGraph.Assets;

using NAudio.Dsp;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace ShaderToy.NET
{
    class AudioBitmap
    {

        public Bitmap audioBitmap;
        public event EventHandler<BitmapUpdateEventArgs> OnBitmapUpdated;

        float MaxValue = 0f;

        public AudioBitmap()
        {
            audioBitmap = new Bitmap(512, 2);
            for (int i = 0; i < 512; i++)
            {
                audioBitmap.SetPixel(i, 0, Color.White);
                audioBitmap.SetPixel(i, 1, Color.Black);
            }
        }

        public void Update(OpenGL gl,Complex[] result)
        {
            //Destroy Old Bitmap
            audioBitmap.Dispose();
            audioBitmap = new Bitmap(512, 2);
            //Create Bitmap
            for (int i = 0; i < 512; i++)
            {
                Complex c = result[i];
                double intensityDB = 10 * Math.Log10(c.X * c.X + c.Y * c.Y);
                double minDB = -90;
                if (intensityDB < minDB) intensityDB = minDB;
                double percent = intensityDB / minDB;
                //Console.WriteLine("% : " + percent);
                if (percent < 0) percent = 0;
                if (percent > 1) percent = 1;
                int val = Convert.ToInt16(percent * 255);
                //audioBitmap.SetPixel(i, 0, Color.FromArgb(sval, sval, sval));
                audioBitmap.SetPixel(i, 1, Color.FromArgb(255 - val, 255 - val, 255 - val));
                audioBitmap.SetPixel(i, 0, Color.FromArgb(255 - val, 255 - val, 255 - val));
            }
            OnBitmapUpdated.Invoke(this, new BitmapUpdateEventArgs(audioBitmap));
            //Console.WriteLine("BMP UPDT");
        }

        public void UpdateMax(float max)
        {
            MaxValue = max;
        }

    }
}
