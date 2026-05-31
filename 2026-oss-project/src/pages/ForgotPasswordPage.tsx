import { useState, useRef, useEffect } from "react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { EyeIcon } from "../components/common/icons";
import { formatPhone } from "../utils/formatters";
import {
  MIN_PASSWORD_LENGTH,
  PHONE_DIGITS,
  BIRTH_DIGITS,
  AUTH_CODE_DIGITS,
  AUTH_CODE_TIMEOUT_SECONDS,
} from "../constants/rules";
import styles from "./ForgotPasswordPage.module.css";

interface ForgotPasswordPageProps {
  onComplete: () => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = ["본인 인증", "비밀번호 재설정", "완료"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ── Step 1: 본인 인증 ──────────────────────────────────
function VerifyStep({
  onNext,
}: {
  onNext: (name: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birth, setBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AUTH_CODE_TIMEOUT_SECONDS);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(AUTH_CODE_TIMEOUT_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCodeSent(true);
      setVerified(false);
      setCode("");
      startTimer();
    }, 800);
  };

  const handleVerify = () => {
    setVerified(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSend =
    name.trim().length > 0 &&
    !emailInvalid &&
    email.length > 0 &&
    birth.replace(/\D/g, "").length === BIRTH_DIGITS &&
    phone.replace(/\D/g, "").length === PHONE_DIGITS;
  const canVerify = code.length === AUTH_CODE_DIGITS && timeLeft > 0;

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepDesc}>
        가입 시 등록한 정보를 입력하여 본인을 확인합니다.
      </p>

      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>기본 정보</h3>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            이름 <span className={styles.required}>*</span>
          </label>
          <Input
            placeholder="실명을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={verified}
          />
        </div>

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
            disabled={verified}
          />
          {emailInvalid && (
            <p className={styles.fieldError}>올바른 이메일 형식을 입력하세요.</p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            생년월일 <span className={styles.required}>*</span>
          </label>
          <Input
            placeholder="YYYY.MM.DD"
            maxLength={10}
            value={birth}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, BIRTH_DIGITS);
              let out = d;
              if (d.length > 4) out = d.slice(0, 4) + "." + d.slice(4);
              if (d.length > 6)
                out = d.slice(0, 4) + "." + d.slice(4, 6) + "." + d.slice(6);
              setBirth(out);
            }}
            disabled={verified}
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>휴대폰 인증</h3>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            휴대폰 번호 <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWithBtn}>
            <input
              className={styles.input}
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              disabled={verified}
            />
            <Button
              variant="secondary"
              size="md"
              disabled={!canSend || verified}
              loading={loading}
              onClick={handleSendCode}
            >
              {codeSent ? "재발송" : "인증번호 발송"}
            </Button>
          </div>
        </div>

        {codeSent && !verified && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              인증번호 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithBtn}>
              <div className={styles.inputTimer}>
                <input
                  className={styles.input}
                  placeholder="인증번호 6자리"
                  maxLength={AUTH_CODE_DIGITS}
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value.replace(/\D/g, "").slice(0, AUTH_CODE_DIGITS)
                    )
                  }
                />
                {timeLeft > 0 ? (
                  <span className={styles.timer}>
                    {pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}
                  </span>
                ) : (
                  <span className={styles.timerExpired}>만료</span>
                )}
              </div>
              <Button
                variant="primary"
                size="md"
                disabled={!canVerify}
                onClick={handleVerify}
              >
                인증하기
              </Button>
            </div>
            {timeLeft === 0 && (
              <p className={styles.fieldError}>
                인증 시간이 만료되었습니다. 인증번호를 다시 발송해 주세요.
              </p>
            )}
          </div>
        )}

        {verified && (
          <div className={styles.verifiedBanner}>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              width={18}
              height={18}
            >
              <circle cx="10" cy="10" r="8" />
              <polyline points="6.5 10.5 9 13 13.5 8" />
            </svg>
            본인인증이 완료되었습니다.
          </div>
        )}
      </div>

      <div className={styles.stepActions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!verified}
          onClick={() => onNext(name, email)}
        >
          다음
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: 새 비밀번호 설정 ───────────────────────────
function ResetStep({
  onNext,
  loading,
}: {
  onNext: (password: string) => void;
  loading: boolean;
}) {
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pwWeak = pw.length > 0 && pw.length < MIN_PASSWORD_LENGTH;
  const pwMismatch = pwConfirm.length > 0 && pw !== pwConfirm;
  const canSubmit = pw.length >= MIN_PASSWORD_LENGTH && pw === pwConfirm;

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
            <p className={styles.fieldError}>
              비밀번호는 8자 이상이어야 합니다.
            </p>
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

      <div className={styles.stepActions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
          onClick={() => onNext(pw)}
        >
          비밀번호 변경
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: 완료 ────────────────────────────────────────
function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className={styles.completeWrap}>
      <div className={styles.completeIcon}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
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
      <p className={styles.completeDesc}>
        새 비밀번호로 로그인하실 수 있습니다.
      </p>
      <div className={styles.stepActions}>
        <Button variant="primary" size="lg" onClick={onComplete}>
          로그인하기
        </Button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function ForgotPasswordPage({
  onComplete,
  onBack,
}: ForgotPasswordPageProps) {
  const [step, setStep] = useState<Step>(1);
  const [resetLoading, setResetLoading] = useState(false);

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
            onNext={(_name, _email) => setStep(2)}
          />
        )}
        {step === 2 && (
          <ResetStep
            loading={resetLoading}
            onNext={async (_password) => {
              setResetLoading(true);
              await new Promise((r) => setTimeout(r, 800));
              setResetLoading(false);
              setStep(3);
            }}
          />
        )}
        {step === 3 && <CompleteStep onComplete={onComplete} />}
      </div>
    </div>
  );
}
