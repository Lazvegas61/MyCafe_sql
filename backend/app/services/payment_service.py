"""
MyCafe - Ödeme Yönetimi Service'i

Bu service:
- Yetki kontrolleri yapar
- Gün kontrolü yapar
- Ödeme öncesi validasyonlar
- Repository'leri çağırır
- Response modellerine dönüştürür
"""

from typing import Optional, List
from decimal import Decimal
from datetime import date

from app.repositories.payment_repository import PaymentRepository
from app.repositories.day_repository import DayRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.models.domain import (
    PaymentResponse,
    FinanceTransactionResponse,
    DailySalesReportResponse
)
from app.core.exceptions import (
    PermissionDenied, 
    ResourceNotFound, 
    ClosedDayViolation,
    BusinessRuleViolation
)
from app.core.security import check_permission


class PaymentService:
    """
    Ödeme yönetimi service'i
    
    Kullanıcı dili:
    - Ödeme al
    - İade yap
    - Ödeme geçmişini göster
    - Günlük finans raporu
    """
    
    def __init__(
        self, 
        payment_repo: PaymentRepository, 
        day_repo: DayRepository,
        invoice_repo: InvoiceRepository
    ):
        self.payment_repo = payment_repo
        self.day_repo = day_repo
        self.invoice_repo = invoice_repo
    
    async def _validate_day_open(self, operation: str):
        """Günün açık olduğunu doğrular"""
        is_open = await self.day_repo.is_day_open()
        if not is_open:
            raise ClosedDayViolation(operation)
    
    async def _validate_invoice_open(self, invoice_id: int):
        """Adisyonun açık olduğunu doğrular"""
        invoice = await self.invoice_repo.get_invoice(invoice_id)
        if not invoice:
            raise ResourceNotFound("Adisyon", invoice_id)
        
        if invoice['status'] != 'OPEN':
            raise BusinessRuleViolation(
                f"Adisyon {invoice_id} zaten {invoice['status']} durumunda. "
                "Sadece açık adisyonlara ödeme alınabilir."
            )
        
        return invoice
    
    # ==================== ÖDEME İŞLEMLERİ ====================
    
    async def process_payment(
        self,
        invoice_id: int,
        payment_method: str,
        amount: Decimal,
        current_user_id: int,
        current_user_role: str,
        customer_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> PaymentResponse:
        """
        Ödeme işlemi yapar.
        
        Kullanıcıya anlatımı:
            "Ödemeyi alıyorum. Adisyon kapanacak, masa boşalacak."
        
        Yetki:
            - GARSON, ADMIN, SYS ödeme alabilir
            - MUTFAK alamaz
        
        Kontroller:
            - Gün açık mı?
            - Adisyon açık mı?
            - Ödeme tutarı geçerli mi? (fazla/eksik ödeme yok)
            - DEBT için müşteri var mı?
        """
        # Yetki kontrolü
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Ödeme alma yetkiniz yok.")
        
        # Gün kontrolü
        await self._validate_day_open("Ödeme alma")
        
        # Adisyon kontrolü
        await self._validate_invoice_open(invoice_id)
        
        # Ödeme tutarını validate et
        validation = await self.payment_repo.validate_payment_amount(invoice_id, amount)
        if not validation['is_valid']:
            raise BusinessRuleViolation(
                f"Geçersiz ödeme tutarı: {validation['message']}"
            )
        
        # DEBT kontrolü
        if payment_method == 'DEBT' and not customer_id:
            raise BusinessRuleViolation(
                "Borç ödemesi için müşteri seçilmelidir."
            )
        
        # Ödeme işlemini yap
        result = await self.payment_repo.process_payment_atomic(
            invoice_id=invoice_id,
            payment_method=payment_method,
            amount=amount,
            processed_by=current_user_id,
            customer_id=customer_id,
            description=description
        )
        
        return PaymentResponse(
            success=True,
            transaction_id=result['transaction_id'],
            invoice_id=invoice_id,
            invoice_closed=result['invoice_closed'],
            table_freed=result['table_freed'],
            billiard_calculated=result['billiard_calculated'],
            new_balance=result.get('new_balance'),
            message="Ödeme başarıyla tamamlandı."
        )
    
    async def process_refund(
        self,
        transaction_id: int,
        refund_amount: Decimal,
        refund_reason: str,
        current_user_id: int,
        current_user_role: str
    ) -> PaymentResponse:
        """
        İade işlemi yapar.
        
        Kullanıcıya anlatımı:
            "Müşteri iadesi yapıyorum. Bu işlem yeni bir finans kaydı oluşturur."
        
        Yetki:
            - Sadece ADMIN ve SYS iade yapabilir
            - GARSON iade yapamaz (kötüye kullanımı engellemek için)
        
        Kontroller:
            - Gün açık mı?
            - İade tutarı geçerli mi?
        """
        # Yetki kontrolü - Sadece ADMIN iade yapabilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied(
                "İade işlemi için ADMIN yetkisi gerekli. "
                "GARSON'lar iade yapamaz."
            )
        
        # Gün kontrolü
        await self._validate_day_open("İade işlemi")
        
        # İade işlemini yap
        result = await self.payment_repo.process_refund(
            transaction_id=transaction_id,
            refund_amount=refund_amount,
            refund_reason=refund_reason,
            refunded_by=current_user_id
        )
        
        return PaymentResponse(
            success=True,
            transaction_id=result['refund_transaction_id'],
            invoice_id=0,  # İade için invoice yok
            invoice_closed=False,
            table_freed=False,
            billiard_calculated=False,
            new_balance=result.get('new_balance'),
            message=f"İade işlemi başarılı. Yeni bakiye: {result.get('new_balance', 0)}"
        )
    
    # ==================== SORGULAMA İŞLEMLERİ ====================
    
    async def get_invoice_payments(
        self,
        invoice_id: int,
        current_user_role: str
    ) -> List[FinanceTransactionResponse]:
        """
        Bir adisyona ait ödemeleri getirir.
        
        Args:
            invoice_id: Adisyon ID'si
            current_user_role: Kullanıcı rolü
            
        Returns:
            Ödeme transaction'ları listesi
        """
        # Önce adisyon var mı kontrol et
        invoice = await self.invoice_repo.get_invoice(invoice_id)
        if not invoice:
            raise ResourceNotFound("Adisyon", invoice_id)
        
        results = await self.payment_repo.get_payment_transactions(invoice_id)
        return [FinanceTransactionResponse(**r) for r in results]
    
    async def get_daily_payments(
        self,
        day_id: int,
        current_user_role: str
    ) -> List[FinanceTransactionResponse]:
        """
        Bir güne ait tüm ödemeleri getirir.
        
        Args:
            day_id: Gün ID'si
            current_user_role: Kullanıcı rolü
        """
        # Önce gün var mı kontrol et
        day = await self.day_repo.get_day_by_id(day_id)
        if not day:
            raise ResourceNotFound("Gün", day_id)
        
        # Sadece ADMIN ve SYS tüm günleri görebilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            # GARSON sadece bugünü görebilir
            current_day = await self.day_repo.get_current_day()
            if not current_day or current_day['id'] != day_id:
                raise PermissionDenied("Sadece bugünün ödemelerini görebilirsiniz.")
        
        results = await self.payment_repo.get_daily_payments(day_id)
        return [FinanceTransactionResponse(**r) for r in results]
    
    async def get_daily_summary(
        self,
        day_id: int,
        current_user_role: str
    ) -> DailySalesReportResponse:
        """
        Günlük finans özetini getirir.
        
        Args:
            day_id: Gün ID'si
            current_user_role: Kullanıcı rolü
        """
        # Sadece ADMIN ve SYS görebilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Finans raporlarını sadece ADMIN'ler görebilir.")
        
        # Önce gün var mı kontrol et
        day = await self.day_repo.get_day_by_id(day_id)
        if not day:
            raise ResourceNotFound("Gün", day_id)
        
        summary = await self.payment_repo.get_daily_summary(day_id)
        
        return DailySalesReportResponse(
            day_date=day['day_date'],
            total_sales=summary['total_sales'],
            cash_payments=summary['cash_total'],
            credit_card_payments=summary['credit_card_total'],
            debt_created=summary['debt_created'],
            debt_paid=summary['debt_paid'],
            invoice_count=summary['transaction_count'],
            transaction_count=summary['transaction_count']
        )
    
    async def validate_payment(
        self,
        invoice_id: int,
        amount: Decimal,
        current_user_role: str
    ) -> dict:
        """
        Ödeme tutarını validate eder (ödeme öncesi kontrol).
        
        Kullanıcıya anlatımı:
            "Ödeme yapmadan önce tutarı kontrol edelim.
            Eksik veya fazla ödeme var mı bakalım."
        
        Args:
            invoice_id: Adisyon ID'si
            amount: Ödenmek istenen tutar
            
        Returns:
            {
                'invoice_total': Decimal,
                'already_paid': Decimal,
                'remaining': Decimal,
                'is_valid': bool,
                'message': str
            }
        """
        # Adisyon kontrolü
        await self._validate_invoice_open(invoice_id)
        
        return await self.payment_repo.validate_payment_amount(invoice_id, amount)