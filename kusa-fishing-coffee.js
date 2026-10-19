// Coordinates refer to the adopted 384 x 256 room, not to screen pixels.
export const COFFEE_SPOT={seat:{x:79,y:82},approach:{x:98,y:108},duration:8100};
// Precomputed alpha bounds avoid file:// cross-origin canvas readback.
export const COFFEE_BOUNDS=[[[93,103,328,498],[84,100,310,497],[82,102,313,497],[86,102,313,497]],[[93,59,335,456],[85,54,321,456],[78,57,318,456],[87,56,320,456]]];
export function nearCoffee(p){
 if(p?.map!=='house')return false;
 // Coordinates describe the player's feet beside the chair, or in front of
 // its bottom edge. Keep the old diagonal corner outside both regions.
 const right=p.x>=96&&p.x<=105&&p.y>=88&&p.y<=101;
 const below=p.x>=72&&p.x<=88&&p.y>=108&&p.y<=120;
 return right||below;
}
export function coffeeHit(x,y){return x>=22&&x<=95&&y>=47&&y<=108;}
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function coffeePose(rest,time){
 const elapsed=Math.max(0,time-rest.at),start=rest.origin,front=COFFEE_SPOT.approach,beside={x:98,y:96},feet={x:76,y:93};
 if(elapsed<450)return {stage:'approaching',point:mix(start,front,elapsed/450),direction:start.x>front.x?'left':'right',walking:true};
 if(elapsed<800)return {stage:'approaching',point:mix(front,beside,(elapsed-450)/350),direction:'up',walking:true};
 if(elapsed<1150)return {stage:'sitting',point:mix(beside,feet,(elapsed-800)/350),direction:'left',walking:true};
 if(elapsed<7200){const t=elapsed-1150,col=t<400?0:t<950?1:t<2350?2:t<3050?3:t<3500?1:t<4900?2:t<5650?3:0;return {stage:col===2?'sipping':'seated',col,seat:COFFEE_SPOT.seat};}
 if(elapsed<7550)return {stage:'standing',point:mix(feet,beside,(elapsed-7200)/350),direction:'right',walking:true};
 if(elapsed<7800)return {stage:'standing',point:mix(beside,front,(elapsed-7550)/250),direction:'down',walking:true};
 return {stage:'standing',point:mix(front,start,Math.min(1,(elapsed-7800)/300)),direction:'down',walking:true};
}
