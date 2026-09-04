const fs=require('fs');
const {JSDOM,VirtualConsole}=require('/home/claude/node_modules/jsdom');
const html=fs.readFileSync('index.html','utf8');
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n, x===undefined?'':require('util').inspect(x).slice(0,200));} };

// fake the server so the frontend can be driven without network
const FAKE={
 '/api/health':{ok:true,liveSearch:true},
 '/api/places/search':{places:[
   {id:'p1',name:'Toit Brewpub',address:'Indiranagar',lat:12.97,lng:77.64,types:['bar','restaurant'],slot:'meal',rating:4.6,reviews:19000,priceLevel:'PRICE_LEVEL_EXPENSIVE',perHead:900,openNow:true,live:true},
   {id:'p2',name:'Closed Cafe',address:'Somewhere',lat:12.9,lng:77.6,types:['cafe'],slot:'coffee',rating:3.9,reviews:12,priceLevel:null,perHead:260,openNow:false,live:true},
   {id:'p3',name:'Hours Unknown Stall',address:'VV Puram',lat:12.94,lng:77.57,types:['meal_takeaway'],slot:'snack',rating:null,reviews:null,priceLevel:null,perHead:180,openNow:null,live:true}
 ]},
 '/api/places/nearby':{places:[
   {id:'n1',name:'Corner House',address:'Indiranagar',lat:12.97,lng:77.64,types:['ice_cream_shop'],slot:'sweet',rating:4.5,reviews:8000,priceLevel:'PRICE_LEVEL_INEXPENSIVE',perHead:170,openNow:true,live:true},
   {id:'n2',name:'Third Wave Coffee',address:'Indiranagar',lat:12.97,lng:77.64,types:['cafe'],slot:'coffee',rating:4.2,reviews:3000,priceLevel:'PRICE_LEVEL_MODERATE',perHead:260,openNow:true,live:true},
   {id:'n3',name:'Defence Colony Park',address:'Indiranagar',lat:12.97,lng:77.64,types:['park'],slot:'walk',rating:4.4,reviews:500,priceLevel:null,perHead:70,openNow:null,live:true}
 ]},
 '/api/plans':{id:'AB12CD',url:'/#v=AB12CD'},
 '/api/plans/AB12CD':{id:'AB12CD',people:4,budget:600,area:'Indiranagar',plans:[
   {title:'Toit then ice cream',perHead:540,stops:['Toit','Corner House']},
   {title:'Cubbon then chai',perHead:180,stops:['Cubbon Park']}]},
 '/api/plans/AB12CD/votes':{id:'AB12CD',voters:['Prajwal','Pratheeksha','Masoom'],scores:[3,1],top:3,winner:0,brokeTie:false,people:4,
   plans:[{title:'Toit then ice cream',perHead:540},{title:'Cubbon then chai',perHead:180}]}
};
const patch=html.replace('<body>',`<body><script>
 Element.prototype.scrollIntoView=function(){};
 HTMLDialogElement.prototype.showModal=function(){this.open=true};
 HTMLDialogElement.prototype.close=function(){this.open=false};
 window.confirm=function(){return true};
 const FAKE=${JSON.stringify(FAKE)};
 window.__calls=[];
 window.fetch=function(url,opt){
   window.__calls.push({url:String(url),method:(opt&&opt.method)||'GET'});
   const path=String(url).split('?')[0];
   const body=FAKE[path];
   return Promise.resolve({ok:!!body,status:body?200:404,json:()=>Promise.resolve(body||{error:'nope'})});
 };
</script>`);
const vc=new VirtualConsole(); let errs=[];
vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(patch,{runScripts:'dangerously',url:'https://x.test/',virtualConsole:vc,pretendToBeVisual:true});
const w=dom.window,d=w.document;
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const $$=(s)=>Array.from(d.querySelectorAll(s));
const byText=(root,s,t)=>Array.from(root.querySelectorAll(s)).find(e=>e.textContent.trim()===t);
const tick=()=>new Promise(r=>setTimeout(r,25));

(async()=>{
ok('boots clean', errs.length===0, errs);
ok('renamed to Katte', /katte/i.test(d.querySelector('.brand').textContent) && !/katta/i.test(d.title), d.title);
ok('logo svg present', !!d.querySelector('.brand svg'));
ok('only famous areas shown', d.querySelectorAll('#areas .chip').length===8, d.querySelectorAll('#areas .chip').length);
ok('search box exists', !!d.getElementById('q') && !!d.getElementById('qgo'));
ok('slider floor is 150', d.getElementById('budget').min==='150');
ok('no Free label', !/Free only/.test(html) && !/>Free</.test(d.querySelector('.ticks').innerHTML));

// curated generation, nothing free
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
let cards=$$('#cards .card');
ok('three cards', cards.length===3, cards.length);
const totals=cards.map(c=>parseInt(c.querySelector('.rtotal .big').textContent.replace(/[₹,]/g,'')));
ok('no zero totals', totals.every(t=>t>0), totals);
ok('no free stop labels', !$$('#cards .cost').some(e=>/free/i.test(e.textContent)));

// live search
d.getElementById('q').value='toit';
click(d.getElementById('qgo'));
await tick();
let hits=$$('#hits li');
ok('search rendered hits', hits.length===3, hits.length);
ok('open badge shown', !!d.querySelector('#hits .badge.open'));
ok('closed badge shown', !!d.querySelector('#hits .badge.shut'));
ok('unknown-hours badge shown', !!d.querySelector('#hits .badge.unknown'));
ok('open sorted first', /open now/.test(hits[0].textContent), hits[0].textContent.slice(0,60));
ok('closed places still listed', $$('#hits li').some(l=>/closed now/.test(l.textContent)));

// choose a live place -> live plans
click(byText(hits[0],'button','Use this'));
await tick();
ok('chosen banner', /Building plans around Toit/.test(d.getElementById('chosen').textContent));

// Toit is ~900 a head, cap is 600, so it should refuse rather than show an over-budget card
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await tick(); await tick();
ok('over-budget live place refused', /over your ₹500 cap/.test(d.getElementById('cards').textContent), d.getElementById('cards').textContent.slice(0,140));
ok('no card shown when over budget', $$('#cards .card').length===0);

// raise the cap and try again
const bud=d.getElementById('budget'); bud.value='2000'; bud.dispatchEvent(new w.Event('input'));
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await tick(); await tick();
cards=$$('#cards .card');
ok('live cards built', cards.length>=1, cards.length);
ok('live label on card', /live from google/i.test(cards[0].textContent));
ok('live per-head shown', /about ₹/.test(cards[0].querySelector('.cost').textContent));
ok('live total non-zero', parseInt(cards[0].querySelector('.rtotal .big').textContent.replace(/[₹,]/g,''))>0);
ok('estimate caveat present', /estimated from Google/i.test(cards[0].textContent));
ok('no swap button on live card', !byText(cards[0],'.act','Swap the second stop'));

// server ballot
click(byText(cards[0],'.act','Put to vote'));
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await tick(); await tick();
cards=$$('#cards .card');
if(cards[1]) click(byText(cards[1],'.act','Put to vote'));
ok('vote section open', d.getElementById('voteSection').hidden===false);
click(byText(d,'#voteModes .chip','Send one link'));
const mk=byText(d,'#voteBody .act','Make the voting link');
ok('link mode has save button', !!mk);
click(mk); await tick();
ok('ballot saved and url shown', /#v=AB12CD/.test(d.querySelector('#voteBody textarea').value), d.querySelector('#voteBody textarea')&&d.querySelector('#voteBody textarea').value);
ok('posted to /api/plans', w.__calls.some(c=>c.url.endsWith('/api/plans')&&c.method==='POST'));
click(byText(d,'#voteBody .act','Check the votes')); await tick();
ok('server tally rendered', $$('#voteBody .server-tally .tally li').length===2);
ok('winner marked', !!d.querySelector('#voteBody .tally li.win'));

// voter opening the link
const v=new JSDOM(patch,{runScripts:'dangerously',url:'https://x.test/#v=AB12CD',virtualConsole:vc,pretendToBeVisual:true});
await new Promise(r=>setTimeout(r,60));
const vd=v.window.document;
ok('voter view loaded from server', /Somebody wants your vote/.test(vd.getElementById('votePanel').textContent));
ok('voter hero hidden', vd.querySelector('.hero').hidden===true);
ok('voter sees both plans', vd.querySelectorAll('.ballot li').length===2);
ok('voter sees prices', /₹540/.test(vd.querySelector('.ballot li').textContent));
const vname=vd.querySelector('#votePanel input[type=text]');
const vsend=Array.from(vd.querySelectorAll('#votePanel .act')).find(b=>b.textContent==='Send my vote');
click2=e=>e.dispatchEvent(new v.window.MouseEvent('click',{bubbles:true}));
click2(vsend);
await new Promise(r=>setTimeout(r,25));
ok('name required before sending', !vd.querySelector('.code-out'));
vname.value='Masoom';
click2(vd.querySelectorAll('.ballot li')[0].querySelectorAll('.yn button')[0]);
click2(vsend);
await new Promise(r=>setTimeout(r,40));
ok('vote confirmed', /Vote recorded/.test(vd.getElementById('votePanel').textContent));
ok('voter sees running tally', !!vd.querySelector('.server-tally'));

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
