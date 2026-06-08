import { useState } from "react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import styles from "./LoginPage.module.css";
import { useAuth } from "../context/AuthContext";
import type { User } from "../api/types";
import { EyeIcon } from "../components/common/icons";

interface LoginPageProps {
  onSuccess: (user: User) => void;
  onSignup: () => void;
  onForgotPassword: () => void;
}

export default function LoginPage({ onSuccess, onSignup, onForgotPassword }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // TODO: login()은 AuthContext에서 관리 — 백엔드 연동 시 내부만 교체
      const user = await login(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* 헤더 */}
        <div className={styles.cardHeader}>
          <div className={styles.logoMark} aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none" width={36} height={36}>
              <rect width="36" height="36" rx="8" fill="#1756BD"/>
              <path d="M10 28 L18 8 L26 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 22 Q18 18.5 23 22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>로그인</h1>
          <p className={styles.subtitle}>아트패스 서비스에 오신 것을 환영합니다.</p>
        </div>

        {/* 폼 */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">이메일</label>
            <Input
              id="login-email"
              type="email"
              error={!!error}
              placeholder="example@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-pw">비밀번호</label>
            <div className={styles.inputWrap}>
              <Input
                id="login-pw"
                type={showPw ? "text" : "password"}
                error={!!error}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                style={{ paddingRight: 46 }}
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
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={16} height={16}>
                <circle cx="10" cy="10" r="8" />
                <line x1="10" y1="6" x2="10" y2="11" />
                <circle cx="10" cy="14" r="0.5" fill="currentColor" strokeWidth={2} />
              </svg>
              {error}
            </div>
          )}

          <label className={styles.rememberRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className={styles.rememberLabel}>로그인 상태 유지</span>
          </label>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            로그인
          </Button>
        </form>

        {/* 테스트 계정 힌트 */}
        <div className={styles.demoHint}>
          <span className={styles.demoHintLabel}>테스트 계정</span>
          <span>사용자: <code>demo@artpass.kr</code> / <code>password1!</code></span>
          <span>관리자: <code>admin@artpass.kr</code> / <code>admin1!</code></span>
        </div>

        {/* 하단 링크 */}
        <div className={styles.footer}>
          <div className={styles.footerRow}>
            <span className={styles.footerText}>아직 회원이 아니신가요?</span>
            <button type="button" className={styles.signupLink} onClick={onSignup}>
              회원가입
            </button>
          </div>
          <div className={styles.footerRow}>
            <span className={styles.footerText}>비밀번호를 잊으셨나요?</span>
            <button type="button" className={styles.forgotBtn} onClick={onForgotPassword}>
              비밀번호 찾기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
