import React, { useState } from "react";
import { dbService } from "../services/dbService";
import type { UserProfile } from "../services/dbService";
import { Button } from "./Button";
import { TextInput } from "./Input";
import { useToast } from "./Toast";
import { ShieldAlert, User, Key, Save } from "lucide-react";

interface AccountViewProps {
  currentUser: UserProfile;
  onProfileUpdate: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ currentUser, onProfileUpdate }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { showToast } = useToast();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("Nama tidak boleh kosong.", "error");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await dbService.updateProfile(displayName.trim());
      showToast("Profil berhasil diperbarui!", "success");
      onProfileUpdate();
    } catch (error: any) {
      showToast(error.message || "Gagal memperbarui profil.", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast("Kata sandi baru tidak boleh kosong.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Kata sandi harus minimal 6 karakter.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi kata sandi tidak cocok.", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await dbService.changePassword(newPassword);
      showToast("Kata sandi berhasil diperbarui!", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showToast(error.message || "Gagal memperbarui kata sandi.", "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        maxWidth: "800px",
        width: "100%",
        margin: "0 auto",
        animation: "fadeIn 0.4s ease-out"
      }}
    >
      <div style={{ textAlign: "left" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 6px" }}>Pengaturan Akun</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Kelola profil bendahara Anda dan amankan akun Anda
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Profile Card */}
        <form
          onSubmit={handleUpdateProfile}
          className="glass-panel"
          style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(168, 85, 247, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)"
              }}
            >
              <User size={20} />
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Informasi Profil</h3>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Alamat Email</label>
            <input
              type="text"
              value={currentUser.email}
              disabled
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                color: "var(--text-muted)",
                cursor: "not-allowed"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Nama Pengguna / Bendahara</label>
            <TextInput
              value={displayName}
              onChange={setDisplayName}
              placeholder="e.g. Bendahara Utama"
              required
            />
          </div>

          <Button type="submit" variant="primary" style={{ marginTop: "12px" }} disabled={isUpdatingProfile}>
            <Save size={18} /> {isUpdatingProfile ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>

        {/* Change Password Card */}
        <form
          onSubmit={handleChangePassword}
          className="glass-panel"
          style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(236, 72, 153, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-secondary)"
              }}
            >
              <Key size={20} />
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Keamanan Akun</h3>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Kata Sandi Baru</label>
            <TextInput
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Konfirmasi Kata Sandi Baru</label>
            <TextInput
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Ketik ulang kata sandi baru"
              required
            />
          </div>

          <Button type="submit" variant="secondary" style={{ marginTop: "12px" }} disabled={isUpdatingPassword}>
            <ShieldAlert size={18} /> {isUpdatingPassword ? "Memperbarui..." : "Ubah Kata Sandi"}
          </Button>
        </form>
      </div>
    </div>
  );
};
