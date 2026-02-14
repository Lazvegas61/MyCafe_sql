/* ============================================================
   📄 DOSYA: MusteriIslemleri.jsx (MYCAFE ANAYASASI UYUMLU)
   📌 DEĞİŞİKLİKLER:
   - LocalStorage finans işlemleri KALDIRILDI
   - Backend API entegrasyonu eklendi
   - UI finans hesaplamaları KALDIRILDI
   - MyCafe Anayasası Madde 1, 3, 4, 5 uygulandı
============================================================ */

import React, { useState, useEffect } from "react";
import "./MusteriIslemleri.css";
import { useAuth } from "../../hooks/useAuth";
import { customerApi } from "../../api/customerApi";
import { paymentApi } from "../../api/paymentApi";
import { reportApi } from "../../api/reportApi";
import BorcTransferModal from "../../components/modals/BorcTransferModal";

export default function MusteriIslemleri() {
  const { user, hasPermission } = useAuth();
  
  // --------------------------------------------------
  // STATE TANIMLARI - MyCafe Anayasası Uyumlu
  // --------------------------------------------------
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDebtRecord, setSelectedDebtRecord] = useState(null);
  const [debtRecords, setDebtRecords] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [adisyonDetails, setAdisyonDetails] = useState(null);
  
  // Filtreleme
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Tahsilat formu
  const [tahsilatTutar, setTahsilatTutar] = useState("");
  const [tahsilatTipi, setTahsilatTipi] = useState("NAKIT");
  const [tahsilatNot, setTahsilatNot] = useState("");
  
  // İndirim formu
  const [indirimTutar, setIndirimTutar] = useState("");
  const [indirimNot, setIndirimNot] = useState("");
  
  // Borç Transferi Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  
  // Müşteri Yönetimi Modal
  const [musteriDuzenleModalOpen, setMusteriDuzenleModalOpen] = useState(false);
  const [duzenlenenMusteri, setDuzenlenenMusteri] = useState(null);
  const [duzenleAdSoyad, setDuzenleAdSoyad] = useState("");
  const [duzenleTelefon, setDuzenleTelefon] = useState("");
  const [duzenleNot, setDuzenleNot] = useState("");
  
  // Manuel Kayıt Modal
  const [manuelKayitModalOpen, setManuelKayitModalOpen] = useState(false);
  const [yeniMusteriAdi, setYeniMusteriAdi] = useState("");
  const [yeniMusteriTelefon, setYeniMusteriTelefon] = useState("");
  const [borcTutari, setBorcTutari] = useState("");
  const [masaNo, setMasaNo] = useState("");
  const [aciklama, setAciklama] = useState("");
  
  // Silme Onay Modal
  const [silmeOnayModalOpen, setSilmeOnayModalOpen] = useState(false);
  const [silinecekMusteri, setSilinecekMusteri] = useState(null);
  
  // Yükleniyor/Error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    toplamMusteri: 0,
    aktifMusteri: 0,
    borcluMusteri: 0,
    odemisMusteri: 0,
    toplamBorc: 0
  });

  // --------------------------------------------------
  // İNİTİAL LOAD - API'den veri çek
  // --------------------------------------------------
  useEffect(() => {
    loadCustomerData();
    loadStats();
  }, []);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      // API'den müşteri listesini çek
      const response = await customerApi.getCustomers();
      setCustomers(response.data || []);
      setFilteredCustomers(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Müşteri yükleme hatası:", err);
      setError("Müşteri verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await reportApi.getCustomerStats();
      setStats(response.data || stats);
    } catch (err) {
      console.error("İstatistik yükleme hatası:", err);
    }
  };

  // --------------------------------------------------
  // FİLTRELEME - Sadece UI filtresi, hesaplama yok
  // --------------------------------------------------
  useEffect(() => {
    let filtered = [...customers];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.adSoyad?.toLowerCase().includes(term) ||
        customer.telefon?.includes(searchTerm) ||
        customer.not?.toLowerCase().includes(term)
      );
    }
    
    if (filterType !== "all") {
      switch (filterType) {
        case "debt":
          filtered = filtered.filter(c => (c.netBorc || 0) > 0);
          break;
        case "paid":
          filtered = filtered.filter(c => (c.netBorc || 0) === 0);
          break;
        case "active":
          filtered = filtered.filter(c => c.aktif !== false);
          break;
        case "inactive":
          filtered = filtered.filter(c => c.aktif === false);
          break;
        default:
          break;
      }
    }
    
    setFilteredCustomers(filtered);
  }, [searchTerm, filterType, customers]);

  // --------------------------------------------------
  // MÜŞTERİ SEÇİMİ - API'den detayları çek
  // --------------------------------------------------
  const handleCustomerSelect = async (customer) => {
    try {
      setSelectedCustomer(customer);
      setSelectedDebtRecord(null);
      setAdisyonDetails(null);
      
      // API'den müşteri detaylarını çek
      const [debtsResponse, transactionsResponse] = await Promise.all([
        customerApi.getCustomerDebts(customer.id),
        customerApi.getCustomerTransactions(customer.id, 50)
      ]);
      
      setDebtRecords(debtsResponse.data || []);
      setTransactionHistory(transactionsResponse.data || []);
      
      // Tahsilat formunu güncelle
      setTahsilatTutar((customer.netBorc || 0) > 0 ? Number(customer.netBorc || 0).toFixed(2) : "");
      
    } catch (err) {
      console.error("Müşteri detay yükleme hatası:", err);
      alert("Müşteri detayları yüklenemedi");
    }
  };

  // --------------------------------------------------
  // BORÇ KAYDI SEÇİMİ
  // --------------------------------------------------
  const handleDebtRecordSelect = (record) => {
    setSelectedDebtRecord(record);
    setAdisyonDetails(record);
  };

  // --------------------------------------------------
  // MÜŞTERİ İŞLEMLERİ - API Entegre
  // --------------------------------------------------
  const openMusteriDuzenleModal = (musteri) => {
    if (!hasPermission('customer.update')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    setDuzenlenenMusteri(musteri);
    setDuzenleAdSoyad(musteri.adSoyad);
    setDuzenleTelefon(musteri.telefon || "");
    setDuzenleNot(musteri.not || "");
    setMusteriDuzenleModalOpen(true);
  };

  const handleMusteriDuzenle = async () => {
    if (!duzenlenenMusteri || !duzenleAdSoyad.trim()) {
      alert("Müşteri adı boş olamaz!");
      return;
    }
    
    try {
      await customerApi.updateCustomer(duzenlenenMusteri.id, {
        adSoyad: duzenleAdSoyad.trim(),
        telefon: duzenleTelefon.trim(),
        not: duzenleNot.trim()
      });
      
      // Listeyi güncelle
      await loadCustomerData();
      
      // Seçili müşteriyi güncelle
      if (selectedCustomer?.id === duzenlenenMusteri.id) {
        setSelectedCustomer({
          ...selectedCustomer,
          adSoyad: duzenleAdSoyad.trim(),
          telefon: duzenleTelefon.trim(),
          not: duzenleNot.trim()
        });
      }
      
      setMusteriDuzenleModalOpen(false);
      alert("Müşteri bilgileri güncellendi!");
      
    } catch (err) {
      console.error("Müşteri güncelleme hatası:", err);
      alert("Müşteri güncellenemedi!");
    }
  };

  const openMusteriSilmeOnay = async (musteri) => {
    if (!hasPermission('customer.delete')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    try {
      // API'den güncel borç kontrolü
      const response = await customerApi.getCustomer(musteri.id);
      if (response.data.netBorc > 0) {
        alert("Borcu olan müşteri silinemez! Önce borçlarını temizleyin.");
        return;
      }
      
      setSilinecekMusteri(musteri);
      setSilmeOnayModalOpen(true);
      
    } catch (err) {
      console.error("Borç kontrol hatası:", err);
      alert("Borç kontrolü yapılamadı!");
    }
  };

  const handleMusteriSil = async () => {
    if (!silinecekMusteri) return;
    
    try {
      await customerApi.deleteCustomer(silinecekMusteri.id);
      
      // Listeyi güncelle
      await loadCustomerData();
      
      // Seçili müşteri silindiyse temizle
      if (selectedCustomer?.id === silinecekMusteri.id) {
        setSelectedCustomer(null);
        setDebtRecords([]);
        setTransactionHistory([]);
        setAdisyonDetails(null);
      }
      
      setSilmeOnayModalOpen(false);
      alert("Müşteri başarıyla silindi!");
      
    } catch (err) {
      console.error("Müşteri silme hatası:", err);
      alert("Müşteri silinemedi!");
    }
  };

  const handleMusteriDurumDegistir = async (musteriId, aktif) => {
    if (!hasPermission('customer.update')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    try {
      await customerApi.updateCustomerStatus(musteriId, aktif);
      
      // Listeyi güncelle
      await loadCustomerData();
      
      // Seçili müşteriyi güncelle
      if (selectedCustomer?.id === musteriId) {
        setSelectedCustomer({
          ...selectedCustomer,
          aktif: aktif
        });
      }
      
      alert(`Müşteri ${aktif ? 'aktif' : 'pasif'} duruma getirildi!`);
      
    } catch (err) {
      console.error("Müşteri durum değiştirme hatası:", err);
      alert("Müşteri durumu değiştirilemedi!");
    }
  };

  // --------------------------------------------------
  // TAHSİLAT AL - API Entegre
  // --------------------------------------------------
  const handleCollectPayment = async () => {
    if (!selectedCustomer) {
      alert("Önce bir müşteri seçiniz!");
      return;
    }
    
    if (!hasPermission('payment.collect')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    if (selectedCustomer.aktif === false) {
      alert("Pasif durumdaki müşteriye tahsilat yapılamaz!");
      return;
    }
    
    const tutar = parseFloat(tahsilatTutar);
    if (isNaN(tutar) || tutar <= 0) {
      alert("Geçerli bir tahsilat tutarı giriniz!");
      return;
    }
    
    try {
      await paymentApi.collectPayment({
        customerId: selectedCustomer.id,
        amount: tutar,
        paymentType: tahsilatTipi,
        description: tahsilatNot.trim() || "Müşteri İşlemleri sayfasından tahsilat"
      });
      
      // Verileri yenile
      await Promise.all([
        loadCustomerData(),
        loadStats()
      ]);
      
      // Seçili müşteriyi güncelle
      const updatedCustomer = await customerApi.getCustomer(selectedCustomer.id);
      setSelectedCustomer(updatedCustomer.data);
      await handleCustomerSelect(updatedCustomer.data);
      
      setTahsilatNot("");
      
      alert(`${tutar.toFixed(2)} ₺ tahsilat başarıyla alındı!`);
      
    } catch (err) {
      console.error("Tahsilat hatası:", err);
      alert(err.response?.data?.message || "Tahsilat alınamadı!");
    }
  };

  // --------------------------------------------------
  // İNDİRİM UYGULA - API Entegre
  // --------------------------------------------------
  const handleApplyDiscount = async () => {
    if (!selectedCustomer) {
      alert("Önce bir müşteri seçiniz!");
      return;
    }
    
    if (!hasPermission('payment.discount')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    if (selectedCustomer.aktif === false) {
      alert("Pasif durumdaki müşteriye indirim uygulanamaz!");
      return;
    }
    
    const tutar = Number(indirimTutar || 0);
    if (!tutar || tutar <= 0) {
      alert("Geçerli bir indirim tutarı giriniz!");
      return;
    }
    
    try {
      await paymentApi.applyDiscount({
        customerId: selectedCustomer.id,
        amount: tutar,
        reason: indirimNot.trim() || "Müşteri İşlemleri sayfasından indirim",
        discountType: "MANUEL"
      });
      
      // Verileri yenile
      await Promise.all([
        loadCustomerData(),
        loadStats()
      ]);
      
      // Seçili müşteriyi güncelle
      const updatedCustomer = await customerApi.getCustomer(selectedCustomer.id);
      setSelectedCustomer(updatedCustomer.data);
      await handleCustomerSelect(updatedCustomer.data);
      
      setIndirimTutar("");
      setIndirimNot("");
      
      alert(`${tutar.toFixed(2)} ₺ indirim başarıyla uygulandı!`);
      
    } catch (err) {
      console.error("İndirim hatası:", err);
      alert(err.response?.data?.message || "İndirim uygulanamadı!");
    }
  };

  // --------------------------------------------------
  // BORÇ TRANSFERİ - API Entegre
  // --------------------------------------------------
  const openTransferModal = () => {
    if (!selectedCustomer) {
      alert("Önce bir müşteri seçiniz!");
      return;
    }
    
    if (!hasPermission('payment.transfer')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    if (selectedCustomer.aktif === false) {
      alert("Pasif durumdaki müşteriden borç transferi yapılamaz!");
      return;
    }
    
    setTransferModalOpen(true);
  };

  const handleTransferDebt = async (transferData) => {
    try {
      await paymentApi.transferDebt({
        fromCustomerId: selectedCustomer.id,
        toCustomerId: transferData.toCustomerId,
        amount: transferData.amount,
        description: transferData.description
      });
      
      // Verileri yenile
      await Promise.all([
        loadCustomerData(),
        loadStats()
      ]);
      
      // Seçili müşteriyi güncelle
      const updatedCustomer = await customerApi.getCustomer(selectedCustomer.id);
      setSelectedCustomer(updatedCustomer.data);
      await handleCustomerSelect(updatedCustomer.data);
      
      setTransferModalOpen(false);
      
      alert(`${transferData.amount.toFixed(2)} ₺ borç transferi başarıyla tamamlandı!`);
      
    } catch (err) {
      console.error("Borç transferi hatası:", err);
      alert(err.response?.data?.message || "Borç transferi yapılamadı!");
    }
  };

  // --------------------------------------------------
  // MANUEL KAYIT - API Entegre
  // --------------------------------------------------
  const openManuelKayitModal = () => {
    if (!hasPermission('payment.create')) {
      alert("Bu işlem için yetkiniz yok!");
      return;
    }
    
    setManuelKayitModalOpen(true);
    setYeniMusteriAdi("");
    setYeniMusteriTelefon("");
    setBorcTutari("");
    setMasaNo("");
    setAciklama("");
  };

  const handleManuelKayit = async () => {
    if (!yeniMusteriAdi || !borcTutari) {
      alert("Lütfen müşteri adı ve borç tutarını giriniz!");
      return;
    }
    
    const tutar = Number(borcTutari || 0);
    if (tutar <= 0) {
      alert("Geçerli bir borç tutarı giriniz!");
      return;
    }
    
    try {
      await paymentApi.addManualDebt({
        customerName: yeniMusteriAdi,
        customerPhone: yeniMusteriTelefon || null,
        amount: tutar,
        tableNumber: masaNo || "MANUEL",
        description: aciklama || "Manuel kayıt - Müşteri İşlemleri",
        products: [] // Boş bırakılabilir, backend otomatik oluşturur
      });
      
      // Verileri yenile
      await Promise.all([
        loadCustomerData(),
        loadStats()
      ]);
      
      setManuelKayitModalOpen(false);
      
      alert(`${yeniMusteriAdi} müşterisine ${tutar.toFixed(2)} ₺ borç kaydı başarıyla eklendi!`);
      
    } catch (err) {
      console.error("Manuel kayıt hatası:", err);
      alert(err.response?.data?.message || "Manuel kayıt eklenemedi!");
    }
  };

  // --------------------------------------------------
  // UTILITY FONKSİYONLAR - SADECE FORMATLAMA
  // --------------------------------------------------
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Geçersiz tarih";
    }
  };

  const formatShortDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return "Geçersiz";
    }
  };

  // --------------------------------------------------
  // TASARIM RENDER - Yetki kontrolleri eklendi
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="musteri-islemleri-v2">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Müşteri verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="musteri-islemleri-v2">
        <div className="error-container">
          <h3>❌ Hata</h3>
          <p>{error}</p>
          <button onClick={loadCustomerData}>Tekrar Dene</button>
        </div>
      </div>
    );
  }

  return (
    <div className="musteri-islemleri-v2">
      {/* BAŞLIK */}
      <div className="page-header">
        <div className="header-top">
          <h1>MÜŞTERİ İŞLEMLERİ</h1>
          <div className="header-actions">
            <div className="role-badge">
              {user?.role || "Kullanıcı"}
            </div>
            {hasPermission('payment.create') && (
              <button 
                className="btn-manuel-kayit"
                onClick={openManuelKayitModal}
                title="Yeni müşteri ve borç kaydı ekle"
              >
                ✍️ Manuel Kayıt
              </button>
            )}
          </div>
        </div>
                
        {/* İSTATİSTİKLER - API'den gelen veri */}
        <div className="statistics-container">
          <div className="statistic-card">
            <div className="statistic-value">{stats.toplamMusteri}</div>
            <div className="statistic-label">Toplam Müşteri</div>
          </div>
          <div className="statistic-card">
            <div className="statistic-value" style={{ color: "#2e7d32" }}>{stats.aktifMusteri}</div>
            <div className="statistic-label">Aktif</div>
          </div>
          <div className="statistic-card">
            <div className="statistic-value" style={{ color: "#d32f2f" }}>{stats.borcluMusteri}</div>
            <div className="statistic-label">Borçlu</div>
          </div>
          <div className="statistic-card">
            <div className="statistic-value" style={{ color: "#1976d2" }}>{stats.odemisMusteri}</div>
            <div className="statistic-label">Ödemiş</div>
          </div>
          <div className="statistic-card">
            <div className="statistic-value" style={{ color: "#d2691e" }}>
              {Number(stats.toplamBorc || 0).toFixed(2)} ₺
            </div>
            <div className="statistic-label">Toplam Borç</div>
          </div>
        </div>
      </div>
      
      {/* 3 KOLONLU ANA YAPI */}
      <div className="three-column-layout">
        {/* SOL KOLON - MÜŞTERİLER */}
        <div className="column customers-column">
          <div className="column-header">
            <h2>MÜŞTERİLER</h2>
            <div className="customer-controls">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="İsim, telefon veya not ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")}>✕</button>
                )}
              </div>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  Tümü
                </button>
                <button 
                  className={`filter-btn ${filterType === 'debt' ? 'active' : ''}`}
                  onClick={() => setFilterType('debt')}
                >
                  Borçlu
                </button>
                <button 
                  className={`filter-btn ${filterType === 'paid' ? 'active' : ''}`}
                  onClick={() => setFilterType('paid')}
                >
                  Ödemiş
                </button>
                <button 
                  className={`filter-btn ${filterType === 'active' ? 'active' : ''}`}
                  onClick={() => setFilterType('active')}
                >
                  Aktif
                </button>
              </div>
            </div>
          </div>
          
          <div className="customer-list">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map(customer => (
                <div 
                  key={customer.id}
                  className={`customer-card ${customer.aktif === false ? 'inactive' : ''} ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="customer-info">
                    <div className="customer-header">
                      <div className="customer-name">
                        {customer.adSoyad}
                        {customer.aktif === false && (
                          <span className="inactive-badge">PASİF</span>
                        )}
                      </div>
                      <div className="customer-actions">
                        {hasPermission('customer.update') && (
                          <button 
                            className="btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMusteriDuzenleModal(customer);
                            }}
                            title="Müşteriyi düzenle"
                          >
                            ✏️
                          </button>
                        )}
                        {hasPermission('customer.delete') && (
                          <button 
                            className="btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMusteriSilmeOnay(customer);
                            }}
                            title="Müşteriyi sil"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="customer-phone">{customer.telefon || "Telefon yok"}</div>
                    {customer.not && (
                      <div className="customer-note">
                        <span className="note-label">Not:</span> {customer.not}
                      </div>
                    )}
                    <div className="customer-stats">
                      <span className="stat-item">📋 {customer.adisyonSayisi || 0} kayıt</span>
                      <span className="stat-item">📅 {formatShortDate(customer.sonIslemTarihi)}</span>
                      {Number(customer.indirim || 0) > 0 && (
                        <span className="stat-item discount">
                          🎁 {Number(customer.indirim || 0).toFixed(2)} ₺ indirim
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="customer-balance">
                    {Number(customer.netBorc || 0) > 0 ? (
                      <div className="balance-negative">-{Number(customer.netBorc || 0).toFixed(2)} ₺</div>
                    ) : (
                      <div className="balance-zero">0,00 ₺</div>
                    )}
                    {hasPermission('customer.update') && (
                      customer.aktif !== false ? (
                        <button 
                          className="btn-status"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMusteriDurumDegistir(customer.id, false);
                          }}
                          title="Müşteriyi pasif yap"
                        >
                          🔴
                        </button>
                      ) : (
                        <button 
                          className="btn-status active"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMusteriDurumDegistir(customer.id, true);
                          }}
                          title="Müşteriyi aktif yap"
                        >
                          🟢
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-list">
                {searchTerm ? "Aranan müşteri bulunamadı." : "Henüz müşteri kaydı yok."}
                {hasPermission('payment.create') && (
                  <button 
                    className="btn-manuel-kayit-small"
                    onClick={openManuelKayitModal}
                    style={{ marginTop: '10px' }}
                  >
                    İlk Müşteriyi Manuel Ekle
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* SAYFA BİLGİSİ */}
          <div className="page-info">
            <span>{filteredCustomers.length} müşteri gösteriliyor</span>
            {filterType !== 'all' && (
              <button 
                className="btn-clear-filter"
                onClick={() => setFilterType('all')}
              >
                Filtreyi Temizle
              </button>
            )}
          </div>
        </div>
        
        {/* ORTA KOLON - BORÇ KAYITLARI */}
        <div className="column debts-column">
          <div className="column-header">
            <h2>BORÇ KAYITLARI</h2>
            {selectedCustomer && (
              <div className="customer-summary">
                <div className="customer-detail-header">
                  <span className="customer-name">{selectedCustomer.adSoyad}</span>
                  {selectedCustomer.telefon && (
                    <span className="customer-phone-summary">📱 {selectedCustomer.telefon}</span>
                  )}
                </div>
                <div className="total-debt-section">
                  <span className="total-debt">
                    Kalan: {Number(selectedCustomer.netBorc || 0).toFixed(2)} ₺
                  </span>
                  {selectedCustomer.toplamBorc > 0 && (
                    <span className="total-original">
                      Toplam: {Number(selectedCustomer.toplamBorc || 0).toFixed(2)} ₺
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* TRANSFER BUTTONU */}
          {selectedCustomer && Number(selectedCustomer.netBorc || 0) > 0 && 
           selectedCustomer.aktif !== false && hasPermission('payment.transfer') && (
            <div className="transfer-button-container">
              <button 
                className="btn-transfer-open"
                onClick={openTransferModal}
                title="Bu müşterinin borcunu başka bir müşteriye aktar"
              >
                🔄 Borç Transferi
              </button>
            </div>
          )}
          
          <div className="debt-records">
            {selectedCustomer ? (
              debtRecords.length > 0 ? (
                debtRecords.map(record => (
                  <div 
                    key={record.id}
                    className={`debt-record ${selectedDebtRecord?.id === record.id ? 'selected' : ''}`}
                    onClick={() => handleDebtRecordSelect(record)}
                  >
                    <div className="debt-header">
                      <div className="table-info">
                        {record.masaNo === "BİLARDO" ? "🎱" : "🪑"} 
                        {record.masaNo === "TRANSFER" ? "🔄 Transfer" : ` Masa ${record.masaNo}`}
                      </div>
                      <div className="debt-amount">
                        <div className="original-amount">
                          {Number(record.borcTutari || 0).toFixed(2)} ₺
                        </div>
                        {Number(record.kalanBorc || 0) < Number(record.borcTutari || 0) && (
                          <div className="remaining-amount">
                            Kalan: {Number(record.kalanBorc || 0).toFixed(2)} ₺
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="debt-date">
                      {formatDate(record.tarih)}
                    </div>
                    <div className="debt-status">
                      {record.indirimUygulandi && "🎁 İndirimli • "}
                      {record.transferEdildi && "🔄 Transfer Edildi • "}
                      {Number(record.kalanBorc || 0) === 0 ? "✅ Ödendi" : 
                       Number(record.kalanBorc || 0) < Number(record.borcTutari || 0) ? "💰 Kısmen Ödendi" : "⏳ Ödenmedi"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-list">
                  Bu müşteriye ait borç kaydı bulunmuyor.
                </div>
              )
            ) : (
              <div className="empty-list">
                Müşteri seçiniz.
              </div>
            )}
          </div>
        </div>
        
        {/* SAĞ KOLON - DİKEY 2 BÖLMELİ */}
        <div className="details-column">
          
          {/* SOL BÖLÜM - ADISYON DETAYLARI */}
          <div className="adisyon-details-section">
            <div className="column-header">
              <h2>ADISYON DETAYLARI</h2>
              {adisyonDetails && adisyonDetails.kalanBorc !== undefined && (
                <div className="remaining-debt-badge">
                  Kalan Borç: {Number(adisyonDetails.kalanBorc || 0).toFixed(2)} ₺
                </div>
              )}
            </div>
            
            <div className="adisyon-content">
              {adisyonDetails ? (
                <>
                  {/* ADISYON ÖZETİ */}
                  <div className="adisyon-summary">
                    <div className="adisyon-summary-header">
                      <div className="adisyon-table-info">
                        <div className="table-number">
                          {adisyonDetails.masaNo === "BİLARDO" ? "🎱" : "🪑"}
                          {adisyonDetails.masaNo === "TRANSFER" ? "🔄" : ` ${adisyonDetails.masaNo}`}
                        </div>
                        <div className="table-type">
                          {adisyonDetails.masaNo === "BİLARDO" ? "Bilardo" : 
                           adisyonDetails.masaNo === "TRANSFER" ? "Borç Transferi" : "Restaurant"}
                        </div>
                      </div>
                      <div className="adisyon-amount">
                        <div className="original-amount">
                          {Number(adisyonDetails.toplamTutar || 0).toFixed(2)} ₺
                        </div>
                        {adisyonDetails.kalanBorc !== undefined && 
                         Number(adisyonDetails.kalanBorc || 0) < Number(adisyonDetails.toplamTutar || 0) && (
                          <div className="remaining-amount">
                            Kalan: {Number(adisyonDetails.kalanBorc || 0).toFixed(2)} ₺
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="adisyon-info-grid">
                      <div className="info-item">
                        <div className="info-label">Adisyon Tarihi</div>
                        <div className="info-value">{formatDate(adisyonDetails.tarih)}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Adisyon Türü</div>
                        <div className="info-value">
                          {adisyonDetails.tip === "BORC" ? "📝 Borç Kaydı" : "📝 Kayıt"}
                        </div>
                      </div>
                      {adisyonDetails.aciklama && (
                        <div className="info-item" style={{ gridColumn: "span 2" }}>
                          <div className="info-label">Açıklama</div>
                          <div className="info-value">{adisyonDetails.aciklama}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* ÜRÜN LİSTESİ */}
                  <div className="products-list-section">
                    <h3>ÜRÜN LİSTESİ</h3>
                    
                    {adisyonDetails.urunler && adisyonDetails.urunler.length > 0 ? (
                      <>
                        <div className="products-list-container">
                          {/* ÜRÜN BAŞLIKLARI */}
                          <div className="product-row" style={{ 
                            background: "#e8f5e9", 
                            fontWeight: "bold",
                            position: "sticky",
                            top: 0,
                            zIndex: 1
                          }}>
                            <div className="product-name">Ürün Adı</div>
                            <div className="product-quantity">Adet</div>
                            <div className="product-price">Birim Fiyat</div>
                            <div className="product-total">Toplam</div>
                          </div>
                          
                          {/* ÜRÜNLER - API'den gelen snapshot verileri */}
                          {adisyonDetails.urunler.map((product, index) => (
                            <div key={index} className="product-row">
                              <div className="product-name">{product.product_name_snapshot}</div>
                              <div className="product-quantity">{product.quantity}</div>
                              <div className="product-price">
                                {Number(product.unit_price_snap || 0).toFixed(2)} ₺
                              </div>
                              <div className="product-total">
                                {Number(product.line_total || 0).toFixed(2)} ₺
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* TOPLAMLAR - API'den gelen veriler */}
                        <div className="adisyon-total">
                          <div className="total-item">
                            <div className="total-label">TOPLAM TUTAR</div>
                            <div className="total-value" style={{ color: "#d32f2f", fontSize: "24px" }}>
                              {Number(adisyonDetails.toplamTutar || 0).toFixed(2)} ₺
                            </div>
                          </div>
                          {adisyonDetails.kalanBorc !== undefined && 
                           Number(adisyonDetails.kalanBorc || 0) < Number(adisyonDetails.toplamTutar || 0) && (
                            <div className="total-item">
                              <div className="total-label">KALAN BORÇ</div>
                              <div className="total-value" style={{ color: "#1976d2", fontSize: "20px" }}>
                                {Number(adisyonDetails.kalanBorc || 0).toFixed(2)} ₺
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="empty-adisyon">
                        <div>📄</div>
                        <div>Bu kayıtta ürün listesi bulunmuyor.</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-adisyon">
                  <div>📋</div>
                  <div>Borç kaydı seçiniz.</div>
                  <div style={{ fontSize: "12px", color: "#a1887f" }}>
                    Masa veya bilardo kaydı seçtiğinizde burada detaylar görünecektir.
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* SAĞ BÖLÜM - İŞLEM DETAYLARI */}
          <div className="islem-details-section">
            <div className="column-header">
              <h2>İŞLEM DETAYLARI</h2>
              {selectedCustomer && (
                <div className="customer-status-badge">
                  {selectedCustomer.aktif === false ? "🔴 PASİF" : "🟢 AKTİF"}
                </div>
              )}
            </div>
            
            <div className="islem-content">
              {/* TAHSILAT ALANI */}
              {hasPermission('payment.collect') && (
                <div className="payment-section">
                  <h3>TAHSİLAT</h3>
                  <div className="payment-form">
                    <div className="form-group">
                      <label>Tutar (₺)</label>
                      <input 
                        type="number" 
                        placeholder="0,00" 
                        value={tahsilatTutar}
                        onChange={(e) => setTahsilatTutar(e.target.value)}
                        min="0.01"
                        step="0.01"
                        max={Number(selectedCustomer?.netBorc || 0)}
                        disabled={!selectedCustomer || Number(selectedCustomer.netBorc || 0) <= 0 || selectedCustomer.aktif === false}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Ödeme Türü</label>
                      <div className="radio-options">
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="paymentType" 
                            value="NAKIT" 
                            checked={tahsilatTipi === "NAKIT"}
                            onChange={(e) => setTahsilatTipi(e.target.value)}
                            disabled={!selectedCustomer || selectedCustomer.aktif === false}
                          />
                          <span className="radio-custom"></span>
                          Nakit
                        </label>
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="paymentType" 
                            value="KART" 
                            checked={tahsilatTipi === "KART"}
                            onChange={(e) => setTahsilatTipi(e.target.value)}
                            disabled={!selectedCustomer || selectedCustomer.aktif === false}
                          />
                          <span className="radio-custom"></span>
                          Kart
                        </label>
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="paymentType" 
                            value="HAVALE" 
                            checked={tahsilatTipi === "HAVALE"}
                            onChange={(e) => setTahsilatTipi(e.target.value)}
                            disabled={!selectedCustomer || selectedCustomer.aktif === false}
                          />
                          <span className="radio-custom"></span>
                          Havale/EFT
                        </label>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Açıklama (Opsiyonel)</label>
                      <input 
                        type="text" 
                        placeholder="Tahsilat açıklaması..."
                        value={tahsilatNot}
                        onChange={(e) => setTahsilatNot(e.target.value)}
                        disabled={!selectedCustomer || selectedCustomer.aktif === false}
                      />
                    </div>
                    
                    <button 
                      className="btn-tahsilat"
                      onClick={handleCollectPayment}
                      disabled={!selectedCustomer || Number(selectedCustomer.netBorc || 0) <= 0 || !tahsilatTutar || selectedCustomer.aktif === false}
                    >
                      💰 TAHSİL ET
                    </button>
                    {selectedCustomer?.aktif === false && (
                      <div className="warning-message">
                        ⚠️ Pasif müşteriye tahsilat yapılamaz
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* İNDİRİM ALANI */}
              {hasPermission('payment.discount') && (
                <div className="discount-section">
                  <h3>İNDİRİM</h3>
                  <div className="discount-form">
                    <div className="form-group">
                      <label>İndirim Tutarı (₺)</label>
                      <input 
                        type="number" 
                        placeholder="0,00" 
                        value={indirimTutar}
                        onChange={(e) => setIndirimTutar(e.target.value)}
                        min="0.01"
                        step="0.01"
                        max={Number(selectedCustomer?.netBorc || 0)}
                        disabled={!selectedCustomer || Number(selectedCustomer.netBorc || 0) <= 0 || selectedCustomer.aktif === false}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>İndirim Nedeni (Opsiyonel)</label>
                      <input 
                        type="text" 
                        placeholder="Örn: Sadakat indirimi, hata düzeltme..."
                        value={indirimNot}
                        onChange={(e) => setIndirimNot(e.target.value)}
                        disabled={!selectedCustomer || selectedCustomer.aktif === false}
                      />
                    </div>
                    
                    <button 
                      className="btn-indirim"
                      onClick={handleApplyDiscount}
                      disabled={!selectedCustomer || Number(selectedCustomer.netBorc || 0) <= 0 || !indirimTutar || selectedCustomer.aktif === false}
                    >
                      🎁 İNDİRİM UYGULA
                    </button>
                    {selectedCustomer?.aktif === false && (
                      <div className="warning-message">
                        ⚠️ Pasif müşteriye indirim uygulanamaz
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* BORÇ HAREKETLERİ */}
              {selectedCustomer && transactionHistory.length > 0 && (
                <div className="transactions-section">
                  <h3>BORÇ HAREKETLERİ</h3>
                  <div className="transactions-list">
                    {transactionHistory.slice(0, 5).map((transaction, index) => (
                      <div key={index} className="transaction-item">
                        <div className={`transaction-type ${
                          transaction.tip.includes('İNDİRİM') ? 'type-discount' :
                          transaction.tip.includes('TAHSİLAT') ? 'type-payment' :
                          transaction.tip.includes('TRANSFER') ? 'type-transfer' :
                          transaction.tip.includes('BORÇ') ? 'type-debt' : ''
                        }`}>
                          {transaction.tip}
                        </div>
                        <div className={`transaction-amount ${
                          transaction.tip.includes('İNDİRİM') || 
                          transaction.tip.includes('TAHSİLAT') || 
                          transaction.tip.includes('TRANSFER EDİLDİ') ? 'amount-negative' : 'amount-positive'
                        }`}>
                          {transaction.tip.includes('İNDİRİM') || 
                           transaction.tip.includes('TAHSİLAT') || 
                           transaction.tip.includes('TRANSFER EDİLDİ') ? '-' : '+'}
                          {Number(transaction.tutar || 0).toFixed(2)} ₺
                        </div>
                        <div className="transaction-date">
                          {formatDate(transaction.tarih)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* BORÇ TRANSFER MODAL */}
      {transferModalOpen && (
        <BorcTransferModal
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onConfirm={handleTransferDebt}
          kaynakMusteri={selectedCustomer}
          musteriler={customers}
        />
      )}
      
      {/* MANUEL KAYIT MODAL */}
{manuelKayitModalOpen && (
  <div className="modal-overlay" onClick={() => setManuelKayitModalOpen(false)}>
    <div className="manuel-kayit-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>✍️ Manuel Borç Kaydı Ekle</h3>
      </div>
      
      <div className="modal-content">
        <div className="form-row">
          <div className="form-group">
            <label>Müşteri Adı Soyadı *</label>
            <input 
              type="text" 
              placeholder="Müşteri adı soyadı"
              value={yeniMusteriAdi}
              onChange={(e) => setYeniMusteriAdi(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Telefon (Opsiyonel)</label>
            <input 
              type="text" 
              placeholder="5xxxxxxxxx"
              value={yeniMusteriTelefon}
              onChange={(e) => setYeniMusteriTelefon(e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Borç Tutarı (₺) *</label>
            <input 
              type="number" 
              placeholder="0,00" 
              value={borcTutari}
              onChange={(e) => setBorcTutari(e.target.value)}
              min="0.01"
              step="0.01"
            />
          </div>
          
          <div className="form-group">
            <label>Masa No (Opsiyonel)</label>
            <input 
              type="text" 
              placeholder="Örn: MASA 1, BİLARDO"
              value={masaNo}
              onChange={(e) => setMasaNo(e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Açıklama (Opsiyonel)</label>
          <input 
            type="text" 
            placeholder="Borç kaydı açıklaması..."
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
          />
        </div>
        
        {/* ÜRÜN EKLEME BÖLÜMÜ */}
        <div className="urun-ekle-section">
          <h4>🛒 Ürün Ekle (Opsiyonel)</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>Ürün Adı</label>
              <input 
                type="text" 
                placeholder="Ürün adı"
                value={urunAdi}
                onChange={(e) => setUrunAdi(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Adet</label>
              <input 
                type="number" 
                placeholder="1" 
                value={urunAdet}
                onChange={(e) => setUrunAdet(e.target.value)}
                min="1"
                step="1"
              />
            </div>
            
            <div className="form-group">
              <label>Fiyat (₺)</label>
              <input 
                type="number" 
                placeholder="0,00" 
                value={urunFiyat}
                onChange={(e) => setUrunFiyat(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>&nbsp;</label>
              <button 
                className="btn-urun-ekle"
                onClick={urunEkle}
              >
                ➕ Ekle
              </button>
            </div>
          </div>
          
          {urunler.length > 0 && (
            <div className="urun-listesi">
              {urunler.map(urun => (
                <div key={urun.id} className="urun-item">
                  <div>{urun.ad}</div>
                  <div>{urun.adet} adet</div>
                  <div>{Number(urun.fiyat || 0).toFixed(2)} ₺</div>
                  <button 
                    className="btn-urun-sil"
                    onClick={() => urunSil(urun.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            className="btn-iptal"
            onClick={() => setManuelKayitModalOpen(false)}
          >
            İptal
          </button>
          <button 
            className="btn-kaydet"
            onClick={handleManuelKayit}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      
      {/* MÜŞTERİ DÜZENLEME MODAL */}
      {musteriDuzenleModalOpen && (
        <div className="modal-overlay" onClick={() => setMusteriDuzenleModalOpen(false)}>
          <div className="musteri-duzenle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Müşteri Düzenle</h3>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Müşteri Adı Soyadı *</label>
                <input 
                  type="text" 
                  placeholder="Müşteri adı soyadı"
                  value={duzenleAdSoyad}
                  onChange={(e) => setDuzenleAdSoyad(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Telefon (Opsiyonel)</label>
                <input 
                  type="text" 
                  placeholder="5xxxxxxxxx"
                  value={duzenleTelefon}
                  onChange={(e) => setDuzenleTelefon(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Not (Opsiyonel)</label>
                <textarea 
                  placeholder="Müşteri notları..."
                  value={duzenleNot}
                  onChange={(e) => setDuzenleNot(e.target.value)}
                  rows="3"
                />
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-iptal"
                  onClick={() => setMusteriDuzenleModalOpen(false)}
                >
                  İptal
                </button>
                <button 
                  className="btn-kaydet"
                  onClick={handleMusteriDuzenle}
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* MÜŞTERİ SİLME ONAY MODAL */}
      {silmeOnayModalOpen && (
        <div className="modal-overlay" onClick={() => setSilmeOnayModalOpen(false)}>
          <div className="silme-onay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <h3>⚠️ Müşteri Sil</h3>
            </div>
            
            <div className="modal-content">
              <p>
                <strong>{silinecekMusteri?.adSoyad}</strong> müşterisini silmek istediğinize emin misiniz?
              </p>
              <p className="warning-text">
                Bu işlem geri alınamaz! Müşteri ve tüm borç kayıtları silinecektir.
              </p>
              
              <div className="musteri-bilgileri">
                <div className="info-item">
                  <span className="info-label">Toplam Borç Kaydı:</span>
                  <span className="info-value">{silinecekMusteri?.adisyonSayisi || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Kalan Borç:</span>
                  <span className="info-value">{Number(silinecekMusteri?.netBorc || 0).toFixed(2)} ₺</span>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-iptal"
                  onClick={() => setSilmeOnayModalOpen(false)}
                >
                  Vazgeç
                </button>
                <button 
                  className="btn-sil"
                  onClick={handleMusteriSil}
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}