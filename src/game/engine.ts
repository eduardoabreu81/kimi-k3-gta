// ============================================================================
// GTA VI Mini — engine.ts
// Ponto de entrada da engine: `createGame(opts)` conforme src/game/types.ts.
// Um único requestAnimationFrame; cidade estática pré-renderizada (city.ts) +
// camada dinâmica por cima; HUD entregue à UI React via onHud (eventos
// imediatos, valores contínuos com throttle ~10 Hz).
// ============================================================================

import type {
  CreateGame,
  GameHandle,
  GameOverPayload,
  HudState,
  RunStats,
  TouchInput,
} from './types';
import {
  clamp,
  lerp,
  damp,
  rand,
  chance,
  dist2,
  storageGet,
  storageSet,
  storageGetInt,
} from './util';
import { City, SIZE } from './city';
import { Player } from './player';
import { GameAudio } from './audio';
import { WantedSystem } from './wanted';
import type { CrimeKind } from './wanted';
import { PoliceForce } from './police';
import { PedestrianManager } from './pedestrians';
import {
  makeCiv,
  stepCar,
  moveCar,
  carSpeed,
  kmhOf,
  lateralSpeed,
  updateCiv,
  drawCar,
  DriftMarks,
  CAR_MAX_SPEED,
} from './vehicles';
import type { Car, CarControl, Obstacle } from './vehicles';

// ── Tuning de gameplay ───────────────────────────────────────────────────────
const CIV_TRAFFIC = 14; // carros civis circulando (cap game.md §9)
const CIV_PARKED = 10; // carros estacionados roubáveis
const PICKUP_COUNT = 26; // notas de R$ espalhadas
const PICKUP_VALUE = 250; // R$ por nota (game.md §4.1)
const EVADE_REWARD_PER_STAR = 250; // recompensa por despistar
const KM_PER_PX = 1 / 800; // 800px do mundo = 1 km (mapa ≈ 2,56 km)
const BEST_KEY = 'gtamini.recorde.score';
const BEST_MONEY_KEY = 'gtamini.recorde.dinheiro';
const BEST_TIME_KEY = 'gtamini.recorde.tempo';
const CRT_KEY = 'gtamini.crt';

// ── i18n da engine (todas as strings visíveis vivem aqui, nos 2 idiomas) ────
type EngineLang = 'pt' | 'en';

const STRINGS = {
  pt: {
    wanted: 'PROCURADO', // splash: `PROCURADO ★★★`
    gotAway: 'DESPISTOU A POLÍCIA',
    stealCar: 'ROUBE UM CARRO (E)',
    lowHealth: 'SAÚDE BAIXA',
    flee: 'FUJA DA POLÍCIA',
    outOfSight: 'FORA DE VISTA…',
    carStolen: 'CARRO ROUBADO',
    hintSteal: 'Aperte E para roubar o carro',
    hintBrake: 'ESPAÇO — FREIO DE MÃO',
    hintSound: 'M — SOM',
    hintExit: 'E — SAIR DO CARRO',
    tooFastExit: 'MUITO RÁPIDO — FREIA PRIMEIRO!',
    causes: {
      shot: 'alvejado pela polícia',
      surrounded: 'cercado pela polícia',
      explosion: 'explosão',
      crash: 'batida',
      surrender: 'se entregou à polícia',
    },
  },
  en: {
    wanted: 'WANTED', // splash: `WANTED ★★★`
    gotAway: 'YOU GOT AWAY',
    stealCar: 'STEAL A CAR (E)',
    lowHealth: 'LOW HEALTH',
    flee: 'RUN FROM THE COPS',
    outOfSight: 'OUT OF SIGHT…',
    carStolen: 'CAR STOLEN',
    hintSteal: 'Press E to steal the car',
    hintBrake: 'SPACE — HANDBRAKE',
    hintSound: 'M — SOUND',
    hintExit: 'E — EXIT CAR',
    tooFastExit: 'TOO FAST — BRAKE FIRST!',
    causes: {
      shot: 'shot by the police',
      surrounded: 'surrounded by the police',
      explosion: 'explosion',
      crash: 'crash',
      surrender: 'surrendered to the police',
    },
  },
} as const;

type CauseId = keyof (typeof STRINGS)['pt']['causes'];

/** Mensagens de HUD "com chave" — permitem re-traduzir o que está visível. */
type SplashMsg =
  | { id: 'wanted'; stars: number }
  | { id: 'gotAway'; sub: string }
  | { id: 'stealCar' }
  | { id: 'lowHealth' };
type ToastMsg = { id: 'flee' | 'outOfSight' | 'carStolen' | 'tooFastExit' };
type HintMsg = 'hintSteal' | 'hintBrake' | 'hintSound' | 'hintExit';

type Phase = 'playing' | 'paused' | 'gameover';

interface Pickup {
  x: number;
  y: number;
  taken: boolean;
  respawnT: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
}

/** Score final calculado pela engine (documentado no game-over). */
function computeScore(s: RunStats): number {
  return (
    s.moneyEarned +
    s.carsStolen * 250 +
    s.maxWanted * 400 +
    Math.floor(s.distanceKm * 150) +
    Math.floor(s.timeSec * 5)
  );
}

export const createGame: CreateGame = (opts) => {
  const { canvas, minimap, onHud } = opts;
  const ctx = canvas.getContext('2d')!;
  const mm = minimap.getContext('2d')!;

  // ── Estado fundamental ────────────────────────────────────────────────────
  let phase: Phase = 'playing';
  let destroyed = false;
  let raf = 0;
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  let mmCss = 180;
  let vignette: CanvasGradient | null = null;

  const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionMq.matches;

  const audio = new GameAudio();
  const city = new City();
  const police = new PoliceForce();
  const peds = new PedestrianManager(city);
  const driftMarks = new DriftMarks();

  let player = new Player(city.playerSpawn.x, city.playerSpawn.y);
  let cars: Car[] = [];
  let playerCar: Car | null = null;
  let nearCar: Car | null = null;
  let lastFreeX = 0;
  let lastFreeY = 0;
  let stuckT = 0;

  let time = 0; // relógio de animações (congela no pause)
  let playTime = 0; // tempo da corrida
  let health = 100;

  // Câmera.
  let camX = player.x;
  let camY = player.y;
  let zoom = 1;
  let shakeAmp = 0;
  let whiteFlash = 0;
  let redFlash = 0;
  let ringFlash = 0; // anel vermelho do minimapa ao ganhar estrela

  // Efeitos.
  let pickups: Pickup[] = [];
  let particles: Particle[] = [];
  let floaters: Floater[] = [];
  let tracers: Tracer[] = [];

  // Stats da corrida.
  let money = 0;
  let moneyEarned = 0;
  let carsStolen = 0;
  let maxWanted = 0;
  let distancePx = 0;

  // Controle de dicas/mensagens.
  let drivingSince = -1;
  let mHintT = 0;
  let mHintDone = false;
  let lowHealthWarned = false;
  let scareCd = 0;
  let ramCd = 0; // cooldown do crime "bater em viatura"

  // ── HUD ────────────────────────────────────────────────────────────────────
  const hud: HudState = {
    health: 100,
    money: 0,
    wanted: 0,
    evading: false,
    speedKmh: 0,
    inVehicle: false,
    splash: null,
    toast: null,
    hint: null,
    paused: false,
    muted: audio.muted,
    crt: storageGet(CRT_KEY, '1') === '1',
    gameOver: null,
  };
  let hudLastSent = '';
  let hudAccum = 1; // força emissão no primeiro frame
  let hudForce = false;
  let splashT = 0;
  let toastT = 0;

  // ── Idioma ativo da engine + mensagens visíveis (para re-emissão) ─────────
  let lang: EngineLang = 'pt';
  let S: (typeof STRINGS)[EngineLang] = STRINGS[lang];
  let splashMsg: SplashMsg | null = null;
  let toastMsg: ToastMsg | null = null;
  let hintMsg: HintMsg | null = null;
  let gameOverCause: CauseId | null = null;

  function renderSplash(m: SplashMsg): { text: string; sub?: string } {
    switch (m.id) {
      case 'wanted':
        return { text: `${S.wanted} ${'★'.repeat(m.stars)}` };
      case 'gotAway':
        return { text: S.gotAway, sub: m.sub };
      case 'stealCar':
        return { text: S.stealCar };
      case 'lowHealth':
        return { text: S.lowHealth };
    }
  }

  function pushHud(force = false): void {
    if (force) hudForce = true;
  }

  function flushHud(dt: number): void {
    hudAccum += dt;
    if (hudAccum < 0.1 && !hudForce) return; // ~10 Hz para valores contínuos
    const snapshot = JSON.stringify(hud);
    if (snapshot !== hudLastSent || hudForce) {
      hudLastSent = snapshot;
      onHud({
        ...hud,
        splash: hud.splash ? { ...hud.splash } : null,
        gameOver: hud.gameOver
          ? { ...hud.gameOver, stats: { ...hud.gameOver.stats } }
          : null,
      });
    }
    hudAccum = 0;
    hudForce = false;
  }

  function showSplash(msg: SplashMsg, dur = 1.9): void {
    splashMsg = msg;
    const r = renderSplash(msg);
    hud.splash = { text: r.text, sub: r.sub };
    splashT = dur;
    pushHud(true);
  }

  function showToast(msg: ToastMsg, dur = 2.4): void {
    toastMsg = msg;
    hud.toast = S[msg.id];
    toastT = dur;
    pushHud(true);
  }

  // ── Wanted (eventos → splash/áudio/HUD) ───────────────────────────────────
  const wanted = new WantedSystem({
    onLevelUp: (lvl) => {
      maxWanted = Math.max(maxWanted, lvl);
      showSplash({ id: 'wanted', stars: lvl });
      audio.starUp();
      ringFlash = 1.2;
      if (lvl === 1) showToast({ id: 'flee' }, 3);
    },
    onEvadeStart: () => {
      showToast({ id: 'outOfSight' });
    },
    onCleared: (clearedLevel) => {
      const reward = clearedLevel * EVADE_REWARD_PER_STAR;
      addMoney(reward, px(), py());
      showSplash({ id: 'gotAway', sub: `+R$ ${reward}` });
      audio.starDown();
    },
  });

  function crime(stars: number, kind: CrimeKind): void {
    wanted.addCrime(stars, kind);
  }

  // ── Dinheiro ───────────────────────────────────────────────────────────────
  function addMoney(n: number, x: number, y: number): void {
    money += n;
    moneyEarned += n;
    hud.money = money;
    floaters.push({ x, y: y - 14, text: `+R$ ${n}`, color: '#FFD60A', t: 0 });
    pushHud(true);
  }

  // ── Posição de referência do jogador (a pé ou no carro) ───────────────────
  function px(): number {
    return playerCar ? playerCar.x : player.x;
  }
  function py(): number {
    return playerCar ? playerCar.y : player.y;
  }
  function playerSpeedPx(): number {
    return playerCar ? carSpeed(playerCar) : player.speed;
  }

  // ── Reset completo da corrida (restart) ────────────────────────────────────
  function resetRun(): void {
    player = new Player(city.playerSpawn.x, city.playerSpawn.y);
    playerCar = null;
    nearCar = null;
    cars = [];
    // Tráfego civil (anel 240–800px: sempre tem carro passando perto do spawn).
    for (let i = 0; i < CIV_TRAFFIC; i++) {
      const p = city.randomRoadPoint(240, player.x, player.y, 800);
      cars.push(makeCiv(p.x, p.y, p.vertical, false));
    }
    for (let i = 0; i < CIV_PARKED; i++) {
      const p = city.randomRoadPoint(120, player.x, player.y);
      const c = makeCiv(p.x, p.y, p.vertical, true);
      // Encosta na lateral da rua, alinhado com ela.
      if (p.vertical) c.x += 22;
      else c.y += 22;
      cars.push(c);
    }
    // Carro inicial garantido encostado na calçada do spawn (abertura do jogo).
    const starter = makeCiv(900, 800, false, true);
    starter.y = 836;
    cars.push(starter);
    police.reset();
    peds.reset(player.x, player.y);
    wanted.reset();
    driftMarks.clear();
    pickups = [];
    for (let i = 0; i < PICKUP_COUNT; i++) pickups.push(spawnPickup());
    particles = [];
    floaters = [];
    tracers = [];
    money = 0;
    moneyEarned = 0;
    carsStolen = 0;
    maxWanted = 0;
    distancePx = 0;
    health = 100;
    playTime = 0;
    drivingSince = -1;
    mHintT = 0;
    mHintDone = false;
    lowHealthWarned = false;
    scareCd = 0;
    ramCd = 0;
    shakeAmp = 0;
    whiteFlash = 0;
    redFlash = 0;
    ringFlash = 0;
    splashT = 0;
    toastT = 0;
    camX = player.x;
    camY = player.y;
    zoom = 1;
    hud.health = 100;
    hud.money = 0;
    hud.wanted = 0;
    hud.evading = false;
    hud.speedKmh = 0;
    hud.inVehicle = false;
    hud.splash = null;
    hud.toast = null;
    hud.hint = null;
    hud.gameOver = null;
    hud.paused = false;
    splashMsg = null;
    toastMsg = null;
    hintMsg = null;
    gameOverCause = null;
    showSplash({ id: 'stealCar' }, 3);
    pushHud(true);
  }

  function spawnPickup(): Pickup {
    const p = city.randomRoadPoint(200, px(), py());
    return {
      x: clamp(p.x + rand(-40, 40), 40, SIZE - 40),
      y: clamp(p.y + rand(-40, 40), 40, SIZE - 40),
      taken: false,
      respawnT: 0,
      phase: rand(0, Math.PI * 2),
    };
  }

  // ── Entrada (teclado + touch compartilham o mesmo estado) ─────────────────
  const keys = { up: false, down: false, left: false, right: false, run: false, brake: false };
  const touch: { up: boolean; down: boolean; left: boolean; right: boolean; action: boolean; brake: boolean } = {
    up: false, down: false, left: false, right: false, action: false, brake: false,
  };
  let actionEdge = false;

  function input() {
    return {
      up: keys.up || touch.up,
      down: keys.down || touch.down,
      left: keys.left || touch.left,
      right: keys.right || touch.right,
      run: keys.run,
      brake: keys.brake || touch.brake,
    };
  }

  function onKeyDown(e: KeyboardEvent): void {
    audio.ensure(); // primeiro gesto destrava o AudioContext (autoplay policy)
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.up = true;
        e.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = true;
        e.preventDefault();
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = true;
        e.preventDefault();
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.run = true;
        break;
      case 'Space':
        keys.brake = true;
        e.preventDefault();
        break;
      case 'KeyE':
        if (!e.repeat) actionEdge = true;
        break;
      // ESC/M/R são da UI React (Game.tsx) — engine NÃO os escuta (evita duplo-toggle).
      case 'KeyP':
        if (!e.repeat) {
          if (phase === 'playing') handle.pause();
          else if (phase === 'paused') handle.resume();
        }
        break;
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.run = false;
        break;
      case 'Space':
        keys.brake = false;
        break;
    }
  }

  function onBlur(): void {
    // Perdeu o foco: pausa para não morrer injustamente.
    if (phase === 'playing') handle.pause();
  }

  // ── Resize (devicePixelRatio) ──────────────────────────────────────────────
  function resize(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    const css = minimap.clientWidth > 0 ? minimap.clientWidth : 180;
    mmCss = css;
    minimap.width = Math.round(css * dpr);
    minimap.height = Math.round(css * dpr);
    // Vignette radial pré-computado por tamanho de tela.
    const g = ctx.createRadialGradient(
      viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.42,
      viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.72,
    );
    g.addColorStop(0, 'rgba(7,3,15,0)');
    g.addColorStop(1, 'rgba(7,3,15,0.55)');
    vignette = g;
  }

  // ── Partículas / efeitos ───────────────────────────────────────────────────
  function shake(amount: number): void {
    if (reducedMotion) return; // acessibilidade: sem shake
    shakeAmp = Math.min(10, Math.max(shakeAmp, amount));
  }

  function spawnSparks(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(80, 260);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.15, 0.4),
        maxLife: 0.4,
        size: rand(1.5, 3),
        color: '#FFB347',
        drag: 4,
      });
    }
  }

  function spawnSmoke(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: x + rand(-6, 6),
        y: y + rand(-6, 6),
        vx: rand(-24, 24),
        vy: rand(-44, -12),
        life: rand(0.5, 1.1),
        maxLife: 1.1,
        size: rand(4, 9),
        color,
        drag: 1.5,
      });
    }
  }

  function spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(60, 340);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.3, 0.8),
        maxLife: 0.8,
        size: rand(3, 8),
        color: chance(0.5) ? '#FF7A29' : '#FF3B3B',
        drag: 2.5,
      });
    }
    spawnSmoke(x, y, 14, 'rgba(90,90,100,0.8)');
  }

  function updateParticles(dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - p.drag * dt);
      p.vy *= Math.max(0, 1 - p.drag * dt);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].t += dt;
      if (floaters[i].t > 1.1) floaters.splice(i, 1);
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].t -= dt;
      if (tracers[i].t <= 0) tracers.splice(i, 1);
    }
  }

  // ── Dano ao jogador ────────────────────────────────────────────────────────
  function damagePlayer(amount: number, cause: CauseId): void {
    if (phase !== 'playing') return;
    health = Math.max(0, health - amount);
    hud.health = Math.round(health);
    redFlash = Math.max(redFlash, 0.18);
    if (health < 25 && !lowHealthWarned && health > 0) {
      lowHealthWarned = true;
      showSplash({ id: 'lowHealth' });
    }
    if (health >= 25) lowHealthWarned = false;
    if (health <= 0) gameOver('wasted', cause);
  }

  // ── Entrar / sair do carro ─────────────────────────────────────────────────
  function enterCar(car: Car): void {
    playerCar = car;
    car.playerDriven = true;
    car.parked = false;
    drivingSince = playTime;
    hud.inVehicle = true;
    audio.ensure();
    audio.tick();
    if (!car.stolen) {
      car.stolen = true;
      carsStolen++;
      crime(1, 'carro');
      showToast({ id: 'carStolen' });
      peds.scareNear(car.x, car.y, 170);
    }
    pushHud(true);
  }

  function exitCar(): void {
    if (!playerCar) return;
    const car = playerCar;
    // Spawn seguro: 8 pontos ao redor, testados como CÍRCULO r=7 (igual ao
    // collision check do jogador) — evita nascer preso em parede/quina.
    const free = (x: number, y: number): boolean =>
      !city.hitSolid(x - 7, y - 7) && !city.hitSolid(x + 7, y - 7) &&
      !city.hitSolid(x - 7, y + 7) && !city.hitSolid(x + 7, y + 7);
    let placed = false;
    for (let k = 0; k < 8 && !placed; k++) {
      const a = car.angle + (k * Math.PI) / 4;
      const sx = car.x + Math.cos(a) * 36;
      const sy = car.y + Math.sin(a) * 36;
      if (free(sx, sy)) {
        player.place(sx, sy);
        placed = true;
      }
    }
    if (!placed) player.place(car.x, car.y); // centro: o carro estava ali, é livre
    lastFreeX = player.x;
    lastFreeY = player.y;
    stuckT = 0;
    car.playerDriven = false;
    // Estilo GTA: o carro CONTINUA ROLANDO (freio de mão puxa sozinho no
    // loop de coasting, no update) — nada de carro fincado no lugar.
    car.coasting = true;
    car.parked = false;
    playerCar = null;
    hud.inVehicle = false;
    hud.speedKmh = 0;
    audio.tick();
    peds.scareNear(car.x, car.y, 120);
    pushHud(true);
  }

  // ── Game over ──────────────────────────────────────────────────────────────
  function gameOver(kind: 'busted' | 'wasted', causeId: CauseId): void {
    if (phase === 'gameover') return;
    phase = 'gameover';
    const stats: RunStats = {
      timeSec: Math.round(playTime),
      moneyEarned,
      carsStolen,
      maxWanted,
      distanceKm: Math.round(distancePx * KM_PER_PX * 10) / 10,
      score: 0,
    };
    stats.score = computeScore(stats);
    const prevBest = storageGetInt(BEST_KEY, 0);
    const isRecord = stats.score > prevBest;
    const best = Math.max(prevBest, stats.score);
    if (isRecord) storageSet(BEST_KEY, String(stats.score));
    // Recordes paralelos do painel de estatísticas (game-over.md §7) — sempre
    // gravados no primeiro game over, depois só quando superados.
    if (moneyEarned >= storageGetInt(BEST_MONEY_KEY, 0)) storageSet(BEST_MONEY_KEY, String(moneyEarned));
    if (stats.timeSec >= storageGetInt(BEST_TIME_KEY, 0)) storageSet(BEST_TIME_KEY, String(stats.timeSec));
    gameOverCause = causeId;
    const payload: GameOverPayload = { kind, cause: S.causes[causeId], stats, best, isRecord };
    hud.gameOver = payload;
    hud.hint = null;
    hintMsg = null;
    if (kind === 'wasted') audio.explosion();
    else audio.busted();
    audio.update(0, false, 0);
    pushHud(true);
  }

  // ── Update (somente em 'playing') ──────────────────────────────────────────
  function update(dt: number): void {
    playTime += dt;
    const inp = input();

    if (playerCar) updateDriving(dt, inp);
    else updateOnFoot(dt, inp);

    // Tráfego civil (obstáculos: jogador + demais carros + viaturas + peds).
    const obstacles: Obstacle[] = [{ x: px(), y: py() }];
    for (const c of cars) obstacles.push({ x: c.x, y: c.y });
    for (const cop of police.cops) obstacles.push({ x: cop.car.x, y: cop.car.y });
    for (const ped of peds.peds) {
      if (ped.state !== 'down') obstacles.push({ x: ped.x, y: ped.y });
    }
    // Carros abandonados em movimento (saída em andamento): desaceleram
    // forte com o "freio de mão puxado" até estacionarem.
    for (const c of cars) {
      if (!c.coasting) continue;
      const sp = carSpeed(c);
      if (sp < 20) {
        c.coasting = false;
        c.parked = true;
        c.vx = 0;
        c.vy = 0;
        continue;
      }
      const drag = Math.max(0, 1 - 1.15 * dt);
      c.vx *= drag;
      c.vy *= drag;
      const impact = moveCar(c, dt, city);
      if (impact > 80) {
        c.vx = 0;
        c.vy = 0;
      }
    }
    for (const c of cars) updateCiv(c, dt, obstacles);
    // Remove destroços antigos (guincho invisível, 20s) — timer em turnCd.
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      if (c.wrecked) {
        c.turnCd += dt;
        if (c.turnCd > 20 && c !== playerCar) cars.splice(i, 1);
      }
    }
    // Reciclagem: civil muito longe volta para perto do jogador.
    for (const c of cars) {
      if (c.parked || c.playerDriven || c.wrecked) continue;
      if (dist2(c.x, c.y, px(), py()) > 980 * 980) {
        const p = city.randomRoadPoint(380, px(), py(), 760);
        const nc = makeCiv(p.x, p.y, p.vertical, false);
        c.x = nc.x;
        c.y = nc.y;
        c.angle = nc.angle;
        c.aiAxis = nc.aiAxis;
        c.aiDir = nc.aiDir;
        c.laneC = nc.laneC;
        c.civCur = 0;
      }
    }

    // Polícia (perseguição + tiros + DETIDO).
    police.update(dt, {
      city,
      px: px(),
      py: py(),
      playerSpeed: playerSpeedPx(),
      wanted: wanted.level,
      time,
      onShoot: (fx, fy, hit) => {
        tracers.push({ x1: fx, y1: fy, x2: px() + rand(-8, 8), y2: py() + rand(-8, 8), t: 0.09 });
        audio.shot();
        if (hit) {
          if (playerCar) {
            playerCar.health -= 5;
            spawnSparks(px(), py(), 4);
          } else {
            damagePlayer(rand(4, 7), 'shot');
            spawnSparks(px(), py(), 3);
          }
        }
      },
    });
    if (police.checkBusted(dt, px(), py(), playerSpeedPx(), !!playerCar, wanted.level)) {
      gameOver('busted', 'surrounded');
    }

    // Pedestres + sustos perto de carro rápido.
    peds.update(dt, px(), py());
    scareCd -= dt;
    if (playerCar && carSpeed(playerCar) > 260 && scareCd <= 0) {
      scareCd = 0.3;
      peds.scareNear(px(), py(), 150);
    }

    // Procurado (evasão depende de nenhuma viatura vendo o jogador).
    wanted.update(dt, police.canSee(px(), py()));
    ramCd = Math.max(0, ramCd - dt);
    for (const c of cars) c.hitCd = Math.max(0, c.hitCd - dt);
    for (const cop of police.cops) cop.car.hitCd = Math.max(0, cop.car.hitCd - dt);

    // Pickups de dinheiro.
    const collectR = playerCar ? 32 : 24;
    for (const p of pickups) {
      if (p.taken) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) {
          const np = spawnPickup();
          p.x = np.x;
          p.y = np.y;
          p.taken = false;
        }
        continue;
      }
      if (dist2(p.x, p.y, px(), py()) < collectR * collectR) {
        p.taken = true;
        p.respawnT = 24;
        addMoney(PICKUP_VALUE, p.x, p.y);
        audio.pickup();
      }
    }

    driftMarks.update(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateHudFields(dt);

    // Áudio contínuo: motor (pitch por velocidade) + sirene por proximidade.
    const rpm = playerCar ? carSpeed(playerCar) / CAR_MAX_SPEED : 0;
    const near = police.nearestDist(px(), py());
    const siren = police.cops.length > 0 ? clamp(1 - near / 650, 0, 1) : 0;
    audio.update(rpm, !!playerCar, siren);

    actionEdge = false;
  }

  function updateOnFoot(dt: number, inp: ReturnType<typeof input>): void {
    const prevX = player.x;
    const prevY = player.y;
    player.update(dt, inp, city);
    // Recuperação anti-trava: com input de movimento mas sem sair do lugar
    // por 1,25s (ex.: quina de parede), volta para a última posição livre.
    const moved = Math.hypot(player.x - prevX, player.y - prevY);
    const wantsMove = inp.up || inp.down || inp.left || inp.right;
    if (moved > 0.5) {
      lastFreeX = player.x;
      lastFreeY = player.y;
      stuckT = 0;
    } else if (wantsMove) {
      stuckT += dt;
      if (stuckT > 1.25) {
        player.place(lastFreeX, lastFreeY);
        stuckT = 0;
      }
    } else {
      stuckT = 0;
    }
    // Carro roubável mais próximo (civis; viaturas ficam trancadas).
    nearCar = null;
    let best = 58 * 58;
    for (const c of cars) {
      if (c.wrecked || c.playerDriven) continue;
      const d = dist2(c.x, c.y, player.x, player.y);
      if (d < best) {
        best = d;
        nearCar = c;
      }
    }
    if (actionEdge && nearCar) enterCar(nearCar);
  }

  function updateDriving(dt: number, inp: ReturnType<typeof input>): void {
    const car = playerCar!;
    const ctl: CarControl = {
      up: inp.up,
      down: inp.down,
      steer: (inp.right ? 1 : 0) - (inp.left ? 1 : 0),
      handbrake: inp.brake,
    };
    stepCar(car, dt, ctl);
    const impact = moveCar(car, dt, city);
    if (impact > 60) handleWallImpact(car, impact);
    distancePx += carSpeed(car) * dt;

    // Drift: marcas com fade ~6s + fumaça branca baixa.
    const drifting = (ctl.handbrake && carSpeed(car) > 200) || (lateralSpeed(car) > 110 && carSpeed(car) > 180);
    if (drifting) {
      driftMarks.add(car, dt);
      if (chance(0.5)) spawnSmoke(car.x, car.y, 1, 'rgba(220,220,230,0.5)');
    }
    // Dano do carro: fumaça cinza crescente abaixo de 40%.
    if (car.health < 40 && chance(0.3)) {
      spawnSmoke(car.x, car.y, 1, car.health < 18 ? 'rgba(60,60,66,0.85)' : 'rgba(120,120,128,0.6)');
    }
    // Explosão do carro com o jogador dentro → SE DEU MAL.
    if (car.health <= 0) {
      spawnExplosion(car.x, car.y);
      shake(10);
      gameOver('wasted', 'explosion');
      return;
    }

    // Atropelamentos (cartoon) — cada ped derrubado é um crime.
    const hits = peds.runOverCheck(car);
    for (let i = 0; i < hits; i++) {
      crime(1, 'atropelo');
      audio.bump();
      shake(3);
    }

    handleCarCollisions(car);

    // Sair do carro: liberado até ~90 km/h (estilo GTA, o carro segue
    // rolando); acima disso, avisa e nega — nada de pulo em alta velocidade.
    if (actionEdge) {
      if (carSpeed(car) < 300) exitCar();
      else {
        showToast({ id: 'tooFastExit' });
        audio.tick();
      }
    }
  }

  /** Colisão do carro do jogador com prédios: dano, shake, faíscas e som. */
  function handleWallImpact(car: Car, impact: number): void {
    if (impact > 140) {
      car.health -= (impact - 140) / 14;
      audio.crash(clamp(impact / CAR_MAX_SPEED, 0, 1));
      shake(clamp(impact / 55, 2, 10));
      spawnSparks(car.x, car.y, Math.round(clamp(impact / 40, 4, 14)));
      if (impact > 260) {
        damagePlayer((impact - 260) / 22, 'crash');
        whiteFlash = Math.max(whiteFlash, 0.08);
      }
      peds.scareNear(car.x, car.y, 170);
    } else {
      audio.crash(0.18);
      spawnSparks(car.x, car.y, 3);
    }
  }

  /** Colisões carro×carro (civis, estacionados e viaturas). */
  function handleCarCollisions(car: Car): void {
    const targets: Car[] = [];
    for (const c of cars) if (c !== car) targets.push(c); // destroços também bloqueiam
    for (const cop of police.cops) targets.push(cop.car);
    for (const o of targets) {
      const minD = 44;
      const d2 = dist2(car.x, car.y, o.x, o.y);
      if (d2 >= minD * minD || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = (o.x - car.x) / d;
      const ny = (o.y - car.y) / d;
      // Velocidade de aproximação ao longo da normal.
      const closing = (car.vx - o.vx) * nx + (car.vy - o.vy) * ny;
      // Separa (empurra o jogador para fora; viatura cede metade).
      const overlap = minD - d;
      const give = o.kind === 'cop' ? 0.5 : 1;
      car.x -= nx * overlap * give;
      car.y -= ny * overlap * give;
      if (o.kind === 'cop') {
        o.x += nx * overlap * 0.5;
        o.y += ny * overlap * 0.5;
      }
      if (closing <= 0) continue; // já estão se separando
      const impact = Math.abs(closing);
      // Mata a componente de aproximação (com leve ricochete).
      car.vx -= nx * closing * 1.15;
      car.vy -= ny * closing * 1.15;
      if (o.kind === 'civ') {
        // Civil envolvido para quase na hora (não "atravessa" o jogador).
        o.civCur = Math.min(o.civCur, 20);
      }
      // Dano de carro×carro só com impacto real e fora do cooldown do par.
      if (impact < 110 || o.hitCd > 0) continue;
      o.hitCd = 0.6;
      car.health -= impact / 22;
      audio.crash(clamp(impact / CAR_MAX_SPEED, 0, 1));
      shake(clamp(impact / 60, 2, 10));
      spawnSparks((car.x + o.x) / 2, (car.y + o.y) / 2, 8);
      peds.scareNear(car.x, car.y, 180);
      if (impact > 250) damagePlayer((impact - 250) / 26, 'crash');
      if (o.kind === 'cop') {
        // Bater em viatura é crime (com cooldown para não farmar estrelas).
        if (impact > 130 && ramCd <= 0) {
          ramCd = 1.5;
          crime(1, 'viatura');
        }
      } else if (!o.wrecked) {
        o.honkT = 1;
        o.health -= impact / 10;
        if (o.health <= 0) {
          o.wrecked = true;
          o.honkT = 0;
          o.turnCd = 0; // inicia o timer de remoção do destroço
          spawnExplosion(o.x, o.y);
        }
      }
    }
  }

  // ── Câmera (segue + lookahead + zoom dinâmico + shake) ─────────────────────
  function updateCamera(dt: number): void {
    const vx = playerCar ? playerCar.vx : player.vx;
    const vy = playerCar ? playerCar.vy : player.vy;
    const sp = Math.hypot(vx, vy);
    // Lookahead de 60px na direção da velocidade (game.md §2.3).
    const look = sp > 40 ? 60 : 0;
    const tx = px() + (sp > 0 ? (vx / sp) * look : 0);
    const ty = py() + (sp > 0 ? (vy / sp) * look : 0);
    camX = lerp(camX, tx, damp(0.08, dt));
    camY = lerp(camY, ty, damp(0.08, dt));
    const kmh = playerCar ? kmhOf(playerCar) : 0;
    const zoomTarget = !playerCar ? 1 : kmh > 140 ? 0.75 : 0.85;
    zoom = lerp(zoom, zoomTarget, damp(0.05, dt));
    shakeAmp *= Math.exp(-dt * 9); // decaimento exponencial ~300ms
  }

  // ── Campos contínuos do HUD + timers de mensagens ──────────────────────────
  function updateHudFields(dt: number): void {
    hud.speedKmh = Math.round(playerCar ? kmhOf(playerCar) : player.speed * 0.3);
    hud.health = Math.round(health);
    hud.wanted = wanted.level;
    hud.evading = wanted.evading;
    hud.inVehicle = !!playerCar;

    // Splash / toast com expiração.
    if (splashT > 0) {
      splashT -= dt;
      if (splashT <= 0) {
        hud.splash = null;
        splashMsg = null;
        pushHud(true);
      }
    }
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) {
        hud.toast = null;
        toastMsg = null;
        pushHud(true);
      }
    }

    // Dica contextual (game.md §4.4).
    let hint: HintMsg | null = null;
    if (!playerCar && nearCar) hint = 'hintSteal';
    else if (playerCar && playTime - drivingSince < 5) hint = 'hintBrake';
    else if (mHintDone === false && playTime > 10) {
      hint = 'hintSound';
      mHintT += dt;
      if (mHintT > 3) mHintDone = true;
    } else if (playerCar && carSpeed(playerCar) < 40) hint = 'hintExit';
    if (hint !== hintMsg) {
      hintMsg = hint;
      hud.hint = hint ? S[hint] : null;
      pushHud(true);
    }

    ringFlash = Math.max(0, ringFlash - dt);
    whiteFlash = Math.max(0, whiteFlash - dt);
    redFlash = Math.max(0, redFlash - dt);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render(): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#07030F';
    ctx.fillRect(0, 0, viewW, viewH);

    // Shake de tela (contínuo leve acima de 160 km/h; desligado com reduced-motion).
    let shX = 0;
    let shY = 0;
    if (!reducedMotion) {
      const kmh = playerCar ? kmhOf(playerCar) : 0;
      const cont = kmh > 160 ? 1 : 0;
      const amp = shakeAmp + cont;
      shX = (Math.random() - 0.5) * 2 * amp;
      shY = (Math.random() - 0.5) * 2 * amp;
    }

    ctx.save();
    ctx.translate(viewW / 2 + shX, viewH / 2 + shY);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const vw = viewW / zoom;
    const vh = viewH / zoom;
    const view = { x: camX - vw / 2, y: camY - vh / 2, w: vw, h: vh };

    // Cidade estática (somente o recorte visível do offscreen).
    const sx = clamp(view.x, 0, SIZE);
    const sy = clamp(view.y, 0, SIZE);
    const ex = clamp(view.x + view.w, 0, SIZE);
    const ey = clamp(view.y + view.h, 0, SIZE);
    if (ex > sx && ey > sy) {
      ctx.drawImage(city.staticLayer, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
    }

    // Camada dinâmica da cidade (ondas, neon, palmeiras).
    city.drawDynamic(ctx, view, time, reducedMotion);

    driftMarks.draw(ctx);

    // Pickups de dinheiro: nota verde girando (2 Hz) com glow gold fraco.
    for (const p of pickups) {
      if (p.taken) continue;
      if (p.x < view.x - 30 || p.x > view.x + view.w + 30 || p.y < view.y - 30 || p.y > view.y + view.h + 30) continue;
      const rot = time * Math.PI * 4 + p.phase;
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 14);
      g.addColorStop(0, 'rgba(255,214,10,0.25)');
      g.addColorStop(1, 'rgba(255,214,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 14, p.y - 14, 28, 28);
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(time * 2.4 + p.phase) * 2);
      ctx.rotate(Math.sin(rot) * 0.6);
      ctx.scale(Math.max(0.25, Math.abs(Math.cos(rot * 0.5))), 1);
      ctx.fillStyle = '#7CFF6B';
      ctx.fillRect(-6, -4, 12, 8);
      ctx.fillStyle = '#2E7D32';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }

    peds.draw(ctx, time);

    // Carros civis + viaturas + carro do jogador.
    for (const c of cars) drawCar(ctx, c, false);
    police.draw(ctx, time);
    if (playerCar) drawCar(ctx, playerCar, true);
    else player.draw(ctx, time);

    // Tracers dos tiros (cartoon).
    for (const t of tracers) {
      ctx.strokeStyle = `rgba(255,230,170,${clamp(t.t / 0.09, 0, 1) * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
    }

    // Partículas.
    for (const p of particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Textos flutuantes (+R$ 250).
    ctx.font = '700 13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    for (const f of floaters) {
      const a = clamp(1 - f.t / 1.1, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - f.t * 34);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // ── Efeitos em espaço de tela ────────────────────────────────────────────
    // Reflexo de sirene nas bordas (procurado ≥3, viatura a menos de ~300px).
    const nearCop = police.nearestDist(px(), py());
    if (wanted.level >= 3 && nearCop < 300 && phase === 'playing') {
      const phaseBit = Math.floor(time * 8) % 2;
      const a = 0.12;
      const gl = ctx.createLinearGradient(0, 0, 90, 0);
      gl.addColorStop(0, phaseBit === 0 ? `rgba(255,59,59,${a})` : `rgba(59,130,255,${a})`);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, 90, viewH);
      const gr = ctx.createLinearGradient(viewW, 0, viewW - 90, 0);
      gr.addColorStop(0, phaseBit === 1 ? `rgba(255,59,59,${a})` : `rgba(59,130,255,${a})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(viewW - 90, 0, 90, viewH);
    }

    // Speed lines (>150 km/h, 12 linhas radiais curtas, alpha 0.15).
    const kmhNow = playerCar ? kmhOf(playerCar) : 0;
    if (!reducedMotion && kmhNow > 150 && phase === 'playing') {
      ctx.strokeStyle = 'rgba(255,247,240,0.15)';
      ctx.lineWidth = 2;
      const cx = viewW / 2;
      const cy = viewH / 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + time * 2;
        const r0 = Math.min(viewW, viewH) * 0.42;
        const r1 = r0 + 26 + (i % 3) * 10;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    // Vignette noturno nas bordas.
    if (vignette) {
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // Vignette vermelho de dano (flash + pulso abaixo de 25% de vida).
    let redA = redFlash > 0 ? clamp(redFlash / 0.18, 0, 1) * 0.4 : 0;
    if (health < 25 && phase === 'playing') {
      redA = Math.max(redA, 0.22 + 0.12 * Math.sin(time * Math.PI * 2 * 1.6));
    }
    if (redA > 0.01) {
      const g = ctx.createRadialGradient(
        viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.35,
        viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.7,
      );
      g.addColorStop(0, 'rgba(255,71,87,0)');
      g.addColorStop(1, `rgba(255,71,87,${clamp(redA, 0, 0.55)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // Flash branco de colisão forte (80ms).
    if (whiteFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(whiteFlash / 0.08, 0, 1) * 0.55})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // Pausa: frame estático escurecido (o menu DOM fica por cima).
    if (phase === 'paused') {
      ctx.fillStyle = 'rgba(7,3,15,0.45)';
      ctx.fillRect(0, 0, viewW, viewH);
    }

    drawMinimap();
  }

  // ── Minimapa circular ──────────────────────────────────────────────────────
  function drawMinimap(): void {
    // Garante backing store correto se o CSS aplicou tamanho depois do mount.
    const css = minimap.clientWidth > 0 ? minimap.clientWidth : 180;
    if (css !== mmCss) resize();
    mm.setTransform(dpr, 0, 0, dpr, 0, 0);
    mm.clearRect(0, 0, css, css);
    const r = css / 2;
    mm.save();
    mm.beginPath();
    mm.arc(r, r, r - 2, 0, Math.PI * 2);
    mm.clip();

    // Fundo + mapa simplificado centrado no jogador.
    mm.fillStyle = 'rgba(13,6,24,0.85)';
    mm.fillRect(0, 0, css, css);
    const WORLD_SHOWN = 1040; // ~130m de raio (design §4.2)
    const s = css / WORLD_SHOWN;
    const cx = px();
    const cy = py();
    mm.save();
    mm.translate(r, r);
    mm.scale(s, s);
    mm.translate(-cx, -cy);
    mm.drawImage(city.minimapLayer, 0, 0, 512, 512, 0, 0, SIZE, SIZE);
    mm.restore();

    // Grid 8×8 sutil.
    mm.strokeStyle = 'rgba(201,184,232,0.06)';
    mm.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const p = (i / 8) * css;
      mm.beginPath();
      mm.moveTo(p, 0);
      mm.lineTo(p, css);
      mm.moveTo(0, p);
      mm.lineTo(css, p);
      mm.stroke();
    }

    // Blips (clamp na borda do círculo).
    const blip = (wx: number, wy: number, size: number, color: string) => {
      let bx = (wx - cx) * s;
      let by = (wy - cy) * s;
      const d = Math.hypot(bx, by);
      const maxR = r - 9;
      if (d > maxR) {
        bx = (bx / d) * maxR;
        by = (by / d) * maxR;
      }
      mm.fillStyle = color;
      mm.beginPath();
      mm.arc(r + bx, r + by, size, 0, Math.PI * 2);
      mm.fill();
    };

    for (const p of pickups) {
      if (p.taken) continue;
      const a = 0.5 + 0.5 * Math.sin(time * 3 + p.phase);
      blip(p.x, p.y, 3, `rgba(255,214,10,${0.4 + 0.6 * a})`);
    }
    for (const c of cars) {
      if (!c.wrecked) blip(c.x, c.y, 3, '#8A7BA8');
    }
    for (const ped of peds.peds) {
      if (ped.state !== 'down') blip(ped.x, ped.y, 2, 'rgba(201,184,232,0.5)');
    }
    const sirenPhase = Math.floor(time * 8) % 2;
    for (const cop of police.cops) {
      blip(cop.car.x, cop.car.y, 5, sirenPhase === 0 ? '#FF3B3B' : '#3B82FF');
    }

    // Blip do jogador: seta teal rotacionando com o heading (sempre no centro).
    const heading = playerCar ? playerCar.angle : player.angle;
    mm.save();
    mm.translate(r, r);
    mm.rotate(heading);
    mm.fillStyle = '#00E5C7';
    mm.shadowColor = '#00E5C7';
    mm.shadowBlur = 6;
    mm.beginPath();
    mm.moveTo(8, 0);
    mm.lineTo(-5, -5);
    mm.lineTo(-2, 0);
    mm.lineTo(-5, 5);
    mm.closePath();
    mm.fill();
    mm.restore();
    mm.restore(); // sai do clip

    // Borda teal com glow; pisca vermelho 3× ao ganhar estrela.
    const flashing = ringFlash > 0 && Math.floor(ringFlash * 7.5) % 2 === 0;
    mm.save();
    mm.strokeStyle = flashing ? '#FF3B3B' : '#00E5C7';
    mm.lineWidth = 2;
    mm.shadowColor = flashing ? '#FF3B3B' : '#00E5C7';
    mm.shadowBlur = 10;
    mm.beginPath();
    mm.arc(r, r, r - 2, 0, Math.PI * 2);
    mm.stroke();
    mm.restore();
  }

  // ── Loop principal (um único requestAnimationFrame) ────────────────────────
  let last = performance.now();
  function frame(now: number): void {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // cap contra saltos de aba em background
    if (phase === 'playing') {
      time += dt;
      update(dt);
    }
    render();
    flushHud(phase === 'playing' ? dt : 0.1);
  }

  // ── Listeners ──────────────────────────────────────────────────────────────
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', onBlur);
  const onMotionChange = (e: MediaQueryListEvent): void => {
    reducedMotion = e.matches;
  };
  reducedMotionMq.addEventListener('change', onMotionChange);

  resize();
  resetRun();
  raf = requestAnimationFrame(frame);

  // ── Handle público (contrato com a UI React) ───────────────────────────────
  const handle: GameHandle = {
    pause(): void {
      if (phase !== 'playing') return;
      phase = 'paused';
      hud.paused = true;
      hud.hint = null;
      hintMsg = null;
      audio.update(0, false, 0);
      pushHud(true);
    },
    resume(): void {
      if (phase !== 'paused') return;
      audio.ensure();
      phase = 'playing';
      hud.paused = false;
      last = performance.now();
      pushHud(true);
    },
    restart(): void {
      audio.ensure();
      resetRun();
      phase = 'playing';
      hud.paused = false;
      last = performance.now();
      pushHud(true);
    },
    surrender(): void {
      // "Desistir da fuga": game over real (DETIDO) com stats da corrida —
      // gameOver() já silencia o motor/sirene via audio.update(0, false, 0).
      if (phase !== 'playing' && phase !== 'paused') return;
      gameOver('busted', 'surrender');
    },
    toggleMute(): void {
      audio.ensure();
      audio.setMuted(!audio.muted);
      hud.muted = audio.muted;
      if (!audio.muted) audio.tick();
      pushHud(true);
    },
    toggleCrt(): void {
      hud.crt = !hud.crt;
      storageSet(CRT_KEY, hud.crt ? '1' : '0');
      pushHud(true);
    },
    setLanguage(next: 'pt' | 'en'): void {
      if (next === lang) return;
      lang = next;
      S = STRINGS[lang];
      // Re-emite o que estiver visível já traduzido (splash/toast/hint/cause).
      if (splashMsg) {
        const r = renderSplash(splashMsg);
        hud.splash = { text: r.text, sub: r.sub };
      }
      if (toastMsg) hud.toast = S[toastMsg.id];
      if (hintMsg) hud.hint = S[hintMsg];
      if (hud.gameOver && gameOverCause) {
        hud.gameOver = { ...hud.gameOver, cause: S.causes[gameOverCause] };
      }
      pushHud(true);
    },
    setTouchInput(t: TouchInput): void {
      const prevAction = touch.action;
      touch.up = !!t.up;
      touch.down = !!t.down;
      touch.left = !!t.left;
      touch.right = !!t.right;
      touch.action = !!t.action;
      touch.brake = !!t.brake;
      if (touch.action && !prevAction) {
        actionEdge = true;
        audio.ensure();
      }
    },
    destroy(): void {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', onBlur);
      reducedMotionMq.removeEventListener('change', onMotionChange);
      audio.dispose();
    },
  };

  return handle;
};
