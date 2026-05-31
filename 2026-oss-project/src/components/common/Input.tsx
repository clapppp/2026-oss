import React from "react";
import styles from "./Input.module.css";

type InputType = "text" | "email" | "password" | "date" | "file";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: InputType;
  label?: string;
  placeholder?: string;
  error?: boolean;
}

export default function Input({
  type = "text",
  label,
  placeholder,
  error = false,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        className={[
          styles.input,
          type === "file" ? styles.file : "",
          error ? styles.inputError : "",
          className,
        ].filter(Boolean).join(" ")}
        {...props}
      />
    </div>
  );
}
