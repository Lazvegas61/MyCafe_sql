/**
 * AuthContext.jsx - MyCafe Authentication Context
 * MyCafe Anayasası Madde 3: UI aptaldır - sadece state yönetir, işlem yapmaz
 * MyCafe Anayasası Madde 5: Rol bazlı yetki - state'te rol tutar, kontrol backend'de
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authApi } from '../api/authApi';

// MyCafe User Rolleri (Anayasa Madde 1.7'den)
const MYCAFE_ROLES = {
  SUPER_ADMIN: '__SYS',
  ADMIN: 'ADMIN',
  GARSON: 'WAITER',
  MUTFAK: 'KITCHEN',
  CASHIER: 'CASHIER'
};

// Context için initial state
const initialState = {
  // Kullanıcı state'i (UI aptal - backend'den geleni tutar)
  user: null,
  token: null,
  permissions: [],
  
  // Loading state'leri (UI sadece gösterir)
  isLoading: true,
  isAuthenticated: false,
  
  // MyCafe özel state'leri
  currentDay: null,        // Anayasa Madde 0.3: Gün mantığı
  businessInfo: null,      // İşletme bilgisi
  uiPermissions: {         // UI için yetki flag'leri (asıl yetki backend'de)
    canViewReports: false,
    canManageStock: false,
    canOpenCloseDay: false,
    canManageUsers: false,
    canProcessPayment: true, // Garson için true
  }
};

// Context oluştur
export const AuthContext = createContext(initialState);

/**
 * AuthProvider - MyCafe Authentication State Provider
 * UI aptal: Sadece state yönetir, iş mantığı içermez
 */
export const AuthProvider = ({ children }) => {
  // State'ler - MyCafe Anayasası: UI sadece state tutar
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // MyCafe özel state'leri
  const [currentDay, setCurrentDay] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [uiPermissions, setUiPermissions] = useState(initialState.uiPermissions);

  /**
   * UI aptal: localStorage'dan state'i yükler, işlem yapmaz
   */
  const loadInitialState = useCallback(() => {
    try {
      const storedToken = localStorage.getItem('mycafe_access_token');
      const storedUser = localStorage.getItem('mycafe_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // MyCafe rolüne göre UI yetkilerini ayarla (asıl yetki backend'de)
        const userData = JSON.parse(storedUser);
        updateUiPermissions(userData.role || userData.role_code);
      }
    } catch (error) {
      console.error('[MyCafe Auth] Load initial state error:', error);
      // UI aptal - hata durumunda state'i temizle
      clearAuthState();
    }
  }, []);

  /**
   * Kullanıcı rolüne göre UI yetkilerini güncelle
   * MyCafe Anayasası Madde 5: Asıl yetki SQL'de, bu sadece UI kolaylığı
   */
  const updateUiPermissions = useCallback((role) => {
    const newPermissions = { ...initialState.uiPermissions };
    
    switch (role) {
      case MYCAFE_ROLES.SUPER_ADMIN:
      case MYCAFE_ROLES.ADMIN:
        newPermissions.canViewReports = true;
        newPermissions.canManageStock = true;
        newPermissions.canOpenCloseDay = true;
        newPermissions.canManageUsers = true;
        newPermissions.canProcessPayment = true;
        break;
        
      case MYCAFE_ROLES.GARSON:
      case MYCAFE_ROLES.CASHIER:
        newPermissions.canViewReports = false;
        newPermissions.canManageStock = false;
        newPermissions.canOpenCloseDay = false;
        newPermissions.canManageUsers = false;
        newPermissions.canProcessPayment = true;
        break;
        
      case MYCAFE_ROLES.MUTFAK:
        newPermissions.canViewReports = false;
        newPermissions.canManageStock = false;
        newPermissions.canOpenCloseDay = false;
        newPermissions.canManageUsers = false;
        newPermissions.canProcessPayment = false;
        break;
        
      default:
        // Varsayılan: minimum yetki
        break;
    }
    
    setUiPermissions(newPermissions);
  }, []);

  /**
   * MyCafe giriş işlemi - UI aptal: sadece API'yi çağırır, state'i günceller
   */
  const login = async (username, password) => {
    try {
      setIsLoading(true);
      
      // Backend'i çağır (iş mantığı backend'de)
      const result = await authApi.login(username, password);
      
      if (result.access_token && result.user) {
        // State'leri güncelle (UI aptal - backend'den geleni kaydet)
        setToken(result.access_token);
        setUser(result.user);
        setIsAuthenticated(true);
        
        // UI yetkilerini güncelle
        updateUiPermissions(result.user.role || result.user.role_code);
        
        // MyCafe Audit: Login zamanı
        localStorage.setItem('mycafe_last_login', new Date().toISOString());
        
        console.log(`[MyCafe Auth] Login successful: ${result.user.username}`);
        return { success: true, data: result };
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('[MyCafe Auth] Login error:', error);
      
      // UI aptal - state'i temizle
      clearAuthState();
      
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * MyCafe çıkış işlemi - UI aptal: sadece API'yi çağırır, state'i temizler
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Backend logout (eğer varsa)
      await authApi.logout();
      
      // State'leri temizle
      clearAuthState();
      
      console.log('[MyCafe Auth] Logout successful');
      return { success: true };
      
    } catch (error) {
      console.error('[MyCafe Auth] Logout error:', error);
      
      // Yine de client state'ini temizle
      clearAuthState();
      
      return { success: false, error: 'Logout failed' };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * State temizleme - UI aptal: sadece state'i sıfırlar
   */
  const clearAuthState = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    setIsAuthenticated(false);
    setUiPermissions(initialState.uiPermissions);
    
    // LocalStorage temizle
    localStorage.removeItem('mycafe_access_token');
    localStorage.removeItem('mycafe_user');
    localStorage.removeItem('mycafe_last_login');
    localStorage.removeItem('mycafe_last_activity');
  };

  /**
   * Mevcut kullanıcıyı kontrol et - Backend'den verify
   * MyCafe Anayasası: Asıl yetki SQL'de, bu sadece token kontrolü
   */
  const checkAuth = async () => {
    try {
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return false;
      }
      
      // Backend'den kullanıcı bilgisini al
      const userData = await authApi.getCurrentUser();
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        updateUiPermissions(userData.role || userData.role_code);
        return true;
      } else {
        clearAuthState();
        return false;
      }
      
    } catch (error) {
      console.error('[MyCafe Auth] Check auth error:', error);
      clearAuthState();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Yetki kontrolü - UI için kolaylık fonksiyonu
   * MyCafe Anayasası Madde 5: Asıl kontrol backend'de (check_permission())
   */
  const hasPermission = (permissionCode) => {
    // Önce UI yetkilerini kontrol et (performans için)
    const uiPermissionMap = {
      'view.reports': uiPermissions.canViewReports,
      'manage.stock': uiPermissions.canManageStock,
      'open.close.day': uiPermissions.canOpenCloseDay,
      'manage.users': uiPermissions.canManageUsers,
      'process.payment': uiPermissions.canProcessPayment,
    };
    
    if (uiPermissionMap[permissionCode] !== undefined) {
      return uiPermissionMap[permissionCode];
    }
    
    // UI yetkisinde yoksa permissions array'inde ara
    return permissions.some(p => p.permission_code === permissionCode);
  };

  /**
   * Rol kontrolü - UI için kolaylık
   */
  const hasRole = (role) => {
    if (!user) return false;
    
    const userRole = user.role || user.role_code;
    return userRole === role;
  };

  /**
   * MyCafe gün durumu - Anayasa Madde 0.3
   */
  const updateCurrentDay = (dayInfo) => {
    setCurrentDay(dayInfo);
    // MyCafe gün bilgisini localStorage'a kaydet (UI aptal - sadece tutar)
    if (dayInfo) {
      localStorage.setItem('mycafe_current_day', JSON.stringify(dayInfo));
    } else {
      localStorage.removeItem('mycafe_current_day');
    }
  };

  // İlk yükleme - localStorage'dan state'i yükle
  useEffect(() => {
    loadInitialState();
    
    // Sayfa görünürlüğü değiştiğinde auth kontrolü
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        checkAuth();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadInitialState, token]);

  // Periodik auth kontrolü (5 dakikada bir)
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // 5 dakika
    
    return () => clearInterval(interval);
  }, [token]);

  // Context value
  const contextValue = {
    // State
    user,
    token,
    permissions,
    isLoading,
    isAuthenticated,
    currentDay,
    businessInfo,
    uiPermissions,
    
    // MyCafe özel değerler
    MYCAFE_ROLES,
    
    // Actions (UI aptal - sadece API çağırır)
    login,
    logout,
    checkAuth,
    hasPermission,
    hasRole,
    updateCurrentDay,
    
    // MyCafe util fonksiyonları
    isAdmin: () => hasRole(MYCAFE_ROLES.ADMIN) || hasRole(MYCAFE_ROLES.SUPER_ADMIN),
    isWaiter: () => hasRole(MYCAFE_ROLES.GARSON),
    isKitchen: () => hasRole(MYCAFE_ROLES.MUTFAK),
    isCashier: () => hasRole(MYCAFE_ROLES.CASHIER),
    
    // MyCafe gün kontrolü
    isDayOpen: () => currentDay?.is_open === true,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth hook - MyCafe authentication hook'u
 * UI aptal: Sadece context'i döndürür
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;