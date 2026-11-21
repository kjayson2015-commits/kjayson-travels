// Dashboard: loads visit stats from Supabase (travel_stats) and draws the tiles, bars and lists.
(function(){var C=window.KJT,API=C.sb.url+'/rest/v1/rpc/travel_stats',H={apikey:C.sb.key,'Content-Type':'application/json'};
var $=function(i){return document.getElementById(i)};var nf=new Intl.NumberFormat('en');
function rows(el,items,label,val){el.innerHTML='';if(!items.length){el.innerHTML='<li class="muted">Nothing yet</li>';return}items.forEach(function(x){var li=document.createElement('li');var a=document.createElement('span');a.textContent=label(x);var b=document.createElement('b');b.textContent=val(x);li.appendChild(a);li.appendChild(b);el.appendChild(li)})}
function load(days){$('d-updated').textContent='Loading…';fetch(API,{method:'POST',headers:H,body:JSON.stringify({p_days:days})}).then(function(r){return r.json()}).then(function(d){
$('d-views').textContent=nf.format(d.views);$('d-visitors').textContent=nf.format(d.visitors);$('d-today').textContent=nf.format(d.today);$('d-all').textContent=nf.format(d.all_time);$('d-likes').textContent=nf.format(d.likes);$('d-comments').textContent=nf.format(d.comments);
var map={};(d.by_day||[]).forEach(function(x){map[x.day]=x});var bars=$('d-bars');bars.innerHTML='';var max=1,list=[];for(var i=days-1;i>=0;i--){var dt=new Date(Date.now()-i*864e5);var k=dt.toISOString().slice(0,10);var v=map[k]?map[k].views:0;list.push([k,v]);if(v>max)max=v}
list.forEach(function(p){var b=document.createElement('div');b.style.height=Math.max(2,Math.round(p[1]/max*100))+'%';b.title=p[0]+': '+p[1]+' views';bars.appendChild(b)});$('d-first').textContent=list[0][0];$('d-last').textContent='Today';
rows($('d-pages'),d.top_pages||[],function(x){return (x.title||x.path).replace(/ \| KJayson Travels$/,'')+'  ·  '+x.path},function(x){return nf.format(x.views)});
rows($('d-refs'),d.referrers||[],function(x){return x.source},function(x){return nf.format(x.views)});
rows($('d-devices'),d.devices||[],function(x){return x.device},function(x){return nf.format(x.views)});
rows($('d-comments-list'),d.latest_comments||[],function(x){return x.name+' on '+x.thread_slug+': '+x.body},function(x){return new Date(x.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})});
$('d-updated').textContent='Updated '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' · last '+days+' days';
}).catch(function(){$('d-updated').textContent='Could not load the numbers. Try again in a moment.'})}
var cur=30;document.querySelectorAll('.seg button').forEach(function(b){b.addEventListener('click',function(){cur=+b.getAttribute('data-days');document.querySelectorAll('.seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});load(cur)})});
var nt=$('d-notrack');function paint(){var off=false;try{off=localStorage.getItem('kjt-notrack')==='1'}catch(e){}nt.textContent=off?'Not counting me ✓ (tap to count me again)':'Stop counting my visits';}
nt.addEventListener('click',function(){try{var off=localStorage.getItem('kjt-notrack')==='1';localStorage.setItem('kjt-notrack',off?'0':'1')}catch(e){}paint()});paint();
try{localStorage.setItem('kjt-notrack',localStorage.getItem('kjt-notrack')||'1')}catch(e){}paint();
load(cur);setInterval(function(){load(cur)},60000);})();
