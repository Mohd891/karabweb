export const gestures=[{id:'neutral',name:'عادي',emoji:'😐'},{id:'point',name:'سبابة',emoji:'☝️'},{id:'shush',name:'اششش',emoji:'🤫'},{id:'shy',name:'خجل',emoji:'👉👈'},{id:'punch',name:'قبضة',emoji:'👊'},{id:'shaka',name:'خنصر',emoji:'🤙'},{id:'peace',name:'إصبعين',emoji:'✌️'},{id:'salute',name:'تحية',emoji:'🫡'}];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function fingers(p){return [[8,6],[12,10],[16,14],[20,18]].map(([tip,pip])=>distance(p[tip],p[0])>distance(p[pip],p[0])*1.1)}
export function classify(hands,face){
 if(!hands.length)return 'neutral';
 const states=hands.map(fingers);
 if(face)for(let k=0;k<hands.length;k++){
  const p=hands[k],s=states[k],dx=Math.abs(p[12].x-p[0].x),dy=Math.abs(p[12].y-p[0].y);
  if(s[0]&&s[1]&&(s[2]||s[3])&&dx>=dy*.9&&[8,12].some(t=>face.temples.some(q=>distance(p[t],q)<face.width*.35)))return 'salute';
 }
 if(hands.length===2&&states.every(s=>s[0]&&!s[1]&&!s[2]&&!s[3])){
  const size=(distance(hands[0][0],hands[0][9])+distance(hands[1][0],hands[1][9]))/2;
  if(distance(hands[0][8],hands[1][8])<size*.8)return 'shy';
 }
 // Check shush across both hands before ordinary one-hand gestures.
 if(face)for(let k=0;k<hands.length;k++){
  const p=hands[k],[i,m,r,l]=states[k];
  if(i&&!m&&!r&&!l&&Math.abs(p[8].x-p[5].x)<Math.abs(p[8].y-p[5].y)*1.3&&[5,6,7,8].some(j=>distance(p[j],face.mouth)<face.width*.28))return 'shush';
 }
 for(const [i,m,r,l] of states){
  if(i&&!m&&!r&&!l)return 'point';
  if(i&&m&&!r&&!l)return 'peace';
  if(l&&!i&&!m&&!r)return 'shaka';
  if(!i&&!m&&!r&&!l)return 'punch';
 }
 return 'neutral';
}
