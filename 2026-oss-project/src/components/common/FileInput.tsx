import { useRef, useState } from "react";
import styles from "./FileInput.module.css";

interface FileInputProps {
  label: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 외부에서 표시할 파일명 (임시저장 복원 등). 지정하면 내부 state 대신 이 값을 사용 */
  value?: string;
}

export default function FileInput({ label, onChange, value }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalName, setInternalName] = useState("");

  // value prop이 바뀌면 내부 state 동기화 (임시저장 복원 시)
  const prevValueRef = useRef(value);
  if (prevValueRef.current !== value) {
    prevValueRef.current = value;
    if (value !== undefined) setInternalName(value);
  }

  const fileName = value !== undefined ? value : internalName;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setInternalName(file ? file.name : "");
    onChange?.(e);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalName("");
    if (inputRef.current) inputRef.current.value = "";
    onChange?.({ target: { files: null } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div
        className={`${styles.box} ${fileName ? styles.boxFilled : ""}`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={`${label} 파일 선택`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
          <path d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
          <polyline points="13 7 10 4 7 7" />
          <line x1="10" y1="4" x2="10" y2="13" />
        </svg>
        <span className={fileName ? styles.name : styles.placeholder}>
          {fileName || "PDF 파일을 선택하세요"}
        </span>
        {fileName && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="파일 제거"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={12} height={12}>
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className={styles.hidden}
        onChange={handleChange}
      />
    </div>
  );
}
