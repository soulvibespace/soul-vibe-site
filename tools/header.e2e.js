// Автотест: на всех страницах одинаковое меню (desktop + мобильное), активная страница с aria-current.
const { chromium } = require('playwright');
// Запуск: bash build.sh, раздать dist/ с pretty URLs на :8090, затем node tools/header.e2e.js
const B=process.env.BASE||'http://localhost:8090', SH=process.env.SHOTS||'/tmp/header-shots/';
require('fs').mkdirSync(SH,{recursive:true});
const pages=['/','/about','/classes','/schedule','/pricing','/vibes','/gift-certificates','/rental','/reviews','/contact','/account','/privacy','/terms'];
const EXP=['/classes','/schedule','/pricing','/vibes','/gift-certificates','/about','/rental','/contact'];
const EXP_RU=['Занятия','Расписание','Цены','VIBES','Сертификаты','О нас','Аренда и коворкинг','Контакты'];
const EXP_MOB=['/schedule','/classes','/pricing','/vibes','/gift-certificates','/about','/rental','/reviews','/contact','/contact#faq'];
const nm=p=>p==='/'?'home':p.slice(1);
const R=[]; const ok=(n,c,x='')=>R.push(`${c?'PASS':'FAIL'} ${n} ${x}`);
(async()=>{const b=await chromium.launch(); const errs=[];
 const lists={};
 for (const [w,phone] of [[1366,false],[375,true]]) {
  const c=await b.newContext({viewport:{width:w,height:phone?760:900},deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone});
  await c.route(/onrender\.com|googletagmanager|accounts\.google|simplybook|fonts\.(googleapis|gstatic)/,r=>r.abort());
  await c.addInitScript(()=>{localStorage.setItem('svs_lang','ru');localStorage.setItem('svs_cookie_consent','all');});
  const p=await c.newPage(); p.on('pageerror',e=>errs.push(`${w} ${p.url()}: ${e.message}`));
  for (const pg of pages) {
   await p.goto(B+pg); await p.waitForTimeout(400);
   const r=await p.evaluate(()=>({
     nav:[...document.querySelectorAll('.nav .nav-link')].map(a=>[a.getAttribute('href'),a.textContent.trim(),a.getAttribute('aria-current')]),
     mob:[...document.querySelectorAll('.mobile-nav .mobile-nav-link')].map(a=>[a.getAttribute('href'),a.textContent.trim(),a.getAttribute('aria-current')]),
     actions:[...document.querySelectorAll('.header-actions > *')].map(e=>e.className.split(' ')[0]+(e.getAttribute('aria-label')?':'+e.getAttribute('aria-label'):'')).join('|'),
     hdrH:document.querySelector('.header').getBoundingClientRect().height }));
   const tag=`[${w}] ${pg}`;
   if(!phone){
    ok(`${tag} desktop nav order`, JSON.stringify(r.nav.map(x=>x[0]))===JSON.stringify(EXP), JSON.stringify(r.nav.map(x=>x[0])));
    ok(`${tag} desktop nav RU labels`, JSON.stringify(r.nav.map(x=>x[1]))===JSON.stringify(EXP_RU), r.nav.map(x=>x[1]).join('·'));
    const cur=r.nav.filter(x=>x[2]==='page').map(x=>x[0]);
    ok(`${tag} aria-current`, JSON.stringify(cur)===JSON.stringify(EXP.includes(pg)?[pg]:[]), JSON.stringify(cur));
    ok(`${tag} no Home`, !r.nav.some(x=>x[0]==='/'));
    lists.actions=lists.actions||r.actions; ok(`${tag} same right side`, r.actions===lists.actions, r.actions);
    await p.screenshot({path:SH+`hdr-ru-1366-${nm(pg)}.png`,clip:{x:0,y:0,width:w,height:110}});
   } else {
    ok(`${tag} mobile nav: 4 main + 6 studio`, JSON.stringify(r.mob.map(x=>x[0]))===JSON.stringify(EXP_MOB), JSON.stringify(r.mob.map(x=>x[0])));
    lists.mob=lists.mob||JSON.stringify(r.mob.map(x=>x[0])); ok(`${tag} mobile nav identical`, JSON.stringify(r.mob.map(x=>x[0]))===lists.mob);
    await p.click('#mobileMenuBtn'); await p.waitForTimeout(450);
    await p.screenshot({path:SH+`menu-ru-375-${nm(pg)}.png`});
   }
  }
  await c.close();
 }
 await b.close();
 console.log(R.filter(x=>x.startsWith('FAIL')).join('\n')); console.log('ERR',errs.join('\n')||'none');
 process.exitCode=R.some(x=>x.startsWith('FAIL'))?1:0; console.log('TOTAL',R.length,'FAIL',R.filter(x=>x.startsWith('FAIL')).length);
})();
