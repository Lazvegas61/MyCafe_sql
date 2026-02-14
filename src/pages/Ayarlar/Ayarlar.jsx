import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axiosConfig";
import "./Ayarlar.css";

export default function Ayarlar() {
  const { user } = useAuth();
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // SİSTEM AYARLARI STATE
  const [systemSettings, setSystemSettings] = useState({
    cafe_name: "MyCafe Bilardo & Kafe",
    working_hours: "09:00 - 02:00",
    currency: "TRY",
    tax_rate: 18,
    printer_ip: "",
    printer_port: 9100
  });

  // BİLARDO TARİFESİ STATE (API'den gelecek)
  const [billiardRates, setBilliardRates] = useState({
    rate_30min: 80,
    rate_60min: 120,
    rate_per_minute: 2
  });

  // POPUP AYARLARI
  const [notificationSettings, setNotificationSettings] = useState({
    time_notifications: true,
    auto_close_popup: 30,
    sound_notifications: false
  });

  // ======================================================
  //              API ENTEGRASYON FONKSİYONLARI
  // ======================================================

  // Sistem ayarlarını yükle
  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/settings/system");
      if (response.data) {
        setSystemSettings(response.data);
      }
    } catch (error) {
      console.error("Sistem ayarları yükleme hatası:", error);
      setError("Sistem ayarları yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Bilardo tarifesini yükle
  const loadBilliardRates = async () => {
    try {
      setLoading(true);
      const response = await api.get("/settings/billiard-rates");
      if (response.data) {
        setBilliardRates(response.data);
      }
    } catch (error) {
      console.error("Bilardo tarifesi yükleme hatası:", error);
      setError("Bilardo tarifesi yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Sistem ayarlarını kaydet
  const saveSystemSettings = async () => {
    try {
      setLoading(true);
      await api.put("/settings/system", systemSettings);
      alert("✅ Sistem ayarları kaydedildi!");
    } catch (error) {
      console.error("Sistem ayarları kaydetme hatası:", error);
      alert("❌ Sistem ayarları kaydedilemedi!");
    } finally {
      setLoading(false);
    }
  };

  // Bilardo tarifesini kaydet
  const saveBilliardRates = async () => {
    try {
      setLoading(true);
      await api.put("/settings/billiard-rates", billiardRates);
      alert("✅ Bilardo tarifesi kaydedildi!");
    } catch (error) {
      console.error("Bilardo tarifesi kaydetme hatası:", error);
      alert("❌ Bilardo tarifesi kaydedilemedi!");
    } finally {
      setLoading(false);
    }
  };

  // Popup ayarlarını kaydet
  const saveNotificationSettings = async () => {
    try {
      setLoading(true);
      await api.put("/settings/notifications", notificationSettings);
      alert("✅ Bildirim ayarları kaydedildi!");
    } catch (error) {
      console.error("Bildirim ayarları kaydetme hatası:", error);
      alert("❌ Bildirim ayarları kaydedilemedi!");
    } finally {
      setLoading(false);
    }
  };

  // VERİ YEDEKLEME (API üzerinden)
  const handleBackup = async () => {
    try {
      setLoading(true);
      
      // API'den yedek oluştur
      const response = await api.get("/backup/create", {
        responseType: 'blob'
      });
      
      // Dosyayı indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `mycafe_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert("✅ Veri yedeği başarıyla indirildi!");
      
    } catch (error) {
      console.error("Yedekleme hatası:", error);
      alert("❌ Yedekleme başarısız!");
    } finally {
      setLoading(false);
    }
  };

  // VERİ GERİ YÜKLEME (Admin için)
  const handleRestore = async (event) => {
    if (!user || user.role !== "ADMIN") {
      alert("❌ Bu işlem için yönetici yetkisi gereklidir!");
      return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    // Onay al
    if (!window.confirm("⚠️ DİKKAT: Tüm veriler bu yedekle değiştirilecek!\n\nGeri yüklemek istediğinize emin misiniz?")) {
      event.target.value = '';
      return;
    }
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('backup_file', file);
      
      await api.post("/backup/restore", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert("✅ Veri geri yükleme başarılı!\n\nSistem yeniden başlatılacak.");
      
      // Sayfayı yenile
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Geri yükleme hatası:", error);
      alert("❌ Geri yükleme başarısız!");
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  // SİSTEMİ SIFIRLA (Super Admin için)
  const resetSystem = async () => {
    if (!user || user.role !== "__SYS") {
      alert("❌ Bu işlem sadece Super Admin tarafından yapılabilir!");
      return;
    }
    
    if (!window.confirm("⚡ DİKKAT: TÜM VERİLER SİLİNECEK!\n\nDemo moduna geçilecek. Emin misiniz?")) {
      return;
    }
    
    try {
      setLoading(true);
      await api.post("/system/reset-to-demo");
      alert("✅ Sistem demo moduna sıfırlandı!");
      window.location.reload();
    } catch (error) {
      console.error("Sistem sıfırlama hatası:", error);
      alert("❌ Sistem sıfırlanamadı!");
    } finally {
      setLoading(false);
    }
  };

  // EFFECT: İlk yüklemede ayarları getir
  useEffect(() => {
    if (panel === "genel") {
      loadSystemSettings();
    } else if (panel === "bilardo_ucret") {
      loadBilliardRates();
    }
  }, [panel]);

  // ======================================================
  //              RENDER
  // ======================================================

  const tabs = [
    { id: "genel", label: "🌐 Genel Ayarlar", icon: "⚙️" },
    { id: "bilardo_ucret", label: "🎱 Bilardo Tarifesi", icon: "💰" },
    { id: "popup_ayarlari", label: "🔔 Bildirimler", icon: "🔔" },
    { id: "yedek", label: "💾 Yedek & Kurtarma", icon: "💾" },
  ];

  // Super Admin için ek tab
  if (user?.role === "__SYS") {
    tabs.push({ id: "sistem", label: "⚡ Sistem Yönetimi", icon: "⚡" });
  }

  return (
    <div className="ayarlar-sayfa">
      <h1 className="sayfa-baslik">⚙️ Sistem Ayarları</h1>
      
      {error && (
        <div className="error-message" style={{
          background: "#f8d7da",
          color: "#721c24",
          padding: "10px",
          borderRadius: "5px",
          marginBottom: "20px"
        }}>
          ❌ {error}
        </div>
      )}

      {/* TAB MENÜ */}
      <div className="tab-menu">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={panel === tab.id ? "active" : ""}
            onClick={() => setPanel(tab.id)}
            disabled={loading}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* GENEL AYARLAR PANELİ */}
      {panel === "genel" && (
        <div className="ayar-kutu">
          <h2>🌐 Genel Sistem Ayarları</h2>
          
          <div className="uyari-kutu">
            <div className="uyari-icon">ℹ️</div>
            <div className="uyari-icerik">
              <h3>Sistem Bilgisi</h3>
              <p>MyCafe Restaurant Management System v3.0</p>
              <p>SQL Backend: PostgreSQL 17.7</p>
              <p>Kullanıcı: <strong>{user?.username}</strong> • Rol: <strong>{user?.role}</strong></p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              Ayarlar yükleniyor...
            </div>
          ) : (
            <>
              <div className="input-grup">
                <label>Kafe Adı</label>
                <input 
                  type="text" 
                  placeholder="Kafe adınızı girin"
                  value={systemSettings.cafe_name}
                  onChange={(e) => setSystemSettings({...systemSettings, cafe_name: e.target.value})}
                />
              </div>

              <div className="input-grup">
                <label>Çalışma Saatleri</label>
                <input 
                  type="text" 
                  placeholder="09:00 - 02:00"
                  value={systemSettings.working_hours}
                  onChange={(e) => setSystemSettings({...systemSettings, working_hours: e.target.value})}
                />
              </div>

              <div className="input-grup">
                <label>KDV Oranı (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={systemSettings.tax_rate}
                  onChange={(e) => setSystemSettings({...systemSettings, tax_rate: Number(e.target.value)})}
                />
              </div>

              <button 
                onClick={saveSystemSettings} 
                className="kaydet-button"
                disabled={loading}
              >
                {loading ? "⏳ Kaydediliyor..." : "💾 Genel Ayarları Kaydet"}
              </button>
            </>
          )}
        </div>
      )}

      {/* BİLARDO TARİFESİ PANELİ */}
      {panel === "bilardo_ucret" && (
        <div className="ayar-kutu">
          <h2>🎱 Bilardo Ücret Tarifesi</h2>
          
          <div className="uyari-kutu">
            <div className="uyari-icon">💡</div>
            <div className="uyari-icerik">
              <h3>Ücret Kuralları (MyCafe Anayasası)</h3>
              <p><strong>Ödeme anında:</strong> Ücretler SQL fonksiyonu ile hesaplanır</p>
              <p><strong>Snapshot:</strong> Geçmiş tarifeler değişmez</p>
              <p><strong>Bilardo:</strong> Ayrı bir modül olarak yönetilir</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              Tarife bilgileri yükleniyor...
            </div>
          ) : (
            <>
              <div className="row" style={{ display: 'flex', flexWrap: 'wrap', margin: '-10px' }}>
                <div className="input-grup" style={{ flex: '1 0 300px', padding: '10px' }}>
                  <label>30 Dakika Ücreti (₺)</label>
                  <input
                    type="number"
                    value={billiardRates.rate_30min}
                    onChange={(e) => setBilliardRates({...billiardRates, rate_30min: Number(e.target.value)})}
                    min="0"
                    step="5"
                  />
                  <small className="text-muted">30dk seçilince bu ücret uygulanır</small>
                </div>

                <div className="input-grup" style={{ flex: '1 0 300px', padding: '10px' }}>
                  <label>1 Saat Ücreti (₺)</label>
                  <input
                    type="number"
                    value={billiardRates.rate_60min}
                    onChange={(e) => setBilliardRates({...billiardRates, rate_60min: Number(e.target.value)})}
                    min="0"
                    step="5"
                  />
                  <small className="text-muted">1 saat seçilince bu ücret uygulanır</small>
                </div>

                <div className="input-grup" style={{ flex: '1 0 300px', padding: '10px' }}>
                  <label>Süresiz - Dakika Başı Ücret (₺)</label>
                  <input
                    type="number"
                    value={billiardRates.rate_per_minute}
                    onChange={(e) => setBilliardRates({...billiardRates, rate_per_minute: Number(e.target.value)})}
                    min="0"
                    step="0.5"
                  />
                  <small className="text-muted">Süresiz seçilince 30dk sonrası dakika başı bu ücret</small>
                </div>
              </div>

              <div className="onizleme-kutu">
                <h3>🎯 Örnek Hesaplamalar (Gösterim amaçlı)</h3>
                <p className="text-muted"><small>Not: Gerçek hesaplama SQL'de yapılır</small></p>
                <ul>
                  <li><span>30 dakika:</span> <strong>{billiardRates.rate_30min}₺</strong></li>
                  <li><span>1 saat:</span> <strong>{billiardRates.rate_60min}₺</strong></li>
                  <li><span>45dk (süresiz):</span> <strong>{billiardRates.rate_30min + (15 * billiardRates.rate_per_minute)}₺</strong></li>
                </ul>
              </div>

              <button 
                onClick={saveBilliardRates} 
                className="kaydet-button"
                disabled={loading}
              >
                {loading ? "⏳ Kaydediliyor..." : "💾 Bilardo Tarifesini Kaydet"}
              </button>
            </>
          )}
        </div>
      )}

      {/* POPUP AYARLARI PANELİ */}
      {panel === "popup_ayarlari" && (
        <div className="ayar-kutu">
          <h2>🔔 Bildirim Ayarları</h2>

          <div className="input-grup">
            <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                className="form-check-input"
                type="checkbox"
                checked={notificationSettings.time_notifications}
                onChange={(e) => setNotificationSettings({...notificationSettings, time_notifications: e.target.checked})}
                id="sureBildirimiSwitch"
                style={{ width: '50px', height: '25px' }}
              />
              <label className="form-check-label" htmlFor="sureBildirimiSwitch">
                <strong>Süre Bitimi Bildirimi</strong>
                <div className="form-text">Bilardo süresi dolunca bildirim göster</div>
              </label>
            </div>
          </div>

          <div className="input-grup">
            <div className="form-check form-switch" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                className="form-check-input"
                type="checkbox"
                checked={notificationSettings.sound_notifications}
                onChange={(e) => setNotificationSettings({...notificationSettings, sound_notifications: e.target.checked})}
                id="sesliUyariSwitch"
                style={{ width: '50px', height: '25px' }}
              />
              <label className="form-check-label" htmlFor="sesliUyariSwitch">
                <strong>Sesli Uyarı</strong>
                <div className="form-text">Bildirim ile birlikte ses çal</div>
              </label>
            </div>
          </div>

          <div className="input-grup">
            <label>Popup Otomatik Kapanma Süresi: <strong>{notificationSettings.auto_close_popup} saniye</strong></label>
            <input
              type="range"
              className="form-range"
              min="10"
              max="60"
              step="5"
              value={notificationSettings.auto_close_popup}
              onChange={(e) => setNotificationSettings({...notificationSettings, auto_close_popup: Number(e.target.value)})}
              style={{ width: '100%' }}
            />
            <div className="d-flex justify-content-between">
              <small>10 sn</small>
              <small>60 sn</small>
            </div>
          </div>

          <button 
            onClick={saveNotificationSettings} 
            className="kaydet-button"
            disabled={loading}
          >
            {loading ? "⏳ Kaydediliyor..." : "🔔 Bildirim Ayarlarını Kaydet"}
          </button>
        </div>
      )}

      {/* YEDEK & KURTARMA PANELİ */}
      {panel === "yedek" && (
        <div className="ayar-kutu">
          <h2>💾 Veri Yönetimi</h2>
          
          <div className="uyari-kutu">
            <div className="uyari-icon">⚠️</div>
            <div className="uyari-icerik">
              <h3>Önemli Uyarı (MyCafe Anayasası)</h3>
              <p><strong>SQL Backend:</strong> Tüm veriler PostgreSQL'de saklanır</p>
              <p><strong>Günlük snapshot:</strong> Her gün kapanışta snapshot alınır</p>
              <p><strong>Geçmiş değişmez:</strong> Kapalı günlerin verileri değiştirilemez</p>
            </div>
          </div>

          <div className="input-grup">
            <button 
              onClick={handleBackup} 
              className="kaydet-button"
              disabled={loading}
            >
              {loading ? "⏳ Hazırlanıyor..." : "💾 Tüm Verilerin Yedeğini Al (SQL)"}
            </button>
            <small className="text-muted">Tüm veritabanını SQL dump olarak yedekler</small>
          </div>

          {/* SADECE ADMIN GERİ YÜKLEYEBİLİR */}
          {(user?.role === "ADMIN" || user?.role === "__SYS") && (
            <div className="input-grup">
              <label>📥 Veri Geri Yükle (Yönetici)</label>
              <input 
                type="file" 
                accept=".sql,.backup"
                onChange={handleRestore}
                id="restoreFileInput"
                disabled={loading}
              />
              <small className="text-muted">MyCafe SQL yedek dosyası seçin</small>
            </div>
          )}

          {/* GÜNLÜK SNAPSHOT YÖNETİMİ */}
          <div className="temizleme-bilgi" style={{ marginTop: '20px' }}>
            <h3>📅 Günlük Snapshot Yönetimi</h3>
            <p>Her gün kapanışında otomatik snapshot alınır. Bu snapshot'lar geçmiş raporlar için kullanılır.</p>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
              <button 
                onClick={async () => {
                  try {
                    const response = await api.get("/reports/last-snapshot");
                    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `gunluk_snapshot_${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    alert("✅ Son gün snapshot'ı indirildi!");
                  } catch (error) {
                    alert("❌ Snapshot indirilemedi!");
                  }
                }}
                className="kaydet-button"
                style={{ flex: '1', minWidth: '200px', background: '#3498db' }}
              >
                📥 Son Gün Snapshot'ını İndir
              </button>
              
              <button 
                onClick={async () => {
                  if (window.confirm("Bugünün snapshot'ı manuel olarak alınsın mı?\n\nNot: Gün hala açıkken snapshot alınabilir.")) {
                    try {
                      await api.post("/day/create-snapshot");
                      alert("✅ Manuel snapshot alındı!");
                    } catch (error) {
                      alert("❌ Snapshot alınamadı!");
                    }
                  }
                }}
                className="kaydet-button"
                style={{ flex: '1', minWidth: '200px', background: '#2ecc71' }}
                disabled={loading}
              >
                {loading ? "⏳ İşleniyor..." : "📸 Manuel Snapshot Al"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SİSTEM YÖNETİMİ PANELİ (SADECE SUPER ADMIN) */}
      {panel === "sistem" && user?.role === "__SYS" && (
        <div className="ayar-kutu">
          <h2>⚡ Sistem Yönetimi (Super Admin)</h2>
          
          <div className="uyari-kutu" style={{ borderLeftColor: '#e74c3c' }}>
            <div className="uyari-icon">☢️</div>
            <div className="uyari-icerik">
              <h3>Tehlikeli İşlemler</h3>
              <p>Bu işlemler sistemin çalışmasını kalıcı olarak etkileyebilir.</p>
              <p><strong>Sadece Super Admin bu paneli görebilir.</strong></p>
            </div>
          </div>

          <div className="input-grup">
            <button 
              onClick={resetSystem}
              className="temizle-button"
              style={{ background: '#e74c3c' }}
              disabled={loading}
            >
              {loading ? "⏳ İşleniyor..." : "☢️ Sistemi Demo'ya Sıfırla"}
            </button>
            <small className="text-muted">Tüm verileri siler ve demo moduna geçer</small>
          </div>

          <div className="input-grup">
            <button 
              onClick={async () => {
                if (window.confirm("Demo'dan canlı moda geçiş YAPILACAK!\n\nBu işlem GERİ DÖNÜŞSÜZDÜR. Emin misiniz?")) {
                  try {
                    await api.post("/system/switch-to-production");
                    alert("✅ Canlı moda geçildi! Sistem yeniden başlatılacak.");
                    setTimeout(() => window.location.reload(), 2000);
                  } catch (error) {
                    alert("❌ Geçiş başarısız!");
                  }
                }
              }}
              className="kaydet-button"
              style={{ background: '#f39c12' }}
              disabled={loading}
            >
              {loading ? "⏳ İşleniyor..." : "🚀 Demo → Canlı Moda Geç"}
            </button>
            <small className="text-muted">Demo modundan canlı moda geçiş yapar (geri dönüşsüz)</small>
          </div>

          <div className="input-grup">
            <button 
              onClick={async () => {
                try {
                  const response = await api.get("/system/health");
                  alert(`✅ Sistem Sağlığı:\n\n${JSON.stringify(response.data, null, 2)}`);
                } catch (error) {
                  alert("❌ Sistem sağlık kontrolü başarısız!");
                }
              }}
              className="kaydet-button"
              style={{ background: '#27ae60' }}
            >
              🩺 Sistem Sağlık Kontrolü
            </button>
            <small className="text-muted">Sistem bileşenlerinin durumunu kontrol eder</small>
          </div>
        </div>
      )}

      {/* PANEL SEÇİLMEDİYSE */}
      {!panel && (
        <div className="ayar-kutu">
          <h2>👋 Hoş Geldiniz!</h2>
          <p>Sol taraftaki menüden ayar kategorisi seçerek sistemi yapılandırabilirsiniz.</p>
          
          <div className="onizleme-kutu">
            <h3>⚡ Hızlı İşlemler</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setPanel("bilardo_ucret")} className="kaydet-button" style={{ flex: '1', minWidth: '200px' }}>
                🎱 Bilardo Tarifesi
              </button>
              <button onClick={handleBackup} className="kaydet-button" style={{ flex: '1', minWidth: '200px', background: '#27ae60' }}>
                💾 Hızlı Yedek Al
              </button>
              <button onClick={() => setPanel("genel")} className="kaydet-button" style={{ flex: '1', minWidth: '200px', background: '#3498db' }}>
                ⚙️ Genel Ayarlar
              </button>
              {user?.role === "__SYS" && (
                <button onClick={() => setPanel("sistem")} className="kaydet-button" style={{ flex: '1', minWidth: '200px', background: '#e74c3c' }}>
                  ⚡ Sistem Yönetimi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}