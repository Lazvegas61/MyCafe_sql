// ==================================================
// Sidebar.jsx
// MyCafe – Static Sidebar (UI Only, No Logic)
// ==================================================

import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">MyCafe</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink to="/" end className="sidebar-link">
          Ana Ekran
        </NavLink>

        <NavLink to="/masalar" className="sidebar-link">
          Masalar
        </NavLink>

        <NavLink to="/bilardo" className="sidebar-link">
          Bilardo
        </NavLink>

        <NavLink to="/kategoriler" className="sidebar-link">
          Kategoriler
        </NavLink>

        <NavLink to="/urun-stok-yonetimi" className="sidebar-link">
          Ürün & Stok Yönetimi
        </NavLink>

        <NavLink to="/stok" className="sidebar-link">
          Stok
        </NavLink>

        <NavLink to="/musteri-islemleri" className="sidebar-link">
          Müşteri İşlemleri
        </NavLink>

        <NavLink to="/personel" className="sidebar-link">
          Personel
        </NavLink>

        <NavLink to="/raporlar" className="sidebar-link">
          Raporlar
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
