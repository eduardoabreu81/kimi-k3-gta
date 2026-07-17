import { useLang } from '@/i18n'

/* ============================================================================
   KimiBadge — crédito "Made by Kimi K3" SEMPRE visível (pedido do usuário:
   "um ícone na janela principal sempre ativo"). Pill flutuante bottom-right
   nas páginas do site (o jogo tem o seu, na top bar do HUD). Ícone oficial
   K + texto; compacta para ícone+texto curto em telas pequenas.
   ========================================================================== */
export default function KimiBadge() {
  const { t } = useLang()
  return (
    <a
      href="https://www.kimi.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.footer.kimi}
      className="group fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-violet-haze/70 bg-night-900/80 py-1.5 pl-2 pr-3 shadow-[0_4px_24px_rgba(7,3,15,0.55)] backdrop-blur-sm transition-all hover:border-teal-neon/70 hover:shadow-[0_4px_28px_rgba(0,229,199,0.25)]"
    >
      <img src="./kimi-k.svg" alt="" className="h-4 w-4" aria-hidden="true" />
      <span className="font-pixel text-[8px] uppercase tracking-[0.08em] text-text-mid transition-colors group-hover:text-text-hi">
        {t.footer.kimi}
      </span>
    </a>
  )
}
