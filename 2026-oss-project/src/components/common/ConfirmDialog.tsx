import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>취소</button>
          <button type="button" className={styles.confirmBtn} onClick={onConfirm}>삭제</button>
        </div>
      </div>
    </div>
  );
}
