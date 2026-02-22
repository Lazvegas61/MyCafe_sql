"""
MyCafe - Adisyon Yönetimi API Endpoint'leri
"""
from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from decimal import Decimal

# 📌 IMPORT EKLENDİ
from fastapi import APIRouter

router = APIRouter()

from app.api.deps import get_current_user, get_db_connection
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.day_repository import DayRepository
from app.services.invoice_service import InvoiceService
from app.models.domain import (
    InvoiceResponse, 
    InvoiceLineResponse, 
    TableResponse,
    InvoiceSummaryResponse
)
from app.core.exceptions import ResourceNotFound

