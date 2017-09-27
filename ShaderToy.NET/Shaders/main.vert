#version 330 core

in vec3 position;
in vec2 texcoords;

varying vec2 texc;

void main(void) {
	texc = texcoords;
	gl_Position = vec4(position, 1.0);
}