/* hammer the generator and the ballot codec the way a busy day would */
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const core=html.slice(html.indexOf('var AREAS = {'), html.indexOf('var memStore = {};'));
const m={};
new Function('e', core+'Object.assign(e,{AREAS,SPOTS,generate,planBill,stopCost,tally,parseCodes,makeCode,encodeShare,decodeShare,rehydrate});')(m);

let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':String(x).slice(0,200));} };

// 1. sustained generation
const areas=['any'].concat(Object.keys(m.AREAS));
const t0=Date.now();
let runs=0,plans=0,over=0,zero=0,bad=0,empty=0,maxMs=0;
for(let i=0;i<20000;i++){
  const o={
    budget:[150,200,250,300,400,500,650,800,1000,1500,2000][i%11],
    area:areas[i%areas.length],
    n:2+(i%19),
    when:['day','evening','night'][i%3],
    veg:i%7===0, sober:i%11===0, indoor:i%13===0, single:i%17===0, travel:i%5===0
  };
  const s=Date.now();
  const out=m.generate(o, i*2654435761 % 2147483647);
  const ms=Date.now()-s; if(ms>maxMs) maxMs=ms;
  runs++;
  if(!out.plans.length){ empty++; continue; }
  out.plans.forEach(p=>{
    plans++;
    if(o.budget<2000 && p.bill.perHead>o.budget) over++;
    if(!(p.bill.perHead>0)) zero++;
    if(!p.title || !p.stops.length || !isFinite(p.bill.group)) bad++;
    if(o.single && p.stops.length!==1) bad++;
    p.stops.forEach(st=>{
      if(st.min>o.n||st.max<o.n) bad++;
      if(st.when.indexOf(o.when)===-1) bad++;
      if(o.veg&&!st.veg) bad++;
      if(o.sober&&st.booze) bad++;
      if(o.indoor&&!st.indoor) bad++;
    });
    const zones=new Set(p.stops.map(x=>x.area).filter(a=>a!=='*'));
    if(zones.size>1) bad++;
  });
}
const dt=Date.now()-t0;
console.log(`  ${runs} rolls -> ${plans} plans in ${dt}ms  (${(runs/(dt/1000)).toFixed(0)} rolls/sec, slowest ${maxMs}ms)`);
ok('20k rolls, none over budget', over===0, over);
ok('20k rolls, nothing free', zero===0, zero);
ok('20k rolls, no broken plan', bad===0, bad);
/* a few combinations are genuinely impossible, such as a return auto fare plus an
   indoor veg sit down on 150 rupees. those must be rare and must explain themselves. */
ok('20k rolls, empties vanishingly rare', empty <= 5, empty+' of '+runs);
ok('fast enough for any traffic', runs/(dt/1000) > 200, (runs/(dt/1000)).toFixed(0)+'/sec');

// 2. share links under load
let sbad=0;
for(let i=0;i<5000;i++){
  const ids=m.SPOTS.slice(i%40, i%40+3).map(s=>s.id);
  const st={n:2+(i%18), b:150+(i%1850), t:i%2, p:[ids, [m.SPOTS[i%m.SPOTS.length].id]]};
  const back=m.decodeShare(m.encodeShare(st));
  if(JSON.stringify(back)!==JSON.stringify(st)) sbad++;
  const re=m.rehydrate(st);
  if(!re || !re.plans.length || !(re.plans[0].bill.perHead>0)) sbad++;
}
ok('5k share links round trip', sbad===0, sbad);

// 3. malformed input must never throw
const junk=['', '#', 'null', '{}', 'a'.repeat(5000), '%%%', 'eyJhIjox', '../../etc/passwd', '<script>', '\u0000'];
let threw=0;
junk.forEach(j=>{ try{ m.decodeShare(j); m.rehydrate(m.decodeShare(j)); }catch(e){ threw++; } });
ok('garbage links never throw', threw===0, threw);

// 4. vote counting at scale
let vbad=0;
for(let trial=0;trial<2000;trial++){
  const count=2+(trial%4);
  const voters=1+(trial%40);
  const lines=[];
  for(let v=0;v<voters;v++) lines.push('Person'+v+' P'+String.fromCharCode(65+v%26)+'-'+((trial+v)%(1<<count)).toString(36));
  const ballots=m.parseCodes(lines.join('\n'));
  const fake=Array.from({length:count},(_,i)=>({bill:{perHead:100*(i+1)}}));
  const t=m.tally(ballots,count,fake);
  if(t.scores.length!==count) vbad++;
  if(t.scores.some(x=>!isFinite(x)||x<0||x>ballots.length)) vbad++;
  if(t.top>0 && (t.winner===null||t.winner<0||t.winner>=count)) vbad++;
}
ok('2k vote counts stay sane', vbad===0, vbad);

// 5. duplicate and abusive reply text
const spam=Array.from({length:500},(_,i)=>'AB-1').join('\n');
const one=m.parseCodes(spam);
ok('same person spamming counts once', one.length===1, one.length);
const mixed=m.parseCodes('hi\nAA-1\nlol ok\nBB-2\n\n\nCC-3\nrandom words\nAA-7');
ok('chatter filtered, first vote kept', mixed.length===3 && mixed[0].mask===1, mixed);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
