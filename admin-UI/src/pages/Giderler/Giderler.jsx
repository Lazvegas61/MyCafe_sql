/* ============================================================
   📄 DOSYA: Giderler.jsx (MyCafe Anayasası v2.1 UYGULANDI)
   📌 DEĞİŞİKLİKLER:
   1. LocalStorage kullanımı KALDIRILDI
   2. Finansal hesaplamalar KALDIRILDI
   3. Backend API entegrasyonu EKLENDİ
   4. MyCafe Anayasası kurallarına uyum sağlandı
   5. UI sadece veri gösteriyor, hesaplama yapmıyor
============================================================ */

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Giderler.css";

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Giderler() {
  const [loading, setLoading] = useState(false);
  const [giderler, setGiderler] = useState([]);
  
  // Form state
  const [urunAdi, setUrunAdi] = useState("");
  const [tutar, setTutar] = useState("");
  const [miktar, setMiktar] = useState("");
  const [birim, setBirim] = useState("");
  const [not, setNot] = useState("");
  const [kategori, setKategori] = useState("");

  // Filtreler (sadece gösterim için, backend'den gelen veriyi filtreler)
  const [tarihBaslangic, setTarihBaslangic] = useState("");
  const [tarihBitis, setTarihBitis] = useState("");
  const [arama, setArama] = useState("");
  const [kategoriFiltre, setKategoriFiltre] = useState("");

  // API token'ını al
  const getAuthToken = () => {
    return localStorage.getItem("mc_token");
  };

  // API headers
  const getHeaders = () => {
    return {
      "Authorization": `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json"
    };
  };

  // -----------------------------------------
  //   API İŞLEMLERİ
  // -----------------------------------------

  // Giderleri API'den çek
  const fetchGiderler = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/reports/expenses`,
        { headers: getHeaders() }
      );
      
      if (response.data && response.data.success) {
        setGiderler(response.data.data || []);
      }
    } catch (error) {
      console.error("Giderler çekilirken hata:", error);
      alert("Giderler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Yeni gider ekle
  const handleEkle = async () => {
    if (!urunAdi || !tutar || !miktar || !birim || !kategori) {
      alert("Lütfen tüm zorunlu alanları doldurunuz!");
      return;
    }

    try {
      setLoading(true);
      
      // Gider verisi oluştur
      const giderData = {
        product_name: urunAdi,
        unit_price: parseFloat(tutar),
        quantity: parseFloat(miktar),
        unit: birim,
        notes: not,
        category: kategori,
        expense_type: "GIDER"
      };

      // API'ye gönder
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/expenses`,
        giderData,
        { headers: getHeaders() }
      );

      if (response.data && response.data.success) {
        alert("Gider başarıyla eklendi ve finansal kayıt oluşturuldu.");
        
        // Formu temizle
        setUrunAdi("");
        setTutar("");
        setMiktar("");
        setBirim("");
        setNot("");
        setKategori("");
        
        // Gider listesini yenile
        await fetchGiderler();
        
        // Global event (diğer bileşenler için)
        window.dispatchEvent(new CustomEvent("giderEklendi"));
      } else {
        throw new Error(response.data?.message || "Gider eklenemedi");
      }
    } catch (error) {
      console.error("Gider ekleme hatası:", error);
      alert(`Gider eklenemedi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // PDF raporu indir (backend'den)
  const handleExportPDF = async () => {
    try {
      // Filtre parametrelerini oluştur
      const params = new URLSearchParams();
      if (tarihBaslangic) params.append("start_date", tarihBaslangic);
      if (tarihBitis) params.append("end_date", tarihBitis);
      if (kategoriFiltre) params.append("category", kategoriFiltre);
      if (arama) params.append("search", arama);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/reports/expenses/pdf?${params.toString()}`,
        {
          headers: getHeaders(),
          responseType: 'blob'
        }
      );

      // PDF dosyasını indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `giderler_raporu_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("PDF indirme hatası:", error);
      alert("PDF raporu indirilirken bir hata oluştu.");
    }
  };

  // -----------------------------------------
  //   USE EFFECT
  // -----------------------------------------
  useEffect(() => {
    fetchGiderler();
  }, []);

  // -----------------------------------------
  //   FİLTRELEME (sadece gösterim için)
  // -----------------------------------------
  const filtrelenmisGiderler = giderler.filter((g) => {
    // Tarih filtresi
    let tarihUyum = true;
    if (tarihBaslangic) {
      const baslangic = new Date(tarihBaslangic);
      baslangic.setHours(0, 0, 0, 0);
      const giderTarih = new Date(g.created_at);
      if (giderTarih < baslangic) tarihUyum = false;
    }
    if (tarihBitis) {
      const bitis = new Date(tarihBitis);
      bitis.setHours(23, 59, 59, 999);
      const giderTarih = new Date(g.created_at);
      if (giderTarih > bitis) tarihUyum = false;
    }
    
    // Arama filtresi
    const aramaUyum = !arama || 
      (g.product_name && g.product_name.toLowerCase().includes(arama.toLowerCase())) ||
      (g.notes && g.notes.toLowerCase().includes(arama.toLowerCase())) ||
      (g.category && g.category.toLowerCase().includes(arama.toLowerCase()));
    
    // Kategori filtresi
    const kategoriUyum = !kategoriFiltre || g.category === kategoriFiltre;
    
    return tarihUyum && aramaUyum && kategoriUyum;
  });

  // -----------------------------------------
  //   FORMAT FONKSİYONLARI
  // -----------------------------------------
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR");
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("tr-TR", { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0.00 ₺";
    return `${parseFloat(amount).toFixed(2)} ₺`;
  };

  // -----------------------------------------
  //   FİLTRE TEMİZLE
  // -----------------------------------------
  const temizleFiltreler = () => {
    setTarihBaslangic("");
    setTarihBitis("");
    setArama("");
    setKategoriFiltre("");
  };

  // Kategoriler
  const kategoriler = [
    "Mutfak",
    "Temizlik",
    "Personel",
    "Kira",
    "Fatura",
    "Bakım",
    "TOPTANCI",
    "Diğer"
  ];

  return (
    <div className="giderler-container">
      {/* BAŞLIK VE ROL */}
      <div className="page-header">
        <h1>GİDERLER</h1>
        <div className="role-badge">ADMIN</div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      )}

      {/* 2 KOLONLU ANA YAPI */}
      <div className="two-column-layout">
        {/* SOL KOLON - YENİ GİDER */}
        <div className="column form-column">
          <div className="column-header">
            <h2>YENİ GİDER EKLE</h2>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label>Kategori *</label>
              <select 
                value={kategori} 
                onChange={(e) => setKategori(e.target.value)}
                className="form-input"
                disabled={loading}
              >
                <option value="">Kategori Seçin</option>
                {kategoriler.map(kat => (
                  <option key={kat} value={kat}>{kat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ürün/Hizmet Adı *</label>
              <input
                type="text"
                value={urunAdi}
                onChange={(e) => setUrunAdi(e.target.value)}
                placeholder="Örn: Su Faturası, Temizlik Malzemesi"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tutar (₺) *</label>
                <input
                  type="number"
                  value={tutar}
                  onChange={(e) => setTutar(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="form-input"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Miktar *</label>
                <input
                  type="number"
                  value={miktar}
                  onChange={(e) => setMiktar(e.target.value)}
                  placeholder="1"
                  min="1"
                  step="1"
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Birim *</label>
                <select 
                  value={birim} 
                  onChange={(e) => setBirim(e.target.value)}
                  className="form-input"
                  disabled={loading}
                >
                  <option value="">Birim Seç</option>
                  <option value="Adet">Adet</option>
                  <option value="Kg">Kg</option>
                  <option value="Gram">Gram</option>
                  <option value="Litre">Litre</option>
                  <option value="Paket">Paket</option>
                  <option value="Koli">Koli</option>
                  <option value="Ay">Ay</option>
                  <option value="Saat">Saat</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ödeme Tarihi</label>
                <input
                  type="date"
                  value={new Date().toISOString().split('T')[0]}
                  readOnly
                  className="form-input"
                  disabled
                />
              </div>
            </div>

            <div className="form-group">
              <label>Açıklama / Not</label>
              <textarea
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Ek açıklama giriniz..."
                rows="3"
                className="form-textarea"
                disabled={loading}
              />
            </div>

            <button 
              onClick={handleEkle}
              className="btn-add"
              disabled={!urunAdi || !tutar || !miktar || !birim || !kategori || loading}
            >
              {loading ? "EKleniyor..." : "+ GİDER EKLE"}
            </button>
          </div>
        </div>

        {/* SAĞ KOLON - TABLO GÖRÜNÜMÜ */}
        <div className="column report-column">
          {/* FİLTRE PANELİ */}
          <div className="filter-panel">
            <div className="filter-header">
              <h3>FİLTRELEME</h3>
              <button 
                onClick={temizleFiltreler} 
                className="btn-clear"
                disabled={loading}
              >
                Filtreleri Temizle
              </button>
            </div>
            
            <div className="filter-grid">
              <div className="filter-group">
                <label>Tarih Aralığı</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={tarihBaslangic}
                    onChange={(e) => setTarihBaslangic(e.target.value)}
                    className="filter-input"
                    placeholder="gg.aa.yyyy"
                    disabled={loading}
                  />
                  <span className="range-separator">-</span>
                  <input
                    type="date"
                    value={tarihBitis}
                    onChange={(e) => setTarihBitis(e.target.value)}
                    className="filter-input"
                    placeholder="gg.aa.yyyy"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Kategori</label>
                <select 
                  value={kategoriFiltre} 
                  onChange={(e) => setKategoriFiltre(e.target.value)}
                  className="filter-input"
                  disabled={loading}
                >
                  <option value="">Tüm Kategoriler</option>
                  {kategoriler.map(kat => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Arama</label>
                <div className="search-with-clear">
                  <input
                    type="text"
                    value={arama}
                    onChange={(e) => setArama(e.target.value)}
                    placeholder="Ürün, açıklama veya kategori ara..."
                    className="filter-input"
                    disabled={loading}
                  />
                  {arama && (
                    <button 
                      onClick={() => setArama("")}
                      className="clear-search-btn"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* İSTATİSTİK VE PDF BUTONU */}
          <div className="stats-section">
            <div className="stats-cards">
              <div className="stat-card total">
                <div className="stat-content">
                  <div className="stat-label">TOPLAM KAYIT</div>
                  <div className="stat-value">{filtrelenmisGiderler.length}</div>
                </div>
              </div>
            </div>

            {/* PDF İNDİR BUTONU */}
            <div className="pdf-button-container">
              <button 
                onClick={handleExportPDF} 
                className="btn-pdf"
                disabled={loading || filtrelenmisGiderler.length === 0}
              >
                PDF İNDİR
              </button>
            </div>
          </div>

          {/* GİDER KAYITLARI TABLOSU */}
          <div className="gider-list-header">
            <h3>GİDER KAYITLARI</h3>
            <div className="list-count">
              {filtrelenmisGiderler.length} kayıt
            </div>
          </div>

          {/* TABLO GÖRÜNÜMÜ */}
          <div className="gider-table-container">
            {filtrelenmisGiderler.length > 0 ? (
              <div className="gider-table-wrapper">
                <table className="gider-table">
                  <thead>
                    <tr>
                      <th>KATEGORİ</th>
                      <th>ÜRÜN/HİZMET ADI</th>
                      <th>TARİH</th>
                      <th>TUTAR (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrelenmisGiderler.map((g) => (
                      <tr key={g.id} className="gider-table-row">
                        <td>
                          <span className="table-kategori">{g.category || "Diğer"}</span>
                        </td>
                        <td>
                          <div className="table-urun">{g.product_name}</div>
                          {g.notes && (
                            <div className="table-not">{g.notes}</div>
                          )}
                          <div className="table-detay">
                            {g.quantity} {g.unit}
                          </div>
                        </td>
                        <td>
                          <div className="table-tarih">{formatDate(g.created_at)}</div>
                          <div className="table-saat">{formatTime(g.created_at)}</div>
                        </td>
                        <td>
                          <div className="table-tutar">{formatCurrency(g.unit_price)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-list">
                {loading ? "Yükleniyor..." : 
                 giderler.length === 0 
                  ? "Henüz gider kaydı bulunmuyor." 
                  : "Filtrelere uygun gider kaydı bulunamadı."}
              </div>
            )}
          </div>

          {/* NOT: Finansal analiz ve toplam hesaplamalar 
               artık backend tarafından yapılacak ve 
               ayrı bir rapor endpoint'inden alınacak */}
        </div>
      </div>
    </div>
  );
}