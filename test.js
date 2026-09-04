/* the cost maths and plan logic, pulled straight out of index.html */
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const core=html.slice(html.indexOf('var AREAS = {'), html.indexOf('var memStore = {};'));
const m={};
new Function('e', core+'Object.assign(e,{AREAS,SPOTS,SPOT_BY_ID,stopCost,hopCost,planBill,generate,eligible,planTitle,tally,parseCodes,makeCode,initials,encodeShare,decodeShare,rehydrate,swapAdd,commuteCost,planZone});')(m);

let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':JSON.stringify(x).slice(0,200));} };
const S=m.SPOT_BY_ID;

// data integrity
const ids=new Set();
m.SPOTS.forEach(s=>{
  ok('unique id '+s.id, !ids.has(s.id)); ids.add(s.id);
  ok('area valid '+s.id, s.area==='*'||!!m.AREAS[s.area], s.area);
  ok('lo<=hi '+s.id, s.lo<=s.hi);
  ok('min<=max '+s.id, s.min<=s.max);
  ok('has copy '+s.id, s.short&&s.why);
  ok('mode valid '+s.id, ['free','head','ticket','group'].includes(s.mode));
  ok('when valid '+s.id, s.when.every(w=>['day','evening','night'].includes(w)));
  ok('never free '+s.id, s.mode==='group'||s.hi>0, {mode:s.mode,hi:s.hi});
});
ok('55 places', m.SPOTS.length===55, m.SPOTS.length);

// money
ok('gst on top of service charge', Math.abs(m.stopCost({mode:'head',lo:100,hi:100,svc:10,gst:5,extras:[]},2).total-(100+10+110*0.05))<1e-9);
ok('toit mid point', Math.round(m.stopCost(S.toit,4).base)===1175);
ok('toit gst 18pc', Math.abs(m.stopCost(S.toit,4).total-1175*1.18)<0.01);
ok('turf splits by head', Math.abs(m.stopCost(S.turf,10).total-185)<0.01);
ok('more people cheaper on turf', m.stopCost(S.turf,16).total<m.stopCost(S.turf,10).total);
ok('palace camera fee per group', Math.abs(m.stopCost(S.palace,4).total-(290+70))<0.01);
ok('nothing costs zero', m.SPOTS.every(s=>m.stopCost(s,4).total>0), m.SPOTS.filter(s=>m.stopCost(s,4).total<=0).map(s=>s.id));

// travel
ok('same area you walk', m.hopCost('indiranagar','indiranagar',4)===0);
ok('citywide is free to reach', m.hopCost('*','indiranagar',4)===0);
ok('across town costs', m.hopCost('indiranagar','malleshwaram',4)>0);
ok('splits across more people', m.hopCost('indiranagar','malleshwaram',9)<=m.hopCost('indiranagar','malleshwaram',3));
ok('metro area gets metro', /Metro/.test(m.commuteCost([S.toit],4,'indiranagar').label));
ok('non metro gets autos', /Autos/.test(m.commuteCost([S.agara],4,'hsr').label));
ok('out of town not charged twice', m.commuteCost([S.nandi],6,'outskirts').amt===0);

// bills
let b=m.planBill([S.vvpuram,S.buglerock],4,{travel:false});
ok('per head is whole rupees', Number.isInteger(b.perHead));
ok('group is per head times people', b.group===b.perHead*4);
ok('travel advised when not counted', b.advisory&&b.advisory.amt>0);
let bt=m.planBill([S.vvpuram,S.buglerock],4,{travel:true});
ok('counting travel costs more', bt.perHead>b.perHead);
ok('no advisory once counted', bt.advisory===null);

// filters
ok('turf needs eight', !m.eligible(S.turf,{n:4,when:'evening'}) && m.eligible(S.turf,{n:10,when:'evening'}));
ok('veg blocks toit', !m.eligible(S.toit,{n:4,when:'evening',veg:true}));
ok('sober blocks toit', !m.eligible(S.toit,{n:4,when:'evening',sober:true}));
ok('indoor blocks cubbon', !m.eligible(S.cubbon,{n:4,when:'day',indoor:true}));
ok('area filter works', !m.eligible(S.toit,{n:4,when:'evening',area:'malleshwaram'}));
ok('citywide passes any area', m.eligible(S.multiplex,{n:4,when:'evening',area:'malleshwaram'}));
ok('veena is breakfast only', !m.eligible(S.veenastores,{n:4,when:'night'}));

// full sweep
let over=0,zero=0,dupes=0,split=0,total=0,empty=0;
const areas=['any'].concat(Object.keys(m.AREAS));
for(const bd of [150,200,300,500,800,1200,2000])
 for(const ar of areas)
  for(const wh of ['day','evening','night'])
   for(const n of [2,4,8,12]){
     const o={budget:bd,area:ar,n,when:wh,veg:false,sober:false,indoor:false,single:false,travel:false};
     for(let sd=0;sd<4;sd++){
       const out=m.generate(o,sd*977+1);
       if(!out.plans.length){ empty++; continue; }
       const seen=new Set();
       out.plans.forEach(p=>{
         total++;
         if(bd<2000&&p.bill.perHead>bd) over++;
         if(p.bill.perHead<=0) zero++;
         const k=p.ids.join(','); if(seen.has(k)) dupes++; seen.add(k);
         p.stops.forEach(st=>{ if(st.min>n||st.max<n||st.when.indexOf(wh)===-1) split++; });
         const used=new Set(p.stops.map(x=>x.area).filter(a=>a!=='*'));
         if(used.size>1) split++;
       });
     }
   }
ok('nothing over budget', over===0, over);
ok('nothing costs zero', zero===0, zero);
ok('no repeats in one roll', dupes===0, dupes);
ok('no plan crosses town or breaks constraints', split===0, split);
console.log('  swept '+total+' plans, '+empty+' empty combinations');

// filters honoured in output
let viol=0;
for(const f of [{veg:true},{sober:true},{indoor:true},{single:true},{veg:true,sober:true,indoor:true}])
  for(const n of [2,4,10]) for(const wh of ['day','evening','night']){
    const o=Object.assign({budget:700,area:'any',n,when:wh,travel:false,veg:false,sober:false,indoor:false,single:false},f);
    m.generate(o,42).plans.forEach(p=>{
      if(o.single && p.stops.length!==1) viol++;
      p.stops.forEach(s=>{
        if(o.veg&&!s.veg) viol++;
        if(o.sober&&s.booze) viol++;
        if(o.indoor&&!s.indoor) viol++;
      });
    });
  }
ok('filters honoured in output', viol===0, viol);

// ballots
ok('initials from two names', m.initials('Ravi Kumar')==='RK');
ok('initials from one', m.initials('Sneha')==='SN');
ok('code format', m.makeCode('Ravi Kumar',5)==='RK-5');
ok('code base36', m.makeCode('Ann Bee',12)==='AB-C');
let pc=m.parseCodes('yo RK-5\nsneha SN-C\nlol\nRK-3 again');
ok('two ballots parsed', pc.length===2, pc);
ok('first vote per person wins', pc[0].mask===5);
ok('em dash separator parses', m.parseCodes('AB \u2014 3').length===1);
ok('chatter ignored', m.parseCodes('haan theek hai').length===0);

const fp=[{bill:{perHead:500}},{bill:{perHead:200}},{bill:{perHead:900}}];
let t=m.tally([{mask:0b011},{mask:0b010},{mask:0b110}],3,fp);
ok('tally counts', JSON.stringify(t.scores)==='[1,3,1]', t.scores);
ok('winner correct', t.winner===1 && t.tieBroken===false);
let t2=m.tally([{mask:0b001},{mask:0b010}],3,fp);
ok('tie goes to cheaper', t2.winner===1 && t2.tieBroken===true);
ok('nobody voting shows zero', m.tally([{mask:0},{mask:0}],3,fp).top===0);

// share links
const st={n:6,b:800,t:1,p:[['vvpuram','buglerock'],['toit'],['grid','cornerhouse']]};
const enc=m.encodeShare(st);
ok('url safe', /^[A-Za-z0-9_-]+$/.test(enc));
ok('round trips', JSON.stringify(m.decodeShare(enc))===JSON.stringify(st));
ok('garbage decodes to null', m.decodeShare('!!!not base64!!!')===null);
const re=m.rehydrate(st);
ok('rehydrates three plans', re.plans.length===3);
ok('rehydrated bill is real', re.plans[0].bill.perHead>0);
ok('unknown ids rejected', m.rehydrate({n:4,p:[['not-a-place']]})===null);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
