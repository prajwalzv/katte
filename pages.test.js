/* exactly what GitHub Pages does: no server anywhere, no maps key */
const fs=require('fs');
const {JSDOM,VirtualConsole}=require('/home/claude/node_modules/jsdom');
const html=fs.readFileSync('index.html','utf8');
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':String(x).slice(0,220));} };

const patch=html.replace('<body>',`<body><script>
 Element.prototype.scrollIntoView=function(){};
 HTMLDialogElement.prototype.showModal=function(){this.open=true};
 HTMLDialogElement.prototype.close=function(){this.open=false};
 window.fetch=function(){ return Promise.reject(new TypeError('Failed to fetch')); };
</script>`);
const vc=new VirtualConsole(); let errs=[];
vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(patch,{runScripts:'dangerously',url:'https://prajwalzv.github.io/katte/',virtualConsole:vc,pretendToBeVisual:true});
const w=dom.window,d=w.document;
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const $$=s=>Array.from(d.querySelectorAll(s));
const byText=(r,s,t)=>Array.from(r.querySelectorAll(s)).find(e=>e.textContent.trim()===t);
const tick=(ms=40)=>new Promise(r=>setTimeout(r,ms));
const visible=()=>{const c=d.body.cloneNode(true);Array.from(c.querySelectorAll('script')).forEach(x=>x.remove());return c.textContent;};

(async()=>{
await tick();
ok('boots with no server and no key', errs.length===0, errs);
ok('no error text anywhere', !/Unexpected token|not valid JSON|undefined|NaN/i.test(visible()), (visible().match(/.{0,60}(Unexpected token|not valid JSON|undefined|NaN).{0,60}/i)||[''])[0]);

// removals
ok('Saved button gone', !d.getElementById('btnSaved'));
ok('Saved section gone', !d.getElementById('savedSection'));
ok('no Keep buttons anywhere', !/\bKeep\b/.test(visible()));
ok('search box hidden without a key', d.querySelector('.searchbox').hidden===true);
ok('no broken search visible', !/Live search is off|server running/i.test(visible()));

// generate
d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
await tick();
let cards=$$('#cards .card');
ok('three plans', cards.length===3, cards.length);
ok('totals real', cards.every(c=>parseInt(c.querySelector('.rtotal .big').textContent.replace(/[₹,]/g,''))>0));
ok('no zero costs', !/₹0\b/.test(visible()));
ok('card actions are just vote and swap', (()=>{
  const acts=Array.from(cards[0].querySelectorAll('.act')).map(a=>a.textContent.trim());
  return acts.includes('Put to vote') && !acts.includes('Keep');
})(), Array.from(cards[0].querySelectorAll('.act')).map(a=>a.textContent.trim()));

// voting: exactly two modes
click(byText(cards[0],'.act','Put to vote'));
click(byText($$('#cards .card')[1],'.act','Put to vote'));
ok('vote section opens', d.getElementById('voteSection').hidden===false);
const modes=$$('#voteModes .chip').map(c=>c.textContent.trim());
ok('two vote modes only', modes.length===2, modes);
ok('count the codes mode gone', !modes.includes('Count the codes'), modes);
ok('modes named right', modes[0]==='Pass the phone around'&&modes[1]==='Send a link', modes);

// link mode must work with no server
click(byText(d,'#voteModes .chip','Send a link'));
await tick();
const ta=d.querySelector('#voteBody textarea');
ok('link generated with no server', /#s=/.test(ta.value), ta.value.slice(0,80));
ok('link is absolute', /^https:\/\//.test(ta.value));
ok('no server error shown', !/server|npm start/i.test(d.getElementById('voteBody').textContent));
ok('whatsapp link present', !!d.querySelector('#voteBody a[href^="https://wa.me/"]'));
ok('replies box present in same screen', $$('#voteBody textarea').length===2);

// counting replies in the same screen
const reply=$$('#voteBody textarea')[1];
reply.value='Prajwal here PV-1\nPratheeksha PR-3\nmasoom BM-2';
reply.dispatchEvent(new w.Event('input',{bubbles:true}));
await tick();
ok('replies counted live', $$('#voteBody .tally li').length===2, $$('#voteBody .tally li').length);
ok('a winner is marked', $$('#voteBody .tally li.win').length===1);
ok('final plan offered to copy', /Copy the plan/.test(d.getElementById('voteBody').textContent));

// voter opening the shared link, still no server
const share=ta.value;
const v=new JSDOM(patch.replace('<body>','<body>'),{runScripts:'dangerously',url:share,virtualConsole:vc,pretendToBeVisual:true});
await tick(60);
const vd=v.window.document;
const vclick=e=>e.dispatchEvent(new v.window.MouseEvent('click',{bubbles:true}));
ok('voter view loads from the link alone', /Somebody wants your vote/.test(vd.getElementById('votePanel').textContent));
ok('voter sees both plans', vd.querySelectorAll('.ballot li').length===2);
ok('voter sees the prices', /₹/.test(vd.querySelector('.ballot li').textContent));
const vn=vd.querySelector('#votePanel input[type=text]');
const vgo=Array.from(vd.querySelectorAll('#votePanel .act')).find(b=>/Get my code/.test(b.textContent));
vn.value='Masoom B';
vclick(vd.querySelectorAll('.ballot li')[0].querySelectorAll('.yn button')[0]);
vclick(vgo);
await tick();
const code=vd.querySelector('.code-out .big');
ok('voter gets a reply code', !!code && /^MB-[0-9A-Z]$/.test(code.textContent), code&&code.textContent);

// pass the phone
click(byText(d,'#voteModes .chip','Pass the phone around'));
function vote(name,i){
  d.querySelector('#voteBody input[type=text]').value=name;
  click($$('.ballot li')[i].querySelectorAll('.yn button')[0]);
  click(byText(d,'#voteBody .act','Done, pass it on'));
}
vote('Prajwal',0); vote('Pratheeksha',1); vote('Masoom',1);
click(byText(d,'#voteBody .act',"That's everyone, show the result"));
ok('pass the phone still works', $$('#voteBody .tally li.win').length===1);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
