/* =============================================================
  CONFIGURAÇÃO POR ESTABELECIMENTO — EDITE APENAS ESTE ARQUIVO
  Dados e benefícios abaixo são DEMONSTRATIVOS. Substitua antes
  de disponibilizar a clientes. Links vazios não são inventados.
  A configuração no navegador NÃO substitui validação no servidor.
============================================================= */
window.APP_CONFIG = {
  business: {
    id: 'mocoto-pinheiros-demo',
    name: 'Mocotó Café Pinheiros',
    logo: 'assets/mocoto-logo.webp',
    description: {
      pt: 'Uma experiência para saborear, descobrir e compartilhar.',
      en: 'A place to savour, discover and share.',
      es: 'Una experiencia para saborear, descubrir y compartir.'
    },
    about: {
      pt: 'Bem-vindo! Acompanhe suas visitas, conheça nosso cardápio e compartilhe sua experiência.',
      en: 'Welcome! Track your visits, explore our menu and share your experience.',
      es: '¡Bienvenido! Consulta tus visitas, descubre nuestro menú y comparte tu experiencia.'
    },
    address: '',               // Endereço real, quando confirmado
    openingHours: '',          // Ex.: Seg–Sex, 11h–19h
    whatsapp: '',              // DDD+número: ex. 5511999999999
    feedbackWhatsapp: '5511916072188', // Destino para avaliação com WhatsApp aberto pelo CLIENTE (confirmação manual)
    phone: '',
    email: '',
    mapsUrl: '',               // Link oficial Google Maps
    instagramUrl: '',          // Link oficial do Instagram
    facebookUrl: '',
    tiktokUrl: '',
    tripadvisorReviewUrl: 'https://www.tripadvisor.com.br/UserReviewEdit-g303631-d9728137-Mocoto_Cafe-Sao_Paulo_State_of_Sao_Paulo.html',
    googleReviewUrl: 'https://www.google.com/search?q=cafe+pinheiros+mocoto&oq=cafe+pinheiros+mocoto&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIICAEQABgWGB4yCAgCEAAYFhgeMgoIAxAAGIAEGKIE0gEKMTIxMzNqMGoxNagCALACAA&sourceid=chrome&source=chrome.rb&ie=UTF-8#lrd=0x94ce57a102c5a159:0x5a637d871ee2257f,3'
  },
  visuals: {
    background: {
      type: 'image',          // 'image' ou 'video'
      image: 'assets/prato-destaque.webp',
      video: 'assets/apresentacao-demo.mp4',
      overlay: 0.69           // Entre 0 e 0.85
    },
    introduction: {
      enabled: true,
      src: 'assets/apresentacao-demo.mp4', // Vídeo visual ilustrativo: substitua pelo real
      poster: 'assets/prato-destaque.webp'
    },
    music: {
      enabled: true,
      src: 'assets/ovo.MP3', // Arquivo presente, capitalização preservada para hospedagem Linux
      sources: [], // Opcional: [{src:'assets/ovo.ogg',type:'audio/ogg'}, {src:'assets/ovo.m4a',type:'audio/mp4'}]
      volume: 0.22
    }
  },
  // ETAPA 2: modo local de teste ou modo servidor compartilhado.
  // Modo servidor: publique backend/Code.gs em uma planilha NOVA e configure apiUrl.
  loyalty: {
    mode: 'server',        // 'demo' ou 'server'
    apiUrl: '/api/mocoto', // Rota do servidor intermediário; ative 'server' após publicar o Apps Script
    visitsToReward: 10,
    codeLength: 5, // 1 letra + 4 números; apenas identificador, nunca senha
    discount: {enabled:true,percent:10,validityDays:14}
  },
  // Avaliações sem API: o cliente abre seu WhatsApp e confirma a mensagem pré-preenchida.
  // O registro de demonstração permanece no navegador; não há entrega automática.
  // 'server' permanece disponível para futura integração, sem alterar a fidelidade.
  feedbackDelivery: {
    mode: 'auto', // Segue loyalty.mode: demo local ou servidor compartilhado, sem duas configurações
    apiUrl: '' // Em 'auto', reutiliza a mesma API da fidelidade; WhatsApp manual do cliente foi preservado.
  },
  reviewScoring: {
    threshold: 80, // Referência para análises internas. Não controla convites públicos.
    minCategoryStars: 4, // Atendimento prioritário se QUALQUER categoria principal tiver menos de 4 estrelas.
    weights: {food:40, service:35, ambience:25},
    detailShare: 0.30, // detalhes opcionais compõem 30% da dimensão respondida
    criticalRating: 2,
    criticalCap: 69,
    criticalKeys: ['temperature','courtesy','cleanliness']
  },
  defaultLanguage: 'pt',
  enabledLanguages: ['pt','en','es'],
  features: {
    menu: true,
    reviews: true,
    visits: true,
    coupons: true,
    promotions: true,
    about: true,
    contact: true,
    location: true,
    social: true
  },
  demo: {
    enabled: true,
    initialVisits: 3,
    allowVisitSimulation: true,
    visitsToReward: 10,
    reward: {pt:'Um almoço gratuito',en:'A complimentary lunch',es:'Un almuerzo gratuito'}
  },
  menu: {
    image: 'assets/portugues.png',
    imageEnhanced: 'assets/portugues.png', // interpolação conservadora; NÃO aumenta detalhe real do texto
    images: {
      pt: 'assets/portugues.png',
      en: 'assets/ingles.png',
      es: 'assets/espanhol.png'
    },
    enableImageZoom: true
  },
  // Itens meramente ilustrativos; sem preço até configurar o cardápio real.
  menuItems: [
    {id:'destaque',category:'meals',name:{pt:'Prato em destaque',en:'Featured dish',es:'Plato destacado'},description:{pt:'Imagem e descrição de demonstração. Substitua pelo prato real.',en:'Sample photo and description. Replace with real menu item.',es:'Foto y descripción de demostración. Sustituya por el plato real.'},image:'assets/prato-destaque.webp',price:''},
    {id:'cafe',category:'drinks',name:{pt:'Bebidas da casa',en:'House drinks',es:'Bebidas de la casa'},description:{pt:'Adicione aqui cafés, sucos e outras bebidas.',en:'Add coffees, juices and other drinks here.',es:'Añada cafés, zumos y otras bebidas aquí.'},image:'',price:''},
    {id:'doce',category:'desserts',name:{pt:'Sobremesas',en:'Desserts',es:'Postres'},description:{pt:'Adicione suas sobremesas e preços.',en:'Add desserts and prices here.',es:'Añada sus postres y precios aquí.'},image:'',price:''}
  ],
  coupons: [
    {id:'demo10',code:'MOCOTO-DEMO-10',title:{pt:'Cupom de demonstração',en:'Sample coupon',es:'Cupón de demostración'},detail:{pt:'Exemplo de cupom. Não válido para consumo.',en:'Sample coupon. Not valid for purchases.',es:'Cupón de muestra. No válido para compras.'}}
  ],
  promotions: [
    {id:'promo1',title:{pt:'Sua próxima campanha aqui',en:'Your next campaign here',es:'Tu próxima campaña aquí'},detail:{pt:'Configure dias, horários, condições e cupons.',en:'Set days, times, terms and coupons.',es:'Configura días, horarios, condiciones y cupones.'}}
  ]
};
