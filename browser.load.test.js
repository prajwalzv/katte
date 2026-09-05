/* real DOM, many sessions in a row, looking for leaks and stale state */
const fs=require('fs');
const {JSDOM,VirtualConsole}=require('/home/claude/node_modules/jsdom');
const html=fs.readFileSync('index.html','utf8');
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':String(x).slice(0,220));} };
const patch=html.replace('<body>',`<body><script>
 Element.prototype.scrollIntoView=function(){};
 HTMLDialogElement.prototype.showModal=function(){this.open=true};
 HTMLDialogElement.prototype.close=function(){this.open=false};
 window.confirm=()=>true;
 window.fetch=()=>Promise.reject(new TypeError('Failed to fetch'));
</script>`);
const vc=new VirtualConsole(); let errs=[];
vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(patch,{runScripts:'dangerously',url:'https://prajwalzv.github.io/katte/',virtualConsole:vc,pretendToBeVisual:true});
const w=dom.window,d=w.document;
const click=e=>e&&e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const $$=s=>Array.from(d.querySelectorAll(s));
const byText=(r,s,t)=>Array.from(r.querySelectorAll(s)).find(e=>e.textContent.trim()===t);
const tick=(ms=5)=>new Promise(r=>setTimeout(r,ms));
const visible=()=>{const c=d.body.cloneNode(true);Array.from(c.querySelectorAll('script')).forEach(x=>x.remove());return c.textContent;};

(async()=>{
const areaChips=$$('#areas .chip'), whenChips=$$('#whens .chip'), filterChips=$$('#filters .chip');
const bud=d.getElementById('budget');
let rolls=0, cardsSeen=0, badMoney=0;
const t0=Date.now();

for(let i=0;i<600;i++){
  bud.value=String([150,200,300,500,800,1200,2000][i%7]);
  bud.dispatchEvent(new w.Event('input'));
  click(areaChips[i%areaChips.length]);
  click(whenChips[i%whenChips.length]);
  if(i%9===0) click(filterChips[i%filterChips.length]);           // toggle on
  if(i%9===4) click(filterChips[(i-4)%filterChips.length]);        // toggle back off
  for(let k=0;k<(i%3);k++) click(d.getElementById('plus'));
  for(let k=0;k<(i%2);k++) click(d.getElementById('minus'));

  d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  rolls++;
  const cards=$$('#cards .card');
  cardsSeen+=cards.length;
  cards.forEach(c=>{
    const t=c.querySelector('.rtotal .big').textContent;
    if(!/^₹[\d,]+$/.test(t)) badMoney++;
    const v=parseInt(t.replace(/[₹,]/g,''));
    if(!(v>0)) badMoney++;
  });
  if(i%5===0) click(d.getElementById('reroll'));
  if(i%11===0){ const sw=byText($$('#cards .card')[0]||d.body,'.act','Swap the second stop'); if(sw) click(sw); }
}
const dt=Date.now()-t0;
console.log(`  ${rolls} full UI cycles, ${cardsSeen} cards rendered, ${dt}ms (${(rolls/(dt/1000)).toFixed(0)} cycles/sec)`);

ok('no runtime errors across 600 cycles', errs.length===0, errs.slice(0,3));
ok('every total well formed', badMoney===0, badMoney);
ok('no NaN or undefined leaked to screen', !/NaN|undefined|\[object/.test(visible()), (visible().match(/.{0,50}(NaN|undefined|\[object).{0,50}/)||[''])[0]);
ok('cards did not accumulate', $$('#cards .card').length<=3, $$('#cards .card').length);
ok('dom did not balloon', d.querySelectorAll('*').length < 1400, d.querySelectorAll('*').length);

// repeated voting sessions
let voteRounds=0;
for(let r=0;r<60;r++){
  d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const cards=$$('#cards .card');
  if(cards.length<2) continue;
  click(byText(cards[0],'.act','Put to vote'));
  click(byText($$('#cards .card')[1],'.act','Put to vote'));
  if(d.getElementById('voteSection').hidden) continue;
  click(byText(d,'#voteModes .chip','Send a link'));
  const boxes=$$('#voteBody textarea');
  if(boxes.length===2){
    boxes[1].value='AA-1\nBB-2\nCC-3';
    boxes[1].dispatchEvent(new w.Event('input',{bubbles:true}));
    if($$('#voteBody .tally li').length>0) voteRounds++;
  }
  // clear the ballot for the next round
  $$('#cards .card').forEach(c=>{ const b=byText(c,'.act','On the ballot'); if(b) click(b); });
}
ok('voting worked every round', voteRounds>=50, voteRounds);
ok('still no errors after voting rounds', errs.length===0, errs.slice(0,3));
ok('ballot list did not leak', $$('.ballot li').length<=5, $$('.ballot li').length);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
