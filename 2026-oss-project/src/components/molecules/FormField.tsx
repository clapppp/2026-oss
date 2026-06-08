import React from "react";
import Input from "../common/Input";
import DatePicker from "../common/DatePicker";
import styles from "./FormField.module.css";

interface FormFieldProps {
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "file" | "select";
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  options?: string[];
  inlineError?: string;
}

export default function FormField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  options = [],
  inlineError,
}: FormFieldProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {label}
        {inlineError && <span className={styles.inlineError}>⚠ {inlineError}</span>}
      </label>
      {type === "select" ? (
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={value}
            onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
          >
            <option value="" disabled hidden>{placeholder ?? ""}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span className={styles.selectArrow} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <polyline points="5 8 10 13 15 8" />
            </svg>
          </span>
        </div>
      ) : type === "date" ? (
        <DatePicker
          value={value}
          placeholder={placeholder}
          onChange={(dateStr) =>
            onChange?.({
              target: { value: dateStr },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        />
      ) : (
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        />
      )}
    </div>
  );
}
