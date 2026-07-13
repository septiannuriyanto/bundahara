import React, { useState, useEffect } from "react";
import { dbService } from "../services/dbService";
import type { Organization, Branch, AnalyticsSummary, BalanceSheet } from "../services/dbService";
import { Button } from "./Button";
import { TextInput } from "./Input";
import { useToast } from "./Toast";
import { Modal } from "./Modal";
import { 
  Building, 
  GitBranch, 
  Plus, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Users,
  Activity
} from "lucide-react";
import Chart from "react-apexcharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF with autoTable type safety since it's added via import
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface DashboardViewProps {
  onNavigateToTransactions: () => void;
  organizations: Organization[];
  branches: Record<string, Branch[]>;
  selectedOrgId: string;
  selectedBranchId: string;
  onSelectOrg: (id: string) => void;
  onSelectBranch: (id: string) => void;
  onRefreshData: () => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTransactions,
  organizations,
  branches,
  selectedOrgId,
  selectedBranchId,
  onSelectOrg,
  onSelectBranch,
  onRefreshData
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [transactions, setTransactions] = useState<BalanceSheet[]>([]);
  const { showToast } = useToast();

  // Modals for adding Org/Branch
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgBranchName, setNewOrgBranchName] = useState("");
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const currentBranch = branches[selectedOrgId]?.find(b => b.id === selectedBranchId);

  useEffect(() => {
    if (selectedOrgId && selectedBranchId) {
      loadDashboardAnalytics();
    } else {
      setAnalytics(null);
      setTransactions([]);
    }
  }, [selectedOrgId, selectedBranchId]);

  const loadDashboardAnalytics = async () => {
    try {
      const summary = await dbService.getAnalytics(selectedOrgId, selectedBranchId);
      const txList = await dbService.getTransactions(selectedOrgId, selectedBranchId);
      setAnalytics(summary);
      setTransactions(txList);
    } catch (error: any) {
      showToast(error.message || "Gagal memuat analitik dashboard.", "error");
    }
  };

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      showToast("Nama organisasi tidak boleh kosong.", "error");
      return;
    }
    try {
      const newOrg = await dbService.addOrganization(
        newOrgName.trim(), 
        newOrgBranchName.trim() || "PUSAT"
      );
      showToast(`Organisasi "${newOrg.name}" berhasil dibuat!`, "success");
      setNewOrgName("");
      setNewOrgBranchName("");
      setIsAddOrgOpen(false);
      await onRefreshData();
      onSelectOrg(newOrg.id);
    } catch (error: any) {
      showToast(error.message || "Gagal membuat organisasi baru.", "error");
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      showToast("Nama cabang tidak boleh kosong.", "error");
      return;
    }
    try {
      const newBranch = await dbService.addBranch(selectedOrgId, newBranchName.trim());
      showToast(`Cabang "${newBranch.name}" berhasil ditambahkan!`, "success");
      setNewBranchName("");
      setIsAddBranchOpen(false);
      await onRefreshData();
      onSelectBranch(newBranch.id);
    } catch (error: any) {
      showToast(error.message || "Gagal menambahkan cabang.", "error");
    }
  };

  const handleDownloadPDF = () => {
    if (!currentOrg || !currentBranch) return;

    try {
      const doc = new jsPDF() as jsPDFWithAutoTable;
      
      // Header styling
      doc.setFillColor(26, 21, 40);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("LAPORAN KAS BUNDAHARA", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Organisasi: ${currentOrg.name} (${currentBranch.name})`, 14, 28);
      doc.text(`Tanggal Laporan: ${new Date().toLocaleDateString("id-ID")}`, 14, 34);

      // Financial summary cards values
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text("Ringkasan Finansial:", 14, 52);
      
      const balance = analytics?.balance || 0;
      const income = analytics?.totalIncome || 0;
      const expense = analytics?.totalExpense || 0;

      doc.setFont("helvetica", "bold");
      doc.text(`Total Pemasukan : Rp ${income.toLocaleString("id-ID")}`, 14, 60);
      doc.text(`Total Pengeluaran: Rp ${expense.toLocaleString("id-ID")}`, 14, 66);
      doc.text(`Sisa Saldo Kas   : Rp ${balance.toLocaleString("id-ID")}`, 14, 72);

      // Add a line divider
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 78, 196, 78);

      // Table mapping
      const tableData = transactions.map((t, idx) => [
        idx + 1,
        new Date(t.date).toLocaleDateString("id-ID"),
        t.type === "income" ? "Pemasukan" : "Pengeluaran",
        `Rp ${t.amount.toLocaleString("id-ID")}`,
        t.pic,
        t.description || "-"
      ]);

      doc.autoTable({
        startY: 84,
        head: [["No", "Tanggal", "Tipe", "Nominal", "PIC", "Deskripsi"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillStyle: "F", fillColor: [147, 51, 234], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 3 }
      });

      doc.save(`Laporan_Kas_${currentOrg.name.replace(/\s+/g, "_")}_${currentBranch.name.replace(/\s+/g, "_")}.pdf`);
      showToast("Laporan PDF berhasil diunduh!", "success");
    } catch (error) {
      console.error("Gagal mendownload PDF:", error);
      showToast("Gagal menghasilkan laporan PDF.", "error");
    }
  };

  // ApexCharts Data Formatting
  const getChartOptions = (): ApexCharts.ApexOptions => {
    const months = analytics?.monthly.map(m => m.month) || [];
    return {
      chart: {
        type: "area",
        background: "transparent",
        toolbar: { show: false },
        foreColor: "#9ca3af"
      },
      colors: ["#10b981", "#ef4444"], // Primary colors for Income & Expense
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      xaxis: {
        categories: months,
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      grid: {
        borderColor: "rgba(255, 255, 255, 0.05)",
        strokeDashArray: 4
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val) => `Rp ${val.toLocaleString("id-ID")}`
        }
      }
    };
  };

  const getChartSeries = () => {
    const incomes = analytics?.monthly.map(m => m.income) || [];
    const expenses = analytics?.monthly.map(m => m.expense) || [];
    return [
      { name: "Pemasukan", data: incomes },
      { name: "Pengeluaran", data: expenses }
    ];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", animation: "fadeIn 0.4s ease-out" }}>
      {/* Tabbed Navigation per Organisasi */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "12px", 
          display: "flex", 
          flexDirection: "column", 
          gap: "12px"
        }}
      >
        {/* Org tab Row */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "8px", textTransform: "uppercase" }}>
            Organisasi:
          </span>
          {organizations.length === 0 ? (
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Belum ada organisasi</span>
          ) : (
            organizations.map(org => (
              <button
                key={org.id}
                onClick={() => onSelectOrg(org.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: selectedOrgId === org.id ? "rgba(168, 85, 247, 0.18)" : "transparent",
                  color: selectedOrgId === org.id ? "var(--color-primary)" : "var(--text-secondary)",
                  border: selectedOrgId === org.id ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  transition: "var(--transition-smooth)"
                }}
              >
                <Building size={16} />
                {org.name}
              </button>
            ))
          )}

          <button
            onClick={() => setIsAddOrgOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed rgba(255, 255, 255, 0.2)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "var(--transition-smooth)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Branch tab Row */}
        {selectedOrgId && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", borderTop: "1px solid var(--panel-border)", paddingTop: "12px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "8px", textTransform: "uppercase" }}>
              Cabang/Kas:
            </span>
            {(branches[selectedOrgId] || []).map(branch => (
              <button
                key={branch.id}
                onClick={() => onSelectBranch(branch.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: selectedBranchId === branch.id ? "rgba(236, 72, 153, 0.12)" : "transparent",
                  color: selectedBranchId === branch.id ? "var(--color-secondary)" : "var(--text-secondary)",
                  border: selectedBranchId === branch.id ? "1px solid rgba(236, 72, 153, 0.3)" : "1px solid transparent",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  transition: "var(--transition-smooth)"
                }}
              >
                <GitBranch size={14} />
                {branch.name}
              </button>
            ))}

            <button
              onClick={() => setIsAddBranchOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 10px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px dashed rgba(255, 255, 255, 0.2)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "var(--transition-smooth)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-secondary)";
                e.currentTarget.style.color = "var(--color-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      {organizations.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: "80px 32px", 
            textAlign: "center", 
            cursor: "pointer",
            border: "1px dashed var(--color-primary-glow)"
          }}
          onClick={() => setIsAddOrgOpen(true)}
        >
          <Building size={48} style={{ color: "var(--color-primary)", marginBottom: "16px" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Belum ada organisasi</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Tekan di sini untuk menambah organisasi baru
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {/* Total Balance */}
            <div className="glass-panel" style={{ padding: "24px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", borderLeft: "4px solid var(--color-primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Sisa Saldo Kas</span>
                <Wallet size={20} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                Rp {(analytics?.balance || 0).toLocaleString("id-ID")}
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <span>Update Real-time</span>
                <Button variant="secondary" size="sm" onClick={onNavigateToTransactions} style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px" }}>
                  Catat Transaksi
                </Button>
              </div>
            </div>

            {/* Income Card */}
            <div className="glass-panel" style={{ padding: "24px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", borderLeft: "4px solid var(--color-success)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Total Pemasukan</span>
                <TrendingUp size={20} color="var(--color-success)" />
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-success)" }}>
                Rp {(analytics?.totalIncome || 0).toLocaleString("id-ID")}
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Akumulasi Kas Masuk</span>
            </div>

            {/* Expense Card */}
            <div className="glass-panel" style={{ padding: "24px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", borderLeft: "4px solid var(--color-error)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Total Pengeluaran</span>
                <TrendingDown size={20} color="var(--color-error)" />
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-error)" }}>
                Rp {(analytics?.totalExpense || 0).toLocaleString("id-ID")}
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Akumulasi Kas Keluar</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ textAlign: "left" }}>
              <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                Analisis Finansial {currentBranch?.name}
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Grafik performa arus kas bulanan
              </p>
            </div>
            <Button variant="glass" onClick={handleDownloadPDF} disabled={transactions.length === 0}>
              <FileText size={18} /> Unduh Laporan (PDF)
            </Button>
          </div>

          {/* Apexchart Card */}
          <div className="glass-panel" style={{ padding: "24px 16px", minHeight: "350px" }}>
            {analytics && analytics.monthly.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--text-muted)", gap: "8px" }}>
                <Activity size={32} />
                <span>Belum ada riwayat bulanan untuk chart</span>
              </div>
            ) : (
              <Chart
                options={getChartOptions()}
                series={getChartSeries()}
                type="area"
                height={320}
              />
            )}
          </div>

          {/* Bottom Grid: PIC Analytics & Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {/* Grouped by PIC Card */}
            <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} color="var(--color-primary)" />
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Kas Berdasarkan PIC</h4>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Kontribusi transaksi per Person in Contact
              </p>
              
              <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", maxHeight: "240px", paddingRight: "4px" }}>
                {analytics && analytics.byPic.length === 0 ? (
                  <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Tidak ada data PIC.</span>
                ) : (
                  analytics?.byPic.map((p, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.pic}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Masuk: Rp {p.income.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-error)" }}>
                        Keluar: Rp {p.expense.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick summary statistics */}
            <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} color="var(--color-secondary)" />
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Prosedur Analitik Ringkas</h4>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Estimasi performa bulanan
              </p>

              <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Rata-rata Transaksi Masuk</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-success)" }}>
                    Rp {(((analytics?.totalIncome || 0) / (transactions.filter(t => t.type === 'income').length || 1))).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Rata-rata Transaksi Keluar</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-error)" }}>
                    Rp {(((analytics?.totalExpense || 0) / (transactions.filter(t => t.type === 'expense').length || 1))).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Rasio Pengeluaran Terhadap Pemasukan</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    {(((analytics?.totalExpense || 0) / (analytics?.totalIncome || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Org Modal */}
      <Modal isOpen={isAddOrgOpen} onClose={() => setIsAddOrgOpen(false)} title="Tambah Organisasi Baru">
        <form onSubmit={handleAddOrg} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div>
            <label>Nama Organisasi / Kelas</label>
            <TextInput
              value={newOrgName}
              onChange={setNewOrgName}
              placeholder="e.g. Kelas XII MIPA 1"
              required
            />
          </div>
          <div>
            <label>Nama Cabang Keuangan (Optional)</label>
            <TextInput
              value={newOrgBranchName}
              onChange={setNewOrgBranchName}
              placeholder="e.g. Uang Kas Utama (Default: PUSAT)"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <Button variant="glass" type="button" onClick={() => setIsAddOrgOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Simpan Organisasi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Branch Modal */}
      <Modal isOpen={isAddBranchOpen} onClose={() => setIsAddBranchOpen(false)} title="Tambah Cabang Keuangan Baru">
        <form onSubmit={handleAddBranch} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div>
            <label>Nama Cabang</label>
            <TextInput
              value={newBranchName}
              onChange={setNewBranchName}
              placeholder="e.g. Dana Sosial, Kas Tabungan"
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <Button variant="glass" type="button" onClick={() => setIsAddBranchOpen(false)}>
              Batal
            </Button>
            <Button variant="secondary" type="submit">
              Tambah Cabang
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
