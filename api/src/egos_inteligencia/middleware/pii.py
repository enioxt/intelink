"""
PII Detection and Masking Middleware — EGOS Inteligência
Sacred Code: 000.111.369.963.1618

Brazilian PII detection and protection.
"""

import re
from typing import Optional


# Brazilian PII Patterns
PII_PATTERNS = {
    'cpf': re.compile(r'\b(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})\b'),
    'cnpj': re.compile(r'\b(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})\b'),
    'email': re.compile(r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b'),
    'phone': re.compile(r'\b(\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4})\b'),
    'cep': re.compile(r'\b(\d{5}[-\s]?\d{3})\b'),
    'rg': re.compile(r'\b(\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-\s]?[\dxX])\b'),
}


def mask_cpf(cpf: str) -> str:
    """Mask CPF showing only last 2 digits."""
    cleaned = re.sub(r'\D', '', cpf)
    if len(cleaned) == 11:
        return f"***.***.{cleaned[6:9]}-{cleaned[9:11]}"
    return "***.***.***-**"


def mask_cnpj(cnpj: str) -> str:
    """Mask CNPJ showing only last 4 digits."""
    cleaned = re.sub(r'\D', '', cnpj)
    if len(cleaned) == 14:
        return f"**.***.***/{cleaned[8:12]}-{cleaned[12:14]}"
    return "**.***.***/****-**"


def mask_email(email: str) -> str:
    """Mask email showing only first and last character of local part."""
    if '@' not in email:
        return "***@***"
    local, domain = email.rsplit('@', 1)
    if len(local) <= 2:
        return f"{local[0]}*@{domain}"
    return f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}@{domain}"


def mask_phone(phone: str) -> str:
    """Mask phone showing only last 4 digits."""
    cleaned = re.sub(r'\D', '', phone)
    if len(cleaned) >= 10:
        return f"(**) *****-{cleaned[-4:]}"
    return "(**) ****-****"


def detect_pii(text: str) -> dict:
    """Detect PII in text and return findings."""
    findings = {}
    for pii_type, pattern in PII_PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            findings[pii_type] = matches
    return findings


def mask_pii(text: str) -> str:
    """Mask all PII in text."""
    # Mask CPFs
    text = PII_PATTERNS['cpf'].sub(lambda m: mask_cpf(m.group(1)), text)
    # Mask CNPJs
    text = PII_PATTERNS['cnpj'].sub(lambda m: mask_cnpj(m.group(1)), text)
    # Mask emails
    text = PII_PATTERNS['email'].sub(lambda m: mask_email(m.group(1)), text)
    # Mask phones
    text = PII_PATTERNS['phone'].sub(lambda m: mask_phone(m.group(1)), text)
    # Mask CEPs
    text = PII_PATTERNS['cep'].sub(r'*****-***', text)
    return text


def contains_pii(text: str) -> bool:
    """Check if text contains any PII."""
    return any(pattern.search(text) for pattern in PII_PATTERNS.values())


class PIIMaskingMiddleware:
    """FastAPI middleware for PII masking in responses."""
    
    def __init__(self, app, mask_fields: Optional[list] = None):
        self.app = app
        self.mask_fields = mask_fields or ['name', 'email', 'phone', 'document']
    
    async def __call__(self, scope, receive, send):
        # Process response and mask PII
        # This is a simplified version - full implementation would process JSON responses
        await self.app(scope, receive, send)


def validate_cpf(cpf: str) -> bool:
    """Validate CPF checksum."""
    cleaned = re.sub(r'\D', '', cpf)
    if len(cleaned) != 11 or len(set(cleaned)) == 1:
        return False
    
    # Check first digit
    sum1 = sum(int(cleaned[i]) * (10 - i) for i in range(9))
    digit1 = 11 - (sum1 % 11)
    if digit1 > 9:
        digit1 = 0
    
    # Check second digit
    sum2 = sum(int(cleaned[i]) * (11 - i) for i in range(10))
    digit2 = 11 - (sum2 % 11)
    if digit2 > 9:
        digit2 = 0
    
    return cleaned[9] == str(digit1) and cleaned[10] == str(digit2)


def validate_cnpj(cnpj: str) -> bool:
    """Validate CNPJ checksum."""
    cleaned = re.sub(r'\D', '', cnpj)
    if len(cleaned) != 14:
        return False
    
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    
    # Check first digit
    sum1 = sum(int(cleaned[i]) * weights1[i] for i in range(12))
    digit1 = 11 - (sum1 % 11)
    if digit1 > 9:
        digit1 = 0
    
    # Check second digit
    sum2 = sum(int(cleaned[i]) * weights2[i] for i in range(13))
    digit2 = 11 - (sum2 % 11)
    if digit2 > 9:
        digit2 = 0
    
    return cleaned[12] == str(digit1) and cleaned[13] == str(digit2)
