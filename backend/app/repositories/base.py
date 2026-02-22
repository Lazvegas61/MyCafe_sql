"""
MyCafe - Base Repository Sınıfı

Tüm repository'ler bu sınıftan türer:
- Ortak DB bağlantı yönetimi
- Ortak hata handling
- Prosedür çağrıları için yardımcı metodlar
"""

from typing import Any, Dict, List, Optional, Tuple
from asyncpg import Connection, Record
from asyncpg.exceptions import PostgresError
import logging

from app.core.exceptions import DatabaseError, BusinessRuleViolation

logger = logging.getLogger(__name__)


class BaseRepository:
    """
    Tüm repository'lerin base sınıfı
    
    Her repository:
    - __init__'de connection alır
    - _execute_procedure ile prosedür çağırır
    - _fetchone/_fetchall ile kayıtları döner
    """
    
    def __init__(self, conn: Connection):
        """
        Args:
            conn: AsyncPG connection (transaction yönetimi için)
        """
        self.conn = conn
    
    async def _execute_procedure(
        self, 
        proc_name: str, 
        *args,
        fetch: bool = False,
        fetch_one: bool = False
    ) -> Any:
        """
        SQL prosedürünü çağırır ve sonucu döner
        
        Args:
            proc_name: Prosedür adı (örnek: 'open_new_day')
            *args: Prosedüre gönderilecek parametreler
            fetch: True ise tüm kayıtları döner
            fetch_one: True ise tek kayıt döner
            
        Returns:
            fetch=True ise List[Record]
            fetch_one=True ise Record veya None
            fetch=False ise None veya Record (prosedür dönüş tipine göre)
            
        Raises:
            BusinessRuleViolation: İş kuralı ihlali (DB'den gelen hata)
            DatabaseError: Diğer DB hataları
        """
        try:
            # Parametreleri SQL formatına çevir
            placeholders = ', '.join([f'${i+1}' for i in range(len(args))])
            query = f"SELECT * FROM {proc_name}({placeholders})"
            
            logger.debug(f"Executing procedure: {proc_name} with args: {args}")
            
            if fetch:
                # Çoklu kayıt dönen prosedürler (raporlar gibi)
                result = await self.conn.fetch(query, *args)
                return result
            elif fetch_one:
                # Tek kayıt dönen prosedürler
                result = await self.conn.fetchrow(query, *args)
                return result
            else:
                # Hiç kayıt dönmeyen prosedürler (insert/update)
                await self.conn.execute(query, *args)
                return None
                
        except PostgresError as e:
            # PostgreSQL hatalarını yakala
            error_msg = str(e)
            logger.error(f"Database error in {proc_name}: {error_msg}")
            
            # İş kuralı ihlalleri (RAISE EXCEPTION ile fırlatılanlar)
            if "RAISE_EXCEPTION" in error_msg or "P0001" in error_msg:
                # Hata mesajını temizle
                clean_msg = error_msg.split('CONTEXT:')[0].strip()
                clean_msg = clean_msg.replace('ERROR: ', '').replace('P0001: ', '')
                raise BusinessRuleViolation(detail=clean_msg)
            
            # Diğer DB hataları
            raise DatabaseError(detail=f"Procedure {proc_name} failed: {error_msg}")
    
    async def _fetchval(self, query: str, *args) -> Any:
        """Tek bir değer döndüren sorgular için"""
        try:
            return await self.conn.fetchval(query, *args)
        except PostgresError as e:
            logger.error(f"Database error in fetchval: {e}")
            raise DatabaseError(detail=str(e))
    
    async def _execute(self, query: str, *args) -> str:
        """Hiç sonuç dönmeyen sorgular için"""
        try:
            return await self.conn.execute(query, *args)
        except PostgresError as e:
            logger.error(f"Database error in execute: {e}")
            raise DatabaseError(detail=str(e))
    
    def _record_to_dict(self, record: Optional[Record]) -> Optional[Dict]:
        """Record objesini dict'e çevir (None-safe)"""
        if record is None:
            return None
        return dict(record)
    
    def _records_to_dicts(self, records: List[Record]) -> List[Dict]:
        """Record listesini dict listesine çevir"""
        return [dict(r) for r in records]