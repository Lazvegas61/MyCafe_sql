"""
MyCafe - Gün Yönetimi Service'i

Bu service:
- Yetki kontrolleri yapar
- Repository'leri çağırır
- İş kurallarını uygular (ama üretmez, DB'den gelir)
- Response modellerine dönüştürür
"""

from typing import Optional
from datetime import date

from app.repositories.day_repository import DayRepository
from app.models.domain import (
    DayMarkerResponse, 
    DaySnapshotResponse, 
    DayStatusResponse
)
from app.core.exceptions import PermissionDenied, ResourceNotFound
from app.core.security import check_permission


class DayService:
    """
    Gün yönetimi service'i
    
    Kullanıcı dili:
    - Gün açma yetkisi kontrolü
    - Gün kapatma yetkisi kontrolü
    - Gün durumu sorgulama
    - Snapshot listeleme
    """
    
    def __init__(self, repo: DayRepository):
        self.repo = repo
    
    async def open_new_day(
        self, 
        current_user_id: int, 
        current_user_role: str
    ) -> DayMarkerResponse:
        """
        Yeni gün açar.
        
        Kullanıcıya anlatımı:
            "Yeni gün açmak için ADMIN yetkisi gerekir. 
            Yetkin varsa ve gün kapalıysa açarız."
        
        Args:
            current_user_id: İşlemi yapan kullanıcı
            current_user_role: Kullanıcının rolü (ADMIN, SYS, GARSON vb.)
            
        Returns:
            DayMarkerResponse: Açılan gün bilgileri
            
        Raises:
            PermissionDenied: Yetki yoksa (Sadece ADMIN ve SYS açabilir)
            BusinessRuleViolation: Zaten açık gün varsa (DB'den gelir)
        """
        # Yetki kontrolü - Sadece ADMIN ve SYS açabilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Gün açma yetkiniz yok. Sadece ADMIN'ler açabilir.")
        
        # Repository üzerinden günü aç
        result = await self.repo.open_new_day(current_user_id)
        
        # Response modeline dönüştür
        return DayMarkerResponse(**result)
    
    async def close_day(
        self, 
        current_user_id: int, 
        current_user_role: str
    ) -> DaySnapshotResponse:
        """
        Günü kapatır ve snapshot alır.
        
        Kullanıcıya anlatımı:
            "Günü kapatmak için ADMIN yetkisi gerekir.
            Açık adisyonlar varsa kapatamazsın, DB hata verir."
        
        Args:
            current_user_id: İşlemi yapan kullanıcı
            current_user_role: Kullanıcının rolü
            
        Returns:
            DaySnapshotResponse: Alınan snapshot bilgileri
            
        Raises:
            PermissionDenied: Yetki yoksa
            BusinessRuleViolation: Açık adisyon varsa veya gün zaten kapalıysa
        """
        # Yetki kontrolü - Sadece ADMIN ve SYS kapatabilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Gün kapatma yetkiniz yok. Sadece ADMIN'ler kapatabilir.")
        
        # Repository üzerinden günü kapat
        result = await self.repo.close_day_with_snapshot(current_user_id)
        
        # Response modeline dönüştür (snapshot bilgisi)
        # NOT: close_day_with_snapshot snapshot bilgisi döner
        snapshot_data = {
            'id': result['snapshot_id'],
            'day_id': result['day_id'],
            'snapshot_date': result['closed_at'],
            'snapshot_type': 'CLOSING',
            'data': {}  # Snapshot data ayrıca alınabilir
        }
        return DaySnapshotResponse(**snapshot_data)
    
    async def get_day_status(self) -> DayStatusResponse:
        """
        Günün durumunu getirir.
        
        Kullanıcıya anlatımı:
            "Bugün açık mı, kapalı mı? İşlem yapabilir miyiz?"
        
        Returns:
            DayStatusResponse: Gün durumu
        """
        current_day = await self.repo.get_current_day()
        
        if current_day:
            return DayStatusResponse(
                is_open=True,
                current_date=current_day['day_date'],
                opened_at=current_day['opened_at'],
                can_operate=True,
                message=f"Gün açık - {current_day['day_date']}"
            )
        else:
            return DayStatusResponse(
                is_open=False,
                current_date=date.today(),
                opened_at=None,
                can_operate=False,
                message="Gün kapalı. Lütfen gün açın."
            )
    
    async def get_current_day(self) -> Optional[DayMarkerResponse]:
        """
        Açık olan günü getirir.
        
        Returns:
            DayMarkerResponse veya None
        """
        result = await self.repo.get_current_day()
        if not result:
            return None
        return DayMarkerResponse(**result)
    
    async def get_day_by_id(
        self, 
        day_id: int,
        current_user_role: str
    ) -> DayMarkerResponse:
        """
        ID'ye göre gün getirir.
        
        Args:
            day_id: Gün ID'si
            current_user_role: Kullanıcı rolü
            
        Returns:
            DayMarkerResponse
            
        Raises:
            PermissionDenied: GARSON veya MUTFAK sadece bugünü görebilir
            ResourceNotFound: Gün bulunamazsa
        """
        # GARSON ve MUTFAK sadece bugünü görebilir
        if current_user_role in ['GARSON', 'MUTFAK']:
            current = await self.repo.get_current_day()
            if not current or current['id'] != day_id:
                raise PermissionDenied("Sadece bugünün bilgilerini görebilirsiniz.")
        
        result = await self.repo.get_day_by_id(day_id)
        if not result:
            raise ResourceNotFound("Gün", day_id)
        
        return DayMarkerResponse(**result)
    
    async def get_day_snapshots(
        self, 
        day_id: int,
        current_user_role: str
    ) -> list[DaySnapshotResponse]:
        """
        Bir güne ait snapshot'ları getirir.
        
        Args:
            day_id: Gün ID'si
            current_user_role: Kullanıcı rolü
            
        Returns:
            List[DaySnapshotResponse]
            
        Raises:
            PermissionDenied: Sadece ADMIN ve SYS görebilir
            ResourceNotFound: Gün bulunamazsa
        """
        # Snapshot'ları sadece ADMIN ve SYS görebilir
        if not check_permission(current_user_role, ['ADMIN', 'SYS']):
            raise PermissionDenied("Snapshot'ları sadece ADMIN'ler görebilir.")
        
        # Önce gün var mı kontrol et
        day = await self.repo.get_day_by_id(day_id)
        if not day:
            raise ResourceNotFound("Gün", day_id)
        
        # Snapshot'ları getir
        results = await self.repo.get_day_snapshots(day_id)
        return [DaySnapshotResponse(**r) for r in results]
    
    async def validate_operation(self, operation: str) -> None:
        """
        Bir işlem için günün açık olduğunu doğrular.
        
        Args:
            operation: Yapılmak istenen işlem
            
        Raises:
            ClosedDayViolation: Gün kapalıysa
        """
        await self.repo.validate_day_open(operation)