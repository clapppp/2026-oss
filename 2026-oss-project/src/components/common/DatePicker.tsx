import { useState, useRef, useEffect } from "react";
import styles from "./DatePicker.module.css";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(year: number, month: number, day: number): string {
  return `${year}.${String(month + 1).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

export default function DatePicker({ value = "", onChange, placeholder = "YYYY.MM.DD" }: DatePickerProps) {
  const today = new Date();
  const parsed = parseDate(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; type: "prev" | "current" | "next" }[] = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, type: "prev" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: "current" });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: "next" });
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  function selectDay(day: number) {
    const formatted = formatDate(viewYear, viewMonth, day);
    onChange?.(formatted);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  function isSelected(day: number) {
    if (!parsed) return false;
    return parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;
  }

  function toggleOpen() {
    if (!open && parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    setOpen(o => !o);
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type="text"
          value={value}
          readOnly
          placeholder={placeholder}
          onClick={toggleOpen}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleOpen(); }}
          aria-haspopup="dialog"
          aria-expanded={open}
        />
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleOpen}
          aria-label="날짜 선택"
          tabIndex={-1}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
            <rect x="2" y="3" width="16" height="16" rx="2" />
            <line x1="2" y1="8" x2="18" y2="8" />
            <line x1="6" y1="1" x2="6" y2="5" />
            <line x1="14" y1="1" x2="14" y2="5" />
          </svg>
        </button>
      </div>

      {open && (
        <div className={styles.popup} role="dialog" aria-label="날짜 선택 달력">
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="이전 달">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={16} height={16}>
                <polyline points="13 5 7 10 13 15" />
              </svg>
            </button>
            <span className={styles.headerLabel}>{viewYear}년 {viewMonth + 1}월</span>
            <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="다음 달">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={16} height={16}>
                <polyline points="7 5 13 10 7 15" />
              </svg>
            </button>
          </div>

          <table className={styles.table} role="grid">
            <thead>
              <tr>
                {DAYS_OF_WEEK.map((d, i) => (
                  <th key={d} className={`${styles.th} ${i === 0 ? styles.sun : ""} ${i === 6 ? styles.sat : ""}`} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((cell, ci) => {
                    const isCurrent = cell.type === "current";
                    const selected = isCurrent && isSelected(cell.day);
                    const todayCell = isCurrent && isToday(cell.day);
                    const isSun = ci === 0;
                    const isSat = ci === 6;
                    return (
                      <td key={ci} className={styles.td}>
                        <button
                          type="button"
                          className={[
                            styles.dayBtn,
                            !isCurrent ? styles.outside : "",
                            selected ? styles.selected : "",
                            todayCell && !selected ? styles.today : "",
                            !selected && isCurrent && isSun ? styles.sunday : "",
                            !selected && isCurrent && isSat ? styles.saturday : "",
                          ].join(" ")}
                          onClick={() => isCurrent && selectDay(cell.day)}
                          tabIndex={isCurrent ? 0 : -1}
                          aria-label={isCurrent ? formatDate(viewYear, viewMonth, cell.day) : undefined}
                          aria-pressed={selected}
                          aria-current={todayCell ? "date" : undefined}
                          disabled={!isCurrent}
                        >
                          {cell.day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.footer}>
            <button type="button" className={styles.todayBtn} onClick={() => {
              const y = today.getFullYear();
              const m = today.getMonth();
              const d = today.getDate();
              setViewYear(y);
              setViewMonth(m);
              onChange?.(formatDate(y, m, d));
              setOpen(false);
            }}>
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
