using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace ShaderToy.NET
{
    public class Shader
    {

        public Shader(string name,string res)
        {
            this.Name = name;
            this.ResourceName = res;

        }

        public string Name { get; set; }
        public string ResourceName { get; set; }

        public bool soundEnabled { get; set; }

    } 
}
