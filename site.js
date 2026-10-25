(()=>{
const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;

// nav
const nav=$('#nav'),tg=$('#navToggle'),hd=$('header');
tg.addEventListener('click',()=>{const o=nav.classList.toggle('open');tg.setAttribute('aria-expanded',o)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open'))tg.click()});
const sc=()=>hd.classList.toggle('scrolled',scrollY>8);sc();addEventListener('scroll',sc,{passive:true});

// lens cursor (mouse devices only)
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  const L=document.createElement('div');L.className='lens';L.setAttribute('aria-hidden','true');document.body.append(L);
  document.documentElement.classList.add('has-lens');
  let tx=0,ty=0,cx=0,cy=0,on=false;
  addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;if(!on){on=true;cx=tx;cy=ty;L.classList.add('on')}});
  document.addEventListener('mouseleave',()=>{on=false;L.classList.remove('on')});
  document.addEventListener('pointerover',e=>L.classList.toggle('hov',!!e.target.closest('a,button,[role=button],[role=checkbox]')));
  (function f(){cx+=(tx-cx)*(rm?1:.22);cy+=(ty-cy)*(rm?1:.22);L.style.transform=`translate3d(${cx}px,${cy}px,0)`;requestAnimationFrame(f)})();
}

// card spotlight
$$('.card').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}));

// hero network field
const hero=$('.hero');
if(hero){
  const c=document.createElement('canvas');c.setAttribute('aria-hidden','true');hero.prepend(c);
  const x=c.getContext('2d');let W,H,pts=[],m={x:-999,y:-999},run=true;
  const size=()=>{const D=Math.min(devicePixelRatio||1,2);W=hero.clientWidth;H=hero.clientHeight;c.width=W*D;c.height=H*D;x.setTransform(D,0,0,D,0,0);
    pts=Array.from({length:Math.min(Math.round(W*H/15000),90)},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25}))};
  const line=(a,b,s,al)=>{x.strokeStyle=`rgba(${s},${al})`;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()};
  const draw=()=>{x.clearRect(0,0,W,H);
    pts.forEach((p,i)=>{
      if(!rm){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1}
      x.fillStyle='rgba(120,190,255,.6)';x.beginPath();x.arc(p.x,p.y,1.6,0,6.283);x.fill();
      for(let j=i+1;j<pts.length;j++){const q=pts[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<120)line(p,q,'0,162,255',.24*(1-d/120))}
      const d=Math.hypot(p.x-m.x,p.y-m.y);if(d<170)line(p,m,'45,226,196',.75*(1-d/170));
    });
    if(run&&!rm)requestAnimationFrame(draw)};
  size();draw();
  addEventListener('resize',()=>{size();if(rm)draw()});
  addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();m.x=e.clientX-r.left;m.y=e.clientY-r.top});
  new IntersectionObserver(([e])=>{const v=e.isIntersecting;if(v&&!run&&!rm){run=true;draw()}run=v}).observe(hero);
}

// countdown
const clock=$('#clock');
if(clock){
  const T=new Date('2026-11-14T09:00:00').getTime(),els=['d','h','m','s'].map(u=>$(`[data-u=${u}]`,clock));
  const tick=()=>{const t=T-Date.now();
    if(t<=0){clock.className='clock live';clock.textContent='ROUND 2 IS  LIVE, SEAL TEAM SIX';return true}
    [Math.floor(t/864e5),Math.floor(t%864e5/36e5),Math.floor(t%36e5/6e4),Math.floor(t%6e4/1e3)].forEach((n,i)=>{
      const s=String(n).padStart(2,'0'),el=els[i];
      if(el.textContent!==s){el.textContent=s;if(!rm){el.classList.remove('tick');void el.offsetWidth;el.classList.add('tick')}}});
    return false};
  if(!tick()){const id=setInterval(()=>{if(tick())clearInterval(id)},1000)}
}

// checklists: tap to check off, progress saved on this device; commands copy on tap
const cl=$('.cl');
if(cl){
  const key='cp-checklist:'+location.pathname;
  const qc=$$('.cl>li').find(li=>/quick commands/i.test(li.firstElementChild.textContent));
  if(qc)$('ol',qc).classList.add('cmds');
  let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  const tasks=$$('.cl ol:not(.cmds)>li'),fill=$('#cl-fill'),txt=$('#cl-txt');
  const upd=()=>{const n=tasks.filter(t=>t.classList.contains('done')).length;
    fill.style.width=n/tasks.length*100+'%';txt.textContent=`${n} of ${tasks.length} done`;
    try{localStorage.setItem(key,JSON.stringify(tasks.map(t=>+t.classList.contains('done'))))}catch{}};
  const act=(li,fn)=>{li.tabIndex=0;li.addEventListener('click',fn);li.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})};
  tasks.forEach((li,i)=>{li.setAttribute('role','checkbox');li.classList.toggle('done',!!saved[i]);li.setAttribute('aria-checked',!!saved[i]);
    act(li,()=>{const d=li.classList.toggle('done');li.setAttribute('aria-checked',d);upd()})});
  $$('.cmds li').forEach(li=>{li.setAttribute('role','button');li.title='Click to copy';
    act(li,()=>{navigator.clipboard?.writeText(li.textContent.trim());li.classList.add('copied');setTimeout(()=>li.classList.remove('copied'),1200)})});
  $('#cl-reset').addEventListener('click',()=>{tasks.forEach(t=>{t.classList.remove('done');t.setAttribute('aria-checked','false')});upd()});
  upd();
}
})();
