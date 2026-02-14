import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axiosConfig";
import "./AnaEkran.css";

// Premium renkler
const RENK = {
  zemin: "#e5cfa5",
  kart: "#f9edd7",
  kartYazi: "#4a3722",
  altin: "#f5d085",
  yesil: "#2ecc71",
  kirmizi: "#c0392b",
  griYazi: "#7f8c8d",
  bilardoMavi: "#3498db",
  bilardoYesil: "#27ae60"
};

// Yardımcı fonksiyonlar (MyCafe Anayasası'na uygun - finans hesaplama YOK)
const formatTL = (val) => Number(val || 0).toFixed(2) + " ₺";
const bugunStr = () => new Date().toISOString().split("T")[0];

// ======================================================
//                     MAIN COMPONENT
// ======================================================
const AnaEkran = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState({
    gunlukGelir: 0,
    gunlukGider: 0,
    musteriTahsilati: 0,
    netKasa: 0,
    acikAdisyonlar: [],
    gunlukGiderler: [],
    sonYenileme: new Date(),
    aktifGunId: "",
    acikAdisyonSayisi: 0,
    kapaliAdisyonSayisi: 0,
    toplamAdisyonSayisi: 0,
    bilardoAnalizi: {
      acik: 0,
      kapali: 0,
      toplam: 0,
      gelir: 0
    },
    normalAnalizi: {
      acik: 0,
      kapali: 0,
      toplam: 0,
      gelir: 0
    },
    loading: true,
    error: null
  });

  // ======================================================
  //              BACKEND API ENTEGRASYONU
  // ======================================================
  const fetchDashboardData = async () => {
    try {
      setDashboard(prev => ({ ...prev, loading: true, error: null }));
      
      // 1. Günlük özet verisi (API'den geliyor)
      const [summaryRes, openInvoicesRes, dayStatusRes] = await Promise.all([
        api.get("/reports/daily-summary"),
        api.get("/invoices/open"),
        api.get("/day/status")
      ]);
      
      const summary = summaryRes.data;
      const openInvoices = openInvoicesRes.data;
      const dayStatus = dayStatusRes.data;
      
      // 2. Açık adisyonları formatla
      const formattedOpenInvoices = openInvoices.map(invoice => ({
        id: invoice.id,
        masaNo: invoice.table_id ? `MASA ${invoice.table_id}` : "Bilardo",
        toplam: invoice.total_amount,
        acilisZamani: invoice.created_at,
        musteriAdi: invoice.customer_name,
        tip: invoice.is_billiard ? "BİLARDO" : "NORMAL",
        icon: invoice.is_billiard ? "🎱" : "🪑",
        sureTipi: invoice.billiard_duration_type
      }));
      
      // 3. Dashboard'u güncelle (API verisiyle)
      setDashboard({
        gunlukGelir: summary.daily_income || 0,
        gunlukGider: summary.daily_expense || 0,
        musteriTahsilati: summary.customer_collections || 0,
        netKasa: summary.net_cash || 0,
        acikAdisyonlar: formattedOpenInvoices,
        gunlukGiderler: summary.expenses || [],
        sonYenileme: new Date(),
        aktifGunId: dayStatus.day_id || bugunStr(),
        acikAdisyonSayisi: openInvoices.length,
        kapaliAdisyonSayisi: summary.closed_invoices_count || 0,
        toplamAdisyonSayisi: summary.total_invoices_count || 0,
        bilardoAnalizi: {
          acik: summary.billiard_open || 0,
          kapali: summary.billiard_closed || 0,
          toplam: summary.billiard_total || 0,
          gelir: summary.billiard_income || 0
        },
        normalAnalizi: {
          acik: summary.normal_open || 0,
          kapali: summary.normal_closed || 0,
          toplam: summary.normal_total || 0,
          gelir: summary.normal_income || 0
        },
        loading: false,
        error: null
      });
      
      console.log('✅ Dashboard API verisi alındı:', {
        gelir: summary.daily_income,
        acikAdisyon: openInvoices.length,
        günId: dayStatus.day_id
      });
      
    } catch (error) {
      console.error('❌ Dashboard API hatası:', error);
      setDashboard(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || "Dashboard verileri alınamadı"
      }));
    }
  };

  // ======================================================
  //                     EFFECTS
  // ======================================================
  useEffect(() => {
    // İlk yükleme
    fetchDashboardData();

    // Her 30 saniyede bir yenile
    const interval = setInterval(fetchDashboardData, 30000);

    // Event dinleyiciler (MyCafe Anayasası: UI sadece dinler, hesaplamaz)
    const handleDataChanged = () => {
      console.log('📢 Veri değişikliği algılandı, dashboard yenileniyor...');
      setTimeout(fetchDashboardData, 100);
    };

    window.addEventListener("dataChanged", handleDataChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener("dataChanged", handleDataChanged);
    };
  }, []);

  // ======================================================
  //                     RENDER
  // ======================================================
  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #f9e3b4, #e5cfa5 50%, #d3b98b)",
        minHeight: "100vh",
        padding: "38px 48px",
        boxSizing: "border-box",
      }}
    >
      {/* ÜST BAŞLIK */}
      <div
        style={{
          background: "linear-gradient(135deg, #f8e1b6, #e2b66a)",
          borderRadius: 26,
          padding: "28px 36px",
          marginBottom: 32,
          boxShadow: "0 14px 26px rgba(0,0,0,0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: "#4a3016",
              marginRight: 8,
            }}
          >
            MyCafe
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#6a4a27" }}>
             Yönetim Paneli 
          </span>
          <div style={{ fontSize: 14, color: "#7f5539", marginTop: 4 }}>
            Kullanıcı: <strong>{user?.username || "Misafir"}</strong> • Rol: <strong>{user?.role || "-"}</strong>
          </div>
        </div>
        
        {/* Son yenileme bilgisi */}
        <div style={{ fontSize: 14, color: "#7f5539" }}>
          Son yenileme: {dashboard.sonYenileme.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {/* HIZLI MENÜ */}
      <div
        style={{
          background: "linear-gradient(145deg, #f4dfc1, #f0d2a6)",
          borderRadius: 24,
          padding: "24px 26px 32px",
          marginBottom: 32,
          boxShadow: "0 12px 22px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 20, color: "#4a3016" }}>
          HIZLI MENÜ
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 22,
          }}
        >
          <QuickMenuCard key="urun-yonetimi" label="Ürün Yönetimi" icon="📦" onClick={() => navigate("/urun-stok")} />
          <QuickMenuCard key="raporlar" label="Raporlar" icon="📊" onClick={() => navigate("/raporlar")} />
          <QuickMenuCard key="stok-yonetimi" label="Stok Yönetimi" icon="📈" onClick={() => navigate("/urun-stok")} />
          <QuickMenuCard key="masalar" label="Masalar" icon="🪑" onClick={() => navigate("/masalar")} />
          <QuickMenuCard key="bilardo" label="Bilardo" icon="🎱" onClick={() => navigate("/bilardo")} />
        </div>
      </div>

      {/* GÜNLÜK FİNANS ÖZETİ (API'DEN GELİYOR) */}
      <div
        style={{
          background: "linear-gradient(145deg, #f4dfc1, #f0d2a6)",
          borderRadius: 24,
          padding: "24px 26px",
          marginBottom: 32,
          boxShadow: "0 12px 22px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 20, color: "#4a3016" }}>
          GÜNLÜK FİNANS ÖZETİ
          <div style={{ fontSize: 14, color: "#7f5539", fontWeight: 400, marginTop: 4 }}>
            Gün ID: <strong>{dashboard.aktifGunId}</strong> • 
            {dashboard.aktifGunId ? ' Gün Aktif' : ' Gün Başlatılmamış'}
          </div>
        </div>

        {dashboard.loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#7f5539" }}>
            Finans verileri yükleniyor...
          </div>
        ) : dashboard.error ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#c0392b" }}>
            ❌ Hata: {dashboard.error}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            <SummaryCard 
              key="gunluk-gelir"
              title="Adisyon Gelirleri" 
              value={formatTL(dashboard.gunlukGelir)}
              subtitle={`${dashboard.kapaliAdisyonSayisi} kapalı adisyon`}
              color="#27ae60"
              icon="💰"
            />
            <SummaryCard 
              key="musteri-tahsilati"
              title="Müşteri Tahsilatı"
              value={formatTL(dashboard.musteriTahsilati)}
              subtitle="Müşteri işlemlerinden"
              color="#2ecc71"
              icon="💳"
            />
            <SummaryCard 
              key="giderler"
              title="Giderler"
              value={formatTL(dashboard.gunlukGider)}
              subtitle={`${dashboard.gunlukGiderler.length} gider`}
              color="#c0392b"
              icon="📉"
            />
            <SummaryCard 
              key="net-kasa"
              title="Net Kasa" 
              value={formatTL(dashboard.netKasa)}
              subtitle={dashboard.netKasa >= 0 ? "Kârlı" : "Zarar"}
              color={dashboard.netKasa >= 0 ? "#27ae60" : "#c0392b"}
              icon={dashboard.netKasa >= 0 ? "📈" : "📉"}
            />
          </div>
        )}
      </div>

      {/* AÇIK ADİSYONLAR (API'DEN GELİYOR) */}
      <div
        style={{
          backgroundColor: RENK.kart,
          borderRadius: 26,
          padding: "28px",
          boxShadow: "0 14px 24px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 18,
            color: "#4a3016",
          }}
        >
          AÇIK ADİSYONLAR (Normal + Bilardo)
          <span style={{ fontSize: 14, marginLeft: 8, color: RENK.griYazi }}>
            ({dashboard.acikAdisyonlar.length} adet)
          </span>
        </div>

        {dashboard.loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#7f5539" }}>
            Açık adisyonlar yükleniyor...
          </div>
        ) : (
          <>
            <div
              style={{
                backgroundColor: "#f5e6cf",
                borderRadius: 18,
                padding: "16px",
                maxHeight: 400,
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px"
              }}
            >
              {dashboard.acikAdisyonlar.length === 0 ? (
                <div
                  key="no-adisyon"
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    color: RENK.griYazi,
                    gridColumn: "1 / -1"
                  }}
                >
                  {dashboard.aktifGunId ? 
                    'Açık adisyon yok. Masalar veya Bilardo sayfasından yeni adisyon açabilirsiniz.' : 
                    'Gün başlatılmamış. Önce günü başlatın.'
                  }
                </div>
              ) : (
                // İlk açılan → son açılan sıralama
                [...dashboard.acikAdisyonlar]
                  .sort((a, b) => new Date(a.acilisZamani || 0) - new Date(b.acilisZamani || 0))
                  .map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "12px 16px",
                        background: a.tip === "BİLARDO" ? "#e3f2fd" : "#fff3dc",
                        borderRadius: 14,
                        fontWeight: 700,
                        color: "#4a3016",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        borderLeft: `4px solid ${a.tip === "BİLARDO" ? RENK.bilardoMavi : "#f5d085"}`,
                        minHeight: "80px"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onClick={() => {
                        if (a.tip === "BİLARDO") {
                          navigate(`/bilardo/adisyon/${a.id}`);
                        } else {
                          navigate(`/adisyon/${a.id}`);
                        }
                      }}
                      title={`${a.tip === "BİLARDO" ? "Bilardo adisyonu" : "Normal adisyon"} - Tıklayarak detaya git`}
                    >
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        fontSize: "16px",
                        marginBottom: "8px"
                      }}>
                        <div style={{
                          fontSize: "20px",
                          color: a.tip === "BİLARDO" ? RENK.bilardoMavi : "#f5d085"
                        }}>
                          {a.icon}
                        </div>
                        <div>
                          {a.masaNo}
                        </div>
                      </div>
                      
                      <div style={{ 
                        fontSize: "18px", 
                        fontWeight: 800, 
                        color: a.tip === "BİLARDO" ? RENK.bilardoMavi : RENK.altin 
                      }}>
                        {formatTL(a.toplam)}
                      </div>
                    </div>
                  ))
              )}
            </div>
            
            {dashboard.aktifGunId && dashboard.acikAdisyonlar.length > 0 && (
              <div key="adisyon-info" style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "#7f5539",
                textAlign: "center",
                fontStyle: "italic",
                display: "flex",
                justifyContent: "center",
                gap: "20px"
              }}>
                <span>💡 Tıklayarak adisyon detayına gidebilirsiniz</span>
                <span>•</span>
                <span>🎱 Mavi: Bilardo • 🪑 Sarı: Normal masa</span>
              </div>
            )}
            
            {dashboard.aktifGunId && dashboard.acikAdisyonlar.length === 0 && (
              <div key="no-adisyon-buttons" style={{
                marginTop: "15px",
                display: "flex",
                gap: "10px",
                justifyContent: "center"
              }}>
                <button
                  onClick={() => navigate("/masalar")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #f5d085, #e2b66a)",
                    color: "#5a3921",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  🪑 Masalar Sayfası
                </button>
                <button
                  onClick={() => navigate("/bilardo")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #3498db, #2980b9)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  🎱 Bilardo Sayfası
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------
// ALT BİLEŞENLER (Değişmedi)
// ------------------------------------------------------
const QuickMenuCard = ({ label, icon, onClick }) => (
  <button
    onClick={onClick}
    style={{
      backgroundColor: "#fdf5ea",
      borderRadius: 24,
      padding: "22px",
      fontSize: 18,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      border: "none",
      cursor: "pointer",
      boxShadow: "0 10px 18px rgba(0,0,0,0.22)",
      color: "#4a3016",
      fontWeight: 700,
      transition: "all 0.3s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 14px 24px rgba(0,0,0,0.3)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 10px 18px rgba(0,0,0,0.22)";
    }}
  >
    <div style={{ fontSize: 42 }}>{icon}</div>
    <div>{label}</div>
  </button>
);

const SummaryCard = ({ title, value, subtitle, color = "#4a3016", icon }) => (
  <div
    style={{
      backgroundColor: "#fdf5ea",
      borderRadius: 18,
      padding: "18px 20px",
      boxShadow: "0 10px 18px rgba(0,0,0,0.22)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "all 0.3s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 12px 20px rgba(0,0,0,0.25)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 10px 18px rgba(0,0,0,0.22)";
    }}
  >
    <div style={{ fontSize: 16, fontWeight: 700, color: "#4a3016", display: "flex", alignItems: "center", gap: "8px" }}>
      {icon && <span>{icon}</span>}
      <span>{title}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
    {subtitle && (
      <div style={{ fontSize: 12, color: "#7f8c8d", fontStyle: "italic" }}>
        {subtitle}
      </div>
    )}
  </div>
);

export default AnaEkran;