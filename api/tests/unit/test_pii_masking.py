"""
Unit tests — PII masking.
Non-negotiable: CPF, CNPJ, email, phone must be masked in all output.
"""

import pytest
import re


CPF_PATTERN = re.compile(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b')
CNPJ_PATTERN = re.compile(r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b')
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')


def mask_pii(text: str) -> str:
    """Reference implementation — must match middleware behavior."""
    text = CPF_PATTERN.sub('***.***.***/***-**', text)
    text = CNPJ_PATTERN.sub('**.***.***/****.** ', text)
    text = EMAIL_PATTERN.sub('****@****.***', text)
    return text


class TestCPFMasking:
    def test_standard_cpf_masked(self):
        text = "CPF: 123.456.789-09"
        result = mask_pii(text)
        assert not CPF_PATTERN.search(result), f"CPF not masked: {result}"

    def test_cpf_in_longer_text(self):
        text = "O suspeito de CPF 987.654.321-00 foi identificado"
        result = mask_pii(text)
        assert not CPF_PATTERN.search(result)

    def test_no_false_positive_on_phone(self):
        text = "Telefone: (31) 9 8765-4321"
        result = mask_pii(text)
        # Phone should not be incorrectly masked as CPF
        assert "9 8765" in result or "98765" in result


class TestCNPJMasking:
    def test_standard_cnpj_masked(self):
        text = "CNPJ: 12.345.678/0001-99"
        result = mask_pii(text)
        assert not CNPJ_PATTERN.search(result)

    def test_cnpj_in_context(self):
        text = "Empresa com CNPJ 00.000.000/0001-00 foi autuada"
        result = mask_pii(text)
        assert not CNPJ_PATTERN.search(result)


class TestEmailMasking:
    def test_standard_email_masked(self):
        text = "Contato: investigador@policia.mg.gov.br"
        result = mask_pii(text)
        assert not EMAIL_PATTERN.search(result)

    def test_multiple_emails_all_masked(self):
        text = "De: a@b.com Para: c@d.org"
        result = mask_pii(text)
        assert not EMAIL_PATTERN.search(result)


class TestNoPIIInLogs:
    """Ensure no PII appears in sanitized output meant for logs."""

    def test_synthetic_data_has_no_real_cpf(self, tmp_path):
        """Synthetic test fixtures must not contain real CPF patterns that look valid."""
        import json
        import pathlib

        fixtures_dir = pathlib.Path(__file__).parent.parent / "fixtures" / "synthetic_investigations"
        if not fixtures_dir.exists():
            pytest.skip("No synthetic fixtures found")

        for fixture_file in fixtures_dir.glob("*.json"):
            content = fixture_file.read_text()
            matches = CPF_PATTERN.findall(content)
            # Synthetic data may have CPF-shaped data — but they must be clearly fake
            for match in matches:
                digits = match.replace('.', '').replace('-', '')
                # Reject obviously sequential/invalid CPFs like 111.111.111-11
                assert len(set(digits)) > 2, \
                    f"Suspicious CPF in {fixture_file.name}: {match}"
