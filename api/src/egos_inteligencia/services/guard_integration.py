"""
Guard Brasil Integration — EGOS Inteligência
Mascaramento de PII para dados de investigação policial

Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class MaskingResult:
    """Resultado do mascaramento de PII."""
    original: str
    masked: str
    pii_found: list[dict[str, Any]]
    safe: bool
    lgpd_disclosure: str


class GuardBrasilIntelink:
    """
    Wrapper Guard Brasil para dados de investigação.
    
    Detecta e mascara:
    - CPF (XXX.XXX.XXX-XX → XXX.***.***-XX)
    - CNPJ (XX.XXX.XXX/XXXX-XX → XX.***.***/XXXX-XX)
    - RG (MG-12.345.678 → MG-**.***.**8)
    - Telefones (31 91234-5678 → 31 ****-5678)
    - Emails (email@dominio.com → em***@dominio.com)
    - Placas de veículos (ABC1D23 → ABC*D23)
    - REDS (1234567/2024 → ******/2024)
    - MASP (123456-7 → ******-7)
    """
    
    # Patterns regex para PII brasileiro
    PATTERNS = {
        "cpf": {
            "regex": r"\b(\d{3})[\.\-]?(\d{3})[\.\-]?(\d{3})[\.\-]?(\d{2})\b",
            "mask": r"\1.***.***-\4",
            "name": "CPF",
            "sensitivity": "high"
        },
        "cnpj": {
            "regex": r"\b(\d{2})[\.\-]?(\d{3})[\.\-]?(\d{3})[/\-]?(\d{4})[\.\-]?(\d{2})\b",
            "mask": r"\1.***.***/\4-\5",
            "name": "CNPJ",
            "sensitivity": "high"
        },
        "rg": {
            "regex": r"\b([A-Z]{2})[\s\-]?(\d{1,2})[\.\-]?(\d{3})[\.\-]?(\d{3})\b",
            "mask": r"\1-\2.***.***",
            "name": "RG",
            "sensitivity": "high"
        },
        "telefone": {
            "regex": r"\b(\d{2})\s*(\d{4,5})[\-]?(\d{4})\b",
            "mask": r"\1 \2****-\3",
            "name": "TELEFONE",
            "sensitivity": "medium"
        },
        "email": {
            "regex": r"\b([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]*)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b",
            "mask": r"\1***\3",
            "name": "EMAIL",
            "sensitivity": "medium"
        },
        "placa": {
            "regex": r"\b([A-Z]{3})(\d)([A-Z])(\d{2})\b",
            "mask": r"\1*\3**",
            "name": "PLACA_VEICULO",
            "sensitivity": "medium"
        },
        "placa_antiga": {
            "regex": r"\b([A-Z]{3})[\-]?(\d{4})\b",
            "mask": r"\1-****",
            "name": "PLACA_VEICULO_ANTIGA",
            "sensitivity": "medium"
        },
        "reds": {
            "regex": r"\b(\d{1,7})/(\d{4})\b",
            "mask": r"*****/\2",
            "name": "REDS",
            "sensitivity": "high"
        },
        "masp": {
            "regex": r"\b(\d{1,6})[\-]?(\d)\b",
            "mask": r"******-\2",
            "name": "MASP",
            "sensitivity": "high"
        },
        "cep": {
            "regex": r"\b(\d{5})[\-]?(\d{3})\b",
            "mask": r"\1-***",
            "name": "CEP",
            "sensitivity": "low"
        },
    }
    
    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or {}
        self.block_on_critical = self.config.get("block_on_critical", False)
        self.add_lgpd_footer = self.config.get("add_lgpd_footer", True)
    
    def inspect(self, text: str, context: str = "general") -> MaskingResult:
        """
        Inspeciona e mascara PII em texto.
        
        Args:
            text: Texto a ser inspecionado
            context: Contexto (police_report, investigation, public)
        
        Returns:
            MaskingResult com texto mascarado e metadados
        """
        if not text:
            return MaskingResult(
                original="",
                masked="",
                pii_found=[],
                safe=True,
                lgpd_disclosure=""
            )
        
        original = text
        masked = text
        pii_found: list[dict[str, Any]] = []
        
        # Aplicar cada pattern
        for pii_type, pattern in self.PATTERNS.items():
            matches = list(re.finditer(pattern["regex"], text))
            
            for match in matches:
                full_match = match.group(0)
                
                # Verificar se é falso positivo
                if self._is_false_positive(pii_type, full_match, text):
                    continue
                
                # Mascarar
                masked_match = re.sub(pattern["regex"], pattern["mask"], full_match)
                
                # Registrar
                pii_found.append({
                    "type": pii_type,
                    "type_name": pattern["name"],
                    "original": full_match,
                    "masked": masked_match,
                    "position": match.span(),
                    "sensitivity": pattern["sensitivity"]
                })
                
                # Substituir no texto (uma vez por match)
                masked = masked.replace(full_match, masked_match, 1)
        
        # Verificar se é seguro
        critical_pii = [p for p in pii_found if p["sensitivity"] == "high"]
        safe = not (critical_pii and self.block_on_critical)
        
        # LGPD disclosure
        lgpd_disclosure = ""
        if pii_found and self.add_lgpd_footer:
            types_found = set(p["type_name"] for p in pii_found)
            lgpd_disclosure = (
                f"\n\n[LGPD] Este documento contém dados pessoais "
                f"({', '.join(types_found)}) mascarados para proteção. "
                f"Acesso restrito conforme Art. 4º, III LGPD."
            )
        
        return MaskingResult(
            original=original,
            masked=masked,
            pii_found=pii_found,
            safe=safe,
            lgpd_disclosure=lgpd_disclosure
        )
    
    def _is_false_positive(self, pii_type: str, match: str, context: str) -> bool:
        """Verifica se é falso positivo."""
        # CPF: evitar casos como "123.456.789-00" em contextos técnicos
        if pii_type == "cpf":
            # Verificar se não é um número sequencial óbvio
            digits = re.sub(r"\D", "", match)
            if len(set(digits)) <= 2:  # 111.111.111-11 ou sequências
                return True
            # Verificar dígitos verificadores (simplificado)
            if not self._validate_cpf_digits(digits):
                return True
        
        # CNPJ: validação similar
        if pii_type == "cnpj":
            digits = re.sub(r"\D", "", match)
            if len(digits) != 14:
                return True
        
        # Telefone: não mascarar se for parte de cálculo/endereço
        if pii_type == "telefone":
            # Evitar "12 3456" em coordenadas
            if re.search(r"\d{2}\s+\d{4,5}\s*-\s*\d{4}", match):
                return False
        
        return False
    
    def _validate_cpf_digits(self, cpf: str) -> bool:
        """Validação simplificada de dígitos verificadores CPF."""
        if len(cpf) != 11:
            return False
        
        # Calcular primeiro dígito
        sum1 = sum(int(cpf[i]) * (10 - i) for i in range(9))
        digit1 = (sum1 * 10) % 11
        digit1 = 0 if digit1 == 10 else digit1
        
        # Calcular segundo dígito
        sum2 = sum(int(cpf[i]) * (11 - i) for i in range(10))
        digit2 = (sum2 * 10) % 11
        digit2 = 0 if digit2 == 10 else digit2
        
        return int(cpf[9]) == digit1 and int(cpf[10]) == digit2
    
    def mask_investigation_report(
        self,
        report_text: str,
        case_number: str,
        investigator: str,
    ) -> MaskingResult:
        """
        Mascara relatório de investigação policial.
        
        Args:
            report_text: Texto do relatório
            case_number: Número do caso (não mascarado)
            investigator: Nome do investigador
        
        Returns:
            MaskingResult processado
        """
        # Adicionar header
        header = f"""
RELATÓRIO DE INVESTIGAÇÃO — Nº {case_number}
Investigador: {investigator}
Data: {self._get_current_date()}
Classificação: USO RESTRITO (LGPD)

"""
        
        full_text = header + report_text
        
        # Inspecionar
        result = self.inspect(full_text, context="investigation")
        
        # Adicionar footer com LGPD
        if result.pii_found:
            result.masked += result.lgpd_disclosure
            result.masked += f"\n\nTotal de dados pessoais encontrados e protegidos: {len(result.pii_found)}"
        
        return result
    
    def _get_current_date(self) -> str:
        """Retorna data atual formatada."""
        from datetime import datetime
        return datetime.now().strftime("%d/%m/%Y")


# Instância global
guard = GuardBrasilIntelink()


def mask_pii(text: str) -> str:
    """Função utilitária rápida para mascarar PII."""
    result = guard.inspect(text)
    return result.masked


def mask_and_log(text: str, operation: str = "general") -> dict[str, Any]:
    """
    Mascara PII e retorna log completo.
    
    Útil para integração com sistema de telemetria.
    """
    result = guard.inspect(text)
    
    return {
        "operation": operation,
        "original_length": len(result.original),
        "masked_length": len(result.masked),
        "pii_count": len(result.pii_found),
        "pii_types": list(set(p["type_name"] for p in result.pii_found)),
        "safe": result.safe,
        "masked_text": result.masked,
        "details": [
            {
                "type": p["type_name"],
                "sensitivity": p["sensitivity"],
                "position": p["position"]
            }
            for p in result.pii_found
        ]
    }


# =============================================================================
# Exemplos de uso
# =============================================================================

if __name__ == "__main__":
    # Teste
    texto_teste = """
    Em 15/03/2024, o investigado JOÃO DA SILVA, CPF 123.456.789-00, residente
    na Rua das Flores, 123, CEP 30140-000, telefone 31 98765-4321, foi abordado
    conduzindo o veículo placa ABC1D23. O mesmo apresentou RG MG-12.345.678.
    
    O fato ocorreu próximo à Delegacia (REDS 1234567/2024). O investigador
    MASP 123456-7 conduziu as diligências.
    
    Contato: joao.silva@email.com
    """
    
    guard_local = GuardBrasilIntelink()
    resultado = guard_local.inspect(texto_teste)
    
    print("=" * 60)
    print("ORIGINAL:")
    print(resultado.original)
    print("\n" + "=" * 60)
    print("MASCARADO:")
    print(resultado.masked)
    print("\n" + "=" * 60)
    print(f"PII encontrado: {len(resultado.pii_found)} ocorrências")
    for pii in resultado.pii_found:
        print(f"  - {pii['type_name']}: {pii['original']} → {pii['masked']}")
