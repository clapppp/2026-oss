import FileInput from "../common/FileInput";
import styles from "./FileSection.module.css";

interface FileSectionProps {
  onCoverChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInnerChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FileSection({ onCoverChange, onInnerChange }: FileSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>파일 제출</h2>
      <div className={styles.fields}>
        <FileInput label="표지 제출" onChange={onCoverChange} />
        <FileInput label="내지 제출" onChange={onInnerChange} />
      </div>
    </section>
  );
}
