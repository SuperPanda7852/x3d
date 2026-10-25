import * as THREE from 'three';

// A deliberately illustrative anatomy atlas. Geometry is procedural, not inferred
// from radiographs. Coordinates are arbitrary atlas units, not millimetres.
export function createAnatomy(kind = 'metacarpal', { left = false } = {}) {
  const group = new THREE.Group();
  const bones = [];
  const boneMaterial = new THREE.MeshStandardMaterial({ color: '#e6dfc9', roughness: .66, metalness: .015 });
  const fractureMaterial = new THREE.MeshStandardMaterial({ color: '#ce9a48', roughness: .63 });
  const cutMaterial = new THREE.MeshStandardMaterial({ color: '#b68034', roughness: .9, side: THREE.DoubleSide });
  const v = (a) => new THREE.Vector3(...a);
  function bone(a, b, width, name, fracture = false, seed = 1) {
    const start = v(a), end = v(b), length = start.distanceTo(end);
    const pts = [new THREE.Vector2(0,0)];
    // Smooth epiphyses and a narrow, gently bowed diaphysis.
    for (let j = 0; j <= 32; j++) {
      const t = j / 32;
      const endRound = t < .1 ? .8+.2*Math.sin(t/.1*Math.PI/2) : t > .9 ? .8+.2*Math.sin((1-t)/.1*Math.PI/2) : 1;
      const isProximalCut = fracture && name.includes('proximal fragment');
      const isDistalCut = fracture && !isProximalCut;
      const round = isProximalCut && t > .75 || isDistalCut && t < .25 ? 1 : endRound;
      const r = width * (.66 + .28 * Math.exp(-Math.pow((t - .1) / .14, 2)) + .36 * Math.exp(-Math.pow((t - .9) / .13, 2))) * round;
      pts.push(new THREE.Vector2(Math.max(.002,r), t * length));
    }
    pts.push(new THREE.Vector2(0,length));
    const geometry = new THREE.LatheGeometry(pts, 28);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = y / length;
      const ripple = Math.sin(t * 19 + seed) * .014 + Math.cos(p.getX(i) * 22 + seed) * .008;
      p.setX(i, p.getX(i) * (1 + ripple) + Math.sin(t * Math.PI) * width * .15);
      p.setZ(i, p.getZ(i) * (.81 + ripple));
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, fracture ? fractureMaterial : boneMaterial);
    mesh.position.copy(start);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { name, fracture, rest: mesh.position.clone() };
    group.add(mesh); bones.push(mesh); return mesh;
  }
  function carpal(x, y, z, sx, sy, sz, name, seed) {
    const geo = new THREE.SphereGeometry(1, 24, 18);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i);
      const n = 1 + .075 * Math.sin(x0 * 5 + seed) * Math.cos(y0 * 4 + z0 * 4);
      pos.setXYZ(i, x0 * n, y0 * n, z0 * n);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, boneMaterial); m.position.set(x,y,z); m.scale.set(sx,sy,sz);
    m.rotation.set(.1*seed,.15*seed,.15*Math.sin(seed));
    m.castShadow = true; m.receiveShadow = true; m.userData = { name, fracture:false,rest:m.position.clone() };
    group.add(m); bones.push(m);
  }
  const wrist = kind === 'radius';
  const fingers = [
    {name:'Index', x:-.57, base:3.55, lengths:[1.42,.88,.66], fan:-.095, w:.155},
    {name:'Middle',x:.03,base:3.74,lengths:[1.57,1.01,.72],fan:.012,w:.17},
    {name:'Ring',x:.65,base:3.56,lengths:[1.44,.91,.67],fan:.105,w:.155},
    {name:'Little',x:1.18,base:3.18,lengths:[1.18,.69,.61],fan:.20,w:.135},
  ];
  fingers.forEach((f,i) => {
    const a = [f.x * .48,1.35,0], b = [f.x,f.base,.04];
    if (i === 3 && kind === 'metacarpal') {
      const mix = (t) => a.map((x,k)=>x+(b[k]-x)*t);
      bone(a,mix(.67),.18,'Fifth metacarpal · proximal fragment',true,4);
      const split=mix(.75); split[0]+=.11;split[2]+=.13;
      const distal=[b[0]+.22,b[1]-.08,b[2]+.23];
      bone(split,distal,.19,'Fifth metacarpal · distal fragment',true,5);
      // Distal finger follows the displaced articular head.
      f.x = distal[0]; f.base=distal[1];
    } else bone(a,b,.19+(i===1?.015:0),`${['Second','Third','Fourth','Fifth'][i]} metacarpal`,false,i+2);
    let x=f.x, y=f.base+.025, z=i===3&&kind==='metacarpal'?.26:.055;
    f.lengths.forEach((len,j)=>{
      const nextX=x+f.fan*len, nextZ=z-(j*.03);
      bone([x,y,z],[nextX,y+len,nextZ],f.w*(1-j*.15),`${f.name} ${['proximal','middle','distal'][j]} phalanx`,false,i*3+j);
      x=nextX;y+=len+.022;z=nextZ;
    });
  });
  bone([-.46,1.18,.04],[-1.51,2.28,.14],.23,'First metacarpal',false,4);
  bone([-1.53,2.31,.14],[-2.03,3.42,.25],.185,'Thumb proximal phalanx',false,3);
  bone([-2.045,3.45,.25],[-2.38,4.30,.3],.155,'Thumb distal phalanx',false,7);
  carpal(-.56,1.05,.02,.30,.33,.26,'Trapezium',1);
  carpal(-.12,1.16,.02,.25,.28,.24,'Trapezoid',2);
  carpal(.32,1.11,.01,.31,.37,.27,'Capitate',3);
  carpal(.83,1.05,-.02,.34,.31,.26,'Hamate',4);
  carpal(-.42,.56,.02,.36,.27,.25,'Scaphoid',5);
  carpal(.11,.56,.02,.30,.29,.25,'Lunate',6);
  carpal(.64,.57,.00,.30,.25,.24,'Triquetrum',7);
  carpal(.83,.58,.30,.18,.19,.18,'Pisiform',8);
  if(wrist) {
    bone([-.26,-2.25,-.03],[-.22,-.35,-.03],.26,'Radius shaft',false,3);
    bone([-.22,-.26,-.03],[-.37,.17,.17],.39,'Distal radius · illustrative fragment',true,8);
    bone([.61,-2.25,-.04],[.68,.14,-.01],.21,'Ulna',false,8);
  }
  if(left) group.scale.x=-1;
  group.position.y=wrist?-2.3:-3.6;
  group.userData = { bones, boneMaterial, fractureMaterial, cutMaterial, kind, left };
  return group;
}

export const BONE_INFO = {
  'metacarpal': {title:'Fifth metacarpal',subtitle:'Illustrated fracture',text:'The long bone connecting the wrist to the little finger. The amber fragments illustrate displacement in this example case.'},
  'radius': {title:'Distal radius',subtitle:'Illustrated fracture',text:'The end of the radius near the wrist. The amber segment illustrates a distal fragment in this example case.'},
};
