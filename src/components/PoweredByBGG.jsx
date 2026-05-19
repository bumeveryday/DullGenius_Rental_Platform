export default function PoweredByBGG({ variant = 'light', height = 28, style }) {
  const src = variant === 'dark'
    ? '/powered-by-bgg-reversed-rgb.svg'
    : '/powered-by-bgg-rgb.svg';
  return (
    <a
      href="https://boardgamegeek.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by BoardGameGeek"
      style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', ...style }}
    >
      <img src={src} alt="Powered by BGG" style={{ height, width: 'auto', display: 'block' }} />
    </a>
  );
}
