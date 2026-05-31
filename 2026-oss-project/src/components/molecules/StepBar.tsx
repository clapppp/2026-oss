import styles from "./StepBar.module.css";

interface StepBarProps {
  steps: string[];
  currentStep: number;
}

export default function StepBar({ steps, currentStep }: StepBarProps) {
  return (
    <div className={styles.container}>
      {steps.map((step, index) => (
        <div
          key={step}
          className={[
            styles.step,
            currentStep === index + 1 ? styles.active : styles.inactive,
          ].join(" ")}
        >
          {step}
        </div>
      ))}
    </div>
  );
}
