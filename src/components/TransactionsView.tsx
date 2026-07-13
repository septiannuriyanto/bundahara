import React, { useState, useEffect } from "react";
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
  Search
} from "lucide-react";

interface TransactionsViewProps {
  selectedOrgId: string;
  selectedBranchId: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedOrgId,
  selectedBranchId
}) => {
  // Tabs: 'income' | 'expense'
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [transactions, setTransactions] = useState<BalanceSheet[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BalanceSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
  const itemsPerPage = 8;

  const { showToast } = useToast();

  useEffect(() => {
    if (selectedOrgId && selectedBranchId) {
      loadTransactions();
    }
  }, [selectedOrgId, selectedBranchId]);

  useEffect(() => {
    // Filter transactions based on active tab and search query (PIC or Description)
    const result = transactions.filter(t => {
      const matchesTab = t.type === activeTab;
      const matchesSearch = 
        t.pic.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
    setFilteredTransactions(result);
    setCurrentPage(1); // Reset to page 1 on search or tab change
  }, [transactions, activeTab, searchQuery]);

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
      if (file.size > 2 * 1024 * 1024) { // Limit size to 2MB for cloud storage
        showToast("Ukuran gambar bukti terlalu besar (maksimal 2MB).", "error");
        return;
      }
      setProofFile(file);
      // Create visual temporary object URL for form preview
      const previewUrl = URL.createObjectURL(file);
      setProofOfPayment(previewUrl);
    }
  };

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) {
      showToast("Nominal transaksi harus lebih dari 0.", "error");
      return;
    }
    if (!pic.trim()) {
      showToast("PIC tidak boleh kosong.", "error");
      return;
    }
    if (!proofOfPayment) {
      showToast("Bukti pembayaran wajib disertakan.", "error");
      return;
    }
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
        // Edit mode
        await dbService.updateTransaction(editId, {
          amount: nominal,
          pic: pic.trim(),
          description: description.trim(),
          proofOfPayment: uploadedUrl
        });
        showToast("Transaksi berhasil diperbarui!", "success");
      } else {
        // Create mode
        await dbService.addTransaction(
          selectedOrgId,
          selectedBranchId,
          activeTab,
          nominal,
          Date.now(),
          pic.trim(),
          description.trim(),
          uploadedUrl
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.4s ease-out" }}>
      {/* Head section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ textAlign: "left" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 6px" }}>Buku Kas</h2>
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

      {/* Transaction Toggle Form Panel */}
      {isFormOpen && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: "28px", 
            display: "flex", 
            flexDirection: "column", 
            gap: "20px", 
            border: "1px solid rgba(168, 85, 247, 0.25)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              {editId ? "Edit Transaksi" : `Catat ${activeTab === "income" ? "Pemasukan" : "Pengeluaran"}`}
            </h3>
            <button
              onClick={handleFormCancel}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handlePreSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", textAlign: "left" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label>Tanggal</label>
              <input
                type="text"
                value={new Date().toLocaleDateString("id-ID")}
                disabled
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-muted)",
                  cursor: "not-allowed"
                }}
              />
            </div>

            <Input
              label="Nominal Transaksi"
              value={nominal}
              onChange={setNominal}
              isCurrency={true}
              placeholder="e.g. 50.000"
              required
            />

            <TextInput
              label="Person In Contact (PIC)"
              value={pic}
              onChange={setPic}
              placeholder="Nama penanggung jawab"
              required
            />

            <TextInput
              label="Deskripsi / Catatan (Optional)"
              value={description}
              onChange={setDescription}
              placeholder="e.g. Pembelian spidol kelas"
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label>Bukti Pembayaran (Wajib)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ padding: "8px" }}
              />
              {proofOfPayment && (
                <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <img
                    src={proofOfPayment}
                    alt="Preview Bukti"
                    style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--panel-border)" }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bukti Terpilih</span>
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <Button variant="glass" type="button" onClick={handleFormCancel}>
                Batal
              </Button>
              <Button variant="primary" type="submit">
                Simpan Transaksi
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs list & Search Row */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "16px", 
          display: "flex", 
          flexDirection: "row",
          justifyContent: "space-between", 
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        {/* Toggle Income/Expense tabs */}
        <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.03)", padding: "4px", borderRadius: "10px", border: "1px solid var(--panel-border)" }}>
          <button
            onClick={() => setActiveTab("income")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "income" ? "var(--color-success-bg)" : "transparent",
              color: activeTab === "income" ? "var(--color-success)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "var(--transition-smooth)"
            }}
          >
            <TrendingUp size={16} /> Pemasukan
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "expense" ? "var(--color-error-bg)" : "transparent",
              color: activeTab === "expense" ? "var(--color-error)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "var(--transition-smooth)"
            }}
          >
            <TrendingDown size={16} /> Pengeluaran
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", maxWidth: "300px" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari PIC atau deskripsi..."
            style={{ paddingLeft: "42px", height: "42px" }}
          />
        </div>
      </div>

      {/* Main Table view */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--panel-border)", background: "rgba(255, 255, 255, 0.02)" }}>
                <th style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>TANGGAL</th>
                <th style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>NOMINAL</th>
                <th style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>PIC (NAMA)</th>
                <th style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>DESKRIPSI / CATATAN</th>
                <th style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem" }}>BUKTI</th>
                <th style={{ padding: "16px 20px", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "right" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", color: "var(--text-muted)", textAlign: "center" }}>
                    Memuat data...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", color: "var(--text-muted)", textAlign: "center" }}>
                    Tidak ada transaksi {activeTab === "income" ? "pemasukan" : "pengeluaran"} tercatat.
                  </td>
                </tr>
              ) : (
                currentItems.map((tx) => (
                  <tr 
                    key={tx.id} 
                    style={{ borderBottom: "1px solid var(--panel-border)", transition: "var(--transition-smooth)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.01)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{ padding: "16px 20px", fontSize: "0.95rem" }}>
                      {new Date(tx.date).toLocaleDateString("id-ID")}
                    </td>
                    <td 
                      style={{ 
                        padding: "16px 20px", 
                        fontSize: "0.95rem", 
                        fontWeight: 700, 
                        color: tx.type === "income" ? "var(--color-success)" : "var(--color-error)" 
                      }}
                    >
                      Rp {tx.amount.toLocaleString("id-ID")}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "0.95rem", fontWeight: 600 }}>
                      {tx.pic}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                      {tx.description || "-"}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {tx.proofOfPayment ? (
                        <button
                          onClick={() => setViewProofUrl(tx.proofOfPayment)}
                          style={{
                            background: "rgba(168, 85, 247, 0.1)",
                            border: "1px solid rgba(168, 85, 247, 0.25)",
                            color: "var(--color-primary)",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "var(--transition-smooth)"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(168, 85, 247, 0.2)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)"}
                        >
                          Lihat Bukti
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Tidak ada</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          onClick={() => handleOpenEditForm(tx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(tx.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-error)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginated Footer */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--panel-border)" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransactions.length)} dari {filteredTransactions.length}
            </span>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="glass"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="glass"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveTransaction}
        title="Konfirmasi Transaksi"
        message={`Apakah Anda yakin ingin menyimpan transaksi senilai Rp ${nominal.toLocaleString("id-ID")} dengan PIC "${pic}"?`}
        confirmText="Simpan"
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteTransaction}
        title="Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus data transaksi ini secara permanen?"
        confirmText="Hapus"
        isDanger={true}
      />

      {/* View Proof of Payment Modal */}
      <Modal
        isOpen={viewProofUrl !== null}
        onClose={() => setViewProofUrl(null)}
        title="Bukti Pembayaran"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          {viewProofUrl && (
            <img
              src={viewProofUrl}
              alt="Bukti Pembayaran"
              style={{
                width: "100%",
                maxHeight: "450px",
                objectFit: "contain",
                borderRadius: "10px",
                border: "1px solid var(--panel-border)"
              }}
            />
          )}
          <Button variant="glass" onClick={() => setViewProofUrl(null)} style={{ width: "100%" }}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
};
