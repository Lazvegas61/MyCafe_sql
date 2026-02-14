// admin-ui/src/pages/Bilardo/Bilardo.jsx - TAM SAYFA GÜNCELLENDİ
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  getBilliardTables, 
  startBilliardSession,
  extendBilliardSession,
  transferToTable 
} from "../../api/billiardApi";
import "./Bilardo.css";
import BilardoMiniDashboard from "./BilardoMiniDashboard";

export default function Bilardo() {
  const navigate = useNavigate();
  const { user, checkPermission } = useAuth();
  
  const [masalar, setMasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aktarimModal, setAktarimModal] = useState({ 
    acik: false, 
    session: null, 
    seciliMasa: null, 
    normalMasalar: [] 
  });

  // Yetki kontrolü - MyCafe Anayasası Madde 5
  useEffect(() => {
    if (!checkPermission('bilardo_management')) {
      navigate('/unauthorized');
      return;
    }
  }, [checkPermission, navigate]);

  // Masaları API'den yükle
  useEffect(() => {
    fetchTables();
    
    // Real-time updates için WebSocket veya interval
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const tablesData = await getBilliardTables();
      setMasalar(tablesData);
      setError(null);
    } catch (err) {
      console.error('Masaları yükleme hatası:', err);
      setError('Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Masa aç - API çağrısı
  const handleMasaAc = async (masa, tip) => {
    try {
      if (!checkPermission('bilardo_start_session')) {
        alert('Bu işlem için yetkiniz yok');
        return;
      }

      const result = await startBilliardSession(masa.id, tip);
      
      if (result.success) {
        // Başarılıysa masaları yenile
        await fetchTables();
        // Adisyon sayfasına yönlendir
        navigate(`/bilardo-adisyon/${result.session_id}`);
      } else {
        alert(result.message || 'Masa açılamadı');
      }
    } catch (err) {
      console.error('Masa açma hatası:', err);
      alert('Masa açılırken hata oluştu');
    }
  };

  // Süre uzat - API çağrısı
  const handleSureUzat = async (sessionId, extensionType) => {
    try {
      if (!checkPermission('bilardo_extend_session')) {
        alert('Bu işlem için yetkiniz yok');
        return;
      }

      const result = await extendBilliardSession(sessionId, extensionType);
      
      if (result.success) {
        alert('Süre başarıyla uzatıldı');
        await fetchTables();
      } else {
        alert(result.message || 'Süre uzatılamadı');
      }
    } catch (err) {
      console.error('Süre uzatma hatası:', err);
      alert('Süre uzatılırken hata oluştu');
    }
  };

  // Transfer modalını aç
  const handleTransferModalOpen = async (session) => {
    try {
      // Normal masaları API'den al
      // Bu kısım normal masa API'si entegre edilince doldurulacak
      const normalMasalar = []; // TODO: API'den normal masaları al
      
      setAktarimModal({
        acik: true,
        session,
        seciliMasa: null,
        normalMasalar
      });
    } catch (err) {
      console.error('Transfer modal açma hatası:', err);
    }
  };

  // Transfer işlemi
  const handleTransfer = async () => {
    const { session, seciliMasa } = aktarimModal;
    if (!session || !seciliMasa) return;

    try {
      if (!checkPermission('bilardo_transfer')) {
        alert('Bu işlem için yetkiniz yok');
        return;
      }

      const result = await transferToTable(session.id, seciliMasa.id);
      
      if (result.success) {
        alert('Transfer başarılı');
        setAktarimModal({ acik: false, session: null, seciliMasa: null, normalMasalar: [] });
        await fetchTables();
        navigate('/masalar');
      } else {
        alert(result.message || 'Transfer yapılamadı');
      }
    } catch (err) {
      console.error('Transfer hatası:', err);
      alert('Transfer sırasında hata oluştu');
    }
  };

  // Yükleme durumu
  if (loading) {
    return (
      <div className="bilardo-container">
        <div className="loading-spinner">🎱 Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="bilardo-container">
      {/* HEADER */}
      <div className="bilardo-header">
        <div className="bilardo-title-section">
          <div className="bilardo-main-icon">🎱</div>
          <h1 className="bilardo-title">Bilardo Masaları</h1>
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="bilardo-actions">
          <button 
            className="bilardo-ayarlar-btn"
            onClick={() => navigate("/ayarlar?tab=bilardo_ucret")}
            disabled={!checkPermission('settings_management')}
          >
            ⚙️ Ayarlar
          </button>
        </div>
      </div>
      
      {/* MINI DASHBOARD */}
      <BilardoMiniDashboard />
      
      {/* MASA KARTLARI */}
      <div className="bilardo-grid">
        {masalar.map((masa) => (
          <div 
            key={masa.id} 
            className={`bilardo-card ${masa.status === 'ACTIVE' ? 'acik' : 'kapali'}`}
            onClick={() => masa.session_id && navigate(`/bilardo-adisyon/${masa.session_id}`)}
          >
            {/* KART BAŞLIĞI */}
            <div className="card-header-row">
              <div className="masa-info">
                <div className="masa-icon">🎱</div>
                <div>
                  <h3 className="masa-number">{masa.table_number}</h3>
                  <div className={`masa-status ${masa.status}`}>
                    {masa.status === 'ACTIVE' ? "AÇIK" : "KAPALI"}
                  </div>
                </div>
              </div>
              
              {masa.status === 'ACTIVE' && (
                <button 
                  className="detay-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/bilardo-adisyon/${masa.session_id}`);
                  }}
                >
                  Detay
                </button>
              )}
            </div>
            
            {/* SÜRE GÖSTERİMİ - API'den gelen veri */}
            {masa.status === 'ACTIVE' && (
              <div className="sure-display">
                <div className="sure-value">
                  {masa.elapsed_time || '00:00'}
                </div>
                <div className="dakika-ucret">
                  {masa.minute_rate || 0}₺/dk
                </div>
              </div>
            )}
            
            {/* BİLGİLER - API'den gelen veri */}
            {masa.status === 'ACTIVE' && (
              <div className="masa-details">
                <div className="detail-row">
                  <span className="detail-label">Seçilen:</span>
                  <span className="detail-value">
                    {masa.session_type === '30dk' ? '30 Dakika' : 
                     masa.session_type === '1saat' ? '1 Saat' : 'Süresiz'}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Anlık Ücret:</span>
                  <span className="detail-value">{masa.current_charge || 0}₺</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Toplam:</span>
                  <span className="detail-value" style={{ color: '#4CAF50', fontWeight: '800' }}>
                    {masa.total_amount || 0}₺
                  </span>
                </div>
              </div>
            )}
            
            {/* BUTONLAR */}
            {masa.status === 'INACTIVE' ? (
              <div className="button-group">
                <button 
                  className="btn-30dk"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMasaAc(masa, '30dk');
                  }}
                >
                  30dk
                </button>
                
                <button 
                  className="btn-1saat"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMasaAc(masa, '1saat');
                  }}
                >
                  1 Saat
                </button>
                
                <button 
                  className="btn-suresiz"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMasaAc(masa, 'unlimited');
                  }}
                >
                  Süresiz
                </button>
              </div>
            ) : (
              <div className="button-group">
                <button 
                  className="btn-uzat"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSureUzat(masa.session_id, '30dk');
                  }}
                >
                  Uzat
                </button>
                
                <button 
                  className="btn-odeme"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/bilardo-adisyon/${masa.session_id}`);
                  }}
                >
                  Ödeme
                </button>
                
                <button 
                  className="btn-aktar"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTransferModalOpen(masa);
                  }}
                >
                  ↪️ Masaya Aktar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* TRANSFER MODAL */}
      {aktarimModal.acik && (
        <TransferModal 
          modal={aktarimModal}
          setModal={setAktarimModal}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
}

// Transfer Modal Component
const TransferModal = ({ modal, setModal, onTransfer }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Bilardo Adisyonunu Normal Masaya Aktar</h3>
      <p>Masalardan birini seçin:</p>
      
      <div className="table-grid">
        {modal.normalMasalar?.map(masa => (
          <button
            key={masa.id}
            className={`table-button ${modal.seciliMasa?.id === masa.id ? 'selected' : ''}`}
            onClick={() => setModal({...modal, seciliMasa: masa})}
          >
            MASA {masa.table_number}
          </button>
        ))}
      </div>
      
      <div className="modal-actions">
        <button onClick={() => setModal({ acik: false, session: null, seciliMasa: null, normalMasalar: [] })}>
          İptal
        </button>
        <button onClick={onTransfer} disabled={!modal.seciliMasa}>
          Aktar
        </button>
      </div>
    </div>
  </div>
);