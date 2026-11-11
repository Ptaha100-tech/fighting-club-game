
/* ---------- торс ---------- */
function torsoP(D){
  const{sw,cw,ww,hw,yN,yS,yA,yW,yH}=D,p=new Path2D();
  p.moveTo(CX-26,yN);p.bezierCurveTo(CX-52,yN+4,CX-sw+20,yS-8,CX-sw,yS+6);
  p.bezierCurveTo(CX-sw-4,yS+40,CX-cw-4,yA-30,CX-cw,yA);
  p.bezierCurveTo(CX-cw+2,yA+50,CX-ww-4,yW-60,CX-ww,yW);
  p.bezierCurveTo(CX-ww-2,yW+20,CX-hw,yH-20,CX-hw,yH);
  p.lineTo(CX+hw,yH);p.bezierCurveTo(CX+hw,yH-20,CX+ww+2,yW+20,CX+ww,yW);
  p.bezierCurveTo(CX+ww+4,yW-60,CX+cw-2,yA+50,CX+cw,yA);
  p.bezierCurveTo(CX+cw+4,yA-30,CX+sw+4,yS+40,CX+sw,yS+6);
  p.bezierCurveTo(CX+sw-20,yS-8,CX+52,yN+4,CX+26,yN);p.closePath();return p;
}
function muscles(g,T,f,D){
  const b=D.b,{sw,cw,yS,yA,yW}=D;
  g.save();g.clip(torsoP(D));
  const dk=(a)=>'rgba(30,12,6,'+a+')';
  // ключицы и трапеции
  g.strokeStyle=dk(.28);g.lineWidth=2.6;g.lineCap='round';
  for(const s of[-1,1]){g.beginPath();g.moveTo(CX+s*14,D.yN+14);g.quadraticCurveTo(CX+s*sw*.5,yS-6,CX+s*(sw-14),yS+8);g.stroke()}
  // грудные
  const py=yS+58;
  for(const s of[-1,1]){
    blob(g,CX+s*cw*.42,py,cw*.5,34+b*10,[255,235,210],.1+.12*b);
    g.strokeStyle=dk(.18+.3*b);g.lineWidth=3+b*3;g.beginPath();g.moveTo(CX+s*4,py+22+b*8);g.quadraticCurveTo(CX+s*cw*.5,py+50+b*12,CX+s*(cw-4),py+16);g.stroke();
    blob(g,CX+s*cw*.42,py+48+b*8,cw*.46,10+b*6,[20,6,2],.2+.22*b);
  }
  g.strokeStyle=dk(.16+.2*b);g.lineWidth=2.4;g.beginPath();g.moveTo(CX,yS+30);g.lineTo(CX,yW-10);g.stroke();
  if(b<.35){ // рёбра: худой, недокормленный
    g.strokeStyle=dk(.26*(1-b*1.5));g.lineWidth=2.6;
    for(let i=0;i<5;i++)for(const s of[-1,1]){g.beginPath();g.moveTo(CX+s*8,yS+84+i*14);g.quadraticCurveTo(CX+s*cw*.5,yS+96+i*14,CX+s*(cw-8),yS+84+i*14);g.stroke()}
    blob(g,CX,yW-22,ww(D)*1.1,26,[255,235,210],.1);
  }
  if(b>.28){ // пресс
    const a=clamp((b-.28)/.5,0,1);
    for(let r=0;r<3;r++)for(const s of[-1,1]){const x=CX+s*17,y=yA+34+r*37;
      g.fillStyle=dk(.18*a);g.beginPath();g.ellipse(x,y+8,15,5.5,0,0,Math.PI);g.fill();
      blob(g,x-s*2,y-6,12,10,[255,240,220],.14*a);
      g.strokeStyle=dk(.2*a);g.lineWidth=2;g.beginPath();g.moveTo(CX+s*3,y-18);g.lineTo(CX+s*3,y+18);g.stroke()}
    for(const s of[-1,1]){g.strokeStyle=dk(.22*a);g.lineWidth=3;g.beginPath();g.moveTo(CX+s*(cw-6),yA+4);g.quadraticCurveTo(CX+s*(ww(D)-1),yW-50,CX+s*(ww(D)-6),yW);g.stroke();
      for(let i=0;i<3;i++){g.beginPath();g.moveTo(CX+s*(cw-12),yA+14+i*13);g.lineTo(CX+s*(cw-26),yA+22+i*13);g.stroke()}}
  }
  // тени от света сверху и снизу
  blob(g,CX,yW+16,ww(D)*1.3,26,[0,0,0],.28);
  blob(g,CX-sw*.35,yS+30,sw*.6,30,[255,230,200],.08+.1*b);
  // грязь, шрамы, синяки на теле
  if(T.dirt>.05){for(let i=0;i<8;i++){const rr=rng(i*13+7);blob(g,CX+(rr()*2-1)*cw,yS+40+rr()*220,18+rr()*28,12+rr()*20,[50,34,20],.22*T.dirt)}}
  if(T.bruise>.1){blob(g,CX-cw*.5,yA+30,26,18,[96,48,120],.5*T.bruise*2);blob(g,CX+cw*.4,yA+60,20,14,[110,70,50],.4*T.bruise*2)}
  if(T.prop==='tattoo'){
    g.strokeStyle='rgba(25,55,80,.78)';g.lineWidth=3.2;g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(CX-cw+6,yA-20);g.quadraticCurveTo(CX-cw-4,yA+20,CX-cw+14,yA+54);g.quadraticCurveTo(CX-cw+24,yA+20,CX-cw+10,yA-6);g.stroke();
    g.beginPath();g.moveTo(CX-cw+10,yA+10);g.lineTo(CX-cw+34,yA+24);g.moveTo(CX-cw+12,yA+30);g.lineTo(CX-cw+36,yA+44);g.stroke();
    g.beginPath();g.moveTo(CX+cw-30,yS+34);g.quadraticCurveTo(CX+cw-4,yS+54,CX+cw-18,yS+86);g.stroke();
  }
  g.restore();
}
function ww(D){return D.ww}

/* ---------- верхняя одежда ---------- */
function tankTop(g,T,D){
  const{sw,cw,yS,yA,yW}=D,p=new Path2D();
  p.moveTo(CX-30,D.yN-4);p.quadraticCurveTo(CX-34,yS+44,CX-cw+14,yS+54);p.lineTo(CX-cw-2,yA);p.bezierCurveTo(CX-cw+2,yA+50,CX-D.ww-6,yW-60,CX-D.ww-2,yW+12);
  p.lineTo(CX+D.ww+2,yW+12);p.bezierCurveTo(CX+D.ww+6,yW-60,CX+cw-2,yA+50,CX+cw+2,yA);p.lineTo(CX+cw-14,yS+54);p.quadraticCurveTo(CX+34,yS+44,CX+30,D.yN-4);
  p.quadraticCurveTo(CX+36,yS-4,CX+sw-26,yS+2);p.lineTo(CX+sw-4,yS+12);p.bezierCurveTo(CX+sw-6,yS+44,CX+cw+2,yA-30,CX+cw+2,yA);
  p.lineTo(CX-cw-2,yA);p.bezierCurveTo(CX-cw-2,yA-30,CX-sw+6,yS+44,CX-sw+4,yS+12);p.lineTo(CX-sw+26,yS+2);p.quadraticCurveTo(CX-36,yS-4,CX-30,D.yN-4);p.closePath();
  paint(g,p,T.shirtCol||'#6b7075',CX-cw,CX+cw,.95);
  g.save();g.clip(p);
  blob(g,CX,yS+90,cw*.9,50,[20,24,30],.3);blob(g,CX-cw*.5,yA+6,26,40,[40,50,60],.4);blob(g,CX,yW-10,D.ww,30,[20,24,30],.25);
  g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=2.4;for(let i=0;i<4;i++){g.beginPath();g.moveTo(CX-cw+10,yA+20+i*22);g.quadraticCurveTo(CX,yA+30+i*22,CX+cw-10,yA+20+i*22);g.stroke()}
  g.fillStyle='rgba(235,235,225,.9)';g.font="bold 34px 'Russo One',Impact,sans-serif";g.textAlign='center';g.globalAlpha=.55;g.fillText(T.clubText||'БОКС',CX,yA+58);g.globalAlpha=1;
  g.restore();
}
function trackJacket(g,T,D){
  const{sw,cw,yS,yA,yW}=D,p=new Path2D();
  p.moveTo(CX-32,D.yN-6);p.bezierCurveTo(CX-60,D.yN+2,CX-sw+12,yS-10,CX-sw-2,yS+8);p.bezierCurveTo(CX-sw-6,yS+44,CX-cw-6,yA-30,CX-cw-4,yA);
  p.bezierCurveTo(CX-cw,yA+50,CX-D.ww-8,yW-60,CX-D.ww-6,yW+20);p.lineTo(CX+D.ww+6,yW+20);p.bezierCurveTo(CX+D.ww+8,yW-60,CX+cw,yA+50,CX+cw+4,yA);
  p.bezierCurveTo(CX+cw+6,yA-30,CX+sw+6,yS+44,CX+sw+2,yS+8);p.bezierCurveTo(CX+sw-12,yS-10,CX+60,D.yN+2,CX+32,D.yN-6);p.closePath();
  paint(g,p,'#1f3a6b',CX-cw,CX+cw,.95);
  g.save();g.clip(p);
  g.strokeStyle='#ececec';g.lineWidth=6;for(const s of[-1,1]){g.beginPath();g.moveTo(CX+s*(cw+2),yS+20);g.lineTo(CX+s*(D.ww+4),yW+18);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(CX+s*(cw-8),yS+20);g.lineTo(CX+s*(D.ww-4),yW+18);g.stroke();g.lineWidth=6}
  g.strokeStyle='#0c1a33';g.lineWidth=3;g.beginPath();g.moveTo(CX,D.yN+8);g.lineTo(CX,yW+20);g.stroke(); // молния
  g.strokeStyle='#bbb';g.lineWidth=1.5;g.setLineDash([2,3]);g.beginPath();g.moveTo(CX+2,D.yN+8);g.lineTo(CX+2,yW+20);g.stroke();g.setLineDash([]);
  blob(g,CX,yS+90,cw,50,[0,0,0],.25);blob(g,CX-cw*.4,yS+30,cw*.5,22,[160,190,255],.14);blob(g,CX,yW,D.ww,22,[0,0,0],.3);
  g.restore();
  // воротник
  g.fillStyle='#15294f';g.beginPath();g.moveTo(CX-34,D.yN-8);g.quadraticCurveTo(CX,D.yN+30,CX+34,D.yN-8);g.lineTo(CX+28,D.yN-14);g.quadraticCurveTo(CX,D.yN+12,CX-28,D.yN-14);g.closePath();g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2;g.stroke();
  g.fillStyle='#ececec';g.fillRect(CX-33,D.yN-9,66,3);
}
function coat(g,T,D){
  const{sw,cw,yS,yA,yW}=D,hem=715;
  const p=new Path2D();
  p.moveTo(CX-34,D.yN-8);p.bezierCurveTo(CX-62,D.yN+2,CX-sw+8,yS-10,CX-sw-6,yS+10);p.bezierCurveTo(CX-sw-12,yS+50,CX-cw-14,yA,CX-cw-20,yW);
  p.lineTo(CX-D.hw-26,hem);
  const r=rng(9);for(let i=0;i<9;i++){p.lineTo(CX-D.hw-26+(i+.5)*((D.hw+26)*2/9),hem+(i%2?-6:12)+r()*10)}
  p.lineTo(CX+D.hw+26,hem);p.lineTo(CX+cw+20,yW);p.bezierCurveTo(CX+cw+14,yA,CX+sw+12,yS+50,CX+sw+6,yS+10);p.bezierCurveTo(CX+sw-8,yS-10,CX+62,D.yN+2,CX+34,D.yN-8);
  p.quadraticCurveTo(CX+12,yS+44,CX+14,hem+6);p.lineTo(CX-14,hem+6);p.quadraticCurveTo(CX-12,yS+44,CX-34,D.yN-8);p.closePath();
  // внутренняя майка
  const sh=new Path2D();sh.moveTo(CX-30,D.yN-4);sh.quadraticCurveTo(CX,yS+60,CX+30,D.yN-4);sh.lineTo(CX+16,hem-60);sh.lineTo(CX-16,hem-60);sh.closePath();
  g.fillStyle='#8c8776';g.fill(sh);g.save();g.clip(sh);blob(g,CX,yA,30,80,[40,30,18],.4);blob(g,CX,yW,24,50,[60,40,20],.35);g.restore();g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=2;g.stroke(sh);
  paint(g,p,'#52402f',CX-cw-20,CX+cw+20,1);
  g.save();g.clip(p);
  const rr=rng(4);for(let i=0;i<14;i++){blob(g,CX+(rr()*2-1)*(cw+10),yS+rr()*430,10+rr()*26,10+rr()*30,[28,20,12],.3)}
  g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=3;for(const s of[-1,1])for(let i=0;i<3;i++){g.beginPath();g.moveTo(CX+s*(cw+12-i*20),yA+10);g.quadraticCurveTo(CX+s*(cw+22-i*14),yW+80,CX+s*(D.hw+16-i*14),hem-6);g.stroke()}
  g.fillStyle='#6a5640';g.fillRect(CX-D.hw-6,hem-170,40,46);g.strokeStyle='rgba(0,0,0,.6)';g.setLineDash([4,3]);g.strokeRect(CX-D.hw-6,hem-170,40,46);g.setLineDash([]);
  g.fillStyle='#2a1f16';[0,1,2].forEach(i=>{g.beginPath();g.arc(CX+(i%2?10:-10),yA+60+i*70,5,0,7);g.fill()});
  g.restore();
  g.strokeStyle='rgba(255,230,190,.12)';g.lineWidth=3;g.beginPath();g.moveTo(CX-sw+8,yS+4);g.quadraticCurveTo(CX-sw-4,yA,CX-cw-10,yW);g.stroke();
}
function robe(g,T,D){ // халат с золотой каймой, накинут на плечи
  const{sw,cw,yS,yW}=D;
  for(const s of[-1,1]){
    const p=new Path2D();p.moveTo(CX+s*30,D.yN-8);p.bezierCurveTo(CX+s*66,D.yN,CX+s*(sw+16),yS-10,CX+s*(sw+22),yS+34);p.bezierCurveTo(CX+s*(sw+30),yS+160,CX+s*(cw+22),yW+120,CX+s*(cw+28),640);
    p.lineTo(CX+s*(cw-14),650);p.bezierCurveTo(CX+s*(cw-16),yW+110,CX+s*(cw-22),yS+150,CX+s*(cw-18),yS+60);p.quadraticCurveTo(CX+s*30,yS+20,CX+s*30,D.yN-8);p.closePath();
    paint(g,p,'#15131a',CX+(s<0?-sw-30:cw-20),CX+(s<0?-cw+20:sw+30),1);
    g.save();g.clip(p);g.strokeStyle='#e0a030';g.lineWidth=7;g.beginPath();g.moveTo(CX+s*30,D.yN-8);g.quadraticCurveTo(CX+s*(cw-12),yS+30,CX+s*(cw-16),650);g.stroke();
    g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=3;for(let i=0;i<3;i++){g.beginPath();g.moveTo(CX+s*(cw+10+i*6),yS+60);g.quadraticCurveTo(CX+s*(cw+14),yW,CX+s*(cw+14+i*5),630);g.stroke()}
    blob(g,CX+s*(sw-6),yS+30,30,40,[255,255,255],.12);g.restore();
  }
}
