/**
 * Rodapé com avisos legais para uso em contexto de social media e dados (protótipo).
 */
export function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer
      className="border-t border-ink/10 bg-card/80 px-6 py-8 text-[12px] leading-relaxed text-ink-muted backdrop-blur-xl"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">
              Redes sociais
            </p>
            <p className="mt-2">
              Instagram, Facebook e demais redes exibidas neste painel são marcas de
              seus respectivos titulares (ex.: Instagram é marca do Meta Platforms,
              Inc.). Este ambiente é independente e não é patrocinado ou endossado
              pelo Meta ou pelo Instagram.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">
              Conteúdo e saúde
            </p>
            <p className="mt-2">
              Conteúdos educacionais não substituem consulta, diagnóstico ou
              tratamento médico. Siga sempre orientação profissional e normas do
              CFM/CRM e da legislação aplicável à publicidade em saúde.
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">
              Privacidade (LGPD)
            </p>
            <p className="mt-2">
              Dados tratados conforme a Lei nº 13.709/2018 (LGPD). Em produção,
              disponibilize Política de Privacidade, Termos de Uso e canal do
              encarregado (DPO).
            </p>
            <p className="mt-3 text-ink-subtle">
              Política de privacidade · Termos de uso (links a definir em produção)
            </p>
          </div>
        </div>
        <p className="border-t border-ink/10 pt-4 text-ink-subtle">
          © {year} MedCof / e-MedCof — produtos digitais. Identidade visual alinhada ao
          Brandbook e-MedCof 2025 (Vermelhof, cOffBlack, Inter).
        </p>
      </div>
    </footer>
  )
}
