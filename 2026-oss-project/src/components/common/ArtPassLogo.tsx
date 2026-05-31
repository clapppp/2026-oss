import styles from "./ArtPassLogo.module.css";

interface ArtPassLogoProps {
  size?: number;
}

export default function ArtPassLogo({ size = 32 }: ArtPassLogoProps) {
  const iconSize = Math.round(size * 0.9);

  return (
    <span className={styles.logo}>
      <svg
        viewBox="0 0 36 36"
        width={iconSize}
        height={iconSize}
        fill="none"
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="8" fill="#1756BD" />
        {/* A — left and right strokes */}
        <path
          d="M10 28 L18 8 L26 28"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Curved crossbar (brush-stroke feel) */}
        <path
          d="M13 22 Q18 18.5 23 22"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.wordmark}>
        <span className={styles.wordArt}>art</span>
        <span className={styles.wordPass}>Pass</span>
      </span>
    </span>
  );
}
