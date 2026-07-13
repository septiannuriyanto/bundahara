import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dbService } from "../services/dbService";
import type { BalanceSheet } from "../services/dbService";
import { Button } from "./Button";
import { Input, TextInput } from "./Input";
import { useToast } from "./Toast";
import { Modal, ConfirmModal } from "./Modal";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  LayoutList
} from "lucide-react";

type ActiveTab = "income" | "expense" | "all";
type SortKey = "date" | "amount" | "pic" | "description" | "type";
type SortDir = "asc" | "desc";

interface FilterState {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  pic: string;
}

interface TransactionsViewProps {
  selectedOrgId: string;
  selectedBranchId: string;
  orgName?: string;
  branchName?: string;
  initialTab?: ActiveTab;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedOrgId,
  selectedBranchId,
  orgName,
  branchName,
  initialTab = "all"
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [transactions, setTransactions] = useState<BalanceSheet[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BalanceSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Filter dialog
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCoords, setFilterCoords] = useState({ top: 0, left: 0 });
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "", dateTo: "", amountMin: "", amountMax: "", pic: ""
  });
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    dateFrom: "", dateTo: "", amountMin: "", amountMax: "", pic: ""
  });

  // Form details
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nominal, setNominal] = useState<number>(0);
  const [pic, setPic] = useState("");
  const [description, setDescription] = useState("");
  const [proofOfPayment, setProofOfPayment] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // Confirmations
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { showToast } = useToast();

  useEffect(() => {
    if (selectedOrgId && selectedBranchId) {
      loadTransactions();
    }
  }, [selectedOrgId, selectedBranchId]);

  useEffect(() => {
    let result = [...transactions];

    // Tab filter
    if (activeTab !== "all") {
      result = result.filter(t => t.type === activeTab);
    }

    // Search filter
    if (searchQuery) {
      result = result.filter(t =>
        t.pic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Active filters
    if (activeFilters.dateFrom) {
      result = result.filter(t => t.date >= new Date(activeFilters.dateFrom).getTime());
    }
    if (activeFilters.dateTo) {
      result = result.filter(t => t.date <= new Date(activeFilters.dateTo).getTime() + 86400000);
    }
    if (activeFilters.amountMin) {
      result = result.filter(t => t.amount >= Number(activeFilters.amountMin));
    }
    if (activeFilters.amountMax) {
      result = result.filter(t => t.amount <= Number(activeFilters.amountMax));
    }
    if (activeFilters.pic) {
      result = result.filter(t =>
        t.pic.toLowerCase().includes(activeFilters.pic.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortKey) {
        case "date": valA = a.date; valB = b.date; break;
        case "amount": valA = a.amount; valB = b.amount; break;
        case "pic": valA = a.pic.toLowerCase(); valB = b.pic.toLowerCase(); break;
        case "description": valA = (a.description || "").toLowerCase(); valB = (b.description || "").toLowerCase(); break;
        case "type": valA = a.type; valB = b.type; break;
        default: valA = a.date; valB = b.date;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredTransactions(result);
    setCurrentPage(1);
  }, [transactions, activeTab, searchQuery, sortKey, sortDir, activeFilters]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const list = await dbService.getTransactions(selectedOrgId, selectedBranchId);
      setTransactions(list);
    } catch (error: any) {
      showToast(error.message || "Gagal memuat daftar transaksi.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditId(null);
    setNominal(0);
    setPic("");
    setDescription("");
    setProofOfPayment("");
    setProofFile(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (tx: BalanceSheet) => {
    setEditId(tx.id);
    setNominal(tx.amount);
    setPic(tx.pic);
    setDescription(tx.description || "");
    setProofOfPayment(tx.proofOfPayment || "");
    setProofFile(null);
    setIsFormOpen(true);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditId(null);
    setProofOfPayment("");
    setProofFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Ukuran gambar bukti terlalu besar (maksimal 2MB).", "error");
        return;
      }
      setProofFile(file);
      const previewUrl = URL.createObjectURL(file);
      setProofOfPayment(previewUrl);
    }
  };

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) { showToast("Nominal transaksi harus lebih dari 0.", "error"); return; }
    if (!pic.trim()) { showToast("PIC tidak boleh kosong.", "error"); return; }
    if (!proofOfPayment) { showToast("Bukti pembayaran wajib disertakan.", "error"); return; }
    setShowSaveConfirm(true);
  };

  const handleSaveTransaction = async () => {
    setIsLoading(true);
    try {
      let uploadedUrl = proofOfPayment;
      if (proofFile) {
        showToast("Mengunggah bukti pembayaran ke Firebase Storage...", "info");
        uploadedUrl = await dbService.uploadProof(proofFile);
      }
      if (editId) {
        await dbService.updateTransaction(editId, {
          amount: nominal, pic: pic.trim(), description: description.trim(), proofOfPayment: uploadedUrl
        });
        showToast("Transaksi berhasil diperbarui!", "success");
      } else {
        await dbService.addTransaction(
          selectedOrgId, selectedBranchId, activeTab === "all" ? "income" : activeTab,
          nominal, Date.now(), pic.trim(), description.trim(), uploadedUrl
        );
        showToast("Transaksi berhasil disimpan!", "success");
      }
      setIsFormOpen(false);
      setEditId(null);
      setProofFile(null);
      setProofOfPayment("");
      await loadTransactions();
    } catch (error: any) {
      showToast(error.message || "Gagal menyimpan transaksi.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deleteId) return;
    try {
      await dbService.deleteTransaction(deleteId);
      showToast("Transaksi berhasil dihapus.", "success");
      setDeleteId(null);
      await loadTransactions();
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus transaksi.", "error");
    }
  };

  // Sorting helper
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortDir === "asc" ? <ArrowUp size={13} style={{ color: "var(--color-primary)" }} /> : <ArrowDown size={13} style={{ color: "var(--color-primary)" }} />;
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== "");

  // Filter dialog opener
  const openFilterDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFilterCoords({
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 320)
    });
    setFilters({ ...activeFilters });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setActiveFilters({ ...filters });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    const empty = { dateFrom: "", dateTo: "", amountMin: "", amountMax: "", pic: "" };
    setFilters(empty);
    setActiveFilters(empty);
    setFilterOpen(false);
  };

  // Tab change also updates URL
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "income") navigate("/transactions/income");
    else if (tab === "expense") navigate("/transactions/expense");
    else navigate("/transactions");
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  // Running balance for "all" tab
  const computeRunningBalance = () => {
    let balance = 0;
    const map: Record<string, number> = {};
    // Sort all by date asc for calculation
    const sorted = [...filteredTransactions].sort((a, b) => a.date - b.date);
    sorted.forEach(t => {
      balance += t.type === "income" ? t.amount : -t.amount;
      map[t.id] = balance;
    });
    return map;
  };
  const runningBalanceMap = activeTab === "all" ? computeRunningBalance() : {};

  // Summary for "all" mode
  const totalIncome = filteredTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Column header style helper
  const thStyle = (col: SortKey): React.CSSProperties => ({
    padding: "14px 16px",
    fontWeight: 700,
    color: sortKey === col ? "var(--color-primary)" : "var(--text-secondary)",
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    transition: "color 0.2s"
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.4s ease-out" }}>
      {/* Head section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ textAlign: "left" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span>Buku Kas</span>
            {orgName && (
              <span style={{
                fontSize: "0.95rem", fontWeight: 600, padding: "4px 10px", borderRadius: "20px",
                background: "var(--color-primary-glow)", color: "var(--color-primary)",
                border: "1px solid rgba(168, 85, 247, 0.2)"
              }}>
                {orgName} {branchName ? `• ${branchName}` : ""}
              </span>
            )}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Catat dan pantau seluruh transaksi kas masuk dan keluar
          </p>
        </div>
        {!isFormOpen && (
          <Button variant="primary" onClick={handleOpenAddForm}>
            <Plus size={18} /> Tambah Transaksi
          </Button>
        )}
      </div>

      {/* Transaction Form */}
      {isFormOpen && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              {editId ? "Edit Transaksi" : `Catat ${activeTab === "income" ? "Pemasukan" : activeTab === "expense" ? "Pengeluaran" : "Transaksi"}`}
            </h3>
            <button onClick={handleFormCancel} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handlePreSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", textAlign: "left" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label>Tanggal</label>
              <input type="text" value={new Date().toLocaleDateString("id-ID")} disabled style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", color: "var(--text-muted)", cursor: "not-allowed" }} />
            </div>
            {activeTab === "all" && !editId && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label>Jenis Transaksi</label>
                <select
                  value={pic ? "income" : "expense"}
                  onChange={() => {}}
                  style={{ padding: "10px 14px", borderRadius: "8px", background: "var(--panel-bg)", border: "1px solid var(--panel-border)", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
              </div>
            )}
            <Input label="Nominal Transaksi" value={nominal} onChange={setNominal} isCurrency={true} placeholder="e.g. 50.000" required />
            <TextInput label="Person In Contact (PIC)" value={pic} onChange={setPic} placeholder="Nama penanggung jawab" required />
            <TextInput label="Deskripsi / Catatan (Optional)" value={description} onChange={setDescription} placeholder="e.g. Pembelian spidol kelas" />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label>Bukti Pembayaran (Wajib)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ padding: "8px" }} />
              {proofOfPayment && (
                <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <img src={proofOfPayment} alt="Preview Bukti" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--panel-border)" }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bukti Terpilih</span>
                </div>
              )}
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <Button variant="glass" type="button" onClick={handleFormCancel}>Batal</Button>
              <Button variant="primary" type="submit">Simpan Transaksi</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs + Search Row */}
      <div className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.03)", padding: "4px", borderRadius: "10px", border: "1px solid var(--panel-border)", gap: "2px" }}>
          {([
            { key: "all" as ActiveTab, label: "Semua", icon: <LayoutList size={15} />, active: "var(--color-primary-glow)", activeColor: "var(--color-primary)" },
            { key: "income" as ActiveTab, label: "Pemasukan", icon: <TrendingUp size={15} />, active: "var(--color-success-bg)", activeColor: "var(--color-success)" },
            { key: "expense" as ActiveTab, label: "Pengeluaran", icon: <TrendingDown size={15} />, active: "var(--color-error-bg)", activeColor: "var(--color-error)" }
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: "7px", padding: "7px 14px", borderRadius: "8px", border: "none",
                background: activeTab === tab.key ? tab.active : "transparent",
                color: activeTab === tab.key ? tab.activeColor : "var(--text-secondary)",
                fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", transition: "var(--transition-smooth)"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Filter button */}
          <button
            onClick={openFilterDialog}
            title="Filter"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 12px", borderRadius: "8px",
              background: hasActiveFilters ? "var(--color-primary-glow)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${hasActiveFilters ? "rgba(168,85,247,0.3)" : "var(--panel-border)"}`,
              color: hasActiveFilters ? "var(--color-primary)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, transition: "var(--transition-smooth)"
            }}
          >
            <Filter size={15} />
            Filter {hasActiveFilters && `(Aktif)`}
          </button>

          {/* Search bar */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari PIC atau deskripsi..."
              style={{ paddingLeft: "38px", height: "40px", minWidth: "220px" }}
            />
          </div>
        </div>
      </div>

      {/* Neraca summary for "all" tab */}
      {activeTab === "all" && (
        <div className="transactions-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Total Pemasukan", value: totalIncome, color: "var(--color-success)", bg: "var(--color-success-bg)" },
            { label: "Total Pengeluaran", value: totalExpense, color: "var(--color-error)", bg: "var(--color-error-bg)" },
            { label: "Saldo Bersih", value: netBalance, color: netBalance >= 0 ? "var(--color-success)" : "var(--color-error)", bg: netBalance >= 0 ? "var(--color-success-bg)" : "var(--color-error-bg)" }
          ].map(card => (
            <div key={card.label} className="glass-panel" style={{ padding: "16px 20px", borderLeft: `3px solid ${card.color}` }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{card.label}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: card.color }}>Rp {Math.abs(card.value).toLocaleString("id-ID")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: activeTab === "all" ? "750px" : "620px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--panel-border)", background: "rgba(255, 255, 255, 0.02)" }}>
                <th onClick={() => handleSort("date")} style={thStyle("date")}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>TANGGAL <SortIcon col="date" /></span>
                </th>
                {activeTab === "all" && (
                  <th onClick={() => handleSort("type")} style={thStyle("type")}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>TIPE <SortIcon col="type" /></span>
                  </th>
                )}
                <th onClick={() => handleSort("amount")} style={thStyle("amount")}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>NOMINAL <SortIcon col="amount" /></span>
                </th>
                <th onClick={() => handleSort("pic")} style={thStyle("pic")}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>PIC (NAMA) <SortIcon col="pic" /></span>
                </th>
                <th onClick={() => handleSort("description")} style={thStyle("description")}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>DESKRIPSI <SortIcon col="description" /></span>
                </th>
                {activeTab === "all" && (
                  <th style={{ ...thStyle("date"), cursor: "default" }}>SALDO</th>
                )}
                <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.82rem" }}>BUKTI</th>
                <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.82rem", textAlign: "right" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={activeTab === "all" ? 8 : 6} style={{ padding: "40px", color: "var(--text-muted)", textAlign: "center" }}>Memuat data...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "all" ? 8 : 6} style={{ padding: "40px", color: "var(--text-muted)", textAlign: "center" }}>
                    Tidak ada transaksi {activeTab === "income" ? "pemasukan" : activeTab === "expense" ? "pengeluaran" : ""} tercatat.
                  </td>
                </tr>
              ) : (
                currentItems.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: "1px solid var(--panel-border)", transition: "var(--transition-smooth)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.015)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{ padding: "14px 16px", fontSize: "0.9rem" }}>
                      {new Date(tx.date).toLocaleDateString("id-ID")}
                    </td>
                    {activeTab === "all" && (
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px", borderRadius: "12px",
                          background: tx.type === "income" ? "var(--color-success-bg)" : "var(--color-error-bg)",
                          color: tx.type === "income" ? "var(--color-success)" : "var(--color-error)"
                        }}>
                          {tx.type === "income" ? "↑ Masuk" : "↓ Keluar"}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "14px 16px", fontSize: "0.95rem", fontWeight: 700, color: tx.type === "income" ? "var(--color-success)" : "var(--color-error)" }}>
                      {tx.type === "income" ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.9rem", fontWeight: 600 }}>{tx.pic}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>{tx.description || "-"}</td>
                    {activeTab === "all" && (
                      <td style={{
                        padding: "14px 16px", fontSize: "0.9rem", fontWeight: 700,
                        color: (runningBalanceMap[tx.id] ?? 0) >= 0 ? "var(--color-success)" : "var(--color-error)"
                      }}>
                        Rp {(runningBalanceMap[tx.id] ?? 0).toLocaleString("id-ID")}
                      </td>
                    )}
                    <td style={{ padding: "14px 16px" }}>
                      {tx.proofOfPayment ? (
                        <button
                          onClick={() => setViewProofUrl(tx.proofOfPayment)}
                          style={{
                            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
                            color: "var(--color-primary)", padding: "4px 8px", borderRadius: "6px",
                            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer"
                          }}
                        >Lihat Bukti</button>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button onClick={() => handleOpenEditForm(tx)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                        ><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(tx.id)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-error)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                        ><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--panel-border)" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="glass" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>
                <ChevronLeft size={16} />
              </Button>
              <Button variant="glass" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Global Filter Dialog */}
      {filterOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setFilterOpen(false)} />
          <div style={{
            position: "fixed",
            top: `${filterCoords.top}px`,
            left: `${filterCoords.left}px`,
            zIndex: 99999,
            background: "var(--modal-bg)",
            border: "1px solid var(--modal-border)",
            borderRadius: "12px",
            padding: "20px",
            minWidth: "300px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            animation: "fadeIn 0.15s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Filter Transaksi</span>
              <button onClick={() => setFilterOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Tanggal Dari</label>
                  <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "6px", fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Tanggal Sampai</label>
                  <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "6px", fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Nominal Min (Rp)</label>
                  <input type="number" value={filters.amountMin} onChange={e => setFilters(f => ({ ...f, amountMin: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "8px", borderRadius: "6px", fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Nominal Max (Rp)</label>
                  <input type="number" value={filters.amountMax} onChange={e => setFilters(f => ({ ...f, amountMax: e.target.value }))} placeholder="∞" style={{ width: "100%", padding: "8px", borderRadius: "6px", fontSize: "0.85rem" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>PIC (Nama)</label>
                <input type="text" value={filters.pic} onChange={e => setFilters(f => ({ ...f, pic: e.target.value }))} placeholder="Nama penanggung jawab..." style={{ width: "100%", padding: "8px", borderRadius: "6px", fontSize: "0.85rem" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button onClick={clearFilters} style={{ flex: 1, padding: "8px", borderRadius: "8px", background: "transparent", border: "1px solid var(--panel-border)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
                  Reset
                </button>
                <button onClick={applyFilters} style={{ flex: 1, padding: "8px", borderRadius: "8px", background: "var(--color-primary)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Save */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveTransaction}
        title="Konfirmasi Transaksi"
        message={`Apakah Anda yakin ingin menyimpan transaksi senilai Rp ${nominal.toLocaleString("id-ID")} dengan PIC "${pic}"?`}
        confirmText="Simpan"
      />

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteTransaction}
        title="Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus data transaksi ini secara permanen?"
        confirmText="Hapus"
        isDanger={true}
      />

      {/* View Proof */}
      <Modal isOpen={viewProofUrl !== null} onClose={() => setViewProofUrl(null)} title="Bukti Pembayaran">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          {viewProofUrl && (
            <img src={viewProofUrl} alt="Bukti Pembayaran" style={{ width: "100%", maxHeight: "450px", objectFit: "contain", borderRadius: "10px", border: "1px solid var(--panel-border)" }} />
          )}
          <Button variant="glass" onClick={() => setViewProofUrl(null)} style={{ width: "100%" }}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
};
