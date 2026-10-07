import {gestures,classify} from './gestures.mjs';
const $=id=>document.getElementById(id);
const video=$('camera'),canvas=$('overlay'),ctx=canvas.getContext('2d'),start=$('start'),stop=$('stop'),status=$('status');
let handDetector,faceDetector,loading,stream,running=false,starting=false,raf=0,lastVideo=-1,lastTick=0,lastFaceTime=0,face=null,current='neutral',candidate='neutral',candidateSince=0,generation=0;
const images=new Map();
for(const g of gestures){const im=new Image();im.src=`assets/${g.id}.jpg`;images.set(g.id,im);const card=document.createElement('div');card.className='gesture'+(g.id==='neutral'?' active':'');card.id=`card-${g.id}`;const thumb=document.createElement('img');thumb.src=im.src;thumb.alt=`ميم ${g.name}`;thumb.loading='lazy';const label=document.createElement('div');label.textContent=`${g.emoji} ${g.name}`;card.append(thumb,label);$('gestures').append(card)}
function message(text,error=false){status.textContent=text;status.classList.toggle('error',error)}
function showGesture(id){const g=gestures.find(x=>x.id===id);if(!g||current===id)return;current=id;$('meme').src=images.get(id).src;$('meme').alt=`ميم ${g.name}`;$('gesture-label').textContent=`${g.emoji} ${g.name}`;$('gesture-count').textContent=`${String(gestures.indexOf(g)+1).padStart(2,'0')} / 08`;for(const item of gestures)$(`card-${item.id}`).classList.toggle('active',item.id===id)}
async function models(){
 if(handDetector&&faceDetector)return;
 if(!loading)loading=(async()=>{
  const {FilesetResolver,HandLandmarker,FaceDetector}=await import('./assets/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks('./assets/wasm');
  const h=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'./assets/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.5,minTrackingConfidence:.6});
  try{const f=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'./assets/face_detector.tflite',delegate:'CPU'},runningMode:'VIDEO',minDetectionConfidence:.5});handDetector=h;faceDetector=f}catch(e){h.close();throw e}
 })().catch(e=>{loading=null;throw e});
 await loading;
}
async function begin(){
 if(running||starting)return;
 if(!navigator.mediaDevices?.getUserMedia){message('افتح الرابط في Safari أو Chrome للسماح بالكاميرا.',true);return}
 starting=true;const token=++generation;start.disabled=true;start.textContent='جاري التجهيز…';message('اسمح بالكاميرا، وبعدها نجهّز التعرّف على الحركات.');
 try{
  const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
  if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return}
  stream=acquired;
  video.srcObject=stream;await video.play();$('camera-empty').hidden=true;stop.hidden=false;
  message('جاري تحميل التعرّف على الحركات لأول مرة…');await models();
  if(token!==generation)return;
  running=true;lastVideo=-1;lastTick=0;face=null;candidate='neutral';candidateSince=performance.now();start.hidden=true;message('جاهز! خلّ يدك واضحة وثبّت الحركة لحظة.');
  stream.getVideoTracks()[0].addEventListener('ended',()=>{halt();message('الكاميرا توقفت. شغّلها مرة ثانية.')},{once:true});
  raf=requestAnimationFrame(loop);
 }catch(e){if(token!==generation)return;halt();const text=e.name==='NotAllowedError'?'الكاميرا غير مسموحة. اسمح لها من إعدادات المتصفح، ثم حاول مرة ثانية.':e.name==='NotFoundError'?'ما لقينا كاميرا على هذا الجهاز.':e.name==='NotReadableError'?'الكاميرا مشغولة. أغلق أي تطبيق يستخدمها وحاول مرة ثانية.':'تعذّر التجهيز. تأكد من اتصالك، وافتح الرابط في Safari أو Chrome وحاول مرة ثانية.';message(text,true);console.error(e)}
 finally{if(token===generation||!starting){starting=false;start.disabled=false;start.textContent='تشغيل الكاميرا'}}
}
function halt(){generation++;running=false;starting=false;cancelAnimationFrame(raf);const old=stream;stream=null;old?.getTracks().forEach(t=>t.stop());video.srcObject=null;ctx.clearRect(0,0,canvas.width,canvas.height);$('camera-empty').hidden=false;start.hidden=false;start.disabled=false;start.textContent='تشغيل الكاميرا';stop.hidden=true;face=null;showGesture('neutral');$('tracking').textContent='بانتظار حركتك';message('الكاميرا متوقفة.')}
function loop(now){
 if(!running)return;
 try{if(video.readyState>=2&&video.currentTime!==lastVideo&&now-lastTick>=80){
  lastVideo=video.currentTime;lastTick=now;const w=video.videoWidth,h=video.videoHeight;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  if(now-lastFaceTime>=180){
   const result=faceDetector.detectForVideo(video,now);lastFaceTime=now;
   const det=result.detections?.slice().sort((a,b)=>b.boundingBox.width*b.boundingBox.height-a.boundingBox.width*a.boundingBox.height)[0];
   if(det){const box=det.boundingBox,k=det.keypoints,eyes=[{x:k[0].x*w,y:k[0].y*h},{x:k[1].x*w,y:k[1].y*h}].sort((a,b)=>a.x-b.x);face={mouth:{x:k[3].x*w,y:k[3].y*h},width:box.width,temples:[{x:eyes[0].x-box.width*.12,y:eyes[0].y-box.height*.16},{x:eyes[1].x+box.width*.12,y:eyes[1].y-box.height*.16}],seen:now}}
   else if(face&&now-face.seen>1000)face=null;
  }
  const result=handDetector.detectForVideo(video,now),hands=result.landmarks.map(hand=>hand.map(p=>({x:p.x*w,y:p.y*h})));draw(hands);
  const raw=classify(hands,face);if(raw!==candidate){candidate=raw;candidateSince=now}else if(now-candidateSince>=180)showGesture(raw);
  $('tracking').textContent=hands.length?`تم التعرّف على ${hands.length===1?'يد واحدة':'يدين'}`:'خلّ يدك داخل الكادر';
 }}catch(e){halt();message('توقّف التعرّف. جرّب تشغيل الكاميرا مرة ثانية.',true);console.error(e);return}
 raf=requestAnimationFrame(loop);
}
function draw(hands){ctx.clearRect(0,0,canvas.width,canvas.height);const links=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];ctx.strokeStyle='#d2ff52';ctx.fillStyle='#d2ff52';ctx.lineWidth=2;for(const hand of hands){for(const [a,b]of links){ctx.beginPath();ctx.moveTo(hand[a].x,hand[a].y);ctx.lineTo(hand[b].x,hand[b].y);ctx.stroke()}for(const p of hand){ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}}}
start.addEventListener('click',begin);stop.addEventListener('click',halt);document.addEventListener('visibilitychange',()=>{if(document.hidden&&(running||starting))halt()});window.addEventListener('pagehide',halt);
// Agents can read the same visible state and stop an active camera.
if(document.modelContext?.registerTool){const lifetime=new AbortController();for(const tool of [{name:'read_gesture_state',description:'Read the current visible gesture and camera state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||Object.keys(input).length)throw new Error('No arguments expected');return{gesture:current,cameraRunning:running,status:status.textContent}}},{name:'stop_camera',description:'Stop the camera and return the visible meme to neutral.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||Object.keys(input).length)throw new Error('No arguments expected');halt();return{cameraRunning:false,gesture:current}}}])try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifetime.signal})).catch(()=>{})}catch{}window.addEventListener('pagehide',()=>lifetime.abort(),{once:true})}
