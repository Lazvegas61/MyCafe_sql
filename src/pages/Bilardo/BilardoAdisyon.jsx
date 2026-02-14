// admin-ui/src/pages/Bilardo/BilardoAdisyon.jsx - GÜNCELLENDİ
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  closeBilliardSession,
  getBilliardSessionDetails 
} from "../../api/billiardApi";
import { addInvoiceItem } from "../../api/invoiceApi";
import "./Bilardo.css";

export default function BilardoAdisyon() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { user, checkPermission } = useAuth();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [odemeModal, setOdemeModal] = useState({
    acik: false,
    tip: "NAKIT",
    tutar: 0,
    aciklama: ""
  });

  // Yetki kontrolü
  useEffect(() => {
    if (!checkPermission('bilardo_view')) {
      navigate('/unauthorized');
      return;
    }
  }, [checkPermission, navigate]);

  // Oturum detaylarını API'den al
  useEffect(() => {
    fetchSessionDetails();
    
    const interval = setInterval(fetchSessionDetails, 15000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const sessionData = await getBilliardSessionDetails(sessionId);
      setSession(sessionData);
      setError(null);
    } catch (err) {
      console.error('Oturum detayları getirme hatası:', err);
      setError('Oturum detayları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Ürün ekle
  const handleUrunEkle = async (urun) => {
    try {
      if (!checkPermission('invoice_add_item')) {
        alert('Bu işlem için yetkiniz yok');
        return;
      }

      // Normal adisyon API'sini kullanarak ürün ekle
      const result = await addInvoiceItem(session.invoice_id, {
        product_id: urun.id,
        quantity: 1,
        unit_price: urun.sale_price
      });

      if (result.success) {
        alert('Ürün eklendi');
        fetchSessionDetails(); // Veriyi yenile
      } else {
        alert(result.message || 'Ürün eklenemedi');
      }
    } catch (err) {
      console.error('Ürün ekleme hatası:', err);
      alert('Ürün eklenirken hata oluştu');
    }
  };

  // Ödeme ekle
  const handleOdemeEkle = async () => {
    try {
      if (!checkPermission('invoice_add_payment')) {
        alert('Bu işlem için yetkiniz yok');
        return;
      }

      const paymentData = {
        payment_type: odemeModal.tip,
        amount: parseFloat(odemeModal.tutar),
        description: odemeModal.aciklama
      };

      // TODO: Ödeme API'si entegre edilecek
      // const result = await addPaymentToInvoice(session.invoice_id, paymentData);

      setOdemeModal({ acik: false, tip: "NAKIT", tutar: 0, aciklama: "" });
      fetchSessionDetails();
    } catch (err) {
      console.error('Ödeme ekleme hatası:', err);
      alert('Ödeme eklenirken hata oluştu');
    }
  };

  // Adisyonu kapat
  const handleAdisyonKapat = async () => {
    try {
      if (!checkPermission('bilardo_close_session')) {
        alert('Bu işlem için yetkiniz yok');
        return;
      }

      if (session.remaining_amount > 0.01) {
        alert(`Ödenmemiş tutar var! Kalan: ${session.remaining_amount.toFixed(2)}₺`);
        return;
      }

      if (!window.confirm("Adisyonu kapatmak istediğinize emin misiniz?")) {
        return;
      }

      const result = await closeBilliardSession(sessionId, session.payments || []);
      
      if (result.success) {
        alert('Adisyon başarıyla kapatıldı');
        navigate('/bilardo');
      } else {
        alert(result.message || 'Adisyon kapatılamadı');
      }
    } catch (err) {
      console.error('Adisyon kapatma hatası:', err);
      alert('Adisyon kapatılırken hata oluştu');
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (error || !session) {
    return <div className="error">{error || 'Oturum bulunamadı'}</div>;
  }

  return (
    <div className="bilardo-adisyon-container">
      {/* BAŞLIK */}
      <div className="adisyon-header">
        <h1>🎱 BİLARDO ADİSYONU - {session.table_number}</h1>
        <button onClick={() => navigate('/bilardo')}>← Geri</button>
      </div>

      {/* 4 SÜTUNLU ANA ALAN */}
      <div className="adisyon-columns">
        
        {/* SÜTUN 1: BİLARDO BİLGİLERİ */}
        <div className="column">
          <h2>🎱 Bilardo Bilgileri</h2>
          <div className="info-row">
            <span>Süre Tipi:</span>
            <span>{session.session_type_display}</span>
          </div>
          <div className="info-row">
            <span>Geçen Süre:</span>
            <span>{session.elapsed_time} dakika</span>
          </div>
          <div className="charge-box">
            <div>BİLARDO ÜCRETİ</div>
            <div className="charge-amount">{session.billiard_charge}₺</div>
          </div>
        </div>

        {/* SÜTUN 2: EK ÜRÜNLER */}
        <div className="column">
          <h2>📦 Ek Ürünler</h2>
          <ProductTable 
            products={session.products || []} 
            onAddProduct={handleUrunEkle}
            canAdd={checkPermission('invoice_add_item')}
          />
        </div>

        {/* SÜTUN 3: ÖDEMELER */}
        <div className="column">
          <h2>💳 Ödemeler</h2>
          <PaymentTable 
            payments={session.payments || []}
            onAddPayment={() => setOdemeModal({ ...odemeModal, acik: true })}
            canAdd={checkPermission('invoice_add_payment')}
          />
        </div>

        {/* SÜTUN 4: ÖZET */}
        <div className="column">
          <h2>📊 Özet</h2>
          <SummarySection 
            session={session}
            onClose={handleAdisyonKapat}
            canClose={checkPermission('bilardo_close_session')}
          />
        </div>
      </div>

      {/* ÖDEME MODAL */}
      {odemeModal.acik && (
        <PaymentModal
          modal={odemeModal}
          setModal={setOdemeModal}
          remainingAmount={session.remaining_amount}
          onConfirm={handleOdemeEkle}
        />
      )}
    </div>
  );
}

// Yardımcı bileşenler
const ProductTable = ({ products, onAddProduct, canAdd }) => (
  <div className="product-table">
    <div className="table-header">
      <span>Ürün</span>
      <span>Adet</span>
      <span>Fiyat</span>
      <span>Toplam</span>
    </div>
    {products.map(product => (
      <div key={product.id} className="table-row">
        <span>{product.name}</span>
        <span>{product.quantity}</span>
        <span>{product.unit_price}₺</span>
        <span>{product.total}₺</span>
      </div>
    ))}
    {canAdd && (
      <button onClick={onAddProduct}>+ Ürün Ekle</button>
    )}
  </div>
);

const PaymentModal = ({ modal, setModal, remainingAmount, onConfirm }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Ödeme Ekle</h3>
      {/* Modal içeriği */}
      <button onClick={onConfirm}>Onayla</button>
      <button onClick={() => setModal({ ...modal, acik: false })}>İptal</button>
    </div>
  </div>
);