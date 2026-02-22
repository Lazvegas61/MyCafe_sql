"""
MyCafe - SQL Prosedür Çağrıları

Bu dosya:
- Tüm SQL prosedürlerini Python fonksiyonlarına eşler
- Her prosedürün parametrelerini ve dönüş tipini dokümante eder
- Repository'ler bu fonksiyonları kullanır
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal

# NOT: Bu fonksiyonlar doğrudan çağrılmaz.
# Repository'ler BaseRepository._execute_procedure üzerinden çağırır.
# Bu dosya sadece prosedür imzalarını dokümante eder.


# ==================== GÜN YÖNETİMİ ====================

async def call_open_new_day(
    conn, 
    opened_by: int
) -> Dict[str, Any]:
    """
    Yeni gün açar.
    
    Args:
        opened_by: Açan kullanıcı ID
    
    Returns:
        {
            'id': int,
            'day_date': date,
            'is_open': bool
        }
    
    Raises:
        BusinessRuleViolation: Zaten açık gün varsa
    """
    # Repository şu şekilde çağırır:
    # result = await self._execute_procedure(
    #     'open_new_day', 
    #     opened_by,
    #     fetch_one=True
    # )
    pass


async def call_close_day_with_snapshot(
    conn,
    closed_by: int
) -> Dict[str, Any]:
    """
    Günü kapatır ve snapshot alır.
    
    Args:
        closed_by: Kapatan kullanıcı ID
    
    Returns:
        {
            'snapshot_id': int,
            'closed_at': datetime
        }
    
    Raises:
        BusinessRuleViolation: Açık adisyon varsa
    """
    pass


async def call_get_current_day(
    conn
) -> Optional[Dict[str, Any]]:
    """
    Açık olan günü döner.
    
    Returns:
        {
            'id': int,
            'day_date': date,
            'is_open': bool,
            'opened_at': datetime,
            'opened_by': int
        } veya None
    """
    pass


# ==================== ADİSYON İŞLEMLERİ ====================

async def call_create_invoice(
    conn,
    table_id: int,
    opened_by: int,
    customer_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Yeni adisyon açar.
    
    Args:
        table_id: Masa ID
        opened_by: Açan kullanıcı
        customer_id: Müşteri (varsa)
    
    Returns:
        {
            'id': int,
            'table_id': int,
            'status': str
        }
    
    Raises:
        BusinessRuleViolation: Masa doluysa veya gün kapalıysa
    """
    pass


async def call_add_invoice_line(
    conn,
    invoice_id: int,
    product_id: Optional[int],
    quantity: Decimal,
    line_type: str,
    unit_price: Optional[Decimal] = None,
    note: Optional[str] = None,
    created_by: int = None
) -> Dict[str, Any]:
    """
    Adisyona satır ekler.
    
    Args:
        invoice_id: Adisyon ID
        product_id: Ürün ID (NORMAL için zorunlu)
        quantity: Miktar
        line_type: NORMAL, SIPARIS_YEMEK, BILARDO
        unit_price: SIPARIS_YEMEK için zorunlu
        note: Açıklama
        created_by: Ekleyen kullanıcı
    
    Returns:
        {
            'id': int,
            'line_total': Decimal
        }
    
    Raises:
        BusinessRuleViolation: Adisyon kapalıysa veya gün kapalıysa
    """
    pass


async def call_remove_invoice_line(
    conn,
    line_id: int,
    removed_by: int
) -> bool:
    """
    Adisyon satırını siler (soft delete).
    
    Args:
        line_id: Satır ID
        removed_by: Silen kullanıcı
    
    Returns:
        True başarılı, False değilse
    
    Raises:
        BusinessRuleViolation: Adisyon kapalıysa
    """
    pass


# ==================== ÖDEME İŞLEMLERİ ====================

async def call_process_payment_atomic(
    conn,
    invoice_id: int,
    payment_method: str,
    amount: Decimal,
    processed_by: int,
    customer_id: Optional[int] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Atomik ödeme işlemi.
    
    Args:
        invoice_id: Adisyon ID
        payment_method: CASH, CREDIT_CARD, DEBT
        amount: Ödenen tutar
        processed_by: İşlemi yapan kullanıcı
        customer_id: DEBT için zorunlu
        description: Açıklama
    
    Returns:
        {
            'transaction_id': int,
            'invoice_closed': bool,
            'table_freed': bool,
            'billiard_calculated': bool
        }
    
    Raises:
        BusinessRuleViolation: Tutar uyuşmazlığı, kapalı gün vb.
    """
    pass


# ==================== MÜŞTERİ İŞLEMLERİ ====================

async def call_create_debt_for_customer(
    conn,
    customer_id: int,
    invoice_id: int,
    amount: Decimal,
    created_by: int,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Müşteriye borç yazar.
    
    Args:
        customer_id: Müşteri ID
        invoice_id: Adisyon ID
        amount: Borç tutarı
        created_by: Oluşturan kullanıcı
        description: Açıklama
    
    Returns:
        {
            'debt_id': int,
            'new_total_debt': Decimal
        }
    
    Raises:
        BusinessRuleViolation: Adisyon kapalıysa
    """
    pass


async def call_pay_customer_debt(
    conn,
    customer_id: int,
    amount: Decimal,
    payment_method: str,
    created_by: int,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Müşteri borcuna ödeme yapar.
    
    Args:
        customer_id: Müşteri ID
        amount: Ödenen tutar
        payment_method: CASH, CREDIT_CARD
        created_by: İşlemi yapan
        description: Açıklama
    
    Returns:
        {
            'transaction_id': int,
            'new_total_debt': Decimal
        }
    """
    pass


# ==================== STOK İŞLEMLERİ ====================

async def call_auto_stock_reduction_on_invoice_close(
    conn,
    invoice_id: int
) -> List[Dict[str, Any]]:
    """
    Adisyon kapanırken otomatik stok düşümü.
    
    Args:
        invoice_id: Adisyon ID
    
    Returns:
        [
            {
                'product_id': int,
                'product_name': str,
                'reduced_quantity': Decimal,
                'new_stock': Decimal
            }
        ]
    """
    pass


# ==================== BİLARDO İŞLEMLERİ ====================

async def call_start_billiard_session(
    conn,
    table_id: int,
    invoice_id: int,
    started_by: int
) -> Dict[str, Any]:
    """
    Bilardo seansı başlatır.
    
    Args:
        table_id: Bilardo masa ID
        invoice_id: Adisyon ID
        started_by: Başlatan kullanıcı
    
    Returns:
        {
            'session_id': int,
            'start_time': datetime
        }
    """
    pass


async def call_end_billiard_session(
    conn,
    session_id: int,
    ended_by: int
) -> Dict[str, Any]:
    """
    Bilardo seansını bitirir ve ücreti hesaplar.
    
    Args:
        session_id: Seans ID
        ended_by: Bitiren kullanıcı
    
    Returns:
        {
            'duration_minutes': int,
            'amount': Decimal,
            'invoice_line_id': int
        }
    """
    pass


# ==================== RAPORLAR ====================

async def call_get_daily_sales_report(
    conn,
    report_date: date
) -> List[Dict[str, Any]]:
    """
    Günlük satış raporu.
    
    Args:
        report_date: Rapor tarihi
    
    Returns:
        [
            {
                'payment_method': str,
                'total_amount': Decimal,
                'transaction_count': int
            }
        ]
    """
    pass


async def call_get_product_sales_report(
    conn,
    start_date: date,
    end_date: date
) -> List[Dict[str, Any]]:
    """
    Ürün bazlı satış raporu.
    
    Args:
        start_date: Başlangıç
        end_date: Bitiş
    
    Returns:
        [
            {
                'product_id': int,
                'product_name': str,
                'total_quantity': Decimal,
                'total_amount': Decimal
            }
        ]
    """
    pass