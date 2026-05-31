import { useState, useEffect, useCallback } from "react";
import styles from "./AdminPage.module.css";
import type { Application, ApplicationEntry, AppStatus, AiFeedback } from "../api/types";
import { getApplications, reviewApplication } from "../api/application";
import { CATEGORY_META } from "../constants/categoryFormConfig";
import CategoryIcon from "../components/common/CategoryIcon";

/* ── 상수 ──────────────────────────────────────────── */
const STATUS_CFG: Record<AppStatus, { label: string; cls: string }> = {
  심사중: { label: "심사중", cls: "badgePending"  },
  승인:   { label: "승인",   cls: "badgeApproved" },
  반려:   { label: "반려",   cls: "badgeRejected"  },
};

const FILTER_TABS: { label: string; value: AppStatus | "전체" }[] = [
  { label: "전체",   value: "전체"   },
  { label: "심사중", value: "심사중" },
  { label: "승인",   value: "승인"   },
  { label: "반려",   value: "반려"   },
];

const MONTHLY = [
  { month: "11월", total: 8,  approved: 5, rejected: 1 },
  { month: "12월", total: 12, approved: 7, rejected: 2 },
  { month: "1월",  total: 7,  approved: 4, rejected: 1 },
  { month: "2월",  total: 15, approved: 9, rejected: 3 },
  { month: "3월",  total: 11, approved: 6, rejected: 2 },
  { month: "4월",  total: 4,  approved: 2, rejected: 0 },
];

const AVATAR_COLORS = ["#4F6EF7","#F7934F","#4DA6D7","#9B4FF7","#F74F8A","#3DB87A"];

/* ── 헬퍼 ──────────────────────────────────────────── */
function downloadFile(filename: string, data?: string, mimeType?: string) {
  let url: string;
  if (data) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    url = URL.createObjectURL(blob);
  } else {
    const blob = new Blob([`[Mock PDF] ${filename}`], { type: "application/pdf" });
    url = URL.createObjectURL(blob);
  }
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function AiFeedbackPanel({ feedback }: { feedback: AiFeedback }) {
  if (feedback.error) return null;

  const errors   = feedback.all_issues.filter(i => i.severity === "error");
  const warnings = feedback.all_issues.filter(i => i.severity === "warning");

  return (
    <div className={styles.aiFeedbackBox}>
      <div className={styles.aiFeedbackHeader}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" width={13} height={13} aria-hidden="true">
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
          <path d="M4.22 4.22l1.42 1.42M10.36 10.36l1.42 1.42M4.22 11.78l1.42-1.42M10.36 5.64l1.42-1.42" />
          <circle cx="8" cy="8" r="2" />
        </svg>
        <span>AI 사전 검토</span>
        <span className={feedback.is_sufficient ? styles.aiBadgeSufficient : styles.aiBadgeInsufficient}>
          {feedback.is_sufficient ? "기준 충족" : "보완 필요"}
        </span>
      </div>

      {Object.entries(feedback.by_category).map(([cat, catFb]) => (
        <p key={cat} className={styles.aiSummary}>{catFb.overall_summary}</p>
      ))}

      {errors.length > 0 && (
        <div className={styles.aiIssueGroup}>
          <span className={styles.aiGroupLabel}>필수 보완 ({errors.length})</span>
          {errors.map((issue, i) => (
            <div key={i} className={styles.aiIssueError}>
              <span className={styles.aiDot} />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className={styles.aiIssueGroup}>
          <span className={styles.aiGroupLabel}>권고 사항 ({warnings.length})</span>
          {warnings.map((issue, i) => (
            <div key={i} className={styles.aiIssueWarning}>
              <span className={styles.aiDot} />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function entryStats(entries: ApplicationEntry[]) {
  return {
    total:    entries.length,
    approved: entries.filter(e => e.entryStatus === "승인").length,
    rejected: entries.filter(e => e.entryStatus === "반려").length,
    pending:  entries.filter(e => e.entryStatus === "심사중").length,
  };
}

function categoryAdequacy(categories: string[], entries: ApplicationEntry[]) {
  return categories.map(cat => {
    const meta = CATEGORY_META[cat];
    const submitted = entries.filter(e => e.category === cat).length;
    const required  = meta?.minCount ?? 0;
    const unit      = meta?.unit ?? "건";
    return { cat, submitted, required, unit, met: submitted >= required };
  });
}

/* ── 서브 컴포넌트 ─────────────────────────────────── */
function StatusBadge({ status }: { status: AppStatus }) {
  const { label, cls } = STATUS_CFG[status];
  return <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {name[0]}
    </div>
  );
}

function DonutChart({ counts }: { counts: Record<string, number> }) {
  const total = counts["전체"];
  const r = 40, cx = 56, cy = 56, sw = 13;
  const C = 2 * Math.PI * r;
  const slices = [
    { value: counts["심사중"], color: "#d97706" },
    { value: counts["승인"],   color: "#16a34a" },
    { value: counts["반려"],   color: "#dc2626" },
  ];
  let acc = 0;
  return (
    <div className={styles.donutWrap}>
      <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f3f5" strokeWidth={sw} />
        {total > 0 && slices.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const offset = -(acc * C);
          acc += frac;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
            />
          );
        })}
      </svg>
      <div className={styles.donutCenter}>
        <span className={styles.donutTotal}>{total}</span>
        <span className={styles.donutLabel}>전체</span>
      </div>
    </div>
  );
}

function BarChart() {
  const max = Math.max(...MONTHLY.map(d => d.total));
  return (
    <div className={styles.barChart}>
      {MONTHLY.map((d, i) => {
        const pending = d.total - d.approved - d.rejected;
        return (
          <div key={i} className={styles.barCol}>
            <div className={styles.barStack}>
              <div className={styles.barApproved} style={{ height: (d.approved / max) * 56 }} />
              <div className={styles.barPending}  style={{ height: (pending     / max) * 56 }} />
              <div className={styles.barRejected} style={{ height: (d.rejected  / max) * 56 }} />
            </div>
            <span className={styles.barLabel}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── 서류 검토 현황 카드 ───────────────────────────── */
function ReviewCard({ app }: { app: Application }) {
  const stats    = entryStats(app.entries);
  const adequacy = categoryAdequacy(app.categories, app.entries);

  return (
    <div className={styles.reviewCard}>
      {/* 분야별 실적 충족 현황 */}
      <div className={styles.reviewBlock}>
        <span className={styles.reviewBlockLabel}>분야별 실적</span>
        {adequacy.map(({ cat, submitted, required, unit, met }) => (
          <div key={cat} className={styles.adequacyRow}>
            <div className={styles.adequacyCatName}>
              <CategoryIcon category={cat} size={13} />
              <span>{cat}</span>
            </div>
            <div className={styles.adequacyBarWrap}>
              <div
                className={styles.adequacyBarFill}
                style={{
                  width: `${Math.min(100, required > 0 ? (submitted / required) * 100 : 100)}%`,
                  background: met ? "#16a34a" : "#dc2626",
                }}
              />
            </div>
            <span className={met ? styles.adequacyMet : styles.adequacyUnmet}>
              {submitted} / {required}{unit}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.reviewDivider} />

      {/* 실적 상태 요약 */}
      <div className={styles.reviewBlock}>
        <span className={styles.reviewBlockLabel}>실적 현황</span>
        <div className={styles.statusCounts}>
          {([
            ["승인",   stats.approved, "#16a34a", "#e6f4ea"],
            ["반려",   stats.rejected, "#c0392b", "#fce8e8"],
            ["심사중", stats.pending,  "#856404", "#fff3cd"],
          ] as const).map(([label, count, color, bg]) => (
            <div key={label} className={styles.statusCount} style={{ background: bg }}>
              <span className={styles.statusCountNum} style={{ color }}>{count}</span>
              <span className={styles.statusCountLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppStatus | "전체">("심사중");
  const [selected, setSelected] = useState<Application | null>(null);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const apps = await getApplications();
    setApplications(apps);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    전체:   applications.length,
    심사중: applications.filter(a => a.status === "심사중").length,
    승인:   applications.filter(a => a.status === "승인").length,
    반려:   applications.filter(a => a.status === "반려").length,
  };

  const filtered = filter === "전체" ? applications : applications.filter(a => a.status === filter);

  const handleReview = async (status: "승인" | "반려") => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await reviewApplication(selected.id, status, memo || undefined);
      const apps = await getApplications();
      setApplications(apps);
      const updated = apps.find(a => a.id === selected.id);
      if (updated) setSelected(updated);
      setMemo("");
    } finally {
      setSubmitting(false);
    }
  };

  const byCategory = selected
    ? selected.entries.reduce<Record<string, typeof selected.entries>>((acc, e) => {
        (acc[e.category] ??= []).push(e);
        return acc;
      }, {})
    : {};

  const name = (app: Application) => app.applicantName ?? "신청인";

  return (
    <div className={`${styles.layout} ${selected ? styles.withDetail : ""}`}>

      {/* ── 목록 패널 ── */}
      <aside className={styles.listPanel}>

        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>신청 관리</h2>
        </div>

        {/* 통계 도넛 */}
        <div className={styles.statsSection}>
          <p className={styles.sectionLabel}>신청 현황</p>
          <div className={styles.statsRow}>
            <DonutChart counts={counts} />
            <div className={styles.statsLegend}>
              {([
                ["심사중", counts.심사중, "#d97706"],
                ["승인",   counts.승인,   "#16a34a"],
                ["반려",   counts.반려,   "#dc2626"],
              ] as const).map(([label, count, color]) => (
                <div key={label} className={styles.legendRow}>
                  <span className={styles.legendDot} style={{ background: color }} />
                  <span className={styles.legendText}>{label}</span>
                  <span className={styles.legendCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 월별 추이 */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <p className={styles.sectionLabel}>월별 신청 추이</p>
            <div className={styles.chartLegend}>
              {([["#16a34a","승인"],["#d97706","심사"],["#dc2626","반려"]] as const).map(([c, l]) => (
                <div key={l} className={styles.chartLegendItem}>
                  <span className={styles.chartLegendDot} style={{ background: c }} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <BarChart />
        </div>

        {/* 필터 탭 */}
        <div className={styles.filterTabs} role="tablist">
          {FILTER_TABS.map(tab => (
            <button key={tab.value} type="button" role="tab"
              aria-selected={filter === tab.value}
              className={`${styles.filterTab} ${filter === tab.value ? styles.filterTabActive : ""}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
              <span className={styles.filterCount}>{counts[tab.value]}</span>
            </button>
          ))}
        </div>

        {/* 신청 목록 */}
        {loading ? (
          <div className={styles.empty}><p>불러오는 중...</p></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}><p>해당하는 신청 건이 없습니다.</p></div>
        ) : (
          <ul className={styles.list} role="list">
            {filtered.map(app => {
              const stats = entryStats(app.entries);
              return (
                <li key={app.id}>
                  <button type="button"
                    className={`${styles.listItem} ${selected?.id === app.id ? styles.listItemActive : ""}`}
                    onClick={() => { setSelected(app); setMemo(""); }}
                    aria-current={selected?.id === app.id ? true : undefined}
                  >
                    <div className={styles.itemRow1}>
                      <Avatar name={name(app)} size={32} />
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>{name(app)}</span>
                        <span className={styles.itemCategories}>{app.categories.join(" · ")}</span>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    {/* 실적 요약 */}
                    <div className={styles.itemEntryStats}>
                      <span className={styles.itemTotal}>총 {stats.total}건 제출</span>
                      {stats.rejected > 0 && (
                        <span className={styles.itemRejected}>· 반려 {stats.rejected}건</span>
                      )}
                      {stats.rejected === 0 && stats.approved > 0 && (
                        <span className={styles.itemApproved}>· 승인 {stats.approved}건</span>
                      )}
                      {stats.pending > 0 && (
                        <span className={styles.itemPending}>· 심사중 {stats.pending}건</span>
                      )}
                    </div>

                    <div className={styles.itemMeta}>
                      <span className={styles.itemApplyNo}>{app.applyNo}</span>
                      <span className={styles.itemDot}>·</span>
                      <span className={styles.itemDate}>{app.applyDate}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── 상세 패널 ── */}
      {selected ? (
        <main className={styles.detail}>

          <div className={styles.detailHeader}>
            <div className={styles.detailApplicant}>
              <Avatar name={name(selected)} size={44} />
              <div>
                <div className={styles.detailNameRow}>
                  <span className={styles.detailName}>{name(selected)}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <span className={styles.detailApplyNo}>{selected.applyNo}</span>
              </div>
            </div>
            <button type="button" className={styles.closeBtn}
              onClick={() => setSelected(null)} aria-label="닫기"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={18} height={18}>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>
          </div>

          <div className={styles.detailBody}>

            {/* 서류 검토 현황 */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>서류 검토 현황</h3>
              <ReviewCard app={selected} />
            </section>

            {/* AI 사전 검토 */}
            {selected.aiFeedback && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>AI 사전 검토</h3>
                <AiFeedbackPanel feedback={selected.aiFeedback} />
              </section>
            )}

            {/* 신청 정보 */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>신청 정보</h3>
              <dl className={styles.infoGrid}>
                <div className={styles.infoRow}><dt>신청 유형</dt><dd>{selected.type}</dd></div>
                <div className={styles.infoRow}><dt>신청 분야</dt><dd>{selected.categories.join(", ")}</dd></div>
                <div className={styles.infoRow}><dt>신청일</dt><dd>{selected.applyDate}</dd></div>
                <div className={styles.infoRow}><dt>처리일</dt><dd>{selected.statusDate}</dd></div>
              </dl>
            </section>

            {/* 반려 사유 */}
            {selected.status === "반려" && selected.reason && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>반려 사유</h3>
                <div className={styles.reasonBox}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={16} height={16} aria-hidden="true">
                    <circle cx="10" cy="10" r="8" />
                    <line x1="10" y1="6" x2="10" y2="11" />
                    <circle cx="10" cy="14" r="0.5" fill="currentColor" />
                  </svg>
                  <p>{selected.reason}</p>
                </div>
              </section>
            )}

            {/* 제출 실적 */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>제출 실적 ({selected.entries.length}건)</h3>
              {Object.entries(byCategory).map(([cat, entries]) => (
                <div key={cat} className={styles.categoryBlock}>
                  <div className={styles.categoryLabel}>
                    <CategoryIcon category={cat} size={14} />
                    {cat}
                  </div>
                  <div className={styles.entryList}>
                    {entries.map((entry, i) => {
                      const esCls = entry.entryStatus === "반려"  ? styles.entryItemRejected
                                  : entry.entryStatus === "승인"  ? styles.entryItemApproved
                                  : "";
                      const badgeCls = entry.entryStatus === "반려"  ? styles.entryBadgeRejected
                                     : entry.entryStatus === "승인"  ? styles.entryBadgeApproved
                                     : entry.entryStatus === "심사중" ? styles.entryBadgePending
                                     : "";
                      return (
                        <div key={i} className={`${styles.entryItem} ${esCls}`}>
                          <div className={styles.entryNum}>{i + 1}</div>
                          <div className={styles.entryContent}>

                            {/* 제목 + 상태 */}
                            <div className={styles.entryTitleRow}>
                              <span className={styles.entryTitle}>{entry.title}</span>
                              {entry.entryStatus && (
                                <span className={`${styles.entryBadge} ${badgeCls}`}>{entry.entryStatus}</span>
                              )}
                            </div>

                            {/* 메타 정보 */}
                            <div className={styles.entryMeta}>
                              {entry.publisher && <span>{entry.publisher}</span>}
                              {entry.genre && <><span className={styles.metaDot}>·</span><span>{entry.genre}</span></>}
                              {entry.date   && <><span className={styles.metaDot}>·</span><span>{entry.date}</span></>}
                            </div>

                            {/* 제출 파일 다운로드 */}
                            {entry.files && entry.files.length > 0 && (
                              <div className={styles.entryFiles}>
                                <span className={styles.entryFilesLabel}>제출 파일</span>
                                <div className={styles.entryFileBtns}>
                                  {entry.files.map((f, fi) => (
                                    <button key={fi} type="button"
                                      className={styles.fileBtn}
                                      onClick={() => downloadFile(f.filename, f.data, f.mimeType)}
                                    >
                                      {/* PDF 아이콘 */}
                                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" width={13} height={13} aria-hidden="true">
                                        <rect x="3" y="1" width="10" height="14" rx="1.5" />
                                        <line x1="6" y1="5" x2="10" y2="5" />
                                        <line x1="6" y1="8" x2="10" y2="8" />
                                        <line x1="6" y1="11" x2="8"  y2="11" />
                                      </svg>
                                      <span>{f.label}</span>
                                      {/* 다운로드 아이콘 */}
                                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" width={12} height={12} aria-hidden="true">
                                        <line x1="8" y1="2" x2="8" y2="10" />
                                        <polyline points="5 7 8 10 11 7" />
                                        <line x1="3" y1="14" x2="13" y2="14" />
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}


                            {/* 반려 사유 */}
                            {entry.entryReason && (
                              <div className={styles.entryReason}>{entry.entryReason}</div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* 심사 영역 */}
            {selected.status === "심사중" && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>심사</h3>
                <textarea
                  className={styles.memoArea}
                  placeholder="메모 또는 반려 사유를 입력하세요 (반려 시 신청자에게 표시됩니다)"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  rows={4}
                />
                <div className={styles.reviewActions}>
                  <button type="button" className={styles.btnReject}
                    onClick={() => handleReview("반려")}
                    disabled={submitting || !memo.trim()}
                  >
                    {submitting ? "처리 중..." : "반려"}
                  </button>
                  <button type="button" className={styles.btnApprove}
                    onClick={() => handleReview("승인")}
                    disabled={submitting}
                  >
                    {submitting ? "처리 중..." : "승인"}
                  </button>
                </div>
              </section>
            )}

          </div>
        </main>
      ) : (
        <div className={styles.emptyDetail}>
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" width={48} height={48} aria-hidden="true">
            <rect x="8" y="6" width="32" height="36" rx="3" />
            <line x1="16" y1="16" x2="32" y2="16" />
            <line x1="16" y1="22" x2="32" y2="22" />
            <line x1="16" y1="28" x2="24" y2="28" />
          </svg>
          <p>목록에서 신청 건을 선택하면<br />심사를 진행할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
