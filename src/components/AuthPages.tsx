import React, { useState } from "react";
import { dbService } from "../services/dbService";
import { Button } from "./Button";
import { TextInput } from "./Input";
import { useToast } from "./Toast";
import { KeyRound, Mail, User, ArrowLeft } from "lucide-react";

interface AuthPagesProps {
  onAuthSuccess: () => void;
  onNavigateHome: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ onAuthSuccess, onNavigateHome }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !displayName)) {
      showToast("Harap isi semua kolom input.", "error");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await dbService.login(email, password);
        showToast("Berhasil masuk ke akun Anda!", "success");
      } else {
        await dbService.register(email, password, displayName);
        showToast("Pendaftaran berhasil, selamat datang!", "success");
      }
      onAuthSuccess();
    } catch (error: any) {
      showToast(error.message || "Terjadi kesalahan autentikasi.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        position: "relative"
      }}
    >
      {/* Back to Home Button */}
      <button
        onClick={onNavigateHome}
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: 600,
          fontSize: "0.9rem",
          transition: "var(--transition-smooth)"
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
      >
        <ArrowLeft size={18} /> Kembali ke Beranda
      </button>

      <div
        className="glass-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px 32px",
          backgroundColor: "rgba(20, 16, 33, 0.8)",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 8px" }} className="text-gradient">
            {isLogin ? "Selamat Datang" : "Daftar Akun"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {isLogin
              ? "Masuk untuk mengelola keuangan bendahara kelas Anda"
              : "Buat akun bendahara kelas Anda sekarang"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!isLogin && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label>Nama Lengkap / Nama Panggilan</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <User
                  size={18}
                  style={{ position: "absolute", left: "16px", color: "var(--text-muted)" }}
                />
                <TextInput
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="e.g. Budi Bendahara"
                  style={{ paddingLeft: "44px" }}
                  required
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Alamat Email</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail
                size={18}
                style={{ position: "absolute", left: "16px", color: "var(--text-muted)" }}
              />
              <TextInput
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="e.g. name@example.com"
                style={{ paddingLeft: "44px" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Kata Sandi</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <KeyRound
                size={18}
                style={{ position: "absolute", left: "16px", color: "var(--text-muted)" }}
              />
              <TextInput
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                style={{ paddingLeft: "44px" }}
                required
              />
            </div>
          </div>

          <Button type="submit" variant="primary" style={{ marginTop: "8px" }} disabled={isLoading}>
            {isLoading ? "Memproses..." : isLogin ? "Masuk ke Akun" : "Daftar Sekarang"}
          </Button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {isLogin ? "Daftar di sini" : "Masuk di sini"}
          </button>
        </div>
      </div>
    </div>
  );
};
