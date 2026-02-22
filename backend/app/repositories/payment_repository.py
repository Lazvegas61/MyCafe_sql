"""
MyCafe - Ödeme Yönetimi Repository'si

Bu repository:
- Atomik ödeme işlemi
- Ödeme geçmişi sorgulama
- Finans transaction'ları görüntüleme
- Tüm prosedür çağrıları BaseRepository üzerinden yapılır

NOT: Ödeme işlemleri atomiktir. Ya hep ya hiç!
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime
from asyncpg import Connection

from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository):
    """
    Ödeme yönetimi repository'si
    
    Kullanıcı dili:
    - Ödeme yap
    - Ödeme geçmişini getir
    - Günlük finans hareketlerini getir
    """
    
    def __init__(self, conn: Connection):
        super().__init__(conn)
    
    # ==================== ATOMİK ÖDEME İŞLEMİ ====================
    
    async def process_payment_atomic(
        self,
        invoice_id: int,
        payment_method: str,
        amount: Decimal,
        processed_by: int,
        customer_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Atomik ödeme işlemi yapar.
        
        Kullanıcıya anlatımı:
            "Ödemeyi alıyorum. Bu işlem sırasında:
            - Finans kaydı oluşur
            - Adisyon kapanır
            - Masa boşalır
            - Bilardo varsa hesaplanır
            Hepsi tek seferde olur, yarıda kalmaz."
        
        Args:
            invoice_id: Adisyon ID'si
            payment_method: Ödeme tipi (CASH, CREDIT_CARD, DEBT)
            amount: Ödenen tutar
            processed_by: İşlemi yapan kullanıcı
            customer_id: Müşteri ID (DEBT için zorunlu)
            description: Açıklama
            
        Returns:
            {
                'transaction_id': int,        # Finans hareketi ID'si
                'invoice_closed': bool,        # Adisyon kapandı mı?
                'table_freed': bool,           # Masa boşaldı mı?
                'billiard_calculated': bool,   # Bilardo hesaplandı mı?
                'new_balance': Optional[Decimal]  # Müşteri borcu varsa yeni bakiye
            }
            
        Raises:
            BusinessRuleViolation:
                - Tutar uyuşmazlığı (fazla/eksik ödeme)
                - Adisyon zaten kapalıysa
                - Gün kapalıysa
                - DEBT için müşteri yoksa
                - Stok yetersizse (otomatik düşüm yapılır)
        """
        result = await self._execute_procedure(
            'process_payment_atomic',
            invoice_id,
            payment_method,
            amount,
            processed_by,
            customer_id,
            description,
            fetch_one=True
        )
        return dict(result) if result else None
    
    # ==================== ÖDEME SORGULAMA ====================
    
    async def get_payment_transactions(
        self,
        invoice_id: int
    ) -> List[Dict[str, Any]]:
        """
        Bir adisyona ait ödeme transaction'larını getirir.
        
        Args:
            invoice_id: Adisyon ID'si
            
        Returns:
            [
                {
                    'id': int,
                    'transaction_date': datetime,
                    'amount': Decimal,
                    'payment_method': str,
                    'description': Optional[str],
                    'created_by_name': str
                }
            ]
        """
        results = await self._execute_procedure(
            'get_invoice_payments',
            invoice_id,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_daily_payments(
        self,
        day_id: int
    ) -> List[Dict[str, Any]]:
        """
        Bir güne ait tüm ödemeleri getirir.
        
        Args:
            day_id: Gün ID'si
            
        Returns:
            [
                {
                    'id': int,
                    'invoice_id': int,
                    'table_number': int,
                    'amount': Decimal,
                    'payment_method': str,
                    'created_at': datetime,
                    'created_by_name': str
                }
            ]
        """
        results = await self._execute_procedure(
            'get_daily_payments',
            day_id,
            fetch=True
        )
        return [dict(r) for r in results]
    
    # ==================== FİNANS TRANSACTION'LARI ====================
    
    async def get_finance_transactions(
        self,
        day_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Finans hareketlerini getirir.
        
        Args:
            day_id: Belirli bir gün
            start_date: Başlangıç tarihi
            end_date: Bitiş tarihi
            transaction_type: Hareket tipi (SALES, PAYMENT, DEBT, EXPENSE)
            
        Returns:
            [
                {
                    'id': int,
                    'transaction_date': datetime,
                    'day_id': int,
                    'invoice_id': Optional[int],
                    'transaction_type': str,
                    'amount': Decimal,
                    'payment_method': Optional[str],
                    'description': Optional[str],
                    'created_by_name': str
                }
            ]
        """
        results = await self._execute_procedure(
            'get_finance_transactions',
            day_id,
            start_date,
            end_date,
            transaction_type,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_daily_summary(
        self,
        day_id: int
    ) -> Dict[str, Any]:
        """
        Günlük finans özetini getirir.
        
        Args:
            day_id: Gün ID'si
            
        Returns:
            {
                'total_sales': Decimal,           # Toplam satış
                'cash_total': Decimal,             # Nakit ödemeler
                'credit_card_total': Decimal,      # Kredi kartı
                'debt_created': Decimal,           # Oluşan borçlar
                'debt_paid': Decimal,               # Ödenen borçlar
                'transaction_count': int            # İşlem sayısı
            }
        """
        result = await self._execute_procedure(
            'get_daily_finance_summary',
            day_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    # ==================== İADE İŞLEMLERİ ====================
    
    async def process_refund(
        self,
        transaction_id: int,
        refund_amount: Decimal,
        refund_reason: str,
        refunded_by: int
    ) -> Dict[str, Any]:
        """
        İade işlemi yapar.
        
        Kullanıcıya anlatımı:
            "Müşteri iadesi yapıyorum. Yeni bir finans kaydı oluşur,
            eski transaction iptal olmaz, düzeltme kaydı eklenir."
        
        Args:
            transaction_id: İade edilecek transaction ID'si
            refund_amount: İade tutarı
            refund_reason: İade sebebi
            refunded_by: İadeyi yapan kullanıcı
            
        Returns:
            {
                'refund_transaction_id': int,     # Yeni iade transaction'ı
                'original_transaction_id': int,    # Eski transaction
                'new_balance': Decimal              # Yeni bakiye (varsa)
            }
            
        Raises:
            BusinessRuleViolation:
                - İade tutarı transaction tutarından büyükse
                - Gün kapalıysa
                - Transaction çok eskiyse (snapshot koruması)
        """
        result = await self._execute_procedure(
            'process_refund',
            transaction_id,
            refund_amount,
            refund_reason,
            refunded_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    # ==================== VALİDASYON ====================
    
    async def validate_payment_amount(
        self,
        invoice_id: int,
        amount: Decimal
    ) -> Dict[str, Any]:
        """
        Ödeme tutarını validate eder.
        
        Args:
            invoice_id: Adisyon ID'si
            amount: Ödenmek istenen tutar
            
        Returns:
            {
                'invoice_total': Decimal,     # Adisyon toplamı
                'already_paid': Decimal,       # Daha önce ödenen
                'remaining': Decimal,          # Kalan tutar
                'is_valid': bool,               # Tutar geçerli mi?
                'message': str                   # Açıklama
            }
        """
        result = await self._execute_procedure(
            'validate_payment_amount',
            invoice_id,
            amount,
            fetch_one=True
        )
        return dict(result) if result else None