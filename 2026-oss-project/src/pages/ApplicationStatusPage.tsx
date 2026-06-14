import { useState, useEffect } from "react";
import styles from "./ApplicationStatusPage.module.css";
import type { Application, AppStatus, EntryStatus, ApplicationEntry, AiFeedback } from "../api/types";
import { getApplications } from "../api/application";
import CategoryIcon from "../components/common/CategoryIcon";
import { useAuth } from "../context/AuthContext";
import { formatDraftDate, type ApplyDraft } from "../utils/draft";
import { getDraft } from "../api/draft";

// ── 헬퍼 ──────────────────────────────────────────────────────
/** "2025-01-15 14:30:25" → "2025.01.15 14:30:25" (시·분·초 포함) */
function formatApplyDate(applyDate: string): string {
  if (!applyDate) return "";
  // ISO datetime "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD HH:MM:SS" → "YYYY.MM.DD HH:MM:SS"
  const normalized = applyDate.replace("T", " ");
  const [datePart, timePart] = normalized.split(" ");
  const formattedDate = datePart.replace(/-/g, ".");
  return timePart ? `${formattedDate} ${timePart}` : formattedDate;
}

function getFieldType(app: Application) {
  return app.categories.length === 1 ? "단일 분야" : `복합 분야 ${app.categories.length}개`;
}

function getRejectedCount(entries: ApplicationEntry[]) {
  return entries.filter((e) => e.entryStatus === "반려").length;
}

const STATUS_ORDER: AppStatus[] = ["반려", "심사중", "승인"];

type DisplayStatus = "AI판독중" | "판독완료" | "승인" | "반려";

function getDisplayStatus(app: Application): DisplayStatus {
  if (app.status === "승인") return "승인";
  if (app.status === "반려") return "반려";
  return app.aiFeedback ? "판독완료" : "AI판독중";
}

const DISPLAY_STATUS_CFG: Record<DisplayStatus, { label: string; cls: string }> = {
  "AI판독중": { label: "AI 판독중", cls: "badgePending"  },
  "판독완료":  { label: "판독완료",  cls: "badgeReviewed" },
  "승인":      { label: "승인",      cls: "badgeApproved" },
  "반려":      { label: "반려",      cls: "badgeRejected" },
};

function StatusBadge({ app }: { app: Application }) {
  const ds = getDisplayStatus(app);
  const { label, cls } = DISPLAY_STATUS_CFG[ds];
  return <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>;
}

const ENTRY_STATUS_CFG: Record<EntryStatus, { label: string; cls: string }> = {
  심사중: { label: "심사중", cls: "entryTagPending"  },
  승인:   { label: "승인",   cls: "entryTagApproved" },
  반려:   { label: "반려",   cls: "entryTagRejected" },
};

// ── 타임라인 ──────────────────────────────────────────────────
const STEPS = ["접수 완료", "AI 판독중", "판독완료"];

function StatusTimeline({ app }: { app: Application }) {
  const ds = getDisplayStatus(app);
  // 접수완료(0) → AI판독중(1) → 판독완료(2)
  // active: 현재 진행 중인 인덱스
  const active = ds === "AI판독중" ? 1 : 2;
  const isRejected = ds === "반려";

  return (
    <div className={styles.timeline}>
      {STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        const nodeCls = done
          ? styles.timelineNodeDone
          : current
            ? (isRejected ? styles.timelineNodeRejected : styles.timelineNodeActive)
            : styles.timelineNodeFuture;

        return (
          <div key={label} className={styles.timelineStep}>
            <div className={`${styles.timelineNode} ${nodeCls}`}>
              {done ? (
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={9} height={9}>
                  <polyline points="2 7.5 5.5 11 12 3.5" />
                </svg>
              ) : current && isRejected ? (
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={9} height={9}>
                  <line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" />
                </svg>
              ) : (
                <span className={current ? styles.timelinePulse : styles.timelineDot} />
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`${styles.timelineConnector} ${done ? styles.timelineConnectorDone : ""}`} />
            )}
            <span className={`${styles.timelineLabel} ${
              done ? styles.timelineLabelDone :
              (current && isRejected) ? styles.timelineLabelRejected :
              current ? styles.timelineLabelActive :
              ""
            }`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 상태 배너 ─────────────────────────────────────────────────
function StatusBanner({ app }: { app: Application }) {
  const rejectedCount = getRejectedCount(app.entries);

  if (app.status === "승인") return (
    <div className={`${styles.statusBanner} ${styles.bannerApproved}`}>
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" width={28} height={28} aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#16a34a" />
        <polyline points="6 12.5 10 16 18 8" stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div>
        <p className={styles.bannerTitle}>예술활동증명이 승인되었습니다</p>
        <p className={styles.bannerDesc}>제출하신 {app.entries.length}건의 실적이 모두 심사를 통과했습니다. 마이페이지에서 증명서를 발급받으세요.</p>
      </div>
    </div>
  );

  if (app.status === "반려") return (
    <div className={`${styles.statusBanner} ${styles.bannerRejected}`}>
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" width={28} height={28} aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#dc2626" />
        <line x1="7.5" y1="7.5" x2="16.5" y2="16.5" stroke="#fff" strokeWidth={2.5} />
        <line x1="16.5" y1="7.5" x2="7.5" y2="16.5" stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div>
        <p className={styles.bannerTitle}>심사 결과 반려 처리되었습니다</p>
        <p className={styles.bannerDesc}>
          총 {app.entries.length}건 중 <strong>{rejectedCount}건이 반려</strong>되었습니다.
          아래 항목별 반려 사유를 확인하고 재신청해 주세요.
        </p>
        {app.reason && (
          <p className={styles.bannerReason}>
            <span className={styles.bannerReasonLabel}>심사관 사유 · </span>
            {app.reason}
          </p>
        )}
      </div>
    </div>
  );

  const ds = getDisplayStatus(app);

  if (ds === "AI판독중") return (
    <div className={`${styles.statusBanner} ${styles.bannerPending}`}>
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" width={28} height={28} aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#d97706" />
        <path d="M8 12h4M12 8v4" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.3" fill="#fff" />
      </svg>
      <div>
        <p className={styles.bannerTitle}>AI 판독 중입니다</p>
        <p className={styles.bannerDesc}>제출하신 서류를 AI가 교차검증하고 있습니다. 잠시 후 다시 확인해 주세요.</p>
      </div>
    </div>
  );

  return (
    <div className={`${styles.statusBanner} ${styles.bannerReviewed}`}>
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" width={28} height={28} aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#2563eb" />
        <polyline points="6 12.5 10 16 18 8" stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div>
        <p className={styles.bannerTitle}>AI 판독이 완료되었습니다</p>
        <p className={styles.bannerDesc}>총 {app.entries.length}건의 실적에 대한 AI 검토가 완료되었습니다. 아래에서 결과를 확인하세요.</p>
      </div>
    </div>
  );
}

// ── PDF 다운로드 버튼 ─────────────────────────────────────────
function FileBtn({ label, filename, appId, entryIdx, slot }: {
  label: string; filename: string; appId: string; entryIdx: number; slot: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/applications/${appId}/file?entry_idx=${entryIdx}&slot=${slot}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("파일을 불러올 수 없습니다");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("파일 다운로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className={styles.fileBtn} onClick={handleDownload} disabled={loading} title={filename}>
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={11} height={11} aria-hidden="true">
        <path d="M7 2v7M4.5 6.5 7 9l2.5-2.5" /><line x1="2" y1="12" x2="12" y2="12" />
      </svg>
      {loading ? "…" : label}
    </button>
  );
}

// ── AI 피드백 섹션 ────────────────────────────────────────────
function AiFeedbackSection({ feedback }: { feedback: AiFeedback }) {
  if (feedback.error) return null;

  const errors   = feedback.all_issues.filter(i => i.severity === "error");
  const warnings = feedback.all_issues.filter(i => i.severity === "warning");

  return (
    <div className={styles.aiFeedbackBox}>
      <div className={styles.aiFeedbackHeader}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" width={14} height={14} aria-hidden="true">
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
          <path d="M4.22 4.22l1.42 1.42M10.36 10.36l1.42 1.42M4.22 11.78l1.42-1.42M10.36 5.64l1.42-1.42" />
          <circle cx="8" cy="8" r="2" />
        </svg>
        <span>AI 사전 검토 결과</span>
        <span className={feedback.is_sufficient ? styles.aiBadgeSufficient : styles.aiBadgeInsufficient}>
          {feedback.is_sufficient ? "기준 충족" : "보완 필요"}
        </span>
      </div>

      {Object.entries(feedback.by_category).map(([cat, catFeedback]) => (
        <p key={cat} className={styles.aiSummary}>{catFeedback.overall_summary}</p>
      ))}

      {errors.length > 0 && (
        <div className={styles.aiIssueGroup}>
          <span className={styles.aiIssueGroupLabel}>필수 보완 ({errors.length}건)</span>
          {errors.map((issue, i) => (
            <div key={i} className={styles.aiIssueError}>
              <span className={styles.aiIssueDot} />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className={styles.aiIssueGroup}>
          <span className={styles.aiIssueGroupLabel}>권고 사항 ({warnings.length}건)</span>
          {warnings.map((issue, i) => (
            <div key={i} className={styles.aiIssueWarning}>
              <span className={styles.aiIssueDot} />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {feedback.all_suggestions.length > 0 && (
        <div className={styles.aiSuggestions}>
          <span className={styles.aiSuggestionsLabel}>보완 제안</span>
          {feedback.all_suggestions.map((s, i) => (
            <div key={i} className={styles.aiSuggestionItem}>
              <span className={styles.aiSuggestionNum}>{i + 1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 반려 사유 모달 ────────────────────────────────────────────
function ReasonModal({ entry, index, onClose, onReapply }: {
  entry: ApplicationEntry;
  index: number;
  onClose: () => void;
  onReapply?: () => void;
}) {
  const subtitle = [entry.category, entry.genre, entry.publisher, entry.date].filter(Boolean).join("  ·  ");
  const d = entry.rejectionDetail;

  const criteriaIconCls = (s: "fail" | "pass" | "neutral") =>
    s === "fail" ? styles.criteriaIconFail : s === "pass" ? styles.criteriaIconPass : styles.criteriaIconNeutral;
  const criteriaIconChar = (s: "fail" | "pass" | "neutral") =>
    s === "fail" ? "✕" : s === "pass" ? "✓" : "—";

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>

        {/* 헤더 */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <span className={styles.modalTag}>⚠ 반려</span>
            <h3 className={styles.modalTitle}>{entry.title}</h3>
            <span className={styles.modalSubtitle}>{subtitle}</span>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {/* 바디 */}
        <div className={styles.modalBody}>

          {/* 작품 정보 */}
          <div className={styles.modalWorkInfo}>
            <div className={styles.modalWorkNum}>{index + 1}</div>
            <div>
              <div className={styles.modalWorkTitle}>{entry.title}</div>
              <div className={styles.modalWorkMeta}>{subtitle}</div>
            </div>
          </div>

          {/* 반려 사유 */}
          <div className={styles.modalReasonBox}>
            <div className={styles.modalReasonBoxTitle}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="#d32f2f" strokeWidth="1.5"/>
                <path d="M8 5v4M8 11v.5" stroke="#d32f2f" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              심사관 반려 사유
            </div>
            <div className={styles.modalReasonBoxText}>{d?.fullReason ?? entry.entryReason}</div>
          </div>

          {/* 심사 기준 */}
          {d?.criteria && (
            <div className={styles.modalCriteria}>
              <div className={styles.modalCriteriaHeader}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="#1a56db" strokeWidth="1.5"/>
                  <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="#1a56db" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {d.criteriaTitle ?? "예술활동증명 세부 기준"}
              </div>
              <div className={styles.modalCriteriaBody}>
                {d.criteriaSubtitle && <div className={styles.criteriaSubtitle}>{d.criteriaSubtitle}</div>}
                {d.criteria.map((c, i) => (
                  <div key={i} className={`${styles.criteriaRow} ${c.highlight ? styles.criteriaRowHighlight : ""}`}>
                    <div className={`${styles.criteriaIcon} ${criteriaIconCls(c.status)}`}>{criteriaIconChar(c.status)}</div>
                    <div className={styles.criteriaText}>{c.text}</div>
                    <span className={`${styles.criteriaBadge} ${c.badge === "미충족" ? styles.criteriaBadgeRequired : styles.criteriaBadgeMet}`}>{c.badge}</span>
                  </div>
                ))}
                <div className={styles.criteriaNote}>
                  ※ 복수 기준 해당 시 각 기준 충족 하한을 1점으로 환산하여 합계 1점 이상이면 충족으로 인정합니다.
                </div>
              </div>
            </div>
          )}

          {/* 미충족 항목 */}
          {d?.unmetItems && d.unmetItems.length > 0 && (
            <div className={styles.unmetBox}>
              <div className={styles.unmetBoxTitle}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2L14 13H2L8 2Z" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M8 7v3M8 11.5v.5" stroke="#b45309" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                반려 원인 — 보완이 필요한 항목
              </div>
              <div className={styles.unmetList}>
                {d.unmetItems.map((item, i) => (
                  <div key={i} className={styles.unmetItem}>
                    <div className={styles.unmetDot} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 보완 방법 */}
          {d?.actionSteps && d.actionSteps.length > 0 && (
            <div className={styles.modalActionGuide}>
              <div className={styles.modalActionGuideTitle}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="#1a56db" strokeWidth="1.4"/>
                  <path d="M6 8l2 2 3-3" stroke="#1a56db" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                재신청을 위한 보완 방법
              </div>
              <div className={styles.actionSteps}>
                {d.actionSteps.map((step, i) => (
                  <div key={i} className={styles.actionStep}>
                    <div className={styles.actionStepNum}>{i + 1}</div>
                    <div className={styles.actionStepText}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* 푸터 */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalBtnSecondary} onClick={onClose}>닫기</button>
          <button type="button" className={styles.modalBtnPrimary} onClick={() => { onClose(); onReapply?.(); }}>
            이 작품만 재신청하기 →
          </button>
        </div>

      </div>
    </div>
  );
}

// ── 작품 카드 ─────────────────────────────────────────────────
function EntryCard({ entry, index, appId, onReapply }: { entry: ApplicationEntry; index: number; appId: string; onReapply?: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const status = entry.entryStatus ?? "심사중";
  const isRejected = status === "반려";
  const isApproved = status === "승인";
  const { label, cls } = ENTRY_STATUS_CFG[status];

  const metaParts = [
    entry.genre, entry.publisher, entry.date,
    entry.character,
    entry.isbn,
    entry.method && entry.method !== entry.genre ? entry.method : undefined,
    entry.role   && entry.role   !== entry.genre ? entry.role   : undefined,
    (entry.serialStart || entry.serialEnd)
      ? [entry.serialStart, entry.serialEnd].filter(Boolean).join(" ~ ")
      : undefined,
  ].filter(Boolean).join("  ·  ");

  const seqCls = isRejected ? styles.entrySeqRejected
               : isApproved ? styles.entrySeqApproved
               : styles.entrySeqPending;

  return (
    <div className={`${styles.entryCard} ${isRejected ? styles.entryCardRejected : ""}`}>
      <div className={styles.entryRow}>
        <span className={`${styles.entrySeq} ${seqCls}`}>{index + 1}</span>
        <div className={styles.entryInfo}>
          <div className={styles.entryTitleRow}>
            <span className={styles.entryTitle}>{entry.title}</span>
            <span className={`${styles.entryTag} ${styles[cls]}`}>{label}</span>
            {entry.files && entry.files.length > 0 && (
              <div className={styles.entryFiles}>
                {entry.files.map((f) => (
                  <FileBtn key={f.label} label={f.label} filename={f.filename} appId={appId} entryIdx={index} slot={f.slot ?? ""} />
                ))}
              </div>
            )}
          </div>
          {metaParts && <div className={styles.entryMeta}>{metaParts}</div>}
        </div>
      </div>

      {isRejected && entry.entryReason && (
        <div className={styles.rejectionInline}>
          <span className={styles.rejectionInlineLabel}>반려 사유</span>
          <span className={styles.rejectionInlineText}>{entry.entryReason}</span>
          <button
            type="button"
            className={styles.reasonDetailBtn}
            onClick={() => setShowModal(true)}
          >
            상세 보기 →
          </button>
        </div>
      )}
      {showModal && entry.entryReason && (
        <ReasonModal entry={entry} index={index} onClose={() => setShowModal(false)} onReapply={onReapply} />
      )}
    </div>
  );
}

// ── 상세 패널 ─────────────────────────────────────────────────
function DetailPanel({ app, onClose, onReapply }: { app: Application; onClose: () => void; onReapply?: () => void }) {
  const isMulti = app.categories.length > 1;
  const fieldType = getFieldType(app);
  const rejectedCount = getRejectedCount(app.entries);

  const byCategory = app.entries.reduce<Record<string, ApplicationEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className={styles.detail}>
      {/* ── 헤더: 분야명 + 접수번호 ── */}
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <p className={styles.detailTitle}>
            {app.categories.map((cat, i) => (
              <span key={cat} className={styles.detailCatItem}>
                {i > 0 && <span className={styles.detailCatSep}>/</span>}
                <CategoryIcon category={cat} size={14} />
                {cat}
              </span>
            ))}
          </p>
          <span className={styles.detailApplyNo}>접수번호 {app.applyNo}</span>
          {app.applicantPenName && (
            <span className={styles.detailPenName}>필명 {app.applicantPenName}</span>
          )}
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={16} height={16}>
            <line x1="3" y1="3" x2="15" y2="15" /><line x1="15" y1="3" x2="3" y2="15" />
          </svg>
        </button>
      </div>

      <div className={styles.detailScroll}>
        {/* ── 상태 배너 ── */}
        <StatusBanner app={app} />

        <div className={styles.detailBody}>

          {/* ── 요약 바: 분야·기간·건수 한 줄 ── */}
          <div className={styles.infoBar}>
            <span>
              <span className={styles.infoLabel}>분야</span>
              {fieldType} ({app.categories.join("·")})
            </span>
            <span className={styles.infoSep} />
            <span>
              <span className={styles.infoLabel}>신청 일시</span>
              {formatApplyDate(app.applyDate)}
            </span>
            <span className={styles.infoSep} />
            <span>
              <span className={styles.infoLabel}>총 작품</span>
              {app.entries.length}건
            </span>
            {rejectedCount > 0 && (
              <>
                <span className={styles.infoSep} />
                <span className={styles.infoRejected}>반려 {rejectedCount}건</span>
              </>
            )}
          </div>

          {/* ── 진행 단계 ── */}
          <div className={styles.timelineCard}>
            <StatusTimeline app={app} />
          </div>

          {/* ── AI 사전 검토 ── */}
          {app.aiFeedback
            ? <AiFeedbackSection feedback={app.aiFeedback} />
            : (
              <div className={styles.aiFeedbackBox}>
                <div className={styles.aiFeedbackHeader}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" width={14} height={14} aria-hidden="true">
                    <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
                    <circle cx="8" cy="8" r="3" />
                  </svg>
                  AI 사전 검토
                </div>
                <p style={{ margin: 0, color: "var(--krds-text-3)", fontSize: "0.875rem" }}>
                  AI 교차검증이 처리 중입니다. 잠시 후 다시 확인해 주세요.
                </p>
              </div>
            )
          }

          {/* ── 작품 목록 ── */}
          <section className={styles.entriesSection}>
            <h3 className={styles.entriesSectionTitle}>
              제출 실적 상세
              {app.status === "반려" && rejectedCount > 0 && (
                <span className={styles.entriesSectionHint}>항목별 반려 사유를 확인하세요</span>
              )}
            </h3>

            {isMulti ? (
              app.categories.map((cat) => {
                const entries = byCategory[cat] ?? [];
                const catRejected = getRejectedCount(entries);
                return (
                  <div key={cat} className={styles.categorySection}>
                    <div className={styles.categorySectionHeader}>
                      <span className={styles.categorySectionIcon}>
                        <CategoryIcon category={cat} size={13} />
                      </span>
                      <span className={styles.categorySectionName}>{cat}</span>
                      <span className={styles.categorySectionCount}>{entries.length}점</span>
                      {catRejected > 0 && (
                        <span className={styles.categorySectionRejected}>반려 {catRejected}건</span>
                      )}
                    </div>
                    <div className={styles.entryList}>
                      {entries.map((entry, i) => (
                        <EntryCard key={i} entry={entry} index={app.entries.indexOf(entry)} appId={app.id} onReapply={onReapply} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.entryList}>
                {app.entries.map((entry, i) => (
                  <EntryCard key={i} entry={entry} index={i} appId={app.id} onReapply={onReapply} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Sticky CTA ── */}
      <div className={styles.detailFooter}>
        <button type="button" className={styles.closeFooterBtn} onClick={onClose}>닫기</button>
        {app.status === "반려" && (
          <button type="button" className={styles.reapplyBtn} onClick={onReapply}>
            반려 사유 확인 후 재신청하기 →
          </button>
        )}
      </div>
    </div>
  );
}

// ── 목록 아이템 ───────────────────────────────────────────────
function ListItem({ app, active, onClick }: { app: Application; active: boolean; onClick: () => void }) {
  const rejectedCount = getRejectedCount(app.entries);
  const fieldType = getFieldType(app);

  const statusBorderCls =
    app.status === "반려" ? styles.listItemRejected :
    app.status === "승인" ? styles.listItemApproved :
    styles.listItemPending;

  return (
    <button
      type="button"
      className={`${styles.listItem} ${statusBorderCls} ${active ? styles.listItemActive : ""}`}
      onClick={onClick}
      aria-current={active ? true : undefined}
    >
      <div className={styles.itemRow1}>
        <span className={styles.itemFieldType}>{fieldType}</span>
        <StatusBadge app={app} />
      </div>
      <div className={styles.itemCategories}>
        {app.categories.map((cat) => (
          <span key={cat} className={styles.itemCategory}>
            <CategoryIcon category={cat} size={14} />
            {cat}
          </span>
        ))}
      </div>
      <div className={styles.itemMeta}>{formatApplyDate(app.applyDate)} · {app.entries.length}점</div>
      {rejectedCount > 0 && (
        <div className={styles.itemAlert}>
          <span className={styles.itemAlertDot} />
          {rejectedCount}건 반려 — 사유 확인 필요
        </div>
      )}
    </button>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function ApplicationStatusPage({ onReapply }: { onReapply?: () => void }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [draft, setDraft] = useState<ApplyDraft | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    getDraft()
      .then((d) =>
        setDraft({
          savedAt: d.savedAt,
          selectedCategories: d.selectedCategories,
          categoryForms: d.categoryForms,
          fileInfos: d.fileInfos ?? [],
        }),
      )
      .catch(() => { /* 임시저장 없음 */ });
  }, [user?.email]);

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch(() => setError("신청 현황을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  // AI 판독중인 건이 있으면 5초마다 자동 갱신
  const hasPending = applications.some((a) => !a.aiFeedback && a.status === "심사중");
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(async () => {
      try {
        const updated = await getApplications();
        setApplications(updated);
        // 열려있는 상세 패널도 최신 데이터로 교체
        setSelected((prev) => {
          if (!prev) return prev;
          return updated.find((a) => a.id === prev.id) ?? prev;
        });
      } catch { /* 무시 */ }
    }, 5000);
    return () => clearInterval(id);
  }, [hasPending]);

  return (
    <div className={`${styles.layout} ${selected ? styles.withDetail : ""}`}>
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>신청 현황</h2>
          {!loading && !error && <span className={styles.listCount}>총 {applications.length}건</span>}
        </div>

        {/* 임시저장 카드 */}
        {draft && (
          <div className={styles.draftCard}>
            <div className={styles.draftCardLeft}>
              <span className={styles.draftBadge}>임시저장</span>
              <div className={styles.draftCardInfo}>
                <span className={styles.draftCategories}>{draft.selectedCategories.join(" · ")}</span>
                <span className={styles.draftSavedAt}>{formatDraftDate(draft.savedAt)} 저장</span>
              </div>
            </div>
            <button type="button" className={styles.draftResumeBtn} onClick={onReapply}>
              이어서 작성
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={12} height={12}>
                <line x1="3" y1="8" x2="13" y2="8" /><polyline points="9 4 13 8 9 12" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.emptyState}><div className={styles.spinner} /><p>불러오는 중...</p></div>
        ) : error ? (
          <div className={styles.emptyState}><p>{error}</p></div>
        ) : applications.length === 0 ? (
          <div className={styles.emptyState}><p>신청 내역이 없습니다.</p></div>
        ) : (
          <div className={styles.listGroups}>
            {STATUS_ORDER.map((status) => {
              const group = applications.filter((a) => a.status === status);
              if (group.length === 0) return null;
              const labelCls = status === "반려" ? styles.groupLabelRejected
                             : status === "승인" ? styles.groupLabelApproved
                             : styles.groupLabelPending;
              return (
                <div key={status}>
                  <div className={`${styles.groupLabel} ${labelCls}`}>{status}</div>
                  {group.map((app) => (
                    <ListItem
                      key={app.id}
                      app={app}
                      active={selected?.id === app.id}
                      onClick={() => setSelected(selected?.id === app.id ? null : app)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected ? (
        <DetailPanel app={selected} onClose={() => setSelected(null)} onReapply={onReapply} />
      ) : (
        <div className={styles.emptyDetail}>
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" width={44} height={44} aria-hidden="true">
            <rect x="8" y="6" width="32" height="36" rx="3" />
            <line x1="14" y1="17" x2="34" y2="17" /><line x1="14" y1="24" x2="34" y2="24" /><line x1="14" y1="31" x2="24" y2="31" />
          </svg>
          <p>목록에서 신청 건을 선택하면<br />세부 정보를 확인할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
