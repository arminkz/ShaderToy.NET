#version 330 core

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform vec3 iResolution;
uniform float iGlobalTime;

varying vec2 texc; //input texture coordinates from vertex shader

#define far 40.
#define eps .001
#define time iGlobalTime
#define PI 3.1415926

// Audio reactive threshold for color switch and reverse movement
#define THRESHOLD .4

#define A texture(iChannel0, vec2(.25, 0.)).r

#define r2(p, a) {p = p * cos(a) + sin(a) * vec2(p.y, -p.x);}

vec2 amod(vec2 p, float n)
{
    float g = 2. * PI / n,
          a = atan(p.y, p.x) + g*.5;
    a = mod(a, g)-g*.5;
    return vec2(cos(a), sin(a))*length(p);
}

float map(vec3 p)
{
    p *= .5;
    float s = A + .1;
    r2(p.xy, p.z*.2);
    p.xy += sin(p.z)*.2;
    p.xy = amod(p.xy, 8.);
    p.xz = (A > THRESHOLD) ? amod(p.zx, 8.) : amod(p.xz, 8.);
    p.xz -= time*2. + A;
    p.x = mod(p.x, 8.) - 4.;  
    p.z = mod(p.z, 4.) - 2.;
    p = abs(p);
    
    float d = length(max(p - s, 0.));
    float d2 = min(max(p.x, p.y), min(max(p.x, p.z), max(p.y, p.z)))- s*.9;
    return max(d, -d2);
}

float trace(vec3 ro, vec3 rd)
{
    float t = 0.,
          h;
    for (int i = 0; i < 128; i++)
    {
        vec3 p = ro + rd * t;
        h = map(p);
        t += h;
        if (h < eps || t > far) break;
    }
    return t;
}

vec3 calcNormal(vec3 p)
{
    vec2 e = vec2(eps, 0);
    return normalize(vec3(
        map(p+e.xyy)-map(p-e.xyy),
        map(p+e.yxy)-map(p-e.yxy),
        map(p+e.yyx)-map(p-e.yyx)
        ));
}

vec3 doColor(vec3 ro, vec3 rd, vec3 n, vec3 lp, float res)
{
    vec3 col = n-n,
         p = ro + rd * res,
         ld = lp - p,
         objCol = vec3(1.);
    if (res < far)
    {
        float len = length(ld),
              spec,
              amb = .25,
              atten = max(1./len*len, .001),
              diff;
        ld /= len;
        diff = max(dot(ld, n), 0.);
        spec = pow(max(0., dot(reflect(-ld, n), -rd)), 8.);
        col = objCol * (((diff + amb*.2)+spec*.1)+atten*.1);
        
    }
    return col;
}

void mainImage( out vec4 f, in vec2 g )
{
	vec2 R = iResolution.xy, u = (g+g-R)/R.y;
    vec3 ro = vec3(0, 0, 1),
         rd = normalize(vec3(u, -1)),
         lp = vec3(1, 3, 5),
         p = rd-rd,
         n=p,
         col=n;
    float t = trace(ro, rd);
    p = ro + rd * t;
    n = calcNormal(p);
    col = doColor(ro, rd, n, lp, t);
    f = (A > THRESHOLD) ? vec4(col, 1.) : vec4(1.-col, 1.);
}


void main(){
	mainImage(gl_FragColor,gl_FragCoord.xy);
}
