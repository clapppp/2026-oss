import styles from "./GuidePage.module.css";

interface GuidePageProps {
  onApply: () => void;
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
        <path d="M16 4L4 10v12l12 6 12-6V10L16 4z" />
        <path d="M4 10l12 6 12-6" />
        <line x1="16" y1="16" x2="16" y2="28" />
      </svg>
    ),
    title: "신청서 미리 작성",
    desc: "실제 신청 전 PC·모바일로 신청서 작성 흐름을 미리 체험할 수 있습니다.",
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
    title: "진행 현황 미리 확인",
    desc: "심사 단계별 진행 흐름과 결과 유형을 미리 파악할 수 있습니다.",
  },
  {
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
        <circle cx="16" cy="12" r="5" />
        <path d="M6 26c0-5.5 4.5-9 10-9s10 3.5 10 9" />
      </svg>
    ),
    title: "마이페이지 통합 관리",
    desc: "개인 정보와 신청 이력을 한 곳에서 조회·수정할 수 있습니다.",
  },
  {
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
        <path d="M6 8h20v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z" />
        <path d="M4 8h24" />
        <line x1="12" y1="4" x2="12" y2="8" />
        <line x1="20" y1="4" x2="20" y2="8" />
        <polyline points="11 17 14 20 21 13" />
      </svg>
    ),
    title: "다분야 동시 신청",
    desc: "음악·미술·문학 등 최대 3개 예술 분야를 한 번에 신청할 수 있습니다.",
  },
];

const HOW_TO = [
  {
    step: "01",
    title: "회원 가입 및 로그인",
    desc: "이메일 주소로 가입하고, 본인 인증을 완료하세요. 이미 가입한 회원은 로그인만 하시면 됩니다.",
  },
  {
    step: "02",
    title: "예술 분야 선택",
    desc: "음악, 미술, 문학 등 본인의 예술 활동 분야를 최대 3개까지 선택합니다.",
  },
  {
    step: "03",
    title: "활동 실적 입력",
    desc: "분야별 세부 실적을 입력하고 관련 증빙 파일(PDF, 이미지 등)을 첨부합니다.",
  },
  {
    step: "04",
    title: "내용 검토 및 제출",
    desc: "입력한 정보를 최종 확인한 후 신청서를 제출합니다. 제출 후에는 수정이 불가합니다.",
  },
  {
    step: "05",
    title: "심사 및 결과 확인",
    desc: "실제 제출 후 담당자 심사 결과는 공식 사이트(kawfartist.kr)에서 확인합니다. 이 서비스에서는 결과 화면을 미리 체험할 수 있습니다.",
  },
];

const FAQ = [
  {
    q: "예술활동증명이란 무엇인가요?",
    a: "예술활동증명은 예술인의 창작·실연·기술지원 등 예술 활동을 공식적으로 인정하는 제도입니다. 한국예술인복지재단에서 운영하며, 증명을 받으면 예술인 복지제도 혜택을 받을 수 있습니다.",
  },
  {
    q: "신청 자격은 어떻게 되나요?",
    a: "최근 5년간 해당 분야 활동 실적이 기준 이상이거나, 예술 활동 소득이 일정 기준(5년 600만원 이상 또는 전년도 120만원 이상)을 충족한 예술인이 신청할 수 있습니다.",
  },
  {
    q: "심사 기간은 얼마나 걸리나요?",
    a: "접수 완료 후 통상 4~6주 이내에 결과가 통보됩니다. 서류 보완이 필요한 경우 추가 시간이 소요될 수 있습니다.",
  },
  {
    q: "제출 후 내용을 수정할 수 있나요?",
    a: "실제 공식 신청에서는 최종 제출 이후 내용 수정이 불가합니다. 아트패스는 도우미 서비스로, 실제 신청 결과에는 영향을 주지 않습니다. 공식 제출 전 이곳에서 충분히 작성 내용을 점검해 보세요.",
  },
];

const MEMBERS = [
  { name: "방지원", role: "팀장 · 총괄",  github: "z1-won",     image: "/방지원.jpeg" },
  { name: "김서연", role: "프론트엔드",    github: "seoyeon6894", image: "/김서연.png"  },
  { name: "박수현", role: "백엔드",        github: "clapppp",     image: "/박수현.png"  },
  { name: "위인준", role: "AI · 기획",    github: "dnldlswns",   image: "/위인준.png"  },
];

export default function GuidePage({ onApply }: GuidePageProps) {
  return (
    <div className={styles.page}>

      {/* 페이지 헤더 */}
      <section className={styles.pageHeader}>
        <div className={styles.inner}>
          <p className={styles.eyebrow}>아트패스 artPass</p>
          <h1 className={styles.pageTitle}>이용안내</h1>
          <p className={styles.pageDesc}>
            예술활동증명 신청을 미리 준비할 수 있는 도우미 서비스 아트패스의 주요 기능과 이용 방법을 안내합니다.
          </p>
        </div>
      </section>

      {/* 서비스 소개 */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.introBlock}>
            <div className={styles.introText}>
              <span className={styles.badge}>서비스 소개</span>
              <h2 className={styles.sectionTitle}>예술활동증명 신청, 미리 준비해보세요</h2>
              <p className={styles.bodyText}>
                <strong>아트패스(artPass)</strong>는 한국예술인복지재단의 예술활동증명 신청 흐름을 미리 체험하고
                준비할 수 있는 도우미 서비스입니다. 실제 신청은 공식 사이트에서 진행해야 합니다.
              </p>
              <p className={styles.bodyText}>
                음악·미술·문학·공연 등 다양한 예술 분야의 신청서 작성 방식을 사전에 확인하고,
                필요한 증빙 자료와 기준을 파악하는 데 활용하세요.
              </p>
              <button type="button" className={styles.ctaBtn} onClick={onApply}>
                신청서 작성해보기
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={14} height={14}>
                  <line x1="3" y1="8" x2="13" y2="8" />
                  <polyline points="9 4 13 8 9 12" />
                </svg>
              </button>
            </div>
            <div className={styles.introVisual} aria-hidden="true">
              <div className={styles.visualCard}>
                <div className={styles.visualCardBadge}>예술활동증명서</div>
                <div className={styles.visualCardName}>홍길동 예술인</div>
                <div className={styles.visualCardField}>분야: 음악 · 미술</div>
                <div className={styles.visualCardMeta}>한국예술인복지재단 발급</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 주요 기능 */}
      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <span className={styles.badge}>주요 기능</span>
          <h2 className={styles.sectionTitle}>아트패스가 제공하는 기능</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 이용 방법 */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <span className={styles.badge}>이용 방법</span>
          <h2 className={styles.sectionTitle}>신청은 이렇게 진행됩니다</h2>
          <ol className={styles.howToList}>
            {HOW_TO.map((item, i) => (
              <li key={item.step} className={styles.howToItem}>
                <div className={styles.howToStep}>{item.step}</div>
                {i < HOW_TO.length - 1 && <div className={styles.howToLine} />}
                <div className={styles.howToBody}>
                  <h3 className={styles.howToTitle}>{item.title}</h3>
                  <p className={styles.howToDesc}>{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.sectionAlt}>
        <div className={styles.inner}>
          <span className={styles.badge}>FAQ</span>
          <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
          <dl className={styles.faqList}>
            {FAQ.map((item) => (
              <div key={item.q} className={styles.faqItem}>
                <dt className={styles.faqQ}>
                  <span className={styles.faqQMark}>Q</span>
                  {item.q}
                </dt>
                <dd className={styles.faqA}>
                  <span className={styles.faqAMark}>A</span>
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 개발자 크레딧 */}
      <section className={styles.credits}>
        <div className={styles.inner}>
          <span className={styles.badgeLight}>만든 사람들</span>
          <h2 className={styles.creditsTitle}>개발자 크레딧</h2>
          <p className={styles.creditsDesc}>
            아트패스는 <strong>공개SW프로젝트 1분반</strong> 팀이 컴퓨터공학전공 수업의 일환으로 개발한
            오픈소스 프로젝트입니다.
          </p>
          <div className={styles.memberGrid}>
            {MEMBERS.map((m) => (
              <a
                key={m.name}
                href={m.github ? `https://github.com/${m.github}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.memberCard}
                aria-label={`${m.name} GitHub 프로필`}
              >
                <div className={styles.memberAvatar}>
                  <img src={m.image} alt={m.name} className={styles.memberAvatarImg} loading="lazy" />
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{m.name}</span>
                  <span className={styles.memberRole}>{m.role}</span>
                  {m.github && (
                    <span className={styles.memberGithub}>@{m.github}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
          <div className={styles.creditsMeta}>
            <span>© 2026 아트패스 팀 · 공개SW프로젝트 1분반 · 컴퓨터공학전공</span>
          </div>
        </div>
      </section>

    </div>
  );
}
