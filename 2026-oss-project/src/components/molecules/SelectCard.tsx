import type { ReactNode } from "react";
import styles from "./SelectCard.module.css";

interface SelectCardProps {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export default function SelectCard({
  label,
  icon,
  selected = false,
  onClick,
  onRemove,
}: SelectCardProps) {
  return (
    <div
      className={[styles.card, selected ? styles.selected : ""].join(" ")}
      onClick={onClick}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
      {selected && onRemove && (
        <button
          type="button"
          className={styles.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`${label} 선택 해제`}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={12} height={12}>
            <line x1="3" y1="3" x2="13" y2="13" />
            <line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>
      )}
    </div>
  );
}
