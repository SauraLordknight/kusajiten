import {nearCoffee} from './kusa-fishing-coffee.js';
import {nearWindowPlant} from './kusa-fishing-plant.js';
const polygon=(x,y,p)=>{let ok=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])ok=!ok;}return ok;};
const ground=[[17,44],[65,43],[77,55],[142,60],[151,12],[166,9],[181,28],[190,61],[199,77],[208,90],[239,90],[239,102],[208,106],[202,119],[184,126],[186,141],[201,140],[206,144],[202,149],[194,154],[181,159],[162,163],[142,166],[124,167],[111,166],[101,165],[95,164],[14,168],[7,185],[3,182],[3,159],[12,157],[20,149],[39,146],[50,141],[52,117],[15,111],[7,102],[16,94],[44,90],[52,81],[72,75],[91,67],[49,64],[15,58]];
// Walkable forecourt and the path between the two trees. Tree trunks block
// feet; their entire canopies must not seal this route in either direction.
const homePath=[[18,42],[73,42],[88,56],[106,62],[108,77],[79,84],[65,97],[49,105],[45,95],[54,80],[60,67],[18,61]];
// Sand-side anchors followed by their safe water-side landing points. These
// avoid the offshore rocks rather than blindly casting a fixed distance south.
const beach=[[106,164,117,180],[130,164,128,184],[150,162,173,179],[170,159,179,179],[190,153,209,172],[203,145,222,161]];
function beachCast(p){let best=null;for(let i=1;i<beach.length;i++){const a=beach[i-1],b=beach[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy))),distance=Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t);if(distance<=15&&(!best||distance<best.distance))best={distance,x:a[2]+(b[2]-a[2])*t,y:a[3]+(b[3]-a[3])*t};}return best;}
export const FishingWorld={
 spawn(map){return map==='house'?{map:'house',x:192,y:183,direction:'down'}:{map:'outdoor',x:53,y:50,direction:'down'};},
 walkable(map,x,y){const boxes=map==='house'?[[22,60,48,44],[69,67,21,35],[314,71,52,77],[336,146,34,40],[23,158,23,42]]:[[40,78,10,12],[101,101,12,14],[129,111,20,20],[166,110,19,18],[10,125,16,23]];return (map==='house'?x>=20&&x<=362&&y>=88&&y<=213:polygon(x,y,ground)||polygon(x,y,homePath))&&!boxes.some(([a,b,w,h])=>x>a-2&&x<a+w+2&&y>b-1&&y<b+h+1);},
 context(p){if(p.map==='house')return p.y>201&&Math.abs(p.x-192)<24?'exit':nearCoffee(p)?'coffee':nearWindowPlant(p)?'plant':null;if(p.x>=18&&p.x<=92&&p.y>=42&&p.y<=82)return 'home';return this.fishingSpot(p)?.location||null;},
 fishingSpot(p){if(p.map!=='outdoor')return null;if(p.x>218&&p.y>89&&p.y<104)return {location:'river',direction:'right',x:p.x+26,y:p.y+8};if(p.y>157&&p.y<179&&p.x<100)return {location:'sea',direction:'down',x:p.x+9,y:p.y+29};const cast=beachCast(p);return cast&&this.walkable(p.map,p.x,p.y)?{location:'sea',direction:'down',x:cast.x,y:cast.y}:null;},
 surface(p){return p.map==='house'||(p.x<101&&p.y>157)||(p.x>208&&p.y<106)?'wood':p.y>142?'sand':'grass';},
 restore(v){const p={map:v?.map==='outdoor'?'outdoor':'house',x:Number(v?.x),y:Number(v?.y),direction:['up','down','left','right'].includes(v?.direction)?v.direction:'down'};return this.walkable(p.map,p.x,p.y)?p:this.spawn(p.map);}
};
