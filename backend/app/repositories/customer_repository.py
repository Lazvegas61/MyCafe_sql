"""
MyCafe - Müşteri Yönetimi Repository'si

Bu repository:
- Müşteri ekleme/güncelleme
- Borç oluşturma (hesaba yazma)
- Borç ödeme
- Borç sorgulama
- Tüm prosedür çağrıları BaseRepository üzerinden yapılır

NOT: Borçlar silinemez, değiştirilemez! Sadece düzeltme kaydı eklenir.
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from asyncpg import Connection

from app.repositories.base import BaseRepository


class CustomerRepository(BaseRepository):
    """
    Müşteri yönetimi repository'si
    
    Kullanıcı dili:
    - Yeni müşteri kaydet
    - Müşteri borcuna ekle (hesaba yaz)
    - Borç ödemesi al
    - Müşteri bakiyesini sorgula
    """
    
    def __init__(self, conn: Connection):
        super().__init__(conn)
    
    # ==================== MÜŞTERİ İŞLEMLERİ ====================
    
    async def create_customer(
        self,
        full_name: str,
        phone: Optional[str],
        email: Optional[str],
        created_by: int
    ) -> Dict[str, Any]:
        """
        Yeni müşteri kaydeder.
        
        Kullanıcıya anlatımı:
            "Yeni müşteri kaydediyorum. Artık hesabına yazabiliriz."
        
        Args:
            full_name: Müşteri adı soyadı
            phone: Telefon numarası
            email: E-posta
            created_by: Kaydeden kullanıcı
            
        Returns:
            {
                'id': int,
                'full_name': str,
                'phone': Optional[str],
                'email': Optional[str],
                'total_debt': Decimal(0),  # Yeni müşteri borcu 0
                'is_active': True,
                'created_at': datetime
            }
        """
        result = await self._execute_procedure(
            'create_customer',
            full_name,
            phone,
            email,
            created_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def update_customer(
        self,
        customer_id: int,
        updated_by: int,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Müşteri bilgilerini günceller.
        
        Args:
            customer_id: Müşteri ID
            full_name: Yeni ad soyad (opsiyonel)
            phone: Yeni telefon (opsiyonel)
            email: Yeni e-posta (opsiyonel)
            is_active: Aktif/pasif (opsiyonel)
            updated_by: Güncelleyen kullanıcı
            
        Returns:
            Güncel müşteri bilgileri
        """
        result = await self._execute_procedure(
            'update_customer',
            customer_id,
            full_name,
            phone,
            email,
            is_active,
            updated_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_customer(self, customer_id: int) -> Optional[Dict[str, Any]]:
        """
        Müşteri detayını getirir.
        
        Args:
            customer_id: Müşteri ID
            
        Returns:
            {
                'id': int,
                'full_name': str,
                'phone': Optional[str],
                'email': Optional[str],
                'total_debt': Decimal,  # Güncel toplam borç
                'is_active': bool,
                'created_at': datetime,
                'created_by_name': str
            }
        """
        result = await self._execute_procedure(
            'get_customer',
            customer_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def find_customers(
        self,
        search_term: str,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Müşteri ara (isim veya telefon ile).
        
        Args:
            search_term: Aranacak kelime
            include_inactive: Pasif müşterileri de getir
            
        Returns:
            Müşteri listesi
        """
        results = await self._execute_procedure(
            'find_customers',
            search_term,
            include_inactive,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_all_customers(
        self,
        include_inactive: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Tüm müşterileri listeler.
        
        Args:
            include_inactive: Pasif müşterileri de getir
            limit: Maksimum kayıt sayısı
            offset: Atlanacak kayıt sayısı (sayfalama için)
        """
        results = await self._execute_procedure(
            'get_all_customers',
            include_inactive,
            limit,
            offset,
            fetch=True
        )
        return [dict(r) for r in results]
    
    # ==================== BORÇ İŞLEMLERİ ====================
    
    async def create_debt(
        self,
        customer_id: int,
        invoice_id: int,
        amount: Decimal,
        created_by: int,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Müşteriye borç yazar (hesaba yazma).
        
        Kullanıcıya anlatımı:
            "Müşterinin hesabına {amount} TL borç yazıyorum.
            Adisyon #{invoice_id} için."
        
        Args:
            customer_id: Müşteri ID
            invoice_id: Adisyon ID
            amount: Borç tutarı
            created_by: İşlemi yapan kullanıcı
            description: Açıklama
            
        Returns:
            {
                'debt_id': int,              # Borç transaction ID'si
                'new_total_debt': Decimal,    # Müşterinin güncel toplam borcu
                'transaction_id': int         # Finans hareketi ID'si
            }
            
        Raises:
            BusinessRuleViolation:
                - Adisyon kapalıysa
                - Gün kapalıysa
                - Müşteri aktif değilse
        """
        result = await self._execute_procedure(
            'create_debt_for_customer',
            customer_id,
            invoice_id,
            amount,
            created_by,
            description,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def pay_debt(
        self,
        customer_id: int,
        amount: Decimal,
        payment_method: str,
        created_by: int,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Müşteri borcuna ödeme yapar.
        
        Kullanıcıya anlatımı:
            "Müşteri borcuna {amount} TL ödeme alıyorum."
        
        Args:
            customer_id: Müşteri ID
            amount: Ödenen tutar
            payment_method: Ödeme tipi (CASH, CREDIT_CARD)
            created_by: İşlemi yapan kullanıcı
            description: Açıklama
            
        Returns:
            {
                'payment_id': int,            # Ödeme transaction ID'si
                'new_total_debt': Decimal,    # Kalan borç
                'paid_amount': Decimal         # Ödenen tutar
            }
            
        Raises:
            BusinessRuleViolation:
                - Ödeme tutarı borçtan büyükse
                - Gün kapalıysa
                - Müşteri aktif değilse
        """
        result = await self._execute_procedure(
            'pay_customer_debt',
            customer_id,
            amount,
            payment_method,
            created_by,
            description,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_customer_debts(
        self,
        customer_id: int,
        include_paid: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Müşterinin tüm borç hareketlerini getirir.
        
        Args:
            customer_id: Müşteri ID
            include_paid: Ödenmiş borçları da getir
            
        Returns:
            [
                {
                    'id': int,
                    'transaction_date': datetime,
                    'amount': Decimal,
                    'transaction_type': str,  # DEBT veya DEBT_PAYMENT
                    'invoice_id': Optional[int],
                    'description': Optional[str],
                    'is_paid': bool,
                    'created_by_name': str
                }
            ]
        """
        results = await self._execute_procedure(
            'get_customer_debts',
            customer_id,
            include_paid,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_customer_balance(self, customer_id: int) -> Dict[str, Any]:
        """
        Müşterinin güncel borç durumunu getirir.
        
        Args:
            customer_id: Müşteri ID
            
        Returns:
            {
                'customer_id': int,
                'customer_name': str,
                'total_debt': Decimal,        # Toplam borç
                'total_paid': Decimal,         # Toplam ödenen
                'current_balance': Decimal,    # Güncel bakiye (borç - ödenen)
                'last_transaction': datetime,   # Son işlem tarihi
                'transaction_count': int         # İşlem sayısı
            }
        """
        result = await self._execute_procedure(
            'get_customer_balance',
            customer_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    # ==================== BORÇ RAPORLARI ====================
    
    async def get_all_debtors(
        self,
        min_debt: Decimal = Decimal('0'),
        include_paid: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Borçlu müşterileri listeler.
        
        Args:
            min_debt: Minimum borç tutarı (örnek: 100 TL üzeri)
            include_paid: Borcu bitmiş müşterileri de getir
            
        Returns:
            [
                {
                    'customer_id': int,
                    'customer_name': str,
                    'total_debt': Decimal,
                    'last_debt_date': datetime,
                    'invoice_count': int
                }
            ]
        """
        results = await self._execute_procedure(
            'get_all_debtors',
            min_debt,
            include_paid,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_debt_summary(
        self,
        day_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Borç özeti raporu.
        
        Args:
            day_id: Belirli bir gün için (opsiyonel)
            
        Returns:
            {
                'total_debt_created': Decimal,    # Oluşturulan toplam borç
                'total_debt_paid': Decimal,        # Ödenen toplam borç
                'current_total_debt': Decimal,      # Anlık toplam borç
                'debtor_count': int,                 # Borçlu müşteri sayısı
                'average_debt': Decimal               # Ortalama borç
            }
        """
        result = await self._execute_procedure(
            'get_debt_summary',
            day_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    # ==================== BORÇ DÜZELTME (SADECE ADMIN) ====================
    
    async def correct_debt(
        self,
        customer_id: int,
        correction_amount: Decimal,
        reason: str,
        corrected_by: int
    ) -> Dict[str, Any]:
        """
        Borç düzeltmesi yapar (sadece ADMIN).
        
        Kullanıcıya anlatımı:
            "Müşteri borcunu düzeltiyorum. Bu işlem yeni bir kayıt oluşturur,
            eski kayıtlar silinmez, değiştirilmez."
        
        Args:
            customer_id: Müşteri ID
            correction_amount: Düzeltme tutarı (+ veya -)
            reason: Düzeltme sebebi
            corrected_by: Düzelten kullanıcı
            
        Returns:
            {
                'correction_id': int,
                'old_balance': Decimal,
                'new_balance': Decimal,
                'correction_amount': Decimal
            }
            
        Raises:
            BusinessRuleViolation:
                - Düzeltme sebebi yoksa
                - Gün kapalıysa
        """
        result = await self._execute_procedure(
            'correct_customer_debt',
            customer_id,
            correction_amount,
            reason,
            corrected_by,
            fetch_one=True
        )
        return dict(result) if result else None