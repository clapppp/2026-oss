import React, { useState } from "react";
import styles from "./Header.module.css";

export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface UtilityItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface HeaderProps {
  serviceName?: string;
  logoSrc?: string;
  logo?: React.ReactNode;
  navItems?: NavItem[];
  utilityItems?: UtilityItem[];
  mainContentId?: string;
  onLogoClick?: () => void;
}

export default function Header({
  serviceName = "서비스명",
  logoSrc,
  logo,
  navItems = [],
  utilityItems = [],
  mainContentId = "main-content",
  onLogoClick,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <a href={`#${mainContentId}`} className={styles.skipNav}>
        본문 바로가기
      </a>

      {/* 아이덴티티 바 (로고 + 유틸리티) */}
      <div className={styles.identityBar}>
        <div className={styles.inner}>
          <a
            href="/"
            className={styles.logo}
            aria-label={`${serviceName} 홈으로 이동`}
            onClick={onLogoClick ? (e) => { e.preventDefault(); onLogoClick(); } : undefined}
          >
            {logo ? (
              logo
            ) : logoSrc ? (
              <img src={logoSrc} alt={serviceName} className={styles.logoImg} />
            ) : (
              <span className={styles.logoText}>{serviceName}</span>
            )}
          </a>

          {utilityItems.length > 0 && (
            <ul className={styles.utilityList} role="list">
              {utilityItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href ?? "#"}
                    className={styles.utilityLink}
                    onClick={item.onClick}
                  >
                    {item.icon && (
                      <span className={styles.utilityIcon} aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    <span className={styles.utilityLabel}>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* GNB */}
      {navItems.length > 0 && (
        <nav className={styles.gnb} aria-label="주요 메뉴">
          <button
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="gnb-list"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className={styles.hamburger} aria-hidden="true" />
            <span className={styles.hamburger} aria-hidden="true" />
            <span className={styles.hamburger} aria-hidden="true" />
          </button>

          <div className={styles.inner}>
            <ul
              id="gnb-list"
              className={[styles.gnbList, menuOpen ? styles.gnbOpen : ""].filter(Boolean).join(" ")}
              role="list"
            >
              {navItems.map((item) => (
                <li key={item.label} className={styles.gnbItem}>
                  <a
                    href={item.href ?? "#"}
                    className={[styles.gnbLink, item.active ? styles.gnbActive : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={item.active ? "page" : undefined}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}
