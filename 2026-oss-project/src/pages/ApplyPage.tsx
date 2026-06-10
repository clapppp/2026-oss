import React, { useState, useRef, useEffect } from "react";
import StepBar from "../components/molecules/StepBar";
import SelectCard from "../components/molecules/SelectCard";
import FormField from "../components/molecules/FormField";
import InfoRow from "../components/molecules/InfoRow";
import FileInput from "../components/common/FileInput";
import Button from "../components/common/Button";
import Toast from "../components/common/Toast";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { CATEGORY_FORM_CONFIG, CATEGORY_META } from "../constants/categoryFormConfig";
import { CATEGORIES } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import { submitApplication } from "../api/application";
import type { SubmitApplicationRequest, EvidenceSlot } from "../api/types";
import { validateApplicationStep2, getCategoryProgress } from "../utils/validation";
import { formatGender, formatPhone, formatBirth } from "../utils/formatters";
import { MAX_CATEGORIES } from "../constants/rules";
import { formatDraftDate, type ApplyDraft } from "../utils/draft";
import { getDraft, saveDraftApi, deleteDraft, type DraftFileInfo } from "../api/draft";

const EVIDENCE_SLOTS: { key: EvidenceSlot; label: string; hint: string }[] = [
  {
    key: "workImage",
    label: "작품정보이미지",
    hint: "예: 제목, 포스터, 프로그램팸플릿, 발행정보, 방화정보, 연재출판정보 등",
  },
  {
    key: "detailPage1",
    label: "상세페이지 (1)",
    hint: "예: 제목, 작품주요인, 상세이미지, 작품연재상세정보 등",
  },
  {
    key: "detailPage2",
    label: "상세페이지 (2)",
    hint: "ISSN/ISBN, 발행처, 발행자 등",
  },
  {
    key: "income",
    label: "수입 관련 자료",
    hint: "예: 통장사본, 제작비인건, 일급내역 등",
  },
  {
    key: "other",
    label: "기타",
    hint: "예: 저작권자료, 초청장, 선정내역, 진행자료, 보도자료, 추가 내지, 추가 프로그램팸플릿, 온라인관련 증빙자료 등",
  },
];

interface ApplyPageProps {
  onGoToMyPage: () => void;
  onGoToStatus?: () => void;
}

export default function ApplyPage({ onGoToMyPage, onGoToStatus }: ApplyPageProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileNames, setFileNames] = useState<Record<string, Record<number, Partial<Record<EvidenceSlot, string>>>>>({});
  const [entryFiles, setEntryFiles] = useState<Record<string, Record<number, Partial<Record<EvidenceSlot, File>>>>>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["문학"]);
  const [categoryForms, setCategoryForms] = useState<Record<string, Record<string, string>[]>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(`최대 ${MAX_CATEGORIES}개까지 선택 가능합니다.`);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<{ cat: string; index: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submittedApplyNo, setSubmittedApplyNo] = useState("");
  const [draftBanner, setDraftBanner] = useState<ApplyDraft | null>(null);
  const [draftFileInfos, setDraftFileInfos] = useState<DraftFileInfo[]>([]);

  const showToast = (message?: string) => {
    if (message) setToastMessage(message);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  };

  // 임시저장 draft 처리
  useEffect(() => {
    if (!user?.email) return;
    getDraft()
      .then((d) => {
        setDraftBanner({
          savedAt: d.savedAt,
          selectedCategories: d.selectedCategories,
          categoryForms: d.categoryForms,
          fileInfos: d.fileInfos ?? [],
        });
      })
      .catch(() => { /* 저장된 임시저장 없음 */ });
  }, [user?.email]);

  const handleRestoreDraft = () => {
    if (!draftBanner) return;
    setSelectedCategories(draftBanner.selectedCategories);
    setCategoryForms(draftBanner.categoryForms);
    // 임시저장된 파일 이름 복원
    const restoredFileNames: typeof fileNames = {};
    for (const info of draftBanner.fileInfos ?? []) {
      if (!restoredFileNames[info.cat]) restoredFileNames[info.cat] = {};
      if (!restoredFileNames[info.cat][info.idx]) restoredFileNames[info.cat][info.idx] = {};
      (restoredFileNames[info.cat][info.idx] as Record<string, string>)[info.slot] = info.filename;
    }
    setFileNames(restoredFileNames);
    setDraftFileInfos(draftBanner.fileInfos ?? []);
    setStep(2);
    setDraftBanner(null);
  };

  const handleDiscardDraft = () => {
    deleteDraft().catch(() => { /* noop */ });
    setDraftBanner(null);
    setDraftFileInfos([]);
  };

  const handleDraftSave = async () => {
    try {
      const result = await saveDraftApi(selectedCategories, categoryForms, entryFiles);
      setDraftFileInfos(result.fileInfos);
      showToast("임시저장되었습니다.");
    } catch {
      showToast("임시저장 중 오류가 발생했습니다.");
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setConfirmTarget(cat);
      return;
    }
    if (selectedCategories.length >= MAX_CATEGORIES) { showToast(`최대 ${MAX_CATEGORIES}개까지 선택 가능합니다.`); return; }
    setSelectedCategories((prev) => [...prev, cat]);
  };

  const confirmRemove = () => {
    if (confirmTarget) {
      setSelectedCategories((prev) => prev.filter((c) => c !== confirmTarget));
      setConfirmTarget(null);
    }
  };

  const handleNextStep = () => {
    const error = validateApplicationStep2(selectedCategories, categoryForms);
    if (error) { showToast(error); return; }
    setStep(3);
  };

  const getEntries = (cat: string) => categoryForms[cat] ?? [{}];

  const addEntry = (cat: string) => {
    setCategoryForms((prev) => ({ ...prev, [cat]: [...(prev[cat] ?? [{}]), {}] }));
  };

  const removeEntry = (cat: string, index: number) => {
    setCategoryForms((prev) => {
      const entries = prev[cat] ?? [{}];
      if (entries.length <= 1) return prev;
      return { ...prev, [cat]: entries.filter((_, i) => i !== index) };
    });
  };

  const handleCategoryField =
    (category: string, index: number, key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setCategoryForms((prev) => {
        const entries = [...(prev[category] ?? [{}])];
        entries[index] = { ...(entries[index] ?? {}), [key]: e.target.value };
        return { ...prev, [category]: entries };
      });
    };

  const handleFileChange =
    (cat: string, idx: number, slot: EvidenceSlot) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setFileNames((prev) => ({
        ...prev,
        [cat]: { ...prev[cat], [idx]: { ...prev[cat]?.[idx], [slot]: file?.name ?? "" } },
      }));
      if (file) {
        setEntryFiles((prev) => ({
          ...prev,
          [cat]: { ...prev[cat], [idx]: { ...prev[cat]?.[idx], [slot]: file } },
        }));
      } else {
        // 파일 제거 시 entryFiles에서도 삭제
        setEntryFiles((prev) => {
          const slotMap = { ...(prev[cat]?.[idx] ?? {}) };
          delete slotMap[slot];
          return { ...prev, [cat]: { ...prev[cat], [idx]: slotMap } };
        });
      }
      // 임시저장 파일 정보도 해당 슬롯 제거 (새로 선택하거나 지운 경우)
      setDraftFileInfos((prev) =>
        prev.filter((info) => !(info.cat === cat && info.idx === idx && info.slot === slot)),
      );
    };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fieldTypeLabel = selectedCategories.length === 1 ? "단일 분야" : `복합 분야 ${selectedCategories.length}개`;

      // 새로 업로드하지 않은 슬롯은 임시저장 파일로 대체
      const categories = await Promise.all(
        selectedCategories.map(async (cat) => {
          const entries = getEntries(cat);
          const files = await Promise.all(
            entries.map(async (_, idx) => {
              const newFiles: Partial<Record<EvidenceSlot, File>> = { ...entryFiles[cat]?.[idx] };
              for (const info of draftFileInfos) {
                if (info.cat === cat && info.idx === idx && !(info.slot in newFiles)) {
                  try {
                    const resp = await fetch(info.url);
                    const blob = await resp.blob();
                    (newFiles as Record<string, File>)[info.slot] = new File([blob], info.filename, { type: info.mimeType });
                  } catch { /* skip */ }
                }
              }
              return newFiles;
            }),
          );
          return { name: cat, entries, files };
        }),
      );

      const data: SubmitApplicationRequest = { type: `일반 유형 · ${fieldTypeLabel}`, categories };
      const { applyNo } = await submitApplication(data);
      setSubmittedApplyNo(applyNo);
      setSubmitDone(true);
      deleteDraft().catch(() => { /* noop */ });
    } catch {
      showToast("제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="applyInner">
        <h1 className="pageTitle">일반 유형 신청서 미리 작성</h1>
        <div className="descBox">작품 증빙 과정에 대한 규정은 다음과 같습니다.</div>

        <div className="stepBarWrap">
          <StepBar steps={["01 본인 인증", "02 증빙 자료 확인", "03 최종 확인하기"]} currentStep={step} />
        </div>

        {/* ── 임시저장 복원 배너 ── */}
        {draftBanner && step === 1 && (
          <div className="draftRestoreBanner">
            <div className="draftRestoreInfo">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={18} height={18} aria-hidden="true">
                <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2z" />
                <polyline points="10 6 10 10 13 13" />
              </svg>
              <div>
                <strong>임시저장된 신청서가 있습니다</strong>
                <span>{formatDraftDate(draftBanner.savedAt)} 저장 · {draftBanner.selectedCategories.join(", ")}</span>
              </div>
            </div>
            <div className="draftRestoreActions">
              <button type="button" className="draftRestoreDiscard" onClick={handleDiscardDraft}>새로 작성</button>
              <button type="button" className="draftRestoreResume" onClick={handleRestoreDraft}>이어서 작성</button>
            </div>
          </div>
        )}

        {/* ── Step 1: 신청인 정보 확인 ── */}
        {step === 1 && (
          <>
            <section className="applySection">
              <h2 className="sectionTitle">신청인 정보 확인</h2>
              <p className="identityDesc">
                회원가입 시 등록하신 인적사항을 확인하세요. 정보가 다를 경우 마이페이지에서 수정하실 수 있습니다.
              </p>
              <div className="identityTable">
                <InfoRow label="이름" value={user?.name ?? ""} />
                <InfoRow label="필명" value={user?.penName || "미등록"} />
                <InfoRow label="생년월일" value={user?.birth ? formatBirth(user.birth) : ""} />
                <InfoRow label="성별" value={user ? formatGender(user.gender) : ""} />
                <InfoRow label="휴대폰" value={user?.phone ? formatPhone(user.phone) : ""} />
                <InfoRow label="이메일" value={user?.email ?? ""} />
              </div>
            </section>
            <div className="actionRow">
              <Button variant="secondary" size="lg" onClick={onGoToMyPage}>마이페이지 가기</Button>
              <Button variant="primary" size="lg" onClick={() => setStep(2)}>
                확인 후 다음 단계로
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: 분야 선택 + 세부 정보 ── */}
        {step === 2 && (
          <>
            <section className="applySection">
              <h2 className="sectionTitle">신청 분야 선택하기 (최대 {MAX_CATEGORIES}개)</h2>
              <div className="categoryGrid">
                {CATEGORIES.map(({ label, icon }) => (
                  <SelectCard
                    key={label}
                    label={label}
                    icon={icon}
                    selected={selectedCategories.includes(label)}
                    onClick={() => toggleCategory(label)}
                    onRemove={() => toggleCategory(label)}
                  />
                ))}
              </div>
            </section>

            <section className="applySection">
              <h2 className="sectionTitle">세부 정보</h2>
              {selectedCategories.map((cat) => {
                const fields = CATEGORY_FORM_CONFIG[cat];
                const meta = CATEGORY_META[cat];
                if (!fields || !meta) return null;
                const entries = getEntries(cat);
                const progress = getCategoryProgress(cat, entries);
                const maxCount = progress.isRatioBased ? progress.maxEntries : meta.minCount;
                const atMax = entries.length >= maxCount;
                const filled = entries.filter((e) => Object.values(e).some((v) => v.trim?.())).length;
                const meetsMin = progress.isRatioBased ? progress.meetsMin : filled >= meta.minCount;
                const pct = Math.min(100, Math.round(progress.ratio * 100));
                return (
                  <div key={cat} className="categoryFormBlock">
                    <div className="categoryFormHeader">
                      <h3 className="categoryFormTitle">{cat}</h3>
                      {progress.isRatioBased ? (
                        <span className={`categoryFormCount ${meetsMin ? "categoryFormCountOk" : ""}`}>
                          달성률 {pct}%
                        </span>
                      ) : (
                        <span className={`categoryFormCount ${meetsMin ? "categoryFormCountOk" : ""}`}>
                          {entries.length} / {maxCount}{meta.unit}
                        </span>
                      )}
                      <button
                        type="button"
                        className="categoryRemoveBtn"
                        onClick={() => toggleCategory(cat)}
                        aria-label={`${cat} 분야 삭제`}
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={13} height={13}>
                          <line x1="3" y1="3" x2="13" y2="13" />
                          <line x1="13" y1="3" x2="3" y2="13" />
                        </svg>
                      </button>
                    </div>
                    <p className="categoryFormHint">{meta.hint}</p>
                    {progress.isRatioBased && progress.tags.length > 0 && (
                      <div className="ratioTags">
                        {progress.tags.map(({ label, count, min }) => (
                          <span
                            key={label}
                            className={`ratioTag ${count >= min ? "ratioTagOk" : ""}`}
                          >
                            {label} {count}/{min}
                          </span>
                        ))}
                      </div>
                    )}

                    {entries.map((entry, idx) => (
                      <div key={idx} className="entryBlock">
                        <div className="entryHeader">
                          <span className="entryLabel">실적 {idx + 1}</span>
                          {entries.length > 1 && (
                            <button
                              type="button"
                              className="entryRemoveBtn"
                              onClick={() => setConfirmEntry({ cat, index: idx })}
                              aria-label={`실적 ${idx + 1} 삭제`}
                            >
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={14} height={14}>
                                <line x1="4" y1="4" x2="16" y2="16" />
                                <line x1="16" y1="4" x2="4" y2="16" />
                              </svg>
                              삭제
                            </button>
                          )}
                        </div>
                        <div className="formGrid">
                          {fields.map((field) => {
                            const isbnDigits = field.key === "isbn"
                              ? (entry["isbn"] ?? "").replace(/[^0-9]/g, "")
                              : null;
                            const isbnInlineError =
                              isbnDigits !== null && isbnDigits.length > 0 && isbnDigits.length !== 13
                                ? `숫자 13자리여야 합니다 (현재 ${isbnDigits.length}자리)`
                                : undefined;
                            return (
                              <FormField
                                key={field.key}
                                label={field.label}
                                type={field.type}
                                placeholder={field.placeholder}
                                options={field.options}
                                value={entry[field.key] ?? ""}
                                onChange={handleCategoryField(cat, idx, field.key)}
                                inlineError={isbnInlineError}
                              />
                            );
                          })}
                        </div>
                        <div className="entryFiles">
                          <p className="entryFilesTitle">증빙자료 제출</p>
                          {EVIDENCE_SLOTS.map(({ key, label, hint }) => (
                            <div key={key} className="evidenceRow">
                              <div className="evidenceInfo">
                                <span className="evidenceLabel">{label}</span>
                                <span className="evidenceHint">{hint}</span>
                              </div>
                              <div className="evidenceInput">
                                <FileInput
                                  label={label}
                                  onChange={handleFileChange(cat, idx, key)}
                                  value={fileNames[cat]?.[idx]?.[key] ?? ""}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {atMax ? (
                      <div className="addEntryLimit">최대 {maxCount}{meta.unit} 입력 완료</div>
                    ) : (
                      <button type="button" className="addEntryBtn" onClick={() => addEntry(cat)}>
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={16} height={16}>
                          <line x1="10" y1="4" x2="10" y2="16" />
                          <line x1="4" y1="10" x2="16" y2="10" />
                        </svg>
                        실적 추가 ({entries.length} / {maxCount})
                      </button>
                    )}
                  </div>
                );
              })}
            </section>

            <div className="actionRow">
              <Button variant="secondary" size="lg" onClick={() => setStep(1)}>이전 단계로</Button>
              <Button variant="secondary" size="lg" onClick={handleDraftSave}>임시저장</Button>
              <Button variant="primary" size="lg" onClick={handleNextStep}>다음</Button>
            </div>
          </>
        )}

        {/* ── Step 3: 최종 확인 + 제출 ── */}
        {step === 3 && (
          submitDone ? (
            <>
              <section className="applySection">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 0", gap: "1rem" }}>
                  <svg viewBox="0 0 64 64" fill="none" stroke="var(--krds-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={64} height={64}>
                    <circle cx="32" cy="32" r="28" />
                    <polyline points="20 33 28 41 44 24" />
                  </svg>
                  <h2 className="sectionTitle" style={{ textAlign: "center", margin: 0 }}>제출 완료!</h2>
                  <p style={{ color: "var(--krds-text-2)", margin: 0 }}>
                    접수번호: <strong>{submittedApplyNo}</strong>
                  </p>
                  <p style={{ color: "var(--krds-text-3)", margin: 0, fontSize: "0.9rem", textAlign: "center" }}>
                    AI 교차검증이 백그라운드에서 처리 중입니다.<br />
                    잠시 후 신청 현황에서 결과를 확인하세요.
                  </p>
                </div>
              </section>
              <div className="actionRow">
                {onGoToStatus && (
                  <Button variant="primary" size="lg" onClick={onGoToStatus}>
                    신청 현황 확인
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <section className="applySection">
                <h2 className="sectionTitle">신청인 정보</h2>
                <div className="identityTable">
                  <InfoRow label="이름" value={user?.name ?? ""} />
                  <InfoRow label="필명" value={user?.penName || "미등록"} />
                  <InfoRow label="생년월일" value={user?.birth ?? ""} />
                  <InfoRow label="성별" value={user ? formatGender(user.gender) : ""} />
                  <InfoRow label="휴대폰" value={user?.phone ?? ""} />
                  <InfoRow label="이메일" value={user?.email ?? ""} />
                </div>
              </section>

              <section className="applySection">
                <h2 className="sectionTitle">신청 분야</h2>
                <div className="summaryCategories">
                  {selectedCategories.map((cat) => (
                    <span key={cat} className="summaryCategoryBadge">{cat}</span>
                  ))}
                </div>
              </section>

              <section className="applySection">
                <h2 className="sectionTitle">제출 내용</h2>
                {selectedCategories.map((cat) => {
                  const fields = CATEGORY_FORM_CONFIG[cat];
                  const entries = getEntries(cat);
                  if (!fields) return null;
                  return (
                    <div key={cat} className="summaryBlock">
                      <h3 className="summaryBlockTitle">{cat}</h3>
                      {entries.map((entry, idx) => (
                        <div key={idx} className="summaryEntry">
                          <div className="summaryEntryLabel">실적 {idx + 1}</div>
                          <div className="summaryEntryGrid">
                            {fields.map((field) => (
                              <InfoRow key={field.key} label={field.label} value={entry[field.key] || "-"} />
                            ))}
                            {EVIDENCE_SLOTS.map(({ key, label }) => (
                              <InfoRow key={key} label={label} value={fileNames[cat]?.[idx]?.[key] || "미첨부"} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>

              <div className="summaryAgreement">
                <p>이 서비스는 신청 준비를 돕는 도우미입니다. 실제 신청은 공식 사이트(kawfartist.kr)에서 진행해 주세요.</p>
              </div>

              <div className="actionRow">
                <Button variant="secondary" size="lg" onClick={() => setStep(2)}>이전 단계로</Button>
                <Button variant="primary" size="lg" loading={submitting} onClick={handleSubmit}>최종 제출</Button>
              </div>
            </>
          )
        )}
      </div>

      <Toast message={toastMessage} visible={toastVisible} />
      {confirmTarget && (
        <ConfirmDialog
          message={`'${confirmTarget}' 분야를 삭제하시겠습니까?`}
          onConfirm={confirmRemove}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
      {confirmEntry && (
        <ConfirmDialog
          message={`'${confirmEntry.cat}' 실적 ${confirmEntry.index + 1}을 삭제하시겠습니까?`}
          onConfirm={() => { removeEntry(confirmEntry.cat, confirmEntry.index); setConfirmEntry(null); }}
          onCancel={() => setConfirmEntry(null)}
        />
      )}
    </>
  );
}
