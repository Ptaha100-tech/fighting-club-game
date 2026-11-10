/* hero.js: полнофигурный персонаж с 8 образами (бомж -> чемпион) и сцена главного меню.
   Нужен fight-visual.js (лица, фоны двора и ринга). API: Hero.mount, setPlayer, start/stop, drawPortrait, renderTier, TIERS, tierOf. */
(function(){
'use strict';
const K=window.FightVisual&&window.FightVisual.kit;
if(!K){console.error('Hero: сначала подключите fight-visual.js');return}
const {makeFighter,drawHead,rng,blob,shade,rgba}=K;
const W=720,H=900,CX=360,FLOOR=845;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

/* ---------- ступени: порог уровня, телосложение, одежда, фон ---------- */
const TIERS=[
 {name:'Бомж',min:1,build:.04,hunch:1,dirt:1,bruise:.36,sweat:.45,hair:'beanie',hat:'#4a4540',hairCol:'#8a8a86',beard:1,gray:true,gap:true,
  top:'coat',pants:'rags',shoes:'mismatch',hands:'bare',pose:'slump',prop:'bottle',bg:'yard',accent:'#9a7b4a'},
 {name:'Гопник',min:4,build:.22,hunch:.6,dirt:.4,bruise:.18,sweat:.2,hair:'cap',hat:'#1b1b20',hairCol:'#2a2118',beard:.4,gray:false,gap:true,
  top:'track',pants:'track',shoes:'sneaker',hands:'bare',pose:'swagger',prop:'chain',bg:'yard',accent:'#3f74c4'},
 {name:'Уличный боец',min:8,build:.42,hunch:.35,dirt:.2,bruise:.14,sweat:.18,hair:'buzz',hairCol:'#2a2118',beard:.5,gray:false,gap:false,
  top:'tank',pants:'jeans',shoes:'boots',hands:'wraps',pose:'swagger',prop:null,bg:'gym',accent:'#d06a2e'},
 {name:'Подпольный боксёр',min:13,build:.6,hunch:.2,dirt:.1,bruise:.2,sweat:.2,hair:'buzz',hairCol:'#1c1512',beard:.3,gray:false,gap:false,
  top:'bare',pants:'box',shoes:'boxboots',hands:'boxglove',pose:'ready',prop:'towel',bg:'ring',accent:'#c42a30'},
 {name:'Любитель ММА',min:19,build:.76,hunch:.1,dirt:0,bruise:.06,sweat:.12,hair:'buzz',hairCol:'#1c1512',beard:.22,gray:false,gap:false,
  top:'bare',pants:'mma',shoes:'bare',hands:'mmaglove',pose:'ready',prop:null,bg:'cage',accent:'#2f86e0'},
 {name:'Профи ММА',min:26,build:.88,hunch:0,dirt:0,bruise:.03,sweat:.1,hair:'buzz',hairCol:'#1c1512',beard:.18,gray:false,gap:false,
  top:'bare',pants:'mmapro',shoes:'bare',hands:'mmaglove',pose:'ready',prop:'tattoo',bg:'cage',accent:'#2fb585'},
 {name:'Претендент UFC',min:34,build:.95,hunch:0,dirt:0,bruise:0,sweat:.1,hair:'buzz',hairCol:'#141010',beard:.15,gray:false,gap:false,
  top:'robe',pants:'mmagold',shoes:'bare',hands:'mmaglove',pose:'ready',prop:'tattoo',bg:'arena',accent:'#e0a030'},
 {name:'Чемпион UFC',min:45,build:1,hunch:0,dirt:0,bruise:0,sweat:.08,hair:'buzz',hairCol:'#141010',beard:.12,gray:false,gap:false,
  top:'bare',pants:'mmagold',shoes:'bare',hands:'goldglove',pose:'ready',prop:'belt',bg:'arena',accent:'#ffd24a'}
];
function tierOf(level){let t=0;TIERS.forEach((x,i)=>{if(level>=x.min)t=i});return t}

/* ---------- фоны ---------- */
const bgCache={};
function bgGym(g){
  const r=rng(31);
  let q=g.createLinearGradient(0,0,0,H);q.addColorStop(0,'#16201f');q.addColorStop(.62,'#2a3331');q.addColorStop(1,'#141413');
  g.fillStyle=q;g.fillRect(0,0,W,H);
  // кирпичная стена с побелкой
  for(let y=60;y<640;y+=26)for(let x=-((y/26)%2)*36;x<W;x+=72){const t=r();g.fillStyle=`rgb(${58+t*26|0},${60+t*20|0},${58+t*18|0})`;g.fillRect(x+2,y+2,68,22);g.fillStyle='rgba(255,255,255,.04)';g.fillRect(x+2,y+2,68,2)}
  g.fillStyle='rgba(20,30,40,.55)';g.fillRect(0,330,W,40);
  g.font="bold 54px 'Russo One',Impact,sans-serif";g.textAlign='center';g.fillStyle='rgba(210,190,150,.22)';g.fillText('КАЧАЛКА',CX,420);
  // окно с лучами света
  g.fillStyle='#0a1218';g.fillRect(520,120,130,180);g.strokeStyle='#33403f';g.lineWidth=6;g.strokeRect(520,120,130,180);g.beginPath();g.moveTo(585,120);g.lineTo(585,300);g.moveTo(520,210);g.lineTo(650,210);g.stroke();
  g.globalCompositeOperation='lighter';q=g.createLinearGradient(560,200,300,820);q.addColorStop(0,'rgba(170,200,230,.20)');q.addColorStop(1,'rgba(170,200,230,0)');
  g.fillStyle=q;g.beginPath();g.moveTo(520,210);g.lineTo(650,210);g.lineTo(520,860);g.lineTo(150,860);g.closePath();g.fill();g.globalCompositeOperation='source-over';
  // груши на цепях
  [[110,230,230],[225,210,190]].forEach(([x,y,h])=>{
    g.strokeStyle='#555';g.lineWidth=4;g.beginPath();g.moveTo(x,0);g.lineTo(x,y);g.stroke();
    const bq=g.createLinearGradient(x-34,0,x+34,0);bq.addColorStop(0,'#3a1613');bq.addColorStop(.4,'#8f3228');bq.addColorStop(1,'#2a0e0c');
    g.fillStyle=bq;g.beginPath();g.roundRect?g.roundRect(x-34,y,68,h,22):g.rect(x-34,y,68,h);g.fill();
    g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=3;[.3,.7].forEach(k=>{g.beginPath();g.moveTo(x-34,y+h*k);g.lineTo(x+34,y+h*k);g.stroke()});
  });
  // лампы
  [180,540].forEach(x=>{g.fillStyle='#222';g.fillRect(x-40,40,80,10);g.fillStyle='#ffe9b8';g.fillRect(x-32,50,64,6)});
  g.globalCompositeOperation='lighter';[180,540].forEach(x=>{const gq=g.createRadialGradient(x,56,0,x,56,340);gq.addColorStop(0,'rgba(255,220,150,.28)');gq.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=gq;g.fillRect(0,0,W,H)});g.globalCompositeOperation='source-over';
  // пол: резиновые маты
  q=g.createLinearGradient(0,640,0,H);q.addColorStop(0,'#2b2724');q.addColorStop(1,'#0f0e0d');g.fillStyle=q;g.fillRect(0,640,W,H-640);
  g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=2;for(let x=-200;x<W+200;x+=90){g.beginPath();g.moveTo(CX+(x-CX)*.55,640);g.lineTo(x*1.5-CX*.5,H);g.stroke()}
  for(let y=700;y<H;y+=70){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}
  g.fillStyle='#4a423a';g.fillRect(0,636,W,6);
  // гантели
  g.fillStyle='#111';[[80,810],[150,822]].forEach(([x,y])=>{g.fillRect(x,y,60,8);g.fillRect(x-6,y-14,14,36);g.fillRect(x+52,y-14,14,36)});
}
function bgCage(g){
  const r=rng(53);
  let q=g.createLinearGradient(0,0,0,H);q.addColorStop(0,'#07080e');q.addColorStop(.5,'#121624');q.addColorStop(1,'#0c0d12');g.fillStyle=q;g.fillRect(0,0,W,H);
  // толпа боке
  for(let i=0;i<150;i++){const x=r()*W,y=140+r()*340,rr=6+r()*14;g.fillStyle=`rgba(${r()<.5?255:120},${150+r()*80|0},${r()<.5?90:220},${.05+r()*.12})`;g.beginPath();g.arc(x,y,rr,0,7);g.fill()}
  for(let row=0;row<3;row++)for(let x=-10;x<W+20;x+=26+r()*10){const y=360+row*40+r()*8,hr=10+row*3;g.fillStyle=`rgb(${6+row*3},${6+row*3},${12+row*4})`;g.beginPath();g.arc(x,y,hr,0,7);g.fill();g.beginPath();g.ellipse(x,y+hr*2.3,hr*1.8,hr*2,0,Math.PI,0);g.fill()}
  // лучи прожекторов
  g.globalCompositeOperation='lighter';
  [[130,0,-90],[590,0,90],[360,0,0]].forEach(([x,y,d])=>{const lq=g.createLinearGradient(x,0,x+d*2,H*.8);lq.addColorStop(0,'rgba(190,215,255,.30)');lq.addColorStop(1,'rgba(190,215,255,0)');g.fillStyle=lq;g.beginPath();g.moveTo(x-18,0);g.lineTo(x+18,0);g.lineTo(x+d*2+150,H*.8);g.lineTo(x+d*2-150,H*.8);g.closePath();g.fill()});
  g.globalCompositeOperation='source-over';
  // сетка клетки
  g.save();g.beginPath();g.rect(0,120,W,560);g.clip();g.strokeStyle='rgba(185,195,210,.28)';g.lineWidth=1.6;
  for(let x=-600;x<W+600;x+=26){g.beginPath();g.moveTo(x,120);g.lineTo(x+360,680);g.stroke();g.beginPath();g.moveTo(x+360,120);g.lineTo(x,680);g.stroke()}g.restore();
  // стойки и верхний обод
  [60,CX,W-60].forEach(x=>{const pq=g.createLinearGradient(x-12,0,x+12,0);pq.addColorStop(0,'#15171c');pq.addColorStop(.45,'#7b8088');pq.addColorStop(1,'#15171c');g.fillStyle=pq;g.fillRect(x-12,110,24,590)});
  g.fillStyle='#2a2d34';g.fillRect(0,104,W,16);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,104,W,3);
  g.fillStyle='#8f1a22';g.fillRect(0,640,W,34);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,640,W,3);
  // мат восьмиугольника
  q=g.createLinearGradient(0,674,0,H);q.addColorStop(0,'#252a38');q.addColorStop(1,'#0d0f16');g.fillStyle=q;g.fillRect(0,674,W,H-674);
  g.strokeStyle='rgba(200,210,235,.20)';g.lineWidth=3;g.beginPath();g.ellipse(CX,830,300,62,0,0,7);g.stroke();
  g.fillStyle='rgba(255,255,255,.05)';g.font="bold 92px 'Russo One',Impact,sans-serif";g.textAlign='center';g.fillText('КЛЕТКА',CX,870);
  g.globalCompositeOperation='lighter';const fq=g.createRadialGradient(CX,780,0,CX,780,330);fq.addColorStop(0,'rgba(120,170,255,.22)');fq.addColorStop(1,'rgba(120,170,255,0)');g.fillStyle=fq;g.fillRect(0,600,W,300);g.globalCompositeOperation='source-over';
}
function bgArena(g){
  const r=rng(77);
  let q=g.createLinearGradient(0,0,0,H);q.addColorStop(0,'#05040a');q.addColorStop(.55,'#150f1f');q.addColorStop(1,'#0a0810');g.fillStyle=q;g.fillRect(0,0,W,H);
  for(let i=0;i<260;i++){const x=r()*W,y=40+r()*520,rr=5+r()*16;const gold=r()<.55;g.fillStyle=`rgba(${gold?255:150},${gold?190+r()*50|0:170},${gold?80:255},${.05+r()*.16})`;g.beginPath();g.arc(x,y,rr,0,7);g.fill()}
  // баннеры
  [[90,'#7a1620'],[630,'#7a1620'],[250,'#1b2f66'],[470,'#1b2f66']].forEach(([x,c])=>{g.fillStyle=c;g.fillRect(x-34,0,68,170);g.beginPath();g.moveTo(x-34,170);g.lineTo(x,200);g.lineTo(x+34,170);g.fill();g.fillStyle='rgba(255,215,100,.55)';g.fillRect(x-34,0,6,170);g.fillRect(x+28,0,6,170);g.beginPath();g.moveTo(x,60);g.lineTo(x+13,95);g.lineTo(x,130);g.lineTo(x-13,95);g.closePath();g.fill()});
  g.globalCompositeOperation='lighter';
  [[110,-40],[270,-20],[450,20],[610,40]].forEach(([x,d])=>{const lq=g.createLinearGradient(x,0,x+d*3,H*.85);lq.addColorStop(0,'rgba(255,225,160,.34)');lq.addColorStop(1,'rgba(255,225,160,0)');g.fillStyle=lq;g.beginPath();g.moveTo(x-14,0);g.lineTo(x+14,0);g.lineTo(x+d*3+130,H*.85);g.lineTo(x+d*3-130,H*.85);g.closePath();g.fill()});
  const cq=g.createRadialGradient(CX,160,0,CX,160,380);cq.addColorStop(0,'rgba(255,230,170,.28)');cq.addColorStop(1,'rgba(255,230,170,0)');g.fillStyle=cq;g.fillRect(0,0,W,H);
  g.globalCompositeOperation='source-over';
  // трибуны
  for(let row=0;row<4;row++)for(let x=-10;x<W+20;x+=24+r()*8){const y=400+row*44+r()*8,hr=9+row*3;g.fillStyle=`rgb(${8+row*3},${6+row*2},${14+row*4})`;g.beginPath();g.arc(x,y,hr,0,7);g.fill();g.beginPath();g.ellipse(x,y+hr*2.3,hr*1.8,hr*2,0,Math.PI,0);g.fill();if(r()<.07){g.fillStyle='rgba(190,215,255,.85)';g.fillRect(x+hr,y-hr*2,5,7)}}
  // сцена
  q=g.createLinearGradient(0,640,0,H);q.addColorStop(0,'#2a2230');q.addColorStop(.3,'#17121d');q.addColorStop(1,'#07050a');g.fillStyle=q;g.fillRect(0,640,W,H-640);
  g.fillStyle='#d89b2b';g.fillRect(0,634,W,6);g.fillStyle='rgba(255,230,160,.22)';g.fillRect(0,640,W,3);
  g.globalCompositeOperation='lighter';const rq=g.createRadialGradient(CX,830,0,CX,830,320);rq.addColorStop(0,'rgba(255,205,110,.30)');rq.addColorStop(1,'rgba(255,205,110,0)');g.save();g.translate(0,830);g.scale(1,.22);g.translate(0,-830);g.fillStyle=rq;g.fillRect(0,500,W,700);g.restore();g.globalCompositeOperation='source-over';
}
function getBg(kind){
  if(bgCache[kind])return bgCache[kind];
  const c=mk(W,H),g=c.getContext('2d');
  if(kind==='yard')K.yard(g);else if(kind==='ring')K.ring(g);else if(kind==='gym')bgGym(g);else if(kind==='cage')bgCage(g);else bgArena(g);
  return bgCache[kind]=c;
}

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
  paint(g,p,'#6b7075',CX-cw,CX+cw,.95);
  g.save();g.clip(p);
  blob(g,CX,yS+90,cw*.9,50,[20,24,30],.3);blob(g,CX-cw*.5,yA+6,26,40,[40,50,60],.4);blob(g,CX,yW-10,D.ww,30,[20,24,30],.25);
  g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=2.4;for(let i=0;i<4;i++){g.beginPath();g.moveTo(CX-cw+10,yA+20+i*22);g.quadraticCurveTo(CX,yA+30+i*22,CX+cw-10,yA+20+i*22);g.stroke()}
  g.fillStyle='rgba(235,235,225,.9)';g.font="bold 34px 'Russo One',Impact,sans-serif";g.textAlign='center';g.globalAlpha=.55;g.fillText('БОКС',CX,yA+58);g.globalAlpha=1;
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

/* ---------- голова: лицо по сиду, подстроенное под ступень ---------- */
function heroFighter(seed,tier){
  const T=TIERS[tier],f=makeFighter(seed),r=rng((seed^0x2f6e2b1)|0);
  f.hair=T.hair;f.hairCol=T.hairCol;if(T.hat)f.hat=T.hat;f.gray=!!T.gray;f.gap=!!(f.gap&&T.gap);f.gold=tier>=5?f.gold:false;
  const keep=Math.min(1,T.beard/(f.beard||1)),out=[];
  for(let i=0;i<f.stub.length;i+=3)if(r()<keep)out.push(f.stub[i],f.stub[i+1],T.gray?r()<.65:false);
  f.stub=out;f.beard=T.beard;f.dirt=f.dirt.map(q=>[q[0],q[1],q[2],q[3]*T.dirt]);f.wr=lerp(.95,.25,T.build);f.cauli=f.cauli&&tier>=2;
  return f;
}
function newHead(f,hs,Q){
  const bx=-Math.ceil(f.hw*1.9+16),by=-Math.ceil(f.hh*1.6),bw=-bx*2,bh=Math.ceil(f.hh*3.35),c=mk(Math.ceil(bw*hs*Q),Math.ceil(bh*hs*Q));
  return{c,g:c.getContext('2d'),bx,by,bw,bh,hs,Q,key:'',ts:-9};
}
function paintHead(sp,f,T,t,look){
  const key=Math.floor(t*8)+'|'+Math.round(look*4);
  if(key===sp.key&&t-sp.ts<.5)return;
  const g=sp.g,k=sp.Q*sp.hs;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,sp.c.width,sp.c.height);g.setTransform(k,0,0,k,-sp.bx*k,-sp.by*k);
  const bt=(t%4.3)/.16,blink=bt<1?Math.sin(bt*Math.PI):0;
  drawHead(g,f,{dmg:T.bruise,grit:0,blink,mouth:.04+.015*Math.sin(t*1.6),look,ko:false,exert:0,sweat:T.sweat,t:Math.floor(t*6)/6});
  sp.key=key;sp.ts=t;
}
function lightPass(g,D,T){
  g.globalCompositeOperation='source-atop';
  let q=g.createLinearGradient(0,H*.32,0,FLOOR);q.addColorStop(0,'rgba(0,0,0,0)');q.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=q;g.fillRect(0,0,W,H);
  q=g.createRadialGradient(CX-150,240,10,CX-150,240,540);q.addColorStop(0,'rgba(255,214,160,.24)');q.addColorStop(1,'rgba(255,214,160,0)');g.fillStyle=q;g.fillRect(0,0,W,H);
  q=g.createLinearGradient(CX+60,0,CX+220,0);q.addColorStop(0,'rgba(120,165,255,0)');q.addColorStop(1,'rgba(120,165,255,.17)');g.fillStyle=q;g.fillRect(CX+60,0,W,H);
  g.globalCompositeOperation='source-over';
}
function buildFigure(tier,seed){
  const T=TIERS[tier],f=heroFighter(seed,tier),fig=mk(W,H),g=fig.getContext('2d');
  const D=drawFigure(g,T,f);lightPass(g,D,T);
  return{T,f,D,fig};
}

/* ---------- сцена главного меню ---------- */
const S={cv:null,g:null,Q:.8,running:false,raf:0,last:0,acc:0,t:0,rec:null,head:null,tier:-1,seed:0,level:1,bg:null,parts:[],flash:0,portrait:null,onEvolve:null,vapor:[]};
function build(){
  S.rec=buildFigure(S.tier,S.seed);S.head=newHead(S.rec.f,S.rec.D.hs,S.Q);paintHead(S.head,S.rec.f,S.rec.T,S.t,0);
  S.bg=getBg(S.rec.T.bg);S.portrait=null;
}
function mount(cv,opts){
  S.cv=cv;S.Q=(opts&&opts.quality)||(((navigator.hardwareConcurrency||4)<=4)?.62:.8);
  cv.width=Math.round(W*S.Q);cv.height=Math.round(H*S.Q);S.g=cv.getContext('2d');
  for(let i=0;i<34;i++)S.parts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*6,vy:-6-Math.random()*10,r:.8+Math.random()*2.2,a:.15+Math.random()*.4,ph:Math.random()*6});
}
function setPlayer(p){
  const tier=tierOf(p.level||1),seed=p.seed|0||1,had=!!S.rec,changed=!had||tier!==S.tier||seed!==S.seed;
  S.level=p.level||1;
  if(!changed)return false;
  const up=had&&tier>S.tier;S.tier=tier;S.seed=seed;
  if(S.cv)build();
  if(up){S.flash=1;if(S.onEvolve)S.onEvolve(tier)}
  return up;
}
function draw(dt){
  const g=S.g,{T,D}=S.rec,t=S.t,Q=S.Q,s=Math.sin(t*1.9),look=Math.sin(t*.45)*.35;
  g.setTransform(Q,0,0,Q,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  g.drawImage(S.bg,0,0);
  // тёплое дыхание света
  g.globalCompositeOperation='lighter';
  const fl=.82+.1*Math.sin(t*2.3)+.06*Math.sin(t*7.1),ac=T.accent;
  const gq=g.createRadialGradient(CX,330,10,CX,330,460);gq.addColorStop(0,rgba(ac,.20*fl));gq.addColorStop(1,rgba(ac,0));g.fillStyle=gq;g.fillRect(0,0,W,H);
  g.globalCompositeOperation='source-over';
  // аура у верхних ступеней
  if(S.tier>=6){g.globalCompositeOperation='lighter';const aq=g.createRadialGradient(CX,520,60,CX,520,400);aq.addColorStop(0,rgba(ac,S.tier===7?.34:.2));aq.addColorStop(1,rgba(ac,0));g.fillStyle=aq;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'}
  // тень на полу
  blob(g,CX,FLOOR+8,175,22,[0,0,0],.6);
  // персонаж
  g.save();g.translate(CX,FLOOR);g.scale(1+.0035*s,1+.007*s);g.rotate(Math.sin(t*.6)*.004);g.translate(-CX,-FLOOR);
  g.drawImage(S.rec.fig,0,0);
  const sp=S.head;paintHead(sp,S.rec.f,T,t,look);
  g.drawImage(sp.c,D.hx+sp.bx*sp.hs,D.hy+sp.by*sp.hs-1.5*s,sp.bw*sp.hs,sp.bh*sp.hs);
  g.restore();
  // пыль и искры
  g.globalCompositeOperation='lighter';
  for(const p of S.parts){
    p.x+=(p.vx+Math.sin(t+p.ph)*4)*dt;p.y+=p.vy*dt;if(p.y<-10){p.y=H+10;p.x=Math.random()*W}
    const gold=S.tier>=6;g.fillStyle=gold?'rgba(255,220,120,'+p.a+')':'rgba(220,200,170,'+(p.a*.5)+')';g.beginPath();g.arc(p.x,p.y,p.r*(gold?1.3:1),0,7);g.fill();
  }
  g.globalCompositeOperation='source-over';
  // пар изо рта у бомжа, мёрзнет
  if(S.tier===0){
    if(Math.random()<dt*.5)S.vapor.push({x:CX+10,y:D.hy+44,l:1});
    for(let i=S.vapor.length-1;i>=0;i--){const v=S.vapor[i];v.l-=dt*.45;if(v.l<=0){S.vapor.splice(i,1);continue}v.x+=dt*22;v.y-=dt*16;g.fillStyle='rgba(235,240,245,'+(v.l*.22)+')';g.beginPath();g.arc(v.x,v.y,10+(1-v.l)*26,0,7);g.fill()}
  }
  // вспышка эволюции
  if(S.flash>0){S.flash=Math.max(0,S.flash-dt*1.1);g.fillStyle='rgba(255,246,214,'+(S.flash*.8)+')';g.fillRect(0,0,W,H);
    g.strokeStyle=rgba('#ffd24a',S.flash);g.lineWidth=8*S.flash;g.beginPath();g.arc(CX,480,(1-S.flash)*560,0,7);g.stroke()}
}
function frame(now){
  S.raf=0;if(!S.running)return;
  const raw=Math.min(100,now-S.last);S.last=now;S.acc+=raw;
  if(S.acc>=33){const dt=Math.min(.06,S.acc/1000);S.acc=0;S.t+=dt;try{if(S.rec)draw(dt)}catch(e){console.error('Hero',e)}}
  S.raf=requestAnimationFrame(frame);
}
function start(){if(S.running||!S.cv)return;S.running=true;S.last=performance.now();S.raf=requestAnimationFrame(frame)}
function stop(){S.running=false;if(S.raf)cancelAnimationFrame(S.raf);S.raf=0}

/* ---------- портрет для рамки аватара ---------- */
function makePortrait(){
  const c=mk(300,300),g=c.getContext('2d'),{T,D,f}=S.rec;
  const bq=g.createRadialGradient(150,120,10,150,150,230);bq.addColorStop(0,rgba(T.accent,.55));bq.addColorStop(1,'#0c0a08');g.fillStyle=bq;g.fillRect(0,0,300,300);
  g.drawImage(S.rec.fig,CX-150,70,300,300,0,0,300,300);
  const sp=newHead(f,D.hs,1);paintHead(sp,f,T,.01,0);
  g.drawImage(sp.c,D.hx+sp.bx*sp.hs-(CX-150),D.hy+sp.by*sp.hs-70,sp.bw*sp.hs,sp.bh*sp.hs);
  return c;
}
function drawPortrait(ctx,size){
  if(!S.rec)return;if(!S.portrait)S.portrait=makePortrait();
  ctx.clearRect(0,0,size,size);ctx.drawImage(S.portrait,0,0,size,size);
}

/* ---------- миниатюра любой ступени (для экрана «Путь бойца») ---------- */
function renderTier(tier,seed,w,h){
  const {T,D,f,fig}=buildFigure(tier,seed),c=mk(w,h),g=c.getContext('2d');
  const bg=getBg(T.bg),k=Math.max(w/W,h/H);g.drawImage(bg,(w-W*k)/2,(h-H*k)/2,W*k,H*k);
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,0,w,h);
  const sc=h*.93/760,ox=w/2-CX*sc,oy=h*.04-96*sc;
  blob(g,w/2,FLOOR*sc+oy+4,w*.36,h*.03,[0,0,0],.6);
  g.save();g.translate(ox,oy);g.scale(sc,sc);g.drawImage(fig,0,0);
  const sp=newHead(f,D.hs,Math.max(.3,sc*1.4));paintHead(sp,f,T,.01,0);g.drawImage(sp.c,D.hx+sp.bx*sp.hs,D.hy+sp.by*sp.hs,sp.bw*sp.hs,sp.bh*sp.hs);g.restore();
  return c;
}
window.Hero={TIERS,tierOf,mount,setPlayer,start,stop,drawPortrait,renderTier,W,H,
  set onEvolve(fn){S.onEvolve=fn},get tier(){return S.tier},get running(){return S.running},get state(){return S}};
})();
