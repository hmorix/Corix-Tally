// The mark: a ledger page folded at the corner, with a rising "C" ledger-line
// that also reads as a check/tick mark (books that balance). Ink-green on
// paper, brass fold — matches the app's ledger-paper design language.
export default function Logo({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Corix Tally"
    >
      <rect x="6" y="4" width="44" height="56" rx="2" fill="#1F2A24" />
      <rect x="6" y="4" width="44" height="56" rx="2" fill="none" stroke="#EDE7D6" strokeOpacity="0.15" />
      <path d="M50 4 L50 20 L34 4 Z" fill="#A9822C" />
      <line x1="14" y1="20" x2="42" y2="20" stroke="#EDE7D6" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="28" x2="42" y2="28" stroke="#EDE7D6" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="36" x2="30" y2="36" stroke="#EDE7D6" strokeWidth="1.5" opacity="0.5" />
      <path d="M15 45 L25 55 L47 30" fill="none" stroke="#A9822C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
