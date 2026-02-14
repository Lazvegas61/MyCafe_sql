// ==================================================
// Unauthorized.jsx
// MyCafe - Yetkisiz Erişim Sayfası
// MyCafe Anayasası Madde 5: Rol bazlı yetki - UI sadece bilgi gösterir
// ==================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToDashboard = () => {
    // MyCafe Anayasası Madde 1.7: Rol matrisine göre yönlendirme
    if (hasRole('ADMIN') || hasRole('__SYS')) {
      navigate('/ana');
    } else if (hasRole('WAITER') || hasRole('GARSON')) {
      navigate('/masalar');
    } else if (hasRole('KITCHEN') || hasRole('MUTFAK')) {
      navigate('/mutfak');
    } else if (hasRole('CASHIER')) {
      navigate('/kasa');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Kullanıcı rolünü Türkçe'ye çevir
  const getRoleName = () => {
    const role = user?.role || user?.role_code;
    
    switch (role) {
      case '__SYS': return 'Sistem Yöneticisi';
      case 'ADMIN': return 'Yönetici';
      case 'WAITER':
      case 'GARSON': return 'Garson';
      case 'KITCHEN':
      case 'MUTFAK': return 'Mutfak Personeli';
      case 'CASHIER': return 'Kasiyer';
      default: return 'Belirsiz Rol';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f5e7d0 0%, #e8d5b5 100%)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          padding: '40px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 15px 35px rgba(75, 46, 5, 0.2)',
          width: '500px',
          maxWidth: '90%',
          border: '3px solid #e74c3c',
          textAlign: 'center',
        }}
      >
        {/* İkon */}
        <div
          style={{
            fontSize: '64px',
            marginBottom: '20px',
            color: '#e74c3c',
          }}
        >
          ⚠️
        </div>

        {/* Başlık */}
        <h2
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#e74c3c',
            marginBottom: '10px',
          }}
        >
          Erişim Engellendi
        </h2>

        <p
          style={{
            marginTop: '10px',
            fontSize: '16px',
            color: '#666',
            lineHeight: '1.5',
          }}
        >
          Bu sayfaya erişim izniniz bulunmamaktadır.
        </p>

        {/* Kullanıcı Bilgileri */}
        <div
          style={{
            marginTop: '25px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'left',
            border: '1px solid #e9ecef',
          }}
        >
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>👤 Kullanıcı:</strong> {user?.username || 'Belirsiz'}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>🎭 Rolünüz:</strong> {getRoleName()}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>📋 Yetki Kodu:</strong> {user?.role || user?.role_code || 'Belirsiz'}
          </p>
        </div>

        {/* MyCafe Not */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            background: '#fff8e1',
            borderRadius: '8px',
            border: '1px solid #ffd54f',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#5d4037',
              fontStyle: 'italic',
            }}
          >
            <strong>MyCafe Not:</strong> Erişim yetkileri sistem yöneticisi tarafından 
            SQL seviyesinde belirlenir. İzin problemi için yöneticinizle iletişime geçin.
          </p>
        </div>

        {/* Butonlar */}
        <div
          style={{
            marginTop: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            onClick={handleGoToDashboard}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #4b2e05 0%, #6b4210 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 10px rgba(75, 46, 5, 0.2)',
            }}
          >
            🏠 Rolüme Uygun Sayfaya Git
          </button>

          <button
            onClick={handleGoBack}
            style={{
              padding: '14px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 10px rgba(52, 152, 219, 0.2)',
            }}
          >
            ↩️ Geri Dön
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '14px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 10px rgba(231, 76, 60, 0.2)',
            }}
          >
            🚪 Çıkış Yap
          </button>
        </div>

        {/* Teknik Bilgi */}
        <div
          style={{
            marginTop: '25px',
            paddingTop: '15px',
            borderTop: '1px solid #eee',
            fontSize: '12px',
            color: '#999',
          }}
        >
          <p style={{ margin: '5px 0' }}>
            <strong>Teknik Detay:</strong> Bu sayfa, MyCafe Anayasası Madde 5 
            (Rol Bazlı Mutlak Yetki) gereği görüntülenmektedir.
          </p>
          <p style={{ margin: '5px 0' }}>
            Yetki kontrolü SQL seviyesinde yapılır (check_permission() fonksiyonu).
          </p>
        </div>
      </div>
    </div>
  );
}