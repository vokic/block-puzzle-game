// ════════════════════════════════════════
//  CORE UTILS  (depends on graphics.js + config.js being loaded first)
// ════════════════════════════════════════
function mkRng(s){s=s||1;return()=>{s=Math.imul(s,48271)%2147483647;return(s&0x7fffffff)/2147483647};}
function ky(r,c){return r+','+c}
function decompose(tc,np,seed){
  const rng=mkRng(seed),dirs=[[0,1],[0,-1],[1,0],[-1,0]];
  const rem=new Set(tc.map(([r,c])=>ky(r,c)));
  const n=Math.min(np,tc.length),bs=Math.floor(tc.length/n),ex=tc.length-bs*n;
  const ra=[...rem];for(let i=ra.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ra[i],ra[j]]=[ra[j],ra[i]];}
  const seeds=[ra[0]];
  while(seeds.length<n){let bk=null,bd=-1;for(const k of ra){if(seeds.includes(k))continue;const[r,c]=k.split(',').map(Number);let md=1e9;for(const sk of seeds){const[sr,sc]=sk.split(',').map(Number);md=Math.min(md,Math.abs(r-sr)+Math.abs(c-sc));}if(md>bd){bd=md;bk=k;}}if(bk)seeds.push(bk);else break;}
  const pcs=seeds.map(s=>{rem.delete(s);return new Set([s]);});
  const sz=seeds.map((_,i)=>bs+(i<ex?1:0));
  let ch=true;while(ch&&rem.size>0){ch=false;for(let i=0;i<pcs.length;i++){if(pcs[i].size>=sz[i])continue;const fr=[];for(const k of pcs[i]){const[r,c]=k.split(',').map(Number);for(const[dr,dc]of dirs){const nk=ky(r+dr,c+dc);if(rem.has(nk))fr.push(nk);}}if(!fr.length)continue;const p=fr[Math.floor(rng()*fr.length)];pcs[i].add(p);rem.delete(p);ch=true;}}
  for(const k of rem){const[r,c]=k.split(',').map(Number);let bi=0,bd=1e9;for(let i=0;i<pcs.length;i++)for(const pk of pcs[i]){const[pr,pc]=pk.split(',').map(Number);const d=Math.abs(r-pr)+Math.abs(c-pc);if(d<bd){bd=d;bi=i;}}pcs[bi].add(k);}
  return pcs.map((ps,i)=>{const cells=[...ps].map(k=>k.split(',').map(Number));const mr=Math.min(...cells.map(c=>c[0])),mc=Math.min(...cells.map(c=>c[1]));return{cells,normalized:cells.map(([r,c])=>[r-mr,c-mc]),colorIdx:i};});
}

// Difficulty for progression levels: 1-3=easy,4-6=med,7-10=hard
function levelDiff(idx){return idx<3?0:idx<6?1:2}
function levelPcs(numCells,diff){
  if(diff===0)return Math.max(3,Math.ceil(numCells/7));
  if(diff===1)return Math.max(5,Math.ceil(numCells/3.8));
  return Math.min(14,Math.max(8,Math.ceil(numCells/2.5)));
}
function levelHints(diff){return diff+1}

// ════════════════════════════════════════
//  STATE
// ════════════════════════════════════════
const LS_PROGRESS='bp-progress',LS_THEME='bp-theme',LS_SOUND='bp-sound',LS_NAME='bp-name',LS_BEST='bp-best';
function loadStored(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}}
function saveStored(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// ════════════════════════════════════════
//  LEADERBOARD — Supabase REST (no SDK, no server)
// ════════════════════════════════════════
const SB_URL=(window.SUPABASE_URL||'').replace(/\/+$/,'');
const SB_KEY=window.SUPABASE_ANON_KEY||'';
const Leaderboard={
  enabled:!!(SB_URL&&SB_KEY),
  async top(category,limit,shape){
    let url=`${SB_URL}/rest/v1/leaderboard?category=eq.${encodeURIComponent(category)}`;
    if(shape)url+=`&shape=eq.${encodeURIComponent(shape)}`;
    url+=`&select=name,message,moves,shape,created_at&order=moves.asc,created_at.asc&limit=${limit||10}`;
    const r=await fetch(url,{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}});
    if(!r.ok)throw new Error('fetch '+r.status);
    return r.json();
  },
  async submit(entry){
    const r=await fetch(`${SB_URL}/rest/v1/leaderboard`,{
      method:'POST',
      headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify(entry)
    });
    if(!r.ok)throw new Error('submit '+r.status+' '+await r.text());
  }
};

// ════════════════════════════════════════
//  SOUND — Web Audio synth (no files, offline)
// ════════════════════════════════════════
const Sound=(()=>{
  let ctx=null,enabled=loadStored(LS_SOUND,true),unlocked=false;
  function ac(){if(!ctx){try{ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(ctx.state==='suspended')ctx.resume();return ctx;}
  function tone(freq,dur,type,vol,when){
    const c=ac();if(!c)return;const t=c.currentTime+(when||0);
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.03);
  }
  return{
    get enabled(){return enabled},
    init(){ac();},
    unlock(){const c=ac();if(!c)return;if(!unlocked){try{const o=c.createOscillator(),g=c.createGain();g.gain.value=.00001;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.03);}catch(e){}unlocked=true;}},
    toggle(){enabled=!enabled;saveStored(LS_SOUND,enabled);if(enabled){ac();this.place();}return enabled;},
    pick(){if(enabled)tone(440,.07,'triangle',.10);},
    place(){if(!enabled)return;tone(523.25,.09,'triangle',.16);tone(784,.11,'sine',.10,.04);},
    bad(){if(!enabled)return;tone(160,.16,'sawtooth',.12);tone(120,.18,'sawtooth',.07,.02);},
    hint(){if(!enabled)return;tone(880,.12,'sine',.12);tone(1174.7,.14,'sine',.09,.09);},
    win(){if(!enabled)return;[523.25,659.25,784,1046.5].forEach((f,i)=>tone(f,.45,'triangle',.15,i*.11));tone(1568,.5,'sine',.08,.46);}
  };
})();
// Unlock/resume audio on user gestures (mobile autoplay policy needs this; not {once} so it
// re-resumes if the OS suspends the context after backgrounding).
['pointerdown','touchend','click'].forEach(ev=>window.addEventListener(ev,()=>Sound.unlock(),{passive:true}));

// ════════════════════════════════════════
//  NATIVE-FEEL GUARDS — block zoom & pull-to-refresh
// ════════════════════════════════════════
// iOS Safari ignores user-scalable=no, so kill pinch/gesture zoom manually
['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault()));
// Block multi-touch (pinch) zoom
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
// Block double-tap-to-zoom
let _lastTap=0;
document.addEventListener('touchend',e=>{const now=Date.now();if(now-_lastTap<=320)e.preventDefault();_lastTap=now;},{passive:false});
let S={
  screen:'menu',mode:null, // 'category'|'quick'
  catIdx:0,levelIdx:0,diffIdx:0,
  board:{},placed:{},pieces:[],targetCells:[],targetSet:new Set(),
  gridW:0,gridH:0,won:false,moves:0,
  completed:loadStored(LS_PROGRESS,{}), // "catIdx-levelIdx" => true
  hintsLeft:1,activeHint:null,hintTimer:null,
  dragging:null,dragOff:{x:0,y:0},_hover:null,
};

let bestScores=loadStored(LS_BEST,{}); // "catIdx-levelIdx" => best (fewest) moves so far
let lbLimit=1;                          // leaderboard size currently shown (1 per level, 10 at category end)
let lbShape=null;                       // shape filter for the current panel (per-level) or null (whole category)
function getCompleted(ci,li){return S.completed[ci+'-'+li]||false}
function setCompleted(ci,li){S.completed[ci+'-'+li]=true;saveStored(LS_PROGRESS,S.completed)}
function catProgress(ci){let n=0;for(let i=0;i<10;i++)if(getCompleted(ci,i))n++;return n;}
function nextUnlocked(ci){for(let i=0;i<10;i++)if(!getCompleted(ci,i))return i;return 10;}

// ════════════════════════════════════════
//  MENU
// ════════════════════════════════════════
let menuCatIdx = 0;

function buildMenu(){
  const el=document.getElementById('menu');
  el.innerHTML=`
    <div style="font-size:13px;font-weight:900;letter-spacing:5px;color:var(--accent);opacity:.6">PUZZLE</div>
    <h1>BLOCK PUZZLE</h1>
    <p class="sub">Build shapes, piece by piece</p>
    <div class="carousel" id="carousel"></div>
    <div class="divider"></div>
    <div class="quick-play">
      <div class="qp-title">Quick Play</div>
      <div class="qp-btns">
        <button class="qp-btn" data-d="0"><div class="ql" style="color:#4cc9f0">Easy</div><div class="qi">Chill</div></button>
        <button class="qp-btn" data-d="1"><div class="ql" style="color:#ffd54f">Medium</div><div class="qi">Think</div></button>
        <button class="qp-btn" data-d="2"><div class="ql" style="color:#ff3d7f">Hard</div><div class="qi">Grind</div></button>
      </div>
    </div>`;
  el.querySelectorAll('.qp-btn').forEach(b=>b.addEventListener('click',()=>startQuick(+b.dataset.d)));
  renderCarousel(0);
  gsap.from('#menu h1',{opacity:0,y:-15,duration:.4,ease:'power3.out'});
  gsap.from('.carousel',{opacity:0,scale:.9,duration:.5,delay:.1,ease:'back.out(1.4)'});
  gsap.from('.quick-play',{opacity:0,y:15,duration:.4,ease:'power3.out',delay:.25});
}

function renderCarousel(dir){
  // dir: 0=init, 1=right, -1=left
  const cat=CATEGORIES[menuCatIdx];
  const prog=catProgress(menuCatIdx);
  const next=nextUnlocked(menuCatIdx);
  const nextShape=next<10?cat.shapes[next]:cat.shapes[9];
  const allDone=prog===10;

  const c=document.getElementById('carousel');
  c.innerHTML=`
    <div class="carousel-cat-name" id="car-name" style="color:${cat.color}">${cat.name}</div>
    <div class="carousel-icon" style="color:${cat.color}">${ICONS[cat.icon]}</div>
    <div class="carousel-row">
      <button class="carousel-arrow" id="car-left">
        <span class="material-icons">chevron_left</span>
      </button>
      <div class="carousel-preview" id="car-preview" style="border-color:${cat.color}30">
        ${buildThumbSVG(nextShape,172,cat.color)}
      </div>
      <button class="carousel-arrow" id="car-right">
        <span class="material-icons">chevron_right</span>
      </button>
    </div>
    <div class="carousel-progress" style="color:${cat.color}">${prog}<span style="font-size:16px;color:var(--sub);font-weight:600"> / 10</span></div>
    <div class="carousel-levels" id="car-levels"></div>
    <button class="play-btn" id="car-play" style="background:${cat.color};color:#fff">
      ${allDone?'Replay':'Continue — Level '+(next+1)}
    </button>`;

  // Level dots
  const lc=document.getElementById('car-levels');
  cat.shapes.forEach((sh,li)=>{
    const done=getCompleted(menuCatIdx,li);
    const cur=li===next;
    const locked=li>next;
    const dot=document.createElement('div');
    dot.className='carousel-dot'+(done?' done':'')+(cur?' current':'')+(locked?' locked':'');
    if(done)dot.innerHTML='<span class="material-icons">check</span>';
    else dot.textContent=li+1;
    if(!locked)dot.addEventListener('click',()=>startCategory(menuCatIdx,li));
    lc.appendChild(dot);
  });

  // Bind arrows
  document.getElementById('car-left').addEventListener('click',()=>{
    menuCatIdx=(menuCatIdx-1+CATEGORIES.length)%CATEGORIES.length;
    animateCarousel(-1);
  });
  document.getElementById('car-right').addEventListener('click',()=>{
    menuCatIdx=(menuCatIdx+1)%CATEGORIES.length;
    animateCarousel(1);
  });
  // Play button
  document.getElementById('car-play').addEventListener('click',()=>{
    const ni=nextUnlocked(menuCatIdx);
    startCategory(menuCatIdx,Math.min(ni,9));
  });

  // Entry animation
  if(dir!==0){
    const xFrom=dir*80;
    gsap.fromTo('#car-name',{x:xFrom,opacity:0},{x:0,opacity:1,duration:.3,ease:'power3.out'});
    gsap.fromTo('.carousel-icon',{opacity:0,scale:.5},{opacity:1,scale:1,duration:.3,ease:'back.out(2)'});
    gsap.fromTo('#car-preview',{x:xFrom,opacity:0,scale:.85},{x:0,opacity:1,scale:1,duration:.35,ease:'back.out(1.3)'});
    gsap.fromTo('.carousel-progress',{opacity:0},{opacity:1,duration:.25,delay:.08,ease:'power2.out'});
    gsap.fromTo('#car-levels',{opacity:0,y:8},{opacity:1,y:0,duration:.25,delay:.1,ease:'power2.out'});
    gsap.fromTo('#car-play',{opacity:0,y:6},{opacity:1,y:0,duration:.25,delay:.15,ease:'power2.out'});
  }
}

function animateCarousel(dir){
  gsap.to('#car-name',{x:dir*-40,opacity:0,duration:.15,ease:'power2.in'});
  gsap.to('.carousel-icon',{opacity:0,scale:.5,duration:.12,ease:'power2.in'});
  gsap.to('#car-preview',{x:dir*-60,opacity:0,scale:.9,duration:.2,ease:'power2.in',onComplete:()=>renderCarousel(dir)});
  gsap.to('.carousel-progress',{opacity:0,duration:.1});
  gsap.to('#car-levels',{opacity:0,duration:.1});
  gsap.to('#car-play',{opacity:0,duration:.1});
}

// Swipe support
let swipeX=0;
document.addEventListener('pointerdown',e=>{
  if(e.target.closest('.carousel'))swipeX=e.clientX;
});
document.addEventListener('pointerup',e=>{
  if(!e.target.closest('.carousel')||!swipeX)return;
  const dx=e.clientX-swipeX;swipeX=0;
  if(Math.abs(dx)<30)return;
  if(dx<0){menuCatIdx=(menuCatIdx+1)%CATEGORIES.length;animateCarousel(1);}
  else{menuCatIdx=(menuCatIdx-1+CATEGORIES.length)%CATEGORIES.length;animateCarousel(-1);}
});

// ════════════════════════════════════════
//  START GAME
// ════════════════════════════════════════
function startCategory(ci,li){
  S.mode='category';S.catIdx=ci;S.levelIdx=li;
  const diff=levelDiff(li);S.diffIdx=diff;
  initLevel(ci,li,diff);
  transitionToGame();
}
let lastQuick=null;
function startQuick(diff){
  S.mode='quick';S.diffIdx=diff;
  let ci,li;
  do{
    ci=Math.floor(Math.random()*CATEGORIES.length);
    li=Math.floor(Math.random()*CATEGORIES[ci].shapes.length);
  }while(lastQuick===ci+'-'+li);
  lastQuick=ci+'-'+li;
  S.catIdx=ci;S.levelIdx=li;
  initLevel(ci,li,diff);
  transitionToGame();
}
function initLevel(ci,li,diff){
  const shape=CATEGORIES[ci].shapes[li];
  const{cells:tc,gridW,gridH}=parseShape(shape.s);
  const np=levelPcs(tc.length,diff);
  const seed=(ci+1)*1000+(li+1)*100+(diff+1)*10+42;
  S.pieces=decompose(tc,np,seed);
  S.targetCells=tc;S.targetSet=new Set(tc.map(([r,c])=>ky(r,c)));
  S.gridW=gridW;S.gridH=gridH;
  S.board={};S.placed={};S.won=false;S.moves=0;
  S.hintsLeft=levelHints(diff);S.activeHint=null;
  if(S.hintTimer)clearTimeout(S.hintTimer);
  S.dragging=null;S._hover=null;
}
function transitionToGame(){
  document.body.classList.add('playing'); // hide menu-only corner buttons (game has its own header)
  gsap.to('#menu',{opacity:0,y:-20,duration:.3,ease:'power2.in',onComplete:()=>{
    document.getElementById('menu').style.display='none';
    document.getElementById('game').style.display='flex';
    gsap.set('#game',{opacity:0,y:20});
    gsap.to('#game',{opacity:1,y:0,duration:.35,ease:'power3.out'});
    buildGame();
  }});
}

// ════════════════════════════════════════
//  BUILD GAME UI
// ════════════════════════════════════════
function buildGame(){
  const cat=CATEGORIES[S.catIdx],shape=cat.shapes[S.levelIdx];
  document.getElementById('game-info').innerHTML=`<span>${shape.name}</span>`;
  const diffLabels=['Easy','Medium','Hard'];
  const diffColors=['#4cc9f0','#ffd54f','#ff3d7f'];
  document.getElementById('level-badge').innerHTML=
    S.mode==='category'
      ?`${cat.name} — Level ${S.levelIdx+1}/10 <span style="color:${diffColors[S.diffIdx]}">(${diffLabels[S.diffIdx]})</span>`
      :`Quick Play — <span style="color:${diffColors[S.diffIdx]}">${diffLabels[S.diffIdx]}</span>`;
  updateHintBtn();
  document.getElementById('hint-btn').onclick=useHint;
  buildBoard();buildTray();updateProgress();
  document.getElementById('win-bar').style.display='none';
  document.getElementById('score-panel').style.display='none';
  document.getElementById('win-menu').onclick=goToMenu;
  document.getElementById('win-retry').onclick=resetLevel;
  document.getElementById('win-next').onclick=()=>{
    if(S.mode==='category'&&S.levelIdx<9)goNextLevel();
    else goToMenu();
  };
  gsap.set('#tray',{opacity:1,y:0});
  buildNextPreview();
}

function buildNextPreview(){
  const np=document.getElementById('next-preview');
  if(S.mode!=='category'){np.style.display='none';return;}
  const nextI=S.levelIdx+1;
  if(nextI>=10){np.style.display='none';return;}
  np.style.display='flex';
  const nextShape=CATEGORIES[S.catIdx].shapes[nextI];
  np.innerHTML=`<span class="next-label">Next</span>
    <span class="next-thumb">${buildThumbSVG(nextShape,42)}</span>
    <span class="next-name">${nextShape.name}</span>`;
  gsap.from(np,{opacity:0,y:8,duration:.3,delay:.3,ease:'power3.out'});
}

let cellMap=new Map();
function buildBoard(){
  const wrap=document.getElementById('board-wrap');
  wrap.style.width=(S.gridW*STEP+20)+'px';wrap.style.height=(S.gridH*STEP+20)+'px';
  wrap.innerHTML='';cellMap=new Map();
  // Faint category-colored silhouette under the cells — shows through empty cells, hidden by placed pieces
  const silColor=CATEGORIES[S.catIdx].color;
  let sil=`<svg width="${S.gridW*STEP}" height="${S.gridH*STEP}" style="position:absolute;left:10px;top:10px;pointer-events:none">`;
  S.targetCells.forEach(([r,c])=>{sil+=`<rect x="${c*STEP}" y="${r*STEP}" width="${CELL}" height="${CELL}" rx="5" fill="${silColor}" opacity=".09"/>`;});
  wrap.innerHTML=sil+'</svg>';
  S.targetCells.forEach(([r,c],i)=>{
    const cell=document.createElement('div');cell.className='cell';
    cell.dataset.r=r;cell.dataset.c=c;
    cell.style.left=(c*STEP+10)+'px';cell.style.top=(r*STEP+10)+'px';
    cell.innerHTML='<div class="shine"></div>';
    wrap.appendChild(cell);cellMap.set(ky(r,c),cell);
    gsap.set(cell,{scale:0,opacity:0});
    gsap.to(cell,{scale:1,opacity:1,duration:.35,delay:.04+i*.01,ease:'back.out(2.5)'});
    cell.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      const k=ky(r,c);
      if(S.board[k]!==undefined&&!S.won)startDrag(S.board[k],e);
    });
  });
}

function buildTray(){
  const c=document.getElementById('tray-pieces');c.innerHTML='';
  const up=S.pieces.map((p,i)=>({...p,idx:i})).filter((_,i)=>!S.placed[i]&&S.dragging!==i);
  updateTrayCount();
  if(!up.length){c.innerHTML='<span style="color:var(--sub);font-size:11px;font-style:italic;width:100%;text-align:center">All placed!</span>';return;}
  up.forEach((p,i)=>{
    const col=PALETTE[p.colorIdx%PALETTE.length];
    const el=document.createElement('div');el.className='tray-piece';el.dataset.idx=p.idx;
    el.innerHTML=buildPieceSVG(p.normalized,col,TRAY_CELL);
    c.appendChild(el);
    gsap.set(el,{scale:0,opacity:0,rotation:gsap.utils.random(-12,12)});
    gsap.to(el,{scale:1,opacity:1,rotation:0,duration:.45,delay:.08+i*.03,ease:'elastic.out(1,.6)'});
    el.addEventListener('pointerenter',()=>{if(S.dragging!==null)return;gsap.to(el,{scale:1.1,duration:.15});el.style.boxShadow=`0 4px 16px ${col}44`;});
    el.addEventListener('pointerleave',()=>{gsap.to(el,{scale:1,duration:.15});el.style.boxShadow='none';});
    el.addEventListener('pointerdown',e=>startDrag(p.idx,e));
  });
}

// ════════════════════════════════════════
//  DRAG & DROP
// ════════════════════════════════════════
function startDrag(idx,e){
  if(S.won)return;e.preventDefault();e.stopPropagation();clearHint();Sound.pick();
  const cx=e.clientX,cy=e.clientY;
  if(S.placed[idx])removePiece(idx);
  const piece=S.pieces[idx],nr=piece.normalized;
  const mxR=Math.max(...nr.map(c=>c[0])),mxC=Math.max(...nr.map(c=>c[1]));
  const pw=(mxC+1)*STEP,ph=(mxR+1)*STEP;
  S.dragging=idx;
  S.dragOff={x:pw/2,y:ph/2+70};
  const ghost=document.getElementById('drag-ghost');
  const col=PALETTE[piece.colorIdx%PALETTE.length];
  ghost.innerHTML=buildPieceSVG(piece.normalized,col,CELL);
  ghost.style.display='block';
  ghost.style.left=(cx-S.dragOff.x)+'px';ghost.style.top=(cy-S.dragOff.y)+'px';
  gsap.set(ghost,{scale:1,x:0,y:0,rotation:0,opacity:1});
  gsap.to(ghost,{opacity:.92,scale:1.05,duration:.2,ease:'back.out(2)'});
  ghost.style.filter=`drop-shadow(0 14px 30px rgba(0,0,0,.55)) drop-shadow(0 0 12px ${col}55)`;
  document.body.style.touchAction='none';document.body.style.overflow='hidden';
  buildTray();
  window.addEventListener('pointermove',onMove,{passive:false});
  window.addEventListener('pointerup',onUp);
  window.addEventListener('pointercancel',onUp);
}
function onMove(e){
  if(S.dragging===null)return;e.preventDefault();
  const cx=e.clientX,cy=e.clientY;
  const ghost=document.getElementById('drag-ghost');
  const fx=cx-S.dragOff.x,fy=cy-S.dragOff.y;
  const wrap=document.getElementById('board-wrap'),rect=wrap.getBoundingClientRect();
  const gc=Math.round((fx-rect.left-10)/STEP),gr=Math.round((fy-rect.top-10)/STEP);
  const over=gc>=-1&&gc<=S.gridW&&gr>=-1&&gr<=S.gridH;
  if(over){
    const sx=rect.left+10+gc*STEP,sy=rect.top+10+gr*STEP;
    const bl=.3;
    gsap.to(ghost,{left:fx+(sx-fx)*bl,top:fy+(sy-fy)*bl,duration:.12,ease:'power1.out',overwrite:true});
  }else{
    gsap.to(ghost,{left:fx,top:fy,duration:.08,ease:'none',overwrite:true});
  }
  S._hover={r:gr,c:gc};
  const piece=S.pieces[S.dragging],valid=canPlace(piece.normalized,gr,gc,S.dragging);
  clearHover();
  piece.normalized.forEach(([r,c])=>{const cell=getCell(r+gr,c+gc);if(cell){cell.classList.add(valid?'hover-good':'hover-bad');hoverCells.push(cell);}});
}
function onUp(){
  window.removeEventListener('pointermove',onMove);
  window.removeEventListener('pointerup',onUp);
  window.removeEventListener('pointercancel',onUp);
  if(S.dragging===null)return;
  const idx=S.dragging,piece=S.pieces[idx],h=S._hover;
  const ghost=document.getElementById('drag-ghost');
  gsap.killTweensOf(ghost);
  if(h&&canPlace(piece.normalized,h.r,h.c,idx)){
    placePiece(idx,h.r,h.c);
    gsap.to(ghost,{opacity:0,scale:.5,duration:.2,ease:'power2.in',onComplete:()=>{ghost.style.display='none';}});
  }else{
    if(h)shakeBoard();
    gsap.to(ghost,{opacity:0,y:'+=30',scale:.6,duration:.25,ease:'power2.in',onComplete:()=>{ghost.style.display='none';}});
  }
  S.dragging=null;S._hover=null;clearHover();
  document.body.style.touchAction='';document.body.style.overflow='';
  buildTray();
}
let hoverCells=[];
function clearHover(){hoverCells.forEach(c=>c.classList.remove('hover-good','hover-bad'));hoverCells=[];}
function canPlace(cells,bR,bC,excl){for(const[r,c]of cells){const k=ky(r+bR,c+bC);if(!S.targetSet.has(k))return false;if(S.board[k]!==undefined&&S.board[k]!==excl)return false;}return true;}
function getCell(r,c){return cellMap.get(ky(r,c));}

function placePiece(idx,bR,bC){
  clearHint();Sound.place();if(navigator.vibrate)navigator.vibrate(9);S.moves++;
  const piece=S.pieces[idx],col=PALETTE[piece.colorIdx%PALETTE.length];
  Object.keys(S.board).forEach(k=>{if(S.board[k]===idx)delete S.board[k];});
  piece.normalized.forEach(([r,c])=>{S.board[ky(r+bR,c+bC)]=idx;});
  S.placed[idx]=true;
  piece.normalized.forEach(([r,c],i)=>{
    const cell=getCell(r+bR,c+bC);if(!cell)return;
    gsap.killTweensOf(cell);
    cell.style.background=col;cell.style.border='none';cell.classList.add('filled');
    gsap.fromTo(cell,{scale:1.25},{scale:1,duration:.35,delay:i*.02,ease:'elastic.out(1.2,.4)'});
    gsap.fromTo(cell,{boxShadow:`0 0 16px ${col}88`},{boxShadow:`0 0 0px ${col}00`,duration:.5,delay:i*.02});
  });
  updateProgress();buildTray();checkWin();
}
function removePiece(idx){
  const removed=[];
  Object.keys(S.board).forEach(k=>{if(S.board[k]===idx){removed.push(k);delete S.board[k];}});
  delete S.placed[idx];
  removed.forEach(k=>{const[r,c]=k.split(',').map(Number);const cell=getCell(r,c);if(!cell)return;
    cell.style.background='var(--cell-bg)';cell.style.border='1px solid var(--cell-border)';cell.classList.remove('filled');
    gsap.fromTo(cell,{scale:.8,opacity:.5},{scale:1,opacity:1,duration:.25,ease:'back.out(2)'});
  });
  updateProgress();
}
function shakeBoard(){Sound.bad();if(navigator.vibrate)navigator.vibrate(22);gsap.to('#board-wrap',{x:-5,duration:.05,yoyo:true,repeat:5,ease:'power1.inOut',onComplete:()=>gsap.set('#board-wrap',{x:0})});}

// ════════════════════════════════════════
//  HINT
// ════════════════════════════════════════
function useHint(){
  if(S.hintsLeft<=0||S.won)return;
  const up=S.pieces.map((_,i)=>i).filter(i=>!S.placed[i]);if(!up.length)return;
  const pick=up[Math.floor(Math.random()*up.length)];
  S.hintsLeft--;S.activeHint=pick;updateHintBtn();Sound.hint();
  const piece=S.pieces[pick],col=PALETTE[piece.colorIdx%PALETTE.length];
  piece.cells.forEach(([r,c])=>{const cell=getCell(r,c);if(!cell||cell.classList.contains('filled'))return;
    cell.style.border=`2px solid ${col}88`;
    gsap.to(cell,{background:`${col}30`,duration:.5,repeat:-1,yoyo:true,ease:'sine.inOut',overwrite:'auto'});
    gsap.fromTo(cell,{scale:.92},{scale:1.03,duration:.6,repeat:-1,yoyo:true,ease:'sine.inOut'});
  });
  const tp=document.querySelector(`.tray-piece[data-idx="${pick}"]`);
  if(tp){tp.classList.add('hinted');tp.style.borderColor=col+'88';tp.style.background=col+'15';
    gsap.to(tp,{scale:1.08,duration:.4,repeat:-1,yoyo:true,ease:'sine.inOut'});}
  if(S.hintTimer)clearTimeout(S.hintTimer);
  S.hintTimer=setTimeout(clearHint,3500);
}
function clearHint(){
  if(S.activeHint===null)return;
  const piece=S.pieces[S.activeHint];
  piece.cells.forEach(([r,c])=>{const cell=getCell(r,c);if(!cell||cell.classList.contains('filled'))return;
    gsap.killTweensOf(cell);cell.style.background='var(--cell-bg)';cell.style.border='1px solid var(--cell-border)';gsap.to(cell,{scale:1,duration:.2});});
  const tp=document.querySelector(`.tray-piece[data-idx="${S.activeHint}"]`);
  if(tp){gsap.killTweensOf(tp);tp.classList.remove('hinted');tp.style.borderColor='';tp.style.background='';gsap.to(tp,{scale:1,duration:.2});}
  S.activeHint=null;if(S.hintTimer){clearTimeout(S.hintTimer);S.hintTimer=null;}
}
function updateHintBtn(){document.getElementById('hint-count').textContent=S.hintsLeft;document.getElementById('hint-btn').disabled=S.hintsLeft<=0;}

// ════════════════════════════════════════
//  PROGRESS & WIN
// ════════════════════════════════════════
function updateProgress(){
  const tot=S.pieces.length,pl=Object.keys(S.placed).length;
  document.getElementById('move-count').textContent=S.moves+(S.moves===1?' move':' moves');
  document.getElementById('progress-fill').style.width=Math.round(pl/tot*100)+'%';
  const dc=['#4cc9f0','#ffd54f','#ff3d7f'];
  document.getElementById('progress-fill').style.background=S.won?'var(--green)':`linear-gradient(90deg,#4cc9f0,${dc[S.diffIdx]})`;
  updateTrayCount();
}
function updateTrayCount(){document.getElementById('tray-count').textContent=Object.keys(S.placed).length+'/'+S.pieces.length+' placed';}

function checkWin(){
  if(S.won)return;
  if(![...S.targetSet].every(k=>S.board[k]!==undefined)||!Object.keys(S.board).length)return;
  S.won=true;
  if(S.mode==='category')setCompleted(S.catIdx,S.levelIdx);
  celebrateWin();
}
function celebrateWin(){
  Sound.win();if(navigator.vibrate)navigator.vibrate([0,40,30,40,30,70]);
  document.querySelectorAll('.cell.filled').forEach((cell,i)=>{
    gsap.to(cell,{scale:1.12,duration:.18,delay:i*.012,ease:'power2.out',onComplete:()=>gsap.to(cell,{scale:1,duration:.4,ease:'elastic.out(1.2,.3)'})});
    gsap.fromTo(cell,{boxShadow:`0 0 0px ${cell.style.background}`},{boxShadow:`0 0 16px ${cell.style.background}`,duration:.3,delay:i*.012,yoyo:true,repeat:1});
  });
  spawnParticles(35);
  // Hide next arrow if last level or quick play
  const nextBtn=document.getElementById('win-next');
  nextBtn.style.display=(S.mode==='category'&&S.levelIdx<9)?'flex':'none';
  // Show bar after cell animation completes
  const delay=S.targetCells.length*.012+.4;
  setTimeout(()=>{
    const bar=document.getElementById('win-bar');
    bar.style.display='flex';
    const btns=[...bar.children].filter(b=>b.style.display!=='none');
    btns.forEach((b,i)=>{
      gsap.fromTo(b,{scale:0,opacity:0},{scale:1,opacity:1,duration:.3,delay:i*.06,ease:'back.out(2)'});
    });
    showScorePanel();
  },delay*1000);
  document.getElementById('next-preview').style.display='none';
  gsap.to('#tray',{opacity:0,y:15,duration:.25});
}
function spawnParticles(n){
  const wrap=document.getElementById('board-wrap'),rect=wrap.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  for(let i=0;i<n;i++){
    const p=document.createElement('div');p.className='particle';
    const sz=4+Math.random()*7;p.style.width=sz+'px';p.style.height=sz+'px';
    p.style.background=PALETTE[Math.floor(Math.random()*PALETTE.length)];
    p.style.left=cx+'px';p.style.top=cy+'px';document.body.appendChild(p);
    const a=(Math.PI*2*i)/n+gsap.utils.random(-.3,.3),d=gsap.utils.random(70,220);
    gsap.to(p,{x:Math.cos(a)*d,y:Math.sin(a)*d-gsap.utils.random(40,130),opacity:0,rotation:gsap.utils.random(-360,360),duration:gsap.utils.random(.7,1.4),delay:gsap.utils.random(0,.25),ease:'power2.out',onComplete:()=>p.remove()});
  }
}

// ════════════════════════════════════════
//  SCORE PANEL & LEADERBOARD
// ════════════════════════════════════════
// Flow:
//  • after each level  → ALWAYS show the #1 record for that shape; submit form only on a new best/record
//  • after last level of a category (category complete) → show category Top 10
async function showScorePanel(){
  const panel=document.getElementById('score-panel');
  panel.style.display='none';
  const cat=CATEGORIES[S.catIdx],shape=cat.shapes[S.levelIdx];

  // Personal best (local), per level
  const bk=S.catIdx+'-'+S.levelIdx;
  const prevBest=bestScores[bk];
  const isBest=prevBest===undefined||S.moves<prevBest;
  if(isBest){bestScores[bk]=S.moves;saveStored(LS_BEST,bestScores);}

  const categoryEnd=S.mode==='category'&&catProgress(S.catIdx)===10;
  lbLimit=categoryEnd?10:1;
  lbShape=categoryEnd?null:shape.name; // per level: rank by THIS shape; category end: whole category

  const list=document.getElementById('lb-list');
  const moveStr=`<b>${S.moves}</b> move${S.moves===1?'':'s'}`;

  if(!Leaderboard.enabled){
    if(!categoryEnd)return; // per-level shows nothing without a backend
    setScorePanel(cat.name+' — Top 10',`<b>${esc(cat.name)}</b> complete!`,false);
    list.innerHTML='<div class="lb-empty">Leaderboard not set up yet.</div>';
    revealScorePanel();return;
  }

  let rows;
  try{rows=await Leaderboard.top(cat.id,lbLimit,lbShape);}catch(e){rows=null;}

  if(categoryEnd){
    const inTop=!rows||rows.length<10||S.moves<rows[9].moves;
    setScorePanel(cat.name+' — Top 10',
      `${esc(cat.name)} complete! Solved <b>${esc(shape.name)}</b> in ${moveStr}`,
      isBest&&inTop&&!!rows);
    renderLbList(list,rows,null);
    revealScorePanel();return;
  }

  // Per-level: ALWAYS show who holds the best score for this level.
  // The submit form appears only on a new personal best or a new record (#1).
  if(rows===null){
    setScorePanel(shape.name+' — Best',`Solved <b>${esc(shape.name)}</b> in ${moveStr}`,false);
    renderLbList(list,null,null);
    revealScorePanel();return;
  }
  const isRecord=rows.length===0||S.moves<rows[0].moves;
  const msg=isRecord?`New record! <b>${esc(shape.name)}</b> in ${moveStr}`
    :isBest?`New best! <b>${esc(shape.name)}</b> in ${moveStr}`
    :`Solved <b>${esc(shape.name)}</b> in ${moveStr}`;
  setScorePanel(shape.name+' — Best',msg,isBest||isRecord);
  renderLbList(list,rows,null);
  revealScorePanel();
}
function setScorePanel(title,resultHTML,showForm){
  document.getElementById('lb-title').textContent=title;
  document.getElementById('score-result').innerHTML=resultHTML;
  const form=document.getElementById('score-form');
  if(showForm){
    form.style.display='flex';
    const nameI=document.getElementById('score-name'),msgI=document.getElementById('score-msg'),btn=document.getElementById('score-submit');
    nameI.value=loadStored(LS_NAME,'')||'';msgI.value='';
    btn.disabled=false;btn.textContent='Submit score';btn.onclick=submitScore;
  }else form.style.display='none';
}
function revealScorePanel(){
  const panel=document.getElementById('score-panel');
  panel.style.display='flex';
  gsap.from(panel,{opacity:0,y:12,duration:.35,delay:.05,ease:'power3.out'});
}
async function submitScore(){
  const nameI=document.getElementById('score-name'),msgI=document.getElementById('score-msg'),btn=document.getElementById('score-submit');
  const name=(nameI.value||'').trim().slice(0,24)||'Anon';
  const message=(msgI.value||'').trim().slice(0,80);
  saveStored(LS_NAME,name);
  btn.disabled=true;btn.textContent='Submitting…';
  const cat=CATEGORIES[S.catIdx],shape=cat.shapes[S.levelIdx];
  try{
    await Leaderboard.submit({category:cat.id,shape:shape.name,level:S.levelIdx,difficulty:S.diffIdx,mode:S.mode,moves:S.moves,name,message:message||null});
    document.getElementById('score-form').style.display='none';
    const rows=await Leaderboard.top(cat.id,lbLimit,lbShape);
    renderLbList(document.getElementById('lb-list'),rows,{name,moves:S.moves,message});
  }catch(e){
    btn.disabled=false;btn.textContent='Retry';
    document.getElementById('lb-list').innerHTML='<div class="lb-empty">Could not submit — check your connection.</div>';
  }
}
function renderLbList(list,rows,me){
  if(!rows){list.innerHTML='<div class="lb-empty">Could not load leaderboard.</div>';return;}
  if(!rows.length){list.innerHTML='<div class="lb-empty">Be the first to make the board!</div>';return;}
  list.innerHTML=rows.map((r,i)=>renderLbRow(r,i,me)).join('');
}
function renderLbRow(r,i,me){
  const mine=me&&r.name===me.name&&r.moves===me.moves&&(r.message||'')===(me.message||'');
  return `<div class="lb-row${mine?' me':''}">`
    +`<div class="lb-rank${i<3?' top':''}">${i+1}</div>`
    +`<div class="lb-info"><div class="lb-name">${esc(r.name)}</div>`
    +`<div class="lb-sub">`
    +(r.shape?`<span class="lb-shape">${esc(r.shape)}</span>`:'')
    +(r.message?`<span class="lb-msg-txt">${esc(r.message)}</span>`:'')
    +`</div></div>`
    +`<div class="lb-moves">${r.moves}</div></div>`;
}

// ════════════════════════════════════════
//  LEADERBOARD OVERLAY (top button — browse any category)
// ════════════════════════════════════════
let lboCatIdx=0;
function openLeaderboard(){
  lboCatIdx=menuCatIdx||0;
  document.getElementById('lb-overlay').classList.add('show');
  buildLbTabs();loadOverlayBoard();
  gsap.fromTo('.lbo-card',{opacity:0,scale:.95,y:10},{opacity:1,scale:1,y:0,duration:.3,ease:'power3.out'});
}
function closeLeaderboard(){
  gsap.to('.lbo-card',{opacity:0,scale:.97,duration:.2,ease:'power2.in',onComplete:()=>document.getElementById('lb-overlay').classList.remove('show')});
}
function buildLbTabs(){
  const t=document.getElementById('lbo-tabs');t.innerHTML='';
  CATEGORIES.forEach((cat,i)=>{
    const b=document.createElement('button');
    b.className='lbo-tab'+(i===lboCatIdx?' active':'');
    b.textContent=cat.name;
    if(i===lboCatIdx)b.style.background=cat.color;
    b.onclick=()=>{lboCatIdx=i;buildLbTabs();loadOverlayBoard();};
    t.appendChild(b);
  });
}
async function loadOverlayBoard(){
  const list=document.getElementById('lbo-list');
  if(!Leaderboard.enabled){list.innerHTML='<div class="lb-empty">Leaderboard not set up yet — add your Supabase keys in config.js.</div>';return;}
  list.innerHTML='<div class="lb-empty">Loading…</div>';
  const cat=CATEGORIES[lboCatIdx];
  try{
    const rows=await Leaderboard.top(cat.id);
    if(!rows.length){list.innerHTML='<div class="lb-empty">No scores yet — be the first!</div>';return;}
    list.innerHTML=rows.map((r,i)=>renderLbRow(r,i,null)).join('');
  }catch(e){
    list.innerHTML='<div class="lb-empty">Could not load leaderboard.</div>';
  }
}
document.getElementById('lb-btn').addEventListener('click',openLeaderboard);
document.getElementById('lbo-close').addEventListener('click',closeLeaderboard);
document.getElementById('lb-overlay').addEventListener('pointerdown',e=>{if(e.target.id==='lb-overlay')closeLeaderboard();});

// ════════════════════════════════════════
//  NAV
// ════════════════════════════════════════
function goToMenu(){
  clearHint();
  document.body.classList.remove('playing');
  gsap.to('#game',{opacity:0,y:20,duration:.25,ease:'power2.in',onComplete:()=>{
    document.getElementById('game').style.display='none';
    document.getElementById('menu').style.display='flex';
    gsap.set('#menu',{opacity:0,y:-15});gsap.to('#menu',{opacity:1,y:0,duration:.3,ease:'power3.out'});
    buildMenu();
  }});
}
function goNextLevel(){
  clearHint();
  const nextI=S.levelIdx+1;
  gsap.to('.cell',{scale:0,opacity:0,duration:.2,stagger:.006,ease:'power2.in',onComplete:()=>{
    startCategory(S.catIdx,nextI);
  }});
}
function resetLevel(){
  clearHint();
  gsap.to('.cell.filled',{scale:0,rotation:gsap.utils.random(-15,15),duration:.2,stagger:.008,ease:'power2.in',onComplete:()=>{
    S.board={};S.placed={};S.won=false;S.moves=0;
    S.hintsLeft=levelHints(S.diffIdx);S.activeHint=null;S.dragging=null;
    buildGame();
  }});
}

document.getElementById('btn-back').addEventListener('click',goToMenu);
document.getElementById('btn-reset').addEventListener('click',resetLevel);

// Theme
let isDark=true;
function setTheme(dark){
  isDark=dark;
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  document.getElementById('theme-toggle').innerHTML='<span class="material-icons'+(dark?'':' light')+'">'+(dark?'dark_mode':'light_mode')+'</span>';
  saveStored(LS_THEME,dark?'dark':'light');
}
document.getElementById('theme-toggle').addEventListener('click',()=>{
  setTheme(!isDark);
  gsap.fromTo('#theme-toggle',{rotation:-180,scale:.7},{rotation:0,scale:1,duration:.4,ease:'back.out(2)'});
});

// Sound toggle
function updateSoundBtn(){
  const b=document.getElementById('sound-toggle');
  b.classList.toggle('muted',!Sound.enabled);
  b.innerHTML='<span class="material-icons">'+(Sound.enabled?'volume_up':'volume_off')+'</span>';
}
document.getElementById('sound-toggle').addEventListener('click',()=>{
  Sound.toggle();updateSoundBtn();
  gsap.fromTo('#sound-toggle',{scale:.7},{scale:1,duration:.35,ease:'back.out(2)'});
});
updateSoundBtn();

// Splash / how-to-play
const LS_INTRO='bp-intro';
function showSplash(){
  const s=document.getElementById('splash');s.classList.add('show');
  gsap.set(s,{opacity:1});
  // Reset any stale inline styles from a previous open, then animate the whole
  // card as one unit so no child (e.g. the Let's Play button) can get stuck hidden.
  gsap.killTweensOf(['.splash-card','.splash-step']);
  gsap.set(['.splash-card','.splash-step'],{clearProps:'opacity,transform'});
  if(document.hidden)return; // tab backgrounded: skip entrance anim, content stays visible
  gsap.fromTo('.splash-card',{opacity:0,y:14},{opacity:1,y:0,duration:.4,ease:'power3.out'});
  gsap.from('.splash-step',{x:-14,duration:.35,stagger:.06,delay:.08,ease:'power3.out'}); // x only — never hides
}
function hideSplash(){
  Sound.init();
  const s=document.getElementById('splash');
  gsap.to(s,{opacity:0,duration:.3,ease:'power2.in',onComplete:()=>{s.classList.remove('show');gsap.set(s,{opacity:1});}});
  saveStored(LS_INTRO,true);
}
document.getElementById('splash-play').addEventListener('click',hideSplash);
document.getElementById('help-btn').addEventListener('click',showSplash);

setTheme(loadStored(LS_THEME,'dark')!=='light');
buildMenu();

// Flow on open:  splash.png  ➜  how-to-play (first visit only)  ➜  menu.
// The launch image shows first; only after it fades do the instructions appear.
// Gracefully skips the image if splash.png is missing.
(function(){
  const firstVisit=!loadStored(LS_INTRO,false);
  let done=false;
  const reveal=()=>{if(done)return;done=true;if(firstVisit)showSplash();};
  const l=document.getElementById('launch'),img=l&&document.getElementById('launch-img');
  if(!l||!img){reveal();return;}
  const kill=()=>{if(l.parentNode)l.remove();};
  const fade=()=>{l.classList.add('hide');setTimeout(kill,550);reveal();};
  if(img.complete&&img.naturalWidth===0){kill();reveal();return;} // image already failed
  img.addEventListener('error',()=>{kill();reveal();});           // no splash.png → straight to instructions
  l.addEventListener('pointerdown',()=>{Sound.init();fade();});   // stays until the screen is tapped
})();
