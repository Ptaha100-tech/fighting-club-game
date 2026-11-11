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
 {name:'Гопник',min:5,build:.22,hunch:.6,dirt:.4,bruise:.18,sweat:.2,hair:'cap',hat:'#1b1b20',hairCol:'#2a2118',beard:.4,gray:false,gap:true,
  top:'track',pants:'track',shoes:'sneaker',hands:'bare',pose:'swagger',prop:'chain',bg:'yard',accent:'#3f74c4'},
 {name:'Уличный боец',min:12,build:.42,hunch:.35,dirt:.2,bruise:.14,sweat:.18,hair:'buzz',hairCol:'#2a2118',beard:.5,gray:false,gap:false,
  top:'tank',pants:'jeans',shoes:'boots',hands:'wraps',pose:'swagger',prop:null,bg:'gym',accent:'#d06a2e'},
 {name:'Подпольный боксёр',min:22,build:.6,hunch:.2,dirt:.1,bruise:.2,sweat:.2,hair:'buzz',hairCol:'#1c1512',beard:.3,gray:false,gap:false,
  top:'bare',pants:'box',shoes:'boxboots',hands:'boxglove',pose:'ready',prop:'towel',bg:'ring',accent:'#c42a30'},
 {name:'Любитель ММА',min:34,build:.76,hunch:.1,dirt:0,bruise:.06,sweat:.12,hair:'buzz',hairCol:'#1c1512',beard:.22,gray:false,gap:false,
  top:'bare',pants:'mma',shoes:'bare',hands:'mmaglove',pose:'ready',prop:null,bg:'cage',accent:'#2f86e0'},
 {name:'Профи ММА',min:48,build:.88,hunch:0,dirt:0,bruise:.03,sweat:.1,hair:'buzz',hairCol:'#1c1512',beard:.18,gray:false,gap:false,
  top:'bare',pants:'mmapro',shoes:'bare',hands:'mmaglove',pose:'ready',prop:'tattoo',bg:'cage',accent:'#2fb585'},
 {name:'Претендент UFC',min:64,build:.95,hunch:0,dirt:0,bruise:0,sweat:.1,hair:'buzz',hairCol:'#141010',beard:.15,gray:false,gap:false,
  top:'robe',pants:'mmagold',shoes:'bare',hands:'mmaglove',pose:'ready',prop:'tattoo',bg:'arena',accent:'#e0a030'},
 {name:'Чемпион UFC',min:80,build:1,hunch:0,dirt:0,bruise:0,sweat:.08,hair:'buzz',hairCol:'#141010',beard:.12,gray:false,gap:false,
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
