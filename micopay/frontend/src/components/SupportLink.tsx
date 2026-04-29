type Props = {
  tradeId?: string;
  state: string;
};

const SUPPORT_EMAIL = 'support@micopay.com';

export default function SupportLink({ tradeId, state }: Props) {
  const subject = encodeURIComponent(
    `Soporte — ${tradeId ? `Trade ${tradeId.slice(0, 8)}…` : 'unknown trade'} — ${state}`
  );
  const body = encodeURIComponent(
    `Hola,\n\nNecesito ayuda.\n\nEstado: ${state}\nTrade ID: ${tradeId || 'N/A'}\n\nGracias.`
  );
  const href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium transition-colors"
    >
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
        support_agent
      </span>
      ¿Necesitas ayuda?
    </a>
  );
}