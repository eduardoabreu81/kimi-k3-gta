// ============================================================================
// GTA VI Mini — audio.ts
// Áudio 100% sintetizado via WebAudio (osciladores + ruído), sem arquivos.
// Design: design.md §7. Volume master 0.5, mudo persistido em localStorage.
// O AudioContext só é criado/resumido após gesto do usuário (autoplay policy):
// a engine chama ensure() em keydown/cliques (resume()/restart() do handle).
// ============================================================================

import { clamp, storageGet, storageSet } from './util';

const MASTER_VOLUME = 0.5;
const MUTE_KEY = 'gtamini.som'; // '1' = som ligado, '0' = mudo

/**
 * Motor de áudio procedural. Todos os nós contínuos (motor, sirene) ficam
 * criados e têm ganho modulado; efeitos são one-shots com envelope.
 */
export class GameAudio {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  // Motor (sawtooth grave → lowpass; pitch acompanha a velocidade).
  private engOsc: OscillatorNode | null = null;
  private engGain: GainNode | null = null;
  // Sirene (dois tons 660/880 Hz alternados; volume por proximidade).
  private sirOsc: OscillatorNode | null = null;
  private sirGain: GainNode | null = null;

  muted: boolean;

  constructor() {
    this.muted = storageGet(MUTE_KEY, '1') === '0';
  }

  /** Cria o grafo de áudio (idempotente) e resume o contexto se suspenso. */
  ensure(): void {
    if (!this.ac) {
      try {
        this.ac = new AudioContext();
      } catch {
        return; // ambiente sem WebAudio — jogo segue mudo
      }
      this.build();
    }
    if (this.ac.state === 'suspended') {
      void this.ac.resume();
    }
  }

  private build(): void {
    const ac = this.ac!;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(ac.destination);

    // Buffer de ruído branco (1s) reusado por colisões/explosões.
    const len = ac.sampleRate;
    this.noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Motor.
    this.engOsc = ac.createOscillator();
    this.engOsc.type = 'sawtooth';
    this.engOsc.frequency.value = 65;
    const engFilter = ac.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 900;
    this.engGain = ac.createGain();
    this.engGain.gain.value = 0;
    this.engOsc.connect(engFilter);
    engFilter.connect(this.engGain);
    this.engGain.connect(this.master);
    this.engOsc.start();

    // Sirene.
    this.sirOsc = ac.createOscillator();
    this.sirOsc.type = 'square';
    this.sirOsc.frequency.value = 660;
    this.sirGain = ac.createGain();
    this.sirGain.gain.value = 0;
    this.sirOsc.connect(this.sirGain);
    this.sirGain.connect(this.master);
    this.sirOsc.start();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    storageSet(MUTE_KEY, m ? '0' : '1');
    if (this.master && this.ac) {
      this.master.gain.setTargetAtTime(m ? 0 : MASTER_VOLUME, this.ac.currentTime, 0.03);
    }
  }

  /**
   * Modula os sons contínuos. Chamado uma vez por frame pela engine.
   * @param rpm01   velocidade do carro normalizada 0..1 (pitch do motor)
   * @param engineOn  true enquanto o jogador dirige
   * @param siren01 intensidade da sirene (proximidade da viatura mais próxima)
   */
  update(rpm01: number, engineOn: boolean, siren01: number): void {
    if (!this.ac || !this.engGain || !this.engOsc || !this.sirGain || !this.sirOsc) return;
    const t = this.ac.currentTime;
    const rpm = clamp(rpm01, 0, 1);
    this.engGain.gain.setTargetAtTime(engineOn ? 0.05 + 0.05 * rpm : 0, t, 0.1);
    this.engOsc.frequency.setTargetAtTime(65 + 175 * rpm, t, 0.08);
    this.sirGain.gain.setTargetAtTime(clamp(siren01, 0, 1) * 0.07, t, 0.18);
    if (siren01 > 0.01) {
      // Dois tons alternados (~1.1 Hz de alternância).
      this.sirOsc.frequency.value = Math.floor(t / 0.45) % 2 === 0 ? 660 : 880;
    }
  }

  // ── One-shots ──────────────────────────────────────────────────────────────

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    if (!this.ac || !this.master) return;
    const ac = this.ac;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, cutoff: number, delay = 0): void {
    if (!this.ac || !this.master || !this.noiseBuf) return;
    const ac = this.ac;
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** Pickup de dinheiro: blip quadrado ascendente 520→1040 Hz, 120ms. */
  pickup(): void {
    this.tone('square', 520, 1040, 0.12, 0.12);
  }

  /** Colisão: burst de ruído lowpass; intensidade 0..1 por impacto. */
  crash(intensity: number): void {
    const i = clamp(intensity, 0, 1);
    this.noise(0.16 + 0.14 * i, 0.10 + 0.22 * i, 380 + 900 * i);
  }

  /** Tick de UI (hover 30ms / click 90ms). */
  tick(long = false): void {
    this.tone('square', 1800, 1800, long ? 0.09 : 0.03, 0.07);
  }

  /** Estrela ganha: arpejo menor descendente de 3 notas. */
  starUp(): void {
    this.tone('triangle', 330, 330, 0.12, 0.14, 0);
    this.tone('triangle', 262, 262, 0.12, 0.14, 0.09);
    this.tone('triangle', 220, 220, 0.16, 0.14, 0.18);
  }

  /** Estrelas perdidas (despistou): arpejo maior ascendente. */
  starDown(): void {
    this.tone('triangle', 262, 262, 0.12, 0.13, 0);
    this.tone('triangle', 330, 330, 0.12, 0.13, 0.09);
    this.tone('triangle', 392, 392, 0.18, 0.13, 0.18);
  }

  /** Explosão (SE DEU MAL): ruído filtrado + tom descendente 440→110 Hz. */
  explosion(): void {
    this.noise(0.6, 0.4, 300);
    this.tone('sawtooth', 440, 110, 0.6, 0.2);
  }

  /** DETIDO: sirene "trava" em tom fixo grave por um instante. */
  busted(): void {
    this.tone('square', 220, 200, 0.4, 0.16);
    this.tone('square', 165, 165, 0.5, 0.12, 0.25);
  }

  /** Tiro da polícia (cartoon): estalo curto de ruído agudo. */
  shot(): void {
    this.noise(0.07, 0.12, 2400);
  }

  /** Atropelo cartoon: "bump" grave curto. */
  bump(): void {
    this.tone('sine', 180, 70, 0.14, 0.18);
    this.noise(0.08, 0.08, 500);
  }

  /** Fecha o AudioContext (destroy da engine). */
  dispose(): void {
    if (this.ac) {
      void this.ac.close().catch(() => undefined);
      this.ac = null;
      this.master = null;
      this.engOsc = null;
      this.engGain = null;
      this.sirOsc = null;
      this.sirGain = null;
      this.noiseBuf = null;
    }
  }
}
