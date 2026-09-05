/* hits the real server over http, no mocks */
const { spawn } = require("child_process");
const PORT = 3977, BASE = "http://localhost:" + PORT;
let pass=0, fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':JSON.stringify(x).slice(0,200));} };
const get=(p)=>fetch(BASE+p).then(async r=>({s:r.status,b:await r.json().catch(()=>({}))}));
const post=(p,body)=>fetch(BASE+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async r=>({s:r.status,b:await r.json().catch(()=>({}))}));

const srv = spawn('node',['server.js'],{env:{...process.env,PORT:String(PORT)},cwd:__dirname,stdio:'ignore'});
setTimeout(main, 1200);

async function main(){
 try{
  let r=await get('/api/health');
  ok('health ok', r.s===200 && r.b.ok===true, r.b);

  r=await post('/api/plans',{people:5,budget:700,area:'Indiranagar',plans:[
    {title:'Toit then Corner House',perHead:640,stops:['Toit','Corner House']},
    {title:'Cubbon then chai',perHead:190,stops:['Cubbon Park']},
    {title:'VV Puram crawl',perHead:230,stops:['VV Puram']}]});
  ok('ballot created', r.s===201 && /^[A-Z0-9]{6}$/.test(r.b.id), r.b);
  const id=r.b.id;

  r=await post('/api/plans',{plans:[]});
  ok('empty ballot rejected', r.s===400);
  r=await post('/api/plans',{plans:[1,2,3,4,5,6]});
  ok('more than five rejected', r.s===400);

  r=await get('/api/plans/'+id);
  ok('ballot readable', r.s===200 && r.b.plans.length===3);
  ok('people stored', r.b.people===5);
  r=await get('/api/plans/'+id.toLowerCase());
  ok('lowercase id works', r.s===200);

  await post('/api/plans/'+id+'/votes',{name:'Prajwal',picks:[0,1]});
  await post('/api/plans/'+id+'/votes',{name:'Pratheeksha',picks:[1]});
  await post('/api/plans/'+id+'/votes',{name:'Masoom',picks:[1,2]});
  r=await get('/api/plans/'+id+'/votes');
  ok('three voters', r.b.voters.length===3, r.b.voters);
  ok('scores right', JSON.stringify(r.b.scores)==='[1,3,1]', r.b.scores);
  ok('winner is plan 1', r.b.winner===1);
  ok('no tiebreak needed', r.b.brokeTie===false);

  r=await post('/api/plans/'+id+'/votes',{name:'PRAJWAL',picks:[2]});
  ok('re-voting replaces, case insensitive', r.b.voters===3, r.b);
  r=await get('/api/plans/'+id+'/votes');
  ok('score updated after re-vote', JSON.stringify(r.b.scores)==='[0,2,2]', r.b.scores);
  ok('tie broken by price', r.b.brokeTie===true && r.b.winner===1, {w:r.b.winner,t:r.b.brokeTie});

  r=await post('/api/plans/'+id+'/votes',{picks:[0]});
  ok('name required', r.s===400);
  r=await post('/api/plans/'+id+'/votes',{name:'Junk',picks:[99,-3,'x',1]});
  ok('bad picks accepted but filtered', r.s===201);
  r=await get('/api/plans/'+id+'/votes');
  ok('out of range picks ignored', r.b.scores[1]===3 && r.b.scores.length===3, r.b.scores);

  r=await post('/api/plans/NOPE99/votes',{name:'X',picks:[0]});
  ok('vote on missing ballot 404s', r.s===404);
  r=await get('/api/plans/NOPE99');
  ok('missing ballot 404s', r.s===404);
  r=await get('/api/nonsense');
  ok('unknown api 404s', r.s===404);

  const page=await fetch(BASE+'/');
  const body=await page.text();
  ok('serves the app at root', page.status===200 && /Katte/.test(body));

  console.log('\n'+pass+' passed, '+fail+' failed');
 }catch(e){ console.log('CRASH', e.message); fail++; }
 srv.kill();
 process.exit(fail?1:0);
}
