import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAnatomy } from './anatomy.js';

export class AnatomyViewer {
  constructor(container, onSelect, onRotate) {
    this.container=container; this.onSelect=onSelect; this.onRotate=onRotate;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.1,100);
    this.camera.position.set(0,0,15);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.renderer.domElement.setAttribute('aria-label','Interactive 3D anatomy. Drag to rotate, scroll to zoom. Use the camera buttons for keyboard navigation.');
    this.renderer.domElement.setAttribute('role','img');
    container.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.enablePan=true;
    this.controls.minDistance=7;this.controls.maxDistance=25;this.controls.autoRotateSpeed=1.3;
    this.controls.addEventListener('start',()=>this.onRotate?.());
    this.scene.add(new THREE.HemisphereLight(0xfffdf6,0x7b8c80,2.7));
    const key=new THREE.DirectionalLight(0xfff6e8,3.7);key.position.set(-4,7,6);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;
    key.shadow.camera.top=8;key.shadow.camera.bottom=-6;key.shadow.normalBias=.035;key.shadow.bias=-.0001;
    this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xdce9e5,2);rim.position.set(4,2,-4);this.scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.018}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-3.8;floor.receiveShadow=true;this.scene.add(floor);
    this.floor=floor;
    this.raycaster=new THREE.Raycaster();
    this.renderer.domElement.addEventListener('pointerdown',e=>this.pointerStart=[e.clientX,e.clientY]);
    this.renderer.domElement.addEventListener('pointerup',e=>{
      if(!this.model||!this.pointerStart||Math.hypot(e.clientX-this.pointerStart[0],e.clientY-this.pointerStart[1])>5)return;
      const rect=this.renderer.domElement.getBoundingClientRect();
      const p=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.raycaster.setFromCamera(p,this.camera);
      const hit=this.raycaster.intersectObjects(this.model.userData.bones)[0];
      if(hit)this.onSelect(hit.object.userData);
    });
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
    this.resize();
    this.animation=this.renderer.setAnimationLoop(()=>{
      if(!document.hidden){this.controls.update();this.renderer.render(this.scene,this.camera);}
    });
  }
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
  load(kind,left=false){
    if(this.model){this.scene.remove(this.model);this.disposeModel(this.model);}
    this.model=createAnatomy(kind,{left});this.scene.add(this.model);this.floor.position.y=kind==='radius'?-4.65:-3.8;
    this.setView('oblique',true);this.setHighlight(true);this.setOpacity(1);
  }
  disposeModel(m){const materials=new Set();m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());}
  setView(view,instant=false){
    if(!this.model)return;
    this.model.rotation.set(0,0,-.10);
    const pos={frontal:[0,0,15],lateral:[14.7,0,1.2],oblique:[7,1,13.2]}[view]||[0,0,15];
    this.camera.position.set(...pos);this.controls.target.set(-.15,this.model.userData.kind==='radius'?.3:0,0);this.controls.update();
  }
  zoom(delta){this.camera.position.sub(this.controls.target).multiplyScalar(delta).add(this.controls.target);this.camera.position.clampLength(this.controls.minDistance,this.controls.maxDistance);this.controls.update();}
  setHighlight(on){if(!this.model)return;this.model.userData.bones.forEach(b=>{b.material=b.userData.fracture&&on?this.model.userData.fractureMaterial:this.model.userData.boneMaterial;});}
  setOpacity(value){if(!this.model)return;[this.model.userData.boneMaterial,this.model.userData.fractureMaterial].forEach(m=>{m.opacity=value;m.transparent=value<1;m.depthWrite=value>=1;});}
  async glb(){
    const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
    const copy=new THREE.Group();copy.position.copy(this.model.position);copy.rotation.copy(this.model.rotation);copy.scale.copy(this.model.scale);
    copy.userData={description:'X3D illustrative anatomy atlas. Not reconstructed from patient images. Not a medical device.',units:'Arbitrary atlas units; no clinical scale or calibration.',illustrative:true};
    for(const original of this.model.userData.bones){const mesh=new THREE.Mesh(original.geometry,original.material);mesh.position.copy(original.position);mesh.quaternion.copy(original.quaternion);mesh.scale.copy(original.scale);mesh.name=original.userData.name;mesh.userData={name:original.userData.name,illustrative:true};copy.add(mesh);}
    const buffer=await new GLTFExporter().parseAsync(copy,{binary:true});return new Blob([buffer],{type:'model/gltf-binary'});
  }
  async snapshot(){
    this.renderer.render(this.scene,this.camera);
    const canvas=document.createElement('canvas');canvas.width=this.renderer.domElement.width;canvas.height=this.renderer.domElement.height;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f0f4f1';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(this.renderer.domElement,0,0);
    const size=Math.max(13,canvas.width/75);ctx.font=`500 ${size}px sans-serif`;ctx.fillStyle='#536b61';
    ctx.fillText('X3D  /  EDUCATIONAL ILLUSTRATION',size*1.5,canvas.height-size*3);ctx.font=`${size*.85}px sans-serif`;
    ctx.fillText('Atlas geometry · not a patient reconstruction · not for diagnosis',size*1.5,canvas.height-size*1.5);
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  }
}

export function makeSyntheticViews(kind='metacarpal',left=false){
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(360,470);renderer.setPixelRatio(1);
  renderer.setClearColor(0x080c0e);const scene=new THREE.Scene();const model=createAnatomy(kind,{left});scene.add(model);
  const shader=new THREE.ShaderMaterial({
    vertexShader:'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n; varying vec3 v; void main(){float edge=pow(1.0-abs(dot(normalize(n),normalize(v))),1.35);float c=.1+edge*.62;gl_FragColor=vec4(vec3(c*.9,c*.97,c),.65);}',
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  });
  const oldMaterials=new Set();model.traverse(o=>{if(o.isMesh){oldMaterials.add(o.material);o.material=shader;}});
  const camera=new THREE.PerspectiveCamera(33,360/470,.1,100);const result=[];
  for(const [projection,angle] of [['PA',0],['Oblique',.85]]){
    model.rotation.y=angle;model.rotation.z=-.08;camera.position.set(0,0,kind==='radius'?18:15);camera.lookAt(0,.1,0);renderer.render(scene,camera);
    const c=document.createElement('canvas');c.width=360;c.height=470;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0);
    ctx.fillStyle='#b8c3c6';ctx.font='bold 22px monospace';ctx.fillText(left?'L':'R',22,34);ctx.font='10px monospace';ctx.fillStyle='#6e7a7e';ctx.fillText('SYNTHETIC · NOT AN X-RAY',24,450);
    result.push({id:crypto.randomUUID(),name:`Illustrative ${projection.toLowerCase()} view`,projection,src:c.toDataURL('image/png'),width:360,height:470,synthetic:true});
  }
  model.traverse(o=>o.geometry?.dispose());oldMaterials.forEach(m=>m.dispose());shader.dispose();renderer.dispose();renderer.forceContextLoss();return result;
}
