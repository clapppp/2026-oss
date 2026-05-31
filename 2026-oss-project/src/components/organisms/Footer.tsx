import { useState } from "react";
import styles from "./Footer.module.css";

export interface PolicyLink {
  label: string;
  href?: string;
  highlight?: boolean;
}

export interface FamilySite {
  label: string;
  href?: string;
}

interface FooterProps {
  orgName?: string;
  address?: string;
  tel?: string;
  fax?: string;
  copyright?: string;
  policyLinks?: PolicyLink[];
  familySites?: FamilySite[];
  logoSrc?: string;
  serviceName?: string;
}

export default function Footer({
  orgName = "공개SW프로젝트 1분반 6조",
  address,
  tel,
  fax,
  copyright,
  policyLinks = [],
  familySites = [],
  logoSrc,
  serviceName = "아트패스",
}: FooterProps) {
  const [familyOpen, setFamilyOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* 상단: 로고 + 정책 링크 */}
        <div className={styles.top}>
          <a href="/" className={styles.logo} aria-label={`${serviceName} 홈으로 이동`}>
            {logoSrc ? (
              <img src={logoSrc} alt={serviceName} className={styles.logoImg} />
            ) : (
              <span className={styles.logoText}>{serviceName}</span>
            )}
          </a>

          {policyLinks.length > 0 && (
            <ul className={styles.policyList} role="list">
              {policyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href ?? "#"}
                    className={[styles.policyLink, link.highlight ? styles.policyHighlight : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <hr className={styles.divider} />

        {/* 하단: 기관 정보 + 패밀리사이트 */}
        <div className={styles.bottom}>
          <address className={styles.orgInfo}>
            <span className={styles.orgName}>{orgName}</span>
            {address && <span className={styles.infoItem}>{address}</span>}
            {tel && (
              <span className={styles.infoItem}>
                대표전화 <a href={`tel:${tel.replace(/[^0-9]/g, "")}`} className={styles.tel}>{tel}</a>
              </span>
            )}
            {fax && <span className={styles.infoItem}>팩스 {fax}</span>}
          </address>

          {familySites.length > 0 && (
            <div className={styles.familySite}>
              <button
                className={styles.familyToggle}
                aria-expanded={familyOpen}
                aria-haspopup="listbox"
                onClick={() => setFamilyOpen((prev) => !prev)}
              >
                패밀리사이트
                <svg
                  className={[styles.familyArrow, familyOpen ? styles.familyArrowUp : ""]
                    .filter(Boolean)
                    .join(" ")}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {familyOpen && (
                <ul className={styles.familyList} role="listbox" aria-label="패밀리사이트 목록">
                  {familySites.map((site) => (
                    <li key={site.label} role="option" aria-selected={false}>
                      <a
                        href={site.href ?? "#"}
                        className={styles.familyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {site.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* 저작권 */}
        <p className={styles.copyright}>
          {copyright ?? `Copyright © ${year} ${orgName}. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}
