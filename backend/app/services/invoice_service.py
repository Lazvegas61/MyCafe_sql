"""
MyCafe - Adisyon Yönetimi Service'i
"""
from typing import Optional, List
from decimal import Decimal

from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.day_repository import DayRepository
from app.models.domain import (
    InvoiceResponse, 
    InvoiceLineResponse, 
    TableResponse,
    InvoiceSummaryResponse
)
from app.core.exceptions import PermissionDenied, ResourceNotFound, ClosedDayViolation
from app.core.security import check_permission


class InvoiceService:
    """
    Adisyon yönetimi service'i
    """
    
    def __init__(self, invoice_repo: InvoiceRepository, day_repo: DayRepository):
        self.invoice_repo = invoice_repo
        self.day_repo = day_repo
    
    async def _validate_day_open(self, operation: str):
        """Günün açık olduğunu doğrular"""
        is_open = await self.day_repo.is_day_open()
        if not is_open:
            raise ClosedDayViolation(operation)
    
    # ==================== ADİSYON İŞLEMLERİ ====================
    
    async def create_invoice(
        self,
        table_id: int,
        current_user_id: int,
        current_user_role: str,
        customer_id: Optional[int] = None
    ) -> InvoiceResponse:
        """Yeni adisyon açar"""
        # Yetki kontrolü - MUTFAK açamaz
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Adisyon açma yetkiniz yok.")
        
        # Gün kontrolü
        await self._validate_day_open("Adisyon açma")
        
        # Adisyonu aç
        result = await self.invoice_repo.create_invoice(
            table_id=table_id,
            opened_by=current_user_id,
            customer_id=customer_id
        )
        
        # Detaylarıyla birlikte getir
        return await self.get_invoice(result['id'], current_user_role)
    
    async def get_invoice(
        self, 
        invoice_id: int, 
        current_user_role: str
    ) -> InvoiceResponse:
        """Adisyon detayını getirir"""
        result = await self.invoice_repo.get_invoice_with_lines(invoice_id)
        if not result:
            raise ResourceNotFound("Adisyon", invoice_id)
        
        invoice_data = result['invoice']
        lines_data = result['lines']
        
        return InvoiceResponse(
            **invoice_data,
            lines=[InvoiceLineResponse(**line) for line in lines_data]
        )
    
    async def get_open_invoices(self, current_user_role: str) -> List[InvoiceSummaryResponse]:
        """Açık adisyonları listeler"""
        results = await self.invoice_repo.get_open_invoices()
        return [InvoiceSummaryResponse(**r) for r in results]
    
    async def get_table_open_invoice(
        self, 
        table_id: int, 
        current_user_role: str
    ) -> Optional[InvoiceResponse]:
        """Bir masanın açık adisyonunu getirir"""
        invoice = await self.invoice_repo.get_table_open_invoice(table_id)
        if not invoice:
            return None
        
        return await self.get_invoice(invoice['id'], current_user_role)
    
    # ==================== SİPARİŞ SATIRLARI ====================
    
    async def add_line(
        self,
        invoice_id: int,
        product_id: Optional[int],
        quantity: Decimal,
        line_type: str,
        current_user_id: int,
        current_user_role: str,
        unit_price: Optional[Decimal] = None,
        note: Optional[str] = None
    ) -> InvoiceLineResponse:
        """Adisyona sipariş satırı ekler"""
        # Yetki kontrolü
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Sipariş ekleme yetkiniz yok.")
        
        # Gün kontrolü
        await self._validate_day_open("Sipariş ekleme")
        
        # Önce adisyonun var olduğunu kontrol et
        invoice = await self.invoice_repo.get_invoice(invoice_id)
        if not invoice:
            raise ResourceNotFound("Adisyon", invoice_id)
        
        # Satırı ekle
        result = await self.invoice_repo.add_invoice_line(
            invoice_id=invoice_id,
            product_id=product_id,
            quantity=quantity,
            line_type=line_type,
            unit_price=unit_price,
            note=note,
            created_by=current_user_id
        )
        
        return InvoiceLineResponse(**result)
    
    async def remove_line(
        self,
        line_id: int,
        current_user_id: int,
        current_user_role: str
    ) -> bool:
        """Adisyon satırını siler"""
        # Yetki kontrolü
        if not check_permission(current_user_role, ['GARSON', 'ADMIN', 'SYS']):
            raise PermissionDenied("Sipariş silme yetkiniz yok.")
        
        # Gün kontrolü
        await self._validate_day_open("Sipariş silme")
        
        # Satırı sil
        return await self.invoice_repo.remove_invoice_line(line_id, current_user_id)
    
    async def get_lines(self, invoice_id: int, current_user_role: str) -> List[InvoiceLineResponse]:
        """Adisyondaki tüm satırları getirir"""
        invoice = await self.invoice_repo.get_invoice(invoice_id)
        if not invoice:
            raise ResourceNotFound("Adisyon", invoice_id)
        
        results = await self.invoice_repo.get_invoice_lines(invoice_id)
        return [InvoiceLineResponse(**r) for r in results]
    
    # ==================== MASA İŞLEMLERİ ====================
    
    async def get_tables(self, current_user_role: str) -> List[TableResponse]:
        """Tüm masaları getirir"""
        results = await self.invoice_repo.get_tables()
        return [TableResponse(**r) for r in results]
    
    async def get_available_tables(self, current_user_role: str) -> List[TableResponse]:
        """Boş masaları getirir"""
        results = await self.invoice_repo.get_available_tables()
        return [TableResponse(**r) for r in results]
    
    async def get_table(self, table_id: int, current_user_role: str) -> TableResponse:
        """Masa detayını getirir"""
        result = await self.invoice_repo.get_table(table_id)
        if not result:
            raise ResourceNotFound("Masa", table_id)
        
        return TableResponse(**result)

# 🗑️ ŞU SATIRI SİL (en alttaki)
# from app.services.invoice_service import InvoiceService  <-- BUNU SİL!