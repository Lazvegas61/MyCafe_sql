"""
MyCafe - Adisyon Yönetimi Repository'si

Bu repository:
- Adisyon açma/kapama
- Sipariş ekleme/çıkarma
- Masa durumu sorgulama
- Tüm prosedür çağrıları BaseRepository üzerinden yapılır
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from asyncpg import Connection

from app.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository):
    """
    Adisyon yönetimi repository'si
    
    Kullanıcı dili:
    - Yeni adisyon aç
    - Sipariş ekle
    - Sipariş sil
    - Adisyon detayını getir
    - Masanın açık adisyonu var mı?
    """
    
    def __init__(self, conn: Connection):
        super().__init__(conn)
    
    # ==================== ADİSYON İŞLEMLERİ ====================
    
    async def create_invoice(
        self, 
        table_id: int, 
        opened_by: int,
        customer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Yeni adisyon açar.
        
        Kullanıcıya anlatımı:
            "Masa {table_id} için yeni bir adisyon açıyorum. 
            Artık sipariş alabiliriz."
        
        Args:
            table_id: Masa ID'si
            opened_by: Açan kullanıcı ID'si
            customer_id: Müşteri ID'si (varsa, hesaba yazılacaksa)
            
        Returns:
            {
                'id': int,              # Yeni adisyon ID'si
                'table_id': int,         # Masa ID'si
                'status': str,            # 'OPEN' olacak
                'opened_at': datetime,    # Açılış zamanı
                'opened_by': int          # Açan kullanıcı
            }
            
        Raises:
            BusinessRuleViolation: 
                - Masa doluysa (zaten açık adisyon varsa)
                - Gün kapalıysa
                - Masa aktif değilse
        """
        result = await self._execute_procedure(
            'create_invoice',
            table_id,
            opened_by,
            customer_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_invoice(self, invoice_id: int) -> Optional[Dict[str, Any]]:
        """
        Adisyon detayını getirir.
        
        Args:
            invoice_id: Adisyon ID'si
            
        Returns:
            {
                'id': int,
                'table_id': int,
                'table_number': int,
                'customer_id': Optional[int],
                'customer_name': Optional[str],
                'status': str,
                'opened_at': datetime,
                'closed_at': Optional[datetime],
                'opened_by': int,
                'opened_by_name': str,
                'closed_by': Optional[int],
                'total_amount': Decimal  # UI için toplam (finans değil!)
            }
        """
        result = await self._execute_procedure(
            'get_invoice',
            invoice_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_invoice_with_lines(self, invoice_id: int) -> Optional[Dict[str, Any]]:
        """
        Adisyonu ve tüm satırlarını getirir.
        
        Args:
            invoice_id: Adisyon ID'si
            
        Returns:
            {
                'invoice': {...},  # get_invoice çıktısı
                'lines': [...]      # satırlar listesi
            }
        """
        result = await self._execute_procedure(
            'get_invoice_with_lines',
            invoice_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_open_invoices(self) -> List[Dict[str, Any]]:
        """
        Açık olan tüm adisyonları getirir.
        
        Returns:
            [
                {
                    'id': int,
                    'table_number': int,
                    'opened_at': datetime,
                    'total_amount': Decimal,
                    'line_count': int
                }
            ]
        """
        results = await self._execute_procedure(
            'get_open_invoices',
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_table_open_invoice(self, table_id: int) -> Optional[Dict[str, Any]]:
        """
        Bir masanın açık adisyonunu getirir.
        
        Args:
            table_id: Masa ID'si
            
        Returns:
            Adisyon bilgisi veya None (masa boşsa)
        """
        result = await self._execute_procedure(
            'get_table_open_invoice',
            table_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def is_table_occupied(self, table_id: int) -> bool:
        """
        Masa dolu mu kontrolü.
        
        Args:
            table_id: Masa ID'si
            
        Returns:
            True: Masa dolu (açık adisyon var)
            False: Masa boş
        """
        result = await self._execute_procedure(
            'is_table_occupied',
            table_id,
            fetch_one=True
        )
        return result['is_occupied'] if result else False
    
    # ==================== SİPARİŞ SATIRLARI ====================
    
    async def add_invoice_line(
        self,
        invoice_id: int,
        product_id: Optional[int],
        quantity: Decimal,
        line_type: str,
        unit_price: Optional[Decimal] = None,
        note: Optional[str] = None,
        created_by: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Adisyona sipariş satırı ekler.
        
        Kullanıcıya anlatımı:
            "Adisyona {quantity} adet ürün ekliyorum."
        
        Args:
            invoice_id: Adisyon ID'si
            product_id: Ürün ID'si (NORMAL için zorunlu)
            quantity: Miktar
            line_type: Satır tipi (NORMAL, SIPARIS_YEMEK, BILARDO)
            unit_price: Birim fiyat (SIPARIS_YEMEK için zorunlu)
            note: Açıklama
            created_by: Ekleyen kullanıcı
            
        Returns:
            {
                'id': int,              # Satır ID'si
                'line_total': Decimal,   # Satır toplamı
                'product_name': str,      # Ürün adı (snapshot)
                'unit_price': Decimal     # Birim fiyat (snapshot)
            }
            
        Raises:
            BusinessRuleViolation:
                - Adisyon kapalıysa
                - Gün kapalıysa
                - Ürün stokta yoksa (stok kontrolü)
        """
        result = await self._execute_procedure(
            'add_invoice_line',
            invoice_id,
            product_id,
            quantity,
            line_type,
            unit_price,
            note,
            created_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def remove_invoice_line(
        self,
        line_id: int,
        removed_by: int
    ) -> bool:
        """
        Adisyon satırını siler (soft delete).
        
        Kullanıcıya anlatımı:
            "Siparişi iptal ediyorum."
        
        Args:
            line_id: Satır ID'si
            removed_by: Silen kullanıcı
            
        Returns:
            True: Başarılı
            
        Raises:
            BusinessRuleViolation:
                - Adisyon kapalıysa
                - Satır zaten silinmişse
        """
        result = await self._execute_procedure(
            'remove_invoice_line',
            line_id,
            removed_by,
            fetch_one=True
        )
        return result['success'] if result else False
    
    async def get_invoice_lines(self, invoice_id: int) -> List[Dict[str, Any]]:
        """
        Adisyondaki tüm satırları getirir.
        
        Args:
            invoice_id: Adisyon ID'si
            
        Returns:
            [
                {
                    'id': int,
                    'line_type': str,
                    'product_name_snapshot': str,
                    'quantity': Decimal,
                    'unit_price_snapshot': Decimal,
                    'line_total': Decimal,
                    'note': Optional[str],
                    'created_at': datetime,
                    'created_by_name': str
                }
            ]
        """
        results = await self._execute_procedure(
            'get_invoice_lines',
            invoice_id,
            fetch=True
        )
        return [dict(r) for r in results]
    
    # ==================== ADİSYON KAPATMA ====================
    
    async def close_invoice(
        self,
        invoice_id: int,
        closed_by: int
    ) -> Dict[str, Any]:
        """
        Adisyonu kapatır (ödeme yapılmadan).
        
        Not: Normalde ödeme ile birlikte kapanır.
        Bu prosedür sadece iptal durumları için.
        
        Args:
            invoice_id: Adisyon ID'si
            closed_by: Kapatan kullanıcı
            
        Returns:
            {
                'success': bool,
                'closed_at': datetime
            }
        """
        result = await self._execute_procedure(
            'close_invoice',
            invoice_id,
            closed_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def cancel_invoice(
        self,
        invoice_id: int,
        cancelled_by: int,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adisyonu iptal eder.
        
        Args:
            invoice_id: Adisyon ID'si
            cancelled_by: İptal eden kullanıcı
            reason: İptal sebebi
            
        Returns:
            {
                'success': bool,
                'cancelled_at': datetime
            }
            
        Raises:
            BusinessRuleViolation:
                - Adisyon zaten kapalıysa
                - Üzerinde finans hareketi varsa
        """
        result = await self._execute_procedure(
            'cancel_invoice',
            invoice_id,
            cancelled_by,
            reason,
            fetch_one=True
        )
        return dict(result) if result else None
    
    # ==================== MASA İŞLEMLERİ ====================
    
    async def get_tables(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        Tüm masaları getirir.
        
        Args:
            include_inactive: Pasif masaları da getir
            
        Returns:
            [
                {
                    'id': int,
                    'table_number': int,
                    'table_name': str,
                    'is_active': bool,
                    'is_occupied': bool,
                    'current_invoice_id': Optional[int]
                }
            ]
        """
        results = await self._execute_procedure(
            'get_tables',
            include_inactive,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_table(self, table_id: int) -> Optional[Dict[str, Any]]:
        """
        Masa detayını getirir.
        
        Args:
            table_id: Masa ID'si
        """
        result = await self._execute_procedure(
            'get_table',
            table_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_available_tables(self) -> List[Dict[str, Any]]:
        """
        Boş masaları getirir.
        
        Returns:
            Boş ve aktif masalar
        """
        results = await self._execute_procedure(
            'get_available_tables',
            fetch=True
        )
        return [dict(r) for r in results]