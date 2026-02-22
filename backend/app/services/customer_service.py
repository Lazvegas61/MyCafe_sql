"""
MyCafe - Müşteri Yönetimi Service'i

Bu service:
- Yetki kontrolleri yapar
- Gün kontrolü yapar
- Müşteri validasyonları
- Repository'leri çağırır
- Response modellerine dönüştürür
"""

from typing import Optional, List
from decimal import Decimal

from app.repositories.customer_repository import CustomerRepository
from app.repositories.day_repository import DayRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.models.domain import CustomerResponse, DebtResponse
from app.core.exceptions import (
    PermissionDenied, 
    ResourceNotFound, 
    ClosedDayViolation,
    BusinessRuleViolation
)
from app.core.security import check_permission


class CustomerService:
    """
    Müşteri yönetimi service'i
    
    Kullanıcı dili:
    - Müşteri kaydet
    - Hesaba yaz (borçlandır)
    - Borç ödemesi al
    - Borç sorgula
    - Borç düzelt (sadece ADMIN)
    """
    
    def __init__(
        self, 
        customer_repo: CustomerRepository, 
        day_repo: DayRepository,
        invoice_repo: InvoiceRepository
    ):
        self.customer_repo = customer_repo
        self.day_repo = day_repo
        self.invoice_repo = invoice_repo
    
    async def _validate_day_open(self, operation: str):
        """Günün açık olduğunu doğrular"""
        is_open = await self.day_repo.is_day_open()
        if not is_open:
            raise ClosedDayViolation(operation)
    
    # ==================== MÜŞTERİ İŞLEMLERİ ====================
    
    async def create_customer(
        self,
        full_name: str,
        current_user_id: int,
        current_user_role: str,
        phone: Optional[str] = None,
        email: Optional[str] = None
    ) -> CustomerResponse:
        """
        Yeni müşteri kaydeder.
        
        Kullanıcıya anlatımı:
            "Yeni müşteri kaydediyorum: {full_name}"
        
        Yetki:
            - GARSON, ADMIN, SYS kaydedebilir
            - MUTFAK kaydedemez
        
        Kontroller:
            - Telefon veya e-posta varsa unique mi? (DB kontrol eder)
        """
        # Yetki kontrolü
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Müşteri kaydetme yetkiniz yok.")
        
        # Müşteriyi kaydet
        result = await self.customer_repo.create_customer(
            full_name=full_name,
            phone=phone,
            email=email,
            created_by=current_user_id
        )
        
        return CustomerResponse(**result)
    
    async def update_customer(
        self,
        customer_id: int,
        current_user_id: int,
        current_user_role: str,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> CustomerResponse:
        """
        Müşteri bilgilerini günceller.
        
        Yetki:
            - ADMIN ve SYS güncelleyebilir
            - GARSON güncelleyemez (bilgi değişikliği yetkisi)
        """
        # Yetki kontrolü - Sadece ADMIN güncelleyebilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Müşteri bilgilerini sadece ADMIN'ler güncelleyebilir.")
        
        # Müşteri var mı kontrol et
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ResourceNotFound("Müşteri", customer_id)
        
        # Güncelle
        result = await self.customer_repo.update_customer(
            customer_id=customer_id,
            full_name=full_name,
            phone=phone,
            email=email,
            is_active=is_active,
            updated_by=current_user_id
        )
        
        return CustomerResponse(**result)
    
    async def get_customer(
        self,
        customer_id: int,
        current_user_role: str
    ) -> CustomerResponse:
        """
        Müşteri detayını getirir.
        """
        result = await self.customer_repo.get_customer(customer_id)
        if not result:
            raise ResourceNotFound("Müşteri", customer_id)
        
        return CustomerResponse(**result)
    
    async def find_customers(
        self,
        search_term: str,
        current_user_role: str,
        include_inactive: bool = False
    ) -> List[CustomerResponse]:
        """
        Müşteri ara.
        
        Kullanıcıya anlatımı:
            "{search_term} ile eşleşen müşterileri arıyorum."
        """
        results = await self.customer_repo.find_customers(
            search_term=search_term,
            include_inactive=include_inactive
        )
        return [CustomerResponse(**r) for r in results]
    
    async def get_all_customers(
        self,
        current_user_role: str,
        include_inactive: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> List[CustomerResponse]:
        """
        Tüm müşterileri listeler.
        """
        results = await self.customer_repo.get_all_customers(
            include_inactive=include_inactive,
            limit=limit,
            offset=offset
        )
        return [CustomerResponse(**r) for r in results]
    
    # ==================== BORÇ İŞLEMLERİ ====================
    
    async def create_debt(
        self,
        customer_id: int,
        invoice_id: int,
        amount: Decimal,
        current_user_id: int,
        current_user_role: str,
        description: Optional[str] = None
    ) -> DebtResponse:
        """
        Müşteriye borç yazar (hesaba yazma).
        
        Kullanıcıya anlatımı:
            "Müşterinin hesabına {amount} TL borç yazıyorum."
        
        Yetki:
            - GARSON, ADMIN, SYS yapabilir
        
        Kontroller:
            - Gün açık mı?
            - Adisyon açık mı?
            - Müşteri aktif mi?
        """
        # Yetki kontrolü
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Borç yazma yetkiniz yok.")
        
        # Gün kontrolü
        await self._validate_day_open("Borç yazma")
        
        # Müşteri kontrolü
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ResourceNotFound("Müşteri", customer_id)
        
        if not customer['is_active']:
            raise BusinessRuleViolation("Pasif müşteriye borç yazılamaz.")
        
        # Adisyon kontrolü
        invoice = await self.invoice_repo.get_invoice(invoice_id)
        if not invoice:
            raise ResourceNotFound("Adisyon", invoice_id)
        
        if invoice['status'] != 'OPEN':
            raise BusinessRuleViolation(
                f"Sadece açık adisyonlara borç yazılabilir. "
                f"Adisyon durumu: {invoice['status']}"
            )
        
        # Borç yaz
        result = await self.customer_repo.create_debt(
            customer_id=customer_id,
            invoice_id=invoice_id,
            amount=amount,
            created_by=current_user_id,
            description=description
        )
        
        # Response oluştur
        return DebtResponse(
            id=result['debt_id'],
            customer_id=customer_id,
            customer_name=customer['full_name'],
            amount=amount,
            created_at=None,  # Transaction'dan alınabilir
            invoice_id=invoice_id,
            description=description,
            is_paid=False
        )
    
    async def pay_debt(
        self,
        customer_id: int,
        amount: Decimal,
        payment_method: str,
        current_user_id: int,
        current_user_role: str,
        description: Optional[str] = None
    ) -> DebtResponse:
        """
        Müşteri borcuna ödeme alır.
        
        Kullanıcıya anlatımı:
            "Müşteriden {amount} TL borç ödemesi alıyorum."
        
        Yetki:
            - GARSON, ADMIN, SYS alabilir
        
        Kontroller:
            - Gün açık mı?
            - Ödeme tutarı borçtan büyük mü?
            - Müşteri aktif mi?
        """
        # Yetki kontrolü
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Borç ödemesi alma yetkiniz yok.")
        
        # Gün kontrolü
        await self._validate_day_open("Borç ödemesi")
        
        # Müşteri kontrolü
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ResourceNotFound("Müşteri", customer_id)
        
        # Borç kontrolü
        balance = await self.customer_repo.get_customer_balance(customer_id)
        if amount > balance['current_balance']:
            raise BusinessRuleViolation(
                f"Ödeme tutarı ({amount} TL) borçtan ({balance['current_balance']} TL) büyük olamaz."
            )
        
        # Ödemeyi al
        result = await self.customer_repo.pay_debt(
            customer_id=customer_id,
            amount=amount,
            payment_method=payment_method,
            created_by=current_user_id,
            description=description
        )
        
        # Response oluştur
        return DebtResponse(
            id=result['payment_id'],
            customer_id=customer_id,
            customer_name=customer['full_name'],
            amount=amount,
            created_at=None,
            invoice_id=None,
            description=description or "Borç ödemesi",
            is_paid=True
        )
    
    async def get_customer_debts(
        self,
        customer_id: int,
        current_user_role: str,
        include_paid: bool = False
    ) -> List[DebtResponse]:
        """
        Müşterinin borç hareketlerini getirir.
        """
        # Müşteri kontrolü
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ResourceNotFound("Müşteri", customer_id)
        
        results = await self.customer_repo.get_customer_debts(
            customer_id=customer_id,
            include_paid=include_paid
        )
        
        # Response'a dönüştür
        debts = []
        for r in results:
            debts.append(DebtResponse(
                id=r['id'],
                customer_id=customer_id,
                customer_name=customer['full_name'],
                amount=r['amount'],
                created_at=r['transaction_date'],
                invoice_id=r.get('invoice_id'),
                description=r.get('description'),
                is_paid=(r['transaction_type'] == 'DEBT_PAYMENT')
            ))
        
        return debts
    
    async def get_customer_balance(
        self,
        customer_id: int,
        current_user_role: str
    ) -> dict:
        """
        Müşterinin güncel borç durumunu getirir.
        """
        # Müşteri kontrolü
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ResourceNotFound("Müşteri", customer_id)
        
        return await self.customer_repo.get_customer_balance(customer_id)
    
    # ==================== BORÇ RAPORLARI ====================
    
    async def get_all_debtors(
        self,
        current_user_role: str,
        min_debt: Decimal = Decimal('0'),
        include_paid: bool = False
    ) -> List[dict]:
        """
        Borçlu müşterileri listeler.
        
        Yetki:
            - Sadece ADMIN ve SYS görebilir
            - GARSON göremez (finansal veri)
        """
        # Yetki kontrolü
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Borçlu listesini sadece ADMIN'ler görebilir.")
        
        return await self.customer_repo.get_all_debtors(
            min_debt=min_debt,
            include_paid=include_paid
        )
    
    async def get_debt_summary(
        self,
        current_user_role: str,
        day_id: Optional[int] = None
    ) -> dict:
        """
        Borç özeti raporu.
        
        Yetki:
            - Sadece ADMIN ve SYS
        """
        # Yetki kontrolü
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Borç raporlarını sadece ADMIN'ler görebilir.")
        
        return await self.customer_repo.get_debt_summary(day_id=day_id)
    
    # ==================== BORÇ DÜZELTME (SADECE ADMIN) ====================
    
    async def correct_debt(
        self,
        customer_id: int,
        correction_amount: Decimal,
        reason: str,
        current_user_id: int,
        current_user_role: str
    ) -> dict:
        """
        Borç düzeltmesi yapar (sadece ADMIN).
        
        Kullanıcıya anlatımı:
            "Müşteri borcunu düzeltiyorum. Sebep: {reason}"
        
        Yetki:
            - Sadece ADMIN ve SYS
            - GARSON yapamaz (kötüye kullanımı engellemek için)
        
        Kontroller:
            - Gün açık mı?
            - Düzeltme sebebi var mı?
        """
        # Yetki kontrolü - Sadece ADMIN
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Borç düzeltmesi sadece ADMIN'ler tarafından yapılabilir.")
        
        # Gün kontrolü
        await self._validate_day_open("Borç düzeltme")
        
        # Müşteri kontrolü
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ResourceNotFound("Müşteri", customer_id)
        
        # Düzeltme yap
        return await self.customer_repo.correct_debt(
            customer_id=customer_id,
            correction_amount=correction_amount,
            reason=reason,
            corrected_by=current_user_id
        )