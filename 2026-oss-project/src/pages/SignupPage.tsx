import { useState } from "react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import styles from "./SignupPage.module.css";
import { EyeIcon } from "../components/common/icons";
import { signup } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { formatPhone } from "../utils/formatters";
import {
  MIN_PASSWORD_LENGTH,
  PHONE_DIGITS,
  BIRTH_DIGITS,
  getPasswordError,
} from "../constants/rules";

interface SignupPageProps {
  onComplete: () => void;
  onCancel: () => void;
}

// ── 단계 ──────────────────────────────────────────────
type Step = 1 | 2 | 3;

const STEP_LABELS = ["약관 동의", "정보 입력", "가입 완료"];

// ── 약관 ──────────────────────────────────────────────
const TERMS = [
  { key: "terms",     label: "이용약관 동의",          required: true },
  { key: "privacy",   label: "개인정보 처리방침 동의",  required: true },
  { key: "age",       label: "만 14세 이상 확인",       required: true },
  { key: "marketing", label: "마케팅 정보 수신 동의",   required: false },
];

// ── Step 1: 약관 동의 ──────────────────────────────────
function TermsStep({ onNext }: { onNext: () => void }) {
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  const allChecked = TERMS.every((t) => agreed[t.key]);
  const requiredChecked = TERMS.filter((t) => t.required).every((t) => agreed[t.key]);

  const toggleAll = () => {
    if (allChecked) setAgreed({});
    else setAgreed(Object.fromEntries(TERMS.map((t) => [t.key, true])));
  };

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepDesc}>
        아트패스 서비스 이용을 위해 아래 약관에 동의해 주세요.
      </p>

      <div className={styles.termsBox}>
        <label className={styles.termAll}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className={styles.checkbox}
          />
          <span className={styles.termAllLabel}>전체 동의하기</span>
        </label>

        <div className={styles.termDivider} />

        <ul className={styles.termList}>
          {TERMS.map((term) => (
            <li key={term.key} className={styles.termItem}>
              <label className={styles.termLabel}>
                <input
                  type="checkbox"
                  checked={!!agreed[term.key]}
                  onChange={(e) =>
                    setAgreed((prev) => ({ ...prev, [term.key]: e.target.checked }))
                  }
                  className={styles.checkbox}
                />
                <span>
                  <span className={term.required ? styles.required : styles.optional}>
                    [{term.required ? "필수" : "선택"}]
                  </span>{" "}
                  {term.label}
                </span>
              </label>
              <button type="button" className={styles.termDetail}>보기</button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.stepActions}>
        <Button variant="primary" size="lg" fullWidth disabled={!requiredChecked} onClick={onNext}>
          다음
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: 정보 입력 ───────────────────────────────────
function InfoStep({
  loading = false,
  onNext,
}: {
  loading?: boolean;
  onNext: (data: { name: string; birth: string; gender: "M" | "F"; phone: string; email: string; password: string }) => void;
}) {
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pwMismatch = pwConfirm.length > 0 && pw !== pwConfirm;
  const pwError = pw.length > 0 ? getPasswordError(pw) : null;
  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const canSubmit =
    name.trim().length > 0 &&
    birth.replace(/\D/g, "").length === BIRTH_DIGITS &&
    gender !== "" &&
    phone.replace(/\D/g, "").length === PHONE_DIGITS &&
    email.length > 0 &&
    !emailInvalid &&
    getPasswordError(pw) === null &&
    pw === pwConfirm;

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepDesc}>
        가입에 필요한 정보를 입력하세요.
      </p>

      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>기본 정보</h3>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>이름 <span className={styles.required}>*</span></label>
          <Input
            placeholder="실명을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>생년월일 <span className={styles.required}>*</span></label>
            <Input
              placeholder="YYYY.MM.DD"
              maxLength={10}
              value={birth}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, BIRTH_DIGITS);
                let out = d;
                if (d.length > 4) out = d.slice(0, 4) + "." + d.slice(4);
                if (d.length > 6) out = d.slice(0, 4) + "." + d.slice(4, 6) + "." + d.slice(6);
                setBirth(out);
              }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>성별 <span className={styles.required}>*</span></label>
            <div className={styles.genderGroup}>
              {(["M", "F"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={[styles.genderBtn, gender === g ? styles.genderBtnActive : ""].join(" ")}
                  onClick={() => setGender(g)}
                >
                  {g === "M" ? "남성" : "여성"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>휴대폰 번호 <span className={styles.required}>*</span></label>
          <Input
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>계정 정보</h3>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>이메일 (아이디) <span className={styles.required}>*</span></label>
          <Input
            type="email"
            error={emailInvalid}
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailInvalid && <p className={styles.fieldError}>올바른 이메일 형식을 입력하세요.</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>비밀번호 <span className={styles.required}>*</span></label>
          <div className={styles.inputWithIcon}>
            <Input
              type={showPw ? "text" : "password"}
              error={!!pwError}
              placeholder={`영문·숫자·특수문자 포함 ${MIN_PASSWORD_LENGTH}자 이상`}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ paddingRight: 44 }}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPw((v) => !v)}>
              <EyeIcon visible={showPw} />
            </button>
          </div>
          {pwError && <p className={styles.fieldError}>{pwError}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>비밀번호 확인 <span className={styles.required}>*</span></label>
          <Input
            type={showPw ? "text" : "password"}
            error={pwMismatch}
            placeholder="비밀번호를 다시 입력하세요"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
          />
          {pwMismatch && <p className={styles.fieldError}>비밀번호가 일치하지 않습니다.</p>}
        </div>
      </div>

      <div className={styles.stepActions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
          onClick={() => onNext({ name, birth, gender: gender as "M" | "F", phone, email, password: pw })}
        >
          가입하기
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: 완료 ────────────────────────────────────────
function CompleteStep({ name, onComplete }: { name: string; onComplete: () => void }) {
  return (
    <div className={styles.completeWrap}>
      <div className={styles.completeIcon}>
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={64} height={64}>
          <circle cx="32" cy="32" r="28" stroke="#1756BD" strokeWidth={2} />
          <polyline points="20 33 28 41 44 25" stroke="#1756BD" strokeWidth={3} />
        </svg>
      </div>
      <h2 className={styles.completeTitle}>가입이 완료되었습니다!</h2>
      <p className={styles.completeDesc}>
        <strong>{name}</strong>님, 아트패스 회원이 되신 것을 환영합니다.<br />
        이제 예술활동증명 서비스를 이용하실 수 있습니다.
      </p>
      <div className={styles.stepActions}>
        <Button variant="primary" size="lg" onClick={onComplete}>
          메인으로 이동
        </Button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function SignupPage({ onComplete, onCancel }: SignupPageProps) {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [completedName, setCompletedName] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>회원가입</h1>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} aria-label="취소">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={18} height={18}>
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        {/* 스텝 표시 */}
        {step < 3 && (
          <div className={styles.stepBar} role="list" aria-label="가입 진행 단계">
            {STEP_LABELS.slice(0, 2).map((label, i) => {
              const num = (i + 1) as Step;
              const state = num < step ? "done" : num === step ? "active" : "inactive";
              return (
                <div key={label} className={styles.stepBarItem} role="listitem">
                  <div className={[styles.stepNum, styles[state]].join(" ")}>
                    {state === "done" ? (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
                        <polyline points="3 8.5 6.5 12 13 5" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span className={[styles.stepLabel, styles[state]].join(" ")}>{label}</span>
                  {i < 1 && <div className={[styles.stepLine, i + 1 < step ? styles.stepLineDone : ""].join(" ")} />}
                </div>
              );
            })}
          </div>
        )}

        {/* 단계별 콘텐츠 */}
        {step === 1 && <TermsStep onNext={() => setStep(2)} />}
        {step === 2 && (
          <InfoStep
            loading={signupLoading}
            onNext={async ({ name, birth, gender, phone, email, password }) => {
              setSignupError("");
              setSignupLoading(true);
              try {
                await signup({ name, birth, gender, phone, email, password });
                await login(email, password);
                setCompletedName(name);
                setStep(3);
              } catch (err) {
                setSignupError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.");
              } finally {
                setSignupLoading(false);
              }
            }}
          />
        )}
        {signupError && <p className={styles.signupError}>{signupError}</p>}
        {step === 3 && <CompleteStep name={completedName} onComplete={onComplete} />}
      </div>
    </div>
  );
}
