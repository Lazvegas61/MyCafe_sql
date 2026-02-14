/**
 * axiosConfig.js - MyCafe API Configuration
 * MyCafe Anayasası Madde 3: "UI aptaldır - hesap yapmaz, finans üretmez, sadece gösterir"
 * Bu dosya sadece veri taşır, işlem yapmaz.
 */

import axios from 'axios';

// MyCafe Backend API base URL (Anayasa: backend tek kaynak)
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Axios instance oluştur (UI aptal kalacak, sadece taşıyıcı)
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 saniye timeout
  headers: {
    'Content-Type': 'application/json',
    'X-MyCafe-Client': 'React-UI-v1.0'
  }
});

// ✅ REQUEST INTERCEPTOR - Sadece token ekler, değişiklik yapmaz
axiosInstance.interceptors.request.use(
  (config) => {
    // MyCafe Anayasası Madde 5: Yetki SQL'den, token backend'den
    const token = localStorage.getItem('mycafe_access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // MyCafe Audit Trail için metadata (Madde 8)
    config.headers['X-Request-ID'] = Date.now();
    config.headers['X-Client-Time'] = new Date().toISOString();
    
    return config;
  },
  (error) => {
    // UI aptal - sadece hatayı ilet
    console.error('[MyCafe API] Request error:', error);
    return Promise.reject(error);
  }
);

// ✅ RESPONSE INTERCEPTOR - Sadece yönlendirme yapar, işlem yapmaz
axiosInstance.interceptors.response.use(
  (response) => {
    // Başarılı response - UI sadece gösterir
    console.log(`[MyCafe API] ${response.config.method?.toUpperCase()} ${response.config.url}: ${response.status}`);
    return response;
  },
  (error) => {
    // Hata durumu - UI aptal, sadece backend'in verdiği hatayı gösterir
    
    if (error.response) {
      const { status, data } = error.response;
      
      console.error(`[MyCafe API] Error ${status}:`, data);
      
      // MyCafe Anayasası Madde 5: Yetki kontrolü SQL'de
      if (status === 401) {
        // Unauthorized - token expired veya yok
        console.warn('[MyCafe API] 401 Unauthorized - Clearing auth data');
        localStorage.removeItem('mycafe_access_token');
        localStorage.removeItem('mycafe_user');
        
        // Sadece login sayfasına yönlendir, karar vermez
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?reason=session_expired';
        }
      }
      
      if (status === 403) {
        // Forbidden - SQL'de yetki yok (check_permission() false döndü)
        console.warn('[MyCafe API] 403 Forbidden - Permission denied by SQL');
      }
    } else if (error.request) {
      // Network error - backend ulaşılamıyor
      console.error('[MyCafe API] Network error - Backend unreachable');
    } else {
      // Config error
      console.error('[MyCafe API] Configuration error:', error.message);
    }
    
    // UI aptal - hatayı olduğu gibi ilet
    return Promise.reject(error);
  }
);

// MyCafe Anayasası: UI asla finans üretmez, sadece gösterir
export default axiosInstance;