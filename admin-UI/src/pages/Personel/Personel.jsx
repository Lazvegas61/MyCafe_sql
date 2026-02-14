/* ============================================================
   📄 DOSYA: Personel.jsx (MYCAFE ANAYASASI UYUMLU)
   📌 DEĞİŞİKLİKLER:
   - LocalStorage kaldırıldı
   - Backend API entegrasyonu eklendi
   - Role-based permission kontrolü eklendi
   - MyCafe Anayasası Madde 5 uygulandı
============================================================ */

import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { userApi } from "../../api/userApi";

export default function Personel() {
  const { user, hasPermission } = useAuth();
  
  // State tanımları
  const [personeller, setPersoneller] = useState([]);
  const [secili, setSecili] = useState(null);
  const [uyari, setUyari] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Yeni personel formu
  const [yeniAd, setYeniAd] = useState("");
  const [yeniUser, setYeniUser] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniRol, setYeniRol] = useState("GARSON");

  // Şifre güncelleme
  const [sifreInput, setSifreInput] = useState("");

  // İlk yükleme
  useEffect(() => {
    loadPersoneller();
  }, []);

  // Personelleri API'den yükle
  const loadPersoneller = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUsers();
      setPersoneller(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Personel yükleme hatası:", err);
      setError("Personel verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Uyarı göster
  const gosterUyari = (text) => {
    setUyari(text);
    setTimeout(() => setUyari(""), 2000);
  };

  // Yeni personel ekle
  const ekle = async () => {
    if (!hasPermission('user.create')) {
      gosterUyari("Bu işlem için yetkiniz yok!");
      return;
    }

    if (yeniAd.trim() === "" || yeniUser.trim() === "" || yeniSifre.length < 4) {
      gosterUyari("Lütfen bilgileri doğru girin. (Şifre min 4)");
      return;
    }

    try {
      await userApi.createUser({
        fullName: yeniAd,
        username: yeniUser,
        password: yeniSifre,
        roleCode: yeniRol,
        email: "",
        phone: "",
        active: true
      });

      // Listeyi yenile
      await loadPersoneller();

      // Formu temizle
      setYeniAd("");
      setYeniUser("");
      setYeniSifre("");

      gosterUyari("Personel başarıyla eklendi");
      
    } catch (err) {
      console.error("Personel ekleme hatası:", err);
      gosterUyari(err.response?.data?.message || "Personel eklenemedi");
    }
  };

  // Personel seç
  const sec = (p) => {
    setSecili(p);
    setSifreInput("");
  };

  // Bilgi güncelle
  const kaydetDegisiklik = async (alan, deger) => {
    if (!hasPermission('user.update')) {
      gosterUyari("Bu işlem için yetkiniz yok!");
      return;
    }

    try {
      await userApi.updateUser(secili.id, {
        [alan]: deger
      });

      // Lokal state'i güncelle
      const guncel = personeller.map((p) =>
        p.id === secili.id ? { ...p, [alan]: deger } : p
      );
      setPersoneller(guncel);
      setSecili({ ...secili, [alan]: deger });

      gosterUyari("Bilgi güncellendi");
      
    } catch (err) {
      console.error("Personel güncelleme hatası:", err);
      gosterUyari("Bilgi güncellenemedi");
    }
  };

  // Şifre güncelleme
  const sifreDegistir = async () => {
    if (!hasPermission('user.update')) {
      gosterUyari("Bu işlem için yetkiniz yok!");
      return;
    }

    if (sifreInput.length < 4) {
      gosterUyari("Şifre en az 4 karakter olmalı");
      return;
    }

    try {
      await userApi.changePassword(secili.id, {
        newPassword: sifreInput
      });

      setSifreInput("");
      gosterUyari("Şifre başarıyla güncellendi");
      
    } catch (err) {
      console.error("Şifre değiştirme hatası:", err);
      gosterUyari("Şifre güncellenemedi");
    }
  };

  // Personel sil
  const sil = async () => {
    if (!secili) return;

    if (!hasPermission('user.delete')) {
      gosterUyari("Bu işlem için yetkiniz yok!");
      return;
    }

    // Super Admin kontrolü (Backend'den geliyor)
    if (secili.isSystemAdmin) {
      gosterUyari("Sistem yöneticisi silinemez!");
      return;
    }

    // Garson açık adisyon kontrolü - API'den kontrol edilmeli
    if (secili.roleCode === "GARSON" && secili.hasOpenInvoices) {
      gosterUyari("Bu garsonun üzerinde açık adisyon var. Silinemez.");
      return;
    }

    if (!window.confirm(`${secili.fullName} isimli kullanıcıyı silmek istediğinize emin misiniz?`)) return;

    try {
      await userApi.deleteUser(secili.id);
      
      // Listeyi yenile
      await loadPersoneller();
      setSecili(null);

      gosterUyari("Kullanıcı başarıyla silindi");
      
    } catch (err) {
      console.error("Personel silme hatası:", err);
      gosterUyari(err.response?.data?.message || "Kullanıcı silinemedi");
    }
  };

  // Aktif/pasif yap
  const toggleAktif = async () => {
    if (!secili) return;
    
    if (!hasPermission('user.update')) {
      gosterUyari("Bu işlem için yetkiniz yok!");
      return;
    }
    
    // Super Admin kontrolü
    if (secili.isSystemAdmin) {
      gosterUyari("Sistem yöneticisi pasif yapılamaz!");
      return;
    }
    
    const yeniDurum = !secili.active;
    
    try {
      await userApi.updateUserStatus(secili.id, yeniDurum);
      
      // Lokal state'i güncelle
      const guncel = personeller.map((p) =>
        p.id === secili.id ? { ...p, active: yeniDurum } : p
      );
      setPersoneller(guncel);
      setSecili({ ...secili, active: yeniDurum });

      gosterUyari(`Kullanıcı ${yeniDurum ? "aktif" : "pasif"} yapıldı`);
      
    } catch (err) {
      console.error("Durum değiştirme hatası:", err);
      gosterUyari("Durum değiştirilemedi");
    }
  };

  // ROL RENK DÖNÜŞÜMÜ
  const getRolColor = (rol) => {
    switch(rol) {
      case "ADMIN": return "#e74c3c"; // Kırmızı
      case "GARSON": return "#3498db"; // Mavi
      case "MUTFAK": return "#2ecc71"; // Yeşil
      default: return "#95a5a6"; // Gri
    }
  };

  // ROL LABEL DÖNÜŞÜMÜ
  const getRolLabel = (rol) => {
    switch(rol) {
      case "ADMIN": return "Yönetici";
      case "GARSON": return "Garson";
      case "MUTFAK": return "Mutfak";
      default: return rol;
    }
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Personel verileri yükleniyor...</p>
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
          <button onClick={loadPersoneller} style={styles.btn}>
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* UYARI */}
      {uyari && (
        <div style={styles.uyari}>
          {uyari}
        </div>
      )}

      {/* SOL PANEL ─ PERSONEL LİSTESİ */}
      <div style={styles.leftPanel}>
        <h2 style={styles.h2}>Personel Listesi</h2>

        {personeller.length === 0 ? (
          <div style={styles.emptyMessage}>
            Henüz personel eklenmemiş.
          </div>
        ) : (
          personeller.map((p) => (
            <div
              key={p.id}
              onClick={() => sec(p)}
              style={{
                ...styles.personelCard,
                backgroundColor: secili?.id === p.id ? "#e6d4b8" : "white",
                opacity: p.active === false ? 0.6 : 1
              }}
            >
              <div style={styles.personelHeader}>
                <div>
                  <b style={styles.personelName}>{p.fullName}</b>
                  {p.isSystemAdmin && (
                    <span style={styles.systemAdminBadge}>
                      SİSTEM
                    </span>
                  )}
                  {!p.active && (
                    <span style={styles.passiveBadge}>
                      PASİF
                    </span>
                  )}
                  <br />
                  <span style={styles.username}>@{p.username}</span>
                </div>
                <span style={{ 
                  ...styles.roleBadge,
                  backgroundColor: getRolColor(p.roleCode)
                }}>
                  {getRolLabel(p.roleCode)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SAĞ PANEL ─ YENİ EKLE + DETAY */}
      <div style={styles.rightPanel}>
        {/* YENİ PERSONEL EKLE */}
        {hasPermission('user.create') && (
          <div style={styles.newUserCard}>
            <h2 style={styles.h2}>
              Yeni Personel Ekle
            </h2>

            <div style={styles.formGrid}>
              <label style={styles.label}>Ad Soyad:</label>
              <input
                style={styles.input}
                value={yeniAd}
                onChange={(e) => setYeniAd(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
              />

              <label style={styles.label}>Kullanıcı Adı:</label>
              <input
                style={styles.input}
                value={yeniUser}
                onChange={(e) => setYeniUser(e.target.value)}
                placeholder="Örn: ahmetyilmaz"
              />

              <label style={styles.label}>Şifre:</label>
              <input
                type="password"
                style={styles.input}
                value={yeniSifre}
                onChange={(e) => setYeniSifre(e.target.value)}
                placeholder="En az 4 karakter"
              />

              <label style={styles.label}>Rol:</label>
              <select
                style={styles.input}
                value={yeniRol}
                onChange={(e) => setYeniRol(e.target.value)}
              >
                <option value="GARSON">Garson</option>
                <option value="ADMIN">Yönetici (Admin)</option>
                <option value="MUTFAK">Mutfak Personeli</option>
              </select>
            </div>

            <button onClick={ekle} style={styles.btn}>
              Personel Ekle
            </button>
          </div>
        )}

        {/* SEÇİLİ PERSONEL DETAYI */}
        {secili && (
          <div style={styles.detailCard}>
            <div style={styles.detailHeader}>
              <h2 style={styles.h2}>
                Personel Detayı
              </h2>
              <div style={styles.headerBadges}>
                <span style={{ 
                  ...styles.roleBadge,
                  backgroundColor: getRolColor(secili.roleCode)
                }}>
                  {getRolLabel(secili.roleCode)}
                </span>
                {secili.isSystemAdmin && (
                  <span style={styles.systemAdminBadge}>
                    SİSTEM YÖNETİCİSİ
                  </span>
                )}
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.label}>Ad Soyad:</label>
              <input
                style={styles.input}
                value={secili.fullName}
                onChange={(e) => kaydetDegisiklik("fullName", e.target.value)}
                disabled={secili.isSystemAdmin || !hasPermission('user.update')}
              />

              <label style={styles.label}>Kullanıcı Adı:</label>
              <input
                style={styles.input}
                value={secili.username}
                onChange={(e) => kaydetDegisiklik("username", e.target.value)}
                disabled={secili.isSystemAdmin || !hasPermission('user.update')}
              />

              <label style={styles.label}>Yeni Şifre:</label>
              <div style={styles.passwordRow}>
                <input
                  type="password"
                  style={styles.input}
                  value={sifreInput}
                  onChange={(e) => setSifreInput(e.target.value)}
                  placeholder="Yeni şifre girin"
                  disabled={!hasPermission('user.update')}
                />
                {hasPermission('user.update') && !secili.isSystemAdmin && (
                  <button onClick={sifreDegistir} style={styles.smallBtn}>
                    Şifreyi Güncelle
                  </button>
                )}
              </div>

              <label style={styles.label}>Rol:</label>
              <select
                style={styles.input}
                value={secili.roleCode}
                onChange={(e) => kaydetDegisiklik("roleCode", e.target.value)}
                disabled={secili.isSystemAdmin || !hasPermission('user.update')}
              >
                <option value="GARSON">Garson</option>
                <option value="ADMIN">Yönetici (Admin)</option>
                <option value="MUTFAK">Mutfak Personeli</option>
              </select>

              <label style={styles.label}>Durum:</label>
              <div style={styles.statusRow}>
                <span style={{ 
                  fontSize: "18px", 
                  color: secili.active ? "#27ae60" : "#e74c3c" 
                }}>
                  {secili.active ? "✔ Aktif" : "✘ Pasif"}
                </span>
                {hasPermission('user.update') && !secili.isSystemAdmin && (
                  <button 
                    onClick={toggleAktif} 
                    style={{
                      ...styles.statusBtn,
                      backgroundColor: secili.active ? "#e74c3c" : "#27ae60"
                    }}
                  >
                    {secili.active ? "Pasif Yap" : "Aktif Yap"}
                  </button>
                )}
              </div>

              {secili.email && (
                <>
                  <label style={styles.label}>E-posta:</label>
                  <input
                    style={styles.input}
                    value={secili.email || ""}
                    onChange={(e) => kaydetDegisiklik("email", e.target.value)}
                    disabled={!hasPermission('user.update')}
                  />
                </>
              )}

              {secili.phone && (
                <>
                  <label style={styles.label}>Telefon:</label>
                  <input
                    style={styles.input}
                    value={secili.phone || ""}
                    onChange={(e) => kaydetDegisiklik("phone", e.target.value)}
                    disabled={!hasPermission('user.update')}
                  />
                </>
              )}
            </div>

            <div style={styles.actionButtons}>
              {hasPermission('user.delete') && !secili.isSystemAdmin && (
                <button onClick={sil} style={styles.delBtn}>
                  Personeli Sil
                </button>
              )}
              
              {secili.isSystemAdmin && (
                <div style={styles.systemAdminInfo}>
                  <strong>Sistem Yöneticisi:</strong> Bu kullanıcı sistem için özel tanımlanmıştır. Silinemez veya rolü değiştirilemez.
                </div>
              )}
            </div>

            {/* EK BİLGİLER */}
            <div style={styles.permissionsInfo}>
              <h4 style={{ marginBottom: "10px", color: "#4b2e05" }}>Yetkiler:</h4>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {secili.roleCode === "ADMIN" && (
                  <>
                    <li>✅ Tüm işlemleri yapabilir</li>
                    <li>✅ Gün başlatma/bitirme</li>
                    <li>✅ Rapor görüntüleme</li>
                    <li>✅ Personel yönetimi</li>
                  </>
                )}
                {secili.roleCode === "GARSON" && (
                  <>
                    <li>✅ Masa işlemleri</li>
                    <li>✅ Adisyon açma/kapatma</li>
                    <li>✅ Sipariş alma</li>
                    <li>❌ Rapor görüntüleme</li>
                    <li>❌ Personel yönetimi</li>
                  </>
                )}
                {secili.roleCode === "MUTFAK" && (
                  <>
                    <li>✅ Sipariş görüntüleme</li>
                    <li>✅ Sipariş hazırlama</li>
                    <li>❌ Masa işlemleri</li>
                    <li>❌ Gün işlemleri</li>
                  </>
                )}
              </ul>
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
    padding: "20px",
    display: "flex",
    flexDirection: "row",
    gap: "20px",
    width: "100%",
    backgroundColor: "#f5e7d0",
    color: "#4b2e05",
    minHeight: "100vh",
  },
  
  leftPanel: {
    width: "35%",
    padding: "15px",
    borderRight: "3px solid #4b2e05",
    backgroundColor: "#f5e7d0",
  },
  
  rightPanel: {
    width: "65%",
    padding: "20px"
  },
  
  h2: {
    fontSize: "26px",
    marginBottom: "20px",
    color: "#4b2e05"
  },
  
  // Personel kartı
  personelCard: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "10px",
    border: "2px solid #4b2e05",
    marginBottom: "12px",
    cursor: "pointer",
    position: "relative"
  },
  
  personelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  
  personelName: {
    fontSize: "18px"
  },
  
  username: {
    fontSize: "16px",
    color: "#34495e"
  },
  
  // Badge'ler
  roleBadge: {
    color: "white",
    fontWeight: "bold",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "14px"
  },
  
  systemAdminBadge: {
    marginLeft: "10px",
    fontSize: "12px",
    backgroundColor: "#f39c12",
    color: "white",
    padding: "2px 6px",
    borderRadius: "4px"
  },
  
  passiveBadge: {
    marginLeft: "10px",
    fontSize: "12px",
    backgroundColor: "#95a5a6",
    color: "white",
    padding: "2px 6px",
    borderRadius: "4px"
  },
  
  // Form stilleri
  formGrid: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    rowGap: "18px",
    columnGap: "20px",
    marginBottom: "25px"
  },
  
  label: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#4b2e05"
  },
  
  input: {
    padding: "10px 14px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid #4b2e05",
    width: "100%",
    backgroundColor: "#f8f9fa",
    color: "#4b2e05"
  },
  
  // Butonlar
  btn: {
    padding: "12px 24px",
    backgroundColor: "#4b2e05",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "18px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  },
  
  smallBtn: {
    padding: "10px 18px",
    backgroundColor: "#3498db",
    color: "white",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  },
  
  delBtn: {
    padding: "12px 24px",
    backgroundColor: "#c0392b",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "18px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  },
  
  statusBtn: {
    padding: "6px 12px",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },
  
  // Kartlar
  newUserCard: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    border: "2px solid #4b2e05",
    marginBottom: "30px"
  },
  
  detailCard: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    border: "2px solid #4b2e05"
  },
  
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  
  headerBadges: {
    display: "flex",
    gap: "10px"
  },
  
  // Yardımcı stiller
  passwordRow: {
    display: "flex",
    gap: "10px"
  },
  
  statusRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center"
  },
  
  actionButtons: {
    display: "flex",
    gap: "15px",
    marginTop: "25px"
  },
  
  systemAdminInfo: {
    padding: "12px",
    backgroundColor: "#f8f9fa",
    border: "1px dashed #4b2e05",
    borderRadius: "8px",
    color: "#4b2e05"
  },
  
  permissionsInfo: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #ddd"
  },
  
  emptyMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#7f8c8d"
  },
  
  // Uyarı
  uyari: {
    position: "fixed",
    bottom: "25px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#4b2e05",
    color: "white",
    padding: "12px 24px",
    borderRadius: "12px",
    fontSize: "18px",
    zIndex: 999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
  },
  
  // Yükleniyor
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100%"
  },
  
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #4b2e05",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
  
  // Hata
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100%",
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
`;
document.head.appendChild(styleSheet);