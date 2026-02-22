"""
MyCafe - Ana API Router'ı
"""

from fastapi import APIRouter

# Şimdilik sadece auth ve day'i ekleyelim
from app.api.endpoints import auth
from app.api.endpoints import day
# from app.api.endpoints import invoice  # geçici olarak kapalı
# from app.api.endpoints import payment  # geçici olarak kapalı
# from app.api.endpoints import customer  # geçici olarak kapalı
# from app.api.endpoints import report    # geçici olarak kapalı

api_router = APIRouter()

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "MyCafe"}

# Auth endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Day endpoints
api_router.include_router(day.router, prefix="/days", tags=["Days"])