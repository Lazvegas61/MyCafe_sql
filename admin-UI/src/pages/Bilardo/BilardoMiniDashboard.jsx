// admin-ui/src/pages/Bilardo/BilardoMiniDashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getBilliardReport } from "../../api/billiardApi";
import "./BilardoMiniDashboard.css";

export default function BilardoMiniDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    gunlukCiro: 0,
    acikMasaSayisi: 0,
    toplamOyunSuresi: 0,
    ortalamaMasaGeliri: 0,
    tamamlananMasaSayisi: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Yetki kontrolü: Mutfak rolü için gösterme
  if (user?.role === "MUTFAK") {
    return null;
  }

  // Dashboard verilerini API'den çek
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Bugünün tarihi
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        // API'den bilardo raporunu al
        const reportData = await getBilliardReport(startOfDay, endOfDay);
        
        // API'den gelen veriyi formatla
        setDashboardData({
          gunlukCiro: reportData.daily_income || 0,
          acikMasaSayisi: reportData.open_tables_count || 0,
          toplamOyunSuresi: reportData.total_play_time_minutes || 0,
          ortalamaMasaGeliri: reportData.average_table_income || 0,
          tamamlananMasaSayisi: reportData.completed_sessions_count || 0
        });

      } catch (err) {
        console.error("Dashboard veri çekme hatası:", err);
        setError("Veriler yüklenemedi");
        // Hata durumunda boş veri göster
        setDashboardData({
          gunlukCiro: 0,
          acikMasaSayisi: 0,
          toplamOyunSuresi: 0,
          ortalamaMasaGeliri: 0,
          tamamlananMasaSayisi: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Her 60 saniyede bir güncelle (Anayasaya uygun - UI hesaplama yapmaz)
    const interval = setInterval(fetchDashboardData, 60000);

    return () => clearInterval(interval);
  }, []);

  // Format fonksiyonları (SADECE GÖSTERİM - hesaplama yok)
  const formatSure = (dakika) => {
    const saat = Math.floor(dakika / 60);
    const dk = dakika % 60;
    return `${saat.toString().padStart(2, '0')}:${dk.toString().padStart(2, '0')}`;
  };

  const formatPara = (miktar) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(miktar);
  };

  if (error) {
    return (
      <div className="bilardo-mini-dashboard">
        <div className="dashboard-card error-card">
          <div className="dashboard-card-content">
            <div className="dashboard-card-value">⚠️</div>
            <div className="dashboard-card-label">Hata</div>
            <div className="dashboard-card-subtext">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bilardo-mini-dashboard">
      {/* Günlük Toplam Bilardo Cirosu */}
      <div className={`dashboard-card ciro-card ${loading ? 'loading' : ''}`}>
        <div className="dashboard-card-icon">💰</div>
        <div className="dashboard-card-content">
          <div className="dashboard-card-value">
            {loading ? "..." : `${formatPara(dashboardData.gunlukCiro)}₺`}
          </div>
          <div className="dashboard-card-label">Günlük Ciro</div>
          <div className="dashboard-card-subtext">📅 Bugün (API)</div>
        </div>
      </div>

      {/* Açık Masa Sayısı */}
      <div className={`dashboard-card masa-card ${loading ? 'loading' : ''}`}>
        <div className="dashboard-card-icon">🎱</div>
        <div className="dashboard-card-content">
          <div className="dashboard-card-value">
            {loading ? "..." : dashboardData.acikMasaSayisi}
          </div>
          <div className="dashboard-card-label">Aktif Masalar</div>
          <div className="dashboard-card-subtext">⚡ Anlık (API)</div>
        </div>
      </div>

      {/* Toplam Oynanan Süre */}
      <div className={`dashboard-card sure-card ${loading ? 'loading' : ''}`}>
        <div className="dashboard-card-icon">⏱️</div>
        <div className="dashboard-card-content">
          <div className="dashboard-card-value digital-clock">
            {loading ? "--:--" : formatSure(dashboardData.toplamOyunSuresi)}
          </div>
          <div className="dashboard-card-label">Toplam Oyun Süresi</div>
          <div className="dashboard-card-subtext">⏱️ Saat:Dakika (API)</div>
        </div>
      </div>

      {/* Ortalama Masa Geliri */}
      <div className={`dashboard-card ortalama-card ${loading ? 'loading' : ''}`}>
        <div className="dashboard-card-icon">📊</div>
        <div className="dashboard-card-content">
          <div className="dashboard-card-value">
            {loading ? "..." : `${formatPara(dashboardData.ortalamaMasaGeliri)}₺`}
          </div>
          <div className="dashboard-card-label">Ortalama Masa</div>
          <div className="dashboard-card-subtext">
            ✅ {dashboardData.tamamlananMasaSayisi} masa (API)
          </div>
        </div>
      </div>
    </div>
  );
}