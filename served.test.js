/* the page served by our own server: ballots stored, votes come back on their own */
const {spawn}=require('child_process');
const {JSDOM,VirtualConsole}=require('/home/claude/node_modules/jsdom');
const PORT=3991, BASE='http://localhost:'+PORT;
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':String(x).slice(0,200));} };
const srv=spawn('node',['server.js'],{env:{...process.env,PORT:String(PORT)},cwd:__dirname,stdio:'ignore'});

setTimeout(async()=>{
 try{
  const html=await (await fetch(BASE+'/')).text();
  const patch=html.replace('<body>',`<body><script>
    Element.prototype.scrollIntoView=function(){};
    HTMLDialogElement.prototype.showModal=function(){this.open=true};
    HTMLDialogElement.prototype.close=function(){this.open=false};
  </script>`);
  const vc=new VirtualConsole(); let errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
  const wire=(win)=>{ win.fetch=(u,o)=>fetch(String(u).startsWith('http')?u:BASE+u,o); };
  const dom=new JSDOM(patch,{runScripts:'dangerously',url:BASE+'/',virtualConsole:vc,pretendToBeVisual:true,beforeParse:wire});
  const w=dom.window,d=w.document;
  const click=e=>e&&e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  const $$=s=>Array.from(d.querySelectorAll(s));
  const byText=(r,s,t)=>Array.from(r.querySelectorAll(s)).find(e=>e.textContent.trim()===t);
  const tick=(ms=60)=>new Promise(r=>setTimeout(r,ms));

  await tick(120);
  ok('page boots when served by the server', !errs.some(e=>/ReferenceError|TypeError/.test(e)), errs.filter(e=>/Error/.test(e)).slice(0,2));

  d.getElementById('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const cards=$$('#cards .card');
  ok('plans render', cards.length===3, cards.length);
  click(byText(cards[0],'.act','Put to vote'));
  click(byText($$('#cards .card')[1],'.act','Put to vote'));
  click(byText(d,'#voteModes .chip','Send a link'));
  await tick();

  const upg=byText(d,'#voteBody .act','Collect the votes for me');
  ok('server upgrade offered when server is present', !!upg);
  click(upg);
  await tick(150);
  const link=d.querySelector('#voteBody textarea').value;
  ok('link switched to a stored ballot', /#v=[A-Z0-9]{6}$/.test(link), link);
  const id=link.split('#v=')[1];

  // a voter opens it
  const v=new JSDOM(patch,{runScripts:'dangerously',url:link,virtualConsole:vc,pretendToBeVisual:true,beforeParse:wire});
  await tick(200);
  const vd=v.window.document;
  ok('voter view loads from the database', /Somebody wants your vote/.test(vd.getElementById('votePanel').textContent), vd.getElementById('votePanel').textContent.slice(0,80));
  const vc2=e=>e&&e.dispatchEvent(new v.window.MouseEvent('click',{bubbles:true}));
  vd.querySelector('#votePanel input[type=text]').value='Masoom';
  vc2(vd.querySelectorAll('.ballot li')[0].querySelectorAll('.yn button')[0]);
  vc2(Array.from(vd.querySelectorAll('#votePanel .act')).find(b=>/Send my vote/.test(b.textContent)));
  await tick(200);
  ok('vote recorded in the database', /Vote recorded/.test(vd.getElementById('votePanel').textContent));

  // organiser checks
  click(byText(d,'#voteBody .act','Check the votes'));
  await tick(200);
  ok('organiser sees the vote arrive', /Masoom/.test(d.getElementById('voteBody').textContent), d.getElementById('voteBody').textContent.slice(-120));

  console.log('\n'+pass+' passed, '+fail+' failed');
 }catch(e){ console.log('CRASH',e.message); fail++; }
 srv.kill(); process.exit(fail?1:0);
},1400);
