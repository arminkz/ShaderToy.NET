#version 330 core

uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform float iGlobalTime;

varying vec2 texc; //input texture coordinates from vertex shader

void main(){
	gl_FragColor = texture(iChannel0,texc);
	//gl_FragCoord.xy
}