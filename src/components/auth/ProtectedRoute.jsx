// ==================================================
// ProtectedRoute.jsx
// MyCafe - Yetkili Route Koruma Component'i
// MyCafe Anayasası Madde 5: Rol bazlı mutlak yetki
// MyCafe Anayasası Madde 3: UI aptaldır - sadece kontrol yapar
// ==================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * ProtectedRoute - MyCafe Yetkili Route Component'i
 * 
 * Özellikler:
 * 1. Authentication kontrolü (giriş yapılmış mı?)
 * 2. Rol bazlı erişim kontrolü (allowedRoles)
 * 3. Yetki bazlı erişim kontrolü (requiredPermissions)
 * 4. Loading state yönetimi
 * 5. MyCafe gün durumu kontrolü (opsiyonel)
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Korunacak component
 * @param {Array} props.allowedRoles - İzin verilen roller (opsiyonel)
 * @param {Array} props.requiredPermissions - Gerekli yetkiler (opsiyonel)
 * @param {boolean} props.requireDayOpen - Gün açık olmalı mı? (opsiyonel)
 * @param {string} props.redirectPath - Yönlendirme yolu (default: '/login')
 * @param {boolean} props.showLoading - Loading gösterilsin mi? (default: true)
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  requiredPermissions = [],
  requireDayOpen = false,
  redirectPath = '/login',
  showLoading = true
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    hasRole, 
    hasPermission,
    isDayOpen,
    checkAuth
  } = useAuth();

  // =================== LOADING STATE ===================
  if (isLoading && showLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f5e7d0 0%, #e8d5b5 100%)',
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 15px 35px rgba(75, 46, 5, 0.15)',
          border: '2px solid #4b2e05',
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            animation: 'pulse 1.5s infinite'
          }}>
            ☕
          </div>
          <h3 style={{ 
            margin: '0 0 10px 0', 
            color: '#4b2e05',
            fontSize: '24px'
          }}>
            MyCafe Yükleniyor
          </h3>
          <p style={{ 
            margin: 0, 
            color: '#666',
            fontSize: '14px'
          }}>
            Güvenlik kontrolleri yapılıyor...
          </p>
          <style>{`
            @keyframes pulse {
              0% { opacity: 0.6; }
              50% { opacity: 1; }
              100% { opacity: 0.6; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // =================== AUTHENTICATION KONTROLÜ ===================
  if (!isAuthenticated) {
    console.warn('[MyCafe ProtectedRoute] Kullanıcı giriş yapmamış. Login sayfasına yönlendiriliyor.');
    
    // MyCafe Audit: Yetkisiz erişim girişimi
    if (user) {
      console.log(`[MyCafe Audit] Yetkisiz erişim girişimi: ${user.username} (${user.role || user.role_code})`);
    }
    
    return <Navigate to={redirectPath} replace state={{ from: window.location.pathname }} />;
  }

  // =================== ROL KONTROLÜ ===================
  if (allowedRoles.length > 0 && user) {
    const userRole = user.role || user.role_code;
    const hasAllowedRole = allowedRoles.includes(userRole);
    
    if (!hasAllowedRole) {
      console.warn(
        `[MyCafe ProtectedRoute] Rol uyumsuzluğu. ` +
        `Kullanıcı Rolü: ${userRole}, Gereken Roller: ${allowedRoles.join(', ')}`
      );
      
      // MyCafe Anayasası Madde 5: Rol bazlı yönlendirme
      let roleRedirect = '/unauthorized';
      
      // Rol'e göre uygun sayfaya yönlendir
      if (userRole === 'WAITER' || userRole === 'GARSON') {
        roleRedirect = '/masalar';
      } else if (userRole === 'KITCHEN' || userRole === 'MUTFAK') {
        roleRedirect = '/mutfak';
      } else if (userRole === 'CASHIER') {
        roleRedirect = '/kasa';
      } else if (userRole === 'ADMIN' || userRole === '__SYS') {
        roleRedirect = '/ana';
      }
      
      return <Navigate to={roleRedirect} replace />;
    }
  }

  // =================== YETKİ KONTROLÜ ===================
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      console.warn(
        `[MyCafe ProtectedRoute] Yetki eksik. ` +
        `Gereken Yetkiler: ${requiredPermissions.join(', ')}`
      );
      
      // MyCafe Audit: Yetki eksikliği
      console.log(`[MyCafe Audit] Yetki eksikliği: ${user.username}, Eksik yetkiler: ${requiredPermissions.join(', ')}`);
      
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // =================== GÜN DURUMU KONTROLÜ ===================
  // MyCafe Anayasası Madde 0.3: Gün mantığı
  if (requireDayOpen && !isDayOpen()) {
    console.warn('[MyCafe ProtectedRoute] Gün kapalı. Bu işlem için günün açık olması gerekiyor.');
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f5e7d0',
        color: '#4b2e05',
      }}>
        <div style={{
          padding: '40px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
          width: '400px',
          maxWidth: '90%',
          border: '3px solid #e67e22',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏰</div>
          <h3 style={{ margin: '0 0 10px 0' }}>Gün Kapalı</h3>
          <p style={{ marginBottom: '20px' }}>
            Bu işlemi yapabilmek için önce günü açmanız gerekiyor.
          </p>
          <button
            onClick={() => window.location.href = '/ana'}
            style={{
              padding: '12px 24px',
              background: '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  // =================== PERİYODİK AUTH KONTROLÜ ===================
  React.useEffect(() => {
    if (isAuthenticated) {
      // Her sayfa değişiminde auth kontrolü (opsiyonel)
      const checkAuthPeriodically = async () => {
        try {
          await checkAuth();
        } catch (error) {
          console.error('[MyCafe ProtectedRoute] Auth check failed:', error);
        }
      };
      
      checkAuthPeriodically();
    }
  }, [isAuthenticated, checkAuth]);

  // =================== TÜM KONTROLLER GEÇTİ ===================
  return <>{children}</>;
};

// =================== MYCAFE ÖZEL ROUTE COMPONENT'LERİ ===================

/**
 * AdminRoute - Sadece Admin ve Super Admin için
 */
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    allowedRoles={['ADMIN', '__SYS']} 
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * WaiterRoute - Garson ve üstü için
 */
export const WaiterRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    allowedRoles={['WAITER', 'GARSON', 'ADMIN', '__SYS', 'CASHIER']} 
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * KitchenRoute - Mutfak personeli ve üstü için
 */
export const KitchenRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    allowedRoles={['KITCHEN', 'MUTFAK', 'ADMIN', '__SYS']} 
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * CashierRoute - Kasiyer ve üstü için
 */
export const CashierRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    allowedRoles={['CASHIER', 'ADMIN', '__SYS']} 
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * ReportRoute - Sadece rapor görüntüleme yetkisi olanlar için
 * MyCafe Anayasası Madde 6.5: Raporlar sadece Admin görür
 */
export const ReportRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    allowedRoles={['ADMIN', '__SYS']}
    requiredPermissions={['view.reports']}
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * PaymentRoute - Ödeme işlemi yapabilenler için
 * MyCafe Anayasası: Garson ve Kasiyer ödeme yapabilir
 */
export const PaymentRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    allowedRoles={['WAITER', 'GARSON', 'CASHIER', 'ADMIN', '__SYS']}
    requiredPermissions={['process.payment']}
    requireDayOpen={true}  // Ödeme için gün açık olmalı
    {...props}
  >
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;