"""
MyCafe - Gün Yönetimi API Endpoint'leri
"""
from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional

# 📌 IMPORT EKLENDİ
from fastapi import APIRouter

router = APIRouter()

from app.api.deps import get_current_user, get_db_connection
from app.repositories.day_repository import DayRepository
from app.services.day_service import DayService
from app.models.domain import DayMarkerResponse, DaySnapshotResponse, DayStatusResponse
from app.core.exceptions import PermissionDenied
from app.core.security import check_permission




@router.get("/status", response_model=DayStatusResponse)
async def get_day_status(
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """Gün durumu - Herkes görebilir"""
    repo = DayRepository(conn)
    service = DayService(repo)
    return await service.get_day_status()


@router.post("/open", response_model=DayMarkerResponse, status_code=status.HTTP_201_CREATED)
async def open_day(
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """Yeni gün aç - Sadece ADMIN"""
    if not check_permission(current_user['role'], ['ADMIN', 'SYS']):
        raise PermissionDenied("Gün açma yetkiniz yok")
    
    repo = DayRepository(conn)
    service = DayService(repo)
    
    return await service.open_new_day(
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.post("/close", response_model=DaySnapshotResponse)
async def close_day(
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """Gün kapat - Sadece ADMIN"""
    if not check_permission(current_user['role'], ['ADMIN', 'SYS']):
        raise PermissionDenied("Gün kapatma yetkiniz yok")
    
    repo = DayRepository(conn)
    service = DayService(repo)
    
    return await service.close_day(
        current_user_id=current_user['id'],
        current_user_role=current_user['role']
    )


@router.get("/current", response_model=Optional[DayMarkerResponse])
async def get_current_day(
    current_user: dict = Depends(get_current_user),
    conn = Depends(get_db_connection)
):
    """Açık olan günü getir"""
    repo = DayRepository(conn)
    service = DayService(repo)
    
    return await service.get_current_day()