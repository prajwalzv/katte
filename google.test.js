/* patch fetch before loading the server so the Google call is intercepted */
process.env.PORT = '3988';
process.env.GOOGLE_MAPS_API_KEY = 'fake-key-for-testing';

let sent = [];
const realFetch = global.fetch;
global.fetch = function(url, opt){
  const u = String(url);
  if(u.indexOf('places.googleapis.com') !== -1){
    sent.push({url:u, headers:opt.headers, body:JSON.parse(opt.body)});
    return Promise.resolve({
      ok:true, status:200,
      text: () => Promise.resolve(JSON.stringify({places:[
        {id:'X1', displayName:{text:'Toit Brewpub'}, shortFormattedAddress:'100 Feet Rd, Indiranagar',
         location:{latitude:12.978,longitude:77.640}, types:['bar','restaurant','food'],
         priceLevel:'PRICE_LEVEL_EXPENSIVE', rating:4.6, userRatingCount:19542,
         businessStatus:'OPERATIONAL', currentOpeningHours:{openNow:true}},
        {id:'X2', displayName:{text:'Shut Forever Cafe'}, location:{latitude:12.9,longitude:77.6},
         types:['cafe'], businessStatus:'CLOSED_PERMANENTLY', currentOpeningHours:{openNow:false}},
        {id:'X3', displayName:{text:'Nameless Park'}, location:{latitude:12.95,longitude:77.58},
         types:['park'], businessStatus:'OPERATIONAL'},
        {id:'X4', displayName:{text:'No Coords Place'}, types:['cafe'], businessStatus:'OPERATIONAL'}
      ]}))
    });
  }
  return realFetch(url, opt);
};

require('./server.js');
const BASE='http://localhost:3988';
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c)pass++; else {fail++;console.log('FAIL:',n,x===undefined?'':JSON.stringify(x).slice(0,240));} };

setTimeout(async ()=>{
  let r = await realFetch(BASE+'/api/places/search?q=toit').then(x=>x.json());

  ok('calls the New Places text search endpoint', sent[0].url.indexOf('/v1/places:searchText')!==-1, sent[0].url);
  ok('sends the key in a header not the url', sent[0].headers['X-Goog-Api-Key']==='fake-key-for-testing' && sent[0].url.indexOf('key=')===-1);
  ok('sends a field mask', /places\.displayName/.test(sent[0].headers['X-Goog-FieldMask']));
  ok('asks for live open status', /currentOpeningHours/.test(sent[0].headers['X-Goog-FieldMask']));
  ok('scopes the query to Bengaluru', /Bengaluru/.test(sent[0].body.textQuery));
  ok('biases to the city centre', !!sent[0].body.locationBias.circle.radius);
  ok('does not filter out closed places', sent[0].body.openNow === undefined);
  ok('region set to India', sent[0].body.regionCode==='IN');

  const names = r.places.map(p=>p.name);
  ok('permanently closed dropped', names.indexOf('Shut Forever Cafe')===-1, names);
  ok('place with no coords dropped', names.indexOf('No Coords Place')===-1, names);
  ok('good places kept', names.length===2, names);

  const toit = r.places.find(p=>p.name==='Toit Brewpub');
  ok('open status carried through', toit.openNow===true);
  ok('rating carried through', toit.rating===4.6 && toit.reviews===19542);
  ok('expensive maps to a sane per head', toit.perHead===900, toit.perHead);
  ok('slot inferred from type', toit.slot==='meal', toit.slot);
  ok('address kept', /Indiranagar/.test(toit.address));

  const park = r.places.find(p=>p.name==='Nameless Park');
  ok('missing hours becomes null not false', park.openNow===null, park.openNow);
  ok('no price level falls back to type', park.perHead===70, park.perHead);
  ok('nothing is ever free', r.places.every(p=>p.perHead>=60), r.places.map(p=>p.perHead));
  ok('park slot is walk', park.slot==='walk');

  const before = sent.length;
  r = await realFetch(BASE+'/api/places/search?q=TOIT').then(x=>x.json());
  ok('repeat search served from cache', sent.length===before && r.cached===true);

  await realFetch(BASE+'/api/places/nearby?lat=12.97&lng=77.64&kind=cafe').then(x=>x.json());
  ok('nearby uses the searchNearby endpoint', sent[sent.length-1].url.indexOf('/v1/places:searchNearby')!==-1);
  ok('nearby restricts by radius', !!sent[sent.length-1].body.locationRestriction.circle.radius);
  ok('nearby passes the type', sent[sent.length-1].body.includedTypes[0]==='cafe');

  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
}, 900);
