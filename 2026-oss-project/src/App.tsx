import { useState, useEffect } from "react";
import Header from "./components/organisms/Header";
import Footer from "./components/organisms/Footer";
import ArtPassLogo from "./components/common/ArtPassLogo";
import { useAuth } from "./context/AuthContext";
import type { User } from "./context/AuthContext";
import MainPage from "./pages/MainPage";
import ApplyPage from "./pages/ApplyPage";
import ApplicationStatusPage from "./pages/ApplicationStatusPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import MyPage from "./pages/MyPage";
import AdminPage from "./pages/AdminPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GuidePage from "./pages/GuidePage";
import ScrollToTop from "./components/common/ScrollToTop";
import { PersonIcon, LoginIcon, LogoutIcon, MyPageIcon } from "./components/common/icons";
import "./App.css";
import { NAV_ITEMS_CONFIG, ADMIN_NAV_ITEMS_CONFIG, PROTECTED_PAGES, ADMIN_PAGES, USER_PAGES, POLICY_LINKS, FAMILY_SITES, type Page } from "./constants/navigation";

const PAGE_TO_PATH: Record<Page, string> = {
  main:         "/",
  apply:        "/apply",
  status:       "/status",
  signup:       "/signup",
  login:        "/login",
  mypage:       "/mypage",
  guide:        "/guide",
  findPassword: "/forgot-password",
  admin:        "/admin",
};
const PATH_TO_PAGE: Record<string, Page> = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([p, path]) => [path, p as Page])
);
function getPageFromPath(): Page {
  return PATH_TO_PAGE[window.location.pathname] ?? "main";
}

export default function App() {
  const [page, setPage] = useState<Page>(getPageFromPath);
  const [prevPage, setPrevPage] = useState<Page>("main");
  const [pendingPage, setPendingPage] = useState<Page | null>(null);
  const { isLoggedIn, isAdmin, logout } = useAuth();

  // page → URL 동기화
  useEffect(() => {
    const path = PAGE_TO_PATH[page];
    if (window.location.pathname !== path) {
      window.history.pushState({ page }, "", path);
    }
  }, [page]);

  // 브라우저 뒤로/앞으로 → page 동기화
  useEffect(() => {
    const handler = () => setPage(getPageFromPath());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const navigateTo = (target: Page) => {
    if (PROTECTED_PAGES.includes(target) && !isLoggedIn) {
      setPendingPage(target);
      setPage("login");
      return;
    }
    if (isAdmin && USER_PAGES.includes(target)) return;
    if (!isAdmin && ADMIN_PAGES.includes(target)) return;
    setPrevPage(page);
    setPage(target);
  };

  const handlePostLogin = (user: User) => {
    if (user.role === "admin") {
      setPage("admin");
    } else {
      setPage(pendingPage ?? "main");
    }
    setPendingPage(null);
  };

  const handleLogout = () => {
    logout();
    setPage("main");
  };

  const navConfig = isAdmin ? ADMIN_NAV_ITEMS_CONFIG : NAV_ITEMS_CONFIG;
  const navItems = navConfig.map((item) => ({
    label: item.label,
    href: item.page ? PAGE_TO_PATH[item.page] : "/",
    active: item.page === page,
    onClick: item.page ? (e: React.MouseEvent) => {
      e.preventDefault();
      navigateTo(item.page!);
    } : undefined,
  }));

  const utilityItems = isLoggedIn
    ? [
        ...(isAdmin ? [] : [{ label: "마이페이지", href: PAGE_TO_PATH["mypage"], icon: <MyPageIcon />, onClick: () => navigateTo("mypage") }]),
        { label: "로그아웃", href: "/", icon: <LogoutIcon />, onClick: handleLogout },
      ]
    : [
        { label: "회원가입", href: PAGE_TO_PATH["signup"], icon: <PersonIcon />, onClick: () => setPage("signup") },
        { label: "로그인",   href: PAGE_TO_PATH["login"],  icon: <LoginIcon />,  onClick: () => setPage("login") },
      ];

  const sharedHeader = (
    <Header
      serviceName="아트패스 artPass"
      logo={<ArtPassLogo />}
      navItems={navItems}
      utilityItems={utilityItems}
      onLogoClick={() => setPage("main")}
    />
  );

  const scrollToTop = <ScrollToTop />;

  const sharedFooter = (
    <Footer
      serviceName="아트패스 artPass"
      orgName="공개SW프로젝트 1분반"
      address="컴퓨터공학전공"
      tel="010-7588-6132"
      policyLinks={POLICY_LINKS}
      familySites={FAMILY_SITES}
    />
  );

  if (page === "main") {
    if (isAdmin) {
      return (
        <div className="page">
          {sharedHeader}
          <main id="main-content">
            <AdminDashboardPage onGoToAdmin={() => navigateTo("admin")} />
          </main>
          {sharedFooter}
          {scrollToTop}
        </div>
      );
    }
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content">
          <MainPage onApply={() => navigateTo("apply")} onStatus={() => navigateTo("status")} onGuide={() => navigateTo("guide")} />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "apply") {
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content" className="applyPage">
          <ApplyPage onGoToMyPage={() => navigateTo("mypage")} onGoToStatus={() => navigateTo("status")} />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "status") {
    return (
      <div className="page pageStatus">
        {sharedHeader}
        <main id="main-content" className="statusPage">
          <ApplicationStatusPage onReapply={() => navigateTo("apply")} />
        </main>
      </div>
    );
  }

  if (page === "signup") {
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content" className="applyPage">
          <SignupPage onComplete={() => setPage("main")} onCancel={() => setPage("main")} />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "login") {
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content" className="applyPage">
          <LoginPage
            onSuccess={(user) => handlePostLogin(user)}
            onSignup={() => setPage("signup")}
            onForgotPassword={() => setPage("findPassword")}
          />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "mypage") {
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content" className="applyPage">
          <MyPage onBack={() => setPage(prevPage)} />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "guide") {
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content">
          <GuidePage onApply={() => navigateTo("apply")} />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "findPassword") {
    return (
      <div className="page">
        {sharedHeader}
        <main id="main-content" className="applyPage">
          <ForgotPasswordPage
            onComplete={() => setPage("login")}
            onBack={() => setPage("login")}
          />
        </main>
        {sharedFooter}
        {scrollToTop}
      </div>
    );
  }

  if (page === "admin") {
    return (
      <div className="page pageStatus">
        {sharedHeader}
        <main id="main-content" className="statusPage">
          <AdminPage />
        </main>
      </div>
    );
  }

  return null;
}
