import React from "react";
import type { UserProfile } from "../services/dbService";
import { Button } from "./Button";
import { BookOpen, Shield, TrendingUp } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface LandingPageProps {
  currentUser: UserProfile | null;
  onNavigate: (view: "dashboard" | "auth" | "landing") => void;
  onLogout: () => void;
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onNavigate,
  onLogout,
  theme,
  onThemeChange
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Dynamic Header */}
      <header
        className="glass-panel landing-header"
        style={{
          position: "sticky",
          top: "16px",
          margin: "16px 24px 0",
          padding: "16px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 100,
          borderRadius: "14px"
        }}
      >
        <div 
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          onClick={() => onNavigate("landing")}
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

        <nav style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {currentUser ? (
            <>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", display: "none" }}>
                Halo, {currentUser.displayName}
              </span>
              <Button variant="glass" onClick={onLogout} size="sm">
                Keluar
              </Button>
              <Button variant="primary" onClick={() => onNavigate("dashboard")} size="sm">
                Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button variant="glass" onClick={() => onNavigate("auth")} size="sm">
                Masuk / Daftar
              </Button>
            </>
          )}
          <div style={{ marginLeft: "8px", display: "flex", alignItems: "center" }}>
            <ThemeSwitcher theme={theme} onThemeChange={onThemeChange} />
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="landing-main" style={{ flex: 1, padding: "80px 24px", display: "flex", flexDirection: "column", gap: "90px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <section style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              background: "rgba(168, 85, 247, 0.1)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
              letterSpacing: "1px",
              textTransform: "uppercase"
            }}
          >
            Aplikasi Bendahara Kelas Modern
          </div>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              maxWidth: "800px",
              margin: 0
            }}
          >
            Kelola Keuangan Kelas & Organisasi Jadi{" "}
            <span className="text-gradient">Lebih Transparan</span>
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              maxWidth: "600px",
              margin: 0
            }}
          >
            Catat pemasukan, atur pengeluaran per cabang keuangan, dan unduh laporan kas PDF instan dengan visualisasi grafis elegan.
          </p>

          <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
            {currentUser ? (
              <Button variant="primary" size="lg" onClick={() => onNavigate("dashboard")}>
                Masuk ke Dashboard
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={() => onNavigate("auth")}>
                Mulai Sekarang Gratis
              </Button>
            )}
          </div>
        </section>

        {/* Features grid */}
        <section className="landing-features" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(168, 85, 247, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)"
              }}
            >
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Visualisasi Interaktif</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Analisis pemasukan dan pengeluaran secara real-time dengan chart Apexcharts yang interaktif dan mudah dibaca.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(236, 72, 153, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-secondary)"
              }}
            >
              <BookOpen size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Multi-Cabang & Org</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Kelola kas untuk berbagai kepanitiaan, ekstrakurikuler, atau tabungan sosial dalam satu akun yang terstruktur.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-success)"
              }}
            >
              <Shield size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Keamanan Cloud</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Seluruh data kas kelas disimpan secara aman di Firestore database dan terlindungi secara cloud-based.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--panel-border)",
          padding: "32px 24px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
          marginTop: "auto"
        }}
      >
        <p>&copy; {new Date().getFullYear()} Bundahara. Dibuat dengan cinta untuk Bendahara Kelas modern.</p>
      </footer>
    </div>
  );
};
