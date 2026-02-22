"""
MyCafe - Gün Yönetimi Repository'si

Bu repository:
- Gün açma/kapama işlemleri
- Gün durumu sorgulama
- Snapshot alma/okuma
- Tüm prosedür çağrıları BaseRepository üzerinden yapılır
"""

from typing import Optional, List, Dict, Any
from datetime import date
from asyncpg import Connection

from app.repositories.base import BaseRepository
from app.core.exceptions import ResourceNotFound


class DayRepository(BaseRepository):
    """
    Gün yönetimi repository'si
    
    Kullanıcı dili:
    - Yeni gün aç
    - Günü kapat ve snapshot al
    - Açık gün var mı?
    - Günün snapshot'ını getir
    """
    
    def __init__(self, conn: Connection):
        super().__init__(conn)
    
    async def open_new_day(self, opened_by: int) -> Dict[str, Any]:
        """
        Yeni gün açar.
        
        Kullanıcıya anlatımı:
        "Bugünü açıyoruz. Artık sipariş alabilir, ödeme yapabiliriz."
        
        Args:
            opened_by: Günü açan kullanıcının ID'si
            
        Returns:
            {
                'id': int,              # Yeni gün ID'si
                'day_date': date,        # Bugünün tarihi
                'is_open': bool,          # true olacak
                'opened_at': datetime,    # Açılış zamanı
                'opened_by': int          # Açan kullanıcı
            }
            
        Raises:
            BusinessRuleViolation: Zaten açık bir gün varsa
        """
        result = await self._execute_procedure(
            'open_new_day',
            opened_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def close_day_with_snapshot(self, closed_by: int) -> Dict[str, Any]:
        """
        Günü kapatır ve snapshot alır.
        
        Kullanıcıya anlatımı:
        "Günü kapatıyoruz. Artık hiçbir işlem yapılamaz ve bugünün snapshot'ı alındı."
        
        Args:
            closed_by: Günü kapatan kullanıcının ID'si
            
        Returns:
            {
                'snapshot_id': int,       # Alınan snapshot ID'si
                'closed_at': datetime,     # Kapanış zamanı
                'day_id': int,              # Kapanan gün ID'si
                'day_date': date            # Kapanan günün tarihi
            }
            
        Raises:
            BusinessRuleViolation: Açık adisyonlar varsa veya gün zaten kapalıysa
        """
        result = await self._execute_procedure(
            'close_day_with_snapshot',
            closed_by,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_current_day(self) -> Optional[Dict[str, Any]]:
        """
        Açık olan günü getirir.
        
        Kullanıcıya anlatımı:
        "Şu an açık olan günü getiriyoruz. Yoksa boş döner."
        
        Returns:
            {
                'id': int,
                'day_date': date,
                'is_open': bool,
                'opened_at': datetime,
                'opened_by': int,
                'opened_by_name': str
            } veya None
        """
        result = await self._execute_procedure(
            'get_current_day',
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def is_day_open(self) -> bool:
        """
        Gün açık mı kontrolü.
        
        Kullanıcıya anlatımı:
        "Bugün açık mı diye bakıyoruz."
        
        Returns:
            True: Gün açık, işlem yapılabilir
            False: Gün kapalı, işlem yapılamaz
        """
        result = await self._execute_procedure(
            'is_day_open',
            fetch_one=True
        )
        return result['is_open'] if result else False
    
    async def get_day_by_id(self, day_id: int) -> Optional[Dict[str, Any]]:
        """
        ID'ye göre gün getirir.
        
        Args:
            day_id: Gün ID'si
            
        Returns:
            Gün bilgileri veya None
        """
        result = await self._execute_procedure(
            'get_day_by_id',
            day_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_day_by_date(self, day_date: date) -> Optional[Dict[str, Any]]:
        """
        Tarihe göre gün getirir.
        
        Args:
            day_date: Tarih (YYYY-MM-DD)
            
        Returns:
            Gün bilgileri veya None
        """
        result = await self._execute_procedure(
            'get_day_by_date',
            day_date,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def get_day_snapshots(self, day_id: int) -> List[Dict[str, Any]]:
        """
        Bir güne ait tüm snapshot'ları getirir.
        
        Kullanıcıya anlatımı:
        "Geçmişteki bir günün snapshot'larını getiriyoruz."
        
        Args:
            day_id: Gün ID'si
            
        Returns:
            [
                {
                    'id': int,
                    'snapshot_date': datetime,
                    'snapshot_type': str,  # OPENING veya CLOSING
                    'data': dict            # JSON snapshot
                }
            ]
        """
        results = await self._execute_procedure(
            'get_day_snapshots',
            day_id,
            fetch=True
        )
        return [dict(r) for r in results]
    
    async def get_latest_snapshot(self, day_id: int) -> Optional[Dict[str, Any]]:
        """
        Bir günün en son snapshot'ını getirir.
        
        Args:
            day_id: Gün ID'si
            
        Returns:
            En son snapshot veya None
        """
        result = await self._execute_procedure(
            'get_latest_snapshot',
            day_id,
            fetch_one=True
        )
        return dict(result) if result else None
    
    async def validate_day_open(self, operation: str = "Bu işlem") -> None:
        """
        Günün açık olduğunu doğrular. Kapalıysa hata fırlatır.
        
        Kullanıcıya anlatımı:
            "Bu işlem için günün açık olması gerekiyor. Kapalıysa hata veririz."
        
        Args:
            operation: Hata mesajında gösterilecek işlem adı
            
        Raises:
            ClosedDayViolation: Gün kapalıysa
        """
        from app.core.exceptions import ClosedDayViolation
        
        is_open = await self.is_day_open()
        if not is_open:
            raise ClosedDayViolation(operation)