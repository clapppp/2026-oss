import { useRef, useState } from "react";
import Button from "../components/common/Button";
import Toast from "../components/common/Toast";
import styles from "./MyPage.module.css";
import { useAuth } from "../context/AuthContext";
import { changePassword, uploadPhoto, deletePhoto } from "../api/user";
import Input from "../components/common/Input";
import { EyeIcon } from "../components/common/icons";
import { formatPhone, formatGender } from "../utils/formatters";
import { getPasswordError, PHONE_DIGITS, MAX_PEN_NAME_LENGTH } from "../constants/rules";

interface MyPageProps {
  onBack: () => void;
}

export default function MyPage({ onBack }: MyPageProps) {
  const { user, updateUser } = useAuth();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  // 비밀번호 변경 2단계: 0=미시작, 1=현재 비밀번호 확인, 2=새 비밀번호 입력
  const [pwStep, setPwStep] = useState<0 | 1 | 2>(0);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.profileImage || null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [nationality, setNationality] = useState<"korean" | "foreign">(user?.nationality ?? "korean");
  const [penName, setPenName] = useState(user?.penName ?? "");

  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const newPwError = newPw.length > 0 ? getPasswordError(newPw) : null;
  const pwMismatch = newPwConfirm.length > 0 && newPw !== newPwConfirm;

  const canSave =
    phone.replace(/\D/g, "").length === PHONE_DIGITS &&
    email.length > 0 &&
    !emailInvalid;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ phone, email, nationality, penName });
      showToast("변경사항이 저장되었습니다.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const resetPwFlow = () => {
    setPwStep(0);
    setCurrentPw("");
    setNewPw("");
    setNewPwConfirm("");
    setShowCurrentPw(false);
    setShowNewPw(false);
  };

  // Step 1 → Step 2: 현재 비밀번호 확인 (API 호출 없이 진행, 실제 검증은 Step 2에서 서버가 처리)
  const handlePwStep1Next = () => {
    if (!currentPw) return;
    setPwStep(2);
  };

  // Step 2: 새 비밀번호 변경
  const handlePwChange = async () => {
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      showToast("비밀번호가 변경되었습니다.");
      resetPwFlow();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setPwSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPhoto(file);
      setPhotoUrl(url);
      updateUser({ profileImage: url });
      showToast("프로필 사진이 변경되었습니다.");
    } catch {
      showToast("사진 업로드에 실패했습니다.");
    }
  };

  const handlePhotoDelete = async () => {
    try {
      await deletePhoto();
      setPhotoUrl(null);
      updateUser({ profileImage: "" });
      showToast("프로필 사진이 삭제되었습니다.");
    } catch {
      showToast("사진 삭제에 실패했습니다.");
    }
  };

  return (
    <div className={styles.page}>
      <Toast message={toast.message} visible={toast.visible} />
      <div className={styles.card}>
        {/* 헤더 */}
        <div className={styles.cardHeader}>
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label="뒤로가기">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={18} height={18}>
              <polyline points="12 5 7 10 12 15" />
            </svg>
          </button>
          <h1 className={styles.title}>마이페이지</h1>
          <div className={styles.headerSpacer} />
        </div>

        {/* 프로필 요약 + 사진 등록 */}
        <div className={styles.profileSection}>
          <div className={styles.avatarWrap}>
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => photoInputRef.current?.click()}
              aria-label="프로필 사진 변경"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="프로필 사진" className={styles.avatarImg} />
              ) : (
                <svg viewBox="0 0 48 48" fill="none" width={48} height={48}>
                  <circle cx="24" cy="24" r="24" fill="#EDE9FE" />
                  <circle cx="24" cy="18" r="7" fill="#1756BD" opacity="0.8" />
                  <path d="M10 42c0-7.7 6.3-13 14-13s14 5.3 14 13" fill="#1756BD" opacity="0.5" />
                </svg>
              )}
              <span className={styles.avatarOverlay} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" width={16} height={16}>
                  <rect x="2" y="5" width="16" height="12" rx="2" />
                  <circle cx="10" cy="11" r="3" />
                  <path d="M7 5l1.5-2h3L13 5" />
                </svg>
              </span>
            </button>
            {photoUrl && (
              <button type="button" className={styles.photoDeleteBtn} onClick={handlePhotoDelete}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={11} height={11} aria-hidden="true">
                  <polyline points="2 4 12 4" />
                  <path d="M5 4V3h4v1" />
                  <path d="M3 4l.7 8h6.6L11 4" />
                </svg>
                삭제
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className={styles.photoInput}
            onChange={handlePhotoChange}
            aria-label="프로필 사진 파일 선택"
          />
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{user?.name}</span>
            <span className={styles.profileEmail}>{email}</span>
            <span className={styles.photoHint}>사진을 클릭하여 변경</span>
          </div>
        </div>

        <div className={styles.body}>
          {/* 기본 정보 (수정 불가) */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>기본 정보</h2>
            <p className={styles.sectionDesc}>가입 시 등록된 정보로 수정이 불가합니다.</p>
            <div className={styles.readonlyGrid}>
              <div className={styles.readonlyRow}>
                <span className={styles.readonlyLabel}>이름</span>
                <span className={styles.readonlyValue}>{user?.name}</span>
              </div>
              <div className={styles.readonlyRow}>
                <span className={styles.readonlyLabel}>생년월일</span>
                <span className={styles.readonlyValue}>{user?.birth}</span>
              </div>
              <div className={styles.readonlyRow}>
                <span className={styles.readonlyLabel}>성별</span>
                <span className={styles.readonlyValue}>{user ? formatGender(user.gender) : ""}</span>
              </div>
            </div>
          </section>

          {/* 추가 정보 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>추가 정보</h2>

            {/* 국적 */}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>국적</span>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="nationality" value="korean" checked={nationality === "korean"} onChange={() => setNationality("korean")} className={styles.radioInput} />
                  내국인
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="nationality" value="foreign" checked={nationality === "foreign"} onChange={() => setNationality("foreign")} className={styles.radioInput} />
                  외국인
                </label>
              </div>
            </div>

            {/* 필명 */}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="mypage-penname">필명</label>
              <Input
                id="mypage-penname"
                placeholder="작품에 표시될 필명을 입력하세요 (선택)"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                maxLength={MAX_PEN_NAME_LENGTH}
              />
              <p className={styles.fieldHint}>입력하지 않으면 이름({user?.name})으로 표시됩니다.</p>
            </div>
          </section>

          {/* 연락처 정보 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>연락처 정보</h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="mypage-phone">
                휴대폰 번호 <span className={styles.required}>*</span>
              </label>
              <Input
                id="mypage-phone"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="mypage-email">
                이메일 (아이디) <span className={styles.required}>*</span>
              </label>
              <Input
                id="mypage-email"
                type="email"
                error={emailInvalid}
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailInvalid && <p className={styles.fieldError}>올바른 이메일 형식을 입력하세요.</p>}
            </div>
          </section>

          {/* 비밀번호 변경 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>비밀번호 변경</h2>

            {pwStep === 0 && (
              <button
                type="button"
                className={styles.pwChangeStartBtn}
                onClick={() => setPwStep(1)}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={15} height={15}>
                  <rect x="4" y="9" width="12" height="9" rx="1.5" />
                  <path d="M7 9V6a3 3 0 0 1 6 0v3" />
                </svg>
                비밀번호 변경하기
              </button>
            )}

            {pwStep === 1 && (
              <div className={styles.pwStepBox}>
                <p className={styles.pwStepLabel}>
                  <span className={styles.pwStepBadge}>1 / 2</span>
                  현재 비밀번호를 입력하세요
                </p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="mypage-current-pw">현재 비밀번호</label>
                  <div className={styles.inputWrap}>
                    <Input
                      id="mypage-current-pw"
                      type={showCurrentPw ? "text" : "password"}
                      placeholder="현재 비밀번호를 입력하세요"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      autoComplete="current-password"
                      style={{ paddingRight: 44 }}
                      onKeyDown={(e) => e.key === "Enter" && currentPw && handlePwStep1Next()}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrentPw((v) => !v)} aria-label={showCurrentPw ? "숨기기" : "보기"}>
                      <EyeIcon visible={showCurrentPw} />
                    </button>
                  </div>
                </div>
                <div className={styles.pwStepActions}>
                  <Button variant="secondary" size="md" onClick={resetPwFlow}>취소</Button>
                  <Button variant="primary" size="md" disabled={!currentPw} onClick={handlePwStep1Next}>
                    다음
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={13} height={13} style={{ marginLeft: 4 }}>
                      <line x1="3" y1="8" x2="13" y2="8" />
                      <polyline points="9 4 13 8 9 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}

            {pwStep === 2 && (
              <div className={styles.pwStepBox}>
                <p className={styles.pwStepLabel}>
                  <span className={styles.pwStepBadge}>2 / 2</span>
                  새 비밀번호를 입력하세요
                </p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="mypage-new-pw">새 비밀번호</label>
                  <div className={styles.inputWrap}>
                    <Input
                      id="mypage-new-pw"
                      type={showNewPw ? "text" : "password"}
                      error={!!newPwError}
                      placeholder={`영문·숫자·특수문자 포함 10자 이상`}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      autoComplete="new-password"
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowNewPw((v) => !v)} aria-label={showNewPw ? "숨기기" : "보기"}>
                      <EyeIcon visible={showNewPw} />
                    </button>
                  </div>
                  {newPwError && <p className={styles.fieldError}>{newPwError}</p>}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="mypage-new-pw-confirm">새 비밀번호 확인</label>
                  <Input
                    id="mypage-new-pw-confirm"
                    type={showNewPw ? "text" : "password"}
                    error={pwMismatch}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    value={newPwConfirm}
                    onChange={(e) => setNewPwConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  {pwMismatch && <p className={styles.fieldError}>비밀번호가 일치하지 않습니다.</p>}
                </div>
                <div className={styles.pwStepActions}>
                  <Button variant="secondary" size="md" onClick={resetPwFlow}>취소</Button>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!!newPwError || !newPw || pwMismatch || !newPwConfirm}
                    loading={pwSaving}
                    onClick={handlePwChange}
                  >
                    변경하기
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* 액션 버튼 */}
          <div className={styles.actions}>
            <Button variant="secondary" size="lg" onClick={onBack}>취소</Button>
            <Button variant="primary" size="lg" disabled={!canSave} loading={saving} onClick={handleSave}>
              저장하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
