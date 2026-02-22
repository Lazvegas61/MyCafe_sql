"""
MyCafe - Güvenlik ve Yetkilendirme Katmanı

Bu modül:
- JWT token işlemleri
- Şifre hash'leme
- Yetki kontrolü fonksiyonları
- Mevcut auth sistemini tamamlar
"""

from datetime import datetime, timedelta
from typing import Optional, List, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.exceptions import PermissionDenied

# Şifre hash'leme context'i
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 şeması - token endpoint'i
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Düz şifre ile hash'lenmiş şifreyi karşılaştırır"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Şifreyi hash'ler"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT access token oluşturur"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """JWT token'ı çözer"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def check_permission(user_role: str, allowed_roles: List[str]) -> bool:
    """
    Kullanıcının yetkisi var mı kontrol eder.
    
    Args:
        user_role: Kullanıcının rolü (SYS, ADMIN, GARSON, MUTFAK)
        allowed_roles: İzin verilen roller listesi
    
    Returns:
        bool: Yetkili ise True, değilse False
    
    Kullanıcı dili:
        "Bu işlem için ADMIN veya GARSON yetkisi gerekiyor."
    
    Örnek:
        check_permission('GARSON', ['ADMIN', 'SYS']) -> False
        check_permission('ADMIN', ['ADMIN', 'GARSON']) -> True
        check_permission('SYS', ['ADMIN']) -> True (SYS her şeyi yapabilir)
    """
    # SYS rolü her şeyi yapabilir
    if user_role == 'SYS':
        return True
    
    # Diğer roller için kontrol et
    return user_role in allowed_roles


def require_permission(allowed_roles: List[str]):
    """
    Decorator benzeri yetki kontrolü (Dependency olarak kullanılır)
    
    Kullanımı:
        @router.get("/secure")
        async def secure_endpoint(
            current_user: dict = Depends(require_permission(['ADMIN', 'SYS']))
        ):
            return {"message": "Yetkili kullanıcı"}
    """
    async def permission_dependency(
        current_user: dict = Depends(oauth2_scheme)  # Burada gerçek user nesnesi olacak
    ):
        # TODO: Token'dan kullanıcı bilgisini al
        # Şimdilik mock bir yapı kullanalım
        user_role = current_user.get('role', 'GARSON') if isinstance(current_user, dict) else 'GARSON'
        
        if not check_permission(user_role, allowed_roles):
            raise PermissionDenied(f"Bu işlem için {', '.join(allowed_roles)} yetkisi gerekli")
        
        return current_user
    
    return permission_dependency


# Kullanıcı tipleri için yardımcı fonksiyonlar
def is_admin(role: str) -> bool:
    """Kullanıcı ADMIN mi?"""
    return role in ['ADMIN', 'SYS']


def is_garson(role: str) -> bool:
    """Kullanıcı GARSON mu?"""
    return role == 'GARSON'


def is_mutfak(role: str) -> bool:
    """Kullanıcı MUTFAK mı?"""
    return role == 'MUTFAK'