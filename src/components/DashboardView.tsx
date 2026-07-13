import React, { useState, useEffect, useRef, useCallback } from "react";
import { dbService } from "../services/dbService";
import type { Organization, Branch, AnalyticsSummary, BalanceSheet } from "../services/dbService";
import { Button } from "./Button";
import { TextInput } from "./Input";
import { useToast } from "./Toast";
import { Modal, ConfirmModal } from "./Modal";
import { 
  Building, 
  GitBranch, 
  Plus, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Users,
  Activity,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";
import Chart from "react-apexcharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


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

  // Month selector: default to current year-month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  // Scroll refs for org & branch tab rows
  const orgScrollRef = useRef<HTMLDivElement>(null);
  const branchScrollRef = useRef<HTMLDivElement>(null);
  const [orgCanScrollLeft, setOrgCanScrollLeft] = useState(false);
  const [orgCanScrollRight, setOrgCanScrollRight] = useState(false);
  const [branchCanScrollLeft, setBranchCanScrollLeft] = useState(false);
  const [branchCanScrollRight, setBranchCanScrollRight] = useState(false);

  const updateScrollState = useCallback((ref: React.RefObject<HTMLDivElement | null>, setLeft: (v: boolean) => void, setRight: (v: boolean) => void) => {
    const el = ref.current;
    if (!el) return;
    setLeft(el.scrollLeft > 8);
    setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = orgScrollRef.current;
    if (!el) return;
    const handler = () => updateScrollState(orgScrollRef, setOrgCanScrollLeft, setOrgCanScrollRight);
    handler();
    el.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    return () => { el.removeEventListener("scroll", handler); window.removeEventListener("resize", handler); };
  }, [organizations, updateScrollState]);

  useEffect(() => {
    const el = branchScrollRef.current;
    if (!el) return;
    const handler = () => updateScrollState(branchScrollRef, setBranchCanScrollLeft, setBranchCanScrollRight);
    handler();
    el.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    return () => { el.removeEventListener("scroll", handler); window.removeEventListener("resize", handler); };
  }, [selectedOrgId, branches, updateScrollState]);

  const scrollTabs = (ref: React.RefObject<HTMLDivElement | null>, dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -80 : 80, behavior: "smooth" });
  };

  // Modals for adding Org/Branch
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgBranchName, setNewOrgBranchName] = useState("");
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  // Edit/delete popup states
  const [activeOrgMenuId, setActiveOrgMenuId] = useState<string | null>(null);
  const [activeBranchMenuId, setActiveBranchMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgId, setEditOrgId] = useState("");

  // Logo states (shared for add/edit org)
  const [newOrgLogoFile, setNewOrgLogoFile] = useState<File | null>(null);
  const [newOrgLogoPreview, setNewOrgLogoPreview] = useState<string>("");
  const [editOrgLogoFile, setEditOrgLogoFile] = useState<File | null>(null);
  const [editOrgLogoPreview, setEditOrgLogoPreview] = useState<string>("");

  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchId, setEditBranchId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ type: "org" | "branch"; id: string; name: string } | null>(null);

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

  // Compute month-filtered analytics client-side
  const filteredTransactions = transactions.filter(tx => {
    const d = new Date(tx.date);
    const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return txMonth === selectedMonth;
  });

  const filteredAnalytics = (() => {
    if (!analytics) return null;
    let totalIncome = 0;
    let totalExpense = 0;
    filteredTransactions.forEach(tx => {
      if (tx.type === "income") totalIncome += tx.amount;
      else totalExpense += tx.amount;
    });
    return { ...analytics, totalIncome, totalExpense, balance: totalIncome - totalExpense };
  })();

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
      let uploadedLogoUrl: string | undefined;
      if (newOrgLogoFile) {
        showToast("Mengunggah logo organisasi...", "info");
        uploadedLogoUrl = await dbService.uploadProof(newOrgLogoFile);
      }
      const newOrg = await dbService.addOrganization(
        newOrgName.trim(),
        newOrgBranchName.trim() || "PUSAT",
        uploadedLogoUrl
      );
      showToast(`Organisasi "${newOrg.name}" berhasil dibuat!`, "success");
      setNewOrgName("");
      setNewOrgBranchName("");
      setNewOrgLogoFile(null);
      setNewOrgLogoPreview("");
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

  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrgName.trim()) {
      showToast("Nama organisasi tidak boleh kosong.", "error");
      return;
    }
    try {
      let uploadedLogoUrl: string | undefined = editOrgLogoPreview || undefined;
      if (editOrgLogoFile) {
        showToast("Mengunggah logo organisasi...", "info");
        uploadedLogoUrl = await dbService.uploadProof(editOrgLogoFile);
      }
      await dbService.updateOrganization(editOrgId, editOrgName.trim(), uploadedLogoUrl);
      showToast("Organisasi berhasil diperbarui!", "success");
      setIsEditOrgOpen(false);
      setEditOrgLogoFile(null);
      await onRefreshData();
    } catch (error: any) {
      showToast(error.message || "Gagal mengubah nama organisasi.", "error");
    }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranchName.trim()) {
      showToast("Nama cabang tidak boleh kosong.", "error");
      return;
    }
    try {
      await dbService.updateBranch(editBranchId, editBranchName.trim());
      showToast("Nama cabang berhasil diperbarui!", "success");
      setIsEditBranchOpen(false);
      await onRefreshData();
    } catch (error: any) {
      showToast(error.message || "Gagal mengubah nama cabang.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "org") {
        await dbService.deleteOrganization(deleteTarget.id);
        showToast(`Organisasi "${deleteTarget.name}" berhasil dihapus.`, "success");
      } else {
        await dbService.deleteBranch(deleteTarget.id);
        showToast(`Cabang "${deleteTarget.name}" berhasil dihapus.`, "success");
      }
      await onRefreshData();
      setDeleteTarget(null);
    } catch (error: any) {
      showToast(error.message || "Gagal melakukan penghapusan.", "error");
    }
  };

  const handleDownloadPDF = () => {
    if (!currentOrg || !currentBranch) return;

    try {
      const doc = new jsPDF();

      // Parse period label from selectedMonth (YYYY-MM)
      const [year, month] = selectedMonth.split("-");
      const periodLabel = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString("id-ID", { year: "numeric", month: "long" });

      // Financial summary from month-filtered analytics
      const income = filteredAnalytics?.totalIncome || 0;
      const expense = filteredAnalytics?.totalExpense || 0;
      const balance = filteredAnalytics?.balance || 0;

      // ── Header Block ──────────────────────────────────────────────────
      doc.setFillColor(26, 21, 40);
      doc.rect(0, 0, 210, 48, "F");

      // Embed logo if available (placed top-right of header)
      const logoUrl = currentOrg.logoUrl;
      if (logoUrl && logoUrl.startsWith("data:image")) {
        try {
          const ext = logoUrl.includes("image/png") ? "PNG" : "JPEG";
          doc.addImage(logoUrl, ext, 168, 6, 36, 36);
        } catch (_) { /* skip logo if error */ }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("LAPORAN KAS", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Organisasi : ${currentOrg.name}`, 14, 28);
      doc.text(`Cabang     : ${currentBranch.name}`, 14, 34);
      doc.text(`Periode    : ${periodLabel}`, 14, 40);
      doc.text(`Dicetak    : ${new Date().toLocaleDateString("id-ID")}`, 110, 40);

      // ── Summary Block ─────────────────────────────────────────────────
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("RINGKASAN FINANSIAL", 14, 58);

      // Summary table (3 cards inline)
      const summaryData = [
        ["Total Pemasukan", `Rp ${income.toLocaleString("id-ID")}`],
        ["Total Pengeluaran", `Rp ${expense.toLocaleString("id-ID")}`],
        ["Saldo Bersih", `Rp ${balance.toLocaleString("id-ID")}`],
      ];
      autoTable(doc, {
        startY: 62,
        head: [["Keterangan", "Jumlah"]],
        body: summaryData,
        theme: "plain",
        headStyles: { fillColor: [240, 240, 240], textColor: [80, 80, 80], fontSize: 9, fontStyle: "bold" },
        styles: { fontSize: 9.5, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { fontStyle: "bold", cellWidth: 60 }
        },
        didDrawCell: (data) => {
          // Highlight saldo row
          if (data.row.index === 2 && data.column.index === 1) {
            doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
          }
        },
        margin: { left: 14 },
        tableWidth: 120
      });

      const afterSummaryY = (doc as any).lastAutoTable.finalY + 8;

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(14, afterSummaryY, 196, afterSummaryY);

      // ── Transaction Table ─────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`DAFTAR TRANSAKSI – ${periodLabel.toUpperCase()}`, 14, afterSummaryY + 8);

      // Compute running balance for table
      let runningBalance = 0;
      const tableData = filteredTransactions
        .sort((a, b) => a.date - b.date)
        .map((t, idx) => {
          runningBalance += t.type === "income" ? t.amount : -t.amount;
          return [
            idx + 1,
            new Date(t.date).toLocaleDateString("id-ID"),
            t.type === "income" ? "Pemasukan" : "Pengeluaran",
            `Rp ${t.amount.toLocaleString("id-ID")}`,
            t.pic,
            t.description || "-",
            `Rp ${runningBalance.toLocaleString("id-ID")}`
          ];
        });

      autoTable(doc, {
        startY: afterSummaryY + 12,
        head: [["No", "Tanggal", "Tipe", "Nominal", "PIC", "Deskripsi", "Saldo"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 22 },
          2: { cellWidth: 24 },
          3: { cellWidth: 30 },
          6: { fontStyle: "bold", cellWidth: 28 }
        },
        didParseCell: (data) => {
          if (data.column.index === 2 && data.section === "body") {
            data.cell.styles.textColor = data.cell.raw === "Pemasukan" ? [22, 163, 74] : [220, 38, 38];
          }
        }
      });

      const filename = `Laporan_Kas_${currentOrg.name.replace(/\s+/g, "_")}_${currentBranch.name.replace(/\s+/g, "_")}_${selectedMonth}.pdf`;
      doc.save(filename);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, marginBottom: "4px", letterSpacing: "-0.03em" }}>Dashboard</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.92rem", maxWidth: "520px", lineHeight: 1.55 }}>
            Catat dan pantau seluruh transaksi kas masuk dan keluar dengan ringkas dan mudah.
          </p>
        </div>
      </div>

      {/* Tabbed Navigation per Organisasi */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "10px 12px", 
          display: "flex", 
          flexDirection: "column", 
          gap: "10px"
        }}
      >
        {/* Org tab Row – scrollable horizontal with chevron buttons */}
        <div style={{ position: "relative" }}>
          {orgCanScrollLeft && (
            <button
              onClick={() => scrollTabs(orgScrollRef, "left")}
              style={{
                position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                zIndex: 10, background: "var(--panel-bg)", border: "1px solid var(--panel-border)",
                borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-primary)", backdropFilter: "blur(8px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            ><ChevronLeft size={14} /></button>
          )}
          {orgCanScrollRight && (
            <button
              onClick={() => scrollTabs(orgScrollRef, "right")}
              style={{
                position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                zIndex: 10, background: "var(--panel-bg)", border: "1px solid var(--panel-border)",
                borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-primary)", backdropFilter: "blur(8px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            ><ChevronRight size={14} /></button>
          )}
          <div ref={orgScrollRef} style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
            Organisasi:
          </span>

          {organizations.length === 0 ? (
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", whiteSpace: "nowrap" }}>Belum ada organisasi</span>
          ) : (
            organizations.map(org => (
              <div key={org.id} style={{ position: "relative", flexShrink: 0 }}>
                {/* Tab button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0",
                    borderRadius: "8px",
                    background: selectedOrgId === org.id ? "var(--color-primary-glow)" : "transparent",
                    border: selectedOrgId === org.id ? "1px solid rgba(168,85,247,0.35)" : "1px solid transparent",
                    overflow: "hidden",
                    transition: "var(--transition-smooth)"
                  }}
                >
                  <button
                    onClick={() => onSelectOrg(org.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 10px 7px 12px",
                      background: "transparent",
                      border: "none",
                      color: selectedOrgId === org.id ? "var(--color-primary)" : "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Building size={14} />
                    {org.name}
                  </button>

                  {/* Triple-dot menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const popoverWidth = 160;
                      const clampedLeft = Math.min(rect.left, window.innerWidth - popoverWidth - 8);
                      setMenuCoords({
                        top: rect.bottom + 6,
                        left: clampedLeft
                      });
                      setActiveOrgMenuId(activeOrgMenuId === org.id ? null : org.id);
                      setActiveBranchMenuId(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "7px 6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      borderRadius: "0 7px 7px 0"
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add org button */}
          <button
            onClick={() => setIsAddOrgOpen(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "7px 10px", borderRadius: "8px", flexShrink: 0,
              background: "transparent",
              border: "1px dashed var(--panel-border)",
              color: "var(--text-muted)", cursor: "pointer",
              transition: "var(--transition-smooth)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--panel-border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Plus size={15} />
          </button>
          </div>  {/* end orgScrollRef inner div */}
        </div>  {/* end org tab row outer wrapper */}

        {/* Branch tab Row – scrollable horizontal with chevron buttons */}
        {selectedOrgId && (
          <div style={{ borderTop: "1px solid var(--panel-border)", paddingTop: "10px", position: "relative" }}>
            {branchCanScrollLeft && (
              <button
                onClick={() => scrollTabs(branchScrollRef, "left")}
                style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  zIndex: 10, background: "var(--panel-bg)", border: "1px solid var(--panel-border)",
                  borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-primary)", backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
              ><ChevronLeft size={12} /></button>
            )}
            {branchCanScrollRight && (
              <button
                onClick={() => scrollTabs(branchScrollRef, "right")}
                style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  zIndex: 10, background: "var(--panel-bg)", border: "1px solid var(--panel-border)",
                  borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-primary)", backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
              ><ChevronRight size={12} /></button>
            )}
            <div ref={branchScrollRef} style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
              Cabang:
            </span>

            {(branches[selectedOrgId] || []).map(branch => (
              <div key={branch.id} style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "8px",
                    background: selectedBranchId === branch.id ? "rgba(236,72,153,0.12)" : "transparent",
                    border: selectedBranchId === branch.id ? "1px solid rgba(236,72,153,0.3)" : "1px solid transparent",
                    overflow: "hidden",
                    transition: "var(--transition-smooth)"
                  }}
                >
                  <button
                    onClick={() => onSelectBranch(branch.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "6px 8px 6px 10px", background: "transparent", border: "none",
                      color: selectedBranchId === branch.id ? "var(--color-secondary)" : "var(--text-secondary)",
                      cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap"
                    }}
                  >
                    <GitBranch size={13} />
                    {branch.name}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const popoverWidth = 160;
                      const clampedLeft = Math.min(rect.left, window.innerWidth - popoverWidth - 8);
                      setMenuCoords({
                        top: rect.bottom + 6,
                        left: clampedLeft
                      });
                      setActiveBranchMenuId(activeBranchMenuId === branch.id ? null : branch.id);
                      setActiveOrgMenuId(null);
                    }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "6px 5px", background: "transparent", border: "none",
                      color: "var(--text-muted)", cursor: "pointer", borderRadius: "0 7px 7px 0"
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add branch button */}
            <button
              onClick={() => setIsAddBranchOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "6px 10px", borderRadius: "8px", flexShrink: 0,
                background: "transparent",
                border: "1px dashed var(--panel-border)",
                color: "var(--text-muted)", cursor: "pointer",
                transition: "var(--transition-smooth)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-secondary)"; e.currentTarget.style.color = "var(--color-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--panel-border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <Plus size={14} />
            </button>
            </div>
          </div>
        )}
      </div>

      {/* Click-outside handler to close open popovers */}
      {(activeOrgMenuId || activeBranchMenuId) && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9998 }}
          onClick={() => { setActiveOrgMenuId(null); setActiveBranchMenuId(null); }}
        />
      )}

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
          {/* Month Selector + Summary Cards header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CalendarDays size={18} color="var(--color-primary)" />
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Ringkasan Bulan</span>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid var(--panel-border)",
                background: "var(--panel-bg)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
                width: "auto"
              }}
            />
          </div>

          {/* Summary Cards */}
          <div className="dashboard-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            {/* Total Balance */}
            <div className="glass-panel" style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: "12px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 18px 40px rgba(0,0,0,0.07)", background: "rgba(255,255,255,0.04)", borderLeft: "5px solid var(--color-primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Sisa Saldo Kas</span>
                <Wallet size={22} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>
                Rp {(filteredAnalytics?.balance || 0).toLocaleString("id-ID")}
              </h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                <span>Update Real-time</span>
                <Button variant="secondary" size="sm" onClick={onNavigateToTransactions} style={{ padding: "8px 12px", fontSize: "0.8rem", borderRadius: "10px" }}>
                  <Plus size={14} /> Catat Transaksi
                </Button>
              </div>
            </div>

            {/* Income Card */}
            <div className="glass-panel" style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: "12px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 18px 40px rgba(0,0,0,0.07)", background: "rgba(255,255,255,0.04)", borderLeft: "5px solid var(--color-success)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Total Pemasukan</span>
                <TrendingUp size={22} color="var(--color-success)" />
              </div>
              <h3 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "var(--color-success)" }}>
                Rp {(filteredAnalytics?.totalIncome || 0).toLocaleString("id-ID")}
              </h3>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Akumulasi Kas Masuk</span>
            </div>

            {/* Expense Card */}
            <div className="glass-panel" style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: "12px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 18px 40px rgba(0,0,0,0.07)", background: "rgba(255,255,255,0.04)", borderLeft: "5px solid var(--color-error)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Total Pengeluaran</span>
                <TrendingDown size={22} color="var(--color-error)" />
              </div>
              <h3 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "var(--color-error)" }}>
                Rp {(filteredAnalytics?.totalExpense || 0).toLocaleString("id-ID")}
              </h3>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Akumulasi Kas Keluar</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ textAlign: "left" }}>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                Analisis Finansial {currentBranch?.name}
              </h4>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Grafik performa arus kas bulanan
              </p>
            </div>
            <Button variant="glass" onClick={handleDownloadPDF} disabled={transactions.length === 0} style={{ padding: "10px 14px" }}>
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
      <Modal isOpen={isAddOrgOpen} onClose={() => { setIsAddOrgOpen(false); setNewOrgLogoFile(null); setNewOrgLogoPreview(""); }} title="Tambah Organisasi Baru">
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
          {/* Logo Upload */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label>Logo Organisasi (Optional)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "12px",
                border: "2px dashed var(--panel-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
                background: "rgba(255,255,255,0.02)"
              }}>
                {newOrgLogoPreview
                  ? <img src={newOrgLogoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: "1.6rem" }}>🏫</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  id="add-org-logo"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) { showToast("Ukuran logo maksimal 2MB.", "error"); return; }
                      setNewOrgLogoFile(file);
                      setNewOrgLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <label htmlFor="add-org-logo" style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px", borderRadius: "8px",
                  background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
                  color: "var(--color-primary)", fontSize: "0.85rem", fontWeight: 600,
                  cursor: "pointer"
                }}>Pilih Logo</label>
                {newOrgLogoPreview && (
                  <button type="button" onClick={() => { setNewOrgLogoFile(null); setNewOrgLogoPreview(""); }}
                    style={{ marginLeft: "8px", background: "none", border: "none", color: "var(--color-error)", cursor: "pointer", fontSize: "0.8rem" }}
                  >Hapus</button>
                )}
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>PNG/JPG, max 2MB. Akan ditampilkan di PDF laporan.</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <Button variant="glass" type="button" onClick={() => { setIsAddOrgOpen(false); setNewOrgLogoFile(null); setNewOrgLogoPreview(""); }}>
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

      {/* Edit Org Modal */}
      <Modal isOpen={isEditOrgOpen} onClose={() => { setIsEditOrgOpen(false); setEditOrgLogoFile(null); }} title="Edit Organisasi">
        <form onSubmit={handleEditOrg} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div>
            <label>Nama Organisasi / Kelas</label>
            <TextInput
              value={editOrgName}
              onChange={setEditOrgName}
              placeholder="e.g. Kelas XII MIPA 1"
              required
            />
          </div>
          {/* Logo Upload */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label>Logo Organisasi (Optional)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "12px",
                border: "2px dashed var(--panel-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
                background: "rgba(255,255,255,0.02)"
              }}>
                {editOrgLogoPreview
                  ? <img src={editOrgLogoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: "1.6rem" }}>🏫</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  id="edit-org-logo"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) { showToast("Ukuran logo maksimal 2MB.", "error"); return; }
                      setEditOrgLogoFile(file);
                      setEditOrgLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <label htmlFor="edit-org-logo" style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px", borderRadius: "8px",
                  background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
                  color: "var(--color-primary)", fontSize: "0.85rem", fontWeight: 600,
                  cursor: "pointer"
                }}>Ganti Logo</label>
                {editOrgLogoPreview && (
                  <button type="button" onClick={() => { setEditOrgLogoFile(null); setEditOrgLogoPreview(""); }}
                    style={{ marginLeft: "8px", background: "none", border: "none", color: "var(--color-error)", cursor: "pointer", fontSize: "0.8rem" }}
                  >Hapus</button>
                )}
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>PNG/JPG, max 2MB. Akan ditampilkan di PDF laporan.</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <Button variant="glass" type="button" onClick={() => { setIsEditOrgOpen(false); setEditOrgLogoFile(null); }}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal isOpen={isEditBranchOpen} onClose={() => setIsEditBranchOpen(false)} title="Edit Nama Cabang">
        <form onSubmit={handleEditBranch} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
          <div>
            <label>Nama Cabang / Kas</label>
            <TextInput
              value={editBranchName}
              onChange={setEditBranchName}
              placeholder="e.g. Dana Sosial, Kas Tabungan"
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <Button variant="glass" type="button" onClick={() => setIsEditBranchOpen(false)}>
              Batal
            </Button>
            <Button variant="secondary" type="submit">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === "org" ? "Hapus Organisasi" : "Hapus Cabang"}
        message={
          deleteTarget?.type === "org"
            ? `Apakah Anda yakin ingin menghapus organisasi "${deleteTarget?.name}"? Semua cabang yang terkait juga akan terhapus.`
            : `Apakah Anda yakin ingin menghapus cabang "${deleteTarget?.name}"?`
        }
        confirmText="Ya, Hapus"
        isDanger
      />

      {/* Global Popover Menu (outside nested components to resolve z-index context bugs) */}
      {(activeOrgMenuId || activeBranchMenuId) && menuCoords && (
        <div
          style={{
            position: "fixed",
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            zIndex: 99999,
            background: "var(--modal-bg)",
            border: "1px solid var(--modal-border)",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
            minWidth: "140px",
            animation: "fadeIn 0.15s ease-out"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeOrgMenuId ? (
            <>
              <button
                onClick={() => {
                  const org = organizations.find(o => o.id === activeOrgMenuId);
                  if (org) {
                    setEditOrgId(org.id);
                    setEditOrgName(org.name);
                    setEditOrgLogoPreview(org.logoUrl || "");
                    setEditOrgLogoFile(null);
                    setIsEditOrgOpen(true);
                  }
                  setActiveOrgMenuId(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "10px 14px", background: "transparent",
                  border: "none", color: "var(--text-primary)", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: 500, textAlign: "left"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-primary-glow)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                ✏️ Edit
              </button>
              <div style={{ height: "1px", background: "var(--panel-border)", margin: "0 8px" }} />
              <button
                onClick={() => {
                  const org = organizations.find(o => o.id === activeOrgMenuId);
                  if (org) {
                    setDeleteTarget({ type: "org", id: org.id, name: org.name });
                  }
                  setActiveOrgMenuId(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "10px 14px", background: "transparent",
                  border: "none", color: "var(--color-error)", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: 500, textAlign: "left"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-error-bg)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                🗑️ Hapus
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const branch = (branches[selectedOrgId] || []).find(b => b.id === activeBranchMenuId);
                  if (branch) {
                    setEditBranchId(branch.id);
                    setEditBranchName(branch.name);
                    setIsEditBranchOpen(true);
                  }
                  setActiveBranchMenuId(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "10px 14px", background: "transparent",
                  border: "none", color: "var(--text-primary)", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: 500, textAlign: "left"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-primary-glow)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                ✏️ Edit
              </button>
              <div style={{ height: "1px", background: "var(--panel-border)", margin: "0 8px" }} />
              <button
                onClick={() => {
                  const branch = (branches[selectedOrgId] || []).find(b => b.id === activeBranchMenuId);
                  if (branch) {
                    setDeleteTarget({ type: "branch", id: branch.id, name: branch.name });
                  }
                  setActiveBranchMenuId(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "10px 14px", background: "transparent",
                  border: "none", color: "var(--color-error)", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: 500, textAlign: "left"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-error-bg)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                🗑️ Hapus
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
