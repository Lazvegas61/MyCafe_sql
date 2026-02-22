"""
MyCafe - Ana Uygulama Dosyası
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import add_exception_handlers

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# FastAPI uygulamasını oluştur
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MyCafe - Tek şubeli kafe/restoran işletme yazılımı",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS ayarları (UI'dan erişim için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React UI
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler'ları ekle
add_exception_handlers(app)

# API router'ını ekle
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": "MyCafe API'ye hoş geldiniz!",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


@app.on_event("startup")
async def startup_event():
    """Uygulama başlarken yapılacak işlemler"""
    from app.api.deps import get_db_pool
    logging.info("MyCafe API başlatılıyor...")
    await get_db_pool()
    logging.info("Veritabanı bağlantı havuzu oluşturuldu.")


@app.on_event("shutdown")
async def shutdown_event():
    """Uygulama kapanırken yapılacak işlemler"""
    from app.api.deps import _db_pool
    if _db_pool:
        await _db_pool.close()
        logging.info("Veritabanı bağlantı havuzu kapatıldı.")