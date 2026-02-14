// ==================================================
// Raporlar.jsx
// MyCafe - Raporlar Ana Sayfası
// MyCafe Anayasası Madde 6.5: Raporlar sadece Admin görür
// ==================================================

import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Rapor Component'leri
import GenelOzet from './GenelOzet';
import KasaRaporu from './KasaRaporu';
import UrunRaporu from './UrunRaporu';
import KategoriRaporu from './KategoriRaporu';
import MasaRaporu from './MasaRaporu';
import GiderRaporu from './GiderRaporu';
import BilardoRaporu from './BilardoRaporu';

export default function Raporlar() {
  const { hasRole } = useAuth();
  const location = useLocation();

  // MyCafe Anayasası Madde 6.5: Sadece Admin rapor görebilir
  if (!hasRole('ADMIN') && !hasRole('__SYS')) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#e74c3c'
      }}>
        <h2>⛔ Raporlara Erişim Engellendi</h2>
        <p>Raporları görüntülemek için yönetici yetkisine sahip olmalısınız.</p>
      </div>
    );
  }

  // Aktif tab kontrolü
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Rapor Başlığı */}
      <div style={{
        marginBottom: '30px',
        borderBottom: '2px solid #4b2e05',
        paddingBottom: '15px'
      }}>
        <h1 style={{ 
          color: '#4b2e05', 
          margin: '0 0 10px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          📊 MyCafe Raporlar
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Sistem raporları ve analizler - MyCafe Anayasası Madde 6
        </p>
      </div>

      {/* Rapor Navigasyon */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        borderBottom: '1px solid #ddd',
        paddingBottom: '15px'
      }}>
        <Link 
          to="/raporlar/genel" 
          style={{
            padding: '10px 20px',
            background: isActive('/genel') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/genel') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/genel') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          📈 Genel Özet
        </Link>
        
        <Link 
          to="/raporlar/kasa" 
          style={{
            padding: '10px 20px',
            background: isActive('/kasa') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/kasa') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/kasa') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          💰 Kasa Raporu
        </Link>
        
        <Link 
          to="/raporlar/urun" 
          style={{
            padding: '10px 20px',
            background: isActive('/urun') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/urun') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/urun') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          🛒 Ürün Satış
        </Link>
        
        <Link 
          to="/raporlar/kategori" 
          style={{
            padding: '10px 20px',
            background: isActive('/kategori') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/kategori') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/kategori') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          🏷️ Kategori Analizi
        </Link>
        
        <Link 
          to="/raporlar/masa" 
          style={{
            padding: '10px 20px',
            background: isActive('/masa') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/masa') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/masa') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          🪑 Masa Performansı
        </Link>
        
        <Link 
          to="/raporlar/gider" 
          style={{
            padding: '10px 20px',
            background: isActive('/gider') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/gider') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/gider') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          📉 Gider Raporu
        </Link>
        
        <Link 
          to="/raporlar/bilardo" 
          style={{
            padding: '10px 20px',
            background: isActive('/bilardo') ? '#4b2e05' : '#f0f0f0',
            color: isActive('/bilardo') ? 'white' : '#333',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            border: isActive('/bilardo') ? '2px solid #4b2e05' : '2px solid transparent'
          }}
        >
          🎱 Bilardo Gelirleri
        </Link>
      </div>

      {/* Rapor İçeriği */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        border: '1px solid #e0e0e0'
      }}>
        <Routes>
          <Route index element={<Navigate to="genel" replace />} />
          <Route path="genel" element={<GenelOzet />} />
          <Route path="kasa" element={<KasaRaporu />} />
          <Route path="urun" element={<UrunRaporu />} />
          <Route path="kategori" element={<KategoriRaporu />} />
          <Route path="masa" element={<MasaRaporu />} />
          <Route path="gider" element={<GiderRaporu />} />
          <Route path="bilardo" element={<BilardoRaporu />} />
          <Route path="*" element={<Navigate to="genel" replace />} />
        </Routes>
      </div>

      {/* MyCafe Not */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#666'
      }}>
        <p style={{ margin: 0 }}>
          <strong>MyCafe Not:</strong> Raporlar SQL View'larından oluşturulur. 
          Geçmiş veriler snapshot'larla korunur (Anayasa Madde 2). 
          Raporlar finansal gerçeği yansıtır (Anayasa Madde 1).
        </p>
      </div>
    </div>
  );
}