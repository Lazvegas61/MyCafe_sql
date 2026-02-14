import React, { useEffect, useMemo, useState } from "react";
import "./Adisyon.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axiosConfig"; // ✅ MyCafe API entegrasyonu

// ❌ LOCALSTORAGE KEY'LERİ SİLİNDİ - MyCafe Anayasası Madde 3
// Tüm veri API'den gelecek
// mc_finans_havuzu ve diğer finansal araçlar KALDIRILDI

export default function Adisyon() {
    const navigate = useNavigate();
    const { user, loading, logout } = useAuth();
    
    // --------------------------------------------------
    // GENEL STATE
    // --------------------------------------------------
    const [masaNo, setMasaNo] = useState("MASA 1");
    const [gercekMasaNo, setGercekMasaNo] = useState("1");
    const [adisyon, setAdisyon] = useState(null);
    const [gecenSure, setGecenSure] = useState("00:00");
    const [indirimInput, setIndirimInput] = useState("");
    const [kapanisMesaji, setKapanisMesaji] = useState("");

    // MENÜ
    const [urunler, setUrunler] = useState([]);
    const [kategoriler, setKategoriler] = useState([]);
    const [aktifKategoriId, setAktifKategoriId] = useState(null);
    const [seciliUrun, setSeciliUrun] = useState(null);
    const [adetPanelAcik, setAdetPanelAcik] = useState(false);
    const [adet, setAdet] = useState(1);
    
    // ÜRÜN ARAMA
    const [urunArama, setUrunArama] = useState("");

    // SİPARİŞ YEMEK alanı
    const [siparisYemekFiyat, setSiparisYemekFiyat] = useState("");
    const [siparisYemekNot, setSiparisYemekNot] = useState("");

    // MÜŞTERİ / HESABA YAZ
    const [musteriler, setMusteriler] = useState([]);
    const [seciliMusteriId, setSeciliMusteriId] = useState(null);
    const [yeniMusteriAdSoyad, setYeniMusteriAdSoyad] = useState("");
    const [yeniMusteriTelefon, setYeniMusteriTelefon] = useState("");
    const [yeniMusteriNot, setYeniMusteriNot] = useState("");
    const [borcTutarInput, setBorcTutarInput] = useState("");
    const [hesabaYazModu, setHesabaYazModu] = useState(false);
    const [hesabaYazSonrasiMasaDon, setHesabaYazSonrasiMasaDon] = useState(false);

    // ÖDEME SÖZÜ POPUP
    const [odemeSozuPopup, setOdemeSozuPopup] = useState(null);

    // --------------------------------------------------
    // ÇOKLU HESABI AYIR (MULTIPLE SPLIT BILL) STATE'LERİ
    // --------------------------------------------------
    const [splitAdisyonlar, setSplitAdisyonlar] = useState([]);
    const [splitAciklamaInput, setSplitAciklamaInput] = useState("");

    // --------------------------------------------------
    // BİLARDO MASASI ÖZEL DURUMU
    // --------------------------------------------------
    const [isBilardo, setIsBilardo] = useState(false);
    const [bilardoBaslangicSaat, setBilardoBaslangicSaat] = useState(null);
    const [bilardoSure, setBilardoSure] = useState("00:00");

    // --------------------------------------------------
    // BİLARDO TRANSFER DETAYLARI
    // --------------------------------------------------
    const [bilardoTransferDetaylari, setBilardoTransferDetaylari] = useState(null);
    const [bilardoEkUrunler, setBilardoEkUrunler] = useState([]);

    // --------------------------------------------------
    // API'DEN GELEN VERİLER
    // --------------------------------------------------
    const [toplam, setToplam] = useState(0); // ✅ Backend'den gelecek
    const [kalan, setKalan] = useState(0);   // ✅ Backend'den gelecek
    const [yapilanOdemeler, setYapilanOdemeler] = useState(0); // ✅ Backend'den gelecek
    const [indirim, setIndirim] = useState(0); // ✅ Backend'den gelecek
    const [odemeler, setOdemeler] = useState([]); // ✅ Backend'den gelecek

    // --------------------------------------------------
    // AUTH KONTROLÜ
    // --------------------------------------------------
    useEffect(() => {
        if (!loading && !user) {
            console.warn('⚠️ [AUTH] Adisyon sayfasına erişim reddedildi - Kullanıcı yok');
            navigate("/login");
        }
        
        // Garson rolü kontrolü - MyCafe Anayasası Madde 5
        if (user && user.role_code === 'GARSON') {
            console.log('✅ Garson yetkisi: Masa ve adisyon işlemleri');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return <div>Yükleniyor...</div>;
    }

    if (!user) {
        return <div>Yetkiniz yok. Yönlendiriliyorsunuz...</div>;
    }

    // --------------------------------------------------
    // API FONKSİYONLARI - MyCafe Backend Entegrasyonu
    // --------------------------------------------------
    
    // 1. ADİSYON YÜKLE
    const loadAdisyon = async (masaId) => {
        try {
            const response = await api.get(`/invoices/open?table_id=${masaId}`);
            if (response.data) {
                setAdisyon(response.data);
                // Backend'den gelen finansal veriler
                setToplam(response.data.total_amount || 0);
                setKalan(response.data.remaining_amount || 0);
                setIndirim(response.data.discount || 0);
                setYapilanOdemeler(response.data.paid_amount || 0);
                setOdemeler(response.data.payments || []);
                
                console.log('✅ Adisyon backend\'den yüklendi:', response.data);
            }
        } catch (error) {
            console.error('❌ Adisyon yüklenemedi:', error);
            // Yeni adisyon oluştur
            createNewAdisyon(masaId);
        }
    };

    // 2. YENİ ADİSYON OLUŞTUR
    const createNewAdisyon = async (masaId) => {
        try {
            const invoiceData = {
                table_id: masaId,
                customer_id: null,
                notes: "",
                is_billiard: isBilardo
            };
            
            const response = await api.post('/invoices/', invoiceData);
            setAdisyon(response.data);
            console.log('✅ Yeni adisyon oluşturuldu:', response.data);
        } catch (error) {
            console.error('❌ Adisyon oluşturulamadı:', error);
            alert('Adisyon oluşturulamadı. Lütfen tekrar deneyin.');
        }
    };

    // 3. ÜRÜN EKLE
    const addProductToInvoice = async (productId, quantity = 1) => {
        if (!adisyon?.id) return;
        
        try {
            const lineItem = {
                invoice_id: adisyon.id,
                product_id: productId,
                quantity: quantity,
                unit_price: 0, // Backend snapshot fiyatı kullanacak
                notes: ""
            };
            
            const response = await api.post(`/invoices/${adisyon.id}/items`, lineItem);
            
            // Adisyonu yeniden yükle
            loadAdisyon(gercekMasaNo);
            console.log('✅ Ürün eklendi:', response.data);
        } catch (error) {
            console.error('❌ Ürün eklenemedi:', error);
            alert('Ürün eklenemedi: ' + (error.response?.data?.detail || error.message));
        }
    };

    // 4. ÜRÜNLERİ YÜKLE
    const loadProducts = async () => {
        try {
            const response = await api.get('/products/active');
            setUrunler(response.data);
            console.log('✅ Ürünler yüklendi:', response.data.length);
        } catch (error) {
            console.error('❌ Ürünler yüklenemedi:', error);
        }
    };

    // 5. KATEGORİLERİ YÜKLE
    const loadCategories = async () => {
        try {
            const response = await api.get('/categories');
            setKategoriler(response.data);
            console.log('✅ Kategoriler yüklendi:', response.data.length);
        } catch (error) {
            console.error('❌ Kategoriler yüklenemedi:', error);
        }
    };

    // 6. MÜŞTERİLERİ YÜKLE
    const loadCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setMusteriler(response.data);
            console.log('✅ Müşteriler yüklendi:', response.data.length);
        } catch (error) {
            console.error('❌ Müşteriler yüklenemedi:', error);
        }
    };

    // 7. ÖDEME EKLE
    const addPayment = async (paymentType, amount) => {
        if (!adisyon?.id) return;
        
        try {
            const paymentData = {
                invoice_id: adisyon.id,
                payment_type: paymentType,
                amount: amount,
                notes: ""
            };
            
            const response = await api.post('/payments/process', paymentData);
            
            // Adisyonu yeniden yükle
            loadAdisyon(gercekMasaNo);
            console.log('✅ Ödeme eklendi:', response.data);
        } catch (error) {
            console.error('❌ Ödeme eklenemedi:', error);
            alert('Ödeme eklenemedi: ' + (error.response?.data?.detail || error.message));
        }
    };

    // 8. ADİSYON KAPAT
    const closeInvoice = async () => {
        if (!adisyon?.id) return;
        
        try {
            const response = await api.post(`/invoices/${adisyon.id}/close`);
            
            setKapanisMesaji(`✅ Adisyon başarıyla kapatıldı! Tutar: ${response.data.total_amount} TL`);
            console.log('✅ Adisyon kapatıldı:', response.data);
            
            // 2 saniye sonra ana sayfaya dön
            setTimeout(() => {
                navigate(isBilardo ? "/bilardo" : "/ana");
            }, 2000);
        } catch (error) {
            console.error('❌ Adisyon kapatılamadı:', error);
            alert('Adisyon kapatılamadı: ' + (error.response?.data?.detail || error.message));
        }
    };

    // 9. BORÇ OLUŞTUR (HESABA YAZ)
    const createDebt = async (customerId, amount, description) => {
        try {
            const debtData = {
                customer_id: customerId,
                invoice_id: adisyon?.id,
                amount: amount,
                description: description || `Hesaba Yaz - Masa ${gercekMasaNo}`,
                due_date: null // Ödeme sözü tarihi (opsiyonel)
            };
            
            const response = await api.post('/customers/debt', debtData);
            
            // Aynı zamanda ödeme olarak da kaydet
            await addPayment('HESABA_YAZ', amount);
            
            alert(`✅ Borç kaydedildi! ${amount} TL müşteri hesabına yazıldı.`);
            console.log('✅ Borç oluşturuldu:', response.data);
            
            return response.data;
        } catch (error) {
            console.error('❌ Borç oluşturulamadı:', error);
            alert('Borç oluşturulamadı: ' + (error.response?.data?.detail || error.message));
            return null;
        }
    };

    // 10. İNDİRİM UYGULA
    const applyDiscount = async (discountAmount) => {
        if (!adisyon?.id) return;
        
        try {
            const response = await api.post(`/invoices/${adisyon.id}/discount`, {
                discount_amount: discountAmount
            });
            
            // Adisyonu yeniden yükle
            loadAdisyon(gercekMasaNo);
            console.log('✅ İndirim uygulandı:', response.data);
        } catch (error) {
            console.error('❌ İndirim uygulanamadı:', error);
            alert('İndirim uygulanamadı: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --------------------------------------------------
    // URL'DEN MASA NUMARASINI AL
    // --------------------------------------------------
    useEffect(() => {
        const path = window.location.pathname;
        const parts = path.split("/");
        const urlParam = parts[2] || "1";
        
        const masaNum = urlParam.replace(/\D+/g, "") || "1";
        setMasaNo(`MASA ${masaNum}`);
        setGercekMasaNo(masaNum);
        
        console.log('📌 Masa numarası alındı:', masaNum);
        
        // Masa bilgilerini yükle
        loadTableInfo(masaNum);
    }, []);

    // 11. MASA BİLGİLERİNİ YÜKLE
    const loadTableInfo = async (tableId) => {
        try {
            const response = await api.get(`/tables/${tableId}`);
            const tableData = response.data;
            
            setIsBilardo(tableData.is_billiard || false);
            
            // Bilardo masası ise özel işlemler
            if (tableData.is_billiard) {
                loadBilardoInfo(tableId);
            }
            
            console.log('✅ Masa bilgileri yüklendi:', tableData);
        } catch (error) {
            console.error('❌ Masa bilgileri yüklenemedi:', error);
        }
    };

    // 12. BİLARDO BİLGİLERİNİ YÜKLE
    const loadBilardoInfo = async (tableId) => {
        try {
            const response = await api.get(`/billiard/session?table_id=${tableId}`);
            const sessionData = response.data;
            
            if (sessionData) {
                setBilardoBaslangicSaat(sessionData.start_time);
                setBilardoTransferDetaylari(sessionData.transfer_details || null);
                setBilardoEkUrunler(sessionData.extra_items || []);
                
                console.log('✅ Bilardo oturumu yüklendi:', sessionData);
            }
        } catch (error) {
            console.error('❌ Bilardo bilgileri yüklenemedi:', error);
        }
    };

    // --------------------------------------------------
    // SAYFA YÜKLENDİĞİNDE VERİLERİ ÇEK
    // --------------------------------------------------
    useEffect(() => {
        if (!gercekMasaNo) return;
        
        // 1. Adisyonu yükle
        loadAdisyon(gercekMasaNo);
        
        // 2. Ürünleri yükle
        loadProducts();
        
        // 3. Kategorileri yükle
        loadCategories();
        
        // 4. Müşterileri yükle
        loadCustomers();
        
        console.log('🔄 Sayfa verileri yükleniyor...');
    }, [gercekMasaNo]);

    // --------------------------------------------------
    // GEÇEN SÜRE HESAPLA (SADECE GÖSTERİM - HESAPLAMA DEĞİL)
    // --------------------------------------------------
    useEffect(() => {
        if (!adisyon?.opened_at) return;
        
        const calculateTime = () => {
            const openedAt = new Date(adisyon.opened_at);
            const now = new Date();
            const diffMs = now - openedAt;
            const minutes = Math.floor(diffMs / 60000);
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            const formattedHours = String(hours).padStart(2, "0");
            const formattedMinutes = String(remainingMinutes).padStart(2, "0");
            
            setGecenSure(`${formattedHours}:${formattedMinutes}`);
            
            // Bilardo süresi
            if (isBilardo && bilardoBaslangicSaat) {
                const bilardoStart = new Date(bilardoBaslangicSaat);
                const bilardoDiffMs = now - bilardoStart;
                const bilardoMinutes = Math.floor(bilardoDiffMs / 60000);
                const bilardoHours = Math.floor(bilardoMinutes / 60);
                const bilardoRemainingMinutes = bilardoMinutes % 60;
                
                const bilardoFormattedHours = String(bilardoHours).padStart(2, "0");
                const bilardoFormattedMinutes = String(bilardoRemainingMinutes).padStart(2, "0");
                
                setBilardoSure(`${bilardoFormattedHours}:${bilardoFormattedMinutes}`);
            }
        };
        
        calculateTime();
        const timer = setInterval(calculateTime, 60000);
        
        return () => clearInterval(timer);
    }, [adisyon?.opened_at, isBilardo, bilardoBaslangicSaat]);

    // --------------------------------------------------
    // FİLTRELİ ÜRÜNLER (SADECE GÖSTERİM)
    // --------------------------------------------------
    const filtreliUrunler = useMemo(() => {
        if (urunArama.trim() !== "") {
            const aramaTerimi = urunArama.toLowerCase();
            return urunler.filter((u) =>
                u.product_name.toLowerCase().includes(aramaTerimi)
            );
        }
        
        if (!aktifKategoriId) return [];
        
        return urunler.filter((u) => u.category_id === aktifKategoriId);
    }, [urunler, aktifKategoriId, urunArama]);

    // --------------------------------------------------
    // UI KATEGORİLERİ (SADECE GÖSTERİM)
    // --------------------------------------------------
    const uiKategorileri = useMemo(() => {
        return [...kategoriler];
    }, [kategoriler]);

    // --------------------------------------------------
    // AKTİF KATEGORİ ADINI AL (SADECE GÖSTERİM)
    // --------------------------------------------------
    const aktifKategoriAdi = useMemo(() => {
        if (!aktifKategoriId) return "";
        
        const kategori = kategoriler.find(k => k.id === aktifKategoriId);
        return kategori ? kategori.category_name : "";
    }, [aktifKategoriId, kategoriler]);

    // --------------------------------------------------
    // SİPARİŞ YEMEK EKLE
    // --------------------------------------------------
    const addSiparisYemek = async () => {
        if (!adisyon?.id) return;
        
        const fiyat = Number(siparisYemekFiyat);
        if (!fiyat || fiyat <= 0) {
            alert("Geçerli bir fiyat giriniz.");
            return;
        }
        
        try {
            const customItem = {
                invoice_id: adisyon.id,
                product_name: "SİPARİŞ YEMEK",
                quantity: adet,
                unit_price: fiyat,
                notes: siparisYemekNot,
                is_custom: true
            };
            
            const response = await api.post(`/invoices/${adisyon.id}/custom-item`, customItem);
            
            // Adisyonu yeniden yükle
            loadAdisyon(gercekMasaNo);
            
            // Paneli kapat
            setAdetPanelAcik(false);
            setSeciliUrun(null);
            setSiparisYemekFiyat("");
            setSiparisYemekNot("");
            
            console.log('✅ Sipariş yemek eklendi:', response.data);
        } catch (error) {
            console.error('❌ Sipariş yemek eklenemedi:', error);
            alert('Sipariş yemek eklenemedi: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --------------------------------------------------
    // ÜRÜNE TIKLANDI
    // --------------------------------------------------
    const uruneTiklandi = async (urun) => {
        if (!adisyon?.id) {
            alert("Adisyon bulunamadı.");
            return;
        }
        
        // Sipariş yemek özel durumu
        if (urun.id === "siparis-yemek") {
            setSeciliUrun(urun);
            setSiparisYemekFiyat("");
            setSiparisYemekNot("");
            setAdet(1);
            setAdetPanelAcik(true);
            return;
        }
        
        // Normal ürün ekle
        await addProductToInvoice(urun.id, 1);
    };

    // --------------------------------------------------
    // SATIR SİLME
    // --------------------------------------------------
    const deleteLineItem = async (lineItemId) => {
        if (!window.confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
        
        try {
            await api.delete(`/invoices/items/${lineItemId}`);
            
            // Adisyonu yeniden yükle
            loadAdisyon(gercekMasaNo);
            console.log('✅ Satır silindi');
        } catch (error) {
            console.error('❌ Satır silinemedi:', error);
            alert('Satır silinemedi: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --------------------------------------------------
    // ADET ARTIR/AZALT
    // --------------------------------------------------
    const updateLineItemQuantity = async (lineItemId, newQuantity) => {
        if (newQuantity < 1) {
            // Adet 0 veya negatifse satırı sil
            await deleteLineItem(lineItemId);
            return;
        }
        
        try {
            await api.patch(`/invoices/items/${lineItemId}`, {
                quantity: newQuantity
            });
            
            // Adisyonu yeniden yükle
            loadAdisyon(gercekMasaNo);
            console.log('✅ Adet güncellendi:', newQuantity);
        } catch (error) {
            console.error('❌ Adet güncellenemedi:', error);
            alert('Adet güncellenemedi: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --------------------------------------------------
    // İNDİRİM UYGULA (ENTER İLE)
    // --------------------------------------------------
    const handleIndirimEnter = async (e) => {
        if (e.key !== "Enter") return;
        
        const discountAmount = Number(indirimInput);
        if (isNaN(discountAmount) || discountAmount < 0) {
            alert("Geçerli bir indirim tutarı giriniz.");
            return;
        }
        
        await applyDiscount(discountAmount);
        setIndirimInput("");
    };

    // --------------------------------------------------
    // İNDİRİM SIFIRLA
    // --------------------------------------------------
    const resetDiscount = async () => {
        await applyDiscount(0);
        setIndirimInput("");
    };

    // --------------------------------------------------
    // ÖDEME EKLE
    // --------------------------------------------------
    const handleOdemeEkle = async () => {
        if (!adisyon?.id) return;
        
        const paymentAmount = kalan; // Kalan tutarın tamamını öde
        if (paymentAmount <= 0) {
            alert("Ödeme yapılacak tutar yok.");
            return;
        }
        
        await addPayment('NAKIT', paymentAmount);
    };

    // --------------------------------------------------
    // HESABA YAZ KAYDET
    // --------------------------------------------------
    const handleHesabaYazKaydet = async () => {
        if (!adisyon?.id) return;
        
        const debtAmount = Number(borcTutarInput);
        if (!debtAmount || debtAmount <= 0) {
            alert("Borç tutarı giriniz.");
            return;
        }
        
        if (debtAmount > kalan) {
            alert(`Borç tutarı kalan tutardan (${kalan.toFixed(2)} TL) fazla olamaz!`);
            return;
        }
        
        let customerId = seciliMusteriId;
        
        // Yeni müşteri oluştur
        if (!customerId) {
            if (!yeniMusteriAdSoyad.trim()) {
                alert("Yeni müşteri için Ad Soyad giriniz.");
                return;
            }
            
            if (!yeniMusteriTelefon.trim()) {
                alert("Yeni müşteri için Telefon numarası giriniz.");
                return;
            }
            
            try {
                const customerData = {
                    full_name: yeniMusteriAdSoyad.trim(),
                    phone: yeniMusteriTelefon.trim(),
                    notes: yeniMusteriNot.trim()
                };
                
                const response = await api.post('/customers/', customerData);
                customerId = response.data.id;
                setSeciliMusteriId(customerId);
                
                // Müşteri listesini yenile
                loadCustomers();
            } catch (error) {
                console.error('❌ Müşteri oluşturulamadı:', error);
                alert('Müşteri oluşturulamadı: ' + (error.response?.data?.detail || error.message));
                return;
            }
        }
        
        // Borç oluştur
        const description = `Hesaba Yaz - ${isBilardo ? 'Bilardo' : 'Masa'} ${gercekMasaNo}`;
        const debtResult = await createDebt(customerId, debtAmount, description);
        
        if (debtResult) {
            // Formu temizle
            setHesabaYazModu(false);
            setSeciliMusteriId(null);
            setYeniMusteriAdSoyad("");
            setYeniMusteriTelefon("");
            setYeniMusteriNot("");
            setBorcTutarInput("");
            setHesabaYazSonrasiMasaDon(true);
        }
    };

    // --------------------------------------------------
    // HESABA YAZ İPTAL
    // --------------------------------------------------
    const handleHesabaYazIptal = () => {
        setHesabaYazModu(false);
        setSeciliMusteriId(null);
        setYeniMusteriAdSoyad("");
        setYeniMusteriTelefon("");
        setYeniMusteriNot("");
        setBorcTutarInput("");
        console.log("🔴 HESABA_YAZ modu iptal edildi!");
    };

    // --------------------------------------------------
    // ADİSYON KAPAT
    // --------------------------------------------------
    const handleAdisyonKapat = async () => {
        console.log('🟡 Adisyon kapatma başlatılıyor...');
        
        if (!user) {
            console.error('❌ Kullanıcı oturumu kapalı');
            alert("Oturumunuz kapandı. Lütfen tekrar giriş yapın.");
            navigate("/login");
            return;
        }
        
        if (!adisyon) {
            alert("Adisyon bulunamadı.");
            return;
        }
        
        // Kalan tutar kontrolü (Backend'den gelen veri)
        if (kalan > 0.01) {
            alert("Kalan tutar ödenmeden adisyon kapatılamaz.");
            return;
        }
        
        // Boş adisyon kontrolü
        const isEmptyInvoice = (!adisyon.line_items || adisyon.line_items.length === 0) && kalan === 0;
        
        if (isEmptyInvoice) {
            if (!window.confirm("Bu adisyonda ürün yok. Boş masa olarak kapatılsın mı?")) {
                return;
            }
        }
        
        await closeInvoice();
    };

    // --------------------------------------------------
    // MASAYA DÖN
    // --------------------------------------------------
    const handleMasayaDon = () => {
        if (isBilardo) {
            navigate("/bilardo");
        } else {
            navigate("/ana");
        }
    };

    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------
    if (!adisyon) {
        return <div>Adisyon yükleniyor...</div>;
    }

    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                background: "#f5e7d0",
                color: "#4b2e05",
                padding: "12px",
                boxSizing: "border-box",
                gap: "12px",
            }}
        >
            {/* SÜTUN 1: SOL PANEL – ÖDEMELER */}
            <div
                style={{
                    flex: "0 0 23%",
                    background: "#fdf4e4",
                    borderRadius: "12px",
                    padding: "12px",
                    boxSizing: "border-box",
                    boxShadow: "0 0 14px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                }}
            >
                <div>
                    <div
                        style={{
                            fontWeight: "bold",
                            fontSize: "22px",
                            marginBottom: "10px",
                            textAlign: "center",
                            letterSpacing: "1px",
                        }}
                    >
                        ÖDEMELER
                    </div>

                    {/* MASA BİLGİSİ */}
                    <div style={{
                        marginBottom: "10px",
                        padding: "8px",
                        borderRadius: "6px",
                        background: isBilardo ? "#e8f5e9" : "#e8f4fc",
                        color: isBilardo ? "#1e8449" : "#1a5fb4",
                        fontSize: "14px",
                        textAlign: "center",
                        border: isBilardo ? "2px solid #27ae60" : "2px solid #1a5fb4",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px"
                    }}>
                        {isBilardo ? `🎱 BİLARDO ${gercekMasaNo}` : `🍽️ MASA ${gercekMasaNo}`}
                        <span style={{
                            fontSize: "12px",
                            background: isBilardo ? "#27ae60" : "#1a5fb4",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            marginLeft: "5px"
                        }}>
                            {gecenSure}
                        </span>
                    </div>

                    {/* BİLARDO BİLGİLERİ */}
                    {isBilardo && bilardoBaslangicSaat && (
                        <div style={{
                            marginBottom: "10px",
                            padding: "5px",
                            borderRadius: "6px",
                            background: "#fff3cd",
                            color: "#856404",
                            fontSize: "12px",
                            textAlign: "center",
                            border: "1px solid #ffeaa7",
                            fontWeight: "bold"
                        }}>
                            🎱 Bilardo Süresi: {bilardoSure}
                        </div>
                    )}

                    {/* ÖDEME LİSTESİ */}
                    <div
                        style={{
                            minHeight: "100px",
                            maxHeight: "200px",
                            overflowY: "auto",
                            border: "1px solid #ecd3a5",
                            borderRadius: "8px",
                            padding: "8px",
                            marginBottom: "10px",
                            background: "#fff",
                        }}
                    >
                        {odemeler.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "#a0a0a0",
                                    padding: "10px",
                                }}
                            >
                                Henüz ödeme yok.
                            </div>
                        ) : (
                            odemeler.map((payment) => (
                                <div
                                    key={payment.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        borderBottom: "1px dashed #f4e0c2",
                                        padding: "4px 0",
                                    }}
                                >
                                    <span style={{ fontSize: "14px", fontWeight: "600" }}>
                                        {payment.payment_type === 'NAKIT' ? 'Nakit' : 
                                         payment.payment_type === 'KART' ? 'Kredi Kartı' :
                                         payment.payment_type === 'HAVALE' ? 'Havale/EFT' :
                                         payment.payment_type === 'HESABA_YAZ' ? 'Hesaba Yaz' :
                                         payment.payment_type}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                                            {Number(payment.amount || 0).toFixed(2)} TL
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* TOPLAM / KALAN ALANI */}
                    <div
                        style={{
                            marginTop: "10px",
                            padding: "10px",
                            borderRadius: "8px",
                            background: "#e8d8c3",
                            border: "1px solid #bfa37d",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                            }}
                        >
                            <span style={{ fontWeight: "500" }}>TOPLAM:</span>
                            <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                                {toplam.toFixed(2)} TL
                            </span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                                color: "red",
                            }}
                        >
                            <span style={{ fontWeight: "500" }}>İndirim:</span>
                            <span style={{ fontWeight: "bold" }}>
                                -{indirim.toFixed(2)} TL
                            </span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                            }}
                        >
                            <span style={{ fontWeight: "500" }}>Ödenen:</span>
                            <span style={{ fontWeight: "bold", color: "green" }}>
                                {yapilanOdemeler.toFixed(2)} TL
                            </span>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                borderTop: "1px solid #bfa37d",
                                paddingTop: "6px",
                                marginTop: "6px",
                            }}
                        >
                            <span
                                style={{ fontWeight: "bold", fontSize: "18px", color: "darkred" }}
                            >
                                KALAN
                            </span>
                            <span
                                style={{ fontWeight: "bold", fontSize: "18px", color: "darkred" }}
                            >
                                {kalan.toFixed(2)} TL
                            </span>
                        </div>
                    </div>

                    {/* ÖDEME TİPİ SEÇİMİ */}
                    <div
                        style={{
                            marginTop: "14px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                        }}
                    >
                        {[
                            { tip: "NAKIT", etiket: "Nakit" },
                            { tip: "KART", etiket: "K.Kartı" },
                            { tip: "HAVALE", etiket: "Havale" },
                            { tip: "HESABA_YAZ", etiket: "Hesaba Yaz" },
                        ].map((o) => (
                            <button
                                key={o.tip}
                                onClick={() => {
                                    if (o.tip === "HESABA_YAZ") {
                                        setHesabaYazModu(true);
                                        setBorcTutarInput(kalan.toFixed(2));
                                    } else {
                                        addPayment(o.tip, kalan);
                                    }
                                }}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: "20px",
                                    border: "1px solid #bfa37d",
                                    background: "#ffffff",
                                    cursor: "pointer",
                                    fontSize: "15px",
                                    fontWeight: "500",
                                }}
                            >
                                {o.etiket}
                            </button>
                        ))}
                    </div>

                    {/* İNDİRİM */}
                    <div style={{ marginTop: "14px" }}>
                        <label>İndirim (Enter ile uygula)</label>
                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                            <input
                                type="number"
                                value={indirimInput}
                                onChange={(e) => setIndirimInput(e.target.value)}
                                onKeyDown={handleIndirimEnter}
                                style={{
                                    flex: 1,
                                    padding: "8px",
                                    borderRadius: "8px",
                                    border: "1px solid #bfa37d",
                                    fontSize: "15px",
                                    background: "#fff",
                                }}
                            />
                            <button
                                onClick={resetDiscount}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #bfa37d",
                                    background: "#fdf4e4",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                Sıfırla
                            </button>
                        </div>
                    </div>
                </div>

                {/* ALT BUTONLAR */}
                <div style={{ borderTop: "1px solid #ecd3a5", paddingTop: "12px" }}>
                    {/* ÖDEME YAP / ADİSYON KAPAT */}
                    <button
                        onClick={handleAdisyonKapat}
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "10px",
                            border: "none",
                            background: kalan === 0 ? "#27ae60" : "#95a5a6",
                            color: "#fff",
                            cursor: kalan === 0 ? "pointer" : "not-allowed",
                            fontSize: "16px",
                            fontWeight: "bold",
                            marginBottom: "8px",
                        }}
                        disabled={kalan > 0}
                        title={kalan > 0 ? "Kalan tutar ödenmeden adisyon kapatılamaz" : "Masayı kapat"}
                    >
                        MASAYI KAPAT
                    </button>

                    {kapanisMesaji && (
                        <div
                            style={{
                                marginBottom: "8px",
                                padding: "8px",
                                borderRadius: "8px",
                                background: "#e8f8f1",
                                color: "#1e8449",
                                fontSize: "14px",
                                textAlign: "center",
                            }}
                        >
                            {kapanisMesaji}
                        </div>
                    )}

                    {/* MASAYA DÖN */}
                    <button
                        onClick={handleMasayaDon}
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "10px",
                            border: "1px solid #bfa37d",
                            background: "#fdf4e4",
                            cursor: "pointer",
                            fontSize: "15px",
                        }}
                    >
                        {isBilardo ? "BİLARDO SAYFASINA DÖN" : "ANA SAYFAYA DÖN"}
                    </button>
                </div>
            </div>

            {/* SÜTUN 2: ORTA PANEL – ADİSYON GÖSTERİMİ */}
            <div
                style={{
                    flex: 1.2,
                    background: "#fff7e6",
                    borderRadius: "12px",
                    padding: "12px",
                    boxSizing: "border-box",
                    boxShadow: "0 0 14px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: "32px",
                        marginBottom: "12px",
                        textAlign: "center",
                        letterSpacing: "1px",
                        borderBottom: "2px solid #ecd3a5",
                        paddingBottom: "8px",
                        color: "#4b2e05",
                    }}
                >
                    {isBilardo ? `🎱 BİLARDO ${gercekMasaNo}` : `🍽️ MASA ${gercekMasaNo}`}
                </div>

                {/* HESABA YAZ MODU AÇIKSA HESABA YAZ PANELİ */}
                {hesabaYazModu ? (
                    <div style={{ flex: 1, padding: "12px", boxSizing: "border-box" }}>
                        <div
                            style={{
                                fontWeight: "bold",
                                fontSize: "24px",
                                marginBottom: "20px",
                                textAlign: "center",
                                color: "#2980b9",
                                borderBottom: "2px solid #2980b9",
                                paddingBottom: "10px"
                            }}
                        >
                            🏦 HESABA YAZ (VERESİYE)
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "20px",
                            }}
                        >
                            <div>
                                <div style={{ marginBottom: "15px" }}>
                                    <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                                        Mevcut Müşteri
                                    </div>
                                    <select
                                        value={seciliMusteriId || ""}
                                        onChange={(e) => {
                                            setSeciliMusteriId(e.target.value || null);
                                            if (e.target.value) {
                                                setYeniMusteriAdSoyad("");
                                                setYeniMusteriTelefon("");
                                                setYeniMusteriNot("");
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "2px solid #bfa37d",
                                            marginTop: "4px",
                                            fontSize: "14px",
                                            background: "#fff"
                                        }}
                                    >
                                        <option value="">Müşteri Seçiniz</option>
                                        {musteriler.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.full_name} - {m.phone}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: "8px" }}>
                                    <div style={{ fontWeight: "500", marginBottom: "8px", color: "#c57f3e" }}>
                                        YENİ MÜŞTERİ EKLE
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ad Soyad *"
                                        value={yeniMusteriAdSoyad}
                                        onChange={(e) => {
                                            setYeniMusteriAdSoyad(e.target.value);
                                            if (e.target.value.trim()) {
                                                setSeciliMusteriId(null);
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "2px solid #bfa37d",
                                            marginBottom: "10px",
                                            fontSize: "14px"
                                        }}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Telefon *"
                                        value={yeniMusteriTelefon}
                                        onChange={(e) => {
                                            setYeniMusteriTelefon(e.target.value);
                                            if (e.target.value.trim()) {
                                                setSeciliMusteriId(null);
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "2px solid #bfa37d",
                                            marginBottom: "10px",
                                            fontSize: "14px"
                                        }}
                                    />
                                    <textarea
                                        placeholder="Not (opsiyonel)"
                                        value={yeniMusteriNot}
                                        onChange={(e) => setYeniMusteriNot(e.target.value)}
                                        rows={3}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "2px solid #bfa37d",
                                            fontSize: "14px",
                                            resize: "vertical"
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div style={{ marginBottom: "20px" }}>
                                    <div style={{ fontWeight: "500", marginBottom: "4px", fontSize: "16px" }}>
                                        Borç Tutarı (Maks: {kalan.toFixed(2)} TL)
                                    </div>
                                    <input
                                        type="number"
                                        value={borcTutarInput}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const maxTutar = Number(kalan.toFixed(2));
                                            const enteredTutar = Number(value);

                                            if (enteredTutar > maxTutar) {
                                                setBorcTutarInput(maxTutar.toString());
                                                alert(`Maksimum borç tutarı: ${maxTutar.toFixed(2)} TL`);
                                            } else {
                                                setBorcTutarInput(value);
                                            }
                                        }}
                                        max={kalan}
                                        min="0.01"
                                        step="0.01"
                                        style={{
                                            width: "100%",
                                            padding: "12px",
                                            borderRadius: "8px",
                                            border: "2px solid #2980b9",
                                            marginTop: "4px",
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            textAlign: "center",
                                            background: "#f0f8ff"
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleHesabaYazKaydet}
                                    disabled={(!seciliMusteriId && !yeniMusteriAdSoyad.trim()) || !borcTutarInput || Number(borcTutarInput) <= 0}
                                    style={{
                                        marginTop: "20px",
                                        width: "100%",
                                        padding: "15px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: (!seciliMusteriId && !yeniMusteriAdSoyad.trim()) || !borcTutarInput || Number(borcTutarInput) <= 0
                                            ? "#95a5a6"
                                            : "#2980b9",
                                        color: "#fff",
                                        cursor: (!seciliMusteriId && !yeniMusteriAdSoyad.trim()) || !borcTutarInput || Number(borcTutarInput) <= 0
                                            ? "not-allowed"
                                            : "pointer",
                                        fontSize: "18px",
                                        fontWeight: "bold",
                                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                                    }}
                                >
                                    ✅ BORCU HESABA YAZ
                                </button>
                                <button
                                    onClick={handleHesabaYazIptal}
                                    style={{
                                        marginTop: "10px",
                                        width: "100%",
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "2px solid #bfa37d",
                                        background: "#fff",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    ❌ İPTAL
                                </button>

                                <div style={{
                                    marginTop: "15px",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    background: "#fff3cd",
                                    border: "1px solid #ffeaa7",
                                    fontSize: "13px",
                                    color: "#856404"
                                }}>
                                    ⓘ <strong>Önemli:</strong> Hesaba Yaz işlemi borç kaydı oluşturur,
                                    adisyonu <strong>kapatmaz</strong>. Kalan tutar ödenene kadar adisyon açık kalır.
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: "auto" }}>
                        <div
                            style={{
                                fontWeight: "bold",
                                fontSize: "18px",
                                marginBottom: "10px",
                                color: "#000000",
                            }}
                        >
                            ADİSYON
                        </div>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                borderRadius: "8px",
                                overflow: "hidden",
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            padding: "8px",
                                            borderBottom: "1px solid #ecd3a5",
                                            textAlign: "left",
                                            color: "#000",
                                        }}
                                    >
                                        Ürün Adı
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            borderBottom: "1px solid #ecd3a5",
                                            textAlign: "center",
                                            color: "#000",
                                        }}
                                    >
                                        Adet
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            borderBottom: "1px solid #ecd3a5",
                                            textAlign: "right",
                                            color: "#000",
                                        }}
                                    >
                                        Birim
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            borderBottom: "1px solid #ecd3a5",
                                            textAlign: "right",
                                            color: "#000",
                                        }}
                                    >
                                        Toplam
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(adisyon.line_items || []).map((item) => (
                                    <tr key={item.id}>
                                        <td
                                            style={{
                                                padding: "6px 8px",
                                                borderBottom: "1px solid #f4e0c2",
                                                color: "#000",
                                            }}
                                        >
                                            {item.product_name_snapshot || item.product_name}
                                            {item.notes && (
                                                <div
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "#666",
                                                        fontStyle: "italic",
                                                        marginTop: "2px",
                                                        paddingLeft: "5px",
                                                    }}
                                                >
                                                    📝 {item.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "6px 8px",
                                                borderBottom: "1px solid #f4e0c2",
                                                textAlign: "center",
                                                color: "#000",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "6px",
                                                }}
                                            >
                                                <button
                                                    onClick={() => updateLineItemQuantity(item.id, item.quantity - 1)}
                                                    style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        border: "1px solid #d0b48c",
                                                        background: "#fbe9e7",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        lineHeight: "1",
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button
                                                    onClick={() => updateLineItemQuantity(item.id, item.quantity + 1)}
                                                    style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        border: "1px solid #d0b48c",
                                                        background: "#e8f5e9",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        lineHeight: "1",
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: "6px 8px",
                                                borderBottom: "1px solid #f4e0c2",
                                                textAlign: "right",
                                                color: "#000",
                                            }}
                                        >
                                            {Number(item.unit_price_snap || item.unit_price || 0).toFixed(2)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "6px 8px",
                                                borderBottom: "1px solid #f4e0c2",
                                                textAlign: "right",
                                                color: "#000",
                                            }}
                                        >
                                            <b>{Number(item.line_total || 0).toFixed(2)}</b>
                                            <button
                                                onClick={() => deleteLineItem(item.id)}
                                                style={{
                                                    marginLeft: "8px",
                                                    padding: "2px 6px",
                                                    border: "none",
                                                    background: "transparent",
                                                    color: "red",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                }}
                                                title="Satırı Sil"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(adisyon.line_items || []).length === 0 && (
                            <div
                                style={{ textAlign: "center", color: "#888", padding: "20px" }}
                            >
                                Adisyonda ürün bulunmamaktadır.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SÜTUN 3: SAĞ 1 PANEL – MENÜ */}
            <div
                style={{
                    flex: 1,
                    background: "#fff7e6",
                    borderRadius: "12px",
                    padding: "12px",
                    boxSizing: "border-box",
                    boxShadow: "0 0 14px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: "24px",
                        marginBottom: "12px",
                        textAlign: "center",
                        letterSpacing: "1px",
                        borderBottom: "2px solid #ecd3a5",
                        paddingBottom: "8px",
                    }}
                >
                    MENÜ (Ürünler)
                </div>

                {/* ÜRÜN ARAMA KUTUSU */}
                <div style={{ marginBottom: "12px" }}>
                    <div style={{ position: "relative" }}>
                        <input
                            type="text"
                            placeholder="🔍 Tüm ürünlerde ara..."
                            value={urunArama}
                            onChange={(e) => setUrunArama(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                paddingLeft: "36px",
                                borderRadius: "8px",
                                border: "1px solid #d0b48c",
                                fontSize: "14px",
                                background: "#fff",
                                color: "#4b2e05",
                                outline: "none",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            }}
                        />
                        <div style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "16px",
                            color: "#8d7b5f"
                        }}>
                            🔍
                        </div>
                        {urunArama && (
                            <button
                                onClick={() => setUrunArama("")}
                                style={{
                                    position: "absolute",
                                    right: "10px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "transparent",
                                    border: "none",
                                    color: "#ff6b6b",
                                    cursor: "pointer",
                                    fontSize: "18px",
                                    padding: "0",
                                    width: "24px",
                                    height: "24px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                                title="Aramayı temizle"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {urunArama && (
                        <div style={{
                            fontSize: "12px",
                            color: "#8d7b5f",
                            marginTop: "4px",
                            textAlign: "center"
                        }}>
                            "{urunArama}" için {filtreliUrunler.length} ürün bulundu
                        </div>
                    )}
                </div>

                {/* ÜRÜN LİSTESİ */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        borderRadius: "8px",
                        border: "1px solid #ecd3a5",
                        padding: "8px",
                        background: "#fffdf7",
                    }}
                >
                    {filtreliUrunler.length === 0 ? (
                        <div style={{ 
                            textAlign: "center", 
                            padding: "20px",
                            color: "#8d7b5f"
                        }}>
                            {urunArama ? 
                                `"${urunArama}" için ürün bulunamadı` : 
                                "Bu kategoride ürün yok."
                            }
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(100px, 1fr))",
                                gap: "8px",
                            }}
                        >
                            {filtreliUrunler.map((urun) => (
                                <button
                                    key={urun.id}
                                    onClick={() => uruneTiklandi(urun)}
                                    style={{
                                        padding: "10px 6px",
                                        borderRadius: "8px",
                                        border: "1px solid #d0b48c",
                                        background: "#ffeaa7",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                        height: "60px",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: "2px",
                                    }}
                                >
                                    <span style={{ lineHeight: "1.2" }}>{urun.product_name}</span>
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: "normal",
                                            color: "#4b2e05",
                                        }}
                                    >
                                        {urun.sale_price ? urun.sale_price.toFixed(2) : "0.00"} TL
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* SİPARİŞ YEMEK PANELİ */}
                {adetPanelAcik && seciliUrun?.id === "siparis-yemek" && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: "12px",
                            right: "24%",
                            width: "250px",
                            background: "#fff",
                            border: "1px solid #bfa37d",
                            borderRadius: "10px",
                            padding: "15px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            zIndex: 100,
                        }}
                    >
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                            {seciliUrun.product_name}
                        </div>
                        <div style={{ marginBottom: "8px" }}>
                            <label>Fiyat (TL)</label>
                            <input
                                type="number"
                                value={siparisYemekFiyat}
                                onChange={(e) => setSiparisYemekFiyat(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "6px",
                                    borderRadius: "6px",
                                    border: "1px solid #bfa37d",
                                    marginTop: "4px",
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: "8px" }}>
                            <label>Not</label>
                            <input
                                type="text"
                                value={siparisYemekNot}
                                onChange={(e) => setSiparisYemekNot(e.target.value)}
                                placeholder="Ekstra not"
                                style={{
                                    width: "100%",
                                    padding: "6px",
                                    borderRadius: "6px",
                                    border: "1px solid #bfa37d",
                                    marginTop: "4px",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                            }}
                        >
                            <label>Adet</label>
                            <div
                                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                <button
                                    onClick={() => setAdet(Math.max(1, adet - 1))}
                                    style={{
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #d0b48c",
                                        background: "#fbe9e7",
                                        cursor: "pointer",
                                    }}
                                >
                                    -
                                </button>
                                <span style={{ fontWeight: "bold" }}>{adet}</span>
                                <button
                                    onClick={() => setAdet(adet + 1)}
                                    style={{
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #d0b48c",
                                        background: "#e8f5e9",
                                        cursor: "pointer",
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                            <button
                                onClick={addSiparisYemek}
                                style={{
                                    flex: 1,
                                    padding: "6px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "#4b2e05",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                EKLE
                            </button>
                            <button
                                onClick={() => {
                                    setAdetPanelAcik(false);
                                    setSeciliUrun(null);
                                }}
                                style={{
                                    padding: "6px",
                                    borderRadius: "6px",
                                    border: "1px solid #bfa37d",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                İPTAL
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SÜTUN 4: SAĞ 2 PANEL – KATEGORİLER */}
            <div
                style={{
                    flex: 0.8,
                    background: "#fff7e6",
                    borderRadius: "12px",
                    padding: "12px",
                    boxSizing: "border-box",
                    boxShadow: "0 0 14px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: "24px",
                        marginBottom: "12px",
                        textAlign: "center",
                        letterSpacing: "1px",
                        borderBottom: "2px solid #ecd3a5",
                        paddingBottom: "8px",
                    }}
                >
                    KATEGORİLER
                </div>

                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                        padding: "5px",
                        border: "1px solid #ecd3a5",
                        borderRadius: "8px",
                        background: "#fffdf7",
                        alignContent: "start",
                    }}
                >
                    {uiKategorileri.map((kat) => (
                        <button
                            key={kat.id}
                            onClick={() => {
                                setAktifKategoriId(kat.id);
                                setUrunArama("");
                            }}
                            style={{
                                padding: "15px 5px",
                                borderRadius: "8px",
                                border:
                                    aktifKategoriId === kat.id
                                        ? "2px solid #c57f3e"
                                        : "1px solid #bfa37d",
                                background:
                                    aktifKategoriId === kat.id ? "#f7d9a8" : "rgba(255,255,255,0.9)",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "bold",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                textAlign: "center",
                                minHeight: "80px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                wordBreak: "break-word",
                                lineHeight: "1.2",
                            }}
                        >
                            {kat.category_name}
                        </button>
                    ))}
                </div>
                
                {aktifKategoriId && (
                    <div style={{
                        marginTop: "10px",
                        padding: "8px",
                        borderRadius: "6px",
                        background: "#e8f5e9",
                        border: "1px solid #4caf50",
                        fontSize: "12px",
                        textAlign: "center",
                        color: "#1b5e20"
                    }}>
                        <strong>Aktif Kategori:</strong> {aktifKategoriAdi}
                        <div style={{ fontSize: "10px", marginTop: "2px" }}>
                            ID: {aktifKategoriId}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}