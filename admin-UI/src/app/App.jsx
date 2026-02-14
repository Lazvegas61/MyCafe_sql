// ==================================================
// App.jsx
// MyCafe – Root Application Router with Authentication
// Gerçek dosya yapısına uygun güncellendi
// ==================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AppLayout from "./AppLayout";

// Public Pages
import Login from "../pages/Login/Login";
import Unauthorized from "../pages/Unauthorized";

// Protected Pages (MEVCUT OLANLAR)
import AnaEkran from "../pages/AnaEkran/AnaEkran";
import Masalar from "../pages/Masalar/Masalar";
import Adisyon from "../pages/Adisyon/Adisyon";
import Bilardo from "../pages/Bilardo/Bilardo";
import KategoriYonetimi from "../pages/kategori/KategoriYonetimi";
import UrunStokYonetimi from "../pages/UrunStokYonetimi/UrunStokYonetimi";
import StokYonetimi from "../pages/stok/StokYonetimi";
import MusteriIslemleri from "../pages/MusteriIslemleri/MusteriIslemleri";
import Personel from "../pages/Personel/Personel";
import Raporlar from "../pages/Raporlar/Raporlar";
import Redirect from "../pages/Redirect";

// YENİ SAYFALAR (mevcut olanlar)
import Ayarlar from "../pages/Ayarlar/Ayarlar";
import Giderler from "../pages/Giderler/Giderler";
import GarsonMasalar from "../pages/garson/GarsonMasalar";
import GarsonAdisyon from "../pages/garson/GarsonAdisyon";

function App() {
  return (
    // MyCafe AuthProvider - Tüm uygulama için authentication state
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ========== PUBLIC ROUTES (Auth gerekmez) ========== */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* ========== PROTECTED ROUTES (Auth gerekir) ========== */}
          {/* Tüm protected route'lar AppLayout içinde */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            {/* Ana sayfa - Tüm kullanıcılar */}
            <Route index element={<AnaEkran />} />
            <Route path="/ana" element={<AnaEkran />} />
            
            {/* Operasyonel sayfalar - Garson/Admin/Kasiyer */}
            <Route path="/masalar" element={
              <ProtectedRoute allowedRoles={['WAITER', 'GARSON', 'ADMIN', '__SYS', 'CASHIER']}>
                <Masalar />
              </ProtectedRoute>
            } />
            
            <Route path="/garson/masalar" element={
              <ProtectedRoute allowedRoles={['WAITER', 'GARSON', 'ADMIN', '__SYS', 'CASHIER']}>
                <GarsonMasalar />
              </ProtectedRoute>
            } />
            
            <Route path="/adisyon/:id" element={
              <ProtectedRoute allowedRoles={['WAITER', 'GARSON', 'ADMIN', '__SYS', 'CASHIER']}>
                <Adisyon />
              </ProtectedRoute>
            } />
            
            <Route path="/garson/adisyon/:id" element={
              <ProtectedRoute allowedRoles={['WAITER', 'GARSON', 'ADMIN', '__SYS', 'CASHIER']}>
                <GarsonAdisyon />
              </ProtectedRoute>
            } />
            
            <Route path="/bilardo" element={
              <ProtectedRoute allowedRoles={['WAITER', 'GARSON', 'ADMIN', '__SYS', 'CASHIER']}>
                <Bilardo />
              </ProtectedRoute>
            } />
            
            {/* Yönetim sayfaları - Sadece Admin */}
            <Route path="/kategoriler" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <KategoriYonetimi />
              </ProtectedRoute>
            } />
            
            <Route path="/urun-stok-yonetimi" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <UrunStokYonetimi />
              </ProtectedRoute>
            } />
            
            <Route path="/stok" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <StokYonetimi />
              </ProtectedRoute>
            } />
            
            <Route path="/musteri-islemleri" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS', 'CASHIER']}>
                <MusteriIslemleri />
              </ProtectedRoute>
            } />
            
            <Route path="/personel" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <Personel />
              </ProtectedRoute>
            } />
            
            {/* Ayarlar ve Giderler - Sadece Admin */}
            <Route path="/ayarlar" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <Ayarlar />
              </ProtectedRoute>
            } />
            
            <Route path="/giderler" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <Giderler />
              </ProtectedRoute>
            } />
            
            {/* Raporlar - Sadece Admin (Anayasa Madde 6.5) */}
            <Route path="/raporlar" element={
              <ProtectedRoute allowedRoles={['ADMIN', '__SYS']}>
                <Raporlar />
              </ProtectedRoute>
            } />
            
            {/* Redirect for unknown routes */}
            <Route path="*" element={<Redirect />} />
          </Route>
          
          {/* ========== FALLBACK REDIRECT ========== */}
          {/* Eğer hiçbir route eşleşmezse ana sayfaya yönlendir */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;