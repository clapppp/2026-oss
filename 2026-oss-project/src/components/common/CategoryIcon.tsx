interface Props {
  category: string;
  size?: number;
}

export default function CategoryIcon({ category, size = 24 }: Props) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: size,
    height: size,
    "aria-hidden": true as const,
  };

  switch (category) {
    case "문학":
    case "시나리오":
      return (
        <svg {...p}>
          <path d="M5 19V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v13" />
          <path d="M5 19a2 2 0 0 0 2 2h11" />
          <line x1="9" y1="10" x2="16" y2="10" />
          <line x1="9" y1="14" x2="14" y2="14" />
        </svg>
      );

    case "일반미술":
      return (
        <svg {...p}>
          <path d="M12 3a9 9 0 1 0 3.6 17.24 1.8 1.8 0 0 0-.49-1.58.6.6 0 0 1 .45-1H15.5a5.5 5.5 0 0 0 5.5-5.5C21 8.42 16.97 3 12 3z" />
          <circle cx="8"   cy="11"  r="1" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="14"  cy="7.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    case "전통미술":
      return (
        <svg {...p}>
          <line x1="18" y1="4" x2="9" y2="13" />
          <path d="M9 13 Q7 15 6 18 Q8 17 10 15 Z" />
          <path d="M4 20 Q8 18 13 20 Q16 21 19 20" />
        </svg>
      );

    case "디자인 / 공예":
    case "공예":
      return (
        <svg {...p}>
          <path d="M12 19l7-7-4-4-7 7v4h4z" />
          <path d="M15 6l3 3" />
          <line x1="3" y1="21" x2="8" y2="21" />
        </svg>
      );

    case "사진":
      return (
        <svg {...p}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <circle cx="12" cy="14" r="3.2" />
          <path d="M9 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
          <circle cx="17.5" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );

    case "만화":
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="1.5" />
          <line x1="8" y1="3" x2="8" y2="21" />
          <line x1="8" y1="11" x2="19" y2="11" />
          <line x1="14" y1="11" x2="14" y2="21" />
        </svg>
      );

    case "영화":
      return (
        <svg {...p}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 6V4" /><path d="M17 6V4" />
          <path d="M7 19v-2" /><path d="M17 19v-2" />
          <path d="M12 6V4" /><path d="M12 19v-2" />
        </svg>
      );

    case "방송":
      return (
        <svg {...p}>
          <polygon points="21 7 15 12 21 17 21 7" />
          <rect x="3" y="5" width="12" height="14" rx="2" />
        </svg>
      );

    case "공연":
      return (
        <svg {...p}>
          <path d="M10 18V6l10 6-10 6z" />
          <line x1="4" y1="6" x2="4" y2="18" />
          <line x1="7" y1="6" x2="7" y2="18" />
        </svg>
      );

    case "연극":
      return (
        <svg {...p}>
          <path d="M12 3 Q18 3 20 9 Q21 15 17 19 Q14 21 12 21 Q10 21 7 19 Q3 15 4 9 Q6 3 12 3z" />
          <ellipse cx="9"  cy="11" rx="2" ry="2.5" />
          <ellipse cx="15" cy="11" rx="2" ry="2.5" />
          <path d="M8 16 Q12 19.5 16 16" />
        </svg>
      );

    case "무용":
      return (
        <svg {...p}>
          <circle cx="12" cy="4" r="1.8" />
          <path d="M12 6 Q10 10 8 12 Q6 14 7 17" />
          <path d="M12 6 Q14 10 15 13 Q16 16 14 18" />
          <path d="M9 14 Q12 16.5 15 14" />
        </svg>
      );

    case "국악":
      return (
        <svg {...p}>
          <ellipse cx="6"  cy="12" rx="4" ry="6" />
          <ellipse cx="18" cy="12" rx="4" ry="6" />
          <path d="M10 9 Q12 11 14 9" />
          <path d="M10 15 Q12 13 14 15" />
        </svg>
      );

    case "대중음악":
      return (
        <svg {...p}>
          <rect x="9" y="3" width="6" height="10" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <line x1="12" y1="18" x2="12" y2="21" />
          <line x1="8"  y1="21" x2="16" y2="21" />
        </svg>
      );

    case "일반음악":
    case "음악":
      return (
        <svg {...p}>
          <rect x="3" y="8" width="18" height="11" rx="1.5" />
          <line x1="7"  y1="8" x2="7"  y2="19" />
          <line x1="11" y1="8" x2="11" y2="19" />
          <line x1="15" y1="8" x2="15" y2="19" />
          <line x1="19" y1="8" x2="19" y2="19" />
          <rect x="5"  y="8" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="9"  y="8" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="13" y="8" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      );

    default:
      return (
        <svg {...p}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
}
