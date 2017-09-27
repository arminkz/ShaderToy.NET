#version 330 core

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform vec3 iResolution;
uniform float iGlobalTime;

varying vec2 texc; //input texture coordinates from vertex shader

#define MAX_STEPS 			125
#define MAX_DISTANCE 		9.5
#define MARCHING_STEP_INC 	.27
#define EPSILON 			.01

#define PI 3.14159265358979323846
#define TIMER(sec, min, max) (((mod(iGlobalTime, (sec)) * ((max) - min)) / (sec)) + (min))

int mode = 0;
float rz, rx, ry;
float b[4];
float o[4];
float scol[7];

vec3 final_color = vec3(0.);
float current_depth = 1.;
vec3 current_color = vec3(0.);

#define MAX_DISPLACE	 	.25
#define MAX_COLOR_BLEED		.1
void colorize(in float depth, in vec3 color) {
    float c = smoothstep(depth-MAX_COLOR_BLEED, depth+MAX_COLOR_BLEED, current_depth);
	float d = smoothstep(depth-MAX_DISPLACE, depth+MAX_DISPLACE, current_depth);
    
	current_depth= depth*(d) + current_depth*(1.-d);
	current_color = (1.-c)*current_color + (c)*color;
}

vec4 texCube(in sampler2D sam, in vec3 p, in vec3 n, in float k ) {
	vec4 x = texture( sam, p.yz );
	vec4 y = texture( sam, p.zx );
	vec4 z = texture( sam, p.xy );
    vec3 w = pow( abs(n), vec3(k) );
	return (x*w.x + y*w.y + z*w.z) / (w.x+w.y+w.z);
}

mat2 mm2(in float a) {float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}

#define K 12.
float smin(in float a, in float bb ) {
    float res = exp( -K*a ) + exp( -K*bb ); return -log( res )/K;
}

float sdTorus(in vec3 p, in vec2 t){
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;

}
vec3 opTwist(in vec3 p, in float d){float  c = cos(d*p.y+d); float  s = sin(d*p.y+d); mat2   m = mat2(c,-s,s,c); return vec3(m*p.xz,p.y);}

float scene(in vec3 p) {
    
    //float n1 = fract(sin(dot((vec2(floor(p.xz*30.234))), vec2(62.9898, 238.233)))*43758.5453)+.5;
    float n1 = fract(sin(dot((vec2(floor(p.yz*30.234))), vec2(62.9898, 238.233)))*43.5453);
    p.z -=n1*.01;
    
    //p = opTwist(p, b[1]*.4);
    
    p*=1. + scol[0]*.1;
    
    vec3 tmp = p;
    tmp*=2. - scol[2]*.35;
    
    o[0] = sdTorus(tmp, vec2(1.+scol[2], .15)) - cos(1.5*tmp.x)*cos(1.5*tmp.y)*cos(1.5*tmp.z);
    o[2] = sdTorus(tmp, vec2(1.+scol[4], .15)) - sin(1.5*tmp.x)*sin(1.5*tmp.y)*sin(1.5*tmp.z);
    
    tmp = p;  
    tmp.xy*=mm2(PI*.5);

    o[1] = sdTorus(tmp, vec2(1.+scol[3], .15)) - cos(1.5*tmp.x)*cos(1.5*tmp.y)*cos(1.5*tmp.z);
    o[3] = sdTorus(tmp, vec2(1.+scol[5], .15)) - sin(1.5*tmp.x)*sin(1.5*tmp.y)*sin(1.5*tmp.z);

    return smin(o[0], smin(o[1], smin(o[2], o[3])));
    

}

float rayMarch(in vec3 origin, in vec3 ray) {
	float t = 0.;
	for (int i=0; i < MAX_STEPS; i++) {
		float d = scene(origin + ray*t);
        if (d < EPSILON) break;
        t += d*MARCHING_STEP_INC;
        if (t > MAX_DISTANCE) break;
	}
    return t;
}

float ambientOcculation(in vec3 origin, in vec3 ray) {
    const float delta = 0.1;
    const int samples = 6;
    float r = 0.;
    for (int i=1; i <= samples; i++) {
        float t = delta * float(i);
        float d = scene(origin + ray*t);
        float len = abs(t - d);
        r += len * pow(2.0, -float(i));
    }
    return r;
}

float shadowSample(in vec3 origin, in vec3 ray) {
    float r = 1.;
    float t = 1.;
    const int samples = 6;
    for (int i=0; i <= samples; i++) {
        float d = scene(origin + ray*t);
        r = min(r, 16.0*d/t);
        t += d;
    }
    return max(0., r);
}

vec3 getNormal(in vec3 p, in float ep) {
	float d0 = scene(p);
	float dX = scene(p - vec3(ep, 0.0, 0.0));
	float dY = scene(p - vec3(0.0, ep, 0.0));
	float dZ = scene(p - vec3(0.0, 0.0, ep));

	return normalize(vec3(dX-d0, dY-d0, dZ-d0));
}

float f1(in float x) {
    return sqrt(1.-(x-1.)*(x-1.));

}

vec3 interference(in vec2 uv, in vec3 s, in float d) {
    vec2 uv2 = uv - d;
    s *= abs (.12/sin(uv2.y) ); 
    return s;
}



vec3 starfield(in vec2 uv) {
    vec3 col = vec3(.0);    
    
     vec3 col1 = vec3(.0);
     vec3 col2 = vec3(.0);
     vec3 col3 = vec3(.0);
   
    float rmove = 1.5;// + b[1];
    vec3 ray = vec3(uv*.8, rmove);
    
  
    

    
	ray.xy*=mm2(TIMER(10. ,0., -PI*2.));
    ray.x+=.9;
    ray.y+=.2;
    vec3 t = ray/max(abs(ray.x), abs(ray.y));
    vec3 p = 1.*t+.5;
       
    for(int i=0; i<3; i++) {
        float n1 = fract(sin(dot((vec2(floor(p.xy*30.234))), vec2(62.9898, 238.233)))*43758.5453)+.5;
        float n2 = fract(sin(dot((vec2(floor(p.xy*30.234))), vec2(12.9898, 78.233)))*43758.5453)+.5;
        float n3 = fract(sin(dot((vec2(floor(p.xy*30.234))), vec2(115.9898, 178.233)))*43758.5453)+.5;
        
        
        float z1 = fract(cos(n1)-sin(n1)-iGlobalTime*.2);  
        float z2 = fract(cos(n2)-sin(n2)-iGlobalTime*.2);
        float z3 = fract(cos(n3)-sin(n3)-iGlobalTime*.2);
        
         float dmult = 25.;
        float d1 = dmult*z1-p.z;
        float d2 = dmult*z2-p.z;
        float d3 = dmult*z3-p.z;
        
        
        
        float j1 = max(0., 1.5-2.*length(fract(p.xy)-.5));
        float j2 = max(0., 1.5-2.*length(fract(p.xy)-.5));
        float j3 = max(0., 1.5-2.*length(fract(p.xy)-.5));
        
        
       float  cr = n1 * sin(  max(0., 1.-abs(d1) ) * (1./t.z*2.)  )*1.5 ;
     	float  cg = n2 * sin(  max(0., 1.-abs(d2) ) * (1./t.z*2.)  )*1.5;
        float  cb = n3 * sin(  max(0., 1.-abs(d3) ) * (1./t.z*2.)  )*1.5;
        
        

    
        
        col1 += (1.-z1 )*cr*j1*1.2  ;
        col2 += (1.-z2 )*cr*j2*1.2 /* * (b[2] + 2.) */;
        col3 += (1.-z3 )*cr*j3*1.2 /* * (b[2] + 2.)*/ ;
        
        p += t;
    }
    
    //col = col1*vec3(3.*b[0]+.5,0.,0.) + col2*vec3(0.,5.*b[3]+.5,0.) + col3*vec3(17.*b[2]+.5,17.*b[2]+.5,17.*b[2]+.5);
    col = col1*vec3(2.,0.5,0.) + col2*vec3(0.,2.,1.) + col3*vec3(0.5,0.,3.);
    col = max(vec3(0.), min(vec3(1.), col*.3));

    return pow(col, vec3(1.1));
}




void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy / iResolution.xy) - vec2(.5);
    vec2 uv_crt2 = uv;
    

    float curvature = length(uv*.5 * uv*.5);
   // uv = uv*curvature + uv*.935;
    
    vec2 uv_crt = uv;
 
    
    
    
    uv.x *= iResolution.x/iResolution.y;
    
    #	define MM 6.5
    scol[0]=texture(iChannel2, vec2(0., 0.25) ).x;     scol[0]=f1(clamp(1.*scol[0]*scol[0], 0., 1.)); scol[0]*=MM*scol[0]*scol[0];
    scol[1]=texture(iChannel2, vec2(.17*1., 0.25) ).x; scol[1]=f1(clamp(1.*scol[1]*scol[1], 0., 1.)); scol[1]*=MM*scol[1]*scol[1];
    scol[2]=texture(iChannel2, vec2(.17*2., 0.25) ).x; scol[2]=f1(clamp(1.*scol[2]*scol[2], 0., 1.)); scol[2]*=MM*scol[2]*scol[2];
    scol[3]=texture(iChannel2, vec2(.17*3., 0.25) ).x; scol[3]=f1(clamp(1.*scol[3]*scol[3], 0., 1.)); scol[3]*=MM*scol[3]*scol[3];
    scol[4]=texture(iChannel2, vec2(.17*4., 0.25) ).x; scol[4]=f1(clamp(1.*scol[4]*scol[4], 0., 1.)); scol[4]*=MM*scol[4]*scol[4];
    scol[5]=texture(iChannel2, vec2(.17*5., 0.25) ).x; scol[5]=f1(clamp(1.*scol[5]*scol[5], 0., 1.)); scol[5]*=MM*scol[5]*scol[5];
    scol[6]=texture(iChannel2, vec2(.99, 0.25) ).x;    scol[6]=f1(clamp(1.*scol[6]*scol[6], 0., 1.)); scol[6]*=MM*scol[6]*scol[6];    

    b[0] = (scol[1]+scol[1]+scol[0])* .25;
    b[1] = (scol[3]+scol[3]+scol[2])* .15;
    b[2] = (scol[4]+scol[5]+scol[4])* .3;
    b[3] = (scol[2]+scol[6]+scol[6])* .25;

    
    uv*= .25+b[0]*.73;
    
    
    if(b[0]>1.2) mode = 1;
    if(b[2]>1.) uv*=.3+b[2]*.5;
    
    
	vec3 eye = vec3(0., 0., -5.);    
    vec3 light = vec3(3., -1.5, -6.);    
  
    vec3 ray = vec3(vec2(uv.x, uv.y), 1.);
    
    float depth;

    rz = TIMER(10. ,0., PI*2.);
    rx = TIMER(20. ,0., PI*2.);
    ry = TIMER(4. ,0., PI*2.);
    

    
    eye.zx*=mm2(rx); eye.xy*=mm2(rz); eye.zy*=mm2(ry);
    light.zx*=mm2(rx); light.xy*=mm2(rz); light.zy*=mm2(ry);
   	ray.zx*=mm2(rx); ray.xy*=mm2(rz); ray.zy*=mm2(ry);
    
    
    
    depth = rayMarch(eye, ray);   
	if (depth < MAX_DISTANCE) {
    	colorize(o[0], vec3(1.*scol[0], 1.*scol[6], 1.*scol[4]));
        colorize(o[2], vec3(1.*scol[1], 1.*scol[5], 0.));
        
    	colorize(o[1], vec3(0., .5*scol[6], 1.*scol[2]));
    	colorize(o[3], vec3(1.*scol[2], 0., .5*scol[3]));
        
        
		vec3 p = (eye + ray*depth);
		float d_ep=length(p - depth);
        
        

        
		vec3 p_normal = getNormal(p, d_ep*d_ep*EPSILON*.1);
		        
        vec3 light_dir = -normalize(light-p);
        vec3 reflected_light_dir = reflect(-light_dir, -p_normal);
        
        float shadow = shadowSample(p, -light_dir);
        
#		define J .003
		float attenuation = 1./(1. + J*pow( length(light-p), 2.0));
       	attenuation*=max(1., 1.+shadow);
                
        float ambient = 1.0 - ambientOcculation(p, -ray);
        ambient = pow(max(ambient, 0.), 8.);		        
        float diffuse = max(0., dot(light_dir, p_normal));        
        float lighting = (max(1., diffuse*.3 + ambient*.7) )*attenuation;
       
        vec3 reflectioncolor = texture(iChannel1, reflect(ray, p_normal)).rgb;      
        vec3 texcol = texCube(iChannel0, p, p_normal, .1 ).rgb * lighting;

        current_color*=.09; 
        
        final_color = (clamp(mix(current_color+vec3(.0), reflectioncolor*2.7, max(0., 1.+(dot(-p_normal, ray)))), 0., 1.)+current_color)*lighting;
        final_color = final_color + texcol*.20;
 
        final_color *= max(dot(p_normal,ray*.7),0.);
        
        
        final_color = final_color + interference(uv_crt, final_color, (b[0]+b[2])*.75); //.75
        
	} else {       
        final_color = vec3(.42, .4, .4);
                
        final_color = starfield(uv);
    }
    


    final_color=min(vec3(1.), max(vec3(0.), final_color));
    
    float mm = 9. + b[3]*8.;  
    float l = 1. - min(1., curvature*mm);
    final_color *= l;
    
    float y = uv_crt.y;
    float showScanlines = 1.;
    if (iResolution.y<280.) showScanlines = 0.;
    float s = 1. - smoothstep(360., 1440., iResolution.y) + 1.;
    float j = cos(y*iResolution.y*s)*.1; //.2 
    final_color = abs(showScanlines-1.)*final_color + showScanlines*(final_color - final_color*j);   
    
    float cm = max(0.0, 1. - 2.*max(abs(uv_crt.x), abs(uv_crt.y) ) );
    cm = min(cm*200., 1.);
    final_color *= cm;

    final_color = max(vec3(0.), min(vec3(1.), final_color));
    fragColor = vec4(pow(final_color, vec3(.85)), 1.);

}

void main(){
	gl_FragColor = texture(iChannel0,texc);
	//gl_FragCoord.xy
}