#version 330 core

uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform float iGlobalTime;

varying vec2 texc; //input texture coordinates from vertex shader

#define FILTER
#define LIGHT_SOURCE
#define GLOW

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // aspect ratio
    float a = iResolution.x/iResolution.y;
    
    // position of screen
    // dom x = [0.0, 1.0]
    // dom y = [0.0, 1.0]
    // origin is at bottom left corner
	vec2 uv = fragCoord.xy / iResolution.xy;
    
    // multiply aspect ratio to remove distortions
    uv.x *= a;
    
    // align polar graph to center of screen
    vec2 q = uv - vec2(0.5*a, 0.5);
    
    // fft values, look at the bars at the bottom of the screen
    float fft = 5.0 * texture(iChannel0, vec2(0.0, 0.)).x;
    float fft2 = 5.0 * texture(iChannel0, vec2(1., 0.)).x;
    float fft3 = 5.0 * texture(iChannel0, vec2(0.5, 0.)).x;
    
    // theta value
    float t = atan(q.y, q.x);
    
    // time from start of song
    float ts = iGlobalTime;
    
    // the main polar graph, r = ...
    float r = pow(fft*2.-0.5, 2.)*cos(6.*t + (fft2*1.5 + ts)*5.) + 2.0 + pow(fft, 2.);
    r *= fft/12. + 0.04;
    
    vec2 p = q;
    #ifdef FILTER
        p.x += sin(q.y*5000.)/100.;
        p.y += cos(q.x*5000.)/100.;
    #endif
    
    
    // bg
    vec3 col = vec3(smoothstep(r, r + fft*0.02 + 0.01, length(p)));
    #ifdef GLOW
    	col *= 1.*smoothstep(0., r + fft*0.2, length(q));
    #endif
    
    col.r = clamp(col.r, 0.0, 1.0);
    col.g = clamp(col.g, 0.0, 1.0);
    col.b = clamp(col.b, 0.0, 1.0);
    
    // fg
    vec3 col2 = 1.0 - col;

    // bg
    // radial gradient
    col -= 0.5*smoothstep(0.0, 2., length(q/(fft + 0.5)));
    
    #ifdef LIGHT_SOURCE
        // give a more red warm light colour
        col.g *= 0.97;
        col.b *= 0.97;

        // cool lighting effect
        col += uv.y/16.;
    #endif
    
    #ifdef FILTER
    	col += sin(50.*q.y - ts*3.)*(fft*0.5+0.5)*0.05 - 0.1*(fft*0.3+0.5)*abs(-2.*q.x*sin(q.y*1000. - ts*5.));
    #endif // FILTER

    // fg
    // colour of polar graph
    col2 *= vec3(0.0, 0.9, 0.9);
    // radial gradient for polar graph.
    // removing this will change the polar graph to a solid colour
    col2 *= length(q)*0.5 + 0.85;
    
    // add fg to bg
    col += col2;
    
    // volia!
	fragColor = vec4(col,1.0);
}


void main(){
	mainImage(gl_FragColor,gl_FragCoord.xy);
}
