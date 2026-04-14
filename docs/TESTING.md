# Testing Strategy — EGOS Inteligência
> **SSOT:** `docs/TESTING.md` | Updated: 2026-04-14

---

## Visão Geral

| Cobertura | Status |
|-----------|--------|
| Auth/PII endpoints | ✅ Coberto |
| Entity deduplication | ✅ Coberto |
| Upload multi-formato | ✅ Coberto (Playwright) |
| Graph queries (Neo4j) | 🔴 Pulados no CI (sem `NEO4J_TEST_URI`) |
| Pattern detection | 🔴 Zero testes unitários |
| Benford analyzer | 🔴 Zero testes |
| Sacred Math scoring | 🔴 Zero testes |
| Investigation templates | 🔴 Sem fixtures de teste |

**Score de cobertura real:** ~20% dos caminhos críticos

---

## Estrutura de Testes

```
api/tests/
├── conftest.py              — Fixtures globais, markers, env-driven skips
├── integration/
│   ├── test_health.py       — /health, /api/health, auth flow
│   ├── test_public.py       — Endpoints sem autenticação
│   └── test_search.py       — Full-text + busca semântica
├── unit/
│   └── test_pii_masking.py  — CPF/CNPJ masking em respostas
├── test_agent_context.py    — Context manager de agentes
├── test_chat_enhance_endpoint.py  — Chat com tool calling
└── test_suggestions_endpoint.py  — Sugestões de análise

frontend/tests/
├── unit/
│   └── cross-reference.test.ts    — Jaro-Winkler dedup (6 níveis)
└── e2e/
    ├── intelink-basic.spec.ts         — Smoke test (page load)
    ├── intelink-multiformat-upload.spec.ts  — Upload PDF/DOCX/imagem
    └── intelink-smoke.spec.ts         — Fluxos críticos

api/tests/fixtures/synthetic_investigations/
├── case_01_embezzlement.json    — Peculato: 5 pessoas, 3 shell companies
├── case_02_drug_network.json    — Tráfico: fornecedor→distribuidor→varejo
├── case_03_corruption.json      — Corrupção + fraude em licitações
├── case_04_money_laundering.json — Lavagem: cassino→offshore→imóveis
└── case_05_organized_crime.json  — Crime organizado: controle territorial
```

---

## Como Executar Testes

```bash
# Backend — todos (sem Neo4j/Redis)
cd api && pytest -v

# Backend — com Neo4j (requer .env)
NEO4J_TEST_URI=bolt://localhost:7687 pytest -v -m requires_neo4j

# Backend — com Redis
REDIS_TEST_URL=redis://localhost:6379 pytest -v -m requires_redis

# Backend — apenas unitários (rápido)
pytest -v -m "not requires_neo4j and not requires_redis and not slow"

# Frontend — unitários
cd frontend && npm test

# Frontend — e2e (requer server rodando)
cd frontend && npx playwright test
```

---

## Markers do pytest

```python
# conftest.py define:
@pytest.mark.requires_neo4j   # Pula sem NEO4J_TEST_URI
@pytest.mark.requires_redis   # Pula sem REDIS_TEST_URL
@pytest.mark.slow             # Pula em CI por padrão
```

---

## Regras de Dados de Teste

1. **Zero PII real** — Nunca usar CPF/CNPJ/nome real em fixtures
2. **Dados sintéticos** — Apenas `api/tests/fixtures/synthetic_investigations/`
3. **Isolamento** — Cada teste cria e limpa seus próprios dados
4. **Determinismo** — Seeds fixos para dados aleatórios (usar `random.seed(42)`)

---

## Gaps Prioritários a Cobrir

### P0 — Ativar CI com Neo4j

```yaml
# .github/workflows/ci.yml — adicionar:
services:
  neo4j:
    image: neo4j:5
    env:
      NEO4J_AUTH: neo4j/testpassword
    ports: ["7687:7687"]
env:
  NEO4J_TEST_URI: bolt://localhost:7687
  NEO4J_TEST_PASSWORD: testpassword
```

### P1 — Testes de Pattern Detection

```python
# api/tests/unit/test_pattern_detector.py (a criar)
def test_benford_anomaly_detects_fraud():
    data = [1000, 1100, 1200, 1050, 1150]  # leading 1s — suspeito
    result = benford_analyzer.analyze(data)
    assert result.anomaly_score > 0.7

def test_sacred_math_scoring():
    patterns = [{"type": "shell_company", "confidence": 0.8}]
    score = pattern_detector.sacred_math_score(patterns)
    assert 0 < score < 1

def test_ghost_employee_detection():
    payroll = generate_synthetic_payroll(ghost_count=5, total=100)
    result = ghost_detector.analyze(payroll)
    assert result.flagged_count >= 3
```

### P2 — Testes de Investigation Templates

```python
# api/tests/unit/test_investigation_templates.py (a criar)
def test_corruption_template_generates_valid_cypher():
    template = InvestigationTemplates.get("corruption")
    query = template.build_cypher(target_cpf="masked_cpf")
    assert "MATCH" in query
    assert "WHERE" in query

def test_criminal_investigation_template():
    template = InvestigationTemplates.get("criminal_investigation")
    assert "Suspect" in template.entity_types
    assert "Victim" in template.entity_types
```

---

## Cobertura Mínima Esperada por Release

| Área | Mínimo |
|------|--------|
| Auth (login, refresh, logout) | 100% |
| PII masking (todos os endpoints) | 100% |
| Cross-reference engine | 90% |
| Pattern detection | 70% |
| ETL pipelines | 80% por pipeline |
| Graph queries (críticos) | 60% |

---

*Para adicionar testes: siga o padrão de `api/tests/unit/test_pii_masking.py` para unitários, `api/tests/integration/test_health.py` para integração.*
