import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axiosConfig";

export default function GarsonAdisyon() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingItem, setAddingItem] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  /* -----------------------------
     YETKİ KONTROLÜ
  ----------------------------- */
  useEffect(() => {
    if (!user || user.role !== "GARSON") {
      navigate("/login");
      return;
    }
    
    loadInvoice();
    loadProducts();
  }, [id, user, navigate]);

  /* -----------------------------
     ADİSYONU YÜKLE (API)
  ----------------------------- */
  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/invoices/${id}`);
      
      if (response.data) {
        setInvoice(response.data);
        
        // Eğer kapalıysa, garson geri dönmeli
        if (response.data.status === "CLOSED") {
          alert("❌ Bu adisyon kapalı!");
          navigate("/garson");
          return;
        }
        
        // Satırları yükle
        loadLineItems(response.data.id);
      } else {
        setError("Adisyon bulunamadı");
        navigate("/garson");
      }
      
    } catch (error) {
      console.error("Adisyon yükleme hatası:", error);
      setError("Adisyon yüklenemedi");
      navigate("/garson");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     SATIRLARI YÜKLE (API)
  ----------------------------- */
  const loadLineItems = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/items`);
      setLineItems(response.data || []);
    } catch (error) {
      console.error("Satırlar yükleme hatası:", error);
    }
  };

  /* -----------------------------
     ÜRÜNLERİ YÜKLE (API)
  ----------------------------- */
  const loadProducts = async () => {
    try {
      const response = await api.get("/products/active");
      setProducts(response.data || []);
    } catch (error) {
      console.error("Ürünler yükleme hatası:", error);
    }
  };

  /* -----------------------------
     ÜRÜN EKLE (API)
  ----------------------------- */
  const handleAddProduct = async () => {
    if (!selectedProduct || quantity < 1) {
      alert("Lütfen ürün seçin ve miktar girin!");
      return;
    }
    
    try {
      setAddingItem(true);
      
      await api.post(`/invoices/${id}/items`, {
        product_id: selectedProduct,
        quantity: quantity,
        notes: ""
      });
      
      // Başarılı → listeyi yenile
      await loadLineItems(id);
      
      // Formu sıfırla
      setSelectedProduct("");
      setQuantity(1);
      
    } catch (error) {
      console.error("Ürün ekleme hatası:", error);
      alert("❌ Ürün eklenemedi!");
    } finally {
      setAddingItem(false);
    }
  };

  /* -----------------------------
     SATIR SİL (API)
  ----------------------------- */
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      return;
    }
    
    try {
      await api.delete(`/invoices/${id}/items/${itemId}`);
      
      // Başarılı → listeyi yenile
      await loadLineItems(id);
      
    } catch (error) {
      console.error("Ürün silme hatası:", error);
      alert("❌ Ürün silinemedi!");
    }
  };

  /* -----------------------------
     ADİSYONU KAPAT (ÖDEME SAYFASINA GİT)
  ----------------------------- */
  const handleCloseInvoice = () => {
    navigate(`/garson/odeme/${id}`);
  };

  /* -----------------------------
     TOPLAM HESAPLAMA (SADECE GÖSTERİM - MyCafe Anayasası Madde 3)
  ----------------------------- */
  const calculateTotal = () => {
    // NOT: Bu sadece UI'da gösterim içindir.
    // Gerçek toplam backend'den gelir (invoice.total_amount)
    if (invoice && invoice.total_amount) {
      return invoice.total_amount;
    }
    
    // Fallback: UI'da hesaplama (sadece gösterim)
    return lineItems.reduce((total, item) => {
      return total + (item.unit_price * item.quantity);
    }, 0);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Adisyon yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <div style={{ fontSize: "48px" }}>❌</div>
          <h3>{error || "Adisyon bulunamadı"}</h3>
          <button 
            onClick={() => navigate("/garson")}
            style={styles.backButton}
          >
            ← Masalara Dön
          </button>
        </div>
      </div>
    );
  }

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <button
          onClick={() => navigate("/garson")}
          style={styles.backButton}
        >
          ← Masalara Dön
        </button>
        
        <div style={styles.headerInfo}>
          <h2 style={styles.invoiceTitle}>
            🧾 Adisyon: MASA {invoice.table_number}
          </h2>
          <div style={styles.invoiceSubtitle}>
            Açılış: {new Date(invoice.created_at).toLocaleTimeString('tr-TR')} • 
            Garson: {user?.name || user?.username}
          </div>
        </div>
        
        <div style={styles.headerActions}>
          <button
            onClick={handleCloseInvoice}
            style={styles.payButton}
          >
            💳 Ödemeyi Al
          </button>
        </div>
      </div>

      {/* HIZLI ÜRÜN EKLEME */}
      <div style={styles.quickAddSection}>
        <h3 style={styles.sectionTitle}>➕ Hızlı Ürün Ekleme</h3>
        
        <div style={styles.addForm}>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={styles.productSelect}
            disabled={addingItem}
          >
            <option value="">Ürün seçin</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.price} ₺
              </option>
            ))}
          </select>
          
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={styles.quantityInput}
            disabled={addingItem}
          />
          
          <button
            onClick={handleAddProduct}
            style={styles.addButton}
            disabled={addingItem || !selectedProduct}
          >
            {addingItem ? "⏳ Ekleniyor..." : "➕ Ekle"}
          </button>
        </div>
      </div>

      {/* ÜRÜN LİSTESİ */}
      <div style={styles.itemsSection}>
        <h3 style={styles.sectionTitle}>📋 Ürün Listesi</h3>
        
        {lineItems.length === 0 ? (
          <div style={styles.emptyList}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
            <p>Henüz ürün eklenmedi</p>
            <small style={{ color: "#7f8c8d" }}>Yukarıdan ürün ekleyin</small>
          </div>
        ) : (
          <div style={styles.itemsList}>
            {lineItems.map((item, index) => (
              <div key={item.id} style={styles.itemRow}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>
                    {item.product_name || "Ürün"} 
                    {item.notes && <small style={{ color: "#7f8c8d", marginLeft: "8px" }}>({item.notes})</small>}
                  </div>
                  <div style={styles.itemDetails}>
                    {item.quantity} × {item.unit_price} ₺ = {item.quantity * item.unit_price} ₺
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  style={styles.removeButton}
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOPLAM VE ÖDEME */}
      <div style={styles.totalSection}>
        <div style={styles.totalRow}>
          <span>Ara Toplam:</span>
          <span>{calculateTotal()} ₺</span>
        </div>
        <div style={styles.totalRow}>
          <span>KDV (%{invoice.tax_rate || 18}):</span>
          <span>{((calculateTotal() * (invoice.tax_rate || 18)) / 100).toFixed(2)} ₺</span>
        </div>
        <div style={{...styles.totalRow, ...styles.grandTotal}}>
          <span>GENEL TOPLAM:</span>
          <span>{(calculateTotal() + (calculateTotal() * (invoice.tax_rate || 18)) / 100).toFixed(2)} ₺</span>
        </div>
        
        <div style={styles.totalActions}>
          <button
            onClick={handleCloseInvoice}
            style={styles.fullPayButton}
          >
            💳 ÖDEMEYİ TAMAMLA
          </button>
          
          <button
            onClick={() => window.print()}
            style={styles.printButton}
          >
            🖨️ Adisyon Yazdır
          </button>
        </div>
      </div>

      {/* BİLGİ NOTU */}
      <div style={styles.infoBox}>
        <div style={styles.infoIcon}>📝</div>
        <div style={styles.infoContent}>
          <strong>Garson Adisyon Kuralları:</strong>
          <ul style={styles.infoList}>
            <li>✅ Ürün ekleyebilir/silebilir</li>
            <li>✅ Müşteri adı ekleyebilir (isteğe bağlı)</li>
            <li>✅ Not ekleyebilir (alerji, özel istek vb.)</li>
            <li>❌ Fiyat değiştiremez (ürün fiyatları sabit)</li>
            <li>❌ İndirim yapamaz</li>
            <li>❌ Kapalı adisyonu değiştiremez</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   STYLES
----------------------------- */
const styles = {
  page: {
    padding: "24px",
    background: "linear-gradient(135deg, #f5efe6 0%, #e8dfd3 100%)",
    minHeight: "100vh",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #3498db",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    textAlign: "center",
    color: "#e74c3c",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "2px solid #d4b896",
    flexWrap: "wrap",
    gap: "16px",
  },
  backButton: {
    padding: "10px 20px",
    background: "#5a3e2b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  headerInfo: {
    flex: 1,
    minWidth: "300px",
  },
  invoiceTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#5a3e2b",
    margin: "0 0 4px 0",
  },
  invoiceSubtitle: {
    fontSize: "14px",
    color: "#8b7355",
  },
  headerActions: {
    display: "flex",
    gap: "12px",
  },
  payButton: {
    padding: "10px 20px",
    background: "#27ae60",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  quickAddSection: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#5a3e2b",
    margin: "0 0 16px 0",
  },
  addForm: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  productSelect: {
    flex: 3,
    minWidth: "200px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
  },
  quantityInput: {
    flex: 1,
    minWidth: "80px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    textAlign: "center",
  },
  addButton: {
    flex: 1,
    minWidth: "100px",
    padding: "10px",
    background: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  itemsSection: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  emptyList: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#7f8c8d",
  },
  itemsList: {
    maxHeight: "400px",
    overflowY: "auto",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #eee",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: "4px",
  },
  itemDetails: {
    fontSize: "14px",
    color: "#7f8c8d",
  },
  removeButton: {
    background: "transparent",
    border: "none",
    color: "#e74c3c",
    cursor: "pointer",
    fontSize: "16px",
    padding: "8px",
    borderRadius: "4px",
    transition: "background 0.2s",
  },
  totalSection: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    fontSize: "16px",
    color: "#2c3e50",
  },
  grandTotal: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#27ae60",
    paddingTop: "16px",
    borderTop: "2px solid #eee",
    marginTop: "8px",
  },
  totalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  fullPayButton: {
    flex: 2,
    padding: "15px",
    background: "#27ae60",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    minWidth: "200px",
  },
  printButton: {
    flex: 1,
    padding: "15px",
    background: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px",
    minWidth: "150px",
  },
  infoBox: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: "24px",
    color: "#f39c12",
  },
  infoContent: {
    flex: 1,
    color: "#5a3e2b",
  },
  infoList: {
    marginTop: "8px",
    paddingLeft: "20px",
    fontSize: "14px",
  },
};

// CSS Animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);