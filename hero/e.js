
/* ---------- голова: лицо по сиду, подстроенное под ступень ---------- */
function tierT(tier,gear){return gear?Object.assign({},TIERS[tier],gear):TIERS[tier]}
function heroFighter(seed,tier,gear){
  const T=tierT(tier,gear),f=makeFighter(seed),r=rng((seed^0x2f6e2b1)|0);
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
function buildFigure(tier,seed,gear){
  const T=tierT(tier,gear),f=heroFighter(seed,tier,gear),fig=mk(W,H),g=fig.getContext('2d');
  const D=drawFigure(g,T,f);lightPass(g,D,T);
  return{T,f,D,fig};
}

/* ---------- сцена главного меню ---------- */
const S={cv:null,g:null,Q:.8,running:false,raf:0,last:0,acc:0,t:0,rec:null,head:null,tier:-1,seed:0,level:1,bg:null,parts:[],flash:0,portrait:null,gear:null,gsig:'',onEvolve:null,vapor:[]};
function build(){
  S.rec=buildFigure(S.tier,S.seed,S.gear);S.head=newHead(S.rec.f,S.rec.D.hs,S.Q);paintHead(S.head,S.rec.f,S.rec.T,S.t,0);
  S.bg=getBg(S.rec.T.bg);S.portrait=null;
}
function mount(cv,opts){
  S.cv=cv;S.Q=(opts&&opts.quality)||(((navigator.hardwareConcurrency||4)<=4)?.62:.8);
  cv.width=Math.round(W*S.Q);cv.height=Math.round(H*S.Q);S.g=cv.getContext('2d');
  for(let i=0;i<34;i++)S.parts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*6,vy:-6-Math.random()*10,r:.8+Math.random()*2.2,a:.15+Math.random()*.4,ph:Math.random()*6});
}
function setPlayer(p){
  const tier=tierOf(p.level||1),seed=p.seed|0||1,had=!!S.rec,gs=JSON.stringify(p.gear||null),changed=!had||tier!==S.tier||seed!==S.seed||gs!==S.gsig;S.gear=p.gear||null;S.gsig=gs;
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
function renderTier(tier,seed,w,h,gear){
  const {T,D,f,fig}=buildFigure(tier,seed,gear),c=mk(w,h),g=c.getContext('2d');
  const bg=getBg(T.bg),k=Math.max(w/W,h/H);g.drawImage(bg,(w-W*k)/2,(h-H*k)/2,W*k,H*k);
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,0,w,h);
  const sc=h*.93/760,ox=w/2-CX*sc,oy=h*.04-96*sc;
  blob(g,w/2,FLOOR*sc+oy+4,w*.36,h*.03,[0,0,0],.6);
  g.save();g.translate(ox,oy);g.scale(sc,sc);g.drawImage(fig,0,0);
  const sp=newHead(f,D.hs,Math.max(.3,sc*1.4));paintHead(sp,f,T,.01,0);g.drawImage(sp.c,D.hx+sp.bx*sp.hs,D.hy+sp.by*sp.hs,sp.bw*sp.hs,sp.bh*sp.hs);g.restore();
  return c;
}
const TOPLOOK={coat:{shirt:'#4a4f3a'},track:{shirt:'#233b73'},tank:{shirt:'#d9d5c9',tank:1},bare:{shirt:'#000',tank:1,bare:1},robe:{shirt:'#7a1424'},club:{shirt:'#1f5a3a'}};
const GLOVEMAP={bare:'bare',wraps:'wraps',boxglove:'box',mmaglove:'mma',mma:'mma',goldglove:'gold'};
function fighterFor(level,seed,gear,clubText){
  const tier=tierOf(level||1),f=heroFighter(seed|0||1,tier,gear),T=tierT(tier,gear),tl=TOPLOOK[T.top]||TOPLOOK.coat;
  f.shirt=(gear&&gear.shirtCol)||tl.shirt;f.tank=!!tl.tank;f.bare=!!tl.bare;f.glove=GLOVEMAP[T.hands]||'wraps';
  f.clubText=gear&&gear.club?clubText:'';
  return f;
}
window.Hero={fighterFor,TIERS,tierOf,mount,setPlayer,start,stop,drawPortrait,renderTier,W,H,
  set onEvolve(fn){S.onEvolve=fn},get tier(){return S.tier},get running(){return S.running},get state(){return S}};
})();
