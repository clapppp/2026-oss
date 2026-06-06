import { useState } from "react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { EyeIcon } from "../components/common/icons";
import { formatPhone } from "../utils/formatters";
import { MIN_PASSWORD_LENGTH, PHONE_DIGITS } from "../constants/rules";
import { resetPassword } from "../api/user";
import styles from "./ForgotPasswordPage.module.css";

interface ForgotPasswordPageProps {
  onComplete: () => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = ["본인 확인", "비밀번호 재설정", "완료"];

// ── Step 1: 본인 확인 (이메일 + 휴대폰) ──────────────────
function VerifyStep({
  onNext,
}: {
  onNext: (email: string, phone: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    email.length > 0 &&
    !emailInvalid &&
    phone.replace(/\D/g, "").length === PHONE_DIGITS;

  const handleNext = async () => {
    setError("");
    setLoading(true);
    try {
      // 실제 일치 여부는 비밀번호 변경 시 서버에서 검증하므로
      // 여기선 형식만 확인하고 다음 단계로 넘김
      onNext(email, phone);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepDesc}>
        가입 시 등록한 이메일과 휴대폰 번호를 입력하세요.
      </p>

      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            이메일 (아이디) <span className={styles.required}>*</span>
          </label>
          <Input
            type="email"
            error={emailInvalid}
            placeholder="가입 시 등록한 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailInvalid && (
            <p className={styles.fieldError}>올바른 이메일 형식을 입력하세요.</p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            휴대폰 번호 <span className={styles.required}>*</span>
          </label>
          <Input
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </div>
      </div>

      {error && <p className={styles.fieldError}>{error}</p>}

      <div className={styles.stepActions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
          onClick={handleNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: 새 비밀번호 설정 ───────────────────────────────
function ResetStep({
  email,
  phone,
  onNext,
}: {
  email: string;
  phone: string;
  onNext: () => void;
}) {
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pwWeak = pw.length > 0 && pw.length < MIN_PASSWORD_LENGTH;
  const pwMismatch = pwConfirm.length > 0 && pw !== pwConfirm;
  const canSubmit = pw.length >= MIN_PASSWORD_LENGTH && pw === pwConfirm;

  const handleReset = async () => {
    setError("");
    setLoading(true);
    try {
      await resetPassword(email, phone, pw);
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "이메일 또는 휴대폰 번호가 일치하지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepDesc}>
        새로 사용할 비밀번호를 입력하세요. 영문과 숫자를 포함하여 8자 이상으로
        설정해 주세요.
      </p>

      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            새 비밀번호 <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWithIcon}>
            <Input
              type={showPw ? "text" : "password"}
              error={pwWeak}
              placeholder="영문, 숫자 포함 8자 이상"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              <EyeIcon visible={showPw} />
            </button>
          </div>
          {pwWeak && (
            <p className={styles.fieldError}>비밀번호는 8자 이상이어야 합니다.</p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            새 비밀번호 확인 <span className={styles.required}>*</span>
          </label>
          <Input
            type={showPw ? "text" : "password"}
            error={pwMismatch}
            placeholder="비밀번호를 다시 입력하세요"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
          />
          {pwMismatch && (
            <p className={styles.fieldError}>비밀번호가 일치하지 않습니다.</p>
          )}
        </div>
      </div>

      {error && <p className={styles.fieldError}>{error}</p>}

      <div className={styles.stepActions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
          onClick={handleReset}
        >
          비밀번호 변경
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: 완료 ────────────────────────────────────────────
function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className={styles.completeWrap}>
      <div className={styles.completeIcon}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          width={64}
          height={64}
        >
          <circle cx="32" cy="32" r="28" stroke="#1756BD" strokeWidth={2} />
          <polyline points="20 33 28 41 44 25" stroke="#1756BD" strokeWidth={3} />
        </svg>
      </div>
      <h2 className={styles.completeTitle}>비밀번호가 변경되었습니다</h2>
      <p className={styles.completeDesc}>새 비밀번호로 로그인하실 수 있습니다.</p>
      <div className={styles.stepActions}>
        <Button variant="primary" size="lg" onClick={onComplete}>
          로그인하기
        </Button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function ForgotPasswordPage({
  onComplete,
  onBack,
}: ForgotPasswordPageProps) {
  const [step, setStep] = useState<Step>(1);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="뒤로가기"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={18}
              height={18}
            >
              <polyline points="12 4 6 10 12 16" />
            </svg>
          </button>
          <h1 className={styles.title}>비밀번호 찾기</h1>
          <div className={styles.headerSpacer} />
        </div>

        {step < 3 && (
          <div className={styles.stepBar} role="list" aria-label="비밀번호 찾기 진행 단계">
            {STEP_LABELS.slice(0, 2).map((label, i) => {
              const num = (i + 1) as Step;
              const state = num < step ? "done" : num === step ? "active" : "inactive";
              return (
                <div key={label} className={styles.stepBarItem} role="listitem">
                  <div className={[styles.stepNum, styles[state]].join(" ")}>
                    {state === "done" ? (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        width={14}
                        height={14}
                      >
                        <polyline points="3 8.5 6.5 12 13 5" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span className={[styles.stepLabel, styles[state]].join(" ")}>
                    {label}
                  </span>
                  {i < 1 && (
                    <div
                      className={[
                        styles.stepLine,
                        i + 1 < step ? styles.stepLineDone : "",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <VerifyStep
            onNext={(email, phone) => {
              setVerifiedEmail(email);
              setVerifiedPhone(phone);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <ResetStep
            email={verifiedEmail}
            phone={verifiedPhone}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && <CompleteStep onComplete={onComplete} />}
      </div>
    </div>
  );
}
