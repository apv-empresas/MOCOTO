(() => {
  'use strict';
  const C = window.APP_CONFIG;
  const D = window.I18N;
  const featureKeys = ['menu','reviews','visits','promotions','about','contact','location','social'];
  // Exibir somente os três atalhos solicitados. As demais páginas permanecem no projeto.
  const primaryFeatureKeys = ['visits','reviews','menu'];
  const icons = {menu:'book',reviews:'star',visits:'stamp',coupons:'ticket',promotions:'sparkles',about:'info',contact:'message',location:'pin',social:'instagram',intro:'play'};
  const langStateKey = `venue-${C.business.id}-language`;
  const visitKey = `venue-${C.business.id}-visits-demo`;
  const feedbackKey = `venue-${C.business.id}-reviews-demo`;
  const L=window.MOCOTO_LOYALTY;
  const SC=window.MOCOTO_SCORE;
  const feedbackDelivery=C.feedbackDelivery||{};
  const reviewUsesServer=()=>feedbackDelivery.mode==='server'||(feedbackDelivery.mode!=='demo'&&L.isServer());
  const submitFeedbackToServer=payload=>L.api('submitFeedback',payload,feedbackDelivery.mode==='server'?feedbackDelivery.apiUrl:undefined);
  const dom = selector => document.querySelector(selector);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const textFor = (value, lang) => typeof value === 'object' && value !== null ? (value[lang] || value.pt || '') : String(value ?? '');
  const getStored = (key, fallback) => {try {const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)} catch {return fallback}};
  const putStored = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const state = {lang:'pt',page:null,rating:{food:0,service:0,ambience:0},details:{},visitData:{visits:C.loyalty?.mode==='server'?0:(C.demo?.initialVisits||0)},needsAccountRecovery:false,audioOn:false,prevFocus:null};
  const knownLangs = ['pt','en','es'];
  const t = key => D[state.lang]?.[key] ?? D.pt?.[key] ?? key;
  const svg = key => `<svg class="line-icon" aria-hidden="true"><use href="#i-${icons[key]||key}"/></svg>`;
  const hasFeature = key => C.features?.[key] === true;
  const safeUrl = url => {try {const u=new URL(url);return (u.protocol==='https:'||u.protocol==='http:')?u.href:''}catch{return ''}};
  const external = (url,label) => {const link=safeUrl(url);return link ? `<a class="button" target="_blank" rel="noopener noreferrer" href="${safe(link)}">${safe(label)} ${svg('external')}</a>` : `<p class="note">${safe(t('notConfigured'))}</p>`};
  const demoNote = () => C.demo?.enabled ? `<p class="note">${safe(t('demoNotice'))}</p>` : '';
  const pageHeading = key => `<div class="panel-icon">${svg(key)}</div><h2 id="panel-title">${safe(t(key))}</h2><p class="panel-lede">${safe(t(key+'Lead') || t(key+'Desc'))}</p>`;
  let toastTimeout;
  let pendingReviewId = null; // preservado entre tentativas de envio
  function toast(message){const el=dom('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),2700)}

  function initBrand(){
    const {business,visuals}=C;
    dom('#header-logo').src=business.logo;dom('#hero-logo').src=business.logo;
    dom('#header-name').textContent=business.name;dom('#hero-name').textContent=business.name;dom('#footer-name').textContent=business.name;
    document.title=business.name+' · Experiência';
    const bg=dom('#background'),video=dom('#background-video');
    const b=visuals.background || {};
    const imagePath=b.image || 'assets/prato-destaque.webp';
    // CSS receives a fixed local/configured URL; no user input is interpolated here.
    if (!/['"()]/.test(imagePath))bg.style.backgroundImage=`url("${imagePath}")`;
    const rawOverlay=Number(b.overlay);const overlay=Math.min(.85,Math.max(0,Number.isFinite(rawOverlay)?rawOverlay:.65));
    bg.style.setProperty('--overlay',overlay);
    if(b.type==='video' && b.video){
      video.src=b.video;video.preload='metadata';bg.classList.add('is-video');
      video.play().catch(()=>bg.classList.remove('is-video'));
      video.addEventListener('error',()=>bg.classList.remove('is-video'));
    }else{video.removeAttribute('src');bg.classList.remove('is-video')}
    const introduction=visuals.introduction||{};
    dom('#intro-button').hidden=!(introduction.enabled&&introduction.src);
    const music=visuals.music||{};
    dom('#audio-toggle').hidden=!music.enabled;
    if(music.enabled && (music.src || music.sources?.length)){
      const audio=dom('#ambient-audio');audio.replaceChildren();audio.removeAttribute('src');
      const mimeFor=file=>({mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',aac:'audio/aac',m4a:'audio/mp4',mp4:'audio/mp4',opus:'audio/ogg'}[String(file).split('.').pop().toLowerCase()]||'');
      const candidates=[...(music.src?[{src:music.src}]:[]),...(music.sources||[])];
      for(const entry of candidates){const type=entry.type||mimeFor(entry.src);if(!entry.src||type && audio.canPlayType(type)==='')continue;
        const source=document.createElement('source');source.src=entry.src;if(type)source.type=type;audio.append(source);
      }
      audio.volume=Math.max(0,Math.min(1,Number(music.volume)??.2));audio.load();
    }
    const source=new URLSearchParams(window.location.search).get('source');
    dom('#qr-source').textContent=source ? `${t('visitSource')}: ${source.slice(0,38)}` : '';
  }
  function renderLanguages(){
    dom('#hero-description').textContent=textFor(C.business.description,state.lang);
    dom('#qr-source').textContent=new URLSearchParams(location.search).get('source') ? `${t('visitSource')}: ${new URLSearchParams(location.search).get('source').slice(0,38)}`:'';
    document.documentElement.lang=({pt:'pt-BR',en:'en',es:'es'})[state.lang];
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent=t(el.dataset.i18n);
    for(const el of document.querySelectorAll('[data-i18n-aria-label]'))el.setAttribute('aria-label',t(el.dataset.i18nAriaLabel));
    for(const el of document.querySelectorAll('[data-i18n-alt]'))el.setAttribute('alt',t(el.dataset.i18nAlt));
    for(const el of document.querySelectorAll('[data-i18n-title]'))el.setAttribute('title',t(el.dataset.i18nTitle));
    for(const el of document.querySelectorAll('[data-i18n-placeholder]'))el.setAttribute('placeholder',t(el.dataset.i18nPlaceholder));
    document.title=`${C.business.name} · ${t('siteTitleSuffix')}`;
    dom('#meta-description').setAttribute('content',t('siteDescription'));
    for(const btn of document.querySelectorAll('[data-lang]')) {const active=btn.dataset.lang===state.lang;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))}
    updateSoundButton();
    renderActions();
    if(state.page)renderPage(state.page);
    window.MOCOTO_MENU_ZOOM_REFRESH?.();
  }
  function renderActions(){
    dom('#action-grid').innerHTML=primaryFeatureKeys.filter(hasFeature).map(key=>{
      const label=key==='visits'?t('myVisits'):t(key);
      return `<button type="button" class="action-card" data-open="${key}" aria-label="${safe(label)}: ${safe(t(key+'Desc'))}">${svg(key)}<span class="action-label">${safe(label)}</span></button>`;
    }).join('');
  }
  function updateSoundButton(){const btn=dom('#audio-toggle');btn.setAttribute('aria-pressed',String(state.audioOn));btn.title=t(state.audioOn?'soundOn':'soundOff');btn.innerHTML=`${svg(state.audioOn?'volume':'mute')}<span>${safe(t(state.audioOn?'soundOn':'soundOff'))}</span>`}
  async function toggleAudio(){
    if(!C.visuals?.music?.enabled)return;
    const a=dom('#ambient-audio');
    if(state.audioOn){a.pause();state.audioOn=false;updateSoundButton();return}
    try{await a.play();state.audioOn=true;updateSoundButton()}catch{state.audioOn=false;updateSoundButton();toast(t('audioUnavailable'))}
  }
  function openPanel(key){
    if(key!=='intro'&&!hasFeature(key))return;
    if(state.page===key)return;
    state.prevFocus=document.activeElement;
    state.page=key;state.rating={food:0,service:0,ambience:0};state.details={};
    if (key==='reviews') pendingReviewId=null;
    dom('#modal-backdrop').hidden=false;document.body.style.overflow='hidden';
    renderPage(key);if(key==='visits')refreshVisitStatus();dom('#close-panel').focus();
    if(location.hash!=='#'+key)history.pushState({page:key},'',location.pathname+location.search+'#'+key)
  }
  function closePanel({fromHistory=false}={}){
    const wasOpen=!!state.page;
    dom('#panel-content').querySelector('video')?.pause();
    state.page=null;dom('#modal-backdrop').hidden=true;document.body.style.overflow='';
    if(wasOpen && !fromHistory && featureKeys.concat('intro').includes(location.hash.slice(1)))history.replaceState({},'',location.pathname+location.search);
    if(state.prevFocus && document.contains(state.prevFocus))state.prevFocus.focus();
  }
  function renderPage(key){
    if(!key)return;
    let body='';
    switch(key){
      case 'menu':body=pageMenu();break;
      case 'reviews':body=pageReviews();break;
      case 'visits':body=pageVisits();break;
      case 'promotions':body=pagePromos();break;
      case 'about':body=pageAbout();break;
      case 'contact':body=pageContact();break;
      case 'location':body=pageLocation();break;
      case 'social':body=pageSocial();break;
      case 'intro':body=pageIntro();break;
      default:return;
    }
    dom('#panel-content').innerHTML=body;
    dom('#panel-content').scrollTop=0;
    dom('.panel').scrollTo({top:0,behavior:'instant'});
  }
  function pageMenu(){
    const menuImage=menuImageFor();
    if(!menuImage)return pageHeading('menu')+`<div class="section-card menu-image-card"><p role="status">${safe(t('menuNotAvailable'))}</p></div>`;
    return pageHeading('menu')+`<div class="section-card menu-image-card"><h3>${safe(t('menuImageTitle'))}</h3><p>${safe(t('menuImageHint'))}</p><button type="button" class="menu-image-button" data-menu-zoom aria-label="${safe(t('menuExpand'))}"><img src="${safe(menuImage)}" loading="lazy" alt="${safe(t('menuImageTitle'))}"><span>${svg('external')} ${safe(t('menuExpand'))}</span></button></div>`;
  }
  function menuImageFor(lang=state.lang){
    const configured=C.menu?.images;
    const src=configured?configured[lang]:(lang==='pt'?C.menu?.image:'');
    return typeof src==='string'?src.trim():'';
  }
  function showMenuImageUnavailable(image){
    const card=image?.closest('.menu-image-card');
    if(card)card.innerHTML=`<h3>${safe(t('menuImageTitle'))}</h3><p role="status">${safe(t('menuImageUnavailable'))}</p>`;
  }
  async function waitForMenuImage(){
    const image=dom('#panel-content .menu-image-button img');
    if(!image)return;
    if(!image.complete)await new Promise(resolve=>{
      let timeout;
      const done=()=>{clearTimeout(timeout);image.removeEventListener('load',done);image.removeEventListener('error',done);resolve()};
      image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});
      timeout=setTimeout(done,1500);
    });
    if(!image.naturalWidth)showMenuImageUnavailable(image);
  }
  const reviewDetails=[['food','taste','foodTaste'],['food','temperature','foodTemperature'],['service','courtesy','serviceCourtesy'],['service','speed','serviceSpeed'],['ambience','cleanliness','ambienceCleanliness'],['ambience','comfort','ambienceComfort']];
  function publicReviewSection(){
    const publicBtns=['googleReviewUrl','tripadvisorReviewUrl'].map((key,i)=>C.business[key]?external(C.business[key],t(i?'reviewTripadvisor':'reviewGoogle')):'').filter(Boolean).join('');
    return `<section class="section-card public-review-links"><h3>${safe(t('publicReviews'))}</h3><p>${safe(t('publicReviewsDesc'))}</p><div class="button-row" style="margin-top:14px">${publicBtns||`<button type="button" class="button ghost" disabled>${safe(t('reviewGoogle'))}</button><button type="button" class="button ghost" disabled>${safe(t('reviewTripadvisor'))}</button><p class="note">${safe(t('notConfigured'))}</p>`}</div></section>`;
  }
  // Sem API externa: apenas prepara a mensagem, que o cliente CONFIRMA no próprio WhatsApp.
  // Não existe confirmação de entrega via wa.me; nunca marcar o alerta como ENVIADO.
  function customerWhatsAppLink(record){
    const number=String(C.business.feedbackWhatsapp||'').replace(/\D/g,'');
    if(!/^\d{11,15}$/.test(number))return '';
    const stars=n=> '⭐'.repeat(Number(n))+' — '+n+' estrelas';
    const message=[
      'Nova avaliação recebida pelo site — '+C.business.name,
      'Uma experiência precisa de atenção da gerência.',
      '',
      '🍽️ Comida: '+stars(record.ratings.food),
      '🤝 Atendimento: '+stars(record.ratings.service),
      '🏠 Ambiente: '+stars(record.ratings.ambience),
      '',
      '💬 Comentário do cliente:',
      record.comment || 'Cliente não deixou comentário.',
      '',
      '📍 Origem: '+(record.source||'Não informada'),
      '📅 Data: '+new Date(record.at).toLocaleString('pt-BR'),
      '🆔 Avaliação: '+record.id
    ].join('\n');
    return 'https://wa.me/'+number+'?text='+encodeURIComponent(message);
  }
  function customerWhatsAppStep(url){
    if(!url)return `<p class="note">${safe(t('reviewWhatsAppUnavailable'))}</p>`;
    return `<div class="section-card"><p>${safe(t('reviewWhatsAppConfirm'))}</p><div class="button-row" style="margin-top:14px"><a class="button" href="${safe(url)}" target="_blank" rel="noopener noreferrer">${svg('message')}${safe(t('reviewWhatsAppSend'))}</a></div><p class="note">${safe(t('reviewWhatsAppNotAutomatic'))}</p></div>`;
  }
  function starsBlock(key,label,target){
    const current=target==='detail'?state.details[key]:state.rating[key];
    return `<div class="rating-block"><label>${safe(label)}</label><div class="stars" role="group" aria-label="${safe(label)}">${[1,2,3,4,5].map(n=>`<button type="button" class="star-choice ${n<=current?'selected':''}" data-${target==='detail'?'detail':'rating'}="${key}" data-value="${n}" aria-label="${n} / 5" aria-pressed="${n===current}">★</button>`).join('')}</div></div>`;
  }
  function pageReviews(){
    const labels={food:t('rateFood'),service:t('rateService'),ambience:t('rateAmbience')};
    const ratings=Object.keys(labels).map(key=>starsBlock(key,labels[key],'rating')).join('');
    const details=reviewDetails.map(([dimension,key,label])=>starsBlock(key,t(label),'detail')).join('');
    return pageHeading('reviews')+`<form id="review-form">${ratings}<details class="review-details"><summary>${safe(t('scoreDetail'))}</summary><div class="detail-grid">${details}</div></details><label class="field">${safe(t('optionalComment'))}<textarea id="review-comment" maxlength="500" placeholder="${safe(t('commentPlaceholder'))}"></textarea></label><button type="submit" class="button">${svg('check')}${safe(t('sendReview'))}</button></form><p class="note">${safe(t('reviewNotForDiscount'))}</p>${reviewUsesServer()?'':demoNote()}`;
  }
  function cleanPhoneDigits(value){return String(value??'').replace(/\D/g,'')}
  function maskPhone(value){
    const digits=cleanPhoneDigits(value).slice(0,11);
    if(!digits)return '';
    if(digits.length<=2)return `(${digits}`;
    if(digits.length<=7)return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if(digits.length<=10)return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  function visitCount(){return Math.max(0,Number(state.visitData?.visits)||0)}
  let loyaltyMutationVersion=0;
  async function refreshVisitStatus(){
    const requestVersion=loyaltyMutationVersion;
    try{
      const result=await L.status();
      // Um GET antigo não pode sobrescrever o cartão criado enquanto aguardava.
      if(requestVersion!==loyaltyMutationVersion)return;
      state.visitData=result;
      if(state.page==='visits')renderPage('visits');
    }catch(error){
      if(requestVersion!==loyaltyMutationVersion)return;
      if(state.page==='visits')toast(error.message||t('visitApiUnavailable'));
    }
  }
  function pageVisitsRegistration(){
    const saved=(()=>{try{return localStorage.getItem('mocoto-last-phone')||state.visitData?.phone||''}catch{return state.visitData?.phone||''}})();
    // Um cliente que trocou de aparelho pode associar uma nova sessão durante
    // uma visita presencial, usando um código de uso único emitido pela gerente.
    // Não entrega sessão apenas com o telefone nem cria visita extra sem código.
    const existingForm=`<div class="section-card"><h3>${safe(t('visitCodeTitle'))}</h3><p>${safe(t('alreadyRegisteredDesc'))}</p><form id="existing-visit-code-form"><label class="field">${safe(t('customerPhone'))}<input id="visit-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" value="${safe(maskPhone(saved))}" placeholder="${safe(t('phonePlaceholder'))}" required></label><label class="field">${safe(t('visitCodeLabel'))}<input id="visit-code" type="text" spellcheck="false" autocapitalize="characters" maxlength="24" placeholder="${safe(t('visitCodePlaceholder'))}" required></label><button type="submit" class="button" id="submit-visit">${svg('check')}${safe(t('redeemVisitCode'))}</button><p class="form-status" id="visit-feedback" role="status" aria-live="polite"></p></form></div>`;
    // No primeiro acesso, peça somente o telefone. A recuperação com código
    // da gerente só aparece quando o número já existe sem sessão válida.
    return pageHeading('visits')+`<div class="section-card"><h3>${safe(t('welcomeLoyaltyTitle'))}</h3><p>${safe(t('welcomeLoyaltyDesc'))}</p><form id="visit-register-form"><label class="field">${safe(t('customerPhone'))}<input id="visit-register-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" value="${safe(maskPhone(saved))}" placeholder="${safe(t('phonePlaceholder'))}" required></label><button type="submit" class="button" id="register-phone-submit">${svg('check')}${safe(t('continueLabel'))}</button><p class="form-status" id="register-phone-feedback" role="status" aria-live="polite"></p></form></div>`+(state.needsAccountRecovery?existingForm:'');
  }
  function pageVisits(){
    const total=Math.max(1,Number(C.loyalty?.visitsToReward)||10);const count=visitCount();
    const needsRegistration=state.visitData?.notLinked===true || (!state.visitData?.clientCode && !state.visitData?.phone && !state.visitData?.visits && !state.visitData?.token && !state.visitData?.alreadyRegistered && !state.visitData?.reward && !state.visitData?.discount);
    if(needsRegistration)return pageVisitsRegistration();
    const bounded=count%total || (count>0?total:0);
    const remain=bounded===total?0:total-bounded;
    const stamps=Array.from({length:total},(_,i)=>`<div class="stamp ${i<bounded?'done':''}" aria-label="${i<bounded?'✓':i+1}">${i<bounded?svg('check'):i+1}</div>`).join('');
    const saved=(()=>{try{return localStorage.getItem('mocoto-last-phone')||state.visitData?.phone||''}catch{return state.visitData?.phone||''}})();
    const form=`<form id="visit-code-form" class="section-card"><h3>${safe(t('visitCodeTitle'))}</h3><p class="visit-hint">${safe(t('visitCodeHint'))}</p><label class="field">${safe(t('customerPhone'))}<input id="visit-phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="16" value="${safe(maskPhone(saved))}" placeholder="${safe(t('phonePlaceholder'))}" required></label><label class="field">${safe(t('visitCodeLabel'))}<input id="visit-code" type="text" inputmode="text" spellcheck="false" maxlength="24" autocapitalize="characters" placeholder="${safe(t('visitCodePlaceholder'))}" required></label><button type="submit" class="button" id="submit-visit">${svg('check')}${safe(t('redeemVisitCode'))}</button><p class="form-status" id="visit-feedback" role="status" aria-live="polite"></p></form>`;
    const demo=C.loyalty.mode!=='server'?`<p class="note">${safe(t('visitDemoLocal'))}</p>`:'';
    const firstVisitNote = count === 1 ? `<p class="note" style="margin-top:10px">${safe(t('firstVisitMessage').replace('{count}',String(total-1)))}</p>` : '';
    return pageHeading('visits')+`<div class="metric-row"><div class="metric-tile"><strong>${count}</strong><span>${safe(t('visitsCount'))}</span></div><div class="metric-tile"><strong>${remain}</strong><span>${safe(t('visitsRemaining'))}</span></div></div><div class="section-card"><h3>${safe(t('visitReward'))}</h3><p>${safe(textFor(C.demo?.reward,state.lang))}</p><div class="progress-track" role="progressbar" aria-valuenow="${bounded}" aria-valuemin="0" aria-valuemax="${total}"><div class="progress-fill" style="width:${100*bounded/total}%"></div></div><p style="font-weight:700">${bounded} / ${total} ${safe(t('visits'))}</p><div class="stamp-grid">${stamps}</div>${firstVisitNote}${remain===0?`<p class="note">${safe(t('earned'))} ${safe(t('cashierOnly'))}</p>`:''}</div>${form}<div class="button-row"><button type="button" class="button ghost" id="refresh-visits">${safe(t('visitStatus'))}</button></div>${demo}`;
  }
  function showMilestone(){
    const old=dom('#milestone-overlay');if(old)old.remove();
    const overlay=document.createElement('div');overlay.id='milestone-overlay';overlay.className='milestone-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.innerHTML=`<div class="milestone-card"><div class="milestone-stars" aria-hidden="true">${'✦'.repeat(16)}</div><div class="milestone-trophy" aria-hidden="true">★</div><h2>${safe(t('visitCompleted'))}</h2><p>${safe(t('visitCompletedBody'))}</p><button class="button" id="milestone-close">${safe(t('close'))}</button></div>`;
    document.body.append(overlay);
    const close=()=>overlay.remove();overlay.querySelector('#milestone-close').addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});overlay.querySelector('button').focus();
  }
  async function submitVisit(form){
    const button=form.querySelector('#submit-visit'),msg=form.querySelector('#visit-feedback');
    const phone=cleanPhoneDigits(form.querySelector('#visit-phone').value);
    const code=form.querySelector('#visit-code').value;
    loyaltyMutationVersion++;
    button.disabled=true;msg.textContent=t('visitPending');
    const slow=setTimeout(()=>{if(button.isConnected&&button.disabled)msg.textContent=t('visitSlow')},8000);
    try{
      const data=await L.redeem(phone,code);state.visitData=data;
      try{localStorage.setItem('mocoto-last-phone',phone)}catch{}
      renderPage('visits');toast(t('visitAccepted'));
      if(data.milestone){dom('.stamp-grid')?.classList.add('celebrate');showMilestone();}
    }catch(error){msg.textContent=error.message||t('visitInvalid')}
    finally{clearTimeout(slow);button.disabled=false}
  }
  async function submitCustomerRegistration(form){
    const button=form.querySelector('#register-phone-submit');
    const input=form.querySelector('#visit-register-phone');
    const msg=form.querySelector('#register-phone-feedback');
    const phone=cleanPhoneDigits(input.value);
    if(!/^\d{10,11}$/.test(phone)){msg.textContent=t('visitRequiresCode');button.disabled=false;return}
    loyaltyMutationVersion++;
    button.disabled=true;msg.textContent=t('registrationSubmitting');
    const slow=setTimeout(()=>{if(button.isConnected&&button.disabled)msg.textContent=t('registrationSlow')},8000);
    try{
      const data=await L.registerCustomer(phone);
      if(data.alreadyRegistered && !data.token){
        // Outro aparelho/sessão perdida: não revelar o cartão só pelo telefone.
        // O cliente pode vinculá-lo com um código válido da gerente.
        state.needsAccountRecovery=true;
        renderPage('visits');
        dom('#visit-code')?.focus();
        return;
      }
      state.needsAccountRecovery=false;
      state.visitData={...data,phone,notLinked:!data.token};
      // A sessão é persistida pelo módulo de fidelidade, sem chave duplicada aqui.
      renderPage('visits');toast(t(data.alreadyRegistered?'sessionRestored':'registrationSuccess'));
    }catch(error){
      msg.textContent=error.message||t('registrationError');
    }finally{
      clearTimeout(slow);
      button.disabled=false;
    }
  }
  async function submitReview(e){
    e.preventDefault();
    const form=e.target;
    if(Object.values(state.rating).some(n=>!n)){toast(t('requiredStars'));return}
    const button=form.querySelector('[type="submit"]');
    const comment=dom('#review-comment').value.trim().slice(0,500);
    const origin=new URLSearchParams(location.search).get('source')||'';
    const result=SC.calculate(state.rating,state.details,C.reviewScoring); // Apenas para classificação interna.
    const id=pendingReviewId||(pendingReviewId=(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`));
    const record={id,ratings:{...state.rating},details:{...state.details},comment,result,at:new Date().toISOString(),source:origin,alertStatus:!result.passes?'AGUARDANDO_CONFIRMACAO_CLIENTE':'NAO_APLICAVEL'};
    button.disabled=true;
    try{
      if(reviewUsesServer()){
        // O servidor recalcula e persiste; só confirmar ao cliente após resposta válida.
        await submitFeedbackToServer({requestId:id,ratings:state.rating,details:state.details,comment,source:origin});
      } else {
        const saved=getStored(feedbackKey,[]);
        if(!saved.some(r=>r.id===id)){saved.push(record);putStored(feedbackKey,saved)}
      }
      pendingReviewId=null;
      // Decide somente após o envio, considerando em conjunto as três categorias principais.
      const whatsappLink=!result.passes?customerWhatsAppLink(record):'';
      const thankYou=result.passes?(reviewUsesServer()?t('reviewThanks'):t('reviewThanksBody')):(reviewUsesServer()?t('reviewCare'):t('reviewCareDemo'));
      const whatsappStep=!result.passes?customerWhatsAppStep(whatsappLink):'';
      const publicReviews=result.passes?publicReviewSection():'';
      dom('#panel-content').innerHTML=`<div class="panel-icon">${svg('check')}</div><h2 id="panel-title">${safe(t('reviewThanks'))}</h2><p class="panel-lede">${safe(thankYou)}</p>${whatsappStep}${publicReviews}<p class="note">${safe(t('reviewNotForDiscount'))}</p>`;
      toast(t('reviewSaved'));
      // No modo local, a execução é síncrona desde o clique: facilita abrir nova aba no celular.
      // Se o navegador bloquear, o botão visível acima permite repetir sem perder a mensagem.
      if(whatsappLink && !reviewUsesServer() && typeof window.open==='function'){
        try{window.open(whatsappLink,'_blank','noopener,noreferrer')}catch{}
      }
    }catch(error){
      button.disabled=false;
      // Preserva as respostas para nova tentativa.
      toast(error.message||t('visitApiUnavailable'));
    }
  }
  function pagePromos(){return pageHeading('promotions')+(C.promotions||[]).map(p=>`<div class="section-card"><span class="tag">${safe(t('promotionDemo'))}</span><h3 style="margin-top:13px">${safe(textFor(p.title,state.lang))}</h3><p>${safe(textFor(p.detail,state.lang))}</p></div>`).join('')+demoNote()}
  function pageAbout(){return pageHeading('about')+`<div class="section-card"><img src="${safe(C.business.logo)}" alt="${safe(C.business.name)}" style="width:92px;height:92px;object-fit:cover;border-radius:17px;margin-bottom:16px"><h3>${safe(C.business.name)}</h3><p>${safe(textFor(C.business.about,state.lang))}</p></div>${C.business.openingHours?`<div class="section-card"><h3>${safe(t('openingHours'))}</h3><p>${safe(C.business.openingHours)}</p></div>`:''}`}
  function pageContact(){
    const b=C.business;const rows=[['whatsapp',b.whatsapp,b.whatsapp?`https://wa.me/${b.whatsapp.replace(/\D/g,'')}`:''],['phone',b.phone,b.phone?`tel:${b.phone.replace(/[^\d+]/g,'')}`:''],['email',b.email,b.email?`mailto:${b.email}`:'']];
    const links=rows.filter(r=>r[1]).map(([key,value,link])=>`<div class="contact-row"><div><span>${safe(t(key))}</span><br><small>${safe(value)}</small></div><a class="button ghost" href="${safe(link)}" ${key==='whatsapp'?'target="_blank" rel="noopener noreferrer"':''}>${safe(t('open'))}</a></div>`).join('');
    return pageHeading('contact')+`<div class="contact-list">${links||`<div class="empty-box">${safe(t('notConfigured'))}</div>`}</div>`;
  }
  function pageLocation(){return pageHeading('location')+`<div class="section-card"><h3>${safe(C.business.name)}</h3><p>${safe(C.business.address||t('notConfigured'))}</p><div style="margin-top:18px">${C.business.mapsUrl?external(C.business.mapsUrl,t('openMap')):''}</div></div>`}
  function pageSocial(){const social=[['instagram',C.business.instagramUrl],['facebook',C.business.facebookUrl],['tiktok',C.business.tiktokUrl]].filter(([_,url])=>safeUrl(url));return pageHeading('social')+(social.length?social.map(([key,url])=>`<div class="section-card"><div class="button-row" style="justify-content:space-between;align-items:center"><h3>${safe(t(key))}</h3>${external(url,t('open'))}</div></div>`).join(''):`<div class="empty-box">${safe(t('notConfigured'))}</div>`)}
  function pageIntro(){const v=C.visuals.introduction;return `<div class="panel-icon">${svg('intro')}</div><h2 id="panel-title">${safe(t('intro'))}</h2><p class="panel-lede">${safe(t('introBody'))}</p><video id="intro-player" class="video-player" src="${safe(v.src)}" poster="${safe(v.poster)}" controls autoplay muted playsinline preload="metadata"></video>`}

  let languageSwitching=false;
  function waitForLanguageTransition(layer){
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
    return new Promise(resolve=>{
      let timeout;
      const done=event=>{
        if(event&&(event.target!==layer||event.propertyName!=='transform'))return;
        clearTimeout(timeout);layer.removeEventListener('transitionend',done);resolve();
      };
      layer.addEventListener('transitionend',done);
      timeout=setTimeout(done,750);
    });
  }
  async function changeLanguage(lang){
    if(languageSwitching||!knownLangs.includes(lang)||!C.enabledLanguages.includes(lang)||lang===state.lang)return;
    languageSwitching=true;
    const buttons=[...document.querySelectorAll('[data-lang]')];
    buttons.forEach(button=>{button.disabled=true});
    const layer=dom('#language-transition');
    const status=dom('#language-transition-status');
    const languageName={pt:'Português (Brasil)',en:'English',es:'Español'}[lang];
    try{
      layer.hidden=false;
      status.textContent=t('languageChanging').replace('{language}',languageName);
      void layer.offsetWidth;
      layer.classList.add('is-covering');
      await waitForLanguageTransition(layer);
      state.lang=lang;
      try{localStorage.setItem(langStateKey,state.lang)}catch{}
      renderLanguages();
      if(state.page==='menu')await waitForMenuImage();
      layer.classList.remove('is-covering');
      layer.classList.add('is-revealing');
      await waitForLanguageTransition(layer);
    }catch(error){
      toast(error.message||t('languageChangeError'));
    }finally{
      layer.hidden=true;
      layer.classList.remove('is-covering','is-revealing');
      buttons.forEach(button=>{button.disabled=false});
      languageSwitching=false;
    }
  }

  function initEvents(){
    dom('#action-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-open]');if(btn)openPanel(btn.dataset.open)});
    dom('#intro-button').addEventListener('click',()=>openPanel('intro'));
    dom('#audio-toggle').addEventListener('click',toggleAudio);
    document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>changeLanguage(button.dataset.lang)));
    dom('#close-panel').addEventListener('click',()=>closePanel());
    dom('#modal-backdrop').addEventListener('click',e=>{if(e.target===dom('#modal-backdrop'))closePanel()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.page)closePanel();if(e.key==='Tab'&&state.page){const focusables=[...dom('.panel').querySelectorAll('button:not(:disabled),[href],input,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
    dom('#panel-content').addEventListener('input',e=>{
      const field=e.target;
      if(!(field instanceof HTMLElement))return;
      if(field.matches('#visit-register-phone, #visit-phone')){
        field.value=maskPhone(field.value);
      }
    });
    dom('#panel-content').addEventListener('error',e=>{
      if(e.target.matches?.('.menu-image-button img'))showMenuImageUnavailable(e.target);
    },true);
    dom('#panel-content').addEventListener('click',async e=>{
      const rating=e.target.closest('[data-rating]');if(rating){state.rating[rating.dataset.rating]=Number(rating.dataset.value);const row=rating.closest('.stars');for(const btn of row.querySelectorAll('[data-value]')){btn.classList.toggle('selected',Number(btn.dataset.value)<=state.rating[rating.dataset.rating]);btn.setAttribute('aria-pressed',String(Number(btn.dataset.value)===state.rating[rating.dataset.rating]))}return}
      const detail=e.target.closest('[data-detail]');if(detail){state.details[detail.dataset.detail]=Number(detail.dataset.value);const row=detail.closest('.stars');for(const btn of row.querySelectorAll('[data-value]')){btn.classList.toggle('selected',Number(btn.dataset.value)<=state.details[detail.dataset.detail]);btn.setAttribute('aria-pressed',String(Number(btn.dataset.value)===state.details[detail.dataset.detail]))}return}
      if(e.target.closest('#refresh-visits')){await refreshVisitStatus();return}
      const copy=e.target.closest('[data-copy]');if(copy){try{await navigator.clipboard.writeText(copy.dataset.copy)}catch{const temp=document.createElement('textarea');temp.value=copy.dataset.copy;temp.style.position='fixed';temp.style.opacity='0';document.body.append(temp);temp.select();document.execCommand('copy');temp.remove()}toast(t('copied'))}
    });
    dom('#panel-content').addEventListener('submit',e=>{if(e.target.id==='review-form')submitReview(e);if(e.target.id==='visit-code-form'||e.target.id==='existing-visit-code-form'){e.preventDefault();submitVisit(e.target)};if(e.target.id==='visit-register-form'){e.preventDefault();submitCustomerRegistration(e.target)}});
    window.addEventListener('popstate',()=>{const route=location.hash.slice(1);if(route&&featureKeys.concat('intro').includes(route)){state.page=route;dom('#modal-backdrop').hidden=false;document.body.style.overflow='hidden';renderPage(route)}else if(state.page)closePanel({fromHistory:true})});
  }
  function init(){
    const stored=(()=>{try{return localStorage.getItem(langStateKey)}catch{return null}})();
    state.lang=knownLangs.includes(stored)&&C.enabledLanguages.includes(stored)?stored:C.defaultLanguage;
    initBrand();renderLanguages();initEvents();
    const route=location.hash.slice(1);if(featureKeys.concat('intro').includes(route) && (route==='intro'||hasFeature(route))){state.page=route;dom('#modal-backdrop').hidden=false;document.body.style.overflow='hidden';renderPage(route)}
    // Register only on secure origins / localhost, after UI is usable.
    if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  init();
})();
