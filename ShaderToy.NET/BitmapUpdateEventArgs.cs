using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;

namespace ShaderToy.NET
{
    class BitmapUpdateEventArgs : EventArgs
    {

        public BitmapUpdateEventArgs(Bitmap img)
        {
            this.image = img;
        }

        public Bitmap image { get; private set; }
    }
}
