"""
MyCafe - Raporlama API Endpoint'leri

Bu endpoint'ler:
- Günlük satış raporları
- Ürün bazlı raporlar
- Finans hareketleri
- Karşılaştırma raporları
- Tümü sadece ADMIN yetkisiyle

NOT: Raporlar doğrudan financetransaction tablosundan okunur.
UI asla hesap yapmaz, sadece gösterir.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal

from app.api.deps import get_current_user, get_db_connection, require_admin
from app.repositories.payment_repository import PaymentRepository
from app.repositories.day_repository import DayRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.customer_repository import CustomerRepository
from app.services.report_service import ReportService
from app.models.domain import (
    DailySalesReportResponse,
    ProductSalesReportResponse,
    FinanceTransactionResponse
)

router = APIRouter()


# ==================== GÜNLÜK RAPORLAR ====================

@router.get("/reports/daily-sales", response_model=DailySalesReportResponse)
async def get_daily_sales_report(
    day_id: Optional[int] = Query(None, description="Gün ID (boşsa bugün)"),
    date: Optional[date] = Query(None, description="Tarih (YYYY-MM-DD)"),
    current_user: dict = Depends(require_admin),  # Sadece ADMIN
    conn = Depends(get_db_connection)
):
    """
    Günlük satış raporu.
    
    Kullanıcıya anlatımı:
        "Günlük satış raporunu getiriyorum:
        - Toplam satış: X TL
        - Nakit: Y TL
        - Kredi kartı: Z TL
        - Borç yazılan: T TL
        - Ödenen borç: K TL"
    
    Yetki:
        - Sadece ADMIN'ler görebilir
    
    Örnek kullanım:
        GET /reports/daily-sales?day_id=5
        GET /reports/daily-sales?date=2024-01-15
        GET /reports/daily-sales  # bugün
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_daily_sales_report(
        user_role=current_user['role'],
        day_id=day_id,
        report_date=date
    )


@router.get("/reports/daily-detailed", response_model=dict)
async def get_detailed_daily_report(
    day_id: Optional[int] = Query(None, description="Gün ID (boşsa bugün)"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Detaylı günlük rapor.
    
    Kullanıcıya anlatımı:
        "Günün detaylı raporunu getiriyorum:
        - Tüm ödemeler
        - Tüm adisyonlar
        - Borç hareketleri
        - Özet bilgiler"
    
    Returns:
        {
            "day_info": {...},
            "transactions": [...],   # Tüm finans hareketleri
            "payments": [...],        # Ödemeler
            "open_invoices": [...],   # Açık adisyonlar (varsa)
            "debt_summary": {...},
            "summary": {...}
        }
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_detailed_daily_report(
        user_role=current_user['role'],
        day_id=day_id
    )


# ==================== ÜRÜN RAPORLARI ====================

@router.get("/reports/product-sales", response_model=List[ProductSalesReportResponse])
async def get_product_sales_report(
    start_date: date = Query(..., description="Başlangıç tarihi (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Bitiş tarihi (YYYY-MM-DD)"),
    category_id: Optional[int] = Query(None, description="Kategori filtresi"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Ürün bazlı satış raporu.
    
    Kullanıcıya anlatımı:
        "Ürün bazlı satış raporunu getiriyorum:
        - Hangi üründen kaç satılmış
        - Toplam cirosu ne kadar"
    
    Örnek kullanım:
        GET /reports/product-sales?start_date=2024-01-01&end_date=2024-01-31
        GET /reports/product-sales?start_date=2024-01-01&end_date=2024-01-31&category_id=5
    
    Not:
        - Maksimum 1 yıllık rapor alınabilir
        - Tarihler ters girilirse otomatik düzeltilir
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_product_sales_report(
        user_role=current_user['role'],
        start_date=start_date,
        end_date=end_date,
        category_id=category_id
    )


@router.get("/reports/category-sales", response_model=List[dict])
async def get_category_sales_report(
    start_date: date = Query(..., description="Başlangıç tarihi"),
    end_date: date = Query(..., description="Bitiş tarihi"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Kategori bazlı satış raporu.
    
    Kullanıcıya anlatımı:
        "Kategori bazlı satış raporunu getiriyorum:
        - Hangi kategoriden ne kadar satılmış"
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_category_sales_report(
        user_role=current_user['role'],
        start_date=start_date,
        end_date=end_date
    )


# ==================== FİNANS RAPORLARI ====================

@router.get("/reports/finance-transactions", response_model=List[FinanceTransactionResponse])
async def get_finance_transactions(
    start_date: Optional[date] = Query(None, description="Başlangıç tarihi"),
    end_date: Optional[date] = Query(None, description="Bitiş tarihi"),
    transaction_type: Optional[str] = Query(None, description="İşlem tipi: SALES, PAYMENT, DEBT, EXPENSE"),
    limit: int = Query(100, description="Maksimum kayıt", ge=1, le=1000),
    offset: int = Query(0, description="Atlanacak kayıt", ge=0),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Finans hareketleri listesi.
    
    Kullanıcıya anlatımı:
        "Tüm finans hareketlerini getiriyorum:
        - Satışlar
        - Ödemeler
        - Borçlar
        - Giderler"
    
    Örnek kullanım:
        GET /reports/finance-transactions?start_date=2024-01-01&end_date=2024-01-31
        GET /reports/finance-transactions?transaction_type=SALES&limit=50
    
    Not:
        - Tarih verilmezse son 30 gün
        - Sayfalama için limit/offset kullanılır
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_finance_transactions(
        user_role=current_user['role'],
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type,
        limit=limit,
        offset=offset
    )


@router.get("/reports/cash-flow", response_model=dict)
async def get_cash_flow_report(
    start_date: date = Query(..., description="Başlangıç tarihi"),
    end_date: date = Query(..., description="Bitiş tarihi"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Nakit akış raporu.
    
    Kullanıcıya anlatımı:
        "Nakit akış raporunu getiriyorum:
        - Giren nakit
        - Çıkan nakit (iade, gider)
        - Net nakit akışı"
    
    Returns:
        {
            "period_start": "2024-01-01",
            "period_end": "2024-01-31",
            "cash_in": 15000.00,
            "cash_out": 2000.00,
            "net_cash_flow": 13000.00,
            "daily_breakdown": [...]
        }
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_cash_flow_report(
        user_role=current_user['role'],
        start_date=start_date,
        end_date=end_date
    )


# ==================== KARŞILAŞTIRMA RAPORLARI ====================

@router.get("/reports/compare-days", response_model=dict)
async def compare_days(
    day_id_1: int = Query(..., description="1. gün ID"),
    day_id_2: int = Query(..., description="2. gün ID"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    İki günü karşılaştırır.
    
    Kullanıcıya anlatımı:
        "İki günü karşılaştırıyorum:
        - Satış farkı
        - Nakit farkı
        - Adisyon sayısı farkı"
    
    Örnek kullanım:
        GET /reports/compare-days?day_id_1=5&day_id_2=10
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.compare_days(
        user_role=current_user['role'],
        day_id_1=day_id_1,
        day_id_2=day_id_2
    )


# ==================== DÖNEM RAPORLARI ====================

@router.get("/reports/period-summary", response_model=dict)
async def get_period_summary(
    start_date: date = Query(..., description="Başlangıç tarihi"),
    end_date: date = Query(..., description="Bitiş tarihi"),
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Dönem özet raporu.
    
    Kullanıcıya anlatımı:
        "Dönem özet raporunu getiriyorum:
        - Toplam satış
        - Ortalama günlük satış
        - En çok satan ürünler
        - En yoğun gün"
    
    Örnek kullanım:
        GET /reports/period-summary?start_date=2024-01-01&end_date=2024-01-31
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_period_summary(
        user_role=current_user['role'],
        start_date=start_date,
        end_date=end_date
    )


# ==================== HIZLI RAPORLAR (KISA YOLLAR) ====================

@router.get("/reports/today", response_model=DailySalesReportResponse)
async def get_today_report(
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Bugünün raporu (kısa yol).
    
    Kullanıcıya anlatımı:
        "Bugünün satış raporunu getiriyorum."
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_daily_sales_report(
        user_role=current_user['role'],
        day_id=None,
        report_date=None
    )


@router.get("/reports/yesterday", response_model=DailySalesReportResponse)
async def get_yesterday_report(
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Dünün raporu (kısa yol).
    
    Kullanıcıya anlatımı:
        "Dünün satış raporunu getiriyorum."
    """
    yesterday = date.today() - timedelta(days=1)
    
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    customer_repo = CustomerRepository(conn)
    service = ReportService(payment_repo, day_repo, invoice_repo, customer_repo)
    
    return await service.get_daily_sales_report(
        user_role=current_user['role'],
        day_id=None,
        report_date=yesterday
    )


@router.get("/reports/this-week", response_model=List[DailySalesReportResponse])
async def get_this_week_report(
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Bu haftanın raporu (günlük).
    
    Kullanıcıya anlatımı:
        "Bu haftanın günlük satış raporlarını getiriyorum."
    """
    # TODO: Haftanın günlerini getir
    return []