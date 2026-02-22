"""
MyCafe - Profesyonel Exception Handling Katmanı

Hata tipleri:
- BusinessRuleViolation: İş kuralı ihlalleri (DB'den gelen hatalar)
- PermissionDenied: Yetki hataları
- ResourceNotFound: Kaynak bulunamadı
- ClosedDayViolation: Gün kapalı hatası
- ValidationError: Validasyon hataları
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class MyCafeException(HTTPException):
    """Tüm özel exception'ların base sınıfı"""
    def __init__(
        self, 
        status_code: int, 
        detail: str, 
        error_code: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class BusinessRuleViolation(MyCafeException):
    """
    İş kuralı ihlali (DB trigger veya prosedürlerden gelen hatalar)
    Örnek: "Gün kapalı", "Masa dolu", "Borç silinemez"
    """
    def __init__(self, detail: str, error_code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code=error_code
        )


class PermissionDenied(MyCafeException):
    """Yetki hatası - Kullanıcının bu işlemi yapmaya yetkisi yok"""
    def __init__(self, detail: str = "Bu işlem için yetkiniz yok"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="PERMISSION_DENIED"
        )


class ResourceNotFound(MyCafeException):
    """Kaynak bulunamadı - Masa, adisyon, müşteri vb."""
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_type} bulunamadı: {resource_id}",
            error_code="RESOURCE_NOT_FOUND"
        )


class ClosedDayViolation(MyCafeException):
    """
    Gün kapalıyken işlem yapılmaya çalışıldı
    Bu hata ayrı bir sınıf çünkü en kritik kuralımız
    """
    def __init__(self, operation: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gün kapalı olduğu için '{operation}' işlemi yapılamaz",
            error_code="CLOSED_DAY_VIOLATION"
        )


class ValidationError(MyCafeException):
    """Validasyon hatası - Eksik veya hatalı parametre"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="VALIDATION_ERROR"
        )


class DatabaseError(MyCafeException):
    """Veritabanı hatası - Prosedür çağrısı başarısız"""
    def __init__(self, detail: str = "Veritabanı işlemi sırasında hata oluştu"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR"
        )


# Exception handler'ları FastAPI'ye eklemek için yardımcı fonksiyon
def add_exception_handlers(app):
    """FastAPI uygulamasına exception handler'ları ekler"""
    
    @app.exception_handler(BusinessRuleViolation)
    async def business_rule_handler(request, exc):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "error_code": exc.error_code,
                "type": "BusinessRuleViolation"
            }
        )
    
    @app.exception_handler(PermissionDenied)
    async def permission_handler(request, exc):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "error_code": exc.error_code,
                "type": "PermissionDenied"
            }
        )
    
    # Diğer handler'lar da benzer şekilde eklenebilir
    return app