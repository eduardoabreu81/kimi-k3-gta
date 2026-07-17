// ============================================================================
// GTA VI Mini — CONTRATO ENGINE <-> UI
// Este arquivo é o ÚNICO ponto de acoplamento entre a engine do jogo
// (src/game/engine.ts e módulos internos) e a UI React (src/pages/Game.tsx,
// src/components/game/*). NÃO alterar sem atualizar os dois lados.
// ============================================================================

export type GameOverKind = 'busted' | 'wasted';

export interface RunStats {
  timeSec: number;       // duração da corrida
  moneyEarned: number;   // R$ coletado na corrida
  carsStolen: number;    // carros roubados
  maxWanted: number;     // maior nível de procurado atingido (0..5)
  distanceKm: number;    // distância dirigida
  score: number;         // pontuação final calculada pela engine
}

export interface GameOverPayload {
  kind: GameOverKind;    // 'busted' = DETIDO, 'wasted' = SE DEU MAL
  cause: string;         // no idioma ativo da engine — ex.: "explosão"/"explosion", "cercado pela polícia"/"surrounded by the police"
  stats: RunStats;
  best: number;          // melhor score salvo em localStorage
  isRecord: boolean;
}

export interface HudState {
  health: number;        // 0..100
  money: number;         // R$ atual
  wanted: number;        // 0..5 estrelas
  evading: boolean;      // true = despistando (estrelas piscam)
  speedKmh: number;      // velocidade atual
  inVehicle: boolean;
  splash: { text: string; sub?: string } | null;  // mensagem central grande
  toast: string | null;                            // mensagem pequena temporária
  hint: string | null;   // dica contextual, ex.: "Aperte E para roubar o carro"
  objective: string | null; // objetivo persistente (missão de entrega), ex.: "Entregue o carro no ponto dourado"
  paused: boolean;
  muted: boolean;
  crt: boolean;          // modo CRT (scanlines) ligado
  gameOver: GameOverPayload | null;
}

export interface TouchInput {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
  action?: boolean;      // botão de ação (entrar/sair do carro)
  brake?: boolean;       // freio de mão
}

export interface GameHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  toggleMute(): void;
  surrender?(): void;      // desiste da fuga → game over 'busted' com stats reais
  toggleCrt(): void;
  setTouchInput(t: TouchInput): void;
  /** troca o idioma das strings da engine (splash/toast/hint/cause) e re-emite o HudState atual */
  setLanguage?(lang: 'pt' | 'en'): void;
  destroy(): void;       // cancela rAF, remove listeners, fecha AudioContext
}

export interface CreateGameOptions {
  canvas: HTMLCanvasElement;   // canvas principal fullscreen (engine desenha)
  minimap: HTMLCanvasElement;  // canvas do minimapa circular (engine desenha)
  onHud: (h: HudState) => void; // engine chama quando algo do HUD muda
}

export type CreateGame = (opts: CreateGameOptions) => GameHandle;

// A engine DEVE exportar em src/game/engine.ts:
//   export const createGame: CreateGame = (opts) => { ... }
// A UI consome com:  import { createGame } from '@/game/engine';
