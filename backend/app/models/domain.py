"""
MyCafe - Pydantic Domain Modelleri

Bu modeller:
- Sadece response için kullanılır (UI'ya veri dönerken)
- Request validation için değil (çünkü iş kuralları DB'de)
- Tüm modeller SQL prosedürlerinden dönen verilerle uyumlu
"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List


# ==================== TEMEL MODELLER ====================

class BaseResponse(BaseModel):
    """Tüm response modellerinin base sınıfı"""
    class Config:
        from_attributes = True
        arbitrary_types_allowed = True


# ==================== GÜN MODELLERİ ====================

class DayMarkerResponse(BaseResponse):
    """Gün bilgisi - daymarker tablosu"""
    id: int
    day_date: date
    is_open: bool
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    opened_by: Optional[int] = None
    closed_by: Optional[int] = None


class DaySnapshotResponse(BaseResponse):
    """Gün snapshot'ı - daysnapshot tablosu"""
    id: int
    day_id: int
    snapshot_date: datetime
    snapshot_type: str  # OPENING, CLOSING
    data: dict  # JSON snapshot


class DayStatusResponse(BaseResponse):
    """Gün durumu - UI için özet"""
    is_open: bool
    current_date: date
    opened_at: Optional[datetime] = None
    can_operate: bool  # İşlem yapılabilir mi?
    message: str


# ==================== MASA MODELLERİ ====================

class TableResponse(BaseResponse):
    """Masa bilgisi - restaurant_table"""
    id: int
    table_number: int
    table_name: str
    qr_code: Optional[str] = None
    is_active: bool
    current_invoice_id: Optional[int] = None
    is_occupied: bool


# ==================== ADİSYON MODELLERİ ====================

class InvoiceLineResponse(BaseResponse):
    """Adisyon satırı - invoiceline"""
    id: int
    invoice_id: int
    line_type: str  # NORMAL, SIPARIS_YEMEK, BILARDO
    product_id: Optional[int] = None
    product_name_snapshot: str
    quantity: Decimal
    unit_price_snapshot: Decimal
    line_total: Decimal
    note: Optional[str] = None
    created_at: datetime
    created_by: int


class InvoiceResponse(BaseResponse):
    """Adisyon - invoice"""
    id: int
    table_id: int
    table_number: int
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    status: str  # OPEN, CLOSED, CANCELLED, DEBT
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opened_by: int
    opened_by_name: str
    closed_by: Optional[int] = None
    total_amount: Decimal  # UI için toplam (finans değil!)
    lines: List[InvoiceLineResponse] = []


class InvoiceSummaryResponse(BaseResponse):
    """Adisyon özeti - listeleme için"""
    id: int
    table_number: int
    status: str
    opened_at: datetime
    total_amount: Decimal
    line_count: int
    customer_name: Optional[str] = None


# ==================== FİNANS MODELLERİ ====================

class FinanceTransactionResponse(BaseResponse):
    """Finans hareketi - financetransaction"""
    id: int
    transaction_date: datetime
    day_id: int
    invoice_id: Optional[int] = None
    transaction_type: str  # SALES, PAYMENT, DEBT, EXPENSE
    amount: Decimal
    payment_method: Optional[str] = None  # CASH, CREDIT_CARD, DEBT
    description: Optional[str] = None
    created_by: int
    created_by_name: str


# ==================== MÜŞTERİ MODELLERİ ====================

class CustomerResponse(BaseResponse):
    """Müşteri - customer"""
    id: int
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    total_debt: Decimal
    is_active: bool
    created_at: datetime


class DebtResponse(BaseResponse):
    """Borç kaydı - financetransaction üzerinden"""
    id: int
    customer_id: int
    customer_name: str
    amount: Decimal
    created_at: datetime
    invoice_id: Optional[int] = None
    description: Optional[str] = None
    is_paid: bool


# ==================== ÖDEME MODELLERİ ====================

class PaymentRequest(BaseModel):
    """Ödeme isteği - Request modeli"""
    invoice_id: int
    payment_method: str  # CASH, CREDIT_CARD, DEBT
    amount: Decimal
    customer_id: Optional[int] = None  # DEBT için zorunlu
    description: Optional[str] = None


class PaymentResponse(BaseResponse):
    """Ödeme sonucu"""
    success: bool
    transaction_id: Optional[int] = None
    invoice_id: int
    invoice_closed: bool
    table_freed: bool
    message: str
    billiard_calculated: bool
    new_balance: Optional[Decimal] = None  # Müşteri borcu varsa


# ==================== BİLARDO MODELLERİ ====================

class BilliardSessionResponse(BaseResponse):
    """Bilardo seansı - billiard_session"""
    id: int
    table_id: int
    table_name: str
    invoice_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    total_amount: Optional[Decimal] = None
    is_active: bool


# ==================== RAPOR MODELLERİ ====================

class DailySalesReportResponse(BaseResponse):
    """Günlük satış raporu"""
    day_date: date
    total_sales: Decimal
    cash_payments: Decimal
    credit_card_payments: Decimal
    debt_created: Decimal
    debt_paid: Decimal
    invoice_count: int
    transaction_count: int


class ProductSalesReportResponse(BaseResponse):
    """Ürün bazlı satış raporu"""
    product_id: int
    product_name: str
    category_name: str
    quantity: Decimal
    total_amount: Decimal
    day_date: date