
/* ---------- руки и кисти ---------- */
function armPts(D,T,s){
  const sx=CX+s*D.sw*.98,sy=D.yS+14;
  if(T.pose==='slump')return{sh:[sx,sy],el:[sx+s*8,sy+112],wr:[sx+s*3,sy+212]};
  if(T.pose==='swagger')return{sh:[sx,sy],el:[sx+s*26,sy+108],wr:[sx+s*18,sy+204]};
  return{sh:[sx,sy],el:[sx+s*8,sy+116],wr:[CX+s*D.sw*.52,D.yS+10]};
}
function sleeveOf(T){return T.top==='coat'?'#52402f':T.top==='track'?'#1f3a6b':null}
function arm(g,T,f,D,s){
  const a=armPts(D,T,s),sl=sleeveOf(T),base=sl||f.skin;
  limb(g,a.el[0],a.el[1],a.wr[0],a.wr[1],D.fore*1.08,D.fore*.74,base,1);
  limb(g,a.sh[0],a.sh[1],a.el[0],a.el[1],D.arm,D.arm*.84,base,1);
  const dr=D.arm*1.14,dp=new Path2D();dp.arc(a.sh[0]-s*2,a.sh[1]+4,dr,0,7);paint(g,dp,base,a.sh[0]-dr,a.sh[0]+dr,1);
  const ep=new Path2D();ep.arc(a.el[0],a.el[1],D.arm*.8,0,7);paint(g,ep,base,a.el[0]-D.arm,a.el[0]+D.arm,.9,'rgba(18,8,4,.18)');
  if(!sl){ // мышцы и грязь
    blob(g,(a.sh[0]+a.el[0])/2-s*3,(a.sh[1]+a.el[1])/2-6,D.arm*.55,34,[255,235,210],.12+.16*D.b);
    blob(g,(a.sh[0]+a.el[0])/2+s*5,(a.sh[1]+a.el[1])/2+14,D.arm*.5,28,[0,0,0],.16+.12*D.b);
    blob(g,(a.el[0]+a.wr[0])/2,(a.el[1]+a.wr[1])/2,D.fore*.5,30,[255,235,210],.08+.1*D.b);
    if(T.dirt>.1)blob(g,a.el[0],a.el[1]+10,D.arm*.9,26,[56,38,22],.35*T.dirt);
    if(D.b>.6){g.strokeStyle='rgba(30,12,6,.3)';g.lineWidth=2.4;g.lineCap='round';g.beginPath();g.moveTo(a.sh[0]-s*4,a.sh[1]+14);g.quadraticCurveTo(a.sh[0]+s*8,a.sh[1]+40,a.sh[0]+s*2,a.sh[1]+70);g.stroke()}
  }else{
    if(T.top==='track'){g.save();g.beginPath();g.rect(0,0,W,H);g.restore();g.strokeStyle='#ececec';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(a.sh[0]+s*(D.arm-6),a.sh[1]+8);g.lineTo(a.el[0]+s*(D.arm*.84-6),a.el[1]);g.lineTo(a.wr[0]+s*(D.fore*.75-5),a.wr[1]-8);g.stroke()}
    if(T.top==='coat'){blob(g,a.el[0],a.el[1],D.arm,24,[20,14,8],.35);g.fillStyle='#3a2d22';g.beginPath();g.ellipse(a.wr[0],a.wr[1]-4,D.fore*.9,9,0,0,7);g.fill();
      g.fillStyle=f.skin;for(let i=0;i<5;i++){g.beginPath();g.moveTo(a.wr[0]-D.fore*.8+i*D.fore*.4,a.wr[1]+2);g.lineTo(a.wr[0]-D.fore*.8+i*D.fore*.4+4,a.wr[1]-10);g.lineTo(a.wr[0]-D.fore*.8+i*D.fore*.4+8,a.wr[1]+2);g.fill()}}
  }
}
function glovePath(w,h){const p=new Path2D();p.ellipse(0,-h*.55,w,h,0,0,7);return p}
function hand(g,T,f,D,s){
  const a=armPts(D,T,s),wr=a.wr,el=a.el,th=Math.atan2(wr[1]-el[1],wr[0]-el[0])+Math.PI/2;
  g.save();g.translate(wr[0],wr[1]);g.rotate(th);
  const k=T.hands,b=D.b;
  if(k==='bare'||k==='wraps'){
    const r=lerp(14,19,b),p=glovePath(r*1.05,r*1.1);
    paint(g,p,f.skin,-r,r,1);
    g.strokeStyle='rgba(20,8,4,.5)';g.lineWidth=2;for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(i*r*.5,-r*1.6);g.lineTo(i*r*.55,-r*.7);g.stroke()}
    g.fillStyle=f.skin;g.beginPath();g.ellipse(-s*r*.9,-r*.6,r*.34,r*.7,s*.4,0,7);g.fill();g.stroke();
    if(T.dirt>.1)blob(g,0,-r,r,r*.8,[50,36,20],.35*T.dirt);
    if(k==='wraps'){
      g.fillStyle='#e8e2d0';g.strokeStyle='rgba(60,50,30,.55)';g.lineWidth=1.6;
      for(let i=0;i<5;i++){g.beginPath();g.moveTo(-r*1.02,-r*.2-i*7);g.lineTo(r*1.02,-r*.9-i*7);g.lineTo(r*1.02,-r*.9-i*7+6);g.lineTo(-r*1.02,-r*.2-i*7+6);g.closePath();g.fill();g.stroke()}
      g.fillStyle='rgba(120,20,20,.35)';g.beginPath();g.arc(r*.3,-r*1.2,4,0,7);g.fill();
    }
  }else if(k==='boxglove'||k==='goldglove'){
    const gold=k==='goldglove',c1=gold?'#e8ae3a':'#cf2a30',c0=gold?'#7a4c0a':'#6e1015',hi=gold?'#fff2a8':'#ff8a80';
    const w=35,h=33,p=glovePath(w,h);
    const q=g.createRadialGradient(-12,-h*.9,4,0,-h*.55,w*1.25);q.addColorStop(0,hi);q.addColorStop(.35,c1);q.addColorStop(1,c0);
    g.fillStyle=q;g.fill(p);g.strokeStyle='rgba(15,4,4,.85)';g.lineWidth=2.6;g.stroke(p);
    g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=2.4;g.beginPath();g.moveTo(-w*.6,-h*.25);g.quadraticCurveTo(0,-h*.05,w*.6,-h*.25);g.stroke();
    g.beginPath();g.ellipse(-s*w*.62,-h*.5,w*.32,h*.5,s*.3,0,7);g.stroke(); // большой палец
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-w*.3,-h*1.18,w*.4,h*.16,-.4,0,7);g.fill();
    g.fillStyle=gold?'#15120a':'#f0f0ea';g.fillRect(-w*.62,2,w*1.24,18);g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=2;g.strokeRect(-w*.62,2,w*1.24,18);
    g.strokeStyle=gold?'#e8ae3a':'#999';g.lineWidth=1.6;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-w*.5+i*w*.33,4);g.lineTo(-w*.5+i*w*.33,18);g.stroke()}
  }else{ // ммa-перчатка
    const ac=T.accent,w=27,h=24;
    // пальцы
    g.fillStyle=shade(f.skin,-8);g.strokeStyle='rgba(20,8,4,.7)';g.lineWidth=1.8;
    for(let i=0;i<4;i++){g.beginPath();g.roundRect?g.roundRect(-w*.92+i*w*.47,-h*1.95,w*.44,h*.8,6):g.rect(-w*.92+i*w*.47,-h*1.95,w*.44,h*.8);g.fill();g.stroke()}
    const p=glovePath(w,h*1.05),q=g.createRadialGradient(-8,-h*.9,3,0,-h*.55,w*1.3);q.addColorStop(0,'#4a4a52');q.addColorStop(.4,'#1b1b1f');q.addColorStop(1,'#08080a');
    g.fillStyle=q;g.fill(p);g.strokeStyle='rgba(0,0,0,.9)';g.lineWidth=2.4;g.stroke(p);
    g.strokeStyle=ac;g.lineWidth=4.5;g.beginPath();g.moveTo(-w*.9,-h*.5);g.quadraticCurveTo(0,-h*.25,w*.9,-h*.5);g.stroke();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=2;g.beginPath();g.moveTo(-w*.6,-h*1.45);g.quadraticCurveTo(-w*.2,-h*1.7,w*.3,-h*1.55);g.stroke();
    g.fillStyle='#101012';g.fillRect(-w*.62,2,w*1.24,15);g.strokeStyle=ac;g.lineWidth=2.4;g.strokeRect(-w*.62,2,w*1.24,15);
  }
  g.restore();
}

/* ---------- реквизит и аксессуары ---------- */
function bottle(g,D,T,f){
  const a=armPts(D,T,1),x=a.wr[0]+6,y=a.wr[1]-6;
  const q=g.createLinearGradient(x-12,0,x+12,0);q.addColorStop(0,'#16301a');q.addColorStop(.35,'#5b9a54');q.addColorStop(1,'#12261a');
  const p=new Path2D();p.moveTo(x-11,y+34);p.lineTo(x-11,y-18);p.quadraticCurveTo(x-11,y-30,x-4,y-38);p.lineTo(x-4,y-58);p.lineTo(x+4,y-58);p.lineTo(x+4,y-38);p.quadraticCurveTo(x+11,y-30,x+11,y-18);p.lineTo(x+11,y+34);p.closePath();
  g.fillStyle=q;g.fill(p);g.strokeStyle='rgba(8,18,8,.9)';g.lineWidth=2.2;g.stroke(p);
  g.fillStyle='#e6dfc4';g.fillRect(x-11,y-8,22,22);g.fillStyle='#a33';g.fillRect(x-11,y-2,22,6);
  g.fillStyle='rgba(255,255,255,.5)';g.fillRect(x-7,y-30,3,50);g.fillStyle='#b78a2d';g.fillRect(x-5,y-60,10,5);
}
function bag(g,D,T,f){
  const a=armPts(D,T,-1),x=a.wr[0]-6,y=a.wr[1]+34;
  g.strokeStyle='rgba(215,222,226,.9)';g.lineWidth=3;g.beginPath();g.moveTo(x-6,y-34);g.quadraticCurveTo(x-18,y-14,x-12,y);g.moveTo(x+6,y-34);g.quadraticCurveTo(x+18,y-14,x+12,y);g.stroke();
  const p=new Path2D();p.moveTo(x-22,y);p.quadraticCurveTo(x-34,y+34,x-16,y+58);p.quadraticCurveTo(x,y+66,x+18,y+58);p.quadraticCurveTo(x+36,y+34,x+22,y);p.closePath();
  g.fillStyle='rgba(205,214,220,.88)';g.fill(p);g.strokeStyle='rgba(60,70,80,.7)';g.lineWidth=2;g.stroke(p);
  g.fillStyle='rgba(40,90,170,.7)';g.fillRect(x-24,y+14,48,9);
  g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.6;g.beginPath();g.moveTo(x-12,y+8);g.lineTo(x-6,y+46);g.moveTo(x+8,y+4);g.lineTo(x+14,y+40);g.stroke();
}
function chain(g,D){
  g.strokeStyle='#d8a62d';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(CX-30,D.yN-2);g.quadraticCurveTo(CX,D.yS+86,CX+30,D.yN-2);g.stroke();
  g.strokeStyle='#fff1a8';g.lineWidth=1.6;g.setLineDash([3,5]);g.beginPath();g.moveTo(CX-30,D.yN-2);g.quadraticCurveTo(CX,D.yS+86,CX+30,D.yN-2);g.stroke();g.setLineDash([]);
  const py=D.yS+60;g.fillStyle='#d8a62d';g.beginPath();g.arc(CX,py,12,0,7);g.fill();g.strokeStyle='#6a4a0a';g.lineWidth=2;g.stroke();
  g.fillStyle='#6a4a0a';g.font="bold 15px 'Russo One',Impact";g.textAlign='center';g.fillText('Р',CX,py+5.5);
}
function towel(g,D){
  for(const s of[-1,1]){
    const p=new Path2D();p.moveTo(CX+s*22,D.yN-8);p.quadraticCurveTo(CX+s*70,D.yN-4,CX+s*(D.sw-8),D.yS+18);p.lineTo(CX+s*(D.sw-34),D.yS+160);p.lineTo(CX+s*18,D.yS+150);p.quadraticCurveTo(CX+s*14,D.yS+60,CX+s*22,D.yN-8);p.closePath();
    paint(g,p,'#eeeeea',CX+(s<0?-D.sw:0),CX+(s<0?0:D.sw),.9);
    g.save();g.clip(p);g.fillStyle='#c4242a';g.fillRect(CX-D.sw,D.yS+104,D.sw*2,12);g.fillRect(CX-D.sw,D.yS+126,D.sw*2,5);g.restore();
  }
}
function belt(g,D){
  const y=D.yH-26,x=D.hw+12;
  const p=new Path2D();p.rect(CX-x,y,x*2,40);paint(g,p,'#141416',CX-x,CX+x,.8);
  g.strokeStyle='#d8a62d';g.lineWidth=2.6;g.setLineDash([8,5]);g.beginPath();g.moveTo(CX-x,y+6);g.lineTo(CX+x,y+6);g.moveTo(CX-x,y+34);g.lineTo(CX+x,y+34);g.stroke();g.setLineDash([]);
  [-1,1].forEach(s=>{const q=g.createLinearGradient(CX+s*76-18,0,CX+s*76+18,0);q.addColorStop(0,'#8a5a10');q.addColorStop(.5,'#ffe27a');q.addColorStop(1,'#8a5a10');g.fillStyle=q;g.beginPath();g.ellipse(CX+s*76,y+20,18,24,0,0,7);g.fill();g.strokeStyle='#4a2f05';g.lineWidth=2;g.stroke()});
  const cq=g.createRadialGradient(CX-14,y-4,4,CX,y+20,64);cq.addColorStop(0,'#fff6b8');cq.addColorStop(.45,'#e8ae3a');cq.addColorStop(1,'#7a4c0a');
  g.fillStyle=cq;g.beginPath();g.ellipse(CX,y+20,54,44,0,0,7);g.fill();g.strokeStyle='#3a2503';g.lineWidth=3;g.stroke();
  g.strokeStyle='rgba(58,37,3,.75)';g.lineWidth=2.4;g.beginPath();g.ellipse(CX,y+20,44,34,0,0,7);g.stroke();
  const sg=g.createRadialGradient(CX,y+20,2,CX,y+20,26);sg.addColorStop(0,'#c42a30');sg.addColorStop(1,'#6e1015');g.fillStyle=sg;g.beginPath();g.ellipse(CX,y+20,25,20,0,0,7);g.fill();g.strokeStyle='#3a2503';g.lineWidth=2;g.stroke();
  g.fillStyle='#ffe27a';g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?5:12;g.lineTo(CX+Math.cos(a)*r,y+20+Math.sin(a)*r*.82)}g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(CX-20,y+2,14,6,-.5,0,7);g.fill();
}
function waist(g,T,D){
  if(T.top==='coat')return;
  const y0=D.yH-20,x=D.hw+6;
  const col={rags:'#2a2924',track:'#15294f',jeans:'#1d2f4a',box:'#f2f2f2',mma:'#0c0c0f',mmapro:'#0c0c0f',mmagold:'#0c0c0f'}[T.pants];
  const p=new Path2D();p.rect(CX-x,y0,x*2,28);paint(g,p,col,CX-x,CX+x,.8);
  if(T.pants==='jeans'){g.fillStyle='#3a2a1a';g.fillRect(CX-x,y0+6,x*2,10);g.fillStyle='#d0b050';g.fillRect(CX-10,y0+4,20,14);g.strokeStyle='#5a4a10';g.lineWidth=1.6;g.strokeRect(CX-10,y0+4,20,14)}
  if(T.pants==='box'){g.fillStyle='#b5262b';g.fillRect(CX-x,y0+20,x*2,8);g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;g.beginPath();g.moveTo(CX,y0);g.lineTo(CX,y0+28);g.stroke()}
  if(T.pants==='mma'||T.pants==='mmapro'||T.pants==='mmagold'){g.fillStyle=T.pants==='mmagold'?'#e0a030':T.accent;g.fillRect(CX-x,y0+22,x*2,6)}
  if(T.pants==='track'){g.strokeStyle='#ececec';g.lineWidth=3;g.beginPath();g.moveTo(CX-6,y0);g.lineTo(CX-6,y0+28);g.moveTo(CX+6,y0);g.lineTo(CX+6,y0+28);g.stroke()}
}
function pelvis(g,T,D){
  const c=PANTS[T.pants].c,p=new Path2D(),x=D.hw+2;
  p.moveTo(CX-x,D.yH-14);p.lineTo(CX+x,D.yH-14);p.bezierCurveTo(CX+x+4,D.yH+40,CX+34,610,CX,624);p.bezierCurveTo(CX-34,610,CX-x-4,D.yH+40,CX-x,D.yH-14);p.closePath();
  paint(g,p,c,CX-x,CX+x,.9);
}
function neck(g,T,f,D){
  const p=tubeP(CX,D.hy+34,CX,D.yN+16,D.neck,D.neck*1.18);paint(g,p,f.skin,CX-D.neck*1.2,CX+D.neck*1.2,1);
  blob(g,CX,D.hy+68,D.neck*1.1,18,[0,0,0],.4);
  if(D.b>.5){g.strokeStyle='rgba(30,12,6,.22)';g.lineWidth=3;g.lineCap='round';for(const s of[-1,1]){g.beginPath();g.moveTo(CX+s*D.neck*.6,D.hy+54);g.lineTo(CX+s*D.neck*1.1,D.yN+10);g.stroke()}}
}

/* ---------- сборка фигуры ---------- */
function drawFigure(g,T,f){
  const D=dims(T);
  bareLegs(g,T,f,D);
  foot(g,T,f,D,-1,T.shoes,0);foot(g,T,f,D,1,T.shoes,0);
  pelvis(g,T,D);pantsLeg(g,T,f,D,-1);pantsLeg(g,T,f,D,1);
  neck(g,T,f,D);
  paint(g,torsoP(D),f.skin,CX-D.sw,CX+D.sw,1);muscles(g,T,f,D);
  if(T.top==='tank')tankTop(g,T,D);
  if(T.top==='track')trackJacket(g,T,D);
  waist(g,T,D);
  if(T.top==='coat')coat(g,T,D);
  if(T.prop==='belt')belt(g,D);
  if(T.top==='robe')robe(g,T,D);
  if(T.prop==='towel')towel(g,D);
  if(T.prop==='chain')chain(g,D);
  arm(g,T,f,D,-1);arm(g,T,f,D,1);
  hand(g,T,f,D,-1);hand(g,T,f,D,1);
  if(T.prop==='bottle'){bottle(g,D,T,f);bag(g,D,T,f)}
  return D;
}
