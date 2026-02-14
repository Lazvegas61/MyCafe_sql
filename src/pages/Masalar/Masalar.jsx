import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axiosConfig";

// MyCafe Premium Tema Renkleri
const RENK = {
  arka: "#e5cfa5",
  kart: "#4a3722",
  kartYazi: "#ffffff",
  altin: "#f5d085",
  yesil: "#2ecc71",      // BOŞ masa için
  kirmizi: "#c0392b",    // DOLU masa için
  turuncu: "#e67e22",
};

// --------------------------------------------------
// UTILITY FUNCTIONS (SADECE FORMATLAMA)
// --------------------------------------------------
const formatSure = (dakika) => {
  if (!dakika || dakika <= 0) return "0 dk";
  const h = Math.floor(dakika / 60);
  const m = dakika % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  return `${m} dk`;
};

const formatTime = (dateString) => {
  try {
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return "--:--";
  }
};

// --------------------------------------------------
// MAIN COMPONENT - MYCAFE ANAYASASI UYUMLU
// --------------------------------------------------
export default function Masalar({ onOpenAdisyon }) {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  
  // STATE - SADECE GÖSTERİM İÇİN
  const [masalar, setMasalar] = useState([]);
  const [masaDurumlari, setMasaDurumlari] = useState({});
  const [gunDurumu, setGunDurumu] = useState({ aktif: false, gunId: null });
  const [seciliMasa, setSeciliMasa] = useState(null);
  const [silMasaNo, setSilMasaNo] = useState("");
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // API ENTEGRASYONU - MYCAFE KURALLARI
  // --------------------------------------------------
  const loadGunDurumu = useCallback(async () => {
    try {
      const response = await api.get("/day/status");
      setGunDurumu(response.data);
    } catch (error) {
      console.error("[MyCafe] Gün durumu yüklenemedi:", error);
    }
  }, []);

  const loadMasalar = useCallback(async () => {
    if (!hasPermission("tables_view")) return;
    
    try {
      setLoading(true);
      const response = await api.get("/tables");
      
      // API'den gelen veriyi formatla (UI sadece formatlar)
      const formattedMasalar = response.data.map(table => ({
        id: table.table_id,
        no: table.table_number.toString(),
        name: table.table_name || `Masa ${table.table_number}`,
        capacity: table.capacity || 4,
        status: table.status || "available"
      }));
      
      setMasalar(formattedMasalar);
    } catch (error) {
      console.error("[MyCafe] Masalar yüklenemedi:", error);
      setMasalar([]);
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  const loadMasaDurumlari = useCallback(async () => {
    if (!hasPermission("invoices_view")) return;
    
    try {
      const response = await api.get("/invoices/open");
      const durumlar = {};
      
      // API'den gelen açık adisyonları işle
      response.data.forEach(invoice => {
        if (invoice.table_id) {
          durumlar[invoice.table_id] = {
            acik: true,
            adisyonId: invoice.invoice_id,
            toplam: invoice.total_amount, // ⚠️ Backend'den gelen toplam
            acilisZamani: invoice.created_at,
            musteriAdi: invoice.customer_name || null,
            gecenSure: invoice.elapsed_minutes || 0
          };
        }
      });
      
      setMasaDurumlari(durumlar);
    } catch (error) {
      console.error("[MyCafe] Masa durumları yüklenemedi:", error);
      setMasaDurumlari({});
    }
  }, [hasPermission]);

  const handleAddMasa = useCallback(async () => {
    if (!gunDurumu.aktif) {
      alert('❌ Gün başlatılmamış! Günü başlatmak için sidebar\'daki "Gün Başlat" butonunu kullanın.');
      return;
    }
    
    if (!hasPermission("tables_manage")) {
      alert('❌ Yetkiniz yok!');
      return;
    }
    
    try {
      // Masa numarasını backend'den al (UI hesaplamaz)
      const response = await api.post("/tables", {
        table_name: `Yeni Masa`,
        capacity: 4
      });
      
      if (response.data.success) {
        loadMasalar(); // API'den yeniden yükle
        alert('✅ Masa başarıyla eklendi');
      }
    } catch (error) {
      console.error("[MyCafe] Masa eklenemedi:", error);
      alert('❌ Masa eklenemedi: ' + (error.response?.data?.detail || error.message));
    }
  }, [gunDurumu.aktif, hasPermission, loadMasalar]);

  const handleDeleteMasa = useCallback(async () => {
    const trimmed = silMasaNo.trim();
    if (!trimmed) return;
    
    if (!hasPermission("tables_manage")) {
      alert('❌ Yetkiniz yok!');
      return;
    }
    
    try {
      // Önce masanın durumunu kontrol et
      const masa = masalar.find(m => m.no === trimmed);
      if (!masa) {
        alert("❌ Bu numarada bir masa yok.");
        return;
      }
      
      // Masa durumunu API'den kontrol et
      if (masaDurumlari[masa.id]?.acik) {
        alert("❌ Açık adisyonu olan masayı silemezsiniz.");
        return;
      }
      
      const response = await api.delete(`/tables/${masa.id}`);
      
      if (response.data.success) {
        loadMasalar(); // API'den yeniden yükle
        setSilMasaNo("");
        
        if (seciliMasa === trimmed) {
          setSeciliMasa(null);
        }
        
        alert('✅ Masa başarıyla silindi');
      }
    } catch (error) {
      console.error("[MyCafe] Masa silinemedi:", error);
      alert('❌ Masa silinemedi: ' + (error.response?.data?.detail || error.message));
    }
  }, [silMasaNo, masalar, masaDurumlari, seciliMasa, hasPermission, loadMasalar]);

  const handleMasaTasi = useCallback(async (sourceMasaId, targetMasaId) => {
    if (!hasPermission("invoices_manage")) {
      alert('❌ Yetkiniz yok!');
      return;
    }
    
    try {
      const response = await api.post("/invoices/transfer", {
        source_table_id: sourceMasaId,
        target_table_id: targetMasaId
      });
      
      if (response.data.success) {
        loadMasaDurumlari(); // API'den yeniden yükle
        alert('✅ Masa başarıyla taşındı');
        return true;
      }
    } catch (error) {
      console.error("[MyCafe] Masa taşınamadı:", error);
      alert('❌ Masa taşınamadı: ' + (error.response?.data?.detail || error.message));
      return false;
    }
  }, [hasPermission, loadMasaDurumlari]);

  const handleMasaAc = useCallback(async (masa) => {
    if (!gunDurumu.aktif) {
      alert('❌ Gün başlatılmamış!');
      return;
    }
    
    if (!hasPermission("invoices_create")) {
      alert('❌ Yetkiniz yok!');
      return;
    }
    
    try {
      const response = await api.post("/invoices", {
        table_id: masa.id,
        customer_name: null
      });
      
      if (response.data.invoice_id) {
        const adisyonId = response.data.invoice_id;
        
        if (typeof onOpenAdisyon === "function") {
          onOpenAdisyon({ masaId: masa.no, adisyonId });
        } else {
          navigate(`/adisyon/${adisyonId}`);
        }
        
        loadMasaDurumlari(); // Durumu güncelle
      }
    } catch (error) {
      console.error("[MyCafe] Adisyon açılamadı:", error);
      alert('❌ Adisyon açılamadı: ' + (error.response?.data?.detail || error.message));
    }
  }, [gunDurumu.aktif, hasPermission, navigate, onOpenAdisyon, loadMasaDurumlari]);

  // --------------------------------------------------
  // DATA LOADING - MYCAFE KURALLARI
  // --------------------------------------------------
  useEffect(() => {
    if (!user) return;
    
    const loadAllData = async () => {
      await loadGunDurumu();
      await loadMasalar();
      await loadMasaDurumlari();
    };
    
    loadAllData();
    
    // Real-time updates için WebSocket veya polling
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadMasaDurumlari();
      }
    }, 10000); // 10 saniyede bir güncelle
    
    return () => clearInterval(interval);
  }, [user, loadGunDurumu, loadMasalar, loadMasaDurumlari]);

  // --------------------------------------------------
  // DRAG & DROP - API ENTEGRASYONLU
  // --------------------------------------------------
  const handleDragStart = useCallback((e, masa) => {
    const durum = masaDurumlari[masa.id];
    if (!durum?.acik) return;
    
    e.dataTransfer.setData('text/plain', masa.id);
    e.dataTransfer.setData('masa-no', masa.no);
  }, [masaDurumlari]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e, targetMasa) => {
    e.preventDefault();
    
    const sourceMasaId = e.dataTransfer.getData('text/plain');
    const sourceMasaNo = e.dataTransfer.getData('masa-no');
    
    if (!sourceMasaId || sourceMasaId === targetMasa.id) return;
    
    const sourceDurum = masaDurumlari[sourceMasaId];
    const targetDurum = masaDurumlari[targetMasa.id];
    
    if (!sourceDurum?.acik) {
      alert("❌ Kaynak masada taşınacak açık adisyon yok.");
      return;
    }
    
    if (targetDurum?.acik) {
      alert("❌ Hedef masada zaten açık adisyon var.");
      return;
    }
    
    const confirmed = window.confirm(
      `Masa ${sourceMasaNo}'daki adisyonu Masa ${targetMasa.no}'a taşımak istediğinize emin misiniz?\n\nTutar: ₺ ${sourceDurum.toplam.toFixed(2)}`
    );
    
    if (!confirmed) return;
    
    const success = await handleMasaTasi(sourceMasaId, targetMasa.id);
    
    if (success) {
      setSeciliMasa(targetMasa.no);
    }
  }, [masaDurumlari, handleMasaTasi]);

  // --------------------------------------------------
  // RENDER HESAPLAMALARI - SADECE GÖSTERİM
  // --------------------------------------------------
  const { aktifMasaSayisi, bosMasaSayisi } = useMemo(() => {
    const aktif = Object.values(masaDurumlari).filter(d => d.acik).length;
    const bos = masalar.length - aktif;
    return { aktifMasaSayisi: aktif, bosMasaSayisi: bos };
  }, [masalar.length, masaDurumlari]);

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  if (!hasPermission("tables_view")) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#7f8c8d" }}>
        <h2>❌ Yetkiniz Yok</h2>
        <p>Masaları görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: RENK.arka,
        minHeight: "100vh",
        padding: "26px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 900,
              color: "#3a2a14",
              margin: 0,
              marginBottom: "5px",
            }}
          >
            Masalar
          </h1>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            color: gunDurumu.aktif ? "#27ae60" : "#e74c3c",
            fontWeight: 600,
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: gunDurumu.aktif ? "#2ecc71" : "#e74c3c",
            }}></div>
            <span>{gunDurumu.aktif ? 'Gün Aktif' : 'Gün Başlatılmamış'}</span>
            <span style={{ color: "#7f8c8d" }}>•</span>
            <span style={{ color: "#7f8c8d", fontWeight: 500 }}>Gün ID: {gunDurumu.gunId?.substring(0, 8) || 'Yok'}</span>
          </div>
        </div>

        {/* ACTION BUTTONS - ROL BAZLI */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {hasPermission("tables_manage") && (
            <button
              onClick={handleAddMasa}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "none",
                background: "linear-gradient(135deg, rgba(245,208,133,0.95), rgba(228,184,110,0.9))",
                color: "#3a260f",
                fontWeight: 800,
                fontSize: "14px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                minWidth: "120px",
                transition: "transform 0.2s",
                opacity: gunDurumu.aktif ? 1 : 0.5,
                cursor: gunDurumu.aktif ? "pointer" : "not-allowed",
              }}
              disabled={!gunDurumu.aktif}
              title={!gunDurumu.aktif ? "Gün başlatılmamış" : "Yeni masa ekle"}
            >
              + Masa Ekle
            </button>
          )}

          {hasPermission("tables_manage") && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(74,55,34,0.15)",
                padding: "6px 10px",
                borderRadius: "999px",
                opacity: gunDurumu.aktif ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600 }}>Masa Sil:</span>
              <input
                type="text"
                placeholder="No"
                value={silMasaNo}
                onChange={(e) => setSilMasaNo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDeleteMasa()}
                style={{
                  width: "56px",
                  padding: "4px 6px",
                  borderRadius: "999px",
                  border: "1px solid #b89a6a",
                  outline: "none",
                  fontSize: "13px",
                  textAlign: "center",
                  fontWeight: 600,
                  background: gunDurumu.aktif ? "#fff" : "#f5f5f5",
                }}
                disabled={!gunDurumu.aktif}
              />
              <button
                onClick={handleDeleteMasa}
                style={{
                  padding: "6px 10px",
                  borderRadius: "999px",
                  border: "none",
                  background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "13px",
                  transition: "opacity 0.2s",
                  opacity: gunDurumu.aktif ? 1 : 0.5,
                }}
                disabled={!gunDurumu.aktif}
              >
                Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GÜN BİLGİSİ UYARISI */}
      {!gunDurumu.aktif && (
        <div style={{
          background: "rgba(231, 76, 60, 0.1)",
          padding: "12px 18px",
          borderRadius: "12px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: "1px solid #e74c3c",
        }}>
          <div style={{ fontSize: "24px", color: "#e74c3c" }}>ℹ️</div>
          <div>
            <div style={{ fontWeight: 700, color: "#e74c3c" }}>Gün başlatılmamış</div>
            <div style={{ fontSize: "14px", color: "#636e72" }}>
              Masaları kullanmak için önce günü başlatın. Gün başlatma işlemi için sidebar'daki "Gün Başlat" butonunu kullanın.
            </div>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#7f8c8d" }}>
          <div style={{ fontSize: "24px", marginBottom: "20px" }}>⏳</div>
          <div>Masalar yükleniyor...</div>
        </div>
      ) : masalar.length === 0 ? (
        <div
          style={{
            fontSize: "16px",
            color: "#7f8c8d",
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255,255,255,0.3)",
            borderRadius: "20px",
            marginBottom: "30px",
          }}
        >
          {gunDurumu.aktif ? 
            'Henüz masa yok. Masa ekleme yetkiniz varsa "+ Masa Ekle" butonunu kullanın.' :
            'Gün başlatılmamış. Masaları kullanmak için sidebar\'dan günü başlatın.'
          }
        </div>
      ) : (
        <>
          {/* DURUM BİLGİSİ */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            padding: "10px 15px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "12px",
            fontSize: "14px",
          }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "#3a2a14" }}>Toplam Masa:</span>
                <span style={{ marginLeft: "5px", fontWeight: 700 }}>{masalar.length}</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#3a2a14" }}>Açık Masa:</span>
                <span style={{ marginLeft: "5px", fontWeight: 700, color: RENK.kirmizi }}>
                  {aktifMasaSayisi}
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#3a2a14" }}>Boş Masa:</span>
                <span style={{ marginLeft: "5px", fontWeight: 700, color: RENK.yesil }}>
                  {bosMasaSayisi}
                </span>
              </div>
            </div>
            
            {hasPermission("invoices_manage") && gunDurumu.aktif && (
              <div style={{ 
                fontSize: "12px", 
                color: "#7f8c8d",
                fontStyle: "italic" 
              }}>
                📍 Dolu masaları sürükleyerek taşıyabilirsiniz
              </div>
            )}
          </div>

          {/* TABLE GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
            }}
          >
            {masalar.map((masa) => {
              const durum = masaDurumlari[masa.id];
              const acik = durum?.acik || false;
              const isSelected = seciliMasa === masa.no;
              
              const masaRengi = acik ? RENK.kirmizi : RENK.yesil;
              const draggable = acik && gunDurumu.aktif && hasPermission("invoices_manage");
              
              return (
                <div
                  key={`masa-${masa.id}`}
                  draggable={draggable}
                  onDragStart={(e) => handleDragStart(e, masa)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, masa)}
                  onClick={() => setSeciliMasa(masa.no)}
                  onDoubleClick={() => handleMasaAc(masa)}
                  style={{
                    background: masaRengi,
                    color: "#ffffff",
                    borderRadius: "16px",
                    height: "140px",
                    padding: "20px 16px",
                    cursor: gunDurumu.aktif ? "pointer" : "not-allowed",
                    textAlign: "center",
                    boxShadow: isSelected
                      ? `0 0 0 3px ${RENK.altin}, 0 8px 16px rgba(0,0,0,0.3)`
                      : "0 6px 12px rgba(0,0,0,0.2)",
                    transition: "all 0.15s ease",
                    position: "relative",
                    overflow: "hidden",
                    opacity: gunDurumu.aktif ? 1 : 0.7,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {/* MASA NUMARASI */}
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: 900,
                      color: "#ffffff",
                      textShadow: "0 3px 6px rgba(0,0,0,0.4)",
                      lineHeight: 1,
                      marginTop: "5px",
                    }}
                  >
                    {masa.no}
                  </div>

                  {/* MASA DURUMU */}
                  <div style={{ width: "100%" }}>
                    {acik ? (
                      <>
                        <div style={{ 
                          fontSize: "22px", 
                          fontWeight: 800,
                          color: "#ffffff",
                          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          marginBottom: "4px",
                        }}>
                          ₺ {(durum.toplam || 0).toFixed(2)}
                        </div>
                        
                        <div style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.9)",
                          background: "rgba(0,0,0,0.2)",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          display: "inline-block",
                        }}>
                          {formatTime(durum.acilisZamani)}
                        </div>
                        
                        {draggable && (
                          <div style={{
                            fontSize: "10px",
                            opacity: 0.8,
                            marginTop: "8px",
                            color: "rgba(255,255,255,0.8)",
                          }}>
                            📍 Sürükle
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ 
                        fontSize: "24px", 
                        fontWeight: 700, 
                        opacity: 0.9,
                        color: "rgba(255,255,255,0.9)",
                      }}>
                        BOŞ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {/* FOOTER INFO */}
      <div
        style={{
          marginTop: "30px",
          fontSize: "13px",
          color: "#7f8c8d",
          textAlign: "center",
          padding: "10px",
          borderTop: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div>
          Toplam {masalar.length} masa • 
          <span style={{ color: RENK.kirmizi, fontWeight: 600 }}> {aktifMasaSayisi} DOLU</span> • 
          <span style={{ color: RENK.yesil, fontWeight: 600 }}> {bosMasaSayisi} BOŞ</span>
        </div>
        <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.7 }}>
          {gunDurumu.aktif ? 
            'Anlık güncelleme aktif • Çift tıklayarak adisyon açabilirsiniz' :
            'Gün başlatılmadan işlem yapılamaz • Gün başlatmak için sidebar\'ı kullanın'
          }
        </div>
      </div>
    </div>
  );
}