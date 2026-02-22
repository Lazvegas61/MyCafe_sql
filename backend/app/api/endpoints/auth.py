"""
MyCafe - Kimlik Doğrulama Endpoint'leri
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from asyncpg import Connection

from app.api.deps import get_db_connection
from app.core.security import create_access_token, verify_password
from app.core.config import settings

router = APIRouter()


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn: Connection = Depends(get_db_connection)
):
    """
    Kullanıcı girişi yapar.
    
    - username: Kullanıcı adı
    - password: Şifre
    
    Returns:
        {
            "access_token": "jwt_token",
            "token_type": "bearer"
        }
    """
    # Kullanıcıyı bul
    user = await conn.fetchrow(
        """
        SELECT u.id, u.username, u.password_hash, u.full_name, r.role_name
        FROM app_user u
        JOIN role r ON u.role_id = r.id
        WHERE u.username = $1 AND u.is_active = true
        """,
        form_data.username
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı"
        )
    
    # Şifre kontrolü
    if not verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı"
        )
    
    # Token oluştur
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user['id']), "role": user['role_name']},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user['id'],
        "full_name": user['full_name'],
        "role": user['role_name']
    }


@router.post("/test-login")
async def test_login():
    """
    Test amaçlı basit login (geliştirme için)
    """
    access_token = create_access_token(
        data={"sub": "1", "role": "ADMIN"}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": 1,
        "full_name": "Test Admin",
        "role": "ADMIN"
    }