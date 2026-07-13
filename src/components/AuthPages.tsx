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
    <div className="auth-page-shell">
      <div className="glass-panel auth-card animate-fade-in">
        <div className="auth-header">
          <Button variant="glass" size="sm" onClick={onNavigateHome} className="auth-back-btn">
            <ArrowLeft size={18} /> Kembali ke Beranda
          </Button>

          <div className="auth-toggle-row">
            <Button
              variant={isLogin ? "primary" : "glass"}
              size="sm"
              onClick={() => setIsLogin(true)}
              style={{ minWidth: "108px" }}
            >
              Masuk
            </Button>
            <Button
              variant={!isLogin ? "primary" : "glass"}
              size="sm"
              onClick={() => setIsLogin(false)}
              style={{ minWidth: "108px" }}
            >
              Daftar
            </Button>
          </div>
        </div>

        <div className="auth-copy">
          <h2 className="text-gradient">{isLogin ? "Selamat Datang" : "Daftar Akun"}</h2>
          <p>
            {isLogin
              ? "Masuk untuk mengelola keuangan bendahara kelas Anda"
              : "Buat akun bendahara kelas Anda sekarang"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-input-group">
              <label>Nama Lengkap / Nama Panggilan</label>
              <div className="auth-input-with-icon">
                <User size={18} />
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

          <div className="auth-input-group">
            <label>Alamat Email</label>
            <div className="auth-input-with-icon">
              <Mail size={18} />
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

          <div className="auth-input-group">
            <label>Kata Sandi</label>
            <div className="auth-input-with-icon">
              <KeyRound size={18} />
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

          <Button type="submit" variant="primary" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? "Memproses..." : isLogin ? "Masuk ke Akun" : "Daftar Sekarang"}
          </Button>
        </form>

        <div className="auth-switch-text">
          <span>{isLogin ? "Belum punya akun?" : "Sudah punya akun?"}</span>
          <Button type="button" variant="glass" size="sm" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Daftar di sini" : "Masuk di sini"}
          </Button>
        </div>
      </div>
    </div>
  );
};
