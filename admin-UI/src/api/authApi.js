/**
 * authApi.js - MyCafe Authentication API Service
 * MyCafe Anayasası Madde 3: UI aptaldır - sadece backend'i çağırır
 * MyCafe Anayasası Madde 5: Yetki kontrolü SQL'de (check_permission())
 */

import axiosInstance from './axiosConfig';

/**
 * MyCafe Authentication API Services
 * Tüm iş mantığı backend'de, bu sadece köprü
 */
export const authApi = {
  /**
   * Kullanıcı girişi - Backend'deki /auth/login endpoint'ini çağırır
   * MyCafe Anayasası: UI şifreyi hash'lemez, backend yapar
   */
  login: async (username, password) => {
    try {
      // MyCafe backend OAuth2PasswordRequestForm formatını bekliyor
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      console.log(`[MyCafe Auth] Attempting login for user: ${username}`);
      
      const response = await axiosInstance.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const data = response.data;
      
      // UI aptal - backend'den geleni olduğu gibi kaydeder
      if (data.access_token) {
        localStorage.setItem('mycafe_access_token', data.access_token);
        localStorage.setItem('mycafe_user', JSON.stringify(data.user));
        
        console.log(`[MyCafe Auth] Login successful for: ${data.user?.username}`);
      }
      
      return data;
      
    } catch (error) {
      console.error('[MyCafe Auth] Login failed:', error);
      throw error; // UI aptal - hatayı olduğu gibi ilet
    }
  },
  
  /**
   * Çıkış yap - Backend logout endpoint'i yoksa client-side temizlik
   * MyCafe Anayasası: Audit trail backend'de (SQL trigger)
   */
  logout: async () => {
    try {
      // Önce backend'e logout bildirimi (eğer endpoint varsa)
      try {
        await axiosInstance.post('/auth/logout');
      } catch (e) {
        // Endpoint yoksa sorun değil, MyCafe Anayasası'nda zorunlu değil
        console.log('[MyCafe Auth] No logout endpoint, client-side cleanup only');
      }
      
      // Client-side temizlik
      localStorage.removeItem('mycafe_access_token');
      localStorage.removeItem('mycafe_user');
      localStorage.removeItem('mycafe_last_activity');
      
      console.log('[MyCafe Auth] Logout completed');
      
      return { success: true, message: 'Logged out successfully' };
      
    } catch (error) {
      console.error('[MyCafe Auth] Logout error:', error);
      // Yine de client-side temizlik yap
      localStorage.clear();
      throw error;
    }
  },
  
  /**
   * Mevcut kullanıcı bilgisi - Backend /auth/me endpoint'i
   * MyCafe Anayasası: Rol bilgisi SQL'den gelir
   */
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      const userData = response.data;
      
      // UI aptal - gelen veriyi kaydeder
      if (userData) {
        localStorage.setItem('mycafe_user', JSON.stringify(userData));
      }
      
      return userData;
      
    } catch (error) {
      console.error('[MyCafe Auth] Get current user failed:', error);
      
      // 401 hatası ise token expired
      if (error.response?.status === 401) {
        localStorage.removeItem('mycafe_access_token');
        localStorage.removeItem('mycafe_user');
      }
      
      throw error;
    }
  },
  
  /**
   * Kullanıcı yetkileri - Backend'den permission listesi
   * MyCafe Anayasası Madde 5: Yetki kontrolü SQL'de (check_permission())
   */
  getUserPermissions: async () => {
    try {
      const response = await axiosInstance.get('/auth/permissions');
      return response.data;
    } catch (error) {
      console.error('[MyCafe Auth] Get permissions failed:', error);
      
      // Endpoint yoksa boş dizi döndür (UI aptal - karar vermez)
      if (error.response?.status === 404) {
        return { permissions: [] };
      }
      
      throw error;
    }
  },
  
  /**
   * Şifre değiştirme - Backend /auth/change-password endpoint'i
   * MyCafe Anayasası: UI şifreyi hash'lemez, backend yapar
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await axiosInstance.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      return response.data;
      
    } catch (error) {
      console.error('[MyCafe Auth] Change password failed:', error);
      throw error;
    }
  },
  
  /**
   * Token geçerlilik kontrolü - Sadece basit kontrol
   * MyCafe Anayasası: Asıl yetki SQL'de, bu sadece UI için
   */
  validateToken: () => {
    const token = localStorage.getItem('mycafe_access_token');
    const user = localStorage.getItem('mycafe_user');
    
    if (!token || !user) {
      return false;
    }
    
    try {
      // Token'ın expire kontrolü (basit - asıl kontrol backend'de)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Kullanıcı rollerine göre UI element kontrolü
   * MyCafe Anayasası Madde 5: Asıl yetki SQL'de, bu sadece UI kolaylığı
   */
  hasRole: (role) => {
    try {
      const userStr = localStorage.getItem('mycafe_user');
      if (!userStr) return false;
      
      const user = JSON.parse(userStr);
      return user.role === role || user.role_code === role;
    } catch (error) {
      return false;
    }
  }
};

export default authApi;