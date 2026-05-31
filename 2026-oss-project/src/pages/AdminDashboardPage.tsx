import { useState, useEffect } from "react";
import styles from "./AdminDashboardPage.module.css";
import { getApplications } from "../api/application";
import type { Application, AppStatus } from "../api/types";

/* ── 상수 ──────────────────────────────────────────── */
const MONTHLY = [
  { month: "11월", total: 8,  approved: 5, rejected: 1 },
  { month: "12월", total: 12, approved: 7, rejected: 2 },
  { month: "1월",  total: 7,  approved: 4, rejected: 1 },
  { month: "2월",  total: 15, approved: 9, rejected: 3 },
  { month: "3월",  total: 11, approved: 6, rejected: 2 },
  { month: "4월",  total: 4,  approved: 2, rejected: 0 },
];

const AVATAR_COLORS = ["#4F6EF7","#F7934F","#4DA6D7","#9B4FF7","#F74F8A","#3DB87A"];

const STATUS_CFG: Record<AppStatus, { label: string; badgeCls: string }> = {
  심사중: { label: "심사중", badgeCls: "badgePending"  },
  승인:   { label: "승인",   badgeCls: "badgeApproved" },
  반려:   { label: "반려",   badgeCls: "badgeRejected"  },
};

const STAT_CARDS = [
  { key: "전체",   label: "전체 신청", desc: "누적 신청 건수", cls: "statNeutral"  },
  { key: "심사중", label: "심사중",    desc: "처리 대기 중",   cls: "statPending"  },
  { key: "승인",   label: "승인",      desc: "승인 완료",      cls: "statApproved" },
  { key: "반려",   label: "반려",      desc: "반려 처리",      cls: "statRejected" },
] as const;

/* ── 서브 컴포넌트 ─────────────────────────────────── */
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {name[0]}
    </div>
  );
}

function MiniBarChart() {
  const max = Math.max(...MONTHLY.map(d => d.total));
  return (
    <div className={styles.barChart}>
      {MONTHLY.map((d, i) => {
        const pending = d.total - d.approved - d.rejected;
        return (
          <div key={i} className={styles.barCol}>
            <div className={styles.barStack}>
              <div className={styles.barApproved} style={{ height: (d.approved / max) * 72 }} />
              <div className={styles.barPending}  style={{ height: (pending     / max) * 72 }} />
              <div className={styles.barRejected} style={{ height: (d.rejected  / max) * 72 }} />
            </div>
            <span className={styles.barLabel}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
interface Props {
  onGoToAdmin: () => void;
}

export default function AdminDashboardPage({ onGoToAdmin }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplications().then(apps => {
      setApplications(apps);
      setLoading(false);
    });
  }, []);

  const counts: Record<string, number> = {
    전체:   applications.length,
    심사중: applications.filter(a => a.status === "심사중").length,
    승인:   applications.filter(a => a.status === "승인").length,
    반려:   applications.filter(a => a.status === "반려").length,
  };

  const sorted = [...applications].sort((a, b) => b.applyDate.localeCompare(a.applyDate));

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* ── 헤더 ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>관리자 대시보드</h1>
            <p className={styles.pageSubtitle}>예술활동증명 신청 현황을 한눈에 확인하세요.</p>
          </div>
          <span className={styles.todayDate}>{todayStr} 기준</span>
        </div>

        {/* ── 통계 카드 ── */}
        <div className={styles.statsGrid}>
          {STAT_CARDS.map(({ key, label, desc, cls }) => (
            <div key={key} className={`${styles.statCard} ${styles[cls]}`}>
              <span className={styles.statNum}>{counts[key]}</span>
              <span className={styles.statLabel}>{label}</span>
              <span className={styles.statDesc}>{desc}</span>
            </div>
          ))}
        </div>

        {/* ── 본문 2단 ── */}
        <div className={styles.mainGrid}>

          {/* 신청 목록 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>신청 목록</h2>
              <button type="button" className={styles.cardLink} onClick={onGoToAdmin}>
                신청 관리
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={12} height={12}>
                  <line x1="2" y1="7" x2="12" y2="7" />
                  <polyline points="8 3 12 7 8 11" />
                </svg>
              </button>
            </div>

            {loading ? (
              <p className={styles.emptyText}>불러오는 중...</p>
            ) : sorted.length === 0 ? (
              <p className={styles.emptyText}>신청 건이 없습니다.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>신청인</th>
                    <th>분야</th>
                    <th>유형</th>
                    <th>신청일</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(app => {
                    const nm  = app.applicantName ?? "신청인";
                    const cfg = STATUS_CFG[app.status];
                    return (
                      <tr key={app.id} className={styles.tableRow} onClick={onGoToAdmin}>
                        <td>
                          <div className={styles.applicantCell}>
                            <Avatar name={nm} />
                            <span>{nm}</span>
                          </div>
                        </td>
                        <td className={styles.categoryCell}>{app.categories.join(" · ")}</td>
                        <td>{app.type}</td>
                        <td className={styles.dateCell}>{app.applyDate}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[cfg.badgeCls]}`}>{cfg.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 오른쪽: 차트 + 빠른 실행 */}
          <div className={styles.rightCol}>

            {/* 월별 추이 */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>월별 신청 추이</h2>
                <div className={styles.chartLegend}>
                  {([["#16a34a","승인"],["#d97706","심사"],["#dc2626","반려"]] as const).map(([c, l]) => (
                    <div key={l} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: c }} />
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <MiniBarChart />
            </div>

            {/* 빠른 실행 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>빠른 실행</h2>
              <div className={styles.quickActions}>

                <button type="button" className={styles.quickAction} onClick={onGoToAdmin}>
                  <div className={styles.quickActionIcon}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={18} height={18}>
                      <rect x="3" y="4" width="14" height="14" rx="2" />
                      <line x1="7" y1="9"  x2="13" y2="9"  />
                      <line x1="7" y1="12" x2="13" y2="12" />
                      <line x1="7" y1="15" x2="10" y2="15" />
                    </svg>
                  </div>
                  <div className={styles.quickActionText}>
                    <span className={styles.quickActionLabel}>신청 관리</span>
                    <span className={styles.quickActionDesc}>심사 대기 {counts.심사중}건</span>
                  </div>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={12} height={12}>
                    <line x1="2" y1="7" x2="12" y2="7" />
                    <polyline points="8 3 12 7 8 11" />
                  </svg>
                </button>

                {counts.반려 > 0 && (
                  <button type="button" className={`${styles.quickAction} ${styles.quickActionAlert}`} onClick={onGoToAdmin}>
                    <div className={`${styles.quickActionIcon} ${styles.quickActionIconAlert}`}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={18} height={18}>
                        <circle cx="10" cy="10" r="8" />
                        <line x1="10" y1="6" x2="10" y2="11" />
                        <circle cx="10" cy="14" r="0.5" fill="currentColor" />
                      </svg>
                    </div>
                    <div className={styles.quickActionText}>
                      <span className={styles.quickActionLabel}>반려 신청</span>
                      <span className={styles.quickActionDesc}>반려 {counts.반려}건 — 이의 신청 확인 필요</span>
                    </div>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={12} height={12}>
                      <line x1="2" y1="7" x2="12" y2="7" />
                      <polyline points="8 3 12 7 8 11" />
                    </svg>
                  </button>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
