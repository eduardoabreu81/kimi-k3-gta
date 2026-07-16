/* eslint-disable react-refresh/only-export-components -- módulo i18n: provider + hook + dicts */
// ============================================================================
// GTA VI Mini — i18n (PT-BR / EN), sem dependências.
// `LangProvider` (React context) + `useLang()` → { lang, setLang, t }.
// Persiste em localStorage ('gtamini.lang'), default 'pt', sincroniza
// document.documentElement.lang ('pt-BR' / 'en') em runtime.
// ============================================================================

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'pt' | 'en'

const STORAGE_KEY = 'gtamini.lang'

/* -------------------------------------------------------------- PT (base) */

const pt = {
  locale: 'pt-BR',
  nav: {
    home: 'Início',
    howTo: 'Como Jogar',
    playNow: 'Jogar Agora',
    fanEdition: 'EDIÇÃO DE FÃ',
    logoAria: 'GTA VI Mini — Início',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    drawerNote: 'Paródia não-oficial · sem fins lucrativos',
  },
  footer: {
    disclaimer:
      'GTA VI Mini — Edição de Fã é uma paródia não-oficial, sem fins lucrativos, feita por fãs. Não possui qualquer afiliação com Rockstar Games ou Take-Two Interactive. "Grand Theft Auto" e "GTA" são marcas registradas da Take-Two Interactive.',
    navigation: 'Navegação',
    play: 'Jogar',
    howTo: 'Como Jogar',
    backToTop: 'Voltar ao topo',
    credits: 'Créditos',
    madeBy: 'Feito por fãs, de graça, no navegador.',
    community: 'Comunidade',
    bottomLine: 'Paródia não-oficial · Sem fins lucrativos',
  },
  home: {
    heroAria: 'GTA VI Mini — capa',
    chip: 'EDIÇÃO DE FÃ — PARÓDIA NÃO-OFICIAL',
    tagline: 'A cidade é sua. A polícia discorda.',
    sub: 'Mini-game de navegador feito por fãs: visão clássica de cima, cidade aberta, carros roubáveis e até 5 estrelas de procurado. Direto do navegador, sem instalar nada.',
    playNow: 'Jogar Agora',
    howTo: 'Como Jogar',
    micro: 'GRÁTIS · SEM DOWNLOAD · RODA NO CELULAR',
    scroll: 'ROLE',
    marquee: [
      'PARÓDIA DE FÃ',
      'SEM AFILIAÇÃO COM A ROCKSTAR',
      '100% GRÁTIS',
      'FEITO NO NAVEGADOR',
      'GTA É MARCA DA TAKE-TWO',
    ],
    features: {
      tag: 'O JOGO',
      title: 'Tudo que um GTA de verdade tem.',
      lead: 'Só que cabe numa aba do navegador. Sem 150 GB de download.',
      items: [
        {
          title: 'Cidade Aberta',
          desc: 'Avenidas, becos, subúrbio e praia. Explore no seu ritmo — ou fuja dela a 180 por hora.',
        },
        {
          title: 'Nível de Procurado',
          desc: 'De 1 a 5 estrelas. Quanto mais caos, mais viaturas, bloqueios e sirene na sua cola.',
        },
        {
          title: 'Carros Roubáveis',
          desc: 'Aperte E perto de qualquer carro e ele é seu. Cada um acelera e derrapa de um jeito.',
        },
        {
          title: 'Trânsito Vivo',
          desc: 'Carros civis circulam pela cidade. Use o trânsito como escudo — ou como obstáculo.',
        },
        {
          title: 'Pedestres Reativos',
          desc: 'Eles passeiam, conversam e saem correndo desesperados quando você chega perto.',
        },
        {
          title: 'Minimapa em Tempo Real',
          desc: 'Viaturas, pedestres e sua posição no radar. Essencial para despistar a polícia.',
        },
      ],
    },
    showcase: {
      aria: 'Dentro do jogo',
      tag: 'DENTRO DO JOGO',
      title: 'Isto é o que roda na sua aba.',
      imgAlt:
        'Gameplay de GTA VI Mini: perseguição policial vista de cima em um cruzamento à noite',
      callouts: [
        'ESTRELAS DE PROCURADO',
        'MINIMAPA AO VIVO',
        'SEU CARRO (ROUBADO)',
        'GIROFLEX DA POLÍCIA',
      ],
    },
    wanted: {
      tag: 'A POLÍCIA',
      title: 'Cinco estrelas. Zero piedade.',
      lead: 'Bata em viaturas, cause acidentes e assuste a cidade para subir o seu procurado. Cada estrela deixa a fuga mais impossível. Passe um tempo fora da vista da polícia para as estrelas caírem.',
      levels: [
        { label: 'Procurado', desc: 'Uma viatura no seu encalço. Dá pra despistar fácil.' },
        { label: 'Fugitivo', desc: 'Duas viaturas, dirigindo muito mais agressivo.' },
        { label: 'Perigoso', desc: 'Bloqueios policiais nas avenidas e viaturas mais rápidas.' },
        { label: 'Muito Procurado', desc: 'Reforços constantes. A cidade inteira fecha o cerco.' },
        { label: 'Caos Total', desc: 'Enxame de viaturas. Sobreviva se for capaz.' },
      ],
      warmupTitle: 'Aquecendo a sirene…',
      warmupDesc: 'Contando as viaturas do bairro.',
      intensity: 'Intensidade da perseguição',
    },
    steps: {
      tag: 'O ESQUEMA',
      title: 'Roube. Corra. Sobreviva.',
      items: [
        {
          num: '01',
          title: 'Entre no carro',
          desc: 'Chegue perto de qualquer carro e aperte E. O volante é seu, a culpa também.',
        },
        {
          num: '02',
          title: 'Cause o caos',
          desc: 'Pegue o dinheiro espalhado pela cidade, assuste pedestres e provoque a polícia para valer.',
        },
        {
          num: '03',
          title: 'Sobreviva à fuga',
          desc: 'Troque de carro, corte becos e saia da vista da polícia até as estrelas sumirem.',
        },
      ],
    },
    stats: [
      'REAIS CUSTOU PRA JOGAR',
      'FEITO POR FÃS',
      'ESTRELAS DE PERIGO',
      'FUGAS PRA TENTAR',
    ],
    final: {
      titleA: 'PRONTO PARA',
      titleB: 'O CAOS?',
      sub: 'A cidade já está rodando. Só falta você apertar o acelerador.',
      cta: 'Jogar Agora — É de Graça',
      learn: 'Aprenda os controles',
    },
  },
  howto: {
    heroAria: 'Como jogar — manual',
    tag: 'COMO JOGAR',
    h1: 'Manual do fora da lei.',
    lead: 'Dois minutos de leitura e você sai dirigindo. Spoiler: a polícia não vai gostar.',
    playNow: 'Jogar Agora',
    toControls: 'Ir direto aos controles',
    imgAlt: 'Gameplay de GTA VI Mini: perseguição policial em um cruzamento à noite, visto de cima',
    chip: 'GAMEPLAY REAL (SIM, É NO NAVEGADOR)',
    controls: {
      tag: 'CONTROLES',
      title: 'Duas mãos no teclado.',
      lead: 'No celular, os controles viram um joystick na tela. Simples assim.',
      onFoot: 'A pé',
      driving: 'Dirigindo',
      or: 'ou',
      space: 'ESPAÇO',
      footRows: ['Andar', 'Correr', 'Entrar no carro'],
      driveRows: ['Acelerar', 'Freio / ré', 'Esterçar', 'Freio de mão (drift)', 'Sair do carro'],
      pause: 'Pausar',
      mute: 'Ligar/desligar som',
      mouseNote: 'nada — é tudo no teclado, raiz.',
    },
    objective: {
      tag: 'A MISSÃO',
      title: 'Qual é a missão?',
      items: [
        {
          title: 'Ganhe dinheiro',
          a: 'Colete o dinheiro espalhado pela cidade e some na conta. Simples:',
          k: 'money' as const,
          b: ' no canto da tela.',
        },
        {
          title: 'Suba o procurado',
          a: 'Caos chama polícia. Colisões, sustos e destruição enchem suas estrelas — e sua pontuação.',
          k: null as null,
          b: '',
        },
        {
          title: 'Sobreviva',
          a: 'Se for detido ou destruído, acabou. Seu recorde fica salvo no navegador.',
          k: null as null,
          b: '',
        },
      ],
      footnote: 'Nenhum pedestre foi ferido de verdade. Eles são pixels e correm muito bem.',
    },
    wanted: {
      tag: 'A POLÍCIA',
      title: 'Conheça suas cinco inimigas.',
      lead: 'Toque nas estrelas para ver o que cada nível faz.',
      intensity: 'Intensidade da perseguição',
      tipLabel: 'DICA:',
      warmupTitle: 'Aquecendo a sirene…',
      warmupDesc: 'Toque nas estrelas para ver o que cada nível faz.',
      levels: [
        {
          label: 'Procurado',
          desc: 'Uma viatura patrulha atrás de você.',
          bullets: ['1 viatura', 'velocidade normal', 'sem bloqueios'],
          dica: 'Duas curvas fechadas e você some do radar.',
        },
        {
          label: 'Fugitivo',
          desc: 'Duas viaturas e muito mais agressividade.',
          bullets: ['2 viaturas', 'elas tentam te fechar', 'spawn mais rápido'],
          dica: 'Use o trânsito como parede entre você e elas.',
        },
        {
          label: 'Perigoso',
          desc: 'Bloqueios policiais nas avenidas.',
          bullets: ['3+ viaturas', 'bloqueios com cones', 'viaturas mais rápidas'],
          dica: 'Corte pelos becos — bloqueio só existe em avenida.',
        },
        {
          label: 'Muito Procurado',
          desc: 'Reforços constantes, cerco fechando.',
          bullets: ['4+ viaturas', 'bloqueios duplos', 'elas antecipam suas curvas'],
          dica: 'Troque de carro sempre que puder — carro novo, vida nova.',
        },
        {
          label: 'Caos Total',
          desc: 'Um enxame de viaturas. Boa sorte.',
          bullets: ['enxame de viaturas', 'bloqueios em sequência', 'agressividade máxima'],
          dica: 'Não dirija em linha reta. Nunca.',
        },
      ],
      evasionTitle: 'Como as estrelas caem',
      evasionDesc:
        'Saia da vista das viaturas e as estrelas começam a piscar. Aguente firme alguns segundos sem ser visto e elas zeram. Quanto mais estrelas, mais tempo escondido.',
    },
    mechanics: {
      tag: 'MECÂNICAS',
      title: 'Coisas que a cidade esconde.',
      items: [
        {
          title: 'Dinheiro pela cidade',
          a: 'Notas verdes brilhando em calçadas, praças e praia. Passe por cima e o',
          k: 'money' as const,
          b: ' é seu.',
        },
        {
          title: 'Carros têm vida própria',
          a: 'Bata demais e o carro começa a soltar fumaça… depois faísca… depois explode. Saia antes com',
          k: 'keyE' as const,
          b: '.',
        },
        {
          title: 'Vida e dano',
          a: 'Capotamentos e explosões tiram sua vida. A barra no canto pulsa quando estiver feio.',
          k: null as null,
          b: '',
        },
        {
          title: 'Freio de mão salva',
          a: '',
          k: 'keySpace' as const,
          b: ' em alta velocidade faz o carro derrapar e virar na hora. É assim que se despista viatura.',
        },
      ],
    },
    tips: {
      tag: 'SOBREVIVA',
      title: 'Cinco truques de quem nunca foi pego.',
      items: [
        {
          num: '01',
          bold: 'Beco é amigo',
          rest: ' — viaturas são ruins em curvas apertadas; avenidas são território delas.',
        },
        {
          num: '02',
          bold: 'Troque de carro no meio da fuga',
          rest: ' — alguns segundos a pé confundem o cerco.',
        },
        { num: '03', bold: 'Freio de mão na entrada da curva', rest: ', nunca no meio dela.' },
        {
          num: '04',
          bold: 'O minimapa mostra viaturas antes de você vê-las',
          rest: ' — olhe para ele mais do que para a estrada.',
        },
        { num: '05', bold: 'Estrelas piscando = quase livre.', rest: ' Não faça graça nessa hora.' },
      ],
    },
    faq: {
      tag: 'DÚVIDAS',
      title: 'Perguntas de quem acabou de chegar.',
      items: [
        {
          q: 'Isso é o GTA VI oficial?',
          a: 'Não. É uma paródia feita por fãs, de graça, sem nenhuma ligação com a Rockstar ou a Take-Two. O GTA VI de verdade é só com eles.',
        },
        {
          q: 'Precisa instalar ou criar conta?',
          a: 'Nada disso. Abriu a página, apertou Jogar Agora, já está dentro da cidade.',
        },
        {
          q: 'Funciona no celular?',
          a: 'Sim. Os controles viram um joystick virtual e botões na tela. No teclado, a experiência é a clássica.',
        },
        {
          q: 'Meu progresso fica salvo?',
          a: 'Seu recorde e suas configurações (som, modo CRT) ficam salvos no próprio navegador.',
        },
        {
          q: 'Tem como zerar o jogo?',
          a: 'Não existe final — existe recorde. Sobreviva mais, colete mais, chegue às 5 estrelas e volte para contar.',
        },
      ],
    },
    cta: {
      title: 'TEORIA APRENDIDA. HORA DA PRÁTICA.',
      sub: 'A cidade não vai se assustar sozinha.',
      cta: 'Jogar Agora',
    },
  },
  game: {
    loading: 'Carregando a cidade…',
    canvasAria:
      'Tela do jogo GTA VI Mini. Use W A S D ou setas para se mover, E para entrar ou sair do carro, espaço para freio de mão, M para som e Esc para pausar.',
    surrenderCause: 'se entregou à polícia',
    hud: {
      wanted: 'Procurado',
      time: 'TEMPO',
      health: 'VIDA',
      onFoot: 'A PÉ',
      pauseAria: 'Pausar jogo (Esc)',
      unmuteAria: 'Ativar som (M)',
      muteAria: 'Silenciar (M)',
      minimapAria: 'Minimapa da cidade',
      healthBarAria: 'Vida',
      srHealth: (v: number) => `Vida ${v} por cento.`,
      srMoney: (v: string) => `Dinheiro R$ ${v}.`,
      srWanted: (n: number, evading: boolean) =>
        `Procurado: ${n} de 5 estrelas${evading ? ', despistando' : ''}.`,
      srNoWanted: 'Sem nível de procurado.',
      srSpeed: (v: number) => `Velocidade ${v} quilômetros por hora.`,
      srOnFoot: 'A pé.',
      srTime: (clock: string) => `Tempo ${clock}.`,
    },
    pause: {
      dialogAria: 'Jogo pausado',
      title: 'PAUSADO',
      continue: 'Continuar',
      restart: 'Reiniciar',
      howTo: 'Como Jogar',
      backHome: 'Voltar ao Início',
      surrender: 'Desistir da fuga',
      sound: 'Som',
      soundAria: 'Som ligado ou desligado (M)',
      crt: 'Modo CRT',
      crtAria: 'Modo CRT (scanlines)',
      vibration: 'Vibração',
      vibrationAria: 'Vibração em dispositivos móveis',
      reduceMotion: 'Reduzir movimento',
      reduceMotionAria: 'Reduzir movimento',
      language: 'Idioma',
      controls: [
        { keys: ['WASD'], label: 'DIRIGIR/ANDAR', wide: true },
        { keys: ['E'], label: 'ENTRAR/SAIR', wide: false },
        { keys: ['ESPAÇO'], label: 'FREIO DE MÃO', wide: true },
        { keys: ['SHIFT'], label: 'CORRER', wide: true },
        { keys: ['M'], label: 'SOM', wide: false },
        { keys: ['ESC'], label: 'PAUSAR', wide: true },
      ],
      escContinue: 'ESC — CONTINUAR',
    },
    over: {
      busted: 'DETIDO',
      wasted: 'SE DEU MAL',
      bustedSub: 'A polícia te pegou. A fuga acabou.',
      wastedSub: 'Você foi destruído no meio do caos.',
      bustedAria: 'Fim de jogo: detido',
      wastedAria: 'Fim de jogo: se deu mal',
      causeExplosion: 'Seu carro virou saudade.',
      causeRollover: 'A física venceu dessa vez.',
      report: 'RELATÓRIO DA FUGA',
      newRecord: 'NOVO RECORDE!',
      speedRecord: 'Recorde de velocidade. Na direção errada.',
      rows: [
        'TEMPO DE FUGA',
        'DISTÂNCIA PERCORRIDA',
        'DINHEIRO COLETADO',
        'PROCURADO MÁXIMO',
        'CARROS ROUBADOS',
        'PONTUAÇÃO',
      ],
      playAgain: 'Jogar Novamente',
      backHome: 'Voltar ao Início',
      seeHowTo: 'Ver Como Jogar',
      rPlayAgain: 'R — JOGAR NOVAMENTE',
      srStats: (
        clock: string,
        km: string,
        money: string,
        maxWanted: number,
        cars: number,
        score: string,
      ) =>
        `Estatísticas da fuga: tempo ${clock}, distância ${km}, dinheiro coletado ${money}, procurado máximo ${maxWanted} de 5 estrelas, carros roubados ${cars}, pontuação ${score}.`,
    },
    touch: {
      joystickAria: 'Joystick virtual: arraste para mover ou dirigir',
      brakeAria: 'Freio de mão',
      enterCarAria: 'Entrar no carro',
      exitCarAria: 'Sair do carro',
      brake: 'FREIO',
      exit: 'SAIR',
      enter: 'ENTRAR',
    },
    stars: {
      level: (n: number) => `Nível de procurado ${n}`,
      group: (n: number) => `Nível de procurado: ${n} de 5 estrelas`,
    },
  },
}

export type Dict = typeof pt

/* ------------------------------------------------------------------- EN */

const en: Dict = {
  locale: 'en-US',
  nav: {
    home: 'Home',
    howTo: 'How to Play',
    playNow: 'Play Now',
    fanEdition: 'FAN EDITION',
    logoAria: 'GTA VI Mini — Home',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    drawerNote: 'Unofficial parody · non-profit',
  },
  footer: {
    disclaimer:
      'GTA VI Mini — Fan Edition is an unofficial, non-profit parody made by fans. It has no affiliation whatsoever with Rockstar Games or Take-Two Interactive. "Grand Theft Auto" and "GTA" are registered trademarks of Take-Two Interactive.',
    navigation: 'Navigation',
    play: 'Play',
    howTo: 'How to Play',
    backToTop: 'Back to top',
    credits: 'Credits',
    madeBy: 'Made by fans, for free, in the browser.',
    community: 'Community',
    bottomLine: 'Unofficial parody · Non-profit',
  },
  home: {
    heroAria: 'GTA VI Mini — cover',
    chip: 'FAN EDITION — UNOFFICIAL PARODY',
    tagline: 'The city is yours. The cops disagree.',
    sub: 'A fan-made browser mini-game: classic top-down view, open city, stealable cars and up to 5 wanted stars. Straight from your browser, nothing to install.',
    playNow: 'Play Now',
    howTo: 'How to Play',
    micro: 'FREE · NO DOWNLOAD · RUNS ON YOUR PHONE',
    scroll: 'SCROLL',
    marquee: [
      'FAN PARODY',
      'NOT AFFILIATED WITH ROCKSTAR',
      '100% FREE',
      'MADE IN THE BROWSER',
      'GTA IS A TAKE-TWO TRADEMARK',
    ],
    features: {
      tag: 'THE GAME',
      title: 'Everything a real GTA has.',
      lead: 'Except it fits in a browser tab. No 150 GB download.',
      items: [
        {
          title: 'Open City',
          desc: 'Avenues, alleys, suburbs and a beach. Explore at your own pace — or flee it at 180 per hour.',
        },
        {
          title: 'Wanted Level',
          desc: 'From 1 to 5 stars. The more chaos, the more cruisers, roadblocks and sirens on your tail.',
        },
        {
          title: 'Stealable Cars',
          desc: 'Press E near any car and it is yours. Each one accelerates and drifts its own way.',
        },
        {
          title: 'Living Traffic',
          desc: 'Civilian cars cruise around the city. Use traffic as a shield — or as an obstacle.',
        },
        {
          title: 'Reactive Pedestrians',
          desc: 'They stroll, chat and sprint away in panic when you get close.',
        },
        {
          title: 'Real-Time Minimap',
          desc: 'Cruisers, pedestrians and your position on the radar. Essential to lose the cops.',
        },
      ],
    },
    showcase: {
      aria: 'Inside the game',
      tag: 'INSIDE THE GAME',
      title: 'This is what runs in your tab.',
      imgAlt: 'GTA VI Mini gameplay: top-down police chase at an intersection at night',
      callouts: ['WANTED STARS', 'LIVE MINIMAP', 'YOUR (STOLEN) CAR', 'POLICE LIGHT BAR'],
    },
    wanted: {
      tag: 'THE COPS',
      title: 'Five stars. Zero mercy.',
      lead: 'Ram cruisers, cause wrecks and scare the city to raise your wanted level. Each star makes the escape more impossible. Stay out of police sight for a while and the stars fade.',
      levels: [
        { label: 'Wanted', desc: 'One cruiser on your tail. Easy to shake off.' },
        { label: 'Fugitive', desc: 'Two cruisers, driving way more aggressively.' },
        { label: 'Dangerous', desc: 'Roadblocks on the avenues and faster cruisers.' },
        { label: 'Most Wanted', desc: 'Constant reinforcements. The whole city closes in.' },
        { label: 'Total Chaos', desc: 'A swarm of cruisers. Survive if you can.' },
      ],
      warmupTitle: 'Warming up the siren…',
      warmupDesc: 'Counting the neighborhood cruisers.',
      intensity: 'Chase intensity',
    },
    steps: {
      tag: 'THE PLAN',
      title: 'Steal. Run. Survive.',
      items: [
        {
          num: '01',
          title: 'Get in the car',
          desc: 'Walk up to any car and press E. The wheel is yours — so is the blame.',
        },
        {
          num: '02',
          title: 'Cause chaos',
          desc: 'Grab the money scattered around the city, scare pedestrians and really poke the cops.',
        },
        {
          num: '03',
          title: 'Survive the getaway',
          desc: 'Switch cars, cut through alleys and stay out of police sight until the stars fade.',
        },
      ],
    },
    stats: [
      'BUCKS IT COST TO PLAY',
      'MADE BY FANS',
      'STARS OF DANGER',
      'GETAWAYS TO TRY',
    ],
    final: {
      titleA: 'READY FOR',
      titleB: 'THE CHAOS?',
      sub: 'The city is already running. All that is left is for you to hit the gas.',
      cta: 'Play Now — It Is Free',
      learn: 'Learn the controls',
    },
  },
  howto: {
    heroAria: 'How to play — manual',
    tag: 'HOW TO PLAY',
    h1: 'The outlaw’s manual.',
    lead: 'Two minutes of reading and you’ll be driving. Spoiler: the cops won’t like it.',
    playNow: 'Play Now',
    toControls: 'Skip to the controls',
    imgAlt: 'GTA VI Mini gameplay: top-down police chase at an intersection at night',
    chip: 'REAL GAMEPLAY (YES, IN THE BROWSER)',
    controls: {
      tag: 'CONTROLS',
      title: 'Two hands on the keyboard.',
      lead: 'On mobile, the controls become an on-screen joystick. That simple.',
      onFoot: 'On foot',
      driving: 'Driving',
      or: 'or',
      space: 'SPACE',
      footRows: ['Walk', 'Run', 'Enter the car'],
      driveRows: ['Accelerate', 'Brake / reverse', 'Steer', 'Handbrake (drift)', 'Exit the car'],
      pause: 'Pause',
      mute: 'Toggle sound',
      mouseNote: 'nothing — it’s all keyboard, old school.',
    },
    objective: {
      tag: 'THE MISSION',
      title: 'What’s the mission?',
      items: [
        {
          title: 'Make money',
          a: 'Collect the cash scattered around the city and watch it pile up. Simple:',
          k: 'money' as const,
          b: ' in the corner of the screen.',
        },
        {
          title: 'Raise the heat',
          a: 'Chaos attracts cops. Crashes, scares and destruction fill your stars — and your score.',
          k: null as null,
          b: '',
        },
        {
          title: 'Survive',
          a: 'Get busted or destroyed and it’s over. Your record is saved in the browser.',
          k: null as null,
          b: '',
        },
      ],
      footnote: 'No pedestrians were actually harmed. They are pixels and they run really well.',
    },
    wanted: {
      tag: 'THE COPS',
      title: 'Meet your five enemies.',
      lead: 'Tap the stars to see what each level does.',
      intensity: 'Chase intensity',
      tipLabel: 'TIP:',
      warmupTitle: 'Warming up the siren…',
      warmupDesc: 'Tap the stars to see what each level does.',
      levels: [
        {
          label: 'Wanted',
          desc: 'One cruiser patrolling behind you.',
          bullets: ['1 cruiser', 'normal speed', 'no roadblocks'],
          dica: 'Two sharp turns and you vanish from the radar.',
        },
        {
          label: 'Fugitive',
          desc: 'Two cruisers and way more aggression.',
          bullets: ['2 cruisers', 'they try to box you in', 'faster spawns'],
          dica: 'Use traffic as a wall between you and them.',
        },
        {
          label: 'Dangerous',
          desc: 'Police roadblocks on the avenues.',
          bullets: ['3+ cruisers', 'cone roadblocks', 'faster cruisers'],
          dica: 'Cut through the alleys — roadblocks only exist on avenues.',
        },
        {
          label: 'Most Wanted',
          desc: 'Constant reinforcements, the net closing in.',
          bullets: ['4+ cruisers', 'double roadblocks', 'they anticipate your turns'],
          dica: 'Switch cars whenever you can — new car, new life.',
        },
        {
          label: 'Total Chaos',
          desc: 'A swarm of cruisers. Good luck.',
          bullets: ['swarm of cruisers', 'back-to-back roadblocks', 'maximum aggression'],
          dica: 'Don’t drive in a straight line. Ever.',
        },
      ],
      evasionTitle: 'How the stars fade',
      evasionDesc:
        'Get out of the cruisers’ sight and the stars start blinking. Hold on for a few seconds unseen and they reset. The more stars, the longer you must hide.',
    },
    mechanics: {
      tag: 'MECHANICS',
      title: 'Things the city hides.',
      items: [
        {
          title: 'Money around the city',
          a: 'Green bills glowing on sidewalks, squares and the beach. Roll over them and the',
          k: 'money' as const,
          b: ' is yours.',
        },
        {
          title: 'Cars have a life of their own',
          a: 'Crash too much and the car starts smoking… then sparking… then it explodes. Get out first with',
          k: 'keyE' as const,
          b: '.',
        },
        {
          title: 'Health and damage',
          a: 'Rollovers and explosions drain your health. The corner bar pulses when things get ugly.',
          k: null as null,
          b: '',
        },
        {
          title: 'Handbrake saves the day',
          a: '',
          k: 'keySpace' as const,
          b: ' at high speed makes the car drift and turn on a dime. That’s how you shake a cruiser.',
        },
      ],
    },
    tips: {
      tag: 'SURVIVE',
      title: 'Five tricks from someone who’s never been caught.',
      items: [
        {
          num: '01',
          bold: 'Alleys are your friends',
          rest: ' — cruisers are bad at tight corners; avenues are their territory.',
        },
        {
          num: '02',
          bold: 'Switch cars mid-getaway',
          rest: ' — a few seconds on foot confuses the net.',
        },
        { num: '03', bold: 'Handbrake at the corner entrance', rest: ', never in the middle of it.' },
        {
          num: '04',
          bold: 'The minimap shows cruisers before you see them',
          rest: ' — watch it more than the road.',
        },
        { num: '05', bold: 'Blinking stars = almost free.', rest: ' Don’t get cocky right then.' },
      ],
    },
    faq: {
      tag: 'QUESTIONS',
      title: 'Questions from newcomers.',
      items: [
        {
          q: 'Is this the official GTA VI?',
          a: 'No. It’s a fan-made parody, free, with no connection to Rockstar or Take-Two. The real GTA VI is only from them.',
        },
        {
          q: 'Do I need to install anything or sign up?',
          a: 'None of that. Open the page, hit Play Now and you’re already inside the city.',
        },
        {
          q: 'Does it work on mobile?',
          a: 'Yes. The controls become a virtual joystick and on-screen buttons. On a keyboard, it’s the classic experience.',
        },
        {
          q: 'Is my progress saved?',
          a: 'Your record and your settings (sound, CRT mode) are saved in your own browser.',
        },
        {
          q: 'Can you beat the game?',
          a: 'There’s no ending — there’s a record. Survive longer, collect more, reach 5 stars and come back to tell the tale.',
        },
      ],
    },
    cta: {
      title: 'THEORY LEARNED. TIME FOR PRACTICE.',
      sub: 'The city won’t scare itself.',
      cta: 'Play Now',
    },
  },
  game: {
    loading: 'Loading the city…',
    canvasAria:
      'GTA VI Mini game screen. Use W A S D or the arrow keys to move, E to enter or exit cars, space for the handbrake, M for sound and Esc to pause.',
    surrenderCause: 'surrendered to the police',
    hud: {
      wanted: 'Wanted',
      time: 'TIME',
      health: 'HEALTH',
      onFoot: 'ON FOOT',
      pauseAria: 'Pause game (Esc)',
      unmuteAria: 'Unmute (M)',
      muteAria: 'Mute (M)',
      minimapAria: 'City minimap',
      healthBarAria: 'Health',
      srHealth: (v: number) => `Health ${v} percent.`,
      srMoney: (v: string) => `Money R$ ${v}.`,
      srWanted: (n: number, evading: boolean) =>
        `Wanted: ${n} of 5 stars${evading ? ', evading' : ''}.`,
      srNoWanted: 'No wanted level.',
      srSpeed: (v: number) => `Speed ${v} kilometers per hour.`,
      srOnFoot: 'On foot.',
      srTime: (clock: string) => `Time ${clock}.`,
    },
    pause: {
      dialogAria: 'Game paused',
      title: 'PAUSED',
      continue: 'Continue',
      restart: 'Restart',
      howTo: 'How to Play',
      backHome: 'Back to Home',
      surrender: 'Give up the getaway',
      sound: 'Sound',
      soundAria: 'Sound on or off (M)',
      crt: 'CRT Mode',
      crtAria: 'CRT mode (scanlines)',
      vibration: 'Vibration',
      vibrationAria: 'Vibration on mobile devices',
      reduceMotion: 'Reduce motion',
      reduceMotionAria: 'Reduce motion',
      language: 'Language',
      controls: [
        { keys: ['WASD'], label: 'DRIVE/WALK', wide: true },
        { keys: ['E'], label: 'ENTER/EXIT', wide: false },
        { keys: ['SPACE'], label: 'HANDBRAKE', wide: true },
        { keys: ['SHIFT'], label: 'RUN', wide: true },
        { keys: ['M'], label: 'SOUND', wide: false },
        { keys: ['ESC'], label: 'PAUSE', wide: true },
      ],
      escContinue: 'ESC — CONTINUE',
    },
    over: {
      busted: 'BUSTED',
      wasted: 'WASTED',
      bustedSub: 'The cops got you. The getaway is over.',
      wastedSub: 'You were destroyed in the middle of the chaos.',
      bustedAria: 'Game over: busted',
      wastedAria: 'Game over: wasted',
      causeExplosion: 'Your car is history now.',
      causeRollover: 'Physics won this time.',
      report: 'GETAWAY REPORT',
      newRecord: 'NEW RECORD!',
      speedRecord: 'A speed record. In the wrong direction.',
      rows: [
        'GETAWAY TIME',
        'DISTANCE COVERED',
        'CASH COLLECTED',
        'MAX WANTED',
        'CARS STOLEN',
        'SCORE',
      ],
      playAgain: 'Play Again',
      backHome: 'Back to Home',
      seeHowTo: 'See How to Play',
      rPlayAgain: 'R — PLAY AGAIN',
      srStats: (
        clock: string,
        km: string,
        money: string,
        maxWanted: number,
        cars: number,
        score: string,
      ) =>
        `Getaway stats: time ${clock}, distance ${km}, cash collected ${money}, max wanted ${maxWanted} of 5 stars, cars stolen ${cars}, score ${score}.`,
    },
    touch: {
      joystickAria: 'Virtual joystick: drag to move or drive',
      brakeAria: 'Handbrake',
      enterCarAria: 'Enter the car',
      exitCarAria: 'Exit the car',
      brake: 'BRAKE',
      exit: 'EXIT',
      enter: 'ENTER',
    },
    stars: {
      level: (n: number) => `Wanted level ${n}`,
      group: (n: number) => `Wanted level: ${n} of 5 stars`,
    },
  },
}

/* ------------------------------------------------------------- provider */

const dictionaries: Record<Lang, Dict> = { pt, en }

export interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** dicionário do idioma atual */
  t: Dict
}

const LangContext = createContext<LangContextValue | null>(null)

function readStoredLang(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === 'pt' || v === 'en') return v
  } catch {
    /* storage indisponível — default pt */
  }
  return 'pt'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang)

  /* persiste + sincroniza <html lang> (index.html estático é pt-BR) */
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* storage indisponível — ignora */
    }
  }, [lang])

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: dictionaries[lang] }),
    [lang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang deve ser usado dentro de <LangProvider>')
  return ctx
}
