
/* ---------- примитивы с объёмным светом ---------- */
function tubeP(x1,y1,x2,y2,r1,r2){
  const th=Math.atan2(y2-y1,x2-x1),a=th+Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),p=new Path2D();
  p.moveTo(x1+dx*r1,y1+dy*r1);p.lineTo(x2+dx*r2,y2+dy*r2);p.arc(x2,y2,r2,a,a-Math.PI,true);
  p.lineTo(x1-dx*r1,y1-dy*r1);p.arc(x1,y1,r1,a-Math.PI,a-2*Math.PI,true);p.closePath();return p;
}
function cyl(g,x0,x1,k){
  const q=g.createLinearGradient(x0,0,x1,0);
  q.addColorStop(0,'rgba(0,0,0,'+(.5*k)+')');q.addColorStop(.2,'rgba(0,0,0,0)');q.addColorStop(.4,'rgba(255,238,215,'+(.2*k)+')');
  q.addColorStop(.62,'rgba(0,0,0,0)');q.addColorStop(.88,'rgba(0,0,0,'+(.38*k)+')');q.addColorStop(.97,'rgba(120,170,255,'+(.26*k)+')');q.addColorStop(1,'rgba(0,0,0,'+(.5*k)+')');
  return q;
}
function paint(g,p,base,x0,x1,k,line){
  g.fillStyle=base;g.fill(p);g.fillStyle=cyl(g,x0,x1,k==null?1:k);g.fill(p);
  if(line!==null){g.lineWidth=2.4;g.lineJoin='round';g.strokeStyle=line||'rgba(18,8,4,.75)';g.stroke(p)}
}
function limb(g,x1,y1,x2,y2,r1,r2,base,k,line){
  paint(g,tubeP(x1,y1,x2,y2,r1,r2),base,Math.min(x1-r1,x2-r2),Math.max(x1+r1,x2+r2),k,line);
}
function lerpPt(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}

/* ---------- пропорции по телосложению ---------- */
function dims(T){
  const b=T.build,h=T.hunch;
  return{b,h,sw:lerp(66,120,b)*(1-.05*h),cw:lerp(50,92,b),ww:lerp(51,61,b),hw:lerp(54,66,b),
    yN:262+8*h,yS:284+10*h,yA:372+6*h,yW:484,yH:534,hx:CX,hy:178+16*h,hs:.54,
    thigh:lerp(25,41,b),calf:lerp(17,27,b),arm:lerp(14,27,b),fore:lerp(11,21,b),neck:lerp(17,31,b)};
}

/* ---------- ноги, одежда на ногах, обувь ---------- */
const PANTS={
  rags:{c:'#3e3d35',end:772,wide:7},track:{c:'#1f3a6b',end:806,wide:6},jeans:{c:'#2f4a6e',end:808,wide:5},
  box:{c:'#b5262b',end:646,wide:12},mma:{c:'#14213a',end:702,wide:9},mmapro:{c:'#0f1512',end:702,wide:9},mmagold:{c:'#0d0d10',end:706,wide:9}
};
const HIP_Y=528,KNEE_Y=668,ANK_Y=802;
function legPts(s){return{hip:[CX+s*40,HIP_Y],knee:[CX+s*47,KNEE_Y],ank:[CX+s*44,ANK_Y]}}
function bareLegs(g,T,f,D){
  for(const s of[-1,1]){
    const p=legPts(s);
    limb(g,p.hip[0],p.hip[1],p.knee[0],p.knee[1],D.thigh,D.thigh*.74,f.skin,1);
    limb(g,p.knee[0],p.knee[1],p.ank[0],p.ank[1],D.calf*1.06,D.calf*.6,f.skin,1);
    // колено, икра, рельеф
    blob(g,p.knee[0]-s*2,p.knee[1]-4,D.thigh*.5,18,[255,235,210],.12);
    blob(g,p.knee[0]+s*8,p.knee[1]+52,D.calf*.5,32,[0,0,0],.16*D.b+.08);
    blob(g,p.knee[0]-s*5,p.knee[1]+48,D.calf*.35,28,[255,235,210],.12*D.b);
    if(D.b>.4){g.strokeStyle='rgba(0,0,0,'+(.14*D.b)+')';g.lineWidth=2.4;g.beginPath();g.moveTo(p.hip[0]+s*6,p.hip[1]+16);g.quadraticCurveTo(p.hip[0]+s*14,p.hip[1]+70,p.knee[0]+s*12,p.knee[1]-30);g.stroke()}
    if(T.dirt>.1){blob(g,p.knee[0]-s*4,p.knee[1]+30,D.calf*.9,40,[60,40,24],.25*T.dirt);blob(g,p.ank[0],p.ank[1]-20,D.calf*.9,26,[50,36,22],.3*T.dirt)}
  }
}
function foot(g,T,f,D,s,kind,t){
  const x=CX+s*47,y=806,fx=x+s*12,fy=828;
  const sole=(c)=>{g.fillStyle=c;g.beginPath();g.ellipse(fx,fy+9,35,15,s*.12,0,7);g.fill()};
  if(kind==='bare'||(kind==='mismatch'&&s===1)){
    const base=kind==='bare'?f.skin:'#7d7a6c';
    if(kind==='mismatch'){ // нога замотана тряпкой
      limb(g,x,ANK_Y-34,x+s*6,ANK_Y+8,D.calf*.78,D.calf*.78,'#8d8a7c',.9);
      g.strokeStyle='rgba(30,25,15,.5)';g.lineWidth=2.4;for(let i=0;i<4;i++){g.beginPath();g.moveTo(x-18,ANK_Y-26+i*9);g.lineTo(x+18,ANK_Y-18+i*9);g.stroke()}
    }
    paint(g,(()=>{const p=new Path2D();p.ellipse(fx,fy,34,17,s*.12,0,7);return p})(),f.skin,fx-34,fx+34,.9);
    if(kind==='bare'){
      for(let i=0;i<5;i++){const tx=fx+s*(-18+i*9)*(-1)*(-1)*1+(-s)*0,tr=5.5-i*.45;
        const px=fx+s*(i*9-4)+(s>0?0:0),py=fy+13-Math.abs(i-1.4)*1.2;
        g.fillStyle=f.skin;g.strokeStyle='rgba(20,8,4,.6)';g.lineWidth=1.6;g.beginPath();g.ellipse(px+s*4,py+4,tr+1,tr,0,0,7);g.fill();g.stroke()}
    }else{ // выглядывающие грязные пальцы
      g.fillStyle='#5a4632';for(let i=0;i<3;i++){g.beginPath();g.arc(fx+s*(8+i*9),fy+14,4,0,7);g.fill()}
    }
    blob(g,fx,fy+12,32,8,[0,0,0],.25);
    return;
  }
  const col={sneaker:'#ecece6',boots:'#5a3a22',boxboots:'#141416',mismatch:'#2b2018'}[kind];
  if(kind==='boxboots'){ // высокая шнуровка
    limb(g,x,ANK_Y-62,x+s*2,ANK_Y,D.calf*.86,D.calf*.74,'#141416',1.05);
    g.fillStyle='#b5262b';g.fillRect(x-D.calf*.86,ANK_Y-66,D.calf*1.72,9);
    g.strokeStyle='#f0f0f0';g.lineWidth=2.2;for(let i=0;i<6;i++){g.beginPath();g.moveTo(x-8,ANK_Y-52+i*9);g.lineTo(x+8,ANK_Y-46+i*9);g.stroke()}
  }
  sole(kind==='sneaker'?'#2b2b2e':'#0f0f10');
  const sp=new Path2D();sp.ellipse(fx,fy,35,18,s*.12,0,7);paint(g,sp,col,fx-35,fx+35,1);
  blob(g,fx-s*6,fy-8,20,7,[255,255,255],kind==='sneaker'?.35:.12);
  if(kind==='sneaker'){g.strokeStyle='#c8322e';g.lineWidth=4;g.beginPath();g.moveTo(fx-24,fy+3);g.quadraticCurveTo(fx,fy-8,fx+24,fy+3);g.stroke();
    g.strokeStyle='rgba(40,40,40,.5)';g.lineWidth=1.6;for(let i=0;i<4;i++){g.beginPath();g.moveTo(x-8+s*i*2,fy-17+i*5);g.lineTo(x+8+s*i*2,fy-12+i*5);g.stroke()}}
  if(kind==='boots'||kind==='mismatch'){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2;g.beginPath();g.moveTo(fx-22,fy-6);g.quadraticCurveTo(fx,fy-14,fx+22,fy-6);g.stroke();
    g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.ellipse(fx-s*10,fy-8,12,4,0,0,7);g.fill()}
  if(T.dirt>.2)blob(g,fx,fy+4,30,10,[40,28,16],.4*T.dirt);
}
function pantsLeg(g,T,f,D,s){
  const sp=PANTS[T.pants],p=legPts(s),R1=D.thigh+sp.wide,R2=D.thigh*.74+sp.wide,R3=D.calf*1.06+sp.wide*.7,R4=D.calf*.6+sp.wide*.7;
  const end=sp.end;let pa;
  const full=new Path2D();
  if(end<=KNEE_Y){const e=lerpPt(p.hip,p.knee,(end-HIP_Y)/(KNEE_Y-HIP_Y));full.addPath(tubeP(p.hip[0],p.hip[1],e[0],e[1],R1,lerp(R1,R2,(end-HIP_Y)/(KNEE_Y-HIP_Y))))}
  else{const e=lerpPt(p.knee,p.ank,(end-KNEE_Y)/(ANK_Y-KNEE_Y));
    full.addPath(tubeP(p.hip[0],p.hip[1],p.knee[0],p.knee[1],R1,R2));full.addPath(tubeP(p.knee[0],p.knee[1],e[0],e[1],R3,lerp(R3,R4,(end-KNEE_Y)/(ANK_Y-KNEE_Y))))}
  const x0=CX+s*43-R1,x1=CX+s*43+R1;
  g.lineWidth=4.8;g.lineJoin='round';g.strokeStyle='rgba(18,8,4,.75)';g.stroke(full);
  paint(g,full,sp.c,x0,x1,.9,null);
  g.save();g.clip(full);
  // складки
  g.strokeStyle='rgba(0,0,0,.26)';g.lineWidth=2.4;
  [[p.hip[0]-s*10,HIP_Y+40,p.knee[0]-s*6,KNEE_Y-60],[p.hip[0]+s*14,HIP_Y+50,p.knee[0]+s*12,KNEE_Y-70]].forEach(l=>{g.beginPath();g.moveTo(l[0],l[1]);g.quadraticCurveTo((l[0]+l[2])/2+s*6,(l[1]+l[3])/2,l[2],l[3]);g.stroke()});
  for(let i=0;i<4;i++){const y=KNEE_Y-14+i*9;g.beginPath();g.moveTo(p.knee[0]-R2,y);g.quadraticCurveTo(p.knee[0],y+4,p.knee[0]+R2,y);g.stroke()}
  g.strokeStyle='rgba(255,255,255,.08)';g.beginPath();g.moveTo(p.hip[0]-s*14,HIP_Y+30);g.lineTo(p.knee[0]-s*10,KNEE_Y-30);g.stroke();
  const outer=(w,c,from,to)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(p.hip[0]+s*(R1-9),from);g.lineTo(p.knee[0]+s*(R2-8),KNEE_Y);if(to>KNEE_Y)g.lineTo(p.ank[0]+s*(R4+2),to);g.stroke()};
  if(T.pants==='track'){outer(6,'#ececec',HIP_Y+20,end-6);outer(2,'#ececec',HIP_Y+20,end-6)}
  if(T.pants==='box'){outer(9,'#f2f2f2',HIP_Y+10,end);g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(p.hip[0]-s*8,HIP_Y+60,10,36,.1,0,7);g.fill()}
  if(T.pants==='mma'){g.fillStyle=T.accent;g.beginPath();g.moveTo(p.hip[0]+s*R1,HIP_Y);g.lineTo(p.hip[0]+s*(R1-30),HIP_Y);g.lineTo(p.knee[0]+s*(R2-34),end);g.lineTo(p.knee[0]+s*(R2+4),end);g.closePath();g.fill()}
  if(T.pants==='mmapro'||T.pants==='mmagold'){
    const ac=T.pants==='mmapro'?T.accent:'#e0a030';
    g.strokeStyle=ac;g.lineWidth=5;for(let i=-3;i<8;i++){g.beginPath();g.moveTo(p.hip[0]-R1,HIP_Y+i*20);g.lineTo(p.hip[0]+R1,HIP_Y+i*20-46);g.stroke()}
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(p.hip[0]-R1,HIP_Y+30,R1*2,6)
  }
  if(T.pants==='jeans'){blob(g,p.knee[0],KNEE_Y,R2*.9,24,[150,170,200],.3);blob(g,p.hip[0],HIP_Y+60,R1*.8,40,[10,20,40],.25);g.strokeStyle='rgba(20,40,80,.6)';g.setLineDash([6,4]);g.beginPath();g.moveTo(p.hip[0]+s*(R1-10),HIP_Y+10);g.lineTo(p.knee[0]+s*(R2-8),KNEE_Y);g.lineTo(p.ank[0]+s*(R4),end);g.stroke();g.setLineDash([])}
  if(T.pants==='rags'){
    const px=p.knee[0]-s*6;g.fillStyle='#5a4a33';g.fillRect(px-14,KNEE_Y-20,30,34);g.strokeStyle='rgba(0,0,0,.6)';g.setLineDash([4,3]);g.strokeRect(px-14,KNEE_Y-20,30,34);g.setLineDash([]);
    blob(g,p.hip[0],HIP_Y+70,R1,50,[20,14,8],.35);blob(g,p.ank[0],ANK_Y-40,R3,30,[30,22,12],.4);
  }
  if(T.pants==='box'||T.pants==='mma'||T.pants==='mmapro'||T.pants==='mmagold'){ // нижняя кромка
    g.strokeStyle=T.pants==='mmagold'?'#e0a030':'rgba(255,255,255,.55)';g.lineWidth=T.pants==='mmagold'?7:5;const e=lerpPt(p.hip,p.knee,(end-HIP_Y)/(KNEE_Y-HIP_Y));
    g.beginPath();g.moveTo(e[0]-R2-8,end+(end>KNEE_Y?0:0));g.lineTo(e[0]+R2+8,end);g.stroke()}
  g.restore();
  if(T.pants==='rags'){ // рваный низ: кожа сквозь дыры
    const e=lerpPt(p.knee,p.ank,(end-KNEE_Y)/(ANK_Y-KNEE_Y));g.fillStyle=f.skin;
    for(let i=0;i<6;i++){const x=e[0]-R4+i*(R4*2/5.5)+3;g.beginPath();g.moveTo(x-6,end+2);g.lineTo(x,end-9-(i%2)*7);g.lineTo(x+6,end+2);g.closePath();g.fill()}
  }
}
