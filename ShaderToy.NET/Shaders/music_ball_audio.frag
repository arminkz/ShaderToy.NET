#version 330 core

uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform float iGlobalTime;

varying vec2 texc; //input texture coordinates from vertex shader


float PI=3.14159265;

//IQ signed box
float sdBox(vec3 p,vec3 b){
  vec3 d=abs(p)-b;
  return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
}

vec2 rot(vec2 p,float r){
  vec2 ret;
  ret.x=p.x*cos(r)-p.y*sin(r);
  ret.y=p.x*sin(r)+p.y*cos(r);
  return ret;
}

vec2 rotsim(vec2 p,float s){
  vec2 ret=p;
  ret=rot(p,-PI/(s*2.0));
  ret=rot(p,floor(atan(ret.x,ret.y)/PI*s)*(PI/s));
  return ret;
}

//Object
float obj(in vec3 p)
{
  vec3 op=p;
  p.xz=rotsim(p.xz,16.0);
  p.yz=rotsim(p.yz,16.0); 
  p.z=p.z-4.0;
  vec2 uv;
  vec3 p2=normalize(op);
  uv.x=1.0-acos(abs(p2.y)-0.1)/PI;
  uv.y=0.1;
  uv=floor(uv*16.0);
  uv/=16.0;
  vec3 p3=p;
  p3.z-=(textureLod(iChannel0,uv,0.0).x-0.2)*4.0;	
  float c1=sdBox(p3,vec3(0.2,0.2,1.0));
  p.z=p.z-12.0;
  uv.y=0.9;
  p.xy=rot(p.xy,textureLod(iChannel0,uv,0.0).x*2.0*PI);
  uv.y=0.1;	
  p.yz=rot(p.yz,textureLod(iChannel0,uv,0.0).x*2.0*PI);	
  float c3=sdBox(p,vec3(0.8,0.8,0.1));	
  float c4=length(op)-5.0;
  return min(mix(c1,c4,(c4<0.0)?abs(c4):0.0),c3);	
}

//Object Color
vec3 obj_c(vec3 p)
{
  return vec3(1.0,1.0,1.0); 
}

//Scene End


//Raymarching Framework Start

vec3 phong(
  in vec3 pt,
  in vec3 prp,
  in vec3 normal,
  in vec3 light,
  in vec3 color,
  in float spec,
  in vec3 ambLight)
{
   vec3 lightv=normalize(light-pt);
   float diffuse=dot(normal,lightv);
   vec3 refl=-reflect(lightv,normal);
   vec3 viewv=normalize(prp-pt);
   float specular=pow(max(dot(refl,viewv),0.0),spec);
   return (max(diffuse,0.0)+ambLight)*color+specular;
}

float raymarching(
  in vec3 prp,
  in vec3 scp,
  in int maxite,
  in float precis,
  in float startf,
  in float maxd,
  out int objfound)
{ 
  const vec3 e=vec3(0.1,0,0.0);
  float s=startf;
  vec3 c,p,n;
  float f=startf;
  objfound=1;
  for(int i=0;i<256;i++){
    if (abs(s)<precis||f>maxd||i>maxite) break;
    f+=s;
    p=prp+scp*f;
    s=obj(p);
  }
  if (f>maxd) objfound=-1;
  return f;
}

vec3 camera(
  in vec3 prp,
  in vec3 vrp,
  in vec3 vuv,
  in float vpd,
  in vec2 fragCoord)
{
  vec2 vPos=-1.0+2.0*fragCoord.xy/iResolution.xy;
  vec3 vpn=normalize(vrp-prp);
  vec3 u=normalize(cross(vuv,vpn));
  vec3 v=cross(vpn,u);
  vec3 scrCoord=prp+vpn*vpd+vPos.x*u*iResolution.x/iResolution.y+vPos.y*v;
  return normalize(scrCoord-prp);
}

vec3 normal(in vec3 p)
{
  //tetrahedron normal
  const float n_er=0.01;
  float v1=obj(vec3(p.x+n_er,p.y-n_er,p.z-n_er));
  float v2=obj(vec3(p.x-n_er,p.y-n_er,p.z+n_er));
  float v3=obj(vec3(p.x-n_er,p.y+n_er,p.z-n_er));
  float v4=obj(vec3(p.x+n_er,p.y+n_er,p.z+n_er));
  return normalize(vec3(v4+v1-v3-v2,v3+v4-v1-v2,v2+v4-v3-v1));
}

vec3 render(
  in vec3 prp,
  in vec3 scp,
  in int maxite,
  in float precis,
  in float startf,
  in float maxd,
  in vec3 background,
  in vec3 light,
  in float spec,
  in vec3 ambLight,
  out vec3 n,
  out vec3 p,
  out float f,
  out int objfound)
{ 
  objfound=-1;
  f=raymarching(prp,scp,maxite,precis,startf,maxd,objfound);
  if (objfound>0){
    p=prp+scp*f;
    vec3 c=obj_c(p);
    n=normal(p);
    vec3 cf=phong(p,prp,n,light,c,spec,ambLight);
    return vec3(cf);
  }
  f=maxd;
  return vec3(background); //background color
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
 
  //Camera animation
  vec3 vuv=normalize(vec3(sin(sin(iGlobalTime)*0.6)*0.4,1.0,cos(sin(iGlobalTime)*0.7)*0.2));
  vec3 vrp=vec3(0.0,0.0,0.0);	
  vec3 prp=vec3(sin(iGlobalTime)*12.0,5.0,cos(iGlobalTime)*12.0); //Trackball style camera pos
  float vpd=1.5;
  vec3 light=prp;
  
  vec3 scp=camera(prp,vrp,vuv,vpd,fragCoord);
  vec3 n,p;
  float f;
  int o;
  const float maxe=0.01;
  const float startf=0.1;
  const vec3 backc=vec3(0.0,0.0,0.0);
  const float spec=8.0;
  const vec3 ambi=vec3(0.1,0.1,0.1);
  
  vec3 c1=render(prp,scp,64,maxe,startf,32.0,backc,light,spec,ambi,n,p,f,o);
  c1=c1*max(1.0-f*.02,0.0);
  vec3 c2=backc;
  if (o>0){
    scp=reflect(scp,n);
    c2=render(p+scp*0.05,scp,8,maxe,startf,4.0,backc,light,spec,ambi,n,p,f,o);
  }
  c2=c2*max(1.0-f*.5,0.0);
  fragColor=vec4(c1.xyz*0.75+c2.xyz*0.25,1.0);
}


void main(){
	mainImage(gl_FragColor,gl_FragCoord.xy);
}
