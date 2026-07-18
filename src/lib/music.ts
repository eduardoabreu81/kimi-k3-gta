// ============================================================================
// GTA VI Mini — music.ts
// "Rádio" estilo GTA do site + jogo: 3 estações (Eletrônica, Rock, Synthwave)
// tocando os arquivos que o usuário solta em src/assets/music/<estacao>/
// (.mp3/.ogg/.wav/.m4a/.flac — descobertos no build via import.meta.glob).
// Shuffle sem repetir a última faixa; avança sozinho ao fim da música; com 1
// arquivo, ele fica em loop. A estação escolhida persiste em localStorage
// ('gtamini.radio'; 'off' = desligado). A política de autoplay é contornada
// começando no primeiro gesto (pointerdown/keydown — initRadioGestures, App).
// Player global em UM <audio>: independe de rota e do AudioContext do jogo
// (o mute "M" do jogo é só dos efeitos — a rádio tem controle próprio).
// ============================================================================

import { useSyncExternalStore } from 'react';

export type StationId = 'eletronica' | 'rock' | 'synthwave';
export const STATION_IDS: StationId[] = ['eletronica', 'rock', 'synthwave'];

const RADIO_KEY = 'gtamini.radio'; // StationId | 'off'
const DEFAULT_STATION: StationId = 'synthwave';
const VOLUME = 0.4;

export interface RadioTrack {
  url: string;
  name: string;
}

/* No build o Vite devolve URLs com hash — o nome de exibição vem da CHAVE do
   glob (caminho original do arquivo), não da URL. Prefixos de faixa
   ("04 - Noturna.mp3") são removidos do nome. */
function loadTracks(glob: Record<string, string>): RadioTrack[] {
  return Object.entries(glob)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, url]) => {
      const file = decodeURIComponent(path.split('/').pop() ?? path);
      const name = file.replace(/\.[a-z0-9]+$/i, '').replace(/^\d+[\s._-]+/, '');
      return { url, name };
    });
}

/* NOTA: as opções do import.meta.glob precisam ser um objeto literal inline
   (exigência do transform do Vite) — por isso repetidas em cada estação. */
const TRACKS: Record<StationId, RadioTrack[]> = {
  eletronica: loadTracks(
    import.meta.glob('../assets/music/eletronica/*.{mp3,ogg,wav,m4a,flac}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ),
  rock: loadTracks(
    import.meta.glob('../assets/music/rock/*.{mp3,ogg,wav,m4a,flac}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ),
  synthwave: loadTracks(
    import.meta.glob('../assets/music/synthwave/*.{mp3,ogg,wav,m4a,flac}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ),
};

export interface RadioSnapshot {
  /** estação atual; null = rádio desligado */
  station: StationId | null;
  playing: boolean;
  trackName: string | null;
  /** quantas faixas cada estação tem (0 → botão desabilitado no widget) */
  counts: Record<StationId, number>;
}

function readStoredStation(): StationId | null {
  try {
    const v = window.localStorage.getItem(RADIO_KEY);
    if (v === 'off') return null;
    if (v === 'eletronica' || v === 'rock' || v === 'synthwave') return v;
  } catch {
    /* storage indisponível */
  }
  return DEFAULT_STATION;
}

class RadioPlayer {
  private audio: HTMLAudioElement | null = null;
  private station: StationId | null = readStoredStation();
  private playing = false;
  private trackName: string | null = null;
  private lastUrl: string | null = null;
  private listeners = new Set<() => void>();
  private snap: RadioSnapshot = this.buildSnap();

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): RadioSnapshot => this.snap;

  private buildSnap(): RadioSnapshot {
    return {
      station: this.station,
      playing: this.playing,
      trackName: this.trackName,
      counts: {
        eletronica: TRACKS.eletronica.length,
        rock: TRACKS.rock.length,
        synthwave: TRACKS.synthwave.length,
      },
    };
  }

  private emit(): void {
    this.snap = this.buildSnap();
    for (const fn of this.listeners) fn();
  }

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = VOLUME;
      this.audio.addEventListener('ended', () => this.next());
    }
    return this.audio;
  }

  /** Faixa aleatória da estação, evitando repetir a que acabou de tocar. */
  private pick(): RadioTrack | null {
    if (!this.station) return null;
    const list = TRACKS[this.station];
    if (list.length === 0) return null;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && list[i].url === this.lastUrl) i = (i + 1) % list.length;
    return list[i];
  }

  private playCurrent(): void {
    const track = this.pick();
    if (!track) {
      this.playing = false;
      this.trackName = null;
      this.emit();
      return;
    }
    const a = this.ensureAudio();
    a.src = track.url;
    this.lastUrl = track.url;
    this.trackName = track.name;
    this.playing = true;
    // Se o navegador bloquear (sem gesto ainda), o próximo unlock() tenta de novo.
    a.play().catch(() => {
      this.playing = false;
      this.emit();
    });
    this.emit();
  }

  /** Primeiro gesto do usuário (autoplay policy): liga a estação salva. */
  unlock(): void {
    if (this.playing || !this.station) return;
    this.playCurrent();
  }

  /** Troca de estação; clicar na estação ATIVA desliga a rádio (estilo GTA). */
  setStation(id: StationId): void {
    if (this.station === id) {
      this.off();
      return;
    }
    this.station = id;
    this.persist();
    this.playCurrent();
  }

  off(): void {
    this.station = null;
    this.persist();
    if (this.audio) this.audio.pause();
    this.playing = false;
    this.trackName = null;
    this.emit();
  }

  /** Próxima faixa aleatória da estação atual (também o fim natural da faixa). */
  next(): void {
    if (!this.station) return;
    this.playCurrent();
  }

  private persist(): void {
    try {
      window.localStorage.setItem(RADIO_KEY, this.station ?? 'off');
    } catch {
      /* storage indisponível */
    }
  }
}

export const radio = new RadioPlayer();

/** Snapshot reativo do player para componentes React. */
export function useRadio(): RadioSnapshot {
  return useSyncExternalStore(radio.subscribe, radio.getSnapshot);
}

/**
 * Registra os listeners de "primeiro gesto" que destravam o autoplay.
 * Chamar UMA vez no nível do App; devolve o cleanup.
 */
export function initRadioGestures(): () => void {
  const on = (): void => radio.unlock();
  window.addEventListener('pointerdown', on);
  window.addEventListener('keydown', on);
  return () => {
    window.removeEventListener('pointerdown', on);
    window.removeEventListener('keydown', on);
  };
}
