import { useState, useEffect } from "react";
import styles from "./MainPage.module.css";

interface MainPageProps {
  onApply: () => void;
  onStatus: () => void;
  onGuide: () => void;
}

const STEPS = [
  { num: "01", title: "분야 선택", desc: "최대 3개 분야 선택" },
  { num: "02", title: "실적 입력", desc: "분야별 세부 실적 및 파일 제출" },
  { num: "03", title: "신청 제출", desc: "내용 확인 후 최종 제출" },
  { num: "04", title: "심사 및 결과", desc: "담당자 심사 후 결과 통보" },
];

const QUICK_LINKS = [
  {
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
        <path d="M16 4L4 10v12l12 6 12-6V10L16 4z" />
        <path d="M4 10l12 6 12-6" />
        <line x1="16" y1="16" x2="16" y2="28" />
      </svg>
    ),
    label: "예술활동증명 신청",
    desc: "일반·특례 유형 신청",
    color: "blue",
    action: "apply" as const,
  },
  {
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
        <rect x="4" y="4" width="24" height="24" rx="3" />
        <line x1="10" y1="12" x2="22" y2="12" />
        <line x1="10" y1="17" x2="22" y2="17" />
        <line x1="10" y1="22" x2="16" y2="22" />
      </svg>
    ),
    label: "신청 현황 조회",
    desc: "진행 상태 및 결과 확인",
    color: "teal",
    action: "status" as const,
  },
  {
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
        <circle cx="16" cy="12" r="5" />
        <path d="M6 26c0-5.5 4.5-9 10-9s10 3.5 10 9" />
      </svg>
    ),
    label: "이용안내",
    desc: "신청 자격 및 절차 안내",
    color: "violet",
    action: "guide" as const,
  },
];

const STATS = [
  { num: "12,847", label: "누적 예술인" },
  { num: "94.3%", label: "서류 승인률" },
  { num: "14일", label: "평균 심사 기간" },
  { num: "3개", label: "동시 신청 가능 분야" },
];

// ── GitHub 기여자 타입 ──────────────────────────────────────────
interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

// ── 개발팀 크레딧 섹션 ─────────────────────────────────────────
function DevCredits() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/repos/clapppp/2026-oss/contributors")
      .then((r) => r.json())
      .then((data: Contributor[]) => {
        // bot 계정 제외
        setContributors(data.filter((c) => !c.login.includes("[bot]")));
      })
      .catch(() => setContributors([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className={styles.credits}>
      <div className={styles.sectionInner}>
        <div className={styles.creditsHeader}>
          <span className={styles.creditsEyebrow}>Made with ♥</span>
          <h2 className={styles.sectionTitle}>개발팀</h2>
          <p className={styles.sectionDesc}>공개SW프로젝트 1분반 6조가 함께 만들었습니다.</p>
        </div>

        {loading ? (
          <div className={styles.creditsLoading}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.creditsSkeleton} />
            ))}
          </div>
        ) : contributors.length === 0 ? (
          <p className={styles.creditsEmpty}>기여자 정보를 불러올 수 없습니다.</p>
        ) : (
          <ul className={styles.creditsGrid} role="list">
            {contributors.map((c) => (
              <li key={c.login}>
                <a
                  href={c.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.creditCard}
                  aria-label={`${c.login}의 GitHub 프로필`}
                >
                  <img
                    src={`${c.avatar_url}&s=120`}
                    alt={c.login}
                    className={styles.creditAvatar}
                    loading="lazy"
                  />
                  <span className={styles.creditLogin}>{c.login}</span>
                  <span className={styles.creditContrib}>{c.contributions} commits</span>
                  <span className={styles.creditGhIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.creditsRepo}>
          <a
            href="https://github.com/clapppp/2026-oss"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.creditsRepoLink}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            clapppp/2026-oss 오픈소스 보러가기
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={12} height={12} aria-hidden="true">
              <polyline points="9 3 13 3 13 7" /><line x1="13" y1="3" x2="7" y2="9" />
              <path d="M6 4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function MainPage({ onApply, onStatus, onGuide }: MainPageProps) {
  const handleQuickLink = (action: "apply" | "status" | "guide") => {
    if (action === "apply") onApply();
    else if (action === "status") onStatus();
    else if (action === "guide") onGuide();
  };

  return (
    <div className={styles.page}>

      {/* ── 히어로 ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>예술활동증명 신청 준비 도우미</p>
            <h1 className={styles.heroTitle}>
              예술인의 활동을<br />미리 준비하세요
            </h1>
            <p className={styles.heroDesc}>
              예술활동증명은 예술인의 창작 실적을 인정하는 제도입니다.<br />
              실제 신청 전 작성 내용을 미리 점검하고 준비할 수 있습니다.<br />
            </p>
            <div className={styles.heroCta}>
              <button type="button" className={styles.ctaPrimary} onClick={onApply}>
                신청서 작성해보기
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={16} height={16}>
                  <line x1="4" y1="10" x2="16" y2="10" />
                  <polyline points="11 5 16 10 11 15" />
                </svg>
              </button>
              <button type="button" className={styles.ctaSecondary} onClick={onStatus}>
                신청 현황 조회
              </button>
            </div>

            <div className={styles.heroStats}>
              {STATS.map((s) => (
                <div key={s.label} className={styles.heroStat}>
                  <span className={styles.heroStatNum}>{s.num}</span>
                  <span className={styles.heroStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.certCard}>
              <div className={styles.certCardTop}>
                <span className={styles.certCardBadge}>예술활동증명서</span>
                <span className={styles.certCardYear}>2025</span>
              </div>
              <div className={styles.certCardName}>홍 길 동</div>
              <div className={styles.certCardFields}>
                <span className={styles.certCardTag}>음악</span>
                <span className={styles.certCardTag}>미술</span>
              </div>
              <div className={styles.certCardMeta}>한국예술인복지재단</div>
              <div className={styles.certCardStatus}>
                <span className={styles.certCardDot} />
                인증 완료
              </div>
            </div>
            <div className={styles.floatChip}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={14} height={14}>
                <polyline points="2 8.5 6 12 14 4" />
              </svg>
              심사 완료
            </div>
            <div className={`${styles.floatChip} ${styles.floatChip2}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" width={14} height={14}>
                <circle cx="8" cy="8" r="6" />
                <line x1="8" y1="5" x2="8" y2="9" />
                <circle cx="8" cy="11" r="0.5" fill="#f59e0b" strokeWidth={2} />
              </svg>
              심사 중
            </div>
          </div>
        </div>
      </section>

      {/* ── 실제 신청 사이트 배너 ── */}
      <div className={styles.externalBanner}>
        <div className={styles.externalBannerInner}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden="true">
            <circle cx="10" cy="10" r="8" />
            <line x1="10" y1="7" x2="10" y2="10" />
            <circle cx="10" cy="13" r="0.5" fill="currentColor" strokeWidth={2} />
          </svg>
          <p className={styles.externalBannerText}>
            <strong>실제 예술활동증명 신청</strong>은 한국예술인복지재단 공식 사이트에서 진행됩니다.
          </p>
          <a
            href="https://www.kawfartist.kr/views/cms/hkor/cs/cs01002_.jsp"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalBannerLink}
          >
            공식 사이트 바로가기
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={13} height={13} aria-hidden="true">
              <path d="M6 4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" />
              <polyline points="9 3 13 3 13 7" />
              <line x1="13" y1="3" x2="7" y2="9" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── 빠른 메뉴 ── */}
      <section className={styles.quick}>
        <div className={styles.sectionInner}>
          <ul className={styles.quickGrid} role="list">
            {QUICK_LINKS.map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  className={`${styles.quickCard} ${styles[`quickCard_${link.color}`]}`}
                  onClick={() => handleQuickLink(link.action)}
                >
                  <span className={`${styles.quickIcon} ${styles[`quickIcon_${link.color}`]}`}>
                    {link.icon}
                  </span>
                  <span className={styles.quickLabel}>{link.label}</span>
                  <span className={styles.quickDesc}>{link.desc}</span>
                  <svg className={styles.quickArrow} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={14} height={14}>
                    <line x1="3" y1="8" x2="13" y2="8" />
                    <polyline points="9 4 13 8 9 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 신청 절차 ── */}
      <section className={styles.process}>
        <div className={styles.sectionInner}>
          <div className={styles.processMeta}>
            <span className={styles.processEyebrow}>이용 방법</span>
            <h2 className={styles.sectionTitle}>신청 절차</h2>
            <p className={styles.sectionDesc}>예술활동증명 신청은 4단계로 진행됩니다.</p>
          </div>
          <ol className={styles.stepList} role="list">
            {STEPS.map((step, i) => (
              <li key={step.num} className={styles.stepItem}>
                <div className={styles.stepNum}>{step.num}</div>
                {i < STEPS.length - 1 && <div className={styles.stepArrow} aria-hidden="true" />}
                <div className={styles.stepBody}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepDesc}>{step.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 신청 자격 ── */}
      <section className={styles.bottom} id="eligibility">
        <div className={styles.sectionInner}>
          <div className={styles.eligibilityBox}>
            <div className={styles.eligibilityHeader}>
              <div>
                <span className={styles.eligibilityEyebrow}>신청 전 확인하세요</span>
                <h2 className={styles.boxTitle}>신청 자격</h2>
              </div>
              <button type="button" className={styles.eligibilityDetailBtn} onClick={onApply}>
                신청하러 가기
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={13} height={13}>
                  <line x1="3" y1="8" x2="13" y2="8" />
                  <polyline points="9 4 13 8 9 12" />
                </svg>
              </button>
            </div>
            <ul className={styles.eligibilityList}>
              <li>
                <span className={styles.eligibilityNum}>1</span>
                <div>
                  <strong>문화예술 활동 실적 기준</strong>
                  <p>최근 5년간 해당 분야 실적이 기준 이상인 예술인</p>
                </div>
              </li>
              <li>
                <span className={styles.eligibilityNum}>2</span>
                <div>
                  <strong>예술 활동 소득 기준</strong>
                  <p>5년간 600만원 이상 또는 전년도 120만원 이상 예술 소득</p>
                </div>
              </li>
              <li>
                <span className={styles.eligibilityNum}>3</span>
                <div>
                  <strong>기술지원·기획 인력 기준</strong>
                  <p>공연·전시 등 문화예술 행사의 기술지원 또는 기획 참여 실적</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 개발팀 크레딧 ── */}
      <DevCredits />

    </div>
  );
}
