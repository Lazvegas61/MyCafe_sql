/* ============================================================
   📄 DOSYA: StokYonetimi.jsx (MYCAFE ANAYASASI UYUMLU)
   📌 DEĞİŞİKLİKLER:
   - LocalStorage kaldırıldı
   - Backend API entegrasyonu eklendi
   - Role-based permission kontrolü eklendi
   - MyCafe Anayasası Madde 7 uygulandı
============================================================ */

import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { stockApi } from "../../api/stockApi";

// Renk sabitleri
const COLORS = {
  coffee: "#4b2e05",
  coffeeHover: "#3c2404",
  beige: "#f5e7d0",
  white: "#ffffff",
  red: "#b91c1c",
  green: "#15803d",
};

export default function StokYonetimi() {
  const { hasPermission } = useAuth();
  
  const [kategoriler, setKategoriler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [miktar, setMiktar] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Verileri API'den yükle
  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        stockApi.getProducts(),
        stockApi.getCategories()
      ]);
      
      setUrunler(productsRes.data || []);
      setKategoriler(categoriesRes.data || []);
      setError(null);
    } catch (err) {
      console.error("Stok verileri yükleme hatası:", err);
      setError("Stok verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Kategori adını ID'ye göre bul
  const kategoriAdiById = (id) =>
    kategoriler.find((k) => k.id === id)?.name || "-";

  // Miktar değişikliği
  const onMiktarChange = (id, value) => {
    // Sadece pozitif sayılar
    const numValue = parseInt(value);
    if (value === "" || (!isNaN(numValue) && numValue >= 0)) {
      setMiktar((m) => ({ ...m, [id]: value }));
    }
  };

  // Stok girişi
  const stokGiris = async (urunId) => {
    if (!hasPermission('stock.update')) {
      showMessage("Bu işlem için yetkiniz yok!", "error");
      return;
    }

    const val = parseInt(miktar[urunId]) || 0;
    if (val <= 0) {
      showMessage("Geçerli bir miktar giriniz", "error");
      return;
    }

    try {
      await stockApi.stockIn(urunId, val, "Manuel stok girişi");
      
      // Listeyi yenile
      await loadData();
      
      // Input'u temizle
      setMiktar((m) => ({ ...m, [urunId]: "" }));
      
      showMessage(`${val} adet stok girişi yapıldı`, "success");
      
    } catch (err) {
      console.error("Stok girişi hatası:", err);
      showMessage(err.response?.data?.message || "Stok girişi yapılamadı", "error");
    }
  };

  // Stok çıkışı
  const stokCikis = async (urunId) => {
    if (!hasPermission('stock.update')) {
      showMessage("Bu işlem için yetkiniz yok!", "error");
      return;
    }

    const val = parseInt(miktar[urunId]) || 0;
    if (val <= 0) {
      showMessage("Geçerli bir miktar giriniz", "error");
      return;
    }

    // Ürünü bul
    const urun = urunler.find(u => u.id === urunId);
    if (!urun) return;

    // Stok kontrolü
    if (val > (urun.currentStock || 0)) {
      showMessage("Yetersiz stok! Çıkış yapılamaz.", "error");
      return;
    }

    try {
      await stockApi.stockOut(urunId, val, "Manuel stok çıkışı");
      
      // Listeyi yenile
      await loadData();
      
      // Input'u temizle
      setMiktar((m) => ({ ...m, [urunId]: "" }));
      
      showMessage(`${val} adet stok çıkışı yapıldı`, "success");
      
    } catch (err) {
      console.error("Stok çıkışı hatası:", err);
      showMessage(err.response?.data?.message || "Stok çıkışı yapılamadı", "error");
    }
  };

  // Ürün sil
  const urunSil = async (urunId) => {
    if (!hasPermission('product.delete')) {
      showMessage("Bu işlem için yetkiniz yok!", "error");
      return;
    }

    const urun = urunler.find(u => u.id === urunId);
    if (!urun) return;

    if (!window.confirm(`${urun.name} isimli ürünü silmek istediğinize emin misiniz?`)) return;

    // Stok kontrolü (Opsiyonel - backend'de de kontrol edilebilir)
    if ((urun.currentStock || 0) > 0) {
      if (!window.confirm("Bu ürünün stoku var. Yine de silmek istiyor musunuz?")) return;
    }

    try {
      await stockApi.deleteProduct(urunId);
      
      // Listeyi yenile
      await loadData();
      
      showMessage("Ürün başarıyla silindi", "success");
      
    } catch (err) {
      console.error("Ürün silme hatası:", err);
      showMessage(err.response?.data?.message || "Ürün silinemedi", "error");
    }
  };

  // Mesaj göster
  const showMessage = (text, type = "success") => {
    setSuccessMessage(text);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Stok verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <h3>❌ Hata</h3>
          <p>{error}</p>
          <button onClick={loadData} style={styles.btn}>
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.h2}>Stok Yönetimi</h2>

      {/* Başarı mesajı */}
      {successMessage && (
        <div style={styles.successMessage}>
          {successMessage}
        </div>
      )}

      <div style={styles.card}>
        {urunler.length === 0 ? (
          <p style={styles.emptyMessage}>Henüz ürün yok.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Ürün</th>
                <th style={styles.th}>Kategori</th>
                <th style={styles.th}>Mevcut Stok</th>
                <th style={styles.th}>Miktar</th>
                <th style={styles.th}>İşlemler</th>
                {hasPermission('product.delete') && (
                  <th style={styles.th}>Sil</th>
                )}
              </tr>
            </thead>
            <tbody>
              {urunler.map((u, i) => (
                <tr key={u.id}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{kategoriAdiById(u.categoryId)}</td>
                  <td style={styles.td}>
                    <span style={{
                      color: (u.currentStock || 0) <= (u.minStock || 0) ? COLORS.red : COLORS.green,
                      fontWeight: (u.currentStock || 0) <= (u.minStock || 0) ? "bold" : "normal"
                    }}>
                      {u.currentStock || 0}
                      {(u.currentStock || 0) <= (u.minStock || 0) && (
                        <span style={{ fontSize: "12px", color: COLORS.red, marginLeft: "5px" }}>
                          ⚠️ Kritik
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      placeholder="Adet"
                      value={miktar[u.id] ?? ""}
                      onChange={(e) => onMiktarChange(u.id, e.target.value)}
                      disabled={!hasPermission('stock.update')}
                    />
                  </td>
                  <td style={styles.td}>
                    {hasPermission('stock.update') ? (
                      <>
                        <button 
                          style={styles.btnIn} 
                          onClick={() => stokGiris(u.id)}
                          disabled={!miktar[u.id] || parseInt(miktar[u.id]) <= 0}
                        >
                          Giriş
                        </button>
                        {" "}
                        <button 
                          style={styles.btnOut} 
                          onClick={() => stokCikis(u.id)}
                          disabled={!miktar[u.id] || parseInt(miktar[u.id]) <= 0 || parseInt(miktar[u.id]) > (u.currentStock || 0)}
                        >
                          Çıkış
                        </button>
                      </>
                    ) : (
                      <span style={{ color: "#999", fontSize: "14px" }}>
                        Yetkiniz yok
                      </span>
                    )}
                  </td>
                  {hasPermission('product.delete') && (
                    <td style={styles.td}>
                      <button 
                        style={styles.btnDanger} 
                        onClick={() => urunSil(u.id)}
                      >
                        Sil
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Özet bilgi */}
        {urunler.length > 0 && (
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Toplam Ürün:</span>
              <span style={styles.summaryValue}>{urunler.length}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Toplam Stok:</span>
              <span style={styles.summaryValue}>
                {urunler.reduce((sum, u) => sum + (u.currentStock || 0), 0)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Kritik Stok:</span>
              <span style={{...styles.summaryValue, color: COLORS.red}}>
                {urunler.filter(u => (u.currentStock || 0) <= (u.minStock || 0)).length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── STİLLER ───────────────────────── */
const styles = {
  page: { 
    padding: 20, 
    color: COLORS.coffee,
    backgroundColor: COLORS.beige,
    minHeight: "100vh"
  },
  
  h2: { 
    fontSize: 26, 
    fontWeight: 800, 
    margin: "0 0 16px",
    color: COLORS.coffee
  },
  
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    padding: 16,
    marginBottom: 20,
  },
  
  table: { 
    width: "100%", 
    borderCollapse: "collapse" 
  },
  
  th: {
    textAlign: "left",
    borderBottom: "2px solid #e6dcc7",
    padding: "10px 6px",
    background: "#f8f1e1",
    color: COLORS.coffee,
    fontWeight: "bold"
  },
  
  td: { 
    borderBottom: "1px solid #eee3cb", 
    padding: "8px 6px",
    color: COLORS.coffee
  },
  
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d5c6aa",
    backgroundColor: "#fffaf0",
    color: COLORS.coffee,
    width: 120,
  },
  
  btn: {
    backgroundColor: COLORS.coffee,
    color: COLORS.beige,
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  
  btnIn: {
    backgroundColor: COLORS.green,
    color: "#fff",
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    opacity: 1,
    transition: "opacity 0.2s"
  },
  
  btnOut: {
    backgroundColor: COLORS.red,
    color: "#fff",
    padding: "8px 14px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    opacity: 1,
    transition: "opacity 0.2s"
  },
  
  btnDanger: {
    backgroundColor: COLORS.red,
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  
  // Özet bölümü
  summary: {
    display: "flex",
    gap: "20px",
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid #eee3cb"
  },
  
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px"
  },
  
  summaryLabel: {
    fontSize: "14px",
    color: "#777"
  },
  
  summaryValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: COLORS.coffee
  },
  
  // Mesajlar
  successMessage: {
    backgroundColor: COLORS.green,
    color: "white",
    padding: "10px 15px",
    borderRadius: "8px",
    marginBottom: "15px",
    textAlign: "center"
  },
  
  emptyMessage: {
    textAlign: "center",
    color: "#777",
    padding: "20px"
  },
  
  // Yükleniyor
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh"
  },
  
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid " + COLORS.coffee,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "15px"
  },
  
  // Hata
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh",
    textAlign: "center"
  }
};

// CSS Animasyonu
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleSheet);