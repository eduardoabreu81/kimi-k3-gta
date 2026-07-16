// ============================================================================
// GTA VI Mini — wanted.ts
// Sistema PROCURADO 0–5 estrelas: crimes sobem o nível; ficar fora da visão
// da polícia inicia a evasão (estrelas piscam) até zerar com recompensa.
// Regras: game.md §3/§5 — evasão exige alguns segundos fora de vista.
// ============================================================================

export type CrimeKind = 'carro' | 'atropelo' | 'viatura';

export interface WantedEvents {
  /** Nível subiu (newLevel 1..5). */
  onLevelUp: (newLevel: number, kind: CrimeKind) => void;
  /** Entrou em evasão (fora de vista, estrelas piscando). */
  onEvadeStart: () => void;
  /** Evasão completa: estrelas zeradas; informa o nível que foi despistado. */
  onCleared: (clearedLevel: number) => void;
}

/** Raio de visão da polícia (px) para fins de evasão. */
export const POLICE_SIGHT = 460;

export class WantedSystem {
  level = 0;
  evading = false;
  /** Progresso da evasão 0..1 (ring visual opcional na UI via evading). */
  evadeProgress = 0;
  private evadeT = 0;
  private readonly events: WantedEvents;

  constructor(events: WantedEvents) {
    this.events = events;
  }

  /** Tempo necessário fora de vista para despistar, por nível (6,8s em 1★ → 14s em 5★). */
  private evadeTimeNeeded(): number {
    return 5 + this.level * 1.8;
  }

  /** Registra um crime: sobe `stars` níveis (teto 5) e reinicia a evasão. */
  addCrime(stars: number, kind: CrimeKind): void {
    const prev = this.level;
    this.level = Math.min(5, this.level + stars);
    this.evadeT = 0;
    this.evadeProgress = 0;
    if (this.evading) {
      this.evading = false;
    }
    if (this.level > prev) this.events.onLevelUp(this.level, kind);
  }

  /**
   * Atualiza a evasão. `seen` = alguma viatura com visão do jogador neste frame.
   */
  update(dt: number, seen: boolean): void {
    if (this.level === 0) {
      this.evading = false;
      this.evadeT = 0;
      this.evadeProgress = 0;
      return;
    }
    if (seen) {
      // Voltou para a visão da polícia: zera o relógio da evasão.
      this.evadeT = 0;
      this.evadeProgress = 0;
      if (this.evading) this.evading = false;
      return;
    }
    this.evadeT += dt;
    this.evadeProgress = Math.min(1, this.evadeT / this.evadeTimeNeeded());
    if (!this.evading && this.evadeT > 0.6) {
      this.evading = true;
      this.events.onEvadeStart();
    }
    if (this.evadeT >= this.evadeTimeNeeded()) {
      const cleared = this.level;
      this.level = 0;
      this.evading = false;
      this.evadeT = 0;
      this.evadeProgress = 0;
      this.events.onCleared(cleared);
    }
  }

  reset(): void {
    this.level = 0;
    this.evading = false;
    this.evadeT = 0;
    this.evadeProgress = 0;
  }
}
