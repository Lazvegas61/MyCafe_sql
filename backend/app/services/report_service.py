"""
MyCafe - Rapor Yönetimi Service'i

Bu service:
- Yetki kontrolleri yapar
- SQL VIEW'lar üzerinden raporları getirir
- Tarih bazlı filtreleme yapar
- Response modellerine dönüştürür

NOT: Raporlar doğrudan financetransaction tablosundan veya SQL VIEW'lardan okunur.
UI asla hesap yapmaz, sadece gösterir.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.repositories.payment_repository import PaymentRepository
from app.repositories.day_repository import DayRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.customer_repository import CustomerRepository
from app.models.domain import (
    DailySalesReportResponse,
    ProductSalesReportResponse,
    FinanceTransactionResponse
)
from app.core.exceptions import PermissionDenied, ResourceNotFound
from app.core.security import check_permission


class ReportService:
    """
    Rapor yönetimi service'i
    
    Kullanıcı dili:
    - Günlük satış raporu
    - Ürün bazlı satış raporu
    - Finans hareketleri
    - Özet raporlar
    """
    
    def __init__(
        self,
        payment_repo: PaymentRepository,
        day_repo: DayRepository,
        invoice_repo: InvoiceRepository,
        customer_repo: CustomerRepository
    ):
        self.payment_repo = payment_repo
        self.day_repo = day_repo
        self.invoice_repo = invoice_repo
        self.customer_repo = customer_repo
    
    # ==================== YETKİ KONTROLLERİ ====================
    
    async def _validate_report_access(self, user_role: str):
        """Raporlara erişim yetkisi kontrolü"""
        if not check_permission(user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied(
                "Raporları sadece ADMIN'ler görebilir. "
                "GARSON ve MUTFAK finansal verilere erişemez."
            )
    
    async def _get_day_or_current(self, day_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Verilen ID'ye göre günü getir, yoksa bugünü getir.
        
        Args:
            day_id: Gün ID (opsiyonel)
            
        Returns:
            Gün bilgileri
            
        Raises:
            ResourceNotFound: Gün bulunamazsa
        """
        if day_id:
            day = await self.day_repo.get_day_by_id(day_id)
            if not day:
                raise ResourceNotFound("Gün", day_id)
            return day
        
        # Bugünü getir
        current_day = await self.day_repo.get_current_day()
        if not current_day:
            # Bugün açık gün yoksa, en son kapanan günü bul
            # Bu kısım DB'de ayrı bir prosedür olabilir
            raise ResourceNotFound("Gün", "Aktif gün bulunamadı")
        
        return current_day
    
    # ==================== GÜNLÜK RAPORLAR ====================
    
    async def get_daily_sales_report(
        self,
        user_role: str,
        day_id: Optional[int] = None,
        report_date: Optional[date] = None
    ) -> DailySalesReportResponse:
        """
        Günlük satış raporu getirir.
        
        Kullanıcıya anlatımı:
            "Günlük satış raporunu getiriyorum:
            - Toplam satış
            - Nakit/kart dağılımı
            - Borç hareketleri"
        
        Args:
            user_role: Kullanıcı rolü
            day_id: Belirli bir gün ID'si
            report_date: Belirli bir tarih
            
        Returns:
            DailySalesReportResponse
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # Raporlanacak günü belirle
        if day_id:
            day = await self.day_repo.get_day_by_id(day_id)
            if not day:
                raise ResourceNotFound("Gün", day_id)
            target_day_id = day_id
            target_date = day['day_date']
        elif report_date:
            # Tarihe göre gün bul
            day = await self.day_repo.get_day_by_date(report_date)
            if not day:
                # O tarihte gün açılmamış olabilir, boş rapor dön
                return DailySalesReportResponse(
                    day_date=report_date,
                    total_sales=Decimal('0'),
                    cash_payments=Decimal('0'),
                    credit_card_payments=Decimal('0'),
                    debt_created=Decimal('0'),
                    debt_paid=Decimal('0'),
                    invoice_count=0,
                    transaction_count=0
                )
            target_day_id = day['id']
            target_date = day['day_date']
        else:
            # Bugün
            day = await self._get_day_or_current(None)
            target_day_id = day['id']
            target_date = day['day_date']
        
        # Özet bilgileri getir
        summary = await self.payment_repo.get_daily_summary(target_day_id)
        
        return DailySalesReportResponse(
            day_date=target_date,
            total_sales=summary['total_sales'],
            cash_payments=summary['cash_total'],
            credit_card_payments=summary['credit_card_total'],
            debt_created=summary['debt_created'],
            debt_paid=summary['debt_paid'],
            invoice_count=summary.get('invoice_count', 0),
            transaction_count=summary['transaction_count']
        )
    
    async def get_detailed_daily_report(
        self,
        user_role: str,
        day_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Detaylı günlük rapor (tüm hareketler).
        
        Returns:
            {
                "day_info": {...},
                "payments": [...],      # Ödeme listesi
                "invoices": [...],       # Adisyon listesi
                "debts": [...],           # Borç hareketleri
                "summary": {...}          # Özet bilgiler
            }
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # Günü bul
        day = await self._get_day_or_current(day_id)
        
        # Tüm verileri topla
        payments = await self.payment_repo.get_daily_payments(day['id'])
        
        # Finans transaction'ları
        transactions = await self.payment_repo.get_finance_transactions(day_id=day['id'])
        
        # Borç özeti
        debt_summary = await self.customer_repo.get_debt_summary(day_id=day['id'])
        
        # Açık adisyonlar varsa (gün açıksa)
        open_invoices = []
        if day['is_open']:
            open_invoices = await self.invoice_repo.get_open_invoices()
        
        return {
            "day_info": {
                "id": day['id'],
                "date": day['day_date'],
                "is_open": day['is_open'],
                "opened_at": day.get('opened_at'),
                "closed_at": day.get('closed_at')
            },
            "transactions": [dict(t) for t in transactions],
            "payments": [dict(p) for p in payments],
            "open_invoices": open_invoices,
            "debt_summary": debt_summary,
            "summary": await self.payment_repo.get_daily_summary(day['id'])
        }
    
    # ==================== ÜRÜN RAPORLARI ====================
    
    async def get_product_sales_report(
        self,
        user_role: str,
        start_date: date,
        end_date: date,
        category_id: Optional[int] = None
    ) -> List[ProductSalesReportResponse]:
        """
        Ürün bazlı satış raporu.
        
        Kullanıcıya anlatımı:
            "Ürün bazlı satış raporunu getiriyorum:
            - Hangi üründen kaç satılmış
            - Toplam cirosu ne kadar"
        
        Args:
            user_role: Kullanıcı rolü
            start_date: Başlangıç tarihi
            end_date: Bitiş tarihi
            category_id: Kategori filtresi (opsiyonel)
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # Tarih aralığı kontrolü
        if start_date > end_date:
            start_date, end_date = end_date, start_date
        
        # Maksimum 1 yıllık rapor
        if (end_date - start_date) > timedelta(days=365):
            end_date = start_date + timedelta(days=365)
        
        # Raporu getir (DB'de view veya prosedür olacak)
        # Şimdilik mock veri dönüyoruz, gerçekte DB'den gelecek
        # TODO: DB'den gerçek veriyi çek
        
        # Mock veri
        return [
            ProductSalesReportResponse(
                product_id=1,
                product_name="Türk Kahvesi",
                category_name="İçecek",
                quantity=Decimal('45'),
                total_amount=Decimal('1350'),
                day_date=date.today()
            ),
            ProductSalesReportResponse(
                product_id=2,
                product_name="Limonata",
                category_name="İçecek",
                quantity=Decimal('30'),
                total_amount=Decimal('900'),
                day_date=date.today()
            )
        ]
    
    async def get_category_sales_report(
        self,
        user_role: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Kategori bazlı satış raporu.
        
        Returns:
            [
                {
                    "category_name": "İçecek",
                    "total_quantity": 75,
                    "total_amount": 2250,
                    "product_count": 2
                }
            ]
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # TODO: DB'den gerçek veriyi çek
        return []
    
    # ==================== FİNANS RAPORLARI ====================
    
    async def get_finance_transactions(
        self,
        user_role: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[FinanceTransactionResponse]:
        """
        Finans hareketlerini getirir.
        
        Kullanıcıya anlatımı:
            "Tüm finans hareketlerini getiriyorum:
            - Satışlar
            - Ödemeler
            - Borçlar
            - Giderler"
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # Tarih aralığı yoksa son 30 gün
        if not start_date:
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
        
        # Transaction'ları getir
        transactions = await self.payment_repo.get_finance_transactions(
            day_id=None,
            start_date=start_date,
            end_date=end_date,
            transaction_type=transaction_type
        )
        
        # Sayfalama
        paginated = transactions[offset:offset + limit]
        
        return [FinanceTransactionResponse(**t) for t in paginated]
    
    async def get_cash_flow_report(
        self,
        user_role: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Nakit akış raporu.
        
        Returns:
            {
                "period_start": date,
                "period_end": date,
                "cash_in": Decimal,      # Giren nakit
                "cash_out": Decimal,      # Çıkan nakit (iade, gider)
                "net_cash_flow": Decimal, # Net nakit akışı
                "daily_breakdown": [...]   # Günlük detay
            }
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # TODO: DB'den gerçek veriyi çek
        return {
            "period_start": start_date,
            "period_end": end_date,
            "cash_in": Decimal('5000'),
            "cash_out": Decimal('500'),
            "net_cash_flow": Decimal('4500'),
            "daily_breakdown": []
        }
    
    # ==================== KARŞILAŞTIRMA RAPORLARI ====================
    
    async def compare_days(
        self,
        user_role: str,
        day_id_1: int,
        day_id_2: int
    ) -> Dict[str, Any]:
        """
        İki günü karşılaştırır.
        
        Returns:
            {
                "day1": {...},
                "day2": {...},
                "differences": {
                    "sales_diff": Decimal,
                    "cash_diff": Decimal,
                    "invoice_count_diff": int
                }
            }
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # İki günü de getir
        day1 = await self.day_repo.get_day_by_id(day_id_1)
        day2 = await self.day_repo.get_day_by_id(day_id_2)
        
        if not day1 or not day2:
            raise ResourceNotFound("Gün", "Günlerden biri bulunamadı")
        
        # Özetleri getir
        summary1 = await self.payment_repo.get_daily_summary(day_id_1)
        summary2 = await self.payment_repo.get_daily_summary(day_id_2)
        
        return {
            "day1": {
                "date": day1['day_date'],
                "summary": summary1
            },
            "day2": {
                "date": day2['day_date'],
                "summary": summary2
            },
            "differences": {
                "sales_diff": summary1['total_sales'] - summary2['total_sales'],
                "cash_diff": summary1['cash_total'] - summary2['cash_total'],
                "invoice_count_diff": summary1.get('invoice_count', 0) - summary2.get('invoice_count', 0)
            }
        }
    
    # ==================== ÖZET RAPORLAR ====================
    
    async def get_period_summary(
        self,
        user_role: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Dönem özet raporu.
        
        Returns:
            {
                "period": "01.01.2024 - 31.01.2024",
                "total_sales": Decimal,
                "total_cash": Decimal,
                "total_credit": Decimal,
                "total_debt_created": Decimal,
                "total_debt_paid": Decimal,
                "average_daily_sales": Decimal,
                "busiest_day": {...},
                "top_products": [...]
            }
        """
        # Yetki kontrolü
        await self._validate_report_access(user_role)
        
        # TODO: DB'den gerçek veriyi çek
        return {
            "period": f"{start_date} - {end_date}",
            "total_sales": Decimal('15000'),
            "total_cash": Decimal('10000'),
            "total_credit": Decimal('5000'),
            "total_debt_created": Decimal('2000'),
            "total_debt_paid": Decimal('1500'),
            "average_daily_sales": Decimal('500'),
            "busiest_day": {},
            "top_products": []
        }