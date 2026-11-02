/* Registra aberturas da página pública, não pessoas únicas. Sem IP nem rastreamento pessoal. */
(function(root){'use strict';
  const cfg=root.APP_CONFIG||{},key=`venue-${cfg.business?.id||'demo'}-page-opens`;
  const read=()=>{try{return Number(localStorage.getItem(key))||0}catch{return 0}};
  function record(){try{localStorage.setItem(key,String(read()+1))}catch{}
    if(cfg.loyalty?.mode==='server'&&root.MOCOTO_LOYALTY){
      const source=new URLSearchParams(location.search).get('source')||'';
      root.MOCOTO_LOYALTY.api('trackAccess',{source:source.slice(0,60)}).catch(()=>{});
    }
  }
  root.MOCOTO_ACCESS={read,record};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',record,{once:true});else record();
})(window);
