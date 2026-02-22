"""
MyCafe - Müşteri Yönetimi API Endpoint'leri

Bu endpoint'ler:
- Müşteri kaydetme/güncelleme
- Borç yazma (hesaba yazma)
- Borç ödemesi alma
- Borç sorgulama
- Borç raporları (sadece ADMIN)
"""

from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from decimal import Decimal

from app.api.deps import get_current_user, get_db_connection, require_admin
from app.repositories.customer_repository import CustomerRepository
from app.repositories.day_repository import DayRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.customer_service import CustomerService
from app.models.domain import CustomerResponse, DebtResponse

router = APIRouter()


# ==================== MÜŞTERİ ENDPOINT'LERİ ====================

@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    full_name: str = Query(..., description="Müşteri adı soyadı"),
    phone: Optional[str] = Query(None, description="Telefon numarası"),
    email: Optional[str] = Query(None, description="E-posta adresi"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Yeni müşteri kaydeder.
    
    Kullanıcıya anlatımı:
        "Yeni müşteri kaydediyorum. Artık hesabına yazabiliriz."
    
    Örnek kullanım:
        POST /customers?full_name=Ahmet+Yılmaz&phone=5551234567
    
    Yetki:
        - GARSON, ADMIN kaydedebilir
        - MUTFAK kaydedemez
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.create_customer(
        full_name=full_name,
        phone=phone,
        email=email,
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    full_name: Optional[str] = Query(None, description="Yeni ad soyad"),
    phone: Optional[str] = Query(None, description="Yeni telefon"),
    email: Optional[str] = Query(None, description="Yeni e-posta"),
    is_active: Optional[bool] = Query(None, description="Aktif/pasif"),
    current_user: dict = Depends(require_admin),  # Sadece ADMIN
    conn = Depends(get_db_connection)
):
    """
    Müşteri bilgilerini günceller.
    
    Kullanıcıya anlatımı:
        "Müşteri bilgilerini güncelliyorum."
    
    Yetki:
        - Sadece ADMIN'ler güncelleyebilir
        - GARSON'lar güncelleyemez (bilgi değişikliği yetkisi)
    
    Örnek kullanım:
        PUT /customers/5?full_name=Yeni+İsim&phone=5557654321
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.update_customer(
        customer_id=customer_id,
        full_name=full_name,
        phone=phone,
        email=email,
        is_active=is_active,
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Müşteri detayını getirir.
    
    Kullanıcıya anlatımı:
        "Müşteri #{customer_id} detayını getiriyorum."
    
    Returns:
        - Müşteri bilgileri
        - Güncel borç durumu
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.get_customer(
        customer_id=customer_id,
        current_user_role=current_user['role']
    )


@router.get("/customers/search", response_model=List[CustomerResponse])
async def search_customers(
    q: str = Query(..., description="Arama terimi (isim veya telefon)"),
    include_inactive: bool = Query(False, description="Pasif müşterileri dahil et"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Müşteri ara.
    
    Kullanıcıya anlatımı:
        "{q} ile eşleşen müşterileri arıyorum."
    
    Örnek kullanım:
        GET /customers/search?q=Ahmet
        GET /customers/search?q=555123
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.find_customers(
        search_term=q,
        current_user_role=current_user['role'],
        include_inactive=include_inactive
    )


@router.get("/customers", response_model=List[CustomerResponse])
async def get_all_customers(
    include_inactive: bool = Query(False, description="Pasif müşterileri dahil et"),
    limit: int = Query(100, description="Maksimum kayıt sayısı", ge=1, le=1000),
    offset: int = Query(0, description="Atlanacak kayıt sayısı", ge=0),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Tüm müşterileri listeler.
    
    Kullanıcıya anlatımı:
        "Tüm müşterileri listeliyorum."
    
    Not:
        - Sayfalama için limit ve offset kullanılır
        - Varsayılan: ilk 100 kayıt
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.get_all_customers(
        current_user_role=current_user['role'],
        include_inactive=include_inactive,
        limit=limit,
        offset=offset
    )


# ==================== BORÇ ENDPOINT'LERİ ====================

@router.post("/debts", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    customer_id: int = Query(..., description="Müşteri ID"),
    invoice_id: int = Query(..., description="Adisyon ID"),
    amount: Decimal = Query(..., description="Borç tutarı", gt=0),
    description: Optional[str] = Query(None, description="Açıklama"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Müşteriye borç yazar (hesaba yazma).
    
    Kullanıcıya anlatımı:
        "Müşterinin hesabına {amount} TL borç yazıyorum."
    
    Örnek kullanım:
        POST /debts?customer_id=5&invoice_id=10&amount=250
    
    Kurallar:
        - Sadece açık adisyonlara borç yazılabilir
        - Gün açık olmalı
        - Müşteri aktif olmalı
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.create_debt(
        customer_id=customer_id,
        invoice_id=invoice_id,
        amount=amount,
        description=description,
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.post("/debts/pay", response_model=DebtResponse)
async def pay_debt(
    customer_id: int = Query(..., description="Müşteri ID"),
    amount: Decimal = Query(..., description="Ödeme tutarı", gt=0),
    payment_method: str = Query(..., description="Ödeme tipi: CASH, CREDIT_CARD"),
    description: Optional[str] = Query(None, description="Açıklama"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Müşteri borcuna ödeme alır.
    
    Kullanıcıya anlatımı:
        "Müşteriden {amount} TL borç ödemesi alıyorum."
    
    Örnek kullanım:
        POST /debts/pay?customer_id=5&amount=100&payment_method=CASH
    
    Kurallar:
        - Ödeme tutarı borçtan büyük olamaz
        - Gün açık olmalı
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.pay_debt(
        customer_id=customer_id,
        amount=amount,
        payment_method=payment_method,
        description=description,
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.get("/customers/{customer_id}/debts", response_model=List[DebtResponse])
async def get_customer_debts(
    customer_id: int,
    include_paid: bool = Query(False, description="Ödenmiş borçları da getir"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Müşterinin tüm borç hareketlerini getirir.
    
    Kullanıcıya anlatımı:
        "Müşterinin tüm borç hareketlerini getiriyorum."
    
    Örnek kullanım:
        GET /customers/5/debts
        GET /customers/5/debts?include_paid=true
    
    Returns:
        - Borç yazma işlemleri
        - Borç ödeme işlemleri
        - Varsa düzeltme işlemleri
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.get_customer_debts(
        customer_id=customer_id,
        current_user_role=current_user['role'],
        include_paid=include_paid
    )


@router.get("/customers/{customer_id}/balance", response_model=dict)
async def get_customer_balance(
    customer_id: int,
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Müşterinin güncel borç durumunu getirir.
    
    Kullanıcıya anlatımı:
        "Müşterinin güncel borç durumunu getiriyorum."
    
    Returns:
        {
            "customer_id": 5,
            "customer_name": "Ahmet Yılmaz",
            "total_debt": 500.00,      # Toplam borç
            "total_paid": 200.00,       # Toplam ödenen
            "current_balance": 300.00,  # Kalan borç
            "last_transaction": "2024-01-15T14:30:00",
            "transaction_count": 3
        }
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.get_customer_balance(
        customer_id=customer_id,
        current_user_role=current_user['role']
    )


# ==================== BORÇ RAPORLARI (SADECE ADMIN) ====================

@router.get("/reports/debtors", response_model=List[dict])
async def get_debtors(
    min_debt: Decimal = Query(0, description="Minimum borç tutarı"),
    include_paid: bool = Query(False, description="Borcu bitmiş müşterileri dahil et"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Borçlu müşterileri listeler.
    
    Kullanıcıya anlatımı:
        "Borçlu müşterileri listeliyorum."
    
    Yetki:
        - Sadece ADMIN'ler görebilir
        - GARSON'lar göremez (finansal veri)
    
    Örnek kullanım:
        GET /reports/debtors?min_debt=100
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.get_all_debtors(
        current_user_role=current_user['role'],
        min_debt=min_debt,
        include_paid=include_paid
    )


@router.get("/reports/debt-summary", response_model=dict)
async def get_debt_summary(
    day_id: Optional[int] = Query(None, description="Gün ID (opsiyonel)"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Borç özeti raporu.
    
    Kullanıcıya anlatımı:
        "Borç özetini getiriyorum."
    
    Yetki:
        - Sadece ADMIN'ler
    
    Returns:
        {
            "total_debt_created": 1250.50,   # Oluşturulan toplam borç
            "total_debt_paid": 800.00,        # Ödenen toplam borç
            "current_total_debt": 450.50,     # Anlık toplam borç
            "debtor_count": 12,                # Borçlu müşteri sayısı
            "average_debt": 37.54              # Ortalama borç
        }
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.get_debt_summary(
        current_user_role=current_user['role'],
        day_id=day_id
    )


# ==================== BORÇ DÜZELTME (SADECE ADMIN) ====================

@router.post("/debts/correct", response_model=dict)
async def correct_debt(
    customer_id: int = Query(..., description="Müşteri ID"),
    correction_amount: Decimal = Query(..., description="Düzeltme tutarı (+ veya -)"),
    reason: str = Query(..., description="Düzeltme sebebi", min_length=10),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Borç düzeltmesi yapar (sadece ADMIN).
    
    Kullanıcıya anlatımı:
        "Müşteri borcunu düzeltiyorum. Sebep: {reason}"
    
    Yetki:
        - Sadece ADMIN'ler yapabilir
        - GARSON'lar yapamaz (kötüye kullanımı engellemek için)
    
    Örnek kullanım:
        POST /debts/correct?customer_id=5&correction_amount=-50&reason=Yanlışlıkla%20fazla%20yazılmış
    
    Kurallar:
        - Düzeltme sebebi en az 10 karakter olmalı
        - Gün açık olmalı
        - Eski kayıtlar silinmez, yeni düzeltme kaydı eklenir
    """
    customer_repo = CustomerRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = CustomerService(customer_repo, day_repo, invoice_repo)
    
    return await service.correct_debt(
        customer_id=customer_id,
        correction_amount=correction_amount,
        reason=reason,
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )