const grid = document.getElementById("grid");
const info = document.getElementById("info");
const stats = document.getElementById("stats");
const leaderboardEl = document.getElementById("leaderboard");

const rows = 20, cols = 20;
let cells = [];

let start = {r:0,c:0};
let end = {r:19,c:19};

let startTime;

/* ===== MUSIC ===== */
let audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
audio.loop = true;
audio.volume = 0.2;
let musicOn = false;

function toggleMusic(){
    if(musicOn){
        audio.pause();
    } else {
        audio.play();
    }
    musicOn = !musicOn;
}

/* ===== SOUND EFFECT ===== */
function beep(freq=600,duration=50){
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    osc.frequency.value=freq;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(()=>osc.stop(),duration);
}

/* ===== GRID ===== */
function createGrid(){
    grid.innerHTML="";
    cells=[];

    for(let r=0;r<rows;r++){
        let row=[];
        for(let c=0;c<cols;c++){
            let div=document.createElement("div");
            div.classList.add("cell");

            div.onclick=()=>{
                if(!div.classList.contains("start")&&!div.classList.contains("end")){
                    div.classList.toggle("wall");
                }
            };

            grid.appendChild(div);
            row.push(div);
        }
        cells.push(row);
    }

    cells[start.r][start.c].classList.add("start");
    cells[end.r][end.c].classList.add("end");
}

function reset(){
    createGrid();
}

/* ===== PERFECT MAZE (DFS BACKTRACKING) ===== */
function generateMaze(){
    createGrid();

    let maze = Array.from({length:rows},()=>Array(cols).fill(1));

    function carve(r,c){
        maze[r][c]=0;
        let dirs=[[2,0],[-2,0],[0,2],[0,-2]];
        dirs.sort(()=>Math.random()-0.5);

        for(let [dr,dc] of dirs){
            let nr=r+dr,nc=c+dc;
            if(nr>=0&&nc>=0&&nr<rows&&nc<cols && maze[nr][nc]){
                maze[r+dr/2][c+dc/2]=0;
                carve(nr,nc);
            }
        }
    }

    carve(0,0);

    for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
            if(maze[r][c]===1 &&
               !(r===start.r&&c===start.c) &&
               !(r===end.r&&c===end.c)){
                cells[r][c].classList.add("wall");
            }
        }
    }
}

/* ===== DRAW PATH ===== */
async function drawPath(parent){
    let path=[];
    let cur=end;

    while(cur && !(cur.r===start.r && cur.c===start.c)){
        path.push(cur);
        cur=parent[cur.r][cur.c];
    }

    path.reverse();
    let prev=start;

    for(let step of path){
        cells[prev.r][prev.c].classList.remove("puppy");
        cells[step.r][step.c].classList.add("puppy","path");
        prev=step;

        beep();
        await new Promise(r=>setTimeout(r,40));
    }

    let time=Date.now()-startTime;
    stats.innerText=`Time: ${time} ms | Path: ${path.length}`;
    updateLeaderboard(time);

    info.innerText+=" 🎉 Done!";
}

/* ===== BFS ===== */
async function bfs(){
    info.innerText="BFS → Shortest Path";
    startTime=Date.now();

    let q=[start];
    let visited=Array.from({length:rows},()=>Array(cols).fill(false));
    let parent=Array.from({length:rows},()=>Array(cols).fill(null));

    visited[start.r][start.c]=true;

    while(q.length){
        let cur=q.shift();
        if(cur.r===end.r && cur.c===end.c) break;

        for(let [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
            let nr=cur.r+dr,nc=cur.c+dc;

            if(nr>=0&&nc>=0&&nr<rows&&nc<cols &&
               !visited[nr][nc] &&
               !cells[nr][nc].classList.contains("wall")){

                visited[nr][nc]=true;
                parent[nr][nc]=cur;
                q.push({r:nr,c:nc});

                cells[nr][nc].classList.add("visited");
                await new Promise(r=>setTimeout(r,20));
            }
        }
    }
    await drawPath(parent);
}

/* ===== DFS (FIXED) ===== */
async function dfs(){
    info.innerText="DFS → Not Optimal";
    startTime=Date.now();

    let visited=Array.from({length:rows},()=>Array(cols).fill(false));
    let parent=Array.from({length:rows},()=>Array(cols).fill(null));

    async function go(r,c){
        if(r<0||c<0||r>=rows||c>=cols) return false;
        if(visited[r][c]) return false;
        if(cells[r][c].classList.contains("wall")) return false;

        visited[r][c]=true;
        cells[r][c].classList.add("visited");
        await new Promise(r=>setTimeout(r,25));

        if(r===end.r && c===end.c) return true;

        for(let [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
            let nr=r+dr,nc=c+dc;

            if(nr>=0&&nc>=0&&nr<rows&&nc<cols &&
               !visited[nr][nc] &&
               !cells[nr][nc].classList.contains("wall")){

                parent[nr][nc]={r,c};
                if(await go(nr,nc)) return true;
            }
        }
        return false;
    }

    await go(start.r,start.c);
    await drawPath(parent);
}

/* ===== A* ===== */
async function astar(){
    info.innerText="A* → Best";
    startTime=Date.now();

    let open=[start];
    let g=Array.from({length:rows},()=>Array(cols).fill(Infinity));
    let f=Array.from({length:rows},()=>Array(cols).fill(Infinity));
    let parent=Array.from({length:rows},()=>Array(cols).fill(null));

    const h=(a,b)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c);

    g[start.r][start.c]=0;
    f[start.r][start.c]=h(start,end);

    while(open.length){
        open.sort((a,b)=>f[a.r][a.c]-f[b.r][b.c]);
        let cur=open.shift();

        if(cur.r===end.r && cur.c===end.c) break;

        cells[cur.r][cur.c].classList.add("visited");
        await new Promise(r=>setTimeout(r,20));

        for(let [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
            let nr=cur.r+dr,nc=cur.c+dc;

            if(nr<0||nc<0||nr>=rows||nc>=cols||
               cells[nr][nc].classList.contains("wall")) continue;

            let temp=g[cur.r][cur.c]+1;
            if(temp<g[nr][nc]){
                parent[nr][nc]=cur;
                g[nr][nc]=temp;
                f[nr][nc]=temp+h({r:nr,c:nc},end);
                open.push({r:nr,c:nc});
            }
        }
    }
    await drawPath(parent);
}

/* ===== LEADERBOARD ===== */
function updateLeaderboard(time){
    let scores=JSON.parse(localStorage.getItem("scores")||"[]");
    scores.push(time);
    scores.sort((a,b)=>a-b);
    scores=scores.slice(0,5);
    localStorage.setItem("scores",JSON.stringify(scores));
    renderLeaderboard();
}

function renderLeaderboard(){
    let scores=JSON.parse(localStorage.getItem("scores")||"[]");
    leaderboardEl.innerHTML="";
    scores.forEach(s=>{
        let li=document.createElement("li");
        li.innerText=s+" ms";
        leaderboardEl.appendChild(li);
    });
}

function startAlgorithm(type){
    if(type==="bfs") bfs();
    else if(type==="dfs") dfs();
    else astar();
}

createGrid();
renderLeaderboard();