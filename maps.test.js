/* fakes google.maps.places so the search path can be driven without a key */
const fs=require('fs');
const {JSDOM,VirtualConsole}=require('/home/claude/node_modules/jsdom');
let html=fs.readFileSync('index.html','utf8');
html=html.replace('var MAPS_KEY = "";','var MAPS_KEY = "test-key";');
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':String(x).slice(0,220));} };

const stub=`<script>
 Element.prototype.scrollIntoView=function(){};
 HTMLDialogElement.prototype.showModal=function(){this.open=true};
 HTMLDialogElement.prototype.close=function(){this.open=false};
 window.fetch=function(){return Promise.reject(new TypeError('Failed to fetch'));};
 window.__searchArgs=[]; window.__nearbyArgs=[];
 const mk=(o)=>Object.assign({businessStatus:'OPERATIONAL',types:[],location:{lat:12.97,lng:77.64}},o);
 const RESULTS=[
   mk({id:'A',displayName:{text:'Toit Brewpub'},formattedAddress:'100 Feet Rd, Indiranagar',types:['bar','restaurant'],rating:4.6,userRatingCount:19542,priceLevel:'EXPENSIVE',isOpen:()=>Promise.resolve(true)}),
   mk({id:'B',displayName:{text:'Shut Cafe'},types:['cafe'],priceLevel:'MODERATE',businessStatus:'CLOSED_PERMANENTLY',isOpen:()=>Promise.resolve(false)}),
   mk({id:'C',displayName:{text:'Late Night Dosa'},types:['meal_takeaway'],isOpen:()=>Promise.resolve(false)}),
   mk({id:'D',displayName:{text:'Nameless Park'},types:['park'],isOpen:()=>Promise.reject(new Error('no hours'))}),
   mk({id:'E',displayName:{text:'No Coords'},types:['cafe'],location:null,isOpen:()=>Promise.resolve(true)})
 ];
 const NEAR={
   ice_cream_shop:[mk({id:'N1',displayName:{text:'Corner House'},types:['ice_cream_shop'],priceLevel:'INEXPENSIVE',rating:4.5,userRatingCount:8000})],
   cafe:[mk({id:'N2',displayName:{text:'Third Wave'},types:['cafe'],priceLevel:'MODERATE'})],
   park:[mk({id:'N3',displayName:{text:'Defence Colony Park'},types:['park']})],
   restaurant:[mk({id:'N4',displayName:{text:'Truffles'},types:['restaurant'],priceLevel:'MODERATE'})]
 };
 window.google={maps:{importLibrary:(n)=>Promise.resolve({
   Place:{
     searchByText:(req)=>{ window.__searchArgs.push(req); return Promise.resolve({places:RESULTS}); },
     searchNearby:(req)=>{ window.__nearbyArgs.push(req); return Promise.resolve({places: NEAR[req.includedPrimaryTypes[0]]||[]}); }
   }
 })}};
 // the loader callback fires immediately since google is already present
 const realCreate=document.createElement.bind(document);
 document.createElement=function(t){
   const e=realCreate(t);
   if(t==='script'){ setTimeout(()=>{ if(window.__katteMapsReady) window.__katteMapsReady(); },0); }
   return e;
 };
</script>`;
const patch=html.replace('<body>','<body>'+stub);
const vc=new VirtualConsole(); let errs=[];
vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(patch,{runScripts:'dangerously',url:'https://prajwalzv.github.io/katte/',virtualConsole:vc,pretendToBeVisual:true});
const w=dom.window,d=w.document;
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const $$=s=>Array.from(d.querySelectorAll(s));
const byText=(r,s,t)=>Array.from(r.querySelectorAll(s)).find(e=>e.textContent.trim()===t);
const tick=(ms=50)=>new Promise(r=>setTimeout(r,ms));

(async()=>{
await tick();
ok('boots with a key', errs.length===0, errs);
ok('search box visible when key set', d.querySelector('.searchbox').hidden!==true);

d.getElementById('q').value='toit';
click(d.getElementById('qgo'));
await tick(120);

const req=w.__searchArgs[0];
ok('search actually fired', !!req);
ok('query scoped to Bengaluru', /Bengaluru/.test(req.textQuery), req.textQuery);
ok('asks for opening hours', req.fields.indexOf('regularOpeningHours')!==-1);
ok('asks for price level', req.fields.indexOf('priceLevel')!==-1);
ok('biased to the city', req.locationBias.radius===30000);
ok('region india', req.region==='in');

const hits=$$('#hits li');
ok('permanently closed dropped', !/Shut Cafe/.test(d.getElementById('hits').textContent));
ok('place with no coords dropped', !/No Coords/.test(d.getElementById('hits').textContent));
ok('three usable hits', hits.length===3, hits.length);
ok('open badge', !!d.querySelector('#hits .badge.open'));
ok('closed badge shown, not hidden', !!d.querySelector('#hits .badge.shut'));
ok('unknown hours handled', !!d.querySelector('#hits .badge.unknown'));
ok('open sorted first', /open now/.test(hits[0].textContent));
ok('rating shown', /4\.6/.test(hits[0].textContent));
ok('per head shown', /₹900/.test(hits[0].textContent), hits[0].textContent);
ok('no zero prices', !/₹0\b/.test(d.getElementById('hits').textContent));

// cache: second identical search must not call google again
const before=w.__searchArgs.length;
d.getElementById('q').value='TOIT';
click(d.getElementById('qgo'));
await tick(80);
ok('repeat search served from cache', w.__searchArgs.length===before, w.__searchArgs.length);

// pick a place and build plans around it
click(byText(hits[0],'button','Use this'));
await tick();
ok('chosen banner shown', /Building plans around Toit/.test(d.getElementById('chosen').textContent));
const bud=d.getElementById('budget'); bud.value='2000'; bud.dispatchEvent(new w.Event('input'));
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await tick(140);

ok('nearby was called', w.__nearbyArgs.length>0);
ok('nearby restricted by radius', w.__nearbyArgs[0].locationRestriction.radius===1800);
const cards=$$('#cards .card');
ok('live plans built', cards.length===3, cards.length);
ok('marked as live', /live from google/i.test(cards[0].textContent));
ok('live totals non zero', cards.every(c=>parseInt(c.querySelector('.rtotal .big').textContent.replace(/[₹,]/g,''))>0));
ok('estimate caveat shown', /estimated from Google/i.test(cards[0].textContent));
ok('no NaN or undefined', !/NaN|undefined/.test(d.getElementById('cards').textContent));

// live plans can go to a vote and produce a link
click(byText(cards[0],'.act','Put to vote'));
click(byText($$('#cards .card')[1],'.act','Put to vote'));
click(byText(d,'#voteModes .chip','Send a link'));
await tick();
ok('live plans make a share link', /#s=/.test(d.querySelector('#voteBody textarea').value));

// over budget refusal
click(byText(d.getElementById('chosen'),'.act','Change'));
d.getElementById('q').value='toit';
click(d.getElementById('qgo'));
await tick(80);
click(byText($$('#hits li')[0],'button','Use this'));
bud.value='300'; bud.dispatchEvent(new w.Event('input'));
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await tick(120);
ok('refuses when over budget', /over your ₹300 cap/.test(d.getElementById('cards').textContent), d.getElementById('cards').textContent.slice(0,120));
ok('shows no card when over budget', $$('#cards .card').length===0);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
