import * as THREE from './vendor/three.module.js';

// Two hemispheres and an inset joint match the existing spherical collider.
// Transparency is a thin shell, not a costly screen-space refraction pass.
export function createCapsule(kind,radius,segments=16){
  const colors={silver:0xa9dce9,goldBall:0xffbf24,jackpot:0x7bdf38,'capsule-bronze':0xbd7848,'capsule-silver':0xa9dce9,'capsule-gold':0xffbf24,'capsule-rainbow':0xac79ee,'capsule-special':0xe86097,'capsule-premium':0xf3eee0};
  const color=colors[kind]??colors.goldBall,group=new THREE.Group();
  group.userData.kind=kind;group.userData.capsuleRadius=radius;
  const rows=Math.max(6,Math.floor(segments*.5));
  const lower=new THREE.Mesh(new THREE.SphereGeometry(radius,segments,rows,0,Math.PI*2,Math.PI/2,Math.PI/2),
    new THREE.MeshPhysicalMaterial({color,roughness:.27,metalness:.08,clearcoat:.65,emissive:kind==='jackpot'?0x1c4108:0x241500,emissiveIntensity:.22}));
  const upper=new THREE.Mesh(new THREE.SphereGeometry(radius,segments,rows,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshPhysicalMaterial({color:0xe9f4ee,transparent:true,opacity:.38,depthWrite:false,roughness:.13,metalness:0,clearcoat:1,side:THREE.FrontSide}));
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*.986,radius*.014,6,segments),
    new THREE.MeshStandardMaterial({color,roughness:.28,metalness:.22}));ring.rotation.x=Math.PI/2;
  const prize=new THREE.Mesh(new THREE.CylinderGeometry(radius*.39,radius*.39,radius*.13,12),
    new THREE.MeshStandardMaterial({color:0xecc777,metalness:.72,roughness:.4}));prize.position.y=radius*.19;prize.rotation.z=.35;
  lower.castShadow=true;lower.receiveShadow=true;ring.castShadow=true;prize.castShadow=true;
  group.add(lower,prize,ring,upper);return group;
}
