#version 330 core

uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform float iGlobalTime;

varying vec2 texc; //input texture coordinates from vertex shader

/* discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 */
vec3 random3(vec3 c) {
	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= .125;
	r.x = fract(512.0*j);
	j *= .125;
	r.y = fract(512.0*j);
	return r-0.5;
}

/* skew constants for 3d simplex functions */
const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
	 /* 1. find current tetrahedron T and it's four vertices */
	 /* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
	 /* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
	 
	 /* calculate s and x */
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 
	 /* calculate i1 and i2 */
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 	
	 /* x1, x2, x3 */
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 
	 /* 2. find four surflets and store them in d */
	 vec4 w, d;
	 
	 /* calculate surflet weights */
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 
	 /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
	 w = max(0.6 - w, 0.0);
	 
	 /* calculate surflet components */
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 
	 /* multiply d by w^4 */
	 w *= w;
	 w *= w;
	 d *= w;
	 
	 /* 3. return the sum of the four surflets */
	 return dot(d, vec4(52.0));
}

/* const matrices for 3d rotation */
const mat3 rot1 = mat3(-0.37, 0.36, 0.85,-0.14,-0.93, 0.34,0.92, 0.01,0.4);
const mat3 rot2 = mat3(-0.55,-0.39, 0.74, 0.33,-0.91,-0.24,0.77, 0.12,0.63);
const mat3 rot3 = mat3(-0.71, 0.52,-0.47,-0.08,-0.72,-0.68,-0.7,-0.45,0.56);

/* directional artifacts can be reduced by rotating each octave */
float simplex3d_fractal(vec3 m) {
    return   0.5333333*simplex3d(m*rot1)
			+0.2666667*simplex3d(2.0*m*rot2)
			+0.1333333*simplex3d(4.0*m*rot3)
			+0.0666667*simplex3d(8.0*m);
}


/*
* The Nintendo Super Mess of code below is all me. I am sorryish.
*/

#define FLAMERADIUS 0.45
#define FLAMEBOOST 0.15		// Adds the flame shape mask over the top of the multiplied noise to maintain more of original shape.
#define EDGEMIN 0.025		// Edge cutoff at base of flame. Values around 0.0 to 0.1 look best.
#define EDGEMAX .8 			// Edge cutoff at full height of flame. Values around 0.5 to 1.0 look best.
#define FALLOFFPOW 4.0
#define NOISEBIGNESS 2.0 
#define WIDEN .8 		
#define WAVE 0.25 		
#define NIGHTSPEEDBONUS 1.25 		
#define SHAPE 0  			// tear (0), egg (1), shitty tear (2)	
#define BREATHWILDNESS 1	// not very wild (0), pretty wild (1), zakk wylde (2)
#define PI 3.14159265359

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float time = 28.22+NIGHTSPEEDBONUS*iGlobalTime;
    float bignessScale = 1.0/NOISEBIGNESS;
	vec2 p = fragCoord.xy / iResolution.y;
    // p*=4.0;
    // p -= vec2(1.0);
    float aspect = iResolution.x/iResolution.y;
    vec2 positionFromCenter = p-vec2(0.5*aspect, 0.5);
    positionFromCenter/=FLAMERADIUS;
    positionFromCenter.x /= WIDEN;
    float positionFromBottom = 0.5*(positionFromCenter.y+1.0);
    vec2 waveOffset;
    waveOffset.x += positionFromBottom*sin(4.0*positionFromCenter.y-4.0*time);
    waveOffset.x += 0.1*positionFromBottom*sin(4.0*positionFromCenter.x-1.561*time);
    
    positionFromCenter += WAVE*waveOffset;
    
    float outerMask = length(positionFromCenter);
    if(SHAPE == 0)
    {
        // TEAR
    	positionFromCenter.x += positionFromCenter.x / (1.0-(positionFromCenter.y));
    }
    else if(SHAPE == 1)
    {
        // EGG
    	positionFromCenter.x += positionFromCenter.x * positionFromBottom;        
    }
    else if(SHAPE == 2)
    {
        // TEAR2
    	positionFromCenter.x += sign(positionFromCenter.x) * positionFromBottom;        
    }
    
    // positionFromCenter.x = mix(positionFromCenter.x, sign(positionFromCenter.x), 0.5*(positionFromCenter.y+1.0));
    
    float flameMask = clamp(1.0-length(positionFromCenter), 0.0, 1.0);
    flameMask = 1.0-pow(1.0-flameMask, FALLOFFPOW);
    
    //flameMask = abs(positionFromCenter.x);
    
    // Noise:
    vec3 p3 = bignessScale*0.25*vec3(p.x, p.y, 0.0) + vec3(0.0, -time*0.1, time*0.025);
    float noise = simplex3d(p3*32.0);// simplex3d_fractal(p3*8.0+8.0);
	noise = 0.5 + 0.5*noise;
    
    vec3 finalColor;
    
    float value = flameMask*noise;    
    value += FLAMEBOOST*flameMask;

    
    
    if(BREATHWILDNESS == 0)
    {   
        // Toon
        float edge = mix(EDGEMIN, EDGEMAX, pow(0.5*(positionFromCenter.y+1.0), 1.2) );
        //edge = 0.5+ 0.5*sin(time);    
        float steppedValue = smoothstep(edge,edge+0.01, value);
        steppedValue = mix(0.5*steppedValue, 1.0, smoothstep(1.5*edge,1.5*edge+0.01, value));
        steppedValue = mix(0.5*steppedValue, 1.0, smoothstep(3.0*edge,3.0*edge+0.01, value));
        //steppedValue += 0.2*flameMask;

    	vec3 bgColor = vec3(0.1,0.0,0.2);
        finalColor = mix(bgColor, vec3(0.0,1.0,1.0), steppedValue);
    }
    else if(BREATHWILDNESS == 1)
    {
        // Breath of the Wild
        float edge = mix(EDGEMIN, EDGEMAX, pow(0.5*(positionFromCenter.y+1.0), 1.2) );
        //edge = 0.5+ 0.5*sin(time);    
        float edgedValue = clamp(value-edge, 0.0 , 1.0);
        float steppedValue = smoothstep(edge,edge+0.1, value);
        float highlight = 1.0-edgedValue;
        float repeatedValue = highlight;
        highlight = highlight;
        
        
        p3 = bignessScale*0.1*vec3(p.x, p.y, 0.0) + vec3(0.0, -time*0.01, time*0.025);
        noise = simplex3d(p3*32.0);// simplex3d_fractal(p3*8.0+8.0);
        noise = 0.5 + 0.5*noise;
        repeatedValue = mix(repeatedValue, noise, 0.65);
        
        repeatedValue = 0.5*sin(6.0*PI*(1.0-pow(1.0-repeatedValue,1.8)) - 0.5*PI)+0.5;
        float steppedLines = smoothstep(0.95, 1.0, pow(repeatedValue, 8.0));
        steppedLines = mix(steppedLines, 0.0, 0.8-noise);
        highlight = max(steppedLines, highlight);
        
        highlight = pow(highlight, 2.0);
        
        vec3 flameHighlightColor = mix(vec3(0.0,1.0,1.0), vec3(0.0,1.0,2.0), p.y);
        
        float whiteFlash =  sin(time*3.0);
        whiteFlash = pow(whiteFlash, 4.0);        
        flameHighlightColor += vec3(0.3,0.2,0.2) * whiteFlash;
        
        vec3 flameBodyColor = mix(vec3(0.2,0.2,0.2), vec3(0.0,0.05,0.25), p.y);
        
        finalColor = flameHighlightColor*(steppedValue*highlight); // + vec3(0.1,0.4,0.8)*edgedValue;
        //finalColor = vec3(1.0)*steppedValue*highlight;
        finalColor += flameBodyColor*steppedValue;
    	vec3 bgColor = mix(vec3(0.07,0.0,0.15), vec3(0.075,0.025,0.15), 1.0);
        finalColor += bgColor;
        
        //finalColor = vec3(1.0,1.0,1.0)*steppedValue*highlight;
    }
    else
    {
        // Zakk Wylde
        float edge = mix(EDGEMIN, EDGEMAX, pow(0.5*(positionFromCenter.y+1.0), 1.2) );
        //edge = 0.5+ 0.5*sin(time);    
        float steppedValue = smoothstep(edge,edge+0.01, value);
        float repeatedValue = 0.5*sin(1.0*PI*(value/edge) + 0.5*PI)+0.5;
        steppedValue = 1.0-smoothstep(0.5,0.6, 1.0-repeatedValue);
        finalColor = vec3(1.0,1.0,1.0)*steppedValue;
    }
    
    
	fragColor = vec4(finalColor,1.0);
}

void main(){
	mainImage(gl_FragColor,gl_FragCoord.xy);
}
