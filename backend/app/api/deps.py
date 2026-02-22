"""
MyCafe - API Bağımlılıkları (Dependencies)

Bu modül:
- Veritabanı bağlantısı sağlar
- Mevcut kullanıcıyı getirir
- JWT token doğrulaması yapar
- Tüm endpoint'lerin ortak bağımlılıklarını içerir
"""

from typing import Optional, AsyncGenerator, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from asyncpg import create_pool, Connection
from jose import JWTError
import asyncpg
import logging

from app.core.config import settings
from app.core.security import decode_access_token
from app.core.exceptions import PermissionDenied, ResourceNotFound

logger = logging.getLogger(__name__)

# OAuth2 şeması - token endpoint'i
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

# Veritabanı bağlantı havuzu
_db_pool = None


async def get_db_pool():
    """Veritabanı bağlantı havuzunu oluşturur veya var olanı döner"""
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = await create_pool(
                settings.DATABASE_URL,
                min_size=5,
                max_size=20,
                command_timeout=60,
                max_inactive_connection_lifetime=300
            )
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            raise
    return _db_pool


async def get_db_connection() -> AsyncGenerator[Connection, None]:
    """
    Veritabanı bağlantısı sağlar.
    
    Kullanımı:
        async def endpoint(conn = Depends(get_db_connection)):
            # conn kullan
    
    Not:
        - Her istek için yeni bir bağlantı alınır
        - İşlem bitince bağlantı havuza geri verilir
        - Transaction yönetimi repository'de yapılır
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            yield conn
        finally:
            # Bağlantı otomatik olarak havuza döner
            pass


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    conn: Connection = Depends(get_db_connection)
) -> Dict[str, Any]:
    """
    Mevcut kullanıcıyı getirir.
    
    Kullanımı:
        async def endpoint(current_user = Depends(get_current_user)):
            # current_user['id'] kullan
    
    Returns:
        {
            'id': int,
            'username': str,
            'role': str,  # SYS, ADMIN, GARSON, MUTFAK
            'full_name': str
        }
    
    Raises:
        HTTPException 401: Token yoksa veya geçersizse
        HTTPException 404: Kullanıcı bulunamazsa
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token bulunamadı",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Token'ı çöz
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token'da kullanıcı ID'si yok",
        )
    
    # Kullanıcıyı veritabanından getir
    try:
        # app_user tablosundan kullanıcı bilgilerini al
        user_row = await conn.fetchrow(
            """
            SELECT 
                u.id, 
                u.username, 
                u.full_name, 
                r.role_name as role,
                u.is_active
            FROM app_user u
            JOIN role r ON u.role_id = r.id
            WHERE u.id = $1 AND u.is_active = true
            """,
            int(user_id)
        )
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kullanıcı bulunamadı veya aktif değil"
            )
        
        return dict(user_row)
        
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kullanıcı bilgisi alınamadı"
        )


async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    conn: Connection = Depends(get_db_connection)
) -> Optional[Dict[str, Any]]:
    """
    Mevcut kullanıcıyı getirir (opsiyonel).
    
    Kullanımı:
        - Token varsa kullanıcıyı döner
        - Token yoksa None döner (hata fırlatmaz)
    
    Public endpoint'ler için kullanılır.
    """
    if not token:
        return None
    
    try:
        return await get_current_user(token, conn)
    except HTTPException:
        return None


def require_roles(allowed_roles: list):
    """
    Belirli rolleri zorunlu kılan dependency.
    
    Kullanımı:
        @router.get("/admin-only")
        async def admin_endpoint(
            current_user = Depends(require_roles(['ADMIN', 'SYS']))
        ):
            return {"message": "Hoşgeldin Admin"}
    
    Args:
        allowed_roles: İzin verilen roller listesi
    
    Returns:
        Dependency function
    """
    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        from app.core.security import check_permission
        
        if not check_permission(current_user['role'], allowed_roles):
            raise PermissionDenied(
                f"Bu işlem için {', '.join(allowed_roles)} yetkisi gerekli"
            )
        return current_user
    
    return role_checker


# Kısa kullanımlar için hazır dependency'ler
require_admin = require_roles(['ADMIN', 'SYS'])
require_garson = require_roles(['GARSON', 'ADMIN', 'SYS'])
require_mutfak = require_roles(['MUTFAK', 'ADMIN', 'SYS'])