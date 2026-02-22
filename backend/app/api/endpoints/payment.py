"""
MyCafe - Ödeme Yönetimi API Endpoint'leri

Bu endpoint'ler:
- Ödeme alma
- İade yapma
- Ödeme geçmişi sorgulama
- Finans raporları
"""

from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from decimal import Decimal

from app.api.deps import get_current_user, get_db_connection, require_admin
from app.repositories.payment_repository import PaymentRepository
from app.repositories.day_repository import DayRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.services.payment_service import PaymentService
from app.models.domain import PaymentResponse, FinanceTransactionResponse, DailySalesReportResponse
from app.core.exceptions import BusinessRuleViolation

router = APIRouter()


@router.post("/payments", response_model=PaymentResponse)
async def process_payment(
    invoice_id: int = Query(..., description="Adisyon ID"),
    payment_method: str = Query(..., description="Ödeme tipi: CASH, CREDIT_CARD, DEBT"),
    amount: Decimal = Query(..., description="Ödenen tutar", gt=0),
    customer_id: Optional[int] = Query(None, description="Müşteri ID (DEBT için zorunlu)"),
    description: Optional[str] = Query(None, description="Açıklama"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Ödeme işlemi yapar.
    
    Kullanıcıya anlatımı:
        "Ödemeyi alıyorum. Adisyon kapanacak, masa boşalacak.
        Bilardo varsa otomatik hesaplanacak."
    
    Örnek kullanım:
        # Nakit ödeme
        POST /payments?invoice_id=5&payment_method=CASH&amount=250
        
        # Borç ödeme
        POST /payments?invoice_id=5&payment_method=DEBT&amount=250&customer_id=42
    
    Ödeme tipleri:
        - CASH: Nakit ödeme
        - CREDIT_CARD: Kredi kartı
        - DEBT: Hesaba yaz (müşteri borcu)
    
    Not:
        - Bu işlem ATOMIK'tir. Ya hep ya hiç!
        - Stok otomatik düşer
        - Bilardo varsa hesap yapılır
        - Finans kaydı oluşur
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    return await service.process_payment(
        invoice_id=invoice_id,
        payment_method=payment_method,
        amount=amount,
        current_user_id=current_user['id'],
        current_user_role=current_user['role'],
        customer_id=customer_id,
        description=description
    )


@router.post("/refunds", response_model=PaymentResponse)
async def process_refund(
    transaction_id: int = Query(..., description="İade edilecek transaction ID"),
    refund_amount: Decimal = Query(..., description="İade tutarı", gt=0),
    refund_reason: str = Query(..., description="İade sebebi"),
    current_user: dict = Depends(require_admin),  # Sadece ADMIN
    conn = Depends(get_db_connection)
):
    """
    İade işlemi yapar.
    
    Kullanıcıya anlatımı:
        "Müşteri iadesi yapıyorum. Bu işlem yeni bir finans kaydı oluşturur,
        eski kayıt silinmez."
    
    Yetki:
        - Sadece ADMIN'ler yapabilir
        - GARSON'lar yapamaz (kötüye kullanımı engellemek için)
    
    Örnek kullanım:
        POST /refunds?transaction_id=100&refund_amount=50&refund_reason=Müşteri%20iadesi
    
    Not:
        - İade tutarı orijinal transaction tutarından büyük olamaz
        - Gün kapalıysa iade yapılamaz
        - Snapshot alınmış günlere iade yapılamaz
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    return await service.process_refund(
        transaction_id=transaction_id,
        refund_amount=refund_amount,
        refund_reason=refund_reason,
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.get("/payments/validate", response_model=dict)
async def validate_payment(
    invoice_id: int = Query(..., description="Adisyon ID"),
    amount: Decimal = Query(..., description="Kontrol edilecek tutar"),
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Ödeme tutarını kontrol eder (ödeme öncesi).
    
    Kullanıcıya anlatımı:
        "Ödeme yapmadan önce tutarı kontrol edelim.
        Eksik veya fazla ödeme var mı bakalım."
    
    Örnek kullanım:
        GET /payments/validate?invoice_id=5&amount=250
    
    Returns:
        {
            "invoice_total": 250.00,      # Adisyon toplamı
            "already_paid": 0.00,           # Daha önce ödenen
            "remaining": 250.00,             # Kalan tutar
            "is_valid": true,                 # Geçerli mi?
            "message": "Tutar geçerli"        # Açıklama
        }
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    return await service.validate_payment(
        invoice_id=invoice_id,
        amount=amount,
        current_user_role=current_user['role']
    )


@router.get("/invoices/{invoice_id}/payments", response_model=List[FinanceTransactionResponse])
async def get_invoice_payments(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Bir adisyona ait tüm ödemeleri getirir.
    
    Kullanıcıya anlatımı:
        "Adisyon #{invoice_id} için yapılan tüm ödemeleri getiriyorum."
    
    Örnek kullanım:
        GET /invoices/5/payments
    
    Returns:
        - Birden fazla ödeme varsa (taksit) hepsi gelir
        - İade varsa onlar da gelir
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    return await service.get_invoice_payments(
        invoice_id=invoice_id,
        current_user_role=current_user['role']
    )


@router.get("/days/{day_id}/payments", response_model=List[FinanceTransactionResponse])
async def get_daily_payments(
    day_id: int,
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Bir güne ait tüm ödemeleri getirir.
    
    Kullanıcıya anlatımı:
        "Gün #{day_id} için yapılan tüm ödemeleri getiriyorum."
    
    Yetki:
        - GARSON sadece bugünü görebilir
        - ADMIN tüm günleri görebilir
    
    Örnek kullanım:
        GET /days/5/payments  # 5 numaralı günün ödemeleri
        GET /days/current/payments  # bugünün ödemeleri
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    return await service.get_daily_payments(
        day_id=day_id,
        current_user_role=current_user['role']
    )


@router.get("/days/{day_id}/summary", response_model=DailySalesReportResponse)
async def get_daily_summary(
    day_id: int,
    current_user: dict = Depends(require_admin),  # Sadece ADMIN
    conn = Depends(get_db_connection)
):
    """
    Günlük finans özetini getirir.
    
    Kullanıcıya anlatımı:
        "Günün finans özetini getiriyorum:
        - Toplam satış
        - Nakit/kart dağılımı
        - Oluşan/ödenen borçlar"
    
    Yetki:
        - Sadece ADMIN'ler görebilir
        - GARSON'lar göremez (finansal veri)
    
    Örnek kullanım:
        GET /days/5/summary
    
    Returns:
        {
            "day_date": "2024-01-15",
            "total_sales": 1250.50,
            "cash_payments": 800.00,
            "credit_card_payments": 450.50,
            "debt_created": 100.00,
            "debt_paid": 50.00,
            "invoice_count": 15,
            "transaction_count": 18
        }
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    return await service.get_daily_summary(
        day_id=day_id,
        current_user_role=current_user['role']
    )


# Kolay kullanım için "bugün" shortcut'ı
@router.get("/today/payments", response_model=List[FinanceTransactionResponse])
async def get_today_payments(
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """
    Bugünün ödemelerini getirir.
    
    Kullanıcıya anlatımı:
        "Bugün yapılan tüm ödemeleri getiriyorum."
    
    Örnek kullanım:
        GET /today/payments
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    # Bugünün gününü bul
    current_day = await day_repo.get_current_day()
    if not current_day:
        raise BusinessRuleViolation("Bugün açık bir gün yok.")
    
    return await service.get_daily_payments(
        day_id=current_day['id'],
        current_user_role=current_user['role']
    )


@router.get("/today/summary", response_model=DailySalesReportResponse)
async def get_today_summary(
    current_user: dict = Depends(require_admin),
    conn = Depends(get_db_connection)
):
    """
    Bugünün finans özetini getirir.
    
    Kullanıcıya anlatımı:
        "Bugünün finans özetini getiriyorum."
    
    Yetki:
        - Sadece ADMIN
    """
    payment_repo = PaymentRepository(conn)
    day_repo = DayRepository(conn)
    invoice_repo = InvoiceRepository(conn)
    service = PaymentService(payment_repo, day_repo, invoice_repo)
    
    # Bugünün gününü bul
    current_day = await day_repo.get_current_day()
    if not current_day:
        raise BusinessRuleViolation("Bugün açık bir gün yok.")
    
    return await service.get_daily_summary(
        day_id=current_day['id'],
        current_user_role=current_user['role']
    )