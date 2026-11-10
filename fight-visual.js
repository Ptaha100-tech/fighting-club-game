/* fight-visual.js: сцена драки (двор / ринг) для мини-аппа.
   <div id="fight-stage"></div> + <script src="fight-visual.js"></script>
   API: FightVisual.hit('left'|'right', 0..1), setDamage(side, 0..1), setBackground('yard'|'ring'), newFaces(), reset()
   Необязательные id для HUD: nL mL bL nR mR bR (имя, текст, полоса), ko (экран нокаута). */
(()=>{
'use strict';
const W=720,H=900,BASEY=410,DIST=290;
if(!document.getElementById('fv-font')){const l=document.createElement('link');l.id='fv-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Russo+One&display=swap';document.head&&document.head.appendChild(l)}
let cv=document.getElementById('fight-canvas');
if(!cv){cv=document.createElement('canvas');cv.id='fight-canvas';cv.style.cssText='display:block;width:100%;height:auto;max-width:100%;touch-action:manipulation';(document.getElementById('fight-stage')||document.body).appendChild(cv)}
const ctx=cv.getContext('2d');
let Q=(navigator.deviceMemory&&navigator.deviceMemory<=2)?.5:((navigator.hardwareConcurrency||4)<=4?.6:.75);
function resizeCv(){cv.width=Math.round(W*Q);cv.height=Math.round(H*Q)}
resizeCv();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function hex(c){return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
function shade(c,a){const[r,g,b]=hex(c);return`rgb(${clamp(r+a,0,255)|0},${clamp(g+a,0,255)|0},${clamp(b+a,0,255)|0})`}
function rgba(c,a){const[r,g,b]=hex(c);return`rgba(${r},${g},${b},${a})`}
// soft elliptical blob of colour, fading to nothing
function blob(g,x,y,rx,ry,rgb,a){
  if(a<=0.003)return;
  g.save();g.translate(x,y);g.scale(rx,ry);
  const q=g.createRadialGradient(0,0,0,0,0,1);
  q.addColorStop(0,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  q.addColorStop(.55,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a*.55})`);
  q.addColorStop(1,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  g.fillStyle=q;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.restore();
}
function buildBg(fn){const c=mk(W,H);const g=c.getContext('2d');fn(g);return c}

/* ---------- YARD ---------- */
function yard(g){
  const r=rng(7);
  let s=g.createLinearGradient(0,0,0,420);
  s.addColorStop(0,'#14131b');s.addColorStop(.55,'#3a2a30');s.addColorStop(1,'#6a4026');
  g.fillStyle=s;g.fillRect(0,0,W,H);
  // far buildings with lit windows
  for(let x=-20;x<W;){
    const bw=50+r()*80,bh=120+r()*170;
    g.fillStyle=`rgb(${18+r()*8|0},${16+r()*8|0},${22+r()*8|0})`;g.fillRect(x,330-bh,bw,bh+120);
    for(let wy=330-bh+14;wy<380;wy+=22)for(let wx=x+8;wx<x+bw-10;wx+=18){
      if(r()<.26){g.fillStyle=r()<.65?'rgba(240,180,80,.75)':'rgba(120,170,200,.5)';g.fillRect(wx,wy,8,11)}
    }
    x+=bw+4;
  }
  // brick wall
  const wy0=290,wy1=650;
  g.save();g.beginPath();g.rect(0,wy0,W,wy1-wy0);g.clip();
  g.fillStyle='#2a1a17';g.fillRect(0,wy0,W,wy1-wy0);
  const bh=20,bw=54;
  for(let row=0,y=wy0;y<wy1;row++,y+=bh){
    for(let x=-(row%2)*bw/2;x<W;x+=bw){
      const t=r();
      g.fillStyle=`rgb(${88+t*40|0},${44+t*20|0},${36+t*16|0})`;g.fillRect(x+1.5,y+1.5,bw-3,bh-3);
      g.fillStyle='rgba(255,200,150,.07)';g.fillRect(x+1.5,y+1.5,bw-3,2);
      g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x+1.5,y+bh-4,bw-3,2.5);
      if(r()<.05){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x+1.5,y+1.5,bw-3,bh-3)}
    }
  }
  // plaster patches
  for(let i=0;i<4;i++){
    const px=r()*W,py=wy0+30+r()*230,pw=70+r()*120,ph=50+r()*80;
    g.fillStyle=`rgba(${120+r()*30|0},${112+r()*20|0},${100+r()*20|0},.72)`;
    g.beginPath();
    for(let k=0;k<=10;k++){const a=k/10*Math.PI*2;const X=px+pw/2+Math.cos(a)*pw/2*(.75+r()*.35),Y=py+ph/2+Math.sin(a)*ph/2*(.75+r()*.35);k?g.lineTo(X,Y):g.moveTo(X,Y)}
    g.fill();
  }
  // graffiti
  g.textAlign='center';g.textBaseline='middle';
  const tag=(txt,x,y,sz,rot,fill,stroke)=>{
    g.save();g.translate(x,y);g.rotate(rot);
    g.font=`${sz}px 'Russo One',Impact,sans-serif`;g.lineJoin='round';
    g.lineWidth=sz*.16;g.strokeStyle=stroke;g.strokeText(txt,3,4);
    g.fillStyle=fill;g.fillText(txt,0,0);
    g.globalAlpha=.4;g.lineWidth=1.6;g.strokeStyle='#fff';g.strokeText(txt,-1,-1);g.globalAlpha=1;
    const w=g.measureText(txt).width;
    for(let i=0;i<5;i++){
      const dx=-w/2+r()*w,len=14+r()*40;
      g.strokeStyle=fill;g.lineWidth=2.5;g.beginPath();g.moveTo(dx,sz*.36);g.lineTo(dx,sz*.36+len);g.stroke();
      g.fillStyle=fill;g.beginPath();g.arc(dx,sz*.36+len+1,2.5,0,7);g.fill();
    }
    g.restore();
  };
  tag('РАЙОН',150,430,64,-.08,'#e0457b','#1a0f20');
  tag('БЕЗ ПРАВИЛ',565,372,40,.06,'#47d1c4','#0e1f24');
  // wall grime
  let gr=g.createLinearGradient(0,wy0,0,wy1);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.35,'rgba(0,0,0,0)');gr.addColorStop(.8,'rgba(0,0,0,.1)');gr.addColorStop(1,'rgba(0,0,0,.6)');
  g.fillStyle=gr;g.fillRect(0,wy0,W,wy1-wy0);
  for(let i=0;i<14;i++){const sx=r()*W;gr=g.createLinearGradient(0,wy0,0,wy0+120+r()*200);gr.addColorStop(0,'rgba(10,6,4,.35)');gr.addColorStop(1,'rgba(10,6,4,0)');g.fillStyle=gr;g.fillRect(sx,wy0,6+r()*14,320)}
  g.restore();
  // chain-link fence
  g.save();g.beginPath();g.rect(0,205,W,435);g.clip();
  g.strokeStyle='rgba(190,200,210,.15)';g.lineWidth=1.2;
  for(let x=-440;x<W+440;x+=22){g.beginPath();g.moveTo(x,205);g.lineTo(x+330,640);g.stroke();g.beginPath();g.moveTo(x+330,205);g.lineTo(x,640);g.stroke()}
  g.fillStyle='rgba(120,128,136,.5)';g.fillRect(0,205,W,6);
  g.restore();
  // dumpster (left)
  const dx=-26,dy=480,dw=210,dh=170;
  gr=g.createLinearGradient(dx,0,dx+dw,0);gr.addColorStop(0,'#1d3328');gr.addColorStop(.6,'#2f4a3a');gr.addColorStop(1,'#223b2e');
  g.fillStyle=gr;g.fillRect(dx,dy,dw,dh);
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=3;
  for(let x=dx+24;x<dx+dw;x+=30){g.beginPath();g.moveTo(x,dy+14);g.lineTo(x,dy+dh-10);g.stroke()}
  g.fillStyle='#141f19';g.beginPath();g.moveTo(dx-6,dy);g.lineTo(dx+dw+6,dy);g.lineTo(dx+dw-6,dy-26);g.lineTo(dx+10,dy-34);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.07)';g.fillRect(dx-6,dy,dw+12,4);
  for(let i=0;i<7;i++){const rx=dx+10+r()*dw;gr=g.createLinearGradient(0,dy,0,dy+dh);gr.addColorStop(0,'rgba(160,80,30,.55)');gr.addColorStop(1,'rgba(160,80,30,0)');g.fillStyle=gr;g.fillRect(rx,dy+2,4+r()*7,60+r()*100)}
  g.fillStyle='rgba(235,235,225,.55)';g.font="bold 22px 'Roboto Condensed',Arial";g.fillText('МУСОР',dx+100,dy+84);
  g.fillStyle='#0a0a0a';[dx+30,dx+dw-40].forEach(x=>{g.beginPath();g.arc(x,dy+dh+8,12,0,7);g.fill()});
  // trash bags and crate (right)
  for(let i=0;i<5;i++){
    const bx=575+r()*130,by=585+r()*50,br=34+r()*22;
    g.fillStyle=`rgb(${14+r()*10|0},${14+r()*10|0},${16+r()*10|0})`;g.beginPath();g.ellipse(bx,by,br,br*.82,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.ellipse(bx-br*.3,by-br*.3,br*.34,br*.18,-.6,0,7);g.fill();
    g.fillStyle='#0b0b0c';g.beginPath();g.moveTo(bx-6,by-br*.8);g.lineTo(bx,by-br*1.2);g.lineTo(bx+7,by-br*.78);g.fill();
  }
  g.fillStyle='#6b5030';g.fillRect(560,470,110,92);g.strokeStyle='#3a2a18';g.lineWidth=3;g.strokeRect(560,470,110,92);
  for(let y=486;y<562;y+=22){g.beginPath();g.moveTo(560,y);g.lineTo(670,y);g.stroke()}
  // asphalt ground
  gr=g.createLinearGradient(0,640,0,H);gr.addColorStop(0,'#2e2c2e');gr.addColorStop(1,'#121113');
  g.fillStyle=gr;g.fillRect(0,640,W,H-640);
  g.fillStyle='#4a4743';g.fillRect(0,640,W,7);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,647,W,10);
  for(let i=0;i<1400;i++){const a=r();g.fillStyle=a<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.25)';g.fillRect(r()*W,650+r()*(H-650),1+r()*2,1+r()*2)}
  g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=1.6;
  for(let i=0;i<4;i++){let x=r()*W,y=670+r()*200;g.beginPath();g.moveTo(x,y);for(let k=0;k<7;k++){x+=(r()-.3)*38;y+=(r()-.5)*20;g.lineTo(x,y)}g.stroke()}
  // puddle reflecting the lamp
  g.save();g.translate(360,800);g.scale(1,.17);
  gr=g.createRadialGradient(0,0,0,0,0,230);gr.addColorStop(0,'rgba(255,170,80,.5)');gr.addColorStop(.5,'rgba(120,90,70,.35)');gr.addColorStop(1,'rgba(20,20,26,.1)');
  g.fillStyle=gr;g.beginPath();g.arc(0,0,230,0,7);g.fill();g.restore();
  // litter
  for(let i=0;i<9;i++){const lx=60+r()*600,ly=700+r()*170;g.save();g.translate(lx,ly);g.rotate(r()*6);
    if(i%3===0){g.fillStyle='#8a2a2a';g.fillRect(-6,-3,12,6);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(-6,-3,12,1.5)}
    else if(i%3===1){g.fillStyle='rgba(220,215,200,.7)';g.beginPath();g.moveTo(-8,-4);g.lineTo(9,-2);g.lineTo(5,6);g.lineTo(-6,3);g.fill()}
    else{g.fillStyle='#2a2a1a';g.fillRect(-7,-1.2,14,2.4);g.fillStyle='#c27a2a';g.fillRect(4,-1.2,3,2.4)}
    g.restore()}
}

/* ---------- RING ---------- */
function ring(g){
  const r=rng(11);
  let s=g.createLinearGradient(0,0,0,H);
  s.addColorStop(0,'#06050a');s.addColorStop(.45,'#161019');s.addColorStop(1,'#1d1014');
  g.fillStyle=s;g.fillRect(0,0,W,H);
  // crowd
  for(let row=0;row<5;row++){
    const y=170+row*46,sc=.7+row*.14,dk=8+row*5;
    for(let x=-10;x<W+30;x+=24*sc+r()*8){
      const hr=9*sc+r()*2,hy=y+r()*6;
      g.fillStyle=`rgb(${dk+4|0},${dk|0},${dk+8|0})`;
      g.beginPath();g.ellipse(x,hy+hr*2.6,hr*1.9,hr*2.2,0,Math.PI,0);g.fill();
      g.beginPath();g.arc(x,hy,hr,0,7);g.fill();
      g.fillStyle='rgba(240,150,70,.14)';g.beginPath();g.arc(x+hr*.35,hy-hr*.2,hr*.7,-1.2,.6);g.lineTo(x+hr*.35,hy-hr*.2);g.fill();
      if(r()<.1){g.strokeStyle=`rgb(${dk+4|0},${dk|0},${dk+8|0})`;g.lineWidth=5*sc;g.lineCap='round';g.beginPath();g.moveTo(x+hr,hy+hr*2);g.lineTo(x+hr*1.8,hy-hr*1.5);g.stroke()}
      if(r()<.05){g.fillStyle='rgba(170,200,255,.8)';g.fillRect(x+hr*1.5,hy-hr*2.2,5,7)}
    }
  }
  // haze between crowd and ring
  let gr=g.createLinearGradient(0,150,0,470);gr.addColorStop(0,'rgba(120,90,80,0)');gr.addColorStop(.6,'rgba(120,90,80,.14)');gr.addColorStop(1,'rgba(20,14,18,.7)');
  g.fillStyle=gr;g.fillRect(0,150,W,330);
  // corner posts and ropes
  const post=(x)=>{
    const q=g.createLinearGradient(x-12,0,x+12,0);q.addColorStop(0,'#1a1a1d');q.addColorStop(.5,'#6a6a72');q.addColorStop(1,'#1a1a1d');
    g.fillStyle=q;g.fillRect(x-12,300,24,400);
    ['#8d1a1f','#8d1a1f','#8d1a1f'].forEach((c,i)=>{const y=432+i*68;g.fillStyle=c;g.fillRect(x-17,y-26,34,52);g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x-17,y-26,8,52)});
  };
  [['#a31f24',440],['#e4ddd0',512],['#a31f24',584]].forEach(([c,y])=>{
    g.lineCap='round';
    g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=12;g.beginPath();g.moveTo(40,y+8);g.quadraticCurveTo(360,y+30,680,y+8);g.stroke();
    g.strokeStyle=c;g.lineWidth=10;g.beginPath();g.moveTo(40,y);g.quadraticCurveTo(360,y+22,680,y);g.stroke();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=2.5;g.beginPath();g.moveTo(40,y-3);g.quadraticCurveTo(360,y+19,680,y-3);g.stroke();
  });
  post(40);post(680);
  // apron + canvas mat
  gr=g.createLinearGradient(0,650,0,H);gr.addColorStop(0,'#5a1719');gr.addColorStop(1,'#220809');
  g.fillStyle=gr;g.fillRect(0,650,W,H-650);
  g.fillStyle='#17101a';g.fillRect(0,640,W,14);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,640,W,2);
  g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;
  for(let y=664;y<H;y+=9){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}
  g.save();g.textAlign='center';g.textBaseline='middle';g.font="130px 'Russo One',Impact,sans-serif";g.fillStyle='rgba(255,235,210,.075)';g.translate(360,790);g.transform(1,0,-.25,1,0,0);g.fillText('НА ВЫЛЕТ',0,0);g.restore();
  for(let i=0;i<10;i++)blob(g,r()*W,680+r()*200,10+r()*26,5+r()*10,[24,4,4],.35);
  for(let i=0;i<26;i++){g.fillStyle='rgba(150,22,20,.6)';g.beginPath();g.arc(r()*W,670+r()*210,1+r()*2.2,0,7);g.fill()}
}

let bgYard=null,bgRing=null;
function buildAll(){bgYard=buildBg(yard);bgRing=buildBg(ring)}
buildAll();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{try{buildAll()}catch(e){}});

let glowSp=null,beamSp=null;
function glow(){if(glowSp)return glowSp;const c=mk(180,225),g=c.getContext('2d');g.scale(.25,.25);
  const q=g.createRadialGradient(360,112,0,360,112,520);q.addColorStop(0,'rgba(255,170,70,.5)');q.addColorStop(.25,'rgba(240,130,50,.17)');q.addColorStop(1,'rgba(240,120,40,0)');
  g.fillStyle=q;g.fillRect(0,0,W,H);return glowSp=c}
function beam(){if(beamSp)return beamSp;const c=mk(180,430),g=c.getContext('2d');g.scale(.5,.5);
  const q=g.createLinearGradient(0,0,0,860);q.addColorStop(0,'rgba(255,240,215,.22)');q.addColorStop(1,'rgba(255,240,215,0)');
  g.fillStyle=q;g.beginPath();g.moveTo(168,0);g.lineTo(192,0);g.lineTo(350,860);g.lineTo(10,860);g.closePath();g.fill();return beamSp=c}
function overlayYard(g,t){
  const fl=.84+.09*Math.sin(t*31)+.07*Math.sin(t*7.3)+(Math.sin(t*2.1)>.985?-.28:0);
  g.strokeStyle='#0c0a09';g.lineWidth=2;g.beginPath();g.moveTo(360,0);g.lineTo(360,92);g.stroke();
  g.fillStyle='#2a2420';g.fillRect(354,90,12,16);
  g.globalCompositeOperation='lighter';
  g.globalAlpha=fl;g.drawImage(glow(),0,0,W,H);g.globalAlpha=1;
  g.globalCompositeOperation='source-over';
  g.fillStyle=`rgba(255,238,196,${.7+.3*fl})`;g.beginPath();g.arc(360,114,9,0,7);g.fill();
}
const flashes=[];
function overlayRing(g,t,dt){
  g.globalCompositeOperation='lighter';
  [150,360,570].forEach((x,i)=>{
    const sw=Math.sin(t*.55+i*2)*34;
    g.save();g.transform(1,0,sw/860,1,x-180,0);g.drawImage(beam(),0,0,360,860);g.restore();
  });
  if(Math.random()<dt*3)flashes.push({x:30+Math.random()*660,y:170+Math.random()*180,l:1});
  for(let i=flashes.length-1;i>=0;i--){
    const f=flashes[i];f.l-=dt*5;if(f.l<=0){flashes.splice(i,1);continue}
    const q=g.createRadialGradient(f.x,f.y,0,f.x,f.y,34*f.l+6);q.addColorStop(0,`rgba(255,255,255,${f.l})`);q.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=q;g.beginPath();g.arc(f.x,f.y,40,0,7);g.fill();
  }
  g.globalCompositeOperation='source-over';
}

/* ---------- FIGHTER FACES ---------- */
const SKINS=['#e2b48f','#cf9468','#b1714a','#8c5535','#f0cba8','#744530','#dcaa83'];
const IRIS=['#5a3a1c','#3a5a7a','#4f6b3a','#6b5a3a','#2e2a28'];
const NAMES=['Сивый','Колян','Гвоздь','Хромой','Бугор','Лысый','Тихий','Шрам','Мотя','Кабан','Штопор','Дядя Гриша'];
function makeFighter(seed){
  const r=rng(seed),pick=a=>a[Math.floor(r()*a.length)];
  const f={
    name:pick(NAMES),skin:pick(SKINS),hw:68+r()*24,hh:88+r()*18,jaw:.65+r()*.55,ear:.8+r()*.6,cauli:r()<.35,
    eyeSp:.82+r()*.34,eyeSz:.85+r()*.45,iris:pick(IRIS),brow:.7+r()*.9,browTilt:r()*.25,
    noseW:.75+r()*.7,noseL:.75+r()*.6,bump:r()<.4,mouthW:.75+r()*.5,lip:.6+r()*.9,
    beard:pick([.25,.55,.85,1]),gray:r()<.5,
    hair:pick(['bald','buzz','messy','beanie','mohawk','receding','long','cap']),
    hairCol:pick(['#1c1512','#3a2a1f','#6b5a48','#8a8a86','#b9b6ae','#2a2118']),
    hat:pick(['#3b4a58','#6a2f2f','#2f4f3d','#5a5530','#26262a']),
    shirt:pick(['#4a4f3a','#5b3a30','#35404f','#6b6b64','#4d2f4a']),tank:r()<.45,
    gap:r()<.5,gold:r()<.2,tattoo:r()<.45,wr:.3+r()*.7,badEye:r()<.5?-1:1
  };
  f.stub=[];
  for(let i=0;i<1100;i++){
    const x=(r()*2-1)*f.hw,y=(r()*1.7-.45)*f.hh,yy=y/f.hh;
    let p=clamp((yy-.12)*1.5,0,1);
    if(Math.abs(x)>f.hw*.62&&yy>-.1)p=Math.max(p,.7);
    if(r()<p*f.beard)f.stub.push(x,y,f.gray&&r()<.3);
  }
  f.dirt=[];for(let i=0;i<12;i++)f.dirt.push([(r()*2-1)*f.hw*.9,(r()*2-1)*f.hh*.9,10+r()*26,.07+r()*.13]);
  f.drops=[];for(let i=0;i<16;i++)f.drops.push({x:(r()*2-1)*f.hw*.75,y:-f.hh*.7+r()*f.hh,len:30+r()*60,ph:r(),sp:.12+r()*.2,sz:1.6+r()*1.8});
  f.strands=[];for(let i=0;i<46;i++){const a=Math.PI+r()*Math.PI;f.strands.push([a,14+r()*40,(r()-.5)*30])}
  const e=f.badEye,o=-e;
  // x,y in units of hw,hh; rx,ry likewise; threshold of damage at which the bruise starts
  f.bruise=[[e*.38,-.08,.30,.20,.05],[o*.55,.30,.26,.20,.22],[e*.45,.62,.30,.20,.38],[0,-.64,.30,.16,.50],[o*.38,-.08,.28,.18,.62],[e*.72,.22,.20,.18,.78]];
  return f;
}
function headPath(g,f){
  const{hw,hh,jaw}=f;
  g.beginPath();g.moveTo(0,-hh);
  g.bezierCurveTo(hw*.62,-hh,hw,-hh*.62,hw,-hh*.18);
  g.bezierCurveTo(hw,hh*.2,hw*.82,hh*.5,hw*.5*jaw+hw*.1,hh*.82);
  g.bezierCurveTo(hw*.3*jaw,hh*.98,hw*.12,hh,0,hh);
  g.bezierCurveTo(-hw*.12,hh,-hw*.3*jaw,hh*.98,-(hw*.5*jaw+hw*.1),hh*.82);
  g.bezierCurveTo(-hw*.82,hh*.5,-hw,hh*.2,-hw,-hh*.18);
  g.bezierCurveTo(-hw,-hh*.62,-hw*.62,-hh,0,-hh);
  g.closePath();
}
function hairBack(g,f){
  if(f.hair!=='long')return;
  const{hw,hh}=f;
  g.fillStyle=f.hairCol;g.beginPath();g.moveTo(-hw*1.05,-hh*.4);
  g.bezierCurveTo(-hw*1.5,hh*.2,-hw*1.2,hh*1.5,-hw*.6,hh*1.7);g.lineTo(hw*.6,hh*1.7);
  g.bezierCurveTo(hw*1.2,hh*1.5,hw*1.5,hh*.2,hw*1.05,-hh*.4);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=2;
  for(let i=0;i<8;i++){g.beginPath();g.moveTo(-hw*1.1+i*hw*.3,hh*.1);g.quadraticCurveTo(-hw*1.15+i*hw*.3,hh,-hw*.9+i*hw*.26,hh*1.6);g.stroke()}
}
function strands(g,f,n){
  g.strokeStyle=f.hairCol;g.lineWidth=5;g.lineCap='round';
  for(let i=0;i<n;i++){
    const[a,l,c]=f.strands[i%f.strands.length];
    const x0=Math.cos(a)*f.hw*.92,y0=Math.sin(a)*f.hh*.95;
    g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(x0+Math.cos(a)*l*.6+c,y0+Math.sin(a)*l*.6,x0+Math.cos(a)*l+c*1.3,y0+Math.sin(a)*l+8);g.stroke();
  }
}
function hairFront(g,f,st){
  const{hw,hh}=f,hc=f.hairCol;
  const capFill=(a)=>{
    g.save();headPath(g,f);g.clip();
    g.fillStyle=rgba(hc,a);g.beginPath();g.moveTo(-hw*1.1,-hh*.18);g.quadraticCurveTo(0,-hh*.66,hw*1.1,-hh*.18);g.lineTo(hw*1.1,-hh*1.2);g.lineTo(-hw*1.1,-hh*1.2);g.fill();
    g.restore();
  };
  const shine=(a)=>blob(g,-hw*.12,-hh*.82,hw*.45,hh*.12,[255,245,230],a);
  switch(f.hair){
    case'bald':
      for(const sx of[-1,1]){g.fillStyle=rgba(hc,.85);g.beginPath();g.moveTo(sx*hw*.98,-hh*.3);g.quadraticCurveTo(sx*hw*1.04,-hh*.1,sx*hw*.98,hh*.08);g.lineTo(sx*hw*.88,hh*.02);g.quadraticCurveTo(sx*hw*.92,-hh*.14,sx*hw*.88,-hh*.26);g.fill()}
      shine(.3);
      g.strokeStyle='rgba(120,50,45,.5)';g.lineWidth=2;g.beginPath();g.moveTo(-hw*.3,-hh*.78);g.lineTo(-hw*.05,-hh*.86);g.stroke();
      break;
    case'buzz':
      capFill(.82);
      g.fillStyle=rgba(hc,.7);
      for(let i=0;i<150;i++){const a=i*2.399,rr=(.4+(i%7)/12)*f.hw;g.fillRect(Math.cos(a)*rr,-hh*.5-Math.abs(Math.sin(a))*hh*.38+(i%5)*2,1.5,1.5)}
      shine(.12);
      break;
    case'messy':
      capFill(1);strands(g,f,46);shine(.12);
      break;
    case'long':
      capFill(1);strands(g,f,30);
      g.fillStyle=hc;
      for(const sx of[-1,1]){g.beginPath();g.moveTo(sx*hw*.2,-hh*.9);g.quadraticCurveTo(sx*hw*1.1,-hh*.7,sx*hw*1.0,hh*.34);g.lineTo(sx*hw*.82,hh*.3);g.quadraticCurveTo(sx*hw*.86,-hh*.4,sx*hw*.1,-hh*.7);g.closePath();g.fill()}
      g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.beginPath();g.moveTo(0,-hh*.98);g.lineTo(0,-hh*.7);g.stroke();
      break;
    case'mohawk':
      g.save();headPath(g,f);g.clip();g.fillStyle=rgba(hc,.55);
      g.fillRect(-hw*1.1,-hh*1.2,hw*.8,hh);g.fillRect(hw*.3,-hh*1.2,hw*.8,hh);g.restore();
      g.fillStyle=f.hat;
      for(let i=0;i<9;i++){const x=-hw*.26+i*hw*.065,h=hh*(.36+.18*((i*5)%4)/3);g.beginPath();g.moveTo(x-hw*.05,-hh*.78);g.lineTo(x+hw*.005,-hh-h);g.lineTo(x+hw*.07,-hh*.78);g.closePath();g.fill()}
      g.fillStyle=f.hat;g.fillRect(-hw*.27,-hh*1.0,hw*.58,hh*.28);
      g.fillStyle='rgba(255,255,255,.16)';g.fillRect(-hw*.22,-hh*.98,hw*.12,hh*.2);
      break;
    case'receding':
      for(const sx of[-1,1]){g.fillStyle=hc;g.beginPath();g.moveTo(sx*hw*.99,-hh*.45);g.quadraticCurveTo(sx*hw*.6,-hh*.62,sx*hw*.42,-hh*.36);g.quadraticCurveTo(sx*hw*.7,-hh*.28,sx*hw*.88,hh*.04);g.lineTo(sx*hw*.99,hh*.02);g.closePath();g.fill()}
      g.strokeStyle=rgba(hc,.7);g.lineWidth=2;
      for(let i=0;i<5;i++){g.beginPath();g.moveTo(-hw*.45+i*hw*.1,-hh*.99);g.quadraticCurveTo(0,-hh*1.04-i*2,hw*.45-i*hw*.1,-hh*.7);g.stroke()}
      shine(.3);
      break;
    case'beanie':{
      g.fillStyle=f.hat;g.beginPath();g.moveTo(-hw*1.08,-hh*.28);g.bezierCurveTo(-hw*1.2,-hh*1.2,hw*1.2,-hh*1.2,hw*1.08,-hh*.28);g.quadraticCurveTo(0,-hh*.4,-hw*1.08,-hh*.28);g.fill();
      g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=2;
      for(let i=-9;i<=9;i++){g.beginPath();g.moveTo(i*hw*.09,-hh*1.1+Math.abs(i)*2);g.lineTo(i*hw*.12,-hh*.45);g.stroke()}
      g.fillStyle=shade(f.hat,12);g.beginPath();g.moveTo(-hw*1.1,-hh*.24);g.quadraticCurveTo(0,-hh*.38,hw*1.1,-hh*.24);g.lineTo(hw*1.07,-hh*.5);g.quadraticCurveTo(0,-hh*.64,-hw*1.07,-hh*.5);g.closePath();g.fill();
      g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=2;
      for(let i=-11;i<=11;i++){g.beginPath();g.moveTo(i*hw*.092,-hh*.58+Math.abs(i)*1.2);g.lineTo(i*hw*.1,-hh*.3+Math.abs(i)*.6);g.stroke()}
      blob(g,hw*.2,-hh*.52,hw*.2,hh*.06,[255,255,255],.1);
      // hole and sweat stain
      g.fillStyle='rgba(20,10,5,.7)';g.beginPath();g.ellipse(-hw*.55,-hh*.78,6,4,.4,0,7);g.fill();
      blob(g,0,-hh*.4,hw*.9,hh*.09,[0,0,0],.22*clamp(.3+st.exert,0,1));
      g.fillStyle=rgba(hc,.9);
      for(const sx of[-1,1]){g.beginPath();g.moveTo(sx*hw*.98,-hh*.22);g.quadraticCurveTo(sx*hw*1.08,-hh*.1,sx*hw*1.0,hh*.02);g.lineTo(sx*hw*.9,-hh*.04);g.closePath();g.fill()}
      break;}
    case'cap':{
      g.fillStyle=f.hat;g.beginPath();g.moveTo(-hw*1.06,-hh*.3);g.bezierCurveTo(-hw*1.1,-hh*1.1,hw*1.1,-hh*1.1,hw*1.06,-hh*.3);g.quadraticCurveTo(0,-hh*.38,-hw*1.06,-hh*.3);g.fill();
      g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;
      for(const k of[-.5,0,.5]){g.beginPath();g.moveTo(k*hw*.4,-hh*1.04);g.quadraticCurveTo(k*hw*1.4,-hh*.7,k*hw*1.5,-hh*.33);g.stroke()}
      blob(g,-hw*.2,-hh*.7,hw*.5,hh*.14,[255,255,255],.1);
      blob(g,0,-hh*.38,hw*1.0,hh*.08,[0,0,0],.3*clamp(.3+st.exert,0,1));
      g.fillStyle=shade(f.hat,-18);g.beginPath();g.moveTo(hw*.1,-hh*.44);g.lineTo(hw*1.62,-hh*.32);g.quadraticCurveTo(hw*1.5,-hh*.14,hw*.12,-hh*.26);g.closePath();g.fill();
      g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.moveTo(hw*.1,-hh*.26);g.lineTo(hw*1.5,-hh*.18);g.lineTo(hw*1.5,-hh*.14);g.lineTo(hw*.12,-hh*.22);g.fill();
      g.fillStyle=rgba(hc,.9);
      for(const sx of[-1,1]){g.beginPath();g.moveTo(sx*hw*.98,-hh*.24);g.quadraticCurveTo(sx*hw*1.08,-hh*.1,sx*hw*1.0,hh*.02);g.lineTo(sx*hw*.9,-hh*.04);g.closePath();g.fill()}
      break;}
  }
}

/* st: {dmg,t,grit,blink,mouth,look,ko,exert} */
function drawHead(g,f,st){
  const{hw,hh}=f,d=st.dmg,t=st.t;
  const sw=clamp(.4+d*.35+st.exert*.5,0,1);
  hairBack(g,f);
  // ears
  for(const sx of[-1,1]){
    g.save();g.translate(sx*hw*.97,hh*.02);const es=f.ear;
    g.fillStyle=shade(f.skin,-14);g.beginPath();g.ellipse(0,0,13*es,23*es,0,0,7);g.fill();
    g.strokeStyle='rgba(60,25,15,.5)';g.lineWidth=2;g.beginPath();g.arc(-sx,2,8*es,-1.2,1.8,sx<0);g.stroke();
    g.fillStyle='rgba(200,70,60,.25)';g.beginPath();g.ellipse(0,2,7*es,13*es,0,0,7);g.fill();
    if(f.cauli&&sx===f.badEye){g.fillStyle='rgba(140,60,60,.5)';for(let i=0;i<4;i++){g.beginPath();g.arc(-sx*3+(i%2)*3,-10+i*7,4.5,0,7);g.fill()}}
    g.restore();
  }
  headPath(g,f);g.fillStyle=f.skin;g.fill();
  g.save();headPath(g,f);g.clip();
  // volume lighting: lit from the side facing the lamp (+x)
  let gr=g.createLinearGradient(-hw,0,hw,0);
  gr.addColorStop(0,'rgba(20,8,4,.5)');gr.addColorStop(.35,'rgba(20,8,4,.12)');gr.addColorStop(.75,'rgba(255,225,190,.14)');gr.addColorStop(1,'rgba(255,225,190,.04)');
  g.fillStyle=gr;g.fillRect(-hw*1.2,-hh*1.2,hw*2.4,hh*2.4);
  gr=g.createLinearGradient(0,-hh,0,hh);
  gr.addColorStop(0,'rgba(255,220,180,.1)');gr.addColorStop(.6,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(20,8,4,.38)');
  g.fillStyle=gr;g.fillRect(-hw*1.2,-hh*1.2,hw*2.4,hh*2.4);
  // ruddy cheeks, nose, forehead and grime
  blob(g,hw*.45,hh*.22,hw*.4,hh*.22,[200,70,60],.2+d*.1);
  blob(g,-hw*.45,hh*.22,hw*.4,hh*.22,[200,70,60],.16+d*.1);
  blob(g,0,hh*.2,hw*.2,hh*.14,[205,70,60],.25);
  blob(g,0,-hh*.55,hw*.6,hh*.14,[190,90,70],.12);
  for(const q of f.dirt)blob(g,q[0],q[1],q[2],q[2]*.7,[50,36,24],q[3]);
  // eye sockets and brow ridge
  for(const sx of[-1,1]){
    blob(g,sx*hw*.38*f.eyeSp,-hh*.08,hw*.3,hh*.15,[70,34,28],.34+.2*f.wr);
    blob(g,sx*hw*.36*f.eyeSp,-hh*.26,hw*.34,hh*.07,[40,20,14],.22);
  }
  // wrinkles
  g.strokeStyle=`rgba(60,30,20,${.16*f.wr+.06})`;g.lineWidth=2;g.lineCap='round';
  for(let i=0;i<3;i++){g.beginPath();g.moveTo(-hw*.55,-hh*(.5-.085*i));g.quadraticCurveTo(0,-hh*(.55-.085*i)+(i%2?4:-4),hw*.55,-hh*(.5-.085*i));g.stroke()}
  for(const sx of[-1,1]){
    g.beginPath();g.moveTo(sx*hw*.2,hh*.25);g.quadraticCurveTo(sx*hw*.42,hh*.42,sx*hw*.36,hh*.62);g.stroke();
    for(let i=0;i<3;i++){g.beginPath();g.moveTo(sx*hw*(.62+i*.02),-hh*.1+i*5);g.lineTo(sx*hw*(.82),-hh*.14+i*9);g.stroke()}
  }
  // stubble
  g.fillStyle='rgba(16,11,8,.5)';g.beginPath();
  for(let i=0;i<f.stub.length;i+=3)if(!f.stub[i+2])g.rect(f.stub[i],f.stub[i+1],1.5,1.5);
  g.fill();
  if(f.gray){g.fillStyle='rgba(205,205,198,.55)';g.beginPath();for(let i=0;i<f.stub.length;i+=3)if(f.stub[i+2])g.rect(f.stub[i],f.stub[i+1],1.5,1.5);g.fill()}
  blob(g,0,hh*.72,hw*.9,hh*.28,[30,22,16],.2*f.beard);
  // ---- eyes ----
  for(const sx of[-1,1]){
    const ex=sx*hw*.38*f.eyeSp,ey=-hh*.1,ew=hw*.2*f.eyeSz,bad=sx===f.badEye;
    const swell=clamp((d-.08)/.45,0,1)*(bad?1:0)+clamp((d-.55)/.4,0,1)*(bad?0:.8);
    let open=(1-.88*swell)*(1-.55*st.grit)*(1-st.blink);
    if(st.ko)open=.05;
    const eh=ew*.5*open+.6;
    g.save();g.translate(ex,ey);
    g.strokeStyle='rgba(70,30,35,.38)';g.lineWidth=5;g.beginPath();g.moveTo(-ew*1.1,ew*.5);g.quadraticCurveTo(0,ew*.9+eh*.4,ew*1.1,ew*.5);g.stroke();
    g.beginPath();g.moveTo(-ew,0);g.quadraticCurveTo(0,-eh*1.7,ew,0);g.quadraticCurveTo(0,eh*1.2,-ew,0);g.closePath();
    g.fillStyle='#e6dccb';g.fill();
    g.save();g.clip();
    const lx=st.look*ew*.35;
    g.fillStyle=f.iris;g.beginPath();g.arc(lx,0,ew*.5,0,7);g.fill();
    g.fillStyle='#0a0706';g.beginPath();g.arc(lx,0,ew*.22,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(lx-ew*.14,-ew*.14,ew*.09,0,7);g.fill();
    g.strokeStyle=`rgba(190,40,40,${.2+d*.5})`;g.lineWidth=1;
    for(let i=0;i<5;i++){g.beginPath();g.moveTo(sx*ew*.95,(i-2)*1.4);g.lineTo(sx*ew*.4,(i-2)*3);g.stroke()}
    g.fillStyle='rgba(30,12,8,.35)';g.fillRect(-ew,-eh*2,ew*2,eh);
    g.restore();
    g.strokeStyle='#150b08';g.lineWidth=2.6;g.beginPath();g.moveTo(-ew*1.05,.5);g.quadraticCurveTo(0,-eh*1.75,ew*1.05,.5);g.stroke();
    g.lineWidth=1.4;g.strokeStyle='rgba(60,25,20,.6)';g.beginPath();g.moveTo(-ew,0);g.quadraticCurveTo(0,eh*1.25,ew,0);g.stroke();
    g.strokeStyle='rgba(50,20,15,.45)';g.lineWidth=2;g.beginPath();g.moveTo(-ew*1.1,-eh*.9);g.quadraticCurveTo(0,-eh*2.8-ew*.25,ew*1.15,-eh*.6);g.stroke();
    if(swell>0){
      const k=swell;
      blob(g,0,ew*.05,ew*(1.3+.5*k),ew*(1+.55*k),[110,45,120],.55+.3*k);
      blob(g,0,ew*.1,ew*(1+.3*k),ew*(.7+.35*k),[150,40,60],.45*k);
      blob(g,-ew*.2,-ew*.3,ew*.5,ew*.3,[255,200,200],.12*k);
      g.strokeStyle='#1a0a0e';g.lineWidth=2.2;g.beginPath();g.moveTo(-ew*.85,ew*.05);g.quadraticCurveTo(0,ew*.2*(1-k)+ew*.05,ew*.85,ew*.05);g.stroke();
    }
    g.restore();
  }
  // ---- brows ----
  for(const sx of[-1,1]){
    const ew=hw*.2*f.eyeSz,bx=sx*hw*.38*f.eyeSp,by=-hh*.1-ew*(1.5+.1*st.grit);
    const bw=hw*.22*f.brow,tilt=hw*(.04+f.browTilt*.12+.1*st.grit),th=3+f.brow*3;
    const ix=bx-sx*bw,iy=by+tilt,ox=bx+sx*bw,oy=by-tilt*.3;
    g.fillStyle=f.hairCol==='#b9b6ae'?'#8c8a84':f.hairCol;
    g.beginPath();g.moveTo(ix,iy);g.quadraticCurveTo(bx,by-th*1.4,ox,oy);g.lineTo(ox,oy+th);g.quadraticCurveTo(bx,by+th*.4,ix,iy+th*1.6);g.closePath();g.fill();
    if(sx===f.badEye&&d>.3){
      const k=clamp((d-.3)/.5,0,1);
      g.strokeStyle='rgba(120,10,10,.95)';g.lineWidth=2.6;g.beginPath();g.moveTo(bx-sx*2,by-6);g.lineTo(bx+sx*5,by+8);g.stroke();
      g.strokeStyle=`rgba(150,15,15,${.8*k+.2})`;g.lineWidth=3.5;g.beginPath();g.moveTo(bx+sx*5,by+8);g.quadraticCurveTo(bx+sx*bw*1.2,by+ew*1.6,bx+sx*bw*1.1,by+ew*(2.2+k*3));g.stroke();
      g.fillStyle='rgba(255,200,190,.35)';g.beginPath();g.arc(bx+sx*bw*1.1,by+ew*(2.2+k*3)-3,1.6,0,7);g.fill();
    }
  }
  // ---- nose ----
  {
    const ny=hh*.04,nl=hh*.3*f.noseL,nw=hw*.15*f.noseW;
    const kx=((f.bump?4:0)+clamp(d-.45,0,.55)*22)*f.badEye*-1;
    g.lineCap='round';
    g.strokeStyle='rgba(60,30,20,.34)';g.lineWidth=5;g.beginPath();g.moveTo(-nw*.5,ny-hh*.02);g.quadraticCurveTo(-nw*.8+kx*.3,ny+nl*.5,-nw*1.1+kx,ny+nl*.85);g.stroke();
    g.strokeStyle='rgba(60,30,20,.16)';g.lineWidth=3;g.beginPath();g.moveTo(nw*.5,ny-hh*.02);g.quadraticCurveTo(nw*.8+kx*.3,ny+nl*.5,nw*1.1+kx,ny+nl*.85);g.stroke();
    blob(g,-nw*.15+kx*.3,ny+nl*.4,nw*.35,nl*.35,[255,225,195],.12);
    if(f.bump){g.fillStyle='rgba(255,235,210,.18)';g.beginPath();g.ellipse(kx*.2,ny+nl*.38,nw*.35,nw*.5,0,0,7);g.fill()}
    g.fillStyle=shade(f.skin,-8);g.beginPath();g.ellipse(kx,ny+nl*.9,nw*1.15,nw*.9,0,0,7);g.fill();
    blob(g,kx-nw*.25,ny+nl*.8,nw*.5,nw*.35,[255,235,215],.35);
    blob(g,kx,ny+nl*.92,nw*1.2,nw*.9,[200,60,50],.22+d*.35);
    g.fillStyle='rgba(20,6,4,.85)';
    for(const sx of[-1,1]){g.beginPath();g.ellipse(kx+sx*nw*.55,ny+nl*1.02,nw*.34,nw*.2,sx*.3,0,7);g.fill()}
    g.strokeStyle='rgba(70,30,22,.5)';g.lineWidth=2;
    for(const sx of[-1,1]){g.beginPath();g.moveTo(kx+sx*nw*1.2,ny+nl*.78);g.quadraticCurveTo(kx+sx*nw*1.35,ny+nl*1.02,kx+sx*nw*.8,ny+nl*1.08);g.stroke()}
    if(d>.45){
      const k=clamp((d-.45)/.55,0,1),my=hh*.55;
      g.strokeStyle='rgba(135,10,10,.92)';g.lineWidth=4+k*2;
      for(const sx of[-1,1]){if(sx===1&&k<.45)continue;
        g.beginPath();g.moveTo(kx+sx*nw*.55,ny+nl*1.08);g.quadraticCurveTo(kx+sx*nw*.7,ny+nl*1.4,sx*nw*.3,lerp(ny+nl*1.5,my-8,k)+Math.sin(t*4+sx)*1.5);g.stroke()}
      g.fillStyle='rgba(70,6,6,.85)';g.beginPath();g.ellipse(kx,ny+nl*1.05,nw*.6,nw*.18,0,0,7);g.fill();
    }
  }
  // ---- mouth ----
  {
    const my=hh*.55,mw=hw*.33*f.mouthW,open=st.mouth;
    const ul=f.lip*3.5,ll=f.lip*6+(d>.4?(d-.4)*8:0);
    blob(g,0,my-hh*.1,mw*1.3,hh*.07,[40,28,20],.2*f.beard);
    const o=open*mw*.7;
    g.beginPath();g.moveTo(-mw,my);
    g.quadraticCurveTo(-mw*.5,my-ul*.6-open*2,0,my-ul*.4-open*2);g.quadraticCurveTo(mw*.5,my-ul*.6-open*2,mw,my);
    g.quadraticCurveTo(mw*.5,my+ll*.4+o*1.2,0,my+ll*.4+o*1.3);g.quadraticCurveTo(-mw*.5,my+ll*.4+o*1.2,-mw,my);g.closePath();
    g.fillStyle='#2a0b0b';g.fill();
    if(open>.04){
      g.save();g.clip();
      g.fillStyle='#cdbf94';
      const tn=7,tw=mw*2/tn;
      for(let i=0;i<tn;i++){
        const x=-mw+i*tw+1;
        if(f.gap&&i===2){continue}
        g.fillStyle=(f.gold&&i===4)?'#d9a93a':'#cdbf94';
        g.fillRect(x,my-8-open*2,tw-1.4,6+open*mw*.5);
      }
      if(open>.35){g.fillStyle='#c4b78c';for(let i=1;i<tn-1;i++)g.fillRect(-mw+i*tw+1,my+o*.7,tw-1.4,5)}
      if(open>.5){blob(g,0,my+o*1.1,mw*.5,o*.4,[170,60,70],.8)}
      g.restore();
    }
    // lips
    g.fillStyle=shade(f.skin,-42);
    g.beginPath();g.moveTo(-mw,my);g.quadraticCurveTo(-mw*.5,my-ul-open*2.5,0,my-ul*.8-open*2);g.quadraticCurveTo(mw*.5,my-ul-open*2.5,mw,my);
    g.quadraticCurveTo(mw*.5,my-ul*.4-open*2,0,my-ul*.2-open*2);g.quadraticCurveTo(-mw*.5,my-ul*.4-open*2,-mw,my);g.fill();
    g.fillStyle=shade(f.skin,-24);
    g.beginPath();g.moveTo(-mw*.9,my+1);g.quadraticCurveTo(0,my+ll*1.9+o*1.5,mw*.9,my+1);g.quadraticCurveTo(0,my+ll*.7+o*1.3,-mw*.9,my+1);g.fill();
    blob(g,-mw*.2,my+ll*.9+o,mw*.35,3,[255,230,210],.25);
    g.strokeStyle='rgba(30,10,8,.8)';g.lineWidth=1.8;g.beginPath();g.moveTo(-mw,my);g.quadraticCurveTo(0,my+open*mw*.1-2+Math.max(0,1-open*6)*3,mw,my);g.stroke();
    g.beginPath();g.moveTo(-mw-3,my-2);g.lineTo(-mw,my+1);g.moveTo(mw+3,my-2);g.lineTo(mw,my+1);g.stroke();
    blob(g,0,my+ll*2.2+o*1.4,mw*.6,6,[30,12,8],.28);
    if(d>.4){
      const k=clamp((d-.4)/.5,0,1),cx=f.badEye*mw*.35;
      blob(g,cx,my+ll+o*.6,mw*.5,ll*.9,[170,50,60],.5*k);
      g.strokeStyle='rgba(120,8,8,.95)';g.lineWidth=2.6;g.beginPath();g.moveTo(cx,my+ll*.2+o*.4);g.lineTo(cx+1,my+ll*1.6+o*.9);g.stroke();
      g.strokeStyle=`rgba(135,10,10,${.5+k*.4})`;g.lineWidth=3.2;g.beginPath();g.moveTo(cx+1,my+ll*1.6+o*.9);g.quadraticCurveTo(cx+3,my+ll*3+o,cx+2,my+hh*(.12+.12*k)+o);g.stroke();
    }
  }
  // ---- bruises, scrapes ----
  g.globalCompositeOperation='multiply';
  for(const b of f.bruise){
    const a=clamp((d-b[4])/.22,0,1);if(a<=0)continue;
    const x=b[0]*hw,y=b[1]*hh,rx=b[2]*hw*(1+a*.3),ry=b[3]*hh*(1+a*.3);
    blob(g,x,y,rx*1.35,ry*1.35,[170,170,80],.3*a);
    blob(g,x,y,rx,ry,[105,50,135],.7*a);
    blob(g,x+rx*.1,y+ry*.1,rx*.62,ry*.62,[50,60,145],.5*a);
    blob(g,x,y,rx*.34,ry*.34,[60,20,70],.6*a*(d>.5?1:.7));
  }
  g.globalCompositeOperation='source-over';
  if(d>.3){
    g.strokeStyle=`rgba(150,40,35,${clamp((d-.3)*1.4,0,.7)})`;g.lineWidth=1.6;
    for(let i=0;i<4;i++){g.beginPath();g.moveTo(f.badEye*-hw*(.5+i*.04),hh*(.12+i*.05));g.lineTo(f.badEye*-hw*(.7+i*.04),hh*(.2+i*.05));g.stroke()}
  }
  // ---- sweat: sheen, beads and running drops ----
  g.globalCompositeOperation='screen';
  blob(g,-hw*.1,-hh*.5,hw*.5,hh*.1,[255,240,220],.2*sw);
  blob(g,hw*.4,hh*.1,hw*.2,hh*.12,[255,240,220],.18*sw);
  blob(g,-hw*.4,hh*.1,hw*.16,hh*.1,[255,240,220],.1*sw);
  blob(g,0,hh*.26,hw*.12,hh*.05,[255,245,230],.3*sw);
  blob(g,0,hh*.46,hw*.18,hh*.03,[255,240,220],.15*sw);
  blob(g,0,hh*.86,hw*.2,hh*.06,[255,240,220],.14*sw);
  g.globalCompositeOperation='source-over';
  const nd=Math.round(sw*16);
  for(let i=0;i<nd;i++){
    const dp=f.drops[i],p=(t*dp.sp+dp.ph)%1,y=dp.y+p*dp.len,al=Math.sin(p*Math.PI);
    const tr=g.createLinearGradient(0,y-18,0,y);tr.addColorStop(0,'rgba(255,255,255,0)');tr.addColorStop(1,`rgba(235,245,250,${.35*al})`);
    g.strokeStyle=tr;g.lineWidth=dp.sz*.9;g.beginPath();g.moveTo(dp.x,y-18);g.lineTo(dp.x,y);g.stroke();
    g.fillStyle=`rgba(225,238,245,${.55*al+.1})`;g.beginPath();g.ellipse(dp.x,y,dp.sz,dp.sz*1.3,0,0,7);g.fill();
    g.fillStyle=`rgba(255,255,255,${.8*al})`;g.beginPath();g.arc(dp.x-dp.sz*.3,y-dp.sz*.4,dp.sz*.35,0,7);g.fill();
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(dp.x+dp.sz*.3,y+dp.sz*.8,dp.sz*.4,0,7);g.fill();
  }
  for(let i=nd;i<Math.min(16,nd+8);i++){
    const dp=f.drops[i];if(sw<.45)break;
    g.fillStyle='rgba(235,245,250,.28)';g.beginPath();g.arc(dp.x,dp.y+dp.len*.3,dp.sz*.7,0,7);g.fill();
  }
  g.restore(); // head clip
  g.strokeStyle='rgba(25,10,6,.55)';g.lineWidth=2;headPath(g,f);g.stroke();
  hairFront(g,f,st);
}

/* ---------- BODY, FISTS ---------- */
function limb(g,ax,ay,bx,by,w,col,sleeve){
  g.lineCap='round';
  g.strokeStyle='rgba(15,6,3,.85)';g.lineWidth=w+5;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
  g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
  g.strokeStyle='rgba(255,230,200,.13)';g.lineWidth=w*.28;g.beginPath();g.moveTo(ax+2,ay-w*.2);g.lineTo(bx+2,by-w*.2);g.stroke();
  g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=w*.3;g.beginPath();g.moveTo(ax,ay+w*.36);g.lineTo(bx,by+w*.36);g.stroke();
}
function fist(g,x,y,F,scale){
  g.save();g.translate(x,y);g.scale(scale,scale);
  g.fillStyle='#120807';g.beginPath();g.ellipse(0,0,37,33,0,0,7);g.fill();
  const q=g.createLinearGradient(-30,-30,30,30);q.addColorStop(0,'#e0d4b4');q.addColorStop(1,'#a99a74');
  g.fillStyle=q;g.beginPath();g.ellipse(0,0,33,29,0,0,7);g.fill();
  g.strokeStyle='rgba(60,45,25,.45)';g.lineWidth=2;
  for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(i*8-8,-26+Math.abs(i));g.lineTo(i*8+8,26-Math.abs(i));g.stroke()}
  g.fillStyle='rgba(255,255,255,.2)';
  for(let i=0;i<4;i++){g.beginPath();g.arc(14,-20+i*13,6,0,7);g.fill()}
  g.fillStyle=rgba(F.f.skin,1);g.beginPath();g.ellipse(-26,2,10,16,0,0,7);g.fill();
  blob(g,0,4,28,22,[60,40,22],.28);
  blob(g,14,0,16,26,[120,10,10],.7*F.hands);
  g.restore();
}
const BODY_B=470;
function drawBody(g,F,nx,sy,bob){
  const f=F.f,hw=f.hw,{hh}=f;
  const torso=()=>{
    g.beginPath();g.moveTo(nx-hw*.55,sy-34);g.bezierCurveTo(nx-hw*1.2,sy-30,nx-185,sy-14,nx-215,sy+40);
    g.lineTo(nx-245,BODY_B);g.lineTo(nx+245,BODY_B);g.lineTo(nx+215,sy+40);
    g.bezierCurveTo(nx+185,sy-14,nx+hw*1.2,sy-30,nx+hw*.55,sy-34);g.closePath();
  };
  // neck
  g.fillStyle=shade(f.skin,-16);g.beginPath();g.moveTo(nx-hw*.34,sy-hh*.35);g.lineTo(nx+hw*.34,sy-hh*.35);g.lineTo(nx+hw*.6,sy);g.lineTo(nx-hw*.6,sy);g.fill();
  // skin base of torso
  torso();g.fillStyle=shade(f.skin,-10);g.fill();
  const gl=g.createLinearGradient(nx-215,0,nx+215,0);
  if(f.tank){
    g.fillStyle=f.shirt;g.beginPath();g.moveTo(nx-hw*.95,sy-26);
    g.bezierCurveTo(nx-hw*.5,sy+64,nx+hw*.5,sy+64,nx+hw*.95,sy-26);
    g.lineTo(nx+hw*1.3,sy-20);g.lineTo(nx+190,sy+60);g.lineTo(nx+215,BODY_B);g.lineTo(nx-215,BODY_B);g.lineTo(nx-190,sy+60);g.lineTo(nx-hw*1.3,sy-20);g.closePath();g.fill();
    g.strokeStyle='rgba(200,170,150,.18)';g.lineWidth=3;g.beginPath();g.moveTo(nx-hw*.5,sy+8);g.lineTo(nx-hw*.2,sy+14);g.moveTo(nx+hw*.5,sy+8);g.lineTo(nx+hw*.2,sy+14);g.stroke();
    // chest hair
    g.strokeStyle='rgba(20,12,8,.35)';g.lineWidth=1.4;for(let i=0;i<24;i++){const a=i*2.4;const x=nx+Math.cos(a)*hw*.35,y=sy+8+Math.abs(Math.sin(a*1.7))*30;g.beginPath();g.moveTo(x,y);g.lineTo(x+3,y+5);g.stroke()}
  }else{
    torso();gl.addColorStop(0,shade(f.shirt,-18));gl.addColorStop(.6,f.shirt);gl.addColorStop(1,shade(f.shirt,12));g.fillStyle=gl;g.fill();
    g.fillStyle=shade(f.shirt,-30);g.beginPath();g.ellipse(nx,sy-18,hw*.95,34,0,Math.PI,0);g.fill();
    g.fillStyle=shade(f.skin,-24);g.beginPath();g.ellipse(nx,sy-16,hw*.62,20,0,0,Math.PI);g.fill();
    g.strokeStyle='rgba(230,220,200,.5)';g.lineWidth=3;g.beginPath();g.moveTo(nx-16,sy+4);g.lineTo(nx-18,sy+60);g.moveTo(nx+16,sy+4);g.lineTo(nx+18,sy+56);g.stroke();
  }
  // folds, stains, tears
  g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=3;
  for(let i=0;i<6;i++){const x=nx-170+i*68;g.beginPath();g.moveTo(x,sy+90);g.quadraticCurveTo(x+20,sy+200,x-10,sy+330);g.stroke()}
  blob(g,nx-80,sy+170,50,36,[20,15,10],.35);blob(g,nx+70,sy+250,60,30,[90,70,20],.25);
  blob(g,nx,sy+14,hw*.9,28,[10,10,10],.22*clamp(.4+F.exert,0,1));
  g.fillStyle=shade(f.skin,-6);g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2;
  g.beginPath();g.moveTo(nx+70,sy+110);g.lineTo(nx+88,sy+122);g.lineTo(nx+80,sy+136);g.lineTo(nx+96,sy+150);g.lineTo(nx+66,sy+156);g.lineTo(nx+58,sy+132);g.closePath();g.fill();g.stroke();
  if(f.tattoo){
    g.strokeStyle='rgba(40,80,100,.75)';g.lineWidth=2.4;g.lineCap='round';
    g.beginPath();g.moveTo(nx-hw*.52,sy-hh*.25);g.lineTo(nx-hw*.5,sy-4);g.moveTo(nx-hw*.62,sy-hh*.16);g.lineTo(nx-hw*.4,sy-hh*.16);
    g.moveTo(nx-hw*.34,sy-hh*.2);g.quadraticCurveTo(nx-hw*.2,sy-hh*.3,nx-hw*.1,sy-hh*.12);g.stroke();
  }
  // under-chin shadow on the neck
  blob(g,nx,sy-hh*.38,hw*.6,hh*.2,[0,0,0],.45);
}
function bodySprite(F){
  let sp=F.bs;const key=Math.round(F.exert*5);
  if(!sp||sp.Q!==Q){const c=mk(Math.ceil(520*Q),Math.ceil(560*Q));sp={c,g:c.getContext('2d'),Q,key:-1};F.bs=sp}
  if(sp.key!==key){const g2=sp.g;g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,sp.c.width,sp.c.height);
    g2.setTransform(Q,0,0,Q,260*Q,80*Q);drawBody(g2,F,0,0,0);sp.key=key}
  return sp;
}
/* голова: спрайт, обновляется не чаще ~15 раз в секунду и только при заметной смене состояния */
function headSprite(F,st,t){
  const f=F.f;let sp=F.hs;
  if(!sp||sp.Q!==Q){
    const bx=-Math.ceil(f.hw*1.9+16),by=-Math.ceil(f.hh*1.6),bw=-bx*2,bh=Math.ceil(f.hh*3.35);
    const c=mk(Math.ceil(bw*Q),Math.ceil(bh*Q));
    sp={c,g:c.getContext('2d'),bx,by,bw,bh,Q,key:'',ts:-9,sw:-1};F.hs=sp;
  }
  const key=Math.round(st.dmg*40)+','+Math.round(st.grit*6)+','+Math.round(st.blink*4)+','+Math.round(st.mouth*8)+','+Math.round(st.look*6)+','+(st.ko?1:0)+','+Math.round(st.exert*5);
  const sw=Math.floor(t*6);
  if(sp.ts<0)S.headBudget=Math.max(S.headBudget,1);
  if((key!==sp.key||sw!==sp.sw)&&t-sp.ts>=.08&&S.headBudget>0){
    S.headBudget--;
    const g2=sp.g;g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,sp.c.width,sp.c.height);
    g2.setTransform(Q,0,0,Q,-sp.bx*Q,-sp.by*Q);
    drawHead(g2,f,{dmg:st.dmg,grit:st.grit,blink:st.blink,mouth:st.mouth,look:st.look,ko:st.ko,exert:st.exert,t:sw/6});
    sp.key=key;sp.sw=sw;sp.ts=t;
  }
  return sp;
}
function drawFighter(g,F,t){
  const f=F.f,hw=f.hw,hh=f.hh,d=F.dmg;
  const bob=Math.sin(t*5+F.phase)*5+Math.sin(t*2.3+F.phase)*2;
  const pe=F.punch>=0?Math.sin(Math.PI*clamp(F.punch,0,1)):0;
  const droop=(d>.7?(d-.7)*30:0)+F.koK*90;
  const lean=pe*34-F.hit*46-F.koK*30;
  const hy=BASEY+bob+droop;
  g.save();g.translate(F.cx,0);g.scale(F.dir,1);
  const nx=lean*.55,sy=hy+hh*.95+36;
  {const sp=bodySprite(F);g.drawImage(sp.c,nx-260,sy-80,520,560)}
  // arms behind the head: upper arms
  const skin=shade(f.skin,-8),slv=f.tank?skin:shade(f.shirt,6);
  const S1=[nx+175,sy+36],E1=[lerp(nx+205,nx+120,pe),lerp(sy+190,sy+30,pe)];
  const F1=[lerp(hw+44+lean*.3,DIST-98+lean*.2,pe),lerp(hy+hh*.22+bob*.3,hy+hh*.1,pe)];
  const S2=[nx-175,sy+36],E2=[nx-140,sy+210],F2=[nx+hw*.5,hy+hh*.95+8];
  limb(g,S2[0],S2[1],E2[0],E2[1],54,slv);limb(g,E2[0],E2[1],F2[0],F2[1],46,skin);
  // head, pivoting on the neck
  g.save();
  const ang=-F.hit*.2+F.koK*.3+(Math.sin(t*3+F.phase)*.012);
  g.translate(nx,sy-hh*.1-16);g.rotate(ang);g.translate(F.hit*(Math.random()-.5)*8,hy-(sy-hh*.1-16)+0);
  const grit=Math.max(pe*.85,F.hit);
  const mouth=clamp(.06+pe*.14+F.hit*.9+F.koK*.55+(Math.sin(t*3.4+F.phase)+1)*.04*(.3+F.exert),0,1);
  {const sp=headSprite(F,{dmg:d,grit,blink:F.blinkV,mouth,look:F.look,ko:F.koK>.5,exert:F.exert},t);g.drawImage(sp.c,sp.bx,sp.by,sp.bw,sp.bh)}
  g.restore();
  // fists in front
  fist(g,F2[0],F2[1],F,1);
  limb(g,S1[0],S1[1],E1[0],E1[1],54,slv);limb(g,E1[0],E1[1],F1[0],F1[1],46,skin);
  if(pe>.25&&F.punch<.55){for(let i=3;i>=1;i--){g.globalAlpha=.16*i/3;fist(g,F1[0]-i*26*pe,F1[1],F,1.02)}g.globalAlpha=1}
  fist(g,F1[0],F1[1],F,1.08);
  g.restore();
}

/* ---------- STATE ---------- */
const S={headBudget:1,lite:false,paused:false,interactive:true,bg:'yard',auto:!window.matchMedia('(prefers-reduced-motion: reduce)').matches,t:0,shake:0,flash:0,fx:0,fy:0,next:1,koT:0,parts:[]};
const mkState=(seed,cx,dir,dmg)=>({f:makeFighter(seed),dmg,hit:0,punch:-1,landed:false,cx,dir,phase:Math.random()*6,exert:.2,koK:0,ko:false,blinkV:0,bt:1+Math.random()*3,bp:0,look:0,hands:0});
const $=id=>document.getElementById(id)||{style:{},classList:{toggle(){}},setAttribute(){},set onclick(f){},textContent:'',hidden:false};
let L,R;
function newFaces(dmgL,dmgR){
  const a=(Math.random()*1e9)|0;let b=(Math.random()*1e9)|0;
  L=mkState(a,215,1,dmgL||0);R=mkState(b,505,-1,dmgR||0);
  if(R.f.name===L.f.name){R.f.name=R.f.name+' мл.'}
  S.koT=0;updateHud(true);
}
newFaces(.32,.52);

function spawn(x,y,dirx,kind,n,power){
  for(let i=0;i<n;i++){
    const a=-Math.PI*.5+(Math.random()-.5)*2.4,sp=140+Math.random()*power;
    S.parts.push({x,y,vx:Math.cos(a)*sp*dirx+dirx*60,vy:Math.sin(a)*sp-30,l:1,k:kind,r:kind==='blood'?1.8+Math.random()*2.4:1.4+Math.random()*2.2});
  }
}
function land(A){
  const D=A===L?R:L;
  const op=A.opts||{};A.opts=null;
  let pw=A.pow||(.07+Math.random()*.05);
  if(op.to!==undefined){pw=Math.max(0,op.to-D.dmg);D.dmg=clamp(op.to,0,1)}else D.dmg=Math.min(1,D.dmg+pw);
  D.hit=op.blocked?.4:1;D.look=(Math.random()-.5)*2;D.exert=Math.min(1,D.exert+.3);A.exert=Math.min(1,A.exert+.2);
  A.hands=Math.min(1,A.hands+.05);
  const x=D.cx-A.dir*D.f.hw*.9,y=BASEY+D.f.hh*.1;
  spawn(x,y,A.dir,'sweat',op.blocked?8:22,300);
  if(D.dmg>.28&&!op.blocked)spawn(x,y,A.dir,'blood',Math.round(4+D.dmg*10)+(op.crit?8:0),340);
  spawn(x,y+20,A.dir,'dust',6,200);
  S.shake=Math.max(S.shake,op.blocked?4:8+pw*90+(op.crit?10:0));S.flash=op.blocked?.35:1;S.fx=x;S.fy=y;
  if(D.dmg>=1&&!D.ko){D.ko=true;S.koT=0}
  A.pow=0;updateHud();
}
function attack(A,pow,opts){
  const D=A===L?R:L;
  if(A.punch>=0||A.ko||D.ko)return;
  A.punch=0;A.landed=false;A.pow=pow;A.opts=opts||null;
}
function hitSide(side,pow){const D=side==='left'?L:R,A=D===L?R:L;attack(A,pow?clamp(pow,0.02,.4):0)}

/* ---------- HUD ---------- */
function updateHud(force){
  const set=(n,m,b,F)=>{
    $(n).textContent=F.f.name;
    const hp=Math.round((1-F.dmg)*100);
    $(m).textContent=`${hp}% · ${F.ko?'в нокауте':F.dmg>.65?'плывёт':F.dmg>.3?'в синяках':'бодр'}`;
    $(b).style.width=hp+'%';
  };
  set('nL','mL','bL',L);set('nR','mR','bR',R);
  $('ko').hidden=!(L.ko||R.ko);
}

/* ---------- LOOP ---------- */
function update(dt){
  S.t+=dt;S.shake*=Math.pow(.0015,dt);S.flash=Math.max(0,S.flash-dt*5);
  for(const F of[L,R]){
    F.hit=Math.max(0,F.hit-dt*3);F.exert=Math.max(0,F.exert-dt*.12);
    F.koK+=((F.ko?1:0)-F.koK)*Math.min(1,dt*3);
    if(F.punch>=0){F.punch+=dt/.36;if(F.punch>=.5&&!F.landed){F.landed=true;land(F)}if(F.punch>=1)F.punch=-1}
    F.bt-=dt;if(F.bt<0){F.bp=.14;F.bt=2+Math.random()*3}
    if(F.bp>0)F.bp-=dt;F.blinkV=F.bp>0?Math.sin(clamp(F.bp/.14,0,1)*Math.PI):0;
    F.look+=(0-F.look)*Math.min(1,dt*2);
  }
  if(S.auto&&!L.ko&&!R.ko){S.next-=dt;if(S.next<0){attack(Math.random()<.5?L:R);S.next=.55+Math.random()*.8}}
  if(L.ko||R.ko){S.koT+=dt;if(S.auto&&S.koT>2.6){newFaces(.1,.2)}}
  for(let i=S.parts.length-1;i>=0;i--){
    const p=S.parts[i];p.l-=dt*(p.k==='dust'?1.4:.8);p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.l<=0||p.y>H+10)S.parts.splice(i,1);
  }
}
const noise=mk(128,128);{const n=noise.getContext('2d'),im=n.createImageData(128,128);for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=26}n.putImageData(im,0,0)}
const noisePat=ctx.createPattern(noise,'repeat');
function enableLite(){
  if(S.lite)return;S.lite=true;const host=cv.parentNode;
  if(!document.getElementById('fv-css')){const st=document.createElement('style');st.id='fv-css';
    st.textContent='.fv-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(0,0,0,0) 40%,rgba(0,0,0,.6) 100%)}'+
    '.fv-grain{position:absolute;inset:-70px;pointer-events:none;animation:fvg .45s steps(1) infinite}'+
    '@keyframes fvg{0%{transform:translate(0,0)}20%{transform:translate(-37px,21px)}40%{transform:translate(19px,-44px)}60%{transform:translate(-22px,-30px)}80%{transform:translate(41px,12px)}}'+
    '@media (prefers-reduced-motion:reduce){.fv-grain{animation:none}}';document.head.appendChild(st)}
  const v=document.createElement('div');v.className='fv-vig';host.appendChild(v);
  const n=document.createElement('div');n.className='fv-grain';n.style.backgroundImage='url('+noise.toDataURL()+')';host.appendChild(n);
}
function render(dt){
  S.headBudget=1;
  const g=ctx;g.setTransform(Q,0,0,Q,0,0);
  g.save();
  if(S.shake>.3)g.translate((Math.random()-.5)*S.shake,(Math.random()-.5)*S.shake);
  g.drawImage(S.bg==='yard'?bgYard:bgRing,0,0,W,H);
  if(S.bg==='yard')overlayYard(g,S.t);else overlayRing(g,S.t,dt);
  const order=(L.punch>=0)?[R,L]:(R.punch>=0)?[L,R]:[L,R];
  for(const F of order)drawFighter(g,F,S.t);
  for(const p of S.parts){
    g.globalAlpha=clamp(p.l*1.4,0,1);
    g.fillStyle=p.k==='blood'?'#8e1410':p.k==='dust'?'rgba(180,160,140,.6)':'#dfeaf0';
    g.beginPath();g.arc(p.x,p.y,p.r*(p.k==='dust'?1+(1-p.l)*3:1),0,7);g.fill();
  }
  g.globalAlpha=1;
  if(S.flash>0){
    const k=S.flash;g.save();g.translate(S.fx,S.fy);g.fillStyle=`rgba(255,238,200,${k*.85})`;g.beginPath();
    for(let i=0;i<20;i++){const a=i/20*Math.PI*2,rr=(i%2?20:62+(i%3)*10)*(.5+.6*(1-k)+.4);g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}
    g.closePath();g.fill();g.restore();
  }
  g.restore();
  // vignette, grain, low-health redness
  if(!S.lite){const v=g.createRadialGradient(W/2,H*.46,H*.25,W/2,H*.5,H*.78);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.62)');
  g.fillStyle=v;g.fillRect(0,0,W,H);}
  const worst=Math.max(L.dmg,R.dmg);
  if(worst>.6){g.fillStyle=`rgba(120,10,8,${(worst-.6)*.25+(S.flash*.12)})`;g.fillRect(0,0,W,H)}
  if(!S.lite){g.save();g.translate(Math.random()*128|0,Math.random()*128|0);g.fillStyle=noisePat;g.fillRect(-128,-128,W+256,H+256);g.restore();}
}
let last=performance.now(),rafId=0,qAcc=0,qN=0,qWarm=0;
function adapt(raw){
  if(qWarm<20){qWarm++;return}
  qAcc+=raw;qN++;
  if(qN>=40){const avg=qAcc/qN;qAcc=0;qN=0;
    if(avg>26&&Q>.46){Q=Math.max(.45,+(Q*.8).toFixed(2));resizeCv()}}
}
function frame(now){
  rafId=0;if(S.paused)return;
  const raw=Math.min(100,now-last),dt=Math.min(.05,raw/1000);last=now;
  adapt(raw);
  try{update(dt);render(dt)}catch(e){console.error(e)}
  rafId=requestAnimationFrame(frame);
}
rafId=requestAnimationFrame(frame);
function setPaused(p){S.paused=!!p;if(!S.paused&&!rafId){last=performance.now();qWarm=0;qAcc=0;qN=0;rafId=requestAnimationFrame(frame)}}

/* ---------- UI ---------- */
function setBg(n){
  S.bg=n;$('bgYard').setAttribute('aria-pressed',String(n==='yard'));$('bgRing').setAttribute('aria-pressed',String(n==='ring'));
}
$('bgYard').onclick=()=>setBg('yard');$('bgRing').onclick=()=>setBg('ring');
$('hitL').onclick=()=>hitSide('left');$('hitR').onclick=()=>hitSide('right');
$('auto').onclick=()=>{S.auto=!S.auto;const b=$('auto');b.classList.toggle('on',S.auto);b.setAttribute('aria-pressed',String(S.auto));b.textContent='Авто-бой: '+(S.auto?'вкл':'выкл')};
$('faces').onclick=()=>newFaces(.3,.45);
$('reset').onclick=()=>{L.dmg=0;R.dmg=0;L.ko=R.ko=false;updateHud()};
cv.addEventListener('pointerdown',e=>{
  if(!S.interactive)return;
  const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;
  hitSide(x<W/2?'left':'right');
});
(()=>{const a=$('auto');a.classList.toggle('on',S.auto);a.setAttribute('aria-pressed',String(S.auto));a.textContent='Авто-бой: '+(S.auto?'вкл':'выкл')})();
window.FightVisual={
  hit:(side,power)=>hitSide(side,power),
  setDamage:(side,v)=>{const F=side==='left'?L:R;F.dmg=clamp(+v||0,0,1);F.ko=F.dmg>=1;updateHud()},
  setBackground:setBg,
  newFaces:()=>newFaces(0,0),
  reset:()=>{L.dmg=0;R.dmg=0;L.ko=R.ko=false;updateHud()},
  /* режим игры: без авто-боя и тапов, лица по seed */
  setMode:(m)=>{const g=m==='game';S.auto=!g&&S.auto;S.interactive=!g;if(g)enableLite()},
  setPaused,quality:()=>Q,
  setFighters:(seedL,seedR,dmgL,dmgR)=>{
    L=mkState(seedL|0,215,1,clamp(+dmgL||0,0,1));R=mkState(seedR|0,505,-1,clamp(+dmgR||0,0,1));
    L.ko=L.dmg>=1;R.ko=R.dmg>=1;S.koT=0;S.parts.length=0;updateHud(true)},
  /* attacker: 'left'|'right'; opts: {to:доля урона защитника 0..1, blocked, crit} */
  strike:(attacker,opts)=>{const A=attacker==='left'?L:R;attack(A,0,opts||{})},
  setEnergy:(side,v)=>{(side==='left'?L:R).exert=clamp(1-(+v||0),0,1)}
};
})();

