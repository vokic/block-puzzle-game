// ════════════════════════════════════════
//  GRAPHICS — icons, shape data, palette & SVG rendering
//  (loaded before game.js; everything here is global)
// ════════════════════════════════════════

// Category icons (Material Icons ligatures)
const ICONS = {
  animals: `<span class="material-icons">pets</span>`,
  food: `<span class="material-icons">restaurant</span>`,
  vehicles: `<span class="material-icons">directions_car</span>`,
  structures: `<span class="material-icons">account_balance</span>`,
  shapes: `<span class="material-icons">category</span>`,
};

// 5 categories × 10 shapes  (# = filled cell, . = empty)
const CATEGORIES = [
  { id:'animals', name:'Animals', icon:'animals', color:'#06d6a0', shapes:[
    {name:'Fish',s:['..#..','..###','.####','#####','.####','..###','..#..']},
    {name:'Bird',s:['..#...','.###..','######','.####.','..###.','...#..']},
    {name:'Cat',s:['#...#','##.##','#####','#####','.###.','.#.#.']},
    {name:'Dog',s:['.##....','####...','.#####.','.#####.','..####.','..#.##.']},
    {name:'Bunny',s:['.#.#','.#.#','####','####','.##.','.##.','##..','.#..']},
    {name:'Turtle',s:['..###..','..####.','.######','########','.######.','..#.#..']},
    {name:'Duck',s:['.##...','####..','..####','..####','.####.','..##..']},
    {name:'Whale',s:['..####..','.######.','########','########','.######.','.####.#.']},
    {name:'Snake',s:['##......','.##.....','..###...','...####.','.....###','......##']},
    {name:'Elephant',s:['.####..','######.','#######','.#####.','.#.####','.#..#.#']},
  ]},
  { id:'food', name:'Food', icon:'food', color:'#ff6b6b', shapes:[
    {name:'Apple',s:['..#.','.###','####','####','.##.']},
    {name:'Cherry',s:['.#.#.','.###.','##.##','##.##','.#.#.']},
    {name:'Banana',s:['..#','.##','.#.','##.','#..']},
    {name:'Ice Cream',s:['.###.','#####','#####','.###.','..#..','..#..']},
    {name:'Pizza',s:['....#','...##','..###','.####','#####']},
    {name:'Donut',s:['.###.','##.##','#...#','##.##','.###.']},
    {name:'Burger',s:['.####.','######','.####.','######','.####.']},
    {name:'Cake',s:['..##..','..##..','.####.','######','######','######']},
    {name:'Cupcake',s:['.####.','######','######','.####.','..##..','.####.']},
    {name:'Candy',s:['#.....','##.....','.#####','..#####','.....##','.....#']},
  ]},
  { id:'vehicles', name:'Vehicles', icon:'vehicles', color:'#4dabf7', shapes:[
    {name:'Car',s:['..###..','#######','.#..#.']},
    {name:'Bus',s:['########','########','#.#..#.#']},
    {name:'Boat',s:['..#....','..#.#..','########','.######.','..####..']},
    {name:'Plane',s:['....#...','...###..','########','...###..','...#.#..']},
    {name:'Rocket',s:['..#..','.###.','.###.','.###.','#####','.#.#.']},
    {name:'Train',s:['..##.....','#########','#########','.#..#..#.']},
    {name:'Helicopter',s:['########','...##...','...#####','...##...','.##..##.']},
    {name:'Bicycle',s:['..#.....','..####..','.##..##.','##....##','.#....#.']},
    {name:'Truck',s:['.....###','########','########','.#..#.#.']},
    {name:'Submarine',s:['...##....','..#####..','.########','##########','.########.']},
  ]},
  { id:'structures', name:'Structures', icon:'structures', color:'#ffd43b', shapes:[
    {name:'Pyramid',s:['...#...','..###..','.#####.','#######']},
    {name:'House',s:['..##..','.####.','######','.####.','.####.','.#..#.']},
    {name:'Castle',s:['#.#.#','#####','.###.','.###.','.###.','#####']},
    {name:'Church',s:['..#..','..#..','.###.','#####','#####','#####','.#.#.']},
    {name:'Lighthouse',s:['..#..','.###.','..#..','.###.','.###.','####.','#####']},
    {name:'Windmill',s:['..#..','.###.','##.##','.###.','..#..','..#..','.###.']},
    {name:'Bridge',s:['#########','.#.....#.','.#######.','.#.#.#.#.']},
    {name:'Pagoda',s:['...#...','..###..','.#####.','..###..','.#####.','#######','..###..']},
    {name:'Tower',s:['..#..','..#..','.###.','..#..','..#..','.###.','#####','#####']},
    {name:'Arch',s:['.#####.','##...##','##...##','##...##','##...##']},
  ]},
  { id:'shapes', name:'Basic Shapes', icon:'shapes', color:'#cc5de8', shapes:[
    {name:'Square',s:['#####','#####','#####','#####','#####']},
    {name:'Triangle',s:['....#','...##','..###','.####','#####']},
    {name:'Diamond',s:['..#..','.###.','#####','.###.','..#..']},
    {name:'Heart',s:['.##.##.','#######','#######','.#####.','..###..','...#...']},
    {name:'Cross',s:['.###.','.###.','#####','#####','#####','.###.','.###.']},
    {name:'Arrow',s:['...#...','..###..','.#####.','#######','..###..','..###..','..###..']},
    {name:'Star',s:['...#...','..###..','#######','.#####.','.##.##.','##...##']},
    {name:'Hexagon',s:['.####.','######','######','######','.####.']},
    {name:'Moon',s:['.###','####','###.','####','.###']},
    {name:'Lightning',s:['..##','..#.','.###','.#..','##..','#...']},
  ]},
];

// Piece colors + board dimensions
const PALETTE=["#f72585","#7209b7","#3a86ff","#4cc9f0","#06d6a0","#f77f00","#e63946","#ffbe0b","#8338ec","#00b4d8","#ef476f","#118ab2","#ffd166","#fb5607","#9b5de5"];
const CELL=32,GAP=2,STEP=34,TRAY_CELL=22;

// Shape string-grid → {cells, gridW, gridH}
function parseShape(shape){
  const cells=[],h=shape.length,w=Math.max(...shape.map(r=>r.length));
  for(let r=0;r<h;r++)for(let c=0;c<shape[r].length;c++)if(shape[r][c]==='#')cells.push([r,c]);
  return{cells,gridW:w,gridH:h};
}

// Render a piece as inline SVG (rounded colored blocks + shine)
function buildPieceSVG(cells,color,size){
  const mr=Math.min(...cells.map(c=>c[0])),mc=Math.min(...cells.map(c=>c[1]));
  const xr=Math.max(...cells.map(c=>c[0])),xc=Math.max(...cells.map(c=>c[1]));
  const w=(xc-mc+1)*(size+GAP),h=(xr-mr+1)*(size+GAP);
  let s=`<svg width="${w}" height="${h}" style="display:block">`;
  cells.forEach(([r,c])=>{const x=(c-mc)*(size+GAP),y=(r-mr)*(size+GAP),rx=size>28?5:4;s+=`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="${color}" stroke="rgba(0,0,0,.18)" stroke-width="1"/><rect x="${x+2}" y="${y+2}" width="${size-4}" height="${size*.35}" rx="3" fill="rgba(255,255,255,.22)"/>`;});
  return s+'</svg>';
}

// Render a faint shape thumbnail (menu preview / next preview)
function buildThumbSVG(shape,size,color){
  const{cells,gridW,gridH}=parseShape(shape.s);
  const cs=size/Math.max(gridW,gridH);
  const fill=color?color+'55':'rgba(100,100,120,.25)';
  const stroke=color?color+'33':'none';
  let s=`<svg width="${gridW*cs}" height="${gridH*cs}" style="display:block">`;
  cells.forEach(([r,c])=>{s+=`<rect x="${c*cs}" y="${r*cs}" width="${cs*.88}" height="${cs*.88}" rx="${cs>6?3:1.5}" fill="${fill}" stroke="${stroke}" stroke-width=".5"/>`;});
  return s+'</svg>';
}

