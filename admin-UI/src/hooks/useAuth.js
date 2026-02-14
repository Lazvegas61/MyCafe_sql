/**
 * useAuth.js - MyCafe Authentication Custom Hook
 * MyCafe Anayasası: UI aptal - sadece context erişimi sağlar
 */

import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * MyCafe authentication hook'u
 * UI aptal: Sadece context'i döndürür, iş mantığı içermez
 */
export const useAuth = () => {
  const context = useAuthContext();
  
  // MyCafe kullanım kolaylığı için helper fonksiyonlar
  const isAuthenticated = context.isAuthenticated;
  const isLoading = context.isLoading;
  const user = context.user;
  
  // MyCafe rol kontrolleri (UI için)
  const isSuperAdmin = context.hasRole(context.MYCAFE_ROLES.SUPER_ADMIN);
  const isAdmin = context.hasRole(context.MYCAFE_ROLES.ADMIN);
  const isWaiter = context.hasRole(context.MYCAFE_ROLES.GARSON);
  const isKitchen = context.hasRole(context.MYCAFE_ROLES.MUTFAK);
  const isCashier = context.hasRole(context.MYCAFE_ROLES.CASHIER);
  
  // MyCafe yetki kontrolleri (asıl yetki backend'de, bu UI için)
  const canViewReports = context.hasPermission('view.reports');
  const canManageStock = context.hasPermission('manage.stock');
  const canOpenCloseDay = context.hasPermission('open.close.day');
  const canManageUsers = context.hasPermission('manage.users');
  const canProcessPayment = context.hasPermission('process.payment');
  
  // MyCafe gün durumu (Anayasa Madde 0.3)
  const isDayOpen = context.isDayOpen();
  const currentDay = context.currentDay;
  
  return {
    // State
    ...context,
    isAuthenticated,
    isLoading,
    user,
    
    // MyCafe rol flag'leri
    isSuperAdmin,
    isAdmin,
    isWaiter,
    isKitchen,
    isCashier,
    
    // MyCafe yetki flag'leri
    canViewReports,
    canManageStock,
    canOpenCloseDay,
    canManageUsers,
    canProcessPayment,
    
    // MyCafe gün durumu
    isDayOpen,
    currentDay,
    
    // MyCafe kısayollar
    login: context.login,
    logout: context.logout,
    checkAuth: context.checkAuth,
    hasPermission: context.hasPermission,
    hasRole: context.hasRole,
    updateCurrentDay: context.updateCurrentDay,
  };
};

export default useAuth;