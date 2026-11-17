
/** Rounded, continuous outline behind the label; the front card overlaps its lower edge. */
export function LocationsLabel({ label = 'Places', pinkText = false }: { label?: string; pinkText?: boolean }) {
  return (
    <span className="home__library-stack-title" aria-hidden="true">
      <svg className="home__library-stack-label-art" width="80" height="32" viewBox="0 0 80 32">
        <text x="0" y="23" fill="#fdfbef" stroke="#fdfbef" strokeWidth="10"
          strokeLinejoin="round" strokeLinecap="round" opacity=".76">{label}</text>
        <text x="0" y="23" fill={pinkText ? 'var(--invite-color-pink)' : 'currentColor'}>{label}</text>
      </svg>
    </span>
  );
}
