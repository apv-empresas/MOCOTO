/* Cardápio original preservado. Zoom por botões, roda, toque/pinça, arraste e teclado. */
(function(root){'use strict';
 const get=id=>document.getElementById(id);let scale=1,x=0,y=0,lastFocus=null;
 const pointers=new Map();let pinchStart=0,initialScale=1,dragStart=null;
 const layer=()=>get('menu-zoom-overlay'),viewport=()=>get('menu-zoom-viewport'),pic=()=>get('menu-zoom-img');
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const draw=()=>{const image=pic();image.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;const reset=layer().querySelector('[data-menu-control="reset"]');reset.textContent=Math.round(scale*100)+'%'};
 const setScale=(n)=>{scale=clamp(n,1,6);if(scale===1){x=0;y=0;}draw()};
 function open(){lastFocus=document.activeElement;
   const cfg=root.APP_CONFIG.menu;const lang=root.document.documentElement.lang==='pt-BR'?'pt':root.document.documentElement.lang;
   const original=cfg.images?.[lang]||(lang==='pt'?cfg.image:'');if(!original)return;
   pic().src=lang==='pt'?(cfg.imageEnhanced||original):(cfg.imageEnhancedByLanguage?.[lang]||original);get('menu-original-link').href=original;
   scale=1;x=0;y=0;draw();layer().hidden=false;document.body.classList.add('menu-zoom-open');layer().querySelector('[data-menu-control="close"]').focus();}
 function refresh(){if(layer().hidden)return;const cfg=root.APP_CONFIG.menu;const lang=root.document.documentElement.lang==='pt-BR'?'pt':root.document.documentElement.lang;
   const original=cfg.images?.[lang]||(lang==='pt'?cfg.image:'');if(!original){close();return}
   pic().src=lang==='pt'?(cfg.imageEnhanced||original):(cfg.imageEnhancedByLanguage?.[lang]||original);get('menu-original-link').href=original;setScale(1);}
 function close(){layer().hidden=true;document.body.classList.remove('menu-zoom-open');pointers.clear();if(lastFocus?.isConnected)lastFocus.focus()}
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-menu-zoom]');if(trigger){e.preventDefault();open();return}
   const ctrl=e.target.closest('[data-menu-control]');if(!ctrl||layer().hidden)return;
   switch(ctrl.dataset.menuControl){case 'plus':setScale(scale*1.3);break;case 'minus':setScale(scale/1.3);break;case 'reset':setScale(1);break;case 'close':close();}
 });
 const init=()=>{const view=viewport();view.addEventListener('wheel',e=>{if(layer().hidden)return;e.preventDefault();setScale(scale*(e.deltaY<0?1.14:1/1.14))},{passive:false});
   view.addEventListener('dblclick',()=>setScale(scale>1?1:2.3));
   view.addEventListener('pointerdown',e=>{view.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)dragStart={x:e.clientX-x,y:e.clientY-y};if(pointers.size===2){const a=[...pointers.values()];pinchStart=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);initialScale=scale}});
   view.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){const a=[...pointers.values()];setScale(initialScale*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(10,pinchStart));}
     else if(scale>1&&dragStart){x=e.clientX-dragStart.x;y=e.clientY-dragStart.y;draw()}});
   for(const ev of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(ev,e=>{pointers.delete(e.pointerId);if(pointers.size===1){const a=[...pointers.values()][0];dragStart={x:a.x-x,y:a.y-y}}else if(!pointers.size)dragStart=null});
   layer().addEventListener('click',e=>{if(e.target===layer())close()});
   document.addEventListener('keydown',e=>{if(layer().hidden)return;if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='+'||e.key==='='){e.preventDefault();setScale(scale*1.25)}else if(e.key==='-'){e.preventDefault();setScale(scale/1.25)}else if(e.key==='0'){e.preventDefault();setScale(1)}});
 };
 root.MOCOTO_MENU_ZOOM_REFRESH=refresh;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
