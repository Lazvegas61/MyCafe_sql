"""
MyCafe - API Endpoint'leri
"""

# Sadece router'ları import et, başka bir şey yapma
from . import auth
from . import day
from . import invoice
from . import payment
from . import customer
from . import report

__all__ = [
    "auth",
    "day", 
    "invoice",
    "payment",
    "customer",
    "report"
]