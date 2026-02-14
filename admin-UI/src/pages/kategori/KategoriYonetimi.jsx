// src/pages/KategoriYonetimi.jsx (MyCafe Anayasası Uyumlu - GÜNCELLENMİŞ)
import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const KategoriYonetimi = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Form state
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [isSiparisYemek, setIsSiparisYemek] = useState(false);
  const [hideStock, setHideStock] = useState(false);
  const [hideInReports, setHideInReports] = useState(false);
  const [manualPriceEachTime, setManualPriceEachTime] = useState(false);

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("info");

  // API token'ını al
  const getAuthToken = () => {
    return localStorage.getItem("mc_token");
  };

  const getHeaders = () => {
    return {
      "Authorization": `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json"
    };
  };

  // Kategorileri API'den çek
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/categories`,
        { headers: getHeaders() }
      );
      
      if (response.data && response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Kategoriler yüklenirken hata:", error);
      showMessage("Kategoriler yüklenemedi", "error");
    } finally {
      setLoading(false);
    }
  };

  // Mesaj gösterimi
  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
    if (text) {
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  // Formu temizle
  const resetForm = () => {
    setSelectedCategory(null);
    setName("");
    setParentId("");
    setIsSiparisYemek(false);
    setHideStock(false);
    setHideInReports(false);
    setManualPriceEachTime(false);
  };

  // Kategori seç
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setName(category.name);
    setParentId(category.parent_id || "");
    setIsSiparisYemek(category.is_siparis_yemek || false);
    setHideStock(category.hide_stock || false);
    setHideInReports(category.hide_in_reports || false);
    setManualPriceEachTime(category.manual_price_each_time || false);
  };

  // SİPARİŞ YEMEK tipi seçildiğinde otomatik kurallar (UI'da kullanıcıya gösterim için)
  useEffect(() => {
    if (isSiparisYemek) {
      setHideStock(true);
      setHideInReports(true);
      setManualPriceEachTime(true);
    }
  }, [isSiparisYemek]);

  // Kategori kaydet/güncelle
  const handleSave = async () => {
    if (!name.trim()) {
      showMessage("Kategori adı boş olamaz.", "error");
      return;
    }

    const categoryData = {
      name: name.trim(),
      parent_id: parentId || null,
      is_siparis_yemek: isSiparisYemek,
      hide_stock: hideStock,
      hide_in_reports: hideInReports,
      manual_price_each_time: manualPriceEachTime
    };

    try {
      setLoading(true);
      let response;

      if (selectedCategory) {
        // Güncelle
        response = await axios.put(
          `${API_BASE_URL}/api/v1/categories/${selectedCategory.id}`,
          categoryData,
          { headers: getHeaders() }
        );
      } else {
        // Yeni kategori
        response = await axios.post(
          `${API_BASE_URL}/api/v1/categories`,
          categoryData,
          { headers: getHeaders() }
        );
      }

      if (response.data && response.data.success) {
        showMessage(
          selectedCategory ? "Kategori güncellendi." : "Yeni kategori eklendi.",
          "success"
        );
        await fetchCategories();
        if (!selectedCategory && response.data.data) {
          handleSelectCategory(response.data.data);
        }
      } else {
        throw new Error(response.data?.message || "İşlem başarısız");
      }
    } catch (error) {
      console.error("Kategori kaydetme hatası:", error);
      
      // Backend'den gelen özel hata mesajlarını göster
      if (error.response && error.response.data && error.response.data.detail) {
        showMessage(`Hata: ${error.response.data.detail}`, "error");
      } else {
        showMessage(`Hata: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Kategori sil
  const handleDelete = async () => {
    if (!selectedCategory) {
      showMessage("Silmek için önce bir kategori seçin.", "error");
      return;
    }

    if (!window.confirm(`"${selectedCategory.name}" kategorisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(
        `${API_BASE_URL}/api/v1/categories/${selectedCategory.id}`,
        { headers: getHeaders() }
      );

      if (response.data && response.data.success) {
        showMessage("Kategori silindi.", "success");
        resetForm();
        await fetchCategories();
      } else {
        throw new Error(response.data?.message || "Silme işlemi başarısız");
      }
    } catch (error) {
      console.error("Kategori silme hatası:", error);
      showMessage(`Silinemedi: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Hiyerarşik liste (alfabetik sıralı)
  const renderCategoryTree = (categoriesList) => {
    // Alfabetik sırala
    const sortedCategories = [...categoriesList].sort((a, b) => 
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
    
    const rootCategories = sortedCategories.filter(c => !c.parent_id);
    
    const renderChildren = (parentId, level = 1) => {
      const children = sortedCategories.filter(c => c.parent_id === parentId);
      if (!children.length) return null;
      
      return (
        <ul className="kategori-tree-level">
          {children.map(child => (
            <li key={child.id}>
              <button
                type="button"
                className={`kategori-tree-item ${
                  selectedCategory?.id === child.id ? 'selected' : ''
                }`}
                onClick={() => handleSelectCategory(child)}
              >
                <span className="kategori-tree-name">
                  {"— ".repeat(level)}
                  {child.name}
                </span>
                {child.is_siparis_yemek && (
                  <span className="kategori-badge badge-siparis">
                    SİPARİŞ YEMEK
                  </span>
                )}
                {child.hide_stock && !child.is_siparis_yemek && (
                  <span className="kategori-badge badge-stock">
                    Stok Gösterme
                  </span>
                )}
                {child.hide_in_reports && !child.is_siparis_yemek && (
                  <span className="kategori-badge badge-report">
                    Raporda Gizli
                  </span>
                )}
                {child.manual_price_each_time && !child.is_siparis_yemek && (
                  <span className="kategori-badge badge-manual">
                    Manuel Fiyat
                  </span>
                )}
              </button>
              {renderChildren(child.id, level + 1)}
            </li>
          ))}
        </ul>
      );
    };

    return (
      <ul className="kategori-tree-root">
        {rootCategories.map(cat => (
          <li key={cat.id}>
            <button
              type="button"
              className={`kategori-tree-item ${
                selectedCategory?.id === cat.id ? 'selected' : ''
              }`}
              onClick={() => handleSelectCategory(cat)}
            >
              <span className="kategori-tree-name">{cat.name}</span>
              {cat.is_siparis_yemek && (
                <span className="kategori-badge badge-siparis">
                  SİPARİŞ YEMEK
                </span>
              )}
              {cat.hide_stock && !cat.is_siparis_yemek && (
                <span className="kategori-badge badge-stock">
                  Stok Gösterme
                </span>
              )}
              {cat.hide_in_reports && !cat.is_siparis_yemek && (
                <span className="kategori-badge badge-report">
                  Raporda Gizli
                </span>
              )}
              {cat.manual_price_each_time && !cat.is_siparis_yemek && (
                <span className="kategori-badge badge-manual">
                  Manuel Fiyat
                </span>
              )}
            </button>
            {renderChildren(cat.id, 1)}
          </li>
        ))}
      </ul>
    );
  };

  // Parent seçenekleri (SİPARİŞ YEMEK ve kendisi hariç)
  const parentOptions = categories
    .filter(cat => 
      !cat.is_siparis_yemek && 
      (!selectedCategory || cat.id !== selectedCategory.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));

  // İlk yükleme
  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="page-container kategori-page">
      <div className="page-header">
        <h1 className="page-title">Kategori Yönetimi</h1>
        <div className="role-badge">ADMIN</div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      )}

      {message && (
        <div className={`page-message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="kategori-layout">
        {/* SOL: Kategori Listesi */}
        <div className="kategori-panel kategori-list-panel">
          <div className="panel-header">
            <h2>Kategori Listesi</h2>
            <p className="panel-subtitle">
              Tüm kategoriler alfabetik ve hiyerarşik olarak listelenir.
            </p>
            <button
              type="button"
              className="btn-refresh"
              onClick={fetchCategories}
              disabled={loading}
            >
              ↻ Yenile
            </button>
          </div>
          <div className="kategori-tree-container">
            {categories.length === 0 ? (
              <p>
                {loading ? "Yükleniyor..." : "Henüz kategori yok. Sağ taraftan yeni kategori ekleyebilirsiniz."}
              </p>
            ) : (
              renderCategoryTree(categories)
            )}
          </div>
        </div>

        {/* SAĞ: Kategori Form */}
        <div className="kategori-panel kategori-form-panel">
          <div className="panel-header">
            <h2>{selectedCategory ? "Kategori Düzenle" : "Yeni Kategori"}</h2>
            <p className="panel-subtitle">
              Kategori adı, üst kategori ve özel ayarları buradan yönetilir.
            </p>
          </div>

          <div className="form-row">
            <label className="form-label">Kategori Adı *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örnek: SICAK İÇECEKLER"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Üst Kategori</label>
            <select
              className="form-select"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={loading || isSiparisYemek}
            >
              <option value="">(Ana kategori olsun)</option>
              {parentOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {isSiparisYemek && (
              <small className="text-muted">SİPARİŞ YEMEK üst kategori olamaz</small>
            )}
          </div>

          <div className="form-group-box">
            <div className="form-group-title">Özel Ayarlar</div>

            <div className="form-checkbox-row">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={isSiparisYemek}
                  onChange={(e) => setIsSiparisYemek(e.target.checked)}
                  disabled={loading || (selectedCategory && selectedCategory.is_siparis_yemek)}
                />
                <span>
                  <strong>SİPARİŞ YEMEK tipi</strong> (Anayasal Kategori)
                </span>
                {selectedCategory?.is_siparis_yemek && (
                  <small className="text-muted">(Bu ayar değiştirilemez)</small>
                )}
              </label>
              {isSiparisYemek && (
                <div className="siparis-yemek-kurallar">
                  <small>
                    <strong>Kurallar:</strong><br/>
                    • Stok yok / düşülmez<br/>
                    • Fiyat her eklemede manuel<br/>
                    • Raporlarda görünmez<br/>
                    • Sistemde sadece 1 tane
                  </small>
                </div>
              )}
            </div>

            <div className="form-checkbox-row">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={hideStock}
                  onChange={(e) => setHideStock(e.target.checked)}
                  disabled={loading || isSiparisYemek}
                />
                <span>Stok bilgisi gösterilmesin (ÇAY / ORALET gibi)</span>
              </label>
            </div>

            <div className="form-checkbox-row">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={hideInReports}
                  onChange={(e) => setHideInReports(e.target.checked)}
                  disabled={loading || isSiparisYemek}
                />
                <span>Kategori / ürün raporlarında gösterme</span>
              </label>
            </div>

            <div className="form-checkbox-row">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={manualPriceEachTime}
                  onChange={(e) => setManualPriceEachTime(e.target.checked)}
                  disabled={loading || isSiparisYemek}
                />
                <span>Fiyatı her adisyona eklemede manuel iste</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || !name.trim()}
            >
              {loading ? "İşleniyor..." : (selectedCategory ? "Güncelle" : "Kaydet")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
              disabled={loading}
            >
              Yeni / Temizle
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={loading || !selectedCategory || (selectedCategory && selectedCategory.is_siparis_yemek)}
            >
              Sil
            </button>
          </div>

          {selectedCategory?.is_siparis_yemek && (
            <div className="alert alert-warning">
              <strong>⚠ SİPARİŞ YEMEK Kategorisi (Anayasal Kategori):</strong><br/>
              • Stok yok / düşülmez<br/>
              • Fiyat her eklemede manuel girilir<br/>
              • Raporlarda görünmez<br/>
              • Adisyonlarda "SİPARİŞ YEMEK" olarak görünür<br/>
              • Sistemde sadece 1 tane olabilir<br/>
              • Silinemez / tipi değiştirilemez
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KategoriYonetimi;