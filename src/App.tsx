import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { dbService } from "./services/dbService";
import type { UserProfile, Organization, Branch } from "./services/dbService";
import { isMockMode } from "./services/firebase";
import { LandingPage } from "./components/LandingPage";
import { AuthPages } from "./components/AuthPages";
import { DashboardView } from "./components/DashboardView";
import { TransactionsView } from "./components/TransactionsView";
import { AccountView } from "./components/AccountView";
import { ToastProvider, useToast } from "./components/Toast";
import { ConfirmModal } from "./components/Modal";
import { 
  LayoutDashboard, 
  BookOpen, 
  User, 
  LogOut, 
  Menu, 
  Info,
  Building,
  ChevronLeft
} from "lucide-react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import "./App.css";

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Derive views and active tabs directly from location path
  let view: "landing" | "dashboard" | "auth" = "landing";
  let sidebarActiveTab: "dashboard" | "transactions" | "account" = "dashboard";

  if (location.pathname === "/auth") {
    view = "auth";
  } else if (location.pathname === "/dashboard") {
    view = "dashboard";
    sidebarActiveTab = "dashboard";
  } else if (location.pathname.startsWith("/transactions")) {
    view = "dashboard";
    sidebarActiveTab = "transactions";
  } else if (location.pathname === "/account") {
    view = "dashboard";
    sidebarActiveTab = "account";
  } else {
    view = "landing";
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("theme") as any) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // App Level Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Record<string, Branch[]>>({});
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { showToast } = useToast();

  // Redirect if not authenticated on private routes
  // IMPORTANT: skip while authLoading so we never redirect before Firebase resolves
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser && ["/dashboard", "/transactions", "/account"].some(p => location.pathname.startsWith(p))) {
      navigate("/");
    }
  }, [authLoading, currentUser, location.pathname, navigate]);

  // Auth Listener — runs only once on mount
  useEffect(() => {
    const unsubscribe = dbService.onAuthChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        // Logged in: redirect away from auth/landing
        const path = window.location.pathname;
        if (path === "/auth" || path === "/") {
          navigate("/dashboard");
        }
      } else {
        // Logged out: redirect away from private routes
        const path = window.location.pathname;
        if (["/dashboard", "/transactions", "/account"].some(p => path.startsWith(p))) {
          navigate("/");
        }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — register listener once only


  // Load organizations on login/refresh
  useEffect(() => {
    if (currentUser) {
      loadOrganizationsData();
    } else {
      setOrganizations([]);
      setBranches({});
      setSelectedOrgId("");
      setSelectedBranchId("");
    }
  }, [currentUser]);

  const loadOrganizationsData = async () => {
    try {
      const orgs = await dbService.getOrganizations();
      setOrganizations(orgs);
      
      const branchesMap: Record<string, Branch[]> = {};
      
      for (const org of orgs) {
        const branchList = await dbService.getBranches(org.id);
        branchesMap[org.id] = branchList;
      }
      setBranches(branchesMap);

      // Auto-select first org and branch
      if (orgs.length > 0) {
        const firstOrg = orgs[0];
        setSelectedOrgId(firstOrg.id);
        const orgBranches = branchesMap[firstOrg.id] || [];
        if (orgBranches.length > 0) {
          setSelectedBranchId(orgBranches[0].id);
        }
      }
    } catch (error: any) {
      showToast("Gagal memuat data organisasi.", "error");
    }
  };

  const handleOrgSelect = (orgId: string) => {
    setSelectedOrgId(orgId);
    const orgBranches = branches[orgId] || [];
    if (orgBranches.length > 0) {
      setSelectedBranchId(orgBranches[0].id);
    } else {
      setSelectedBranchId("");
    }
  };

  const handleLogout = async () => {
    try {
      await dbService.logout();
      showToast("Anda telah berhasil keluar.", "success");
      navigate("/");
    } catch (error: any) {
      showToast("Gagal keluar akun.", "error");
    }
  };

  const handleProfileRefresh = () => {
    // Reload user profile information from dbService
    const current = dbService.getCurrentUser();
    setCurrentUser(current);
  };

  const renderDashboardContent = () => {
    switch (sidebarActiveTab) {
      case "dashboard":
        return (
          <DashboardView
            onNavigateToTransactions={() => navigate("/transactions")}
            organizations={organizations}
            branches={branches}
            selectedOrgId={selectedOrgId}
            selectedBranchId={selectedBranchId}
            onSelectOrg={handleOrgSelect}
            onSelectBranch={setSelectedBranchId}
            onRefreshData={loadOrganizationsData}
          />
        );
      case "transactions":
        if (!selectedOrgId || !selectedBranchId) {
          return (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              <Building size={48} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
              <h3>Pilih Organisasi & Cabang Terlebih Dahulu</h3>
              <p style={{ fontSize: "0.9rem" }}>Harap buat atau pilih organisasi pada dashboard untuk mencatat transaksi.</p>
            </div>
          );
        }
        const currentOrg = organizations.find(o => o.id === selectedOrgId);
        const currentBranch = branches[selectedOrgId]?.find(b => b.id === selectedBranchId);
        // Derive initial tab from URL sub-path
        const txPath = location.pathname;
        const initialTab = txPath === "/transactions/income" ? "income"
          : txPath === "/transactions/expense" ? "expense"
          : "all";
        return (
          <TransactionsView
            selectedOrgId={selectedOrgId}
            selectedBranchId={selectedBranchId}
            orgName={currentOrg?.name}
            branchName={currentBranch?.name}
            initialTab={initialTab as any}
          />
        );
      case "account":
        if (!currentUser) return null;
        return (
          <AccountView
            currentUser={currentUser}
            onProfileUpdate={handleProfileRefresh}
          />
        );
      default:
        return null;
    }
  };

  // 1. LANDING PAGE
  if (view === "landing") {
    return (
      <LandingPage
        currentUser={currentUser}
        onNavigate={(target) => navigate(target === "auth" ? "/auth" : "/")}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
      />
    );
  }

  // 2. AUTHENTICATION PAGES
  if (view === "auth") {
    return (
      <AuthPages
        onAuthSuccess={() => navigate("/dashboard")}
        onNavigateHome={() => navigate("/")}
      />
    );
  }

  // 3. MAIN DASHBOARD SHELL
  return (
    <>
    {/* Full-screen auth loader — shown until Firebase resolves session */}
    {authLoading && (
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg-primary)",
        gap: "20px", zIndex: 9999
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", animation: "fadeIn 0.4s ease-out" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", boxShadow: "0 4px 20px rgba(168,85,247,0.35)"
          }}>💰</div>
          <span style={{
            fontSize: "1.6rem", fontWeight: 800,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>Bundahara</span>
        </div>
        <div style={{
          width: "36px", height: "36px",
          border: "3px solid rgba(168,85,247,0.2)",
          borderTopColor: "var(--color-primary)",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite"
        }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Memuat sesi...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )}
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", visibility: authLoading ? "hidden" : "visible" }}>
      {/* Mock Mode Alert Banner */}
      {isMockMode && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            right: "16px",
            zIndex: 999,
            backgroundColor: "rgba(168, 85, 247, 0.95)",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(168, 85, 247, 0.4)",
            maxWidth: "340px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(8px)"
          }}
        >
          <Info size={18} />
          <div style={{ textAlign: "left" }}>
            <span style={{ display: "block", fontWeight: 700 }}>Database: Mock Mode (Lokal)</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>
              Tambahkan data koneksi Anda di file <code>.env</code> untuk beralih ke live Firestore database.
            </span>
          </div>
        </div>
      )}

      {/* Hamburger Menu button for responsive sidebar – hidden when sidebar is open */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            zIndex: 101,
            padding: "8px",
            borderRadius: "8px",
            background: "var(--panel-bg)",
            border: "1px solid var(--panel-border)",
            color: "var(--text-primary)",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            display: "none" // Managed dynamically by media queries
          }}
          className="hamburger-btn"
        >
          <Menu size={20} />
        </button>
      )}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`glass-panel sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          width: "280px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          padding: "24px",
          margin: "16px 0 16px 16px",
          height: "calc(100vh - 32px)",
          position: "sticky",
          top: "16px",
          borderRadius: "16px",
          zIndex: 100
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <div
              className="bg-gradient-accent"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.2rem",
                color: "#fff"
              }}
            >
              B
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              bundahara<span style={{ color: "var(--color-primary)" }}>.</span>
            </span>
          </div>
          {/* Collapse sidebar button – only visible on mobile */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              transition: "var(--transition-smooth)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary-glow)"; e.currentTarget.style.color = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* User Card */}
        {currentUser && (
          <div 
            className="glass-panel" 
            style={{ 
              padding: "12px 16px", 
              display: "flex", 
              alignItems: "center", 
              gap: "12px", 
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "12px"
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "var(--color-primary-glow)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "var(--color-primary)",
                fontSize: "1.1rem"
              }}
            >
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left", overflow: "hidden" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUser.displayName}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUser.email}
              </span>
            </div>
          </div>
        )}

        {/* Sidebar Nav Actions */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <button
            onClick={() => { navigate("/dashboard"); setSidebarOpen(false); }}
            style={getSidebarNavItemStyle(sidebarActiveTab === "dashboard", "dashboard")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button
            onClick={() => { navigate("/transactions"); setSidebarOpen(false); }}
            style={getSidebarNavItemStyle(sidebarActiveTab === "transactions", "transactions")}
          >
            <BookOpen size={18} /> Input Transaksi
          </button>

          <button
            onClick={() => { navigate("/account"); setSidebarOpen(false); }}
            style={getSidebarNavItemStyle(sidebarActiveTab === "account", "account")}
          >
            <User size={18} /> Akun
          </button>
        </nav>

        {/* Theme Switcher in Sidebar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Tema</span>
          <ThemeSwitcher theme={theme} onThemeChange={setTheme} />
        </div>

        {/* Logout Bottom */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "none",
            background: "transparent",
            color: "var(--color-error)",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
            textAlign: "left",
            width: "100%",
            transition: "var(--transition-smooth)"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-error-bg)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <LogOut size={18} /> Keluar Akun
        </button>
      </aside>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          padding: "24px 32px",
          maxHeight: "100vh",
          overflowY: "auto"
        }}
        className="main-dashboard-content"
      >
        {renderDashboardContent()}
      </main>

      {/* Confirm Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun Bundahara Anda?"
        confirmText="Keluar"
        isDanger={true}
      />
    </div>
    </>
  );
}

// Sidebar Nav styling generator
const getSidebarNavItemStyle = (isActive: boolean, type: string) => {
  const primaryGlow = "rgba(168, 85, 247, 0.12)";
  const secondaryGlow = "rgba(236, 72, 153, 0.1)";

  return {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: isActive 
      ? (type === "dashboard" ? primaryGlow : secondaryGlow) 
      : "transparent",
    color: isActive 
      ? (type === "dashboard" ? "var(--color-primary)" : "var(--color-secondary)") 
      : "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    textAlign: "left" as const,
    width: "100%",
    transition: "var(--transition-smooth)",
    borderLeft: isActive 
      ? `3px solid ${type === "dashboard" ? "var(--color-primary)" : "var(--color-secondary)"}`
      : "3px solid transparent"
  };
};

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
